const {test}=require('node:test'),assert=require('node:assert/strict');
const {createGuestCommerce}=require('../api/guest_commerce');
test('Canonical legacy catalog UUIDs reach RPC without requiring RFC version bits',async()=>{
 let args;
 const handler=createGuestCommerce({admin:{rpc:async(name,values)=>{assert.equal(name,'guest_booking_quote');args=values;return {data:{version:'a'.repeat(32),total:80000}};}},secret:'test-secret-with-at-least-32-bytes-long',origins:['https://pawpal.test'],production:true,limit:async()=>{}});
 const send=async(action,body={},cookie)=>{const res={headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.statusCode=n;return this;},json(v){this.data=v;return this;}};await handler({method:'POST',body,headers:{origin:'https://pawpal.test','content-type':'application/json',cookie}},res,action);return res;};
 const cookie=(await send('session')).headers['Set-Cookie'].split(';')[0];
 const details={pet_id:'11111111-1111-4111-8111-111111111111',service_id:'c0000000-0000-0000-0000-000000000004',scheduled_start_at:'2030-01-01T10:00:00+07:00'};
 const result=await send('booking-quote',{details},cookie);assert.equal(result.data.success,true);assert.equal(args.p_details.service_id,details.service_id);
});
test('Unbound first-write receipt preserves signed cookie; revoked and invalid cookies remain denied',async()=>{
 for(const initialized of [false,true,'revoked']){
  let calls=0;
  const handler=createGuestCommerce({admin:{rpc:async name=>{calls++;if(name==='guest_commerce_context'&&initialized!=='revoked')return {data:{initialized}};return {error:{code:'42501',message:'guest_session_invalid'}};}},secret:'test-secret-with-at-least-32-bytes-long',origins:['https://pawpal.test'],production:true,limit:async()=>{}});
  const send=async(action,body={},cookie)=>{const res={headers:{},statusCode:200,setHeader(k,v){this.headers[k]=v;},status(n){this.statusCode=n;return this;},json(v){this.data=v;return this;}};await handler({method:'POST',body,headers:{origin:'https://pawpal.test','content-type':'application/json',cookie},socket:{remoteAddress:'test'}},res,action);return res;};
  const cookie=(await send('session')).headers['Set-Cookie'].split(';')[0];
  const result=await send('order-receipt',{requestId:'11111111-1111-4111-8111-111111111111'},cookie);
  assert.equal(result.statusCode,initialized===false?404:401);assert.equal(calls,2);
  if(initialized===false)assert.equal(result.headers['Set-Cookie'],undefined);else assert.match(result.headers['Set-Cookie'],/Max-Age=0/);
  calls=0;assert.equal((await send('order-receipt',{requestId:'11111111-1111-4111-8111-111111111111'},cookie+'x')).statusCode,401);assert.equal(calls,0);
 }
});
function setup(limit=async()=>{}){
 let calls=0;
 const handler=createGuestCommerce({admin:{rpc:async()=>{calls++;throw Error('Unexpected RPC');}},secret:'test-secret-with-at-least-32-bytes-long',origins:['https://pawpal.test'],production:true,limit});
 const send=async(action,body={},headers={},method='POST')=>{
  const res={headers:{},statusCode:200,setHeader(k,v){this.headers[k]=v;},status(n){this.statusCode=n;return this;},json(v){this.data=v;return this;}};
  await handler({method,body,headers:{origin:'https://pawpal.test','content-type':'application/json',...headers},socket:{remoteAddress:'test-client'}},res,action);
  return res;
 };
 return {send,calls:()=>calls};
}
test('Method, origin and content type denied before privileged RPC',async()=>{
 const {send,calls}=setup();
 assert.equal((await send('session',{}, {},'GET')).statusCode,405);
 assert.equal((await send('session',{}, {origin:''})).statusCode,403);
 assert.equal((await send('session',{}, {'sec-fetch-site':'cross-site'})).statusCode,403);
 assert.equal((await send('session',{}, {'content-type':'text/plain'})).statusCode,415);
 assert.equal(calls(),0);
});
test('Unexpected owner keys, arrays, malformed and oversized payloads denied',async()=>{
 const {send,calls}=setup();
 const cookie=(await send('session')).headers['Set-Cookie'].split(';')[0];
 for(const body of [{customerId:'other'},[],null,'{bad', {page:'1'}, {page:1001}, {page:1,extra:'x'.repeat(17000)}]){
  assert.equal((await send('context',body,{cookie})).statusCode,400);
 }
 assert.equal(calls(),0);
});
test('Rate limits use separate action buckets and reject without issuing cookie',async()=>{
 const keys=[];const {send,calls}=setup(async(key,max)=>{keys.push({key,max});throw Object.assign(Error('limited'),{code:'RATE_LIMIT'});});
 const response=await send('session');assert.equal(response.statusCode,429);assert.equal(response.headers['Set-Cookie'],undefined);
 assert.equal((await send('pets')).statusCode,429);assert.notEqual(keys[0].key,keys[1].key);assert.equal(keys[1].max,20);assert.equal(calls(),0);
 assert.equal((await send('order-create')).statusCode,429);assert.equal(keys[2].max,20);
});
test('Rate store outage fails closed as unavailable without leaking error',async()=>{
 const {send,calls}=setup(async()=>{throw Error('private backend failure');});
 const r=await send('session');assert.equal(r.statusCode,503);assert.ok(!JSON.stringify(r.data).includes('private'));assert.equal(calls(),0);
});
test('Booking inputs reject forged owner/price, invalid timestamps, request and quote formats',async()=>{
 const {send,calls}=setup();const cookie=(await send('session')).headers['Set-Cookie'].split(';')[0];
 const details={pet_id:'11111111-1111-4111-8111-111111111111',service_id:'22222222-2222-8222-8222-222222222222',scheduled_start_at:'2030-01-01T10:00:00+07:00'};
 for(const bad of [{...details,customer_id:details.pet_id},{...details,total:1},{...details,scheduled_start_at:'2030-01-01'}, {...details,addon_ids:'wrong'}]){
  assert.equal((await send('booking-quote',{details:bad},{cookie})).statusCode,400);
 }
 assert.equal((await send('booking-create',{details,requestId:details.pet_id,expectedQuote:'fake'},{cookie})).statusCode,400);
 assert.equal((await send('booking-receipt',{requestId:'fake'},{cookie})).statusCode,400);
 assert.equal(calls(),0);
});

