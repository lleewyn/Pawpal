// Read-only verification against the isolated restored V1 database.
const assert = require('node:assert/strict');
const { browserPage, service, ok, infra } = require('./customer_completion_helpers.cjs');

(async () => {
    const source = await ok(service.from('support_ticket').select('id,status,customer_id,assigned_staff_id'));
    const { browser, page } = await browserPage();
    try {
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        page.on('response', r => {
            if (r.url().includes('/rest/v1/') && r.status() >= 400) errors.push(`REST ${r.status()}`);
        });
        await page.locator('[data-title="Khiếu nại"]').click();
        await page.waitForFunction(() => window.PawpalComplaints?.state.isLoaded || window.PawpalComplaints?.state.loadError);
        const result = await page.evaluate(() => {
            const s = PawpalComplaints.state;
            return { loaded: s.isLoaded, error: s.loadError,
                rows: [...s.serviceComplaints, ...s.orderComplaints].map(t => ({
                    id: t.rawId, customerId: t.customerId, assigned: t.assigned_staff_id, status: t.status
                })) };
        });
        assert.equal(result.loaded, true, result.error);
        assert.deepEqual(result.rows.map(t => t.id).sort(), source.map(t => t.id).sort());
        for (const row of result.rows) {
            const original = source.find(t => t.id === row.id);
            assert.equal(row.customerId, original.customer_id);
            assert.equal(row.assigned, original.assigned_staff_id);
            if (original.status === 'resolved') assert.equal(row.status, 'resolved');
        }
        assert.deepEqual(errors, []);
        await page.screenshot({ path: infra + '/complaints-v1-read.private.png', fullPage: true });
        console.log(`PASS: ${source.length} database tickets; correct identities and no REST/browser errors.`);
    } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
