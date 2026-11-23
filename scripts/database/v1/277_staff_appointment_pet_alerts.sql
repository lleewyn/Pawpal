BEGIN;
-- Read current pet warnings only through appointments already authorized for this staff member.
DO $$
DECLARE body text:=pg_get_functiondef('public.get_staff_workspace(text,text,uuid,integer)'::regprocedure);
 needle text:='a.appointment_status,a.updated_at FROM public.appointment a WHERE pawpal_private.work_owns_appointment(a.id)';
 replacement text:=$new$a.appointment_status,a.updated_at,
 (SELECT p.pet_name FROM public.pet_profile p WHERE p.id=a.pet_id) AS pet_name,
 (SELECT p.allergy FROM public.pet_profile p WHERE p.id=a.pet_id) AS pet_allergy,
 (SELECT p.safety_note FROM public.pet_profile p WHERE p.id=a.pet_id) AS pet_safety_note,
 (SELECT p.routine FROM public.pet_profile p WHERE p.id=a.pet_id) AS pet_routine
 FROM public.appointment a WHERE pawpal_private.work_owns_appointment(a.id)$new$;
BEGIN
 IF strpos(body,'AS pet_allergy')>0 THEN RETURN; END IF;
 IF strpos(body,needle)=0 THEN RAISE EXCEPTION 'unexpected_staff_appointment_read_definition'; END IF;
 EXECUTE replace(body,needle,replacement);
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
