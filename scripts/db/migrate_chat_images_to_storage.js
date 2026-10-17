/**
 * PAWPAL-ER CHATBOT: BATCH MIGRATION BASE64 IMAGES -> SUPABASE STORAGE
 * File: scripts/db/migrate_chat_images_to_storage.js
 * Description:
 *   Quét các tin nhắn cũ trong bảng chat_message chứa dữ liệu data:image/base64,
 *   tách ảnh, băm SHA-256, đẩy lên Supabase Storage bucket 'chat-attachments',
 *   thay thế nội dung bằng URL chuẩn, sao lưu bản cũ phục vụ rollback an toàn.
 * Tuân thủ: PR-05 CB-13
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[Migration] Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong file .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const BACKUP_LOG_FILE = path.join(__dirname, 'migration_backup_chat_images.json');

async function migrateChatImagesToStorage({ batchSize = 50, dryRun = false } = {}) {
    console.log(`[Migration] Bắt đầu quét tin nhắn chứa base64 ảnh (Batch size: ${batchSize}, Dry-run: ${dryRun})...`);

    // 1. Quét các tin nhắn có chứa "data:image/"
    const { data: messages, error } = await supabase
        .from('chat_message')
        .select('id, conversation_id, content, raw_content, created_at')
        .ilike('content', '%data:image/%')
        .limit(batchSize);

    if (error) {
        console.error('[Migration] Lỗi truy vấn chat_message:', error.message);
        return { success: false, error: error.message };
    }

    if (!messages || messages.length === 0) {
        console.log('[Migration] Không còn tin nhắn nào chứa base64 thô. Database đã hoàn toàn sạch!');
        return { success: true, migratedCount: 0, totalBytesSaved: 0 };
    }

    console.log(`[Migration] Tìm thấy ${messages.length} tin nhắn cần chuyển đổi sang Supabase Storage.`);

    const backupRecords = [];
    let totalBytesSaved = 0;
    let migratedCount = 0;

    const base64Regex = /!\[([^\]]*)\]\((data:image\/([a-zA-Z0-9]+);base64,([^\)]+))\)/g;

    for (const msg of messages) {
        let updatedContent = msg.content;
        let isModified = false;
        let match;

        // Lưu bản ghi backup
        const backupEntry = {
            id: msg.id,
            conversation_id: msg.conversation_id,
            original_content: msg.content,
            original_raw_content: msg.raw_content,
            images: [],
            migrated_at: new Date().toISOString()
        };

        // Reset regex index
        base64Regex.lastIndex = 0;

        while ((match = base64Regex.exec(msg.content)) !== null) {
            const altText = match[1] || 'attachment';
            const fullDataUrl = match[2];
            const mimeSubtype = match[3] || 'jpeg';
            const base64Data = match[4];

            try {
                const buffer = Buffer.from(base64Data, 'base64');
                const originalSize = buffer.length;
                const sha256Hash = crypto.createHash('sha256').update(buffer).digest('hex');

                const fileName = `migrated/${msg.conversation_id || 'general'}/${msg.id}_${sha256Hash.slice(0, 10)}.${mimeSubtype}`;

                let publicUrl = '';
                if (!dryRun) {
                    // Upload lên bucket chat-attachments
                    const { error: uploadError } = await supabase.storage
                        .from('chat-attachments')
                        .upload(fileName, buffer, {
                            contentType: `image/${mimeSubtype}`,
                            upsert: true
                        });

                    if (uploadError) {
                        console.warn(`[Migration] Lỗi upload ảnh msg ${msg.id}:`, uploadError.message);
                        continue;
                    }

                    const { data: publicUrlData } = supabase.storage
                        .from('chat-attachments')
                        .getPublicUrl(fileName);

                    publicUrl = publicUrlData?.publicUrl || fileName;
                } else {
                    publicUrl = `https://mock-storage.pawpal.vn/chat-attachments/${fileName}`;
                }

                // Thay thế data URL bằng URL của Storage
                const newMd = `![${altText}](${publicUrl})`;
                updatedContent = updatedContent.replace(fullDataUrl, publicUrl);
                isModified = true;

                const bytesSaved = Math.max(0, fullDataUrl.length - publicUrl.length);
                totalBytesSaved += bytesSaved;

                backupEntry.images.push({
                    sha256: sha256Hash,
                    original_size_bytes: originalSize,
                    file_path: fileName,
                    public_url: publicUrl
                });
            } catch (e) {
                console.error(`[Migration] Lỗi xử lý ảnh của tin nhắn ${msg.id}:`, e.message);
            }
        }

        if (isModified) {
            backupRecords.push(backupEntry);
            if (!dryRun) {
                const { error: updateError } = await supabase
                    .from('chat_message')
                    .update({
                        content: updatedContent,
                        raw_content: updatedContent
                    })
                    .eq('id', msg.id);

                if (updateError) {
                    console.error(`[Migration] Lỗi cập nhật chat_message ${msg.id}:`, updateError.message);
                } else {
                    migratedCount++;
                }
            } else {
                migratedCount++;
            }
        }
    }

    // Ghi file backup phục vụ rollback
    if (backupRecords.length > 0) {
        let existingBackup = [];
        if (fs.existsSync(BACKUP_LOG_FILE)) {
            try {
                existingBackup = JSON.parse(fs.readFileSync(BACKUP_LOG_FILE, 'utf8'));
            } catch (e) {}
        }
        existingBackup.push(...backupRecords);
        fs.writeFileSync(BACKUP_LOG_FILE, JSON.stringify(existingBackup, null, 2), 'utf8');
        console.log(`[Migration] Đã lưu ${backupRecords.length} bản ghi sao lưu vào ${BACKUP_LOG_FILE}`);
    }

    console.log(`[Migration] Hoàn tất đợt di trú: ${migratedCount} tin nhắn đã chuyển đổi, giải phóng ~${(totalBytesSaved / 1024).toFixed(1)} KB.`);
    return {
        success: true,
        migratedCount,
        totalBytesSaved,
        backupFile: BACKUP_LOG_FILE
    };
}

// Rollback function
async function rollbackMigration() {
    if (!fs.existsSync(BACKUP_LOG_FILE)) {
        console.error('[Rollback] Không tìm thấy file sao lưu:', BACKUP_LOG_FILE);
        return { success: false, error: 'Backup file not found' };
    }

    const backupRecords = JSON.parse(fs.readFileSync(BACKUP_LOG_FILE, 'utf8'));
    console.log(`[Rollback] Đang khôi phục ${backupRecords.length} bản ghi...`);

    let restoredCount = 0;
    for (const record of backupRecords) {
        const { error } = await supabase
            .from('chat_message')
            .update({
                content: record.original_content,
                raw_content: record.original_raw_content
            })
            .eq('id', record.id);

        if (!error) restoredCount++;
    }

    console.log(`[Rollback] Đã khôi phục thành công ${restoredCount}/${backupRecords.length} bản ghi.`);
    return { success: true, restoredCount };
}

if (require.main === module) {
    const isRollback = process.argv.includes('--rollback');
    const isDryRun = process.argv.includes('--dry-run');

    if (isRollback) {
        rollbackMigration()
            .then(() => { process.exitCode = 0; })
            .catch(err => {
                console.error('[Rollback] Thất bại:', err);
                process.exitCode = 1;
            });
    } else {
        migrateChatImagesToStorage({ dryRun: isDryRun })
            .then(() => { process.exitCode = 0; })
            .catch(err => {
                console.error('[Migration] Thất bại:', err);
                process.exitCode = 1;
            });
    }
}

module.exports = {
    migrateChatImagesToStorage,
    rollbackMigration
};
