# Kiểm kê schema self-host so với từ điển V1

Thời điểm đọc metadata: 2026-10-21T10:43:47.847Z. Nguồn: container local `supabase-db`, database `postgres`, schema `public`.

Tạo lại bằng `node scripts/database/self-host/audit_v1_schema.cjs`. Công cụ chỉ đọc catalog PostgreSQL và mã nguồn; không lấy dữ liệu nghiệp vụ, không đọc secret và không sửa database.

Đối chiếu tên bảng/cột không phải chứng nhận 3NF. Cột ngoài từ điển cần phân tích nghiệp vụ trước khi bỏ; trường có cùng tên vẫn có thể sai kiểu, khóa hoặc ý nghĩa. Các bảng Auth/Storage do Supabase quản lý không thuộc số bảng ứng dụng.

| Nội dung | Số lượng |
|---|---:|
| Thực thể V1 | 105 |
| Thuộc tính V1 | 906 |
| Bảng public đang chạy | 105 |
| Bảng trùng tên V1 | 105 |
| Bảng đang chạy ngoài V1 | 0 |
| Bảng V1 chưa có | 0 |

## 1. Đối chiếu từng bảng đang chạy

| Bảng | Cột hiện có | Cột V1 chưa có | Cột hiện có ngoài từ điển | RLS | Realtime |
|---|---|---|---|---|---|
| `access_role` | `code`, `role_name`, `created_at`, `updated_at` | — | — | Bật | Không |
| `admin_copilot_history` | `id`, `session_id`, `staff_id`, `role`, `content`, `metadata`, `created_at` | — | — | Bật | Không |
| `appointment` | `id`, `appointment_code`, `customer_id`, `pet_id`, `staff_id`, `check_in_time`, `check_out_time`, `note`, `change_count`, `appointment_status`, `created_at`, `updated_at`, `scheduled_start_at`, `scheduled_end_at` | — | — | Bật | Có |
| `appointment_adjustment` | `id`, `appointment_id`, `adjustment_type`, `duration_delta_minutes`, `amount_delta`, `reason`, `proposed_by`, `approved_by`, `approval_status`, `customer_consent_status`, `approved_at`, `created_at` | — | — | Bật | Có |
| `appointment_item` | `id`, `appointment_id`, `service_id`, `service_addon_id`, `is_primary`, `name_snapshot`, `quantity`, `unit_price`, `discount_amount`, `duration_minutes`, `weight_snapshot`, `staff_id`, `status`, `created_at`, `updated_at` | — | — | Bật | Có |
| `appointment_record` | `id`, `appointment_id`, `record_type`, `schema_version`, `revision_no`, `recorded_by`, `recorded_at`, `condition_note`, `safety_note_snapshot`, `allergy_note_snapshot`, `customer_confirmation_status`, `confirmed_at`, `note`, `created_at` | — | — | Bật | Có |
| `audit_log` | `id`, `staff_id`, `action`, `entity_name`, `entity_id`, `description`, `created_at` | — | — | Bật | Có |
| `banner` | `id`, `image_url`, `title`, `description`, `link`, `button_text`, `display_order`, `start_date`, `end_date`, `status`, `created_at`, `updated_at` | — | — | Bật | Có |
| `blog_category` | `id`, `category_name`, `description`, `display_order`, `status`, `created_at`, `updated_at` | — | — | Bật | Có |
| `blog_post` | `id`, `category_id`, `title`, `slug`, `summary`, `content`, `thumbnail_url`, `author_id`, `publish_at`, `status`, `view_count`, `created_at`, `updated_at` | — | — | Bật | Có |
| `care_action` | `id`, `action_name`, `is_active`, `created_at`, `updated_at` | — | — | Bật | Có |
| `care_log` | `id`, `appointment_id`, `care_action_id`, `description`, `observed_condition`, `recorded_at`, `created_at`, `updated_at`, `recorded_by`, `action_name_snapshot` | — | — | Bật | Có |
| `care_log_media` | `id`, `care_log_id`, `media_type`, `media_url`, `file_name`, `file_size`, `staff_id`, `uploaded_at`, `created_at` | — | — | Bật | Có |
| `cart` | `id`, `customer_id`, `cart_status`, `created_at`, `updated_at` | — | — | Bật | Có |
| `cart_item` | `id`, `cart_id`, `product_variant_id`, `quantity`, `unit_price`, `created_at`, `updated_at` | — | — | Bật | Có |
| `chat_conversation` | `id`, `customer_id`, `status`, `sentiment_level`, `sentiment_trend`, `is_urgent`, `assigned_staff_id`, `ai_summary`, `internal_note`, `sla_deadline`, `resolved_at`, `resolved_reason`, `resolved_by`, `violation_count`, `blocked_until`, `channel`, `created_at`, `updated_at`, `guest_session_id` | — | — | Bật | Có |
| `chat_feedback` | `id`, `conversation_id`, `score`, `comment`, `submitted_at` | — | — | Bật | Có |
| `chat_message` | `id`, `conversation_id`, `sender_type`, `content`, `raw_content`, `is_toxic`, `sentiment_score`, `metadata`, `created_at`, `sender_account_id`, `sender_guest_session_id` | — | — | Bật | Không |
| `chat_moderation_log` | `id`, `conversation_id`, `customer_id`, `detected_keywords`, `violation_count`, `action_taken`, `notes`, `created_at` | — | — | Bật | Không |
| `chatbot_canned_response` | `id`, `shortcut`, `title`, `content`, `category`, `usage_count`, `is_active`, `created_at` | — | — | Bật | Có |
| `chatbot_compensation_policy` | `id`, `issue_type`, `max_points`, `max_discount_vnd`, `approval_required`, `description`, `is_active` | — | — | Bật | Có |
| `chatbot_handover_rule` | `id`, `condition_name`, `trigger_type`, `threshold_value`, `auto_assign_role`, `sla_seconds`, `is_active` | — | — | Bật | Có |
| `chatbot_knowledge_faq` | `id`, `category`, `question`, `answer`, `keywords`, `priority`, `is_active`, `created_at`, `updated_at` | — | — | Bật | Có |
| `chatbot_profanity_filter` | `id`, `keyword`, `severity`, `action`, `replacement_text`, `is_active`, `created_at` | — | — | Bật | Có |
| `chatbot_scenario_matrix` | `id`, `scenario_name`, `sample_user_input`, `expected_sentiment`, `expected_tool_call`, `expected_handover`, `benchmark_status`, `created_at` | — | — | Bật | Có |
| `chatbot_sentiment_action` | `id`, `tier_level`, `bot_behavior`, `notify_admin`, `suggested_canned_id`, `instructions` | — | — | Bật | Có |
| `chatbot_sentiment_tier` | `level`, `name`, `color_badge`, `sla_seconds`, `description` | — | — | Bật | Có |
| `chatbot_sentiment_trigger` | `id`, `tier_level`, `trigger_pattern`, `weight`, `context_domain`, `is_active` | — | — | Bật | Có |
| `chatbot_system_prompt` | `id`, `prompt_key`, `channel`, `persona_name`, `tone_of_voice`, `content`, `is_active`, `created_at`, `updated_at` | — | — | Bật | Có |
| `customer` | `id`, `auth_user_id`, `customer_code`, `customer_status`, `registered_at`, `note`, `created_at`, `updated_at`, `contact_email` | — | — | Bật | Có |
| `customer_address` | `id`, `customer_id`, `receiver_name`, `receiver_phone`, `province`, `street_address`, `postal_code`, `is_default`, `created_at`, `updated_at` | — | — | Bật | Có |
| `customer_membership` | `customer_id`, `membership_tier_id`, `assigned_at`, `created_at`, `updated_at` | — | — | Bật | Có |
| `customer_phone` | `id`, `customer_id`, `phone_number`, `is_primary`, `verified_at`, `created_at`, `updated_at` | — | — | Bật | Có |
| `customer_profile` | `customer_id`, `full_name`, `date_of_birth`, `gender`, `created_at`, `updated_at` | — | — | Bật | Có |
| `customer_voucher` | `id`, `customer_id`, `voucher_id`, `acquired_method`, `voucher_status`, `acquired_at`, `expired_at` | — | — | Bật | Có |
| `delivery_option_config` | `id`, `name`, `description`, `fee`, `estimated_days`, `icon`, `available`, `created_at` | — | — | Bật | Có |
| `document_embeddings` | `id`, `content`, `metadata`, `embedding` | — | — | Bật | Không |
| `guest_session` | `id`, `token_hash`, `expires_at`, `revoked_at`, `created_at` | — | — | Bật | Không |
| `hotel_booking` | `id`, `booking_code`, `room_id`, `appointment_id`, `check_in_at`, `check_out_at`, `status`, `special_diet_notes`, `care_notes`, `daily_price`, `created_at`, `updated_at` | — | — | Bật | Có |
| `hotel_room` | `id`, `room_number`, `room_type_id`, `status`, `description`, `created_at`, `updated_at` | — | — | Bật | Có |
| `hotel_room_type` | `id`, `room_type`, `capacity`, `daily_price`, `description`, `amenities`, `status`, `created_at`, `updated_at` | — | — | Bật | Có |
| `inventory` | `id`, `product_variant_id`, `quantity_in_stock`, `minimum_stock`, `last_updated_at` | — | — | Bật | Có |
| `inventory_transaction` | `id`, `product_variant_id`, `transaction_type`, `quantity`, `note`, `staff_id`, `created_at`, `purchase_order_detail_id`, `sales_order_detail_id`, `return_request_detail_id`, `idempotency_key`, `recorded_at` | — | — | Bật | Có |
| `membership_tier` | `id`, `tier_name`, `minimum_expenditure`, `discount_percent`, `description`, `is_active`, `created_at`, `updated_at` | — | — | Bật | Có |
| `notification` | `id`, `customer_id`, `notification_type`, `title`, `content`, `sales_order_id`, `appointment_id`, `support_ticket_id`, `refund_transaction_id`, `sent_at`, `read_at` | — | — | Bật | Có |
| `paw_point_transaction` | `id`, `customer_id`, `payment_id`, `review_id`, `reward_rule_id`, `points`, `description`, `created_at`, `refund_transaction_id`, `voucher_redemption_id`, `customer_voucher_id`, `idempotency_key`, `sequence_no` | — | — | Bật | Có |
| `pawpal_setting` | `id`, `setting_key`, `setting_value`, `setting_type`, `description`, `created_at`, `updated_at` | — | — | Bật | Có |
| `payment` | `id`, `payment_code`, `customer_id`, `payment_method_config_id`, `payment_type`, `amount`, `transaction_status`, `succeeded_at`, `created_at`, `updated_at`, `gateway_transaction_id`, `idempotency_key`, `order_id`, `appointment_id`, `eligible_spend_amount` | — | — | Bật | Có |
| `payment_method_config` | `id`, `name`, `short_name`, `description`, `icon`, `fee`, `available`, `requires_info`, `redirect_url`, `bank_info`, `created_at` | — | — | Bật | Có |
| `permission` | `code`, `description` | — | — | Bật | Không |
| `pet_breed` | `id`, `species_id`, `breed_name`, `is_active`, `created_at`, `updated_at` | — | — | Bật | Có |
| `pet_profile` | `id`, `customer_id`, `pet_code`, `pet_name`, `avatar_url`, `gender`, `date_of_birth`, `color`, `routine`, `allergy`, `status`, `created_at`, `updated_at`, `breed_id`, `safety_note` | — | — | Bật | Có |
| `pet_species` | `id`, `species_name`, `is_active`, `created_at`, `updated_at` | — | — | Bật | Có |
| `pet_weight_history` | `id`, `pet_id`, `weight`, `measured_at`, `recorded_by`, `note`, `created_at` | — | — | Bật | Có |
| `product` | `id`, `category_id`, `product_name`, `unit`, `target_pet`, `description`, `slug`, `status`, `created_at`, `updated_at`, `origin`, `ingredients`, `benefits`, `usage_instructions`, `specs`, `badge`, `brand_name` | — | — | Bật | Có |
| `product_category` | `id`, `category_name`, `description`, `status`, `created_at`, `updated_at` | — | — | Bật | Có |
| `product_media` | `id`, `product_id`, `image_url`, `display_order`, `is_thumbnail`, `created_at`, `updated_at` | — | — | Bật | Có |
| `product_variant` | `id`, `product_id`, `color_id`, `size_id`, `flavor_id`, `sku_variant`, `cost_price`, `sale_price`, `compare_at_price`, `weight`, `barcode`, `status`, `created_at`, `updated_at` | — | — | Bật | Có |
| `product_variant_media` | `id`, `product_variant_id`, `image_url`, `display_order`, `is_thumbnail`, `created_at`, `updated_at` | — | — | Bật | Có |
| `promotion` | `id`, `promotion_name`, `description`, `discount_type`, `discount_value`, `start_date`, `end_date`, `minimum_order_value`, `status`, `created_at`, `updated_at` | — | — | Bật | Có |
| `promotion_product` | `id`, `promotion_id`, `product_variant_id` | — | — | Bật | Có |
| `promotion_service` | `id`, `promotion_id`, `service_id` | — | — | Bật | Có |
| `purchase_order` | `id`, `supplier_id`, `order_number`, `order_date`, `expected_date`, `order_status`, `note`, `created_at`, `updated_at` | — | — | Bật | Có |
| `purchase_order_detail` | `id`, `purchase_order_id`, `product_variant_id`, `quantity`, `unit_price` | — | — | Bật | Có |
| `refund_transaction` | `id`, `refund_code`, `ticket_id`, `payment_id`, `refund_type`, `requested_amount`, `approved_amount`, `refunded_amount`, `refund_method`, `refund_status`, `gateway_transaction_id`, `note`, `processed_by`, `processed_at`, `completed_at`, `created_at`, `updated_at`, `return_request_id`, `eligible_refund_amount` | — | — | Bật | Có |
| `return_request` | `id`, `sales_order_id`, `resolution_type`, `resolved_by`, `reason`, `return_type`, `description`, `request_status`, `created_at`, `updated_at` | — | — | Bật | Có |
| `return_request_detail` | `id`, `return_request_id`, `quantity`, `sales_order_detail_id` | — | — | Bật | Có |
| `return_request_evidence` | `id`, `return_request_id`, `image_url`, `display_order`, `created_at` | — | — | Bật | Có |
| `review` | `id`, `rating`, `review_content`, `review_status`, `created_at`, `updated_at`, `sales_order_detail_id`, `appointment_item_id` | — | — | Bật | Có |
| `review_media` | `id`, `review_id`, `image_url`, `display_order`, `created_at` | — | — | Bật | Có |
| `review_response` | `id`, `review_id`, `staff_id`, `response_content`, `created_at`, `updated_at` | — | — | Bật | Có |
| `reward_rule` | `id`, `rule_name`, `reward_type`, `trigger_event`, `reward_value`, `description`, `is_active`, `created_at`, `updated_at` | — | — | Bật | Có |
| `role_permission` | `role_code`, `permission_code` | — | — | Bật | Không |
| `sales_order` | `id`, `order_code`, `customer_id`, `order_status`, `note`, `created_at`, `updated_at`, `shipping_fee_snapshot`, `receiver_name_snapshot`, `receiver_phone_snapshot`, `province_snapshot`, `street_address_snapshot`, `postal_code_snapshot`, `delivery_option_id`, `shipping_provider_id`, `tracking_code`, `shipped_at`, `delivered_at`, `shipping_status` | — | — | Bật | Có |
| `sales_order_detail` | `id`, `order_id`, `product_variant_id`, `quantity`, `unit_price`, `discount_amount`, `product_name_snapshot`, `sku_snapshot` | — | — | Bật | Có |
| `service` | `id`, `service_code`, `service_name`, `description`, `estimated_duration`, `status`, `commission_rate`, `benefits`, `created_at`, `updated_at`, `category_id`, `staff_level_required_id`, `amenities` | — | — | Bật | Có |
| `service_addon` | `id`, `service_id`, `addon_name`, `description`, `price`, `estimated_duration`, `is_required`, `status`, `created_at`, `updated_at` | — | — | Bật | Có |
| `service_care_action` | `service_id`, `care_action_id`, `display_order`, `estimated_duration` | — | — | Bật | Có |
| `service_category` | `id`, `category_code`, `category_name`, `created_at`, `updated_at` | — | — | Bật | Có |
| `service_image` | `id`, `service_id`, `image_url`, `display_order`, `is_thumbnail`, `created_at`, `updated_at` | — | — | Bật | Có |
| `service_price_matrix` | `id`, `service_id`, `weight_from`, `weight_to`, `unit_price`, `effective_from`, `effective_to`, `status`, `created_at`, `updated_at` | — | — | Bật | Có |
| `service_supported_species` | `service_id`, `species_id` | — | — | Bật | Có |
| `shipping_provider` | `id`, `provider_name`, `provider_code`, `logo_url`, `contact_phone`, `tracking_url`, `status`, `created_at`, `updated_at` | — | — | Bật | Có |
| `staff` | `id`, `full_name`, `phone_number`, `job_title`, `specialization`, `hire_date`, `email`, `address`, `dob`, `service_locked`, `created_at`, `updated_at`, `auth_user_id`, `staff_level_id`, `employment_status`, `must_change_password` | — | — | Bật | Có |
| `staff_assessment` | `id`, `staff_id`, `assessment_date`, `assessment_type`, `score`, `result`, `note`, `assessed_by`, `created_at`, `updated_at` | — | — | Bật | Có |
| `staff_level` | `id`, `level_code`, `level_name`, `rank_order`, `is_active`, `created_at`, `updated_at` | — | — | Bật | Có |
| `staff_permission` | `staff_id`, `permission_code` | — | — | Bật | Không |
| `staff_role` | `staff_id`, `role_code` | — | — | Bật | Không |
| `staff_schedule` | `id`, `staff_id`, `availability_status`, `reason`, `schedule_status`, `created_at`, `updated_at`, `start_at`, `end_at` | — | — | Bật | Có |
| `staff_shift_request` | `id`, `request_type`, `staff_id`, `target_staff_id`, `replacement_staff_id`, `leave_type`, `start_date`, `end_date`, `shift`, `target_date`, `target_shift`, `reason`, `status`, `created_by`, `reviewed_by`, `reviewed_at`, `created_at` | — | — | Bật | Có |
| `stock_reservation` | `id`, `product_variant_id`, `cart_id`, `quantity`, `reserved_at`, `expires_at`, `status`, `created_at`, `updated_at`, `order_id` | — | — | Bật | Có |
| `supplier` | `id`, `supplier_name`, `contact_person`, `phone_number`, `email`, `address`, `status`, `created_at`, `updated_at` | — | — | Bật | Có |
| `support_ticket` | `id`, `ticket_code`, `customer_id`, `order_id`, `appointment_id`, `channel`, `category`, `subject`, `description`, `priority`, `type`, `status`, `requested_resolution`, `requested_amount`, `assigned_staff_id`, `first_response_at`, `investigation_note`, `resolution_type`, `resolution_note`, `approved_amount`, `resolved_by`, `resolved_at`, `closed_at`, `rating`, `rating_comment`, `created_at`, `updated_at`, `created_by_account_id` | — | — | Bật | Có |
| `support_ticket_message` | `id`, `ticket_id`, `sender_type`, `content`, `is_internal`, `created_at`, `sender_account_id`, `sender_guest_session_id` | — | — | Bật | Có |
| `support_ticket_message_attachment` | `id`, `message_id`, `file_url`, `file_name`, `file_size`, `media_type`, `display_order`, `created_at` | — | — | Bật | Có |
| `taxi_price_rule` | `id`, `distance_from`, `distance_to`, `weight_from`, `weight_to`, `base_price`, `surcharge`, `effective_from`, `effective_to`, `status`, `created_at`, `updated_at` | — | — | Bật | Có |
| `taxi_trip` | `id`, `appointment_id`, `driver_staff_id`, `pickup_address`, `dropoff_address`, `distance_km`, `trip_type`, `outbound_at`, `return_at`, `taxi_price_rule_id`, `quoted_amount`, `status`, `created_at`, `updated_at` | — | — | Bật | Có |
| `variant_color` | `id`, `color_name`, `hex_code`, `display_order`, `is_active`, `created_at`, `updated_at` | — | — | Bật | Có |
| `variant_flavor` | `id`, `flavor_name`, `display_order`, `is_active`, `created_at`, `updated_at` | — | — | Bật | Có |
| `variant_size` | `id`, `size_name`, `display_order`, `is_active`, `created_at`, `updated_at` | — | — | Bật | Có |
| `voucher` | `id`, `voucher_code`, `voucher_name`, `discount_value`, `minimum_order_amount`, `required_points`, `start_date`, `end_date`, `is_active`, `type`, `description`, `applicable_for`, `max_usage`, `created_at`, `updated_at` | — | — | Bật | Có |
| `voucher_redemption` | `id`, `customer_voucher_id`, `voucher_id`, `order_id`, `appointment_id`, `discount_amount_snapshot`, `status`, `redeemed_at`, `reversed_at`, `idempotency_key`, `created_at` | — | — | Bật | Có |
| `wishlist` | `id`, `customer_id`, `created_at`, `updated_at` | — | — | Bật | Có |
| `wishlist_product` | `wishlist_id`, `product_id`, `added_at` | — | — | Bật | Có |
| `wishlist_service` | `wishlist_id`, `service_id`, `added_at` | — | — | Bật | Có |

## 2. Danh mục đầy đủ các bảng V1 chưa có

| Bảng | Mô tả V1 |
|---|---|

## 3. Mã ứng dụng tham chiếu tên bảng hiện có

Tìm theo nguyên từ trong pages, components, assets, scripts/api, api và server.js (JS, CJS, TS, HTML). Bao gồm truy vấn, khai báo Realtime và chuỗi ánh xạ; không khẳng định mọi kết quả là lời gọi SQL. Không tính script kiểm thử hoặc migration. Cần rà soát luồng gọi trước khi sửa.

### access_role

Không tìm thấy tham chiếu nguyên từ trong phạm vi quét.

### admin_copilot_history

- [scripts/api/chat.js](../../../scripts/api/chat.js)

### appointment

- [scripts/api/chat.js](../../../scripts/api/chat.js)
- [scripts/api/api.js](../../../scripts/api/api.js)
- [pages/admin/admin-data-store.js](../../../pages/admin/admin-data-store.js)
- [scripts/api/customer_auth.js](../../../scripts/api/customer_auth.js)
- [pages/user/modules/diary/diary.js](../../../pages/user/modules/diary/diary.js)
- [pages/user/modules/bookings/bookings.js](../../../pages/user/modules/bookings/bookings.js)
- [pages/user/modules/bookings/booking-detail.js](../../../pages/user/modules/bookings/booking-detail.js)
- [pages/public/return-guest/return-guest.js](../../../pages/public/return-guest/return-guest.js)
- [pages/user/modules/settings/settings.js](../../../pages/user/modules/settings/settings.js)
- [pages/services/booking-success/booking-success.js](../../../pages/services/booking-success/booking-success.js)
- [pages/user/modules/support/support-create.js](../../../pages/user/modules/support/support-create.js)
- [pages/services/booking/booking.js](../../../pages/services/booking/booking.js)
- [pages/user/modules/profile/profile.js](../../../pages/user/modules/profile/profile.js)
- [pages/admin/modules/chatbot/chatbot.js](../../../pages/admin/modules/chatbot/chatbot.js)
- [pages/admin/modules/staff/subtabs/tab-staff-schedule.js](../../../pages/admin/modules/staff/subtabs/tab-staff-schedule.js)
- [pages/admin/modules/customers/customers.js](../../../pages/admin/modules/customers/customers.js)
- [pages/admin/modules/staff/subtabs/tab-staff-list.js](../../../pages/admin/modules/staff/subtabs/tab-staff-list.js)
- [pages/admin/modules/pets/pets.js](../../../pages/admin/modules/pets/pets.js)
- [pages/admin/modules/dashboard/dashboard.js](../../../pages/admin/modules/dashboard/dashboard.js)
- [pages/admin/modules/complaints/complaints.js](../../../pages/admin/modules/complaints/complaints.js)
- [pages/admin/modules/services/services.js](../../../pages/admin/modules/services/services.js)
- [pages/admin/modules/settings/settings.js](../../../pages/admin/modules/settings/settings.js)
- [pages/admin/modules/services/subtabs/tab-service-bookings.js](../../../pages/admin/modules/services/subtabs/tab-service-bookings.js)
- [pages/admin/modules/pets/subtabs/tab-pet-carelog.js](../../../pages/admin/modules/pets/subtabs/tab-pet-carelog.js)
- [pages/admin/modules/services/subtabs/tab-service-detail.js](../../../pages/admin/modules/services/subtabs/tab-service-detail.js)

### appointment_adjustment

Không tìm thấy tham chiếu nguyên từ trong phạm vi quét.

### appointment_item

Không tìm thấy tham chiếu nguyên từ trong phạm vi quét.

### appointment_record

Không tìm thấy tham chiếu nguyên từ trong phạm vi quét.

### audit_log

- [scripts/api/api.js](../../../scripts/api/api.js)
- [scripts/api/staff_auth.js](../../../scripts/api/staff_auth.js)
- [pages/admin/modules/staff/subtabs/tab-staff-schedule.js](../../../pages/admin/modules/staff/subtabs/tab-staff-schedule.js)
- [pages/admin/modules/staff/subtabs/tab-staff-assessment.js](../../../pages/admin/modules/staff/subtabs/tab-staff-assessment.js)
- [pages/admin/modules/settings/settings.js](../../../pages/admin/modules/settings/settings.js)
- [pages/admin/modules/settings/subtabs/tab-settings-audit.js](../../../pages/admin/modules/settings/subtabs/tab-settings-audit.js)
- [pages/admin/modules/orders/orders.js](../../../pages/admin/modules/orders/orders.js)
- [pages/admin/modules/customers/subtabs/tab-customer-profile.js](../../../pages/admin/modules/customers/subtabs/tab-customer-profile.js)

### banner

- [scripts/api/admin_settings.js](../../../scripts/api/admin_settings.js)
- [components/footer/footer.html](../../../components/footer/footer.html)
- [pages/public/return-guest/return-guest.js](../../../pages/public/return-guest/return-guest.js)
- [pages/public/return-guest/return-guest.html](../../../pages/public/return-guest/return-guest.html)
- [components/fab/fab.js](../../../components/fab/fab.js)
- [components/fab/fab.html](../../../components/fab/fab.html)
- [pages/public/about/about.html](../../../pages/public/about/about.html)
- [pages/public/landing/landing.js](../../../pages/public/landing/landing.js)
- [pages/public/landing/landing.html](../../../pages/public/landing/landing.html)
- [pages/public/blog/blog.html](../../../pages/public/blog/blog.html)
- [pages/user/modules/support/support.js](../../../pages/user/modules/support/support.js)
- [pages/services/booking/booking.html](../../../pages/services/booking/booking.html)
- [pages/shop/vnpay-sandbox/vnpay-sandbox.html](../../../pages/shop/vnpay-sandbox/vnpay-sandbox.html)
- [pages/user/modules/diary/diary.js](../../../pages/user/modules/diary/diary.js)
- [pages/user/modules/loyalty/loyalty.js](../../../pages/user/modules/loyalty/loyalty.js)
- [pages/admin/admin-data-store.js](../../../pages/admin/admin-data-store.js)
- [pages/user/modules/loyalty/loyalty.html](../../../pages/user/modules/loyalty/loyalty.html)
- [pages/user/modules/bookings/booking-detail.js](../../../pages/user/modules/bookings/booking-detail.js)
- [pages/user/modules/profile/profile.html](../../../pages/user/modules/profile/profile.html)
- [pages/user/modules/bookings/booking-detail.html](../../../pages/user/modules/bookings/booking-detail.html)
- [pages/user/modules/orders/order-detail.js](../../../pages/user/modules/orders/order-detail.js)
- [pages/user/modules/orders/order-detail.html](../../../pages/user/modules/orders/order-detail.html)
- [pages/admin/admin.js](../../../pages/admin/admin.js)
- [pages/user/modules/orders/review-handler.js](../../../pages/user/modules/orders/review-handler.js)
- [pages/admin/modules/dashboard/dashboard.html](../../../pages/admin/modules/dashboard/dashboard.html)
- [pages/admin/modules/customers/customers.html](../../../pages/admin/modules/customers/customers.html)
- [pages/admin/modules/orders/orders.html](../../../pages/admin/modules/orders/orders.html)
- [pages/admin/modules/staff/staff.html](../../../pages/admin/modules/staff/staff.html)
- [pages/admin/modules/pets/pets.html](../../../pages/admin/modules/pets/pets.html)
- [pages/admin/modules/settings/settings.html](../../../pages/admin/modules/settings/settings.html)
- [pages/admin/modules/customers/subtabs/tab-customer-profile.js](../../../pages/admin/modules/customers/subtabs/tab-customer-profile.js)
- [pages/admin/modules/services/services.html](../../../pages/admin/modules/services/services.html)
- [pages/admin/modules/settings/settings.js](../../../pages/admin/modules/settings/settings.js)
- [pages/admin/modules/orders/subtabs/tab-order-promos.js](../../../pages/admin/modules/orders/subtabs/tab-order-promos.js)
- [pages/admin/modules/services/subtabs/tab-service-bookings.js](../../../pages/admin/modules/services/subtabs/tab-service-bookings.js)
- [pages/admin/modules/services/subtabs/tab-service-reviews.js](../../../pages/admin/modules/services/subtabs/tab-service-reviews.js)
- [pages/admin/modules/settings/subtabs/tab-settings-banners.js](../../../pages/admin/modules/settings/subtabs/tab-settings-banners.js)

### blog_category

- [pages/public/blog-detail/blog-detail.js](../../../pages/public/blog-detail/blog-detail.js)
- [pages/admin/modules/settings/settings.js](../../../pages/admin/modules/settings/settings.js)

### blog_post

- [pages/admin/modules/settings/settings.js](../../../pages/admin/modules/settings/settings.js)
- [pages/admin/modules/settings/subtabs/tab-settings-content.js](../../../pages/admin/modules/settings/subtabs/tab-settings-content.js)
- [pages/public/blog-detail/blog-detail.js](../../../pages/public/blog-detail/blog-detail.js)

### care_action

- [scripts/api/api.js](../../../scripts/api/api.js)
- [pages/user/modules/diary/diary.js](../../../pages/user/modules/diary/diary.js)
- [pages/public/return-guest/return-guest.js](../../../pages/public/return-guest/return-guest.js)
- [pages/admin/modules/services/subtabs/tab-service-detail.js](../../../pages/admin/modules/services/subtabs/tab-service-detail.js)
- [pages/admin/modules/services/services.js](../../../pages/admin/modules/services/services.js)

### care_log

- [scripts/api/api.js](../../../scripts/api/api.js)
- [pages/public/return-guest/return-guest.js](../../../pages/public/return-guest/return-guest.js)
- [pages/user/modules/diary/diary.js](../../../pages/user/modules/diary/diary.js)
- [pages/admin/modules/pets/pets.js](../../../pages/admin/modules/pets/pets.js)
- [pages/admin/modules/services/services.js](../../../pages/admin/modules/services/services.js)
- [pages/admin/modules/services/subtabs/tab-service-detail.js](../../../pages/admin/modules/services/subtabs/tab-service-detail.js)

### care_log_media

- [scripts/api/api.js](../../../scripts/api/api.js)
- [pages/public/return-guest/return-guest.js](../../../pages/public/return-guest/return-guest.js)
- [pages/admin/modules/services/subtabs/tab-service-detail.js](../../../pages/admin/modules/services/subtabs/tab-service-detail.js)
- [pages/admin/modules/services/services.js](../../../pages/admin/modules/services/services.js)
- [pages/user/modules/diary/diary.js](../../../pages/user/modules/diary/diary.js)

### cart

- [server.js](../../../server.js)
- [scripts/api/api.js](../../../scripts/api/api.js)
- [pages/public/about/about.html](../../../pages/public/about/about.html)
- [components/header/header.html](../../../components/header/header.html)
- [components/header/header.js](../../../components/header/header.js)
- [pages/user/index.html](../../../pages/user/index.html)
- [pages/services/services.html](../../../pages/services/services.html)
- [pages/services/booking-success/booking-success.html](../../../pages/services/booking-success/booking-success.html)
- [pages/public/contact/contact.html](../../../pages/public/contact/contact.html)
- [pages/public/blog/blog.html](../../../pages/public/blog/blog.html)
- [pages/public/blog-detail/blog-detail.html](../../../pages/public/blog-detail/blog-detail.html)
- [pages/services/service-detail/service-detail.html](../../../pages/services/service-detail/service-detail.html)
- [pages/public/landing/landing.js](../../../pages/public/landing/landing.js)
- [pages/services/index.html](../../../pages/services/index.html)
- [pages/public/landing/landing.html](../../../pages/public/landing/landing.html)
- [pages/public/return-guest/return-guest.html](../../../pages/public/return-guest/return-guest.html)
- [pages/public/login/login.html](../../../pages/public/login/login.html)
- [pages/services/booking/booking.html](../../../pages/services/booking/booking.html)
- [pages/user/modules/wishlist/wishlist.js](../../../pages/user/modules/wishlist/wishlist.js)
- [pages/shop/cart/cart.js](../../../pages/shop/cart/cart.js)
- [pages/shop/checkout/checkout.js](../../../pages/shop/checkout/checkout.js)
- [pages/shop/cart/cart.html](../../../pages/shop/cart/cart.html)
- [pages/shop/checkout/checkout.html](../../../pages/shop/checkout/checkout.html)
- [pages/shop/index.html](../../../pages/shop/index.html)
- [pages/shop/shop.html](../../../pages/shop/shop.html)
- [pages/shop/payment-failed/payment-failed.html](../../../pages/shop/payment-failed/payment-failed.html)
- [pages/user/modules/orders/orders.js](../../../pages/user/modules/orders/orders.js)
- [pages/shop/payment-success/payment-success.html](../../../pages/shop/payment-success/payment-success.html)
- [pages/user/modules/orders/order-detail.js](../../../pages/user/modules/orders/order-detail.js)
- [pages/shop/shop.js](../../../pages/shop/shop.js)
- [pages/shop/product-detail/product-detail.js](../../../pages/shop/product-detail/product-detail.js)
- [pages/shop/product-detail/product-detail.html](../../../pages/shop/product-detail/product-detail.html)
- [pages/admin/modules/orders/orders.html](../../../pages/admin/modules/orders/orders.html)

