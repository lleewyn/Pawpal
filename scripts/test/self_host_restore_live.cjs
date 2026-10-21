// Restores a full local dump into a disposable, uniquely named database.
// Existing application databases are never used as a restore target.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {createClient}=require('@supabase/supabase-js');
const envPath=process.argv[2];
if(!envPath||!path.isAbsolute(envPath))throw Error('Pass absolute infra .env path');
const env=require('dotenv').parse(fs.readFileSync(envPath));
if(env.SUPABASE_PUBLIC_URL!=='http://localhost:8000')throw Error('Local-only restore test');
const docker=args=>execFileSync('docker',args,{encoding:'utf8',stdio:['ignore','pipe','pipe'],maxBuffer:4*1024*1024});
const labels=JSON.parse(docker(['inspect','supabase-db','--format','{{json .Config.Labels}}']));
if(labels['com.docker.compose.project']!=='supabase'||labels['com.docker.compose.service']!=='db')throw Error('Unexpected database container');
const suffix=crypto.randomBytes(8).toString('hex');
const target='pawpal_restorecheck_'+suffix;
if(!/^pawpal_restorecheck_[a-f0-9]{16}$/.test(target)||['postgres','_supabase'].includes(target))throw Error('Invalid disposable target');
const remoteFile='/tmp/'+target+'.dump';
const sql=(db,query)=>docker(['exec','supabase-db','psql','-U','supabase_admin','-d',db,'-v','ON_ERROR_STOP=1','-Atc',query]).trim();
const client=createClient(env.SUPABASE_PUBLIC_URL,env.SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const ok=async p=>{const r=await p;if(r.error)throw Error(r.error.message);return r.data;};
let customer,created=false;
(async()=>{
 try{
  customer=await ok(client.from('customer').insert({note:'Disposable restore verification '+suffix}).select('id').single());
  const pet=await ok(client.from('pet_profile').insert({customer_id:customer.id,pet_code:'RESTORE-'+suffix,pet_name:'Restore verification',species:'dog',weight:6.25}).select('id').single());
  docker(['exec','supabase-db','pg_dump','-U','supabase_admin','-d','postgres','-Fc','-f',remoteFile]);
  const backupDir=path.join(path.dirname(envPath),'backups');fs.mkdirSync(backupDir,{recursive:true});
  const file=path.join(backupDir,target+'.dump');docker(['cp','supabase-db:'+remoteFile,file]);
  docker(['exec','supabase-db','createdb','-U','supabase_admin','-T','template0',target]);created=true;
  docker(['exec','supabase-db','pg_restore','-U','supabase_admin','--exit-on-error','-d',target,remoteFile]);
  console.log('PASS full local dump restores into a separate database');
  const row=sql(target,`SELECT customer_id::text||':'||weight::text FROM public.pet_profile WHERE id='${pet.id}'`);
  if(row!==customer.id+':6.25')throw Error('Restored pet/customer relationship mismatch');
  const catalog="SELECT schemaname||'.'||tablename||':'||policyname||':'||roles::text||':'||cmd||':'||coalesce(qual,'')||':'||coalesce(with_check,'') FROM pg_policies WHERE schemaname='public' ORDER BY tablename,policyname";
  if(sql(target,catalog)!==sql('postgres',catalog))throw Error('Restored RLS definitions differ');
  const grants="SELECT table_name||':'||grantee||':'||privilege_type FROM information_schema.table_privileges WHERE table_schema='public' ORDER BY table_name,grantee,privilege_type";
  if(sql(target,grants)!==sql('postgres',grants))throw Error('Restored table grants differ');
  const triggers="SELECT pg_get_triggerdef(oid) FROM pg_trigger WHERE tgrelid='public.audit_log'::regclass AND NOT tgisinternal ORDER BY tgname";
  if(sql(target,triggers)!==sql('postgres',triggers))throw Error('Restored audit trigger differs');
  const authFingerprint="SELECT md5(coalesce(string_agg(id::text||coalesce(encrypted_password,''),',' ORDER BY id),'')) FROM auth.users";
  if(sql(target,authFingerprint)!==sql('postgres',authFingerprint))throw Error('Restored Auth users/password hashes differ');
  console.log('PASS restored business data, FK relationship, RLS, grants, audit trigger and Auth records match');
  const own=sql(target,"SELECT pg_get_userbyid(proowner) FROM pg_proc WHERE oid='public.pawpal_is_staff()'::regprocedure");
  if(own!==sql('postgres',"SELECT pg_get_userbyid(proowner) FROM pg_proc WHERE oid='public.pawpal_is_staff()'::regprocedure"))throw Error('Restored security-definer owner differs');
  console.log('PASS security-definer ownership preserved');
 }finally{
  // Target name was generated and validated above; never drop a pre-existing database.
  if(created)docker(['exec','supabase-db','dropdb','-U','supabase_admin','--force',target]);
  if(customer)await ok(client.from('customer').delete().eq('id',customer.id));
 }
})().catch(e=>{
 // pg_restore stderr may contain DDL; save it privately instead of exposing it in chat.
 const privateError=path.join(path.dirname(envPath),'restore-check.private.log');
 fs.writeFileSync(privateError,e.stderr?.toString()||e.message);
 console.error('Restore check failed; details saved in private infra log.');process.exitCode=1;
});
