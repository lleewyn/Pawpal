const {test}=require('node:test'),assert=require('node:assert/strict');
const {plan,answer}=require('../api/admin_copilot.js'),{prepare,definitions,createReadBudget}=require('../api/chat_read_tools.js');
const id='10000000-0000-4000-8000-000000000001',other='10000000-0000-4000-8000-000000000002',now='2026-10-29T03:00:00Z';
const permissions=[...new Set(['internal.customer_resolve','internal.customer_appointment','internal.customer_tickets'].flatMap(t=>definitions[t].permissions))];
const question='Khách này có lịch sắp tới và khiếu nại nào còn mở?';
function fixture(tool,filters){return {intent:tool,total:1,items:tool==='internal.customer_resolve'?[{id,code:'CUS-001',name:'QA khách'}]:tool==='internal.customer_appointment'?[{code:'APT-QA',status:'confirmed',scheduled_at:'2026-10-30T03:00:00Z',services:'QA Spa'}]:[{code:'TK-QA',status:'pending',subject:'QA hỗ trợ'}],scope:filters,source:'QA scoped',as_of:now};}
async function invoke({q=question,rights=permissions,context={customerQuery:'CUS-001'},run}={}){
 const calls=[];const result=await answer({question:q,staff:{permissions:rights},readContext:context,readBudget:createReadBudget({lease:id}),caller:{rpc:async(name,args)=>{calls.push({name,args});return run?run(args.p_tool,args.p_filters):{data:fixture(args.p_tool,args.p_filters)};}},generateReply:()=>assert.fail('customer case cannot use a model')});return {result,calls};
}
test('case plan requires a unique customer query and an explicit upcoming/recent direction',()=>{
 assert.equal(plan(question,new Date(now),{customerQuery:'CUS-001'}).intent,'customer.case');
 assert.equal(plan('Khach nay co lich sap toi va khieu nai nao con mo?',new Date(now),{customerQuery:'CUS-001'}).intent,'customer.case');
 assert.equal(plan(question,new Date(now)).intent,'clarify');
 assert.equal(plan('Khách này có lịch gần nhất và khiếu nại nào còn mở?',new Date(now),{customerQuery:'CUS-001'}).intent,'clarify');
 const r=plan('Lịch vừa qua gần nhất và khiếu nại còn mở của khách: CUS-002',new Date(now),{customerQuery:'CUS-001'});assert.equal(r.filters.query,'CUS-002');assert.equal(r.filters.direction,'recent');
 assert.equal(plan(question,new Date(now),{customerId:id,customerQuery:'CUS-other'}).filters.query,id);
 assert.equal(plan(question+': CUS-002',new Date(now),{customerId:id}).filters.query,'CUS-002');
 assert.equal(plan('Khách này có lịch sắp tới và khiếu nại nào còn mở theo chi nhánh?',new Date(now),{customerQuery:'CUS-001'}).intent,'clarify');
});
test('resolve once then scope both sources to its UUID, never the client hint or a matching name',async()=>{
 const {result:r,calls}=await invoke();assert.equal(calls.length,3);assert.equal(calls[0].args.p_tool,'internal.customer_resolve');
 for(const call of calls){assert.equal(call.name,'run_admin_chat_customer_case');assert.equal(call.args.p_lease,id);}
 for(const call of calls.slice(1))assert.equal(call.args.p_filters.customerId,id);
 assert.equal(r.scope.customerId,id);assert.equal(r.partial,false);assert.equal(r.resource_usage.calls,3);assert.match(r.reply,/APT-QA/);assert.match(r.reply,/TK-QA/);
});
test('missing or ambiguous identity stops after one source and never reads relationships',async()=>{
 for(const total of [0,2]){const {result:r,calls}=await invoke({run:(tool,filters)=>{assert.equal(tool,'internal.customer_resolve');return {data:{...fixture(tool,filters),total,items:total?[{id,code:'CUS-001',name:'QA'},{id:other,code:'CUS-002',name:'QA'}]:[]}};}});assert.equal(calls.length,1);assert.equal(r.answer_type,'clarify');}
});
test('missing customer permission or both relationship permissions fails before reading',async()=>{
 for(const denied of definitions['internal.customer_resolve'].permissions)await assert.rejects(()=>invoke({rights:permissions.filter(p=>p!==denied),run:()=>assert.fail('no DB')}),e=>e.code==='42501');
 await assert.rejects(()=>invoke({rights:definitions['internal.customer_resolve'].permissions,run:()=>assert.fail('no DB')}),e=>e.code==='42501');
});
test('one relationship permission missing skips that RPC and returns a labeled partial reply',async()=>{
 const {result:r,calls}=await invoke({rights:permissions.filter(p=>p!=='support_ticket.read')});assert.equal(calls.length,2);assert.equal(r.partial,true);assert.equal(r.facts.tickets.status,'forbidden');assert.match(r.reply,/APT-QA/);assert.doesNotMatch(r.reply,/Có \*\*0\*\*/);
});
test('empty relationships stay real zeros without losing the resolved identity',async()=>{
 const {result:r}=await invoke({run:(tool,filters)=>({data:tool==='internal.customer_resolve'?fixture(tool,filters):{...fixture(tool,filters),total:0,items:[]}})});assert.equal(r.partial,false);assert.match(r.reply,/Không có lịch phù hợp/);assert.match(r.reply,/Có \*\*0\*\* phiếu/);
});
test('wrong-customer results, failed sources and duplicate tickets cannot be merged into the reply',async()=>{
 for(const mode of ['wrong-customer','timeout','duplicate']){const {result:r}=await invoke({run:(tool,filters)=>{
  if(tool!=='internal.customer_tickets')return {data:fixture(tool,filters)};
  if(mode==='timeout')return {error:{code:'57014'}};
  const d=fixture(tool,filters);if(mode==='wrong-customer')d.scope={customerId:other};else{d.total=2;d.items=[d.items[0],d.items[0]];}return {data:d};
 }});assert.equal(r.partial,true);assert.equal(r.facts.tickets.data,null);assert.doesNotMatch(r.reply,/TK-QA/);}
});
test('ticket totals are not inferred from a ten-row sample and no hidden next page is fetched',async()=>{
 const {result:r,calls}=await invoke({run:(tool,filters)=>{const d=fixture(tool,filters);if(tool==='internal.customer_tickets'){d.total=12;d.items=Array.from({length:10},(_,i)=>({code:'TK-'+i,status:'pending',subject:'QA'}));}return {data:d};}});assert.equal(calls.length,3);assert.match(r.reply,/Có \*\*12\*\*/);assert.ok(r.limitations.some(x=>x.includes('10/12')));
});
test('internal tools reject arbitrary filters, invalid UUID/direction and unleased calls',async()=>{
 assert.throws(()=>prepare('internal.customer_tickets',{customerId:id,query:'SQL'},permissions),e=>e.code==='22023');
 assert.throws(()=>prepare('internal.customer_appointment',{customerId:id,direction:'anything'},permissions),e=>e.code==='22023');
 assert.throws(()=>prepare('internal.customer_tickets',{customerId:'CUS-001'},permissions),e=>e.code==='22023');
 await assert.rejects(()=>createReadBudget().run({rpc:()=>assert.fail('must require lease')},prepare('internal.customer_resolve',{query:'CUS-001'},permissions)),e=>e.code==='42501');
});
