'use strict';
// Actual manager handover modal/handlers, isolated endpoints and state. No Cloud credentials.
const fs=require('node:fs'),path=require('node:path'),express=require('express');
const source=fs.readFileSync('pages/admin/modules/services/services.html','utf8');
const links=[...fs.readFileSync('pages/admin/index.html','utf8').matchAll(/<link[^>]+rel="stylesheet"[^>]*>/g)].map(x=>x[0]).join('\n');
const html=`<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${links}<title>Kiểm thử riêng ảnh bàn giao</title><body class="admin-body">${source}<script>
window.probe={calls:[],saves:[],acceptSave:false,notice:''};
window.PawpalServices={state:{isLoaded:true,bookingsData:[{id:'ISOLATED-HANDOVER',dbId:'70000000-0000-0000-0000-000000000001',status:'in_progress',petName:'Bé kiểm thử riêng',customerName:'Khách kiểm thử riêng',category:'Spa',total:0,price:0,paymentStatus:'Chưa thanh toán',intakeRecord:{id:'81000000-0000-0000-0000-000000000001',recordedAt:'2026-11-08T00:00:00Z',staffId:'20000000-0000-0000-0000-000000000002',actualWeight:5},careLogs:[]}],servicesData:[],liveStaffList:[]},subtabs:{},formatCurrency:value=>String(value),getStatusBadge:value=>value,showToast:(message)=>probe.notice=message,errorMessage:error=>error.message,isBookingUpcoming:()=>false,assertHandoverReady:booking=>{if(booking.status!=='in_progress'||!booking.intakeRecord?.recordedAt)throw Error('invalid fixture');},saveCharges:async(booking,charges)=>{probe.saves.push({booking:booking.dbId,charges});if(!probe.acceptSave)throw Error('isolated save failure');},escapeHtml:value=>String(value)};
window.getSupabaseClient=()=>({auth:{getSession:async()=>({data:{session:{access_token:'isolated-fixture'}}})},rpc:async(name)=>name==='list_handover_media'?{data:[{id:'33333333-3333-4333-8333-333333333333',media_asset_id:'33333333-3333-4333-8333-333333333333'}]}:{error:{message:'UNEXPECTED_RPC'}}});
const nativeFetch=window.fetch.bind(window);window.fetch=async(url,options)=>{if(String(url).startsWith('/api/media'))probe.calls.push({url:String(url),body:typeof options?.body==='string'?JSON.parse(options.body):null});return nativeFetch(url,options);};
</script><script src="/pages/admin/modules/services/subtabs/tab-service-bookings.js"></script><script>PawpalServices.subtabs.bookings.openSurchargeModal('ISOLATED-HANDOVER');</script></body></html>`;
const app=express();app.get('/',(req,res)=>res.type('html').send(html));
app.get('/api/media',(req,res)=>res.type('image/jpeg').sendFile(path.resolve('assets/images/services/spa/process/spa04.webp')));
app.post('/api/media',express.raw({type:()=>true,limit:'4mb'}),(req,res)=>{
 if(req.query.action==='prepare')return res.json({ok:true,session_id:'22222222-2222-4222-8222-222222222222'});
 if(req.query.action==='upload')return res.status(201).json({ok:true,asset_id:'44444444-4444-4444-8444-444444444444'});
 return res.json({ok:true});
});
for(const folder of ['pages/admin','scripts/shared','assets'])app.use('/'+folder,express.static(path.resolve(folder)));
app.listen(3125,'127.0.0.1',()=>console.log('ADJUSTMENT_ISOLATED_READY_3125'));
