const {test}=require('node:test'),assert=require('node:assert/strict');
const {prepare,createReadBudget}=require('../api/chat_read_tools.js');
const permissions=['inventory.read','product_variant.read','product.read'];
const facts={intent:'inventory.low_stock',total:0,items:[],scope:{},as_of:'2026-10-28T00:00:00Z'};
test('question variants and selected context preserve intent without arbitrary query tools',()=>{
 const {plan,contextualPlan}=require('../api/admin_copilot.js'),now=new Date('2026-10-28T03:00:00Z');
 assert.equal(plan('lich henh spa hom nay cho phuc vu',now).intent,'appointment.list');
 assert.equal(plan('ton kh0 duoi nguong',now).intent,'inventory.low_stock');
 assert.equal(plan('Khách hàng tên Nguyễn An',now).filters.query,'Nguyễn An');
 assert.equal(plan('Lịch Spa chiều mai chưa có KTV',now).intent,'clarify');
 assert.equal(contextualPlan('khách này',[],now,{customerQuery:'CUS-01'}).filters.query,'CUS-01');
 assert.equal(contextualPlan('đơn này',[],now,{}).intent,'clarify');
});
test('context tools use fixed RPC/UUID argument and share the source budget',async()=>{
 assert.throws(()=>prepare('history.context',{sessionId:'not-uuid'},['admin_copilot_history.read']),/identity/);
 const sessionId='10000000-0000-4000-8000-000000000001',prepared=prepare('history.context',{sessionId},['admin_copilot_history.read']),budget=createReadBudget();
 let calls=0;const data=await budget.run({rpc:async(name,args)=>{calls++;assert.equal(name,'admin_copilot_recent_context');assert.deepEqual(args,{p_session:sessionId});return {data:[]};}},prepared);
 assert.deepEqual(data,[]);assert.equal(calls,1);assert.equal(budget.snapshot().calls,1);
});
test('unknown tool/filter and missing permissions fail before DB call',()=>{
 assert.throws(()=>prepare('raw.sql',{query:'SELECT *'},permissions),/unsupported_read_tool/);
 assert.throws(()=>prepare('inventory.low_stock',{table:'customer'},permissions),/unsupported_read_filter/);
 assert.throws(()=>prepare('inventory.low_stock',{},[]),e=>e.code==='42501');
 assert.throws(()=>prepare('inventory.low_stock',{query:123},permissions),/invalid_read_filter/);
 for(const audience of ['guest','member'])assert.throws(()=>prepare('inventory.low_stock',{},permissions,audience),e=>e.code==='42501');
});
test('executor refuses unvalidated descriptors or copied registry entries before RPC',async()=>{
 let calls=0;const caller={rpc:()=>{calls++;}},valid=prepare('inventory.low_stock',{},permissions);
 await assert.rejects(()=>createReadBudget().run(caller,{...valid,rpc:'arbitrary_rpc'}),/unprepared_read_tool/);assert.equal(calls,0);assert.ok(Object.isFrozen(valid.args.p_filters));
});
test('date scope and category/status inputs are validated before executing',()=>{
 const p=['appointment.read','appointment_item.read','service.read','service_category.read'];
 for(const filters of [{start_at:'bad',end_at:'bad'},{start_at:'2026-01-01T00:00:00Z',end_at:'2026-04-01T00:00:00Z'},{start_at:'2026-01-02T00:00:00Z',end_at:'2026-01-01T00:00:00Z'}])assert.throws(()=>prepare('appointment.list',filters,p),/period/);
 assert.throws(()=>prepare('appointment.list',{category:'anything'},p),/category/);
 assert.throws(()=>prepare('appointment.list',{status:'made_up'},p),/status/);
});
test('source calls capped at three without adding auth or history reads',async()=>{
 let calls=0;const caller={rpc:async()=>{calls++;return {data:facts};}},prepared=prepare('inventory.low_stock',{},permissions),budget=createReadBudget();
 for(let i=0;i<3;i++)await budget.run(caller,prepared);
 await assert.rejects(()=>budget.run(caller,prepared),e=>e.code==='54000');assert.equal(calls,3);assert.equal(budget.snapshot().active,0);
});
test('two concurrent sources only, no hidden queue or third call',async()=>{
 const deferred=[];let calls=0;const caller={rpc:()=>{calls++;return new Promise(r=>deferred.push(r));}},prepared=prepare('inventory.low_stock',{},permissions),budget=createReadBudget();
 const a=budget.run(caller,prepared),b=budget.run(caller,prepared);
 await assert.rejects(()=>budget.run(caller,prepared),e=>e.code==='54000');assert.equal(calls,2);deferred.forEach(r=>r({data:facts}));await Promise.all([a,b]);assert.equal(budget.snapshot().active,0);
});
test('oversized/too many rows or wrong-intent payload is rejected instead of sent to model',async()=>{
 const prepared=prepare('inventory.low_stock',{},permissions);
 for(const data of [{...facts,padding:'x'.repeat(33000)},{...facts,items:Array(21).fill({})},{...facts,intent:'customer.lookup'}])await assert.rejects(()=>createReadBudget().run({rpc:async()=>({data})},prepared));
});
test('transport errors retain their code rather than becoming false zero results',async()=>{
 const error={code:'42501',message:'denied'};await assert.rejects(()=>createReadBudget().run({rpc:async()=>({error})},prepare('inventory.low_stock',{},permissions)),e=>e===error);
});
test('cancellable Supabase builder receives AbortSignal and clears budget on timeout',async()=>{
 let signal;const builder={abortSignal(s){signal=s;return this;},then(resolve){signal.addEventListener('abort',()=>resolve({error:{code:'57014'}}),{once:true});}};
 const budget=createReadBudget({deadlineMs:20});await assert.rejects(()=>budget.run({rpc:()=>builder},prepare('inventory.low_stock',{},permissions)),e=>e.code==='57014');assert.ok(signal.aborted);assert.equal(budget.snapshot().active,0);
});
test('leased reads reserve remaining bytes before concurrent SQL wrappers emit payloads',async()=>{
 const lease='10000000-0000-4000-8000-000000000001',budget=createReadBudget({lease,maxBytes:1000}),prepared=prepare('inventory.low_stock',{},permissions),calls=[];
 const caller={rpc:(name,args)=>{calls.push({name,args});return new Promise(resolve=>calls.at(-1).resolve=resolve);}};
 const a=budget.run(caller,prepared);await assert.rejects(()=>budget.run(caller,prepared),e=>e.code==='54000');assert.equal(calls.length,1);
 assert.equal(calls[0].name,'run_admin_chat_read');assert.equal(calls[0].args.p_max_bytes,1000);assert.equal(calls[0].args.p_lease,lease);calls[0].resolve({data:facts});await a;
 const b=budget.run(caller,prepared);assert.equal(calls[1].args.p_max_bytes,1000-Buffer.byteLength(JSON.stringify(facts)));calls[1].resolve({data:facts});await b;
});
