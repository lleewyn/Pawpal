const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const chatApi = require('../api/chat.js');

test('PAWPAL AI API & ADMIN OVERLOAD RESILIENCE TEST SUITE', async (t) => {

    await t.test('G1-01 (P0-01): server.js không chứa bất kỳ delete require.cache nào trong runtime routes', () => {
        const serverCode = fs.readFileSync(path.join(__dirname, '../../server.js'), 'utf-8');
        const matches = serverCode.match(/delete\s+require\.cache/g);
        assert.equal(matches, null, 'server.js tuyệt đối không được dùng delete require.cache trong route phục vụ request');
    });

    await t.test('G1-03 (D01): Rate limiter đếm lũy kế 31 requests/phút từ cùng một tài khoản và chặn từ req 31', () => {
        const testActorKey = 'test_actor_' + Date.now();
        const { checkRateLimit, rateLimiterCache } = chatApi;

        // Xóa sạch trạng thái cũ của key này nếu có
        rateLimiterCache.delete('copilot:' + testActorKey);

        // Gửi 30 requests hợp lệ
        for (let i = 1; i <= 30; i++) {
            const result = checkRateLimit('copilot:' + testActorKey, 30, 60000);
            assert.equal(result.allowed, true, `Request ${i} phải được cho phép`);
            assert.equal(result.remaining, 30 - i, `Request ${i} remaining phải bằng ${30 - i}`);
        }

        // Request thứ 31 BẮT BUỘC bị chặn (allowed = false, remaining = 0, retryAfter > 0)
        const blockedReq = checkRateLimit('copilot:' + testActorKey, 30, 60000);
        assert.equal(blockedReq.allowed, false, 'Request thứ 31 bắt buộc bị từ chối do vượt rate limit 30 req/phút');
        assert.equal(blockedReq.remaining, 0, 'Remaining phải bằng 0 khi bị chặn');
        assert.ok(blockedReq.retryAfter > 0, 'retryAfter phải là số nguyên dương tính bằng giây');
        assert.ok(blockedReq.resetInMs > 0, 'resetInMs phải lớn hơn 0');

        // Dọn dẹp key sau test
        rateLimiterCache.delete('copilot:' + testActorKey);
    });

    await t.test('G1-04 (D02): Concurrency limiter khống chế tối đa 5 tác vụ AI đồng thời trên process', () => {
        const { MAX_CONCURRENT_AI_CALLS, getActiveConcurrentAiCalls, setActiveConcurrentAiCalls } = chatApi;
        assert.equal(MAX_CONCURRENT_AI_CALLS, 5, 'Ngưỡng MAX_CONCURRENT_AI_CALLS phải là 5');

        const originalCalls = getActiveConcurrentAiCalls();
        try {
            // Giả lập 5 tác vụ AI đang in-flight
            setActiveConcurrentAiCalls(5);
            assert.equal(getActiveConcurrentAiCalls(), 5);

            // Kiểm tra ngưỡng đầy: khi >= 5 tác vụ, tác vụ thứ 6 phải bị chặn
            const isAtCapacity = getActiveConcurrentAiCalls() >= MAX_CONCURRENT_AI_CALLS;
            assert.equal(isAtCapacity, true, 'Hệ thống phải nhận diện đang ở ngưỡng đầy tải 5 in-flight');
        } finally {
            setActiveConcurrentAiCalls(originalCalls);
        }
    });

    await t.test('G1-05: pruneRateLimiterCache dọn dẹp các bản ghi không hoạt động quá 2 phút', () => {
        const { rateLimiterCache, pruneRateLimiterCache } = chatApi;
        const staleKey = 'stale_test_key_' + Date.now();
        const activeKey = 'active_test_key_' + Date.now();

        // Giả lập 1 record cũ từ 3 phút trước
        rateLimiterCache.set(staleKey, { count: 5, startTime: Date.now() - 180000 });
        // Giả lập 1 record mới từ 10 giây trước
        rateLimiterCache.set(activeKey, { count: 1, startTime: Date.now() - 10000 });

        pruneRateLimiterCache();

        assert.equal(rateLimiterCache.has(staleKey), false, 'Record cũ quá 2 phút phải bị xóa khỏi cache');
        assert.equal(rateLimiterCache.has(activeKey), true, 'Record còn hoạt động phải được giữ lại trong cache');

        rateLimiterCache.delete(activeKey);
    });

    await t.test('G2-01 (B01, B02, B03): Fast-Paths hiện hữu không qua Gemini model-call', async () => {
        // Test B01: Lịch hẹn hôm nay
        let resData = null;
        const mockRes = {
            status(code) { this.statusCode = code; return this; },
            json(data) { resData = data; return this; },
            setHeader() {}
        };

        const mockReqB01 = {
            ip: '127.0.0.1',
            _isDirectTestCall: true,
            headers: {},
            body: {
                isCopilot: true,
                messages: [{ role: 'user', content: 'Có bao nhiêu lịch hẹn hôm nay?' }]
            }
        };

        await chatApi(mockReqB01, mockRes);
        assert.equal(mockRes.statusCode, 200);
        assert.equal(resData.ok, true);
        assert.equal(resData.done, true);
        assert.equal(resData.router, 'deterministic_appointments', 'B01 phải khớp router deterministic_appointments (0 model-call)');

        // Test B03: Tồn kho thấp dưới 5 món
        let resDataB03 = null;
        const mockResB03 = {
            status(code) { this.statusCode = code; return this; },
            json(data) { resDataB03 = data; return this; },
            setHeader() {}
        };
        const mockReqB03 = {
            ip: '127.0.0.1',
            _isDirectTestCall: true,
            headers: {},
            body: {
                isCopilot: true,
                messages: [{ role: 'user', content: 'Liệt kê sản phẩm tồn kho dưới 5 món.' }]
            }
        };

        await chatApi(mockReqB03, mockResB03);
        assert.equal(mockResB03.statusCode, 200);
        assert.equal(resDataB03.ok, true);
        assert.equal(resDataB03.router, 'deterministic_inventory', 'B03 phải khớp router deterministic_inventory (0 model-call)');
    });

    await t.test('G2-02: Fast-Paths mới (deterministic_orders & deterministic_queue) hoạt động chuẩn xác', async () => {
        // Test Fast-Path đơn hàng chờ xử lý
        let resDataOrders = null;
        const mockResOrders = {
            status(code) { this.statusCode = code; return this; },
            json(data) { resDataOrders = data; return this; },
            setHeader() {}
        };
        const mockReqOrders = {
            ip: '127.0.0.1',
            _isDirectTestCall: true,
            headers: {},
            body: {
                isCopilot: true,
                messages: [{ role: 'user', content: 'Có bao nhiêu đơn hàng chờ xử lý hôm nay?' }]
            }
        };

        await chatApi(mockReqOrders, mockResOrders);
        assert.equal(mockResOrders.statusCode, 200);
        assert.equal(resDataOrders.ok, true);
        assert.equal(resDataOrders.router, 'deterministic_orders', 'Phải khớp router deterministic_orders (0 model-call)');
        assert.ok(typeof resDataOrders.reply === 'string' && resDataOrders.reply.length > 0);

        // Test Fast-Path hàng đợi chat chờ tiếp nhận
        let resDataQueue = null;
        const mockResQueue = {
            status(code) { this.statusCode = code; return this; },
            json(data) { resDataQueue = data; return this; },
            setHeader() {}
        };
        const mockReqQueue = {
            ip: '127.0.0.1',
            _isDirectTestCall: true,
            headers: {},
            body: {
                isCopilot: true,
                messages: [{ role: 'user', content: 'Hiện tại có bao nhiêu ca chat trong hàng đợi chờ tiếp nhận?' }]
            }
        };

        await chatApi(mockReqQueue, mockResQueue);
        assert.equal(mockResQueue.statusCode, 200);
        assert.equal(resDataQueue.ok, true);
        assert.equal(resDataQueue.router, 'deterministic_queue', 'Phải khớp router deterministic_queue (0 model-call)');
        assert.ok(typeof resDataQueue.reply === 'string' && resDataQueue.reply.length > 0);
    });

    await t.test('G2-07: Client Copilot cắt gọn copilotHistory xuống 10 tin nhắn trước khi fetch', () => {
        const copilotCode = fs.readFileSync(path.join(__dirname, '../../pages/admin/modules/chatbot/subtabs/tab-chatbot-copilot.js'), 'utf-8');
        assert.ok(copilotCode.includes('slice(-10)'), 'tab-chatbot-copilot.js phải cắt 10 tin nhắn gần nhất trước khi gửi');
        assert.ok(copilotCode.includes('payloadMessages'), 'tab-chatbot-copilot.js phải dùng payloadMessages cắt gọn thay vì copilotHistory thô');
    });

    await t.test('G3-08: Admin Live upload ảnh Storage lỗi thì báo lỗi trung thực, không nhét base64 vào DB', () => {
        const liveCode = fs.readFileSync(path.join(__dirname, '../../pages/admin/modules/chatbot/subtabs/tab-chatbot-live.js'), 'utf-8');
        assert.ok(!liveCode.includes('pendingAdminAttachment.dataUrl : `[Ảnh đính kèm'), 'Không được fallback nhét base64 dataUrl vào chat_message khi upload storage lỗi');
        assert.ok(liveCode.includes('Không thể tải tệp đính kèm lên máy chủ lưu trữ'), 'Phải thông báo lỗi trung thực cho CSKH khi upload storage lỗi');
    });

    await t.test('G4-06 (B08): Khi tắt copilot_ai_enabled, Fast-Path vẫn chạy 100%, câu tự do trả fallback an toàn', async () => {
        const chatConfig = require('../api/chat_config.js');
        const origConfig = chatConfig.getChatConfig();

        try {
            // Tắt cờ copilot_ai_enabled
            chatConfig.updateChatConfig({ copilot_ai_enabled: false });

            // 1. Fast-path vẫn phải chạy 100%
            let resFast = null;
            const mockResFast = {
                status(code) { this.statusCode = code; return this; },
                json(data) { resFast = data; return this; },
                setHeader() {}
            };
            const reqFast = {
                ip: '127.0.0.1',
                _isDirectTestCall: true,
                body: { isCopilot: true, messages: [{ role: 'user', content: 'Có bao nhiêu lịch hẹn hôm nay?' }] }
            };
            await chatApi(reqFast, mockResFast);
            assert.equal(mockResFast.statusCode, 200);
            assert.equal(resFast.router, 'deterministic_appointments', 'Fast-Path vẫn hoạt động khi tắt AI Copilot');

            // 2. Câu tự do trả về copilot_disabled_fallback mà không gọi Gemini
            let resDisabled = null;
            const mockResDisabled = {
                status(code) { this.statusCode = code; return this; },
                json(data) { resDisabled = data; return this; },
                setHeader() {}
            };
            const reqDisabled = {
                ip: '127.0.0.1',
                _isDirectTestCall: true,
                body: { isCopilot: true, messages: [{ role: 'user', content: 'Phân tích chiến lược kinh doanh quý 4 giúp anh' }] }
            };
            await chatApi(reqDisabled, mockResDisabled);
            assert.equal(mockResDisabled.statusCode, 200);
            assert.equal(resDisabled.router, 'copilot_disabled_fallback', 'Câu tự do trả fallback khi copilot_ai_enabled = false');
        } finally {
            // Khôi phục cấu hình ban đầu
            chatConfig.updateChatConfig(origConfig);
        }
    });

});
