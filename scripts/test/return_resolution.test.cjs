const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('pages/user/modules/orders/return-detail.js','utf8').replace(/^import .*;\r?$/gm,'').replace(/^export /gm,'');
const context={window:{}};vm.createContext(context);vm.runInContext(source+'\nthis.normalize=normalizeReturnRequestRow;this.message=getReturnResolutionMessage;this.escape=escapeHtml;',context);
test('User keeps own return reason separate from Admin rejection explanation',()=>{
 const data=context.normalize({id:'return',request_status:'rejected',reason:'Customer request',resolution_type:'Admin explanation'});
 assert.equal(data.reason,'Customer request');assert.equal(data.resolution,'Admin explanation');assert.equal(context.message(data),'Admin explanation');
});
test('Admin explanation is escaped for timeline HTML',()=>{
 const payload='<img src=x onerror="alert(1)">';const text=context.escape(context.message({status:'rejected',resolution:payload}));
 assert.ok(!text.includes('<img'));assert.match(text,/&lt;img/);
});
test('Absent explanation or cancellation keeps generic text instead of technical resolution codes',()=>{
 const generic=context.message({status:'rejected'});assert.ok(generic.length>0);assert.equal(context.message({status:'cancelled',resolution:'internal-code'}),generic);
});
test('Replacement relation preserves order/tracking for object and array embeddings',()=>{
 const replacement={order_id:'replacement',kind:'resend',order:{id:'replacement',order_code:'RP-E2E',order_status:'shipped',tracking_code:'TRACK'}};
 for(const value of [replacement,[replacement]]){
  const data=context.normalize({id:'return',request_status:'completed',replacement:value});assert.equal(data.status,'completed');assert.equal(data.replacement.order_id,'replacement');assert.equal(data.replacement.order.tracking_code,'TRACK');
 }
 assert.equal(context.normalize({id:'return',replacement:[]}).replacement,undefined);
});
