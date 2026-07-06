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
    const FALLBACK_URL = 'https://ralnsebcwdqelikykxic.supabase.co';
    const FALLBACK_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhbG5zZWJjd2RxZWxpa3lreGljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MjU4ODIsImV4cCI6MjA5ODUwMTg4Mn0.mWT7MhkNCA_ICJr2-ggapFrE4Tknpg_ycDTjjRdQDT4';

    function readConfig() {
        const explicit = window.__PAWPAL_SUPABASE_CONFIG__ || window.__SUPABASE_CONFIG__ || {};
        const storedUrl = window.localStorage?.getItem?.('pawpal_supabase_url');
        const storedAnonKey = window.localStorage?.getItem?.('pawpal_supabase_anon_key');

        return {
            url: explicit.url || explicit.SUPABASE_URL || storedUrl || FALLBACK_URL,
            anonKey: explicit.anonKey || explicit.SUPABASE_ANON_KEY || storedAnonKey || FALLBACK_ANON_KEY,
        };
    }

    function isConfigured(url, anonKey) {
        return Boolean(url && anonKey && !String(url).includes('your-project-id') && !String(anonKey).includes('your-anon'));
    }

    function setStatus(initialized, configured, error) {
        window.SupabaseClientStatus = { initialized, configured, error };
    }

    function initClient() {
        if (window.SupabaseClient && window.SupabaseClientStatus?.initialized) {
            return window.SupabaseClient;
        }

        const config = readConfig();
        window.SupabaseClientConfig = config;

        if (!window.supabase) {
            setStatus(false, isConfigured(config.url, config.anonKey), 'Supabase CDN chưa được load.');
            window.SupabaseClient = null;
            return null;
        }

        if (!isConfigured(config.url, config.anonKey)) {
            setStatus(false, false, 'Chưa cấu hình Supabase URL / anon key.');
            window.SupabaseClient = null;
            return null;
        }

        try {
            window.SupabaseClient = window.supabase.createClient(config.url, config.anonKey, {
                auth: { persistSession: false, autoRefreshToken: false },
            });
            setStatus(true, true, null);
            console.log('[SupabaseClient] Khởi tạo thành công ✓');
            return window.SupabaseClient;
        } catch (err) {
            console.error('[SupabaseClient] Lỗi khởi tạo:', err);
            setStatus(false, true, err.message || String(err));
            window.SupabaseClient = null;
            return null;
        }
    }

    window.initSupabaseClient = initClient;
    window.getSupabaseClient = function () {
        return window.SupabaseClient || initClient();
    };

    setStatus(false, isConfigured(readConfig().url, readConfig().anonKey), null);

    let attempts = 0;
    function tryInitClient() {
        if (window.SupabaseClient || attempts >= 10) {
            return;
        }
        attempts += 1;
        initClient();
        if (!window.SupabaseClient && attempts < 10) {
            window.setTimeout(tryInitClient, 100);
        }
    }

    tryInitClient();
})();
