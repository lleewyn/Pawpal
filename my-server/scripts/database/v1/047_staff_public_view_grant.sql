-- Migration 047: Cấp quyền đọc view nhân sự công khai staff_public_view cho vai trò anon và authenticated

BEGIN;

-- 1. Cấp quyền SELECT trên các cột công khai của bảng staff
GRANT SELECT (id, full_name, job_title, specialization, staff_level_id, employment_status) ON public.staff TO anon, authenticated;

-- 2. Cấp quyền SELECT trên view staff_public_view
GRANT SELECT ON public.staff_public_view TO anon, authenticated;

-- 3. Tạo RLS policy cho phép đọc thông tin nhân viên đang hoạt động
DROP POLICY IF EXISTS anon_read_staff ON public.staff;
CREATE POLICY anon_read_staff ON public.staff FOR SELECT TO anon, authenticated USING (employment_status = 'active');

NOTIFY pgrst, 'reload schema';

COMMIT;
