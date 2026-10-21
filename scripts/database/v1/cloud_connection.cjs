// Project-scoped migration transport. Password travels over stdin, overriding container PGPASSWORD.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const infra='D:/Aboutme/Pawpal-infra/supabase-local';
function settings(){
 const config=require('dotenv').parse(fs.readFileSync(infra+'/CLOUD-MIGRATION.private.env'));
 const uri=new URL(config.DESTINATION_DATABASE_URL);
 if(config.DESTINATION_SUPABASE_URL!=='https://cpzuvaplseielhgcnqrn.supabase.co'
 ||decodeURIComponent(uri.username)!=='postgres.cpzuvaplseielhgcnqrn'
 ||!uri.hostname.endsWith('.pooler.supabase.com')||uri.port!=='5432'||uri.pathname!=='/postgres')throw Error('Unexpected Cloud migration destination');
 if(!config.DESTINATION_DATABASE_PASSWORD||/[\r\n]/.test(config.DESTINATION_DATABASE_PASSWORD))throw Error('Missing or multiline database password');
 return {config,uri};
}
function cloud(command,args=[],input='',options={}){
 if(!['psql','pg_dump'].includes(command))throw Error('Unsupported migration command');
 const {config,uri}=settings();
 const connection=['-h',uri.hostname,'-p',uri.port,'-U',decodeURIComponent(uri.username),'-d','postgres'];
 const result=spawnSync('docker',['exec','-i','-e','PGSSLMODE=require','-e','PGCONNECT_TIMEOUT=15','supabase-db','sh','-c',
  'IFS= read -r PGPASSWORD; export PGPASSWORD; exec "$@"','sh',command,...connection,...args],
  {input:config.DESTINATION_DATABASE_PASSWORD+'\n'+input,encoding:'utf8',maxBuffer:64*1024*1024,timeout:options.timeout||120000,windowsHide:true});
 if(result.status!==0){
  const log=path.join(options.folder||infra,'cloud-connection-error.private.log');
  fs.writeFileSync(log,(result.stderr||result.error?.message||'Cloud command failed').replaceAll(config.DESTINATION_DATABASE_PASSWORD,'[REDACTED]'));
  throw Error('Cloud command failed; details saved outside webroot: '+log);
 }
 return result.stdout;
}
function sql(query,options={}){return cloud('psql',['-X','-q','-A','-t','-v','ON_ERROR_STOP=1','-f','-'],query,options).trim();}
module.exports={infra,settings,cloud,sql};
