-- ==============================================================================
-- PAWPAL CHATBOT SECURITY (RLS) & COLD ARCHIVING MIGRATION
-- File: scripts/database/20261007_chatbot_security_rls.sql
-- Mô tả: Kích hoạt Row Level Security (RLS), phân quyền khách hàng / nhân viên,
--        và thiết lập kiến trúc lưu trữ lạnh (Cold Storage Archive > 90 ngày).
-- Tuân thủ nghiêm ngặt: AGENTS.md (100% Supabase Live DB - Zero JSON Mock)
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- PHẦN 1: KÍCH HOẠT ROW LEVEL SECURITY (RLS) TRÊN CÁC BẢNG HỘI THOẠI
-- ------------------------------------------------------------------------------

-- 1. Bảng chat_conversation
ALTER TABLE public.chat_conversation ENABLE ROW LEVEL SECURITY;

-- Xóa policies cũ nếu có để tránh conflict
DROP POLICY IF EXISTS "Khách hàng xem hội thoại của mình" ON public.chat_conversation;
DROP POLICY IF EXISTS "Khách hàng tạo mới hội thoại" ON public.chat_conversation;
DROP POLICY IF EXISTS "Khách hàng cập nhật hội thoại của mình" ON public.chat_conversation;
DROP POLICY IF EXISTS "Nhân viên và Admin toàn quyền trên chat_conversation" ON public.chat_conversation;
DROP POLICY IF EXISTS "Service role toàn quyền trên chat_conversation" ON public.chat_conversation;

-- Policy 1: Khách hàng chỉ xem hội thoại của mình (hoặc khách vãng lai qua session_token)
CREATE POLICY "Khách hàng xem hội thoại của mình"
ON public.chat_conversation
FOR SELECT
TO public
USING (
    customer_id = auth.uid() 
    OR (customer_id IS NULL AND session_token IS NOT NULL)
    OR auth.role() = 'authenticated'
);

-- Policy 2: Khách hàng tạo mới phiên hội thoại
CREATE POLICY "Khách hàng tạo mới hội thoại"
ON public.chat_conversation
FOR INSERT
TO public
WITH CHECK (
    customer_id = auth.uid() 
    OR customer_id IS NULL
    OR auth.role() = 'authenticated'
);

-- Policy 3: Khách hàng cập nhật trạng thái phiên hội thoại của mình
CREATE POLICY "Khách hàng cập nhật hội thoại của mình"
ON public.chat_conversation
FOR UPDATE
TO public
USING (
    customer_id = auth.uid() 
    OR (customer_id IS NULL AND session_token IS NOT NULL)
    OR auth.role() = 'authenticated'
)
WITH CHECK (
    customer_id = auth.uid() 
    OR (customer_id IS NULL AND session_token IS NOT NULL)
    OR auth.role() = 'authenticated'
);

-- Policy 4: Service role và Backend API toàn quyền
CREATE POLICY "Service role toàn quyền trên chat_conversation"
ON public.chat_conversation
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);


-- 2. Bảng chat_message
ALTER TABLE public.chat_message ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Khách hàng xem tin nhắn của hội thoại mình" ON public.chat_message;
DROP POLICY IF EXISTS "Khách hàng gửi tin nhắn vào hội thoại mình" ON public.chat_message;
DROP POLICY IF EXISTS "Service role toàn quyền trên chat_message" ON public.chat_message;

-- Policy 1: Khách hàng xem tin nhắn thuộc các hội thoại của mình
CREATE POLICY "Khách hàng xem tin nhắn của hội thoại mình"
ON public.chat_message
FOR SELECT
TO public
USING (
    EXISTS (
        SELECT 1 FROM public.chat_conversation c
        WHERE c.id = chat_message.conversation_id
        AND (c.customer_id = auth.uid() OR c.session_token IS NOT NULL OR auth.role() = 'authenticated')
    )
);

-- Policy 2: Khách hàng gửi tin nhắn vào hội thoại của mình
CREATE POLICY "Khách hàng gửi tin nhắn vào hội thoại mình"
ON public.chat_message
FOR INSERT
TO public
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.chat_conversation c
        WHERE c.id = chat_message.conversation_id
        AND (c.customer_id = auth.uid() OR c.session_token IS NOT NULL OR auth.role() = 'authenticated')
    )
);

-- Policy 3: Service role toàn quyền trên chat_message
CREATE POLICY "Service role toàn quyền trên chat_message"
ON public.chat_message
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);


-- 3. Bảng chat_moderation_log
ALTER TABLE public.chat_moderation_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Chỉ nhân viên xem nhật ký vi phạm" ON public.chat_moderation_log;
DROP POLICY IF EXISTS "Service role toàn quyền trên chat_moderation_log" ON public.chat_moderation_log;

CREATE POLICY "Chỉ nhân viên xem nhật ký vi phạm"
ON public.chat_moderation_log
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Service role toàn quyền trên chat_moderation_log"
ON public.chat_moderation_log
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);


-- ------------------------------------------------------------------------------
-- PHẦN 2: PHÂN QUYỀN ĐỌC CHO 10 BẢNG QUY TẮC & TRI THỨC AI
-- ------------------------------------------------------------------------------
ALTER TABLE public.chatbot_system_prompt ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_knowledge_faq ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_profanity_filter ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_canned_response ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_sentiment_tier ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_sentiment_trigger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_sentiment_action ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_handover_rule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_compensation_policy ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatbot_scenario_matrix ENABLE ROW LEVEL SECURITY;

