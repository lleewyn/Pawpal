-- ==========================================
-- BẢNG 1: membership_tier
-- ==========================================
INSERT INTO public.membership_tier (id, tier_name, minimum_expenditure, discount_percent, is_active, created_at, updated_at) VALUES ('11111111-1111-1111-1111-111111111111', 'Đồng', 0, 0, true, now(), now()) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.membership_tier (id, tier_name, minimum_expenditure, discount_percent, is_active, created_at, updated_at) VALUES ('22222222-2222-2222-2222-222222222222', 'Bạc', 1000000, 5, true, now(), now()) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.membership_tier (id, tier_name, minimum_expenditure, discount_percent, is_active, created_at, updated_at) VALUES ('33333333-3333-3333-3333-333333333333', 'Vàng', 3000000, 10, true, now(), now()) ON CONFLICT (id) DO NOTHING;
INSERT INTO public.membership_tier (id, tier_name, minimum_expenditure, discount_percent, is_active, created_at, updated_at) VALUES ('44444444-4444-4444-4444-444444444444', 'Kim Cương', 5000000, 15, true, now(), now()) ON CONFLICT (id) DO NOTHING;