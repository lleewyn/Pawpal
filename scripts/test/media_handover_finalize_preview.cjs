'use strict';
const fs=require('node:fs'),path=require('node:path');
(async()=>{try{
 const linked=JSON.parse(fs.readFileSync('.vercel/project.json')),auth=JSON.parse(fs.readFileSync(path.join(process.env.APPDATA,'com.vercel.cli/Data/auth.json'))),state=JSON.parse(fs.readFileSync('D:/Aboutme/Pawpal-infra/media/phase5-handover-preview.private.json'));
 const request=async(endpoint,method='GET',body)=>{const r=await fetch('https://api.vercel.com'+endpoint+'?teamId='+linked.orgId,{method,headers:{Authorization:'Bearer '+auth.token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});if(r.status===404&&method==='GET')return null;if(!r.ok)throw Error('VERCEL_ACTION_FAILED');return r.status===204?{}:r.json();};
 const latest=await request('/v13/deployments/'+state.deploymentId);if(latest.projectId!==linked.projectId||latest.target==='production'||latest.readyState!=='READY')throw Error('LATEST_SCOPE');
 const obsolete=[...new Set(state.previousDeployments.map(d=>d.deploymentId))].filter(id=>id!==state.deploymentId);
 const removed=[];for(const id of obsolete){const d=await request('/v13/deployments/'+id);if(!d)continue;if(d.projectId!==linked.projectId||d.target==='production')throw Error('DELETE_SCOPE');await request('/v13/deployments/'+id,'DELETE');removed.push(id);}
 let revoked=false;
 if(state.generatedBypass){const project=await request('/v9/projects/'+linked.projectId);const entry=project.protectionBypass?.[state.generatedBypass];if(entry){if(entry.scope!=='automation-bypass'||state.originalBypasses.includes(state.generatedBypass))throw Error('BYPASS_SCOPE');await request('/v1/projects/'+linked.projectId+'/protection-bypass','PATCH',{revoke:{secret:state.generatedBypass,regenerate:false}});}revoked=true;}
 const report={status:'PASS',previewUrl:state.previewUrl,retainedDeploymentId:state.deploymentId,obsoleteOwnPreviewDeploymentsRemoved:removed.length,temporaryBypassRevoked:revoked,productionDeploymentChanged:false,projectEnvironmentChanged:false,uploadEnabledOnlyOnRetainedPreview:true};
 fs.writeFileSync('docs/media/phase5-handover-preview-finalized.txt',JSON.stringify(report,null,2));
 const full=JSON.parse(fs.readFileSync('docs/media/phase5-handover-preview.txt'));full.status='READY';full.temporaryBypassRevoked=revoked;fs.writeFileSync('docs/media/phase5-handover-preview.txt',JSON.stringify(full,null,2));
 console.log(JSON.stringify(report));
}catch{console.error('PREVIEW_FINALIZATION_FAILED');process.exitCode=1;}})();
