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
            'my-client/pages/admin/admin.css',
            'my-client/pages/admin/admin-shell-v7.css',
            'my-client/pages/admin/admin-components.css',
            'my-client/pages/admin/modules/staff/staff.css'
        ];

        const staffHtml = fs.readFileSync('my-client/pages/admin/modules/staff/staff.html', 'utf8');
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

        await page.evaluate(() => {
            window.PawpalStaff = {
                state: {
                    staff: [
                        { id: 'EMP-001', rawId: 'EMP-001', name: 'Lê Lệ Quyên', position: 'Quản lý cửa hàng', phone: '0901234567', status: 'ACTIVE', raw: { employment_status: 'active', phone_number: '0901234567' } }
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

        let code = fs.readFileSync('my-client/pages/admin/modules/staff/subtabs/tab-staff-list.js', 'utf8');
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

        // Ensure all fields are empty as per Testcase 257
        await page.evaluate(() => {
            document.getElementById('staffInputName').value = '';
            document.getElementById('staffInputPosition').value = '';
            document.getElementById('staffInputPhone').value = '';
            document.getElementById('staffAccountEmail').value = '';
            document.getElementById('staffAccountPassword').value = '';
        });

        // Click "Lưu"
        await page.click('#btnSaveStaff');

        // Check errors for all required fields
        const checkError = async (id, name) => {
            const el = page.locator('#' + id + 'Error');
            const visible = await el.isVisible().catch(() => false);
            const text = visible ? await el.innerText() : 'NOT_FOUND';
            console.log(`Field ${name} (#${id}): visible=${visible}, error="${text}"`);
            return { visible, text };
        };

        const nameErr = await checkError('staffInputName', 'Họ và tên');
        const posErr = await checkError('staffInputPosition', 'Chức vụ');
        const phoneErr = await checkError('staffInputPhone', 'Số điện thoại');
        const emailErr = await checkError('staffAccountEmail', 'Email công vụ đăng nhập');
        const passErr = await checkError('staffAccountPassword', 'Mật khẩu tạm thời');

        const debugInfo = await page.evaluate(() => {
            const e1 = document.getElementById('staffAccountEmailError');
            const e2 = document.getElementById('staffAccountPasswordError');
            const sec = document.getElementById('staffAccountConfigSection');
            return {
                e1: e1 ? { text: e1.textContent, outer: e1.outerHTML, parent: e1.parentElement.className, rect: e1.getBoundingClientRect() } : null,
                e2: e2 ? { text: e2.textContent, outer: e2.outerHTML, parent: e2.parentElement.className, rect: e2.getBoundingClientRect() } : null,
                secDisplay: sec ? sec.style.display : null,
                cardHeight: document.querySelector('.admin-modal-card')?.getBoundingClientRect(),
                bodyHeight: document.querySelector('.modal-body-clean')?.getBoundingClientRect()
            };
        });
        console.log('DEBUG INFO:', JSON.stringify(debugInfo, null, 2));

        const activeElementId = await page.evaluate(() => document.activeElement.id);
        console.log('Focused element ID:', activeElementId);

        const modalVisible = await page.locator('#staffModalOverlay').isVisible();
        console.log('Modal visible:', modalVisible);

        const savedCount = await page.evaluate(() => window.savedProfiles.length);
        console.log('Saved profiles count:', savedCount);

        const artifactDir = 'C:/Users/QUYEN/.gemini/antigravity-cli/brain/af18ed42-cded-436c-b979-3645e2c03470';
        const docsDir = path.join(process.cwd(), 'docs/verification');

        const modalCard = await page.$('.admin-modal-card');
        if (modalCard) {
            await modalCard.screenshot({ path: path.join(artifactDir, 'evidence_testcase_257_all_empty.png') });
            await modalCard.screenshot({ path: path.join(docsDir, 'evidence_testcase_257_all_empty.png') });

            // Now scroll down inside modal-body-clean to capture Email & Password error messages clearly
            await page.evaluate(() => {
                const body = document.querySelector('.modal-body-clean');
                if (body) body.scrollTop = body.scrollHeight;
            });
            await modalCard.screenshot({ path: path.join(artifactDir, 'evidence_testcase_257_scrolled_bottom.png') });
            await modalCard.screenshot({ path: path.join(docsDir, 'evidence_testcase_257_scrolled_bottom.png') });

            // Also capture focused screenshot of Email and Password fields
            const emailField = await page.$('#staffAccountEmail');
            if (emailField) {
                const parent = await page.evaluateHandle(el => el.closest('.form-row-2col'), emailField);
                if (parent && parent.asElement()) {
                    await parent.asElement().screenshot({ path: path.join(artifactDir, 'evidence_email_password_errors.png') });
                    await parent.asElement().screenshot({ path: path.join(docsDir, 'evidence_email_password_errors.png') });
                }
            }
        }

    } finally {
        await browser.close();
    }
})().catch(err => {
    console.error(err);
    process.exit(1);
});
