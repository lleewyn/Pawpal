BEGIN;
SET LOCAL lock_timeout='3s';
ALTER TABLE public.pet_profile ADD COLUMN archived_at timestamptz;
-- Legacy archived profiles have no recorded transition time. Give them a full recovery period
-- from the introduction of tracking rather than guessing a past date from unrelated edits.
UPDATE public.pet_profile SET archived_at=clock_timestamp() WHERE status IN ('inactive','disabled','archived');
CREATE FUNCTION pawpal_private.track_pet_archive_time() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF NEW.status IN ('inactive','disabled','archived') THEN
  IF TG_OP='INSERT' THEN NEW.archived_at:=clock_timestamp();
  ELSIF OLD.status NOT IN ('inactive','disabled','archived') THEN NEW.archived_at:=clock_timestamp();
  ELSE NEW.archived_at:=coalesce(OLD.archived_at,clock_timestamp());END IF;
 ELSE NEW.archived_at:=null;END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.track_pet_archive_time() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER track_pet_archive_time BEFORE INSERT OR UPDATE OF status,archived_at ON public.pet_profile
FOR EACH ROW EXECUTE FUNCTION pawpal_private.track_pet_archive_time();
NOTIFY pgrst,'reload schema';
COMMIT;
