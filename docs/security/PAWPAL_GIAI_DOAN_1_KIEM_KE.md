# Bằng chứng rà soát giai đoạn 1

Thời điểm UTC: 2026-11-04T15:11:33.717Z. Project: cpzuvaplseielhgcnqrn.
Chỉ đọc PostgreSQL trong giao dịch READ ONLY: 5 truy vấn dữ liệu/catalog có phạm vi. Không đăng nhập Auth, không ghi nghiệp vụ, không đọc Cloud Logs; chỉ xuất thống kê tài khoản, không xuất tên, email, ID hoặc token.
Phân tích mã nguồn ghi nhận tên RPC/bảng truyền bằng chuỗi cố định và tên gateway/RPC từ registry chat_read_tools. Chưa chứng minh mọi đường gọi động, nhánh thực thi hay toàn bộ phụ thuộc lồng bên trong. Chưa chạy nghiệp vụ đầu cuối.

## Nhóm trạng thái tài khoản

| Trạng thái | Phải đổi mật khẩu | Khóa nhận việc | Có Auth | Auth bị khóa | Vai trò | Số hồ sơ |
|---|---|---|---|---|---|---|
| active | false | false | true | false | ADMIN | 1 |
| ACTIVE | true | false | true | true | none | 15 |
| resigned | true | false | true | true | none | 1 |

Khóa nhận việc (service_locked) khác khóa đăng nhập Auth. Chuẩn hóa trạng thái nhân sự không được thay ban Auth, tự bỏ yêu cầu đổi mật khẩu hoặc tự gán vai trò.

## Cột dữ liệu dùng xác định phạm vi

| Bảng | Cột |
|---|---|
| staff | id, full_name, phone_number, job_title, specialization, hire_date, email, address, dob, service_locked, created_at, updated_at, auth_user_id, staff_level_id, employment_status, must_change_password |
| staff_schedule | id, staff_id, availability_status, reason, schedule_status, created_at, updated_at, start_at, end_at |
| staff_assessment | id, staff_id, assessment_date, assessment_type, score, result, note, assessed_by, created_at, updated_at |
| staff_shift_request | id, request_type, staff_id, target_staff_id, replacement_staff_id, leave_type, start_date, end_date, shift, target_date, target_shift, reason, status, created_by, reviewed_by, reviewed_at, created_at |
| appointment | id, appointment_code, customer_id, pet_id, staff_id, check_in_time, check_out_time, note, change_count, appointment_status, created_at, updated_at, scheduled_start_at, scheduled_end_at |
| appointment_item | id, appointment_id, service_id, service_addon_id, is_primary, name_snapshot, quantity, unit_price, discount_amount, duration_minutes, weight_snapshot, staff_id, status, created_at, updated_at |
| appointment_record | id, appointment_id, record_type, schema_version, revision_no, recorded_by, recorded_at, condition_note, safety_note_snapshot, allergy_note_snapshot, customer_confirmation_status, confirmed_at, note, created_at |
| care_log | id, appointment_id, care_action_id, description, observed_condition, recorded_at, created_at, updated_at, recorded_by, action_name_snapshot |
| taxi_trip | id, appointment_id, driver_staff_id, pickup_address, dropoff_address, distance_km, trip_type, outbound_at, return_at, taxi_price_rule_id, quoted_amount, status, created_at, updated_at |
| hotel_booking | id, booking_code, room_id, appointment_id, check_in_at, check_out_at, status, special_diet_notes, care_notes, daily_price, created_at, updated_at |
| sales_order | id, order_code, customer_id, order_status, note, created_at, updated_at, shipping_fee_snapshot, receiver_name_snapshot, receiver_phone_snapshot, province_snapshot, street_address_snapshot, postal_code_snapshot, delivery_option_id, shipping_provider_id, tracking_code, shipped_at, delivered_at, shipping_status |
| sales_order_detail | id, order_id, product_variant_id, quantity, unit_price, discount_amount, product_name_snapshot, sku_snapshot |
| payment | id, payment_code, customer_id, payment_method_config_id, payment_type, amount, transaction_status, succeeded_at, created_at, updated_at, gateway_transaction_id, idempotency_key, order_id, appointment_id, eligible_spend_amount |
| refund_transaction | id, refund_code, ticket_id, payment_id, refund_type, requested_amount, approved_amount, refunded_amount, refund_method, refund_status, gateway_transaction_id, note, processed_by, processed_at, completed_at, created_at, updated_at, return_request_id, eligible_refund_amount |
| support_ticket | id, ticket_code, customer_id, order_id, appointment_id, channel, category, subject, description, priority, type, status, requested_resolution, requested_amount, assigned_staff_id, first_response_at, investigation_note, resolution_type, resolution_note, approved_amount, resolved_by, resolved_at, closed_at, rating, rating_comment, created_at, updated_at, created_by_account_id |
| support_ticket_message | id, ticket_id, sender_type, content, is_internal, created_at, sender_account_id, sender_guest_session_id |
| chat_conversation | id, customer_id, status, sentiment_level, sentiment_trend, is_urgent, assigned_staff_id, ai_summary, internal_note, sla_deadline, resolved_at, resolved_reason, resolved_by, violation_count, blocked_until, channel, created_at, updated_at, guest_session_id, session_token, bot_unhandled_count |
| chat_message | id, conversation_id, sender_type, content, raw_content, is_toxic, sentiment_score, metadata, created_at, sender_account_id, sender_guest_session_id |
| admin_copilot_history | id, session_id, staff_id, role, content, metadata, created_at |
| audit_log | id, staff_id, action, entity_name, entity_id, description, created_at |
| paw_point_transaction | id, customer_id, payment_id, review_id, reward_rule_id, points, description, created_at, refund_transaction_id, voucher_redemption_id, customer_voucher_id, idempotency_key, sequence_no |
| voucher_redemption | id, customer_voucher_id, voucher_id, order_id, appointment_id, discount_amount_snapshot, status, redeemed_at, reversed_at, idempotency_key, created_at |

## Quan hệ và ràng buộc

