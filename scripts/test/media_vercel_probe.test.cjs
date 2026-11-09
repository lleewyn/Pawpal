'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createProbe } = require('./media_vercel_probe.cjs');
const token = 'test-only-probe-token-01234567890123456789';
function response() {
    return { headers: {}, setHeader(key, value) { this.headers[key] = value; },
        status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}

test('probe cannot connect in production/development or without its dedicated secret', async () => {
    for (const env of [{ VERCEL_ENV: 'production', MEDIA_PREFLIGHT_TOKEN: token },
        { VERCEL_ENV: 'development', MEDIA_PREFLIGHT_TOKEN: token }, { VERCEL_ENV: 'preview' }]) {
        let connected = false;
        const handler = createProbe({ env, resources: async () => { connected = true; } });
        const res = response();
        await handler({ method: 'POST', headers: { 'x-pawpal-media-probe': token } }, res);
        assert.equal(res.statusCode, 404); assert.equal(connected, false);
    }
});

test('Preview rejects missing/wrong/array tokens before database access', async () => {
    let calls = 0;
    const handler = createProbe({ env: { VERCEL_ENV: 'preview', MEDIA_PREFLIGHT_TOKEN: token }, resources: async () => { calls++; } });
    for (const supplied of [undefined, 'wrong', 'x'.repeat(token.length), [token]]) {
        const res = response();
        await handler({ method: 'POST', headers: { 'x-pawpal-media-probe': supplied } }, res);
        assert.equal(res.statusCode, 404);
    }
    assert.equal(calls, 0);
});

test('authorized probe only pings and does not reveal provider errors or configuration', async () => {
    const env = { VERCEL_ENV: 'preview', MEDIA_PREFLIGHT_TOKEN: token };
    const req = { method: 'POST', headers: { 'x-pawpal-media-probe': token } };
    let calls = 0;
    const handler = createProbe({ env, resources: async () => ({ db: { command: async (command, options) => {
        assert.deepEqual(command, { ping: 1 }); assert.equal(options.maxTimeMS, 5000); calls++;
    } } }) });
    const res = response(); await handler(req, res);
    assert.equal(res.statusCode, 200); assert.equal(calls, 1);
    assert.deepEqual(res.body, { ok: true, scope: 'atlas_ping_only', writes: false });
    assert.equal(res.headers['Cache-Control'], 'private, no-store');
    const fail = createProbe({ env, resources: async () => { throw Error('secret URI should never escape'); } });
    const failed = response(); await fail(req, failed);
    assert.equal(failed.statusCode, 503); assert.ok(!JSON.stringify(failed.body).includes('secret URI'));
    const get = response(); await handler({ ...req, method: 'GET' }, get);
    assert.equal(get.statusCode, 405); assert.equal(calls, 1);
});
