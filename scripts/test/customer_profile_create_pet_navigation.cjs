// Actual modern pet form/taxonomy and profile navigation handlers. Optional SQL tests ROLLBACK.
const fs=require('node:fs'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});try{
 const p=await b.newPage({viewport:{width:1440,height:1000}});await p.route('**/*',r=>r.abort());await p.route('http://localhost:3001/',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><body></body></html>'}));await p.goto('http://localhost:3001/');
 await p.setContent('<button class="sidebar-menu-btn" data-title="Bán hàng">Bán hàng</button><button class="sidebar-menu-btn" data-title="Dịch vụ">Dịch vụ</button>'+fs.readFileSync('pages/admin/modules/customers/customers.html','utf8'));
 const shell=fs.readFileSync('pages/admin/index.html','utf8');for(const match of shell.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="(\/[^"?]+)[^"]*"[^>]*>/g))await p.addStyleTag({content:fs.readFileSync(match[1].slice(1),'utf8')});
 await p.evaluate(()=>{
  document.body.className='admin-body';window.calls=[];window.petArgs=[];window.created=[];
  window.getSupabaseClient=()=>({from:table=>{const q={select:()=>q,eq:()=>q,order:()=>q,then:resolve=>resolve({data:table==='pet_species'?[{id:'species-cat',species_name:'Mèo'}]:[{id:'breed-cat',species_id:'species-cat',breed_name:'Anh lông ngắn'}],error:null})};return q;},rpc:async(name,args)=>{petArgs.push(args);created=[{id:'PET-QA',dbId:args.p_pet_id,name:args.p_name,species:'Mèo',breed:'Anh lông ngắn',weight:args.p_weight,allergy:args.p_allergy,status:'active'}];return {data:args.p_pet_id,error:null};}});
 });
 for(const file of ['customers.js','subtabs/tab-customer-profile.js']){let s=fs.readFileSync('pages/admin/modules/customers/'+file,'utf8');s=s.slice(0,s.lastIndexOf("    if (document.readyState === 'loading')"))+'})();';await p.addScriptTag({content:s});}
 await p.evaluate(()=>{
  const cust={id:'CUS-QA',dbId:'customer-a',name:'QA owner',pets:[],orders:[{id:'ORD-QA',date:'27/10/2026',total:'100 đ',payment:'Đã thanh toán',paymentClass:'badge-success',status:'Đang giao',statusClass:'badge-info'}],bookings:[{id:'APT-QA',date:'27/10/2026',service:'Tắm',status:'Chờ xác nhận',statusClass:'badge-warning'}],_historyStatus:{orders:'loaded',bookings:'loaded'}};
  PawpalCustomers.state.customerDatabase[cust.id]=cust;PawpalCustomers.showToast=()=>{};PawpalCustomers.refreshCustomerData=async()=>{cust.pets=created;};document.getElementById('profileValCustId').textContent=cust.id;
  PawpalCustomers.subtabs.profile.init();PawpalCustomers.subtabs.profile.renderDrawerOrders(cust.id);PawpalCustomers.subtabs.profile.renderDrawerBookings(cust.id);
  document.querySelectorAll('.subtab-content').forEach(el=>el.classList.remove('active'));document.getElementById('subtab-tab-profile').classList.add('active');document.getElementById('customerProfilePlaceholder').hidden=true;document.getElementById('customerProfileData').hidden=false;
 });
 await p.evaluate(()=>PawpalCustomers.subtabs.profile.openAddPetModal());await p.locator('#addPetName').fill('Ran');
 await p.locator('#addPetSpecies').focus();await p.locator('#addPetSpeciesDropdown [data-id="species-cat"]').click();await p.locator('#addPetBreed').focus();await p.locator('#addPetBreedDropdown [data-id="breed-cat"]').click();
 await p.locator('#addPetWeight').fill('6.5');await p.locator('#addPetAllergy').fill('Dị ứng socola');await p.locator('#btnSubmitAddPet').click();await p.waitForFunction(()=>document.querySelector('#petCardsListContainer').textContent.includes('Ran'));
 const args=await p.evaluate(()=>petArgs[0]);assert.equal(args.p_customer_id,'customer-a');assert.equal(args.p_weight,6.5);assert.equal(args.p_breed_id,'breed-cat');assert.equal(args.p_allergy,'Dị ứng socola');assert.equal(await p.locator('#modalAddPet').isVisible(),false);
 const folder='docs/verification/customer-profile-links';fs.mkdirSync(folder,{recursive:true});
 await p.evaluate(()=>{document.querySelectorAll('.drawer-tab-panel').forEach(e=>e.classList.remove('active'));document.getElementById('dtab-pets').classList.add('active');});await p.locator('#petCardsListContainer').screenshot({path:folder+'/created-pet.png'});
 await p.evaluate(()=>{
  window.installTargets=()=>{window.PawpalOrders={state:{selectedOrderId:'OLD-ORDER'}};window.PawpalOrdersModule={openOrderDetail:id=>{calls.push(['order',id,PawpalOrders.state.selectedOrderId]);}};window.PawpalServices={state:{selectedBookingId:'OLD-BOOKING'},openBookingDetail:id=>{calls.push(['booking',id,PawpalServices.state.selectedBookingId]);}};};installTargets();
  document.querySelectorAll('.sidebar-menu-btn').forEach(btn=>btn.onclick=()=>{if(window.cold)installTargets();window.dispatchEvent(new CustomEvent('admin:module-show',{detail:{module:btn.dataset.title}}));});
 });
 for(const cold of [false,true]){
  await p.evaluate(cold=>{window.cold=cold;if(cold){delete window.PawpalOrders;delete window.PawpalOrdersModule;delete window.PawpalServices;}document.querySelector('.btn-view-order-action').click();},cold);
  assert.equal(await p.evaluate(()=>sessionStorage.getItem('pawpal_admin_order_selected_id')),'ORD-QA');assert.equal(await p.evaluate(()=>calls.at(-1)[1]),'ORD-QA');
  await p.evaluate(cold=>{if(cold){delete window.PawpalServices;}document.querySelector('.btn-view-booking-action').click();},cold);
  assert.equal(await p.evaluate(()=>sessionStorage.getItem('pawpal_admin_service_selected_id')),'APT-QA');assert.equal(await p.evaluate(()=>sessionStorage.getItem('pawpal_admin_services_active_subtab')),'tab-service-detail');assert.equal(await p.evaluate(()=>calls.at(-1)[1]),'APT-QA');
 }
 // Warm modules must have their in-memory selection updated before routing.
 const calls=await p.evaluate(()=>calls);assert.deepEqual(calls[0],['order','ORD-QA','ORD-QA']);assert.deepEqual(calls[1],['booking','APT-QA','APT-QA']);
 console.log('PASS actual modern add-pet form binds captured owner, species/breed, 6.5kg and allergy; refresh adds pet card; order/booking handlers route exact IDs for cold and warm modules. Isolated transport.');
 }finally{await b.close();}
 if(!process.argv.includes('--cloud'))return;
 const {connect}=require('../database/v1/service_import_connection.cjs');const db=await connect();try{
  await db.query("BEGIN;SET LOCAL statement_timeout='8s';SET LOCAL lock_timeout='3s'");
  const user=randomUUID(),staff=randomUUID(),owner=randomUUID(),other=randomUUID(),pet=randomUUID();
  await db.query('INSERT INTO auth.users(id) VALUES($1)',[user]);await db.query("INSERT INTO public.staff(id,auth_user_id,full_name,job_title,employment_status,must_change_password) VALUES($1,$2,'QA pet rollback','QA','active',false)",[staff,user]);await db.query("INSERT INTO public.staff_role(staff_id,role_code) VALUES($1,'ADMIN')",[staff]);
  await db.query('INSERT INTO public.customer(id,customer_code) VALUES($1,$2),($3,$4)',[owner,'QA-PET-'+owner,other,'QA-PET-'+other]);
  const breed=(await db.query('SELECT b.id FROM public.pet_breed b JOIN public.pet_species s ON s.id=b.species_id WHERE b.is_active AND s.is_active ORDER BY b.id LIMIT 1')).rows[0]?.id;assert.ok(breed);
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role','authenticated',true)",[user]);await db.query('SET LOCAL ROLE authenticated');
  const args=[owner,pet,'Ran',breed,6.5,'Cần theo dõi','Dị ứng socola',null];for(let i=0;i<2;i++)await db.query('SELECT public.add_customer_pet($1,$2,$3,$4,$5,$6,$7,$8)',args);
  const row=(await db.query('SELECT customer_id,pet_name,allergy FROM public.pet_profile WHERE id=$1',[pet])).rows[0];assert.equal(row.customer_id,owner);assert.equal(row.pet_name,'Ran');assert.equal(row.allergy,'Dị ứng socola');
  assert.equal(Number((await db.query('SELECT count(*) n FROM public.pet_profile WHERE id=$1 AND customer_id=$2',[pet,other])).rows[0].n),0);
  const weights=(await db.query('SELECT weight FROM public.pet_weight_history WHERE pet_id=$1',[pet])).rows;assert.equal(weights.length,1);assert.equal(Number(weights[0].weight),6.5);
  await db.query('SET CONSTRAINTS ALL IMMEDIATE');await db.query('ROLLBACK');
  fs.writeFileSync('docs/verification/sync/customer-profile-add-pet-rollback.txt',JSON.stringify({timestamp:new Date().toISOString(),status:'PASS',checks:['Admin adds pet via installed RPC','Correct owner, name and allergy','Other owner has no linked pet','6.5kg saved once','Retry creates no duplicate','Deferred constraints pass'],scope:'Synthetic two owners/one pet/actor, all fixtures rolled back; no Logs or committed customer changes'},null,2)+'\n');
  console.log('PASS live add_customer_pet: correct owner/name/allergy/6.5kg; retry idempotent, constraints pass. All fixtures rolled back.');
 }catch(e){await db.query('ROLLBACK').catch(()=>{});throw e;}finally{await db.end();}
})().catch(e=>{console.error(e.code||e.name,e.message);process.exitCode=1;});
