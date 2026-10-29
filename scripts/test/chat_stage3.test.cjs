const {test}=require('node:test'),assert=require('node:assert/strict');
const {plan,contextualPlan,answer,formatFacts}=require('../api/admin_copilot.js'),{period}=require('../api/chat_stage3_planner.js'),{definitions,prepare,createReadBudget}=require('../api/chat_read_tools.js');
const now=new Date('2026-10-28T03:00:00Z');
test('stage3 covers all curated domains without enabling writes',()=>{
 for(const [q,intent]of [
 ['Khách này có bé nào?','customer.pets'],['Thú cưng: PET-001','pet.lookup'],['Thanh toán đơn: ORD-001','payment.order'],['Đơn hủy đã thanh toán nhưng chưa hoàn','order.refund_pending'],
 ['Lịch Spa chiều mai chưa có KTV','appointment.search'],['Khiếu nại: TK-001','ticket.lookup'],['Hội thoại chờ nhân viên','conversation.list'],['Pawpoint: CUS-001','points.lookup'],['Ưu đãi đang hiệu lực','offer.list'],['Nhân viên đang làm việc','staff.lookup'],['Lịch trực tuần này','staff.schedule'],['Đánh giá thấp tháng này','review.list'],['Bài viết đã đăng','content.list'],['Báo cáo vận hành tuần này','report.operations'],['Giờ mở cửa','settings.read'],['Hoàn tiền cho khách','refuse.write']])assert.equal(plan(q,now,{customerQuery:'CUS-001'}).intent,intent,q);
 assert.equal(plan('Khách này có bé nào?',now).intent,'clarify');assert.deepEqual(plan('Đơn hủy chưa hoàn',now).filters,{});
 assert.equal(plan('Cấu hình API key',now).intent,'clarify');assert.equal(plan('Danh sách bài viết bản nháp',now).intent,'content.list');assert.equal(plan('Lương nhân viên',now).intent,'clarify');
});
test('Vietnam date boundaries include Monday weeks, calendar months, leap day and inclusive range',()=>{
 assert.deepEqual(period('tuần này',now).filters,{start_at:'2026-10-25T17:00:00.000Z',end_at:'2026-11-01T17:00:00.000Z'});
 assert.deepEqual(period('tháng này',now).filters,{start_at:'2026-09-30T17:00:00.000Z',end_at:'2026-10-31T17:00:00.000Z'});
 assert.equal(period('từ 28/10/2026 đến 29/10/2026',now).filters.end_at,'2026-10-29T17:00:00.000Z');
 assert.throws(()=>period('31/02/2026',now));assert.throws(()=>period('từ 01/01/2026 đến 15/02/2026',now));
 assert.equal(period('29/02/2028',now).filters.start_at,'2028-02-28T17:00:00.000Z');
 assert.equal(period('Hội thoại khuyến mãi',now).explicit,false);assert.equal(period('Lịch trực: Mai',now).explicit,false);
 const p=plan('Lịch Spa chiều mai chưa có KTV',now);assert.equal(p.filters.day_part,'afternoon');assert.equal(p.filters.unassigned,'true');assert.equal(p.filters.start_at,'2026-10-28T17:00:00.000Z');
});
test('page-only followup inherits the latest query, not an unrelated older topic',()=>{
 assert.equal(contextualPlan('trang 2',[{role:'user',content:'Nhân viên đang làm việc'}],now).filters.page,'2');
 assert.equal(contextualPlan('trang 2',[{role:'user',content:'Nhân viên đang làm việc'},{role:'user',content:'Bạn hỗ trợ gì?'}],now).intent,'clarify');
});
test('every new source requires complete permissions and a shared lease',async()=>{
 for(const [intent,t]of Object.entries(definitions).filter(([,t])=>t.stage3)){
  const f={...(t.query?{query:'QA-test'}:{}),...(t.date?period('hôm nay',now).filters:{})};
  for(const permission of t.permissions)assert.throws(()=>prepare(intent,f,t.permissions.filter(p=>p!==permission)),e=>e.code==='42501');
  const prepared=prepare(intent,f,t.permissions);await assert.rejects(()=>createReadBudget().run({rpc:()=>assert.fail('no lease must not reach DB')},prepared),e=>e.code==='42501');
  let name;const data={intent,total:0,page:1,pages:1,items:[],source:'Supabase',as_of:now.toISOString(),scope:{},limitations:[]};
  await createReadBudget({lease:'10000000-0000-4000-8000-000000000001'}).run({rpc:async n=>{name=n;return {data};}},prepared);assert.equal(name,'run_admin_stage3_read');
 }
});
test('answer uses source facts once and never a model for new read tools',async()=>{
 const intent='staff.lookup',calls=[],budget=createReadBudget({lease:'10000000-0000-4000-8000-000000000001'});
 const r=await answer({question:'Nhân viên đang làm việc',staff:{permissions:definitions[intent].permissions},now,readBudget:budget,caller:{rpc:async(name,args)=>{calls.push({name,args});return {data:{intent,total:12,page:1,pages:2,items:[{code:'QA-01',name:'QA',status:'active'}],scope:{},source:'Supabase',as_of:now.toISOString(),limitations:[]}};}},generateReply:()=>assert.fail('model forbidden')});
 assert.equal(calls.length,1);assert.match(r.reply,/12/);assert.match(r.reply,/Trang 1\/2/);assert.equal(r.resource_usage.calls,1);
 const empty=formatFacts({intent,total:0,page:1,pages:1,items:[],scope:{},source:'Supabase',as_of:now.toISOString(),limitations:[]});assert.match(empty,/0/);
});
