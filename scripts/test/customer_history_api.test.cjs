const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
test('history pages hydrate only selected IDs and reuse their scoped totals without full-history RPCs',async()=>{
 const reads=[],calls=[];let wrongOwner=false;
 const db={from(table){let ids=[];const q={select(){return q;},order(){return q;},eq(){return q;},in(_key,value){ids=value;return q;},then(resolve){reads.push({table,ids});const rows=ids.map(id=>table==='sales_order'?{id,order_code:id,order_status:'pending',sales_order_detail:[],payment:[]}:{id,appointment_code:id,appointment_status:'confirmed',appointment_item:[],payment:[]});return Promise.resolve({data:rows}).then(resolve);}};return q;},rpc:async(name,args)=>{
  calls.push(name);
  if(name==='own_history_page')return {data:{owner:wrongOwner?'other':'owner',ids:['id-11','id-12'],summaries:['id-11','id-12'].map(id=>({id,total:100,paid:0,net_paid:0})),counts:{all:23},page:2,total:23,stats:{spent:0}}};
  if(name==='customer_shop_options')return {data:{payment_methods:[]}};
  throw Error('Unexpected full read '+name);
 }};
 const ctx=vm.createContext({window:{getSupabaseClient:()=>db},console,normalizeOrderStatus:s=>s,resolveAuthenticatedCustomerId:async(_db,u)=>typeof u==='string'?u:u.id,vietnamDateTimeInput:v=>v});
 const code=fs.readFileSync('scripts/api/api.js','utf8').replace(/^import .*;\r?$/gm,'').replace('export const API =','const API =');vm.runInContext(code+'\nglobalThis.API=API;',ctx);
 const orders=await ctx.API.getUserOrderPage('owner',{page:2});assert.equal(orders.rows.length,2);assert.equal(orders.meta.counts.all,23);assert.deepEqual(reads[0].ids,['id-11','id-12']);
 const bookings=await ctx.API.getUserBookingPage({id:'owner'},{page:2});assert.equal(bookings.rows.length,2);assert.deepEqual(reads[1].ids,['id-11','id-12']);assert.ok(!calls.includes('own_service_booking_summary'));assert.ok(!calls.includes('own_sales_order_totals'));
 wrongOwner=true;await assert.rejects(()=>ctx.API.getUserOrderPage('owner'),/trang lịch sử/);assert.equal(reads.length,2);
});
test('context selectors use metadata and a single order reads only its scoped financials',async()=>{
 const calls=[],filters=[];let wrongOwner=false;
 const db={from(table){const q={select(){return q;},order(){return q;},eq(key,value){filters.push([table,key,value]);return q;},then(resolve){return Promise.resolve({data:[{id:'one',order_code:'OLD-23',order_status:'completed',sales_order_detail:[],payment:[]}]}).then(resolve);}};return q;},rpc:async(name,args)=>{
  calls.push({name,args});
  if(name==='own_context_choices')return {data:{owner:wrongOwner?'other':'owner',rows:[{id:'OLD-23',_supabaseId:'one'}]}};
  if(name==='own_context_financials')return {data:[{id:'one',total:0,paid:0}]};
  if(name==='customer_shop_options')return {data:{payment_methods:[]}};
  throw Error('Unexpected full history read '+name);
 }};
 const ctx=vm.createContext({window:{getSupabaseClient:()=>db},console,normalizeOrderStatus:s=>s,resolveAuthenticatedCustomerId:async()=> 'owner'});
 const code=fs.readFileSync('scripts/api/api.js','utf8').replace(/^import .*;\r?$/gm,'').replace('export const API =','const API =');vm.runInContext(code+'\nglobalThis.API=API;',ctx);
 const choices=await ctx.API.getContextChoices('owner','orders',{query:'OLD-23'});assert.equal(choices[0]._supabaseId,'one');assert.equal(filters.length,0);
 await ctx.API.getUserOrders('owner',{id:'OLD-23'});assert.ok(filters.some(f=>f[1]==='order_code'&&f[2]==='OLD-23'));assert.equal(JSON.stringify(calls.find(c=>c.name==='own_context_financials').args),JSON.stringify({p_kind:'orders',p_ids:['one']}));
 wrongOwner=true;await assert.rejects(()=>ctx.API.getContextChoices('owner','orders'),/tài khoản/);
});
