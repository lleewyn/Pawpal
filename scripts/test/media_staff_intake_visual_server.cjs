'use strict';
// Isolated browser harness for the actual STAFF intake closure. No Cloud credentials or writes.
const fs=require('node:fs'),path=require('node:path'),express=require('express');
const source=fs.readFileSync('pages/admin/modules/services/services.js','utf8');
const marker=source.indexOf("overlay.id = 'staffIntakeModal'"),start=source.lastIndexOf('(function () {',marker),finish=source.indexOf('})();',source.indexOf('window.PawpalStaffIntake=Object.freeze',marker))+5;
if(start<0||finish<start)throw Error('STAFF_INTAKE_SCOPE');
const links=[...fs.readFileSync('pages/admin/index.html','utf8').matchAll(/<link[^>]+rel="stylesheet"[^>]*>/g)].map(x=>x[0]).join('\n');
const html=`<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${links}<title>Kiểm thử riêng ảnh tiếp nhận nhân viên</title><body class="admin-body"><script>
window.probe={calls:[],saves:[],acceptSave:false};
window.PawpalAdminAccess={isStaff:()=>true,state:{user:{id:'20000000-0000-0000-0000-000000000002',name:'Nhân viên kiểm thử riêng',permissions:['work.service.perform']}}};
window.getSupabaseClient=()=>({auth:{getSession:async()=>({data:{session:{access_token:'isolated-fixture'}}})},rpc:async(name,args)=>{
 if(name==='list_intake_media')return {data:[]};
 if(name==='save_admin_service_record'){probe.saves.push(args);return probe.acceptSave?{data:args.p_id}:{error:{code:'503',message:'isolated save failure'}};}
 if(name!=='get_staff_workspace')throw Error('UNEXPECTED_RPC');
 const rows={appointments:[{id:'70000000-0000-0000-0000-000000000001',appointment_code:'ISOLATED-INTAKE',pet_id:'80000000-0000-0000-0000-000000000001',customer_id:'60000000-0000-0000-0000-000000000001',appointment_status:'confirmed',updated_at:'2026-11-08T00:00:00Z'}],pets:[{id:'80000000-0000-0000-0000-000000000001',customer_id:'60000000-0000-0000-0000-000000000001',pet_name:'Bé kiểm thử riêng',current_weight:5}],customers:[{id:'60000000-0000-0000-0000-000000000001',full_name:'Khách kiểm thử riêng'}],service_records:[]};return {data:{items:rows[args.p_kind]||[]}};
}});
const nativeFetch=window.fetch.bind(window);window.fetch=async(url,options)=>{if(String(url).startsWith('/api/media'))probe.calls.push({url:String(url),body:typeof options?.body==='string'?JSON.parse(options.body):null});return nativeFetch(url,options);};
${source.slice(start,finish)}
PawpalStaffIntake.open({appointmentId:'70000000-0000-0000-0000-000000000001'});
</script></body></html>`;
const app=express();app.get('/',(req,res)=>res.type('html').send(html));
app.post('/api/media',express.raw({type:()=>true,limit:'4mb'}),(req,res)=>{
 if(req.query.action==='prepare')return res.json({ok:true,session_id:'22222222-2222-4222-8222-222222222222'});
 if(req.query.action==='upload')return res.status(201).json({ok:true,asset_id:'44444444-4444-4444-8444-444444444444'});
 return res.json({ok:true});
});
for(const folder of ['pages/admin','scripts/shared','assets'])app.use('/'+folder,express.static(path.resolve(folder)));
app.listen(3122,'127.0.0.1',()=>console.log('STAFF_INTAKE_ISOLATED_READY_3122'));
