const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {chromium} = require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');

// Isolated browser regression: real page, renderer and return dialog; no Cloud calls or writes.
(async () => {
    const browser = await chromium.launch({channel:'chrome', headless:true});
    const output = path.resolve('docs/verification/guest-return-request');
    fs.mkdirSync(output, {recursive:true});
    try {
        const page = await browser.newPage({viewport:{width:1280,height:960}});
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.route('**/*', route => {
            const url = new URL(route.request().url());
            if (url.hostname !== 'pawpal.test') {
                if (url.pathname.endsWith('/bootstrap.min.css')) return route.fulfill({contentType:'text/css',body:fs.readFileSync('node_modules/bootstrap/dist/css/bootstrap.min.css','utf8')});
                return route.abort();
            }
            if (url.pathname.endsWith('/guest-phone-lookup.mjs')) return route.fulfill({contentType:'text/javascript',body:'export function mountGuestPhoneLookup() {}'});
            const file = path.join(process.cwd(), url.pathname === '/' ? 'my-client/pages/public/return-guest/return-guest.html' : url.pathname);
            if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return route.abort();
            let body = fs.readFileSync(file);
            if (file.endsWith('.html')) body = body.toString().replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, tag => tag.includes('/return-guest.js?') ? tag : '');
            const contentType = ({'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'})[path.extname(file)] || 'application/octet-stream';
            return route.fulfill({contentType,body});
        });
        await page.goto('http://pawpal.test/');
        await page.waitForFunction(() => typeof window.handleGuestReturnRequest === 'function');
        await page.evaluate(() => {
            const now = new Date().toISOString();
            const order = {
                id:'TEST-RMA',_supabaseId:'11111111-1111-4111-8111-111111111111',
                status:'completed',paymentStatus:'pending',paymentMethod:'cod',
                createdAt:now,updatedAt:now,deliveredAt:now,returnGrant:'isolated-test-only',
                products:[{id:'test-line',name:'Tã quần vệ sinh siêu thấm hút cho chó Dono',quantity:1,price:145000,total:145000,image:'/assets/images/shop/products/placeholder.webp'}],
                pricing:{subtotal:145000,shippingFee:25000,total:170000},
                delivery:{name:'Khách kiểm thử',address:'Hồ Chí Minh'}
            };
            document.getElementById('rg-phone').value = '0901234567';
            rgVerifiedPhone = '0901234567';
            rgLastSearchState = {phone:rgVerifiedPhone,bookings:[],orders:[order]};
            document.getElementById('rg-results').classList.remove('d-none');
            renderResults([], [order]);
        });
        const request = page.getByRole('button',{name:'Yêu cầu đổi trả',exact:true});
        await request.scrollIntoViewIfNeeded();
        await page.locator('main').screenshot({path:path.join(output,'01-order-action.png')});
        await request.click();
        const dialog = page.locator('#verifiedGuestReturn');
        await dialog.waitFor({state:'visible'});
        assert.equal(await dialog.evaluate(node => node.open), true);
        assert.match(await dialog.innerText(), /TEST-RMA/);
        assert.match(await dialog.innerText(), /Tã quần vệ sinh/);
        await dialog.locator('.reason-quick-chip').first().click();
        assert.equal(await dialog.evaluate(node => node.open),true);
        assert.equal(await dialog.locator('textarea').inputValue(),await dialog.locator('.reason-quick-chip').first().innerText());
        await page.screenshot({path:path.join(output,'02-return-form-desktop.png')});
        await page.getByRole('button',{name:'Hủy bỏ',exact:true}).click();
        await dialog.waitFor({state:'detached'});
        await request.click();
        await dialog.waitFor({state:'visible'});
        await page.keyboard.press('Escape');
        await dialog.waitFor({state:'detached'});
        await page.setViewportSize({width:390,height:844});
        await request.click();
        await dialog.waitFor({state:'visible'});
        assert.equal(await dialog.evaluate(node => node.getBoundingClientRect().right <= innerWidth),true);
        await page.screenshot({path:path.join(output,'03-return-form-mobile.png')});
        await page.keyboard.press('Escape');
        await dialog.waitFor({state:'detached'});
        // A member order uses the shared drawer, receiving the selected order ID.
        await page.evaluate(() => {
            rgLastSearchState.orders[0].returnGrant = null;
            window.openRMADrawer = id => { window.openedReturnOrder = id; };
            renderResults([],rgLastSearchState.orders);
        });
        await request.click();
        assert.equal(await page.evaluate(() => window.openedReturnOrder),'TEST-RMA');
        assert.deepEqual(errors, []);
        console.log('PASS: rendered button opens verified return form; cancel, Escape, reopen, mobile fit and member drawer dispatch. No Cloud calls or submitted returns.');
    } finally {
        await browser.close();
    }
})().catch(error => {console.error(error);process.exitCode=1;});
