const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { connect } = require('../database/v1/service_import_connection.cjs');

const BACKUP_DIR = 'D:/Aboutme/Pawpal-infra/media/phase6-migration';

(async () => {
    console.log('=== BƯỚC 1: SAO LƯU 3 AVATAR BASE64 TRONG CSDL SUPABASE ===');
    fs.mkdirSync(BACKUP_DIR, { recursive: true });

    const db = await connect();
    try {
        const query = await db.query(`
            SELECT id, customer_id, pet_code, pet_name, gender, date_of_birth, color,
                   avatar_url, avatar_media_asset_id, updated_at
            FROM pet_profile
            WHERE avatar_url LIKE 'data:%'
            ORDER BY id
        `);

        console.log(`Tìm thấy ${query.rows.length} thú cưng có avatar dạng data:`);
        const backupData = [];

        for (const row of query.rows) {
            const match = row.avatar_url.match(/^data:([^;]+);base64,(.+)$/);
            if (!match) {
                console.error(`Không parse được data URL cho bé ${row.pet_name} (${row.id})`);
                continue;
            }
            const mime = match[1];
            const base64Str = match[2];
            const buffer = Buffer.from(base64Str, 'base64');
            const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');

            console.log(`- Bé ${row.pet_name} (${row.pet_code}):`);
            console.log(`  MIME       : ${mime}`);
            console.log(`  Kích thước : ${buffer.length} bytes`);
            console.log(`  SHA256     : ${sha256}`);
            console.log(`  Updated At : ${row.updated_at.toISOString()}`);

            // Lưu file ảnh vật lý ra thư mục backup ngoại vi để đối chiếu
            const ext = mime === 'image/jpeg' ? 'jpg' : mime === 'image/png' ? 'png' : 'webp';
            const imgPath = path.join(BACKUP_DIR, `${row.pet_code}_${row.id}.${ext}`);
            fs.writeFileSync(imgPath, buffer);

            backupData.push({
                pet_id: row.id,
                customer_id: row.customer_id,
                pet_code: row.pet_code,
                pet_name: row.pet_name,
                mime_type: mime,
                size_bytes: buffer.length,
                sha256: sha256,
                updated_at: row.updated_at.toISOString(),
                raw_avatar_url: row.avatar_url,
                backup_image_path: imgPath
            });
        }

        const backupFile = path.join(BACKUP_DIR, 'pet-avatars-backup.private.json');
        fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2), 'utf8');
        console.log(`\nĐã lưu toàn bộ bản sao lưu vào: ${backupFile}`);

    } finally {
        await db.end();
    }
})().catch(console.error);

