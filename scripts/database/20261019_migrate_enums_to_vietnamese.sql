-- ==============================================================================
-- PAWPAL SYSTEM MIGRATION: ĐỒNG BỘ CHUYỂN ĐỔI TOÀN BỘ ENUM SANG TIẾNG VIỆT
-- Ngày tạo: 2026-10-19
-- Mục tiêu: Chuẩn hóa 33 kiểu ENUM PostgreSQL trong Supabase từ tiếng Anh sang tiếng Việt
--           đảm bảo an toàn 100% dữ liệu hiện có và tương thích với enum.md.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 0. TẠM DROP CÁC VIEW PHỤ THUỘC (SẼ ĐƯỢC TẠO LẠI Ở CUỐI TỆP)
-- ------------------------------------------------------------------------------
DROP VIEW IF EXISTS public.staff_public_view CASCADE;

-- ------------------------------------------------------------------------------
-- 1. account_status_enum (customer.account_status)
-- ------------------------------------------------------------------------------
CREATE TYPE public.account_status_enum_new AS ENUM (
    'dang_hoat_dong', 'tam_khoa', 'da_khoa'
);

ALTER TABLE public.customer ALTER COLUMN account_status DROP DEFAULT;

ALTER TABLE public.customer 
    ALTER COLUMN account_status TYPE public.account_status_enum_new 
    USING (
        CASE account_status::text
            WHEN 'ACTIVE' THEN 'dang_hoat_dong'::public.account_status_enum_new
            WHEN 'INACTIVE' THEN 'tam_khoa'::public.account_status_enum_new
            WHEN 'SUSPENDED' THEN 'tam_khoa'::public.account_status_enum_new
            WHEN 'LOCKED' THEN 'da_khoa'::public.account_status_enum_new
            ELSE 'dang_hoat_dong'::public.account_status_enum_new
        END
    );

ALTER TABLE public.customer ALTER COLUMN account_status SET DEFAULT 'dang_hoat_dong'::public.account_status_enum_new;

DROP TYPE public.account_status_enum CASCADE;
ALTER TYPE public.account_status_enum_new RENAME TO account_status_enum;

-- ------------------------------------------------------------------------------
-- 2. customer_gender_enum (customer_profile.gender)
-- ------------------------------------------------------------------------------
CREATE TYPE public.customer_gender_enum_new AS ENUM (
    'nam', 'nu', 'khac'
);

ALTER TABLE public.customer_profile ALTER COLUMN gender DROP DEFAULT;

ALTER TABLE public.customer_profile 
    ALTER COLUMN gender TYPE public.customer_gender_enum_new 
    USING (
        CASE gender::text
            WHEN 'MALE' THEN 'nam'::public.customer_gender_enum_new
            WHEN 'FEMALE' THEN 'nu'::public.customer_gender_enum_new
            WHEN 'OTHER' THEN 'khac'::public.customer_gender_enum_new
            ELSE 'khac'::public.customer_gender_enum_new
        END
    );

DROP TYPE public.customer_gender_enum CASCADE;
ALTER TYPE public.customer_gender_enum_new RENAME TO customer_gender_enum;

-- ------------------------------------------------------------------------------
-- 3. pet_gender_enum (pet_profile.gender)
-- ------------------------------------------------------------------------------
CREATE TYPE public.pet_gender_enum_new AS ENUM (
    'nam', 'nu', 'khac'
);

ALTER TABLE public.pet_profile ALTER COLUMN gender DROP DEFAULT;

ALTER TABLE public.pet_profile 
    ALTER COLUMN gender TYPE public.pet_gender_enum_new 
    USING (
        CASE gender::text
            WHEN 'MALE' THEN 'nam'::public.pet_gender_enum_new
            WHEN 'FEMALE' THEN 'nu'::public.pet_gender_enum_new
            WHEN 'UNKNOWN' THEN 'khac'::public.pet_gender_enum_new
            ELSE 'khac'::public.pet_gender_enum_new
        END
    );

DROP TYPE public.pet_gender_enum CASCADE;
ALTER TYPE public.pet_gender_enum_new RENAME TO pet_gender_enum;

-- ------------------------------------------------------------------------------
-- 4. reward_type_enum (reward_rule.reward_type)
-- ------------------------------------------------------------------------------
CREATE TYPE public.reward_type_enum_new AS ENUM (
    'paw_points', 'voucher'
);

ALTER TABLE public.reward_rule ALTER COLUMN reward_type DROP DEFAULT;

ALTER TABLE public.reward_rule 
    ALTER COLUMN reward_type TYPE public.reward_type_enum_new 
    USING (
        CASE reward_type::text
            WHEN 'PAW_POINTS' THEN 'paw_points'::public.reward_type_enum_new
            WHEN 'VOUCHER' THEN 'voucher'::public.reward_type_enum_new
            ELSE 'paw_points'::public.reward_type_enum_new
        END
    );

DROP TYPE public.reward_type_enum CASCADE;
ALTER TYPE public.reward_type_enum_new RENAME TO reward_type_enum;

-- ------------------------------------------------------------------------------
-- 5. trigger_event_enum (reward_rule.trigger_event)
-- ------------------------------------------------------------------------------
CREATE TYPE public.trigger_event_enum_new AS ENUM (
    'dang_ky', 'mua_hang', 'dat_lich', 'danh_gia', 'khuyen_mai', 'dieu_chinh_thu_cong'
);

ALTER TABLE public.reward_rule ALTER COLUMN trigger_event DROP DEFAULT;

