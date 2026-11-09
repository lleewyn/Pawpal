'use strict';
const fs=require('node:fs'),express=require('express'),path=require('node:path');
const source=fs.readFileSync('pages/admin/modules/complaints/complaints.js','utf8');
const end=source.indexOf('})();',source.indexOf('window.PawpalStaffComplaintMessage'))+5;if(end<5)throw Error('STAFF_MESSAGE_SCOPE');
const links=[...fs.readFileSync('pages/admin/index.html','utf8').matchAll(/<link[^>]+rel="stylesheet"[^>]*>/g)].map(x=>x[0]).join('\n');
const html=`<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${links}<title>Kiểm thử riêng ảnh trao đổi STAFF</title><body class="admin-body"><script>
window.probe={calls:[],saves:[],acceptSave:false};
window.PawpalAdminAccess={isStaff:()=>true,state:{user:{id:'20000000-0000-0000-0000-000000000002',permissions:['work.complaint.handle']}}};
window.getSupabaseClient=()=>({auth:{getSession:async()=>({data:{session:{access_token:'isolated-fixture'}}})},rpc:async(name,args)=>{if(name==='get_staff_workspace')return {data:{items:[{id:'91000000-0000-0000-0000-000000000001',ticket_code:'ISOLATED-TICKET',subject:'Kiểm thử riêng ảnh trao đổi',status:'processing',updated_at:'2026-11-08T00:00:00Z'}]}};probe.saves.push(args);return probe.acceptSave?{data:args.p_ticket_id}:{error:{code:'503',message:'Isolated failure'}};}});
const nativeFetch=fetch.bind(window);window.fetch=async(url,options)=>{if(String(url).startsWith('/api/media'))probe.calls.push({url:String(url),body:typeof options?.body==='string'?JSON.parse(options.body):null});return nativeFetch(url,options);};
${source.slice(0,end)}
window.openStaffMessage=()=>PawpalStaffComplaintMessage.open({ticketId:'91000000-0000-0000-0000-000000000001'});openStaffMessage();
</script></body></html>`;
const app=express();app.get('/',(req,res)=>res.type('html').send(html));app.post('/api/media',express.raw({type:()=>true,limit:'4mb'}),(req,res)=>res.status(req.query.action==='upload'?201:200).json({ok:true,...(req.query.action==='prepare'?{session_id:'22222222-2222-4222-8222-222222222222'}:req.query.action==='upload'?{asset_id:'44444444-4444-4444-8444-444444444444'}:{})}));
for(const dir of ['pages/admin','scripts/shared','assets'])app.use('/'+dir,express.static(path.resolve(dir)));
app.listen(3131,'127.0.0.1',()=>console.log('STAFF_COMPLAINT_ISOLATED_READY_3131'));
