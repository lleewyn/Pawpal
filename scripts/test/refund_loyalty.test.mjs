import { test } from 'node:test';
import assert from 'node:assert/strict';
import { refundLoyaltyPreview as preview } from '../shared/refund-loyalty.mjs';
const payment = () => ({amount:100,eligible_spend_amount:90,transaction_status:'succeeded',refunds:[],loyalty:{reward_points:7,reversed_points:0,points_balance:7,history_conflict:false}});
test('cumulative rounding recovers every reward and eligible unit over three refunds',()=>{
 const p=payment();let points=0,eligible=0;
 for(const amount of [33,33,34]){const plan=preview(p,amount);assert.equal(plan.error,undefined);points+=plan.points;eligible+=plan.eligible;p.loyalty.reversed_points+=plan.points;p.loyalty.points_balance=plan.balance;p.refunds.push({refund_status:'succeeded',refunded_amount:amount,eligible_refund_amount:plan.eligible});}
 assert.equal(points,7);assert.equal(eligible,90);assert.equal(p.loyalty.points_balance,0);
});
test('spent points block refund, but a small refund with zero rounded reversal remains allowed',()=>{
 const p=payment();p.loyalty.points_balance=0;assert.match(preview(p,100).error,/không đủ điểm/);assert.equal(preview(p,1).points,0);
});
test('legacy mismatches, missing metadata and over-refunds fail closed',()=>{
 const p=payment();p.refunds.push({refund_status:'succeeded',refunded_amount:50,eligible_refund_amount:45});assert.match(preview(p,1).error,/chưa khớp/);assert.match(preview(p,51).error,/vượt/);delete p.loyalty;assert.ok(preview(p,1).error);
});
test('exact integer arithmetic for large amounts and no reward payment',()=>{
 const p=payment();p.amount=99999999999;p.eligible_spend_amount=99999999998;p.loyalty.reward_points=2147483647;p.loyalty.points_balance=2147483647;
 const result=preview(p,99999999998);assert.equal(result.points,2147483646);assert.equal(result.eligible,99999999997);
 p.loyalty.reward_points=0;p.loyalty.points_balance=0;assert.equal(preview(p,1).points,0);
});
test('negative, fractional, nonnumeric and unsafe values cannot produce a plan',()=>{
 for(const amount of [-1,0,1.5,'invalid',Infinity,Number.MAX_SAFE_INTEGER+1])assert.ok(preview(payment(),amount).error);
});
