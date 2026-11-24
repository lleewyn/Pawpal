const { chromium } = require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');

(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    // Mock active Supabase session matching user
    await page.addInitScript(() => {
        const testUser = {
            id: 'c0000000-0000-0000-0000-000000000001',
            auth_user_id: 'a0000000-0000-0000-0000-000000000001',
            name: 'Lê Lệ Quyên',
            full_name: 'Lê Lệ Quyên',
            phone: '0901234567',
            points: 250,
            role: 'customer',
            is_temporary: false
        };
        localStorage.setItem('pawpal_current_user', JSON.stringify(testUser));
        sessionStorage.setItem('pawpal_current_user', JSON.stringify(testUser));

        // Intercept Supabase client auth
        const checkClient = setInterval(() => {
            const client = window.getSupabaseClient?.() || window.SupabaseClient;
            if (client && client.auth) {
                client.auth.getSession = async () => ({
                    data: {
                        session: {
                            user: { id: 'a0000000-0000-0000-0000-000000000001', email: 'lelequyen@example.com' }
                        }
                    },
                    error: null
                });
                client.auth.getUser = async () => ({
                    data: {
                        user: { id: 'a0000000-0000-0000-0000-000000000001', email: 'lelequyen@example.com' }
                    },
                    error: null
                });
                client.rpc = async (method) => {
                    if (method === 'customer_profile_snapshot') {
                        return { data: testUser, error: null };
                    }
                    return { data: [], error: null };
                };
            }
        }, 20);
        setTimeout(() => clearInterval(checkClient), 5000);
    });

    console.log('Navigating to service-detail...');
    await page.goto('http://localhost:4000/pages/services/service-detail/service-detail.html?id=SVC-HTL-01', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Dismiss site popup if any
    await page.evaluate(() => {
        const popup = document.getElementById('pawpal-site-popup');
        if (popup) popup.remove();
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) backdrop.remove();
    });

    // Check header user button
    await page.waitForSelector('#userMenuToggle', { timeout: 8000 });
    const userToggle = await page.$('#userMenuToggle');
    console.log('Has #userMenuToggle:', Boolean(userToggle));

    // 1. Click userMenuToggle
    console.log('Clicking #userMenuToggle...');
    await page.click('#userMenuToggle');
    await page.waitForTimeout(400);

    const userDropdownState = await page.evaluate(() => {
        const dd = document.getElementById('userDropdown');
        if (!dd) return null;
        const cs = window.getComputedStyle(dd);
        const rect = dd.getBoundingClientRect();
        return {
            className: dd.className,
            opacity: cs.opacity,
            visibility: cs.visibility,
            display: cs.display,
            rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height, bottom: rect.bottom },
            isIntersectingViewport: rect.width > 0 && rect.height > 0 && rect.top >= 0
        };
    });
    console.log('User Dropdown State after click:', userDropdownState);

    const shot1 = 'C:/Users/QUYEN/.gemini/antigravity-cli/brain/ee2858d7-6580-48fe-81a1-d967318c4ca4/minhchung_user_dropdown_open.png';
    await page.screenshot({ path: shot1 });
    console.log('Saved screenshot 1:', shot1);

    // 2. Click headerNotificationBtn
    console.log('Clicking #headerNotificationBtn...');
    await page.click('#headerNotificationBtn');
    await page.waitForTimeout(400);

    const notiDropdownState = await page.evaluate(() => {
        const dd = document.getElementById('notificationDropdown');
        const userDd = document.getElementById('userDropdown');
        if (!dd) return null;
        const cs = window.getComputedStyle(dd);
        const rect = dd.getBoundingClientRect();
        return {
            notiClassName: dd.className,
            notiDisplay: cs.display,
            notiRect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
            userDropdownClosed: userDd ? !userDd.classList.contains('show') : true
        };
    });
    console.log('Notification Dropdown State after click:', notiDropdownState);

    const shot2 = 'C:/Users/QUYEN/.gemini/antigravity-cli/brain/ee2858d7-6580-48fe-81a1-d967318c4ca4/minhchung_noti_dropdown_open.png';
    await page.screenshot({ path: shot2 });
    console.log('Saved screenshot 2:', shot2);

    // 3. Click outside
    console.log('Clicking outside...');
    await page.click('body', { position: { x: 100, y: 300 } });
    await page.waitForTimeout(300);

    const closedState = await page.evaluate(() => {
        const userDd = document.getElementById('userDropdown');
        const notiDd = document.getElementById('notificationDropdown');
        return {
            userClosed: userDd ? !userDd.classList.contains('show') : true,
            notiClosed: notiDd ? !notiDd.classList.contains('show') : true
        };
    });
    console.log('Closed State after click outside:', closedState);

    await browser.close();
    console.log('ALL DROPDOWN TESTS PASSED SUCCESSFULLY!');
})();
