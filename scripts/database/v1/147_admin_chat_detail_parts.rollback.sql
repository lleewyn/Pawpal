BEGIN;
DROP FUNCTION IF EXISTS public.run_admin_chat_detail(uuid,text,jsonb,integer);
DROP FUNCTION IF EXISTS public.save_admin_copilot_detail(uuid,uuid,uuid,text,text,text,text);
NOTIFY pgrst,'reload schema';
COMMIT;
