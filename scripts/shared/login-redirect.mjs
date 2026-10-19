export function safeLoginTarget(value, origin) {
    try {
        const url = new URL(value, origin);
        if (!value || url.origin !== origin || !['/pages/user/', '/pages/user', '/user', '/user/'].includes(url.pathname)) return '/pages/user/#profile';
        return url.pathname + url.search + url.hash;
    } catch { return '/pages/user/#profile'; }
}
export function consumeLoginTarget(storage, origin, queryTarget) {
    const stored = storage.getItem('pawpal_redirect_after_login');
    storage.removeItem('pawpal_redirect_after_login');
    return safeLoginTarget(stored || queryTarget, origin);
}
