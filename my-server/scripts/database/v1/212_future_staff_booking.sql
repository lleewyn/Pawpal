BEGIN;
SET LOCAL lock_timeout='5s';
CREATE TABLE IF NOT EXISTS public.staff_recurring_schedule(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),staff_id uuid NOT NULL REFERENCES public.staff(id),
 weekdays integer[] NOT NULL CHECK(cardinality(weekdays) BETWEEN 1 AND 7 AND weekdays<@ARRAY[1,2,3,4,5,6,7]),
 start_time time NOT NULL,end_time time NOT NULL CHECK(end_time>start_time),
 valid_from date NOT NULL,valid_to date CHECK(valid_to>=valid_from),is_active boolean NOT NULL DEFAULT true,
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE public.staff_recurring_schedule ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS recurring_staff_read ON public.staff_recurring_schedule;
CREATE POLICY recurring_staff_read ON public.staff_recurring_schedule FOR SELECT TO authenticated
 USING(pawpal_private.has_permission('staff_schedule.read'));
REVOKE ALL ON public.staff_recurring_schedule FROM anon,authenticated;
GRANT SELECT ON public.staff_recurring_schedule TO authenticated;
GRANT ALL ON public.staff_recurring_schedule TO service_role;
ALTER TABLE public.appointment ADD COLUMN IF NOT EXISTS requested_staff_id uuid REFERENCES public.staff(id);
ALTER TABLE public.appointment ADD COLUMN IF NOT EXISTS staff_confirmation_status text NOT NULL DEFAULT 'not_required'
 CHECK(staff_confirmation_status IN('not_required','pending','confirmed','awaiting_customer'));
ALTER TABLE public.appointment ADD COLUMN IF NOT EXISTS proposal_staff_id uuid REFERENCES public.staff(id);
ALTER TABLE public.appointment ADD COLUMN IF NOT EXISTS proposal_start_at timestamptz;
ALTER TABLE public.appointment ADD COLUMN IF NOT EXISTS proposal_end_at timestamptz;
ALTER TABLE public.appointment ADD COLUMN IF NOT EXISTS proposal_created_at timestamptz;
CREATE INDEX IF NOT EXISTS appointment_requested_staff_time ON public.appointment(requested_staff_id,scheduled_start_at,scheduled_end_at) WHERE requested_staff_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS staff_recurring_active_range ON public.staff_recurring_schedule(staff_id,valid_from,valid_to) WHERE is_active;

CREATE OR REPLACE FUNCTION public.save_staff_recurring_schedule(p_id uuid,p_revision timestamptz,p_details jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE old public.staff_recurring_schedule;target uuid;days integer[];starts time;ends time;first_day date;last_day date;active boolean;
BEGIN
 IF NOT pawpal_private.has_permission('staff_schedule.write') OR NOT pawpal_private.has_permission('audit_log.write') THEN RAISE EXCEPTION 'staff_schedule_forbidden' USING ERRCODE='42501';END IF;
 IF p_id IS NULL OR jsonb_typeof(p_details) IS DISTINCT FROM 'object' OR length(p_details::text)>4000 THEN RAISE EXCEPTION 'invalid_recurring_schedule' USING ERRCODE='22023';END IF;
 target:=(p_details->>'staff_id')::uuid;
 SELECT array_agg(DISTINCT v::integer ORDER BY v::integer) INTO days FROM jsonb_array_elements_text(p_details->'weekdays') v;
 starts:=(p_details->>'start_time')::time;ends:=(p_details->>'end_time')::time;
 first_day:=(p_details->>'valid_from')::date;last_day:=nullif(p_details->>'valid_to','')::date;active:=(p_details->>'is_active')::boolean;
 IF target IS NULL OR cardinality(days) IS NULL OR cardinality(days)<1 OR NOT days<@ARRAY[1,2,3,4,5,6,7]
 OR starts IS NULL OR ends IS NULL OR ends<=starts OR first_day IS NULL OR last_day<first_day OR active IS NULL THEN RAISE EXCEPTION 'invalid_recurring_schedule' USING ERRCODE='22023';END IF;
 PERFORM 1 FROM public.staff WHERE id=target AND employment_status='active' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'staff_not_available' USING ERRCODE='PT409';END IF;
 SELECT * INTO old FROM public.staff_recurring_schedule WHERE id=p_id FOR UPDATE;
 IF old.id IS NOT NULL AND (p_revision IS NULL OR old.updated_at<>p_revision) OR old.id IS NULL AND p_revision IS NOT NULL THEN RAISE EXCEPTION 'staff_schedule_changed' USING ERRCODE='PT409';END IF;
 INSERT INTO public.staff_recurring_schedule(id,staff_id,weekdays,start_time,end_time,valid_from,valid_to,is_active)
 VALUES(p_id,target,days,starts,ends,first_day,last_day,active)
 ON CONFLICT(id) DO UPDATE SET staff_id=excluded.staff_id,weekdays=excluded.weekdays,start_time=excluded.start_time,end_time=excluded.end_time,valid_from=excluded.valid_from,valid_to=excluded.valid_to,is_active=excluded.is_active,updated_at=clock_timestamp();
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description)
 SELECT id,'STAFF_RECURRING_SCHEDULE_SAVE','staff_recurring_schedule',p_id,p_details::text FROM public.staff WHERE auth_user_id=auth.uid();
 RETURN p_id;
