const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const admission=require('../api/chat_read_admission.js'),tools=require('../api/chat_read_tools.js');
test('STAFF admission binds request/session/question to a closed RPC and rejects malformed lease responses',async()=>{
 const request={requestId:randomUUID(),sessionId:randomUUID(),question:'Current work'},lease=randomUUID(),calls=[];
 const data={lease,scope_token:'a'.repeat(32),scope_version:1,expires_at:new Date().toISOString()};
 const result=await admission.acquireStaff({rpc:async(name,args)=>{calls.push({name,args});return{data};}},request);
 assert.ok(Object.isFrozen(result));assert.deepEqual(calls,[{name:'acquire_staff_copilot_request',args:{p_request:request.requestId,p_session:request.sessionId,p_question:request.question}}]);
 for(const bad of [null,{...data,lease:'bad'},{...data,scope_version:2},{...data,scope_token:'bad'}])await assert.rejects(()=>admission.acquireStaff({rpc:async()=>({data:bad})},request),e=>e.code==='58000');
});
test('STAFF acquisition and release preserve native busy/ownership errors instead of using administrative admission',async()=>{
 const error={code:'PT429',message:'busy'};await assert.rejects(()=>admission.acquireStaff({rpc:async()=>({error})},{}),e=>e===error);
 const calls=[];await admission.releaseStaff({rpc:async(name,args)=>{calls.push({name,args});return{};}},'lease');assert.deepEqual(calls,[{name:'release_staff_copilot_request',args:{p_lease:'lease'}}]);
 await assert.rejects(()=>admission.releaseStaff({rpc:async()=>({error})},'lease'),e=>e===error);
});
test('a STAFF leased descriptor always selects the scoped shared wrapper with bounded arguments',async()=>{
 const lease=randomUUID(),principal={system_role:'STAFF',permissions:['work.copilot.use','work.self.read']},prepared=tools.prepareStaff('staff.lookup',{},principal),calls=[];
 const budget=tools.createReadBudget({lease});await budget.run({rpc:async(name,args)=>{calls.push({name,args});return{data:{intent:'staff.lookup',items:[],audience:'staff',total:0,total_is_page:true,page_size:10}};}},prepared);
 assert.deepEqual(calls,[{name:'run_staff_copilot_read',args:{p_lease:lease,p_tool:'staff.lookup',p_filters:{},p_max_bytes:32768}}]);assert.equal(budget.snapshot().calls,1);
});
test('STAFF context reads once through its own lease RPC and enforces role, provenance, row and byte bounds',async()=>{
 const row={role:'assistant',content:'\u{1f43e}'.repeat(1200),metadata:{scope_version:1,scope_refs:[]}},calls=[];
 const result=await admission.readStaffContext({rpc:async(name,args)=>{calls.push({name,args});return{data:[row]};}},'lease');assert.deepEqual(result,[row]);assert.deepEqual(calls,[{name:'read_staff_copilot_request_context',args:{p_lease:'lease'}}]);
 for(const data of [{},Array(7).fill(row),[{...row,role:'system'}],[{...row,content:'x'.repeat(1201)}],[{...row,metadata:{scope_version:1}}],[{...row,metadata:{scope_version:2,scope_refs:[]}}]])await assert.rejects(()=>admission.readStaffContext({rpc:async()=>({data})},'lease'),e=>e.code==='XX000');
});