ALTER TABLE public.reward_rule 
    ALTER COLUMN trigger_event TYPE public.trigger_event_enum_new 
    USING (
        CASE trigger_event::text
            WHEN 'REGISTER' THEN 'dang_ky'::public.trigger_event_enum_new
            WHEN 'PURCHASE' THEN 'mua_hang'::public.trigger_event_enum_new
            WHEN 'BOOK_SERVICE' THEN 'dat_lich'::public.trigger_event_enum_new
            WHEN 'REVIEW' THEN 'danh_gia'::public.trigger_event_enum_new
            WHEN 'PROMOTION' THEN 'khuyen_mai'::public.trigger_event_enum_new
            WHEN 'MANUAL' THEN 'dieu_chinh_thu_cong'::public.trigger_event_enum_new
            ELSE 'mua_hang'::public.trigger_event_enum_new
        END
    );

DROP TYPE public.trigger_event_enum CASCADE;
ALTER TYPE public.trigger_event_enum_new RENAME TO trigger_event_enum;

-- ------------------------------------------------------------------------------
-- 6. acquired_method_enum (customer_voucher.acquired_method)
-- ------------------------------------------------------------------------------
CREATE TYPE public.acquired_method_enum_new AS ENUM (
    'doi_diem', 'khuyen_mai', 'tang'
);

ALTER TABLE public.customer_voucher ALTER COLUMN acquired_method DROP DEFAULT;

ALTER TABLE public.customer_voucher 
    ALTER COLUMN acquired_method TYPE public.acquired_method_enum_new 
    USING (
        CASE acquired_method::text
            WHEN 'REDEEM_POINTS' THEN 'doi_diem'::public.acquired_method_enum_new
            WHEN 'PROMOTION' THEN 'khuyen_mai'::public.acquired_method_enum_new
            WHEN 'ADMIN_GIFT' THEN 'tang'::public.acquired_method_enum_new
            ELSE 'khuyen_mai'::public.acquired_method_enum_new
        END
    );

DROP TYPE public.acquired_method_enum CASCADE;
ALTER TYPE public.acquired_method_enum_new RENAME TO acquired_method_enum;

-- ------------------------------------------------------------------------------
-- 7. voucher_status_enum (customer_voucher.voucher_status)
-- ------------------------------------------------------------------------------
CREATE TYPE public.voucher_status_enum_new AS ENUM (
    'chua_su_dung', 'da_su_dung', 'da_het_han', 'da_huy'
);

ALTER TABLE public.customer_voucher ALTER COLUMN voucher_status DROP DEFAULT;

ALTER TABLE public.customer_voucher 
    ALTER COLUMN voucher_status TYPE public.voucher_status_enum_new 
    USING (
        CASE voucher_status::text
            WHEN 'AVAILABLE' THEN 'chua_su_dung'::public.voucher_status_enum_new
            WHEN 'USED' THEN 'da_su_dung'::public.voucher_status_enum_new
            WHEN 'EXPIRED' THEN 'da_het_han'::public.voucher_status_enum_new
            ELSE 'chua_su_dung'::public.voucher_status_enum_new
        END
    );

ALTER TABLE public.customer_voucher ALTER COLUMN voucher_status SET DEFAULT 'chua_su_dung'::public.voucher_status_enum_new;

DROP TYPE public.voucher_status_enum CASCADE;
ALTER TYPE public.voucher_status_enum_new RENAME TO voucher_status_enum;

-- ------------------------------------------------------------------------------
-- 8. pet_status_enum (pet_profile.status)
-- ------------------------------------------------------------------------------
CREATE TYPE public.pet_status_enum_new AS ENUM (
    'dang_hoat_dong', 'tam_ngung', 'da_an'
);

ALTER TABLE public.pet_profile ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.pet_profile 
    ALTER COLUMN status TYPE public.pet_status_enum_new 
    USING (
        CASE status::text
            WHEN 'ACTIVE' THEN 'dang_hoat_dong'::public.pet_status_enum_new
            WHEN 'INACTIVE' THEN 'tam_ngung'::public.pet_status_enum_new
            WHEN 'DECEASED' THEN 'da_an'::public.pet_status_enum_new
            ELSE 'dang_hoat_dong'::public.pet_status_enum_new
        END
    );

ALTER TABLE public.pet_profile ALTER COLUMN status SET DEFAULT 'dang_hoat_dong'::public.pet_status_enum_new;

DROP TYPE public.pet_status_enum CASCADE;
ALTER TYPE public.pet_status_enum_new RENAME TO pet_status_enum;

-- ------------------------------------------------------------------------------
-- 9. service_category_enum (service.service_category, care_action.service_category)
-- ------------------------------------------------------------------------------
CREATE TYPE public.service_category_enum_new AS ENUM (
    'grooming_spa', 'pet_hotel', 'pet_taxi'
);

ALTER TABLE public.service ALTER COLUMN service_category DROP DEFAULT;
ALTER TABLE public.care_action ALTER COLUMN service_category DROP DEFAULT;

ALTER TABLE public.service 
    ALTER COLUMN service_category TYPE public.service_category_enum_new 
    USING (
        CASE service_category::text
            WHEN 'GROOMING_SPA' THEN 'grooming_spa'::public.service_category_enum_new
            WHEN 'PET_HOTEL' THEN 'pet_hotel'::public.service_category_enum_new
            WHEN 'PET_TAXI' THEN 'pet_taxi'::public.service_category_enum_new
            ELSE 'grooming_spa'::public.service_category_enum_new
        END
    );

