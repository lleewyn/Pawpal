-- Admin-only contact search; preserve limits, invoker security and existing grants.
BEGIN;
CREATE OR REPLACE FUNCTION public.search_admin_sales_customers(p_query text DEFAULT '') RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=pg_catalog,public AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('customer.read') OR NOT pawpal_private.has_permission('customer_profile.read') OR NOT pawpal_private.has_permission('customer_phone.read') OR NOT pawpal_private.has_permission('customer_membership.read') OR NOT pawpal_private.has_permission('membership_tier.read') THEN RAISE EXCEPTION 'sales_customer_search_forbidden' USING ERRCODE='42501';END IF;
 IF p_query IS NULL OR length(p_query)>200 THEN RAISE EXCEPTION 'invalid_search' USING ERRCODE='22023';END IF;
 RETURN (SELECT coalesce(jsonb_agg(to_jsonb(c)),'[]'::jsonb) FROM (
 SELECT c.id,p.full_name name,coalesce(phone.phone_number,c.unverified_contact_phone,'') phone,t.tier_name rank,(phone.phone_number IS NULL AND c.unverified_contact_phone IS NOT NULL) "phoneUnverified",CASE WHEN c.auth_user_id IS NULL THEN 'guest' ELSE 'member' END "customerType"
 FROM public.customer c LEFT JOIN public.customer_profile p ON p.customer_id=c.id
 LEFT JOIN public.customer_phone phone ON phone.customer_id=c.id AND phone.is_primary
 LEFT JOIN public.customer_membership m ON m.customer_id=c.id LEFT JOIN public.membership_tier t ON t.id=m.membership_tier_id
 WHERE c.customer_status='active' AND (btrim(p_query)='' OR strpos(public.admin_sales_search_text(coalesce(p.full_name,'')||' '||coalesce(phone.phone_number,c.unverified_contact_phone,'')||' '||c.customer_code),public.admin_sales_search_text(btrim(p_query)))>0)
 ORDER BY c.created_at DESC,c.id LIMIT 10) c);
END $$;

