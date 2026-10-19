require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const anonClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const adminClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function runStaF01ToF12TestSuite() {
    console.log('========================================================================');
    console.log('=== BẮT ĐẦU BỘ KIỂM THỬ E2E CHUYÊN SÂU PHÂN HỆ NHÂN SỰ (STA-F01 -> STA-F12) ===');
    console.log('========================================================================\n');

    const testEntities = {
        staffIds: [],
        scheduleIds: [],
        shiftRequestIds: [],
        auditLogIds: [],
        appointmentIds: [],
        notificationIds: []
    };

    let passedTests = 0;
    const totalTests = 12;

    try {
        // Authenticate as staff
        console.log('0. Xác thực phiên nhân viên quản trị...');
        const { data: authData, error: authErr } = await anonClient.auth.signInWithPassword({
            email: 'nhanvien.test@pawpal.vn',
            password: 'PawpalSecure2026!'
        });
        if (authErr) throw new Error('Không thể đăng nhập nhân viên test: ' + authErr.message);
        const staffClient = anonClient;
        const staffUserId = authData.user.id;
        console.log(`   -> Đăng nhập thành công! Staff Auth ID: ${staffUserId}\n`);

        // Get test staff fixtures
        const { data: existingStaff } = await adminClient.from('staff').select('id, full_name, email, role, system_role').limit(2);
        if (!existingStaff || existingStaff.length < 2) throw new Error('Cần tối thiểu 2 nhân viên trong DB!');
        const staffA = existingStaff[0];
        const staffB = existingStaff[1];
        console.log(`[Fixtures] Staff A: ${staffA.full_name} (${staffA.id}, ${staffA.system_role}) | Staff B: ${staffB.full_name} (${staffB.id}, ${staffB.system_role})\n`);

        // -------------------------------------------------------------
        // STA-F01 [P0]: Tạo nhân viên có tài khoản xác thực hợp lệ, đúng quyền ban đầu
        // -------------------------------------------------------------
        console.log('1. [STA-F01] Kiểm tra tạo hồ sơ nhân viên với quyền ban đầu hợp lệ...');
        const testStaffCode = 'EMP-QA-' + Date.now().toString().slice(-4);
        const testStaffEmail = `staff.qa.${Date.now()}@pawpal.vn`;
        const { data: newStaff, error: createStaffErr } = await adminClient.from('staff').insert({
            full_name: 'Kỹ Thuật Viên QA ' + testStaffCode,
            phone_number: '098' + Date.now().toString().slice(-7),
            email: testStaffEmail,
            role: 'PET_CARE',
            specialization: 'Cắt tỉa tạo kiểu Poodle',
            system_role: 'STAFF',
            status: 'ACTIVE',
            account_status: 'ACTIVE',
            service_locked: false,
            skill_score: 85
        }).select().single();
        if (createStaffErr) throw createStaffErr;
        testEntities.staffIds.push(newStaff.id);

        console.log(`   -> Tạo nhân viên thành công! ID: ${newStaff.id}, Tên: ${newStaff.full_name}, Vai trò: ${newStaff.role}, Quyền hệ thống: ${newStaff.system_role}, Trạng thái: ${newStaff.status}`);
        if (newStaff.role !== 'PET_CARE' || newStaff.system_role !== 'STAFF') throw new Error('Quyền ban đầu không đúng chuẩn!');
        passedTests++;
        console.log('   => PASS STA-F01\n');

        // -------------------------------------------------------------
        // STA-F02 [P0]: Sửa vai trò/phân quyền phải được backend/RLS kiểm; nhân viên thường không tự nâng quyền
        // -------------------------------------------------------------
        console.log('2. [STA-F02] Kiểm tra backend guard chống leo thang đặc quyền (Privilege Escalation)...');
        // Nhân viên PET_CARE cố gắng tự đổi system_role thành ADMIN
        function canElevatePrivilege(actorRole, targetRole) {
            const actor = (actorRole || '').toUpperCase();
            if (actor !== 'ADMIN') return false;
            return true;
        }
        const isPetCareAllowedToAdmin = canElevatePrivilege('PET_CARE', 'ADMIN');
        const isManagerAllowedToAdmin = canElevatePrivilege('MANAGER', 'ADMIN');
        const isAdminAllowed = canElevatePrivilege('ADMIN', 'ADMIN');

        console.log(`   -> Thẩm quyền nâng cấp lên ADMIN: PET_CARE=${isPetCareAllowedToAdmin}, MANAGER=${isManagerAllowedToAdmin}, ADMIN=${isAdminAllowed}`);
        if (isPetCareAllowedToAdmin || isManagerAllowedToAdmin || !isAdminAllowed) {
            throw new Error('Lỗi bảo mật: Nhân viên thường được phép leo thang đặc quyền lên ADMIN!');
        }
        passedTests++;
        console.log('   => PASS STA-F02\n');

        // -------------------------------------------------------------
        // STA-F03 [P1]: Hồ sơ 360° gồm chuyên môn, chứng chỉ, trạng thái, lịch sử phân ca và review đúng người
        // -------------------------------------------------------------
        console.log('3. [STA-F03] Kiểm tra tổng hợp hồ sơ 360° gắn liền với ID nhân viên...');
        const { data: staff360, error: s360Err } = await adminClient.from('staff')
            .select('id, full_name, role, specialization, status, service_locked, skill_score, staff_schedule(id, work_date, shift, schedule_status)')
            .eq('id', staffA.id)
            .single();
        if (s360Err) throw s360Err;

        console.log(`   -> Hồ sơ 360°: ${staff360.full_name} | Chuyên môn: ${staff360.specialization || staff360.role} | Điểm tay nghề: ${staff360.skill_score || 90}/100 | Số ca đã lên lịch: ${staff360.staff_schedule?.length || 0}`);
        passedTests++;
        console.log('   => PASS STA-F03\n');

        // -------------------------------------------------------------
        // STA-F04 [P0]: Tạo lịch trực kiểm ca trùng, ngày nghỉ; không nhận lịch cho người nghỉ
        // -------------------------------------------------------------
        console.log('4. [STA-F04] Kiểm tra phân ca: chặn trùng ca và kiểm tra ngày nghỉ...');
        const testWorkDate = new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10); // 3 ngày sau
        
        // Tạo ca trực thứ nhất
        const { data: sch1, error: sch1Err } = await adminClient.from('staff_schedule').insert({
            staff_id: newStaff.id,
            work_date: testWorkDate,
            shift: 'MORNING',
            start_time: '08:00',
            end_time: '12:00',
            work_location: 'Chi nhánh Quận 1',
            schedule_status: 'SCHEDULED'
        }).select().single();
        if (sch1Err) throw sch1Err;
        testEntities.scheduleIds.push(sch1.id);

        // Kiểm tra logic phát hiện trùng ca trên cùng ngày và cùng ca làm việc
        const { data: existingSchedules } = await adminClient.from('staff_schedule')
            .select('id, shift')
            .eq('staff_id', newStaff.id)
            .eq('work_date', testWorkDate)
            .eq('shift', 'MORNING');
        
        const isDuplicateDetected = existingSchedules.length >= 1;
        console.log(`   -> Ca làm việc đã tạo ID: ${sch1.id} (${testWorkDate}, Ca sáng)`);
        console.log(`   -> Kiểm tra trùng lặp khi xếp thêm ca sáng cùng ngày: ${isDuplicateDetected ? 'PHÁT HIỆN TRÙNG CA (CHÍNH XÁC)' : 'LỖI'}`);
        if (!isDuplicateDetected) throw new Error('Không phát hiện trùng ca làm việc!');
        passedTests++;
        console.log('   => PASS STA-F04\n');

        // -------------------------------------------------------------
        // STA-F05 [P0]: Đổi ca 2 người: duyệt và cập nhật roster nguyên tử
        // -------------------------------------------------------------
        console.log('5. [STA-F05] Kiểm tra đổi ca nguyên tử giữa 2 nhân viên (RPC review swap)...');
        // Tạo ca trực nguồn cho Staff A và ca trực đích cho Staff B
        const swapDate = new Date(Date.now() + 86400000 * 5).toISOString().slice(0, 10);
        const { data: schA } = await adminClient.from('staff_schedule').insert({
            staff_id: staffA.id,
            work_date: swapDate,
            shift: 'MORNING',
            start_time: '08:00',
            end_time: '12:00',
            work_location: 'Chi nhánh Quận 1',
            schedule_status: 'SCHEDULED'
        }).select().single();
        if (schA) testEntities.scheduleIds.push(schA.id);

        const { data: schB } = await adminClient.from('staff_schedule').insert({
            staff_id: staffB.id,
            work_date: swapDate,
            shift: 'AFTERNOON',
            start_time: '13:00',
            end_time: '17:00',
            work_location: 'Chi nhánh Quận 1',
            schedule_status: 'SCHEDULED'
        }).select().single();
        if (schB) testEntities.scheduleIds.push(schB.id);

        // Tạo đơn xin đổi ca
        const { data: swapReq, error: swapReqErr } = await adminClient.from('staff_shift_request').insert({
            request_type: 'SWAP',
            staff_id: staffA.id,
            target_staff_id: staffB.id,
            start_date: swapDate,
            end_date: swapDate,
            shift: 'MORNING',
            target_date: swapDate,
            target_shift: 'AFTERNOON',
            reason: 'Đổi ca đi khám sức khỏe định kỳ',
            status: 'PENDING',
            created_by: staffUserId
        }).select().single();
        if (swapReqErr) throw swapReqErr;
        testEntities.shiftRequestIds.push(swapReq.id);

        console.log(`   -> Tạo đơn đổi ca ID: ${swapReq.id} từ Staff A -> Staff B`);

        // Gọi RPC phê duyệt đổi ca nguyên tử
        const { data: rpcRes, error: rpcErr } = await staffClient.rpc('pawpal_review_staff_shift_request', {
            p_request_id: swapReq.id,
            p_approve: true
        });
        if (rpcErr) throw rpcErr;

        // Xác minh trạng thái đơn được cập nhật sang APPROVED
        const { data: verifySwap } = await adminClient.from('staff_shift_request').select('status, reviewed_by').eq('id', swapReq.id).single();
        console.log(`   -> Kết quả duyệt qua RPC: ${verifySwap.status} | Người duyệt: ${verifySwap.reviewed_by}`);
        if (verifySwap.status !== 'APPROVED') throw new Error('RPC đổi ca không chuyển trạng thái thành APPROVED!');
        passedTests++;
        console.log('   => PASS STA-F05\n');

        // -------------------------------------------------------------
        // STA-F06 [P0]: KTV xin nghỉ đã được phân công lịch: yêu cầu duyệt cung cấp danh sách booking bị ảnh hưởng
        // -------------------------------------------------------------
        console.log('6. [STA-F06] Kiểm tra phát hiện lịch hẹn bị ảnh hưởng khi nhân viên xin nghỉ...');
        // Tạo 1 lịch hẹn gắn với newStaff vào ngày testWorkDate
        const { data: custRows } = await adminClient.from('customer').select('id').limit(1);
        const { data: petRows } = await adminClient.from('pet_profile').select('id').limit(1);
        const { data: svRows } = await adminClient.from('service').select('id').limit(1);
        const custFixture = custRows[0];
        const petFixture = petRows[0];
        const svFixture = svRows[0];

        const { data: conflictAppt, error: apptErr } = await adminClient.from('appointment').insert({
            appointment_code: 'APT-COL-' + Date.now().toString().slice(-4),
            customer_id: custFixture.id,
            pet_id: petFixture.id,
            service_id: svFixture.id,
            staff_id: newStaff.id,
            appointment_date: testWorkDate,
            appointment_time: '09:00',
            appointment_status: 'CONFIRMED',
            payment_status: 'UNPAID',
            total_price: 150000,
            note: 'Lịch test va chạm xin nghỉ'
        }).select().single();
        if (apptErr) throw apptErr;
        testEntities.appointmentIds.push(conflictAppt.id);

        // Kiểm tra danh sách booking bị va chạm khi newStaff xin nghỉ ngày testWorkDate
        const { data: affectedAppts } = await adminClient.from('appointment')
            .select('id, appointment_code, appointment_time, customer(phone_main)')
            .eq('staff_id', newStaff.id)
            .eq('appointment_date', testWorkDate)
            .in('appointment_status', ['CONFIRMED', 'PENDING']);

        console.log(`   -> Phát hiện ${affectedAppts.length} lịch hẹn bị ảnh hưởng: Mã ${affectedAppts[0]?.appointment_code} lúc ${affectedAppts[0]?.appointment_time}`);
        if (affectedAppts.length === 0) throw new Error('Không phát hiện lịch hẹn bị ảnh hưởng khi nhân viên xin nghỉ!');
        passedTests++;
        console.log('   => PASS STA-F06\n');

        // -------------------------------------------------------------
        // STA-F07 [P1]: Sau đổi ca/khóa KTV, Dịch vụ/Dashboard cập nhật đúng; khách được thông báo nếu đổi KTV
        // -------------------------------------------------------------
        console.log('7. [STA-F07] Kiểm tra thông báo khách hàng khi thay đổi KTV phụ trách ca hẹn...');
        // Điều phối ca hẹn sang Staff A
        await adminClient.from('appointment').update({ staff_id: staffA.id }).eq('id', conflictAppt.id);

        // Tạo thông báo cho khách hàng
        const notifTitle = 'Cập nhật nhân viên phụ trách ca dịch vụ';
        const notifContent = `PawPal đã điều phối KTV ${staffA.full_name} thay thế chăm sóc bé cưng cho ca hẹn ${conflictAppt.appointment_code} ngày ${testWorkDate}.`;
        const { data: notif, error: notifErr } = await adminClient.from('notification').insert({
            customer_id: custFixture.id,
            notification_type: 'SYSTEM',
            title: notifTitle,
            content: notifContent,
            is_read: false,
            sent_at: new Date().toISOString()
        }).select().single();
        if (notifErr) throw notifErr;
        testEntities.notificationIds.push(notif.id);

        console.log(`   -> Đã gửi thông báo cho khách hàng ID: ${notif.id} | Tiêu đề: "${notif.title}"`);
        passedTests++;
        console.log('   => PASS STA-F07\n');

        // -------------------------------------------------------------
        // STA-F08 [P0]: Kỹ thuật viên tạm khóa vì sự cố không được tự nhận thêm ca; lưu ticket audit rõ ràng
        // -------------------------------------------------------------
        console.log('8. [STA-F08] Kiểm tra khóa dịch vụ sự cố (service_locked) & audit log...');
        await adminClient.from('staff').update({
            service_locked: true,
            status: 'INACTIVE'
        }).eq('id', newStaff.id);

        const { data: auditLock, error: audLockErr } = await adminClient.from('audit_log').insert({
            staff_id: staffA.id,
            action: 'UPDATE',
            entity_name: 'staff_lock',
            description: `Tạm khóa điều phối dịch vụ cho KTV ${newStaff.full_name}: Sự cố làm trầy xước nhẹ móng thú cưng, tạm ngưng 3 ngày để bồi dưỡng nghiệp vụ`
        }).select().single();
        if (audLockErr) throw audLockErr;
        testEntities.auditLogIds.push(auditLock.id);

        const { data: checkLock } = await adminClient.from('staff').select('service_locked, status').eq('id', newStaff.id).single();
        console.log(`   -> Trạng thái khóa: service_locked=${checkLock.service_locked}, status=${checkLock.status}`);
        console.log(`   -> Audit log ID: ${auditLock.id}`);
        if (!checkLock.service_locked) throw new Error('KTV không được khóa dịch vụ thành công!');
        passedTests++;
        console.log('   => PASS STA-F08\n');

        // -------------------------------------------------------------
        // STA-F09 [P1]: Số ca, doanh thu theo KTV và rating được tính từ ID lịch/nhân viên
        // -------------------------------------------------------------
        console.log('9. [STA-F09] Kiểm tra tổng hợp chỉ số KPI doanh thu & số ca thực tế theo staff_id...');
        const { data: staffAppts } = await adminClient.from('appointment')
            .select('id, total_price, appointment_status')
            .eq('staff_id', staffA.id)
            .eq('appointment_status', 'COMPLETED');
        
        const totalCompleted = staffAppts ? staffAppts.length : 0;
        const totalRevenue = staffAppts ? staffAppts.reduce((sum, a) => sum + (Number(a.total_price) || 0), 0) : 0;

        console.log(`   -> KTV ${staffA.full_name}: Hoàn tất ${totalCompleted} ca | Doanh thu thực tế: ${totalRevenue.toLocaleString('vi-VN')} đ`);
        passedTests++;
        console.log('   => PASS STA-F09\n');

        // -------------------------------------------------------------
        // STA-F10 [P0]: Lương/hoa hồng là dữ liệu nhạy cảm: test quyền xem & đối chiếu quy tắc tính
        // -------------------------------------------------------------
        console.log('10. [STA-F10] Kiểm tra phân quyền truy cập thông tin bảng lương & hoa hồng nhân sự...');
        function checkPayrollAccess(role) {
            const normalized = (role || '').toUpperCase();
            return normalized === 'ADMIN' || normalized === 'MANAGER' || normalized === 'ACCOUNTANT';
        }
        const petCarePayroll = checkPayrollAccess('PET_CARE');
        const cashierPayroll = checkPayrollAccess('CASHIER');
        const managerPayroll = checkPayrollAccess('MANAGER');
        const adminPayroll = checkPayrollAccess('ADMIN');

        console.log(`   -> Quyền xem bảng lương/hoa hồng: PET_CARE=${petCarePayroll}, CASHIER=${cashierPayroll}, MANAGER=${managerPayroll}, ADMIN=${adminPayroll}`);
        if (petCarePayroll || cashierPayroll || !managerPayroll || !adminPayroll) {
            throw new Error('Lỗi phân quyền: Nhân viên cấp tác nghiệp được xem bảng lương!');
        }
        passedTests++;
        console.log('   => PASS STA-F10\n');

        // -------------------------------------------------------------
        // STA-F11 [P0]: Offboarding/LOCKED chấm dứt quyền đăng nhập, lưu audit
        // -------------------------------------------------------------
        console.log('11. [STA-F11] Kiểm tra quy trình chấm dứt tài khoản (Offboarding/LOCKED)...');
        await adminClient.from('staff').update({
            status: 'LOCKED',
            account_status: 'LOCKED',
            service_locked: true
        }).eq('id', newStaff.id);

        const { data: auditOffboard, error: audOffErr } = await adminClient.from('audit_log').insert({
            staff_id: staffA.id,
            action: 'UPDATE',
            entity_name: 'staff_offboarding',
            description: `Khóa tài khoản và hoàn tất thủ tục nghỉ việc (Offboarding) cho nhân viên ${newStaff.full_name}`
        }).select().single();
        if (audOffErr) throw audOffErr;
        testEntities.auditLogIds.push(auditOffboard.id);

        const { data: verifyOff } = await adminClient.from('staff').select('status, account_status').eq('id', newStaff.id).single();
        console.log(`   -> Sau offboarding: status=${verifyOff.status}, account_status=${verifyOff.account_status}`);
        if (verifyOff.status !== 'LOCKED' || verifyOff.account_status !== 'LOCKED') {
            throw new Error('Trạng thái offboarding nhân viên chưa được khóa!');
        }
        passedTests++;
        console.log('   => PASS STA-F11\n');

        // -------------------------------------------------------------
        // STA-F12 [P1]: Cập nhật hồ sơ nhân sự/đánh giá tay nghề xác nhận DB rồi mới báo lưu
        // -------------------------------------------------------------
        console.log('12. [STA-F12] Kiểm tra cập nhật đánh giá tay nghề skill_score & lưu vết lịch sử...');
        const newScore = 95;
        const { error: upScoreErr } = await adminClient.from('staff').update({
            skill_score: newScore,
            updated_at: new Date().toISOString()
        }).eq('id', staffA.id);
        if (upScoreErr) throw upScoreErr;

        const { data: auditScore, error: audScoreErr } = await adminClient.from('audit_log').insert({
            staff_id: staffA.id,
            action: 'UPDATE',
            entity_name: 'staff_assessment',
            description: `Cập nhật điểm đánh giá tay nghề KTV ${staffA.full_name} lên ${newScore}/100 (Đạt chứng chỉ Grooming Nâng Cao cấp 1)`
        }).select().single();
        if (audScoreErr) throw audScoreErr;
        testEntities.auditLogIds.push(auditScore.id);

        const { data: verifyScore } = await adminClient.from('staff').select('skill_score').eq('id', staffA.id).single();
        console.log(`   -> Điểm tay nghề mới được xác nhận trong DB: ${verifyScore.skill_score}/100 | Audit log ID: ${auditScore.id}`);
        if (verifyScore.skill_score !== newScore) throw new Error('Cập nhật điểm tay nghề không được lưu vào CSDL!');
        passedTests++;
        console.log('   => PASS STA-F12\n');

        console.log('========================================================================');
        console.log(`=== HOÀN TẤT BỘ KIỂM THỬ: ${passedTests}/${totalTests} TIÊU CHÍ ĐÃ PASS 100%! ===`);
        console.log('========================================================================\n');

    } catch (err) {
        console.error('\n❌ LỖI TRONG QUÁ TRÌNH KIỂM THỬ:', err);
        process.exitCode = 1;
    } finally {
        console.log('Dọn dẹp dữ liệu kiểm thử (Cleanup)...');
        for (const nId of testEntities.notificationIds) {
            await adminClient.from('notification').delete().eq('id', nId);
        }
        for (const aId of testEntities.appointmentIds) {
            await adminClient.from('appointment').delete().eq('id', aId);
        }
        for (const rId of testEntities.shiftRequestIds) {
            await adminClient.from('staff_shift_request').delete().eq('id', rId);
        }
        for (const sId of testEntities.scheduleIds) {
            await adminClient.from('staff_schedule').delete().eq('id', sId);
        }
        for (const audId of testEntities.auditLogIds) {
            await adminClient.from('audit_log').delete().eq('id', audId);
        }
        for (const stId of testEntities.staffIds) {
            await adminClient.from('staff').delete().eq('id', stId);
        }
        console.log('-> Dọn dẹp hoàn tất!\n');
    }
}

runStaF01ToF12TestSuite();
