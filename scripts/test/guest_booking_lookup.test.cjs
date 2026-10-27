const {test}=require('node:test'),assert=require('node:assert/strict');
const load=()=>import('../../pages/public/return-guest/guest-booking-lookup.mjs');
const id='12345678-1234-4123-8123-123456789012';
const valid=()=>({id,code:'BKG-PROBE',status:'pending',start_at:'2026-11-10T04:00:00Z',end_at:'2026-11-10T04:30:00Z',total:80000});
test('Explicit booking link takes precedence over journal; phone alone never selects a receipt',async()=>{
 const {bookingLookupRequest}=await load();assert.equal(bookingLookupRequest('?booking='+id,{getItem:()=> 'other'}),id);assert.equal(bookingLookupRequest('?phone=0950000001',{getItem:()=>null}),null);assert.equal(bookingLookupRequest('',{getItem:()=>id}),id);assert.equal(bookingLookupRequest('',{getItem:()=>{throw Error('blocked');}}),null);
});
test('Malformed links fail before invoking the cookie-backed API',async()=>{
 const {loadGuestBookingReceipt}=await load();let calls=0;for(const input of ['',null,'BKG-PROBE','<script>','0950000001'])await assert.rejects(loadGuestBookingReceipt(input,{request:async()=>{calls++;}}));assert.equal(calls,0);
});
test('Receipt loader requests only exact booking receipt through the shared client',async()=>{
 const {loadGuestBookingReceipt}=await load(),booking=valid(),calls=[];
 assert.deepEqual(await loadGuestBookingReceipt(id,{request:async(action,body)=>{calls.push({action,body});return {booking};}}),booking);assert.deepEqual(calls,[{action:'booking-receipt',body:{requestId:id}}]);
});
test('Owner/session denial propagates without phone or database fallback',async()=>{
 const {loadGuestBookingReceipt}=await load(),denied=Object.assign(Error('Denied'),{status:401});let calls=0;
 await assert.rejects(loadGuestBookingReceipt(id,{request:async()=>{calls++;throw denied;}}),error=>error===denied);assert.equal(calls,1);
});
test('Wrong receipt identity and invalid amounts/dates cannot be rendered as confirmed data',async()=>{
 const {loadGuestBookingReceipt}=await load();for(const changes of [{id:'22345678-1234-4123-8123-123456789012'},{total:null},{total:-1},{start_at:'invalid'},{end_at:null}])await assert.rejects(loadGuestBookingReceipt(id,{request:async()=>({booking:{...valid(),...changes}})}));
});
