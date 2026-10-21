// Back up the installed V1 and restore into a new disposable database.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {verify}=require('./verify.cjs');
const suffix=crypto.randomBytes(8).toString('hex');
const target='pawpal_v1restore_'+suffix;
const folder=path.resolve('D:/Aboutme/Pawpal-infra/supabase-local/backups/v1-verified-'+suffix);
fs.mkdirSync(folder,{recursive:true});
function docker(args){try{return execFileSync('docker',args,{encoding:'utf8',maxBuffer:16*1024*1024,stdio:['ignore','pipe','pipe']});}catch(e){fs.writeFileSync(path.join(folder,'restore-error.private.log'),e.stderr?.toString()||e.message);throw Error('Restore verification failed; private log in '+folder);}}
const sql=(db,q)=>docker(['exec','supabase-db','psql','-X','-U','supabase_admin','-d',db,'-v','ON_ERROR_STOP=1','-Atc',q]).trim();
const labels=JSON.parse(docker(['inspect','supabase-db','--format','{{json .Config.Labels}}']));
if(labels['com.docker.compose.project']!=='supabase'||labels['com.docker.compose.service']!=='db')throw Error('Not the local Supabase DB');
let created=false;
try{
 const source=verify(sql,'postgres');
 const fingerprintQuery="SELECT md5(coalesce(string_agg(id::text||coalesce(encrypted_password,''),',' ORDER BY id),'')) FROM auth.users";
 const beforeAuth=sql('postgres',fingerprintQuery);
 const remote='/tmp/'+target+'.dump';
 docker(['exec','supabase-db','pg_dump','-U','supabase_admin','-d','postgres','-Fc','-f',remote]);
 const file=path.join(folder,'v1-full.dump');docker(['cp','supabase-db:'+remote,file]);
 fs.writeFileSync(path.join(folder,'SHA256.txt'),crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')+'  v1-full.dump\n');
 docker(['exec','supabase-db','createdb','-U','supabase_admin','-T','template0',target]);created=true;
 docker(['exec','supabase-db','pg_restore','-U','supabase_admin','--exit-on-error','-d',target,remote]);
 const restored=verify(sql,target);
 if(JSON.stringify(source)!==JSON.stringify(restored)||sql(target,fingerprintQuery)!==beforeAuth)throw Error('Restored catalog/Auth differs');
 const policies="SELECT tablename||':'||policyname||':'||cmd||':'||coalesce(qual,'')||':'||coalesce(with_check,'') FROM pg_policies WHERE schemaname='public' ORDER BY tablename,policyname";
 if(sql('postgres',policies)!==sql(target,policies))throw Error('Restored RLS policies differ');
 fs.writeFileSync(path.join(folder,'verification.txt'),'Full V1 restore verified\n'+JSON.stringify(restored)+'\nAuth fingerprint and RLS policies match.\n');
 console.log('PASS installed V1 dump restores: '+JSON.stringify(restored)+'; Auth and RLS match');
 console.log('V1 backup: '+folder);
}finally{
 if(created&&/^pawpal_v1restore_[a-f0-9]{16}$/.test(target))docker(['exec','supabase-db','dropdb','-U','supabase_admin','--force',target]);
}
