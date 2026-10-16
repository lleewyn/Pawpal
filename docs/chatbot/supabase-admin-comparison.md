# Đối chiếu Supabase cho chatbot Admin

Ngày đối chiếu: 16/10/2026. Phạm vi: Trực chat — Trợ lý AI — Quy định trong Admin.
Thời điểm chạy (UTC): 2026-10-16T14:45:57.065Z.

Nguồn: project được cấu hình bằng SUPABASE_URL trong môi trường cục bộ. Chưa xác nhận project này trùng production/preview đang triển khai. Không ghi URL, khóa, ID khách hoặc nội dung hội thoại.

## Phương pháp và giới hạn

- Chỉ GET OpenAPI metadata, GET danh sách cấu hình bucket và SELECT limit=0. Không đọc dòng nghiệp vụ, không INSERT/UPDATE/DELETE, không gọi RPC hoặc thay đổi Auth/Realtime/Storage.
- Kiểu/cột/quan hệ bên dưới do PostgREST công bố tại thời điểm kiểm tra; schema không được công bố có thể tồn tại ngoài API.
- HTTP 200 với limit=0 chứng minh truy vấn cột được chấp nhận, chưa chứng minh đọc được dòng nào hay vượt RLS. Đường/verb OpenAPI chưa phải bản xuất GRANT hoặc policy.
- Chưa có kết nối PostgreSQL hoặc Supabase Management token trong danh mục cấu hình G0-01 để xuất catalog quyền/trigger/index/publication/migration history. Không tự tạo RPC đọc catalog.

## Kết nối và loại khóa

| Kiểm tra | Kết quả |
|---|---|
| OpenAPI service | HTTP 200 |
| OpenAPI anon | HTTP 401 |
| Claim/định dạng service (đọc cục bộ, chưa tự coi là xác minh chữ ký) | service_role |
| Claim/định dạng anon (đọc cục bộ) | anon |
| Đọc catalog pg_catalog qua REST | HTTP 406; PGRST106 |
| Danh sách bucket, chỉ lưu số lượng cấu hình | HTTP 200; 0 bucket |

## So sánh 13 bảng migration chính

| Bảng | Cột SQL cục bộ | Cột metadata | Thiếu so với SQL | Thêm so với SQL |
|---|---|---|---|---|
| chat_conversation | 16 | 16 | không | không |
| chat_message | 11 | 11 | không | không |
| chat_moderation_log | 8 | 8 | không | không |
| chatbot_system_prompt | 9 | 9 | không | không |
| chatbot_knowledge_faq | 9 | 9 | không | không |
| chatbot_profanity_filter | 7 | 7 | không | không |
| chatbot_canned_response | 8 | 8 | không | không |
| chatbot_sentiment_tier | 5 | 5 | không | không |
| chatbot_sentiment_trigger | 6 | 6 | không | không |
| chatbot_sentiment_action | 6 | 6 | không | không |
| chatbot_handover_rule | 7 | 7 | không | không |
| chatbot_compensation_policy | 7 | 7 | không | không |
| chatbot_scenario_matrix | 8 | 8 | không | không |

## Migration bổ sung

| Bảng | Cột bổ sung | Có trong metadata | GET trực tiếp limit=0 |
|---|---|---|---|
| chat_conversation | resolved_at | chưa thấy | HTTP 400; 42703 |
| chat_conversation | resolved_reason | chưa thấy | HTTP 400; 42703 |
| chat_conversation | csat_score | chưa thấy | HTTP 400; 42703 |
| chat_conversation | csat_feedback | chưa thấy | HTTP 400; 42703 |
| chat_conversation | csat_tags | chưa thấy | HTTP 400; 42703 |
| chat_conversation | ticket_id | chưa thấy | HTTP 400; 42703 |

## Chênh lệch kiểu dữ liệu so với SQL chính

| Bảng.cột | SQL cục bộ | Metadata |
|---|---|---|
| chatbot_system_prompt.persona_name | character varying | text |
| chatbot_system_prompt.tone_of_voice | character varying | text |

Không đối chiếu độ dài VARCHAR, precision/scale, CHECK hoặc default vì metadata không bảo đảm công bố đầy đủ các ràng buộc này.

## Bảng phụ thuộc và truy vấn không trả dòng

