BEGIN;
-- Review optimistic locks need a new revision even within one transaction.
-- Run after the existing BEFORE triggers, which may use transaction now().
CREATE OR REPLACE FUNCTION pawpal_private.touch_review_revision() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 NEW.updated_at:=greatest(clock_timestamp(),OLD.updated_at+interval '1 microsecond');
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS zzzz_review_revision ON public.review;
CREATE TRIGGER zzzz_review_revision BEFORE UPDATE ON public.review FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_review_revision();
CREATE OR REPLACE FUNCTION public.moderate_admin_service_review(p_request uuid,p_review uuid,p_expected timestamptz,p_status text,p_reason text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE actor uuid; r public.review; prior public.audit_log; payload text;
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('review.write') OR NOT pawpal_private.has_permission('audit_log.write') THEN RAISE EXCEPTION 'review_moderation_forbidden' USING ERRCODE='42501'; END IF;
 IF p_request IS NULL OR p_review IS NULL OR p_status IS NULL OR p_status NOT IN ('pending','published','hidden','rejected') OR coalesce(length(btrim(p_reason)),0) NOT BETWEEN 2 AND 2000 THEN RAISE EXCEPTION 'invalid_review_moderation' USING ERRCODE='22023'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid() AND employment_status='active' AND NOT must_change_password;
 IF actor IS NULL THEN RAISE EXCEPTION 'review_moderation_forbidden' USING ERRCODE='42501'; END IF;
 payload:=jsonb_build_object('review',p_review,'status',p_status,'reason',btrim(p_reason))::text;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request::text,106));
 SELECT * INTO prior FROM public.audit_log WHERE id=p_request;
 IF FOUND THEN
  IF prior.staff_id IS DISTINCT FROM actor OR prior.action<>'MODERATE_SERVICE_REVIEW' OR prior.description IS DISTINCT FROM payload THEN RAISE EXCEPTION 'review_moderation_request_conflict' USING ERRCODE='PT409'; END IF;
  RETURN p_review;
 END IF;
 SELECT * INTO r FROM public.review WHERE id=p_review AND appointment_item_id IS NOT NULL FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'service_review_not_found' USING ERRCODE='P0002'; END IF;
 IF p_expected IS NULL OR r.updated_at IS DISTINCT FROM p_expected THEN RAISE EXCEPTION 'review_changed' USING ERRCODE='PT409'; END IF;
 UPDATE public.review SET review_status=p_status,updated_at=clock_timestamp() WHERE id=r.id;
 INSERT INTO public.audit_log(id,staff_id,action,entity_name,entity_id,description) VALUES(p_request,actor,'MODERATE_SERVICE_REVIEW','review',r.id,payload);
 RETURN r.id;
END $$;
REVOKE ALL ON FUNCTION public.moderate_admin_service_review(uuid,uuid,timestamptz,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.moderate_admin_service_review(uuid,uuid,timestamptz,text,text) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
