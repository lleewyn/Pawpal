-- Management assignment pickers must recognize the fixed work roles, without granting management writes.
BEGIN;
SET LOCAL lock_timeout='2s';
CREATE TABLE pawpal_private.v186_function_backup(signature text PRIMARY KEY,definition text NOT NULL);
REVOKE ALL ON pawpal_private.v186_function_backup FROM PUBLIC,anon,authenticated,service_role;
DO $$ DECLARE signature text; source text; legacy text; work text;
BEGIN
 FOREACH signature IN ARRAY ARRAY['public.get_admin_chat_handlers()','public.get_admin_complaint_handlers()'] LOOP
  legacy:=CASE WHEN signature='public.get_admin_chat_handlers()' THEN 'chat_conversation.write' ELSE 'support_ticket.write' END;
  work:=CASE WHEN signature='public.get_admin_chat_handlers()' THEN 'work.chat.handle' ELSE 'work.complaint.handle' END;
  SELECT pg_get_functiondef(to_regprocedure(signature)) INTO source;
  IF strpos(source,'rp.permission_code='''||legacy||'''')=0 THEN RAISE EXCEPTION 'unexpected_assignment_handler_definition'; END IF;
  INSERT INTO pawpal_private.v186_function_backup VALUES(signature,source);
  source:=replace(source,'rp.permission_code='''||legacy||'''','rp.permission_code IN ('''||legacy||''','''||work||''')');
  EXECUTE source;
 END LOOP;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
