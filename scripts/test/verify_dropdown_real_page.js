const { chromium } = require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');

(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

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
                // Only mock profile snapshot, keep all other RPCs intact
                const origRpc = client.rpc.bind(client);
                client.rpc = async (method, params) => {
                    if (method === 'customer_profile_snapshot') {
                        return { data: testUser, error: null };
                    }
                    return origRpc(method, params);
                };
            }
        }, 20);
        setTimeout(() => clearInterval(checkClient), 5000);
    });

    console.log('Navigating to real SVC-HTL-01...');
    await page.goto('http://localhost:4000/pages/services/service-detail/service-detail.html?id=SVC-HTL-01', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.service-detail-layout:not(.sd-loading)', { timeout: 8000 });
    await page.waitForTimeout(600);

    // Dismiss site popup if any
    await page.evaluate(() => {
        const popup = document.getElementById('pawpal-site-popup');
        if (popup) popup.remove();
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) backdrop.remove();
    });

    // Click user dropdown
    console.log('Clicking user dropdown...');
    await page.click('#userMenuToggle');
    await page.waitForTimeout(400);

    const shotFinal = 'C:/Users/QUYEN/.gemini/antigravity-cli/brain/ee2858d7-6580-48fe-81a1-d967318c4ca4/minhchung_service_detail_with_user_dropdown.png';
    await page.screenshot({ path: shotFinal });
    console.log('Saved final proof:', shotFinal);

    await browser.close();
})();
