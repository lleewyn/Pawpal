-- ==============================================================================
-- PAWPAL ADMIN: TỐI ƯU HIỆU NĂNG CƠ SỞ DỮ LIỆU & CHỈ MỤC TRUY VẤN (GIAI ĐOẠN 5)
-- File: scripts/database/20261017_admin_perf_indexes_and_optimizations.sql
-- Mục đích:
--   Triệt tiêu Full-Table Scans, tăng tốc lọc/phân trang/sắp xếp trên 8 phân hệ Quản trị.
--   Tuân thủ nghiêm ngặt GIAI ĐOẠN 5 theo PAWPAL_ADMIN_KE_HOACH_TOI_UU_TOC_DO_CHUYEN_PHAN_HE_CHECKLIST.md:
--   1. [PERF-05.03, PERF-05.04] Tạo Composite Indexes cho các bảng có lưu lượng truy vấn cao:
--      appointment, sales_order, support_ticket, support_ticket_message, care_log,
--      pet_weight_history, staff_schedule, staff_shift_request, paw_point_transaction, audit_log.
--   2. [PERF-05.07] Hàm RPC tổng hợp KPI bảng điều khiển (SECURITY INVOKER).
--   3. [PERF-05.10] Kế hoạch Rollback chi tiết an toàn không ảnh hưởng dữ liệu.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. CHỈ MỤC BẢNG LỊCH HẸN DỊCH VỤ (appointment)
-- ------------------------------------------------------------------------------

-- Tối ưu lọc theo ngày và trạng thái trên Dashboard & Phân hệ Dịch vụ
CREATE INDEX IF NOT EXISTS idx_appointment_date_status
    ON public.appointment (appointment_date, status);

-- Tối ưu drill-down lịch hẹn theo Khách hàng (Hồ sơ 360°)
CREATE INDEX IF NOT EXISTS idx_appointment_customer_date
    ON public.appointment (customer_id, appointment_date DESC);

-- Tối ưu drill-down lịch hẹn theo Thú cưng (Hồ sơ pet & lịch sử khám/spa)
CREATE INDEX IF NOT EXISTS idx_appointment_pet_date
    ON public.appointment (pet_id, appointment_date DESC);

-- Tối ưu phân bổ ca và kiểm tra lịch làm việc Kỹ thuật viên
CREATE INDEX IF NOT EXISTS idx_appointment_staff_date
    ON public.appointment (staff_id, appointment_date);

-- ------------------------------------------------------------------------------
-- 2. CHỈ MỤC BẢNG ĐƠN HÀNG (sales_order)
-- ------------------------------------------------------------------------------

-- Tối ưu phân trang danh sách đơn hàng & tính toán doanh thu Dashboard
CREATE INDEX IF NOT EXISTS idx_sales_order_created_status
    ON public.sales_order (created_at DESC, status);

-- Tối ưu tra cứu lịch sử mua hàng trong Hồ sơ khách hàng 360°
CREATE INDEX IF NOT EXISTS idx_sales_order_customer_created
    ON public.sales_order (customer_id, created_at DESC);

-- ------------------------------------------------------------------------------
-- 3. CHỈ MỤC BẢNG KHIẾU NẠI & HỖ TRỢ (support_ticket, support_ticket_message)
-- ------------------------------------------------------------------------------

-- Tối ưu danh sách khiếu nại theo trạng thái, mức độ ưu tiên và thời gian
CREATE INDEX IF NOT EXISTS idx_support_ticket_status_created
    ON public.support_ticket (status, created_at DESC);

-- Tối ưu tra cứu khiếu nại theo khách hàng
CREATE INDEX IF NOT EXISTS idx_support_ticket_customer
    ON public.support_ticket (customer_id, created_at DESC);

-- Tối ưu luồng đọc tin nhắn trao đổi theo vé (Triệt tiêu full scan support_ticket_message)
CREATE INDEX IF NOT EXISTS idx_support_ticket_msg_ticket_created
    ON public.support_ticket_message (ticket_id, created_at ASC);

-- ------------------------------------------------------------------------------
-- 4. CHỈ MỤC BẢNG NHẬT KÝ CHĂM SÓC & CÂN NẶNG (care_log, pet_weight_history)
-- ------------------------------------------------------------------------------

-- Tối ưu đọc nhật ký chăm sóc theo thú cưng (Triệt tiêu vòng lặp range 1000)
CREATE INDEX IF NOT EXISTS idx_care_log_pet_recorded
    ON public.care_log (pet_id, recorded_at DESC);

-- Tối ưu đọc nhật ký theo lịch hẹn
CREATE INDEX IF NOT EXISTS idx_care_log_appointment
    ON public.care_log (appointment_id);

-- Tối ưu lịch sử cân nặng theo từng thú cưng
CREATE INDEX IF NOT EXISTS idx_pet_weight_history_pet_recorded
    ON public.pet_weight_history (pet_id, recorded_at DESC);

-- ------------------------------------------------------------------------------
-- 5. CHỈ MỤC BẢNG NHÂN SỰ & PHÂN CA (staff_schedule, staff_shift_request)
-- ------------------------------------------------------------------------------

-- Tối ưu truy vấn lịch làm việc trong phạm vi +/- 30 ngày theo nhân viên
CREATE INDEX IF NOT EXISTS idx_staff_schedule_staff_work_date
    ON public.staff_schedule (staff_id, work_date);

