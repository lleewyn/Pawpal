'use strict';
const { ObjectId } = require('mongodb');
const { createHash } = require('node:crypto');
const { getMediaMongoResources } = require('./media_mongodb.cjs');
const { MAX_FILE_BYTES, mediaError } = require('./media_files.cjs');

function fileId(value) {
    if (typeof value !== 'string' || !/^[a-f0-9]{24}$/.test(value)) throw mediaError('MEDIA_INVALID_FILE_ID');
    return new ObjectId(value);
}
function createGridfsStore(resources = getMediaMongoResources) {
    return {
        async put(claim, bytes, proof) {
            const { bucket } = await resources();
            const id = fileId(claim.mongo_file_id);
            try {
                await new Promise((resolve, reject) => {
                    const upload = bucket.openUploadStreamWithId(id, claim.mongo_file_id, {
                        metadata: { sessionId: claim.session_id, sha256: proof.sha256, mimeType: claim.mime_type }
                    });
                    const timer = setTimeout(() => { upload.abort().catch(() => {}); reject(Error()); }, 10000);
                    upload.once('error', () => { clearTimeout(timer); reject(Error()); });
                    upload.once('finish', () => { clearTimeout(timer); resolve(); });
                    upload.end(bytes);
                });
                const stored = await bucket.find({ _id: id }).limit(1).next();
                if (!stored || stored.length !== bytes.length || stored.metadata?.sha256 !== proof.sha256) throw Error();
            } catch { throw mediaError('MEDIA_STORAGE_UNAVAILABLE', 503); }
        },
        async read(asset) {
            const { bucket } = await resources();
            try {
                const id = fileId(asset.mongo_file_id);
                const file = await bucket.find({ _id: id }).limit(1).next();
                if (!file || file.length !== asset.size_bytes || file.length > MAX_FILE_BYTES || file.metadata?.sha256 !== asset.sha256) throw Error();
                const stream = bucket.openDownloadStream(id);
                const chunks = []; let size = 0;
                for await (const chunk of stream) {
                    size += chunk.length;
                    if (size > asset.size_bytes) { stream.destroy(); throw Error(); }
                    chunks.push(chunk);
                }
                const bytes = Buffer.concat(chunks, size);
                if (size !== asset.size_bytes || createHash('sha256').update(bytes).digest('hex') !== asset.sha256) throw Error();
                return bytes;
            } catch { throw mediaError('MEDIA_FILE_UNAVAILABLE', 503); }
        },
        async removeClaimed(claim) {
            const { bucket, db, bucketName } = await resources();
            const id = fileId(claim.mongo_file_id);
            // Called only for a service-only SQL cleanup lease. Never accept raw IDs from a public delete API.
            try { await bucket.delete(id); }
            catch {
                const existing = await bucket.find({ _id: id }).limit(1).next();
                if (existing) throw mediaError('MEDIA_STORAGE_UNAVAILABLE', 503);
                // A failed upload can leave chunks without a .files row; lease prevents active uploads here.
                const name = bucketName;
                if (!name || !/^[A-Za-z][A-Za-z0-9_-]{0,62}$/.test(name)) throw mediaError('MEDIA_STORAGE_UNAVAILABLE', 503);
                await db.collection(name + '.chunks').deleteMany({ files_id: id });
            }
        }
    };
}
module.exports = { createGridfsStore };
