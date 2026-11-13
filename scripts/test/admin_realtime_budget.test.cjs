const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const tick=()=>new Promise(r=>setImmediate(r));
function setup(){
 const storage=new Map([['pawpal_admin_active_module','Khách hàng']]),natives=[],removed=[];
 const doc=new EventTarget();doc.hidden=false;
 const client={channel(name){const c={name,handlers:[],on(type,filter,callback){c.handlers.push({type,filter,callback});return c;},subscribe(callback){c.callback=callback;callback?.('SUBSCRIBED');return c;}};natives.push(c);return c;},removeChannel(c){removed.push(c);c.callback?.('CLOSED');return Promise.resolve('ok');},removeAllChannels(){return Promise.resolve([]);}};
 const window=new EventTarget();window.getSupabaseClient=()=>client;
 vm.runInNewContext(fs.readFileSync('scripts/shared/admin-realtime-budget.js','utf8'),{window,document:doc,sessionStorage:{getItem:k=>storage.get(k)},console,Promise});
 return {client,natives,removed,doc,window,setModule(name){storage.set('pawpal_admin_active_module',name);window.dispatchEvent(new Event('admin:module-changing'));}};
}
test('inactive module channels consume no native subscription; returning triggers one catch-up and drops old events',async()=>{
 const h=setup();let customers=0,orders=0;
 const customer=h.client.channel('admin_customers_realtime').on('postgres_changes',{table:'customer'},()=>customers++).subscribe();
 h.client.channel('admin-orders-live-sync').on('postgres_changes',{table:'sales_order'},()=>orders++).subscribe();
 assert.equal(h.natives.length,1);const old=h.natives[0];
 h.setModule('Bán hàng');assert.equal(h.removed.length,1);assert.equal(h.natives.length,2);
 old.handlers[0].callback({new:{id:'old'}});assert.equal(customers,0);
 h.setModule('Khách hàng');await tick();assert.equal(customers,1);assert.equal(orders,0);assert.equal(h.natives.length,3);
 assert.notEqual(h.natives[2].name,old.name);
 await h.client.removeChannel(customer);h.setModule('Bán hàng');h.setModule('Khách hàng');await tick();assert.equal(customers,1);
});
test('hidden views pause data channels but leave workspace signals and chat typing untouched',async()=>{
 const h=setup();let calls=0;
 h.client.channel('admin_customers_realtime').on('postgres_changes',{table:'customer'},()=>calls++).subscribe();
 const signal=h.client.channel('workspace-owner').on('postgres_changes',{table:'workspace_signal'},()=>{}).subscribe();
 const typing=h.client.channel('fab-customer-thread').subscribe();
 h.doc.hidden=true;h.doc.dispatchEvent(new Event('visibilitychange'));
 assert.equal(h.removed.length,1);assert.ok(!h.removed.includes(signal));assert.ok(!h.removed.includes(typing));
 h.doc.hidden=false;h.doc.dispatchEvent(new Event('visibilitychange'));await tick();assert.equal(calls,1);
 await h.client.removeAllChannels();const before=h.natives.length;h.setModule('Bán hàng');h.setModule('Khách hàng');await tick();assert.equal(h.natives.length,before);
});
test('catch-up replays every invalidation once with primary refresh last',async()=>{
 const h=setup(),events=[];h.setModule('Nhân sự');
 h.client.channel('admin-staff-live-sync').on('postgres_changes',{table:'staff'},p=>events.push([p.table,p.eventType])).on('postgres_changes',{table:'staff_schedule'},p=>events.push([p.table,p.eventType])).subscribe();
 h.doc.hidden=true;h.doc.dispatchEvent(new Event('visibilitychange'));h.doc.hidden=false;h.doc.dispatchEvent(new Event('visibilitychange'));await tick();
 assert.deepEqual(events,[['staff_schedule','RESYNC'],['staff','RESYNC']]);
});
