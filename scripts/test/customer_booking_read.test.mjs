import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {vietnamDateTimeInput,parseVietnamDateTimeInput} from '../shared/booking-time.mjs';
const source=fs.readFileSync('scripts/api/api.js','utf8');
const method=source.slice(source.indexOf('    async getUserBookings('),source.indexOf('    async getUserAppointments('));
function fixture(total,paid,fail=false,starts='2026-10-23T08:00:00+07:00'){
    const db={from(){return {select(){return this;},eq(){return this;},async order(){return {data:[{id:'booking',appointment_code:'BKG',scheduled_start_at:starts,appointment_status:'checked_in',appointment_item:[{id:'line',quantity:1,unit_price:100,is_primary:true}]}]};}};},
        async rpc(name){assert.equal(name,'own_service_booking_summary');return fail?{error:Error('Summary unavailable')}:{data:[{id:'booking',total,net_paid:paid,reviewed_item_ids:['line']}]};}};
    const context={window:{getSupabaseClient:()=>db},vietnamDateTimeInput,resolveCustomerId:async()=> 'owner',console:{error(){}}};
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
    for(const file of ['bookings.js','booking-detail.js']){
        const text=fs.readFileSync('pages/user/modules/bookings/'+file,'utf8');
        const fn=text.slice(text.indexOf('function resolveBookingStatus(booking)'),text.indexOf('function getBookingScheduledAt(booking)'));
        const context={};vm.runInNewContext(fn+';globalThis.resolve=resolveBookingStatus;',context);
        assert.equal(context.resolve({status:'confirmed',date:'2020-01-01',time:'08:00'}),'confirmed');
    }
});

test('booking mapping keeps Vietnam date/time across UTC midnight',async()=>{
    const [booking]=await fixture(100,0,false,'2030-12-31T17:30:00Z').getUserBookings('owner');
    assert.equal(booking.date,'2031-01-01');assert.equal(booking.time,'00:30');
});

test('list/detail action windows use authoritative timestamp or Vietnam wall clock',()=>{
    for(const file of ['bookings.js','booking-detail.js']){
        const text=fs.readFileSync('pages/user/modules/bookings/'+file,'utf8');
        const start=text.indexOf('function getBookingScheduledAt(booking)');
        const context={parseVietnamDateTimeInput};vm.runInNewContext(text.slice(start,text.indexOf('\n}',start)+2)+';globalThis.read=getBookingScheduledAt;',context);
        assert.equal(context.read({date:'2031-01-01',time:'00:30'}).toISOString(),'2030-12-31T17:30:00.000Z');
        assert.equal(context.read({scheduledStartAt:'2031-04-02T03:00:00Z',date:'2031-04-02',time:'wrong'}).toISOString(),'2031-04-02T03:00:00.000Z');
    }
});
