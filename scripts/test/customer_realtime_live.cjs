const assert=require('node:assert/strict'),crypto=require('node:crypto');const {createClient}=require('@supabase/supabase-js');const h=require('./customer_completion_helpers.cjs');
const live=createClient(h.env.SUPABASE_PUBLIC_URL,h.env.SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
(async()=>{const {browser,page}=await h.browserPage({restored:false});let id;
try{
 await page.waitForFunction(()=>window._custRealtimeChannel?.state==='joined');
 const before=(await h.ok(live.from('customer').select('id'))).length;
 const row=await h.ok(live.from('customer').insert({customer_code:'REALTIME-CHECK-'+crypto.randomUUID(),customer_status:'active'}).select('id').single());id=row.id;
 await h.ok(live.from('customer_profile').insert({customer_id:id,full_name:'Realtime verification'}));
 await page.waitForFunction(id=>Object.values(window.PawpalCustomers.state.customerDatabase).some(c=>c.dbId===id&&c.name==='Realtime verification'),id,{timeout:20000});
 await h.ok(live.from('customer_profile').update({full_name:'Realtime verification updated'}).eq('customer_id',id));
 await page.waitForFunction(id=>Object.values(window.PawpalCustomers.state.customerDatabase).some(c=>c.dbId===id&&c.name==='Realtime verification updated'),id,{timeout:20000});
 await h.showProfile(page,id);await page.locator('#drawerCustNote').fill('Unsaved operator note');const version=await page.locator('#drawerCustNote').getAttribute('data-version');
 await h.ok(live.from('customer').update({note:'External realtime note'}).eq('id',id));
 await page.waitForFunction(id=>Object.values(window.PawpalCustomers.state.customerDatabase).some(c=>c.dbId===id&&c.note==='External realtime note'),id,{timeout:20000});
 assert.equal(await page.locator('#drawerCustNote').inputValue(),'Unsaved operator note');assert.equal(await page.locator('#drawerCustNote').getAttribute('data-version'),version);
 await page.locator('#btnSaveCustomerNote').click();await page.locator('#adminGlobalToast').filter({hasText:/Hồ sơ đã thay đổi/}).waitFor();
 for(const table of ['customer_profile','customer_phone','customer_address','customer_membership'])await h.ok(live.from(table).delete().eq('customer_id',id));await h.ok(live.from('customer').delete().eq('id',id));
 await page.waitForFunction(id=>!Object.values(window.PawpalCustomers.state.customerDatabase).some(c=>c.dbId===id),id,{timeout:20000});id=null;
 assert.equal((await h.ok(live.from('customer').select('id'))).length,before);
 console.log('PASS live Realtime create/update/delete, unsaved-note preservation, stale-note rejection; temporary customer removed');
}finally{
 await browser.close();if(id){for(const table of ['customer_profile','customer_phone','customer_address','customer_membership'])await h.ok(live.from(table).delete().eq('customer_id',id));await h.ok(live.from('customer').delete().eq('id',id));}
}})().catch(e=>{console.error(e.message);process.exitCode=1;});
