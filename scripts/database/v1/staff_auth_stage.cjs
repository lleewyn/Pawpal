// Separate GoTrue instance on the disposable restored DB. No live Auth changes.
const fs=require('node:fs'),{execFileSync}=require('node:child_process');
const infra='D:/Aboutme/Pawpal-infra/supabase-local',file=infra+'/customer-completion.private.txt';
const state=JSON.parse(fs.readFileSync(file,'utf8'));
if(!/^pawpal_customers_[a-f0-9]{12}$/.test(state.stage))throw Error('Invalid restored target');
const docker=args=>execFileSync('docker',args,{encoding:'utf8',maxBuffer:8*1024*1024});
(async()=>{
 if(state.authApi){
  if(state.authApi!==state.api+'-auth')throw Error('Unexpected verification Auth container');
  const existing=JSON.parse(docker(['inspect',state.authApi]))[0];
  if(!existing.State.Running){docker(['rm',state.authApi]);delete state.authApi;fs.writeFileSync(file,JSON.stringify(state));}
 }
 if(!state.authApi){
  const source=JSON.parse(docker(['inspect','supabase-auth']))[0],prefix='GOTRUE_DB_DATABASE_URL=';
  const config=source.Config.Env.map(value=>{
   if(value.startsWith(prefix)){const uri=new URL(value.slice(prefix.length));uri.pathname='/'+state.stage;return prefix+uri.toString();}
   return value;
  });
  if(!config.some(v=>v.startsWith(prefix)&&new URL(v.slice(prefix.length)).pathname==='/'+state.stage))throw Error('No restored Auth database connection');
  const envFile=state.folder+'/verification-auth.private.env';fs.writeFileSync(envFile,config.join('\n')+'\n');
  state.authApi=state.api+'-auth';state.authPort=8021;fs.writeFileSync(file,JSON.stringify(state));
  docker(['run','-d','--name',state.authApi,'--network',Object.keys(source.NetworkSettings.Networks)[0],'-p','127.0.0.1:8021:9999','--env-file',envFile,source.Config.Image]);
 }
 for(let i=0;i<30;i++){
  try{const result=await fetch('http://localhost:'+state.authPort+'/health');if(result.ok){console.log('PASS isolated Auth API ready on '+state.authPort+'; live Supabase Auth untouched');return;}}catch{}
  await new Promise(resolve=>setTimeout(resolve,500));
 }
 throw Error('Isolated Auth did not become healthy');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
