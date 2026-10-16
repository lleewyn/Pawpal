-- Metadata only for Admin chatbot. Run against the intended Supabase project.
-- No business rows, secret values, function bodies, or database modifications.
BEGIN TRANSACTION READ ONLY;

-- Tables/views and RLS flags.
SELECT n.nspname AS schema_name, c.relname AS object_name, c.relkind,
       c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname ~ '^chat(bot)?_'
ORDER BY c.relname;

-- Columns (no defaults, which can contain application configuration).
SELECT table_schema, table_name, column_name, data_type, udt_name,
       is_nullable, character_maximum_length, numeric_precision, numeric_scale
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name ~ '^chat(bot)?_'
ORDER BY table_name, ordinal_position;

-- Constraints including CHECK, keys, and relationships.
SELECT c.relname AS table_name, k.conname, k.contype,
       pg_catalog.pg_get_constraintdef(k.oid, true) AS definition
FROM pg_catalog.pg_constraint k
JOIN pg_catalog.pg_class c ON c.oid = k.conrelid
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname ~ '^chat(bot)?_'
ORDER BY c.relname, k.conname;

-- Effective policy definitions: names alone are insufficient evidence.
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_catalog.pg_policies
WHERE schemaname = 'public' AND tablename ~ '^chat(bot)?_'
ORDER BY tablename, policyname;

-- Table grants visible to the executing role.
SELECT table_schema, table_name, grantee, privilege_type, is_grantable
FROM information_schema.table_privileges
WHERE table_schema = 'public' AND table_name ~ '^chat(bot)?_'
ORDER BY table_name, grantee, privilege_type;

SELECT table_schema, table_name, column_name, grantee, privilege_type
FROM information_schema.column_privileges
WHERE table_schema = 'public' AND table_name ~ '^chat(bot)?_'
ORDER BY table_name, column_name, grantee, privilege_type;

-- Trigger identity only, no trigger/function bodies.
SELECT c.relname AS table_name, t.tgname, t.tgenabled,
       pn.nspname AS function_schema, p.proname AS function_name
FROM pg_catalog.pg_trigger t
JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
JOIN pg_catalog.pg_proc p ON p.oid = t.tgfoid
JOIN pg_catalog.pg_namespace pn ON pn.oid = p.pronamespace
WHERE n.nspname = 'public' AND c.relname ~ '^chat(bot)?_' AND NOT t.tgisinternal
ORDER BY c.relname, t.tgname;

-- Related RPC metadata and ACLs, never invoke these functions.
SELECT n.nspname, p.proname, pg_catalog.pg_get_function_identity_arguments(p.oid) AS args,
       p.prosecdef AS security_definer, p.proacl,
       pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_execute,
       pg_catalog.has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_execute
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND
      (p.proname ~ 'chat' OR p.proname IN ('match_documents', 'pawpal_is_staff', 'check_user_account_type'))
ORDER BY p.proname;

-- Actual Realtime publication membership.
SELECT pubname, schemaname, tablename
FROM pg_catalog.pg_publication_tables
WHERE pubname = 'supabase_realtime' AND schemaname = 'public'
      AND (tablename ~ '^chat(bot)?_' OR tablename = 'support_ticket')
ORDER BY tablename;

-- Storage policies only; no bucket/object rows or signed URLs.
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_catalog.pg_policies
WHERE schemaname = 'storage' AND tablename IN ('buckets', 'objects')
ORDER BY tablename, policyname;

-- Existence of migration ledger. Its contents are not read automatically.
SELECT to_regclass('supabase_migrations.schema_migrations') IS NOT NULL AS migration_ledger_exists;

ROLLBACK;
