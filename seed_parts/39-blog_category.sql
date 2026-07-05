-- ==========================================
-- BẢNG 39: blog_category
-- ==========================================
INSERT INTO public.blog_category (id, category_name, description, display_order, status, created_at, updated_at) VALUES ('b1000000-0000-0000-0000-000000000001', 'Kinh nghiệm nuôi pet', 'Các bài viết hay', 1, 'PUBLISHED', now(), now()) ON CONFLICT (id) DO NOTHING;