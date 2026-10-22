const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { admin, service, ok, browserPage, infra, env } = require('./customer_completion_helpers.cjs');
(async () => {
 const { browser, page } = await browserPage();
 const ids = [];
 try {
  const customers = await ok(service.from('customer').select('id').limit(2));
  const appointment = (await ok(service.from('appointment').select('id,customer_id').limit(1)))[0];
  const id = randomUUID(); ids.push(id);
  const args = { p_id: id, p_customer_id: appointment.customer_id, p_order_id: null,
   p_appointment_id: appointment.id, p_category: 'service', p_subject: 'Verification complaint', p_content: 'Verification intake', p_priority: 'normal' };
  const anonymous = await fetch('http://localhost:8011/rpc/create_admin_complaint',{method:'POST',headers:{Authorization:'Bearer '+env.ANON_KEY,'Content-Type':'application/json'},body:JSON.stringify(args)});
  assert.ok([401,403].includes(anonymous.status));
  const replies = await Promise.all([admin.rpc('create_admin_complaint',args),admin.rpc('create_admin_complaint',args)]);
  for (const reply of replies) assert.equal(await ok(reply),id);
  assert.equal((await ok(service.from('support_ticket_message').select('id').eq('ticket_id',id))).length,1);
  assert.equal((await ok(service.from('audit_log').select('id').eq('entity_id',id))).length,1);
  assert.equal((await admin.rpc('create_admin_complaint',{...args,p_subject:'Changed payload'})).error?.code,'PT409');
  const invalid = randomUUID(); ids.push(invalid);
  const other = customers.find(c=>c.id!==appointment.customer_id);
  assert.equal((await admin.rpc('create_admin_complaint',{...args,p_id:invalid,p_customer_id:other.id})).error?.code,'22023');
  assert.equal((await ok(service.from('support_ticket').select('id').eq('id',invalid))).length,0);
  await page.locator('[data-title="Khiếu nại"]').click();
  await page.waitForFunction(()=>window.PawpalComplaints?.state.isLoaded);
  await page.locator('#btnOpenCreateServiceTicket').click();
  await page.locator('#inputTicketCustomerName').click();
  const item = page.locator('#ticketCustomerNameDropdown .customer-autocomplete-item').first();
  await item.click();
  await page.locator('#chkTicketUnverified').check();
  await page.locator('#inputTicketTitle').fill('Browser intake verification');
  await page.locator('#inputTicketContent').fill('Browser intake content');
  const requestId = await page.locator('#createTicketModalOverlay').getAttribute('data-request-id'); ids.push(requestId);
  await page.screenshot({path:infra+'/complaint-create-modal.private.png'});
  await page.locator('#btnSaveCreateTicket').click();
  await page.waitForFunction(()=>!document.getElementById('createTicketModalOverlay').classList.contains('active'));
  assert.equal((await ok(service.from('support_ticket').select('id').eq('id',requestId))).length,1);
  await page.locator('#btnOpenCreateServiceTicket').click();
  await page.keyboard.press('Escape');
  await page.waitForFunction(()=>!document.getElementById('createTicketModalOverlay').classList.contains('active'));
  console.log('PASS: atomic creation, duplicate replay, payload conflict, ownership rejection, browser save and Escape.');
 } finally {
  await browser.close();
  for(const id of ids.filter(Boolean)) {
   await ok(service.from('support_ticket_message').delete().eq('ticket_id',id));
   // Audit is append-only, including on the isolated verification database.
   await ok(service.from('support_ticket').delete().eq('id',id));
  }
 }
})().catch(e=>{console.error(e.message);process.exitCode=1});
