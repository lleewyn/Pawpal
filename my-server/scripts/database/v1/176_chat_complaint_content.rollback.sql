BEGIN;
DROP FUNCTION public.create_chat_complaint(uuid,uuid,timestamptz,uuid,text,text,text,text);
NOTIFY pgrst,'reload schema';
COMMIT;
