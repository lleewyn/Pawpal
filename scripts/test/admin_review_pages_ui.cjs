const fs=require('node:fs'),assert=require('node:assert/strict');const{chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.route('**/*',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><body></body>'}));await p.goto('http://review.test/');await p.setContent(fs.readFileSync('pages/admin/modules/services/services.html','utf8'));
 await p.evaluate(()=>{
  document.querySelectorAll('.subtab-pane').forEach(e=>e.classList.remove('active'));document.getElementById('subtab-tab-service-reviews').classList.add('active');
  sessionStorage.setItem('pawpal_admin_active_module','Dịch vụ');sessionStorage.setItem('pawpal_admin_user',JSON.stringify({id:'admin'}));window.requests=[];
  window.PawpalServices={state:{isLoaded:true,reviewsData:[],liveStaffList:[]},subtabs:{},escapeHtml:s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))};
  window.getSupabaseClient=()=>({rpc:async(name,args)=>{if(name!=='admin_service_review_page')throw Error('Unexpected full review query');requests.push(args);const all=Array.from({length:23},(_,i)=>({id:'review-'+i,dbId:'review-'+i,reviewCode:'ĐG-'+i,customerName:'Khách '+i,phone:'0900000000',serviceName:'Spa',serviceId:'svc',category:'Spa',rating:4,comment:'Nội dung '+i,staff:'Nhân viên',replyText:'',status:'pending',createdAt:'2026-11-13T02:00:00Z'}));const rows=all.filter(r=>!args.p_filters.query||r.customerName.includes(args.p_filters.query));const page=Math.min(args.p_page,Math.max(1,Math.ceil(rows.length/args.p_size)));return {data:{rows:rows.slice((page-1)*args.p_size,page*args.p_size),total:rows.length,page,stats:{total:23,average:4,pending:23,low:0}}};}});
 });
 await p.addScriptTag({content:fs.readFileSync('pages/admin/admin-data-store.js','utf8')});
 const core=fs.readFileSync('pages/admin/modules/services/services.js','utf8'),a=core.indexOf('    let reviewReadVersion=0;'),b=core.indexOf('    PawpalServices.loadReviewsData = loadReviewsData;',a)+'    PawpalServices.loadReviewsData = loadReviewsData;'.length;
 await p.addScriptTag({content:'(()=>{const PawpalServices=window.PawpalServices;'+core.slice(a,b)+'})();'});
 await p.addScriptTag({content:fs.readFileSync('pages/admin/modules/services/subtabs/tab-service-reviews.js','utf8')});
 await p.waitForFunction(()=>document.querySelectorAll('#servicesReviewTableBody tr').length===10);assert.equal(await p.locator('#statTotalReviews').textContent(),'23');
 await p.locator('#servicesReviewsPagination [data-page="3"]').click();await p.waitForFunction(()=>document.querySelectorAll('#servicesReviewTableBody tr').length===3);
 await p.locator('#reviewSearchInput').fill('Khách 22');await p.waitForFunction(()=>document.querySelectorAll('#servicesReviewTableBody tr').length===1&&document.querySelector('#servicesReviewTableBody').textContent.includes('Khách 22'));assert.equal(await p.locator('#statTotalReviews').textContent(),'23');
 const exported=await p.evaluate(()=>PawpalServices.exportServiceReviews({}));assert.equal(exported.length,23);assert.equal(await p.evaluate(()=>requests.at(-1).p_size),100);
 assert.deepEqual(errors,[]);console.log('PASS actual review UI: 10/10/3 server pages, global KPI, off-page search, full explicit export; no live reads.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
