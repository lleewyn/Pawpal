BEGIN;
CREATE OR REPLACE FUNCTION public.get_admin_service_booking_page(p_filters jsonb DEFAULT '{}'::jsonb, p_page integer DEFAULT 1, p_export boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE result jsonb;q text:=public.admin_sales_search_text(btrim(coalesce(p_filters->>'query','')));
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('customer.read') OR NOT pawpal_private.has_permission('appointment.read') OR NOT pawpal_private.has_permission('appointment_item.read') OR NOT pawpal_private.has_permission('customer_profile.read') OR NOT pawpal_private.has_permission('customer_phone.read') OR NOT pawpal_private.has_permission('pet_profile.read') OR NOT pawpal_private.has_permission('pet_breed.read') OR NOT pawpal_private.has_permission('staff.read') OR NOT pawpal_private.has_permission('service.read') OR NOT pawpal_private.has_permission('service_category.read') THEN RAISE EXCEPTION 'booking_page_forbidden' USING ERRCODE='42501';END IF;
 IF p_filters IS NULL OR jsonb_typeof(p_filters)<>'object' OR length(p_filters::text)>4000 OR length(q)>200 OR p_page IS NULL OR p_page<1 OR p_page>10000000 OR p_export IS NULL THEN RAISE EXCEPTION 'invalid_booking_page' USING ERRCODE='22023';END IF;
 IF p_export AND (NOT pawpal_private.has_permission('payment.read') OR NOT pawpal_private.has_permission('refund_transaction.read') OR NOT pawpal_private.has_permission('appointment_adjustment.read')) THEN RAISE EXCEPTION 'booking_export_forbidden' USING ERRCODE='42501';END IF;
 WITH base AS MATERIALIZED (
 SELECT a.id,a.appointment_code code,a.appointment_status status,a.scheduled_start_at starts_at,a.created_at,
 coalesce(nullif(profile.full_name,''),'Chưa cập nhật tên khách hàng') customer_name,coalesce(phone.phone_number,owner.unverified_contact_phone,'—') phone,
 coalesce(pet.pet_name,'Pet cưng') pet_name,coalesce(breed.breed_name,'Thú cưng') breed_name,coalesce(item.name_snapshot,'Chưa có thông tin dịch vụ') service_name,
 CASE WHEN position('@' in coalesce(staff.full_name,''))=0 THEN nullif(staff.full_name,'') ELSE NULL END staff_name,
 CASE WHEN category.category_code ILIKE '%HOTEL%' OR item.name_snapshot ~* 'phòng|hotel|suite' THEN 'Hotel' WHEN category.category_code ILIKE '%TAXI%' OR item.name_snapshot ~* 'taxi|đưa đón' THEN 'Taxi' ELSE 'Spa' END category,
 ((btrim(coalesce(pet.allergy,''))<>'' AND btrim(pet.allergy)!~* '^(không|none)$') OR (btrim(coalesce(pet.routine,''))<>'' AND btrim(pet.routine)!~* '^(không|none)$') OR lower(coalesce(a.note,'')) LIKE '%dị ứng%') pet_alert,
 (a.appointment_status IN ('pending','confirmed') AND date_trunc('minute',a.scheduled_start_at) BETWEEN now() AND now()+interval '1 hour') upcoming,
 coalesce(item.duration_minutes,60) duration
 FROM public.appointment a LEFT JOIN public.customer owner ON owner.id=a.customer_id LEFT JOIN public.customer_profile profile ON profile.customer_id=a.customer_id LEFT JOIN public.customer_phone phone ON phone.customer_id=a.customer_id AND phone.is_primary
 LEFT JOIN public.pet_profile pet ON pet.id=a.pet_id LEFT JOIN public.pet_breed breed ON breed.id=pet.breed_id LEFT JOIN public.staff staff ON staff.id=a.staff_id
 LEFT JOIN LATERAL (SELECT i.name_snapshot,i.duration_minutes,i.service_id FROM public.appointment_item i WHERE i.appointment_id=a.id AND i.is_primary ORDER BY (i.status='cancelled'),i.id LIMIT 1) item ON true
 LEFT JOIN public.service s ON s.id=item.service_id LEFT JOIN public.service_category category ON category.id=s.category_id
 ), matched AS MATERIALIZED (
 SELECT * FROM base WHERE (q='' OR strpos(public.admin_sales_search_text(code),q)>0 OR strpos(public.admin_sales_search_text(customer_name),q)>0 OR strpos(public.admin_sales_search_text(phone),q)>0 OR strpos(public.admin_sales_search_text(pet_name),q)>0 OR strpos(public.admin_sales_search_text(breed_name),q)>0 OR strpos(public.admin_sales_search_text(service_name),q)>0 OR strpos(public.admin_sales_search_text(staff_name),q)>0)
 AND (coalesce(p_filters->>'category','ALL')='ALL' OR category=p_filters->>'category')
 AND (coalesce(p_filters->>'status','ALL')='ALL' OR status=p_filters->>'status')
 AND (coalesce(p_filters->>'staff','ALL')='ALL' OR (p_filters->>'staff'='UNASSIGNED' AND staff_name IS NULL) OR staff_name=p_filters->>'staff')
 AND (NOT coalesce((p_filters->>'upcoming')::boolean,false) OR upcoming)
 AND (NOT coalesce((p_filters->>'allergy')::boolean,false) OR pet_alert)
 AND (NOT coalesce((p_filters->>'sla')::boolean,false) OR (status='pending' AND created_at<=now()-interval '16 minutes') OR (status='confirmed' AND staff_name IS NULL) OR (status='in_progress' AND now()>date_trunc('minute',starts_at)+duration*interval '1 minute'))
 ), meta AS (SELECT count(*) total,least(p_page,greatest(1,ceil(count(*)/10.0)::integer)) page FROM matched), selected AS (
 SELECT id,created_at FROM matched ORDER BY created_at DESC,id OFFSET ((SELECT page FROM meta)-1)*10 LIMIT 10
 ), upcoming AS (SELECT * FROM base WHERE upcoming ORDER BY starts_at,id LIMIT 10)
 SELECT jsonb_build_object('total',(SELECT total FROM meta),'page',(SELECT page FROM meta),'ids',coalesce((SELECT jsonb_agg(id ORDER BY created_at DESC,id) FROM selected),'[]'::jsonb),
 'upcoming',coalesce((SELECT jsonb_agg(jsonb_build_object('id',code,'dbId',id,'customerName',customer_name,'petName',pet_name,'time',to_char(starts_at AT TIME ZONE 'Asia/Bangkok','HH24:MI'),'status',status,'staff',staff_name) ORDER BY starts_at,id) FROM upcoming),'[]'::jsonb),
 'staffOptions',coalesce((SELECT jsonb_agg(staff_name ORDER BY staff_name) FROM (SELECT DISTINCT staff_name FROM base WHERE staff_name IS NOT NULL) x),'[]'::jsonb),
 'counts',jsonb_build_object('statTotalBookings',(SELECT count(*) FROM base WHERE (starts_at AT TIME ZONE 'Asia/Bangkok')::date=(now() AT TIME ZONE 'Asia/Bangkok')::date),'statUpcomingBookings',(SELECT count(*) FROM base WHERE upcoming),
 'statPendingBookings',(SELECT count(*) FROM base WHERE status='pending' AND (starts_at AT TIME ZONE 'Asia/Bangkok')::date=(now() AT TIME ZONE 'Asia/Bangkok')::date),'statInProgressBookings',(SELECT count(*) FROM base WHERE status='in_progress' AND (starts_at AT TIME ZONE 'Asia/Bangkok')::date=(now() AT TIME ZONE 'Asia/Bangkok')::date),
 'statCompletedBookings',(SELECT count(*) FROM base WHERE status='completed' AND (starts_at AT TIME ZONE 'Asia/Bangkok')::date=(now() AT TIME ZONE 'Asia/Bangkok')::date),'statCancelledBookings',(SELECT count(*) FROM base WHERE status='cancelled' AND (starts_at AT TIME ZONE 'Asia/Bangkok')::date=(now() AT TIME ZONE 'Asia/Bangkok')::date)),
 'exportRows',CASE WHEN p_export THEN coalesce((SELECT jsonb_agg(jsonb_build_array(b.code,to_char(b.starts_at AT TIME ZONE 'Asia/Bangkok','HH24:MI'),to_char(b.starts_at AT TIME ZONE 'Asia/Bangkok','YYYY-MM-DD'),b.customer_name,b.phone,b.pet_name,b.service_name,coalesce(b.staff_name,'Chưa phân công'),t.total_price,
 CASE WHEN pay.collected>0 AND pay.collected>=t.total_price THEN 'Đã thanh toán' WHEN pay.collected>0 THEN 'Thu một phần' ELSE 'Chưa thu' END,
 CASE b.status WHEN 'pending' THEN 'Chờ xác nhận' WHEN 'confirmed' THEN 'Đã xác nhận' WHEN 'in_progress' THEN 'Đang thực hiện' WHEN 'completed' THEN 'Đã hoàn thành' WHEN 'cancelled' THEN 'Đã hủy' WHEN 'no_show' THEN 'Không đến' ELSE b.status END) ORDER BY b.created_at DESC,b.id)
 FROM matched b JOIN public.appointment_totals t ON t.appointment_id=b.id LEFT JOIN LATERAL (SELECT sum(p.amount-coalesce((SELECT sum(r.refunded_amount) FROM public.refund_transaction r WHERE r.payment_id=p.id AND r.refund_status='succeeded'),0)) collected FROM public.payment p WHERE p.appointment_id=b.id AND p.transaction_status='succeeded') pay ON true),'[]'::jsonb) ELSE NULL END) INTO result;
 RETURN result;
END $function$
;
NOTIFY pgrst,'reload schema';
COMMIT;
