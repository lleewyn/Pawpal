-- ============================================================================
-- PAWPAL DATABASE SCHEMA SYNCHRONIZATION MIGRATION
-- File: scripts/database/20261019_sync_schema_with_cdsl.sql
-- Mục đích: Đồng bộ hóa toàn bộ các cột còn thiếu trong CSDL Supabase
-- theo đúng chuẩn thiết kế tại tài liệu CDSLfinal.md (Bao gồm 62 thực thể).
--
-- NGUYÊN TẮC AN TOÀN TUYỆT ĐỐI (ZERO BREAKING CHANGES):
-- 1. Sử dụng 'ADD COLUMN IF NOT EXISTS' -> Có thể chạy nhiều lần không lo lỗi.
-- 2. Tất cả cột thêm mới đều là NULLABLE hoặc có DEFAULT -> Không gây lỗi code cũ đang chạy.
-- 3. Có kèm khối Backfill tự động lấy dữ liệu từ chuỗi/mẹo cũ điền vào cột mới.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. BẢNG product (Sản phẩm kinh doanh)
-- Bổ sung: brand_name, target_pet, min_price, description, slug
-- ----------------------------------------------------------------------------
ALTER TABLE product ADD COLUMN IF NOT EXISTS brand_name VARCHAR(100);
ALTER TABLE product ADD COLUMN IF NOT EXISTS target_pet VARCHAR(50) DEFAULT 'Chó và Mèo';
ALTER TABLE product ADD COLUMN IF NOT EXISTS min_price NUMERIC(12, 2);
ALTER TABLE product ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE product ADD COLUMN IF NOT EXISTS slug VARCHAR(255);

-- Tự động Backfill dữ liệu cho bảng product từ dữ liệu sẵn có
UPDATE product
SET brand_name = CASE
    WHEN LOWER(product_name) LIKE '%royal canin%' THEN 'Royal Canin'
    WHEN LOWER(product_name) LIKE '%petkit%' THEN 'Petkit'
    WHEN LOWER(product_name) LIKE '%king%pet%' THEN 'King''s Pet'
    WHEN LOWER(product_name) LIKE '%churu%' OR LOWER(product_name) LIKE '%ciao%' THEN 'Ciao Churu'
    WHEN LOWER(product_name) LIKE '%whiskas%' THEN 'Whiskas'
    WHEN LOWER(product_name) LIKE '%orijen%' THEN 'Orijen'
    WHEN LOWER(product_name) LIKE '%pidan%' THEN 'Pidan'
    WHEN LOWER(product_name) LIKE '%me-o%' OR LOWER(product_name) LIKE '%meo%' THEN 'Me-O'
    WHEN LOWER(product_name) LIKE '%cat%best%' THEN 'Cat''s Best'
    WHEN LOWER(product_name) LIKE '%kit cat%' THEN 'Kit Cat'
    WHEN LOWER(product_name) LIKE '%furrytail%' THEN 'Furrytail'
    WHEN LOWER(product_name) LIKE '%gimcat%' THEN 'GimCat'
    WHEN LOWER(product_name) LIKE '%purina%' OR LOWER(product_name) LIKE '%pro plan%' THEN 'Purina'
    WHEN LOWER(product_name) LIKE '%nutrience%' THEN 'Nutrience'
    WHEN LOWER(product_name) LIKE '%monge%' THEN 'Monge'
    ELSE COALESCE(brand_name, 'PawPal')
END
WHERE brand_name IS NULL;

-- Tự động điền description từ ingredients/specs nếu description đang trống
UPDATE product
SET description = COALESCE(specs, benefits, 'Sản phẩm chính hãng PawPal')
WHERE description IS NULL;

-- ----------------------------------------------------------------------------
-- 2. BẢNG sales_order (Đơn hàng bán lẻ & Vận chuyển)
-- Bổ sung: shipping_provider_id, tracking_code, shipped_at, delivered_at
-- ----------------------------------------------------------------------------
ALTER TABLE sales_order ADD COLUMN IF NOT EXISTS shipping_provider_id UUID REFERENCES shipping_provider(id) ON DELETE SET NULL;
ALTER TABLE sales_order ADD COLUMN IF NOT EXISTS tracking_code VARCHAR(100);
ALTER TABLE sales_order ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMPTZ;
ALTER TABLE sales_order ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- Backfill tracking_code nếu trước đây bị nhồi vào chuỗi note: "Vận đơn: XYZ"
UPDATE sales_order
SET tracking_code = SUBSTRING(note FROM '(?i)Vận đơn:\s*([^\n;]+)')
WHERE tracking_code IS NULL AND note ~* 'Vận đơn:';