| Bảng | Ràng buộc | Định nghĩa |
|---|---|---|
| admin_copilot_history | admin_copilot_history_role_check | CHECK ((length(btrim(role)) > 0)) |
| admin_copilot_history | admin_copilot_history_staff_id_fkey | FOREIGN KEY (staff_id) REFERENCES staff(id) DEFERRABLE |
| appointment | appointment_appointment_code_check | CHECK ((length(btrim(appointment_code)) > 0)) |
| appointment | appointment_appointment_status_check | CHECK ((length(btrim(appointment_status)) > 0)) |
| appointment | appointment_change_count_check | CHECK ((change_count >= 0)) |
| appointment | appointment_check | CHECK ((scheduled_end_at > scheduled_start_at)) |
| appointment | appointment_check1 | CHECK (((check_out_time IS NULL) OR (check_out_time >= check_in_time))) |
| appointment | appointment_customer_id_fkey | FOREIGN KEY (customer_id) REFERENCES customer(id) DEFERRABLE |
| appointment | appointment_pet_id_fkey | FOREIGN KEY (pet_id) REFERENCES pet_profile(id) DEFERRABLE |
| appointment | appointment_staff_id_fkey | FOREIGN KEY (staff_id) REFERENCES staff(id) DEFERRABLE |
| appointment_item | appointment_item_appointment_id_fkey | FOREIGN KEY (appointment_id) REFERENCES appointment(id) DEFERRABLE |
| appointment_item | appointment_item_check | CHECK ((num_nonnulls(service_id, service_addon_id) = 1)) |
| appointment_item | appointment_item_check1 | CHECK ((discount_amount <= ((quantity)::numeric * unit_price))) |
| appointment_item | appointment_item_check2 | CHECK (((NOT is_primary) OR (service_id IS NOT NULL))) |
| appointment_item | appointment_item_discount_amount_check | CHECK ((discount_amount >= (0)::numeric)) |
| appointment_item | appointment_item_duration_minutes_check | CHECK ((duration_minutes >= 0)) |
| appointment_item | appointment_item_name_snapshot_check | CHECK ((length(btrim(name_snapshot)) > 0)) |
| appointment_item | appointment_item_quantity_check | CHECK ((quantity > 0)) |
| appointment_item | appointment_item_service_addon_id_fkey | FOREIGN KEY (service_addon_id) REFERENCES service_addon(id) DEFERRABLE |
| appointment_item | appointment_item_service_id_fkey | FOREIGN KEY (service_id) REFERENCES service(id) DEFERRABLE |
| appointment_item | appointment_item_staff_id_fkey | FOREIGN KEY (staff_id) REFERENCES staff(id) DEFERRABLE |
| appointment_item | appointment_item_status_check | CHECK ((length(btrim(status)) > 0)) |
| appointment_item | appointment_item_unit_price_check | CHECK ((unit_price >= (0)::numeric)) |
| appointment_item | appointment_item_weight_snapshot_check | CHECK ((weight_snapshot >= (0)::numeric)) |
| appointment_record | appointment_record_appointment_id_fkey | FOREIGN KEY (appointment_id) REFERENCES appointment(id) DEFERRABLE |
| appointment_record | appointment_record_check | CHECK (((customer_confirmation_status = 'confirmed'::text) = (confirmed_at IS NOT NULL))) |
| appointment_record | appointment_record_condition_note_check | CHECK ((length(btrim(condition_note)) > 0)) |
| appointment_record | appointment_record_customer_confirmation_status_check | CHECK ((length(btrim(customer_confirmation_status)) > 0)) |
| appointment_record | appointment_record_customer_confirmation_status_check1 | CHECK ((customer_confirmation_status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'declined'::text]))) |
| appointment_record | appointment_record_record_type_check | CHECK ((length(btrim(record_type)) > 0)) |
| appointment_record | appointment_record_recorded_by_fkey | FOREIGN KEY (recorded_by) REFERENCES staff(id) DEFERRABLE |
| appointment_record | appointment_record_revision_no_check | CHECK ((revision_no >= 0)) |
| appointment_record | appointment_record_revision_no_check1 | CHECK ((revision_no > 0)) |
| appointment_record | appointment_record_schema_version_check | CHECK ((schema_version >= 0)) |
| appointment_record | appointment_record_schema_version_check1 | CHECK ((schema_version > 0)) |
| audit_log | audit_log_action_check | CHECK ((length(btrim(action)) > 0)) |
| audit_log | audit_log_staff_id_fkey | FOREIGN KEY (staff_id) REFERENCES staff(id) DEFERRABLE |
| care_log | care_log_action_name_snapshot_check | CHECK ((length(btrim(action_name_snapshot)) > 0)) |
| care_log | care_log_appointment_id_fkey | FOREIGN KEY (appointment_id) REFERENCES appointment(id) DEFERRABLE |
| care_log | care_log_care_action_id_fkey | FOREIGN KEY (care_action_id) REFERENCES care_action(id) DEFERRABLE |
| care_log | care_log_recorded_by_fkey | FOREIGN KEY (recorded_by) REFERENCES staff(id) DEFERRABLE |
| chat_conversation | chat_conversation_assigned_staff_id_fkey | FOREIGN KEY (assigned_staff_id) REFERENCES staff(id) DEFERRABLE |
| chat_conversation | chat_conversation_bot_unhandled_count_check | CHECK ((bot_unhandled_count >= 0)) |
| chat_conversation | chat_conversation_channel_check | CHECK ((length(btrim(channel)) > 0)) |
| chat_conversation | chat_conversation_check | CHECK ((num_nonnulls(customer_id, guest_session_id) >= 1)) |
| chat_conversation | chat_conversation_customer_id_fkey | FOREIGN KEY (customer_id) REFERENCES customer(id) DEFERRABLE |
| chat_conversation | chat_conversation_guest_session_id_fkey | FOREIGN KEY (guest_session_id) REFERENCES guest_session(id) DEFERRABLE |
| chat_conversation | chat_conversation_resolved_by_fkey | FOREIGN KEY (resolved_by) REFERENCES staff(id) DEFERRABLE |
| chat_conversation | chat_conversation_sentiment_level_check | CHECK ((sentiment_level >= 0)) |
| chat_conversation | chat_conversation_sentiment_level_fkey | FOREIGN KEY (sentiment_level) REFERENCES chatbot_sentiment_tier(level) DEFERRABLE |
| chat_conversation | chat_conversation_sentiment_trend_check | CHECK ((length(btrim(sentiment_trend)) > 0)) |
| chat_conversation | chat_conversation_status_check | CHECK ((length(btrim(status)) > 0)) |
| chat_conversation | chat_conversation_violation_count_check | CHECK ((violation_count >= 0)) |
| chat_message | chat_message_conversation_id_fkey | FOREIGN KEY (conversation_id) REFERENCES chat_conversation(id) DEFERRABLE |
| chat_message | chat_message_sender_account_id_fkey | FOREIGN KEY (sender_account_id) REFERENCES auth.users(id) DEFERRABLE |
| chat_message | chat_message_sender_guest_session_id_fkey | FOREIGN KEY (sender_guest_session_id) REFERENCES guest_session(id) DEFERRABLE |
| chat_message | chat_message_sender_type_check | CHECK ((length(btrim(sender_type)) > 0)) |
| hotel_booking | hotel_booking_appointment_id_fkey | FOREIGN KEY (appointment_id) REFERENCES appointment(id) DEFERRABLE |
| hotel_booking | hotel_booking_booking_code_check | CHECK ((length(btrim(booking_code)) > 0)) |
| hotel_booking | hotel_booking_check | CHECK ((check_out_at > check_in_at)) |
| hotel_booking | hotel_booking_daily_price_check | CHECK ((daily_price >= (0)::numeric)) |
| hotel_booking | hotel_booking_room_id_fkey | FOREIGN KEY (room_id) REFERENCES hotel_room(id) DEFERRABLE |
| hotel_booking | hotel_booking_status_check | CHECK ((length(btrim(status)) > 0)) |
| paw_point_transaction | paw_point_transaction_customer_id_fkey | FOREIGN KEY (customer_id) REFERENCES customer(id) DEFERRABLE |
| paw_point_transaction | paw_point_transaction_customer_voucher_id_fkey | FOREIGN KEY (customer_voucher_id) REFERENCES customer_voucher(id) DEFERRABLE |
| paw_point_transaction | paw_point_transaction_idempotency_key_check | CHECK ((length(btrim(idempotency_key)) > 0)) |
| paw_point_transaction | paw_point_transaction_payment_id_fkey | FOREIGN KEY (payment_id) REFERENCES payment(id) DEFERRABLE |
| paw_point_transaction | paw_point_transaction_refund_transaction_id_fkey | FOREIGN KEY (refund_transaction_id) REFERENCES refund_transaction(id) DEFERRABLE |
| paw_point_transaction | paw_point_transaction_review_id_fkey | FOREIGN KEY (review_id) REFERENCES review(id) DEFERRABLE |
| paw_point_transaction | paw_point_transaction_reward_rule_id_fkey | FOREIGN KEY (reward_rule_id) REFERENCES reward_rule(id) DEFERRABLE |
| paw_point_transaction | paw_point_transaction_sequence_no_check | CHECK ((sequence_no >= 0)) |
| paw_point_transaction | paw_point_transaction_voucher_redemption_id_fkey | FOREIGN KEY (voucher_redemption_id) REFERENCES voucher_redemption(id) DEFERRABLE |
| payment | payment_amount_check | CHECK ((amount >= (0)::numeric)) |
| payment | payment_amount_check1 | CHECK ((amount > (0)::numeric)) |
| payment | payment_appointment_id_fkey | FOREIGN KEY (appointment_id) REFERENCES appointment(id) DEFERRABLE |
| payment | payment_check | CHECK ((num_nonnulls(order_id, appointment_id) = 1)) |
| payment | payment_check1 | CHECK ((eligible_spend_amount <= amount)) |
| payment | payment_check2 | CHECK (((transaction_status = 'succeeded'::text) = (succeeded_at IS NOT NULL))) |
| payment | payment_check3 | CHECK (((transaction_status = 'succeeded'::text) OR (eligible_spend_amount = (0)::numeric))) |
| payment | payment_customer_id_fkey | FOREIGN KEY (customer_id) REFERENCES customer(id) DEFERRABLE |
| payment | payment_eligible_spend_amount_check | CHECK ((eligible_spend_amount >= (0)::numeric)) |
| payment | payment_idempotency_key_check | CHECK ((length(btrim(idempotency_key)) > 0)) |
| payment | payment_order_id_fkey | FOREIGN KEY (order_id) REFERENCES sales_order(id) DEFERRABLE |
| payment | payment_payment_code_check | CHECK ((length(btrim(payment_code)) > 0)) |
| payment | payment_payment_method_config_id_fkey | FOREIGN KEY (payment_method_config_id) REFERENCES payment_method_config(id) DEFERRABLE |
| payment | payment_payment_type_check | CHECK ((length(btrim(payment_type)) > 0)) |
| payment | payment_transaction_status_check | CHECK ((length(btrim(transaction_status)) > 0)) |
| payment | payment_transaction_status_check1 | CHECK ((transaction_status = ANY (ARRAY['pending'::text, 'succeeded'::text, 'failed'::text, 'cancelled'::text]))) |
| refund_transaction | refund_transaction_approved_amount_check | CHECK ((approved_amount >= (0)::numeric)) |
| refund_transaction | refund_transaction_check | CHECK ((eligible_refund_amount <= refunded_amount)) |
| refund_transaction | refund_transaction_check1 | CHECK ((refunded_amount <= approved_amount)) |
| refund_transaction | refund_transaction_check2 | CHECK ((approved_amount <= requested_amount)) |
| refund_transaction | refund_transaction_check3 | CHECK (((refund_status = 'succeeded'::text) = (completed_at IS NOT NULL))) |
| refund_transaction | refund_transaction_check4 | CHECK (((refund_status = 'succeeded'::text) OR (eligible_refund_amount = (0)::numeric))) |
| refund_transaction | refund_transaction_eligible_refund_amount_check | CHECK ((eligible_refund_amount >= (0)::numeric)) |
| refund_transaction | refund_transaction_payment_id_fkey | FOREIGN KEY (payment_id) REFERENCES payment(id) DEFERRABLE |
| refund_transaction | refund_transaction_processed_by_fkey | FOREIGN KEY (processed_by) REFERENCES staff(id) DEFERRABLE |
| refund_transaction | refund_transaction_refund_code_check | CHECK ((length(btrim(refund_code)) > 0)) |
| refund_transaction | refund_transaction_refund_method_check | CHECK ((length(btrim(refund_method)) > 0)) |
| refund_transaction | refund_transaction_refund_status_check | CHECK ((length(btrim(refund_status)) > 0)) |
| refund_transaction | refund_transaction_refund_status_check1 | CHECK ((refund_status = ANY (ARRAY['pending'::text, 'approved'::text, 'succeeded'::text, 'failed'::text, 'cancelled'::text]))) |
| refund_transaction | refund_transaction_refund_type_check | CHECK ((length(btrim(refund_type)) > 0)) |
| refund_transaction | refund_transaction_refunded_amount_check | CHECK ((refunded_amount >= (0)::numeric)) |
| refund_transaction | refund_transaction_requested_amount_check | CHECK ((requested_amount >= (0)::numeric)) |
| refund_transaction | refund_transaction_return_request_id_fkey | FOREIGN KEY (return_request_id) REFERENCES return_request(id) DEFERRABLE |
| refund_transaction | refund_transaction_ticket_id_fkey | FOREIGN KEY (ticket_id) REFERENCES support_ticket(id) DEFERRABLE |
| sales_order | sales_order_customer_id_fkey | FOREIGN KEY (customer_id) REFERENCES customer(id) DEFERRABLE |
| sales_order | sales_order_delivery_option_id_fkey | FOREIGN KEY (delivery_option_id) REFERENCES delivery_option_config(id) DEFERRABLE |
| sales_order | sales_order_order_code_check | CHECK ((length(btrim(order_code)) > 0)) |
| sales_order | sales_order_order_status_check | CHECK ((length(btrim(order_status)) > 0)) |
| sales_order | sales_order_shipping_fee_snapshot_check | CHECK ((shipping_fee_snapshot >= (0)::numeric)) |
| sales_order | sales_order_shipping_provider_id_fkey | FOREIGN KEY (shipping_provider_id) REFERENCES shipping_provider(id) DEFERRABLE |
| sales_order_detail | sales_order_detail_check | CHECK ((discount_amount <= ((quantity)::numeric * unit_price))) |
| sales_order_detail | sales_order_detail_discount_amount_check | CHECK ((discount_amount >= (0)::numeric)) |
| sales_order_detail | sales_order_detail_order_id_fkey | FOREIGN KEY (order_id) REFERENCES sales_order(id) DEFERRABLE |
| sales_order_detail | sales_order_detail_product_name_snapshot_check | CHECK ((length(btrim(product_name_snapshot)) > 0)) |
| sales_order_detail | sales_order_detail_product_variant_id_fkey | FOREIGN KEY (product_variant_id) REFERENCES product_variant(id) DEFERRABLE |
| sales_order_detail | sales_order_detail_quantity_check | CHECK ((quantity > 0)) |
| sales_order_detail | sales_order_detail_sku_snapshot_check | CHECK ((length(btrim(sku_snapshot)) > 0)) |
| sales_order_detail | sales_order_detail_unit_price_check | CHECK ((unit_price >= (0)::numeric)) |
| staff | staff_auth_user_id_fkey | FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) DEFERRABLE |
| staff | staff_employment_status_check | CHECK ((length(btrim(employment_status)) > 0)) |
| staff | staff_full_name_check | CHECK ((length(btrim(full_name)) > 0)) |
| staff | staff_job_title_check | CHECK ((length(btrim(job_title)) > 0)) |
| staff | staff_staff_level_id_fkey | FOREIGN KEY (staff_level_id) REFERENCES staff_level(id) DEFERRABLE |
| staff_assessment | staff_assessment_assessed_by_fkey | FOREIGN KEY (assessed_by) REFERENCES staff(id) DEFERRABLE |
| staff_assessment | staff_assessment_assessment_type_check | CHECK ((length(btrim(assessment_type)) > 0)) |
| staff_assessment | staff_assessment_result_check | CHECK ((length(btrim(result)) > 0)) |
| staff_assessment | staff_assessment_score_check | CHECK (((score >= (0)::numeric) AND (score <= (100)::numeric))) |
| staff_assessment | staff_assessment_staff_id_fkey | FOREIGN KEY (staff_id) REFERENCES staff(id) DEFERRABLE |
| staff_schedule | staff_schedule_availability_status_check | CHECK ((length(btrim(availability_status)) > 0)) |
| staff_schedule | staff_schedule_check | CHECK ((end_at > start_at)) |
| staff_schedule | staff_schedule_schedule_status_check | CHECK ((length(btrim(schedule_status)) > 0)) |
| staff_schedule | staff_schedule_staff_id_fkey | FOREIGN KEY (staff_id) REFERENCES staff(id) DEFERRABLE |
| staff_shift_request | staff_shift_request_check | CHECK ((end_date >= start_date)) |
| staff_shift_request | staff_shift_request_created_by_fkey | FOREIGN KEY (created_by) REFERENCES auth.users(id) DEFERRABLE |
| staff_shift_request | staff_shift_request_reason_check | CHECK ((length(btrim(reason)) > 0)) |
| staff_shift_request | staff_shift_request_replacement_staff_id_fkey | FOREIGN KEY (replacement_staff_id) REFERENCES staff(id) DEFERRABLE |
| staff_shift_request | staff_shift_request_request_type_check | CHECK ((length(btrim(request_type)) > 0)) |
| staff_shift_request | staff_shift_request_reviewed_by_fkey | FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) DEFERRABLE |
| staff_shift_request | staff_shift_request_shift_check | CHECK ((length(btrim(shift)) > 0)) |
| staff_shift_request | staff_shift_request_staff_id_fkey | FOREIGN KEY (staff_id) REFERENCES staff(id) DEFERRABLE |
| staff_shift_request | staff_shift_request_status_check | CHECK ((length(btrim(status)) > 0)) |
| staff_shift_request | staff_shift_request_target_staff_id_fkey | FOREIGN KEY (target_staff_id) REFERENCES staff(id) DEFERRABLE |
| support_ticket | support_ticket_appointment_id_fkey | FOREIGN KEY (appointment_id) REFERENCES appointment(id) DEFERRABLE |
| support_ticket | support_ticket_approved_amount_check | CHECK ((approved_amount >= (0)::numeric)) |
| support_ticket | support_ticket_assigned_staff_id_fkey | FOREIGN KEY (assigned_staff_id) REFERENCES staff(id) DEFERRABLE |
| support_ticket | support_ticket_category_check | CHECK ((length(btrim(category)) > 0)) |
| support_ticket | support_ticket_channel_check | CHECK ((length(btrim(channel)) > 0)) |
| support_ticket | support_ticket_created_by_account_id_fkey | FOREIGN KEY (created_by_account_id) REFERENCES auth.users(id) DEFERRABLE |
| support_ticket | support_ticket_customer_id_fkey | FOREIGN KEY (customer_id) REFERENCES customer(id) DEFERRABLE |
| support_ticket | support_ticket_order_id_fkey | FOREIGN KEY (order_id) REFERENCES sales_order(id) DEFERRABLE |
| support_ticket | support_ticket_priority_check | CHECK ((length(btrim(priority)) > 0)) |
| support_ticket | support_ticket_rating_check | CHECK ((rating >= 0)) |
| support_ticket | support_ticket_rating_check1 | CHECK (((rating >= 1) AND (rating <= 5))) |
| support_ticket | support_ticket_requested_amount_check | CHECK ((requested_amount >= (0)::numeric)) |
| support_ticket | support_ticket_resolved_by_fkey | FOREIGN KEY (resolved_by) REFERENCES staff(id) DEFERRABLE |
| support_ticket | support_ticket_status_check | CHECK ((length(btrim(status)) > 0)) |
| support_ticket | support_ticket_subject_check | CHECK ((length(btrim(subject)) > 0)) |
| support_ticket | support_ticket_ticket_code_check | CHECK ((length(btrim(ticket_code)) > 0)) |
| support_ticket | support_ticket_type_check | CHECK ((length(btrim(type)) > 0)) |
| support_ticket_message | support_ticket_message_sender_account_id_fkey | FOREIGN KEY (sender_account_id) REFERENCES auth.users(id) DEFERRABLE |
| support_ticket_message | support_ticket_message_sender_guest_session_id_fkey | FOREIGN KEY (sender_guest_session_id) REFERENCES guest_session(id) DEFERRABLE |
| support_ticket_message | support_ticket_message_sender_type_check | CHECK ((length(btrim(sender_type)) > 0)) |
| support_ticket_message | support_ticket_message_ticket_id_fkey | FOREIGN KEY (ticket_id) REFERENCES support_ticket(id) DEFERRABLE |
| taxi_trip | taxi_trip_appointment_id_fkey | FOREIGN KEY (appointment_id) REFERENCES appointment(id) DEFERRABLE |
| taxi_trip | taxi_trip_distance_km_check | CHECK ((distance_km >= (0)::numeric)) |
| taxi_trip | taxi_trip_driver_staff_id_fkey | FOREIGN KEY (driver_staff_id) REFERENCES staff(id) DEFERRABLE |
| taxi_trip | taxi_trip_dropoff_address_check | CHECK ((length(btrim(dropoff_address)) > 0)) |
| taxi_trip | taxi_trip_pickup_address_check | CHECK ((length(btrim(pickup_address)) > 0)) |
| taxi_trip | taxi_trip_quoted_amount_check | CHECK ((quoted_amount >= (0)::numeric)) |
| taxi_trip | taxi_trip_status_check | CHECK ((length(btrim(status)) > 0)) |
| taxi_trip | taxi_trip_taxi_price_rule_id_fkey | FOREIGN KEY (taxi_price_rule_id) REFERENCES taxi_price_rule(id) DEFERRABLE |
| taxi_trip | taxi_trip_trip_type_check | CHECK ((length(btrim(trip_type)) > 0)) |
| voucher_redemption | voucher_redemption_appointment_id_fkey | FOREIGN KEY (appointment_id) REFERENCES appointment(id) DEFERRABLE |
| voucher_redemption | voucher_redemption_check | CHECK ((num_nonnulls(order_id, appointment_id) = 1)) |
| voucher_redemption | voucher_redemption_check1 | CHECK (((status = 'reversed'::text) = (reversed_at IS NOT NULL))) |
| voucher_redemption | voucher_redemption_customer_voucher_id_fkey | FOREIGN KEY (customer_voucher_id) REFERENCES customer_voucher(id) DEFERRABLE |
| voucher_redemption | voucher_redemption_discount_amount_snapshot_check | CHECK ((discount_amount_snapshot >= (0)::numeric)) |
| voucher_redemption | voucher_redemption_idempotency_key_check | CHECK ((length(btrim(idempotency_key)) > 0)) |
| voucher_redemption | voucher_redemption_order_id_fkey | FOREIGN KEY (order_id) REFERENCES sales_order(id) DEFERRABLE |
| voucher_redemption | voucher_redemption_status_check | CHECK ((length(btrim(status)) > 0)) |
| voucher_redemption | voucher_redemption_status_check1 | CHECK ((status = ANY (ARRAY['applied'::text, 'reversed'::text, 'cancelled'::text]))) |
| voucher_redemption | voucher_redemption_voucher_id_fkey | FOREIGN KEY (voucher_id) REFERENCES voucher(id) DEFERRABLE |

