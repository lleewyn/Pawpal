/**
 * supabase-client.js
 * Khởi tạo Supabase client dùng chung cho toàn dự án.
 *
 * Cách dùng:
 *   - Trang HTML phải load CDN trước file này:
 *     <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 *   - Sau đó load file này (defer):
 *     <script src="/scripts/api/supabase-client.js" defer></script>
 *   - Truy cập client qua: window.SupabaseClient
 */

(function () {
    // =====================================================
    // ⚙️ CẤU HÌNH — Thay 2 giá trị này từ Supabase Dashboard
    //    Project Settings → API
    // =====================================================
    const SUPABASE_URL      = 'https://ralnsebcwdqelikykxic.supabase.co'; // <-- thay vào đây
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhbG5zZWJjd2RxZWxpa3lreGljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MjU4ODIsImV4cCI6MjA5ODUwMTg4Mn0.mWT7MhkNCA_ICJr2-ggapFrE4Tknpg_ycDTjjRdQDT4';
    // =====================================================

    if (!window.supabase) {
        console.warn('[SupabaseClient] Supabase CDN chưa được load. Hãy thêm script CDN trước file này.');
        window.SupabaseClient = null;
        return;
    }

    if (SUPABASE_URL.includes('your-project-id') || SUPABASE_ANON_KEY.includes('your-anon')) {
        console.warn('[SupabaseClient] Chưa cấu hình SUPABASE_URL / SUPABASE_ANON_KEY. Chạy ở chế độ offline.');
        window.SupabaseClient = null;
        return;
    }

    try {
        window.SupabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('[SupabaseClient] Khởi tạo thành công ✓');
    } catch (err) {
        console.error('[SupabaseClient] Lỗi khởi tạo:', err);
        window.SupabaseClient = null;
    }
})();
