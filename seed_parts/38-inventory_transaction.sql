-- ==========================================
-- BẢNG 38: inventory_transaction
-- ==========================================
INSERT INTO public.inventory_transaction (id, purchase_order_id, transaction_type, quantity, stock_before, stock_after, staff_id, created_at) VALUES ('a0000000-9999-6666-7777-888888888890', 'a0000000-9999-6666-7777-888888888888', 'IMPORT', 100, 0, 100, 'd0000000-5555-5555-5555-555555555555', now()) ON CONFLICT (id) DO NOTHING;