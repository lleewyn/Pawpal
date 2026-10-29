const {test}=require('node:test'),assert=require('node:assert/strict');
const {plan,answer}=require('../api/admin_copilot.js'),{definitions,createReadBudget,prepare}=require('../api/chat_read_tools.js');
const id='10000000-0000-4000-8000-000000000001',other='10000000-0000-4000-8000-000000000002',now='2026-10-29T03:00:00Z',question='Khách này có thú cưng và đơn hàng mới nhất?';
const rights=[...new Set(['internal.customer_resolve','internal.customer_pets','internal.customer_latest_order'].flatMap(tool=>definitions[tool].permissions))];
function data(tool,filters){return {intent:tool,total:1,items:tool==='internal.customer_resolve'?[{id,code:'CUS-QA',name:'QA'}]:tool==='internal.customer_pets'?[{customer_id:id,code:'PET-QA',name:'QA pet',status:'active',breed:'QA breed',species:'QA species',created_at:now}]:[{customer_id:id,code:'ORD-QA',status:'cancelled',created_at:now}],scope:filters,source:'QA scoped',as_of:now};}
async function invoke({q=question,permissions=rights,context={customerId:id},run}={}){const calls=[];const result=await answer({question:q,staff:{permissions},readContext:context,readBudget:createReadBudget({lease:id}),caller:{rpc:async(name,args)=>{calls.push({name,args});return run?run(args.p_tool,args.p_filters):{data:data(args.p_tool,args.p_filters)};}},generateReply:()=>assert.fail('no model for customer graph')});return {result,calls};}
test('commerce graph requires two explicit categories, preserves explicit customer over selected context',()=>{
 const r=plan(question,new Date(now),{customerId:id});assert.equal(r.intent,'customer.case');assert.deepEqual(r.filters,{query:id,kind:'pets_orders'});
 assert.equal(plan('Khach nay co thu cung va don hang moi nhat?',new Date(now),{customerId:id}).filters.kind,'pets_orders');
 assert.equal(plan('Khách này có thú cưng và đơn hàng mới nhất.',new Date(now),{customerId:id}).filters.kind,'pets_orders');
 assert.equal(plan('Thú cưng và đơn hàng mới nhất của khách: CUS-OTHER',new Date(now),{customerId:id}).filters.query,'CUS-OTHER');
 assert.equal(plan(question,new Date(now)).intent,'clarify');
 for(const q of ['Khách này có thú cưng và đơn hàng đã thanh toán mới nhất?','Khách này có thú cưng và đơn hàng mới nhất tháng này?','Khách này có thú cưng và đơn hàng mới nhất cùng lịch sắp tới?'])assert.equal(plan(q,new Date(now),{customerId:id}).intent,'clarify');
});
test('unique resolver UUID scopes both relationships in exactly three reads without multiplying entities',async()=>{
 const {result:r,calls}=await invoke();assert.equal(calls.length,3);assert.equal(calls[0].args.p_tool,'internal.customer_resolve');assert.ok(calls.every(c=>c.name==='run_admin_chat_customer_case'));
 for(const c of calls.slice(1))assert.equal(c.args.p_filters.customerId,id);
 assert.equal(r.partial,false);assert.equal(r.resource_usage.calls,3);assert.equal(r.scope.customerId,id);assert.match(r.reply,/PET-QA/);assert.match(r.reply,/ORD-QA/);assert.match(r.reply,/Đã hủy/);assert.ok(r.limitations.some(x=>x.includes('Không suy ra thanh toán')));
});
test('missing or duplicate identity never launches either relation source',async()=>{for(const total of [0,2]){const {result:r,calls}=await invoke({run:(tool,filters)=>{assert.equal(tool,'internal.customer_resolve');return {data:{...data(tool,filters),total,items:total?[{id,code:'CUS-A',name:'QA'},{id:other,code:'CUS-B',name:'QA'}]:[]}};}});assert.equal(calls.length,1);assert.equal(r.answer_type,'clarify');}});
test('per-source rights skip unauthorized pet or order reads, and both missing deny before lookup',async()=>{
 for(const denied of ['pet_profile.read','pet_breed.read','pet_species.read','sales_order.read']){const {result:r,calls}=await invoke({permissions:rights.filter(p=>p!==denied)});assert.equal(calls.length,2);assert.equal(r.partial,true);assert.equal(r.facts[denied==='sales_order.read'?'order':'pets'].status,'forbidden');}
 await assert.rejects(()=>invoke({permissions:definitions['internal.customer_resolve'].permissions,run:()=>assert.fail('no relation permission, no lookup')}),e=>e.code==='42501');
});
test('empty pet list and no latest order remain real empty results',async()=>{const {result:r}=await invoke({run:(tool,filters)=>({data:tool==='internal.customer_resolve'?data(tool,filters):{...data(tool,filters),total:0,items:[]}})});assert.equal(r.partial,false);assert.match(r.reply,/Có \*\*0\*\* hồ sơ/);assert.match(r.reply,/Không có đơn được phép đọc/);});
test('wrong UUID in scope or row and duplicate pet codes are excluded from the merged answer',async()=>{
 for(const mutate of [d=>({...d,scope:{customerId:other}}),d=>({...d,items:[{...d.items[0],customer_id:other}]}),d=>({...d,total:2,items:[d.items[0],d.items[0]]})]){const {result:r}=await invoke({run:(tool,filters)=>({data:tool==='internal.customer_pets'?mutate(data(tool,filters)):data(tool,filters)})});assert.equal(r.partial,true);assert.equal(r.facts.pets.data,null);assert.doesNotMatch(r.reply,/PET-QA/);assert.match(r.reply,/ORD-QA/);}
 const {result:r}=await invoke({run:(tool,filters)=>({data:tool==='internal.customer_latest_order'?{...data(tool,filters),items:[{...data(tool,filters).items[0],customer_id:other}]}:data(tool,filters)})});assert.equal(r.facts.order.data,null);
});
test('pet total is not inferred from first page and latest order is not presented as total order history',async()=>{
 const {result:r,calls}=await invoke({run:(tool,filters)=>{const d=data(tool,filters);if(tool==='internal.customer_pets'){d.total=12;d.items=Array.from({length:10},(_,i)=>({...d.items[0],code:'PET-'+i}));}return {data:d};}});assert.equal(calls.length,3);assert.match(r.reply,/Có \*\*12\*\* hồ sơ/);assert.ok(r.limitations.some(x=>x.includes('10/12')));assert.match(r.reply,/Đơn được tạo mới nhất/);assert.doesNotMatch(r.reply,/Có \*\*1\*\* đơn/);
});
test('source timeout and invalid latest order produce partial data without fabricated payment or fallback owner',async()=>{
 for(const mode of ['timeout','invalid-date','two-orders']){const {result:r}=await invoke({run:(tool,filters)=>{const d=data(tool,filters);if(tool!=='internal.customer_latest_order')return {data:d};if(mode==='timeout')return {error:{code:'57014'}};if(mode==='invalid-date')d.items[0].created_at='bad';else{d.total=2;d.items=[d.items[0],{...d.items[0],code:'ORD-OTHER'}];}return {data:d};}});assert.equal(r.partial,true);assert.equal(r.facts.order.data,null);assert.doesNotMatch(r.reply,/ORD-QA/);}
});
test('new UUID-only tools require lease and reject extra caller-selected filters',async()=>{
 for(const tool of ['internal.customer_pets','internal.customer_latest_order']){assert.throws(()=>prepare(tool,{customerId:id,status:'active'},rights),e=>e.code==='22023');await assert.rejects(()=>createReadBudget().run({rpc:()=>assert.fail('no lease')},prepare(tool,{customerId:id},rights)),e=>e.code==='42501');}
});
