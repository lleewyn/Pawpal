// Cookie stays HttpOnly. No token, contact, pet or receipt is stored in browser storage.
import {onGuestAccountChange} from './guest-account-state.mjs';
const base = '/api/customer/guest/';
const actions = new Set(['context', 'pets', 'profile-read', 'profile-update', 'booking-slots', 'booking-quote', 'booking-create', 'booking-receipt', 'order-quote', 'order-create', 'order-receipt']);
const writes = new Set(['pets', 'profile-update', 'booking-create', 'order-create']);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class GuestCommerceError extends Error {
    constructor(message, {status = 0, uncertain = false,fields = null} = {}) {
        super(message);
        this.name = 'GuestCommerceError';
        this.status = status;
        this.uncertain = uncertain;
        this.fields = fields;
    }
}

function browserHasMember() {
    if (typeof window === 'undefined') return false;
    try {
        const member = typeof window.getCurrentUser === 'function'
            ? window.getCurrentUser()
            : JSON.parse(window.localStorage.getItem('pawpal_current_user') || 'null');
        return !!member?.id && !member.is_temporary;
    } catch {
        // Do not downgrade a malformed member state to a fresh guest transaction.
        return true;
    }
}

export function createGuestCommerceClient({
    fetcher = (...args) => globalThis.fetch(...args),
    locks = globalThis.navigator?.locks,
    hasMember = browserHasMember,
    timeoutMs = 15000
} = {}) {
    if (!Number.isFinite(timeoutMs) || timeoutMs < 1 || timeoutMs > 60000) throw new TypeError('Invalid request timeout');
    let ready = false, starting = null, epoch = 0;
    const inflight = new Map();
    const assertGuest = () => {
        if (hasMember()) throw new GuestCommerceError('Vui lòng tiếp tục bằng tài khoản đang đăng nhập.', {status: 409});
    };
    const invalidate = () => { epoch++; ready = false; starting = null; };

    async function post(action, body, mutating = false) {
        assertGuest();
        const expectedEpoch = epoch;
        const controller = new AbortController();
        let timer;
        try {
            // Race covers response parsing too. A timed-out mutation may have succeeded;
            // callers must retain its request ID and check its receipt before resubmitting.
            const operation = (async () => {
                const response = await fetcher(base + action, {
                    method: 'POST', credentials: 'same-origin', cache: 'no-store',
                    headers: {'Content-Type': 'application/json'}, body, signal: controller.signal
                });
                let data;
                try { data = await response.json(); }
                catch { throw new GuestCommerceError('Chưa đọc được kết quả. Vui lòng kiểm tra trước khi gửi lại.', {status: response.status, uncertain: mutating}); }
                if (response.status === 401) invalidate();
                if (!response.ok || data?.success !== true) {
                    throw new GuestCommerceError(typeof data?.message === 'string' ? data.message : 'Chưa xử lý được yêu cầu. Vui lòng thử lại sau.', {
                        status: response.status, uncertain: mutating && response.status >= 500,fields:data.fields&&typeof data.fields==='object'&&!Array.isArray(data.fields)?data.fields:null
                    });
                }
                if (hasMember()) throw new GuestCommerceError('Tài khoản đăng nhập đã thay đổi. Vui lòng kiểm tra lại kết quả.', {status: 409, uncertain: mutating});
                if (epoch !== expectedEpoch) throw new GuestCommerceError('Phiên đã thay đổi. Vui lòng kiểm tra lại kết quả.', {status: 401, uncertain: mutating});
                return data;
            })();
            return await Promise.race([operation, new Promise((_, reject) => {
                timer = setTimeout(() => {
                    controller.abort();
                    reject(new GuestCommerceError('Chưa nhận được kết quả. Vui lòng kiểm tra trước khi gửi lại.', {uncertain: mutating}));
                }, timeoutMs);
            })]);
        } catch (error) {
            if (error instanceof GuestCommerceError) throw error;
            throw new GuestCommerceError('Kết nối bị gián đoạn. Vui lòng kiểm tra trước khi gửi lại.', {uncertain: mutating});
        } finally { clearTimeout(timer); }
    }

    async function ensureSession() {
        assertGuest();
        if (ready) return;
        if (!starting) {
            const expectedEpoch = epoch;
            // Web Locks serializes first-cookie creation across tabs. Fail before
            // minting a cookie if that coordination is unavailable.
            if (typeof locks?.request !== 'function') throw new GuestCommerceError('Vui lòng dùng trình duyệt có hỗ trợ phiên mua hàng an toàn.');
            const attempt = locks.request('pawpal-guest-commerce-session-v1', async () => {
                assertGuest();
                if (expectedEpoch !== epoch) throw new GuestCommerceError('Phiên đã thay đổi. Vui lòng thử lại.', {status: 401});
                await post('session', '{}');
                if (expectedEpoch === epoch) ready = true;
            });
            starting = attempt;
            attempt.finally(() => { if (starting === attempt) starting = null; }).catch(() => {});
        }
        await starting;
        assertGuest();
    }

    function request(action, payload = {}) {
        if (!actions.has(action)) return Promise.reject(new GuestCommerceError('Chức năng không hợp lệ.', {status: 400}));
        // Snapshot before awaiting bootstrap so edits to the form cannot silently
        // change the payload attached to an existing request ID.
        let body;
        try { assertGuest(); body = JSON.stringify(payload); }
        catch (error) { return Promise.reject(error); }
        const mutating = writes.has(action);
        if (mutating && (typeof payload?.requestId !== 'string' || !uuid.test(payload.requestId))) {
            return Promise.reject(new GuestCommerceError('Cần giữ mã yêu cầu hợp lệ trước khi gửi.', {status: 400}));
        }
        const key = mutating ? action + ':' + payload.requestId : null;
        const prior = key && inflight.get(key);
        if (prior) {
            if (prior.body !== body) return Promise.reject(new GuestCommerceError('Thông tin đang gửi đã thay đổi. Vui lòng chờ kết quả.', {status: 409}));
            return prior.promise;
        }
        const promise = (async () => {
            await ensureSession();
            return post(action, body, mutating);
        })();
        if (key) {
            const entry = {body, promise};
            inflight.set(key, entry);
            promise.finally(() => { if (inflight.get(key) === entry) inflight.delete(key); }).catch(() => {});
        }
        return promise;
    }

    async function end() {
        // No bootstrap: ending an expired/missing session must not mint a new cookie.
        try { return await post('end', '{}'); }
        finally { invalidate(); }
    }
    return {ensureSession, request, end, invalidate};
}

// One shared instance per browser module graph; importing never performs a request.
export const guestCommerce = createGuestCommerceClient();
onGuestAccountChange(()=>guestCommerce.invalidate());
