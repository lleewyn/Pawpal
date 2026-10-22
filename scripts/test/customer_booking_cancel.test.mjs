import test from 'node:test';
import assert from 'node:assert/strict';
import {cancelCustomerBooking} from '../shared/customer-booking.mjs';
const booking={_supabaseId:'booking-id',updatedAt:'2026-10-23T00:00:00Z'};
test('cancellation uses the versioned RPC and stable request ID, with no direct write',async()=>{
    let payload;
    const db={from(){throw Error('Direct mutation forbidden');},async rpc(name,args){assert.equal(name,'cancel_own_service_booking');payload=args;return {data:booking._supabaseId};}};
    await cancelCustomerBooking(db,{id:'owner'},booking,' Reason ','request-id');
    assert.deepEqual(payload,{p_request_id:'request-id',p_id:'booking-id',p_expected_updated_at:booking.updatedAt,p_reason:'Reason'});
});
test('missing reason/version and missing acknowledgement cannot report success',async()=>{
    const db={async rpc(){return {data:null};}};
    await assert.rejects(()=>cancelCustomerBooking(db,{id:'owner'},booking,'','request-id'));
    await assert.rejects(()=>cancelCustomerBooking(db,{id:'owner'},{_supabaseId:'booking-id'},'Reason','request-id'));
    await assert.rejects(()=>cancelCustomerBooking(db,{id:'owner'},booking,'Reason','request-id'));
});
test('paid booking and stale version failures remain visible',async()=>{
    for(const message of ['paid_booking_requires_refund_workflow','booking_changed_reload_required']){
        await assert.rejects(()=>cancelCustomerBooking({rpc:async()=>({error:{message}})},{id:'owner'},booking,'Reason','request-id'));
    }
});
