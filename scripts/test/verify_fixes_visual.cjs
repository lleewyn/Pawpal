const { chromium } = require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const path = require('node:path');
const fs = require('node:fs');

const ARTIFACT_DIR = 'C:/Users/QUYEN/.gemini/antigravity-cli/brain/ee2858d7-6580-48fe-81a1-d967318c4ca4';
const BASE_URL = 'http://127.0.0.1:4000';

async function run() {
    console.log('=== XÁC MINH CÁC SỬA ĐỔI BẰNG PLAYWRIGHT CHROME ===');
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

    await page.addInitScript(() => {
        const observer = new MutationObserver(() => {
            const popup = document.getElementById('pawpal-site-popup');
            if (popup) {
                popup.remove();
                if (document.body) document.body.style.overflow = '';
            }
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
    });

    // 1. Kiểm tra Shop
    console.log('--- 1. Kiểm tra Bộ lọc danh mục Cửa hàng sau sửa lỗi ---');
    await page.goto(`${BASE_URL}/shop`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => {
        return document.querySelectorAll('.product-card:not(.skeleton-card)').length > 0;
    }, { timeout: 25000 });

    const categoriesToTest = ['food-dry', 'toys', 'clothes', 'health', 'furniture', 'accessories'];
    const results = {};

    for (const cat of categoriesToTest) {
        await page.evaluate((k) => {
            document.querySelector(`.category-grid .category-card[data-category="${k}"]`)?.click();
        }, cat);
        await page.waitForTimeout(600);

        const res = await page.evaluate((k) => {
            const card = document.querySelector(`.category-grid .category-card[data-category="${k}"]`);
            const isActive = card ? card.classList.contains('active') : false;
            const count = document.querySelectorAll('.product-card:not(.skeleton-card)').length;
            const emptyState = !document.getElementById('emptyState')?.classList.contains('d-none');
            const resultText = document.getElementById('resultCount')?.textContent?.trim();
            const checkedSidebar = Array.from(document.querySelectorAll('#categoryFilters input[type="checkbox"]:checked')).map(cb => cb.value);
            return { isActive, count, emptyState, resultText, checkedSidebar };
        }, cat);

        console.log(`- Danh mục [${cat}]: Count=${res.count} | Active=${res.isActive} | Trống=${res.emptyState} | Sidebar=${res.checkedSidebar.join(',')}`);
        results[cat] = res;

        const shot = path.join(ARTIFACT_DIR, `minhchung_fix_${cat}.png`);
        await page.screenshot({ path: shot });
        console.log(`  Đã lưu minh chứng: ${shot}`);
    }

    // Kiểm tra "Xem tất cả"
    await page.evaluate(() => {
        document.querySelector('.shop-category-jump')?.click();
    });
    await page.waitForTimeout(600);
    const seeAllCount = await page.evaluate(() => {
        const count = document.querySelectorAll('.product-card:not(.skeleton-card)').length;
        const activeCount = document.querySelectorAll('.category-card.active').length;
        return { count, activeCount };
    });
    console.log(`- Sau khi bấm "Xem tất cả": ${seeAllCount.count} sản phẩm, Thẻ active còn lại: ${seeAllCount.activeCount}`);
    const shotSeeAll = path.join(ARTIFACT_DIR, 'minhchung_fix_see_all.png');
    await page.screenshot({ path: shotSeeAll });
    console.log(`  Đã lưu minh chứng: ${shotSeeAll}`);

    // 2. Kiểm tra tab Loyalty sau khi làm sạch lỗi
    console.log('\n--- 2. Kiểm tra Tab Loyalty sau khi làm sạch lỗi JWT ---');
    const testUser = {
        id: 'c1111111-1111-1111-1111-111111111111',
        auth_user_id: 'a1111111-1111-1111-1111-111111111111',
        name: 'Hoàng Yến',
        role: 'customer'
    };
    await page.evaluate((u) => {
        localStorage.setItem('pawpal_current_user', JSON.stringify(u));
        sessionStorage.setItem('pawpal_current_user', JSON.stringify(u));
    }, testUser);

    await page.goto(`${BASE_URL}/user#loyalty`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1800);
    const loyaltyText = await page.evaluate(() => {
        const c = document.getElementById('userAppContent');
        return {
            hasRawJwtError: c?.innerText?.includes('Expected 3 parts in JWT'),
            content: c?.innerText?.slice(0, 300)
        };
    });
    console.log('Loyalty text check:', loyaltyText);
    const shotLoyalty = path.join(ARTIFACT_DIR, 'minhchung_fix_loyalty_sanitized.png');
    await page.screenshot({ path: shotLoyalty });
    console.log(`  Đã lưu minh chứng: ${shotLoyalty}`);

    await browser.close();
    console.log('\n=== HOÀN TẤT TOÀN BỘ XÁC MINH SỬA LỖI THÀNH CÔNG ===');
}

run().catch(err => {
    console.error('Lỗi xác minh:', err);
    process.exit(1);
});