-- ----------------------------------------------------------------------------
-- 3. NHÓM BẢNG LIÊN KẾT BIẾN THỂ (product_variant_id)
-- Giúp các giao dịch bán hàng, kho và khuyến mãi gắn đúng biến thể SKU cụ thể
-- ----------------------------------------------------------------------------
-- 3.1. Chi tiết phiếu nhập kho
ALTER TABLE purchase_order_detail ADD COLUMN IF NOT EXISTS product_variant_id UUID REFERENCES product_variant(id) ON DELETE SET NULL;

-- 3.2. Giỏ hàng chi tiết
ALTER TABLE cart_item ADD COLUMN IF NOT EXISTS product_variant_id UUID REFERENCES product_variant(id) ON DELETE SET NULL;

-- 3.3. Chi tiết đơn hàng bán
ALTER TABLE sales_order_detail ADD COLUMN IF NOT EXISTS product_variant_id UUID REFERENCES product_variant(id) ON DELETE SET NULL;

-- 3.4. Quản lý tồn kho & Số lượng tạm giữ
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS product_variant_id UUID REFERENCES product_variant(id) ON DELETE SET NULL;
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS quantity_reserved INTEGER DEFAULT 0;

-- 3.5. Lịch sử giao dịch kho
ALTER TABLE inventory_transaction ADD COLUMN IF NOT EXISTS product_variant_id UUID REFERENCES product_variant(id) ON DELETE SET NULL;

-- 3.6. Chi tiết đổi trả sản phẩm
ALTER TABLE return_request_detail ADD COLUMN IF NOT EXISTS product_variant_id UUID REFERENCES product_variant(id) ON DELETE SET NULL;

-- 3.7. Sản phẩm áp dụng khuyến mãi
ALTER TABLE promotion_product ADD COLUMN IF NOT EXISTS product_variant_id UUID REFERENCES product_variant(id) ON DELETE SET NULL;

-- Backfill liên kết biến thể đầu tiên cho sales_order_detail nếu đang có product_id
UPDATE sales_order_detail sod
SET product_variant_id = pv.id
FROM (
    SELECT DISTINCT ON (product_id) id, product_id 
    FROM product_variant 
    ORDER BY product_id, created_at ASC
) pv
WHERE sod.product_id = pv.product_id AND sod.product_variant_id IS NULL;

-- Backfill liên kết biến thể cho giỏ hàng cart_item
UPDATE cart_item ci
SET product_variant_id = pv.id
FROM (
    SELECT DISTINCT ON (product_id) id, product_id 
    FROM product_variant 
    ORDER BY product_id, created_at ASC
) pv
WHERE ci.product_id = pv.product_id AND ci.product_variant_id IS NULL;

-- Backfill liên kết biến thể cho chi tiết nhập kho purchase_order_detail
UPDATE purchase_order_detail pod
SET product_variant_id = pv.id
FROM (
    SELECT DISTINCT ON (product_id) id, product_id 
    FROM product_variant 
    ORDER BY product_id, created_at ASC
) pv
WHERE pod.product_id = pv.product_id AND pod.product_variant_id IS NULL;

-- Backfill liên kết biến thể cho inventory nếu có
UPDATE inventory inv
SET product_variant_id = pv.id
FROM (
    SELECT DISTINCT ON (product_id) id, product_id 
    FROM product_variant 
    ORDER BY product_id, created_at ASC
) pv
WHERE inv.product_id = pv.product_id AND inv.product_variant_id IS NULL;

-- ----------------------------------------------------------------------------
-- 4. BẢNG support_ticket & support_ticket_message (Hỗ trợ & Khiếu nại)
-- Bổ sung đầy đủ 19 trường nghiệp vụ theo CDSLfinal.md
-- ----------------------------------------------------------------------------
ALTER TABLE support_ticket ADD COLUMN IF NOT EXISTS ticket_code VARCHAR(50);
ALTER TABLE support_ticket ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customer(id) ON DELETE SET NULL;
ALTER TABLE support_ticket ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES sales_order(id) ON DELETE SET NULL;
ALTER TABLE support_ticket ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES appointment(id) ON DELETE SET NULL;
ALTER TABLE support_ticket ADD COLUMN IF NOT EXISTS channel VARCHAR(50) DEFAULT 'web';
ALTER TABLE support_ticket ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'general';
ALTER TABLE support_ticket ADD COLUMN IF NOT EXISTS subject VARCHAR(255);
ALTER TABLE support_ticket ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE support_ticket ADD COLUMN IF NOT EXISTS requested_resolution VARCHAR(100);
ALTER TABLE support_ticket ADD COLUMN IF NOT EXISTS requested_amount NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE support_ticket ADD COLUMN IF NOT EXISTS assigned_staff_id UUID REFERENCES staff(id) ON DELETE SET NULL;
ALTER TABLE support_ticket ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ;
ALTER TABLE support_ticket ADD COLUMN IF NOT EXISTS investigation_note TEXT;
ALTER TABLE support_ticket ADD COLUMN IF NOT EXISTS resolution_type VARCHAR(100);
ALTER TABLE support_ticket ADD COLUMN IF NOT EXISTS resolution_note TEXT;
ALTER TABLE support_ticket ADD COLUMN IF NOT EXISTS approved_amount NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE support_ticket ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES staff(id) ON DELETE SET NULL;
ALTER TABLE support_ticket ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE support_ticket ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

