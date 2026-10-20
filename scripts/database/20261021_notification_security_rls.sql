-- ============================================================================
-- Migration: 20261021_notification_security_rls.sql
-- Dự án: PawPal Admin & User Portal
-- Hạng mục: Kích hoạt Row Level Security (RLS) & Policies cho bảng notification
-- Liên kết kiểm toán: NOTI-T01-05 đến NOTI-T01-11
-- ============================================================================

-- 1. Kích hoạt Row Level Security trên bảng notification
ALTER TABLE public.notification ENABLE ROW LEVEL SECURITY;

-- 2. Policy SELECT: Khách hàng chỉ được đọc thông báo của chính mình; Nhân viên (staff) đọc được tất cả
DROP POLICY IF EXISTS notification_select_boundary ON public.notification;
CREATE POLICY notification_select_boundary ON public.notification
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.customer c
        WHERE c.id = notification.customer_id AND c.auth_user_id = auth.uid()
    )
    OR public.pawpal_is_staff()
);

-- 3. Policy UPDATE: Khách hàng chỉ được cập nhật trạng thái đã đọc (is_read, read_at) cho thông báo của chính mình
DROP POLICY IF EXISTS notification_customer_update_read ON public.notification;
CREATE POLICY notification_customer_update_read ON public.notification
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.customer c
        WHERE c.id = notification.customer_id AND c.auth_user_id = auth.uid()
    )
    OR public.pawpal_is_staff()
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.customer c
        WHERE c.id = notification.customer_id AND c.auth_user_id = auth.uid()
    )
    OR public.pawpal_is_staff()
);

-- 4. Policy INSERT: Chỉ nhân viên hoặc hệ thống backend (service_role / staff) mới được tạo thông báo
DROP POLICY IF EXISTS notification_insert_access ON public.notification;
CREATE POLICY notification_insert_access ON public.notification
FOR INSERT TO authenticated
WITH CHECK (
    public.pawpal_is_staff()
    OR EXISTS (
        SELECT 1 FROM public.customer c
        WHERE c.id = notification.customer_id AND c.auth_user_id = auth.uid()
    )
);

-- 5. Policy DELETE: Không cho phép khách hàng tự ý xóa lịch sử thông báo
DROP POLICY IF EXISTS notification_delete_staff_only ON public.notification;
CREATE POLICY notification_delete_staff_only ON public.notification
FOR DELETE TO authenticated
USING (
    public.pawpal_is_staff()
);