CREATE OR REPLACE FUNCTION public.get_admin_sales_order_page(p_filters jsonb DEFAULT '{}'::jsonb,p_page integer DEFAULT 1)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE result jsonb; q text:=public.admin_sales_search_text(btrim(coalesce(p_filters->>'query','')));
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('customer.read') OR NOT pawpal_private.has_permission('sales_order.read') OR NOT pawpal_private.has_permission('sales_order_detail.read') OR NOT pawpal_private.has_permission('payment.read') OR NOT pawpal_private.has_permission('refund_transaction.read') OR NOT pawpal_private.has_permission('customer_profile.read') OR NOT pawpal_private.has_permission('customer_phone.read') OR NOT pawpal_private.has_permission('return_request.read') OR NOT pawpal_private.has_permission('voucher_redemption.read') OR NOT pawpal_private.has_permission('payment_method_config.read') THEN RAISE EXCEPTION 'sales_page_forbidden' USING ERRCODE='42501';END IF;
 IF p_page IS NULL OR p_page<1 OR p_page>10000000 OR p_filters IS NULL OR jsonb_typeof(p_filters)<>'object' OR length(p_filters::text)>4000 OR length(q)>200 THEN RAISE EXCEPTION 'invalid_sales_page' USING ERRCODE='22023';END IF;
 WITH payments AS MATERIALIZED (
 SELECT p.order_id,sum(p.amount) gross,sum(p.amount-coalesce(r.amount,0)) collected
 FROM public.payment p LEFT JOIN LATERAL (SELECT sum(refunded_amount) amount FROM public.refund_transaction WHERE payment_id=p.id AND refund_status='succeeded') r ON true
 WHERE p.order_id IS NOT NULL AND p.transaction_status='succeeded' GROUP BY p.order_id
 ), base AS MATERIALIZED (
 SELECT o.id,o.created_at,
 CASE WHEN o.order_status IN ('draft','pending') THEN 'pending' WHEN o.order_status IN ('packing','confirmed') THEN 'confirmed' WHEN o.order_status IN ('shipped','shipping') THEN 'shipping' WHEN o.order_status IN ('delivered','completed') THEN 'completed' ELSE o.order_status END status,
 coalesce(t.total_amount,0) total,coalesce(p.collected,0) collected,
 CASE WHEN coalesce(p.collected,0)>=t.total_amount AND t.total_amount>0 THEN 'paid' WHEN p.collected>0 THEN 'partial' WHEN p.gross>0 AND p.gross-p.collected>=p.gross THEN 'refunded' ELSE 'unpaid' END pay_status,
 CASE WHEN m.name ~* 'tiền mặt' THEN 'cash' WHEN m.name ~* 'chuyển khoản|VietQR' THEN 'bank_transfer' WHEN m.name ~* 'MoMo' THEN 'momo' WHEN m.name ~* 'VNPay' THEN 'vnpay' ELSE 'unknown' END method,
 EXISTS(SELECT 1 FROM public.return_request r WHERE r.sales_order_id=o.id) has_return,
 EXISTS(SELECT 1 FROM public.return_request r WHERE r.sales_order_id=o.id AND r.request_status IN ('pending','approved')) open_return,
 (q='' OR strpos(public.admin_sales_search_text(coalesce(o.order_code,'')||' '||coalesce(o.tracking_code,'')||' '||coalesce((SELECT full_name FROM public.customer_profile WHERE customer_id=o.customer_id),'')||' '||coalesce(o.receiver_name_snapshot,'')||' '||coalesce((SELECT phone_number FROM public.customer_phone WHERE customer_id=o.customer_id AND is_primary LIMIT 1),(SELECT unverified_contact_phone FROM public.customer WHERE id=o.customer_id),'')||' '||coalesce(o.receiver_phone_snapshot,'')),q)>0 OR EXISTS(SELECT 1 FROM public.sales_order_detail d WHERE d.order_id=o.id AND strpos(public.admin_sales_search_text(d.product_name_snapshot||' '||d.sku_snapshot),q)>0)) query_match
 FROM public.sales_order o JOIN public.sales_order_totals t ON t.order_id=o.id LEFT JOIN payments p ON p.order_id=o.id
 LEFT JOIN LATERAL (SELECT pm.name FROM public.payment entry JOIN public.payment_method_config pm ON pm.id=entry.payment_method_config_id WHERE entry.order_id=o.id AND entry.transaction_status='succeeded' ORDER BY entry.id LIMIT 1) m ON true
 ), matched AS MATERIALIZED (
 SELECT * FROM base b WHERE query_match
 AND (coalesce(p_filters->>'status','ALL')='ALL' OR status=CASE p_filters->>'status' WHEN 'delivered' THEN 'completed' ELSE p_filters->>'status' END)
 AND (coalesce(p_filters->>'payment','ALL')='ALL' OR method=p_filters->>'payment')
 AND (coalesce(p_filters->>'payStatus','ALL')='ALL' OR pay_status=p_filters->>'payStatus')
 AND (NOT coalesce((p_filters->>'complaint')::boolean,false) OR status='returned' OR has_return)
 AND (NOT coalesce((p_filters->>'overdue')::boolean,false) OR (status='pending' AND created_at<=now()-interval '31 minutes'))
 AND (NOT coalesce((p_filters->>'urgent')::boolean,false) OR (status='pending' AND created_at<=now()-interval '15 minutes') OR (status='confirmed' AND created_at<=now()-interval '4 hours') OR (status<>'pending' AND (status='returned' OR open_return)))
 ), meta AS (SELECT count(*) total,least(p_page,greatest(1,ceil(count(*)/10.0)::integer)) page FROM matched), selected AS (
 SELECT id,created_at FROM matched ORDER BY created_at DESC,id OFFSET ((SELECT page FROM meta)-1)*10 LIMIT 10
 )
 SELECT jsonb_build_object('total',(SELECT total FROM meta),'page',(SELECT page FROM meta),'ids',coalesce((SELECT jsonb_agg(id ORDER BY created_at DESC,id) FROM selected),'[]'::jsonb),
 'counts',jsonb_build_object('statTotalOrders',(SELECT count(*) FROM base WHERE (created_at AT TIME ZONE 'Asia/Bangkok')::date=(now() AT TIME ZONE 'Asia/Bangkok')::date),'statPendingOrders',(SELECT count(*) FROM base WHERE status='pending'),'statPreparingOrders',(SELECT count(*) FROM base WHERE status='confirmed'),'statShippingOrders',(SELECT count(*) FROM base WHERE status='shipping'),'statCompletedOrders',(SELECT count(*) FROM base WHERE status='completed'),'statCancelledOrders',(SELECT count(*) FROM base WHERE status IN ('cancelled','returned')))) INTO result;
 RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.get_admin_service_booking_page(p_filters jsonb DEFAULT '{}'::jsonb,p_page integer DEFAULT 1,p_export boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=pg_catalog,public AS $$
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
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
