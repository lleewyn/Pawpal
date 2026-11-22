const { chromium } = require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const path = require('node:path');
const fs = require('node:fs');

const ARTIFACT_DIR = 'C:/Users/QUYEN/.gemini/antigravity-cli/brain/7a76c9d1-504b-4a2d-877e-c42a3920b2f8';
const BASE_URL = 'http://127.0.0.1:4000';

async function runChatbotRandomScenarios() {
    console.log('=== BẮT ĐẦU KIỂM THỬ TRỰC QUAN RANDOM CÁC TÌNH HUỐNG CHO CHATBOT ===');
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const context = await browser.newContext({
        viewport: { width: 1280, height: 850 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    const page = await context.newPage();

    try {
        console.log('\n[1/6] Mở trang chủ và khởi tạo Chatbot Widget...');
        await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        // Vô hiệu hóa triệt để popup quảng cáo để không che khuất khung chat
        await page.evaluate(() => {
            const p = document.getElementById('pawpal-site-popup');
            if (p) p.remove();
            const style = document.createElement('style');
            style.textContent = '#pawpal-site-popup { display: none !important; }';
            document.head.appendChild(style);
        });

        // Chờ nút Chatbot FAB xuất hiện và click mở
        const fabBtn = page.locator('#fabAiBtn');
        await fabBtn.waitFor({ state: 'visible', timeout: 10000 });
        await fabBtn.click();

        // Chờ panel Chat mở ra
        const chatPanel = page.locator('#fabChatPanel');
        await chatPanel.waitFor({ state: 'visible', timeout: 5000 });
        console.log('- Panel Chatbot đã mở thành công.');

        const shot0 = path.join(ARTIFACT_DIR, 'chatbot_minh_chung_0_welcome.png');
        await page.screenshot({ path: shot0, fullPage: false });
        console.log(`- Đã chụp ảnh khởi động Chatbot: ${shot0}`);

        // Helper hàm gửi tin nhắn và chờ phản hồi của bot
        async function askBot(question, expectedTimeout = 30000) {
            console.log(`\n-> Khách hỏi: "${question}"`);
            const initialBotCount = await page.locator('.fab-chat-bubble--bot').count();
            const input = page.locator('#fabChatInput');
            await input.fill(question);
            const sendBtn = page.locator('#fabChatSend');
            await sendBtn.click();

            // Chờ đến khi bot đã trả lời xong:
            // 1. Số bubble bot tăng lên
            // 2. Không còn preview streaming (#fabStreamPreview)
            // 3. Nút send không còn disabled
            await page.waitForFunction((prevCount) => {
                const send = document.getElementById('fabChatSend');
                const preview = document.getElementById('fabStreamPreview');
                const botBubbles = document.querySelectorAll('.fab-chat-bubble--bot');
                return send && !send.disabled && !preview && botBubbles.length > prevCount;
            }, initialBotCount, { timeout: expectedTimeout });

            await page.waitForTimeout(600);

            // Lấy nội dung câu trả lời bot mới nhất
            const botReplies = page.locator('.fab-chat-bubble--bot .fab-message-content');
            const count = await botReplies.count();
            const latestReply = await botReplies.nth(count - 1).innerText();
            console.log(`<- Chatbot trả lời:\n${latestReply}\n`);
            return latestReply;
        }

        // -------------------------------------------------------------
        // TÌNH HUỐNG 1: Khách vãng lai hỏi tư vấn dịch vụ tắm/cắt tỉa theo cân nặng
        // -------------------------------------------------------------
        console.log('--- TÌNH HUỐNG 1: Tư vấn dịch vụ tắm / cắt tỉa chó 5kg ---');
        const reply1 = await askBot('Bé cún 5kg tắm và cắt tỉa giá bao nhiêu bạn?');
        const shot1 = path.join(ARTIFACT_DIR, 'chatbot_minh_chung_1_grooming_advice.png');
        await page.screenshot({ path: shot1, fullPage: false });
        console.log(`- Đã chụp ảnh tình huống 1: ${shot1}`);

        // -------------------------------------------------------------
        // TÌNH HUỐNG 2: Khách vãng lai hỏi nối tiếp (Follow-up) về lịch trống
        // -------------------------------------------------------------
        console.log('--- TÌNH HUỐNG 2: Hỏi nối tiếp (Follow-up) về lịch trống ngày mai ---');
        const reply2 = await askBot('Mai có lịch trống không?');
        const shot2 = path.join(ARTIFACT_DIR, 'chatbot_minh_chung_2_availability.png');
        await page.screenshot({ path: shot2, fullPage: false });
        console.log(`- Đã chụp ảnh tình huống 2: ${shot2}`);

        // -------------------------------------------------------------
        // TÌNH HUỐNG 3: Khách vãng lai hỏi về khách sạn thú cưng (Pet Hotel) & phòng VIP
        // -------------------------------------------------------------
        console.log('--- TÌNH HUỐNG 3: Hỏi về lưu trú khách sạn thú cưng & phòng VIP ---');
        const reply3 = await askBot('Gửi mèo ở khách sạn một ngày tính thế nào? Có phòng VIP không?');
        const shot3 = path.join(ARTIFACT_DIR, 'chatbot_minh_chung_3_hotel_advice.png');
        await page.screenshot({ path: shot3, fullPage: false });
        console.log(`- Đã chụp ảnh tình huống 3: ${shot3}`);

        // -------------------------------------------------------------
        // TÌNH HUỐNG 4: Khách vãng lai hỏi thông tin đơn hàng cá nhân trong chat
        // -------------------------------------------------------------
        console.log('--- TÌNH HUỐNG 4: Thử tra cứu đơn hàng cá nhân ORD-20261122-001 trong chat ---');
        const reply4 = await askBot('Kiểm tra giúp tôi đơn hàng ORD-20261122-001');
        const shot4 = path.join(ARTIFACT_DIR, 'chatbot_minh_chung_4_order_privacy.png');
        await page.screenshot({ path: shot4, fullPage: false });
        console.log(`- Đã chụp ảnh tình huống 4: ${shot4}`);

        // -------------------------------------------------------------
        // TÌNH HUỐNG 5: Khách vãng lai bấm nút "Gặp chuyên viên" (Chốt chặn bảo mật)
        // -------------------------------------------------------------
        console.log('--- TÌNH HUỐNG 5: Khách vãng lai bấm "Gặp chuyên viên" ---');
        const handoverBtn = page.locator('#fabHandoverBtn');
        await handoverBtn.click();

        // Chờ prompt yêu cầu đăng nhập thành viên xuất hiện
        const memberPrompt = page.locator('#fabMemberPrompt');
        await memberPrompt.waitFor({ state: 'visible', timeout: 5000 });
        console.log('- Hộp thoại bảo vệ #fabMemberPrompt đã xuất hiện chính xác.');

        const shot5 = path.join(ARTIFACT_DIR, 'chatbot_minh_chung_5_membership_prompt.png');
        await page.screenshot({ path: shot5, fullPage: false });
        console.log(`- Đã chụp ảnh tình huống 5: ${shot5}`);

        // -------------------------------------------------------------
        // TÌNH HUỐNG 6: Khách bấm "Tiếp tục hỏi trợ lý" để quay lại hội thoại
        // -------------------------------------------------------------
        console.log('--- TÌNH HUỐNG 6: Khách bấm "Tiếp tục hỏi trợ lý" để quay lại chat bình thường ---');
        const backBtn = page.locator('.fab-member-prompt-back');
        await backBtn.click();
        await page.waitForTimeout(500);

        const shot6 = path.join(ARTIFACT_DIR, 'chatbot_minh_chung_6_resumed_chat.png');
        await page.screenshot({ path: shot6, fullPage: false });
        console.log(`- Đã chụp ảnh tình huống 6: ${shot6}`);

        console.log('\n=== TẤT CẢ 6 TÌNH HUỐNG KIỂM THỬ RANDOM CHATBOT ĐÃ HOÀN TẤT VÀ CHỤP ẢNH MINH CHỨNG THÀNH CÔNG 100% ===');
    } catch (err) {
        console.error('LỖI KIỂM THỬ CHATBOT:', err);
        process.exitCode = 1;
    } finally {
        await browser.close();
    }
}

runChatbotRandomScenarios();
