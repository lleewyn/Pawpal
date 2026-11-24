/**
 * customer-cache.mjs - SWR (Stale-While-Revalidate) Cache & Request Coalescing cho User Portal
 * Tối ưu tốc độ tải tức thì (0ms) cho khách hàng sốt ruột, triệt tiêu trùng lặp và bảo vệ băng thông Supabase.
 */

const memoryCache = new Map();
const pendingRequests = new Map();

// Cấu hình thời gian sống (TTL - ms) theo từng nhóm nghiệp vụ khách hàng
const CACHE_TTL = {
    pets: 60000,          // 60s (hồ sơ thú cưng rất ít biến động)
    bookings: 30000,      // 30s
    orders: 30000,        // 30s
    wishlist: 60000,      // 60s
    loyalty: 45000,       // 45s
    profile: 60000,       // 60s
    notifications: 20000  // 20s
};

function resolveUserId(userOrId) {
    if (!userOrId) return 'anon';
    if (typeof userOrId === 'object') return userOrId.id || userOrId.phone || 'anon';
    return String(userOrId);
}

function getStorageKey(endpoint, userOrId, options = {}) {
    const uid = resolveUserId(userOrId);
    let optHash = '';
    try {
        optHash = JSON.stringify(options || {});
    } catch (_) {}
    return `pawpal_swr:${uid}:${endpoint}:${optHash}`;
}

/**
 * swrFetch - Nạp dữ liệu với cơ chế SWR và Request Deduplication
 * @param {string} endpoint - Tên phân hệ (pets, bookings, orders, wishlist, loyalty, ...)
 * @param {object|string} userOrId - Đối tượng người dùng hoặc ID
 * @param {Function} fetcher - Hàm async gọi API Supabase thực tế
 * @param {object} options - Tùy chọn phân trang/bộ lọc
 * @returns {Promise<any>}
 */
export async function swrFetch(endpoint, userOrId, fetcher, options = {}) {
    const key = getStorageKey(endpoint, userOrId, options);
    const ttl = CACHE_TTL[endpoint] || 30000;
    const now = Date.now();

    // 1. Kiểm tra RAM cache
    let cached = memoryCache.get(key);

    // 2. Nếu RAM chưa có, kiểm tra sessionStorage (giúp F5 vẫn giữ tốc độ 0ms)
    if (!cached) {
        try {
            const raw = sessionStorage.getItem(key);
            if (raw) cached = JSON.parse(raw);
        } catch (_) {}
    }

    // 3. Nếu cache còn tươi trong TTL -> Trả về NGAY LẬP TỨC (0ms perceived latency!)
    if (cached && Number.isFinite(cached.timestamp) && (now - cached.timestamp < ttl)) {
        return cached.data;
    }

    // 4. Request Deduplication (Chống spam click): Nếu đang có request cùng key đang chạy, dùng chung Promise
    if (pendingRequests.has(key)) {
        return pendingRequests.get(key);
    }

    // 5. Chuẩn bị request mới
    const fetchPromise = (async () => {
        try {
            const freshData = await fetcher();
            const record = { timestamp: Date.now(), data: freshData };
            memoryCache.set(key, record);
            try {
                const serialized = JSON.stringify(record);
                if (serialized.length <= 500000) {
                    sessionStorage.setItem(key, serialized);
                }
            } catch (_) {}
            return freshData;
        } finally {
            pendingRequests.delete(key);
        }
    })();

    pendingRequests.set(key, fetchPromise);

    // 6. Cơ chế SWR: Nếu đã có cache (dù đã quá TTL), hiển thị ngay bản cũ trong 0ms và cập nhật ngầm
    if (cached && cached.data) {
        fetchPromise.then(fresh => {
            try {
                if (JSON.stringify(fresh) !== JSON.stringify(cached.data)) {
                    document.dispatchEvent(new CustomEvent(`pawpal_cache_updated:${endpoint}`, {
                        detail: { endpoint, fresh, userOrId }
                    }));
                }
            } catch (_) {}
        }).catch(err => {
            console.warn(`[SWR] Nạp ngầm ${endpoint} gặp sự cố (vẫn giữ dữ liệu cũ):`, err?.message);
        });
        return cached.data;
    }

    // Chưa có bất kỳ cache nào -> Chờ request đầu tiên
    return await fetchPromise;
}

/**
 * invalidateCustomerCache - Hủy cache khi có mutation (thêm, sửa, xóa)
 * @param {string} endpoint - Tên phân hệ cần hủy (bỏ trống để hủy toàn bộ của user)
 * @param {object|string} userOrId - Đối tượng người dùng hoặc ID
 */
export function invalidateCustomerCache(endpoint, userOrId) {
    const uid = userOrId ? resolveUserId(userOrId) : null;

    // Xóa trong RAM
    for (const k of Array.from(memoryCache.keys())) {
        if (!uid || k.includes(`:${uid}:`)) {
            if (!endpoint || k.includes(`:${endpoint}:`)) {
                memoryCache.delete(k);
            }
        }
    }

    // Xóa trong sessionStorage
    try {
        const toRemove = [];
        for (let i = 0; i < sessionStorage.length; i++) {
            const k = sessionStorage.key(i);
            if (k && k.startsWith('pawpal_swr:')) {
                if (!uid || k.includes(`:${uid}:`)) {
                    if (!endpoint || k.includes(`:${endpoint}:`)) {
                        toRemove.push(k);
                    }
                }
            }
        }
        toRemove.forEach(k => sessionStorage.removeItem(k));
    } catch (_) {}
}

/**
 * clearAllCustomerCache - Xóa sạch mọi cache khi đăng xuất
 */
export function clearAllCustomerCache() {
    memoryCache.clear();
    pendingRequests.clear();
    try {
        const toRemove = [];
        for (let i = 0; i < sessionStorage.length; i++) {
            const k = sessionStorage.key(i);
            if (k && k.startsWith('pawpal_swr:')) toRemove.push(k);
        }
        toRemove.forEach(k => sessionStorage.removeItem(k));
    } catch (_) {}
}

// Lắng nghe các sự kiện đăng xuất hoặc cập nhật hồ sơ để dọn dẹp cache
if (typeof window !== 'undefined') {
    window.addEventListener('pawpal_clear_customer_cache', () => clearAllCustomerCache());
    document.addEventListener('auth_state_changed', () => clearAllCustomerCache());
}
