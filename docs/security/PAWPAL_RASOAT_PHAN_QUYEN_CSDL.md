# Rà soát phân quyền CSDL PawPal

## Kết luận để triển khai mô hình hai vai trò

Đã kiểm kê trực tiếp 38 bảng, 159 chính sách RLS và metadata của 129 hàm liên quan trên Cloud. Các bảng phân quyền nền tảng đều tồn tại; có thể tận dụng cơ chế hiện có. Chưa thay đổi CSDL và chưa chạy 30 kịch bản nghiệm thu.

| Phát hiện | Ý nghĩa và việc cần làm |
|---|---|
| Chỉ có vai trò ADMIN, gán cho một nhân sự, có 210 quyền | Chưa có vai trò Nhân viên. Cần bổ sung bộ quyền cố định và đổi tên hiển thị ADMIN thành Quản lý |
| Có 17 hồ sơ nhân sự, 16 hồ sơ chưa có vai trò; không có quyền cấp riêng | Cần xác định tài khoản nào được kích hoạt và gán vai trò. Không tự gán toàn bộ hồ sơ thành Nhân viên |
| Có 15 hồ sơ dùng trạng thái ACTIVE và phải đổi mật khẩu; hàm xác thực kiểm tra đúng chuỗi active | Trạng thái đang không đồng nhất. Các hồ sơ ACTIVE không thỏa điều kiện hoạt động của hàm hiện tại; cần chuẩn hóa trạng thái trong quá trình chuyển đổi, giữ nguyên trạng thái khóa và nghỉ việc theo nghiệp vụ |
| RLS trên appointment, appointment_item, staff và chat_conversation chủ yếu kiểm tra quyền read/write của bảng | Cấp các quyền bảng hiện tại chưa đủ giới hạn theo cá nhân hoặc người được giao. Cần bổ sung điều kiện phạm vi và rà soát RPC tương ứng |
| staff_schedule có policy SELECT true cho anon/authenticated, đồng thời có GRANT SELECT ở cấp bảng cho hai role | Không thể bảo đảm Nhân viên chỉ xem lịch cá nhân bằng cách giấu menu. Cần tách nhu cầu lịch khả dụng công khai khỏi lịch nhân sự và giới hạn cột/dòng phù hợp |
| Chatbot có kiểm tra quyền trong CSDL; nhánh revenue.summary kiểm tra admin_copilot_history.read, payment.read và refund_transaction.read | Đã có nền tảng bảo vệ, nhưng cần giới hạn doanh thu tổng hợp cho Quản lý riêng với quyền đọc thanh toán phục vụ thu ngân |
| act_admin_chat có kiểm tra assigned_staff_id, trong khi policy đọc hội thoại kiểm tra quyền bảng | Giữ kiểm soát thao tác đã có, hoàn thiện phạm vi đọc. Không kết luận toàn bộ chatbot đã đáp ứng bảng quyền mới |
| set_admin_staff_access vẫn nhận nhiều vai trò và quyền cấp riêng | Cần giới hạn đầu vào theo hai vai trò, loại bỏ cấp ngoại lệ ở cả API/RPC và giao diện |
| Có hàm other_available_admin, khóa đồng thời và kiểm tra phiên bản hồ sơ trong luồng đổi quyền | Có thể tận dụng bảo vệ Quản lý cuối cùng; vẫn phải chạy kiểm thử đồng thời trước khi nghiệm thu |
| authenticated còn có quyền UPDATE theo cột staff.id | Cần rà soát lý do tồn tại và tác động cùng RLS, ràng buộc, trigger; chưa thực hiện thử ghi và chưa kết luận đây là đường vượt quyền |

**Thứ tự sửa đề xuất:** xác định tài khoản và chuẩn hóa trạng thái → thiết lập bộ quyền Nhân viên → bảo vệ phạm vi dữ liệu/RPC và doanh thu chatbot → đơn giản hóa giao diện chọn vai trò → kiểm thử bằng phiên thật. Chức năng chưa được phân loại trong bảng quyền cần được xác định trước khi cấp quyền.

Phần dưới là bằng chứng kiểm kê. Việc RLS đang bật không đồng nghĩa mọi phạm vi quyền đã đúng; không dùng kết nối PostgreSQL quản trị làm bằng chứng rằng phiên Nhân viên có quyền truy cập.

Thời điểm kiểm tra UTC: 2026-11-04T15:05:01.009Z.
Đích kiểm tra: Supabase Cloud `cpzuvaplseielhgcnqrn`, theo bộ kết nối Cloud hiện có trong dự án.
Phương pháp: giao dịch PostgreSQL READ ONLY, đọc catalog và thống kê phân quyền có phạm vi. Không thay đổi dữ liệu, không đăng nhập Auth, không truy vấn hệ thống Logs, không xuất dữ liệu cá nhân hoặc hội thoại.
Giới hạn: đây là kiểm kê cấu hình thực tế; chưa chạy API bằng phiên Nhân viên/Quản lý và chưa chứng minh phân quyền hoạt động đúng bằng kiểm thử đầu cuối. Không tự xác nhận đây là project mà mọi bản triển khai đang sử dụng.

## Thống kê

| Chỉ số | Giá trị |
|---|---|
| staff | 17 |
| direct_permissions | 0 |
| staff_with_direct_permissions | 0 |
| without_role | 16 |
| multiple_roles | 0 |

| Trạng thái nhân sự | Tổng | Liên kết Auth | Cần đổi mật khẩu |
|---|---|---|---|
| active | 1 | 1 | 0 |
| ACTIVE | 15 | 15 | 15 |
| resigned | 1 | 1 | 1 |

## Vai trò thực tế

| Mã | Tên | Số quyền | Số nhân viên |
|---|---|---|---|
| ADMIN | Quản trị viên | 210 | 1 |

| Vai trò | Trạng thái nhân sự | Tổng | Auth sẵn sàng, không bị khóa và không cần đổi mật khẩu |
|---|---|---|---|
| ADMIN | active | 1 | 1 |

## Bảng và chính sách

| Bảng | RLS | Force RLS | Số policy | Cột |
|---|---|---|---|---|
| access_role | true | false | 4 | code, role_name, created_at, updated_at |
| admin_copilot_history | true | false | 1 | id, session_id, staff_id, role, content, metadata, created_at |
| appointment | true | false | 5 | id, appointment_code, customer_id, pet_id, staff_id, check_in_time, check_out_time, note, change_count, appointment_status, created_at, updated_at, scheduled_start_at, scheduled_end_at |
| appointment_item | true | false | 5 | id, appointment_id, service_id, service_addon_id, is_primary, name_snapshot, quantity, unit_price, discount_amount, duration_minutes, weight_snapshot, staff_id, status, created_at, updated_at |
| appointment_record | true | false | 4 | id, appointment_id, record_type, schema_version, revision_no, recorded_by, recorded_at, condition_note, safety_note_snapshot, allergy_note_snapshot, customer_confirmation_status, confirmed_at, note, created_at |
| audit_log | true | false | 2 | id, staff_id, action, entity_name, entity_id, description, created_at |
| care_log | true | false | 5 | id, appointment_id, care_action_id, description, observed_condition, recorded_at, created_at, updated_at, recorded_by, action_name_snapshot |
| chat_conversation | true | false | 4 | id, customer_id, status, sentiment_level, sentiment_trend, is_urgent, assigned_staff_id, ai_summary, internal_note, sla_deadline, resolved_at, resolved_reason, resolved_by, violation_count, blocked_until, channel, created_at, updated_at, guest_session_id, session_token, bot_unhandled_count |
| chat_message | true | false | 4 | id, conversation_id, sender_type, content, raw_content, is_toxic, sentiment_score, metadata, created_at, sender_account_id, sender_guest_session_id |
| chatbot_compensation_policy | true | false | 4 | id, issue_type, max_points, max_discount_vnd, approval_required, description, is_active |
| chatbot_handover_rule | true | false | 4 | id, condition_name, trigger_type, threshold_value, auto_assign_role, sla_seconds, is_active |
| customer | true | false | 5 | id, auth_user_id, customer_code, customer_status, registered_at, note, created_at, updated_at, contact_email, unverified_contact_phone |
| customer_address | true | false | 5 | id, customer_id, receiver_name, receiver_phone, province, street_address, postal_code, is_default, created_at, updated_at |
| customer_phone | true | false | 5 | id, customer_id, phone_number, is_primary, verified_at, created_at, updated_at |
| customer_profile | true | false | 5 | customer_id, full_name, date_of_birth, gender, created_at, updated_at |
| inventory | true | false | 3 | id, product_variant_id, quantity_in_stock, minimum_stock, last_updated_at |
| inventory_transaction | true | false | 1 | id, product_variant_id, transaction_type, quantity, note, staff_id, created_at, purchase_order_detail_id, sales_order_detail_id, return_request_detail_id, idempotency_key, recorded_at |
| paw_point_transaction | true | false | 2 | id, customer_id, payment_id, review_id, reward_rule_id, points, description, created_at, refund_transaction_id, voucher_redemption_id, customer_voucher_id, idempotency_key, sequence_no |
| pawpal_setting | true | false | 4 | id, setting_key, setting_value, setting_type, description, created_at, updated_at |
| payment | true | false | 3 | id, payment_code, customer_id, payment_method_config_id, payment_type, amount, transaction_status, succeeded_at, created_at, updated_at, gateway_transaction_id, idempotency_key, order_id, appointment_id, eligible_spend_amount |
| permission | true | false | 4 | code, description |
| pet_profile | true | false | 5 | id, customer_id, pet_code, pet_name, avatar_url, gender, date_of_birth, color, routine, allergy, status, created_at, updated_at, breed_id, safety_note |
| product | true | false | 6 | id, category_id, product_name, unit, target_pet, description, slug, status, created_at, updated_at, origin, ingredients, benefits, usage_instructions, specs, badge, brand_name, product_code |
| product_variant | true | false | 6 | id, product_id, color_id, size_id, flavor_id, sku_variant, cost_price, sale_price, compare_at_price, weight, barcode, status, created_at, updated_at, variant_name, packaging, features, badge, gross_weight_text, description, ingredients, source_url, source_slug, catalog_retired |
| refund_transaction | true | false | 2 | id, refund_code, ticket_id, payment_id, refund_type, requested_amount, approved_amount, refunded_amount, refund_method, refund_status, gateway_transaction_id, note, processed_by, processed_at, completed_at, created_at, updated_at, return_request_id, eligible_refund_amount |
| role_permission | true | false | 4 | role_code, permission_code |
| sales_order | true | false | 6 | id, order_code, customer_id, order_status, note, created_at, updated_at, shipping_fee_snapshot, receiver_name_snapshot, receiver_phone_snapshot, province_snapshot, street_address_snapshot, postal_code_snapshot, delivery_option_id, shipping_provider_id, tracking_code, shipped_at, delivered_at, shipping_status |
| sales_order_detail | true | false | 5 | id, order_id, product_variant_id, quantity, unit_price, discount_amount, product_name_snapshot, sku_snapshot |
| service | true | false | 6 | id, service_code, service_name, description, estimated_duration, status, commission_rate, benefits, created_at, updated_at, category_id, staff_level_required_id, amenities, package_name, duration_label, trip_type |
| service_price_matrix | true | false | 6 | id, service_id, weight_from, weight_to, unit_price, effective_from, effective_to, status, created_at, updated_at, variant_code, variant_condition, duration_minutes, weight_to_inclusive |
| staff | true | false | 5 | id, full_name, phone_number, job_title, specialization, hire_date, email, address, dob, service_locked, created_at, updated_at, auth_user_id, staff_level_id, employment_status, must_change_password |
| staff_assessment | true | false | 4 | id, staff_id, assessment_date, assessment_type, score, result, note, assessed_by, created_at, updated_at |
| staff_permission | true | false | 4 | staff_id, permission_code |
| staff_role | true | false | 4 | staff_id, role_code |
| staff_schedule | true | false | 5 | id, staff_id, availability_status, reason, schedule_status, created_at, updated_at, start_at, end_at |
| staff_shift_request | true | false | 4 | id, request_type, staff_id, target_staff_id, replacement_staff_id, leave_type, start_date, end_date, shift, target_date, target_shift, reason, status, created_by, reviewed_by, reviewed_at, created_at |
| support_ticket | true | false | 4 | id, ticket_code, customer_id, order_id, appointment_id, channel, category, subject, description, priority, type, status, requested_resolution, requested_amount, assigned_staff_id, first_response_at, investigation_note, resolution_type, resolution_note, approved_amount, resolved_by, resolved_at, closed_at, rating, rating_comment, created_at, updated_at, created_by_account_id |
| voucher | true | false | 4 | id, voucher_code, voucher_name, discount_value, minimum_order_amount, required_points, start_date, end_date, is_active, type, description, applicable_for, max_usage, created_at, updated_at |

Tên được tìm nhưng chưa thấy trong catalog: sales_order_item.

## Biểu thức RLS thực tế

