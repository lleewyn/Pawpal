'use strict';
const fs=require('node:fs'),express=require('express'),path=require('node:path');
const html=`<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"><link rel="stylesheet" href="/styles/style.css"><link rel="stylesheet" href="/pages/user/modules/support/support.css"><title>Kiểm thử riêng gửi yêu cầu</title><body>${fs.readFileSync('pages/user/modules/support/support-create.html','utf8')}<script type="module">
window.probe={calls:[],saves:[],acceptSave:false};const uid='10000000-0000-0000-0000-000000000003';
localStorage.setItem('pawpal_current_user',JSON.stringify({id:'60000000-0000-0000-0000-000000000001',auth_user_id:uid}));
const db={auth:{getUser:async()=>({data:{user:{id:uid}}}),getSession:async()=>({data:{session:{user:{id:uid},access_token:'isolated-fixture'}}})},rpc:async(name,args)=>{probe.saves.push({name,args});return probe.acceptSave?{data:args.p_id}:{error:{message:'Isolated save failure'}};}};window.getSupabaseClient=()=>db;
const nativeFetch=fetch.bind(window);window.fetch=async(url,options)=>{if(String(url).startsWith('/api/media'))probe.calls.push({url:String(url),body:typeof options?.body==='string'?JSON.parse(options.body):null});return nativeFetch(url,options);};
const mod=await import('/pages/user/modules/support/support-create.js');await mod.init();window.disposeCreate=mod.dispose;
</script></body></html>`;
const app=express();app.get('/',(req,res)=>res.type('html').send(html));
app.get('/scripts/api/api.js',(req,res)=>res.type('js').send('export const API={getUserOrders:async()=>[],getUserBookings:async()=>[]};'));
app.post('/api/media',express.raw({type:()=>true,limit:'4mb'}),(req,res)=>res.status(req.query.action==='upload'?201:200).json({ok:true,...(req.query.action==='prepare'?{session_id:'22222222-2222-4222-8222-222222222222'}:req.query.action==='upload'?{asset_id:'44444444-4444-4444-8444-444444444444'}:{})}));
for(const dir of ['pages/user','scripts/shared','assets','styles'])app.use('/'+dir,express.static(path.resolve(dir)));
app.listen(3129,'127.0.0.1',()=>console.log('SUPPORT_CREATE_ISOLATED_READY_3129'));
