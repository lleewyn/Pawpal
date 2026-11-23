BEGIN;
-- A staff level is required only when the selected service requires one.
DO $$
DECLARE body text:=pg_get_functiondef('pawpal_private.booking_staff_choices(uuid,jsonb,uuid)'::regprocedure);
 needle text:=' AND s.staff_level_id IS NOT NULL';
BEGIN
 IF strpos(body,needle)=0 THEN RETURN; END IF;
 IF strpos(body,'svc.staff_level_required_id IS NULL OR EXISTS')=0 THEN RAISE EXCEPTION 'unexpected_dispatch_skill_definition'; END IF;
 EXECUTE replace(body,needle,'');
END $$;

CREATE OR REPLACE FUNCTION public.admin_service_booking_staff_diagnostics(p_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE a public.appointment;required_level uuid;result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('appointment.read') OR NOT pawpal_private.has_permission('appointment.write') OR NOT pawpal_private.has_permission('staff.read') THEN
  RAISE EXCEPTION 'booking_write_forbidden' USING ERRCODE='42501';
 END IF;
 SELECT * INTO a FROM public.appointment WHERE id=p_id;
 IF a.id IS NULL THEN RAISE EXCEPTION 'booking_not_found' USING ERRCODE='P0002';END IF;
 SELECT s.staff_level_required_id INTO required_level FROM public.appointment_item i JOIN public.service s ON s.id=i.service_id WHERE i.appointment_id=a.id AND i.is_primary LIMIT 1;
 SELECT coalesce(jsonb_agg(jsonb_build_object('staff_name',p.full_name,'reason',p.reason) ORDER BY p.full_name),'[]'::jsonb) INTO result
 FROM (
  SELECT s.full_name,CASE
   WHEN s.employment_status<>'active' THEN 'Nhân viên không còn làm việc.'
   WHEN s.service_locked OR NOT pawpal_private.staff_skill_allows_assignment(s.id) THEN 'Nhân viên đang bị tạm khóa phân công dịch vụ.'
   WHEN required_level IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.staff_level actual JOIN public.staff_level required ON required.id=required_level WHERE actual.id=s.staff_level_id AND actual.rank_order>=required.rank_order) THEN 'Chưa đáp ứng cấp bậc kỹ thuật của gói dịch vụ.'
   WHEN NOT EXISTS(SELECT 1 FROM public.staff_schedule sc WHERE sc.staff_id=s.id AND sc.schedule_status='active' AND sc.availability_status='available' AND sc.start_at<=a.scheduled_start_at AND sc.end_at>=a.scheduled_end_at) THEN 'Ca đã phân chưa bao phủ toàn bộ giờ hẹn.'
   WHEN EXISTS(SELECT 1 FROM public.staff_schedule sc WHERE sc.staff_id=s.id AND sc.schedule_status='active' AND sc.availability_status<>'available' AND sc.start_at<a.scheduled_end_at AND sc.end_at>a.scheduled_start_at) THEN 'Có thời gian nghỉ hoặc bận trong giờ hẹn.'
   WHEN conflict.id IS NOT NULL THEN 'Trùng lịch '||conflict.appointment_code||' từ '||to_char(conflict.scheduled_start_at AT TIME ZONE 'Asia/Bangkok','HH24:MI DD/MM/YYYY')||' đến '||to_char(conflict.scheduled_end_at AT TIME ZONE 'Asia/Bangkok','HH24:MI DD/MM/YYYY')||'.'
   WHEN EXISTS(SELECT 1 FROM pawpal_private.member_booking_hold h WHERE h.staff_id=s.id AND h.customer_id<>a.customer_id AND h.expires_at>clock_timestamp() AND h.starts<a.scheduled_end_at AND h.ends>a.scheduled_start_at) THEN 'Đang có lượt giữ chỗ khác trong giờ hẹn.'
   ELSE 'Cần đối chiếu thời lượng và điều kiện của gói dịch vụ.' END reason
  FROM public.staff s
  LEFT JOIN LATERAL (SELECT other.id,other.appointment_code,other.scheduled_start_at,other.scheduled_end_at FROM public.appointment other
   WHERE other.id<>a.id AND other.appointment_status NOT IN('completed','cancelled','no_show','expired','da_huy','da_hoan_tat','vang_mat')
   AND other.scheduled_start_at<a.scheduled_end_at AND other.scheduled_end_at>a.scheduled_start_at
   AND (other.staff_id=s.id OR other.requested_staff_id=s.id OR EXISTS(SELECT 1 FROM public.appointment_item i WHERE i.appointment_id=other.id AND i.staff_id=s.id AND i.status<>'cancelled'))
   ORDER BY other.scheduled_start_at,other.id LIMIT 1) conflict ON true
  WHERE EXISTS(SELECT 1 FROM public.staff_schedule sc WHERE sc.staff_id=s.id AND sc.schedule_status='active' AND sc.start_at<a.scheduled_end_at AND sc.end_at>a.scheduled_start_at)
 )p;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.admin_service_booking_staff_diagnostics(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_service_booking_staff_diagnostics(uuid) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
