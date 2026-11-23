BEGIN;
-- Match the service lifecycle's canonical and legacy completed statuses.
-- Keep customer, pet, service, date, staff and authorization checks intact.
DO $$
DECLARE body text:=pg_get_functiondef('public.act_admin_complaint(uuid,uuid,timestamptz,text,jsonb)'::regprocedure);
 old_text text:='a.id=evidence AND a.customer_id=ticket.customer_id AND a.pet_id=old.pet_id AND a.appointment_status=''completed''';
 new_text text:='a.id=evidence AND a.customer_id=ticket.customer_id AND a.pet_id=old.pet_id AND a.appointment_status IN (''completed'',''da_hoan_tat'',''done'')';
BEGIN
 IF strpos(body,new_text)>0 THEN RETURN; END IF;
 IF strpos(body,old_text)=0 THEN RAISE EXCEPTION 'unexpected_complaint_service_completion_definition'; END IF;
 EXECUTE replace(body,old_text,new_text);
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
