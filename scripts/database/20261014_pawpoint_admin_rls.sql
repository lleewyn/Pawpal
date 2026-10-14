-- Cho phép nhân viên quản trị điều chỉnh điểm Pawpoint từ Admin.
-- Không mở quyền cho anon; chỉ tài khoản authenticated qua pawpal_is_staff().
ALTER TABLE IF EXISTS public.customer_membership ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.paw_point_transaction ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS customer_membership_staff_access ON public.customer_membership;
CREATE POLICY customer_membership_staff_access
    ON public.customer_membership
    FOR ALL TO authenticated
    USING (public.pawpal_is_staff())
    WITH CHECK (public.pawpal_is_staff());

DROP POLICY IF EXISTS paw_point_transaction_staff_access ON public.paw_point_transaction;
CREATE POLICY paw_point_transaction_staff_access
    ON public.paw_point_transaction
    FOR ALL TO authenticated
    USING (public.pawpal_is_staff())
    WITH CHECK (public.pawpal_is_staff());
