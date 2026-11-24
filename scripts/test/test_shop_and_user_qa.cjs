const { chromium } = require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const path = require('node:path');
const fs = require('node:fs');

const ARTIFACT_DIR = 'C:/Users/QUYEN/.gemini/antigravity-cli/brain/ee2858d7-6580-48fe-81a1-d967318c4ca4';
const BASE_URL = 'http://127.0.0.1:4000';

async function setupPage(page) {
    // Triệt tiêu popup khuyến mãi ngay từ đầu
    await page.addInitScript(() => {
        sessionStorage.setItem('pawpal_notice_dismissed_promo', '1');
        const observer = new MutationObserver(() => {
            const popup = document.getElementById('pawpal-site-popup');
            if (popup) {
                popup.remove();
                if (document.body) document.body.style.overflow = '';
            }
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });

        const style = document.createElement('style');
        style.id = 'qa-kill-popup';
        style.innerHTML = '#pawpal-site-popup { display: none !important; pointer-events: none !important; }';
        document.documentElement.appendChild(style);
    });

    await page.addLocatorHandler(page.locator('#pawpal-site-popup'), async () => {
        await page.evaluate(() => {
            document.getElementById('pawpal-site-popup')?.remove();
            if (document.body) document.body.style.overflow = '';
        });
    }, { noWaitAfter: true });
}

