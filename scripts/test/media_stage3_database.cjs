'use strict';
// Cloud backup -> owned isolated PostgreSQL rehearsal -> optional guarded additive Cloud migration.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto'), cp = require('node:child_process');
const { settings } = require('../database/v1/cloud_connection.cjs');
const migration = path.resolve('scripts/database/v1/188_media_foundation.sql');
const pointer = path.resolve('docs/media/phase3-database.private.txt');
const action = process.argv[2] || 'snapshot';
const checksum = () => crypto.createHash('sha256').update(fs.readFileSync(migration)).digest('hex');
function docker(args, input = '', env = {}) {
    const container = args[0] === 'run' ? 'pawpal-media-s3-' + crypto.randomBytes(6).toString('hex') : null;
    if (container) args = [args[0], '--name', container, '--label', 'pawpal.owner=media-stage3', ...args.slice(1)];
    const result = cp.spawnSync('docker', args, { input, encoding: 'utf8', windowsHide: true, env: { ...process.env, ...env }, timeout: 180000, maxBuffer: 64 * 1024 * 1024 });
    if (container && result.error?.code === 'ETIMEDOUT') cp.spawnSync('docker', ['stop', container], { windowsHide: true, stdio: 'ignore', timeout: 15000 });
    if (result.status !== 0) throw Object.assign(new Error('MEDIA_DATABASE_COMMAND_FAILED'), { detail: result.stderr || '' });
    return result.stdout;
}
function local(database, sql) {
    if (!/^pawpal_media_s3_[a-f0-9]{12}$/.test(database)) throw Error('MEDIA_DATABASE_SCOPE_INVALID');
    return docker(['exec', '-i', 'supabase-db', 'psql', '-U', 'supabase_admin', '-d', database, '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-f', '-'], sql);
}
function cloud(command, args, input = '') {
    const { config, uri } = settings();
    const address = cp.execFileSync(process.execPath, ['-e', "require('node:dns').lookup(process.argv[1],{family:4},(e,a)=>{if(e)process.exit(1);process.stdout.write(a)})", uri.hostname], { encoding: 'utf8', windowsHide: true, timeout: 10000 }).trim();
    if (!/^\d+\.\d+\.\d+\.\d+$/.test(address)) throw Error('MEDIA_DATABASE_ADDRESS_INVALID');
    const ca = path.join(os.tmpdir(), 'pawpal-service-import-tools/supabase-ca.crt');
    return docker(['run', '--rm', '-i', '--mount', 'type=bind,source=' + ca + ',target=/tmp/media-ca.crt,readonly',
        '--env', 'PGPASSWORD', '--env', 'PGHOSTADDR', '--env', 'PGOPTIONS=-c statement_timeout=45000', '--env', 'PGSSLMODE=verify-full', '--env', 'PGCONNECT_TIMEOUT=15', '--env', 'PGSSLROOTCERT=/tmp/media-ca.crt',
        '--entrypoint', command, 'supabase/postgres:17.6.1.136', '-h', uri.hostname, '-p', uri.port,
        '-U', decodeURIComponent(uri.username), '-d', 'postgres', ...args], input, { PGPASSWORD: config.DESTINATION_DATABASE_PASSWORD, PGHOSTADDR: address });
}
function cloudSql(input) { return cloud('psql', ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-f', '-'], input); }
const unchangedSql = `SELECT jsonb_build_object('product_media_count',(SELECT count(*) FROM public.product_media),
 'care_media_count',(SELECT count(*) FROM public.care_log_media),
 'product_urls_hash',(SELECT md5(coalesce(string_agg(id::text||coalesce(image_url,''),E'\\n' ORDER BY id),'')) FROM public.product_media),
 'care_urls_hash',(SELECT md5(coalesce(string_agg(id::text||media_url,E'\\n' ORDER BY id),'')) FROM public.care_log_media));`;
(async () => { try {
    fs.mkdirSync('docs/media', { recursive: true });
    if (action === 'probe') {
        cloudSql('BEGIN READ ONLY; SELECT 1; ROLLBACK;');
        console.log(JSON.stringify({ status: 'PASS', action, writes: false }));
    } else if (action === 'snapshot') {
        const privateDir = 'D:/Aboutme/Pawpal-infra/media/stage3-' + new Date().toISOString().replace(/[:.]/g, '-');
        fs.mkdirSync(privateDir, { recursive: true });
        const db = await require('../database/v1/service_import_connection.cjs').connect();
        let before;
        try {
            await db.query('BEGIN READ ONLY'); await db.query("SET LOCAL statement_timeout='10s'");
            before = {
                columns: (await db.query("SELECT table_name,column_name,data_type,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('product_media','care_log_media') ORDER BY table_name,ordinal_position")).rows,
                constraints: (await db.query("SELECT c.relname,con.conname,pg_get_constraintdef(con.oid) definition FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('product_media','care_log_media') ORDER BY c.relname,con.conname")).rows,
                productMedia: (await db.query('SELECT * FROM public.product_media ORDER BY id')).rows,
                careMedia: (await db.query('SELECT * FROM public.care_log_media ORDER BY id')).rows,
                customerGuard: (await db.query("SELECT pg_get_functiondef('pawpal_private.owns_customer(uuid)'::regprocedure) definition")).rows[0].definition,
                baseline: (await db.query(unchangedSql)).rows[0].jsonb_build_object
            };
            await db.query('ROLLBACK');
        } finally { await db.end(); }
        // Fresh Cloud backup is scoped to the two altered relations; never used as frontend data.
        fs.writeFileSync(path.join(privateDir, 'before-media.private.json'), JSON.stringify(before));
        const schema = docker(['exec', 'supabase-db', 'pg_dump', '-U', 'supabase_admin', '-d', 'postgres', '--schema-only', '--no-owner', '--no-comments', '--schema=public', '--schema=pawpal_private', '--schema=auth', '--schema=extensions', '--schema=storage']);
        fs.writeFileSync(path.join(privateDir, 'local-test-schema.private.sql'), schema);
        const baseline = before.baseline;
        const manifest = { privateDir, database: 'pawpal_media_s3_' + crypto.randomBytes(6).toString('hex'),
            owner: 'pawpal-media-stage3-' + crypto.randomUUID(), checksum: checksum(), baseline, schemaHash: crypto.createHash('sha256').update(schema).digest('hex') };
        fs.writeFileSync(pointer, JSON.stringify(manifest, null, 2));
        console.log(JSON.stringify({ status: 'PASS', action, scopedCloudMetadataBackup: true, mediaDataBackup: true, localTestSchema: true, secretsInRepository: false }));
    } else {
        const manifest = JSON.parse(fs.readFileSync(pointer, 'utf8'));
        if (action === 'rehearse') {
            if (crypto.createHash('sha256').update(fs.readFileSync(path.join(manifest.privateDir, 'local-test-schema.private.sql'))).digest('hex') !== manifest.schemaHash) throw Error('MEDIA_BACKUP_MISMATCH');
            if (!/^pawpal_media_s3_[a-f0-9]{12}$/.test(manifest.database)) throw Error('MEDIA_DATABASE_SCOPE_INVALID');
            const inspect = docker(['exec', '-i', 'supabase-db', 'psql', '-U', 'supabase_admin', '-d', 'postgres', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-f', '-'],
                "SELECT coalesce(shobj_description(oid,'pg_database'),'unowned') FROM pg_database WHERE datname='" + manifest.database + "';").trim();
            if (inspect && inspect !== manifest.owner) throw Error('MEDIA_DATABASE_NOT_OWNED');
            if (inspect) docker(['exec', '-i', 'supabase-db', 'psql', '-U', 'supabase_admin', '-d', 'postgres', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-f', '-'], 'DROP DATABASE ' + manifest.database + ';');
            docker(['exec', '-i', 'supabase-db', 'psql', '-U', 'supabase_admin', '-d', 'postgres', '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-f', '-'],
                'CREATE DATABASE ' + manifest.database + ' TEMPLATE template0; COMMENT ON DATABASE ' + manifest.database + " IS '" + manifest.owner + "';");
            local(manifest.database, 'DROP SCHEMA public CASCADE;');
            local(manifest.database, 'CREATE SCHEMA extensions; CREATE EXTENSION pgcrypto WITH SCHEMA extensions; CREATE EXTENSION "uuid-ossp" WITH SCHEMA extensions; CREATE EXTENSION btree_gist WITH SCHEMA extensions; CREATE EXTENSION vector WITH SCHEMA extensions; CREATE EXTENSION pg_trgm WITH SCHEMA extensions;');
            local(manifest.database, fs.readFileSync(path.join(manifest.privateDir, 'local-test-schema.private.sql'), 'utf8').replace('CREATE SCHEMA extensions;', 'CREATE SCHEMA IF NOT EXISTS extensions;'));
            const before = JSON.parse(fs.readFileSync(path.join(manifest.privateDir, 'before-media.private.json'), 'utf8'));
            const localColumns = JSON.parse(local(manifest.database, "SELECT jsonb_agg(t ORDER BY table_name,ordinal_position) FROM (SELECT table_name,column_name,data_type,is_nullable,ordinal_position FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('product_media','care_log_media'))t;"));
            if (before.columns.some(column => !localColumns.some(current => current.table_name === column.table_name && current.column_name === column.column_name && current.data_type === column.data_type && current.is_nullable === column.is_nullable))) throw Error('MEDIA_TEST_SCHEMA_DRIFT');
            local(manifest.database, before.customerGuard);
            local(manifest.database, fs.readFileSync(migration, 'utf8'));
            manifest.checksum = checksum(); manifest.rehearsed = true;
            fs.writeFileSync(pointer, JSON.stringify(manifest, null, 2));
            console.log(JSON.stringify({ status: 'PASS', action, isolatedDatabase: true, cloudWrites: false }));
        } else if (action === 'test') {
            if (!manifest.rehearsed || manifest.checksum !== checksum()) throw Error('MEDIA_REHEARSAL_REQUIRED');
            const result = local(manifest.database, fs.readFileSync('scripts/test/media_stage3_checks.sql', 'utf8'));
            if (!result.includes('MEDIA_DATABASE_CHECKS_PASS')) throw Error('MEDIA_DATABASE_CHECKS_FAILED');
            local(manifest.database, fs.readFileSync('scripts/database/v1/188_media_foundation_rollback.sql', 'utf8'));
            if (local(manifest.database, "SELECT to_regclass('public.media_asset') IS NULL;").trim() !== 't') throw Error('MEDIA_ROLLBACK_FAILED');
            local(manifest.database, fs.readFileSync(migration, 'utf8'));
            if (!local(manifest.database, fs.readFileSync('scripts/test/media_stage3_checks.sql', 'utf8')).includes('MEDIA_DATABASE_CHECKS_PASS')) throw Error('MEDIA_REAPPLY_FAILED');
            manifest.tested = true; fs.writeFileSync(pointer, JSON.stringify(manifest, null, 2));
            fs.writeFileSync('docs/media/phase3-database-tests.txt', JSON.stringify({ status: 'PASS', isolatedDatabase: true, cloudWrites: false, fixtureTransactionRolledBack: true, checks: ['SQL role ACL','disabled gate','idempotency','quota reservations','actor scope','lease validation','private drafts','XOR source','target guard','public product scope','retention','legal hold','cleanup quota release','assigned care staff','inactive staff revoked','actual customer ownership','anonymous private denial','empty rollback and reapply'] }, null, 2));
            console.log(JSON.stringify({ status: 'PASS', action, isolatedDatabase: true, cloudWrites: false }));
        } else if (action === 'apply') {
            if (!manifest.rehearsed || !manifest.tested || manifest.checksum !== checksum()) throw Error('MEDIA_REHEARSAL_REQUIRED');
            cloudSql('BEGIN READ ONLY; DO $$ BEGIN IF to_regclass(\'public.media_asset\') IS NOT NULL THEN RAISE EXCEPTION \'media_already_exists\'; END IF; END $$; ROLLBACK;');
            const before = JSON.parse(cloudSql('BEGIN READ ONLY; ' + unchangedSql + 'ROLLBACK;').trim());
            if (JSON.stringify(before) !== JSON.stringify(manifest.baseline)) throw Error('MEDIA_SOURCE_CHANGED');
            cloudSql(fs.readFileSync(migration, 'utf8'));
            manifest.applied = true; fs.writeFileSync(pointer, JSON.stringify(manifest, null, 2));
            console.log(JSON.stringify({ status: 'PASS', action, uploadDatabaseGate: false }));
        } else if (action === 'verify') {
            const result = JSON.parse(cloudSql(`BEGIN READ ONLY; SELECT jsonb_build_object(
                'asset_table',to_regclass('public.media_asset') IS NOT NULL,
                'sessions',(SELECT count(*) FROM public.media_upload_session), 'assets',(SELECT count(*) FROM public.media_asset),
                'databaseUploadEnabled',(SELECT enabled FROM pawpal_private.media_settings WHERE singleton),
                'directAnonymousSelect',has_table_privilege('anon','public.media_asset','SELECT'),
                'userCanFinalize',has_function_privilege('authenticated','public.finish_media_upload(uuid,uuid,uuid,text,integer,integer)','EXECUTE'));
                ROLLBACK;`).trim());
            const after = JSON.parse(cloudSql('BEGIN READ ONLY; ' + unchangedSql + 'ROLLBACK;').trim());
            result.existingMediaUnchanged = JSON.stringify(after) === JSON.stringify(manifest.baseline);
            result.status = result.asset_table && result.sessions === 0 && result.assets === 0 && result.databaseUploadEnabled === false && result.directAnonymousSelect === false && result.userCanFinalize === false && result.existingMediaUnchanged ? 'PASS' : 'FAIL';
            fs.writeFileSync('docs/media/phase3-cloud-verify.txt', JSON.stringify(result, null, 2));
            console.log(JSON.stringify(result)); if (result.status !== 'PASS') process.exitCode = 1;
        } else throw Error('MEDIA_DATABASE_ACTION_INVALID');
    }
} catch (error) {
    // Raw Docker/PostgreSQL diagnostics are private and may contain schema/connection information.
    fs.mkdirSync('D:/Aboutme/Pawpal-infra/media', { recursive: true });
    fs.writeFileSync('D:/Aboutme/Pawpal-infra/media/stage3-database-error.private.txt', String(error.detail || error.message || 'failed'));
    console.error(JSON.stringify({ status: 'FAIL', action, code: 'MEDIA_DATABASE_STEP_FAILED' })); process.exitCode = 1;
} })();
