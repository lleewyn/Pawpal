const fs = require('fs'), path = require('path'), assert = require('node:assert/strict');
const { chromium } = require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
(async () => {
 const browser = await chromium.launch({channel:'chrome',headless:true});
 try {
  const page = await browser.newPage();
  await page.route('**/*', route => {
   const url = new URL(route.request().url());
   if(url.hostname!=='localhost') return route.abort();
   if(url.pathname.endsWith('.css')) return route.fulfill({contentType:'text/css',body:fs.readFileSync(path.join(process.cwd(),url.pathname),'utf8')});
   return route.fulfill({contentType:'text/html',body:'<html></html>'});
  });
  await page.goto('http://localhost:3000/');
  await page.setContent(fs.readFileSync('pages/admin/index.html','utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));
  const cases = [
   ['customers','user-name-link','user-sub-cell','customer-code-text'],
   ['pets','pet-name-link','pet-sub-cell','pet-code-text'],
   ['orders','user-name-link','sub-meta-text','order-code-link'],
   ['services','user-name-link','sub-meta-text','bkg-code-link'],
   ['staff','name-cell-text','admin-table__secondary','admin-table__code'],
   ['complaints','user-name-link','admin-table__secondary','admin-table__code'],
   ['settings','user-name-link','admin-table__secondary','voucher-code-badge'],
   ['chatbot','user-name-link','admin-table__secondary','admin-table__code']
  ];
  let reference;
  for(const [module,name,secondary,code] of cases){
   await page.locator('#contentArea').evaluate((el,html)=>el.innerHTML=html,fs.readFileSync(`pages/admin/modules/${module}/${module}.html`,'utf8'));
   const table=page.locator(module==='customers'?'#customerDataTable':'.admin-table').first();
   const actual=await table.evaluate((el,roles)=>{
    el.innerHTML=`<thead><tr><th>Tiêu đề</th></tr></thead><tbody><tr><td>Dữ liệu <a class="${roles.name}">Tên hiển thị</a><div class="${roles.secondary}">Thông tin phụ</div><strong class="${roles.code}">Mã hồ sơ</strong><span class="admin-badge badge-success">Hoạt động</span></td></tr></tbody>`;
    return ['th','td',`.${roles.name}`,`.${roles.secondary}`,`.${roles.code}`,'.admin-badge'].map(selector=>{
     const s=getComputedStyle(el.querySelector(selector));
     return Object.fromEntries(['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing'].map(key=>[key,s[key]]));
    });
   },{name,secondary,code});
   reference ||= actual;
   assert.deepEqual(actual,reference,`${module} must match Customer typography`);
   const overflow = await table.evaluate(el => {
    for(let parent=el;parent&&parent!==document.body;parent=parent.parentElement) parent.style.setProperty('display','block','important');
    const span=document.createElement('span');span.className='admin-table-code';
    const full='CODE-'+ '1234567890'.repeat(8);span.textContent=full;span.title=full;
    el.querySelector('td').replaceChildren(span);
    const longFits=span.clientWidth>0&&span.clientWidth<=125&&span.scrollWidth>span.clientWidth;
    const ellipsis=getComputedStyle(span).textOverflow;
    const preserved=span.textContent===full&&span.title===full;
    span.textContent='SKU-01';
    return {longFits,ellipsis,preserved,shortFits:span.scrollWidth<=span.clientWidth};
   });
   assert.deepEqual(overflow,{longFits:true,ellipsis:'ellipsis',preserved:true,shortFits:true},`${module} must constrain long codes while preserving full and short values`);
  }
  console.log('PASS table headings, body, names, secondary text, codes and statuses match the unchanged Customer reference across eight modules. CSS only, no database requests.');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exit(1)});
