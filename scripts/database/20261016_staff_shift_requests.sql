-- Chạy trong Supabase SQL Editor. Không xóa hoặc sửa dữ liệu mẫu.
BEGIN;
CREATE UNIQUE INDEX IF NOT EXISTS staff_schedule_staff_date_shift_unique ON public.staff_schedule(staff_id, work_date, shift);
CREATE OR REPLACE FUNCTION public.pawpal_can_review_staff_requests() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid() AND account_status='ACTIVE' AND system_role='ADMIN')
$$;
REVOKE ALL ON FUNCTION public.pawpal_can_review_staff_requests() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pawpal_can_review_staff_requests() TO authenticated;
CREATE TABLE IF NOT EXISTS public.staff_shift_request (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 request_type text NOT NULL CHECK(request_type IN ('LEAVE','SWAP')),
 staff_id uuid NOT NULL REFERENCES public.staff(id),
 target_staff_id uuid REFERENCES public.staff(id),
 replacement_staff_id uuid REFERENCES public.staff(id),
 leave_type text CHECK(leave_type IN ('ANNUAL','SICK','PERSONAL','UNPAID')),
 start_date date NOT NULL,
 end_date date NOT NULL,
 shift text NOT NULL CHECK(shift IN ('ALL','MORNING','AFTERNOON','EVENING')),
 target_date date,
 target_shift text CHECK(target_shift IN ('MORNING','AFTERNOON','EVENING')),
 reason text NOT NULL CHECK(length(trim(reason)) BETWEEN 3 AND 2000),
 status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','APPROVED','REJECTED')),
 created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
 reviewed_by uuid REFERENCES auth.users(id),
 reviewed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(end_date>=start_date AND end_date-start_date<=31),
 CHECK(replacement_staff_id IS NULL OR replacement_staff_id<>staff_id),
 CHECK(request_type<>'SWAP' OR (target_staff_id IS NOT NULL AND target_staff_id<>staff_id AND target_date IS NOT NULL AND target_shift IS NOT NULL AND shift<>'ALL' AND end_date=start_date)),
 CHECK(request_type<>'LEAVE' OR (leave_type IS NOT NULL AND target_staff_id IS NULL AND target_date IS NULL AND target_shift IS NULL)),
 CHECK(request_type<>'SWAP' OR (replacement_staff_id IS NULL AND leave_type IS NULL))
);
ALTER TABLE public.staff_shift_request ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.staff_shift_request FROM anon, authenticated;
GRANT SELECT, INSERT ON public.staff_shift_request TO authenticated;
DROP POLICY IF EXISTS staff_shift_request_read ON public.staff_shift_request;
CREATE POLICY staff_shift_request_read ON public.staff_shift_request FOR SELECT TO authenticated USING (
 public.pawpal_can_review_staff_requests() OR EXISTS(SELECT 1 FROM public.staff s WHERE s.id=staff_id AND s.auth_user_id=auth.uid() AND s.account_status='ACTIVE')
);
DROP POLICY IF EXISTS staff_shift_request_create ON public.staff_shift_request;
CREATE POLICY staff_shift_request_create ON public.staff_shift_request FOR INSERT TO authenticated WITH CHECK (
 status='PENDING' AND reviewed_by IS NULL AND reviewed_at IS NULL AND created_by=auth.uid() AND
 (public.pawpal_can_review_staff_requests() OR EXISTS(SELECT 1 FROM public.staff s WHERE s.id=staff_id AND s.auth_user_id=auth.uid() AND s.account_status='ACTIVE'))
);
CREATE OR REPLACE FUNCTION public.pawpal_review_staff_shift_request(p_request_id uuid,p_approve boolean)
RETURNS public.staff_shift_request LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE r public.staff_shift_request; a public.staff_schedule; b public.staff_schedule; item public.staff_schedule;
BEGIN
 IF p_approve IS NULL THEN RAISE EXCEPTION 'Cần chọn duyệt hoặc từ chối'; END IF;
 IF NOT public.pawpal_can_review_staff_requests() THEN RAISE EXCEPTION 'Chỉ quản trị viên đang hoạt động được duyệt đơn'; END IF;
 -- Tuần tự hóa duyệt đơn; toàn bộ thay đổi lịch và trạng thái đơn cùng giao dịch.
 PERFORM pg_advisory_xact_lock(20261016,73);
 SELECT * INTO r FROM public.staff_shift_request WHERE id=p_request_id FOR UPDATE;
 IF NOT FOUND OR r.status<>'PENDING' THEN RAISE EXCEPTION 'Đơn không tồn tại hoặc không còn chờ duyệt'; END IF;
 IF NOT p_approve THEN
  UPDATE public.staff_shift_request SET status='REJECTED',reviewed_by=auth.uid(),reviewed_at=now() WHERE id=r.id RETURNING * INTO r;
  RETURN r;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.staff WHERE id=r.staff_id AND account_status='ACTIVE') THEN RAISE EXCEPTION 'Nhân viên không còn hoạt động'; END IF;
 IF r.request_type='LEAVE' THEN
  PERFORM 1 FROM public.staff_schedule WHERE staff_id=r.staff_id AND work_date BETWEEN r.start_date AND r.end_date AND (r.shift='ALL' OR shift::text=r.shift) FOR UPDATE;
  IF EXISTS(SELECT 1 FROM public.staff_schedule WHERE staff_id=r.staff_id AND work_date BETWEEN r.start_date AND r.end_date AND (r.shift='ALL' OR shift::text=r.shift) AND schedule_status::text IN ('WORKING','COMPLETED')) THEN RAISE EXCEPTION 'Không thể nghỉ ca đã bắt đầu hoặc hoàn tất'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.staff_schedule WHERE staff_id=r.staff_id AND work_date BETWEEN r.start_date AND r.end_date AND (r.shift='ALL' OR shift::text=r.shift) AND schedule_status::text='SCHEDULED') THEN RAISE EXCEPTION 'Không có ca đã phân phù hợp để nghỉ'; END IF;
  IF r.replacement_staff_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.staff WHERE id=r.replacement_staff_id AND account_status='ACTIVE') THEN RAISE EXCEPTION 'Người thay thế không còn hoạt động'; END IF;
  FOR item IN SELECT * FROM public.staff_schedule WHERE staff_id=r.staff_id AND work_date BETWEEN r.start_date AND r.end_date AND (r.shift='ALL' OR shift::text=r.shift) AND schedule_status::text='SCHEDULED' LOOP
   IF r.replacement_staff_id IS NOT NULL THEN
    IF EXISTS(SELECT 1 FROM public.staff_schedule WHERE staff_id=r.replacement_staff_id AND work_date=item.work_date AND shift=item.shift) THEN RAISE EXCEPTION 'Người thay thế đã có bản ghi cùng ca, cần rà soát'; END IF;
    INSERT INTO public.staff_schedule(staff_id,work_date,shift,start_time,end_time,schedule_status)
     VALUES(r.replacement_staff_id,item.work_date,item.shift,item.start_time,item.end_time,'SCHEDULED');
   END IF;
   UPDATE public.staff_schedule SET schedule_status='OFF' WHERE id=item.id;
  END LOOP;
 ELSE
  IF NOT EXISTS(SELECT 1 FROM public.staff WHERE id=r.target_staff_id AND account_status='ACTIVE') THEN RAISE EXCEPTION 'Nhân viên đổi ca không còn hoạt động'; END IF;
  IF r.start_date=r.target_date AND r.shift=r.target_shift THEN RAISE EXCEPTION 'Hai ca trùng nhau, không cần đổi'; END IF;
  SELECT * INTO a FROM public.staff_schedule WHERE staff_id=r.staff_id AND work_date=r.start_date AND shift::text=r.shift FOR UPDATE;
  IF NOT FOUND OR a.schedule_status::text<>'SCHEDULED' THEN RAISE EXCEPTION 'Ca nguồn không còn sẵn sàng để đổi'; END IF;
  SELECT * INTO b FROM public.staff_schedule WHERE staff_id=r.target_staff_id AND work_date=r.target_date AND shift::text=r.target_shift FOR UPDATE;
  IF NOT FOUND OR b.schedule_status::text<>'SCHEDULED' THEN RAISE EXCEPTION 'Ca đổi không còn sẵn sàng'; END IF;
  IF EXISTS(SELECT 1 FROM public.staff_schedule WHERE staff_id=r.target_staff_id AND work_date=a.work_date AND shift=a.shift)
   OR EXISTS(SELECT 1 FROM public.staff_schedule WHERE staff_id=r.staff_id AND work_date=b.work_date AND shift=b.shift) THEN RAISE EXCEPTION 'Nhân viên đã có bản ghi trùng ca nhận'; END IF;
  UPDATE public.staff_schedule SET staff_id=r.target_staff_id WHERE id=a.id;
  UPDATE public.staff_schedule SET staff_id=r.staff_id WHERE id=b.id;
 END IF;
 IF EXISTS(SELECT 1 FROM public.staff_schedule WHERE staff_id IN (r.staff_id,r.target_staff_id,r.replacement_staff_id)
  AND work_date IN (SELECT generate_series(r.start_date::timestamp,r.end_date::timestamp,'1 day')::date UNION SELECT r.target_date)
  AND schedule_status::text<>'OFF' GROUP BY staff_id,work_date
  HAVING sum(extract(epoch FROM (end_time-start_time))/3600)>8) THEN RAISE EXCEPTION 'Thay đổi làm nhân viên vượt 8 giờ mỗi ngày'; END IF;
 UPDATE public.staff_shift_request SET status='APPROVED',reviewed_by=auth.uid(),reviewed_at=now() WHERE id=r.id RETURNING * INTO r;
 RETURN r;
END $$;
REVOKE ALL ON FUNCTION public.pawpal_review_staff_shift_request(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.pawpal_review_staff_shift_request(uuid,boolean) TO authenticated;
COMMIT;