| Bảng | Policy | Role | Thao tác | USING | WITH CHECK |
|---|---|---|---|---|---|
| access_role | v1_delete | {authenticated} | DELETE | pawpal_private.has_permission('access_role.write'::text) | — |
| access_role | v1_insert | {authenticated} | INSERT | — | pawpal_private.has_permission('access_role.write'::text) |
| access_role | v1_read | {authenticated} | SELECT | pawpal_private.has_permission('access_role.read'::text) | — |
| access_role | v1_update | {authenticated} | UPDATE | pawpal_private.has_permission('access_role.write'::text) | pawpal_private.has_permission('access_role.write'::text) |
| admin_copilot_history | v1_copilot_owner | {authenticated} | SELECT | (pawpal_private.has_permission('admin_copilot_history.read'::text) AND (staff_id = (((get_staff_login_context() -> 'staff'::text) ->> 'id'::text))::uuid)) | — |
| appointment | own_customer_appointment | {authenticated} | SELECT | pawpal_private.owns_customer(customer_id) | — |
| appointment | v1_delete | {authenticated} | DELETE | pawpal_private.has_permission('appointment.write'::text) | — |
| appointment | v1_insert | {authenticated} | INSERT | — | pawpal_private.has_permission('appointment.write'::text) |
| appointment | v1_read | {authenticated} | SELECT | pawpal_private.has_permission('appointment.read'::text) | — |
| appointment | v1_update | {authenticated} | UPDATE | pawpal_private.has_permission('appointment.write'::text) | pawpal_private.has_permission('appointment.write'::text) |
| appointment_item | own_customer_appointment_item | {authenticated} | SELECT | (EXISTS ( SELECT 1    FROM appointment a   WHERE ((a.id = appointment_item.appointment_id) AND pawpal_private.owns_customer(a.customer_id)))) | — |
| appointment_item | v1_delete | {authenticated} | DELETE | pawpal_private.has_permission('appointment_item.write'::text) | — |
| appointment_item | v1_insert | {authenticated} | INSERT | — | pawpal_private.has_permission('appointment_item.write'::text) |
| appointment_item | v1_read | {authenticated} | SELECT | pawpal_private.has_permission('appointment_item.read'::text) | — |
| appointment_item | v1_update | {authenticated} | UPDATE | pawpal_private.has_permission('appointment_item.write'::text) | pawpal_private.has_permission('appointment_item.write'::text) |
| appointment_record | v1_delete | {authenticated} | DELETE | pawpal_private.has_permission('appointment_record.write'::text) | — |
| appointment_record | v1_insert | {authenticated} | INSERT | — | pawpal_private.has_permission('appointment_record.write'::text) |
| appointment_record | v1_read | {authenticated} | SELECT | pawpal_private.has_permission('appointment_record.read'::text) | — |
| appointment_record | v1_update | {authenticated} | UPDATE | pawpal_private.has_permission('appointment_record.write'::text) | pawpal_private.has_permission('appointment_record.write'::text) |
| audit_log | v1_insert | {authenticated} | INSERT | — | pawpal_private.has_permission('audit_log.write'::text) |
| audit_log | v1_read | {authenticated} | SELECT | pawpal_private.has_permission('audit_log.read'::text) | — |
| care_log | own_customer_care_log | {authenticated} | SELECT | (EXISTS ( SELECT 1    FROM appointment a   WHERE ((a.id = care_log.appointment_id) AND pawpal_private.owns_customer(a.customer_id)))) | — |
| care_log | v1_delete | {authenticated} | DELETE | pawpal_private.has_permission('care_log.write'::text) | — |
| care_log | v1_insert | {authenticated} | INSERT | — | pawpal_private.has_permission('care_log.write'::text) |
| care_log | v1_read | {authenticated} | SELECT | pawpal_private.has_permission('care_log.read'::text) | — |
| care_log | v1_update | {authenticated} | UPDATE | pawpal_private.has_permission('care_log.write'::text) | pawpal_private.has_permission('care_log.write'::text) |
| chat_conversation | v1_delete | {authenticated} | DELETE | pawpal_private.has_permission('chat_conversation.write'::text) | — |
| chat_conversation | v1_insert | {authenticated} | INSERT | — | pawpal_private.has_permission('chat_conversation.write'::text) |
| chat_conversation | v1_read | {authenticated} | SELECT | pawpal_private.has_permission('chat_conversation.read'::text) | — |
| chat_conversation | v1_update | {authenticated} | UPDATE | pawpal_private.has_permission('chat_conversation.write'::text) | pawpal_private.has_permission('chat_conversation.write'::text) |
| chat_message | v1_delete | {authenticated} | DELETE | pawpal_private.has_permission('chat_message.write'::text) | — |
| chat_message | v1_insert | {authenticated} | INSERT | — | pawpal_private.has_permission('chat_message.write'::text) |
| chat_message | v1_read | {authenticated} | SELECT | pawpal_private.has_permission('chat_message.read'::text) | — |
| chat_message | v1_update | {authenticated} | UPDATE | pawpal_private.has_permission('chat_message.write'::text) | pawpal_private.has_permission('chat_message.write'::text) |
| chatbot_compensation_policy | v1_delete | {authenticated} | DELETE | pawpal_private.has_permission('chatbot_compensation_policy.write'::text) | — |
| chatbot_compensation_policy | v1_insert | {authenticated} | INSERT | — | pawpal_private.has_permission('chatbot_compensation_policy.write'::text) |
| chatbot_compensation_policy | v1_read | {authenticated} | SELECT | pawpal_private.has_permission('chatbot_compensation_policy.read'::text) | — |
| chatbot_compensation_policy | v1_update | {authenticated} | UPDATE | pawpal_private.has_permission('chatbot_compensation_policy.write'::text) | pawpal_private.has_permission('chatbot_compensation_policy.write'::text) |
| chatbot_handover_rule | v1_delete | {authenticated} | DELETE | pawpal_private.has_permission('chatbot_handover_rule.write'::text) | — |
| chatbot_handover_rule | v1_insert | {authenticated} | INSERT | — | pawpal_private.has_permission('chatbot_handover_rule.write'::text) |
| chatbot_handover_rule | v1_read | {authenticated} | SELECT | pawpal_private.has_permission('chatbot_handover_rule.read'::text) | — |
| chatbot_handover_rule | v1_update | {authenticated} | UPDATE | pawpal_private.has_permission('chatbot_handover_rule.write'::text) | pawpal_private.has_permission('chatbot_handover_rule.write'::text) |
| customer | own_customer | {authenticated} | SELECT | pawpal_private.owns_customer(id) | — |
| customer | v1_delete | {authenticated} | DELETE | pawpal_private.has_permission('customer.write'::text) | — |
| customer | v1_insert | {authenticated} | INSERT | — | pawpal_private.has_permission('customer.write'::text) |
| customer | v1_read | {authenticated} | SELECT | pawpal_private.has_permission('customer.read'::text) | — |
| customer | v1_update | {authenticated} | UPDATE | pawpal_private.has_permission('customer.write'::text) | pawpal_private.has_permission('customer.write'::text) |
| customer_address | own_customer | {authenticated} | SELECT | pawpal_private.owns_customer(customer_id) | — |
| customer_address | v1_delete | {authenticated} | DELETE | pawpal_private.has_permission('customer_address.write'::text) | — |
| customer_address | v1_insert | {authenticated} | INSERT | — | pawpal_private.has_permission('customer_address.write'::text) |
| customer_address | v1_read | {authenticated} | SELECT | pawpal_private.has_permission('customer_address.read'::text) | — |
| customer_address | v1_update | {authenticated} | UPDATE | pawpal_private.has_permission('customer_address.write'::text) | pawpal_private.has_permission('customer_address.write'::text) |
| customer_phone | own_customer | {authenticated} | SELECT | pawpal_private.owns_customer(customer_id) | — |
| customer_phone | v1_delete | {authenticated} | DELETE | pawpal_private.has_permission('customer_phone.write'::text) | — |
| customer_phone | v1_insert | {authenticated} | INSERT | — | pawpal_private.has_permission('customer_phone.write'::text) |
| customer_phone | v1_read | {authenticated} | SELECT | pawpal_private.has_permission('customer_phone.read'::text) | — |
| customer_phone | v1_update | {authenticated} | UPDATE | pawpal_private.has_permission('customer_phone.write'::text) | pawpal_private.has_permission('customer_phone.write'::text) |
| customer_profile | own_customer | {authenticated} | SELECT | pawpal_private.owns_customer(customer_id) | — |
| customer_profile | v1_delete | {authenticated} | DELETE | pawpal_private.has_permission('customer_profile.write'::text) | — |
| customer_profile | v1_insert | {authenticated} | INSERT | — | pawpal_private.has_permission('customer_profile.write'::text) |
| customer_profile | v1_read | {authenticated} | SELECT | pawpal_private.has_permission('customer_profile.read'::text) | — |
| customer_profile | v1_update | {authenticated} | UPDATE | pawpal_private.has_permission('customer_profile.write'::text) | pawpal_private.has_permission('customer_profile.write'::text) |
| inventory | anon_read | {anon} | SELECT | true | — |
| inventory | public_read | {authenticated} | SELECT | true | — |
| inventory | v1_read | {authenticated} | SELECT | pawpal_private.has_permission('inventory.read'::text) | — |
| inventory_transaction | v1_read | {authenticated} | SELECT | pawpal_private.has_permission('inventory_transaction.read'::text) | — |
| paw_point_transaction | own_customer | {authenticated} | SELECT | pawpal_private.owns_customer(customer_id) | — |
| paw_point_transaction | v1_read | {authenticated} | SELECT | pawpal_private.has_permission('paw_point_transaction.read'::text) | — |
| pawpal_setting | v1_delete | {authenticated} | DELETE | pawpal_private.has_permission('pawpal_setting.write'::text) | — |
| pawpal_setting | v1_insert | {authenticated} | INSERT | — | pawpal_private.has_permission('pawpal_setting.write'::text) |
| pawpal_setting | v1_read | {authenticated} | SELECT | pawpal_private.has_permission('pawpal_setting.read'::text) | — |
| pawpal_setting | v1_update | {authenticated} | UPDATE | pawpal_private.has_permission('pawpal_setting.write'::text) | pawpal_private.has_permission('pawpal_setting.write'::text) |
| payment | own_customer | {authenticated} | SELECT | pawpal_private.owns_customer(customer_id) | — |
| payment | own_customer_order_payment | {authenticated} | SELECT | pawpal_private.owns_customer(customer_id) | — |
| payment | v1_read | {authenticated} | SELECT | pawpal_private.has_permission('payment.read'::text) | — |
| permission | v1_delete | {authenticated} | DELETE | pawpal_private.has_permission('permission.write'::text) | — |
| permission | v1_insert | {authenticated} | INSERT | — | pawpal_private.has_permission('permission.write'::text) |
| permission | v1_read | {authenticated} | SELECT | pawpal_private.has_permission('permission.read'::text) | — |
| permission | v1_update | {authenticated} | UPDATE | pawpal_private.has_permission('permission.write'::text) | pawpal_private.has_permission('permission.write'::text) |
| pet_profile | own_customer | {authenticated} | SELECT | pawpal_private.owns_customer(customer_id) | — |
| pet_profile | v1_delete | {authenticated} | DELETE | pawpal_private.has_permission('pet_profile.write'::text) | — |
| pet_profile | v1_insert | {authenticated} | INSERT | — | pawpal_private.has_permission('pet_profile.write'::text) |
| pet_profile | v1_read | {authenticated} | SELECT | pawpal_private.has_permission('pet_profile.read'::text) | — |
| pet_profile | v1_update | {authenticated} | UPDATE | pawpal_private.has_permission('pet_profile.write'::text) | pawpal_private.has_permission('pet_profile.write'::text) |
| product | anon_read | {anon} | SELECT | true | — |
| product | public_read | {authenticated} | SELECT | true | — |
| product | v1_delete | {authenticated} | DELETE | pawpal_private.has_permission('product.write'::text) | — |
| product | v1_insert | {authenticated} | INSERT | — | pawpal_private.has_permission('product.write'::text) |
| product | v1_read | {authenticated} | SELECT | pawpal_private.has_permission('product.read'::text) | — |
| product | v1_update | {authenticated} | UPDATE | pawpal_private.has_permission('product.write'::text) | pawpal_private.has_permission('product.write'::text) |
| product_variant | anon_read | {anon} | SELECT | true | — |
| product_variant | public_read | {authenticated} | SELECT | true | — |
| product_variant | v1_delete | {authenticated} | DELETE | pawpal_private.has_permission('product_variant.write'::text) | — |
| product_variant | v1_insert | {authenticated} | INSERT | — | pawpal_private.has_permission('product_variant.write'::text) |
| product_variant | v1_read | {authenticated} | SELECT | pawpal_private.has_permission('product_variant.read'::text) | — |
| product_variant | v1_update | {authenticated} | UPDATE | pawpal_private.has_permission('product_variant.write'::text) | pawpal_private.has_permission('product_variant.write'::text) |
| refund_transaction | own_refund | {authenticated} | SELECT | (EXISTS ( SELECT 1    FROM payment p   WHERE ((p.id = refund_transaction.payment_id) AND pawpal_private.owns_customer(p.customer_id)))) | — |
| refund_transaction | v1_read | {authenticated} | SELECT | pawpal_private.has_permission('refund_transaction.read'::text) | — |
| role_permission | v1_delete | {authenticated} | DELETE | pawpal_private.has_permission('role_permission.write'::text) | — |
| role_permission | v1_insert | {authenticated} | INSERT | — | pawpal_private.has_permission('role_permission.write'::text) |
| role_permission | v1_read | {authenticated} | SELECT | pawpal_private.has_permission('role_permission.read'::text) | — |
| role_permission | v1_update | {authenticated} | UPDATE | pawpal_private.has_permission('role_permission.write'::text) | pawpal_private.has_permission('role_permission.write'::text) |
| sales_order | own_customer | {authenticated} | SELECT | pawpal_private.owns_customer(customer_id) | — |
| sales_order | own_customer_order | {authenticated} | SELECT | pawpal_private.owns_customer(customer_id) | — |
| sales_order | v1_delete | {authenticated} | DELETE | pawpal_private.has_permission('sales_order.write'::text) | — |
| sales_order | v1_insert | {authenticated} | INSERT | — | pawpal_private.has_permission('sales_order.write'::text) |
| sales_order | v1_read | {authenticated} | SELECT | pawpal_private.has_permission('sales_order.read'::text) | — |
| sales_order | v1_update | {authenticated} | UPDATE | pawpal_private.has_permission('sales_order.write'::text) | pawpal_private.has_permission('sales_order.write'::text) |
| sales_order_detail | own_customer_order_detail | {authenticated} | SELECT | (EXISTS ( SELECT 1    FROM sales_order o   WHERE ((o.id = sales_order_detail.order_id) AND pawpal_private.owns_customer(o.customer_id)))) | — |
| sales_order_detail | v1_delete | {authenticated} | DELETE | pawpal_private.has_permission('sales_order_detail.write'::text) | — |
| sales_order_detail | v1_insert | {authenticated} | INSERT | — | pawpal_private.has_permission('sales_order_detail.write'::text) |
| sales_order_detail | v1_read | {authenticated} | SELECT | pawpal_private.has_permission('sales_order_detail.read'::text) | — |
| sales_order_detail | v1_update | {authenticated} | UPDATE | pawpal_private.has_permission('sales_order_detail.write'::text) | pawpal_private.has_permission('sales_order_detail.write'::text) |
| service | anon_read | {anon} | SELECT | true | — |
| service | public_read | {authenticated} | SELECT | true | — |
| service | v1_delete | {authenticated} | DELETE | pawpal_private.has_permission('service.write'::text) | — |
| service | v1_insert | {authenticated} | INSERT | — | pawpal_private.has_permission('service.write'::text) |
| service | v1_read | {authenticated} | SELECT | pawpal_private.has_permission('service.read'::text) | — |
| service | v1_update | {authenticated} | UPDATE | pawpal_private.has_permission('service.write'::text) | pawpal_private.has_permission('service.write'::text) |
| service_price_matrix | anon_read | {anon} | SELECT | true | — |
| service_price_matrix | public_read | {authenticated} | SELECT | true | — |
| service_price_matrix | v1_delete | {authenticated} | DELETE | pawpal_private.has_permission('service_price_matrix.write'::text) | — |
| service_price_matrix | v1_insert | {authenticated} | INSERT | — | pawpal_private.has_permission('service_price_matrix.write'::text) |
| service_price_matrix | v1_read | {authenticated} | SELECT | pawpal_private.has_permission('service_price_matrix.read'::text) | — |
| service_price_matrix | v1_update | {authenticated} | UPDATE | pawpal_private.has_permission('service_price_matrix.write'::text) | pawpal_private.has_permission('service_price_matrix.write'::text) |
| staff | anon_read_staff | {anon,authenticated} | SELECT | (employment_status = 'active'::text) | — |
| staff | v1_delete | {authenticated} | DELETE | pawpal_private.has_permission('staff.write'::text) | — |
| staff | v1_insert | {authenticated} | INSERT | — | pawpal_private.has_permission('staff.write'::text) |
| staff | v1_read | {authenticated} | SELECT | pawpal_private.has_permission('staff.read'::text) | — |
| staff | v1_update | {authenticated} | UPDATE | pawpal_private.has_permission('staff.write'::text) | pawpal_private.has_permission('staff.write'::text) |
| staff_assessment | v1_delete | {authenticated} | DELETE | pawpal_private.has_permission('staff_assessment.write'::text) | — |
| staff_assessment | v1_insert | {authenticated} | INSERT | — | pawpal_private.has_permission('staff_assessment.write'::text) |
| staff_assessment | v1_read | {authenticated} | SELECT | pawpal_private.has_permission('staff_assessment.read'::text) | — |
| staff_assessment | v1_update | {authenticated} | UPDATE | pawpal_private.has_permission('staff_assessment.write'::text) | pawpal_private.has_permission('staff_assessment.write'::text) |
| staff_permission | v1_delete | {authenticated} | DELETE | pawpal_private.has_permission('staff_permission.write'::text) | — |
| staff_permission | v1_insert | {authenticated} | INSERT | — | pawpal_private.has_permission('staff_permission.write'::text) |
| staff_permission | v1_read | {authenticated} | SELECT | pawpal_private.has_permission('staff_permission.read'::text) | — |
| staff_permission | v1_update | {authenticated} | UPDATE | pawpal_private.has_permission('staff_permission.write'::text) | pawpal_private.has_permission('staff_permission.write'::text) |
| staff_role | v1_delete | {authenticated} | DELETE | pawpal_private.has_permission('staff_role.write'::text) | — |
| staff_role | v1_insert | {authenticated} | INSERT | — | pawpal_private.has_permission('staff_role.write'::text) |
| staff_role | v1_read | {authenticated} | SELECT | pawpal_private.has_permission('staff_role.read'::text) | — |
| staff_role | v1_update | {authenticated} | UPDATE | pawpal_private.has_permission('staff_role.write'::text) | pawpal_private.has_permission('staff_role.write'::text) |
| staff_schedule | anon_read_staff_schedule | {anon,authenticated} | SELECT | true | — |
| staff_schedule | v1_delete | {authenticated} | DELETE | pawpal_private.has_permission('staff_schedule.write'::text) | — |
| staff_schedule | v1_insert | {authenticated} | INSERT | — | pawpal_private.has_permission('staff_schedule.write'::text) |
| staff_schedule | v1_read | {authenticated} | SELECT | pawpal_private.has_permission('staff_schedule.read'::text) | — |
| staff_schedule | v1_update | {authenticated} | UPDATE | pawpal_private.has_permission('staff_schedule.write'::text) | pawpal_private.has_permission('staff_schedule.write'::text) |
| staff_shift_request | v1_delete | {authenticated} | DELETE | pawpal_private.has_permission('staff_shift_request.write'::text) | — |
| staff_shift_request | v1_insert | {authenticated} | INSERT | — | pawpal_private.has_permission('staff_shift_request.write'::text) |
| staff_shift_request | v1_read | {authenticated} | SELECT | pawpal_private.has_permission('staff_shift_request.read'::text) | — |
| staff_shift_request | v1_update | {authenticated} | UPDATE | pawpal_private.has_permission('staff_shift_request.write'::text) | pawpal_private.has_permission('staff_shift_request.write'::text) |
| support_ticket | v1_delete | {authenticated} | DELETE | pawpal_private.has_permission('support_ticket.write'::text) | — |
| support_ticket | v1_insert | {authenticated} | INSERT | — | pawpal_private.has_permission('support_ticket.write'::text) |
| support_ticket | v1_read | {authenticated} | SELECT | pawpal_private.has_permission('support_ticket.read'::text) | — |
| support_ticket | v1_update | {authenticated} | UPDATE | pawpal_private.has_permission('support_ticket.write'::text) | pawpal_private.has_permission('support_ticket.write'::text) |
| voucher | v1_delete | {authenticated} | DELETE | pawpal_private.has_permission('voucher.write'::text) | — |
| voucher | v1_insert | {authenticated} | INSERT | — | pawpal_private.has_permission('voucher.write'::text) |
| voucher | v1_read | {authenticated} | SELECT | pawpal_private.has_permission('voucher.read'::text) | — |
| voucher | v1_update | {authenticated} | UPDATE | pawpal_private.has_permission('voucher.write'::text) | pawpal_private.has_permission('voucher.write'::text) |

