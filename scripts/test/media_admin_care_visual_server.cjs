'use strict';
// Layout harness for the real manager composer. No authenticated session/business records.
const fs=require('node:fs'),path=require('node:path'),express=require('express');
const source=fs.readFileSync('pages/admin/modules/services/services.html','utf8').replace(/\r\n/g,'\n');
const start=source.indexOf('<div class="carelog-quick-add" id="carelogQuickAddBox">'),end=source.indexOf('\n</div>\n</div>\n</div>\n</div>',start);
if(start<0||end<0)throw Error('COMPOSER_SCOPE');
const form=source.slice(start,end+7);
const index=fs.readFileSync('pages/admin/index.html','utf8'),links=[...index.matchAll(/<link[^>]+rel="stylesheet"[^>]*>/g)].map(x=>x[0]).join('\n');
const html=`<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${links}<title>Kiểm tra ảnh nhật ký quản lý</title><body class="admin-body"><main class="services-module" style="max-width:680px;margin:24px auto;padding:16px;max-height:95vh;overflow:auto"><h2 style="color:#236B48">Nhật ký chăm sóc</h2>${form}</main><script type="module">
import {createCareMediaEditor} from '/scripts/shared/care-media.mjs';
window.editor=createCareMediaEditor({root:document.getElementById('adminCareLogMedia'),db:{auth:{getSession:async()=>({data:{session:null}})}}});await editor.reset({appointment:crypto.randomUUID()});
</script></body></html>`;
const app=express();app.get('/',(req,res)=>res.type('html').send(html));for(const folder of ['pages/admin','scripts/shared','assets'])app.use('/'+folder,express.static(path.resolve(folder)));
app.listen(3119,'127.0.0.1',()=>console.log('ADMIN_CARE_LAYOUT_READY_3119'));