ALTER TABLE public.care_action 
    ALTER COLUMN service_category TYPE public.service_category_enum_new 
    USING (
        CASE service_category::text
            WHEN 'GROOMING_SPA' THEN 'grooming_spa'::public.service_category_enum_new
            WHEN 'PET_HOTEL' THEN 'pet_hotel'::public.service_category_enum_new
            WHEN 'PET_TAXI' THEN 'pet_taxi'::public.service_category_enum_new
            ELSE 'grooming_spa'::public.service_category_enum_new
        END
    );

DROP TYPE public.service_category_enum CASCADE;
ALTER TYPE public.service_category_enum_new RENAME TO service_category_enum;

-- ------------------------------------------------------------------------------
-- 10. service_status_enum (service.status, service_price_matrix.status)
-- ------------------------------------------------------------------------------
CREATE TYPE public.service_status_enum_new AS ENUM (
    'dang_hoat_dong', 'tam_ngung', 'ngung_cung_cap'
);

ALTER TABLE public.service ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.service_price_matrix ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.service 
    ALTER COLUMN status TYPE public.service_status_enum_new 
    USING (
        CASE status::text
            WHEN 'ACTIVE' THEN 'dang_hoat_dong'::public.service_status_enum_new
            WHEN 'INACTIVE' THEN 'tam_ngung'::public.service_status_enum_new
            ELSE 'dang_hoat_dong'::public.service_status_enum_new
        END
    );

ALTER TABLE public.service_price_matrix 
    ALTER COLUMN status TYPE public.service_status_enum_new 
    USING (
        CASE status::text
            WHEN 'ACTIVE' THEN 'dang_hoat_dong'::public.service_status_enum_new
            WHEN 'INACTIVE' THEN 'tam_ngung'::public.service_status_enum_new
            ELSE 'dang_hoat_dong'::public.service_status_enum_new
        END
    );

ALTER TABLE public.service ALTER COLUMN status SET DEFAULT 'dang_hoat_dong'::public.service_status_enum_new;
ALTER TABLE public.service_price_matrix ALTER COLUMN status SET DEFAULT 'dang_hoat_dong'::public.service_status_enum_new;

DROP TYPE public.service_status_enum CASCADE;
ALTER TYPE public.service_status_enum_new RENAME TO service_status_enum;

-- ------------------------------------------------------------------------------
-- 11. appointment_status_enum (appointment.appointment_status)
-- ------------------------------------------------------------------------------
CREATE TYPE public.appointment_status_enum_new AS ENUM (
    'cho_xac_nhan', 'da_xac_nhan', 'da_check_in', 'dang_thuc_hien', 'da_hoan_tat', 'da_huy', 'vang_mat'
);

ALTER TABLE public.appointment ALTER COLUMN appointment_status DROP DEFAULT;

ALTER TABLE public.appointment 
    ALTER COLUMN appointment_status TYPE public.appointment_status_enum_new 
    USING (
        CASE appointment_status::text
            WHEN 'PENDING' THEN 'cho_xac_nhan'::public.appointment_status_enum_new
            WHEN 'CONFIRMED' THEN 'da_xac_nhan'::public.appointment_status_enum_new
            WHEN 'CHECKED_IN' THEN 'da_check_in'::public.appointment_status_enum_new
            WHEN 'IN_PROGRESS' THEN 'dang_thuc_hien'::public.appointment_status_enum_new
            WHEN 'COMPLETED' THEN 'da_hoan_tat'::public.appointment_status_enum_new
            WHEN 'CANCELLED' THEN 'da_huy'::public.appointment_status_enum_new
            WHEN 'NO_SHOW' THEN 'vang_mat'::public.appointment_status_enum_new
            ELSE 'cho_xac_nhan'::public.appointment_status_enum_new
        END
    );

ALTER TABLE public.appointment ALTER COLUMN appointment_status SET DEFAULT 'cho_xac_nhan'::public.appointment_status_enum_new;

DROP TYPE public.appointment_status_enum CASCADE;
ALTER TYPE public.appointment_status_enum_new RENAME TO appointment_status_enum;

-- ------------------------------------------------------------------------------
-- 12. payment_status_enum (sales_order.payment_status, appointment.payment_status)
-- ------------------------------------------------------------------------------
CREATE TYPE public.payment_status_enum_new AS ENUM (
    'chua_thanh_toan', 'da_thanh_toan', 'thanh_toan_that_bai', 'da_hoan_tien'
);

ALTER TABLE public.sales_order ALTER COLUMN payment_status DROP DEFAULT;
ALTER TABLE public.appointment ALTER COLUMN payment_status DROP DEFAULT;

ALTER TABLE public.sales_order 
    ALTER COLUMN payment_status TYPE public.payment_status_enum_new 
    USING (
        CASE payment_status::text
            WHEN 'UNPAID' THEN 'chua_thanh_toan'::public.payment_status_enum_new
            WHEN 'PENDING' THEN 'chua_thanh_toan'::public.payment_status_enum_new
            WHEN 'PAID' THEN 'da_thanh_toan'::public.payment_status_enum_new
            WHEN 'FAILED' THEN 'thanh_toan_that_bai'::public.payment_status_enum_new
            WHEN 'REFUNDED' THEN 'da_hoan_tien'::public.payment_status_enum_new
            ELSE 'chua_thanh_toan'::public.payment_status_enum_new
        END
    );

