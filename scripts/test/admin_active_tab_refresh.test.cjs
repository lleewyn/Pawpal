const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function run(domain,activeTab){
 const source=fs.readFileSync('pages/admin/modules/'+domain+'/'+domain+'.js','utf8');
 const setup=source.indexOf(domain==='orders'?'function setupOrdersRealtimeSync':'function setupServicesRealtimeSync');
 const start=source.indexOf('const dirty',setup),end=source.indexOf(domain==='orders'?'const triggerOrderSync':'const triggerServiceSync',start);
 const storage=new Map([['pawpal_admin_active_module',domain==='orders'?'Bán hàng':'Dịch vụ'],[domain==='orders'?'pawpal_admin_order_subtab':'pawpal_admin_services_active_subtab',activeTab]]),calls=[];
 const context=vm.createContext({document:{hidden:false},sessionStorage:{getItem:k=>storage.get(k)},setTimeout,clearTimeout,
  loadServicesData:async()=>calls.push('bookings'),loadCatalogData:async()=>calls.push('catalog'),loadReviewsData:async()=>calls.push('reviews'),
  syncOrdersAndProductsFromSupabase:async({resources})=>calls.push(...resources),
  window:{PawpalOrders:{state:{ordersLoaded:true,productsLoaded:true,vouchersLoaded:true}}},PawpalServices:{subtabs:{}}});
 vm.runInContext(source.slice(start,end)+';globalThis.probe={flush,dirty};',context);
 return {context,calls,storage,probe:context.probe};
}
test('services realtime refresh reads only the active tab dependencies',async()=>{
 const h=run('services','tab-service-bookings');
 ['bookings','catalog','reviews'].forEach(v=>h.probe.dirty.add(v));await h.probe.flush();assert.deepEqual(h.calls,['bookings']);
 h.calls.length=0;h.storage.set('pawpal_admin_services_active_subtab','tab-service-reviews');
 ['bookings','catalog','reviews'].forEach(v=>h.probe.dirty.add(v));await h.probe.flush();assert.deepEqual(h.calls,['reviews']);
 h.calls.length=0;h.context.document.hidden=true;h.probe.dirty.add('reviews');await h.probe.flush();assert.equal(h.calls.length,0);assert.equal(h.probe.dirty.size,1);
 h.context.document.hidden=false;h.storage.set('pawpal_admin_services_active_subtab','tab-service-catalog');await h.probe.flush();assert.deepEqual(h.calls,['catalog']);
});
test('sales realtime never reloads other tabs that happen to have been visited',async()=>{
 const h=run('orders','tab-order-products');['list','products','vouchers'].forEach(v=>h.probe.dirty.add(v));
 await h.probe.flush();assert.deepEqual(h.calls,['products']);
 h.calls.length=0;h.storage.set('pawpal_admin_active_module','Dashboard');h.probe.dirty.add('list');await h.probe.flush();assert.equal(h.calls.length,0);assert.equal(h.probe.dirty.size,1);
});
test('catalogue ratings use aggregate metadata without downloading review details',async()=>{
 const source=fs.readFileSync('pages/admin/modules/services/services.js','utf8'),start=source.indexOf('const readRatings=async()=>'),end=source.indexOf('return PawpalServices.state.servicesData;',start)+'return PawpalServices.state.servicesData;'.length;
 let calls=0,fail=false;
 const context=vm.createContext({window:{getSupabaseClient:()=>({rpc:async name=>{assert.equal(name,'admin_service_review_summary');calls++;return fail?{error:Error('offline')}:{data:[{service_id:'a',review_count:1234,average_rating:4.5}]};},from(){throw Error('Unnecessary detail query');}})},PawpalServices:{state:{servicesData:[{dbId:'a'},{dbId:'b'}]}}});
 vm.runInContext('globalThis.run=async function(force=false){'+source.slice(start,end)+'};',context);
 const rows=await context.run();assert.equal(rows[0].reviewCount,1234);assert.equal(rows[0].averageRating,4.5);assert.equal(rows[1].averageRating,null);assert.equal(calls,1);
 fail=true;await context.run();assert.equal(rows[0].averageRating,null);assert.equal(calls,2);
});
