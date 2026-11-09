'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('pages/admin/modules/services/subtabs/tab-service-detail.js','utf8');
const start=source.indexOf('    async function openEditCarelogStepModal('),end=source.indexOf('    function renderDetailCareLogs(',start);
function setup(changeSelection=false){
 const opened=[],reads=[];const state={selectedBookingId:'selected',bookingsData:[]};
 const context={PawpalServices:{state,showToast(){},ensureBooking:async id=>{reads.push(id);return {dbId:id};},fetchBookingCareLogs:async id=>{if(changeSelection)state.selectedBookingId='another';return [{id:'different-log'},{id:'target-log'}];}},editCarelogController:Promise.resolve({open:async(...args)=>opened.push(args)})};
 vm.createContext(context);vm.runInContext(source.slice(start,end),context);return {context,opened,reads};
}
test('editing a realtime care-log card reloads by durable IDs even when cached booking has no logs',async()=>{
 const t=setup();await t.context.openEditCarelogStepModal('appointment','target-log');
 assert.deepEqual(t.reads,['appointment']);assert.equal(t.opened.length,1);assert.equal(t.opened[0][1].id,'target-log');
});
test('changing the selected appointment during care-log loading never opens the stale editor',async()=>{
 const t=setup(true);await t.context.openEditCarelogStepModal('appointment','target-log');assert.equal(t.opened.length,0);
});
