const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),{createRequire}=require('node:module');
const {replyPrefix,createPublicStream}=require('../api/chat_public_stream.js');
const {createHandler}=require('../../api/admin-chat.js');
const {friendly}=require('../api/chat_public_guest.js');
test('Vietnamese cắt tỉa does not silently select English cat species',()=>{const {plan}=require('../api/chat_public_guest.js');assert.equal(plan('Giá cắt tỉa bé 7kg').request.pet,undefined);assert.equal(plan('Giá grooming cho cat 7kg').request.pet,'cat');assert.equal(plan('Cắt tỉa cho mèo 7kg').request.pet,'cat');assert.equal(plan('Cắt tỉa cho chó 7kg').request.pet,'dog');});
test('structured reply prefixes decode split escapes/Unicode without leaking JSON fields',()=>{
 for(const value of ['PawPal gửi bạn nhé.','Bé 🐾\n"VIP" \\ thử', '<img src=x>']){
  for(const object of [{reply:value,understood:true},{understood:false,reply:value}]){
   const encoded=JSON.stringify(object);let last='';for(let i=0;i<=encoded.length;i++){const prefix=replyPrefix(encoded.slice(0,i));assert.ok(value.startsWith(prefix));assert.ok(prefix.startsWith(last));last=prefix;}assert.equal(last,value);
  }
 }
 for(const raw of ['{"secret":"internal","reply":"no"}', 'not json', 'x'.repeat(16001)])assert.equal(replyPrefix(raw),'');
});
test('stream opt-in caps draft content bytes and keeps legacy JSON clients unchanged',()=>{
 const chunks=[],headers={};const res={setHeader(k,v){headers[k]=v;},write(s){chunks.push(s);},end(){this.writableEnded=true;}};
 const stream=createPublicStream({body:{action:'public_send',stream:true}},res);for(let n=0;n<20;n++)stream.delta('é'.repeat(2000));stream.done();
 const frames=chunks.map(x=>({type:x.match(/event: (\w+)/)[1],data:JSON.parse(x.match(/data: (.*)/)[1])}));assert.equal(headers['Content-Type'],'text/event-stream; charset=utf-8');assert.ok(frames.filter(x=>x.type==='delta').reduce((n,x)=>n+Buffer.byteLength(x.data.text),0)<=32768);assert.equal(frames.at(-1).type,'done');assert.equal(createPublicStream({body:{action:'public_send'}},res).enabled,false);
});
test('actual SDK streaming branch emits before completed response, using the same bounded generation',async()=>{
 const apiFile=path.resolve('api/admin-chat.js'),realRequire=createRequire(apiFile);let release,finish,finished=false,calls=0;const deltas=[];
 const aggregate=new Promise(r=>finish=r),gate=new Promise(r=>release=r);
 const sdk={GoogleGenerativeAI:class{getGenerativeModel(config){assert.match(config.systemInstruction,/Xưng là PawPal/);assert.match(config.systemInstruction,/không tự đoán tuổi/);return {generateContentStream:async()=>{calls++;return {stream:(async function*(){yield {text:()=>'{"reply":"PawPal '};await gate;yield {text:()=> 'gửi bạn nhé.","understood":true}'};finish({text:()=>'{"reply":"PawPal gửi bạn nhé.","understood":true}'});})(),response:aggregate};}};}}};
 const module={exports:{}};vm.runInNewContext(fs.readFileSync(apiFile,'utf8'),{module,exports:module.exports,require:name=>name==='@google/generative-ai'?sdk:realRequire(name),process:{env:{}},console,setTimeout,clearTimeout},{filename:apiFile});
 const generate=module.exports.createGenerator({serviceClient:{rpc:async()=>({data:{configured:false}})},environmentKey:()=> 'offline'});
 const task=generate('Câu hỏi công khai',{},[],{audience:'customer',onDelta:text=>deltas.push(text),onReset(){}}).then(x=>{finished=true;return x;});
 while(!deltas.length)await new Promise(r=>setImmediate(r));assert.equal(finished,false);assert.equal(deltas.join(''),'PawPal ');release();const reply=await task;assert.equal(JSON.parse(reply).reply,deltas.join(''));assert.equal(calls,1);
});
async function handlerCase({other=false,saveError=false,replay=false}={}){
 let release,entered;const gate=new Promise(r=>release=r),ready=new Promise(r=>entered=r),events=[],writes=[];const id=randomUUID(),auth='auth';let generations=0;
 const service={auth:{getUser:async()=>({data:{user:{id:auth}}})},from(table){const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:table==='customer'?{id:'owner'}:table==='chat_conversation'?{id,customer_id:other?'other':'owner',status:'bot_handling',updated_at:'now'}:replay?{conversation_id:id,raw_content:'Quy định chung chưa phân loại',sender_account_id:auth,sender_guest_session_id:null}:null})};return q;},rpc:async(name,args)=>{if(name==='read_public_chat_rules')return {data:{profanity:[],sentiment:[]}};if(name==='search_public_chat_context')return {data:{faq:[{question:'Công khai',answer:'Thông tin tham khảo.',complete:true}],recent:[],incomplete:false}};if(name==='post_public_chat_message_media'){writes.push(args);return saveError?{error:{code:'PT409'}}:{data:{}};}assert.fail(name);}};
 const handler=createHandler({serviceClient:service,generateReply:async(_q,_c,_h,options)=>{generations++;options.onReset();options.onDelta('PawPal gửi bạn');entered();await gate;options.onDelta(' nhé.');return '{"reply":"PawPal gửi bạn nhé.","understood":true}';}});
 const res={statusCode:200,setHeader(){},write(text){events.push({type:text.match(/event: (\w+)/)[1],data:JSON.parse(text.match(/data: (.*)/)[1])});},end(){this.writableEnded=true;},status(n){this.statusCode=n;return this;},json(d){this.data=d;return this;}};
 const task=handler({method:'POST',headers:{authorization:'Bearer offline','x-real-ip':randomUUID()},body:{action:'public_send',stream:true,question:'Quy định chung chưa phân loại',conversationId:id,requestId:randomUUID()}},res);
 if(!other&&!replay){await ready;assert.equal(writes.length,0);assert.ok(events.some(e=>e.type==='delta'));assert.ok(!events.some(e=>e.type==='done'));}release();await task;return {events,writes,res,generations};
}
test('draft arrives before persistence; done only after one successful final write',async()=>{const r=await handlerCase();assert.equal(r.writes.length,1);assert.equal(r.events.at(-1).type,'done');assert.equal(r.writes[0].p_reply,'PawPal gửi bạn nhé.');});
test('save conflict emits an error instead of confirming an unsaved streamed reply',async()=>{const r=await handlerCase({saveError:true});assert.equal(r.events.at(-1).type,'error');assert.equal(r.events.at(-1).data.status,409);assert.ok(!r.events.some(e=>e.type==='done'));assert.equal(r.writes.length,1);});
test('ownership denial emits no stream and a replay validates the same attachment payload without generation',async()=>{const denied=await handlerCase({other:true});assert.equal(denied.res.statusCode,403);assert.equal(denied.events.length,0);assert.equal(denied.generations,0);const replay=await handlerCase({replay:true});assert.equal(replay.events.at(-1).data.replayed,true);assert.equal(replay.generations,0);assert.equal(replay.writes.length,1);assert.deepEqual(replay.writes[0].p_assets,[]);});
test('friendlier public wording preserves facts and does not rewrite customer possessives',()=>{assert.equal(friendly('Mình gửi bạn mức giá 170.000 đ. Bạn xem trong tài khoản của mình.'),'PawPal gửi bạn mức giá 170.000 đ. Bạn xem trong tài khoản của mình.');assert.match(friendly('Bạn có thể mua bằng luồng khách vãng lai mà không phải tạo tài khoản thành viên.'),/không cần tạo tài khoản nhé/);assert.equal(friendly('Mã OTP 123 không được chia sẻ.'),'Mã OTP 123 không được chia sẻ.');});
