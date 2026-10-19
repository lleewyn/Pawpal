const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function createCustomerSupportService(admin) {
    return {
        async reply(customerId, payload = {}) {
            const ticketId = String(payload.ticketId || '').trim();
            const content = String(payload.content || '').trim();
            if (!UUID_PATTERN.test(ticketId)) throw new Error('Không xác định được phiếu hỗ trợ để gửi phản hồi.');
            if (!content) throw new Error('Vui lòng nhập nội dung phản hồi.');
            if (content.length > 3000) throw new Error('Nội dung phản hồi không được vượt quá 3000 ký tự.');

            const ticketResult = await admin
                .from('support_ticket')
                .select('id,status')
                .eq('id', ticketId)
                .eq('user_id', customerId)
                .maybeSingle();
            if (ticketResult.error) throw ticketResult.error;
            if (!ticketResult.data) throw new Error('Phiếu hỗ trợ không tồn tại hoặc không thuộc tài khoản này.');
            if (['completed', 'closed'].includes(String(ticketResult.data.status || '').toLowerCase())) {
                throw new Error('Phiếu hỗ trợ đã đóng nên không thể nhận thêm phản hồi.');
            }

            const messageResult = await admin.from('support_ticket_message').insert([{
                ticket_id: ticketId,
                sender_type: 'user',
                content
            }]).select('id,ticket_id,sender_type,content,created_at').single();
            if (messageResult.error) throw messageResult.error;

            const ticketUpdate = await admin.from('support_ticket')
                .update({ status: 'processing', updated_at: new Date().toISOString() })
                .eq('id', ticketId)
                .eq('user_id', customerId);
            if (ticketUpdate.error) throw ticketUpdate.error;

            return messageResult.data;
        }
    };
}

module.exports = { createCustomerSupportService, UUID_PATTERN };
