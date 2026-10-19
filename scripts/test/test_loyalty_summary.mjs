import test from 'node:test';
import assert from 'node:assert/strict';
import { eligibleSpend, loyaltySummary } from '../shared/loyalty-summary.mjs';
test('gold and diamond thresholds follow the approved spending rule', () => {
    assert.equal(loyaltySummary(4999999).tier, 'Bạc');
    assert.equal(loyaltySummary(5000000).tier, 'Vàng');
    assert.equal(loyaltySummary(7500000).tier, 'Vàng');
    assert.equal(loyaltySummary(14999999).tier, 'Vàng');
    assert.equal(loyaltySummary(15000000).tier, 'Kim Cương');
    assert.equal(loyaltySummary(18000000).progressPercent, 100);
});
test('3.5 million spend fills 70 percent toward gold', () => {
    assert.equal(loyaltySummary(3500000).progressPercent, 70);
    assert.equal(loyaltySummary(3500000).nextTierLimit, 5000000);
});
test('unpaid, cancelled and returned purchases do not raise spending', () => {
    assert.equal(eligibleSpend([
        { total_amount: 3500000, order_status: 'COMPLETED', payment_status: 'PAID' },
        { total_amount: 9000000, order_status: 'CANCELLED', payment_status: 'PAID' },
        { total_amount: 9000000, order_status: 'RETURNED', payment_status: 'PAID' },
        { total_amount: 9000000, order_status: 'DELIVERED', payment_status: 'PENDING' }
    ], [{ total_price: 1000000, appointment_status: 'COMPLETED', payment_status: 'PAID' }]), 4500000);
});
