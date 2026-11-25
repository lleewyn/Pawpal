-- ====================================================================================
-- PAWPAL DATABASE MIGRATION: CHUẨN HÓA SẢN PHẨM & BIẾN THỂ (PRODUCT & PRODUCT_VARIANT)
-- File: scripts/database/20261019_normalize_product_and_variant.sql
-- Mục đích: Loại bỏ sự trùng lặp thuộc tính (sku, cost_price, sale_price) giữa bảng product và product_variant
-- ====================================================================================

-- BƯỚC 1: ĐỒNG BỘ DỮ LIỆU SANG PRODUCT_VARIANT (ĐÃ ĐƯỢC CHẠY BỞI SCRIPT MIGRATE NODEJS)
-- Đảm bảo 100% sản phẩm trong bảng product đều có ít nhất 1 biến thể trong product_variant
INSERT INTO public.product_variant (
    product_id,
    sku_variant,
    cost_price,
    sale_price,
    status
)
SELECT 
    p.id AS product_id,
    COALESCE(NULLIF(TRIM(p.sku), ''), 'SKU-' || SUBSTRING(p.id::text, 1, 8)) AS sku_variant,
    COALESCE(p.cost_price, 0) AS cost_price,
    COALESCE(p.sale_price, 0) AS sale_price,
    CASE 
        WHEN p.status IN ('ACTIVE', 'dang_ban') THEN 'dang_ban' 
        ELSE 'tam_ngung' 
    END AS status
FROM public.product p
WHERE NOT EXISTS (
    SELECT 1 FROM public.product_variant pv WHERE pv.product_id = p.id
)
ON CONFLICT (sku_variant) DO NOTHING;

-- BƯỚC 2: TẠO VIEW TIỆN ÍCH DÙNG CHO CÁC TRANG CẦN HIỂN THỊ TỔNG HỢP (TUỲ CHỌN)
CREATE OR REPLACE VIEW public.v_product_catalog AS
SELECT 
    p.id,
    p.product_name,
    p.category_id,
    p.brand_name,
    p.unit,
    p.target_pet,
    p.image_urls,
    p.status,
    p.origin,
    p.rating,
    p.review_count,
    -- Thuộc tính tổng hợp từ biến thể
    MIN(pv.sale_price) AS min_price,
    MAX(pv.sale_price) AS max_price,
    COUNT(pv.id) AS variant_count,
    -- SKU đại diện của biến thể đầu tiên
    (ARRAY_AGG(pv.sku_variant ORDER BY pv.created_at ASC))[1] AS primary_sku
FROM public.product p
LEFT JOIN public.product_variant pv ON pv.product_id = p.id
GROUP BY p.id;

-- BƯỚC 3: DỌN DẸP LOẠI BỎ 3 CỘT TRÙNG LẶP TRÊN BẢNG PRODUCT
-- (Chạy sau khi toàn bộ code đã chuyển sang đọc từ product_variant)
-- ALTER TABLE public.product DROP COLUMN IF EXISTS sku;
-- ALTER TABLE public.product DROP COLUMN IF EXISTS cost_price;
-- ALTER TABLE public.product DROP COLUMN IF EXISTS sale_price;
