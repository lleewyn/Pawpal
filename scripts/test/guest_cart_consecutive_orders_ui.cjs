const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');

const origin = 'http://localhost:4568';
const phone = '0901234567';
const products = [
    { name: 'Bánh mài răng', quantity: 1, price: 39000 },
    { name: 'Cát vệ sinh đậu nành', quantity: 2, price: 120000 },
    { name: 'Thức ăn cho mèo', quantity: 3, price: 25000 }
].map((product, index) => ({
    ...product,
    id: `${index + 1}2345678-1234-4123-8123-123456789012`
}));
const lines = products.map(product => ({ variant_id: product.id, quantity: product.quantity }));
const pages = {
    '/cart': 'pages/shop/cart/cart.html',
    '/checkout': 'pages/shop/checkout/checkout.html',
    '/return-guest': 'pages/public/return-guest/return-guest.html'
};
const scriptAllowlist = /\/(cart|checkout|return-guest|spa-router)\.js$|\.mjs$|\/bootstrap\.bundle\.min\.js$/;
const mime = {
    '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
    '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp',
    '.jpg': 'image/jpeg', '.woff2': 'font/woff2'
};

(async () => {
    const browser = await chromium.launch({ channel: 'chrome' });
    const output = fs.mkdtempSync(path.join(os.tmpdir(), 'pawpal-two-guest-orders-'));
    try {
        const page = await browser.newPage({ viewport: { width: 1440, height: 1140 } });
        page.setDefaultTimeout(7000);
        const orders = new Map();
        const calls = [];
        const errors = [];
        const checkoutRequests = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.addInitScript(({ products, lines }) => {
            const catalog = products.map(product => ({
                id: product.id, name: product.name,
                variants: [{ id: product.id, name: 'Tiêu chuẩn', price: product.price, stock: 20 }]
            }));
            if (!sessionStorage.getItem('cart-fixture-started')) {
                sessionStorage.setItem('cart-fixture-started', '1');
                localStorage.setItem('pawpal_guest_cart_v1', JSON.stringify(lines));
            }
            window.DataLoader = { loadCartProducts: async ids => catalog.filter(product => ids.includes(product.id)) };
            window.getSupabaseClient = () => ({
                auth: { getSession: async () => ({ data: { session: null } }) },
                rpc: async () => ({ data: { delivery_options: [], payment_methods: [{ id: 'cash', name: 'Tiền mặt', short_name: 'cash' }] } })
            });
        }, { products, lines });

        await page.route('**/*', async route => {
            const request = route.request();
            const url = new URL(request.url());
            if (url.hostname === 'cdn.jsdelivr.net' && url.pathname.includes('/bootstrap@')) {
                const relativeFile = url.pathname.split('/dist/')[1];
                const file = path.join('node_modules/bootstrap/dist', relativeFile);
                return route.fulfill({ path: file, contentType: mime[path.extname(file)] });
            }
            if (url.origin !== origin) return route.abort();
            if (url.pathname === '/__test/commerce') {
                const { action, body } = request.postDataJSON();
                calls.push({ action, body });
                const contact = { name: 'Khách kiểm thử', phone };
                const orderLines = () => body.lines.map(line => {
                    const product = products.find(product => product.id === line.variant_id);
                    return { variantId: product.id, name: product.name, quantity: line.quantity, unitPrice: product.price };
                });
                const total = items => items.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
                if (action === 'context') {
                    if (orders.size === 1) await new Promise(resolve => setTimeout(resolve, 300));
                    return route.fulfill({ json: { contact: orders.size ? contact : null } });
                }
                if (action === 'order-quote') {
                    const items = orderLines();
                    return route.fulfill({ json: { quote: { version: 'checked', lines: items, total: total(items), shipping_fee: 0 } } });
                }
                if (action === 'order-create') {
                    assert.equal(body.expectedQuote, 'checked');
                    const items = orderLines();
                    orders.set(body.requestId, { code: `SO-KIEM-THU-${orders.size + 1}`, status: 'pending', paymentStatus: 'pending', total: total(items), lines: items });
                    return route.fulfill({ json: {} });
                }
                if (action === 'order-receipt') {
                    const order = orders.get(body.requestId);
                    return order ? route.fulfill({ json: { order } }) : route.fulfill({ status: 404, json: {} });
                }
                if (action === 'phone-lookup') {
                    assert.equal(body.phone, phone);
                    if (!body.challengeId) return route.fulfill({ json: { requiresOtp: true, challengeId: 'fixture', testMode: true, testCode: '123456' } });
                    assert.equal(body.code, '123456');
                    return route.fulfill({ json: {
                        customer: contact, bookings: [], pagination: { hasMore: false },
                        orders: [...orders].reverse().map(([id, order]) => ({
                            id, order_code: order.code, order_status: order.status, total_amount: order.total,
                            payment_status: order.paymentStatus, created_at: '2026-11-25T08:00:00Z',
                            sales_order_detail: order.lines.map(line => ({ product_name_snapshot: line.name, quantity: line.quantity, unit_price: line.unitPrice }))
                        }))
                    } });
                }
                throw Error(`Unexpected commerce action ${action}`);
            }
            if (pages[url.pathname]) {
                if (url.pathname === '/checkout' && ['document', 'fetch'].includes(request.resourceType())) checkoutRequests.push(url.search);
                const html = fs.readFileSync(path.join('my-client', pages[url.pathname]), 'utf8')
                    .replace(/<link href="https:\/\/cdn\.jsdelivr\.net\/npm\/bootstrap@[^>]+>/, '<link rel="stylesheet" href="/node_modules/bootstrap/dist/css/bootstrap.min.css">');
                return route.fulfill({ body: html, contentType: 'text/html; charset=utf-8' });
            }
            if (url.pathname === '/scripts/shared/guest-commerce-client.mjs') return route.fulfill({
                contentType: 'text/javascript',
                body: `export const guestCommerce={async request(action,body){
                    const result=await fetch('/__test/commerce',{method:'POST',body:JSON.stringify({action,body})});
                    if(!result.ok)throw Object.assign(Error('Not found'),{status:result.status});
                    return result.json();
                }};`
            });
            if (request.resourceType() === 'script' && !scriptAllowlist.test(url.pathname)) return route.abort();
            const file = path.join(url.pathname.startsWith('/node_modules/') ? '.' : 'my-client', url.pathname);
            if (fs.existsSync(file) && fs.statSync(file).isFile()) return route.fulfill({ path: file, contentType: mime[path.extname(file)] });
            return route.abort();
        });

        const screenshot = async name => {
            await page.evaluate(() => window.scrollTo(0, 0));
            await page.screenshot({ path: path.join(output, name + '.png'), fullPage: true, animations: 'disabled' });
        };
        const cartRows = page.locator('#cart-items-list .cart-item-row');
        const check = index => cartRows.locator('.item-checkbox').nth(index);
        const receipt = page.locator('#guest-order-result .transaction-receipt');
        const quote = page.locator('#guest-quote-button');
        const placeOrder = page.locator('#guest-place-order');
        async function checkout() {
            await page.locator('#btn-proceed-checkout').click();
            await page.waitForURL('**/checkout?cartAttempt=*');
            await page.waitForFunction(() => document.getElementById('guest-quote-button')?.disabled === false);
            assert.equal(await receipt.count(), 0);
            return new URL(page.url()).searchParams.get('cartAttempt');
        }
        async function review() {
            await page.locator('#guest-delivery-choices input[value="pickup"]').check();
            await quote.click();
            await page.waitForFunction(() => document.getElementById('guest-place-order')?.disabled === false);
        }
        async function lookup(expected) {
            await page.getByRole('link', { name: 'Tra cứu đơn hàng', exact: true }).click();
            await page.locator('#rg-phone').fill(phone);
            await page.locator('#rg-form button[type="submit"]').click();
            const otp = page.locator('#rg-otp-modal input');
            for (let i = 0; i < 6; i++) await otp.nth(i).fill(String(i + 1));
            await page.locator('#rg-otp-confirm').click();
            await page.locator('#rg-otp-modal').waitFor({ state: 'detached' });
            const cards = page.locator('.rg-item[data-type="order"]');
            await cards.first().waitFor();
            assert.equal(await cards.count(), expected);
            return cards;
        }

        await page.goto(origin + '/cart');
        await cartRows.nth(2).waitFor();
        await check(2).uncheck();
        await check(1).uncheck();
        const firstAttempt = await checkout();
        await page.locator('#guest-name').fill('Khách kiểm thử');
        await page.locator('#guest-phone').fill(phone);
        await review();
        await placeOrder.click();
        await receipt.waitFor();
        assert.equal(await page.locator('#guest-checkout-form').isVisible(), false);
        assert.match(await receipt.innerText(), /SO-KIEM-THU-1/);
        assert.deepEqual(await receipt.locator('.receipt-product').allTextContents(), ['Bánh mài răng× 1']);
        await screenshot('01-don-thu-nhat');

        await lookup(1);
        const firstId = [...orders.keys()][0];
        // A receipt exists on the server even if an older checkout left its request marked as submitted.
        await page.evaluate(({ firstId, firstLine }) => sessionStorage.setItem('pawpal_guest_order_request_v1', JSON.stringify({
            id: firstId, phase: 'submitted', mode: 'cart', lines: [firstLine]
        })), { firstId, firstLine: lines[0] });
        await page.goto(origin + '/cart');
        await cartRows.nth(1).waitFor();
        assert.equal(await cartRows.count(), 2);
        assert.deepEqual(await cartRows.evaluateAll(rows => rows.map(row => row.dataset.variantId)), lines.slice(1).map(line => line.variant_id));
        await check(0).check();
        await check(1).check();
        await screenshot('02-gio-hang-con-hai-san-pham');

        const callsBefore = calls.length;
        const secondAttempt = await checkout();
        assert.notEqual(secondAttempt, firstAttempt);
        assert.equal(await page.locator('#guest-name').inputValue(), 'Khách kiểm thử');
        assert.equal(await page.locator('#guest-phone').inputValue(), phone);
        assert.equal(calls.slice(callsBefore).some(call => call.action === 'order-receipt'), false);
        await review();
        await screenshot('03-thanh-toan-don-thu-hai');
        await placeOrder.click();
        await receipt.waitFor();
        assert.match(await receipt.innerText(), /SO-KIEM-THU-2/);
        assert.deepEqual(await receipt.locator('.receipt-product').allTextContents(), ['Cát vệ sinh đậu nành× 2', 'Thức ăn cho mèo× 3']);
        await screenshot('04-don-thu-hai');

        await page.reload();
        await receipt.waitFor();
        assert.match(await receipt.innerText(), /SO-KIEM-THU-2/);
        const cards = await lookup(2);
        assert.deepEqual(await cards.locator('.rg-code').allTextContents(), ['SO-KIEM-THU-2', 'SO-KIEM-THU-1']);
        assert.deepEqual(await cards.locator('.rg-product-name').allTextContents(), products.slice(1).concat(products[0]).map(product => product.name));
        assert.deepEqual((await cards.locator('.rg-product-price-qty').allTextContents()).map(text => text.split('×')[1].trim()), ['2', '3', '1']);
        await screenshot('05-tra-cuu-hai-don');

        const writes = calls.filter(call => call.action === 'order-create');
        assert.deepEqual(writes.map(call => call.body.lines), [lines.slice(0, 1), lines.slice(1)]);
        assert.notEqual(writes[0].body.requestId, writes[1].body.requestId);
        assert.equal(checkoutRequests.some(search => search === ''), false, 'SPA router did not open a parallel unscoped checkout');
        assert.deepEqual(errors, []);
        console.log('PASS consecutive guest orders through the cart and OTP lookup with fixture API.', output);
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
