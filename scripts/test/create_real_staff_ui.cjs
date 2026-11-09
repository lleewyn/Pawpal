// Create actual STAFF account directly on Admin UI (Cloud production URL) with minimal Supabase bandwidth.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');

const TARGET_URL = process.env.TEST_BASE_URL || 'https://pawpalgr3.vercel.app';
const infra = 'D:/Aboutme/Pawpal-infra/supabase-local';
const credentials = fs.readFileSync(path.join(infra, 'PAWPAL-ADMIN.private.txt'), 'utf8');

const STAFF_NAME = 'Nguyễn Văn Nhân';
let STAFF_EMAIL = 'staff.grooming@pawpal.vn';
const STAFF_PASSWORD = 'Staff@Pawpal2026';
const STAFF_POSITION = 'Kỹ thuật viên grooming';

(async () => {
    console.log('--- Bắt đầu tạo tài khoản nhân sự trực tiếp trên giao diện Admin ---');
    console.log('Môi trường:', TARGET_URL);

    const browser = await chromium.launch({
        channel: 'chrome',
        headless: true
    });
    const context = await browser.newContext({
        viewport: { width: 1440, height: 1000 }
    });
    const page = await context.newPage();

    page.on('console', m => {
        if (m.type() === 'error') console.log('BROWSER CONSOLE ERROR:', m.text());
    });
    page.on('pageerror', e => console.log('BROWSER PAGEERROR:', e.message));

    try {
        // 1. Đăng nhập Admin
        console.log('1. Đăng nhập Quản trị viên...');
        await page.goto(TARGET_URL + '/admin/login', { waitUntil: 'networkidle', timeout: 30000 });
        const adminEmail = credentials.match(/^Email: (.+)$/m)[1].trim();
        const adminPassword = credentials.match(/^Password: (.+)$/m)[1].trim();

        await page.fill('#inputAdminEmail', adminEmail);
        await page.fill('#inputAdminPassword', adminPassword);
        await page.click('#btnSubmitAdminLogin');
        await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 20000 });
        console.log('Đăng nhập Quản lý thành công. URL:', page.url());

        // 2. Chuyển sang phân hệ Nhân sự qua Hash #tab-staff-list
        console.log('2. Điều hướng đến phân hệ Nhân sự (#tab-staff-list)...');
        await page.waitForSelector('.sidebar-menu-btn', { timeout: 15000 });
        await page.evaluate(() => {
            window.location.hash = '#tab-staff-list';
        });

        // Chờ module Nhân sự nạp xong
        await page.waitForFunction(() => window.PawpalStaff?.state?.isLoaded === true, { timeout: 20000 });
        console.log('Phân hệ Nhân sự đã nạp thành công!');

        // Lấy danh sách nhân viên hiện có để kiểm tra trùng SĐT/email
        const existingStaff = await page.evaluate(() => {
            return (window.PawpalStaff?.state?.staff || []).map(s => ({
                id: s.id,
                name: s.name,
                phone: s.phone,
                email: s.email
            }));
        });
        console.log('Tổng số nhân sự hiện có trong hệ thống:', existingStaff.length);

        const existingPhones = existingStaff.map(s => s.phone).filter(Boolean);
        const existingEmails = existingStaff.map(s => (s.email || '').toLowerCase()).filter(Boolean);

        let targetPhone = '0918765432';
        while (existingPhones.includes(targetPhone)) {
            targetPhone = '0918' + Math.floor(100000 + Math.random() * 900000);
        }

        if (existingEmails.includes(STAFF_EMAIL.toLowerCase())) {
            STAFF_EMAIL = 'staff.grooming.' + Math.floor(1000 + Math.random() * 9000) + '@pawpal.vn';
        }
        console.log('Thông tin chuẩn bị tạo:');
        console.log('- Họ tên:', STAFF_NAME);
        console.log('- SĐT:', targetPhone);
        console.log('- Chức vụ:', STAFF_POSITION);
        console.log('- Email công vụ:', STAFF_EMAIL);
        console.log('- Vai trò: STAFF (Nhân viên)');

        // 3. Mở modal thêm nhân viên
        console.log('3. Mở modal thêm nhân viên...');
        await page.click('#btnOpenAddStaffModal');
        await page.waitForSelector('#staffModalOverlay.active', { timeout: 10000 });
        await page.waitForFunction(() => document.querySelector('#staffAccountRoles')?.childElementCount > 0, { timeout: 15000 });

        // 4. Điền form
        console.log('4. Điền các trường thông tin...');
        await page.fill('#staffInputName', STAFF_NAME);
        await page.fill('#staffInputPhone', targetPhone);
        await page.fill('#staffInputPosition', STAFF_POSITION);

        // Bật toggle tài khoản
        const enableToggle = page.locator('#staffEnableAccountToggle');
        if (!(await enableToggle.isChecked())) {
            await enableToggle.check();
        }

        await page.fill('#staffAccountEmail', STAFF_EMAIL);
        await page.fill('#staffAccountPassword', STAFF_PASSWORD);

        // Chọn vai trò STAFF
        console.log('Chọn vai trò radio: STAFF');
        const staffRoleRadio = page.locator('input[name="staffAccountRole"][value="STAFF"]');
        await staffRoleRadio.check();

        // 5. Lưu hồ sơ
        console.log('5. Bấm Lưu hồ sơ...');
        const [response] = await Promise.all([
            page.waitForResponse(res => res.url().includes('/api/admin/staff/provision-account'), { timeout: 30000 }),
            page.click('#btnSaveStaff')
        ]);

        const status = response.status();
        let resJson = {};
        try { resJson = await response.json(); } catch {}
        console.log('Phản hồi API provision-account:', status, JSON.stringify(resJson));

        assert.equal(status, 200, 'API provision-account phải trả HTTP 200');
        assert.equal(resJson.success, true, 'API provision-account phải trả success: true');

        // Chờ modal đóng
        await page.waitForSelector('#staffModalOverlay.active', { state: 'hidden', timeout: 15000 });
        console.log('Modal thêm nhân viên đã đóng thành công.');

        // Chờ danh sách cập nhật
        await page.waitForTimeout(2000);

        // Chụp ảnh bằng chứng
        const screenshotPath = 'docs/verification/sync/staff-created-ui.png';
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log('Đã lưu ảnh màn hình:', screenshotPath);

        // 6. Ghi log kết quả
        const resultData = {
            timestamp: new Date().toISOString(),
            status: 'SUCCESS',
            targetUrl: TARGET_URL,
            staff: {
                id: resJson.staffId,
                name: STAFF_NAME,
                email: STAFF_EMAIL,
                phone: targetPhone,
                role: 'STAFF',
                position: STAFF_POSITION,
                mustChangePassword: resJson.mustChangePassword ?? true
            },
            message: 'Đã tạo thành công tài khoản STAFF trực tiếp trên giao diện Admin PawPal.'
        };

        fs.writeFileSync(
            'docs/verification/sync/staff-created-ui-result.json',
            JSON.stringify(resultData, null, 2) + '\n',
            'utf8'
        );

        console.log('\n=============================================');
        console.log('ĐÃ TẠO THÀNH CÔNG TÀI KHOẢN NHÂN SỰ TRÊN UI!');
        console.log('=============================================');
        console.log('ID nhân viên        :', resJson.staffId);
        console.log('Họ và tên           :', STAFF_NAME);
        console.log('Chức vụ             :', STAFF_POSITION);
        console.log('Email đăng nhập     :', STAFF_EMAIL);
        console.log('Mật khẩu tạm        :', STAFF_PASSWORD);
        console.log('Số điện thoại       :', targetPhone);
        console.log('Vai trò hệ thống    : STAFF (Nhân viên)');
        console.log('Yêu cầu đổi mật khẩu:', resJson.mustChangePassword ? 'Có (lần đầu đăng nhập)' : 'Không');
        console.log('=============================================\n');

    } catch (err) {
        console.error('LỖI KHI TẠO NHÂN SỰ:', err);
        try {
            await page.screenshot({ path: 'docs/verification/sync/staff-create-error.png' });
        } catch {}
        throw err;
    } finally {
        await browser.close();
    }
})();
