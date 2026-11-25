-- Phase 1 metadata inspection only. No application rows and no DDL/DML.
-- Run on the same project verified for the Admin runtime.
-- Multiple result sets: export results with their section names.
BEGIN READ ONLY;
SET LOCAL statement_timeout = '30s';

-- 01: Authoritative types, NULL, defaults, precision, generated/identity.
SELECT '01_columns' AS section, table_schema, table_name, column_name,
       ordinal_position, data_type, udt_schema, udt_name, is_nullable,
       CASE WHEN column_name ~ '(password|token|key_value)' THEN '[suppressed]'
            ELSE column_default END AS column_default,
       character_maximum_length, numeric_precision, numeric_scale,
       datetime_precision, is_identity, identity_generation,
       is_generated, generation_expression
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- 02: PK, FK, UNIQUE, CHECK and FK deletion/update behavior.
SELECT '02_constraints' AS section, n.nspname AS schema_name,
       c.relname AS table_name, co.conname AS constraint_name,
       co.contype AS constraint_type,
       pg_get_constraintdef(co.oid, true) AS definition,
       co.convalidated AS validated,
       co.condeferrable AS deferrable, co.condeferred AS initially_deferred
FROM pg_constraint co
JOIN pg_class c ON c.oid = co.conrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
ORDER BY c.relname, co.conname;

-- 03: Index definitions; confirms conflict targets and partial uniqueness.
SELECT '03_indexes' AS section, schemaname, tablename, indexname, indexdef
FROM pg_indexes WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 04: All public enum labels and their exact case/order.
SELECT '04_enums' AS section, n.nspname AS schema_name, t.typname,
       e.enumsortorder, e.enumlabel
FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
ORDER BY t.typname, e.enumsortorder;

-- 05: User triggers, enablement and the underlying function fingerprint.
-- No function invocation and no function bodies containing possible secrets.
SELECT '05_triggers' AS section, n.nspname AS schema_name,
       c.relname AS table_name, t.tgname AS trigger_name, t.tgenabled,
       pg_get_triggerdef(t.oid, true) AS trigger_definition,
       p.proname AS function_name,
       md5(pg_get_functiondef(p.oid)) AS function_definition_hash
FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE n.nspname = 'public' AND NOT t.tgisinternal
ORDER BY c.relname, t.tgname;

-- 06: Function signatures/security, without executing them.
SELECT '06_functions' AS section, n.nspname AS schema_name, p.proname,
       pg_get_function_identity_arguments(p.oid) AS identity_arguments,
       pg_get_function_arguments(p.oid) AS arguments,
       pg_get_function_result(p.oid) AS return_type,
       p.prosecdef AS security_definer, p.provolatile AS volatility,
       p.proconfig AS function_settings,
       md5(pg_get_functiondef(p.oid)) AS definition_hash
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prokind IN ('f', 'p')
ORDER BY p.proname, identity_arguments;

-- 07: RLS flags and published policies.
SELECT '07_rls_flags' AS section, n.nspname AS schema_name,
       c.relname AS table_name, c.relrowsecurity AS rls_enabled,
       c.relforcerowsecurity AS rls_forced
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
ORDER BY c.relname;
SELECT '07_policies' AS section, schemaname, tablename, policyname,
       permissive, roles, cmd, qual, with_check
FROM pg_policies WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 08: Grants visible to the connected catalog-reading role.
SELECT '08_table_grants' AS section, grantee, table_schema, table_name,
       privilege_type, is_grantable
FROM information_schema.role_table_grants
WHERE table_schema = 'public' ORDER BY table_name, grantee, privilege_type;
SELECT '08_routine_grants' AS section, grantee, routine_schema,
       routine_name, specific_name, privilege_type
FROM information_schema.role_routine_grants
WHERE routine_schema = 'public' ORDER BY routine_name, grantee;

-- 09: Realtime membership, without subscribing to application data.
SELECT '09_publications' AS section, pubname, schemaname, tablename
FROM pg_publication_tables WHERE schemaname = 'public'
ORDER BY pubname, tablename;

-- 10: View definitions and view settings; no view row reads.
SELECT '10_views' AS section, n.nspname AS schema_name, c.relname AS view_name,
       c.reloptions AS view_options, pg_get_viewdef(c.oid, true) AS definition
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind IN ('v', 'm')
ORDER BY c.relname;
COMMIT;
