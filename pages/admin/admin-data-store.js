// admin-data-store.js - Data Store & Single-Flight Cache Trung Tâm Cho 8 Phân Hệ Admin PawPal
// Tuân thủ nghiêm ngặt Giai đoạn 2 theo PAWPAL_ADMIN_KE_HOACH_TOI_UU_TOC_DO_CHUYEN_PHAN_HE_CHECKLIST.md

(function() {
    'use strict';

    // Cấu hình TTL phân cấp theo tính chất dữ liệu (PERF-02.10)
    const TTL_TIERS = {
        STATIC_CONFIG: 10 * 60 * 1000, // 10 phút: Policy hệ thống, danh mục, cài đặt
        CATALOG:        5 * 60 * 1000, // 5 phút: Bảng giá dịch vụ, danh sách sản phẩm, voucher
        LIST:           2 * 60 * 1000, // 2 phút: Danh sách khách hàng, thú cưng, nhân sự
        OPERATIONAL:   30 * 1000,      // 30 giây: Lịch hẹn, đơn hàng, tồn kho, khiếu nại
        REALTIME:      10 * 1000       // 10 giây: Metrics bảng điều khiển thời gian thực
    };

    const MAX_CACHE_ENTRIES = 200; // Giới hạn kích thước bộ nhớ in-memory (PERF-02.14)
    const _store = new Map();
    const _inFlightPromises = new Map();
    let _cacheGeneration = 0;

    // Lấy định danh người dùng quản trị hiện tại để cô lập cache hoàn toàn (PERF-02.03, PERF-02.12)
    function getCurrentActorId() {
        try {
            const raw = sessionStorage.getItem('pawpal_admin_user') || localStorage.getItem('pawpal_admin_user');
            if (raw) {
                const user = typeof raw === 'string' ? JSON.parse(raw) : raw;
                return user.id || user.auth_user_id || user.email || 'guest';
            }
        } catch (e) {}
        return 'guest';
    }

    // Lấy chi nhánh của quản trị viên hiện tại (PERF-02.03, PERF-T16)
    function getCurrentBranchId() {
        try {
            const raw = sessionStorage.getItem('pawpal_admin_user') || localStorage.getItem('pawpal_admin_user');
            if (raw) {
                const user = typeof raw === 'string' ? JSON.parse(raw) : raw;
                return user.branch_id || user.branchId || 'default_branch';
            }
        } catch (e) {}
        return 'default_branch';
    }

    // Xây dựng cache key chuẩn hóa, gắn kèm actor scope và params (PERF-02.03)
    function buildKey(resource, params = {}, scope = {}) {
        const actor = scope.actorId || getCurrentActorId();
        const branch = scope.branchId || getCurrentBranchId();
        let paramStr = '';
        if (params && typeof params === 'object') {
            const keys = Object.keys(params).sort();
            paramStr = keys.map(k => `${k}=${encodeURIComponent(String(params[k] ?? ''))}`).join('&');
        } else if (params) {
            paramStr = String(params);
        }
        return `${actor}:${branch}:${resource}${paramStr ? ':' + paramStr : ''}`;
    }

    // Cơ chế LRU eviction để bảo vệ dung lượng RAM (PERF-02.14)
    function evictOldestIfFull() {
        if (_store.size >= MAX_CACHE_ENTRIES) {
            // Map keys() trả về theo thứ tự chèn, lấy phần tử đầu tiên để xóa
            const oldestKey = _store.keys().next().value;
            if (oldestKey) _store.delete(oldestKey);
        }
    }

    /**
     * Truy xuất dữ liệu với Single-Flight và Stale-While-Revalidate (PERF-02.04, PERF-02.05)
     * @param {string} key - Cache key hoặc tên tài nguyên
     * @param {Function} fetcherFn - Hàm bất đồng bộ gọi Supabase
     * @param {Object} options - { ttlMs, force, backgroundRevalidate }
     */
    async function fetchResource(key, fetcherFn, options = {}) {
        const ttlMs = options.ttlMs || TTL_TIERS.OPERATIONAL;
        const force = Boolean(options.force);
        const now = Date.now();

        let entry = _store.get(key);

        // 1. Single-Flight: Nếu đang có request cùng key đang bay, dùng lại promise đó (PERF-02.04)
        if (_inFlightPromises.has(key)) {
            return _inFlightPromises.get(key);
        }

        // 2. Cache Hit: Nếu cache hợp lệ trong TTL và không force (PERF-02.05)
        if (!force && entry && entry.hasLoaded && (now - entry.updatedAt < ttlMs) && !entry.stale) {
            return entry.data;
        }

        // 3. Stale-While-Revalidate: Nếu có dữ liệu cũ nhưng đã hết hạn hoặc bị đánh dấu stale
        if (!force && entry && entry.hasLoaded && (entry.stale || now - entry.updatedAt >= ttlMs)) {
            // Chạy revalidate ngầm ở nền nếu cho phép, trả về dữ liệu cũ ngay lập tức (0ms UI wait)
            if (options.backgroundRevalidate !== false) {
                revalidateInBackground(key, fetcherFn, entry.version);
                return entry.data;
            }
        }

        // 4. Bắt đầu fetch mới
        evictOldestIfFull();
        const baseVersion = entry?.version || 0;
        const nextVersion = baseVersion + 1;
        const generation = _cacheGeneration;
        // Đăng ký cả request đang tải để invalidation giữa chừng không bị mất.
        _store.set(key, entry || { hasLoaded: false, version: baseVersion, stale: true });

        const job = (async () => {
            try {
                const result = await Promise.resolve().then(fetcherFn);
                const latestEntry = _store.get(key);
                // Xử lý race-condition: Chỉ commit nếu phiên bản hiện tại khớp với lúc fetch (PERF-02.09)
                if (generation === _cacheGeneration && latestEntry?.version === baseVersion) {
                    _store.set(key, {
                        data: result,
                        status: 'success',
                        error: null,
                        updatedAt: Date.now(),
                        hasLoaded: true, // Tách biệt hasLoaded khỏi data.length (PERF-02.06)
                        version: nextVersion,
                        cacheKey: key,
                        stale: false
                    });
                }
                return result;
            } catch (err) {
                const latestEntry = _store.get(key);
                if (generation === _cacheGeneration && latestEntry?.version === baseVersion) {
                    _store.set(key, {
                        data: latestEntry?.data ?? null,
                        status: 'error',
                        error: err,
                        updatedAt: latestEntry?.updatedAt || 0,
                        hasLoaded: latestEntry?.hasLoaded || false,
                        version: nextVersion,
                        cacheKey: key,
                        stale: true
                    });
                }
                throw err;
            } finally {
                if (_inFlightPromises.get(key) === job) _inFlightPromises.delete(key);
            }
        })();

        _inFlightPromises.set(key, job);
        return job;
    }

    // Revalidate ngầm ở nền không khóa luồng chính (PERF-02.05)
    function revalidateInBackground(key, fetcherFn, baseVersion) {
        if (_inFlightPromises.has(key)) return;
        const nextVersion = baseVersion + 1;
        const generation = _cacheGeneration;
        const bgJob = (async () => {
            try {
                const fresh = await Promise.resolve().then(fetcherFn);
                const current = _store.get(key);
                if (generation === _cacheGeneration && current?.version === baseVersion) {
                    _store.set(key, {
                        ...current,
                        data: fresh,
                        status: 'success',
                        error: null,
                        updatedAt: Date.now(),
                        hasLoaded: true,
                        version: nextVersion,
                        stale: false
                    });
                    // Bắn sự kiện cập nhật để UI render lại dữ liệu mới nhất nếu đang mở
                    window.dispatchEvent(new CustomEvent('pawpal:data-refreshed', {
                        detail: { key, data: fresh }
                    }));
                }
            } catch (e) {
                console.warn(`[DataStore] Revalidate ngầm thất bại cho ${key}:`, e);
            } finally {
                if (_inFlightPromises.get(key) === bgJob) _inFlightPromises.delete(key);
            }
        })();
        _inFlightPromises.set(key, bgJob);
    }

    /**
     * Vô hiệu hóa cache chính xác theo pattern hoặc key (PERF-02.08, PERF-02.13)
     * @param {string|RegExp} patternOrKey - Tên key cụ thể hoặc tiền tố ('customer:*', 'order:*')
     */
    function invalidate(patternOrKey) {
        if (!patternOrKey) return;
        if (typeof patternOrKey === 'string' && patternOrKey.includes('*')) {
            const regex = new RegExp('^' + patternOrKey.replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&').replace(/\*/g, '.*') + '$');
            for (const [k, v] of _store.entries()) {
                if (regex.test(k)) {
                    _store.set(k, { ...v, stale: true, updatedAt: 0, version: v.version + 1 });
                }
            }
        } else if (typeof patternOrKey === 'string') {
            for (const [k, v] of _store.entries()) {
                if (k === patternOrKey || k.includes(patternOrKey)) {
                    _store.set(k, { ...v, stale: true, updatedAt: 0, version: v.version + 1 });
                }
            }
        } else if (patternOrKey instanceof RegExp) {
            for (const [k, v] of _store.entries()) {
                if (patternOrKey.test(k)) {
                    _store.set(k, { ...v, stale: true, updatedAt: 0, version: v.version + 1 });
                }
            }
        }
    }

    /**
     * Xóa sạch toàn bộ dữ liệu trong bộ nhớ (khi đăng xuất, chuyển tài khoản hoặc đổi chi nhánh) (PERF-02.12)
     */
    function clearAll() {
        _cacheGeneration++;
        _store.clear();
        _inFlightPromises.clear();
        _realtimeDebounceTimers.forEach(timer => clearTimeout(timer));
        _realtimeDebounceTimers.clear();
        _hiddenRealtimeRefreshes.clear();
        console.log('[DataStore] Đã dọn dẹp sạch toàn bộ cache bộ nhớ.');
    }

    /**
     * Đọc trực tiếp dữ liệu đang có trong cache (đồng bộ)
     */
    function peek(key) {
        return _store.get(key) || null;
    }

    // Danh sách đăng ký lắng nghe mutation (PERF-02.15)
    const _mutationListeners = [];

    /**
     * Đăng ký lắng nghe mutation từ các phân hệ khác
     */
    function subscribeMutations(handler) {
        if (typeof handler === 'function') {
            _mutationListeners.push(handler);
        }
        return () => {
            const idx = _mutationListeners.indexOf(handler);
            if (idx !== -1) _mutationListeners.splice(idx, 1);
        };
    }

    /**
     * Phát sự kiện mutation liên phân hệ sau khi DB commit thành công (PERF-02.15)
     */
    function emitMutation(first, second, third) {
        let eventName = 'pawpal:mutation';
        let detail = {};
        if (typeof first === 'string' && first.startsWith('pawpal:')) {
            eventName = first;
            detail = second || {};
        } else if (first && typeof first === 'object') {
            detail = first;
            eventName = `pawpal:${first.entity}-mutated`;
        } else {
            const entity = first;
            const action = second;
            detail = { entity, action, ...(third || {}) };
            eventName = `pawpal:${entity}-mutated`;
        }
        window.dispatchEvent(new CustomEvent(eventName, { detail }));
        window.dispatchEvent(new CustomEvent('pawpal:mutation', { detail }));
        _mutationListeners.forEach(fn => {
            try { fn(detail); } catch (e) { console.warn('[DataStore] Lỗi listener mutation:', e); }
        });
    }

    // ====================================================================
    // LẮNG NGHE SỰ KIỆN INVALIDATION LIÊN PHÂN HỆ (PERF-02.15)
    // ====================================================================
    function invalidateDashboard(resources) {
        // Giữ cache Dashboard cũ tương thích, cache mới vô hiệu hóa theo từng nhóm.
        invalidate(/dashboard(?!:)/);
        invalidate('dashboard:summary');
        resources.forEach(resource => invalidate(`dashboard:${resource}:*`));
    }

    window.addEventListener('pawpal:order-mutated', () => {
        invalidate('order');
        invalidate('sales_order');
        invalidate('stock');
        invalidateDashboard(['orders', 'products']);
    });

    window.addEventListener('pawpal:appointment-mutated', () => {
        invalidate('appointment');
        invalidate('service');
        invalidate('staff');
        invalidateDashboard(['appointments', 'staff']);
    });

    window.addEventListener('pawpal:customer-mutated', () => {
        invalidate('customer');
        invalidate('pawpoint');
        invalidateDashboard(['customer-count', 'profiles']);
    });

    window.addEventListener('pawpal:pet-mutated', () => {
        invalidate('pet');
        invalidate('customer');
        invalidateDashboard(['pet-count', 'pets']);
    });

    window.addEventListener('pawpal:ticket-mutated', () => {
        invalidate('ticket');
        invalidate('complaint');
        invalidateDashboard(['tickets']);
    });

    window.addEventListener('pawpal:setting-mutated', () => {
        invalidate('setting');
        invalidate('voucher');
        invalidate('banner');
    });

    // Tự động xóa cache nhạy cảm khi đăng xuất hoặc đổi phiên (PERF-02.12)
    window.addEventListener('pawpal:auth-logout', clearAll);

    // ====================================================================
    // THỐNG KÊ METRICS VÀ TELEMETRY REALTIME (PERF-04.10)
    // ====================================================================
    const _metrics = {
        realtimeEvents: 0,
        refreshes: 0,
        invalidations: 0,
        activeChannels: new Set()
    };

    function recordMetric(type, detail) {
        if (type === 'realtime') _metrics.realtimeEvents++;
        if (type === 'refresh') _metrics.refreshes++;
        if (type === 'invalidate') _metrics.invalidations++;
        if (type === 'channel-add' && detail) _metrics.activeChannels.add(detail);
        if (type === 'channel-remove' && detail) _metrics.activeChannels.delete(detail);
    }

    /**
     * Kiểm tra xem một phân hệ có đang hiển thị trên màn hình hay không (PERF-04.03)
     */
    function isModuleActive(moduleName) {
        try {
            return sessionStorage.getItem('pawpal_admin_active_module') === moduleName;
        } catch (e) {
            return false;
        }
    }

    /**
     * Debounce chuẩn hóa chống bão sự kiện (Burst Events) (PERF-04.04)
     */
    function debounce(fn, waitMs = 300) {
        let timer = null;
        return function(...args) {
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => {
                timer = null;
                fn.apply(this, args);
            }, waitMs);
        };
    }

    // Map lưu bộ đệm debounce cho từng phân hệ
    const _realtimeDebounceTimers = new Map();
    const _hiddenRealtimeRefreshes = new Map();

    if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) return;
            for (const [moduleName, options] of _hiddenRealtimeRefreshes) {
                if (!isModuleActive(moduleName)) continue;
                _hiddenRealtimeRefreshes.delete(moduleName);
                handleRealtimeChange(options);
            }
        });
    }
    window.addEventListener('admin:module-show', () => {
        for (const [moduleName, options] of _hiddenRealtimeRefreshes) {
            if (!isModuleActive(moduleName)) continue;
            _hiddenRealtimeRefreshes.delete(moduleName);
            handleRealtimeChange(options);
        }
    });

    /**
     * Bộ xử lý chuẩn hóa cho sự kiện Supabase Realtime (PERF-04.03, PERF-04.04, PERF-04.05)
     * - Nếu module KHÔNG active: Chỉ vô hiệu hóa cache (0ms network, 0 CPU).
     * - Nếu module ĐANG active: Gom cụm debounce 300ms rồi thực hiện làm mới giao diện với { force: true }.
     */
    function handleRealtimeChange({ moduleName, invalidatePattern, onActiveRefresh, debounceMs = 300 }) {
        recordMetric('realtime');
        
        // Luôn luôn invalidate cache key tương ứng trong DataStore (PERF-04.04)
        if (invalidatePattern) {
            invalidate(invalidatePattern);
            recordMetric('invalidate');
        }

        // Nếu module hiện không hiển thị: KHÔNG kích hoạt fetch mạng hoặc DOM render (PERF-04.03)
        if (!isModuleActive(moduleName)) {
            return;
        }

        if (typeof document !== 'undefined' && document.hidden) {
            _hiddenRealtimeRefreshes.set(moduleName, { moduleName, onActiveRefresh, debounceMs });
            return;
        }

        // Nếu module đang hiển thị: Gom cụm debounce và gọi callback refresh (PERF-04.04)
        if (typeof onActiveRefresh === 'function') {
            const timerKey = `${moduleName}:realtime_refresh`;
            if (_realtimeDebounceTimers.has(timerKey)) {
                clearTimeout(_realtimeDebounceTimers.get(timerKey));
            }

            const t = setTimeout(async () => {
                _realtimeDebounceTimers.delete(timerKey);
                // Kiểm tra lại trạng thái active tại thời điểm timer hết hạn
                if (isModuleActive(moduleName)) {
                    if (typeof document !== 'undefined' && document.hidden) {
                        _hiddenRealtimeRefreshes.set(moduleName, { moduleName, onActiveRefresh, debounceMs });
                        return;
                    }
                    recordMetric('refresh');
                    try {
                        await onActiveRefresh();
                    } catch (err) {
                        console.warn(`[DataStore] Lỗi refresh realtime cho ${moduleName}:`, err);
                    }
                }
            }, debounceMs);

            _realtimeDebounceTimers.set(timerKey, t);
        }
    }

    // ====================================================================
    // EXPORT GLOBAL API
    // ====================================================================
    const PawpalDataStore = {
        TTL: TTL_TIERS,
        TTL_TIERS: TTL_TIERS,
        buildKey,
        fetch: fetchResource,
        invalidate,
        clear: clearAll,
        peek,
        emitMutation,
        subscribeMutations,
        isModuleActive,
        debounce,
        handleRealtimeChange,
        recordMetric,
        getStats: () => ({
            cachedEntries: _store.size,
            inFlightCount: _inFlightPromises.size,
            realtimeEvents: _metrics.realtimeEvents,
            activeRefreshes: _metrics.refreshes,
            pendingRealtimeRefreshes: _realtimeDebounceTimers.size,
            invalidations: _metrics.invalidations,
            activeChannelsCount: _metrics.activeChannels.size
        })
    };

    window.PawpalDataStore = PawpalDataStore;
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = PawpalDataStore;
    }

    console.log('[PawpalDataStore] Khởi tạo hệ thống Cache Single-Flight & Realtime Dispatcher trung tâm thành công ✓');
})();
