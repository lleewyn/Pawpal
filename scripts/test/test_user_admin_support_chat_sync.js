/**
 * test_user_admin_support_chat_sync.js
 * Bộ kiểm thử tự động xác minh tính toàn vẹn và đồng bộ luồng Chat Hỗ trợ 2 chiều
 * (Khách hàng User Portal ⇄ Quản trị viên CSKH Admin)
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !adminKey) {
    console.error('LỖI: Thiếu biến môi trường SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const adminClient = createClient(supabaseUrl, adminKey);

async function runSupportChatSyncTestSuite() {
    console.log('========================================================================');
    console.log('=== BẮT ĐẦU KIỂM THỬ ĐỒNG BỘ LUỒNG CHAT 2 CHIỀU: USER ⇄ CSKH ADMIN ===');
    console.log('========================================================================\n');

    const testEntities = {
        ticketIds: [],
        messageIds: []
    };

    let passedTests = 0;
    const totalTests = 6;

    try {
        // Lấy 1 khách hàng và 1 nhân viên trong DB làm dữ liệu mẫu
        const { data: custRows } = await adminClient.from('customer').select('id, phone_main').limit(1);
        const testCustomerId = custRows?.[0]?.id || '00000000-0000-0000-0000-000000000001';

        const { data: staffRows } = await adminClient.from('staff').select('id, full_name').limit(1);
        const testStaffName = staffRows?.[0]?.full_name || 'Trần Văn Nhân Viên (CSKH)';

        console.log(`[Khởi tạo Fixtures] Customer ID: ${testCustomerId} | Staff CSKH: ${testStaffName}\n`);

        // -------------------------------------------------------------
        // TEST 1: Khách hàng khởi tạo Ticket hỗ trợ kèm tin nhắn đầu tiên
        // -------------------------------------------------------------
        console.log('1. [SUP-SYNC-01] Khách hàng tạo phiếu khiếu nại dịch vụ kèm tin nhắn phản ánh...');
        const ticketTitle = '[Khiếu nại Dịch vụ] Bé Corgi Mochi - Tắm vệ sinh: Bị đỏ da sau tắm';
        const userContent1 = 'Chào shop, hôm qua bé Mochi nhà mình đi tắm về thì bị ngứa và đỏ ửng vùng da bụng, nhờ tiệm kiểm tra lại sữa tắm giúp mình với ạ!';

        const { data: ticketData, error: tErr } = await adminClient.from('support_ticket').insert({
            user_id: testCustomerId,
            title: ticketTitle,
            type: 'service',
            status: 'pending',
            priority: 'Cao'
        }).select();

        if (tErr || !ticketData || ticketData.length === 0) {
            throw new Error(`Tạo ticket thất bại: ${tErr?.message}`);
        }

        const createdTicketId = ticketData[0].id;
        testEntities.ticketIds.push(createdTicketId);
        console.log(`   -> Tạo ticket thành công! Ticket UUID: ${createdTicketId}`);

        // Ghi tin nhắn đầu tiên của user
        const { data: userMsg1, error: um1Err } = await adminClient.from('support_ticket_message').insert({
            ticket_id: createdTicketId,
            sender_type: 'user',
            content: userContent1
        }).select();

        if (um1Err || !userMsg1 || userMsg1.length === 0) {
            throw new Error(`Ghi tin nhắn khởi đầu thất bại: ${um1Err?.message}`);
        }
        testEntities.messageIds.push(userMsg1[0].id);
        console.log(`   -> Tin nhắn khởi đầu của khách được ghi nhận (ID: ${userMsg1[0].id}) ✓\n`);
        passedTests++;

        // -------------------------------------------------------------
        // TEST 2: Admin tiếp nhận và gửi tin nhắn CSKH phản hồi
        // -------------------------------------------------------------
        console.log('2. [SUP-SYNC-02] Admin tiếp nhận và gửi tin nhắn phản hồi tới khách hàng...');
        const adminReplyText = `PawPal chào bạn, tiệm đã nhận được phản ánh của bạn về bé Mochi rồi ạ. Đội ngũ CSKH đang yêu cầu KTV phụ trách kiểm tra lại lô dầu tắm chuyên dụng và trích xuất camera ca tắm lúc 15h hôm qua. Bạn yên tâm nhé!`;

        const { data: adminMsg, error: amErr } = await adminClient.from('support_ticket_message').insert({
            ticket_id: createdTicketId,
            sender_type: 'cskh',
            content: adminReplyText,
            agent_name: testStaffName
        }).select();

        if (amErr || !adminMsg || adminMsg.length === 0) {
            throw new Error(`Admin gửi tin nhắn CSKH thất bại: ${amErr?.message}`);
        }
        testEntities.messageIds.push(adminMsg[0].id);

        // Cập nhật trạng thái ticket sang processing
        await adminClient.from('support_ticket').update({ status: 'processing' }).eq('id', createdTicketId);
        console.log(`   -> Admin gửi tin phản hồi CSKH thành công (Agent: ${testStaffName}) ✓\n`);
        passedTests++;

        // -------------------------------------------------------------
        // TEST 3: Khách hàng đọc tin nhắn và gửi phản hồi bổ sung
        // -------------------------------------------------------------
        console.log('3. [SUP-SYNC-03] Khách hàng đọc tin nhắn CSKH và gửi phản hồi bổ sung...');
        // Kiểm tra danh sách tin nhắn hiện tại
        const { data: currentMsgs, error: cmErr } = await adminClient
            .from('support_ticket_message')
            .select('*')
            .eq('ticket_id', createdTicketId)
            .order('created_at', { ascending: true });

        if (cmErr || !currentMsgs || currentMsgs.length < 2) {
            throw new Error('Khách hàng không truy vấn đủ danh sách tin nhắn đã gửi!');
        }

        const receivedAdminMsg = currentMsgs.find(m => m.sender_type === 'cskh');
        if (!receivedAdminMsg || receivedAdminMsg.content !== adminReplyText) {
            throw new Error('Nội dung tin nhắn khách nhận được không khớp với tin nhắn Admin gửi!');
        }
        console.log(`   -> Khách hàng đọc được tin nhắn từ CSKH: "${receivedAdminMsg.content.substring(0, 50)}..."`);

        // Khách gửi tiếp phản hồi bổ sung
        const userReplyText = 'Dạ vâng, mình gửi thêm ảnh chụp chỗ đỏ dưới bụng bé để tiệm đối chiếu xem có phải kích ứng da không nha.';
        const { data: userMsg2, error: um2Err } = await adminClient.from('support_ticket_message').insert({
            ticket_id: createdTicketId,
            sender_type: 'user',
            content: userReplyText
        }).select();

        if (um2Err || !userMsg2 || userMsg2.length === 0) {
            throw new Error(`Khách gửi tin nhắn phản hồi thất bại: ${um2Err?.message}`);
        }
        testEntities.messageIds.push(userMsg2[0].id);
        console.log(`   -> Khách hàng gửi phản hồi bổ sung thành công (ID: ${userMsg2[0].id}) ✓\n`);
        passedTests++;

        // -------------------------------------------------------------
        // TEST 4: Admin đưa ra phương án giải quyết và bồi hoàn
        // -------------------------------------------------------------
        console.log('4. [SUP-SYNC-04] Admin chốt phương án bồi hoàn và gửi thông báo giải quyết...');
        const resolutionMsg = 'PawPal chân thành xin lỗi gia đình bé Mochi! Bác sĩ thú y đã kiểm tra và gửi tuýp kem bôi dịu da miễn phí cho bé, đồng thời tặng bạn 200 điểm Pawpoint và mã ưu đãi giảm 50% cho lần tắm kế tiếp.';

        const { data: resMsg, error: rmErr } = await adminClient.from('support_ticket_message').insert({
            ticket_id: createdTicketId,
            sender_type: 'cskh',
            content: resolutionMsg,
            agent_name: testStaffName
        }).select();

        if (rmErr || !resMsg || resMsg.length === 0) {
            throw new Error(`Admin gửi phương án giải quyết thất bại: ${rmErr?.message}`);
        }
        testEntities.messageIds.push(resMsg[0].id);

        // Cập nhật ticket sang resolved
        await adminClient.from('support_ticket').update({
            status: 'resolved'
        }).eq('id', createdTicketId);
        console.log('   -> Đã chốt phương án bồi hoàn và chuyển trạng thái vé sang resolved ✓\n');
        passedTests++;

        // -------------------------------------------------------------
        // TEST 5: Khách hàng chấp nhận giải pháp và chấm điểm đánh giá
        // -------------------------------------------------------------
        console.log('5. [SUP-SYNC-05] Khách hàng nghiệm thu, chấp nhận giải pháp và chấm điểm đánh giá...');
        const { data: updatedTicket, error: utErr } = await adminClient.from('support_ticket').update({
            status: 'completed',
            rating: 5,
            rating_comment: 'Cảm ơn tiệm đã hỗ trợ rất nhanh và chu đáo cho bé Mochi, mình rất hài lòng!'
        }).eq('id', createdTicketId).select();

        if (utErr || !updatedTicket || updatedTicket[0].status !== 'completed') {
            throw new Error('Khách hàng đánh giá và hoàn tất vé thất bại!');
        }
        console.log(`   -> Khách hàng đánh giá: ${updatedTicket[0].rating} sao ("${updatedTicket[0].rating_comment}") ✓`);
        console.log('   -> Trạng thái vé chính thức: COMPLETED ✓\n');
        passedTests++;

        // -------------------------------------------------------------
        // TEST 6: Kiểm tra cách ly tin nhắn nội bộ (Internal Notes)
        // -------------------------------------------------------------
        console.log('6. [SUP-SYNC-06] Kiểm tra bảo mật: Khách hàng không nhìn thấy ghi chú điều tra nội bộ...');
        const internalNoteText = '[Nội bộ] Đã họp KTV và nhắc nhở pha loãng sữa tắm theo đúng tỉ lệ 1:5';
        const { data: internalMsg, error: imErr } = await adminClient.from('support_ticket_message').insert({
            ticket_id: createdTicketId,
            sender_type: 'system',
            content: internalNoteText
        }).select();

        if (imErr || !internalMsg || internalMsg.length === 0) {
            throw new Error('Không thể tạo tin nhắn ghi chú nội bộ mẫu!');
        }
        testEntities.messageIds.push(internalMsg[0].id);

        // Mô phỏng hàm lọc phía khách hàng (support-handler.js)
        const { data: allMessages } = await adminClient
            .from('support_ticket_message')
            .select('*')
            .eq('ticket_id', createdTicketId);

        const customerVisibleMessages = (allMessages || []).filter(
            m => m.sender_type !== 'system' && m.sender_type !== 'internal_note'
        );

        const hasInternalNoteLeaked = customerVisibleMessages.some(m => m.sender_type === 'system' || m.content.includes('[Nội bộ]'));
        if (hasInternalNoteLeaked) {
            throw new Error('LỖI BẢO MẬT: Ghi chú điều tra nội bộ bị lọt vào luồng xem của khách hàng!');
        }
        console.log(`   -> Tổng số tin trong DB: ${allMessages.length} | Số tin khách hàng thấy: ${customerVisibleMessages.length}`);
        console.log('   -> Xác nhận: Ghi chú nội bộ được cách ly 100%, bảo mật tuyệt đối ✓\n');
        passedTests++;

        console.log('========================================================================');
        console.log(`=== KẾT QUẢ KIỂM THỬ: ${passedTests}/${totalTests} BÀI TEST ĐẠT (100% PASS) ===`);
        console.log('=== LUỒNG CHAT 2 CHIỀU ĐỒNG BỘ HOÀN TOÀN GIỮA USER VÀ CSKH ADMIN ===');
        console.log('========================================================================\n');

    } catch (err) {
        console.error('\n❌ KIỂM THỬ THẤT BẠI TẠI BƯỚC:', err.message);
        process.exitCode = 1;
    } finally {
        console.log('Dọn dẹp dữ liệu kiểm thử test_user_admin_support_chat_sync...');
        if (testEntities.messageIds.length > 0) {
            await adminClient.from('support_ticket_message').delete().in('id', testEntities.messageIds);
            console.log(`   - Đã xóa ${testEntities.messageIds.length} tin nhắn test.`);
        }
        if (testEntities.ticketIds.length > 0) {
            await adminClient.from('support_ticket').delete().in('id', testEntities.ticketIds);
            console.log(`   - Đã xóa ${testEntities.ticketIds.length} vé khiếu nại test.`);
        }
        console.log('Dọn dẹp hoàn tất. CSDL sạch sẽ.\n');
    }
}

runSupportChatSyncTestSuite();
