const { chromium } = require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const path = require('node:path');
const fs = require('node:fs');

const ARTIFACT_DIR = 'C:/Users/QUYEN/.gemini/antigravity-cli/brain/7a76c9d1-504b-4a2d-877e-c42a3920b2f8';
const DOCS_FIG_DIR = path.resolve('docs/figures/chuong-08');
const BASE_URL = 'http://127.0.0.1:4000';

async function dismissPopup(page) {
    try {
        await page.evaluate(() => {
            sessionStorage.setItem('pawpal_notice_dismissed_promo', '1');
            document.getElementById('pawpal-site-popup')?.remove();
            if (document.body) document.body.style.overflow = '';
            const style = document.createElement('style');
            style.innerHTML = '#pawpal-site-popup { display: none !important; }';
            document.head.appendChild(style);
        });
    } catch (_) {}
}

async function openChatbot(page) {
    await page.waitForSelector('#fabAiBtn', { timeout: 10000 });
    const isPanelVisible = await page.evaluate(() => {
        const p = document.getElementById('fabChatPanel');
        return p && p.classList.contains('open');
    });
    if (!isPanelVisible) {
        await page.click('#fabAiBtn');
        await page.waitForSelector('#fabChatPanel.open', { timeout: 5000 });
    }
    await page.waitForTimeout(600);
}

async function sendMessage(page, text) {
    console.log(`- Đang gửi câu hỏi: "${text}"`);
    await page.waitForSelector('#fabChatInput:not([disabled])', { timeout: 10000 });
    const prevBotCount = await page.evaluate(() => {
        return document.querySelectorAll('.fab-chat-bubble--bot, .fab-chat-bubble.bot').length;
    });

    await page.fill('#fabChatInput', text);
    await page.click('#fabChatSend');

    console.log('- Đang chờ Chatbot xử lý và truyền luồng phản hồi...');
    await page.waitForFunction((prev) => {
        const bubbles = document.querySelectorAll('.fab-chat-bubble--bot, .fab-chat-bubble.bot');
        const hasNewBubble = bubbles.length > prev;
        const noStreamPreview = !document.getElementById('fabStreamPreview');
        const inputReady = !document.querySelector('#fabChatInput[disabled]');
        return hasNewBubble && noStreamPreview && inputReady;
    }, prevBotCount, { timeout: 35000 });

    await page.waitForTimeout(1500);
    const latestReply = await page.evaluate(() => {
        const bubbles = Array.from(document.querySelectorAll('.fab-chat-bubble--bot, .fab-chat-bubble.bot'));
        return bubbles[bubbles.length - 1]?.textContent?.trim() || '';
    });
    console.log(`- Bot đã phản hồi xong (${latestReply.length} ký tự): "${latestReply.slice(0, 80).replace(/\n/g, ' ')}..."`);
    return latestReply;
}

async function startNewChat(page) {
    try {
        const newBtn = await page.$('#fabChatNewBtn');
        if (newBtn) {
            await newBtn.click();
            await page.waitForTimeout(600);
        }
    } catch (_) {}
}

