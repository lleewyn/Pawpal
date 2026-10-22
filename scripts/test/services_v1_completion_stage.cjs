const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {service,admin,ok,browserPage,customer,infra}=require('./customer_completion_helpers.cjs'),uuid=()=>crypto.randomUUID();
(async()=>{const {browser,page}=await browserPage();const errors=[],js=[];page.on('pageerror',e=>js.push(e.message));page.on('response',r=>{if(r.url().includes('/rest/v1/')&&r.status()>=400)errors.push(new URL(r.url()).pathname+':'+r.status());});
 try{
  const c=await customer('=2+2'),breed=await ok(service.from('pet_breed').select('id,species_id').eq('is_active',true).limit(1).single()),pet=uuid(),svc=uuid(),appointment=uuid(),serviceName='Grooming Completion '+uuid().slice(0,8);
  await ok(admin.rpc('save_admin_pet',{p_pet_id:pet,p_expected_updated_at:null,p_details:{customer_id:c.id,breed_id:breed.id,pet_name:'Completion pet',gender:'unknown'},p_weight:4}));
  await ok(admin.rpc('save_admin_service_catalog',{p_id:svc,p_expected_updated_at:null,p_details:{service_code:'COMP-'+uuid(),service_name:serviceName,category_code:'grooming_spa',duration_minutes:30,status:'active',commission_rate:0,species_ids:[breed.species_id],steps:[]},p_prices:[{weight_from:0,weight_to:null,unit_price:10000}]}));
  const actor=await ok(service.from('staff').select('id,full_name').eq('email','admin.local@pawpal.test').single());
  const prev=await ok(service.from('appointment').select('scheduled_end_at').eq('staff_id',actor.id).order('scheduled_end_at',{ascending:false}).limit(1));
  const previousShifts=await ok(service.from('staff_schedule').select('end_at').eq('staff_id',actor.id).order('end_at',{ascending:false}).limit(1));
  const latest=Math.max(Date.now(),Date.parse(prev[0]?.scheduled_end_at||'2000-01-01'),Date.parse(previousShifts[0]?.end_at||'2000-01-01')),day=new Date(latest+2*86400000).toISOString().slice(0,10);
  const start=day+'T09:00:00+07:00';await ok(service.from('staff_schedule').insert({staff_id:actor.id,start_at:day+'T08:00:00+07:00',end_at:day+'T12:00:00+07:00',availability_status:'available',schedule_status:'active'}));
  await ok(admin.rpc('create_admin_service_booking',{p_id:appointment,p_details:{customer_id:c.id,pet_id:pet,service_id:svc,staff_id:actor.id,scheduled_start_at:start}}));
  await ok(service.from('staff_schedule').insert({staff_id:actor.id,start_at:day+'T13:00:00+07:00',end_at:day+'T14:00:00+07:00',availability_status:'unavailable',schedule_status:'active',reason:'Confirmed leave'}));
  assert.equal((await admin.rpc('create_admin_service_booking',{p_id:uuid(),p_details:{customer_id:c.id,pet_id:pet,service_id:svc,staff_id:actor.id,scheduled_start_at:day+'T13:15:00+07:00'}})).error.message,'staff_not_available');
  await page.evaluate(()=>location.hash='tab-service-bookings');await page.waitForFunction(()=>window.PawpalServices?.state.isLoaded);await page.evaluate(async()=>{await PawpalServices.loadServicesData({force:true});await PawpalServices.loadCatalogData({force:true});});
  assert.ok(await page.locator('#servicesBookingTableBody tr').count()<=10);
  const search=page.locator('#serviceSearchInput');await search.fill(c.phone);await page.waitForFunction(phone=>document.querySelectorAll('#servicesBookingTableBody tr').length===1&&document.getElementById('servicesBookingTableBody').textContent.includes(phone),c.phone);assert.equal(await page.locator('#servicesBookingTableBody tr').count(),1);
  const download=page.waitForEvent('download');await page.locator('#btnExportServiceReport').click();const file=await download,output=fs.readFileSync(await file.path(),'utf8');assert.equal(output.trim().split(/\r?\n/).length,2);assert.ok(output.includes("\"'=2+2\""));
  await page.locator('#serviceFilterStatus').selectOption('completed');await page.waitForFunction(()=>!document.getElementById('servicesBookingTableBody').textContent.includes('Completion pet'));await page.locator('#btnServiceClearFilters').click();
  await page.locator('#btnOpenStaffScheduleModal').click();await page.locator('#staffScheduleDate').fill(day);await page.locator('#staffScheduleDate').dispatchEvent('change');await page.waitForFunction(()=>document.getElementById('staffScheduleGrid').textContent.includes('Completion pet'));
  assert.equal(await page.locator('#summaryTotalAssignedBookings').textContent(),'1');assert.equal(await page.locator('#summaryTotalStaffCount').textContent(),'1');assert.ok((await page.locator('#staffScheduleGrid').textContent()).includes('Confirmed leave'));
  await page.locator('[data-shift-filter="AFTERNOON"]').click();await page.waitForFunction(()=>document.getElementById('summaryTotalAssignedBookings').textContent==='0');await page.keyboard.press('Escape');
  // Real employee selection stores an ID, with no fabricated fallback names.
  await page.evaluate(id=>{const b=PawpalServices.state.bookingsData.find(b=>b.dbId===id);PawpalServices.subtabs.bookings.openChangeStaffModal(b.id);PawpalServices.enhanceEntitySelects();},appointment);
  const staffOptions=await page.locator('#changeStaffSelect option').evaluateAll(options=>options.filter(o=>o.value).map(o=>o.value));assert.ok(staffOptions.every(id=>/^[a-f0-9-]{36}$/i.test(id)));
  await page.keyboard.press('Escape');
  await page.evaluate(()=>PawpalServices.switchSubtab('tab-service-catalog'));await page.waitForFunction(()=>document.querySelectorAll('#servicesCatalogTableBody tr[data-service-code]').length>0);assert.ok(await page.locator('#servicesCatalogTableBody tr').count()<=10);
  const firstCodes=await page.locator('#servicesCatalogTableBody tr[data-service-code]').evaluateAll(rows=>rows.map(r=>r.dataset.serviceCode));await page.locator('#servicesCatalogPagination button').filter({hasText:'>'}).click();const nextCodes=await page.locator('#servicesCatalogTableBody tr[data-service-code]').evaluateAll(rows=>rows.map(r=>r.dataset.serviceCode));assert.ok(!nextCodes.some(id=>firstCodes.includes(id)));
  await page.locator('#catalogSearchInput').fill(serviceName);await page.waitForFunction(name=>document.querySelectorAll('#servicesCatalogTableBody tr[data-service-code]').length===1&&document.getElementById('servicesCatalogTableBody').textContent.includes(name),serviceName);
  await page.evaluate(()=>PawpalServices.switchSubtab('tab-service-bookings'));await page.locator('#btnOpenCreateBookingModal').click();await page.locator('#newBookingCustomer').fill(c.phone);await page.locator('#bookingCustomerDropdown .customer-autocomplete-item').first().click();
  await page.locator('#newBookingServiceInput').fill(serviceName);await page.locator('#bookingServiceDropdown .customer-autocomplete-item').first().click();assert.equal(await page.locator('#newBookingSpaFields').count(),0);assert.equal(await page.locator('#createBookingSpaFields').isVisible(),true);
  await page.locator('#newBookingSpaStyle').fill('Must clear when changing category');await page.locator('#newBookingCategory').selectOption('Hotel');assert.equal(await page.locator('#newBookingSpaStyle').inputValue(),'');await page.locator('#newBookingCategory').selectOption('Spa');
  await page.locator('#newBookingServiceInput').fill(serviceName);await page.locator('#bookingServiceDropdown .customer-autocomplete-item').first().click();const styleNote='Style '+uuid();await page.locator('#newBookingSpaStyle').fill(styleNote);await page.locator('#newBookingDate').fill(day);await page.locator('#newBookingTime').fill('15:00');assert.equal(await page.locator('#newBookingBranch').count(),0);
  await page.locator('#btnSubmitCreateBooking').click();await page.waitForFunction(note=>PawpalServices.state.bookingsData.some(b=>b.rawNote?.includes(note)),styleNote);
  // Every service modal must hide completely on all supported close paths, including legacy inline display.
  const ids=await page.locator('.services-module .admin-modal-overlay').evaluateAll(nodes=>nodes.map(n=>n.id));
  for(const id of ids)for(const action of ['button','cancel','escape','backdrop']){
   await page.evaluate(id=>{const modal=document.getElementById(id);modal.style.display='flex';modal.classList.add('active');},id);
   if(action==='button')await page.locator('#'+id+' [data-close-modal="'+id+'"]').first().click();
   if(action==='cancel'){const button=page.locator('#'+id+' .admin-btn-secondary[data-close-modal="'+id+'"]');if(await button.count())await button.first().click();else await page.locator('#'+id+' [data-close-modal="'+id+'"]').first().click();}
   if(action==='escape')await page.keyboard.press('Escape');
   if(action==='backdrop')await page.locator('#'+id).click({position:{x:3,y:3}});
   await page.waitForFunction(id=>getComputedStyle(document.getElementById(id)).display==='none',id);
  }
  await page.evaluate(id=>{const b=PawpalServices.state.bookingsData.find(b=>b.dbId===id);PawpalServices.openBookingDetail(b.id);},appointment);await page.reload();await page.waitForFunction(id=>window.PawpalServices?.state.isLoaded&&window.PawpalServices.state.bookingsData.some(b=>b.dbId===id),appointment);assert.ok(page.url().includes('tab-service-detail'));
  assert.deepEqual(errors,[]);assert.deepEqual(js,[]);console.log('PASS services completion: live schedule/date/shift/exact assignment counts, unavailable staff rejected atomically, real employee IDs, booking filter/export with CSV escaping, catalog ten-row pagination/search, all '+ids.length+' modal close paths, detail reload; no browser/REST failures.');
 }catch(error){await page.screenshot({path:infra+'/verification/services-completion-failure.png',fullPage:true});console.error({errors,js});throw error;}finally{await browser.close();}
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
