'use strict';
const Busboy = require('busboy');
const sharp = require('sharp');
const { createHash } = require('node:crypto');
const { Readable } = require('node:stream');
const MAX_FILE_BYTES = 3 * 1024 * 1024;
const MAX_BODY_BYTES = 4000000;
const MIME = Object.freeze({ jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' });
function mediaError(code, status = 400) { return Object.assign(new Error(code), { code, status }); }

async function readBounded(req, maximum) {
    const length = req.headers?.['content-length'];
    if (length !== undefined && (!/^\d+$/.test(String(length)) || Number(length) > maximum)) throw mediaError('MEDIA_BODY_TOO_LARGE', 413);
    if (Buffer.isBuffer(req.body)) {
        if (req.body.length > maximum) throw mediaError('MEDIA_BODY_TOO_LARGE', 413);
        return req.body;
    }
    return new Promise((resolve, reject) => {
        let size = 0, settled = false;
        const chunks = [];
        const finish = (error, value) => {
            if (settled) return; settled = true; clearTimeout(timer);
            req.removeListener('data', onData); req.removeListener('end', onEnd);
            req.removeListener('aborted', onAbort); req.removeListener('error', onAbort);
            if (error) { req.resume?.(); reject(error); } else resolve(value);
        };
        const onData = chunk => {
            if (!Buffer.isBuffer(chunk)) return finish(mediaError('MEDIA_INVALID_BODY'));
            size += chunk.length;
            if (size > maximum) return finish(mediaError('MEDIA_BODY_TOO_LARGE', 413));
            chunks.push(chunk);
        };
        const onEnd = () => finish(null, Buffer.concat(chunks, size));
        const onAbort = () => finish(mediaError('MEDIA_UPLOAD_INTERRUPTED', 400));
        const timer = setTimeout(() => finish(mediaError('MEDIA_BODY_TIMEOUT', 408)), 8000);
        if (req.readableEnded) return finish(mediaError('MEDIA_INVALID_BODY'));
        req.on('data', onData); req.once('end', onEnd); req.once('aborted', onAbort); req.once('error', onAbort);
    });
}

async function readJson(req) {
    if (!/^application\/json(?:\s*;|$)/i.test(req.headers?.['content-type'] || '')) throw mediaError('MEDIA_INVALID_BODY');
    let value;
    if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
        if (Buffer.byteLength(JSON.stringify(req.body)) > 8192) throw mediaError('MEDIA_BODY_TOO_LARGE', 413);
        value = req.body;
    } else {
        try { value = JSON.parse((await readBounded(req, 8192)).toString('utf8')); }
        catch (error) { if (error.status) throw error; throw mediaError('MEDIA_INVALID_BODY'); }
    }
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw mediaError('MEDIA_INVALID_BODY');
    return value;
}

async function readImageUpload(req) {
    const bytes = await readBounded(req, MAX_BODY_BYTES);
    return new Promise((resolve, reject) => {
        let parser, file = null, invalid = false, tooLarge = false;
        try { parser = Busboy({ headers: req.headers, limits: { fileSize: MAX_FILE_BYTES + 1, files: 1, fields: 0, parts: 2, headerPairs: 30 } }); }
        catch { return reject(mediaError('MEDIA_INVALID_MULTIPART')); }
        parser.on('file', (name, stream, info) => {
            if (name !== 'file' || file || !Object.values(MIME).includes(info.mimeType)) { invalid = true; stream.resume(); return; }
            const chunks = []; let size = 0;
            file = { mime: info.mimeType, bytes: null };
            stream.on('data', chunk => { size += chunk.length; if (size > MAX_FILE_BYTES) tooLarge = true; chunks.push(chunk); });
            stream.on('limit', () => { tooLarge = true; });
            stream.on('error', () => { invalid = true; });
            stream.on('end', () => { file.bytes = Buffer.concat(chunks, size); });
        });
        for (const event of ['filesLimit', 'fieldsLimit', 'partsLimit']) parser.on(event, () => { invalid = true; });
        parser.on('error', () => reject(mediaError('MEDIA_INVALID_MULTIPART')));
        parser.on('close', () => {
            if (tooLarge) return reject(mediaError('MEDIA_FILE_TOO_LARGE', 413));
            if (invalid || !file?.bytes?.length) return reject(mediaError('MEDIA_INVALID_MULTIPART'));
            resolve(file);
        });
        Readable.from(bytes).pipe(parser);
    });
}

async function verifyImage(bytes, claimedMime) {
    try {
        if (!Buffer.isBuffer(bytes) || !bytes.length || bytes.length > MAX_FILE_BYTES) throw Error();
        const options = { limitInputPixels: 20000000, failOn: 'warning', sequentialRead: true };
        const metadata = await sharp(bytes, options).timeout({ seconds: 3 }).metadata();
        if (MIME[metadata.format] !== claimedMime || !metadata.width || !metadata.height || metadata.width > 8192 || metadata.height > 8192 || (metadata.pages || 1) !== 1) throw Error();
        // Decode the entire file, not just the format header. Keep original bytes for evidence.
        await sharp(bytes, options).timeout({ seconds: 3 }).raw().toBuffer();
        return { width: metadata.width, height: metadata.height, sha256: createHash('sha256').update(bytes).digest('hex') };
    } catch { throw mediaError('MEDIA_INVALID_IMAGE'); }
}

module.exports = { MAX_FILE_BYTES, MAX_BODY_BYTES, MIME, mediaError, readBounded, readJson, readImageUpload, verifyImage };
