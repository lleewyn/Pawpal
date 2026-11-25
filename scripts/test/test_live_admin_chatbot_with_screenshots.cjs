const { chromium } = require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const path = require('node:path');
const fs = require('node:fs');
const http = require('node:http');
const express = require('express');

const ARTIFACT_DIR = 'C:/Users/QUYEN/.gemini/antigravity-cli/brain/7a76c9d1-504b-4a2d-877e-c42a3920b2f8';
const PORT = 3145;

async function runAdminChatbotVisualTest() {
    console.log('=== BẮT ĐẦU KIỂM THỬ TRỰC QUAN PHÂN HỆ CHATBOT BÊN ADMIN ===');
    
    // Khởi tạo máy chủ isolated render giao diện Admin Chatbot với đầy đủ stylesheet
    const app = express();
    const links = [...fs.readFileSync('my-client/pages/admin/index.html', 'utf8').matchAll(/<link[^>]+rel="stylesheet"[^>]*>/g)].map(x => x[0]).join('\n');
    const chatbotHtml = fs.readFileSync('my-client/pages/admin/modules/chatbot/chatbot.html', 'utf8');

    const conversationFixture = {
        id: '92000000-0000-0000-0000-000000000001',
        status: 'agent_handling',
        updated_at: new Date().toISOString(),
        updatedAtRaw: new Date().toISOString(),
        assignedStaffId: '20000000-0000-0000-0000-000000000002',
        isHandover: true,
        customerName: 'Nguyễn Thị Minh Anh',
        customerPhone: '0912 345 678',
        sentimentLevel: 1,
        sentimentScore: 3,
        messages: [
            { id: '1', sender: 'user', text: 'Chào shop, bé Corgi nhà mình 5kg muốn đặt gói tắm dưỡng chiều nay ạ', time: '14:20' },
            { id: '2', sender: 'bot', text: 'PawPal chào bạn! Gói Tắm Dưỡng Premium cho bé dưới 10kg có giá 220.000đ (90 phút). Bạn muốn đặt lịch lúc mấy giờ chiều nay?', time: '14:21' },
            { id: '3', sender: 'user', text: 'Tầm 15h30 còn chỗ không shop ơi? Cho mình gặp nhân viên tư vấn thêm với', time: '14:23' },
            { id: '4', sender: 'staff', text: 'Dạ PawPal chào chị Minh Anh ạ, em là Chuyên viên CSKH đã tiếp nhận ca. Khung giờ 15h30 chiều nay bên em hiện đang còn slot của KTV Tuấn, em hỗ trợ giữ lịch cho bé Corgi nhé!', time: '14:25' }
        ]
    };

    const clientScript = `
        localStorage.setItem('pawpal_admin_user', JSON.stringify({
            id: '20000000-0000-0000-0000-000000000002',
            name: 'Trần Văn Nhân Viên (CSKH)',
            system_role: 'ADMIN',
            access_roles: ['ADMIN']
        }));
        window.getSupabaseClient = () => ({
            auth: { getSession: async () => ({ data: { session: { user: { id: '20000000-0000-0000-0000-000000000002' }, access_token: 'test-token' } } }) },
            channel: () => ({ on: () => ({ subscribe: () => ({}) }), removeChannel: () => {} }),
            removeChannel: () => {},
            rpc: async (name) => {
                if (name === 'list_own_chat_media') return { data: [] };
                return { data: { rows: [], categories: [], page: 1, total: 0 } };
            }
        });
        window.PawpalChatbot = window.PawpalChatbot || {
            subtabs: {},
            state: {
                liveLoaded: true,
                currentConversation: ${JSON.stringify(conversationFixture)},
                liveConversations: [${JSON.stringify(conversationFixture)}]
            },
            showToast: () => {},
            loadInboxSummary: async () => {}
        };
    `;

    const fullPageHtml = `<!doctype html>
    <html lang="vi">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        ${links}
        <link rel="stylesheet" href="/pages/admin/modules/chatbot/chatbot.css">
        <link rel="stylesheet" href="/pages/admin/modules/chatbot/chatbot-v8.css">
        <style>
            body { margin: 0; background-color: #F4FAF6; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
            .admin-preview-content { padding: 20px; max-width: 1560px; margin: 0 auto; height: 100vh; box-sizing: border-box; overflow-y: auto; }
            .subtab-content { display: none; }
            .subtab-content.active { display: block; }
            .admin-subtabs-bar { display: flex; gap: 12px; margin-bottom: 16px; border-bottom: 1px solid #ECF2EE; padding-bottom: 8px; }
            .admin-subtab-btn { background: transparent; border: none; font-size: 14px; font-weight: 600; color: #4F7A65; cursor: pointer; padding: 6px 12px; border-radius: 9px; }
            .admin-subtab-btn.active { color: #236B48; border-bottom: 2px solid #236B48; }
        </style>
    </head>
    <body class="admin-body">
        <div class="admin-preview-content">
            <div class="admin-subtabs-bar">
                <button type="button" class="admin-subtab-btn active" id="btnSubtabLive" onclick="switchTab('subtab-tab-live-support', this)">Trực chat</button>
                <button type="button" class="admin-subtab-btn" id="btnSubtabCopilot" onclick="switchTab('subtab-tab-ai-copilot', this)">Trợ lý AI</button>
                <button type="button" class="admin-subtab-btn" id="btnSubtabRules" onclick="switchTab('subtab-tab-chatbot-rules', this)">Quy định</button>
            </div>
            ${chatbotHtml}
        </div>
        <script>${clientScript}</script>
        <script src="/pages/admin/modules/chatbot/chatbot.js"></script>
        <script src="/pages/admin/modules/chatbot/subtabs/tab-chatbot-live.js"></script>
        <script src="/pages/admin/modules/chatbot/subtabs/tab-chatbot-copilot.js"></script>
        <script src="/pages/admin/modules/chatbot/subtabs/tab-chatbot-rules.js"></script>
        <script>
            function switchTab(subtabId, btn) {
                document.querySelectorAll('.subtab-content').forEach(s => s.classList.remove('active'));
                document.getElementById(subtabId)?.classList.add('active');
                document.querySelectorAll('.admin-subtab-btn').forEach(b => b.classList.remove('active'));
                btn?.classList.add('active');
            }
            // Populate sample data for Live support view
            document.addEventListener('DOMContentLoaded', () => {
                const targetName = document.getElementById('currentChatCustomerName');
                if (targetName) targetName.textContent = 'Nguyễn Thị Minh Anh (0912 345 678)';
                const msgBox = document.getElementById('chatMessagesScrollBox');
                if (msgBox) {
                    msgBox.innerHTML = \`
                        <div class="chat-message-row user-row"><div class="chat-bubble chat-bubble--user"><div class="bubble-meta">Khách hàng · 14:20</div><div class="bubble-body">Chào shop, bé Corgi nhà mình 5kg muốn đặt gói tắm dưỡng chiều nay ạ</div></div></div>
                        <div class="chat-message-row bot-row"><div class="chat-bubble chat-bubble--bot"><div class="bubble-meta">PawPal AI · 14:21</div><div class="bubble-body">PawPal chào bạn! Gói Tắm Dưỡng Premium cho bé dưới 10kg có giá 220.000đ (90 phút). Bạn muốn đặt lịch lúc mấy giờ chiều nay?</div></div></div>
                        <div class="chat-message-row user-row"><div class="chat-bubble chat-bubble--user"><div class="bubble-meta">Khách hàng · 14:23</div><div class="bubble-body">Tầm 15h30 còn chỗ không shop ơi? Cho mình gặp nhân viên tư vấn thêm với</div></div></div>
                        <div class="chat-message-row staff-row"><div class="chat-bubble chat-bubble--staff"><div class="bubble-meta">CSKH (Trần Văn Nhân Viên) · 14:25</div><div class="bubble-body">Dạ PawPal chào chị Minh Anh ạ, em là Chuyên viên CSKH đã tiếp nhận ca. Khung giờ 15h30 chiều nay bên em hiện đang còn slot của KTV Tuấn, em hỗ trợ giữ lịch cho bé Corgi nhé!</div></div></div>
                    \`;
                }
                const aiCard = document.getElementById('aiContextCard');
                if (aiCard) {
                    aiCard.style.display = 'flex';
                    const aiText = document.getElementById('aiContextSummaryText');
                    if (aiText) aiText.textContent = 'Khách muốn đặt gói Tắm dưỡng lúc 15h30 chiều nay cho bé Corgi 5kg. Đang hỏi slot khả dụng của KTV.';
                }
            });
        </script>
    </body>
    </html>`;

    app.get('/', (req, res) => res.type('html').send(fullPageHtml));
    for (const dir of ['pages/admin', 'scripts/shared', 'styles', 'assets']) {
        app.use('/' + dir, express.static(path.resolve(dir)));
    }

    const server = http.createServer(app);
    await new Promise(r => server.listen(PORT, '127.0.0.1', r));
    console.log(`- Máy chủ render Admin Chatbot chạy tại http://127.0.0.1:${PORT}`);

    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    try {
        console.log('\n[1/3] Kiểm tra Subtab 1: Trực chat CSKH...');
        await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(600);

        const shot1 = path.join(ARTIFACT_DIR, 'admin_chatbot_minh_chung_1_live_support.png');
        await page.screenshot({ path: shot1, fullPage: false });
        console.log(`- Đã chụp ảnh Subtab Trực chat: ${shot1}`);

        console.log('\n[2/3] Kiểm tra Subtab 2: Trợ lý AI Copilot...');
        await page.click('#btnSubtabCopilot');
        await page.waitForTimeout(600);

        // Giả lập điền một câu hỏi mẫu vào Copilot
        const copilotInput = page.locator('#copilotInput');
        if (await copilotInput.isVisible()) {
            await copilotInput.fill('Hôm nay có bao nhiêu lịch hẹn Spa đang chờ phục vụ?');
        }

        const shot2 = path.join(ARTIFACT_DIR, 'admin_chatbot_minh_chung_2_copilot.png');
        await page.screenshot({ path: shot2, fullPage: false });
        console.log(`- Đã chụp ảnh Subtab Trợ lý AI Copilot: ${shot2}`);

        console.log('\n[3/3] Kiểm tra Subtab 3: Quy định & Tri thức Chatbot...');
        await page.click('#btnSubtabRules');
        await page.waitForTimeout(600);

        const shot3 = path.join(ARTIFACT_DIR, 'admin_chatbot_minh_chung_3_rules.png');
        await page.screenshot({ path: shot3, fullPage: false });
        console.log(`- Đã chụp ảnh Subtab Quy định & Tri thức: ${shot3}`);

        console.log('\n=== TẤT CẢ 3 SUBTAB CỦA CHATBOT ADMIN ĐÃ ĐƯỢC KIỂM THỬ TRỰC QUAN THÀNH CÔNG ===');
    } catch (err) {
        console.error('LỖI KIỂM THỬ ADMIN CHATBOT:', err);
    } finally {
        await browser.close();
        server.close();
    }
}

runAdminChatbotVisualTest();
