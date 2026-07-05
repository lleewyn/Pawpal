-- ==========================================
-- BẢNG 34: promotion_service
-- ==========================================
INSERT INTO public.promotion_service (id, promotion_id, service_id) VALUES ('a0000000-3333-4444-6666-000000000001', 'a0000000-3333-4444-5555-666666666666', 'c0000000-0000-0000-0000-000000000001') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.promotion_service (id, promotion_id, service_id) VALUES ('a0000000-3333-4444-6666-000000000002', 'a0000000-3333-4444-5555-666666666666', 'c0000000-0000-0000-0000-000000000002') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.promotion_service (id, promotion_id, service_id) VALUES ('a0000000-3333-4444-6666-000000000003', 'a0000000-3333-4444-5555-666666666666', 'c0000000-0000-0000-0000-000000000003') ON CONFLICT (id) DO NOTHING;