BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='20s';

CREATE OR REPLACE FUNCTION pawpal_private.dashboard_require(p_permissions text[])
RETURNS void LANGUAGE plpgsql STABLE SET search_path=pg_catalog,public AS $$
DECLARE perm text;
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.work_is_admin() THEN RAISE EXCEPTION 'dashboard_forbidden' USING ERRCODE='42501'; END IF;
 FOREACH perm IN ARRAY p_permissions LOOP
  IF NOT pawpal_private.has_permission(perm) THEN RAISE EXCEPTION 'dashboard_forbidden' USING ERRCODE='42501'; END IF;
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.dashboard_require(text[]) FROM PUBLIC,anon,authenticated;

CREATE INDEX IF NOT EXISTS dashboard_order_completed_idx ON public.sales_order(delivered_at,id) WHERE order_status IN ('completed','delivered');
CREATE INDEX IF NOT EXISTS dashboard_appointment_completed_idx ON public.appointment(check_out_time,id) WHERE appointment_status='completed';
CREATE INDEX IF NOT EXISTS dashboard_order_customer_completed_idx ON public.sales_order(customer_id,delivered_at) WHERE order_status IN ('completed','delivered');
CREATE INDEX IF NOT EXISTS dashboard_appointment_customer_completed_idx ON public.appointment(customer_id,check_out_time) WHERE appointment_status='completed';

CREATE OR REPLACE FUNCTION pawpal_private.dashboard_transactions(p_start timestamptz,p_end timestamptz)
RETURNS TABLE(kind text,id uuid,code text,customer_id uuid,finished_at timestamptz,value numeric,line_count bigint)
LANGUAGE sql STABLE SET search_path=pg_catalog,public AS $$
 SELECT 'order',o.id,o.order_code,o.customer_id,o.delivered_at,coalesce(d.value,0),coalesce(d.n,0)
 FROM public.sales_order o LEFT JOIN LATERAL (
  SELECT sum(quantity*unit_price-discount_amount) value,count(*) n FROM public.sales_order_detail WHERE order_id=o.id
 ) d ON true WHERE o.order_status IN ('completed','delivered') AND o.delivered_at>=p_start AND o.delivered_at<p_end
 UNION ALL
 SELECT 'appointment',a.id,a.appointment_code,a.customer_id,a.check_out_time,coalesce(i.value,0),coalesce(i.n,0)
 FROM public.appointment a LEFT JOIN LATERAL (
  SELECT sum(quantity*unit_price-discount_amount) value,count(*) n FROM public.appointment_item WHERE appointment_id=a.id AND status='completed'
 ) i ON true WHERE a.appointment_status='completed' AND a.check_out_time>=p_start AND a.check_out_time<p_end
