const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createGuestCommerce}=require('../api/guest_commerce');

function fixture({initialized=true,phone='0901234567',revoked=false}={}){
 const reads=[],receipts=[];
 const admin={
  async rpc(name,args){
   if(name==='guest_commerce_context')return revoked?{error:{code:'42501',message:'guest_session_invalid'}}:{data:{initialized,contact:{phone}}};
   receipts.push({name,args});return {data:{id:args.p_request,code:'TEST',total:10,status:'pending'}};
  },
  from(table){
   const read={table,filters:[]};reads.push(read);
   const query={select(){return query},eq(key,value){read.filters.push([key,value]);return query},order(){return query},
    async limit(){return {data:[{id:table+'-id'}]}},async maybeSingle(){return {data:{customer_id:'session-owner'}}}};
   return query;
  }
 };
 const handle=createGuestCommerce({admin,secret:'test-secret-with-at-least-32-bytes-long',origins:['https://pawpal.test'],production:true,limit:async()=>{}});
 async function send(action,body={},cookie){
  const res={statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v},status(n){this.statusCode=n;return this},json(data){this.data=data;return this}};
  await handle({method:'POST',body,headers:{origin:'https://pawpal.test','content-type':'application/json',cookie}},res,action);return res;
 }
 return {reads,receipts,send,async cookie(){return (await send('session')).headers['Set-Cookie'].split(';')[0]}};
}

test('phone lookup denies a missing/forged cookie before transaction reads',async()=>{
 for(const cookie of [undefined,'__Host-pawpal_guest=forged']){const f=fixture(),res=await f.send('lookup',{phone:'0901234567'},cookie);assert.equal(res.statusCode,401);assert.equal(f.reads.length,0);}
});
test('unknown session, wrong phone, revoked session and injected owner cannot read transactions',async()=>{
 for(const config of [{initialized:false},{phone:'0909999999'},{revoked:true}]){
  const f=fixture(config),cookie=await f.cookie(),res=await f.send('lookup',{phone:'0901234567'},cookie);
  assert.ok([401,403].includes(res.statusCode));assert.equal(f.reads.length,0);
 }
 const f=fixture(),cookie=await f.cookie();assert.equal((await f.send('lookup',{phone:'0901234567',customerId:'other'},cookie)).statusCode,400);assert.equal(f.reads.length,0);
});
test('matching phone filters transactions by cookie owner and rechecks each receipt grant',async()=>{
 const f=fixture(),cookie=await f.cookie(),res=await f.send('lookup',{phone:'+84 901 234 567'},cookie);
 assert.equal(res.statusCode,200);assert.equal(res.data.bookings.length,1);assert.equal(res.data.orders.length,1);
 for(const read of f.reads.filter(r=>r.table!=='guest_session'))assert.deepEqual(read.filters,[['customer_id','session-owner']]);
 assert.deepEqual(f.receipts.map(r=>r.name),['guest_booking_receipt','guest_sales_receipt']);
 for(const receipt of f.receipts)assert.match(receipt.args.p_hash,/^[a-f0-9]{64}$/);
});

test('guest receipts use original result cards with local dates and server statuses',async()=>{
 const {mapGuestReceipts}=await import('../../pages/public/return-guest/guest-phone-lookup.mjs');
 const results=mapGuestReceipts({bookings:[{id:'booking-id',code:'LH-1',status:'confirmed',start_at:'2026-10-28T18:30:00Z',end_at:'2026-10-28T19:30:00Z',total:120000}],orders:[{id:'order-id',code:'DH-1',status:'packing',total:80000,paymentStatus:'paid',receiver:{name:'Test',address:'A',province:'B'},lines:[{name:'Item',quantity:2,unitPrice:40000}]}]});
 assert.equal(results.bookings[0].date,'2026-10-29');assert.equal(results.bookings[0].timeStart,'01:30');
 assert.equal(results.bookings[0].status,'confirmed');assert.equal(results.bookings[0]._receiptOnly,true);
 assert.equal(results.orders[0].status,'preparing');assert.equal(results.orders[0].products[0].price,40000);
 assert.equal(results.orders[0].pricing.total,80000);assert.equal(results.orders[0].delivery.address,'A, B');
});