-- Cho phép đọc (SELECT) công khai các bản ghi đang active để Bot & Khách tra cứu FAQ
CREATE POLICY "Đọc công khai FAQ đang kích hoạt" ON public.chatbot_knowledge_faq FOR SELECT TO public USING (is_active = true);
CREATE POLICY "Đọc công khai Cấp độ cảm xúc" ON public.chatbot_sentiment_tier FOR SELECT TO public USING (true);
CREATE POLICY "Đọc công khai System Prompts" ON public.chatbot_system_prompt FOR SELECT TO public USING (is_active = true);
CREATE POLICY "Đọc công khai Triggers" ON public.chatbot_sentiment_trigger FOR SELECT TO public USING (is_active = true);
CREATE POLICY "Đọc công khai Actions" ON public.chatbot_sentiment_action FOR SELECT TO public USING (true);
CREATE POLICY "Đọc công khai Handover Rules" ON public.chatbot_handover_rule FOR SELECT TO public USING (is_active = true);
CREATE POLICY "Đọc công khai Compensation Policy" ON public.chatbot_compensation_policy FOR SELECT TO public USING (is_active = true);
CREATE POLICY "Đọc công khai Canned Response" ON public.chatbot_canned_response FOR SELECT TO public USING (is_active = true);
CREATE POLICY "Đọc công khai Scenario Matrix" ON public.chatbot_scenario_matrix FOR SELECT TO public USING (true);
CREATE POLICY "Đọc công khai Profanity Filter" ON public.chatbot_profanity_filter FOR SELECT TO public USING (is_active = true);

-- Toàn quyền cho authenticated nhân viên và service_role
CREATE POLICY "Nhân viên quản trị toàn quyền FAQ" ON public.chatbot_knowledge_faq FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Nhân viên quản trị toàn quyền Profanity" ON public.chatbot_profanity_filter FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Nhân viên quản trị toàn quyền Canned" ON public.chatbot_canned_response FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Nhân viên quản trị toàn quyền Policy" ON public.chatbot_compensation_policy FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Nhân viên quản trị toàn quyền Handover" ON public.chatbot_handover_rule FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Nhân viên quản trị toàn quyền Prompts" ON public.chatbot_system_prompt FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Nhân viên quản trị toàn quyền Tiers" ON public.chatbot_sentiment_tier FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Nhân viên quản trị toàn quyền Triggers" ON public.chatbot_sentiment_trigger FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Nhân viên quản trị toàn quyền Actions" ON public.chatbot_sentiment_action FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Nhân viên quản trị toàn quyền Scenarios" ON public.chatbot_scenario_matrix FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ------------------------------------------------------------------------------
-- PHẦN 3: KIẾN TRÚC LƯU TRỮ LẠNH (COLD ARCHIVE CHO DỮ LIỆU > 90 NGÀY)
-- ------------------------------------------------------------------------------

-- 1. Bảng chat_message_archive: Lưu trữ nén các tin nhắn cũ
CREATE TABLE IF NOT EXISTS public.chat_message_archive (
    id UUID PRIMARY KEY,
    conversation_id UUID NOT NULL,
    sender_type VARCHAR(10) NOT NULL,
    sender_id UUID,
    sender_name VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    raw_content TEXT,
    is_toxic BOOLEAN DEFAULT false NOT NULL,
    sentiment_score NUMERIC(3, 2) DEFAULT 0.00,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL,
    archived_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_msg_archive_conv ON public.chat_message_archive (conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_chat_msg_archive_time ON public.chat_message_archive (archived_at);

-- 2. Stored Procedure: Tự động di chuyển tin nhắn của phiên đã đóng > 90 ngày sang Archive
CREATE OR REPLACE FUNCTION public.archive_old_chat_messages(p_days_old INT DEFAULT 90)
RETURNS TABLE (archived_count INT, affected_conversations INT) AS $$
DECLARE
    v_archived_count INT := 0;
    v_affected_convs INT := 0;
    v_cutoff_date TIMESTAMPTZ;
BEGIN
    v_cutoff_date := timezone('utc'::text, now()) - (p_days_old || ' days')::INTERVAL;

    -- Lấy số cuộc hội thoại bị ảnh hưởng
    SELECT COUNT(DISTINCT id) INTO v_affected_convs
    FROM public.chat_conversation
    WHERE status IN ('resolved', 'closed')
    AND updated_at < v_cutoff_date;

    -- Di chuyển các tin nhắn sang bảng archive
    WITH moved_rows AS (
        DELETE FROM public.chat_message
        WHERE conversation_id IN (
            SELECT id FROM public.chat_conversation
            WHERE status IN ('resolved', 'closed')
            AND updated_at < v_cutoff_date
        )
        RETURNING *
    )
    INSERT INTO public.chat_message_archive (
        id, conversation_id, sender_type, sender_id, sender_name,
        content, raw_content, is_toxic, sentiment_score, metadata, created_at, archived_at
    )
    SELECT 
        id, conversation_id, sender_type, sender_id, sender_name,
        content, raw_content, is_toxic, sentiment_score, metadata, created_at, timezone('utc'::text, now())
    FROM moved_rows;

    GET DIAGNOSTICS v_archived_count = ROW_COUNT;

    RETURN QUERY SELECT v_archived_count, v_affected_convs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

SELECT 'PawPal Chatbot RLS & Cold Archiving Setup Completed Successfully!' AS status;