| Bảng | Metadata service | GET limit=0 service |
|---|---|---|
| chat_conversation | có | HTTP 200; OK |
| chat_message | có | HTTP 200; OK |
| chat_moderation_log | có | HTTP 200; OK |
| chatbot_system_prompt | có | HTTP 200; OK |
| chatbot_knowledge_faq | có | HTTP 200; OK |
| chatbot_profanity_filter | có | HTTP 200; OK |
| chatbot_canned_response | có | HTTP 200; OK |
| chatbot_sentiment_tier | có | HTTP 200; OK |
| chatbot_sentiment_trigger | có | HTTP 200; OK |
| chatbot_sentiment_action | có | HTTP 200; OK |
| chatbot_handover_rule | có | HTTP 200; OK |
| chatbot_compensation_policy | có | HTTP 200; OK |
| chatbot_scenario_matrix | có | HTTP 200; OK |
| chat_rating | chưa thấy | HTTP 404; PGRST205 |
| chat_message_archive | chưa thấy | HTTP 404; PGRST205 |
| customer | có | HTTP 200; OK |
| customer_profile | có | HTTP 200; OK |
| staff | có | HTTP 200; OK |
| pet_profile | có | HTTP 200; OK |
| sales_order | có | HTTP 200; OK |
| appointment | có | HTTP 200; OK |
| service | có | HTTP 200; OK |
| support_ticket | có | HTTP 200; OK |
| support_ticket_message | có | HTTP 200; OK |
| paw_point_transaction | có | HTTP 200; OK |
| document_embeddings | có | HTTP 200; OK |

## Kiểm tra cột nhạy cảm bằng anon, không đọc dòng

| Bảng | Cột yêu cầu | Kết quả |
|---|---|---|
| chat_message | id,raw_content | HTTP 200; truy vấn được chấp nhận; chưa kết luận quyền đọc dòng |
| chat_conversation | id,session_token,internal_note | HTTP 200; truy vấn được chấp nhận; chưa kết luận quyền đọc dòng |
| chatbot_system_prompt | id,content | HTTP 200; truy vấn được chấp nhận; chưa kết luận quyền đọc dòng |

## RPC liên quan được công bố

- `/rpc/check_user_account_type` — chỉ thấy metadata, không gọi hàm.
- `/rpc/pawpal_is_staff` — chỉ thấy metadata, không gọi hàm.
- `/rpc/match_documents` — chỉ thấy metadata, không gọi hàm.

## Cột và kiểu được công bố cho các bảng chatbot

### chat_conversation

| Cột | Kiểu/định dạng | Bắt buộc trong metadata | Enum hoặc quan hệ công bố |
|---|---|---|---|
| id | uuid | có | Primary Key. |
| customer_id | uuid | không | Foreign Key to customer.id. |
| session_token | character varying | không | — |
| status | character varying | có | — |
| sentiment_level | integer | có | — |
| sentiment_trend | character varying | có | — |
| is_urgent | boolean | có | — |
| assigned_staff_id | uuid | không | Foreign Key to staff.id. |
| ai_summary | text | không | — |
| internal_note | text | không | — |
| sla_deadline | timestamp with time zone | không | — |
| violation_count | integer | có | — |
| blocked_until | timestamp with time zone | không | — |
| channel | character varying | có | — |
| created_at | timestamp with time zone | có | — |
| updated_at | timestamp with time zone | có | — |

### chat_message

| Cột | Kiểu/định dạng | Bắt buộc trong metadata | Enum hoặc quan hệ công bố |
|---|---|---|---|
| id | uuid | có | Primary Key. |
| conversation_id | uuid | có | Foreign Key to chat_conversation.id. |
| sender_type | character varying | có | — |
| sender_id | uuid | không | — |
| sender_name | character varying | có | — |
| content | text | có | — |
| raw_content | text | không | — |
| is_toxic | boolean | có | — |
| sentiment_score | numeric | không | — |
| metadata | jsonb | không | — |
| created_at | timestamp with time zone | có | — |

### chat_moderation_log

| Cột | Kiểu/định dạng | Bắt buộc trong metadata | Enum hoặc quan hệ công bố |
|---|---|---|---|
| id | uuid | có | Primary Key. |
| conversation_id | uuid | không | Foreign Key to chat_conversation.id. |
| customer_id | uuid | không | Foreign Key to customer.id. |
| detected_keywords | text[] | có | — |
| violation_count | integer | có | — |
| action_taken | character varying | có | — |
| notes | text | không | — |
| created_at | timestamp with time zone | có | — |

### chatbot_system_prompt

| Cột | Kiểu/định dạng | Bắt buộc trong metadata | Enum hoặc quan hệ công bố |
|---|---|---|---|
| id | uuid | có | Primary Key. |
| prompt_key | character varying | có | — |
| channel | character varying | có | — |
| persona_name | text | có | — |
| tone_of_voice | text | có | — |
| content | text | có | — |
| is_active | boolean | có | — |
| created_at | timestamp with time zone | có | — |
| updated_at | timestamp with time zone | có | — |

### chatbot_knowledge_faq

| Cột | Kiểu/định dạng | Bắt buộc trong metadata | Enum hoặc quan hệ công bố |
|---|---|---|---|
| id | uuid | có | Primary Key. |
| category | character varying | có | — |
| question | text | có | — |
| answer | text | có | — |
| keywords | text[] | không | — |
| priority | integer | không | — |
| is_active | boolean | có | — |
| created_at | timestamp with time zone | có | — |
| updated_at | timestamp with time zone | có | — |

