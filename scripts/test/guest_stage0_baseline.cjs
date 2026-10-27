const fs=require('node:fs'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const hash=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',windowsHide:true}).trim();
const files=['pages/public/login/login.js','pages/public/return-guest/return-guest.js','pages/services/booking/booking.js','pages/shop/cart/cart.js','pages/shop/checkout/checkout.js','scripts/api/api.js','scripts/api/customer_auth.js','scripts/shared/cart-access.mjs','scripts/shared/customer-identity.mjs','pages/user/modules/profile/profile.js','pages/user/modules/pets/pets.js','pages/user/modules/bookings/bookings.js','pages/user/modules/orders/orders.js'];
(async()=>{
 const headers={'User-Agent':'Pawpal-stage0-audit'};
 const response=await fetch('https://api.github.com/repos/lleewyn/Pawpal/deployments?per_page=3',{headers,signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('Deployment metadata HTTP '+response.status);
 const deployments=await response.json(),production=deployments.find(d=>d.environment==='Production');
 if(!production)throw Error('No Production deployment metadata');
 const statusResponse=await fetch(production.statuses_url,{headers,signal:AbortSignal.timeout(15000)});
 if(!statusResponse.ok)throw Error('Deployment status HTTP '+statusResponse.status);
 const statuses=await statusResponse.json(),latest=statuses[0];
 if(latest?.state!=='success')throw Error('Latest Production deployment not successful');
 const result={capturedAt:new Date().toISOString(),branch:git('branch','--show-current'),head:git('rev-parse','HEAD'),originMain:git('ls-remote','origin','refs/heads/main').split(/\s/)[0],production:{sha:production.sha,created:production.created_at,status:latest.state,url:latest.environment_url,source:production.statuses_url},localFiles:files.map(file=>({file,sha256:hash(fs.readFileSync(file))})),aliasChecks:[]};
 for(const file of ['pages/services/booking/booking.js','pages/shop/checkout/checkout.js','scripts/api/api.js']){
  const res=await fetch('https://pawpalgr3.vercel.app/'+file,{signal:AbortSignal.timeout(15000)});
  const body=Buffer.from(await res.arrayBuffer()),expected=execFileSync('git',['show',production.sha+':'+file],{windowsHide:true,maxBuffer:4*1024*1024});
  result.aliasChecks.push({file,status:res.status,bytes:body.length,sha256:hash(body),matchesProductionCommit:res.ok&&hash(body)===hash(expected)});
 }
 if(result.aliasChecks.some(check=>!check.matchesProductionCommit))throw Error('Production alias file mismatch');
 fs.writeFileSync('docs/verification/sync/guest-stage0-baseline.txt',JSON.stringify(result,null,2)+'\n');
 console.log('PASS Production deployment metadata, three alias asset hashes, local branch and file fingerprints saved.');
})().catch(e=>{console.error(e.message);process.exitCode=1;});
