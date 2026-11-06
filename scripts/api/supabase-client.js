
(function () {
    // Migration 108 deployed and verified on Supabase Cloud, 26/10/2026.
    window.PAWPAL_SALES_REPLACEMENTS_ENABLED ??= true;
    const FALLBACK_URL = 'https://cpzuvaplseielhgcnqrn.supabase.co';
    const FALLBACK_ANON_KEY = 'sb_publishable_dLV-5AkVgshhkaymnwTelg_fTFzyuwR';

    function readConfig() {
        const explicit = window['__PAWPAL_SUPABASE_CONFIG__'] || window['__SUPABASE_CONFIG__'] || {};
        if (explicit.required) return { url: explicit.url || '', anonKey: explicit.anonKey || '' };
        return {
            url: explicit.url || explicit.SUPABASE_URL || FALLBACK_URL,
            anonKey: explicit.anonKey || explicit.SUPABASE_ANON_KEY || FALLBACK_ANON_KEY,
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

    function enableCustomerSignals(client) {
        const originalChannel=client.channel.bind(client),originalRemove=client.removeChannel.bind(client),originalRemoveAll=client.removeAllChannels.bind(client),callbacks=new Map();
        const tables=new Set(['notification','pet_profile','care_log','care_log_media','appointment','pet_weight_history','customer','customer_profile','customer_address','customer_phone','customer_membership','sales_order','wishlist','wishlist_product','wishlist_service','paw_point_transaction','customer_voucher','support_ticket_message']);
        let signal,owner=null,generation=0,timer;
        // Existing customer handlers only refetch their authorized snapshots and do not consume row payloads.
        client.channel=(...args)=>{const channel=originalChannel(...args),on=channel.on.bind(channel);channel.on=(type,filter,callback)=>{if(type==='postgres_changes'&&tables.has(filter?.table)&&['*','DELETE'].includes(filter.event)&&typeof callback==='function'&&callback.length===0){if(!callbacks.has(channel))callbacks.set(channel,new Set());callbacks.get(channel).add(callback);}return on(type,filter,callback);};return channel;};
        client.removeChannel=channel=>{callbacks.delete(channel);return originalRemove(channel);};client.removeAllChannels=()=>{++generation;clearTimeout(timer);callbacks.clear();signal=null;owner=null;return originalRemoveAll();};
        const notify=()=>{clearTimeout(timer);timer=setTimeout(()=>{const unique=new Set([...callbacks.values()].flatMap(set=>[...set]));for(const callback of unique)Promise.resolve().then(()=>callback()).catch(()=>{});},200);};
        const adopt=async session=>{const next=session?.user?.id||null;if(next===owner)return;const turn=++generation;clearTimeout(timer);if(signal)originalRemove(signal).catch(()=>{});signal=null;if(owner&&next!==owner)callbacks.clear();owner=next;if(!next)return;
            const result=await client.rpc('get_workspace_signal_context');if(turn!==generation||result.error||result.data?.enabled!==true||result.data.auth_user_id!==next)return;
            let subscribed=false;signal=originalChannel('customer-workspace-'+next).on('postgres_changes',{event:'*',schema:'public',table:'workspace_signal',filter:'auth_user_id=eq.'+next},payload=>{if(turn===generation&&payload.new?.auth_user_id===next)notify();}).subscribe(status=>{if(status==='SUBSCRIBED'){if(subscribed&&turn===generation)notify();subscribed=true;}});
        };
        client.auth.onAuthStateChange((_event,session)=>{setTimeout(()=>adopt(session).catch(()=>{}),0);});
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
            if(!isAdminPortal)enableCustomerSignals(window['SupabaseClient']);
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
