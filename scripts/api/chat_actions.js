require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

// Idempotency cache trong bộ nhớ (TTL: 24 giờ)
const idempotencyCache = new Map();
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;

function cleanExpiredIdempotency() {
    const now = Date.now();
    for (const [key, value] of idempotencyCache.entries()) {
        if (now - value.timestamp > IDEMPOTENCY_TTL_MS) {
            idempotencyCache.delete(key);
        }
    }
}
setInterval(cleanExpiredIdempotency, 60 * 60 * 1000).unref();

/**
 * Xác thực danh tính nhân sự từ Authorization header
 */
async function getStaffUser(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.split(' ')[1];

    if (token.startsWith('local:')) {
        const staffId = token.replace('local:', '');
        if (!staffId) return null;
        const { data: staff, error } = await supabase
            .from('staff')
            .select('id, full_name, system_role, account_status, permissions')
            .eq('id', staffId)
            .maybeSingle();

        if (error || !staff || staff.account_status !== 'ACTIVE') return null;
        return staff;
    }

    try {
        const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
        if (authErr || !user) return null;
        const { data: staff, error } = await supabase
            .from('staff')
            .select('id, full_name, system_role, account_status, permissions')
            .eq('auth_user_id', user.id)
            .maybeSingle();

        if (error || !staff || staff.account_status !== 'ACTIVE') return null;
        return staff;
    } catch (e) {
        return null;
    }
}

function buildSafeKeywordRegex(keyword) {
    const normalized = String(keyword || '').trim();
    if (!normalized) return null;
    const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const startsWithWordChar = /^[\p{L}\p{N}_]/u.test(normalized);
    const endsWithWordChar = /[\p{L}\p{N}_]$/u.test(normalized);
    const prefix = startsWithWordChar ? '(?<![\\p{L}\\p{N}_])' : '';
    const suffix = endsWithWordChar ? '(?![\\p{L}\\p{N}_])' : '';
    return new RegExp(`${prefix}${escaped}${suffix}`, 'giu');
}

/**
 * Làm sạch ngôn từ thô tục/xúc phạm (Toxic Shield Sanitizer)
 */
async function sanitizeText(text) {
    if (!text || typeof text !== 'string') return '';
    try {
        const { data: filters } = await supabase
            .from('chatbot_profanity_filter')
            .select('keyword, replacement')
            .eq('is_active', true);

        let sanitized = text;
        if (filters && filters.length > 0) {
            for (const f of filters) {
                if (!f.keyword) continue;
                const regex = buildSafeKeywordRegex(f.keyword);
                if (regex) {
                    sanitized = sanitized.replace(regex, f.replacement || '***');
                }
            }
        }
        // Fallback kiểm tra các từ tục thông dụng
        const commonBad = ['đụ', 'địt', 'lồn', 'cặc', 'chó đẻ', 'chó chết', 'mất dạy', 'mẹ mày', 'ngu ngốc', 'lừa đảo', 'khốn nạn'];
        for (const word of commonBad) {
            const regex = buildSafeKeywordRegex(word);
            if (regex) {
                sanitized = sanitized.replace(regex, '***');
            }
        }
        return sanitized;
    } catch (e) {
        return text;
    }
}

/**
 * Ghi nhật ký kiểm toán vào chat_moderation_log
 */
async function logAuditAction(conversationId, customerId, actionTaken, auditNotes) {
    try {
        await supabase.from('chat_moderation_log').insert({
            conversation_id: conversationId || null,
            customer_id: customerId || null,
            action_taken: 'masked',
            detected_keywords: [`[AUDIT_${actionTaken.toUpperCase()}]`],
            violation_count: 0,
            notes: typeof auditNotes === 'string' ? auditNotes : JSON.stringify({ action: actionTaken, ...auditNotes })
        });
    } catch (err) {
        console.warn('[Audit Action] Lỗi ghi nhật ký kiểm toán:', err.message);
    }
}

/**
 * G4-01: Xem trước hành động (Action Preview)
 */
