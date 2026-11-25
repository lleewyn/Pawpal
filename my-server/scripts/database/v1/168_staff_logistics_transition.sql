-- Permit assigned STAFF service transitions without granting legacy table-write permissions.
BEGIN;
DO $$ DECLARE source text;
 needle text:='   AND (NOT pawpal_private.has_permission(''audit_log.write'') OR';
 addition text:=$guard$   AND NOT coalesce((
    pawpal_private.has_permission('work.service.perform')
    AND NEW.staff_id=pawpal_private.work_actor()
    AND (OLD.staff_id IS NULL OR OLD.staff_id=pawpal_private.work_actor())
    AND (OLD.staff_id=pawpal_private.work_actor() OR EXISTS(SELECT 1 FROM public.appointment_item i WHERE i.appointment_id=OLD.id AND i.is_primary AND i.staff_id=pawpal_private.work_actor()))
    AND NEW.customer_id IS NOT DISTINCT FROM OLD.customer_id AND NEW.pet_id IS NOT DISTINCT FROM OLD.pet_id
    AND NEW.scheduled_start_at IS NOT DISTINCT FROM OLD.scheduled_start_at AND NEW.scheduled_end_at IS NOT DISTINCT FROM OLD.scheduled_end_at
    AND NEW.change_count IS NOT DISTINCT FROM OLD.change_count
    AND (OLD.appointment_status='confirmed' AND NEW.appointment_status IN ('checked_in','in_progress')
      OR OLD.appointment_status='checked_in' AND NEW.appointment_status='in_progress'
      OR OLD.appointment_status='in_progress' AND NEW.appointment_status='completed')
    AND (category='pet_hotel' OR EXISTS(SELECT 1 FROM public.taxi_trip t WHERE t.appointment_id=OLD.id AND t.driver_staff_id=pawpal_private.work_actor()))
   ),false)
$guard$;
BEGIN
 SELECT pg_get_functiondef(to_regprocedure('pawpal_private.sync_service_logistics()')) INTO source;
 IF source IS NULL OR strpos(source,needle)=0 OR strpos(source,'work.service.perform')>0 THEN RAISE EXCEPTION 'unexpected_logistics_trigger_definition'; END IF;
 EXECUTE replace(source,needle,addition||needle);
END $$;
COMMIT;
