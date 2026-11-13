const { test } = require('node:test');
const assert = require('node:assert/strict');
const M = require('../../pages/admin/modules/dashboard/subtabs/business-metrics.js');

test('returning cohort combines order and appointment, deduplicates and excludes cancelled', () => {
    const order = { id: 'same-id', customer_id: 'a', order_status: 'completed' };
    assert.deepEqual(M.returningCustomers([order, order, { id: '2', customer_id: 'b', order_status: 'delivered' }, { id: '3', customer_id: 'b', order_status: 'cancelled' }], [
        { id: 'same-id', customer_id: 'a', appointment_status: 'completed' },
        { id: '4', customer_id: 'c', appointment_status: 'pending' }
    ]), { eligible: 2, returning: 1, rate: 50 });
    assert.deepEqual(M.returningCustomers([], []), { eligible: 0, returning: 0, rate: null });
    assert.deepEqual(M.returningCustomers([order], []), { eligible: 1, returning: 0, rate: 0 });
});

test('business metrics use bounded aggregate RPCs with validated Vietnam dates',async()=>{
 const calls=[],db={from(){throw Error('raw table read');},rpc:async(name,args)=>{calls.push({name,args});return {data:args.p_key==='customers'?[{registered_at:'2026-11-01',count:23}]:{eligible:2,returning:1,rate:50}};}};
 const range=M.period('2026-11-01','2026-11-11');
 await M.load(db,'returning',range);const rows=await M.load(db,'customers',range);assert.equal(M.customerCount(rows),23);
 assert.deepEqual(calls[0],{name:'admin_business_metric',args:{p_key:'returning',p_from:'2026-11-01',p_to:'2026-11-11'}});
 await assert.rejects(()=>M.load(db,'customers',{from:'2026-11-11',to:'2026-11-01'}));assert.equal(calls.length,2);
 const ranked=[{aggregate:true,id:'a',name:'A',quantity:2,value:100},{aggregate:true,id:'b',name:'B',quantity:3,value:80}];assert.equal(M.rank(ranked,'products')[0].id,'a');assert.equal(M.rank(ranked,'products','quantity')[0].id,'b');
});

test('Vietnam date boundary, leap day, equivalent previous period and invalid filters', () => {
    assert.equal(M.dayKey('2026-11-10T17:01:00Z'), '2026-11-11');
    const p = M.period('2024-02-29', '2024-03-01');
    assert.equal(p.length, 2); assert.equal(p.previousFrom, '2024-02-27'); assert.equal(p.previousTo, '2024-02-28');
    assert.throws(() => M.period('2026-02-30', '2026-03-01'));
    assert.throws(() => M.period('2026-11-11', '2026-11-10'));
    assert.throws(() => M.period('2026-01-01', '2026-12-31'));
});
test('cash totals preserve partial refunds, negative net and zero baseline', () => {
    assert.deepEqual(M.totals([{ collected: '100', refunded: '25' }, { collected: 0, refunded: 90 }]), { collected: 100, refunded: 115, net: -15 });
    assert.deepEqual(M.totals([]), { collected: 0, refunded: 0, net: 0 });
    assert.equal(M.growth(20, 0), null); assert.equal(M.growth(20, -20), 200);
    assert.throws(() => M.totals([{ collected: null, refunded: 0 }]));
});
test('source classification excludes failed payments and retains ambiguous targets', () => {
    assert.deepEqual(M.sources([
        { amount: 100, transaction_status: 'succeeded', order_id: 'o' },
        { amount: 30, transaction_status: 'succeeded', appointment_id: 'a' },
        { amount: 7, transaction_status: 'succeeded', order_id: 'o', appointment_id: 'a' },
        { amount: 3, transaction_status: 'succeeded' },
        { amount: 999, transaction_status: 'failed', order_id: 'o' }
    ]), { products: 100, services: 30, other: 10 });
});
test('rank counts each line once and subtracts line discount once', () => {
    const row = { id: '1', product_variant_id: 'p', quantity: 2, unit_price: 50, discount_amount: 10, product_name_snapshot: 'A' };
    const result = M.rank([row, row, { ...row, id: '2', quantity: 1 }], 'products');
    assert.equal(result[0].quantity, 3); assert.equal(result[0].value, 130);
    assert.deepEqual(M.rank([{ ...row, service_id: 's', status: 'cancelled' }], 'services'), []);
});
test('weekly aggregation preserves total cash and refunds', () => {
    const days = [{ day: '2026-11-09', collected: 50, refunded: 20 }, { day: '2026-11-10', collected: 40, refunded: 0 }];
    assert.deepEqual(M.bucket(days, 'week'), [{ day: '2026-11-09', collected: 90, refunded: 20, net: 70 }]);
});
test('90 day RPC chunks cover dates once and reject incomplete data', async () => {
    const calls = [];
    const db = { rpc: async (name, args) => {
        calls.push(args); const length = M.period(args.p_from, args.p_to).length;
        return { data: { undated_receipts: 0, undated_refunds: 0, days: Array.from({ length }, (_, i) => ({ day: M.shift(args.p_from, i), collected: 10, refunded: 2 })) } };
    } };
    const data = await M.cashflow(db, M.period('2026-08-14', '2026-11-11'));
    assert.equal(data.days.length, 90); assert.equal(new Set(data.days.map(d => d.day)).size, 90);
    assert.equal(data.net, 720); assert.equal(calls.length, 3);
    await assert.rejects(() => M.cashflow({ rpc: async () => ({ data: { days: [] } }) }, M.period('2026-11-11', '2026-11-11')));
});
test('pagination reads every page and propagates permission errors', async () => {
    const data = await M.readAll(() => ({ order() { return this; }, async range(start) { return { data: Array.from({ length: start === 0 ? 500 : 2 }, (_, i) => ({ id: start + i })) }; } }));
    assert.equal(data.length, 502);
    await assert.rejects(() => M.readAll(() => ({ order() { return this; }, range() { return { error: { code: '42501' } }; } })));
});
