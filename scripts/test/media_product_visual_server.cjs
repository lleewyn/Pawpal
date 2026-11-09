'use strict';
// Layout-only harness using the exact product modal and real styles. No business data, no auth bypass.
const fs=require('node:fs'), express=require('express'), path=require('node:path');
const source=fs.readFileSync('pages/admin/modules/orders/orders.html','utf8');
const start=source.indexOf('    <div class="admin-modal-overlay" id="modalAddProduct">');
const end=source.indexOf('    <!-- ====================================================================',start+1);
if(start<0||end<0)throw Error('MODAL_SCOPE');
const modal=source.slice(start,end).replace('class="admin-modal-overlay"','class="admin-modal-overlay active"');
const index=fs.readFileSync('pages/admin/index.html','utf8');
const links=[...index.matchAll(/<link[^>]+rel="stylesheet"[^>]*>/g)].map(x=>x[0]).join('\n');
// Admin injects orders.html after the shell styles; its module stylesheet must come last here too.
const moduleStyles=source.match(/^<link[^>]+>/)?.[0]||'';
const html=`<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${links}<title>Kiểm tra modal sản phẩm</title><body class="admin-body orders-module">${moduleStyles}${modal}<script type="module">
import {createProductMediaEditor} from '/scripts/shared/product-media.mjs';
window.PawpalOrdersModule={closeModal:()=>{document.getElementById('modalAddProduct').style.display='none';editor.close()},toggleVariantMode:checked=>{document.getElementById('singleProductPriceBox').hidden=checked;document.getElementById('variantProductPriceBox')?.toggleAttribute('hidden',!checked)}};
const editor=createProductMediaEditor({root:document.getElementById('productMediaEditor'),db:{auth:{getSession:async()=>{throw Error('Layout preview has no authenticated session')}}}});
editor.reset({id:crypto.randomUUID()});window.visualMediaEditor=editor;
</script></body></html>`;
const app=express();app.get('/',(req,res)=>res.type('html').send(html));
for(const folder of ['pages/admin','scripts/shared','assets'])app.use('/'+folder,express.static(path.resolve(folder)));
app.listen(3117,'127.0.0.1',()=>console.log('LAYOUT_ONLY_READY_3117'));
