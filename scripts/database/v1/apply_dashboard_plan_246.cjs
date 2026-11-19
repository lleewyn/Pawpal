// Exact project transport, empty schema only. No operational records are updated.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { connect } = require('./service_import_connection.cjs');
const source = fs.readFileSync('scripts/database/v1/246_admin_dashboard_plan.sql', 'utf8').replace(/^BEGIN;\s*/, '').replace(/COMMIT;\s*$/, '');
const apply = process.argv.includes('--apply-cloud');
(async () => {
    const db = await connect();
    try {
        await db.query("BEGIN; SET LOCAL lock_timeout='3s'; SET LOCAL statement_timeout='10s'");
        await db.query(source);
        const checks = (await db.query(`SELECT
          NOT has_function_privilege('anon','public.get_admin_dashboard_plan(date,date)','EXECUTE') AS anonymous_read_blocked,
          NOT has_function_privilege('anon','public.save_admin_dashboard_plan(uuid,date,date,jsonb,jsonb)','EXECUTE') AS anonymous_write_blocked,
          NOT has_table_privilege('authenticated','public.admin_dashboard_plan','INSERT') AS direct_write_blocked,
          (SELECT relrowsecurity FROM pg_class WHERE oid='public.admin_dashboard_plan'::regclass) AS rls_enabled,
          EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='admin_dashboard_plan') AS realtime_enabled,
          NOT EXISTS(SELECT 1 FROM public.admin_dashboard_plan) AS no_seeded_plans`)).rows[0];
        assert.ok(Object.values(checks).every(v => v === true), JSON.stringify(checks));
        await db.query(apply ? 'COMMIT' : 'ROLLBACK');
        console.log((apply ? 'APPLIED' : 'PASS rollback validation') + ': migration 246, restricted RPCs, RLS, Realtime; no plans or costs seeded.');
    } catch (error) { await db.query('ROLLBACK').catch(() => {}); throw error; }
    finally { await db.end(); }
})().catch(error => { console.error(error.code || error.name, error.message); process.exitCode = 1; });
