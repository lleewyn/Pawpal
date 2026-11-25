BEGIN;
-- Explicit customer handoff uses active direct_request rules. No default SLA is invented.
CREATE OR REPLACE FUNCTION pawpal_private.set_chat_handoff_sla()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE seconds integer;
BEGIN
 IF NEW.status='waiting_agent' AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
  -- Strictest matching SLA wins; zero means immediate, NULL means unconfigured.
  SELECT min(sla_seconds) INTO seconds FROM public.chatbot_handover_rule WHERE is_active AND trigger_type='direct_request';
  NEW.sla_deadline:=CASE WHEN seconds IS NULL THEN NULL ELSE clock_timestamp()+seconds*interval '1 second' END;
 ELSIF NEW.status='bot_handling' THEN
  NEW.sla_deadline:=NULL;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.set_chat_handoff_sla() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS v1_chat_handoff_sla ON public.chat_conversation;
CREATE TRIGGER v1_chat_handoff_sla BEFORE INSERT OR UPDATE OF status ON public.chat_conversation FOR EACH ROW EXECUTE FUNCTION pawpal_private.set_chat_handoff_sla();
NOTIFY pgrst,'reload schema';
COMMIT;
