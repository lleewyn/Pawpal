const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const member=require('../api/chat_member.js'),{createHandler}=require('../../api/admin-chat.js');
test('member needs use closed scopes; public policy/questions do not trigger private reads',()=>{
 for(const [q,kind]of [['Tôi có lịch nào sắp tới?','appointments'],['Lịch hẹn của tôi hôm nay','appointments'],['Đơn hàng của tôi đang ở đâu?','orders'],['Tôi có những bé nào?','pets'],['Thông tin bé Miu','pets'],['Tôi còn bao nhiêu Paw Points?','loyalty'],['Tôi đang hạng nào?','loyalty']])assert.equal(member.plan(q).request.kind,kind,q);
 for(const q of ['Paw Points là gì?','Cần bao nhiêu điểm để lên hạng?','Giá tắm bé 7kg','PawPal ở đâu?'])assert.equal(member.plan(q),null,q);
 assert.equal(member.plan('Thông tin bé Miu').request.name,'Miu');assert.equal(member.plan('Lịch hẹn của tôi hôm nay').request.mode,'today');assert.equal(member.plan('Tôi có lịch nào sắp tới?').request.mode,'upcoming');
 assert.equal(member.plan('Tôi có đơn hàng nào?').request.kind,'orders');assert.equal(member.plan('Tôi đang ở hạng nào?').request.kind,'loyalty');
});
test('continuation/page/filter and ambiguous selection remain bounded and explicit',()=>{
 assert.deepEqual(member.plan('Xem tiếp',['Đơn hàng của tôi']).request,{kind:'orders',page:1});
 assert.equal(member.plan('Xem tiếp',['Xem tiếp','Đơn hàng của tôi']).request.page,2);
 assert.deepEqual(member.plan('Trang 3',['Lịch hẹn của tôi sắp tới']).request,{kind:'appointments',page:2,mode:'upcoming'});
 for(const q of ['Đơn hàng của tôi trang 101','Đơn hàng của tôi trang 0','Tôi có lịch và đơn hàng nào?','Lịch hẹn của tôi tháng trước'])assert.ok(member.plan(q).reply,q);
 assert.ok(member.plan('Đơn đầu tiên',['Đơn hàng của tôi']).reply);assert.ok(member.plan('Xem tiếp',['PawPal ở đâu?','Đơn hàng của tôi']).reply);
 assert.equal(member.plan('Xem đơn ORD-ABC').request.code,'ORD-ABC');
});
test('another person and requested writes do not become member read tools or mutations',()=>{
 for(const q of ['Đơn hàng của khách khác','Lịch hẹn của Lan','Điểm của Hùng','Doanh thu hôm nay'])assert.ok(member.plan(q).reply,q);
 assert.match(member.plan('Hủy đơn hàng của tôi').reply,/chưa thay đổi/);
});
test('formatter verifies owner/envelope, distinguishes paid amounts, and never invents tier',()=>{
 const id=randomUUID(),stamp=new Date().toISOString(),base={customer_id:'a',kind:'orders',page:0,items:[{id,code:'ORD-QA',status:'pending',created_at:stamp,total:100,paid:0,refunded:0}],has_more:true,as_of:stamp},route=member.plan('Đơn hàng của tôi');
 const answer=member.format(base,route,'a').reply;assert.match(answer,/Chờ xác nhận/);assert.match(answer,/Thanh toán thành công: 0 đ/);assert.doesNotMatch(answer,/Đã thanh toán đủ/);assert.match(answer,/trang 2/);assert.match(answer,/user#order-detail\?id=/);
 for(const data of [{...base,customer_id:'b'},{...base,items:Array(6).fill(base.items[0])},{...base,items:[{...base.items[0],paid:null}]}])assert.throws(()=>member.format(data,route,'a'));
 const loyalty=member.format({...base,kind:'loyalty',has_more:false,items:[{points:0,tier:null}]},member.plan('Điểm của tôi'),'a');assert.match(loyalty.reply,/0 Paw Points/);assert.match(loyalty.reply,/chưa thấy hạng/);
});
async function invoke({question='Đơn hàng của tôi',guest=false,other=false,sourceError,sourceOwner='owner',publicQuestion=false}={}){
 const id=randomUUID(),calls=[],writes=[],models=[];let callerToken;
 const service={auth:{getUser:async()=>({data:{user:{id:'auth'}}})},from(table){const q={select:()=>q,eq:()=>q,is:()=>q,gt:()=>q,maybeSingle:async()=>({data:table==='customer'?{id:'owner'}:table==='guest_session'?{id:'guest'}:table==='chat_conversation'?{id,customer_id:guest?null:other?'other':'owner',guest_session_id:guest?'guest':null,status:'bot_handling',updated_at:'now'}:null})};return q;},rpc:async(name,args)=>{calls.push(name);if(name==='read_public_chat_rules'||name==='read_public_guest_seed')return {data:{profanity:[],sentiment:[],recent_questions:[]}};if(name==='post_public_chat_message_media'){writes.push(args);return {data:{}};}if(name==='search_public_chat_context')return {data:{faq:[{question:'Giới thiệu chung',answer:'Thông tin công khai',complete:true}],recent:[{sender_type:'bot',content:'PRIVATE_ORDER_AND_PET_DETAILS_MUST_NOT_LEAVE'}],incomplete:false}};assert.fail('Service must not read member data: '+name);}};
 const handler=createHandler({serviceClient:service,createMemberCaller:token=>{callerToken=token;return {rpc:async(name,args)=>{calls.push(name);assert.equal(name,'read_member_chat_context');assert.ok(!Object.hasOwn(args,'customer_id'));return sourceError?{error:sourceError}:{data:{customer_id:sourceOwner,kind:'orders',page:0,items:[],has_more:false,as_of:new Date().toISOString()}};}};},generateReply:async(...args)=>{models.push(args);return '{"reply":"Thông tin công khai.","understood":true}';}});
 const res={statusCode:200,setHeader(){},status(n){this.statusCode=n;return this;},json(body){this.body=body;return this;}};
 await handler({method:'POST',headers:{'x-real-ip':randomUUID(),...(!guest?{authorization:'Bearer verified-member-jwt'}:{})},body:{action:'public_send',conversationId:id,requestId:randomUUID(),sessionToken:guest?'x'.repeat(40):undefined,question}},res);return {res,calls,writes,models,callerToken};
}
test('verified member reads one caller-JWT source; guest and another conversation owner never reach it',async()=>{
 const r=await invoke();assert.equal(r.res.statusCode,200);assert.equal(r.callerToken,'verified-member-jwt');assert.equal(r.calls.filter(x=>x==='read_member_chat_context').length,1);assert.equal(r.models.length,0);assert.equal(r.writes.length,1);
 const guest=await invoke({guest:true});assert.equal(guest.res.statusCode,200);assert.match(guest.writes[0].p_reply,/Đăng nhập/);assert.ok(!guest.calls.includes('read_member_chat_context'));
 const other=await invoke({other:true});assert.equal(other.res.statusCode,403);assert.equal(other.calls.length,0);
});
test('member source failure/mismatched owner never falls back to model or fabricated zero',async()=>{
 for(const opts of [{sourceError:{code:'57014'}},{sourceError:{code:'42501'}},{sourceOwner:'someone-else'}]){const r=await invoke(opts);assert.notEqual(r.res.statusCode,200);assert.equal(r.models.length,0);assert.equal(r.writes.length,0);}
});
test('subsequent public model question excludes entire member transcript',async()=>{
 const r=await invoke({question:'Một câu hỏi công khai chưa phân loại'});assert.equal(r.res.statusCode,200);assert.equal(r.models.length,1);assert.deepEqual(r.models[0][2],[]);assert.ok(!JSON.stringify(r.models).includes('PRIVATE_ORDER_AND_PET_DETAILS'));
});
