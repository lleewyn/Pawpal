const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');

(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

        // Serve local content completely offline (0 Supabase bandwidth)
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

        // Inject Admin stylesheets
        const cssFiles = [
            'pages/admin/admin.css',
            'pages/admin/admin-shell-v7.css',
            'pages/admin/admin-components.css',
            'pages/admin/modules/staff/staff.css'
        ];
        for (const f of cssFiles) {
            const cssPath = path.join(process.cwd(), f);
            if (fs.existsSync(cssPath)) {
                await page.addStyleTag({ content: fs.readFileSync(cssPath, 'utf8') });
            }
        }

        // Set staff HTML
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

        // Inject CSS again into content
        for (const f of cssFiles) {
            const cssPath = path.join(process.cwd(), f);
            if (fs.existsSync(cssPath)) {
                await page.addStyleTag({ content: fs.readFileSync(cssPath, 'utf8') });
            }
        }

        // Initialize PawpalStaff mock environment
        await page.evaluate(() => {
            window.PawpalStaff = {
                state: {
                    staff: [
                        { id: 'STF01', rawId: 'STF01', name: 'Nguyễn Văn A', position: 'Groomer', phone: '0901234567', status: 'ACTIVE' }
                    ],
                    isLoaded: true,
                    shiftRequests: [],
                    assessments: [],
                    schedules: []
                },
                subtabs: {},
                showToast: () => {},
                enhanceEntitySelect: (sel) => {
                    // create _entityInput if not present
                    if (!sel._entityInput) {
                        sel._entityInput = sel;
                    }
                }
            };
        });

        // Load tab-staff-list.js
        let code = fs.readFileSync('pages/admin/modules/staff/subtabs/tab-staff-list.js', 'utf8');
        code = code.slice(0, code.lastIndexOf("    if (document.readyState === 'loading')")) + '})();';
        await page.addScriptTag({ content: code });

        // Initialize subtab and open modal
        await page.evaluate(() => {
            PawpalStaff.subtabs.list.init();
            PawpalStaff.subtabs.list.openStaffModal();
        });

        // Verify modal is active
        const modal = page.locator('#staffModalOverlay');
        await modal.waitFor({ state: 'visible' });

        // Step 4: Nhập "Nguyễn Văn F" vào textbox "Họ tên"
        await page.fill('#staffInputName', 'Nguyễn Văn F');

        // Step 5: Chọn "Groomer" tại dropdown "Chức vụ"
        await page.evaluate(() => {
            const pos = document.getElementById('staffInputPosition');
            pos.value = 'Groomer';
            document.getElementById('staffInputJoinDate').value = '2026-11-16';
            document.getElementById('staffEmploymentStatus').value = 'active';
        });

        // Step 6: Nhập "0901abc233" vào textbox "Số điện thoại"
        await page.fill('#staffInputPhone', '0901abc233');

        // Step 8: Click button "Lưu"
        await page.click('#btnSaveStaff');

        // Assert error message
        const errorLocator = page.locator('#staffInputPhoneError');
        await errorLocator.waitFor({ state: 'visible' });
        const errorText = await errorLocator.innerText();
        console.log('Actual error message displayed (0901abc233):', errorText);

        assert.equal(errorText, 'Số điện thoại cần đúng 10 số và bắt đầu bằng 0.');
        console.log('PASS: Error message correctly verified without "chữ"!');

        const artifactDir = 'C:/Users/QUYEN/.gemini/antigravity-cli/brain/af18ed42-cded-436c-b979-3645e2c03470';

        // 1. Screenshot of the modal with testcase 247 data
        const modalElement = await page.$('.admin-modal-card');
        if (modalElement) {
            await modalElement.screenshot({ path: path.join(artifactDir, 'evidence_testcase_247_modal.png') });
        }

        // 2. Focused screenshot of the phone input with 0901abc233
        const phoneGroup = await page.$('#staffInputPhone');
        if (phoneGroup) {
            const parent = await page.evaluateHandle(el => el.closest('.form-group-item'), phoneGroup);
            if (parent && parent.asElement()) {
                await parent.asElement().screenshot({ path: path.join(artifactDir, 'evidence_testcase_247_phone.png') });
            }
        }

        // 3. Also test with "097216337a" (the exact text in the user uploaded image)
        await page.fill('#staffInputPhone', '097216337a');
        await page.click('#btnSaveStaff');
        await errorLocator.waitFor({ state: 'visible' });
        const errorText2 = await errorLocator.innerText();
        assert.equal(errorText2, 'Số điện thoại cần đúng 10 số và bắt đầu bằng 0.');

        // Focused screenshot of the phone input with 097216337a
        if (phoneGroup) {
            const parent = await page.evaluateHandle(el => el.closest('.form-group-item'), phoneGroup);
            if (parent && parent.asElement()) {
                await parent.asElement().screenshot({ path: path.join(artifactDir, 'evidence_phone_097216337a.png') });
            }
        }

        console.log('Screenshots saved successfully to artifact directory.');
    } finally {
        await browser.close();
    }
})().catch(err => {
    console.error(err);
    process.exit(1);
});
