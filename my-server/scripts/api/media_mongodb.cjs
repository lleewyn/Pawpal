'use strict';

// Server-only connection foundation. Importing this module does not connect or write.
const { MongoClient, GridFSBucket } = require('mongodb');

class MediaMongoError extends Error {
    constructor(code) {
        super(code);
        this.name = 'MediaMongoError';
        this.code = code;
    }
}

function configurationError() {
    return new MediaMongoError('MEDIA_MONGODB_CONFIG_INVALID');
}

function readMediaMongoConfig(env = process.env) {
    const dedicated = Boolean(env.PAWPAL_MEDIA_MONGODB_URI || env.PAWPAL_MEDIA_MONGODB_DB || env.PAWPAL_MEDIA_MONGODB_BUCKET);
    const uri = dedicated ? env.PAWPAL_MEDIA_MONGODB_URI : env.MONGODB_URI;
    const database = dedicated ? env.PAWPAL_MEDIA_MONGODB_DB : env.MONGODB_DB;
    const bucket = (dedicated ? env.PAWPAL_MEDIA_MONGODB_BUCKET : env.MONGODB_MEDIA_BUCKET) || 'pawpalMedia';
    if (!uri || !database) throw new MediaMongoError('MEDIA_MONGODB_CONFIG_MISSING');
    const validName = value => typeof value === 'string' && /^[A-Za-z][A-Za-z0-9_-]{0,62}$/.test(value);
    if (!validName(database) || !validName(bucket) || typeof uri !== 'string' || uri !== uri.trim()) {
        throw configurationError();
    }
    try {
        const parsed = new URL(uri);
        // Atlas SRV only; no fallback to a local database or an arbitrary host.
        if (parsed.protocol !== 'mongodb+srv:' || !parsed.hostname.endsWith('.mongodb.net') ||
            !/^[a-z0-9.-]+$/i.test(parsed.hostname) || !parsed.username || !parsed.password ||
            parsed.port || parsed.hash || /[<>\s]/.test(uri)) throw configurationError();
        const uriDatabase = decodeURIComponent(parsed.pathname.slice(1));
        if (uriDatabase && uriDatabase !== database) throw configurationError();
        const allowedOptions = new Set(['retryWrites', 'w', 'appName', 'authSource', 'readPreference']);
        const seen = new Set();
        for (const [key, value] of parsed.searchParams) {
            if (!allowedOptions.has(key) || seen.has(key)) throw configurationError();
            seen.add(key);
            if (key === 'retryWrites' && value !== 'true') throw configurationError();
            if (key === 'w' && value !== 'majority') throw configurationError();
            if (key === 'authSource' && value !== 'admin') throw configurationError();
            if (key === 'readPreference' && value !== 'primary') throw configurationError();
            if (key === 'appName' && (!value || value.length > 128)) throw configurationError();
        }
        const flags = [env.MEDIA_UPLOAD_ENABLED, env.MEDIA_VIDEO_ENABLED];
        if (flags.some(value => value !== undefined && value !== '' && !['true', 'false'].includes(value))) {
            throw configurationError();
        }
        // Video is not implemented. A flag must not imply it is ready to use.
        if (env.MEDIA_VIDEO_ENABLED === 'true') throw configurationError();
    } catch {
        // Parser/driver error messages can include credentials. Never forward them.
        throw configurationError();
    }
    return Object.freeze({ uri, database, bucket, uploadEnabled: env.MEDIA_UPLOAD_ENABLED === 'true', videoEnabled: false });
}

const CLIENT_OPTIONS = Object.freeze({
    tls: true,
    tlsAllowInvalidCertificates: false,
    tlsAllowInvalidHostnames: false,
    maxPoolSize: 3,
    minPoolSize: 0,
    maxConnecting: 1,
    maxIdleTimeMS: 30000,
    waitQueueTimeoutMS: 3000,
    connectTimeoutMS: 5000,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 10000,
    monitorCommands: false,
    mongodbLogComponentSeverities: { default: 'off' },
    appName: 'PawpalMedia'
});

function createMediaMongoStore({ Client = MongoClient, Bucket = GridFSBucket, env = process.env } = {}) {
    let active = null;
    async function resources() {
        const config = readMediaMongoConfig(env);
        if (active && (active.uri !== config.uri || active.database !== config.database || active.bucket !== config.bucket)) {
            // Avoid closing an in-flight pool because a live process changed configuration.
            throw new MediaMongoError('MEDIA_MONGODB_CONFIG_CHANGED');
        }
        let entry = active;
        if (!entry) {
            entry = { uri: config.uri, database: config.database, bucket: config.bucket, client: null, promise: null };
            active = entry;
            entry.promise = (async () => {
                try {
                    entry.client = new Client(config.uri, CLIENT_OPTIONS);
                    await entry.client.connect();
                    const db = entry.client.db(config.database);
                    return { db, bucket: new Bucket(db, { bucketName: config.bucket }), bucketName: config.bucket };
                } catch {
                    if (active === entry) active = null;
                    try { await entry.client?.close(); } catch { /* Do not leak driver errors. */ }
                    throw new MediaMongoError('MEDIA_MONGODB_UNAVAILABLE');
                }
            })();
        }
        return entry.promise;
    }
    async function close() {
        const entry = active;
        if (!entry) return;
        // This is a shutdown operation, not something to call after each Vercel request.
        try { await entry.promise; } catch { /* Connection failure already sanitized. */ }
        try { await entry.client?.close(); }
        catch { throw new MediaMongoError('MEDIA_MONGODB_CLOSE_FAILED'); }
        finally { if (active === entry) active = null; }
    }
    return { resources, close };
}

const store = createMediaMongoStore();
module.exports = { MediaMongoError, readMediaMongoConfig, createMediaMongoStore, getMediaMongoResources: store.resources, closeMediaMongo: store.close };
