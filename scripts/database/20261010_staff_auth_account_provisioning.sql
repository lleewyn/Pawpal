-- ============================================================================
-- PAWPAL SYSTEM MIGRATION: STAFF AUTH & ACCOUNT PROVISIONING SCHEMA
-- Phiên bản: 2026-10-10
-- Mục tiêu: Chuẩn hóa bảng public.staff liên kết với Supabase Auth (auth.users)
-- Đảm bảo: CÔ LẬP 2 CHIỀU (Bi-directional Strict Isolation)
--   * Staff/Admin CHỈ dùng cho Cổng Quản trị PawPal-er
--   * Customer CHỈ dùng cho Cổng Khách hàng / Sen App
--   * Staff KHÔNG THỂ đăng nhập vào Cổng Khách hàng và ngược lại
-- ============================================================================

-- 1. Bổ sung các cột định danh & bảo mật tài khoản cho bảng public.staff
ALTER TABLE public.staff
ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.staff
ADD COLUMN IF NOT EXISTS account_status VARCHAR(20) DEFAULT 'ACTIVE' 
CHECK (account_status IN ('ACTIVE', 'LOCKED', 'PENDING_INVITE'));

ALTER TABLE public.staff
ADD COLUMN IF NOT EXISTS system_role VARCHAR(30) DEFAULT 'STAFF'
CHECK (system_role IN ('ADMIN', 'RECEPTIONIST', 'GROOMER', 'CAREGIVER', 'CSKH', 'DRIVER', 'STAFF'));

ALTER TABLE public.staff
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.staff
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;

ALTER TABLE public.staff
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

ALTER TABLE public.staff
ADD COLUMN IF NOT EXISTS account_created_at TIMESTAMPTZ DEFAULT NOW();

-- 1.1 Bổ sung cột auth_user_id cho bảng customer (nếu chưa có)
ALTER TABLE public.customer
ADD COLUMN IF NOT EXISTS auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_customer_auth_user_id ON public.customer(auth_user_id);

-- 2. Tạo chỉ mục tối ưu hiệu năng tra cứu khi đăng nhập Admin
CREATE INDEX IF NOT EXISTS idx_staff_auth_user_id ON public.staff(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_staff_account_status ON public.staff(account_status);
CREATE INDEX IF NOT EXISTS idx_staff_system_role ON public.staff(system_role);

-- 3. Chú thích tài liệu (Schema Documentation)
COMMENT ON COLUMN public.staff.auth_user_id IS 'Khóa ngoại liên kết duy nhất tới bảng auth.users của Supabase';
COMMENT ON COLUMN public.staff.account_status IS 'Trạng thái tài khoản: ACTIVE (Hoạt động), LOCKED (Đang khóa), PENDING_INVITE (Chờ kích hoạt)';
COMMENT ON COLUMN public.staff.system_role IS 'Vai trò hệ thống: ADMIN, RECEPTIONIST, GROOMER, CAREGIVER, CSKH, DRIVER';
COMMENT ON COLUMN public.staff.permissions IS 'Danh sách quyền chi tiết dạng JSONB: view_booking, confirm_booking, create_order, manage_staff...';

-- 4. Hàm hỗ trợ kiểm tra vai trò người dùng (Database RPC Helper)
-- Giúp Backend/Client kiểm tra nhanh phân loại tài khoản: 'STAFF', 'CUSTOMER', hoặc 'NONE'
CREATE OR REPLACE FUNCTION public.check_user_account_type(check_auth_id UUID)
RETURNS TABLE (
    user_type VARCHAR(20),
    is_active BOOLEAN,
    role_name VARCHAR(30),
    profile_id UUID
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 1. Kiểm tra trong bảng nhân viên staff trước
    IF EXISTS (SELECT 1 FROM public.staff WHERE auth_user_id = check_auth_id) THEN
        RETURN QUERY
        SELECT 
            'STAFF'::VARCHAR(20) AS user_type,
            (s.account_status = 'ACTIVE') AS is_active,
            s.system_role::VARCHAR(30) AS role_name,
            s.id AS profile_id
        FROM public.staff s
        WHERE s.auth_user_id = check_auth_id
        LIMIT 1;
        RETURN;
    END IF;

    -- 2. Kiểm tra trong bảng khách hàng customer
    IF EXISTS (SELECT 1 FROM public.customer WHERE auth_user_id = check_auth_id OR id = check_auth_id) THEN
        RETURN QUERY
        SELECT 
            'CUSTOMER'::VARCHAR(20) AS user_type,
            (c.account_status = 'ACTIVE') AS is_active,
            'CUSTOMER'::VARCHAR(30) AS role_name,
            c.id AS profile_id
        FROM public.customer c
        WHERE c.auth_user_id = check_auth_id OR c.id = check_auth_id
        LIMIT 1;
        RETURN;
    END IF;

    -- 3. Không tìm thấy ở cả 2 bảng
    RETURN QUERY
    SELECT 
        'UNKNOWN'::VARCHAR(20) AS user_type,
        false AS is_active,
        'NONE'::VARCHAR(30) AS role_name,
        NULL::UUID AS profile_id;
END;
$$;