### chatbot_profanity_filter

| Cột | Kiểu/định dạng | Bắt buộc trong metadata | Enum hoặc quan hệ công bố |
|---|---|---|---|
| id | uuid | có | Primary Key. |
| keyword | character varying | có | — |
| severity | character varying | có | — |
| action | character varying | có | — |
| replacement_text | character varying | không | — |
| is_active | boolean | có | — |
| created_at | timestamp with time zone | có | — |

### chatbot_canned_response

| Cột | Kiểu/định dạng | Bắt buộc trong metadata | Enum hoặc quan hệ công bố |
|---|---|---|---|
| id | uuid | có | Primary Key. |
| shortcut | character varying | có | — |
| title | character varying | có | — |
| content | text | có | — |
| category | character varying | có | — |
| usage_count | integer | có | — |
| is_active | boolean | có | — |
| created_at | timestamp with time zone | có | — |

### chatbot_sentiment_tier

| Cột | Kiểu/định dạng | Bắt buộc trong metadata | Enum hoặc quan hệ công bố |
|---|---|---|---|
| level | integer | có | Primary Key. |
| name | character varying | có | — |
| color_badge | character varying | có | — |
| sla_seconds | integer | có | — |
| description | text | có | — |

### chatbot_sentiment_trigger

| Cột | Kiểu/định dạng | Bắt buộc trong metadata | Enum hoặc quan hệ công bố |
|---|---|---|---|
| id | uuid | có | Primary Key. |
| tier_level | integer | có | Foreign Key to chatbot_sentiment_tier.level. |
| trigger_pattern | text | có | — |
| weight | numeric | có | — |
| context_domain | text | có | — |
| is_active | boolean | có | — |

### chatbot_sentiment_action

| Cột | Kiểu/định dạng | Bắt buộc trong metadata | Enum hoặc quan hệ công bố |
|---|---|---|---|
| id | uuid | có | Primary Key. |
| tier_level | integer | có | Foreign Key to chatbot_sentiment_tier.level. |
| bot_behavior | text | có | — |
| notify_admin | boolean | có | — |
| suggested_canned_id | uuid | không | Foreign Key to chatbot_canned_response.id. |
| instructions | text | có | — |

### chatbot_handover_rule

| Cột | Kiểu/định dạng | Bắt buộc trong metadata | Enum hoặc quan hệ công bố |
|---|---|---|---|
| id | uuid | có | Primary Key. |
| condition_name | text | có | — |
| trigger_type | character varying | có | — |
| threshold_value | text | có | — |
| auto_assign_role | text | có | — |
| sla_seconds | integer | có | — |
| is_active | boolean | có | — |

### chatbot_compensation_policy

| Cột | Kiểu/định dạng | Bắt buộc trong metadata | Enum hoặc quan hệ công bố |
|---|---|---|---|
| id | uuid | có | Primary Key. |
| issue_type | text | có | — |
| max_points | integer | có | — |
| max_discount_vnd | numeric | có | — |
| approval_required | boolean | có | — |
| description | text | có | — |
| is_active | boolean | có | — |

### chatbot_scenario_matrix

| Cột | Kiểu/định dạng | Bắt buộc trong metadata | Enum hoặc quan hệ công bố |
|---|---|---|---|
| id | uuid | có | Primary Key. |
| scenario_name | text | có | — |
| sample_user_input | text | có | — |
| expected_sentiment | integer | không | — |
| expected_tool_call | text | không | — |
| expected_handover | boolean | có | — |
| benchmark_status | character varying | không | — |
| created_at | timestamp with time zone | có | — |

### chat_rating

Không thấy trong metadata service.

### chat_message_archive

Không thấy trong metadata service.

## Việc chưa được xác minh

- RLS có bật/force hay không; toàn bộ policy, GRANT theo role và quyền EXECUTE thực tế.
- CHECK/enum đầy đủ nếu OpenAPI không công bố; trigger/view/index; migration nào đã áp dụng và theo thứ tự nào.
- Publication supabase_realtime có bảng nào, thiết lập Realtime và quyền kênh theo phiên nhân viên.
- Storage policy, quyền tải tệp và giới hạn upload. Có danh sách bucket không chứng minh quyền truy cập từng tệp.
- Kết quả theo từng vai trò nhân viên/quản lý, vì chưa có phiên kiểm thử tương ứng. Không dùng service role thay bằng chứng quyền admin.

Cần bản xuất catalog chỉ đọc hoặc kết nối quản trị metadata được cấp quyền để hoàn tất IN01–IN02. G0-01 chưa đủ điều kiện đánh dấu hoàn tất toàn bộ mục schema/quyền.
