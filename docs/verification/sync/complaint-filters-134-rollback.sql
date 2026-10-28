BEGIN;
CREATE OR REPLACE FUNCTION public.admin_complaint_page(p_kind text DEFAULT 'service'::text, p_filters jsonb DEFAULT '{}'::jsonb, p_page integer DEFAULT 1, p_size integer DEFAULT 10, p_context text DEFAULT NULL::text, p_ids uuid[] DEFAULT NULL::uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
    result jsonb;
    page_size integer := greatest(1, least(coalesce(p_size, 10), 100));
BEGIN
    IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('support_ticket.read') THEN
        RAISE EXCEPTION 'complaint_forbidden' USING ERRCODE = '42501';
    END IF;
    IF p_kind NOT IN ('service', 'order') THEN
        RAISE EXCEPTION 'invalid_complaint_kind' USING ERRCODE = '22023';
    END IF;

    WITH source AS MATERIALIZED (
        SELECT t.*, to_jsonb(t) || jsonb_build_object('_export', jsonb_build_object(
            'customerName', coalesce(cp.full_name, phone.phone_number, c.contact_email,
                CASE WHEN lower(t.subject) LIKE 'liên hệ từ %' THEN regexp_replace(t.subject, '^liên hệ từ\s*', '', 'i')
                WHEN t.customer_id IS NOT NULL THEN 'Khách hàng ' || right(t.customer_id::text,4) ELSE 'Khách vãng lai' END),
            'phone',coalesce(phone.phone_number,'—'), 'serviceName',coalesce(svc.service_name,'Chưa liên kết dịch vụ'),
            'orderId',o.order_code, 'staffAssigned',coalesce(handler.full_name,'Chưa phân công')
        )) AS record,
            CASE WHEN lower(t.category) = 'order' OR o.id IS NOT NULL
                OR lower(t.type) IN ('payment','order','product','wrong_item','damaged','quality','return_request','missing_item','don_hang','thanh_toan','san_pham','hoan_tien')
                THEN 'order' ELSE 'service' END AS kind,
            CASE WHEN lower(t.priority) IN ('khan_cap','urgent') THEN 'khan_cap'
                WHEN lower(t.priority) LIKE '%cao%' OR lower(t.priority) = 'high' THEN 'high'
                WHEN lower(t.priority) IN ('low','thap') OR lower(t.priority) LIKE '%thấp%' THEN 'low'
                ELSE 'medium' END AS norm_priority,
            CASE WHEN lower(t.status) IN ('processing','in_progress','dang_xu_ly') THEN 'processing'
                WHEN lower(t.status) IN ('waiting_customer','cho_khach_hang') THEN 'waiting_customer'
                WHEN lower(t.status) IN ('completed','resolved','da_giai_quyet') THEN 'resolved'
                WHEN lower(t.status) IN ('closed','da_dong','tu_choi','rejected') THEN 'closed'
                WHEN lower(t.status) IN ('waiting_manager_approval','reprocessing','waiting_return','refunding') THEN lower(t.status)
                ELSE 'new' END AS norm_status,
            CASE WHEN lower(t.type) IN ('spa','hotel','taxi') THEN lower(t.type)
                WHEN a.id IS NULL THEN 'contact'
                WHEN lower(coalesce(svc.category_code,'')) LIKE '%hotel%' THEN 'hotel'
                WHEN lower(coalesce(svc.category_code,'')) LIKE '%taxi%' THEN 'taxi'
                WHEN svc.category_code IS NOT NULL THEN 'spa' ELSE 'contact' END AS service_type,
            CASE WHEN lower(t.category) IN ('wrong_item','damaged','quality','return_request','missing_item','payment','delivery') THEN lower(t.category)
                WHEN lower(t.type) IN ('wrong_item','damaged','quality','return_request','missing_item','payment') THEN lower(t.type)
                ELSE 'other' END AS issue_type,
            coalesce(handler.full_name, 'Chưa phân công') AS handler_name,
            lower(concat_ws(' ', t.ticket_code, t.id, cp.full_name,
                CASE WHEN cp.full_name IS NULL THEN coalesce(phone.phone_number, c.contact_email,
                    CASE WHEN t.customer_id IS NOT NULL THEN 'Khách hàng ' || right(t.customer_id::text,4) ELSE 'Khách vãng lai' END) END,
                phone.phone_number, pet.pet_name, a.appointment_code, o.order_code,
                t.subject, coalesce(t.description,t.subject))) AS search_text
        FROM public.support_ticket t
        LEFT JOIN public.customer c ON c.id = t.customer_id
        LEFT JOIN public.customer_profile cp ON cp.customer_id = t.customer_id
        LEFT JOIN LATERAL (
            SELECT ph.phone_number FROM public.customer_phone ph
            WHERE ph.customer_id = t.customer_id AND ph.is_primary ORDER BY ph.id LIMIT 1
        ) phone ON true
        LEFT JOIN public.appointment a ON a.id = t.appointment_id
        LEFT JOIN public.pet_profile pet ON pet.id = a.pet_id
        LEFT JOIN public.sales_order o ON o.id = t.order_id
        LEFT JOIN public.staff handler ON handler.id = t.assigned_staff_id
        LEFT JOIN LATERAL (
            SELECT sc.category_code, coalesce(ai.name_snapshot,s.service_name) AS service_name FROM public.appointment_item ai
            LEFT JOIN public.service s ON s.id = ai.service_id
            LEFT JOIN public.service_category sc ON sc.id = s.category_id
            WHERE ai.appointment_id = a.id ORDER BY ai.is_primary DESC, ai.id LIMIT 1
        ) svc ON true
    ), filtered AS MATERIALIZED (
        SELECT * FROM source s
        WHERE (p_ids IS NOT NULL AND s.id = ANY(p_ids)) OR (
            p_ids IS NULL AND s.kind = p_kind
            AND (coalesce(p_filters->>'query','') = '' OR strpos(s.search_text, lower(p_filters->>'query')) > 0)
            AND (coalesce(p_filters->>'status','ALL') = 'ALL' OR s.norm_status = p_filters->>'status')
            AND (coalesce(p_filters->>'priority','ALL') = 'ALL' OR s.norm_priority = p_filters->>'priority')
            AND (coalesce(p_filters->>'category','ALL') = 'ALL' OR s.service_type = p_filters->>'category')
            AND (coalesce(p_filters->>'issue','ALL') = 'ALL' OR s.issue_type = p_filters->>'issue')
            AND (coalesce(p_filters->>'staff','ALL') = 'ALL' OR s.handler_name = p_filters->>'staff'
                OR p_filters->>'staff' = 'unassigned' AND s.assigned_staff_id IS NULL)
            AND CASE coalesce(p_filters->>'quick','ALL')
                WHEN 'MY' THEN EXISTS (SELECT 1 FROM public.staff actor WHERE actor.id=s.assigned_staff_id AND actor.auth_user_id=auth.uid())
                WHEN 'UNASSIGNED' THEN s.assigned_staff_id IS NULL
                WHEN 'WAITING_MANAGER' THEN s.norm_status='waiting_manager_approval'
                WHEN 'REPROCESSING' THEN s.norm_status='reprocessing'
                WHEN 'OVERDUE' THEN false -- Existing UI has no configured SLA deadline.
                WHEN 'HIGH' THEN s.norm_priority='high'
                ELSE true END
            AND (coalesce(p_filters->>'kpi','ALL')='ALL'
                OR p_filters->>'kpi'='high' AND s.norm_priority='high'
                OR p_filters->>'kpi'=s.norm_status)
        )
    ), totals AS (
        SELECT count(*) AS total FROM filtered
    ), bounds AS (
        SELECT total, least(greatest(1,coalesce(p_page,1)),greatest(1,ceil(total::numeric/page_size)::integer)) AS page FROM totals
    ), page_rows AS MATERIALIZED (
        SELECT * FROM filtered
        ORDER BY CASE WHEN p_kind='order' AND norm_status IN ('resolved','closed') THEN 1 ELSE 0 END,
            CASE norm_priority WHEN 'khan_cap' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
            CASE WHEN p_kind='order' THEN CASE norm_status WHEN 'new' THEN 1 WHEN 'reprocessing' THEN 2 WHEN 'waiting_manager_approval' THEN 3
                WHEN 'processing' THEN 4 WHEN 'waiting_return' THEN 4 WHEN 'refunding' THEN 4 WHEN 'waiting_customer' THEN 5 WHEN 'resolved' THEN 6 ELSE 7 END ELSE 0 END,
            created_at DESC, id
        OFFSET (SELECT (page-1)*page_size FROM bounds) LIMIT page_size
    ), context_rows AS (
        SELECT * FROM source WHERE p_context IS NOT NULL AND (id::text=p_context OR ticket_code=p_context)
            AND id NOT IN (SELECT id FROM page_rows)
    ), stats AS (
        SELECT jsonb_build_object(
            'sNew',count(*) FILTER(WHERE kind='service' AND norm_status='new'),
            'sProc',count(*) FILTER(WHERE kind='service' AND norm_status='processing'),
            'sWait',count(*) FILTER(WHERE kind='service' AND norm_status='waiting_customer'),
            'sHigh',count(*) FILTER(WHERE kind='service' AND norm_priority IN ('high','khan_cap') AND norm_status NOT IN ('resolved','closed')),
            'oNew',count(*) FILTER(WHERE kind='order' AND norm_status='new'),
            'oProc',count(*) FILTER(WHERE kind='order' AND norm_status='processing'),
            'oRma',count(*) FILTER(WHERE kind='order' AND issue_type='return_request'),
            'oWait',count(*) FILTER(WHERE kind='order' AND norm_status='waiting_return'),
            'oRef',count(*) FILTER(WHERE kind='order' AND norm_status='refunding'),
            'waitMgrService',count(*) FILTER(WHERE kind='service' AND norm_status='waiting_manager_approval'),
            'waitMgrOrder',count(*) FILTER(WHERE kind='order' AND norm_status='waiting_manager_approval'),
            'reprocessOrder',count(*) FILTER(WHERE kind='order' AND norm_status='reprocessing'),
            'overdueService',0,'overdueOrder',0) AS data FROM source
    )
    SELECT jsonb_build_object('total',bounds.total,'page',bounds.page,'kind',p_kind,
        'pageIds',coalesce((SELECT jsonb_agg(id) FROM page_rows),'[]'::jsonb),
        'tickets',coalesce((SELECT jsonb_agg(record) FROM (SELECT record FROM page_rows UNION ALL SELECT record FROM context_rows) r),'[]'::jsonb),
        'stats',(SELECT data FROM stats)) INTO result FROM bounds;
    RETURN result;
END;
$function$
;
DROP FUNCTION IF EXISTS public.admin_complaint_search_text(text);
NOTIFY pgrst,'reload schema';
COMMIT;
