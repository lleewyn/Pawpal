-- Cho phép quản trị viên đọc và lưu cấu hình vận hành từ Admin (Supabase Live DB).
ALTER TABLE public.pawpal_setting ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.pawpal_setting TO anon, authenticated;

DROP POLICY IF EXISTS "Admin đọc cấu hình vận hành" ON public.pawpal_setting;
CREATE POLICY "Admin đọc cấu hình vận hành"
ON public.pawpal_setting FOR SELECT
TO authenticated, anon
USING (true);

DROP POLICY IF EXISTS "Admin ghi cấu hình vận hành" ON public.pawpal_setting;
CREATE POLICY "Admin ghi cấu hình vận hành"
ON public.pawpal_setting FOR INSERT
TO authenticated, anon
WITH CHECK (true);

DROP POLICY IF EXISTS "Admin cập nhật cấu hình vận hành" ON public.pawpal_setting;
CREATE POLICY "Admin cập nhật cấu hình vận hành"
ON public.pawpal_setting FOR UPDATE
TO authenticated, anon
USING (true)
WITH CHECK (true);
