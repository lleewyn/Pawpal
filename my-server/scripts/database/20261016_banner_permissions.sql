-- Cho phép quản trị viên đọc, thêm, cập nhật và xóa Banner từ Cổng Quản trị Pawpal-er.
BEGIN;

ALTER TABLE IF EXISTS public.banner ENABLE ROW LEVEL SECURITY;

-- Cấp quyền thao tác cho authenticated và anon
GRANT SELECT, INSERT, UPDATE, DELETE ON public.banner TO anon, authenticated;

-- Policy đọc danh sách Banner
DROP POLICY IF EXISTS "banner_select_policy" ON public.banner;
CREATE POLICY "banner_select_policy"
    ON public.banner
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Policy tạo mới Banner
DROP POLICY IF EXISTS "banner_insert_policy" ON public.banner;
CREATE POLICY "banner_insert_policy"
    ON public.banner
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Policy cập nhật Banner
DROP POLICY IF EXISTS "banner_update_policy" ON public.banner;
CREATE POLICY "banner_update_policy"
    ON public.banner
    FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- Policy xóa Banner
DROP POLICY IF EXISTS "banner_delete_policy" ON public.banner;
CREATE POLICY "banner_delete_policy"
    ON public.banner
    FOR DELETE
    TO anon, authenticated
    USING (true);

COMMIT;
