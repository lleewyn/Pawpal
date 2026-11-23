'use strict';
// Evidence for the reported appointment only. No assignment, shift changes or testcase replay.
const fs = require('node:fs'), assert = require('node:assert/strict');
const { chromium } = require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const { connect } = require('../database/v1/service_import_connection.cjs');
async function main() {
    const db = await connect(), browser = await chromium.launch({ channel: 'chrome', headless: true });
    const folder = 'docs/verification/admin-dispatch-readonly'; fs.mkdirSync(folder, { recursive: true });
    try {
        await db.query("BEGIN READ ONLY; SET LOCAL statement_timeout='10s'");
        const original = (await db.query(`SELECT a.id, a.appointment_code, a.appointment_status,
            a.staff_id, p.pet_name, to_char(a.scheduled_start_at AT TIME ZONE 'Asia/Bangkok','HH24:MI DD/MM/YYYY') starts
            FROM public.appointment a JOIN public.pet_profile p ON p.id=a.pet_id
            WHERE a.id='b7ca3485-64a1-4998-ab71-ea393bccdfe8'`)).rows[0];
        const admin = (await db.query("SELECT s.auth_user_id FROM public.staff s JOIN public.staff_role r ON r.staff_id=s.id WHERE r.role_code='ADMIN' AND s.employment_status='active' AND s.auth_user_id IS NOT NULL AND NOT s.must_change_password LIMIT 1")).rows[0];
        await db.query("SELECT set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role','authenticated',true)", [admin.auth_user_id]);
        await db.query('SET LOCAL ROLE authenticated');
        const reads = [], rpc = async (name, args) => {
            assert.ok(['admin_service_booking_staff_choices','admin_service_booking_staff_diagnostics'].includes(name));
            assert.equal(args.p_id, original.id);
            const data = (await db.query(`SELECT public.${name}($1) value`, [args.p_id])).rows[0].value;
            reads.push({ name, data }); return { data, error: null };
        };
        const page = await browser.newPage({ viewport: { width: 1100, height: 950 } }), errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.exposeFunction('liveRpc', rpc);
        await page.setContent(fs.readFileSync('pages/admin/modules/services/services.html', 'utf8'));
        await page.evaluate(() => document.body.className = 'admin-body admin-ui-standard');
        for (const file of ['pages/admin/admin.css','pages/admin/admin-components.css','pages/admin/admin-typography.css','pages/admin/modules/services/services.css']) await page.addStyleTag({ content: fs.readFileSync(file, 'utf8') });
        const source = fs.readFileSync('pages/admin/modules/services/subtabs/tab-service-bookings.js', 'utf8'), core = fs.readFileSync('pages/admin/modules/services/services.js', 'utf8');
        await page.evaluate(() => {
            window.PawpalServices = { state: { bookingsData: [], liveStaffList: [] }, errorMessage: error => error.message };
            window.getSupabaseClient = () => ({ rpc: (name, args) => liveRpc(name, args) });
        });
        await page.addScriptTag({ content: 'const PawpalServices=window.PawpalServices;' + source.slice(source.indexOf('    function clearModalErrors('), source.indexOf('    function fieldError(')) + source.slice(source.indexOf('    function modalError('), source.indexOf('    function syncBookingKpis(')) + core.slice(core.indexOf('    PawpalServices.enhanceEntitySelects ='), core.indexOf('    function assertHandoverReady(')) + source.slice(source.indexOf('    function openChangeStaffModal('), source.indexOf('    function openSurchargeModal(')) + 'window.openDispatch=openChangeStaffModal;' });
        await page.evaluate(row => {
            const [time, date] = row.starts.split(' ');
            const model = { id: row.appointment_code, dbId: row.id, status: row.appointment_status, staffId: row.staff_id, petName: row.pet_name, time, date };
            PawpalServices.state.bookingsData = [model]; openDispatch(model.id);
        }, original);
        await page.waitForFunction(() => document.querySelector('#modalChangeStaff [data-service-summary-error]')?.textContent.includes('Trùng lịch'));
        assert.equal(await page.locator('#btnSubmitChangeStaff').isDisabled(), true);
        await page.locator('#modalChangeStaff .admin-modal-card').screenshot({ path: folder + '/desktop.png' });
        await page.setViewportSize({ width: 390, height: 844 });
        await page.locator('#modalChangeStaff .admin-modal-card').screenshot({ path: folder + '/mobile.png' });
        assert.deepEqual(errors, []);
        const reasons = reads.find(row => row.name === 'admin_service_booking_staff_diagnostics').data;
        fs.writeFileSync(folder + '/verification.txt', 'READ-ONLY CONFIRMATION\nActual reported appointment: ' + original.appointment_code + '\n' + reasons.map(row => row.staff_name + ': ' + row.reason).join('\n') + '\nCurrent local source already contains migration 278 and precise diagnostics; no new assignment-eligibility defect established.\nActual modal shows the reason and blocks conflicting assignment. No writes, no testcase replay, no new deployment.\n');
        console.log('PASS: reported appointment, real read-only RPCs, precise conflict displayed, desktop/mobile evidence');
    } finally { await db.query('ROLLBACK'); await db.end(); await browser.close(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