async function handleActionPreview(req, res, staffUser) {
    const { action_type, conversation_id, customer_id, params = {} } = req.body;

    if (!action_type) {
        return res.status(400).json({ error: 'Thiếu action_type cần xem trước.' });
    }

    const idempotencyKey = req.body.idempotency_key || crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    let previewSummary = '';
    let limits = {};

    if (action_type === 'point_compensate') {
        const pts = parseInt(params.points, 10);
        if (!pts || pts <= 0 || !Number.isInteger(pts)) {
            return res.status(400).json({ error: 'Số điểm bồi hoàn phải là số nguyên dương hợp lệ.' });
        }

        const isLeadOrAdmin = ['ADMIN', 'CSKH_LEAD', 'MANAGER'].includes(staffUser.system_role);
        const isCSKH = ['CSKH', 'RECEPTIONIST', 'STAFF'].includes(staffUser.system_role);
        const maxLimit = isLeadOrAdmin ? 200 : (isCSKH ? 50 : 0);
        limits = { max_allowed_points: maxLimit, staff_role: staffUser.system_role };

        if (pts > 200) {
            return res.status(400).json({
                error: 'Vượt hạn mức bồi hoàn D03 (> 200 điểm). Mức bồi hoàn trên 200 điểm bắt buộc phải lập Ticket khiếu nại để cấp Giám đốc phê duyệt.',
                limits
            });
        }

        if (pts > maxLimit) {
            return res.status(403).json({
                error: `Vượt hạn mức bồi hoàn của vai trò ${staffUser.system_role} (tối đa ${maxLimit} điểm theo quy định D03). Vui lòng chuyển cấp Quản lý hoặc lập Ticket.`,
                limits
            });
        }

        previewSummary = `Bồi hoàn +${pts} điểm Pawpoint cho khách hàng. Lý do: "${params.reason || 'Sự cố dịch vụ'}". Người xác nhận: ${staffUser.full_name} (${staffUser.system_role}).`;
    } else if (action_type === 'ticket_create') {
        const rawTitle = params.title || 'Khiếu nại từ kênh chat';
        const rawDesc = params.description || 'Khách hàng phản ánh vấn đề qua kênh chat trực tuyến.';
        const cleanTitle = await sanitizeText(rawTitle);
        const cleanDesc = await sanitizeText(rawDesc);

        previewSummary = `Lập phiếu hỗ trợ chính thức: "${cleanTitle}". Phân loại: ${params.category || 'service'} • Mức ưu tiên: ${params.priority || 'Trung bình'}. Nội dung đã qua kiểm duyệt màng lọc an toàn.`;
    } else if (action_type === 'handover_escalate') {
        previewSummary = `Chuyển ca hội thoại đến Quản lý / Chuyên viên cấp cao. Lý do: "${params.reason || 'Ca phức tạp'}". Trạng thái ca sẽ chuyển sang "Chờ tiếp nhận".`;
    } else if (action_type === 'internal_note') {
        previewSummary = `Ghi chú nội bộ cho ca hội thoại. Ghi chú này chỉ hiển thị với nhân sự nội bộ và không gửi cho khách hàng.`;
    } else {
        return res.status(400).json({ error: `Loại hành động không được hỗ trợ: ${action_type}` });
    }

    return res.status(200).json({
        ok: true,
        valid: true,
        action_type,
        preview_summary: previewSummary,
        params,
        limits,
        idempotency_key: idempotencyKey,
        expires_at: expiresAt,
        requires_confirmation: true
    });
}

/**
 * G4-03: Bồi hoàn Pawpoint có kiểm soát thẩm quyền D03
 */
