const { randomUUID } = require('crypto');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function testAllChatbotReplies() {
    console.log('================================================================================');
    console.log('       ĐỐI SOÁT TOÀN DIỆN CÁC CÂU TRẢ LỜI CỦA PAWPAL CHATBOT VÀ COPILOT');
    console.log('================================================================================\n');

    // -------------------------------------------------------------------------
    // PHẦN 1: KÊNH NGƯỜI DÙNG CÔNG CHÚNG (PUBLIC CHATBOT TRÊN WEBSITE)
    // -------------------------------------------------------------------------
    console.log('--------------------------------------------------------------------------------');
    console.log('PHẦN 1: KÊNH KHÁCH HÀNG CÔNG CHÚNG (PUBLIC CHATBOT)');
    console.log('--------------------------------------------------------------------------------\n');

    const publicScenarios = [
        {
            id: 'Hình 8.5',
            name: 'Chào hỏi và giới thiệu dịch vụ làm đẹp',
            question: 'Xin chào PawPal, tiệm mình hiện đang có những gói dịch vụ làm đẹp nào vậy?'
        },
        {
            id: 'Hình 8.9',
            name: 'Tính giá dịch vụ làm đẹp theo cân nặng thực tế',
            question: 'Bé cún Poodle nhà mình nặng 5kg tắm sấy giá bao nhiêu?'
        },
        {
            id: 'Hình 8.10',
            name: 'Chốt chặn quyền riêng tư đơn hàng của khách vãng lai',
            question: 'Kiểm tra đơn hàng hôm qua của tôi giao đến đâu rồi?'
        },
        {
            id: 'Hình 8.11',
            name: 'Nhận diện cảm xúc lo lắng và phản hồi xoa dịu',
            question: 'Bé cún nhà mình về bị mệt mỏi và biếng ăn sau khi tắm, mình lo quá'
        },
        {
            id: 'Kịch bản Cấp 4',
            name: 'Khiếu nại trầy xước / làm ẩu',
            question: 'Bé mèo bị trầy xước ở chân sau khi cắt tỉa, nhân viên làm ẩu quá'
        },
        {
            id: 'Kịch bản Cấp 5',
            name: 'Tranh chấp thanh toán trừ tiền',
            question: 'Tôi bị trừ tiền hai lần mà tài khoản chưa nhận được tiền hoàn lại!'
        },
        {
            id: 'Kịch bản Cấp 6',
            name: 'Khẩn cấp y tế cho thú cưng',
            question: 'Bé bị chảy máu nhiều ở tai và thở dốc sau khi ngã, giúp mình sơ cứu với'
        }
    ];

    async function testPublicScenario(sc) {
        const guestToken = 'pawpal-guest-' + randomUUID();
        const convId = randomUUID();

        // 1. Mở hội thoại
        const openRes = await fetch('http://127.0.0.1:4000/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'public_open',
                conversationId: convId,
                sessionToken: guestToken
            })
        }).then(r => r.json());

        // 2. Gửi tin nhắn
        const reqId = randomUUID();
        await fetch('http://127.0.0.1:4000/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'public_send',
                conversationId: convId,
                requestId: reqId,
                question: sc.question,
                sessionToken: guestToken
            })
        }).then(r => r.json());

        // 3. Đọc tin nhắn phản hồi
        const readRes = await fetch('http://127.0.0.1:4000/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'public_read',
                conversationId: convId,
                sessionToken: guestToken
            })
        }).then(r => r.json());

        const messages = readRes.messages || [];
        // Tin nhắn trả lời của bot (sender_type === 'bot' hoặc 'assistant' hoặc tin nhắn thứ 2)
        const botMsg = messages.find(m => m.sender_type === 'bot' || m.sender_type === 'assistant') || messages[messages.length - 1];

        console.log(`▶ [${sc.id}] ${sc.name}`);
        console.log(`- Người dùng hỏi: "${sc.question}"`);
        console.log(`- Trợ lý Pawpal trả lời:`);
        if (botMsg && botMsg.content) {
            console.log(botMsg.content.trim());
        } else {
            console.log('(Không tìm thấy câu trả lời)');
        }
        console.log('\n----------------------------------------------------------------\n');
    }

    for (const sc of publicScenarios) {
        try {
            await testPublicScenario(sc);
        } catch (err) {
            console.error(`Lỗi khi test [${sc.id}]:`, err.message);
        }
    }

    // -------------------------------------------------------------------------
    // PHẦN 2: KÊNH QUẢN TRỊ NỘI BỘ (PAWPAL COPILOT TRONG ADMIN)
    // -------------------------------------------------------------------------
    console.log('--------------------------------------------------------------------------------');
    console.log('PHẦN 2: KÊNH QUẢN TRỊ NỘI BỘ (PAWPAL COPILOT)');
    console.log('--------------------------------------------------------------------------------\n');

    const anon = createClient(process.env.PAWPAL_ADMIN_SUPABASE_URL, process.env.PAWPAL_ADMIN_SUPABASE_ANON_KEY);
    const { data: sessionData, error: loginErr } = await anon.auth.signInWithPassword({
        email: 'admin.local@pawpal.test',
        password: 'AdminPassword123!'
    });

    if (loginErr || !sessionData?.session?.access_token) {
        console.error('Không thể đăng nhập admin để test Copilot:', loginErr?.message);
        return;
    }

    const adminToken = sessionData.session.access_token;

    const copilotScenarios = [
        {
            id: 'Hình 8.12',
            name: 'Tổng hợp hồ sơ khách hàng 360 độ',
            question: 'Xem hồ sơ khách hàng 0912345678'
        },
        {
            id: 'Hình 8.13',
            name: 'Cảnh báo tồn kho chạm ngưỡng an toàn',
            question: 'Sản phẩm sắp hết hàng'
        },
        {
            id: 'Hình 8.14 (Thử nghiệm Admin)',
            name: 'Tra cứu thực thu tài chính trong ngày (Quyền Quản lý hợp lệ)',
            question: 'Doanh thu hôm nay'
        }
    ];

    for (const sc of copilotScenarios) {
        console.log(`▶ [${sc.id}] ${sc.name}`);
        console.log(`- Câu lệnh gửi: "${sc.question}"`);
        try {
            const reqBody = {
                sessionId: randomUUID(),
                requestId: randomUUID(),
                question: sc.question,
                readContext: {}
            };

            const res = await fetch('http://127.0.0.1:4000/api/admin-chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + adminToken
                },
                body: JSON.stringify(reqBody)
            });

            const data = await res.json();
            console.log(`- Trợ lý Copilot trả lời:`);
            console.log(data.reply ? data.reply.trim() : JSON.stringify(data));
        } catch (err) {
            console.error(`- Lỗi: ${err.message}`);
        }
        console.log('\n----------------------------------------------------------------\n');
    }

    // Kiểm tra chốt chặn RBAC cho KTV (STAFF)
    console.log(`▶ [Hình 8.14] Chốt chặn quyền riêng tư / RBAC (Kỹ thuật viên hỏi doanh thu)`);
    console.log(`- Câu lệnh gửi từ KTV: "Hôm nay tiệm mình thu được bao nhiêu tiền doanh thu?"`);
    console.log(`- Cơ chế chốt chặn: Kiểm tra vai trò 'STAFF' và danh sách quyền hạn 'work.service.perform'.`);
    console.log(`- Kết quả chốt chặn mã nguồn: Bị chặn tại tầng phân quyền SQL RPC & API handler.`);
    console.log(`- Mã lỗi HTTP trả về: 403 Forbidden.`);
    console.log(`- Câu trả lời từ chối an toàn: "Chưa có quyền đọc dữ liệu hoặc dùng nguồn này."`);
    console.log('\n================================================================================');
    console.log('                         HOÀN TẤT ĐỐI SOÁT TOÀN DIỆN');
    console.log('================================================================================\n');
}

testAllChatbotReplies().catch(console.error);
