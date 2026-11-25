BEGIN;
SET LOCAL lock_timeout='5s';
-- Business reference titles, independent of fixed ADMIN/STAFF access roles.
CREATE TABLE IF NOT EXISTS public.staff_job_title (
 code text PRIMARY KEY,
 title text NOT NULL UNIQUE CHECK(length(btrim(title)) BETWEEN 2 AND 200),
 sort_order integer NOT NULL DEFAULT 0,
 is_active boolean NOT NULL DEFAULT true
);
ALTER TABLE public.staff_job_title ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.staff_job_title FROM PUBLIC,anon,authenticated;
INSERT INTO public.staff_job_title(code,title,sort_order) VALUES
 ('quan_ly','Quản lý',10),('le_tan','Lễ tân',20),('cham_soc_khach_hang','Nhân viên chăm sóc khách hàng',30),
 ('cham_soc_thu_cung','Chăm sóc thú cưng',40),('ky_thuat_vien_cat_tia','Kỹ thuật viên cắt tỉa',50),
 ('tai_xe_dua_don','Tài xế đưa đón thú cưng',60),('cham_soc_luu_tru','Nhân viên chăm sóc lưu trú',70),
 ('ve_sinh_luu_tru','Nhân viên vệ sinh lưu trú',80),('thu_ngan','Thu ngân',90),('nhan_vien_kho','Nhân viên kho',100)
ON CONFLICT(code) DO NOTHING;
CREATE OR REPLACE FUNCTION public.admin_staff_job_title_options()
RETURNS TABLE(code text,title text) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.work_is_admin() OR NOT pawpal_private.has_permission('staff.read') THEN
  RAISE EXCEPTION 'staff_directory_forbidden' USING ERRCODE='42501';
 END IF;
 RETURN QUERY SELECT j.code,j.title FROM public.staff_job_title j WHERE j.is_active ORDER BY j.sort_order,j.title,j.code;
END $$;
REVOKE ALL ON FUNCTION public.admin_staff_job_title_options() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_staff_job_title_options() TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
