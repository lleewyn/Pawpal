
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
        const readRpcNames = new Set([
            'public_service_directory','public_service_reviews','customer_shop_catalog','customer_shop_options',
            'customer_profile_snapshot','own_customer_avatar','own_sales_order_totals','own_order_thumbnails',
            'own_service_booking_summary','own_service_booking_logistics','own_service_booking_execution','own_service_reviews',
            'own_support_tickets','own_loyalty_snapshot','get_staff_workspace','get_staff_customer_context',
            'admin_customer_page','admin_pawpoint_page','admin_pet_page','get_admin_service_booking_page',
            'get_admin_sales_order_page','get_admin_sales_product_page','get_admin_sales_stock_history_page','get_admin_sales_review_page',
            'admin_complaint_page','admin_staff_directory_page','admin_staff_assessment_page','admin_staff_list_page',
            'admin_chat_rule_page_bounded','admin_chat_canned_page'
        ]);
        const readQueue = [];
        let activeReads = 0;
        // Bound read bursts across modules without delaying writes or Auth requests.
        function readFetch(input, init) {
            return new Promise((resolve, reject) => {
                const task = {start() {
                    init.signal?.removeEventListener('abort', abort);
                    if(init.signal?.aborted){reject(init.signal.reason || new DOMException('Aborted','AbortError'));pump();return;}
                    activeReads++;
                    Promise.resolve().then(()=>nativeFetch(input,init)).then(async response=>{
                        // Hold the slot through body transfer, not just response headers.
                        await response.clone().arrayBuffer();return response;
                    }).then(resolve,reject).finally(()=>{activeReads--;pump();});
                }};
                function abort() {
                    const index=readQueue.indexOf(task);
                    if(index>=0)readQueue.splice(index,1);
                    reject(init.signal.reason || new DOMException('Aborted','AbortError'));
                }
                if(init.signal?.aborted){abort();return;}
                init.signal?.addEventListener('abort',abort,{once:true});
                readQueue.push(task);pump();
            });
        }
        function pump() { while(activeReads<4 && readQueue.length)readQueue.shift().start(); }
        let quotaResponse = null;
        let quotaRetryAt = 0;

        return async function bandwidthAwareFetch(input, init = {}) {
            const url = typeof input === 'string' ? input : input instanceof URL ? input.href : '';
            const method = (init.method || 'GET').toUpperCase();
            const rpcName = url.startsWith(restPrefix + 'rpc/') ? url.slice((restPrefix + 'rpc/').length).split('?')[0] : '';
            const readRpc = method === 'POST' && readRpcNames.has(rpcName);
            // Only explicitly reviewed read RPCs may share a POST. All writes bypass this path.
            if (!url.startsWith(restPrefix) || (!['GET', 'HEAD'].includes(method) && !readRpc)) {
                return nativeFetch(input, init);
            }
            if (quotaResponse && Date.now() < quotaRetryAt) return quotaResponse.clone();

            const headers = [...new Headers(init.headers).entries()].sort(([a], [b]) => a.localeCompare(b));
            const key = JSON.stringify([method, url, headers, init.credentials, init.cache, readRpc ? init.body : null]);
            const canShare = !init.signal;
            if (canShare && inFlightReads.has(key)) return (await inFlightReads.get(key)).clone();

            const request = (async () => {
                const response = await readFetch(input, init);
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
