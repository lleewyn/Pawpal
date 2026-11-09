BEGIN;
SET LOCAL lock_timeout='3s';
-- Supabase is the authority for these scopes. Session context UUIDs can precede a draft parent;
-- the committed references below always use actual business foreign keys.
ALTER TABLE public.media_upload_session ADD COLUMN ticket_id uuid,ADD COLUMN support_message_id uuid,ADD COLUMN return_id uuid,ADD COLUMN sales_order_id uuid REFERENCES public.sales_order(id);
ALTER TABLE public.support_ticket_message_attachment ADD COLUMN media_asset_id uuid UNIQUE REFERENCES public.media_asset(id),ALTER COLUMN file_url DROP NOT NULL;
ALTER TABLE public.support_ticket_message_attachment ADD CONSTRAINT ticket_attachment_one_source CHECK((file_url IS NOT NULL)::integer+(media_asset_id IS NOT NULL)::integer=1);
ALTER TABLE public.return_request_evidence ADD COLUMN media_asset_id uuid UNIQUE REFERENCES public.media_asset(id),ALTER COLUMN image_url DROP NOT NULL;
ALTER TABLE public.return_request_evidence ADD CONSTRAINT return_evidence_one_source CHECK((image_url IS NOT NULL)::integer+(media_asset_id IS NOT NULL)::integer=1);
REVOKE INSERT,UPDATE,DELETE ON public.support_ticket_message_attachment,public.return_request_evidence FROM anon,authenticated;

