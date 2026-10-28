const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});try{
 const p=await b.newPage({viewport:{width:1440,height:1000}});await p.route('**/*',r=>r.abort());await p.route('http://localhost:3001/',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><body></body></html>'}));await p.goto('http://localhost:3001/');
 await p.setContent(fs.readFileSync('pages/admin/modules/staff/staff.html','utf8'));
 await p.evaluate(()=>{window.PawpalStaff={state:{staff:[],isLoaded:false,shiftRequests:[],assessments:[],schedules:[]},subtabs:{},showToast:()=>{}};});
 let code=fs.readFileSync('pages/admin/modules/staff/subtabs/tab-staff-list.js','utf8');code=code.slice(0,code.lastIndexOf("    if (document.readyState === 'loading')"))+'})();';await p.addScriptTag({content:code});
 await p.evaluate(()=>{PawpalStaff.subtabs.list.init();window.writes=0;window.payloads=[];PawpalStaff.createStaffAccount=async profile=>{writes++;payloads.push(profile);throw Object.assign(Error('QA valid payload reached provisioning'),{staffAccountError:true});};document.getElementById('staffModalOverlay').classList.add('active');});
 await p.click('#btnSaveStaff');await p.waitForFunction(()=>!document.getElementById('btnSaveStaff').disabled);
 for(const field of ['staffInputName','staffInputPosition','staffInputPhone'])assert.equal(await p.locator('#'+field).getAttribute('aria-invalid'),'true');
 assert.equal(await p.evaluate(()=>document.activeElement.id),'staffInputName');assert.equal(await p.evaluate(()=>writes),0);
 await p.fill('#staffInputName','Nguyễn Thị Thanh Trúc Quỳnh Như Phương Thảo Ngọc Bích Hoàng Yến Anh Khuê');assert.equal(await p.locator('#staffInputNameError').count(),0);assert.equal(await p.locator('#staffInputPhoneError').count(),1);await p.fill('#staffInputPosition','Kỹ thuật viên grooming');
 async function invalid(field,value,pattern){await p.fill('#'+field,value);await p.click('#btnSaveStaff');await p.waitForFunction(()=>!document.getElementById('btnSaveStaff').disabled);assert.match(await p.locator('#'+field+'Error').innerText(),pattern);assert.equal(await p.locator('#'+field).getAttribute('aria-invalid'),'true');assert.equal(await p.locator('#'+field).getAttribute('aria-describedby'),field+'Error');assert.equal(await p.locator('#'+field).inputValue(),value);assert.equal(await p.evaluate(()=>document.activeElement.id),field);assert.equal(await p.evaluate(()=>writes),0);assert.equal(await p.locator('#staffProfileError').innerText(),'');}
 for(const name of ['', '   ', 'A'])await invalid('staffInputName',name,/2 đến 200/);
 await invalid('staffInputName','Nguyễn Văn 123',/không được chứa số/);
 await p.fill('#staffInputName','Nguyễn Thị Thanh Trúc Quỳnh Như Phương Thảo Ngọc Bích Hoàng Yến Anh Khuê');
 for(const phone of ['','   '])await invalid('staffInputPhone',phone,/Nhập số điện thoại/);
 for(const phone of ['090111223','09011122334','0901abc233','0901@#$233','1901112233','0901 112 233','12345678','1@gmail.com'])await invalid('staffInputPhone',phone,/Số điện thoại/);
 await p.fill('#staffInputPhone','0912345678');
 await invalid('staffInputEmail','qa@@example.com',/email công việc/);await p.fill('#staffInputEmail','qa@example.invalid');await invalid('staffInputDob','2999-01-01',/Ngày sinh/);await p.fill('#staffInputDob','2000-01-01');await invalid('staffInputJoinDate','1999-01-01',/Ngày bắt đầu/);await p.fill('#staffInputJoinDate','2026-10-28');
 await p.click('#btnSaveStaff');await p.waitForFunction(()=>writes===1);assert.match(await p.locator('#staffProfileError').innerText(),/valid payload/);
 await p.fill('#staffInputPhone','+84901112233');await p.click('#btnSaveStaff');await p.waitForFunction(()=>writes===2);assert.equal(await p.evaluate(()=>payloads[1].phone_number),'0901112233');
 await p.evaluate(async()=>{
  const person={id:'QA-WORKER',rawId:'QA-WORKER',name:'QA worker',position:'Groomer',phone:'0912345678',status:'ACTIVE',skillResult:'FAIL',skillLocked:true,serviceLocked:false};
  PawpalStaff.state.staff=[person];PawpalStaff.state.isLoaded=true;PawpalStaff.getNearestStaffSchedule=()=>null;PawpalStaff.formatStaffSchedule=()=> 'Chưa có lịch';PawpalStaff.getStaffPage=async()=>({rows:[person],total:1,page:1});document.getElementById('subtab-tab-staff-list').classList.add('active');await PawpalStaff.subtabs.list.renderStaffList();
 });
 assert.equal(await p.locator('#statRetrainStaff').textContent(),'1');assert.ok((await p.locator('#staffListTableBody').innerText()).includes('Tạm khóa nhận việc'));
 await p.evaluate(async()=>{const person=PawpalStaff.state.staff[0];Object.assign(person,{skillResult:'PASS',skillLocked:false,serviceLocked:true});await PawpalStaff.subtabs.list.renderStaffList();});
 assert.equal(await p.locator('#statRetrainStaff').textContent(),'0');assert.ok((await p.locator('#staffListTableBody').innerText()).includes('Tạm khóa nhận việc'));
 await p.evaluate(async()=>{PawpalStaff.state.staff[0].status='RESIGNED';await PawpalStaff.subtabs.list.renderStaffList();document.querySelector('.btn-staff-action').click();});
 assert.equal(await p.locator('#staffListTableBody tr').evaluate(node=>node.classList.contains('row-locked')),true);assert.equal(await p.locator('#menuActionToggleLock').evaluate(node=>node.style.display),'none');assert.notEqual(await p.locator('#menuActionViewAssess').evaluate(node=>node.style.display),'none');
 console.log('PASS actual staff save handler: invalid contact/date blocked before transport; valid long name and contact reach provisioning once. No network or writes.');
}finally{await b.close();}})().catch(e=>{console.error(e.stack);process.exitCode=1;});