## Trigger nhân sự

| Bảng | Trigger | Định nghĩa |
|---|---|---|
| staff | require_staff_phone | CREATE TRIGGER require_staff_phone BEFORE INSERT OR UPDATE OF phone_number ON public.staff FOR EACH ROW EXECUTE FUNCTION pawpal_private.require_staff_phone() |
| staff | staff_phone_duplicate | CREATE TRIGGER staff_phone_duplicate BEFORE INSERT OR UPDATE OF phone_number, employment_status ON public.staff FOR EACH ROW EXECUTE FUNCTION pawpal_private.guard_staff_phone_duplicate() |
| staff | v1_portal_identity | CREATE TRIGGER v1_portal_identity BEFORE INSERT OR UPDATE OF auth_user_id ON public.staff FOR EACH ROW EXECUTE FUNCTION pawpal_private.check_portal_identity() |
| staff | v1_staff_direct_update | CREATE TRIGGER v1_staff_direct_update BEFORE UPDATE ON public.staff FOR EACH ROW EXECUTE FUNCTION pawpal_private.guard_staff_direct_update() |
| staff | v1_updated | CREATE TRIGGER v1_updated BEFORE UPDATE ON public.staff FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at() |
| staff | validate_staff_contact | CREATE TRIGGER validate_staff_contact BEFORE INSERT OR UPDATE OF phone_number, email, dob, hire_date ON public.staff FOR EACH ROW EXECUTE FUNCTION pawpal_private.validate_staff_contact() |
| staff | validate_staff_name | CREATE TRIGGER validate_staff_name BEFORE INSERT OR UPDATE OF full_name ON public.staff FOR EACH ROW EXECUTE FUNCTION pawpal_private.validate_staff_name() |

## Nguồn gọi RPC và đọc bảng

| File | RPC chuỗi cố định | Bảng/view chuỗi cố định | SHA256 |
|---|---|---|---|
| pages/admin/login/login.js | get_staff_login_context |  | e6eb63761c8d987f718f1334ebf3b499392096a7beb13e3d05d9cd837a560947 |
| pages/admin/modules/chatbot/chatbot.js | get_admin_chat_inbox_view, get_admin_chat_messages_bounded, get_admin_chat_customer_panel |  | 449da46f7d3b3ec759f19cfae35414183ffc54ee7f1ed6696ac0e4bf4dc918a7 |
| pages/admin/modules/chatbot/subtabs/tab-chatbot-live.js | admin_chat_canned_page, read_admin_chat_raw_bounded, read_admin_chat_message_part, act_admin_chat, get_admin_chat_point_policies, adjust_admin_chat_points, create_chat_complaint, get_admin_chat_handlers_bounded, transfer_admin_chat, resolve_admin_chat | sales_order | e1c4ab2b842c942e26f8b2e12b05cc38b4849f1aeb7d9a55d70e99764180f5e0 |
| pages/admin/modules/chatbot/subtabs/tab-chatbot-rules.js | save_admin_chat_rule, admin_chat_rule_counts, admin_chat_rule_page_bounded | chatbot_knowledge_faq, chatbot_profanity_filter, chatbot_canned_response | 49a33fe2db9e81d39d3e9b58c6d3fad7bae8b6fcd7f70d656aec870e0d843854 |
| pages/admin/modules/complaints/complaints.js | admin_complaint_page, create_admin_complaint | support_ticket_message | 641766ea219b19b0fa2bb98c33ae980f9dc484afcd52b2b43600de9815a7c607 |
| pages/admin/modules/complaints/subtabs/tab-complaint-detail.js | act_admin_complaint, get_admin_complaint_handlers, assign_admin_complaint | support_ticket_message, support_ticket_message_attachment, audit_log, appointment_record, care_log, refund_transaction, return_request | 8c7f477c7dcce94bc47aa323c974ed8f1d0a534f3fba9d78f2f1dbaecb311d32 |
| pages/admin/modules/customers/customers.js | admin_customer_page, admin_pawpoint_page | pet_species, pet_breed, sales_order, appointment, support_ticket, sales_order_totals, payment | 32da1f19e7156466242c942021547fed79a88d4d17ae24a2a37cfbf3c72e2f9e |
| pages/admin/modules/customers/subtabs/tab-customer-list.js | create_customer_quick, set_customer_status | pet_species, pet_breed | 228d22120a6653d2375bbcdcca5e139e1b2c61311ad10c9194b68b670de41eb3 |
| pages/admin/modules/customers/subtabs/tab-customer-pawpoint.js | adjust_customer_points |  | 06ca004f81c69e022ecf242bbb0d28f3567e4b9f034f75fbcfa8c274d366f595 |
| pages/admin/modules/customers/subtabs/tab-customer-profile.js | remove_customer_pet, update_customer_profile, add_customer_pet, update_customer_pet, save_customer_note |  | a0c1ab55cc26dc144898edddfb6a1b01b880def58f7ad494e6d39c5a7130d2be |
| pages/admin/modules/dashboard/dashboard.js | get_admin_dashboard_cashflow, get_admin_dashboard_low_stock | appointment, customer, pet_profile, chat_conversation | 555d2a513fdd657bef3a6d5f9ac4d0da77a703c2a5ba3b785ff15e6b427bdca8 |
| pages/admin/modules/orders/orders.js | get_admin_sales_order_history, search_admin_sales_customers, search_admin_sales_variants, get_admin_sales_inventory_choices, get_admin_sales_stock_history_page, get_admin_sales_product_page, get_admin_sales_order_page | product_category, product, stock_reservation, sales_order, sales_order_totals, return_request, voucher_redemption, customer, customer_point_balance, voucher | d1843c22fdcfa3c4cd183e0da929c00c10124225ef5cb61f2674764f2332296b |
| pages/admin/modules/orders/subtabs/tab-order-detail.js | save_admin_sales_return |  | 91404bea3239654a58be8cdde0179f9edf46c0305bf4cce59777839033e3881d |
| pages/admin/modules/orders/subtabs/tab-order-list.js | quote_admin_sales_order, create_admin_sales_order, create_customer_quick, post_admin_sales_money, get_admin_sales_cashier, update_admin_sales_order, dispatch_admin_sales_batch | delivery_option_config, payment_method_config, pawpal_setting, shipping_provider | 898d0f780b705525abf9d0179c39b376292b33edc6f3e8224af5fc591886dd1c |
| pages/admin/modules/orders/subtabs/tab-order-products.js | save_admin_sales_product, adjust_admin_sales_stock, post_admin_sales_inventory_batch, reply_admin_sales_review, get_admin_sales_review_page | supplier, review | 8e3033c99a5718d364b2361bce21fa6a7b9d999103a10593fb6b23deb7976aa6 |
| pages/admin/modules/orders/subtabs/tab-order-promos.js | save_admin_sales_voucher |  | 7ad0c39ea007511a6f7559809c82e859449e3ec049b31a7291f577a783f69d11 |
| pages/admin/modules/orders/subtabs/tab-sales-replacements.js | create_admin_sales_replacement |  | 436e1fff00c6b36e5f23dbb76e3cabb6bddc72a0a6703f7a8d9e9bc41ad79b74 |
| pages/admin/modules/pets/pets.js | admin_pet_page, get_admin_pet_reminder_sources, save_admin_pet, record_admin_pet_weight | pet_weight_history, care_log, appointment, appointment_totals | 488253cd9e0b767fd3a2e72109bbbe2436b202cc6584fdc8ed2782fe390151be |
| pages/admin/modules/pets/subtabs/tab-pet-list.js | create_customer_quick |  | a1a1e10e3466a5ea59cb33684f72d763291fac4213ef7cb0cd77b82e236ee0c4 |
| pages/admin/modules/pets/subtabs/tab-pet-reminders.js | record_pet_contact |  | 08bb1835752633f1b209b0eb19bc86e0029927fb5f5695029d6608477196ea86 |
| pages/admin/modules/services/services.js | close_admin_hotel_stay, save_admin_pickup_notification, post_admin_service_money, create_admin_service_ticket, save_admin_service_record, change_admin_service_charge, save_admin_service_care_log, admin_service_staff_candidates, get_admin_service_booking_page | pet_current_weight, customer, pet_profile, pet_weight_history, hotel_room, appointment, appointment_totals, payment, service, service_price_matrix, pet_species, staff_level, hotel_room_type, taxi_price_rule, support_ticket, review, care_log | d338eeb6b1e6e13578c4ad91c92f626e615b4637c4383de930bfce525623a45d |
| pages/admin/modules/services/subtabs/tab-service-bookings.js | update_admin_service_booking, record_admin_pet_weight | staff_schedule, pet_profile | b0c13742b907b28cfb1d5f8545cdd1d6adcb98c9330b79fc94aa365e001211fb |
| pages/admin/modules/services/subtabs/tab-service-cashier.js | get_admin_service_cashier |  | e7cf7bdf24492b854166fe37b018fab987fb1574a6a4c88ff28723028ad48eb7 |
| pages/admin/modules/services/subtabs/tab-service-catalog.js | save_admin_service_catalog |  | 02e11bdf5911a21fb94679f7da76156d60cde47f1d512e7df33a5e39e626804c |
| pages/admin/modules/services/subtabs/tab-service-detail.js |  | pet_current_weight, service_price_matrix | 28cabeff5ae305cb106d4eaedbc8d79c505903110feb57d9981865f065b32368 |
| pages/admin/modules/services/subtabs/tab-service-reviews.js | moderate_admin_service_review, reply_admin_service_review |  | a3b96ece446a96738c706fc5bb0616d6f20c619e66ab52dd2fd45a8f1994e86e |
| pages/admin/modules/services/subtabs/tab-service-support.js |  | support_ticket | 5c019c15459153fb1b93e8bcb3230f4b6090ffae75e0ec535a6c4c9bcdcda56b |
| pages/admin/modules/settings/settings.js | save_admin_setting_record, save_admin_shipping_settings, get_staff_login_context | audit_log, blog_category, service, product | c32782480164fa1d9cf3a63525564ece9043483b8deb07de4f10d20402392ff4 |
| pages/admin/modules/settings/subtabs/tab-settings-audit.js |  | audit_log | 1c76b95888450760b6027ba7a598cdddf4f3fb6f654d60d9e82f22cfe2ee3778 |
| pages/admin/modules/settings/subtabs/tab-settings-content.js | sync_admin_article_knowledge |  | 353b388303eb15036c555de26ba010aa3526f49cfb135e3e2083fcaa5ad9011f |
| pages/admin/modules/staff/staff.js | admin_staff_directory_summary, admin_staff_schedule_summary, admin_staff_assessment_summary, admin_staff_assessment_page, admin_staff_list_page, admin_staff_directory_page | staff_schedule, staff_shift_request, staff_assessment | d3f2fecc2e7cdc8c635cf5d67f7bb0108a78004a7ce913f29d92204c191db6fb |
| pages/admin/modules/staff/subtabs/tab-staff-assessment.js | save_admin_staff_assessment |  | 2f05fd5f7e18203488ab10de3b6f477ed2cf22c7743d9c24ffb60ff69b549111 |
| pages/admin/modules/staff/subtabs/tab-staff-list.js | handover_admin_staff_work, set_admin_staff_access, save_admin_staff_profile | appointment, access_role, permission, role_permission | 3c016b711d233b62bb2db65aba976bfa84fed11899e529dbf32b864cf4f8add8 |
| pages/admin/modules/staff/subtabs/tab-staff-schedule.js | save_admin_staff_schedule, review_admin_staff_shift_request, save_admin_staff_shift_request, record_admin_staff_incident | appointment | 317ef9532821a6340c8626fa5f8b10da4ae8465f090bfd603d04062200c82d84 |
| scripts/api/staff_auth.js | get_staff_login_context, create_admin_staff_profile, finish_admin_staff_provision, begin_admin_staff_auth_action, finish_admin_staff_auth_action | audit_log, access_role, permission, staff | ebe0c8a76f7490ba1c70d5978b0afb2ea45160f622162e60def181718140b971 |
| api/admin-chat.js | get_ai_key_pool_state, claim_ai_api_key, finish_ai_api_key, open_public_chat, read_public_chat_page, read_public_chat_part, set_public_chat_mode, read_public_guest_advice, read_public_chat_catalog, search_public_chat_context, post_public_chat_message, save_chat_feedback, read_admin_chat_message_part, admin_copilot_sessions_bounded, admin_copilot_history_page, read_admin_chat_benchmark_snapshot, save_admin_chat_benchmark, delete_admin_copilot_session | customer, guest_session, chat_conversation, chat_message, admin_copilot_history | 1350bbda8bba76ae5dc92cfc4d787adcfdb0e55cc0225a7b5180bf19579d11f8 |

