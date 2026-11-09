'use strict';
const fs=require('node:fs'),path=require('node:path'),express=require('express');
const links=[...fs.readFileSync('pages/admin/index.html','utf8').matchAll(/<link[^>]+rel="stylesheet"[^>]*>/g)].map(x=>x[0]).join('\n');
const html=`<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${links}<title>Kiểm thử riêng ảnh hồ sơ</title><body class="admin-body"><script type="module">
import {openPetAvatarDialog} from '/scripts/shared/pet-avatar-dialog.mjs';
window.probe={calls:[],saves:[],acceptSave:false};
const nativeFetch=fetch.bind(window);window.fetch=async(url,options)=>{if(String(url).startsWith('/api/media'))probe.calls.push({url:String(url),body:typeof options?.body==='string'?JSON.parse(options.body):null});return nativeFetch(url,options);};
window.openAvatar=()=>openPetAvatarDialog({pet:{rawId:'84000000-0000-0000-0000-000000000001',updatedAt:'2026-11-08T00:00:00Z',avatar:'/assets/images/publics/dogcute3.jpg'},db:{auth:{getSession:async()=>({data:{session:{access_token:'isolated-fixture'}}})},rpc:async(name,args)=>{probe.saves.push({name,args});return probe.acceptSave?{data:args.p_pet}:{error:{message:'isolated save failure'}};}}});await openAvatar();
</script></body></html>`;
const app=express();app.get('/',(req,res)=>res.type('html').send(html));app.post('/api/media',express.raw({type:()=>true,limit:'4mb'}),(req,res)=>res.status(req.query.action==='upload'?201:200).json({ok:true,...(req.query.action==='prepare'?{session_id:'22222222-2222-4222-8222-222222222222'}:req.query.action==='upload'?{asset_id:'44444444-4444-4444-8444-444444444444'}:{})}));
for(const folder of ['pages/admin','scripts/shared','assets'])app.use('/'+folder,express.static(path.resolve(folder)));app.listen(3126,'127.0.0.1',()=>console.log('PET_AVATAR_ISOLATED_READY_3126'));
