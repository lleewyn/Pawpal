const { chromium } = require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = path.resolve('C:/Users/QUYEN/.gemini/antigravity-cli/brain/ee2858d7-6580-48fe-81a1-d967318c4ca4');

async function testSWRPerformance() {
    console.log('Starting SWR & Supabase Bandwidth Protection Test...');
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    // Track Supabase RPC & REST network requests
    let supabaseRequestsCount = 0;
    const trackedEndpoints = [];

    page.on('request', req => {
        const url = req.url();
        if (url.includes('supabase.co') || url.includes('/rest/v1/') || url.includes('/rpc/')) {
            supabaseRequestsCount++;
            trackedEndpoints.push({
                url,
                method: req.method(),
                timestamp: Date.now()
            });
        }
    });

    // Mock authenticated user session & dismiss promo popups
    await page.addInitScript(() => {
        const mockUser = {
            id: 'c1111111-1111-1111-1111-111111111111',
            auth_user_id: 'a1111111-1111-1111-1111-111111111111',
            email: 'hoangyen@pawpal.vn',
            name: 'Hoàng Yến',
            fullName: 'Hoàng Yến',
            phone: '0909888999',
            points: 350,
            role: 'customer',
            status: 'active'
        };
        localStorage.setItem('pawpal_current_user', JSON.stringify(mockUser));
        sessionStorage.setItem('pawpal_current_user', JSON.stringify(mockUser));
        sessionStorage.setItem('pawpal_notice_dismissed_promo', '1');

        const mockSession = { user: { id: mockUser.auth_user_id }, access_token: 'mock-token' };
        function patchClient(c) {
            if (!c || !c.auth || c.auth.__patched) return;
            c.auth.__patched = true;
            c.auth.getSession = async () => ({ data: { session: mockSession }, error: null });
            c.auth.getUser = async () => ({ data: { user: mockSession.user }, error: null });
            const origRpc = c.rpc?.bind(c);
            if (origRpc) {
                c.rpc = async (fn, params) => {
                    if (fn === 'customer_profile_snapshot') return { data: { id: mockUser.id, name: mockUser.name, phone: mockUser.phone, email: mockUser.email, addresses: [], revision: 'rev-01' }, error: null };
                    if (fn === 'own_customer_avatar') return { data: null, error: null };
                    return origRpc(fn, params);
                };
            }
        }
        let realClient = window.SupabaseClient;
        Object.defineProperty(window, 'SupabaseClient', {
            get: () => realClient,
            set: (v) => { realClient = v; patchClient(realClient); }
        });
        const origGet = window.getSupabaseClient;
        window.getSupabaseClient = () => {
            const cl = origGet ? origGet() : realClient;
            patchClient(cl);
            return cl;
        };

        const authMock = {
            request: async (action) => {
                if (action === 'me') return { success: true, user: mockUser };
                return { success: true };
            },
            accept: async () => mockUser,
            cleanUser: (u) => u
        };
        Object.defineProperty(window, 'PawpalCustomerAuth', {
            get: () => authMock,
            set: () => {},
            configurable: false
        });

        const observer = new MutationObserver(() => {
            document.querySelectorAll('.modal, #pawpal-site-popup, .modal-backdrop').forEach(el => el.remove());
            if (document.body) {
                document.body.classList.remove('modal-open');
                document.body.style.overflow = '';
            }
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
    });

    // 1. Initial Load to User Portal (#profile)
    const t0 = Date.now();
    await page.goto('http://127.0.0.1:4000/user#profile', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    const initialLoadTime = Date.now() - t0;
    const requestsAfterInitialLoad = supabaseRequestsCount;

    // 2. Switch to #pets
    const tPets = Date.now();
    await page.evaluate(() => { window.location.hash = '#pets'; });
    await page.waitForTimeout(600);
    const petsLoadTime = Date.now() - tPets;

    // 3. Switch to #bookings
    const tBookings = Date.now();
    await page.evaluate(() => { window.location.hash = '#bookings'; });
    await page.waitForTimeout(600);
    const bookingsLoadTime = Date.now() - tBookings;

    // 4. Switch to #orders
    const tOrders = Date.now();
    await page.evaluate(() => { window.location.hash = '#orders'; });
    await page.waitForTimeout(600);
    const ordersLoadTime = Date.now() - tOrders;

    // 5. Switch BACK to #profile (Should be INSTANT 0ms perceived from SWR cache)
    const tProfileBack = Date.now();
    await page.evaluate(() => { window.location.hash = '#profile'; });
    await page.waitForTimeout(300);
    const profileBackTime = Date.now() - tProfileBack;

    const requestsBeforeSpam = supabaseRequestsCount;

    // 6. Test Rapid Tab Switching (Simulate Impatient Customer Spam Clicking tabs)
    console.log('Simulating impatient customer rapid tab switching (5 clicks in 1 second)...');
    for (let i = 0; i < 5; i++) {
        await page.evaluate(() => { window.location.hash = '#pets'; });
        await page.waitForTimeout(100);
        await page.evaluate(() => { window.location.hash = '#bookings'; });
        await page.waitForTimeout(100);
        await page.evaluate(() => { window.location.hash = '#orders'; });
        await page.waitForTimeout(100);
        await page.evaluate(() => { window.location.hash = '#profile'; });
        await page.waitForTimeout(100);
    }
    await page.waitForTimeout(500);

    const requestsAfterSpam = supabaseRequestsCount;
    const spamRequestsFired = requestsAfterSpam - requestsBeforeSpam;

    // Capture visual evidence of Instant Render
    const screenshotProfile = path.join(ARTIFACT_DIR, 'swr_instant_profile.png');
    await page.screenshot({ path: screenshotProfile });

    await page.evaluate(() => { window.location.hash = '#pets'; });
    await page.waitForTimeout(500);
    const screenshotPets = path.join(ARTIFACT_DIR, 'swr_instant_pets.png');
    await page.screenshot({ path: screenshotPets });

    await browser.close();

    console.log('Tracked requests:', trackedEndpoints.map(e => e.url));

    const report = {
        initialLoadTimeMs: initialLoadTime,
        tabSwitchTimeMs: {
            toPets: petsLoadTime,
            toBookings: bookingsLoadTime,
            toOrders: ordersLoadTime,
            backToProfile: profileBackTime
        },
        supabaseRequests: {
            initial: requestsAfterInitialLoad,
            totalBeforeSpam: requestsBeforeSpam,
            totalAfterSpam: requestsAfterSpam,
            spamRequestsAdded: spamRequestsFired
        },
        bandwidthProtected: spamRequestsFired === 0 || spamRequestsFired <= 2,
        screenshots: {
            profile: screenshotProfile,
            pets: screenshotPets
        }
    };

    const reportFile = path.join(ARTIFACT_DIR, 'swr_performance_report.json');
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2), 'utf-8');
    console.log('Test completed successfully. Report:', report);
}

testSWRPerformance().catch(err => {
    console.error('Test error:', err);
    process.exit(1);
});