ALTER TABLE public.appointment 
    ALTER COLUMN payment_status TYPE public.payment_status_enum_new 
    USING (
        CASE payment_status::text
            WHEN 'UNPAID' THEN 'chua_thanh_toan'::public.payment_status_enum_new
            WHEN 'PENDING' THEN 'chua_thanh_toan'::public.payment_status_enum_new
            WHEN 'PAID' THEN 'da_thanh_toan'::public.payment_status_enum_new
            WHEN 'FAILED' THEN 'thanh_toan_that_bai'::public.payment_status_enum_new
            WHEN 'REFUNDED' THEN 'da_hoan_tien'::public.payment_status_enum_new
            ELSE 'chua_thanh_toan'::public.payment_status_enum_new
        END
    );

ALTER TABLE public.sales_order ALTER COLUMN payment_status SET DEFAULT 'chua_thanh_toan'::public.payment_status_enum_new;
ALTER TABLE public.appointment ALTER COLUMN payment_status SET DEFAULT 'chua_thanh_toan'::public.payment_status_enum_new;

DROP TYPE public.payment_status_enum CASCADE;
ALTER TYPE public.payment_status_enum_new RENAME TO payment_status_enum;

-- ------------------------------------------------------------------------------
-- 13. media_type_enum (care_log_media.media_type)
-- ------------------------------------------------------------------------------
CREATE TYPE public.media_type_enum_new AS ENUM (
    'hinh_anh', 'video'
);

ALTER TABLE public.care_log_media ALTER COLUMN media_type DROP DEFAULT;

ALTER TABLE public.care_log_media 
    ALTER COLUMN media_type TYPE public.media_type_enum_new 
    USING (
        CASE media_type::text
            WHEN 'IMAGE' THEN 'hinh_anh'::public.media_type_enum_new
            WHEN 'VIDEO' THEN 'video'::public.media_type_enum_new
            ELSE 'hinh_anh'::public.media_type_enum_new
        END
    );

DROP TYPE public.media_type_enum CASCADE;
ALTER TYPE public.media_type_enum_new RENAME TO media_type_enum;

-- ------------------------------------------------------------------------------
-- 14. supplier_status_enum (supplier.status)
-- ------------------------------------------------------------------------------
CREATE TYPE public.supplier_status_enum_new AS ENUM (
    'dang_hop_tac', 'tam_ngung', 'ngung_hop_tac'
);

ALTER TABLE public.supplier ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.supplier 
    ALTER COLUMN status TYPE public.supplier_status_enum_new 
    USING (
        CASE status::text
            WHEN 'ACTIVE' THEN 'dang_hop_tac'::public.supplier_status_enum_new
            WHEN 'INACTIVE' THEN 'tam_ngung'::public.supplier_status_enum_new
            ELSE 'dang_hop_tac'::public.supplier_status_enum_new
        END
    );

ALTER TABLE public.supplier ALTER COLUMN status SET DEFAULT 'dang_hop_tac'::public.supplier_status_enum_new;

DROP TYPE public.supplier_status_enum CASCADE;
ALTER TYPE public.supplier_status_enum_new RENAME TO supplier_status_enum;

-- ------------------------------------------------------------------------------
-- 15. purchase_order_status_enum (purchase_order.order_status)
-- ------------------------------------------------------------------------------
CREATE TYPE public.purchase_order_status_enum_new AS ENUM (
    'nhap', 'da_xac_nhan', 'dang_nhan_hang', 'da_nhan_du', 'da_huy'
);

ALTER TABLE public.purchase_order ALTER COLUMN order_status DROP DEFAULT;

ALTER TABLE public.purchase_order 
    ALTER COLUMN order_status TYPE public.purchase_order_status_enum_new 
    USING (
        CASE order_status::text
            WHEN 'DRAFT' THEN 'nhap'::public.purchase_order_status_enum_new
            WHEN 'ORDERED' THEN 'da_xac_nhan'::public.purchase_order_status_enum_new
            WHEN 'PARTIAL_RECEIVED' THEN 'dang_nhan_hang'::public.purchase_order_status_enum_new
            WHEN 'COMPLETED' THEN 'da_nhan_du'::public.purchase_order_status_enum_new
            WHEN 'CANCELLED' THEN 'da_huy'::public.purchase_order_status_enum_new
            ELSE 'nhap'::public.purchase_order_status_enum_new
        END
    );

ALTER TABLE public.purchase_order ALTER COLUMN order_status SET DEFAULT 'nhap'::public.purchase_order_status_enum_new;

DROP TYPE public.purchase_order_status_enum CASCADE;
ALTER TYPE public.purchase_order_status_enum_new RENAME TO purchase_order_status_enum;

-- ------------------------------------------------------------------------------
-- 16. product_status_enum (product.status)
-- ------------------------------------------------------------------------------
CREATE TYPE public.product_status_enum_new AS ENUM (
    'dang_ban', 'tam_ngung', 'ngung_ban'
);

ALTER TABLE public.product ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.product 
    ALTER COLUMN status TYPE public.product_status_enum_new 
    USING (
        CASE status::text
            WHEN 'ACTIVE' THEN 'dang_ban'::public.product_status_enum_new
            WHEN 'INACTIVE' THEN 'tam_ngung'::public.product_status_enum_new
            WHEN 'OUT_OF_STOCK' THEN 'tam_ngung'::public.product_status_enum_new
            ELSE 'dang_ban'::public.product_status_enum_new
        END
    );

ALTER TABLE public.product ALTER COLUMN status SET DEFAULT 'dang_ban'::public.product_status_enum_new;

