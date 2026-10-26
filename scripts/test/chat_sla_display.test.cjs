const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync('pages/admin/modules/chatbot/subtabs/tab-chatbot-live.js','utf8');
const start=source.indexOf('    function formatSlaInfo('),end=source.indexOf('    function updateSlaBadgesInDom',start);
const context={Date:class extends Date{static now(){return 1792983600000;}}};vm.createContext(context);vm.runInContext(source.slice(start,end)+';this.format=formatSlaInfo;',context);
test('SLA handles missing and invalid deadline without NaN',()=>{for(const slaDeadline of [null,'','bad-date'])assert.equal(context.format({slaDeadline}).text,'Chưa có hạn phản hồi');});
test('SLA countdown and overdue use server deadline without reads',()=>{assert.equal(context.format({slaDeadline:new Date(context.Date.now()+61000).toISOString()}).text,'Còn 1 phút 1 giây');assert.equal(context.format({slaDeadline:new Date(context.Date.now()-61000).toISOString()}).text,'Quá hạn 1 phút 1 giây');});
test('Closed or handed-over conversation does not display overdue countdown',()=>{assert.equal(context.format({status:'closed',slaDeadline:'bad'}).text,'Đã hoàn tất');assert.equal(context.format({isHandover:true,slaDeadline:'bad'}).text,'Đang tiếp nhận');});
test('Immediate deadline remains a real countdown, then becomes overdue',()=>{
 assert.equal(context.format({slaDeadline:new Date(context.Date.now()).toISOString()}).text,'Còn 0 phút 0 giây');
 assert.equal(context.format({slaDeadline:new Date(context.Date.now()-1000).toISOString()}).text,'Quá hạn 0 phút 1 giây');
});
test('Rule table displays zero seconds without treating it as an absent SLA',()=>{
 const rules=fs.readFileSync('pages/admin/modules/chatbot/subtabs/tab-chatbot-rules.js','utf8');
 const start=rules.indexOf('    function formatHandoverSlaSeconds('),end=rules.indexOf('    let rulesFaqData',start);
 assert.ok(start>0&&end>start);vm.runInContext(rules.slice(start,end)+';this.ruleSeconds=formatHandoverSlaSeconds;',context);
 assert.equal(context.ruleSeconds(0),'0 giây');assert.equal(context.ruleSeconds(120),'120 giây');
 for(const value of [null,undefined,'',NaN,-1,1.5,'<img src=x>'])assert.equal(context.ruleSeconds(value),'—');
});
