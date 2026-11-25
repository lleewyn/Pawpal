-- Liên kết phiên chat với Ticket khi CSKH chuyển hội thoại thành khiếu nại.
ALTER TABLE public.chat_conversation
    ADD COLUMN IF NOT EXISTS ticket_id UUID REFERENCES public.support_ticket(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_chat_conversation_ticket
    ON public.chat_conversation (ticket_id);
