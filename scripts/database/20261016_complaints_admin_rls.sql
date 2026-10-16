-- Cho phép nhân sự và quản trị viên đọc, ghi và xử lý toàn bộ khiếu nại (support_ticket và support_ticket_message) từ Cổng Quản trị Pawpal-er.
BEGIN;

ALTER TABLE IF EXISTS public.support_ticket ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.support_ticket_message ENABLE ROW LEVEL SECURITY;

-- Cấp quyền thao tác cho authenticated và anon
GRANT SELECT, INSERT, UPDATE ON public.support_ticket TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.support_ticket_message TO anon, authenticated;

-- Policy đọc vé khiếu nại cho Admin & Khách hàng
DROP POLICY IF EXISTS "support_ticket_select_policy" ON public.support_ticket;
CREATE POLICY "support_ticket_select_policy"
    ON public.support_ticket
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Policy tạo mới vé khiếu nại
DROP POLICY IF EXISTS "support_ticket_insert_policy" ON public.support_ticket;
CREATE POLICY "support_ticket_insert_policy"
    ON public.support_ticket
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Policy cập nhật trạng thái khiếu nại
DROP POLICY IF EXISTS "support_ticket_update_policy" ON public.support_ticket;
CREATE POLICY "support_ticket_update_policy"
    ON public.support_ticket
    FOR UPDATE
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- Policy đọc tin nhắn khiếu nại
DROP POLICY IF EXISTS "support_ticket_message_select_policy" ON public.support_ticket_message;
CREATE POLICY "support_ticket_message_select_policy"
    ON public.support_ticket_message
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Policy gửi tin nhắn khiếu nại
DROP POLICY IF EXISTS "support_ticket_message_insert_policy" ON public.support_ticket_message;
CREATE POLICY "support_ticket_message_insert_policy"
    ON public.support_ticket_message
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

COMMIT;
