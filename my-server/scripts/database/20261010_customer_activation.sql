-- Token kích hoạt tài khoản tạm và hàng đợi SMS thiết lập mật khẩu.
ALTER TABLE public.customer
    ADD COLUMN IF NOT EXISTS activation_token TEXT,
    ADD COLUMN IF NOT EXISTS activation_token_expires_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_activation_token
    ON public.customer (activation_token)
    WHERE activation_token IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.customer_activation_sms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customer(id) ON DELETE CASCADE,
    phone VARCHAR(20) NOT NULL,
    activation_url TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_customer_activation_sms_pending
    ON public.customer_activation_sms (status, created_at);
