const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');

// Render the actual templates and styles without connecting to the live database.
(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage();
        await page.route('http://pawpal.test/**', route => route.fulfill({
            status: 200,
            contentType: 'text/html',
            body: '<!doctype html><html><head></head><body></body></html>'
        }));
        await page.goto('http://pawpal.test/');
        await page.setContent(fs.readFileSync('pages/admin/modules/dashboard/dashboard.html', 'utf8'));
        await page.addStyleTag({ content: fs.readFileSync('pages/admin/admin.css', 'utf8') });
        await page.addStyleTag({ content: fs.readFileSync('pages/admin/modules/dashboard/dashboard.css', 'utf8') });
        await page.evaluate(() => {
            document.querySelector('#subtab-tab-dashboard').style.display = 'none';
            const tab = document.querySelector('#subtab-tab-dashboard-operations');
            tab.classList.add('active');
            tab.style.display = 'block';
            document.body.style.cssText = 'margin:0;padding:20px;background:#F4F9F6';
            document.querySelectorAll('[data-ops-body]').forEach(body => {
                // Actual loading markup from the operations renderer; no sample records.
                body.innerHTML = '<span class="ops-skeleton"></span><span class="ops-skeleton"></span><span class="ops-skeleton"></span>';
            });
        });
        const output = path.join(process.cwd(), 'docs/verification/dashboard-operations');
        fs.mkdirSync(output, { recursive: true });
        const badges = await page.evaluate(() => {
            const row = document.createElement('div');
            row.className = 'dash-appointment-row dashboard-booking-row';
            document.querySelector('.ops-dash').append(row);
            const results = ['warning', 'info', 'success', 'danger', 'neutral'].map(tone => {
                const badge = document.createElement('span');
                badge.className = `admin-badge badge-${tone}`;
                row.append(badge);
                const style = getComputedStyle(badge);
                return { tone, background: style.backgroundColor, height: style.height, padding: style.paddingLeft, radius: style.borderRadius };
            });
            row.remove();
            return results;
        });
        const expectedBackgrounds = ['rgb(245, 232, 211)', 'rgb(220, 234, 242)', 'rgb(220, 238, 226)', 'rgb(247, 220, 220)', 'rgb(226, 236, 229)'];
        badges.forEach((badge, index) => {
            assert.equal(badge.background, expectedBackgrounds[index], badge.tone);
            assert.equal(badge.height, '24px', badge.tone);
            assert.equal(badge.padding, '9px', badge.tone);
            assert.equal(badge.radius, '9px', badge.tone);
        });
        for (const width of [1440, 900, 390, 320]) {
            await page.setViewportSize({ width, height: 1000 });
            // Exercise the longest toolbar state, including the two date fields.
            await page.locator('[data-ops-custom]').evaluate(el => el.hidden = false);
            const result = await page.evaluate(() => {
                const css = selector => getComputedStyle(document.querySelector(selector));
                return {
                    overflow: document.documentElement.scrollWidth > innerWidth,
                    toolbarBorder: css('.ops-toolbar').borderTopWidth,
                    headerBorder: css('.ops-panel-head').borderBottomWidth,
                    radius: css('.ops-panel').borderTopLeftRadius,
                    padding: css('.ops-dash').paddingLeft,
                    skeletonAnimation: css('.ops-skeleton').animationName,
                    skeletonColor: css('.ops-skeleton').backgroundColor,
                    headingSize: css('.ops-panel-head .admin-card-title').fontSize,
                    color: css('.ops-dash').color,
                    overviewRadius: css('.dash-panel').borderTopLeftRadius,
                    overviewSurface: css('.dash-panel').backgroundColor,
                    surface: css('.ops-panel').backgroundColor,
                    overviewBorder: css('.dash-panel').borderTopColor,
                    border: css('.ops-panel').borderTopColor,
                    headingWeight: css('.ops-panel-head .admin-card-title').fontWeight,
                    overviewHeadingWeight: css('.dash-panel-heading h2').fontWeight,
                    headingColor: css('.ops-panel-head .admin-card-title').color,
                    overviewHeadingColor: css('.dash-panel-heading h2').color
                };
            });
            assert.equal(result.overflow, false, `Horizontal overflow at ${width}px`);
            assert.equal(result.toolbarBorder, '0px');
            assert.equal(result.headerBorder, '0px');
            assert.equal(result.radius, result.overviewRadius);
            assert.equal(result.surface, result.overviewSurface);
            assert.equal(result.border, result.overviewBorder);
            assert.equal(result.headingWeight, result.overviewHeadingWeight);
            assert.equal(result.headingColor, result.overviewHeadingColor);
            assert.equal(result.padding, '0px');
            assert.equal(result.skeletonAnimation, 'none');
            assert.equal(result.skeletonColor, 'rgb(238, 245, 241)');
            assert.equal(result.headingSize, '14px');
            assert.equal(result.color, 'rgb(40, 61, 49)');
            if ([1440, 390].includes(width)) {
                await page.screenshot({ path: path.join(output, `${width}.png`), fullPage: true });
            }
        }
        console.log('PASS operations styles: 1440, 900, 390, 320px; custom dates; no database calls.');
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
