const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const credentials = fs.readFileSync('D:/Aboutme/Pawpal-infra/supabase-local/PAWPAL-ADMIN.private.txt', 'utf8');
const base = process.env.TEST_BASE_URL || 'https://pawpalgr3.vercel.app';
const patches = new Set(['/pages/admin/index.html', '/pages/admin/admin.js', '/pages/admin/modules/settings/settings.css', '/pages/admin/modules/settings/subtabs/tab-settings-audit.js']);
(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage({ viewport: { width: 1920, height: 950 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
        if (process.env.LOCAL_PATCH) await page.route('**/*', route => {
            const url = new URL(route.request().url());
            const file = url.pathname === '/admin' ? '/pages/admin/index.html' : url.pathname;
            if (url.origin === base && patches.has(file)) return route.fulfill({ contentType: file.endsWith('.css') ? 'text/css' : file.endsWith('.js') ? 'application/javascript' : 'text/html', body: fs.readFileSync(path.join(process.cwd(), file), 'utf8') });
            return route.continue();
        });
        await page.goto(base + '/admin/login');
        await page.locator('#inputAdminEmail').fill(credentials.match(/^Email: (.+)$/m)[1].trim());
        await page.locator('#inputAdminPassword').fill(credentials.match(/^Password: (.+)$/m)[1].trim());
        await page.locator('#btnSubmitAdminLogin').click();
        await page.waitForURL('**/admin*');
        await page.locator('[data-title="Cấu hình"]').click();
        await page.waitForFunction(() => window.PawpalSettings?.state.isLoaded);
        await page.evaluate(() => { location.hash = 'tab-audit-logs'; });
        await page.locator('#subtab-tab-audit-logs.active').waitFor();
        await page.waitForFunction(() => document.querySelectorAll('#auditPaginationControls button').length > 0);
        const rows = page.locator('#auditLogTableBody tr');
        const count = await page.evaluate(() => PawpalSettings.state.auditLogsList.length);
        assert.ok(count > 10, 'Use real Cloud audit records for multiple pages');
        const total = Math.ceil(count / 10);
        async function checkLayout(width) {
            await page.setViewportSize({ width, height: 950 });
            const bounds = await page.evaluate(() => {
                const content = document.querySelector('#contentArea');
                const pager = document.querySelector('#auditPaginationControls');
                const first = document.querySelector('#auditLogTableBody tr');
                const head = document.querySelector('#subtab-tab-audit-logs thead');
                const rect = pager.getBoundingClientRect();
                return { scroll: content.scrollWidth, client: content.clientWidth, pagerWidth: rect.width, first: first.getBoundingClientRect().top, head: head.getBoundingClientRect().bottom, radius: getComputedStyle(document.querySelector('#subtab-tab-audit-logs .settings-master-card')).borderRadius, buttonBorder: getComputedStyle(document.querySelector('#btnToggleSafeModeAudit')).borderTopWidth };
            });
            assert.ok(bounds.scroll <= bounds.client + 1, `Content overflow at ${width}: ${JSON.stringify(bounds)}`);
            assert.ok(bounds.pagerWidth <= width - (width > 768 ? 264 : 24), 'Bounded pager');
            assert.ok(bounds.first >= bounds.head - 1, 'Header overlaps first record');
            assert.equal(bounds.radius, '9px');
            assert.equal(bounds.buttonBorder, '0px');
            assert.ok(await rows.count() <= 10);
            assert.ok(await page.locator('#auditPaginationControls button').count() <= 7);
        }
        for (const width of [1920, 1366, 1024, 390]) await checkLayout(width);
        await page.setViewportSize({ width: 1920, height: 950 });
        await page.locator(`#auditPaginationControls [data-p="${total}"]`).click();
        assert.equal(await rows.count(), count % 10 || 10);
        assert.equal(await page.locator('#auditPaginationControls [data-p="next"]').isDisabled(), true);
        await page.locator('#auditPaginationControls [data-p="prev"]').click();
        assert.equal(await page.locator('#auditPaginationControls [aria-current="page"]').textContent(), String(total - 1));
        await page.locator('#auditPaginationControls [data-p="1"]').click();
        const firstId = await page.locator('#auditLogTableBody tr').first().innerText();
        await page.locator('#auditPaginationControls [data-p="next"]').click();
        assert.notEqual(await page.locator('#auditLogTableBody tr').first().innerText(), firstId);
        await page.locator('#searchAuditLogInput').fill('no-match-layout-check-20261031');
        assert.equal(await rows.count(), 1);
        assert.ok((await rows.innerText()).includes('Không tìm thấy'));
        assert.equal(await page.locator('#auditPaginationControls [aria-current="page"]').textContent(), '1');
        await page.locator('#searchAuditLogInput').fill('');
        await page.locator('#filterAuditTargetModule').selectOption('Cấu hình');
        assert.equal(await page.locator('#auditPaginationControls [aria-current="page"]').textContent(), '1');
        await page.locator('#filterAuditTargetModule').selectOption('all');
        await page.locator('#auditLogTableBody details').first().locator('summary').click();
        await page.waitForFunction(() => !document.querySelector('#auditLogTableBody pre').textContent.includes('Đang tải'));
        assert.ok(!(await page.locator('#auditLogTableBody pre').first().innerText()).includes('Chưa tải được'));
        await page.locator('#auditLogTableBody details').first().locator('summary').click();
        await page.screenshot({ path: 'D:/Aboutme/Pawpal-infra/browser-check/audit-layout-20261031.png', fullPage: true });
        assert.deepEqual(errors, []);
        console.log(`PASS ${count} live records, desktop/mobile bounds, 10 rows/page, bounded pager, first/last/previous/next, search/filter reset, real detail read, no JS errors.`);
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