## Registry công cụ chatbot

| Intent | Gateway | RPC nền | Quyền hiện tại |
|---|---|---|---|
| appointment.list | run_admin_chat_read | admin_copilot_facts | appointment.read, appointment_item.read, service.read, service_category.read |
| inventory.low_stock | run_admin_chat_read | admin_copilot_facts | inventory.read, product_variant.read, product.read |
| ticket.open | run_admin_chat_read | admin_copilot_facts | support_ticket.read |
| customer.lookup | run_admin_chat_read | admin_copilot_facts | customer.read, customer_profile.read, customer_phone.read |
| order.lookup | run_admin_chat_read | admin_copilot_facts | sales_order.read |
| catalog.product | run_admin_chat_read | admin_copilot_facts | product.read, product_variant.read |
| catalog.service | run_admin_chat_read | admin_copilot_facts | service.read |
| catalog.service_price | run_admin_chat_read | admin_copilot_extended_facts | service.read, service_category.read |
| revenue.summary | run_admin_chat_read | admin_copilot_extended_facts | payment.read, refund_transaction.read |
| knowledge.search | run_admin_chat_read | admin_copilot_extended_facts | chatbot_knowledge_faq.read |
| conversation.context | run_admin_chat_read | admin_copilot_chat_context | chat_conversation.read, chat_message.read |
| history.context | run_admin_chat_read | admin_copilot_recent_context | admin_copilot_history.read |
| customer.pets | run_admin_stage3_read | admin_copilot_facts | customer.read, customer_profile.read, customer_phone.read, pet_profile.read, pet_breed.read, pet_species.read |
| pet.lookup | run_admin_stage3_read | admin_copilot_facts | pet_profile.read, pet_breed.read, pet_species.read |
| payment.order | run_admin_stage3_read | admin_copilot_facts | sales_order.read, payment.read, refund_transaction.read |
| order.refund_pending | run_admin_stage3_read | admin_copilot_facts | sales_order.read, payment.read, refund_transaction.read |
| appointment.search | run_admin_stage3_read | admin_copilot_facts | appointment.read, appointment_item.read, service.read, service_category.read |
| ticket.lookup | run_admin_stage3_read | admin_copilot_facts | support_ticket.read |
| conversation.list | run_admin_stage3_read | admin_copilot_facts | chat_conversation.read, chat_message.read, customer.read, customer_profile.read |
| points.lookup | run_admin_stage3_read | admin_copilot_facts | customer.read, customer_profile.read, customer_phone.read, paw_point_transaction.read |
| offer.list | run_admin_stage3_read | admin_copilot_facts | voucher.read, promotion.read |
| staff.lookup | run_admin_stage3_read | admin_copilot_facts | staff.read |
| staff.schedule | run_admin_stage3_read | admin_copilot_facts | staff.read, staff_schedule.read |
| review.list | run_admin_stage3_read | admin_copilot_facts | review.read |
| content.list | run_admin_stage3_read | admin_copilot_facts | blog_post.read |
| report.operations | run_admin_stage3_read | admin_copilot_facts | sales_order.read, appointment.read, support_ticket.read |
| settings.read | run_admin_stage3_read | admin_copilot_facts | pawpal_setting.read |
| content.read | run_admin_chat_detail | admin_copilot_facts | blog_post.read |
| review.read | run_admin_chat_detail | admin_copilot_facts | review.read |
| catalog.price_rows | run_admin_chat_detail | admin_copilot_facts | service.read, service_category.read |
| internal.customer_resolve | run_admin_chat_customer_case | admin_copilot_facts | customer.read, customer_profile.read, customer_phone.read |
| internal.customer_appointment | run_admin_chat_customer_case | admin_copilot_facts | customer.read, appointment.read, appointment_item.read |
| internal.customer_tickets | run_admin_chat_customer_case | admin_copilot_facts | customer.read, support_ticket.read |
| internal.customer_pets | run_admin_chat_customer_case | admin_copilot_facts | customer.read, pet_profile.read, pet_breed.read, pet_species.read |
| internal.customer_latest_order | run_admin_chat_customer_case | admin_copilot_facts | customer.read, sales_order.read |
| hotel.availability | run_admin_chat_logistics | admin_copilot_facts | hotel_room.read, hotel_room_type.read, hotel_booking.read |
| hotel.stays | run_admin_chat_logistics | admin_copilot_facts | hotel_booking.read, hotel_room.read, hotel_room_type.read, appointment.read, pet_profile.read |
| taxi.trips | run_admin_chat_logistics | admin_copilot_facts | taxi_trip.read, appointment.read, pet_profile.read |

## RPC nguồn ứng dụng so với Cloud

Số tên RPC trong phạm vi quét: 121. Số chữ ký hàm tìm thấy: 121.
Tên chưa thấy trên Cloud: Không có. Những tên này cần kiểm tra xem có còn được dùng hay thuộc nhánh cũ trước khi kết luận lỗi.

