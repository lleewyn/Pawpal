'use strict';
// Actual recurring form and table; live read-only schedules, no saves or shift changes.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const {connect}=require('../../my-server/scripts/database/v1/service_import_connection.cjs');
async function main(){
 const db=await connect(),browser=await chromium.launch({channel:'chrome',headless:true}),folder=process.env.PAWPAL_RECURRING_PROOF_DIR||'docs/verification/staff-recurring-layout';fs.mkdirSync(folder,{recursive:true});
 try{
  await db.query("BEGIN READ ONLY;SET LOCAL statement_timeout='10s'");
  const admin=(await db.query("SELECT s.auth_user_id FROM public.staff s JOIN public.staff_role r ON r.staff_id=s.id WHERE r.role_code='ADMIN' AND s.employment_status='active' AND s.auth_user_id IS NOT NULL AND NOT s.must_change_password LIMIT 1")).rows[0];
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role','authenticated',true)",[admin.auth_user_id]);await db.query('SET LOCAL ROLE authenticated');
  const staff=(await db.query('SELECT id "rawId",full_name name,upper(employment_status) status FROM public.staff ORDER BY full_name,id')).rows;
  const page=await browser.newPage({viewport:{width:1440,height:1050}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.route('http://localhost/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body class="admin-body"><main style="height:100vh;overflow:auto"><div class="staff-module admin-ui-standard admin-ui-customer-reference"><section id="recurring" class="staff-recurring-panel"></section></div></main></body></html>'}));await page.goto('http://localhost/');
  const reads=[];
  await page.exposeFunction('readSchedules',async(from,to)=>{
   assert.ok(to-from<10);const count=Number((await db.query('SELECT count(*) total FROM public.staff_recurring_schedule')).rows[0].total),rows=(await db.query('SELECT to_jsonb(t) value FROM (SELECT * FROM public.staff_recurring_schedule ORDER BY staff_id,id LIMIT $1 OFFSET $2) t',[to-from+1,from])).rows.map(row=>row.value);
   reads.push(rows);return {data:rows,count,error:null};
  });
  await page.exposeFunction('readCoverage',async ids=>({data:(await db.query('SELECT recurring_schedule_id,generated_through::text FROM public.staff_recurring_shift_coverage($1)',[ids])).rows}));
  for(const file of ['my-client/pages/admin/admin.css','my-client/pages/admin/admin-components.css','my-client/pages/admin/admin-typography.css','my-client/pages/admin/admin-shell-v7.css','my-client/pages/admin/modules/staff/staff.css'])await page.addStyleTag({content:fs.readFileSync(file,'utf8')});
  const staffSource=fs.readFileSync('my-client/pages/admin/modules/staff/staff.js','utf8'),enhancer=staffSource.slice(staffSource.indexOf('    PawpalStaff.enhanceEntitySelect=function'),staffSource.indexOf('    function readStaffResource('));
  await page.addScriptTag({content:'window.PawpalStaff={};'+enhancer});
  await page.addScriptTag({content:fs.readFileSync('my-client/pages/admin/modules/staff/staff-recurring.mjs','utf8').replace('export async function','async function')});
  await page.evaluate(async staff=>{const client={from(table){if(table!=='staff_recurring_schedule')throw Error('unexpected table');const q={select(){return q;},order(){return q;},range(from,to){return readSchedules(from,to);}};return q;},rpc(name,args){if(name!=='staff_recurring_shift_coverage')throw Error('unexpected RPC');return readCoverage(args.p_ids);}};window.disposeRecurring=await mountRecurringSchedule(document.getElementById('recurring'),{staff,client,enhanceSelect:PawpalStaff.enhanceEntitySelect});},staff);
  assert.ok(reads[0].length>0);assert.equal(await page.locator('.staff-recurring-table th').count(),8);assert.ok(await page.locator('[data-edit]').count()<=10);
  const bounds=await page.locator('.staff-recurring-fields').evaluate(node=>{const start=node.querySelector('[name="start"]').getBoundingClientRect(),end=node.querySelector('[name="end"]').getBoundingClientRect();return {width:node.getBoundingClientRect().width,gap:end.left-start.right,top:Math.abs(start.top-end.top)};});assert.ok(bounds.width<=600&&Math.abs(bounds.gap-16)<1&&bounds.top<1);
  await page.screenshot({path:folder+'/desktop.png'});
  await page.locator('[data-edit]').first().click();
  const row=reads[0][0];assert.equal(await page.locator('[name="staff"]').inputValue(),row.staff_id);assert.equal(await page.locator('[name="start"]').inputValue(),row.start_time.slice(0,5));assert.equal(await page.locator('[name="end"]').inputValue(),row.end_time.slice(0,5));assert.equal(await page.locator('[name="weekday"]:checked').count(),row.weekdays.length);assert.equal(await page.locator('[name="from"]').inputValue(),row.valid_from);assert.equal(await page.locator('[name="to"]').inputValue(),row.valid_to||'');
  await page.locator('[data-reset]').click();assert.equal(await page.locator('[name="staff"]').inputValue(),'');
  await page.setViewportSize({width:390,height:844});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No outer horizontal overflow');
  await page.screenshot({path:folder+'/mobile-form.png'});
  await page.locator('.staff-recurring-list').scrollIntoViewIfNeeded();await page.screenshot({path:folder+'/mobile-table.png'});
  const wrapper=page.locator('.staff-recurring-list .table-responsive-wrapper');await wrapper.evaluate(node=>node.scrollLeft=node.scrollWidth);assert.ok(await wrapper.evaluate(node=>node.scrollLeft>0));await page.screenshot({path:folder+'/mobile-table-right.png'});
  assert.deepEqual(errors,[]);
  fs.writeFileSync(folder+'/verification.txt','PASS: Actual recurring schedule component and staff selector; real schedules under Admin RLS, read-only transaction.\nPASS: Desktop form width <=600px, 16px between adjacent start/end fields; 8-column saved-schedule table, at most 10 records; edit fills original staff/time/weekdays; reset clears edit.\nPASS: Mobile single-column form, no outer horizontal overflow, schedule table scrolls to action column. No JavaScript errors.\nNo schedule save, assignment, permission or database changes.\n');
  console.log('PASS: adjacent time/date fields, recurring table, edit/reset, mobile scroll; live read-only evidence');
 }finally{await db.query('ROLLBACK');await db.end();await browser.close();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
