const {test}=require('node:test'),assert=require('node:assert/strict');
const {plan,answer}=require('../api/admin_copilot.js'),{planComparison}=require('../api/chat_stage4_compare.js'),{createReadBudget,prepare}=require('../api/chat_read_tools.js');
const now=new Date('2026-10-29T03:00:00Z'),lease='10000000-0000-4000-8000-000000000001',permissions=['payment.read','refund_transaction.read'];
function source(filters,collected=100,refunded=20){return {intent:'revenue.summary',total:1,items:[],collected,refunded,net:collected-refunded,scope:filters,source:'payment, refund_transaction',as_of:now.toISOString()};}
async function invoke({question='Tuần này thực thu so tuần trước?',rights=permissions,readBudget=createReadBudget({lease}),run}={}){
 const calls=[];const result=await answer({question,now,staff:{permissions:rights},readBudget,caller:{rpc:async(name,args)=>{calls.push({name,args});return run?run(args.p_filters,calls.length):{data:source(args.p_filters,calls.length===1?200:100,20)};}},generateReply:()=>assert.fail('comparison never uses a model')});return {result,calls};
}
test('comparison uses Monday Vietnam weeks and equal elapsed periods, not a full previous week',()=>{
 const r=plan('Tuần này thực thu so tuần trước?',now);assert.equal(r.intent,'revenue.compare');
 assert.deepEqual(r.filters.current,{start_at:'2026-10-25T17:00:00.000Z',end_at:now.toISOString()});
 assert.deepEqual(r.filters.previous,{start_at:'2026-10-18T17:00:00.000Z',end_at:'2026-10-22T03:00:00.000Z'});
 for(const q of ['Thực thu tuần này so với tuần trước','So sánh thực thu tuần này với tuần trước','Tuan nay thuc thu so tuan truoc'])assert.deepEqual(plan(q,now),r);
});
test('capabilities describe the new comparison without reading any source',async()=>{
 const r=await answer({question:'Bạn làm được gì?',staff:{permissions:[]},caller:{rpc:()=>assert.fail('no preload')},generateReply:()=>assert.fail('no model')});assert.match(r.reply,/So sánh thực thu ngày\/tuần\/tháng/);
});
test('day/month boundaries and shorter previous months are explicit',()=>{
 const day=planComparison('Thực thu hôm nay so hôm qua',now);assert.equal(day.filters.current.start_at,'2026-10-28T17:00:00.000Z');assert.equal(day.filters.previous.end_at,'2026-10-28T03:00:00.000Z');
 const month=planComparison('Thực thu tháng này so tháng trước',new Date('2026-03-31T03:00:00Z'));assert.equal(month.filters.previous.start_at,'2026-01-31T17:00:00.000Z');assert.equal(month.filters.previous.end_at,'2026-02-28T17:00:00.000Z');assert.equal(month.filters.previous_capped,true);
 assert.equal(planComparison('Thực thu hôm nay so hôm qua',new Date('2026-10-28T17:00:00Z')).intent,'clarify');
});
test('unsupported metrics, periods or extra filters clarify instead of silently comparing global data',async()=>{
 for(const question of ['Doanh thu tuần này so tuần trước','Lợi nhuận tuần này so tuần trước','Thực thu tuần này so tháng trước','Thực thu tuần này so tuần trước theo chi nhánh','Thực thu từ 01/01/2026 đến 01/02/2026 so kỳ trước']){
  const r=await answer({question,now,staff:{permissions},caller:{rpc:()=>assert.fail('clarify before DB')},generateReply:()=>assert.fail('no model')});assert.equal(r.answer_type,'clarify',question);
 }
 assert.equal(plan('Thực thu hôm nay',now).intent,'revenue.summary');
});
test('two fixed authorized source reads calculate delta and percent, with no joined-row counting or model',async()=>{
 const {result:r,calls}=await invoke();assert.equal(calls.length,2);for(const c of calls){assert.equal(c.name,'run_admin_chat_read');assert.equal(c.args.p_tool,'revenue.summary');}
 assert.equal(r.facts.current.net,180);assert.equal(r.facts.previous.net,80);assert.equal(r.facts.delta,100);assert.equal(r.facts.percent,125);assert.equal(r.partial,false);assert.equal(r.resource_usage.calls,2);assert.match(r.reply,/\+125%/);
});
test('both financial permissions are required before either source runs',async()=>{for(const permission of permissions)await assert.rejects(()=>invoke({rights:permissions.filter(p=>p!==permission),run:()=>assert.fail('no RPC')}),e=>e.code==='42501');});
test('zero and negative previous net never create a misleading percentage',async()=>{
 for(const [collected,refunded]of [[0,0],[10,20]]){const {result:r}=await invoke({run:(filters,index)=>({data:source(filters,index===1?100:collected,index===1?20:refunded)})});assert.equal(r.facts.percent,null);assert.ok(r.limitations.some(l=>l.includes('Không tính tỷ lệ')));assert.ok(Number.isFinite(r.facts.delta));}
});
test('one source unavailable returns labeled partial data without delta or invented zero',async()=>{
 for(const code of ['57014','42501','54000']){const {result:r}=await invoke({run:(filters,index)=>index===2?{error:{code}}:{data:source(filters)}});assert.equal(r.partial,true);assert.equal(r.facts.previous,null);assert.equal(r.facts.delta,null);assert.equal(r.facts.percent,null);assert.match(r.reply,/không coi là bằng 0/);assert.doesNotMatch(r.reply,/Chênh lệch thực thu:/);}
});
test('both source failures stay errors, malformed facts and wrong scopes cannot enter a comparison',async()=>{
 await assert.rejects(()=>invoke({run:()=>({error:{code:'57014'}})}),e=>e.code==='57014');
 for(const mutate of [d=>({...d,net:999}),d=>({...d,scope:{}}),d=>({...d,as_of:null}),d=>({...d,collected:-1,net:-21})]){const {result:r}=await invoke({run:(filters,index)=>({data:index===2?mutate(source(filters)):source(filters)})});assert.equal(r.partial,true);assert.equal(r.facts.previous,null);}
});
test('comparison fits the three-source budget when one private history source was already read',async()=>{
 const budget=createReadBudget({lease});await budget.run({rpc:async()=>({data:[]})},prepare('history.context',{sessionId:lease},['admin_copilot_history.read']));const {result:r}=await invoke({readBudget:budget});assert.equal(r.resource_usage.calls,3);assert.equal(r.partial,false);
});

