-- ==========================================
-- BẢNG 26: care_action
-- ==========================================
INSERT INTO public.care_action (id, action_name, service_category, display_order, estimated_duration, is_active, created_at, updated_at) VALUES ('90000000-1111-2222-3333-444444444444', 'Tắm gội sạch sẽ', 'GROOMING_SPA', 1, 30, true, now(), now()) ON CONFLICT (id) DO NOTHING;