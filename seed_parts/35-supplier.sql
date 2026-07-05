-- ==========================================
-- BẢNG 35: supplier
-- ==========================================
INSERT INTO public.supplier (id, supplier_name, contact_person, phone_number, email, address, status, created_at, updated_at) VALUES ('a0000000-5555-6666-7777-888888888888', 'Pate Hoàng gia', 'Nguyễn Cung Cấp', '0898888888', 'contact@supplier.vn', '456 Đường Sỉ Lẻ', 'ACTIVE', now(), now()) ON CONFLICT (id) DO NOTHING;