async function handleCompensatePoints(req, res, staffUser) {
    const { isFeatureEnabled } = require('./chat_config.js');
    if (!isFeatureEnabled('points_action_enabled')) {
        return res.status(503).json({ error: 'Tính năng bồi hoàn điểm Pawpoint hiện đang tạm khóa bởi cấu hình hệ thống (G5-05).' });
    }

    const { conversation_id, customer_id: clientCustId, points: rawPoints, reason, idempotency_key } = req.body;

    const points = parseInt(rawPoints, 10);
    if (!points || points <= 0 || !Number.isInteger(points)) {
        return res.status(400).json({ error: 'Số điểm bồi hoàn phải là số nguyên dương hợp lệ.' });
    }

    // 1. Kiểm tra thẩm quyền D03
    const isLeadOrAdmin = ['ADMIN', 'CSKH_LEAD', 'MANAGER'].includes(staffUser.system_role);
    const isCSKH = ['CSKH', 'RECEPTIONIST', 'STAFF'].includes(staffUser.system_role);

    if (!isLeadOrAdmin && !isCSKH) {
        return res.status(403).json({ error: `Vai trò ${staffUser.system_role} không có thẩm quyền bồi hoàn điểm Pawpoint.` });
    }

    if (points > 200) {
        return res.status(400).json({
            error: 'Vượt hạn mức bồi hoàn D03 (> 200 điểm). Theo quy định D03, mức bồi hoàn trên 200 điểm bắt buộc phải lập Ticket khiếu nại để cấp Giám đốc phê duyệt.'
        });
    }

    if (isCSKH && points > 50) {
        return res.status(403).json({
            error: 'Vượt hạn mức bồi hoàn của Chuyên viên CSKH (tối đa 50 điểm/ca theo quy định D03). Vui lòng chuyển cấp Quản lý để bồi hoàn đến 200 điểm hoặc lập Ticket.'
        });
    }

    // 2. Chống thực hiện trùng lặp (Idempotency Key)
    if (idempotency_key && idempotencyCache.has(idempotency_key)) {
        const cached = idempotencyCache.get(idempotency_key);
        return res.status(200).json({ ...cached.data, is_replay: true });
    }

    // 3. Xác định khách hàng thực tế
    let targetCustomerId = clientCustId;
    if (!targetCustomerId && conversation_id) {
        const { data: conv } = await supabase
            .from('chat_conversation')
            .select('customer_id')
            .eq('id', conversation_id)
            .maybeSingle();
        targetCustomerId = conv?.customer_id;
    }

    if (!targetCustomerId) {
        return res.status(400).json({ error: 'Không tìm thấy khách hàng hợp lệ để bồi hoàn điểm (Khách vãng lai chưa có mã hồ sơ).' });
    }

    // 4. Lấy số dư và cập nhật customer_membership
    const { data: mem, error: memErr } = await supabase
        .from('customer_membership')
        .select('id, total_paw_points')
        .eq('customer_id', targetCustomerId)
        .maybeSingle();

    let currentPoints = 0;
    let newBalance = 0;

    if (!mem) {
        // Tạo mới bản ghi hội viên nếu chưa có
        newBalance = points;
        const { error: insMemErr } = await supabase
            .from('customer_membership')
            .insert({
                customer_id: targetCustomerId,
                total_paw_points: newBalance
            });
        if (insMemErr) {
            return res.status(500).json({ error: 'Không thể tạo bản ghi hội viên: ' + insMemErr.message });
        }
    } else {
        currentPoints = mem.total_paw_points || 0;
        newBalance = currentPoints + points;
        const { error: upMemErr } = await supabase
            .from('customer_membership')
            .update({ total_paw_points: newBalance })
            .eq('id', mem.id);
        if (upMemErr) {
            return res.status(500).json({ error: 'Không thể cập nhật số dư điểm: ' + upMemErr.message });
        }
    }

    // 5. Ghi sổ cái paw_point_transaction
    const reasonText = reason || 'Tạ lỗi và bồi hoàn sự cố dịch vụ';
    const txDescription = `[CSKH Bồi hoàn D03] ${reasonText} (Xác nhận bởi: ${staffUser.full_name})`;

    // Lấy quy tắc thưởng hợp lệ từ CSDL
    let rewardRuleId = '92222222-2222-2222-2222-222222222222';
    try {
        const { data: defaultRule } = await supabase
            .from('reward_rule')
            .select('id')
            .eq('is_active', true)
            .limit(1)
            .maybeSingle();
        if (defaultRule?.id) rewardRuleId = defaultRule.id;
    } catch (rErr) {
        // Fallback
    }

    const { data: tx, error: txErr } = await supabase
        .from('paw_point_transaction')
        .insert({
            customer_id: targetCustomerId,
            points: points,
            balance_after: newBalance,
            description: txDescription,
            reward_rule_id: rewardRuleId,
            created_at: new Date().toISOString()
        })
        .select()
        .single();

    if (txErr) {
        return res.status(500).json({ error: 'Không thể ghi nhận giao dịch điểm: ' + txErr.message });
    }

    // 6. Thông báo sự kiện hệ thống vào hội thoại (nếu có)
    if (conversation_id) {
        await supabase.from('chat_message').insert({
            conversation_id: conversation_id,
            sender_type: 'bot',
            sender_name: 'Hệ thống PawPal',
            content: `Hệ thống đã bồi hoàn +${points} điểm Pawpoint cho khách hàng (Xác nhận bởi: ${staffUser.full_name}).`,
            metadata: {
                is_system: true,
                action: 'point_compensate',
                points,
                balance_after: newBalance,
                transaction_id: tx.id
            }
        });
    }

    // 7. Ghi nhật ký kiểm toán (Audit Log)
    await logAuditAction(conversation_id, targetCustomerId, 'point_compensated', {
        points,
        balance_before: currentPoints,
        balance_after: newBalance,
        reason: reasonText,
        staff_id: staffUser.id,
        staff_name: staffUser.full_name,
        staff_role: staffUser.system_role,
        transaction_id: tx.id,
        idempotency_key
    });

    const resultPayload = {
        ok: true,
        transaction_id: tx.id,
        points: points,
        balance_after: newBalance,
        customer_id: targetCustomerId,
        idempotency_key
    };

    if (idempotency_key) {
        idempotencyCache.set(idempotency_key, { data: resultPayload, timestamp: Date.now() });
    }

    return res.status(200).json(resultPayload);
}

