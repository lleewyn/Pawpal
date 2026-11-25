'use strict';
// Execute the real toolbar and date handlers only. Metrics loading is disabled; no data is invented or fetched.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
async function main(){
 const browser=await chromium.launch({channel:'chrome',headless:true}),folder='docs/verification/dashboard-month-vs-30-days';fs.mkdirSync(folder,{recursive:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:500}});
  page.on('pageerror',error=>console.error(error.message));
  await page.clock.setFixedTime(new Date('2026-11-23T12:00:00+07:00'));
  await page.route('http://localhost/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="vi"><meta charset="utf-8"><body class="admin-body"><main class="dashboard-module dash-page admin-ui-standard admin-ui-customer-reference business-dash" data-business-root></main></body></html>'}));await page.goto('http://localhost/');
  for(const file of ['my-client/pages/admin/admin.css','my-client/pages/admin/admin-components.css','my-client/pages/admin/admin-typography.css','my-client/pages/admin/modules/dashboard/dashboard.css'])await page.addStyleTag({content:fs.readFileSync(file,'utf8')});
  await page.addScriptTag({content:fs.readFileSync('my-client/pages/admin/modules/dashboard/subtabs/business-metrics.js','utf8')});
  const source=fs.readFileSync('my-client/pages/admin/modules/dashboard/subtabs/tab-dashboard-business.js','utf8');
  const shell=source.slice(source.indexOf('    const panel ='),source.indexOf('    function status('));
  const handlers=source.slice(source.indexOf('    function monthRange('),source.indexOf('    async function init('));
  await page.addScriptTag({content:`(()=>{const M=PawpalBusinessMetrics,state={root:document.querySelector('[data-business-root]'),drillGeneration:0},$=selector=>state.root.querySelector(selector),date=value=>value.split('-').reverse().join('/');let financeMountedRoot;const reload=()=>Promise.resolve();${shell}${handlers}shell();state.root.addEventListener('click',click);window.inspectPeriod=()=>state.range;})();`});
  const results={};
  for(const [preset,name,from,to]of [['month','month','2026-11-01','2026-11-30'],['30','30-days','2026-10-25','2026-11-23']]){
   await page.locator('[data-biz-preset="'+preset+'"]').click();const range=await page.evaluate(()=>inspectPeriod());assert.equal(range.from,from);assert.equal(range.to,to);assert.equal(range.length,30);
   assert.equal(await page.locator('[data-biz-preset][aria-pressed="true"]').count(),1);
   await page.locator('.biz-toolbar').screenshot({path:folder+'/'+name+'.png'});results[name]=range;
  }
  assert.notEqual(results.month.from,results['30-days'].from);
  fs.writeFileSync(folder+'/verification.txt','PASS: Actual shell, click handler, monthRange, apply, and BusinessMetrics date functions.\nClock fixed to 23/11/2026 in UTC+7 to match reported screenshot.\nTháng này: 01/11/2026–30/11/2026 (calendar month).\n30 ngày: 25/10/2026–23/11/2026 (rolling 30 days, includes today).\nPeriods differ; each selects only its own filter. No application source changed, no database queries, no metrics mock data.\n');
  console.log('PASS: Tháng này=01/11–30/11; 30 ngày=25/10–23/11; distinct date filters');
 }finally{await browser.close();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
