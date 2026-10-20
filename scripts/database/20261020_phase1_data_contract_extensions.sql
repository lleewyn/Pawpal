-- PawPal - Giai đoạn 1: hợp đồng dữ liệu bổ sung để giữ chức năng Admin.
-- Phạm vi không gồm SMS/Zalo thật; các nút liên quan chỉ mô phỏng ở tầng giao diện.
-- Migration chỉ bổ sung cấu trúc, không backfill dữ liệu suy đoán và không xóa dữ liệu cũ.

BEGIN;

-- Chặn chạy nhầm trên schema thiếu nền tảng thiết kế.
DO $$
DECLARE
    required_table text;
BEGIN
    FOREACH required_table IN ARRAY ARRAY[
        'customer', 'customer_membership', 'membership_tier', 'staff', 'pet_profile',
        'service', 'service_addon', 'appointment', 'payment', 'refund_transaction',
        'chat_conversation'
    ]
    LOOP
        IF to_regclass('public.' || required_table) IS NULL THEN
            RAISE EXCEPTION 'Thiếu bảng nền public.% - dừng migration giai đoạn 1', required_table;
        END IF;
    END LOOP;
END $$;

-- Hàm quyền dùng account_status dạng text để tương thích dữ liệu đã Việt hóa và dữ liệu cũ.
CREATE OR REPLACE FUNCTION public.pawpal_is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.staff s
        WHERE s.auth_user_id = auth.uid()
          AND s.account_status::text IN ('dang_hoat_dong', 'ACTIVE')
    )
$$;
REVOKE ALL ON FUNCTION public.pawpal_is_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pawpal_is_staff() TO authenticated, service_role;

-- 1. Lịch sử sát hạch. staff.skill_score vẫn là giá trị hiện tại để hiển thị nhanh.
CREATE TABLE IF NOT EXISTS public.staff_assessment (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE RESTRICT,
    assessment_date date NOT NULL,
    assessment_type text NOT NULL,
    score numeric(5,2) NOT NULL CHECK (score BETWEEN 0 AND 100),
    result text NOT NULL CHECK (result IN ('dat', 'khong_dat', 'can_dao_tao_lai')),
    note text,
    assessed_by uuid NOT NULL REFERENCES public.staff(id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_staff_assessment_staff_date
    ON public.staff_assessment (staff_id, assessment_date DESC, created_at DESC);

-- 2. Lịch sử Copilot tách khỏi hội thoại khách hàng. Không cấp quyền anon.
CREATE TABLE IF NOT EXISTS public.admin_copilot_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id uuid NOT NULL DEFAULT gen_random_uuid(),
    staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE RESTRICT,
    role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content text NOT NULL CHECK (length(btrim(content)) > 0),
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata) = 'object'),
    created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_copilot_history ADD COLUMN IF NOT EXISTS session_id uuid;
UPDATE public.admin_copilot_history SET session_id = gen_random_uuid() WHERE session_id IS NULL;
ALTER TABLE public.admin_copilot_history ALTER COLUMN session_id SET DEFAULT gen_random_uuid();
ALTER TABLE public.admin_copilot_history ALTER COLUMN session_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_admin_copilot_staff_session_created
    ON public.admin_copilot_history (staff_id, session_id, created_at);
REVOKE ALL ON public.admin_copilot_history FROM anon;
DROP POLICY IF EXISTS "admin_copilot_history_all_policy" ON public.admin_copilot_history;

