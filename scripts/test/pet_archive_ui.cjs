const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1366,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{
  const u=new URL(route.request().url());if(u.origin!=='http://localhost')return route.abort();
  if(u.pathname==='/')return route.fulfill({contentType:'text/html; charset=utf-8',body:'<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/pages/user/user.css"><link rel="stylesheet" href="/pages/user/modules/pets/pets.css"><style>.d-none{display:none!important}.sidebar-fixture{position:fixed;left:10px;top:100px;z-index:99999;background:white;padding:20px}main{margin:50px 30px 0 230px;transform:translateZ(0)}@media(max-width:600px){main{margin:10px}.sidebar-fixture{display:none}}</style><body class="user-portal-body"><aside class="sidebar-fixture"><button onclick="window.sidebarClicks++">Tài khoản</button></aside><main>'+fs.readFileSync('pages/user/modules/pets/pets.html','utf8')+'</main></body>'});
  if(u.pathname==='/scripts/api/petService.js')return route.fulfill({contentType:'text/javascript',body:'export const getPets=async()=>[structuredClone(window.pet)];export const savePets=async()=>true;export const deletePet=async()=>{window.archiveCalls++;pet.isArchived=true;pet.archivedAt=new Date().toISOString();pet.archiveDeadline=Date.now()+30*86400000;return true;};export const restorePet=async()=>{pet.isArchived=false;return true;};'});
  if(u.pathname==='/scripts/api/api.js')return route.fulfill({contentType:'text/javascript',body:'export const API={initData:async()=>{},getUserBookings:async()=>[]};'});
  if(u.pathname.startsWith('/assets/'))return route.fulfill({status:204});
  let body=fs.readFileSync(path.join(process.cwd(),decodeURIComponent(u.pathname)),'utf8');
  if(u.pathname.endsWith('/pets/pets.js'))body+='\nexport {renderPetGrids,setupDeleteModal,setupTabs};';
  return route.fulfill({contentType:u.pathname.endsWith('.css')?'text/css':'text/javascript',body});
 });
 await page.goto('http://localhost/');
 await page.addStyleTag({content:fs.readFileSync('node_modules/bootstrap/dist/css/bootstrap.min.css','utf8')});
 await page.evaluate(async()=>{
  localStorage.setItem('pawpal_current_user',JSON.stringify({id:'owner'}));window.sidebarClicks=0;window.archiveCalls=0;
  window.pet={id:'PET_ARCHIVE_01',name:'Miu Miu',species:'cat',breed:'Mèo Anh lông ngắn',weight:4.5,weightNum:4.5,gender:'female',notes:'',allergies:'',isArchived:false};
  window.mod=await import('/pages/user/modules/pets/pets.js');mod.setupDeleteModal();mod.setupTabs();await mod.renderPetGrids();
 });
 const open=()=>page.getByRole('button',{name:'Ẩn hồ sơ',exact:true}).click();
 await open();assert.equal(await page.locator('#deleteConfirmModal').evaluate(el=>el.matches(':modal')),true);
 assert.equal(await page.evaluate(()=>document.elementFromPoint(40,120).id),'deleteConfirmModal');
 await page.screenshot({path:'docs/verification/sync/pet-archive-dialog.png',fullPage:true});
 await page.keyboard.press('Escape');assert.equal(await page.locator('#deleteConfirmModal').isHidden(),true);
 await open();await page.mouse.click(40,120);assert.equal(await page.evaluate(()=>sidebarClicks),0);assert.equal(await page.locator('#deleteConfirmModal').isHidden(),true);
 await open();await page.getByRole('button',{name:'Hủy',exact:true}).click();assert.equal(await page.evaluate(()=>archiveCalls),0);
 await open();await page.getByRole('button',{name:'Xác nhận',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('#countArchive').textContent==='(1)');
 assert.equal(await page.locator('#activePetGrid .pet-card').count(),0);assert.equal(await page.evaluate(()=>archiveCalls),1);
 await page.getByRole('tab',{name:/Kho lưu trữ/}).click();assert.equal(await page.locator('#archivePetGrid').isVisible(),true);
 assert.match(await page.locator('.pet-archive-clock').innerText(),/Còn 30 ngày/);
 assert.equal(await page.locator('.pet-filter-tab.active').evaluate(el=>getComputedStyle(el).borderRadius),'0px');
 assert.equal(await page.locator('.pet-filter-tab.active').evaluate(el=>getComputedStyle(el,'::after').backgroundColor),'rgb(35, 107, 72)');
 for(const width of [1366,390]){await page.setViewportSize({width,height:1000});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:`docs/verification/sync/pet-archive-list-${width}.png`,fullPage:true});}
 await page.getByRole('button',{name:'Khôi phục',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#countActive').textContent==='(1)');
 assert.equal(await page.locator('#archivePetGrid .pet-card').count(),0);
 for(const [remaining,enabled]of [[86400000,true],[60000,true],[-86400000,false]]){
  await page.evaluate(async remaining=>{pet.isArchived=true;pet.archiveDeadline=Date.now()+remaining;await mod.renderPetGrids();},remaining);
  assert.equal(await page.getByRole('button',{name:'Khôi phục',exact:true}).isEnabled(),enabled);
  if(!enabled){assert.match(await page.locator('.pet-archive-clock').innerText(),/Đã quá thời hạn khôi phục 30 ngày/);await page.screenshot({path:'docs/verification/sync/pet-archive-expired.png',fullPage:true});}
 }
 await page.evaluate(()=>mod.dispose());assert.deepEqual(errors,[]);
 console.log('PASS top-layer dialog covers high-z sidebar; Escape, outside click and cancel; archive moves card, shows 30 days; flat tab underlines; mobile fit; restore. Offline API fixtures only.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
