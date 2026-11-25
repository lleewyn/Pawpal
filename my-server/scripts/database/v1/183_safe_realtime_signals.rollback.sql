BEGIN;
DROP TRIGGER v183_auth_signal ON auth.users;
DO $$ DECLARE t record; flags jsonb; operations text; BEGIN
 FOR t IN SELECT value->>'definition' definition FROM pawpal_private.realtime_signal_backup WHERE name<>'publication' LOOP EXECUTE t.definition; END LOOP;
 FOR t IN SELECT n.nspname,c.relname FROM pg_trigger g JOIN pg_class c ON c.oid=g.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE g.tgname='v183_workspace_signal' AND NOT g.tgisinternal LOOP
  EXECUTE format('DROP TRIGGER v183_workspace_signal ON %I.%I',t.nspname,t.relname);
 END LOOP;
 SELECT value INTO STRICT flags FROM pawpal_private.realtime_signal_backup WHERE name='publication';
 operations:=concat_ws(',',CASE WHEN (flags->>'pubinsert')::boolean THEN 'insert' END,CASE WHEN (flags->>'pubupdate')::boolean THEN 'update' END,CASE WHEN (flags->>'pubdelete')::boolean THEN 'delete' END,CASE WHEN (flags->>'pubtruncate')::boolean THEN 'truncate' END);
 EXECUTE format('ALTER PUBLICATION supabase_realtime SET(publish=%L)',operations);
END $$;
DROP FUNCTION pawpal_private.signal_workspace_change();
DROP FUNCTION pawpal_private.emit_workspace_signal(uuid[],text);
DROP FUNCTION public.get_workspace_signal_context();
DROP TABLE public.workspace_signal;
DROP TABLE pawpal_private.realtime_signal_backup;
NOTIFY pgrst,'reload schema';
COMMIT;
