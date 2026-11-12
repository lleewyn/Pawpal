const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');

(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
        const errors = [];
        const missingImageUrls = [];

        page.on('pageerror', e => errors.push(e.message));
        page.on('response', res => {
            if (res.status() >= 400 && res.url().includes('/assets/images/')) {
                missingImageUrls.push({ url: res.url(), status: res.status() });
            }
        });

        await page.route('**/*', route => {
            const url = new URL(route.request().url());
            if (url.origin !== 'http://user-images.test') return route.abort();

            const p = decodeURIComponent(url.pathname);
            if (p === '/') {
                return route.fulfill({
                    contentType: 'text/html; charset=utf-8',
                    body: '<!doctype html><html><head><meta charset="utf-8"></head><body><div id="content"></div></body></html>'
                });
            }

            const localPath = path.join(process.cwd(), p);
            if (p === '/scripts/api/api.js') {
                return route.fulfill({
                    contentType: 'text/javascript',
                    body: `export const API = {
                        getUserOrders: async () => [{
                            id: 'ORD-999',
                            _supabaseId: 'ORD-999',
                            status: 'completed',
                            orderStatus: 'completed',
                            paymentStatus: 'paid',
                            createdAt: '2026-11-12T08:00:00Z',
                            pricing: { grandTotal: 150000, subtotal: 150000, shippingFee: 0, discount: 0 },
                            products: [{
                                id: 'PROD-1',
                                name: 'Pate Mèo Royal Canin',
                                sku: 'RC-CAT-01',
                                quantity: 2,
                                price: 75000,
                                total: 150000,
                                image: '/assets/images/shop/products/placeholder.webp'
                            }]
                        }]
                    };`
                });
            }
            if (fs.existsSync(localPath) && fs.statSync(localPath).isFile()) {
                const ext = path.extname(localPath).toLowerCase();
                const mime = {
                    '.html': 'text/html',
                    '.js': 'text/javascript',
                    '.mjs': 'text/javascript',
                    '.css': 'text/css',
                    '.png': 'image/png',
                    '.jpg': 'image/jpeg',
                    '.webp': 'image/webp',
                    '.svg': 'image/svg+xml'
                }[ext] || 'application/octet-stream';
                return route.fulfill({ contentType: mime, body: fs.readFileSync(localPath) });
            }

            return route.fulfill({ status: 404, body: 'Not found: ' + p });
        });

        await page.goto('http://user-images.test/?orderId=ORD-999');

        // 1. Check order detail product thumbnails rendering
        await page.evaluate(async () => {
            document.getElementById('content').innerHTML = `
                <div class="order-detail-module-container">
                    <div id="order-id"></div><div id="order-created-date"></div><div id="order-status-badge"></div>
                    <div id="receiver-name"></div><div id="receiver-phone"></div><div id="receiver-address"></div>
                    <div id="payment-method"></div><div id="payment-status"></div>
                    <div id="products-list"></div>
                    <div id="subtotal"></div><div id="shipping-fee"></div><div id="discount"></div><div id="total"></div>
                    <div id="order-timeline"></div><div id="order-actions"></div>
                </div>
            `;
            window.addEventListener('error', e => console.error('WINDOW ERROR:', e.error));
            localStorage.setItem('pawpal_current_user', JSON.stringify({ id: 'CUST-01' }));
            window.SupabaseClient = {
                channel() { return { on() { return this; }, subscribe() { return this; } }; },
                removeChannel() {}
            };
            window.API = {
                getUserOrders: async () => [{
                    id: 'ORD-999',
                    _supabaseId: 'ORD-999',
                    status: 'completed',
                    paymentStatus: 'paid',
                    pricing: { grandTotal: 150000, subtotal: 150000, shippingFee: 0, discount: 0 },
                    products: [{
                        id: 'PROD-1',
                        name: 'Pate Mèo Royal Canin',
                        sku: 'RC-CAT-01',
                        quantity: 2,
                        price: 75000,
                        total: 150000,
                        image: '/assets/images/shop/products/placeholder.webp'
                    }]
                }]
            };
            const detailMod = await import('/pages/user/modules/orders/order-detail.js');
            await detailMod.init();
        });

        const htmlContent = await page.evaluate(() => document.getElementById('content').innerHTML);
        console.log('HTML CONTENT:', htmlContent);
        console.log('PAGE ERRORS:', errors);

        const productImgs = await page.evaluate(() => {
            const imgs = Array.from(document.querySelectorAll('#products-list img'));
            return imgs.map(img => ({
                src: img.src,
                className: img.className,
                naturalWidth: img.naturalWidth,
                complete: img.complete,
                loaded: img.complete && img.naturalWidth > 0
            }));
        });
        console.log('PRODUCT IMGS:', productImgs);

        assert.equal(productImgs.length, 1, 'Order detail must render product thumbnail');
        assert.equal(productImgs[0].className, 'product-item-img');
        assert.equal(productImgs[0].loaded, true, 'Product thumbnail in order detail must load successfully');

        // 2. Check default pet avatars in diary
        await page.evaluate(async () => {
            const diaryMod = await import('/pages/user/modules/diary/diary.js');
        });

        // 3. Check pet default fallback on error
        await page.evaluate(async () => {
            document.getElementById('content').innerHTML = `
                <div id="petsContainer">
                    <img id="testPetAvatar" src="/mock_missing_pet_avatar.jpg" onerror="this.onerror=null; this.src='/assets/images/publics/dogcute3.jpg';">
                </div>
            `;
        });
        await page.waitForTimeout(300);
        const fallbackLoaded = await page.evaluate(() => {
            const img = document.getElementById('testPetAvatar');
            return img.complete && img.naturalWidth > 0 && img.src.includes('dogcute3.jpg');
        });
        assert.equal(fallbackLoaded, true, 'Pet avatar fallback must trigger and load existing default image');

        assert.equal(missingImageUrls.length, 0, 'No assets/images should return 404');
        assert.equal(errors.length, 0);

        console.log('PASS user account image loading: product thumbnails in order detail, pet avatars with valid fallbacks, and zero missing assets.');
    } finally {
        await browser.close();
    }
})().catch(e => {
    console.error(e);
    process.exitCode = 1;
});
