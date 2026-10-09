-- Lịch sử cân nặng thực tế cho hồ sơ thú cưng.
CREATE TABLE IF NOT EXISTS public.pet_weight_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id uuid NOT NULL REFERENCES public.pet_profile(id) ON DELETE CASCADE,
    weight numeric(6, 2) NOT NULL CHECK (weight > 0),
    measured_at timestamptz NOT NULL DEFAULT now(),
    recorded_by_name text NOT NULL DEFAULT 'Nhân viên PawPal',
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pet_weight_history_pet_measured
    ON public.pet_weight_history (pet_id, measured_at DESC);

ALTER TABLE public.pet_weight_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Nhân viên quản trị lịch sử cân nặng" ON public.pet_weight_history;
CREATE POLICY "Nhân viên quản trị lịch sử cân nặng"
    ON public.pet_weight_history
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Service role toàn quyền lịch sử cân nặng" ON public.pet_weight_history;
CREATE POLICY "Service role toàn quyền lịch sử cân nặng"
    ON public.pet_weight_history
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