CREATE FUNCTION pawpal_private.evidence_customer(p_user uuid) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT c.id FROM public.customer c JOIN auth.users u ON u.id=c.auth_user_id WHERE u.id=p_user AND c.customer_status='active' AND coalesce(u.banned_until<=now(),true) AND NOT EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=p_user)
$$;
CREATE FUNCTION pawpal_private.evidence_admin(p_user uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT EXISTS(SELECT 1 FROM public.staff_role WHERE staff_id=pawpal_private.media_staff(p_user) AND role_code='ADMIN')
$$;
CREATE FUNCTION pawpal_private.evidence_access(p_user uuid,p_purpose text,p_target uuid,p_context uuid,p_write boolean) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE t public.support_ticket;m public.support_ticket_message;owner_id uuid;actor_staff uuid:=pawpal_private.media_staff(p_user);admin boolean:=pawpal_private.evidence_admin(p_user);
BEGIN
 IF p_user IS NULL OR p_target IS NULL OR p_context IS NULL THEN RETURN false; END IF;
 IF p_purpose='ticket_image' THEN
  SELECT * INTO t FROM public.support_ticket WHERE id=p_context;
  IF NOT FOUND THEN RETURN p_write AND (admin OR pawpal_private.evidence_customer(p_user) IS NOT NULL); END IF;
  SELECT * INTO m FROM public.support_ticket_message WHERE id=p_target;
  IF FOUND AND (m.ticket_id<>t.id OR (p_write AND m.sender_account_id IS DISTINCT FROM p_user)) THEN RETURN false; END IF;
  IF p_write AND t.status IN ('closed','resolved','completed','rejected') THEN RETURN false; END IF;
  IF admin OR (actor_staff IS NOT NULL AND t.assigned_staff_id=actor_staff AND EXISTS(SELECT 1 FROM public.staff_role sr JOIN public.role_permission rp ON rp.role_code=sr.role_code WHERE sr.staff_id=actor_staff AND rp.permission_code='work.complaint.handle')) THEN RETURN true; END IF;
  RETURN pawpal_private.evidence_customer(p_user)=t.customer_id AND NOT coalesce(m.is_internal,false);
 ELSIF p_purpose='return_image' THEN
  SELECT customer_id INTO owner_id FROM public.sales_order WHERE id=p_context AND (NOT p_write OR order_status IN ('completed','delivered','returned'));
  IF NOT FOUND OR EXISTS(SELECT 1 FROM public.return_request WHERE id=p_target AND (sales_order_id<>p_context OR (p_write AND request_status<>'pending'))) THEN RETURN false; END IF;
  RETURN admin OR pawpal_private.evidence_customer(p_user)=owner_id;
 END IF;
 RETURN false;
END $$;
CREATE FUNCTION pawpal_private.media_session_manage(p_user uuid,p_session uuid,p_write boolean DEFAULT true) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE s public.media_upload_session;
BEGIN
 SELECT * INTO s FROM public.media_upload_session WHERE id=p_session;
 IF NOT FOUND THEN RETURN false; END IF;
 IF s.purpose IN ('ticket_image','return_image') THEN RETURN coalesce(pawpal_private.evidence_access(p_user,s.purpose,coalesce(s.support_message_id,s.return_id),coalesce(s.ticket_id,s.sales_order_id),p_write),false); END IF;
 RETURN pawpal_private.media_manage(p_user,s.purpose,s.product_id,s.appointment_id);
END $$;
CREATE FUNCTION pawpal_private.attach_private_evidence(p_purpose text,p_target uuid,p_ids jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE context_id uuid;item jsonb;selected uuid;seen uuid[]:='{}';a public.media_asset;s public.media_upload_session;position integer;
BEGIN
 IF p_purpose='ticket_image' THEN SELECT ticket_id INTO context_id FROM public.support_ticket_message WHERE id=p_target AND sender_account_id=auth.uid();
 ELSIF p_purpose='return_image' THEN SELECT sales_order_id INTO context_id FROM public.return_request WHERE id=p_target;
 ELSE RAISE EXCEPTION 'evidence_purpose_invalid' USING ERRCODE='22023'; END IF;
 IF context_id IS NULL OR NOT coalesce(pawpal_private.evidence_access(auth.uid(),p_purpose,p_target,context_id,false),false) THEN RAISE EXCEPTION 'evidence_forbidden' USING ERRCODE='42501'; END IF;
 IF jsonb_typeof(p_ids) IS DISTINCT FROM 'array' OR jsonb_array_length(p_ids)>5 THEN RAISE EXCEPTION 'invalid_evidence' USING ERRCODE='22023'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(p_ids) LOOP
  IF jsonb_typeof(item) IS DISTINCT FROM 'string' THEN RAISE EXCEPTION 'invalid_evidence' USING ERRCODE='22023'; END IF;
  selected:=(item#>>'{}')::uuid;IF selected IS NULL OR selected=ANY(seen) THEN RAISE EXCEPTION 'invalid_evidence' USING ERRCODE='22023'; END IF;seen:=array_append(seen,selected);
  SELECT * INTO a FROM public.media_asset WHERE id=selected;
  SELECT * INTO s FROM public.media_upload_session WHERE id=a.session_id FOR UPDATE;
  SELECT * INTO a FROM public.media_asset WHERE id=selected FOR UPDATE;
  IF a.id IS NULL OR s.purpose<>p_purpose OR coalesce(s.support_message_id,s.return_id) IS DISTINCT FROM p_target OR coalesce(s.ticket_id,s.sales_order_id) IS DISTINCT FROM context_id
   OR a.status NOT IN ('verified','attached') OR s.state NOT IN ('verified','attached') OR (a.status='verified' AND (s.created_by IS DISTINCT FROM auth.uid() OR NOT coalesce(pawpal_private.evidence_access(auth.uid(),p_purpose,p_target,context_id,true),false))) THEN RAISE EXCEPTION 'evidence_forbidden' USING ERRCODE='42501'; END IF;
  IF p_purpose='ticket_image' THEN
   IF NOT EXISTS(SELECT 1 FROM public.support_ticket_message_attachment WHERE media_asset_id=a.id AND message_id=p_target) THEN
    SELECT count(*) INTO position FROM public.support_ticket_message_attachment WHERE message_id=p_target;IF position>=5 THEN RAISE EXCEPTION 'evidence_limit' USING ERRCODE='22023'; END IF;
    INSERT INTO public.support_ticket_message_attachment(message_id,media_asset_id,file_name,file_size,media_type,display_order) VALUES(p_target,a.id,s.original_name,a.size_bytes,'image',position);
   END IF;
  ELSE
   IF NOT EXISTS(SELECT 1 FROM public.return_request_evidence WHERE media_asset_id=a.id AND return_request_id=p_target) THEN
    SELECT count(*) INTO position FROM public.return_request_evidence WHERE return_request_id=p_target;IF position>=5 THEN RAISE EXCEPTION 'evidence_limit' USING ERRCODE='22023'; END IF;
    INSERT INTO public.return_request_evidence(return_request_id,media_asset_id,display_order) VALUES(p_target,a.id,position);
   END IF;
  END IF;
  UPDATE public.media_asset SET status='attached',legal_hold=true WHERE id=a.id;UPDATE public.media_upload_session SET state='attached' WHERE id=s.id;
 END LOOP;
END $$;
CREATE FUNCTION public.list_ticket_media(p_ticket uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE result jsonb;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.support_ticket WHERE id=p_ticket) OR NOT coalesce(pawpal_private.evidence_access(auth.uid(),'ticket_image',gen_random_uuid(),p_ticket,false),false) THEN RAISE EXCEPTION 'evidence_forbidden' USING ERRCODE='42501'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',f.id,'message_id',m.id,'media_asset_id',f.media_asset_id,'media_url',f.file_url,'file_name',f.file_name,'file_size',f.file_size) ORDER BY m.created_at,f.display_order,f.id),'[]') INTO result
 FROM public.support_ticket_message_attachment f JOIN public.support_ticket_message m ON m.id=f.message_id WHERE m.ticket_id=p_ticket AND coalesce(pawpal_private.evidence_access(auth.uid(),'ticket_image',m.id,p_ticket,false),false);
 RETURN result;
END $$;
CREATE FUNCTION public.list_return_media(p_return uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE context_id uuid;
BEGIN
 SELECT sales_order_id INTO context_id FROM public.return_request WHERE id=p_return;
 IF context_id IS NULL OR NOT coalesce(pawpal_private.evidence_access(auth.uid(),'return_image',p_return,context_id,false),false) THEN RAISE EXCEPTION 'evidence_forbidden' USING ERRCODE='42501'; END IF;
 RETURN (SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'media_asset_id',media_asset_id,'media_url',image_url) ORDER BY display_order,id),'[]') FROM public.return_request_evidence WHERE return_request_id=p_return);
END $$;
REVOKE ALL ON FUNCTION pawpal_private.evidence_customer(uuid),pawpal_private.evidence_admin(uuid),pawpal_private.evidence_access(uuid,text,uuid,uuid,boolean),pawpal_private.media_session_manage(uuid,uuid,boolean),pawpal_private.attach_private_evidence(text,uuid,jsonb) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.list_ticket_media(uuid),public.list_return_media(uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.list_ticket_media(uuid),public.list_return_media(uuid) TO authenticated;
CREATE FUNCTION pawpal_private.can_read_ticket_attachment(p_message uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT coalesce((SELECT pawpal_private.evidence_access(auth.uid(),'ticket_image',m.id,m.ticket_id,false) FROM public.support_ticket_message m WHERE m.id=p_message),false)
$$;
CREATE FUNCTION pawpal_private.can_read_return_evidence(p_return uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT coalesce((SELECT pawpal_private.evidence_access(auth.uid(),'return_image',r.id,r.sales_order_id,false) FROM public.return_request r WHERE r.id=p_return),false)
$$;
REVOKE ALL ON FUNCTION pawpal_private.can_read_ticket_attachment(uuid),pawpal_private.can_read_return_evidence(uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION pawpal_private.can_read_ticket_attachment(uuid),pawpal_private.can_read_return_evidence(uuid) TO authenticated;
CREATE POLICY evidence_ticket_boundary ON public.support_ticket_message_attachment AS RESTRICTIVE FOR SELECT TO authenticated USING(pawpal_private.can_read_ticket_attachment(message_id));
CREATE POLICY evidence_return_boundary ON public.return_request_evidence AS RESTRICTIVE FOR SELECT TO authenticated USING(pawpal_private.can_read_return_evidence(return_request_id));

ALTER TABLE public.media_upload_session DROP CONSTRAINT media_upload_session_check,DROP CONSTRAINT media_upload_session_purpose_check;
ALTER TABLE public.media_upload_session ADD CONSTRAINT media_upload_session_purpose_check CHECK(purpose IN ('product_image','care_log_image','product_variant_image','service_image','intake_image','handover_image','adjustment_image','pet_avatar','ticket_image','return_image'));
ALTER TABLE public.media_upload_session ADD CONSTRAINT media_upload_session_check CHECK((ticket_id IS NULL AND support_message_id IS NULL AND return_id IS NULL AND sales_order_id IS NULL AND ((((pet_id IS NULL) AND (((adjustment_id IS NULL) AND (((record_id IS NULL) AND (((service_id IS NULL) AND (((purpose = 'product_image'::text) AND (variant_id IS NULL) AND (appointment_id IS NULL) AND ((product_id IS NOT NULL) OR (draft_id IS NOT NULL))) OR ((purpose = 'care_log_image'::text) AND (variant_id IS NULL) AND (product_id IS NULL) AND (draft_id IS NULL) AND (appointment_id IS NOT NULL)) OR ((purpose = 'product_variant_image'::text) AND (variant_id IS NOT NULL) AND (appointment_id IS NULL) AND ((product_id IS NOT NULL) OR (draft_id IS NOT NULL))))) OR ((purpose = 'service_image'::text) AND (product_id IS NULL) AND (appointment_id IS NULL) AND (variant_id IS NULL) AND ((service_id IS NOT NULL) OR (draft_id IS NOT NULL))))) OR ((purpose = ANY (ARRAY['intake_image'::text, 'handover_image'::text])) AND (appointment_id IS NOT NULL) AND (record_id IS NOT NULL) AND (product_id IS NULL) AND (draft_id IS NULL) AND (variant_id IS NULL) AND (service_id IS NULL)))) OR ((purpose = 'adjustment_image'::text) AND (appointment_id IS NOT NULL) AND (adjustment_id IS NOT NULL) AND (record_id IS NULL) AND (product_id IS NULL) AND (draft_id IS NULL) AND (variant_id IS NULL) AND (service_id IS NULL)))) OR ((purpose = 'pet_avatar'::text) AND (pet_id IS NOT NULL) AND (appointment_id IS NULL) AND (adjustment_id IS NULL) AND (record_id IS NULL) AND (product_id IS NULL) AND (draft_id IS NULL) AND (variant_id IS NULL) AND (service_id IS NULL))))) OR (product_id IS NULL AND appointment_id IS NULL AND draft_id IS NULL AND variant_id IS NULL AND service_id IS NULL AND record_id IS NULL AND adjustment_id IS NULL AND pet_id IS NULL AND ((purpose='ticket_image' AND ticket_id IS NOT NULL AND support_message_id IS NOT NULL AND return_id IS NULL AND sales_order_id IS NULL) OR (purpose='return_image' AND return_id IS NOT NULL AND sales_order_id IS NOT NULL AND ticket_id IS NULL AND support_message_id IS NULL))));
CREATE OR REPLACE FUNCTION public.prepare_evidence_media_upload(p_request uuid, p_purpose text, p_target uuid, p_context uuid, p_size bigint, p_mime text, p_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE p_appointment uuid:=null; p_product uuid:=null; p_draft uuid:=null; s public.media_upload_session; budget bigint; used bigint;
BEGIN
 IF NOT coalesce(pawpal_private.evidence_access(auth.uid(),p_purpose,p_target,p_context,true),false) THEN RAISE EXCEPTION 'media_forbidden' USING ERRCODE='42501'; END IF;
 IF p_request IS NULL OR p_target IS NULL OR p_context IS NULL OR p_purpose IS NULL OR p_purpose NOT IN ('ticket_image','return_image') OR p_size IS NULL OR p_size NOT BETWEEN 1 AND 3145728
 OR p_mime IS NULL OR p_mime NOT IN ('image/jpeg','image/png','image/webp') OR coalesce(length(p_name),0) NOT BETWEEN 1 AND 200
  THEN RAISE EXCEPTION 'media_invalid' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('pawpal-media-quota',188));
 SELECT * INTO s FROM public.media_upload_session WHERE created_by=auth.uid() AND request_id=p_request FOR UPDATE;
 IF FOUND THEN
  IF coalesce(s.support_message_id,s.return_id) IS DISTINCT FROM p_target OR coalesce(s.ticket_id,s.sales_order_id) IS DISTINCT FROM p_context OR s.purpose IS DISTINCT FROM p_purpose OR s.product_id IS DISTINCT FROM p_product OR s.appointment_id IS DISTINCT FROM p_appointment OR s.draft_id IS DISTINCT FROM p_draft
  OR s.declared_size<>p_size OR s.mime_type<>p_mime OR s.original_name<>p_name THEN RAISE EXCEPTION 'media_request_conflict' USING ERRCODE='PT409'; END IF;
  IF s.state NOT IN ('pending','verified','attached') OR s.expires_at<=now() AND s.state='pending' THEN RAISE EXCEPTION 'media_session_closed' USING ERRCODE='PT409'; END IF;
  RETURN jsonb_build_object('session_id',s.id,'state',s.state,'asset_id',(SELECT id FROM public.media_asset WHERE session_id=s.id));
 END IF;
 SELECT max_storage_bytes INTO budget FROM pawpal_private.media_settings WHERE singleton AND enabled;
 IF budget IS NULL OR budget=0 THEN RAISE EXCEPTION 'media_disabled' USING ERRCODE='55000'; END IF;
 SELECT coalesce(sum(declared_size),0) INTO used FROM public.media_upload_session WHERE state<>'deleted';
 IF used+p_size>budget THEN RAISE EXCEPTION 'media_quota_exceeded' USING ERRCODE='54000'; END IF;
 IF (SELECT count(*) FROM public.media_upload_session WHERE created_by=auth.uid() AND state IN ('pending','uploading','verified'))>=10 THEN RAISE EXCEPTION 'media_too_many_pending' USING ERRCODE='54000'; END IF;
 INSERT INTO public.media_upload_session(created_by,request_id,purpose,product_id,appointment_id,draft_id,ticket_id,support_message_id,return_id,sales_order_id,declared_size,mime_type,original_name)
 VALUES(auth.uid(),p_request,p_purpose,p_product,p_appointment,p_draft,CASE WHEN p_purpose='ticket_image' THEN p_context END,CASE WHEN p_purpose='ticket_image' THEN p_target END,CASE WHEN p_purpose='return_image' THEN p_target END,CASE WHEN p_purpose='return_image' THEN p_context END,p_size,p_mime,p_name) RETURNING * INTO s;
 RETURN jsonb_build_object('session_id',s.id,'state',s.state);
END $function$;
CREATE OR REPLACE FUNCTION public.claim_media_upload(p_session uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE s public.media_upload_session; a public.media_asset;
BEGIN
 SELECT * INTO s FROM public.media_upload_session WHERE id=p_session AND created_by=auth.uid() FOR UPDATE;
 IF NOT FOUND OR NOT pawpal_private.media_session_manage(auth.uid(),s.id,true) THEN RAISE EXCEPTION 'media_forbidden' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pawpal_private.media_settings WHERE singleton AND enabled) THEN RAISE EXCEPTION 'media_disabled' USING ERRCODE='55000'; END IF;
 IF s.state IN ('verified','attached') THEN SELECT * INTO a FROM public.media_asset WHERE session_id=s.id;
  RETURN jsonb_build_object('state',s.state,'asset_id',a.id); END IF;
 IF s.state<>'pending' OR s.expires_at<=now() THEN RAISE EXCEPTION 'media_session_closed' USING ERRCODE='PT409'; END IF;
 UPDATE public.media_upload_session SET state='uploading',lease=gen_random_uuid(),lease_until=now()+interval '15 minutes' WHERE id=s.id RETURNING * INTO s;
 RETURN jsonb_build_object('state',s.state,'session_id',s.id,'lease',s.lease,'mongo_file_id',s.mongo_file_id,'size_bytes',s.declared_size,'mime_type',s.mime_type);
END $function$
;
CREATE OR REPLACE FUNCTION public.finish_media_upload(p_session uuid, p_lease uuid, p_actor uuid, p_sha256 text, p_width integer, p_height integer)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE s public.media_upload_session; result uuid;
BEGIN
 SELECT * INTO s FROM public.media_upload_session WHERE id=p_session FOR UPDATE;
 IF NOT EXISTS(SELECT 1 FROM pawpal_private.media_settings WHERE singleton AND enabled) THEN RAISE EXCEPTION 'media_disabled' USING ERRCODE='55000'; END IF;
 IF NOT FOUND OR s.created_by IS DISTINCT FROM p_actor OR s.lease IS DISTINCT FROM p_lease OR p_lease IS NULL
 OR s.state NOT IN ('uploading','verified') OR s.lease_until<=now() OR NOT pawpal_private.media_session_manage(p_actor,s.id,true)
 THEN RAISE EXCEPTION 'media_forbidden' USING ERRCODE='42501'; END IF;
 SELECT id INTO result FROM public.media_asset WHERE session_id=s.id;
 IF FOUND THEN
  IF NOT EXISTS(SELECT 1 FROM public.media_asset WHERE id=result AND sha256=p_sha256 AND width=p_width AND height=p_height) THEN RAISE EXCEPTION 'media_request_conflict' USING ERRCODE='PT409'; END IF;
  RETURN result;
 END IF;
 INSERT INTO public.media_asset(session_id,mongo_file_id,mime_type,size_bytes,sha256,width,height)
 VALUES(s.id,s.mongo_file_id,s.mime_type,s.declared_size,p_sha256,p_width,p_height) RETURNING id INTO result;
 UPDATE public.media_upload_session SET state='verified',expires_at=now()+interval '7 days' WHERE id=s.id;
 RETURN result;
END $function$
;
CREATE OR REPLACE FUNCTION public.cancel_media_upload(p_session uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE s public.media_upload_session;
BEGIN
 SELECT * INTO s FROM public.media_upload_session WHERE id=p_session AND created_by=auth.uid() FOR UPDATE;
 IF NOT FOUND OR NOT pawpal_private.media_session_manage(auth.uid(),s.id,false) THEN RAISE EXCEPTION 'media_forbidden' USING ERRCODE='42501'; END IF;
 IF s.state='pending_delete' OR s.state='deleted' THEN RETURN; END IF;
 IF s.state NOT IN ('pending','verified') THEN RAISE EXCEPTION 'media_session_closed' USING ERRCODE='PT409'; END IF;
 UPDATE public.media_upload_session SET state='pending_delete',expires_at=greatest(expires_at,now()+interval '1 hour') WHERE id=s.id;
 UPDATE public.media_asset SET status='pending_delete' WHERE session_id=s.id;
END $function$
;
CREATE OR REPLACE FUNCTION public.resolve_media_asset(p_asset uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE a public.media_asset; s public.media_upload_session; public_read boolean; allowed boolean; staff_actor uuid;
BEGIN
 SELECT * INTO a FROM public.media_asset WHERE id=p_asset AND status IN ('verified','attached');
 IF NOT FOUND THEN RETURN NULL; END IF;
 SELECT * INTO s FROM public.media_upload_session WHERE id=a.session_id;
 public_read:=a.status='attached' AND s.purpose='product_image' AND EXISTS(SELECT 1 FROM public.product_media m JOIN public.product p ON p.id=m.product_id WHERE m.media_asset_id=a.id AND p.status='active');
 public_read:=public_read OR (a.status='attached' AND s.purpose='product_variant_image' AND EXISTS(
 SELECT 1 FROM public.product_variant_media m JOIN public.product_variant v ON v.id=m.product_variant_id JOIN public.product p ON p.id=v.product_id
 WHERE m.media_asset_id=a.id AND v.id=s.variant_id AND p.status='active' AND v.status='active' AND NOT v.catalog_retired));
 public_read:=public_read OR (a.status='attached' AND s.purpose='service_image' AND EXISTS(SELECT 1 FROM public.service_image m JOIN public.service v ON v.id=m.service_id WHERE m.media_asset_id=a.id AND v.id=s.service_id AND v.status='active'));
 allowed:=public_read;
 IF NOT allowed AND auth.uid() IS NOT NULL THEN
  allowed:=pawpal_private.media_session_manage(auth.uid(),s.id,false) AND (a.status='attached' OR s.created_by=auth.uid());
  IF NOT allowed AND a.status='attached' AND s.purpose IN ('intake_image','handover_image') AND NOT EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid()) THEN
   allowed:=EXISTS(SELECT 1 FROM public.appointment_record_media m JOIN public.appointment_record r ON r.id=m.record_id JOIN public.appointment ap ON ap.id=r.appointment_id WHERE m.media_asset_id=a.id AND pawpal_private.owns_customer(ap.customer_id));
  END IF;
  IF NOT allowed AND a.status='attached' AND s.purpose='adjustment_image' AND NOT EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid()) THEN
   allowed:=EXISTS(SELECT 1 FROM public.appointment_adjustment_media m JOIN public.appointment_adjustment r ON r.id=m.adjustment_id JOIN public.appointment ap ON ap.id=r.appointment_id WHERE m.media_asset_id=a.id AND pawpal_private.owns_customer(ap.customer_id));
  END IF;
  IF NOT allowed AND a.status='attached' AND s.purpose='pet_avatar' THEN
   allowed:=EXISTS(SELECT 1 FROM public.pet_profile p WHERE p.avatar_media_asset_id=a.id AND p.id=s.pet_id AND (
    (NOT EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid()) AND pawpal_private.owns_customer(p.customer_id))
    OR EXISTS(SELECT 1 FROM public.appointment ap WHERE ap.pet_id=p.id AND pawpal_private.media_manage(auth.uid(),'care_log_image',null,ap.id))));
  END IF;
  IF NOT allowed AND a.status='attached' AND s.purpose='care_log_image'
  AND NOT EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid()) THEN
   allowed:=EXISTS(SELECT 1 FROM public.care_log_media m JOIN public.care_log l ON l.id=m.care_log_id JOIN public.appointment ap ON ap.id=l.appointment_id
    WHERE m.media_asset_id=a.id AND pawpal_private.owns_customer(ap.customer_id));
  END IF;
 END IF;
 IF NOT coalesce(allowed,false) THEN RETURN NULL; END IF;
 RETURN jsonb_build_object('id',a.id,'mongo_file_id',a.mongo_file_id,'mime_type',a.mime_type,'size_bytes',a.size_bytes,'sha256',a.sha256,'public',public_read);
END $function$
;
CREATE OR REPLACE FUNCTION public.claim_media_cleanup(p_limit integer DEFAULT 10)
 RETURNS SETOF jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE s public.media_upload_session; a public.media_asset; token uuid;
BEGIN
 IF p_limit NOT BETWEEN 1 AND 20 THEN RAISE EXCEPTION 'media_invalid' USING ERRCODE='22023'; END IF;
 FOR s IN SELECT * FROM public.media_upload_session WHERE
 (state IN ('pending','uploading','verified','pending_delete') AND expires_at<now() AND coalesce(lease_until,now()-interval '1 second')<now())
 OR (state='cleaning' AND lease_until<now()) ORDER BY created_at LIMIT p_limit FOR UPDATE SKIP LOCKED LOOP
  SELECT * INTO a FROM public.media_asset WHERE session_id=s.id FOR UPDATE;
  IF a.id IS NOT NULL AND (a.legal_hold OR a.retention_until>now() OR EXISTS(SELECT 1 FROM public.product_media WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.care_log_media WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.product_variant_media WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.service_image WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.appointment_record_media WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.appointment_adjustment_media WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.pet_profile WHERE avatar_media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.support_ticket_message_attachment WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.return_request_evidence WHERE media_asset_id=a.id)) THEN CONTINUE; END IF;
  token:=gen_random_uuid();
  UPDATE public.media_upload_session SET state='cleaning',lease=token,lease_until=now()+interval '15 minutes' WHERE id=s.id;
  UPDATE public.media_asset SET status='cleaning' WHERE session_id=s.id;
  RETURN NEXT jsonb_build_object('session_id',s.id,'mongo_file_id',s.mongo_file_id,'lease',token);
 END LOOP;
END $function$
;
CREATE OR REPLACE FUNCTION pawpal_private.release_media_reference()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
 IF OLD.media_asset_id IS NULL OR (TG_OP='UPDATE' AND NEW.media_asset_id IS NOT DISTINCT FROM OLD.media_asset_id) THEN RETURN NULL; END IF;
 PERFORM 1 FROM public.media_upload_session WHERE id=(SELECT session_id FROM public.media_asset WHERE id=OLD.media_asset_id) FOR UPDATE;
 PERFORM 1 FROM public.media_asset WHERE id=OLD.media_asset_id FOR UPDATE;
 IF NOT EXISTS(SELECT 1 FROM public.product_media WHERE media_asset_id=OLD.media_asset_id)
 AND NOT EXISTS(SELECT 1 FROM public.care_log_media WHERE media_asset_id=OLD.media_asset_id) AND NOT EXISTS(SELECT 1 FROM public.product_variant_media WHERE media_asset_id=OLD.media_asset_id) AND NOT EXISTS(SELECT 1 FROM public.service_image WHERE media_asset_id=OLD.media_asset_id) AND NOT EXISTS(SELECT 1 FROM public.appointment_record_media WHERE media_asset_id=OLD.media_asset_id) AND NOT EXISTS(SELECT 1 FROM public.appointment_adjustment_media WHERE media_asset_id=OLD.media_asset_id) AND NOT EXISTS(SELECT 1 FROM public.support_ticket_message_attachment WHERE media_asset_id=OLD.media_asset_id) AND NOT EXISTS(SELECT 1 FROM public.return_request_evidence WHERE media_asset_id=OLD.media_asset_id) THEN
  UPDATE public.media_asset SET status='pending_delete',retention_until=now()+interval '7 days' WHERE id=OLD.media_asset_id;
  UPDATE public.media_upload_session SET state='pending_delete',expires_at=now()+interval '7 days' WHERE id=(SELECT session_id FROM public.media_asset WHERE id=OLD.media_asset_id);
 END IF;
 RETURN NULL;
END $function$
;
CREATE OR REPLACE FUNCTION public.create_own_support_ticket(p_id uuid, p_category text, p_subject text, p_content text, p_appointment uuid DEFAULT NULL::uuid, p_order uuid DEFAULT NULL::uuid, p_resolution text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE owner_id uuid:=pawpal_private.customer_support_owner(); prior public.support_ticket;
BEGIN
 IF p_id IS NULL OR p_category IS NULL OR p_category NOT IN ('service','order','payment','other') OR coalesce(length(btrim(p_subject)),0) NOT BETWEEN 2 AND 200
 OR coalesce(length(btrim(p_content)),0) NOT BETWEEN 2 AND 4000 OR coalesce(length(p_resolution),0)>1000
 OR (p_category='service' AND p_appointment IS NULL) OR (p_category='order' AND p_order IS NULL)
 OR (p_category<>'service' AND p_appointment IS NOT NULL) OR (p_category<>'order' AND p_order IS NOT NULL) THEN RAISE EXCEPTION 'invalid_support_request' USING ERRCODE='22023'; END IF;
 IF p_appointment IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.appointment WHERE id=p_appointment AND customer_id=owner_id) THEN RAISE EXCEPTION 'support_booking_owner_required' USING ERRCODE='42501'; END IF;
 IF p_order IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.sales_order WHERE id=p_order AND customer_id=owner_id) THEN RAISE EXCEPTION 'support_order_owner_required' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_id::text,73));
 SELECT * INTO prior FROM public.support_ticket WHERE id=p_id;
 IF FOUND THEN
  IF prior.customer_id IS DISTINCT FROM owner_id OR prior.created_by_account_id IS DISTINCT FROM auth.uid() OR prior.category IS DISTINCT FROM p_category
   OR prior.subject IS DISTINCT FROM btrim(p_subject) OR prior.description IS DISTINCT FROM btrim(p_content)
   OR prior.appointment_id IS DISTINCT FROM p_appointment OR prior.order_id IS DISTINCT FROM p_order OR prior.requested_resolution IS DISTINCT FROM p_resolution THEN RAISE EXCEPTION 'support_request_conflict' USING ERRCODE='PT409'; END IF;
  RETURN prior.id;
 END IF;
 INSERT INTO public.support_ticket(id,ticket_code,customer_id,appointment_id,order_id,channel,category,type,subject,description,priority,status,requested_resolution,created_by_account_id)
 VALUES(p_id,'KH-'||upper(replace(p_id::text,'-','')),owner_id,p_appointment,p_order,'web',p_category,'complaint',btrim(p_subject),btrim(p_content),'normal','pending',p_resolution,auth.uid());
 INSERT INTO public.support_ticket_message(id,ticket_id,sender_type,content,is_internal,sender_account_id) VALUES(p_id,p_id,'customer',btrim(p_content),false,auth.uid());
 RETURN p_id;