| RPC | authenticated EXECUTE | SECURITY DEFINER | Quyền được gọi trực tiếp |
|---|---|---|---|
| act_admin_chat(p_request_id uuid, p_conversation_id uuid, p_expected_updated_at timestamp with time zone, p_action text, p_content text) | true | true | chat_conversation.read, chat_conversation.write, chat_message.write, audit_log.write |
| act_admin_complaint(p_request_id uuid, p_ticket_id uuid, p_expected_updated_at timestamp with time zone, p_action text, p_details jsonb) | true | true | support_ticket.read, support_ticket.write, support_ticket_message.write, audit_log.write, sales_order.read, appointment.read, refund_transaction.read, payment.read, return_request.read |
| add_customer_pet(p_customer_id uuid, p_pet_id uuid, p_name text, p_breed_id uuid, p_weight numeric, p_safety_note text, p_allergy text, p_routine text) | true | false | pet_profile.write, audit_log.write, pet_weight_history.write |
| adjust_admin_chat_points(p_request uuid, p_conversation uuid, p_expected_updated_at timestamp with time zone, p_policy uuid, p_points integer) | true | true | chat_conversation.read, chat_conversation.write, chatbot_compensation_policy.read, paw_point_transaction.write, audit_log.write |
| adjust_admin_sales_stock(p_request_id uuid, p_variant_id uuid, p_details jsonb) | true | true | inventory_transaction.write, product_variant.write, product.write, audit_log.write |
| adjust_customer_points(p_customer_id uuid, p_points integer, p_reason text, p_request_id uuid) | true | true | paw_point_transaction.write, audit_log.write |
| admin_chat_canned_page(p_query text, p_category text, p_page integer) | true | false |  |
| admin_chat_rule_counts(p_tables text[]) | true | false |  |
| admin_chat_rule_page_bounded(p_table text, p_filters jsonb, p_page integer) | true | false |  |
| admin_complaint_page(p_kind text, p_filters jsonb, p_page integer, p_size integer, p_context text, p_ids uuid[]) | true | false | support_ticket.read |
| admin_copilot_chat_context(p_conversation uuid) | true | false |  |
| admin_copilot_extended_facts(p_intent text, p_filters jsonb) | true | false | admin_copilot_history.read, payment.read, refund_transaction.read, chatbot_knowledge_faq.read, service_price_matrix.read, taxi_price_rule.read, hotel_room_type.read |
| admin_copilot_facts(p_intent text, p_filters jsonb) | true | false | admin_copilot_history.read, support_ticket.read, sales_order.read, service.read, product.read, product_variant.read |
| admin_copilot_history_page(p_session uuid, p_offset integer, p_with_title boolean) | true | false | admin_copilot_history.read |
| admin_copilot_recent_context(p_session uuid) | true | false | admin_copilot_history.read |
| admin_copilot_sessions_bounded(p_query text, p_page integer) | true | false |  |
| admin_customer_page(p_query text, p_tier text, p_status text, p_category text, p_page integer, p_size integer, p_lookup text) | true | true |  |
| admin_pawpoint_page(p_query text, p_kind text, p_page integer, p_size integer) | true | true | paw_point_transaction.read, customer.read, customer_profile.read, customer_phone.read |
| admin_pet_page(p_query text, p_species text, p_breed text, p_weight text, p_hotel boolean, p_alert boolean, p_page integer, p_size integer, p_lookup text, p_ids text[], p_catalog boolean, p_owner_query text) | true | false |  |
| admin_service_staff_candidates() | true | true | staff.read |
| admin_staff_assessment_page(p_query text, p_type text, p_result text, p_page integer, p_staff_id uuid) | true | false | staff.read |
| admin_staff_assessment_summary() | true | false | staff.read |
| admin_staff_directory_page(p_ids uuid[]) | true | false | staff.read |
| admin_staff_directory_summary() | true | false | staff.read |
| admin_staff_list_page(p_filters jsonb, p_page integer) | true | false | staff.read |
| admin_staff_schedule_summary() | true | false | staff.read |
| assign_admin_complaint(p_request_id uuid, p_ticket_id uuid, p_expected_updated_at timestamp with time zone, p_staff_id uuid, p_note text) | true | true | support_ticket.read, support_ticket.write, support_ticket_message.write, staff.read, audit_log.write |
| begin_admin_staff_auth_action(p_actor_auth_id uuid, p_request_id uuid, p_staff_id uuid, p_expected_updated_at timestamp with time zone, p_action text, p_fingerprint text) | false | true |  |
| change_admin_service_charge(p_id uuid, p_appointment_id uuid, p_expected_updated_at timestamp with time zone, p_action text, p_details jsonb) | true | false | appointment.write, appointment_adjustment.write, appointment_item.write, payment.read, audit_log.write |
| claim_ai_api_key(p_exclude uuid[]) | false | true |  |
| close_admin_hotel_stay(p_appointment_id uuid, p_expected_updated_at timestamp with time zone) | true | false | appointment.write, hotel_booking.write, audit_log.write |
| create_admin_complaint(p_id uuid, p_customer_id uuid, p_order_id uuid, p_appointment_id uuid, p_category text, p_subject text, p_content text, p_priority text) | true | true | support_ticket.write, support_ticket.read, support_ticket_message.write, support_ticket_message.read, customer.read, audit_log.write, sales_order.read, appointment.read |
| create_admin_sales_order(p_order_id uuid, p_customer_id uuid, p_expected_quote text, p_details jsonb, p_lines jsonb) | true | true | sales_order.write, sales_order_detail.write, stock_reservation.write, voucher_redemption.write, paw_point_transaction.write, audit_log.write |
| create_admin_sales_replacement(p_request_id uuid, p_return_id uuid, p_expected_updated_at timestamp with time zone, p_details jsonb) | true | true | return_request.write, return_request_detail.read, sales_order.write, sales_order_detail.write, inventory_transaction.write, stock_reservation.write, audit_log.write |
| create_admin_service_ticket(p_id uuid, p_appointment_id uuid, p_review_id uuid, p_description text) | true | true | appointment.read, review.read, appointment_item.read, support_ticket.read, support_ticket.write, audit_log.read, audit_log.write |
| create_admin_staff_profile(p_request_id uuid, p_staff_id uuid, p_auth_user_id uuid, p_details jsonb, p_roles text[], p_permissions text[]) | true | true | staff.write, staff_role.write |
| create_chat_complaint(p_id uuid, p_conversation_id uuid, p_expected_updated_at timestamp with time zone, p_ref_id uuid, p_category text, p_subject text, p_priority text) | true | true | chat_conversation.read, chat_conversation.write |
| create_customer_quick(p_full_name text, p_phone text, p_address text, p_province text, p_pet_name text, p_breed_id uuid, p_weight numeric) | true | false | customer.write, customer_phone.read, customer_profile.write, customer_phone.write, customer_membership.write, customer_address.write, pet_profile.write, pet_weight_history.write |
| delete_admin_copilot_session(p_session uuid) | true | true | admin_copilot_history.write, audit_log.write |
| dispatch_admin_sales_batch(p_request_id uuid, p_provider_id uuid, p_orders jsonb, p_note text) | true | true | sales_order.write, audit_log.write |
| finish_admin_staff_auth_action(p_actor_auth_id uuid, p_request_id uuid, p_success boolean) | false | true |  |
| finish_admin_staff_provision(p_actor_auth_id uuid, p_request_id uuid, p_staff_id uuid, p_fingerprint text, p_enable_login boolean) | false | true |  |
| finish_ai_api_key(p_id uuid, p_lease uuid, p_outcome text, p_retry_seconds integer) | false | true |  |
| get_admin_chat_customer_panel(p_customer uuid) | true | false |  |
| get_admin_chat_handlers_bounded() | true | false |  |
| get_admin_chat_inbox_view(p_query text, p_filter text, p_page integer) | true | false | customer.read |
| get_admin_chat_messages_bounded(p_conversation uuid, p_before_at timestamp with time zone, p_before_id uuid) | true | false |  |
| get_admin_chat_point_policies() | true | false |  |
| get_admin_complaint_handlers() | true | true | support_ticket.write, staff.read |
| get_admin_dashboard_cashflow(p_from date, p_to date) | true | true | payment.read, refund_transaction.read |
| get_admin_dashboard_low_stock() | true | false | inventory.read, product.read, product_variant.read |
| get_admin_pet_reminder_sources() | true | false | appointment.read, appointment_item.read, pet_profile.read, audit_log.read |
| get_admin_sales_cashier(p_order_id uuid) | true | true | sales_order.read, sales_order_detail.read, voucher_redemption.read, payment.read, refund_transaction.read, payment_method_config.read |
| get_admin_sales_inventory_choices() | true | false | product.read, product_variant.read, inventory.read |
| get_admin_sales_order_history(p_order_id uuid) | true | true | sales_order.read, payment.read, refund_transaction.read |
| get_admin_sales_order_page(p_filters jsonb, p_page integer) | true | false | customer.read, sales_order.read, sales_order_detail.read, payment.read, refund_transaction.read, customer_profile.read, customer_phone.read, return_request.read, voucher_redemption.read, payment_method_config.read |
| get_admin_sales_product_page(p_query text, p_category text, p_stock text, p_page integer) | true | false | product.read, product_variant.read, inventory.read, product_category.read, review.read, sales_order_detail.read |
| get_admin_sales_review_page(p_product_id uuid, p_filter text, p_page integer) | true | false | review.read, review_media.read, sales_order_detail.read, product_variant.read |
| get_admin_sales_stock_history_page(p_product_id uuid, p_page integer) | true | false | product.read, product_variant.read, inventory_transaction.read, staff.read |
| get_admin_service_booking_page(p_filters jsonb, p_page integer, p_export boolean) | true | false | appointment.read, appointment_item.read, customer_profile.read, customer_phone.read, pet_profile.read, pet_breed.read, staff.read, service.read, service_category.read, payment.read, refund_transaction.read, appointment_adjustment.read |
| get_admin_service_cashier(p_appointment_id uuid) | true | true | appointment.read, appointment_item.read, appointment_adjustment.read, voucher_redemption.read, payment.read, refund_transaction.read, payment_method_config.read |
| get_ai_key_pool_state() | false | true |  |
| get_staff_login_context() | true | true |  |
| handover_admin_staff_work(p_request_id uuid, p_staff_id uuid, p_expected_updated_at timestamp with time zone, p_reason text, p_handover jsonb) | true | true | staff.write, appointment.write, appointment_item.write, taxi_trip.write, audit_log.write |
| moderate_admin_service_review(p_request uuid, p_review uuid, p_expected timestamp with time zone, p_status text, p_reason text) | true | true | review.write, audit_log.write |
| open_public_chat(p_id uuid, p_customer uuid, p_guest_hash text) | false | true |  |
| post_admin_sales_inventory_batch(p_request_id uuid, p_mode text, p_details jsonb, p_lines jsonb) | true | true | inventory_transaction.write, audit_log.write, purchase_order.write, purchase_order_detail.write |
| post_admin_sales_money(p_request_id uuid, p_order_id uuid, p_expected_state text, p_action text, p_details jsonb) | true | true | payment.write, audit_log.write, refund_transaction.write |
| post_admin_service_money(p_request_id uuid, p_appointment_id uuid, p_expected_state text, p_action text, p_details jsonb) | true | true | payment.write, audit_log.write, refund_transaction.write |
| post_public_chat_message(p_id uuid, p_conversation uuid, p_expected_at timestamp with time zone, p_auth uuid, p_guest uuid, p_raw text, p_content text, p_toxic boolean, p_level integer, p_reply text, p_handover boolean, p_understood boolean) | false | true |  |
| quote_admin_sales_order(p_customer_id uuid, p_details jsonb, p_lines jsonb) | true | false | sales_order.write, product_variant.read, inventory_transaction.read, stock_reservation.read, customer.read, voucher.read, paw_point_transaction.read, pawpal_setting.read, membership_tier.read, customer_membership.read, delivery_option_config.read, voucher_redemption.read, customer_voucher.read |
| read_admin_chat_benchmark_snapshot() | true | false |  |
| read_admin_chat_message_part(p_kind text, p_id uuid, p_offset integer, p_revision text) | true | false | admin_copilot_history.read, chat_message.read, chat_conversation.read |
| read_admin_chat_raw_bounded(p_message_id uuid) | true | false |  |
| read_public_chat_catalog(p_kind text, p_query text) | false | false |  |
| read_public_chat_page(p_conversation uuid, p_before_at timestamp with time zone, p_before_id uuid) | false | false |  |
| read_public_chat_part(p_conversation uuid, p_message uuid, p_offset integer, p_revision text) | false | false |  |
| read_public_guest_advice(p_request jsonb) | false | false |  |
| record_admin_pet_weight(p_pet_id uuid, p_expected_updated_at timestamp with time zone, p_measurement_id uuid, p_weight numeric, p_note text) | true | false | pet_profile.write, pet_weight_history.write, audit_log.write |
| record_admin_staff_incident(p_request_id uuid, p_appointment_id uuid, p_expected_updated_at timestamp with time zone, p_staff_id uuid, p_details jsonb) | true | true | appointment.read, audit_log.write |
| record_pet_contact(p_pet_id uuid, p_appointment_id uuid, p_type text, p_channel text) | true | false | audit_log.write, pet_profile.read |
| remove_customer_pet(p_customer_id uuid, p_pet_id uuid, p_expected_updated_at timestamp with time zone, p_restore boolean) | true | false | pet_profile.write, audit_log.write |
| reply_admin_sales_review(p_review_id uuid, p_response_id uuid, p_expected_updated_at timestamp with time zone, p_text text) | true | false | review_response.write, audit_log.write |
| reply_admin_service_review(p_review_id uuid, p_response_id uuid, p_expected_updated_at timestamp with time zone, p_text text) | true | false | review_response.write, audit_log.write |
| resolve_admin_chat(p_request_id uuid, p_conversation_id uuid, p_expected_updated_at timestamp with time zone, p_reason text, p_notes text, p_send_survey boolean) | true | true | chat_conversation.write, chat_conversation.read, chat_message.write, audit_log.write |
| review_admin_staff_shift_request(p_request_id uuid, p_approve boolean) | true | true | staff_shift_request.write, staff_schedule.write, audit_log.write |
| run_admin_chat_customer_case(p_lease uuid, p_tool text, p_filters jsonb, p_max_bytes integer) | true | false |  |
| run_admin_chat_detail(p_lease uuid, p_tool text, p_filters jsonb, p_max_bytes integer) | true | false |  |
| run_admin_chat_logistics(p_lease uuid, p_tool text, p_filters jsonb, p_max_bytes integer) | true | false |  |
| run_admin_chat_read(p_lease uuid, p_tool text, p_filters jsonb, p_max_bytes integer) | true | false |  |
| run_admin_stage3_read(p_lease uuid, p_tool text, p_filters jsonb, p_max_bytes integer) | true | false |  |
| save_admin_chat_benchmark(p_results jsonb) | true | true | chatbot_scenario_matrix.write, audit_log.write |
| save_admin_chat_rule(p_table text, p_id uuid, p_expected jsonb, p_values jsonb, p_delete boolean) | true | true | audit_log.write |
| save_admin_pet(p_pet_id uuid, p_expected_updated_at timestamp with time zone, p_details jsonb, p_weight numeric) | true | false | pet_profile.write, audit_log.write, pet_weight_history.write |
| save_admin_pickup_notification(p_id uuid, p_appointment_id uuid, p_expected_updated_at timestamp with time zone, p_content text, p_ready boolean) | true | false | appointment.read, appointment_record.read, appointment_adjustment.read, pet_profile.read, notification.read, audit_log.read, notification.write, audit_log.write |
| save_admin_sales_product(p_request_id uuid, p_product_id uuid, p_expected_updated_at timestamp with time zone, p_details jsonb, p_variants jsonb) | true | true | product.write, product_variant.write, product_media.write, product_variant_media.write, inventory_transaction.write, audit_log.write, variant_ |
| save_admin_sales_return(p_request_id uuid, p_return_id uuid, p_order_id uuid, p_expected_updated_at timestamp with time zone, p_action text, p_details jsonb) | true | true | return_request.write, return_request_detail.write, inventory_transaction.write, audit_log.write |
| save_admin_sales_voucher(p_request_id uuid, p_voucher_id uuid, p_expected_updated_at timestamp with time zone, p_details jsonb) | true | true | voucher.write, audit_log.write |
| save_admin_service_care_log(p_id uuid, p_appointment_id uuid, p_expected_updated_at timestamp with time zone, p_expected_log_updated_at timestamp with time zone, p_action text, p_details jsonb) | true | false | appointment.write, care_log.write, audit_log.write |
| save_admin_service_catalog(p_id uuid, p_expected_updated_at timestamp with time zone, p_details jsonb, p_prices jsonb) | true | false | service.write, service_supported_species.write, service_care_action.write, care_action.write, audit_log.write, service_price_matrix.write |
| save_admin_service_record(p_id uuid, p_appointment_id uuid, p_expected_updated_at timestamp with time zone, p_type text, p_details jsonb) | true | false | appointment.write, appointment_item.write, appointment_record.write, audit_log.write, pet_weight_history.write |
| save_admin_setting_record(p_request uuid, p_table text, p_id uuid, p_expected jsonb, p_values jsonb, p_delete boolean) | true | true | audit_log.write, payment_method_config.write |
| save_admin_shipping_settings(p_request uuid, p_options jsonb, p_config_id uuid, p_expected_config jsonb, p_config jsonb) | true | true |  |
| save_admin_staff_assessment(p_request_id uuid, p_staff_id uuid, p_details jsonb) | true | true | staff_assessment.write, audit_log.write |
| save_admin_staff_profile(p_request_id uuid, p_staff_id uuid, p_expected_updated_at timestamp with time zone, p_details jsonb) | true | true | staff.write, audit_log.write |
| save_admin_staff_schedule(p_request_id uuid, p_schedule_id uuid, p_expected_updated_at timestamp with time zone, p_details jsonb) | true | true | staff_schedule.write, audit_log.write |
| save_admin_staff_shift_request(p_request_id uuid, p_details jsonb, p_approve boolean) | true | true | staff_shift_request.write, audit_log.write |
| save_chat_feedback(p_conversation uuid, p_score integer, p_comment text) | false | true |  |
| save_customer_note(p_customer_id uuid, p_expected_updated_at timestamp with time zone, p_note text) | true | false | customer.write, audit_log.write |
| search_admin_sales_customers(p_query text) | true | false | customer.read, customer_profile.read, customer_phone.read, customer_membership.read, membership_tier.read |
| search_admin_sales_variants(p_query text) | true | false | product.read, product_variant.read |
| search_public_chat_context(p_conversation uuid, p_question text) | false | false |  |
| set_admin_staff_access(p_request_id uuid, p_staff_id uuid, p_expected_updated_at timestamp with time zone, p_roles text[], p_permissions text[], p_reason text) | true | true | staff_role.write, staff_permission.write, audit_log.write |
| set_customer_status(p_customer_id uuid, p_expected_updated_at timestamp with time zone, p_status text) | true | false | customer.write, audit_log.write |
| set_public_chat_mode(p_conversation uuid, p_mode text) | false | true |  |
| sync_admin_article_knowledge(p_request uuid, p_article uuid, p_expected jsonb) | true | true | blog_post.read, blog_post.write, chatbot_knowledge_faq.write, audit_log.write |
| transfer_admin_chat(p_request_id uuid, p_conversation_id uuid, p_expected_updated_at timestamp with time zone, p_staff_id uuid, p_note text) | true | true | chat_conversation.write, chat_message.write, audit_log.write |
| update_admin_sales_order(p_request_id uuid, p_order_id uuid, p_expected_updated_at timestamp with time zone, p_action text, p_details jsonb) | true | true | sales_order.write, inventory_transaction.write, stock_reservation.write, audit_log.write |
| update_admin_service_booking(p_id uuid, p_expected_updated_at timestamp with time zone, p_action text, p_value text, p_reason text) | true | false | appointment.write, audit_log.write, payment.read, refund_transaction.read |
| update_customer_pet(p_customer_id uuid, p_pet_id uuid, p_expected_updated_at timestamp with time zone, p_name text, p_breed_id uuid, p_weight numeric, p_safety_note text, p_allergy text, p_routine text) | true | false | pet_profile.write, audit_log.write, pet_weight_history.write |
| update_customer_profile(p_customer_id uuid, p_expected_updated_at timestamp with time zone, p_full_name text, p_phone text, p_email text, p_gender text, p_date_of_birth date, p_tier_id uuid, p_addresses jsonb) | true | false | customer_address.write, customer_address.read |

