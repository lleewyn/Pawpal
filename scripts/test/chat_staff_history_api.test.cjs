const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto'),{createHandler}=require('../../api/admin-chat.js');
function fixture({finalRole='STAFF',finalUser,scopeChanged=false,error=null,data={history:[]},freshDenied=false}={}){
 const staffId=randomUUID(),userId=randomUUID(),calls=[],verifications=[];
 const caller={rpc:async(name,args)=>{calls.push({name,args});if(name==='get_staff_copilot_scope')return {data:{staff_id:staffId,scope_version:1,scope_token:scopeChanged&&calls.length>2?'b'.repeat(32):'a'.repeat(32)}};return error?{error}:{data};}};
 const handler=createHandler({verify:async(req,required)=>{verifications.push(required);if(freshDenied&&verifications.length>1)return {authorized:false,status:403,message:'Revoked'};return {authorized:true,staff:{id:staffId,system_role:verifications.length>1?finalRole:'STAFF',permissions:['work.copilot.use']},user:{id:verifications.length>1&&finalUser?finalUser:userId},caller};},generateReply:async()=>{throw Error('STAFF must not call model');},serviceClient:{from(){throw Error('STAFF must not use legacy service reads');}}});
 const invoke=async(method='GET',query={},body={})=>{const res={statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.statusCode=n;return this;},json(data){this.data=data;return this;}};await handler({method,query,body,headers:{}},res);return res;};return {invoke,calls,verifications};
}
test('STAFF history uses only own native RPCs and rechecks Auth/scope before emitting content',async()=>{
 const f=fixture({data:{history:[{content:'Scoped answer'}]}}),sessionId=randomUUID(),res=await f.invoke('GET',{sessionId,withTitle:'1'});
 assert.equal(res.statusCode,200);assert.equal(res.headers['Cache-Control'],'no-store');assert.deepEqual(f.calls.map(c=>c.name),['get_staff_copilot_scope','staff_copilot_history_page','get_staff_copilot_scope']);assert.deepEqual(f.calls[1].args,{p_session:sessionId,p_offset:0,p_with_title:true});assert.equal(f.verifications.length,2);
});
test('STAFF session list, parts and deletion use closed native arguments with no actor supplied',async()=>{
 const id=randomUUID();for(const[method,query,body,rpc]of [['GET',{view:'sessions',page:'2',query:'Guide'},{},'staff_copilot_sessions'],['GET',{view:'message_part',messageId:id,offset:'1200',revision:'a'.repeat(32)},{},'staff_copilot_message_part'],['DELETE',{}, {sessionId:id},'delete_staff_copilot_session']]){const f=fixture(),res=await f.invoke(method,query,body);assert.equal(res.statusCode,200);assert.equal(f.calls[1].name,rpc);assert.ok(!Object.hasOwn(f.calls[1].args,'p_actor'));}
});
test('STAFF cannot generate, benchmark, save arbitrary answers or use legacy history paths',async()=>{
 for(const body of [{question:'Revenue',requestId:randomUUID(),sessionId:randomUUID()},{action:'benchmark'},{action:'save',answer:'Forged'}]){const f=fixture(),res=await f.invoke('POST',{},body);assert.equal(res.statusCode,403);assert.equal(f.calls.length,0);}
 for(const query of [{view:'recent_context'},{view:'replay'},{staffId:randomUUID()},{view:'sessions',actor:randomUUID()}]){const f=fixture(),res=await f.invoke('GET',query);assert.equal(res.statusCode,400);assert.ok(f.calls.every(c=>c.name==='get_staff_copilot_scope'));}
});
test('Auth/role/scope changes after the read suppress content rather than returning stale success',async()=>{
 for(const options of [{finalRole:'ADMIN'},{finalUser:randomUUID()},{freshDenied:true},{scopeChanged:true}]){const f=fixture({...options,data:{history:[{content:'MUST_NOT_LEAK'}]}}),res=await f.invoke();assert.ok([403,409].includes(res.statusCode));assert.equal(res.data.ok,false);assert.ok(!JSON.stringify(res.data).includes('MUST_NOT_LEAK'));}
});
test('native history errors retain denial/conflict/validation status and oversized results are withheld',async()=>{
 for(const[code,status]of [['42501',403],['PT409',409],['22023',400],['54000',413],['XX000',503]]){const f=fixture({error:{code}}),res=await f.invoke();assert.equal(res.statusCode,status);assert.equal(res.data.ok,false);}
 const f=fixture({data:{history:[{content:'x'.repeat(33000)}]}});assert.equal((await f.invoke()).statusCode,413);
});
test('STAFF history rejects malformed pages, revisions, actor fields and delete payload before data RPC',async()=>{
 for(const[method,query,body]of [['GET',{view:'sessions',page:'1001'},{}],['GET',{view:'history',offset:'-1'},{}],['GET',{view:'history',sessionId:'bad'},{}],['GET',{view:'message_part',messageId:randomUUID(),offset:'16001',revision:'a'.repeat(32)},{}],['DELETE',{}, {sessionId:randomUUID(),actor:randomUUID()}]]){const f=fixture(),res=await f.invoke(method,query,body);assert.equal(res.statusCode,400);assert.ok(f.calls.every(c=>c.name==='get_staff_copilot_scope'));}
});
test('STAFF history applies its own per-process per-Auth minute budget before further data reads',async()=>{
 const f=fixture();for(let n=0;n<60;n++)assert.equal((await f.invoke()).statusCode,200);
 const count=f.calls.length,res=await f.invoke();assert.equal(res.statusCode,429);assert.equal(f.calls.length,count);
});
test('a management identity with only the work capability cannot enter legacy administrative history',async()=>{
 const handler=createHandler({verify:async()=>({authorized:true,staff:{system_role:'ADMIN',permissions:['work.copilot.use']}})});
 const res={statusCode:200,setHeader(){},status(n){this.statusCode=n;return this;},json(data){this.data=data;return this;}};
 await handler({method:'GET',query:{view:'sessions'},headers:{}},res);assert.equal(res.statusCode,403);assert.equal(res.data.ok,false);
});
