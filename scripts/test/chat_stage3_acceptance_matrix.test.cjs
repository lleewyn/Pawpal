// Curated offline acceptance matrix. Fixtures exist only in tests, never runtime.
const {test}=require('node:test'),assert=require('node:assert/strict');
const {plan,answer,formatFacts}=require('../api/admin_copilot.js'),{definitions,createReadBudget}=require('../api/chat_read_tools.js');
const now=new Date('2026-10-29T03:00:00Z'),lease='10000000-0000-4000-8000-000000000001';
const permissions=[...new Set([...Object.values(definitions).flatMap(t=>t.permissions),'service_price_matrix.read','hotel_room_type.read','taxi_price_rule.read','service_addon.read'])];
const id='10000000-0000-4000-8000-000000000002',revision='a'.repeat(32);
const comparable=filters=>Object.fromEntries(Object.entries(filters||{}).map(([key,value])=>[key,typeof value==='string'?value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d'):value]));
const cases=[
 ['appointment.list',['Lịch Spa hôm nay','Lich Spa hom nay'],{code:'QA-LICH',status:'confirmed',scheduled_at:now.toISOString(),services:'Spa'},'QA-LICH'],
 ['inventory.low_stock',['Sản phẩm tồn kho thấp','San pham ton kho thap'],{name:'QA tồn',sku:'QA-SKU',stock:2,minimum:5},'QA-SKU'],
 ['ticket.open',['Khiếu nại chưa kết thúc','Khieu nai chua ket thuc'],{code:'QA-TICKET',subject:'QA hỗ trợ',status:'open',priority:1},'QA-TICKET'],
 ['customer.lookup',['Khách hàng: CUS-001','Khach hang: CUS-001'],{code:'CUS-001',name:'QA chủ',phone:'',status:'active'},'CUS-001'],
 ['order.lookup',['Đơn hàng: ORD-001','Don hang: ORD-001'],{code:'ORD-001',status:'pending',shipping_status:'pending'},'ORD-001'],
 ['catalog.product',['Sản phẩm: QA-SKU','San pham: QA-SKU'],{code:'QA',name:'QA hàng',sku:'QA-SKU',variant:'QA',price:10000},'QA-SKU'],
 ['catalog.service',['Dịch vụ: QA-SPA','Dich vu: QA-SPA'],{code:'QA-SPA',name:'QA dịch vụ',description:'QA mô tả'},'QA-SPA'],
 ['catalog.service_price',['Giá dịch vụ Spa','Gia dich vu Spa'],{code:'QA-SPA',name:'QA Spa',prices:[{kind:'service',weight_from:0,weight_to:5,price:10000}]},'QA-SPA'],
 ['revenue.summary',['Thực thu hôm nay','Thuc thu hom nay'],null,'10.000'],
 ['knowledge.search',['PawPal chấp nhận thẻ không?','PawPal chap nhan the khong?'],{question:'QA câu hỏi',answer:'QA nguồn FAQ'},'QA nguồn FAQ'],
 ['customer.pets',['Thú cưng của khách: CUS-001','Thu cung cua khach: CUS-001'],{code:'QA-PET',name:'QA bé',breed:'QA giống',owner:'QA chủ'},'QA-PET'],
 ['pet.lookup',['Thú cưng: PET-001','Thu cung: PET-001'],{code:'PET-001',name:'QA bé',breed:'QA giống'},'PET-001'],
 ['payment.order',['Thanh toán đơn: ORD-001','Thanh toan don: ORD-001'],{code:'ORD-001',collected:10000,refunded:2000,net:8000,pending_refunds:1},'8.000'],
 ['order.refund_pending',['Đơn hủy chưa hoàn','Don huy chua hoan'],{code:'ORD-001',collected:10000,refunded:2000,net:8000,pending_refunds:1},'ORD-001'],
 ['appointment.search',['Lịch Spa chiều mai chưa có KTV','Lich Spa chieu mai chua co KTV'],{code:'QA-CHIEU',status:'pending',scheduled_at:now.toISOString(),services:'QA Spa'},'QA-CHIEU'],
 ['ticket.lookup',['Khiếu nại: TK-001','Khieu nai: TK-001'],{code:'TK-001',name:'QA hỗ trợ',status:'open'},'TK-001'],
 ['conversation.list',['Hội thoại chờ nhân viên','Hoi thoai cho nhan vien'],{code:'QA-CHAT',name:'QA khách',status:'waiting_agent'},'QA-CHAT'],
 ['points.lookup',['Pawpoint: CUS-001','Số dư điểm: CUS-001'],{code:'CUS-001',name:'QA khách',balance:125},'125'],
 ['offer.list',['Ưu đãi đang hiệu lực','Uu dai dang hieu luc'],{code:'QA-OFFER',name:'QA ưu đãi',status:'active'},'QA-OFFER'],
 ['staff.lookup',['Nhân viên đang làm việc','Nhan vien dang lam viec'],{code:'QA-STAFF',name:'QA nhân viên',status:'active'},'QA-STAFF'],
 ['staff.schedule',['Lịch trực tuần này','Lich truc tuan nay'],{code:'QA-SHIFT',name:'QA nhân viên',status:'active',start_at:now.toISOString(),end_at:new Date(+now+3600000).toISOString()},'QA-SHIFT'],
 ['review.list',['Đánh giá thấp tháng này','Danh gia thap thang nay'],{code:'QA-REVIEW',rating:2,status:'published',excerpt:'QA nội dung'},'QA-REVIEW'],
 ['content.list',['Bài viết đã đăng','Bai viet da dang'],{code:'QA-BLOG',name:'QA bài viết',status:'published'},'QA-BLOG'],
 ['report.operations',['Báo cáo vận hành tuần này','Bao cao van hanh tuan nay'],{code:'orders_created',name:'Đơn được tạo',count:4},'4'],
 ['settings.read',['Giờ mở cửa','Gio mo cua'],{code:'weekday_open',value:'08:00'},'08:00'],
 ['content.read',[`Nội dung bài viết: ${id}`,`Noi dung bai viet: ${id}`],{code:id,name:'QA đầy đủ',status:'published',body:'QA toàn văn',part:1,parts:1,revision,has_more:false},'QA toàn văn'],
 ['review.read',[`Nội dung đánh giá: ${id}`,`Noi dung danh gia: ${id}`],{code:id,name:'QA đánh giá',status:'published',body:'QA toàn văn',part:1,parts:1,revision,has_more:false},'QA toàn văn'],
 ['catalog.price_rows',['Bảng giá chi tiết Spa 5kg: QA-SPA','Bang gia chi tiet Spa 5kg: QA-SPA'],{kind:'service',weight_from:0,weight_to:10,price:10000},'10.000']
];
function facts(intent,row,empty=false){return {intent,total:empty?0:1,items:empty||!row?[]:[row],page:1,pages:1,scope:{},source:'QA scoped source',as_of:now.toISOString(),limitations:[],...(intent==='revenue.summary'?{collected:empty?0:10000,refunded:0,net:empty?0:10000}:{})};}
function invoke(question,rights,run){return answer({question,now,staff:{permissions:rights},readBudget:createReadBudget({lease}),caller:{rpc:run},generateReply:()=>assert.fail('deterministic data must not call a model')});}

test('matrix covers every public business read tool; internal and context tools have separate suites',()=>{
 assert.deepEqual(cases.map(c=>c[0]).sort(),Object.keys(definitions).filter(k=>!definitions[k].internal&&!['history.context','conversation.context'].includes(k)).sort());
});
for(const [intent,questions,row,marker]of cases){
 test(intent+': accented and unaccented questions keep the same filters and render source data',async()=>{
  let expected;
  for(const question of questions){const route=plan(question,now);assert.equal(route.intent,intent,question);if(expected)assert.deepEqual(comparable(route.filters),expected);expected=comparable(route.filters);
   let reads=0;const r=await invoke(question,permissions,async(name,args)=>{reads++;assert.equal(args.p_tool,intent);return {data:facts(intent,row)};});
   assert.equal(reads,1);assert.equal(r.resource_usage.calls,1);assert.equal(r.source,'QA scoped source');assert.ok(r.reply.includes(marker),r.reply);assert.doesNotMatch(r.reply,/NaN|Invalid Date|undefined/);
  }
 });
 test(intent+': empty data stays empty and does not call AI',async()=>{let reads=0;const r=await invoke(questions[0],permissions,async()=>{reads++;return {data:facts(intent,row,true)};});assert.equal(reads,1);assert.equal(r.facts.total,0);assert.equal(r.facts.items.length,0);assert.equal(r.resource_usage.calls,1);});
 test(intent+': removing any required base permission denies before reading',async()=>{for(const denied of definitions[intent].permissions)await assert.rejects(()=>invoke(questions[0],permissions.filter(p=>p!==denied),()=>assert.fail('permission before RPC')),e=>e.code==='42501');});
 test(intent+': source timeout and source permission error never become a zero answer',async()=>{for(const code of ['57014','42501']){let reads=0;await assert.rejects(()=>invoke(questions[0],permissions,async()=>{reads++;return {error:{code}};}),e=>e.code===code);assert.equal(reads,1);}});
}

test('missing identifiers and invalid dates clarify without a source or model call',async()=>{
 for(const question of ['Khách hàng','Đơn hàng','Thú cưng','Pawpoint','Thanh toán đơn','Nội dung bài viết','Nội dung đánh giá','Bảng giá chi tiết Spa','Lịch Spa chiều 31/02/2026']){
  const r=await invoke(question,permissions,()=>assert.fail('clarify before DB'));assert.equal(r.answer_type,'clarify',question);assert.ok(r.reply.length>0);
 }
});

test('malformed quantitative source values cannot render as zero, NaN or an invented balance',()=>{
 for(const intent of ['payment.order','order.refund_pending','points.lookup','report.operations','review.list','catalog.price_rows']){
  const original=cases.find(c=>c[0]===intent)[2];
  const field=intent==='points.lookup'?'balance':intent==='report.operations'?'count':intent==='review.list'?'rating':intent==='catalog.price_rows'?'price':'collected';
  for(const value of [null,undefined,'',false,'not-a-number'])assert.throws(()=>formatFacts(facts(intent,{...original,[field]:value})),Error,intent+' '+String(value));
 }
});

test('financial rows reject inconsistent arithmetic and invalid counters or rating ranges',()=>{
 const payment=cases.find(c=>c[0]==='payment.order')[2];
 assert.throws(()=>formatFacts(facts('payment.order',{...payment,net:999})),/invalid_stage3_amount/);
 for(const pending_refunds of [-1,0.5,null,Number.MAX_SAFE_INTEGER+1])assert.throws(()=>formatFacts(facts('payment.order',{...payment,pending_refunds})),/invalid_stage3_number/);
 for(const rating of [0,6,2.5])assert.throws(()=>formatFacts(facts('review.list',{code:'QA',rating})),/invalid_stage3_number/);
 assert.throws(()=>formatFacts(facts('report.operations',{name:'QA',count:-1})),/invalid_stage3_number/);
});

test('valid zero values, string numerics and signed ledger balances remain valid facts',()=>{
 const r=formatFacts(facts('payment.order',{code:'QA',collected:'0',refunded:'1',net:'-1',pending_refunds:0}));assert.ok(r.includes('đã thu 0 đ'));assert.ok(r.includes('chênh lệch -1 đ'));
 assert.ok(formatFacts(facts('points.lookup',{code:'QA',name:'QA',balance:-3})).includes('-3 điểm'));
 assert.ok(formatFacts(facts('points.lookup',{code:'QA',name:'QA',balance:'0'})).includes('0 điểm'));
});

test('API rejects malformed payment facts without saving a false answer and releases its lease',async()=>{
 const {createHandler}=require('../../api/admin-chat.js'),{randomUUID}=require('node:crypto');let reads=0,saves=0,releases=0;
 const caller={rpc:async(name)=>{if(name==='acquire_admin_chat_read')return {data:lease};if(name==='release_admin_chat_read'){releases++;return {data:null};}assert.equal(name,'run_admin_stage3_read');reads++;return {data:facts('payment.order',{code:'ORD-001',collected:null,refunded:0,net:0,pending_refunds:0})};}};
 const service={from(){const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:null})};return q;},rpc:()=>{saves++;assert.fail('malformed facts cannot be saved');}};
 const handler=createHandler({verify:async()=>({authorized:true,staff:{id:randomUUID(),permissions:[...permissions,'admin_copilot_history.write']},user:{id:randomUUID()},caller}),serviceClient:service,generateReply:()=>assert.fail('no model for payment facts')});
 const res={statusCode:200,setHeader(){},status(n){this.statusCode=n;return this;},json(value){this.data=value;return this;}};
 await handler({method:'POST',headers:{},body:{requestId:randomUUID(),sessionId:randomUUID(),question:'Thanh toán đơn: ORD-001'}},res);
 assert.equal(res.statusCode,503);assert.equal(res.data.ok,false);assert.equal(reads,1);assert.equal(saves,0);assert.equal(releases,1);
});
