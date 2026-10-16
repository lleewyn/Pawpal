-- ==============================================================================
-- PAWPAL-ER ADMIN COPILOT PERSISTENT CHAT HISTORY MIGRATION
-- File: scripts/database/20261017_admin_copilot_history.sql
-- Description: Khởi tạo bảng admin_copilot_history lưu trữ vĩnh viễn lịch sử
--              tra cứu nghiệp vụ và tương tác với Gemini AI của nhân viên/quản trị viên.
-- ==============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.admin_copilot_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE,
    staff_name VARCHAR(150),
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'model', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Chỉ mục tối ưu tốc độ tải lịch sử theo nhân sự và thời gian
CREATE INDEX IF NOT EXISTS idx_copilot_history_staff_created 
    ON public.admin_copilot_history (staff_id, created_at ASC);

-- Cấp quyền thao tác cho anon, authenticated và service_role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_copilot_history TO anon, authenticated, service_role;

-- Cấu hình RLS bảo mật
ALTER TABLE IF EXISTS public.admin_copilot_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_copilot_history_all_policy" ON public.admin_copilot_history;
CREATE POLICY "admin_copilot_history_all_policy"
    ON public.admin_copilot_history
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

COMMIT;
