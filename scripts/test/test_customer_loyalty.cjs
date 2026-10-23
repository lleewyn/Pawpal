const assert=require('node:assert/strict');
const {calculateVoucherPoints,createCustomerLoyaltyService}=require('../api/customer_loyalty');
assert.equal(calculateVoucherPoints({required_points:100}),100);
for(const value of [0,-1,null,undefined,1.5])assert.equal(calculateVoucherPoints({required_points:value,discount_value:50000}),null);
(async()=>{await assert.rejects(createCustomerLoyaltyService({}).redeem('owner',{}));console.log('PASS configured points only; incomplete legacy redemption rejected.');})().catch(e=>{console.error(e.message);process.exitCode=1;});
