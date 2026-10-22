// Isolated restored database only. Every fixture and change rolls back.
const fs=require('node:fs'),{spawnSync}=require('node:child_process');
const {state}=require('./customer_completion_helpers.cjs');
const migration=fs.readFileSync('scripts/database/v1/058_customer_portal_profile.sql','utf8').replace(/^BEGIN;|^COMMIT;|^NOTIFY.*$/gm,'');
const authSource=fs.readFileSync('scripts/database/v1/043_customer_auth_v1.sql','utf8').match(/CREATE OR REPLACE FUNCTION public\.complete_customer_auth[\s\S]*?END \$\$;/)[0];
const query=`BEGIN;
${authSource}
${migration}
DO $$
DECLARE uid uuid:=gen_random_uuid(); cid uuid:=gen_random_uuid(); foreign_id uuid:=gen_random_uuid();
 before jsonb; after jsonb; addresses jsonb; failed boolean; new_uid uuid:=gen_random_uuid(); new_cid uuid;
BEGIN
 INSERT INTO auth.users(id) VALUES(new_uid);
 new_cid:=public.complete_customer_auth(new_uid,'098'||lpad(floor(random()*10000000)::text,7,'0'),'New portal fixture');
 IF NOT EXISTS(SELECT 1 FROM public.customer WHERE id=new_cid AND auth_user_id=new_uid)
 OR EXISTS(SELECT 1 FROM public.paw_point_transaction WHERE customer_id=new_cid) THEN RAISE EXCEPTION 'Registration failed or awarded points'; END IF;
 INSERT INTO auth.users(id) VALUES(uid);
 INSERT INTO public.customer(id,auth_user_id,customer_code,customer_status) VALUES(cid,uid,'TEST-'||cid,'active');
 INSERT INTO public.customer_profile(customer_id,full_name) VALUES(cid,'Portal fixture');
 INSERT INTO public.customer_phone(customer_id,phone_number,is_primary) VALUES(cid,'099'||lpad(floor(random()*10000000)::text,7,'0'),true);
 INSERT INTO public.customer(id,customer_code,customer_status) VALUES(foreign_id,'TEST-'||foreign_id,'active');
 INSERT INTO public.customer_address(id,customer_id,receiver_name,receiver_phone,street_address,province,is_default)
 VALUES(foreign_id,foreign_id,'Foreign fixture','0991234567','Foreign street','Province',true);
 PERFORM set_config('request.jwt.claim.sub',uid::text,true);
 before:=public.customer_profile_snapshot();
 addresses:='[{"street_address":"10 Test street","district":"District","ward":"Ward","province":"Province","is_default":true}]';
 after:=public.customer_profile_save('Updated fixture','qa@example.invalid',addresses,before->>'revision');
 IF after->>'name'<>'Updated fixture' OR after->>'email'<>'qa@example.invalid' OR jsonb_array_length(after->'addresses')<>1 THEN RAISE EXCEPTION 'Save/read mismatch'; END IF;
 IF after->'addresses'->0->>'district'<>'District' OR after->'addresses'->0->>'street_address'<>'10 Test street, Ward' THEN RAISE EXCEPTION 'Address lost'; END IF;
 failed:=false;
 BEGIN PERFORM public.customer_profile_save('Stale fixture','',after->'addresses',before->>'revision');
 EXCEPTION WHEN SQLSTATE 'PT409' THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'Stale snapshot accepted'; END IF;
 -- Failure occurs after email/name writes; verify the whole operation rolled back.
 failed:=false;
 BEGIN PERFORM public.customer_profile_save('Must rollback','changed@example.invalid',jsonb_build_array(jsonb_build_object('id',foreign_id,'street_address','Other','district','District','province','Province','is_default',true)),after->>'revision');
 EXCEPTION WHEN insufficient_privilege THEN failed:=true; END;
 IF NOT failed OR public.customer_profile_snapshot() IS DISTINCT FROM after THEN RAISE EXCEPTION 'Foreign address or partial write accepted'; END IF;
 failed:=false;
 BEGIN PERFORM public.customer_profile_save('Invalid fixture','abc@',after->'addresses',after->>'revision');
 EXCEPTION WHEN invalid_parameter_value THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'Invalid email accepted'; END IF;
 after:=public.customer_profile_save('Updated fixture','qa@example.invalid',after->'addresses',after->>'revision');
 IF jsonb_array_length(after->'addresses')<>1 THEN RAISE EXCEPTION 'Unchanged address failed'; END IF;
 UPDATE public.customer SET customer_status='locked' WHERE id=cid;
 failed:=false; BEGIN PERFORM public.customer_profile_snapshot(); EXCEPTION WHEN insufficient_privilege THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'Locked customer accepted'; END IF;
 IF has_function_privilege('anon','public.customer_profile_save(text,text,jsonb,text)','EXECUTE') THEN RAISE EXCEPTION 'Anonymous save allowed'; END IF;
END $$;
ROLLBACK;`;
const result=spawnSync('docker',['exec','-i','supabase-db','psql','-X','-q','-U','supabase_admin','-d',state.stage,'-v','ON_ERROR_STOP=1'],{input:query,encoding:'utf8',windowsHide:true});
if(result.status!==0)throw Error(result.stderr);
console.log('PASS isolated portal profile: atomic save, reload, address preservation, stale revision, ownership, rollback, validation, locked/anonymous denial; fixtures rolled back.');

