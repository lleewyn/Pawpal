-- ============================================================================
-- Migration: 20261021_notification_indexes.sql
-- Dự án: PawPal Admin & User Portal
-- Hạng mục: Tối ưu hóa truy vấn thông báo (Index Optimization)
-- Liên kết kiểm toán: NOTI-T01-13 & NOTI-T11-05
-- ============================================================================

-- 1. Index hỗ trợ tải danh sách thông báo theo khách hàng sắp xếp mới nhất
-- Triệt tiêu Sequential Scan khi gọi:
-- .from('notification').select(...).eq('customer_id', id).order('sent_at', { ascending: false })
CREATE INDEX IF NOT EXISTS idx_notification_customer_sent_at
ON public.notification (customer_id, sent_at DESC);

-- 2. Partial index siêu nhẹ phục vụ đếm badge thông báo chưa đọc
-- Triệt tiêu quét toàn bảng khi đếm số lượng chưa đọc:
-- .from('notification').select('id', { count: 'exact', head: true }).eq('customer_id', id).eq('is_read', false)
CREATE INDEX IF NOT EXISTS idx_notification_customer_unread
ON public.notification (customer_id)
WHERE is_read = false;

-- Ghi chú DBA:
-- Migration này là an toàn (idempotent), không thay đổi cấu trúc dữ liệu,
-- không khóa bảng lâu và có thể thực thi trực tiếp trên Supabase SQL Editor.
