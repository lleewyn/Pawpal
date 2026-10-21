// Reviewed V1 logical migration into the one empty Cloud destination. Default: roll back a full trial.
const fs=require('node:fs'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const {infra,sql}=require('./cloud_connection.cjs');
const {verify}=require('./verify.cjs');
const stateFile=infra+'/cloud-migration-state.private.txt';
const state=JSON.parse(fs.readFileSync(stateFile,'utf8'));
if(state.project!=='cpzuvaplseielhgcnqrn')throw Error('Unexpected migration state');
const apply=process.argv.includes('--apply');
function local(query){return execFileSync('docker',['exec','supabase-db','psql','-X','-q','-U','supabase_admin','-d','postgres','-Atc','SET search_path=public,extensions,pg_catalog; '+query],{encoding:'utf8',maxBuffer:64e6}).trim();}
const source=verify((_db,q)=>local(q),'postgres');
const tables=JSON.parse(local("SELECT json_agg(tablename ORDER BY tablename) FROM pg_tables WHERE schemaname='public'"));
const fingerprints=JSON.parse(local('SELECT json_agg(x) FROM ('+tables.map(t=>`SELECT '${t}' AS table,md5(coalesce(string_agg(to_jsonb(r)::text,chr(10) ORDER BY to_jsonb(r)::text),'')) AS hash FROM public."${t}" r`).join(' UNION ALL ')+') x'));
const authHash=local("SELECT md5(coalesce(string_agg(to_jsonb(r)::text,chr(10) ORDER BY id),'')) FROM auth.users r");
const sourcePolicyHash=local("SELECT md5(string_agg(tablename||':'||policyname||':'||cmd||':'||coalesce(qual,'')||':'||coalesce(with_check,''),chr(10) ORDER BY tablename,policyname)) FROM pg_policies WHERE schemaname='public'");
const sourceAcl=local("SELECT coalesce(json_agg(x),'[]') FROM (SELECT table_schema,table_name,grantee,privilege_type FROM information_schema.role_table_grants WHERE table_schema='public' AND grantee IN ('anon','authenticated','service_role') ORDER BY table_name,grantee,privilege_type) x");
const guard=`DO $$ BEGIN
 IF current_database()<>'postgres' OR EXISTS(SELECT 1 FROM pg_tables WHERE schemaname='public')
 OR EXISTS(SELECT 1 FROM auth.users) OR EXISTS(SELECT 1 FROM pg_namespace WHERE nspname='pawpal_private')
 THEN RAISE EXCEPTION 'Destination is not empty; refusing to overwrite'; END IF;
END $$;`;
const defaults=['TABLES','SEQUENCES','FUNCTIONS'].map(kind=>`ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON ${kind} FROM anon,authenticated,service_role;`).join('\n');
let pre=fs.readFileSync(state.folder+'/app-pre.sql','utf8').replace(/^CREATE SCHEMA public;$/m,'-- public already exists on the empty Supabase Cloud project.');
const check=`DO $$ BEGIN
 IF (SELECT count(*) FROM pg_tables WHERE schemaname='public')<>105 THEN RAISE EXCEPTION 'Table count differs'; END IF;
 IF (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name IN (SELECT tablename FROM pg_tables WHERE schemaname='public'))<>906 THEN RAISE EXCEPTION 'Column count differs'; END IF;
 IF (SELECT count(*) FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='public' AND c.contype='f' AND c.convalidated)<>160 THEN RAISE EXCEPTION 'Foreign keys differ'; END IF;
 IF EXISTS(SELECT 1 FROM pg_tables WHERE schemaname='public' AND NOT rowsecurity) THEN RAISE EXCEPTION 'Missing RLS'; END IF;
 IF EXISTS(SELECT 1 FROM information_schema.role_table_grants WHERE table_schema='public' AND grantee='anon') THEN RAISE EXCEPTION 'Unexpected anonymous access'; END IF;
 IF (SELECT md5(coalesce(string_agg(to_jsonb(r)::text,chr(10) ORDER BY id),'')) FROM auth.users r)<>'${authHash}' THEN RAISE EXCEPTION 'Auth rows differ'; END IF;
 IF (SELECT md5(string_agg(tablename||':'||policyname||':'||cmd||':'||coalesce(qual,'')||':'||coalesce(with_check,''),chr(10) ORDER BY tablename,policyname)) FROM pg_policies WHERE schemaname='public')<>'${sourcePolicyHash}' THEN RAISE EXCEPTION 'RLS policies differ'; END IF;
 ${fingerprints.map(x=>`IF (SELECT md5(coalesce(string_agg(to_jsonb(r)::text,chr(10) ORDER BY to_jsonb(r)::text),'')) FROM public."${x.table}" r)<>'${x.hash}' THEN RAISE EXCEPTION 'Data differs in ${x.table}'; END IF;`).join('\n')}
END $$;`;
const publication=JSON.parse(local("SELECT coalesce(json_agg(tablename ORDER BY tablename),'[]') FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public'"));
const realtime=publication.map(t=>`ALTER PUBLICATION supabase_realtime ADD TABLE public."${t}";`).join('\n');
// Send each section in one server-side batch, avoiding thousands of WAN round trips.
const sections=[pre,...['auth-data-inserts.sql','app-data-inserts.sql','app-post.sql'].map(f=>fs.readFileSync(state.folder+'/'+f,'utf8'))];
const batched='DO $pawpal_restore$ BEGIN\n'+sections.map((s,i)=>`EXECUTE $pawpal_part_${i}$\n${s.replace(/^\\(?:un)?restrict .*$/gm,'')}\n$pawpal_part_${i}$;`).join('\n')+'\nEND $pawpal_restore$;';
let migration='BEGIN;\nSET LOCAL lock_timeout=\'15s\';\nSET LOCAL statement_timeout=\'180s\';\nSELECT pg_advisory_xact_lock(198512,105906);\n'+guard+'\n'+defaults+'\nCREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;\nCREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;\n'+batched+'\nSET LOCAL search_path=public,extensions,pg_catalog;\n'+realtime+'\n'+check+'\n';
// Check the same table privileges as the source, not merely table counts.
migration+=`DO $acl$ BEGIN IF (SELECT coalesce(json_agg(x),'[]')::text FROM (SELECT table_schema,table_name,grantee,privilege_type FROM information_schema.role_table_grants WHERE table_schema='public' AND grantee IN ('anon','authenticated','service_role') ORDER BY table_name,grantee,privilege_type) x)<>${"'"+sourceAcl.replaceAll("'","''")+"'"} THEN RAISE EXCEPTION 'Table privilege drift'; END IF; END $acl$;\n`;
migration+=(apply?'COMMIT;':'ROLLBACK;')+'\n';
const file=state.folder+(apply?'/restore-apply.private.sql':'/restore-trial.private.sql');fs.writeFileSync(file,migration);
try{
 sql(migration,{folder:state.folder,timeout:300000});
 if(apply){const dest=verify((_db,q)=>sql('SET search_path=public,extensions,pg_catalog; '+q,{folder:state.folder}),'postgres');state.phase='database-applied';state.appliedAt=new Date().toISOString();state.verified=dest;}
 else{const empty=sql("SELECT (SELECT count(*) FROM pg_tables WHERE schemaname='public')||':'||(SELECT count(*) FROM auth.users)");if(empty!=='0:0')throw Error('Trial did not leave destination empty');state.phase='trial-passed';}
 state.source=source;state.sqlSha256=crypto.createHash('sha256').update(migration).digest('hex');fs.writeFileSync(stateFile,JSON.stringify(state,null,2));
 console.log(apply?'PASS Cloud database committed and verified: '+JSON.stringify(state.verified):'PASS full Cloud restore trial rolled back: all 105 table data hashes, Auth rows, 160 foreign keys, RLS policies and privileges match. Destination remains empty.');
}catch(e){console.error(e.message);process.exitCode=1;}
