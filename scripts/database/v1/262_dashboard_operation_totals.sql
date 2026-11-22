-- Full operational KPI totals, independent of bounded browser detail reads.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='20s';
CREATE OR REPLACE FUNCTION public.admin_dashboard_operation_totals(p_from date,p_to date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public SET statement_timeout='8s' AS $$
DECLARE starts timestamptz;ends timestamptz;today_start timestamptz;now_at timestamptz:=statement_timestamp();
 can_appointment boolean;can_assignment boolean;can_order boolean;can_staff boolean;can_stock boolean;can_ticket boolean;result jsonb;
BEGIN
 PERFORM pawpal_private.dashboard_require(ARRAY[]::text[]);
 IF p_from IS NULL OR p_to IS NULL OR NOT isfinite(p_from) OR NOT isfinite(p_to) OR p_to<p_from OR p_to-p_from>91 THEN RAISE EXCEPTION 'invalid_dashboard_period' USING ERRCODE='22023';END IF;
 starts:=p_from::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh';ends:=(p_to+1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh';
 today_start:=date_trunc('day',now_at AT TIME ZONE 'Asia/Ho_Chi_Minh') AT TIME ZONE 'Asia/Ho_Chi_Minh';
 can_appointment:=pawpal_private.has_permission('appointment.read');
 can_assignment:=can_appointment AND pawpal_private.has_permission('appointment_item.read');
 can_order:=pawpal_private.has_permission('sales_order.read');
 can_staff:=pawpal_private.has_permission('staff.read') AND pawpal_private.has_permission('staff_schedule.read');
 can_stock:=can_order AND pawpal_private.has_permission('sales_order_detail.read') AND pawpal_private.has_permission('inventory.read') AND pawpal_private.has_permission('stock_reservation.read') AND pawpal_private.has_permission('product_variant.read') AND pawpal_private.has_permission('product.read');
 can_ticket:=pawpal_private.has_permission('support_ticket.read');
 WITH assignments AS(
  SELECT a.id,lower(btrim(coalesce(a.appointment_status,''))) status,a.scheduled_start_at,
   a.staff_id IS NOT NULL OR EXISTS(SELECT 1 FROM public.appointment_item i WHERE i.appointment_id=a.id AND i.staff_id IS NOT NULL AND lower(btrim(coalesce(i.status,''))) NOT IN('cancelled','canceled','da_huy')) assigned
  FROM public.appointment a WHERE can_assignment AND lower(btrim(coalesce(a.appointment_status,''))) IN('pending','cho_xac_nhan','confirmed','da_xac_nhan','checked_in')
 ),pending AS(
  SELECT count(*) FILTER(WHERE status IN('pending','cho_xac_nhan')) pending,
   count(*) FILTER(WHERE status IN('confirmed','da_xac_nhan','checked_in') AND NOT assigned AND scheduled_start_at<=now_at+interval '24 hours') unassigned FROM assignments
 ),valid_schedules AS MATERIALIZED(
  SELECT sch.staff_id,sch.start_at,sch.end_at FROM public.staff_schedule sch LEFT JOIN public.staff s ON s.id=sch.staff_id
  WHERE can_staff AND lower(btrim(sch.schedule_status))='active' AND lower(btrim(sch.availability_status))='available'
   AND (s.id IS NULL OR lower(btrim(s.employment_status))='active') AND sch.end_at>sch.start_at
   AND (sch.start_at<ends AND sch.end_at>starts OR sch.start_at<=now_at AND sch.end_at>now_at)
 ),stock AS MATERIALIZED(
  SELECT i.product_variant_id,i.minimum_stock,
   i.quantity_in_stock-greatest(0,coalesce((SELECT sum(r.quantity) FROM public.stock_reservation r WHERE r.product_variant_id=i.product_variant_id AND lower(btrim(r.status))='active' AND r.expires_at>now_at),0)) available,
   greatest(0,coalesce((SELECT sum(d.quantity) FROM public.sales_order_detail d JOIN public.sales_order o ON o.id=d.order_id WHERE d.product_variant_id=i.product_variant_id AND o.created_at>=now_at-interval '30 days' AND lower(btrim(coalesce(o.order_status,''))) NOT IN('draft','cancelled','canceled','da_huy','returned','da_tra_hang')),0)) sold
  FROM public.inventory i JOIN public.product_variant v ON v.id=i.product_variant_id JOIN public.product p ON p.id=v.product_id
  WHERE can_stock AND lower(btrim(coalesce(v.status,''))) NOT IN('inactive','discontinued','ngung_ban') AND lower(btrim(coalesce(p.status,''))) NOT IN('inactive','discontinued','ngung_ban')
 ),stock_counts AS(
  SELECT count(*) FILTER(WHERE available<=0) out,
   count(*) FILTER(WHERE available>0 AND (minimum_stock>0 AND available<=minimum_stock OR sold>0 AND available<sold*7/30.0)) high FROM stock
 ),tickets AS(
  SELECT count(*) total,count(*) FILTER(WHERE first_response_at IS NULL) waiting FROM public.support_ticket
  WHERE can_ticket AND lower(btrim(coalesce(status,''))) NOT IN('closed','resolved','completed','rejected','da_dong','da_giai_quyet','tu_choi')
 )
 SELECT jsonb_build_object('as_of',now_at,'today',today_start,'from',starts,'to',ends,'metrics',jsonb_build_object(
  'todayAppointments',CASE WHEN can_appointment THEN jsonb_build_object('available',true,'value',(SELECT count(*) FROM public.appointment WHERE scheduled_start_at>=today_start AND scheduled_start_at<today_start+interval '1 day' AND lower(btrim(coalesce(appointment_status,''))) NOT IN('cancelled','canceled','da_huy','expired','da_het_han','dang_giu_cho'))) ELSE jsonb_build_object('available',false) END,
  'pendingAppointments',CASE WHEN can_assignment THEN (SELECT jsonb_build_object('available',true,'value',pending+unassigned,'pending',pending,'unassigned',unassigned) FROM pending) ELSE jsonb_build_object('available',false) END,
  'pendingOrders',CASE WHEN can_order THEN jsonb_build_object('available',true,'value',(SELECT count(*) FROM public.sales_order WHERE lower(btrim(coalesce(order_status,''))) IN('pending','draft','cho_xac_nhan','confirmed','packing','dang_dong_goi','da_xac_nhan'))) ELSE jsonb_build_object('available',false) END,
  'staffOnShift',CASE WHEN can_staff THEN jsonb_build_object('available',true,'value',(SELECT count(DISTINCT staff_id) FROM valid_schedules WHERE start_at<ends AND end_at>starts),'on_shift_now',(SELECT count(DISTINCT staff_id) FROM valid_schedules WHERE start_at<=now_at AND end_at>now_at)) ELSE jsonb_build_object('available',false) END,
  'lowStock',CASE WHEN can_stock THEN (SELECT jsonb_build_object('available',true,'value',out+high,'out',out,'high',high) FROM stock_counts) ELSE jsonb_build_object('available',false) END,
  'openTickets',CASE WHEN can_ticket THEN (SELECT jsonb_build_object('available',true,'value',total,'waiting',waiting) FROM tickets) ELSE jsonb_build_object('available',false) END
 )) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.admin_dashboard_operation_totals(date,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_operation_totals(date,date) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
