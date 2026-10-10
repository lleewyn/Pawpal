require('dotenv').config({ quiet: true });
const { createClient } = require('@supabase/supabase-js');

// Run after the SQL migration; default is a read-only inventory.
async function main() {
    const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Thiếu cấu hình Supabase máy chủ.');
    const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await db.rpc('customer_legacy_credentials_batch');
    if (error) throw new Error('Chưa đọc được danh sách chuyển đổi. Hãy áp dụng SQL bảo mật trước.');
    console.log(`Có ${data.length} tài khoản cần chuyển đổi.`);
    if (!process.argv.includes('--apply')) { console.log('Chế độ chỉ kiểm tra. Thêm --apply để chuyển mật khẩu sang Supabase Auth.'); return; }
    let completed = 0, skipped = 0;
    for (const row of data) {
        if (!/^0\d{9}$/.test(row.phone)) throw new Error(`Số điện thoại không hợp lệ ở hồ sơ ${row.customer_id}.`);
        const staff = await db.from('staff').select('id').eq('phone_number', row.phone).limit(1);
        if (staff.error) throw new Error('Không thể kiểm tra phân loại tài khoản. Dừng chuyển đổi để bảo vệ dữ liệu.');
        if (staff.data?.length) {
            skipped++;
            console.log('Bỏ qua một hồ sơ trùng số điện thoại nhân sự; giữ dữ liệu trong vùng riêng để đối chiếu.');
            continue;
        }
        let authId = row.auth_user_id;
        if (authId) {
            const staffIdentity = await db.from('staff').select('id').eq('auth_user_id', authId).limit(1);
            const authIdentity = await db.auth.admin.getUserById(authId);
            if (staffIdentity.error || authIdentity.error) throw new Error('Không thể kiểm tra danh tính Auth. Dừng chuyển đổi.');
            if (staffIdentity.data?.length || authIdentity.data.user?.app_metadata?.user_type === 'STAFF') {
                skipped++; console.log('Bỏ qua một danh tính Auth thuộc nhân sự.'); continue;
            }
            const existingPhone = String(authIdentity.data.user?.phone || '').replace(/^\+/, '');
            if (existingPhone && existingPhone !== `84${row.phone.slice(1)}`) {
                skipped++; console.log('Bỏ qua một hồ sơ có số điện thoại không khớp danh tính Auth.'); continue;
            }
            if (!existingPhone) {
                const added = await db.auth.admin.updateUserById(authId, { phone: `+84${row.phone.slice(1)}`, phone_confirm: true });
                if (added.error) throw new Error('Không thể bổ sung số điện thoại cho danh tính Auth đã liên kết.');
            }
        }
        if (!authId) {
            const existing = await db.rpc('find_customer_auth_user', { p_phone: row.phone });
            if (existing.error) throw existing.error;
            // Never overwrite an existing Auth identity's password using a legacy value.
            if (existing.data) authId = existing.data;
            else {
                const result = await db.auth.admin.createUser({ phone: `+84${row.phone.slice(1)}`, phone_confirm: true, password: row.legacy_password, app_metadata: { user_type: 'CUSTOMER' } });
                if (result.error) throw new Error(`Không chuyển được hồ sơ ${row.customer_id}. Dữ liệu cũ vẫn được giữ trong vùng riêng.`);
                authId = result.data.user.id;
            }
        }
        const linked = await db.rpc('finish_customer_credential_migration', { p_customer_id: row.customer_id, p_auth_id: authId });
        if (linked.error) throw new Error(`Không liên kết được hồ sơ ${row.customer_id}.`);
        completed++;
        console.log(`Đã chuyển ${completed}/${data.length} tài khoản.`);
    }
    console.log(`Hoàn tất: ${completed} hồ sơ đã chuyển, ${skipped} hồ sơ cần đối chiếu phân loại.`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
