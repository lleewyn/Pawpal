const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {createClient}=require('@supabase/supabase-js');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const infra='D:/Aboutme/Pawpal-infra/supabase-local';
const env=require('dotenv').parse(fs.readFileSync(infra+'/.env'));
if(env.SUPABASE_PUBLIC_URL!=='http://localhost:8000')throw Error('Local-only verification');
const credentials=fs.readFileSync(infra+'/PAWPAL-ADMIN.private.txt','utf8');
const account={email:credentials.match(/^Email: (.+)$/m)[1],password:credentials.match(/^Password: (.+)$/m)[1]};
const options={auth:{persistSession:false,autoRefreshToken:false}};
const service=createClient(env.SUPABASE_PUBLIC_URL,env.SERVICE_ROLE_KEY,options),admin=createClient(env.SUPABASE_PUBLIC_URL,env.ANON_KEY,options);
const customers=[],authIds=[];
async function ok(request){const r=await request;if(r.error)throw Error(r.error.message);return r.data;}
function phone(){return '09'+String(crypto.randomInt(0,100000000)).padStart(8,'0');}
async function params(id){
 const [c,p,ph,m]=await Promise.all([ok(service.from('customer').select('updated_at,contact_email').eq('id',id).single()),ok(service.from('customer_profile').select('full_name,gender,date_of_birth').eq('customer_id',id).single()),ok(service.from('customer_phone').select('phone_number').eq('customer_id',id).eq('is_primary',true).single()),ok(service.from('customer_membership').select('membership_tier_id').eq('customer_id',id).maybeSingle())]);
 return {p_customer_id:id,p_expected_updated_at:c.updated_at,p_full_name:p.full_name,p_phone:ph.phone_number,p_email:c.contact_email,p_gender:p.gender,p_date_of_birth:p.date_of_birth,p_tier_id:m?.membership_tier_id||null,p_addresses:null};
}
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  await ok(admin.auth.signInWithPassword(account));
  const primary=phone(),otherPhone=phone();
  const first=await ok(admin.rpc('create_customer_quick',{p_full_name:'Profile verification original',p_phone:primary,p_address:'Original street',p_province:'Original province'}));customers.push(first);
  const second=await ok(admin.rpc('create_customer_quick',{p_full_name:'Other profile verification',p_phone:otherPhone,p_address:'Other street',p_province:'Other province'}));customers.push(second);
  const originalAddress=await ok(service.from('customer_address').select('*').eq('customer_id',first).single());
  await ok(service.from('customer_address').update({receiver_name:'Independent receiver',postal_code:'70000'}).eq('id',originalAddress.id));
  const secondary=await ok(service.from('customer_address').insert({customer_id:first,receiver_name:'Second receiver',receiver_phone:primary,street_address:'Second street',province:'Second province',is_default:false}).select('id').single());
  const fixtureEmail='profile-check-'+crypto.randomUUID()+'@pawpal.test',fixturePassword=crypto.randomBytes(24).toString('base64url');
  const auth=await ok(service.auth.admin.createUser({email:fixtureEmail,password:fixturePassword,email_confirm:true}));authIds.push(auth.user.id);
  await ok(service.from('customer').update({auth_user_id:auth.user.id}).eq('id',first));
  const page=await browser.newPage({viewport:{width:1440,height:1100}}),calls=[],cloud=[];
  page.on('request',r=>{if(r.url().includes('/rpc/update_customer_profile'))calls.push(r.method());if(new URL(r.url()).hostname.endsWith('.supabase.co'))cloud.push('cloud');});
  await page.goto('http://localhost:3001/admin/login');await page.locator('#inputAdminEmail').fill(account.email);await page.locator('#inputAdminPassword').fill(account.password);await page.locator('#btnSubmitAdminLogin').click();
  await page.waitForFunction(()=>window.PawpalCustomers?.state.listLoadStatus==='loaded');
  async function open(){await page.evaluate(id=>{const c=Object.values(window.PawpalCustomers.state.customerDatabase).find(c=>c.dbId===id);window.PawpalCustomers.subtabs.profile.openEditCustomerModal(c.id);},first);}
  const modal=page.locator('#modalEditCustomer');
  await open();assert.equal(await page.locator('#editCustGender').inputValue(),'');
  assert.equal(await page.locator('#editCustDob').inputValue(),'');
  await page.locator('#editCustFullName').fill(' ');await page.locator('#btnSubmitEditCustomer').click();
  await page.locator('#editCustFullNameError').filter({hasText:/2/}).waitFor();assert.equal(calls.length,0);
  await page.locator('#btnCloseEditCustomer').click();await modal.waitFor({state:'hidden'});
  await open();await page.locator('#btnCancelEditCustomer').click();await modal.waitFor({state:'hidden'});
  await open();await page.keyboard.press('Escape');await modal.waitFor({state:'hidden'});
  await open();await modal.click({position:{x:5,y:5}});await modal.waitFor({state:'hidden'});
  console.log('PASS original null gender/DOB, inline validation, all four modal close methods');
  await open();await page.locator('#editCustFullName').fill('Profile verification changed');
  const newPhone=phone();await page.locator('#editCustPhone').fill(newPhone);await page.locator('#editCustEmail').fill('contact-check@example.test');
  const tiers=await ok(service.from('membership_tier').select('id').eq('is_active',true).order('minimum_expenditure',{ascending:false}));
  await page.locator('#editCustTier').selectOption(tiers[0].id);
  await page.locator('#btnAddAddressItem').click();
  const newCard=page.locator('#editCustAddressList .address-row-card').last();
  await newCard.locator('[data-field="receiverName"]').fill('Third receiver');
  await newCard.locator('[data-field="streetAddress"]').fill('Third street');
  await page.locator('#btnSubmitEditCustomer').click();await newCard.locator('.edit-address-error').filter({hasText:/tỉnh/}).waitFor();assert.equal(calls.length,0);
  await newCard.locator('[data-field="province"]').fill('Third province');
  await newCard.locator('[type="radio"]').check();
  await page.screenshot({path:infra+'/verification/v1-customer-edit-form.png',fullPage:true});
  await page.evaluate(()=>{const b=document.getElementById('btnSubmitEditCustomer');b.click();b.click();});await modal.waitFor({state:'hidden'});
  assert.equal(calls.length,1);
  const after=await ok(service.from('customer_address').select('*').eq('customer_id',first));assert.equal(after.length,3);
  assert.equal(after.filter(a=>a.is_default).length,1);assert.equal(after.find(a=>a.is_default).street_address,'Third street');
  assert.equal(after.find(a=>a.id===originalAddress.id).receiver_name,'Independent receiver');assert.equal(after.find(a=>a.id===originalAddress.id).postal_code,'70000');assert(after.some(a=>a.id===secondary.id));
  const saved=await params(first);assert.equal(saved.p_phone,newPhone);assert.equal(saved.p_tier_id,tiers[0].id);assert.equal(saved.p_email,'contact-check@example.test');assert.equal(saved.p_gender,null);
  const points=await ok(service.from('customer_point_balance').select('total_paw_points').eq('customer_id',first).single());assert.equal(Number(points.total_paw_points),0);
  assert.equal((await ok(service.auth.admin.getUserById(auth.user.id))).user.email,fixtureEmail);
  console.log('PASS atomic save, preserved address IDs/receivers/postal codes, one default, tier does not award points, contact email does not alter Auth');
  const foreign=await ok(service.from('customer_address').select('id').eq('customer_id',second).single());
  let request=await params(first);
  const bad=await admin.rpc('update_customer_profile',{...request,p_full_name:'Must roll back',p_addresses:[{id:foreign.id,receiver_name:'Wrong owner',receiver_phone:primary,street_address:'Wrong street',province:'Wrong province',is_default:true}]});assert.equal(bad.error?.code,'42501');
  assert.equal((await params(first)).p_full_name,'Profile verification changed');
  assert((await admin.rpc('update_customer_profile',{...await params(first),p_phone:otherPhone})).error?.message.includes('customer_phone_exists'));
  request=await params(first);
  const concurrent=await Promise.all([admin.rpc('update_customer_profile',{...request,p_full_name:'Concurrent profile one'}),admin.rpc('update_customer_profile',{...request,p_full_name:'Concurrent profile two'})]);
  assert.equal(concurrent.filter(r=>!r.error).length,1);assert.equal(concurrent.find(r=>r.error).error.code,'PT409');
  console.log('PASS foreign address ownership and duplicate phone rejected; concurrent stale edit rejected');
  await ok(admin.rpc('update_customer_profile',{...await params(first),p_addresses:[]}));
  assert.equal((await ok(service.from('customer_address').select('id').eq('customer_id',first))).length,0);
  await ok(admin.rpc('update_customer_profile',{...await params(first),p_full_name:'Profile without address'}));
  console.log('PASS empty address book can be saved and subsequently edited');
  await page.evaluate(()=>window.PawpalCustomers.loadCustomersModuleData({force:true}));await open();
  request=await params(first);await ok(admin.rpc('update_customer_profile',{...request,p_full_name:'External profile update'}));
  await page.locator('#editCustFullName').fill('Stale browser edit');await page.locator('#btnSubmitEditCustomer').click();
  await page.locator('#adminGlobalToast').filter({hasText:/Hồ sơ đã được cập nhật/}).waitFor();await modal.waitFor({state:'visible'});
  assert.equal((await params(first)).p_full_name,'External profile update');
  const outsider=createClient(env.SUPABASE_PUBLIC_URL,env.ANON_KEY,options);await ok(outsider.auth.signInWithPassword({email:fixtureEmail,password:fixturePassword}));
  assert.equal((await outsider.rpc('update_customer_profile',await params(first))).error?.code,'42501');
  const anon=createClient(env.SUPABASE_PUBLIC_URL,env.ANON_KEY,options);assert((await anon.rpc('update_customer_profile',await params(first))).error);
  assert.deepEqual(cloud,[]);console.log('PASS browser stale-edit warning and non-staff/anonymous rejection');
 }finally{
  await browser.close();
  for(const id of customers){for(const table of ['customer_address','customer_membership','customer_phone','customer_profile'])await ok(service.from(table).delete().eq('customer_id',id));await ok(service.from('customer').delete().eq('id',id));}
  for(const id of authIds)await ok(service.auth.admin.deleteUser(id));
  console.log('PASS temporary customer/Auth records removed; immutable audit entries retained as verification history');
 }
})().catch(e=>{console.error(e.message);process.exitCode=1;});
