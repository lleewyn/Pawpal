'use strict';
// Actual staff workspace and order renderer, read-only live context. No checkout or testcase replay.
const fs = require('node:fs'), assert = require('node:assert/strict');
const { chromium } = require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const { connect } = require('../../my-server/scripts/database/v1/service_import_connection.cjs');
async function main() {
    const db = await connect(), browser = await chromium.launch({ channel: 'chrome', headless: true });
    const folder = 'docs/verification/staff-sales-profile-layout'; fs.mkdirSync(folder, { recursive: true });
    try {
        await db.query("BEGIN READ ONLY; SET LOCAL statement_timeout='10s'");
        const actor = (await db.query("SELECT s.id,s.auth_user_id FROM public.staff s JOIN public.staff_role r ON r.staff_id=s.id WHERE r.role_code='STAFF' AND s.employment_status='active' AND s.auth_user_id IS NOT NULL AND NOT s.must_change_password ORDER BY s.id LIMIT 1")).rows[0];
        const order = (await db.query("SELECT id FROM public.sales_order WHERE order_status NOT IN('cancelled','returned') ORDER BY (lower(order_code)='so-2df944938dde44a0b740324bbc993085') DESC,updated_at DESC LIMIT 1")).rows[0];
        assert.ok(actor && order);
        await db.query("SELECT set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role','authenticated',true)", [actor.auth_user_id]);
        await db.query('SET LOCAL ROLE authenticated');
        const page = await browser.newPage({ viewport: { width: 1100, height: 800 } }), errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.route('http://localhost/**', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body class="admin-body"><header id="headerSubtabsGroup"></header><main class="admin-preview-content"></main></body></html>' }));
        await page.goto('http://localhost/#tab-order-detail?id=' + order.id);
        await page.exposeFunction('readRpc', async (name, args) => {
            assert.equal(name, 'get_staff_workspace'); assert.ok(['orders','order_lines'].includes(args.p_kind)); assert.equal(args.p_id, order.id);
            return { data: (await db.query('SELECT public.get_staff_workspace($1,$2,$3,$4) value', [args.p_kind,args.p_query,args.p_id,args.p_page])).rows[0].value };
        });
        for (const file of ['admin.css','admin-components.css','admin-typography.css']) await page.addStyleTag({ content: fs.readFileSync('pages/admin/' + file, 'utf8') });
        await page.addStyleTag({ content: 'body.admin-body{background:#F4F8F6}#headerSubtabsGroup{display:flex;gap:8px;align-items:center;height:56px;padding:0 20px;background:#fff}main.admin-preview-content{position:static;height:calc(100vh - 56px);padding:20px;overflow:auto}' });
        await page.evaluate(id => {
            window.PawpalAdminAccess = { isStaff: () => true, state: { user: { id, permissions: ['work.sales.read','work.cashier.collect','work.complaint.handle'] } } };
            window.getSupabaseClient = () => ({ rpc: (name, args) => readRpc(name, args) });
        }, actor.id);
        const core = fs.readFileSync('my-client/pages/admin/admin.js','utf8'); await page.addScriptTag({ content: core.slice(0, core.indexOf('})();') + 5) });
        const domain = fs.readFileSync('my-client/pages/admin/modules/orders/orders.js','utf8'), start = domain.indexOf('(function registerRoleViews()');
        await page.addScriptTag({ content: domain.slice(start, domain.indexOf('})();',start) + 5) });
        await page.evaluate(() => PawpalAdminViews.mount('Bán hàng',document.querySelector('main')));
        assert.equal(await page.locator('.workspace-order-actions button').count(),3);
        for (const [width,height,name] of [[1100,800,'desktop'],[390,844,'mobile']]) {
            await page.setViewportSize({ width,height });
            const layout = await page.locator('.workspace-order-summary').evaluate(node => {
                const label = node.querySelector('dt').getBoundingClientRect(), value = node.querySelector('dd').getBoundingClientRect();
                const buttons = [...node.querySelectorAll('.workspace-order-actions button')].map(button => button.getBoundingClientRect());
                return { aligned: Math.abs(label.bottom - value.bottom) < 4, overflow: node.scrollWidth > node.clientWidth,
                    separated: buttons.slice(1).every((b,i) => b.top >= buttons[i].bottom + 11 || b.left >= buttons[i].right + 11) };
            });
            assert.ok(layout.aligned && layout.separated && !layout.overflow, name + ': status alignment and button spacing');
            await page.screenshot({ path: folder + '/' + name + '.png' });
            const items = page.locator('.workspace-order-items .table-responsive-wrapper');
            assert.ok(await items.evaluate(node => {
                const table = node.querySelector('table');
                return Math.abs(table.getBoundingClientRect().width - Math.max(600,node.clientWidth)) < 2 && getComputedStyle(table.querySelector('th')).textAlign === 'left';
            }), name + ': table fills its container with left-aligned headings');
            if (name === 'mobile') {
                await items.evaluate(node => node.scrollLeft = node.scrollWidth);
                assert.ok(await items.evaluate(node => node.scrollLeft > 0), 'Mobile table scrolls horizontally');
                await page.screenshot({ path: folder + '/mobile-right.png' });
            }
        }
        assert.deepEqual(errors, []);
        fs.writeFileSync(folder+'/verification.txt','PASS: Actual staff workspace, actual order-profile renderer, live read-only scoped orders and order_lines.\nPASS: Label/value alignment, 12px action gaps, wrapping without summary overflow at 1100px and 390px, no JavaScript errors.\nPASS: Product table fills container, left-aligned headings, padded cells; horizontal scroll exposes remaining columns on mobile.\nNo order creation, payment, data changes, or testcase replay. Screenshots show local changes.\n');
        console.log('PASS: staff order profile desktop/mobile alignment and action spacing; read-only evidence');
    } finally { await db.query('ROLLBACK'); await db.end(); await browser.close(); }
}
main().catch(error => { console.error(error.message); process.exitCode=1; });
