const { chromium } = require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');

(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.addInitScript(() => {
        localStorage.setItem('pawpal_current_user', JSON.stringify({
            id: 'c0000000-0000-0000-0000-000000000001',
            name: 'Lê Lệ Quyên',
            full_name: 'Lê Lệ Quyên',
            phone: '0901234567',
            points: 250
        }));
    });

    await page.goto('http://localhost:4000/pages/services/service-detail/service-detail.html?id=SVC-HTL-01', { waitUntil: 'networkidle' });

    const check = await page.evaluate(() => {
        const toggle = document.getElementById('userMenuToggle');
        const dropdown = document.getElementById('userDropdown');
        const notiBtn = document.getElementById('headerNotificationBtn');
        const notiDropdown = document.getElementById('notificationDropdown');
        const scripts = Array.from(document.querySelectorAll('script')).map(s => s.src || 'inline');

        return {
            hasToggle: Boolean(toggle),
            hasDropdown: Boolean(dropdown),
            toggleBound: toggle ? toggle.dataset.dropdownBound : null,
            dropdownClassesBefore: dropdown ? dropdown.className : null,
            hasNotiBtn: Boolean(notiBtn),
            hasNotiDropdown: Boolean(notiDropdown),
            notiBound: notiBtn ? notiBtn.dataset.dropdownBound : null,
            notiClassesBefore: notiDropdown ? notiDropdown.className : null,
            scripts: scripts.filter(s => s.includes('header'))
        };
    });

    console.log('Check before clicking:', check);

    // Try clicking userMenuToggle
    if (check.hasToggle) {
        console.log('Clicking userMenuToggle...');
        await page.click('#userMenuToggle');
        await page.waitForTimeout(200);

        const afterUserClick = await page.evaluate(() => {
            const dropdown = document.getElementById('userDropdown');
            return {
                className: dropdown ? dropdown.className : null,
                opacity: dropdown ? window.getComputedStyle(dropdown).opacity : null,
                visibility: dropdown ? window.getComputedStyle(dropdown).visibility : null,
                display: dropdown ? window.getComputedStyle(dropdown).display : null
            };
        });
        console.log('After user click:', afterUserClick);
    }

    // Try clicking notificationBtn
    if (check.hasNotiBtn) {
        console.log('Clicking headerNotificationBtn...');
        await page.click('#headerNotificationBtn');
        await page.waitForTimeout(200);

        const afterNotiClick = await page.evaluate(() => {
            const notiDropdown = document.getElementById('notificationDropdown');
            return {
                className: notiDropdown ? notiDropdown.className : null,
                opacity: notiDropdown ? window.getComputedStyle(notiDropdown).opacity : null,
                visibility: notiDropdown ? window.getComputedStyle(notiDropdown).visibility : null,
                display: notiDropdown ? window.getComputedStyle(notiDropdown).display : null
            };
        });
        console.log('After noti click:', afterNotiClick);
    }

    await browser.close();
})();
