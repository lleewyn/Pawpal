const assert = require('node:assert/strict');
const { calculateVoucherPoints } = require('../api/customer_loyalty');
const { createCustomerLoyaltyService } = require('../api/customer_loyalty');

assert.equal(calculateVoucherPoints({ required_points: 100, discount_value: 50000, type: 'fixed' }), 100);
assert.equal(calculateVoucherPoints({ required_points: 0, discount_value: 50000, type: 'fixed' }), 100);
assert.equal(calculateVoucherPoints({ required_points: 0, discount_value: 15, type: 'percentage' }), 100);
assert.equal(calculateVoucherPoints({ required_points: 0, discount_value: 100000, type: 'giam_gia_co_dinh' }), 200);
console.log('PASS 4/4 quy tắc điểm đổi voucher');

class FakeQuery {
    constructor(table, calls, responses) { this.table = table; this.calls = calls; this.responses = responses; this.action = 'read'; this.payload = null; }
    select() { return this; }
    update(payload) { this.action = 'update'; this.payload = payload; return this; }
    insert(payload) { this.action = 'insert'; this.payload = payload; return this; }
    delete() { this.action = 'delete'; return this; }
    eq() { return this; }
    is() { return this; }
    limit() { return this; }
    order() { return this; }
    maybeSingle() { return this.finish('maybeSingle'); }
    single() { return this.finish('single'); }
    finish(terminal) {
        this.calls.push({ table: this.table, action: this.action, payload: this.payload, terminal });
        const response = this.responses.shift();
        if (!response) throw new Error(`Thiếu fake response cho ${this.table}.${this.action}`);
        return Promise.resolve(response);
    }
}

const calls = [];
const responses = [
    { data: { id: 'voucher-1', voucher_code: 'PAWFIRST10', voucher_name: 'Voucher chào bạn mới', discount_value: 50000, type: 'fixed', required_points: 0, is_active: true, usage_count: 2, max_usage: 20 }, error: null },
    { data: { id: 'member-1', total_paw_points: 250 }, error: null },
    { data: { id: 'member-1', total_paw_points: 150 }, error: null },
    { data: { id: 'rule-1' }, error: null },
    { data: { id: 'tx-1' }, error: null },
    { data: { id: 'customer-voucher-1', acquired_at: '2026-10-19T00:00:00Z', expired_at: null, voucher_status: 'AVAILABLE' }, error: null },
    { data: { id: 'voucher-1' }, error: null }
];
const fakeAdmin = { from: table => new FakeQuery(table, calls, responses) };

(async () => {
    const result = await createCustomerLoyaltyService(fakeAdmin).redeem('customer-1', { voucherCode: 'PAWFIRST10' });
    assert.equal(result.points, 150);
    assert.equal(result.transactionType, 'REDEEM');
    assert.equal(result.voucher.code, 'PAWFIRST10');
    const ledgerInsert = calls.find(call => call.table === 'paw_point_transaction' && call.action === 'insert');
    assert.equal(ledgerInsert.payload.points, -100);
    assert.equal(ledgerInsert.payload.balance_after, 150);
    assert.match(ledgerInsert.payload.description, /^\[REDEEM\]/);
    const walletInsert = calls.find(call => call.table === 'customer_voucher' && call.action === 'insert');
    assert.equal(walletInsert.payload.acquired_method, 'POINT_REDEMPTION');
    console.log('PASS giao dịch 250 -> 150, ledger -100 và thêm voucher vào ví');
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
