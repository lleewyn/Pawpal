import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('scripts/api/api.js','utf8');
const method=source.slice(source.indexOf('    async getUserBookings('),source.indexOf('    async getUserAppointments('));
function fixture(total,paid,fail=false){
    const db={from(){return {select(){return this;},eq(){return this;},async order(){return {data:[{id:'booking',appointment_code:'BKG',scheduled_start_at:'2026-10-23T08:00:00+07:00',appointment_status:'checked_in',appointment_item:[{id:'line',quantity:1,unit_price:100,is_primary:true}]}]};}};},
        async rpc(name){assert.equal(name,'own_service_booking_summary');return fail?{error:Error('Summary unavailable')}:{data:[{id:'booking',total,net_paid:paid,reviewed_item_ids:['line']}]};}};
    const context={window:{getSupabaseClient:()=>db},resolveCustomerId:async()=> 'owner',console:{error(){}}};
    vm.runInNewContext('globalThis.api={'+method+'};',context);return context.api;
}
test('partial payment does not mark booking fully paid and total includes server adjustments',async()=>{
    const [booking]=await fixture(150,50).getUserBookings('owner');
    assert.equal(booking.price,150);assert.equal(booking.paymentStatus,'partial');assert.equal(booking.netPaid,50);
    assert.equal(booking.status,'accepted');assert.equal(booking.reviewedItemIds[0],'line');
});
test('only net collection covering amount due is paid',async()=>{
    assert.equal((await fixture(150,150).getUserBookings('owner'))[0].paymentStatus,'paid');
    assert.equal((await fixture(150,0).getUserBookings('owner'))[0].paymentStatus,'pending');
    assert.equal((await fixture(0,0).getUserBookings('owner'))[0].paymentStatus,'pending');
});
test('summary errors and missing amounts are not replaced with guessed totals',async()=>{
    await assert.rejects(()=>fixture(100,0,true).getUserBookings('owner'),/Summary unavailable/);
    await assert.rejects(()=>fixture(undefined,0).getUserBookings('owner'));
});
test('elapsed time never completes or checks in a confirmed appointment',()=>{
    const text=fs.readFileSync('pages/user/modules/bookings/bookings.js','utf8');
    const fn=text.slice(text.indexOf('function resolveBookingStatus(booking)'),text.indexOf('function getBookingScheduledAt(booking)'));
    const context={};vm.runInNewContext(fn+';globalThis.resolve=resolveBookingStatus;',context);
    assert.equal(context.resolve({status:'confirmed',date:'2020-01-01',time:'08:00'}),'confirmed');
});
