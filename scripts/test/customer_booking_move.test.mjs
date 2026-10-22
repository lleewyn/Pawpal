import test from 'node:test';
import assert from 'node:assert/strict';
import {quoteCustomerBookingMove,moveCustomerBooking} from '../shared/customer-booking.mjs';
const booking={_supabaseId:'booking'},user={id:'owner'};
const quote={id:'booking',version:'price-version',total:300,start_at:'2026-11-01T03:00:00Z',end_at:'2026-11-01T04:00:00Z'};
test('move requires a server quote and sends no client price or owner ID',async()=>{
    const calls=[];const db={async rpc(name,args){calls.push({name,args});return {data:name==='quote_own_booking_move'?quote:'booking'};}};
    const result=await quoteCustomerBookingMove(db,user,booking,quote.start_at);
    await moveCustomerBooking(db,user,booking,result,' Reason ','request');
    assert.deepEqual(calls,[{name:'quote_own_booking_move',args:{p_id:'booking',p_start:quote.start_at}},
        {name:'reschedule_own_service_booking',args:{p_request_id:'request',p_id:'booking',p_start:quote.start_at,p_expected_quote:'price-version',p_reason:'Reason'}}]);
});
test('missing quote, missing reason and wrong acknowledgement cannot report a move',async()=>{
    const db={rpc:async()=>({data:null})};
    await assert.rejects(()=>moveCustomerBooking(db,user,booking,null,'Reason','request'));
    await assert.rejects(()=>moveCustomerBooking(db,user,booking,quote,'','request'));
    await assert.rejects(()=>moveCustomerBooking(db,user,booking,quote,'Reason','request'));
    await assert.rejects(()=>quoteCustomerBookingMove(db,user,booking,quote.start_at));
});
test('stale quote and resource conflicts stay visible instead of local success',async()=>{
    for(const message of ['booking_quote_changed_reload_required','staff_schedule_conflict','hotel_room_conflict','booking_requires_staff_reconciliation']){
        const db={rpc:async()=>({error:{message}})};
        await assert.rejects(()=>quoteCustomerBookingMove(db,user,booking,quote.start_at));
        await assert.rejects(()=>moveCustomerBooking(db,user,booking,quote,'Reason','request'));
    }
});
