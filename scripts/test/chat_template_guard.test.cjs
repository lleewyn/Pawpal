const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('pages/admin/modules/chatbot/chatbot.js','utf8');
const context={window:{}};vm.runInNewContext(source.slice(0,source.indexOf('// Role-specific operations')),context);
const find=text=>Array.from(context.window.PawpalChatTemplateGuard.find(text));
test('unfilled customer, pet and order fields are detected before sending',()=>{
 assert.deepEqual(find('Xin chào [Tên khách hàng], bé [Tên thú cưng] có đơn [Mã đơn hàng].'),['[Tên khách hàng]','[Tên thú cưng]','[Mã đơn hàng]']);
 assert.deepEqual(find('[SỐ TIỀN] tại [Địa chỉ] lúc [Giờ hẹn]'),['[SỐ TIỀN]','[Địa chỉ]','[Giờ hẹn]']);
});
test('actual names, image-only messages and numbered citations remain allowed',()=>{
 for(const text of ['Chào chị Lan, bé Miu đã được tiếp nhận.','[Hình ảnh]','Tham khảo [1] và [2].','Nội dung [tham khảo]'])assert.deepEqual(find(text),[]);
});
test('repeated checks stay deterministic and duplicate fields appear once',()=>{
 for(let n=0;n<3;n++)assert.deepEqual(find('[Tên khách hàng] và [Tên khách hàng]'),['[Tên khách hàng]']);
 assert.deepEqual(find(null),[]);
});
test('admin composer preserves unfinished draft and does not call the send operation',async()=>{
 const live=fs.readFileSync('pages/admin/modules/chatbot/subtabs/tab-chatbot-live.js','utf8');
 const start=live.indexOf('async function sendLiveMsg()'),end=live.indexOf('let isLiveChatEventsInitialized',start);
 let sends=0,focused=false;const input={value:'Xin chào [Tên khách hàng]',disabled:false,focus(){focused=true;}},button={disabled:false};
 const conversation={id:'conversation-test'};
 const composer={window:context.window,document:{getElementById:id=>id==='chatMessageInput'?input:button},PawpalChatbot:{state:{currentConversation:conversation},showToast(){}},chatMediaDrafts:new Map(),pendingConversationOperations:new Set(),isSendingLiveMsg:false,ownsConversation:()=>true,operateConversation:async()=>{sends++;return true;}};
 vm.createContext(composer);vm.runInContext(live.slice(start,end),composer);
 await vm.runInContext('sendLiveMsg()',composer);assert.equal(sends,0);assert.equal(input.value,'Xin chào [Tên khách hàng]');assert(focused);
 input.value='Xin chào chị Lan';await vm.runInContext('sendLiveMsg()',composer);assert.equal(sends,1);assert.equal(input.value,'');
});
