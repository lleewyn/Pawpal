const fs = require('node:fs');
const assert = require('node:assert/strict');
const {randomUUID} = require('node:crypto');
const {chromium} = require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const {connect} = require('../database/v1/service_import_connection.cjs');

const read = file => fs.readFileSync(file, 'utf8');
const folder = 'docs/verification/booking-recurring-shifts';
const adminStyles = ['pages/admin/admin.css', 'pages/admin/admin-components.css', 'pages/admin/admin-typography.css'];

async function mount(browser, markup, styles) {
 const page = await browser.newPage({viewport:{width:1280,height:1000},locale:'vi-VN',timezoneId:'Asia/Bangkok'});
 await page.route('http://localhost/', route => route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="vi"><meta charset="utf-8"><body></body></html>'}));
 await page.goto('http://localhost/');
 await page.setContent(markup);
 for (const file of styles) await page.addStyleTag({content:read(file)});
 return page;
}

async function main() {
 const db = await connect();
 let browser;
 try {
  await db.query("BEGIN; SET LOCAL statement_timeout='20s'");
  if (process.argv.includes('--preflight')) {
   await db.query(read('scripts/database/v1/287_staff_recurring_shift_generation.sql').replace(/^BEGIN;/,'').replace(/COMMIT;\s*$/,''));
  }
  const rows = async (sql, values) => (await db.query(sql,values)).rows;
  const actor = async uid => {
   await db.query('RESET ROLE');
   await db.query("SELECT set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role','authenticated',true)",[uid]);
   await db.query('SET LOCAL ROLE authenticated');
  };
  const role = async code => (await rows(`SELECT s.auth_user_id FROM public.staff s JOIN public.staff_role r ON r.staff_id=s.id
   JOIN auth.users u ON u.id=s.auth_user_id WHERE r.role_code=$1 AND s.employment_status='active' AND NOT s.must_change_password
   AND coalesce(u.banned_until<=now(),true) ORDER BY s.id LIMIT 1`,[code]))[0].auth_user_id;
  const admin = await role('ADMIN');
  const employee = await role('STAFF');
  const day = '2026-11-27';
  const pairs = (await rows(`SELECT DISTINCT ON (ps.species_name) p.id pet_id,c.id customer_id,c.auth_user_id,ps.id species_id,ps.species_name,
    svc.id service_id,svc.service_name,svc.estimated_duration,w.weight
   FROM public.pet_profile p JOIN public.customer c ON c.id=p.customer_id JOIN public.pet_breed b ON b.id=p.breed_id
   JOIN public.pet_species ps ON ps.id=b.species_id JOIN public.service_supported_species ss ON ss.species_id=ps.id
   JOIN public.service svc ON svc.id=ss.service_id JOIN public.service_category cat ON cat.id=svc.category_id
   LEFT JOIN public.pet_current_weight w ON w.pet_id=p.id
   WHERE p.status='active' AND c.customer_status='active' AND c.auth_user_id IS NOT NULL
   AND svc.status='active' AND cat.category_code='grooming_spa'
   AND ((ps.species_name='Chó' AND svc.service_name='Gói Tắm Vệ Sinh Cơ Bản')
   OR (ps.species_name='Mèo' AND svc.service_name='Cắt Grooming Chuyên Biệt Mèo'))
   ORDER BY ps.species_name,w.weight NULLS LAST,p.id`));
  assert.equal(pairs.length,2);
  async function customerSlots(pair, date) {
   await actor(pair.auth_user_id);
   return (await rows('SELECT public.own_booking_day_slots($1,$2) value',
    [{pet_id:pair.pet_id,service_id:pair.service_id,addon_ids:[]},date]))[0].value;
  }
  async function staffSlots(pair,date) {
   await actor(employee);
   return (await rows('SELECT public.get_staff_booking_slots($1,$2,$3,$4) value',
    [pair.customer_id,pair.pet_id,pair.service_id,date]))[0].value;
  }
  for (const pair of pairs) {
   pair.customer = await customerSlots(pair,day);
   pair.employee = await staffSlots(pair,day);
   assert.ok(pair.customer.slots.some(slot=>slot.available && slot.staff.length));
   assert.ok(pair.employee.slots.length);
  }

  await db.query('RESET ROLE');
  const [coverage] = await rows(`SELECT count(*)::int total,
   count(*) FILTER (WHERE (start_at AT TIME ZONE 'Asia/Bangkok')::date=$1)::int on_day,
   count(DISTINCT (start_at AT TIME ZONE 'Asia/Bangkok')::date) FILTER (
    WHERE (start_at AT TIME ZONE 'Asia/Bangkok')::date BETWEEN $1::date AND $1::date+29)::int days_in_range
   FROM public.staff_schedule WHERE recurring_schedule_id IS NOT NULL`,[day]);
  assert.equal(coverage.days_in_range,30);
  assert.ok(coverage.on_day>0);
  const before = (await rows('SELECT id FROM public.staff_schedule WHERE recurring_schedule_id IS NOT NULL ORDER BY id')).map(row=>row.id);
  await db.query('SELECT pawpal_private.sync_staff_recurring_shifts()');
  assert.deepEqual((await rows('SELECT id FROM public.staff_schedule WHERE recurring_schedule_id IS NOT NULL ORDER BY id')).map(row=>row.id),before);
  await db.query('SAVEPOINT overrides');
  const [shift] = await rows(`SELECT id,staff_id,start_at,end_at,recurring_schedule_id FROM public.staff_schedule
   WHERE recurring_schedule_id IS NOT NULL AND (start_at AT TIME ZONE 'Asia/Bangkok')::date=$1
   AND NOT pawpal_private.recurring_shift_has_booking(staff_id,start_at,end_at) LIMIT 1`,[day]);
  await actor(admin);
  const replacement = randomUUID();
  await db.query('SELECT public.save_admin_staff_schedule($1,$1,NULL,$2)',[replacement,{
   staff_id:shift.staff_id,start_at:shift.start_at,end_at:shift.end_at,availability_status:'leave',schedule_status:'active',reason:'QA'
  }]);
  await db.query('RESET ROLE');
  await db.query('SELECT pawpal_private.sync_staff_recurring_shifts()');
  assert.ok((await rows("SELECT 1 FROM public.staff_schedule WHERE id=$1 AND availability_status='leave'",[replacement])).length);
  assert.equal((await rows('SELECT 1 FROM public.staff_schedule WHERE id=$1',[shift.id])).length,0);
  await db.query('ROLLBACK TO SAVEPOINT overrides');

  await db.query('SAVEPOINT booked_shift');
  await db.query(`INSERT INTO public.appointment(id,appointment_code,customer_id,pet_id,staff_id,scheduled_start_at,scheduled_end_at,appointment_status)
   VALUES($1,$2,$3,$4,$5,$6,$6::timestamptz+interval '30 minutes','confirmed')`,
  [randomUUID(),'QA-'+randomUUID(),pairs[0].customer_id,pairs[0].pet_id,shift.staff_id,shift.start_at]);
  await db.query("UPDATE public.staff_recurring_schedule SET is_active=false WHERE id=$1",[shift.recurring_schedule_id]);
  assert.ok((await rows('SELECT 1 FROM public.staff_schedule WHERE id=$1',[shift.id])).length);
  assert.equal((await rows(`SELECT 1 FROM public.staff_schedule WHERE recurring_schedule_id=$1 AND start_at>$2
   AND NOT pawpal_private.recurring_shift_has_booking(staff_id,start_at,end_at)`,[shift.recurring_schedule_id,shift.start_at])).length,0);
  await db.query('ROLLBACK TO SAVEPOINT booked_shift');

  await db.query('SAVEPOINT no_shifts');
  await db.query(`DELETE FROM public.staff_schedule WHERE (start_at AT TIME ZONE 'Asia/Bangkok')::date=$1
   AND NOT pawpal_private.recurring_shift_has_booking(staff_id,start_at,end_at)`,[day]);
  const empty = await customerSlots(pairs[0],day);
  assert.ok(empty.slots.some(slot=>slot.reason==='no_scheduled_staff'));
  assert.ok(empty.slots.every(slot=>!slot.available));
  assert.equal((await staffSlots(pairs[0],day)).slots.length,0);
  await db.query('ROLLBACK TO SAVEPOINT no_shifts');

  const result = {coverage,scenarios:pairs.map(pair=>({
   species:pair.species_name,service:pair.service_name,
   customer:pair.customer.slots.filter(slot=>slot.available).length,employee:pair.employee.slots.length
  })),manualLeave:'pass',bookedShift:'pass',emptyReason:'pass',idempotence:'pass'};
  console.log(JSON.stringify(result));
  if (process.argv.includes('--preflight')) return;
  fs.mkdirSync(folder,{recursive:true});
  browser = await chromium.launch({channel:'chrome',headless:true});
  await captureCustomer(browser,pairs,empty,day);
  await captureEmployee(browser,pairs[1],day);

  await actor(admin);
  const schedules = (await rows(`SELECT to_jsonb(r) AS value,s.full_name FROM public.staff_recurring_schedule r
   JOIN public.staff s ON s.id=r.staff_id ORDER BY s.full_name,r.id LIMIT 10`));
  const data = schedules.map(row=>row.value);
  const coverageRows = await rows('SELECT recurring_schedule_id,generated_through::text FROM public.staff_recurring_shift_coverage($1)',[data.map(row=>row.id)]);
  const roster = await mount(browser,'<!doctype html><html lang="vi"><body class="admin-body"><main style="padding:24px"><div class="staff-module admin-ui-standard"><section id="recurring" class="staff-recurring-panel"></section></div></main></body></html>',
   [...adminStyles,'pages/admin/modules/staff/staff.css']);
  await roster.addScriptTag({content:read('pages/admin/modules/staff/staff-recurring.mjs').replace('export async function','async function')});
  await roster.evaluate(async ({data,coverageRows,staff})=>{
   const q={select:()=>q,order:()=>q,range:async()=>({data,count:data.length})};
   await mountRecurringSchedule(document.querySelector('#recurring'),{staff,client:{from:()=>q,rpc:async()=>({data:coverageRows})}});
  },{data,coverageRows,staff:schedules.map(row=>({rawId:row.value.staff_id,name:row.full_name,status:'ACTIVE'}))});
  assert.ok(await roster.getByRole('columnheader',{name:'Ca tự tạo đến'}).isVisible());
  assert.ok(coverageRows.length>0);
  await roster.locator('.staff-recurring-list').screenshot({path:folder+'/admin-lich-dinh-ky.png'});
  fs.writeFileSync(folder+'/verification.txt',JSON.stringify({
   day,result,scope:'Local browser components with results from live Supabase RPCs. Simulated leave, booking and empty-roster changes rolled back.'
  },null,2)+'\n');
 } finally {
  await db.query('ROLLBACK').catch(()=>{});
  await db.end();
  await browser?.close();
 }
}

async function captureCustomer(browser,pairs,empty,day) {
 const page = await mount(browser,read('pages/services/booking/booking.html').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''),
  ['node_modules/bootstrap/dist/css/bootstrap.min.css','pages/services/booking/booking.css']);
 const booking = read('pages/services/booking/booking.js').replace(/^import .*;\r?\n/gm,'');
 await page.addStyleTag({content:read('styles/style.css').replace(/@import[^;]+;/g,'')});
 await page.addScriptTag({content:read('pages/services/booking/booking-staff-slots.mjs').replace('export function','function')});
 await page.addScriptTag({content:`const vietnamDateTimeInput=value=>new Date(+new Date(value)+25200000).toISOString().slice(0,16);
  const parseVietnamDateTimeInput=value=>value?new Date(value+':00+07:00'):null;
  class GuestCommerceError extends Error {}
  ${booking.slice(0,booking.lastIndexOf("if(document.readyState==='loading')"))}
  window.openProof=({pair,result,day})=>{
   const root=document.querySelector('.booking-main');root.classList.remove('booking-loading');root.classList.add('booking-live-form');
   state.pet={id:pair.pet_id,name:'Bé '+pair.species_name.toLowerCase(),species:pair.species_name,weight:pair.weight};
   state.service={id:pair.service_id,name:pair.service_name,category:'grooming_spa'};
   state.profile={name:'Khách kiểm thử',phone:'0900000000'};
   db={rpc:async name=>{if(name!=='own_booking_day_slots')throw Error('unexpected RPC');return {data:result};}};
   renderSchedule();show(3);el('bookingDay').value=day;
  };`});
 for (const [index,pair] of pairs.entries()) {
  await page.evaluate(args=>openProof(args),{pair,result:pair.customer,day});
  await page.locator('#bookingCheckSlots').click();
  await page.locator('#bookingDaySlots [data-slot]').first().waitFor();
  assert.match(await page.locator('#bookingAvailabilityMessage').innerText(),/khung giờ khả dụng/);
  await page.locator('#step3').screenshot({path:folder+`/khach-${index===0?'cho':'meo'}.png`});
 }
 await page.evaluate(args=>openProof(args),{pair:pairs[0],result:empty,day});
 await page.locator('#bookingCheckSlots').click();
 assert.match(await page.locator('#bookingAvailabilityMessage').innerText(),/chưa có nhân viên được phân ca/);
 assert.equal(await page.locator('#bookingStaffPreferences').isVisible(),false);
 await page.locator('#step3').screenshot({path:folder+'/khach-thieu-ca.png'});
}

