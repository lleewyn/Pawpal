const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { chromium } = require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');

(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage();
        await page.route('http://localhost:3000/', route => route.fulfill({
            status: 200, contentType: 'text/html', body: '<!doctype html><html><head></head><body></body></html>'
        }));
        await page.route(/\.css(?:\?|$)/, route => route.fulfill({
            status: 200, contentType: 'text/css',
            body: fs.readFileSync(path.join(process.cwd(), new URL(route.request().url()).pathname), 'utf8')
        }));
        await page.goto('http://localhost:3000/');
        const html = fs.readFileSync('pages/admin/index.html', 'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
        await page.setContent(html);
        const sidebarWidth = () => page.locator('#adminSidebar').evaluate(el => Math.round(el.getBoundingClientRect().width));
        const rowPositions = () => page.locator('.sidebar-menu-btn, .btn-sidebar-footer, .admin-sidebar-footer, .btn-sidebar-toggle').evaluateAll(elements => elements.map(el => {
            const rect = el.getBoundingClientRect();
            return { top: rect.top, height: rect.height };
        }));
        for (const viewport of [{ width: 1440, height: 900 }, { width: 1024, height: 650 }]) {
            await page.setViewportSize(viewport);
            await page.evaluate(() => document.querySelector('.admin-layout').classList.remove('sidebar-collapsed'));
            assert.equal(await sidebarWidth(), 220);
            const expanded = await rowPositions();
            await page.evaluate(() => document.querySelector('.admin-layout').classList.add('sidebar-collapsed'));
            assert.equal(await sidebarWidth(), 68);
            const collapsed = await rowPositions();
            assert.deepEqual(collapsed, expanded, 'Menu rows, footer and toggle must align in both states');
            assert.equal(await page.locator('.nav-group-short').first().isVisible(), true);
            assert.equal(await page.locator('.nav-group-full').first().isVisible(), false);
            assert.deepEqual(await page.locator('.nav-group-short').allTextContents(), ['QL', 'VH']);
            assert.equal(await page.locator('.admin-nav-group-divider').evaluate(el => getComputedStyle(el).borderTopWidth), '1px');
            const centered = await page.locator('.sidebar-menu-btn .menu-icon, .btn-sidebar-footer .menu-icon, .btn-sidebar-toggle').evaluateAll(elements => {
                const sidebar = document.querySelector('#adminSidebar').getBoundingClientRect();
                return elements.every(el => {
                    const rect = el.getBoundingClientRect();
                    return Math.abs(rect.left + rect.width / 2 - (sidebar.left + (sidebar.width - 1) / 2)) < 1;
                });
            });
            assert.equal(centered, true, 'Collapsed icons must be centered');
        }
        await page.setViewportSize({ width: 390, height: 844 });
        await page.evaluate(() => {
            const layout = document.querySelector('.admin-layout');
            layout.classList.remove('sidebar-collapsed');
            layout.classList.add('mobile-sidebar-open');
        });
        assert.equal(await page.locator('#adminSidebar').evaluate(el => Math.round(el.getBoundingClientRect().left)), 0);
        assert.equal(await page.locator('#btnToggleSidebar').isVisible(), true);
        console.log('PASS widths 220/68, aligned rows, QL/VH labels and group divider, centered icons at two desktop sizes, mobile sidebar and close control. CSS-only, no database requests.');
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exit(1); });
