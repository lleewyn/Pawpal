require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

let supabaseAdmin = null;
function getSupabaseAdmin() {
    if (!supabaseAdmin) {
        const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
            throw new Error('Thiếu cấu hình SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trên máy chủ.');
        }
        supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
            auth: { persistSession: false, autoRefreshToken: false }
        });
    }
    return supabaseAdmin;
}

async function handleBannerAction(req, res) {
    try {
        const { action, payload } = req.body || {};
        if (!action || !payload) {
            return res.status(400).json({ success: false, message: 'Dữ liệu yêu cầu không hợp lệ.' });
        }

        const db = getSupabaseAdmin();

        if (action === 'insert') {
            const { data, error } = await db.from('banner').insert(payload).select();
            if (error) throw error;
            return res.json({ success: true, data });
        }

        if (action === 'update') {
            const { id, data: updateData } = payload;
            if (!id || !updateData) {
                return res.status(400).json({ success: false, message: 'Thiếu ID hoặc dữ liệu cập nhật banner.' });
            }
            const { data, error } = await db.from('banner').update(updateData).eq('id', id).select();
            if (error) throw error;
            return res.json({ success: true, data });
        }

        if (action === 'delete') {
            const { id } = payload;
            if (!id) {
                return res.status(400).json({ success: false, message: 'Thiếu ID banner cần xóa.' });
            }
            const { data, error } = await db.from('banner').delete().eq('id', id).select();
            if (error) throw error;
            return res.json({ success: true, data });
        }

        return res.status(400).json({ success: false, message: `Hành động ${action} không được hỗ trợ.` });
    } catch (error) {
        console.error('[AdminSettingsApi] Lỗi xử lý banner:', error);
        return res.status(500).json({ success: false, message: error.message || 'Lỗi hệ thống khi xử lý Banner.' });
    }
}

module.exports = {
    handleBannerAction
};
