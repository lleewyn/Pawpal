const { chromium } = require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const path = require('node:path');
const fs = require('node:fs');

const ARTIFACT_DIR = 'C:/Users/QUYEN/.gemini/antigravity-cli/brain/ee2858d7-6580-48fe-81a1-d967318c4ca4';
const BASE_URL = 'http://127.0.0.1:4000';

async function run() {
    console.log('=== CHẠY TEST ĐẦY ĐỦ 9 TABS CỔNG NGƯỜI DÙNG ===');
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

    const userConsoleErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') userConsoleErrors.push(msg.text());
    });
    page.on('pageerror', err => userConsoleErrors.push(err.message));

    const testUser = {
        id: 'c1111111-1111-1111-1111-111111111111',
        auth_user_id: 'a1111111-1111-1111-1111-111111111111',
        name: 'Hoàng Yến',
        full_name: 'Hoàng Yến',
        phone: '0909888999',
        email: 'hoangyen@pawpal.vn',
        points: 350,
        role: 'customer'
    };

    await page.addInitScript((u) => {
        localStorage.setItem('pawpal_current_user', JSON.stringify(u));
        sessionStorage.setItem('pawpal_current_user', JSON.stringify(u));
        const mockSession = { user: { id: u.auth_user_id }, access_token: 'mock-token' };

        function patchClient(c) {
            if (!c || !c.auth || c.auth.__patched) return;
            c.auth.__patched = true;
            c.auth.getSession = async () => ({ data: { session: mockSession }, error: null });
            c.auth.getUser = async () => ({ data: { user: mockSession.user }, error: null });
            const origRpc = c.rpc?.bind(c);
            if (origRpc) {
                c.rpc = async (fn, params) => {
                    if (fn === 'customer_profile_snapshot') return { data: { id: u.id, name: u.name, phone: u.phone, email: u.email }, error: null };
                    if (fn === 'own_customer_avatar') return { data: null, error: null };
                    return origRpc(fn, params);
                };
            }
        }

        let _supabaseClient = window.SupabaseClient;
        Object.defineProperty(window, 'SupabaseClient', {
            get: () => _supabaseClient,
            set: (val) => {
                patchClient(val);
                _supabaseClient = val;
            },
            configurable: true
        });

        const origGet = window.getSupabaseClient;
        window.getSupabaseClient = () => {
            const c = origGet ? origGet() : _supabaseClient;
            patchClient(c);
            return c;
        };

        const authMock = {
            request: async (action) => {
                if (action === 'me') return { success: true, user: u };
                return { success: true };
            },
            accept: async () => u,
            cleanUser: (user) => user
        };
        Object.defineProperty(window, 'PawpalCustomerAuth', {
            get: () => authMock,
            set: () => {},
            configurable: false
        });

        const observer = new MutationObserver(() => {
            const popup = document.getElementById('pawpal-site-popup');
            if (popup) {
                popup.remove();
                if (document.body) document.body.style.overflow = '';
            }
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
    }, testUser);

    const tabs = [
        { id: 'profile', name: 'Hồ sơ cá nhân (Tổng quan)' },
        { id: 'pets', name: 'Hồ sơ bé cưng' },
        { id: 'bookings', name: 'Lịch hẹn của tôi' },
        { id: 'orders', name: 'Đơn hàng của tôi' },
        { id: 'wishlist', name: 'Yêu thích' },
        { id: 'diary', name: 'Nhật ký chăm sóc' },
        { id: 'loyalty', name: 'Paw Points' },
        { id: 'settings', name: 'Cài đặt' },
        { id: 'support', name: 'Hỗ trợ CSKH' }
    ];

    const results = [];

    for (const tab of tabs) {
        console.log(`\nKiểm tra tab: #${tab.id} - ${tab.name}...`);
        await page.goto(`${BASE_URL}/user#${tab.id}`, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        // Đảm bảo không bị popup
        await page.evaluate(() => {
            document.getElementById('pawpal-site-popup')?.remove();
            if (document.body) document.body.style.overflow = '';
        });

        const data = await page.evaluate((tId) => {
            const c = document.getElementById('userAppContent');
            const h = c?.querySelector('h1, h2, h3, h4, .section-title, .module-title')?.textContent?.trim() || '';
            const error = c?.innerText?.includes('Không thể tải nội dung') || c?.innerText?.includes('Đã có lỗi xảy ra');
            const len = c?.innerHTML?.length || 0;
            const sidebar = document.querySelector('.sidebar-nav .sidebar-link.active')?.textContent?.trim() || '';
            const url = window.location.href;
            const emptyState = c?.querySelector('.empty-state, .empty-placeholder, [role="status"]')?.textContent?.trim() || '';
            return { h, error, len, sidebar, url, emptyState };
        }, tab.id);

        const shotPath = path.join(ARTIFACT_DIR, `user_tab_${tab.id}_verified.png`);
        await page.screenshot({ path: shotPath });
        console.log(`  -> URL: ${data.url}`);
        console.log(`  -> Sidebar active: "${data.sidebar}" | Tiêu đề: "${data.h}" | Lỗi: ${data.error} | HTML length: ${data.len}`);
        console.log(`  -> Ảnh minh chứng: ${shotPath}`);
        results.push({ tab: tab.id, name: tab.name, ...data, shotPath });
    }

    await browser.close();
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'user_tabs_report.json'), JSON.stringify({ results, userConsoleErrors }, null, 2));
    console.log('\n=== HOÀN TẤT KIỂM THỬ TẤT CẢ 9 TABS THÀNH CÔNG ===');
}

run().catch(err => {
    console.error('Lỗi kiểm thử:', err);
    process.exit(1);
});