### cart_item

- [scripts/api/api.js](../../../scripts/api/api.js)

### chat_conversation

- [components/fab/fab.js](../../../components/fab/fab.js)
- [scripts/api/chat_actions.js](../../../scripts/api/chat_actions.js)
- [scripts/api/chat.js](../../../scripts/api/chat.js)
- [pages/admin/modules/dashboard/dashboard.js](../../../pages/admin/modules/dashboard/dashboard.js)
- [pages/admin/modules/chatbot/chatbot.js](../../../pages/admin/modules/chatbot/chatbot.js)
- [pages/admin/modules/chatbot/subtabs/tab-chatbot-live.js](../../../pages/admin/modules/chatbot/subtabs/tab-chatbot-live.js)

### chat_feedback

Không tìm thấy tham chiếu nguyên từ trong phạm vi quét.

### chat_message

- [scripts/api/chat.js](../../../scripts/api/chat.js)
- [components/fab/fab.js](../../../components/fab/fab.js)
- [scripts/api/chat_actions.js](../../../scripts/api/chat_actions.js)
- [pages/admin/modules/chatbot/chatbot.js](../../../pages/admin/modules/chatbot/chatbot.js)
- [pages/admin/modules/chatbot/subtabs/tab-chatbot-live.js](../../../pages/admin/modules/chatbot/subtabs/tab-chatbot-live.js)

### chat_moderation_log

- [scripts/api/chat_actions.js](../../../scripts/api/chat_actions.js)
- [scripts/api/chat.js](../../../scripts/api/chat.js)

### chatbot_canned_response

- [pages/admin/modules/chatbot/chatbot.html](../../../pages/admin/modules/chatbot/chatbot.html)
- [pages/admin/modules/chatbot/subtabs/tab-chatbot-rules.js](../../../pages/admin/modules/chatbot/subtabs/tab-chatbot-rules.js)

### chatbot_compensation_policy

- [pages/admin/modules/chatbot/chatbot.html](../../../pages/admin/modules/chatbot/chatbot.html)
- [pages/admin/modules/chatbot/subtabs/tab-chatbot-rules.js](../../../pages/admin/modules/chatbot/subtabs/tab-chatbot-rules.js)

### chatbot_handover_rule

- [pages/admin/modules/chatbot/chatbot.html](../../../pages/admin/modules/chatbot/chatbot.html)
- [pages/admin/modules/chatbot/subtabs/tab-chatbot-rules.js](../../../pages/admin/modules/chatbot/subtabs/tab-chatbot-rules.js)

### chatbot_knowledge_faq

- [pages/admin/modules/chatbot/chatbot.html](../../../pages/admin/modules/chatbot/chatbot.html)
- [pages/admin/modules/chatbot/subtabs/tab-chatbot-rules.js](../../../pages/admin/modules/chatbot/subtabs/tab-chatbot-rules.js)
- [scripts/api/chat.js](../../../scripts/api/chat.js)

### chatbot_profanity_filter

- [scripts/api/chat.js](../../../scripts/api/chat.js)
- [scripts/api/chat_evaluations.js](../../../scripts/api/chat_evaluations.js)
- [scripts/api/chat_actions.js](../../../scripts/api/chat_actions.js)
- [pages/admin/modules/chatbot/chatbot.html](../../../pages/admin/modules/chatbot/chatbot.html)
- [pages/admin/modules/chatbot/subtabs/tab-chatbot-rules.js](../../../pages/admin/modules/chatbot/subtabs/tab-chatbot-rules.js)

### chatbot_scenario_matrix

- [scripts/api/chat_evaluations.js](../../../scripts/api/chat_evaluations.js)
- [pages/admin/modules/chatbot/chatbot.html](../../../pages/admin/modules/chatbot/chatbot.html)
- [pages/admin/modules/chatbot/subtabs/tab-chatbot-rules.js](../../../pages/admin/modules/chatbot/subtabs/tab-chatbot-rules.js)

### chatbot_sentiment_action

Không tìm thấy tham chiếu nguyên từ trong phạm vi quét.

### chatbot_sentiment_tier

- [scripts/api/chat.js](../../../scripts/api/chat.js)

### chatbot_sentiment_trigger

- [scripts/api/chat.js](../../../scripts/api/chat.js)
- [scripts/api/chat_evaluations.js](../../../scripts/api/chat_evaluations.js)

### chatbot_system_prompt

- [scripts/api/chat.js](../../../scripts/api/chat.js)

### customer

- [server.js](../../../server.js)
- [api/customer-auth.js](../../../api/customer-auth.js)
- [pages/user/user.js](../../../pages/user/user.js)
- [pages/admin/admin.js](../../../pages/admin/admin.js)
- [pages/admin/admin-data-store.js](../../../pages/admin/admin-data-store.js)
- [pages/public/return-guest/return-guest.js](../../../pages/public/return-guest/return-guest.js)
- [scripts/api/customer_auth.js](../../../scripts/api/customer_auth.js)
- [pages/user/modules/bookings/bookings.js](../../../pages/user/modules/bookings/bookings.js)
- [scripts/api/chat.js](../../../scripts/api/chat.js)
- [pages/user/index.html](../../../pages/user/index.html)
- [pages/shop/checkout/checkout.js](../../../pages/shop/checkout/checkout.js)
- [scripts/api/api.js](../../../scripts/api/api.js)
- [scripts/api/petService.js](../../../scripts/api/petService.js)
- [components/header/header.js](../../../components/header/header.js)
- [scripts/api/customer_profile_persistence.js](../../../scripts/api/customer_profile_persistence.js)
- [pages/public/login/login.js](../../../pages/public/login/login.js)
- [pages/services/booking-success/booking-success.js](../../../pages/services/booking-success/booking-success.js)
- [pages/user/modules/support/support.html](../../../pages/user/modules/support/support.html)
- [pages/services/booking/booking.js](../../../pages/services/booking/booking.js)
- [pages/public/login/login.html](../../../pages/public/login/login.html)
- [components/fab/fab.js](../../../components/fab/fab.js)
- [pages/admin/modules/complaints/complaints.html](../../../pages/admin/modules/complaints/complaints.html)
- [pages/admin/modules/complaints/complaints.js](../../../pages/admin/modules/complaints/complaints.js)
- [pages/user/modules/loyalty/loyalty.js](../../../pages/user/modules/loyalty/loyalty.js)
- [pages/admin/modules/chatbot/chatbot.html](../../../pages/admin/modules/chatbot/chatbot.html)
- [pages/admin/modules/customers/customers.html](../../../pages/admin/modules/customers/customers.html)
- [pages/admin/modules/chatbot/chatbot.js](../../../pages/admin/modules/chatbot/chatbot.js)
- [pages/admin/modules/complaints/subtabs/tab-complaint-detail.js](../../../pages/admin/modules/complaints/subtabs/tab-complaint-detail.js)
- [pages/user/modules/orders/orders.js](../../../pages/user/modules/orders/orders.js)
- [pages/user/modules/diary/diary.js](../../../pages/user/modules/diary/diary.js)
- [pages/admin/modules/customers/customers.js](../../../pages/admin/modules/customers/customers.js)
- [pages/admin/modules/chatbot/subtabs/tab-chatbot-copilot.js](../../../pages/admin/modules/chatbot/subtabs/tab-chatbot-copilot.js)
- [pages/user/modules/settings/settings.js](../../../pages/user/modules/settings/settings.js)
- [pages/admin/modules/chatbot/subtabs/tab-chatbot-live.js](../../../pages/admin/modules/chatbot/subtabs/tab-chatbot-live.js)
- [pages/admin/modules/staff/staff.html](../../../pages/admin/modules/staff/staff.html)
- [pages/user/modules/profile/profile.js](../../../pages/user/modules/profile/profile.js)
- [pages/admin/modules/orders/orders.html](../../../pages/admin/modules/orders/orders.html)
- [pages/admin/modules/services/services.html](../../../pages/admin/modules/services/services.html)
- [pages/admin/modules/orders/orders.js](../../../pages/admin/modules/orders/orders.js)
- [pages/admin/modules/services/services.js](../../../pages/admin/modules/services/services.js)
- [pages/admin/modules/pets/pets.html](../../../pages/admin/modules/pets/pets.html)
- [pages/admin/modules/dashboard/dashboard.js](../../../pages/admin/modules/dashboard/dashboard.js)
- [pages/admin/modules/pets/pets.js](../../../pages/admin/modules/pets/pets.js)
- [pages/admin/modules/settings/settings.js](../../../pages/admin/modules/settings/settings.js)
- [pages/admin/modules/orders/subtabs/tab-order-list.js](../../../pages/admin/modules/orders/subtabs/tab-order-list.js)
- [pages/admin/modules/services/subtabs/tab-service-bookings.js](../../../pages/admin/modules/services/subtabs/tab-service-bookings.js)
- [pages/admin/modules/services/subtabs/tab-service-detail.js](../../../pages/admin/modules/services/subtabs/tab-service-detail.js)
- [pages/admin/modules/orders/subtabs/tab-order-products.js](../../../pages/admin/modules/orders/subtabs/tab-order-products.js)
- [pages/admin/modules/pets/subtabs/tab-pet-list.js](../../../pages/admin/modules/pets/subtabs/tab-pet-list.js)
- [pages/admin/modules/customers/subtabs/tab-customer-list.js](../../../pages/admin/modules/customers/subtabs/tab-customer-list.js)
- [pages/admin/modules/pets/subtabs/tab-pet-reminders.js](../../../pages/admin/modules/pets/subtabs/tab-pet-reminders.js)
- [pages/admin/modules/customers/subtabs/tab-customer-pawpoint.js](../../../pages/admin/modules/customers/subtabs/tab-customer-pawpoint.js)
- [pages/admin/modules/customers/subtabs/tab-customer-profile.js](../../../pages/admin/modules/customers/subtabs/tab-customer-profile.js)

### customer_address

- [pages/public/return-guest/return-guest.js](../../../pages/public/return-guest/return-guest.js)
- [pages/shop/payment-success/payment-success.js](../../../pages/shop/payment-success/payment-success.js)
- [scripts/api/api.js](../../../scripts/api/api.js)
- [scripts/api/customer_profile_persistence.js](../../../scripts/api/customer_profile_persistence.js)
- [scripts/api/customer_auth.js](../../../scripts/api/customer_auth.js)
- [pages/user/modules/profile/profile.js](../../../pages/user/modules/profile/profile.js)
- [pages/admin/modules/customers/customers.js](../../../pages/admin/modules/customers/customers.js)
- [pages/admin/modules/orders/orders.js](../../../pages/admin/modules/orders/orders.js)
- [pages/admin/modules/customers/subtabs/tab-customer-list.js](../../../pages/admin/modules/customers/subtabs/tab-customer-list.js)
- [pages/admin/modules/customers/subtabs/tab-customer-profile.js](../../../pages/admin/modules/customers/subtabs/tab-customer-profile.js)
- [pages/admin/modules/orders/subtabs/tab-order-list.js](../../../pages/admin/modules/orders/subtabs/tab-order-list.js)
- [pages/admin/modules/pets/subtabs/tab-pet-list.js](../../../pages/admin/modules/pets/subtabs/tab-pet-list.js)

### customer_membership

- [scripts/api/chat_actions.js](../../../scripts/api/chat_actions.js)
- [scripts/api/chat.js](../../../scripts/api/chat.js)
- [scripts/api/customer_auth.js](../../../scripts/api/customer_auth.js)
- [scripts/api/customer_loyalty.js](../../../scripts/api/customer_loyalty.js)
- [pages/user/modules/loyalty/loyalty.js](../../../pages/user/modules/loyalty/loyalty.js)
- [pages/user/modules/profile/profile.js](../../../pages/user/modules/profile/profile.js)
- [pages/admin/modules/chatbot/chatbot.js](../../../pages/admin/modules/chatbot/chatbot.js)
- [pages/admin/modules/customers/customers.js](../../../pages/admin/modules/customers/customers.js)
- [pages/admin/modules/customers/subtabs/tab-customer-profile.js](../../../pages/admin/modules/customers/subtabs/tab-customer-profile.js)
- [pages/admin/modules/customers/subtabs/tab-customer-pawpoint.js](../../../pages/admin/modules/customers/subtabs/tab-customer-pawpoint.js)
- [pages/admin/modules/customers/subtabs/tab-customer-list.js](../../../pages/admin/modules/customers/subtabs/tab-customer-list.js)
- [pages/admin/modules/pets/subtabs/tab-pet-list.js](../../../pages/admin/modules/pets/subtabs/tab-pet-list.js)
- [pages/admin/modules/orders/subtabs/tab-order-list.js](../../../pages/admin/modules/orders/subtabs/tab-order-list.js)
- [pages/admin/modules/complaints/subtabs/tab-complaint-detail.js](../../../pages/admin/modules/complaints/subtabs/tab-complaint-detail.js)

### customer_phone

Không tìm thấy tham chiếu nguyên từ trong phạm vi quét.

### customer_profile

- [scripts/api/api.js](../../../scripts/api/api.js)
- [scripts/api/chat.js](../../../scripts/api/chat.js)
- [scripts/api/customer_auth.js](../../../scripts/api/customer_auth.js)
- [pages/services/booking/booking.js](../../../pages/services/booking/booking.js)
- [scripts/api/customer_profile_persistence.js](../../../scripts/api/customer_profile_persistence.js)
- [components/header/header.js](../../../components/header/header.js)
- [pages/public/return-guest/return-guest.js](../../../pages/public/return-guest/return-guest.js)
- [pages/admin/modules/customers/customers.js](../../../pages/admin/modules/customers/customers.js)
- [pages/admin/modules/customers/subtabs/tab-customer-list.js](../../../pages/admin/modules/customers/subtabs/tab-customer-list.js)
- [pages/admin/modules/customers/subtabs/tab-customer-profile.js](../../../pages/admin/modules/customers/subtabs/tab-customer-profile.js)
- [pages/admin/modules/chatbot/chatbot.js](../../../pages/admin/modules/chatbot/chatbot.js)
- [pages/admin/modules/complaints/complaints.js](../../../pages/admin/modules/complaints/complaints.js)
- [pages/admin/modules/services/subtabs/tab-service-bookings.js](../../../pages/admin/modules/services/subtabs/tab-service-bookings.js)
- [pages/user/modules/loyalty/loyalty.js](../../../pages/user/modules/loyalty/loyalty.js)
- [pages/admin/modules/services/services.js](../../../pages/admin/modules/services/services.js)
- [pages/user/modules/profile/profile.js](../../../pages/user/modules/profile/profile.js)
- [pages/admin/modules/orders/orders.js](../../../pages/admin/modules/orders/orders.js)
- [pages/admin/modules/dashboard/dashboard.js](../../../pages/admin/modules/dashboard/dashboard.js)
- [pages/admin/modules/pets/pets.js](../../../pages/admin/modules/pets/pets.js)
- [pages/admin/modules/orders/subtabs/tab-order-list.js](../../../pages/admin/modules/orders/subtabs/tab-order-list.js)
- [pages/admin/modules/pets/subtabs/tab-pet-list.js](../../../pages/admin/modules/pets/subtabs/tab-pet-list.js)

### customer_voucher

- [scripts/api/customer_loyalty.js](../../../scripts/api/customer_loyalty.js)
- [scripts/api/api.js](../../../scripts/api/api.js)

### delivery_option_config

- [scripts/api/api.js](../../../scripts/api/api.js)

### document_embeddings

- [pages/admin/modules/chatbot/subtabs/tab-chatbot-copilot.js](../../../pages/admin/modules/chatbot/subtabs/tab-chatbot-copilot.js)

### guest_session

Không tìm thấy tham chiếu nguyên từ trong phạm vi quét.

### hotel_booking

Không tìm thấy tham chiếu nguyên từ trong phạm vi quét.

### hotel_room

- [scripts/api/api.js](../../../scripts/api/api.js)

### hotel_room_type

- [scripts/api/api.js](../../../scripts/api/api.js)

### inventory

- [scripts/api/api.js](../../../scripts/api/api.js)
- [pages/admin/admin.js](../../../pages/admin/admin.js)
- [scripts/api/chat.js](../../../scripts/api/chat.js)
- [pages/admin/modules/chatbot/subtabs/tab-chatbot-copilot.js](../../../pages/admin/modules/chatbot/subtabs/tab-chatbot-copilot.js)
- [pages/admin/modules/dashboard/dashboard.js](../../../pages/admin/modules/dashboard/dashboard.js)
- [pages/admin/modules/orders/orders.js](../../../pages/admin/modules/orders/orders.js)
- [pages/admin/modules/orders/subtabs/tab-order-products.js](../../../pages/admin/modules/orders/subtabs/tab-order-products.js)
- [pages/admin/modules/orders/subtabs/tab-order-detail.js](../../../pages/admin/modules/orders/subtabs/tab-order-detail.js)
- [pages/admin/modules/orders/subtabs/tab-order-list.js](../../../pages/admin/modules/orders/subtabs/tab-order-list.js)

### inventory_transaction

- [scripts/api/api.js](../../../scripts/api/api.js)
- [pages/admin/modules/orders/orders.js](../../../pages/admin/modules/orders/orders.js)

### membership_tier

- [scripts/api/chat.js](../../../scripts/api/chat.js)
- [scripts/api/customer_auth.js](../../../scripts/api/customer_auth.js)
- [pages/user/modules/loyalty/loyalty.js](../../../pages/user/modules/loyalty/loyalty.js)
- [pages/user/modules/profile/profile.js](../../../pages/user/modules/profile/profile.js)
- [pages/admin/modules/services/subtabs/tab-service-bookings.js](../../../pages/admin/modules/services/subtabs/tab-service-bookings.js)
- [pages/admin/modules/orders/subtabs/tab-order-list.js](../../../pages/admin/modules/orders/subtabs/tab-order-list.js)

### notification

- [scripts/api/api.js](../../../scripts/api/api.js)
- [pages/user/index.html](../../../pages/user/index.html)
- [pages/services/booking/booking.html](../../../pages/services/booking/booking.html)
- [pages/services/index.html](../../../pages/services/index.html)
- [pages/services/services.html](../../../pages/services/services.html)
- [components/header/header.js](../../../components/header/header.js)
- [components/header/header.html](../../../components/header/header.html)
- [pages/public/return-guest/return-guest.html](../../../pages/public/return-guest/return-guest.html)
- [pages/services/booking-success/booking-success.html](../../../pages/services/booking-success/booking-success.html)
- [pages/services/service-detail/service-detail.html](../../../pages/services/service-detail/service-detail.html)
- [pages/public/about/about.html](../../../pages/public/about/about.html)
- [pages/user/modules/bookings/booking-detail.js](../../../pages/user/modules/bookings/booking-detail.js)
- [pages/public/blog/blog.html](../../../pages/public/blog/blog.html)
- [pages/user/modules/wishlist/wishlist.js](../../../pages/user/modules/wishlist/wishlist.js)
- [pages/public/login/login.html](../../../pages/public/login/login.html)
- [pages/shop/cart/cart.html](../../../pages/shop/cart/cart.html)
- [pages/public/contact/contact.html](../../../pages/public/contact/contact.html)
- [pages/public/landing/landing.html](../../../pages/public/landing/landing.html)
- [pages/public/blog-detail/blog-detail.html](../../../pages/public/blog-detail/blog-detail.html)
- [pages/user/modules/orders/orders.js](../../../pages/user/modules/orders/orders.js)
- [pages/user/modules/orders/order-detail.js](../../../pages/user/modules/orders/order-detail.js)
- [pages/shop/index.html](../../../pages/shop/index.html)
- [pages/shop/checkout/checkout.js](../../../pages/shop/checkout/checkout.js)
- [pages/admin/modules/customers/subtabs/tab-customer-profile.js](../../../pages/admin/modules/customers/subtabs/tab-customer-profile.js)
- [pages/shop/checkout/checkout.html](../../../pages/shop/checkout/checkout.html)
- [pages/user/modules/settings/settings.html](../../../pages/user/modules/settings/settings.html)
- [pages/admin/modules/complaints/subtabs/tab-complaint-detail.js](../../../pages/admin/modules/complaints/subtabs/tab-complaint-detail.js)
- [pages/shop/payment-failed/payment-failed.html](../../../pages/shop/payment-failed/payment-failed.html)
- [pages/admin/modules/settings/settings.js](../../../pages/admin/modules/settings/settings.js)
- [pages/admin/modules/settings/subtabs/tab-settings-banners.js](../../../pages/admin/modules/settings/subtabs/tab-settings-banners.js)
- [pages/shop/payment-success/payment-success.html](../../../pages/shop/payment-success/payment-success.html)
- [pages/shop/product-detail/product-detail.html](../../../pages/shop/product-detail/product-detail.html)
- [pages/shop/payment-success/payment-success.js](../../../pages/shop/payment-success/payment-success.js)
- [pages/shop/shop.js](../../../pages/shop/shop.js)
- [pages/shop/product-detail/product-detail.js](../../../pages/shop/product-detail/product-detail.js)
- [pages/admin/modules/orders/subtabs/tab-order-list.js](../../../pages/admin/modules/orders/subtabs/tab-order-list.js)
- [pages/shop/shop.html](../../../pages/shop/shop.html)
- [pages/admin/modules/services/subtabs/tab-service-bookings.js](../../../pages/admin/modules/services/subtabs/tab-service-bookings.js)
- [pages/admin/modules/services/subtabs/tab-service-detail.js](../../../pages/admin/modules/services/subtabs/tab-service-detail.js)

### paw_point_transaction

- [scripts/api/customer_loyalty.js](../../../scripts/api/customer_loyalty.js)
- [scripts/api/chat_actions.js](../../../scripts/api/chat_actions.js)
- [scripts/api/chat.js](../../../scripts/api/chat.js)
- [pages/admin/modules/customers/customers.js](../../../pages/admin/modules/customers/customers.js)
- [pages/admin/modules/complaints/subtabs/tab-complaint-detail.js](../../../pages/admin/modules/complaints/subtabs/tab-complaint-detail.js)
- [pages/admin/modules/customers/subtabs/tab-customer-pawpoint.js](../../../pages/admin/modules/customers/subtabs/tab-customer-pawpoint.js)
- [pages/admin/modules/orders/subtabs/tab-order-list.js](../../../pages/admin/modules/orders/subtabs/tab-order-list.js)

### pawpal_setting

- [scripts/api/api.js](../../../scripts/api/api.js)
- [pages/admin/modules/settings/settings.js](../../../pages/admin/modules/settings/settings.js)

### payment

- [server.js](../../../server.js)
- [scripts/api/api.js](../../../scripts/api/api.js)
- [scripts/api/chat.js](../../../scripts/api/chat.js)
- [scripts/api/chat_actions.js](../../../scripts/api/chat_actions.js)
- [pages/shop/payment-failed/payment-failed.js](../../../pages/shop/payment-failed/payment-failed.js)
- [scripts/api/vnpay.js](../../../scripts/api/vnpay.js)
- [pages/shop/payment-failed/payment-failed.html](../../../pages/shop/payment-failed/payment-failed.html)
- [pages/shop/vnpay-sandbox/vnpay-sandbox.js](../../../pages/shop/vnpay-sandbox/vnpay-sandbox.js)
- [pages/shop/vnpay-sandbox/vnpay-sandbox.html](../../../pages/shop/vnpay-sandbox/vnpay-sandbox.html)
- [components/footer/footer.html](../../../components/footer/footer.html)
- [pages/shop/checkout/checkout.js](../../../pages/shop/checkout/checkout.js)
- [pages/shop/checkout/checkout.html](../../../pages/shop/checkout/checkout.html)
- [pages/public/return-guest/return-guest.js](../../../pages/public/return-guest/return-guest.js)
- [pages/shop/payment-success/payment-success.js](../../../pages/shop/payment-success/payment-success.js)
- [pages/shop/payment-success/payment-success.html](../../../pages/shop/payment-success/payment-success.html)
- [pages/user/modules/support/support-create.html](../../../pages/user/modules/support/support-create.html)
- [pages/user/modules/support/support-create.js](../../../pages/user/modules/support/support-create.js)
- [pages/admin/modules/complaints/complaints.js](../../../pages/admin/modules/complaints/complaints.js)
- [pages/admin/modules/complaints/subtabs/tab-complaint-orders.js](../../../pages/admin/modules/complaints/subtabs/tab-complaint-orders.js)
- [pages/admin/modules/settings/settings.js](../../../pages/admin/modules/settings/settings.js)
- [pages/admin/modules/settings/subtabs/tab-settings-system.js](../../../pages/admin/modules/settings/subtabs/tab-settings-system.js)
- [pages/user/modules/orders/order-detail.js](../../../pages/user/modules/orders/order-detail.js)
- [pages/admin/modules/customers/customers.js](../../../pages/admin/modules/customers/customers.js)
- [pages/admin/modules/customers/subtabs/tab-customer-profile.js](../../../pages/admin/modules/customers/subtabs/tab-customer-profile.js)
- [pages/user/modules/orders/orders.js](../../../pages/user/modules/orders/orders.js)
- [pages/user/modules/orders/order-detail.html](../../../pages/user/modules/orders/order-detail.html)
- [pages/admin/modules/orders/orders.js](../../../pages/admin/modules/orders/orders.js)
- [pages/admin/modules/dashboard/dashboard.js](../../../pages/admin/modules/dashboard/dashboard.js)

### payment_method_config

- [scripts/api/api.js](../../../scripts/api/api.js)

### permission

- [pages/admin/modules/staff/staff.html](../../../pages/admin/modules/staff/staff.html)
- [pages/admin/modules/staff/subtabs/tab-staff-schedule.js](../../../pages/admin/modules/staff/subtabs/tab-staff-schedule.js)
- [pages/admin/modules/pets/subtabs/tab-pet-list.js](../../../pages/admin/modules/pets/subtabs/tab-pet-list.js)

### pet_breed

Không tìm thấy tham chiếu nguyên từ trong phạm vi quét.

### pet_profile

- [scripts/api/api.js](../../../scripts/api/api.js)
- [scripts/api/chat.js](../../../scripts/api/chat.js)
- [scripts/api/customer_auth.js](../../../scripts/api/customer_auth.js)
- [scripts/api/petService.js](../../../scripts/api/petService.js)
- [pages/user/modules/bookings/bookings.js](../../../pages/user/modules/bookings/bookings.js)
- [pages/public/return-guest/return-guest.js](../../../pages/public/return-guest/return-guest.js)
- [pages/services/booking/booking.js](../../../pages/services/booking/booking.js)
- [pages/user/modules/profile/profile.js](../../../pages/user/modules/profile/profile.js)
- [pages/user/modules/settings/settings.js](../../../pages/user/modules/settings/settings.js)
- [pages/admin/modules/chatbot/chatbot.js](../../../pages/admin/modules/chatbot/chatbot.js)
- [pages/admin/modules/customers/customers.js](../../../pages/admin/modules/customers/customers.js)
- [pages/admin/modules/complaints/complaints.js](../../../pages/admin/modules/complaints/complaints.js)
- [pages/admin/modules/customers/subtabs/tab-customer-list.js](../../../pages/admin/modules/customers/subtabs/tab-customer-list.js)
- [pages/admin/modules/dashboard/dashboard.js](../../../pages/admin/modules/dashboard/dashboard.js)
- [pages/admin/modules/staff/subtabs/tab-staff-schedule.js](../../../pages/admin/modules/staff/subtabs/tab-staff-schedule.js)
- [pages/admin/modules/pets/pets.js](../../../pages/admin/modules/pets/pets.js)
- [pages/admin/modules/customers/subtabs/tab-customer-profile.js](../../../pages/admin/modules/customers/subtabs/tab-customer-profile.js)
- [pages/admin/modules/services/services.js](../../../pages/admin/modules/services/services.js)
- [pages/admin/modules/pets/subtabs/tab-pet-profile.js](../../../pages/admin/modules/pets/subtabs/tab-pet-profile.js)
- [pages/admin/modules/services/subtabs/tab-service-bookings.js](../../../pages/admin/modules/services/subtabs/tab-service-bookings.js)
- [pages/admin/modules/settings/settings.js](../../../pages/admin/modules/settings/settings.js)
- [pages/admin/modules/pets/subtabs/tab-pet-list.js](../../../pages/admin/modules/pets/subtabs/tab-pet-list.js)
- [pages/admin/modules/orders/subtabs/tab-order-list.js](../../../pages/admin/modules/orders/subtabs/tab-order-list.js)

### pet_species

- [scripts/api/api.js](../../../scripts/api/api.js)
- [pages/user/modules/bookings/booking-detail.js](../../../pages/user/modules/bookings/booking-detail.js)

### pet_weight_history

- [pages/admin/modules/pets/pets.js](../../../pages/admin/modules/pets/pets.js)
- [pages/admin/modules/pets/subtabs/tab-pet-list.js](../../../pages/admin/modules/pets/subtabs/tab-pet-list.js)
- [pages/admin/modules/pets/subtabs/tab-pet-profile.js](../../../pages/admin/modules/pets/subtabs/tab-pet-profile.js)

### product

- [server.js](../../../server.js)
- [components/fab/fab.js](../../../components/fab/fab.js)
- [components/ui/landing-buy-now.js](../../../components/ui/landing-buy-now.js)
- [pages/user/user.js](../../../pages/user/user.js)
- [scripts/api/chat.js](../../../scripts/api/chat.js)
- [pages/public/about/about.html](../../../pages/public/about/about.html)
- [scripts/api/api.js](../../../scripts/api/api.js)
- [pages/public/return-guest/return-guest.js](../../../pages/public/return-guest/return-guest.js)
- [scripts/api/customer_auth.js](../../../scripts/api/customer_auth.js)
- [pages/public/landing/landing.js](../../../pages/public/landing/landing.js)
- [pages/public/landing/landing.html](../../../pages/public/landing/landing.html)
- [pages/user/modules/wishlist/wishlist.js](../../../pages/user/modules/wishlist/wishlist.js)
- [pages/user/modules/wishlist/wishlist.html](../../../pages/user/modules/wishlist/wishlist.html)
- [pages/shop/cart/cart.js](../../../pages/shop/cart/cart.js)
- [pages/shop/cart/cart.html](../../../pages/shop/cart/cart.html)
- [pages/shop/index.html](../../../pages/shop/index.html)
- [pages/shop/checkout/checkout.js](../../../pages/shop/checkout/checkout.js)
- [pages/shop/payment-success/payment-success.js](../../../pages/shop/payment-success/payment-success.js)
- [pages/shop/product-detail/product-detail.html](../../../pages/shop/product-detail/product-detail.html)
- [pages/shop/shop.html](../../../pages/shop/shop.html)
- [pages/shop/shop.js](../../../pages/shop/shop.js)
- [pages/shop/product-detail/product-detail.js](../../../pages/shop/product-detail/product-detail.js)
- [pages/user/modules/orders/order-detail.js](../../../pages/user/modules/orders/order-detail.js)
- [pages/admin/modules/dashboard/dashboard.js](../../../pages/admin/modules/dashboard/dashboard.js)
- [pages/user/modules/orders/orders.js](../../../pages/user/modules/orders/orders.js)
- [pages/admin/modules/settings/settings.js](../../../pages/admin/modules/settings/settings.js)
- [pages/user/modules/orders/return-detail.js](../../../pages/user/modules/orders/return-detail.js)
- [pages/user/modules/orders/review-handler.js](../../../pages/user/modules/orders/review-handler.js)
- [pages/user/modules/orders/return-handler.js](../../../pages/user/modules/orders/return-handler.js)
- [pages/admin/modules/complaints/subtabs/tab-complaint-detail.js](../../../pages/admin/modules/complaints/subtabs/tab-complaint-detail.js)
- [pages/admin/modules/orders/orders.html](../../../pages/admin/modules/orders/orders.html)
- [pages/admin/modules/complaints/complaints.js](../../../pages/admin/modules/complaints/complaints.js)
- [pages/admin/modules/orders/orders.js](../../../pages/admin/modules/orders/orders.js)
- [pages/admin/modules/orders/subtabs/tab-order-products.js](../../../pages/admin/modules/orders/subtabs/tab-order-products.js)

### product_category

- [pages/admin/modules/orders/orders.js](../../../pages/admin/modules/orders/orders.js)
- [pages/admin/modules/orders/subtabs/tab-order-products.js](../../../pages/admin/modules/orders/subtabs/tab-order-products.js)

### product_media

Không tìm thấy tham chiếu nguyên từ trong phạm vi quét.

### product_variant

- [scripts/api/chat.js](../../../scripts/api/chat.js)
- [pages/public/return-guest/return-guest.js](../../../pages/public/return-guest/return-guest.js)
- [scripts/api/api.js](../../../scripts/api/api.js)
- [scripts/api/customer_auth.js](../../../scripts/api/customer_auth.js)
- [pages/admin/modules/orders/subtabs/tab-order-products.js](../../../pages/admin/modules/orders/subtabs/tab-order-products.js)
- [pages/admin/modules/orders/orders.js](../../../pages/admin/modules/orders/orders.js)
- [pages/user/modules/orders/return-detail.js](../../../pages/user/modules/orders/return-detail.js)
- [pages/admin/modules/settings/settings.js](../../../pages/admin/modules/settings/settings.js)
- [pages/admin/modules/dashboard/dashboard.js](../../../pages/admin/modules/dashboard/dashboard.js)
- [pages/admin/modules/complaints/complaints.js](../../../pages/admin/modules/complaints/complaints.js)
- [pages/shop/payment-success/payment-success.js](../../../pages/shop/payment-success/payment-success.js)

### product_variant_media

Không tìm thấy tham chiếu nguyên từ trong phạm vi quét.

### promotion

Không tìm thấy tham chiếu nguyên từ trong phạm vi quét.

### promotion_product

Không tìm thấy tham chiếu nguyên từ trong phạm vi quét.

### promotion_service

Không tìm thấy tham chiếu nguyên từ trong phạm vi quét.

