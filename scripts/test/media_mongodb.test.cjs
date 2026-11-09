'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createMediaMongoStore, readMediaMongoConfig } = require('../api/media_mongodb.cjs');
const { gridfsCollectionNames } = require('./media_mongodb_preflight.cjs');

const validEnv = () => ({ MONGODB_URI: 'mongodb+srv://media_user:test-secret@cluster.example.mongodb.net/?retryWrites=true&w=majority', MONGODB_DB: 'pawpal_media' });

test('dedicated media namespace never mixes with an unrelated generic database URI', () => {
    assert.throws(() => readMediaMongoConfig({ ...validEnv(), PAWPAL_MEDIA_MONGODB_DB: 'media_only' }), { code: 'MEDIA_MONGODB_CONFIG_MISSING' });
    const config = readMediaMongoConfig({ ...validEnv(), PAWPAL_MEDIA_MONGODB_URI: validEnv().MONGODB_URI, PAWPAL_MEDIA_MONGODB_DB: 'media_only' });
    assert.equal(config.database, 'media_only');
});

test('preflight checks only exact GridFS collection names, compatible with Atlas shared filters', async () => {
    const checked = [];
    const db = { listCollections(filter, options) {
        assert.equal(typeof filter.name, 'string');
        assert.deepEqual(Object.keys(filter), ['name']);
        assert.equal(options.nameOnly, true);
        checked.push(filter.name);
        return { async toArray() { return filter.name.endsWith('.files') ? [{ name: filter.name }] : []; } };
    } };
    assert.deepEqual(await gridfsCollectionNames(db, 'pawpalMedia'), [{ name: 'pawpalMedia.files' }]);
    assert.deepEqual(checked.sort(), ['pawpalMedia.chunks', 'pawpalMedia.files']);
});

test('missing/invalid config fails closed without exposing the URI or password', () => {
    assert.throws(() => readMediaMongoConfig({}), { code: 'MEDIA_MONGODB_CONFIG_MISSING' });
    for (const override of [
        { MONGODB_URI: 'mongodb://localhost:27017/pawpal' },
        { MONGODB_URI: validEnv().MONGODB_URI.replace('.mongodb.net', '.mongodb.net.evil.example') },
        { MONGODB_URI: validEnv().MONGODB_URI + '&tls=false' },
        { MONGODB_URI: validEnv().MONGODB_URI + '&tlsAllowInvalidCertificates=true' },
        { MONGODB_URI: validEnv().MONGODB_URI + '&maxPoolSize=200' },
        { MONGODB_URI: validEnv().MONGODB_URI + '&retryWrites=true' },
        { MONGODB_URI: validEnv().MONGODB_URI.replace('/?', '/wrong_database?') },
        { MONGODB_DB: '../other' }, { MONGODB_MEDIA_BUCKET: 'fs.chunks' },
        { MEDIA_UPLOAD_ENABLED: 'yes' }, { MEDIA_VIDEO_ENABLED: 'true' }
    ]) {
        assert.throws(() => readMediaMongoConfig({ ...validEnv(), ...override }), error => {
            assert.equal(error.code, 'MEDIA_MONGODB_CONFIG_INVALID');
            assert.ok(!error.stack.includes('test-secret'));
            assert.ok(!error.stack.includes('mongodb+srv://'));
            return true;
        });
    }
    const config = readMediaMongoConfig(validEnv());
    assert.equal(config.uploadEnabled, false);
    assert.equal(config.videoEnabled, false);
    assert.equal(config.bucket, 'pawpalMedia');
});

test('concurrent requests share one bounded TLS pool and one GridFS handle without writes', async () => {
    let clients = 0, connects = 0, closes = 0, buckets = 0;
    let observedOptions;
    const db = { marker: 'configured database' };
    class Client {
        constructor(uri, options) { clients++; observedOptions = options; }
        async connect() { connects++; await new Promise(resolve => setImmediate(resolve)); }
        db(name) { assert.equal(name, 'pawpal_media'); return db; }
        async close() { closes++; }
    }
    class Bucket { constructor(database, options) { assert.equal(database, db); assert.equal(options.bucketName, 'pawpalMedia'); buckets++; } }
    const store = createMediaMongoStore({ Client, Bucket, env: validEnv() });
    assert.equal(clients, 0, 'constructing a store must not connect');
    const results = await Promise.all(Array.from({ length: 12 }, () => store.resources()));
    assert.equal(new Set(results).size, 1);
    assert.equal(clients, 1); assert.equal(connects, 1); assert.equal(buckets, 1);
    assert.equal(observedOptions.maxPoolSize, 3); assert.equal(observedOptions.minPoolSize, 0);
    assert.equal(observedOptions.tls, true); assert.equal(observedOptions.tlsAllowInvalidCertificates, false);
    assert.ok(observedOptions.serverSelectionTimeoutMS > 0);
    await store.close(); assert.equal(closes, 1);
});

test('driver constructor and connection failures are redacted and can be retried', async () => {
    let attempts = 0;
    class Client {
        constructor() { if (++attempts === 1) throw Error('mongodb+srv://private-user:private-password@private-host'); }
        async connect() { if (attempts === 2) throw Error('Private authentication detail'); }
        db() { return {}; }
        async close() {}
    }
    const store = createMediaMongoStore({ Client, Bucket: class {}, env: validEnv() });
    for (let i = 0; i < 2; i++) {
        await assert.rejects(store.resources(), error => {
            assert.equal(error.code, 'MEDIA_MONGODB_UNAVAILABLE');
            assert.ok(!error.stack.includes('private-password'));
            assert.ok(!error.stack.includes('Private authentication detail'));
            return true;
        });
    }
    assert.ok((await store.resources()).db);
    assert.equal(attempts, 3);
    await store.close();
});

test('live config changes do not close a pool being used by other requests', async () => {
    let closes = 0;
    class Client { async connect() {} db() { return {}; } async close() { closes++; } }
    const env = validEnv();
    const store = createMediaMongoStore({ Client, Bucket: class {}, env });
    await store.resources();
    env.MONGODB_DB = 'other_database';
    await assert.rejects(store.resources(), { code: 'MEDIA_MONGODB_CONFIG_CHANGED' });
    assert.equal(closes, 0);
    await store.close();
});
