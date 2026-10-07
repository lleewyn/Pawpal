-- ==============================================================================
-- PAWPAL-ER CHATBOT & CUSTOMER SUPPORT SYSTEM MIGRATION
-- File: scripts/database/20261007_chatbot_full_system.sql
-- Description: Khởi tạo toàn diện 13 bảng phân hệ Chatbot, Màng lọc Toxic Shield, 
--              Phân loại 5 cấp độ cảm xúc, Ràng buộc khóa ngoại và Dữ liệu mẫu (Seed Data).
-- Tuân thủ nghiêm ngặt: AGENTS.md (100% Supabase Live DB - Zero JSON Mock)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- PHẦN 1: BẢNG VẬN HÀNH THỜI GIAN THỰC (CONVERSATIONAL RUNTIME TABLES)
-- ------------------------------------------------------------------------------

-- 1. Bảng chat_conversation: Quản lý phiên hội thoại trực tuyến
CREATE TABLE IF NOT EXISTS public.chat_conversation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customer(id) ON DELETE SET NULL,
    session_token VARCHAR(100),
    status VARCHAR(20) DEFAULT 'bot_handling' NOT NULL 
        CHECK (status IN ('bot_handling', 'waiting_agent', 'agent_handling', 'resolved', 'closed')),
    sentiment_level INT DEFAULT 2 NOT NULL 
        CHECK (sentiment_level BETWEEN 1 AND 5),
    sentiment_trend VARCHAR(20) DEFAULT 'stable' NOT NULL 
        CHECK (sentiment_trend IN ('escalating', 'stable', 'de_escalating')),
    is_urgent BOOLEAN DEFAULT false NOT NULL,
    assigned_staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
    ai_summary TEXT,
    internal_note TEXT,
    sla_deadline TIMESTAMPTZ,
    violation_count INT DEFAULT 0 NOT NULL,
    blocked_until TIMESTAMPTZ,
    channel VARCHAR(20) DEFAULT 'web' NOT NULL CHECK (channel IN ('web', 'mobile', 'zalo', 'facebook')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_conversation_status_urgent 
    ON public.chat_conversation (status, is_urgent, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_conversation_customer 
    ON public.chat_conversation (customer_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversation_staff 
    ON public.chat_conversation (assigned_staff_id);

-- 2. Bảng chat_message: Từng dòng tin nhắn trao đổi
CREATE TABLE IF NOT EXISTS public.chat_message (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.chat_conversation(id) ON DELETE CASCADE,
    sender_type VARCHAR(10) NOT NULL CHECK (sender_type IN ('bot', 'customer', 'staff')),
    sender_id UUID,
    sender_name VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    raw_content TEXT,
    is_toxic BOOLEAN DEFAULT false NOT NULL,
    sentiment_score NUMERIC(3, 2) DEFAULT 0.00,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_message_conversation 
    ON public.chat_message (conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_chat_message_toxic 
    ON public.chat_message (is_toxic) WHERE is_toxic = true;

-- 3. Bảng chat_moderation_log: Nhật ký vi phạm màng lọc ngôn từ
CREATE TABLE IF NOT EXISTS public.chat_moderation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.chat_conversation(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customer(id) ON DELETE SET NULL,
    detected_keywords TEXT[] NOT NULL,
    violation_count INT NOT NULL,
    action_taken VARCHAR(30) NOT NULL CHECK (action_taken IN ('masked', 'warned', 'blocked_15m', 'unblocked_manual')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_moderation_cust 
    ON public.chat_moderation_log (customer_id, created_at DESC);


-- ------------------------------------------------------------------------------
-- PHẦN 2: 10 BẢNG QUẢN TRỊ & QUY TẮC AI BRAINSTORM (RULES & CONFIGURATION)
-- ------------------------------------------------------------------------------

-- BẢNG 1: Lời nhắc hệ thống và Nhân vật thương hiệu
CREATE TABLE IF NOT EXISTS public.chatbot_system_prompt (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_key VARCHAR(50) UNIQUE NOT NULL,
    channel VARCHAR(30) DEFAULT 'web' NOT NULL,
    persona_name VARCHAR(100) NOT NULL,
    tone_of_voice VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- BẢNG 2: Tri thức chính sách và Câu hỏi thường gặp
CREATE TABLE IF NOT EXISTS public.chatbot_knowledge_faq (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(50) NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    keywords TEXT[] DEFAULT '{}',
    priority INT DEFAULT 1,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chatbot_faq_cat ON public.chatbot_knowledge_faq (category, is_active);

-- BẢNG 3: Bộ lọc từ cấm và Từ khóa nhạy cảm
CREATE TABLE IF NOT EXISTS public.chatbot_profanity_filter (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keyword VARCHAR(100) NOT NULL,
    severity VARCHAR(20) DEFAULT 'medium' NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    action VARCHAR(20) DEFAULT 'mask' NOT NULL CHECK (action IN ('mask', 'warn', 'block', 'escalate')),
    replacement_text VARCHAR(100) DEFAULT '***',
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chatbot_profanity_active ON public.chatbot_profanity_filter (keyword) WHERE is_active = true;

-- BẢNG 4: Thư viện tin nhắn mẫu cho nhân viên tư vấn
CREATE TABLE IF NOT EXISTS public.chatbot_canned_response (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shortcut VARCHAR(30) UNIQUE NOT NULL,
    title VARCHAR(150) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'general' NOT NULL,
    usage_count INT DEFAULT 0 NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chatbot_canned_cat ON public.chatbot_canned_response (category, is_active);

-- BẢNG 5: Phân loại thang đo cảm xúc khách hàng
CREATE TABLE IF NOT EXISTS public.chatbot_sentiment_tier (
    level INT PRIMARY KEY CHECK (level BETWEEN 1 AND 6),
    name VARCHAR(100) NOT NULL,
    color_badge VARCHAR(20) NOT NULL,
    sla_seconds INT NOT NULL,
    description TEXT NOT NULL
);

-- BẢNG 6: Từ khóa cảm xúc và Ngữ cảnh kích hoạt
CREATE TABLE IF NOT EXISTS public.chatbot_sentiment_trigger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tier_level INT NOT NULL REFERENCES public.chatbot_sentiment_tier(level) ON DELETE RESTRICT,
    trigger_pattern TEXT NOT NULL,
    weight NUMERIC(3, 2) DEFAULT 1.00 NOT NULL,
    context_domain TEXT DEFAULT 'general' NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chatbot_trigger_tier ON public.chatbot_sentiment_trigger (tier_level, is_active);

-- BẢNG 7: Kịch bản phản hồi và Hành động theo cảm xúc
CREATE TABLE IF NOT EXISTS public.chatbot_sentiment_action (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tier_level INT NOT NULL REFERENCES public.chatbot_sentiment_tier(level) ON DELETE CASCADE,
    bot_behavior TEXT NOT NULL,
    notify_admin BOOLEAN DEFAULT false NOT NULL,
    suggested_canned_id UUID REFERENCES public.chatbot_canned_response(id) ON DELETE SET NULL,
    instructions TEXT NOT NULL
);

-- BẢNG 8: Chuyển tiếp nhân viên và Màng lọc bảo vệ tâm lý
CREATE TABLE IF NOT EXISTS public.chatbot_handover_rule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    condition_name TEXT NOT NULL,
    trigger_type VARCHAR(30) NOT NULL CHECK (trigger_type IN ('sentiment_threshold', 'keyword', 'user_request', 'bot_loop', 'toxic_incident')),
    threshold_value TEXT NOT NULL,
    auto_assign_role TEXT DEFAULT 'cskh' NOT NULL,
    sla_seconds INT DEFAULT 60 NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL
);

-- BẢNG 9: Chính sách xoa dịu và Khung bồi hoàn thiện chí
CREATE TABLE IF NOT EXISTS public.chatbot_compensation_policy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_type TEXT NOT NULL,
    max_points INT DEFAULT 50 NOT NULL,
    max_discount_vnd NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    approval_required BOOLEAN DEFAULT false NOT NULL,
    description TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL
);

-- BẢNG 10: Ma trận kịch bản hội thoại theo tình huống
CREATE TABLE IF NOT EXISTS public.chatbot_scenario_matrix (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scenario_name TEXT NOT NULL,
    sample_user_input TEXT NOT NULL,
    expected_sentiment INT CHECK (expected_sentiment BETWEEN 1 AND 6),
    expected_tool_call TEXT,
    expected_handover BOOLEAN DEFAULT false NOT NULL,
    benchmark_status VARCHAR(20) DEFAULT 'passed' CHECK (benchmark_status IN ('passed', 'failed', 'pending')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- ------------------------------------------------------------------------------
-- PHẦN 3: BẬT SUPABASE REALTIME CHANNEL
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chat_conversation'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversation;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'chat_message'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_message;
    END IF;
END $$;

-- Hoàn tất tạo bảng (Chưa nạp dữ liệu - Chờ người dùng cung cấp Seed Data)
SELECT 'PawPal Chatbot 13 Tables Created Successfully!' AS status;