test('guest booking create uses a signed guest session without member Auth; missing session is denied before RPC',async()=>{
 const calls=[],id='11111111-1111-4111-8111-111111111111';
 const handler=createGuestCommerce({admin:{rpc:async(name,args)=>{calls.push({name,args});return {data:id};}},secret:'test-secret-with-at-least-32-bytes-long',origins:['https://pawpal.test'],production:true,limit:async()=>{}});
 const send=async(action,body={},cookie)=>{
  const res={headers:{},statusCode:200,setHeader(k,v){this.headers[k]=v;},status(n){this.statusCode=n;return this;},json(v){this.data=v;return this;}};
  await handler({method:'POST',body,headers:{origin:'https://pawpal.test','content-type':'application/json',cookie}},res,action);return res;
 };
 const body={requestId:id,expectedQuote:'a'.repeat(32),details:{pet_id:id,service_id:'22222222-2222-8222-8222-222222222222',scheduled_start_at:'2030-01-01T10:00:00+07:00'}};
 assert.equal((await send('booking-create',body)).statusCode,401);assert.equal(calls.length,0);
 const cookie=(await send('session')).headers['Set-Cookie'].split(';')[0];assert.equal(calls.length,0);
 const result=await send('booking-create',body,cookie);
 assert.equal(result.data.success,true);assert.equal(result.data.bookingId,id);assert.equal(calls.length,1);
 assert.equal(calls[0].name,'guest_booking_create');assert.match(calls[0].args.p_hash,/^[a-f0-9]{64}$/);
 assert.equal(calls[0].args.p_request,id);assert.equal(calls[0].args.p_customer,undefined);
});
test('Checkout rejects client prices/owner/member benefits, malformed lines and payment IDs',async()=>{
 const {send,calls}=setup();const cookie=(await send('session')).headers['Set-Cookie'].split(';')[0];
 const details={delivery:false,discount_mode:'none'},line={variant_id:'33333333-3333-8333-8333-333333333333',quantity:1};
 for(const bad of [{...details,customer_id:line.variant_id},{...details,total:1},{...details,discount_mode:'points'},{...details,discount_mode:'tier'},{...details,delivery:'true'}]){
  assert.equal((await send('order-quote',{details:bad,lines:[line]},{cookie})).statusCode,400);
 }
 for(const lines of [[],[{...line,unit_price:1}],[{...line,quantity:0}],[{...line,quantity:1.5}]])assert.equal((await send('order-quote',{details,lines},{cookie})).statusCode,400);
 assert.equal((await send('order-create',{details,lines:[line],requestId:line.variant_id,expectedQuote:'0'.repeat(32),contact:{name:'Test',phone:'0950000001'},paymentMethodId:'invalid'},{cookie})).statusCode,400);
 assert.equal((await send('order-receipt',{requestId:'invalid'},{cookie})).statusCode,400);
 assert.equal(calls(),0);
});
