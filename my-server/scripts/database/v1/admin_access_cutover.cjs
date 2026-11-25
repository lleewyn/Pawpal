// Narrow production cutover transport. No Cloud Logs, Auth unlocks or role reassignment.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const {settings,infra}=require('./cloud_connection.cjs');
const action=process.argv[2]||'preflight';
if(!['preflight','backup','rehearse','apply','verify'].includes(action))throw Error('Supported actions: preflight, backup, rehearse, apply, verify');
const existingPointer=['apply','rehearse','verify'].includes(action)?JSON.parse(fs.readFileSync('docs/security/phase6/cutover.private.txt','utf8')):null;
const {config,uri}=settings(),stamp=new Date().toISOString().replace(/[:.]/g,'-');
const privateDir=path.join(infra,'backups','admin-access-cutover-'+stamp);fs.mkdirSync(privateDir,{recursive:true});
const envFile=path.join(privateDir,'connection.private.env');
fs.writeFileSync(envFile,'PGPASSWORD='+config.DESTINATION_DATABASE_PASSWORD+'\nPGSSLMODE=require\nPGCONNECT_TIMEOUT=15\n');
const image='supabase/postgres:17.6.1.136';
function run(command,args,input=''){
 const name='pawpal-cutover-'+crypto.randomBytes(6).toString('hex');
 const proc=cp.spawnSync('docker',['run','--rm','--name',name,'--label','pawpal.cutover.owner=admin-fixed-roles','-i','--env-file',envFile,'--entrypoint',command,image,'-h',uri.hostname,'-p',uri.port,'-U',decodeURIComponent(uri.username),'-d','postgres',...args],{input,encoding:'utf8',windowsHide:true,timeout:180000,maxBuffer:64*1024*1024});
 if(proc.error?.code==='ETIMEDOUT')cp.spawnSync('docker',['rm','-f',name],{windowsHide:true,stdio:'ignore'});
 if(proc.status!==0){fs.writeFileSync(path.join(privateDir,'connection-error.private.log'),String(proc.stderr||proc.error?.message||'command failed').replaceAll(config.DESTINATION_DATABASE_PASSWORD,'[REDACTED]'));throw Error('Cloud command failed; private diagnostics saved outside the repository');}
 return proc.stdout.trim();
}
function sql(input){return run('psql',['-X','-qAt','-v','ON_ERROR_STOP=1','-f','-'],input);}
const folder='docs/security/phase6';fs.mkdirSync(folder,{recursive:true});
try{
 if(action==='verify'){
  if(existingPointer.action!=='apply')throw Error('No applied cutover manifest');
  const prior=JSON.parse(fs.readFileSync(path.join(existingPointer.backupDir,'preflight.private.txt'),'utf8'));
  const verified=JSON.parse(sql(`BEGIN READ ONLY;SELECT jsonb_build_object('checked_at',clock_timestamp(),
   'fixed_roles_applied',to_regclass('pawpal_private.work_rpc_catalog') IS NOT NULL,
   'role_catalog',(SELECT jsonb_agg(code ORDER BY code) FROM public.access_role),
   'real_staff_count',(SELECT count(*) FROM public.staff),'personal_grants',(SELECT count(*) FROM public.staff_permission),
   'role_counts',(SELECT jsonb_object_agg(role_code,n) FROM (SELECT role_code,count(*) n FROM public.staff_role GROUP BY role_code)t),
   'active_admins',(SELECT count(*) FROM public.staff s JOIN public.staff_role r ON r.staff_id=s.id JOIN auth.users u ON u.id=s.auth_user_id WHERE r.role_code='ADMIN' AND s.employment_status='active' AND NOT s.must_change_password AND coalesce(u.banned_until<=now(),true)),
   'non_normalized_statuses',(SELECT count(*) FROM public.staff WHERE employment_status<>lower(employment_status)),
   'unsafe_publication',(SELECT pubdelete OR pubtruncate OR NOT pubinsert OR NOT pubupdate FROM pg_publication WHERE pubname='supabase_realtime'),
   'workspace_signal_published',EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='workspace_signal'),
   'new_function_checks',jsonb_build_object('phone_at_insert',strpos(pg_get_functiondef('public.create_admin_staff_profile(uuid,uuid,uuid,jsonb,text[],text[])'::regprocedure),'must_change_password,phone_number')>0,'staff_assignment',strpos(pg_get_functiondef('public.get_admin_chat_handlers()'::regprocedure),'work.chat.handle')>0,'role_audit',strpos(pg_get_functiondef('public.set_admin_staff_access(uuid,uuid,timestamptz,text[],text[],text)'::regprocedure),'STAFF_ACCESS_CHANGE')>0,'case_guard',strpos(pg_get_functiondef('pawpal_private.guard_staff_phone_duplicate()'::regprocedure),'lower(NEW.employment_status)')>0),
   'auth_state_hash',(SELECT md5(coalesce(string_agg(jsonb_build_array(id,encrypted_password,banned_until)::text,E'\n' ORDER BY id),'')) FROM auth.users));COMMIT;`));
  verified.originalAuthPasswordsAndBansStillUnchanged=verified.auth_state_hash===prior.auth_state_hash;delete verified.auth_state_hash;
  const originalMapping=JSON.parse(fs.readFileSync(path.join(existingPointer.backupDir,'account-mapping.private.txt'),'utf8'));verified.originalStaffCountRetained=verified.real_staff_count===originalMapping.length;
  verified.status=verified.fixed_roles_applied&&verified.active_admins>=1&&verified.personal_grants===0&&verified.non_normalized_statuses===0&&verified.unsafe_publication===false&&verified.workspace_signal_published&&Object.values(verified.new_function_checks).every(Boolean)&&verified.originalAuthPasswordsAndBansStillUnchanged&&verified.originalStaffCountRetained?'PASS':'FAIL';
  fs.writeFileSync(path.join(folder,'cloud-verify-results.txt'),JSON.stringify(verified,null,2)+'\n');console.log(JSON.stringify(verified,null,2));if(verified.status!=='PASS')process.exitCode=1;return;
 }
 const migration=fs.readFileSync(path.join(__dirname,'165_admin_fixed_roles.sql'),'utf8'),fingerprints=[...migration.matchAll(/\('([^']+)','([a-f0-9]{32})'\)/g)].map(m=>({signature:m[1],hash:m[2]}));
 const expected=fingerprints.map(f=>"('"+f.signature+"','"+f.hash+"')").join(',');
 const data=JSON.parse(sql(`BEGIN READ ONLY;SELECT jsonb_build_object(
 'checked_at',clock_timestamp(),'database',current_database(),
 'fixed_roles_applied',to_regclass('pawpal_private.work_rpc_catalog') IS NOT NULL,
 'role_counts',(SELECT coalesce(jsonb_object_agg(role_code,n),'{}') FROM (SELECT role_code,count(*) n FROM public.staff_role GROUP BY role_code)t),
 'role_catalog',(SELECT jsonb_agg(code ORDER BY code) FROM public.access_role),
 'personal_grants',(SELECT count(*) FROM public.staff_permission),
 'multiple_roles',(SELECT count(*) FROM (SELECT staff_id FROM public.staff_role GROUP BY staff_id HAVING count(*)>1)t),
 'active_admins',(SELECT count(*) FROM public.staff s JOIN public.staff_role r ON r.staff_id=s.id JOIN auth.users u ON u.id=s.auth_user_id WHERE r.role_code='ADMIN' AND lower(s.employment_status)='active' AND NOT s.must_change_password AND coalesce(u.banned_until<=now(),true)),
 'work_permissions',(SELECT count(*) FROM public.permission WHERE code LIKE 'work.%'),
 'fingerprint_mismatches',(SELECT coalesce(jsonb_agg(signature),'[]') FROM (VALUES ${expected})v(signature,hash) WHERE to_regprocedure(signature) IS NULL OR md5(pg_get_functiondef(to_regprocedure(signature)))<>hash),
 'publication',(SELECT to_jsonb(p)-'oid'-'pubowner' FROM pg_publication p WHERE pubname='supabase_realtime'),
 'published_tables',(SELECT coalesce(jsonb_agg(schemaname||'.'||tablename ORDER BY schemaname,tablename),'[]') FROM pg_publication_tables WHERE pubname='supabase_realtime'),
 'storage_buckets',(SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'public',public)),'[]') FROM storage.buckets),
 'storage_policies',(SELECT coalesce(jsonb_agg(policyname),'[]') FROM pg_policies WHERE schemaname='storage'),
 'auth_state_hash',(SELECT md5(coalesce(string_agg(jsonb_build_array(id,encrypted_password,banned_until)::text,E'\n' ORDER BY id),'')) FROM auth.users)
 );COMMIT;`));
 const identities=JSON.parse(sql("BEGIN READ ONLY;SELECT coalesce(jsonb_agg(jsonb_build_object('staff_id',s.id,'auth_user_id',s.auth_user_id,'name',s.full_name,'job_title',s.job_title,'employment_status',s.employment_status,'must_change_password',s.must_change_password,'auth_banned_until',u.banned_until,'roles',(SELECT coalesce(jsonb_agg(role_code),'[]') FROM public.staff_role WHERE staff_id=s.id)) ORDER BY s.id),'[]') FROM public.staff s LEFT JOIN auth.users u ON u.id=s.auth_user_id;COMMIT;"));
 fs.writeFileSync(path.join(privateDir,'preflight.private.txt'),JSON.stringify(data,null,2)+'\n');fs.writeFileSync(path.join(privateDir,'account-mapping.private.txt'),JSON.stringify(identities,null,2)+'\n');
 const safe={...data};delete safe.auth_state_hash;
 safe.sourceFingerprintsReviewed=fingerprints.length;safe.noAuthOrBusinessWrites=true;safe.accountMappingSavedPrivately=true;
 if(['apply','rehearse'].includes(action)){
  if(!existingPointer||existingPointer.action!=='backup')throw Error('A completed Cloud backup is required');
  const backupDir=path.resolve(existingPointer.privateDir),root=path.resolve(infra,'backups')+path.sep;
  if(!backupDir.startsWith(root))throw Error('Unexpected private backup location');
  const backup=JSON.parse(fs.readFileSync(path.join(backupDir,'backup-manifest.txt'),'utf8'));
  for(const [file,key]of [['before-schema.private.sql','schemaSha256'],['before-access-data.private.sql','accessDataSha256']])if(crypto.createHash('sha256').update(fs.readFileSync(path.join(backupDir,file))).digest('hex')!==backup[key])throw Error('Cloud backup checksum mismatch');
  if(data.fixed_roles_applied||data.fingerprint_mismatches.length||data.active_admins<1||data.personal_grants||data.multiple_roles)throw Error('Cloud preflight does not match the accepted initial state');
  const names=['187_staff_status_case_guard.sql'];for(let n=165;n<=186;n++){const matches=fs.readdirSync(__dirname).filter(f=>f.startsWith(n+'_')&&f.endsWith('.sql')&&!f.endsWith('.rollback.sql'));if(matches.length!==1)throw Error('Missing or ambiguous migration '+n);names.push(matches[0]);}
  for(const name of names){const rollback=name.replace(/\.sql$/,'.rollback.sql');if(!fs.existsSync(path.join(__dirname,rollback)))throw Error('Missing rollback '+name);}
  const files=names.map(name=>({name,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,name))).digest('hex')}));
  if(action==='apply'){
   const rehearsal=JSON.parse(fs.readFileSync(path.join(folder,'cloud-rehearse-results.txt'),'utf8'));
   if(!rehearsal.atomic||!rehearsal.disposableDatabaseRemoved||!rehearsal.legacy_duplicate_case_normalizationPassed||!rehearsal.realDuplicatePhoneAndReactivationStillDenied||JSON.stringify(rehearsal.files)!==JSON.stringify(files))throw Error('Current cutover SQL has not passed the complete local rehearsal');
  }
  // Validate current accepted SQL bytes rather than trusting filenames or a prior test result alone.
  const accepted=JSON.parse(fs.readFileSync('docs/security/phase5/full/ui-results.txt','utf8'));if(accepted.status!=='PASS'||!accepted.disposableDatabaseRemoved)throw Error('Phase 5 acceptance missing');
  for(const [file,hash]of Object.entries(accepted.sourceSha256))if(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')!==hash)throw Error('Accepted source changed: '+file);
  const sources=names.map(name=>fs.readFileSync(path.join(__dirname,name),'utf8').replace(/^BEGIN;\s*$/gm,'').replace(/^COMMIT;\s*$/gm,'')).join('\n');
  const snapshot=`CREATE FUNCTION pg_temp.cutover_snapshot() RETURNS jsonb LANGUAGE plpgsql AS $$
   DECLARE t record; value text; result jsonb:='{}'; BEGIN
    FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename NOT IN ('access_role','permission','role_permission','staff') ORDER BY tablename LOOP
     EXECUTE format('SELECT md5(coalesce(string_agg(to_jsonb(r)::text,chr(10) ORDER BY to_jsonb(r)::text),'''')) FROM public.%I r',t.tablename) INTO value;
     result:=result||jsonb_build_object(t.tablename,value);
    END LOOP;
    SELECT md5(coalesce(string_agg((to_jsonb(s)-'employment_status'-'updated_at')::text||lower(employment_status),chr(10) ORDER BY id),'')) INTO value FROM public.staff s;
    result:=result||jsonb_build_object('staff_except_normalized_status_and_version',value);
    SELECT md5(coalesce(string_agg(jsonb_build_array(id,encrypted_password,banned_until)::text,chr(10) ORDER BY id),'')) INTO value FROM auth.users;
    RETURN result||jsonb_build_object('auth_identity_password_ban',value);END $$;
   CREATE TEMP TABLE cutover_before ON COMMIT DROP AS SELECT pg_temp.cutover_snapshot() snapshot;`;
  // Compare only original tables: workspace_signal is a newly introduced, opaque invalidation table.
  const transaction=`BEGIN ISOLATION LEVEL REPEATABLE READ;SET LOCAL lock_timeout='5s';${snapshot}\n${sources}\n
   DO $$ DECLARE before jsonb; after jsonb; key text; BEGIN
    SELECT snapshot INTO before FROM cutover_before;after:=pg_temp.cutover_snapshot();
    FOR key IN SELECT jsonb_object_keys(before) LOOP IF before->key IS DISTINCT FROM after->key THEN RAISE EXCEPTION 'cutover_changed_source_rows: %',key; END IF; END LOOP;
    IF NOT EXISTS(SELECT 1 FROM public.staff_role r JOIN public.staff s ON s.id=r.staff_id JOIN auth.users u ON u.id=s.auth_user_id WHERE r.role_code='ADMIN' AND s.employment_status='active' AND NOT s.must_change_password AND coalesce(u.banned_until<=now(),true)) THEN RAISE EXCEPTION 'cutover_missing_active_admin'; END IF;
    IF EXISTS(SELECT 1 FROM public.staff_permission) OR EXISTS(SELECT 1 FROM public.staff_role GROUP BY staff_id HAVING count(*)<>1) THEN RAISE EXCEPTION 'cutover_unexpected_grants'; END IF;
    IF EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime' AND (pubdelete OR pubtruncate OR NOT pubinsert OR NOT pubupdate)) THEN RAISE EXCEPTION 'cutover_unsafe_publication'; END IF;
   END $$;
   SELECT jsonb_build_object('applied_at',clock_timestamp(),'migrations',23,'atomic',true,'business_rows_unchanged',true,'auth_passwords_and_bans_unchanged',true,'existing_roles_unchanged',true,'admin_retained',true,'no_real_staff_assigned',true,'publication_delete_disabled',true);
   COMMIT;`;
  fs.writeFileSync(path.join(privateDir,'reviewed-cutover.private.sql'),transaction);
  let result;
  if(action==='rehearse'){
   const local=JSON.parse(fs.readFileSync('docs/security/phase2/local-environment.txt','utf8')),db='pawpal_cutover_'+crypto.randomBytes(6).toString('hex'),marker='pawpal-cutover-rehearsal-'+db;
   const localSql=(database,input)=>{const r=cp.spawnSync('docker',['exec','-i','supabase-db','psql','-U','supabase_admin','-d',database,'-X','-qAt','-v','ON_ERROR_STOP=1','-f','-'],{input,encoding:'utf8',windowsHide:true,timeout:120000,maxBuffer:16*1024*1024});if(r.status!==0){fs.writeFileSync(path.join(privateDir,'rehearsal-error.private.log'),r.stderr||r.error?.message||'failed');throw Error('Rehearsal failed; private local diagnostics saved');}return r.stdout.trim();};
   if(!/^pawpal_access_[a-f0-9]{12}$/.test(local.database)||localSql(local.database,"SELECT shobj_description(oid,'pg_database') FROM pg_database WHERE datname=current_database()")!==local.marker)throw Error('Unexpected review database');
   localSql('postgres',`CREATE DATABASE ${db} TEMPLATE ${local.database};COMMENT ON DATABASE ${db} IS '${marker}'`);
   try{
    localSql(db,"DELETE FROM public.staff_role WHERE role_code='STAFF'");localSql(db,fs.readFileSync(path.join(__dirname,'165_admin_fixed_roles.rollback.sql'),'utf8'));
    // Reproduce duplicate legacy rows without changing source review data or relaxing the live constraint.
    localSql(db,"ALTER TABLE public.staff DISABLE TRIGGER staff_phone_duplicate;UPDATE public.staff SET employment_status='ACTIVE',phone_number='0901234567' WHERE id IN ('16500000-0000-4000-8000-000000000001','16500000-0000-4000-8000-000000000002');ALTER TABLE public.staff ENABLE TRIGGER staff_phone_duplicate;");
    result=JSON.parse(localSql(db,transaction));
    localSql(db,`DO $$ BEGIN
     BEGIN UPDATE public.staff SET phone_number='0901234567' WHERE id='16500000-0000-4000-8000-000000000003';RAISE EXCEPTION 'expected_duplicate_phone_denial';EXCEPTION WHEN SQLSTATE 'PT409' THEN NULL; END;
     BEGIN UPDATE public.staff SET employment_status='resigned' WHERE id='16500000-0000-4000-8000-000000000001';UPDATE public.staff SET employment_status='active' WHERE id='16500000-0000-4000-8000-000000000001';RAISE EXCEPTION 'expected_reactivation_denial';EXCEPTION WHEN SQLSTATE 'PT409' THEN NULL; END;
    END $$;`);
    result.legacy_duplicate_case_normalizationPassed=true;result.realDuplicatePhoneAndReactivationStillDenied=true;
    result.scope='Exact atomic cutover SQL rehearsed on owned local review clone; Cloud read-only';
   }finally{if(localSql(db,"SELECT shobj_description(oid,'pg_database') FROM pg_database WHERE datname=current_database()")===marker){localSql('postgres',`DROP DATABASE ${db} WITH (FORCE)`);if(result)result.disposableDatabaseRemoved=true;}}
  }else result=JSON.parse(sql(transaction));
  const report={...result,files,backupChecksums:backup,siteClientRequiredCommit:'36c602c0d22ff1cffe05364a6fd4fe34132c9718'};
  fs.writeFileSync(path.join(folder,'cloud-'+action+'-results.txt'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(path.join(privateDir,action+'-manifest.txt'),JSON.stringify(report,null,2));
  if(action==='apply')fs.writeFileSync(path.join(folder,'cutover.private.txt'),JSON.stringify({privateDir,backupDir,action,capturedAt:new Date().toISOString()},null,2));
  console.log(JSON.stringify(report,null,2));return;
 }
 if(action==='backup'){
  const schema=run('pg_dump',['--schema-only','--schema=public','--schema=pawpal_private','--schema=storage','--no-owner']);
  const rows=run('pg_dump',['--data-only','--table=public.staff','--table=public.access_role','--table=public.permission','--table=public.role_permission','--table=public.staff_role','--table=public.staff_permission','--column-inserts','--no-owner']);
  fs.writeFileSync(path.join(privateDir,'before-schema.private.sql'),schema+'\n');fs.writeFileSync(path.join(privateDir,'before-access-data.private.sql'),rows+'\n');
  const manifest={capturedAt:new Date().toISOString(),schemaSha256:crypto.createHash('sha256').update(schema+'\n').digest('hex'),accessDataSha256:crypto.createHash('sha256').update(rows+'\n').digest('hex'),schemaBytes:Buffer.byteLength(schema),accessDataBytes:Buffer.byteLength(rows)};
  fs.writeFileSync(path.join(privateDir,'backup-manifest.txt'),JSON.stringify(manifest,null,2));safe.backup=manifest;
 }
 fs.writeFileSync(path.join(folder,'cloud-'+action+'-results.txt'),JSON.stringify(safe,null,2)+'\n');
 // Local-only pointer is ignored by Git and never served as site source.
 fs.writeFileSync(path.join(folder,'cutover.private.txt'),JSON.stringify({privateDir,action,capturedAt:new Date().toISOString()},null,2));
 console.log(JSON.stringify(safe,null,2));
}finally{if(fs.existsSync(envFile))fs.unlinkSync(envFile);}
