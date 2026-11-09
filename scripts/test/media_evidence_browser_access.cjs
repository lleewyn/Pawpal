'use strict';
const fs=require('node:fs'),path=require('node:path'),{runCli}=require('./media_vercel_preview.cjs');
(async()=>{try{
 const file='D:/Aboutme/Pawpal-infra/media/phase5-evidence-preview.private.json',state=JSON.parse(fs.readFileSync(file)),linked=JSON.parse(fs.readFileSync('.vercel/project.json')),auth=JSON.parse(fs.readFileSync(path.join(process.env.APPDATA,'com.vercel.cli/Data/auth.json')));
 const request=async url=>{const r=await fetch('https://api.vercel.com'+url+'?teamId='+linked.orgId,{headers:{Authorization:'Bearer '+auth.token},signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('ACCESS');return r.json();};
 const before=await request('/v9/projects/'+linked.projectId),deployment=await request('/v13/deployments/'+state.deploymentId);
 if(deployment.projectId!==linked.projectId||deployment.target==='production'||deployment.readyState!=='READY')throw Error('DEPLOYMENT_SCOPE');
 if(state.generatedBypass&&!before.protectionBypass?.[state.generatedBypass]){delete state.generatedBypass;fs.writeFileSync(file,JSON.stringify(state));}
 if(!state.generatedBypass){
  const cli='C:/Users/QUYEN/AppData/Local/npm-cache/_npx/67eb4586ca667318/node_modules/vercel/dist/vc.js';
  await runCli(cli,['curl',state.previewUrl+'/admin/login'],{timeout:60000});
  const after=await request('/v9/projects/'+linked.projectId),added=Object.keys(after.protectionBypass||{}).filter(k=>!Object.hasOwn(before.protectionBypass||{},k)&&after.protectionBypass[k].scope==='automation-bypass');
  if(added.length!==1)throw Error('BYPASS_SCOPE');state.generatedBypass=added[0];fs.writeFileSync(file,JSON.stringify(state));
 }
 const r=await fetch(state.previewUrl+'/?x-vercel-set-bypass-cookie=true&x-vercel-protection-bypass='+encodeURIComponent(state.generatedBypass),{redirect:'manual',signal:AbortSignal.timeout(20000)});
 const raw=r.headers.getSetCookie().find(x=>x.startsWith('_vercel_jwt='));if(!raw)throw Error('COOKIE');
 fs.writeFileSync('D:/Aboutme/Pawpal-infra/media/phase5-evidence-browser.private.json',JSON.stringify({name:'_vercel_jwt',value:raw.split(';')[0].slice('_vercel_jwt='.length),domain:new URL(state.previewUrl).hostname,path:'/',secure:true,httpOnly:true,sameSite:'Lax'}));
 console.log('EVIDENCE_BROWSER_ACCESS_READY');
}catch{console.error('EVIDENCE_BROWSER_ACCESS_FAILED');process.exitCode=1;}})();
