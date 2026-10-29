const {test}=require('node:test'),assert=require('node:assert/strict');
const {answer}=require('../api/admin_copilot.js');
const {createReadBudget,prepare,definitions}=require('../api/chat_read_tools.js');
const lease='11111111-1111-4111-8111-111111111111',now=new Date('2026-10-29T03:00:00Z');
const facts={intent:'order.lookup',total:1,items:[{code:'ORD-001',status:'pending'}],scope:{query:'ORD-001'},source:'sales_order',as_of:now.toISOString(),limitations:['Chỉ có trang dữ liệu hiện tại.']};
const permissions=[...definitions['order.lookup'].permissions,'chatbot_knowledge_faq.read'];
function options(question,generateReply,readBudget=createReadBudget({lease})){
 const calls=[];
 return {calls,args:{question,now,staff:{permissions},readBudget,caller:{rpc:async(name,args)=>{
  calls.push(args.p_tool);return {data:args.p_tool==='order.lookup'?facts:{intent:'knowledge.search',total:1,items:[{question:'Quy trình',answer:'Nội dung FAQ để đối chiếu.'}]}};
 }},generateReply}};
}

test('known AI outages retain authorized facts and module link with no retry or reread',async()=>{
 for(const message of ['ai_unconfigured','ai_environment_key_unavailable','ai_key_pool_unavailable','ai_key_pool_exhausted']){
  for(const question of ['Soạn tin về đơn hàng: ORD-001','Hướng dẫn xử lý đơn hàng: ORD-001']){
   let generations=0;const {calls,args}=options(question,async()=>{generations++;throw Error(message);});
   const r=await answer(args);
   assert.equal(generations,1);assert.equal(calls.filter(x=>x==='order.lookup').length,1);
   assert.equal(r.resource_usage.calls,calls.length);assert.equal(calls.length,question.startsWith('Soạn')?1:2);
   assert.equal(r.facts,facts);assert.equal(r.source,facts.source);assert.equal(r.as_of,facts.as_of);
   assert.deepEqual(r.scope,facts.scope);assert.deepEqual(r.plan.filters,facts.scope);
   assert.deepEqual(r.continuation,{type:'open_module',href:'#tab-order-list'});
   assert.match(r.reply,/ORD-001/);assert.match(r.reply,/Không tạo được nội dung AI/);
   assert.doesNotMatch(r.reply,/\*\*Bản nháp AI|\*\*Hướng dẫn tham khảo/);
   assert.ok(r.limitations.includes(facts.limitations[0]));assert.ok(!r.reply.includes(message));
  }
 }
});

test('malformed generated drafts are discarded while preserving validated facts',async()=>{
 for(const invalid of [null,'',' '.repeat(5),'x'.repeat(16001),'Bản nháp AI\nPhạm vi: không có nội dung']){
  const {args}=options('Soạn tin về đơn hàng: ORD-001',async()=>invalid);
  const r=await answer(args);assert.match(r.reply,/Không tạo được nội dung AI/);assert.equal(r.facts,facts);
  assert.ok(r.reply.length<16000);
 }
});

test('AI failure without business facts, rejection, coded errors and unexpected failures still propagate',async()=>{
 const messages=['ai_request_rejected','private unexpected failure'];
 for(const message of messages){const error=Error(message),{args}=options('Soạn tin về đơn hàng: ORD-001',async()=>{throw error;});await assert.rejects(()=>answer(args),e=>e===error);}
 const coded=Object.assign(Error('ai_key_pool_unavailable'),{code:'42501'}),{args}=options('Soạn tin về đơn hàng: ORD-001',async()=>{throw coded;});await assert.rejects(()=>answer(args),e=>e===coded);
 const error=Error('ai_key_pool_exhausted'),withoutFacts=options('Đặt lịch PawPal như thế nào?',async()=>{throw error;});
 await assert.rejects(()=>answer(withoutFacts.args),e=>e===error);
});

test('fallback reuses facts within the three-source budget after reading private history',async()=>{
 const budget=createReadBudget({lease});await budget.run({rpc:async()=>({data:[]})},prepare('history.context',{sessionId:lease},['admin_copilot_history.read']));
 const {args}=options('Hướng dẫn xử lý đơn hàng: ORD-001',async()=>{throw Error('ai_key_pool_exhausted');},budget);
 const r=await answer(args);assert.equal(r.resource_usage.calls,3);assert.equal(r.facts,facts);
});

test('API saves deterministic fallback once and releases lease; persistence failure remains an error',async()=>{
 const {createHandler}=require('../../api/admin-chat.js'),{randomUUID}=require('node:crypto');
 for(const saveError of [false,true]){
  const events=[],staffId=randomUUID();let saved;
  const caller={rpc:async(name,args)=>{
   if(name==='acquire_admin_chat_read'){events.push('acquire');return {data:lease};}
   if(name==='release_admin_chat_read'){events.push('release');return {data:null};}
   assert.equal(name,'run_admin_chat_read');assert.equal(args.p_lease,lease);events.push(args.p_tool);
   return {data:args.p_tool==='history.context'?[]:facts};
  }};
  const service={from(){const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:null})};return q;},rpc:async(name,args)=>{
   assert.equal(name,'save_admin_copilot_exchange');events.push('save');saved=args.p_answer;
   return saveError?{error:{code:'58000'}}:{data:args.p_answer};
  }};
  const handler=createHandler({verify:async()=>({authorized:true,staff:{id:staffId,permissions:[...permissions,'admin_copilot_history.read','admin_copilot_history.write']},user:{id:randomUUID()},caller}),serviceClient:service,generateReply:async()=>{events.push('model');throw Error('ai_key_pool_exhausted');}});
  const res={statusCode:200,setHeader(){},status(n){this.statusCode=n;return this;},json(data){this.data=data;return this;}};
  await handler({method:'POST',headers:{},body:{sessionId:randomUUID(),requestId:randomUUID(),question:'Soạn tin về đơn hàng: ORD-001'}},res);
  assert.deepEqual(events,['acquire','history.context','order.lookup','model','save','release']);
  assert.match(saved,/Không tạo được nội dung AI/);
  if(saveError){assert.equal(res.statusCode,503);assert.equal(res.data.ok,false);}
  else{assert.equal(res.data.ok,true);assert.equal(res.data.reply,saved);assert.equal(res.data.resource_usage.calls,2);}
 }
});
