require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const anonDb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const adminDb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testFullChatbotLifecycle() {
    console.log('=== BẮT ĐẦU KIỂM THỬ VÒNG ĐỜI CHATBOT & TRỰC CHAT LIVE CSDL ===\n');

    let testConvId = null;
    let custMsgId = null;
    let botMsgId = null;
    let staffMsgId = null;
    let testFaqId = null;
    let testCannedId = null;

    try {
        // Bước 1: Lấy khách hàng mẫu
        console.log('1. Lấy thông tin khách hàng mẫu...');
        const { data: customers } = await adminDb.from('customer').select('id, phone_main, customer_profile(full_name)').limit(1);
        const sampleCust = customers?.[0];
        const custId = sampleCust?.id || null;
        const custName = sampleCust?.customer_profile?.[0]?.full_name || 'Khách hàng QA';
        console.log(`   -> Khách hàng: ${custName} (ID: ${custId})`);

        // Bước 2: Tạo phiên hội thoại mới (chat_conversation)
        console.log('\n2. Khởi tạo phiên hội thoại mới (chat_conversation)...');
        const { data: conv, error: convErr } = await adminDb
            .from('chat_conversation')
            .insert([{
                customer_id: custId,
                status: 'bot_handling',
                sentiment_level: 3,
                sentiment_trend: 'stable',
                is_urgent: false,
                channel: 'web',
                ai_summary: '[QA Test] Khách hàng tìm hiểu về dịch vụ tiêm phòng cho chó con'
            }])
            .select()
            .single();
        if (convErr) throw convErr;
        testConvId = conv.id;
        console.log(`   -> Đã tạo phiên hội thoại ID: ${testConvId} | Trạng thái: ${conv.status}`);

        // Bước 3: Khách hàng gửi tin nhắn (chat_message - customer)
        console.log('\n3. Khách hàng gửi tin nhắn hỏi thông tin dịch vụ...');
        const { data: msg1, error: msg1Err } = await adminDb
            .from('chat_message')
            .insert([{
                conversation_id: testConvId,
                sender_type: 'customer',
                sender_name: custName,
                content: 'Chào PawPal, bé Poodle nhà mình 3 tháng tuổi thì nên tiêm những mũi nào trước ạ?',
                raw_content: 'Chào PawPal, bé Poodle nhà mình 3 tháng tuổi thì nên tiêm những mũi nào trước ạ?',
                is_toxic: false
            }])
            .select()
            .single();
        if (msg1Err) throw msg1Err;
        custMsgId = msg1.id;
        console.log(`   -> Đã ghi tin nhắn khách hàng ID: ${custMsgId}`);

        // Bước 4: Bot tự động phản hồi (chat_message - bot)
        console.log('\n4. Bot tự động phản hồi dựa trên kho tri thức...');
        const { data: msg2, error: msg2Err } = await adminDb
            .from('chat_message')
            .insert([{
                conversation_id: testConvId,
                sender_type: 'bot',
                sender_name: 'PawPal Bot',
                content: 'Dạ PawPal chào sen! Đối với bé cún 3 tháng tuổi, lịch tiêm chuẩn gồm vaccine mũi 2 hoặc mũi 3 (loại 7 bệnh) và vaccine dại theo phác đồ thú y ạ.',
                raw_content: 'Dạ PawPal chào sen! Đối với bé cún 3 tháng tuổi, lịch tiêm chuẩn gồm vaccine mũi 2 hoặc mũi 3 (loại 7 bệnh) và vaccine dại theo phác đồ thú y ạ.',
                is_toxic: false
            }])
            .select()
            .single();
        if (msg2Err) throw msg2Err;
        botMsgId = msg2.id;
        console.log(`   -> Đã ghi tin nhắn Bot ID: ${botMsgId}`);

        // Bước 5: Chuyên viên CSKH tiếp quản ca chat (Takeover)
        console.log('\n5. Chuyên viên CSKH tiếp quản phiên chat (Takeover)...');
        const { error: takeErr } = await adminDb
            .from('chat_conversation')
            .update({
                status: 'agent_handling',
                updated_at: new Date().toISOString()
            })
            .eq('id', testConvId);
        if (takeErr) throw takeErr;
        console.log('   -> Đã chuyển trạng thái hội thoại sang: agent_handling');

        // Bước 6: Chuyên viên CSKH gửi tin nhắn hỗ trợ trực tiếp
        console.log('\n6. Chuyên viên CSKH gửi tin nhắn hỗ trợ trực tiếp...');
        const { data: msg3, error: msg3Err } = await adminDb
            .from('chat_message')
            .insert([{
                conversation_id: testConvId,
                sender_type: 'staff',
                sender_name: 'Lê Lệ Quyên (CSKH)',
                content: 'Dạ em là Quyên - chuyên viên chăm sóc khách hàng PawPal. Em xin phép gửi sen bảng giá ưu đãi gói tiêm chủng trọn gói kèm tẩy giun cho bé nhé ạ!',
                raw_content: 'Dạ em là Quyên - chuyên viên chăm sóc khách hàng PawPal. Em xin phép gửi sen bảng giá ưu đãi gói tiêm chủng trọn gói kèm tẩy giun cho bé nhé ạ!',
                is_toxic: false
            }])
            .select()
            .single();
        if (msg3Err) throw msg3Err;
        staffMsgId = msg3.id;
        console.log(`   -> Đã ghi tin nhắn chuyên viên ID: ${staffMsgId}`);

        // Bước 7: Cập nhật ghi chú nội bộ và hoàn tất ca chat
        console.log('\n7. Cập nhật ghi chú nội bộ và hoàn tất ca chat...');
        const { error: noteErr } = await adminDb
            .from('chat_conversation')
            .update({
                internal_note: '[QA Note] Đã tư vấn gói vaccine 7 bệnh, khách hẹn mang bé qua chi nhánh Quận 1 vào sáng thứ 7.',
                status: 'resolved',
                sentiment_level: 2,
                updated_at: new Date().toISOString()
            })
            .eq('id', testConvId);
        if (noteErr) throw noteErr;
        console.log('   -> Cập nhật ghi chú nội bộ & trạng thái resolved thành công');

        // Bước 8: Kiểm thử quản lý Quy tắc FAQ (chatbot_knowledge_faq)
        console.log('\n8. Tạo và cập nhật câu hỏi FAQ trong kho tri thức...');
        const { data: newFaq, error: faqErr } = await adminDb
            .from('chatbot_knowledge_faq')
            .insert([{
                category: 'Dịch vụ y tế',
                question: '[QA Test] Mèo con bao nhiêu tuần tuổi thì có thể tiêm phòng?',
                answer: 'Mèo con từ 8-9 tuần tuổi có thể tiêm mũi vaccine đầu tiên phòng 4 bệnh cơ bản.',
                keywords: ['tiêm phòng mèo con', 'vaccine mèo', 'lịch tiêm'],
                priority: 1,
                is_active: true
            }])
            .select()
            .single();
        if (faqErr) throw faqErr;
        testFaqId = newFaq.id;
        console.log(`   -> Đã tạo câu FAQ ID: ${testFaqId}`);

        // Bước 9: Kiểm thử quản lý mẫu câu phản hồi nhanh (chatbot_canned_response)
        console.log('\n9. Tạo mẫu câu phản hồi nhanh (Canned response)...');
        const { data: newCanned, error: canErr } = await adminDb
            .from('chatbot_canned_response')
            .insert([{
                shortcut: '/qa_vac',
                title: '[QA Test] Bảng giá tiêm chủng',
                content: 'Dạ bảng giá vaccine 7 bệnh cho cún là 250.000đ/mũi đã bao gồm khám sàng lọc miễn phí ạ.',
                category: 'Tư vấn dịch vụ',
                usage_count: 0,
                is_active: true
            }])
            .select()
            .single();
        if (canErr) throw canErr;
        testCannedId = newCanned.id;
        console.log(`   -> Đã tạo mẫu câu ID: ${testCannedId} (Phím tắt: ${newCanned.shortcut})`);

        console.log('\n=== TẤT CẢ 9 BƯỚC KIỂM THỬ VÒNG ĐỜI CHATBOT ĐÃ HOÀN TOÀN THÀNH CÔNG! ===\n');

    } catch (err) {
        console.error('LỖI KIỂM THỬ CHATBOT:', err);
        process.exitCode = 1;
    } finally {
        console.log('10. Dọn dẹp dữ liệu kiểm thử (Clean up test data)...');
        if (testCannedId) {
            await adminDb.from('chatbot_canned_response').delete().eq('id', testCannedId);
            console.log(`   -> Đã xóa mẫu câu QA ID: ${testCannedId}`);
        }
        if (testFaqId) {
            await adminDb.from('chatbot_knowledge_faq').delete().eq('id', testFaqId);
            console.log(`   -> Đã xóa FAQ QA ID: ${testFaqId}`);
        }
        if (custMsgId || botMsgId || staffMsgId) {
            await adminDb.from('chat_message').delete().eq('conversation_id', testConvId);
            console.log(`   -> Đã xóa các tin nhắn của hội thoại ID: ${testConvId}`);
        }
        if (testConvId) {
            await adminDb.from('chat_conversation').delete().eq('id', testConvId);
            console.log(`   -> Đã xóa phiên hội thoại QA ID: ${testConvId}`);
        }
        console.log('   -> Hoàn tất dọn dẹp sạch sẽ!');
    }
}

testFullChatbotLifecycle();
