require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const adminDb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testFullComplaintsLifecycle() {
    console.log('=== BẮT ĐẦU KIỂM THỬ VÒNG ĐỜI KHIẾU NẠI (COMPLAINTS LIFECYCLE) ===\n');

    let createdTicketId = null;

    try {
        // Lấy nhân sự CSKH phụ trách từ CSDL
        const { data: staffList } = await adminDb.from('staff').select('id, full_name').limit(1);
        const assignedStaff = staffList && staffList.length > 0 ? staffList[0] : null;

        // Bước 1: Tiếp nhận khiếu nại (Create ticket)
        console.log('1. Thao tác Tiếp nhận khiếu nại mới...');
        const { data: ticket, error: tErr } = await adminDb.from('support_ticket').insert([{
            title: '[QA Test Fixture] Bé bị trầy xước tai sau ca Spa',
            type: 'service',
            priority: 'Cao',
            status: 'pending'
        }]).select().single();
        if (tErr) throw tErr;
        createdTicketId = ticket.id;
        console.log('   -> Đã tạo ticket:', ticket.id, '| Trạng thái:', ticket.status);

        // Bước 2: Khách hàng gửi phản ánh ban đầu (Initial message)
        console.log('2. Lưu tin nhắn phản ánh ban đầu của khách hàng...');
        const { data: msg1, error: m1Err } = await adminDb.from('support_ticket_message').insert([{
            ticket_id: createdTicketId,
            sender_type: 'user',
            content: 'Bé cưng Corgi nhà mình sau khi tắm sấy về phát hiện có vết rớm máu ở vành tai trái.'
        }]).select().single();
        if (m1Err) throw m1Err;
        console.log('   -> Đã lưu tin nhắn ID:', msg1.id);

        // Bước 3: Phân công nhân sự phụ trách (Assign handler)
        console.log('3. Chuyển người phụ trách xử lý (Assign handler)...');
        const agentName = assignedStaff?.full_name || 'Lê Lê Quyên (CSKH)';
        const { data: msg2, error: m2Err } = await adminDb.from('support_ticket_message').insert([{
            ticket_id: createdTicketId,
            sender_type: 'cskh',
            agent_name: agentName,
            content: `[Phân công] Chuyển giao chuyên viên ${agentName} kiểm tra lại camera ca trực.`
        }]).select().single();
        if (m2Err) throw m2Err;

        const { error: sUpdateErr } = await adminDb.from('support_ticket').update({
            status: 'processing',
            updated_at: new Date().toISOString()
        }).eq('id', createdTicketId);
        if (sUpdateErr) throw sUpdateErr;
        console.log('   -> Đã cập nhật trạng thái sang processing, Phụ trách:', agentName);

        // Bước 4: Yêu cầu bổ sung thông tin (Request more info)
        console.log('4. Gửi yêu cầu bổ sung thông tin phản ánh...');
        const { data: msg3, error: m3Err } = await adminDb.from('support_ticket_message').insert([{
            ticket_id: createdTicketId,
            sender_type: 'cskh',
            agent_name: agentName,
            content: '[Zalo OA] Dạ PawPal chào chị, chị chụp giúp em ảnh cận cảnh vành tai của bé để bác sĩ phòng khám sơ cứu từ xa nhé ạ.'
        }]).select().single();
        if (m3Err) throw m3Err;

        const { error: sWaitErr } = await adminDb.from('support_ticket').update({
            status: 'waiting_customer',
            updated_at: new Date().toISOString()
        }).eq('id', createdTicketId);
        if (sWaitErr) throw sWaitErr;
        console.log('   -> Đã cập nhật trạng thái sang waiting_customer');

        // Bước 5: Giải quyết khiếu nại (Resolve ticket)
        console.log('5. Chọn phương án giải quyết và hoàn tất khiếu nại...');
        const { data: msg4, error: m4Err } = await adminDb.from('support_ticket_message').insert([{
            ticket_id: createdTicketId,
            sender_type: 'cskh',
            agent_name: agentName,
            content: '[Giải quyết] Đã đưa bé đến phòng khám đối tác bôi thuốc sát trùng, miễn phí 100% chi phí và gửi tặng Voucher PAWPALCARE50 trị giá 50.000đ bồi hoàn.'
        }]).select().single();
        if (m4Err) throw m4Err;

        const { data: resolvedTicket, error: sResErr } = await adminDb.from('support_ticket').update({
            status: 'completed',
            rating: 5,
            rating_comment: 'Rất hài lòng với sự tận tâm xử lý của PawPal',
            updated_at: new Date().toISOString()
        }).eq('id', createdTicketId).select().single();
        if (sResErr) throw sResErr;
        console.log('   -> Đã hoàn tất ticket. Status:', resolvedTicket.status, '| Rating:', resolvedTicket.rating);

        // Bước 6: Truy vấn đối soát dữ liệu (Verification)
        console.log('6. Truy vấn đối chiếu toàn bộ dữ liệu ticket và timeline...');
        const { data: verifiedTicket, error: vErr } = await adminDb.from('support_ticket').select('*').eq('id', createdTicketId).single();
        if (vErr) throw vErr;
        const { data: verifiedMsgs, error: vmErr } = await adminDb.from('support_ticket_message').select('*').eq('ticket_id', createdTicketId).order('created_at', { ascending: true });
        if (vmErr) throw vmErr;

        console.log('   -> Tiêu đề:', verifiedTicket.title);
        console.log('   -> Trạng thái cuối:', verifiedTicket.status);
        console.log('   -> Tổng số bản ghi timeline:', verifiedMsgs.length);
        verifiedMsgs.forEach((m, idx) => {
            console.log('      [' + (idx + 1) + '] (' + m.sender_type + (m.agent_name ? ' - ' + m.agent_name : '') + '): ' + m.content.substring(0, 70));
        });

        console.log('\n=== KẾT QUẢ KIỂM THỬ: TẤT CẢ 6 BƯỚC ĐẠT THÀNH CÔNG 100% ===');

    } catch (err) {
        console.error('LỖI TRONG QUÁ TRÌNH KIỂM THỬ KHIẾU NẠI:', err);
        process.exitCode = 1;
    } finally {
        // QA-P0-04: Bảo đảm dọn dẹp sạch sẽ trong finally block
        if (createdTicketId) {
            console.log('\n7. Dọn dẹp dữ liệu kiểm thử (Finally Cleanup)...');
            await adminDb.from('support_ticket_message').delete().eq('ticket_id', createdTicketId);
            await adminDb.from('support_ticket').delete().eq('id', createdTicketId);
            console.log('   -> Đã dọn dẹp ticket QA và tin nhắn liên quan:', createdTicketId);
        }
    }
}

testFullComplaintsLifecycle().catch(err => {
    console.error('LỖI KHÔNG XỬ LÝ ĐƯỢC:', err);
    process.exit(1);
});
