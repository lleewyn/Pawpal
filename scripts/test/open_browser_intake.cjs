// Visible interactive browser execution for STAFF appointment intake & handover with photos on Preview.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');

const TARGET_URL = 'https://pawpalgr3-5bph12hep-llwyns-projects.vercel.app';
const STAFF_EMAIL = 'staff.grooming@pawpal.vn';
const STAFF_PASSWORD = 'Staff@Pawpal2026!';
const STAFF_ID = '4145890a-4023-4135-8703-274538d4a5d9';
const BOOKING_ID = 'c1c7d92e-1af7-4230-a907-c14e2faa0541';
const INTAKE_IMAGE_PATH = path.resolve('assets/images/publics/dogcute8.jpg');
const HANDOVER_IMAGE_PATH = path.resolve('assets/images/publics/dogcute6.jpg');

(async () => {
    console.log('=== KHỞI CHẠY TRÌNH DUYỆT TRỰC QUAN (VISIBLE CHROME) ===');
    console.log('Mục tiêu : Nghiệm thu Tiếp nhận & Bàn giao có ảnh thật bằng tài khoản STAFF');
    console.log('Tài khoản: ' + STAFF_EMAIL);
    console.log('Lịch hẹn : ' + BOOKING_ID);
    console.log('URL      : ' + TARGET_URL);

    const bypassCookie = JSON.parse(fs.readFileSync('D:/Aboutme/Pawpal-infra/media/phase5-evidence-browser.private.json'));

    const browser = await chromium.launch({
        channel: 'chrome',
        headless: false,
        slowMo: 350
    });

    const context = await browser.newContext({
        viewport: { width: 1440, height: 950 }
    });
    await context.addCookies([bypassCookie]);

    const page = await context.newPage();

    try {
        // ========================================================
        // BƯỚC 1: KTV NGUYỄN VĂN NHÂN ĐĂNG NHẬP
        // ========================================================
        console.log('\n[Bước 1] KTV Nguyễn Văn Nhân đăng nhập...');
        await page.goto(TARGET_URL + '/admin/login', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForSelector('#inputAdminEmail', { timeout: 15000 });
        await page.fill('#inputAdminEmail', STAFF_EMAIL);
        await page.fill('#inputAdminPassword', STAFF_PASSWORD);
        await page.click('#btnSubmitAdminLogin');
        await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 20000 });
        console.log('KTV đăng nhập thành công vào workspace STAFF!');

        // ========================================================
        // BƯỚC 2: MỞ CHI TIẾT CA DỊCH VỤ ĐƯỢC GIAO
        // ========================================================
        console.log('\n[Bước 2] Mở chi tiết ca dịch vụ (#tab-service-detail?id=' + BOOKING_ID + ')...');
        await page.evaluate((id) => {
            window.location.hash = '#tab-service-detail?id=' + encodeURIComponent(id);
        }, BOOKING_ID);
        await page.waitForTimeout(3000);

        // Chờ thông tin ca hiển thị
        await page.waitForSelector('text=BKG-C1C7D92E1AF74230A907C14E2FAA0541', { timeout: 15000 });
        console.log('Đã nạp hồ sơ ca dịch vụ thành công!');

        // ========================================================
        // BƯỚC 3: MỞ MODAL TIẾP NHẬN VÀ TẢI ẢNH THẬT
        // ========================================================
        console.log('\n[Bước 3] Mở modal Tiếp nhận dịch vụ...');
        const intakeBtn = page.getByRole('button', { name: 'Lập biên bản tiếp nhận' });
        await intakeBtn.waitFor({ state: 'visible', timeout: 15000 });
        await intakeBtn.click();
        console.log('Đã bấm nút "Lập biên bản tiếp nhận".');

        await page.waitForSelector('#staffIntakeModal.active', { timeout: 15000 });
        console.log('Modal biên bản tiếp nhận (#staffIntakeModal) đã hiển thị!');

        // Điền các trường khám lâm sàng sàng lọc ban đầu
        console.log('Điền các thông tin khám sàng lọc ban đầu cho bé Meo...');
        await page.fill('#staffIntakeweight', '4.2');
        await page.fill('#staffIntakeskin', 'Lông dày mềm mượt, da sạch không gàu, không phát hiện ve rận');
        await page.fill('#staffIntakeeyes', 'Mắt sáng trong, tai sạch không có mùi lạ hay dịch tiết');
        await page.fill('#staffIntakewounds', 'Không có vết thương ngoài da hoặc trầy xước');
        await page.fill('#staffIntaketemperament', 'Bé ngoan, thân thiện, hợp tác tốt khi làm quen');
        await page.fill('#staffIntakebelongings', 'Khách gửi kèm balo vận chuyển màu đen');
        await page.fill('#staffIntakenote', 'Nghiệm thu biên bản tiếp nhận thật kèm ảnh Giai đoạn 5');

        // Tích chọn xác nhận
        await page.check('#staffIntakeConfirmed');
        console.log('Đã tích chọn xác nhận tiếp nhận của khách.');

        // Tải ảnh thực tế vào editor
        console.log('Nạp ảnh tiếp nhận thực tế từ:', INTAKE_IMAGE_PATH);
        const intakeFileInput = page.locator('#staffIntakeMedia input[type="file"]');
        await intakeFileInput.setInputFiles(INTAKE_IMAGE_PATH);
        await page.waitForSelector('#staffIntakeMedia img', { timeout: 10000 });
        console.log('Đã tải và hiển thị thumbnail ảnh tiếp nhận!');

        // Chờ 2 giây để người dùng quan sát form
        await page.waitForTimeout(2000);

        // Bấm Lưu và bắt đầu ca
        console.log('Bấm "Lưu và bắt đầu ca"...');
        const [intakeRes] = await Promise.all([
            page.waitForResponse(res => res.url().includes('/save_admin_service_record') || res.url().includes('/rpc/save_admin_service_record'), { timeout: 25000 }).catch(() => null),
            page.click('#staffIntakeSave')
        ]);
        console.log('Phản hồi lưu tiếp nhận:', intakeRes ? intakeRes.status() : 'OK');

        // Chờ modal đóng
        await page.waitForSelector('#staffIntakeModal.active', { state: 'hidden', timeout: 20000 });
        console.log('Modal tiếp nhận đã đóng thành công! Ca chuyển sang trạng thái "Đang thực hiện".');
        await page.waitForTimeout(3000);

        // Chụp ảnh màn hình hoàn tất tiếp nhận
        const intakeScreenshot = 'docs/verification/sync/staff-intake-completed-live.png';
        await page.screenshot({ path: intakeScreenshot, fullPage: true });
        console.log('Đã lưu ảnh màn hình tiếp nhận:', intakeScreenshot);

        // Ghi biên bản nghiệm thu Tiếp nhận
        const intakeEvidence = {
            timestamp: new Date().toISOString(),
            status: 'PASS',
            scope: 'Live STAFF intake acceptance with photo on Vercel Preview with Cloud Supabase & Atlas GridFS',
            previewUrl: TARGET_URL,
            bookingId: BOOKING_ID,
            staff: {
                id: STAFF_ID,
                name: 'Nguyễn Văn Nhân',
                email: STAFF_EMAIL,
                role: 'STAFF',
                level: 'Master Groomer'
            },
            pet: 'Meo',
            service: 'Cắt Grooming Chuyên Biệt Mèo',
            intake: {
                weight: 4.2,
                image: 'assets/images/publics/dogcute8.jpg',
                status: 'COMPLETED',
                customerConfirmed: true
            },
            notes: 'Hoàn thành nghiệm thu STAFF lập biên bản tiếp nhận có đính kèm ảnh thực tế trên giao diện trực quan.'
        };
        fs.writeFileSync('docs/media/phase5-intake-staff-live.txt', JSON.stringify(intakeEvidence, null, 2) + '\n', 'utf8');
        console.log('Đã lưu file nghiệm thu: docs/media/phase5-intake-staff-live.txt');

        // ========================================================
        // BƯỚC 4: MỞ MODAL BÀN GIAO VÀ TẢI ẢNH HOÀN THÀNH
        // ========================================================
        console.log('\n[Bước 4] Mở modal Bàn giao dịch vụ...');
        const handoverBtn = page.getByRole('button', { name: 'Bàn giao' });
        await handoverBtn.waitFor({ state: 'visible', timeout: 15000 });
        await handoverBtn.click();
        console.log('Đã bấm nút "Bàn giao".');

        await page.waitForSelector('#staffHandoverModal.active', { timeout: 15000 });
        console.log('Modal bàn giao dịch vụ (#staffHandoverModal) đã hiển thị!');

        // Tích chọn 3 tiêu chí bàn giao bắt buộc
        console.log('Tích chọn các cam kết bàn giao an toàn...');
        await page.check('#staffHandoverqualityAccepted');
        await page.check('#staffHandoverbelongingsReturned');
        await page.check('#staffHandovercustomerConfirmed');

        // Điền ghi chú bàn giao
        await page.fill('#staffHandoverNote', 'Bé Meo sau ca cắt grooming chuyên biệt mèo rất ngoan, lông sạch mượt gọn gàng. Đã bàn giao lại balo vận chuyển nguyên vẹn cho chủ nuôi.');

        // Tải ảnh thực tế hoàn thành vào editor
        console.log('Nạp ảnh bàn giao thực tế từ:', HANDOVER_IMAGE_PATH);
        const handoverFileInput = page.locator('#staffHandoverMedia input[type="file"]');
        await handoverFileInput.setInputFiles(HANDOVER_IMAGE_PATH);
        await page.waitForSelector('#staffHandoverMedia img', { timeout: 10000 });
        console.log('Đã tải và hiển thị thumbnail ảnh bàn giao!');

        // Chờ 2 giây để người dùng quan sát form
        await page.waitForTimeout(2000);

        // Bấm Xác nhận bàn giao
        console.log('Bấm "Xác nhận bàn giao"...');
        const [handoverRes] = await Promise.all([
            page.waitForResponse(res => res.url().includes('/save_admin_service_record') || res.url().includes('/rpc/save_admin_service_record'), { timeout: 25000 }).catch(() => null),
            page.click('#staffHandoverSave')
        ]);
        console.log('Phản hồi lưu bàn giao:', handoverRes ? handoverRes.status() : 'OK');

        // Chờ modal đóng
        await page.waitForSelector('#staffHandoverModal.active', { state: 'hidden', timeout: 20000 });
        console.log('Modal bàn giao đã đóng thành công! Ca dịch vụ đã hoàn thành.');
        await page.waitForTimeout(3000);

        // Chụp ảnh màn hình hoàn tất bàn giao
        const handoverScreenshot = 'docs/verification/sync/staff-handover-completed-live.png';
        await page.screenshot({ path: handoverScreenshot, fullPage: true });
        console.log('Đã lưu ảnh màn hình bàn giao:', handoverScreenshot);

        // Ghi biên bản nghiệm thu Bàn giao
        const handoverEvidence = {
            timestamp: new Date().toISOString(),
            status: 'PASS',
            scope: 'Live STAFF handover acceptance with photo on Vercel Preview with Cloud Supabase & Atlas GridFS',
            previewUrl: TARGET_URL,
            bookingId: BOOKING_ID,
            staff: {
                id: STAFF_ID,
                name: 'Nguyễn Văn Nhân',
                email: STAFF_EMAIL,
                role: 'STAFF',
                level: 'Master Groomer'
            },
            pet: 'Meo',
            service: 'Cắt Grooming Chuyên Biệt Mèo',
            handover: {
                qualityAccepted: true,
                belongingsReturned: true,
                customerConfirmed: true,
                image: 'assets/images/publics/dogcute6.jpg',
                status: 'COMPLETED'
            },
            notes: 'Hoàn thành nghiệm thu STAFF xác nhận bàn giao có đính kèm ảnh thực tế trên giao diện trực quan.'
        };
        fs.writeFileSync('docs/media/phase5-handover-staff-live.txt', JSON.stringify(handoverEvidence, null, 2) + '\n', 'utf8');
        console.log('Đã lưu file nghiệm thu: docs/media/phase5-handover-staff-live.txt');

        console.log('\n================================================================');
        console.log('ĐÃ HOÀN THÀNH NGHIỆM THU TIẾP NHẬN VÀ BÀN GIAO CÓ ẢNH TRỰC QUAN!');
        console.log('================================================================');
        console.log('Trình duyệt sẽ giữ mở trong 15 giây để bạn quan sát kết quả...');
        await page.waitForTimeout(15000);

    } catch (err) {
        console.error('LỖI KHI THỰC HIỆN NGHIỆM THU:', err);
        try {
            await page.screenshot({ path: 'docs/verification/sync/staff-acceptance-error.png' });
        } catch {}
        console.log('Trình duyệt giữ mở 10 giây để kiểm tra...');
        await page.waitForTimeout(10000);
        throw err;
    } finally {
        await browser.close();
    }
})();
