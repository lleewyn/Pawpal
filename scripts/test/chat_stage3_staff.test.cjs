const {test}=require('node:test'),assert=require('node:assert/strict'),{plan,contextualPlan,answer}=require('../api/admin_copilot.js'),{definitions,prepare,createReadBudget}=require('../api/chat_read_tools.js');
const now=new Date('2026-10-28T03:00:00Z'),id='10000000-0000-4000-8000-000000000001',base=definitions['appointment.search'].permissions;
test('named staff plans preserve name and scope time before the staff marker',()=>{
 for(const q of ['Lịch Spa chiều mai theo KTV: Nguyễn Sáng','Lich Spa chieu mai cua KTV Nguyen Sang','Lịch Spa chiều mai KTV: Nguyễn Sáng']){const p=plan(q,now);assert.equal(p.intent,'appointment.search');assert.equal(p.filters.start_at,'2026-10-28T17:00:00.000Z');assert.equal(p.filters.day_part,'afternoon');assert.ok(p.filters.staff_query.endsWith('Sáng')||p.filters.staff_query.endsWith('Sang'));}
 assert.equal(plan('Lịch hẹn hôm nay theo KTV: Mai',now).filters.start_at,'2026-10-27T17:00:00.000Z');
 for(const q of ['Lịch Spa theo KTV: Nguyễn An','Lịch Spa chiều mai chưa có KTV theo KTV: Nguyễn An','Lịch Spa chiều mai theo KTV:'])assert.equal(plan(q,now).intent,'clarify');
});
test('staff and addon rights are conditional and query cannot escape registered fields',()=>{
 const f=plan('Lịch Spa chiều mai theo KTV: Nguyễn An',now).filters;
 assert.throws(()=>prepare('appointment.search',f,base),e=>e.code==='42501');assert.throws(()=>prepare('appointment.search',f,[...base,'staff.read']),e=>e.code==='42501');assert.doesNotThrow(()=>prepare('appointment.search',f,[...base,'staff.read','service_addon.read']));
 const plain=plan('Lịch hẹn hôm nay theo KTV: '+id,now).filters;assert.doesNotThrow(()=>prepare('appointment.search',plain,[...base,'staff.read']));
 assert.doesNotThrow(()=>prepare('appointment.search',plan('Lịch Spa chiều mai chưa có KTV',now).filters,base));
 for(const staff_query of ['', 'A', 'bad\nname'])assert.throws(()=>prepare('appointment.search',{...f,staff_query},[...base,'staff.read','service_addon.read']));
 assert.throws(()=>prepare('appointment.search',{...f,unassigned:'true'},[...base,'staff.read','service_addon.read']));
});
test('paging and day followups retain staff identity',()=>{
 const history=[{role:'user',content:'Lịch Spa hôm nay theo KTV: Nguyễn An'}];
 assert.equal(contextualPlan('trang 2',history,now).filters.staff_query,'Nguyễn An');assert.equal(contextualPlan('trang 2',history,now).filters.page,'2');
 assert.equal(contextualPlan('thế ngày mai thì sao?',history,now).filters.staff_query,'Nguyễn An');assert.equal(contextualPlan('thế ngày mai thì sao?',history,now).filters.start_at,'2026-10-29T00:00:00+07:00');
});
test('unresolved staff never becomes a zero-appointment claim or a generated draft',async()=>{
 for(const count of [0,2])for(const prefix of ['', 'Soạn thông báo ']){
  const r=await answer({question:prefix+'Lịch Spa hôm nay theo KTV: Nguyễn An',now,staff:{permissions:[...base,'staff.read','service_addon.read']},readBudget:createReadBudget({lease:id}),caller:{rpc:async()=>({data:{intent:'appointment.search',staff_match_count:count,total:0,items:[],scope:{},ambiguous:count>1}})},generateReply:()=>assert.fail('no generation')});assert.match(r.reply,prefix?/KTV/:count?/trùng tên/:/Không tìm thấy KTV/);assert.equal(r.resource_usage.calls,1);
 }
});
test('resolved staff appears in deterministic facts reply and uses one source',async()=>{
 const r=await answer({question:'Lịch Spa hôm nay theo KTV: Nguyễn An',now,staff:{permissions:[...base,'staff.read','service_addon.read']},readBudget:createReadBudget({lease:id}),caller:{rpc:async()=>({data:{intent:'appointment.search',staff_match_count:1,total:0,items:[],scope:{staff_id:id,staff_name:'Nguyễn An'},as_of:now.toISOString()}})},generateReply:()=>assert.fail('no model')});assert.match(r.reply,/Nguyễn An/);assert.match(r.reply,/0/);assert.equal(r.resource_usage.calls,1);
});
