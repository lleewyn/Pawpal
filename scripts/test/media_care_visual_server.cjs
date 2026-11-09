'use strict';
// Layout-only rendering of the actual staff modal factory, with no business records or authenticated session.
const fs=require('node:fs'),path=require('node:path'),express=require('express');
const source=fs.readFileSync('pages/admin/modules/services/services.js','utf8');
const end=source.indexOf('\n})();');if(end<0)throw Error('CARE_MODAL_SCOPE');
const script=source.slice(0,end)+'\nwindow.careLayout=build();window.careLayout.overlay.classList.add("active");window.careLayout.overlay.setAttribute("aria-hidden","false");\n})();';
const index=fs.readFileSync('pages/admin/index.html','utf8');
const links=[...index.matchAll(/<link[^>]+rel="stylesheet"[^>]*>/g)].map(x=>x[0]).join('\n');
const html=`<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${links}<title>Kiểm tra modal ảnh nhật ký</title><body class="admin-body"><script>window.getSupabaseClient=()=>({auth:{getSession:async()=>({data:{session:null}})}});</script><script>${script}</script></body></html>`;
const app=express();app.get('/',(req,res)=>res.type('html').send(html));for(const folder of ['pages/admin','scripts/shared','assets'])app.use('/'+folder,express.static(path.resolve(folder)));
app.listen(3118,'127.0.0.1',()=>console.log('CARE_LAYOUT_ONLY_READY_3118'));
