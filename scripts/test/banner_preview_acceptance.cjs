// Live acceptance test for Admin Banner update with real image upload on Vercel Preview.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const { connect } = require('../database/v1/service_import_connection.cjs');

const TARGET_URL = 'https://pawpalgr3-5bph12hep-llwyns-projects.vercel.app';
const credentials = fs.readFileSync('D:/Aboutme/Pawpal-infra/supabase-local/PAWPAL-ADMIN.private.txt', 'utf8');
const ADMIN_EMAIL = credentials.match(/^Email: (.+)$/m)[1].trim();
const ADMIN_PASSWORD = credentials.match(/^Password: (.+)$/m)[1].trim();

const BANNER_ID = 'df11737a-4655-404f-9cba-3f9b6b363561'; // Pet Hotel - An tâm khi bạn vắng nhà
const BANNER_IMAGE_PATH = path.resolve('assets/images/banners/hotel_animation.png');

(async () => {
    console.log('=== KHỞI CHẠY NGHIỆM THU BANNER TRÊN VERCEL PREVIEW ===');
    console.log('Mục tiêu : Thay thế ảnh Banner thật (hotel_animation.png <= 3 MiB) qua modal Admin');
    console.log('URL      : ' + TARGET_URL);
    console.log('Banner ID: ' + BANNER_ID);
    console.log('Ảnh      : ' + BANNER_IMAGE_PATH + ' (' + fs.statSync(BANNER_IMAGE_PATH).size + ' bytes)');

    const bypassCookie = JSON.parse(fs.readFileSync('D:/Aboutme/Pawpal-infra/media/phase5-evidence-browser.private.json'));

    const browser = await chromium.launch({
        channel: 'chrome',
        headless: true
    });

    const context = await browser.newContext({
        viewport: { width: 1440, height: 950 }
    });
    await context.addCookies([bypassCookie]);

    const page = await context.newPage();

    try {
        // 1. Admin đăng nhập
        console.log('\n[1] Đăng nhập Admin...');
        await page.goto(TARGET_URL + '/admin/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForSelector('#inputAdminEmail', { timeout: 15000 });
        await page.fill('#inputAdminEmail', ADMIN_EMAIL);
        await page.fill('#inputAdminPassword', ADMIN_PASSWORD);
        await page.click('#btnSubmitAdminLogin');
        await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 20000 });
        console.log('Admin đăng nhập thành công!');

        // 2. Chuyển đến subtab Banner và Khuyến mãi
        console.log('\n[2] Mở phân hệ Cài đặt -> Subtab Banner (#tab-banner-promos)...');
        await page.evaluate(() => {
            sessionStorage.setItem('pawpal_admin_active_module', 'Cấu hình');
            window.location.hash = '#tab-banner-promos';
        });
        await page.waitForTimeout(3000);

        // Chuyển sang pill "Banner Website"
        console.log('Chuyển sang tab con "Banner Website"...');
        const bannerTabBtn = page.locator('button[data-settingstab="mkt-banners"]');
        await bannerTabBtn.waitFor({ state: 'visible', timeout: 15000 });
        await bannerTabBtn.click();
        await page.waitForTimeout(1000);

        // Chờ danh sách banner hiển thị
        const editBtn = page.locator('.btn-edit-banner[data-id="' + BANNER_ID + '"]');
        await editBtn.waitFor({ state: 'visible', timeout: 15000 });
        console.log('Đã tìm thấy card Banner trong danh sách quản trị!');

        // 3. Mở modal sửa banner
        console.log('\n[3] Bấm nút Sửa banner...');
        await editBtn.click();
        await page.waitForSelector('#bannerModalOverlay.active', { timeout: 15000 });
        console.log('Modal sửa banner (#bannerModalOverlay) đã hiển thị!');

        // 4. Chọn chế độ "Tải ảnh lên" (Upload file)
        console.log('Chọn chế độ "Tải ảnh lên"...');
        const uploadRadio = page.locator('#bannerMediaEditor input[data-media-mode][value="upload"]');
        await uploadRadio.check();
        await page.waitForTimeout(500);

        // 5. Nạp tệp ảnh hotel_animation.png vào input file
        console.log('Nạp tệp ảnh từ:', BANNER_IMAGE_PATH);
        const fileInput = page.locator('#bannerMediaEditor input[data-media-files]');
        await fileInput.setInputFiles(BANNER_IMAGE_PATH);

        // Chờ hiển thị thumbnail ảnh
        await page.waitForSelector('#bannerMediaEditor img', { timeout: 10000 });
        console.log('Thumbnail ảnh banner đã hiển thị trong form!');

        // 6. Bấm Lưu thay đổi
        console.log('\n[4] Bấm "Lưu thay đổi"...');
        const saveBtn = page.locator('#btnSaveBanner');
        await saveBtn.click();

        // Chờ modal đóng
        await page.waitForSelector('#bannerModalOverlay.active', { state: 'hidden', timeout: 25000 });
        console.log('Modal sửa banner đã đóng! Đã lưu thay đổi thành công.');
        await page.waitForTimeout(3000);

        // 7. Chụp ảnh màn hình bằng chứng
        const screenshotPath = 'docs/verification/sync/banner-updated-live.png';
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log('Đã lưu ảnh màn hình:', screenshotPath);

        // 8. Đối soát CSDL Cloud
        console.log('\n[5] Đối soát bản ghi trong CSDL Supabase Cloud...');
        const db = await connect();
        let dbRecord;
        try {
            const res = await db.query(`
                SELECT b.id, b.title, b.image_url, b.image_media_asset_id, 
                       m.size_bytes, m.mime_type, m.provider
                FROM banner b
                LEFT JOIN media_asset m ON m.id = b.image_media_asset_id
                WHERE b.id = $1
            `, [BANNER_ID]);
            dbRecord = res.rows[0];
            console.log('Bản ghi CSDL:', JSON.stringify(dbRecord, null, 2));
            assert.ok(dbRecord.image_media_asset_id, 'Phải có image_media_asset_id');
            assert.equal(dbRecord.provider, 'mongodb_gridfs');
        } finally {
            await db.end();
        }

        // 9. Lưu biên bản nghiệm thu
        const evidence = {
            timestamp: new Date().toISOString(),
            status: 'PASS',
            scope: 'Live Admin banner image upload acceptance on Vercel Preview with Cloud Supabase & Atlas GridFS',
            previewUrl: TARGET_URL,
            banner: {
                id: BANNER_ID,
                title: dbRecord.title,
                assetId: dbRecord.image_media_asset_id,
                sizeBytes: dbRecord.size_bytes,
                mimeType: dbRecord.mime_type,
                provider: dbRecord.provider,
                sourceFile: 'assets/images/banners/hotel_animation.png'
            },
            notes: 'Hoàn thành nghiệm thu Admin thay thế ảnh Banner thật bằng tệp hotel_animation.png (<= 3 MiB) lưu trữ vào MongoDB GridFS trên Vercel Preview.'
        };
        fs.writeFileSync('docs/media/phase5-banner-live.txt', JSON.stringify(evidence, null, 2) + '\n', 'utf8');
        console.log('Đã ghi nhận biên bản nghiệm thu: docs/media/phase5-banner-live.txt');

        console.log('\n======================================================');
        console.log('NGHIỆM THU LƯU ẢNH BANNER TRÊN PREVIEW THÀNH CÔNG 100%!');
        console.log('======================================================');
    } finally {
        await browser.close();
    }
})().catch(err => {
    console.error('LỖI KHI NGHIỆM THU BANNER:', err);
    process.exit(1);
});