END $function$
;
CREATE OR REPLACE FUNCTION public.act_admin_complaint(p_request_id uuid, p_ticket_id uuid, p_expected_updated_at timestamp with time zone, p_action text, p_details jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE actor uuid; prior public.audit_log; ticket public.support_ticket; payload text; note_value text; option_value text; amount_value numeric; evidence uuid; next_status text; internal_value boolean:=true; original_staff uuid; proposal jsonb;
BEGIN
 PERFORM pawpal_private.work_guard_rpc('act_admin_complaint',jsonb_build_object('p_request_id',to_jsonb(p_request_id),'p_ticket_id',to_jsonb(p_ticket_id),'p_expected_updated_at',to_jsonb(p_expected_updated_at),'p_action',to_jsonb(p_action),'p_details',to_jsonb(p_details)));
 IF auth.uid() IS NULL OR NOT pawpal_private.work_rpc_permission('act_admin_complaint','support_ticket.read') OR NOT pawpal_private.work_rpc_permission('act_admin_complaint','support_ticket.write')
 OR NOT pawpal_private.work_rpc_permission('act_admin_complaint','support_ticket_message.write') OR NOT pawpal_private.work_rpc_permission('act_admin_complaint','audit_log.write') THEN RAISE EXCEPTION 'complaint_forbidden' USING ERRCODE='42501'; END IF;
 IF p_request_id IS NULL OR p_ticket_id IS NULL OR jsonb_typeof(p_details) IS DISTINCT FROM 'object' OR length(p_details::text)>12000
 OR p_action IS NULL OR p_action NOT IN ('message','request_info','resolve','propose','approve','reject_proposal','complete','close','reopen','link_source')
 OR EXISTS(SELECT 1 FROM jsonb_object_keys(p_details) k WHERE k NOT IN ('note','internal','channel','option','amount','evidence_id','replacement_order_id','return_request_id','source_kind','media_asset_ids')) THEN RAISE EXCEPTION 'invalid_complaint_action' USING ERRCODE='22023'; END IF;
 IF p_details ? 'media_asset_ids' AND p_action<>'message' THEN RAISE EXCEPTION 'invalid_evidence_action' USING ERRCODE='22023'; END IF;
 note_value:=btrim(p_details->>'note');
 IF coalesce(length(note_value),0) NOT BETWEEN 2 AND 8000 THEN RAISE EXCEPTION 'complaint_note_required' USING ERRCODE='22023'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 payload:=jsonb_build_object('ticket_id',p_ticket_id,'action',p_action,'details',p_details)::text;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text,41));
 SELECT * INTO prior FROM public.audit_log WHERE id=p_request_id;
 IF FOUND THEN
  IF prior.action<>'COMPLAINT_ACTION' OR prior.staff_id IS DISTINCT FROM actor OR (prior.description::jsonb-'source_staff_id')::text<>payload THEN RAISE EXCEPTION 'complaint_request_conflict' USING ERRCODE='PT409'; END IF;RETURN p_ticket_id;
 END IF;
 SELECT * INTO ticket FROM public.support_ticket WHERE id=p_ticket_id FOR UPDATE;
 IF NOT FOUND OR ticket.updated_at IS DISTINCT FROM p_expected_updated_at THEN RAISE EXCEPTION 'complaint_changed' USING ERRCODE='PT409'; END IF;
 next_status:=ticket.status;
 IF ticket.status='waiting_manager_approval' AND p_action NOT IN ('message','approve','reject_proposal') THEN RAISE EXCEPTION 'complaint_approval_pending' USING ERRCODE='PT409'; END IF;
 IF p_action NOT IN ('reopen','close') AND ticket.status IN ('closed','resolved','completed','rejected') THEN RAISE EXCEPTION 'complaint_not_open' USING ERRCODE='PT409'; END IF;
 IF p_action IN ('approve','reject_proposal') AND NOT EXISTS(SELECT 1 FROM public.staff_role WHERE staff_id=actor AND role_code='ADMIN') THEN RAISE EXCEPTION 'complaint_approval_forbidden' USING ERRCODE='42501'; END IF;
 IF p_action='link_source' THEN
  evidence:=(p_details->>'evidence_id')::uuid;
  IF ticket.order_id IS NOT NULL OR ticket.appointment_id IS NOT NULL OR ticket.resolution_type IS NOT NULL OR evidence IS NULL THEN RAISE EXCEPTION 'complaint_source_already_set' USING ERRCODE='22023'; END IF;
  IF p_details->>'source_kind'='order' THEN
   IF NOT pawpal_private.work_rpc_permission('act_admin_complaint','sales_order.read') THEN RAISE EXCEPTION 'complaint_forbidden' USING ERRCODE='42501'; END IF;
   PERFORM 1 FROM public.sales_order WHERE id=evidence AND customer_id=ticket.customer_id FOR SHARE;
   IF NOT FOUND THEN RAISE EXCEPTION 'complaint_owner_mismatch' USING ERRCODE='22023'; END IF;
   UPDATE public.support_ticket SET order_id=evidence,category='order' WHERE id=ticket.id;
  ELSIF p_details->>'source_kind'='service' THEN
   IF NOT pawpal_private.work_rpc_permission('act_admin_complaint','appointment.read') THEN RAISE EXCEPTION 'complaint_forbidden' USING ERRCODE='42501'; END IF;
   PERFORM 1 FROM public.appointment WHERE id=evidence AND customer_id=ticket.customer_id FOR SHARE;
   IF NOT FOUND THEN RAISE EXCEPTION 'complaint_owner_mismatch' USING ERRCODE='22023'; END IF;
   UPDATE public.support_ticket SET appointment_id=evidence,category='service' WHERE id=ticket.id;
  ELSE RAISE EXCEPTION 'invalid_complaint_source' USING ERRCODE='22023'; END IF;
 ELSIF p_action='message' THEN
  internal_value:=coalesce((p_details->>'internal')::boolean,false);
 ELSIF p_action='request_info' THEN
  IF p_details->>'channel' IS NULL OR p_details->>'channel' NOT IN ('record','call','zalo','email','sms') THEN RAISE EXCEPTION 'invalid_complaint_channel' USING ERRCODE='22023'; END IF;
  note_value:='[Ghi nhận yêu cầu bổ sung qua '||(p_details->>'channel')||'] '||note_value; next_status:='waiting_customer';
 ELSIF p_action IN ('resolve','propose') THEN
  option_value:=p_details->>'option'; amount_value:=coalesce((p_details->>'amount')::numeric,0);
  IF option_value IS NULL OR option_value NOT IN ('explain','reject','refund','rma_refund','rma_exchange','redo_service','change_staff')
  OR amount_value<0 OR amount_value>999999999999 OR amount_value<>round(amount_value,4)
  OR (p_action='resolve' AND option_value NOT IN ('explain','reject'))
  OR (p_action='propose' AND option_value IN ('explain','reject'))
  OR (option_value IN ('refund','rma_refund') AND amount_value<=0)
  OR (option_value NOT IN ('refund','rma_refund') AND amount_value<>0)
  OR (option_value LIKE 'rma_%' AND ticket.order_id IS NULL)
  OR (option_value IN ('redo_service','change_staff') AND ticket.appointment_id IS NULL)
  OR (option_value='refund' AND ticket.appointment_id IS NULL AND ticket.order_id IS NULL) THEN RAISE EXCEPTION 'invalid_complaint_resolution' USING ERRCODE='22023'; END IF;
  next_status:=CASE WHEN p_action='propose' THEN 'waiting_manager_approval' ELSE 'resolved' END;
  UPDATE public.support_ticket SET resolution_type=option_value,resolution_note=note_value,approved_amount=CASE WHEN p_action='resolve' THEN 0 ELSE NULL END,
   resolved_by=CASE WHEN p_action='resolve' THEN actor ELSE NULL END,resolved_at=CASE WHEN p_action='resolve' THEN clock_timestamp() ELSE NULL END WHERE id=ticket.id;
 ELSIF p_action IN ('approve','reject_proposal') THEN
  IF ticket.status<>'waiting_manager_approval' THEN RAISE EXCEPTION 'complaint_not_awaiting_approval' USING ERRCODE='PT409'; END IF;
  IF p_action='approve' THEN
   SELECT description::jsonb INTO proposal FROM public.audit_log WHERE action='COMPLAINT_ACTION' AND entity_id=ticket.id AND description::jsonb->>'action'='propose' ORDER BY created_at DESC,id DESC LIMIT 1;
   IF proposal IS NULL OR proposal->'details'->>'option' IS DISTINCT FROM ticket.resolution_type THEN RAISE EXCEPTION 'complaint_proposal_required' USING ERRCODE='22023'; END IF;
   amount_value:=(proposal->'details'->>'amount')::numeric;
  END IF;
  next_status:='processing';
  UPDATE public.support_ticket SET approved_amount=CASE WHEN p_action='approve' THEN amount_value ELSE NULL END,
   resolved_by=CASE WHEN p_action='approve' THEN actor ELSE NULL END,
   resolution_type=CASE WHEN p_action='approve' THEN resolution_type ELSE NULL END,
   resolution_note=CASE WHEN p_action='approve' THEN resolution_note ELSE NULL END WHERE id=ticket.id;
 ELSIF p_action='complete' THEN
  evidence:=(p_details->>'evidence_id')::uuid;
  IF ticket.status<>'processing' OR ticket.resolved_by IS NULL OR evidence IS NULL THEN RAISE EXCEPTION 'complaint_approved_result_required' USING ERRCODE='22023'; END IF;
  IF ticket.resolution_type IN ('refund','rma_refund') THEN
   IF NOT pawpal_private.work_rpc_permission('act_admin_complaint','refund_transaction.read') OR NOT pawpal_private.work_rpc_permission('act_admin_complaint','payment.read') THEN RAISE EXCEPTION 'complaint_forbidden' USING ERRCODE='42501'; END IF;
   PERFORM 1 FROM public.refund_transaction r JOIN public.payment p ON p.id=r.payment_id WHERE r.id=evidence AND r.refund_status='succeeded'
    AND r.refunded_amount>=ticket.approved_amount AND p.customer_id=ticket.customer_id
    AND (r.ticket_id IS NULL OR r.ticket_id=ticket.id)
    AND ((ticket.order_id IS NOT NULL AND p.order_id=ticket.order_id) OR (ticket.appointment_id IS NOT NULL AND p.appointment_id=ticket.appointment_id)) FOR SHARE OF r;
   IF NOT FOUND THEN RAISE EXCEPTION 'complaint_refund_mismatch' USING ERRCODE='22023'; END IF;
   IF EXISTS(SELECT 1 FROM public.audit_log WHERE action='COMPLAINT_ACTION' AND entity_id<>ticket.id AND description::jsonb->>'action'='complete' AND description::jsonb->'details'->>'evidence_id'=evidence::text) THEN RAISE EXCEPTION 'complaint_result_already_linked' USING ERRCODE='PT409'; END IF;
   -- Successful refunds are immutable. The validated association is kept in the audit event.
   IF ticket.resolution_type='rma_refund' THEN
    IF NOT pawpal_private.work_rpc_permission('act_admin_complaint','return_request.read') THEN RAISE EXCEPTION 'complaint_forbidden' USING ERRCODE='42501'; END IF;
    PERFORM 1 FROM public.return_request rr WHERE rr.id=(p_details->>'return_request_id')::uuid AND rr.sales_order_id=ticket.order_id AND rr.request_status='received' FOR SHARE;
    IF NOT FOUND OR EXISTS(SELECT 1 FROM public.refund_transaction r WHERE r.id=evidence AND r.return_request_id IS NOT NULL AND r.return_request_id IS DISTINCT FROM (p_details->>'return_request_id')::uuid) THEN RAISE EXCEPTION 'complaint_return_mismatch' USING ERRCODE='22023'; END IF;
   END IF;
  ELSIF ticket.resolution_type='rma_exchange' THEN
   IF NOT pawpal_private.work_rpc_permission('act_admin_complaint','return_request.read') THEN RAISE EXCEPTION 'complaint_forbidden' USING ERRCODE='42501'; END IF;
   PERFORM 1 FROM public.return_request WHERE id=evidence AND sales_order_id=ticket.order_id AND request_status='received' FOR SHARE;
   IF NOT FOUND THEN RAISE EXCEPTION 'complaint_return_mismatch' USING ERRCODE='22023'; END IF;
   IF NOT pawpal_private.work_rpc_permission('act_admin_complaint','sales_order.read') THEN RAISE EXCEPTION 'complaint_forbidden' USING ERRCODE='42501'; END IF;
   PERFORM 1 FROM public.sales_order WHERE id=(p_details->>'replacement_order_id')::uuid AND id<>ticket.order_id AND customer_id=ticket.customer_id AND order_status IN ('delivered','completed') FOR SHARE;
   IF NOT FOUND THEN RAISE EXCEPTION 'complaint_replacement_order_required' USING ERRCODE='22023'; END IF;
  ELSIF ticket.resolution_type IN ('redo_service','change_staff') THEN
   IF NOT pawpal_private.work_rpc_permission('act_admin_complaint','appointment.read') THEN RAISE EXCEPTION 'complaint_forbidden' USING ERRCODE='42501'; END IF;
   IF ticket.resolution_type='change_staff' THEN
    SELECT description::jsonb INTO proposal FROM public.audit_log WHERE action='COMPLAINT_ACTION' AND entity_id=ticket.id AND description::jsonb->>'action'='propose' ORDER BY created_at DESC,id DESC LIMIT 1;
    IF NOT coalesce(proposal?'source_staff_id',false) THEN RAISE EXCEPTION 'complaint_booking_mismatch' USING ERRCODE='22023'; END IF;
    original_staff:=(proposal->>'source_staff_id')::uuid;
   END IF;
   PERFORM 1 FROM public.appointment a JOIN public.appointment old ON old.id=ticket.appointment_id
    WHERE a.id=evidence AND a.customer_id=ticket.customer_id AND a.pet_id=old.pet_id AND a.appointment_status='completed'
    AND ((ticket.resolution_type='redo_service' AND a.id<>old.id AND a.created_at>=ticket.created_at)
      OR (ticket.resolution_type='change_staff' AND a.staff_id IS NOT NULL AND a.staff_id IS DISTINCT FROM original_staff))
    AND EXISTS(SELECT 1 FROM public.appointment_item oi JOIN public.appointment_item ni ON ni.service_id=oi.service_id WHERE oi.appointment_id=old.id AND ni.appointment_id=a.id AND oi.service_id IS NOT NULL)
    FOR SHARE OF a;
   IF NOT FOUND THEN RAISE EXCEPTION 'complaint_booking_mismatch' USING ERRCODE='22023'; END IF;
  ELSE RAISE EXCEPTION 'invalid_complaint_resolution' USING ERRCODE='22023'; END IF;
  next_status:='resolved';UPDATE public.support_ticket SET resolved_at=clock_timestamp() WHERE id=ticket.id;
 ELSIF p_action='close' THEN
  IF ticket.status NOT IN ('resolved','completed') THEN RAISE EXCEPTION 'complaint_resolve_before_close' USING ERRCODE='22023'; END IF;
  next_status:='closed'; UPDATE public.support_ticket SET closed_at=clock_timestamp() WHERE id=ticket.id;
 ELSIF p_action='reopen' THEN
  IF ticket.status NOT IN ('resolved','closed','completed','rejected') THEN RAISE EXCEPTION 'complaint_not_finished' USING ERRCODE='PT409'; END IF;
  next_status:='reprocessing';UPDATE public.support_ticket SET resolved_at=NULL,closed_at=NULL,resolved_by=NULL,approved_amount=NULL,resolution_type=NULL,resolution_note=NULL WHERE id=ticket.id;
 END IF;
 UPDATE public.support_ticket SET status=next_status,updated_at=clock_timestamp(),first_response_at=CASE WHEN p_action='message' AND NOT internal_value THEN coalesce(first_response_at,clock_timestamp()) ELSE first_response_at END WHERE id=ticket.id;
 INSERT INTO public.support_ticket_message(id,ticket_id,sender_type,sender_account_id,content,is_internal) VALUES(CASE WHEN p_action='message' THEN p_request_id ELSE gen_random_uuid() END,ticket.id,'staff',auth.uid(),CASE WHEN p_action='message' THEN note_value ELSE '['||CASE p_action WHEN 'link_source' THEN 'Liên kết giao dịch' WHEN 'request_info' THEN 'Yêu cầu bổ sung' WHEN 'resolve' THEN 'Giải quyết' WHEN 'propose' THEN 'Đề xuất' WHEN 'approve' THEN 'Phê duyệt' WHEN 'reject_proposal' THEN 'Từ chối đề xuất' WHEN 'complete' THEN 'Liên kết kết quả' WHEN 'close' THEN 'Đóng phiếu' WHEN 'reopen' THEN 'Mở lại' END||'] '||note_value END,internal_value);
 IF p_action='message' AND p_details ? 'media_asset_ids' THEN PERFORM pawpal_private.attach_private_evidence('ticket_image',p_request_id,p_details->'media_asset_ids'); END IF;
 INSERT INTO public.audit_log(id,staff_id,action,entity_name,entity_id,description) VALUES(p_request_id,actor,'COMPLAINT_ACTION','support_ticket',ticket.id,
 CASE WHEN p_action='propose' THEN (payload::jsonb||jsonb_build_object('source_staff_id',(SELECT staff_id FROM public.appointment WHERE id=ticket.appointment_id)))::text ELSE payload END);
 RETURN ticket.id;
