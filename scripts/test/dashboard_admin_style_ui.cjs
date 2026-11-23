// Compare Dashboard to the actual Customer markup with the production CSS load order.
// All records below are browser-only test fixtures. No network or database writes.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const read = file => fs.readFileSync(file, 'utf8');
const dashboard = 'pages/admin/modules/dashboard/';
(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head></head><body></body></html>' }));
        await page.goto('http://dashboard-style.test/');
        const customerHtml = read('pages/admin/modules/customers/customers.html');
        await page.setContent(`<body class="admin-body"><div class="admin-layout sidebar-collapsed"><main class="admin-main"><header class="admin-header"><div class="admin-header-left"><div class="header-subtabs-group"><button class="header-subtab-btn active">Khách hàng</button></div></div><div class="admin-header-right"><button class="btn-header-refresh">Làm mới</button><span class="header-user-tag">Quản trị viên</span></div></header><div class="admin-preview-content" id="contentArea"><div class="admin-module-wrapper" data-customer-reference>${customerHtml}</div><div class="admin-module-wrapper" data-dashboard-reference hidden>${read(dashboard + 'dashboard.html')}</div></div></main></div></body>`);
        const styles = [...read('pages/admin/index.html').matchAll(/<link[^>]+href="(\/pages\/admin\/[^"?]+\.css)(?:\?[^" ]*)?"/g)].map(match => match[1]);
        for (const file of styles) await page.addStyleTag({ content: read('.' + file) });
        await page.addScriptTag({ content: 'window.dashboardTestAnalysis = ' + require('./dashboard_completion_fixture.cjs').toString() });
        await page.evaluate(() => {
            document.querySelectorAll('[data-customer-reference] .kpi-val').forEach(el => { el.textContent = '12'; });
            window.PawpalAdminAccess = { ready: Promise.resolve(), isAdmin: () => true, state: { user: { permissions: ['payment', 'refund_transaction', 'sales_order', 'sales_order_detail', 'appointment', 'appointment_item', 'customer', 'customer_membership', 'membership_tier', 'voucher_redemption', 'paw_point_transaction'].map(t => t + '.read').concat(['pawpal_setting.write','audit_log.write']) } } };
            window.getSupabaseClient = () => ({ rpc: async (name, args) => {
                if (name === 'admin_dashboard_business_analysis') return { data: dashboardTestAnalysis(args) };
                if (name === 'get_admin_dashboard_plan') return { data: null };
                if (name === 'admin_business_metric') return { data: ({ sources: { products: 100, services: 0, other: 0 }, products: [], services: [], customers: [], membership: [], vouchers: { count: 0, discount: 0 }, points: { credited: 0, debited: 0 }, returning: { eligible: 0, returning: 0, rate: null } })[args.p_key] };
                const M = PawpalBusinessMetrics;
                return { data: { undated_receipts: 0, undated_refunds: 0, days: Array.from({ length: M.period(args.p_from, args.p_to).length }, (_, i) => ({ day: M.shift(args.p_from, i), collected: 100, refunded: 0 })) } };
            } });
        });
        await page.addScriptTag({ content: read(dashboard + 'subtabs/business-metrics.js') });
        await page.addScriptTag({ content: read(dashboard + 'subtabs/tab-dashboard-business.js') });
        await page.evaluate(() => PawpalBusinessDashboard.init());
        // Structural probes check the same components even if an actual source has no rows.
        await page.evaluate(() => {
            const root = document.querySelector('[data-ops-panel="alerts"] [data-ops-body]');
            root.innerHTML = '<div class="ops-work-filters"><div class="ops-alert-filters admin-filter-tabs"><button class="ops-alert-filter admin-filter-tab active">Tất cả</button></div><label class="ops-kind-label admin-control-label">Nhóm công việc <select class="admin-select"><option>Tất cả nhóm</option></select></label></div><div class="table-responsive-wrapper"><table class="admin-table"><thead><tr><th>Công việc</th><th>Người phụ trách</th></tr></thead><tbody><tr><td><strong class="ops-record-name admin-table__primary">Lịch hẹn kiểm thử</strong><span class="ops-cell-meta admin-table__secondary">Thông tin phụ</span></td><td><button class="ops-link-btn admin-text-action" type="button">Mở lịch hẹn</button></td></tr></tbody></table></div>';
        });
        const capture = async () => page.evaluate(() => {
            const style = selector => { const s = getComputedStyle(document.querySelector(selector)); return Object.fromEntries(['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','color','backgroundColor','borderRadius','borderTopWidth','borderTopColor','borderBottomWidth','borderBottomColor','padding','minHeight','gap','backdropFilter','textDecorationLine'].map(key => [key, s[key]])); };
            const reference = '.customers-module #subtab-tab-list ';
            return {
                customer: Object.fromEntries(Object.entries({ grid: '.customers-kpi-grid', kpi: '.kpi-card', label: '.kpi-label', value: '.kpi-val', card: '.customer-master-card', heading: '.customer-workspace-title', button: '.admin-btn-secondary', input: '.admin-input', select: '.admin-select', filterLabel: '.filter-label', th: 'th', td: 'td' }).map(([key, selector]) => [key, style(reference + selector)])),
                operations: Object.fromEntries(Object.entries({ grid: '.ops-kpis', kpi: '.ops-kpi', label: '.kpi-label', value: '.kpi-val', card: '.ops-panel', heading: '.admin-card-title', button: '.admin-btn-secondary', select: '.admin-select', filterLabel: '.ops-kind-label', th: 'th', td: 'td' }).map(([key, selector]) => [key, style('.ops-dash ' + selector)])),
                business: Object.fromEntries(Object.entries({ grid: '.biz-kpis', kpi: '.biz-kpi', label: '.kpi-label', value: '.kpi-val', card: '.biz-panel', heading: '.admin-card-title', button: '.admin-btn-secondary', select: '.admin-select', filterLabel: '.biz-panel-control', th: 'th', td: 'td' }).map(([key, selector]) => [key, style('.business-dash ' + selector)]))
            };
        });
        const actual = await capture();
        assert.equal(await page.locator('[data-biz-panel="cash"] [role="alert"]').count(), 0, 'The style fixture must render successful business data');
        if (process.env.STYLE_AUDIT) console.log(JSON.stringify(actual, null, 2));
        const textProps = ['fontFamily','fontSize','fontWeight','lineHeight','letterSpacing','color'];
        const surfaceProps = ['backgroundColor','borderRadius','borderTopWidth','borderTopColor','backdropFilter'];
        const checks = { grid: surfaceProps, kpi: ['padding','minHeight','gap','backgroundColor','backdropFilter'], label: textProps, value: textProps,
            card: surfaceProps, heading: textProps, button: [...textProps,...surfaceProps,'padding','minHeight'], select: [...textProps,...surfaceProps,'padding','minHeight'], filterLabel: textProps,
            th: [...textProps,'backgroundColor','padding'], td: [...textProps,'padding'] };
        const differences = [];
        for (const tab of ['operations', 'business']) for (const [component, properties] of Object.entries(checks)) {
            if (!actual[tab][component]) continue;
            for (const property of properties) if (actual[tab][component][property] !== actual.customer[component][property]) {
                differences.push(`${tab}.${component}.${property}: ${actual[tab][component][property]} != Customer ${actual.customer[component][property]}`);
            }
        }
        assert.deepEqual(differences, [], 'Dashboard must match Customer, not only match the other Dashboard tab');
        const headerStyle = () => page.evaluate(() => {
            const selectors = ['.admin-header', '.header-subtab-btn', '.btn-header-refresh', '.header-user-tag'];
            return selectors.map(selector => {
                const s = getComputedStyle(document.querySelector(selector));
                return ['height','padding','backgroundColor','borderLeftWidth','borderRadius','color','fontWeight','fontSize'].map(key => s[key]);
            });
        });
        const output = path.resolve('artifacts/dashboard-admin-style');
        fs.mkdirSync(output, { recursive: true });
        for (const width of [1440, 820, 390, 320]) {
            await page.setViewportSize({ width, height: 1000 });
            await page.evaluate(() => document.body.classList.remove('dashboard-active'));
            const customerHeader = await headerStyle();
            await page.evaluate(() => document.body.classList.add('dashboard-active'));
            assert.deepEqual(await headerStyle(), customerHeader, 'Dashboard must use the same header at ' + width);
            for (const tab of ['customer', 'operations', 'business']) {
                await page.evaluate(tab => {
                    const customer = document.querySelector('[data-customer-reference]');
                    const dashboard = document.querySelector('[data-dashboard-reference]');
                    customer.hidden = tab !== 'customer'; dashboard.hidden = tab === 'customer';
                    customer.style.display = tab === 'customer' ? '' : 'none';
                    dashboard.style.display = tab === 'customer' ? 'none' : '';
                    document.querySelector('#subtab-tab-dashboard-business').classList.toggle('active', tab === 'business');
                    document.querySelector('#subtab-tab-dashboard-operations').classList.toggle('active', tab === 'operations');
                    document.querySelector('.header-subtab-btn').textContent = tab === 'customer' ? 'Khách hàng' : tab === 'operations' ? 'Vận hành' : 'Kinh doanh';
                    document.querySelector('.admin-preview-content').scrollTop = 0;
                }, tab);
                assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), tab + ' outer overflow at ' + width);
                if ([1440, 390].includes(width)) await page.screenshot({ path: path.join(output, `${tab}-${width}.png`) });
            }
        }
        await page.setViewportSize({ width: 1440, height: 600 });
        for (const tab of ['business', 'operations']) {
            await page.evaluate(tab => {
                for (const name of ['business', 'operations']) {
                    document.querySelector('#subtab-tab-dashboard-' + name).classList.toggle('active', name === tab);
                }
                document.querySelector('.admin-preview-content').scrollTop = 0;
            }, tab);
            const region = page.locator(tab === 'business' ? '.biz-chart-scroll' : '.ops-dash .table-responsive-wrapper:visible').first();
            await region.scrollIntoViewIfNeeded();
            await region.hover();
            const before = await page.locator('.admin-preview-content').evaluate(el => el.scrollTop);
            await page.mouse.wheel(0, 180);
            await page.waitForFunction(previous => document.querySelector('.admin-preview-content').scrollTop > previous, before);
        }
        await page.evaluate(() => {
            document.querySelector('#subtab-tab-dashboard-operations').classList.remove('active');
            document.querySelector('#subtab-tab-dashboard-business').classList.add('active');
        });
        // All sections inside grouped panels must remain transparent, with a single surface.
        assert(await page.locator('.biz-group > .biz-panel').evaluateAll(nodes => nodes.every(node => {
            const s = getComputedStyle(node); return s.backgroundColor === 'rgba(0, 0, 0, 0)' && s.borderTopWidth === '0px' && s.backdropFilter === 'none';
        })));
        const adminSource = read('pages/admin/admin.js');
        const modalStart = adminSource.indexOf('    // Global Modal Handler:');
        const modalEnd = adminSource.indexOf('    // Khởi tạo Lucide', modalStart);
        await page.addScriptTag({ content: adminSource.slice(modalStart, modalEnd) });
        await page.locator('#btnEditPlan').click();
        assert.equal(await page.locator('#bizPlanTitle').evaluate(el => getComputedStyle(el).fontSize), '20px');
        for (const width of [1440, 390]) {
            await page.setViewportSize({ width, height: 1000 });
            const box = await page.locator('#bizPlanModal .admin-modal-card').boundingBox();
            assert(box.x >= 0 && box.x + box.width <= width);
            await page.screenshot({ path: path.join(output, `plan-${width}.png`) });
        }
        await page.locator('#bizPlanModal [data-close-modal]').first().click();
        assert.equal(await page.locator('#bizPlanModal').isVisible(), false);
        await page.evaluate(() => PawpalBusinessDashboard.unmount());
        assert.deepEqual(errors, []);
        console.log('PASS Customer reference: both Dashboard tabs match KPI, cards, headings, buttons, selects, labels, tables; shared header unchanged at 1440/820/390/320px; screenshots and no nested surfaces.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
