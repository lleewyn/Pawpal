BEGIN;
CREATE OR REPLACE FUNCTION public.admin_audit_page(p_query text DEFAULT '', p_module text DEFAULT 'all', p_page integer DEFAULT 1)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public SET statement_timeout='5s' AS $$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.work_is_admin() OR NOT pawpal_private.has_permission('audit_log.read') OR NOT pawpal_private.has_permission('staff.read') THEN
  RAISE EXCEPTION 'audit_read_forbidden' USING ERRCODE='42501';
 END IF;
 IF length(coalesce(p_query,''))>200 OR coalesce(p_module,'all') NOT IN ('all','Bán hàng','Khuyến mãi','Banner','Khách hàng','Thú cưng','Dịch vụ','Nhân sự','Bài viết','Cấu hình','Hệ thống') THEN
  RAISE EXCEPTION 'invalid_audit_filter' USING ERRCODE='22023';
 END IF;
 WITH base AS MATERIALIZED (
  SELECT a.id,a.action,a.created_at,coalesce(s.full_name,'Quản trị viên') actor,
   CASE a.entity_name WHEN 'product' THEN 'Bán hàng' WHEN 'sales_order' THEN 'Bán hàng'
    WHEN 'voucher' THEN 'Khuyến mãi' WHEN 'banner' THEN 'Banner' WHEN 'customer' THEN 'Khách hàng'
    WHEN 'pet_profile' THEN 'Thú cưng' WHEN 'service' THEN 'Dịch vụ' WHEN 'appointment' THEN 'Dịch vụ'
    WHEN 'appointment_incident' THEN 'Dịch vụ' WHEN 'staff' THEN 'Nhân sự' WHEN 'blog_post' THEN 'Bài viết'
    WHEN 'pawpal_setting' THEN 'Cấu hình' WHEN 'store_profile' THEN 'Cấu hình' WHEN 'payment' THEN 'Cấu hình'
    WHEN 'shipping' THEN 'Cấu hình' WHEN 'booking_policy' THEN 'Cấu hình' ELSE 'Hệ thống' END target_module,
   CASE a.action WHEN 'SETTINGS_WRITE' THEN 'Lưu thay đổi cấu hình' WHEN 'SETTINGS_KNOWLEDGE' THEN 'Đồng bộ tri thức từ bài viết'
    WHEN 'CREATE' THEN 'Tạo dữ liệu' WHEN 'INSERT' THEN 'Tạo dữ liệu' WHEN 'UPDATE' THEN 'Cập nhật dữ liệu'
    WHEN 'DELETE' THEN 'Xóa dữ liệu' WHEN 'LOGIN' THEN 'Đăng nhập' WHEN 'LOGOUT' THEN 'Đăng xuất'
    WHEN 'EXPORT' THEN 'Xuất dữ liệu' ELSE 'Đã ghi nhận thao tác' END action_text
  FROM public.audit_log a LEFT JOIN public.staff s ON s.id=a.staff_id
 ), matched AS MATERIALIZED (
  SELECT * FROM base WHERE (coalesce(p_module,'all')='all' OR target_module=p_module)
   AND (coalesce(trim(p_query),'')='' OR strpos(lower(actor),lower(trim(p_query)))>0
    OR strpos(lower(target_module),lower(trim(p_query)))>0 OR strpos(lower(action_text),lower(trim(p_query)))>0)
 ), meta AS (
  SELECT count(*) total,least(greatest(coalesce(p_page,1),1),greatest(1,ceil(count(*)/10.0)::integer)) page FROM matched
 ), page_rows AS (
  SELECT * FROM matched ORDER BY created_at DESC,id DESC LIMIT 10 OFFSET (SELECT (page-1)*10 FROM meta)
 )
 SELECT jsonb_build_object('rows',coalesce((SELECT jsonb_agg(to_jsonb(r) ORDER BY created_at DESC,id DESC) FROM page_rows r),'[]'::jsonb),
  'total',meta.total,'page',meta.page,'stats',jsonb_build_object('total',(SELECT count(*) FROM base),
   'synced',(SELECT count(*) FROM base WHERE action IN ('SETTINGS_WRITE','SETTINGS_KNOWLEDGE')),
   'lastModule',coalesce((SELECT target_module FROM base ORDER BY created_at DESC,id DESC LIMIT 1),'Chưa có')))
 INTO result FROM meta;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.admin_audit_page(text,text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_audit_page(text,text,integer) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
