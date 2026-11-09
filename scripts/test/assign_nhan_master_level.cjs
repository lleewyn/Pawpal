const assert = require('node:assert/strict');
const { connect } = require('../database/v1/service_import_connection.cjs');

const STAFF_ID = '4145890a-4023-4135-8703-274538d4a5d9';
const ADMIN_STAFF_ID = 'c28ca283-2c81-4c53-82d0-4b173754ca6d';
const LEVEL_CODE = 'MASTER';

(async () => {
    const db = await connect();
    try {
        await db.query("BEGIN; SET LOCAL lock_timeout='3s'; SET LOCAL statement_timeout='12s'");

        // 1. Kiểm tra nhân viên Nguyễn Văn Nhân
        const staffRes = await db.query('SELECT * FROM public.staff WHERE id = $1 FOR UPDATE', [STAFF_ID]);
        assert.ok(staffRes.rows.length === 1, 'Nhân viên phải tồn tại');
        const staff = staffRes.rows[0];
        console.log('Nhân viên:', staff.full_name, '| Trạng thái:', staff.employment_status);

        // 2. Thêm bản ghi đánh giá chuyên môn Grooming PASS (100 điểm)
        const assessRes = await db.query(`
            INSERT INTO public.staff_assessment (staff_id, assessment_date, assessment_type, score, result, note, assessed_by)
            VALUES ($1, CURRENT_DATE, 'Grooming', 100.00, 'PASS', 'Đánh giá kỹ năng cắt tỉa và xử lý an toàn đạt chuẩn Master', $2)
            RETURNING id, score, result
        `, [STAFF_ID, ADMIN_STAFF_ID]);
        const assessment = assessRes.rows[0];
        console.log('Đã tạo đánh giá chuyên môn:', assessment);

        // 3. Lấy cấp độ MASTER
        const levelRes = await db.query('SELECT id, level_name FROM public.staff_level WHERE level_code = $1 AND is_active', [LEVEL_CODE]);
        assert.ok(levelRes.rows.length === 1, 'Cấp độ MASTER phải tồn tại');
        const level = levelRes.rows[0];
        console.log('Cấp độ:', level.level_name, '(', level.id, ')');

        // 4. Cập nhật staff_level_id cho Nguyễn Văn Nhân
        const updateRes = await db.query(`
            UPDATE public.staff 
            SET staff_level_id = $2, updated_at = clock_timestamp() 
            WHERE id = $1
        `, [STAFF_ID, level.id]);
        assert.equal(updateRes.rowCount, 1, 'Cập nhật cấp độ phải thành công');

        // 5. Ghi Audit Log chuẩn
        await db.query(`
            INSERT INTO public.audit_log(staff_id, action, entity_name, entity_id, description)
            VALUES ($1, 'ASSIGN_STAFF_LEVEL', 'staff', $2, $3)
        `, [
            ADMIN_STAFF_ID,
            STAFF_ID,
            JSON.stringify({
                source: 'User-directed Phase 5 Live Acceptance',
                authorized_date: new Date().toISOString().split('T')[0],
                reason: 'Gán cấp độ Master Groomer cho KTV Nguyễn Văn Nhân để đủ điều kiện tiếp nhận và bàn giao ca dịch vụ cắt tỉa mèo',
                previous_level_id: staff.staff_level_id,
                new_level_id: level.id,
                level_code: LEVEL_CODE,
                assessment_id: assessment.id,
                score: 100,
                assessment_result: assessment.result
            })
        ]);

        await db.query('COMMIT');
        console.log('=== THÀNH CÔNG: Đã gán cấp độ MASTER cho KTV Nguyễn Văn Nhân và lưu Audit Log ===');
    } catch (err) {
        await db.query('ROLLBACK');
        console.error('Lỗi gán cấp độ:', err);
        throw err;
    } finally {
        await db.end();
    }
})().catch(process.exitCode = 1);