## Quyền truy cập bảng

| Bảng | Role PostgreSQL | Quyền |
|---|---|---|
| access_role | authenticated | SELECT |
| admin_copilot_history | authenticated | SELECT |
| appointment | authenticated | DELETE |
| appointment | authenticated | INSERT |
| appointment | authenticated | SELECT |
| appointment | authenticated | UPDATE |
| appointment_item | authenticated | DELETE |
| appointment_item | authenticated | INSERT |
| appointment_item | authenticated | SELECT |
| appointment_item | authenticated | UPDATE |
| appointment_record | authenticated | DELETE |
| appointment_record | authenticated | INSERT |
| appointment_record | authenticated | SELECT |
| appointment_record | authenticated | UPDATE |
| audit_log | authenticated | INSERT |
| audit_log | authenticated | SELECT |
| care_log | authenticated | DELETE |
| care_log | authenticated | INSERT |
| care_log | authenticated | SELECT |
| care_log | authenticated | UPDATE |
| chatbot_compensation_policy | authenticated | DELETE |
| chatbot_compensation_policy | authenticated | INSERT |
| chatbot_compensation_policy | authenticated | SELECT |
| chatbot_compensation_policy | authenticated | UPDATE |
| chatbot_handover_rule | authenticated | DELETE |
| chatbot_handover_rule | authenticated | INSERT |
| chatbot_handover_rule | authenticated | SELECT |
| chatbot_handover_rule | authenticated | UPDATE |
| customer | authenticated | DELETE |
| customer | authenticated | INSERT |
| customer | authenticated | SELECT |
| customer | authenticated | UPDATE |
| customer_address | authenticated | DELETE |
| customer_address | authenticated | INSERT |
| customer_address | authenticated | SELECT |
| customer_address | authenticated | UPDATE |
| customer_phone | authenticated | DELETE |
| customer_phone | authenticated | INSERT |
| customer_phone | authenticated | SELECT |
| customer_phone | authenticated | UPDATE |
| customer_profile | authenticated | DELETE |
| customer_profile | authenticated | INSERT |
| customer_profile | authenticated | SELECT |
| customer_profile | authenticated | UPDATE |
| inventory | anon | SELECT |
| inventory | authenticated | SELECT |
| inventory_transaction | authenticated | SELECT |
| paw_point_transaction | authenticated | SELECT |
| pawpal_setting | authenticated | SELECT |
| payment | authenticated | SELECT |
| permission | authenticated | SELECT |
| pet_profile | authenticated | DELETE |
| pet_profile | authenticated | INSERT |
| pet_profile | authenticated | SELECT |
| pet_profile | authenticated | UPDATE |
| product | anon | SELECT |
| product | authenticated | DELETE |
| product | authenticated | INSERT |
| product | authenticated | SELECT |
| product | authenticated | UPDATE |
| product_variant | anon | SELECT |
| product_variant | authenticated | DELETE |
| product_variant | authenticated | INSERT |
| product_variant | authenticated | SELECT |
| product_variant | authenticated | UPDATE |
| refund_transaction | authenticated | SELECT |
| role_permission | authenticated | SELECT |
| sales_order | authenticated | DELETE |
| sales_order | authenticated | INSERT |
| sales_order | authenticated | SELECT |
| sales_order | authenticated | UPDATE |
| sales_order_detail | authenticated | DELETE |
| sales_order_detail | authenticated | INSERT |
| sales_order_detail | authenticated | SELECT |
| sales_order_detail | authenticated | UPDATE |
| service | anon | SELECT |
| service | authenticated | DELETE |
| service | authenticated | INSERT |
| service | authenticated | SELECT |
| service | authenticated | UPDATE |
| service_price_matrix | anon | SELECT |
| service_price_matrix | authenticated | DELETE |
| service_price_matrix | authenticated | INSERT |
| service_price_matrix | authenticated | SELECT |
| service_price_matrix | authenticated | UPDATE |
| staff | authenticated | SELECT |
| staff_assessment | authenticated | SELECT |
| staff_permission | authenticated | SELECT |
| staff_role | authenticated | SELECT |
| staff_schedule | anon | SELECT |
| staff_schedule | authenticated | SELECT |
| staff_shift_request | authenticated | SELECT |
| support_ticket | authenticated | SELECT |
| voucher | authenticated | SELECT |