async function captureEmployee(browser,pair,day) {
 const page = await mount(browser,'<!doctype html><html lang="vi"><body class="admin-body admin-ui-standard"></body></html>',adminStyles);
 const source = read('pages/admin/modules/services/services.js');
 const mark = source.indexOf('    const instant = value');
 await page.addScriptTag({content:source.slice(source.lastIndexOf('(function () {',mark),source.indexOf('})();',source.indexOf('window.PawpalStaffBooking=',mark))+5)});
 await page.evaluate(pair=>{
  window.PawpalAdminAccess={isStaff:()=>true,state:{user:{permissions:['work.booking.create']}}};
  window.getSupabaseClient=()=>({rpc:async(name,args)=>{
   if (name==='get_staff_booking_slots') return {data:pair.employee};
   if (name==='get_staff_booking_services') return {data:{items:[{id:pair.service_id,service_name:pair.service_name,estimated_duration:pair.estimated_duration,category_code:'grooming_spa',species_ids:[pair.species_id]}]}};
   if (name==='get_staff_booking_catalog') return {data:{items:[]}};
   if (name==='get_staff_workspace') return {data:{items:args.p_kind==='customers'?
    [{id:pair.customer_id,full_name:'Khách kiểm thử',customer_code:'QA'}]:
    [{id:pair.pet_id,customer_id:pair.customer_id,pet_name:'Bé '+pair.species_name.toLowerCase(),pet_code:'QA',pet_species_id:pair.species_id,current_weight:pair.weight}]}};
   throw Error('Unexpected RPC');
  }});
  PawpalStaffBooking.open();
 },pair);
 await page.locator('#staffBookingcustomer').fill('Khách kiểm thử');
 await page.locator('#staffBookingcustomerOptions [role=option]').first().click();
 await page.waitForFunction(()=>document.querySelector('#staffBookingpet').readOnly);
 await page.locator('#staffBookingservice').fill(pair.service_name);
 await page.locator('#staffBookingserviceOptions [role=option]').first().click();
 await page.locator('#staffBookingday').fill(day);
 await page.locator('#staffBookingday').dispatchEvent('change');
 const slots = page.locator('#staffBookingslot');
 await page.waitForFunction(()=>document.querySelector('#staffBookingslot').options.length>1);
 assert.equal(await slots.locator('option').count(),pair.employee.slots.length+1);
 await slots.selectOption({label:pair.employee.slots[0].label});
 await page.locator('#staffBookingday').blur();
 await page.locator('#staffBookingModal .admin-modal-card').screenshot({path:folder+'/nhan-vien-khung-gio.png'});
}

main().catch(error=>{console.error(error);process.exitCode=1;});
