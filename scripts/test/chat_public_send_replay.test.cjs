// Active public API: replay must not invoke a model or repeat the write transaction.
const {test}=require('node:test'),assert=require('node:assert/strict');
const {createHandler}=require('../../api/admin-chat.js');
const chat='10000000-0000-4000-8000-000000000001',requestId='20000000-0000-4000-8000-000000000002';
async function replay({owner='A',priorOwner='auth-A',priorChat=chat,priorText='pending question'}={}){
 const reads=[],writes=[];let models=0;
 const service={auth:{getUser:async()=>({data:{user:{id:'auth-'+owner}}})},rpc:async(...args)=>{writes.push(args);throw Error('unexpected_write');},from(table){
  reads.push(table);const value=table==='customer'?{id:owner}:table==='chat_conversation'?{id:chat,customer_id:'A',status:'resolved',updated_at:'2026-10-28T01:00:00Z'}:table==='chat_message'?{conversation_id:priorChat,raw_content:priorText,sender_account_id:priorOwner,sender_guest_session_id:null}:null;
  const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:value})};return q;
 }};
 const handler=createHandler({serviceClient:service,generateReply:async()=>{models++;throw Error('unexpected_ai');}}),res={statusCode:200,setHeader(){},status(n){this.statusCode=n;return this;},json(body){this.body=body;return this;}};
 await handler({method:'POST',headers:{authorization:'Bearer offline'},socket:{remoteAddress:'replay-'+Math.random()},body:{action:'public_send',conversationId:chat,requestId,question:'pending question'}},res);
 return {res,reads,writes,models};
}
test('acknowledged send replays even after conversation closes, without AI/write',async()=>{const r=await replay();assert.equal(r.res.statusCode,200);assert.equal(r.res.body.replayed,true);assert.equal(r.models,0);assert.equal(r.writes.length,0);assert.deepEqual(r.reads,['customer','chat_conversation','chat_message']);});
test('reused request ID with different content/conversation/actor conflicts without write',async()=>{for(const options of [{priorText:'other'},{priorChat:'30000000-0000-4000-8000-000000000003'},{priorOwner:'auth-B'}]){const r=await replay(options);assert.equal(r.res.statusCode,409);assert.equal(r.models,0);assert.equal(r.writes.length,0);}});
test('different owner is denied before probing request history',async()=>{const r=await replay({owner:'B'});assert.equal(r.res.statusCode,403);assert.ok(!r.reads.includes('chat_message'));assert.equal(r.writes.length,0);assert.equal(r.models,0);});
