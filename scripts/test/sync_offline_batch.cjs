// Explicit offline allowlist. Never invokes Cloud fixture scripts or deployment.
const {spawnSync}=require('node:child_process'),fs=require('node:fs');
const browser=['user_support_sync_ui.cjs','user_booking_detail_actor_ui.cjs','user_order_detail_actor_ui.cjs','user_orders_actor_ui.cjs','user_return_detail_ui.cjs','user_notification_modal_ui.cjs','admin_chat_realtime_egress_ui.cjs','admin_chat_inbox_ui.cjs','chatbot_business_ui.cjs'];
const nodeTests=['header_notifications.test.js','notification_sync.test.cjs','loyalty_sync.test.mjs','return_resolution.test.cjs','booking_time.test.mjs','customer_booking_read.test.mjs','checkout_request.test.mjs','test_customer_support.cjs','customer_auth.test.js','chat_sla_display.test.cjs'];
const results=[];
function run(name,args){const result=spawnSync(process.execPath,args,{encoding:'utf8',timeout:90000});const status=result.status===0?'PASS':'FAIL';console.log(status,name);results.push({name,status,exitCode:result.status,output:(result.stdout||'')+(result.stderr||'')});if(status==='FAIL')process.exitCode=1;}
for(const file of browser)run(file,['scripts/test/'+file]);
run('Node regressions',['--test','--test-reporter=tap',...nodeTests.map(file=>'scripts/test/'+file)]);
run('Copilot business',['scripts/test/admin_copilot_business.cjs']);
run('Loyalty service',['scripts/test/test_customer_loyalty.cjs']);
fs.writeFileSync('docs/verification/sync/offline-batch.txt',JSON.stringify({timestamp:new Date().toISOString(),scope:'Offline mock transport/browser/Node only; no Cloud fixtures, Logs, deployment or E2E acceptance',status:results.every(r=>r.status==='PASS')?'PASS':'FAIL',results},null,2)+'\n');
