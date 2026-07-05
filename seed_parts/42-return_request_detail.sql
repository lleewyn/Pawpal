-- ==========================================
-- BẢNG 42: return_request_detail
-- ==========================================
INSERT INTO public.return_request_detail (id, return_request_id, product_id, quantity, unit_price) VALUES ('a4000000-0000-0000-0000-000000000001', 'a3000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 1, 200000) ON CONFLICT (id) DO NOTHING;