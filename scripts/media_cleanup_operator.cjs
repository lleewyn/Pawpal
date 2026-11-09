'use strict';
const fs = require('node:fs'), path = require('node:path');
const { createClient } = require('@supabase/supabase-js');
const { cleanupMedia } = require('./api/media_cleanup.cjs');
const { createMediaMongoStore } = require('./api/media_mongodb.cjs');
const { createGridfsStore } = require('./api/media_gridfs.cjs');
(async () => {
    let connection;
    try {
        const args = process.argv.slice(2);
        if (!args.includes('--execute')) {
            console.log(JSON.stringify(await cleanupMedia())); return;
        }
        const file = args[args.indexOf('--env-file') + 1];
        if (!args.includes('--env-file') || !file || !path.isAbsolute(file)) throw Error();
        const env = require('dotenv').parse(fs.readFileSync(file));
        if (!/^https:\/\/[^/]+\/?$/.test(env.PAWPAL_MEDIA_SUPABASE_URL || '') || !env.PAWPAL_MEDIA_SUPABASE_SERVICE_ROLE_KEY) throw Error();
        connection = createMediaMongoStore({ env });
        const result = await cleanupMedia({
            client: createClient(env.PAWPAL_MEDIA_SUPABASE_URL, env.PAWPAL_MEDIA_SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } }),
            store: createGridfsStore(connection.resources), execute: true
        });
        console.log(JSON.stringify(result)); if (result.failed) process.exitCode = 1;
    } catch { console.error('MEDIA_CLEANUP_UNAVAILABLE'); process.exitCode = 1; }
    finally { await connection?.close(); }
})();