-- Đồng bộ user_id sang customer_id nếu customer_id đang null
UPDATE support_ticket
SET customer_id = user_id
WHERE customer_id IS NULL AND user_id IS NOT NULL;

-- Bổ sung trường cho support_ticket_message
ALTER TABLE support_ticket_message ADD COLUMN IF NOT EXISTS sender_id UUID;
ALTER TABLE support_ticket_message ADD COLUMN IF NOT EXISTS attachment_urls TEXT[];
ALTER TABLE support_ticket_message ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT false;

-- ----------------------------------------------------------------------------
-- 5. BẢNG return_request (Yêu cầu đổi trả)
-- Bổ sung: refund_transaction_id, resolution_type, refund_amount, resolved_by
-- ----------------------------------------------------------------------------
ALTER TABLE return_request ADD COLUMN IF NOT EXISTS refund_transaction_id UUID REFERENCES refund_transaction(id) ON DELETE SET NULL;
ALTER TABLE return_request ADD COLUMN IF NOT EXISTS resolution_type VARCHAR(100);
ALTER TABLE return_request ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(12, 2) DEFAULT 0;
ALTER TABLE return_request ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES staff(id) ON DELETE SET NULL;

-- ----------------------------------------------------------------------------
-- 6. BẢNG appointment & care_action (Dịch vụ & Lịch hẹn)
-- ----------------------------------------------------------------------------
ALTER TABLE appointment ADD COLUMN IF NOT EXISTS support_ticket_id UUID REFERENCES support_ticket(id) ON DELETE SET NULL;
ALTER TABLE appointment ADD COLUMN IF NOT EXISTS check_in_time TIMESTAMPTZ;
ALTER TABLE appointment ADD COLUMN IF NOT EXISTS check_out_time TIMESTAMPTZ;

ALTER TABLE care_action ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES service(id) ON DELETE SET NULL;

-- ----------------------------------------------------------------------------
-- 7. BẢNG payment (Thanh toán)
-- ----------------------------------------------------------------------------
ALTER TABLE payment ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customer(id) ON DELETE SET NULL;
ALTER TABLE payment ADD COLUMN IF NOT EXISTS payment_method_config_id UUID REFERENCES payment_method_config(id) ON DELETE SET NULL;

-- Tự động điền customer_id trong payment từ đơn hàng hoặc lịch hẹn
UPDATE payment p
SET customer_id = o.customer_id
FROM sales_order o
WHERE p.order_id = o.id AND p.customer_id IS NULL;

UPDATE payment p
SET customer_id = a.customer_id
FROM appointment a
WHERE p.appointment_id = a.id AND p.customer_id IS NULL;

-- Tự động điền payment_method_config_id trong payment từ payment_method_id nếu có
UPDATE payment p
SET payment_method_config_id = pmc.id
FROM payment_method_config pmc
WHERE p.payment_method_config_id IS NULL
  AND p.payment_method_id IS NOT NULL
  AND (
      LOWER(pmc.short_name) = LOWER(p.payment_method_id)
      OR LOWER(pmc.name) LIKE '%' || LOWER(p.payment_method_id) || '%'
  );

-- ----------------------------------------------------------------------------
-- 8. BẢNG staff_schedule (Lịch làm việc nhân sự)
-- ----------------------------------------------------------------------------
ALTER TABLE staff_schedule ADD COLUMN IF NOT EXISTS availability_status VARCHAR(50) DEFAULT 'available';
ALTER TABLE staff_schedule ADD COLUMN IF NOT EXISTS reason TEXT;

-- ----------------------------------------------------------------------------
-- 9. BẢNG notification & audit_log (Thông báo & Nhật ký kiểm tra)
-- ----------------------------------------------------------------------------
ALTER TABLE notification ADD COLUMN IF NOT EXISTS sales_order_id UUID REFERENCES sales_order(id) ON DELETE SET NULL;
ALTER TABLE notification ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES appointment(id) ON DELETE SET NULL;
ALTER TABLE notification ADD COLUMN IF NOT EXISTS support_ticket_id UUID REFERENCES support_ticket(id) ON DELETE SET NULL;
ALTER TABLE notification ADD COLUMN IF NOT EXISTS refund_transaction_id UUID REFERENCES refund_transaction(id) ON DELETE SET NULL;

ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS entity_id VARCHAR(100);

-- ============================================================================
-- HOÀN TẤT MIGRATION ĐỒNG BỘ SCHEMA
-- ============================================================================
