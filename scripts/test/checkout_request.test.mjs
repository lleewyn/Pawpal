import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {readCheckoutRequest,writeCheckoutRequest,clearCheckoutRequest} from '../shared/checkout-request.mjs';
const id='10000000-0000-4000-8000-000000000001';
const storage=()=>{const values=new Map();return {getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};};

test('request ID survives reloading the reader and remains scoped to its actor',()=>{
 const s=storage();writeCheckoutRequest(s,'A',id);assert.equal(readCheckoutRequest(s,'A').id,id);assert.equal(readCheckoutRequest(s,'B'),null);
 writeCheckoutRequest(s,'A',id,{confirmed:true});assert.equal(readCheckoutRequest(s,'A').cartCleaned,false);
 writeCheckoutRequest(s,'A',id,{confirmed:true,cartCleaned:true});assert.equal(readCheckoutRequest(s,'A').cartCleaned,true);
 clearCheckoutRequest(s,'B',id);assert.equal(readCheckoutRequest(s,'A').id,id);
 clearCheckoutRequest(s,'A','other-id');assert.equal(readCheckoutRequest(s,'A').id,id);
 clearCheckoutRequest(s,'A',id);assert.equal(readCheckoutRequest(s,'A'),null);
});

test('corrupted or unavailable recovery storage cannot silently start a new request',()=>{
 const s=storage();s.setItem('pawpal_checkout_request:A','broken');assert.throws(()=>readCheckoutRequest(s,'A'));
 assert.throws(()=>writeCheckoutRequest(s,'A','invalid'));
 assert.throws(()=>writeCheckoutRequest({getItem:()=>null,setItem:()=>{}},'A',id));
});

function apiFixture(result){
 const calls=[];const source=fs.readFileSync('scripts/api/api.js','utf8');
 const methods=source.slice(source.indexOf('    async prepareOwnOrder('),source.indexOf('    async updateOrderPaymentStatus('));
 const context={window:{getSupabaseClient:()=>({rpc:async(name,args)=>{calls.push({name,args});return name==='quote_own_sales_order'?{data:{version:'quote',total:105000}}:{data:result};}})}};
 vm.runInNewContext('globalThis.api={'+methods+'};',context);return {api:context.api,calls};
}
const order={userId:'A',requestId:id,shipping:{deliveryMethod:'delivery',name:'E2E',phone:'0000000000',city:'E2E',address:'E2E'},items:[{variantId:'variant',quantity:2,price:1}],pricing:{grandTotal:1},payment:{configId:'method'}};

test('checkout sends SKU quantities and server quote, not client prices/totals',async()=>{
 const f=apiFixture(id),o=structuredClone(order);o._prepared=await f.api.prepareOwnOrder(o);const r=await f.api.submitOrder(o);
 assert.equal(r.success,true);assert.equal(r.orderId,id);
 assert.deepEqual(JSON.parse(JSON.stringify(f.calls[0].args.p_lines)),[{variant_id:'variant',quantity:2}]);
 assert.equal(f.calls[1].args.p_expected_quote,'quote');assert.equal(f.calls[1].args.p_id,id);
 assert.equal('p_price' in f.calls[1].args,false);assert.equal('p_total' in f.calls[1].args,false);
});

test('null or different order acknowledgements cannot report successful checkout',async()=>{
 for(const acknowledgement of [null,'other-id']){
  const f=apiFixture(acknowledgement),o=structuredClone(order);o._prepared=await f.api.prepareOwnOrder(o);
  assert.equal((await f.api.submitOrder(o)).success,false);
 }
});
