-- ==========================================
-- BẢNG 33: promotion_product
-- ==========================================
INSERT INTO public.promotion_product (id, promotion_id, product_id) VALUES ('a0000000-3333-4444-5555-000000000001', 'a0000000-3333-4444-5555-666666666666', 'a0000000-0000-0000-0000-000000000001') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.promotion_product (id, promotion_id, product_id) VALUES ('a0000000-3333-4444-5555-000000000002', 'a0000000-3333-4444-5555-666666666666', 'a0000000-0000-0000-0000-000000000002') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.promotion_product (id, promotion_id, product_id) VALUES ('a0000000-3333-4444-5555-000000000003', 'a0000000-3333-4444-5555-666666666666', 'a0000000-0000-0000-0000-000000000003') ON CONFLICT (id) DO NOTHING;