const fs=require('node:fs'),assert=require('node:assert/strict');const{chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const p=await browser.newPage();await p.route('**/*',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><body></body>'}));await p.goto('http://localhost:3014/');await p.setContent(fs.readFileSync('pages/admin/modules/orders/orders.html','utf8'));
 await p.evaluate(()=>{
  window.voucherCalls=[];window.PawpalOrdersModule={};window.formatVND=v=>String(v)+' đ';window.persistSharedVouchersData=rows=>PawpalOrders.state.vouchers=rows;
  window.PawpalOrders={state:{vouchers:[]},controllers:{},helpers:{formatVND,showToast(){},getSharedVouchersList:()=>PawpalOrders.state.vouchers,persistSharedVouchersData,matchSearch:(a,b)=>String(a).includes(b)}};
  PawpalOrders.renderVouchersTable=()=>PawpalOrders.controllers.promos?.renderVouchersTable();
  window.getSupabaseClient=()=>({from(){throw Error('Unexpected raw read');},rpc:async(name,args)=>{if(name!=='admin_sales_voucher_page')throw Error(name);voucherCalls.push(args);const all=Array.from({length:23},(_,i)=>({id:'id-'+i,voucher_code:'QA'+(i+1),voucher_name:'Voucher '+(i+1),discount_value:10,type:'percent',applicable_for:'shop',is_active:true,start_date:'2020-01-01',end_date:'2099-01-01',used:2}));const rows=all.filter(v=>!args.p_query||v.voucher_code===args.p_query);const page=Math.min(args.p_page,Math.max(1,Math.ceil(rows.length/10)));return {data:{rows:rows.slice((page-1)*10,page*10),page,total:rows.length,stats:{active:23,expiring:0,usedToday:4}}};}});
 });
 const core=fs.readFileSync('pages/admin/modules/orders/orders.js','utf8'),a=core.indexOf('    let voucherReadVersion=0;'),b=core.indexOf('    let ordersReadVersion',a);
 await p.addScriptTag({content:core.slice(a,b)+'\nPawpalOrders.fetchVouchersData=fetchVouchersData;'});await p.addScriptTag({content:fs.readFileSync('pages/admin/modules/orders/subtabs/tab-order-promos.js','utf8')});
 await p.evaluate(()=>PawpalOrders.fetchVouchersData());assert.equal(await p.locator('#vouchersTableBody tr').count(),10);assert.equal(await p.locator('#statActiveVouchers').textContent(),'23');
 await p.locator('#salesVoucherPager button').filter({hasText:/^3$/}).click();await p.waitForFunction(()=>document.querySelectorAll('#vouchersTableBody tr').length===3);
 await p.fill('#promoSearchInput','QA23');await p.waitForFunction(()=>document.querySelectorAll('#vouchersTableBody tr').length===1);assert.match(await p.locator('#vouchersTableBody').textContent(),/QA23/);assert.equal(await p.locator('#statActiveVouchers').textContent(),'23');
 for(const file of ['pages/admin/admin.css','pages/admin/modules/orders/orders.css','pages/admin/modules/orders/orders-v8.css'])await p.addStyleTag({content:fs.readFileSync(file,'utf8')});
 await p.evaluate(()=>{document.querySelectorAll('.subtab-content').forEach(e=>e.classList.remove('active'));document.getElementById('subtab-tab-order-promos').classList.add('active');});
 await p.evaluate(()=>PawpalOrders.fetchVouchersData({query:'',page:1}));
 fs.mkdirSync('D:/Aboutme/Pawpal-infra/verification',{recursive:true});await p.locator('#subtab-tab-order-promos').screenshot({path:'D:/Aboutme/Pawpal-infra/verification/sales-voucher-pages.private.png'});
 await p.setContent(fs.readFileSync('pages/admin/modules/services/services.html','utf8'));

 await p.evaluate(()=>{
  window.detailCalls=[];window.PawpalServices={state:{servicesData:[],liveSpecies:[],liveLevels:[]},subtabs:{},showToast:m=>{throw Error(m);},escapeHtml:s=>String(s??'')};
  window.getSupabaseClient=()=>({from(table){const q={select(){return q;},eq(key,id){detailCalls.push({table,key,id});return q;},single:async()=>({data:{updated_at:'v1',description:'Mô tả đầy đủ',benefits:'Lợi ích',amenities:'Tiện nghi',images:[],actions:[{display_order:1,care_action:{action_name:'Kiểm tra sức khỏe'}}]}})};return q;}});
 });
 const source=fs.readFileSync('pages/admin/modules/services/services.js','utf8');const x=source.indexOf('    PawpalServices.ensureCatalogDetail='),y=source.indexOf('    const careMediaReaders=',x);
 await p.addScriptTag({content:'let serviceMediaReader={hydrate:async()=>{}};'+source.slice(x,y)});
 await p.evaluate(async()=>{
  const svc={id:'SVC',code:'SVC',dbId:'uuid',updatedAt:'v1',summary:true,name:'Tắm vệ sinh',group:'spa',duration:'60 phút',desc:'Tóm tắt',steps:[],priceRows:[],prices:{}};PawpalServices.state.servicesData=[svc];
  await PawpalServices.ensureCatalogDetail(svc);if(svc.desc!=='Mô tả đầy đủ'||svc.steps.length!==1)throw Error('missing_detail');await PawpalServices.ensureCatalogDetail(svc);
 });assert.equal(await p.evaluate(()=>detailCalls.length),1);
 await p.addScriptTag({content:fs.readFileSync('pages/admin/modules/services/subtabs/tab-service-catalog.js','utf8')});await p.evaluate(()=>PawpalServices.subtabs.catalog.openSopDetailsModal('SVC'));assert.equal(await p.locator('#modalViewSopDetails').getAttribute('class'),'admin-modal-overlay active');assert.match(await p.locator('#sopViewerStepsList').textContent(),/Kiểm tra sức khỏe/);
 for(const file of ['pages/admin/admin.css','pages/admin/modules/services/services.css','pages/admin/modules/services/services-v8.css'])await p.addStyleTag({content:fs.readFileSync(file,'utf8')});
 await p.locator('#modalViewSopDetails .admin-modal-card').screenshot({path:'D:/Aboutme/Pawpal-infra/verification/service-sop-lazy.private.png'});

 await p.evaluate(async()=>{let denied=false;try{await PawpalServices.ensureCatalogDetail({dbId:'uuid',updatedAt:'old',summary:true});}catch{denied=true;}if(!denied)throw Error('stale_detail_allowed');});
 console.log('PASS actual voucher table/core: 10/10/3 pages, global stats, off-page search; service detail lazy single read, SOP content and stale-version rejection. No live reads.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
