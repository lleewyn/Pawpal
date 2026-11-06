const {test}=require('node:test'),assert=require('node:assert/strict');
const {createStaffAuthHandlers}=require('../api/staff_auth.js');
const id='16500000-0000-4000-8000-000000000001';
function fixture(roles=['STAFF'],permissions=['work.self.read'],overrides={}){
 const calls=[];
 const staff={id,auth_user_id:id,must_change_password:false,access_roles:roles,permission_codes:permissions,...overrides};
 const handlers=createStaffAuthHandlers({url:'https://example.invalid',anonKey:'unit-anon',serviceKey:'unit-service',fetch:async(input,init)=>{
  const pathname=new URL(String(input)).pathname;calls.push(pathname);
  if(pathname==='/auth/v1/user')return new Response(JSON.stringify({id,email:'unit@example.invalid'}),{status:200,headers:{'Content-Type':'application/json'}});
  if(pathname==='/rest/v1/rpc/get_staff_login_context')return new Response(JSON.stringify({is_staff:true,is_active:true,staff}),{status:200,headers:{'Content-Type':'application/json'}});
  throw Error('Unexpected side effect or network request: '+pathname);
 }});
 return {handlers,calls};
}
const request=body=>({method:'POST',headers:{authorization:'Bearer unit-token'},body});
const response=()=>({statusCode:200,setHeader(){},status(code){this.statusCode=code;return this;},json(body){this.body=body;return this;}});
test('STAFF context verifies but cannot claim ADMIN from request body',async()=>{
 const f=fixture();const req=request({role:'ADMIN',permissions:['staff.write']});
 assert.equal((await f.handlers.verifyStaffCaller(req)).authorized,true);
 const denied=await f.handlers.verifyAdminCaller(req);assert.equal(denied.authorized,false);assert.equal(denied.status,403);
});
test('Missing, unknown, duplicate and multiple roles fail closed',async()=>{
 for(const roles of [undefined,[],['MANAGER'],['ADMIN','STAFF'],['ADMIN','ADMIN']]){
  const f=fixture(roles===undefined?null:roles);const result=await f.handlers.verifyStaffCaller(request({}));
  assert.equal(result.authorized,false);assert.equal(result.status,403);
 }
});
test('Empty or malformed permission contexts cannot access staff APIs',async()=>{
 for(const permissions of [[],null,['work.self.read',1]]){
  const result=await fixture(['STAFF'],permissions).handlers.verifyStaffCaller(request({}));
  assert.equal(result.authorized,false);assert.equal(result.status,403);
 }
 const changed=await fixture(['STAFF'],['work.self.read'],{must_change_password:true}).handlers.verifyStaffCaller(request({}));
 assert.equal(changed.authorized,false);
});
test('Provisioning rejects invalid roles and personal permissions before Auth mutations',async()=>{
 for(const body of [{roles:[],permissions:[]},{roles:['MANAGER'],permissions:[]},{roles:['ADMIN','STAFF'],permissions:[]},
  {roles:['STAFF','STAFF'],permissions:[]},{roles:['STAFF'],permissions:['payment.write']},{roles:['STAFF'],permissions:{}}]){
  const f=fixture(['ADMIN'],['staff.write']);const res=response();await f.handlers.provisionAccount(request(body),res);
  assert.equal(res.statusCode,400);assert.deepEqual(f.calls,['/auth/v1/user','/rest/v1/rpc/get_staff_login_context']);
 }
});
test('Employees cannot provision, reset or unlock accounts',async()=>{
 const f=fixture();
 for(const [handler,body] of [['provisionAccount',{}],['resetPassword',{}],['toggleAccountStatus',{action:'unlock'}]]){
  const res=response();await f.handlers[handler](request(body),res);assert.equal(res.statusCode,403);
 }
 assert.ok(f.calls.every(path=>path==='/auth/v1/user'||path==='/rest/v1/rpc/get_staff_login_context'));
});
test('Unauthenticated callers receive 401 without contacting Auth or the database',async()=>{
 const f=fixture();const result=await f.handlers.verifyStaffCaller({headers:{}});assert.equal(result.status,401);assert.deepEqual(f.calls,[]);
});
