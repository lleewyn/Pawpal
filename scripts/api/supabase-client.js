
(function () {
    const FALLBACK_URL = 'https://cpzuvaplseielhgcnqrn.supabase.co';
    const FALLBACK_ANON_KEY = 'sb_publishable_dLV-5AkVgshhkaymnwTelg_fTFzyuwR';

    function readConfig() {
        const explicit = window['__PAWPAL_SUPABASE_CONFIG__'] || window['__SUPABASE_CONFIG__'] || {};
        if (explicit.required) return { url: explicit.url || '', anonKey: explicit.anonKey || '' };
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
        window['SupabaseClientStatus'] = { initialized, configured, error };
    }

    function createBandwidthAwareFetch(projectUrl) {
        const nativeFetch = window.fetch.bind(window);
        const restPrefix = `${projectUrl.replace(/\/$/, '')}/rest/v1/`;
        const inFlightReads = new Map();
        let quotaResponse = null;
        let quotaRetryAt = 0;

        return async function bandwidthAwareFetch(input, init = {}) {
            const url = typeof input === 'string' ? input : input instanceof URL ? input.href : '';
            const method = (init.method || 'GET').toUpperCase();
            // Không gộp thao tác ghi, Auth, RPC POST hoặc request có AbortSignal riêng.
            if (!url.startsWith(restPrefix) || !['GET', 'HEAD'].includes(method)) {
                return nativeFetch(input, init);
            }
            if (quotaResponse && Date.now() < quotaRetryAt) return quotaResponse.clone();

            const headers = [...new Headers(init.headers).entries()].sort(([a], [b]) => a.localeCompare(b));
            const key = JSON.stringify([method, url, headers, init.credentials, init.cache]);
            const canShare = !init.signal;
            if (canShare && inFlightReads.has(key)) return (await inFlightReads.get(key)).clone();

            const request = (async () => {
                const response = await nativeFetch(input, init);
                if (response.status === 402) {
                    const message = await response.clone().text();
                    if (/egress|bandwidth/i.test(message)) {
                        quotaResponse = response.clone();
                        quotaRetryAt = Date.now() + 60_000;
                    }
                }
                return response;
            })();
            if (canShare) inFlightReads.set(key, request);
            try {
                return (await request).clone();
            } finally {
                if (canShare && inFlightReads.get(key) === request) inFlightReads.delete(key);
            }
        };
    }

    function initClient() {
        if (window['SupabaseClient'] && window['SupabaseClientStatus']?.initialized) {
            return window['SupabaseClient'];
        }

        const config = readConfig();
        window['SupabaseClientConfig'] = config;

        if (!window['supabase']) {
            setStatus(false, isConfigured(config.url, config.anonKey), 'Supabase CDN chưa được load.');
            window['SupabaseClient'] = null;
            return null;
        }

        if (!isConfigured(config.url, config.anonKey)) {
            setStatus(false, false, 'Chưa cấu hình Supabase URL / anon key.');
            window['SupabaseClient'] = null;
            return null;
        }

        try {
            const isAdminPortal = /^\/(?:admin(?:\/|$)|pages\/admin(?:\/|$))/i.test(window.location.pathname);
            window['SupabaseClient'] = window['supabase'].createClient(config.url, config.anonKey, {
                global: { fetch: createBandwidthAwareFetch(config.url) },
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    ...(isAdminPortal ? { storageKey: 'pawpal_admin_supabase_auth' } : {}),
                },
            });
            setStatus(true, true, null);
            console.log('[SupabaseClient] Khởi tạo thành công ✓');
            return window['SupabaseClient'];
        } catch (err) {
            console.error('[SupabaseClient] Lỗi khởi tạo:', err);
            setStatus(false, true, err.message);
            window['SupabaseClient'] = null;
            return null;
        }
    }

    window['initSupabaseClient'] = initClient;
    window['getSupabaseClient'] = function () {
        return window['SupabaseClient'] || initClient();
    };

    setStatus(false, isConfigured(readConfig().url, readConfig().anonKey), null);

    let attempts = 0;
    function tryInitClient() {
        attempts++;
        if (window['SupabaseClient'] || attempts >= 10) {
            return;
        }
        initClient();
        
        if (!window['SupabaseClient'] && attempts < 10) {
            window.setTimeout(tryInitClient, 100);
        }
    }

    tryInitClient();
})();
