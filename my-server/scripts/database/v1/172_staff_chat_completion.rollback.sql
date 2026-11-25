BEGIN;
DROP FUNCTION public.get_staff_chat_receipt(uuid);
DO $$ DECLARE source text; needle text:='SELECT id,status,created_at,updated_at FROM public.chat_conversation WHERE assigned_staff_id IS NULL AND status=''waiting_agent'''; BEGIN
 SELECT pg_get_functiondef('public.get_staff_workspace(text,text,uuid,integer)'::regprocedure) INTO source;
 IF strpos(source,needle)=0 THEN RAISE EXCEPTION 'unexpected_chat_queue_projection'; END IF;
 EXECUTE replace(source,needle,'SELECT id,status,created_at FROM public.chat_conversation WHERE assigned_staff_id IS NULL AND status=''waiting_agent''');
END $$;
COMMIT;
