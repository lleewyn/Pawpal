'use strict';
// Temporary protected Preview probe, copied to a private deployment artifact only.
// Not mounted by the PawPal server and not placed under the repository's api/ directory.
const { timingSafeEqual } = require('node:crypto');
const { getMediaMongoResources } = require('../api/media_mongodb.cjs');

function createProbe({ env = process.env, resources = getMediaMongoResources } = {}) {
    return async function probe(req, res) {
        res.setHeader('Cache-Control', 'private, no-store');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        const expected = env.MEDIA_PREFLIGHT_TOKEN;
        const supplied = req.headers?.['x-pawpal-media-probe'];
        const available = env.VERCEL_ENV === 'preview' && typeof expected === 'string' && expected.length >= 32;
        const authorized = available && typeof supplied === 'string' &&
            Buffer.byteLength(supplied) === Buffer.byteLength(expected) &&
            timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
        if (!authorized) return res.status(404).json({ ok: false });
        if (req.method !== 'POST') {
            res.setHeader('Allow', 'POST');
            return res.status(405).json({ ok: false });
        }
        try {
            const { db } = await resources();
            await db.command({ ping: 1 }, { maxTimeMS: 5000 });
            return res.status(200).json({ ok: true, scope: 'atlas_ping_only', writes: false });
        } catch {
            // Never return driver errors, hostnames, URI, environment values or network topology.
            return res.status(503).json({ ok: false, code: 'MEDIA_PROBE_CONNECTION_FAILED' });
        }
    };
}

module.exports = createProbe();
module.exports.createProbe = createProbe;
