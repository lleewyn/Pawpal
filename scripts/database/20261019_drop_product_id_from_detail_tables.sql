-- ==============================================================================
-- PAWPAL DATABASE MIGRATION: BƯỚC 4 - DROP PRODUCT_ID KHỎI 6 BẢNG CHI TIẾT
-- Mục đích: Loại bỏ triệt để cột dư thừa product_id ở các bảng giao dịch/chi tiết,
-- chuẩn hóa 100% theo Khóa ngoại đơn trị product_variant_id (3NF).
-- Thực thi trên: Supabase SQL Editor
-- Ngày tạo: 19/10/2026
-- ==============================================================================

-- 1. Bảng purchase_order_detail (Bảng 24)
ALTER TABLE IF EXISTS purchase_order_detail DROP COLUMN IF EXISTS product_id CASCADE;

-- 2. Bảng sales_order_detail (Bảng 37)
ALTER TABLE IF EXISTS sales_order_detail DROP COLUMN IF EXISTS product_id CASCADE;

-- 3. Bảng cart_item (Bảng 33)
ALTER TABLE IF EXISTS cart_item DROP COLUMN IF EXISTS product_id CASCADE;

-- 4. Bảng inventory (Bảng 39)
ALTER TABLE IF EXISTS inventory DROP COLUMN IF EXISTS product_id CASCADE;

-- 5. Bảng return_request_detail (Bảng 50)
ALTER TABLE IF EXISTS return_request_detail DROP COLUMN IF EXISTS product_id CASCADE;

-- 6. Bảng promotion_product (Bảng 55)
ALTER TABLE IF EXISTS promotion_product DROP COLUMN IF EXISTS product_id CASCADE;

-- ==============================================================================
-- Xác nhận kết quả sau khi DROP:
-- Chạy truy vấn bên dưới để kiểm tra xem còn cột product_id ở 6 bảng trên không:
-- ==============================================================================
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND column_name = 'product_id'
  AND table_name IN (
    'purchase_order_detail',
    'sales_order_detail',
    'cart_item',
    'inventory',
    'return_request_detail',
    'promotion_product'
  );
-- Kỳ vọng: 0 rows returned!
