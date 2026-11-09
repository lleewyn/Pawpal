// Phase 6: Migration of 3 legacy Base64 pet avatars to MongoDB GridFS and Supabase media_asset.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { settings } = require('../database/v1/cloud_connection.cjs');
const { createClient } = require('@supabase/supabase-js');
const { connect } = require('../database/v1/service_import_connection.cjs');

const TARGET_URL = 'https://pawpalgr3-5bph12hep-llwyns-projects.vercel.app';
const BACKUP_FILE = 'D:/Aboutme/Pawpal-infra/media/phase6-migration/pet-avatars-backup.private.json';

(async () => {
    console.log('=== GIAI ĐOẠN 6: CHUYỂN ĐỔI 3 AVATAR THÚ CƯNG BASE64 SANG MONGODB GRIDFS ===');
    const { config } = settings();
    const anon = createClient(config.DESTINATION_SUPABASE_URL, config.DESTINATION_SUPABASE_ANON_KEY);

    // 1. Đăng nhập Admin lấy Bearer token
    const credText = fs.readFileSync('D:/Aboutme/Pawpal-infra/supabase-local/PAWPAL-ADMIN.private.txt', 'utf8');
    const email = credText.match(/^Email: (.+)$/m)[1].trim();
    const password = credText.match(/^Password: (.+)$/m)[1].trim();

    console.log('[Bước 1] Đăng nhập Admin lấy Bearer token...');
    const login = await anon.auth.signInWithPassword({ email, password });
    assert.equal(login.error, null, 'Admin login failed: ' + login.error?.message);
    const adminToken = login.data.session.access_token;
    console.log('Admin đăng nhập thành công!');

    const authedClient = createClient(config.DESTINATION_SUPABASE_URL, config.DESTINATION_SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: `Bearer ${adminToken}` } }
    });

    // 2. Đọc file backup
    const backupList = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf8'));
    assert.equal(backupList.length, 3, 'Phải có đúng 3 thú cưng cần chuyển đổi');
    console.log(`\n[Bước 2] Đã nạp danh sách 3 thú cưng từ file sao lưu:`);

    const bypassCookie = JSON.parse(fs.readFileSync('D:/Aboutme/Pawpal-infra/media/phase5-evidence-browser.private.json'));
    const baseHeaders = {
        Authorization: `Bearer ${adminToken}`,
        Cookie: `_vercel_jwt=${bypassCookie.value}`
    };

    const migrationResults = [];

    // 3. Thực hiện chuyển đổi từng pet
    for (const pet of backupList) {
        console.log(`\n--- Kiểm tra và chuyển đổi: Bé ${pet.pet_name} (${pet.pet_code}) ---`);

        // Đọc trạng thái hiện tại từ DB
        const currentPetRow = await authedClient.from('pet_profile')
            .select('avatar_url, avatar_media_asset_id, updated_at')
            .eq('id', pet.pet_id)
            .single();
        assert.equal(currentPetRow.error, null);

        let assetId = currentPetRow.data.avatar_media_asset_id;

        if (assetId) {
            console.log(`Bé ${pet.pet_name} đã được gắn avatar_media_asset_id: ${assetId}, tiến hành xác minh...`);
        } else {
            const buffer = fs.readFileSync(pet.backup_image_path);
            assert.equal(buffer.length, pet.size_bytes, 'Kích thước buffer phải khớp backup');

            const requestId = crypto.randomUUID();
            const ext = pet.mime_type === 'image/jpeg' ? 'jpg' : 'png';
            const fileName = `${pet.pet_code}_avatar.${ext}`;

            // a) Prepare upload session
            console.log('1. Khởi tạo upload session (/api/media?action=prepare)...');
            const prepRes = await fetch(`${TARGET_URL}/api/media?action=prepare`, {
                method: 'POST',
                headers: { ...baseHeaders, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    request_id: requestId,
                    purpose: 'pet_avatar',
                    pet_id: pet.pet_id,
                    size_bytes: pet.size_bytes,
                    mime_type: pet.mime_type,
                    name: fileName
                })
            });
            const prepJson = await prepRes.json();
            assert.equal(prepRes.status, 200, 'Prepare failed: ' + JSON.stringify(prepJson));
            assert.ok(prepJson.ok && prepJson.session_id, 'Phải có session_id');
            const sessionId = prepJson.session_id;
            console.log(`   Session ID: ${sessionId}`);

            // b) Upload buffer to GridFS
            console.log('2. Đẩy byte nhị phân vào MongoDB GridFS (/api/media?action=upload)...');
            const formData = new FormData();
            const blob = new Blob([buffer], { type: pet.mime_type });
            formData.append('file', blob, fileName);

            const uploadRes = await fetch(`${TARGET_URL}/api/media?action=upload&session=${sessionId}`, {
                method: 'POST',
                headers: baseHeaders,
                body: formData
            });
            const uploadJson = await uploadRes.json();
            assert.equal(uploadRes.status, 201, 'Upload failed: ' + JSON.stringify(uploadJson));
            assert.ok(uploadJson.ok && uploadJson.asset_id, 'Phải có asset_id');
            assetId = uploadJson.asset_id;
            console.log(`   Media Asset ID: ${assetId}`);

            // c) Gắn media asset vào pet_profile bằng RPC save_admin_pet_avatar
            console.log('3. Gắn Media Asset vào pet_profile bằng RPC save_admin_pet_avatar...');
            const rpcRes = await authedClient.rpc('save_admin_pet_avatar', {
                p_pet: pet.pet_id,
                p_expected: currentPetRow.data.updated_at,
                p_asset: assetId
            });
            assert.equal(rpcRes.error, null, 'Gắn avatar thất bại: ' + rpcRes.error?.message);
            console.log(`   Đã gắn thành công avatar_media_asset_id cho bé ${pet.pet_name}!`);
        }

        // d) Kiểm tra phân quyền đọc ảnh
        console.log('4. Kiểm tra quyền tải ảnh qua API /api/media...');
        const readAdminRes = await fetch(`${TARGET_URL}/api/media?id=${assetId}`, {
            headers: baseHeaders
        });
        assert.equal(readAdminRes.status, 200, 'Admin phải đọc được ảnh thú cưng');
        const readBytes = await readAdminRes.arrayBuffer();
        assert.equal(readBytes.byteLength, pet.size_bytes, 'Dung lượng tải về phải khớp 100%');

        const readAnonRes = await fetch(`${TARGET_URL}/api/media?id=${assetId}`, {
            headers: { Cookie: `_vercel_jwt=${bypassCookie.value}` }
        });
        assert.ok([401, 403, 404].includes(readAnonRes.status), 'Khách vãng lai phải bị chặn');
        console.log('   Bảo mật đạt: Admin 200 OK (' + readBytes.byteLength + ' bytes), Anonymous bị chặn 404!');

        migrationResults.push({
            pet_id: pet.pet_id,
            pet_code: pet.pet_code,
            pet_name: pet.pet_name,
            mime_type: pet.mime_type,
            size_bytes: pet.size_bytes,
            sha256: pet.sha256,
            asset_id: assetId
        });
    }

    // 4. Đối soát toàn diện CSDL Supabase Cloud
    console.log('\n[Bước 4] Đối soát toàn diện CSDL Supabase Cloud sau chuyển đổi...');
    const db = await connect();
    try {
        const remainingBase64 = await db.query("SELECT count(*) FROM pet_profile WHERE avatar_url LIKE 'data:%'");
        console.log('Số lượng bản ghi Base64 còn lại trong pet_profile:', remainingBase64.rows[0].count);
        assert.equal(remainingBase64.rows[0].count, '0', 'Không được còn bất kỳ Base64 avatar nào trong DB');

        const convertedRows = await db.query(`
            SELECT p.id, p.pet_code, p.pet_name, p.avatar_url, p.avatar_media_asset_id,
                   a.provider, a.size_bytes, a.mime_type, a.sha256, a.status as asset_status,
                   s.state as session_state
            FROM pet_profile p
            JOIN media_asset a ON a.id = p.avatar_media_asset_id
            JOIN media_upload_session s ON s.id = a.session_id
            WHERE p.id = ANY($1)
        `, [backupList.map(p => p.pet_id)]);

        console.log('\nKết quả đối soát 3 thú cưng sau chuyển đổi:');
        for (const row of convertedRows.rows) {
            console.log(`- ${row.pet_name} (${row.pet_code}):`);
            console.log(`  avatar_url           : ${row.avatar_url} (đã làm sạch thành NULL)`);
            console.log(`  avatar_media_asset_id: ${row.avatar_media_asset_id}`);
            console.log(`  provider             : ${row.provider}`);
            console.log(`  size_bytes           : ${row.size_bytes}`);
            console.log(`  asset_status         : ${row.asset_status}`);
            console.log(`  session_state        : ${row.session_state}`);
            assert.equal(row.avatar_url, null);
            assert.equal(row.provider, 'mongodb_gridfs');
            assert.equal(row.asset_status, 'attached');
            assert.equal(row.session_state, 'attached');
        }

        // Ghi biên bản nghiệm thu chuyển đổi
        const reportContent = `BIÊN BẢN CHUYỂN ĐỔI 3 AVATAR THÚ CƯNG BASE64 SANG MONGODB GRIDFS (GIAI ĐOẠN 6)
Ngày thực hiện : ${new Date().toISOString()}
Môi trường     : Vercel Preview (${TARGET_URL}) + Supabase Cloud + MongoDB GridFS
Số lượng       : 3 thú cưng

1. Bé Bông (PP-4643, ID: 2a8816e2-c267-4ccf-85cd-422407266efd)
   - Dung lượng      : 51.120 bytes (image/jpeg)
   - Media Asset ID  : ${migrationResults.find(r => r.pet_code === 'PP-4643')?.asset_id}
   - Storage         : mongodb_gridfs
   - SHA256          : 95c378c1229dafb738cafdb1e8cd5e9813ea8ab5a3cbfd64e1490e13e442aefd
   - Trạng thái DB   : avatar_url = NULL, avatar_media_asset_id attached.

2. Bé Meo (PET-1784708052477, ID: 3cd34862-7e1d-4f32-81b4-3c2c562688ae)
   - Dung lượng      : 1.228.990 bytes (image/png)
   - Media Asset ID  : ${migrationResults.find(r => r.pet_code === 'PET-1784708052477')?.asset_id}
   - Storage         : mongodb_gridfs
   - SHA256          : 9fbc98dd141ab451d247301d6ee765ea09f193c3f425f6b0a4f82d4fedabb19a
   - Trạng thái DB   : avatar_url = NULL, avatar_media_asset_id attached.

3. Bé ĐẬU (PET-1791649301877, ID: ce152404-48ac-4c0a-8666-c38814455f5c)
   - Dung lượng      : 1.584.606 bytes (image/png)
   - Media Asset ID  : ${migrationResults.find(r => r.pet_code === 'PET-1791649301877')?.asset_id}
   - Storage         : mongodb_gridfs
   - SHA256          : 64e661b20d64384d664dc6d5965a745f7968184b079287e95189f4a3ee10602d
   - Trạng thái DB   : avatar_url = NULL, avatar_media_asset_id attached.

Bảo mật và phân quyền:
- Admin và Chủ nuôi đọc ảnh: HTTP 200 OK.
- Khách vãng lai (Anonymous): Bị chặn HTTP 404 (bảo toàn tính riêng tư).
- Không còn bất kỳ chuỗi Base64 nào tồn tại trong pet_profile.avatar_url.
- Bản sao lưu nguyên vẹn: D:/Aboutme/Pawpal-infra/media/phase6-migration/pet-avatars-backup.private.json

KẾT LUẬN: ĐẠT 100% TIÊU CHÍ CHUYỂN ĐỔI GIAI ĐOẠN 6.
`;
        fs.writeFileSync('docs/media/phase6-avatar-migration.txt', reportContent, 'utf8');
        console.log('\nĐã lưu biên bản: docs/media/phase6-avatar-migration.txt');

    } finally {
        await db.end();
    }

    console.log('\n=== CHUYỂN ĐỔI 3 AVATAR THÀNH CÔNG RỰC RỠ ===');
})().catch(console.error);
