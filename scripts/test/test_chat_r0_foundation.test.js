const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateToxicAndSentiment } = require('../api/chat.js');

test('R0 - P0-03: Chủ đề tiêm phòng / vắc xin thông thường KHÔNG bị ép thành ca khẩn cấp level 6', () => {
    const filters = [];
    const triggers = [];

    const resultVaccine = evaluateToxicAndSentiment('Bé mèo cần tiêm phòng dại khi nào?', filters, triggers);
    assert.equal(resultVaccine.riskType, 'medical_topic');
    assert.equal(resultVaccine.shouldHandover, false, 'Tiêm phòng thông thường không được tự động chuyển ca khẩn cấp');
    assert.ok(resultVaccine.detectedLevel <= 3, `Cấp độ cảm xúc phải bình thường (nhận được: ${resultVaccine.detectedLevel})`);

    const resultWorm = evaluateToxicAndSentiment('Cho mình hỏi lịch xổ giun cho cún 2 tháng tuổi', filters, triggers);
    assert.equal(resultWorm.riskType, 'medical_topic');
    assert.equal(resultWorm.shouldHandover, false);
});

test('R0 - P0-03: Cấp cứu y tế thú cưng kích hoạt medical_emergency và shouldHandover = true với level 6 (tier 6)', () => {
    const filters = [];
    const triggers = [];

    const resultEmergency = evaluateToxicAndSentiment('Bé cún bị co giật và khó thở dữ dội!', filters, triggers);
    assert.equal(resultEmergency.riskType, 'medical_emergency');
    assert.equal(resultEmergency.shouldHandover, true);
    assert.equal(resultEmergency.urgency, 'critical');
    assert.equal(resultEmergency.detectedLevel, 6, 'detectedLevel là 6 theo thang đo chatbot_sentiment_tier');
    
    // Kiểm tra cơ chế clamp an toàn khi ghi vào chat_conversation (CHECK sentiment_level BETWEEN 1 AND 5)
    const persistedLevel = Math.min(5, Math.max(1, resultEmergency.detectedLevel));
    assert.equal(persistedLevel, 5, 'persistedLevel phải được giới hạn ở mức 5 để không vi phạm ràng buộc CSDL');
});

test('R0 - P0-03: Sự cố thanh toán kích hoạt billing_dispute và shouldHandover = true', () => {
    const filters = [];
    const triggers = [];

    const resultBilling = evaluateToxicAndSentiment('Tôi bị trừ tiền hai lần mà đơn chưa thanh toán', filters, triggers);
    assert.equal(resultBilling.riskType, 'billing_dispute');
    assert.equal(resultBilling.shouldHandover, true);
    assert.ok(resultBilling.detectedLevel >= 4);
});

test('R0 - P0-03: Khách hàng yêu cầu gặp tư vấn viên kích hoạt shouldHandover = true', () => {
    const filters = [];
    const triggers = [];

    const resultHandover = evaluateToxicAndSentiment('Cho tôi gặp nhân viên tư vấn', filters, triggers);
    assert.equal(resultHandover.isAgentRequested, true);
    assert.equal(resultHandover.shouldHandover, true);
});

test('R0 - P0-03: Thang đo cảm xúc hỗ trợ 1 đến 6 và clamp 1 đến 5 khi lưu CSDL', () => {
    const filters = [];
    const triggers = [{ trigger_pattern: 'nguy hiểm', tier_level: 6 }];

    const result = evaluateToxicAndSentiment('nguy hiểm', filters, triggers);
    assert.equal(result.detectedLevel, 6, 'detectedLevel đạt cấp 6 theo thang đo tier 1..6');
    const persistedLevel = Math.min(5, Math.max(1, result.detectedLevel));
    assert.equal(persistedLevel, 5, 'persistedLevel được clamp an toàn ở mức 5');
});
