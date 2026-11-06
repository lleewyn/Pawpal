const test=require('node:test'),assert=require('node:assert/strict');
const {prepareStaff,createReadBudget}=require('../api/chat_read_tools.js');
const id='16500000-0000-4000-8000-000000000020';
const principal={system_role:'STAFF',permissions:['work.copilot.use','work.chat.handle','work.service.perform']};
const dto=(intent,items)=>({intent,items,audience:'staff',total_is_page:true,page_size:10,total:items.length});
test('empty reads retain permission provenance and snapshots cannot mutate the saved references',async()=>{
 const budget=createReadBudget(),tool=prepareStaff('appointment.search',{},principal);
 await budget.run({rpc:async()=>({data:dto(tool.intent,[])})},tool);
 const refs=budget.snapshot().staff_scope_refs;assert.deepEqual(refs,[{kind:'permission',permission:'work.service.perform'}]);
 assert.ok(Object.isFrozen(refs));assert.ok(Object.isFrozen(refs[0]));
});
test('invalid source identities fail before they can become provenance or successful model input',async()=>{
 const budget=createReadBudget(),tool=prepareStaff('appointment.search',{},principal);
 await assert.rejects(()=>budget.run({rpc:async()=>({data:dto(tool.intent,[{id:'untrusted-id'}])})},tool),error=>error.code==='XX000');
 assert.equal(budget.snapshot().staff_scope_refs,undefined);
});
test('conversation transcript provenance binds the verified conversation rather than individual messages',async()=>{
 const budget=createReadBudget(),tool=prepareStaff('conversation.context',{conversationId:id},principal);
 await budget.run({rpc:async()=>({data:dto(tool.intent,[{id:'message-id'}])})},tool);
 assert.deepEqual(budget.snapshot().staff_scope_refs,[{kind:'permission',permission:'work.chat.handle'},{kind:'conversation',id,permission:'work.chat.handle'}]);
});
test('concurrent reads retain both scopes and repeated reads deduplicate references',async()=>{
 const budget=createReadBudget(),tool=prepareStaff('appointment.search',{},principal),other=prepareStaff('conversation.list',{status:'waiting_agent'},principal);
 await Promise.all([budget.run({rpc:async()=>({data:dto(tool.intent,[{id}])})},tool),budget.run({rpc:async()=>({data:dto(other.intent,[{id}])})},other)]);
 await budget.run({rpc:async()=>({data:dto(tool.intent,[{id}])})},tool);
 const refs=budget.snapshot().staff_scope_refs;assert.equal(refs.length,4);assert.ok(refs.some(r=>r.kind==='appointment'));assert.ok(refs.some(r=>r.kind==='queue'));
});
test('customer relations need both serving-customer and domain permissions before transport',()=>{
 const all={system_role:'STAFF',permissions:['work.copilot.use','work.customer.read','work.pet.read']};
 for(const missing of ['work.customer.read','work.pet.read'])assert.throws(()=>prepareStaff('internal.customer_pets',{customerId:id},{...all,permissions:all.permissions.filter(p=>p!==missing)}),e=>e.code==='42501');
 assert.throws(()=>prepareStaff('internal.customer_appointment',{customerId:id},{...all,permissions:[...all.permissions,'work.service.perform']}),e=>e.message==='invalid_case_direction');
});
test('relation responses for another customer are rejected even if the result is empty',async()=>{
 const all={system_role:'STAFF',permissions:['work.copilot.use','work.customer.read','work.pet.read']},tool=prepareStaff('internal.customer_pets',{customerId:id},all);
 for(const items of [[],[{id,customer_id:'another-customer'}]]){
  const budget=createReadBudget();await assert.rejects(()=>budget.run({rpc:async()=>({data:{...dto(tool.intent,items),scope:{customerId:'another-customer'}}})},tool),e=>e.message==='invalid_staff_customer_relation');assert.equal(budget.snapshot().staff_scope_refs,undefined);
 }
});
test('empty relationship reads retain the parent and both required permissions for history',async()=>{
 const all={system_role:'STAFF',permissions:['work.copilot.use','work.customer.read','work.pet.read']},tool=prepareStaff('internal.customer_pets',{customerId:id},all),budget=createReadBudget();
 await budget.run({rpc:async()=>({data:{...dto(tool.intent,[]),scope:{customerId:id}}})},tool);
 assert.deepEqual(budget.snapshot().staff_scope_refs,[{kind:'permission',permission:'work.pet.read'},{kind:'permission',permission:'work.customer.read'},{kind:'customer',id,permission:'work.customer.read'}]);
});
const bookingPrincipal={system_role:'STAFF',permissions:['work.copilot.use','work.booking.create']};
test('booking reads reject missing periods and invalid conditions before transport',()=>{
 for(const[intent,filters]of [['hotel.availability',{}],['hotel.availability',{start_at:'2026-11-01',end_at:'2027-01-01'}],['catalog.price_rows',{query:'Service',weight:'1001'}],['catalog.service_price',{query:'Service',distance:'Infinity'}]])assert.throws(()=>prepareStaff(intent,filters,bookingPrincipal),e=>e.code==='22023');
 assert.throws(()=>prepareStaff('catalog.price_rows',{query:'Service'},{...bookingPrincipal,permissions:['work.copilot.use','work.service.perform']}),e=>e.code==='42501');
});
test('price sources must belong to the resolved service rather than an unrelated price row',async()=>{
 const tool=prepareStaff('catalog.price_rows',{query:'Service'},bookingPrincipal),budget=createReadBudget();
 const data={...dto(tool.intent,[{id,source_kind:'service_price',service_id:'different'}]),service_id:id,match_count:1,match_limit:2,ambiguous:false};
 await assert.rejects(()=>budget.run({rpc:async()=>({data})},tool),e=>e.message==='invalid_staff_source_reference');assert.equal(budget.snapshot().staff_scope_refs,undefined);
});
test('room counts are page-only and room availability must agree with reservation and occupancy',async()=>{
 const tool=prepareStaff('hotel.availability',{start_at:'2026-11-01',end_at:'2026-11-02'},bookingPrincipal);
 for(const overrides of [{available_is_page:false},{available:14},{items:[{id,source_kind:'room',available:true,reserved:true,occupied:false}]}]){
  const budget=createReadBudget(),data={...dto(tool.intent,[{id,source_kind:'room',available:true,reserved:false,occupied:false}]),available:1,unavailable:0,available_is_page:true,...overrides};
  await assert.rejects(()=>budget.run({rpc:async()=>({data})},tool),e=>e.message==='invalid_staff_room_result');assert.equal(budget.snapshot().staff_scope_refs,undefined);
 }
});
test('price ambiguity cannot emit rows and an empty price result still keeps booking permission',async()=>{
 const tool=prepareStaff('catalog.service_price',{query:'Service'},bookingPrincipal),budget=createReadBudget();
 const data={...dto(tool.intent,[]),service_id:null,match_count:2,match_limit:2,ambiguous:true};
 await budget.run({rpc:async()=>({data})},tool);assert.deepEqual(budget.snapshot().staff_scope_refs,[{kind:'permission',permission:'work.booking.create'}]);
 await assert.rejects(()=>createReadBudget().run({rpc:async()=>({data:{...data,items:[{id}],total:1}})},tool),e=>e.message==='invalid_staff_price_identity');
});
