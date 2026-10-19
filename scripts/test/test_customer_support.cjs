const test = require('node:test');
const assert = require('node:assert/strict');
const { createCustomerSupportService } = require('../api/customer_support');

const TICKET_ID = '10000000-0000-4000-8000-000000000001';

function fixture({ owner = true, closed = false, insertError = null, updateError = null } = {}) {
    const writes = [];
    const admin = {
        from(table) {
            if (table === 'support_ticket_message') {
                return {
                    insert(rows) {
                        writes.push({ table, rows });
                        return { select() { return { async single() { return { data: { id: 'message-1', ...rows[0] }, error: insertError }; } }; } };
                    }
                };
            }
            return {
                select() { return this; }, eq() { return this; },
                async maybeSingle() { return { data: owner ? { id: TICKET_ID, status: closed ? 'completed' : 'pending' } : null, error: null }; },
                update(values) { writes.push({ table, values }); return { eq() { return this; }, then(resolve) { return Promise.resolve({ error: updateError }).then(resolve); } }; }
            };
        }
    };
    return { service: createCustomerSupportService(admin), writes };
}

test('ghi phản hồi User vào CSDL và chuyển phiếu sang đang xử lý', async () => {
    const { service, writes } = fixture();
    const message = await service.reply('customer-1', { ticketId: TICKET_ID, content: '  Tôi bổ sung thông tin.  ' });
    assert.equal(message.content, 'Tôi bổ sung thông tin.');
    assert.equal(writes[0].rows[0].sender_type, 'user');
    assert.equal(writes[1].values.status, 'processing');
});

test('không ghi phản hồi cho phiếu của tài khoản khác', async () => {
    const { service, writes } = fixture({ owner: false });
    await assert.rejects(() => service.reply('customer-1', { ticketId: TICKET_ID, content: 'Nội dung' }), /không thuộc tài khoản/);
    assert.equal(writes.length, 0);
});

test('trả lỗi thật khi CSDL không ghi được tin nhắn', async () => {
    const { service } = fixture({ insertError: new Error('DB rejected') });
    await assert.rejects(() => service.reply('customer-1', { ticketId: TICKET_ID, content: 'Nội dung' }), /DB rejected/);
});

test('không nhận thêm phản hồi khi phiếu đã đóng', async () => {
    const { service } = fixture({ closed: true });
    await assert.rejects(() => service.reply('customer-1', { ticketId: TICKET_ID, content: 'Nội dung' }), /đã đóng/);
});
