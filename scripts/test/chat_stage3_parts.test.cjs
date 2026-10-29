const {test}=require('node:test'),assert=require('node:assert/strict'),{plan,answer,formatFacts}=require('../api/admin_copilot.js'),{definitions,prepare,createReadBudget}=require('../api/chat_read_tools.js');
const now=new Date('2026-10-28T03:00:00Z'),id='10000000-0000-4000-8000-000000000001',revision='a'.repeat(32);
test('long content and price-row requests use closed plans and validated cursors',()=>{
 assert.equal(plan('Nội dung bài viết: bài mẫu',now).intent,'content.read');assert.equal(plan('Nội dung đánh giá: '+id,now).intent,'review.read');
 assert.equal(plan('Nội dung bài viết: '+id+' phần 2',now).intent,'clarify');
 const p=plan('Nội dung bài viết: '+id+' phần 2 bản '+revision,now);assert.deepEqual(p.filters,{query:id,part:'2',revision});
 const price=plan('Bảng giá chi tiết Spa 5,5 kg: SVC-SPA-01 trang 2',now);assert.equal(price.intent,'catalog.price_rows');assert.deepEqual(price.filters,{query:'SVC-SPA-01',category:'grooming_spa',weight:'5.5',page:'2'});
 const taxi=plan('Ma trận giá taxi 4 kg 10 km: SVC-TAXI',now);assert.equal(taxi.filters.distance,'10');assert.equal(taxi.filters.weight,'4');
 for(const q of ['Bảng giá chi tiết Spa -5 kg: SVC-SPA','Bảng giá chi tiết Spa từ 5 đến 10 kg: SVC-SPA','Bảng giá chi tiết Spa ngày mai: SVC-SPA'])assert.equal(plan(q,now).intent,'clarify');
});
test('all new tools enforce permissions, lease, fixed fields and numeric limits before RPC',async()=>{
 for(const intent of ['content.read','review.read','catalog.price_rows']){
  const permissions=[...definitions[intent].permissions,'service_price_matrix.read','taxi_price_rule.read','hotel_room_type.read'];const read=prepare(intent,{query:id},permissions);
  assert.throws(()=>prepare(intent,{query:id,table:'staff'},permissions));assert.throws(()=>prepare(intent,{query:id},[]),e=>e.code==='42501');await assert.rejects(()=>createReadBudget().run({rpc:()=>assert.fail('no lease')},read));
 }
 const p=['blog_post.read'];for(const filters of [{query:id,part:'2'},{query:id,part:'0'},{query:id,revision:'bad'}])assert.throws(()=>prepare('content.read',filters,p));
 const pricePermissions=[...definitions['catalog.price_rows'].permissions,'service_price_matrix.read'];for(const weight of ['NaN','Infinity','-1','1001','1e2'])assert.throws(()=>prepare('catalog.price_rows',{query:id,category:'grooming_spa',weight},pricePermissions));
 assert.throws(()=>prepare('catalog.price_rows',{query:id},pricePermissions),e=>e.code==='42501');
});
test('content stays complete within its part and next question pins identity and revision',async()=>{
 const body='😀'.repeat(1900)+'END',data={intent:'content.read',total:1,items:[{code:id,name:'Bài mẫu',status:'published',body,part:1,parts:2,has_more:true,revision}],source:'blog_post',as_of:now.toISOString(),scope:{}};
 const r=await answer({question:'Nội dung bài viết: '+id,now,staff:{permissions:['blog_post.read']},readBudget:createReadBudget({lease:id}),caller:{rpc:async(name)=>{assert.equal(name,'run_admin_chat_detail');return {data};}},generateReply:()=>assert.fail('no model')});
 assert.ok(r.reply.includes(body));assert.equal(r.continuation.type,'ask_question');assert.equal(plan(r.continuation.question,now).filters.revision,revision);assert.equal(plan(r.continuation.question,now).filters.part,'2');assert.equal(r.resource_usage.calls,1);
 assert.throws(()=>formatFacts({...data,items:[{...data.items[0],body:'x'.repeat(2001)}]}),/invalid_detail_part/);
});
test('ambiguous exact title does not pick first content or generate a draft',async()=>{
 for(const question of ['Nội dung bài viết: Trùng tên','Soạn nội dung bài viết: Trùng tên']){const r=await answer({question,now,staff:{permissions:['blog_post.read']},readBudget:createReadBudget({lease:id}),caller:{rpc:async()=>({data:{intent:'content.read',total:2,items:[],ambiguous:true,scope:{}}})},generateReply:()=>assert.fail('ambiguous source')});assert.match(r.reply,/mã/);}
});
test('price-row formatter preserves explicit half-open boundaries without summing a sample',()=>{
 const reply=formatFacts({intent:'catalog.price_rows',total:25,page:2,pages:3,items:[{kind:'service',price:105,weight_from:5,weight_to:6}],scope:{},as_of:now.toISOString()});assert.match(reply,/25/);assert.match(reply,/từ 5 đến dưới 6 kg/);assert.match(reply,/Trang 2\/3/);
});
test('review stars distinguish exact, minimum and maximum; staff inactive states remain scoped',()=>{
 for(const [q,rating]of [['Đánh giá 5 sao hôm nay',{rating_min:'5',rating_max:'5'}],['Đánh giá ít nhất 4 sao hôm nay',{rating_min:'4'}],['Đánh giá tối đa 2 sao hôm nay',{rating_max:'2'}]]){const f=plan(q,now).filters;assert.equal(f.rating_min,rating.rating_min);assert.equal(f.rating_max,rating.rating_max);}
 assert.equal(plan('Nhân viên đã nghỉ việc',now).filters.status,'terminated');assert.equal(plan('Nhân viên tạm ngừng',now).filters.status,'inactive');
 const dates={start_at:'2026-10-28T00:00:00Z',end_at:'2026-10-29T00:00:00Z'};assert.throws(()=>prepare('review.list',{...dates,rating_min:'5',rating_max:'2'},['review.read']));
});
