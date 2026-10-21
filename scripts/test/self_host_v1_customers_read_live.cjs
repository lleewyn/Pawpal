// Read-only browser verification against local V1; no business fixtures or writes.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium } = require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const infra = 'D:/Aboutme/Pawpal-infra/supabase-local';
const credentials = fs.readFileSync(infra + '/PAWPAL-ADMIN.private.txt', 'utf8');
(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
        const failures = [], cloud = [];
        page.on('response', r => { if (r.url().includes('/rest/v1/') && r.status() >= 400) failures.push(new URL(r.url()).pathname + ':' + new URL(r.url()).searchParams.get('select') + ':' + r.status()); });
        page.on('request', r => { if (new URL(r.url()).hostname.endsWith('.supabase.co')) cloud.push('cloud'); });
        await page.goto('http://localhost:3001/admin/login');
        await page.locator('#inputAdminEmail').fill(credentials.match(/^Email: (.+)$/m)[1]);
        await page.locator('#inputAdminPassword').fill(credentials.match(/^Password: (.+)$/m)[1]);
        await page.locator('#btnSubmitAdminLogin').click();
        await page.waitForURL('**/admin#tab-list');
        await page.waitForFunction(() => window.PawpalCustomers?.state.listLoadStatus === 'loaded');
        const checks = await page.evaluate(async () => {
            const mod = window.PawpalCustomers, db = window.getSupabaseClient();
            const customers = Object.values(mod.state.customerDatabase);
            const [base, phones, members, balances] = await Promise.all([
                db.from('customer').select('id,customer_status,contact_email'),
                db.from('customer_phone').select('customer_id,phone_number').eq('is_primary', true),
                db.from('customer_membership').select('customer_id,membership_tier:membership_tier_id(tier_name)'),
                db.from('customer_point_balance').select('customer_id,total_paw_points')
            ]);
            const errors = [base, phones, members, balances].filter(r => r.error).length;
            const mismatches = customers.filter(c => {
                const b = base.data.find(r => r.id === c.dbId);
                return !b || c.accountStatusRaw !== b.customer_status
                    || c.phone !== (phones.data.find(r => r.customer_id === c.dbId)?.phone_number || '\u2014')
                    || c.tierName !== (members.data.find(r => r.customer_id === c.dbId)?.membership_tier?.tier_name || 'Chưa có hạng')
                    || c.points !== Number(balances.data.find(r => r.customer_id === c.dbId)?.total_paw_points || 0);
            }).length;
            await mod.fetchPawpointLedger({ force: true });
            return { count: customers.length, sourceCount: base.data.length, errors, mismatches,
                points: customers.reduce((s, c) => s + c.points, 0),
                tiers: mod.state.membershipTiers.length, members: customers.filter(c => c.isMember).length,
                ledgerCount: mod.state.pawpointHistory.length, ledgerStatus: mod.state.pawpointLoadStatus,
                visibleRows: document.querySelectorAll('#customerTableTbody tr[data-id]').length };
        });
        assert.equal(checks.errors, 0); assert.equal(checks.count, checks.sourceCount);
        assert.equal(checks.count, 35); assert.equal(checks.mismatches, 0);
        assert.equal(checks.points, 7964); assert.equal(checks.ledgerCount, 14);
        assert.equal(checks.tiers, 4); assert.equal(checks.members, 22);
        assert.equal(checks.ledgerStatus, 'loaded'); assert.equal(checks.visibleRows, 10);
        await page.screenshot({ path: infra + '/verification/v1-customers-list.png', fullPage: true });
        await page.evaluate(() => { location.hash = 'tab-pawpoint'; });
        await page.locator('#pawpointHistoryTbody tr').first().waitFor();
        await page.screenshot({ path: infra + '/verification/v1-customers-pawpoints.png', fullPage: true });
        assert.deepEqual(failures, []); assert.deepEqual(cloud, []);
        console.log('PASS V1 customer list, phone, membership, balance, ledger and pagination match local database', checks);
    } finally { await browser.close(); }
})().catch(e => { console.error(e.message); process.exitCode = 1; });
