'use strict';
// Small, reversible provider integration test. No Supabase business records or broad collection deletion.
const fs = require('node:fs'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { ObjectId } = require('mongodb');
const { createMediaMongoStore } = require('../api/media_mongodb.cjs');
const { createGridfsStore } = require('../api/media_gridfs.cjs');
const { verifyImage } = require('../api/media_files.cjs');
(async () => {
    let connection, claim, resources, cleaned = false;
    try {
        if (process.argv[2] !== '--execute' || !process.argv[3]) throw Error();
        const env = require('dotenv').parse(fs.readFileSync(process.argv[3]));
        connection = createMediaMongoStore({ env });
        resources = await connection.resources();
        claim = { session_id: crypto.randomUUID(), mongo_file_id: new ObjectId().toHexString(), mime_type: 'image/png' };
        const bytes = await require('sharp')({ create: { width: 2, height: 2, channels: 3, background: '#236b48' } }).png().toBuffer();
        const proof = await verifyImage(bytes, claim.mime_type);
        const store = createGridfsStore(async () => resources);
        await store.put(claim, bytes, proof);
        const result = await store.read({ ...claim, sha256: proof.sha256, size_bytes: bytes.length });
        assert.deepEqual(result, bytes);
        await store.removeClaimed(claim);
        assert.equal(await resources.bucket.find({ _id: new ObjectId(claim.mongo_file_id) }).limit(1).next(), null);
        assert.equal(await resources.db.collection(resources.bucketName + '.chunks').countDocuments({ files_id: new ObjectId(claim.mongo_file_id) }), 0);
        cleaned = true;
        fs.writeFileSync('docs/media/phase3-gridfs-smoke.txt', JSON.stringify({ status: 'PASS', provider: 'Atlas GridFS', uploadedBytes: bytes.length, originalBytesAndHashVerified: true, ownFileAndChunksRemoved: true, businessRecordsCreated: 0, note: 'GridFS collections/indexes may remain after the first upload.' }, null, 2));
        console.log(JSON.stringify({ status: 'PASS', ownFileAndChunksRemoved: true }));
    } catch { console.error(JSON.stringify({ status: 'FAIL', code: 'MEDIA_GRIDFS_SMOKE_FAILED' })); process.exitCode = 1; }
    finally {
        if (claim && resources && !cleaned) {
            try { await createGridfsStore(async () => resources).removeClaimed(claim); }
            catch { console.error('MEDIA_SMOKE_CLEANUP_REQUIRED'); process.exitCode = 1; }
        }
        await connection?.close();
    }
})();
