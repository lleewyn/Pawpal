'use strict';
// Focused form evidence only: real scoped reads, no service-record writes or testcase replay.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { chromium } = require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const { connect } = require('../../my-server/scripts/database/v1/service_import_connection.cjs');
async function main() {
    const db = await connect(), browser = await chromium.launch({ channel: 'chrome', headless: true });
    const folder = 'docs/verification/staff-intake-checklist'; fs.mkdirSync(folder, { recursive: true });
    try {
        await db.query("BEGIN READ ONLY; SET LOCAL statement_timeout='10s'");
        const actor = (await db.query(`SELECT a.id appointment_id, s.id, s.auth_user_id, s.full_name
            FROM public.appointment a JOIN public.staff s ON s.id=a.staff_id
            JOIN public.staff_role r ON r.staff_id=s.id AND r.role_code='STAFF'
            WHERE a.appointment_status IN ('confirmed','checked_in','in_progress')
            AND s.auth_user_id IS NOT NULL AND s.employment_status='active' AND NOT s.must_change_password
            ORDER BY (a.appointment_code='BKG-2D41B195C96B48569CA9F24AFBAB5F12') DESC, a.updated_at DESC LIMIT 1`)).rows[0];
        assert.ok(actor, 'An existing assigned appointment is required');
        await db.query("SELECT set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role','authenticated',true)", [actor.auth_user_id]);
        await db.query('SET LOCAL ROLE authenticated');
        const page = await browser.newPage({ viewport: { width: 1100, height: 1280 } }), errors = [];
        page.on('pageerror', error => errors.push(error.message));
        const source = fs.readFileSync('my-client/pages/admin/modules/services/services.js', 'utf8');
        const marker = source.indexOf("overlay.id = 'staffIntakeModal'"), start = source.lastIndexOf('(function () {', marker), end = source.indexOf('})();', source.indexOf('window.PawpalStaffIntake=Object.freeze', marker)) + 5;
        await page.route('http://localhost/**', async route => {
            const name = decodeURIComponent(new URL(route.request().url()).pathname);
            if (name === '/') return route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body class="admin-body"></body></html>' });
            const target = path.resolve('.' + name);
            if (!target.startsWith(process.cwd() + path.sep) || !fs.existsSync(target)) return route.abort();
            return route.fulfill({ contentType: target.endsWith('.css') ? 'text/css' : 'application/javascript', body: fs.readFileSync(target) });
        });
        await page.exposeFunction('readRpc', async (name, args) => {
            assert.ok(['get_staff_workspace', 'list_intake_media'].includes(name), 'Only read RPCs allowed');
            if (name === 'get_staff_workspace') return { data: (await db.query('SELECT public.get_staff_workspace($1,$2,$3,$4) value', [args.p_kind, args.p_query, args.p_id, args.p_page])).rows[0].value };
            return { data: (await db.query('SELECT public.list_intake_media($1) value', [args.p_appointment])).rows[0].value };
        });
        await page.goto('http://localhost/');
        for (const file of ['admin.css','admin-components.css','admin-typography.css']) await page.addStyleTag({ url: '/pages/admin/' + file });
        await page.evaluate(actor => {
            window.PawpalAdminAccess = { isStaff: () => true, state: { user: { id: actor.id, name: actor.full_name, permissions: ['work.service.perform'] } } };
            window.getSupabaseClient = () => ({ rpc: (name, args) => readRpc(name, args) });
        }, actor);
        await page.addScriptTag({ content: source.slice(start, end) });
        await page.evaluate(id => PawpalStaffIntake.open({ appointmentId: id }), actor.appointment_id);
        await page.waitForFunction(() => !document.querySelector('#staffIntakeSave').disabled);
        assert.equal(await page.locator('.workspace-intake-choices input').count(), 17);
        assert.equal(await page.locator('.workspace-intake-choices input:checked').count(), 0);
        await page.locator('#staffIntakeskin input').nth(0).check();
        await page.locator('#staffIntakeskin input').nth(1).check();
        assert.equal(await page.locator('#staffIntakeskin input').nth(0).isChecked(), false);
        await page.locator('#staffIntakeskin input').nth(2).check();
        assert.equal(await page.locator('#staffIntakeskin input:checked').count(), 2);
        await page.locator('#staffIntakeskin input').nth(0).check();
        assert.equal(await page.locator('#staffIntakeskin input:checked').count(), 1);
        await page.locator('#staffIntakeeyes input').nth(1).check();
        await page.locator('#staffIntakeeyes input').nth(0).check();
        assert.equal(await page.locator('#staffIntakeeyes input:checked').count(), 1);
        await page.locator('#staffIntakewounds input').nth(0).check();
        await page.locator('#staffIntaketemperament input').nth(0).check();
        await page.locator('#staffIntakebelongings input').nth(0).check();
        await page.locator('#staffIntakeConfirmed').check();
        await page.locator('#staffIntakeTitle').click();
        await page.screenshot({ path: folder + '/desktop.png' });
        await page.setViewportSize({ width: 390, height: 844 });
        const card = page.locator('#staffIntakeModal .admin-modal-card');
        await card.evaluate(node => node.scrollTop = 0);
        await page.screenshot({ path: folder + '/mobile-top.png' });
        assert.ok(await card.evaluate(node => node.scrollWidth <= node.clientWidth), 'No horizontal overflow');
        await page.locator('#staffIntakeSave').scrollIntoViewIfNeeded();
        await page.screenshot({ path: folder + '/mobile-bottom.png' });
        await page.getByRole('button', { name: 'Hủy', exact: true }).click();
        await page.evaluate(id => PawpalStaffIntake.open({ appointmentId: id }), actor.appointment_id);
        await page.waitForFunction(() => !document.querySelector('#staffIntakeSave').disabled);
        assert.equal(await page.locator('.workspace-intake-choices input:checked').count(), 0, 'Reopening resets observations');
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('#staffIntakeModal').getAttribute('aria-hidden'), 'true');
        assert.deepEqual(errors, []);
        fs.writeFileSync(folder + '/verification.txt', 'PASS: Actual STAFF intake form with live role-scoped read-only database context.\nPASS: 17 matching Admin choices; no preselected observations; normal/abnormal exclusivity; multiple abnormal observations; reset on reopen; Escape and cancel; no horizontal mobile overflow; no JavaScript errors.\nNo save RPC called, no database writes, no complete testcase replay. Screenshots document local form changes, not deployed production behavior.\n');
        console.log('PASS: focused checklist UI and screenshots; no database writes');
    } finally { await db.query('ROLLBACK'); await db.end(); await browser.close(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
