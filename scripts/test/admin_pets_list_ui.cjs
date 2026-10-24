const fs=require('fs'),assert=require('node:assert/strict'),{chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true}),p=await b.newPage();await p.route('http://localhost:3000/',route=>route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html><head></head><body></body></html>'}));await p.route(/\.css(?:\?|$)/,route=>{const file=require('path').join(process.cwd(),new URL(route.request().url()).pathname);return route.fulfill({status:200,contentType:'text/css',body:fs.readFileSync(file,'utf8')})});await p.goto('http://localhost:3000/');
await p.setContent('<style>html,body{margin:0;height:100%}.chatbot-module-wrapper{height:100vh!important}</style><link rel="stylesheet" href="/pages/admin/admin.css"><link rel="stylesheet" href="/pages/admin/modules/pets/pets.css"><link rel="stylesheet" href="/pages/admin/modules/pets/pets-v8.css">'+fs.readFileSync('pages/admin/modules/pets/pets.html','utf8'));
const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.evaluate(()=>{window._pawpalAdminLoaded=true;sessionStorage.setItem('pawpal_admin_active_module','Th\u00fa c\u01b0ng');const root=document.querySelector('.pets-module'),wrap=document.createElement('div');wrap.className='admin-module-wrapper';root.before(wrap);wrap.append(root);});
await p.addScriptTag({content:fs.readFileSync('pages/admin/modules/pets/pets.js','utf8')});
await p.evaluate(()=>{PawpalPets.state.isLoaded=true;PawpalPets.state.breeds=[];PawpalPets.state.customersData={owner:{id:'owner',name:'Owner',phone:'0901234567'}};PawpalPets.state.petsData=Object.fromEntries(Array.from({length:24},(_,i)=>['PET-'+i,{id:'PET-'+i,code:'PET-'+i,rawId:'raw-'+i,name:'Pet'+i,species:i%2?'cat':'dog',breed:'Breed',speciesBreed:'Breed',weightNum:5,weight:'5 kg',custId:'owner',ownerName:'Owner',ownerPhone:'0901234567',status:'active',alert:i===0?'Safety note':'',avatar:'',carelogs:[],history:[],weightHistory:[]}]))});
await p.addScriptTag({content:fs.readFileSync('pages/admin/modules/pets/subtabs/tab-pet-list.js','utf8')});
assert.equal(await p.locator('#petTableTbody tr').count(),10);
await p.click('#petNextPageBtn');assert.equal(await p.locator('#petTableTbody tr').count(),10);
await p.click('#petNextPageBtn');assert.equal(await p.locator('#petTableTbody tr').count(),4);
await p.fill('#petSearchInput','Pet23');await p.waitForFunction(()=>document.querySelectorAll('#petTableTbody tr').length===1);assert.match(await p.locator('#petTableTbody').innerText(),/Pet23/);
await p.fill('#petSearchInput','');await p.selectOption('#petFilterSpecies','cat');await p.waitForTimeout(350);assert.equal(await p.locator('#petTableTbody tr').count(),10);
await p.click('#petNextPageBtn');assert.equal(await p.locator('#petTableTbody tr').count(),2);const [download]=await Promise.all([p.waitForEvent('download'),p.click('#btnExportPetReport')]);const csv=fs.readFileSync(await download.path(),'utf8');assert.equal(csv.trim().split('\n').length,13);

await p.evaluate(()=>{PawpalPets.state.careLogsLoadStatus='loaded';PawpalPets.state.remindersLoadStatus='loaded';PawpalPets.state.appointments=[];PawpalPets.state.reminderContacts={};PawpalPets.state.careLogs=[{id:'log-test',pet_id:'raw-0',description:'Recorded care',observed_condition:'Actual observation',recorded_at:'2026-10-24T01:00:00Z'}];Object.values(PawpalPets.state.petsData).forEach(p=>p._detailsLoaded=true)});
for(const file of ['tab-pet-profile.js','tab-pet-carelog.js','tab-pet-reminders.js'])await p.addScriptTag({content:fs.readFileSync('pages/admin/modules/pets/subtabs/'+file,'utf8')});
await p.evaluate(()=>PawpalPets.subtabs.profile.openPetProfile('PET-0'));
assert.match(await p.locator('#subtab-tab-pet-profile').innerText(),/Pet0/);
await p.evaluate(()=>PawpalPets.switchSubtab('tab-pet-carelog'));
assert.match(await p.locator('#petCarelogsListTbody').innerText(),/Actual observation/);
await p.fill('#petCarelogSearch','no-match');assert.doesNotMatch(await p.locator('#petCarelogsListTbody').innerText(),/Recorded care/);
await p.evaluate(()=>PawpalPets.switchSubtab('tab-pet-reminders'));
await p.evaluate(async()=>{
 const existing=PawpalPets.state.appointments;
 window.petReadCalls=[];window.getSupabaseClient=()=>({from(table){petReadCalls.push(table);const q={select(){return q},order(){return q},limit(){return Promise.resolve({data:[{id:'safe-log',appointment_id:'appt',description:'Recorded',appointment:{id:'appt',pet_id:'raw-0',customer_id:'owner'}}]})}};return q}});
 await PawpalPets.fetchCareLogsTab({force:true});
 if(PawpalPets.state.appointments!==existing)throw Error('Care logs overwrote reminder appointments');
 if(petReadCalls.length!==1||petReadCalls[0]!=='care_log')throw Error('Extra unrelated appointment query');
});
await p.evaluate(async()=>{
 let calls=0;const cache=new Map();
 window.PawpalDataStore={TTL:{OPERATIONAL:30000},fetch:async(key,fetcher,options)=>{if(options.force||!cache.has(key))cache.set(key,await fetcher());return cache.get(key)}};
 window.getSupabaseClient=()=>({rpc:async name=>{if(name!=='get_admin_pet_reminder_sources')throw Error('Unexpected RPC');calls++;return {data:{appointments:[{id:'appt',pet_id:'raw-0',appointment_status:'completed',appointment_date:'2026-09-01T01:00:00Z',service:{service_name:'Bath'}}],contacts:[{entity_id:'raw-0',description:JSON.stringify({type:'BATH',appointment_id:'appt',channel:'PHONE'}),created_at:'2026-10-24T01:00:00Z'}]}}}});
 await PawpalPets.fetchRemindersAppointments({force:true});PawpalPets.state.reminderContacts={};await PawpalPets.fetchRemindersAppointments();
 if(calls!==1||!PawpalPets.state.reminderContacts['raw-0:BATH:appt'])throw Error('Reminder cache lost contact metadata');
});
assert.deepEqual(errors,[]);
await b.close();console.log('PASS pets list: 10-row pages, last page, search, species filter; fixtures in browser only.')})().catch(e=>{console.error(e);process.exit(1)});
