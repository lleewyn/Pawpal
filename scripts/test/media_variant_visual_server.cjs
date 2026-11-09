'use strict';
// Actual product modal and handlers; empty isolated state, no Cloud connection or business writes.
const fs=require('node:fs'),path=require('node:path'),express=require('express');
const source=fs.readFileSync('pages/admin/modules/orders/orders.html','utf8'),shell=fs.readFileSync('pages/admin/index.html','utf8');
const links=[...shell.matchAll(/<link[^>]+rel="stylesheet"[^>]*>/g)].map(x=>x[0]).join('\n');
const html=`<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${links}<title>Kiểm tra ảnh biến thể</title><body class="admin-body">${source}<script>
window.getSupabaseClient=()=>({auth:{getSession:async()=>({data:{session:null}})},rpc:async()=>({error:{message:'Isolated layout test: no business writes'}})});
window.PawpalOrders={state:{products:[],categories:[]},controllers:{},helpers:{showToast:(...args)=>{window.lastLayoutNotice=args[0]},formatVND:String,formatDateTime:String,matchSearch:()=>false}};
window.PawpalOrdersModule={closeModal:id=>document.getElementById(id).classList.remove('active')};
</script><script src="/pages/admin/modules/orders/subtabs/tab-order-products.js"></script><script>window.PawpalOrdersModule.openAddProductModal();</script></body></html>`;
const app=express();app.get('/',(req,res)=>res.type('html').send(html));for(const folder of ['pages/admin','scripts/shared','assets'])app.use('/'+folder,express.static(path.resolve(folder)));
app.listen(3121,'127.0.0.1',()=>console.log('VARIANT_LAYOUT_READY_3121'));