END $$;
REVOKE ALL ON FUNCTION public.save_staff_recurring_schedule(uuid,timestamptz,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_staff_recurring_schedule(uuid,timestamptz,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION pawpal_private.booking_staff_choices(p_owner uuid,p_details jsonb,p_exclude uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
#variable_conflict use_variable
DECLARE svc public.service;starts timestamptz:=(p_details->>'scheduled_start_at')::timestamptz;ends timestamptz;weight numeric;local_start timestamp;local_end timestamp;result jsonb;
BEGIN
 SELECT * INTO svc FROM public.service WHERE id=(p_details->>'service_id')::uuid AND status='active';
 IF svc.id IS NULL THEN RETURN '[]';END IF;
 SELECT w.weight INTO weight FROM public.pet_current_weight w JOIN public.pet_profile p ON p.id=w.pet_id WHERE p.id=(p_details->>'pet_id')::uuid AND p.customer_id=p_owner AND p.status='active';
 ends:=starts+make_interval(mins=>(pawpal_private.catalog_duration(svc.id,weight,starts)+coalesce((SELECT sum(estimated_duration) FROM public.service_addon WHERE id IN(SELECT value::uuid FROM jsonb_array_elements_text(coalesce(p_details->'addon_ids','[]'))) AND service_id=svc.id AND status='active'),0))::integer);
 local_start:=starts AT TIME ZONE 'Asia/Bangkok';local_end:=ends AT TIME ZONE 'Asia/Bangkok';
 IF starts IS NULL OR ends IS NULL OR local_start::date<>local_end::date THEN RETURN '[]';END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',person.id,'name',person.full_name,'source',person.source,'requires_confirmation',person.source<>'scheduled') ORDER BY person.full_name),'[]') INTO result
 FROM (
  SELECT s.id,s.full_name,CASE WHEN EXISTS(SELECT 1 FROM public.staff_schedule sc WHERE sc.staff_id=s.id AND sc.schedule_status='active' AND sc.availability_status='available' AND sc.start_at<=starts AND sc.end_at>=ends) THEN 'scheduled'
   WHEN EXISTS(SELECT 1 FROM public.staff_recurring_schedule r WHERE r.staff_id=s.id AND r.is_active AND r.valid_from<=local_start::date AND (r.valid_to IS NULL OR r.valid_to>=local_start::date) AND extract(isodow FROM local_start)::integer=ANY(r.weekdays) AND r.start_time<=local_start::time AND r.end_time>=local_end::time) THEN 'recurring' ELSE 'request' END source
  FROM public.staff s WHERE s.employment_status='active' AND NOT s.service_locked AND s.staff_level_id IS NOT NULL AND pawpal_private.staff_skill_allows_assignment(s.id)
  AND (svc.staff_level_required_id IS NULL OR EXISTS(SELECT 1 FROM public.staff_level a JOIN public.staff_level r ON r.id=svc.staff_level_required_id WHERE a.id=s.staff_level_id AND a.rank_order>=r.rank_order))
  AND NOT EXISTS(SELECT 1 FROM public.staff_schedule sc WHERE sc.staff_id=s.id AND sc.schedule_status='active' AND sc.availability_status<>'available' AND sc.start_at<ends AND sc.end_at>starts)
  AND (
   EXISTS(SELECT 1 FROM public.staff_schedule sc WHERE sc.staff_id=s.id AND sc.schedule_status='active' AND sc.availability_status='available' AND sc.start_at<=starts AND sc.end_at>=ends)
   OR (NOT EXISTS(SELECT 1 FROM public.staff_schedule sc WHERE sc.staff_id=s.id AND sc.schedule_status='active' AND sc.start_at<((local_start::date+1)::timestamp AT TIME ZONE 'Asia/Bangkok') AND sc.end_at>(local_start::date::timestamp AT TIME ZONE 'Asia/Bangkok'))
    AND (EXISTS(SELECT 1 FROM public.staff_recurring_schedule r WHERE r.staff_id=s.id AND r.is_active AND r.valid_from<=local_start::date AND (r.valid_to IS NULL OR r.valid_to>=local_start::date) AND extract(isodow FROM local_start)::integer=ANY(r.weekdays) AND r.start_time<=local_start::time AND r.end_time>=local_end::time)
     OR NOT EXISTS(SELECT 1 FROM public.staff_recurring_schedule r WHERE r.staff_id=s.id AND r.is_active AND r.valid_from<=local_start::date AND (r.valid_to IS NULL OR r.valid_to>=local_start::date))))
  )
  AND NOT EXISTS(SELECT 1 FROM public.appointment a WHERE a.id IS DISTINCT FROM p_exclude AND a.appointment_status NOT IN('completed','cancelled','no_show','expired','da_huy','da_hoan_tat','vang_mat') AND a.scheduled_start_at<ends AND a.scheduled_end_at>starts AND (a.staff_id=s.id OR a.requested_staff_id=s.id OR EXISTS(SELECT 1 FROM public.appointment_item i WHERE i.appointment_id=a.id AND i.staff_id=s.id AND i.status<>'cancelled')))
  AND NOT EXISTS(SELECT 1 FROM pawpal_private.member_booking_hold h WHERE h.staff_id=s.id AND h.customer_id<>p_owner AND h.expires_at>clock_timestamp() AND h.starts<ends AND h.ends>starts)
 ) person;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.booking_staff_choices(uuid,jsonb,uuid) FROM PUBLIC,anon,authenticated,service_role;

DO $$ DECLARE signature text;src text;left_at integer;right_at integer;BEGIN
 FOREACH signature IN ARRAY ARRAY['public.own_booking_availability(jsonb)','pawpal_private.guest_booking_availability(uuid,jsonb)'] LOOP
  src:=pg_get_functiondef(signature::regprocedure);
  IF position('booking_staff_choices' IN src)=0 THEN
   left_at:=position($marker$ SELECT coalesce(jsonb_agg(jsonb_build_object('id',s.id,'name',s.full_name)$marker$ IN src);
   IF left_at=0 THEN RAISE EXCEPTION 'Unexpected availability staff definition %',signature;END IF;
   right_at:=left_at+position(' RETURN jsonb_build_object(' IN substring(src FROM left_at))-1;
   IF right_at<=left_at THEN RAISE EXCEPTION 'Unexpected availability return';END IF;
   src:=substring(src FROM 1 FOR left_at-1)||E' workers:=pawpal_private.booking_staff_choices(cid,p_details);\n'||substring(src FROM right_at);
   EXECUTE src;
  END IF;
 END LOOP;
END $$;

CREATE OR REPLACE FUNCTION pawpal_private.booking_request_details(p_id uuid,p_start timestamptz DEFAULT NULL)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT jsonb_build_object('pet_id',a.pet_id,'service_id',(SELECT service_id FROM public.appointment_item WHERE appointment_id=a.id AND is_primary LIMIT 1),'scheduled_start_at',coalesce(p_start,a.scheduled_start_at),'addon_ids',coalesce((SELECT jsonb_agg(service_addon_id) FROM public.appointment_item WHERE appointment_id=a.id AND service_addon_id IS NOT NULL AND status<>'cancelled'),'[]')) FROM public.appointment a WHERE a.id=p_id
$$;
REVOKE ALL ON FUNCTION pawpal_private.booking_request_details(uuid,timestamptz) FROM PUBLIC,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION pawpal_private.finalize_requested_booking(p_id uuid,p_staff uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE a public.appointment;choice jsonb;concrete boolean;
BEGIN
 SELECT * INTO a FROM public.appointment WHERE id=p_id;
 SELECT v INTO choice FROM jsonb_array_elements(pawpal_private.booking_staff_choices(a.customer_id,pawpal_private.booking_request_details(p_id),p_id)) v WHERE v->>'id'=p_staff::text;
 IF choice IS NULL THEN RAISE EXCEPTION 'preferred_staff_unavailable' USING ERRCODE='PT409';END IF;
 concrete:=choice->>'source'='scheduled';
 UPDATE public.appointment SET requested_staff_id=p_staff,staff_id=CASE WHEN concrete THEN p_staff END,staff_confirmation_status=CASE WHEN concrete THEN 'confirmed' ELSE 'pending' END,appointment_status=CASE WHEN concrete THEN 'confirmed' ELSE 'pending' END WHERE id=p_id;
 UPDATE public.appointment_item SET staff_id=CASE WHEN concrete THEN p_staff END WHERE appointment_id=p_id;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.finalize_requested_booking(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
DO $$ DECLARE signature text;src text;old_clause text;BEGIN
 FOREACH signature IN ARRAY ARRAY['public.create_own_service_booking(uuid,text,jsonb)','public.guest_booking_create(text,uuid,text,jsonb)'] LOOP
  src:=pg_get_functiondef(signature::regprocedure);
  IF position('finalize_requested_booking' IN src)=0 THEN
   IF signature LIKE '%create_own%' THEN
    old_clause:=$old$UPDATE public.appointment SET staff_id=(p_details->>'preferred_staff_id')::uuid,appointment_status='confirmed' WHERE id=p_id;
  UPDATE public.appointment_item SET staff_id=(p_details->>'preferred_staff_id')::uuid WHERE appointment_id=p_id;$old$;
    IF position(old_clause IN src)=0 THEN RAISE EXCEPTION 'Unexpected member finalization';END IF;
    src:=replace(src,old_clause,$new$PERFORM pawpal_private.finalize_requested_booking(p_id,(p_details->>'preferred_staff_id')::uuid);$new$);
   ELSE
    old_clause:=$old$UPDATE public.appointment SET staff_id=(p_details->>'preferred_staff_id')::uuid,appointment_status='confirmed' WHERE id=p_request;
  UPDATE public.appointment_item SET staff_id=(p_details->>'preferred_staff_id')::uuid WHERE appointment_id=p_request;$old$;
    IF position(old_clause IN src)=0 THEN RAISE EXCEPTION 'Unexpected guest finalization';END IF;
    src:=replace(src,old_clause,$new$PERFORM pawpal_private.finalize_requested_booking(p_request,(p_details->>'preferred_staff_id')::uuid);$new$);
   END IF;
   EXECUTE src;
  END IF;
 END LOOP;
END $$;

CREATE OR REPLACE FUNCTION pawpal_private.guard_requested_booking()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE choice jsonb;consented boolean:=false;
BEGIN
 IF OLD.requested_staff_id IS NULL AND NEW.requested_staff_id IS NULL THEN RETURN NEW;END IF;
 PERFORM pg_advisory_xact_lock(820068);
 consented:=coalesce(OLD.staff_confirmation_status='awaiting_customer' AND OLD.proposal_staff_id IS NOT NULL
  AND NEW.requested_staff_id=OLD.proposal_staff_id AND NEW.staff_id=OLD.proposal_staff_id
  AND NEW.scheduled_start_at=OLD.proposal_start_at AND NEW.scheduled_end_at=OLD.proposal_end_at
  AND (auth.role()='service_role' OR pawpal_private.owns_customer(OLD.customer_id)),false);
 IF OLD.requested_staff_id IS NOT NULL AND NOT consented AND (NEW.requested_staff_id IS DISTINCT FROM OLD.requested_staff_id OR NEW.staff_id IS NOT NULL AND NEW.staff_id IS DISTINCT FROM OLD.requested_staff_id) THEN
  RAISE EXCEPTION 'requested_staff_customer_consent_required' USING ERRCODE='PT409';
 END IF;
 IF OLD.requested_staff_id IS NOT NULL AND (NEW.scheduled_start_at,NEW.scheduled_end_at) IS DISTINCT FROM (OLD.scheduled_start_at,OLD.scheduled_end_at) AND NOT consented THEN
  IF NOT pawpal_private.owns_customer(OLD.customer_id) THEN RAISE EXCEPTION 'requested_staff_customer_consent_required' USING ERRCODE='PT409';END IF;
  SELECT v INTO choice FROM jsonb_array_elements(pawpal_private.booking_staff_choices(NEW.customer_id,pawpal_private.booking_request_details(OLD.id,NEW.scheduled_start_at),OLD.id)) v WHERE v->>'id'=NEW.requested_staff_id::text;
  IF choice IS NULL THEN RAISE EXCEPTION 'preferred_staff_unavailable' USING ERRCODE='PT409';END IF;
  IF choice->>'source'<>'scheduled' THEN NEW.staff_id:=NULL;NEW.staff_confirmation_status:='pending';NEW.appointment_status:='pending';END IF;
 END IF;
 IF (NEW.proposal_staff_id,NEW.proposal_start_at,NEW.proposal_end_at) IS DISTINCT FROM (OLD.proposal_staff_id,OLD.proposal_start_at,OLD.proposal_end_at)
 AND NEW.proposal_staff_id IS NOT NULL AND NOT pawpal_private.has_permission('appointment.write') AND auth.role()<>'service_role' THEN RAISE EXCEPTION 'booking_write_forbidden' USING ERRCODE='42501';END IF;
 IF NEW.appointment_status IN('cancelled','completed','no_show','expired') THEN RETURN NEW;END IF;
 IF (NEW.appointment_status='confirmed' OR NEW.staff_id IS NOT NULL AND NEW.staff_id IS DISTINCT FROM OLD.staff_id) AND NEW.requested_staff_id IS NOT NULL THEN
  SELECT v INTO choice FROM jsonb_array_elements(pawpal_private.booking_staff_choices(NEW.customer_id,pawpal_private.booking_request_details(OLD.id,NEW.scheduled_start_at),OLD.id)) v WHERE v->>'id'=NEW.requested_staff_id::text;
  IF choice IS NULL OR choice->>'source'<>'scheduled' OR NOT EXISTS(SELECT 1 FROM public.staff_schedule sc WHERE sc.staff_id=NEW.requested_staff_id AND sc.schedule_status='active' AND sc.availability_status='available' AND sc.start_at<=NEW.scheduled_start_at AND sc.end_at>=NEW.scheduled_end_at) THEN RAISE EXCEPTION 'requested_staff_schedule_required' USING ERRCODE='PT409';END IF;
  NEW.staff_id:=NEW.requested_staff_id;NEW.staff_confirmation_status:='confirmed';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS z_guard_requested_booking ON public.appointment;
CREATE TRIGGER z_guard_requested_booking BEFORE UPDATE ON public.appointment FOR EACH ROW EXECUTE FUNCTION pawpal_private.guard_requested_booking();
CREATE OR REPLACE FUNCTION pawpal_private.sync_requested_booking_items()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF NEW.requested_staff_id IS NOT NULL AND NEW.staff_id IS DISTINCT FROM OLD.staff_id THEN
  UPDATE public.appointment_item SET staff_id=NEW.staff_id WHERE appointment_id=NEW.id AND status<>'cancelled';
 END IF;
 RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS sync_requested_booking_items ON public.appointment;
CREATE TRIGGER sync_requested_booking_items AFTER UPDATE ON public.appointment FOR EACH ROW EXECUTE FUNCTION pawpal_private.sync_requested_booking_items();

-- Block leave/cancelled/shortened shifts that would strand a pending preference.
CREATE OR REPLACE FUNCTION pawpal_private.guard_requested_staff_shift()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE person uuid;from_at timestamptz;to_at timestamptz;
BEGIN
 person:=CASE WHEN TG_OP='DELETE' THEN OLD.staff_id ELSE NEW.staff_id END;
 IF TG_OP='INSERT' AND NEW.schedule_status='active' AND NEW.availability_status='available' THEN RETURN NEW;END IF;
 from_at:=CASE WHEN TG_OP='DELETE' THEN OLD.start_at ELSE least(NEW.start_at,OLD.start_at) END;
 to_at:=CASE WHEN TG_OP='DELETE' THEN OLD.end_at ELSE greatest(NEW.end_at,OLD.end_at) END;
 IF EXISTS(SELECT 1 FROM public.appointment a WHERE a.requested_staff_id IN(person,CASE WHEN TG_OP='UPDATE' THEN OLD.staff_id ELSE person END) AND a.appointment_status IN('pending','confirmed') AND a.scheduled_start_at<to_at AND a.scheduled_end_at>from_at
  AND (TG_OP='DELETE' OR NEW.schedule_status<>'active' OR NEW.availability_status<>'available' OR NEW.staff_id IS DISTINCT FROM OLD.staff_id OR NEW.start_at>a.scheduled_start_at OR NEW.end_at<a.scheduled_end_at)) THEN
  RAISE EXCEPTION 'staff_has_requested_booking' USING ERRCODE='PT409';END IF;
 IF TG_OP='DELETE' THEN RETURN OLD;END IF;RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_requested_staff_shift ON public.staff_schedule;
CREATE TRIGGER guard_requested_staff_shift BEFORE INSERT OR UPDATE OR DELETE ON public.staff_schedule FOR EACH ROW EXECUTE FUNCTION pawpal_private.guard_requested_staff_shift();

CREATE OR REPLACE FUNCTION pawpal_private.booking_staff_request_json(p_id uuid)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT jsonb_build_object('status',CASE WHEN a.appointment_status IN('cancelled','completed','no_show','expired') THEN 'not_required' ELSE a.staff_confirmation_status END,'requested_staff_id',a.requested_staff_id,'requested_staff_name',(SELECT full_name FROM public.staff WHERE id=a.requested_staff_id),'proposal_staff_id',a.proposal_staff_id,'proposal_staff_name',(SELECT full_name FROM public.staff WHERE id=a.proposal_staff_id),'proposal_start_at',a.proposal_start_at,'proposal_end_at',a.proposal_end_at,'proposal_revision',a.proposal_created_at)
 FROM public.appointment a WHERE a.id=p_id
$$;
REVOKE ALL ON FUNCTION pawpal_private.booking_staff_request_json(uuid) FROM PUBLIC,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.own_booking_staff_request(p_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.appointment a WHERE a.id=p_id AND pawpal_private.owns_customer(a.customer_id)) THEN RAISE EXCEPTION 'booking_owner_required' USING ERRCODE='42501';END IF;
 RETURN pawpal_private.booking_staff_request_json(p_id);
END $$;
REVOKE ALL ON FUNCTION public.own_booking_staff_request(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.own_booking_staff_request(uuid) TO authenticated;
DO $$ DECLARE src text;BEGIN
 src:=pg_get_functiondef('public.guest_booking_receipt(text,uuid)'::regprocedure);
 IF position('booking_staff_request_json' IN src)=0 THEN src:=replace(src,' RETURN result;',$new$ RETURN result||jsonb_build_object('staff_request',pawpal_private.booking_staff_request_json(p_request));$new$);EXECUTE src;END IF;
 src:=pg_get_functiondef('public.own_service_booking_summary()'::regprocedure);
 IF position('staff_request' IN src)=0 THEN src:=replace(src,$old$'id',a.id,'total',t.total_price,$old$,$new$'id',a.id,'total',t.total_price,'staff_request',pawpal_private.booking_staff_request_json(a.id),$new$);EXECUTE src;END IF;
END $$;

CREATE OR REPLACE FUNCTION pawpal_private.validate_staff_proposal(p_id uuid,p_staff uuid,p_start timestamptz)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
#variable_conflict use_variable
DECLARE a public.appointment;line public.appointment_item;choice jsonb;details jsonb;ends timestamptz;hours jsonb;cfg jsonb;local_start timestamp;local_end timestamp;weight numeric;prices integer;price numeric;
BEGIN
 SELECT * INTO a FROM public.appointment WHERE id=p_id;
 IF a.id IS NULL OR a.appointment_status NOT IN('pending','confirmed') OR p_start IS NULL OR p_start<=clock_timestamp()+interval '2 hours' OR p_start>now()+interval '90 days' THEN RAISE EXCEPTION 'invalid_staff_proposal' USING ERRCODE='PT409';END IF;
 SELECT * INTO line FROM public.appointment_item WHERE appointment_id=p_id AND is_primary;
 details:=pawpal_private.booking_request_details(p_id,p_start);
 SELECT v INTO choice FROM jsonb_array_elements(pawpal_private.booking_staff_choices(a.customer_id,details,p_id)) v WHERE v->>'id'=p_staff::text;
 IF choice IS NULL OR choice->>'source'<>'scheduled' THEN RAISE EXCEPTION 'requested_staff_schedule_required' USING ERRCODE='PT409';END IF;
 SELECT w.weight INTO weight FROM public.pet_current_weight w WHERE pet_id=a.pet_id;
 SELECT count(*),min(unit_price) INTO prices,price FROM public.service_price_matrix WHERE service_id=line.service_id AND status='active' AND effective_from<=p_start AND (effective_to IS NULL OR effective_to>p_start)
  AND weight>=weight_from AND (weight_to IS NULL OR weight<weight_to OR weight_to_inclusive AND weight=weight_to);
 IF prices<>1 OR price IS DISTINCT FROM line.unit_price OR pawpal_private.catalog_duration(line.service_id,weight,p_start) IS DISTINCT FROM line.duration_minutes THEN RAISE EXCEPTION 'booking_price_changed_requires_review' USING ERRCODE='PT409';END IF;
 IF EXISTS(SELECT 1 FROM public.appointment_item i LEFT JOIN public.service_addon ad ON ad.id=i.service_addon_id WHERE i.appointment_id=p_id AND i.status<>'cancelled' AND i.service_addon_id IS NOT NULL AND (ad.status IS DISTINCT FROM 'active' OR ad.price IS DISTINCT FROM i.unit_price OR ad.estimated_duration IS DISTINCT FROM i.duration_minutes)) THEN RAISE EXCEPTION 'booking_price_changed_requires_review' USING ERRCODE='PT409';END IF;
 ends:=p_start+(a.scheduled_end_at-a.scheduled_start_at);
 local_start:=p_start AT TIME ZONE 'Asia/Bangkok';local_end:=ends AT TIME ZONE 'Asia/Bangkok';
 SELECT setting_value::jsonb INTO cfg FROM public.pawpal_setting WHERE setting_key='system_config';
 hours:=cfg->'operatingHours'->CASE WHEN extract(isodow FROM local_start) IN(6,7) THEN 'weekend' ELSE 'weekday' END;
 IF hours->>'open' IS NULL OR local_start::time<(hours->>'open')::time OR local_end::date<>local_start::date OR local_end::time>(hours->>'close')::time THEN RAISE EXCEPTION 'outside_operating_hours' USING ERRCODE='PT409';END IF;
 IF (SELECT count(*) FROM public.appointment b WHERE b.id<>p_id AND b.appointment_status NOT IN('completed','cancelled','no_show','expired','da_huy','da_hoan_tat','vang_mat') AND b.scheduled_start_at<ends AND b.scheduled_end_at>p_start)
   +(SELECT count(*) FROM pawpal_private.member_booking_hold h WHERE h.customer_id<>a.customer_id AND h.expires_at>clock_timestamp() AND h.starts<ends AND h.ends>p_start)>=coalesce((cfg->'bookingPolicy'->>'slotCapacityMax')::integer,0) THEN RAISE EXCEPTION 'booking_slot_full' USING ERRCODE='PT409';END IF;
 RETURN ends;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.validate_staff_proposal(uuid,uuid,timestamptz) FROM PUBLIC,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.propose_booking_staff(p_id uuid,p_revision timestamptz,p_staff uuid,p_start timestamptz,p_note text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE a public.appointment;ends timestamptz;
BEGIN
 IF NOT pawpal_private.has_permission('appointment.write') OR NOT pawpal_private.has_permission('audit_log.write') THEN RAISE EXCEPTION 'booking_write_forbidden' USING ERRCODE='42501';END IF;
 PERFORM pg_advisory_xact_lock(820068);
 SELECT * INTO a FROM public.appointment WHERE id=p_id FOR UPDATE;
 IF a.requested_staff_id IS NULL OR p_revision IS NULL OR a.updated_at<>p_revision THEN RAISE EXCEPTION 'booking_changed_reload_required' USING ERRCODE='PT409';END IF;
 IF coalesce(length(btrim(p_note)),0) NOT BETWEEN 3 AND 2000 THEN RAISE EXCEPTION 'invalid_reason';END IF;
 ends:=pawpal_private.validate_staff_proposal(p_id,p_staff,p_start);
 UPDATE public.appointment SET proposal_staff_id=p_staff,proposal_start_at=p_start,proposal_end_at=ends,proposal_created_at=clock_timestamp(),staff_confirmation_status='awaiting_customer' WHERE id=p_id;
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) SELECT id,'BOOKING_STAFF_PROPOSE','appointment',p_id,jsonb_build_object('staff_id',p_staff,'start_at',p_start,'note',p_note)::text FROM public.staff WHERE auth_user_id=auth.uid();
 RETURN p_id;
END $$;
REVOKE ALL ON FUNCTION public.propose_booking_staff(uuid,timestamptz,uuid,timestamptz,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.propose_booking_staff(uuid,timestamptz,uuid,timestamptz,text) TO authenticated;

CREATE OR REPLACE FUNCTION pawpal_private.respond_booking_staff_request(p_id uuid,p_revision timestamptz,p_accept boolean)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE a public.appointment;ends timestamptz;
BEGIN
 PERFORM pg_advisory_xact_lock(820068);
 SELECT * INTO a FROM public.appointment WHERE id=p_id FOR UPDATE;
 IF p_accept IS NULL OR a.staff_confirmation_status<>'awaiting_customer' OR a.proposal_created_at IS NULL OR p_revision IS NULL OR a.proposal_created_at<>p_revision THEN RAISE EXCEPTION 'booking_changed_reload_required' USING ERRCODE='PT409';END IF;
 IF a.appointment_status NOT IN('pending','confirmed') THEN RAISE EXCEPTION 'invalid_staff_proposal' USING ERRCODE='PT409';END IF;
 IF p_accept THEN
  ends:=pawpal_private.validate_staff_proposal(p_id,a.proposal_staff_id,a.proposal_start_at);
  IF ends<>a.proposal_end_at THEN RAISE EXCEPTION 'booking_changed_reload_required' USING ERRCODE='PT409';END IF;
  UPDATE public.appointment SET requested_staff_id=a.proposal_staff_id,staff_id=a.proposal_staff_id,scheduled_start_at=a.proposal_start_at,scheduled_end_at=ends,staff_confirmation_status='confirmed',appointment_status='confirmed',proposal_staff_id=NULL,proposal_start_at=NULL,proposal_end_at=NULL,proposal_created_at=NULL WHERE id=p_id;
 ELSE
  UPDATE public.appointment SET staff_confirmation_status=CASE WHEN staff_id IS NULL THEN 'pending' ELSE 'confirmed' END,proposal_staff_id=NULL,proposal_start_at=NULL,proposal_end_at=NULL,proposal_created_at=NULL WHERE id=p_id;
 END IF;
 INSERT INTO public.audit_log(action,entity_name,entity_id,description) VALUES('CUSTOMER_BOOKING_STAFF_RESPONSE','appointment',p_id,jsonb_build_object('accepted',p_accept,'proposal_revision',p_revision)::text);
 RETURN p_id;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.respond_booking_staff_request(uuid,timestamptz,boolean) FROM PUBLIC,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.respond_own_booking_staff_request(p_id uuid,p_revision timestamptz,p_accept boolean)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.appointment a WHERE a.id=p_id AND pawpal_private.owns_customer(a.customer_id)) OR EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid()) THEN RAISE EXCEPTION 'booking_owner_required' USING ERRCODE='42501';END IF;
 RETURN pawpal_private.respond_booking_staff_request(p_id,p_revision,p_accept);
END $$;
CREATE OR REPLACE FUNCTION public.respond_guest_booking_staff_request(p_hash text,p_id uuid,p_revision timestamptz,p_accept boolean)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE s public.guest_session;
BEGIN
 s:=pawpal_private.require_guest_booking_session(p_hash);
 PERFORM public.guest_booking_receipt(p_hash,p_id);
 RETURN pawpal_private.respond_booking_staff_request(p_id,p_revision,p_accept);
END $$;
REVOKE ALL ON FUNCTION public.respond_own_booking_staff_request(uuid,timestamptz,boolean),public.respond_guest_booking_staff_request(text,uuid,timestamptz,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.respond_own_booking_staff_request(uuid,timestamptz,boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_guest_booking_staff_request(text,uuid,timestamptz,boolean) TO service_role;
DO $$ DECLARE src text;BEGIN
 src:=pg_get_functiondef('pawpal_private.audit_actor()'::regprocedure);
 IF position('CUSTOMER_BOOKING_STAFF_RESPONSE' IN src)=0 THEN
  src:=regexp_replace(src,'BEGIN',$new$BEGIN
 IF NEW.action='CUSTOMER_BOOKING_STAFF_RESPONSE' AND NEW.entity_name='appointment' AND EXISTS(SELECT 1 FROM public.appointment a WHERE a.id=NEW.entity_id AND pawpal_private.owns_customer(a.customer_id)) THEN RETURN NEW;END IF;
$new$);EXECUTE src;
 END IF;
 src:=pg_get_functiondef('public.save_admin_staff_schedule(uuid,uuid,timestamptz,jsonb)'::regprocedure);
 IF position('pg_advisory_xact_lock(820068)' IN src)=0 THEN src:=regexp_replace(src,'BEGIN',E'BEGIN\n PERFORM pg_advisory_xact_lock(820068);');EXECUTE src;END IF;
 src:=pg_get_functiondef('public.get_admin_service_booking_page(jsonb,integer,boolean)'::regprocedure);
 IF position('coalesce(a.staff_id,a.requested_staff_id)' IN src)=0 THEN
  IF position('LEFT JOIN public.staff staff ON staff.id=a.staff_id' IN src)=0 THEN RAISE EXCEPTION 'Unexpected Admin staff filter definition';END IF;
  EXECUTE replace(src,'LEFT JOIN public.staff staff ON staff.id=a.staff_id','LEFT JOIN public.staff staff ON staff.id=coalesce(a.staff_id,a.requested_staff_id)');
 END IF;
END $$;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='staff_recurring_schedule') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_recurring_schedule;END IF;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
