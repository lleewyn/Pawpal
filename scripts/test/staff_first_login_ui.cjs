// Activate and verify STAFF account via first login password change on Admin UI.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');

const TARGET_URL = process.env.TEST_BASE_URL || 'https://pawpalgr3.vercel.app';
const STAFF_EMAIL = 'staff.grooming@pawpal.vn';
const TEMP_PASSWORD = 'Staff@Pawpal2026';
const NEW_PASSWORD = 'Staff@Pawpal2026!';

(async () => {
    console.log('--- Bắt đầu kích hoạt tài khoản STAFF qua lần đăng nhập đầu tiên ---');
    console.log('Môi trường:', TARGET_URL);
    console.log('Tài khoản :', STAFF_EMAIL);

    const browser = await chromium.launch({
        channel: 'chrome',
        headless: true
    });
    const context = await browser.newContext({
        viewport: { width: 1440, height: 1000 }
    });
    const page = await context.newPage();

    page.on('console', m => {
        if (m.type() === 'error') console.log('BROWSER ERROR:', m.text());
    });
    page.on('pageerror', e => console.log('PAGE ERROR:', e.message));

    try {
        // 1. Mở trang đăng nhập
        console.log('1. Mở trang đăng nhập Admin...');
        await page.goto(TARGET_URL + '/admin/login', { waitUntil: 'networkidle', timeout: 30000 });

        // 2. Nhập email và mật khẩu tạm
        console.log('2. Nhập thông tin đăng nhập tạm thời...');
        await page.fill('#inputAdminEmail', STAFF_EMAIL);
        await page.fill('#inputAdminPassword', TEMP_PASSWORD);
        await page.click('#btnSubmitAdminLogin');

        // 3. Chờ form đổi mật khẩu lần đầu xuất hiện
        console.log('3. Chờ màn hình yêu cầu đổi mật khẩu lần đầu (#sectionFirstChangePassword)...');
        await page.waitForSelector('#sectionFirstChangePassword', { state: 'visible', timeout: 15000 });
        console.log('Màn hình đổi mật khẩu lần đầu đã hiển thị thành công!');

        // 4. Nhập mật khẩu mới
        console.log('4. Nhập mật khẩu chính thức mới...');
        await page.fill('#inputNewPassword', NEW_PASSWORD);
        await page.fill('#inputConfirmPassword', NEW_PASSWORD);

        // 5. Submit đổi mật khẩu và chờ phản hồi API complete-password-change
        console.log('5. Bấm Lưu mật khẩu và vào hệ thống...');
        const [response] = await Promise.all([
            page.waitForResponse(res => res.url().includes('/api/admin/auth/complete-password-change') || res.url().includes('/api/staff-auth'), { timeout: 25000 }),
            page.click('#btnSubmitChangePass')
        ]);

        console.log('Phản hồi đổi mật khẩu HTTP:', response.status());
        assert.equal(response.status(), 200, 'API đổi mật khẩu phải trả về HTTP 200');

        // 6. Chờ chuyển hướng vào trang Admin
        console.log('6. Chờ chuyển hướng vào Admin...');
        await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 20000 });
        console.log('Chuyển hướng thành công. URL hiện tại:', page.url());

        // Đợi workspace của STAFF nạp xong
        await page.waitForTimeout(3000);

        // 7. Kiểm tra trạng thái phân quyền STAFF
        const staffState = await page.evaluate(() => {
            return {
                role: window.PawpalAdminAccess?.state?.role,
                isStaff: window.PawpalAdminAccess?.isStaff?.(),
                isAdmin: window.PawpalAdminAccess?.isAdmin?.(),
                user: window.PawpalAdminAccess?.state?.user ? {
                    id: window.PawpalAdminAccess.state.user.id,
                    name: window.PawpalAdminAccess.state.user.full_name || window.PawpalAdminAccess.state.user.name,
                    role: window.PawpalAdminAccess.state.user.system_role,
                    permissionsCount: window.PawpalAdminAccess.state.user.permissions?.length
                } : null,
                sidebarMenus: Array.from(document.querySelectorAll('.sidebar-menu-btn')).map(btn => btn.getAttribute('data-title')).filter(Boolean)
            };
        });

        console.log('\n--- THÔNG TIN XÁC THỰC VAI TRÒ STAFF ---');
        console.log('Vai trò hệ thống  :', staffState.role);
        console.log('isStaff()         :', staffState.isStaff);
        console.log('isAdmin()         :', staffState.isAdmin);
        console.log('Thông tin người dùng:', JSON.stringify(staffState.user, null, 2));
        console.log('Menu hiển thị     :', staffState.sidebarMenus.join(', '));
        console.log('----------------------------------------\n');

        assert.equal(staffState.role, 'STAFF', 'Vai trò tài khoản phải đúng là STAFF');
        assert.equal(staffState.isStaff, true, 'isStaff() phải là true');
        assert.equal(staffState.isAdmin, false, 'isAdmin() phải là false');

        // Chụp ảnh màn hình làm việc của STAFF
        const screenshotPath = 'docs/verification/sync/staff-workspace-live.png';
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log('Đã lưu ảnh màn hình:', screenshotPath);

        // Ghi tệp kết quả
        const result = {
            timestamp: new Date().toISOString(),
            status: 'SUCCESS',
            targetUrl: TARGET_URL,
            staffEmail: STAFF_EMAIL,
            newPassword: NEW_PASSWORD,
            state: staffState,
            message: 'Tài khoản STAFF đã đổi mật khẩu lần đầu và đăng nhập vào không gian làm việc STAFF thành công.'
        };

        fs.writeFileSync(
            'docs/verification/sync/staff-first-login-result.json',
            JSON.stringify(result, null, 2) + '\n',
            'utf8'
        );

        console.log('XÁC NHẬN: Tài khoản STAFF thật đã hoàn toàn kích hoạt và sẵn sàng cho các bài kiểm tra tiếp theo.');

    } catch (err) {
        console.error('LỖI KHI KÍCH HOẠT TÀI KHOẢN STAFF:', err);
        try {
            await page.screenshot({ path: 'docs/verification/sync/staff-first-login-error.png' });
        } catch {}
        throw err;
    } finally {
        await browser.close();
    }
})();