## Trích đoạn các luồng cần tách quyền

Trích theo dòng kiểm soát, không phải toàn bộ định nghĩa hàm; không dùng phần trích rời để kết luận thiếu kiểm tra ở các hàm lồng.
### act_admin_complaint

```sql
CREATE OR REPLACE FUNCTION public.act_admin_complaint(p_request_id uuid, p_ticket_id uuid, p_expected_updated_at timestamp with time zone, p_action text, p_details jsonb)
 RETURNS uuid
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('support_ticket.read') OR NOT pawpal_private.has_permission('support_ticket.write')
 OR NOT pawpal_private.has_permission('support_ticket_message.write') OR NOT pawpal_private.has_permission('audit_log.write') THEN RAISE EXCEPTION 'complaint_forbidden' USING ERRCODE='42501'; END IF;
 IF p_request_id IS NULL OR p_ticket_id IS NULL OR jsonb_typeof(p_details) IS DISTINCT FROM 'object' OR length(p_details::text)>12000
 OR p_action IS NULL OR p_action NOT IN ('message','request_info','resolve','propose','approve','reject_proposal','complete','close','reopen','link_source')
 OR EXISTS(SELECT 1 FROM jsonb_object_keys(p_details) k WHERE k NOT IN ('note','internal','channel','option','amount','evidence_id','replacement_order_id','return_request_id','source_kind')) THEN RAISE EXCEPTION 'invalid_complaint_action' USING ERRCODE='22023'; END IF;
 IF coalesce(length(note_value),0) NOT BETWEEN 2 AND 8000 THEN RAISE EXCEPTION 'complaint_note_required' USING ERRCODE='22023'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 payload:=jsonb_build_object('ticket_id',p_ticket_id,'action',p_action,'details',p_details)::text;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text,41));
 IF FOUND THEN
  IF prior.action<>'COMPLAINT_ACTION' OR prior.staff_id IS DISTINCT FROM actor OR (prior.description::jsonb-'source_staff_id')::text<>payload THEN RAISE EXCEPTION 'complaint_request_conflict' USING ERRCODE='PT409'; END IF;RETURN p_ticket_id;
 END IF;
 next_status:=ticket.status;
 IF ticket.status='waiting_manager_approval' AND p_action NOT IN ('message','approve','reject_proposal') THEN RAISE EXCEPTION 'complaint_approval_pending' USING ERRCODE='PT409'; END IF;
 IF p_action NOT IN ('reopen','close') AND ticket.status IN ('closed','resolved','completed','rejected') THEN RAISE EXCEPTION 'complaint_not_open' USING ERRCODE='PT409'; END IF;
 IF p_action IN ('approve','reject_proposal') AND NOT EXISTS(SELECT 1 FROM public.staff_role WHERE staff_id=actor AND role_code='ADMIN') THEN RAISE EXCEPTION 'complaint_approval_forbidden' USING ERRCODE='42501'; END IF;
 IF p_action='link_source' THEN
  evidence:=(p_details->>'evidence_id')::uuid;
  IF p_details->>'source_kind'='order' THEN
   IF NOT pawpal_private.has_permission('sales_order.read') THEN RAISE EXCEPTION 'complaint_forbidden' USING ERRCODE='42501'; END IF;
   PERFORM 1 FROM public.sales_order WHERE id=evidence AND customer_id=ticket.customer_id FOR SHARE;
  ELSIF p_details->>'source_kind'='service' THEN
   IF NOT pawpal_private.has_permission('appointment.read') THEN RAISE EXCEPTION 'complaint_forbidden' USING ERRCODE='42501'; END IF;
   PERFORM 1 FROM public.appointment WHERE id=evidence AND customer_id=ticket.customer_id FOR SHARE;
  ELSE RAISE EXCEPTION 'invalid_complaint_source' USING ERRCODE='22023'; END IF;
 ELSIF p_action='message' THEN
  internal_value:=coalesce((p_details->>'internal')::boolean,false);
 ELSIF p_action='request_info' THEN
  IF p_details->>'channel' IS NULL OR p_details->>'channel' NOT IN ('record','call','zalo','email','sms') THEN RAISE EXCEPTION 'invalid_complaint_channel' USING ERRCODE='22023'; END IF;
  note_value:='[Ghi nhận yêu cầu bổ sung qua '||(p_details->>'channel')||'] '||note_value; next_status:='waiting_customer';
 ELSIF p_action IN ('resolve','propose') THEN
  option_value:=p_details->>'option'; amount_value:=coalesce((p_details->>'amount')::numeric,0);
  OR amount_value<0 OR amount_value>999999999999 OR amount_value<>round(amount_value,4)
  OR (p_action='resolve' AND option_value NOT IN ('explain','reject'))
  OR (p_action='propose' AND option_value IN ('explain','reject'))
  OR (option_value IN ('refund','rma_refund') AND amount_value<=0)
  OR (option_value='refund' AND ticket.appointment_id IS NULL AND ticket.order_id IS NULL) THEN RAISE EXCEPTION 'invalid_complaint_resolution' USING ERRCODE='22023'; END IF;
  next_status:=CASE WHEN p_action='propose' THEN 'waiting_manager_approval' ELSE 'resolved' END;
  UPDATE public.support_ticket SET resolution_type=option_value,resolution_note=note_value,approved_amount=CASE WHEN p_action='resolve' THEN 0 ELSE NULL END,
   resolved_by=CASE WHEN p_action='resolve' THEN actor ELSE NULL END,resolved_at=CASE WHEN p_action='resolve' THEN clock_timestamp() ELSE NULL END WHERE id=ticket.id;
 ELSIF p_action IN ('approve','reject_proposal') THEN
  IF ticket.status<>'waiting_manager_approval' THEN RAISE EXCEPTION 'complaint_not_awaiting_approval' USING ERRCODE='PT409'; END IF;
  IF p_action='approve' THEN
   SELECT description::jsonb INTO proposal FROM public.audit_log WHERE action='COMPLAINT_ACTION' AND entity_id=ticket.id AND description::jsonb->>'action'='propose' ORDER BY created_at DESC,id DESC LIMIT 1;
  next_status:='processing';
  UPDATE public.support_ticket SET approved_amount=CASE WHEN p_action='approve' THEN amount_value ELSE NULL END,
   resolved_by=CASE WHEN p_action='approve' THEN actor ELSE NULL END,
   resolution_type=CASE WHEN p_action='approve' THEN resolution_type ELSE NULL END,
   resolution_note=CASE WHEN p_action='approve' THEN resolution_note ELSE NULL END WHERE id=ticket.id;
 ELSIF p_action='complete' THEN
  evidence:=(p_details->>'evidence_id')::uuid;
  IF ticket.resolution_type IN ('refund','rma_refund') THEN
   IF NOT pawpal_private.has_permission('refund_transaction.read') OR NOT pawpal_private.has_permission('payment.read') THEN RAISE EXCEPTION 'complaint_forbidden' USING ERRCODE='42501'; END IF;
   PERFORM 1 FROM public.refund_transaction r JOIN public.payment p ON p.id=r.payment_id WHERE r.id=evidence AND r.refund_status='succeeded'
   IF ticket.resolution_type='rma_refund' THEN
    IF NOT pawpal_private.has_permission('return_request.read') THEN RAISE EXCEPTION 'complaint_forbidden' USING ERRCODE='42501'; END IF;
    PERFORM 1 FROM public.return_request rr WHERE rr.id=(p_details->>'return_request_id')::uuid AND rr.sales_order_id=ticket.order_id AND rr.request_status='received' FOR SHARE;
  ELSIF ticket.resolution_type='rma_exchange' THEN
   IF NOT pawpal_private.has_permission('return_request.read') THEN RAISE EXCEPTION 'complaint_forbidden' USING ERRCODE='42501'; END IF;
   PERFORM 1 FROM public.return_request WHERE id=evidence AND sales_order_id=ticket.order_id AND request_status='received' FOR SHARE;
   IF NOT FOUND THEN RAISE EXCEPTION 'complaint_return_mismatch' USING ERRCODE='22023'; END IF;
   IF NOT pawpal_private.has_permission('sales_order.read') THEN RAISE EXCEPTION 'complaint_forbidden' USING ERRCODE='42501'; END IF;
   PERFORM 1 FROM public.sales_order WHERE id=(p_details->>'replacement_order_id')::uuid AND id<>ticket.order_id AND customer_id=ticket.customer_id AND order_status IN ('delivered','completed') FOR SHARE;
  ELSIF ticket.resolution_type IN ('redo_service','change_staff') THEN
   IF NOT pawpal_private.has_permission('appointment.read') THEN RAISE EXCEPTION 'complaint_forbidden' USING ERRCODE='42501'; END IF;
   IF ticket.resolution_type='change_staff' THEN
    SELECT description::jsonb INTO proposal FROM public.audit_log WHERE action='COMPLAINT_ACTION' AND entity_id=ticket.id AND description::jsonb->>'action'='propose' ORDER BY created_at DESC,id DESC LIMIT 1;
    IF NOT coalesce(proposal?'source_staff_id',false) THEN RAISE EXCEPTION 'complaint_booking_mismatch' USING ERRCODE='22023'; END IF;
    original_staff:=(proposal->>'source_staff_id')::uuid;
   END IF;
    AND ((ticket.resolution_type='redo_service' AND a.id<>old.id AND a.created_at>=ticket.created_at)
      OR (ticket.resolution_type='change_staff' AND a.staff_id IS NOT NULL AND a.staff_id IS DISTINCT FROM original_staff))
    AND EXISTS(SELECT 1 FROM public.appointment_item oi JOIN public.appointment_item ni ON ni.service_id=oi.service_id WHERE oi.appointment_id=old.id AND ni.appointment_id=a.id AND oi.service_id IS NOT NULL)
  next_status:='resolved';UPDATE public.support_ticket SET resolved_at=clock_timestamp() WHERE id=ticket.id;
 ELSIF p_action='close' THEN
  IF ticket.status NOT IN ('resolved','completed') THEN RAISE EXCEPTION 'complaint_resolve_before_close' USING ERRCODE='22023'; END IF;
  next_status:='closed'; UPDATE public.support_ticket SET closed_at=clock_timestamp() WHERE id=ticket.id;
 ELSIF p_action='reopen' THEN
  IF ticket.status NOT IN ('resolved','closed','completed','rejected') THEN RAISE EXCEPTION 'complaint_not_finished' USING ERRCODE='PT409'; END IF;
 END IF;
 UPDATE public.support_ticket SET status=next_status,updated_at=clock_timestamp(),first_response_at=CASE WHEN p_action='message' AND NOT internal_value THEN coalesce(first_response_at,clock_timestamp()) ELSE first_response_at END WHERE id=ticket.id;
 INSERT INTO public.support_ticket_message(ticket_id,sender_type,sender_account_id,content,is_internal) VALUES(ticket.id,'staff',auth.uid(),CASE WHEN p_action='message' THEN note_value ELSE '['||CASE p_action WHEN 'link_source' THEN 'Liên kết giao dịch' WHEN 'request_info' THEN 'Yêu cầu bổ sung' WHEN 'resolve' THEN 'Giải quyết' WHEN 'propose' THEN 'Đề xuất' WHEN 'approve' THEN 'Phê duyệt' WHEN 'reject_proposal' THEN 'Từ chối đề xuất' WHEN 'complete' THEN 'Liên kết kết quả' WHEN 'close' THEN 'Đóng phiếu' WHEN 'reopen' THEN 'Mở lại' END||'] '||note_value END,internal_value);
 INSERT INTO public.audit_log(id,staff_id,action,entity_name,entity_id,description) VALUES(p_request_id,actor,'COMPLAINT_ACTION','support_ticket',ticket.id,
 CASE WHEN p_action='propose' THEN (payload::jsonb||jsonb_build_object('source_staff_id',(SELECT staff_id FROM public.appointment WHERE id=ticket.appointment_id)))::text ELSE payload END);
 RETURN ticket.id;
```

