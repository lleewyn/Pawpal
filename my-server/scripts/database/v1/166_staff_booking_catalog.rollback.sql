BEGIN;
DROP FUNCTION IF EXISTS public.get_staff_booking_catalog(text,uuid,text,integer);
DO $$ DECLARE fn text; source text; needle text:=E' PERFORM pawpal_private.work_guard_booking_staff(p_details);\n'; BEGIN
 FOREACH fn IN ARRAY ARRAY['create_admin_service_booking','create_admin_logistics_booking'] LOOP
  SELECT pg_get_functiondef(to_regprocedure('public.'||fn||'(uuid,jsonb)')) INTO source;
  IF strpos(source,needle)=0 THEN RAISE EXCEPTION 'unexpected_booking_definition'; END IF;
  EXECUTE replace(source,needle,'');
 END LOOP;
END $$;
DROP FUNCTION pawpal_private.work_guard_booking_staff(jsonb);
COMMIT;