END $function$
;
CREATE FUNCTION public.create_own_support_ticket_media(p_id uuid,p_category text,p_subject text,p_content text,p_appointment uuid,p_order uuid,p_resolution text,p_assets jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN PERFORM public.create_own_support_ticket(p_id,p_category,p_subject,p_content,p_appointment,p_order,p_resolution);PERFORM pawpal_private.attach_private_evidence('ticket_image',p_id,p_assets);RETURN p_id;END $$;
CREATE FUNCTION public.reply_own_support_ticket_media(p_id uuid,p_ticket uuid,p_content text,p_assets jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN PERFORM public.reply_own_support_ticket(p_id,p_ticket,p_content);PERFORM pawpal_private.attach_private_evidence('ticket_image',p_id,p_assets);RETURN p_id;END $$;
CREATE FUNCTION public.request_own_sales_return_media(p_request uuid,p_order uuid,p_expected timestamptz,p_details jsonb,p_assets jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN PERFORM public.request_own_sales_return(p_request,p_order,p_expected,p_details);PERFORM pawpal_private.attach_private_evidence('return_image',p_request,p_assets);RETURN p_request;END $$;
REVOKE ALL ON FUNCTION public.prepare_evidence_media_upload(uuid,text,uuid,uuid,bigint,text,text),public.create_own_support_ticket_media(uuid,text,text,text,uuid,uuid,text,jsonb),public.reply_own_support_ticket_media(uuid,uuid,text,jsonb),public.request_own_sales_return_media(uuid,uuid,timestamptz,jsonb,jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.prepare_evidence_media_upload(uuid,text,uuid,uuid,bigint,text,text),public.create_own_support_ticket_media(uuid,text,text,text,uuid,uuid,text,jsonb),public.reply_own_support_ticket_media(uuid,uuid,text,jsonb),public.request_own_sales_return_media(uuid,uuid,timestamptz,jsonb,jsonb) TO authenticated;

COMMIT;
