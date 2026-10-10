const auth = require('../scripts/api/customer_auth');

const actions = Object.freeze({
    guest: 'guest', lookup: 'lookup', login: 'login',
    'otp/request': 'requestOtp', 'otp/complete': 'completeOtp',
    me: 'me', 'change-password': 'changePassword'
});
module.exports = async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ success: false, message: 'Phương thức không được hỗ trợ.' });
    }
    const url = new URL(req.url, 'https://pawpal.invalid');
    const action = url.searchParams.get('action') || url.pathname.replace(/^\/api\/customer\/auth\//, '');
    if (!Object.hasOwn(actions, action)) return res.status(404).json({ success: false, message: 'Không tìm thấy chức năng.' });
    try {
        if (typeof req.body === 'string') req.body = JSON.parse(req.body);
        if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) throw new Error('Invalid body');
    } catch { return res.status(400).json({ success: false, message: 'Dữ liệu yêu cầu không hợp lệ.' }); }
    // Vercel supplies/overrides this header. Do not trust user-provided X-Forwarded-For.
    const forwarded = process.env.VERCEL ? req.headers['x-vercel-forwarded-for'] : null;
    req.ip = String(forwarded || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
    return auth[actions[action]](req, res);
};
