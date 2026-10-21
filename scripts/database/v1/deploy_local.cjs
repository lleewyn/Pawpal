// Local-only. Back up and restore-test the old database before replacing public.
// --apply is deliberately explicit; without it only the disposable DB is changed.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {tables,hash}=require('./model.cjs');
const {verify}=require('./verify.cjs');
const infra=path.resolve('D:/Aboutme/Pawpal-infra/supabase-local');
const apply=process.argv.includes('--apply');
const suffix=crypto.randomBytes(8).toString('hex');
const stage='pawpal_v1check_'+suffix;
const backupDir=path.join(infra,'backups','before-v1-'+new Date().toISOString().replace(/[:.]/g,'-'));
fs.mkdirSync(backupDir,{recursive:true});
function docker(args){try{return execFileSync('docker',args,{encoding:'utf8',maxBuffer:32*1024*1024,stdio:['ignore','pipe','pipe']});}
 catch(e){fs.writeFileSync(path.join(backupDir,'deployment-error.private.log'),e.stderr?.toString()||e.message);throw Error('Docker/SQL step failed; details in private deployment log: '+backupDir);}}
const sql=(db,query)=>docker(['exec','supabase-db','psql','-X','-U','supabase_admin','-d',db,'-v','ON_ERROR_STOP=1','-Atc',query]).trim();
const lit=s=>s==null?'NULL':"'"+String(s).replaceAll("'","''")+"'";
const labels=JSON.parse(docker(['inspect','supabase-db','--format','{{json .Config.Labels}}']));
if(labels['com.docker.compose.project']!=='supabase'||labels['com.docker.compose.service']!=='db')throw Error('Unexpected database container');
const bindings=JSON.parse(docker(['inspect','supabase-pooler','--format','{{json .NetworkSettings.Ports}}']));
if(Object.values(bindings).flat().filter(Boolean).some(b=>!['127.0.0.1','::1'].includes(b.HostIp)))throw Error('Refuse non-loopback database stack');
const actual=sql('postgres',"SELECT string_agg(tablename,',' ORDER BY tablename) FROM pg_tables WHERE schemaname='public'").split(',');
const baseline=['appointment','audit_log','care_log','chat_conversation','customer','customer_activation_sms','customer_address','customer_membership','customer_profile','inventory','membership_tier','notification','paw_point_transaction','pet_profile','pet_weight_history','product','product_variant','sales_order','service','staff','support_ticket'].sort();
if(JSON.stringify(actual)!==JSON.stringify(baseline))throw Error('Public schema is not the reviewed 21-table baseline; refusing replacement');
const extensionInPublic=sql('postgres',"SELECT count(*) FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace WHERE n.nspname='public'");
if(extensionInPublic!=='0')throw Error('Unexpected extension in public; review before replacement');
const priorStaff=JSON.parse(sql('postgres',"SELECT coalesce(json_agg(s),'[]') FROM public.staff s WHERE auth_user_id IS NOT NULL"));
const authFingerprint=sql('postgres',"SELECT md5(coalesce(string_agg(id::text||coalesce(encrypted_password,''),',' ORDER BY id),'')) FROM auth.users");
const remoteDump='/tmp/'+stage+'.dump';
const remoteSql='/tmp/'+stage+'.sql';
let stageCreated=false, applied=false;
(async()=>{
 try {
  docker(['exec','supabase-db','pg_dump','-U','supabase_admin','-d','postgres','-Fc','-f',remoteDump]);
  const dumpPath=path.join(backupDir,'baseline-full.dump');
  docker(['cp','supabase-db:'+remoteDump,dumpPath]);
  const checksum=crypto.createHash('sha256').update(fs.readFileSync(dumpPath)).digest('hex');
  fs.writeFileSync(path.join(backupDir,'SHA256.txt'),checksum+'  baseline-full.dump\n');
  fs.copyFileSync(path.join(__dirname,'../self-host/schema-audit.generated.md'),path.join(backupDir,'baseline-schema-audit.md'));
  console.log('Backup saved outside webroot: '+backupDir);
  docker(['exec','supabase-db','createdb','-U','supabase_admin','-T','template0',stage]);stageCreated=true;
  docker(['exec','supabase-db','pg_restore','-U','supabase_admin','--exit-on-error','-d',stage,remoteDump]);
  const restoredAuth=sql(stage,"SELECT md5(coalesce(string_agg(id::text||coalesce(encrypted_password,''),',' ORDER BY id),'')) FROM auth.users");
  if(restoredAuth!==authFingerprint)throw Error('Restored Auth fingerprint mismatch');
  const restored=sql(stage,"SELECT string_agg(tablename,',' ORDER BY tablename) FROM pg_tables WHERE schemaname='public'");
  if(restored!==actual.join(','))throw Error('Restored baseline table inventory mismatch');
  console.log('PASS full baseline dump restores; Auth fingerprint and 21-table inventory preserved');
  let seed='';
  for(const s of priorStaff){
   seed+=`INSERT INTO public.staff(id,auth_user_id,full_name,email,phone_number,job_title,hire_date,employment_status,must_change_password) VALUES(${lit(s.id)},${lit(s.auth_user_id)},${lit(s.full_name)},${lit(s.email)},${lit(s.phone_number)},${lit(s.role||s.system_role||'STAFF')},${lit(s.hire_date||new Date().toISOString().slice(0,10))},${lit(s.account_status==='ACTIVE'?'active':'inactive')},${s.must_change_password?'true':'false'});\n`;
   // Only existing ADMIN staff retain administrative access. Other staff receive no role implicitly.
   if(s.system_role==='ADMIN')seed+=`INSERT INTO public.staff_role(staff_id,role_code) VALUES(${lit(s.id)},'ADMIN');\n`;
  }
  const migration='BEGIN;\nSET LOCAL lock_timeout=\'15s\';\nSELECT pg_advisory_xact_lock(198512,105906);\nDROP SCHEMA public CASCADE;\nCREATE SCHEMA public AUTHORIZATION postgres;\n'
   +['001_schema.sql','002_rules.sql','003_integrity.sql'].map(f=>fs.readFileSync(path.join(__dirname,f),'utf8')).join('\n')
   +'\n'+fs.readFileSync(path.join(__dirname,'004_staff_login_context.sql'),'utf8').replace(/^BEGIN;\s*/,'').replace(/COMMIT;\s*$/,'')
   +'\n'+fs.readFileSync(path.join(__dirname,'005_staff_unknown_hire_date.sql'),'utf8')
   +'\n'+seed+'\nCOMMIT;\n';
  const privateSql=path.join(backupDir,'install-v1.private.sql');
  fs.writeFileSync(privateSql,migration,'utf8');
  docker(['cp',privateSql,'supabase-db:'+remoteSql]);
  docker(['exec','supabase-db','psql','-X','-U','supabase_admin','-d',stage,'-v','ON_ERROR_STOP=1','-f',remoteSql]);
  const stageResult=verify(sql,stage);
  console.log('PASS disposable V1 build: '+JSON.stringify(stageResult));
  const testRemote='/tmp/'+stage+'-test.sql';
  docker(['cp',path.join(__dirname,'verify_integrity.sql'),'supabase-db:'+testRemote]);
  docker(['exec','supabase-db','psql','-X','-U','supabase_admin','-d',stage,'-v','ON_ERROR_STOP=1','-f',testRemote]);
  console.log('PASS transactional integrity tests (fixtures rolled back)');
  if(priorStaff.some(s=>s.system_role==='ADMIN'&&s.account_status==='ACTIVE'&&!s.must_change_password)){
   const policyRemote='/tmp/'+stage+'-policies.sql';
   docker(['cp',path.join(__dirname,'verify_policies.sql'),'supabase-db:'+policyRemote]);
   docker(['exec','supabase-db','psql','-X','-U','supabase_admin','-d',stage,'-v','ON_ERROR_STOP=1','-f',policyRemote]);
   console.log('PASS ADMIN mapping, default-deny, anonymous isolation, server-only ledgers, password gate and inactive-staff RLS');
  }else throw Error('No existing active ADMIN available for permission verification');
  const {verifyConcurrency}=require('./verify_concurrency.cjs');
  await verifyConcurrency(stage,sql);
  if(apply){
   // Exact source inventory is checked again immediately before this authorized replacement.
   if(sql('postgres',"SELECT string_agg(tablename,',' ORDER BY tablename) FROM pg_tables WHERE schemaname='public'")!==actual.join(','))throw Error('Live schema changed during checks');
   docker(['exec','supabase-db','psql','-X','-U','supabase_admin','-d','postgres','-v','ON_ERROR_STOP=1','-f',remoteSql]);
   applied=true;
   const result=verify(sql,'postgres');
   const fingerprintAfter=sql('postgres',"SELECT md5(coalesce(string_agg(id::text||coalesce(encrypted_password,''),',' ORDER BY id),'')) FROM auth.users");
   if(fingerprintAfter!==authFingerprint)throw Error('Live Auth fingerprint unexpectedly changed');
   const report={appliedAt:new Date().toISOString(),modelHash:hash,...result,retainedStaff:priorStaff.length,backup:dumpPath,sha256:checksum,authPreserved:true,integrityTests:true,concurrencyTests:true};
   fs.writeFileSync(path.join(backupDir,'deployment-result.private.txt'),JSON.stringify(report,null,2));
   console.log('APPLIED local V1: '+JSON.stringify(result)+'; retained existing Auth and '+priorStaff.length+' staff profile(s)');
  } else console.log('Dry run complete; live database unchanged. Use --apply for the authorized local switch.');
 } finally {
  if(stageCreated&&/^pawpal_v1check_[a-f0-9]{16}$/.test(stage))docker(['exec','supabase-db','dropdb','-U','supabase_admin','--force',stage]);
 }
})().catch(e=>{console.error((applied?'V1 installed; post-check requires review: ':'No live migration completed: ')+e.message);process.exitCode=1;});
