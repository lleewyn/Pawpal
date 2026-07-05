-- ==========================================
-- BẢNG 41: return_request
-- ==========================================
INSERT INTO public.return_request (id, sales_order_id, customer_id, reason, return_type, request_status, created_at, updated_at) VALUES ('a3000000-0000-0000-0000-000000000001', 'a0000000-aaaa-bbbb-cccc-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Giao sai sản phẩm', 'EXCHANGE', 'COMPLETED', now(), now()) ON CONFLICT (id) DO NOTHING;