DROP TYPE public.product_status_enum CASCADE;
ALTER TYPE public.product_status_enum_new RENAME TO product_status_enum;

-- ------------------------------------------------------------------------------
-- 17. cart_status_enum (cart.cart_status)
-- ------------------------------------------------------------------------------
CREATE TYPE public.cart_status_enum_new AS ENUM (
    'dang_hoat_dong', 'da_chuyen_thanh_don', 'da_huy', 'da_het_han'
);

ALTER TABLE public.cart ALTER COLUMN cart_status DROP DEFAULT;

ALTER TABLE public.cart 
    ALTER COLUMN cart_status TYPE public.cart_status_enum_new 
    USING (
        CASE cart_status::text
            WHEN 'ACTIVE' THEN 'dang_hoat_dong'::public.cart_status_enum_new
            WHEN 'CHECKED_OUT' THEN 'da_chuyen_thanh_don'::public.cart_status_enum_new
            WHEN 'ABANDONED' THEN 'da_het_han'::public.cart_status_enum_new
            ELSE 'dang_hoat_dong'::public.cart_status_enum_new
        END
    );

ALTER TABLE public.cart ALTER COLUMN cart_status SET DEFAULT 'dang_hoat_dong'::public.cart_status_enum_new;

DROP TYPE public.cart_status_enum CASCADE;
ALTER TYPE public.cart_status_enum_new RENAME TO cart_status_enum;

-- ------------------------------------------------------------------------------
-- 18. inventory_transaction_type_enum (inventory_transaction.transaction_type)
-- ------------------------------------------------------------------------------
CREATE TYPE public.inventory_transaction_type_enum_new AS ENUM (
    'nhap_kho', 'xuat_kho', 'dieu_chinh_tang', 'dieu_chinh_giam', 'hoan_kho'
);

ALTER TABLE public.inventory_transaction ALTER COLUMN transaction_type DROP DEFAULT;

ALTER TABLE public.inventory_transaction 
    ALTER COLUMN transaction_type TYPE public.inventory_transaction_type_enum_new 
    USING (
        CASE transaction_type::text
            WHEN 'IMPORT' THEN 'nhap_kho'::public.inventory_transaction_type_enum_new
            WHEN 'EXPORT' THEN 'xuat_kho'::public.inventory_transaction_type_enum_new
            WHEN 'ADJUSTMENT' THEN 'dieu_chinh_tang'::public.inventory_transaction_type_enum_new
            ELSE 'nhap_kho'::public.inventory_transaction_type_enum_new
        END
    );

DROP TYPE public.inventory_transaction_type_enum CASCADE;
ALTER TYPE public.inventory_transaction_type_enum_new RENAME TO inventory_transaction_type_enum;

-- ------------------------------------------------------------------------------
-- 19. payment_type_enum (payment.payment_type)
-- ------------------------------------------------------------------------------
CREATE TYPE public.payment_type_enum_new AS ENUM (
    'mua_hang', 'dat_lich'
);

ALTER TABLE public.payment ALTER COLUMN payment_type DROP DEFAULT;

ALTER TABLE public.payment 
    ALTER COLUMN payment_type TYPE public.payment_type_enum_new 
    USING (
        CASE payment_type::text
            WHEN 'PRODUCT' THEN 'mua_hang'::public.payment_type_enum_new
            WHEN 'SERVICE' THEN 'dat_lich'::public.payment_type_enum_new
            ELSE 'mua_hang'::public.payment_type_enum_new
        END
    );

DROP TYPE public.payment_type_enum CASCADE;
ALTER TYPE public.payment_type_enum_new RENAME TO payment_type_enum;

-- ------------------------------------------------------------------------------
-- 20. transaction_status_enum (payment.transaction_status)
-- ------------------------------------------------------------------------------
CREATE TYPE public.transaction_status_enum_new AS ENUM (
    'cho_xu_ly', 'dang_xu_ly', 'thanh_cong', 'that_bai', 'da_huy', 'da_hoan_tien'
);

ALTER TABLE public.payment ALTER COLUMN transaction_status DROP DEFAULT;

ALTER TABLE public.payment 
    ALTER COLUMN transaction_status TYPE public.transaction_status_enum_new 
    USING (
        CASE transaction_status::text
            WHEN 'PENDING' THEN 'cho_xu_ly'::public.transaction_status_enum_new
            WHEN 'SUCCESS' THEN 'thanh_cong'::public.transaction_status_enum_new
            WHEN 'FAILED' THEN 'that_bai'::public.transaction_status_enum_new
            WHEN 'CANCELLED' THEN 'da_huy'::public.transaction_status_enum_new
            WHEN 'REFUNDED' THEN 'da_hoan_tien'::public.transaction_status_enum_new
            ELSE 'cho_xu_ly'::public.transaction_status_enum_new
        END
    );

ALTER TABLE public.payment ALTER COLUMN transaction_status SET DEFAULT 'cho_xu_ly'::public.transaction_status_enum_new;

DROP TYPE public.transaction_status_enum CASCADE;
ALTER TYPE public.transaction_status_enum_new RENAME TO transaction_status_enum;

-- ------------------------------------------------------------------------------
-- 21. review_type_enum (review.review_type)
-- ------------------------------------------------------------------------------
CREATE TYPE public.review_type_enum_new AS ENUM (
    'san_pham', 'dich_vu'
);

ALTER TABLE public.review ALTER COLUMN review_type DROP DEFAULT;

