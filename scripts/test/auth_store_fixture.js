// Test-only shared store. Production always uses PostgreSQL RPCs.
function createTestStore(now) {
    const challenges = new Map(), limits = new Map();
    return {
        async limit(key, max, duration) {
            let value = limits.get(key);
            if (!value || value.expires <= now()) value = { attempts: 0, expires: now() + duration };
            value.attempts++; limits.set(key, value);
            if (value.attempts > max) throw new Error('Quá nhiều yêu cầu.');
        },
        async issue(challenge) {
            for (const row of challenges.values()) if (row.phone === challenge.phone) row.status = 'used';
            challenges.set(challenge.id, { ...challenge, status: 'pending', attempts: 0, expires: now() + 300000 });
        },
        async activate(id, success) {
            const c = challenges.get(id);
            if (c?.status !== 'pending') throw new Error('Invalid challenge');
            c.status = success ? 'active' : 'failed';
        },
        async claim(id, mode, hash, claimId) {
            const c = challenges.get(id);
            if (!c || c.status !== 'active' || c.expires <= now() || c.attempts >= 5 || c.mode !== mode) throw new Error('Expired challenge');
            c.attempts++;
            if (mode !== 'supabase' && c.hash !== hash) throw new Error('Invalid OTP');
            c.status = 'claimed'; c.claimId = claimId;
            return { ok: true, phone: c.phone, purpose: c.purpose };
        },
        async finish(id, claimId, verified) {
            const c = challenges.get(id);
            if (c?.status !== 'claimed' || c.claimId !== claimId) throw new Error('Claim no longer valid');
            c.status = verified ? 'used' : 'active'; c.claimId = null;
        }
    };
}
module.exports = { createTestStore };