async function run() {
    console.log('=== BẮT ĐẦU KIỂM THỬ PLAYWRIGHT CHROME ===');
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    const report = {
        shop: {
            categories: [],
            totalInitialProducts: 0,
            mobileToggleWorks: false,
            seeAllWorks: false
        },
        user: {
            tabs: {}
        }
    };

    // ==========================================
    // PHẦN 1: TEST CỬA HÀNG (SHOP CATEGORIES)
    // ==========================================
    console.log('\n--- 1. TEST CỬA HÀNG (SHOP CATEGORIES & FILTERS) ---');
    const page = await context.newPage();
    await setupPage(page);

    const shopConsoleErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') shopConsoleErrors.push(msg.text());
    });
    page.on('pageerror', err => shopConsoleErrors.push(err.message));

    await page.goto(`${BASE_URL}/shop`, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Đợi sản phẩm thật tải xong (bỏ qua skeleton)
    console.log('Đang chờ sản phẩm nạp hoàn tất từ Supabase/Cache...');
    await page.waitForFunction(() => {
        const real = document.querySelectorAll('.product-card:not(.skeleton-card)');
        return real.length > 0;
    }, { timeout: 25000 });

    // Đảm bảo đóng mọi popup còn sót
    await page.evaluate(() => {
        document.getElementById('pawpal-site-popup')?.remove();
        if (document.body) document.body.style.overflow = '';
    });

    const initialCount = await page.evaluate(() => {
        return document.querySelectorAll('.product-card:not(.skeleton-card)').length;
    });
    report.shop.totalInitialProducts = initialCount;
    console.log(`Số lượng sản phẩm ban đầu: ${initialCount}`);

    // Chụp minh chứng 1: Toàn bộ danh mục đầu trang kèm sản phẩm thực tế đã nạp
    const shot1 = path.join(ARTIFACT_DIR, 'minhchung_1_shop_loaded.png');
    await page.screenshot({ path: shot1 });
    console.log(`[Minh chứng 1] Đã lưu: ${shot1}`);

    // Lấy danh sách 12 category card ở đầu trang
    const categories = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('.category-grid .category-card'));
        return cards.map(c => ({
            key: c.dataset.category,
            label: c.querySelector('.category-card-label')?.textContent?.trim() || ''
        }));
    });
    console.log(`Tìm thấy ${categories.length} thẻ danh mục ở đầu trang.`);

    // Kiểm tra từng thẻ danh mục khi click
    for (const cat of categories) {
        // Click bằng evaluate dispatchEvent để không bao giờ bị intercept bởi overlay
        await page.evaluate((k) => {
            const card = document.querySelector(`.category-grid .category-card[data-category="${k}"]`);
            if (card) card.click();
        }, cat.key);
        await page.waitForTimeout(600);

        const filterResult = await page.evaluate((currentKey) => {
            const count = document.querySelectorAll('.product-card:not(.skeleton-card)').length;
            const checkedBoxes = Array.from(document.querySelectorAll('#categoryFilters input[type="checkbox"]:checked')).map(cb => cb.value);
            const activeCard = document.querySelector(`.category-grid .category-card[data-category="${currentKey}"]`);
            const hasActiveClass = activeCard ? activeCard.classList.contains('active') : false;
            const emptyStateVisible = !document.getElementById('emptyState')?.classList.contains('d-none');
            const resultCountText = document.getElementById('resultCount')?.textContent?.trim() || '';

            return {
                count,
                checkedBoxes,
                hasActiveClass,
                emptyStateVisible,
                resultCountText
            };
        }, cat.key);

        console.log(`  -> [${cat.label} | ${cat.key}]: ${filterResult.count} sản phẩm | Sidebar: [${filterResult.checkedBoxes.join(', ')}] | Active CSS: ${filterResult.hasActiveClass} | Trống: ${filterResult.emptyStateVisible}`);
        report.shop.categories.push({
            key: cat.key,
            label: cat.label,
            ...filterResult
        });
    }

    // Chụp minh chứng 2: Lọc Thức ăn khô
    await page.evaluate(() => {
        document.querySelector('.category-grid .category-card[data-category="food-dry"]')?.click();
    });
    await page.waitForTimeout(600);
    const shot2 = path.join(ARTIFACT_DIR, 'minhchung_2_shop_filter_food_dry.png');
    await page.screenshot({ path: shot2 });
    console.log(`[Minh chứng 2] Đã lưu: ${shot2}`);

    // Chụp minh chứng 2b: Lọc Đồ chơi
    await page.evaluate(() => {
        document.querySelector('.category-grid .category-card[data-category="toys"]')?.click();
    });
    await page.waitForTimeout(600);
    const shot2b = path.join(ARTIFACT_DIR, 'minhchung_2b_shop_filter_toys.png');
    await page.screenshot({ path: shot2b });
    console.log(`[Minh chứng 2b] Đã lưu: ${shot2b}`);

    // Chụp minh chứng 2c: Lọc Phụ kiện
    await page.evaluate(() => {
        document.querySelector('.category-grid .category-card[data-category="accessories"]')?.click();
    });
    await page.waitForTimeout(600);
    const shot2c = path.join(ARTIFACT_DIR, 'minhchung_2c_shop_filter_accessories.png');
    await page.screenshot({ path: shot2c });
    console.log(`[Minh chứng 2c] Đã lưu: ${shot2c}`);

    // Bấm nút Xóa bộ lọc
    await page.evaluate(() => {
        document.getElementById('btnClearFilters')?.click();
    });
    await page.waitForTimeout(600);
    const afterClearCount = await page.evaluate(() => document.querySelectorAll('.product-card:not(.skeleton-card)').length);
    console.log(`Sau khi xóa bộ lọc, số sản phẩm: ${afterClearCount}`);

    // Kiểm tra responsive mobile cho danh mục đầu trang (viewport 375x667)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    const mobileStatus = await page.evaluate(() => {
        const section = document.querySelector('.shop-by-category-section');
        const toggle = document.getElementById('categoryMobileToggle');
        return {
            isCollapsed: section?.classList.contains('is-collapsed'),
            toggleHidden: toggle ? toggle.hidden : true,
            toggleText: toggle?.textContent?.trim() || ''
        };
    });
    console.log('Mobile view danh mục:', mobileStatus);
    const shotMobile = path.join(ARTIFACT_DIR, 'minhchung_3_shop_category_mobile.png');
    await page.screenshot({ path: shotMobile });
    console.log(`[Minh chứng 3] Đã lưu: ${shotMobile}`);

    // Reset viewport về desktop
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.close();

    // ==========================================
    // PHẦN 2: TEST CỔNG NGƯỜI DÙNG (USER PORTAL TABS)
    // ==========================================
    console.log('\n--- 2. TEST CỔNG NGƯỜI DÙNG (USER PORTAL TABS) ---');
    const userPage = await context.newPage();
    await setupPage(userPage);

    const userConsoleErrors = [];
    userPage.on('console', msg => {
        if (msg.type() === 'error') userConsoleErrors.push(msg.text());
    });
    userPage.on('pageerror', err => userConsoleErrors.push(err.message));

    // Nạp thông tin tài khoản khách hàng hợp lệ
    await userPage.addInitScript(() => {
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

    const userTabs = [
        { id: 'profile', name: 'Hồ sơ cá nhân' },
        { id: 'pets', name: 'Hồ sơ bé cưng' },
        { id: 'bookings', name: 'Lịch hẹn của tôi' },
        { id: 'orders', name: 'Đơn hàng của tôi' },
        { id: 'wishlist', name: 'Yêu thích' },
        { id: 'diary', name: 'Nhật ký chăm sóc' },
        { id: 'loyalty', name: 'Paw Points' },
        { id: 'settings', name: 'Cài đặt' },
        { id: 'support', name: 'Hỗ trợ' }
    ];

    for (const tab of userTabs) {
        console.log(`Kiểm tra tab: #${tab.id} (${tab.name})...`);
        await userPage.goto(`${BASE_URL}/user#${tab.id}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await userPage.waitForTimeout(2000);

        // Đảm bảo đóng popup nếu có
        await userPage.evaluate(() => {
            document.getElementById('pawpal-site-popup')?.remove();
            if (document.body) document.body.style.overflow = '';
        });

        const tabData = await userPage.evaluate((tId) => {
            const content = document.getElementById('userAppContent');
            const breadcrumb = document.getElementById('userBreadcrumbList')?.textContent?.trim() || '';
            const activeSidebar = document.querySelector('.sidebar-nav .sidebar-link.active')?.textContent?.trim() || '';
            const ariaBusy = content?.getAttribute('aria-busy');
            const hasErrorText = content?.innerText?.includes('Không thể tải') || content?.innerText?.includes('Đã có lỗi xảy ra');
            const htmlLength = content?.innerHTML?.length || 0;
            const buttons = Array.from(content?.querySelectorAll('button') || []).map(b => b.textContent.trim()).filter(Boolean);

            return {
                breadcrumb,
                activeSidebar,
                ariaBusy,
                hasErrorText,
                htmlLength,
                buttons: buttons.slice(0, 5)
            };
        }, tab.id);

        console.log(`  -> #${tab.id}: ActiveMenu="${tabData.activeSidebar}" | Busy=${tabData.ariaBusy} | Lỗi=${tabData.hasErrorText} | Length=${tabData.htmlLength}`);
        report.user.tabs[tab.id] = tabData;

        // Chụp ảnh minh chứng cho từng tab
        const tabShotPath = path.join(ARTIFACT_DIR, `minhchung_tab_${tab.id}.png`);
        await userPage.screenshot({ path: tabShotPath });
        console.log(`  [Minh chứng] Đã lưu: ${tabShotPath}`);
    }

    await userPage.close();
    await browser.close();

    console.log('\n=== KẾT QUẢ TỔNG HỢP ===');
    console.log('Lỗi Console Shop:', shopConsoleErrors);
    console.log('Lỗi Console User:', userConsoleErrors);

    fs.writeFileSync(path.join(ARTIFACT_DIR, 'test_qa_report.json'), JSON.stringify({
        report,
        shopConsoleErrors,
        userConsoleErrors
    }, null, 2));
    console.log('Đã lưu kết quả vào test_qa_report.json thành công!');
}

run().catch(err => {
    console.error('LỖI KIỂM THỬ:', err);
    process.exit(1);
});
