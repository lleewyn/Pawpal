'use strict';

// Operator CLI only. No HTTP route; no file writes, index creation or data mutations.
const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');
const { createMediaMongoStore, readMediaMongoConfig } = require('../api/media_mongodb.cjs');

async function gridfsCollectionNames(db, bucket) {
    // Atlas shared tiers can reject operator filters ($in) in listCollections.
    const groups = await Promise.all(['files', 'chunks'].map(suffix => db.listCollections(
        { name: bucket + '.' + suffix },
        { nameOnly: true, authorizedCollections: true, maxTimeMS: 5000 }
    ).toArray()));
    return groups.flat();
}

async function main() {
    let store;
    let safeCode = 'MEDIA_PREFLIGHT_FAILED';
    let stage = 'configuration';
    try {
        const args = process.argv.slice(2);
        if (args.length && (args.length !== 2 || args[0] !== '--env-file' || !path.isAbsolute(args[1]))) {
            throw Object.assign(new Error(), { code: 'MEDIA_PREFLIGHT_ARGUMENTS_INVALID' });
        }
        let env = { ...process.env };
        if (args.length) {
            let settings;
            try { settings = dotenv.parse(fs.readFileSync(args[1])); }
            catch { throw Object.assign(new Error(), { code: 'MEDIA_PREFLIGHT_ENV_UNREADABLE' }); }
            env = { ...env, ...settings };
        }
        const config = readMediaMongoConfig(env);
        store = createMediaMongoStore({ env });
        stage = 'connection';
        const { db } = await store.resources();
        stage = 'ping';
        await db.command({ ping: 1 }, { maxTimeMS: 5000 });
        // Read-only, scoped to the explicitly configured DB; never fetch document contents.
        stage = 'database_statistics';
        const stats = await db.command({ dbStats: 1, scale: 1 }, { maxTimeMS: 5000 });
        stage = 'collection_metadata';
        const collections = await gridfsCollectionNames(db, config.bucket);
        const bytes = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
        const dataSize = bytes(stats.dataSize), indexSize = bytes(stats.indexSize);
        console.log(JSON.stringify({ status: 'PASS', scope: 'configured database metadata only; no writes or file contents',
            dataBytes: dataSize, indexBytes: indexSize, dataAndIndexBytes: dataSize === null || indexSize === null ? null : dataSize + indexSize,
            scopeWarning: 'Other databases on the cluster are not counted. Tier and cluster-wide headroom require dashboard verification.',
            gridfsFilesCollectionExists: collections.some(item => item.name === config.bucket + '.files'),
            gridfsChunksCollectionExists: collections.some(item => item.name === config.bucket + '.chunks'),
            uploadEnabled: config.uploadEnabled, videoEnabled: false }));
    } catch (error) {
        if (/^(MEDIA_MONGODB_|MEDIA_PREFLIGHT_)[A-Z_]+$/.test(error?.code || '')) safeCode = error.code;
        console.error(JSON.stringify({ status: 'FAIL', code: safeCode, stage,
            serverCode: Number.isInteger(error?.code) ? error.code : null }));
        process.exitCode = 1;
    } finally {
        try { await store?.close(); }
        catch { console.error(JSON.stringify({ status: 'FAIL', code: 'MEDIA_MONGODB_CLOSE_FAILED' })); process.exitCode = 1; }
    }
}

if (require.main === module) main();
module.exports = { gridfsCollectionNames };
