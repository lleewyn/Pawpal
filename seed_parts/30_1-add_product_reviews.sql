-- ==========================================
-- BỔ SUNG CỘT product_id CHO BẢNG review
-- ==========================================
ALTER TABLE public.review
ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.product(id);

-- ==========================================
-- THÊM ĐÁNH GIÁ SẢN PHẨM MẪU
-- ==========================================
INSERT INTO public.review (id, customer_id, product_id, review_type, rating, review_content, review_status, created_at, updated_at)
VALUES 
('f0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'PRODUCT', 5, 'Hạt thơm, bé nhà mình rất thích ăn. Giao hàng nhanh!', 'APPROVED', now(), now()),
('f0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'PRODUCT', 4, 'Đóng gói cẩn thận, hạt hơi vụn ở đáy nhưng nhìn chung ổn.', 'APPROVED', now(), now()),
('f0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'PRODUCT', 5, 'Chất lượng tuyệt vời. Rất đáng tiền mua.', 'APPROVED', now(), now()),
('f0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000002', 'PRODUCT', 5, 'Pate rất thơm, bé mèo ăn hết sạch chỉ trong một nốt nhạc.', 'APPROVED', now(), now()),
('f0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'PRODUCT', 3, 'Giá hơi cao so với chỗ khác mình mua, nhưng đóng gói đẹp.', 'APPROVED', now(), now()),
('f0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000003', 'PRODUCT', 4, 'Bé rất thích ăn, nhưng mà gói súp có vẻ hơi nhỏ.', 'APPROVED', now(), now())
ON CONFLICT (id) DO NOTHING;