### adjust_customer_points

```sql
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('paw_point_transaction.write')
 OR NOT pawpal_private.has_permission('audit_log.write') THEN RAISE EXCEPTION 'point_adjustment_forbidden' USING ERRCODE='42501'; END IF;
 IF p_request_id IS NULL OR p_points IS NULL OR p_points=0 OR abs(p_points::bigint)>10000000
  RAISE EXCEPTION 'invalid_point_adjustment' USING ERRCODE='22023'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 request_key:='staff-adjust:'||actor::text||':'||p_request_id::text;
 VALUES(p_customer_id,p_points,reason_value,request_key,next_sequence) RETURNING id INTO entry_id;
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description)
 VALUES(actor,'CREATE','paw_point_transaction',entry_id,'Điều chỉnh điểm khách hàng: '||p_points::text||'. '||reason_value);
```

### get_admin_service_cashier

```sql
BEGIN
 IF NOT pawpal_private.has_permission('appointment.read') OR NOT pawpal_private.has_permission('appointment_item.read')
 OR NOT pawpal_private.has_permission('appointment_adjustment.read') OR NOT pawpal_private.has_permission('voucher_redemption.read')
 OR NOT pawpal_private.has_permission('payment.read') OR NOT pawpal_private.has_permission('refund_transaction.read')
 OR NOT pawpal_private.has_permission('payment_method_config.read') THEN RAISE EXCEPTION 'service_cashier_forbidden' USING ERRCODE='42501'; END IF;
 SELECT * INTO a FROM public.appointment WHERE id=p_appointment_id;
```

### post_admin_sales_money

```sql
CREATE OR REPLACE FUNCTION public.post_admin_sales_money(p_request_id uuid, p_order_id uuid, p_expected_state text, p_action text, p_details jsonb)
 RETURNS uuid
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('payment.write') OR NOT pawpal_private.has_permission('audit_log.write')
 OR (p_action='refund' AND NOT pawpal_private.has_permission('refund_transaction.write')) THEN RAISE EXCEPTION 'sales_cashier_forbidden' USING ERRCODE='42501'; END IF;
 IF p_request_id IS NULL OR p_order_id IS NULL OR p_action IS NULL OR p_action NOT IN ('collect','refund')
 OR p_details IS NULL OR jsonb_typeof(p_details)<>'object' OR length(p_details::text)>6000 OR p_details->>'confirmed' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'invalid_sales_money' USING ERRCODE='22023'; END IF;
 OR coalesce(length(reason_value),0) NOT BETWEEN 2 AND 2000 OR coalesce(length(reference_value),0)>200 THEN RAISE EXCEPTION 'invalid_sales_money' USING ERRCODE='22023'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text,17));
 action_name:=CASE WHEN p_action='collect' THEN 'SALES_COLLECT' ELSE 'SALES_REFUND' END;
 SELECT * INTO prior FROM public.audit_log WHERE entity_id=p_request_id AND action IN ('SALES_COLLECT','SALES_REFUND') LIMIT 1;
 IF FOUND THEN
  IF prior.action<>action_name OR prior.staff_id IS DISTINCT FROM actor OR prior.description<>jsonb_build_object('order_id',p_order_id,'details',p_details)::text THEN RAISE EXCEPTION 'sales_request_conflict' USING ERRCODE='PT409'; END IF;
  RETURN p_request_id;
 IF p_expected_state IS NULL OR context->>'version'<>p_expected_state THEN RAISE EXCEPTION 'sales_cashier_changed' USING ERRCODE='PT409'; END IF;
 IF p_action='collect' THEN
  IF a.order_status IN ('cancelled','returned') THEN RAISE EXCEPTION 'sales_money_booking_closed' USING ERRCODE='22023'; END IF;
 UPDATE public.sales_order SET updated_at=clock_timestamp() WHERE id=a.id;
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description)
 VALUES(actor,action_name,CASE WHEN p_action='collect' THEN 'payment' ELSE 'refund_transaction' END,p_request_id,jsonb_build_object('order_id',a.id,'details',p_details)::text);
 RETURN p_request_id;
```

### post_admin_service_money

```sql
CREATE OR REPLACE FUNCTION public.post_admin_service_money(p_request_id uuid, p_appointment_id uuid, p_expected_state text, p_action text, p_details jsonb)
 RETURNS uuid
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('payment.write') OR NOT pawpal_private.has_permission('audit_log.write')
 OR (p_action='refund' AND NOT pawpal_private.has_permission('refund_transaction.write')) THEN RAISE EXCEPTION 'service_cashier_forbidden' USING ERRCODE='42501'; END IF;
 IF p_request_id IS NULL OR p_appointment_id IS NULL OR p_action IS NULL OR p_action NOT IN ('collect','refund')
 OR p_details IS NULL OR jsonb_typeof(p_details)<>'object' OR length(p_details::text)>6000 OR p_details->>'confirmed' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'invalid_service_money' USING ERRCODE='22023'; END IF;
 OR coalesce(length(reason_value),0) NOT BETWEEN 2 AND 2000 OR coalesce(length(reference_value),0)>200 THEN RAISE EXCEPTION 'invalid_service_money' USING ERRCODE='22023'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text,17));
 action_name:=CASE WHEN p_action='collect' THEN 'SERVICE_COLLECT' ELSE 'SERVICE_REFUND' END;
 SELECT * INTO prior FROM public.audit_log WHERE entity_id=p_request_id AND action IN ('SERVICE_COLLECT','SERVICE_REFUND') LIMIT 1;
 IF FOUND THEN
  IF prior.action<>action_name OR prior.staff_id IS DISTINCT FROM actor OR prior.description<>jsonb_build_object('appointment_id',p_appointment_id,'details',p_details)::text THEN RAISE EXCEPTION 'service_request_conflict' USING ERRCODE='PT409'; END IF;
  RETURN p_request_id;
 IF p_expected_state IS NULL OR context->>'version'<>p_expected_state THEN RAISE EXCEPTION 'service_cashier_changed' USING ERRCODE='PT409'; END IF;
 IF p_action='collect' THEN
  IF a.appointment_status IN ('cancelled','no_show') THEN RAISE EXCEPTION 'service_money_booking_closed' USING ERRCODE='22023'; END IF;
 UPDATE public.appointment SET updated_at=clock_timestamp() WHERE id=a.id;
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description)
 VALUES(actor,action_name,CASE WHEN p_action='collect' THEN 'payment' ELSE 'refund_transaction' END,p_request_id,jsonb_build_object('appointment_id',a.id,'details',p_details)::text);
 RETURN p_request_id;
```

### save_admin_service_care_log

```sql
CREATE OR REPLACE FUNCTION public.save_admin_service_care_log(p_id uuid, p_appointment_id uuid, p_expected_updated_at timestamp with time zone, p_expected_log_updated_at timestamp with time zone, p_action text, p_details jsonb)
 RETURNS uuid
AS $function$
DECLARE a public.appointment; old public.care_log; actor uuid; performer uuid:=nullif(p_details->>'staff_id','')::uuid;
 title_value text:=btrim(p_details->>'title'); at_time timestamptz:=coalesce(nullif(p_details->>'recorded_at','')::timestamptz,clock_timestamp()); action_key uuid;
BEGIN
 IF NOT pawpal_private.has_permission('appointment.write') OR NOT pawpal_private.has_permission('care_log.write') OR NOT pawpal_private.has_permission('audit_log.write') THEN RAISE EXCEPTION 'service_log_forbidden' USING ERRCODE='42501'; END IF;
 IF p_id IS NULL OR p_action IS NULL OR p_action NOT IN ('save','delete') THEN RAISE EXCEPTION 'invalid_service_log' USING ERRCODE='22023'; END IF;
 SELECT * INTO a FROM public.appointment WHERE id=p_appointment_id FOR UPDATE;
 SELECT * INTO old FROM public.care_log WHERE id=p_id;
 IF p_action='save' AND p_expected_log_updated_at IS NULL AND old.id IS NOT NULL THEN
  IF old.appointment_id<>a.id OR NOT EXISTS(SELECT 1 FROM public.audit_log WHERE entity_id=p_id AND action='SAVE_CARE_LOG' AND description=p_details::text) THEN RAISE EXCEPTION 'service_request_conflict' USING ERRCODE='PT409'; END IF;
 IF old.id IS NOT NULL AND (old.appointment_id<>a.id OR p_expected_log_updated_at IS NULL OR old.updated_at<>p_expected_log_updated_at) THEN RAISE EXCEPTION 'care_log_changed' USING ERRCODE='PT409'; END IF;
 IF old.id IS NULL AND (p_expected_log_updated_at IS NOT NULL OR p_action='delete') THEN RAISE EXCEPTION 'care_log_not_found' USING ERRCODE='P0002'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 IF p_action='delete' THEN
  IF EXISTS(SELECT 1 FROM public.care_log_media WHERE care_log_id=p_id) THEN RAISE EXCEPTION 'care_log_has_media' USING ERRCODE='22023'; END IF;
  IF coalesce(length(title_value),0) NOT BETWEEN 1 AND 200 OR length(p_details->>'note')>4000 OR performer IS NULL OR NOT isfinite(at_time) OR at_time>clock_timestamp()+interval '1 minute' OR at_time<date_trunc('minute',coalesce(a.check_in_time,a.created_at))
   OR NOT EXISTS(SELECT 1 FROM public.staff WHERE id=performer AND employment_status='active' AND NOT service_locked) THEN RAISE EXCEPTION 'invalid_service_log' USING ERRCODE='22023'; END IF;
  SELECT ca.id INTO action_key FROM public.care_action ca JOIN public.service_care_action sc ON sc.care_action_id=ca.id JOIN public.appointment_item i ON i.service_id=sc.service_id WHERE i.appointment_id=a.id AND i.status<>'cancelled' AND ca.is_active AND lower(btrim(ca.action_name))=lower(title_value) ORDER BY ca.id LIMIT 1;
 UPDATE public.appointment SET updated_at=clock_timestamp() WHERE id=a.id;
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES(actor,CASE WHEN p_action='delete' THEN 'DELETE_CARE_LOG' ELSE 'SAVE_CARE_LOG' END,'care_log',p_id,CASE WHEN p_action='delete' THEN to_jsonb(old)::text ELSE p_details::text END);
 RETURN p_id;
```

### save_admin_service_record

```sql
BEGIN
 IF NOT pawpal_private.has_permission('appointment.write') OR NOT pawpal_private.has_permission('appointment_item.write') OR NOT pawpal_private.has_permission('appointment_record.write') OR NOT pawpal_private.has_permission('audit_log.write') THEN RAISE EXCEPTION 'service_record_forbidden' USING ERRCODE='42501'; END IF;
 IF p_id IS NULL OR p_appointment_id IS NULL OR p_type IS NULL OR p_type NOT IN ('intake','handover') OR p_details IS NULL OR jsonb_typeof(p_details)<>'object' OR length(p_details::text)>12000 THEN RAISE EXCEPTION 'invalid_service_record' USING ERRCODE='22023'; END IF;
 IF p_type='intake' THEN
  IF performer IS NULL OR NOT pawpal_private.has_permission('pet_weight_history.write') THEN RAISE EXCEPTION 'service_record_forbidden' USING ERRCODE='42501'; END IF;
  PERFORM 1 FROM public.staff WHERE id=performer AND employment_status='active' AND NOT service_locked FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'staff_not_eligible' USING ERRCODE='22023'; END IF;
 IF p_expected_updated_at IS NULL OR a.updated_at<>p_expected_updated_at THEN RAISE EXCEPTION 'booking_changed_reload_required' USING ERRCODE='PT409'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 SELECT * INTO pet FROM public.pet_profile WHERE id=a.pet_id;
  IF EXISTS(SELECT 1 FROM public.appointment_item i JOIN public.service s ON s.id=i.service_id JOIN public.staff_level required ON required.id=s.staff_level_required_id WHERE i.appointment_id=a.id AND i.status<>'cancelled' AND NOT EXISTS(SELECT 1 FROM public.staff st JOIN public.staff_level actual ON actual.id=st.staff_level_id WHERE st.id=performer AND actual.rank_order>=required.rank_order)) THEN RAISE EXCEPTION 'staff_level_required' USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM public.appointment WHERE id<>a.id AND staff_id=performer AND appointment_status NOT IN ('completed','cancelled','no_show') AND scheduled_start_at<a.scheduled_end_at AND scheduled_end_at>a.scheduled_start_at) THEN RAISE EXCEPTION 'staff_schedule_conflict' USING ERRCODE='PT409'; END IF;
  condition_text:=concat_ws(E'\n','Da và lông: '||btrim(p_details->>'skinCoat'),'Mắt và tai: '||btrim(p_details->>'eyesEars'),'Vết thương: '||btrim(p_details->>'wounds'),'Tập tính: '||btrim(p_details->>'temperament'),'Tư trang: '||coalesce(p_details->>'belongings',''));
  INSERT INTO public.pet_weight_history(pet_id,weight,measured_at,recorded_by,note) VALUES(a.pet_id,weight_value,at_time,actor,'Cân khi lập biên bản tiếp nhận dịch vụ.');
  UPDATE public.appointment SET appointment_status='in_progress',staff_id=performer,check_in_time=coalesce(check_in_time,at_time) WHERE id=a.id;
  UPDATE public.appointment_item SET staff_id=performer,status='in_progress' WHERE appointment_id=a.id AND is_primary AND status<>'cancelled';
 ELSE
 VALUES(p_id,a.id,p_type,2,rev,actor,at_time,condition_text,pet.safety_note,pet.allergy,confirmation,CASE WHEN confirmation='confirmed' THEN at_time END,nullif(btrim(p_details->>'belongingsNote'),''));
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES(actor,'SAVE_SERVICE_RECORD','appointment_record',p_id,p_details::text);
 RETURN p_id;
```

