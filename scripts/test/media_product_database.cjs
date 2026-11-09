'use strict';
const fs = require('node:fs'), cp = require('node:child_process'), crypto = require('node:crypto');
const file = 'scripts/database/v1/189_product_media.sql';
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
(async () => {
    let cloud;
    try {
        const manifest = JSON.parse(fs.readFileSync('docs/media/phase3-database.private.txt'));
        const migration = fs.readFileSync(file, 'utf8');
        const reportFile = 'docs/media/phase4-product-database.txt';
        if (process.argv[2] === 'apply') {
            const tested = JSON.parse(fs.readFileSync(reportFile));
            if (tested.status !== 'PASS' || tested.checksum !== digest(migration)) throw Error('TEST_REQUIRED');
            cloud = await require('../database/v1/service_import_connection.cjs').connect();
            const original = JSON.parse(fs.readFileSync('D:/Aboutme/Pawpal-infra/media/phase4/functions.private.json'));
            for (const [name, definition] of Object.entries(original)) {
                const result = await cloud.query("SELECT pg_get_functiondef(p.oid) definition FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname=$1", [name]);
                if (result.rows.length !== 1 || result.rows[0].definition !== definition) throw Error('FUNCTION_DRIFT');
            }
            await cloud.query(migration);
            console.log('PRODUCT_MEDIA_CLOUD_APPLIED_UPLOAD_STILL_DISABLED');
        } else {
            if (!/^pawpal_media_s3_[a-f0-9]{12}$/.test(manifest.database)) throw Error('SCOPE');
            const run = input => cp.execFileSync('docker', ['exec', '-i', 'supabase-db', 'psql', '-U', 'supabase_admin', '-d', manifest.database, '-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-f', '-'], { input, encoding: 'utf8', windowsHide: true, timeout: 60000 });
            const owner = run("SELECT shobj_description(oid,'pg_database') FROM pg_database WHERE datname=current_database();").trim();
            if (owner !== manifest.owner) throw Error('OWNERSHIP');
            run(fs.readFileSync('scripts/database/v1/099_product_catalog_final.sql','utf8'));
            run(migration);
            let checks = fs.readFileSync('scripts/test/media_stage3_checks.sql','utf8');
            checks = checks.replace("ROLLBACK;\nSELECT 'MEDIA_DATABASE_CHECKS_PASS';", fs.readFileSync('scripts/test/media_product_checks.sql','utf8') + "\nROLLBACK;\nSELECT 'MEDIA_PRODUCT_CHECKS_PASS';");
            if (!run(checks).includes('MEDIA_PRODUCT_CHECKS_PASS')) throw Error('CHECKS');
            fs.writeFileSync(reportFile, JSON.stringify({ status: 'PASS', checksum: digest(migration), cloudWrites: false, rolledBackFixtures: true, checks: ['actual product business RPC as authenticated','attach asset','retain existing reference','public catalog endpoint','reject care evidence as product image','replace asset with legacy URL'] }, null, 2));
            console.log('PRODUCT_MEDIA_DATABASE_TESTS_PASS');
        }
    } catch (error) {
        fs.writeFileSync('D:/Aboutme/Pawpal-infra/media/phase4/error.private.txt', String(error.stderr || error.message));
        console.error('PRODUCT_MEDIA_DATABASE_STEP_FAILED'); process.exitCode=1;
    } finally { await cloud?.end(); }
})();