Quyền ghi theo cột trên các bảng phân quyền:

| Bảng | Cột | Role | Quyền |
|---|---|---|---|
| staff | id | authenticated | UPDATE |

## Danh mục quyền và ánh xạ vai trò

| Quyền | Mô tả | Vai trò có quyền |
|---|---|---|
| access_role.read | access_role: read | ADMIN |
| access_role.write | access_role: write | ADMIN |
| admin_copilot_history.read | admin_copilot_history: read | ADMIN |
| admin_copilot_history.write | admin_copilot_history: write | ADMIN |
| appointment_adjustment.read | appointment_adjustment: read | ADMIN |
| appointment_adjustment.write | appointment_adjustment: write | ADMIN |
| appointment_item.read | appointment_item: read | ADMIN |
| appointment_item.write | appointment_item: write | ADMIN |
| appointment_record.read | appointment_record: read | ADMIN |
| appointment_record.write | appointment_record: write | ADMIN |
| appointment.read | appointment: read | ADMIN |
| appointment.write | appointment: write | ADMIN |
| audit_log.read | audit_log: read | ADMIN |
| audit_log.write | audit_log: write | ADMIN |
| banner.read | banner: read | ADMIN |
| banner.write | banner: write | ADMIN |
| blog_category.read | blog_category: read | ADMIN |
| blog_category.write | blog_category: write | ADMIN |
| blog_post.read | blog_post: read | ADMIN |
| blog_post.write | blog_post: write | ADMIN |
| care_action.read | care_action: read | ADMIN |
| care_action.write | care_action: write | ADMIN |
| care_log_media.read | care_log_media: read | ADMIN |
| care_log_media.write | care_log_media: write | ADMIN |
| care_log.read | care_log: read | ADMIN |
| care_log.write | care_log: write | ADMIN |
| cart_item.read | cart_item: read | ADMIN |
| cart_item.write | cart_item: write | ADMIN |
| cart.read | cart: read | ADMIN |
| cart.write | cart: write | ADMIN |
| chat_conversation.read | chat_conversation: read | ADMIN |
| chat_conversation.write | chat_conversation: write | ADMIN |
| chat_feedback.read | chat_feedback: read | ADMIN |
| chat_feedback.write | chat_feedback: write | ADMIN |
| chat_message.read | chat_message: read | ADMIN |
| chat_message.write | chat_message: write | ADMIN |
| chat_moderation_log.read | chat_moderation_log: read | ADMIN |
| chat_moderation_log.write | chat_moderation_log: write | ADMIN |
| chatbot_canned_response.read | chatbot_canned_response: read | ADMIN |
| chatbot_canned_response.write | chatbot_canned_response: write | ADMIN |
| chatbot_compensation_policy.read | chatbot_compensation_policy: read | ADMIN |
| chatbot_compensation_policy.write | chatbot_compensation_policy: write | ADMIN |
| chatbot_handover_rule.read | chatbot_handover_rule: read | ADMIN |
| chatbot_handover_rule.write | chatbot_handover_rule: write | ADMIN |
| chatbot_knowledge_faq.read | chatbot_knowledge_faq: read | ADMIN |
| chatbot_knowledge_faq.write | chatbot_knowledge_faq: write | ADMIN |
| chatbot_profanity_filter.read | chatbot_profanity_filter: read | ADMIN |
| chatbot_profanity_filter.write | chatbot_profanity_filter: write | ADMIN |
| chatbot_scenario_matrix.read | chatbot_scenario_matrix: read | ADMIN |
| chatbot_scenario_matrix.write | chatbot_scenario_matrix: write | ADMIN |
| chatbot_sentiment_action.read | chatbot_sentiment_action: read | ADMIN |
| chatbot_sentiment_action.write | chatbot_sentiment_action: write | ADMIN |
| chatbot_sentiment_tier.read | chatbot_sentiment_tier: read | ADMIN |
| chatbot_sentiment_tier.write | chatbot_sentiment_tier: write | ADMIN |
| chatbot_sentiment_trigger.read | chatbot_sentiment_trigger: read | ADMIN |
| chatbot_sentiment_trigger.write | chatbot_sentiment_trigger: write | ADMIN |
| chatbot_system_prompt.read | chatbot_system_prompt: read | ADMIN |
| chatbot_system_prompt.write | chatbot_system_prompt: write | ADMIN |
| customer_address.read | customer_address: read | ADMIN |
| customer_address.write | customer_address: write | ADMIN |
| customer_membership.read | customer_membership: read | ADMIN |
| customer_membership.write | customer_membership: write | ADMIN |
| customer_phone.read | customer_phone: read | ADMIN |
| customer_phone.write | customer_phone: write | ADMIN |
| customer_profile.read | customer_profile: read | ADMIN |
| customer_profile.write | customer_profile: write | ADMIN |
| customer_voucher.read | customer_voucher: read | ADMIN |
| customer_voucher.write | customer_voucher: write | ADMIN |
| customer.read | customer: read | ADMIN |
| customer.write | customer: write | ADMIN |
| delivery_option_config.read | delivery_option_config: read | ADMIN |
| delivery_option_config.write | delivery_option_config: write | ADMIN |
| document_embeddings.read | document_embeddings: read | ADMIN |
| document_embeddings.write | document_embeddings: write | ADMIN |
| guest_session.read | guest_session: read | ADMIN |
| guest_session.write | guest_session: write | ADMIN |
| hotel_booking.read | hotel_booking: read | ADMIN |
| hotel_booking.write | hotel_booking: write | ADMIN |
| hotel_room_type.read | hotel_room_type: read | ADMIN |
| hotel_room_type.write | hotel_room_type: write | ADMIN |
| hotel_room.read | hotel_room: read | ADMIN |
| hotel_room.write | hotel_room: write | ADMIN |
| inventory_transaction.read | inventory_transaction: read | ADMIN |
| inventory_transaction.write | inventory_transaction: write | ADMIN |
| inventory.read | inventory: read | ADMIN |
| inventory.write | inventory: write | ADMIN |
| membership_tier.read | membership_tier: read | ADMIN |
| membership_tier.write | membership_tier: write | ADMIN |
| notification.read | notification: read | ADMIN |
| notification.write | notification: write | ADMIN |
| paw_point_transaction.read | paw_point_transaction: read | ADMIN |
| paw_point_transaction.write | paw_point_transaction: write | ADMIN |
| pawpal_setting.read | pawpal_setting: read | ADMIN |
| pawpal_setting.write | pawpal_setting: write | ADMIN |
| payment_method_config.read | payment_method_config: read | ADMIN |
| payment_method_config.write | payment_method_config: write | ADMIN |
| payment.read | payment: read | ADMIN |
| payment.write | payment: write | ADMIN |
| permission.read | permission: read | ADMIN |
| permission.write | permission: write | ADMIN |
| pet_breed.read | pet_breed: read | ADMIN |
| pet_breed.write | pet_breed: write | ADMIN |
| pet_profile.read | pet_profile: read | ADMIN |
| pet_profile.write | pet_profile: write | ADMIN |
| pet_species.read | pet_species: read | ADMIN |
| pet_species.write | pet_species: write | ADMIN |
| pet_weight_history.read | pet_weight_history: read | ADMIN |
| pet_weight_history.write | pet_weight_history: write | ADMIN |
| product_category.read | product_category: read | ADMIN |
| product_category.write | product_category: write | ADMIN |
| product_media.read | product_media: read | ADMIN |
| product_media.write | product_media: write | ADMIN |
| product_variant_media.read | product_variant_media: read | ADMIN |
| product_variant_media.write | product_variant_media: write | ADMIN |
| product_variant.read | product_variant: read | ADMIN |
| product_variant.write | product_variant: write | ADMIN |
| product.read | product: read | ADMIN |
| product.write | product: write | ADMIN |
| promotion_product.read | promotion_product: read | ADMIN |
| promotion_product.write | promotion_product: write | ADMIN |
| promotion_service.read | promotion_service: read | ADMIN |
| promotion_service.write | promotion_service: write | ADMIN |
| promotion.read | promotion: read | ADMIN |
| promotion.write | promotion: write | ADMIN |
| purchase_order_detail.read | purchase_order_detail: read | ADMIN |
| purchase_order_detail.write | purchase_order_detail: write | ADMIN |
| purchase_order.read | purchase_order: read | ADMIN |
| purchase_order.write | purchase_order: write | ADMIN |
| refund_transaction.read | refund_transaction: read | ADMIN |
| refund_transaction.write | refund_transaction: write | ADMIN |
| return_request_detail.read | return_request_detail: read | ADMIN |
| return_request_detail.write | return_request_detail: write | ADMIN |
| return_request_evidence.read | return_request_evidence: read | ADMIN |
| return_request_evidence.write | return_request_evidence: write | ADMIN |
| return_request.read | return_request: read | ADMIN |
| return_request.write | return_request: write | ADMIN |
| review_media.read | review_media: read | ADMIN |
| review_media.write | review_media: write | ADMIN |
| review_response.read | review_response: read | ADMIN |
| review_response.write | review_response: write | ADMIN |
| review.read | review: read | ADMIN |
| review.write | review: write | ADMIN |
| reward_rule.read | reward_rule: read | ADMIN |
| reward_rule.write | reward_rule: write | ADMIN |
| role_permission.read | role_permission: read | ADMIN |
| role_permission.write | role_permission: write | ADMIN |
| sales_order_detail.read | sales_order_detail: read | ADMIN |
| sales_order_detail.write | sales_order_detail: write | ADMIN |
| sales_order.read | sales_order: read | ADMIN |
| sales_order.write | sales_order: write | ADMIN |
| service_addon.read | service_addon: read | ADMIN |
| service_addon.write | service_addon: write | ADMIN |
| service_care_action.read | service_care_action: read | ADMIN |
| service_care_action.write | service_care_action: write | ADMIN |
| service_category.read | service_category: read | ADMIN |
| service_category.write | service_category: write | ADMIN |
| service_image.read | service_image: read | ADMIN |
| service_image.write | service_image: write | ADMIN |
| service_price_matrix.read | service_price_matrix: read | ADMIN |
| service_price_matrix.write | service_price_matrix: write | ADMIN |
| service_supported_species.read | service_supported_species: read | ADMIN |
| service_supported_species.write | service_supported_species: write | ADMIN |
| service.read | service: read | ADMIN |
| service.write | service: write | ADMIN |
| shipping_provider.read | shipping_provider: read | ADMIN |
| shipping_provider.write | shipping_provider: write | ADMIN |
| staff_assessment.read | staff_assessment: read | ADMIN |
| staff_assessment.write | staff_assessment: write | ADMIN |
| staff_level.read | staff_level: read | ADMIN |
| staff_level.write | staff_level: write | ADMIN |
| staff_permission.read | staff_permission: read | ADMIN |
| staff_permission.write | staff_permission: write | ADMIN |
| staff_role.read | staff_role: read | ADMIN |
| staff_role.write | staff_role: write | ADMIN |
| staff_schedule.read | staff_schedule: read | ADMIN |
| staff_schedule.write | staff_schedule: write | ADMIN |
| staff_shift_request.read | staff_shift_request: read | ADMIN |
| staff_shift_request.write | staff_shift_request: write | ADMIN |
| staff.read | staff: read | ADMIN |
| staff.write | staff: write | ADMIN |
| stock_reservation.read | stock_reservation: read | ADMIN |
| stock_reservation.write | stock_reservation: write | ADMIN |
| supplier.read | supplier: read | ADMIN |
| supplier.write | supplier: write | ADMIN |
| support_ticket_message_attachment.read | support_ticket_message_attachment: read | ADMIN |
| support_ticket_message_attachment.write | support_ticket_message_attachment: write | ADMIN |
| support_ticket_message.read | support_ticket_message: read | ADMIN |
| support_ticket_message.write | support_ticket_message: write | ADMIN |
| support_ticket.read | support_ticket: read | ADMIN |
| support_ticket.write | support_ticket: write | ADMIN |
| taxi_price_rule.read | taxi_price_rule: read | ADMIN |
| taxi_price_rule.write | taxi_price_rule: write | ADMIN |
| taxi_trip.read | taxi_trip: read | ADMIN |
| taxi_trip.write | taxi_trip: write | ADMIN |
| variant_color.read | variant_color: read | ADMIN |
| variant_color.write | variant_color: write | ADMIN |
| variant_flavor.read | variant_flavor: read | ADMIN |
| variant_flavor.write | variant_flavor: write | ADMIN |
| variant_size.read | variant_size: read | ADMIN |
| variant_size.write | variant_size: write | ADMIN |
| voucher_redemption.read | voucher_redemption: read | ADMIN |
| voucher_redemption.write | voucher_redemption: write | ADMIN |
| voucher.read | voucher: read | ADMIN |
| voucher.write | voucher: write | ADMIN |
| wishlist_product.read | wishlist_product: read | ADMIN |
| wishlist_product.write | wishlist_product: write | ADMIN |
| wishlist_service.read | wishlist_service: read | ADMIN |
| wishlist_service.write | wishlist_service: write | ADMIN |
| wishlist.read | wishlist: read | ADMIN |
| wishlist.write | wishlist: write | ADMIN |

