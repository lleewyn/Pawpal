BEGIN;
DO $$ DECLARE item text; BEGIN
 IF EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime' AND NOT puballtables) THEN
  FOREACH item IN ARRAY ARRAY['staff','staff_schedule','staff_shift_request','staff_assessment','staff_role','staff_permission','access_role','role_permission'] LOOP
   IF NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=item) THEN
    EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',item);
   END IF;
  END LOOP;
 END IF;
END $$;
COMMIT;
