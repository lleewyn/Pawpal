BEGIN;
SET LOCAL lock_timeout='3s';
ALTER TABLE public.media_upload_session DROP CONSTRAINT media_upload_session_check,DROP CONSTRAINT media_upload_session_purpose_check;
ALTER TABLE public.media_upload_session ADD CONSTRAINT media_upload_session_purpose_check CHECK(purpose IN ('product_image','care_log_image','product_variant_image','service_image','intake_image','handover_image'));
ALTER TABLE public.media_upload_session ADD CONSTRAINT media_upload_session_check CHECK ((((record_id IS NULL) AND (((service_id IS NULL) AND (((purpose = 'product_image'::text) AND (variant_id IS NULL) AND (appointment_id IS NULL) AND ((product_id IS NOT NULL) OR (draft_id IS NOT NULL))) OR ((purpose = 'care_log_image'::text) AND (variant_id IS NULL) AND (product_id IS NULL) AND (draft_id IS NULL) AND (appointment_id IS NOT NULL)) OR ((purpose = 'product_variant_image'::text) AND (variant_id IS NOT NULL) AND (appointment_id IS NULL) AND ((product_id IS NOT NULL) OR (draft_id IS NOT NULL))))) OR ((purpose = 'service_image'::text) AND (product_id IS NULL) AND (appointment_id IS NULL) AND (variant_id IS NULL) AND ((service_id IS NOT NULL) OR (draft_id IS NOT NULL))))) OR ((purpose IN ('intake_image'::text,'handover_image'::text)) AND (appointment_id IS NOT NULL) AND (record_id IS NOT NULL) AND (product_id IS NULL) AND (draft_id IS NULL) AND (variant_id IS NULL) AND (service_id IS NULL))));
CREATE OR REPLACE FUNCTION pawpal_private.media_manage(p_user uuid, p_purpose text, p_product uuid, p_appointment uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
 SELECT coalesce(EXISTS(SELECT 1 FROM public.staff_role r WHERE r.staff_id=pawpal_private.media_staff(p_user) AND
 (r.role_code='ADMIN' OR (p_purpose IN ('care_log_image','intake_image','handover_image') AND EXISTS(SELECT 1 FROM public.role_permission rp WHERE rp.role_code=r.role_code AND rp.permission_code='work.service.perform')
 AND EXISTS(SELECT 1 FROM public.appointment a WHERE a.id=p_appointment AND (a.staff_id=r.staff_id
 OR EXISTS(SELECT 1 FROM public.appointment_item i WHERE i.appointment_id=a.id AND i.staff_id=r.staff_id)
 OR EXISTS(SELECT 1 FROM public.taxi_trip t WHERE t.appointment_id=a.id AND t.driver_staff_id=r.staff_id)))))),false)
$function$
;
CREATE OR REPLACE FUNCTION public.prepare_handover_media_upload(p_request uuid, p_appointment uuid, p_record uuid, p_size bigint, p_mime text, p_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE p_purpose constant text:='handover_image'; p_product uuid:=null; p_draft uuid:=null; s public.media_upload_session; budget bigint; used bigint;
BEGIN
 IF NOT pawpal_private.media_manage(auth.uid(),p_purpose,p_product,p_appointment) THEN RAISE EXCEPTION 'media_forbidden' USING ERRCODE='42501'; END IF;
 IF p_request IS NULL OR p_appointment IS NULL OR p_record IS NULL OR p_size IS NULL OR p_size NOT BETWEEN 1 AND 3145728
 OR p_mime IS NULL OR p_mime NOT IN ('image/jpeg','image/png','image/webp') OR coalesce(length(p_name),0) NOT BETWEEN 1 AND 200
 OR NOT EXISTS(SELECT 1 FROM public.appointment WHERE id=p_appointment AND appointment_status='in_progress')
 OR EXISTS(SELECT 1 FROM public.appointment_record WHERE id=p_record AND (appointment_id<>p_appointment OR record_type<>'handover'))
 THEN RAISE EXCEPTION 'media_invalid' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('pawpal-media-quota',188));
 SELECT * INTO s FROM public.media_upload_session WHERE created_by=auth.uid() AND request_id=p_request FOR UPDATE;
 IF FOUND THEN
  IF s.record_id IS DISTINCT FROM p_record OR s.purpose IS DISTINCT FROM p_purpose OR s.product_id IS DISTINCT FROM p_product OR s.appointment_id IS DISTINCT FROM p_appointment OR s.draft_id IS DISTINCT FROM p_draft
  OR s.declared_size<>p_size OR s.mime_type<>p_mime OR s.original_name<>p_name THEN RAISE EXCEPTION 'media_request_conflict' USING ERRCODE='PT409'; END IF;
  IF s.state NOT IN ('pending','verified','attached') OR s.expires_at<=now() AND s.state='pending' THEN RAISE EXCEPTION 'media_session_closed' USING ERRCODE='PT409'; END IF;
  RETURN jsonb_build_object('session_id',s.id,'state',s.state,'asset_id',(SELECT id FROM public.media_asset WHERE session_id=s.id));
 END IF;
 SELECT max_storage_bytes INTO budget FROM pawpal_private.media_settings WHERE singleton AND enabled;
 IF budget IS NULL OR budget=0 THEN RAISE EXCEPTION 'media_disabled' USING ERRCODE='55000'; END IF;
 SELECT coalesce(sum(declared_size),0) INTO used FROM public.media_upload_session WHERE state<>'deleted';
 IF used+p_size>budget THEN RAISE EXCEPTION 'media_quota_exceeded' USING ERRCODE='54000'; END IF;
 IF (SELECT count(*) FROM public.media_upload_session WHERE created_by=auth.uid() AND state IN ('pending','uploading','verified'))>=10 THEN RAISE EXCEPTION 'media_too_many_pending' USING ERRCODE='54000'; END IF;
 INSERT INTO public.media_upload_session(created_by,request_id,purpose,product_id,appointment_id,draft_id,record_id,declared_size,mime_type,original_name)
 VALUES(auth.uid(),p_request,p_purpose,p_product,p_appointment,p_draft,p_record,p_size,p_mime,p_name) RETURNING * INTO s;
 RETURN jsonb_build_object('session_id',s.id,'state',s.state);
END $function$
;
CREATE OR REPLACE FUNCTION pawpal_private.attach_handover_media(p_record uuid, p_ids jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE r public.appointment_record; item jsonb; selected uuid; seen uuid[]:='{}'; a public.media_asset; s public.media_upload_session;
BEGIN
 SELECT * INTO r FROM public.appointment_record WHERE id=p_record AND record_type='handover';
 IF NOT FOUND OR NOT pawpal_private.media_manage(auth.uid(),'handover_image',null,r.appointment_id) THEN RAISE EXCEPTION 'handover_media_forbidden' USING ERRCODE='42501'; END IF;
 IF jsonb_typeof(p_ids) IS DISTINCT FROM 'array' OR jsonb_array_length(p_ids)>10 THEN RAISE EXCEPTION 'invalid_handover_media' USING ERRCODE='22023'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(p_ids) LOOP
  IF jsonb_typeof(item) IS DISTINCT FROM 'string' THEN RAISE EXCEPTION 'invalid_handover_media' USING ERRCODE='22023'; END IF;
  selected:=(item#>>'{}')::uuid;
  IF selected IS NULL OR selected=ANY(seen) THEN RAISE EXCEPTION 'invalid_handover_media' USING ERRCODE='22023'; END IF;
  seen:=array_append(seen,selected);
  SELECT * INTO a FROM public.media_asset WHERE id=selected;
  SELECT * INTO s FROM public.media_upload_session WHERE id=a.session_id FOR UPDATE;
  SELECT * INTO a FROM public.media_asset WHERE id=selected FOR UPDATE;
  IF a.id IS NULL OR s.purpose<>'handover_image' OR s.appointment_id IS DISTINCT FROM r.appointment_id OR s.record_id IS DISTINCT FROM p_record
   OR a.status NOT IN ('verified','attached') OR s.state NOT IN ('verified','attached') OR (a.status='verified' AND s.created_by IS DISTINCT FROM auth.uid())
   OR EXISTS(SELECT 1 FROM public.appointment_record_media WHERE media_asset_id=a.id AND record_id<>p_record) THEN RAISE EXCEPTION 'handover_media_forbidden' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.appointment_record_media WHERE media_asset_id=a.id AND record_id=p_record) THEN
   IF (SELECT count(*) FROM public.appointment_record_media WHERE record_id=p_record)>=10 THEN RAISE EXCEPTION 'handover_media_limit' USING ERRCODE='22023'; END IF;
   INSERT INTO public.appointment_record_media(record_id,media_asset_id) VALUES(p_record,a.id);
   UPDATE public.media_asset SET status='attached',legal_hold=true WHERE id=a.id;
   UPDATE public.media_upload_session SET state='attached' WHERE id=s.id;
  END IF;
 END LOOP;
END $function$
;
CREATE OR REPLACE FUNCTION public.list_handover_media(p_appointment uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE ap public.appointment;
BEGIN
 SELECT * INTO ap FROM public.appointment WHERE id=p_appointment;
 IF NOT FOUND OR auth.uid() IS NULL OR NOT (pawpal_private.media_manage(auth.uid(),'handover_image',null,ap.id)
  OR (NOT EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid()) AND pawpal_private.owns_customer(ap.customer_id))) THEN RAISE EXCEPTION 'handover_media_forbidden' USING ERRCODE='42501'; END IF;
 RETURN (SELECT coalesce(jsonb_agg(jsonb_build_object('id',m.id,'record_id',r.id,'media_asset_id',a.id,'file_name',s.original_name,'file_size',a.size_bytes) ORDER BY r.revision_no,m.created_at,m.id),'[]')
 FROM public.appointment_record_media m JOIN public.appointment_record r ON r.id=m.record_id JOIN public.media_asset a ON a.id=m.media_asset_id JOIN public.media_upload_session s ON s.id=a.session_id WHERE r.appointment_id=ap.id AND r.record_type='handover' AND a.status='attached');
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
CREATE OR REPLACE FUNCTION public.save_admin_service_record(p_id uuid, p_appointment_id uuid, p_expected_updated_at timestamp with time zone, p_type text, p_details jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE a public.appointment; pet public.pet_profile; actor uuid; performer uuid:=nullif(p_details->>'staffId','')::uuid;
 prior public.appointment_record; rev integer; at_time timestamptz:=now(); weight_value numeric:=nullif(p_details->>'actualWeight','')::numeric;
 condition_text text; confirmation text:=CASE WHEN p_details->>'customerConfirmed'='true' THEN 'confirmed' ELSE 'pending' END;
BEGIN
 PERFORM pawpal_private.work_guard_rpc('save_admin_service_record',jsonb_build_object('p_id',to_jsonb(p_id),'p_appointment_id',to_jsonb(p_appointment_id),'p_expected_updated_at',to_jsonb(p_expected_updated_at),'p_type',to_jsonb(p_type),'p_details',to_jsonb(p_details)));
 IF NOT pawpal_private.work_rpc_permission('save_admin_service_record','appointment.write') OR NOT pawpal_private.work_rpc_permission('save_admin_service_record','appointment_item.write') OR NOT pawpal_private.work_rpc_permission('save_admin_service_record','appointment_record.write') OR NOT pawpal_private.work_rpc_permission('save_admin_service_record','audit_log.write') THEN RAISE EXCEPTION 'service_record_forbidden' USING ERRCODE='42501'; END IF;
 IF p_id IS NULL OR p_appointment_id IS NULL OR p_type IS NULL OR p_type NOT IN ('intake','handover') OR p_details IS NULL OR jsonb_typeof(p_details)<>'object' OR length(p_details::text)>12000 THEN RAISE EXCEPTION 'invalid_service_record' USING ERRCODE='22023'; END IF;
 -- Match the staff-before-appointment lock order used by assignment and booking.
 IF p_type='intake' THEN
  IF performer IS NULL OR NOT pawpal_private.work_rpc_permission('save_admin_service_record','pet_weight_history.write') THEN RAISE EXCEPTION 'service_record_forbidden' USING ERRCODE='42501'; END IF;
  PERFORM 1 FROM public.staff WHERE id=performer AND employment_status='active' AND NOT service_locked FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'staff_not_eligible' USING ERRCODE='22023'; END IF;
 END IF;
 SELECT * INTO a FROM public.appointment WHERE id=p_appointment_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'booking_not_found' USING ERRCODE='P0002'; END IF;
 SELECT * INTO prior FROM public.appointment_record WHERE id=p_id;
 IF FOUND THEN
  IF prior.appointment_id<>p_appointment_id OR prior.record_type<>p_type OR NOT EXISTS(SELECT 1 FROM public.audit_log WHERE entity_id=p_id AND action='SAVE_SERVICE_RECORD' AND description=p_details::text) THEN RAISE EXCEPTION 'service_request_conflict' USING ERRCODE='PT409'; END IF;
  RETURN p_id;
 END IF;
 IF p_expected_updated_at IS NULL OR a.updated_at<>p_expected_updated_at THEN RAISE EXCEPTION 'booking_changed_reload_required' USING ERRCODE='PT409'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 SELECT * INTO pet FROM public.pet_profile WHERE id=a.pet_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'pet_not_found' USING ERRCODE='P0002'; END IF;
 IF p_type='intake' THEN
  IF a.appointment_status NOT IN ('confirmed','checked_in','in_progress') OR weight_value IS NULL OR weight_value::text IN ('NaN','Infinity','-Infinity') OR weight_value<=0 OR weight_value>1000
   OR coalesce(length(btrim(p_details->>'skinCoat')),0)=0 OR coalesce(length(btrim(p_details->>'eyesEars')),0)=0 OR coalesce(length(btrim(p_details->>'wounds')),0)=0 OR coalesce(length(btrim(p_details->>'temperament')),0)=0 THEN RAISE EXCEPTION 'intake_observations_required' USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM public.appointment_item i JOIN public.service s ON s.id=i.service_id JOIN public.staff_level required ON required.id=s.staff_level_required_id WHERE i.appointment_id=a.id AND i.status<>'cancelled' AND NOT EXISTS(SELECT 1 FROM public.staff st JOIN public.staff_level actual ON actual.id=st.staff_level_id WHERE st.id=performer AND actual.rank_order>=required.rank_order)) THEN RAISE EXCEPTION 'staff_level_required' USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM public.appointment WHERE id<>a.id AND staff_id=performer AND appointment_status NOT IN ('completed','cancelled','no_show') AND scheduled_start_at<a.scheduled_end_at AND scheduled_end_at>a.scheduled_start_at) THEN RAISE EXCEPTION 'staff_schedule_conflict' USING ERRCODE='PT409'; END IF;
  condition_text:=concat_ws(E'\n','Da và lông: '||btrim(p_details->>'skinCoat'),'Mắt và tai: '||btrim(p_details->>'eyesEars'),'Vết thương: '||btrim(p_details->>'wounds'),'Tập tính: '||btrim(p_details->>'temperament'),'Tư trang: '||coalesce(p_details->>'belongings',''));
  INSERT INTO public.pet_weight_history(pet_id,weight,measured_at,recorded_by,note) VALUES(a.pet_id,weight_value,at_time,actor,'Cân khi lập biên bản tiếp nhận dịch vụ.');
  UPDATE public.appointment SET appointment_status='in_progress',staff_id=performer,check_in_time=coalesce(check_in_time,at_time) WHERE id=a.id;
  UPDATE public.appointment_item SET staff_id=performer,status='in_progress' WHERE appointment_id=a.id AND is_primary AND status<>'cancelled';
 ELSE
  IF a.appointment_status<>'in_progress' OR p_details->>'qualityAccepted' IS DISTINCT FROM 'true' OR p_details->>'belongingsReturned' IS DISTINCT FROM 'true' OR confirmation<>'confirmed' THEN RAISE EXCEPTION 'handover_confirmation_required' USING ERRCODE='22023'; END IF;
  SELECT * INTO prior FROM public.appointment_record WHERE appointment_id=a.id AND record_type='intake' ORDER BY revision_no DESC LIMIT 1;
  IF prior.id IS NULL OR prior.customer_confirmation_status<>'confirmed' THEN RAISE EXCEPTION 'confirmed_intake_required' USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM public.appointment_adjustment WHERE appointment_id=a.id AND (approval_status='pending' OR (approval_status='approved' AND customer_consent_status<>'confirmed'))) THEN RAISE EXCEPTION 'pending_service_adjustments' USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM public.hotel_booking WHERE appointment_id=a.id AND status NOT IN ('completed','cancelled','checked_out','closed')) THEN RAISE EXCEPTION 'hotel_checkout_required' USING ERRCODE='22023'; END IF;
  condition_text:='Đã kiểm tra chất lượng dịch vụ, trả đủ tư trang và ghi nhận khách xác nhận bàn giao.';
  UPDATE public.appointment SET appointment_status='completed',check_out_time=at_time WHERE id=a.id;
  UPDATE public.appointment_item SET status='completed' WHERE appointment_id=a.id AND status<>'cancelled';
 END IF;
 SELECT coalesce(max(revision_no),0)+1 INTO rev FROM public.appointment_record WHERE appointment_id=a.id AND record_type=p_type;
 INSERT INTO public.appointment_record(id,appointment_id,record_type,schema_version,revision_no,recorded_by,recorded_at,condition_note,safety_note_snapshot,allergy_note_snapshot,customer_confirmation_status,confirmed_at,note)
 VALUES(p_id,a.id,p_type,2,rev,actor,at_time,condition_text,pet.safety_note,pet.allergy,confirmation,CASE WHEN confirmation='confirmed' THEN at_time END,nullif(btrim(p_details->>'belongingsNote'),''));
 IF p_details ? 'media_asset_ids' THEN
  IF p_type='intake' THEN PERFORM pawpal_private.attach_intake_media(p_id,p_details->'media_asset_ids');
  ELSE PERFORM pawpal_private.attach_handover_media(p_id,p_details->'media_asset_ids'); END IF;
 END IF;
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES(actor,'SAVE_SERVICE_RECORD','appointment_record',p_id,p_details::text);
 RETURN p_id;
END $function$
;
REVOKE ALL ON FUNCTION public.prepare_handover_media_upload(uuid,uuid,uuid,bigint,text,text),public.list_handover_media(uuid),pawpal_private.attach_handover_media(uuid,jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.prepare_handover_media_upload(uuid,uuid,uuid,bigint,text,text),public.list_handover_media(uuid) TO authenticated;
COMMIT;
