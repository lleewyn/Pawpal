const test = require('node:test'), assert = require('node:assert/strict');
const B = require('../../my-client/pages/admin/modules/dashboard/subtabs/business-metrics.js');
const O = require('../../my-client/pages/admin/modules/dashboard/subtabs/operations-metrics.js');
const now = new Date('2026-11-21T10:00:00+07:00');
test('stored SLA overrides old 24/48 hour assumptions, including low priority', () => {
    const base = { status: 'processing', created_at: '2026-11-19T08:00:00+07:00', first_response_at: '2026-11-19T09:00:00+07:00' };
    const rows = [
        { ...base, id: 'urgent', priority: 'urgent', created_at: '2026-11-21T05:00:00+07:00', sla_due_at: '2026-11-21T09:00:00+07:00' },
        { ...base, id: 'low', priority: 'low', sla_due_at: '2026-11-22T08:00:00+07:00' },
        { ...base, id: 'missing', priority: 'normal', sla_due_at: null }
    ];
    const alerts = O.buildAlerts({ openTickets: rows, now });
    assert(!alerts.some(row => row.recordId === 'low'));
    assert.equal(alerts.find(row => row.recordId === 'urgent').severity, 'urgent');
    assert.match(alerts.find(row => row.recordId === 'missing').reason, /chưa có hạn/);
    assert.equal(alerts.find(row => row.recordId === 'urgent').dueAt, new Date(rows[0].sla_due_at).toISOString());
});
test('order processing age follows observed status transition, never general edits', () => {
    const base = { id: 'o', order_status: 'confirmed', created_at: '2026-11-01T00:00:00Z', updated_at: now.toISOString() };
    assert.match(O.buildAlerts({ activeOrders: [base], now })[0].reason, /chưa có mốc xác nhận/);
    const alerts = O.buildAlerts({ activeOrders: [{ ...base, status_started_at: '2026-11-21T05:00:00+07:00' }], now });
    assert.equal(alerts.length, 1); assert.equal(alerts[0].waitingHours, 5);
});
test('volume and average contributions add to exact value difference', () => {
    const parts = B.decompose({ count: 12, value: 3600 }, { count: 10, value: 2000 });
    assert.equal(parts.volume, 500); assert.equal(parts.average, 1100);
    assert.equal(parts.volume + parts.average, parts.difference);
    assert.equal(B.decompose({ count: 0, value: 0 }, { count: 10, value: 2000 }), null);
    const declining = B.decompose({ count: 4, value: -400 }, { count: 8, value: 1600 });
    assert.equal(declining.volume + declining.average, -2000);
});
test('analysis validates period, propagates permission denial and rejects incomplete aggregates', async () => {
    const range = B.period('2026-11-01', '2026-11-21');
    await assert.rejects(B.load({ rpc: async () => ({ error: { code: '42501' } }) }, 'analysis', range), e => e.code === '42501');
    await assert.rejects(B.load({ rpc: async () => ({ data: {} }) }, 'analysis', range), /invalid_response/);
    let called = false;
    await assert.rejects(B.load({ rpc: async () => { called = true; } }, 'analysis', { from: 'invalid', to: '2026-11-21' }));
    assert.equal(called, false);
});
