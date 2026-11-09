'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
test('surcharge retry preserves the adjustment identity and passes verified assets to its RPC',async()=>{
 const source=fs.readFileSync('pages/admin/modules/services/services.js','utf8'),a=source.indexOf('    const requestIds=new Map();'),b=source.indexOf('    PawpalServices.savePickupNotification=',a),c=source.indexOf('    PawpalServices.saveCharges='),d=source.indexOf('    PawpalServices.saveCareLog=',c);const calls=[];
 const context={crypto,PawpalServices:{changeCharge:async(...args)=>{calls.push(args);if(calls.length===1)throw Error('refresh failed');}}};vm.createContext(context);vm.runInContext(source.slice(a,b)+source.slice(c,d),context);
 const booking={dbId:'appointment',charges:[]},charge={id:'stable-adjustment',mediaAdjustmentId:'stable-adjustment',kind:'surcharge',name:'Observed surcharge',amount:100,reason:'Observed reason',media_asset_ids:['verified-asset']};
 await assert.rejects(()=>context.PawpalServices.saveCharges(booking,[charge]),/refresh failed/);await context.PawpalServices.saveCharges(booking,[charge]);
 assert.equal(calls[0][1],'stable-adjustment');assert.equal(calls[1][1],'stable-adjustment');assert.deepEqual(calls[1][3].media_asset_ids,['verified-asset']);assert.equal(calls[1][3].consent,'pending');
});
test('intake record retry keeps the same identity and assets when post-save refresh fails',async()=>{
 const source=fs.readFileSync('pages/admin/modules/services/services.js','utf8');
 const start=source.indexOf('    const requestIds=new Map();'),end=source.indexOf('    PawpalServices.savePickupNotification=',start);
 const from=source.indexOf('    PawpalServices.saveBookingRecord='),to=source.indexOf('    PawpalServices.changeCharge=',from);
 assert.ok(start>=0&&end>start&&from>=0&&to>from);
 const calls=[];let count=0;const db={rpc:async(name,args)=>{calls.push({name,args});return {data:args.p_id};}};
 const context={crypto,PawpalServices:{},performBookingWrite:async(booking,operation)=>{await operation(db);if(++count===1)throw Error('refresh failed');}};
 vm.createContext(context);vm.runInContext(source.slice(start,end)+source.slice(from,to),context);
 const booking={dbId:'appointment',updatedAt:'version'},record={mediaRecordId:'stable-record',media_asset_ids:['verified-asset'],actualWeight:5};
 await assert.rejects(()=>context.PawpalServices.saveBookingRecord(booking,'intake',record),/refresh failed/);
 await context.PawpalServices.saveBookingRecord(booking,'intake',record);
 assert.equal(calls[0].args.p_id,'stable-record');assert.equal(calls[1].args.p_id,'stable-record');
 assert.deepEqual(calls[1].args.p_details.media_asset_ids,['verified-asset']);assert.equal('mediaRecordId' in calls[1].args.p_details,false);
});
test('manager care-log retry retains its request ID when save succeeds but refresh fails',async()=>{
 const source=fs.readFileSync('pages/admin/modules/services/services.js','utf8');
 const start=source.indexOf('    const requestIds=new Map();'),end=source.indexOf('    PawpalServices.savePickupNotification=',start);
 const saveStart=source.indexOf('    PawpalServices.saveCareLog='),saveEnd=source.indexOf('\n    // Helper:',saveStart);
 assert.ok(start>=0&&end>start&&saveEnd>saveStart);
 const calls=[];let attempts=0;
 const context={crypto,window:{PawpalCareLog:{save:async args=>calls.push(args)}},PawpalServices:{},performBookingWrite:async(booking,operation)=>{await operation({});if(++attempts===1)throw Error('refresh unavailable');}};
 vm.createContext(context);vm.runInContext(source.slice(start,end)+source.slice(saveStart,saveEnd),context);
 const booking={dbId:'appointment',updatedAt:'version'},details={title:'Recorded work',media_asset_ids:['asset']};
 await assert.rejects(()=>context.PawpalServices.saveCareLog(booking,null,'save',details),/refresh unavailable/);
 await context.PawpalServices.saveCareLog(booking,null,'save',details);
 assert.equal(calls.length,2);assert.equal(calls[0].p_id,calls[1].p_id);
 assert.deepEqual(calls[1].p_details.media_asset_ids,['asset']);
 await context.PawpalServices.saveCareLog(booking,null,'save',details);
 assert.notEqual(calls[1].p_id,calls[2].p_id);
});
