const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createGuestPhoneHistory}=require('../api/guest_phone_history');
const {createGuestCommerce}=require('../api/guest_commerce');
const secret='cancellation-test-secret-at-least-32-bytes',orderId=crypto.randomUUID(),id=crypto.randomUUID(),phone='0950000001';
const response=()=>({headers:{},statusCode:200,setHeader(k,v){this.headers[k]=v;},status(n){this.statusCode=n;return this;},json(v){this.data=v;return this;}});
test('OTP cancellation proof is bound to order, phone, action and expiry',async()=>{
 let calls=0,args;const now=Date.now(),expires=Math.floor(now/1000)+900;
 const sign=(scope,value)=>crypto.createHmac('sha256',secret).update(scope+':v1\0'+value).digest('base64url');
 const grant=expires+'.'+sign('guest-cancel',orderId+'.'+phone+'.'+expires);
 const handler=createGuestPhoneHistory({secret,now:()=>now,store:{},admin:{rpc:async(name,a)=>{assert.equal(name,'cancel_verified_guest_sales_order');calls++;args=a;return {data:id};}}});
 const send=async(p=phone,g=grant,o=orderId)=>{const res=response();await handler({body:{phone:p,cancelRequest:{id,orderId:o,grant:g,reason:'Tôi muốn thay đổi địa chỉ giao hàng',expectedUpdatedAt:'2026-11-12T10:00:00Z'}},headers:{}},res);return res;};
 assert.equal((await send()).data.success,true);assert.equal(args.p_phone,phone);assert.equal(calls,1);
 for(const [p,g,o] of [[phone,grant,crypto.randomUUID()],['0950000002',grant,orderId],[phone,expires+'.'+sign('guest-return',orderId+'.'+phone+'.'+expires),orderId],[phone,'1000000000.'+'a'.repeat(43),orderId]])assert.equal((await send(p,g,o)).statusCode,400);
 assert.equal(calls,1);
});
test('Cookie cancellation requires signed session and strict body before privileged RPC',async()=>{
 let calls=[];
 const handler=createGuestCommerce({secret,origins:['https://pawpal.test'],limit:async()=>{},admin:{rpc:async(name,args)=>{calls.push({name,args});return {data:name==='guest_sales_receipt'?{id:orderId,status:'cancelled'}:id};}}});
 const send=async(action,body,cookie)=>{const res=response();await handler({method:'POST',body,headers:{origin:'https://pawpal.test','content-type':'application/json',cookie}},res,action);return res;};
 const cookie=(await send('session',{})).headers['Set-Cookie'].split(';')[0];
 const payload={requestId:id,orderId,expectedUpdatedAt:'2026-11-12T10:00:00Z',reason:'Đổi ý, không muốn mua nữa'};
 assert.equal((await send('order-cancel',payload)).statusCode,401);assert.equal(calls.length,0);
 for(const bad of [{...payload,customerId:id},{...payload,reason:''},{...payload,expectedUpdatedAt:'invalid'}])assert.equal((await send('order-cancel',bad,cookie)).statusCode,400);
 assert.equal(calls.length,0);assert.equal((await send('order-cancel',payload,cookie)).data.success,true);
 assert.deepEqual(calls.map(c=>c.name),['cancel_guest_sales_order','guest_sales_receipt']);assert.equal(calls[0].args.p_details.reason,payload.reason);
});
