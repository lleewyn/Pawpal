BEGIN;
SET LOCAL lock_timeout='3s';
ALTER TABLE public.media_upload_session ADD COLUMN adjustment_id uuid;
ALTER TABLE public.media_upload_session DROP CONSTRAINT media_upload_session_check,DROP CONSTRAINT media_upload_session_purpose_check;
ALTER TABLE public.media_upload_session ADD CONSTRAINT media_upload_session_purpose_check CHECK(purpose IN ('product_image','care_log_image','product_variant_image','service_image','intake_image','handover_image','adjustment_image'));
ALTER TABLE public.media_upload_session ADD CONSTRAINT media_upload_session_check CHECK((adjustment_id IS NULL AND ((((record_id IS NULL) AND (((service_id IS NULL) AND (((purpose = 'product_image'::text) AND (variant_id IS NULL) AND (appointment_id IS NULL) AND ((product_id IS NOT NULL) OR (draft_id IS NOT NULL))) OR ((purpose = 'care_log_image'::text) AND (variant_id IS NULL) AND (product_id IS NULL) AND (draft_id IS NULL) AND (appointment_id IS NOT NULL)) OR ((purpose = 'product_variant_image'::text) AND (variant_id IS NOT NULL) AND (appointment_id IS NULL) AND ((product_id IS NOT NULL) OR (draft_id IS NOT NULL))))) OR ((purpose = 'service_image'::text) AND (product_id IS NULL) AND (appointment_id IS NULL) AND (variant_id IS NULL) AND ((service_id IS NOT NULL) OR (draft_id IS NOT NULL))))) OR ((purpose = ANY (ARRAY['intake_image'::text, 'handover_image'::text])) AND (appointment_id IS NOT NULL) AND (record_id IS NOT NULL) AND (product_id IS NULL) AND (draft_id IS NULL) AND (variant_id IS NULL) AND (service_id IS NULL))))) OR (purpose='adjustment_image' AND appointment_id IS NOT NULL AND adjustment_id IS NOT NULL AND record_id IS NULL AND product_id IS NULL AND draft_id IS NULL AND variant_id IS NULL AND service_id IS NULL));
CREATE TABLE public.appointment_adjustment_media(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),adjustment_id uuid NOT NULL REFERENCES public.appointment_adjustment(id),media_asset_id uuid NOT NULL UNIQUE REFERENCES public.media_asset(id),created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX appointment_adjustment_media_parent ON public.appointment_adjustment_media(adjustment_id);
ALTER TABLE public.appointment_adjustment_media ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.appointment_adjustment_media FROM PUBLIC,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.prepare_adjustment_media_upload(p_request uuid, p_appointment uuid, p_adjustment uuid, p_size bigint, p_mime text, p_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE p_purpose constant text:='adjustment_image'; p_product uuid:=null; p_draft uuid:=null; s public.media_upload_session; budget bigint; used bigint;
BEGIN
 IF NOT pawpal_private.media_manage(auth.uid(),p_purpose,p_product,p_appointment) THEN RAISE EXCEPTION 'media_forbidden' USING ERRCODE='42501'; END IF;
 IF p_request IS NULL OR p_appointment IS NULL OR p_adjustment IS NULL OR p_size IS NULL OR p_size NOT BETWEEN 1 AND 3145728
 OR p_mime IS NULL OR p_mime NOT IN ('image/jpeg','image/png','image/webp') OR coalesce(length(p_name),0) NOT BETWEEN 1 AND 200
 OR NOT EXISTS(SELECT 1 FROM public.appointment WHERE id=p_appointment AND appointment_status IN ('pending','confirmed','checked_in','in_progress'))
 OR EXISTS(SELECT 1 FROM public.appointment_adjustment WHERE id=p_adjustment AND (appointment_id<>p_appointment OR adjustment_type<>'surcharge'))
 THEN RAISE EXCEPTION 'media_invalid' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('pawpal-media-quota',188));
 SELECT * INTO s FROM public.media_upload_session WHERE created_by=auth.uid() AND request_id=p_request FOR UPDATE;
 IF FOUND THEN
  IF s.adjustment_id IS DISTINCT FROM p_adjustment OR s.purpose IS DISTINCT FROM p_purpose OR s.product_id IS DISTINCT FROM p_product OR s.appointment_id IS DISTINCT FROM p_appointment OR s.draft_id IS DISTINCT FROM p_draft
  OR s.declared_size<>p_size OR s.mime_type<>p_mime OR s.original_name<>p_name THEN RAISE EXCEPTION 'media_request_conflict' USING ERRCODE='PT409'; END IF;
  IF s.state NOT IN ('pending','verified','attached') OR s.expires_at<=now() AND s.state='pending' THEN RAISE EXCEPTION 'media_session_closed' USING ERRCODE='PT409'; END IF;
  RETURN jsonb_build_object('session_id',s.id,'state',s.state,'asset_id',(SELECT id FROM public.media_asset WHERE session_id=s.id));
 END IF;
 SELECT max_storage_bytes INTO budget FROM pawpal_private.media_settings WHERE singleton AND enabled;
 IF budget IS NULL OR budget=0 THEN RAISE EXCEPTION 'media_disabled' USING ERRCODE='55000'; END IF;
 SELECT coalesce(sum(declared_size),0) INTO used FROM public.media_upload_session WHERE state<>'deleted';
 IF used+p_size>budget THEN RAISE EXCEPTION 'media_quota_exceeded' USING ERRCODE='54000'; END IF;
 IF (SELECT count(*) FROM public.media_upload_session WHERE created_by=auth.uid() AND state IN ('pending','uploading','verified'))>=10 THEN RAISE EXCEPTION 'media_too_many_pending' USING ERRCODE='54000'; END IF;
 INSERT INTO public.media_upload_session(created_by,request_id,purpose,product_id,appointment_id,draft_id,adjustment_id,declared_size,mime_type,original_name)
 VALUES(auth.uid(),p_request,p_purpose,p_product,p_appointment,p_draft,p_adjustment,p_size,p_mime,p_name) RETURNING * INTO s;
 RETURN jsonb_build_object('session_id',s.id,'state',s.state);
