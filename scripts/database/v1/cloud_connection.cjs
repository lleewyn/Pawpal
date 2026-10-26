// Project-scoped Supabase Cloud transport using native PostgreSQL clients.
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
 const executable=process.env.PAWPAL_PG_BIN ? path.join(process.env.PAWPAL_PG_BIN,command+(process.platform==='win32'?'.exe':'')) : command;
 const result=spawnSync(executable,[...connection,...args],
  {input,env:{...process.env,PGPASSWORD:config.DESTINATION_DATABASE_PASSWORD,PGSSLMODE:'require',PGCONNECT_TIMEOUT:'15'},encoding:'utf8',maxBuffer:64*1024*1024,timeout:options.timeout||120000,windowsHide:true});
 if(result.error?.code==='ENOENT')throw Error('PostgreSQL client not found: '+command+'. Install PostgreSQL client tools and add them to PATH, or set PAWPAL_PG_BIN.');
 if(result.status!==0){
  const log=path.join(options.folder||infra,'cloud-connection-error.private.log');
  fs.writeFileSync(log,(result.stderr||result.error?.message||'Cloud command failed').replaceAll(config.DESTINATION_DATABASE_PASSWORD,'[REDACTED]'));
  throw Error('Cloud command failed; details saved outside webroot: '+log);
 }
 return result.stdout;
}
function sql(query,options={}){return cloud('psql',['-X','-q','-A','-t','-v','ON_ERROR_STOP=1','-f','-'],query,options).trim();}
module.exports={infra,settings,cloud,sql};
