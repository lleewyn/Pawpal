// Database-only read audit. No fixtures, imports, trigger changes or business writes.
const fs=require('node:fs'),{execFileSync}=require('node:child_process');
const {infra,sql}=require('./cloud_connection.cjs'),{verify}=require('./verify.cjs');
const local=q=>execFileSync('docker',['exec','supabase-db','psql','-X','-q','-U','supabase_admin','-d','postgres','-Atc','SET search_path=public,extensions,pg_catalog; '+q],{encoding:'utf8',maxBuffer:64e6}).trim();
const check=verify((_db,q)=>sql('SET search_path=public,extensions,pg_catalog; '+q),'postgres');
const tables=JSON.parse(sql("SELECT json_agg(tablename ORDER BY tablename) FROM pg_tables WHERE schemaname='public'"));
const countsQuery='SELECT json_agg(x) FROM ('+tables.map(t=>`SELECT '${t}' AS table,count(*)::integer AS count,md5(coalesce(string_agg(to_jsonb(r)::text,chr(10) ORDER BY to_jsonb(r)::text),'')) AS hash FROM public."${t}" r`).join(' UNION ALL ')+') x';
const counts=JSON.parse(sql('BEGIN READ ONLY; '+countsQuery+'; COMMIT;')),source=JSON.parse(local(countsQuery));
const mismatches=counts.filter(c=>!source.some(s=>s.table===c.table&&s.hash===c.hash));
const metadata=JSON.parse(sql(`BEGIN READ ONLY;
 SELECT json_build_object(
 'invalid_constraints',(SELECT coalesce(json_agg(conname),'[]') FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='public' AND NOT convalidated),
 'invalid_indexes',(SELECT coalesce(json_agg(indexrelid::regclass::text),'[]') FROM pg_index i JOIN pg_class c ON c.oid=i.indrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT indisvalid),
 'realtime',(SELECT coalesce(json_agg(tablename ORDER BY tablename),'[]') FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public'),
 'auth_users',(SELECT count(*) FROM auth.users),'banned_auth_users',(SELECT count(*) FROM auth.users WHERE banned_until>now()),
 'staff_missing_auth',(SELECT count(*) FROM public.staff s LEFT JOIN auth.users u ON u.id=s.auth_user_id WHERE u.id IS NULL),
 'customers_with_auth',(SELECT count(*) FROM public.customer WHERE auth_user_id IS NOT NULL),
 'phones_without_one_primary',(SELECT count(*) FROM (SELECT customer_id FROM public.customer_phone GROUP BY customer_id HAVING count(*) FILTER(WHERE is_primary)<>1) x),
 'addresses_without_one_default',(SELECT count(*) FROM (SELECT customer_id FROM public.customer_address GROUP BY customer_id HAVING count(*) FILTER(WHERE is_default)<>1) x),
 'points',(SELECT coalesce(sum(total_paw_points),0) FROM public.customer_point_balance),
 'negative_points',(SELECT count(*) FROM public.customer_point_balance WHERE total_paw_points<0),
 'missing_customer_profile',(SELECT count(*) FROM public.customer c LEFT JOIN public.customer_profile p ON p.customer_id=c.id WHERE p.customer_id IS NULL),
 'anon_executable_functions',(SELECT coalesce(json_agg(p.proname ORDER BY p.proname),'[]') FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','pawpal_private') AND has_function_privilege('anon',p.oid,'EXECUTE')),
 'security_definer_functions',(SELECT coalesce(json_agg(json_build_object('name',n.nspname||'.'||p.proname,'settings',p.proconfig)),'[]') FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','pawpal_private') AND p.prosecdef)); COMMIT;`));
const apiConfig=require('dotenv').parse(fs.readFileSync(infra+'/CLOUD-MIGRATION.private.env'));
(async()=>{
 const {createClient}=require('@supabase/supabase-js');const opts={auth:{persistSession:false,autoRefreshToken:false}};
 const anon=createClient(apiConfig.DESTINATION_SUPABASE_URL,apiConfig.DESTINATION_SUPABASE_ANON_KEY,opts);
 const client=createClient(apiConfig.DESTINATION_SUPABASE_URL,apiConfig.DESTINATION_SUPABASE_ANON_KEY,opts);
 const credentials=fs.readFileSync(infra+'/PAWPAL-ADMIN.private.txt','utf8');
 const login=await client.auth.signInWithPassword({email:credentials.match(/^Email: (.+)$/m)[1].trim(),password:credentials.match(/^Password: (.+)$/m)[1].trim()});if(login.error)throw Error('Admin audit login failed');
 const api=[];
 try{
  // Keep concurrency low to avoid stressing the free project.
  for(let offset=0;offset<tables.length;offset+=5)await Promise.all(tables.slice(offset,offset+5).map(async table=>{
   const [a,b]=await Promise.all([anon.from(table).select('*').limit(0),client.from(table).select('*',{head:true,count:'exact'})]);
   api.push({table,anonymousDenied:Boolean(a.error),adminError:b.error?{code:b.error.code,message:b.error.message}:null,adminCount:b.count,expectedCount:counts.find(t=>t.table===table).count});
  }));
 }finally{await client.auth.signOut({scope:'local'});}
 const report={checkedAt:new Date().toISOString(),schema:check,counts,localDataDifferences:mismatches.map(x=>x.table),metadata,api};
 fs.writeFileSync(infra+'/all-database-audit.private.txt',JSON.stringify(report,null,2));
 console.log('Schema:',check,'Local/Cloud table differences:',report.localDataDifferences);
 console.log('All-table API:',{tables:api.length,anonymousUnexpectedAccess:api.filter(x=>!x.anonymousDenied).map(x=>x.table),adminErrors:api.filter(x=>x.adminError),countDifferences:api.filter(x=>x.adminCount!==x.expectedCount).map(x=>x.table)});
 console.log('Integrity:',{invalidConstraints:metadata.invalid_constraints,invalidIndexes:metadata.invalid_indexes,missingStaffAuth:metadata.staff_missing_auth,primaryPhoneErrors:metadata.phones_without_one_primary,defaultAddressErrors:metadata.addresses_without_one_default,points:metadata.points,negativePoints:metadata.negative_points,missingCustomerProfile:metadata.missing_customer_profile,authUsers:metadata.auth_users,bannedAuthUsers:metadata.banned_auth_users,customerAuthLinked:metadata.customers_with_auth,realtimeTables:metadata.realtime.length});
})().catch(e=>{console.error(e.message);process.exitCode=1;});
