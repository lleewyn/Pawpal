const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync('pages/admin/modules/chatbot/subtabs/tab-chatbot-live.js','utf8');
const start=source.indexOf('    function formatSlaInfo('),end=source.indexOf('    function updateSlaBadgesInDom',start);
const context={Date:class extends Date{static now(){return 1792983600000;}}};vm.createContext(context);vm.runInContext(source.slice(start,end)+';this.format=formatSlaInfo;',context);
test('SLA handles missing and invalid deadline without NaN',()=>{for(const slaDeadline of [null,'','bad-date'])assert.equal(context.format({slaDeadline}).text,'Chưa có hạn phản hồi');});
test('SLA countdown and overdue use server deadline without reads',()=>{assert.equal(context.format({slaDeadline:new Date(context.Date.now()+61000).toISOString()}).text,'Còn 1 phút 1 giây');assert.equal(context.format({slaDeadline:new Date(context.Date.now()-61000).toISOString()}).text,'Quá hạn 1 phút 1 giây');});
test('Closed or handed-over conversation does not display overdue countdown',()=>{assert.equal(context.format({status:'closed',slaDeadline:'bad'}).text,'Đã hoàn tất');assert.equal(context.format({isHandover:true,slaDeadline:'bad'}).text,'Đang tiếp nhận');});
