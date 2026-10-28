BEGIN;
-- Validate changed configuration sections only; leave existing configuration untouched.
CREATE OR REPLACE FUNCTION pawpal_private.validate_system_configuration()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
DECLARE cfg jsonb; prior jsonb:='{}'; section jsonb; phone text;
BEGIN
 IF NEW.setting_key<>'system_config' THEN RETURN NEW; END IF;
 cfg:=NEW.setting_value::jsonb;
 IF TG_OP='UPDATE' AND OLD.setting_key='system_config' THEN prior:=OLD.setting_value::jsonb; END IF;
 IF coalesce(cfg->'storeInfo','{}') IS DISTINCT FROM coalesce(prior->'storeInfo','{}') THEN
  section:=cfg->'storeInfo';
  phone:=regexp_replace(coalesce(section->>'hotline',''),'[[:space:]().-]','','g');
  IF jsonb_typeof(section) IS DISTINCT FROM 'object'
   OR coalesce(length(btrim(section->>'brandName')),0)=0 OR coalesce(length(btrim(section->>'address')),0)=0
   OR phone !~ '^(0[0-9]{9,10}|1[89]00[0-9]{4,6}|\+84[0-9]{9,10})$'
   OR coalesce(section->>'email','') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
   THEN RAISE EXCEPTION 'invalid_store_profile' USING ERRCODE='22023'; END IF;
 END IF;
 IF coalesce(cfg#>'{paymentMethods,bank}','{}') IS DISTINCT FROM coalesce(prior#>'{paymentMethods,bank}','{}') THEN
  section:=cfg#>'{paymentMethods,bank}';
  IF section->>'enabled'='true' AND (
   regexp_replace(coalesce(section->>'accountNumber',''),'[[:space:]-]','','g') !~ '^[0-9]+$'
   OR coalesce(length(btrim(section->>'bankName')),0)=0 OR coalesce(length(btrim(section->>'accountHolder')),0)=0
   OR coalesce(length(btrim(section->>'syntax')),0)=0
  ) THEN RAISE EXCEPTION 'invalid_bank_configuration' USING ERRCODE='22023'; END IF;
 END IF;
 IF coalesce(cfg->'hotelRules','{}') IS DISTINCT FROM coalesce(prior->'hotelRules','{}') THEN
  section:=cfg->'hotelRules';
  IF jsonb_typeof(section) IS DISTINCT FROM 'object'
   OR coalesce(section->>'checkInTime','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
   OR coalesce(section->>'checkOutTime','') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
   OR section->>'checkInTime'=section->>'checkOutTime'
   OR jsonb_typeof(section->'lateCheckOutFeePerHalfDay') IS DISTINCT FROM 'number'
   THEN RAISE EXCEPTION 'invalid_hotel_policy' USING ERRCODE='22023'; END IF;
  IF (section->>'lateCheckOutFeePerHalfDay')::numeric NOT BETWEEN 0 AND 1000000000
   THEN RAISE EXCEPTION 'invalid_hotel_policy' USING ERRCODE='22023'; END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.validate_system_configuration() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS validate_system_configuration ON public.pawpal_setting;
CREATE TRIGGER validate_system_configuration BEFORE INSERT OR UPDATE ON public.pawpal_setting
 FOR EACH ROW EXECUTE FUNCTION pawpal_private.validate_system_configuration();
NOTIFY pgrst,'reload schema';
COMMIT;
