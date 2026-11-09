const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),sharp=require('sharp');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1366,height:1000}}),errors=[],requests=[];
 const image=await sharp({create:{width:40,height:40,channels:3,background:'#236b48'}}).png().toBuffer();
 const ids=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222','44444444-4444-4444-8444-444444444444','55555555-5555-4555-8555-555555555555'];let uploads=0;
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{
  const u=new URL(route.request().url());if(u.origin!=='http://localhost')return route.abort();
  if(u.pathname==='/')return route.fulfill({contentType:'text/html; charset=utf-8',body:'<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/pages/user/user.css"><link rel="stylesheet" href="/pages/user/modules/pets/pets.css"><style>.d-none{display:none!important}</style>'+fs.readFileSync('pages/user/modules/pets/pets.html','utf8')});
  if(u.pathname==='/api/media'){
   requests.push({action:u.searchParams.get('action'),id:u.searchParams.get('id'),authorization:route.request().headers().authorization,...(u.searchParams.get('action')==='prepare'?{body:route.request().postDataJSON()}:{})});
   if(u.searchParams.get('action')==='read')return route.fulfill({contentType:'image/png',body:image});
   if(u.searchParams.get('action')==='prepare')return route.fulfill({json:{ok:true,session_id:ids[uploads]}});
   return route.fulfill({json:{ok:true,asset_id:ids[uploads++]}});
  }
  if(u.pathname==='/scripts/api/api.js')return route.fulfill({contentType:'text/javascript',body:'export const API={initData:async()=>{},getUserBookings:async()=>[]};'});
  if(u.pathname.startsWith('/assets/'))return route.fulfill({status:204});
  let body=fs.readFileSync(path.join(process.cwd(),decodeURIComponent(u.pathname)),'utf8');
  if(u.pathname.endsWith('/pets/pets.js'))body+='\nexport {setupForm,setupAvatar,setupVaccineCardUploader,setupSpeciesToggle};';
  return route.fulfill({contentType:u.pathname.endsWith('.css')?'text/css':'text/javascript',body});
 });
 await page.goto('http://localhost/');await page.evaluate(async()=>{
  window.owner='33333333-3333-4333-8333-333333333333';localStorage.setItem('pawpal_current_user',JSON.stringify({id:owner}));window.saved=null;window.values=null;
  const db={auth:{getSession:async()=>({data:{session:{access_token:'fixture-token'}}})},
   from(table){const q={select(){return q;},eq(){return q;},order(){return q;},limit(){return q;},then(resolve){return Promise.resolve({data:table==='pet_species'?[{id:'species',species_name:'Mèo',is_active:true}]:table==='pet_breed'?[]:saved?[saved]:[]}).then(resolve);}};return q;},
   async rpc(name,args){if(name!=='save_own_pet')throw Error('Unexpected RPC');values=args.p_values;saved={id:args.p_id,pet_code:'PET-QA',pet_name:values.pet_name,customer_id:owner,updated_at:'revision',gender:values.gender,allergy:values.allergy,avatar_media_asset_id:values.avatar_media_asset_id,vaccine_media_asset_id:values.vaccine_media_asset_id,vaccination_recorded:values.vaccination_recorded,pet_breed:{breed_name:values.breed_name,pet_species:{species_name:values.species_name}},pet_weight_history:[{weight:args.p_weight}]};return {data:args.p_id};}};
  window.getSupabaseClient=()=>db;
  window.mod=await import('/pages/user/modules/pets/pets.js');mod.setupForm();mod.setupSpeciesToggle();mod.setupAvatar();mod.setupVaccineCardUploader();await mod.switchToPetFormScreen();
 });
 await page.locator('#petName').fill('Miu Miu');await page.locator('#breed').fill('Mèo Anh lông ngắn tự nhập');await page.locator('#weight').fill('4.5');
 await page.evaluate(()=>document.getElementById('petForm').requestSubmit());
 const speciesError=page.locator('#cat').locator('xpath=ancestor::div[contains(@class,"form-group")]').locator(':scope > .error-msg');assert.equal(await speciesError.isVisible(),true);
 await page.locator('#cat').check({force:true});assert.equal(await speciesError.isHidden(),true);
 await page.locator('#allergies').fill('Dị ứng hải sản, sợ tiếng sấy mạnh');
 await page.locator('#avatar-input').setInputFiles({name:'miu.png',mimeType:'image/png',buffer:Buffer.concat([image,Buffer.alloc(4*1024*1024)])});
 await page.locator('#vaccine-card-input').setInputFiles({name:'sotiem.png',mimeType:'image/png',buffer:image});
 await page.waitForFunction(()=>document.getElementById('vaccineCardPreview').src.startsWith('data:'));
 await page.evaluate(()=>document.getElementById('petForm').requestSubmit());
 await page.waitForFunction(()=>!!window.saved&&document.getElementById('petForm').dataset.saving==='false');
 assert.equal(uploads,2);assert.ok(requests.every(r=>r.authorization==='Bearer fixture-token'));
 assert.ok(requests.filter(r=>r.action==='prepare').every(r=>r.body.size_bytes<=3145728));
 assert.equal(requests.find(r=>r.action==='prepare').body.mime_type,'image/webp');
 assert.equal(await page.evaluate(()=>values.breed_name),'Mèo Anh lông ngắn tự nhập');
 await page.evaluate(async()=>{await mod.switchToPetFormScreen('PET-QA');});
 for(const id of ['avatarPreview','vaccineCardPreview']){await page.waitForFunction(id=>document.getElementById(id).complete&&document.getElementById(id).naturalWidth>0,id);assert.ok((await page.locator('#'+id).getAttribute('src')).startsWith('blob:'));}
 assert.equal(await page.locator('#allergies').inputValue(),'Dị ứng hải sản, sợ tiếng sấy mạnh');
 assert.equal(await page.locator('#avatar-input').evaluate(input=>input.files.length),0);
 assert.equal(await page.locator('#vaccine-card-input').evaluate(input=>input.files.length),0);
 const petId=await page.evaluate(()=>saved.id);
 await page.locator('#weight').fill('5.2');
 await page.locator('#notes').fill('Mới tiêm phòng dại ngày 20/10.');
 await page.locator('#avatar-input').setInputFiles({name:'miu-new.png',mimeType:'image/png',buffer:image});
 await page.locator('#vaccine-card-input').setInputFiles({name:'sotiem-new.png',mimeType:'image/png',buffer:image});
 await page.evaluate(()=>document.getElementById('petForm').requestSubmit());
 await page.waitForFunction(()=>saved.avatar_media_asset_id==='44444444-4444-4444-8444-444444444444'&&document.getElementById('petForm').dataset.saving==='false');
 assert.equal(uploads,4);assert.equal(await page.evaluate(()=>saved.id),petId);
 assert.equal(await page.evaluate(()=>values.routine),'Mới tiêm phòng dại ngày 20/10.');
 await page.evaluate(async()=>{await mod.switchToPetFormScreen('PET-QA');});
 assert.equal(await page.locator('#weight').inputValue(),'5.2');
 for(const id of ['avatarPreview','vaccineCardPreview'])await page.waitForFunction(id=>document.getElementById(id).src.startsWith('blob:')&&document.getElementById(id).naturalWidth>0,id);
 const readIds=new Set(requests.filter(r=>r.action==='read').map(r=>r.id));assert.deepEqual([...readIds].sort(),[...ids].sort());
 await page.screenshot({path:'docs/verification/sync/customer-pet-images-edit.png',fullPage:true});
 assert.deepEqual(errors,[]);console.log('PASS actual pet form/service: species error clears; custom breed accepted; two real image files upload; reopened edit resolves both private images and allergy. Offline API fixtures only.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
