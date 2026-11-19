const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');

(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

        await page.route('**/*', route => {
            const url = new URL(route.request().url());
            if (url.pathname.endsWith('.css')) {
                const localCss = path.join(process.cwd(), url.pathname.replace(/^\//, ''));
                if (fs.existsSync(localCss)) {
                    return route.fulfill({ contentType: 'text/css', body: fs.readFileSync(localCss, 'utf8') });
                }
            }
            if (url.href.includes('localhost')) {
                return route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><meta charset="utf-8"></head><body class="admin-body"></body></html>' });
            }
            return route.abort();
        });

        await page.goto('http://localhost:3001/');

        const cssFiles = [
            'pages/admin/admin.css',
            'pages/admin/admin-shell-v7.css',
            'pages/admin/admin-components.css',
            'pages/admin/modules/staff/staff.css'
        ];

        const staffHtml = fs.readFileSync('pages/admin/modules/staff/staff.html', 'utf8');
        await page.setContent(`
            <!doctype html>
            <html lang="vi">
            <head>
                <meta charset="utf-8">
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #f0f4f2; margin: 0; padding: 20px; }
                </style>
            </head>
            <body class="admin-body">
                <div class="admin-preview-content" style="padding: 20px;">
                    ${staffHtml}
                </div>
            </body>
            </html>
        `);

        for (const f of cssFiles) {
            const cssPath = path.join(process.cwd(), f);
            if (fs.existsSync(cssPath)) {
                await page.addStyleTag({ content: fs.readFileSync(cssPath, 'utf8') });
            }
        }

        // Initialize PawpalStaff mock environment with Lê Lệ Quyên (EMP-001)
        await page.evaluate(() => {
            window.PawpalStaff = {
                state: {
                    staff: [
                        { id: 'EMP-001', rawId: 'EMP-001', name: 'Lê Lệ Quyên', position: 'Quản lý cửa hàng', phone: '0901234567', status: 'ACTIVE', raw: { employment_status: 'active', phone_number: '0901234567' } },
                        { id: 'EMP-002', rawId: 'EMP-002', name: 'Trần Văn B', position: 'Groomer', phone: '0988776655', status: 'ACTIVE', raw: { employment_status: 'active', phone_number: '0988776655' } }
                    ],
                    isLoaded: true,
                    shiftRequests: [],
                    assessments: [],
                    schedules: []
                },
                subtabs: {},
                showToast: () => {},
                enhanceEntitySelect: (sel) => {
                    if (!sel._entityInput) sel._entityInput = sel;
                }
            };
        });

        let code = fs.readFileSync('pages/admin/modules/staff/subtabs/tab-staff-list.js', 'utf8');
        code = code.slice(0, code.lastIndexOf("    if (document.readyState === 'loading')")) + '})();';
        await page.addScriptTag({ content: code });

        await page.evaluate(() => {
            PawpalStaff.subtabs.list.init();
            PawpalStaff.subtabs.list.openStaffModal();
            window.savedProfiles = [];
            PawpalStaff.createStaffAccount = async (profile) => {
                window.savedProfiles.push(profile);
            };
        });

        const artifactDir = 'C:/Users/QUYEN/.gemini/antigravity-cli/brain/af18ed42-cded-436c-b979-3645e2c03470';
        const docsDir = path.join(process.cwd(), 'docs/verification');

        // ==========================================
        // TESTCASE 1: SĐT dạng quốc tế +84901112233
        // ==========================================
        console.log('Testing Testcase 1: SĐT dạng quốc tế +84901112233...');
        await page.fill('#staffInputName', 'Nguyễn Văn F');
        await page.evaluate(() => {
            document.getElementById('staffInputPosition').value = 'Groomer';
            document.getElementById('staffInputJoinDate').value = '2026-11-16';
            document.getElementById('staffEmploymentStatus').value = 'active';
            document.getElementById('staffAccountEmail').value = 'nguyenvanf@pawpal.vn';
            document.getElementById('staffAccountPassword').value = 'Password123!';
        });

        // Type +84901112233 and blur
        await page.fill('#staffInputPhone', '+84901112233');
        await page.locator('#staffInputName').focus(); // triggers blur on phone input

        // Check if value automatically normalized on blur
        let phoneVal = await page.inputValue('#staffInputPhone');
        assert.equal(phoneVal, '0901112233', 'Phone must normalize to 0901112233 on blur');
        console.log('Phone successfully normalized on blur to:', phoneVal);

        // Click save and verify saved payload has normalized phone number
        await page.click('#btnSaveStaff');
        await page.waitForTimeout(100);
        const saved = await page.evaluate(() => window.savedProfiles);
        assert.equal(saved.length, 1);
        assert.equal(saved[0].phone_number, '0901112233', 'Saved profile must store normalized 0901112233');
        console.log('PASS Testcase 1: +84 normalized and saved properly as 0901112233!');

        // Take focused screenshot of normalized phone field
        const phoneGroup = await page.$('#staffInputPhone');
        if (phoneGroup) {
            const parent = await page.evaluateHandle(el => el.closest('.form-group-item'), phoneGroup);
            if (parent && parent.asElement()) {
                await parent.asElement().screenshot({ path: path.join(artifactDir, 'evidence_phone_normalized_84.png') });
                await parent.asElement().screenshot({ path: path.join(docsDir, 'evidence_phone_normalized_84.png') });
            }
        }

        // ==============================================================
        // TESTCASE 2: SĐT trùng nhân viên đang làm việc (0901234567)
        // ==============================================================
        console.log('Testing Testcase 2: SĐT trùng nhân viên Lê Lệ Quyên (EMP-001)...');
        await page.evaluate(() => {
            PawpalStaff.subtabs.list.openStaffModal();
        });
        await page.fill('#staffInputName', 'Nguyễn Văn F');
        await page.evaluate(() => {
            document.getElementById('staffInputPosition').value = 'Groomer';
            document.getElementById('staffInputJoinDate').value = '2026-11-16';
            document.getElementById('staffEmploymentStatus').value = 'active';
            document.getElementById('staffAccountEmail').value = 'nguyenvanf@pawpal.vn';
            document.getElementById('staffAccountPassword').value = 'Password123!';
        });

        // Enter duplicate phone
        await page.fill('#staffInputPhone', '0901234567');
        await page.click('#btnSaveStaff');

        const errorLocator = page.locator('#staffInputPhoneError');
        await errorLocator.waitFor({ state: 'visible' });
        const errorText = await errorLocator.innerText();
        console.log('Actual error message displayed for duplicate:', errorText);

        assert.equal(errorText, 'Số điện thoại đã thuộc nhân viên Lê Lệ Quyên (EMP-001).');
        console.log('PASS Testcase 2: Exactly detected duplicate with employee name and code!');

        // Verify no new staff was created
        const savedCount = await page.evaluate(() => window.savedProfiles.length);
        assert.equal(savedCount, 1, 'No new staff account created when phone is duplicate');

        // Take screenshot of duplicate error message
        if (phoneGroup) {
            const parent = await page.evaluateHandle(el => el.closest('.form-group-item'), phoneGroup);
            if (parent && parent.asElement()) {
                await parent.asElement().screenshot({ path: path.join(artifactDir, 'evidence_phone_duplicate_emp001.png') });
                await parent.asElement().screenshot({ path: path.join(docsDir, 'evidence_phone_duplicate_emp001.png') });
            }
        }

        const modalElement = await page.$('.admin-modal-card');
        if (modalElement) {
            await modalElement.screenshot({ path: path.join(artifactDir, 'evidence_testcase_duplicate_modal.png') });
            await modalElement.screenshot({ path: path.join(docsDir, 'evidence_testcase_duplicate_modal.png') });
        }

        console.log('All tests passed and evidence screenshots saved successfully.');
    } finally {
        await browser.close();
    }
})().catch(err => {
    console.error(err);
    process.exit(1);
});
