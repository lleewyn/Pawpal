const crypto = require('node:crypto');

function createSupabaseAuthStore(admin) {
    async function rpc(name, args) {
        const result = await admin.rpc(name, args);
        if (result.error) throw new Error('Dịch vụ xác thực chưa sẵn sàng. Vui lòng thử lại sau.');
        return result.data;
    }
    return {
        async limit(key, max, duration) {
            const hashedKey = crypto.createHash('sha256').update(key).digest('hex');
            if (await rpc('customer_auth_rate_limit', { p_key: hashedKey, p_max: max, p_window_seconds: Math.ceil(duration / 1000) }) !== true) throw new Error('Bạn thao tác quá nhiều lần. Vui lòng thử lại sau.');
        },
        async issue({ id, phone, purpose, mode, hash }) {
            await rpc('customer_auth_issue_challenge', { p_id: id, p_phone: phone, p_purpose: purpose, p_mode: mode, p_hash: hash || null });
        },
        async activate(id, success) {
            if (await rpc('customer_auth_activate_challenge', { p_id: id, p_success: success }) !== true && success) throw new Error('Mã xác thực đã hết hạn. Vui lòng yêu cầu mã mới.');
        },
        async claim(id, mode, hash, claimId) {
            const result = await rpc('customer_auth_claim_challenge', { p_id: id, p_mode: mode, p_hash: hash, p_claim: claimId });
            if (!result?.ok) throw new Error(result?.reason === 'invalid' ? 'Mã xác thực không đúng.' : 'Mã xác thực đã hết hạn, bị khóa hoặc được sử dụng. Vui lòng yêu cầu mã mới.');
            return result;
        },
        async finish(id, claimId, verified) {
            if (await rpc('customer_auth_finish_challenge', { p_id: id, p_claim: claimId, p_verified: verified }) !== true) throw new Error('Mã xác thực đã hết hiệu lực.');
        }
    };
}
const hashOtp = (id, code) => crypto.createHash('sha256').update(`${id}:${code}`).digest('hex');
module.exports = { createSupabaseAuthStore, hashOtp };
