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
    // Symptoms describe the incident; urgency is handled below, independently of abuse.
    const clinicalTerms = new Set(['chảy máu', 'máu', 'vết thương', 'bị thương', 'co giật', 'ngộ độc']);

    // 1. Quét màng lọc từ cấm (Profanity & Abuse)
    filters.forEach(f => {
        const kw = String(f.keyword || '').trim();
        if (clinicalTerms.has(kw.normalize('NFC').toLowerCase())) return;
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
        { regex: /(?<![\p{L}\p{N}_])(đ[\s.*_\-]*m|d[\s.*_\-]*m|đ[\s.*_\-]*c[\s.*_\-]*m|d[\s.*_\-]*c[\s.*_\-]*m|đ[\s.*_\-]*k[\s.*_\-]*m|d[\s.*_\-]*k[\s.*_\-]*m|v[\s.*_\-]*c[\s.*_\-]*l|v[\s.*_\-]*k[\s.*_\-]*l|c[\s.*_\-]*l[\s.*_\-]*g[\s.*_\-]*t|c[\s.*_\-]*m[\s.*_\-]*m|c[\s.*_\-]*c)(?![\p{L}\p{N}_])/giu, replacement: '***', keyword: 'teencode_profanity' }
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

    const folded = lower.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/\s+/g, ' ').trim();
    const socialIntent = /^(?:(?:xin )?chao|hello|hi|hey)(?: (?:ban|shop|ad|admin|pawpal|moi nguoi|cua hang|tiem|buoi sang|buoi chieu|buoi toi))?(?: (?:a|nha|nhe|oi))?[!.?\s]*$/.test(folded) ? 'greeting'
        : /^(?:(?:da|vang|ok|oki|oke|uhm|um|a) ){0,2}(?:cam on|thank you|thanks|tks|thank)(?: (?:ban|shop|ad|admin|pawpal|moi nguoi|cua hang|tiem))?(?: (?:nhieu|qua|lam)){0,2}(?: (?:a|nha|nhe|oi))?[!.?\s]*$/.test(folded) ? 'thanks' : null;
    const isPraise = !/[?]/.test(rawText)
        && !/\b(?:nhung|tuy nhien|hoi |cho minh hoi|tu van|bao nhieu|gia |dat lich|mua |huy|chua |khong (?:hai long|on|thich|duoc)|te|loi)\b/.test(folded)
        && /\b(?:tuyet voi|rat tot|rat hai long|hai long lam|ung lam|dep qua|thom qua|5 sao|se quay lai|ung ho tiep|lam tot lam|de thuong|chuyen nghiep)\b/.test(folded);
    let matchedTier1Trigger = false;

    // A standalone greeting/thanks/praise starts at level 1. Configured triggers may raise it.
    let detectedLevel = (socialIntent || isPraise) ? 1 : 2;
    triggers.forEach(tr => {
        const patterns = (tr.trigger_pattern || '').split(',').map(p => p.trim().toLowerCase()).filter(Boolean);
        for (const p of patterns) {
            if (lower.includes(p)) {
                if (tr.tier_level === 1) matchedTier1Trigger = true;
                if (tr.tier_level === 6 || tr.tier_level > detectedLevel) {
                    detectedLevel = tr.tier_level;
                }
            }
        }
    });
    if (matchedTier1Trigger && detectedLevel === 2 && !/[?]/.test(rawText) && !/\b(?:nhung|tuy nhien|cho minh hoi|tu van|bao nhieu|gia |dat lich|mua |huy|chua |khong (?:hai long|on|thich|duoc)|te|loi)\b/.test(folded)) {
        detectedLevel = 1;
    }

    const repeatedAttempts = /\b(?:(?:goi|nhan|hoi|lien he|bao)\s+(?:(?:toi|den) )?(?:may|nhieu|hai|ba|[2-9]\d*) lan|lan thu (?:hai|ba|tu|[2-9]\d*) roi)\b/.test(folded);
    const stillUnresolved = /\b(?:van (?:chua|khong) (?:toi|den|don|giao|phan hoi|xu ly|giai quyet|hoan tien|xong)|(?:khong|chua co) ai (?:nghe|tra loi|phan hoi|xu ly|giai quyet))\b/.test(folded);
    const missedAppointment = /\bhen\b[^.!?;]{0,70}\b(?:ma|nhung)\b[^.!?;]{0,65}\b(?:van )?chua (?:toi|den|don)\b|\bqua gio hen\b[^.!?;]{0,60}\b(?:van )?chua (?:toi|den|don)\b/.test(folded);
    const isMildDisappointed = /\b(?:hoi that vong|that vong|chan (?:that|ghe|qua|lam|the)|nan (?:qua|ghe|that)|lam an (?:kieu|gi|la|te|chan)|lam gi (?:ki|ky|ma|the)|sao (?:ki|ky) (?:vay|the)|ki cuc|vo van|khong nhu mong doi|lan nay khong on|khong dam quay lai|thoi (?:dep|khoi)(?: di)?)\b/.test(folded);
    const isStrongDisappointed = /\b(?:(?:qua|cuc ky|vo cung|that su) (?:that vong|te|chan|nan)|te qua|ra nong noi)\b/.test(folded)
        || /\bnghi sao\s+(?:ma|lai|the|vay)\b|\bnghi sao\b[^.!?;]{0,40}\b(?:lam|de|cat|cham|giao)\b/.test(folded);
    const isDisappointed = isMildDisappointed || isStrongDisappointed;
    const hasWaitingCue = /\b(?:lau (?:qua|the|vay|lac)|doi (?:mai|lau|hoai|tu nay|nay gio)|cho (?:mai|lau|hoai|nay gio)|(?:khong|chua) (?:thay )?ai (?:tra loi|ho tro|phan hoi|rep|nghe)|(?:chua|khong) thay (?:tra loi|phan hoi|ai))\b/.test(folded);
    const isImpatient = (/^(?:alo|ua|sao lau|co ai|roi sao|lau qua|doi lau|doi mai|cho lau)/.test(folded) && (/[?!]{2,}/.test(rawText) || hasWaitingCue || /\bco ai\b/.test(folded)))
        || (hasWaitingCue && (/[?!]/.test(rawText) || /\b(?:sao|vay|nhi|ha|nua)\b/.test(folded) || rawText.length <= 80));
    const isMildlyAnxious = /\b(?:nhut nhat|so nguoi la|lan dau (?:di |den )|so be (?:so|hoang|stress)|hoi roi|khong biet chon gi|so khong quen)\b/.test(folded);
    const isSevereDistress = (stillUnresolved && (repeatedAttempts || missedAppointment))
        || /\bra nong noi\b|\bnghi sao\s+(?:ma|lai)\b|\bnghi sao\b[^.!?;]{0,40}\b(?:lam|de|cat|cham|giao)\b/.test(folded);
    const isImplicitlyUpset = isSevereDistress || isStrongDisappointed;
    if (isImpatient || isMildDisappointed) {
        detectedLevel = Math.max(detectedLevel, 3);
    }
    if (isStrongDisappointed) {
        detectedLevel = Math.max(detectedLevel, 4);
    }

    const isPolicyQuestion = /\b(?:chinh sach|quy dinh|dieu kien|nhu the nao|the nao|ra sao|lam sao|duoc khong)\b/.test(folded)
        && !/\b(?:don (?:hang )?(?:cua )?(?:toi|minh)|toi (?:moi )?nhan|minh (?:moi )?nhan|giao cho (?:toi|minh)|vua nhan|bi vo roi|hong roi)\b/.test(folded);
    // 3. Phân loại loại rủi ro (Risk Type) theo ngữ cảnh thực tế (R0 / P0-03)
    let riskType = 'none';
    if (/\b(?:chay mau|ngo doc|co giat|hap hoi|kho tho|tho doc|tho gap|kho danh thuc|khong dung day duoc|khong the dung day|tai nan|gay chan|nuot di vat|so cuu|bat tinh)\b/.test(folded)) {
        riskType = 'medical_emergency';
        detectedLevel = 6; // Cấp 6: Khẩn cấp theo thang đo chatbot_sentiment_tier (1 - 6)
    } else if (/\b(?:mang thai|co bau|chua de|sinh con|met moi|bieng an|bo an|ue oai|nam li bi|ngu nhieu|so hai|run ray|bi dau)\b/.test(folded)) {
        riskType = 'special_care';
        const highRiskPregnancy = /\b(?:mang thai|co bau|chua de)\s+(?:thang cuoi|sap sinh|sap de)\b/.test(folded);
        detectedLevel = Math.max(detectedLevel, highRiskPregnancy ? 6 : 3);
    } else if (/tiêm phòng|vắc xin|vacxin|xổ giun|sổ tiêm|lịch tiêm/i.test(lower)) {
        // P0-03: Chủ đề sức khỏe thông thường, KHÔNG coi là cấp cứu và KHÔNG tự động chuyển ca
        riskType = 'medical_topic';
        detectedLevel = Math.max(detectedLevel, 2);
    } else if (/trừ tiền|chưa nhận được tiền|sai tiền|hoàn tiền|mất tiền|thanh toán lỗi/i.test(lower)) {
        riskType = 'billing_dispute';
        detectedLevel = Math.max(detectedLevel, 4);
    } else if (missedAppointment || (!isPolicyQuestion && /giao trễ|giao sai|giao nhầm|hỏng hàng|móp méo|vỡ nát|hàng (?:bị )?(?:hỏng|vỡ|lỗi)|trầy (?:xước|da)|vòi tiền|thái độ/i.test(lower)) || /\bra nong noi\b|\blam (?:be|cho|con cho|meo|con meo|thu cung)[^.!?;]{0,40}\b(?:ra (?:nong noi|the nay|vay)|bi thuong|bi tray|bi dau|bi hong|bi hu|xau|te)\b|\b(?:cat|tia|tam) (?:hu|hong|xau|lech|tray)\b/.test(folded)) {
        riskType = 'service_complaint';
        detectedLevel = Math.max(detectedLevel, 4);
    }

    const isHighlyUpset = /(?<!\bkhong )\b(?:(?:rat|qua|cuc ky) (?:buc xuc|buc minh)|(?:buc xuc|buc minh|buc|tuc) (?:lam|qua)|khong the chap nhan)\b/.test(folded)
        || /(?:^|\b(?:toi|minh|em) )(?:(?:van|dang) )?(?:rat )?tuc gian\b/.test(folded);
    if (isHighlyUpset || isSevereDistress) {
        detectedLevel = Math.max(detectedLevel, 5);
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

    // Nếu vi phạm từ cấm thì nâng lên Cấp 5 (Mất kiểm soát, thù địch / Toxic Shield)
    if (isToxic && detectedLevel < 5) {
        detectedLevel = 5;
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
        socialIntent,
        isPraise: (isPraise || matchedTier1Trigger) && detectedLevel === 1 && !socialIntent,
        isHighlyUpset,
        isImplicitlyUpset,
        isDisappointed,
        isImpatient,
        isMildlyAnxious,
        missedAppointment,
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
