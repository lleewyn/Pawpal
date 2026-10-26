const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { chromium } = require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');

// Isolated presentation fixture: no Admin scripts or Supabase connections.
const root = process.cwd();
const output = path.join(root, 'scratch', 'orders-kpi-verification');
const shell = fs.readFileSync('pages/admin/index.html', 'utf8').replace(/<script\b[\s\S]*?<\/script>/gi, '');
const html = name => fs.readFileSync(`pages/admin/modules/${name}/${name}.html`, 'utf8');
const properties = ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'color'];

(async () => {
    fs.mkdirSync(output, { recursive: true });
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage();
        const errors = [], databaseRequests = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.route('**/*', route => {
            const url = new URL(route.request().url());
            if (url.hostname.includes('supabase')) databaseRequests.push(url.pathname);
            if (url.origin === 'http://localhost:3001' && url.pathname === '/') {
                return route.fulfill({ contentType: 'text/html', body: '<!doctype html><body></body>' });
            }
            if (url.origin === 'http://localhost:3001' && url.pathname.endsWith('.css')) {
                return route.fulfill({ contentType: 'text/css', body: fs.readFileSync(path.join(root, url.pathname), 'utf8') });
            }
            return route.abort();
        });
        await page.goto('http://localhost:3001/');
        const show = async name => page.evaluate(content => {
            document.getElementById('contentArea').innerHTML = '<div class="admin-module-wrapper">' + content + '</div>';
        }, html(name));
        const styles = async selector => page.locator(selector).first().evaluate((element, keys) => {
            const css = getComputedStyle(element);
            return Object.fromEntries(keys.map(key => [key, css[key]]));
        }, properties);
        const cardStyles = async selector => page.locator(selector).first().evaluate(element => {
            const css = getComputedStyle(element);
            return Object.fromEntries(['padding', 'gap', 'minHeight', 'borderRightWidth', 'borderRightColor'].map(key => [key, css[key]]));
        });
        const surfaceStyles = async selector => page.locator(selector).first().evaluate(element => {
            const css = getComputedStyle(element);
            return Object.fromEntries(['backgroundColor', 'borderRadius', 'borderTop', 'margin', 'padding', 'gap', 'overflow'].map(key => [key, css[key]]));
        });
        for (const width of [1280, 1440, 1680]) {
            await page.setViewportSize({ width, height: 1000 });
            await page.setContent(shell.replace(/<link[^>]+admin-components\.css[^>]*>/, ''), { waitUntil: 'load' });
            await show('customers');
            const reference = {
                label: await styles('#subtab-tab-list .kpi-label'),
                value: await styles('#subtab-tab-list .kpi-val'),
                card: await cardStyles('#subtab-tab-list .kpi-card'),
                surface: await surfaceStyles('#subtab-tab-list .customers-kpi-grid')
            };
            await page.addStyleTag({ content: fs.readFileSync('pages/admin/admin-components.css', 'utf8') });
            assert.deepEqual({
                label: await styles('#subtab-tab-list .kpi-label'),
                value: await styles('#subtab-tab-list .kpi-val'),
                card: await cardStyles('#subtab-tab-list .kpi-card'),
                surface: await surfaceStyles('#subtab-tab-list .customers-kpi-grid')
            }, reference, 'Shared KPI must not affect Customer');
            await show('orders');
            const ids = await page.locator('.admin-kpi-grid .kpi-val').evaluateAll(nodes => nodes.map(node => node.id));
            assert.deepEqual(ids, ['statTotalOrders', 'statPendingOrders', 'statPreparingOrders', 'statShippingOrders', 'statCompletedOrders', 'statCancelledOrders', 'statTotalProducts', 'statInStockProducts', 'statLowStockProducts', 'statOutStockProducts', 'statTotalStockValue', 'statActiveVouchers', 'statVoucherUsedToday', 'statExpiringVouchers']);
            assert.equal(await page.locator('.admin-kpi-grid [style]').count(), 0, 'Static KPI styles must live in CSS');
            for (const [tab, count] of [['list', 6], ['products', 5], ['promos', 3]]) {
                const prefix = '#subtab-tab-order-' + tab;
                await page.evaluate(id => document.querySelectorAll('#contentArea .subtab-content').forEach(element => element.classList.toggle('active', element.id === id)), 'subtab-tab-order-' + tab);
                assert.equal(await page.locator(prefix + ' .skeleton-kpi').count(), count, 'Loading indicators retained');
                assert.deepEqual(await cardStyles(prefix + ' .kpi-card'), reference.card, tab + ' card spacing');
                assert.deepEqual(await surfaceStyles(prefix + ' .admin-kpi-grid'), reference.surface, tab + ' Customer strip surface');
                assert.equal(await page.locator(prefix + ' .admin-kpi-grid').evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length), count, 'Desktop metrics must stay on one row');
                assert.equal(await page.locator(prefix + ' .admin-kpi-grid').evaluate(element => new Set([...element.children].map(card => card.getBoundingClientRect().top)).size), 1, 'Desktop KPI cards must have the same top edge');
                for (const value of ['0', '99999999999999999999999999999999999999', '9.999.999.999.999 đ', 'Chưa đủ dữ liệu', '—']) {
                    await page.locator(prefix + ' .kpi-val').evaluateAll((nodes, value) => nodes.forEach(node => { node.textContent = value; }), value);
                    for (let index = 0; index < count; index++) {
                        const selector = prefix + ' .kpi-card:nth-child(' + (index + 1) + ')';
                        assert.deepEqual(await styles(selector + ' .kpi-label'), reference.label, tab + ' label typography');
                        assert.deepEqual(await styles(selector + ' .kpi-val'), reference.value, tab + ' value typography');
                    }
                    assert.equal(await page.locator(prefix + ' .admin-kpi-grid').evaluate(grid => grid.scrollWidth <= grid.clientWidth + 1 && [...grid.querySelectorAll('.kpi-val')].every(value => value.scrollWidth <= value.clientWidth + 1)), true, 'Long KPI text must remain contained');
                }
                const samples = tab === 'list' ? ['42', '7', '12', '8', '10', '5'] : tab === 'products' ? ['1.234', '1.000', '34', '200', '9.999.999.999.999 đ'] : ['24', '—', '3'];
                await page.locator(prefix + ' .kpi-val').evaluateAll((nodes, values) => nodes.forEach((node, index) => { node.textContent = values[index]; }), samples);
                await page.screenshot({ path: path.join(output, `${tab}-${width}.png`) });
            }
        }
        assert.deepEqual(errors, []);
        assert.deepEqual(databaseRequests, []);
        console.log('PASS KPI: 1280/1440/1680, Customer typography/spacing unchanged, all 14 IDs/loading states and business columns retained, zero/long amounts/missing values contained; isolated UI only.');
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
