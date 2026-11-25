-- ==============================================================================
-- PAWPAL-ER ADMIN — SCRIPT TỐI ƯU HÓA HIỆU NĂNG TRUY VẤN CSDL (PERFORMANCE INDEXES)
-- Phiên bản: 1.1 · Cập nhật chuẩn xác 100% theo schema Supabase thực tế
-- Hướng dẫn: Dán và thực thi toàn bộ script này trong Supabase SQL Editor.
-- Đặc điểm: Sử dụng IF NOT EXISTS, an toàn 100%, không gây gián đoạn hoạt động.
-- ==============================================================================

-- 1. BẢNG KHÁCH HÀNG (CUSTOMER & PROFILE)
-- Tối ưu hóa tra cứu tức thì theo Số điện thoại chính, Email và Ngày tạo
CREATE INDEX IF NOT EXISTS idx_customer_phone_main 
    ON public.customer(phone_main);

CREATE INDEX IF NOT EXISTS idx_customer_email 
    ON public.customer(email);

CREATE INDEX IF NOT EXISTS idx_customer_created_at 
    ON public.customer(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_customer_account_status 
    ON public.customer(account_status);

CREATE INDEX IF NOT EXISTS idx_customer_profile_customer_id 
    ON public.customer_profile(customer_id);

CREATE INDEX IF NOT EXISTS idx_customer_address_customer_id 
    ON public.customer_address(customer_id);

CREATE INDEX IF NOT EXISTS idx_customer_membership_customer_id 
    ON public.customer_membership(customer_id);


-- 2. BẢNG THÚ CƯNG (PET PROFILE & LỊCH SỬ CÂN NẶNG)
-- Tối ưu hóa nạp danh sách bé cưng theo chủ nuôi, phân loại loài và trạng thái
CREATE INDEX IF NOT EXISTS idx_pet_profile_customer_id 
    ON public.pet_profile(customer_id);

CREATE INDEX IF NOT EXISTS idx_pet_profile_species 
    ON public.pet_profile(species);

CREATE INDEX IF NOT EXISTS idx_pet_profile_status 
    ON public.pet_profile(status);

CREATE INDEX IF NOT EXISTS idx_pet_weight_history_pet_date 
    ON public.pet_weight_history(pet_id, measured_at DESC);


-- 3. BẢNG DỊCH VỤ & LỊCH HẸN (APPOINTMENT & CARE LOG)
-- Tối ưu hóa tải lịch làm việc KTV, lịch hẹn hôm nay trên Dashboard và tìm kiếm
CREATE INDEX IF NOT EXISTS idx_appointment_customer_id 
    ON public.appointment(customer_id);

CREATE INDEX IF NOT EXISTS idx_appointment_pet_id 
    ON public.appointment(pet_id);

CREATE INDEX IF NOT EXISTS idx_appointment_service_id 
    ON public.appointment(service_id);

CREATE INDEX IF NOT EXISTS idx_appointment_staff_id 
    ON public.appointment(staff_id);

CREATE INDEX IF NOT EXISTS idx_appointment_date_time 
    ON public.appointment(appointment_date DESC, appointment_time ASC);

CREATE INDEX IF NOT EXISTS idx_appointment_status_composite 
    ON public.appointment(appointment_status, appointment_date DESC);

CREATE INDEX IF NOT EXISTS idx_appointment_payment_status 
    ON public.appointment(payment_status);

CREATE INDEX IF NOT EXISTS idx_care_log_appointment_id 
    ON public.care_log(appointment_id);

CREATE INDEX IF NOT EXISTS idx_care_log_pet_id 
    ON public.care_log(pet_id);


-- 4. BẢNG BÁN HÀNG & ĐƠN HÀNG (SALES ORDER & DETAILS)
-- Tối ưu hóa tìm mã đơn hàng, đối soát COD và chi tiết theo biến thể SKU (product_variant_id)
CREATE INDEX IF NOT EXISTS idx_sales_order_code 
    ON public.sales_order(order_code);

CREATE INDEX IF NOT EXISTS idx_sales_order_customer_id 
    ON public.sales_order(customer_id);

CREATE INDEX IF NOT EXISTS idx_sales_order_status_created 
    ON public.sales_order(order_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sales_order_payment_status 
    ON public.sales_order(payment_status);

CREATE INDEX IF NOT EXISTS idx_sales_order_detail_order_id 
    ON public.sales_order_detail(order_id);

CREATE INDEX IF NOT EXISTS idx_sales_order_detail_variant_id 
    ON public.sales_order_detail(product_variant_id);


-- 5. BẢNG SẢN PHẨM & BIẾN THỂ SKU (PRODUCT & PRODUCT VARIANT)
-- Tối ưu hóa liên kết sản phẩm cha - con và tra cứu theo mã SKU
CREATE INDEX IF NOT EXISTS idx_product_variant_product_id 
    ON public.product_variant(product_id);

CREATE INDEX IF NOT EXISTS idx_product_variant_sku 
    ON public.product_variant(sku_variant);

CREATE INDEX IF NOT EXISTS idx_product_variant_status 
    ON public.product_variant(status);

CREATE INDEX IF NOT EXISTS idx_product_category_id 
    ON public.product(category_id);

CREATE INDEX IF NOT EXISTS idx_product_status 
    ON public.product(status);


-- 6. BẢNG KHO HÀNG & BIẾN ĐỘNG TỒN (INVENTORY & TRANSACTIONS)
-- Tối ưu hóa kiểm tra tồn kho theo biến thể SKU và lịch sử kiểm kê
CREATE INDEX IF NOT EXISTS idx_inventory_variant_id 
    ON public.inventory(product_variant_id);

CREATE INDEX IF NOT EXISTS idx_inventory_tx_variant_date 
    ON public.inventory_transaction(product_variant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_transaction_type 
    ON public.inventory_transaction(transaction_type);


-- 7. BẢNG KHIẾU NẠI & HỖ TRỢ CSKH (SUPPORT TICKET & MESSAGES)
-- Tối ưu hóa đếm ticket chờ xử lý, sắp xếp theo mức độ khẩn cấp (SLA)
CREATE INDEX IF NOT EXISTS idx_support_ticket_customer_id 
    ON public.support_ticket(customer_id);

CREATE INDEX IF NOT EXISTS idx_support_ticket_order_id 
    ON public.support_ticket(order_id);

CREATE INDEX IF NOT EXISTS idx_support_ticket_appointment_id 
    ON public.support_ticket(appointment_id);

CREATE INDEX IF NOT EXISTS idx_support_ticket_status_priority 
    ON public.support_ticket(status, priority);

CREATE INDEX IF NOT EXISTS idx_support_ticket_created_at 
    ON public.support_ticket(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_ticket_msg_ticket_id 
    ON public.support_ticket_message(ticket_id, created_at ASC);


-- 8. BẢNG TRỰC CHAT CSKH & LỊCH SỬ TIN NHẮN (CHAT CONVERSATION)
-- Tối ưu hóa tải Inbox hội thoại realtime và tra cứu khách hàng
CREATE INDEX IF NOT EXISTS idx_chat_conversation_customer_id 
    ON public.chat_conversation(customer_id);

CREATE INDEX IF NOT EXISTS idx_chat_conversation_status_updated 
    ON public.chat_conversation(status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_message_conversation_id 
    ON public.chat_message(conversation_id, created_at ASC);


-- 9. BẢNG SỔ CÁI ĐIỂM THƯỞNG PAW POINTS
-- Tối ưu hóa lịch sử tích/tiêu điểm và đối soát số dư thành viên
CREATE INDEX IF NOT EXISTS idx_paw_point_tx_customer_id 
    ON public.paw_point_transaction(customer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_paw_point_tx_reward_rule 
    ON public.paw_point_transaction(reward_rule_id);


-- 10. BẢNG NHÂN SỰ & LỊCH CA LÀM VIỆC (STAFF & SCHEDULE)
-- Tối ưu hóa kiểm tra trùng ca làm việc và điều phối nhân sự theo ngày
CREATE INDEX IF NOT EXISTS idx_staff_account_status 
    ON public.staff(account_status);

CREATE INDEX IF NOT EXISTS idx_staff_schedule_staff_date 
    ON public.staff_schedule(staff_id, work_date);

CREATE INDEX IF NOT EXISTS idx_staff_schedule_work_date 
    ON public.staff_schedule(work_date);

CREATE INDEX IF NOT EXISTS idx_staff_shift_request_status 
    ON public.staff_shift_request(status, created_at DESC);


-- 11. BẢNG NHẬT KÝ THAO TÁC HỆ THỐNG (AUDIT LOG)
-- Tối ưu hóa tra cứu nhật ký audit theo nhân sự thực hiện
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at 
    ON public.audit_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_staff_id 
    ON public.audit_log(staff_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_entity 
    ON public.audit_log(entity_name, entity_id);

-- ==============================================================================
-- HOÀN TẤT THIẾT LẬP CHỈ MỤC TỐI ƯU CSDL PAWPAL-ER
-- ==============================================================================
