-- ==============================================================================
-- PAWPAL-ER ADMIN: HẠ TẦNG CSDL & MIGRATION TOÀN DIỆN CHO 8 PHÂN HỆ
-- File: scripts/database/20261017_admin_audit_backend_enhancements.sql
-- Mục đích:
--   Chuẩn hóa 100% cấu trúc Khóa chính (PK), Khóa ngoại (FK), Ràng buộc (CHECK/UNIQUE)
--   theo tài liệu thiết kế chuẩn CSDLdemo và đối chiếu với PAWPAL_ADMIN_AUDIT_LOI_8_PHAN_HE.md:
--   1. [S-09, S-24] Supabase Storage Bucket 'service-evidence' (Biên bản an toàn & Carelog ảnh thật).
--   2. [S-01] Schema Pet Hotel: hotel_room_type, hotel_room và hotel_booking chuẩn FK customer/pet/room.
--   3. [O-18] Schema Biến thể sản phẩm: variant_flavor, variant_size, variant_color, product_variant chuẩn FK product.
--   4. [S-08, S-14, S-23] Bổ sung checklist SOP, commission_rate, staff_level_required vào bảng service.
--   5. [S-11] RPC pawpal_book_service_atomic: Đặt lịch hẹn an toàn, kiểm tra FK hợp lệ và chống Race Condition.
--   6. [N-25] RPC pawpal_create_and_approve_shift_request: Tạo và duyệt đơn ca làm việc nguyên tử.
--   7. [C-16] Tách biệt điểm xét hạng (tier_points) khỏi ví điểm khả dụng (total_paw_points) kèm FK membership_tier_id.
--   8. [N-29] View bảo mật staff_public_view che giấu lương, CCCD và thông tin nhạy cảm.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. [S-09, S-24] SUPABASE STORAGE: BUCKET LƯU ẢNH CHĂM SÓC & BIÊN BẢN (ZERO-CLAIM)
-- ------------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'service-evidence',
    'service-evidence',
    true,
    10485760, -- Giới hạn 10MB mỗi ảnh
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

DROP POLICY IF EXISTS "service_evidence_public_read" ON storage.objects;
CREATE POLICY "service_evidence_public_read"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'service-evidence');

DROP POLICY IF EXISTS "service_evidence_staff_upload" ON storage.objects;
CREATE POLICY "service_evidence_staff_upload"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'service-evidence' AND
        EXISTS (
            SELECT 1 FROM public.staff 
            WHERE auth_user_id = auth.uid() 
              AND account_status = 'ACTIVE'
        )
    );

-- ------------------------------------------------------------------------------
-- 2. [S-01] SCHEMA PET HOTEL: LOẠI PHÒNG, PHÒNG VẬT LÝ VÀ ĐẶT PHÒNG LƯU TRÚ (CHUẨN PK & FK)
-- ------------------------------------------------------------------------------