## Hàm nghiệp vụ và kiểm tra quyền

Danh sách mã quyền bên dưới là trích xuất tĩnh từ lời gọi has_permission trong định nghĩa thực tế. Không có mã trực tiếp không đồng nghĩa hàm không bảo vệ: cần đọc cả hàm được gọi bên trong.

| Hàm | SECURITY DEFINER | anon EXECUTE | authenticated EXECUTE | Quyền trực tiếp | Thiết lập |
|---|---|---|---|---|---|
| pawpal_private.admin_search_text(value text) | false | true | true |  | search_path=pg_catalog |
| pawpal_private.guard_service_staff_availability() | true | false | false |  | search_path=pg_catalog, public |
| pawpal_private.guard_staff_assignment_eligibility() | true | false | false |  | search_path=pg_catalog, public |
| pawpal_private.guard_staff_audit() | false | false | false |  | search_path=pg_catalog |
| pawpal_private.guard_staff_direct_update() | false | false | false |  | search_path=pg_catalog |
| pawpal_private.guard_staff_phone_duplicate() | true | false | false |  | search_path=pg_catalog, public |
| pawpal_private.has_permission(required_code text) | true | false | true |  | search_path=pg_catalog, public |
| pawpal_private.other_available_admin(excluded uuid) | true | false | false |  | search_path=pg_catalog, public |
| pawpal_private.require_staff_phone() | false | false | false |  | search_path=pg_catalog, public |
| pawpal_private.staff_skill_allows_assignment(p_staff uuid) | true | false | false |  | search_path=pg_catalog, public |
| pawpal_private.validate_staff_contact() | false | false | false |  | search_path=pg_catalog, public |
| pawpal_private.validate_staff_name() | false | false | false |  | search_path=pg_catalog, public |
| public.acquire_admin_chat_read(p_request uuid) | true | false | true | admin_copilot_history.read, admin_copilot_history.write | search_path=pg_catalog, public; statement_timeout=1s |
| public.act_admin_chat(p_request_id uuid, p_conversation_id uuid, p_expected_updated_at timestamp with time zone, p_action text, p_content text) | true | false | true | chat_conversation.read, chat_conversation.write, chat_message.write, audit_log.write | search_path=pg_catalog, public |
| public.act_admin_complaint(p_request_id uuid, p_ticket_id uuid, p_expected_updated_at timestamp with time zone, p_action text, p_details jsonb) | true | false | true | support_ticket.read, support_ticket.write, support_ticket_message.write, audit_log.write, sales_order.read, appointment.read, refund_transaction.read, payment.read, return_request.read | search_path=pg_catalog, public |
| public.adjust_admin_chat_points(p_request uuid, p_conversation uuid, p_expected_updated_at timestamp with time zone, p_policy uuid, p_points integer) | true | false | true | chat_conversation.read, chat_conversation.write, chatbot_compensation_policy.read, paw_point_transaction.write, audit_log.write | search_path=pg_catalog, public |
| public.adjust_admin_sales_stock(p_request_id uuid, p_variant_id uuid, p_details jsonb) | true | false | true | inventory_transaction.write, product_variant.write, product.write, audit_log.write | search_path=pg_catalog, public |
| public.admin_booking_search_text(p_value text) | false | false | true |  | search_path=pg_catalog, public |
| public.admin_chat_canned_page(p_query text, p_category text, p_page integer) | false | false | true |  | search_path=pg_catalog, public; statement_timeout=5s; lock_timeout=1s |
| public.admin_chat_rule_counts(p_tables text[]) | false | false | true |  | search_path=pg_catalog, public; statement_timeout=5s; lock_timeout=1s |
| public.admin_chat_rule_page(p_table text, p_filters jsonb, p_page integer) | false | false | true |  | search_path=pg_catalog, public |
| public.admin_chat_rule_page_bounded(p_table text, p_filters jsonb, p_page integer) | false | false | true |  | search_path=pg_catalog, public; statement_timeout=5s; lock_timeout=1s |
| public.admin_complaint_page(p_kind text, p_filters jsonb, p_page integer, p_size integer, p_context text, p_ids uuid[]) | false | false | true | support_ticket.read | search_path=pg_catalog, public |
| public.admin_complaint_search_text(p_value text) | false | false | true |  | search_path=pg_catalog, public |
| public.admin_copilot_chat_context(p_conversation uuid) | false | false | true |  | search_path=pg_catalog, public |
| public.admin_copilot_extended_facts(p_intent text, p_filters jsonb) | false | false | true | admin_copilot_history.read, payment.read, refund_transaction.read, chatbot_knowledge_faq.read, service_price_matrix.read, taxi_price_rule.read, hotel_room_type.read | search_path=pg_catalog, public |
| public.admin_copilot_facts(p_intent text, p_filters jsonb) | false | false | true | admin_copilot_history.read, support_ticket.read, sales_order.read, service.read, product.read, product_variant.read | search_path=pg_catalog, public |
| public.admin_copilot_history_page(p_session uuid, p_offset integer, p_with_title boolean) | false | false | true | admin_copilot_history.read | search_path=pg_catalog, public; statement_timeout=5s; lock_timeout=1s |
| public.admin_copilot_recent_context(p_session uuid) | false | false | true | admin_copilot_history.read | search_path=pg_catalog, public |
| public.admin_copilot_session_page(p_query text, p_page integer) | false | false | true | admin_copilot_history.read | search_path=pg_catalog, public |
| public.admin_copilot_sessions_bounded(p_query text, p_page integer) | false | false | true |  | search_path=pg_catalog, public; statement_timeout=5s; lock_timeout=1s |
| public.admin_customer_page(p_query text, p_tier text, p_status text, p_category text, p_page integer, p_size integer, p_lookup text) | true | false | true |  | search_path=pg_catalog, public; statement_timeout=5s |
| public.admin_pawpoint_page(p_query text, p_kind text, p_page integer, p_size integer) | true | false | true | paw_point_transaction.read, customer.read, customer_profile.read, customer_phone.read | search_path=pg_catalog, public; statement_timeout=5s |
| public.admin_pet_page(p_query text, p_species text, p_breed text, p_weight text, p_hotel boolean, p_alert boolean, p_page integer, p_size integer, p_lookup text, p_ids text[], p_catalog boolean, p_owner_query text) | false | false | true |  | search_path=pg_catalog, public; statement_timeout=5s |
| public.admin_sales_search_text(p_value text) | false | false | true |  | search_path=pg_catalog |
| public.admin_service_staff_candidates() | true | false | true | staff.read | search_path=pg_catalog, public |
| public.admin_staff_assessment_page(p_query text, p_type text, p_result text, p_page integer, p_staff_id uuid) | false | false | true | staff.read | search_path=pg_catalog, public |
| public.admin_staff_assessment_summary() | false | false | true | staff.read | search_path=pg_catalog, public |
| public.admin_staff_directory_page(p_ids uuid[]) | false | false | true | staff.read | search_path=pg_catalog, public |
| public.admin_staff_directory_summary() | false | false | true | staff.read | search_path=pg_catalog, public |
| public.admin_staff_list_page(p_filters jsonb, p_page integer) | false | false | true | staff.read | search_path=pg_catalog, public |
| public.admin_staff_schedule_summary() | false | false | true | staff.read | search_path=pg_catalog, public |
| public.assign_admin_complaint(p_request_id uuid, p_ticket_id uuid, p_expected_updated_at timestamp with time zone, p_staff_id uuid, p_note text) | true | false | true | support_ticket.read, support_ticket.write, support_ticket_message.write, staff.read, audit_log.write | search_path=pg_catalog, public |
| public.begin_admin_staff_auth_action(p_actor_auth_id uuid, p_request_id uuid, p_staff_id uuid, p_expected_updated_at timestamp with time zone, p_action text, p_fingerprint text) | true | false | false |  | search_path=pg_catalog, public |
| public.change_admin_service_charge(p_id uuid, p_appointment_id uuid, p_expected_updated_at timestamp with time zone, p_action text, p_details jsonb) | false | false | true | appointment.write, appointment_adjustment.write, appointment_item.write, payment.read, audit_log.write | search_path=pg_catalog, public |
| public.close_admin_hotel_stay(p_appointment_id uuid, p_expected_updated_at timestamp with time zone) | false | false | true | appointment.write, hotel_booking.write, audit_log.write | search_path=pg_catalog, public |
| public.create_admin_complaint(p_id uuid, p_customer_id uuid, p_order_id uuid, p_appointment_id uuid, p_category text, p_subject text, p_content text, p_priority text) | true | false | true | support_ticket.write, support_ticket.read, support_ticket_message.write, support_ticket_message.read, customer.read, audit_log.write, sales_order.read, appointment.read | search_path=pg_catalog, public |
| public.create_admin_logistics_booking(p_id uuid, p_details jsonb) | false | false | true | appointment.write, appointment_item.write, audit_log.write, hotel_booking.write, taxi_trip.write | search_path=pg_catalog, public |
| public.create_admin_sales_order(p_order_id uuid, p_customer_id uuid, p_expected_quote text, p_details jsonb, p_lines jsonb) | true | false | true | sales_order.write, sales_order_detail.write, stock_reservation.write, voucher_redemption.write, paw_point_transaction.write, audit_log.write | search_path=pg_catalog, public |
| public.create_admin_sales_replacement(p_request_id uuid, p_return_id uuid, p_expected_updated_at timestamp with time zone, p_details jsonb) | true | false | true | return_request.write, return_request_detail.read, sales_order.write, sales_order_detail.write, inventory_transaction.write, stock_reservation.write, audit_log.write | search_path=pg_catalog, public |
| public.create_admin_service_booking(p_id uuid, p_details jsonb) | false | false | true | appointment.write, appointment_item.write, audit_log.write, taxi_trip.write | search_path=pg_catalog, public |
| public.create_admin_service_ticket(p_id uuid, p_appointment_id uuid, p_review_id uuid, p_description text) | true | false | true | appointment.read, review.read, appointment_item.read, support_ticket.read, support_ticket.write, audit_log.read, audit_log.write | search_path=pg_catalog, public |
| public.create_admin_staff_profile(p_request_id uuid, p_staff_id uuid, p_auth_user_id uuid, p_details jsonb, p_roles text[], p_permissions text[]) | true | false | true | staff.write, staff_role.write | search_path=pg_catalog, public |
| public.delete_admin_copilot_session(p_session uuid) | true | false | true | admin_copilot_history.write, audit_log.write | search_path=pg_catalog, public |
| public.dispatch_admin_sales_batch(p_request_id uuid, p_provider_id uuid, p_orders jsonb, p_note text) | true | false | true | sales_order.write, audit_log.write | search_path=pg_catalog, public |
| public.finish_admin_staff_auth_action(p_actor_auth_id uuid, p_request_id uuid, p_success boolean) | true | false | false |  | search_path=pg_catalog, public |
| public.finish_admin_staff_provision(p_actor_auth_id uuid, p_request_id uuid, p_staff_id uuid, p_fingerprint text, p_enable_login boolean) | true | false | false |  | search_path=pg_catalog, public |
| public.get_admin_chat_customer_panel(p_customer uuid) | false | false | true |  | search_path=pg_catalog, public; statement_timeout=5s; lock_timeout=1s |
| public.get_admin_chat_handlers() | true | false | true | chat_conversation.write, staff.read | search_path=pg_catalog, public |
| public.get_admin_chat_handlers_bounded() | false | false | true |  | search_path=pg_catalog, public; statement_timeout=5s; lock_timeout=1s |
| public.get_admin_chat_inbox(p_limit integer, p_offset integer) | false | false | true | chat_conversation.read, chat_message.read | search_path=pg_catalog, public |
| public.get_admin_chat_inbox_page(p_query text, p_filter text, p_page integer) | false | false | true | chat_conversation.read, chat_message.read, customer_profile.read, customer_phone.read | search_path=pg_catalog, public |
| public.get_admin_chat_inbox_view(p_query text, p_filter text, p_page integer) | false | false | true | customer.read | search_path=pg_catalog, public; statement_timeout=5s; lock_timeout=1s |
| public.get_admin_chat_messages(p_conversation uuid, p_before_at timestamp with time zone, p_before_id uuid) | true | false | true | chat_message.read, chat_conversation.read | search_path=pg_catalog, public |
| public.get_admin_chat_messages_bounded(p_conversation uuid, p_before_at timestamp with time zone, p_before_id uuid) | false | false | true |  | search_path=pg_catalog, public; statement_timeout=5s; lock_timeout=1s |
| public.get_admin_chat_point_policies() | false | false | true |  | search_path=pg_catalog, public; statement_timeout=5s; lock_timeout=1s |
| public.get_admin_complaint_handlers() | true | false | true | support_ticket.write, staff.read | search_path=pg_catalog, public |
| public.get_admin_dashboard_cashflow(p_from date, p_to date) | true | false | true | payment.read, refund_transaction.read | search_path=pg_catalog, public |
| public.get_admin_dashboard_low_stock() | false | false | true | inventory.read, product.read, product_variant.read | search_path=pg_catalog, public |
| public.get_admin_pet_reminder_sources() | false | false | true | appointment.read, appointment_item.read, pet_profile.read, audit_log.read | search_path=pg_catalog, public |
| public.get_admin_sales_cashier(p_order_id uuid) | true | false | true | sales_order.read, sales_order_detail.read, voucher_redemption.read, payment.read, refund_transaction.read, payment_method_config.read | search_path=pg_catalog, public |
| public.get_admin_sales_inventory_choices() | false | false | true | product.read, product_variant.read, inventory.read | search_path=pg_catalog, public |
| public.get_admin_sales_order_history(p_order_id uuid) | true | false | true | sales_order.read, payment.read, refund_transaction.read | search_path=pg_catalog, public |
| public.get_admin_sales_order_page(p_filters jsonb, p_page integer) | false | false | true | customer.read, sales_order.read, sales_order_detail.read, payment.read, refund_transaction.read, customer_profile.read, customer_phone.read, return_request.read, voucher_redemption.read, payment_method_config.read | search_path=pg_catalog, public |
| public.get_admin_sales_product_page(p_query text, p_category text, p_stock text, p_page integer) | false | false | true | product.read, product_variant.read, inventory.read, product_category.read, review.read, sales_order_detail.read | search_path=pg_catalog, public |
| public.get_admin_sales_review_page(p_product_id uuid, p_filter text, p_page integer) | false | false | true | review.read, review_media.read, sales_order_detail.read, product_variant.read | search_path=pg_catalog, public |
| public.get_admin_sales_stock_history_page(p_product_id uuid, p_page integer) | false | false | true | product.read, product_variant.read, inventory_transaction.read, staff.read | search_path=pg_catalog, public |
| public.get_admin_service_booking_page(p_filters jsonb, p_page integer, p_export boolean) | false | false | true | appointment.read, appointment_item.read, customer_profile.read, customer_phone.read, pet_profile.read, pet_breed.read, staff.read, service.read, service_category.read, payment.read, refund_transaction.read, appointment_adjustment.read | search_path=pg_catalog, public |
| public.get_admin_service_cashier(p_appointment_id uuid) | true | false | true | appointment.read, appointment_item.read, appointment_adjustment.read, voucher_redemption.read, payment.read, refund_transaction.read, payment_method_config.read | search_path=pg_catalog, public |
| public.get_admin_staff_directory() | true | false | true | staff.read, staff_role.read, staff_permission.read | search_path=pg_catalog, public |
| public.get_staff_login_context() | true | false | true |  | search_path=pg_catalog, public |
| public.handover_admin_staff_work(p_request_id uuid, p_staff_id uuid, p_expected_updated_at timestamp with time zone, p_reason text, p_handover jsonb) | true | false | true | staff.write, appointment.write, appointment_item.write, taxi_trip.write, audit_log.write | search_path=pg_catalog, public |
| public.moderate_admin_service_review(p_request uuid, p_review uuid, p_expected timestamp with time zone, p_status text, p_reason text) | true | false | true | review.write, audit_log.write | search_path=pg_catalog, public |
| public.post_admin_sales_inventory_batch(p_request_id uuid, p_mode text, p_details jsonb, p_lines jsonb) | true | false | true | inventory_transaction.write, audit_log.write, purchase_order.write, purchase_order_detail.write | search_path=pg_catalog, public |
| public.post_admin_sales_money(p_request_id uuid, p_order_id uuid, p_expected_state text, p_action text, p_details jsonb) | true | false | true | payment.write, audit_log.write, refund_transaction.write | search_path=pg_catalog, public |
| public.post_admin_service_money(p_request_id uuid, p_appointment_id uuid, p_expected_state text, p_action text, p_details jsonb) | true | false | true | payment.write, audit_log.write, refund_transaction.write | search_path=pg_catalog, public |
| public.quote_admin_sales_order(p_customer_id uuid, p_details jsonb, p_lines jsonb) | false | false | true | sales_order.write, product_variant.read, inventory_transaction.read, stock_reservation.read, customer.read, voucher.read, paw_point_transaction.read, pawpal_setting.read, membership_tier.read, customer_membership.read, delivery_option_config.read, voucher_redemption.read, customer_voucher.read | search_path=pg_catalog, public |
| public.read_admin_chat_benchmark_snapshot() | false | false | true |  | search_path=pg_catalog, public; statement_timeout=5s; lock_timeout=1s |
| public.read_admin_chat_message_part(p_kind text, p_id uuid, p_offset integer, p_revision text) | false | false | true | admin_copilot_history.read, chat_message.read, chat_conversation.read | search_path=pg_catalog, public; statement_timeout=5s; lock_timeout=1s |
| public.read_admin_chat_raw(p_message_id uuid) | true | false | true | chat_message.read, audit_log.write | search_path=pg_catalog, public |
| public.read_admin_chat_raw_bounded(p_message_id uuid) | false | false | true |  | search_path=pg_catalog, public; statement_timeout=5s; lock_timeout=1s |
| public.record_admin_pet_weight(p_pet_id uuid, p_expected_updated_at timestamp with time zone, p_measurement_id uuid, p_weight numeric, p_note text) | false | false | true | pet_profile.write, pet_weight_history.write, audit_log.write | search_path=pg_catalog, public |
| public.record_admin_staff_incident(p_request_id uuid, p_appointment_id uuid, p_expected_updated_at timestamp with time zone, p_staff_id uuid, p_details jsonb) | true | false | true | appointment.read, audit_log.write | search_path=pg_catalog, public |
| public.release_admin_chat_read(p_lease uuid) | true | false | true |  | search_path=pg_catalog, public; statement_timeout=1s |
| public.reply_admin_sales_review(p_review_id uuid, p_response_id uuid, p_expected_updated_at timestamp with time zone, p_text text) | false | false | true | review_response.write, audit_log.write | search_path=pg_catalog, public |
| public.reply_admin_service_review(p_review_id uuid, p_response_id uuid, p_expected_updated_at timestamp with time zone, p_text text) | false | false | true | review_response.write, audit_log.write | search_path=pg_catalog, public |
| public.resolve_admin_chat(p_request_id uuid, p_conversation_id uuid, p_expected_updated_at timestamp with time zone, p_reason text, p_notes text, p_send_survey boolean) | true | false | true | chat_conversation.write, chat_conversation.read, chat_message.write, audit_log.write | search_path=pg_catalog, public |
| public.review_admin_staff_shift_request(p_request_id uuid, p_approve boolean) | true | false | true | staff_shift_request.write, staff_schedule.write, audit_log.write | search_path=pg_catalog, public |
| public.run_admin_chat_customer_case(p_lease uuid, p_tool text, p_filters jsonb, p_max_bytes integer) | false | false | true |  | search_path=pg_catalog, public; statement_timeout=5s; lock_timeout=1s |
| public.run_admin_chat_detail(p_lease uuid, p_tool text, p_filters jsonb, p_max_bytes integer) | false | false | true |  | search_path=pg_catalog, public; statement_timeout=5s; lock_timeout=1s |
| public.run_admin_chat_logistics(p_lease uuid, p_tool text, p_filters jsonb, p_max_bytes integer) | false | false | true |  | search_path=pg_catalog, public; statement_timeout=5s; lock_timeout=1s |
| public.run_admin_chat_page(p_lease uuid, p_tool text, p_filters jsonb, p_max_bytes integer) | false | false | true | admin_copilot_history.read, support_ticket.read, sales_order.read, service.read, product.read, product_variant.read, service_price_matrix.read, taxi_price_rule.read, hotel_room_type.read, chatbot_knowledge_faq.read | search_path=pg_catalog, public; statement_timeout=5s; lock_timeout=1s |
| public.run_admin_chat_read(p_lease uuid, p_tool text, p_filters jsonb, p_max_bytes integer) | false | false | true |  | search_path=pg_catalog, public; statement_timeout=5s; lock_timeout=1s |
| public.run_admin_stage3_read(p_lease uuid, p_tool text, p_filters jsonb, p_max_bytes integer) | false | false | true |  | search_path=pg_catalog, public; statement_timeout=5s; lock_timeout=1s |
| public.save_admin_chat_benchmark(p_results jsonb) | true | false | true | chatbot_scenario_matrix.write, audit_log.write | search_path=pg_catalog, public |
| public.save_admin_chat_rule(p_table text, p_id uuid, p_expected jsonb, p_values jsonb, p_delete boolean) | true | false | true | audit_log.write | search_path=pg_catalog, public |
| public.save_admin_copilot_detail(p_actor uuid, p_request uuid, p_session uuid, p_question text, p_answer text, p_title text, p_next text) | true | false | false |  | search_path=pg_catalog, public; statement_timeout=5s; lock_timeout=1s |
| public.save_admin_copilot_exchange(p_actor uuid, p_request uuid, p_session uuid, p_question text, p_answer text, p_title text) | true | false | false |  | search_path=pg_catalog, public |
| public.save_admin_pet(p_pet_id uuid, p_expected_updated_at timestamp with time zone, p_details jsonb, p_weight numeric) | false | false | true | pet_profile.write, audit_log.write, pet_weight_history.write | search_path=pg_catalog, public |
| public.save_admin_pickup_notification(p_id uuid, p_appointment_id uuid, p_expected_updated_at timestamp with time zone, p_content text, p_ready boolean) | false | false | true | appointment.read, appointment_record.read, appointment_adjustment.read, pet_profile.read, notification.read, audit_log.read, notification.write, audit_log.write | search_path=pg_catalog, public |
| public.save_admin_sales_product(p_request_id uuid, p_product_id uuid, p_expected_updated_at timestamp with time zone, p_details jsonb, p_variants jsonb) | true | false | true | product.write, product_variant.write, product_media.write, product_variant_media.write, inventory_transaction.write, audit_log.write, variant_ | search_path=pg_catalog, public |
| public.save_admin_sales_return(p_request_id uuid, p_return_id uuid, p_order_id uuid, p_expected_updated_at timestamp with time zone, p_action text, p_details jsonb) | true | false | true | return_request.write, return_request_detail.write, inventory_transaction.write, audit_log.write | search_path=pg_catalog, public |
| public.save_admin_sales_voucher(p_request_id uuid, p_voucher_id uuid, p_expected_updated_at timestamp with time zone, p_details jsonb) | true | false | true | voucher.write, audit_log.write | search_path=pg_catalog, public |
| public.save_admin_service_care_log(p_id uuid, p_appointment_id uuid, p_expected_updated_at timestamp with time zone, p_expected_log_updated_at timestamp with time zone, p_action text, p_details jsonb) | false | false | true | appointment.write, care_log.write, audit_log.write | search_path=pg_catalog, public |
| public.save_admin_service_catalog(p_id uuid, p_expected_updated_at timestamp with time zone, p_details jsonb, p_prices jsonb) | false | false | true | service.write, service_supported_species.write, service_care_action.write, care_action.write, audit_log.write, service_price_matrix.write | search_path=pg_catalog, public |
| public.save_admin_service_record(p_id uuid, p_appointment_id uuid, p_expected_updated_at timestamp with time zone, p_type text, p_details jsonb) | false | false | true | appointment.write, appointment_item.write, appointment_record.write, audit_log.write, pet_weight_history.write | search_path=pg_catalog, public |
| public.save_admin_setting_record(p_request uuid, p_table text, p_id uuid, p_expected jsonb, p_values jsonb, p_delete boolean) | true | false | true | audit_log.write, payment_method_config.write | search_path=pg_catalog, public |
| public.save_admin_shipping_settings(p_request uuid, p_options jsonb, p_config_id uuid, p_expected_config jsonb, p_config jsonb) | true | false | true |  | search_path=pg_catalog, public |
| public.save_admin_staff_assessment(p_request_id uuid, p_staff_id uuid, p_details jsonb) | true | false | true | staff_assessment.write, audit_log.write | search_path=pg_catalog, public |
| public.save_admin_staff_profile(p_request_id uuid, p_staff_id uuid, p_expected_updated_at timestamp with time zone, p_details jsonb) | true | false | true | staff.write, audit_log.write | search_path=pg_catalog, public |
| public.save_admin_staff_schedule(p_request_id uuid, p_schedule_id uuid, p_expected_updated_at timestamp with time zone, p_details jsonb) | true | false | true | staff_schedule.write, audit_log.write | search_path=pg_catalog, public |
| public.save_admin_staff_shift_request(p_request_id uuid, p_details jsonb, p_approve boolean) | true | false | true | staff_shift_request.write, audit_log.write | search_path=pg_catalog, public |
| public.search_admin_sales_customers(p_query text) | false | false | true | customer.read, customer_profile.read, customer_phone.read, customer_membership.read, membership_tier.read | search_path=pg_catalog, public |
| public.search_admin_sales_variants(p_query text) | false | false | true | product.read, product_variant.read | search_path=pg_catalog, public |
| public.set_admin_staff_access(p_request_id uuid, p_staff_id uuid, p_expected_updated_at timestamp with time zone, p_roles text[], p_permissions text[], p_reason text) | true | false | true | staff_role.write, staff_permission.write, audit_log.write | search_path=pg_catalog, public |
| public.sync_admin_article_knowledge(p_request uuid, p_article uuid, p_expected jsonb) | true | false | true | blog_post.read, blog_post.write, chatbot_knowledge_faq.write, audit_log.write | search_path=pg_catalog, public |
| public.transfer_admin_chat(p_request_id uuid, p_conversation_id uuid, p_expected_updated_at timestamp with time zone, p_staff_id uuid, p_note text) | true | false | true | chat_conversation.write, chat_message.write, audit_log.write | search_path=pg_catalog, public |
| public.update_admin_sales_order(p_request_id uuid, p_order_id uuid, p_expected_updated_at timestamp with time zone, p_action text, p_details jsonb) | true | false | true | sales_order.write, inventory_transaction.write, stock_reservation.write, audit_log.write | search_path=pg_catalog, public |
| public.update_admin_service_booking(p_id uuid, p_expected_updated_at timestamp with time zone, p_action text, p_value text, p_reason text) | false | false | true | appointment.write, audit_log.write, payment.read, refund_transaction.read | search_path=pg_catalog, public |

