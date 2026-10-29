const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),{createRequire}=require('node:module'),path=require('node:path');
const {answer}=require('../api/admin_copilot.js');

test('actual Gemini request config requires explicit missing information and audience boundaries, offline',async()=>{
 const filename=path.resolve('api/admin-chat.js'),localRequire=createRequire(filename),captured=[];
 const sdk={GoogleGenerativeAI:class{
  getGenerativeModel(config){captured.push(config);return {generateContent:async(body)=>{
   const payload=JSON.parse(body);assert.equal(payload.context.faq[0].answer,'Chỉ giới thiệu các loại phòng.');
   return {response:{text:()=>payload.audience==='customer'?'{"reply":"Chưa đủ giá để so sánh.","understood":false}':'Chưa đủ giá để so sánh.'}};
  }};}
 }};
 const module={exports:{}};
 vm.runInNewContext(fs.readFileSync(filename,'utf8'),{module,exports:module.exports,require:name=>name==='@google/generative-ai'?sdk:localRequire(name),process:{env:{}},console,setTimeout,clearTimeout},{filename});
 const generate=module.exports.createGenerator({serviceClient:{rpc:async()=>({data:{configured:false}})},environmentKey:()=> 'offline-test-key'});
 for(const audience of ['staff','customer'])await generate('So sánh giá phòng thường và VIP',{faq:[{answer:'Chỉ giới thiệu các loại phòng.'}]},[],{audience});
 assert.equal(captured.length,2);
 for(const config of captured){
  assert.match(config.systemInstruction,/nêu rõ phần chưa đủ thông tin/);
  assert.match(config.systemInstruction,/không thay câu trả lời bằng lời hứa/);
  assert.match(config.systemInstruction,/không áp quy định riêng của một nhóm cho nhóm khác/);
  assert.match(config.systemInstruction,/chưa có thông tin xác nhận cho nhóm đó/);
 }
 assert.equal(captured[1].generationConfig.responseMimeType,'application/json');
});

test('blank FAQ answers do not authorize generation, with one bounded read and reported usage',async()=>{
 for(const items of [[],[{question:'Đặt lịch',answer:null}],[{answer:' \n\t '}]]){
  let reads=0;
  const r=await answer({question:'Đặt lịch PawPal như thế nào?',staff:{permissions:['chatbot_knowledge_faq.read']},caller:{rpc:async()=>{reads++;return {data:{intent:'knowledge.search',total:items.length,items,source:'chatbot_knowledge_faq'}};}},generateReply:()=>assert.fail('no usable FAQ means no model call')});
  assert.equal(reads,1);assert.equal(r.resource_usage.calls,1);assert.match(r.reply,/Chưa có hướng dẫn/);
 }
});

test('guidance forwards only usable FAQ answers without additional queries',async()=>{
 let reads=0,generations=0;
 const r=await answer({question:'Đặt lịch PawPal như thế nào?',staff:{permissions:['chatbot_knowledge_faq.read']},caller:{rpc:async()=>{reads++;return {data:{intent:'knowledge.search',total:2,items:[{answer:' '},{question:'Đặt lịch',answer:'Chọn dịch vụ và giờ phù hợp.'}]}};}},generateReply:async(q,c)=>{generations++;assert.equal(c.faq.length,1);assert.equal(c.faq[0].answer,'Chọn dịch vụ và giờ phù hợp.');return 'Chọn dịch vụ và giờ phù hợp.';}});
 assert.equal(reads,1);assert.equal(generations,1);assert.equal(r.resource_usage.calls,1);
});
