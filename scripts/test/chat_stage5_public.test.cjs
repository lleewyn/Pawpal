const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {createHandler}=require('../../api/admin-chat.js');
async function invoke({faq=[],recent=[],recentQuestions,age=0,incomplete=false,error,other=false,guest=false,mediaAssetIds=[],profanity=[],question='Quy định chương trình chưa phân loại'}={}){
 const id=randomUUID(),calls=[],models=[],saved=[];
 const updatedAt=recentQuestions?new Date(Date.now()-age).toISOString():'2026-10-30T00:00:00Z';
 const service={auth:{getUser:async()=>({data:{user:{id:'auth'}}})},from(table){const q={select:()=>q,eq:()=>q,is:()=>q,gt:()=>q,maybeSingle:async()=>({data:table==='guest_session'?{id:'guest'}:table==='customer'?{id:'owner'}:table==='chat_conversation'?{id,customer_id:guest?null:other?'someone-else':'owner',guest_session_id:guest?'guest':null,status:'ai_handling',updated_at:updatedAt}:null})};return q;},rpc:async(name,args)=>{calls.push({name,args});if(name==='read_public_chat_rules'||name==='read_public_guest_seed')return {data:{profanity,sentiment:[],recent_questions:name==='read_public_guest_seed'?recentQuestions:undefined}};if(name==='public_chat_membership')return {data:!guest};if(name==='search_public_chat_context')return error?{error}:{data:{faq,recent,incomplete}};if(name==='post_public_chat_message_media'){saved.push(args);return {data:{}};}assert.fail(name);}};
 const handler=createHandler({serviceClient:service,generateReply:async(...args)=>{models.push(args);return JSON.stringify({reply:'Thông tin đã xác nhận.',understood:true});}}),res={statusCode:200,setHeader(){},status(n){this.statusCode=n;return this;},json(data){this.data=data;return this;}};
 await handler({method:'POST',headers:{...(!guest?{authorization:'Bearer local'}:{}),'x-real-ip':randomUUID()},body:{action:'public_send',conversationId:id,requestId:randomUUID(),sessionToken:guest?'g'.repeat(32):undefined,question,mediaAssetIds}},res);
 return {res,calls,models,saved,id};
}
test('eligible members send images to staff without invoking the text model; guests see the membership gate',async()=>{
 const ids=[randomUUID()],question='Ảnh bé cần nhân viên xem';
 const member=await invoke({mediaAssetIds:ids,question});
 assert.equal(member.res.statusCode,200);assert.equal(member.models.length,0);assert.equal(member.saved[0].p_handover,true);assert.deepEqual(member.saved[0].p_assets,ids);assert.match(member.saved[0].p_reply,/chưa phân tích/);assert.equal(member.saved[0].p_guest_hash,null);
 const guest=await invoke({guest:true,mediaAssetIds:ids,question});
 assert.equal(guest.res.statusCode,403);assert.equal(guest.res.data.code,'MEMBERSHIP_REQUIRED');assert.equal(guest.models.length,0);assert.equal(guest.saved.length,0);
});
test('urgent pet questions prioritize veterinary care for both guests and members',async()=>{
 for(const guest of [false,true])for(const question of [
  'Be nha toi kho tho, tho gap',
  'Bé mệt mỏi và khó đánh thức',
  'Bé không đứng dậy được',
  'Bé không thể đứng dậy'
 ]){
  const r=await invoke({guest,question});
  assert.equal(r.res.statusCode,200);
  assert.match(r.saved[0].p_reply,/^Bạn hãy liên hệ ngay bác sĩ thú y/);
  assert.equal(r.saved[0].p_handover,!guest);
  assert.equal(r.models.length,0);
 }
 const r=await invoke({guest:true,question:'Bé nhà tôi bỏ ăn hai ngày'});
 assert.equal(r.res.statusCode,200);
 assert.equal(r.saved[0].p_level,3);
 assert.match(r.saved[0].p_reply,/^Thấy bé có biểu hiện khác thường, bạn lo là điều dễ hiểu/);
 assert.match(r.saved[0].p_reply,/bác sĩ thú y.*các biểu hiện bắt đầu lúc nào.*lần cuối bé ăn hoặc uống.*bé có nôn hay không/);
 assert.match(r.saved[0].p_reply,/khó thở, khó đánh thức hoặc không đứng dậy được.*cấp cứu thú y ngay/);
 assert.doesNotMatch(r.saved[0].p_reply,/sau khi tắm|đừng quá lo/i);
 assert.equal(r.models.length,0);
 const afterBath=await invoke({guest:true,question:'Bé cún mệt mỏi và biếng ăn sau khi tắm.'});
 assert.equal(afterBath.saved[0].p_level,3);
 assert.match(afterBath.saved[0].p_reply,/^PawPal hiểu vì sao bạn lo khi thấy bé mệt và ăn ít sau buổi tắm/);
});
test('standalone greetings use level 1 and leave an actual request to its normal route',async()=>{
 const greeting=await invoke({guest:true,question:'Chào PawPal!'});
 assert.equal(greeting.saved[0].p_level,1);
 assert.equal(greeting.saved[0].p_reply,'Chào bạn! PawPal có thể giúp gì cho bạn và bé hôm nay?');
 assert.equal(greeting.models.length,0);
 const thanks=await invoke({guest:true,question:'Cảm ơn PawPal!'});
 assert.equal(thanks.saved[0].p_level,1);
 assert.match(thanks.saved[0].p_reply,/^PawPal vui vì được giúp bạn/);
 const question=await invoke({guest:true,question:'Chào PawPal, tôi còn bao nhiêu Paw Points?'});
 assert.equal(question.saved[0].p_level,2);
 assert.match(question.saved[0].p_reply,/hồ sơ riêng/);
});
test('urgent guidance remains visible even when the accompanying text is blocked',async()=>{
 const profanity=[{keyword:'từ cấm',action:'block'}];
 const blocked=await invoke({guest:true,question:'Từ cấm',profanity});
 assert.equal(blocked.res.statusCode,400);
 assert.match(blocked.res.data.error,/gửi lại nội dung sự việc/);
 const urgent=await invoke({guest:true,question:'Bé khó thở. Từ cấm',profanity});
 assert.equal(urgent.res.statusCode,400);
 assert.match(urgent.res.data.error,/^Bạn hãy liên hệ ngay bác sĩ thú y/);
 assert.equal(urgent.saved.length,0);
 assert.equal(urgent.models.length,0);
});
test('a health thread responds to new details and keeps urgent advice when the guest follows up',async()=>{
 const original='Bé cún mệt mỏi và biếng ăn sau khi tắm.';
 const update='Bé vừa nôn một lần.';
 const related=await invoke({guest:true,question:update,recentQuestions:[original]});
 assert.equal(related.saved[0].p_level,3);
 assert.match(related.saved[0].p_reply,/^Bạn báo thêm cho bác sĩ là bé đã nôn một lần/);
 assert.doesNotMatch(related.saved[0].p_reply,/bao nhiêu lần/);
 assert.doesNotMatch(related.saved[0].p_reply,/PawPal hiểu|mã lịch hẹn/);
 assert.equal(related.models.length,0);
 assert.equal(related.calls[0].name,'read_public_guest_seed');
 assert.equal(related.calls[0].args.p_conversation,related.id);
 const noVomiting=await invoke({guest:true,question:'Bé không có nôn.',recentQuestions:[original]});
 assert.doesNotMatch(noVomiting.saved[0].p_reply,/bé đã nôn/);
 const another=await invoke({guest:true,question:'Mình vẫn lo.',recentQuestions:[update,original]});
 assert.match(another.saved[0].p_reply,/^Khi gọi bác sĩ thú y.*đã thay đổi/);
 const urgent=await invoke({guest:true,question:'Bé khó thở.',recentQuestions:[update,original]});
 assert.equal(urgent.saved[0].p_level,6);
 assert.match(urgent.saved[0].p_reply,/^Bạn hãy liên hệ ngay bác sĩ thú y/);
 const continuedUrgency=await invoke({guest:true,question:'Mình nên làm gì bây giờ?',recentQuestions:['Bé khó thở.',update,original]});
 assert.equal(continuedUrgency.saved[0].p_level,6);
 assert.equal(continuedUrgency.saved[0].p_handover,false);
 assert.match(continuedUrgency.saved[0].p_reply,/^Bạn liên hệ ngay bác sĩ thú y.*thay đổi mới nhất/);
 const unclear=await invoke({guest:true,question:'Mình lo quá.',recentQuestions:[]});
 assert.match(unclear.saved[0].p_reply,/Bạn có thể kể ngắn điều vừa xảy ra/);
 assert.doesNotMatch(unclear.saved[0].p_reply,/bác sĩ thú y/);
});
test('support follow-ups advance the current request without assuming a prior topic after a change',async()=>{
 const question='Mình đã gửi yêu cầu rồi.';
 const recentQuestions=['Tôi bị trừ tiền hai lần'];
 const guest=await invoke({guest:true,question,recentQuestions});
 assert.match(guest.saved[0].p_reply,/^Bạn có thể \[đăng nhập\].*yêu cầu vừa gửi/);
 assert.doesNotMatch(guest.saved[0].p_reply,/trừ tiền hai lần|bạn lo là điều dễ hiểu/);
 const member=await invoke({question,recentQuestions});
 assert.match(member.saved[0].p_reply,/^Bạn có thể mở mục \[Hỗ trợ\]/);
 assert.doesNotMatch(member.saved[0].p_reply,/\[đăng nhập\]/);
 assert.equal(member.models.length,0);
 for(const options of [{age:31*60*1000},{recentQuestions:['PawPal mở cửa mấy giờ?',...recentQuestions]},{recentQuestions:[]}]){
  const unrelated=await invoke({guest:true,question,recentQuestions,...options});
  assert.doesNotMatch(unrelated.saved[0].p_reply,/bổ sung trong cùng yêu cầu/);
 }
 const switchTopic=await invoke({guest:true,question:'Bé bị trầy xước sau khi cắt tỉa.',recentQuestions});
 assert.match(switchTopic.saved[0].p_reply,/^PawPal rất tiếc khi biết bé bị trầy/);
 const separateOrder=await invoke({guest:true,question:'Đơn khác của tôi cũng bị trừ tiền hai lần.',recentQuestions});
 assert.match(separateOrder.saved[0].p_reply,/^Thấy tiền bị trừ hai lần/);
});
test('anger prompts a useful next step without repeating the first apology or claiming a guest handoff',async()=>{
 const first=await invoke({guest:true,question:'Tôi tức giận quá!'});
 assert.equal(first.saved[0].p_level,5);
 assert.equal(first.saved[0].p_handover,false);
 assert.match(first.saved[0].p_reply,/bức xúc.*kể ngắn chuyện vừa xảy ra/);
 assert.doesNotMatch(first.saved[0].p_reply,/đăng nhập|đã chuyển/);
 const continued=await invoke({guest:true,question:'Tôi vẫn tức giận lắm. Tôi đã gửi yêu cầu rồi.',recentQuestions:['Tôi tức giận vì bị trừ tiền hai lần']});
 assert.equal(continued.saved[0].p_level,5);
 assert.equal(continued.saved[0].p_handover,false);
 assert.match(continued.saved[0].p_reply,/xem tình trạng của yêu cầu vừa gửi/);
 assert.doesNotMatch(continued.saved[0].p_reply,/rất tiếc|bạn bức xúc|hãy tạo|đã chuyển/i);
 const negated=await invoke({guest:true,question:'Tôi không tức giận. Tôi bị trừ tiền hai lần.'});
 assert.equal(negated.saved[0].p_level,4);
 assert.doesNotMatch(negated.saved[0].p_reply,/chuyện này khiến bạn bức xúc/);
 const otherPerson=await invoke({guest:true,question:'Nếu người khác tức giận thì sao?'});
 assert.equal(otherPerson.saved[0].p_level,2);
});
test('multiple contextual clues recognize a frustrated guest without asserting their emotion',async()=>{
 const original='Hẹn 2 giờ mà 3 giờ rồi vẫn chưa tới đón bé. Tôi gọi mấy lần không ai nghe.';
 const first=await invoke({guest:true,question:original});
 assert.equal(first.saved[0].p_level,5);
 assert.equal(first.saved[0].p_handover,false);
 assert.match(first.saved[0].p_reply,/^PawPal rất tiếc vì bạn đã phải chờ quá giờ hẹn/);
 assert.match(first.saved[0].p_reply,/ghi thời gian đã hẹn cùng lần liên hệ gần nhất/);
 assert.doesNotMatch(first.saved[0].p_reply,/bức xúc|tức giận|đã chuyển/);
 assert.equal(first.models.length,0);
 const followed=await invoke({guest:true,question:'Lần thứ ba rồi, vẫn không ai xử lý.',recentQuestions:[original]});
 assert.equal(followed.saved[0].p_level,5);
 assert.match(followed.saved[0].p_reply,/bổ sung lần liên hệ gần nhất vào yêu cầu đó/);
 assert.doesNotMatch(followed.saved[0].p_reply,/rất tiếc|bức xúc/);
 const lackingTopic=await invoke({guest:true,question:'Lần thứ ba rồi, vẫn không ai xử lý.',recentQuestions:[]});
 assert.match(lackingTopic.saved[0].p_reply,/kể ngắn chuyện vừa xảy ra/);
 const firstDisappointed=await invoke({guest:true,question:'làm ăn gì kì v',recentQuestions:[]});
 assert.match(firstDisappointed.saved[0].p_reply,/PawPal rất tiếc/);
 for(const nextTurn of ['h sao','giờ sao','bực','tức quá']){
  const repeatCheck=await invoke({guest:true,question:nextTurn,recentQuestions:['làm ăn gì kì v']});
  assert.doesNotMatch(repeatCheck.saved[0].p_reply,/rất tiếc/i,nextTurn);
  assert.match(repeatCheck.saved[0].p_reply,/\/login|\/contact/);
  assert.equal(repeatCheck.models.length,0,nextTurn);
 }
 const memberRepeat=await invoke({guest:false,question:'bực quá',recentQuestions:['làm ăn gì kì v']});
 assert.doesNotMatch(memberRepeat.saved[0].p_reply,/rất tiếc/i);
 assert.equal(memberRepeat.saved[0].p_handover,true);
 const echoedService={auth:{getUser:async()=>({data:{user:{id:'auth'}}})},from(table){const q={select:()=>q,eq:()=>q,is:()=>q,gt:()=>q,maybeSingle:async()=>({data:table==='guest_session'?{id:'guest'}:table==='chat_conversation'?{id:randomUUID(),customer_id:null,guest_session_id:'guest',status:'bot_handling',updated_at:new Date().toISOString()}:null})};return q;},rpc:async(name,args)=>{if(name==='read_public_chat_rules'||name==='read_public_guest_seed')return {data:{profanity:[],sentiment:[],recent_questions:[]}};if(name==='search_public_chat_context')return {data:{faq:[{question:'Chính sách',answer:'Áp dụng theo điều kiện.'}],recent:[{sender_type:'bot',content:'PawPal rất tiếc vì trải nghiệm chưa làm bạn hài lòng. Bạn có thể kể ngắn chuyện vừa xảy ra để bên mình hướng dẫn bước tiếp theo không?'}],incomplete:false}};if(name==='post_public_chat_message_media'){echoedSaved.push(args);return {data:{}}; }assert.fail(name);}};
 const echoedSaved=[],echoedHandler=createHandler({serviceClient:echoedService,generateReply:async()=>JSON.stringify({reply:'PawPal rất tiếc vì trải nghiệm chưa làm bạn hài lòng. Bạn có thể kể ngắn chuyện vừa xảy ra để bên mình hướng dẫn bước tiếp theo không?',understood:false})});
 const echoedRes={statusCode:200,setHeader(){},status(n){this.statusCode=n;return this;},json(data){this.data=data;return this;}};
 await echoedHandler({method:'POST',headers:{'x-real-ip':randomUUID()},body:{action:'public_send',conversationId:randomUUID(),requestId:randomUUID(),sessionToken:'g'.repeat(32),question:'Có áp dụng không?',mediaAssetIds:[]}},echoedRes);
 assert.equal(echoedRes.statusCode,200);assert.doesNotMatch(echoedSaved[0].p_reply,/rất tiếc/i);
 const dogComplaint=await invoke({guest:true,question:'nghĩ sao mà làm con chó tôi ra nông nỗi v',recentQuestions:[]});
 assert.doesNotMatch(dogComplaint.saved[0].p_reply,/khả dụng|phòng hoặc khung giờ/i);
 assert.match(dogComplaint.saved[0].p_reply,/\/user#support-create/);
 assert.equal(dogComplaint.saved[0].p_level,5);
 const dogComplaintAfterUpset=await invoke({guest:true,question:'nghĩ sao mà làm con chó tôi ra nông nỗi v',recentQuestions:['làm ăn gì kì v']});
 assert.doesNotMatch(dogComplaintAfterUpset.saved[0].p_reply,/rất tiếc/i);
 assert.match(dogComplaintAfterUpset.saved[0].p_reply,/\/user#support-create/);
 const stillChecksRoom=await invoke({guest:true,question:'Spa còn chỗ không?',recentQuestions:[]});
 assert.match(stillChecksRoom.saved[0].p_reply,/khả dụng/);
 for(const question of ['Đơn hàng của tôi đang ở đâu???','Mình gọi hai lần rồi.']){
  const neutral=await invoke({guest:true,question});
  assert.equal(neutral.saved[0].p_level,2);
  assert.equal(neutral.saved[0].p_handover,false);
 }
});
test('a guest with an order code gets the appropriate verification paths without a private lookup',async()=>{
 const r=await invoke({guest:true,question:'Mình có mã đơn rồi, vẫn cần đăng nhập để kiểm tra đơn của mình không?'});
 assert.match(r.saved[0].p_reply,/Mã đơn giúp xác định đơn hàng/);
 assert.match(r.saved[0].p_reply,/\[Tra cứu đơn hàng\]\(\/return-guest\).*xác minh số điện thoại/);
 assert.match(r.saved[0].p_reply,/\[đăng nhập\]\(\/login\)/);
 assert.equal(r.saved[0].p_understood,false);
 assert.equal(r.models.length,0);
 assert.ok(r.calls.every(call=>['read_public_chat_rules','post_public_chat_message_media'].includes(call.name)));
});
test('guest gets both booking rules when asking about an account and a booking for two pets',async()=>{
 const question='Tôi chưa có tài khoản và nuôi hai bé. Tôi được đặt và có thể gộp hai bé trong một lượt không?';
 const faq=[
  {question:'Tôi có được đặt lịch mà chưa có tài khoản không?',answer:'Bạn có thể đặt mà không cần tài khoản.',complete:true},
  {question:'Tôi có thể đặt lịch cho nhiều bé không?',answer:'Mỗi yêu cầu chỉ chọn một bé.',complete:true}
 ];
 for(const rows of [faq,faq.slice(0,1)]){
  const r=await invoke({guest:true,question,faq:rows});
  assert.equal(r.res.statusCode,200);
  assert.deepEqual(r.calls.filter(c=>c.name==='search_public_chat_context').map(c=>c.args.p_question),faq.map(row=>row.question));
  assert.match(r.saved[0].p_reply,/không cần tài khoản/);
  assert.match(r.saved[0].p_reply,rows.length===2?/chỉ chọn một bé/:/chưa xác nhận được cách đặt lịch/);
  assert.equal(r.saved[0].p_understood,rows.length===2);
  assert.equal(r.models.length,0);
 }
});
test('malformed or excessive chat attachments fail before generation or message writes',async()=>{
 for(const ids of [[randomUUID(),randomUUID(),randomUUID(),randomUUID()],['invalid'],null]){const r=await invoke({mediaAssetIds:ids===null?'invalid':ids});assert.equal(r.res.statusCode,400);assert.equal(r.models.length,0);assert.equal(r.saved.length,0);}
});
test('public search receives only verified conversation and current question, one context RPC',async()=>{const r=await invoke({faq:[{question:'Giờ mở cửa',answer:'Theo thông báo cửa hàng.'}]});assert.equal(r.res.statusCode,200);assert.deepEqual(r.calls.map(c=>c.name),['read_public_chat_rules','search_public_chat_context','post_public_chat_message_media']);assert.equal(r.calls[1].args.p_conversation,r.id);assert.equal(r.calls[1].args.p_question,'Quy định chương trình chưa phân loại');assert.equal(r.models.length,1);assert.equal(r.models[0][3].audience,'customer');});
test('no relevant FAQ skips model and persists honest clarification for existing handover counter',async()=>{const r=await invoke();assert.equal(r.res.statusCode,200);assert.equal(r.models.length,0);assert.equal(r.saved[0].p_understood,false);assert.match(r.saved[0].p_reply,/chưa có đủ thông tin/);});
test('other owner cannot search FAQ or history through this conversation',async()=>{const r=await invoke({other:true});assert.equal(r.res.statusCode,403);assert.equal(r.calls.length,0);assert.equal(r.models.length,0);});
test('source errors do not fall back to legacy bulk FAQ or model',async()=>{for(const code of ['57014','PT429','54000']){const r=await invoke({error:{code}});assert.notEqual(r.res.statusCode,200);assert.equal(r.models.length,0);assert.equal(r.saved.length,0);assert.ok(!r.calls.some(c=>c.name==='read_public_chat_context'));}});
test('excess source rows or bytes rejected before model',async()=>{for(const opts of [{faq:Array(6).fill({question:'q',answer:'a'})},{recent:Array(9).fill({})},{faq:[{question:'q',answer:'🙂'.repeat(10000)}]}]){const r=await invoke(opts);assert.equal(r.res.statusCode,503);assert.equal(r.models.length,0);}});
test('incomplete FAQ skips model and saves a helpful continuation without technical implementation terms',async()=>{const r=await invoke({faq:[{question:'Đổi trả',answer:'Có thể đổi trả'}],incomplete:true});assert.equal(r.res.statusCode,200);assert.equal(r.models.length,0);assert.equal(r.saved[0].p_understood,false);assert.match(r.saved[0].p_reply,/Gặp chuyên viên/);assert.doesNotMatch(r.saved[0].p_reply,/đoạn trích|vượt phần chat|bytes|token|nội dung đầy đủ/);assert.equal(r.calls.filter(c=>c.name==='search_public_chat_context').length,1);});
test('complete FAQ remains usable when an unrelated long FAQ was excluded',async()=>{const r=await invoke({faq:[{question:'Chuẩn bị',answer:'Mang thông tin bé.',complete:true},{question:'Đổi trả',answer:'Excerpt'}],incomplete:true});assert.equal(r.res.statusCode,200);assert.equal(r.models.length,1);assert.deepEqual(r.models[0][1].thongTinPawpal,[{question:'Chuẩn bị',answer:'Mang thông tin bé.'}]);});
test('invalid completeness metadata fails before model or save',async()=>{for(const incomplete of [null,'false',0]){const r=await invoke({incomplete});assert.equal(r.res.statusCode,503);assert.equal(r.models.length,0);assert.equal(r.saved.length,0);}});
test('missing runtime RPC returns non-retryable 503 without exposing schema details',async()=>{const r=await invoke({error:{code:'PGRST202'}});assert.equal(r.res.statusCode,503);assert.equal(r.res.data.retryable,false);assert.doesNotMatch(r.res.data.error,/RPC|schema|search_public/);assert.equal(r.models.length,0);assert.equal(r.saved.length,0);});
test('verified guest can ask public points/order/availability guidance without being denied as private data',async()=>{
 for(const [question,canonical] of [['Paw Points là gì?','Paw Points là gì?'],['Cách tra cứu mã đơn','Tôi xem trạng thái đơn hàng ở đâu?'],['Có còn hàng không?',null]]){const r=await invoke({guest:true,question,faq:[{question:canonical,answer:'Hướng dẫn công khai đã có nguồn.',complete:true}]});assert.equal(r.res.statusCode,200);assert.equal(r.models.length,0,question);assert.doesNotMatch(r.saved[0].p_reply,/hồ sơ riêng/);}
 const privateRequest=await invoke({guest:true,question:'Tôi còn bao nhiêu Paw Points?'});assert.equal(privateRequest.res.statusCode,200);assert.equal(privateRequest.models.length,0);assert.equal(privateRequest.calls.filter(c=>c.name==='search_public_chat_context').length,0);assert.match(privateRequest.saved[0].p_reply,/hồ sơ riêng/);
});
