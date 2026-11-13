const fs=require('node:fs'),assert=require('node:assert/strict');const{chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const p=await browser.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.route('**/*',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><body></body>'}));await p.goto('http://settings.test/');await p.setContent(fs.readFileSync('pages/admin/modules/settings/settings.html','utf8'));
 await p.evaluate(()=>{
  sessionStorage.setItem('pawpal_admin_active_module','Cấu hình');sessionStorage.setItem('pawpal_admin_user',JSON.stringify({id:'admin'}));window.requests=[];window.detailReads=0;
  const articles=Array.from({length:23},(_,i)=>({id:'article-'+i,title:'Bài '+i,summary:'Tóm tắt',slug:'bai-'+i,category_id:'cat',status:'PUBLISHED',view_count:10,updated_at:'2026-11-13T02:00:00Z',created_at:'2026-11-13T02:00:00Z'}));
  const banners=Array.from({length:23},(_,i)=>({id:'banner-'+i,title:'Banner '+i,status:'active',image_url:'',image_media_asset_id:null}));
  const vouchers=Array.from({length:23},(_,i)=>({id:'voucher-'+i,voucher_code:'CODE'+i,voucher_name:'Ưu đãi '+i,type:'fixed',discount_value:10000,max_usage:100,is_active:true,applicable_for:'shop'}));
  window.getSupabaseClient=()=>({rpc:async(name,args)=>{
   requests.push({name,args});
   if(name==='admin_promos_page'){const filtered=vouchers.filter(v=>!args.p_filters.query||v.voucher_code.includes(args.p_filters.query));const vp=Math.min(args.p_voucher_page,Math.max(1,Math.ceil(filtered.length/10))),bp=Math.min(args.p_banner_page,3);return {data:{banners:banners.slice((bp-1)*10,bp*10),vouchers:filtered.slice((vp-1)*10,vp*10),usageCounts:Object.fromEntries(vouchers.map(v=>[v.id,3])),bannerTotal:23,bannerPage:bp,voucherTotal:filtered.length,voucherPage:vp,stats:{totalVouchers:23,activeVouchers:23,activeBanners:23,expiringBanners:0,exhaustedVouchers:0,lowStockVouchers:0}}};}
   if(name==='admin_article_page'){const filtered=articles.filter(a=>!args.p_filters.query||a.title.includes(args.p_filters.query));const page=Math.min(args.p_page,Math.max(1,Math.ceil(filtered.length/10)));return {data:{blogs:filtered.slice((page-1)*10,page*10),categories:[{id:'cat',category_name:'care',description:'Chăm sóc'}],knowledge:[],total:filtered.length,page,stats:{total:23,published:23,draft:0,hidden:0,views:230}}};}
   throw Error('Unexpected RPC');
  },from(table){let id;const q={};for(const name of ['select','order','range','limit'])q[name]=()=>q;q.eq=(key,value)=>{if(key==='id')id=value;return q;};q.single=async()=>{if(table!=='blog_post')throw Error('Unexpected detail');detailReads++;return {data:{...articles.find(a=>a.id===id),...(window.detailChanged?{title:'changed'}:{}),content:'Nội dung đầy đủ'}};};q.then=resolve=>Promise.resolve({data:[]}).then(resolve);return q;},channel:()=>({on(){return this;},subscribe(){return this;}}),removeChannel(){}});
 });
 for(const file of ['pages/admin/admin-data-store.js','pages/admin/modules/settings/settings.js','pages/admin/modules/settings/subtabs/tab-settings-banners.js','pages/admin/modules/settings/subtabs/tab-settings-content.js'])await p.addScriptTag({content:fs.readFileSync(file,'utf8')});
 await p.evaluate(()=>PawpalSettings.init());
 assert.equal(await p.locator('#vouchersTableBody tr').count(),10);assert.equal(await p.locator('#statTotalVouchers').textContent(),'23');
 await p.locator('[data-voucher-page="3"]').click();await p.waitForFunction(()=>document.querySelectorAll('#vouchersTableBody tr').length===3);
 await p.evaluate(()=>PawpalSettings.switchSubtab('tab-content-management'));assert.equal(await p.locator('#articlesTableBody tr').count(),10);assert.equal(await p.locator('#statTotalArticles').textContent(),'23');assert.equal(await p.evaluate(()=>detailReads),0);
 await p.locator('[data-article-page="3"]').click();await p.waitForFunction(()=>document.querySelectorAll('#articlesTableBody tr').length===3);
 await p.locator('#searchArticleInput').fill('Bài 22');await p.waitForFunction(()=>document.querySelectorAll('#articlesTableBody tr').length===1&&document.querySelector('#articlesTableBody').textContent.includes('Bài 22'));
 const detail=await p.evaluate(()=>PawpalSettings.loadFullRecord('blog_post','article-22'));assert.equal(detail.content,'Nội dung đầy đủ');assert.equal(await p.evaluate(()=>detailReads),1);assert.equal(await p.locator('#statTotalViews').textContent(),'230');
 await p.evaluate(async()=>{PawpalSettings.openModal('articleModalOverlay');document.getElementById('inputArticleContent').value='Bản nháp đang sửa';await PawpalSettings.fetchContentData({force:true});});
 assert.equal(await p.locator('#inputArticleContent').inputValue(),'Bản nháp đang sửa');
 const conflict=await p.evaluate(async()=>{window.detailChanged=true;try{await PawpalSettings.loadFullRecord('blog_post','article-21');return false;}catch{return true;}});assert.equal(conflict,true,'Lazy detail cannot silently replace a changed version');
 assert.deepEqual(errors,[]);console.log('PASS actual Settings UI: voucher/article server paging, global stats, off-page search, body fetched only on demand. Offline only.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