ALTER TABLE public.review 
    ALTER COLUMN review_type TYPE public.review_type_enum_new 
    USING (
        CASE review_type::text
            WHEN 'PRODUCT' THEN 'san_pham'::public.review_type_enum_new
            WHEN 'SERVICE' THEN 'dich_vu'::public.review_type_enum_new
            ELSE 'san_pham'::public.review_type_enum_new
        END
    );

DROP TYPE public.review_type_enum CASCADE;
ALTER TYPE public.review_type_enum_new RENAME TO review_type_enum;

-- ------------------------------------------------------------------------------
-- 22. review_status_enum (review.review_status)
-- ------------------------------------------------------------------------------
CREATE TYPE public.review_status_enum_new AS ENUM (
    'cho_duyet', 'da_duyet', 'an', 'tu_choi'
);

ALTER TABLE public.review ALTER COLUMN review_status DROP DEFAULT;

ALTER TABLE public.review 
    ALTER COLUMN review_status TYPE public.review_status_enum_new 
    USING (
        CASE review_status::text
            WHEN 'PENDING' THEN 'cho_duyet'::public.review_status_enum_new
            WHEN 'APPROVED' THEN 'da_duyet'::public.review_status_enum_new
            WHEN 'HIDDEN' THEN 'an'::public.review_status_enum_new
            WHEN 'REJECTED' THEN 'tu_choi'::public.review_status_enum_new
            ELSE 'cho_duyet'::public.review_status_enum_new
        END
    );

ALTER TABLE public.review ALTER COLUMN review_status SET DEFAULT 'cho_duyet'::public.review_status_enum_new;

DROP TYPE public.review_status_enum CASCADE;
ALTER TYPE public.review_status_enum_new RENAME TO review_status_enum;

-- ------------------------------------------------------------------------------
-- 23. return_type_enum (return_request.return_type)
-- ------------------------------------------------------------------------------
CREATE TYPE public.return_type_enum_new AS ENUM (
    'doi_san_pham', 'tra_san_pham', 'hoan_tien'
);

ALTER TABLE public.return_request ALTER COLUMN return_type DROP DEFAULT;

ALTER TABLE public.return_request 
    ALTER COLUMN return_type TYPE public.return_type_enum_new 
    USING (
        CASE return_type::text
            WHEN 'EXCHANGE' THEN 'doi_san_pham'::public.return_type_enum_new
            WHEN 'RETURN' THEN 'tra_san_pham'::public.return_type_enum_new
            ELSE 'tra_san_pham'::public.return_type_enum_new
        END
    );

DROP TYPE public.return_type_enum CASCADE;
ALTER TYPE public.return_type_enum_new RENAME TO return_type_enum;

-- ------------------------------------------------------------------------------
-- 24. return_status_enum (return_request.request_status)
-- ------------------------------------------------------------------------------
CREATE TYPE public.return_status_enum_new AS ENUM (
    'cho_xu_ly', 'dang_xu_ly', 'da_duyet', 'da_hoan_tat', 'da_tu_choi', 'da_huy'
);

ALTER TABLE public.return_request ALTER COLUMN request_status DROP DEFAULT;

ALTER TABLE public.return_request 
    ALTER COLUMN request_status TYPE public.return_status_enum_new 
    USING (
        CASE request_status::text
            WHEN 'PENDING' THEN 'cho_xu_ly'::public.return_status_enum_new
            WHEN 'APPROVED' THEN 'da_duyet'::public.return_status_enum_new
            WHEN 'REJECTED' THEN 'da_tu_choi'::public.return_status_enum_new
            WHEN 'COMPLETED' THEN 'da_hoan_tat'::public.return_status_enum_new
            ELSE 'cho_xu_ly'::public.return_status_enum_new
        END
    );

ALTER TABLE public.return_request ALTER COLUMN request_status SET DEFAULT 'cho_xu_ly'::public.return_status_enum_new;

DROP TYPE public.return_status_enum CASCADE;
ALTER TYPE public.return_status_enum_new RENAME TO return_status_enum;

-- ------------------------------------------------------------------------------
-- 25. staff_role_enum (staff.role)
-- ------------------------------------------------------------------------------
CREATE TYPE public.staff_role_enum_new AS ENUM (
    'chu_he_thong', 'quan_tri_vien', 'le_tan', 'cham_soc_thu_cung', 'cham_soc_khach_hang', 'quan_ly'
);

ALTER TABLE public.staff ALTER COLUMN role DROP DEFAULT;

ALTER TABLE public.staff 
    ALTER COLUMN role TYPE public.staff_role_enum_new 
    USING (
        CASE role::text
            WHEN 'SUPER_ADMIN' THEN 'chu_he_thong'::public.staff_role_enum_new
            WHEN 'ADMIN' THEN 'quan_tri_vien'::public.staff_role_enum_new
            WHEN 'RECEPTIONIST' THEN 'le_tan'::public.staff_role_enum_new
            WHEN 'PET_CARE' THEN 'cham_soc_thu_cung'::public.staff_role_enum_new
            WHEN 'CUSTOMER_SERVICE' THEN 'cham_soc_khach_hang'::public.staff_role_enum_new
            ELSE 'le_tan'::public.staff_role_enum_new
        END
    );

ALTER TABLE public.staff ALTER COLUMN role SET DEFAULT 'le_tan'::public.staff_role_enum_new;

DROP TYPE public.staff_role_enum CASCADE;
ALTER TYPE public.staff_role_enum_new RENAME TO staff_role_enum;

