const test=require('node:test'),assert=require('node:assert/strict');
const {createCustomerSupportService}=require('../api/customer_support');
const ticketId='10000000-0000-4000-8000-000000000001',requestId='20000000-0000-4000-8000-000000000001';
function fixture(error=null,ack=requestId){const calls=[];const service=createCustomerSupportService({
 from(){throw Error('Direct table access forbidden');},async rpc(name,args){calls.push({name,args});return {data:ack,error};}
});return {service,calls};}
test('support reply uses one caller-scoped atomic RPC with a stable request ID',async()=>{
 const f=fixture();const message=await f.service.reply('customer-A',{ticketId,requestId,content:'  E2E reply  '});
 assert.equal(message.id,requestId);assert.equal(message.content,'E2E reply');assert.equal(f.calls.length,1);
 assert.deepEqual(f.calls[0],{name:'reply_own_support_ticket',args:{p_id:requestId,p_ticket:ticketId,p_content:'E2E reply'}});
 assert.equal('p_customer_id' in f.calls[0].args,false);
});
test('foreign ticket, closed state and replay conflicts are rejected by server',async()=>{
 for(const code of ['support_owner_required','support_reply_closed','support_reply_conflict']){
  const f=fixture({message:code});await assert.rejects(()=>f.service.reply('customer-A',{ticketId,requestId,content:'E2E reply'}));assert.equal(f.calls.length,1);
 }
});
test('validation rejects missing request ID or invalid content before RPC',async()=>{
 const f=fixture();for(const input of [{ticketId,content:'E2E'}, {ticketId,requestId,content:''},{ticketId,requestId,content:'x'.repeat(4001)}])await assert.rejects(()=>f.service.reply('customer-A',input));assert.equal(f.calls.length,0);
});
test('null or different acknowledgement is never successful',async()=>{
 for(const ack of [null,ticketId]){const f=fixture(null,ack);await assert.rejects(()=>f.service.reply('customer-A',{ticketId,requestId,content:'E2E'}));}
});
