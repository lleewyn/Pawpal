const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium } = require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const core = fs.readFileSync('pages/admin/modules/services/services.js', 'utf8');
const admin = fs.readFileSync('pages/admin/admin.js', 'utf8');
const detail = fs.readFileSync('pages/admin/modules/services/subtabs/tab-service-detail.js', 'utf8');
const switchCode = core.slice(core.indexOf('    let bookingDetailVersion ='), core.indexOf('    function openBookingDetail(bookingId)', core.indexOf('    let bookingDetailVersion =')));
const initCode = core.slice(core.indexOf('    let _isServicesInit ='), core.indexOf('    let _servicesRealtimeChannel ='));
const config = admin.slice(admin.indexOf("        'Dịch vụ':    {"), admin.indexOf("        'Bán hàng':", admin.indexOf("        'Dịch vụ':    {")));
const postLoad = config.slice(config.indexOf('postLoad: async () => {') + 'postLoad: '.length, config.lastIndexOf('\n        }')).trim();
(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage();
        await page.route('http://localhost:3000/', route => route.fulfill({ contentType: 'text/html', body: '<div class="admin-module-wrapper"><section id="subtab-tab-service-bookings" class="subtab-content"></section><section id="subtab-tab-service-detail" class="subtab-content"><div class="service-detail-card"></div><div id="serviceDetailState"></div></section></div>' }));
        await page.goto('http://localhost:3000/');
        await page.addScriptTag({ content: `
            sessionStorage.setItem('pawpal_admin_active_module','Dịch vụ');
            sessionStorage.setItem('pawpal_admin_services_active_subtab','tab-service-detail');
            window.PawpalServices={state:{bookingsData:[],selectedBookingId:'source-a'},subtabs:{}};
            window.reads=[];window.pending=[];
            function ensureBooking(id){reads.push(id);return new Promise((resolve,reject)=>pending.push({resolve,reject}));}
            function updateBreadcrumb(){} function setupServicesRealtimeSync(){} function syncComposeMedia(){}
            ${switchCode}
            ${initCode}
            PawpalServices.init=initServicesModule;
            // Simulate the core loading before its detail subtab registers.
            void initServicesModule();
            ${detail.slice(detail.indexOf('    function renderBookingDetail('), detail.indexOf("        if (card) card.style.display = '';"))}
            }
            PawpalServices.subtabs.detail={renderBookingDetail};
            window.postLoad=${postLoad};
        ` });
        await page.evaluate(() => postLoad());
        assert.deepEqual(await page.evaluate(() => reads), ['source-a']);
        assert.match(await page.locator('#serviceDetailState').innerText(), /Đang tải/);
        await page.evaluate(async () => { pending.shift().resolve(null); await Promise.resolve(); });
        assert.match(await page.locator('#serviceDetailState').innerText(), /Không tìm thấy/);
        // Return from a complaint into the cached module with a different appointment.
        await page.evaluate(async () => { PawpalServices.state.selectedBookingId='source-b'; await postLoad(); });
        assert.deepEqual(await page.evaluate(() => reads), ['source-a', 'source-b']);
        await page.evaluate(async () => { pending.shift().reject(Error('offline')); await Promise.resolve(); await Promise.resolve(); });
        assert.match(await page.locator('#serviceDetailState').innerText(), /Không thể tải/);
        await page.evaluate(async () => { PawpalServices.state.selectedBookingId=null; await postLoad(); });
        assert.match(await page.locator('#serviceDetailState').innerText(), /Chọn một lịch hẹn/);
        console.log('PASS initial and cached complaint service navigation; missing, failed and unselected appointment states. Browser fixtures only.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
