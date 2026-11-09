'use strict';
const express=require('express'),path=require('node:path');
const html=`<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles/style.css"><link rel="stylesheet" href="/pages/user/user.css"><title>Kiểm thử riêng ảnh hoàn trả</title><style>body{font-family:Arial;background:#f4f9f6}button{cursor:pointer}.admin-btn{padding:8px 14px;border:1px solid #ECF2EE;border-radius:9px;color:#236B48;background:white}</style><body><script type="module">
window.probe={calls:[],saves:[],acceptSave:false};
window.fixtureOrder={id:'isolated-order',_supabaseId:'90000000-0000-0000-0000-000000000001',status:'completed',updatedAt:'2026-11-08T00:00:00Z',products:[{lineId:'90000000-0000-0000-0000-000000000002',name:'Sản phẩm kiểm thử riêng',quantity:2,price:100}]};
const db={auth:{getSession:async()=>({data:{session:{access_token:'isolated-fixture'}}})},from:()=>({select:()=>({eq:async()=>({data:[]})})}),rpc:async(name,args)=>{probe.saves.push({name,args});return probe.acceptSave?{data:args.p_request}:{error:{message:'Lưu thử thất bại, ảnh đã chọn vẫn được giữ.'}};}};
window.getSupabaseClient=()=>db;localStorage.setItem('pawpal_current_user',JSON.stringify({id:'60000000-0000-0000-0000-000000000001'}));
const nativeFetch=fetch.bind(window);window.fetch=async(url,options)=>{if(String(url).startsWith('/api/media'))probe.calls.push({url:String(url),body:typeof options?.body==='string'?JSON.parse(options.body):null});return nativeFetch(url,options);};
await import('/pages/user/modules/orders/return-handler.js');await openRMADrawer('isolated-order');
</script></body></html>`;
const app=express();app.get('/',(req,res)=>res.type('html').send(html));
app.get('/scripts/api/api.js',(req,res)=>res.type('js').send('export const API={getUserOrders:async()=>[window.fixtureOrder]};'));
app.post('/api/media',express.raw({type:()=>true,limit:'4mb'}),(req,res)=>res.status(req.query.action==='upload'?201:200).json({ok:true,...(req.query.action==='prepare'?{session_id:'22222222-2222-4222-8222-222222222222'}:req.query.action==='upload'?{asset_id:'44444444-4444-4444-8444-444444444444'}:{})}));
for(const dir of ['pages/user','scripts/shared','assets','styles'])app.use('/'+dir,express.static(path.resolve(dir)));
app.listen(3127,'127.0.0.1',()=>console.log('RETURN_EVIDENCE_ISOLATED_READY_3127'));
