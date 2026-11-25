const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const source=fs.readFileSync('my-client/pages/admin/modules/complaints/complaints.js','utf8');
const code=source.slice(source.indexOf('    function calculateSla(item) {'),source.indexOf('    // K-02:'));
const context={PawpalComplaints:{},Date};vm.createContext(context);vm.runInContext(code,context);
test('priority, unresolved status, earliest deadline and stable identity determine ordering',()=>{
 const records=[
 {id:'closed',priority:'high',status:'closed',slaDueAt:'2026-01-01'},
 {id:'late-less',priority:'high',status:'new',slaDueAt:'2026-01-03'},
 {id:'urgent',priority:'khan_cap',status:'new',slaDueAt:'2026-01-05'},
 {id:'late-more',priority:'high',status:'processing',slaDueAt:'2026-01-02'},
 {id:'unknown',priority:'high',status:'new'},
 ];
 assert.deepEqual(records.sort(context.sortComplaintsByUrgencyAndSla).map(x=>x.id),['urgent','late-more','late-less','unknown','closed']);
 assert.ok(context.sortComplaintsByUrgencyAndSla({id:'a'},{id:'b'})<0);
});
test('saved deadline drives overdue labels while finished tickets remain finished',()=>{
 const ticket={status:'new',slaDueAt:new Date(Date.now()-7200000).toISOString()};context.calculateSla(ticket);assert.equal(ticket.slaStatus,'OVERDUE');assert.match(ticket.slaRemainingText,/Quá hạn 2 giờ/);
 ticket.status='resolved';context.calculateSla(ticket);assert.equal(ticket.slaStatus,'DONE');
});
