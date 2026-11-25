// Task-scoped PostgreSQL transport; credentials remain in the existing private config.
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const {settings} = require('./cloud_connection.cjs');
async function connect() {
    const {Client} = require(path.join(os.tmpdir(), 'pawpal-service-import-tools/node_modules/pg'));
    const {config, uri} = settings();
    const client = new Client({host: uri.hostname, port: Number(uri.port),
        user: decodeURIComponent(uri.username), database: uri.pathname.slice(1),
        password: config.DESTINATION_DATABASE_PASSWORD, ssl: {rejectUnauthorized: true,
            ca: fs.readFileSync(path.join(os.tmpdir(), 'pawpal-service-import-tools/supabase-ca.crt'), 'utf8')},
        connectionTimeoutMillis: 15000});
    await client.connect();
    return client;
}
module.exports = {connect};
