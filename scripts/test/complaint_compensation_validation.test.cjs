const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('pages/admin/modules/complaints/complaints.js','utf8');
const ctx={PawpalComplaints:{}};vm.createContext(ctx);
vm.runInContext(source.slice(source.indexOf('    PawpalComplaints.validateCompensation ='),source.indexOf('    function getCurrentStaffName()')),ctx);
const mod=ctx.PawpalComplaints;
test('compensation reports the missing recipient before sending a request',()=>{
 for(const option of ['points','voucher']){
  const error=mod.validateCompensation({},{option,amount:10,voucher_code:'VALID'});
  assert.equal(error,'complaint_compensation_customer_required');assert.match(mod.errorMessage({message:error}),/chưa gắn tài khoản khách hàng/);
 }
});
test('points require a positive integer within the ledger range',()=>{
 for(const amount of [0,-1,1.5,NaN,Infinity,2147483648])assert.equal(mod.validateCompensation({customerId:'customer'},{option:'points',amount}),'complaint_points_invalid');
 for(const amount of [1,10,2147483647])assert.equal(mod.validateCompensation({customerId:'customer'},{option:'points',amount}),null);
});
test('voucher requires a code and valid proposals remain available',()=>{
 assert.equal(mod.validateCompensation({customerId:'customer'},{option:'voucher',voucher_code:' '}),'complaint_voucher_code_required');
 assert.equal(mod.validateCompensation({customerId:'customer'},{option:'voucher',voucher_code:'THANKYOU'}),null);
 assert.equal(mod.validateCompensation({},{option:'reject'}),null);
});