(async () => {
    console.log('=== KHỞI CHẠY CHỤP ẢNH BẰNG CHỨNG KIỂM THỬ GIAO DIỆN CHATBOT PAWPAL ===\n');
    const browser = await chromium.launch({
        channel: 'chrome',
        headless: true,
        args: ['--window-size=1440,900']
    });

    const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 2 // Độ phân giải Retina siêu nét
    });

    const page = await context.newPage();

    try {
        console.log('[1/4] Mở trang chủ Pawpal và nạp Chatbot FAB...');
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await dismissPopup(page);
        await openChatbot(page);

        // ==============================================================
        // KỊCH BẢN 1: Báo giá theo cân nặng (Khách vãng lai)
        // ==============================================================
        console.log('\n--- KỊCH BẢN 1: Báo giá dịch vụ 5kg ---');
        await sendMessage(page, 'Bé cún Poodle nhà mình nặng 5kg tắm sấy giá bao nhiêu?');

        const shot1Full = path.join(ARTIFACT_DIR, 'minh_chung_1_bao_gia_full.png');
        const shot1Crop = path.join(ARTIFACT_DIR, 'minh_chung_1_bao_gia_crop.png');
        await page.screenshot({ path: shot1Full });
        const panelEl1 = await page.$('#fabChatPanel');
        if (panelEl1) await panelEl1.screenshot({ path: shot1Crop });
        console.log(`✔ Đã lưu ảnh: ${shot1Full}`);
        console.log(`✔ Đã lưu ảnh crop: ${shot1Crop}`);

        // Lưu vào docs/figures nếu cần
        if (fs.existsSync(DOCS_FIG_DIR)) {
            await page.screenshot({ path: path.join(DOCS_FIG_DIR, 'hinh-08-09-gia-tam-theo-can-nang.png') });
        }

        // ==============================================================
        // KỊCH BẢN 2: Xoa dịu cảm xúc lo lắng sức khỏe bé cưng
        // ==============================================================
        console.log('\n--- KỊCH BẢN 2: Khách lo lắng bé mệt/biếng ăn sau tắm ---');
        await startNewChat(page);
        await sendMessage(page, 'Bé cún nhà mình về bị mệt mỏi và biếng ăn sau khi tắm, mình lo quá');

        const shot2Full = path.join(ARTIFACT_DIR, 'minh_chung_2_xoa_diu_lo_lang_full.png');
        const shot2Crop = path.join(ARTIFACT_DIR, 'minh_chung_2_xoa_diu_lo_lang_crop.png');
        await page.screenshot({ path: shot2Full });
        const panelEl2 = await page.$('#fabChatPanel');
        if (panelEl2) await panelEl2.screenshot({ path: shot2Crop });
        console.log(`✔ Đã lưu ảnh: ${shot2Full}`);
        console.log(`✔ Đã lưu ảnh crop: ${shot2Crop}`);

        if (fs.existsSync(DOCS_FIG_DIR)) {
            await page.screenshot({ path: path.join(DOCS_FIG_DIR, 'hinh-08-11-luu-y-suc-khoe.png') });
        }

        // ==============================================================
        // KỊCH BẢN 3: Kế thừa hội thoại đa lượt tiếp nối (Lượt 2)
        // ==============================================================
        console.log('\n--- KỊCH BẢN 3: Đa lượt tiếp nối (Lượt 2 báo có nôn) ---');
        await sendMessage(page, 'Bé có nôn một lần nữa, mình cần làm gì bây giờ?');

        const shot3Full = path.join(ARTIFACT_DIR, 'minh_chung_3_da_luot_tiep_noi_full.png');
        const shot3Crop = path.join(ARTIFACT_DIR, 'minh_chung_3_da_luot_tiep_noi_crop.png');
        await page.screenshot({ path: shot3Full });
        const panelEl3 = await page.$('#fabChatPanel');
        if (panelEl3) await panelEl3.screenshot({ path: shot3Crop });
        console.log(`✔ Đã lưu ảnh: ${shot3Full}`);
        console.log(`✔ Đã lưu ảnh crop: ${shot3Crop}`);

        // ==============================================================
        // KỊCH BẢN 4: Bảo vệ quyền riêng tư đơn hàng khách vãng lai
        // ==============================================================
        console.log('\n--- KỊCH BẢN 4: Chặn tra cứu đơn hàng riêng tư ---');
        await startNewChat(page);
        await sendMessage(page, 'Kiểm tra đơn hàng hôm qua của tôi giao đến đâu rồi?');

        const shot4Full = path.join(ARTIFACT_DIR, 'minh_chung_4_bao_mat_don_hang_full.png');
        const shot4Crop = path.join(ARTIFACT_DIR, 'minh_chung_4_bao_mat_don_hang_crop.png');
        await page.screenshot({ path: shot4Full });
        const panelEl4 = await page.$('#fabChatPanel');
        if (panelEl4) await panelEl4.screenshot({ path: shot4Crop });
        console.log(`✔ Đã lưu ảnh: ${shot4Full}`);
        console.log(`✔ Đã lưu ảnh crop: ${shot4Crop}`);

        if (fs.existsSync(DOCS_FIG_DIR)) {
            await page.screenshot({ path: path.join(DOCS_FIG_DIR, 'hinh-08-10-gioi-han-don-hang-vang-lai.png') });
        }

        // ==============================================================
        // KỊCH BẢN 5: Tiếp nhận khiếu nại dịch vụ và hướng dẫn sơ cứu
        // ==============================================================
        console.log('\n--- KỊCH BẢN 5: Tiếp nhận khiếu nại làm ẩu / trầy xước ---');
        await startNewChat(page);
        await sendMessage(page, 'Bé mèo bị trầy xước ở chân sau khi cắt tỉa, nhân viên làm ẩu quá');

        const shot5Full = path.join(ARTIFACT_DIR, 'minh_chung_5_khieu_nai_dich_vu_full.png');
        const shot5Crop = path.join(ARTIFACT_DIR, 'minh_chung_5_khieu_nai_dich_vu_crop.png');
        await page.screenshot({ path: shot5Full });
        const panelEl5 = await page.$('#fabChatPanel');
        if (panelEl5) await panelEl5.screenshot({ path: shot5Crop });
        console.log(`✔ Đã lưu ảnh: ${shot5Full}`);
        console.log(`✔ Đã lưu ảnh crop: ${shot5Crop}`);

        console.log('\n=== HOÀN TẤT CHỤP BẰNG CHỨNG GIAO DIỆN CHO 5 KỊCH BẢN CHÍNH THỨC! ===');
    } catch (error) {
        console.error('Lỗi khi thực thi chụp ảnh kiểm thử:', error);
        process.exitCode = 1;
    } finally {
        await browser.close();
    }
})();