### purchase_order

Không tìm thấy tham chiếu nguyên từ trong phạm vi quét.

### purchase_order_detail

Không tìm thấy tham chiếu nguyên từ trong phạm vi quét.

### refund_transaction

Không tìm thấy tham chiếu nguyên từ trong phạm vi quét.

### return_request

- [scripts/api/api.js](../../../scripts/api/api.js)
- [pages/admin/modules/orders/orders.js](../../../pages/admin/modules/orders/orders.js)
- [pages/admin/modules/orders/subtabs/tab-order-detail.js](../../../pages/admin/modules/orders/subtabs/tab-order-detail.js)
- [pages/user/modules/orders/return-handler.js](../../../pages/user/modules/orders/return-handler.js)
- [pages/user/modules/orders/return-detail.js](../../../pages/user/modules/orders/return-detail.js)
- [pages/user/modules/orders/orders.js](../../../pages/user/modules/orders/orders.js)
- [pages/admin/modules/complaints/complaints.html](../../../pages/admin/modules/complaints/complaints.html)
- [pages/admin/modules/complaints/complaints.js](../../../pages/admin/modules/complaints/complaints.js)
- [pages/admin/modules/complaints/subtabs/tab-complaint-orders.js](../../../pages/admin/modules/complaints/subtabs/tab-complaint-orders.js)

### return_request_detail

- [scripts/api/api.js](../../../scripts/api/api.js)
- [pages/user/modules/orders/return-handler.js](../../../pages/user/modules/orders/return-handler.js)
- [pages/user/modules/orders/return-detail.js](../../../pages/user/modules/orders/return-detail.js)
- [pages/admin/modules/orders/orders.js](../../../pages/admin/modules/orders/orders.js)
- [pages/admin/modules/orders/subtabs/tab-order-detail.js](../../../pages/admin/modules/orders/subtabs/tab-order-detail.js)

### return_request_evidence

Không tìm thấy tham chiếu nguyên từ trong phạm vi quét.

### review

- [scripts/api/api.js](../../../scripts/api/api.js)
- [pages/services/service-detail/service-detail.js](../../../pages/services/service-detail/service-detail.js)
- [pages/services/service-detail/service-detail.html](../../../pages/services/service-detail/service-detail.html)
- [pages/public/landing/landing.html](../../../pages/public/landing/landing.html)
- [pages/user/modules/diary/diary.js](../../../pages/user/modules/diary/diary.js)
- [pages/user/modules/orders/order-detail.js](../../../pages/user/modules/orders/order-detail.js)
- [pages/user/modules/bookings/bookings.js](../../../pages/user/modules/bookings/bookings.js)
- [pages/user/modules/bookings/booking-detail.js](../../../pages/user/modules/bookings/booking-detail.js)
- [pages/user/modules/bookings/booking-detail.html](../../../pages/user/modules/bookings/booking-detail.html)
- [pages/user/modules/orders/orders.js](../../../pages/user/modules/orders/orders.js)
- [pages/user/modules/orders/review-handler.js](../../../pages/user/modules/orders/review-handler.js)
- [pages/admin/modules/services/services.html](../../../pages/admin/modules/services/services.html)
- [pages/admin/modules/services/services.js](../../../pages/admin/modules/services/services.js)
- [pages/shop/product-detail/product-reviews.js](../../../pages/shop/product-detail/product-reviews.js)
- [pages/shop/product-detail/product-detail.js](../../../pages/shop/product-detail/product-detail.js)
- [pages/admin/modules/orders/subtabs/tab-order-products.js](../../../pages/admin/modules/orders/subtabs/tab-order-products.js)
- [pages/shop/product-detail/product-detail.html](../../../pages/shop/product-detail/product-detail.html)
- [pages/admin/modules/pets/pets.html](../../../pages/admin/modules/pets/pets.html)
- [pages/admin/modules/services/subtabs/tab-service-reviews.js](../../../pages/admin/modules/services/subtabs/tab-service-reviews.js)

### review_media

Không tìm thấy tham chiếu nguyên từ trong phạm vi quét.

### review_response

- [scripts/api/api.js](../../../scripts/api/api.js)

### reward_rule

- [scripts/api/chat_actions.js](../../../scripts/api/chat_actions.js)
- [scripts/api/customer_loyalty.js](../../../scripts/api/customer_loyalty.js)

### role_permission

Không tìm thấy tham chiếu nguyên từ trong phạm vi quét.

### sales_order

- [pages/public/return-guest/return-guest.js](../../../pages/public/return-guest/return-guest.js)
- [pages/shop/payment-failed/payment-failed.js](../../../pages/shop/payment-failed/payment-failed.js)
- [scripts/api/customer_auth.js](../../../scripts/api/customer_auth.js)
- [scripts/api/chat.js](../../../scripts/api/chat.js)
- [scripts/api/api.js](../../../scripts/api/api.js)
- [pages/admin/admin-data-store.js](../../../pages/admin/admin-data-store.js)
- [pages/shop/payment-success/payment-success.js](../../../pages/shop/payment-success/payment-success.js)
- [pages/user/modules/settings/settings.js](../../../pages/user/modules/settings/settings.js)
- [pages/user/modules/profile/profile.js](../../../pages/user/modules/profile/profile.js)
- [pages/user/modules/orders/orders.js](../../../pages/user/modules/orders/orders.js)
- [pages/user/modules/orders/order-detail.js](../../../pages/user/modules/orders/order-detail.js)
- [pages/admin/modules/chatbot/chatbot.js](../../../pages/admin/modules/chatbot/chatbot.js)
- [pages/admin/modules/orders/orders.js](../../../pages/admin/modules/orders/orders.js)
- [pages/user/modules/orders/return-detail.js](../../../pages/user/modules/orders/return-detail.js)
- [pages/user/modules/orders/return-handler.js](../../../pages/user/modules/orders/return-handler.js)
- [pages/admin/modules/complaints/complaints.js](../../../pages/admin/modules/complaints/complaints.js)
- [pages/admin/modules/dashboard/dashboard.js](../../../pages/admin/modules/dashboard/dashboard.js)
- [pages/admin/modules/orders/subtabs/tab-order-detail.js](../../../pages/admin/modules/orders/subtabs/tab-order-detail.js)
- [pages/admin/modules/orders/subtabs/tab-order-list.js](../../../pages/admin/modules/orders/subtabs/tab-order-list.js)
- [pages/admin/modules/settings/settings.js](../../../pages/admin/modules/settings/settings.js)
- [pages/admin/modules/customers/customers.js](../../../pages/admin/modules/customers/customers.js)

### sales_order_detail

- [scripts/api/api.js](../../../scripts/api/api.js)
- [scripts/api/chat.js](../../../scripts/api/chat.js)
- [scripts/api/customer_auth.js](../../../scripts/api/customer_auth.js)
- [pages/public/return-guest/return-guest.js](../../../pages/public/return-guest/return-guest.js)
- [pages/shop/payment-success/payment-success.js](../../../pages/shop/payment-success/payment-success.js)
- [pages/user/modules/orders/return-handler.js](../../../pages/user/modules/orders/return-handler.js)
- [pages/admin/modules/orders/orders.js](../../../pages/admin/modules/orders/orders.js)
- [pages/admin/modules/orders/subtabs/tab-order-list.js](../../../pages/admin/modules/orders/subtabs/tab-order-list.js)

### service

- [server.js](../../../server.js)
- [api/staff-auth.js](../../../api/staff-auth.js)
- [pages/admin/admin.js](../../../pages/admin/admin.js)
- [scripts/api/chat_actions.js](../../../scripts/api/chat_actions.js)
- [pages/user/user.js](../../../pages/user/user.js)
- [pages/admin/admin-data-store.js](../../../pages/admin/admin-data-store.js)
- [scripts/api/chat.js](../../../scripts/api/chat.js)
- [scripts/api/api.js](../../../scripts/api/api.js)
- [pages/public/return-guest/return-guest.js](../../../pages/public/return-guest/return-guest.js)
- [pages/admin/modules/chatbot/chatbot.html](../../../pages/admin/modules/chatbot/chatbot.html)
- [pages/admin/modules/chatbot/chatbot.js](../../../pages/admin/modules/chatbot/chatbot.js)
- [pages/public/landing/landing.js](../../../pages/public/landing/landing.js)
- [pages/admin/modules/dashboard/dashboard.js](../../../pages/admin/modules/dashboard/dashboard.js)
- [pages/admin/modules/pets/pets.html](../../../pages/admin/modules/pets/pets.html)
- [pages/user/modules/wishlist/wishlist.js](../../../pages/user/modules/wishlist/wishlist.js)
- [pages/admin/modules/chatbot/subtabs/tab-chatbot-live.js](../../../pages/admin/modules/chatbot/subtabs/tab-chatbot-live.js)
- [pages/admin/modules/chatbot/subtabs/tab-chatbot-copilot.js](../../../pages/admin/modules/chatbot/subtabs/tab-chatbot-copilot.js)
- [pages/user/modules/wishlist/wishlist.html](../../../pages/user/modules/wishlist/wishlist.html)
- [pages/admin/modules/customers/subtabs/tab-customer-profile.js](../../../pages/admin/modules/customers/subtabs/tab-customer-profile.js)
- [pages/admin/modules/pets/pets.js](../../../pages/admin/modules/pets/pets.js)
- [pages/admin/modules/pets/subtabs/tab-pet-list.js](../../../pages/admin/modules/pets/subtabs/tab-pet-list.js)
- [scripts/api/customer_auth.js](../../../scripts/api/customer_auth.js)
- [pages/admin/modules/pets/subtabs/tab-pet-reminders.js](../../../pages/admin/modules/pets/subtabs/tab-pet-reminders.js)
- [pages/admin/modules/orders/orders.html](../../../pages/admin/modules/orders/orders.html)
- [pages/admin/modules/pets/subtabs/tab-pet-profile.js](../../../pages/admin/modules/pets/subtabs/tab-pet-profile.js)
- [components/header/header.js](../../../components/header/header.js)
- [pages/admin/modules/staff/subtabs/tab-staff-list.js](../../../pages/admin/modules/staff/subtabs/tab-staff-list.js)
- [pages/admin/modules/customers/customers.js](../../../pages/admin/modules/customers/customers.js)
- [pages/admin/modules/customers/customers.html](../../../pages/admin/modules/customers/customers.html)
- [pages/user/modules/support/support.js](../../../pages/user/modules/support/support.js)
- [components/fab/fab.js](../../../components/fab/fab.js)
- [pages/admin/modules/staff/subtabs/tab-staff-schedule.js](../../../pages/admin/modules/staff/subtabs/tab-staff-schedule.js)
- [pages/user/modules/support/support-create.html](../../../pages/user/modules/support/support-create.html)
- [pages/user/modules/support/support-create.js](../../../pages/user/modules/support/support-create.js)
- [pages/user/modules/diary/diary.js](../../../pages/user/modules/diary/diary.js)
- [pages/user/modules/diary/diary.html](../../../pages/user/modules/diary/diary.html)
- [pages/user/modules/profile/profile.js](../../../pages/user/modules/profile/profile.js)
- [pages/admin/modules/complaints/subtabs/tab-complaint-detail.js](../../../pages/admin/modules/complaints/subtabs/tab-complaint-detail.js)
- [pages/services/booking/booking.js](../../../pages/services/booking/booking.js)
- [pages/admin/modules/complaints/complaints.js](../../../pages/admin/modules/complaints/complaints.js)
- [pages/services/services.js](../../../pages/services/services.js)
- [pages/services/index.html](../../../pages/services/index.html)
- [pages/services/services.html](../../../pages/services/services.html)
- [pages/admin/modules/services/subtabs/tab-service-bookings.js](../../../pages/admin/modules/services/subtabs/tab-service-bookings.js)
- [pages/admin/modules/settings/settings.js](../../../pages/admin/modules/settings/settings.js)
- [pages/admin/modules/complaints/complaints.html](../../../pages/admin/modules/complaints/complaints.html)
- [pages/user/modules/bookings/bookings.js](../../../pages/user/modules/bookings/bookings.js)
- [pages/admin/modules/services/subtabs/tab-service-reviews.js](../../../pages/admin/modules/services/subtabs/tab-service-reviews.js)
- [pages/admin/modules/services/services.js](../../../pages/admin/modules/services/services.js)
- [pages/admin/modules/services/services.html](../../../pages/admin/modules/services/services.html)
- [pages/admin/modules/services/subtabs/tab-service-detail.js](../../../pages/admin/modules/services/subtabs/tab-service-detail.js)
- [pages/admin/modules/services/subtabs/tab-service-catalog.js](../../../pages/admin/modules/services/subtabs/tab-service-catalog.js)
- [pages/services/service-detail/service-detail.js](../../../pages/services/service-detail/service-detail.js)
- [pages/user/modules/bookings/booking-detail.js](../../../pages/user/modules/bookings/booking-detail.js)
- [pages/user/modules/pets/pets.js](../../../pages/user/modules/pets/pets.js)
- [pages/user/modules/bookings/booking-detail.html](../../../pages/user/modules/bookings/booking-detail.html)
- [pages/services/service-detail/service-detail.html](../../../pages/services/service-detail/service-detail.html)

### service_addon

Không tìm thấy tham chiếu nguyên từ trong phạm vi quét.

### service_care_action

Không tìm thấy tham chiếu nguyên từ trong phạm vi quét.

### service_category

- [scripts/api/api.js](../../../scripts/api/api.js)
- [pages/user/modules/support/support-create.js](../../../pages/user/modules/support/support-create.js)
- [pages/admin/modules/services/services.js](../../../pages/admin/modules/services/services.js)
- [pages/admin/modules/services/subtabs/tab-service-catalog.js](../../../pages/admin/modules/services/subtabs/tab-service-catalog.js)
- [pages/admin/modules/services/subtabs/tab-service-detail.js](../../../pages/admin/modules/services/subtabs/tab-service-detail.js)

### service_image

Không tìm thấy tham chiếu nguyên từ trong phạm vi quét.

### service_price_matrix

- [pages/public/return-guest/return-guest.js](../../../pages/public/return-guest/return-guest.js)
- [scripts/api/customer_auth.js](../../../scripts/api/customer_auth.js)
- [scripts/api/chat.js](../../../scripts/api/chat.js)
- [scripts/api/api.js](../../../scripts/api/api.js)
- [pages/admin/modules/services/services.js](../../../pages/admin/modules/services/services.js)
- [pages/admin/modules/services/subtabs/tab-service-bookings.js](../../../pages/admin/modules/services/subtabs/tab-service-bookings.js)
- [pages/admin/modules/services/subtabs/tab-service-catalog.js](../../../pages/admin/modules/services/subtabs/tab-service-catalog.js)

### service_supported_species

Không tìm thấy tham chiếu nguyên từ trong phạm vi quét.

### shipping_provider

- [scripts/api/api.js](../../../scripts/api/api.js)

### staff

- [server.js](../../../server.js)
- [api/staff-auth.js](../../../api/staff-auth.js)
- [pages/user/user.js](../../../pages/user/user.js)
- [pages/admin/index.html](../../../pages/admin/index.html)
- [pages/admin/admin.js](../../../pages/admin/admin.js)
- [pages/admin/admin-data-store.js](../../../pages/admin/admin-data-store.js)
- [pages/public/return-guest/return-guest.js](../../../pages/public/return-guest/return-guest.js)
- [components/header/header.js](../../../components/header/header.js)
- [pages/public/login/login.js](../../../pages/public/login/login.js)
- [pages/public/login/login.html](../../../pages/public/login/login.html)
- [pages/services/booking/booking.js](../../../pages/services/booking/booking.js)
- [scripts/api/staff_auth.js](../../../scripts/api/staff_auth.js)
- [pages/services/booking/booking.html](../../../pages/services/booking/booking.html)
- [pages/admin/modules/customers/subtabs/tab-customer-profile.js](../../../pages/admin/modules/customers/subtabs/tab-customer-profile.js)
- [pages/admin/modules/customers/customers.js](../../../pages/admin/modules/customers/customers.js)
- [pages/admin/modules/chatbot/chatbot.js](../../../pages/admin/modules/chatbot/chatbot.js)
- [pages/admin/modules/staff/subtabs/tab-staff-schedule.js](../../../pages/admin/modules/staff/subtabs/tab-staff-schedule.js)
- [pages/admin/modules/staff/subtabs/tab-staff-assessment.js](../../../pages/admin/modules/staff/subtabs/tab-staff-assessment.js)
- [pages/admin/login/login.js](../../../pages/admin/login/login.js)
- [components/fab/fab.js](../../../components/fab/fab.js)
- [pages/admin/modules/staff/subtabs/tab-staff-profile.js](../../../pages/admin/modules/staff/subtabs/tab-staff-profile.js)
- [pages/admin/modules/staff/staff.js](../../../pages/admin/modules/staff/staff.js)
- [pages/admin/modules/staff/subtabs/tab-staff-list.js](../../../pages/admin/modules/staff/subtabs/tab-staff-list.js)
- [scripts/api/customer_auth.js](../../../scripts/api/customer_auth.js)
- [scripts/api/chat.js](../../../scripts/api/chat.js)
- [pages/admin/modules/staff/staff.html](../../../pages/admin/modules/staff/staff.html)
- [scripts/api/api.js](../../../scripts/api/api.js)
- [pages/admin/modules/complaints/complaints.js](../../../pages/admin/modules/complaints/complaints.js)
- [scripts/api/chat_actions.js](../../../scripts/api/chat_actions.js)
- [pages/admin/modules/complaints/subtabs/tab-complaint-detail.js](../../../pages/admin/modules/complaints/subtabs/tab-complaint-detail.js)
- [pages/user/modules/support/support-create.js](../../../pages/user/modules/support/support-create.js)
- [pages/user/modules/pets/pets.js](../../../pages/user/modules/pets/pets.js)
- [pages/admin/modules/chatbot/subtabs/tab-chatbot-live.js](../../../pages/admin/modules/chatbot/subtabs/tab-chatbot-live.js)
- [pages/user/index.html](../../../pages/user/index.html)
- [pages/admin/modules/settings/settings.js](../../../pages/admin/modules/settings/settings.js)
- [pages/user/modules/diary/diary.js](../../../pages/user/modules/diary/diary.js)
- [pages/admin/modules/dashboard/dashboard.html](../../../pages/admin/modules/dashboard/dashboard.html)
- [pages/admin/modules/dashboard/dashboard.js](../../../pages/admin/modules/dashboard/dashboard.js)
- [pages/admin/modules/pets/pets.html](../../../pages/admin/modules/pets/pets.html)
- [pages/admin/modules/pets/pets.js](../../../pages/admin/modules/pets/pets.js)
- [pages/admin/modules/settings/subtabs/tab-settings-content.js](../../../pages/admin/modules/settings/subtabs/tab-settings-content.js)
- [pages/user/modules/bookings/booking-detail.js](../../../pages/user/modules/bookings/booking-detail.js)
- [pages/user/modules/bookings/bookings.js](../../../pages/user/modules/bookings/bookings.js)
- [pages/admin/modules/services/services.js](../../../pages/admin/modules/services/services.js)
- [pages/admin/modules/services/subtabs/tab-service-bookings.js](../../../pages/admin/modules/services/subtabs/tab-service-bookings.js)
- [pages/admin/modules/services/services.html](../../../pages/admin/modules/services/services.html)
- [pages/admin/modules/services/subtabs/tab-service-detail.js](../../../pages/admin/modules/services/subtabs/tab-service-detail.js)
- [pages/admin/modules/orders/orders.js](../../../pages/admin/modules/orders/orders.js)
- [pages/admin/modules/orders/subtabs/tab-order-products.js](../../../pages/admin/modules/orders/subtabs/tab-order-products.js)
- [pages/admin/modules/services/subtabs/tab-service-reviews.js](../../../pages/admin/modules/services/subtabs/tab-service-reviews.js)

### staff_assessment

- [pages/admin/modules/staff/subtabs/tab-staff-assessment.js](../../../pages/admin/modules/staff/subtabs/tab-staff-assessment.js)

### staff_level

Không tìm thấy tham chiếu nguyên từ trong phạm vi quét.

### staff_permission

Không tìm thấy tham chiếu nguyên từ trong phạm vi quét.

### staff_role

- [scripts/api/chat_actions.js](../../../scripts/api/chat_actions.js)

### staff_schedule

- [pages/services/booking/booking.js](../../../pages/services/booking/booking.js)
- [pages/user/modules/bookings/booking-detail.js](../../../pages/user/modules/bookings/booking-detail.js)
- [pages/admin/modules/staff/staff.js](../../../pages/admin/modules/staff/staff.js)
- [pages/admin/modules/staff/subtabs/tab-staff-schedule.js](../../../pages/admin/modules/staff/subtabs/tab-staff-schedule.js)

### staff_shift_request

- [pages/admin/modules/staff/subtabs/tab-staff-schedule.js](../../../pages/admin/modules/staff/subtabs/tab-staff-schedule.js)
- [pages/admin/modules/staff/staff.js](../../../pages/admin/modules/staff/staff.js)

### stock_reservation

- [scripts/api/api.js](../../../scripts/api/api.js)

### supplier

- [pages/admin/modules/orders/subtabs/tab-order-products.js](../../../pages/admin/modules/orders/subtabs/tab-order-products.js)

### support_ticket

- [scripts/api/chat.js](../../../scripts/api/chat.js)
- [scripts/api/api.js](../../../scripts/api/api.js)
- [scripts/api/chat_actions.js](../../../scripts/api/chat_actions.js)
- [scripts/api/customer_support.js](../../../scripts/api/customer_support.js)
- [pages/user/modules/support/support.js](../../../pages/user/modules/support/support.js)
- [pages/admin/modules/dashboard/dashboard.js](../../../pages/admin/modules/dashboard/dashboard.js)
- [pages/admin/modules/chatbot/chatbot.js](../../../pages/admin/modules/chatbot/chatbot.js)
- [pages/admin/modules/complaints/complaints.js](../../../pages/admin/modules/complaints/complaints.js)
- [pages/admin/modules/complaints/subtabs/tab-complaint-detail.js](../../../pages/admin/modules/complaints/subtabs/tab-complaint-detail.js)
- [pages/admin/modules/customers/customers.js](../../../pages/admin/modules/customers/customers.js)

### support_ticket_message

- [scripts/api/chat_actions.js](../../../scripts/api/chat_actions.js)
- [scripts/api/api.js](../../../scripts/api/api.js)
- [scripts/api/customer_support.js](../../../scripts/api/customer_support.js)
- [pages/user/modules/support/support.js](../../../pages/user/modules/support/support.js)
- [pages/admin/modules/complaints/complaints.js](../../../pages/admin/modules/complaints/complaints.js)
- [pages/admin/modules/complaints/subtabs/tab-complaint-detail.js](../../../pages/admin/modules/complaints/subtabs/tab-complaint-detail.js)

### support_ticket_message_attachment

Không tìm thấy tham chiếu nguyên từ trong phạm vi quét.

### taxi_price_rule

- [scripts/api/api.js](../../../scripts/api/api.js)
- [pages/admin/modules/services/subtabs/tab-service-bookings.js](../../../pages/admin/modules/services/subtabs/tab-service-bookings.js)

### taxi_trip

Không tìm thấy tham chiếu nguyên từ trong phạm vi quét.

### variant_color

- [pages/admin/modules/orders/orders.js](../../../pages/admin/modules/orders/orders.js)

### variant_flavor

- [pages/admin/modules/orders/orders.js](../../../pages/admin/modules/orders/orders.js)
- [pages/admin/modules/orders/subtabs/tab-order-products.js](../../../pages/admin/modules/orders/subtabs/tab-order-products.js)

### variant_size

- [pages/admin/modules/orders/subtabs/tab-order-products.js](../../../pages/admin/modules/orders/subtabs/tab-order-products.js)
- [pages/admin/modules/orders/orders.js](../../../pages/admin/modules/orders/orders.js)

### voucher

- [pages/admin/admin-data-store.js](../../../pages/admin/admin-data-store.js)
- [pages/services/booking/booking.js](../../../pages/services/booking/booking.js)
- [pages/services/booking/booking.html](../../../pages/services/booking/booking.html)
- [pages/shop/checkout/checkout.js](../../../pages/shop/checkout/checkout.js)
- [pages/shop/checkout/checkout.html](../../../pages/shop/checkout/checkout.html)
- [pages/shop/cart/cart.js](../../../pages/shop/cart/cart.js)
- [pages/shop/cart/cart.html](../../../pages/shop/cart/cart.html)
- [pages/public/landing/landing.html](../../../pages/public/landing/landing.html)
- [components/header/header.js](../../../components/header/header.js)
- [scripts/api/api.js](../../../scripts/api/api.js)
- [pages/user/modules/support/support.js](../../../pages/user/modules/support/support.js)
- [pages/shop/payment-success/payment-success.js](../../../pages/shop/payment-success/payment-success.js)
- [scripts/api/chat.js](../../../scripts/api/chat.js)
- [pages/user/modules/support/support-create.html](../../../pages/user/modules/support/support-create.html)
- [pages/shop/payment-success/payment-success.html](../../../pages/shop/payment-success/payment-success.html)
- [components/fab/fab.js](../../../components/fab/fab.js)
- [scripts/api/customer_loyalty.js](../../../scripts/api/customer_loyalty.js)
- [pages/user/modules/loyalty/loyalty.html](../../../pages/user/modules/loyalty/loyalty.html)
- [pages/user/modules/loyalty/loyalty.js](../../../pages/user/modules/loyalty/loyalty.js)
- [pages/admin/modules/chatbot/chatbot.html](../../../pages/admin/modules/chatbot/chatbot.html)
- [pages/admin/modules/settings/settings.html](../../../pages/admin/modules/settings/settings.html)
- [pages/user/modules/orders/order-detail.js](../../../pages/user/modules/orders/order-detail.js)
- [pages/admin/modules/orders/orders.html](../../../pages/admin/modules/orders/orders.html)
- [pages/admin/modules/settings/settings.js](../../../pages/admin/modules/settings/settings.js)
- [pages/admin/modules/pets/pets.html](../../../pages/admin/modules/pets/pets.html)
- [pages/admin/modules/chatbot/subtabs/tab-chatbot-live.js](../../../pages/admin/modules/chatbot/subtabs/tab-chatbot-live.js)
- [pages/user/modules/orders/orders.js](../../../pages/user/modules/orders/orders.js)
- [pages/admin/modules/orders/orders.js](../../../pages/admin/modules/orders/orders.js)
- [pages/admin/modules/settings/subtabs/tab-settings-banners.js](../../../pages/admin/modules/settings/subtabs/tab-settings-banners.js)
- [pages/admin/modules/orders/subtabs/tab-order-list.js](../../../pages/admin/modules/orders/subtabs/tab-order-list.js)
- [pages/admin/modules/services/services.html](../../../pages/admin/modules/services/services.html)
- [pages/admin/modules/orders/subtabs/tab-order-promos.js](../../../pages/admin/modules/orders/subtabs/tab-order-promos.js)
- [pages/admin/modules/services/subtabs/tab-service-bookings.js](../../../pages/admin/modules/services/subtabs/tab-service-bookings.js)

### voucher_redemption

Không tìm thấy tham chiếu nguyên từ trong phạm vi quét.

### wishlist

- [pages/user/index.html](../../../pages/user/index.html)
- [pages/user/user.js](../../../pages/user/user.js)
- [pages/public/about/about.html](../../../pages/public/about/about.html)
- [components/user-sidebar/user-sidebar.js](../../../components/user-sidebar/user-sidebar.js)
- [pages/services/services.js](../../../pages/services/services.js)
- [components/user-sidebar/user-sidebar.html](../../../components/user-sidebar/user-sidebar.html)
- [pages/services/booking/booking.html](../../../pages/services/booking/booking.html)
- [pages/services/services.html](../../../pages/services/services.html)
- [pages/public/blog-detail/blog-detail.html](../../../pages/public/blog-detail/blog-detail.html)
- [pages/services/index.html](../../../pages/services/index.html)
- [pages/public/return-guest/return-guest.html](../../../pages/public/return-guest/return-guest.html)
- [pages/services/service-detail/service-detail.html](../../../pages/services/service-detail/service-detail.html)
- [pages/public/landing/landing.js](../../../pages/public/landing/landing.js)
- [pages/public/blog/blog.html](../../../pages/public/blog/blog.html)
- [components/header/header.js](../../../components/header/header.js)
- [pages/user/modules/wishlist/wishlist.js](../../../pages/user/modules/wishlist/wishlist.js)
- [pages/services/booking-success/booking-success.html](../../../pages/services/booking-success/booking-success.html)
- [pages/public/landing/landing.html](../../../pages/public/landing/landing.html)
- [pages/public/login/login.html](../../../pages/public/login/login.html)
- [pages/shop/shop.js](../../../pages/shop/shop.js)
- [components/header/header.html](../../../components/header/header.html)
- [pages/user/modules/wishlist/wishlist.html](../../../pages/user/modules/wishlist/wishlist.html)
- [pages/shop/shop.html](../../../pages/shop/shop.html)
- [scripts/api/api.js](../../../scripts/api/api.js)
- [pages/public/contact/contact.html](../../../pages/public/contact/contact.html)
- [pages/shop/product-detail/product-detail.js](../../../pages/shop/product-detail/product-detail.js)
- [pages/shop/product-detail/product-detail.html](../../../pages/shop/product-detail/product-detail.html)
- [pages/shop/payment-success/payment-success.html](../../../pages/shop/payment-success/payment-success.html)
- [pages/shop/payment-failed/payment-failed.html](../../../pages/shop/payment-failed/payment-failed.html)
- [pages/shop/index.html](../../../pages/shop/index.html)
- [pages/shop/checkout/checkout.html](../../../pages/shop/checkout/checkout.html)
- [pages/shop/cart/cart.html](../../../pages/shop/cart/cart.html)

### wishlist_product

Không tìm thấy tham chiếu nguyên từ trong phạm vi quét.

### wishlist_service

Không tìm thấy tham chiếu nguyên từ trong phạm vi quét.

## 4. Kiểu cột, khóa, chỉ mục và chính sách thực tế

Đây là metadata để rà soát; chưa diễn giải mọi ràng buộc thành yêu cầu V1.

### access_role

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `code` | text | Có |
| `role_name` | text | Có |
| `created_at` | timestamp with time zone | Có |
| `updated_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `access_role_code_check`: `CHECK ((length(btrim(code)) > 0))`
- `access_role_pkey`: `PRIMARY KEY (code)`
- `access_role_role_name_check`: `CHECK ((length(btrim(role_name)) > 0))`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX access_role_pkey ON public.access_role USING btree (code)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('access_role.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('access_role.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('access_role.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('access_role.write'::text)`; WITH CHECK `pawpal_private.has_permission('access_role.write'::text)`.

### admin_copilot_history

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `session_id` | uuid | Có |
| `staff_id` | uuid | Có |
| `role` | text | Có |
| `content` | text | Có |
| `metadata` | jsonb | Có |
| `created_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `admin_copilot_history_pkey`: `PRIMARY KEY (id)`
- `admin_copilot_history_role_check`: `CHECK ((length(btrim(role)) > 0))`
- `admin_copilot_history_staff_id_fkey`: `FOREIGN KEY (staff_id) REFERENCES staff(id) DEFERRABLE`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX admin_copilot_history_pkey ON public.admin_copilot_history USING btree (id)`
- `CREATE INDEX v1fk_ef34fe0cda0d462f6c ON public.admin_copilot_history USING btree (staff_id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('admin_copilot_history.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('admin_copilot_history.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('admin_copilot_history.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('admin_copilot_history.write'::text)`; WITH CHECK `pawpal_private.has_permission('admin_copilot_history.write'::text)`.

### appointment

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `appointment_code` | text | Có |
| `customer_id` | uuid | Có |
| `pet_id` | uuid | Có |
| `staff_id` | uuid | Không |
| `check_in_time` | timestamp with time zone | Không |
| `check_out_time` | timestamp with time zone | Không |
| `note` | text | Không |
| `change_count` | integer | Có |
| `appointment_status` | text | Có |
| `created_at` | timestamp with time zone | Có |
| `updated_at` | timestamp with time zone | Có |
| `scheduled_start_at` | timestamp with time zone | Có |
| `scheduled_end_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `appointment_appointment_code_check`: `CHECK ((length(btrim(appointment_code)) > 0))`
- `appointment_appointment_code_key`: `UNIQUE (appointment_code)`
- `appointment_appointment_status_check`: `CHECK ((length(btrim(appointment_status)) > 0))`
- `appointment_change_count_check`: `CHECK ((change_count >= 0))`
- `appointment_check`: `CHECK ((scheduled_end_at > scheduled_start_at))`
- `appointment_check1`: `CHECK (((check_out_time IS NULL) OR (check_out_time >= check_in_time)))`
- `appointment_customer_id_fkey`: `FOREIGN KEY (customer_id) REFERENCES customer(id) DEFERRABLE`
- `appointment_pet_id_fkey`: `FOREIGN KEY (pet_id) REFERENCES pet_profile(id) DEFERRABLE`
- `appointment_pkey`: `PRIMARY KEY (id)`
- `appointment_staff_id_fkey`: `FOREIGN KEY (staff_id) REFERENCES staff(id) DEFERRABLE`
- `v1_money_check`: `TRIGGER DEFERRABLE INITIALLY DEFERRED`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX appointment_appointment_code_key ON public.appointment USING btree (appointment_code)`
- `CREATE UNIQUE INDEX appointment_pkey ON public.appointment USING btree (id)`
- `CREATE INDEX v1fk_adc9c3114f37fa9622 ON public.appointment USING btree (staff_id)`
- `CREATE INDEX v1fk_b715937196a06007e5 ON public.appointment USING btree (customer_id)`
- `CREATE INDEX v1fk_e0c33cff566dadf471 ON public.appointment USING btree (pet_id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('appointment.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('appointment.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('appointment.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('appointment.write'::text)`; WITH CHECK `pawpal_private.has_permission('appointment.write'::text)`.

