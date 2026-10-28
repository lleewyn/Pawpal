// Committed local-only fixtures; SQL claims are not HTTP Auth proof.
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{execFile}=require('node:child_process');
if(!process.argv.includes('--local-fixtures')){console.log('No connection. Pass --local-fixtures for isolated test DB.');process.exit(0);}
const out='docs/chatbot/stage1-points-tickets-2026-10-28',env=JSON.parse(fs.readFileSync(out+'/local-environment.txt','utf8'));
if(env.status!=='READY'||!/^pawpal_chatbot_g0_[a-f0-9]{12}$/.test(env.database))throw Error('invalid_test_environment');
const uid=()=>crypto.randomUUID(),x=Object.fromEntries(['u','u2','c','c2','s','s2','chat','chat2','guest','policy','disabled','approval','order','otherOrder','ticket','reward'].map(k=>[k,uid()]));
const report={capturedAt:new Date().toISOString(),scope:'Local marker-owned clone, committed SQL transactions/role claims; no Cloud, real customer, AI or HTTP/UI',checks:[],maxConnections:0,transactions:0};let running=0;
function q(sql,actor){return new Promise(resolve=>{running++;report.maxConnections=Math.max(report.maxConnections,running);report.transactions++;
 const child=execFile('docker',['exec','-i','supabase-db','psql','-U','supabase_admin','-d',env.database,'-X','-q','-A','-t','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose','-f','-'],{windowsHide:true,timeout:15000,maxBuffer:1024*1024},(err,stdout,stderr)=>{running--;resolve({ok:!err,text:stdout.trim(),code:stderr?.match(/ERROR:\s+([A-Z0-9]{5}):/)?.[1],diagnostic:stderr?.split('\n').find(l=>l.includes('ERROR:'))?.slice(0,180)});});
 child.stdin.end(`BEGIN;SET LOCAL statement_timeout='5s';SET LOCAL lock_timeout='3s';${actor?`SET LOCAL request.jwt.claim.sub='${actor}'; SET LOCAL request.jwt.claim.role='authenticated';SET LOCAL ROLE authenticated;`:''}${sql};COMMIT;`);
});}
async function good(sql,actor){const r=await q(sql,actor);if(!r.ok)throw Object.assign(Error('sql_failed'),{code:r.code,diagnostic:r.diagnostic});return r.text?JSON.parse(r.text):null;}
async function denied(sql,actor,codes){const r=await q(sql,actor);assert.equal(r.ok,false);assert.ok(codes.includes(r.code),'Unexpected SQLSTATE '+r.code);}
const pass=name=>{report.checks.push({name,status:'PASS'});console.log('PASS '+name);};
const version=chat=>good(`SELECT to_json(updated_at::text) FROM public.chat_conversation WHERE id='${chat}'`);
const points=(req,rev,amount=5,policy=x.policy,chat=x.chat)=>`SELECT public.adjust_admin_chat_points('${req}','${chat}','${rev}'::timestamptz,'${policy}',${amount})`;
const ticket=(req,rev,order=x.order,subject='QA ticket',chat=x.chat)=>`SELECT to_json(public.create_chat_complaint('${req}','${chat}','${rev}'::timestamptz,${order?`'${order}'`:'NULL'},'order','${subject}','normal'))`;
const balance=()=>good(`SELECT json_build_object('a',coalesce(sum(points) FILTER(WHERE customer_id='${x.c}'),0),'b',coalesce(sum(points) FILTER(WHERE customer_id='${x.c2}'),0),'rows',count(*)) FROM public.paw_point_transaction WHERE customer_id IN ('${x.c}','${x.c2}')`);
(async()=>{
 assert.equal(await good(`SELECT to_json(shobj_description(oid,'pg_database')) FROM pg_database WHERE datname=current_database()`),env.ownerMarker);
 await good(`INSERT INTO auth.users(id) VALUES('${x.u}'),('${x.u2}');
 INSERT INTO public.customer(id,customer_code) VALUES('${x.c}','G1-${x.c}'),('${x.c2}','G1-${x.c2}');
 INSERT INTO public.staff(id,auth_user_id,full_name,job_title,employment_status,must_change_password) VALUES('${x.s}','${x.u}','QA points actor','QA','active',false),('${x.s2}','${x.u2}','QA other actor','QA','active',false);
 INSERT INTO public.staff_role(staff_id,role_code) VALUES('${x.s}','ADMIN'),('${x.s2}','ADMIN');
 INSERT INTO public.chat_conversation(id,customer_id,status,assigned_staff_id,channel,sentiment_level,sentiment_trend) VALUES('${x.chat}','${x.c}','agent_handling','${x.s}','web',2,'stable'),('${x.chat2}','${x.c2}','agent_handling','${x.s}','web',2,'stable');
 INSERT INTO public.chatbot_compensation_policy(id,issue_type,max_points,max_discount_vnd,approval_required,description,is_active) VALUES
 ('${x.policy}','QA bounded reward',10,0,false,'QA local',true),('${x.disabled}','QA inactive',10,0,false,'QA local',false),('${x.approval}','QA needs approval',10,0,true,'QA local',true);
 INSERT INTO public.sales_order(id,order_code,customer_id) VALUES('${x.order}','QA-${x.order}','${x.c}'),('${x.otherOrder}','QA-${x.otherOrder}','${x.c2}');`);
 const rev=await version(x.chat),before=await balance();assert.equal(before.rows,0);
 await denied(points(uid(),rev,11),x.u,['42501']);await denied(points(uid(),rev,5,x.disabled),x.u,['42501']);await denied(points(uid(),rev,5,x.approval),x.u,['42501']);
 await denied(points(uid(),rev,0),x.u,['22023']);await denied(points(uid(),'2000-01-01T00:00:00Z'),x.u,['PT409']);await denied(points(uid(),rev),x.u2,['42501']);assert.deepEqual(await balance(),before);pass('Policy limit/inactive/approval/zero/stale/non-owner denied without balance change');
 const pair=await Promise.all([q(points(x.reward,rev),x.u),q(points(x.reward,rev),x.u)]);assert.ok(pair.every(r=>r.ok));assert.equal(JSON.parse(pair[0].text).id,JSON.parse(pair[1].text).id);
 assert.deepEqual(await balance(),{a:5,b:0,rows:1});const rewardId=JSON.parse(pair[0].text).id;
 const audits=await good(`SELECT json_build_object('operation',count(*) FILTER(WHERE action='CREATE'),'ledger',count(*) FILTER(WHERE action='INSERT')) FROM public.audit_log WHERE entity_id='${rewardId}' AND entity_name='paw_point_transaction'`);assert.deepEqual(audits,{operation:1,ledger:1});pass('Concurrent reward retry adds five points once with one operation audit and one ledger-trigger audit');
 await denied(points(x.reward,rev,6),x.u,['PT409']);await denied(points(x.reward,await version(x.chat2),5,x.policy,x.chat2),x.u,['PT409']);assert.deepEqual(await balance(),{a:5,b:0,rows:1});pass('Changed reward payload/customer with same request ID conflicts and keeps balances');
 const tr=await version(x.chat);
 await denied(ticket(uid(),tr,x.otherOrder),x.u,['22023']);await denied(ticket(uid(),'2000-01-01T00:00:00Z'),x.u,['PT409']);await denied(ticket(uid(),tr),x.u2,['42501']);pass('Ticket rejects another customer order, stale revision and unassigned staff');
 const tickets=await Promise.all([q(ticket(x.ticket,tr),x.u),q(ticket(x.ticket,tr),x.u)]);assert.ok(tickets.every(r=>r.ok));
 const result=await good(`SELECT json_build_object('customer',customer_id='${x.c}','order',order_id='${x.order}','source',strpos(description,'${x.chat}')>0,'messages',(SELECT count(*) FROM public.support_ticket_message WHERE ticket_id='${x.ticket}'),'audits',(SELECT count(*) FROM public.audit_log WHERE entity_id='${x.ticket}' AND action='CREATE_ADMIN_COMPLAINT')) FROM public.support_ticket WHERE id='${x.ticket}'`);
 assert.deepEqual(result,{customer:true,order:true,source:true,messages:1,audits:1});pass('Concurrent ticket retry saves one ticket/message/audit linked to correct customer/order/chat');
 await denied(ticket(x.ticket,tr,x.order,'QA changed subject'),x.u,['PT409']);assert.equal(await good(`SELECT to_json(count(*)) FROM public.support_ticket WHERE id='${x.ticket}'`),1);pass('Changed ticket replay cannot overwrite original');
 await good(`DELETE FROM public.staff_role WHERE staff_id='${x.s2}'; INSERT INTO public.staff_permission(staff_id,permission_code) VALUES('${x.s2}','chat_conversation.read'),('${x.s2}','chat_conversation.write');
 UPDATE public.chat_conversation SET assigned_staff_id='${x.s2}',updated_at=clock_timestamp() WHERE id='${x.chat2}';`);
 const otherRev=await version(x.chat2);await denied(points(uid(),otherRev,5,x.policy,x.chat2),x.u2,['42501']);await denied(ticket(uid(),otherRev,x.otherOrder,'QA limited',x.chat2),x.u2,['42501']);pass('Assigned staff with chat rights but missing ledger/ticket permissions cannot mutate either');
 await good(`UPDATE public.chat_conversation SET status='resolved',updated_at=clock_timestamp() WHERE id='${x.chat}'`);const closed=await version(x.chat);
 await denied(points(uid(),closed),x.u,['42501']);await denied(ticket(uid(),closed),x.u,['42501']);assert.deepEqual(await balance(),{a:5,b:0,rows:1});pass('Closed chat cannot award points or create a fresh ticket');
 report.status='PASS';
})().catch(e=>{report.status='INCOMPLETE';report.error={name:e.name,code:e.code||null,diagnostic:e.diagnostic||e.message?.slice(0,180)};process.exitCode=1;})
.finally(()=>{fs.writeFileSync(out+'/points-tickets-results.txt',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,checks:report.checks.length,maxConnections:report.maxConnections,error:report.error}));});
