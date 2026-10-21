const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {service,admin,ok,browserPage,customer,state,infra,token,env}=require('./customer_completion_helpers.cjs');
const {createClient}=require('@supabase/supabase-js');
(async()=>{
 const expectedPets=(await ok(service.from('pet_profile').select('id'))).length;
 const {browser,page}=await browserPage();const errors=[],js=[];
 page.on('response',r=>{if(r.url().includes('/rest/v1/')&&r.status()>=400)errors.push(new URL(r.url()).pathname+':'+r.status());});
 page.on('pageerror',e=>js.push(e.message));
 try{
  await page.evaluate(()=>{location.hash='tab-pet-list';});
  await page.waitForFunction(()=>window.PawpalPets?.state.isLoaded);
  const summary=await page.evaluate(async()=>{
   const m=window.PawpalPets;await m.fetchCareLogsTab({force:true});await m.fetchRemindersAppointments({force:true});
   const pets=Object.values(m.state.petsData);const p=pets.find(p=>p.rawId);await m.fetchPetProfileDetails(p,{force:true});
   return {count:pets.length,breeds:m.state.breeds.length,weightCount:pets.filter(p=>p.weightNum>0).length,logs:m.state.careLogs.length,detailError:p._detailsError||null,loadError:m.state.loadError,vaccine:document.getElementById('ptab-vaccine')!==null};
  });
  assert.equal(summary.count,expectedPets);assert.equal(summary.logs,7);assert.equal(summary.loadError,null);assert.equal(summary.detailError,null);assert.equal(summary.vaccine,false);
  const cust=await customer('Pet module verification');
  await page.evaluate(()=>window.PawpalPets.loadPetsModuleData({force:true}));
  const breed=await ok(service.from('pet_breed').select('id,breed_name,species:species_id(species_name)').eq('is_active',true).limit(1).single());
  const species=({'Chó':'dog','Mèo':'cat','Thỏ':'rabbit','Hamster':'hamster'})[breed.species.species_name]||breed.species.species_name;
  await page.locator('#btnOpenAddPetModal').click();
  await page.locator('#newPetName').fill('Pet module fixture');await page.locator('#newPetOwnerInput').fill(cust.phone);
  await page.locator('#newPetOwnerDropdown .autocomplete-item').first().click();
  await page.locator('#newPetSpecies').selectOption(species);await page.locator('#newPetBreed').fill(breed.breed_name);
  await page.locator('#newPetWeight').fill('4.25');await page.locator('#newPetDob').fill('2024-01-02');await page.locator('#newPetAlert').fill('Cần nhẹ tay');
  await page.locator('#btnSubmitAddPet').click();
  await page.waitForFunction(id=>Object.values(window.PawpalPets.state.petsData).some(p=>p.custId===id&&p.name==='Pet module fixture'),cust.id);
  const fixture=await ok(service.from('pet_profile').select('*').eq('customer_id',cust.id).single());
  const weight=await ok(service.from('pet_current_weight').select('*').eq('pet_id',fixture.id).single());assert.equal(Number(weight.weight),4.25);
  assert.equal(fixture.date_of_birth,'2024-01-02');assert.equal(fixture.safety_note,'Cần nhẹ tay');
  await page.evaluate(id=>window.PawpalPets.subtabs.profile.openPetProfile(window.PawpalPets.getPet(id).code),fixture.id);
  await page.locator('#btnOpenEditPetModal').click();await page.locator('#editPetName').fill('Pet updated');await page.locator('#editPetWeight').fill('4.5');
  await page.locator('#btnSubmitEditPetProfile').click();await page.waitForFunction(id=>window.PawpalPets.getPet(id)?.name==='Pet updated',fixture.id);
  let row=await ok(service.from('pet_profile').select('*').eq('id',fixture.id).single());assert.equal(row.pet_name,'Pet updated');
  await page.locator('#btnDrawerWeighPet').click();await page.locator('#weighPetNewWeight').fill('4.75');await page.locator('#weighPetNote').fill('Kiểm tra định kỳ');await page.locator('#btnSubmitWeigh').click();
  await page.waitForFunction(id=>window.PawpalPets.getPet(id)?.weightNum===4.75,fixture.id);
  row=await ok(service.from('pet_profile').select('*').eq('id',fixture.id).single());
  const stale=await admin.rpc('save_admin_pet',{p_pet_id:row.id,p_expected_updated_at:'2000-01-01T00:00:00Z',p_details:{customer_id:cust.id,breed_id:breed.id,pet_name:'Should not save',gender:'unknown'},p_weight:5});assert.equal(stale.error.code,'PT409');
  const measurementId=crypto.randomUUID();const params={p_pet_id:row.id,p_expected_updated_at:row.updated_at,p_measurement_id:measurementId,p_weight:5,p_note:'Idempotency check'};
  await ok(admin.rpc('record_admin_pet_weight',params));await ok(admin.rpc('record_admin_pet_weight',params));
  assert.equal((await ok(service.from('pet_weight_history').select('id').eq('id',measurementId))).length,1);
  const current=await ok(service.from('pet_profile').select('*').eq('id',fixture.id).single());
  await ok(admin.rpc('save_admin_pet',{p_pet_id:row.id,p_expected_updated_at:current.updated_at,p_details:{...current,status:'archived'},p_weight:null}));
  assert.equal((await ok(service.from('pet_profile').select('status').eq('id',fixture.id).single())).status,'archived');
  const restore=await ok(service.from('pet_profile').select('*').eq('id',fixture.id).single());await ok(admin.rpc('save_admin_pet',{p_pet_id:row.id,p_expected_updated_at:restore.updated_at,p_details:{...restore,status:'active'},p_weight:null}));
  const appointment=await ok(service.from('appointment').select('id,pet_id').eq('appointment_status','completed').limit(1).single());
  await ok(admin.rpc('record_pet_contact',{p_pet_id:appointment.pet_id,p_appointment_id:appointment.id,p_type:'BATH',p_channel:'ZALO'}));
  const mismatch=await admin.rpc('record_pet_contact',{p_pet_id:fixture.id,p_appointment_id:appointment.id,p_type:'BATH',p_channel:'ZALO'});assert.ok(mismatch.error);
  await page.evaluate(async id=>{await window.PawpalPets.loadPetsModuleData({force:true});window.PawpalPets.subtabs.profile.openPetProfile(window.PawpalPets.getPet(id).code);},fixture.id);
  for(const note of ['Ghi chú lần đầu','Ghi chú cập nhật']){
   await page.locator('#petGroomerNotes').fill(note);await page.locator('#btnSaveGroomerNotes').click();
   await page.waitForFunction(({id,note})=>window.PawpalPets.getPet(id)?.notes===note,{id:fixture.id,note});
  }
  await page.locator('#petGroomerNotes').fill('Bản nháp chưa lưu');
  await page.evaluate(async id=>{await window.PawpalPets.loadPetsModuleData({force:true});window.PawpalPets.subtabs.profile.openPetProfile(window.PawpalPets.getPet(id).code,false);},fixture.id);
  assert.equal(await page.locator('#petGroomerNotes').inputValue(),'Bản nháp chưa lưu');
  await page.evaluate(()=>{location.hash='tab-pet-list';});await page.locator('#btnOpenAddPetModal').click();await page.locator('#btnOpenQuickAddOwnerModal').click();
  const quickPhone='09'+String(crypto.randomInt(0,100000000)).padStart(8,'0');
  await page.locator('#quickOwnerName').fill('Quick owner verification');await page.locator('#quickOwnerPhone').fill(quickPhone);await page.locator('#btnSubmitQuickAddOwner').click();
  await page.waitForFunction(()=>Boolean(document.getElementById('newPetOwner').value));
  const quickId=await page.locator('#newPetOwner').inputValue();assert.ok(quickId);
  const quickRow=await ok(service.from('customer').select('contact_email').eq('id',quickId).single());assert.equal(quickRow.contact_email,null);
  // SQL rollback/privilege tests run separately; browser must have made no obsolete REST calls.
  assert.deepEqual(errors,[]);assert.deepEqual(js,[]);
  await page.screenshot({path:infra+'/verification/v1-pets-stage.png',fullPage:true});
  console.log('PASS pets V1 restored environment: live list/catalog/log/profile reads, UI add/edit/weigh/notes/quick owner, draft retention, optimistic conflict, idempotent weight, archive/restore, contact validation, no vaccine UI or REST/JS errors.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
