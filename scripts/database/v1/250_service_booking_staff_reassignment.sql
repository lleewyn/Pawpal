BEGIN;

DO $migration$
DECLARE
    source text;
BEGIN
    source := pg_get_functiondef('pawpal_private.guard_requested_booking()'::regprocedure);
    source := replace(source,
        $old$DECLARE choice jsonb;consented boolean:=false;$old$,
        $new$DECLARE choice jsonb;consented boolean:=false;admin_reassign boolean:=false;$new$);
    source := replace(source,
        $old$ IF OLD.requested_staff_id IS NOT NULL AND NOT consented AND ($old$,
        $new$ admin_reassign:=OLD.requested_staff_id IS NOT NULL
  AND NEW.staff_id IS NOT NULL AND NEW.staff_id IS DISTINCT FROM OLD.staff_id
  AND NEW.requested_staff_id=NEW.staff_id AND NEW.staff_confirmation_status='confirmed'
  AND OLD.appointment_status IN('checked_in','in_progress','da_check_in','da_tiep_nhan','dang_thuc_hien','accepted')
  AND pawpal_private.has_permission('appointment.write');
 IF OLD.requested_staff_id IS NOT NULL AND NOT consented AND NOT admin_reassign AND ($new$);
    source := replace(source,
        $old$IF OLD.requested_staff_id IS NOT NULL AND (NEW.scheduled_start_at,NEW.scheduled_end_at) IS DISTINCT FROM (OLD.scheduled_start_at,OLD.scheduled_end_at) AND NOT consented THEN$old$,
        $new$IF OLD.requested_staff_id IS NOT NULL AND (NEW.scheduled_start_at,NEW.scheduled_end_at) IS DISTINCT FROM (OLD.scheduled_start_at,OLD.scheduled_end_at) AND NOT consented AND NOT admin_reassign THEN$new$);
    source := replace(source,
        $old$AND NEW.requested_staff_id IS NOT NULL THEN$old$,
        $new$AND NEW.requested_staff_id IS NOT NULL AND NOT admin_reassign THEN$new$);
    IF position('admin_reassign boolean' in source)=0
       OR position('NOT consented AND NOT admin_reassign' in source)=0
       OR position('NOT admin_reassign THEN' in source)=0 THEN
        RAISE EXCEPTION 'Could not update requested staff guard safely';
    END IF;
    EXECUTE source;

    source := pg_get_functiondef('public.update_admin_service_booking(uuid,timestamptz,text,text,text)'::regprocedure);
    source := replace(source,
        $old$IF a.appointment_status NOT IN ('pending','confirmed','checked_in','in_progress') OR coalesce(length(btrim(p_reason)),0)=0 THEN$old$,
        $new$IF a.appointment_status NOT IN ('pending','confirmed','checked_in','in_progress','da_check_in','da_tiep_nhan','dang_thuc_hien','accepted') OR coalesce(length(btrim(p_reason)),0)=0 THEN$new$);
    source := replace(source,
        $old$UPDATE public.appointment SET staff_id=staff_key WHERE id=p_id;$old$,
        $new$IF a.requested_staff_id IS NOT NULL AND a.appointment_status IN('checked_in','in_progress','da_check_in','da_tiep_nhan','dang_thuc_hien','accepted') THEN
   UPDATE public.appointment SET staff_id=staff_key,requested_staff_id=staff_key,staff_confirmation_status='confirmed',
    proposal_staff_id=NULL,proposal_start_at=NULL,proposal_end_at=NULL,proposal_created_at=NULL WHERE id=p_id;
  ELSE
   UPDATE public.appointment SET staff_id=staff_key WHERE id=p_id;
  END IF;$new$);
    source := replace(source,
        $old$jsonb_build_object('action',p_action,'value',p_value,'reason',btrim(p_reason))$old$,
        $new$jsonb_build_object('action',p_action,'value',p_value,'reason',btrim(p_reason),
         'previous_staff_id',a.staff_id,'previous_requested_staff_id',a.requested_staff_id)$new$);
    IF position('da_check_in' in source)=0
       OR position('previous_requested_staff_id' in source)=0
       OR position('staff_confirmation_status=''confirmed''' in source)=0 THEN
        RAISE EXCEPTION 'Could not update Admin booking assignment safely';
    END IF;
    EXECUTE source;
END
$migration$;

COMMIT;
NOTIFY pgrst, 'reload schema';
