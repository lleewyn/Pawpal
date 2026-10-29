const {test}=require('node:test'),assert=require('node:assert/strict'),{plan,answer}=require('../api/admin_copilot.js');
test('how-to questions about write operations remain read-only guidance, direct commands stay refused',()=>{
 for(const question of ['Đặt lịch PawPal như thế nào?','Hoàn tiền cho khách như thế nào?','Xóa đơn như thế nào?'])assert.equal(plan(question).intent,'workflow.guide',question);
 for(const question of ['Đặt lịch cho khách','Tự động hoàn tiền cho khách','Xóa đơn này'])assert.equal(plan(question).intent,'refuse.write',question);
 assert.equal(plan('Phòng Hotel thường và VIP khác nhau về giá thế nào?').intent,'catalog.service_price');
});
test('booking how-to requires authorized active FAQ, with no write or provider call when source is absent',async()=>{
 const question='Đặt lịch PawPal như thế nào?';let reads=0;
 const r=await answer({question,staff:{permissions:['chatbot_knowledge_faq.read']},caller:{rpc:async(name,args)=>{reads++;assert.equal(name,'admin_copilot_extended_facts');assert.equal(args.p_intent,'knowledge.search');return {data:{intent:'knowledge.search',total:0,items:[]}};}},generateReply:()=>assert.fail('no source means no generation')});
 assert.equal(reads,1);assert.match(r.reply,/Chưa có hướng dẫn/);
 await assert.rejects(()=>answer({question,staff:{permissions:[]},caller:{rpc:()=>assert.fail('deny before RPC')},generateReply:()=>assert.fail('no permission')}),e=>e.code==='42501');
});

test('Admin tool guidance searches FAQ without prematurely querying staff, content or configuration data',async()=>{
 for(const domain of ['nhân sự và lịch trực','bài viết và đánh giá','cấu hình và báo cáo vận hành']){
  const question=`Trợ lý Admin hỗ trợ tra cứu ${domain} như thế nào?`;assert.equal(plan(question).intent,'workflow.guide');let reads=0,models=0;
  const r=await answer({question,staff:{permissions:['chatbot_knowledge_faq.read']},caller:{rpc:async(name,args)=>{reads++;assert.equal(name,'admin_copilot_extended_facts');assert.equal(args.p_intent,'knowledge.search');return {data:{intent:'knowledge.search',total:1,items:[{question,answer:'Hướng dẫn có nguồn trong quyền.'}]}};}},generateReply:async(q,c)=>{models++;assert.equal(c.facts,undefined);return c.faq[0].answer;}});
  assert.equal(reads,1);assert.equal(models,1);assert.equal(r.resource_usage.calls,1);
 }
 assert.equal(plan('Lịch trực tuần này').intent,'staff.schedule');
 assert.equal(plan('Bài viết đã đăng').intent,'content.list');
 assert.equal(plan('Giờ mở cửa').intent,'settings.read');
});