test('API admits once, runs at most two sources concurrently, saves complete/partial replies and releases',async()=>{
 const {createHandler}=require('../../api/admin-chat.js'),{randomUUID}=require('node:crypto');
 for(const mode of ['complete','partial','failed']){
  let reads=0,saves=0,releases=0,active=0,maximum=0;
  const caller={rpc:async(name,args)=>{
   if(name==='acquire_admin_chat_read')return {data:lease};if(name==='release_admin_chat_read'){releases++;return {data:null};}
   assert.equal(name,'run_admin_chat_read');assert.equal(args.p_tool,'revenue.summary');assert.equal(args.p_lease,lease);
   const index=++reads;active++;maximum=Math.max(maximum,active);await new Promise(resolve=>setTimeout(resolve,5));active--;
   return mode==='failed'||mode==='partial'&&index===2?{error:{code:'57014'}}:{data:source(args.p_filters)};
  }};
  const service={from(){const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:null})};return q;},rpc:async(name,args)=>{assert.equal(name,'save_admin_copilot_exchange');saves++;return {data:args.p_answer};}};
  const handler=createHandler({verify:async()=>({authorized:true,staff:{id:randomUUID(),permissions:[...permissions,'admin_copilot_history.read','admin_copilot_history.write']},user:{id:randomUUID()},caller}),serviceClient:service,generateReply:()=>assert.fail('no model')});
  const res={statusCode:200,setHeader(){},status(n){this.statusCode=n;return this;},json(value){this.data=value;return this;}};
  await handler({method:'POST',headers:{},body:{sessionId:randomUUID(),requestId:randomUUID(),question:'Tuần này thực thu so tuần trước?'}},res);
  assert.equal(reads,2);assert.equal(maximum,2);assert.equal(releases,1);
  if(mode==='failed'){assert.equal(res.statusCode,504);assert.equal(res.data.ok,false);assert.equal(saves,0);}
  else{assert.equal(res.statusCode,200);assert.equal(res.data.ok,true);assert.equal(res.data.partial,mode==='partial');assert.equal(saves,1);assert.equal(res.data.resource_usage.calls,2);}
 }
});
