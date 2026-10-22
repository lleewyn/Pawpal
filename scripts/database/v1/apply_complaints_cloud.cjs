// Reviewed complaint DDL only; verification fixtures never leave the restored DB.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {infra,cloud,sql}=require('./cloud_connection.cjs'),{verify}=require('./verify.cjs');
if(process.argv[2]!=='apply')throw Error('Use apply after isolated API/browser verification');
const files=['039_admin_complaint_create.sql','040_admin_complaint_assignment.sql','041_admin_complaint_workflow.sql','042_admin_complaint_security.sql'];
if(files.some(f=>!fs.existsSync(path.join(__dirname,f))))throw Error('Missing reviewed complaint migration');
const shape=verify((db,q)=>sql(q),'postgres');
const folder=path.join(infra,'backups','complaints-cloud-'+new Date().toISOString().replace(/[:.]/g,'-'));fs.mkdirSync(folder,{recursive:true});
const dump=cloud('pg_dump',['--schema=public','--schema=pawpal_private','--schema=auth','--no-owner'],'',{folder,timeout:180000});
fs.writeFileSync(path.join(folder,'before-complaints.private.sql'),dump);fs.writeFileSync(path.join(folder,'before-SHA256.txt'),crypto.createHash('sha256').update(dump).digest('hex')+'\n');
// Snapshot every public row and Auth credentials/ban state inside one transaction.
// All migrations and comparison roll back together on any error.
const snapshot=`CREATE FUNCTION pg_temp.complaints_release_snapshot() RETURNS jsonb LANGUAGE plpgsql AS $$
DECLARE t record; digest text; result jsonb:='{}'; BEGIN
 FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename LOOP
  EXECUTE format('SELECT md5(coalesce(string_agg(to_jsonb(r)::text,chr(10) ORDER BY to_jsonb(r)::text),'''')) FROM public.%I r',t.tablename) INTO digest;
  result:=result||jsonb_build_object(t.tablename,digest);
 END LOOP;
 SELECT md5(coalesce(string_agg(jsonb_build_array(id,email,encrypted_password,banned_until)::text,chr(10) ORDER BY id),'')) INTO digest FROM auth.users;
 RETURN result||jsonb_build_object('auth_identity_password_ban',digest);END $$;
CREATE TEMP TABLE complaints_release_before ON COMMIT DROP AS SELECT pg_temp.complaints_release_snapshot() AS snapshot;`;
const source=files.map(f=>fs.readFileSync(path.join(__dirname,f),'utf8').replace(/^BEGIN;\s*$/gm,'').replace(/^COMMIT;\s*$/gm,'')).join('\n');
const transaction=`BEGIN; SET LOCAL lock_timeout='15s';\n${snapshot}\n${source}\nDO $$ BEGIN
 IF (SELECT snapshot FROM complaints_release_before) IS DISTINCT FROM pg_temp.complaints_release_snapshot() THEN RAISE EXCEPTION 'Complaint release changed source data; rollback'; END IF;
 IF (SELECT count(*) FROM pg_tables WHERE schemaname='public')<>105 THEN RAISE EXCEPTION 'Unexpected schema shape'; END IF;
 END $$; COMMIT;`;
sql(transaction,{folder,timeout:180000});
const after=verify((db,q)=>sql(q),'postgres');if(JSON.stringify(shape)!==JSON.stringify(after))throw Error('Physical schema changed');
const staffCount=Number(sql('SELECT count(*) FROM public.staff'));
fs.writeFileSync(path.join(folder,'verification.txt'),JSON.stringify({verifiedAt:new Date().toISOString(),shape:after,staffCount,allPublicRowsAndAuthCredentialsAndBansUnchanged:true,atomic:true,migrations:files},null,2));
console.log('PASS Cloud complaint migrations applied atomically; all public rows/Auth credentials/ban states unchanged; '+staffCount+' source staff. Backup: '+folder);
