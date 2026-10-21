const fs = require('node:fs'), crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { createClient } = require('@supabase/supabase-js');
const { chromium } = require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const infra = 'D:/Aboutme/Pawpal-infra/supabase-local';
const env = require('dotenv').parse(fs.readFileSync(infra + '/.env'));
if (env.SUPABASE_PUBLIC_URL !== 'http://localhost:8000') throw Error('Local-only verification');
const credentials = fs.readFileSync(infra + '/PAWPAL-ADMIN.private.txt', 'utf8');
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const service = createClient(env.SUPABASE_PUBLIC_URL, env.SERVICE_ROLE_KEY, options);
const admin = createClient(env.SUPABASE_PUBLIC_URL, env.ANON_KEY, options);
const anon = createClient(env.SUPABASE_PUBLIC_URL, env.ANON_KEY, options);
const phones = [], identities = [];
async function ok(request) { const r = await request; if (r.error) throw Error(r.error.message); return r.data; }
function phone() { const value = '09' + String(crypto.randomInt(0, 100000000)).padStart(8, '0'); phones.push(value); return value; }
(async () => {
 const browser = await chromium.launch({ channel: 'chrome', headless: true });
 try {
  const baseline = await ok(service.from('customer').select('id'));
  const account = { email: credentials.match(/^Email: (.+)$/m)[1], password: credentials.match(/^Password: (.+)$/m)[1] };
  await ok(admin.auth.signInWithPassword(account));
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const cloud = [], rpcCalls = [];
  page.on('request', r => {
   if (new URL(r.url()).hostname.endsWith('.supabase.co')) cloud.push('unexpected cloud');
   if (r.url().includes('/rpc/create_customer_quick')) rpcCalls.push(r.method());
  });
  await page.goto('http://localhost:3001/admin/login');
  await page.locator('#inputAdminEmail').fill(account.email);
  await page.locator('#inputAdminPassword').fill(account.password);
  await page.locator('#btnSubmitAdminLogin').click();
  await page.waitForFunction(() => window.PawpalCustomers?.state.listLoadStatus === 'loaded');
  const modal = page.locator('#modalAddCustomer');
  await page.locator('#btnOpenAddCustomerModal').click();
  await page.locator('#btnSubmitAddCustomer').click();
  await page.locator('#quickAddNameError').filter({ hasText: /2/ }).waitFor();
  assert.equal(rpcCalls.length, 0);
  await page.locator('#btnCloseAddCustomer').click(); await modal.waitFor({ state: 'hidden' });
  await page.locator('#btnOpenAddCustomerModal').click(); await page.locator('#btnCancelAddCustomer').click(); await modal.waitFor({ state: 'hidden' });
  await page.locator('#btnOpenAddCustomerModal').click(); await page.keyboard.press('Escape'); await modal.waitFor({ state: 'hidden' });
  await page.locator('#btnOpenAddCustomerModal').click(); await modal.click({ position: { x: 5, y: 5 } }); await modal.waitFor({ state: 'hidden' });
  console.log('PASS inline validation and all four modal close methods');
  const minimalPhone = phone();
  await page.locator('#btnOpenAddCustomerModal').click();
  await page.locator('#quickAddName').fill('V1 intake verification');
  await page.locator('#quickAddPhone').fill(minimalPhone);
  await page.evaluate(() => { const b = document.getElementById('btnSubmitAddCustomer'); b.click(); b.click(); });
  await modal.waitFor({ state: 'hidden' });
  const minimalRow = await ok(service.from('customer_phone').select('customer_id').eq('phone_number', minimalPhone).single());
  const minimal = await ok(service.from('customer').select('contact_email,auth_user_id').eq('id', minimalRow.customer_id).single());
  assert.equal(minimal.contact_email, null); assert.equal(minimal.auth_user_id, null);
  assert.equal((await ok(service.from('customer_address').select('id').eq('customer_id', minimalRow.customer_id))).length, 0);
  assert.equal((await ok(service.from('customer_point_balance').select('total_paw_points').eq('customer_id', minimalRow.customer_id).single())).total_paw_points, 0);
  assert.equal(rpcCalls.length, 1);
  console.log('PASS double-click creates one customer; email/Auth remain null, zero points, no invented address');
  await page.waitForFunction(() => window.PawpalCustomers.state.listLoadStatus === 'loaded');
  const fullPhone = phone();
  const breed = (await ok(service.from('pet_breed').select('id,breed_name,species:species_id(id,species_name)').eq('is_active', true).order('breed_name'))).find(b => b.species && b.breed_name && !/chưa|unknown/i.test(b.breed_name));
  assert(breed);
  await page.locator('#btnOpenAddCustomerModal').click();
  await page.locator('#quickAddName').fill('V1 pet intake verification');
  await page.locator('#quickAddPhone').fill(fullPhone);
  await page.locator('#quickAddPetName').fill('V1 verification pet');
  await page.locator('#quickAddPetSpecies').fill(breed.species.species_name);
  await page.locator(`#quickAddPetSpeciesDropdown [data-id="${breed.species.id}"]`).click();
  await page.locator('#quickAddPetBreed').fill(breed.breed_name);
  await page.locator(`#quickAddPetBreedDropdown [data-id="${breed.id}"]`).click();
  await page.locator('#quickAddPetWeight').fill('4.5');
  await page.locator('#quickAddAddress').fill('Verification address');
  await page.locator('#btnSubmitAddCustomer').click();
  await page.locator('#quickAddProvinceError').filter({ hasText: /tỉnh/ }).waitFor();
  assert.equal(rpcCalls.length, 1);
  await page.locator('#quickAddProvince').fill('Verification province');
  await page.screenshot({ path: infra + '/verification/v1-customer-add-form.png', fullPage: true });
  await page.locator('#btnSubmitAddCustomer').click(); await modal.waitFor({ state: 'hidden' });
  const full = await ok(service.from('customer_phone').select('customer_id').eq('phone_number', fullPhone).single());
  const pet = await ok(service.from('pet_profile').select('id,breed_id').eq('customer_id', full.customer_id).single());
  assert.equal(pet.breed_id, breed.id);
  const weight = await ok(service.from('pet_weight_history').select('weight,recorded_by').eq('pet_id', pet.id).single());
  assert.equal(Number(weight.weight), 4.5); assert(weight.recorded_by);
  const address = await ok(service.from('customer_address').select('province,is_default').eq('customer_id', full.customer_id).single());
  assert.equal(address.province, 'Verification province'); assert.equal(address.is_default, true);
  console.log('PASS real catalog autocomplete, conditional address validation, atomic pet and weight intake');
  const params = { p_full_name: 'Concurrent intake verification', p_phone: phone() };
  const concurrent = await Promise.all([admin.rpc('create_customer_quick', params), admin.rpc('create_customer_quick', params)]);
  assert.equal(concurrent.filter(r => !r.error).length, 1);
  assert(concurrent.find(r => r.error).error.message.includes('customer_phone_exists'));
  assert((await anon.rpc('create_customer_quick', { p_full_name: 'Denied intake', p_phone: phone() })).error);
  const email = 'intake-check-' + crypto.randomUUID() + '@pawpal.test', password = crypto.randomBytes(24).toString('base64url');
  const user = await ok(service.auth.admin.createUser({ email, password, email_confirm: true })); identities.push(user.user.id);
  const outsider = createClient(env.SUPABASE_PUBLIC_URL, env.ANON_KEY, options);
  await ok(outsider.auth.signInWithPassword({ email, password }));
  assert.equal((await outsider.rpc('create_customer_quick', { p_full_name: 'Denied intake', p_phone: phone() })).error?.code, '42501');
  console.log('PASS duplicate concurrent calls serialize; anonymous and authenticated non-staff callers denied');
  assert.deepEqual(cloud, []);
  // Save baseline for the final cleanup assertion.
  global.intakeBaseline = baseline.length;
 } finally {
  await browser.close();
  for (const value of phones) {
   const rows = await ok(service.from('customer_phone').select('customer_id').eq('phone_number', value));
   for (const row of rows) {
    const pets = await ok(service.from('pet_profile').select('id').eq('customer_id', row.customer_id));
    for (const pet of pets) await ok(service.from('pet_weight_history').delete().eq('pet_id', pet.id));
    await ok(service.from('pet_profile').delete().eq('customer_id', row.customer_id));
    for (const table of ['customer_address', 'customer_membership', 'customer_phone', 'customer_profile']) await ok(service.from(table).delete().eq('customer_id', row.customer_id));
    await ok(service.from('customer').delete().eq('id', row.customer_id));
   }
  }
  for (const id of identities) await ok(service.auth.admin.deleteUser(id));
  const remaining = await ok(service.from('customer').select('id'));
  if (global.intakeBaseline !== undefined) assert.equal(remaining.length, global.intakeBaseline);
  console.log('PASS verification identities and business rows removed');
 }
})().catch(e => { console.error(e.message); process.exitCode = 1; });
