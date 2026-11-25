'use strict';
// Focused search checks and actual workspace screenshots. No business data writes.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const {connect}=require('../../my-server/scripts/database/v1/service_import_connection.cjs');
async function main(){
 const db=await connect(),browser=await chromium.launch({channel:'chrome',headless:true});
 const folder='docs/verification/staff-order-search';fs.mkdirSync(folder,{recursive:true});
 const migration=fs.readFileSync('my-server/scripts/database/v1/281_staff_order_search.sql','utf8').replace(/^BEGIN;/,'').replace(/COMMIT;\s*$/,'');
 try{
  await db.query("BEGIN;SET LOCAL statement_timeout='10s'");
  const original=(await db.query("SELECT pg_get_functiondef('public.get_staff_workspace(text,text,uuid,integer)'::regprocedure) body")).rows[0].body;
  const order=(await db.query("SELECT o.id,o.order_code,cp.full_name FROM public.sales_order o JOIN public.customer_profile cp ON cp.customer_id=o.customer_id WHERE o.id='2df94493-8dde-44a0-b740-324bbc993085'")).rows[0];assert.ok(order);
  const actor=(await db.query("SELECT s.id,s.auth_user_id FROM public.staff s JOIN public.staff_role r ON r.staff_id=s.id WHERE r.role_code='STAFF' AND s.employment_status='active' AND s.auth_user_id IS NOT NULL AND NOT s.must_change_password ORDER BY s.id LIMIT 1")).rows[0];
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role','authenticated',true)",[actor.auth_user_id]);
  const rpc=async(name,args)=>{assert.equal(name,'get_staff_workspace');assert.ok(['orders','order_lines'].includes(args.p_kind));return {data:(await db.query('SELECT public.get_staff_workspace($1,$2,$3,$4) value',[args.p_kind,args.p_query,args.p_id,args.p_page])).rows[0].value};};
  const search=async query=>(await rpc('get_staff_workspace',{p_kind:'orders',p_query:query,p_id:null,p_page:1})).data.items;
  await db.query('SET LOCAL ROLE authenticated');
  const queries=[order.id.slice(0,3),order.order_code.slice(0,-4),order.order_code,order.id,order.full_name];
  const before=[];for(const query of queries)before.push({query,found:(await search(query)).some(row=>row.id===order.id)});
  await db.query('RESET ROLE');await db.query(migration);await db.query(migration);await db.query('SET LOCAL ROLE authenticated');
  for(const query of queries){const rows=await search(query);assert.ok(rows.some(row=>row.id===order.id),'Search '+query);assert.ok(rows.length<=10);}
  assert.equal((await search('no-such-order-281-proof')).length,0);
  const byId=(await rpc('get_staff_workspace',{p_kind:'orders',p_query:'',p_id:order.id,p_page:1})).data.items;assert.ok(byId.some(row=>row.id===order.id));
  await db.query('SAVEPOINT short_query');try{await search('ab');assert.fail('Short query must fail');}catch(error){assert.equal(error.message,'work_search_required');await db.query('ROLLBACK TO SAVEPOINT short_query');}
  const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('http://localhost/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body class="admin-body"><header id="headerSubtabsGroup"></header><main class="admin-preview-content"></main></body></html>'}));
  await page.goto('http://localhost/#tab-order-list');await page.exposeFunction('readRpc',rpc);
  for(const file of ['admin.css','admin-components.css','admin-typography.css','admin-shell-v7.css'])await page.addStyleTag({content:fs.readFileSync('pages/admin/'+file,'utf8')});
  await page.addStyleTag({content:'body.admin-body{background:#F4F8F6}#headerSubtabsGroup{display:flex;gap:8px;align-items:center;height:56px;padding:0 20px;background:#fff}main.admin-preview-content{position:static;height:calc(100vh - 56px);padding:20px;overflow:auto}'});
  await page.evaluate(id=>{window.PawpalAdminAccess={isStaff:()=>true,state:{user:{id,permissions:['work.sales.read','work.cashier.collect','work.complaint.handle']}}};window.getSupabaseClient=()=>({rpc:(name,args)=>readRpc(name,args)});},actor.id);
  const core=fs.readFileSync('my-client/pages/admin/admin.js','utf8');await page.addScriptTag({content:core.slice(0,core.indexOf('})();')+5)});
  const domain=fs.readFileSync('my-client/pages/admin/modules/orders/orders.js','utf8'),start=domain.indexOf('(function registerRoleViews()');await page.addScriptTag({content:domain.slice(start,domain.indexOf('})();',start)+5)});
  await page.evaluate(()=>{window.addEventListener('hashchange',async()=>{const query=new URLSearchParams(location.hash.split('?')[1]||'').get('q');await PawpalAdminViews.mount('Bán hàng',document.querySelector('main'));window.completedSearch=query;});return PawpalAdminViews.mount('Bán hàng',document.querySelector('main'));});
  for(const [query,label]of [[queries[0],'partial-code'],[order.full_name,'customer-name']]){
   await page.getByRole('searchbox').fill(query);await page.getByRole('button',{name:'Tìm kiếm',exact:true}).click();
   await page.waitForFunction(query=>window.completedSearch===query,query);
   await page.locator('tr[data-record-id="'+order.id+'"]').waitFor();
   await page.screenshot({path:folder+'/'+label+'.png'});
  }
  await page.locator('tr[data-record-id="'+order.id+'"] button').click();await page.locator('.workspace-order-summary').waitFor();
  assert.equal(await page.locator('.workspace-order-actions button').count(),3);
  assert.equal(await page.getByRole('button',{name:/Hoàn tiền|Quản lý giá/}).count(),0);
  assert.deepEqual(errors,[]);
  await db.query('ROLLBACK');
  if(process.argv.includes('--apply-cloud')){
   const backup='my-server/scripts/database/v1/281_staff_order_search.rollback.sql';if(!fs.existsSync(backup))fs.writeFileSync(backup,'BEGIN;\n'+original+';\nNOTIFY pgrst,\'reload schema\';\nCOMMIT;\n');
   await db.query('BEGIN');await db.query(migration);await db.query('COMMIT');
  }
  fs.writeFileSync(folder+'/verification.txt','PASS: focused live STAFF search RPC and actual search form.\nBefore: '+before.map(row=>row.query+'='+row.found).join('; ')+'\nAfter: partial code (3 characters), longer code, full code, UUID and customer name find reported order; missing query empty; short query rejected; ID detail lookup preserved; at most 10 rows.\nUI: search button, result, opening profile; 3 staff actions; no price/refund management buttons; no JavaScript errors.\nNo order/payment writes; no full testcase replay.\nMigration applied: '+process.argv.includes('--apply-cloud')+'\n');
  console.log('PASS: scoped search RPC, real search UI, detail navigation and permissions; migration applied='+process.argv.includes('--apply-cloud'));
 }finally{await db.query('ROLLBACK');await db.end();await browser.close();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
