-- Follow-up to M259: waiting age follows the reason for the alert.
-- A service overrunning its planned end must not be aged from its original start.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='20s';

CREATE OR REPLACE FUNCTION pawpal_private.dashboard_appointment_waiting(p_status text,p_created timestamptz,p_start timestamptz,p_end timestamptz,p_now timestamptz)
RETURNS numeric LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS $$
 SELECT CASE
  WHEN lower(p_status) IN('in_progress','processing','dang_thuc_hien') THEN
   CASE WHEN p_end<p_now THEN extract(epoch FROM p_now-p_end)/3600 END
  WHEN lower(p_status) IN('pending','cho_xac_nhan') AND (p_start IS NULL OR p_start>=p_now) THEN
   extract(epoch FROM p_now-p_created)/3600
  WHEN p_start<p_now THEN extract(epoch FROM p_now-p_start)/3600
 END
$$;
REVOKE ALL ON FUNCTION pawpal_private.dashboard_appointment_waiting(text,timestamptz,timestamptz,timestamptz,timestamptz) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.admin_dashboard_work_page(p_scope text DEFAULT 'all',p_kind text DEFAULT 'all',p_page integer DEFAULT 1)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public SET statement_timeout='8s' AS $$
DECLARE now_at timestamptz:=statement_timestamp();can_staff boolean;can_appointment boolean;can_order boolean;can_ticket boolean;can_return boolean;can_stock boolean;result jsonb;
BEGIN
 PERFORM pawpal_private.dashboard_require(ARRAY[]::text[]);
 IF p_scope IS NULL OR p_scope NOT IN('all','urgent','unassigned','older','recent') OR p_kind IS NULL OR p_kind NOT IN('all','appointment','order','ticket','return','stock','staff') OR p_page IS NULL OR p_page<1 OR p_page>100000 THEN RAISE EXCEPTION 'invalid_dashboard_filter' USING ERRCODE='22023';END IF;
 can_staff:=pawpal_private.has_permission('staff.read');
 can_appointment:=pawpal_private.has_permission('appointment.read') AND pawpal_private.has_permission('appointment_item.read');
 can_order:=pawpal_private.has_permission('sales_order.read');can_ticket:=pawpal_private.has_permission('support_ticket.read');
 can_return:=pawpal_private.has_permission('return_request.read') AND can_order;
 can_stock:=can_order AND pawpal_private.has_permission('sales_order_detail.read') AND pawpal_private.has_permission('inventory.read') AND pawpal_private.has_permission('stock_reservation.read') AND pawpal_private.has_permission('product_variant.read') AND pawpal_private.has_permission('product.read');
 WITH appointment_source AS (
  SELECT a.*,extract(epoch FROM now_at-a.created_at)/3600 waited,
   a.staff_id IS NOT NULL OR EXISTS(SELECT 1 FROM public.appointment_item WHERE appointment_id=a.id AND staff_id IS NOT NULL AND status NOT IN('cancelled','canceled','da_huy')) assigned
  FROM public.appointment a WHERE can_appointment AND lower(a.appointment_status) IN('pending','confirmed','checked_in','in_progress','processing','cho_xac_nhan','da_xac_nhan','dang_thuc_hien')
 ), raw AS (
  SELECT 'appointment' kind,a.id,a.appointment_code ref,
   CASE WHEN lower(a.appointment_status) IN('pending','cho_xac_nhan') AND (a.scheduled_start_at<=now_at+interval '1 hour' OR a.waited>0.5) OR lower(a.appointment_status) IN('confirmed','checked_in','da_xac_nhan') AND NOT a.assigned AND a.scheduled_start_at<=now_at+interval '1 hour' THEN 'urgent' ELSE 'warning' END severity,
   array_remove(ARRAY[
    CASE WHEN lower(a.appointment_status) IN('pending','cho_xac_nhan') THEN CASE WHEN a.scheduled_start_at<now_at THEN 'Đã qua giờ hẹn nhưng lịch vẫn chờ xác nhận' WHEN a.scheduled_start_at<=now_at+interval '1 hour' THEN 'Còn không quá 1 giờ tới giờ hẹn, chưa xác nhận' WHEN a.waited>0.5 THEN 'Chờ xác nhận quá 30 phút' WHEN a.waited>=0.25 THEN 'Chờ xác nhận từ 15 phút' END END,
    CASE WHEN lower(a.appointment_status) IN('confirmed','da_xac_nhan') AND a.scheduled_start_at<=now_at-interval '30 minutes' THEN 'Quá giờ hẹn 30 phút khách chưa đến' END,
    CASE WHEN lower(a.appointment_status) IN('confirmed','checked_in','da_xac_nhan') AND NOT a.assigned AND a.scheduled_start_at<=now_at+interval '24 hours' THEN 'Lịch đã xác nhận nhưng chưa phân công KTV' END,
    CASE WHEN lower(a.appointment_status) IN('in_progress','processing','dang_thuc_hien') AND a.scheduled_end_at<now_at THEN 'Đang phục vụ quá giờ kết thúc dự kiến' END
   ],NULL) reasons,
   pawpal_private.dashboard_appointment_waiting(a.appointment_status,a.created_at,a.scheduled_start_at,a.scheduled_end_at,now_at) waiting,
   NOT a.assigned unassigned,
   CASE WHEN NOT a.assigned THEN 'Chưa phân công' WHEN NOT can_staff THEN 'Đã phân công, chưa tải được tên' ELSE coalesce((SELECT string_agg(DISTINCT s.full_name,', ' ORDER BY s.full_name) FROM public.staff s WHERE s.id=a.staff_id OR EXISTS(SELECT 1 FROM public.appointment_item i WHERE i.appointment_id=a.id AND i.staff_id=s.id AND i.status NOT IN('cancelled','canceled','da_huy'))),'Đã phân công, chưa tải được tên') END owner,
   a.scheduled_start_at scheduled,a.scheduled_end_at due,NULL::uuid parent_id
  FROM appointment_source a
  UNION ALL
  SELECT 'order',o.id,o.order_code,CASE WHEN lower(o.order_status) IN('draft','pending','cho_xac_nhan') AND now_at-o.created_at>interval '30 minutes' THEN 'urgent' ELSE 'warning' END,
   ARRAY[CASE WHEN lower(o.order_status) IN('draft','pending','cho_xac_nhan') THEN CASE WHEN now_at-o.created_at>interval '30 minutes' THEN 'Đơn chờ xác nhận quá 30 phút' ELSE 'Đơn chờ xác nhận từ 15 phút' END WHEN clock.at IS NULL THEN 'Đơn đang chuẩn bị, chưa có mốc xác nhận để xác định thời gian chờ' ELSE 'Đơn đang chuẩn bị từ 4 giờ chưa giao' END],
   extract(epoch FROM now_at-CASE WHEN lower(o.order_status) IN('draft','pending','cho_xac_nhan') THEN o.created_at ELSE clock.at END)/3600,false,'Chưa có dữ liệu phân công',NULL::timestamptz,NULL::timestamptz,NULL::uuid
  FROM public.sales_order o LEFT JOIN LATERAL(SELECT occurred_at at FROM public.admin_dashboard_work_event e WHERE e.kind='order' AND e.record_id=o.id AND e.event_type<>'baseline' AND lower(e.new_status) IN('confirmed','packing','da_xac_nhan','dang_dong_goi') AND lower(coalesce(e.old_status,'')) NOT IN('confirmed','packing','da_xac_nhan','dang_dong_goi') ORDER BY occurred_at DESC,id DESC LIMIT 1) clock ON true
  WHERE can_order AND (lower(o.order_status) IN('draft','pending','cho_xac_nhan') AND o.created_at<=now_at-interval '15 minutes' OR lower(o.order_status) IN('confirmed','packing','da_xac_nhan','dang_dong_goi') AND (clock.at IS NULL OR clock.at<=now_at-interval '4 hours'))
  UNION ALL
  SELECT 'ticket',t.id,t.ticket_code,CASE WHEN t.sla_due_at<=now_at OR (lower(t.priority) IN('urgent','high','khan_cap','cao','khẩn cấp') AND t.first_response_at IS NULL AND t.created_at<=now_at-interval '4 hours') THEN 'urgent' ELSE 'warning' END,
   array_remove(ARRAY[CASE WHEN t.first_response_at IS NULL AND t.created_at<=now_at-interval '4 hours' THEN 'Chưa phản hồi khách quá 4 giờ' END,CASE WHEN t.sla_due_at IS NULL THEN 'Phiếu chưa có hạn giải quyết, cần kiểm tra SLA' WHEN t.sla_due_at<=now_at THEN 'Đã quá hạn giải quyết theo SLA của phiếu' END],NULL),
   extract(epoch FROM now_at-t.created_at)/3600,t.assigned_staff_id IS NULL,
   CASE WHEN t.assigned_staff_id IS NULL THEN 'Chưa phân công' WHEN can_staff THEN coalesce(s.full_name,'Đã phân công, chưa tải được tên') ELSE 'Đã phân công, chưa tải được tên' END,NULL::timestamptz,t.sla_due_at,NULL::uuid
  FROM public.support_ticket t LEFT JOIN public.staff s ON s.id=t.assigned_staff_id AND can_staff
  WHERE can_ticket AND pawpal_private.dashboard_record_open('ticket',t.status)
  UNION ALL
  SELECT 'return',r.id,coalesce(o.order_code,r.id::text),'warning',ARRAY['Yêu cầu đổi trả chưa xử lý xong quá 48 giờ'],extract(epoch FROM now_at-r.created_at)/3600,false,'Chưa có dữ liệu phân công',NULL::timestamptz,NULL::timestamptz,r.sales_order_id
  FROM public.return_request r LEFT JOIN public.sales_order o ON o.id=r.sales_order_id
  WHERE can_return AND pawpal_private.dashboard_record_open('return',r.request_status) AND r.created_at<=now_at-interval '48 hours'
  UNION ALL
  SELECT 'stock',v.id,coalesce(v.sku_variant,p.product_name),CASE WHEN stock.available<=0 THEN 'urgent' ELSE 'warning' END,
   ARRAY[CASE WHEN stock.available<=0 THEN 'Hết hàng khả dụng: '||p.product_name WHEN velocity.sold>0 AND stock.available/(velocity.sold/30.0)<7 THEN 'Tồn chỉ đủ bán dưới 7 ngày: '||p.product_name ELSE 'Tồn dưới mức tối thiểu: '||p.product_name END],NULL::numeric,false,'Chưa có dữ liệu phân công',NULL::timestamptz,NULL::timestamptz,NULL::uuid
  FROM public.inventory i JOIN public.product_variant v ON v.id=i.product_variant_id JOIN public.product p ON p.id=v.product_id
  CROSS JOIN LATERAL(SELECT greatest(0,i.quantity_in_stock-coalesce((SELECT sum(quantity) FROM public.stock_reservation WHERE product_variant_id=v.id AND status='active' AND expires_at>now_at),0)) available) stock
  CROSS JOIN LATERAL(SELECT coalesce(sum(d.quantity),0) sold FROM public.sales_order_detail d JOIN public.sales_order o ON o.id=d.order_id WHERE d.product_variant_id=v.id AND o.created_at>=now_at-interval '30 days' AND lower(o.order_status) NOT IN('draft','cancelled','canceled','da_huy','returned','da_tra_hang')) velocity
  WHERE can_stock AND lower(v.status) NOT IN('inactive','discontinued','ngung_ban') AND lower(p.status) NOT IN('inactive','discontinued','ngung_ban')
   AND (stock.available<=0 OR i.minimum_stock>0 AND stock.available<=i.minimum_stock OR velocity.sold>0 AND stock.available/(velocity.sold/30.0)<7)
 ),by_kind AS MATERIALIZED(SELECT * FROM raw WHERE cardinality(reasons)>0 AND (p_kind='all' OR kind=p_kind)),filtered AS MATERIALIZED(
  SELECT * FROM by_kind WHERE p_scope='all' OR p_scope='urgent' AND severity='urgent' OR p_scope='unassigned' AND unassigned OR p_scope='older' AND waiting>168 OR p_scope='recent' AND (waiting IS NULL OR waiting<=168)
 ),meta AS(SELECT count(*) total,least(p_page,greatest(1,ceil(count(*)/10.0)::int)) page FROM filtered)
 SELECT jsonb_build_object('total',meta.total,'page',meta.page,'as_of',now_at,
  'counts',(SELECT jsonb_build_object('all',count(*),'urgent',count(*) FILTER(WHERE severity='urgent'),'unassigned',count(*) FILTER(WHERE unassigned),'older',count(*) FILTER(WHERE waiting>168),'recent',count(*) FILTER(WHERE waiting IS NULL OR waiting<=168)) FROM by_kind),
  'missing_sources',to_jsonb(array_remove(ARRAY[CASE WHEN NOT can_appointment THEN 'Lịch hẹn' END,CASE WHEN NOT can_order THEN 'Đơn hàng' END,CASE WHEN NOT can_ticket THEN 'Hỗ trợ' END,CASE WHEN NOT can_return THEN 'Đổi trả' END,CASE WHEN NOT can_stock THEN 'Tồn kho' END],NULL)),
  'rows',coalesce((SELECT jsonb_agg(jsonb_build_object('id',r.kind||':'||r.id,'kind',r.kind,'recordId',r.id,'parentId',r.parent_id,'ref',r.ref,'severity',r.severity,'reasons',r.reasons,'waitingHours',r.waiting,'unassigned',r.unassigned,'ownerLabel',r.owner,'scheduledAt',r.scheduled,'dueAt',CASE WHEN r.kind='ticket' THEN r.due END) ORDER BY r.rank,r.waiting DESC NULLS LAST,r.kind,r.id)
   FROM(SELECT *,CASE severity WHEN 'urgent' THEN 0 ELSE 1 END rank FROM filtered ORDER BY rank,waiting DESC NULLS LAST,kind,id LIMIT 10 OFFSET(meta.page-1)*10)r),'[]'::jsonb)) INTO result FROM meta;
 RETURN result;
END $$;

COMMIT;
