const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),{chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const root=process.cwd(),folder='D:/Aboutme/Pawpal-infra/supabase-local/verification';
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const p=await browser.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/*',r=>{const u=new URL(r.request().url());if(u.origin==='http://localhost:3001'&&u.pathname==='/')return r.fulfill({contentType:'text/html',body:'<!doctype html><html><body></body></html>'});if(u.origin==='http://localhost:3001'&&u.pathname.endsWith('.css'))return r.fulfill({contentType:'text/css',body:fs.readFileSync(path.join(root,u.pathname),'utf8')});return r.abort()});await p.goto('http://localhost:3001/');
 let shell=fs.readFileSync('pages/admin/index.html','utf8').replace(/<script\b[\s\S]*?<\/script>/gi,'');
 const customer=fs.readFileSync('pages/admin/modules/customers/customers.html','utf8'),orders=fs.readFileSync('pages/admin/modules/orders/orders.html','utf8');
 const read=async selector=>p.locator(selector).first().evaluate(e=>{const c=getComputedStyle(e);return Object.fromEntries(['fontFamily','fontSize','lineHeight','paddingTop','paddingBottom','paddingLeft','height','borderRadius','backgroundColor','color'].map(k=>[k,c[k]]))});
 async function show(module){await p.evaluate(html=>{document.getElementById('contentArea').innerHTML='<div class="admin-module-wrapper">'+html+'</div>';},module);await p.waitForTimeout(30)}
 async function seedCustomer(){await p.evaluate(()=>document.querySelector('#customerDataTable tbody').innerHTML=Array.from({length:8},(_,i)=>'<tr><td>CUS-2026-'+i+'</td><td><span class="user-name-link">Customer '+i+'</span><div class="user-sub-cell">customer@example.test</div></td><td>0901234567</td><td>Pet</td><td>50</td><td>—</td><td><span class="admin-badge badge-success">Active</span></td><td><button type="button" class="btn-action-more">•••</button></td></tr>').join(''))}
 for(const width of [1280,1440,1680]){
  await p.setViewportSize({width,height:1000});await p.setContent(shell.replace(/<link[^>]+admin-components\.css[^>]*>/,''),{waitUntil:'domcontentloaded'});await show(customer);await seedCustomer();
  const reference={th:await read('#customerDataTable th'),td:await read('#customerDataTable td'),status:await read('#customerDataTable .admin-badge'),input:await read('#subtab-tab-list .admin-input'),button:await read('#subtab-tab-list .admin-btn')};
  await p.addStyleTag({content:fs.readFileSync('pages/admin/admin-components.css','utf8')});
  assert.deepEqual({th:await read('#customerDataTable th'),td:await read('#customerDataTable td'),status:await read('#customerDataTable .admin-badge'),input:await read('#subtab-tab-list .admin-input'),button:await read('#subtab-tab-list .admin-btn')},reference,'Customer reference changed');
  await p.screenshot({path:folder+'/standards-customer-'+width+'.png'});
  await show(orders);
  const duplicateIds=await p.evaluate(()=>{const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);return ids.filter((v,i)=>ids.indexOf(v)!==i)});assert.deepEqual(duplicateIds,[]);
  for(const tab of ['list','products','promos']){
   await p.evaluate(tab=>{document.querySelectorAll('#contentArea .subtab-content').forEach(e=>e.classList.toggle('active',e.id==='subtab-tab-order-'+tab));const table=document.querySelector('#subtab-tab-order-'+tab+' .admin-table'),count=table.querySelectorAll('thead tr:first-child th').length;table.querySelector('tbody').innerHTML=Array.from({length:8},(_,i)=>'<tr>'+Array.from({length:count},(_,j)=>'<td>'+(j===(tab==='list'?2:1)?'<span class="user-name-link">Customer or product with a long name '+i+'</span><div class="sub-meta-text">SKU-2026-'+i+'</div>':tab==='list'&&j===0?'<input type="checkbox" aria-label="Select order">':j===count-2?'<span class="admin-badge badge-success">Active</span>':j===count-1?'<button type="button" class="btn-action-trigger">•••</button>':'Data '+i+'-'+j)+'</td>').join('')+'</tr>').join('');},tab);
   const prefix='#subtab-tab-order-'+tab;const th=await read(prefix+' th'),td=await read(prefix+' td'),status=await read(prefix+' .admin-badge');
   for(const key of ['fontFamily','fontSize','lineHeight','paddingTop','paddingBottom']){assert.equal(th[key],reference.th[key],tab+' th '+key);assert.equal(td[key],reference.td[key],tab+' td '+key)}
   for(const key of ['fontFamily','fontSize','lineHeight','paddingTop','paddingBottom','backgroundColor','borderRadius'])assert.equal(status[key],reference.status[key],tab+' status '+key);
   const bound=await p.locator(prefix+' .table-responsive-wrapper').evaluate(e=>({right:e.getBoundingClientRect().right,width:innerWidth,scroll:e.scrollWidth,client:e.clientWidth}));assert.ok(bound.right<=bound.width+1,'table viewport overflow');
   if(bound.scroll>bound.client){const scroller=p.locator(prefix+' .table-responsive-wrapper');await scroller.focus();await p.keyboard.press('ArrowRight');await p.waitForTimeout(80);assert.ok(await scroller.evaluate(e=>e.scrollLeft)>0,'table not keyboard scrollable');await scroller.evaluate(e=>{e.scrollLeft=0;e.blur()});}
   assert.equal(await p.locator(prefix+' .admin-input').first().evaluate(e=>e.labels.length>0),true,'missing input label');assert.equal(await p.locator(prefix+' th:not([scope="col"])').count(),0,'header scope');
   assert.equal(await p.locator(prefix+' .user-name-link').first().evaluate(e=>e.getBoundingClientRect().right<=e.closest('td').getBoundingClientRect().right+1),true,'long primary text escapes cell');
   await p.screenshot({path:folder+'/standards-orders-'+tab+'-'+width+'.png'});
  }
 }
 assert.deepEqual(errors,[]);console.log('PASS shared workspace styles at 1280/1440/1680: Customer unchanged, table/status metrics match, labels/scopes/unique IDs and controlled table bounds; static UI only.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
