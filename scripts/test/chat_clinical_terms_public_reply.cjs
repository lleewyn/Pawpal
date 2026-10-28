// No real AI call. Optional Cloud check reads active moderation rules only.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict'),{createRequire}=require('node:module'),{randomUUID}=require('node:crypto');
const {evaluateToxicAndSentiment:evaluate}=require('../api/chat_moderation.js');
(async()=>{
 const question='Bé nhà tôi sau khi cắt tỉa về thì chảy máu?';
 const filters=[{keyword:'chảy máu',action:'mask'},{keyword:'máu',action:'block'},{keyword:'địt',action:'warn'},{keyword:'tao sẽ đánh mày chảy máu',action:'block'}];
 let result=evaluate(question,filters,[]);assert.equal(result.isToxic,false);assert.equal(result.maskedText,question);assert.equal(result.riskType,'medical_emergency');assert.equal(result.detectedLevel,6);assert.equal(result.shouldHandover,true);
 result=evaluate(question+' địt',filters,[]);assert.equal(result.isToxic,true);assert.ok(result.maskedText.includes('chảy máu'));assert.ok(!result.maskedText.includes('địt'));assert.equal(result.worstAction,'warn');
 assert.equal(evaluate('tao sẽ đánh mày chảy máu',filters,[]).worstAction,'block');
 const prompts=[],configs=[],apiFile=path.resolve('api/admin-chat.js'),realRequire=createRequire(apiFile);
 const context={module:{exports:{}},exports:{},process:{env:{}},console,Date,Map,Set,Promise,setTimeout,clearTimeout,require:name=>name==='@google/generative-ai'?{GoogleGenerativeAI:class{getGenerativeModel(opts){prompts.push(opts.systemInstruction);configs.push(opts.generationConfig);return {generateContent:async()=>({response:{text:()=> 'Phản hồi kiểm tra.'}})};}}}:realRequire(name)};
 vm.createContext(context);vm.runInContext(fs.readFileSync(apiFile,'utf8'),context);
 const {createGenerator,createHandler}=context.module.exports;
 const generator=createGenerator({serviceClient:{rpc:async()=>({data:{configured:false},error:null})},environmentKey:()=> 'offline-test-key'});
 await generator(question,{},[],{audience:'customer'});await generator('Tổng đơn?',{},[]);
 assert.ok(prompts[0].includes('Bạn đang trả lời khách hàng'));assert.ok(!prompts[0].includes('Ghi tên nguồn bảng khi dùng dữ liệu'));
 assert.ok(prompts[1].includes('Ghi tên nguồn bảng khi dùng dữ liệu'));
 assert.equal(configs[0].responseMimeType,'application/json');assert.equal(configs[0].responseSchema.type,'object');assert.equal(configs[0].responseSchema.properties.understood.type,'boolean');assert.equal(configs[1].responseMimeType,undefined);
 const conversation=randomUUID(),owner=randomUUID(),written=[],modelCalls=[];
 const service={auth:{getUser:async()=>({data:{user:{id:'auth-owner'}}})},from(table){
  const data=()=>table==='customer'?{id:owner}:table==='chat_conversation'?{id:conversation,customer_id:owner,status:'bot_handling',updated_at:'2026-10-27T00:00:00Z'}:table==='chat_message'?null:table==='chatbot_profanity_filter'?filters:[];
  const q={select:()=>q,eq:()=>q,order:()=>q,limit:()=>q,maybeSingle:async()=>({data:data(),error:null}),then:resolve=>resolve({data:data(),error:null})};return q;
 },rpc:async(name,args)=>{written.push({name,args});return {data:{},error:null};}};
 const handler=createHandler({serviceClient:service,generateReply:async(...args)=>{modelCalls.push(args);return 'Theo chatbot_knowledge_faq, thông tin này cần được kiểm tra.';}});
 const res={statusCode:200,setHeader(){},status(code){this.statusCode=code;return this;},json(body){this.body=body;return this;}};
 const ordinaryQuestion='PawPal có những dịch vụ nào?';
 await handler({method:'POST',headers:{authorization:'Bearer offline'},socket:{remoteAddress:'offline'},body:{action:'public_send',conversationId:conversation,requestId:randomUUID(),question:ordinaryQuestion}},res);
 assert.equal(res.statusCode,200,JSON.stringify(res.body));assert.equal(written.length,1);assert.equal(written[0].args.p_content,ordinaryQuestion);assert.equal(written[0].args.p_toxic,false);assert.ok(!written[0].args.p_reply.includes('chatbot_knowledge_faq'));assert.ok(written[0].args.p_reply.includes('kho thông tin PawPal'));
 assert.equal(modelCalls[0][3].audience,'customer');assert.ok(!Object.hasOwn(modelCalls[0][1],'chatbot_knowledge_faq'));
 console.log('PASS symptoms remain readable and urgent; actual profanity/threats still filtered; public audience prompt/context and saved reply omit technical table name; internal source attribution retained. No external AI call or writes.');
 if(!process.argv.includes('--cloud'))return;
 const {connect}=require('../database/v1/service_import_connection.cjs');const db=await connect();try{
  const filters=(await db.query('SELECT keyword,replacement_text,action FROM public.chatbot_profanity_filter WHERE is_active ORDER BY id LIMIT 500')).rows;
  const result=evaluate(question,filters,[]);assert.equal(result.isToxic,false);assert.equal(result.maskedText,question);assert.equal(result.riskType,'medical_emergency');assert.equal(result.shouldHandover,true);
  fs.writeFileSync('docs/verification/sync/chat-clinical-terms-readonly.txt',JSON.stringify({timestamp:new Date().toISOString(),status:'PASS',checks:['Active Cloud filters preserve clinical observation','No false toxicity or masking','Urgency and handover retained'],scope:'Bounded moderation-rule read only; no messages/config changed; no AI calls or Logs'},null,2)+'\n');
  console.log('PASS current Cloud moderation rules: clinical phrase stays visible; urgency/handover retained. Read-only; no chat/config changes.');
 }finally{await db.end();}
})().catch(e=>{console.error(e.code||e.name,e.message);process.exitCode=1;});
