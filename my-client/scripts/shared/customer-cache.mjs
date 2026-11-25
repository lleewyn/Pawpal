const memoryCache = new Map();
const pendingRequests = new Map();
const MAX_ENTRIES = 32;
const STORAGE_PREFIX = 'pawpal_swr:';
const CACHE_TTL = {
    pets: 60000,
    bookings: 30000,
    orders: 30000,
    wishlist: 60000
};

function ownerId(user) {
    return typeof user === 'object' ? user?.id || user?.custId : user;
}

export async function swrFetch(endpoint, user, fetcher, options = {}, onRefresh) {
    const uid = ownerId(user);
    if (!uid) return fetcher();
    const key = JSON.stringify([String(uid), endpoint, Object.entries(options).sort(([a], [b]) => a.localeCompare(b))]);
    const ttl = CACHE_TTL[endpoint] || 30000;
    const cached = memoryCache.get(key);
    const age = cached ? Date.now() - cached.timestamp : Infinity;
    if (cached) {
        memoryCache.delete(key);
        memoryCache.set(key, cached);
        if (age < ttl) return cached.data;
    }

    let pending = pendingRequests.get(key);
    if (!pending) {
        pending = Promise.resolve().then(fetcher).then(data => {
            if (pendingRequests.get(key) === pending) {
                memoryCache.delete(key);
                memoryCache.set(key, { data, timestamp: Date.now() });
                if (memoryCache.size > MAX_ENTRIES) memoryCache.delete(memoryCache.keys().next().value);
            }
            return data;
        }).finally(() => {
            if (pendingRequests.get(key) === pending) pendingRequests.delete(key);
        });
        pendingRequests.set(key, pending);
    }

    // Only views that can apply a fresh response may display a stale snapshot.
    if (cached && onRefresh && age < 2 * ttl) {
        pending.then(data => {
            if (memoryCache.get(key)?.data === data) onRefresh(data);
        }).catch(() => {});
        return cached.data;
    }
    return pending;
}

export function invalidateCustomerCache(endpoint, user) {
    const uid = ownerId(user);
    for (const cache of [memoryCache, pendingRequests]) {
        for (const key of cache.keys()) {
            const [owner, resource] = JSON.parse(key);
            if ((!uid || owner === String(uid)) && (!endpoint || resource === endpoint)) cache.delete(key);
        }
    }
}

export function clearAllCustomerCache() {
    invalidateCustomerCache();
    // Remove private responses left in sessionStorage by older versions.
    try {
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
            const key = sessionStorage.key(i);
            if (key?.startsWith(STORAGE_PREFIX)) sessionStorage.removeItem(key);
        }
    } catch (_) {}
}

if (typeof window !== 'undefined') {
    clearAllCustomerCache();
    window.addEventListener('pawpal_clear_customer_cache', clearAllCustomerCache);
    window.addEventListener('storage', event => {
        if (!event.key || event.key === 'pawpal_current_user') {
            const id = value => { try { return JSON.parse(value)?.id; } catch { return null; } };
            if (!event.key || id(event.oldValue) !== id(event.newValue)) clearAllCustomerCache();
        }
    });
    document.addEventListener('auth_state_changed', clearAllCustomerCache);
}
