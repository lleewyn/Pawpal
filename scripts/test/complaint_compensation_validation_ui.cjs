const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage();await page.setContent(fs.readFileSync('pages/admin/modules/complaints/complaints.html','utf8'));
 const core=fs.readFileSync('pages/admin/modules/complaints/complaints.js','utf8'),detail=fs.readFileSync('pages/admin/modules/complaints/subtabs/tab-complaint-detail.js','utf8');
 await page.addScriptTag({content:`window.PawpalComplaints={};${core.slice(core.indexOf('    PawpalComplaints.validateCompensation ='),core.indexOf('    function getCurrentStaffName()'))}
 const mod=PawpalComplaints,$=id=>document.getElementById(id),text=(id,v)=>$(id).textContent=v,show=(id,v)=>$(id).style.display=v?'':'none',directAward=t=>['points','voucher'].includes(t),hasAmount=t=>['points','refund','rma_refund'].includes(t);
 window.ticket={};const current=()=>ticket,bind=(id,fn)=>$(id).onclick=fn;window.writes=[];const act=(action,details)=>writes.push({action,details});
 ${detail.slice(detail.indexOf(' function resolutionVisibility()'),detail.indexOf(' function bindEvidence('))}
 ${detail.slice(detail.indexOf("  bind('btnConfirmResolveTicket'"),detail.indexOf("  bind('btnConfirmAssignHandler'"))}
 $('resolveTicketModalOverlay').dataset.mode='resolve';$('selectResolveOption').value='points';$('inputResolveAmount').value='10';$('inputResolveNote').value='Bồi hoàn cho khách';resolutionVisibility();`});
 assert.match(await page.locator('#resolveTicketModalOverlayError').textContent(),/chưa gắn tài khoản/);
 await page.evaluate(()=>document.getElementById('btnConfirmResolveTicket').click());assert.equal(await page.evaluate(()=>writes.length),0);
 await page.evaluate(()=>{ticket.customerId='customer';document.getElementById('inputResolveAmount').value='1.5';document.getElementById('btnConfirmResolveTicket').click()});
 assert.match(await page.locator('#resolveTicketModalOverlayError').textContent(),/số điểm nguyên/);
 await page.evaluate(()=>{document.getElementById('inputResolveAmount').value='10';document.getElementById('btnConfirmResolveTicket').click()});assert.equal(await page.evaluate(()=>writes.length),1);
 await page.evaluate(()=>{document.getElementById('selectResolveOption').value='voucher';resolutionVisibility();document.getElementById('btnConfirmResolveTicket').click()});
 assert.match(await page.locator('#resolveTicketModalOverlayError').textContent(),/Nhập mã voucher/);
 await page.evaluate(()=>{document.getElementById('complaintVoucherCode').value='THANKYOU';document.getElementById('btnConfirmResolveTicket').click()});assert.equal(await page.evaluate(()=>writes.length),2);
 console.log('PASS modal controls: specific validation messages and valid point/voucher proposal requests. Browser fixtures only.');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
