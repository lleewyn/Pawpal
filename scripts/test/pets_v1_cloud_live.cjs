// Read-only final browser check. Auth, REST and Realtime all use the new Cloud project.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const infra='D:/Aboutme/Pawpal-infra/supabase-local',credentials=fs.readFileSync(infra+'/PAWPAL-ADMIN.private.txt','utf8');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1050}}),failures=[],js=[],legacy=[];
  page.on('pageerror',e=>js.push(e.message));
  page.on('response',r=>{if(r.url().includes('/rest/v1/')&&r.status()>=400)failures.push(new URL(r.url()).pathname+':'+r.status());});
  page.on('request',r=>{const u=new URL(r.url());if((u.hostname.endsWith('.supabase.co')&&u.hostname!=='cpzuvaplseielhgcnqrn.supabase.co')||u.hostname.endsWith('.trycloudflare.com')||u.pathname.startsWith('/data/'))legacy.push(u.hostname+u.pathname);});
  await page.goto('https://pawpalgr3.vercel.app/admin/login');await page.locator('#inputAdminEmail').fill(credentials.match(/^Email: (.+)$/m)[1].trim());await page.locator('#inputAdminPassword').fill(credentials.match(/^Password: (.+)$/m)[1].trim());await page.locator('#btnSubmitAdminLogin').click();await page.waitForURL('**/admin#tab-list');
  await page.evaluate(()=>{location.hash='tab-pet-list';});await page.waitForFunction(()=>window.PawpalPets?.state.isLoaded);
  const result=await page.evaluate(async()=>{
   const m=window.PawpalPets,db=window.getSupabaseClient();await m.fetchCareLogsTab({force:true});await m.fetchRemindersAppointments({force:true});
   const [pets,weights,phones]=await Promise.all([db.from('pet_profile').select('id,customer_id,breed_id,status'),db.from('pet_current_weight').select('pet_id,weight'),db.from('customer_phone').select('customer_id,phone_number').eq('is_primary',true)]);
   if([pets,weights,phones].some(x=>x.error))throw Error('Verification source could not be read');
   const all=Object.values(m.state.petsData);
   const mismatches=all.filter(p=>{const source=pets.data.find(r=>r.id===p.rawId);return !source||p.custId!==source.customer_id||p.breedId!==source.breed_id||p.statusRaw!==source.status||p.ownerPhone!==(phones.data.find(r=>r.customer_id===p.custId)?.phone_number||'')||Number(p.weightNum)!==Number(weights.data.find(w=>w.pet_id===p.rawId)?.weight||0);}).length;
   const log=m.state.careLogs.find(l=>l.pet_id);const target=log?m.getPet(log.pet_id):all[0];await m.fetchPetProfileDetails(target,{force:true});m.subtabs.profile.openPetProfile(target.code);
   return {count:all.length,sourceCount:pets.data.length,mismatches,logs:m.state.careLogs.length,detailError:target._detailsError,detailLogs:target.carelogs.length,detailsLoaded:target._detailsLoaded,vaccine:!!document.getElementById('ptab-vaccine')};
  });
  assert.equal(result.count,82);assert.equal(result.sourceCount,82);assert.equal(result.mismatches,0);assert.equal(result.logs,7);assert.equal(result.detailError,null);assert.equal(result.detailsLoaded,true);assert.ok(result.detailLogs>0);assert.equal(result.vaccine,false);
  for(const tab of ['tab-pet-list','tab-pet-profile','tab-pet-carelog','tab-pet-reminders']){await page.evaluate(t=>window.PawpalPets.switchSubtab(t),tab);await page.waitForTimeout(350);}
  await page.waitForFunction(()=>window.getSupabaseClient().getChannels().some(c=>c.topic.includes('admin-pets-live')&&c.state==='joined'));
  await page.evaluate(()=>window.PawpalPets.switchSubtab('tab-pet-list'));await page.reload();await page.waitForFunction(()=>window.PawpalPets?.state.isLoaded);
  assert.deepEqual(failures,[]);assert.deepEqual(js,[]);assert.deepEqual(legacy,[]);
  await page.screenshot({path:infra+'/verification/v1-pets-cloud-list.png',fullPage:true});
  console.log('PASS Vercel pets V1: 82 source-matched pets, owner phones/breeds/current weights/status, 7 logs, real profile history, 4 tabs, Realtime joined, reload, no old Cloud/tunnel/JSON or REST/JS errors.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