-- 3. Đóng hội thoại và CSAT có dữ liệu đối soát.
ALTER TABLE public.chat_conversation
    ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
    ADD COLUMN IF NOT EXISTS resolved_reason text,
    ADD COLUMN IF NOT EXISTS resolved_by uuid REFERENCES public.staff(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_chat_conversation_resolved_at
    ON public.chat_conversation (resolved_at DESC) WHERE resolved_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.chat_feedback (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid NOT NULL REFERENCES public.chat_conversation(id) ON DELETE CASCADE,
    customer_id uuid REFERENCES public.customer(id) ON DELETE SET NULL,
    score smallint NOT NULL CHECK (score BETWEEN 1 AND 5),
    comment text,
    submitted_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_chat_feedback_conversation UNIQUE (conversation_id)
);
CREATE INDEX IF NOT EXISTS idx_chat_feedback_score_time
    ON public.chat_feedback (score, submitted_at DESC);

-- 4. Dòng dịch vụ/addon của lịch hẹn, giữ snapshot giá và thời lượng.
CREATE TABLE IF NOT EXISTS public.appointment_item (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id uuid NOT NULL REFERENCES public.appointment(id) ON DELETE CASCADE,
    item_type text NOT NULL CHECK (item_type IN ('dich_vu', 'dich_vu_kem')),
    service_id uuid REFERENCES public.service(id) ON DELETE RESTRICT,
    service_addon_id uuid REFERENCES public.service_addon(id) ON DELETE RESTRICT,
    name_snapshot text NOT NULL,
    quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price numeric(14,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
    duration_minutes integer NOT NULL DEFAULT 0 CHECK (duration_minutes >= 0),
    staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
    status text NOT NULL DEFAULT 'dang_ap_dung'
        CHECK (status IN ('dang_ap_dung', 'da_hoan_tat', 'da_huy')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_appointment_item_source CHECK (
        (item_type = 'dich_vu' AND service_id IS NOT NULL AND service_addon_id IS NULL)
        OR
        (item_type = 'dich_vu_kem' AND service_id IS NULL AND service_addon_id IS NOT NULL)
    )
);
CREATE INDEX IF NOT EXISTS idx_appointment_item_appointment
    ON public.appointment_item (appointment_id, created_at);

-- 5. Chuyến Pet Taxi. Địa chỉ và giá được snapshot tại thời điểm đặt.
CREATE TABLE IF NOT EXISTS public.taxi_trip (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id uuid NOT NULL REFERENCES public.appointment(id) ON DELETE CASCADE,
    driver_staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
    pickup_address text NOT NULL,
    dropoff_address text NOT NULL,
    distance_km numeric(8,2) NOT NULL CHECK (distance_km > 0),
    trip_type text NOT NULL CHECK (trip_type IN ('mot_chieu', 'khu_hoi')),
    outbound_at timestamptz NOT NULL,
    return_at timestamptz,
    taxi_price_rule_id uuid REFERENCES public.taxi_price_rule(id) ON DELETE SET NULL,
    quoted_amount numeric(14,2) NOT NULL CHECK (quoted_amount >= 0),
    status text NOT NULL DEFAULT 'cho_dieu_phoi'
        CHECK (status IN ('cho_dieu_phoi', 'da_dieu_phoi', 'dang_di', 'da_hoan_tat', 'da_huy')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_taxi_trip_appointment UNIQUE (appointment_id),
    CONSTRAINT ck_taxi_trip_return CHECK (
        (trip_type = 'mot_chieu' AND return_at IS NULL)
        OR (trip_type = 'khu_hoi' AND return_at IS NOT NULL AND return_at > outbound_at)
    )
);
CREATE INDEX IF NOT EXISTS idx_taxi_trip_driver_time
    ON public.taxi_trip (driver_staff_id, outbound_at) WHERE driver_staff_id IS NOT NULL;

-- 6. Biên bản tiếp nhận/bàn giao. Nội dung có phiên bản để nâng cấp không mất dữ liệu cũ.
CREATE TABLE IF NOT EXISTS public.appointment_record (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id uuid NOT NULL REFERENCES public.appointment(id) ON DELETE CASCADE,
    record_type text NOT NULL CHECK (record_type IN ('tiep_nhan', 'ban_giao')),
    schema_version smallint NOT NULL DEFAULT 1 CHECK (schema_version > 0),
    recorded_by uuid NOT NULL REFERENCES public.staff(id) ON DELETE RESTRICT,
    recorded_at timestamptz NOT NULL DEFAULT now(),
    structured_content jsonb NOT NULL DEFAULT '{}'::jsonb
        CHECK (jsonb_typeof(structured_content) = 'object'),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_appointment_record_version UNIQUE
        (appointment_id, record_type, schema_version)
);
CREATE INDEX IF NOT EXISTS idx_appointment_record_appointment
    ON public.appointment_record (appointment_id, record_type, recorded_at DESC);

-- 7. Sự cố, gia hạn và phụ phí của từng ca.
CREATE TABLE IF NOT EXISTS public.appointment_adjustment (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id uuid NOT NULL REFERENCES public.appointment(id) ON DELETE CASCADE,
    adjustment_type text NOT NULL
        CHECK (adjustment_type IN ('gia_han', 'phu_phi', 'giam_tru', 'su_co')),
    duration_delta_minutes integer NOT NULL DEFAULT 0,
    amount_delta numeric(14,2) NOT NULL DEFAULT 0,
    reason text NOT NULL CHECK (length(btrim(reason)) > 0),
    proposed_by uuid NOT NULL REFERENCES public.staff(id) ON DELETE RESTRICT,
    approved_by uuid REFERENCES public.staff(id) ON DELETE RESTRICT,
    approval_status text NOT NULL DEFAULT 'cho_duyet'
        CHECK (approval_status IN ('cho_duyet', 'da_duyet', 'tu_choi', 'da_huy')),
    customer_consent_status text NOT NULL DEFAULT 'khong_yeu_cau'
        CHECK (customer_consent_status IN ('khong_yeu_cau', 'cho_xac_nhan', 'da_dong_y', 'tu_choi')),
    created_at timestamptz NOT NULL DEFAULT now(),
    approved_at timestamptz,
    CONSTRAINT ck_appointment_adjustment_effect CHECK (
        duration_delta_minutes <> 0 OR amount_delta <> 0 OR adjustment_type = 'su_co'
    ),
    CONSTRAINT ck_appointment_adjustment_approval CHECK (
        (approval_status = 'da_duyet' AND approved_by IS NOT NULL AND approved_at IS NOT NULL)
        OR approval_status <> 'da_duyet'
    )
);
CREATE INDEX IF NOT EXISTS idx_appointment_adjustment_appointment
    ON public.appointment_adjustment (appointment_id, approval_status, created_at DESC);

-- 8. Phân bổ khoản thu/hoàn: nguồn chuẩn cho chi tiêu xét hạng.
ALTER TABLE public.payment ADD COLUMN IF NOT EXISTS succeeded_at timestamptz;

CREATE TABLE IF NOT EXISTS public.payment_allocation (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id uuid NOT NULL REFERENCES public.payment(id) ON DELETE RESTRICT,
    allocation_type text NOT NULL
        CHECK (allocation_type IN ('hang_hoa', 'dich_vu', 'phi_giao_hang', 'tien_coc', 'khac')),
    source_entity_type text NOT NULL CHECK (source_entity_type IN ('don_hang', 'lich_hen', 'dat_phong')),
    source_entity_id uuid NOT NULL,
    gross_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (gross_amount >= 0),
    discount_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    pawpoint_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (pawpoint_amount >= 0),
    eligible_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (eligible_amount >= 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_payment_allocation_amounts CHECK (
        discount_amount + pawpoint_amount <= gross_amount
        AND eligible_amount <= gross_amount - discount_amount - pawpoint_amount
        AND (allocation_type <> 'phi_giao_hang' OR eligible_amount = 0)
    )
);
CREATE INDEX IF NOT EXISTS idx_payment_allocation_payment
    ON public.payment_allocation (payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocation_source
    ON public.payment_allocation (source_entity_type, source_entity_id);

CREATE TABLE IF NOT EXISTS public.refund_allocation (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    refund_transaction_id uuid NOT NULL REFERENCES public.refund_transaction(id) ON DELETE RESTRICT,
    payment_allocation_id uuid NOT NULL REFERENCES public.payment_allocation(id) ON DELETE RESTRICT,
    refunded_amount numeric(14,2) NOT NULL CHECK (refunded_amount > 0),
    eligible_refund_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (eligible_refund_amount >= 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_refund_allocation_eligible CHECK (eligible_refund_amount <= refunded_amount),
    CONSTRAINT uq_refund_payment_allocation UNIQUE (refund_transaction_id, payment_allocation_id)
);
CREATE INDEX IF NOT EXISTS idx_refund_allocation_payment_allocation
    ON public.refund_allocation (payment_allocation_id);

-- 9. Lịch sử sức khỏe pet có cấu trúc.
ALTER TABLE public.pet_weight_history
    ADD COLUMN IF NOT EXISTS note text,
    ADD COLUMN IF NOT EXISTS recorded_by uuid REFERENCES public.staff(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.pet_vaccination (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id uuid NOT NULL REFERENCES public.pet_profile(id) ON DELETE CASCADE,
    vaccine_name text NOT NULL,
    vaccinated_at date NOT NULL,
    provider_name text,
    next_due_at date,
    status text NOT NULL DEFAULT 'da_tiem'
        CHECK (status IN ('da_tiem', 'qua_han', 'da_huy')),
    note text,
    recorded_by uuid REFERENCES public.staff(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_pet_vaccination_due CHECK (next_due_at IS NULL OR next_due_at >= vaccinated_at)
);
CREATE INDEX IF NOT EXISTS idx_pet_vaccination_pet_date
    ON public.pet_vaccination (pet_id, vaccinated_at DESC);

-- RLS: bảng nghiệp vụ Admin chỉ cho nhân viên đã ánh xạ Auth; service_role bỏ qua RLS.
DO $$
DECLARE
    table_name text;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'staff_assessment', 'admin_copilot_history', 'appointment_item', 'taxi_trip',
        'appointment_record', 'appointment_adjustment', 'payment_allocation',
        'refund_allocation', 'pet_vaccination'
    ]
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
        EXECUTE format('REVOKE ALL ON public.%I FROM anon', table_name);
        EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', table_name);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', table_name || '_staff_access', table_name);
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.pawpal_is_staff()) WITH CHECK (public.pawpal_is_staff())',
            table_name || '_staff_access', table_name
        );
    END LOOP;
END $$;

ALTER TABLE public.chat_feedback ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.chat_feedback FROM anon;
GRANT SELECT, INSERT ON public.chat_feedback TO authenticated;
DROP POLICY IF EXISTS chat_feedback_staff_access ON public.chat_feedback;
CREATE POLICY chat_feedback_staff_access ON public.chat_feedback
    FOR ALL TO authenticated
    USING (public.pawpal_is_staff())
    WITH CHECK (public.pawpal_is_staff());
DROP POLICY IF EXISTS chat_feedback_customer_insert ON public.chat_feedback;
CREATE POLICY chat_feedback_customer_insert ON public.chat_feedback
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.chat_conversation c
            JOIN public.customer cu ON cu.id = c.customer_id
            WHERE c.id = conversation_id
              AND cu.auth_user_id = auth.uid()
              AND (customer_id IS NULL OR customer_id = c.customer_id)
        )
    );

-- Copilot: nhân viên chỉ đọc/ghi lịch sử của chính mình.
DROP POLICY IF EXISTS admin_copilot_history_staff_access ON public.admin_copilot_history;
CREATE POLICY admin_copilot_history_staff_access ON public.admin_copilot_history
    FOR ALL TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.staff s
        WHERE s.id = staff_id AND s.auth_user_id = auth.uid()
          AND s.account_status::text IN ('dang_hoat_dong', 'ACTIVE')
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.staff s
        WHERE s.id = staff_id AND s.auth_user_id = auth.uid()
          AND s.account_status::text IN ('dang_hoat_dong', 'ACTIVE')
    ));

COMMIT;

