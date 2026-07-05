-- ==========================================
-- BẢNG 9: staff
-- ==========================================
INSERT INTO public.staff (id, full_name, role, phone_number, specialization, created_at, updated_at) VALUES ('d0000000-5555-5555-5555-555555555555', 'Trần Văn Nhân Viên', 'PET_CARE', '0999999999', 'Spa/Grooming', now(), now()) ON CONFLICT (id) DO NOTHING;