if(process.argv.includes('--cloud-browser')) cloudBrowser().catch(()=>{console.error('Cloud browser verification failed; private evidence remains outside webroot.');process.exitCode=1;});
async function cloudBrowser(){
 const assert=require('node:assert/strict'),crypto=require('node:crypto');
 const {createClient}=require('@supabase/supabase-js');
 const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
 const {settings,infra}=require('../database/v1/cloud_connection.cjs');const {config}=settings();
 const options={auth:{persistSession:false,autoRefreshToken:false}};
 const service=createClient(config.DESTINATION_SUPABASE_URL,config.DESTINATION_SUPABASE_SERVICE_ROLE_KEY,options);
 const ok=async result=>{const r=await result;if(r.error)throw Error(r.error.message);return r.data;};
 const phone='097'+String(crypto.randomInt(1000000,10000000)),password=crypto.randomBytes(20).toString('hex')+'!';
 let uid,cid,browser;
 try{
  uid=(await ok(service.auth.admin.createUser({email:'portal-'+crypto.randomUUID()+'@example.invalid',email_confirm:true,phone:'+84'+phone.slice(1),phone_confirm:true,password,app_metadata:{pawpal_test:true,user_type:'CUSTOMER'}}))).user.id;
  cid=await ok(service.rpc('complete_customer_auth',{p_auth_id:uid,p_phone:phone,p_name:'Portal verification'}));
  assert.equal((await ok(service.from('paw_point_transaction').select('id').eq('customer_id',cid))).length,0);
  browser=await chromium.launch({channel:'chrome',headless:true});
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  page.on('console',message=>{if(message.type()==='error')fs.appendFileSync(infra+'/verification/portal-browser-console.private.txt',message.text()+'\n');});
  // Review current local module against real Cloud; no application data is mocked.
  if (!process.argv.includes('--deployed')) {
  await page.route('**/pages/user/modules/profile/profile.js*',route=>route.fulfill({contentType:'application/javascript',body:fs.readFileSync('pages/user/modules/profile/profile.js','utf8')}));
  await page.route('**/scripts/api/petService.js*',route=>route.fulfill({contentType:'application/javascript',body:fs.readFileSync('scripts/api/petService.js','utf8')}));
  await page.route('**/pages/user/modules/pets/pets.js*',route=>route.fulfill({contentType:'application/javascript',body:fs.readFileSync('pages/user/modules/pets/pets.js','utf8')}));
  await page.route('**/pages/user/modules/diary/diary.js*',route=>route.fulfill({contentType:'application/javascript',body:fs.readFileSync('pages/user/modules/diary/diary.js','utf8')}));
  }
  await page.goto('https://pawpalgr3.vercel.app/login');
  await page.locator('#loginPhone').fill(phone);await page.locator('#btnLoginContinue').click();
  await page.locator('#loginPassword').fill(password);
  await page.locator('#btnLoginSubmit').click();
  await page.waitForURL(/\/user\/?/,{timeout:45000});
  await page.waitForFunction(()=>document.querySelector('#profileName')?.textContent.includes('Portal verification'),{timeout:30000});
  const petRead=await page.evaluate(async()=>{
   const current=JSON.parse(localStorage.getItem('pawpal_current_user'));
   localStorage.setItem('pawpal_pets',JSON.stringify([{id:'cached-ghost',userId:current.id,name:'Cached ghost'}]));
   const {getPets}=await import('/scripts/api/petService.js?verification=live');
   return (await getPets()).length;
  });
  assert.equal(petRead,0);
  console.log('PASS browser real Cloud empty pet list ignores stale local business cache.');
  if(process.argv.includes('--pets')) {
   const breeds=await ok(service.from('pet_breed').select('breed_name,is_active,pet_species(species_name,is_active)').eq('is_active',true));
   const breed=breeds.find(b=>b.pet_species?.species_name==='Chó'&&b.pet_species.is_active);
   assert.ok(breed,'Missing Cloud dog taxonomy');
   await page.evaluate(async breed=>{
    const {savePets,getPets}=await import('/scripts/api/petService.js?verification=live');
    await savePets([{name:'Atomic browser pet',species:'dog',breed,gender:'male',weight:5}]);
    let pets=await getPets();if(pets.length!==1)throw Error('Created pet missing');
    await savePets([{...pets[0],notes:'Updated note'}]);
    pets=await getPets();if(pets[0].weightHistory.length!==1)throw Error('Unchanged weight duplicated');
    await savePets([{...pets[0],weight:6}]);
    pets=await getPets();if(pets[0].weightHistory.length!==2||Number(pets[0].weight)!==6)throw Error('New weight missing');
   },breed.breed_name);
   console.log('PASS browser pet service with Cloud RPC: create, edit note without duplicate weight, new weight appended.');
   await page.goto('https://pawpalgr3.vercel.app/user#pets?action=create');
   await page.waitForFunction(()=>document.querySelector('#breed')?.dataset.autocompleteReady==='true',{timeout:45000});
   await page.locator('#petName').fill('Browser form pet');
   await page.locator('label').filter({has:page.locator('#dog')}).click();
   await page.locator('#breed').fill(breed.breed_name);
   await page.locator('.autocomplete-dropdown button').filter({hasText:breed.breed_name}).first().click();
   await page.locator('#weight').fill('4.5');
   page.on('pageerror',error=>fs.writeFileSync(infra+'/verification/portal-pet-form-js-error.private.txt',error.message));
   await page.screenshot({path:infra+'/verification/portal-pet-before-save.private.png',fullPage:true});
   const [created]=await Promise.all([
    page.waitForResponse(r=>r.url().includes('/rpc/save_own_pet')&&r.request().method()==='POST'),
    page.locator('#saveBtn').click()
   ]);assert.equal(created.status(),200);
   const formPet=await ok(service.from('pet_profile').select('id,pet_code').eq('customer_id',cid).eq('pet_name','Browser form pet').single());
   await page.goto('https://pawpalgr3.vercel.app/user#pets?id='+formPet.pet_code);
   await page.waitForFunction(()=>document.querySelector('#petName')?.value==='Browser form pet');
   await page.locator('#notes').fill('Edited through actual form');
   await page.screenshot({path:infra+'/verification/portal-pet-form.private.png',fullPage:true});
   const [edited]=await Promise.all([
    page.waitForResponse(r=>r.url().includes('/rpc/save_own_pet')&&r.request().method()==='POST'),
    page.locator('#saveBtn').click()
   ]);assert.equal(edited.status(),200);
   assert.equal((await ok(service.from('pet_weight_history').select('id').eq('pet_id',formPet.id))).length,1);
   assert.equal((await ok(service.from('pet_profile').select('routine').eq('id',formPet.id).single())).routine,'Edited through actual form');
   await page.goto('https://pawpalgr3.vercel.app/user#profile');
   await page.waitForFunction(()=>document.querySelector('#profileName')?.textContent.includes('Portal verification'));
   console.log('PASS actual customer pet form: create, reopen, edit note and Cloud persisted without duplicate weight.');
   await page.goto('https://pawpalgr3.vercel.app/user#diary?id='+formPet.pet_code);
   await page.waitForFunction(()=>typeof window.selectAndLoadPet==='function');
   await page.waitForFunction(()=>!document.querySelector('#emptyTimeline')?.classList.contains('d-none'));
   await page.screenshot({path:infra+'/verification/portal-diary-empty.private.png',fullPage:true});
   console.log('PASS browser diary with real Cloud pet and no care logs shows empty timeline.');
   if(process.argv.includes('--diary')) {
    const appointmentId=crypto.randomUUID();
    await ok(service.from('appointment').insert({id:appointmentId,appointment_code:'VERIFY-'+appointmentId,customer_id:cid,pet_id:formPet.id,
     scheduled_start_at:new Date().toISOString(),scheduled_end_at:new Date(Date.now()+3600000).toISOString(),appointment_status:'in_progress'}));
    await ok(service.from('care_log').insert({appointment_id:appointmentId,action_name_snapshot:'Care verification',description:'Cloud care note verification'}));
    await page.waitForFunction(()=>document.querySelector('#timelineWrapper')?.textContent.includes('Cloud care note verification'),{timeout:30000});
    await page.screenshot({path:infra+'/verification/portal-diary-populated.private.png',fullPage:true});
    await ok(service.from('care_log').insert({appointment_id:appointmentId,action_name_snapshot:'Care update',description:'Live care update verification'}));
    await page.waitForFunction(()=>document.querySelector('#timelineWrapper')?.textContent.includes('Live care update verification'),{timeout:30000});
    assert.equal(await page.locator('#timelineWrapper .story-photo-img').count(),0);
    await page.evaluate(id=>window.selectAndLoadPet(id,'NONEXISTENT-SESSION',{allowDefaultFallback:false}),formPet.pet_code);
    assert.ok(!(await page.locator('#timelineWrapper').textContent()).includes('Cloud care note verification'));
    await page.evaluate(async id=>{
     const {deletePet,restorePet,getPets}=await import('/scripts/api/petService.js?verification=live');
     await deletePet(id);if(!(await getPets()).find(p=>p._supabaseId===id)?.isArchived)throw Error('Archive not persisted');
     await restorePet(id);if((await getPets()).find(p=>p._supabaseId===id)?.isArchived)throw Error('Restore not persisted');
    },formPet.id);
    console.log('PASS Cloud populated diary, Realtime after staff-side writes and archive/restore of pet retaining appointment/care history.');
    await page.goto('https://pawpalgr3.vercel.app/user#pets');
    const card=page.locator('#activePetGrid .pet-card').filter({hasText:'Browser form pet'});
    await card.getByRole('button',{name:'Xóa',exact:true}).click();
    await page.locator('#deleteConfirmModal').press('Escape');
    assert.ok(!(await page.locator('#deleteConfirmModal').getAttribute('class')).includes('active'));
    await card.getByRole('button',{name:'Xóa',exact:true}).click();
    await page.screenshot({path:infra+'/verification/portal-pet-archive-modal.private.png',fullPage:true});
    const [archived]=await Promise.all([
     page.waitForResponse(r=>r.url().includes('/rpc/change_own_pet_status')&&r.request().method()==='POST'),
     page.locator('#btnConfirmDelete').click()
    ]);assert.equal(archived.status(),200);
    await page.locator('.pet-filter-tab[data-tab="archive"]').click();
    const [restored]=await Promise.all([
     page.waitForResponse(r=>r.url().includes('/rpc/change_own_pet_status')&&r.request().method()==='POST'),
     page.locator('#archivePetGrid .pet-card').filter({hasText:'Browser form pet'}).getByRole('button',{name:'Khôi phục',exact:true}).click()
    ]);assert.equal(restored.status(),200);
    assert.equal((await ok(service.from('care_log').select('id').eq('appointment_id',appointmentId))).length,2);
    console.log('PASS actual archive confirmation modal, Escape close, archive tab restore and care history preservation.');
   }
   if(process.argv.includes('--pets-only')) return;
  }
  await page.locator('#btnEditProfile').click();
  await page.locator('#profileNameInput').fill('Portal verified update');
  await page.screenshot({path:infra+'/verification/portal-profile-modal.private.png',fullPage:true});
  const saved=page.waitForResponse(r=>r.url().includes('/rpc/customer_profile_save')&&r.request().method()==='POST');
  await page.locator('#btnSaveProfile').click();assert.equal((await saved).status(),200);
  await page.waitForFunction(()=>document.querySelector('#profileName')?.textContent.includes('Portal verified update'));
  await page.reload();await page.waitForFunction(()=>document.querySelector('#profileName')?.textContent.includes('Portal verified update'));
  assert.equal((await ok(service.from('customer_profile').select('full_name').eq('customer_id',cid).single())).full_name,'Portal verified update');
  await page.locator('#btnEditProfile').click();
  await page.locator('#profileNameInput').press('Escape');
  assert.equal(await page.locator('#profileEditModal').isVisible(),false);
  await page.locator('#btnEditProfile').click();
  const addAddress=async street=>{
   await page.locator('#btnToggleAddAddressForm').click();
   await page.locator('#newAddressStreetInput').fill(street);
   await page.locator('#newAddressDistrictInput').fill('District');
   await page.locator('#newAddressCityInput').fill('Province');
   await page.locator('#btnAddAddressConfirm').click();
  };
  await addAddress('10 Verification street');await addAddress('20 Verification street');
  await page.locator('.address-radio-input').nth(1).check();
  await page.screenshot({path:infra+'/verification/portal-address-modal.private.png',fullPage:true});
  const saveAddresses=page.waitForResponse(r=>r.url().includes('/rpc/customer_profile_save')&&r.request().method()==='POST');
  await page.locator('#btnSaveProfile').click();assert.equal((await saveAddresses).status(),200);
  let rows=await ok(service.from('customer_address').select('id,street_address,is_default').eq('customer_id',cid));
  assert.equal(rows.length,2);assert.equal(rows.filter(r=>r.is_default).length,1);
  assert.ok(rows.find(r=>r.is_default).street_address.startsWith('20 Verification'));
  await page.reload();await page.waitForFunction(()=>document.querySelector('#profileName')?.textContent.includes('Portal verified update'));
  await page.locator('#btnEditProfile').click();assert.equal(await page.locator('.address-item-card').count(),2);
  await page.locator('.btn-delete-address').click();
  const deleteAddress=page.waitForResponse(r=>r.url().includes('/rpc/customer_profile_save')&&r.request().method()==='POST');
  await page.locator('#btnSaveProfile').click();assert.equal((await deleteAddress).status(),200);
  rows=await ok(service.from('customer_address').select('id,is_default').eq('customer_id',cid));assert.equal(rows.length,1);assert.equal(rows[0].is_default,true);
  // Keep a stale form open while another real client commits a newer version.
  await page.locator('#btnEditProfile').click();await page.locator('#profileNameInput').fill('Stale browser draft');
  const second=createClient(config.DESTINATION_SUPABASE_URL,config.DESTINATION_SUPABASE_ANON_KEY,options);
  const authRecord=await ok(service.auth.admin.getUserById(uid));
  await ok(second.auth.signInWithPassword({email:authRecord.user.email,password}));
  const snapshot=await ok(second.rpc('customer_profile_snapshot'));
  await ok(second.rpc('customer_profile_save',{p_name:'Newer session saved',p_email:snapshot.email,p_addresses:snapshot.addresses,p_revision:snapshot.revision}));
  const conflict=page.waitForResponse(r=>r.url().includes('/rpc/customer_profile_save')&&r.request().method()==='POST');
  await page.locator('#btnSaveProfile').click();assert.equal((await conflict).status(),409);
  assert.equal(await page.locator('#profileEditModal').isVisible(),true);
  assert.equal(await page.locator('#profileNameInput').inputValue(),'Stale browser draft');
  assert.equal((await ok(service.from('customer_profile').select('full_name').eq('customer_id',cid).single())).full_name,'Newer session saved');
  console.log('PASS browser address add/default/delete/reload, Escape close and concurrent-save conflict preserving draft. Local profile module served with real Cloud data.');
  console.log('PASS Cloud new customer without points; production browser login, profile RPC save and reload. Dedicated fixture cleanup follows.');
 }catch(error){
  fs.writeFileSync(infra+'/verification/portal-profile-browser-error.private.txt',String(error.message).replaceAll(password,'[REDACTED]').replaceAll(phone,'[PHONE]'));
  throw error;
 }finally{
  if(browser)await browser.close();
  if(cid){
   const appointments=await ok(service.from('appointment').select('id').eq('customer_id',cid));
   for(const appointment of appointments)await ok(service.from('care_log').delete().eq('appointment_id',appointment.id));
   await ok(service.from('appointment').delete().eq('customer_id',cid));
   const pets=await ok(service.from('pet_profile').select('id').eq('customer_id',cid));
   for(const pet of pets)await ok(service.from('pet_weight_history').delete().eq('pet_id',pet.id));
   await ok(service.from('pet_profile').delete().eq('customer_id',cid));
   for(const table of ['customer_address','customer_membership','customer_phone','customer_profile'])await ok(service.from(table).delete().eq('customer_id',cid));await ok(service.from('customer').delete().eq('id',cid));}
  if(uid)await ok(service.auth.admin.deleteUser(uid));
 }
}
