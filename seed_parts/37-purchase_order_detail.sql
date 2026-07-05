-- ==========================================
-- BẢNG 37: purchase_order_detail
-- ==========================================
INSERT INTO public.purchase_order_detail (id, purchase_order_id, product_id, quantity, unit_price, subtotal, received_quantity) VALUES ('a0000000-9999-6666-7777-888888888889', 'a0000000-9999-6666-7777-888888888888', 'a0000000-0000-0000-0000-000000000001', 100, 50000, 5000000, 100) ON CONFLICT (id) DO NOTHING;