import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadCustomerBookingMoveServices,loadCustomerBookingMoveDaySlots} from '../shared/customer-booking.mjs';
const user={id:'owner'},booking={_supabaseId:'booking'};
function client(rpc){return {auth:{getUser:async()=>({data:{user:{id:'auth'}}})},from(){const q={select(){return q},eq(){return q},maybeSingle:async()=>({data:{id:'owner',customer_status:'active'}})};return q;},rpc};}
test('day lookup sends only booking, service and day; server prices and quote versions are preserved',async()=>{
 const calls=[];const quote={id:'booking',start_at:'2026-12-01T03:00:00Z',end_at:'2026-12-01T04:00:00Z',total:170000,version:'server-version'};
 const db=client(async(name,args)=>{calls.push({name,args});return {data:{slots:[quote],previous_total:100000}};});
 const result=await loadCustomerBookingMoveDaySlots(db,user,booking,'2026-12-01','spa');
 assert.deepEqual(calls,[{name:'own_booking_move_day_slots',args:{p_id:'booking',p_day:'2026-12-01',p_service:'spa'}}]);
 assert.deepEqual(result.slots,[{...quote,serviceId:'spa'}]);assert.equal(result.previous_total,100000);
});
test('an empty day is a valid empty result; malformed responses remain errors',async()=>{
 assert.deepEqual((await loadCustomerBookingMoveDaySlots(client(async()=>({data:{slots:[]}})),user,booking,'2026-12-01')).slots,[]);
 await assert.rejects(loadCustomerBookingMoveDaySlots(client(async()=>({data:null})),user,booking,'2026-12-01'));
 await assert.rejects(loadCustomerBookingMoveServices(client(async()=>({data:{}})),user,booking));
});
test('quota, original cutoff and booking status errors have distinct actionable messages',async()=>{
 for(const [message,pattern]of [['booking_move_limit_reached',/hết 2 lần/],['booking_move_original_too_close',/dưới 2 tiếng/],['booking_move_status_not_allowed',/trạng thái hiện tại/]]){
  await assert.rejects(loadCustomerBookingMoveDaySlots(client(async()=>({error:{message}})),user,booking,'2026-12-01'),pattern);
 }
});