### save_admin_staff_profile

```sql
CREATE OR REPLACE FUNCTION public.save_admin_staff_profile(p_request_id uuid, p_staff_id uuid, p_expected_updated_at timestamp with time zone, p_details jsonb)
 RETURNS uuid
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('staff.write') OR NOT pawpal_private.has_permission('audit_log.write') THEN RAISE EXCEPTION 'staff_profile_forbidden' USING ERRCODE='42501'; END IF;
 IF p_request_id IS NULL OR p_staff_id IS NULL OR jsonb_typeof(p_details) IS DISTINCT FROM 'object' OR length(p_details::text)>12000
 OR coalesce(length(btrim(p_details->>'full_name')),0) NOT BETWEEN 1 AND 200 OR coalesce(length(btrim(p_details->>'job_title')),0) NOT BETWEEN 1 AND 200
 OR length(coalesce(p_details->>'reason',''))>2000 THEN RAISE EXCEPTION 'invalid_staff_profile' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_object_keys(p_details) AS keys(name) WHERE name NOT IN ('full_name','phone_number','job_title','specialization','hire_date','email','address','dob','service_locked','staff_level_id','employment_status','reason')) THEN RAISE EXCEPTION 'invalid_staff_profile' USING ERRCODE='22023'; END IF;
 IF nullif(btrim(p_details->>'email'),'') IS NOT NULL AND btrim(p_details->>'email') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN RAISE EXCEPTION 'invalid_staff_email' USING ERRCODE='22023'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 payload:=jsonb_build_object('staff_id',p_staff_id,'details',p_details)::text;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text,31));
 IF FOUND THEN
  IF prior.staff_id IS DISTINCT FROM actor OR prior.description<>payload THEN RAISE EXCEPTION 'staff_request_conflict' USING ERRCODE='PT409'; END IF;
  RETURN p_staff_id;
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('staff-access-admin-guard',31));
 SELECT * INTO old FROM public.staff WHERE id=p_staff_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'staff_not_found' USING ERRCODE='P0002'; END IF;
 IF p_expected_updated_at IS NULL OR old.updated_at<>p_expected_updated_at THEN RAISE EXCEPTION 'staff_profile_changed' USING ERRCODE='PT409'; END IF;
 employment:=lower(p_details->>'employment_status');locked:=(p_details->>'service_locked')::boolean;level_key:=nullif(p_details->>'staff_level_id','')::uuid;
 IF employment IS NULL OR employment NOT IN ('active','leave','paused','resigned') OR locked IS NULL THEN RAISE EXCEPTION 'invalid_staff_profile' USING ERRCODE='22023'; END IF;
 IF level_key IS DISTINCT FROM old.staff_level_id THEN RAISE EXCEPTION 'staff_level_separate_workflow' USING ERRCODE='22023'; END IF;
 IF employment IS DISTINCT FROM lower(old.employment_status) OR locked IS DISTINCT FROM old.service_locked THEN
  IF coalesce(length(btrim(p_details->>'reason')),0)<2 THEN RAISE EXCEPTION 'staff_change_reason_required' USING ERRCODE='22023'; END IF;
 END IF;
 IF employment<>'active' AND lower(old.employment_status)='active' AND EXISTS(SELECT 1 FROM public.staff_role WHERE staff_id=old.id AND role_code='ADMIN')
 AND NOT pawpal_private.other_available_admin(old.id) THEN
  SELECT 1 FROM public.appointment a WHERE a.appointment_status NOT IN ('completed','cancelled','no_show') AND
  (a.staff_id=old.id OR EXISTS(SELECT 1 FROM public.appointment_item i WHERE i.appointment_id=a.id AND i.staff_id=old.id AND i.status NOT IN ('completed','cancelled'))
   OR EXISTS(SELECT 1 FROM public.taxi_trip t WHERE t.appointment_id=a.id AND t.driver_staff_id=old.id AND t.status NOT IN ('completed','cancelled')))
 ) THEN RAISE EXCEPTION 'staff_handover_required' USING ERRCODE='PT409'; END IF;
 specialization=nullif(btrim(p_details->>'specialization'),''),hire_date=nullif(p_details->>'hire_date','')::date,dob=nullif(p_details->>'dob','')::date,
 employment_status=employment,service_locked=locked,updated_at=clock_timestamp() WHERE id=old.id;
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES(actor,'STAFF_PROFILE_SAVE','staff',p_request_id,payload);
 RETURN old.id;
```

### update_admin_sales_order

```sql
CREATE OR REPLACE FUNCTION public.update_admin_sales_order(p_request_id uuid, p_order_id uuid, p_expected_updated_at timestamp with time zone, p_action text, p_details jsonb)
 RETURNS uuid
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('sales_order.write')
 OR NOT pawpal_private.has_permission('inventory_transaction.write') OR NOT pawpal_private.has_permission('stock_reservation.write')
 OR NOT pawpal_private.has_permission('audit_log.write') THEN RAISE EXCEPTION 'sales_order_forbidden' USING ERRCODE='42501'; END IF;
 IF p_request_id IS NULL OR p_order_id IS NULL OR p_action IS NULL OR p_action NOT IN ('confirm','ship','update_shipping','complete','cancel')
 OR jsonb_typeof(p_details) IS DISTINCT FROM 'object' OR length(p_details::text)>6000 THEN RAISE EXCEPTION 'invalid_sales_action' USING ERRCODE='22023'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 payload:=jsonb_build_object('order_id',p_order_id,'action',p_action,'details',p_details)::text;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text,20));
 IF FOUND THEN
  IF prior.staff_id IS DISTINCT FROM actor OR prior.description<>payload THEN RAISE EXCEPTION 'sales_request_conflict' USING ERRCODE='PT409'; END IF;
  RETURN p_request_id;
 IF p_expected_updated_at IS NULL OR o.updated_at<>p_expected_updated_at THEN RAISE EXCEPTION 'sales_order_changed' USING ERRCODE='PT409'; END IF;
 IF (p_action='confirm' AND o.order_status NOT IN ('draft','pending'))
 OR (p_action='ship' AND o.order_status NOT IN ('confirmed','packing'))
 OR (p_action='update_shipping' AND o.order_status NOT IN ('shipped','shipping'))
 OR (p_action='complete' AND o.order_status NOT IN ('confirmed','packing','shipped','shipping'))
 OR (p_action='cancel' AND o.order_status NOT IN ('draft','pending','confirmed','packing')) THEN RAISE EXCEPTION 'invalid_sales_transition' USING ERRCODE='22023'; END IF;
 IF p_action='complete' AND (
  (o.order_status IN ('confirmed','packing') AND (o.delivery_option_id IS NOT NULL OR nullif(btrim(o.street_address_snapshot),'') IS NOT NULL))
 ) THEN RAISE EXCEPTION 'sales_handover_required' USING ERRCODE='22023'; END IF;
 IF p_action='cancel' THEN
  IF length(btrim(coalesce(p_details->>'note','')))>1000 OR length(btrim(coalesce(p_details->>'reason','')))>1200
 END IF;
 IF p_action IN ('ship','update_shipping') AND (
  nullif(btrim(o.receiver_name_snapshot),'') IS NULL OR nullif(btrim(o.receiver_phone_snapshot),'') IS NULL
 END IF;
 IF p_action IN ('ship','update_shipping') THEN
  IF coalesce(btrim(p_details->>'tracking_code'),'') !~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,199}$' THEN RAISE EXCEPTION 'sales_tracking_invalid' USING ERRCODE='22023'; END IF;
 END IF;
 IF p_action='update_shipping' THEN
  -- A correction must never consume reservations or create another stock issue.
   tracking_code=btrim(p_details->>'tracking_code'),shipped_at=coalesce(shipped_at,clock_timestamp()),updated_at=clock_timestamp() WHERE id=o.id;
  INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES(actor,'SALES_FULFILLMENT','sales_order',p_request_id,payload);
  RETURN p_request_id;
 IF NOT EXISTS(SELECT 1 FROM public.sales_order_detail WHERE order_id=o.id) THEN RAISE EXCEPTION 'sales_order_empty' USING ERRCODE='22023'; END IF;
 IF p_action='complete' AND o.order_status IN ('shipped','shipping') THEN
  SELECT EXISTS(SELECT 1 FROM public.audit_log WHERE action='SALES_LEGACY_SHIPPED' AND entity_id=o.id
 PERFORM 1 FROM public.product_variant WHERE id IN (SELECT product_variant_id FROM public.sales_order_detail WHERE order_id=o.id) ORDER BY id FOR UPDATE;
 IF p_action='cancel' THEN
  IF EXISTS(SELECT 1 FROM public.inventory_transaction t JOIN public.sales_order_detail d ON d.id=t.sales_order_detail_id WHERE d.order_id=o.id) THEN RAISE EXCEPTION 'sales_issued_order_requires_return' USING ERRCODE='22023'; END IF;
   SELECT -coalesce(sum(t.quantity),0) INTO issued FROM public.inventory_transaction t JOIN public.sales_order_detail d ON d.id=t.sales_order_detail_id WHERE d.order_id=o.id AND t.product_variant_id=line.product_variant_id;
   IF p_action='complete' AND o.order_status IN ('shipped','shipping') AND issued<>line.quantity AND NOT(issued=0 AND legacy_shipped) THEN RAISE EXCEPTION 'sales_stock_history_requires_review' USING ERRCODE='22023'; END IF;
   IF issued<>0 AND NOT (p_action='complete' AND o.order_status IN ('shipped','shipping') AND issued=line.quantity) THEN RAISE EXCEPTION 'sales_stock_history_requires_review' USING ERRCODE='22023'; END IF;
   IF issued=0 AND NOT legacy_shipped THEN
  END LOOP;
  IF p_action='ship' OR (p_action='complete' AND o.order_status IN ('confirmed','packing')) THEN
   UPDATE public.stock_reservation SET status='consumed' WHERE order_id=o.id AND status='active';
   FOR line IN SELECT * FROM public.sales_order_detail WHERE order_id=o.id ORDER BY product_variant_id,id LOOP
    INSERT INTO public.inventory_transaction(product_variant_id,transaction_type,quantity,note,staff_id,sales_order_detail_id,idempotency_key)
    VALUES(line.product_variant_id,'sale_issue',-line.quantity,'Xuất hàng theo đơn '||o.order_code,actor,line.id,'sales-issue:'||line.id);
 END IF;
 UPDATE public.sales_order SET receiver_name_snapshot=o.receiver_name_snapshot,receiver_phone_snapshot=o.receiver_phone_snapshot,street_address_snapshot=o.street_address_snapshot,province_snapshot=o.province_snapshot,order_status=CASE p_action WHEN 'confirm' THEN 'confirmed' WHEN 'ship' THEN 'shipped' WHEN 'complete' THEN 'completed' ELSE 'cancelled' END,
 shipping_provider_id=CASE WHEN p_action='ship' THEN (p_details->>'provider_id')::uuid ELSE shipping_provider_id END,
 tracking_code=CASE WHEN p_action='ship' THEN btrim(p_details->>'tracking_code') ELSE tracking_code END,
 shipped_at=CASE WHEN p_action='ship' THEN clock_timestamp() ELSE shipped_at END,
 delivered_at=CASE WHEN p_action='complete' THEN clock_timestamp() ELSE delivered_at END,
 shipping_status=CASE WHEN p_action='ship' THEN 'shipped' WHEN p_action='complete' THEN 'delivered' WHEN p_action='cancel' THEN 'cancelled' ELSE shipping_status END,
 updated_at=clock_timestamp() WHERE id=o.id;
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES(actor,'SALES_FULFILLMENT','sales_order',p_request_id,payload);
 RETURN p_request_id;
```
