'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const { cleanupMedia } = require('../api/media_cleanup.cjs');
test('cleanup is inert by default and only releases quota after leased physical deletion', async () => {
    let calls = [];
    const claim = { session_id: '10000000-0000-0000-0000-000000000001', lease: '20000000-0000-0000-0000-000000000001', mongo_file_id: 'a'.repeat(24) };
    const client = { rpc: async name => { calls.push(name); return { data: [claim] }; } };
    const store = { removeClaimed: async () => calls.push('delete') };
    assert.deepEqual(await cleanupMedia({ client, store }), { executed: false, deleted: 0, failed: 0 });
    assert.equal(calls.length, 0);
    assert.deepEqual(await cleanupMedia({ client, store, execute: true }), { executed: true, deleted: 1, failed: 0 });
    assert.deepEqual(calls, ['claim_media_cleanup', 'delete', 'finish_media_cleanup']);
    calls = [];
    store.removeClaimed = async () => { throw Error('provider failed'); };
    assert.deepEqual(await cleanupMedia({ client, store, execute: true }), { executed: true, deleted: 0, failed: 1 });
    assert.deepEqual(calls, ['claim_media_cleanup']);
});
