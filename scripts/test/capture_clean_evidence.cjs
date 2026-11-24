const { chromium } = require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const path = require('node:path');

const ARTIFACT_DIR = 'C:/Users/QUYEN/.gemini/antigravity-cli/brain/ee2858d7-6580-48fe-81a1-d967318c4ca4';

(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

    await page.goto('http://127.0.0.1:4000/shop', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelectorAll('.product-card:not(.skeleton-card)').length > 0);

    // Đóng hoàn toàn popup
    await page.evaluate(() => {
        sessionStorage.setItem('pawpal_notice_dismissed_promo', '1');
        document.getElementById('pawpal-site-popup')?.remove();
        if (document.body) document.body.style.overflow = '';
        const style = document.createElement('style');
        style.innerHTML = '#pawpal-site-popup { display: none !important; }';
        document.head.appendChild(style);
    });

    // 1. Chụp toàn cảnh danh mục đầu trang ban đầu
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'shop_danhmuc_sach_dep.png') });

    // 2. Chọn Thức ăn khô
    await page.evaluate(() => document.querySelector('.category-grid .category-card[data-category="food-dry"]')?.click());
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'shop_active_food_dry.png') });

    // 3. Chọn Đồ chơi
    await page.evaluate(() => document.querySelector('.category-grid .category-card[data-category="toys"]')?.click());
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'shop_active_toys.png') });

    // 4. Chọn Sức khỏe
    await page.evaluate(() => document.querySelector('.category-grid .category-card[data-category="health"]')?.click());
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'shop_active_health.png') });

    // 5. Bấm Xem tất cả
    await page.evaluate(() => document.querySelector('.shop-category-jump')?.click());
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'shop_active_all_products.png') });

    await browser.close();
    console.log('Clean screenshots captured successfully!');
})();
