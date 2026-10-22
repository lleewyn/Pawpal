-- Migration 046: Bổ sung session_token cho chat_conversation và cấp quyền Chatbot/Lịch trực cho vai trò anon/authenticated

BEGIN;

-- 1. Bổ sung cột session_token cho chat_conversation (để hỗ trợ khách vãng lai như thiết kế Master Plan)
ALTER TABLE public.chat_conversation ADD COLUMN IF NOT EXISTS session_token text;
CREATE INDEX IF NOT EXISTS idx_chat_conv_session_token ON public.chat_conversation (session_token);

-- 2. Cấp quyền thao tác cho vai trò anon và authenticated trên hội thoại chat
GRANT SELECT, INSERT, UPDATE ON public.chat_conversation TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.chat_message TO anon, authenticated;

DROP POLICY IF EXISTS anon_conv_access ON public.chat_conversation;
CREATE POLICY anon_conv_access ON public.chat_conversation FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS anon_msg_access ON public.chat_message;
CREATE POLICY anon_msg_access ON public.chat_message FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 3. Cấp quyền xem lịch trực nhân sự công khai khi đặt lịch hẹn
GRANT SELECT ON public.staff_schedule TO anon, authenticated;

DROP POLICY IF EXISTS anon_read_staff_schedule ON public.staff_schedule;
CREATE POLICY anon_read_staff_schedule ON public.staff_schedule FOR SELECT TO anon, authenticated USING (true);

NOTIFY pgrst, 'reload schema';

COMMIT;
