-- ==========================================
-- BẢNG 44: audit_log
-- ==========================================
INSERT INTO public.audit_log (id, staff_id, action, entity_name, description, created_at) VALUES ('a1000000-0000-0000-0000-000000000001', 'd0000000-5555-5555-5555-555555555555', 'IMPORT', 'product', 'Nhập danh mục sản phẩm mẫu từ file CSV', now()) ON CONFLICT (id) DO NOTHING;