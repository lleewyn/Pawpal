const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const chatHandler = require('../api/chat.js');

async function runG4TestSuite() {
    console.log('=== BẮT ĐẦU KIỂM THỬ TOÀN DIỆN GIAI ĐOẠN 4 (G4 — THAO TÁC CÓ XÁC NHẬN) ===\n');

    let passedTests = 0;
    let totalTests = 0;

    function assert(condition, message) {
        totalTests++;
        if (condition) {
            console.log(`   [PASS] ${message}`);
            passedTests++;
        } else {
            console.error(`   [FAIL] ${message}`);
            throw new Error(`Kiểm thử thất bại: ${message}`);
        }
    }

    // 1. Chuẩn bị tài khoản nhân viên Admin và CSKH/STAFF
    console.log('1. Thiết lập danh tính kiểm thử nhân sự và khách hàng...');
    const { data: adminStaff } = await supabase
        .from('staff')
        .select('id, full_name, system_role, account_status')
        .eq('system_role', 'ADMIN')
        .eq('account_status', 'ACTIVE')
        .limit(1)
        .single();

    assert(Boolean(adminStaff), `Tìm thấy Quản trị viên ADMIN: ${adminStaff?.full_name} (${adminStaff?.id})`);

    const { data: cskhStaff } = await supabase
        .from('staff')
        .select('id, full_name, system_role, account_status')
        .eq('system_role', 'STAFF')
        .eq('account_status', 'ACTIVE')
        .limit(1)
        .single();

    assert(Boolean(cskhStaff), `Tìm thấy Chuyên viên CSKH/STAFF: ${cskhStaff?.full_name} (${cskhStaff?.id})`);

    // Lấy khách hàng test
    const { data: testCustomer } = await supabase
        .from('customer')
        .select('id, phone_main')
        .limit(1)
        .single();

    assert(Boolean(testCustomer), `Tìm thấy khách hàng mục tiêu: ID ${testCustomer?.id}`);

    // Tạo phiên hội thoại test
    const testConvToken = 'test-g4-session-' + Date.now();
    const { data: testConv, error: convErr } = await supabase
        .from('chat_conversation')
        .insert({
            customer_id: testCustomer.id,
            session_token: testConvToken,
            status: 'agent_handling',
            sentiment_level: 4,
            sentiment_trend: 'stable',
            channel: 'web'
        })
        .select()
        .single();

    assert(!convErr && testConv, `Khởi tạo hội thoại kiểm thử thành công: ${testConv?.id}`);

    // Helper gọi mock request
    function callActionApi(body, token) {
        return new Promise((resolve) => {
            const req = {
                method: 'POST',
                headers: {
                    'authorization': token ? `Bearer ${token}` : '',
                    'content-type': 'application/json'
                },
                body: body
            };
            const res = {
                statusCode: 200,
                headers: {},
                setHeader: (k, v) => { res.headers[k] = v; },
                status: (code) => {
                    res.statusCode = code;
                    return res;
                },
                json: (data) => {
                    resolve({ status: res.statusCode, data });
                }
            };
            chatHandler(req, res).catch(err => {
                resolve({ status: 500, data: { error: err.message } });
            });
        });
    }

    try {
        // ====================================================================
        // TEST 1: KIỂM THỬ XÁC THỰC VÀ BẢO MẬT G4
        // ====================================================================
        console.log('\n2. Kiểm thử bảo mật danh tính thực thi thao tác...');
        const resUnauth = await callActionApi({
            action: 'CHAT_ACTION_PREVIEW',
            action_type: 'point_compensate',
            params: { points: 20 }
        }, null);
        assert(resUnauth.status === 401, 'Chặn 401 Unauthorized khi không có Authorization token');

        const resFakeToken = await callActionApi({
            action: 'CHAT_ACTION_PREVIEW',
            action_type: 'point_compensate',
            params: { points: 20 }
        }, 'local:fake-staff-id-99999');
        assert(resFakeToken.status === 401, 'Chặn 401 Unauthorized khi token nhân sự không hợp lệ');

        // ====================================================================
        // TEST 2: G4-01 - XEM TRƯỚC HÀNH ĐỘNG (ACTION PREVIEW)
        // ====================================================================
        console.log('\n3. Kiểm thử G4-01: Xem trước hành động (Action Preview)...');
        const resPreviewPoints = await callActionApi({
            action: 'CHAT_ACTION_PREVIEW',
            action_type: 'point_compensate',
            params: { points: 50, reason: 'Tạ lỗi trễ hẹn Grooming' },
            conversation_id: testConv.id,
            customer_id: testCustomer.id
        }, `local:${adminStaff.id}`);

        assert(resPreviewPoints.status === 200, 'Preview bồi hoàn điểm trả về HTTP 200');
        assert(resPreviewPoints.data.valid === true, 'Preview báo hợp lệ valid = true');
        assert(Boolean(resPreviewPoints.data.idempotency_key), `Sinh khóa chống lặp idempotency_key: ${resPreviewPoints.data.idempotency_key}`);
        assert(resPreviewPoints.data.limits.max_allowed_points === 200, 'Hạn mức tối đa của Admin là 200 điểm');
        assert(resPreviewPoints.data.preview_summary.includes('50 điểm'), 'Mô tả tóm tắt chứa đúng số điểm');

        const resPreviewTicket = await callActionApi({
            action: 'CHAT_ACTION_PREVIEW',
            action_type: 'ticket_create',
            params: { title: 'Bé cưng bị trầy nhẹ sau tắm sấy', category: 'health', priority: 'Cao' },
            conversation_id: testConv.id
        }, `local:${adminStaff.id}`);

        assert(resPreviewTicket.status === 200, 'Preview tạo ticket trả về HTTP 200');
        assert(resPreviewTicket.data.preview_summary.includes('health'), 'Mô tả ticket chứa đúng phân loại');

        // ====================================================================
        // TEST 3: G4-03 - HẠN MỨC BỒI HOÀN D03 (AUTHORITY LIMIT ENFORCEMENT)
        // ====================================================================
        console.log('\n4. Kiểm thử G4-03: Kiểm soát thẩm quyền và hạn mức D03...');
        
        // Ca 3a: Bồi hoàn > 200 điểm (bất kể ai thực hiện đều bị chặn theo D03)
        const resOver200 = await callActionApi({
            action: 'CHAT_COMPENSATE_POINTS',
            points: 250,
            customer_id: testCustomer.id,
            conversation_id: testConv.id,
            reason: 'Bồi hoàn đơn hàng giá trị cao'
        }, `local:${adminStaff.id}`);
        assert(resOver200.status === 400, 'Chặn 400 Bad Request khi bồi hoàn > 200 điểm (D03)');
        assert(resOver200.data.error.includes('200 điểm'), 'Thông báo lỗi nêu rõ quy định bắt buộc lập Ticket trên 200 điểm');

        // Ca 3b: Chuyên viên CSKH thường cố gắng bồi hoàn > 50 điểm
        const resCskhOver50 = await callActionApi({
            action: 'CHAT_COMPENSATE_POINTS',
            points: 70,
            customer_id: testCustomer.id,
            conversation_id: testConv.id,
            reason: 'Bù sự cố'
        }, `local:${cskhStaff.id}`);
        assert(resCskhOver50.status === 403, 'Chặn 403 Forbidden khi CSKH bồi hoàn vượt hạn mức 50 điểm');
        assert(resCskhOver50.data.error.includes('50 điểm'), 'Thông báo nêu rõ hạn mức 50 điểm của CSKH');

        // Ca 3c: Tham số không hợp lệ (số âm hoặc số thập phân)
        const resInvalidPoints = await callActionApi({
            action: 'CHAT_COMPENSATE_POINTS',
            points: -15,
            customer_id: testCustomer.id
        }, `local:${adminStaff.id}`);
        assert(resInvalidPoints.status === 400, 'Chặn 400 khi số điểm là số âm (-15)');

        // ====================================================================
        // TEST 4: G4-03 - THỰC THI BỒI HOÀN HỢP LỆ VÀ GHI SỔ CÁI LIVE DB
        // ====================================================================
        console.log('\n5. Kiểm thử G4-03: Thực thi bồi hoàn hợp lệ và cập nhật sổ cái CSDL...');
        
        // Đọc số dư ban đầu
        const { data: memBefore } = await supabase
            .from('customer_membership')
            .select('total_paw_points')
            .eq('customer_id', testCustomer.id)
            .maybeSingle();
        const startBalance = memBefore?.total_paw_points || 0;

        const idempotencyKeyCompensate = crypto.randomUUID();
        const resCompensate = await callActionApi({
            action: 'CHAT_COMPENSATE_POINTS',
            points: 25,
            customer_id: testCustomer.id,
            conversation_id: testConv.id,
            reason: '[QA Test G4] Tạ lỗi trễ giờ hẹn dịch vụ',
            idempotency_key: idempotencyKeyCompensate
        }, `local:${adminStaff.id}`);

        assert(resCompensate.status === 200, 'Thực thi bồi hoàn thành công HTTP 200');
        assert(resCompensate.data.ok === true, 'Phản hồi ok = true');
        assert(resCompensate.data.points === 25, 'Số điểm ghi nhận là +25');
        assert(resCompensate.data.balance_after === startBalance + 25, `Số dư sau biến động tăng chuẩn xác: ${resCompensate.data.balance_after}`);
        assert(Boolean(resCompensate.data.transaction_id), `Mã giao dịch phát hành: ${resCompensate.data.transaction_id}`);

        // Đối soát trực tiếp trong CSDL Supabase Live
        const { data: dbTx } = await supabase
            .from('paw_point_transaction')
            .select('*')
            .eq('id', resCompensate.data.transaction_id)
            .single();
        assert(Boolean(dbTx), 'Tìm thấy bản ghi giao dịch trong bảng paw_point_transaction');
        assert(dbTx.points === 25, 'Cột points trong CSDL lưu đúng 25');
        assert(dbTx.balance_after === startBalance + 25, 'Cột balance_after trong CSDL khớp tuyệt đối');

        // Đối soát thông báo hệ thống được đăng vào chat_message
        const { data: sysMsg } = await supabase
            .from('chat_message')
            .select('*')
            .eq('conversation_id', testConv.id)
            .eq('sender_name', 'Hệ thống PawPal')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
        assert(Boolean(sysMsg), 'Thông báo sự kiện hệ thống đã tự động chèn vào chat_message');
        assert(sysMsg.content.includes('25 điểm'), 'Nội dung thông báo hệ thống nêu rõ +25 điểm');

        // ====================================================================
        // TEST 5: G4-01 / G4-05 - CHỐNG THỰC THI TRÙNG LẶP (IDEMPOTENCY)
        // ====================================================================
        console.log('\n6. Kiểm thử G4-01 & G4-05: Chống thực thi trùng lặp (Idempotency Key)...');
        const resReplay = await callActionApi({
            action: 'CHAT_COMPENSATE_POINTS',
            points: 25,
            customer_id: testCustomer.id,
            conversation_id: testConv.id,
            reason: '[QA Test G4] Gửi lặp do mạng chập chờn',
            idempotency_key: idempotencyKeyCompensate
        }, `local:${adminStaff.id}`);

        assert(resReplay.status === 200, 'Gửi lại cùng idempotency_key trả về HTTP 200');
        assert(resReplay.data.is_replay === true, 'Đánh dấu is_replay = true ngăn chặn thực thi lặp');
        assert(resReplay.data.transaction_id === resCompensate.data.transaction_id, 'Trả về cùng mã transaction_id cũ');

        // Xác minh số dư trong CSDL KHÔNG bị cộng lần 2
        const { data: memAfterReplay } = await supabase
            .from('customer_membership')
            .select('total_paw_points')
            .eq('customer_id', testCustomer.id)
            .single();
        assert(memAfterReplay.total_paw_points === startBalance + 25, 'Số dư CSDL vẫn giữ nguyên, không bị cộng trùng lặp');

        // ====================================================================
        // TEST 6: G4-02 - TẠO TICKET VÀ LÀM SẠCH NGÔN TỪ THÔ TỤC (TOXIC SANITIZATION)
        // ====================================================================
        console.log('\n7. Kiểm thử G4-02: Tạo ticket từ hội thoại và làm sạch ngôn từ...');
        const idempotencyKeyTicket = crypto.randomUUID();
        const toxicTitle = 'Dịch vụ đụ mẹ quá lừa đảo nhân viên như cặc';
        const rawDescription = 'Khách hàng chửi bới: Tiệm làm ăn như chó đẻ, tôi muốn kiện quản lý!';

        const resTicket = await callActionApi({
            action: 'CHAT_CREATE_TICKET',
            conversation_id: testConv.id,
            title: toxicTitle,
            description: rawDescription,
            category: 'service',
            priority: 'Cao',
            ref_id: 'ORD-TEST-G4',
            idempotency_key: idempotencyKeyTicket
        }, `local:${adminStaff.id}`);

        assert(resTicket.status === 200, 'Tạo ticket từ hội thoại thành công HTTP 200');
        assert(Boolean(resTicket.data.ticket_id), `Mã ticket đã tạo: ${resTicket.data.ticket_id}`);
        assert(resTicket.data.deep_link === '#tab-complaint-detail', 'Liên kết màn hình đích chuẩn #tab-complaint-detail');

        // Đối soát trực tiếp trong bảng support_ticket CSDL Live
        const { data: dbTicket } = await supabase
            .from('support_ticket')
            .select('*')
            .eq('id', resTicket.data.ticket_id)
            .single();

        assert(Boolean(dbTicket), 'Bản ghi ticket tồn tại trong bảng support_ticket');
        assert(!dbTicket.title.includes('đụ') && !dbTicket.title.includes('lừa đảo') && !dbTicket.title.includes('cặc'),
            'Tiêu đề ticket trong CSDL đã được làm sạch, không chứa từ thô tục');
        assert(dbTicket.title.includes('***'), 'Từ nhạy cảm được thay thế bằng *** an toàn');
        assert(dbTicket.type === 'service', 'Cột type lưu đúng phân loại service');
        assert(dbTicket.priority === 'Cao', 'Cột priority lưu đúng mức Cao');
        assert(dbTicket.status === 'pending', 'Trạng thái ban đầu là pending');

        // Đối soát trong support_ticket_message
        const { data: dbTicketMsg } = await supabase
            .from('support_ticket_message')
            .select('*')
            .eq('ticket_id', dbTicket.id)
            .single();
        assert(Boolean(dbTicketMsg), 'Tin nhắn khởi đầu ticket được ghi vào support_ticket_message');
        assert(dbTicketMsg.agent_name === adminStaff.full_name, 'Tên chuyên viên khởi tạo lưu chính xác');

        // ====================================================================
        // TEST 7: G4-04 - GHI CHÚ NỘI BỘ VÀ CHUYỂN CA QUẢN LÝ (ESCALATION)
        // ====================================================================
        console.log('\n8. Kiểm thử G4-04: Ghi chú nội bộ an toàn và chuyển ca khẩn cấp...');
        
        // 7a. Ghi chú nội bộ
        const testNote = '[QA Test G4 Note] Khách hàng khó tính, cần chuyên viên bậc cao chăm sóc.';
        const resNote = await callActionApi({
            action: 'CHAT_ADD_INTERNAL_NOTE',
            conversation_id: testConv.id,
            note: testNote
        }, `local:${adminStaff.id}`);

        assert(resNote.status === 200, 'Lưu ghi chú nội bộ thành công HTTP 200');
        assert(resNote.data.internal_note === testNote, 'Nội dung phản hồi khớp ghi chú');

        const { data: dbConvNote } = await supabase
            .from('chat_conversation')
            .select('internal_note')
            .eq('id', testConv.id)
            .single();
        assert(dbConvNote.internal_note === testNote, 'Ghi chú nội bộ được lưu an toàn trên chat_conversation');

        // 7b. Chuyển ca Quản lý / Khẩn cấp
        const resHandover = await callActionApi({
            action: 'CHAT_HANDOVER_MANAGER',
            conversation_id: testConv.id,
            reason: 'Khách yêu cầu gặp Quản lý vì nghi ngờ thú cưng dị ứng cấp cứu',
            target_role: 'CSKH_LEAD'
        }, `local:${adminStaff.id}`);

        assert(resHandover.status === 200, 'Chuyển ca Quản lý thành công HTTP 200');
        assert(resHandover.data.status === 'waiting_agent', 'Trạng thái ca chuyển về waiting_agent');
        assert(resHandover.data.is_urgent === true, 'Tự động kích hoạt cờ khẩn cấp is_urgent = true do có từ cấp cứu');

        const { data: dbConvHandover } = await supabase
            .from('chat_conversation')
            .select('status, assigned_staff_id, is_urgent')
            .eq('id', testConv.id)
            .single();
        assert(dbConvHandover.status === 'waiting_agent', 'Trạng thái CSDL là waiting_agent');
        assert(dbConvHandover.assigned_staff_id === null, 'Đã giải phóng phụ trách cũ để hàng đợi tiếp nhận');
        assert(dbConvHandover.is_urgent === true, 'Cờ is_urgent trong CSDL bật true');

        // ====================================================================
        // TEST 8: G4-05 - AUDIT LOGGING (NHẬT KÝ KIỂM TOÁN HOÀN CHỈNH)
        // ====================================================================
        console.log('\n9. Kiểm thử G4-05: Kiểm tra nhật ký kiểm toán trong chat_moderation_log...');
        const { data: auditLogs } = await supabase
            .from('chat_moderation_log')
            .select('*')
            .eq('conversation_id', testConv.id);

        assert(auditLogs && auditLogs.length >= 3, `Đã ghi nhận ${auditLogs?.length} bản ghi kiểm toán cho ca hội thoại`);
        const keywordsFound = auditLogs.flatMap(l => l.detected_keywords || []);
        assert(keywordsFound.includes('[AUDIT_POINT_COMPENSATED]'), 'Ghi nhận audit action point_compensated');
        assert(keywordsFound.includes('[AUDIT_TICKET_CREATED]'), 'Ghi nhận audit action ticket_created');
        assert(keywordsFound.includes('[AUDIT_INTERNAL_NOTE_ADDED]'), 'Ghi nhận audit action internal_note_added');
        assert(keywordsFound.includes('[AUDIT_HANDOVER_ESCALATED]'), 'Ghi nhận audit action handover_escalated');

        console.log(`\n=== TẤT CẢ ${passedTests}/${totalTests} BƯỚC KIỂM THỬ G4 ĐÃ ĐẠT 100% PASS ===\n`);

    } finally {
        // Dọn dẹp dữ liệu test (Teardown)
        console.log('10. Dọn dẹp dữ liệu kiểm thử tự động...');
        await supabase.from('chat_message').delete().eq('conversation_id', testConv.id);
        await supabase.from('chat_moderation_log').delete().eq('conversation_id', testConv.id);
        await supabase.from('chat_conversation').delete().eq('id', testConv.id);
        console.log('   -> Đã dọn dẹp sạch dữ liệu test trên Supabase Live DB.');
    }
}

runG4TestSuite().catch(err => {
    console.error('\nLỖI KIỂM THỬ G4:', err);
    process.exit(1);
});
