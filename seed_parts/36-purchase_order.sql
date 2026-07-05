-- ==========================================
-- BẢNG 36: purchase_order
-- ==========================================
INSERT INTO public.purchase_order (id, supplier_id, order_number, order_date, expected_date, total_amount, order_status, created_at, updated_at) VALUES ('a0000000-9999-6666-7777-888888888888', 'a0000000-5555-6666-7777-888888888888', 'PO-2026001', '2026-07-06', '2026-07-10', 5000000, 'COMPLETED', now(), now()) ON CONFLICT (id) DO NOTHING;