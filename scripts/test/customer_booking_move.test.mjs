import test from 'node:test';
import assert from 'node:assert/strict';
import {quoteCustomerBookingMove,moveCustomerBooking} from '../shared/customer-booking.mjs';
const booking={_supabaseId:'booking'},user={id:'owner'};
const quote={id:'booking',version:'price-version',total:300,start_at:'2026-11-01T03:00:00Z',end_at:'2026-11-01T04:00:00Z'};
const client=rpc=>({auth:{getUser:async()=>({data:{user:{id:'auth'}}})},from(){const q={select(){return q},eq(){return q},maybeSingle:async()=>({data:{id:'owner',customer_status:'active'}})};return q;},rpc});
test('move requires a server quote and sends no client price or owner ID',async()=>{
    const calls=[];const db=client(async(name,args)=>{calls.push({name,args});return {data:name==='quote_own_booking_service'?quote:'booking'};});
    const result=await quoteCustomerBookingMove(db,user,booking,quote.start_at);
    await moveCustomerBooking(db,user,booking,result,' Reason ','request');
    assert.deepEqual(calls,[{name:'quote_own_booking_service',args:{p_id:'booking',p_start:quote.start_at,p_end:null,p_service:null}},
        {name:'reschedule_own_booking_service',args:{p_request_id:'request',p_id:'booking',p_start:quote.start_at,p_expected_quote:'price-version',p_reason:'Reason',p_end:null,p_service:null}}]);
});
test('missing quote, missing reason and wrong acknowledgement cannot report a move',async()=>{
    const db=client(async()=>({data:null}));
    await assert.rejects(()=>moveCustomerBooking(db,user,booking,null,'Reason','request'));
    await assert.rejects(()=>moveCustomerBooking(db,user,booking,quote,'','request'));
    await assert.rejects(()=>moveCustomerBooking(db,user,booking,quote,'Reason','request'));
    await assert.rejects(()=>quoteCustomerBookingMove(db,user,booking,quote.start_at));
});
test('stale quote and resource conflicts stay visible instead of local success',async()=>{
    for(const message of ['booking_quote_changed_reload_required','staff_schedule_conflict','hotel_room_conflict','booking_requires_staff_reconciliation']){
        const db=client(async()=>({error:{message}}));
        await assert.rejects(()=>quoteCustomerBookingMove(db,user,booking,quote.start_at));
        await assert.rejects(()=>moveCustomerBooking(db,user,booking,quote,'Reason','request'));
    }
});
test('hotel move supports custom end time and calculates quote',async()=>{
    const hotelBooking={_supabaseId:'hotel-1',isHotel:true};
    const hotelQuote={id:'hotel-1',version:'h-v1',total:1040000,start_at:'2026-11-04T10:00:00Z',end_at:'2026-11-06T10:00:00Z',logistics:{kind:'pet_hotel',daily_price:520000}};
    const calls=[];const db=client(async(name,args)=>{calls.push({name,args});return {data:name==='quote_own_booking_service'?hotelQuote:'hotel-1'};});
    const q=await quoteCustomerBookingMove(db,user,hotelBooking,'2026-11-04T10:00:00Z','2026-11-06T10:00:00Z');
    assert.equal(q.end_at,'2026-11-06T10:00:00Z');
    await moveCustomerBooking(db,user,hotelBooking,q,'Thay đổi công tác','req-h1','2026-11-06T10:00:00Z');
    assert.deepEqual(calls,[
        {name:'quote_own_booking_service',args:{p_id:'hotel-1',p_start:'2026-11-04T10:00:00Z',p_end:'2026-11-06T10:00:00Z',p_service:null}},
        {name:'reschedule_own_booking_service',args:{p_request_id:'req-h1',p_id:'hotel-1',p_start:'2026-11-04T10:00:00Z',p_expected_quote:'h-v1',p_reason:'Thay đổi công tác',p_end:'2026-11-06T10:00:00Z',p_service:null}}
    ]);
});
