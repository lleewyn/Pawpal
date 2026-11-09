'use strict';
// Isolated browser harness only. No Cloud connection or business writes.
const fs=require('fs'),path=require('path'),express=require('express');
const html=`<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/components/fab/fab.css"><body style="margin:0;font-family:Arial;background:#EEF5F1"><h1>Kiểm thử ảnh chat riêng</h1>${fs.readFileSync('components/fab/fab.html','utf8')}<script>
window.probe={calls:[],sends:[],accept:false,messages:[]};const member=new URLSearchParams(location.search).has('member');
window.getSupabaseClient=()=>({auth:{getSession:async()=>({data:{session:member?{user:{id:'10000000-0000-0000-0000-000000000003'},access_token:'isolated-member'}:null}}),onAuthStateChange(){}}});
const native=fetch.bind(window),asset='44444444-4444-4444-8444-444444444444';
window.fetch=async(url,options={})=>{
 const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
 if(String(url).startsWith('/api/chat-media')){const action=new URL(url,location.origin).searchParams.get('action')||'read';probe.calls.push({action,guest:!!options.headers?.['X-Pawpal-Chat-Session'],member:!!options.headers?.Authorization,body:typeof options.body==='string'?JSON.parse(options.body):null});if(action==='read')return native('/test-image');return json({ok:true,...(action==='prepare'?{session_id:'22222222-2222-4222-8222-222222222222'}:action==='upload'?{asset_id:asset}:{})});}
 if(String(url)==='/api/admin-chat'){const body=JSON.parse(options.body);if(body.action==='public_open')return json({ok:true,conversationId:body.conversationId});if(body.action==='public_send'){probe.sends.push(body);if(!probe.accept)return json({ok:false,error:'Lỗi lưu kiểm thử riêng'},503);probe.messages=[{id:body.requestId,sender_type:member?'customer':'guest',content:body.question,created_at:new Date().toISOString(),media:body.mediaAssetIds.map(asset_id=>({asset_id}))}];return json({ok:true});}if(body.action==='public_read')return json({ok:true,status:probe.messages.length?'waiting_agent':'bot_handling',updatedAt:'fixture',messages:probe.messages.slice().reverse(),hasMore:false});if(body.action==='public_list')return json({ok:true,conversations:[]});}
 return native(url,options);
};
</script><script src="/components/fab/fab.js"></script></body></html>`;
const app=express();app.get('/',(req,res)=>res.type('html').send(html));app.get('/test-image',(req,res)=>res.type('image/jpeg').sendFile(path.resolve('assets/images/services/spa/process/spa04.webp')));for(const dir of ['components/fab','scripts/shared'])app.use('/'+dir,express.static(path.resolve(dir)));app.listen(3138,'127.0.0.1',()=>console.log('CHAT_MEDIA_ISOLATED_READY_3138'));
