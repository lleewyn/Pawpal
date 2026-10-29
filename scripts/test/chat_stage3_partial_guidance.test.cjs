const {test}=require('node:test'),assert=require('node:assert/strict');
const {answer}=require('../api/admin_copilot.js');
const {definitions,createReadBudget,prepare}=require('../api/chat_read_tools.js');
const lease='11111111-1111-4111-8111-111111111111',now=new Date('2026-10-29T03:00:00Z');
const question='Hướng dẫn xử lý đơn hàng: ORD-001';
const facts={intent:'order.lookup',total:1,items:[{code:'ORD-001',status:'pending'}],scope:{query:'ORD-001'},source:'sales_order',as_of:now.toISOString()};
const permissions=[...definitions['order.lookup'].permissions,'chatbot_knowledge_faq.read'];

test('missing or blank FAQ preserves scoped facts and a registered module link without generation',async()=>{
 for(const items of [[],[{question:'Quy trình',answer:' '}]] ){
  const calls=[];
  const r=await answer({question,now,staff:{permissions},readBudget:createReadBudget({lease}),caller:{rpc:async(name,args)=>{
   calls.push(args.p_tool);return {data:args.p_tool==='order.lookup'?facts:{intent:'knowledge.search',total:items.length,items,source:'chatbot_knowledge_faq',as_of:'2026-10-29T04:00:00Z'}};
  }},generateReply:()=>assert.fail('no FAQ means no model')});
  assert.deepEqual(calls,['order.lookup','knowledge.search']);assert.equal(r.resource_usage.calls,2);
  assert.equal(r.facts,facts);assert.match(r.reply,/ORD-001/);assert.match(r.reply,/Chưa có hướng dẫn/);
  assert.match(r.reply,/chưa đủ nguồn để hướng dẫn/iu);assert.equal(r.source,'sales_order');assert.equal(r.as_of,facts.as_of);
  assert.deepEqual(r.continuation,{type:'open_module',href:'#tab-order-list'});assert.equal(r.limitations.length,1);
 }
});

test('partial guidance stays within three reads when private history already consumed one source',async()=>{
 const budget=createReadBudget({lease}),rights=[...permissions,'admin_copilot_history.read'];
 await budget.run({rpc:async()=>({data:[]})},prepare('history.context',{sessionId:lease},rights));
 const r=await answer({question,now,staff:{permissions:rights},readBudget:budget,caller:{rpc:async(name,args)=>({data:args.p_tool==='order.lookup'?facts:{intent:'knowledge.search',total:0,items:[]}})},generateReply:()=>assert.fail('must not generate')});
 assert.equal(r.resource_usage.calls,3);assert.match(r.reply,/ORD-001/);
});

test('source-free guidance points to authorized FAQ module without inventing business facts',async()=>{
 const r=await answer({question:'Đặt lịch PawPal như thế nào?',staff:{permissions:['chatbot_knowledge_faq.read']},caller:{rpc:async()=>({data:{intent:'knowledge.search',total:0,items:[]}})},generateReply:()=>assert.fail('must not generate')});
 assert.equal(r.facts,null);assert.equal(r.resource_usage.calls,1);
 assert.deepEqual(r.continuation,{type:'open_module',href:'#tab-chatbot-rules'});
 assert.doesNotMatch(r.reply,/Dữ liệu đã tra cứu/);
});

test('permissions and failed FAQ reads cannot become partial successful guidance',async()=>{
 for(const code of ['42501','57014']){
  let reads=0;
  await assert.rejects(()=>answer({question,now,staff:{permissions},readBudget:createReadBudget({lease}),caller:{rpc:async(name,args)=>{reads++;return args.p_tool==='order.lookup'?{data:facts}:{error:{code}};}},generateReply:()=>assert.fail('must not generate')}),e=>e.code===code);
  assert.equal(reads,2);
 }
 await assert.rejects(()=>answer({question,now,staff:{permissions:['chatbot_knowledge_faq.read']},caller:{rpc:()=>assert.fail('permission before source')},generateReply:()=>assert.fail('must not generate')}),e=>e.code==='42501');
});
