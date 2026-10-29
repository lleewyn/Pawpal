const {test}=require('node:test'),assert=require('node:assert/strict'),{plan,contextualPlan,answer}=require('../api/admin_copilot.js'),{definitions,prepare,createReadBudget}=require('../api/chat_read_tools.js');
const now=new Date('2026-10-28T03:00:00Z'),lease='10000000-0000-4000-8000-000000000001';
test('all legacy list tools expose validated pages without changing their intent',async()=>{
 for(const [q,intent]of [['Sản phẩm: SKU-VIET trang 2','catalog.product'],['Khách hàng: CUS-001 trang 2','customer.lookup'],['Đơn hàng: ORD-001 trang 2','order.lookup'],['Tồn kho dưới ngưỡng trang 2','inventory.low_stock'],['Khiếu nại chưa xử lý trang 2','ticket.open'],['Lịch Spa hôm nay trang 2','appointment.list'],['Dịch vụ: tắm trang 2','catalog.service'],['Giá dịch vụ Spa trang 2','catalog.service_price']]){
  const p=plan(q,now);assert.equal(p.intent,intent);assert.equal(p.filters.page,'2');const t=definitions[intent],permissions=[...t.permissions,'service_price_matrix.read','taxi_price_rule.read','hotel_room_type.read'];const read=prepare(intent,p.filters,permissions);assert.equal(read.rowLimit,10);assert.ok(!String(p.filters.query).includes('trang 2'));assert.throws(()=>prepare(intent,{...p.filters,page:'10001'},permissions));
  await assert.rejects(()=>createReadBudget().run({rpc:()=>assert.fail('must not bypass lease')},read),e=>e.code==='42501');
 }
 assert.equal(contextualPlan('trang 2',[{role:'user',content:'Sản phẩm: SKU-001'}],now).intent,'catalog.product');
 assert.equal(plan('Hoàn tiền cho khách trang 2',now).intent,'refuse.write');
});
test('drafts in A/B/C receive scoped facts with labels and no implicit write',async()=>{
 for(const [question,intent]of [['Soạn tin về đơn hàng: ORD-VIET','order.lookup'],['Soạn thông báo Pawpoint: CUS-001','points.lookup'],['Soạn thông báo lịch trực tuần này','staff.schedule']]){
  const permissions=definitions[intent].permissions,calls=[],data={intent,total:1,items:[{code:'QA',balance:7}],scope:{},source:'Supabase scoped',as_of:now.toISOString()};let model=0;
  const r=await answer({question,now,staff:{permissions},readBudget:createReadBudget({lease}),caller:{rpc:async(name,args)=>{calls.push({name,args});return {data};}},generateReply:async(q,context)=>{model++;assert.equal(context.facts,data);assert.ok(context.limitations.some(x=>x.includes('một trang')));return 'Nội dung cần kiểm tra.';}});
  assert.equal(model,1);assert.equal(calls.length,1);assert.match(r.reply,/Bản nháp AI/);assert.match(r.source,/Supabase scoped/);assert.equal(r.as_of,now.toISOString());
  if(intent==='order.lookup')assert.equal(calls[0].args.p_filters.query,'ORD-VIET');
 }
});
test('drafts cannot invent facts when permission, source, entity or lookup is missing',async()=>{
 const intent='points.lookup',question='Soạn thông báo Pawpoint: CUS-001',base={question,now,readBudget:createReadBudget({lease}),generateReply:()=>assert.fail('must not generate')};
 await assert.rejects(()=>answer({...base,staff:{permissions:[]},caller:{rpc:()=>assert.fail('must deny before DB')}}),e=>e.code==='42501');
 const missing=await answer({...base,question:'Soạn thông báo Pawpoint',staff:{permissions:definitions[intent].permissions},caller:{rpc:()=>assert.fail('must clarify first')}});assert.match(missing.reply,/cung cấp mã/);
 for(const total of [0,2]){const r=await answer({...base,readBudget:createReadBudget({lease}),staff:{permissions:definitions[intent].permissions},caller:{rpc:async()=>({data:{intent,total,items:total?[{code:'a',balance:1},{code:'b',balance:2}]:[],scope:{}}})}});assert.match(r.reply,total?/mã chính xác/:/Chưa có dữ liệu/);}
 await assert.rejects(()=>answer({...base,readBudget:createReadBudget({lease}),staff:{permissions:definitions[intent].permissions},caller:{rpc:async()=>({error:{code:'57014'}})}}),e=>e.code==='57014');
});
test('guidance combines authorized facts and active FAQ; no FAQ means no model claim',async()=>{
 const permissions=[...definitions['order.lookup'].permissions,'chatbot_knowledge_faq.read'];let model=0;
 for(const hasFaq of [false,true]){const r=await answer({question:'Hướng dẫn xử lý đơn hàng: ORD-001',now,staff:{permissions},readBudget:createReadBudget({lease}),caller:{rpc:async(name,args)=>({data:args.p_tool==='order.lookup'?{intent:'order.lookup',total:1,items:[{code:'ORD-001'}],source:'sales_order',scope:{}}:{intent:'knowledge.search',total:hasFaq?1:0,items:hasFaq?[{question:'Quy trình',answer:'Nội dung được duyệt'}]:[],scope:{}}})},generateReply:async(q,c)=>{model++;assert.equal(c.facts.items[0].code,'ORD-001');assert.equal(c.faq.length,1);return 'Hướng dẫn cần kiểm tra.';}});assert.match(r.reply,hasFaq?/Hướng dẫn tham khảo/:/Chưa có hướng dẫn/);assert.equal(r.resource_usage?.calls||2,2);}
 assert.equal(model,1);
});
test('guidance reserves FAQ within the three-source budget when private history is already read',async()=>{
 const budget=createReadBudget({lease}),permissions=[...definitions['order.lookup'].permissions,'chatbot_knowledge_faq.read','admin_copilot_history.read','chat_conversation.read','chat_message.read'];
 await budget.run({rpc:async()=>({data:[]})},prepare('history.context',{sessionId:lease},permissions));
 let generated=0;const r=await answer({question:'Hướng dẫn xử lý đơn hàng: ORD-001',now,conversationId:lease,staff:{permissions},readBudget:budget,caller:{rpc:async(name,args)=>{assert.notEqual(args.p_tool,'conversation.context');return {data:args.p_tool==='order.lookup'?{intent:'order.lookup',total:1,items:[{code:'ORD-001'}],scope:{}}:{intent:'knowledge.search',total:1,items:[{question:'Quy trình',answer:'Đã duyệt'}],scope:{}}};}},generateReply:async(q,c)=>{generated++;assert.ok(c.limitations.some(x=>x.includes('chưa đối chiếu nội dung hội thoại')));return 'Hướng dẫn có nguồn.';}});
 assert.equal(generated,1);assert.equal(r.resource_usage.calls,3);
});
test('refund-only revenue remains valid draft evidence when there are zero collections',async()=>{
 const data={intent:'revenue.summary',total:0,items:[],collected:0,refunded:50,net:-50,scope:{},as_of:now.toISOString()};let generated=0;
 await answer({question:'Soạn báo cáo thực thu hôm nay',now,staff:{permissions:definitions['revenue.summary'].permissions},readBudget:createReadBudget({lease}),caller:{rpc:async()=>({data})},generateReply:async(q,c)=>{generated++;assert.equal(c.facts.net,-50);return 'Bản nháp cần kiểm tra.';}});assert.equal(generated,1);
});
