(function () {
    const client = () => window.getSupabaseClient?.() || window.SupabaseClient;
    function cleanUser(user) {
        if (!user || typeof user !== 'object') return user;
        const { password, password_hash, ...safe } = user;
        return safe;
    }
    // Remove previously cached plaintext credentials, safely handling storage restrictions
    try {
        const storages = [];
        try { if (typeof localStorage !== 'undefined') storages.push(localStorage); else if (typeof window !== 'undefined' && window.localStorage) storages.push(window.localStorage); } catch {}
        try { if (typeof sessionStorage !== 'undefined') storages.push(sessionStorage); else if (typeof window !== 'undefined' && window.sessionStorage) storages.push(window.sessionStorage); } catch {}
        for (const storage of storages) {
            for (const key of ['pawpal_current_user', 'pawpal_users', 'pawpal_users_db']) {
                try {
                    const data = JSON.parse(storage.getItem(key));
                    if (data) storage.setItem(key, JSON.stringify(Array.isArray(data) ? data.map(cleanUser) : cleanUser(data)));
                } catch {}
            }
            try { storage.removeItem('pawpal_temp_tokens'); } catch {}
        }
    } catch {}
    async function request(action, body = {}, authenticated = false) {
        const headers = { 'Content-Type': 'application/json' };
        if (authenticated) {
            const { data, error } = await client()?.auth.getSession() || {};
            if (error || !data?.session) throw new Error('Vui lòng đăng nhập lại.');
            headers.Authorization = `Bearer ${data.session.access_token}`;
        }
        const response = await fetch(`/api/customer/auth/${action}`, { method: 'POST', headers, body: JSON.stringify(body), cache: 'no-store' });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || 'Không thể xử lý yêu cầu.');
        return result;
    }
    async function accept(result) {
        if (result.session) {
            const db = client();
            if (!db) throw new Error('Chưa tải được dịch vụ xác thực.');
            const { error } = await db.auth.setSession(result.session);
            if (error) throw error;
        }
        const user = cleanUser(result.user);
        localStorage.setItem('pawpal_current_user', JSON.stringify(user));
        sessionStorage.setItem('pawpal_current_user', JSON.stringify(user));
        document.dispatchEvent(new CustomEvent('auth_state_changed', { detail: user }));
        return user;
    }
    window.PawpalCustomerAuth = { request, accept, cleanUser };
})();