## Định nghĩa các hàm phân quyền trọng tâm

### pawpal_private.has_permission

```sql
CREATE OR REPLACE FUNCTION pawpal_private.has_permission(required_code text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
 SELECT EXISTS(
  SELECT 1 FROM public.staff s JOIN auth.users u ON u.id=s.auth_user_id
  WHERE s.auth_user_id=auth.uid() AND s.employment_status='active'
    AND NOT s.must_change_password AND (u.banned_until IS NULL OR u.banned_until<=now())
    AND (EXISTS(SELECT 1 FROM public.staff_role sr JOIN public.role_permission rp ON rp.role_code=sr.role_code
                WHERE sr.staff_id=s.id AND rp.permission_code=required_code)
      OR EXISTS(SELECT 1 FROM public.staff_permission sp WHERE sp.staff_id=s.id AND sp.permission_code=required_code))
 );
$function$

```

### pawpal_private.other_available_admin

```sql
CREATE OR REPLACE FUNCTION pawpal_private.other_available_admin(excluded uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
 SELECT EXISTS(SELECT 1 FROM public.staff s JOIN public.staff_role sr ON sr.staff_id=s.id JOIN auth.users u ON u.id=s.auth_user_id
 WHERE s.id<>excluded AND sr.role_code='ADMIN' AND s.employment_status='active' AND NOT s.must_change_password AND coalesce(u.banned_until<=now(),true)
 AND NOT EXISTS(SELECT 1 FROM public.audit_log pending WHERE pending.action='STAFF_AUTH_PENDING' AND pending.description::jsonb->>'staff_id'=s.id::text
  AND pending.description::jsonb->>'action' IN ('lock','reset') AND NOT EXISTS(SELECT 1 FROM public.audit_log finished WHERE finished.entity_id=pending.entity_id AND finished.action IN ('STAFF_AUTH_DONE','STAFF_AUTH_FAILED'))));
$function$

```

