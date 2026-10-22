BEGIN;
CREATE OR REPLACE FUNCTION public.get_admin_complaint_handlers()
RETURNS TABLE(id uuid,full_name text) LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF NOT pawpal_private.has_permission('support_ticket.write') OR NOT pawpal_private.has_permission('staff.read') THEN RAISE EXCEPTION 'complaint_forbidden' USING ERRCODE='42501'; END IF;
 RETURN QUERY SELECT s.id,s.full_name FROM public.staff s JOIN auth.users u ON u.id=s.auth_user_id
 WHERE s.employment_status='active' AND NOT s.must_change_password AND (u.banned_until IS NULL OR u.banned_until<=now())
 AND (EXISTS(SELECT 1 FROM public.staff_role sr JOIN public.role_permission rp ON rp.role_code=sr.role_code WHERE sr.staff_id=s.id AND rp.permission_code='support_ticket.write')
 OR EXISTS(SELECT 1 FROM public.staff_permission sp WHERE sp.staff_id=s.id AND sp.permission_code='support_ticket.write')) ORDER BY s.full_name,s.id;
END $$;
REVOKE ALL ON FUNCTION public.get_admin_complaint_handlers() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_admin_complaint_handlers() TO authenticated;
CREATE OR REPLACE FUNCTION public.assign_admin_complaint(p_request_id uuid,p_ticket_id uuid,p_expected_updated_at timestamptz,p_staff_id uuid,p_note text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE actor uuid; prior public.audit_log; ticket public.support_ticket; payload text;
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('support_ticket.read') OR NOT pawpal_private.has_permission('support_ticket.write')
 OR NOT pawpal_private.has_permission('support_ticket_message.write') OR NOT pawpal_private.has_permission('staff.read')
 OR NOT pawpal_private.has_permission('audit_log.write') THEN RAISE EXCEPTION 'complaint_forbidden' USING ERRCODE='42501'; END IF;
 IF p_request_id IS NULL OR p_ticket_id IS NULL OR p_staff_id IS NULL OR coalesce(length(btrim(p_note)),0) NOT BETWEEN 2 AND 4000 THEN RAISE EXCEPTION 'invalid_complaint_assignment' USING ERRCODE='22023'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 payload:=jsonb_build_object('ticket_id',p_ticket_id,'staff_id',p_staff_id,'note',btrim(p_note))::text;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text,40));
 SELECT * INTO prior FROM public.audit_log WHERE id=p_request_id;
 IF FOUND THEN
  IF prior.action<>'COMPLAINT_ASSIGN' OR prior.staff_id IS DISTINCT FROM actor OR prior.description<>payload THEN RAISE EXCEPTION 'complaint_request_conflict' USING ERRCODE='PT409'; END IF;
  RETURN p_ticket_id;
 END IF;
 PERFORM 1 FROM public.staff s JOIN auth.users u ON u.id=s.auth_user_id
 WHERE s.id=p_staff_id AND s.employment_status='active' AND NOT s.must_change_password
 AND (u.banned_until IS NULL OR u.banned_until<=now())
 AND (EXISTS(SELECT 1 FROM public.staff_role sr JOIN public.role_permission rp ON rp.role_code=sr.role_code WHERE sr.staff_id=s.id AND rp.permission_code='support_ticket.write')
 OR EXISTS(SELECT 1 FROM public.staff_permission sp WHERE sp.staff_id=s.id AND sp.permission_code='support_ticket.write')) FOR SHARE OF s;
 IF NOT FOUND THEN RAISE EXCEPTION 'complaint_handler_unavailable' USING ERRCODE='22023'; END IF;
 SELECT * INTO ticket FROM public.support_ticket WHERE id=p_ticket_id FOR UPDATE;
 IF NOT FOUND OR ticket.updated_at IS DISTINCT FROM p_expected_updated_at THEN RAISE EXCEPTION 'complaint_changed' USING ERRCODE='PT409'; END IF;
 IF ticket.status IN ('resolved','completed','closed','rejected') THEN RAISE EXCEPTION 'complaint_not_open' USING ERRCODE='PT409'; END IF;
 UPDATE public.support_ticket SET assigned_staff_id=p_staff_id,status=CASE WHEN status IN ('pending','new','mo') THEN 'processing' ELSE status END,updated_at=clock_timestamp() WHERE id=p_ticket_id;
 INSERT INTO public.support_ticket_message(ticket_id,sender_type,sender_account_id,content,is_internal)
 VALUES(p_ticket_id,'staff',auth.uid(),'[Phân công] '||(SELECT full_name FROM public.staff WHERE id=p_staff_id)||': '||btrim(p_note),true);
 INSERT INTO public.audit_log(id,staff_id,action,entity_name,entity_id,description) VALUES(p_request_id,actor,'COMPLAINT_ASSIGN','support_ticket',p_ticket_id,payload);
 RETURN p_ticket_id;
END $$;
REVOKE ALL ON FUNCTION public.assign_admin_complaint(uuid,uuid,timestamptz,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.assign_admin_complaint(uuid,uuid,timestamptz,uuid,text) TO authenticated;
CREATE OR REPLACE FUNCTION pawpal_private.guard_complaint_audit() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $$ BEGIN
 IF NEW.action LIKE 'COMPLAINT\_%' ESCAPE '\' AND current_user IN ('authenticated','anon','authenticator') THEN RAISE EXCEPTION 'complaint_audit_server_only' USING ERRCODE='42501'; END IF;RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.guard_complaint_audit() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS v1_complaint_audit_server ON public.audit_log;
CREATE TRIGGER v1_complaint_audit_server BEFORE INSERT ON public.audit_log FOR EACH ROW EXECUTE FUNCTION pawpal_private.guard_complaint_audit();
NOTIFY pgrst,'reload schema';
COMMIT;