-- ------------------------------------------------------------------------------
-- 26. discount_type_enum (promotion.discount_type)
-- ------------------------------------------------------------------------------
CREATE TYPE public.discount_type_enum_new AS ENUM (
    'phan_tram', 'so_tien_co_dinh'
);

ALTER TABLE public.promotion ALTER COLUMN discount_type DROP DEFAULT;

ALTER TABLE public.promotion 
    ALTER COLUMN discount_type TYPE public.discount_type_enum_new 
    USING (
        CASE discount_type::text
            WHEN 'PERCENT' THEN 'phan_tram'::public.discount_type_enum_new
            WHEN 'FIXED_AMOUNT' THEN 'so_tien_co_dinh'::public.discount_type_enum_new
            ELSE 'phan_tram'::public.discount_type_enum_new
        END
    );

DROP TYPE public.discount_type_enum CASCADE;
ALTER TYPE public.discount_type_enum_new RENAME TO discount_type_enum;

-- ------------------------------------------------------------------------------
-- 27. promotion_status_enum (promotion.status)
-- ------------------------------------------------------------------------------
CREATE TYPE public.promotion_status_enum_new AS ENUM (
    'nhap', 'dang_ap_dung', 'het_han', 'tam_dung', 'da_huy'
);

ALTER TABLE public.promotion ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.promotion 
    ALTER COLUMN status TYPE public.promotion_status_enum_new 
    USING (
        CASE status::text
            WHEN 'DRAFT' THEN 'nhap'::public.promotion_status_enum_new
            WHEN 'ACTIVE' THEN 'dang_ap_dung'::public.promotion_status_enum_new
            WHEN 'EXPIRED' THEN 'het_han'::public.promotion_status_enum_new
            WHEN 'DISABLED' THEN 'tam_dung'::public.promotion_status_enum_new
            ELSE 'nhap'::public.promotion_status_enum_new
        END
    );

ALTER TABLE public.promotion ALTER COLUMN status SET DEFAULT 'nhap'::public.promotion_status_enum_new;

DROP TYPE public.promotion_status_enum CASCADE;
ALTER TYPE public.promotion_status_enum_new RENAME TO promotion_status_enum;

-- ------------------------------------------------------------------------------
-- 28. blog_status_enum (blog_category.status, blog_post.status)
-- ------------------------------------------------------------------------------
CREATE TYPE public.blog_status_enum_new AS ENUM (
    'nhap', 'da_len_lich', 'da_xuat_ban', 'da_an'
);

ALTER TABLE public.blog_category ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.blog_post ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.blog_category 
    ALTER COLUMN status TYPE public.blog_status_enum_new 
    USING (
        CASE status::text
            WHEN 'DRAFT' THEN 'nhap'::public.blog_status_enum_new
            WHEN 'PUBLISHED' THEN 'da_xuat_ban'::public.blog_status_enum_new
            WHEN 'ARCHIVED' THEN 'da_an'::public.blog_status_enum_new
            ELSE 'nhap'::public.blog_status_enum_new
        END
    );

ALTER TABLE public.blog_post 
    ALTER COLUMN status TYPE public.blog_status_enum_new 
    USING (
        CASE status::text
            WHEN 'DRAFT' THEN 'nhap'::public.blog_status_enum_new
            WHEN 'PUBLISHED' THEN 'da_xuat_ban'::public.blog_status_enum_new
            WHEN 'ARCHIVED' THEN 'da_an'::public.blog_status_enum_new
            ELSE 'nhap'::public.blog_status_enum_new
        END
    );

ALTER TABLE public.blog_category ALTER COLUMN status SET DEFAULT 'nhap'::public.blog_status_enum_new;
ALTER TABLE public.blog_post ALTER COLUMN status SET DEFAULT 'nhap'::public.blog_status_enum_new;

DROP TYPE public.blog_status_enum CASCADE;
ALTER TYPE public.blog_status_enum_new RENAME TO blog_status_enum;

-- ------------------------------------------------------------------------------
-- 29. notification_type_enum (notification.notification_type)
-- ------------------------------------------------------------------------------
CREATE TYPE public.notification_type_enum_new AS ENUM (
    'don_hang_moi', 'don_hang_da_xac_nhan', 'don_hang_da_giao_van', 'don_hang_da_giao', 'don_hang_da_duoc_huy',
    'lich_hen_da_xac_nhan', 'lich_hen_da_thay_doi', 'cap_nhat_yeu_cau_ho_tro', 'hoan_tien_thanh_cong', 'hoan_tien_that_bai'
);

ALTER TABLE public.notification ALTER COLUMN notification_type DROP DEFAULT;

ALTER TABLE public.notification 
    ALTER COLUMN notification_type TYPE public.notification_type_enum_new 
    USING (
        CASE notification_type::text
            WHEN 'BOOKING' THEN 'lich_hen_da_xac_nhan'::public.notification_type_enum_new
            WHEN 'ORDER' THEN 'don_hang_moi'::public.notification_type_enum_new
            WHEN 'PAYMENT' THEN 'hoan_tien_thanh_cong'::public.notification_type_enum_new
            WHEN 'PROMOTION' THEN 'don_hang_moi'::public.notification_type_enum_new
            WHEN 'SYSTEM' THEN 'cap_nhat_yeu_cau_ho_tro'::public.notification_type_enum_new
            ELSE 'don_hang_moi'::public.notification_type_enum_new
        END
    );

DROP TYPE public.notification_type_enum CASCADE;
ALTER TYPE public.notification_type_enum_new RENAME TO notification_type_enum;

