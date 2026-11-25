// Real STAFF RPCs and actual edit form; isolated customer/pet/history fixtures always roll back.
const fs=require('node:fs'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const {connect}=require('../../my-server/scripts/database/v1/service_import_connection.cjs');
if(!process.argv.includes('--cloud')&&!process.argv.includes('--apply-cloud'))process.exit(0);
(async()=>{const db=await connect(),browser=await chromium.launch({channel:'chrome',headless:true}),folder='docs/verification/staff-pet-care-edit';fs.mkdirSync(folder,{recursive:true});let page;const checks=[],pass=s=>{checks.push(s);console.log('PASS',s);};
 const migration=fs.readFileSync('my-server/scripts/database/v1/276_pet_legacy_gender.sql','utf8').replace(/^BEGIN;/,'').replace(/COMMIT;\s*$/,'');
 try{
  await db.query("BEGIN;SET LOCAL statement_timeout='10s';SET LOCAL lock_timeout='3s'");await db.query(migration);await db.query(migration);
  const owner=randomUUID(),pet=randomUUID(),oldWeight=randomUUID();
  const actor=(await db.query("SELECT s.id,s.auth_user_id FROM public.staff s JOIN public.staff_role r ON r.staff_id=s.id WHERE r.role_code='STAFF' AND s.employment_status='active' AND s.auth_user_id IS NOT NULL AND NOT s.must_change_password LIMIT 1")).rows[0];
  await db.query('INSERT INTO public.customer(id,customer_code) VALUES($1,$2)',[owner,'QA-CARE-'+owner.slice(0,8)]);
  await db.query("INSERT INTO public.customer_profile(customer_id,full_name) VALUES($1,'KH-A kiểm thử') ON CONFLICT(customer_id) DO UPDATE SET full_name=excluded.full_name",[owner]);
  await db.query("INSERT INTO public.pet_profile(id,pet_code,customer_id,pet_name,breed_id,gender,color,allergy,safety_note,routine) SELECT $1,$2,$3,'TC-A Oreo kiểm thử',breed_id,'nu','Màu cũ','Dị ứng bụi','Lưu ý an toàn cũ','Ghi chú trước' FROM public.pet_profile WHERE id='22cbed24-dd2d-418f-bdde-8db44890b52d'",[pet,'QA-PET-'+pet.slice(0,8),owner]);
  await db.query("INSERT INTO public.pet_weight_history(id,pet_id,weight,measured_at,recorded_by,note) VALUES($1,$2,3,now()-interval '1 day',$3,'Cân nặng trước kiểm thử')",[oldWeight,pet,actor.id]);
  const before=(await db.query('SELECT to_jsonb(p) value FROM public.pet_profile p WHERE id=$1',[pet])).rows[0].value;
  const historyBefore=(await db.query('SELECT to_jsonb(w) value FROM public.pet_weight_history w WHERE id=$1',[oldWeight])).rows[0].value;
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role','authenticated',true)",[actor.auth_user_id]);await db.query('SET LOCAL ROLE authenticated');
  const rpc=async(name,args={})=>{const keys=({get_staff_pet_species:[],get_staff_workspace:['p_kind','p_query','p_id','p_page'],save_admin_pet:['p_pet_id','p_expected_updated_at','p_details','p_weight']})[name];assert.ok(keys);await db.query('SAVEPOINT call_rpc');
   try{const values=keys.map(k=>args[k]&&typeof args[k]==='object'?JSON.stringify(args[k]):args[k]),data=(await db.query(`SELECT public.${name}(${keys.map((k,i)=>k+'=> $'+(i+1)).join(',')}) value`,values)).rows[0].value;await db.query('RELEASE SAVEPOINT call_rpc');return {data,error:null};}
   catch(e){await db.query('ROLLBACK TO SAVEPOINT call_rpc');await db.query('RELEASE SAVEPOINT call_rpc');return {data:null,error:{message:e.message,code:e.code}};}
  };
  page=await browser.newPage({viewport:{width:1100,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('http://localhost/',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><body></body>'}));await page.goto('http://localhost/');await page.exposeFunction('liveRpc',rpc);
  const source=fs.readFileSync('my-client/pages/admin/modules/pets/pets.js','utf8');
  const mount=async()=>{
   await page.setContent('<body class="admin-body admin-ui-standard" style="background:#F4F9F6"><main class="staff-workspace" style="padding:24px"></main></body>');
   for(const file of ['my-client/pages/admin/admin.css','my-client/pages/admin/admin-components.css','my-client/pages/admin/admin-typography.css'])await page.addStyleTag({content:fs.readFileSync(file,'utf8')});
   await page.evaluate(()=>{window.PawpalAdminAccess={state:{user:{permissions:['work.pet.write']}},isStaff:()=>true};window.getSupabaseClient=()=>({rpc:(name,args)=>liveRpc(name,args||{})});});
   await page.addScriptTag({content:source.slice(0,source.indexOf('// Role-scoped screens'))});
   await page.evaluate(pet=>PawpalPetsStaff.editPet({petId:pet,onCreated:()=>window.saved=true}),pet);
   await page.waitForFunction(()=>!document.querySelector('#staffPetname').disabled);
  };
  await mount();assert.equal(await page.locator('#staffPetgender').inputValue(),'female');assert.equal(await page.locator('#staffPetgender option:checked').textContent(),'Cái');pass('Legacy nu loads as Cái without an empty gender select');
  await page.fill('#staffPetweight','3.5');await page.fill('#staffPetroutine','QA: nhát máy sấy');
  await page.locator('#staffPetCreateModal .admin-modal-card').screenshot({path:folder+'/01-care-edit-valid.png'});
  await page.getByRole('button',{name:'Lưu thay đổi',exact:true}).click();await page.waitForFunction(()=>window.saved);assert.equal(await page.locator('#staffPetCreateModal').evaluate(e=>e.classList.contains('active')),false);pass('STAFF saves 3.5 kg and care note through actual modal');
  await page.reload();await mount();assert.equal(await page.locator('#staffPetweight').inputValue(),'3.5');assert.equal(await page.locator('#staffPetroutine').inputValue(),'QA: nhát máy sấy');assert.equal(await page.locator('#staffPetallergy').inputValue(),'Dị ứng bụi');assert.equal(await page.locator('#staffPetsafety').inputValue(),'Lưu ý an toàn cũ');
  await page.locator('#staffPetCreateModal .admin-modal-card').screenshot({path:folder+'/02-reloaded-care-edit.png'});pass('Browser reload preserves new weight/note, gender and pre-existing allergy/safety notes');
  await db.query('RESET ROLE');const after=(await db.query('SELECT to_jsonb(p) value FROM public.pet_profile p WHERE id=$1',[pet])).rows[0].value;
  for(const key of ['customer_id','pet_code','pet_name','breed_id','date_of_birth','color','allergy','safety_note','created_at','status'])assert.deepEqual(after[key],before[key]);assert.equal(after.routine,'QA: nhát máy sấy');assert.equal(after.gender,'female');
  assert.deepEqual((await db.query('SELECT to_jsonb(w) value FROM public.pet_weight_history w WHERE id=$1',[oldWeight])).rows[0].value,historyBefore);assert.equal((await db.query('SELECT count(*)::int n FROM public.pet_weight_history WHERE pet_id=$1',[pet])).rows[0].n,2);pass('Owner and existing profile/history unchanged; one new weight measurement appended');
  await db.query('SET LOCAL ROLE authenticated');await db.query('SAVEPOINT legacy_client');
  const details={customer_id:owner,pet_name:after.pet_name,breed_id:after.breed_id,gender:'',color:after.color,safety_note:after.safety_note,allergy:after.allergy,routine:after.routine,status:'active'};
  const result=await rpc('save_admin_pet',{p_pet_id:pet,p_expected_updated_at:after.updated_at,p_details:details,p_weight:3.5});assert.equal(result.data,pet);await db.query('RESET ROLE');assert.equal((await db.query('SELECT gender FROM public.pet_profile WHERE id=$1',[pet])).rows[0].gender,'female');assert.equal((await db.query('SELECT count(*)::int n FROM public.pet_weight_history WHERE pet_id=$1',[pet])).rows[0].n,2);await db.query('ROLLBACK TO SAVEPOINT legacy_client');pass('Older blank-select client preserves stored gender and does not duplicate weight history');
  assert.deepEqual(errors,[]);await db.query('RESET ROLE');await db.query('ROLLBACK');assert.equal((await db.query('SELECT 1 FROM public.pet_profile WHERE id=$1',[pet])).rowCount,0);pass('Fixture customer, pet, history and audit data fully rolled back');
  if(process.argv.includes('--apply-cloud')){await db.query('BEGIN');await db.query(migration);await db.query('COMMIT');pass('Migration 276 applied; no existing business rows updated');}
  fs.writeFileSync(folder+'/verification.txt',JSON.stringify({status:'PASS',timestamp:new Date().toISOString(),checks,scope:'Actual staff modal with live SQL RPC transaction; synthetic pet with legacy nu gender; full rollback'},null,2)+'\n');
 }catch(e){if(page)await page.screenshot({path:folder+'/failure.png'}).catch(()=>{});await db.query('ROLLBACK').catch(()=>{});throw e;}finally{await db.end();await browser.close();}
})().catch(e=>{console.error(e.code||'',e.message);process.exitCode=1;});