### appointment_adjustment

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `appointment_id` | uuid | Có |
| `adjustment_type` | text | Có |
| `duration_delta_minutes` | integer | Có |
| `amount_delta` | numeric(18,4) | Có |
| `reason` | text | Có |
| `proposed_by` | uuid | Có |
| `approved_by` | uuid | Không |
| `approval_status` | text | Có |
| `customer_consent_status` | text | Có |
| `approved_at` | timestamp with time zone | Không |
| `created_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `appointment_adjustment_adjustment_type_check`: `CHECK ((length(btrim(adjustment_type)) > 0))`
- `appointment_adjustment_appointment_id_fkey`: `FOREIGN KEY (appointment_id) REFERENCES appointment(id) DEFERRABLE`
- `appointment_adjustment_approval_status_check`: `CHECK ((length(btrim(approval_status)) > 0))`
- `appointment_adjustment_approved_by_fkey`: `FOREIGN KEY (approved_by) REFERENCES staff(id) DEFERRABLE`
- `appointment_adjustment_customer_consent_status_check`: `CHECK ((length(btrim(customer_consent_status)) > 0))`
- `appointment_adjustment_pkey`: `PRIMARY KEY (id)`
- `appointment_adjustment_proposed_by_fkey`: `FOREIGN KEY (proposed_by) REFERENCES staff(id) DEFERRABLE`
- `appointment_adjustment_reason_check`: `CHECK ((length(btrim(reason)) > 0))`
- `v1_money_check`: `TRIGGER DEFERRABLE INITIALLY DEFERRED`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX appointment_adjustment_pkey ON public.appointment_adjustment USING btree (id)`
- `CREATE INDEX v1fk_233a96aeb573c36e54 ON public.appointment_adjustment USING btree (appointment_id)`
- `CREATE INDEX v1fk_478b6b772db7869342 ON public.appointment_adjustment USING btree (proposed_by)`
- `CREATE INDEX v1fk_c2cafdcc3779897a61 ON public.appointment_adjustment USING btree (approved_by)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('appointment_adjustment.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('appointment_adjustment.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('appointment_adjustment.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('appointment_adjustment.write'::text)`; WITH CHECK `pawpal_private.has_permission('appointment_adjustment.write'::text)`.

### appointment_item

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `appointment_id` | uuid | Có |
| `service_id` | uuid | Không |
| `service_addon_id` | uuid | Không |
| `is_primary` | boolean | Có |
| `name_snapshot` | text | Có |
| `quantity` | integer | Có |
| `unit_price` | numeric(18,4) | Có |
| `discount_amount` | numeric(18,4) | Có |
| `duration_minutes` | integer | Có |
| `weight_snapshot` | numeric(18,4) | Không |
| `staff_id` | uuid | Không |
| `status` | text | Có |
| `created_at` | timestamp with time zone | Có |
| `updated_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `appointment_item_appointment_id_fkey`: `FOREIGN KEY (appointment_id) REFERENCES appointment(id) DEFERRABLE`
- `appointment_item_check`: `CHECK ((num_nonnulls(service_id, service_addon_id) = 1))`
- `appointment_item_check1`: `CHECK ((discount_amount <= ((quantity)::numeric * unit_price)))`
- `appointment_item_check2`: `CHECK (((NOT is_primary) OR (service_id IS NOT NULL)))`
- `appointment_item_discount_amount_check`: `CHECK ((discount_amount >= (0)::numeric))`
- `appointment_item_duration_minutes_check`: `CHECK ((duration_minutes >= 0))`
- `appointment_item_name_snapshot_check`: `CHECK ((length(btrim(name_snapshot)) > 0))`
- `appointment_item_pkey`: `PRIMARY KEY (id)`
- `appointment_item_quantity_check`: `CHECK ((quantity > 0))`
- `appointment_item_service_addon_id_fkey`: `FOREIGN KEY (service_addon_id) REFERENCES service_addon(id) DEFERRABLE`
- `appointment_item_service_id_fkey`: `FOREIGN KEY (service_id) REFERENCES service(id) DEFERRABLE`
- `appointment_item_staff_id_fkey`: `FOREIGN KEY (staff_id) REFERENCES staff(id) DEFERRABLE`
- `appointment_item_status_check`: `CHECK ((length(btrim(status)) > 0))`
- `appointment_item_unit_price_check`: `CHECK ((unit_price >= (0)::numeric))`
- `appointment_item_weight_snapshot_check`: `CHECK ((weight_snapshot >= (0)::numeric))`
- `v1_money_check`: `TRIGGER DEFERRABLE INITIALLY DEFERRED`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX appointment_item_appointment_id_idx ON public.appointment_item USING btree (appointment_id) WHERE is_primary`
- `CREATE UNIQUE INDEX appointment_item_pkey ON public.appointment_item USING btree (id)`
- `CREATE INDEX v1fk_b13b31a4a40dfe904a ON public.appointment_item USING btree (service_id)`
- `CREATE INDEX v1fk_ba6faca544ee9bcc94 ON public.appointment_item USING btree (appointment_id)`
- `CREATE INDEX v1fk_c278c1198a36eb3714 ON public.appointment_item USING btree (staff_id)`
- `CREATE INDEX v1fk_c3133fdd7568d79c60 ON public.appointment_item USING btree (service_addon_id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('appointment_item.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('appointment_item.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('appointment_item.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('appointment_item.write'::text)`; WITH CHECK `pawpal_private.has_permission('appointment_item.write'::text)`.

### appointment_record

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `appointment_id` | uuid | Có |
| `record_type` | text | Có |
| `schema_version` | integer | Có |
| `revision_no` | integer | Có |
| `recorded_by` | uuid | Có |
| `recorded_at` | timestamp with time zone | Có |
| `condition_note` | text | Có |
| `safety_note_snapshot` | text | Không |
| `allergy_note_snapshot` | text | Không |
| `customer_confirmation_status` | text | Có |
| `confirmed_at` | timestamp with time zone | Không |
| `note` | text | Không |
| `created_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `appointment_record_appointment_id_fkey`: `FOREIGN KEY (appointment_id) REFERENCES appointment(id) DEFERRABLE`
- `appointment_record_appointment_id_record_type_revision_no_key`: `UNIQUE (appointment_id, record_type, revision_no)`
- `appointment_record_check`: `CHECK (((customer_confirmation_status = 'confirmed'::text) = (confirmed_at IS NOT NULL)))`
- `appointment_record_condition_note_check`: `CHECK ((length(btrim(condition_note)) > 0))`
- `appointment_record_customer_confirmation_status_check`: `CHECK ((length(btrim(customer_confirmation_status)) > 0))`
- `appointment_record_customer_confirmation_status_check1`: `CHECK ((customer_confirmation_status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'declined'::text])))`
- `appointment_record_pkey`: `PRIMARY KEY (id)`
- `appointment_record_record_type_check`: `CHECK ((length(btrim(record_type)) > 0))`
- `appointment_record_recorded_by_fkey`: `FOREIGN KEY (recorded_by) REFERENCES staff(id) DEFERRABLE`
- `appointment_record_revision_no_check`: `CHECK ((revision_no >= 0))`
- `appointment_record_revision_no_check1`: `CHECK ((revision_no > 0))`
- `appointment_record_schema_version_check`: `CHECK ((schema_version >= 0))`
- `appointment_record_schema_version_check1`: `CHECK ((schema_version > 0))`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX appointment_record_appointment_id_record_type_revision_no_key ON public.appointment_record USING btree (appointment_id, record_type, revision_no)`
- `CREATE UNIQUE INDEX appointment_record_pkey ON public.appointment_record USING btree (id)`
- `CREATE INDEX v1fk_291c6008ca6e11042b ON public.appointment_record USING btree (recorded_by)`
- `CREATE INDEX v1fk_70bd44016760f5ba50 ON public.appointment_record USING btree (appointment_id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('appointment_record.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('appointment_record.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('appointment_record.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('appointment_record.write'::text)`; WITH CHECK `pawpal_private.has_permission('appointment_record.write'::text)`.

### audit_log

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `staff_id` | uuid | Không |
| `action` | text | Có |
| `entity_name` | text | Không |
| `entity_id` | uuid | Không |
| `description` | text | Không |
| `created_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `audit_log_action_check`: `CHECK ((length(btrim(action)) > 0))`
- `audit_log_pkey`: `PRIMARY KEY (id)`
- `audit_log_staff_id_fkey`: `FOREIGN KEY (staff_id) REFERENCES staff(id) DEFERRABLE`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX audit_log_pkey ON public.audit_log USING btree (id)`
- `CREATE INDEX v1fk_3464a5d1b5eb8fd829 ON public.audit_log USING btree (staff_id)`

Chính sách RLS:

- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('audit_log.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('audit_log.read'::text)`; WITH CHECK `—`.

### banner

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `image_url` | text | Có |
| `title` | text | Có |
| `description` | text | Không |
| `link` | text | Không |
| `button_text` | text | Không |
| `display_order` | integer | Có |
| `start_date` | date | Không |
| `end_date` | date | Không |
| `status` | text | Có |
| `created_at` | timestamp with time zone | Có |
| `updated_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `banner_display_order_check`: `CHECK ((display_order >= 0))`
- `banner_image_url_check`: `CHECK ((length(btrim(image_url)) > 0))`
- `banner_pkey`: `PRIMARY KEY (id)`
- `banner_status_check`: `CHECK ((length(btrim(status)) > 0))`
- `banner_title_check`: `CHECK ((length(btrim(title)) > 0))`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX banner_pkey ON public.banner USING btree (id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('banner.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('banner.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('banner.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('banner.write'::text)`; WITH CHECK `pawpal_private.has_permission('banner.write'::text)`.

### blog_category

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `category_name` | text | Có |
| `description` | text | Không |
| `display_order` | integer | Có |
| `status` | text | Có |
| `created_at` | timestamp with time zone | Có |
| `updated_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `blog_category_category_name_check`: `CHECK ((length(btrim(category_name)) > 0))`
- `blog_category_display_order_check`: `CHECK ((display_order >= 0))`
- `blog_category_pkey`: `PRIMARY KEY (id)`
- `blog_category_status_check`: `CHECK ((length(btrim(status)) > 0))`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX blog_category_pkey ON public.blog_category USING btree (id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('blog_category.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('blog_category.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('blog_category.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('blog_category.write'::text)`; WITH CHECK `pawpal_private.has_permission('blog_category.write'::text)`.

### blog_post

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `category_id` | uuid | Có |
| `title` | text | Có |
| `slug` | text | Có |
| `summary` | text | Không |
| `content` | text | Có |
| `thumbnail_url` | text | Không |
| `author_id` | uuid | Có |
| `publish_at` | timestamp with time zone | Không |
| `status` | text | Có |
| `view_count` | integer | Có |
| `created_at` | timestamp with time zone | Có |
| `updated_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `blog_post_author_id_fkey`: `FOREIGN KEY (author_id) REFERENCES staff(id) DEFERRABLE`
- `blog_post_category_id_fkey`: `FOREIGN KEY (category_id) REFERENCES blog_category(id) DEFERRABLE`
- `blog_post_pkey`: `PRIMARY KEY (id)`
- `blog_post_slug_check`: `CHECK ((length(btrim(slug)) > 0))`
- `blog_post_slug_key`: `UNIQUE (slug)`
- `blog_post_status_check`: `CHECK ((length(btrim(status)) > 0))`
- `blog_post_title_check`: `CHECK ((length(btrim(title)) > 0))`
- `blog_post_view_count_check`: `CHECK ((view_count >= 0))`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX blog_post_pkey ON public.blog_post USING btree (id)`
- `CREATE UNIQUE INDEX blog_post_slug_key ON public.blog_post USING btree (slug)`
- `CREATE INDEX v1fk_3cbcb5f797c7a2a0fb ON public.blog_post USING btree (author_id)`
- `CREATE INDEX v1fk_d5f02b01afc303fc17 ON public.blog_post USING btree (category_id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('blog_post.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('blog_post.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('blog_post.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('blog_post.write'::text)`; WITH CHECK `pawpal_private.has_permission('blog_post.write'::text)`.

### care_action

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `action_name` | text | Có |
| `is_active` | boolean | Có |
| `created_at` | timestamp with time zone | Có |
| `updated_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `care_action_action_name_check`: `CHECK ((length(btrim(action_name)) > 0))`
- `care_action_pkey`: `PRIMARY KEY (id)`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX care_action_pkey ON public.care_action USING btree (id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('care_action.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('care_action.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('care_action.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('care_action.write'::text)`; WITH CHECK `pawpal_private.has_permission('care_action.write'::text)`.

### care_log

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `appointment_id` | uuid | Có |
| `care_action_id` | uuid | Không |
| `description` | text | Không |
| `observed_condition` | text | Không |
| `recorded_at` | timestamp with time zone | Có |
| `created_at` | timestamp with time zone | Có |
| `updated_at` | timestamp with time zone | Có |
| `recorded_by` | uuid | Không |
| `action_name_snapshot` | text | Có |

Khóa và CHECK:

- `care_log_action_name_snapshot_check`: `CHECK ((length(btrim(action_name_snapshot)) > 0))`
- `care_log_appointment_id_fkey`: `FOREIGN KEY (appointment_id) REFERENCES appointment(id) DEFERRABLE`
- `care_log_care_action_id_fkey`: `FOREIGN KEY (care_action_id) REFERENCES care_action(id) DEFERRABLE`
- `care_log_pkey`: `PRIMARY KEY (id)`
- `care_log_recorded_by_fkey`: `FOREIGN KEY (recorded_by) REFERENCES staff(id) DEFERRABLE`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX care_log_pkey ON public.care_log USING btree (id)`
- `CREATE INDEX v1fk_2325064dfb69a2b702 ON public.care_log USING btree (recorded_by)`
- `CREATE INDEX v1fk_5b84e3ddb2dd49d065 ON public.care_log USING btree (appointment_id)`
- `CREATE INDEX v1fk_910aaecda903ae0acd ON public.care_log USING btree (care_action_id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('care_log.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('care_log.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('care_log.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('care_log.write'::text)`; WITH CHECK `pawpal_private.has_permission('care_log.write'::text)`.

### care_log_media

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `care_log_id` | uuid | Có |
| `media_type` | text | Có |
| `media_url` | text | Có |
| `file_name` | text | Có |
| `file_size` | bigint | Có |
| `staff_id` | uuid | Không |
| `uploaded_at` | timestamp with time zone | Có |
| `created_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `care_log_media_care_log_id_fkey`: `FOREIGN KEY (care_log_id) REFERENCES care_log(id) DEFERRABLE`
- `care_log_media_file_name_check`: `CHECK ((length(btrim(file_name)) > 0))`
- `care_log_media_file_size_check`: `CHECK ((file_size >= 0))`
- `care_log_media_media_type_check`: `CHECK ((length(btrim(media_type)) > 0))`
- `care_log_media_media_url_check`: `CHECK ((length(btrim(media_url)) > 0))`
- `care_log_media_pkey`: `PRIMARY KEY (id)`
- `care_log_media_staff_id_fkey`: `FOREIGN KEY (staff_id) REFERENCES staff(id) DEFERRABLE`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX care_log_media_pkey ON public.care_log_media USING btree (id)`
- `CREATE INDEX v1fk_9861137bbfebe58a34 ON public.care_log_media USING btree (staff_id)`
- `CREATE INDEX v1fk_c21911852fc63bfeea ON public.care_log_media USING btree (care_log_id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('care_log_media.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('care_log_media.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('care_log_media.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('care_log_media.write'::text)`; WITH CHECK `pawpal_private.has_permission('care_log_media.write'::text)`.

### cart

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `customer_id` | uuid | Có |
| `cart_status` | text | Có |
| `created_at` | timestamp with time zone | Có |
| `updated_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `cart_cart_status_check`: `CHECK ((length(btrim(cart_status)) > 0))`
- `cart_customer_id_fkey`: `FOREIGN KEY (customer_id) REFERENCES customer(id) DEFERRABLE`
- `cart_pkey`: `PRIMARY KEY (id)`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX cart_pkey ON public.cart USING btree (id)`
- `CREATE INDEX v1fk_92f992202ce797fad9 ON public.cart USING btree (customer_id)`

Chính sách RLS:

- `own_customer`: SELECT, roles=authenticated; USING `pawpal_private.owns_customer(customer_id)`; WITH CHECK `—`.
- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('cart.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('cart.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('cart.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('cart.write'::text)`; WITH CHECK `pawpal_private.has_permission('cart.write'::text)`.

### cart_item

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `cart_id` | uuid | Có |
| `product_variant_id` | uuid | Có |
| `quantity` | integer | Có |
| `unit_price` | numeric(18,4) | Có |
| `created_at` | timestamp with time zone | Có |
| `updated_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `cart_item_cart_id_fkey`: `FOREIGN KEY (cart_id) REFERENCES cart(id) DEFERRABLE`
- `cart_item_cart_id_product_variant_id_key`: `UNIQUE (cart_id, product_variant_id)`
- `cart_item_pkey`: `PRIMARY KEY (id)`
- `cart_item_product_variant_id_fkey`: `FOREIGN KEY (product_variant_id) REFERENCES product_variant(id) DEFERRABLE`
- `cart_item_quantity_check`: `CHECK ((quantity > 0))`
- `cart_item_unit_price_check`: `CHECK ((unit_price >= (0)::numeric))`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX cart_item_cart_id_product_variant_id_key ON public.cart_item USING btree (cart_id, product_variant_id)`
- `CREATE UNIQUE INDEX cart_item_pkey ON public.cart_item USING btree (id)`
- `CREATE INDEX v1fk_7877a33fb94b22dc23 ON public.cart_item USING btree (product_variant_id)`
- `CREATE INDEX v1fk_90b1bf9bd9fb1077cb ON public.cart_item USING btree (cart_id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('cart_item.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('cart_item.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('cart_item.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('cart_item.write'::text)`; WITH CHECK `pawpal_private.has_permission('cart_item.write'::text)`.

### chat_conversation

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `customer_id` | uuid | Không |
| `status` | text | Có |
| `sentiment_level` | integer | Có |
| `sentiment_trend` | text | Có |
| `is_urgent` | boolean | Có |
| `assigned_staff_id` | uuid | Không |
| `ai_summary` | text | Không |
| `internal_note` | text | Không |
| `sla_deadline` | timestamp with time zone | Không |
| `resolved_at` | timestamp with time zone | Không |
| `resolved_reason` | text | Không |
| `resolved_by` | uuid | Không |
| `violation_count` | integer | Có |
| `blocked_until` | timestamp with time zone | Không |
| `channel` | text | Có |
| `created_at` | timestamp with time zone | Có |
| `updated_at` | timestamp with time zone | Có |
| `guest_session_id` | uuid | Không |

Khóa và CHECK:

- `chat_conversation_assigned_staff_id_fkey`: `FOREIGN KEY (assigned_staff_id) REFERENCES staff(id) DEFERRABLE`
- `chat_conversation_channel_check`: `CHECK ((length(btrim(channel)) > 0))`
- `chat_conversation_check`: `CHECK ((num_nonnulls(customer_id, guest_session_id) >= 1))`
- `chat_conversation_customer_id_fkey`: `FOREIGN KEY (customer_id) REFERENCES customer(id) DEFERRABLE`
- `chat_conversation_guest_session_id_fkey`: `FOREIGN KEY (guest_session_id) REFERENCES guest_session(id) DEFERRABLE`
- `chat_conversation_pkey`: `PRIMARY KEY (id)`
- `chat_conversation_resolved_by_fkey`: `FOREIGN KEY (resolved_by) REFERENCES staff(id) DEFERRABLE`
- `chat_conversation_sentiment_level_check`: `CHECK ((sentiment_level >= 0))`
- `chat_conversation_sentiment_level_fkey`: `FOREIGN KEY (sentiment_level) REFERENCES chatbot_sentiment_tier(level) DEFERRABLE`
- `chat_conversation_sentiment_trend_check`: `CHECK ((length(btrim(sentiment_trend)) > 0))`
- `chat_conversation_status_check`: `CHECK ((length(btrim(status)) > 0))`
- `chat_conversation_violation_count_check`: `CHECK ((violation_count >= 0))`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX chat_conversation_pkey ON public.chat_conversation USING btree (id)`
- `CREATE INDEX v1fk_20901e2a7a8f421969 ON public.chat_conversation USING btree (resolved_by)`
- `CREATE INDEX v1fk_604b07e2e3ab398a3a ON public.chat_conversation USING btree (assigned_staff_id)`
- `CREATE INDEX v1fk_6e602ced96b9ab712c ON public.chat_conversation USING btree (guest_session_id)`
- `CREATE INDEX v1fk_82c3c876f2213f3897 ON public.chat_conversation USING btree (sentiment_level)`
- `CREATE INDEX v1fk_d9f0aa51b34b12cd0c ON public.chat_conversation USING btree (customer_id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('chat_conversation.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('chat_conversation.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('chat_conversation.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('chat_conversation.write'::text)`; WITH CHECK `pawpal_private.has_permission('chat_conversation.write'::text)`.

### chat_feedback

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `conversation_id` | uuid | Có |
| `score` | smallint | Có |
| `comment` | text | Không |
| `submitted_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `chat_feedback_conversation_id_fkey`: `FOREIGN KEY (conversation_id) REFERENCES chat_conversation(id) DEFERRABLE`
- `chat_feedback_conversation_id_key`: `UNIQUE (conversation_id)`
- `chat_feedback_pkey`: `PRIMARY KEY (id)`
- `chat_feedback_score_check`: `CHECK (((score >= 1) AND (score <= 5)))`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX chat_feedback_conversation_id_key ON public.chat_feedback USING btree (conversation_id)`
- `CREATE UNIQUE INDEX chat_feedback_pkey ON public.chat_feedback USING btree (id)`
- `CREATE INDEX v1fk_3e10fd445647bd286d ON public.chat_feedback USING btree (conversation_id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('chat_feedback.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('chat_feedback.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('chat_feedback.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('chat_feedback.write'::text)`; WITH CHECK `pawpal_private.has_permission('chat_feedback.write'::text)`.

### chat_message

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `conversation_id` | uuid | Có |
| `sender_type` | text | Có |
| `content` | text | Có |
| `raw_content` | text | Không |
| `is_toxic` | boolean | Có |
| `sentiment_score` | numeric(18,4) | Có |
| `metadata` | jsonb | Có |
| `created_at` | timestamp with time zone | Có |
| `sender_account_id` | uuid | Không |
| `sender_guest_session_id` | uuid | Không |

Khóa và CHECK:

- `chat_message_conversation_id_fkey`: `FOREIGN KEY (conversation_id) REFERENCES chat_conversation(id) DEFERRABLE`
- `chat_message_pkey`: `PRIMARY KEY (id)`
- `chat_message_sender_account_id_fkey`: `FOREIGN KEY (sender_account_id) REFERENCES auth.users(id) DEFERRABLE`
- `chat_message_sender_guest_session_id_fkey`: `FOREIGN KEY (sender_guest_session_id) REFERENCES guest_session(id) DEFERRABLE`
- `chat_message_sender_type_check`: `CHECK ((length(btrim(sender_type)) > 0))`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX chat_message_pkey ON public.chat_message USING btree (id)`
- `CREATE INDEX v1fk_1ffccc7587eea4916c ON public.chat_message USING btree (sender_account_id)`
- `CREATE INDEX v1fk_57761cab3ad47dc3a3 ON public.chat_message USING btree (sender_guest_session_id)`
- `CREATE INDEX v1fk_74a4d5fe047cf368f2 ON public.chat_message USING btree (conversation_id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('chat_message.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('chat_message.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('chat_message.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('chat_message.write'::text)`; WITH CHECK `pawpal_private.has_permission('chat_message.write'::text)`.

### chat_moderation_log

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `conversation_id` | uuid | Có |
| `customer_id` | uuid | Không |
| `detected_keywords` | text[] | Có |
| `violation_count` | integer | Có |
| `action_taken` | text | Có |
| `notes` | text | Không |
| `created_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `chat_moderation_log_action_taken_check`: `CHECK ((length(btrim(action_taken)) > 0))`
- `chat_moderation_log_conversation_id_fkey`: `FOREIGN KEY (conversation_id) REFERENCES chat_conversation(id) DEFERRABLE`
- `chat_moderation_log_customer_id_fkey`: `FOREIGN KEY (customer_id) REFERENCES customer(id) DEFERRABLE`
- `chat_moderation_log_pkey`: `PRIMARY KEY (id)`
- `chat_moderation_log_violation_count_check`: `CHECK ((violation_count >= 0))`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX chat_moderation_log_pkey ON public.chat_moderation_log USING btree (id)`
- `CREATE INDEX v1fk_7091809622bd524fed ON public.chat_moderation_log USING btree (conversation_id)`
- `CREATE INDEX v1fk_c0445f9f660a307062 ON public.chat_moderation_log USING btree (customer_id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('chat_moderation_log.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('chat_moderation_log.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('chat_moderation_log.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('chat_moderation_log.write'::text)`; WITH CHECK `pawpal_private.has_permission('chat_moderation_log.write'::text)`.

### chatbot_canned_response

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `shortcut` | text | Có |
| `title` | text | Có |
| `content` | text | Có |
| `category` | text | Có |
| `usage_count` | integer | Có |
| `is_active` | boolean | Có |
| `created_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `chatbot_canned_response_category_check`: `CHECK ((length(btrim(category)) > 0))`
- `chatbot_canned_response_pkey`: `PRIMARY KEY (id)`
- `chatbot_canned_response_shortcut_check`: `CHECK ((length(btrim(shortcut)) > 0))`
- `chatbot_canned_response_title_check`: `CHECK ((length(btrim(title)) > 0))`
- `chatbot_canned_response_usage_count_check`: `CHECK ((usage_count >= 0))`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX chatbot_canned_response_pkey ON public.chatbot_canned_response USING btree (id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('chatbot_canned_response.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('chatbot_canned_response.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('chatbot_canned_response.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('chatbot_canned_response.write'::text)`; WITH CHECK `pawpal_private.has_permission('chatbot_canned_response.write'::text)`.

### chatbot_compensation_policy

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `issue_type` | text | Có |
| `max_points` | integer | Có |
| `max_discount_vnd` | numeric(18,4) | Có |
| `approval_required` | boolean | Có |
| `description` | text | Không |
| `is_active` | boolean | Có |

Khóa và CHECK:

- `chatbot_compensation_policy_issue_type_check`: `CHECK ((length(btrim(issue_type)) > 0))`
- `chatbot_compensation_policy_max_discount_vnd_check`: `CHECK ((max_discount_vnd >= (0)::numeric))`
- `chatbot_compensation_policy_max_points_check`: `CHECK ((max_points >= 0))`
- `chatbot_compensation_policy_pkey`: `PRIMARY KEY (id)`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX chatbot_compensation_policy_pkey ON public.chatbot_compensation_policy USING btree (id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('chatbot_compensation_policy.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('chatbot_compensation_policy.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('chatbot_compensation_policy.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('chatbot_compensation_policy.write'::text)`; WITH CHECK `pawpal_private.has_permission('chatbot_compensation_policy.write'::text)`.

### chatbot_handover_rule

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `condition_name` | text | Có |
| `trigger_type` | text | Có |
| `threshold_value` | numeric(18,4) | Có |
| `auto_assign_role` | text | Không |
| `sla_seconds` | integer | Có |
| `is_active` | boolean | Có |

Khóa và CHECK:

- `chatbot_handover_rule_auto_assign_role_fkey`: `FOREIGN KEY (auto_assign_role) REFERENCES access_role(code) DEFERRABLE`
- `chatbot_handover_rule_condition_name_check`: `CHECK ((length(btrim(condition_name)) > 0))`
- `chatbot_handover_rule_pkey`: `PRIMARY KEY (id)`
- `chatbot_handover_rule_sla_seconds_check`: `CHECK ((sla_seconds >= 0))`
- `chatbot_handover_rule_threshold_value_check`: `CHECK ((threshold_value >= (0)::numeric))`
- `chatbot_handover_rule_trigger_type_check`: `CHECK ((length(btrim(trigger_type)) > 0))`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX chatbot_handover_rule_pkey ON public.chatbot_handover_rule USING btree (id)`
- `CREATE INDEX v1fk_7041ed7c87d89851dd ON public.chatbot_handover_rule USING btree (auto_assign_role)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('chatbot_handover_rule.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('chatbot_handover_rule.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('chatbot_handover_rule.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('chatbot_handover_rule.write'::text)`; WITH CHECK `pawpal_private.has_permission('chatbot_handover_rule.write'::text)`.

### chatbot_knowledge_faq

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `category` | text | Có |
| `question` | text | Có |
| `answer` | text | Có |
| `keywords` | text[] | Có |
| `priority` | integer | Có |
| `is_active` | boolean | Có |
| `created_at` | timestamp with time zone | Có |
| `updated_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `chatbot_knowledge_faq_answer_check`: `CHECK ((length(btrim(answer)) > 0))`
- `chatbot_knowledge_faq_category_check`: `CHECK ((length(btrim(category)) > 0))`
- `chatbot_knowledge_faq_pkey`: `PRIMARY KEY (id)`
- `chatbot_knowledge_faq_priority_check`: `CHECK ((priority >= 0))`
- `chatbot_knowledge_faq_question_check`: `CHECK ((length(btrim(question)) > 0))`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX chatbot_knowledge_faq_pkey ON public.chatbot_knowledge_faq USING btree (id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('chatbot_knowledge_faq.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('chatbot_knowledge_faq.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('chatbot_knowledge_faq.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('chatbot_knowledge_faq.write'::text)`; WITH CHECK `pawpal_private.has_permission('chatbot_knowledge_faq.write'::text)`.

### chatbot_profanity_filter

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `keyword` | text | Có |
| `severity` | text | Có |
| `action` | text | Có |
| `replacement_text` | text | Không |
| `is_active` | boolean | Có |
| `created_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `chatbot_profanity_filter_action_check`: `CHECK ((length(btrim(action)) > 0))`
- `chatbot_profanity_filter_keyword_check`: `CHECK ((length(btrim(keyword)) > 0))`
- `chatbot_profanity_filter_pkey`: `PRIMARY KEY (id)`
- `chatbot_profanity_filter_severity_check`: `CHECK ((length(btrim(severity)) > 0))`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX chatbot_profanity_filter_pkey ON public.chatbot_profanity_filter USING btree (id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('chatbot_profanity_filter.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('chatbot_profanity_filter.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('chatbot_profanity_filter.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('chatbot_profanity_filter.write'::text)`; WITH CHECK `pawpal_private.has_permission('chatbot_profanity_filter.write'::text)`.

### chatbot_scenario_matrix

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `scenario_name` | text | Có |
| `sample_user_input` | text | Có |
| `expected_sentiment` | integer | Có |
| `expected_tool_call` | text | Không |
| `expected_handover` | boolean | Có |
| `benchmark_status` | text | Có |
| `created_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `chatbot_scenario_matrix_benchmark_status_check`: `CHECK ((length(btrim(benchmark_status)) > 0))`
- `chatbot_scenario_matrix_pkey`: `PRIMARY KEY (id)`
- `chatbot_scenario_matrix_sample_user_input_check`: `CHECK ((length(btrim(sample_user_input)) > 0))`
- `chatbot_scenario_matrix_scenario_name_check`: `CHECK ((length(btrim(scenario_name)) > 0))`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX chatbot_scenario_matrix_pkey ON public.chatbot_scenario_matrix USING btree (id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('chatbot_scenario_matrix.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('chatbot_scenario_matrix.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('chatbot_scenario_matrix.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('chatbot_scenario_matrix.write'::text)`; WITH CHECK `pawpal_private.has_permission('chatbot_scenario_matrix.write'::text)`.

### chatbot_sentiment_action

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `tier_level` | integer | Có |
| `bot_behavior` | text | Có |
| `notify_admin` | boolean | Có |
| `suggested_canned_id` | uuid | Không |
| `instructions` | text | Không |

Khóa và CHECK:

- `chatbot_sentiment_action_bot_behavior_check`: `CHECK ((length(btrim(bot_behavior)) > 0))`
- `chatbot_sentiment_action_pkey`: `PRIMARY KEY (id)`
- `chatbot_sentiment_action_suggested_canned_id_fkey`: `FOREIGN KEY (suggested_canned_id) REFERENCES chatbot_canned_response(id) DEFERRABLE`
- `chatbot_sentiment_action_tier_level_check`: `CHECK ((tier_level >= 0))`
- `chatbot_sentiment_action_tier_level_fkey`: `FOREIGN KEY (tier_level) REFERENCES chatbot_sentiment_tier(level) DEFERRABLE`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX chatbot_sentiment_action_pkey ON public.chatbot_sentiment_action USING btree (id)`
- `CREATE INDEX v1fk_b8ea51e05dcf9366ac ON public.chatbot_sentiment_action USING btree (tier_level)`
- `CREATE INDEX v1fk_dbbeaa83f567806030 ON public.chatbot_sentiment_action USING btree (suggested_canned_id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('chatbot_sentiment_action.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('chatbot_sentiment_action.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('chatbot_sentiment_action.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('chatbot_sentiment_action.write'::text)`; WITH CHECK `pawpal_private.has_permission('chatbot_sentiment_action.write'::text)`.

### chatbot_sentiment_tier

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `level` | integer | Có |
| `name` | text | Có |
| `color_badge` | text | Có |
| `sla_seconds` | integer | Có |
| `description` | text | Không |

Khóa và CHECK:

- `chatbot_sentiment_tier_color_badge_check`: `CHECK ((length(btrim(color_badge)) > 0))`
- `chatbot_sentiment_tier_level_check`: `CHECK ((level >= 0))`
- `chatbot_sentiment_tier_name_check`: `CHECK ((length(btrim(name)) > 0))`
- `chatbot_sentiment_tier_pkey`: `PRIMARY KEY (level)`
- `chatbot_sentiment_tier_sla_seconds_check`: `CHECK ((sla_seconds >= 0))`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX chatbot_sentiment_tier_pkey ON public.chatbot_sentiment_tier USING btree (level)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('chatbot_sentiment_tier.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('chatbot_sentiment_tier.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('chatbot_sentiment_tier.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('chatbot_sentiment_tier.write'::text)`; WITH CHECK `pawpal_private.has_permission('chatbot_sentiment_tier.write'::text)`.

### chatbot_sentiment_trigger

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `tier_level` | integer | Có |
| `trigger_pattern` | text | Có |
| `weight` | numeric(10,4) | Có |
| `context_domain` | text | Có |
| `is_active` | boolean | Có |

Khóa và CHECK:

- `chatbot_sentiment_trigger_context_domain_check`: `CHECK ((length(btrim(context_domain)) > 0))`
- `chatbot_sentiment_trigger_pkey`: `PRIMARY KEY (id)`
- `chatbot_sentiment_trigger_tier_level_check`: `CHECK ((tier_level >= 0))`
- `chatbot_sentiment_trigger_tier_level_fkey`: `FOREIGN KEY (tier_level) REFERENCES chatbot_sentiment_tier(level) DEFERRABLE`
- `chatbot_sentiment_trigger_trigger_pattern_check`: `CHECK ((length(btrim(trigger_pattern)) > 0))`
- `chatbot_sentiment_trigger_weight_check`: `CHECK ((weight >= (0)::numeric))`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX chatbot_sentiment_trigger_pkey ON public.chatbot_sentiment_trigger USING btree (id)`
- `CREATE INDEX v1fk_14920782a8aac601b5 ON public.chatbot_sentiment_trigger USING btree (tier_level)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('chatbot_sentiment_trigger.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('chatbot_sentiment_trigger.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('chatbot_sentiment_trigger.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('chatbot_sentiment_trigger.write'::text)`; WITH CHECK `pawpal_private.has_permission('chatbot_sentiment_trigger.write'::text)`.

### chatbot_system_prompt

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `prompt_key` | text | Có |
| `channel` | text | Có |
| `persona_name` | text | Có |
| `tone_of_voice` | text | Có |
| `content` | text | Có |
| `is_active` | boolean | Có |
| `created_at` | timestamp with time zone | Có |
| `updated_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `chatbot_system_prompt_channel_check`: `CHECK ((length(btrim(channel)) > 0))`
- `chatbot_system_prompt_persona_name_check`: `CHECK ((length(btrim(persona_name)) > 0))`
- `chatbot_system_prompt_pkey`: `PRIMARY KEY (id)`
- `chatbot_system_prompt_prompt_key_check`: `CHECK ((length(btrim(prompt_key)) > 0))`
- `chatbot_system_prompt_prompt_key_key`: `UNIQUE (prompt_key)`
- `chatbot_system_prompt_tone_of_voice_check`: `CHECK ((length(btrim(tone_of_voice)) > 0))`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX chatbot_system_prompt_pkey ON public.chatbot_system_prompt USING btree (id)`
- `CREATE UNIQUE INDEX chatbot_system_prompt_prompt_key_key ON public.chatbot_system_prompt USING btree (prompt_key)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('chatbot_system_prompt.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('chatbot_system_prompt.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('chatbot_system_prompt.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('chatbot_system_prompt.write'::text)`; WITH CHECK `pawpal_private.has_permission('chatbot_system_prompt.write'::text)`.

### customer

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `auth_user_id` | uuid | Không |
| `customer_code` | text | Có |
| `customer_status` | text | Có |
| `registered_at` | timestamp with time zone | Có |
| `note` | text | Không |
| `created_at` | timestamp with time zone | Có |
| `updated_at` | timestamp with time zone | Có |
| `contact_email` | text | Không |

Khóa và CHECK:

- `customer_auth_user_id_fkey`: `FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) DEFERRABLE`
- `customer_auth_user_id_key`: `UNIQUE (auth_user_id)`
- `customer_customer_code_check`: `CHECK ((length(btrim(customer_code)) > 0))`
- `customer_customer_code_key`: `UNIQUE (customer_code)`
- `customer_customer_status_check`: `CHECK ((length(btrim(customer_status)) > 0))`
- `customer_pkey`: `PRIMARY KEY (id)`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX customer_auth_user_id_key ON public.customer USING btree (auth_user_id)`
- `CREATE UNIQUE INDEX customer_customer_code_key ON public.customer USING btree (customer_code)`
- `CREATE UNIQUE INDEX customer_pkey ON public.customer USING btree (id)`
- `CREATE INDEX v1fk_35a91f2ed61eb91e09 ON public.customer USING btree (auth_user_id)`

Chính sách RLS:

- `own_customer`: SELECT, roles=authenticated; USING `pawpal_private.owns_customer(id)`; WITH CHECK `—`.
- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('customer.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('customer.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('customer.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('customer.write'::text)`; WITH CHECK `pawpal_private.has_permission('customer.write'::text)`.

### customer_address

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `customer_id` | uuid | Có |
| `receiver_name` | text | Có |
| `receiver_phone` | text | Có |
| `province` | text | Có |
| `street_address` | text | Có |
| `postal_code` | text | Không |
| `is_default` | boolean | Có |
| `created_at` | timestamp with time zone | Có |
| `updated_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `customer_address_customer_id_fkey`: `FOREIGN KEY (customer_id) REFERENCES customer(id) DEFERRABLE`
- `customer_address_pkey`: `PRIMARY KEY (id)`
- `customer_address_province_check`: `CHECK ((length(btrim(province)) > 0))`
- `customer_address_receiver_name_check`: `CHECK ((length(btrim(receiver_name)) > 0))`
- `customer_address_receiver_phone_check`: `CHECK ((length(btrim(receiver_phone)) > 0))`
- `customer_address_street_address_check`: `CHECK ((length(btrim(street_address)) > 0))`
- `v1_contact_default`: `TRIGGER DEFERRABLE INITIALLY DEFERRED`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX customer_address_customer_id_idx ON public.customer_address USING btree (customer_id) WHERE is_default`
- `CREATE UNIQUE INDEX customer_address_pkey ON public.customer_address USING btree (id)`
- `CREATE INDEX v1fk_c4747e7d7a3c1dcb54 ON public.customer_address USING btree (customer_id)`

Chính sách RLS:

- `own_customer`: SELECT, roles=authenticated; USING `pawpal_private.owns_customer(customer_id)`; WITH CHECK `—`.
- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('customer_address.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('customer_address.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('customer_address.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('customer_address.write'::text)`; WITH CHECK `pawpal_private.has_permission('customer_address.write'::text)`.

### customer_membership

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `customer_id` | uuid | Có |
| `membership_tier_id` | uuid | Có |
| `assigned_at` | timestamp with time zone | Có |
| `created_at` | timestamp with time zone | Có |
| `updated_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `customer_membership_customer_id_fkey`: `FOREIGN KEY (customer_id) REFERENCES customer(id) DEFERRABLE`
- `customer_membership_membership_tier_id_fkey`: `FOREIGN KEY (membership_tier_id) REFERENCES membership_tier(id) DEFERRABLE`
- `customer_membership_pkey`: `PRIMARY KEY (customer_id)`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX customer_membership_pkey ON public.customer_membership USING btree (customer_id)`
- `CREATE INDEX v1fk_39675f2efc5b35fa1e ON public.customer_membership USING btree (customer_id)`
- `CREATE INDEX v1fk_4f9c9ac4666e7ae85f ON public.customer_membership USING btree (membership_tier_id)`

Chính sách RLS:

- `own_customer`: SELECT, roles=authenticated; USING `pawpal_private.owns_customer(customer_id)`; WITH CHECK `—`.
- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('customer_membership.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('customer_membership.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('customer_membership.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('customer_membership.write'::text)`; WITH CHECK `pawpal_private.has_permission('customer_membership.write'::text)`.

### customer_phone

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `customer_id` | uuid | Có |
| `phone_number` | text | Có |
| `is_primary` | boolean | Có |
| `verified_at` | timestamp with time zone | Không |
| `created_at` | timestamp with time zone | Có |
| `updated_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `customer_phone_customer_id_fkey`: `FOREIGN KEY (customer_id) REFERENCES customer(id) DEFERRABLE`
- `customer_phone_customer_id_phone_number_key`: `UNIQUE (customer_id, phone_number)`
- `customer_phone_phone_number_check`: `CHECK ((length(btrim(phone_number)) > 0))`
- `customer_phone_phone_number_check1`: `CHECK ((phone_number ~ '^\+?[0-9]{8,15}$'::text))`
- `customer_phone_pkey`: `PRIMARY KEY (id)`
- `v1_contact_default`: `TRIGGER DEFERRABLE INITIALLY DEFERRED`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX customer_phone_customer_id_idx ON public.customer_phone USING btree (customer_id) WHERE is_primary`
- `CREATE UNIQUE INDEX customer_phone_customer_id_phone_number_key ON public.customer_phone USING btree (customer_id, phone_number)`
- `CREATE UNIQUE INDEX customer_phone_phone_number_idx ON public.customer_phone USING btree (phone_number) WHERE is_primary`
- `CREATE UNIQUE INDEX customer_phone_pkey ON public.customer_phone USING btree (id)`
- `CREATE INDEX v1fk_6891e6c20f9d89aa19 ON public.customer_phone USING btree (customer_id)`

Chính sách RLS:

- `own_customer`: SELECT, roles=authenticated; USING `pawpal_private.owns_customer(customer_id)`; WITH CHECK `—`.
- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('customer_phone.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('customer_phone.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('customer_phone.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('customer_phone.write'::text)`; WITH CHECK `pawpal_private.has_permission('customer_phone.write'::text)`.

### customer_profile

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `customer_id` | uuid | Có |
| `full_name` | text | Có |
| `date_of_birth` | date | Không |
| `gender` | text | Không |
| `created_at` | timestamp with time zone | Có |
| `updated_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `customer_profile_customer_id_fkey`: `FOREIGN KEY (customer_id) REFERENCES customer(id) DEFERRABLE`
- `customer_profile_date_of_birth_check`: `CHECK ((date_of_birth <= CURRENT_DATE))`
- `customer_profile_full_name_check`: `CHECK ((length(btrim(full_name)) > 0))`
- `customer_profile_pkey`: `PRIMARY KEY (customer_id)`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX customer_profile_pkey ON public.customer_profile USING btree (customer_id)`
- `CREATE INDEX v1fk_475e2047db570cb186 ON public.customer_profile USING btree (customer_id)`

Chính sách RLS:

- `own_customer`: SELECT, roles=authenticated; USING `pawpal_private.owns_customer(customer_id)`; WITH CHECK `—`.
- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('customer_profile.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('customer_profile.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('customer_profile.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('customer_profile.write'::text)`; WITH CHECK `pawpal_private.has_permission('customer_profile.write'::text)`.

### customer_voucher

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `customer_id` | uuid | Có |
| `voucher_id` | uuid | Có |
| `acquired_method` | text | Có |
| `voucher_status` | text | Có |
| `acquired_at` | timestamp with time zone | Có |
| `expired_at` | timestamp with time zone | Không |

Khóa và CHECK:

- `customer_voucher_acquired_method_check`: `CHECK ((length(btrim(acquired_method)) > 0))`
- `customer_voucher_customer_id_fkey`: `FOREIGN KEY (customer_id) REFERENCES customer(id) DEFERRABLE`
- `customer_voucher_pkey`: `PRIMARY KEY (id)`
- `customer_voucher_voucher_id_fkey`: `FOREIGN KEY (voucher_id) REFERENCES voucher(id) DEFERRABLE`
- `customer_voucher_voucher_status_check`: `CHECK ((length(btrim(voucher_status)) > 0))`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX customer_voucher_pkey ON public.customer_voucher USING btree (id)`
- `CREATE INDEX v1fk_84cbfd6632cddfc3c3 ON public.customer_voucher USING btree (voucher_id)`
- `CREATE INDEX v1fk_9cd21cbd63c9a2d02c ON public.customer_voucher USING btree (customer_id)`

Chính sách RLS:

- `own_customer`: SELECT, roles=authenticated; USING `pawpal_private.owns_customer(customer_id)`; WITH CHECK `—`.
- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('customer_voucher.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('customer_voucher.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('customer_voucher.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('customer_voucher.write'::text)`; WITH CHECK `pawpal_private.has_permission('customer_voucher.write'::text)`.

### delivery_option_config

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `name` | text | Có |
| `description` | text | Không |
| `fee` | numeric(18,4) | Có |
| `estimated_days` | integer | Không |
| `icon` | text | Không |
| `available` | boolean | Có |
| `created_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `delivery_option_config_estimated_days_check`: `CHECK ((estimated_days >= 0))`
- `delivery_option_config_fee_check`: `CHECK ((fee >= (0)::numeric))`
- `delivery_option_config_name_check`: `CHECK ((length(btrim(name)) > 0))`
- `delivery_option_config_pkey`: `PRIMARY KEY (id)`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX delivery_option_config_pkey ON public.delivery_option_config USING btree (id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('delivery_option_config.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('delivery_option_config.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('delivery_option_config.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('delivery_option_config.write'::text)`; WITH CHECK `pawpal_private.has_permission('delivery_option_config.write'::text)`.

### document_embeddings

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `content` | text | Có |
| `metadata` | jsonb | Có |
| `embedding` | vector | Có |

Khóa và CHECK:

- `document_embeddings_pkey`: `PRIMARY KEY (id)`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX document_embeddings_pkey ON public.document_embeddings USING btree (id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('document_embeddings.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('document_embeddings.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('document_embeddings.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('document_embeddings.write'::text)`; WITH CHECK `pawpal_private.has_permission('document_embeddings.write'::text)`.

### guest_session

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `token_hash` | text | Có |
| `expires_at` | timestamp with time zone | Có |
| `revoked_at` | timestamp with time zone | Không |
| `created_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `guest_session_check`: `CHECK ((expires_at > created_at))`
- `guest_session_pkey`: `PRIMARY KEY (id)`
- `guest_session_token_hash_check`: `CHECK ((length(btrim(token_hash)) > 0))`
- `guest_session_token_hash_check1`: `CHECK ((token_hash ~ '^[a-f0-9]{64}$'::text))`
- `guest_session_token_hash_key`: `UNIQUE (token_hash)`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX guest_session_pkey ON public.guest_session USING btree (id)`
- `CREATE UNIQUE INDEX guest_session_token_hash_key ON public.guest_session USING btree (token_hash)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('guest_session.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('guest_session.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('guest_session.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('guest_session.write'::text)`; WITH CHECK `pawpal_private.has_permission('guest_session.write'::text)`.

### hotel_booking

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `booking_code` | text | Có |
| `room_id` | uuid | Có |
| `appointment_id` | uuid | Có |
| `check_in_at` | timestamp with time zone | Có |
| `check_out_at` | timestamp with time zone | Có |
| `status` | text | Có |
| `special_diet_notes` | text | Không |
| `care_notes` | text | Không |
| `daily_price` | numeric(18,4) | Có |
| `created_at` | timestamp with time zone | Có |
| `updated_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `hotel_booking_appointment_id_fkey`: `FOREIGN KEY (appointment_id) REFERENCES appointment(id) DEFERRABLE`
- `hotel_booking_appointment_id_key`: `UNIQUE (appointment_id)`
- `hotel_booking_booking_code_check`: `CHECK ((length(btrim(booking_code)) > 0))`
- `hotel_booking_booking_code_key`: `UNIQUE (booking_code)`
- `hotel_booking_check`: `CHECK ((check_out_at > check_in_at))`
- `hotel_booking_daily_price_check`: `CHECK ((daily_price >= (0)::numeric))`
- `hotel_booking_pkey`: `PRIMARY KEY (id)`
- `hotel_booking_room_id_fkey`: `FOREIGN KEY (room_id) REFERENCES hotel_room(id) DEFERRABLE`
- `hotel_booking_status_check`: `CHECK ((length(btrim(status)) > 0))`
- `hotel_no_overlap`: `EXCLUDE USING gist (room_id WITH =, tstzrange(check_in_at, check_out_at, '[)'::text) WITH &&) WHERE ((status <> ALL (ARRAY['cancelled'::text, 'closed'::text])))`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX hotel_booking_appointment_id_key ON public.hotel_booking USING btree (appointment_id)`
- `CREATE UNIQUE INDEX hotel_booking_booking_code_key ON public.hotel_booking USING btree (booking_code)`
- `CREATE UNIQUE INDEX hotel_booking_pkey ON public.hotel_booking USING btree (id)`
- `CREATE INDEX hotel_no_overlap ON public.hotel_booking USING gist (room_id, tstzrange(check_in_at, check_out_at, '[)'::text)) WHERE (status <> ALL (ARRAY['cancelled'::text, 'closed'::text]))`
- `CREATE INDEX v1fk_471da749ef5db83029 ON public.hotel_booking USING btree (room_id)`
- `CREATE INDEX v1fk_e3feff5a49107506c0 ON public.hotel_booking USING btree (appointment_id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('hotel_booking.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('hotel_booking.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('hotel_booking.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('hotel_booking.write'::text)`; WITH CHECK `pawpal_private.has_permission('hotel_booking.write'::text)`.

### hotel_room

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `room_number` | text | Có |
| `room_type_id` | uuid | Có |
| `status` | text | Có |
| `description` | text | Không |
| `created_at` | timestamp with time zone | Có |
| `updated_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `hotel_room_pkey`: `PRIMARY KEY (id)`
- `hotel_room_room_number_check`: `CHECK ((length(btrim(room_number)) > 0))`
- `hotel_room_room_number_key`: `UNIQUE (room_number)`
- `hotel_room_room_type_id_fkey`: `FOREIGN KEY (room_type_id) REFERENCES hotel_room_type(id) DEFERRABLE`
- `hotel_room_status_check`: `CHECK ((length(btrim(status)) > 0))`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX hotel_room_pkey ON public.hotel_room USING btree (id)`
- `CREATE UNIQUE INDEX hotel_room_room_number_key ON public.hotel_room USING btree (room_number)`
- `CREATE INDEX v1fk_ecdd1483f022b0e857 ON public.hotel_room USING btree (room_type_id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('hotel_room.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('hotel_room.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('hotel_room.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('hotel_room.write'::text)`; WITH CHECK `pawpal_private.has_permission('hotel_room.write'::text)`.

### hotel_room_type

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `room_type` | text | Có |
| `capacity` | integer | Có |
| `daily_price` | numeric(18,4) | Có |
| `description` | text | Không |
| `amenities` | text | Không |
| `status` | text | Có |
| `created_at` | timestamp with time zone | Có |
| `updated_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `hotel_room_type_capacity_check`: `CHECK ((capacity >= 0))`
- `hotel_room_type_capacity_check1`: `CHECK ((capacity > 0))`
- `hotel_room_type_daily_price_check`: `CHECK ((daily_price >= (0)::numeric))`
- `hotel_room_type_pkey`: `PRIMARY KEY (id)`
- `hotel_room_type_room_type_check`: `CHECK ((length(btrim(room_type)) > 0))`
- `hotel_room_type_status_check`: `CHECK ((length(btrim(status)) > 0))`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX hotel_room_type_pkey ON public.hotel_room_type USING btree (id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('hotel_room_type.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('hotel_room_type.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('hotel_room_type.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('hotel_room_type.write'::text)`; WITH CHECK `pawpal_private.has_permission('hotel_room_type.write'::text)`.

### inventory

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `product_variant_id` | uuid | Có |
| `quantity_in_stock` | integer | Có |
| `minimum_stock` | integer | Có |
| `last_updated_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `inventory_minimum_stock_check`: `CHECK ((minimum_stock >= 0))`
- `inventory_pkey`: `PRIMARY KEY (id)`
- `inventory_product_variant_id_fkey`: `FOREIGN KEY (product_variant_id) REFERENCES product_variant(id) DEFERRABLE`
- `inventory_product_variant_id_key`: `UNIQUE (product_variant_id)`
- `inventory_quantity_in_stock_check`: `CHECK ((quantity_in_stock >= 0))`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX inventory_pkey ON public.inventory USING btree (id)`
- `CREATE UNIQUE INDEX inventory_product_variant_id_key ON public.inventory USING btree (product_variant_id)`
- `CREATE INDEX v1fk_d08008431c5e4bacd3 ON public.inventory USING btree (product_variant_id)`

Chính sách RLS:

- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('inventory.read'::text)`; WITH CHECK `—`.

### inventory_transaction

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `product_variant_id` | uuid | Có |
| `transaction_type` | text | Có |
| `quantity` | integer | Có |
| `note` | text | Không |
| `staff_id` | uuid | Không |
| `created_at` | timestamp with time zone | Có |
| `purchase_order_detail_id` | uuid | Không |
| `sales_order_detail_id` | uuid | Không |
| `return_request_detail_id` | uuid | Không |
| `idempotency_key` | text | Có |
| `recorded_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `inventory_transaction_idempotency_key_check`: `CHECK ((length(btrim(idempotency_key)) > 0))`
- `inventory_transaction_idempotency_key_key`: `UNIQUE (idempotency_key)`
- `inventory_transaction_pkey`: `PRIMARY KEY (id)`
- `inventory_transaction_product_variant_id_fkey`: `FOREIGN KEY (product_variant_id) REFERENCES product_variant(id) DEFERRABLE`
- `inventory_transaction_purchase_order_detail_id_fkey`: `FOREIGN KEY (purchase_order_detail_id) REFERENCES purchase_order_detail(id) DEFERRABLE`
- `inventory_transaction_quantity_check`: `CHECK ((quantity <> 0))`
- `inventory_transaction_return_request_detail_id_fkey`: `FOREIGN KEY (return_request_detail_id) REFERENCES return_request_detail(id) DEFERRABLE`
- `inventory_transaction_sales_order_detail_id_fkey`: `FOREIGN KEY (sales_order_detail_id) REFERENCES sales_order_detail(id) DEFERRABLE`
- `inventory_transaction_staff_id_fkey`: `FOREIGN KEY (staff_id) REFERENCES staff(id) DEFERRABLE`
- `inventory_transaction_transaction_type_check`: `CHECK ((length(btrim(transaction_type)) > 0))`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX inventory_transaction_idempotency_key_key ON public.inventory_transaction USING btree (idempotency_key)`
- `CREATE UNIQUE INDEX inventory_transaction_pkey ON public.inventory_transaction USING btree (id)`
- `CREATE INDEX v1fk_16c2e67ddcdce27494 ON public.inventory_transaction USING btree (sales_order_detail_id)`
- `CREATE INDEX v1fk_18c9e4896a2aa34412 ON public.inventory_transaction USING btree (purchase_order_detail_id)`
- `CREATE INDEX v1fk_1cc8d047b6b53075e9 ON public.inventory_transaction USING btree (return_request_detail_id)`
- `CREATE INDEX v1fk_686cf19daae68e3af0 ON public.inventory_transaction USING btree (staff_id)`
- `CREATE INDEX v1fk_dce2adf55fe5957d03 ON public.inventory_transaction USING btree (product_variant_id)`

Chính sách RLS:

- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('inventory_transaction.read'::text)`; WITH CHECK `—`.

### membership_tier

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `tier_name` | text | Có |
| `minimum_expenditure` | numeric(18,4) | Có |
| `discount_percent` | numeric(18,4) | Có |
| `description` | text | Không |
| `is_active` | boolean | Có |
| `created_at` | timestamp with time zone | Có |
| `updated_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `membership_tier_discount_percent_check`: `CHECK ((discount_percent >= (0)::numeric))`
- `membership_tier_discount_percent_check1`: `CHECK ((discount_percent <= (100)::numeric))`
- `membership_tier_minimum_expenditure_check`: `CHECK ((minimum_expenditure >= (0)::numeric))`
- `membership_tier_pkey`: `PRIMARY KEY (id)`
- `membership_tier_tier_name_check`: `CHECK ((length(btrim(tier_name)) > 0))`
- `membership_tier_tier_name_key`: `UNIQUE (tier_name)`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX membership_tier_pkey ON public.membership_tier USING btree (id)`
- `CREATE UNIQUE INDEX membership_tier_tier_name_key ON public.membership_tier USING btree (tier_name)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('membership_tier.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('membership_tier.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('membership_tier.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('membership_tier.write'::text)`; WITH CHECK `pawpal_private.has_permission('membership_tier.write'::text)`.

### notification

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `customer_id` | uuid | Có |
| `notification_type` | text | Có |
| `title` | text | Có |
| `content` | text | Có |
| `sales_order_id` | uuid | Không |
| `appointment_id` | uuid | Không |
| `support_ticket_id` | uuid | Không |
| `refund_transaction_id` | uuid | Không |
| `sent_at` | timestamp with time zone | Có |
| `read_at` | timestamp with time zone | Không |

Khóa và CHECK:

- `notification_appointment_id_fkey`: `FOREIGN KEY (appointment_id) REFERENCES appointment(id) DEFERRABLE`
- `notification_customer_id_fkey`: `FOREIGN KEY (customer_id) REFERENCES customer(id) DEFERRABLE`
- `notification_notification_type_check`: `CHECK ((length(btrim(notification_type)) > 0))`
- `notification_pkey`: `PRIMARY KEY (id)`
- `notification_refund_transaction_id_fkey`: `FOREIGN KEY (refund_transaction_id) REFERENCES refund_transaction(id) DEFERRABLE`
- `notification_sales_order_id_fkey`: `FOREIGN KEY (sales_order_id) REFERENCES sales_order(id) DEFERRABLE`
- `notification_support_ticket_id_fkey`: `FOREIGN KEY (support_ticket_id) REFERENCES support_ticket(id) DEFERRABLE`
- `notification_title_check`: `CHECK ((length(btrim(title)) > 0))`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX notification_pkey ON public.notification USING btree (id)`
- `CREATE INDEX v1fk_322ccd86430d20d6da ON public.notification USING btree (refund_transaction_id)`
- `CREATE INDEX v1fk_74a8da5499aae51e5a ON public.notification USING btree (sales_order_id)`
- `CREATE INDEX v1fk_9f7eece0ba38084ea7 ON public.notification USING btree (customer_id)`
- `CREATE INDEX v1fk_a4d2325c3bfe033486 ON public.notification USING btree (support_ticket_id)`
- `CREATE INDEX v1fk_fdf682c71e4152a7d7 ON public.notification USING btree (appointment_id)`

Chính sách RLS:

- `own_customer`: SELECT, roles=authenticated; USING `pawpal_private.owns_customer(customer_id)`; WITH CHECK `—`.
- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('notification.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('notification.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('notification.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('notification.write'::text)`; WITH CHECK `pawpal_private.has_permission('notification.write'::text)`.

### paw_point_transaction

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `customer_id` | uuid | Có |
| `payment_id` | uuid | Không |
| `review_id` | uuid | Không |
| `reward_rule_id` | uuid | Không |
| `points` | integer | Có |
| `description` | text | Không |
| `created_at` | timestamp with time zone | Có |
| `refund_transaction_id` | uuid | Không |
| `voucher_redemption_id` | uuid | Không |
| `customer_voucher_id` | uuid | Không |
| `idempotency_key` | text | Có |
| `sequence_no` | bigint | Có |

Khóa và CHECK:

- `paw_point_transaction_customer_id_fkey`: `FOREIGN KEY (customer_id) REFERENCES customer(id) DEFERRABLE`
- `paw_point_transaction_customer_id_sequence_no_key`: `UNIQUE (customer_id, sequence_no)`
- `paw_point_transaction_customer_voucher_id_fkey`: `FOREIGN KEY (customer_voucher_id) REFERENCES customer_voucher(id) DEFERRABLE`
- `paw_point_transaction_idempotency_key_check`: `CHECK ((length(btrim(idempotency_key)) > 0))`
- `paw_point_transaction_idempotency_key_key`: `UNIQUE (idempotency_key)`
- `paw_point_transaction_payment_id_fkey`: `FOREIGN KEY (payment_id) REFERENCES payment(id) DEFERRABLE`
- `paw_point_transaction_pkey`: `PRIMARY KEY (id)`
- `paw_point_transaction_refund_transaction_id_fkey`: `FOREIGN KEY (refund_transaction_id) REFERENCES refund_transaction(id) DEFERRABLE`
- `paw_point_transaction_review_id_fkey`: `FOREIGN KEY (review_id) REFERENCES review(id) DEFERRABLE`
- `paw_point_transaction_reward_rule_id_fkey`: `FOREIGN KEY (reward_rule_id) REFERENCES reward_rule(id) DEFERRABLE`
- `paw_point_transaction_sequence_no_check`: `CHECK ((sequence_no >= 0))`
- `paw_point_transaction_voucher_redemption_id_fkey`: `FOREIGN KEY (voucher_redemption_id) REFERENCES voucher_redemption(id) DEFERRABLE`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX paw_point_transaction_customer_id_sequence_no_key ON public.paw_point_transaction USING btree (customer_id, sequence_no)`
- `CREATE UNIQUE INDEX paw_point_transaction_idempotency_key_key ON public.paw_point_transaction USING btree (idempotency_key)`
- `CREATE UNIQUE INDEX paw_point_transaction_pkey ON public.paw_point_transaction USING btree (id)`
- `CREATE INDEX v1fk_12ffe73197c4691238 ON public.paw_point_transaction USING btree (voucher_redemption_id)`
- `CREATE INDEX v1fk_347d934e0d972b4114 ON public.paw_point_transaction USING btree (payment_id)`
- `CREATE INDEX v1fk_464c6773db186e4299 ON public.paw_point_transaction USING btree (refund_transaction_id)`
- `CREATE INDEX v1fk_64f7026b29777a0560 ON public.paw_point_transaction USING btree (customer_voucher_id)`
- `CREATE INDEX v1fk_852db3927afc56322f ON public.paw_point_transaction USING btree (customer_id)`
- `CREATE INDEX v1fk_af273a8969f8a0bcb8 ON public.paw_point_transaction USING btree (review_id)`
- `CREATE INDEX v1fk_e28e44706bd1276a10 ON public.paw_point_transaction USING btree (reward_rule_id)`

Chính sách RLS:

- `own_customer`: SELECT, roles=authenticated; USING `pawpal_private.owns_customer(customer_id)`; WITH CHECK `—`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('paw_point_transaction.read'::text)`; WITH CHECK `—`.

### pawpal_setting

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `setting_key` | text | Có |
| `setting_value` | text | Có |
| `setting_type` | text | Có |
| `description` | text | Không |
| `created_at` | timestamp with time zone | Có |
| `updated_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `pawpal_setting_pkey`: `PRIMARY KEY (id)`
- `pawpal_setting_setting_key_check`: `CHECK ((length(btrim(setting_key)) > 0))`
- `pawpal_setting_setting_key_key`: `UNIQUE (setting_key)`
- `pawpal_setting_setting_type_check`: `CHECK ((length(btrim(setting_type)) > 0))`
- `pawpal_setting_setting_value_check`: `CHECK ((length(btrim(setting_value)) > 0))`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX pawpal_setting_pkey ON public.pawpal_setting USING btree (id)`
- `CREATE UNIQUE INDEX pawpal_setting_setting_key_key ON public.pawpal_setting USING btree (setting_key)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('pawpal_setting.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('pawpal_setting.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('pawpal_setting.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('pawpal_setting.write'::text)`; WITH CHECK `pawpal_private.has_permission('pawpal_setting.write'::text)`.

### payment

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `payment_code` | text | Có |
| `customer_id` | uuid | Có |
| `payment_method_config_id` | uuid | Có |
| `payment_type` | text | Có |
| `amount` | numeric(18,4) | Có |
| `transaction_status` | text | Có |
| `succeeded_at` | timestamp with time zone | Không |
| `created_at` | timestamp with time zone | Có |
| `updated_at` | timestamp with time zone | Có |
| `gateway_transaction_id` | text | Không |
| `idempotency_key` | text | Có |
| `order_id` | uuid | Không |
| `appointment_id` | uuid | Không |
| `eligible_spend_amount` | numeric(18,4) | Có |

Khóa và CHECK:

- `payment_amount_check`: `CHECK ((amount >= (0)::numeric))`
- `payment_amount_check1`: `CHECK ((amount > (0)::numeric))`
- `payment_appointment_id_fkey`: `FOREIGN KEY (appointment_id) REFERENCES appointment(id) DEFERRABLE`
- `payment_check`: `CHECK ((num_nonnulls(order_id, appointment_id) = 1))`
- `payment_check1`: `CHECK ((eligible_spend_amount <= amount))`
- `payment_check2`: `CHECK (((transaction_status = 'succeeded'::text) = (succeeded_at IS NOT NULL)))`
- `payment_check3`: `CHECK (((transaction_status = 'succeeded'::text) OR (eligible_spend_amount = (0)::numeric)))`
- `payment_customer_id_fkey`: `FOREIGN KEY (customer_id) REFERENCES customer(id) DEFERRABLE`
- `payment_eligible_spend_amount_check`: `CHECK ((eligible_spend_amount >= (0)::numeric))`
- `payment_idempotency_key_check`: `CHECK ((length(btrim(idempotency_key)) > 0))`
- `payment_idempotency_key_key`: `UNIQUE (idempotency_key)`
- `payment_order_id_fkey`: `FOREIGN KEY (order_id) REFERENCES sales_order(id) DEFERRABLE`
- `payment_payment_code_check`: `CHECK ((length(btrim(payment_code)) > 0))`
- `payment_payment_code_key`: `UNIQUE (payment_code)`
- `payment_payment_method_config_id_fkey`: `FOREIGN KEY (payment_method_config_id) REFERENCES payment_method_config(id) DEFERRABLE`
- `payment_payment_type_check`: `CHECK ((length(btrim(payment_type)) > 0))`
- `payment_pkey`: `PRIMARY KEY (id)`
- `payment_transaction_status_check`: `CHECK ((length(btrim(transaction_status)) > 0))`
- `payment_transaction_status_check1`: `CHECK ((transaction_status = ANY (ARRAY['pending'::text, 'succeeded'::text, 'failed'::text, 'cancelled'::text])))`
- `v1_money_check`: `TRIGGER DEFERRABLE INITIALLY DEFERRED`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX payment_idempotency_key_key ON public.payment USING btree (idempotency_key)`
- `CREATE UNIQUE INDEX payment_payment_code_key ON public.payment USING btree (payment_code)`
- `CREATE UNIQUE INDEX payment_pkey ON public.payment USING btree (id)`
- `CREATE INDEX v1fk_0831f9316c3bc262c6 ON public.payment USING btree (payment_method_config_id)`
- `CREATE INDEX v1fk_2494d3ddf9ba98b38a ON public.payment USING btree (customer_id)`
- `CREATE INDEX v1fk_cffd5f257141f1c185 ON public.payment USING btree (appointment_id)`
- `CREATE INDEX v1fk_e3f445a136d7d059a9 ON public.payment USING btree (order_id)`

Chính sách RLS:

- `own_customer`: SELECT, roles=authenticated; USING `pawpal_private.owns_customer(customer_id)`; WITH CHECK `—`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('payment.read'::text)`; WITH CHECK `—`.

### payment_method_config

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `name` | text | Có |
| `short_name` | text | Không |
| `description` | text | Không |
| `icon` | text | Không |
| `fee` | numeric(18,4) | Có |
| `available` | boolean | Có |
| `requires_info` | boolean | Có |
| `redirect_url` | text | Không |
| `bank_info` | jsonb | Không |
| `created_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `payment_method_config_fee_check`: `CHECK ((fee >= (0)::numeric))`
- `payment_method_config_name_check`: `CHECK ((length(btrim(name)) > 0))`
- `payment_method_config_pkey`: `PRIMARY KEY (id)`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX payment_method_config_pkey ON public.payment_method_config USING btree (id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('payment_method_config.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('payment_method_config.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('payment_method_config.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('payment_method_config.write'::text)`; WITH CHECK `pawpal_private.has_permission('payment_method_config.write'::text)`.

### permission

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `code` | text | Có |
| `description` | text | Có |

Khóa và CHECK:

- `permission_code_check`: `CHECK ((length(btrim(code)) > 0))`
- `permission_pkey`: `PRIMARY KEY (code)`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX permission_pkey ON public.permission USING btree (code)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('permission.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('permission.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('permission.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('permission.write'::text)`; WITH CHECK `pawpal_private.has_permission('permission.write'::text)`.

### pet_breed

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `species_id` | uuid | Có |
| `breed_name` | text | Có |
| `is_active` | boolean | Có |
| `created_at` | timestamp with time zone | Có |
| `updated_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `pet_breed_breed_name_check`: `CHECK ((length(btrim(breed_name)) > 0))`
- `pet_breed_pkey`: `PRIMARY KEY (id)`
- `pet_breed_species_id_breed_name_key`: `UNIQUE (species_id, breed_name)`
- `pet_breed_species_id_fkey`: `FOREIGN KEY (species_id) REFERENCES pet_species(id) DEFERRABLE`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX pet_breed_pkey ON public.pet_breed USING btree (id)`
- `CREATE UNIQUE INDEX pet_breed_species_id_breed_name_key ON public.pet_breed USING btree (species_id, breed_name)`
- `CREATE INDEX v1fk_7c6c36d32dbb90c1f4 ON public.pet_breed USING btree (species_id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('pet_breed.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('pet_breed.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('pet_breed.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('pet_breed.write'::text)`; WITH CHECK `pawpal_private.has_permission('pet_breed.write'::text)`.

### pet_profile

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `customer_id` | uuid | Có |
| `pet_code` | text | Có |
| `pet_name` | text | Có |
| `avatar_url` | text | Không |
| `gender` | text | Không |
| `date_of_birth` | date | Không |
| `color` | text | Không |
| `routine` | text | Không |
| `allergy` | text | Không |
| `status` | text | Có |
| `created_at` | timestamp with time zone | Có |
| `updated_at` | timestamp with time zone | Có |
| `breed_id` | uuid | Có |
| `safety_note` | text | Không |

Khóa và CHECK:

- `pet_profile_breed_id_fkey`: `FOREIGN KEY (breed_id) REFERENCES pet_breed(id) DEFERRABLE`
- `pet_profile_customer_id_fkey`: `FOREIGN KEY (customer_id) REFERENCES customer(id) DEFERRABLE`
- `pet_profile_date_of_birth_check`: `CHECK ((date_of_birth <= CURRENT_DATE))`
- `pet_profile_pet_code_check`: `CHECK ((length(btrim(pet_code)) > 0))`
- `pet_profile_pet_code_key`: `UNIQUE (pet_code)`
- `pet_profile_pet_name_check`: `CHECK ((length(btrim(pet_name)) > 0))`
- `pet_profile_pkey`: `PRIMARY KEY (id)`
- `pet_profile_status_check`: `CHECK ((length(btrim(status)) > 0))`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX pet_profile_pet_code_key ON public.pet_profile USING btree (pet_code)`
- `CREATE UNIQUE INDEX pet_profile_pkey ON public.pet_profile USING btree (id)`
- `CREATE INDEX v1fk_a15c7ef67018e5cdb2 ON public.pet_profile USING btree (breed_id)`
- `CREATE INDEX v1fk_a70f7522e469f44638 ON public.pet_profile USING btree (customer_id)`

Chính sách RLS:

- `own_customer`: SELECT, roles=authenticated; USING `pawpal_private.owns_customer(customer_id)`; WITH CHECK `—`.
- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('pet_profile.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('pet_profile.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('pet_profile.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('pet_profile.write'::text)`; WITH CHECK `pawpal_private.has_permission('pet_profile.write'::text)`.

### pet_species

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `species_name` | text | Có |
| `is_active` | boolean | Có |
| `created_at` | timestamp with time zone | Có |
| `updated_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `pet_species_pkey`: `PRIMARY KEY (id)`
- `pet_species_species_name_check`: `CHECK ((length(btrim(species_name)) > 0))`
- `pet_species_species_name_key`: `UNIQUE (species_name)`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX pet_species_pkey ON public.pet_species USING btree (id)`
- `CREATE UNIQUE INDEX pet_species_species_name_key ON public.pet_species USING btree (species_name)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('pet_species.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('pet_species.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('pet_species.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('pet_species.write'::text)`; WITH CHECK `pawpal_private.has_permission('pet_species.write'::text)`.

### pet_weight_history

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `pet_id` | uuid | Có |
| `weight` | numeric(18,4) | Có |
| `measured_at` | timestamp with time zone | Có |
| `recorded_by` | uuid | Không |
| `note` | text | Không |
| `created_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `pet_weight_history_measured_at_check`: `CHECK ((measured_at <= now()))`
- `pet_weight_history_pet_id_fkey`: `FOREIGN KEY (pet_id) REFERENCES pet_profile(id) DEFERRABLE`
- `pet_weight_history_pkey`: `PRIMARY KEY (id)`
- `pet_weight_history_recorded_by_fkey`: `FOREIGN KEY (recorded_by) REFERENCES staff(id) DEFERRABLE`
- `pet_weight_history_weight_check`: `CHECK ((weight > (0)::numeric))`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX pet_weight_history_pkey ON public.pet_weight_history USING btree (id)`
- `CREATE INDEX v1fk_5c91a90cb7bc15dc68 ON public.pet_weight_history USING btree (recorded_by)`
- `CREATE INDEX v1fk_d6a357a42230a04608 ON public.pet_weight_history USING btree (pet_id)`

Chính sách RLS:

- `own_weight`: SELECT, roles=authenticated; USING `(EXISTS ( SELECT 1    FROM pet_profile p   WHERE ((p.id = pet_weight_history.pet_id) AND pawpal_private.owns_customer(p.customer_id))))`; WITH CHECK `—`.
- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('pet_weight_history.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('pet_weight_history.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('pet_weight_history.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('pet_weight_history.write'::text)`; WITH CHECK `pawpal_private.has_permission('pet_weight_history.write'::text)`.

### product

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `category_id` | uuid | Có |
| `product_name` | text | Có |
| `unit` | text | Có |
| `target_pet` | text | Không |
| `description` | text | Không |
| `slug` | text | Có |
| `status` | text | Có |
| `created_at` | timestamp with time zone | Có |
| `updated_at` | timestamp with time zone | Có |
| `origin` | text | Không |
| `ingredients` | text | Không |
| `benefits` | text | Không |
| `usage_instructions` | text | Không |
| `specs` | jsonb | Không |
| `badge` | text | Không |
| `brand_name` | text | Không |

Khóa và CHECK:

- `product_category_id_fkey`: `FOREIGN KEY (category_id) REFERENCES product_category(id) DEFERRABLE`
- `product_pkey`: `PRIMARY KEY (id)`
- `product_product_name_check`: `CHECK ((length(btrim(product_name)) > 0))`
- `product_slug_check`: `CHECK ((length(btrim(slug)) > 0))`
- `product_slug_key`: `UNIQUE (slug)`
- `product_status_check`: `CHECK ((length(btrim(status)) > 0))`
- `product_unit_check`: `CHECK ((length(btrim(unit)) > 0))`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX product_pkey ON public.product USING btree (id)`
- `CREATE UNIQUE INDEX product_slug_key ON public.product USING btree (slug)`
- `CREATE INDEX v1fk_41a15750e43fed493c ON public.product USING btree (category_id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('product.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('product.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('product.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('product.write'::text)`; WITH CHECK `pawpal_private.has_permission('product.write'::text)`.

### product_category

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `category_name` | text | Có |
| `description` | text | Không |
| `status` | text | Có |
| `created_at` | timestamp with time zone | Có |
| `updated_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `product_category_category_name_check`: `CHECK ((length(btrim(category_name)) > 0))`
- `product_category_pkey`: `PRIMARY KEY (id)`
- `product_category_status_check`: `CHECK ((length(btrim(status)) > 0))`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX product_category_pkey ON public.product_category USING btree (id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('product_category.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('product_category.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('product_category.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('product_category.write'::text)`; WITH CHECK `pawpal_private.has_permission('product_category.write'::text)`.

### product_media

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `product_id` | uuid | Có |
| `image_url` | text | Có |
| `display_order` | integer | Có |
| `is_thumbnail` | boolean | Có |
| `created_at` | timestamp with time zone | Có |
| `updated_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `product_media_display_order_check`: `CHECK ((display_order >= 0))`
- `product_media_image_url_check`: `CHECK ((length(btrim(image_url)) > 0))`
- `product_media_pkey`: `PRIMARY KEY (id)`
- `product_media_product_id_fkey`: `FOREIGN KEY (product_id) REFERENCES product(id) DEFERRABLE`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX product_media_pkey ON public.product_media USING btree (id)`
- `CREATE UNIQUE INDEX product_media_product_id_idx ON public.product_media USING btree (product_id) WHERE is_thumbnail`
- `CREATE INDEX v1fk_1580ee60104548952c ON public.product_media USING btree (product_id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('product_media.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('product_media.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('product_media.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('product_media.write'::text)`; WITH CHECK `pawpal_private.has_permission('product_media.write'::text)`.

### product_variant

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `product_id` | uuid | Có |
| `color_id` | uuid | Không |
| `size_id` | uuid | Không |
| `flavor_id` | uuid | Không |
| `sku_variant` | text | Có |
| `cost_price` | numeric(18,4) | Có |
| `sale_price` | numeric(18,4) | Có |
| `compare_at_price` | numeric(18,4) | Không |
| `weight` | numeric(18,4) | Không |
| `barcode` | text | Không |
| `status` | text | Có |
| `created_at` | timestamp with time zone | Có |
| `updated_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `product_variant_barcode_key`: `UNIQUE (barcode)`
- `product_variant_color_id_fkey`: `FOREIGN KEY (color_id) REFERENCES variant_color(id) DEFERRABLE`
- `product_variant_compare_at_price_check`: `CHECK ((compare_at_price >= (0)::numeric))`
- `product_variant_cost_price_check`: `CHECK ((cost_price >= (0)::numeric))`
- `product_variant_flavor_id_fkey`: `FOREIGN KEY (flavor_id) REFERENCES variant_flavor(id) DEFERRABLE`
- `product_variant_pkey`: `PRIMARY KEY (id)`
- `product_variant_product_id_color_id_size_id_flavor_id_key`: `UNIQUE NULLS NOT DISTINCT (product_id, color_id, size_id, flavor_id)`
- `product_variant_product_id_fkey`: `FOREIGN KEY (product_id) REFERENCES product(id) DEFERRABLE`
- `product_variant_sale_price_check`: `CHECK ((sale_price >= (0)::numeric))`
- `product_variant_size_id_fkey`: `FOREIGN KEY (size_id) REFERENCES variant_size(id) DEFERRABLE`
- `product_variant_sku_variant_check`: `CHECK ((length(btrim(sku_variant)) > 0))`
- `product_variant_sku_variant_key`: `UNIQUE (sku_variant)`
- `product_variant_status_check`: `CHECK ((length(btrim(status)) > 0))`
- `product_variant_weight_check`: `CHECK ((weight >= (0)::numeric))`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX product_variant_barcode_key ON public.product_variant USING btree (barcode)`
- `CREATE UNIQUE INDEX product_variant_pkey ON public.product_variant USING btree (id)`
- `CREATE UNIQUE INDEX product_variant_product_id_color_id_size_id_flavor_id_key ON public.product_variant USING btree (product_id, color_id, size_id, flavor_id) NULLS NOT DISTINCT`
- `CREATE UNIQUE INDEX product_variant_sku_variant_key ON public.product_variant USING btree (sku_variant)`
- `CREATE INDEX v1fk_1bc0c31a53f5aefc0d ON public.product_variant USING btree (product_id)`
- `CREATE INDEX v1fk_3f89dd40a5a8f789ab ON public.product_variant USING btree (color_id)`
- `CREATE INDEX v1fk_72b3e74a7bb953700b ON public.product_variant USING btree (flavor_id)`
- `CREATE INDEX v1fk_be21c5b05474ed23d0 ON public.product_variant USING btree (size_id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('product_variant.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('product_variant.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('product_variant.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('product_variant.write'::text)`; WITH CHECK `pawpal_private.has_permission('product_variant.write'::text)`.

### product_variant_media

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `product_variant_id` | uuid | Có |
| `image_url` | text | Có |
| `display_order` | integer | Có |
| `is_thumbnail` | boolean | Có |
| `created_at` | timestamp with time zone | Có |
| `updated_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `product_variant_media_display_order_check`: `CHECK ((display_order >= 0))`
- `product_variant_media_image_url_check`: `CHECK ((length(btrim(image_url)) > 0))`
- `product_variant_media_pkey`: `PRIMARY KEY (id)`
- `product_variant_media_product_variant_id_fkey`: `FOREIGN KEY (product_variant_id) REFERENCES product_variant(id) DEFERRABLE`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX product_variant_media_pkey ON public.product_variant_media USING btree (id)`
- `CREATE UNIQUE INDEX product_variant_media_product_variant_id_idx ON public.product_variant_media USING btree (product_variant_id) WHERE is_thumbnail`
- `CREATE INDEX v1fk_f9ce17cc95fb61e2dd ON public.product_variant_media USING btree (product_variant_id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('product_variant_media.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('product_variant_media.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('product_variant_media.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('product_variant_media.write'::text)`; WITH CHECK `pawpal_private.has_permission('product_variant_media.write'::text)`.

### promotion

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `promotion_name` | text | Có |
| `description` | text | Không |
| `discount_type` | text | Có |
| `discount_value` | numeric(18,4) | Có |
| `start_date` | date | Có |
| `end_date` | date | Có |
| `minimum_order_value` | numeric(18,4) | Có |
| `status` | text | Có |
| `created_at` | timestamp with time zone | Có |
| `updated_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `promotion_check`: `CHECK ((end_date >= start_date))`
- `promotion_check1`: `CHECK (((discount_type <> 'percent'::text) OR (discount_value <= (100)::numeric)))`
- `promotion_discount_type_check`: `CHECK ((length(btrim(discount_type)) > 0))`
- `promotion_discount_value_check`: `CHECK ((discount_value >= (0)::numeric))`
- `promotion_minimum_order_value_check`: `CHECK ((minimum_order_value >= (0)::numeric))`
- `promotion_pkey`: `PRIMARY KEY (id)`
- `promotion_promotion_name_check`: `CHECK ((length(btrim(promotion_name)) > 0))`
- `promotion_status_check`: `CHECK ((length(btrim(status)) > 0))`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX promotion_pkey ON public.promotion USING btree (id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('promotion.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('promotion.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('promotion.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('promotion.write'::text)`; WITH CHECK `pawpal_private.has_permission('promotion.write'::text)`.

### promotion_product

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `promotion_id` | uuid | Có |
| `product_variant_id` | uuid | Có |

Khóa và CHECK:

- `promotion_product_pkey`: `PRIMARY KEY (id)`
- `promotion_product_product_variant_id_fkey`: `FOREIGN KEY (product_variant_id) REFERENCES product_variant(id) DEFERRABLE`
- `promotion_product_promotion_id_fkey`: `FOREIGN KEY (promotion_id) REFERENCES promotion(id) DEFERRABLE`
- `promotion_product_promotion_id_product_variant_id_key`: `UNIQUE (promotion_id, product_variant_id)`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX promotion_product_pkey ON public.promotion_product USING btree (id)`
- `CREATE UNIQUE INDEX promotion_product_promotion_id_product_variant_id_key ON public.promotion_product USING btree (promotion_id, product_variant_id)`
- `CREATE INDEX v1fk_d2022f8d35b796f485 ON public.promotion_product USING btree (product_variant_id)`
- `CREATE INDEX v1fk_f20439c3df0cc92809 ON public.promotion_product USING btree (promotion_id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('promotion_product.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('promotion_product.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('promotion_product.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('promotion_product.write'::text)`; WITH CHECK `pawpal_private.has_permission('promotion_product.write'::text)`.

### promotion_service

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `promotion_id` | uuid | Có |
| `service_id` | uuid | Có |

Khóa và CHECK:

- `promotion_service_pkey`: `PRIMARY KEY (id)`
- `promotion_service_promotion_id_fkey`: `FOREIGN KEY (promotion_id) REFERENCES promotion(id) DEFERRABLE`
- `promotion_service_promotion_id_service_id_key`: `UNIQUE (promotion_id, service_id)`
- `promotion_service_service_id_fkey`: `FOREIGN KEY (service_id) REFERENCES service(id) DEFERRABLE`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX promotion_service_pkey ON public.promotion_service USING btree (id)`
- `CREATE UNIQUE INDEX promotion_service_promotion_id_service_id_key ON public.promotion_service USING btree (promotion_id, service_id)`
- `CREATE INDEX v1fk_38002640128445f0be ON public.promotion_service USING btree (service_id)`
- `CREATE INDEX v1fk_f7847c811b92d40a9a ON public.promotion_service USING btree (promotion_id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('promotion_service.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('promotion_service.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('promotion_service.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('promotion_service.write'::text)`; WITH CHECK `pawpal_private.has_permission('promotion_service.write'::text)`.

### purchase_order

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `supplier_id` | uuid | Có |
| `order_number` | text | Có |
| `order_date` | date | Có |
| `expected_date` | date | Không |
| `order_status` | text | Có |
| `note` | text | Không |
| `created_at` | timestamp with time zone | Có |
| `updated_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `purchase_order_order_number_check`: `CHECK ((length(btrim(order_number)) > 0))`
- `purchase_order_order_number_key`: `UNIQUE (order_number)`
- `purchase_order_order_status_check`: `CHECK ((length(btrim(order_status)) > 0))`
- `purchase_order_pkey`: `PRIMARY KEY (id)`
- `purchase_order_supplier_id_fkey`: `FOREIGN KEY (supplier_id) REFERENCES supplier(id) DEFERRABLE`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX purchase_order_order_number_key ON public.purchase_order USING btree (order_number)`
- `CREATE UNIQUE INDEX purchase_order_pkey ON public.purchase_order USING btree (id)`
- `CREATE INDEX v1fk_84199f41f3a3978770 ON public.purchase_order USING btree (supplier_id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('purchase_order.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('purchase_order.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('purchase_order.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('purchase_order.write'::text)`; WITH CHECK `pawpal_private.has_permission('purchase_order.write'::text)`.

### purchase_order_detail

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `purchase_order_id` | uuid | Có |
| `product_variant_id` | uuid | Có |
| `quantity` | integer | Có |
| `unit_price` | numeric(18,4) | Có |

Khóa và CHECK:

- `purchase_order_detail_pkey`: `PRIMARY KEY (id)`
- `purchase_order_detail_product_variant_id_fkey`: `FOREIGN KEY (product_variant_id) REFERENCES product_variant(id) DEFERRABLE`
- `purchase_order_detail_purchase_order_id_fkey`: `FOREIGN KEY (purchase_order_id) REFERENCES purchase_order(id) DEFERRABLE`
- `purchase_order_detail_quantity_check`: `CHECK ((quantity > 0))`
- `purchase_order_detail_unit_price_check`: `CHECK ((unit_price >= (0)::numeric))`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX purchase_order_detail_pkey ON public.purchase_order_detail USING btree (id)`
- `CREATE INDEX v1fk_e6aff8dab00029a711 ON public.purchase_order_detail USING btree (purchase_order_id)`
- `CREATE INDEX v1fk_f3a6f2a1a0135e8680 ON public.purchase_order_detail USING btree (product_variant_id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('purchase_order_detail.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('purchase_order_detail.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('purchase_order_detail.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('purchase_order_detail.write'::text)`; WITH CHECK `pawpal_private.has_permission('purchase_order_detail.write'::text)`.

### refund_transaction

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `refund_code` | text | Có |
| `ticket_id` | uuid | Không |
| `payment_id` | uuid | Có |
| `refund_type` | text | Có |
| `requested_amount` | numeric(18,4) | Có |
| `approved_amount` | numeric(18,4) | Có |
| `refunded_amount` | numeric(18,4) | Có |
| `refund_method` | text | Có |
| `refund_status` | text | Có |
| `gateway_transaction_id` | text | Không |
| `note` | text | Không |
| `processed_by` | uuid | Không |
| `processed_at` | timestamp with time zone | Không |
| `completed_at` | timestamp with time zone | Không |
| `created_at` | timestamp with time zone | Có |
| `updated_at` | timestamp with time zone | Có |
| `return_request_id` | uuid | Không |
| `eligible_refund_amount` | numeric(18,4) | Có |

Khóa và CHECK:

- `refund_transaction_approved_amount_check`: `CHECK ((approved_amount >= (0)::numeric))`
- `refund_transaction_check`: `CHECK ((eligible_refund_amount <= refunded_amount))`
- `refund_transaction_check1`: `CHECK ((refunded_amount <= approved_amount))`
- `refund_transaction_check2`: `CHECK ((approved_amount <= requested_amount))`
- `refund_transaction_check3`: `CHECK (((refund_status = 'succeeded'::text) = (completed_at IS NOT NULL)))`
- `refund_transaction_check4`: `CHECK (((refund_status = 'succeeded'::text) OR (eligible_refund_amount = (0)::numeric)))`
- `refund_transaction_eligible_refund_amount_check`: `CHECK ((eligible_refund_amount >= (0)::numeric))`
- `refund_transaction_payment_id_fkey`: `FOREIGN KEY (payment_id) REFERENCES payment(id) DEFERRABLE`
- `refund_transaction_pkey`: `PRIMARY KEY (id)`
- `refund_transaction_processed_by_fkey`: `FOREIGN KEY (processed_by) REFERENCES staff(id) DEFERRABLE`
- `refund_transaction_refund_code_check`: `CHECK ((length(btrim(refund_code)) > 0))`
- `refund_transaction_refund_code_key`: `UNIQUE (refund_code)`
- `refund_transaction_refund_method_check`: `CHECK ((length(btrim(refund_method)) > 0))`
- `refund_transaction_refund_status_check`: `CHECK ((length(btrim(refund_status)) > 0))`
- `refund_transaction_refund_status_check1`: `CHECK ((refund_status = ANY (ARRAY['pending'::text, 'approved'::text, 'succeeded'::text, 'failed'::text, 'cancelled'::text])))`
- `refund_transaction_refund_type_check`: `CHECK ((length(btrim(refund_type)) > 0))`
- `refund_transaction_refunded_amount_check`: `CHECK ((refunded_amount >= (0)::numeric))`
- `refund_transaction_requested_amount_check`: `CHECK ((requested_amount >= (0)::numeric))`
- `refund_transaction_return_request_id_fkey`: `FOREIGN KEY (return_request_id) REFERENCES return_request(id) DEFERRABLE`
- `refund_transaction_ticket_id_fkey`: `FOREIGN KEY (ticket_id) REFERENCES support_ticket(id) DEFERRABLE`
- `v1_money_check`: `TRIGGER DEFERRABLE INITIALLY DEFERRED`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX refund_transaction_pkey ON public.refund_transaction USING btree (id)`
- `CREATE UNIQUE INDEX refund_transaction_refund_code_key ON public.refund_transaction USING btree (refund_code)`
- `CREATE INDEX v1fk_0a2228678d7254814c ON public.refund_transaction USING btree (payment_id)`
- `CREATE INDEX v1fk_0bf022973af3a548f5 ON public.refund_transaction USING btree (ticket_id)`
- `CREATE INDEX v1fk_70a3f93a8827800e6f ON public.refund_transaction USING btree (processed_by)`
- `CREATE INDEX v1fk_ec02684b6b657449d7 ON public.refund_transaction USING btree (return_request_id)`

Chính sách RLS:

- `own_refund`: SELECT, roles=authenticated; USING `(EXISTS ( SELECT 1    FROM payment p   WHERE ((p.id = refund_transaction.payment_id) AND pawpal_private.owns_customer(p.customer_id))))`; WITH CHECK `—`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('refund_transaction.read'::text)`; WITH CHECK `—`.

### return_request

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `sales_order_id` | uuid | Có |
| `resolution_type` | text | Không |
| `resolved_by` | uuid | Không |
| `reason` | text | Có |
| `return_type` | text | Có |
| `description` | text | Không |
| `request_status` | text | Có |
| `created_at` | timestamp with time zone | Có |
| `updated_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `return_request_pkey`: `PRIMARY KEY (id)`
- `return_request_reason_check`: `CHECK ((length(btrim(reason)) > 0))`
- `return_request_request_status_check`: `CHECK ((length(btrim(request_status)) > 0))`
- `return_request_resolved_by_fkey`: `FOREIGN KEY (resolved_by) REFERENCES staff(id) DEFERRABLE`
- `return_request_return_type_check`: `CHECK ((length(btrim(return_type)) > 0))`
- `return_request_sales_order_id_fkey`: `FOREIGN KEY (sales_order_id) REFERENCES sales_order(id) DEFERRABLE`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX return_request_pkey ON public.return_request USING btree (id)`
- `CREATE INDEX v1fk_96849320a7f02d4831 ON public.return_request USING btree (sales_order_id)`
- `CREATE INDEX v1fk_b2c805b6b927e88f08 ON public.return_request USING btree (resolved_by)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('return_request.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('return_request.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('return_request.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('return_request.write'::text)`; WITH CHECK `pawpal_private.has_permission('return_request.write'::text)`.

### return_request_detail

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `return_request_id` | uuid | Có |
| `quantity` | integer | Có |
| `sales_order_detail_id` | uuid | Có |

Khóa và CHECK:

- `return_request_detail_pkey`: `PRIMARY KEY (id)`
- `return_request_detail_quantity_check`: `CHECK ((quantity > 0))`
- `return_request_detail_return_request_id_fkey`: `FOREIGN KEY (return_request_id) REFERENCES return_request(id) DEFERRABLE`
- `return_request_detail_sales_order_detail_id_fkey`: `FOREIGN KEY (sales_order_detail_id) REFERENCES sales_order_detail(id) DEFERRABLE`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX return_request_detail_pkey ON public.return_request_detail USING btree (id)`
- `CREATE INDEX v1fk_80aa9314f6749a86c3 ON public.return_request_detail USING btree (sales_order_detail_id)`
- `CREATE INDEX v1fk_c5166b91c76acb5024 ON public.return_request_detail USING btree (return_request_id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('return_request_detail.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('return_request_detail.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('return_request_detail.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('return_request_detail.write'::text)`; WITH CHECK `pawpal_private.has_permission('return_request_detail.write'::text)`.

### return_request_evidence

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `return_request_id` | uuid | Có |
| `image_url` | text | Có |
| `display_order` | integer | Có |
| `created_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `return_request_evidence_display_order_check`: `CHECK ((display_order >= 0))`
- `return_request_evidence_image_url_check`: `CHECK ((length(btrim(image_url)) > 0))`
- `return_request_evidence_pkey`: `PRIMARY KEY (id)`
- `return_request_evidence_return_request_id_fkey`: `FOREIGN KEY (return_request_id) REFERENCES return_request(id) DEFERRABLE`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX return_request_evidence_pkey ON public.return_request_evidence USING btree (id)`
- `CREATE INDEX v1fk_4bed72250c832d325e ON public.return_request_evidence USING btree (return_request_id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('return_request_evidence.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('return_request_evidence.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('return_request_evidence.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('return_request_evidence.write'::text)`; WITH CHECK `pawpal_private.has_permission('return_request_evidence.write'::text)`.

### review

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `rating` | integer | Có |
| `review_content` | text | Không |
| `review_status` | text | Có |
| `created_at` | timestamp with time zone | Có |
| `updated_at` | timestamp with time zone | Có |
| `sales_order_detail_id` | uuid | Không |
| `appointment_item_id` | uuid | Không |

Khóa và CHECK:

- `review_appointment_item_id_fkey`: `FOREIGN KEY (appointment_item_id) REFERENCES appointment_item(id) DEFERRABLE`
- `review_check`: `CHECK ((num_nonnulls(sales_order_detail_id, appointment_item_id) = 1))`
- `review_pkey`: `PRIMARY KEY (id)`
- `review_rating_check`: `CHECK ((rating >= 0))`
- `review_rating_check1`: `CHECK (((rating >= 1) AND (rating <= 5)))`
- `review_review_status_check`: `CHECK ((length(btrim(review_status)) > 0))`
- `review_sales_order_detail_id_fkey`: `FOREIGN KEY (sales_order_detail_id) REFERENCES sales_order_detail(id) DEFERRABLE`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX review_appointment_item_id_idx ON public.review USING btree (appointment_item_id) WHERE (appointment_item_id IS NOT NULL)`
- `CREATE UNIQUE INDEX review_pkey ON public.review USING btree (id)`
- `CREATE UNIQUE INDEX review_sales_order_detail_id_idx ON public.review USING btree (sales_order_detail_id) WHERE (sales_order_detail_id IS NOT NULL)`
- `CREATE INDEX v1fk_0765069b7e4ddce382 ON public.review USING btree (appointment_item_id)`
- `CREATE INDEX v1fk_a994737d34c246f947 ON public.review USING btree (sales_order_detail_id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('review.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('review.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('review.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('review.write'::text)`; WITH CHECK `pawpal_private.has_permission('review.write'::text)`.

### review_media

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `review_id` | uuid | Có |
| `image_url` | text | Có |
| `display_order` | integer | Có |
| `created_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `review_media_display_order_check`: `CHECK ((display_order >= 0))`
- `review_media_image_url_check`: `CHECK ((length(btrim(image_url)) > 0))`
- `review_media_pkey`: `PRIMARY KEY (id)`
- `review_media_review_id_fkey`: `FOREIGN KEY (review_id) REFERENCES review(id) DEFERRABLE`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX review_media_pkey ON public.review_media USING btree (id)`
- `CREATE INDEX v1fk_ca08e4bce4c06cb5a9 ON public.review_media USING btree (review_id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('review_media.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('review_media.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('review_media.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('review_media.write'::text)`; WITH CHECK `pawpal_private.has_permission('review_media.write'::text)`.

### review_response

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `review_id` | uuid | Có |
| `staff_id` | uuid | Có |
| `response_content` | text | Có |
| `created_at` | timestamp with time zone | Có |
| `updated_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `review_response_pkey`: `PRIMARY KEY (id)`
- `review_response_review_id_fkey`: `FOREIGN KEY (review_id) REFERENCES review(id) DEFERRABLE`
- `review_response_staff_id_fkey`: `FOREIGN KEY (staff_id) REFERENCES staff(id) DEFERRABLE`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX review_response_pkey ON public.review_response USING btree (id)`
- `CREATE INDEX v1fk_79eeb049483f304ff3 ON public.review_response USING btree (staff_id)`
- `CREATE INDEX v1fk_dd7ef40045a1a9fae4 ON public.review_response USING btree (review_id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('review_response.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('review_response.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('review_response.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('review_response.write'::text)`; WITH CHECK `pawpal_private.has_permission('review_response.write'::text)`.

### reward_rule

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `rule_name` | text | Có |
| `reward_type` | text | Có |
| `trigger_event` | text | Có |
| `reward_value` | numeric(18,4) | Có |
| `description` | text | Có |
| `is_active` | boolean | Có |
| `created_at` | timestamp with time zone | Có |
| `updated_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `reward_rule_pkey`: `PRIMARY KEY (id)`
- `reward_rule_reward_type_check`: `CHECK ((length(btrim(reward_type)) > 0))`
- `reward_rule_reward_value_check`: `CHECK ((reward_value >= (0)::numeric))`
- `reward_rule_rule_name_check`: `CHECK ((length(btrim(rule_name)) > 0))`
- `reward_rule_trigger_event_check`: `CHECK ((length(btrim(trigger_event)) > 0))`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX reward_rule_pkey ON public.reward_rule USING btree (id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('reward_rule.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('reward_rule.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('reward_rule.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('reward_rule.write'::text)`; WITH CHECK `pawpal_private.has_permission('reward_rule.write'::text)`.

### role_permission

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `role_code` | text | Có |
| `permission_code` | text | Có |

Khóa và CHECK:

- `role_permission_permission_code_check`: `CHECK ((length(btrim(permission_code)) > 0))`
- `role_permission_permission_code_fkey`: `FOREIGN KEY (permission_code) REFERENCES permission(code) DEFERRABLE`
- `role_permission_pkey`: `PRIMARY KEY (role_code, permission_code)`
- `role_permission_role_code_check`: `CHECK ((length(btrim(role_code)) > 0))`
- `role_permission_role_code_fkey`: `FOREIGN KEY (role_code) REFERENCES access_role(code) DEFERRABLE`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX role_permission_pkey ON public.role_permission USING btree (role_code, permission_code)`
- `CREATE INDEX v1fk_4eb610d5883f3e6752 ON public.role_permission USING btree (role_code)`
- `CREATE INDEX v1fk_d690a1fb46a350475a ON public.role_permission USING btree (permission_code)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('role_permission.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('role_permission.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('role_permission.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('role_permission.write'::text)`; WITH CHECK `pawpal_private.has_permission('role_permission.write'::text)`.

### sales_order

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `order_code` | text | Có |
| `customer_id` | uuid | Có |
| `order_status` | text | Có |
| `note` | text | Không |
| `created_at` | timestamp with time zone | Có |
| `updated_at` | timestamp with time zone | Có |
| `shipping_fee_snapshot` | numeric(18,4) | Có |
| `receiver_name_snapshot` | text | Không |
| `receiver_phone_snapshot` | text | Không |
| `province_snapshot` | text | Không |
| `street_address_snapshot` | text | Không |
| `postal_code_snapshot` | text | Không |
| `delivery_option_id` | uuid | Không |
| `shipping_provider_id` | uuid | Không |
| `tracking_code` | text | Không |
| `shipped_at` | timestamp with time zone | Không |
| `delivered_at` | timestamp with time zone | Không |
| `shipping_status` | text | Không |

Khóa và CHECK:

- `sales_order_customer_id_fkey`: `FOREIGN KEY (customer_id) REFERENCES customer(id) DEFERRABLE`
- `sales_order_delivery_option_id_fkey`: `FOREIGN KEY (delivery_option_id) REFERENCES delivery_option_config(id) DEFERRABLE`
- `sales_order_order_code_check`: `CHECK ((length(btrim(order_code)) > 0))`
- `sales_order_order_code_key`: `UNIQUE (order_code)`
- `sales_order_order_status_check`: `CHECK ((length(btrim(order_status)) > 0))`
- `sales_order_pkey`: `PRIMARY KEY (id)`
- `sales_order_shipping_fee_snapshot_check`: `CHECK ((shipping_fee_snapshot >= (0)::numeric))`
- `sales_order_shipping_provider_id_fkey`: `FOREIGN KEY (shipping_provider_id) REFERENCES shipping_provider(id) DEFERRABLE`
- `v1_money_check`: `TRIGGER DEFERRABLE INITIALLY DEFERRED`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX sales_order_order_code_key ON public.sales_order USING btree (order_code)`
- `CREATE UNIQUE INDEX sales_order_pkey ON public.sales_order USING btree (id)`
- `CREATE INDEX v1fk_97e6f5e8ae76df6e14 ON public.sales_order USING btree (delivery_option_id)`
- `CREATE INDEX v1fk_d338ae97d3866ee692 ON public.sales_order USING btree (shipping_provider_id)`
- `CREATE INDEX v1fk_e7f5af1fdbf76553ac ON public.sales_order USING btree (customer_id)`

Chính sách RLS:

- `own_customer`: SELECT, roles=authenticated; USING `pawpal_private.owns_customer(customer_id)`; WITH CHECK `—`.
- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('sales_order.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('sales_order.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('sales_order.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('sales_order.write'::text)`; WITH CHECK `pawpal_private.has_permission('sales_order.write'::text)`.

### sales_order_detail

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `order_id` | uuid | Có |
| `product_variant_id` | uuid | Có |
| `quantity` | integer | Có |
| `unit_price` | numeric(18,4) | Có |
| `discount_amount` | numeric(18,4) | Có |
| `product_name_snapshot` | text | Có |
| `sku_snapshot` | text | Có |

Khóa và CHECK:

- `sales_order_detail_check`: `CHECK ((discount_amount <= ((quantity)::numeric * unit_price)))`
- `sales_order_detail_discount_amount_check`: `CHECK ((discount_amount >= (0)::numeric))`
- `sales_order_detail_order_id_fkey`: `FOREIGN KEY (order_id) REFERENCES sales_order(id) DEFERRABLE`
- `sales_order_detail_pkey`: `PRIMARY KEY (id)`
- `sales_order_detail_product_name_snapshot_check`: `CHECK ((length(btrim(product_name_snapshot)) > 0))`
- `sales_order_detail_product_variant_id_fkey`: `FOREIGN KEY (product_variant_id) REFERENCES product_variant(id) DEFERRABLE`
- `sales_order_detail_quantity_check`: `CHECK ((quantity > 0))`
- `sales_order_detail_sku_snapshot_check`: `CHECK ((length(btrim(sku_snapshot)) > 0))`
- `sales_order_detail_unit_price_check`: `CHECK ((unit_price >= (0)::numeric))`
- `v1_money_check`: `TRIGGER DEFERRABLE INITIALLY DEFERRED`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX sales_order_detail_pkey ON public.sales_order_detail USING btree (id)`
- `CREATE INDEX v1fk_8fde45639cdde521c2 ON public.sales_order_detail USING btree (order_id)`
- `CREATE INDEX v1fk_c9cf6e848e1cccdd5f ON public.sales_order_detail USING btree (product_variant_id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('sales_order_detail.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('sales_order_detail.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('sales_order_detail.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('sales_order_detail.write'::text)`; WITH CHECK `pawpal_private.has_permission('sales_order_detail.write'::text)`.

### service

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `service_code` | text | Có |
| `service_name` | text | Có |
| `description` | text | Không |
| `estimated_duration` | integer | Có |
| `status` | text | Có |
| `commission_rate` | numeric(18,4) | Không |
| `benefits` | text | Không |
| `created_at` | timestamp with time zone | Có |
| `updated_at` | timestamp with time zone | Có |
| `category_id` | uuid | Có |
| `staff_level_required_id` | uuid | Không |
| `amenities` | text | Không |

Khóa và CHECK:

- `service_category_id_fkey`: `FOREIGN KEY (category_id) REFERENCES service_category(id) DEFERRABLE`
- `service_commission_rate_check`: `CHECK ((commission_rate >= (0)::numeric))`
- `service_commission_rate_check1`: `CHECK ((commission_rate <= (100)::numeric))`
- `service_estimated_duration_check`: `CHECK ((estimated_duration >= 0))`
- `service_estimated_duration_check1`: `CHECK ((estimated_duration > 0))`
- `service_pkey`: `PRIMARY KEY (id)`
- `service_service_code_check`: `CHECK ((length(btrim(service_code)) > 0))`
- `service_service_code_key`: `UNIQUE (service_code)`
- `service_service_name_check`: `CHECK ((length(btrim(service_name)) > 0))`
- `service_staff_level_required_id_fkey`: `FOREIGN KEY (staff_level_required_id) REFERENCES staff_level(id) DEFERRABLE`
- `service_status_check`: `CHECK ((length(btrim(status)) > 0))`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX service_pkey ON public.service USING btree (id)`
- `CREATE UNIQUE INDEX service_service_code_key ON public.service USING btree (service_code)`
- `CREATE INDEX v1fk_1d8ddd71b815c5de86 ON public.service USING btree (category_id)`
- `CREATE INDEX v1fk_6460ca94ed523fa831 ON public.service USING btree (staff_level_required_id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('service.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('service.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('service.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('service.write'::text)`; WITH CHECK `pawpal_private.has_permission('service.write'::text)`.

### service_addon

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `service_id` | uuid | Có |
| `addon_name` | text | Có |
| `description` | text | Không |
| `price` | numeric(18,4) | Có |
| `estimated_duration` | integer | Có |
| `is_required` | boolean | Có |
| `status` | text | Có |
| `created_at` | timestamp with time zone | Có |
| `updated_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `service_addon_addon_name_check`: `CHECK ((length(btrim(addon_name)) > 0))`
- `service_addon_estimated_duration_check`: `CHECK ((estimated_duration >= 0))`
- `service_addon_pkey`: `PRIMARY KEY (id)`
- `service_addon_price_check`: `CHECK ((price >= (0)::numeric))`
- `service_addon_service_id_fkey`: `FOREIGN KEY (service_id) REFERENCES service(id) DEFERRABLE`
- `service_addon_status_check`: `CHECK ((length(btrim(status)) > 0))`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX service_addon_pkey ON public.service_addon USING btree (id)`
- `CREATE INDEX v1fk_5774c693bba6971ec5 ON public.service_addon USING btree (service_id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('service_addon.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('service_addon.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('service_addon.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('service_addon.write'::text)`; WITH CHECK `pawpal_private.has_permission('service_addon.write'::text)`.

### service_care_action

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `service_id` | uuid | Có |
| `care_action_id` | uuid | Có |
| `display_order` | integer | Có |
| `estimated_duration` | integer | Có |

Khóa và CHECK:

- `service_care_action_care_action_id_fkey`: `FOREIGN KEY (care_action_id) REFERENCES care_action(id) DEFERRABLE`
- `service_care_action_display_order_check`: `CHECK ((display_order >= 0))`
- `service_care_action_estimated_duration_check`: `CHECK ((estimated_duration >= 0))`
- `service_care_action_pkey`: `PRIMARY KEY (service_id, care_action_id)`
- `service_care_action_service_id_fkey`: `FOREIGN KEY (service_id) REFERENCES service(id) DEFERRABLE`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX service_care_action_pkey ON public.service_care_action USING btree (service_id, care_action_id)`
- `CREATE INDEX v1fk_6849d8fd752755dc0a ON public.service_care_action USING btree (care_action_id)`
- `CREATE INDEX v1fk_c6e1286a5417c829f4 ON public.service_care_action USING btree (service_id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('service_care_action.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('service_care_action.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('service_care_action.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('service_care_action.write'::text)`; WITH CHECK `pawpal_private.has_permission('service_care_action.write'::text)`.

### service_category

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `category_code` | text | Có |
| `category_name` | text | Có |
| `created_at` | timestamp with time zone | Có |
| `updated_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `service_category_category_code_check`: `CHECK ((length(btrim(category_code)) > 0))`
- `service_category_category_code_key`: `UNIQUE (category_code)`
- `service_category_category_name_check`: `CHECK ((length(btrim(category_name)) > 0))`
- `service_category_pkey`: `PRIMARY KEY (id)`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX service_category_category_code_key ON public.service_category USING btree (category_code)`
- `CREATE UNIQUE INDEX service_category_pkey ON public.service_category USING btree (id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('service_category.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('service_category.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('service_category.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('service_category.write'::text)`; WITH CHECK `pawpal_private.has_permission('service_category.write'::text)`.

### service_image

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `service_id` | uuid | Có |
| `image_url` | text | Có |
| `display_order` | integer | Có |
| `is_thumbnail` | boolean | Có |
| `created_at` | timestamp with time zone | Có |
| `updated_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `service_image_display_order_check`: `CHECK ((display_order >= 0))`
- `service_image_image_url_check`: `CHECK ((length(btrim(image_url)) > 0))`
- `service_image_pkey`: `PRIMARY KEY (id)`
- `service_image_service_id_fkey`: `FOREIGN KEY (service_id) REFERENCES service(id) DEFERRABLE`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX service_image_pkey ON public.service_image USING btree (id)`
- `CREATE UNIQUE INDEX service_image_service_id_idx ON public.service_image USING btree (service_id) WHERE is_thumbnail`
- `CREATE INDEX v1fk_f69928edb3fdf4a2a0 ON public.service_image USING btree (service_id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('service_image.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('service_image.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('service_image.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('service_image.write'::text)`; WITH CHECK `pawpal_private.has_permission('service_image.write'::text)`.

### service_price_matrix

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `service_id` | uuid | Có |
| `weight_from` | numeric(18,4) | Có |
| `weight_to` | numeric(18,4) | Không |
| `unit_price` | numeric(18,4) | Có |
| `effective_from` | timestamp with time zone | Có |
| `effective_to` | timestamp with time zone | Không |
| `status` | text | Có |
| `created_at` | timestamp with time zone | Có |
| `updated_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `service_price_matrix_check`: `CHECK (((weight_to IS NULL) OR (weight_to > weight_from)))`
- `service_price_matrix_check1`: `CHECK (((effective_to IS NULL) OR (effective_to > effective_from)))`
- `service_price_matrix_pkey`: `PRIMARY KEY (id)`
- `service_price_matrix_service_id_fkey`: `FOREIGN KEY (service_id) REFERENCES service(id) DEFERRABLE`
- `service_price_matrix_status_check`: `CHECK ((length(btrim(status)) > 0))`
- `service_price_matrix_unit_price_check`: `CHECK ((unit_price >= (0)::numeric))`
- `service_price_matrix_weight_from_check`: `CHECK ((weight_from >= (0)::numeric))`
- `service_price_matrix_weight_to_check`: `CHECK ((weight_to >= (0)::numeric))`
- `service_price_no_overlap`: `EXCLUDE USING gist (service_id WITH =, numrange(weight_from, weight_to, '[)'::text) WITH &&, tstzrange(effective_from, effective_to, '[)'::text) WITH &&) WHERE ((status = 'active'::text))`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX service_price_matrix_pkey ON public.service_price_matrix USING btree (id)`
- `CREATE INDEX service_price_no_overlap ON public.service_price_matrix USING gist (service_id, numrange(weight_from, weight_to, '[)'::text), tstzrange(effective_from, effective_to, '[)'::text)) WHERE (status = 'active'::text)`
- `CREATE INDEX v1fk_ab7bce1c7cd3b1949a ON public.service_price_matrix USING btree (service_id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('service_price_matrix.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('service_price_matrix.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('service_price_matrix.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('service_price_matrix.write'::text)`; WITH CHECK `pawpal_private.has_permission('service_price_matrix.write'::text)`.

### service_supported_species

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `service_id` | uuid | Có |
| `species_id` | uuid | Có |

Khóa và CHECK:

- `service_supported_species_pkey`: `PRIMARY KEY (service_id, species_id)`
- `service_supported_species_service_id_fkey`: `FOREIGN KEY (service_id) REFERENCES service(id) DEFERRABLE`
- `service_supported_species_species_id_fkey`: `FOREIGN KEY (species_id) REFERENCES pet_species(id) DEFERRABLE`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX service_supported_species_pkey ON public.service_supported_species USING btree (service_id, species_id)`
- `CREATE INDEX v1fk_acb03b48933a45e933 ON public.service_supported_species USING btree (service_id)`
- `CREATE INDEX v1fk_f019a05d6fd12c40d2 ON public.service_supported_species USING btree (species_id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('service_supported_species.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('service_supported_species.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('service_supported_species.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('service_supported_species.write'::text)`; WITH CHECK `pawpal_private.has_permission('service_supported_species.write'::text)`.

### shipping_provider

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `provider_name` | text | Có |
| `provider_code` | text | Có |
| `logo_url` | text | Không |
| `contact_phone` | text | Không |
| `tracking_url` | text | Không |
| `status` | text | Có |
| `created_at` | timestamp with time zone | Có |
| `updated_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `shipping_provider_pkey`: `PRIMARY KEY (id)`
- `shipping_provider_provider_code_check`: `CHECK ((length(btrim(provider_code)) > 0))`
- `shipping_provider_provider_name_check`: `CHECK ((length(btrim(provider_name)) > 0))`
- `shipping_provider_status_check`: `CHECK ((length(btrim(status)) > 0))`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX shipping_provider_pkey ON public.shipping_provider USING btree (id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('shipping_provider.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('shipping_provider.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('shipping_provider.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('shipping_provider.write'::text)`; WITH CHECK `pawpal_private.has_permission('shipping_provider.write'::text)`.

### staff

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `full_name` | text | Có |
| `phone_number` | text | Không |
| `job_title` | text | Có |
| `specialization` | text | Không |
| `hire_date` | date | Không |
| `email` | text | Không |
| `address` | text | Không |
| `dob` | date | Không |
| `service_locked` | boolean | Có |
| `created_at` | timestamp with time zone | Có |
| `updated_at` | timestamp with time zone | Có |
| `auth_user_id` | uuid | Có |
| `staff_level_id` | uuid | Không |
| `employment_status` | text | Có |
| `must_change_password` | boolean | Có |

Khóa và CHECK:

- `staff_auth_user_id_fkey`: `FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) DEFERRABLE`
- `staff_auth_user_id_key`: `UNIQUE (auth_user_id)`
- `staff_employment_status_check`: `CHECK ((length(btrim(employment_status)) > 0))`
- `staff_full_name_check`: `CHECK ((length(btrim(full_name)) > 0))`
- `staff_job_title_check`: `CHECK ((length(btrim(job_title)) > 0))`
- `staff_pkey`: `PRIMARY KEY (id)`
- `staff_staff_level_id_fkey`: `FOREIGN KEY (staff_level_id) REFERENCES staff_level(id) DEFERRABLE`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX staff_auth_user_id_key ON public.staff USING btree (auth_user_id)`
- `CREATE UNIQUE INDEX staff_pkey ON public.staff USING btree (id)`
- `CREATE INDEX v1fk_6ae727249cfbcd200e ON public.staff USING btree (staff_level_id)`
- `CREATE INDEX v1fk_af22b52ac1bd9f7792 ON public.staff USING btree (auth_user_id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('staff.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('staff.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('staff.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('staff.write'::text)`; WITH CHECK `pawpal_private.has_permission('staff.write'::text)`.

### staff_assessment

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `staff_id` | uuid | Có |
| `assessment_date` | date | Có |
| `assessment_type` | text | Có |
| `score` | numeric(5,2) | Có |
| `result` | text | Có |
| `note` | text | Không |
| `assessed_by` | uuid | Có |
| `created_at` | timestamp with time zone | Có |
| `updated_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `staff_assessment_assessed_by_fkey`: `FOREIGN KEY (assessed_by) REFERENCES staff(id) DEFERRABLE`
- `staff_assessment_assessment_type_check`: `CHECK ((length(btrim(assessment_type)) > 0))`
- `staff_assessment_pkey`: `PRIMARY KEY (id)`
- `staff_assessment_result_check`: `CHECK ((length(btrim(result)) > 0))`
- `staff_assessment_score_check`: `CHECK (((score >= (0)::numeric) AND (score <= (100)::numeric)))`
- `staff_assessment_staff_id_fkey`: `FOREIGN KEY (staff_id) REFERENCES staff(id) DEFERRABLE`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX staff_assessment_pkey ON public.staff_assessment USING btree (id)`
- `CREATE INDEX v1fk_044c8ab5172e269a03 ON public.staff_assessment USING btree (staff_id)`
- `CREATE INDEX v1fk_ffadddc893d23bcc1c ON public.staff_assessment USING btree (assessed_by)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('staff_assessment.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('staff_assessment.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('staff_assessment.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('staff_assessment.write'::text)`; WITH CHECK `pawpal_private.has_permission('staff_assessment.write'::text)`.

### staff_level

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `level_code` | text | Có |
| `level_name` | text | Có |
| `rank_order` | integer | Có |
| `is_active` | boolean | Có |
| `created_at` | timestamp with time zone | Có |
| `updated_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `staff_level_level_code_check`: `CHECK ((length(btrim(level_code)) > 0))`
- `staff_level_level_code_key`: `UNIQUE (level_code)`
- `staff_level_level_name_check`: `CHECK ((length(btrim(level_name)) > 0))`
- `staff_level_pkey`: `PRIMARY KEY (id)`
- `staff_level_rank_order_check`: `CHECK ((rank_order >= 0))`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX staff_level_level_code_key ON public.staff_level USING btree (level_code)`
- `CREATE UNIQUE INDEX staff_level_pkey ON public.staff_level USING btree (id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('staff_level.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('staff_level.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('staff_level.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('staff_level.write'::text)`; WITH CHECK `pawpal_private.has_permission('staff_level.write'::text)`.

### staff_permission

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `staff_id` | uuid | Có |
| `permission_code` | text | Có |

Khóa và CHECK:

- `staff_permission_permission_code_check`: `CHECK ((length(btrim(permission_code)) > 0))`
- `staff_permission_permission_code_fkey`: `FOREIGN KEY (permission_code) REFERENCES permission(code) DEFERRABLE`
- `staff_permission_pkey`: `PRIMARY KEY (staff_id, permission_code)`
- `staff_permission_staff_id_fkey`: `FOREIGN KEY (staff_id) REFERENCES staff(id) DEFERRABLE`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX staff_permission_pkey ON public.staff_permission USING btree (staff_id, permission_code)`
- `CREATE INDEX v1fk_4e2b43760345ff33a7 ON public.staff_permission USING btree (permission_code)`
- `CREATE INDEX v1fk_5a443ef9800b9cf8c3 ON public.staff_permission USING btree (staff_id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('staff_permission.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('staff_permission.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('staff_permission.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('staff_permission.write'::text)`; WITH CHECK `pawpal_private.has_permission('staff_permission.write'::text)`.

### staff_role

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `staff_id` | uuid | Có |
| `role_code` | text | Có |

Khóa và CHECK:

- `staff_role_pkey`: `PRIMARY KEY (staff_id, role_code)`
- `staff_role_role_code_check`: `CHECK ((length(btrim(role_code)) > 0))`
- `staff_role_role_code_fkey`: `FOREIGN KEY (role_code) REFERENCES access_role(code) DEFERRABLE`
- `staff_role_staff_id_fkey`: `FOREIGN KEY (staff_id) REFERENCES staff(id) DEFERRABLE`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX staff_role_pkey ON public.staff_role USING btree (staff_id, role_code)`
- `CREATE INDEX v1fk_6dfe5a2bfd64887d13 ON public.staff_role USING btree (role_code)`
- `CREATE INDEX v1fk_ae6aa412d5b1ebc784 ON public.staff_role USING btree (staff_id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('staff_role.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('staff_role.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('staff_role.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('staff_role.write'::text)`; WITH CHECK `pawpal_private.has_permission('staff_role.write'::text)`.

### staff_schedule

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `staff_id` | uuid | Có |
| `availability_status` | text | Có |
| `reason` | text | Không |
| `schedule_status` | text | Có |
| `created_at` | timestamp with time zone | Có |
| `updated_at` | timestamp with time zone | Có |
| `start_at` | timestamp with time zone | Có |
| `end_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `staff_no_overlap`: `EXCLUDE USING gist (staff_id WITH =, tstzrange(start_at, end_at, '[)'::text) WITH &&) WHERE ((schedule_status = 'active'::text))`
- `staff_schedule_availability_status_check`: `CHECK ((length(btrim(availability_status)) > 0))`
- `staff_schedule_check`: `CHECK ((end_at > start_at))`
- `staff_schedule_pkey`: `PRIMARY KEY (id)`
- `staff_schedule_schedule_status_check`: `CHECK ((length(btrim(schedule_status)) > 0))`
- `staff_schedule_staff_id_fkey`: `FOREIGN KEY (staff_id) REFERENCES staff(id) DEFERRABLE`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE INDEX staff_no_overlap ON public.staff_schedule USING gist (staff_id, tstzrange(start_at, end_at, '[)'::text)) WHERE (schedule_status = 'active'::text)`
- `CREATE UNIQUE INDEX staff_schedule_pkey ON public.staff_schedule USING btree (id)`
- `CREATE INDEX v1fk_7328e05396b87a458b ON public.staff_schedule USING btree (staff_id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('staff_schedule.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('staff_schedule.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('staff_schedule.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('staff_schedule.write'::text)`; WITH CHECK `pawpal_private.has_permission('staff_schedule.write'::text)`.

### staff_shift_request

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `request_type` | text | Có |
| `staff_id` | uuid | Có |
| `target_staff_id` | uuid | Không |
| `replacement_staff_id` | uuid | Không |
| `leave_type` | text | Không |
| `start_date` | date | Có |
| `end_date` | date | Có |
| `shift` | text | Có |
| `target_date` | date | Không |
| `target_shift` | text | Không |
| `reason` | text | Có |
| `status` | text | Có |
| `created_by` | uuid | Có |
| `reviewed_by` | uuid | Không |
| `reviewed_at` | timestamp with time zone | Không |
| `created_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `staff_shift_request_check`: `CHECK ((end_date >= start_date))`
- `staff_shift_request_created_by_fkey`: `FOREIGN KEY (created_by) REFERENCES auth.users(id) DEFERRABLE`
- `staff_shift_request_pkey`: `PRIMARY KEY (id)`
- `staff_shift_request_reason_check`: `CHECK ((length(btrim(reason)) > 0))`
- `staff_shift_request_replacement_staff_id_fkey`: `FOREIGN KEY (replacement_staff_id) REFERENCES staff(id) DEFERRABLE`
- `staff_shift_request_request_type_check`: `CHECK ((length(btrim(request_type)) > 0))`
- `staff_shift_request_reviewed_by_fkey`: `FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) DEFERRABLE`
- `staff_shift_request_shift_check`: `CHECK ((length(btrim(shift)) > 0))`
- `staff_shift_request_staff_id_fkey`: `FOREIGN KEY (staff_id) REFERENCES staff(id) DEFERRABLE`
- `staff_shift_request_status_check`: `CHECK ((length(btrim(status)) > 0))`
- `staff_shift_request_target_staff_id_fkey`: `FOREIGN KEY (target_staff_id) REFERENCES staff(id) DEFERRABLE`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX staff_shift_request_pkey ON public.staff_shift_request USING btree (id)`
- `CREATE INDEX v1fk_18d4787692d65362bc ON public.staff_shift_request USING btree (staff_id)`
- `CREATE INDEX v1fk_1e183d93f629b58d49 ON public.staff_shift_request USING btree (replacement_staff_id)`
- `CREATE INDEX v1fk_862b2e0396991fe143 ON public.staff_shift_request USING btree (created_by)`
- `CREATE INDEX v1fk_a71688f71f76c1c348 ON public.staff_shift_request USING btree (reviewed_by)`
- `CREATE INDEX v1fk_b5019cdc4dd9508abe ON public.staff_shift_request USING btree (target_staff_id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('staff_shift_request.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('staff_shift_request.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('staff_shift_request.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('staff_shift_request.write'::text)`; WITH CHECK `pawpal_private.has_permission('staff_shift_request.write'::text)`.

### stock_reservation

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `product_variant_id` | uuid | Có |
| `cart_id` | uuid | Không |
| `quantity` | integer | Có |
| `reserved_at` | timestamp with time zone | Có |
| `expires_at` | timestamp with time zone | Có |
| `status` | text | Có |
| `created_at` | timestamp with time zone | Có |
| `updated_at` | timestamp with time zone | Có |
| `order_id` | uuid | Không |

Khóa và CHECK:

- `stock_reservation_cart_id_fkey`: `FOREIGN KEY (cart_id) REFERENCES cart(id) DEFERRABLE`
- `stock_reservation_check`: `CHECK ((num_nonnulls(cart_id, order_id) = 1))`
- `stock_reservation_check1`: `CHECK ((expires_at > reserved_at))`
- `stock_reservation_order_id_fkey`: `FOREIGN KEY (order_id) REFERENCES sales_order(id) DEFERRABLE`
- `stock_reservation_pkey`: `PRIMARY KEY (id)`
- `stock_reservation_product_variant_id_fkey`: `FOREIGN KEY (product_variant_id) REFERENCES product_variant(id) DEFERRABLE`
- `stock_reservation_quantity_check`: `CHECK ((quantity > 0))`
- `stock_reservation_status_check`: `CHECK ((length(btrim(status)) > 0))`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX stock_reservation_pkey ON public.stock_reservation USING btree (id)`
- `CREATE INDEX v1fk_28e93158063c169f74 ON public.stock_reservation USING btree (cart_id)`
- `CREATE INDEX v1fk_63500d7d647e6d7c12 ON public.stock_reservation USING btree (order_id)`
- `CREATE INDEX v1fk_bc1407d2738ca56c0d ON public.stock_reservation USING btree (product_variant_id)`

Chính sách RLS:

- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('stock_reservation.read'::text)`; WITH CHECK `—`.

### supplier

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `supplier_name` | text | Có |
| `contact_person` | text | Không |
| `phone_number` | text | Không |
| `email` | text | Không |
| `address` | text | Không |
| `status` | text | Có |
| `created_at` | timestamp with time zone | Có |
| `updated_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `supplier_pkey`: `PRIMARY KEY (id)`
- `supplier_status_check`: `CHECK ((length(btrim(status)) > 0))`
- `supplier_supplier_name_check`: `CHECK ((length(btrim(supplier_name)) > 0))`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX supplier_pkey ON public.supplier USING btree (id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('supplier.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('supplier.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('supplier.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('supplier.write'::text)`; WITH CHECK `pawpal_private.has_permission('supplier.write'::text)`.

### support_ticket

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `ticket_code` | text | Có |
| `customer_id` | uuid | Không |
| `order_id` | uuid | Không |
| `appointment_id` | uuid | Không |
| `channel` | text | Có |
| `category` | text | Có |
| `subject` | text | Có |
| `description` | text | Không |
| `priority` | text | Có |
| `type` | text | Có |
| `status` | text | Có |
| `requested_resolution` | text | Không |
| `requested_amount` | numeric(18,4) | Không |
| `assigned_staff_id` | uuid | Không |
| `first_response_at` | timestamp with time zone | Không |
| `investigation_note` | text | Không |
| `resolution_type` | text | Không |
| `resolution_note` | text | Không |
| `approved_amount` | numeric(18,4) | Không |
| `resolved_by` | uuid | Không |
| `resolved_at` | timestamp with time zone | Không |
| `closed_at` | timestamp with time zone | Không |
| `rating` | integer | Không |
| `rating_comment` | text | Không |
| `created_at` | timestamp with time zone | Có |
| `updated_at` | timestamp with time zone | Có |
| `created_by_account_id` | uuid | Không |

Khóa và CHECK:

- `support_ticket_appointment_id_fkey`: `FOREIGN KEY (appointment_id) REFERENCES appointment(id) DEFERRABLE`
- `support_ticket_approved_amount_check`: `CHECK ((approved_amount >= (0)::numeric))`
- `support_ticket_assigned_staff_id_fkey`: `FOREIGN KEY (assigned_staff_id) REFERENCES staff(id) DEFERRABLE`
- `support_ticket_category_check`: `CHECK ((length(btrim(category)) > 0))`
- `support_ticket_channel_check`: `CHECK ((length(btrim(channel)) > 0))`
- `support_ticket_created_by_account_id_fkey`: `FOREIGN KEY (created_by_account_id) REFERENCES auth.users(id) DEFERRABLE`
- `support_ticket_customer_id_fkey`: `FOREIGN KEY (customer_id) REFERENCES customer(id) DEFERRABLE`
- `support_ticket_order_id_fkey`: `FOREIGN KEY (order_id) REFERENCES sales_order(id) DEFERRABLE`
- `support_ticket_pkey`: `PRIMARY KEY (id)`
- `support_ticket_priority_check`: `CHECK ((length(btrim(priority)) > 0))`
- `support_ticket_rating_check`: `CHECK ((rating >= 0))`
- `support_ticket_rating_check1`: `CHECK (((rating >= 1) AND (rating <= 5)))`
- `support_ticket_requested_amount_check`: `CHECK ((requested_amount >= (0)::numeric))`
- `support_ticket_resolved_by_fkey`: `FOREIGN KEY (resolved_by) REFERENCES staff(id) DEFERRABLE`
- `support_ticket_status_check`: `CHECK ((length(btrim(status)) > 0))`
- `support_ticket_subject_check`: `CHECK ((length(btrim(subject)) > 0))`
- `support_ticket_ticket_code_check`: `CHECK ((length(btrim(ticket_code)) > 0))`
- `support_ticket_ticket_code_key`: `UNIQUE (ticket_code)`
- `support_ticket_type_check`: `CHECK ((length(btrim(type)) > 0))`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX support_ticket_pkey ON public.support_ticket USING btree (id)`
- `CREATE UNIQUE INDEX support_ticket_ticket_code_key ON public.support_ticket USING btree (ticket_code)`
- `CREATE INDEX v1fk_0ae7228bebb7961350 ON public.support_ticket USING btree (assigned_staff_id)`
- `CREATE INDEX v1fk_4792694786442871f4 ON public.support_ticket USING btree (resolved_by)`
- `CREATE INDEX v1fk_47ff9a4fc819fb2250 ON public.support_ticket USING btree (appointment_id)`
- `CREATE INDEX v1fk_ad3c27db096527198e ON public.support_ticket USING btree (order_id)`
- `CREATE INDEX v1fk_c51443875d97a94dd5 ON public.support_ticket USING btree (customer_id)`
- `CREATE INDEX v1fk_fc2771b48691360de7 ON public.support_ticket USING btree (created_by_account_id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('support_ticket.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('support_ticket.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('support_ticket.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('support_ticket.write'::text)`; WITH CHECK `pawpal_private.has_permission('support_ticket.write'::text)`.

### support_ticket_message

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `ticket_id` | uuid | Có |
| `sender_type` | text | Có |
| `content` | text | Có |
| `is_internal` | boolean | Có |
| `created_at` | timestamp with time zone | Có |
| `sender_account_id` | uuid | Không |
| `sender_guest_session_id` | uuid | Không |

Khóa và CHECK:

- `support_ticket_message_pkey`: `PRIMARY KEY (id)`
- `support_ticket_message_sender_account_id_fkey`: `FOREIGN KEY (sender_account_id) REFERENCES auth.users(id) DEFERRABLE`
- `support_ticket_message_sender_guest_session_id_fkey`: `FOREIGN KEY (sender_guest_session_id) REFERENCES guest_session(id) DEFERRABLE`
- `support_ticket_message_sender_type_check`: `CHECK ((length(btrim(sender_type)) > 0))`
- `support_ticket_message_ticket_id_fkey`: `FOREIGN KEY (ticket_id) REFERENCES support_ticket(id) DEFERRABLE`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX support_ticket_message_pkey ON public.support_ticket_message USING btree (id)`
- `CREATE INDEX v1fk_1792849c16a4e28737 ON public.support_ticket_message USING btree (sender_account_id)`
- `CREATE INDEX v1fk_6d4b3dc2a6d2ec878c ON public.support_ticket_message USING btree (sender_guest_session_id)`
- `CREATE INDEX v1fk_a8508da4af292262d5 ON public.support_ticket_message USING btree (ticket_id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('support_ticket_message.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('support_ticket_message.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('support_ticket_message.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('support_ticket_message.write'::text)`; WITH CHECK `pawpal_private.has_permission('support_ticket_message.write'::text)`.

### support_ticket_message_attachment

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `message_id` | uuid | Có |
| `file_url` | text | Có |
| `file_name` | text | Có |
| `file_size` | bigint | Có |
| `media_type` | text | Có |
| `display_order` | integer | Có |
| `created_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `support_ticket_message_attachment_display_order_check`: `CHECK ((display_order >= 0))`
- `support_ticket_message_attachment_file_name_check`: `CHECK ((length(btrim(file_name)) > 0))`
- `support_ticket_message_attachment_file_size_check`: `CHECK ((file_size >= 0))`
- `support_ticket_message_attachment_file_url_check`: `CHECK ((length(btrim(file_url)) > 0))`
- `support_ticket_message_attachment_media_type_check`: `CHECK ((length(btrim(media_type)) > 0))`
- `support_ticket_message_attachment_message_id_fkey`: `FOREIGN KEY (message_id) REFERENCES support_ticket_message(id) DEFERRABLE`
- `support_ticket_message_attachment_pkey`: `PRIMARY KEY (id)`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX support_ticket_message_attachment_pkey ON public.support_ticket_message_attachment USING btree (id)`
- `CREATE INDEX v1fk_77cb0196b72c9d68ea ON public.support_ticket_message_attachment USING btree (message_id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('support_ticket_message_attachment.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('support_ticket_message_attachment.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('support_ticket_message_attachment.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('support_ticket_message_attachment.write'::text)`; WITH CHECK `pawpal_private.has_permission('support_ticket_message_attachment.write'::text)`.

### taxi_price_rule

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `distance_from` | numeric(18,4) | Có |
| `distance_to` | numeric(18,4) | Không |
| `weight_from` | numeric(18,4) | Có |
| `weight_to` | numeric(18,4) | Không |
| `base_price` | numeric(18,4) | Có |
| `surcharge` | numeric(18,4) | Có |
| `effective_from` | timestamp with time zone | Có |
| `effective_to` | timestamp with time zone | Không |
| `status` | text | Có |
| `created_at` | timestamp with time zone | Có |
| `updated_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `taxi_price_no_overlap`: `EXCLUDE USING gist (numrange(distance_from, distance_to, '[)'::text) WITH &&, numrange(weight_from, weight_to, '[)'::text) WITH &&, tstzrange(effective_from, effective_to, '[)'::text) WITH &&) WHERE ((status = 'active'::text))`
- `taxi_price_rule_base_price_check`: `CHECK ((base_price >= (0)::numeric))`
- `taxi_price_rule_check`: `CHECK (((weight_to IS NULL) OR (weight_to > weight_from)))`
- `taxi_price_rule_check1`: `CHECK (((distance_to IS NULL) OR (distance_to > distance_from)))`
- `taxi_price_rule_check2`: `CHECK (((effective_to IS NULL) OR (effective_to > effective_from)))`
- `taxi_price_rule_distance_from_check`: `CHECK ((distance_from >= (0)::numeric))`
- `taxi_price_rule_distance_to_check`: `CHECK ((distance_to >= (0)::numeric))`
- `taxi_price_rule_pkey`: `PRIMARY KEY (id)`
- `taxi_price_rule_status_check`: `CHECK ((length(btrim(status)) > 0))`
- `taxi_price_rule_surcharge_check`: `CHECK ((surcharge >= (0)::numeric))`
- `taxi_price_rule_weight_from_check`: `CHECK ((weight_from >= (0)::numeric))`
- `taxi_price_rule_weight_to_check`: `CHECK ((weight_to >= (0)::numeric))`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE INDEX taxi_price_no_overlap ON public.taxi_price_rule USING gist (numrange(distance_from, distance_to, '[)'::text), numrange(weight_from, weight_to, '[)'::text), tstzrange(effective_from, effective_to, '[)'::text)) WHERE (status = 'active'::text)`
- `CREATE UNIQUE INDEX taxi_price_rule_pkey ON public.taxi_price_rule USING btree (id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('taxi_price_rule.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('taxi_price_rule.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('taxi_price_rule.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('taxi_price_rule.write'::text)`; WITH CHECK `pawpal_private.has_permission('taxi_price_rule.write'::text)`.

### taxi_trip

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `appointment_id` | uuid | Có |
| `driver_staff_id` | uuid | Không |
| `pickup_address` | text | Có |
| `dropoff_address` | text | Có |
| `distance_km` | numeric(18,4) | Có |
| `trip_type` | text | Có |
| `outbound_at` | timestamp with time zone | Không |
| `return_at` | timestamp with time zone | Không |
| `taxi_price_rule_id` | uuid | Không |
| `quoted_amount` | numeric(18,4) | Có |
| `status` | text | Có |
| `created_at` | timestamp with time zone | Có |
| `updated_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `taxi_trip_appointment_id_fkey`: `FOREIGN KEY (appointment_id) REFERENCES appointment(id) DEFERRABLE`
- `taxi_trip_appointment_id_key`: `UNIQUE (appointment_id)`
- `taxi_trip_distance_km_check`: `CHECK ((distance_km >= (0)::numeric))`
- `taxi_trip_driver_staff_id_fkey`: `FOREIGN KEY (driver_staff_id) REFERENCES staff(id) DEFERRABLE`
- `taxi_trip_dropoff_address_check`: `CHECK ((length(btrim(dropoff_address)) > 0))`
- `taxi_trip_pickup_address_check`: `CHECK ((length(btrim(pickup_address)) > 0))`
- `taxi_trip_pkey`: `PRIMARY KEY (id)`
- `taxi_trip_quoted_amount_check`: `CHECK ((quoted_amount >= (0)::numeric))`
- `taxi_trip_status_check`: `CHECK ((length(btrim(status)) > 0))`
- `taxi_trip_taxi_price_rule_id_fkey`: `FOREIGN KEY (taxi_price_rule_id) REFERENCES taxi_price_rule(id) DEFERRABLE`
- `taxi_trip_trip_type_check`: `CHECK ((length(btrim(trip_type)) > 0))`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX taxi_trip_appointment_id_key ON public.taxi_trip USING btree (appointment_id)`
- `CREATE UNIQUE INDEX taxi_trip_pkey ON public.taxi_trip USING btree (id)`
- `CREATE INDEX v1fk_3126a2182ee255a68e ON public.taxi_trip USING btree (appointment_id)`
- `CREATE INDEX v1fk_69b7a8874faac802bd ON public.taxi_trip USING btree (driver_staff_id)`
- `CREATE INDEX v1fk_ac6c8f40746a3ace9f ON public.taxi_trip USING btree (taxi_price_rule_id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('taxi_trip.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('taxi_trip.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('taxi_trip.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('taxi_trip.write'::text)`; WITH CHECK `pawpal_private.has_permission('taxi_trip.write'::text)`.

### variant_color

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `color_name` | text | Có |
| `hex_code` | text | Có |
| `display_order` | integer | Có |
| `is_active` | boolean | Có |
| `created_at` | timestamp with time zone | Có |
| `updated_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `variant_color_color_name_check`: `CHECK ((length(btrim(color_name)) > 0))`
- `variant_color_display_order_check`: `CHECK ((display_order >= 0))`
- `variant_color_hex_code_check`: `CHECK ((length(btrim(hex_code)) > 0))`
- `variant_color_pkey`: `PRIMARY KEY (id)`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX variant_color_pkey ON public.variant_color USING btree (id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('variant_color.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('variant_color.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('variant_color.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('variant_color.write'::text)`; WITH CHECK `pawpal_private.has_permission('variant_color.write'::text)`.

### variant_flavor

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `flavor_name` | text | Có |
| `display_order` | integer | Có |
| `is_active` | boolean | Có |
| `created_at` | timestamp with time zone | Có |
| `updated_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `variant_flavor_display_order_check`: `CHECK ((display_order >= 0))`
- `variant_flavor_flavor_name_check`: `CHECK ((length(btrim(flavor_name)) > 0))`
- `variant_flavor_pkey`: `PRIMARY KEY (id)`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX variant_flavor_pkey ON public.variant_flavor USING btree (id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('variant_flavor.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('variant_flavor.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('variant_flavor.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('variant_flavor.write'::text)`; WITH CHECK `pawpal_private.has_permission('variant_flavor.write'::text)`.

### variant_size

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `size_name` | text | Có |
| `display_order` | integer | Có |
| `is_active` | boolean | Có |
| `created_at` | timestamp with time zone | Có |
| `updated_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `variant_size_display_order_check`: `CHECK ((display_order >= 0))`
- `variant_size_pkey`: `PRIMARY KEY (id)`
- `variant_size_size_name_check`: `CHECK ((length(btrim(size_name)) > 0))`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX variant_size_pkey ON public.variant_size USING btree (id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('variant_size.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('variant_size.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('variant_size.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('variant_size.write'::text)`; WITH CHECK `pawpal_private.has_permission('variant_size.write'::text)`.

### voucher

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `voucher_code` | text | Có |
| `voucher_name` | text | Có |
| `discount_value` | numeric(18,4) | Có |
| `minimum_order_amount` | numeric(18,4) | Có |
| `required_points` | integer | Có |
| `start_date` | date | Có |
| `end_date` | date | Có |
| `is_active` | boolean | Có |
| `type` | text | Có |
| `description` | text | Không |
| `applicable_for` | text | Có |
| `max_usage` | integer | Không |
| `created_at` | timestamp with time zone | Có |
| `updated_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `voucher_applicable_for_check`: `CHECK ((length(btrim(applicable_for)) > 0))`
- `voucher_check`: `CHECK ((end_date >= start_date))`
- `voucher_check1`: `CHECK (((type <> 'percent'::text) OR (discount_value <= (100)::numeric)))`
- `voucher_discount_value_check`: `CHECK ((discount_value >= (0)::numeric))`
- `voucher_max_usage_check`: `CHECK ((max_usage >= 0))`
- `voucher_minimum_order_amount_check`: `CHECK ((minimum_order_amount >= (0)::numeric))`
- `voucher_pkey`: `PRIMARY KEY (id)`
- `voucher_required_points_check`: `CHECK ((required_points >= 0))`
- `voucher_type_check`: `CHECK ((length(btrim(type)) > 0))`
- `voucher_voucher_code_check`: `CHECK ((length(btrim(voucher_code)) > 0))`
- `voucher_voucher_code_key`: `UNIQUE (voucher_code)`
- `voucher_voucher_name_check`: `CHECK ((length(btrim(voucher_name)) > 0))`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE UNIQUE INDEX voucher_pkey ON public.voucher USING btree (id)`
- `CREATE UNIQUE INDEX voucher_voucher_code_key ON public.voucher USING btree (voucher_code)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('voucher.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('voucher.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('voucher.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('voucher.write'::text)`; WITH CHECK `pawpal_private.has_permission('voucher.write'::text)`.

### voucher_redemption

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `customer_voucher_id` | uuid | Không |
| `voucher_id` | uuid | Có |
| `order_id` | uuid | Không |
| `appointment_id` | uuid | Không |
| `discount_amount_snapshot` | numeric(18,4) | Có |
| `status` | text | Có |
| `redeemed_at` | timestamp with time zone | Có |
| `reversed_at` | timestamp with time zone | Không |
| `idempotency_key` | text | Có |
| `created_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `v1_money_check`: `TRIGGER DEFERRABLE INITIALLY DEFERRED`
- `voucher_redemption_appointment_id_fkey`: `FOREIGN KEY (appointment_id) REFERENCES appointment(id) DEFERRABLE`
- `voucher_redemption_check`: `CHECK ((num_nonnulls(order_id, appointment_id) = 1))`
- `voucher_redemption_check1`: `CHECK (((status = 'reversed'::text) = (reversed_at IS NOT NULL)))`
- `voucher_redemption_customer_voucher_id_fkey`: `FOREIGN KEY (customer_voucher_id) REFERENCES customer_voucher(id) DEFERRABLE`
- `voucher_redemption_discount_amount_snapshot_check`: `CHECK ((discount_amount_snapshot >= (0)::numeric))`
- `voucher_redemption_idempotency_key_check`: `CHECK ((length(btrim(idempotency_key)) > 0))`
- `voucher_redemption_idempotency_key_key`: `UNIQUE (idempotency_key)`
- `voucher_redemption_order_id_fkey`: `FOREIGN KEY (order_id) REFERENCES sales_order(id) DEFERRABLE`
- `voucher_redemption_pkey`: `PRIMARY KEY (id)`
- `voucher_redemption_status_check`: `CHECK ((length(btrim(status)) > 0))`
- `voucher_redemption_status_check1`: `CHECK ((status = ANY (ARRAY['applied'::text, 'reversed'::text, 'cancelled'::text])))`
- `voucher_redemption_voucher_id_fkey`: `FOREIGN KEY (voucher_id) REFERENCES voucher(id) DEFERRABLE`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE INDEX v1fk_206a8079fa8e2ad70d ON public.voucher_redemption USING btree (voucher_id)`
- `CREATE INDEX v1fk_6af7c0c4a067a5608d ON public.voucher_redemption USING btree (appointment_id)`
- `CREATE INDEX v1fk_d412156aadc3904002 ON public.voucher_redemption USING btree (customer_voucher_id)`
- `CREATE INDEX v1fk_e27e6c6c6213373775 ON public.voucher_redemption USING btree (order_id)`
- `CREATE UNIQUE INDEX voucher_redemption_customer_voucher_id_idx ON public.voucher_redemption USING btree (customer_voucher_id) WHERE ((customer_voucher_id IS NOT NULL) AND (status = 'applied'::text))`
- `CREATE UNIQUE INDEX voucher_redemption_idempotency_key_key ON public.voucher_redemption USING btree (idempotency_key)`
- `CREATE UNIQUE INDEX voucher_redemption_pkey ON public.voucher_redemption USING btree (id)`

Chính sách RLS:

- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('voucher_redemption.read'::text)`; WITH CHECK `—`.

### wishlist

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `id` | uuid | Có |
| `customer_id` | uuid | Có |
| `created_at` | timestamp with time zone | Có |
| `updated_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `wishlist_customer_id_fkey`: `FOREIGN KEY (customer_id) REFERENCES customer(id) DEFERRABLE`
- `wishlist_customer_id_key`: `UNIQUE (customer_id)`
- `wishlist_pkey`: `PRIMARY KEY (id)`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE INDEX v1fk_5519264e22a72d6ac9 ON public.wishlist USING btree (customer_id)`
- `CREATE UNIQUE INDEX wishlist_customer_id_key ON public.wishlist USING btree (customer_id)`
- `CREATE UNIQUE INDEX wishlist_pkey ON public.wishlist USING btree (id)`

Chính sách RLS:

- `own_customer`: SELECT, roles=authenticated; USING `pawpal_private.owns_customer(customer_id)`; WITH CHECK `—`.
- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('wishlist.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('wishlist.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('wishlist.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('wishlist.write'::text)`; WITH CHECK `pawpal_private.has_permission('wishlist.write'::text)`.

### wishlist_product

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `wishlist_id` | uuid | Có |
| `product_id` | uuid | Có |
| `added_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `wishlist_product_pkey`: `PRIMARY KEY (wishlist_id, product_id)`
- `wishlist_product_product_id_fkey`: `FOREIGN KEY (product_id) REFERENCES product(id) DEFERRABLE`
- `wishlist_product_wishlist_id_fkey`: `FOREIGN KEY (wishlist_id) REFERENCES wishlist(id) DEFERRABLE`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE INDEX v1fk_94b4dc9c2698e5cbcc ON public.wishlist_product USING btree (product_id)`
- `CREATE INDEX v1fk_e0996b420f27473b17 ON public.wishlist_product USING btree (wishlist_id)`
- `CREATE UNIQUE INDEX wishlist_product_pkey ON public.wishlist_product USING btree (wishlist_id, product_id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('wishlist_product.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('wishlist_product.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('wishlist_product.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('wishlist_product.write'::text)`; WITH CHECK `pawpal_private.has_permission('wishlist_product.write'::text)`.

### wishlist_service

| Cột | Kiểu PostgreSQL | NOT NULL |
|---|---|---|
| `wishlist_id` | uuid | Có |
| `service_id` | uuid | Có |
| `added_at` | timestamp with time zone | Có |

Khóa và CHECK:

- `wishlist_service_pkey`: `PRIMARY KEY (wishlist_id, service_id)`
- `wishlist_service_service_id_fkey`: `FOREIGN KEY (service_id) REFERENCES service(id) DEFERRABLE`
- `wishlist_service_wishlist_id_fkey`: `FOREIGN KEY (wishlist_id) REFERENCES wishlist(id) DEFERRABLE`

Chỉ mục (gồm partial unique index nếu có):

- `CREATE INDEX v1fk_0f6b79b846f30a397f ON public.wishlist_service USING btree (service_id)`
- `CREATE INDEX v1fk_5fc517fbff2feb2fa4 ON public.wishlist_service USING btree (wishlist_id)`
- `CREATE UNIQUE INDEX wishlist_service_pkey ON public.wishlist_service USING btree (wishlist_id, service_id)`

Chính sách RLS:

- `v1_delete`: DELETE, roles=authenticated; USING `pawpal_private.has_permission('wishlist_service.write'::text)`; WITH CHECK `—`.
- `v1_insert`: INSERT, roles=authenticated; USING `—`; WITH CHECK `pawpal_private.has_permission('wishlist_service.write'::text)`.
- `v1_read`: SELECT, roles=authenticated; USING `pawpal_private.has_permission('wishlist_service.read'::text)`; WITH CHECK `—`.
- `v1_update`: UPDATE, roles=authenticated; USING `pawpal_private.has_permission('wishlist_service.write'::text)`; WITH CHECK `pawpal_private.has_permission('wishlist_service.write'::text)`.

## 5. View, hàm và trigger public

View: `appointment_totals`, `customer_eligible_spend`, `customer_point_balance`, `pet_current_weight`, `sales_order_totals`, `staff_public_view`.

Hàm: `get_staff_login_context`.

- `access_role.v1_updated`: `CREATE TRIGGER v1_updated BEFORE UPDATE ON public.access_role FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at()`
- `appointment.v1_appointment_owner`: `CREATE TRIGGER v1_appointment_owner BEFORE INSERT OR UPDATE ON public.appointment FOR EACH ROW EXECUTE FUNCTION pawpal_private.validate_appointment_owner()`
- `appointment.v1_money_check`: `CREATE CONSTRAINT TRIGGER v1_money_check AFTER INSERT OR DELETE OR UPDATE ON public.appointment DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION pawpal_private.deferred_money_check()`
- `appointment.v1_updated`: `CREATE TRIGGER v1_updated BEFORE UPDATE ON public.appointment FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at()`
- `appointment_adjustment.v1_money_check`: `CREATE CONSTRAINT TRIGGER v1_money_check AFTER INSERT OR DELETE OR UPDATE ON public.appointment_adjustment DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION pawpal_private.deferred_money_check()`
- `appointment_item.v1_money_check`: `CREATE CONSTRAINT TRIGGER v1_money_check AFTER INSERT OR DELETE OR UPDATE ON public.appointment_item DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION pawpal_private.deferred_money_check()`
- `appointment_item.v1_updated`: `CREATE TRIGGER v1_updated BEFORE UPDATE ON public.appointment_item FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at()`
- `appointment_record.v1_signed_record`: `CREATE TRIGGER v1_signed_record BEFORE DELETE OR UPDATE ON public.appointment_record FOR EACH ROW EXECUTE FUNCTION pawpal_private.protect_signed_record()`
- `audit_log.v1_actor`: `CREATE TRIGGER v1_actor BEFORE INSERT ON public.audit_log FOR EACH ROW EXECUTE FUNCTION pawpal_private.audit_actor()`
- `audit_log.v1_immutable`: `CREATE TRIGGER v1_immutable BEFORE DELETE OR UPDATE ON public.audit_log FOR EACH ROW EXECUTE FUNCTION pawpal_private.immutable_event()`
- `banner.v1_updated`: `CREATE TRIGGER v1_updated BEFORE UPDATE ON public.banner FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at()`
- `blog_category.v1_updated`: `CREATE TRIGGER v1_updated BEFORE UPDATE ON public.blog_category FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at()`
- `blog_post.v1_updated`: `CREATE TRIGGER v1_updated BEFORE UPDATE ON public.blog_post FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at()`
- `care_action.v1_updated`: `CREATE TRIGGER v1_updated BEFORE UPDATE ON public.care_action FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at()`
- `care_log.v1_updated`: `CREATE TRIGGER v1_updated BEFORE UPDATE ON public.care_log FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at()`
- `cart.v1_updated`: `CREATE TRIGGER v1_updated BEFORE UPDATE ON public.cart FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at()`
- `cart_item.v1_updated`: `CREATE TRIGGER v1_updated BEFORE UPDATE ON public.cart_item FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at()`
- `chat_conversation.v1_updated`: `CREATE TRIGGER v1_updated BEFORE UPDATE ON public.chat_conversation FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at()`
- `chat_message.v1_sender`: `CREATE TRIGGER v1_sender BEFORE INSERT OR UPDATE ON public.chat_message FOR EACH ROW EXECUTE FUNCTION pawpal_private.validate_message_sender()`
- `chatbot_knowledge_faq.v1_updated`: `CREATE TRIGGER v1_updated BEFORE UPDATE ON public.chatbot_knowledge_faq FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at()`
- `chatbot_system_prompt.v1_updated`: `CREATE TRIGGER v1_updated BEFORE UPDATE ON public.chatbot_system_prompt FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at()`
- `customer.v1_portal_identity`: `CREATE TRIGGER v1_portal_identity BEFORE INSERT OR UPDATE OF auth_user_id ON public.customer FOR EACH ROW EXECUTE FUNCTION pawpal_private.check_portal_identity()`
- `customer.v1_updated`: `CREATE TRIGGER v1_updated BEFORE UPDATE ON public.customer FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at()`
- `customer_address.v1_contact_default`: `CREATE CONSTRAINT TRIGGER v1_contact_default AFTER INSERT OR DELETE OR UPDATE ON public.customer_address DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION pawpal_private.check_contact_default()`
- `customer_address.v1_lock_contact`: `CREATE TRIGGER v1_lock_contact BEFORE INSERT OR DELETE OR UPDATE ON public.customer_address FOR EACH ROW EXECUTE FUNCTION pawpal_private.lock_contact_parent()`
- `customer_address.v1_updated`: `CREATE TRIGGER v1_updated BEFORE UPDATE ON public.customer_address FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at()`
- `customer_membership.v1_updated`: `CREATE TRIGGER v1_updated BEFORE UPDATE ON public.customer_membership FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at()`
- `customer_phone.v1_contact_default`: `CREATE CONSTRAINT TRIGGER v1_contact_default AFTER INSERT OR DELETE OR UPDATE ON public.customer_phone DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION pawpal_private.check_contact_default()`
- `customer_phone.v1_lock_contact`: `CREATE TRIGGER v1_lock_contact BEFORE INSERT OR DELETE OR UPDATE ON public.customer_phone FOR EACH ROW EXECUTE FUNCTION pawpal_private.lock_contact_parent()`
- `customer_phone.v1_updated`: `CREATE TRIGGER v1_updated BEFORE UPDATE ON public.customer_phone FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at()`
- `customer_profile.v1_updated`: `CREATE TRIGGER v1_updated BEFORE UPDATE ON public.customer_profile FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at()`
- `hotel_booking.v1_updated`: `CREATE TRIGGER v1_updated BEFORE UPDATE ON public.hotel_booking FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at()`
- `hotel_room.v1_updated`: `CREATE TRIGGER v1_updated BEFORE UPDATE ON public.hotel_room FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at()`
- `hotel_room_type.v1_updated`: `CREATE TRIGGER v1_updated BEFORE UPDATE ON public.hotel_room_type FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at()`
- `inventory_transaction.v1_audit_event`: `CREATE TRIGGER v1_audit_event AFTER INSERT OR UPDATE ON public.inventory_transaction FOR EACH ROW EXECUTE FUNCTION pawpal_private.audit_money()`
- `inventory_transaction.v1_immutable`: `CREATE TRIGGER v1_immutable BEFORE DELETE OR UPDATE ON public.inventory_transaction FOR EACH ROW EXECUTE FUNCTION pawpal_private.immutable_event()`
- `inventory_transaction.v1_inventory`: `CREATE TRIGGER v1_inventory BEFORE INSERT ON public.inventory_transaction FOR EACH ROW EXECUTE FUNCTION pawpal_private.record_inventory()`
- `membership_tier.v1_updated`: `CREATE TRIGGER v1_updated BEFORE UPDATE ON public.membership_tier FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at()`
- `paw_point_transaction.v1_audit_event`: `CREATE TRIGGER v1_audit_event AFTER INSERT OR UPDATE ON public.paw_point_transaction FOR EACH ROW EXECUTE FUNCTION pawpal_private.audit_money()`
- `paw_point_transaction.v1_immutable`: `CREATE TRIGGER v1_immutable BEFORE DELETE OR UPDATE ON public.paw_point_transaction FOR EACH ROW EXECUTE FUNCTION pawpal_private.immutable_event()`
- `paw_point_transaction.v1_points`: `CREATE TRIGGER v1_points BEFORE INSERT ON public.paw_point_transaction FOR EACH ROW EXECUTE FUNCTION pawpal_private.validate_points()`
- `pawpal_setting.v1_updated`: `CREATE TRIGGER v1_updated BEFORE UPDATE ON public.pawpal_setting FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at()`
- `payment.v1_audit_event`: `CREATE TRIGGER v1_audit_event AFTER INSERT OR UPDATE ON public.payment FOR EACH ROW EXECUTE FUNCTION pawpal_private.audit_money()`
- `payment.v1_money_check`: `CREATE CONSTRAINT TRIGGER v1_money_check AFTER INSERT OR DELETE OR UPDATE ON public.payment DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION pawpal_private.deferred_money_check()`
- `payment.v1_posted_delete`: `CREATE TRIGGER v1_posted_delete BEFORE DELETE ON public.payment FOR EACH ROW EXECUTE FUNCTION pawpal_private.protect_payment_delete()`
- `payment.v1_updated`: `CREATE TRIGGER v1_updated BEFORE UPDATE ON public.payment FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at()`
- `payment.v1_validate_payment`: `CREATE TRIGGER v1_validate_payment BEFORE INSERT OR UPDATE ON public.payment FOR EACH ROW EXECUTE FUNCTION pawpal_private.validate_payment()`
- `pet_breed.v1_updated`: `CREATE TRIGGER v1_updated BEFORE UPDATE ON public.pet_breed FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at()`
- `pet_profile.v1_updated`: `CREATE TRIGGER v1_updated BEFORE UPDATE ON public.pet_profile FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at()`
- `pet_species.v1_updated`: `CREATE TRIGGER v1_updated BEFORE UPDATE ON public.pet_species FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at()`
- `product.v1_updated`: `CREATE TRIGGER v1_updated BEFORE UPDATE ON public.product FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at()`
- `product_category.v1_updated`: `CREATE TRIGGER v1_updated BEFORE UPDATE ON public.product_category FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at()`
- `product_media.v1_updated`: `CREATE TRIGGER v1_updated BEFORE UPDATE ON public.product_media FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at()`
- `product_variant.v1_updated`: `CREATE TRIGGER v1_updated BEFORE UPDATE ON public.product_variant FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at()`
- `product_variant_media.v1_updated`: `CREATE TRIGGER v1_updated BEFORE UPDATE ON public.product_variant_media FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at()`
- `promotion.v1_updated`: `CREATE TRIGGER v1_updated BEFORE UPDATE ON public.promotion FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at()`
- `purchase_order.v1_updated`: `CREATE TRIGGER v1_updated BEFORE UPDATE ON public.purchase_order FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at()`
- `refund_transaction.v1_audit_event`: `CREATE TRIGGER v1_audit_event AFTER INSERT OR UPDATE ON public.refund_transaction FOR EACH ROW EXECUTE FUNCTION pawpal_private.audit_money()`
- `refund_transaction.v1_money_check`: `CREATE CONSTRAINT TRIGGER v1_money_check AFTER INSERT OR DELETE OR UPDATE ON public.refund_transaction DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION pawpal_private.deferred_money_check()`
- `refund_transaction.v1_posted_delete`: `CREATE TRIGGER v1_posted_delete BEFORE DELETE ON public.refund_transaction FOR EACH ROW EXECUTE FUNCTION pawpal_private.protect_payment_delete()`
- `refund_transaction.v1_updated`: `CREATE TRIGGER v1_updated BEFORE UPDATE ON public.refund_transaction FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at()`
- `refund_transaction.v1_validate_refund`: `CREATE TRIGGER v1_validate_refund BEFORE INSERT OR UPDATE ON public.refund_transaction FOR EACH ROW EXECUTE FUNCTION pawpal_private.validate_refund()`
- `return_request.v1_updated`: `CREATE TRIGGER v1_updated BEFORE UPDATE ON public.return_request FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at()`
- `return_request_detail.v1_return_line`: `CREATE TRIGGER v1_return_line BEFORE INSERT OR UPDATE ON public.return_request_detail FOR EACH ROW EXECUTE FUNCTION pawpal_private.validate_return_line()`
- `review.v1_review`: `CREATE TRIGGER v1_review BEFORE INSERT OR UPDATE ON public.review FOR EACH ROW EXECUTE FUNCTION pawpal_private.validate_review()`
- `review.v1_updated`: `CREATE TRIGGER v1_updated BEFORE UPDATE ON public.review FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at()`
- `review_response.v1_updated`: `CREATE TRIGGER v1_updated BEFORE UPDATE ON public.review_response FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at()`
- `reward_rule.v1_updated`: `CREATE TRIGGER v1_updated BEFORE UPDATE ON public.reward_rule FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at()`
- `sales_order.v1_money_check`: `CREATE CONSTRAINT TRIGGER v1_money_check AFTER INSERT OR DELETE OR UPDATE ON public.sales_order DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION pawpal_private.deferred_money_check()`
- `sales_order.v1_updated`: `CREATE TRIGGER v1_updated BEFORE UPDATE ON public.sales_order FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at()`
- `sales_order_detail.v1_money_check`: `CREATE CONSTRAINT TRIGGER v1_money_check AFTER INSERT OR DELETE OR UPDATE ON public.sales_order_detail DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION pawpal_private.deferred_money_check()`
- `service.v1_updated`: `CREATE TRIGGER v1_updated BEFORE UPDATE ON public.service FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at()`
- `service_addon.v1_updated`: `CREATE TRIGGER v1_updated BEFORE UPDATE ON public.service_addon FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at()`
- `service_category.v1_updated`: `CREATE TRIGGER v1_updated BEFORE UPDATE ON public.service_category FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at()`
- `service_image.v1_updated`: `CREATE TRIGGER v1_updated BEFORE UPDATE ON public.service_image FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at()`
- `service_price_matrix.v1_updated`: `CREATE TRIGGER v1_updated BEFORE UPDATE ON public.service_price_matrix FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at()`
- `shipping_provider.v1_updated`: `CREATE TRIGGER v1_updated BEFORE UPDATE ON public.shipping_provider FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at()`
- `staff.v1_portal_identity`: `CREATE TRIGGER v1_portal_identity BEFORE INSERT OR UPDATE OF auth_user_id ON public.staff FOR EACH ROW EXECUTE FUNCTION pawpal_private.check_portal_identity()`
- `staff.v1_updated`: `CREATE TRIGGER v1_updated BEFORE UPDATE ON public.staff FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at()`
- `staff_assessment.v1_updated`: `CREATE TRIGGER v1_updated BEFORE UPDATE ON public.staff_assessment FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at()`
- `staff_level.v1_updated`: `CREATE TRIGGER v1_updated BEFORE UPDATE ON public.staff_level FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at()`
- `staff_schedule.v1_updated`: `CREATE TRIGGER v1_updated BEFORE UPDATE ON public.staff_schedule FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at()`
- `stock_reservation.v1_stock_reservation`: `CREATE TRIGGER v1_stock_reservation BEFORE INSERT OR UPDATE ON public.stock_reservation FOR EACH ROW EXECUTE FUNCTION pawpal_private.lock_reservation_variant()`
- `stock_reservation.v1_updated`: `CREATE TRIGGER v1_updated BEFORE UPDATE ON public.stock_reservation FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at()`
- `supplier.v1_updated`: `CREATE TRIGGER v1_updated BEFORE UPDATE ON public.supplier FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at()`
- `support_ticket.v1_ticket`: `CREATE TRIGGER v1_ticket BEFORE INSERT OR UPDATE ON public.support_ticket FOR EACH ROW EXECUTE FUNCTION pawpal_private.validate_ticket()`
- `support_ticket.v1_updated`: `CREATE TRIGGER v1_updated BEFORE UPDATE ON public.support_ticket FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at()`
- `support_ticket_message.v1_sender`: `CREATE TRIGGER v1_sender BEFORE INSERT OR UPDATE ON public.support_ticket_message FOR EACH ROW EXECUTE FUNCTION pawpal_private.validate_message_sender()`
- `taxi_price_rule.v1_updated`: `CREATE TRIGGER v1_updated BEFORE UPDATE ON public.taxi_price_rule FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at()`
- `taxi_trip.v1_updated`: `CREATE TRIGGER v1_updated BEFORE UPDATE ON public.taxi_trip FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at()`
- `variant_color.v1_updated`: `CREATE TRIGGER v1_updated BEFORE UPDATE ON public.variant_color FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at()`
- `variant_flavor.v1_updated`: `CREATE TRIGGER v1_updated BEFORE UPDATE ON public.variant_flavor FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at()`
- `variant_size.v1_updated`: `CREATE TRIGGER v1_updated BEFORE UPDATE ON public.variant_size FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at()`
- `voucher.v1_updated`: `CREATE TRIGGER v1_updated BEFORE UPDATE ON public.voucher FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at()`
- `voucher_redemption.v1_audit_event`: `CREATE TRIGGER v1_audit_event AFTER INSERT OR UPDATE ON public.voucher_redemption FOR EACH ROW EXECUTE FUNCTION pawpal_private.audit_money()`
- `voucher_redemption.v1_money_check`: `CREATE CONSTRAINT TRIGGER v1_money_check AFTER INSERT OR DELETE OR UPDATE ON public.voucher_redemption DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION pawpal_private.deferred_money_check()`
- `voucher_redemption.v1_voucher_use`: `CREATE TRIGGER v1_voucher_use BEFORE INSERT OR UPDATE ON public.voucher_redemption FOR EACH ROW EXECUTE FUNCTION pawpal_private.validate_voucher_use()`
- `wishlist.v1_updated`: `CREATE TRIGGER v1_updated BEFORE UPDATE ON public.wishlist FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at()`
