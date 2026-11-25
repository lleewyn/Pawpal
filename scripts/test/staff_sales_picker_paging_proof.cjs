'use strict';
// Focused actual picker checks with live read-only stock. No customer selection, quote, order or payment writes.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const {connect}=require('../../my-server/scripts/database/v1/service_import_connection.cjs');
async function main(){
 const db=await connect(),browser=await chromium.launch({channel:'chrome',headless:true});
 const folder='docs/verification/staff-sales-picker-paging';fs.mkdirSync(folder,{recursive:true});
 try{
  await db.query("BEGIN READ ONLY;SET LOCAL statement_timeout='10s'");
  const actor=(await db.query("SELECT s.id,s.auth_user_id FROM public.staff s JOIN public.staff_role r ON r.staff_id=s.id WHERE r.role_code='STAFF' AND s.employment_status='active' AND s.auth_user_id IS NOT NULL AND NOT s.must_change_password ORDER BY s.id LIMIT 1")).rows[0];assert.ok(actor);
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role','authenticated',true)",[actor.auth_user_id]);await db.query('SET LOCAL ROLE authenticated');
  const page=await browser.newPage({viewport:{width:1100,height:950}}),errors=[],reads=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('http://localhost/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body class="admin-body"></body></html>'}));
  await page.goto('http://localhost/');
  await page.exposeFunction('liveRpc',async(name,args)=>{
   assert.equal(name,'get_staff_workspace');assert.equal(args.p_kind,'stock');
   const data=(await db.query('SELECT public.get_staff_workspace($1,$2,$3,$4) value',[args.p_kind,args.p_query,args.p_id,args.p_page])).rows[0].value;
   reads.push({page:args.p_page,query:args.p_query,items:data.items});return {data,error:null};
  });
  for(const file of ['admin.css','admin-components.css','admin-typography.css','admin-shell-v7.css'])await page.addStyleTag({content:fs.readFileSync('pages/admin/'+file,'utf8')});
  await page.evaluate(id=>{window.PawpalAdminAccess={isStaff:()=>true,state:{user:{id,permissions:['work.sales.create']}}};window.getSupabaseClient=()=>({rpc:(name,args)=>liveRpc(name,args)});},actor.id);
  const source=fs.readFileSync('my-client/pages/admin/modules/orders/orders.js','utf8');await page.addScriptTag({content:source.slice(0,source.indexOf('})();')+5)});
  await page.evaluate(()=>PawpalStaffSales.open());
  const input=page.locator('#staffSalesproduct'),menu=page.locator('#staffSalesproductOptions');
  const waitPage=async number=>{
   await page.waitForFunction(number=>{const menu=document.querySelector('#staffSalesproductOptions');return !menu.hidden&&menu.querySelector('[role="option"]')&&menu.querySelector('.workspace-autocomplete-pager [aria-current="page"]')?.textContent===String(number);},number);
  };
  await input.focus();await waitPage(1);const first=reads.find(row=>row.page===1).items;assert.equal(first.length,10);
  await menu.getByRole('button',{name:'Trang sau',exact:true}).click();await waitPage(2);
  const second=reads.find(row=>row.page===2).items;assert.ok(second.length>0);assert.notEqual(first[0].id,second[0].id);
  assert.equal(await menu.getByRole('option').first().locator('small').textContent(),second[0].sku_variant+' · '+new Intl.NumberFormat('vi-VN').format(Number(second[0].sale_price))+' đ');
  assert.equal(await input.getAttribute('aria-expanded'),'true');
  await menu.evaluate(node=>node.scrollTop=node.scrollHeight);
  await page.screenshot({path:folder+'/desktop-page-2.png'});
  await menu.getByRole('button',{name:'Trang trước',exact:true}).click();await waitPage(1);
  assert.ok((await menu.getByRole('option').first().textContent()).includes(first[0].sku_variant));
  await menu.getByRole('button',{name:'Trang sau',exact:true}).click();await waitPage(2);
  await page.setViewportSize({width:390,height:844});await input.scrollIntoViewIfNeeded();
  await menu.evaluate(node=>node.scrollTop=node.scrollHeight);
  await page.screenshot({path:folder+'/mobile-page-2.png'});
  await menu.getByRole('option').first().click();
  assert.ok((await page.locator('#staffSalesLines').textContent()).includes(second[0].sku_variant));
  assert.equal(await menu.isVisible(),false);
  await page.setViewportSize({width:1100,height:950});await page.screenshot({path:folder+'/selected-page-2-product.png'});
  await input.click();await waitPage(1);await page.locator('#staffSalesTitle').click();assert.equal(await menu.isVisible(),false);
  assert.deepEqual(errors,[]);
  fs.writeFileSync(folder+'/verification.txt','PASS: Actual staffSalesModal product picker with live read-only scoped stock RPC.\nPASS: Next page stays open and shows page-2 SKUs; previous restores page-1 SKUs; next again stays open; page-2 product selected into cart; outside click still closes list; aria-expanded correct; no JavaScript errors.\nDesktop/mobile screenshots reviewed separately. No customer, quote, order creation, payment or database writes. No complete testcase replay.\n');
  console.log('PASS: next/previous pages remain open, correct real products shown, page-2 selection and outside close');
 }finally{await db.query('ROLLBACK');await db.end();await browser.close();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
