-- ==========================================
-- BẢNG 45: support_ticket & support_ticket_message
-- ==========================================

CREATE TABLE IF NOT EXISTS public.support_ticket (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed
    priority TEXT NOT NULL DEFAULT 'Bình thường', -- Bình thường, Cao
    rating INTEGER NULL,
    rating_comment TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.support_ticket_message (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES public.support_ticket(id) ON DELETE CASCADE,
    sender_type TEXT NOT NULL, -- 'user', 'cskh'
    agent_name TEXT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Bật RLS
ALTER TABLE public.support_ticket ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_message ENABLE ROW LEVEL SECURITY;

-- Policies cho support_ticket
CREATE POLICY "Users can view their own tickets"
ON public.support_ticket FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tickets"
ON public.support_ticket FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tickets"
ON public.support_ticket FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Policies cho support_ticket_message
CREATE POLICY "Users can view messages of their tickets"
ON public.support_ticket_message FOR SELECT
TO authenticated
USING (
    ticket_id IN (
        SELECT id FROM public.support_ticket WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert messages to their tickets"
ON public.support_ticket_message FOR INSERT
TO authenticated
WITH CHECK (
    ticket_id IN (
        SELECT id FROM public.support_ticket WHERE user_id = auth.uid()
    )
);

-- ==========================================
-- RLS Cho Khách Vãng Lai (anon) - tạm thời cho phép để test nếu chưa login
-- ==========================================
CREATE POLICY "Anon can do all on support_ticket"
ON public.support_ticket FOR ALL
TO anon
USING (true)
WITH CHECK (true);

CREATE POLICY "Anon can do all on support_ticket_message"
ON public.support_ticket_message FOR ALL
TO anon
USING (true)
WITH CHECK (true);