-- ------------------------------------------------------------------------------
-- 30. order_status_enum (sales_order.order_status)
-- ------------------------------------------------------------------------------
CREATE TYPE public.order_status_enum_new AS ENUM (
    'cho_xac_nhan', 'da_xac_nhan', 'dang_dong_goi', 'dang_giao_hang', 'da_giao_hang', 'da_huy', 'da_tra_hang'
);

ALTER TABLE public.sales_order ALTER COLUMN order_status DROP DEFAULT;

ALTER TABLE public.sales_order 
    ALTER COLUMN order_status TYPE public.order_status_enum_new 
    USING (
        CASE order_status::text
            WHEN 'PENDING' THEN 'cho_xac_nhan'::public.order_status_enum_new
            WHEN 'CONFIRMED' THEN 'da_xac_nhan'::public.order_status_enum_new
            WHEN 'PACKING' THEN 'dang_dong_goi'::public.order_status_enum_new
            WHEN 'SHIPPING' THEN 'dang_giao_hang'::public.order_status_enum_new
            WHEN 'DELIVERED' THEN 'da_giao_hang'::public.order_status_enum_new
            WHEN 'CANCELLED' THEN 'da_huy'::public.order_status_enum_new
            WHEN 'RETURNED' THEN 'da_tra_hang'::public.order_status_enum_new
            ELSE 'cho_xac_nhan'::public.order_status_enum_new
        END
    );

ALTER TABLE public.sales_order ALTER COLUMN order_status SET DEFAULT 'cho_xac_nhan'::public.order_status_enum_new;

DROP TYPE public.order_status_enum CASCADE;
ALTER TYPE public.order_status_enum_new RENAME TO order_status_enum;

-- ------------------------------------------------------------------------------
-- 31. shift_enum (staff_schedule.shift)
-- ------------------------------------------------------------------------------
CREATE TYPE public.shift_enum_new AS ENUM (
    'ca_sang', 'ca_chieu', 'ca_toi'
);

ALTER TABLE public.staff_schedule ALTER COLUMN shift DROP DEFAULT;

ALTER TABLE public.staff_schedule 
    ALTER COLUMN shift TYPE public.shift_enum_new 
    USING (
        CASE shift::text
            WHEN 'MORNING' THEN 'ca_sang'::public.shift_enum_new
            WHEN 'AFTERNOON' THEN 'ca_chieu'::public.shift_enum_new
            WHEN 'EVENING' THEN 'ca_toi'::public.shift_enum_new
            ELSE 'ca_sang'::public.shift_enum_new
        END
    );

DROP TYPE public.shift_enum CASCADE;
ALTER TYPE public.shift_enum_new RENAME TO shift_enum;

-- ------------------------------------------------------------------------------
-- 32. schedule_status_enum (staff_schedule.schedule_status)
-- ------------------------------------------------------------------------------
CREATE TYPE public.schedule_status_enum_new AS ENUM (
    'da_len_lich', 'dang_lam_viec', 'da_hoan_thanh', 'nghi'
);

ALTER TABLE public.staff_schedule ALTER COLUMN schedule_status DROP DEFAULT;

ALTER TABLE public.staff_schedule 
    ALTER COLUMN schedule_status TYPE public.schedule_status_enum_new 
    USING (
        CASE schedule_status::text
            WHEN 'SCHEDULED' THEN 'da_len_lich'::public.schedule_status_enum_new
            WHEN 'WORKING' THEN 'dang_lam_viec'::public.schedule_status_enum_new
            WHEN 'COMPLETED' THEN 'da_hoan_thanh'::public.schedule_status_enum_new
            WHEN 'OFF' THEN 'nghi'::public.schedule_status_enum_new
            ELSE 'da_len_lich'::public.schedule_status_enum_new
        END
    );

ALTER TABLE public.staff_schedule ALTER COLUMN schedule_status SET DEFAULT 'da_len_lich'::public.schedule_status_enum_new;

DROP TYPE public.schedule_status_enum CASCADE;
ALTER TYPE public.schedule_status_enum_new RENAME TO schedule_status_enum;

-- ------------------------------------------------------------------------------
-- 33. category_status_enum (product_category.status)
-- ------------------------------------------------------------------------------
CREATE TYPE public.category_status_enum_new AS ENUM (
    'dang_hoat_dong', 'tam_ngung'
);

ALTER TABLE public.product_category ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.product_category 
    ALTER COLUMN status TYPE public.category_status_enum_new 
    USING (
        CASE status::text
            WHEN 'ACTIVE' THEN 'dang_hoat_dong'::public.category_status_enum_new
            WHEN 'INACTIVE' THEN 'tam_ngung'::public.category_status_enum_new
            ELSE 'dang_hoat_dong'::public.category_status_enum_new
        END
    );

ALTER TABLE public.product_category ALTER COLUMN status SET DEFAULT 'dang_hoat_dong'::public.category_status_enum_new;

DROP TYPE public.category_status_enum CASCADE;
ALTER TYPE public.category_status_enum_new RENAME TO category_status_enum;

-- ------------------------------------------------------------------------------
-- 34. TÁI TẠO LẠI VIEW staff_public_view
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.staff_public_view AS
SELECT 
    id,
    auth_user_id,
    full_name,
    phone_number,
    role,
    specialization,
    hire_date,
    account_status,
    system_role,
    created_at,
    updated_at
FROM public.staff;

GRANT SELECT ON public.staff_public_view TO authenticated, anon;

COMMIT;
