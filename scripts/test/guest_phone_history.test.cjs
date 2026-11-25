const {test}=require('node:test'),assert=require('node:assert/strict');
const {createGuestPhoneHistory}=require('../../my-server/scripts/api/guest_phone_history');
const {hashOtp}=require('../../my-server/scripts/api/customer_auth_store');
const orderId='00000000-0000-0000-0000-000000000011';
test('verified history pages return 10/10/3 and reject altered or cross-phone grants',async()=>{
 const f=fixture({rowCount:23}),{cookie,challengeId}=await f.begin();
 const first=await f.send({phone:'0908887766',challengeId,code:'555666'},cookie);
 assert.equal(first.code,200);assert.equal(first.data.orders.length,10);assert.equal(first.data.bookings.length,10);assert.equal(first.data.pagination.hasMore,true);
 const grant=first.data.pagination.grant;
 const next=await f.send({phone:'0908887766',historyPage:{grant,page:1}});
 assert.equal(next.code,200);assert.equal(next.data.orders.length,10);assert.notEqual(first.data.orders[0].id,next.data.orders[0].id);
 const last=await f.send({phone:'0908887766',historyPage:{grant,page:2}});
 assert.equal(last.code,200);assert.equal(last.data.orders.length,3);assert.equal(last.data.pagination.hasMore,false);
 const before=f.reads.length;
 for(const body of [{phone:'0908887766',historyPage:{grant:grant+'x',page:1}},{phone:'0908887765',historyPage:{grant,page:1}},{phone:'0908887766',historyPage:{grant,page:-1}}])assert.equal((await f.send(body)).code,400);
 assert.equal(f.reads.length,before);
});
function fixture({production=false,demo=true,member=false,locked=false,verifyFails=false,smsFails=false,otpPreviewOrigin=null,otpTestPhones=[],rowCount=1,payments=[],total=100}={}){
 const challenges=new Map(),reads=[],sms=[],authChecks=[],writes=[];
 const store={async limit(){},async issue(value){assert.equal(challenges.has(value.id),false,'challenge IDs cannot be issued twice');challenges.set(value.id,{...value,status:'pending',attempts:0})},async activate(id,ok){challenges.get(id).status=ok?'active':'failed'},
  async claim(id,mode,hash,claimId){const c=challenges.get(id);if(!c||c.mode!==mode||c.status!=='active'||c.attempts>=5)throw Error('Expired challenge');c.attempts++;if(c.hash&&hash!==c.hash)throw Error('Wrong code');c.status='claimed';c.claimId=claimId;return c},
  async finish(id,claimId,ok){const c=challenges.get(id);assert.equal(c.claimId,claimId);c.status=ok?'consumed':'active'}};
 const admin={from(table){const read={table,filters:[]};reads.push(read);const q={select(){return q},eq(key,value){read.filters.push([key,value]);return q},in(key,value){read.filters.push([key,value]);read.ids=value;return q},order(){return q},
  async maybeSingle(){return {data:table==='customer_profile'?{full_name:'Khách thử nghiệm'}:{id:'customer-id',auth_user_id:member?'member-id':null,customer_status:locked?'locked':'active'}}},
  range(start,end){read.range=[start,end];return q;},limit(count,opts){(read.limits??=[]).push({count,opts});return q;},then(resolve){return Promise.resolve({data:table==='customer'?(read.ids?read.ids.map(id=>({id,auth_user_id:member?'member-id':null,customer_status:locked?'locked':'active'})):[]):table==='customer_phone'?[{customer_id:'customer-id'}]:table==='staff'?[]:table==='sales_order_totals'?read.ids.map(order_id=>({order_id,total_amount:total})):Array.from({length:rowCount},(_,i)=>table==='sales_order'?{id:i===0?orderId:'00000000-0000-0000-0000-'+String(i+11).padStart(12,'0'),payments}:{id:table+'-'+i}).slice(read.range?.[0]||0,(read.range?.[1]??(rowCount-1))+1)}).then(resolve)}};return q},
  async rpc(name,args){writes.push({name,args});return {data:args.p_id};}};
 const clientFactory=()=>({auth:{
  async signInWithOtp(value){sms.push(value);return smsFails?{error:Error('provider unavailable')}:{}},
  async verifyOtp(value){authChecks.push(value);return verifyFails?{error:Error('wrong')}:{data:{user:{phone:'+84908887766'}}};}
 }});
 const handle=createGuestPhoneHistory({admin,secret:'test-secret-with-at-least-32-bytes-long',production,demo,store,clientFactory,otpPreviewOrigin,otpTestPhones});
 const origin=otpPreviewOrigin||(production?'https://pawpal.test':'http://localhost:4000');
 async function send(body,cookie,overrideOrigin=origin){const res={code:200,headers:{},setHeader(k,v){this.headers[k]=v},status(c){this.code=c;return this},json(data){this.data=data;return this}};await handle({body,headers:{origin:overrideOrigin,cookie},socket:{remoteAddress:'test'}},res);return res;}
 return {send,reads,challenges,sms,authChecks,writes,async begin(){const res=await send({phone:'0908887766'});assert.equal(res.code,200);return {challengeId:res.data.challengeId,cookie:res.headers['Set-Cookie'].split(';')[0],res}}};
}
test('verified history uses the authoritative total and net collection without exposing payment rows',async()=>{
 const collected={amount:120,transaction_status:'succeeded',method:{short_name:'COD'}};
 for(const [payments,total,status] of [
  [[collected],100,'paid'],
  [[{...collected,refunds:[{refund_status:'succeeded',refunded_amount:30}]}],100,'partial'],
  [[{...collected,refunds:[{refund_status:'succeeded',refunded_amount:120}]}],100,'refunded'],
  [[{...collected,refunds:[{refund_status:'pending',refunded_amount:120}]}],100,'pending_refund'],
  [[{...collected,transaction_status:'pending'}],100,'pending'],
  [[],0,'not_required']
 ]){
  const f=fixture({payments,total}),{cookie,challengeId}=await f.begin();
  const {data}=await f.send({phone:'0908887766',challengeId,code:'555666'},cookie);
  assert.equal(data.orders[0].payment_status,status);
  assert.equal(data.orders[0].total_amount,total);
  assert.equal(Object.hasOwn(data.orders[0],'payments'),false);
 }
});
test('legacy lookup requests a server challenge without reading history or creating a member',async()=>{
 const f=fixture(),{res}=await f.begin();assert.equal(res.data.requiresOtp,true);assert.equal(res.data.testCode,'555666');assert.equal(res.data.customer,undefined);assert.ok(!f.reads.some(r=>['appointment','sales_order','customer_profile'].includes(r.table)));assert.equal(f.sms.length,0);
});
test('valid local OTP returns only the legacy phone owner history and consumes the challenge',async()=>{
 const f=fixture(),{cookie,challengeId}=await f.begin();const res=await f.send({phone:'0908887766',challengeId,code:'555666'},cookie);
 assert.equal(res.code,200);assert.equal(res.data.bookings.length,1);assert.equal(res.data.orders.length,1);assert.ok(f.reads.find(r=>r.table==='sales_order').limits.some(l=>l.count===1&&l.opts?.referencedTable?.endsWith('product_media')));
 assert.deepEqual(res.data.customer,{name:'Khách thử nghiệm',phone:'0908887766'});
 assert.deepEqual(f.reads.find(r=>r.table==='customer_profile').filters,[['customer_id','customer-id']]);
 for(const r of f.reads.filter(r=>['appointment','sales_order'].includes(r.table)))assert.deepEqual(r.filters,[['customer_id',['customer-id']]]);
 assert.equal((await f.send({phone:'0908887766',challengeId,code:'555666'},cookie)).code,400);
});
test('wrong OTP, missing/tampered cookie, cross-phone and registration OTP hashes cannot disclose history',async()=>{
 for(const kind of ['wrong','missing','tampered','phone','registration']){
  const f=fixture(),{cookie,challengeId}=await f.begin();
  if(kind==='registration')f.challenges.get(challengeId).hash=hashOtp(challengeId,'555666');
  const res=await f.send({phone:kind==='phone'?'0901234567':'0908887766',challengeId,code:kind==='wrong'?'000000':'555666'},kind==='missing'?undefined:kind==='tampered'?cookie+'x':cookie);
  assert.equal(res.code,400);assert.ok(!f.reads.some(r=>['appointment','sales_order'].includes(r.table)));
 }
});
test('locked and member profiles do not issue guest history challenges',async()=>{
 for(const config of [{locked:true},{member:true}]){const f=fixture(config),res=await f.send({phone:'0908887766'});assert.equal(res.code,400);assert.equal(f.challenges.size,0);}
});
test('explicit SMS mode uses real verification',async()=>{
 const f=fixture({production:true,demo:false}),{cookie,challengeId,res}=await f.begin();assert.equal(res.data.testCode,undefined);assert.equal(f.sms.length,1);
 assert.equal((await f.send({phone:'0908887766',challengeId,code:'123456'},cookie)).code,200);assert.equal(f.authChecks.length,1);
 assert.match(res.headers['Set-Cookie'],/; Secure/);
});
test('Preview mocks OTP only for configured test phones on the preview origin',async()=>{
 const f=fixture({production:true,demo:false,otpPreviewOrigin:'https://preview.pawpal.test',otpTestPhones:['0908887766']});
 assert.equal((await f.send({phone:'0901234567'})).code,400);
 const {res,challengeId,cookie}=await f.begin();
 assert.equal(res.data.testCode,'555666');assert.equal(f.sms.length,0);
 assert.equal((await f.send({phone:'0908887766',challengeId,code:'000000'},cookie)).code,400);
 assert.equal((await f.send({phone:'0908887766',challengeId,code:'555666'},cookie)).code,200);
 const outside=await f.send({phone:'0908887766'},undefined,'https://pawpal.test');
 assert.equal(outside.data.testCode,undefined);assert.equal(f.sms.length,1);
});
test('failed SMS verification cannot read history',async()=>{
 const f=fixture({production:true,demo:false,verifyFails:true}),{cookie,challengeId}=await f.begin();assert.equal((await f.send({phone:'0908887766',challengeId,code:'123456'},cookie)).code,400);assert.ok(!f.reads.some(r=>['appointment','sales_order'].includes(r.table)));
});
test('configured demo OTP works with secure production cookies without contacting SMS',async()=>{
 const f=fixture({production:true,demo:true,smsFails:true}),{cookie,challengeId,res}=await f.begin();assert.equal(res.data.testCode,'555666');assert.equal(f.sms.length,0);
 assert.equal((await f.send({phone:'0908887766',challengeId,code:'555666'},cookie)).code,200);assert.equal(f.challenges.size,1);
});
test('SMS outage fails one challenge without duplicating or silently switching OTP mode',async()=>{
 const f=fixture({production:true,demo:false,smsFails:true}),res=await f.send({phone:'0908887766'});assert.equal(res.code,503);assert.equal(f.challenges.size,1);assert.equal([...f.challenges.values()][0].status,'failed');assert.equal(res.data.testCode,undefined);
});
test('a guest return grant is issued only after verification and is bound to the verified phone and order',async()=>{
 const f=fixture(),{cookie,challengeId}=await f.begin();
 const {data}=await f.send({phone:'0908887766',challengeId,code:'555666'},cookie);
 const request={id:'00000000-0000-0000-0000-000000000012',orderId,grant:data.orders[0].return_grant,
  reason:'Sản phẩm có lỗi',lines:[{line_id:'00000000-0000-0000-0000-000000000013',quantity:1}]};
 assert.equal((await f.send({phone:'0901234567',returnRequest:request})).code,400);
 assert.equal((await f.send({phone:'0908887766',returnRequest:{...request,orderId:request.id}})).code,400);
 assert.equal(f.writes.length,0);
 assert.equal((await f.send({phone:'0908887766',returnRequest:request})).data.returnId,request.id);
 assert.deepEqual(f.writes.map(w=>w.name),['create_verified_guest_return']);
});
