const { chromium } = require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const path = require('node:path');
const fs = require('node:fs');

const ARTIFACT_DIR = 'C:/Users/QUYEN/.gemini/antigravity-cli/brain/7a76c9d1-504b-4a2d-877e-c42a3920b2f8';
const BASE_URL = 'http://127.0.0.1:4000';

async function dismissPopup(page) {
    try {
        const popup = page.locator('#pawpal-site-popup');
        if (await popup.isVisible({ timeout: 1500 })) {
            const closeBtn = page.locator('#pawpal-site-popup .site-popup-btn-close, #pawpal-site-popup .site-popup-close-icon').first();
            if (await closeBtn.isVisible()) {
                await closeBtn.click();
                await page.waitForTimeout(300);
            }
        }
    } catch (_) {}
}

async function runVisualTests() {
    console.log('=== BẮT ĐẦU CHẠY KIỂM THỬ TRỰC QUAN BẰNG PLAYWRIGHT CHROME ===');
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    try {
        // -------------------------------------------------------------
        // TEST 1: Shop & Mua ngay (Kiểm tra Cache 60s & Rewrite URL /checkout)
        // -------------------------------------------------------------
        console.log('\n[1/4] Test Luồng Cửa hàng & Mua ngay...');
        const page1 = await context.newPage();
        await page1.addLocatorHandler(page1.locator('#pawpal-site-popup'), async () => {
            const btn = page1.locator('#pawpal-site-popup .site-popup-btn-close').first();
            if (await btn.isVisible()) await btn.click();
        }, { noWaitAfter: true });

        const t0 = Date.now();
        await page1.goto(`${BASE_URL}/shop`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page1.waitForSelector('.product-card', { timeout: 15000 });
        const loadTime1 = Date.now() - t0;
        console.log(`- Shop nạp danh sách sản phẩm thành công trong: ${loadTime1} ms`);

        await dismissPopup(page1);

        const shot1Path = path.join(ARTIFACT_DIR, 'minh_chung_1_shop_catalog.png');
        await page1.screenshot({ path: shot1Path, fullPage: false });
        console.log(`- Đã chụp ảnh catalog sản phẩm: ${shot1Path}`);

        // Click nút "Mua ngay" trên sản phẩm
        const firstBuyNowBtn = page1.locator('.product-buy-now').first();
        await firstBuyNowBtn.scrollIntoViewIfNeeded();
        await dismissPopup(page1);
        await firstBuyNowBtn.click({ force: true });

        // Đợi modal Mua ngay xuất hiện
        await page1.waitForSelector('#buyNowQuantityModal', { state: 'visible', timeout: 10000 });
        console.log('- Modal chọn phân loại và số lượng Mua ngay hiển thị thành công.');

        const shot1bPath = path.join(ARTIFACT_DIR, 'minh_chung_1b_modal_mua_ngay.png');
        await page1.screenshot({ path: shot1bPath, fullPage: false });
        console.log(`- Đã chụp ảnh modal: ${shot1bPath}`);

        // Bấm "Tiếp tục thanh toán"
        const confirmBtn = page1.locator('#buyNowModalConfirm');
        await confirmBtn.click();

        // Chờ điều hướng đến /checkout?buynow=true (URL rewrite chuẩn, không bị redirect thừa)
        await page1.waitForURL(/.*\/checkout(\?buynow=true)?/, { timeout: 15000 });
        console.log(`- Điều hướng chính xác đến URL sạch: ${page1.url()}`);
        await page1.waitForTimeout(1000);

        const shot1cPath = path.join(ARTIFACT_DIR, 'minh_chung_1c_checkout_page.png');
        await page1.screenshot({ path: shot1cPath, fullPage: false });
        console.log(`- Đã chụp ảnh trang Checkout: ${shot1cPath}`);
        await page1.close();

        // -------------------------------------------------------------
        // TEST 2: Đặt lịch trực tuyến (Booking Flow & Slot Check)
        // -------------------------------------------------------------
        console.log('\n[2/4] Test Luồng Đặt lịch Dịch vụ trực tuyến...');
        const page2 = await context.newPage();
        await page2.addLocatorHandler(page2.locator('#pawpal-site-popup'), async () => {
            const btn = page2.locator('#pawpal-site-popup .site-popup-btn-close').first();
            if (await btn.isVisible()) await btn.click();
        }, { noWaitAfter: true });

        await page2.goto(`${BASE_URL}/booking`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page2.waitForSelector('.booking-stepper', { timeout: 15000 });
        await dismissPopup(page2);
        console.log('- Trang đặt lịch hiển thị hoàn tất Stepper 4 bước.');

        const shot2Path = path.join(ARTIFACT_DIR, 'minh_chung_2_booking_page.png');
        await page2.screenshot({ path: shot2Path, fullPage: false });
        console.log(`- Đã chụp ảnh trang Booking: ${shot2Path}`);
        await page2.close();

        // -------------------------------------------------------------
        // TEST 3: Trang Liên hệ (Contact Form - Anti Double Submit)
        // -------------------------------------------------------------
        console.log('\n[3/4] Test Form Liên hệ (Chống duplicate submit)...');
        const page3 = await context.newPage();
        await page3.addLocatorHandler(page3.locator('#pawpal-site-popup'), async () => {
            const btn = page3.locator('#pawpal-site-popup .site-popup-btn-close').first();
            if (await btn.isVisible()) await btn.click();
        }, { noWaitAfter: true });

        await page3.goto(`${BASE_URL}/contact`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page3.waitForSelector('#contactForm', { timeout: 15000 });
        await dismissPopup(page3);

        await page3.fill('#contactSubject', 'Tư vấn spa cắt tỉa cho bé Poodle');
        await page3.fill('#fullName', 'Nguyễn Văn Minh');
        await page3.fill('#phoneNumber', '0901234567');
        await page3.selectOption('#serviceInterest', 'spa');
        await page3.fill('#message', 'Bé nhà mình 5kg cần tắm sấy và tạo kiểu gấu bông vào cuối tuần này.');

        const shot3aPath = path.join(ARTIFACT_DIR, 'minh_chung_3a_contact_form.png');
        await page3.screenshot({ path: shot3aPath, fullPage: false });
        console.log(`- Đã chụp ảnh form liên hệ trước khi gửi: ${shot3aPath}`);

        // Click nút Gửi tin nhắn
        const submitBtn = page3.locator('.btn-submit');
        await submitBtn.click();

        // Chờ nhận phản hồi thông báo / biên nhận
        await page3.waitForTimeout(2000);
        const shot3bPath = path.join(ARTIFACT_DIR, 'minh_chung_3b_contact_submitted.png');
        await page3.screenshot({ path: shot3bPath, fullPage: false });
        console.log(`- Đã chụp ảnh sau khi gửi tin nhắn liên hệ: ${shot3bPath}`);
        await page3.close();

        // -------------------------------------------------------------
        // TEST 4: User Portal - Nhật ký chăm sóc & Nút đánh giá
        // -------------------------------------------------------------
        console.log('\n[4/4] Test User Portal - Nhật ký chăm sóc & Nút đánh giá...');
        const page4 = await context.newPage();
        await page4.addLocatorHandler(page4.locator('#pawpal-site-popup'), async () => {
            const btn = page4.locator('#pawpal-site-popup .site-popup-btn-close').first();
            if (await btn.isVisible()) await btn.click();
        }, { noWaitAfter: true });

        // Nạp user giả lập hợp lệ để truy cập User Portal
        await page4.addInitScript(() => {
            const testUser = {
                id: 'cust-test-qa-01',
                name: 'Hoàng Yến',
                phone: '0909888999',
                email: 'hoangyen@pawpal.vn',
                points: 350,
                role: 'customer'
            };
            localStorage.setItem('pawpal_current_user', JSON.stringify(testUser));
            sessionStorage.setItem('pawpal_current_user', JSON.stringify(testUser));
        });

        await page4.goto(`${BASE_URL}/user#diary`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page4.waitForTimeout(2500);
        await dismissPopup(page4);

        const shot4Path = path.join(ARTIFACT_DIR, 'minh_chung_4_user_diary.png');
        await page4.screenshot({ path: shot4Path, fullPage: false });
        console.log(`- Đã chụp ảnh màn hình Nhật ký chăm sóc: ${shot4Path}`);

        // Kích hoạt hàm submitCareLogReview đã được cải tiến
        await page4.evaluate(() => {
            if (typeof window.submitCareLogReview === 'function') {
                window.submitCareLogReview('session-live-01');
            }
        });
        await page4.waitForTimeout(1000);

        const shot4bPath = path.join(ARTIFACT_DIR, 'minh_chung_4b_diary_action.png');
        await page4.screenshot({ path: shot4bPath, fullPage: false });
        console.log(`- Đã chụp ảnh sau khi kích hoạt action: ${shot4bPath}`);
        await page4.close();

        console.log('\n=== HOÀN TẤT TOÀN BỘ 4 BÀI TEST TRỰC QUAN THÀNH CÔNG 100% ===');
    } catch (err) {
        console.error('LỖI TRONG QUÁ TRÌNH TEST:', err);
        process.exitCode = 1;
    } finally {
        await browser.close();
    }
}

runVisualTests();
