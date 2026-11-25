-- ==============================================================================
-- PAWPAL CHATBOT PR-05: STANDARDIZE STORAGE, DATABASE INDEXES & RAG
-- File: scripts/database/20261017_pr05_indexes_and_storage.sql
-- Description:
--   1. Tạo các chỉ mục hiệu năng cao cho chat_message, chat_conversation,
--      customer_membership và inventory để triệt tiêu full-table scans.
--   2. Khởi tạo Supabase Storage bucket 'chat-attachments' và phân quyền upload/read.
-- Tuân thủ: PAWPAL_CHATBOT_AUDIT_QUA_TAI_VA_CACH_SUA.md (PR-05)
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. CHỈ MỤC TỐI ƯU TRUY VẤN CƠ SỞ DỮ LIỆU (DATABASE INDEXES)
-- ------------------------------------------------------------------------------

-- Tối ưu lấy tin nhắn gần nhất theo thứ tự thời gian giảm dần (Inbox Tier 2 & Live chat)
CREATE INDEX IF NOT EXISTS idx_chat_message_conv_created 
    ON public.chat_message (conversation_id, created_at DESC);

-- Tối ưu sắp xếp danh sách hội thoại theo thời gian cập nhật gần nhất (Inbox Tier 1)
CREATE INDEX IF NOT EXISTS idx_chat_conv_updated 
    ON public.chat_conversation (updated_at DESC);

-- Tối ưu tra cứu phiên hội thoại đang mở của một khách hàng cụ thể
CREATE INDEX IF NOT EXISTS idx_chat_conv_cust_status 
    ON public.chat_conversation (customer_id, status, updated_at DESC);

-- Tối ưu tra cứu số dư điểm thành viên khả dụng (Authoritative Total Pawpoints)
CREATE INDEX IF NOT EXISTS idx_customer_membership_cust_points 
    ON public.customer_membership (customer_id, total_paw_points);

-- Tối ưu lọc và đếm tồn kho thấp trực tiếp trên DB (CB-23 get_low_stock_products)
CREATE INDEX IF NOT EXISTS idx_inventory_qty 
    ON public.inventory (quantity_in_stock);

-- ------------------------------------------------------------------------------
-- 2. KHỞI TẠO BUCKET SUPABASE STORAGE: chat-attachments
-- ------------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'chat-attachments',
    'chat-attachments',
    true,
    5242880, -- Giới hạn 5MB cho mỗi tệp
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- Chính sách đọc công khai các tệp ảnh đính kèm trong hội thoại
DROP POLICY IF EXISTS "chat_attachments_public_read" ON storage.objects;
CREATE POLICY "chat_attachments_public_read"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'chat-attachments');

-- Chính sách tải lên cho người dùng và nhân viên (anon và authenticated)
DROP POLICY IF EXISTS "chat_attachments_insert_policy" ON storage.objects;
CREATE POLICY "chat_attachments_insert_policy"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'chat-attachments');

COMMIT;