/**
 * G4-02: Tạo ticket từ hội thoại một cách nhất quán
 */
async function handleCreateTicket(req, res, staffUser) {
    const { isFeatureEnabled } = require('./chat_config.js');
    if (!isFeatureEnabled('ticket_action_enabled')) {
        return res.status(503).json({ error: 'Tính năng tạo phiếu hỗ trợ (Ticket) từ chat hiện đang tạm khóa bởi cấu hình hệ thống (G5-05).' });
    }

    const { conversation_id, customer_id: clientCustId, title: rawTitle, description: rawDesc, category, priority, ref_id, idempotency_key } = req.body;

    if (!rawTitle) {
        return res.status(400).json({ error: 'Tiêu đề ticket không được để trống.' });
    }

    // 1. Kiểm tra thẩm quyền tạo ticket
    const allowedRoles = ['ADMIN', 'CSKH_LEAD', 'CSKH', 'RECEPTIONIST', 'STAFF'];
    if (!allowedRoles.includes(staffUser.system_role)) {
        return res.status(403).json({ error: `Vai trò ${staffUser.system_role} không có thẩm quyền tạo phiếu hỗ trợ ticket.` });
    }

    // 2. Chống lặp giao dịch
    if (idempotency_key && idempotencyCache.has(idempotency_key)) {
        const cached = idempotencyCache.get(idempotency_key);
        return res.status(200).json({ ...cached.data, is_replay: true });
    }

    // 3. Làm sạch tiêu đề và mô tả (Loại bỏ từ ngữ thô tục/chửi bới khỏi tiêu đề ticket)
    const cleanTitle = await sanitizeText(rawTitle);
    const cleanDesc = await sanitizeText(rawDesc || rawTitle);

    // 4. Xác định mã người dùng / khách hàng
    let userId = clientCustId;
    let targetCustomerId = clientCustId;

    if (conversation_id) {
        const { data: conv } = await supabase
            .from('chat_conversation')
            .select('id, customer_id, session_token')
            .eq('id', conversation_id)
            .maybeSingle();

        if (conv) {
            targetCustomerId = conv.customer_id;
            userId = conv.customer_id || (conv.session_token ? `GUEST-${conv.session_token.slice(0, 8)}` : `GUEST-${conv.id.slice(0, 8)}`);
        }
    }

    if (!userId) {
        userId = `GUEST-${crypto.randomUUID().slice(0, 8)}`;
    }

    // 5. Chuẩn hóa phân loại và mức ưu tiên hợp lệ theo schema
    const validCategories = ['service', 'booking', 'payment', 'health', 'contact', 'other'];
    const validPriorities = ['Bình thường', 'Trung bình', 'Cao'];

    const cat = validCategories.includes(category) ? category : 'service';
    const pri = validPriorities.includes(priority) ? priority : 'Trung bình';

    // 6. Ghi bản ghi support_ticket
    const { data: ticket, error: ticketErr } = await supabase
        .from('support_ticket')
        .insert({
            user_id: String(userId),
            title: cleanTitle,
            type: cat,
            status: 'pending',
            priority: pri,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .select()
        .single();

    if (ticketErr || !ticket) {
        return res.status(500).json({ error: 'Không thể khởi tạo ticket trên CSDL: ' + (ticketErr?.message || 'Lỗi không xác định') });
    }

    // 7. Ghi nội dung khởi đầu vào support_ticket_message
    const initialContent = `[Chuyển từ Chat trực tuyến CSKH${ref_id ? ' • Tham chiếu: ' + ref_id : ''} • Ca chat: ${conversation_id || 'N/A'}]:\n${cleanDesc}`;
    await supabase.from('support_ticket_message').insert({
        ticket_id: ticket.id,
        sender_type: 'staff',
        agent_name: staffUser.full_name,
        content: initialContent,
        created_at: new Date().toISOString()
    });

    // 8. Đăng thông báo hệ thống vào hội thoại nếu có
    if (conversation_id) {
        await supabase.from('chat_message').insert({
            conversation_id: conversation_id,
            sender_type: 'bot',
            sender_name: 'Hệ thống PawPal',
            content: `Đã lập vé hỗ trợ / khiếu nại chính thức: #${ticket.id} (${cleanTitle}).`,
            metadata: {
                is_system: true,
                action: 'ticket_create',
                ticket_id: ticket.id,
                priority: pri,
                type: cat
            }
        });
    }

    // 9. Ghi nhật ký kiểm toán (Audit Log)
    await logAuditAction(conversation_id, targetCustomerId, 'ticket_created', {
        ticket_id: ticket.id,
        title: cleanTitle,
        category: cat,
        priority: pri,
        ref_id: ref_id || null,
        staff_id: staffUser.id,
        staff_name: staffUser.full_name,
        idempotency_key
    });

    const resultPayload = {
        ok: true,
        ticket_id: ticket.id,
        title: ticket.title,
        status: ticket.status,
        priority: ticket.priority,
        deep_link: '#tab-complaint-detail',
        idempotency_key
    };

    if (idempotency_key) {
        idempotencyCache.set(idempotency_key, { data: resultPayload, timestamp: Date.now() });
    }

    return res.status(200).json(resultPayload);
}

/**
 * G4-04: Ghi chú nội bộ cho ca chat
 */
async function handleAddInternalNote(req, res, staffUser) {
    const { conversation_id, note } = req.body;

    if (!conversation_id) {
        return res.status(400).json({ error: 'Thiếu conversation_id cần ghi chú.' });
    }
    if (note === undefined || note === null) {
        return res.status(400).json({ error: 'Nội dung ghi chú không được để trống.' });
    }

    const { data: conv, error: convErr } = await supabase
        .from('chat_conversation')
        .select('id, customer_id')
        .eq('id', conversation_id)
        .maybeSingle();

    if (convErr || !conv) {
        return res.status(404).json({ error: 'Không tìm thấy ca hội thoại.' });
    }

    const { error: upErr } = await supabase
        .from('chat_conversation')
        .update({
            internal_note: note,
            updated_at: new Date().toISOString()
        })
        .eq('id', conversation_id);

    if (upErr) {
        return res.status(500).json({ error: 'Không thể lưu ghi chú nội bộ: ' + upErr.message });
    }

    await logAuditAction(conversation_id, conv.customer_id, 'internal_note_added', {
        note_length: note.length,
        staff_id: staffUser.id,
        staff_name: staffUser.full_name
    });

    return res.status(200).json({
        ok: true,
        conversation_id,
        internal_note: note
    });
}

/**
 * G4-04: Chuyển ca / Chuyển cấp Quản lý (Handover / Escalation)
 */
async function handleHandoverManager(req, res, staffUser) {
    const { conversation_id, reason = 'Chuyển cấp xử lý ca phức tạp', target_role = 'CSKH_LEAD', is_urgent = false } = req.body;

    if (!conversation_id) {
        return res.status(400).json({ error: 'Thiếu conversation_id cần chuyển ca.' });
    }

    const { data: conv, error: convErr } = await supabase
        .from('chat_conversation')
        .select('id, customer_id, status')
        .eq('id', conversation_id)
        .maybeSingle();

    if (convErr || !conv) {
        return res.status(404).json({ error: 'Không tìm thấy ca hội thoại.' });
    }

    const urgencyFlag = Boolean(is_urgent || reason.toLowerCase().includes('khẩn') || reason.toLowerCase().includes('cấp cứu'));

    const { error: upErr } = await supabase
        .from('chat_conversation')
        .update({
            status: 'waiting_agent',
            assigned_staff_id: null,
            sentiment_trend: 'escalating',
            is_urgent: urgencyFlag,
            updated_at: new Date().toISOString()
        })
        .eq('id', conversation_id);

    if (upErr) {
        return res.status(500).json({ error: 'Không thể chuyển ca: ' + upErr.message });
    }

    // Gửi thông báo hệ thống vào hội thoại
    await supabase.from('chat_message').insert({
        conversation_id: conversation_id,
        sender_type: 'bot',
        sender_name: 'Hệ thống PawPal',
        content: `Ca hội thoại đã được chuyển tiếp đến Quản lý / Chuyên viên cấp cao (Lý do: ${reason}). Đang chờ tiếp nhận.`,
        metadata: {
            is_system: true,
            action: 'handover_escalate',
            target_role
        }
    });

    await logAuditAction(conversation_id, conv.customer_id, 'handover_escalated', {
        reason,
        target_role,
        is_urgent: urgencyFlag,
        staff_id: staffUser.id,
        staff_name: staffUser.full_name
    });

    return res.status(200).json({
        ok: true,
        conversation_id,
        status: 'waiting_agent',
        is_urgent: urgencyFlag
    });
}

/**
 * Điều phối chính cho các hành động Quản trị Chatbot
 */
async function dispatchChatAction(req, res) {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    const staffUser = await getStaffUser(authHeader);

    if (!staffUser) {
        return res.status(401).json({ error: 'Yêu cầu phiên đăng nhập nhân sự hợp lệ để thực hiện thao tác này.' });
    }

    const action = req.body?.action;

    switch (action) {
        case 'CHAT_ACTION_PREVIEW':
            return handleActionPreview(req, res, staffUser);
        case 'CHAT_COMPENSATE_POINTS':
            return handleCompensatePoints(req, res, staffUser);
        case 'CHAT_CREATE_TICKET':
            return handleCreateTicket(req, res, staffUser);
        case 'CHAT_ADD_INTERNAL_NOTE':
            return handleAddInternalNote(req, res, staffUser);
        case 'CHAT_HANDOVER_MANAGER':
            return handleHandoverManager(req, res, staffUser);
        default:
            return res.status(400).json({ error: `Hành động không xác định: ${action}` });
    }
}

module.exports = {
    dispatchChatAction,
    getStaffUser,
    sanitizeText,
    handleActionPreview,
    handleCompensatePoints,
    handleCreateTicket,
    handleAddInternalNote,
    handleHandoverManager
};