### public.get_staff_login_context

```sql
CREATE OR REPLACE FUNCTION public.get_staff_login_context()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE person public.staff; active_account boolean; role_codes text[]; effective_codes text[];
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
 SELECT * INTO person FROM public.staff WHERE auth_user_id=auth.uid();
 IF NOT FOUND THEN RETURN jsonb_build_object('is_staff',false,'is_active',false,'staff',NULL); END IF;
 SELECT person.employment_status='active' AND (u.banned_until IS NULL OR u.banned_until<=now()) INTO active_account FROM auth.users u WHERE u.id=auth.uid();
 SELECT coalesce(array_agg(role_code ORDER BY role_code),'{}'::text[]) INTO role_codes FROM public.staff_role WHERE staff_id=person.id;
 SELECT coalesce(array_agg(code ORDER BY code),'{}'::text[]) INTO effective_codes FROM (
  SELECT rp.permission_code AS code FROM public.role_permission rp JOIN public.staff_role sr ON sr.role_code=rp.role_code WHERE sr.staff_id=person.id
  UNION SELECT permission_code FROM public.staff_permission WHERE staff_id=person.id
 ) p;
 IF NOT coalesce(active_account,false) OR person.must_change_password THEN effective_codes:='{}'::text[]; END IF;
 RETURN jsonb_build_object('is_staff',true,'is_active',coalesce(active_account,false),
 'staff',jsonb_build_object('id',person.id,'auth_user_id',person.auth_user_id,'full_name',person.full_name,
 'email',person.email,'phone_number',person.phone_number,'job_title',person.job_title,'specialization',person.specialization,
 'employment_status',person.employment_status,'must_change_password',person.must_change_password,
 'access_roles',role_codes,'permission_codes',effective_codes));
END $function$

```

### public.set_admin_staff_access

```sql
CREATE OR REPLACE FUNCTION public.set_admin_staff_access(p_request_id uuid, p_staff_id uuid, p_expected_updated_at timestamp with time zone, p_roles text[], p_permissions text[], p_reason text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE actor uuid; old public.staff; prior public.audit_log; payload text;
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('staff_role.write') OR NOT pawpal_private.has_permission('staff_permission.write')
 OR NOT pawpal_private.has_permission('audit_log.write') OR NOT EXISTS(SELECT 1 FROM public.staff s JOIN public.staff_role r ON r.staff_id=s.id WHERE s.auth_user_id=auth.uid() AND r.role_code='ADMIN') THEN RAISE EXCEPTION 'staff_access_forbidden' USING ERRCODE='42501'; END IF;
 IF p_request_id IS NULL OR p_staff_id IS NULL OR p_roles IS NULL OR p_permissions IS NULL OR cardinality(p_roles)>30 OR cardinality(p_permissions)>250
 OR coalesce(length(btrim(p_reason)),0) NOT BETWEEN 2 AND 2000
 OR EXISTS(SELECT 1 FROM unnest(p_roles) x WHERE x IS NULL OR NOT EXISTS(SELECT 1 FROM public.access_role WHERE code=x))
 OR EXISTS(SELECT 1 FROM unnest(p_permissions) x WHERE x IS NULL OR NOT EXISTS(SELECT 1 FROM public.permission WHERE code=x)) THEN RAISE EXCEPTION 'invalid_staff_access' USING ERRCODE='22023'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 payload:=jsonb_build_object('staff_id',p_staff_id,'roles',p_roles,'permissions',p_permissions,'reason',p_reason)::text;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text,33));
 SELECT * INTO prior FROM public.audit_log WHERE action='STAFF_ACCESS_SAVE' AND entity_id=p_request_id;
 IF FOUND THEN
  IF prior.staff_id IS DISTINCT FROM actor OR prior.description<>payload THEN RAISE EXCEPTION 'staff_request_conflict' USING ERRCODE='PT409'; END IF;
  RETURN p_staff_id;
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('staff-access-admin-guard',31));
 SELECT * INTO old FROM public.staff WHERE id=p_staff_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'staff_not_found' USING ERRCODE='P0002'; END IF;
 IF p_expected_updated_at IS NULL OR old.updated_at<>p_expected_updated_at THEN RAISE EXCEPTION 'staff_profile_changed' USING ERRCODE='PT409'; END IF;
 IF NOT ('ADMIN'=ANY(p_roles)) AND EXISTS(SELECT 1 FROM public.staff_role WHERE staff_id=old.id AND role_code='ADMIN') AND NOT pawpal_private.other_available_admin(old.id) THEN RAISE EXCEPTION 'staff_last_admin_required' USING ERRCODE='22023'; END IF;
 DELETE FROM public.staff_role WHERE staff_id=old.id;
 INSERT INTO public.staff_role(staff_id,role_code) SELECT old.id,x FROM (SELECT DISTINCT unnest(p_roles) x) roles;
 DELETE FROM public.staff_permission WHERE staff_id=old.id;
 INSERT INTO public.staff_permission(staff_id,permission_code) SELECT old.id,x FROM (SELECT DISTINCT unnest(p_permissions) x) permissions;
 UPDATE public.staff SET updated_at=clock_timestamp() WHERE id=old.id;
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES(actor,'STAFF_ACCESS_SAVE','staff',p_request_id,payload);
 RETURN old.id;
END $function$

```

## Trích đoạn kiểm soát chatbot từ định nghĩa Cloud

Chỉ trích các dòng kiểm tra quyền và phạm vi; đây không phải toàn bộ thân hàm.
### public.act_admin_chat

```sql
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('chat_conversation.read') OR NOT pawpal_private.has_permission('chat_conversation.write')
 OR NOT pawpal_private.has_permission('chat_message.write') OR NOT pawpal_private.has_permission('audit_log.write') THEN RAISE EXCEPTION 'chat_forbidden' USING ERRCODE='42501'; END IF;
 IF p_request_id IS NULL OR p_conversation_id IS NULL OR p_action IS NULL OR p_action NOT IN ('take','release','send','note')
 OR p_content IS NULL OR length(p_content)>8000 OR (p_action='send' AND length(btrim(p_content))<1) THEN RAISE EXCEPTION 'invalid_chat_operation' USING ERRCODE='22023'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 payload:=jsonb_build_object('conversation_id',p_conversation_id,'action',p_action,'content',p_content)::text;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text,46));
 IF conversation.status IN ('closed','resolved','completed','blocked') THEN RAISE EXCEPTION 'chat_not_open' USING ERRCODE='PT409'; END IF;
 IF conversation.assigned_staff_id IS NOT NULL AND conversation.assigned_staff_id<>actor THEN RAISE EXCEPTION 'chat_assigned_to_other' USING ERRCODE='42501'; END IF;
 IF p_action IN ('release','send') AND (conversation.assigned_staff_id IS DISTINCT FROM actor OR conversation.status<>'agent_handling') THEN RAISE EXCEPTION 'chat_take_required' USING ERRCODE='22023'; END IF;
 IF p_action='take' THEN
  UPDATE public.chat_conversation SET assigned_staff_id=actor,status='agent_handling',updated_at=clock_timestamp() WHERE id=conversation.id;
  note:='Nhân viên đã tiếp nhận hội thoại.';
 ELSIF p_action='release' THEN
  UPDATE public.chat_conversation SET assigned_staff_id=NULL,status='bot_handling',updated_at=clock_timestamp() WHERE id=conversation.id;
  note:='Nhân viên đã trả lại quyền hỗ trợ tự động.';
 ELSIF p_action='note' THEN
  INSERT INTO public.chat_message(id,conversation_id,sender_type,sender_account_id,content,is_toxic,sentiment_score)
  VALUES(p_request_id,conversation.id,'staff',auth.uid(),btrim(p_content),false,0);
 END IF;
 IF note IS NOT NULL THEN
```

### public.admin_copilot_extended_facts

