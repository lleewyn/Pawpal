const {test}=require('node:test'),assert=require('node:assert/strict');
const {plan,answer}=require('../api/admin_copilot.js'),{definitions,createReadBudget,prepare}=require('../api/chat_read_tools.js');
const now=new Date('2026-10-29T03:00:00Z'),lease='10000000-0000-4000-8000-000000000001',question='Việc cần kiểm tra hôm nay';
const rights=[...new Set(['order.refund_pending','appointment.search'].flatMap(k=>definitions[k].permissions))];
function data(tool,filters){return {intent:tool,total:1,items:tool==='order.refund_pending'?[{code:'ORD-QA',collected:100,refunded:50,net:50,pending_refunds:1}]:[{code:'APT-QA',status:'confirmed',scheduled_at:'2026-10-29T04:00:00Z',services:'QA Spa'}],scope:{...filters,time_zone:'Asia/Ho_Chi_Minh'},source:tool,as_of:now.toISOString(),page:1,pages:1,limitations:[]};}
async function invoke({q=question,permissions=rights,run,budget=createReadBudget({lease})}={}){
 const calls=[];const result=await answer({question:q,now,staff:{permissions},readBudget:budget,caller:{rpc:async(name,args)=>{calls.push({name,args});return run?run(args.p_tool,args.p_filters):{data:data(args.p_tool,args.p_filters)};}},generateReply:()=>assert.fail('pending overview must not use AI')});return {result,calls};
}
test('pending overview fixes two categories and dates only the confirmed unassigned appointments',()=>{
 const r=plan(question,now);assert.equal(r.intent,'operations.pending');assert.equal(r.filters.refunds,'all_outstanding');assert.equal(r.filters.appointments.status,'confirmed');assert.equal(r.filters.appointments.unassigned,'true');assert.equal(r.filters.appointments.start_at,'2026-10-28T17:00:00.000Z');
 assert.deepEqual(plan('Viec can kiem tra hom nay',now),r);assert.deepEqual(plan('Đơn hủy chưa hoàn đủ và lịch chờ phục vụ chưa có KTV hôm nay',now),r);
});
test('capabilities describe the two operational categories without preloading data',async()=>{
 const {result:r,calls}=await invoke({q:'Bạn làm được gì?',run:()=>assert.fail('no preload')});assert.match(r.reply,/Hai nhóm cần kiểm tra/);assert.equal(calls.length,0);
});
test('missing dates, unsupported filters or overdue claims clarify before any read',async()=>{
 for(const q of ['Việc cần xử lý','Việc cần kiểm tra hôm nay theo chi nhánh','Việc cần xử lý quá hạn hôm nay','Việc cần xử lý 31/02/2026','Việc cần xử lý từ 01/01/2026 đến 15/02/2026']){const {result:r,calls}=await invoke({q,run:()=>assert.fail('must clarify')});assert.equal(r.answer_type,'clarify',q);assert.equal(calls.length,0);}
});
test('authorized overview reads only two existing tools and never sums unrelated totals',async()=>{
 const {result:r,calls}=await invoke({run:(tool,filters)=>({data:{...data(tool,filters),limitations:['Giao dịch succeeded.']}})});assert.equal(calls.length,2);assert.ok(calls.every(c=>c.name==='run_admin_stage3_read'));assert.deepEqual(calls[0].args.p_filters,{});assert.equal(calls[1].args.p_filters.status,'confirmed');assert.equal(r.partial,false);assert.equal(r.resource_usage.calls,2);assert.match(r.reply,/ORD-QA/);assert.match(r.reply,/APT-QA/);assert.match(r.reply,/Giao dịch thành công/);assert.doesNotMatch(r.reply,/succeeded/);assert.ok(r.limitations.some(x=>x.includes('Không cộng tổng')));assert.equal(r.facts.total,undefined);
});
test('missing one category permission skips that source; missing both denies without reading',async()=>{
 const {result:r,calls}=await invoke({permissions:rights.filter(p=>p!=='refund_transaction.read')});assert.equal(calls.length,1);assert.equal(calls[0].args.p_tool,'appointment.search');assert.equal(r.partial,true);assert.equal(r.facts.refunds.status,'forbidden');assert.match(r.reply,/APT-QA/);assert.doesNotMatch(r.reply,/ORD-QA/);
 await assert.rejects(()=>invoke({permissions:[],run:()=>assert.fail('no DB')}),e=>e.code==='42501');
});
test('one unavailable source remains a labeled partial, both unavailable remain an error',async()=>{
 const {result:r}=await invoke({run:(tool,filters)=>tool==='order.refund_pending'?{error:{code:'57014'}}:{data:data(tool,filters)}});assert.equal(r.partial,true);assert.equal(r.facts.refunds.data,null);assert.match(r.reply,/không coi là không có việc/);
 await assert.rejects(()=>invoke({run:()=>({error:{code:'57014'}})}),e=>e.code==='57014');
});
test('wrong date/status/assignment, hidden scope and nonpositive refund differences are discarded',async()=>{
 for(const mutate of [d=>({...d,scope:null}),d=>({...d,scope:[]}),d=>({...d,scope:{...d.scope,status:'pending'}}),d=>({...d,scope:{...d.scope,unassigned:'false'}}),d=>({...d,scope:{...d.scope,customerId:lease}}),d=>({...d,scope:{...d.scope,time_zone:'UTC'}}),d=>({...d,items:[{...d.items[0],scheduled_at:'2027-01-01T00:00:00Z'}]})]){
  const {result:r}=await invoke({run:(tool,filters)=>({data:tool==='appointment.search'?mutate(data(tool,filters)):data(tool,filters)})});assert.equal(r.partial,true);assert.equal(r.facts.appointments.data,null);
 }
 const {result:r}=await invoke({run:(tool,filters)=>{const d=data(tool,filters);if(tool==='order.refund_pending')d.items[0]={...d.items[0],refunded:100,net:0};return {data:d};}});assert.equal(r.facts.refunds.data,null);
});
test('empty results do not claim every operational task is complete',async()=>{
 const {result:r}=await invoke({run:(tool,filters)=>({data:{...data(tool,filters),total:0,items:[]}})});assert.equal(r.partial,false);assert.equal(r.facts.refunds.data.total,0);assert.equal(r.facts.appointments.data.total,0);assert.ok(r.limitations.some(x=>x.includes('Không phải danh sách mọi việc')));
});
test('list samples do not produce a fake combined page or extra fetches',async()=>{
 const {result:r,calls}=await invoke({run:(tool,filters)=>{const d=data(tool,filters);d.total=12;d.pages=2;return {data:d};}});assert.equal(calls.length,2);assert.ok(r.limitations.some(x=>x.includes('Chỉ hiển thị trang đầu')));assert.doesNotMatch(r.reply,/Bạn có thể hỏi “trang 2”/);assert.equal(r.facts.refunds.data.total,12);
});
test('overview fits three-source budget after one history read',async()=>{
 const budget=createReadBudget({lease});await budget.run({rpc:async()=>({data:[]})},prepare('history.context',{sessionId:lease},['admin_copilot_history.read']));const {result:r}=await invoke({budget});assert.equal(r.resource_usage.calls,3);assert.equal(r.partial,false);
});
