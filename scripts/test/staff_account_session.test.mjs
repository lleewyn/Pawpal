import {test} from 'node:test';
import assert from 'node:assert/strict';
import {requestStaffAccount} from '../../my-client/scripts/shared/staff-account-request.mjs';
const body={requestId:'session-retry-request',staffId:'same-new-staff',roles:['STAFF'],permissions:[]};
const reply=(status,value={success:false,message:'Không thể lưu.'})=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
function fixture(responses,refresh={data:{session:{access_token:'fresh',user:{id:'admin'}}}}){
 const calls=[];let refreshes=0;
 return {calls,get refreshes(){return refreshes;},client:{auth:{getSession:async()=>({data:{session:{access_token:'stale',user:{id:'admin'}}}}),refreshSession:async()=>{refreshes++;return refresh;}}},fetchImpl:async(url,options)=>{calls.push({url,...options});const response=responses.shift();if(response instanceof Error)throw response;assert.ok(response,'Unexpected extra request');return response;}};
}
test('401 refreshes once and reuses exact provisioning request and fixed STAFF role',async()=>{
 const f=fixture([reply(401),reply(200,{success:true,staffId:body.staffId})]);
 assert.equal((await requestStaffAccount(f.client,'provision-account',body,f)).staffId,body.staffId);
 assert.equal(f.refreshes,1);assert.equal(f.calls.length,2);assert.equal(f.calls[0].body,f.calls[1].body);
 assert.deepEqual(JSON.parse(f.calls[1].body),body);assert.equal(f.calls[1].headers.Authorization,'Bearer fresh');
});
test('valid session sends only one request without refresh',async()=>{
 const f=fixture([reply(200,{success:true})]);await requestStaffAccount(f.client,'provision-account',body,f);assert.equal(f.calls.length,1);assert.equal(f.refreshes,0);
});
test('repeated 401 stops after one refresh with an actionable form error',async()=>{
 const f=fixture([reply(401),reply(401)]);await assert.rejects(requestStaffAccount(f.client,'provision-account',body,f),error=>error.staffAccountError&&/đăng nhập lại/.test(error.message));assert.equal(f.refreshes,1);assert.equal(f.calls.length,2);
});
test('failed refresh and account switch never resend provisioning',async()=>{
 for(const refresh of [{error:Error('refresh expired')},{data:{session:{access_token:'other',user:{id:'other-admin'}}}}]){
  const f=fixture([reply(401)],refresh);await assert.rejects(requestStaffAccount(f.client,'provision-account',body,f),error=>error.staffAccountError===true);assert.equal(f.calls.length,1);
 }
});
test('permission, validation, conflict and service errors never trigger auth retries',async()=>{
 for(const status of [400,403,409,503]){
  const f=fixture([reply(status,{success:false,message:'Lỗi nghiệp vụ',field:'staffInputPhone'})]);await assert.rejects(requestStaffAccount(f.client,'provision-account',body,f),error=>error.field==='staffInputPhone'&&error.staffAccountError);assert.equal(f.calls.length,1);assert.equal(f.refreshes,0);
 }
});
test('lost responses are not blindly retried after possible business writes',async()=>{
 const f=fixture([Error('connection lost')]);await assert.rejects(requestStaffAccount(f.client,'provision-account',body,f),/connection lost/);assert.equal(f.calls.length,1);assert.equal(f.refreshes,0);
});
