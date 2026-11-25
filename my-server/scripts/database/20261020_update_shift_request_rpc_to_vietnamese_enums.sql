-- PawPal - Cập nhật RPC pawpal_review_staff_shift_request tương thích 100% với Enum tiếng Việt
-- Phục vụ đồng bộ sau migration 20261019_migrate_enums_to_vietnamese.sql.
-- Chạy trong Supabase SQL Editor khi muốn đồng bộ RPC trên máy chủ.

BEGIN;

CREATE OR REPLACE FUNCTION public.pawpal_review_staff_shift_request(p_request_id uuid, p_approve boolean)
RETURNS public.staff_shift_request
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
 r public.staff_shift_request;
 a public.staff_schedule;
 b public.staff_schedule;
 item public.staff_schedule;
BEGIN
 IF p_approve IS NULL THEN RAISE EXCEPTION 'Cần chọn duyệt hoặc từ chối'; END IF;
 IF NOT public.pawpal_can_review_staff_requests() THEN RAISE EXCEPTION 'Chỉ quản trị viên đang hoạt động được duyệt đơn'; END IF;
 PERFORM pg_advisory_xact_lock(20261016, 73);
 SELECT * INTO r FROM public.staff_shift_request WHERE id=p_request_id FOR UPDATE;
 IF NOT FOUND OR r.status<>'PENDING' THEN RAISE EXCEPTION 'Đơn không tồn tại hoặc không còn chờ duyệt'; END IF;
 IF NOT p_approve THEN
  UPDATE public.staff_shift_request SET status='REJECTED', reviewed_by=auth.uid(), reviewed_at=now() WHERE id=r.id RETURNING * INTO r;
  RETURN r;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.staff WHERE id=r.staff_id AND account_status IN ('ACTIVE','dang_hoat_dong')) THEN 
  RAISE EXCEPTION 'Nhân viên không còn hoạt động'; 
 END IF;

 -- 1. ĐƠN XIN NGHỈ (LEAVE)
 IF r.request_type='LEAVE' THEN
  PERFORM 1 FROM public.staff_schedule 
  WHERE staff_id=r.staff_id 
    AND work_date BETWEEN r.start_date AND r.end_date 
    AND (r.shift IN ('ALL','tat_ca') OR shift::text IN (r.shift, CASE r.shift WHEN 'MORNING' THEN 'ca_sang' WHEN 'AFTERNOON' THEN 'ca_chieu' WHEN 'EVENING' THEN 'ca_toi' ELSE r.shift END)) 
  FOR UPDATE;

  IF EXISTS(
    SELECT 1 FROM public.staff_schedule 
    WHERE staff_id=r.staff_id 
      AND work_date BETWEEN r.start_date AND r.end_date 
      AND (r.shift IN ('ALL','tat_ca') OR shift::text IN (r.shift, CASE r.shift WHEN 'MORNING' THEN 'ca_sang' WHEN 'AFTERNOON' THEN 'ca_chieu' WHEN 'EVENING' THEN 'ca_toi' ELSE r.shift END)) 
      AND schedule_status::text IN ('WORKING','COMPLETED','dang_lam_viec','da_hoan_thanh')
  ) THEN 
    RAISE EXCEPTION 'Không thể nghỉ ca đã bắt đầu hoặc hoàn tất'; 
  END IF;

  IF NOT EXISTS(
    SELECT 1 FROM public.staff_schedule 
    WHERE staff_id=r.staff_id 
      AND work_date BETWEEN r.start_date AND r.end_date 
      AND (r.shift IN ('ALL','tat_ca') OR shift::text IN (r.shift, CASE r.shift WHEN 'MORNING' THEN 'ca_sang' WHEN 'AFTERNOON' THEN 'ca_chieu' WHEN 'EVENING' THEN 'ca_toi' ELSE r.shift END)) 
      AND schedule_status::text IN ('SCHEDULED','da_len_lich')
  ) THEN 
    RAISE EXCEPTION 'Không có ca đã phân phù hợp để nghỉ'; 
  END IF;

  IF r.replacement_staff_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.staff WHERE id=r.replacement_staff_id AND account_status IN ('ACTIVE','dang_hoat_dong')) THEN 
    RAISE EXCEPTION 'Người thay thế không còn hoạt động'; 
  END IF;

  FOR item IN 
    SELECT * FROM public.staff_schedule 
    WHERE staff_id=r.staff_id 
      AND work_date BETWEEN r.start_date AND r.end_date 
      AND (r.shift IN ('ALL','tat_ca') OR shift::text IN (r.shift, CASE r.shift WHEN 'MORNING' THEN 'ca_sang' WHEN 'AFTERNOON' THEN 'ca_chieu' WHEN 'EVENING' THEN 'ca_toi' ELSE r.shift END)) 
      AND schedule_status::text IN ('SCHEDULED','da_len_lich') 
  LOOP
   IF r.replacement_staff_id IS NOT NULL THEN
    IF EXISTS(SELECT 1 FROM public.staff_schedule WHERE staff_id=r.replacement_staff_id AND work_date=item.work_date AND shift=item.shift) THEN 
      RAISE EXCEPTION 'Người thay thế đã có bản ghi cùng ca, cần rà soát'; 
    END IF;
    INSERT INTO public.staff_schedule(staff_id, work_date, shift, start_time, end_time, schedule_status)
     VALUES(r.replacement_staff_id, item.work_date, item.shift, item.start_time, item.end_time, 'da_len_lich'::public.schedule_status_enum);
   END IF;
   UPDATE public.staff_schedule SET schedule_status='nghi'::public.schedule_status_enum WHERE id=item.id;
  END LOOP;

 -- 2. ĐƠN ĐỔI CA (SWAP)
 ELSE
  IF NOT EXISTS(SELECT 1 FROM public.staff WHERE id=r.target_staff_id AND account_status IN ('ACTIVE','dang_hoat_dong')) THEN 
    RAISE EXCEPTION 'Nhân viên đổi ca không còn hoạt động'; 
  END IF;
  IF r.start_date=r.target_date AND r.shift=r.target_shift THEN 
    RAISE EXCEPTION 'Hai ca trùng nhau, không cần đổi'; 
  END IF;

  SELECT * INTO a FROM public.staff_schedule 
  WHERE staff_id=r.staff_id 
    AND work_date=r.start_date 
    AND shift::text IN (r.shift, CASE r.shift WHEN 'MORNING' THEN 'ca_sang' WHEN 'AFTERNOON' THEN 'ca_chieu' WHEN 'EVENING' THEN 'ca_toi' ELSE r.shift END) 
  FOR UPDATE;
  IF NOT FOUND OR a.schedule_status::text NOT IN ('SCHEDULED','da_len_lich') THEN 
    RAISE EXCEPTION 'Ca nguồn không còn sẵn sàng để đổi'; 
  END IF;

  SELECT * INTO b FROM public.staff_schedule 
  WHERE staff_id=r.target_staff_id 
    AND work_date=r.target_date 
    AND shift::text IN (r.target_shift, CASE r.target_shift WHEN 'MORNING' THEN 'ca_sang' WHEN 'AFTERNOON' THEN 'ca_chieu' WHEN 'EVENING' THEN 'ca_toi' ELSE r.target_shift END) 
  FOR UPDATE;
  IF NOT FOUND OR b.schedule_status::text NOT IN ('SCHEDULED','da_len_lich') THEN 
    RAISE EXCEPTION 'Ca đổi không còn sẵn sàng'; 
  END IF;

  IF EXISTS(SELECT 1 FROM public.staff_schedule WHERE staff_id=r.target_staff_id AND work_date=a.work_date AND shift=a.shift)
   OR EXISTS(SELECT 1 FROM public.staff_schedule WHERE staff_id=r.staff_id AND work_date=b.work_date AND shift=b.shift) THEN 
     RAISE EXCEPTION 'Nhân viên đã có bản ghi trùng ca nhận'; 
  END IF;

  UPDATE public.staff_schedule SET staff_id=r.target_staff_id WHERE id=a.id;
  UPDATE public.staff_schedule SET staff_id=r.staff_id WHERE id=b.id;
 END IF;

 -- 3. Kiểm tra giới hạn 8 giờ / ngày
 IF EXISTS(
  SELECT 1 FROM public.staff_schedule 
  WHERE staff_id IN (r.staff_id, r.target_staff_id, r.replacement_staff_id)
    AND work_date IN (SELECT generate_series(r.start_date::timestamp, r.end_date::timestamp, '1 day')::date UNION SELECT r.target_date)
    AND schedule_status::text NOT IN ('OFF','nghi') 
  GROUP BY staff_id, work_date
  HAVING sum(extract(epoch FROM (end_time-start_time))/3600) > 8
 ) THEN 
    RAISE EXCEPTION 'Thay đổi làm nhân viên vượt 8 giờ mỗi ngày'; 
 END IF;

 UPDATE public.staff_shift_request SET status='APPROVED', reviewed_by=auth.uid(), reviewed_at=now() WHERE id=r.id RETURNING * INTO r;
 RETURN r;
END $$;

REVOKE ALL ON FUNCTION public.pawpal_review_staff_shift_request(uuid,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pawpal_review_staff_shift_request(uuid,boolean) TO authenticated, service_role;

COMMIT;
