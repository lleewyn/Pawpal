const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage();
 await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.hostname!=='localhost')return r.abort();const file=path.join(process.cwd(),u.pathname);if(fs.existsSync(file)&&fs.statSync(file).isFile())return r.fulfill({contentType:file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'image/webp',body:fs.readFileSync(file)});return r.fulfill({body:'<!doctype html><body></body>',contentType:'text/html'});});
 const css=[...fs.readFileSync('pages/admin/index.html','utf8').matchAll(/<link[^>]+href="([^"#]+\.css[^"#]*)"[^>]*>/g)].map(m=>'<link rel="stylesheet" href="'+m[1]+'">').join('');
 const cases=[
  {name:'orders',tab:'subtab-tab-order-detail',header:'.order-detail-header-bar',actions:'.order-action-bar-top'},
  {name:'services',tab:'subtab-tab-service-detail',header:'.service-detail-header-bar',actions:'.service-action-bar-top'},
  {name:'customers',tab:'subtab-tab-profile',header:'.profile-quick-actions-bar',actions:'.drawer-action-buttons'},
  {name:'pets',tab:'subtab-tab-pet-profile',header:'.profile-quick-actions-bar',actions:'.drawer-action-buttons'},
  {name:'staff',tab:'subtab-tab-staff-profile',header:'.staff-profile-quick-bar',actions:'.staff-quick-actions'}
 ];
 const dir='docs/verification/admin-detail-layouts';fs.mkdirSync(dir,{recursive:true});let checked=0;
 for(const c of cases){
  await page.goto('http://localhost/');await page.setContent(css+'<main class="admin-preview-content" style="height:100vh;width:100%;box-sizing:border-box;padding:24px;overflow:auto">'+fs.readFileSync(`pages/admin/modules/${c.name}/${c.name}.html`,'utf8')+'</main>');
  await page.evaluate(c=>{
   document.body.className='admin-body';document.querySelectorAll('.subtab-content').forEach(e=>e.classList.toggle('active',e.id===c.tab));
   const root=document.querySelector('#'+c.tab+' .admin-detail-surface');for(let e=root;e&&e!==document.querySelector('main');e=e.parentElement){e.hidden=false;e.style.display=e.classList.contains('subtab-content')?'flex':'block';}
   for(const id of ['customerProfilePlaceholder','orderDetailLoading','serviceDetailState'])document.getElementById(id)?.remove();
   const customerData=document.getElementById('customerProfileData');if(customerData)customerData.hidden=false;
   const fill=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value;};
   fill('detailOrderCode','Đơn hàng kiểm tra bố cục');fill('detailOrderMeta','13/11/2026 · Đặt hàng trực tuyến');fill('detailCustomerNote','Giao hàng trong giờ hành chính. Vui lòng gọi trước khi giao, kiểm tra sản phẩm và đóng gói cẩn thận.');fill('detailReceiverAddress','Địa chỉ nhận hàng có nhiều thông tin: số nhà, tên đường, phường và tỉnh/thành phố.');
   fill('detailBookingCode','Lịch hẹn kiểm tra bố cục');fill('detailBookingMeta','13/11/2026 · 09:00');fill('detailBookingCustomerNote','Bé có da nhạy cảm. Vui lòng trao đổi với chủ nuôi trước khi sử dụng sản phẩm chăm sóc.');
   fill('drawerCustomerName','Hồ sơ khách hàng kiểm tra bố cục');fill('drawerPetName','Hồ sơ thú cưng kiểm tra bố cục');fill('viewStaffName','Hồ sơ nhân viên kiểm tra bố cục');
   for(const id of ['detailOrderActionButtons','detailBookingActionButtons']){const el=document.getElementById(id);if(el)el.innerHTML='<button type="button" class="admin-btn admin-btn-secondary">Sửa thông tin</button><button type="button" class="admin-btn admin-btn-primary">Xác nhận</button>';}
   const list=document.getElementById('detailOrderItemsBody');if(list)list.innerHTML='<tr><td>Sản phẩm có tên dài để kiểm tra bố cục và khả năng xuống dòng</td><td>SKU-BO-CUC</td><td>120.000 đ</td><td>2</td><td>240.000 đ</td></tr>';
   fill('detailSummarySubtotal','240.000 đ');fill('detailSummaryShipping','30.000 đ');fill('detailSummaryTotal','270.000 đ');
  },c);
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:1000});
   const root=page.locator('#'+c.tab+' .admin-detail-surface');assert.equal(await root.evaluate(e=>getComputedStyle(e).borderRadius),'9px',c.name+' radius');
   const measurements=await page.evaluate(({tab,header,actions})=>{const root=document.querySelector('#'+tab+' .admin-detail-surface'),h=root.querySelector(header),a=root.querySelector(actions),r=root.getBoundingClientRect(),b=a.getBoundingClientRect();return {scroll:document.querySelector('main').scrollWidth,viewport:innerWidth,right:r.right,actionsRight:b.right,actionsLeft:b.left,actionsWidth:b.width,headingRight:h.getBoundingClientRect().right,overflows:[...root.querySelectorAll("*")].filter(e=>e.getClientRects().length&&e.getBoundingClientRect().right>innerWidth+1).slice(0,6).map(e=>({tag:e.tagName,id:e.id,cls:e.className,right:e.getBoundingClientRect().right}))};},c);
   assert.ok(measurements.scroll<=width+1,c.name+' overflow '+width+' '+JSON.stringify(measurements));
   assert.ok(measurements.actionsRight<=measurements.right+1,c.name+' action overflow');
   if(width===1440)assert.ok(measurements.actionsLeft>width/2,c.name+' actions should be right aligned');
   if(c.name==='orders'){
    assert.equal(await root.locator('.shipping-info-block').first().evaluate(e=>getComputedStyle(e).borderTopWidth),'0px');
    assert.equal(await root.locator('.order-detail-header-bar').evaluate(e=>getComputedStyle(e).borderBottomWidth),'0px');
   }
   await page.screenshot({animations:'disabled',path:dir+'/'+c.name+'-'+width+'.png'});checked++;
  }
 }
 console.log('PASS '+checked+' actual Admin detail layouts with shell styles: orders/services/customers/pets/staff, 1440px/390px, radius, right actions, overflow and flat order surfaces. Layout fixtures only; no API/Cloud calls.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
