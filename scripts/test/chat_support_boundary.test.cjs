const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {createHandler}=require('../../api/admin-chat.js');
const {needsSupportRequest}=require('../api/chat_support_boundary.js');
test('complaints and compensation route to Support; ordinary consultation stays available',()=>{
 for(const text of ['Tôi muốn khiếu nại','Tôi muốn bồi thường','Yêu cầu hoàn tiền','Đền bù cho tôi'])assert.ok(needsSupportRequest(text));
 for(const text of ['Tư vấn gói tắm cho mèo','Tôi muốn gặp CSKH','Điểm Pawpoint dùng thế nào?'])assert.equal(needsSupportRequest(text),false);
 assert.ok(needsSupportRequest('Shop giao sai hàng',{riskType:'service_complaint'}));
});
test('actual public gateway saves guidance without creating a ticket or deciding compensation',async()=>{
 for(const member of [false,true])for(const question of ['Tôi muốn khiếu nại dịch vụ','Bồi hoàn cho tôi 200 điểm','Tôi bị mất tiền khi thanh toán']){
  const chat=randomUUID(),customer=randomUUID(),guest=randomUUID(),calls=[];let models=0;
  const service={auth:{getUser:async()=>({data:{user:{id:'auth'}}})},from(table){
   const q={select:()=>q,eq:()=>q,is:()=>q,gt:()=>q,maybeSingle:async()=>({data:table==='customer'?{id:customer}:table==='guest_session'?{id:guest}:table==='chat_conversation'?{id:chat,customer_id:member?customer:null,guest_session_id:guest,status:'bot_handling',updated_at:'2026-11-12T00:00:00Z'}:null})};return q;
  },rpc:async(name,args)=>{calls.push({name,args});return {data:name==='public_chat_membership'?member:{profanity:[],sentiment:[]}};}};
  const res={statusCode:200,setHeader(){},status(n){this.statusCode=n;return this;},json(body){this.body=body;return this;}};
  await createHandler({serviceClient:service,generateReply:async()=>{models++;throw Error('Unexpected model');}})({method:'POST',headers:member?{authorization:'Bearer offline'}:{},socket:{remoteAddress:chat},body:{action:'public_send',conversationId:chat,requestId:randomUUID(),question,sessionToken:'g'.repeat(64)}},res);
  assert.equal(res.statusCode,200,JSON.stringify(res.body));assert.equal(models,0);
  const saved=calls.find(c=>c.name==='post_public_chat_message_media');assert.ok(saved);assert.match(saved.args.p_reply,/\/user#support-create/);assert.match(saved.args.p_reply,/chưa phải yêu cầu khiếu nại hay quyết định bồi hoàn/);
  assert.ok(calls.every(c=>['public_chat_membership','read_public_chat_rules','post_public_chat_message_media'].includes(c.name)),JSON.stringify(calls));
  if(!member)assert.equal(saved.args.p_handover,false);
 }
});
