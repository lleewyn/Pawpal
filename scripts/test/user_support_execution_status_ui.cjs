const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const p=await browser.newPage({viewport:{width:1365,height:950}});
 await p.route('**/*',r=>{const u=new URL(r.request().url());if(u.hostname!=='localhost')return r.abort();
  if(u.pathname==='/scripts/shared/support-handler.js')return r.fulfill({contentType:'text/javascript',body:''});
  const f=path.join(process.cwd(),u.pathname);if(fs.existsSync(f)&&fs.statSync(f).isFile())return r.fulfill({contentType:f.endsWith('.css')?'text/css':/\.m?js$/.test(f)?'text/javascript':'text/html',body:fs.readFileSync(f)});return r.fulfill({contentType:'text/html',body:'<!doctype html><body></body>'});
 });
 await p.goto('http://localhost/#support');await p.setContent('<link rel="stylesheet" href="/node_modules/bootstrap/dist/css/bootstrap.min.css"><link rel="stylesheet" href="/styles/style.css"><link rel="stylesheet" href="/pages/user/user.css"><link rel="stylesheet" href="/pages/user/modules/support/support.css">'+fs.readFileSync('pages/user/modules/support/support.html','utf8'));
 await p.evaluate(async()=>{
  document.body.className='user-portal-body';localStorage.setItem('pawpal_current_user',JSON.stringify({id:'ui-owner'}));
  const statuses=['waiting_manager_approval','pending','processing','waiting_customer','resolved'],titles=['Đề xuất đang chờ quản lý duyệt','Đã duyệt, chưa thông báo và bắt đầu','Đã thông báo và bắt đầu thực hiện','Cần khách bổ sung thông tin','Đã phản hồi giải thích'];
  const tickets=statuses.map((status,i)=>({id:'UI-'+i,title:titles[i],description:titles[i],status,priority:'Trung bình',createdAt:'2026-11-13T00:00:00Z',context:{},messages:[]}));
  window.PawPalSupport={getTickets:()=>tickets,isPaged:()=>false,loadTickets:async()=>{},claimGuestContacts:async()=>{}};
  const module=await import('/pages/user/modules/support/support.js');module.initSupportTickets();
 });
 await p.waitForFunction(()=>document.querySelector('#ticketsListTableBody')?.textContent.includes('Đề xuất đang chờ'));
 const labels=await p.locator('#ticketsListTableBody .badge-status').allTextContents();assert.deepEqual(labels,['Chờ xử lý','Chờ xử lý','Đang giải quyết','Chờ bạn phản hồi','Đã giải quyết']);
 const dir='docs/verification/complaint-execution-gate';fs.mkdirSync(dir,{recursive:true});await p.screenshot({animations:'disabled',path:dir+'/user-statuses.png'});
 console.log('PASS actual User support table: pending approval and not-started stay pending; only execution is processing; customer followup stays separate. Local UI evidence, no Cloud writes.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