-- Bảng 15 (CSDLdemo): hotel_room_type - Danh mục loại phòng lưu trú
CREATE TABLE IF NOT EXISTS public.hotel_room_type (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    room_type text UNIQUE NOT NULL,
    capacity integer NOT NULL DEFAULT 1 CHECK (capacity >= 1),
    daily_price numeric(12,2) NOT NULL DEFAULT 0 CHECK (daily_price >= 0),
    description text,
    amenities text[] DEFAULT '{}',
    status text NOT NULL DEFAULT 'dang_hoat_dong' CHECK (status IN ('dang_hoat_dong', 'tam_ngung', 'ngung_cung_cap')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Bảng 14 (CSDLdemo): hotel_room - Phòng/chuồng vật lý thực tế tại chi nhánh
CREATE TABLE IF NOT EXISTS public.hotel_room (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    room_number text UNIQUE NOT NULL,
    room_type_id uuid NOT NULL REFERENCES public.hotel_room_type(id) ON DELETE RESTRICT,
    status text NOT NULL DEFAULT 'trong' CHECK (status IN ('trong', 'dang_dat', 'dang_su_dung', 'bao_tri', 'ngung_su_dung')),
    description text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Bảng đặt phòng lưu trú: hotel_booking liên kết trực tiếp khách hàng (customer), thú cưng (pet_profile) và phòng (hotel_room)
CREATE TABLE IF NOT EXISTS public.hotel_booking (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_code text UNIQUE NOT NULL,
    customer_id uuid NOT NULL REFERENCES public.customer(id) ON DELETE CASCADE,
    pet_id uuid NOT NULL REFERENCES public.pet_profile(id) ON DELETE CASCADE,
    room_id uuid NOT NULL REFERENCES public.hotel_room(id) ON DELETE RESTRICT,
    appointment_id uuid REFERENCES public.appointment(id) ON DELETE SET NULL,
    check_in_date date NOT NULL,
    check_out_date date NOT NULL,
    status text NOT NULL DEFAULT 'cho_xac_nhan' CHECK (status IN ('cho_xac_nhan', 'da_xac_nhan', 'da_check_in', 'da_check_out', 'da_huy')),
    special_diet_notes text,
    medication_notes text,
    daily_price numeric(12,2) NOT NULL CHECK (daily_price >= 0),
    total_amount numeric(12,2) NOT NULL CHECK (total_amount >= 0),
    deposit_amount numeric(12,2) DEFAULT 0 CHECK (deposit_amount >= 0),
    payment_status text NOT NULL DEFAULT 'chua_thanh_toan' CHECK (payment_status IN ('chua_thanh_toan', 'da_thanh_toan_mot_phan', 'da_thanh_toan', 'da_hoan_tien')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT check_dates_valid CHECK (check_out_date > check_in_date)
);

-- Chỉ mục Foreign Key tối ưu hiệu năng và ngăn khóa bảng
CREATE INDEX IF NOT EXISTS idx_hotel_room_type_fk ON public.hotel_room(room_type_id);
CREATE INDEX IF NOT EXISTS idx_hotel_booking_customer_fk ON public.hotel_booking(customer_id);
CREATE INDEX IF NOT EXISTS idx_hotel_booking_pet_fk ON public.hotel_booking(pet_id);
CREATE INDEX IF NOT EXISTS idx_hotel_booking_room_fk ON public.hotel_booking(room_id);
CREATE INDEX IF NOT EXISTS idx_hotel_booking_dates ON public.hotel_booking(room_id, check_in_date, check_out_date, status);

ALTER TABLE public.hotel_room_type ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_room ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotel_booking ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.hotel_room_type TO anon, authenticated;
GRANT SELECT ON public.hotel_room TO anon, authenticated;
GRANT ALL ON public.hotel_room_type TO authenticated;
GRANT ALL ON public.hotel_room TO authenticated;
GRANT ALL ON public.hotel_booking TO authenticated;

DROP POLICY IF EXISTS hotel_room_type_read_policy ON public.hotel_room_type;
CREATE POLICY hotel_room_type_read_policy ON public.hotel_room_type FOR SELECT USING (true);

DROP POLICY IF EXISTS hotel_room_read_policy ON public.hotel_room;
CREATE POLICY hotel_room_read_policy ON public.hotel_room FOR SELECT USING (true);

DROP POLICY IF EXISTS hotel_booking_staff_policy ON public.hotel_booking;
CREATE POLICY hotel_booking_staff_policy ON public.hotel_booking FOR ALL TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.staff WHERE auth_user_id = auth.uid() AND account_status = 'ACTIVE')
);

-- ------------------------------------------------------------------------------
-- 3. [O-18] SCHEMA BIẾN THỂ SẢN PHẨM & TỒN KHO THEO SKU (CHUẨN PK & FK CSDLDEMO)
-- ------------------------------------------------------------------------------

-- Bảng 29: variant_flavor (Hương vị)
CREATE TABLE IF NOT EXISTS public.variant_flavor (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    flavor_name text UNIQUE NOT NULL,
    display_order integer NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Bảng 30: variant_size (Kích thước / Quy cách)
CREATE TABLE IF NOT EXISTS public.variant_size (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    size_name text UNIQUE NOT NULL,
    display_order integer NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Bảng 31: variant_color (Màu sắc)
CREATE TABLE IF NOT EXISTS public.variant_color (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    color_name text UNIQUE NOT NULL,
    hex_code text NOT NULL DEFAULT '#FFFFFF',
    display_order integer NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Bảng 27 (CSDLdemo): product_variant - Biến thể sản phẩm với SKU độc lập
CREATE TABLE IF NOT EXISTS public.product_variant (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL REFERENCES public.product(id) ON DELETE CASCADE,
    color_id uuid REFERENCES public.variant_color(id) ON DELETE SET NULL,
    size_id uuid REFERENCES public.variant_size(id) ON DELETE SET NULL,
    flavor_id uuid REFERENCES public.variant_flavor(id) ON DELETE SET NULL,
    sku_variant text UNIQUE NOT NULL,
    cost_price numeric(12,2) NOT NULL DEFAULT 0 CHECK (cost_price >= 0),
    sale_price numeric(12,2) NOT NULL DEFAULT 0 CHECK (sale_price >= 0),
    compare_at_price numeric(12,2) CHECK (compare_at_price IS NULL OR compare_at_price >= 0),
    weight numeric(10,2) CHECK (weight IS NULL OR weight >= 0),
    barcode text UNIQUE,
    status text NOT NULL DEFAULT 'dang_ban' CHECK (status IN ('dang_ban', 'tam_ngung', 'ngung_ban')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Chỉ mục Foreign Key cho product_variant
CREATE INDEX IF NOT EXISTS idx_product_variant_product_fk ON public.product_variant(product_id);
CREATE INDEX IF NOT EXISTS idx_product_variant_color_fk ON public.product_variant(color_id);
CREATE INDEX IF NOT EXISTS idx_product_variant_size_fk ON public.product_variant(size_id);
CREATE INDEX IF NOT EXISTS idx_product_variant_flavor_fk ON public.product_variant(flavor_id);
CREATE INDEX IF NOT EXISTS idx_product_variant_sku ON public.product_variant(sku_variant);

ALTER TABLE public.variant_flavor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variant_size ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variant_color ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variant ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.variant_flavor TO anon, authenticated;
GRANT SELECT ON public.variant_size TO anon, authenticated;
GRANT SELECT ON public.variant_color TO anon, authenticated;
GRANT SELECT ON public.product_variant TO anon, authenticated;
GRANT ALL ON public.product_variant TO authenticated;

DROP POLICY IF EXISTS product_variant_read_policy ON public.product_variant;
CREATE POLICY product_variant_read_policy ON public.product_variant FOR SELECT USING (true);

DROP POLICY IF EXISTS product_variant_staff_policy ON public.product_variant;
CREATE POLICY product_variant_staff_policy ON public.product_variant FOR ALL TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.staff WHERE auth_user_id = auth.uid() AND account_status = 'ACTIVE')
);

-- ------------------------------------------------------------------------------
-- 4. [S-08, S-14, S-23] BỔ SUNG CỘT BẢNG SERVICE (SOP CHECKLIST, HOA HỒNG, CẤP BẬC)
-- ------------------------------------------------------------------------------

ALTER TABLE public.service 
    ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,2) DEFAULT 0.00 CHECK (commission_rate >= 0 AND commission_rate <= 100),
    ADD COLUMN IF NOT EXISTS staff_level_required VARCHAR(50) DEFAULT 'ALL',
    ADD COLUMN IF NOT EXISTS pet_types JSONB DEFAULT '["cho","meo"]'::jsonb;

-- ------------------------------------------------------------------------------
-- 5. [S-11] RPC ĐẶT LỊCH AN TOÀN NGUYÊN TỬ (KIỂM TRA CHẶT FK & CHỐNG RACE CONDITION)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.pawpal_book_service_atomic(
    p_customer_id uuid,
    p_pet_id uuid,
    p_service_id uuid,
    p_staff_id uuid,
    p_appointment_date date,
    p_appointment_time time,
    p_duration_minutes integer,
    p_total_price numeric,
    p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_appointment_id uuid;
    v_start_time timestamptz;
    v_end_time timestamptz;
    v_conflict boolean;
    v_code text;
BEGIN
    -- 1. Xác thực sự tồn tại của Khóa Ngoại (Foreign Keys)
    IF NOT EXISTS (SELECT 1 FROM public.customer WHERE id = p_customer_id) THEN
        RAISE EXCEPTION 'Mã khách hàng (customer_id: %) không tồn tại trong hệ thống.', p_customer_id;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.pet_profile WHERE id = p_pet_id AND customer_id = p_customer_id) THEN
        RAISE EXCEPTION 'Thú cưng (pet_id: %) không thuộc sở hữu của khách hàng hoặc không tồn tại.', p_pet_id;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.service WHERE id = p_service_id) THEN
        RAISE EXCEPTION 'Dịch vụ (service_id: %) không tồn tại.', p_service_id;
    END IF;

    IF p_staff_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.staff WHERE id = p_staff_id AND account_status = 'ACTIVE') THEN
        RAISE EXCEPTION 'Kỹ thuật viên (staff_id: %) không tồn tại hoặc đã tạm khóa hoạt động.', p_staff_id;
    END IF;

    -- 2. Tính toán khoảng thời gian
    v_start_time := (p_appointment_date || ' ' || p_appointment_time)::timestamptz;
    v_end_time := v_start_time + (COALESCE(p_duration_minutes, 60) || ' minutes')::interval;

    -- 3. Khóa giao dịch cấp KTV để chống Race Condition khi nhiều máy đặt cùng lúc
    IF p_staff_id IS NOT NULL THEN
        PERFORM pg_advisory_xact_lock(hashtext('staff_booking_' || p_staff_id::text));

        SELECT EXISTS (
            SELECT 1 
            FROM public.appointment a
            WHERE a.staff_id = p_staff_id
              AND a.appointment_date = p_appointment_date
              AND a.appointment_status NOT IN ('da_huy', 'vang_mat', 'da_het_han')
              AND (
                  (a.appointment_date || ' ' || a.appointment_time)::timestamptz < v_end_time
                  AND
                  ((a.appointment_date || ' ' || a.appointment_time)::timestamptz + (INTERVAL '1 minute' * COALESCE(p_duration_minutes, 60))) > v_start_time
              )
        ) INTO v_conflict;

        IF v_conflict THEN
            RAISE EXCEPTION 'Kỹ thuật viên đã có ca hẹn trùng trong khung giờ này. Vui lòng chọn thời gian khác hoặc đổi KTV.';
        END IF;
    END IF;

    -- 4. Tạo mã lịch hẹn ngẫu nhiên an toàn
    v_code := 'APP-' || to_char(now(), 'YYYYMMDD') || '-' || upper(substring(gen_random_uuid()::text from 1 for 6));

    -- 5. Thêm ca hẹn an toàn (Khóa chính PK tự sinh, các FK được đảm bảo 100%)
    INSERT INTO public.appointment (
        id,
        appointment_code,
        customer_id,
        pet_id,
        service_id,
        staff_id,
        appointment_date,
        appointment_time,
        total_price,
        note,
        appointment_status,
        payment_status,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        v_code,
        p_customer_id,
        p_pet_id,
        p_service_id,
        p_staff_id,
        p_appointment_date,
        p_appointment_time,
        p_total_price,
        p_notes,
        'cho_xac_nhan',
        'chua_thanh_toan',
        now(),
        now()
    ) RETURNING id INTO v_appointment_id;

    RETURN v_appointment_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.pawpal_book_service_atomic TO authenticated;

-- ------------------------------------------------------------------------------
-- 6. [N-25] RPC TẠO VÀ DUYỆT ĐƠN NGHỈ/ĐỔI CA NGUYÊN TỬ (KIỂM SOÁT FK STAFF & AUTH)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.pawpal_create_and_approve_shift_request(
    p_request_type text,
    p_staff_id uuid,
    p_target_staff_id uuid,
    p_leave_type text,
    p_start_date date,
    p_end_date date,
    p_shift text,
    p_reason text
)
RETURNS public.staff_shift_request
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_req public.staff_shift_request;
BEGIN
    -- 1. Xác thực quyền Quản trị viên
    IF NOT EXISTS (
        SELECT 1 FROM public.staff 
        WHERE auth_user_id = auth.uid() 
          AND account_status = 'ACTIVE' 
          AND system_role IN ('ADMIN', 'MANAGER')
    ) THEN
        RAISE EXCEPTION 'Chỉ Quản trị viên hoặc Quản lý nhân sự mới có quyền tạo và duyệt ca làm việc ngay.';
    END IF;

    -- 2. Xác thực Khóa ngoại FK nhân viên
    IF NOT EXISTS (SELECT 1 FROM public.staff WHERE id = p_staff_id AND account_status = 'ACTIVE') THEN
        RAISE EXCEPTION 'Nhân viên đề xuất (staff_id: %) không tồn tại hoặc đã bị khóa.', p_staff_id;
    END IF;

    IF p_target_staff_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.staff WHERE id = p_target_staff_id AND account_status = 'ACTIVE') THEN
        RAISE EXCEPTION 'Nhân viên đổi ca (target_staff_id: %) không tồn tại hoặc đã bị khóa.', p_target_staff_id;
    END IF;

    -- 3. Tạo bản ghi đơn với trạng thái APPROVED ngay trong 1 Transaction
    INSERT INTO public.staff_shift_request (
        id,
        request_type,
        staff_id,
        target_staff_id,
        leave_type,
        start_date,
        end_date,
        shift,
        reason,
        status,
        created_by,
        reviewed_by,
        reviewed_at,
        created_at
    ) VALUES (
        gen_random_uuid(),
        p_request_type,
        p_staff_id,
        p_target_staff_id,
        p_leave_type,
        p_start_date,
        p_end_date,
        p_shift,
        p_reason,
        'APPROVED',
        auth.uid(),
        auth.uid(),
        now(),
        now()
    ) RETURNING * INTO v_req;

    RETURN v_req;
END;
$$;

GRANT EXECUTE ON FUNCTION public.pawpal_create_and_approve_shift_request TO authenticated;

-- ------------------------------------------------------------------------------
-- 7. [C-16] TÁCH BIỆT ĐIỂM XÉT HẠNG (TIER_POINTS) VÀ ĐỒNG BỘ FK MEMBERSHIP_TIER_ID
-- ------------------------------------------------------------------------------

-- Bổ sung cột tier_points vào bảng customer_membership
ALTER TABLE public.customer_membership
    ADD COLUMN IF NOT EXISTS tier_points INTEGER DEFAULT 0 CHECK (tier_points >= 0);

-- Trigger Function tự động cập nhật membership_tier_id (Khóa Ngoại liên kết bảng membership_tier)
CREATE OR REPLACE FUNCTION public.trg_fn_update_customer_membership_tier()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_tier_id uuid;
    v_points integer;
BEGIN
    v_points := COALESCE(NEW.tier_points, 0);

    -- Tìm ID của hạng thành viên tương ứng từ bảng membership_tier
    IF v_points >= 2000 THEN
        SELECT id INTO v_tier_id FROM public.membership_tier WHERE tier_name IN ('Kim Cương', 'DIAMOND') LIMIT 1;
    ELSIF v_points >= 800 THEN
        SELECT id INTO v_tier_id FROM public.membership_tier WHERE tier_name IN ('Vàng', 'GOLD') LIMIT 1;
    ELSIF v_points >= 300 THEN
        SELECT id INTO v_tier_id FROM public.membership_tier WHERE tier_name IN ('Bạc', 'SILVER') LIMIT 1;
    ELSE
        SELECT id INTO v_tier_id FROM public.membership_tier WHERE tier_name IN ('Đồng', 'BRONZE') LIMIT 1;
    END IF;

    IF v_tier_id IS NOT NULL THEN
        NEW.membership_tier_id := v_tier_id;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_customer_membership_tier ON public.customer_membership;
CREATE TRIGGER trg_customer_membership_tier
    BEFORE INSERT OR UPDATE OF tier_points ON public.customer_membership
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_fn_update_customer_membership_tier();

-- Đồng bộ dữ liệu khởi tạo cho khách hàng hiện có
UPDATE public.customer_membership
SET tier_points = COALESCE(total_paw_points, 0)
WHERE tier_points IS NULL OR tier_points = 0;

-- ------------------------------------------------------------------------------
-- 8. [N-29] BẢO MẬT THÔNG TIN LƯƠNG NHÂN SỰ (SECURE STAFF PUBLIC VIEW)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.staff_public_view AS
SELECT 
    id,
    auth_user_id,
    full_name,
    phone_number,
    role,
    specialization,
    hire_date,
    account_status,
    system_role,
    created_at,
    updated_at
FROM public.staff;

GRANT SELECT ON public.staff_public_view TO authenticated, anon;

COMMIT;

