-- ==============================================================================
-- PAWPAL CHATBOT CSAT & CLOSE SESSION MIGRATION (PHASE 1)
-- File: scripts/database/20261007_chatbot_csat_close_session.sql
-- Mô tả: Bổ sung các trường lưu trữ trạng thái đóng ca (resolved_at, resolved_reason)
--        và kết quả đánh giá mức độ hài lòng khách hàng CSAT (csat_score, csat_feedback, csat_tags).
-- Tuân thủ nghiêm ngặt: AGENTS.md (100% Supabase Live DB - Zero JSON Mock)
-- ==============================================================================

BEGIN;

-- 1. Bổ sung các cột vào bảng chat_conversation
ALTER TABLE public.chat_conversation 
    ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS resolved_reason TEXT,
    ADD COLUMN IF NOT EXISTS csat_score INT CHECK (csat_score BETWEEN 1 AND 5),
    ADD COLUMN IF NOT EXISTS csat_feedback TEXT,
    ADD COLUMN IF NOT EXISTS csat_tags JSONB;

-- 2. Chỉ mục tối ưu truy vấn báo cáo CSAT
CREATE INDEX IF NOT EXISTS idx_chat_conversation_csat_score 
    ON public.chat_conversation (csat_score, resolved_at DESC);

-- 3. Tạo bảng chat_rating chuyên biệt (nếu muốn lưu trữ chi tiết phản hồi đánh giá)
CREATE TABLE IF NOT EXISTS public.chat_rating (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.chat_conversation(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customer(id) ON DELETE SET NULL,
    staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
    score INT NOT NULL CHECK (score BETWEEN 1 AND 5),
    feedback TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_rating_conv ON public.chat_rating (conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_rating_score ON public.chat_rating (score, created_at DESC);

-- 4. Kích hoạt RLS cho bảng chat_rating
ALTER TABLE public.chat_rating ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Khách hàng tạo đánh giá chat" ON public.chat_rating;
DROP POLICY IF EXISTS "Khách hàng xem đánh giá của mình" ON public.chat_rating;
DROP POLICY IF EXISTS "Nhân viên và Admin toàn quyền trên chat_rating" ON public.chat_rating;

CREATE POLICY "Khách hàng tạo đánh giá chat"
ON public.chat_rating
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Khách hàng xem đánh giá của mình"
ON public.chat_rating
FOR SELECT
TO public
USING (true);

CREATE POLICY "Nhân viên và Admin toàn quyền trên chat_rating"
ON public.chat_rating
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 5. Đăng ký chat_rating vào Realtime publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chat_rating'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_rating;
    END IF;
END $$;

COMMIT;
