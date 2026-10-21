// Local-only persistence check; restarts only this dedicated database container.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {createClient}=require('@supabase/supabase-js');
const envPath=process.argv[2];
if(!envPath||!path.isAbsolute(envPath))throw Error('Pass absolute infra .env path');
const env=require('dotenv').parse(fs.readFileSync(envPath));
if(env.SUPABASE_PUBLIC_URL!=='http://localhost:8000')throw Error('Local-only test');
const docker=(args)=>execFileSync('docker',args,{encoding:'utf8',stdio:['ignore','pipe','pipe']});
const labels=JSON.parse(docker(['inspect','supabase-db','--format','{{json .Config.Labels}}']));
if(labels['com.docker.compose.project']!=='supabase'||labels['com.docker.compose.service']!=='db')throw Error('Unexpected container');
const c=createClient(env.SUPABASE_PUBLIC_URL,env.SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const ok=async p=>{const r=await p;if(r.error)throw Error(r.error.message);return r.data;};
const delay=ms=>new Promise(r=>setTimeout(r,ms));
let customer;
(async()=>{
 try{
  customer=await ok(c.from('customer').insert({note:'Local restart verification'}).select('id').single());
  const pet=await ok(c.from('pet_profile').insert({customer_id:customer.id,pet_code:'RESTART-'+crypto.randomUUID(),pet_name:'Local restart verification',species:'dog',weight:3.5}).select('id').single());
  docker(['restart','supabase-db']);
  let found,lastError;
  for(let i=0;i<40;i++){
   try{found=await ok(c.from('pet_profile').select('id,weight,customer_id').eq('id',pet.id).single());break;}
   catch(e){lastError=e;await delay(1000);}
  }
  if(!found)throw lastError;
  if(found.weight!==3.5||found.customer_id!==customer.id)throw Error('Persisted record mismatch');
  console.log('PASS customer and pet persist after database container restart');
  const backupDir=path.join(path.dirname(envPath),'backups');fs.mkdirSync(backupDir,{recursive:true});
  const name='pawpal-local-'+new Date().toISOString().replace(/[:.]/g,'-')+'.dump';
  docker(['exec','supabase-db','pg_dump','-U','postgres','-d','postgres','-Fc','-f','/tmp/pawpal-core-backup.dump']);
  docker(['cp','supabase-db:/tmp/pawpal-core-backup.dump',path.join(backupDir,name)]);
  if(fs.statSync(path.join(backupDir,name)).size<1000)throw Error('Invalid backup size');
  console.log('PASS local database backup written outside web root (restore not yet tested)');
 }finally{if(customer)await ok(c.from('customer').delete().eq('id',customer.id));}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
