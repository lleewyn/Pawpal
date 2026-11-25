'use strict';
const { createGridfsStore } = require('./media_gridfs.cjs');

// Operator-only worker, no public route. Deletion is leased by SQL, never by a browser-supplied ObjectId.
async function cleanupMedia({ client, store = createGridfsStore(), execute = false, limit = 10 } = {}) {
    if (!execute) return { executed: false, deleted: 0, failed: 0 };
    if (!client || !Number.isInteger(limit) || limit < 1 || limit > 20) throw Error('MEDIA_CLEANUP_CONFIG_INVALID');
    const claimed = await client.rpc('claim_media_cleanup', { p_limit: limit });
    if (claimed.error || !Array.isArray(claimed.data)) throw Error('MEDIA_CLEANUP_UNAVAILABLE');
    let deleted = 0, failed = 0;
    for (const claim of claimed.data) {
        try {
            if (!/^[a-f0-9]{24}$/.test(claim.mongo_file_id || '') || !/^[a-f0-9-]{36}$/.test(claim.session_id || '') || !/^[a-f0-9-]{36}$/.test(claim.lease || '')) throw Error();
            await store.removeClaimed(claim);
            const result = await client.rpc('finish_media_cleanup', { p_session: claim.session_id, p_lease: claim.lease });
            if (result.error) throw Error();
            deleted++;
        } catch { failed++; } // Keep reservation/lease for reconciliation or retry; never report a deletion as completed.
    }
    return { executed: true, deleted, failed };
}
module.exports = { cleanupMedia };
