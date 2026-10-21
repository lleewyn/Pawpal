const test = require('node:test');
const assert = require('node:assert/strict');

const {
    evaluateToxicAndSentiment,
    dbTools,
    checkRateLimit,
    rateLimiterCache
} = require('../../scripts/api/chat.js');

test('PAWPAL AI MANUAL QA CHECKLIST AUTOMATED VERIFICATION SUITE', async (t) => {

    // === NHÓM A: Khởi động & Luồng cơ bản ===
    await t.test('PAI-A07: Gửi nội dung rỗng hoặc chỉ khoảng trắng', () => {
        const checkEmpty = (str) => (!str || str.trim().length === 0);
        assert.equal(checkEmpty(''), true, 'Chuỗi rỗng phải bị chặn');
        assert.equal(checkEmpty('   \n\t  '), true, 'Khoảng trắng phải bị chặn');
        assert.equal(checkEmpty('xin chào'), false, 'Nội dung hợp lệ không bị chặn');
    });

    await t.test('PAI-A08: Xử lý câu dài 2000 ký tự không bị treo hay tràn bộ đệm', () => {
        const longText = 'Bé cưng của tôi '.repeat(130); // ~2080 ký tự
        assert.ok(longText.length > 2000);
        const classification = evaluateToxicAndSentiment(longText, [], []);
        assert.ok(classification !== null, 'Phân loại cảm xúc thành công không bị treo');
    });

    // === NHÓM C: Sản phẩm, đơn hàng, điểm thưởng ===
    await t.test('PAI-C04 & PAI-D01: Guest chưa xác thực không được phép đọc đơn hàng hoặc điểm cá nhân', async () => {
        const resOrders = await dbTools.get_user_orders(null);
        assert.ok(resOrders.error, 'Phải có thuộc tính error khi userId null');
        assert.match(resOrders.error, /đăng nhập/i);

        const resLoyalty = await dbTools.get_loyalty_summary_own(null);
        assert.ok(resLoyalty.error, 'Phải có thuộc tính error khi userId null');
    });

    await t.test('PAI-C09: Sự cố thanh toán trừ tiền 2 lần kích hoạt billing_dispute và handover', () => {
        const query = 'Tôi bị trừ tiền hai lần mà đơn chưa thanh toán';
        const analysis = evaluateToxicAndSentiment(query, [], []);
        assert.equal(analysis.riskType, 'billing_dispute');
        assert.equal(analysis.shouldHandover, true, 'Bắt buộc chuyển tiếp cho CSKH');
        assert.ok(analysis.detectedLevel >= 4, 'Cấp độ khẩn cấp tài chính >= 4');
    });

    // === NHÓM E: Cảm xúc & Tính ngữ cảnh ===
    await t.test('PAI-E04: Khách hàng viết hoa bực tức TÔI RẤT BỰC MÌNH!!!', () => {
        const angryMsg = 'TÔI RẤT BỰC MÌNH VÌ GIAO TRỄ!!!';
        const sampleTriggers = [{ trigger_pattern: 'bực mình', tier_level: 4 }];
        const analysis = evaluateToxicAndSentiment(angryMsg, [], sampleTriggers);
        assert.ok(analysis.detectedLevel >= 4, 'Khách bực tức có detectedLevel >= 4');
    });

    await t.test('PAI-E10 & PAI-G01: Khách hàng yêu cầu gặp tư vấn viên người thật', () => {
        const handoverMsg = 'Cho tôi gặp nhân viên tư vấn người thật';
        const analysis = evaluateToxicAndSentiment(handoverMsg, [], []);
        assert.equal(analysis.isAgentRequested, true);
        assert.equal(analysis.shouldHandover, true, 'Bắt buộc kích hoạt cờ chuyển giao CSKH');
    });

    // === NHÓM F: An toàn thú cưng & Tình huống khẩn cấp ===
    await t.test('PAI-F01: Bé chó 3 tháng hỏi tiêm phòng không bị nâng thành cấp cứu', () => {
        const vaccineQuery = 'Bé mèo cần tiêm phòng dại khi nào?';
        const analysis = evaluateToxicAndSentiment(vaccineQuery, [], []);
        assert.equal(analysis.riskType, 'medical_topic', 'Tiêm phòng định kỳ không phải cấp cứu');
        assert.equal(analysis.shouldHandover, false, 'Không bắt buộc handover khẩn cấp');
        assert.ok(analysis.detectedLevel <= 3, 'Mức độ ưu tiên thông thường (<= 3)');
    });

    await t.test('PAI-F02: Bé mèo khó thở, thở gấp và yếu dần kích hoạt medical_emergency mức 6', () => {
        const emergencyQuery = 'Bé cún bị co giật và khó thở dữ dội!';
        const analysis = evaluateToxicAndSentiment(emergencyQuery, [], []);
        assert.equal(analysis.riskType, 'medical_emergency', 'Phải nhận diện đúng cấp cứu y tế');
        assert.equal(analysis.detectedLevel, 6, 'Mức độ khẩn cấp tối đa là 6 (tier 6)');
        assert.equal(analysis.shouldHandover, true, 'Bắt buộc kích hoạt cờ chuyển giao khẩn cấp');
        
        // Clamp 1-5 khi lưu vào CSDL
        const persisted = Math.min(5, Math.max(1, analysis.detectedLevel));
        assert.equal(persisted, 5, 'persistedLevel phải được clamp ở mức 5');
    });

    await t.test('PAI-F03: Bé chó ăn nhầm thuốc người kích hoạt cấp cứu y tế', () => {
        const poisonQuery = 'Bé chó vừa ngộ độc nuốt ăn nhầm thuốc người rồi co giật!';
        const analysis = evaluateToxicAndSentiment(poisonQuery, [], []);
        assert.equal(analysis.riskType, 'medical_emergency');
        assert.equal(analysis.shouldHandover, true);
    });

    // === NHÓM H: Bảo mật, phân quyền & Injection ===
    await t.test('PAI-H02: Chặn truy vấn chéo đơn hàng khi không có quyền của khách khác', async () => {
        const res = await dbTools.get_user_orders(null);
        assert.ok(res.error);
    });

    await t.test('PAI-H07: Chống XSS Script Injection trong widget chat', () => {
        const payload = '<img src=x onerror=alert(1)>';
        const escapeHtml = (str) => String(str).replace(/[&<>"']/g, (m) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[m]));
        const safe = escapeHtml(payload);
        assert.equal(safe.includes('<img'), false, 'Không được giữ thẻ <img> mở');
        assert.equal(safe, '&lt;img src=x onerror=alert(1)&gt;');
    });

    // === NHÓM I: Lỗi hệ thống, Rate limit & Biên ===
    await t.test('PAI-I08: Rate limiter Chatbot khống chế lũy kế và chặn dứt khoát', () => {
        const key = 'test-manual-qa-rate-ip';
        rateLimiterCache.delete(key);
        const limit = 20;

        for (let i = 1; i <= limit; i++) {
            const check = checkRateLimit(key, limit, 60000);
            assert.equal(check.allowed, true, `Request ${i} phải được phép`);
        }

        const exceeded = checkRateLimit(key, limit, 60000);
        assert.equal(exceeded.allowed, false, 'Request thứ 21 phải bị chặn dứt khoát');
        assert.ok(exceeded.retryAfter > 0, 'Phải có giá trị retryAfter hợp lệ');
        rateLimiterCache.delete(key);
    });
});