```sql
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('admin_copilot_history.read') THEN RAISE EXCEPTION 'copilot_forbidden' USING ERRCODE='42501'; END IF;
 IF p_filters IS NULL OR jsonb_typeof(p_filters)<>'object' OR length(p_filters::text)>4000 OR length(query_text)>120 THEN RAISE EXCEPTION 'invalid_copilot_filter' USING ERRCODE='22023'; END IF;
 IF p_intent='revenue.summary' THEN
  IF NOT pawpal_private.has_permission('payment.read') OR NOT pawpal_private.has_permission('refund_transaction.read') THEN RAISE EXCEPTION 'copilot_forbidden' USING ERRCODE='42501'; END IF;
  start_at:=nullif(p_filters->>'start_at','')::timestamptz;end_at:=nullif(p_filters->>'end_at','')::timestamptz;
  IF start_at IS NULL OR end_at IS NULL OR NOT isfinite(start_at) OR NOT isfinite(end_at) OR end_at<=start_at OR end_at>start_at+interval '32 days' THEN RAISE EXCEPTION 'invalid_copilot_date_range' USING ERRCODE='22023'; END IF;
 ELSIF p_intent='knowledge.search' THEN
  IF NOT pawpal_private.has_permission('chatbot_knowledge_faq.read') THEN RAISE EXCEPTION 'copilot_forbidden' USING ERRCODE='42501'; END IF;
  IF length(query_text)<3 THEN RAISE EXCEPTION 'copilot_query_required' USING ERRCODE='22023'; END IF;
  WITH terms AS (
  FOREACH required IN ARRAY ARRAY['service.read','service_category.read'] LOOP
   IF NOT pawpal_private.has_permission(required) THEN RAISE EXCEPTION 'copilot_forbidden' USING ERRCODE='42501'; END IF;
  END LOOP;
  IF category NOT IN ('','grooming_spa','pet_taxi','pet_hotel') THEN RAISE EXCEPTION 'invalid_copilot_filter' USING ERRCODE='22023'; END IF;
  IF (category IN ('','grooming_spa') AND NOT pawpal_private.has_permission('service_price_matrix.read')) OR (category IN ('','pet_taxi') AND NOT pawpal_private.has_permission('taxi_price_rule.read')) OR (category IN ('','pet_hotel') AND NOT pawpal_private.has_permission('hotel_room_type.read')) THEN RAISE EXCEPTION 'copilot_forbidden' USING ERRCODE='42501'; END IF;
  WITH matched AS MATERIALIZED (
   SELECT s.id,s.service_code code,s.service_name name,c.category_code category FROM public.service s JOIN public.service_category c ON c.id=s.category_id
  ) SELECT jsonb_build_object('total',(SELECT count(*) FROM matched),'items',coalesce((SELECT jsonb_agg(to_jsonb(p) ORDER BY code) FROM priced p),'[]'::jsonb),'source','service, service_price_matrix, taxi_price_rule, hotel_room_type','limitations','Mức giá áp dụng theo điều kiện cân nặng, cự ly hoặc loại phòng đang cấu hình; chưa phải báo giá cho một lịch hẹn cụ thể.') INTO result;
  IF category='pet_taxi' AND pawpal_private.has_permission('chatbot_knowledge_faq.read') THEN
   SELECT jsonb_agg(jsonb_build_object('question',question,'answer',left(answer,1600))) INTO guidance FROM (SELECT question,answer FROM public.chatbot_knowledge_faq WHERE is_active AND public.admin_sales_search_text(question||' '||answer) LIKE '%taxi%' AND public.admin_sales_search_text(question||' '||answer) LIKE '%hai chieu%' ORDER BY priority DESC,id LIMIT 3) f;
   result:=result||jsonb_build_object('guidance',coalesce(guidance,'[]'::jsonb));
```

### public.admin_copilot_facts

```sql
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('admin_copilot_history.read') THEN RAISE EXCEPTION 'copilot_forbidden' USING ERRCODE='42501'; END IF;
 IF p_filters IS NULL OR jsonb_typeof(p_filters)<>'object' OR length(p_filters::text)>4000 OR length(query_text)>120 THEN RAISE EXCEPTION 'invalid_copilot_filter' USING ERRCODE='22023'; END IF;
 IF p_intent IN ('appointment.list','ticket.open') THEN
  FOREACH required IN ARRAY ARRAY['appointment.read','appointment_item.read','service.read','service_category.read'] LOOP
   IF NOT pawpal_private.has_permission(required) THEN RAISE EXCEPTION 'copilot_forbidden' USING ERRCODE='42501'; END IF;
  END LOOP;
  IF start_at IS NULL OR (p_filters->>'status' IS NOT NULL AND p_filters->>'status' NOT IN ('pending','confirmed','checked_in','in_progress','completed','cancelled','no_show'))
  FOREACH required IN ARRAY ARRAY['inventory.read','product_variant.read','product.read'] LOOP
   IF NOT pawpal_private.has_permission(required) THEN RAISE EXCEPTION 'copilot_forbidden' USING ERRCODE='42501'; END IF;
  END LOOP;
  WITH matched AS MATERIALIZED (
 ELSIF p_intent='ticket.open' THEN
  IF NOT pawpal_private.has_permission('support_ticket.read') THEN RAISE EXCEPTION 'copilot_forbidden' USING ERRCODE='42501'; END IF;
  WITH matched AS MATERIALIZED (
   SELECT ticket_code code,subject,status,priority,created_at FROM public.support_ticket
  FOREACH required IN ARRAY ARRAY['customer.read','customer_profile.read','customer_phone.read'] LOOP
   IF NOT pawpal_private.has_permission(required) THEN RAISE EXCEPTION 'copilot_forbidden' USING ERRCODE='42501'; END IF;
  END LOOP;
  IF length(query_text)<3 THEN RAISE EXCEPTION 'copilot_query_required' USING ERRCODE='22023'; END IF;
 ELSIF p_intent='order.lookup' THEN
  IF NOT pawpal_private.has_permission('sales_order.read') THEN RAISE EXCEPTION 'copilot_forbidden' USING ERRCODE='42501'; END IF;
  IF length(query_text)<3 THEN RAISE EXCEPTION 'copilot_query_required' USING ERRCODE='22023'; END IF;
  WITH matched AS MATERIALIZED (
 ELSIF p_intent='catalog.service' THEN
  IF NOT pawpal_private.has_permission('service.read') THEN RAISE EXCEPTION 'copilot_forbidden' USING ERRCODE='42501'; END IF;
  WITH matched AS MATERIALIZED (SELECT service_code code,service_name name,left(description,600) description,status FROM public.service WHERE status='active' AND (query_text='' OR strpos(lower(service_code||' '||service_name),lower(query_text))>0))
  SELECT jsonb_build_object('total',(SELECT count(*) FROM matched),'items',coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.code) FROM (SELECT * FROM matched ORDER BY code LIMIT 20) x),'[]'::jsonb),'source','service','limitations','Không báo giá từ mô tả; cần chọn đúng biến thể khi đặt lịch.') INTO result;
 ELSIF p_intent='catalog.product' THEN
  IF NOT pawpal_private.has_permission('product.read') OR NOT pawpal_private.has_permission('product_variant.read') THEN RAISE EXCEPTION 'copilot_forbidden' USING ERRCODE='42501'; END IF;
  WITH matched AS MATERIALIZED (
   SELECT p.product_code code,p.product_name name,v.sku_variant sku,v.variant_name variant,v.sale_price price
```

### public.admin_staff_schedule_summary

```sql
BEGIN
    IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('staff.read') THEN
        RAISE EXCEPTION 'staff_schedule_forbidden' USING ERRCODE = '42501';
    END IF;
        UNION SELECT upcoming.* FROM public.staff s CROSS JOIN LATERAL (
            SELECT sch.* FROM public.staff_schedule sch WHERE sch.staff_id=s.id AND schedule_status='active'
                AND availability_status='available' AND end_at>now() ORDER BY start_at,id LIMIT 1
        ) upcoming
        UNION SELECT previous.* FROM public.staff s CROSS JOIN LATERAL (
            SELECT sch.* FROM public.staff_schedule sch WHERE sch.staff_id=s.id AND schedule_status='active'
                AND availability_status='available' AND end_at<=now() ORDER BY start_at DESC,id DESC LIMIT 1
        ) previous
```

### public.get_admin_chat_inbox_page

```sql
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('chat_conversation.read') OR NOT pawpal_private.has_permission('chat_message.read') OR NOT pawpal_private.has_permission('customer_profile.read') OR NOT pawpal_private.has_permission('customer_phone.read') THEN RAISE EXCEPTION 'chat_inbox_forbidden' USING ERRCODE='42501';END IF;
 IF p_filter NOT IN ('all','urgent','active') OR p_page IS NULL OR p_page<1 OR length(p_query)>200 THEN RAISE EXCEPTION 'invalid_chat_page' USING ERRCODE='22023';END IF;
 WITH base AS MATERIALIZED (
 SELECT c.id,c.customer_id,c.status,c.is_urgent,c.sentiment_level,c.sentiment_trend,c.ai_summary,c.internal_note,c.assigned_staff_id,c.sla_deadline,c.created_at,c.updated_at,coalesce(c.is_urgent,false) OR coalesce(c.sentiment_level,2)>=4 urgent,
 (c.assigned_staff_id IS NOT NULL OR c.status='agent_handling') handover
 FROM public.chat_conversation c
 ), matched AS MATERIALIZED (
```

### public.get_admin_chat_messages

```sql
BEGIN
 IF NOT pawpal_private.has_permission('chat_message.read') OR NOT pawpal_private.has_permission('chat_conversation.read') THEN RAISE EXCEPTION 'chat_forbidden' USING ERRCODE='42501'; END IF;
 IF p_conversation IS NULL OR (p_before_at IS NULL)<>(p_before_id IS NULL) THEN RAISE EXCEPTION 'invalid_chat_cursor' USING ERRCODE='22023'; END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.created_at DESC,r.id DESC),'[]'::jsonb) INTO result FROM (
```

### public.get_admin_staff_directory

```sql
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('staff.read') THEN
  RAISE EXCEPTION 'staff_directory_forbidden' USING ERRCODE='42501';
 END IF;
 SELECT to_jsonb(s)||jsonb_build_object('login_email',u.email),
  CASE WHEN pawpal_private.has_permission('staff_role.read') THEN coalesce((
   SELECT jsonb_agg(jsonb_build_object('code',r.code,'name',r.role_name) ORDER BY r.code)
   FROM public.staff_role sr JOIN public.access_role r ON r.code=sr.role_code WHERE sr.staff_id=s.id
  ),'[]'::jsonb) ELSE '[]'::jsonb END,
  CASE WHEN pawpal_private.has_permission('staff_permission.read') THEN ARRAY(
   SELECT sp.permission_code FROM public.staff_permission sp WHERE sp.staff_id=s.id ORDER BY sp.permission_code
  ) ELSE '{}'::text[] END,
  u.id IS NOT NULL,
```

## Ràng buộc bảng phân quyền

| Bảng | Tên | Định nghĩa |
|---|---|---|
| role_permission | role_permission_permission_code_check | CHECK ((length(btrim(permission_code)) > 0)) |
| role_permission | role_permission_permission_code_fkey | FOREIGN KEY (permission_code) REFERENCES permission(code) DEFERRABLE |
| role_permission | role_permission_pkey | PRIMARY KEY (role_code, permission_code) |
| role_permission | role_permission_role_code_check | CHECK ((length(btrim(role_code)) > 0)) |
| role_permission | role_permission_role_code_fkey | FOREIGN KEY (role_code) REFERENCES access_role(code) DEFERRABLE |
| staff | staff_auth_user_id_fkey | FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) DEFERRABLE |
| staff | staff_auth_user_id_key | UNIQUE (auth_user_id) |
| staff | staff_employment_status_check | CHECK ((length(btrim(employment_status)) > 0)) |
| staff | staff_full_name_check | CHECK ((length(btrim(full_name)) > 0)) |
| staff | staff_job_title_check | CHECK ((length(btrim(job_title)) > 0)) |
| staff | staff_pkey | PRIMARY KEY (id) |
| staff | staff_staff_level_id_fkey | FOREIGN KEY (staff_level_id) REFERENCES staff_level(id) DEFERRABLE |
| staff_permission | staff_permission_permission_code_check | CHECK ((length(btrim(permission_code)) > 0)) |
| staff_permission | staff_permission_permission_code_fkey | FOREIGN KEY (permission_code) REFERENCES permission(code) DEFERRABLE |
| staff_permission | staff_permission_pkey | PRIMARY KEY (staff_id, permission_code) |
| staff_permission | staff_permission_staff_id_fkey | FOREIGN KEY (staff_id) REFERENCES staff(id) DEFERRABLE |
| staff_role | staff_role_pkey | PRIMARY KEY (staff_id, role_code) |
| staff_role | staff_role_role_code_check | CHECK ((length(btrim(role_code)) > 0)) |
| staff_role | staff_role_role_code_fkey | FOREIGN KEY (role_code) REFERENCES access_role(code) DEFERRABLE |
| staff_role | staff_role_staff_id_fkey | FOREIGN KEY (staff_id) REFERENCES staff(id) DEFERRABLE |

## Realtime

| Publication | Bảng |
|---|---|
| supabase_realtime | access_role |
| supabase_realtime | appointment |
| supabase_realtime | appointment_item |
| supabase_realtime | appointment_record |
| supabase_realtime | audit_log |
| supabase_realtime | care_log |
| supabase_realtime | chat_conversation |
| supabase_realtime | chatbot_compensation_policy |
| supabase_realtime | chatbot_handover_rule |
| supabase_realtime | customer |
| supabase_realtime | customer_address |
| supabase_realtime | customer_phone |
| supabase_realtime | customer_profile |
| supabase_realtime | inventory |
| supabase_realtime | inventory_transaction |
| supabase_realtime | paw_point_transaction |
| supabase_realtime | pawpal_setting |
| supabase_realtime | payment |
| supabase_realtime | pet_profile |
| supabase_realtime | product |
| supabase_realtime | product_variant |
| supabase_realtime | refund_transaction |
| supabase_realtime | role_permission |
| supabase_realtime | sales_order |
| supabase_realtime | sales_order_detail |
| supabase_realtime | service |
| supabase_realtime | service_price_matrix |
| supabase_realtime | staff |
| supabase_realtime | staff_assessment |
| supabase_realtime | staff_permission |
| supabase_realtime | staff_role |
| supabase_realtime | staff_schedule |
| supabase_realtime | staff_shift_request |
| supabase_realtime | support_ticket |
| supabase_realtime | voucher |