$$;
REVOKE ALL ON FUNCTION pawpal_private.dashboard_transactions(timestamptz,timestamptz) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.admin_dashboard_business_analysis(p_from date,p_to date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public SET statement_timeout='8s' AS $$
DECLARE starts timestamptz; ends timestamptz; cutoff timestamptz; prior_start timestamptz; prior_end timestamptz; result jsonb;
BEGIN
 PERFORM pawpal_private.dashboard_require(ARRAY['sales_order.read','sales_order_detail.read','appointment.read','appointment_item.read','payment.read','refund_transaction.read']);
 IF p_from IS NULL OR p_to IS NULL OR NOT isfinite(p_from) OR NOT isfinite(p_to) OR p_to<p_from OR p_to-p_from>91 THEN RAISE EXCEPTION 'invalid_dashboard_period' USING ERRCODE='22023'; END IF;
 starts:=p_from::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh'; ends:=(p_to+1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh';
 cutoff:=greatest(starts,least(ends,statement_timestamp()));
 prior_start:=starts-(p_to-p_from+1)*interval '1 day'; prior_end:=prior_start+(cutoff-starts);
 WITH transactions AS MATERIALIZED (
  SELECT 'current' period,t.* FROM pawpal_private.dashboard_transactions(starts,cutoff) t
  UNION ALL SELECT 'previous',t.* FROM pawpal_private.dashboard_transactions(prior_start,prior_end) t
 ), summary AS (
  SELECT period,kind,count(*) count,sum(value) value,avg(value) average,count(*) FILTER(WHERE line_count=0) missing_lines FROM transactions GROUP BY period,kind
 ), eligible AS (
  SELECT customer_id,count(*) n FROM transactions WHERE period='current' AND customer_id IS NOT NULL GROUP BY customer_id
 ), cohorts AS (
  SELECT e.*,EXISTS(SELECT 1 FROM public.sales_order o WHERE o.customer_id=e.customer_id AND lower(o.order_status) IN('completed','delivered') AND o.delivered_at<starts)
   OR EXISTS(SELECT 1 FROM public.appointment a WHERE a.customer_id=e.customer_id AND a.appointment_status='completed' AND a.check_out_time<starts) had_before
  FROM eligible e
 ), cash AS (
  SELECT label,coalesce((SELECT sum(p.amount) FROM public.payment p WHERE p.transaction_status='succeeded' AND p.succeeded_at>=lo AND p.succeeded_at<hi),0) collected,
   coalesce((SELECT sum(r.refunded_amount) FROM public.refund_transaction r WHERE r.refund_status='succeeded' AND r.completed_at>=lo AND r.completed_at<hi),0) refunded
  FROM (VALUES ('current',starts,cutoff),('previous',prior_start,prior_end)) p(label,lo,hi)
 )
 SELECT jsonb_build_object('from',starts,'to',cutoff,'requested_to',ends,'previous_from',prior_start,'previous_to',prior_end,'partial',cutoff<ends,
  'transactions',coalesce((SELECT jsonb_agg(s) FROM summary s),'[]'::jsonb),
  'cash',(SELECT jsonb_object_agg(label,jsonb_build_object('collected',collected,'refunded',refunded,'net',collected-refunded)) FROM cash),
  'customers',(SELECT jsonb_build_object('eligible',count(*),'first_observed',count(*) FILTER(WHERE NOT had_before),'returned_from_before',count(*) FILTER(WHERE had_before),'repeated_in_period',count(*) FILTER(WHERE n>=2)) FROM cohorts),
  'outcomes',jsonb_build_object(
   'orders_created',(SELECT count(*) FROM public.sales_order WHERE created_at>=starts AND created_at<cutoff),
   'orders_cancelled',(SELECT count(*) FROM public.sales_order WHERE created_at>=starts AND created_at<cutoff AND order_status IN('cancelled','canceled','da_huy')),
   'appointments_created',(SELECT count(*) FROM public.appointment WHERE created_at>=starts AND created_at<cutoff),
   'appointments_cancelled',(SELECT count(*) FROM public.appointment WHERE created_at>=starts AND created_at<cutoff AND appointment_status IN('cancelled','canceled','da_huy')),
   'appointments_no_show',(SELECT count(*) FROM public.appointment WHERE created_at>=starts AND created_at<cutoff AND appointment_status IN('no_show','vang_mat'))),
  'missing_completion_dates',jsonb_build_object(
   'orders',(SELECT count(*) FROM public.sales_order WHERE order_status IN('completed','delivered') AND delivered_at IS NULL),
   'appointments',(SELECT count(*) FROM public.appointment WHERE appointment_status='completed' AND check_out_time IS NULL)),
  'history_from',(SELECT min(at) FROM (SELECT min(delivered_at) at FROM public.sales_order WHERE order_status IN('completed','delivered') UNION ALL SELECT min(check_out_time) FROM public.appointment WHERE appointment_status='completed') h)
 ) INTO result;
 RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.admin_dashboard_transaction_page(p_from date,p_to date,p_kind text DEFAULT 'order',p_page integer DEFAULT 1,p_previous boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public SET statement_timeout='8s' AS $$
DECLARE starts timestamptz;ends timestamptz;cutoff timestamptz;duration interval;result jsonb;
BEGIN
 PERFORM pawpal_private.dashboard_require(ARRAY['sales_order.read','sales_order_detail.read','appointment.read','appointment_item.read']);
 IF p_from IS NULL OR p_to IS NULL OR NOT isfinite(p_from) OR NOT isfinite(p_to) OR p_to<p_from OR p_to-p_from>91 OR p_kind IS NULL OR p_kind NOT IN('order','appointment') OR p_page IS NULL OR p_page<1 OR p_page>100000 OR p_previous IS NULL THEN RAISE EXCEPTION 'invalid_dashboard_filter' USING ERRCODE='22023'; END IF;
 starts:=p_from::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh';ends:=(p_to+1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh';cutoff:=greatest(starts,least(ends,statement_timestamp()));duration:=cutoff-starts;
 IF p_previous THEN starts:=starts-(p_to-p_from+1)*interval '1 day';cutoff:=starts+duration;END IF;
 WITH base AS MATERIALIZED (SELECT * FROM pawpal_private.dashboard_transactions(starts,cutoff) WHERE kind=p_kind),meta AS(SELECT count(*) total FROM base)
 SELECT jsonb_build_object('total',meta.total,'page',p_page,'from',starts,'to',cutoff,'rows',coalesce((SELECT jsonb_agg(to_jsonb(r)-'customer_id' ORDER BY finished_at DESC,id) FROM (SELECT * FROM base ORDER BY finished_at DESC,id LIMIT 10 OFFSET (p_page-1)*10) r),'[]'::jsonb)) INTO result FROM meta;
 RETURN result;
END $$;

-- Source transitions are recorded prospectively. Baselines are explicitly not historical completions.
CREATE TABLE IF NOT EXISTS public.admin_dashboard_history_start (id boolean PRIMARY KEY DEFAULT true CHECK(id),started_at timestamptz NOT NULL DEFAULT clock_timestamp());
INSERT INTO public.admin_dashboard_history_start(id) VALUES(true) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS public.admin_dashboard_work_event (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 kind text NOT NULL CHECK(kind IN('appointment','order','ticket','return')),
 record_id uuid NOT NULL, event_type text NOT NULL CHECK(event_type IN('baseline','created','changed','deleted')),
 old_status text,new_status text,old_open boolean NOT NULL,new_open boolean NOT NULL,
 old_staff_id uuid,new_staff_id uuid,occurred_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX IF NOT EXISTS dashboard_work_event_period_idx ON public.admin_dashboard_work_event(occurred_at,kind);
CREATE INDEX IF NOT EXISTS dashboard_work_event_record_idx ON public.admin_dashboard_work_event(kind,record_id,occurred_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS dashboard_work_event_baseline_idx ON public.admin_dashboard_work_event(kind,record_id) WHERE event_type='baseline';
ALTER TABLE public.admin_dashboard_history_start ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_dashboard_work_event ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_dashboard_history_start,public.admin_dashboard_work_event FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION pawpal_private.dashboard_record_open(p_kind text,p_status text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS $$
 SELECT CASE p_kind
 WHEN 'appointment' THEN lower(coalesce(p_status,'')) IN('pending','confirmed','checked_in','in_progress','processing','cho_xac_nhan','da_xac_nhan','dang_thuc_hien')
 WHEN 'order' THEN lower(coalesce(p_status,'')) IN('draft','pending','confirmed','packing','shipped','shipping','cho_xac_nhan','da_xac_nhan','dang_dong_goi','dang_giao_hang','dang_giao')
 WHEN 'ticket' THEN lower(coalesce(p_status,'')) NOT IN('closed','resolved','completed','rejected','da_dong','da_giai_quyet','tu_choi')
 WHEN 'return' THEN lower(coalesce(p_status,'')) IN('pending','approved','da_duyet') ELSE false END
$$;
REVOKE ALL ON FUNCTION pawpal_private.dashboard_record_open(text,text) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION pawpal_private.dashboard_capture_transition()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE old_row jsonb:='{}';new_row jsonb:='{}';old_status text;new_status text;old_staff uuid;new_staff uuid;
BEGIN
 IF TG_OP<>'INSERT' THEN old_row:=to_jsonb(OLD);END IF;
 IF TG_OP<>'DELETE' THEN new_row:=to_jsonb(NEW);END IF;
 old_status:=old_row->>TG_ARGV[1];new_status:=new_row->>TG_ARGV[1];
 old_staff:=nullif(old_row->>TG_ARGV[2],'')::uuid;new_staff:=nullif(new_row->>TG_ARGV[2],'')::uuid;
 IF TG_OP='UPDATE' AND old_status IS NOT DISTINCT FROM new_status AND old_staff IS NOT DISTINCT FROM new_staff THEN RETURN NEW;END IF;
 INSERT INTO public.admin_dashboard_work_event(kind,record_id,event_type,old_status,new_status,old_open,new_open,old_staff_id,new_staff_id)
 VALUES(TG_ARGV[0],coalesce((new_row->>'id')::uuid,(old_row->>'id')::uuid),CASE TG_OP WHEN 'INSERT' THEN 'created' WHEN 'DELETE' THEN 'deleted' ELSE 'changed' END,
 old_status,new_status,TG_OP<>'INSERT' AND pawpal_private.dashboard_record_open(TG_ARGV[0],old_status),TG_OP<>'DELETE' AND pawpal_private.dashboard_record_open(TG_ARGV[0],new_status),old_staff,new_staff);
 RETURN coalesce(NEW,OLD);
END $$;
REVOKE ALL ON FUNCTION pawpal_private.dashboard_capture_transition() FROM PUBLIC,anon,authenticated;

LOCK TABLE public.appointment,public.sales_order,public.support_ticket,public.return_request IN SHARE ROW EXCLUSIVE MODE;
DO $$ DECLARE r record; initialize_baseline boolean:=NOT EXISTS(SELECT 1 FROM public.admin_dashboard_work_event); BEGIN
 FOR r IN SELECT * FROM (VALUES('appointment','appointment','appointment_status','staff_id'),('sales_order','order','order_status',''),('support_ticket','ticket','status','assigned_staff_id'),('return_request','return','request_status','')) t(tbl,kind,status_col,staff_col) LOOP
  EXECUTE format('DROP TRIGGER IF EXISTS dashboard_work_transition ON public.%I',r.tbl);
  EXECUTE format('CREATE TRIGGER dashboard_work_transition AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION pawpal_private.dashboard_capture_transition(%L,%L,%L)',r.tbl,r.kind,r.status_col,r.staff_col);
  IF initialize_baseline THEN
   EXECUTE format('INSERT INTO public.admin_dashboard_work_event(kind,record_id,event_type,new_status,old_open,new_open,new_staff_id,occurred_at) SELECT %L,id,''baseline'',%I,false,true,%s,(SELECT started_at FROM public.admin_dashboard_history_start) FROM public.%I WHERE pawpal_private.dashboard_record_open(%L,%I) ON CONFLICT DO NOTHING',r.kind,r.status_col,CASE WHEN r.staff_col='' THEN 'NULL::uuid' ELSE quote_ident(r.staff_col) END,r.tbl,r.kind,r.status_col);
  END IF;
 END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.admin_dashboard_work_history(p_from date,p_to date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public SET statement_timeout='8s' AS $$
DECLARE starts timestamptz;ends timestamptz;tracked timestamptz;result jsonb;
BEGIN
 PERFORM pawpal_private.dashboard_require(ARRAY['appointment.read','sales_order.read','support_ticket.read','return_request.read']);
 IF p_from IS NULL OR p_to IS NULL OR NOT isfinite(p_from) OR NOT isfinite(p_to) OR p_to<p_from OR p_to-p_from>91 THEN RAISE EXCEPTION 'invalid_dashboard_period' USING ERRCODE='22023';END IF;
 SELECT started_at INTO tracked FROM public.admin_dashboard_history_start;
 starts:=greatest(p_from::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh',tracked);
 ends:=least((p_to+1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh',statement_timestamp());
 IF ends<starts THEN RETURN jsonb_build_object('available',false,'tracked_from',tracked,'rows','[]'::jsonb);END IF;
 WITH kinds AS(SELECT unnest(ARRAY['appointment','order','ticket','return']) kind),counts AS(
  SELECT kind,coalesce(sum(new_open::int-old_open::int) FILTER(WHERE occurred_at<starts OR (event_type='baseline' AND occurred_at=starts)),0) opening,
   count(*) FILTER(WHERE occurred_at>=starts AND occurred_at<ends AND event_type='created' AND new_open) opened,
   count(*) FILTER(WHERE occurred_at>=starts AND occurred_at<ends AND event_type='changed' AND NOT old_open AND new_open) reopened,
   count(*) FILTER(WHERE occurred_at>=starts AND occurred_at<ends AND event_type<>'deleted' AND old_open AND NOT new_open) closed,
   count(*) FILTER(WHERE occurred_at>=starts AND occurred_at<ends AND event_type='deleted' AND old_open) removed
  FROM public.admin_dashboard_work_event WHERE occurred_at<ends GROUP BY kind
 ) SELECT jsonb_build_object('available',true,'tracked_from',tracked,'from',starts,'to',ends,'rows',jsonb_agg(jsonb_build_object('kind',k.kind,'opening',coalesce(c.opening,0),'opened',coalesce(c.opened,0),'reopened',coalesce(c.reopened,0),'closed',coalesce(c.closed,0),'removed',coalesce(c.removed,0),'closing',coalesce(c.opening+c.opened+c.reopened-c.closed-c.removed,0)))) INTO result FROM kinds k LEFT JOIN counts c USING(kind);
 RETURN result;
END $$;

-- These timestamps are observed status transitions, never general updated_at edits.
CREATE OR REPLACE FUNCTION public.admin_dashboard_order_clocks(p_ids uuid[])
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public SET statement_timeout='5s' AS $$
BEGIN
 PERFORM pawpal_private.dashboard_require(ARRAY['sales_order.read']);
 IF p_ids IS NULL OR cardinality(p_ids)>5000 THEN RAISE EXCEPTION 'invalid_dashboard_filter' USING ERRCODE='22023';END IF;
 RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('id',o.id,'status_started_at',(
 SELECT e.occurred_at FROM public.admin_dashboard_work_event e WHERE e.kind='order' AND e.record_id=o.id AND e.event_type<>'baseline' AND lower(e.new_status) IN('confirmed','packing','da_xac_nhan','dang_dong_goi') AND lower(coalesce(e.old_status,'')) NOT IN('confirmed','packing','da_xac_nhan','dang_dong_goi') ORDER BY e.occurred_at DESC,e.id DESC LIMIT 1))) FROM public.sales_order o WHERE o.id=ANY(p_ids)),'[]');
END $$;

CREATE OR REPLACE FUNCTION public.admin_dashboard_logistics_page(p_page integer DEFAULT 1)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public SET statement_timeout='8s' AS $$
DECLARE starts timestamptz:=date_trunc('day',statement_timestamp() AT TIME ZONE 'Asia/Ho_Chi_Minh') AT TIME ZONE 'Asia/Ho_Chi_Minh'; ends timestamptz;result jsonb;
BEGIN
 PERFORM pawpal_private.dashboard_require(ARRAY['hotel_booking.read','taxi_trip.read','appointment.read','pet_profile.read','hotel_room.read','staff.read']);
 IF p_page IS NULL OR p_page<1 OR p_page>100000 THEN RAISE EXCEPTION 'invalid_dashboard_filter' USING ERRCODE='22023';END IF;
 ends:=starts+interval '1 day';
 WITH agenda AS MATERIALIZED (
  SELECT CASE WHEN h.status='checked_in' AND h.check_out_at<ends THEN 'hotel_checkout' WHEN h.status='checked_in' THEN 'hotel_stay' ELSE 'hotel_checkin' END kind,
   h.id::text id,a.id appointment_id,a.appointment_code code,pet.pet_name,
   CASE WHEN h.status='checked_in' THEN h.check_out_at ELSE h.check_in_at END at,
   h.status,room.room_number detail,a.staff_id owner_id,staff.full_name owner_name
  FROM public.hotel_booking h JOIN public.appointment a ON a.id=h.appointment_id
  LEFT JOIN public.pet_profile pet ON pet.id=a.pet_id LEFT JOIN public.hotel_room room ON room.id=h.room_id LEFT JOIN public.staff staff ON staff.id=a.staff_id
  WHERE h.status NOT IN('cancelled','closed','checked_out','completed') AND lower(a.appointment_status) NOT IN('cancelled','completed','no_show')
   AND (h.status='checked_in' OR h.check_in_at>=starts AND h.check_in_at<ends)
  UNION ALL
  SELECT leg.kind,t.id::text||':'||leg.kind,a.id,a.appointment_code,pet.pet_name,leg.at,t.status,
   CASE leg.kind WHEN 'taxi_outbound' THEN 'Chặng đi' ELSE 'Chặng về' END,t.driver_staff_id,staff.full_name
  FROM public.taxi_trip t JOIN public.appointment a ON a.id=t.appointment_id LEFT JOIN public.pet_profile pet ON pet.id=a.pet_id LEFT JOIN public.staff staff ON staff.id=t.driver_staff_id
  CROSS JOIN LATERAL(VALUES('taxi_outbound',t.outbound_at),('taxi_return',t.return_at)) leg(kind,at)
  WHERE t.status NOT IN('cancelled','completed','closed') AND lower(a.appointment_status) NOT IN('cancelled','completed','no_show') AND leg.at>=starts AND leg.at<ends
 ),meta AS(SELECT count(*) total,count(*) FILTER(WHERE owner_id IS NULL) unassigned FROM agenda)
 SELECT jsonb_build_object('total',total,'unassigned',unassigned,'page',p_page,'day',starts,'rooms_in_use',(SELECT count(DISTINCT room_id) FROM public.hotel_booking WHERE status='checked_in'),
  'rows',coalesce((SELECT jsonb_agg(r ORDER BY at,id) FROM(SELECT * FROM agenda ORDER BY at,id LIMIT 10 OFFSET(p_page-1)*10) r),'[]'::jsonb)) INTO result FROM meta;
 RETURN result;
END $$;

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
   CASE WHEN lower(a.appointment_status) IN('pending','cho_xac_nhan') AND a.scheduled_start_at>=now_at THEN a.waited WHEN a.scheduled_start_at<now_at THEN extract(epoch FROM now_at-a.scheduled_start_at)/3600 ELSE NULL END waiting,
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

CREATE OR REPLACE FUNCTION public.admin_dashboard_cash_page(p_from date,p_to date,p_kind text DEFAULT 'receipt',p_page integer DEFAULT 1)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public SET statement_timeout='8s' AS $$
DECLARE starts timestamptz;ends timestamptz;result jsonb;
BEGIN
 PERFORM pawpal_private.dashboard_require(ARRAY['payment.read','refund_transaction.read','sales_order.read','appointment.read']);
 IF p_from IS NULL OR p_to IS NULL OR NOT isfinite(p_from) OR NOT isfinite(p_to) OR p_to<p_from OR p_to-p_from>91 OR p_kind IS NULL OR p_kind NOT IN('receipt','refund') OR p_page IS NULL OR p_page<1 OR p_page>100000 THEN RAISE EXCEPTION 'invalid_dashboard_filter' USING ERRCODE='22023';END IF;
 starts:=p_from::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh';ends:=greatest(starts,least((p_to+1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh',statement_timestamp()));
 WITH amounts AS MATERIALIZED(
  SELECT p.id transaction_id,p.order_id,p.appointment_id,p.succeeded_at finished_at,p.amount value FROM public.payment p WHERE p_kind='receipt' AND p.transaction_status='succeeded' AND p.succeeded_at>=starts AND p.succeeded_at<ends
  UNION ALL SELECT r.id,p.order_id,p.appointment_id,r.completed_at,r.refunded_amount FROM public.refund_transaction r JOIN public.payment p ON p.id=r.payment_id WHERE p_kind='refund' AND r.refund_status='succeeded' AND r.completed_at>=starts AND r.completed_at<ends
 ),base AS MATERIALIZED(
  SELECT x.*,CASE WHEN order_id IS NOT NULL AND appointment_id IS NULL THEN order_id WHEN appointment_id IS NOT NULL AND order_id IS NULL THEN appointment_id END id,
   CASE WHEN order_id IS NOT NULL AND appointment_id IS NULL THEN 'order' WHEN appointment_id IS NOT NULL AND order_id IS NULL THEN 'appointment' END target_kind,
   CASE WHEN order_id IS NOT NULL AND appointment_id IS NULL THEN o.order_code WHEN appointment_id IS NOT NULL AND order_id IS NULL THEN a.appointment_code ELSE x.transaction_id::text END code
  FROM amounts x LEFT JOIN public.sales_order o ON o.id=x.order_id LEFT JOIN public.appointment a ON a.id=x.appointment_id
 ) SELECT jsonb_build_object('total',(SELECT count(*) FROM base),'page',p_page,'from',starts,'to',ends,'rows',coalesce((SELECT jsonb_agg(to_jsonb(r)-'order_id'-'appointment_id' ORDER BY finished_at DESC,transaction_id) FROM(SELECT * FROM base ORDER BY finished_at DESC,transaction_id LIMIT 10 OFFSET(p_page-1)*10) r),'[]'::jsonb)) INTO result;
 RETURN result;
END $$;

REVOKE ALL ON FUNCTION public.admin_dashboard_business_analysis(date,date),public.admin_dashboard_transaction_page(date,date,text,integer,boolean),public.admin_dashboard_work_history(date,date),public.admin_dashboard_order_clocks(uuid[]),public.admin_dashboard_logistics_page(integer),public.admin_dashboard_work_page(text,text,integer),public.admin_dashboard_cash_page(date,date,text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_business_analysis(date,date),public.admin_dashboard_transaction_page(date,date,text,integer,boolean),public.admin_dashboard_work_history(date,date),public.admin_dashboard_order_clocks(uuid[]),public.admin_dashboard_logistics_page(integer),public.admin_dashboard_work_page(text,text,integer),public.admin_dashboard_cash_page(date,date,text,integer) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