-- Tối ưu kiểm tra ca trống theo ngày và ca làm việc
CREATE INDEX IF NOT EXISTS idx_staff_schedule_date_shift
    ON public.staff_schedule (work_date, shift);

-- Tối ưu hàng đợi duyệt đổi ca/nghỉ phép
CREATE INDEX IF NOT EXISTS idx_staff_shift_request_status_created
    ON public.staff_shift_request (status, created_at DESC);

-- ------------------------------------------------------------------------------
-- 6. CHỈ MỤC ĐIỂM THƯỞNG, KHÁCH HÀNG & NHẬT KÝ HỆ THỐNG (audit_log, paw_point)
-- ------------------------------------------------------------------------------

-- Tối ưu sổ cái biến động điểm Pawpoint theo khách hàng
CREATE INDEX IF NOT EXISTS idx_paw_point_tx_customer_created
    ON public.paw_point_transaction (customer_id, created_at DESC);

-- Tối ưu phân trang bảng nhật ký thao tác (Audit logs)
CREATE INDEX IF NOT EXISTS idx_audit_log_created
    ON public.audit_log (created_at DESC);

-- Tối ưu liên kết hồ sơ khách hàng
CREATE INDEX IF NOT EXISTS idx_customer_profile_customer_id
    ON public.customer_profile (customer_id);

-- Tối ưu liên kết thú cưng theo chủ nuôi
CREATE INDEX IF NOT EXISTS idx_pet_profile_customer_id
    ON public.pet_profile (customer_id, created_at DESC);

-- ------------------------------------------------------------------------------
-- 7. [PERF-05.07] HÀM RPC TỔNG HỢP KPI DASHBOARD (SECURITY INVOKER)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.pawpal_get_admin_dashboard_kpis()
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_today_start timestamptz := date_trunc('day', now());
    v_today_end timestamptz := v_today_start + interval '1 day';
    v_revenue numeric(14,2) := 0;
    v_orders_count integer := 0;
    v_appts_count integer := 0;
    v_tickets_count integer := 0;
    v_customers_count integer := 0;
    v_pets_count integer := 0;
BEGIN
    -- Doanh thu và số đơn hôm nay
    SELECT 
        COALESCE(SUM(total_amount), 0),
        COUNT(*)
    INTO 
        v_revenue,
        v_orders_count
    FROM public.sales_order
    WHERE created_at >= v_today_start 
      AND created_at < v_today_end
      AND status NOT IN ('CANCELLED', 'REFUNDED');

    -- Lịch hẹn hôm nay
    SELECT COUNT(*)
    INTO v_appts_count
    FROM public.appointment
    WHERE appointment_date = CURRENT_DATE
      AND status NOT IN ('CANCELLED');

    -- Khiếu nại đang chờ xử lý
    SELECT COUNT(*)
    INTO v_tickets_count
    FROM public.support_ticket
    WHERE status IN ('OPEN', 'IN_PROGRESS', 'PENDING');

    -- Tổng số khách hàng và thú cưng
    SELECT COUNT(*) INTO v_customers_count FROM public.customer;
    SELECT COUNT(*) INTO v_pets_count FROM public.pet_profile;

    RETURN json_build_object(
        'revenue_today', v_revenue,
        'orders_count_today', v_orders_count,
        'appointments_count_today', v_appts_count,
        'open_tickets_count', v_tickets_count,
        'total_customers', v_customers_count,
        'total_pets', v_pets_count,
        'calculated_at', now()
    );
END;
$$;

-- Phân quyền thực thi hàm RPC an toàn cho authenticated admin
REVOKE ALL ON FUNCTION public.pawpal_get_admin_dashboard_kpis() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pawpal_get_admin_dashboard_kpis() TO authenticated;

COMMIT;

-- ==============================================================================
-- KẾ HOẠCH ROLLBACK (PERF-05.10):
-- Chạy đoạn mã dưới đây nếu cần hoàn tác các chỉ mục và RPC trên:
-- ==============================================================================
/*
BEGIN;
DROP INDEX IF EXISTS public.idx_appointment_date_status;
DROP INDEX IF EXISTS public.idx_appointment_customer_date;
DROP INDEX IF EXISTS public.idx_appointment_pet_date;
DROP INDEX IF EXISTS public.idx_appointment_staff_date;
DROP INDEX IF EXISTS public.idx_sales_order_created_status;
DROP INDEX IF EXISTS public.idx_sales_order_customer_created;
DROP INDEX IF EXISTS public.idx_support_ticket_status_created;
DROP INDEX IF EXISTS public.idx_support_ticket_customer;
DROP INDEX IF EXISTS public.idx_support_ticket_msg_ticket_created;
DROP INDEX IF EXISTS public.idx_care_log_pet_recorded;
DROP INDEX IF EXISTS public.idx_care_log_appointment;
DROP INDEX IF EXISTS public.idx_pet_weight_history_pet_recorded;
DROP INDEX IF EXISTS public.idx_staff_schedule_staff_work_date;
DROP INDEX IF EXISTS public.idx_staff_schedule_date_shift;
DROP INDEX IF EXISTS public.idx_staff_shift_request_status_created;
DROP INDEX IF EXISTS public.idx_paw_point_tx_customer_created;
DROP INDEX IF EXISTS public.idx_audit_log_created;
DROP INDEX IF EXISTS public.idx_customer_profile_customer_id;
DROP INDEX IF EXISTS public.idx_pet_profile_customer_id;
DROP FUNCTION IF EXISTS public.pawpal_get_admin_dashboard_kpis();
COMMIT;
*/
