'use strict';
const fs=require('node:fs'),express=require('express'),path=require('node:path');
const html=`<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"><link rel="stylesheet" href="/styles/style.css"><link rel="stylesheet" href="/pages/user/modules/support/support.css"><title>Kiểm thử riêng phản hồi có ảnh</title><body>${fs.readFileSync('pages/user/modules/support/support.html','utf8')}<script type="module">
window.probe={calls:[],saves:[],acceptSave:false,alerts:[]};window.alert=message=>probe.alerts.push(message);const uid='10000000-0000-0000-0000-000000000003';
const ticket={id:'91000000-0000-0000-0000-000000000001',ticket_code:'ISOLATED-TICKET',subject:'Phiếu kiểm thử riêng',description:'Không ghi Cloud',category:'other',status:'processing',created_at:'2026-11-08T00:00:00Z',messages:[{id:'91000000-0000-0000-0000-000000000002',sender:'user',text:'Nội dung kiểm thử',time:'2026-11-08T00:00:00Z'}]};
localStorage.setItem('pawpal_current_user',JSON.stringify({id:'60000000-0000-0000-0000-000000000001',auth_user_id:uid}));location.hash='support?id='+ticket.id;
const db={auth:{getUser:async()=>({data:{user:{id:uid}}}),getSession:async()=>({data:{session:{user:{id:uid},access_token:'isolated-fixture'}}})},channel:()=>({on(){return this;},subscribe(){return this;}}),removeChannel:()=>{},rpc:async(name,args)=>{
 if(name==='own_support_tickets')return {data:{rows:[ticket],total:1,page:1,counts:{all:1,pending:0,processing:1,completed:0}}};
 if(name==='list_ticket_media')return {data:[{message_id:ticket.messages[0].id,media_asset_id:'33333333-3333-4333-8333-333333333333',file_name:'Ảnh đã lưu'}]};
 probe.saves.push({name,args});return probe.acceptSave?{data:args.p_id}:{error:{message:'Isolated failure'}};
}};window.getSupabaseClient=()=>db;
const nativeFetch=fetch.bind(window);window.fetch=async(url,options)=>{if(String(url).startsWith('/api/media'))probe.calls.push({url:String(url),body:typeof options?.body==='string'?JSON.parse(options.body):null});return nativeFetch(url,options);};
const mod=await import('/pages/user/modules/support/support.js');mod.init();window.disposeSupport=mod.dispose;
</script></body></html>`;
const app=express();app.get('/',(req,res)=>res.type('html').send(html));app.get('/api/media',(req,res)=>res.type('image/webp').sendFile(path.resolve('assets/images/services/spa/process/spa04.webp')));
app.post('/api/media',express.raw({type:()=>true,limit:'4mb'}),(req,res)=>res.status(req.query.action==='upload'?201:200).json({ok:true,...(req.query.action==='prepare'?{session_id:'22222222-2222-4222-8222-222222222222'}:req.query.action==='upload'?{asset_id:'44444444-4444-4444-8444-444444444444'}:{})}));
for(const dir of ['pages/user','scripts/shared','assets','styles'])app.use('/'+dir,express.static(path.resolve(dir)));
app.listen(3130,'127.0.0.1',()=>console.log('SUPPORT_REPLY_ISOLATED_READY_3130'));
