// Stage 0 audit only. No migrations, writes, AI calls, Logs or business content exports.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const out='docs/chatbot/stage0-2026-10-28';fs.mkdirSync(out,{recursive:true});
const hash=v=>crypto.createHash('sha256').update(v).digest('hex');
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',windowsHide:true}).trim();
const files=['server.js','vercel.json','api/chat.js','api/admin-chat.js','scripts/api/admin_copilot.js','scripts/api/staff_auth.js','scripts/api/chat_moderation.js','scripts/api/chat_understanding.js','components/fab/fab.js','pages/admin/modules/chatbot/chatbot.js','pages/admin/modules/chatbot/subtabs/tab-chatbot-live.js','pages/admin/modules/chatbot/subtabs/tab-chatbot-copilot.js','pages/admin/modules/chatbot/subtabs/tab-chatbot-rules.js'];
const functions=[...new Set(files.flatMap(file=>[...fs.readFileSync(file,'utf8').matchAll(/\.rpc\(\s*['"]([a-z_]+)['"]/g)].map(m=>m[1])).concat(['admin_copilot_facts','admin_copilot_extended_facts','get_staff_login_context','has_permission','set_chat_handoff_sla','reset_unhandled_chat_on_resume']))];
const tables=['chat_conversation','chat_message','chat_feedback','guest_session','admin_copilot_history','chatbot_knowledge_faq','chatbot_profanity_filter','chatbot_sentiment_trigger','chatbot_canned_response','chatbot_compensation_policy','chatbot_handover_rule','chatbot_scenario_matrix','customer','customer_profile','customer_phone','customer_point_balance','customer_membership','pet_profile','appointment','appointment_item','service','service_category','service_price_matrix','taxi_price_rule','hotel_room_type','sales_order','payment','refund_transaction','inventory','product','product_variant','support_ticket','audit_log','staff'];
const result={capturedAt:new Date().toISOString(),branch:git('branch','--show-current'),head:git('rev-parse','HEAD'),initialStatus:git('status','--short'),files:files.map(file=>({file,bytes:fs.statSync(file).size,sha256:hash(fs.readFileSync(file))})),functions,tables};
async function production(){
 const requests=[];
 async function get(url){const start=performance.now();try{const r=await fetch(url,{headers:{'User-Agent':'Pawpal-chatbot-stage0-readonly'},signal:AbortSignal.timeout(15000)});const bytes=Buffer.from(await r.arrayBuffer());requests.push({url,status:r.status,bytes:bytes.length,ms:Math.round(performance.now()-start)});return {r,bytes};}catch(e){requests.push({url,error:e.name});return null;}}
 const meta=await get('https://api.github.com/repos/lleewyn/Pawpal/deployments?per_page=5');
 let deploy;if(meta?.r.ok){try{deploy=JSON.parse(meta.bytes).find(d=>d.environment==='Production');}catch{}}
 if(deploy){const status=await get(deploy.statuses_url+'?per_page=1');let latest;try{latest=JSON.parse(status?.bytes||'[]')[0];}catch{}result.production={sha:deploy.sha,created:deploy.created_at,state:latest?.state,url:latest?.environment_url};}
 result.assets=[];
 for(const file of ['components/fab/fab.js','pages/admin/modules/chatbot/chatbot.js','pages/admin/modules/chatbot/subtabs/tab-chatbot-copilot.js']){
  const response=await get('https://pawpalgr3.vercel.app/'+file);if(!response)continue;
  const record={file,status:response.r.status,bytes:response.bytes.length,sha256:hash(response.bytes),matchesLocal:hash(response.bytes)===hash(fs.readFileSync(file))};
  if(deploy)try{const committed=execFileSync('git',['show',deploy.sha+':'+file],{windowsHide:true,stdio:['ignore','pipe','ignore']});record.matchesDeploymentCommit=hash(committed)===hash(response.bytes);}catch{record.commitAvailableLocally=false;}
  result.assets.push(record);
 }
 const api=await get('https://pawpalgr3.vercel.app/api/admin-chat');result.unauthenticatedApiStatus=api?.r.status;
 result.productionRequests=requests;
}
async function cloud(){
 const {connect}=require('../database/v1/service_import_connection.cjs');let db;
 try{
  db=await connect();let calls=0;const query=async(sql,args=[])=>{calls++;return db.query(sql,args);};
  await query('BEGIN READ ONLY');await query("SET LOCAL statement_timeout='5s'");await query("SET LOCAL lock_timeout='1s'");
  const fn=(await query(`SELECT n.nspname schema,p.proname name,pg_get_function_identity_arguments(p.oid) arguments,
   p.prosecdef security_definer,p.provolatile volatility,p.proconfig settings,
   has_function_privilege('anon',p.oid,'EXECUTE') anon_execute,
   has_function_privilege('authenticated',p.oid,'EXECUTE') authenticated_execute,
   has_function_privilege('service_role',p.oid,'EXECUTE') service_execute,
   pg_get_functiondef(p.oid) definition
   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname=ANY(ARRAY['public','pawpal_private']) AND p.proname=ANY($1::text[]) ORDER BY 1,2,3`,[functions])).rows;
  // Definitions remain in a private temp directory, outside the served repository.
  const backup=fs.mkdtempSync(path.join(os.tmpdir(),'pawpal-chatbot-stage0-'));
  fs.writeFileSync(path.join(backup,'functions.sql'),fn.map(r=>r.definition+';').join('\n\n'));
  result.cloud={capturedAt:new Date().toISOString(),target:'cpzuvaplseielhgcnqrn.supabase.co',readOnly:true,privateDefinitionSnapshot:backup,
   functions:fn.map(({definition,...r})=>({...r,definitionSha256:hash(definition),definitionBytes:Buffer.byteLength(definition),permissionLiterals:[...new Set([...definition.matchAll(/has_permission\('([^']+)'\)/g)].map(m=>m[1]))]}))};
  result.cloud.tables=(await query(`SELECT c.relname name,c.relrowsecurity rls,c.relforcerowsecurity force_rls,
    a.attname column,format_type(a.atttypid,a.atttypmod) type
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_attribute a ON a.attrelid=c.oid
    WHERE n.nspname='public' AND c.relname=ANY($1::text[]) AND a.attnum>0 AND NOT a.attisdropped ORDER BY c.relname,a.attnum`,[tables])).rows;
  result.cloud.policies=(await query('SELECT schemaname,tablename,policyname,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname=$1 AND tablename=ANY($2::text[]) ORDER BY tablename,policyname',['public',tables])).rows;
  result.cloud.grants=(await query("SELECT table_name,column_name,grantee,privilege_type FROM information_schema.column_privileges WHERE table_schema='public' AND table_name=ANY($1::text[]) AND grantee=ANY(ARRAY['anon','authenticated','service_role']) ORDER BY 1,2,3,4",[tables])).rows;
  result.cloud.triggers=(await query(`SELECT c.relname table_name,t.tgname name,pg_get_triggerdef(t.oid) definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=ANY($1::text[]) AND NOT t.tgisinternal ORDER BY 1,2`,[tables])).rows;
  result.cloud.constraints=(await query(`SELECT c.relname table_name,co.conname name,pg_get_constraintdef(co.oid) definition FROM pg_constraint co JOIN pg_class c ON c.oid=co.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname=ANY($1::text[]) AND co.contype='c' ORDER BY 1,2`,[tables])).rows;
  result.cloud.realtime=(await query("SELECT pubname,tablename FROM pg_publication_tables WHERE schemaname='public' AND tablename=ANY($1::text[]) ORDER BY 1,2",[tables])).rows;
  result.cloud.indexes=(await query("SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' AND tablename=ANY($1::text[]) ORDER BY 1,2",[tables])).rows;
  // Only rule configuration, no customer IDs, names or conversation content.
  result.cloud.handoffRules=(await query("SELECT trigger_type,sla_seconds,auto_assign_role,is_active FROM public.chatbot_handover_rule WHERE is_active ORDER BY trigger_type LIMIT 20")).rows;
  await query('ROLLBACK');result.cloud.statements=calls;
  const seen=new Set(fn.map(r=>r.name));result.cloud.missingFunctions=functions.filter(n=>!seen.has(n));
 }catch(e){if(db)await db.query('ROLLBACK').catch(()=>{});result.cloudError={name:e.name,code:e.code||'unavailable'};}
 finally{if(db)await db.end();}
}
(async()=>{
 if(process.argv.includes('--production'))await production();
 if(process.argv.includes('--cloud'))await cloud();
 fs.writeFileSync(path.join(out,'inventory.txt'),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({output:out+'/inventory.txt',head:result.head,assets:result.assets?.map(r=>({file:r.file,matchesLocal:r.matchesLocal})),cloudFunctions:result.cloud?.functions.length,cloudStatements:result.cloud?.statements,cloudError:result.cloudError}));
 if(result.cloudError||(process.argv.includes('--production')&&(!result.production||result.assets.length!==3||result.unauthenticatedApiStatus!==401)))process.exitCode=1;
})().catch(e=>{console.error('Stage0 audit failed:',e.name,e.code||'unknown');process.exitCode=1;});
