'use strict';

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Match complete words/phrases from the DB rule list. Raw substring matching
// makes short rules such as "cl" flag ordinary Vietnamese words by accident.
function buildSafeKeywordRegex(keyword) {
    const normalized = String(keyword || '').trim();
    if (!normalized) return null;

    const escaped = escapeRegExp(normalized);
    const startsWithWordChar = /^[\p{L}\p{N}_]/u.test(normalized);
    const endsWithWordChar = /[\p{L}\p{N}_]$/u.test(normalized);
    const prefix = startsWithWordChar ? '(?<![\\p{L}\\p{N}_])' : '';
    const suffix = endsWithWordChar ? '(?![\\p{L}\\p{N}_])' : '';

    return new RegExp(`${prefix}${escaped}${suffix}`, 'giu');
}

function evaluateToxicAndSentiment(userText, filters = [], triggers = []) {
    const rawText = String(userText || '');
    const lower = rawText.toLowerCase();
    const detectedKeywords = [];
    const maskedWords = [];
    let isToxic = false;
    let worstAction = 'none'; // 'none', 'mask', 'warn', 'escalate', 'block'
    let maskedText = rawText;

    // 1. Quét màng lọc từ cấm (Profanity & Abuse)
    filters.forEach(f => {
        const kw = String(f.keyword || '').trim();
        const matchRegex = buildSafeKeywordRegex(kw);
        if (matchRegex && matchRegex.test(rawText)) {
            detectedKeywords.push(f.keyword);
            maskedWords.push(f.keyword);
            isToxic = true;
            try {
                matchRegex.lastIndex = 0;
                maskedText = maskedText.replace(matchRegex, f.replacement_text || '***');
            } catch (_) {}

            if (f.action === 'block') {
                worstAction = 'block';
            } else if (f.action === 'escalate' && worstAction !== 'block') {
                worstAction = 'escalate';
            } else if (f.action === 'warn' && !['block', 'escalate'].includes(worstAction)) {
                worstAction = 'warn';
            } else if (f.action === 'mask' && worstAction === 'none') {
                worstAction = 'mask';
            }
        }
    });

    // 1B. Bổ sung nhận diện các biến thể teencode / lách từ thông dụng
    const teencodePatterns = [
        { regex: /(?<![\p{L}\p{N}_])(đ[\s.*_\-]*m|d[\s.*_\-]*m|đ[\s.*_\-]*k[\s.*_\-]*m|d[\s.*_\-]*k[\s.*_\-]*m|v[\s.*_\-]*c[\s.*_\-]*l|v[\s.*_\-]*k[\s.*_\-]*l)(?![\p{L}\p{N}_])/giu, replacement: '***', keyword: 'teencode_profanity' }
    ];
    teencodePatterns.forEach(tp => {
        if (tp.regex.test(rawText)) {
            isToxic = true;
            detectedKeywords.push(tp.keyword);
            maskedWords.push(tp.keyword);
            if (worstAction === 'none') worstAction = 'mask';
            try {
                tp.regex.lastIndex = 0;
                maskedText = maskedText.replace(tp.regex, tp.replacement);
            } catch (_) {}
        }
    });

    // 2. Chấm điểm cấp độ cảm xúc (1 - 6) từ triggers CSDL
    let detectedLevel = 2; // Mặc định: Cấp 2 (Bình thường, trung lập)
    triggers.forEach(tr => {
        const patterns = (tr.trigger_pattern || '').split(',').map(p => p.trim().toLowerCase()).filter(Boolean);
        for (const p of patterns) {
            if (lower.includes(p)) {
                if (tr.tier_level === 6 || tr.tier_level > detectedLevel) {
                    detectedLevel = tr.tier_level;
                }
            }
        }
    });

    // 3. Phân loại loại rủi ro (Risk Type) theo ngữ cảnh thực tế (R0 / P0-03)
    let riskType = 'none';
    if (/chảy máu|ngộ độc|co giật|hấp hối|thở dốc|tai nạn|gãy chân|nuốt dị vật|sơ cứu/i.test(lower)) {
        riskType = 'medical_emergency';
        detectedLevel = 6; // Cấp 6: Khẩn cấp theo thang đo chatbot_sentiment_tier (1 - 6)
    } else if (/mang thai|có bầu|chửa|sinh con/i.test(lower)) {
        riskType = 'special_care';
        detectedLevel = Math.max(detectedLevel, 3);
    } else if (/tiêm phòng|vắc xin|vacxin|xổ giun|sổ tiêm|lịch tiêm/i.test(lower)) {
        // P0-03: Chủ đề sức khỏe thông thường, KHÔNG coi là cấp cứu và KHÔNG tự động chuyển ca
        riskType = 'medical_topic';
        detectedLevel = Math.max(detectedLevel, 2);
    } else if (/trừ tiền|chưa nhận được tiền|sai tiền|hoàn tiền|mất tiền|thanh toán lỗi/i.test(lower)) {
        riskType = 'billing_dispute';
        detectedLevel = Math.max(detectedLevel, 4);
    } else if (/giao trễ|giao sai|hỏng hàng|trầy xước|vòi tiền|thái độ/i.test(lower)) {
        riskType = 'service_complaint';
        detectedLevel = Math.max(detectedLevel, 4);
    }

    // 4. Phân loại hình thức vi phạm (Abuse Type)
    let abuseType = 'none';
    if (isToxic) {
        if (/giết|đánh|đập|phốt|đốt|chém/i.test(lower)) {
            abuseType = 'harassment';
        } else {
            abuseType = 'profanity';
        }
    }

    // Nếu vi phạm từ cấm thì tối thiểu nâng lên Cấp 4 hoặc Cấp 5
    if (isToxic && detectedLevel < 4) {
        detectedLevel = worstAction === 'block' ? 5 : 4;
    }

    const isAgentRequested = lower.includes('gặp nhân viên') ||
                             lower.includes('người thật') ||
                             lower.includes('tư vấn viên');

    // P0-03: Chỉ kích hoạt handover khi có yêu cầu người thật, cấp độ >= 4, hoặc sự cố y tế khẩn cấp / tranh chấp tiền / khiếu nại dịch vụ
    // Chủ đề y tế thông thường (medical_topic như hỏi lịch tiêm phòng) KHÔNG tự động kích hoạt handover
    const shouldHandover = isAgentRequested ||
                           detectedLevel >= 4 ||
                           riskType === 'medical_emergency' ||
                           riskType === 'billing_dispute' ||
                           riskType === 'service_complaint';

    let handoverReason = '';
    if (isAgentRequested) handoverReason = 'Khách yêu cầu gặp tư vấn viên trực tiếp';
    else if (riskType === 'medical_emergency') handoverReason = 'Cảnh báo y tế khẩn cấp cho thú cưng';
    else if (riskType === 'special_care' && shouldHandover) handoverReason = 'Tư vấn chế độ chăm sóc y tế đặc biệt';
    else if (riskType === 'billing_dispute') handoverReason = 'Khiếu nại / đối soát sự cố thanh toán';
    else if (riskType === 'service_complaint') handoverReason = 'Khiếu nại chất lượng dịch vụ / vận chuyển';
    else if (isToxic) handoverReason = 'Ngôn từ kích động / vi phạm tiêu chuẩn văn minh';

    const urgency = detectedLevel === 6 ? 'critical' : (detectedLevel >= 4 ? 'high' : (detectedLevel === 3 ? 'medium' : 'low'));
    const isUrgent = detectedLevel >= 4;

    return {
        isToxic,
        detectedKeywords,
        maskedWords,
        worstAction,
        maskedText,
        detectedLevel,
        isUrgent,
        riskType,
        abuseType,
        urgency,
        shouldHandover,
        isAgentRequested,
        handoverReason
    };
}

module.exports = { evaluateToxicAndSentiment };
