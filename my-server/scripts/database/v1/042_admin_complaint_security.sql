BEGIN;
-- Existing service intake retains its explicit permission checks after direct
-- browser writes are removed. Both creation RPCs derive identity from auth.uid().
ALTER FUNCTION public.create_admin_service_ticket(uuid,uuid,uuid,text) SECURITY DEFINER;
ALTER FUNCTION public.create_admin_complaint(uuid,uuid,uuid,uuid,text,text,text,text) SECURITY DEFINER;
REVOKE INSERT,UPDATE,DELETE ON public.support_ticket,public.support_ticket_message FROM authenticated,anon;
DO $$ DECLARE table_name text; BEGIN
 IF EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') THEN
  FOREACH table_name IN ARRAY ARRAY['support_ticket','support_ticket_message','support_ticket_message_attachment','refund_transaction','return_request','appointment_record','care_log'] LOOP
   IF NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=table_name) THEN
    EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',table_name);
   END IF;
  END LOOP;
 END IF;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
