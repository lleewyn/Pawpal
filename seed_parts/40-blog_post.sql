-- ==========================================
-- BẢNG 40: blog_post
-- ==========================================
INSERT INTO public.blog_post (id, category_id, title, slug, summary, content, author_id, status, view_count, created_at, updated_at) VALUES ('b2000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'Cách tắm cho mèo không sợ nước', 'cach-tam-meo', 'Tóm tắt bài viết', 'Nội dung chi tiết...', 'd0000000-5555-5555-5555-555555555555', 'PUBLISHED', 150, now(), now()) ON CONFLICT (id) DO NOTHING;