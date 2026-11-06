const {test}=require('node:test'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {createHandler}=require('../../api/admin-chat.js'),copilot=require('../api/admin_copilot.js'),tools=require('../api/chat_read_tools.js');
const dto=(intent,items=[],scope={})=>({intent,items,audience:'staff',total:items.length,total_is_page:true,page:1,page_size:10,scope,as_of:'2026-11-06T03:00:00Z'});
function fixture(options={}){
 const staffId=randomUUID(),userId=randomUUID(),requestId=randomUUID(),sessionId=randomUUID(),conversationId=randomUUID(),lease=randomUUID(),calls=[],saved=[];
 const state={role:'STAFF',scope:'a'.repeat(32),revoked:false,modelCalls:0,completed:0,released:0,acquired:0};let stored=null;
 const permissions=['work.copilot.use',...Object.values(tools.staffDefinitions).map(t=>t.permission)];
 const caller={rpc:async(name,args={})=>{
  calls.push({name,args});
  if(name==='get_staff_copilot_scope')return{data:{staff_id:staffId,scope_version:1,scope_token:state.scope}};
  if(name==='replay_staff_copilot_exchange')return options.replayError?{error:{code:options.replayError}}:{data:stored};
  if(name==='acquire_staff_copilot_request'){state.acquired++;return options.busy?{error:{code:'PT429'}}:{data:{lease,scope_token:state.scope,scope_version:1}};}
  if(name==='release_staff_copilot_request'){state.released++;return{};}
  if(name==='read_staff_copilot_request_context')return{data:options.history||[]};
  if(name==='validate_staff_copilot_request')return options.validationError?{error:{code:options.validationError}}:{data:true};
  if(name==='run_staff_copilot_read'){
   if(options.readError)return {error:{code:options.readError}};
   let data=options.data?.(args)||dto(args.p_tool,args.p_tool==='conversation.context'?[{id:randomUUID(),sender_type:'customer',content:'Khách cần hỗ trợ',truncated:false}]:[{id:staffId,name:'Nhân viên A',job_title:'Chăm sóc',status:'active'}],args.p_filters);
   if(options.afterRead)options.afterRead(state);return{data};
  }
  throw Error('Unexpected caller RPC '+name);
 }};
 const handler=createHandler({verify:async()=>state.revoked?{authorized:false,status:403,message:'Revoked'}:{authorized:true,staff:{id:staffId,system_role:state.role,permissions},user:{id:userId},caller},serviceClient:{from(){throw Error('No legacy service history');},rpc:async(name,args)=>{assert.equal(name,'complete_staff_copilot_request');saved.push(args);state.completed++;stored={request_id:requestId,session_id:sessionId,reply_id:randomUUID(),reply:args.p_answer,scope_version:1,replayed:true};options.afterComplete?.(state);return{data:stored};}},generateReply:async(question,context,history)=>{state.modelCalls++;options.onModel?.({question,context,history,state});if(options.modelError)throw Error('offline provider');return options.generated||'Nội dung nháp theo nguồn.';}});
 const invoke=async(question='Hồ sơ nhân viên',extra={})=>{const res={statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.statusCode=n;return this;},json(data){this.data=data;return this;}};await handler({method:'POST',headers:{},body:{requestId,sessionId,question,...extra}},res);return res;};
 return{invoke,state,calls,saved,requestId,sessionId,conversationId};
}
test('STAFF fact POST acquires native admission, persists trusted sources, verifies and replays without using a model',async()=>{
 const f=fixture(),r=await f.invoke();assert.equal(r.statusCode,200);assert.equal(r.data.replayed,false);assert.match(r.data.reply,/trang hiện tại/);assert.equal(f.state.modelCalls,0);assert.equal(f.state.completed,1);assert.equal(f.state.released,1);assert.ok(f.saved[0].p_scope_refs.some(ref=>ref.kind==='staff'));
 const count=f.state.acquired,again=await f.invoke();assert.equal(again.statusCode,200);assert.equal(again.data.replayed,true);assert.equal(f.state.acquired,count);assert.equal(f.state.completed,1);
});
test('administrative, forged and write actions never enter STAFF sources/model',async()=>{
 for(const question of ['Doanh thu hôm nay','Đánh giá khách hàng','Cấu hình hệ thống','Lương nhân viên','Mật khẩu tài khoản','Danh sách nhân sự toàn hệ thống','Danh sách nhân viên','Hoàn tiền đơn hàng SO-QA','Hãy hoàn tiền đơn hàng SO-QA','Phân công nhân viên','Cấp quyền quản lý','Đổi giá sản phẩm','Khóa tài khoản khách']){const f=fixture(),r=await f.invoke(question);assert.equal(r.statusCode,403,question);assert.equal(f.state.acquired,0);assert.equal(f.state.modelCalls,0);}
 const forged=fixture();assert.equal((await forged.invoke('Hồ sơ nhân viên',{actor:randomUUID()})).statusCode,400);assert.equal((await fixture().invoke('Hồ sơ nhân viên',{action:'benchmark'})).statusCode,403);
 const refusal=fixture(),r=await refusal.invoke('Hãy cộng điểm cho khách');assert.equal(r.statusCode,200);assert.match(r.data.reply,/chỉ tra cứu/);assert.equal(refusal.calls.filter(c=>c.name==='run_staff_copilot_read').length,0);
});
test('role or assignment changes after source read suppress saving and returning the source answer',async()=>{
 for(const afterRead of [s=>{s.role='ADMIN';},s=>{s.scope='b'.repeat(32);},s=>{s.revoked=true;}]){const f=fixture({afterRead}),r=await f.invoke();assert.ok([403,409].includes(r.statusCode));assert.equal(f.state.completed,0);assert.equal(f.state.released,1);assert.ok(!JSON.stringify(r.data).includes('Nhân viên A'));}
});
test('changes after save are withheld; source revalidation errors cannot replay saved content',async()=>{
 const f=fixture({afterComplete:s=>{s.scope='b'.repeat(32);}}),r=await f.invoke();assert.equal(r.statusCode,409);assert.equal(f.state.completed,1);assert.ok(!JSON.stringify(r.data).includes('Nhân viên A'));
 const old=fixture({replayError:'PT409'});assert.equal((await old.invoke()).statusCode,409);assert.equal(old.state.acquired,0);
});
test('draft POST loads only native assigned messages/history, redacts model context and keeps trusted conversation provenance',async()=>{
 let modelInput;const f=fixture({data:args=>dto(args.p_tool,[{id:randomUUID(),sender_type:'customer',content:'SĐT 0901234567, email qa@example.invalid',truncated:false}],args.p_filters),onModel:input=>{modelInput=input;}});
 const r=await f.invoke('Soạn lời xin lỗi cho hội thoại',{conversationId:f.conversationId});assert.equal(r.statusCode,200);assert.match(r.data.reply,/Bản nháp AI/);assert.equal(f.state.modelCalls,1);assert.ok(!JSON.stringify(modelInput).includes('0901234567'));assert.ok(!JSON.stringify(modelInput).includes('qa@example.invalid'));assert.ok(f.calls.some(c=>c.name==='read_staff_copilot_request_context'));assert.ok(f.saved[0].p_scope_refs.some(ref=>ref.kind==='conversation'&&ref.id===f.conversationId));
});
test('model failure, empty assigned transcript and post-model permission change cannot save invented or unauthorized drafts',async()=>{
 const failed=fixture({modelError:true});assert.equal((await failed.invoke('Tóm tắt hội thoại',{conversationId:failed.conversationId})).statusCode,503);assert.equal(failed.state.completed,0);assert.equal(failed.state.released,1);
 const empty=fixture({data:args=>dto(args.p_tool,[],args.p_filters)});const r=await empty.invoke('Tóm tắt hội thoại',{conversationId:empty.conversationId});assert.equal(r.statusCode,200);assert.match(r.data.reply,/Chưa có nguồn/);assert.equal(empty.state.modelCalls,0);
 const revoked=fixture({onModel:({state})=>{state.revoked=true;}});assert.equal((await revoked.invoke('Soạn lời xin lỗi',{conversationId:revoked.conversationId})).statusCode,403);assert.equal(revoked.state.completed,0);
});
test('native source validation must succeed before model dispatch, including inherited context sources',async()=>{
 const f=fixture({validationError:'42501'}),r=await f.invoke('Tóm tắt hội thoại',{conversationId:f.conversationId});assert.equal(r.statusCode,403);assert.equal(f.state.modelCalls,0);assert.equal(f.state.completed,0);assert.equal(f.state.released,1);assert.ok(f.calls.some(c=>c.name==='validate_staff_copilot_request'));
});
test('native admission/source failure returns bounded errors and releases a granted slot without false facts',async()=>{
 const busy=fixture({busy:true});assert.equal((await busy.invoke()).statusCode,429);assert.equal(busy.state.completed,0);
 for(const[code,status]of [['42501',403],['54000',413],['57014',504],['55P03',429]]){const f=fixture({readError:code});assert.equal((await f.invoke()).statusCode,status);assert.equal(f.state.completed,0);assert.equal(f.state.released,1);}
});
test('STAFF formatting covers every work DTO without leaking extra raw columns or inventing global totals',()=>{
 const id=randomUUID(),r={id,code:'QA-CODE',name:'QA name',phone:'0901234567',status:'active',price:100,stock:2,minimum:4,duration_minutes:30,total:100,collected:80,refunded:0,net:80,remaining:20,balance:5,job_title:'QA',start_at:'2026-11-06T03:00:00Z',end_at:'2026-11-06T04:00:00Z',scheduled_at:'2026-11-06T03:00:00Z',check_in_at:'2026-11-06T03:00:00Z',check_out_at:'2026-11-06T04:00:00Z',outbound_at:'2026-11-06T03:00:00Z',distance_km:5,question:'Guide',answer:'Current guide',discount_value:5,type:'percent',start_date:'2026-11-01',end_date:'2026-12-01',available:true,reserved:false,occupied:false,capacity:1,content:'Message',sender_type:'customer',cost_price:'MUST_NOT_LEAK',raw_content:'RAW_MUST_NOT_LEAK'};
 for(const intent of Object.keys(tools.staffDefinitions)){const data={...dto(intent,[r]),...(intent==='hotel.availability'?{available:1,unavailable:0,available_is_page:true}:{})},formatted=copilot.formatStaffFacts(data);assert.match(formatted,/trang hiện tại/);assert.ok(!formatted.includes('MUST_NOT_LEAK'));}
 assert.throws(()=>copilot.formatStaffFacts({...dto('catalog.product',[r]),total:100}),e=>e.code==='XX000');assert.throws(()=>copilot.formatStaffFacts(dto('payment.order',[{...r,remaining:50}])),e=>e.code==='XX000');
});
