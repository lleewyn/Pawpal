// Five sequential local-handler GETs and five Production GETs. No AI/business writes.
const fs=require('node:fs'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const {createClient}=require('@supabase/supabase-js');
const {settings,infra}=require('../database/v1/cloud_connection.cjs');
const {createStaffAuthHandlers}=require('../api/staff_auth.js');
const {createHandler}=require('../../api/admin-chat.js');
if(!process.argv.includes('--read-cloud')&&!process.argv.includes('--finalize-evidence')){console.log('No connection. Pass --read-cloud for bounded GET measurements.');process.exit(0);}
const report={capturedAt:new Date().toISOString(),scope:'Existing QA staff JWT; read-only history session page; five sequential samples each, not load or capacity test. Auth sign-in only; no model calls or business writes.',local:[],production:[]};
const hash=v=>crypto.createHash('sha256').update(v).digest('hex');
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
function sourceComparison(deployment){return ['api/admin-chat.js','scripts/api/admin_copilot.js','scripts/api/chat_understanding.js','scripts/api/staff_auth.js'].map(file=>{
 const local=fs.readFileSync(file);let deployed;
 try{deployed=execFileSync('git',['show',deployment+':'+file],{windowsHide:true,stdio:['ignore','pipe','ignore']});}catch{return {file,localSourceSha256:hash(local),existsInDeploymentCommit:false,matchesLocal:false};}
 return {file,deploymentSourceSha256:hash(deployed),localSourceSha256:hash(local),existsInDeploymentCommit:true,matchesLocal:hash(deployed)===hash(local)};
});}
if(process.argv.includes('--finalize-evidence')){
 const file='docs/chatbot/stage0-2026-10-28/api-read-baseline.txt',previous=JSON.parse(fs.readFileSync(file,'utf8'));
 if(previous.local.length!==5||previous.production.length!==5||![...previous.local,...previous.production].every(r=>r.status===200))throw Error('incomplete_measurements');
 previous.sourceComparison=sourceComparison(previous.deployment.sha);previous.status='PASS';
 previous.finalization='Offline only: completed Git source comparison after initial harness rejected a module absent from deployed commit; network measurements unchanged.';
 delete previous.error;fs.writeFileSync(file,JSON.stringify(previous,null,2)+'\n');console.log('PASS: existing 10 successful GET samples retained; source absence recorded without new network calls.');process.exit(0);
}
let internal=[];
const readOnlyFetch=async(input,init={})=>{
 const u=new URL(typeof input==='string'?input:input.url),method=init.method||'GET';
 const allowed=u.pathname==='/auth/v1/user'&&method==='GET'||u.pathname==='/rest/v1/rpc/get_staff_login_context'&&method==='POST'||u.pathname==='/rest/v1/rpc/admin_copilot_session_page'&&method==='POST'||u.pathname==='/rest/v1/admin_copilot_history'&&method==='GET';
 if(!allowed)throw Error('disallowed_request');
 const t=performance.now(),r=await fetch(input,{...init,signal:AbortSignal.timeout(15000)}),bytes=(await r.clone().arrayBuffer()).byteLength;
 internal.push({route:u.pathname,method,status:r.status,decodedBytes:bytes,ms:Math.round((performance.now()-t)*100)/100});return r;
};
function summarize(samples){const times=samples.map(s=>s.ms).sort((a,b)=>a-b);return {n:samples.length,empiricalP50Ms:times[Math.ceil(times.length*.5)-1],empiricalP95Ms:times[Math.ceil(times.length*.95)-1],method:'nearest rank; n=5, p95 is max sample; smoke baseline only',all200:samples.every(s=>s.status===200),maxResponseBytes:Math.max(...samples.map(s=>s.decodedBytes))};}
(async()=>{
 const {config}=settings(),raw=fs.readFileSync(infra+'/PAWPAL-ADMIN.private.txt','utf8');
 const auth=createClient(config.DESTINATION_SUPABASE_URL,config.DESTINATION_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const login=await auth.auth.signInWithPassword({email:raw.match(/^Email: (.+)$/m)[1].trim(),password:raw.match(/^Password: (.+)$/m)[1].trim()});if(login.error||!login.data.session)throw Error('qa_auth_failed');
 const token=login.data.session.access_token,verify=createStaffAuthHandlers({url:config.DESTINATION_SUPABASE_URL,anonKey:config.DESTINATION_SUPABASE_ANON_KEY,serviceKey:config.DESTINATION_SUPABASE_SERVICE_ROLE_KEY,fetch:readOnlyFetch}).verifyStaffCaller;
 const handler=createHandler({verify,generateReply:async()=>{throw Error('ai_forbidden');}});
 for(let i=0;i<5;i++){
  internal=[];const t=performance.now(),res={statusCode:200,setHeader(){},status(n){this.statusCode=n;return this;},json(body){this.body=body;return this;}};
  await handler({method:'GET',headers:{authorization:'Bearer '+token},query:{view:'sessions',page:'1',query:''}},res);
  const payload=JSON.stringify(res.body);report.local.push({status:res.statusCode,ms:Math.round((performance.now()-t)*100)/100,decodedBytes:Buffer.byteLength(payload),responseHash:hash(JSON.stringify(stable(res.body))),shape:Object.keys(res.body||{}).sort(),internalRequests:internal.slice()});
  if(res.statusCode!==200)throw Error('local_read_failed');
 }
 for(let i=0;i<5;i++){
  const t=performance.now(),r=await fetch('https://pawpalgr3.vercel.app/api/admin-chat?view=sessions&page=1&query=',{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(15000)}),payload=await r.text();
  let body;try{body=JSON.parse(payload);}catch{body={};}
  report.production.push({status:r.status,ms:Math.round((performance.now()-t)*100)/100,decodedBytes:Buffer.byteLength(payload),responseHash:hash(JSON.stringify(stable(body))),shape:Object.keys(body).sort()});
  if(r.status!==200)throw Error('production_read_failed');
 }
 report.localSummary=summarize(report.local);report.productionSummary=summarize(report.production);
 report.sameReadPayload=report.local.every(s=>s.responseHash===report.production[0].responseHash)&&report.production.every(s=>s.responseHash===report.local[0].responseHash);
 const deployment=JSON.parse(fs.readFileSync('docs/chatbot/stage0-2026-10-28/inventory.txt','utf8')).production.sha;
 report.deployment={sha:deployment,proof:'GitHub deployment metadata and asset hashes from inventory; GET contract parity is not a runtime source fingerprint.'};
 report.sourceComparison=sourceComparison(deployment);
 report.status='PASS';
})().catch(e=>{report.status='INCOMPLETE';report.error={name:e.name,code:e.code||null};process.exitCode=1;})
.finally(()=>{fs.writeFileSync('docs/chatbot/stage0-2026-10-28/api-read-baseline.txt',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,local:report.localSummary,production:report.productionSummary,sameReadPayload:report.sameReadPayload,error:report.error}));});
