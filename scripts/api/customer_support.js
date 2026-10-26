const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function createCustomerSupportService(client) {
    return {
        async reply(customerId, payload = {}) {
            const ticketId = String(payload.ticketId || '').trim();
            const requestId = String(payload.requestId || '').trim();
            const content = String(payload.content || '').trim();
            if (!UUID_PATTERN.test(ticketId)) throw new Error('Không xác định được phiếu hỗ trợ để gửi phản hồi.');
            if (!customerId || !UUID_PATTERN.test(requestId)) throw new Error('Vui lòng giữ mã yêu cầu hợp lệ để gửi hoặc thử lại phản hồi.');
            if (!content) throw new Error('Vui lòng nhập nội dung phản hồi.');
            if (content.length > 4000) throw new Error('Nội dung phản hồi không được vượt quá 4000 ký tự.');

            // Use the caller JWT: ownership, closed state and idempotency are atomic in DB.
            const result = await client.rpc('reply_own_support_ticket', {p_id: requestId, p_ticket: ticketId, p_content: content});
            if (result.error) {
                const messages = {support_owner_required:'Phiếu hỗ trợ không tồn tại hoặc không thuộc tài khoản này.',
                    support_reply_closed:'Phiếu hỗ trợ đã đóng nên không thể nhận thêm phản hồi.',
                    support_reply_conflict:'Mã yêu cầu đã được dùng cho phản hồi khác. Vui lòng kiểm tra lại.'};
                throw new Error(messages[result.error.message] || result.error.message || 'Không thể lưu phản hồi.');
            }
            if (result.data !== requestId) throw new Error('Chưa xác nhận được phản hồi đã lưu. Vui lòng kiểm tra trước khi thử lại.');
            return {id: requestId, ticket_id: ticketId, sender_type: 'customer', content};
        }
    };
}

module.exports = { createCustomerSupportService, UUID_PATTERN };
