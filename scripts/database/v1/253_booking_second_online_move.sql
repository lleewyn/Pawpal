BEGIN;
DO $$
DECLARE source text;
BEGIN
 SELECT pg_get_functiondef('pawpal_private.booking_move_service_quote(uuid,timestamptz,timestamptz,uuid)'::regprocedure) INTO source;
 IF position('a.appointment_status<>''confirmed''' IN source)=0 THEN RAISE EXCEPTION 'Unexpected booking move eligibility'; END IF;
 source:=replace(source,'a.appointment_status<>''confirmed''','NOT (a.appointment_status=''confirmed'' OR (a.appointment_status=''pending'' AND a.change_count>0))');
 EXECUTE source;
END $$;
COMMIT;
