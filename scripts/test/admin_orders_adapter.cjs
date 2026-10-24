const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
(async()=>{
 const calls=[];const order={id:'id-a',order_code:'ORD-A',customer_id:'customer-a',created_at:'2026-10-24',updated_at:'v1',order_status:'confirmed',shipping_fee_snapshot:0,customer:{customer_profile:{full_name:'Customer'},customer_phone:[]},lines:[{id:'line-a',product_variant_id:'variant-a',sku_snapshot:'SKU-A',product_name_snapshot:'Product',unit_price:100,quantity:1,discount_amount:0}],payments:[{id:'payment-a',amount:50,transaction_status:'succeeded',method:{name:'Cash'},refunds:[{refund_status:'succeeded',refunded_amount:10}]}]};
 const data={sales_order:[order],sales_order_totals:[{order_id:'id-a',total_amount:100}],return_request:[],voucher_redemption:[]};
 const context={window:{getSupabaseClient:()=>({from:table=>{const query={table};const builder={};for(const op of ['select','order','not','eq','in'])builder[op]=(...args)=>{query[op]=args;return builder};builder.range=async()=>{calls.push(query);return {data:data[table]||[],error:null}};return builder}})},console};
 vm.createContext(context);let source=fs.readFileSync('pages/admin/modules/orders/orders.js','utf8');vm.runInContext(source.slice(0,source.indexOf('// orders.js - Core')),context);
 const rows=await context.window.PawpalOrderV1.orders({ids:['id-a']});assert.equal(rows[0].collected,40);assert.equal(rows[0].remaining,60);assert.equal(rows[0].paymentStatus,'partial');
 assert.equal(calls.length,4);for(const call of calls){assert.deepEqual(JSON.parse(JSON.stringify(call.in)),[call.table==='sales_order'?'id':call.table==='return_request'?'sales_order_id':'order_id',['id-a']]);}
 calls.length=0;await context.window.PawpalOrderV1.orders({ids:[]});assert.equal(calls.length,0);
 await context.window.PawpalOrderV1.orders({id:'ORD-A'});assert.deepEqual(calls[0].eq,['order_code','ORD-A']);
 console.log('PASS scoped order adapter: only selected IDs in all four queries, empty page no requests, deep-link code lookup, partial payment/refund amounts.');
})().catch(e=>{console.error(e);process.exit(1)});
