const assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs');const h=require('./customer_completion_helpers.cjs');
(async()=>{const {browser,page}=await h.browserPage();try{
 const c=await h.customer('=Customer export verification');
 const breed=(await h.ok(h.service.from('pet_breed').select('id').eq('is_active',true).limit(1)))[0],petId=crypto.randomUUID();
 await h.ok(h.admin.rpc('add_customer_pet',{p_customer_id:c.id,p_pet_id:petId,p_name:'History pet',p_breed_id:breed.id,p_weight:null,p_safety_note:null,p_allergy:null,p_routine:null}));
 const variant=(await h.ok(h.service.from('product_variant').select('id').limit(1)))[0];
 const orders=Array.from({length:12},()=>({id:crypto.randomUUID(),order_code:'CHECK-'+crypto.randomUUID(),customer_id:c.id,order_status:'draft'}));
 await h.ok(h.service.from('sales_order').insert(orders));
 await h.ok(h.service.from('sales_order_detail').insert(orders.map(o=>({order_id:o.id,product_variant_id:variant.id,quantity:1,unit_price:100,discount_amount:0,product_name_snapshot:'Verification item',sku_snapshot:'VERIFICATION'}))));
 const start=Date.now()+86400000;
 await h.ok(h.service.from('appointment').insert(Array.from({length:12},(_,i)=>({appointment_code:'CHECK-'+crypto.randomUUID(),customer_id:c.id,pet_id:petId,scheduled_start_at:new Date(start+i*3600000).toISOString(),scheduled_end_at:new Date(start+i*3600000+1800000).toISOString(),appointment_status:'pending'}))));
 await h.ok(h.service.from('support_ticket').insert(Array.from({length:12},(_,i)=>({ticket_code:'CHECK-'+crypto.randomUUID(),customer_id:c.id,channel:'web',category:'general',subject:i===0?'<img src=x onerror="window.customerXss=1">':'Verification subject',priority:'medium',type:'complaint',status:'pending'}))));
 const method=(await h.ok(h.service.from('payment_method_config').select('id').limit(1)))[0];
 const payments=orders.slice(0,3).map((o,i)=>({id:crypto.randomUUID(),payment_code:'CHECK-'+crypto.randomUUID(),customer_id:c.id,order_id:o.id,payment_method_config_id:method.id,payment_type:'order',amount:i===0?40:100,transaction_status:'succeeded',idempotency_key:'CHECK-'+crypto.randomUUID()}));
 payments.forEach(p=>p.succeeded_at=new Date().toISOString());
 await h.ok(h.service.from('payment').insert(payments));
 await h.ok(h.service.from('refund_transaction').insert({refund_code:'CHECK-'+crypto.randomUUID(),payment_id:payments[2].id,refund_type:'full',requested_amount:100,approved_amount:100,refunded_amount:100,refund_method:'original',refund_status:'succeeded',completed_at:new Date().toISOString()}));
 await h.refresh(page);await page.locator('#custSearchInput').fill(c.phone);
 await page.waitForFunction(()=>document.querySelectorAll('#customerTableTbody tr[data-id]').length===1);
 const downloadPromise=page.waitForEvent('download');await page.locator('#btnExportCustomerReport').click();const download=await downloadPromise;
 const exported=fs.readFileSync(await download.path(),'utf8');assert(exported.includes("'=Customer export verification"));assert.equal(exported.trim().split(/\r?\n/).length,2);
 await h.showProfile(page,c.id);
 await page.waitForFunction(id=>Object.values(window.PawpalCustomers.state.customerDatabase).find(c=>c.dbId===id)?._detailsLoadStatus==='loaded',c.id);
 const history=await page.evaluate(id=>{const c=Object.values(window.PawpalCustomers.state.customerDatabase).find(c=>c.dbId===id);return {orders:c.orders,bookings:c.bookings,complaints:c.complaints};},c.id);
 assert.equal(history.orders.length,12);assert.equal(history.bookings.length,12);assert.equal(history.complaints.length,12);
 assert.equal(history.orders.find(o=>o.rawId===orders[0].id).payment,'Thanh toán một phần');assert.equal(history.orders.find(o=>o.rawId===orders[1].id).payment,'Đã thanh toán');assert.equal(history.orders.find(o=>o.rawId===orders[2].id).payment,'Đã hoàn tiền');
 for(const [tab,tbody] of [['dtab-orders','drawerOrdersTbody'],['dtab-bookings','drawerBookingsTbody'],['dtab-complaints','drawerComplaintsTbody']]){
  await page.locator(`[data-drawertab="${tab}"]`).click();assert.equal(await page.locator('#'+tbody+' tr').count(),10);
  await page.locator('#'+tbody+'Pager [data-page="2"]').first().click();await page.waitForFunction(id=>document.querySelectorAll('#'+id+' tr').length===2,tbody);
 }
 assert.equal(await page.evaluate(()=>window.customerXss || 0),0);
 await page.screenshot({path:h.infra+'/verification/v1-customer-history.png',fullPage:true});
 // A source outage is an explicit error, rather than a false empty-history state.
 await page.route('**/rest/v1/payment?**',r=>r.fulfill({status:503,contentType:'application/json',body:'{"message":"verification unavailable"}'}));
 await page.evaluate(async id=>{const mod=window.PawpalCustomers,c=Object.values(mod.state.customerDatabase).find(c=>c.dbId===id);await mod.fetchCustomerProfile360(c,{force:true});mod.subtabs.profile.renderDrawerOrders(c.id);},c.id);
 assert((await page.locator('#drawerOrdersTbody').innerText()).includes('Không tải được'));
 console.log('PASS scoped histories, actual payment/refund state, 10-row pagination, filtered CSV/formula protection, escaped ticket text and explicit source-error state');
}finally{await browser.close();}})().catch(e=>{console.error(e.stack?.split('\n').slice(0,6).join('\n') || e.message);process.exitCode=1;});
