// Metadata only: no customer rows, no migrations, one read-only snapshot.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { connect } = require('../database/v1/service_import_connection.cjs');
if (!process.argv.includes('--cloud-readonly')) {
    console.log('Use --cloud-readonly to save a private schema catalog snapshot and public audit metadata.');
    process.exit(0);
}
const schemas = ['public', 'pawpal_private'];
const tables = ['customer','customer_phone','customer_profile','guest_session','pet_profile','appointment','appointment_item','cart','cart_item','sales_order','sales_order_detail','payment'];
const names = ['ensure_guest_customer','complete_customer_auth','owns_customer','current_customer_id','own_booking_pets','customer_profile_snapshot','quote_own_service_booking','create_own_service_booking','own_customer_cart','quote_own_sales_order','create_own_sales_order'];
(async () => {
    const db = await connect();
    try {
        await db.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY; SET LOCAL statement_timeout='12s'; SET LOCAL lock_timeout='2s'");
        const snapshot = { capturedAt: new Date().toISOString(), scope: schemas, format: 'PostgreSQL catalog snapshot, not a pg_dump restore archive; no table data or auth credentials' };
        const queries = {
            relations: `SELECT n.nspname schema,c.relname name,c.relkind,c.relrowsecurity,c.relforcerowsecurity,c.relacl::text,pg_get_userbyid(c.relowner) owner FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=ANY($1) ORDER BY 1,2`,
            columns: `SELECT n.nspname schema,c.relname table_name,a.attname name,a.attnum,format_type(a.atttypid,a.atttypmod) type,a.attnotnull,a.attidentity,a.attgenerated,a.attacl::text,pg_get_expr(d.adbin,d.adrelid) default_expression FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum WHERE n.nspname=ANY($1) AND a.attnum>0 AND NOT a.attisdropped ORDER BY 1,2,a.attnum`,
            constraints: `SELECT n.nspname schema,c.relname table_name,k.conname name,k.contype,pg_get_constraintdef(k.oid,true) definition FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=ANY($1) ORDER BY 1,2,3`,
            indexes: `SELECT schemaname schema,tablename table_name,indexname name,indexdef definition FROM pg_indexes WHERE schemaname=ANY($1) ORDER BY 1,2,3`,
            policies: `SELECT schemaname schema,tablename table_name,policyname name,permissive,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname=ANY($1) ORDER BY 1,2,3`,
            triggers: `SELECT n.nspname schema,c.relname table_name,t.tgname name,t.tgenabled,pg_get_triggerdef(t.oid,true) definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=ANY($1) AND NOT t.tgisinternal ORDER BY 1,2,3`,
            functions: `SELECT n.nspname schema,p.proname name,pg_get_function_identity_arguments(p.oid) args,p.prosecdef,p.proconfig,p.proacl::text,pg_get_userbyid(p.proowner) owner,pg_get_functiondef(p.oid) definition,has_function_privilege('anon',p.oid,'EXECUTE') anon_execute,has_function_privilege('authenticated',p.oid,'EXECUTE') authenticated_execute FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname=ANY($1) AND p.prokind IN ('f','p') ORDER BY 1,2,3`,
            views: `SELECT n.nspname schema,c.relname name,pg_get_viewdef(c.oid,true) definition FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=ANY($1) AND c.relkind IN ('v','m') ORDER BY 1,2`,
            types: `SELECT n.nspname schema,t.typname name,t.typtype,t.typbasetype::regtype::text base_type,t.typdefault,t.typnotnull,array_agg(e.enumlabel ORDER BY e.enumsortorder) FILTER(WHERE e.enumlabel IS NOT NULL) enum_values FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace LEFT JOIN pg_enum e ON e.enumtypid=t.oid WHERE n.nspname=ANY($1) GROUP BY n.nspname,t.oid ORDER BY 1,2`,
            sequences: `SELECT * FROM pg_sequences WHERE schemaname=ANY($1) ORDER BY schemaname,sequencename`,
        };
        for (const [key, sql] of Object.entries(queries)) snapshot[key] = (await db.query(sql, [schemas])).rows;
        await db.query('ROLLBACK');
        const folder = 'D:/Aboutme/Pawpal-infra/supabase-local/backups/guest-stage0-2026-10-26';
        fs.mkdirSync(folder, { recursive: true });
        const raw = JSON.stringify(snapshot, null, 2) + '\n';
        const filename = path.join(folder, 'schema-catalog.private.json');
        fs.writeFileSync(filename, raw);
        const audit = { capturedAt: snapshot.capturedAt, scope: 'READ ONLY catalog metadata; no business rows; transaction rolled back', backup: { path: filename, bytes: Buffer.byteLength(raw), sha256: crypto.createHash('sha256').update(raw).digest('hex'), limitation: snapshot.format },
            tables: tables.map(name => ({ name, exists: snapshot.relations.some(r => r.schema === 'public' && r.name === name) })),
            relations: snapshot.relations.filter(r => r.schema === 'public' && tables.includes(r.name)),
            columns: snapshot.columns.filter(r => r.schema === 'public' && tables.includes(r.table_name)),
            constraints: snapshot.constraints.filter(r => r.schema === 'public' && tables.includes(r.table_name)),
            indexes: snapshot.indexes.filter(r => r.schema === 'public' && tables.includes(r.table_name)),
            policies: snapshot.policies.filter(r => r.schema === 'public' && tables.includes(r.table_name)),
            triggers: snapshot.triggers.filter(r => r.schema === 'public' && tables.includes(r.table_name)),
            functions: snapshot.functions.filter(r => names.includes(r.name)) };
        fs.writeFileSync('docs/verification/sync/guest-stage0-catalog.txt', JSON.stringify(audit, null, 2) + '\n');
        console.log(JSON.stringify({ result: 'PASS read-only catalog snapshot', bytes: Buffer.byteLength(raw), tables: audit.tables, functions: audit.functions.map(f => ({ name:f.name, anon:f.anon_execute, authenticated:f.authenticated_execute })) }));
    } finally { await db.end(); }
})().catch(error => { console.error(error.code || error.name); process.exitCode = 1; });
