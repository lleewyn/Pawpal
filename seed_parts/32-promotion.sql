-- ==========================================
-- BẢNG 32: promotion
-- ==========================================
INSERT INTO public.promotion (id, promotion_name, description, discount_type, discount_value, start_date, end_date, status, created_at, updated_at) VALUES ('a0000000-3333-4444-5555-666666666666', 'Hè Vui Vẻ', 'Giảm giá mùa hè', 'PERCENT', 10, now(), '2026-08-30T00:00:00Z', 'ACTIVE', now(), now()) ON CONFLICT (id) DO NOTHING;