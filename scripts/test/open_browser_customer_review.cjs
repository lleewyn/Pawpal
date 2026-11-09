// Visible interactive browser execution for Customer order review with photo on Preview.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const { connect } = require('../database/v1/service_import_connection.cjs');

const TARGET_URL = 'https://pawpalgr3-5bph12hep-llwyns-projects.vercel.app';
const CUSTOMER_PHONE = '0834562948';
const CUSTOMER_PASSWORD = process.env.CUSTOMER_PASSWORD || 'Customer@Pawpal2026!';
const ORDER_ID = '39a8a012-3774-4fe3-afb9-cac63a5c5d81';
const REVIEW_IMAGE_PATH = path.resolve('assets/images/publics/dogcute8.jpg');

(async () => {
    console.log('=== KHỞI CHẠY TRÌNH DUYỆT TRỰC QUAN (VISIBLE CHROME) ===');
    console.log('Mục tiêu : Nghiệm thu Đánh giá đơn hàng có ảnh thật bằng tài khoản Khách hàng');
    console.log('Khách hàng: Nguyễn Lê Thi (' + CUSTOMER_PHONE + ')');
    console.log('Đơn hàng  : ' + ORDER_ID);
    console.log('Ảnh gửi   : ' + REVIEW_IMAGE_PATH);
    console.log('URL       : ' + TARGET_URL);

    const bypassCookie = JSON.parse(fs.readFileSync('D:/Aboutme/Pawpal-infra/media/phase5-evidence-browser.private.json'));

    const browser = await chromium.launch({
        channel: 'chrome',
        headless: false,
        slowMo: 300
    });

    const context = await browser.newContext({
        viewport: { width: 1440, height: 950 }
    });
    await context.addCookies([bypassCookie]);

    const page = await context.newPage();

    let createdReviewId = null;
    let createdMediaAssetId = null;

    try {
        // ========================================================
        // BƯỚC 1: KHÁCH HÀNG ĐĂNG NHẬP BẰNG SỐ ĐIỆN THOẠI
        // ========================================================
        console.log('\n[Bước 1] Khách hàng mở trang đăng nhập...');
        await page.goto(TARGET_URL + '/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForSelector('#loginPhone', { timeout: 15000 });

        console.log('Điền số điện thoại: ' + CUSTOMER_PHONE);
        await page.fill('#loginPhone', CUSTOMER_PHONE);
        await page.click('#btnLoginContinue');

        console.log('Chờ bước nhập mật khẩu...');
        await page.waitForSelector('#loginStepPassword:not(.d-none) #loginPassword', { timeout: 15000 });
        await page.fill('#loginPassword', CUSTOMER_PASSWORD);

        console.log('Bấm Đăng nhập...');
        await page.click('#btnLoginSubmit');
        await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 25000 });
        console.log('Khách hàng đăng nhập thành công!');

        // ========================================================
        // BƯỚC 2: MỞ CHI TIẾT ĐƠN HÀNG VÀ CHỜ MỤC ĐÁNH GIÁ
        // ========================================================
        console.log('\n[Bước 2] Chuyển hướng đến chi tiết đơn hàng #ORD-20260930-506558...');
        await page.goto(TARGET_URL + '/pages/user/#order-detail?id=' + ORDER_ID + '&section=reviews', { waitUntil: 'domcontentloaded', timeout: 30000 });

        console.log('Chờ khối đánh giá #order-review-container hiển thị...');
        await page.waitForSelector('#order-review-container', { timeout: 20000 });
        await page.waitForTimeout(2000); // Đợi Realtime / DB hydrate đánh giá

        // Cuộn tới mục đánh giá
        await page.locator('#order-review-container').scrollIntoViewIfNeeded();

        // ========================================================
        // BƯỚC 3: ĐIỀN ĐÁNH GIÁ VÀ ĐÍNH KÈM ẢNH THẬT
        // ========================================================
        console.log('\n[Bước 3] Kiểm tra form đánh giá...');
        const reviewForm = page.locator('#sales-review-form');
        await reviewForm.waitFor({ timeout: 15000 });

        console.log('Chọn mức đánh giá 5/5 sao...');
        const ratingSelect = page.locator('#order-review-container select[data-review-rating]').first();
        await ratingSelect.selectOption('5');

        console.log('Nhập nội dung nhận xét chi tiết...');
        const contentTextarea = page.locator('#order-review-container textarea[data-review-content]').first();
        const reviewText = 'Sản phẩm thức ăn hạt dinh dưỡng cho mèo rất thơm ngon, bé nhà mình ăn rất thích và tiêu hóa tốt. Giao hàng nhanh và đóng gói kỹ càng!';
        await contentTextarea.fill(reviewText);

        console.log('Đính kèm tệp ảnh thật: ' + REVIEW_IMAGE_PATH);
        const fileInput = page.locator('#order-review-container [data-review-media] input[type="file"]').first();
        await fileInput.setInputFiles(REVIEW_IMAGE_PATH);

        console.log('Chờ ảnh xem trước xuất hiện trong khung ảnh...');
        await page.waitForSelector('#order-review-container [data-review-media] img', { timeout: 10000 });
        await page.waitForTimeout(1000);

        // ========================================================
        // BƯỚC 4: BẤM GỬI ĐÁNH GIÁ VÀ XÁC NHẬN KẾT QUẢ
        // ========================================================
        console.log('\n[Bước 4] Bấm nút "Gửi đánh giá"...');
        const submitBtn = page.locator('#sales-review-submit');
        await submitBtn.click();

        console.log('Chờ hệ thống lưu vào MongoDB GridFS và Supabase Cloud...');
        // Sau khi lưu xong, review-handler gọi init(orderId, products, true) -> hiển thị trạng thái "Chờ duyệt"
        await page.waitForSelector('#order-review-container p:has-text("Chờ duyệt")', { timeout: 25000 });
        console.log('Đánh giá đã được gửi thành công và chuyển sang trạng thái: Chờ duyệt!');

        // Chờ ảnh gallery sau khi lưu hiển thị
        await page.waitForTimeout(3000);

        // Chụp ảnh màn hình bằng chứng
        const screenshotPath = path.resolve('docs/verification/sync/customer-review-submitted-live.png');
        await page.screenshot({ path: screenshotPath, fullPage: false });
        console.log('Đã chụp ảnh màn hình nghiệm thu: ' + screenshotPath);

        // ========================================================
        // BƯỚC 5: ĐỐI SOÁT DỮ LIỆU CSDL SUPABASE & MONGODB
        // ========================================================
        console.log('\n[Bước 5] Đối soát dữ liệu CSDL Supabase Cloud...');
        const db = await connect();
        try {
            const reviewQuery = await db.query(`
                SELECT r.id, r.rating, r.review_content, r.review_status, r.created_at,
                       m.id as media_id, m.media_asset_id, m.image_url,
                       a.provider, a.size_bytes, a.mime_type, a.sha256, a.mongo_file_id
                FROM review r
                JOIN sales_order_detail d ON d.id = r.sales_order_detail_id
                LEFT JOIN review_media m ON m.review_id = r.id
                LEFT JOIN media_asset a ON a.id = m.media_asset_id
                WHERE d.sales_order_id = $1
            `, [ORDER_ID]);

            console.log('Kết quả đối soát Review:', JSON.stringify(reviewQuery.rows, null, 2));
            assert.ok(reviewQuery.rows.length > 0, 'Phải tìm thấy bản ghi review vừa tạo');

            const row = reviewQuery.rows[0];
            createdReviewId = row.id;
            createdMediaAssetId = row.media_asset_id;

            assert.equal(row.rating, 5, 'Rating phải là 5 sao');
            assert.equal(row.review_status, 'pending', 'Trạng thái ban đầu phải là pending (Chờ duyệt)');
            assert.equal(row.provider, 'mongodb_gridfs', 'Lưu trữ media phải là mongodb_gridfs');
            assert.ok(row.size_bytes > 0, 'Dung lượng byte phải lớn hơn 0');

            console.log('\n=== TỔNG KẾT NGHIỆM THU ĐÁNH GIÁ THÀNH CÔNG ===');
            console.log('Review ID       : ' + createdReviewId);
            console.log('Review Status   : ' + row.review_status + ' (Chờ duyệt)');
            console.log('Media Asset ID  : ' + createdMediaAssetId);
            console.log('Storage Provider: ' + row.provider);
            console.log('File Size       : ' + row.size_bytes + ' bytes');
            console.log('SHA256          : ' + row.sha256);
            console.log('Mongo File ID   : ' + row.mongo_file_id);

            // Ghi biên bản nghiệm thu
            const reportContent = `BIÊN BẢN NGHIỆM THU ĐÁNH GIÁ SẢN PHẨM CÓ ẢNH THẬT BẰNG TÀI KHOẢN KHÁCH HÀNG (LIVE PREVIEW)
Ngày thực hiện : ${new Date().toISOString()}
Môi trường     : Vercel Preview (${TARGET_URL})
Khách hàng     : Nguyễn Lê Thi (SĐT: ${CUSTOMER_PHONE}, ID: d0000000-0000-0000-0000-000000000006)
Đơn hàng       : ORD-20260930-506558 (ID: ${ORDER_ID})
Sản phẩm       : Thức ăn hạt dinh dưỡng cho mèo
Mức đánh giá   : 5/5 sao
Nội dung       : ${reviewText}
Trạng thái     : pending (Chờ duyệt)
Ảnh đính kèm   : assets/images/publics/dogcute8.jpg (${row.size_bytes} bytes)
Review ID      : ${createdReviewId}
Media Asset ID : ${createdMediaAssetId}
Storage        : ${row.provider}
Mongo File ID  : ${row.mongo_file_id}
SHA256 Hash    : ${row.sha256}
Ảnh chụp màn hình: docs/verification/sync/customer-review-submitted-live.png
Kết luận       : ĐẠT 100% tiêu chí nghiệm thu Giai đoạn 5 (Ảnh đánh giá của khách hàng thật).
`;
            fs.writeFileSync('docs/media/phase5-review-customer-live.txt', reportContent, 'utf8');
            console.log('Đã lưu biên bản: docs/media/phase5-review-customer-live.txt');

        } finally {
            await db.end();
        }

        console.log('\nGiữ trình duyệt 10 giây để người dùng quan sát kết quả trực tiếp...');
        await page.waitForTimeout(10000);

    } catch (err) {
        console.error('LỖI TRONG QUÁ TRÌNH NGHIỆM THU:', err);
        await page.screenshot({ path: 'docs/verification/sync/customer-review-error.png' }).catch(() => {});
        throw err;
    } finally {
        await browser.close();
    }
})();