END $function$
;
CREATE OR REPLACE FUNCTION pawpal_private.attach_adjustment_media(p_adjustment uuid, p_ids jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE r public.appointment_adjustment; item jsonb; selected uuid; seen uuid[]:='{}'; a public.media_asset; s public.media_upload_session;
BEGIN
 SELECT * INTO r FROM public.appointment_adjustment WHERE id=p_adjustment AND adjustment_type='surcharge' AND approval_status='pending';
 IF NOT FOUND OR NOT pawpal_private.media_manage(auth.uid(),'adjustment_image',null,r.appointment_id) THEN RAISE EXCEPTION 'adjustment_media_forbidden' USING ERRCODE='42501'; END IF;
 IF jsonb_typeof(p_ids) IS DISTINCT FROM 'array' OR jsonb_array_length(p_ids)>10 THEN RAISE EXCEPTION 'invalid_adjustment_media' USING ERRCODE='22023'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(p_ids) LOOP
  IF jsonb_typeof(item) IS DISTINCT FROM 'string' THEN RAISE EXCEPTION 'invalid_adjustment_media' USING ERRCODE='22023'; END IF;
  selected:=(item#>>'{}')::uuid;
  IF selected IS NULL OR selected=ANY(seen) THEN RAISE EXCEPTION 'invalid_adjustment_media' USING ERRCODE='22023'; END IF;
  seen:=array_append(seen,selected);
  SELECT * INTO a FROM public.media_asset WHERE id=selected;
  SELECT * INTO s FROM public.media_upload_session WHERE id=a.session_id FOR UPDATE;
  SELECT * INTO a FROM public.media_asset WHERE id=selected FOR UPDATE;
  IF a.id IS NULL OR s.purpose<>'adjustment_image' OR s.appointment_id IS DISTINCT FROM r.appointment_id OR s.adjustment_id IS DISTINCT FROM p_adjustment
   OR a.status NOT IN ('verified','attached') OR s.state NOT IN ('verified','attached') OR (a.status='verified' AND s.created_by IS DISTINCT FROM auth.uid())
   OR EXISTS(SELECT 1 FROM public.appointment_adjustment_media WHERE media_asset_id=a.id AND adjustment_id<>p_adjustment) THEN RAISE EXCEPTION 'adjustment_media_forbidden' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.appointment_adjustment_media WHERE media_asset_id=a.id AND adjustment_id=p_adjustment) THEN
   IF (SELECT count(*) FROM public.appointment_adjustment_media WHERE adjustment_id=p_adjustment)>=10 THEN RAISE EXCEPTION 'adjustment_media_limit' USING ERRCODE='22023'; END IF;
   INSERT INTO public.appointment_adjustment_media(adjustment_id,media_asset_id) VALUES(p_adjustment,a.id);
   UPDATE public.media_asset SET status='attached',legal_hold=true WHERE id=a.id;
   UPDATE public.media_upload_session SET state='attached' WHERE id=s.id;
  END IF;
 END LOOP;
END $function$
;
CREATE OR REPLACE FUNCTION public.list_adjustment_media(p_appointment uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE ap public.appointment;
BEGIN
 SELECT * INTO ap FROM public.appointment WHERE id=p_appointment;
 IF NOT FOUND OR auth.uid() IS NULL OR NOT (pawpal_private.media_manage(auth.uid(),'adjustment_image',null,ap.id)
  OR (NOT EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid()) AND pawpal_private.owns_customer(ap.customer_id))) THEN RAISE EXCEPTION 'adjustment_media_forbidden' USING ERRCODE='42501'; END IF;
 RETURN (SELECT coalesce(jsonb_agg(jsonb_build_object('id',m.id,'adjustment_id',r.id,'media_asset_id',a.id,'file_name',s.original_name,'file_size',a.size_bytes) ORDER BY r.created_at,m.created_at,m.id),'[]')
 FROM public.appointment_adjustment_media m JOIN public.appointment_adjustment r ON r.id=m.adjustment_id JOIN public.media_asset a ON a.id=m.media_asset_id JOIN public.media_upload_session s ON s.id=a.session_id WHERE r.appointment_id=ap.id AND r.adjustment_type='surcharge' AND a.status='attached');
END $function$
;
CREATE OR REPLACE FUNCTION public.change_admin_service_charge(p_id uuid, p_appointment_id uuid, p_expected_updated_at timestamp with time zone, p_action text, p_details jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE a public.appointment; actor uuid; adjustment public.appointment_adjustment; item public.appointment_item; svc public.service; target_staff uuid;
 amount_value numeric:=nullif(p_details->>'amount','')::numeric; reason_value text:=btrim(p_details->>'reason'); weight_value numeric; quoted numeric; matching integer; ends timestamptz;
BEGIN
 IF NOT pawpal_private.has_permission('appointment.write') OR NOT pawpal_private.has_permission('appointment_adjustment.write') OR NOT pawpal_private.has_permission('appointment_item.write') OR NOT pawpal_private.has_permission('payment.read') OR NOT pawpal_private.has_permission('audit_log.write') THEN RAISE EXCEPTION 'service_charge_forbidden' USING ERRCODE='42501'; END IF;
 IF p_id IS NULL OR p_action IS NULL OR p_action NOT IN ('propose','confirm_consent','approve','cancel_adjustment','add_service','cancel_service') OR p_details IS NULL OR length(p_details::text)>8000 THEN RAISE EXCEPTION 'invalid_service_charge' USING ERRCODE='22023'; END IF;
 SELECT staff_id INTO target_staff FROM public.appointment WHERE id=p_appointment_id;
 IF p_action='add_service' AND target_staff IS NOT NULL THEN PERFORM 1 FROM public.staff WHERE id=target_staff FOR UPDATE; END IF;
 SELECT * INTO a FROM public.appointment WHERE id=p_appointment_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'booking_not_found' USING ERRCODE='P0002'; END IF;
 IF p_action IN ('propose','add_service') AND EXISTS(SELECT 1 FROM public.audit_log WHERE entity_id=p_id AND action='SERVICE_CHARGE_'||upper(p_action)) THEN
  IF NOT EXISTS(SELECT 1 FROM public.audit_log WHERE entity_id=p_id AND action='SERVICE_CHARGE_'||upper(p_action) AND description=jsonb_build_object('appointment_id',a.id,'details',p_details)::text) THEN RAISE EXCEPTION 'service_request_conflict' USING ERRCODE='PT409'; END IF;
  RETURN p_id;
 END IF;
 IF p_expected_updated_at IS NULL OR a.updated_at<>p_expected_updated_at THEN RAISE EXCEPTION 'booking_changed_reload_required' USING ERRCODE='PT409'; END IF;
 IF a.appointment_status NOT IN ('pending','confirmed','checked_in','in_progress') OR EXISTS(SELECT 1 FROM public.payment WHERE appointment_id=a.id AND transaction_status='succeeded') THEN RAISE EXCEPTION 'service_charges_locked' USING ERRCODE='22023'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 IF p_action='propose' THEN
  IF amount_value IS NULL OR amount_value::text IN ('NaN','Infinity','-Infinity') OR amount_value<=0 OR amount_value<>trunc(amount_value) OR coalesce(length(reason_value),0) NOT BETWEEN 1 AND 4000 OR coalesce(length(btrim(p_details->>'name')),0) NOT BETWEEN 1 AND 200 OR coalesce(p_details->>'consent','') NOT IN ('pending','confirmed') THEN RAISE EXCEPTION 'invalid_service_charge' USING ERRCODE='22023'; END IF;
  INSERT INTO public.appointment_adjustment(id,appointment_id,adjustment_type,duration_delta_minutes,amount_delta,reason,proposed_by,approval_status,customer_consent_status)
  VALUES(p_id,a.id,'surcharge',0,amount_value,btrim(p_details->>'name')||E'\n'||reason_value,actor,'pending',p_details->>'consent');
 ELSEIF p_action IN ('approve','confirm_consent','cancel_adjustment') THEN
  SELECT * INTO adjustment FROM public.appointment_adjustment WHERE id=p_id AND appointment_id=a.id FOR UPDATE;
  IF NOT FOUND OR adjustment.approval_status NOT IN ('pending','approved') THEN RAISE EXCEPTION 'service_adjustment_not_active' USING ERRCODE='22023'; END IF;
  IF p_action='confirm_consent' THEN
   IF adjustment.approval_status<>'pending' OR p_details->>'confirmed' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'charge_consent_required' USING ERRCODE='22023'; END IF;
   UPDATE public.appointment_adjustment SET customer_consent_status='confirmed' WHERE id=p_id;
  ELSEIF p_action='approve' THEN
   IF adjustment.approval_status<>'pending' OR adjustment.customer_consent_status<>'confirmed' THEN RAISE EXCEPTION 'charge_consent_required' USING ERRCODE='22023'; END IF;
   UPDATE public.appointment_adjustment SET approval_status='approved',approved_by=actor,approved_at=clock_timestamp() WHERE id=p_id;
  ELSE UPDATE public.appointment_adjustment SET approval_status='cancelled' WHERE id=p_id; END IF;
 ELSEIF p_action='add_service' THEN
  IF a.staff_id IS DISTINCT FROM target_staff THEN RAISE EXCEPTION 'booking_changed_reload_required' USING ERRCODE='PT409'; END IF;
  IF p_details->>'consent' IS DISTINCT FROM 'confirmed' THEN RAISE EXCEPTION 'charge_consent_required' USING ERRCODE='22023'; END IF;
  SELECT * INTO svc FROM public.service WHERE id=(p_details->>'service_id')::uuid AND status='active' FOR SHARE;
  IF NOT FOUND OR pawpal_private.catalog_duration(svc.id,(SELECT weight FROM public.pet_current_weight WHERE pet_id=a.pet_id),a.scheduled_start_at)<=0 OR NOT EXISTS(SELECT 1 FROM public.service_category WHERE id=svc.category_id AND category_code='grooming_spa') THEN RAISE EXCEPTION 'active_service_required' USING ERRCODE='22023'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.service_supported_species ss JOIN public.pet_profile pet ON pet.id=a.pet_id JOIN public.pet_breed b ON b.id=pet.breed_id AND b.species_id=ss.species_id WHERE ss.service_id=svc.id) THEN RAISE EXCEPTION 'service_species_not_supported' USING ERRCODE='22023'; END IF;
  IF a.staff_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.staff st WHERE st.id=a.staff_id AND st.employment_status='active' AND NOT st.service_locked AND (svc.staff_level_required_id IS NULL OR EXISTS(SELECT 1 FROM public.staff_level actual JOIN public.staff_level required ON required.id=svc.staff_level_required_id WHERE actual.id=st.staff_level_id AND actual.rank_order>=required.rank_order))) THEN RAISE EXCEPTION 'staff_not_eligible' USING ERRCODE='22023'; END IF;
  SELECT weight INTO weight_value FROM public.pet_current_weight WHERE pet_id=a.pet_id;
  SELECT count(*),min(unit_price) INTO matching,quoted FROM public.service_price_matrix WHERE service_id=svc.id AND status='active' AND weight_value>=weight_from AND (weight_to IS NULL OR weight_value<weight_to OR (weight_to_inclusive AND weight_value=weight_to)) AND effective_from<=a.scheduled_start_at AND (effective_to IS NULL OR effective_to>a.scheduled_start_at);
  IF matching<>1 OR quoted IS NULL OR amount_value IS DISTINCT FROM quoted THEN RAISE EXCEPTION 'service_quote_changed' USING ERRCODE='22023'; END IF;
  ends:=a.scheduled_end_at+make_interval(mins=>pawpal_private.catalog_duration(svc.id,(SELECT weight FROM public.pet_current_weight WHERE pet_id=a.pet_id),a.scheduled_start_at));
  IF a.staff_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.appointment WHERE id<>a.id AND staff_id=a.staff_id AND appointment_status NOT IN ('completed','cancelled','no_show') AND scheduled_start_at<ends AND scheduled_end_at>a.scheduled_start_at) THEN RAISE EXCEPTION 'staff_schedule_conflict' USING ERRCODE='PT409'; END IF;
  INSERT INTO public.appointment_item(id,appointment_id,service_id,is_primary,name_snapshot,quantity,unit_price,discount_amount,duration_minutes,weight_snapshot,staff_id,status)
  VALUES(p_id,a.id,svc.id,false,svc.service_name,1,quoted,0,pawpal_private.catalog_duration(svc.id,(SELECT weight FROM public.pet_current_weight WHERE pet_id=a.pet_id),a.scheduled_start_at),weight_value,a.staff_id,a.appointment_status);
  UPDATE public.appointment SET scheduled_end_at=ends WHERE id=a.id;
 ELSE
  SELECT * INTO item FROM public.appointment_item WHERE id=p_id AND appointment_id=a.id AND NOT is_primary AND status<>'cancelled' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'service_item_not_active' USING ERRCODE='22023'; END IF;
  UPDATE public.appointment_item SET status='cancelled' WHERE id=p_id;
  UPDATE public.appointment SET scheduled_end_at=greatest(scheduled_start_at+interval '1 minute',scheduled_end_at-make_interval(mins=>item.duration_minutes)) WHERE id=a.id;
 END IF;
 IF p_details ? 'media_asset_ids' THEN
  IF p_action<>'propose' THEN RAISE EXCEPTION 'adjustment_media_wrong_action' USING ERRCODE='22023'; END IF;
  PERFORM pawpal_private.attach_adjustment_media(p_id,p_details->'media_asset_ids');
 END IF;
 UPDATE public.appointment SET updated_at=clock_timestamp() WHERE id=a.id;
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES(actor,'SERVICE_CHARGE_'||upper(p_action),CASE WHEN p_action IN ('add_service','cancel_service') THEN 'appointment_item' ELSE 'appointment_adjustment' END,p_id,jsonb_build_object('appointment_id',a.id,'details',p_details)::text);
 RETURN p_id;
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
  allowed:=pawpal_private.media_manage(auth.uid(),s.purpose,s.product_id,s.appointment_id) AND (a.status='attached' OR s.created_by=auth.uid());
  IF NOT allowed AND a.status='attached' AND s.purpose IN ('intake_image','handover_image') AND NOT EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid()) THEN
   allowed:=EXISTS(SELECT 1 FROM public.appointment_record_media m JOIN public.appointment_record r ON r.id=m.record_id JOIN public.appointment ap ON ap.id=r.appointment_id WHERE m.media_asset_id=a.id AND pawpal_private.owns_customer(ap.customer_id));
  END IF;
  IF NOT allowed AND a.status='attached' AND s.purpose='adjustment_image' AND NOT EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid()) THEN
   allowed:=EXISTS(SELECT 1 FROM public.appointment_adjustment_media m JOIN public.appointment_adjustment r ON r.id=m.adjustment_id JOIN public.appointment ap ON ap.id=r.appointment_id WHERE m.media_asset_id=a.id AND pawpal_private.owns_customer(ap.customer_id));
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
  IF a.id IS NOT NULL AND (a.legal_hold OR a.retention_until>now() OR EXISTS(SELECT 1 FROM public.product_media WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.care_log_media WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.product_variant_media WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.service_image WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.appointment_record_media WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.appointment_adjustment_media WHERE media_asset_id=a.id)) THEN CONTINUE; END IF;
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
 AND NOT EXISTS(SELECT 1 FROM public.care_log_media WHERE media_asset_id=OLD.media_asset_id) AND NOT EXISTS(SELECT 1 FROM public.product_variant_media WHERE media_asset_id=OLD.media_asset_id) AND NOT EXISTS(SELECT 1 FROM public.service_image WHERE media_asset_id=OLD.media_asset_id) AND NOT EXISTS(SELECT 1 FROM public.appointment_record_media WHERE media_asset_id=OLD.media_asset_id) AND NOT EXISTS(SELECT 1 FROM public.appointment_adjustment_media WHERE media_asset_id=OLD.media_asset_id) THEN
  UPDATE public.media_asset SET status='pending_delete',retention_until=now()+interval '7 days' WHERE id=OLD.media_asset_id;
  UPDATE public.media_upload_session SET state='pending_delete',expires_at=now()+interval '7 days' WHERE id=(SELECT session_id FROM public.media_asset WHERE id=OLD.media_asset_id);
 END IF;
 RETURN NULL;
END $function$
;
REVOKE ALL ON FUNCTION public.prepare_adjustment_media_upload(uuid,uuid,uuid,bigint,text,text),public.list_adjustment_media(uuid),pawpal_private.attach_adjustment_media(uuid,jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.prepare_adjustment_media_upload(uuid,uuid,uuid,bigint,text,text),public.list_adjustment_media(uuid),pawpal_private.attach_adjustment_media(uuid,jsonb) TO authenticated;
COMMIT;
