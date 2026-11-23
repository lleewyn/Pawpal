// Real STAFF-scoped RPCs + actual pet modal. All fixture data is rolled back.
const fs=require('node:fs'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const {connect}=require('../database/v1/service_import_connection.cjs');
if(!process.argv.includes('--cloud')&&!process.argv.includes('--apply-cloud'))process.exit(0);
(async()=>{const db=await connect(),browser=await chromium.launch({channel:'chrome',headless:true});const folder='docs/verification/staff-pet-species-breed';fs.mkdirSync(folder,{recursive:true});const checks=[],pass=s=>{checks.push(s);console.log('PASS',s);};let page;
const migration=fs.readFileSync('scripts/database/v1/275_staff_pet_species_breed.sql','utf8').replace(/^BEGIN;/,'').replace(/COMMIT;\s*$/,'');
try{
 await db.query("BEGIN;SET LOCAL statement_timeout='10s';SET LOCAL lock_timeout='3s'");await db.query(migration);await db.query(migration);
 const owner=randomUUID(),customBreed='QA giống tự nhập '+owner.slice(0,8);
 await db.query('INSERT INTO public.customer(id,customer_code) VALUES($1,$2)',[owner,'QA-OWNER-'+owner]);
 await db.query("INSERT INTO public.customer_profile(customer_id,full_name) VALUES($1,'KH-A kiểm thử') ON CONFLICT(customer_id) DO UPDATE SET full_name=excluded.full_name",[owner]);
 const actor=(await db.query("SELECT s.auth_user_id FROM public.staff s JOIN public.staff_role r ON r.staff_id=s.id WHERE r.role_code='STAFF' AND s.employment_status='active' AND s.auth_user_id IS NOT NULL AND NOT s.must_change_password LIMIT 1")).rows[0].auth_user_id;
 await db.query("SELECT set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role','authenticated',true)",[actor]);await db.query('SET LOCAL ROLE authenticated');
 assert.equal((await db.query("SELECT pawpal_private.has_permission('work.pet.write') ok")).rows[0].ok,true);
 let saves=0;
 const rpc=async(name,args)=>{
  const keys=({get_staff_pet_species:[],get_staff_workspace:['p_kind','p_query','p_id','p_page'],save_admin_pet:['p_pet_id','p_expected_updated_at','p_details','p_weight']})[name];assert.ok(keys);if(name==='save_admin_pet')saves++;
  await db.query('SAVEPOINT ui_rpc');try{const values=keys.map(k=>args[k]&&typeof args[k]==='object'?JSON.stringify(args[k]):args[k]);const result=(await db.query(`SELECT public.${name}(${keys.map((k,i)=>k+'=> $'+(i+1)).join(',')}) value`,values)).rows[0].value;await db.query('RELEASE SAVEPOINT ui_rpc');return {data:result,error:null};}
  catch(e){await db.query('ROLLBACK TO SAVEPOINT ui_rpc');await db.query('RELEASE SAVEPOINT ui_rpc');return {data:null,error:{message:e.message,code:e.code}};}
 };
 page=await browser.newPage({viewport:{width:1100,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('http://localhost/',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><body></body>'}));await page.goto('http://localhost/');await page.setContent('<body class="admin-body admin-ui-standard" style="background:#F4F9F6"><main class="staff-workspace" style="padding:24px"></main></body>');
 for(const file of ['pages/admin/admin.css','pages/admin/admin-components.css','pages/admin/admin-typography.css'])await page.addStyleTag({content:fs.readFileSync(file,'utf8')});
 await page.exposeFunction('liveRpc',rpc);
 await page.evaluate(()=>{window.PawpalAdminAccess={state:{user:{permissions:['work.pet.write']}},isStaff:()=>true};window.getSupabaseClient=()=>({rpc:(name,args)=>liveRpc(name,args||{})});});
 const source=fs.readFileSync('pages/admin/modules/pets/pets.js','utf8');await page.addScriptTag({content:source.slice(0,source.indexOf('// Role-scoped screens'))});
 await page.evaluate(owner=>PawpalPetsStaff.openPet({customerId:owner,onCreated:id=>window.createdPet=id}),owner);
 const modal=page.locator('#staffPetCreateModal');await page.waitForFunction(()=>document.querySelector('#staffPetowner').readOnly);
 assert.equal(await page.locator('#staffPetspecies').evaluate(e=>e.tagName),'SELECT');assert.equal(await page.locator('#staffPetbreed').getAttribute('role'),null);assert.equal(await modal.locator('[list]').count(),0);
 await page.getByRole('button',{name:'Lưu bé cưng',exact:true}).click();assert.equal(saves,0);
 await page.fill('#staffPetname','QA Miu');await page.getByRole('button',{name:'Lưu bé cưng',exact:true}).click();assert.equal(await page.locator('#staffPetspecies').getAttribute('aria-invalid'),'true');
 await page.selectOption('#staffPetspecies',{label:'Mèo'});await page.fill('#staffPetbreed',customBreed);await page.fill('#staffPetweight','3');
 await modal.locator('.admin-modal-card').screenshot({path:folder+'/01-create-separated-fields.png'});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:folder+'/01-create-mobile.png'});await page.getByRole('button',{name:'Lưu bé cưng',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:folder+'/01-create-mobile-footer.png'});await page.setViewportSize({width:1100,height:1000});
 await page.evaluate(()=>{const save=document.querySelector('#staffPetCreateModal .admin-btn-primary');save.click();save.click();});await page.waitForFunction(()=>Boolean(window.createdPet));assert.equal(saves,1);pass('Single-choice species, free-text breed, required validation and double click creates one pet');
 const petId=await page.evaluate(()=>createdPet),own=await rpc('get_staff_workspace',{p_kind:'pets',p_query:'',p_id:owner,p_page:1}),profile=await rpc('get_staff_workspace',{p_kind:'pets',p_query:'',p_id:petId,p_page:1});assert.equal(own.data.items.length,1);assert.deepEqual(own.data.items[0],profile.data.items[0]);const pet=profile.data.items[0];assert.equal(pet.customer_id,owner);assert.equal(pet.pet_name,'QA Miu');assert.equal(pet.species_name,'Mèo');assert.equal(pet.breed_name,customBreed);assert.equal(Number(pet.current_weight),3);pass('Customer and pet profile reads agree on owner, name, species, custom breed and 3 kg');
 await page.evaluate(id=>PawpalPetsStaff.editPet({petId:id,onCreated:()=>window.edited=true}),petId);await page.waitForFunction(()=>!document.querySelector('#staffPetname').disabled);assert.equal(await page.locator('#staffPetbreed').inputValue(),customBreed);assert.equal(await page.locator('#staffPetspecies option:checked').textContent(),'Mèo');await modal.locator('.admin-modal-card').screenshot({path:folder+'/02-edit-saved-pet.png'});pass('Reopened edit form restores species and freely editable custom breed');
 await page.getByRole('button',{name:'Lưu thay đổi',exact:true}).click();await page.waitForFunction(()=>window.edited);
 const core=fs.readFileSync('pages/admin/admin.js','utf8');
 await page.evaluate(()=>{window.PawpalAdminViews={helpers:{},register:(_name,config)=>window.petProfile=config.profiles['pet-profile']};});
 await page.addScriptTag({content:source.slice(source.indexOf('(function registerRoleViews()'),source.indexOf('(function initializeManagementDomain()'))});
 await page.addScriptTag({content:core.split('\n').find(l=>l.includes('const el = (tag,'))+core.slice(core.indexOf('    function card('),core.indexOf('    async function profile('))+'window.renderPet=row=>petProfile.render({el,facts,root:document.querySelector("main"),row,id:row.id,refresh(){}});'});
 await page.evaluate(pet=>renderPet(pet),pet);await page.screenshot({path:folder+'/03-created-pet-profile.png'});
 const invalid=await rpc('save_admin_pet',{p_pet_id:randomUUID(),p_expected_updated_at:null,p_details:{customer_id:owner,pet_name:'QA sai loài',species_id:randomUUID(),breed_name:customBreed,gender:'unknown'},p_weight:null});assert.equal(invalid.error.message,'invalid_pet_species');pass('Unknown species is rejected by the database');
 await db.query('SAVEPOINT legacy');const legacyId=randomUUID(),legacy=await rpc('save_admin_pet',{p_pet_id:legacyId,p_expected_updated_at:null,p_details:{customer_id:owner,pet_name:'QA tương thích',breed_id:pet.breed_id,gender:'unknown'},p_weight:null});assert.equal(legacy.data,legacyId);await db.query('ROLLBACK TO SAVEPOINT legacy');pass('Existing breed_id callers remain compatible');
 await db.query('RESET ROLE');assert.equal((await db.query('SELECT count(*)::int n FROM public.pet_breed WHERE species_id=$1 AND breed_name=$2',[pet.pet_species_id,customBreed])).rows[0].n,1);assert.equal((await db.query('SELECT count(*)::int n FROM public.pet_profile WHERE customer_id=$1',[owner])).rows[0].n,1);await db.query('SET LOCAL ROLE authenticated');pass('Editing reuses existing species/breed without duplicate pets or breed rows');
 await db.query('SAVEPOINT forbidden');await db.query("SELECT set_config('request.jwt.claim.sub','',true)");const denied=await rpc('get_staff_pet_species',{});assert.equal(denied.error.code,'42501');await db.query('ROLLBACK TO SAVEPOINT forbidden');pass('Unauthenticated species access denied');
 assert.deepEqual(errors,[]);await db.query('RESET ROLE');await db.query('ROLLBACK');assert.equal((await db.query('SELECT 1 FROM public.pet_profile WHERE id=$1',[petId])).rowCount,0);assert.equal((await db.query('SELECT 1 FROM public.pet_breed WHERE breed_name=$1',[customBreed])).rowCount,0);pass('All test customer, pet, weight, breed and audit rows rolled back');
 if(process.argv.includes('--apply-cloud')){await db.query('BEGIN');await db.query(migration);await db.query('COMMIT');pass('Migration 275 applied; existing business data unchanged');}
 fs.writeFileSync(folder+'/verification.txt',JSON.stringify({status:'PASS',timestamp:new Date().toISOString(),scope:'Actual modal with real STAFF-scoped Supabase RPCs in rollback transaction; fixture customer and QA Miu removed',checks},null,2)+'\n');
}catch(e){if(page)await page.screenshot({path:folder+'/failure.png'}).catch(()=>{});await db.query('ROLLBACK').catch(()=>{});throw e;}finally{await db.end();await browser.close();}
})().catch(e=>{console.error(e.code||'',e.message);process.exitCode=1;});
