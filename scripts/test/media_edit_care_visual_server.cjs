'use strict';
// Isolated UI test harness. All business state is injected by browser tests; no Cloud connection.
const fs=require('node:fs'),express=require('express'),path=require('node:path');
const source=fs.readFileSync('pages/admin/modules/services/services.html','utf8').replace(/\r\n/g,'\n');
const start=source.indexOf('<div class="admin-modal-overlay" id="modalEditCarelogStep">'),end=source.indexOf('<!-- ====================================================================',start);
if(start<0||end<0)throw Error('MODAL_SCOPE');
const modal=source.slice(start,end);
const shell=fs.readFileSync('pages/admin/index.html','utf8'),links=[...shell.matchAll(/<link[^>]+rel="stylesheet"[^>]*>/g)].map(item=>item[0]).join('\n');
const html=`<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${links}<title>Kiểm tra sửa ảnh nhật ký</title><body class="admin-body"><div class="services-module">${modal}</div><script type="module">import {bindEditCareLog} from '/scripts/shared/edit-care-log.mjs';window.bindEditCareLog=bindEditCareLog;</script></body></html>`;
const app=express();app.get('/',(req,res)=>res.type('html').send(html));for(const folder of ['pages/admin','scripts/shared','assets'])app.use('/'+folder,express.static(path.resolve(folder)));
app.listen(3120,'127.0.0.1',()=>console.log('EDIT_CARE_LAYOUT_READY_3120'));
