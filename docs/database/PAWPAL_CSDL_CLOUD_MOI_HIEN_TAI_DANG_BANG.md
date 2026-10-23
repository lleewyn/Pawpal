# Cấu trúc CSDL Pawpal đang có trên Supabase Cloud mới

Thời điểm đọc cấu trúc: 22:17:48 22/10/2026 (UTC+7).

Project: `cpzuvaplseielhgcnqrn`. Nguồn: metadata PostgreSQL của Cloud mới, truy vấn chỉ đọc trong cùng một snapshot.

Phạm vi: **105 bảng, 907 cột và 6 view trong schema public**. Không lấy dữ liệu các hàng, mật khẩu, OTP hay giá trị API key. Schema Auth/Storage và các bảng nội bộ pawpal_private nằm ngoài danh mục nghiệp vụ này.

Đây là bản chụp cấu trúc vật lý đang triển khai của mô hình V1, không phải kết luận tự động rằng mọi bảng đã đạt 3NF. Muốn xác nhận 3NF cần đối chiếu khóa ứng viên, phụ thuộc hàm và quy tắc nghiệp vụ; tên bảng hoặc việc có khóa chính chưa đủ chứng minh.

## 1. Danh mục bảng

| STT | Thực thể | Mô tả từ CSDL | Thuộc tính | Khóa chính |
| :---: | --- | --- | --- | --- |
| 1 | `access_role` | Danh mục vai trò truy cập, độc lập chức danh nghề nghiệp. | `code`, `role_name`, `created_at`, `updated_at` | PRIMARY KEY (code) |
| 2 | `admin_copilot_history` | Lưu tin nhắn trợ lý nội bộ theo phiên của từng nhân viên. | `id`, `session_id`, `staff_id`, `role`, `content`, `metadata`, `created_at` | PRIMARY KEY (id) |
| 3 | `appointment` | Lưu phiếu đặt lịch dịch vụ của khách hàng cho từng thú cưng | `id`, `appointment_code`, `customer_id`, `pet_id`, `staff_id`, `check_in_time`, `check_out_time`, `note`, `change_count`, `appointment_status`, `created_at`, `updated_at`, `scheduled_start_at`, `scheduled_end_at` | PRIMARY KEY (id) |
| 4 | `appointment_adjustment` | Ghi nhận phụ phí, giảm trừ, gia hạn hoặc sự cố cần duyệt. | `id`, `appointment_id`, `adjustment_type`, `duration_delta_minutes`, `amount_delta`, `reason`, `proposed_by`, `approved_by`, `approval_status`, `customer_consent_status`, `approved_at`, `created_at` | PRIMARY KEY (id) |
| 5 | `appointment_item` | Dòng dịch vụ hoặc addon thực tế của một ca, giữ nội dung giá đã chốt. | `id`, `appointment_id`, `service_id`, `service_addon_id`, `is_primary`, `name_snapshot`, `quantity`, `unit_price`, `discount_amount`, `duration_minutes`, `weight_snapshot`, `staff_id`, `status`, `created_at`, `updated_at` | PRIMARY KEY (id) |
| 6 | `appointment_record` | Biên bản tiếp nhận hoặc bàn giao có phiên bản, giữ thông tin tại thời điểm lập. | `id`, `appointment_id`, `record_type`, `schema_version`, `revision_no`, `recorded_by`, `recorded_at`, `condition_note`, `safety_note_snapshot`, `allergy_note_snapshot`, `customer_confirmation_status`, `confirmed_at`, `note`, `created_at` | PRIMARY KEY (id) |
| 7 | `audit_log` | Lưu lịch sử thao tác quan trọng của nhân viên nhằm phục vụ kiểm tra và truy vết hệ thống | `id`, `staff_id`, `action`, `entity_name`, `entity_id`, `description`, `created_at` | PRIMARY KEY (id) |
| 8 | `banner` | Lưu thông tin Banner quảng bá hiển thị trên website, gồm hình ảnh, tiêu đề, liên kết và thời gian hiển thị. | `id`, `image_url`, `title`, `description`, `link`, `button_text`, `display_order`, `start_date`, `end_date`, `status`, `created_at`, `updated_at` | PRIMARY KEY (id) |
| 9 | `blog_category` | Lưu danh mục bài viết | `id`, `category_name`, `description`, `display_order`, `status`, `created_at`, `updated_at` | PRIMARY KEY (id) |
| 10 | `blog_post` | Lưu bài viết chia sẻ kiến thức và tin tức trên website | `id`, `category_id`, `title`, `slug`, `summary`, `content`, `thumbnail_url`, `author_id`, `publish_at`, `status`, `view_count`, `created_at`, `updated_at` | PRIMARY KEY (id) |
| 11 | `care_action` | Lưu danh mục các mốc chăm sóc như Tắm, | `id`, `action_name`, `is_active`, `created_at`, `updated_at` | PRIMARY KEY (id) |
| 12 | `care_log` | Lưu toàn bộ timeline chăm sóc trong quá trình thực hiện dịch vụ | `id`, `appointment_id`, `care_action_id`, `description`, `observed_condition`, `recorded_at`, `created_at`, `updated_at`, `recorded_by`, `action_name_snapshot` | PRIMARY KEY (id) |
| 13 | `care_log_media` | Lưu ảnh và video minh chứng được cập nhật vào Care Log | `id`, `care_log_id`, `media_type`, `media_url`, `file_name`, `file_size`, `staff_id`, `uploaded_at`, `created_at` | PRIMARY KEY (id) |
| 14 | `cart` | Lưu giỏ hàng hiện tại của khách trước khi tạo đơn hàng | `id`, `customer_id`, `cart_status`, `created_at`, `updated_at` | PRIMARY KEY (id) |
| 15 | `cart_item` | Lưu danh sách sản phẩm được thêm vào giỏ hàng | `id`, `cart_id`, `product_variant_id`, `quantity`, `unit_price`, `created_at`, `updated_at` | PRIMARY KEY (id) |
| 16 | `chat_conversation` | Quản lý các phiên hội thoại trực tuyến giữa khách hàng và AI Chatbot hoặc nhân viên tư vấn | `id`, `customer_id`, `status`, `sentiment_level`, `sentiment_trend`, `is_urgent`, `assigned_staff_id`, `ai_summary`, `internal_note`, `sla_deadline`, `resolved_at`, `resolved_reason`, `resolved_by`, `violation_count`, `blocked_until`, `channel`, `created_at`, `updated_at`, `guest_session_id`, `session_token` | PRIMARY KEY (id) |
| 17 | `chat_feedback` | Ghi nhận một đánh giá hài lòng cho mỗi hội thoại. | `id`, `conversation_id`, `score`, `comment`, `submitted_at` | PRIMARY KEY (id) |
| 18 | `chat_message` | Lưu từng tin nhắn chi tiết trong các phiên hội thoại chat | `id`, `conversation_id`, `sender_type`, `content`, `raw_content`, `is_toxic`, `sentiment_score`, `metadata`, `created_at`, `sender_account_id`, `sender_guest_session_id` | PRIMARY KEY (id) |
| 19 | `chat_moderation_log` | Nhật ký kiểm duyệt nội dung tin nhắn và ghi nhận các vi phạm quy chuẩn giao tiếp | `id`, `conversation_id`, `customer_id`, `detected_keywords`, `violation_count`, `action_taken`, `notes`, `created_at` | PRIMARY KEY (id) |
| 20 | `chatbot_canned_response` | Danh mục các câu trả lời nhanh soạn sẵn cho nhân viên CSKH và Chatbot | `id`, `shortcut`, `title`, `content`, `category`, `usage_count`, `is_active`, `created_at` | PRIMARY KEY (id) |
| 21 | `chatbot_compensation_policy` | Chính sách đền bù và tặng điểm Pawpoint tự động khi khách hàng gặp sự cố dịch vụ | `id`, `issue_type`, `max_points`, `max_discount_vnd`, `approval_required`, `description`, `is_active` | PRIMARY KEY (id) |
| 22 | `chatbot_handover_rule` | Quy tắc tự động bàn giao cuộc trò chuyện từ Bot sang nhân viên chuyên môn như KTV Grooming hoặc CSKH; không có thú y. | `id`, `condition_name`, `trigger_type`, `threshold_value`, `auto_assign_role`, `sla_seconds`, `is_active` | PRIMARY KEY (id) |
| 23 | `chatbot_knowledge_faq` | Kho tri thức các câu hỏi thường gặp FAQ phục vụ giải đáp tự động cho khách hàng | `id`, `category`, `question`, `answer`, `keywords`, `priority`, `is_active`, `created_at`, `updated_at` | PRIMARY KEY (id) |
| 24 | `chatbot_profanity_filter` | Danh mục các từ ngữ nhạy cảm, thô tục cần tự động che hoặc chặn trong phiên chat | `id`, `keyword`, `severity`, `action`, `replacement_text`, `is_active`, `created_at` | PRIMARY KEY (id) |
| 25 | `chatbot_scenario_matrix` | Ma trận các kịch bản kiểm thử (benchmark) đánh giá chất lượng phản hồi và độ chính xác của AI Chatbot | `id`, `scenario_name`, `sample_user_input`, `expected_sentiment`, `expected_tool_call`, `expected_handover`, `benchmark_status`, `created_at` | PRIMARY KEY (id) |
| 26 | `chatbot_sentiment_action` | Quy định các hành vi phản ứng tự động của chatbot tương ứng với từng cấp độ cảm xúc | `id`, `tier_level`, `bot_behavior`, `notify_admin`, `suggested_canned_id`, `instructions` | PRIMARY KEY (id) |
| 27 | `chatbot_sentiment_tier` | Bảng phân tầng các cấp độ cảm xúc của khách hàng (Bình thường, Bức xúc, Khẩn cấp) kèm cam kết phản hồi SLA | `level`, `name`, `color_badge`, `sla_seconds`, `description` | PRIMARY KEY (level) |
| 28 | `chatbot_sentiment_trigger` | Danh sách các mẫu từ khóa và biểu thức nhận diện cảm xúc khách hàng của hệ thống AI Chatbot | `id`, `tier_level`, `trigger_pattern`, `weight`, `context_domain`, `is_active` | PRIMARY KEY (id) |
| 29 | `chatbot_system_prompt` | Quản lý các System Prompt cấu hình nhân cách (Persona), phong cách giao tiếp và hướng dẫn hành vi của AI Chatbot | `id`, `prompt_key`, `channel`, `persona_name`, `tone_of_voice`, `content`, `is_active`, `created_at`, `updated_at` | PRIMARY KEY (id) |
| 30 | `customer` | Hồ sơ nghiệp vụ khách hàng, có thể được tạo tại quầy trước khi có tài khoản. | `id`, `auth_user_id`, `customer_code`, `customer_status`, `registered_at`, `note`, `created_at`, `updated_at`, `contact_email` | PRIMARY KEY (id) |
| 31 | `customer_address` | Lưu nhiều địa chỉ giao hàng, đón trả thú cưng hoặc địa chỉ đặt hộ của khách hàng | `id`, `customer_id`, `receiver_name`, `receiver_phone`, `province`, `street_address`, `postal_code`, `is_default`, `created_at`, `updated_at` | PRIMARY KEY (id) |
| 32 | `customer_membership` | Lưu hạng thành viên hiện đang được gán; không lưu số dư điểm lặp. | `customer_id`, `membership_tier_id`, `assigned_at`, `created_at`, `updated_at` | PRIMARY KEY (customer_id) |
| 33 | `customer_phone` | Lưu các số điện thoại liên hệ và số chính dùng xác minh đăng nhập. | `id`, `customer_id`, `phone_number`, `is_primary`, `verified_at`, `created_at`, `updated_at` | PRIMARY KEY (id) |
| 34 | `customer_profile` | Lưu một hồ sơ cá nhân cho mỗi khách hàng. | `customer_id`, `full_name`, `date_of_birth`, `gender`, `created_at`, `updated_at` | PRIMARY KEY (customer_id) |
| 35 | `customer_voucher` | Lưu danh sách voucher mà khách hàng đang sở hữu hoặc đã sử dụng | `id`, `customer_id`, `voucher_id`, `acquired_method`, `voucher_status`, `acquired_at`, `expired_at` | PRIMARY KEY (id) |
| 36 | `delivery_option_config` | Lưu thông tin các hình thức giao hàng | `id`, `name`, `description`, `fee`, `estimated_days`, `icon`, `available`, `created_at` | PRIMARY KEY (id) |
| 37 | `document_embeddings` | Bảng lưu trữ vector embedding các đoạn tài liệu chính sách, cẩm nang chăm sóc thú cưng phục vụ tra cứu ngữ nghĩa RAG cho AI | `id`, `content`, `metadata`, `embedding` | PRIMARY KEY (id) |
| 38 | `guest_session` | Định danh phiên khách vãng lai mà không tạo hồ sơ khách giả. | `id`, `token_hash`, `expires_at`, `revoked_at`, `created_at` | PRIMARY KEY (id) |
| 39 | `hotel_booking` | Quản lý lịch đặt phòng lưu trú khách sạn thú cưng Pet Hotel | `id`, `booking_code`, `room_id`, `appointment_id`, `check_in_at`, `check_out_at`, `status`, `special_diet_notes`, `care_notes`, `daily_price`, `created_at`, `updated_at` | PRIMARY KEY (id) |
| 40 | `hotel_room` | Phòng vật lý thực tế tại cơ sở lưu trú, thuộc một loại phòng cụ thể và được quản lý theo số phòng và trạng thái sử dụng. | `id`, `room_number`, `room_type_id`, `status`, `description`, `created_at`, `updated_at` | PRIMARY KEY (id) |
| 41 | `hotel_room_type` | Loại phòng khách sạn dành cho thú cưng, lưu thông tin cấu hình và mức giá dùng chung cho các phòng cùng loại. | `id`, `room_type`, `capacity`, `daily_price`, `description`, `amenities`, `status`, `created_at`, `updated_at` | PRIMARY KEY (id) |
| 42 | `inventory` | Bảng số dư tồn tổng hợp của kho chung theo từng biến thể; có thể dựng lại từ sổ kho, không thuộc lõi chuẩn hóa độc lập. | `id`, `product_variant_id`, `quantity_in_stock`, `minimum_stock`, `last_updated_at` | PRIMARY KEY (id) |
| 43 | `inventory_transaction` | Lưu lịch sử nhập kho, xuất kho và điều chỉnh tồn kho | `id`, `product_variant_id`, `transaction_type`, `quantity`, `note`, `staff_id`, `created_at`, `purchase_order_detail_id`, `sales_order_detail_id`, `return_request_detail_id`, `idempotency_key`, `recorded_at` | PRIMARY KEY (id) |
| 44 | `membership_tier` | Lưu cấu hình các hạng thành viên như Bạc, Vàng, Kim Cương | `id`, `tier_name`, `minimum_expenditure`, `discount_percent`, `description`, `is_active`, `created_at`, `updated_at` | PRIMARY KEY (id) |
| 45 | `notification` | Lưu các thông báo gửi đến khách hàng về trạng thái đơn hàng, lịch hẹn, yêu cầu hỗ trợ và giao dịch hoàn tiền; các FK liên quan giúp xác định chính xác đối tượng mà thông báo dẫn đến. | `id`, `customer_id`, `notification_type`, `title`, `content`, `sales_order_id`, `appointment_id`, `support_ticket_id`, `refund_transaction_id`, `sent_at`, `read_at` | PRIMARY KEY (id) |
| 46 | `paw_point_transaction` | Lưu toàn bộ lịch sử cộng, trừ và quy đổi Paw Point | `id`, `customer_id`, `payment_id`, `review_id`, `reward_rule_id`, `points`, `description`, `created_at`, `refund_transaction_id`, `voucher_redemption_id`, `customer_voucher_id`, `idempotency_key`, `sequence_no` | PRIMARY KEY (id) |
| 47 | `pawpal_setting` | Lưu các cấu hình chung của website như hotline, popup, top-bar và các thiết lập hệ thống khác. | `id`, `setting_key`, `setting_value`, `setting_type`, `description`, `created_at`, `updated_at` | PRIMARY KEY (id) |
| 48 | `payment` | Lưu lịch sử thanh toán, phương thức thanh toán và trạng thái giao dịch | `id`, `payment_code`, `customer_id`, `payment_method_config_id`, `payment_type`, `amount`, `transaction_status`, `succeeded_at`, `created_at`, `updated_at`, `gateway_transaction_id`, `idempotency_key`, `order_id`, `appointment_id`, `eligible_spend_amount` | PRIMARY KEY (id) |
| 49 | `payment_method_config` | Lưu thông tin các loại phương thức thanh toán khả dụng | `id`, `name`, `short_name`, `description`, `icon`, `fee`, `available`, `requires_info`, `redirect_url`, `bank_info`, `created_at` | PRIMARY KEY (id) |
| 50 | `permission` | Danh mục các quyền thao tác được máy chủ kiểm tra. | `code`, `description` | PRIMARY KEY (code) |
| 51 | `pet_breed` | Danh mục giống thuộc từng loài thú cưng. | `id`, `species_id`, `breed_name`, `is_active`, `created_at`, `updated_at` | PRIMARY KEY (id) |
| 52 | `pet_profile` | Lưu hồ sơ định danh Pet ID, tên thú cưng, giống loài, giới tính, ngày sinh và trạng thái hoạt động | `id`, `customer_id`, `pet_code`, `pet_name`, `avatar_url`, `gender`, `date_of_birth`, `color`, `routine`, `allergy`, `status`, `created_at`, `updated_at`, `breed_id`, `safety_note` | PRIMARY KEY (id) |
| 53 | `pet_species` | Danh mục loài thú cưng. | `id`, `species_name`, `is_active`, `created_at`, `updated_at` | PRIMARY KEY (id) |
| 54 | `pet_weight_history` | Lưu lịch sử cân đo trọng lượng định kỳ của thú cưng phục vụ theo dõi sức khỏe và điều chỉnh dịch vụ | `id`, `pet_id`, `weight`, `measured_at`, `recorded_by`, `note`, `created_at` | PRIMARY KEY (id) |
| 55 | `product` | Lưu danh mục sản phẩm kinh | `id`, `category_id`, `product_name`, `unit`, `target_pet`, `description`, `slug`, `status`, `created_at`, `updated_at`, `origin`, `ingredients`, `benefits`, `usage_instructions`, `specs`, `badge`, `brand_name` | PRIMARY KEY (id) |
| 56 | `product_category` | Lưu danh mục nhóm sản phẩm | `id`, `category_name`, `description`, `status`, `created_at`, `updated_at` | PRIMARY KEY (id) |
| 57 | `product_media` | Ảnh dùng chung của sản phẩm, độc lập ảnh riêng từng biến thể. | `id`, `product_id`, `image_url`, `display_order`, `is_thumbnail`, `created_at`, `updated_at` | PRIMARY KEY (id) |
| 58 | `product_variant` | Lưu từng phiên bản cụ thể của một sản phẩm theo màu sắc, kích thước, kiểu dáng, SKU và giá bán riêng. | `id`, `product_id`, `color_id`, `size_id`, `flavor_id`, `sku_variant`, `cost_price`, `sale_price`, `compare_at_price`, `weight`, `barcode`, `status`, `created_at`, `updated_at` | PRIMARY KEY (id) |
| 59 | `product_variant_media` | Lưu ảnh riêng của từng biến thể sản phẩm, độc lập ảnh dùng chung của sản phẩm. | `id`, `product_variant_id`, `image_url`, `display_order`, `is_thumbnail`, `created_at`, `updated_at` | PRIMARY KEY (id) |
| 60 | `promotion` | Lưu các chương trình khuyến mãi đang áp dụng | `id`, `promotion_name`, `description`, `discount_type`, `discount_value`, `start_date`, `end_date`, `minimum_order_value`, `status`, `created_at`, `updated_at` | PRIMARY KEY (id) |
| 61 | `promotion_product` | Lưu danh sách sản phẩm được áp dụng trong chương trình khuyến mãi | `id`, `promotion_id`, `product_variant_id` | PRIMARY KEY (id) |
| 62 | `promotion_service` | Lưu danh sách dịch vụ được áp dụng trong chương trình khuyến mãi | `id`, `promotion_id`, `service_id` | PRIMARY KEY (id) |
| 63 | `purchase_order` | Lưu phiếu nhập hàng từ nhà cung cấp | `id`, `supplier_id`, `order_number`, `order_date`, `expected_date`, `order_status`, `note`, `created_at`, `updated_at` | PRIMARY KEY (id) |
| 64 | `purchase_order_detail` | Lưu chi tiết từng sản phẩm trong phiếu nhập hàng | `id`, `purchase_order_id`, `product_variant_id`, `quantity`, `unit_price` | PRIMARY KEY (id) |
| 65 | `refund_transaction` | Lưu giao dịch hoàn tiền hoặc bồi thường thực tế phát sinh từ một support ticket đã được phê duyệt xử lý. Đây là thực thể ghi nhận dòng tiền, tách biệt với quá trình tiếp nhận và xử lý khiếu nại. | `id`, `refund_code`, `ticket_id`, `payment_id`, `refund_type`, `requested_amount`, `approved_amount`, `refunded_amount`, `refund_method`, `refund_status`, `gateway_transaction_id`, `note`, `processed_by`, `processed_at`, `completed_at`, `created_at`, `updated_at`, `return_request_id`, `eligible_refund_amount` | PRIMARY KEY (id) |
| 66 | `return_request` | Lưu yêu cầu đổi trả sản phẩm và thông tin hậu mãi | `id`, `sales_order_id`, `resolution_type`, `resolved_by`, `reason`, `return_type`, `description`, `request_status`, `created_at`, `updated_at` | PRIMARY KEY (id) |
| 67 | `return_request_detail` | Lưu chi tiết sản phẩm được đổi trả | `id`, `return_request_id`, `quantity`, `sales_order_detail_id` | PRIMARY KEY (id) |
| 68 | `return_request_evidence` | Ảnh bằng chứng của yêu cầu trả hàng. | `id`, `return_request_id`, `image_url`, `display_order`, `created_at` | PRIMARY KEY (id) |
| 69 | `review` | Lưu đánh giá của khách hàng cho sản phẩm hoặc dịch vụ | `id`, `rating`, `review_content`, `review_status`, `created_at`, `updated_at`, `sales_order_detail_id`, `appointment_item_id` | PRIMARY KEY (id) |
| 70 | `review_media` | Ảnh minh chứng đính kèm đánh giá. | `id`, `review_id`, `image_url`, `display_order`, `created_at` | PRIMARY KEY (id) |
| 71 | `review_response` | Lưu phản hồi của Admin đối với đánh giá của khách hàng | `id`, `review_id`, `staff_id`, `response_content`, `created_at`, `updated_at` | PRIMARY KEY (id) |
| 72 | `reward_rule` | Lưu quy tắc cộng hoặc trừ Paw Points theo từng sự kiện như đăng ký, đặt lịch, mua hàng, đánh giá hoặc chương trình khuyến mãi | `id`, `rule_name`, `reward_type`, `trigger_event`, `reward_value`, `description`, `is_active`, `created_at`, `updated_at` | PRIMARY KEY (id) |
| 73 | `role_permission` | Liên kết nhiều quyền với nhiều vai trò truy cập. | `role_code`, `permission_code` | PRIMARY KEY (role_code, permission_code) |
| 74 | `sales_order` | Lưu đơn hàng mua sắm trên website hoặc tại cửa hàng | `id`, `order_code`, `customer_id`, `order_status`, `note`, `created_at`, `updated_at`, `shipping_fee_snapshot`, `receiver_name_snapshot`, `receiver_phone_snapshot`, `province_snapshot`, `street_address_snapshot`, `postal_code_snapshot`, `delivery_option_id`, `shipping_provider_id`, `tracking_code`, `shipped_at`, `delivered_at`, `shipping_status` | PRIMARY KEY (id) |
| 75 | `sales_order_detail` | Lưu chi tiết sản phẩm, số lượng và đơn giá trong từng đơn hàng | `id`, `order_id`, `product_variant_id`, `quantity`, `unit_price`, `discount_amount`, `product_name_snapshot`, `sku_snapshot` | PRIMARY KEY (id) |
| 76 | `service` | Lưu danh mục các dịch vụ thuộc các nhóm Grooming & Spa, Pet Hotel và Pet Taxi | `id`, `service_code`, `service_name`, `description`, `estimated_duration`, `status`, `commission_rate`, `benefits`, `created_at`, `updated_at`, `category_id`, `staff_level_required_id`, `amenities` | PRIMARY KEY (id) |
| 77 | `service_addon` | Lưu danh sách các dịch vụ bổ sung đi kèm dịch vụ chính (Spa, Hotel, Taxi), bao gồm giá, thời lượng và trạng thái áp dụng. | `id`, `service_id`, `addon_name`, `description`, `price`, `estimated_duration`, `is_required`, `status`, `created_at`, `updated_at` | PRIMARY KEY (id) |
| 78 | `service_care_action` | Checklist mẫu của từng dịch vụ, độc lập nhật ký thực hiện. | `service_id`, `care_action_id`, `display_order`, `estimated_duration` | PRIMARY KEY (service_id, care_action_id) |
| 79 | `service_category` | Danh mục nhóm dịch vụ chăm sóc, lưu trú và đưa đón. | `id`, `category_code`, `category_name`, `created_at`, `updated_at` | PRIMARY KEY (id) |
| 80 | `service_image` | Lưu ảnh của dịch vụ và xác định ảnh đại diện từ cùng một nguồn. | `id`, `service_id`, `image_url`, `display_order`, `is_thumbnail`, `created_at`, `updated_at` | PRIMARY KEY (id) |
| 81 | `service_price_matrix` | Lưu bảng giá của từng dịch vụ theo loài thú cưng, cân nặng hoặc điều kiện áp dụng | `id`, `service_id`, `weight_from`, `weight_to`, `unit_price`, `effective_from`, `effective_to`, `status`, `created_at`, `updated_at` | PRIMARY KEY (id) |
| 82 | `service_supported_species` | Liên kết dịch vụ với các loài được phục vụ. | `service_id`, `species_id` | PRIMARY KEY (service_id, species_id) |
| 83 | `shipping_provider` | Lưu danh sách các đơn vị vận chuyển mà PawPal sử dụng để giao đơn hàng, giúp Admin quản lý đối tác giao hàng và liên | `id`, `provider_name`, `provider_code`, `logo_url`, `contact_phone`, `tracking_url`, `status`, `created_at`, `updated_at` | PRIMARY KEY (id) |
| 84 | `staff` | Lưu thông tin tài khoản nhân viên, lễ tân, chuyên môn, CSKH và quản lý | `id`, `full_name`, `phone_number`, `job_title`, `specialization`, `hire_date`, `email`, `address`, `dob`, `service_locked`, `created_at`, `updated_at`, `auth_user_id`, `staff_level_id`, `employment_status`, `must_change_password` | PRIMARY KEY (id) |
| 85 | `staff_assessment` | Lưu các lần sát hạch hoặc đánh giá kỹ năng thực tế của nhân viên. | `id`, `staff_id`, `assessment_date`, `assessment_type`, `score`, `result`, `note`, `assessed_by`, `created_at`, `updated_at` | PRIMARY KEY (id) |
| 86 | `staff_level` | Danh mục cấp độ chuyên môn của kỹ thuật viên. | `id`, `level_code`, `level_name`, `rank_order`, `is_active`, `created_at`, `updated_at` | PRIMARY KEY (id) |
| 87 | `staff_permission` | Cấp thêm quyền trực tiếp cho nhân viên, không biểu diễn quyền từ chối. | `staff_id`, `permission_code` | PRIMARY KEY (staff_id, permission_code) |
| 88 | `staff_role` | Gán các vai trò truy cập cho nhân viên. | `staff_id`, `role_code` | PRIMARY KEY (staff_id, role_code) |
| 89 | `staff_schedule` | Lưu lịch làm việc, ca trực và thời gian hoạt động của nhân viên | `id`, `staff_id`, `availability_status`, `reason`, `schedule_status`, `created_at`, `updated_at`, `start_at`, `end_at` | PRIMARY KEY (id) |
| 90 | `staff_shift_request` | Lưu yêu cầu xin đổi ca, xin nghỉ phép hoặc vắng mặt của nhân viên | `id`, `request_type`, `staff_id`, `target_staff_id`, `replacement_staff_id`, `leave_type`, `start_date`, `end_date`, `shift`, `target_date`, `target_shift`, `reason`, `status`, `created_by`, `reviewed_by`, `reviewed_at`, `created_at` | PRIMARY KEY (id) |
| 91 | `stock_reservation` | Lưu thông tin giữ trước số lượng tồn kho của từng biến thể sản phẩm | `id`, `product_variant_id`, `cart_id`, `quantity`, `reserved_at`, `expires_at`, `status`, `created_at`, `updated_at`, `order_id` | PRIMARY KEY (id) |
| 92 | `supplier` | Lưu thông tin nhà cung cấp sản phẩm | `id`, `supplier_name`, `contact_person`, `phone_number`, `email`, `address`, `status`, `created_at`, `updated_at` | PRIMARY KEY (id) |
| 93 | `support_ticket` | Lưu các yêu cầu hỗ trợ, khiếu nại, tranh chấp và yêu cầu xử lý phát sinh từ khách hàng trong quá trình sử dụng dịch vụ/mua hàng. Đây là thực thể trung tâm để theo dõi toàn bộ vụ việc từ lúc tiếp nhận đến khi giải quyết và đóng yêu cầu. | `id`, `ticket_code`, `customer_id`, `order_id`, `appointment_id`, `channel`, `category`, `subject`, `description`, `priority`, `type`, `status`, `requested_resolution`, `requested_amount`, `assigned_staff_id`, `first_response_at`, `investigation_note`, `resolution_type`, `resolution_note`, `approved_amount`, `resolved_by`, `resolved_at`, `closed_at`, `rating`, `rating_comment`, `created_at`, `updated_at`, `created_by_account_id` | PRIMARY KEY (id) |
| 94 | `support_ticket_message` | Lưu toàn bộ nội dung trao đổi, phản hồi, bằng chứng và ghi chú trong quá trình xử lý một support ticket. | `id`, `ticket_id`, `sender_type`, `content`, `is_internal`, `created_at`, `sender_account_id`, `sender_guest_session_id` | PRIMARY KEY (id) |
| 95 | `support_ticket_message_attachment` | Tệp đính kèm của từng tin nhắn hỗ trợ. | `id`, `message_id`, `file_url`, `file_name`, `file_size`, `media_type`, `display_order`, `created_at` | PRIMARY KEY (id) |
| 96 | `taxi_price_rule` | Lưu các quy tắc tính giá dịch vụ Pet Taxi theo khoảng cách, cân nặng và thời gian hiệu lực của bảng giá. | `id`, `distance_from`, `distance_to`, `weight_from`, `weight_to`, `base_price`, `surcharge`, `effective_from`, `effective_to`, `status`, `created_at`, `updated_at` | PRIMARY KEY (id) |
| 97 | `taxi_trip` | Thông tin chuyến đưa đón gắn duy nhất với một lịch dịch vụ. | `id`, `appointment_id`, `driver_staff_id`, `pickup_address`, `dropoff_address`, `distance_km`, `trip_type`, `outbound_at`, `return_at`, `taxi_price_rule_id`, `quoted_amount`, `status`, `created_at`, `updated_at` | PRIMARY KEY (id) |
| 98 | `variant_color` | Lưu định dạng màu sắc sản phẩm | `id`, `color_name`, `hex_code`, `display_order`, `is_active`, `created_at`, `updated_at` | PRIMARY KEY (id) |
| 99 | `variant_flavor` | Lưu danh mục hương vị hoặc mùi hương dùng chung cho các biến thể sản phẩm. | `id`, `flavor_name`, `display_order`, `is_active`, `created_at`, `updated_at` | PRIMARY KEY (id) |
| 100 | `variant_size` | Lưu định dạng kích thước sản phẩm | `id`, `size_name`, `display_order`, `is_active`, `created_at`, `updated_at` | PRIMARY KEY (id) |
| 101 | `voucher` | Lưu danh mục voucher có thể phát hành hoặc | `id`, `voucher_code`, `voucher_name`, `discount_value`, `minimum_order_amount`, `required_points`, `start_date`, `end_date`, `is_active`, `type`, `description`, `applicable_for`, `max_usage`, `created_at`, `updated_at` | PRIMARY KEY (id) |
| 102 | `voucher_redemption` | Lưu từng lượt áp dụng voucher vào đơn hoặc lịch, giữ mức giảm đã chốt. | `id`, `customer_voucher_id`, `voucher_id`, `order_id`, `appointment_id`, `discount_amount_snapshot`, `status`, `redeemed_at`, `reversed_at`, `idempotency_key`, `created_at` | PRIMARY KEY (id) |
| 103 | `wishlist` | Lưu danh sách sản phẩm yêu thích của khách hàng | `id`, `customer_id`, `created_at`, `updated_at` | PRIMARY KEY (id) |
| 104 | `wishlist_product` | Sản phẩm yêu thích của khách thông qua wishlist. | `wishlist_id`, `product_id`, `added_at` | PRIMARY KEY (wishlist_id, product_id) |
| 105 | `wishlist_service` | Dịch vụ yêu thích của khách thông qua wishlist. | `wishlist_id`, `service_id`, `added_at` | PRIMARY KEY (wishlist_id, service_id) |

## 2. Từ điển cột và ràng buộc

Ý nghĩa cột lấy từ COMMENT trong CSDL. Khi chưa có COMMENT, ghi rõ chưa có mô tả để tránh tự gán ý nghĩa nghiệp vụ. “Có mặc định” chỉ báo sự tồn tại, không xuất biểu thức mặc định có thể chứa nội dung cấu hình.

### 1. access_role

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `code` | text | Có | — | Mã vai trò truy cập, dùng làm khóa chính. |
| 2 | `role_name` | text | Có | — | Tên hiển thị của vai trò. |
| 3 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 4 | `updated_at` | timestamp with time zone | Có | Có mặc định | Thời điểm cập nhật gần nhất. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `access_role_code_check` | CHECK ((length(btrim(code)) > 0)) |
| Kiểm tra | `access_role_role_name_check` | CHECK ((length(btrim(role_name)) > 0)) |
| Khóa chính | `access_role_pkey` | PRIMARY KEY (code) |

### 2. admin_copilot_history

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã tin nhắn trợ lý. |
| 2 | `session_id` | uuid | Có | — | Mã nhóm phiên trao đổi của nhân viên, không phải token đăng nhập. |
| 3 | `staff_id` | uuid | Có | — | Nhân viên sở hữu phiên trao đổi. |
| 4 | `role` | text | Có | — | Vai trò tin nhắn người dùng, trợ lý hoặc hệ thống. |
| 5 | `content` | text | Có | — | Nội dung tin nhắn. |
| 6 | `metadata` | jsonb | Có | Có mặc định | Thông tin ngữ cảnh bổ trợ; không thay các quan hệ nghiệp vụ. |
| 7 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `admin_copilot_history_role_check` | CHECK ((length(btrim(role)) > 0)) |
| Khóa ngoại | `admin_copilot_history_staff_id_fkey` | FOREIGN KEY (staff_id) REFERENCES staff(id) DEFERRABLE |
| Khóa chính | `admin_copilot_history_pkey` | PRIMARY KEY (id) |

### 3. appointment

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh lịch hẹn |
| 2 | `appointment_code` | text | Có | — | Mã lịch hẹn hiển thị |
| 3 | `customer_id` | uuid | Có | — | Khách hàng đặt lịch |
| 4 | `pet_id` | uuid | Có | — | Thú cưng sử dụng dịch vụ |
| 5 | `staff_id` | uuid | Không | — | Nhân viên được phân công |
| 6 | `check_in_time` | timestamp with time zone | Không | — | Thời điểm khách đưa thú cưng đến |
| 7 | `check_out_time` | timestamp with time zone | Không | — | Thời điểm hoàn tất bàn giao thú cưng |
| 8 | `note` | text | Không | — | Ghi chú của khách hàng khi đặt lịch |
| 9 | `change_count` | integer | Có | Có mặc định | Số lần khách đổi lịch |
| 10 | `appointment_status` | text | Có | Có mặc định | Trạng thái lịch hẹn |
| 11 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 12 | `updated_at` | timestamp with time zone | Có | Có mặc định | Thời điểm cập nhật gần nhất. |
| 13 | `scheduled_start_at` | timestamp with time zone | Có | — | Thời điểm dự kiến bắt đầu có múi giờ. |
| 14 | `scheduled_end_at` | timestamp with time zone | Có | — | Thời điểm dự kiến kết thúc có múi giờ. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `appointment_appointment_code_check` | CHECK ((length(btrim(appointment_code)) > 0)) |
| Kiểm tra | `appointment_appointment_status_check` | CHECK ((length(btrim(appointment_status)) > 0)) |
| Kiểm tra | `appointment_change_count_check` | CHECK ((change_count >= 0)) |
| Kiểm tra | `appointment_check` | CHECK ((scheduled_end_at > scheduled_start_at)) |
| Kiểm tra | `appointment_check1` | CHECK (((check_out_time IS NULL) OR (check_out_time >= check_in_time))) |
| Khóa ngoại | `appointment_customer_id_fkey` | FOREIGN KEY (customer_id) REFERENCES customer(id) DEFERRABLE |
| Khóa ngoại | `appointment_pet_id_fkey` | FOREIGN KEY (pet_id) REFERENCES pet_profile(id) DEFERRABLE |
| Khóa ngoại | `appointment_staff_id_fkey` | FOREIGN KEY (staff_id) REFERENCES staff(id) DEFERRABLE |
| Khóa chính | `appointment_pkey` | PRIMARY KEY (id) |
| t | `v1_money_check` | TRIGGER DEFERRABLE INITIALLY DEFERRED |
| Duy nhất | `appointment_appointment_code_key` | UNIQUE (appointment_code) |

### 4. appointment_adjustment

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã điều chỉnh ca. |
| 2 | `appointment_id` | uuid | Có | — | Ca chịu điều chỉnh. |
| 3 | `adjustment_type` | text | Có | — | Loại gia hạn, phụ phí, giảm trừ hoặc sự cố. |
| 4 | `duration_delta_minutes` | integer | Có | Có mặc định | Số phút tăng hoặc giảm có dấu. |
| 5 | `amount_delta` | numeric(18,4) | Có | Có mặc định | Số tiền tăng hoặc giảm có dấu. |
| 6 | `reason` | text | Có | — | Lý do điều chỉnh. |
| 7 | `proposed_by` | uuid | Có | — | Nhân viên đề xuất. |
| 8 | `approved_by` | uuid | Không | — | Nhân viên phê duyệt; có thể NULL khi chưa duyệt. |
| 9 | `approval_status` | text | Có | Có mặc định | Trạng thái xét duyệt điều chỉnh. |
| 10 | `customer_consent_status` | text | Có | Có mặc định | Trạng thái đồng ý của khách khi nghiệp vụ yêu cầu. |
| 11 | `approved_at` | timestamp with time zone | Không | — | Thời điểm duyệt, có thể NULL. |
| 12 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `appointment_adjustment_adjustment_type_check` | CHECK ((length(btrim(adjustment_type)) > 0)) |
| Kiểm tra | `appointment_adjustment_approval_status_check` | CHECK ((length(btrim(approval_status)) > 0)) |
| Kiểm tra | `appointment_adjustment_customer_consent_status_check` | CHECK ((length(btrim(customer_consent_status)) > 0)) |
| Kiểm tra | `appointment_adjustment_reason_check` | CHECK ((length(btrim(reason)) > 0)) |
| Khóa ngoại | `appointment_adjustment_appointment_id_fkey` | FOREIGN KEY (appointment_id) REFERENCES appointment(id) DEFERRABLE |
| Khóa ngoại | `appointment_adjustment_approved_by_fkey` | FOREIGN KEY (approved_by) REFERENCES staff(id) DEFERRABLE |
| Khóa ngoại | `appointment_adjustment_proposed_by_fkey` | FOREIGN KEY (proposed_by) REFERENCES staff(id) DEFERRABLE |
| Khóa chính | `appointment_adjustment_pkey` | PRIMARY KEY (id) |
| t | `v1_money_check` | TRIGGER DEFERRABLE INITIALLY DEFERRED |

### 5. appointment_item

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã dòng dịch vụ. |
| 2 | `appointment_id` | uuid | Có | — | Ca dịch vụ chứa dòng. |
| 3 | `service_id` | uuid | Không | — | Gói dịch vụ được chọn; NULL nếu dòng là addon. |
| 4 | `service_addon_id` | uuid | Không | — | Addon được chọn; NULL nếu dòng là gói dịch vụ. |
| 5 | `is_primary` | boolean | Có | Có mặc định | Đánh dấu gói chính của ca, tối đa một dòng chính. |
| 6 | `name_snapshot` | text | Có | — | Tên gói hoặc addon tại thời điểm ghi nhận. |
| 7 | `quantity` | integer | Có | — | Số lượng áp dụng, lớn hơn 0. |
| 8 | `unit_price` | numeric(18,4) | Có | — | Đơn giá tại thời điểm chốt. |
| 9 | `discount_amount` | numeric(18,4) | Có | Có mặc định | Tổng giảm giá phân bổ cho dòng tại thời điểm chốt. |
| 10 | `duration_minutes` | integer | Có | — | Thời lượng đã chốt cho dòng dịch vụ. |
| 11 | `weight_snapshot` | numeric(18,4) | Không | — | Cân nặng dùng tính giá tại thời điểm chốt, nếu áp dụng. |
| 12 | `staff_id` | uuid | Không | — | Kỹ thuật viên thực hiện dòng; có thể khác người phụ trách ca. |
| 13 | `status` | text | Có | Có mặc định | Trạng thái áp dụng, hoàn tất hoặc hủy dòng. |
| 14 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 15 | `updated_at` | timestamp with time zone | Có | Có mặc định | Thời điểm cập nhật gần nhất. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `appointment_item_check` | CHECK ((num_nonnulls(service_id, service_addon_id) = 1)) |
| Kiểm tra | `appointment_item_check1` | CHECK ((discount_amount <= ((quantity)::numeric * unit_price))) |
| Kiểm tra | `appointment_item_check2` | CHECK (((NOT is_primary) OR (service_id IS NOT NULL))) |
| Kiểm tra | `appointment_item_discount_amount_check` | CHECK ((discount_amount >= (0)::numeric)) |
| Kiểm tra | `appointment_item_duration_minutes_check` | CHECK ((duration_minutes >= 0)) |
| Kiểm tra | `appointment_item_name_snapshot_check` | CHECK ((length(btrim(name_snapshot)) > 0)) |
| Kiểm tra | `appointment_item_quantity_check` | CHECK ((quantity > 0)) |
| Kiểm tra | `appointment_item_status_check` | CHECK ((length(btrim(status)) > 0)) |
| Kiểm tra | `appointment_item_unit_price_check` | CHECK ((unit_price >= (0)::numeric)) |
| Kiểm tra | `appointment_item_weight_snapshot_check` | CHECK ((weight_snapshot >= (0)::numeric)) |
| Khóa ngoại | `appointment_item_appointment_id_fkey` | FOREIGN KEY (appointment_id) REFERENCES appointment(id) DEFERRABLE |
| Khóa ngoại | `appointment_item_service_addon_id_fkey` | FOREIGN KEY (service_addon_id) REFERENCES service_addon(id) DEFERRABLE |
| Khóa ngoại | `appointment_item_service_id_fkey` | FOREIGN KEY (service_id) REFERENCES service(id) DEFERRABLE |
| Khóa ngoại | `appointment_item_staff_id_fkey` | FOREIGN KEY (staff_id) REFERENCES staff(id) DEFERRABLE |
| Khóa chính | `appointment_item_pkey` | PRIMARY KEY (id) |
| t | `v1_money_check` | TRIGGER DEFERRABLE INITIALLY DEFERRED |

### 6. appointment_record

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã biên bản. |
| 2 | `appointment_id` | uuid | Có | — | Ca được lập biên bản. |
| 3 | `record_type` | text | Có | — | Loại tiếp nhận hoặc bàn giao. |
| 4 | `schema_version` | integer | Có | — | Phiên bản cấu trúc biểu mẫu. |
| 5 | `revision_no` | integer | Có | Có mặc định | Số lần sửa biên bản; bản đã ký không bị ghi đè. |
| 6 | `recorded_by` | uuid | Có | — | Nhân viên lập biên bản. |
| 7 | `recorded_at` | timestamp with time zone | Có | Có mặc định | Thời điểm lập biên bản. |
| 8 | `condition_note` | text | Có | — | Mô tả tình trạng khi tiếp nhận hoặc bàn giao. |
| 9 | `safety_note_snapshot` | text | Không | — | Cảnh báo an toàn được ghi nhận lúc lập. |
| 10 | `allergy_note_snapshot` | text | Không | — | Thông tin dị ứng được ghi nhận lúc lập. |
| 11 | `customer_confirmation_status` | text | Có | Có mặc định | Trạng thái xác nhận nội dung của khách. |
| 12 | `confirmed_at` | timestamp with time zone | Không | — | Thời điểm khách xác nhận, nếu có. |
| 13 | `note` | text | Không | — | Nội dung bổ sung của biên bản. |
| 14 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `appointment_record_check` | CHECK (((customer_confirmation_status = 'confirmed'::text) = (confirmed_at IS NOT NULL))) |
| Kiểm tra | `appointment_record_condition_note_check` | CHECK ((length(btrim(condition_note)) > 0)) |
| Kiểm tra | `appointment_record_customer_confirmation_status_check` | CHECK ((length(btrim(customer_confirmation_status)) > 0)) |
| Kiểm tra | `appointment_record_customer_confirmation_status_check1` | CHECK ((customer_confirmation_status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'declined'::text]))) |
| Kiểm tra | `appointment_record_record_type_check` | CHECK ((length(btrim(record_type)) > 0)) |
| Kiểm tra | `appointment_record_revision_no_check` | CHECK ((revision_no >= 0)) |
| Kiểm tra | `appointment_record_revision_no_check1` | CHECK ((revision_no > 0)) |
| Kiểm tra | `appointment_record_schema_version_check` | CHECK ((schema_version >= 0)) |
| Kiểm tra | `appointment_record_schema_version_check1` | CHECK ((schema_version > 0)) |
| Khóa ngoại | `appointment_record_appointment_id_fkey` | FOREIGN KEY (appointment_id) REFERENCES appointment(id) DEFERRABLE |
| Khóa ngoại | `appointment_record_recorded_by_fkey` | FOREIGN KEY (recorded_by) REFERENCES staff(id) DEFERRABLE |
| Khóa chính | `appointment_record_pkey` | PRIMARY KEY (id) |
| Duy nhất | `appointment_record_appointment_id_record_type_revision_no_key` | UNIQUE (appointment_id, record_type, revision_no) |

### 7. audit_log

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh duy nhất của bản ghi audit. |
| 2 | `staff_id` | uuid | Không | — | Nhân viên thực hiện thao tác. |
| 3 | `action` | text | Có | — | Loại hành động đã thực hiện, ví dụ tạo, cập nhật, xóa hoặc duyệt. |
| 4 | `entity_name` | text | Không | — | Tên thực thể bị tác động. |
| 5 | `entity_id` | uuid | Không | — | Mã bản ghi cụ thể bị tác động. |
| 6 | `description` | text | Không | — | Mô tả chi tiết thao tác và thay đổi quan trọng. |
| 7 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `audit_log_action_check` | CHECK ((length(btrim(action)) > 0)) |
| Khóa ngoại | `audit_log_staff_id_fkey` | FOREIGN KEY (staff_id) REFERENCES staff(id) DEFERRABLE |
| Khóa chính | `audit_log_pkey` | PRIMARY KEY (id) |

### 8. banner

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh duy nhất của banner. |
| 2 | `image_url` | text | Có | — | Hình ảnh banner được hiển thị trên website. |
| 3 | `title` | text | Có | — | Tiêu đề chính hiển thị trên banner. |
| 4 | `description` | text | Không | — | Mô tả hoặc thông điệp khuyến mãi trên banner. |
| 5 | `link` | text | Không | — | Đường dẫn đến trang đích khi khách hàng bấm banner. |
| 6 | `button_text` | text | Không | — | Nội dung nút kêu gọi hành động trên banner. |
| 7 | `display_order` | integer | Có | Có mặc định | Thứ tự banner trong khu vực hiển thị. |
| 8 | `start_date` | date | Không | — | Ngày bắt đầu hiển thị banner. |
| 9 | `end_date` | date | Không | — | Ngày kết thúc hiển thị banner. |
| 10 | `status` | text | Có | Có mặc định | Trạng thái hiển thị của banner. |
| 11 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 12 | `updated_at` | timestamp with time zone | Có | Có mặc định | Thời điểm cập nhật gần nhất. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `banner_display_order_check` | CHECK ((display_order >= 0)) |
| Kiểm tra | `banner_image_url_check` | CHECK ((length(btrim(image_url)) > 0)) |
| Kiểm tra | `banner_status_check` | CHECK ((length(btrim(status)) > 0)) |
| Kiểm tra | `banner_title_check` | CHECK ((length(btrim(title)) > 0)) |
| Khóa chính | `banner_pkey` | PRIMARY KEY (id) |

### 9. blog_category

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh duy nhất của danh mục. |
| 2 | `category_name` | text | Có | — | Tên danh mục bài viết. |
| 3 | `description` | text | Không | — | Mô tả phạm vi nội dung của danh mục. |
| 4 | `display_order` | integer | Có | Có mặc định | Thứ tự hiển thị danh mục trên website. |
| 5 | `status` | text | Có | Có mặc định | Trạng thái sử dụng của danh mục. |
| 6 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 7 | `updated_at` | timestamp with time zone | Có | Có mặc định | Thời điểm cập nhật gần nhất. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `blog_category_category_name_check` | CHECK ((length(btrim(category_name)) > 0)) |
| Kiểm tra | `blog_category_display_order_check` | CHECK ((display_order >= 0)) |
| Kiểm tra | `blog_category_status_check` | CHECK ((length(btrim(status)) > 0)) |
| Khóa chính | `blog_category_pkey` | PRIMARY KEY (id) |

### 10. blog_post

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh duy nhất của bài viết. |
| 2 | `category_id` | uuid | Có | — | Danh mục bài viết mà bài viết thuộc về. |
| 3 | `title` | text | Có | — | Tiêu đề bài viết hiển thị trên website. |
| 4 | `slug` | text | Có | — | Đường dẫn thân thiện dùng để truy cập bài viết. |
| 5 | `summary` | text | Không | — | Phần tóm tắt ngắn dùng ở danh sách bài viết. |
| 6 | `content` | text | Có | — | Nội dung đầy đủ của bài viết. |
| 7 | `thumbnail_url` | text | Không | — | Hình ảnh đại diện của bài viết. |
| 8 | `author_id` | uuid | Có | — | Nhân viên chịu trách nhiệm biên soạn hoặc đăng bài. |
| 9 | `publish_at` | timestamp with time zone | Không | — | Thời điểm bài viết được công khai trên website. |
| 10 | `status` | text | Có | Có mặc định | Trạng thái xuất bản của bài viết. |
| 11 | `view_count` | integer | Có | Có mặc định | Số lượt xem bài viết. |
| 12 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 13 | `updated_at` | timestamp with time zone | Có | Có mặc định | Thời điểm cập nhật gần nhất. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `blog_post_slug_check` | CHECK ((length(btrim(slug)) > 0)) |
| Kiểm tra | `blog_post_status_check` | CHECK ((length(btrim(status)) > 0)) |
| Kiểm tra | `blog_post_title_check` | CHECK ((length(btrim(title)) > 0)) |
| Kiểm tra | `blog_post_view_count_check` | CHECK ((view_count >= 0)) |
| Khóa ngoại | `blog_post_author_id_fkey` | FOREIGN KEY (author_id) REFERENCES staff(id) DEFERRABLE |
| Khóa ngoại | `blog_post_category_id_fkey` | FOREIGN KEY (category_id) REFERENCES blog_category(id) DEFERRABLE |
| Khóa chính | `blog_post_pkey` | PRIMARY KEY (id) |
| Duy nhất | `blog_post_slug_key` | UNIQUE (slug) |

### 11. care_action

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh hoạt động chăm sóc |
| 2 | `action_name` | text | Có | — | Tên mốc chăm sóc |
| 3 | `is_active` | boolean | Có | Có mặc định | Mốc chăm sóc có đang được sử dụng hay không |
| 4 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 5 | `updated_at` | timestamp with time zone | Có | Có mặc định | Thời điểm cập nhật gần nhất. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `care_action_action_name_check` | CHECK ((length(btrim(action_name)) > 0)) |
| Khóa chính | `care_action_pkey` | PRIMARY KEY (id) |

### 12. care_log

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh Care Log |
| 2 | `appointment_id` | uuid | Có | — | Lịch hẹn phát sinh Care Log |
| 3 | `care_action_id` | uuid | Không | — | Mốc chăm sóc được ghi nhận |
| 4 | `description` | text | Không | — | Nội dung nhân viên ghi nhận |
| 5 | `observed_condition` | text | Không | — | Tình trạng da, lông và hành vi quan sát được khi chăm sóc; không phải chẩn đoán y khoa. |
| 6 | `recorded_at` | timestamp with time zone | Có | Có mặc định | Thời điểm ghi nhận Care Log |
| 7 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 8 | `updated_at` | timestamp with time zone | Có | Có mặc định | Thời điểm cập nhật gần nhất. |
| 9 | `recorded_by` | uuid | Không | — | Nhân viên ghi nhận thao tác thực tế. |
| 10 | `action_name_snapshot` | text | Có | — | Tên thao tác tại thời điểm thực hiện, không đổi theo checklist mẫu. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `care_log_action_name_snapshot_check` | CHECK ((length(btrim(action_name_snapshot)) > 0)) |
| Khóa ngoại | `care_log_appointment_id_fkey` | FOREIGN KEY (appointment_id) REFERENCES appointment(id) DEFERRABLE |
| Khóa ngoại | `care_log_care_action_id_fkey` | FOREIGN KEY (care_action_id) REFERENCES care_action(id) DEFERRABLE |
| Khóa ngoại | `care_log_recorded_by_fkey` | FOREIGN KEY (recorded_by) REFERENCES staff(id) DEFERRABLE |
| Khóa chính | `care_log_pkey` | PRIMARY KEY (id) |

### 13. care_log_media

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh media |
| 2 | `care_log_id` | uuid | Có | — | Care Log chứa media |
| 3 | `media_type` | text | Có | — | Loại media |
| 4 | `media_url` | text | Có | — | Đường dẫn file media |
| 5 | `file_name` | text | Có | — | Tên file media |
| 6 | `file_size` | bigint | Có | — | Dung lượng file tính bằng byte |
| 7 | `staff_id` | uuid | Không | — | Nhân viên tải media lên |
| 8 | `uploaded_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tải media lên |
| 9 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `care_log_media_file_name_check` | CHECK ((length(btrim(file_name)) > 0)) |
| Kiểm tra | `care_log_media_file_size_check` | CHECK ((file_size >= 0)) |
| Kiểm tra | `care_log_media_media_type_check` | CHECK ((length(btrim(media_type)) > 0)) |
| Kiểm tra | `care_log_media_media_url_check` | CHECK ((length(btrim(media_url)) > 0)) |
| Khóa ngoại | `care_log_media_care_log_id_fkey` | FOREIGN KEY (care_log_id) REFERENCES care_log(id) DEFERRABLE |
| Khóa ngoại | `care_log_media_staff_id_fkey` | FOREIGN KEY (staff_id) REFERENCES staff(id) DEFERRABLE |
| Khóa chính | `care_log_media_pkey` | PRIMARY KEY (id) |

### 14. cart

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh giỏ hàng. |
| 2 | `customer_id` | uuid | Có | — | Khách hàng sở hữu giỏ hàng. |
| 3 | `cart_status` | text | Có | Có mặc định | Trạng thái vòng đời của giỏ hàng. |
| 4 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 5 | `updated_at` | timestamp with time zone | Có | Có mặc định | Thời điểm cập nhật gần nhất. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `cart_cart_status_check` | CHECK ((length(btrim(cart_status)) > 0)) |
| Khóa ngoại | `cart_customer_id_fkey` | FOREIGN KEY (customer_id) REFERENCES customer(id) DEFERRABLE |
| Khóa chính | `cart_pkey` | PRIMARY KEY (id) |

### 15. cart_item

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh dòng sản phẩm trong giỏ. |
| 2 | `cart_id` | uuid | Có | — | Giỏ hàng chứa sản phẩm này. |
| 3 | `product_variant_id` | uuid | Có | — | Biến thể sản phẩm khách đang mua. |
| 4 | `quantity` | integer | Có | — | Số lượng biến thể được chọn trong giỏ. |
| 5 | `unit_price` | numeric(18,4) | Có | — | Giá bán của biến thể tại thời điểm được thêm/cập nhật vào giỏ. |
| 6 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 7 | `updated_at` | timestamp with time zone | Có | Có mặc định | Thời điểm cập nhật gần nhất. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `cart_item_quantity_check` | CHECK ((quantity > 0)) |
| Kiểm tra | `cart_item_unit_price_check` | CHECK ((unit_price >= (0)::numeric)) |
| Khóa ngoại | `cart_item_cart_id_fkey` | FOREIGN KEY (cart_id) REFERENCES cart(id) DEFERRABLE |
| Khóa ngoại | `cart_item_product_variant_id_fkey` | FOREIGN KEY (product_variant_id) REFERENCES product_variant(id) DEFERRABLE |
| Khóa chính | `cart_item_pkey` | PRIMARY KEY (id) |
| Duy nhất | `cart_item_cart_id_product_variant_id_key` | UNIQUE (cart_id, product_variant_id) |

### 16. chat_conversation

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh duy nhất của phiên hội thoại. |
| 2 | `customer_id` | uuid | Không | — | Khách hàng tham gia hội thoại. |
| 3 | `status` | text | Có | Có mặc định | Trạng thái phiên (đang mở, chờ xử lý, đã đóng). |
| 4 | `sentiment_level` | integer | Có | — | Cấp độ cảm xúc hiện tại của khách hàng. |
| 5 | `sentiment_trend` | text | Có | — | Xu hướng cảm xúc (tích cực, tiêu cực, leo thang). |
| 6 | `is_urgent` | boolean | Có | Có mặc định | Đánh dấu phiên hội thoại khẩn cấp cần can thiệp. |
| 7 | `assigned_staff_id` | uuid | Không | — | Nhân viên CSKH tiếp nhận xử lý phiên. |
| 8 | `ai_summary` | text | Không | — | Tóm tắt nội dung hội thoại tự động bởi AI. |
| 9 | `internal_note` | text | Không | — | Ghi chú nội bộ giữa các nhân viên hỗ trợ. |
| 10 | `sla_deadline` | timestamp with time zone | Không | — | Hạn chót thời gian cam kết phản hồi (SLA). |
| 11 | `resolved_at` | timestamp with time zone | Không | — | Thời điểm hội thoại được đóng thực tế. |
| 12 | `resolved_reason` | text | Không | — | Lý do đóng hội thoại. |
| 13 | `resolved_by` | uuid | Không | — | Nhân viên đóng hội thoại. |
| 14 | `violation_count` | integer | Có | Có mặc định | Số lần vi phạm quy tắc ngôn từ của phiên. |
| 15 | `blocked_until` | timestamp with time zone | Không | — | Thời gian tạm khóa người dùng nếu vi phạm nặng. |
| 16 | `channel` | text | Có | — | Kênh tiếp nhận hội thoại (web, zalo, facebook). |
| 17 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 18 | `updated_at` | timestamp with time zone | Có | Có mặc định | Thời điểm cập nhật gần nhất. |
| 19 | `guest_session_id` | uuid | Không | — | Phiên của khách vãng lai; có thể được giữ để truy vết sau khi khách đăng nhập. |
| 20 | `session_token` | text | Không | — | Chưa có COMMENT |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `chat_conversation_channel_check` | CHECK ((length(btrim(channel)) > 0)) |
| Kiểm tra | `chat_conversation_check` | CHECK ((num_nonnulls(customer_id, guest_session_id) >= 1)) |
| Kiểm tra | `chat_conversation_sentiment_level_check` | CHECK ((sentiment_level >= 0)) |
| Kiểm tra | `chat_conversation_sentiment_trend_check` | CHECK ((length(btrim(sentiment_trend)) > 0)) |
| Kiểm tra | `chat_conversation_status_check` | CHECK ((length(btrim(status)) > 0)) |
| Kiểm tra | `chat_conversation_violation_count_check` | CHECK ((violation_count >= 0)) |
| Khóa ngoại | `chat_conversation_assigned_staff_id_fkey` | FOREIGN KEY (assigned_staff_id) REFERENCES staff(id) DEFERRABLE |
| Khóa ngoại | `chat_conversation_customer_id_fkey` | FOREIGN KEY (customer_id) REFERENCES customer(id) DEFERRABLE |
| Khóa ngoại | `chat_conversation_guest_session_id_fkey` | FOREIGN KEY (guest_session_id) REFERENCES guest_session(id) DEFERRABLE |
| Khóa ngoại | `chat_conversation_resolved_by_fkey` | FOREIGN KEY (resolved_by) REFERENCES staff(id) DEFERRABLE |
| Khóa ngoại | `chat_conversation_sentiment_level_fkey` | FOREIGN KEY (sentiment_level) REFERENCES chatbot_sentiment_tier(level) DEFERRABLE |
| Khóa chính | `chat_conversation_pkey` | PRIMARY KEY (id) |

### 17. chat_feedback

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã đánh giá hội thoại. |
| 2 | `conversation_id` | uuid | Có | — | Hội thoại được đánh giá, duy nhất. |
| 3 | `score` | smallint | Có | — | Mức hài lòng từ 1 đến 5. |
| 4 | `comment` | text | Không | — | Nhận xét bổ sung của người tham gia. |
| 5 | `submitted_at` | timestamp with time zone | Có | Có mặc định | Thời điểm gửi đánh giá. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `chat_feedback_score_check` | CHECK (((score >= 1) AND (score <= 5))) |
| Khóa ngoại | `chat_feedback_conversation_id_fkey` | FOREIGN KEY (conversation_id) REFERENCES chat_conversation(id) DEFERRABLE |
| Khóa chính | `chat_feedback_pkey` | PRIMARY KEY (id) |
| Duy nhất | `chat_feedback_conversation_id_key` | UNIQUE (conversation_id) |

### 18. chat_message

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh duy nhất của tin nhắn. |
| 2 | `conversation_id` | uuid | Có | — | Phiên hội thoại chứa tin nhắn. |
| 3 | `sender_type` | text | Có | — | Đối tượng gửi (khách hàng, bot, nhân viên). |
| 4 | `content` | text | Có | — | Nội dung tin nhắn sau khi đã lọc kiểm duyệt. |
| 5 | `raw_content` | text | Không | — | Nội dung gốc trước khi xử lý lọc từ khóa. |
| 6 | `is_toxic` | boolean | Có | Có mặc định | Đánh dấu tin nhắn chứa từ ngữ công kích hoặc tiêu cực. |
| 7 | `sentiment_score` | numeric(18,4) | Có | — | Điểm số đánh giá cảm xúc của tin nhắn. |
| 8 | `metadata` | jsonb | Có | Có mặc định | Dữ liệu đính kèm dạng JSON (nút gợi ý, thẻ sản phẩm). |
| 9 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 10 | `sender_account_id` | uuid | Không | — | Tài khoản gửi tin; NULL với phiên vãng lai hoặc bot/hệ thống. |
| 11 | `sender_guest_session_id` | uuid | Không | — | Phiên vãng lai gửi tin; NULL với tài khoản hoặc bot/hệ thống. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `chat_message_sender_type_check` | CHECK ((length(btrim(sender_type)) > 0)) |
| Khóa ngoại | `chat_message_conversation_id_fkey` | FOREIGN KEY (conversation_id) REFERENCES chat_conversation(id) DEFERRABLE |
| Khóa ngoại | `chat_message_sender_account_id_fkey` | FOREIGN KEY (sender_account_id) REFERENCES auth.users(id) DEFERRABLE |
| Khóa ngoại | `chat_message_sender_guest_session_id_fkey` | FOREIGN KEY (sender_guest_session_id) REFERENCES guest_session(id) DEFERRABLE |
| Khóa chính | `chat_message_pkey` | PRIMARY KEY (id) |

### 19. chat_moderation_log

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh duy nhất của bản ghi kiểm duyệt. |
| 2 | `conversation_id` | uuid | Có | — | Phiên hội thoại xảy ra vi phạm. |
| 3 | `customer_id` | uuid | Không | — | Khách hàng có tin nhắn vi phạm. |
| 4 | `detected_keywords` | text[] | Có | Có mặc định | Danh sách từ khóa vi phạm được phát hiện. |
| 5 | `violation_count` | integer | Có | Có mặc định | Số lần vi phạm cộng dồn của khách hàng. |
| 6 | `action_taken` | text | Có | — | Biện pháp đã xử lý (cảnh báo, che từ, chặn tạm thời). |
| 7 | `notes` | text | Không | — | Ghi chú thêm về bối cảnh vi phạm. |
| 8 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `chat_moderation_log_action_taken_check` | CHECK ((length(btrim(action_taken)) > 0)) |
| Kiểm tra | `chat_moderation_log_violation_count_check` | CHECK ((violation_count >= 0)) |
| Khóa ngoại | `chat_moderation_log_conversation_id_fkey` | FOREIGN KEY (conversation_id) REFERENCES chat_conversation(id) DEFERRABLE |
| Khóa ngoại | `chat_moderation_log_customer_id_fkey` | FOREIGN KEY (customer_id) REFERENCES customer(id) DEFERRABLE |
| Khóa chính | `chat_moderation_log_pkey` | PRIMARY KEY (id) |

### 20. chatbot_canned_response

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh câu trả lời nhanh. |
| 2 | `shortcut` | text | Có | — | Phím tắt gõ nhanh. |
| 3 | `title` | text | Có | — | Tiêu đề gợi nhớ. |
| 4 | `content` | text | Có | — | Nội dung mẫu phản hồi đầy đủ. |
| 5 | `category` | text | Có | — | Chuyên mục phân loại tin nhắn. |
| 6 | `usage_count` | integer | Có | Có mặc định | Số lượt sử dụng thực tế. |
| 7 | `is_active` | boolean | Có | Có mặc định | Trạng thái khả dụng. |
| 8 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `chatbot_canned_response_category_check` | CHECK ((length(btrim(category)) > 0)) |
| Kiểm tra | `chatbot_canned_response_shortcut_check` | CHECK ((length(btrim(shortcut)) > 0)) |
| Kiểm tra | `chatbot_canned_response_title_check` | CHECK ((length(btrim(title)) > 0)) |
| Kiểm tra | `chatbot_canned_response_usage_count_check` | CHECK ((usage_count >= 0)) |
| Khóa chính | `chatbot_canned_response_pkey` | PRIMARY KEY (id) |

### 21. chatbot_compensation_policy

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh chính sách đền bù. |
| 2 | `issue_type` | text | Có | — | Loại sự cố (trễ hẹn, sản phẩm lỗi, dịch vụ chưa đạt). |
| 3 | `max_points` | integer | Có | — | Số điểm Pawpoint tối đa được phép đền bù tự động. |
| 4 | `max_discount_vnd` | numeric(18,4) | Có | — | Số tiền giảm giá tối đa được áp dụng. |
| 5 | `approval_required` | boolean | Có | Có mặc định | Cờ yêu cầu quản trị viên duyệt trước khi cấp. |
| 6 | `description` | text | Không | — | Mô tả chi tiết điều kiện và hạn mức áp dụng. |
| 7 | `is_active` | boolean | Có | Có mặc định | Trạng thái hiệu lực của chính sách. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `chatbot_compensation_policy_issue_type_check` | CHECK ((length(btrim(issue_type)) > 0)) |
| Kiểm tra | `chatbot_compensation_policy_max_discount_vnd_check` | CHECK ((max_discount_vnd >= (0)::numeric)) |
| Kiểm tra | `chatbot_compensation_policy_max_points_check` | CHECK ((max_points >= 0)) |
| Khóa chính | `chatbot_compensation_policy_pkey` | PRIMARY KEY (id) |

### 22. chatbot_handover_rule

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh quy tắc chuyển tiếp. |
| 2 | `condition_name` | text | Có | — | Tên điều kiện chuyển tiếp. |
| 3 | `trigger_type` | text | Có | — | Loại kích hoạt (cảm xúc tiêu cực, từ khóa chuyên sâu, yêu cầu trực tiếp). |
| 4 | `threshold_value` | numeric(18,4) | Có | — | Ngưỡng kích hoạt. |
| 5 | `auto_assign_role` | text | Không | — | Vai trò nhân viên tiếp nhận (CSKH, KTV, Quản lý). |
| 6 | `sla_seconds` | integer | Có | — | Thời gian cam kết tiếp nhận ca sau khi bàn giao. |
| 7 | `is_active` | boolean | Có | Có mặc định | Trạng thái kích hoạt quy tắc. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `chatbot_handover_rule_condition_name_check` | CHECK ((length(btrim(condition_name)) > 0)) |
| Kiểm tra | `chatbot_handover_rule_sla_seconds_check` | CHECK ((sla_seconds >= 0)) |
| Kiểm tra | `chatbot_handover_rule_threshold_value_check` | CHECK ((threshold_value >= (0)::numeric)) |
| Kiểm tra | `chatbot_handover_rule_trigger_type_check` | CHECK ((length(btrim(trigger_type)) > 0)) |
| Khóa ngoại | `chatbot_handover_rule_auto_assign_role_fkey` | FOREIGN KEY (auto_assign_role) REFERENCES access_role(code) DEFERRABLE |
| Khóa chính | `chatbot_handover_rule_pkey` | PRIMARY KEY (id) |

### 23. chatbot_knowledge_faq

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh câu hỏi tri thức. |
| 2 | `category` | text | Có | — | Chuyên mục (dịch vụ, sản phẩm, chính sách đổi trả, bảng giá). |
| 3 | `question` | text | Có | — | Nội dung câu hỏi thường gặp. |
| 4 | `answer` | text | Có | — | Câu trả lời chuẩn mực đã được kiểm duyệt. |
| 5 | `keywords` | text[] | Có | Có mặc định | Từ khóa liên quan hỗ trợ tìm kiếm nhanh. |
| 6 | `priority` | integer | Có | — | Thứ tự ưu tiên hiển thị và đối soát. |
| 7 | `is_active` | boolean | Có | Có mặc định | Trạng thái sử dụng câu hỏi tri thức. |
| 8 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 9 | `updated_at` | timestamp with time zone | Có | Có mặc định | Thời điểm cập nhật gần nhất. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `chatbot_knowledge_faq_answer_check` | CHECK ((length(btrim(answer)) > 0)) |
| Kiểm tra | `chatbot_knowledge_faq_category_check` | CHECK ((length(btrim(category)) > 0)) |
| Kiểm tra | `chatbot_knowledge_faq_priority_check` | CHECK ((priority >= 0)) |
| Kiểm tra | `chatbot_knowledge_faq_question_check` | CHECK ((length(btrim(question)) > 0)) |
| Khóa chính | `chatbot_knowledge_faq_pkey` | PRIMARY KEY (id) |

### 24. chatbot_profanity_filter

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh từ khóa lọc. |
| 2 | `keyword` | text | Có | — | Từ hoặc cụm từ nhạy cảm. |
| 3 | `severity` | text | Có | — | Mức độ nghiêm trọng của vi phạm. |
| 4 | `action` | text | Có | — | Hành động xử lý (thay thế ký tự sao, chặn gửi tin, cảnh báo). |
| 5 | `replacement_text` | text | Không | — | Chuỗi ký tự dùng để thay thế. |
| 6 | `is_active` | boolean | Có | Có mặc định | Trạng thái kích hoạt bộ lọc. |
| 7 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `chatbot_profanity_filter_action_check` | CHECK ((length(btrim(action)) > 0)) |
| Kiểm tra | `chatbot_profanity_filter_keyword_check` | CHECK ((length(btrim(keyword)) > 0)) |
| Kiểm tra | `chatbot_profanity_filter_severity_check` | CHECK ((length(btrim(severity)) > 0)) |
| Khóa chính | `chatbot_profanity_filter_pkey` | PRIMARY KEY (id) |

### 25. chatbot_scenario_matrix

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh kịch bản kiểm định. |
| 2 | `scenario_name` | text | Có | — | Tên kịch bản thử nghiệm. |
| 3 | `sample_user_input` | text | Có | — | Câu nói mẫu của khách hàng thử nghiệm. |
| 4 | `expected_sentiment` | integer | Có | — | Cảm xúc mong đợi hệ thống nhận diện. |
| 5 | `expected_tool_call` | text | Không | — | Công cụ/hàm nghiệp vụ mong đợi bot gọi. |
| 6 | `expected_handover` | boolean | Có | Có mặc định | Kỳ vọng có chuyển giao cho người thật hay không. |
| 7 | `benchmark_status` | text | Có | Có mặc định | Kết quả đánh giá kiểm thử (đạt, chưa đạt). |
| 8 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `chatbot_scenario_matrix_benchmark_status_check` | CHECK ((length(btrim(benchmark_status)) > 0)) |
| Kiểm tra | `chatbot_scenario_matrix_sample_user_input_check` | CHECK ((length(btrim(sample_user_input)) > 0)) |
| Kiểm tra | `chatbot_scenario_matrix_scenario_name_check` | CHECK ((length(btrim(scenario_name)) > 0)) |
| Khóa chính | `chatbot_scenario_matrix_pkey` | PRIMARY KEY (id) |

### 26. chatbot_sentiment_action

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh hành vi ứng phó. |
| 2 | `tier_level` | integer | Có | — | Cấp độ cảm xúc kích hoạt hành động. |
| 3 | `bot_behavior` | text | Có | — | Hành vi của bot (xoa dịu, xin lỗi, đề xuất đền bù). |
| 4 | `notify_admin` | boolean | Có | Có mặc định | Cờ bật thông báo khẩn cho quản trị viên. |
| 5 | `suggested_canned_id` | uuid | Không | — | Mã câu trả lời mẫu gợi ý cho nhân viên. |
| 6 | `instructions` | text | Không | — | Hướng dẫn xử lý nghiệp vụ cho nhân viên CSKH. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `chatbot_sentiment_action_bot_behavior_check` | CHECK ((length(btrim(bot_behavior)) > 0)) |
| Kiểm tra | `chatbot_sentiment_action_tier_level_check` | CHECK ((tier_level >= 0)) |
| Khóa ngoại | `chatbot_sentiment_action_suggested_canned_id_fkey` | FOREIGN KEY (suggested_canned_id) REFERENCES chatbot_canned_response(id) DEFERRABLE |
| Khóa ngoại | `chatbot_sentiment_action_tier_level_fkey` | FOREIGN KEY (tier_level) REFERENCES chatbot_sentiment_tier(level) DEFERRABLE |
| Khóa chính | `chatbot_sentiment_action_pkey` | PRIMARY KEY (id) |

### 27. chatbot_sentiment_tier

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `level` | integer | Có | — | Cấp độ cảm xúc (mã số hoặc định danh tầng). |
| 2 | `name` | text | Có | — | Tên hiển thị của tầng cảm xúc. |
| 3 | `color_badge` | text | Có | — | Mã màu hiển thị thẻ nhãn cảm xúc. |
| 4 | `sla_seconds` | integer | Có | — | Thời hạn cam kết phản hồi tối đa tính bằng giây. |
| 5 | `description` | text | Không | — | Mô tả tiêu chuẩn và dấu hiệu nhận biết cấp độ. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `chatbot_sentiment_tier_color_badge_check` | CHECK ((length(btrim(color_badge)) > 0)) |
| Kiểm tra | `chatbot_sentiment_tier_level_check` | CHECK ((level >= 0)) |
| Kiểm tra | `chatbot_sentiment_tier_name_check` | CHECK ((length(btrim(name)) > 0)) |
| Kiểm tra | `chatbot_sentiment_tier_sla_seconds_check` | CHECK ((sla_seconds >= 0)) |
| Khóa chính | `chatbot_sentiment_tier_pkey` | PRIMARY KEY (level) |

### 28. chatbot_sentiment_trigger

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh quy tắc kích hoạt. |
| 2 | `tier_level` | integer | Có | — | Cấp độ cảm xúc tương ứng khi kích hoạt. |
| 3 | `trigger_pattern` | text | Có | — | Mẫu từ khóa hoặc cụm từ nhận diện. |
| 4 | `weight` | numeric(10,4) | Có | — | Trọng số đánh giá mức độ ảnh hưởng. |
| 5 | `context_domain` | text | Có | — | Ngữ cảnh áp dụng (giá cả, chất lượng, giao hàng, thái độ). |
| 6 | `is_active` | boolean | Có | Có mặc định | Trạng thái kích hoạt sử dụng quy tắc. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `chatbot_sentiment_trigger_context_domain_check` | CHECK ((length(btrim(context_domain)) > 0)) |
| Kiểm tra | `chatbot_sentiment_trigger_tier_level_check` | CHECK ((tier_level >= 0)) |
| Kiểm tra | `chatbot_sentiment_trigger_trigger_pattern_check` | CHECK ((length(btrim(trigger_pattern)) > 0)) |
| Kiểm tra | `chatbot_sentiment_trigger_weight_check` | CHECK ((weight >= (0)::numeric)) |
| Khóa ngoại | `chatbot_sentiment_trigger_tier_level_fkey` | FOREIGN KEY (tier_level) REFERENCES chatbot_sentiment_tier(level) DEFERRABLE |
| Khóa chính | `chatbot_sentiment_trigger_pkey` | PRIMARY KEY (id) |

### 29. chatbot_system_prompt

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh cấu hình Prompt. |
| 2 | `prompt_key` | text | Có | — | Mã khóa định danh prompt trong hệ thống. |
| 3 | `channel` | text | Có | — | Kênh ứng dụng áp dụng prompt. |
| 4 | `persona_name` | text | Có | — | Tên nhân cách của trợ lý ảo (Pawpal Assistant). |
| 5 | `tone_of_voice` | text | Có | — | Tông giọng giao tiếp (thân thiện, chuyên nghiệp, ân cần). |
| 6 | `content` | text | Có | — | Toàn văn nội dung Prompt hệ thống. |
| 7 | `is_active` | boolean | Có | Có mặc định | Trạng thái hiệu lực của prompt. |
| 8 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 9 | `updated_at` | timestamp with time zone | Có | Có mặc định | Thời điểm cập nhật gần nhất. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `chatbot_system_prompt_channel_check` | CHECK ((length(btrim(channel)) > 0)) |
| Kiểm tra | `chatbot_system_prompt_persona_name_check` | CHECK ((length(btrim(persona_name)) > 0)) |
| Kiểm tra | `chatbot_system_prompt_prompt_key_check` | CHECK ((length(btrim(prompt_key)) > 0)) |
| Kiểm tra | `chatbot_system_prompt_tone_of_voice_check` | CHECK ((length(btrim(tone_of_voice)) > 0)) |
| Khóa chính | `chatbot_system_prompt_pkey` | PRIMARY KEY (id) |
| Duy nhất | `chatbot_system_prompt_prompt_key_key` | UNIQUE (prompt_key) |

### 30. customer

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh khách hàng. |
| 2 | `auth_user_id` | uuid | Không | — | Tài khoản đăng nhập liên kết duy nhất; NULL nếu khách chưa đăng ký. |
| 3 | `customer_code` | text | Có | — | Mã khách hàng dùng tra cứu và hiển thị, duy nhất. |
| 4 | `customer_status` | text | Có | Có mặc định | Trạng thái hồ sơ nghiệp vụ, độc lập trạng thái tài khoản đăng nhập. |
| 5 | `registered_at` | timestamp with time zone | Có | Có mặc định | Thời điểm khách được ghi nhận vào hệ thống. |
| 6 | `note` | text | Không | — | Ghi chú nội bộ về khách hàng. |
| 7 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 8 | `updated_at` | timestamp with time zone | Có | Có mặc định | Thời điểm cập nhật gần nhất. |
| 9 | `contact_email` | text | Không | — | Email nhận liên hệ của khách; có thể NULL và không tự thay đổi email đăng nhập. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `customer_customer_code_check` | CHECK ((length(btrim(customer_code)) > 0)) |
| Kiểm tra | `customer_customer_status_check` | CHECK ((length(btrim(customer_status)) > 0)) |
| Khóa ngoại | `customer_auth_user_id_fkey` | FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) DEFERRABLE |
| Khóa chính | `customer_pkey` | PRIMARY KEY (id) |
| Duy nhất | `customer_auth_user_id_key` | UNIQUE (auth_user_id) |
| Duy nhất | `customer_customer_code_key` | UNIQUE (customer_code) |

### 31. customer_address

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh địa chỉ |
| 2 | `customer_id` | uuid | Có | — | Khách hàng sở hữu địa chỉ |
| 3 | `receiver_name` | text | Có | — | Tên người nhận tại địa chỉ |
| 4 | `receiver_phone` | text | Có | — | Số điện thoại người nhận |
| 5 | `province` | text | Có | — | Tỉnh hoặc thành phố của địa chỉ |
| 6 | `street_address` | text | Có | — | Địa chỉ chi tiết |
| 7 | `postal_code` | text | Không | — | Mã bưu chính |
| 8 | `is_default` | boolean | Có | Có mặc định | Cho biết đây có phải địa chỉ mặc định hay không |
| 9 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 10 | `updated_at` | timestamp with time zone | Có | Có mặc định | Thời điểm cập nhật gần nhất. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `customer_address_province_check` | CHECK ((length(btrim(province)) > 0)) |
| Kiểm tra | `customer_address_receiver_name_check` | CHECK ((length(btrim(receiver_name)) > 0)) |
| Kiểm tra | `customer_address_receiver_phone_check` | CHECK ((length(btrim(receiver_phone)) > 0)) |
| Kiểm tra | `customer_address_street_address_check` | CHECK ((length(btrim(street_address)) > 0)) |
| Khóa ngoại | `customer_address_customer_id_fkey` | FOREIGN KEY (customer_id) REFERENCES customer(id) DEFERRABLE |
| Khóa chính | `customer_address_pkey` | PRIMARY KEY (id) |
| t | `v1_contact_default` | TRIGGER DEFERRABLE INITIALLY DEFERRED |

### 32. customer_membership

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `customer_id` | uuid | Có | — | Khách được gán hạng; đồng thời là khóa chính và khóa ngoại. |
| 2 | `membership_tier_id` | uuid | Có | — | Hạng hiện tại được gán theo chính sách xét hạng. |
| 3 | `assigned_at` | timestamp with time zone | Có | Có mặc định | Thời điểm hạng hiện tại bắt đầu được áp dụng. |
| 4 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 5 | `updated_at` | timestamp with time zone | Có | Có mặc định | Thời điểm cập nhật gần nhất. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Khóa ngoại | `customer_membership_customer_id_fkey` | FOREIGN KEY (customer_id) REFERENCES customer(id) DEFERRABLE |
| Khóa ngoại | `customer_membership_membership_tier_id_fkey` | FOREIGN KEY (membership_tier_id) REFERENCES membership_tier(id) DEFERRABLE |
| Khóa chính | `customer_membership_pkey` | PRIMARY KEY (customer_id) |

### 33. customer_phone

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã số liên hệ. |
| 2 | `customer_id` | uuid | Có | — | Khách hàng sở hữu số liên hệ. |
| 3 | `phone_number` | text | Có | — | Số điện thoại đã chuẩn hóa; không trùng trong cùng khách. |
| 4 | `is_primary` | boolean | Có | Có mặc định | Đánh dấu số chính; số chính không được dùng cho nhiều khách. |
| 5 | `verified_at` | timestamp with time zone | Không | — | Thời điểm xác minh số điện thoại thành công; NULL khi chưa xác minh. |
| 6 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 7 | `updated_at` | timestamp with time zone | Có | Có mặc định | Thời điểm cập nhật gần nhất. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `customer_phone_phone_number_check` | CHECK ((length(btrim(phone_number)) > 0)) |
| Kiểm tra | `customer_phone_phone_number_check1` | CHECK ((phone_number ~ '^\+?[0-9]{8,15}$'::text)) |
| Khóa ngoại | `customer_phone_customer_id_fkey` | FOREIGN KEY (customer_id) REFERENCES customer(id) DEFERRABLE |
| Khóa chính | `customer_phone_pkey` | PRIMARY KEY (id) |
| t | `v1_contact_default` | TRIGGER DEFERRABLE INITIALLY DEFERRED |
| Duy nhất | `customer_phone_customer_id_phone_number_key` | UNIQUE (customer_id, phone_number) |

### 34. customer_profile

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `customer_id` | uuid | Có | — | Khách sở hữu hồ sơ; đồng thời là khóa chính và khóa ngoại. |
| 2 | `full_name` | text | Có | — | Họ tên khách hàng. |
| 3 | `date_of_birth` | date | Không | — | Ngày sinh, có thể chưa cung cấp. |
| 4 | `gender` | text | Không | — | Giới tính do khách cung cấp, có thể chưa xác định. |
| 5 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 6 | `updated_at` | timestamp with time zone | Có | Có mặc định | Thời điểm cập nhật gần nhất. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `customer_profile_date_of_birth_check` | CHECK ((date_of_birth <= CURRENT_DATE)) |
| Kiểm tra | `customer_profile_full_name_check` | CHECK ((length(btrim(full_name)) > 0)) |
| Khóa ngoại | `customer_profile_customer_id_fkey` | FOREIGN KEY (customer_id) REFERENCES customer(id) DEFERRABLE |
| Khóa chính | `customer_profile_pkey` | PRIMARY KEY (customer_id) |

### 35. customer_voucher

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh bản ghi |
| 2 | `customer_id` | uuid | Có | — | Khách hàng sở hữu voucher |
| 3 | `voucher_id` | uuid | Có | — | Voucher được khách hàng nhận |
| 4 | `acquired_method` | text | Có | — | Cách khách hàng nhận voucher |
| 5 | `voucher_status` | text | Có | Có mặc định | Tình trạng sử dụng voucher |
| 6 | `acquired_at` | timestamp with time zone | Có | Có mặc định | Thời điểm khách hàng nhận voucher |
| 7 | `expired_at` | timestamp with time zone | Không | — | Thời điểm voucher hết hạn |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `customer_voucher_acquired_method_check` | CHECK ((length(btrim(acquired_method)) > 0)) |
| Kiểm tra | `customer_voucher_voucher_status_check` | CHECK ((length(btrim(voucher_status)) > 0)) |
| Khóa ngoại | `customer_voucher_customer_id_fkey` | FOREIGN KEY (customer_id) REFERENCES customer(id) DEFERRABLE |
| Khóa ngoại | `customer_voucher_voucher_id_fkey` | FOREIGN KEY (voucher_id) REFERENCES voucher(id) DEFERRABLE |
| Khóa chính | `customer_voucher_pkey` | PRIMARY KEY (id) |

### 36. delivery_option_config

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh hình thức giao hàng. |
| 2 | `name` | text | Có | — | Tên hình thức giao hàng hiển thị cho khách. |
| 3 | `description` | text | Không | — | Mô tả phạm vi hoặc điều kiện của hình thức giao hàng. |
| 4 | `fee` | numeric(18,4) | Có | Có mặc định | Phí giao hàng cơ bản của hình thức. |
| 5 | `estimated_days` | integer | Không | — | Số ngày dự kiến giao hàng. |
| 6 | `icon` | text | Không | — | Thông tin nhận diện icon của hình thức giao hàng. |
| 7 | `available` | boolean | Có | Có mặc định | Cho biết hình thức giao hàng có đang được phép chọn hay không. |
| 8 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `delivery_option_config_estimated_days_check` | CHECK ((estimated_days >= 0)) |
| Kiểm tra | `delivery_option_config_fee_check` | CHECK ((fee >= (0)::numeric)) |
| Kiểm tra | `delivery_option_config_name_check` | CHECK ((length(btrim(name)) > 0)) |
| Khóa chính | `delivery_option_config_pkey` | PRIMARY KEY (id) |

### 37. document_embeddings

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh duy nhất của vector tài liệu. |
| 2 | `content` | text | Có | — | Nội dung văn bản được chia đoạn. |
| 3 | `metadata` | jsonb | Có | Có mặc định | Thông tin ngữ cảnh và nguồn tài liệu. |
| 4 | `embedding` | vector | Có | — | Vector số học đại diện ngữ nghĩa của đoạn văn bản. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Khóa chính | `document_embeddings_pkey` | PRIMARY KEY (id) |

### 38. guest_session

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã phiên khách vãng lai. |
| 2 | `token_hash` | text | Có | — | Giá trị băm token truy cập phiên, duy nhất. |
| 3 | `expires_at` | timestamp with time zone | Có | — | Thời điểm hết hạn phiên. |
| 4 | `revoked_at` | timestamp with time zone | Không | — | Thời điểm thu hồi phiên; có thể NULL. |
| 5 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `guest_session_check` | CHECK ((expires_at > created_at)) |
| Kiểm tra | `guest_session_token_hash_check` | CHECK ((length(btrim(token_hash)) > 0)) |
| Kiểm tra | `guest_session_token_hash_check1` | CHECK ((token_hash ~ '^[a-f0-9]{64}$'::text)) |
| Khóa chính | `guest_session_pkey` | PRIMARY KEY (id) |
| Duy nhất | `guest_session_token_hash_key` | UNIQUE (token_hash) |

### 39. hotel_booking

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh duy nhất của đơn lưu trú khách sạn. |
| 2 | `booking_code` | text | Có | — | Mã đặt phòng hiển thị cho khách hàng. |
| 3 | `room_id` | uuid | Có | — | Phòng hoặc chuồng lưu trú được chỉ định. |
| 4 | `appointment_id` | uuid | Có | — | Lịch hẹn dịch vụ liên kết với đơn lưu trú. |
| 5 | `check_in_at` | timestamp with time zone | Có | — | Thời điểm bắt đầu lưu trú có múi giờ. |
| 6 | `check_out_at` | timestamp with time zone | Có | — | Thời điểm kết thúc lưu trú dự kiến có múi giờ. |
| 7 | `status` | text | Có | Có mặc định | Trạng thái lưu trú (chờ nhận, đang ở, đã trả, đã hủy). |
| 8 | `special_diet_notes` | text | Không | — | Ghi chú chế độ dinh dưỡng đặc biệt cho bé. |
| 9 | `care_notes` | text | Không | — | Lưu ý sinh hoạt, nghỉ ngơi và chăm sóc trong thời gian lưu trú. |
| 10 | `daily_price` | numeric(18,4) | Có | — | Đơn giá lưu trú mỗi ngày đêm. |
| 11 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 12 | `updated_at` | timestamp with time zone | Có | Có mặc định | Thời điểm cập nhật gần nhất. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `hotel_booking_booking_code_check` | CHECK ((length(btrim(booking_code)) > 0)) |
| Kiểm tra | `hotel_booking_check` | CHECK ((check_out_at > check_in_at)) |
| Kiểm tra | `hotel_booking_daily_price_check` | CHECK ((daily_price >= (0)::numeric)) |
| Kiểm tra | `hotel_booking_status_check` | CHECK ((length(btrim(status)) > 0)) |
| Khóa ngoại | `hotel_booking_appointment_id_fkey` | FOREIGN KEY (appointment_id) REFERENCES appointment(id) DEFERRABLE |
| Khóa ngoại | `hotel_booking_room_id_fkey` | FOREIGN KEY (room_id) REFERENCES hotel_room(id) DEFERRABLE |
| Khóa chính | `hotel_booking_pkey` | PRIMARY KEY (id) |
| Duy nhất | `hotel_booking_appointment_id_key` | UNIQUE (appointment_id) |
| Duy nhất | `hotel_booking_booking_code_key` | UNIQUE (booking_code) |
| Loại trừ | `hotel_no_overlap` | EXCLUDE USING gist (room_id WITH =, tstzrange(check_in_at, check_out_at, '[)'::text) WITH &&) WHERE ((status <> ALL (ARRAY['cancelled'::text, 'closed'::text]))) |

### 40. hotel_room

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh phòng |
| 2 | `room_number` | text | Có | — | Số hoặc mã phòng thực tế |
| 3 | `room_type_id` | uuid | Có | — | Loại phòng của phòng thực tế |
| 4 | `status` | text | Có | Có mặc định | Trạng thái sử dụng của phòng |
| 5 | `description` | text | Không | — | Ghi chú riêng của phòng |
| 6 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 7 | `updated_at` | timestamp with time zone | Có | Có mặc định | Thời điểm cập nhật gần nhất. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `hotel_room_room_number_check` | CHECK ((length(btrim(room_number)) > 0)) |
| Kiểm tra | `hotel_room_status_check` | CHECK ((length(btrim(status)) > 0)) |
| Khóa ngoại | `hotel_room_room_type_id_fkey` | FOREIGN KEY (room_type_id) REFERENCES hotel_room_type(id) DEFERRABLE |
| Khóa chính | `hotel_room_pkey` | PRIMARY KEY (id) |
| Duy nhất | `hotel_room_room_number_key` | UNIQUE (room_number) |

### 41. hotel_room_type

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh loại phòng |
| 2 | `room_type` | text | Có | — | Tên loại phòng |
| 3 | `capacity` | integer | Có | — | Sức chứa tối đa của loại phòng |
| 4 | `daily_price` | numeric(18,4) | Có | — | Giá thuê phòng theo ngày |
| 5 | `description` | text | Không | — | Mô tả loại phòng |
| 6 | `amenities` | text | Không | — | Đoạn mô tả tiện ích của loại phòng, chỉ dùng giới thiệu và hiển thị. |
| 7 | `status` | text | Có | Có mặc định | Trạng thái cung cấp loại phòng |
| 8 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 9 | `updated_at` | timestamp with time zone | Có | Có mặc định | Thời điểm cập nhật gần nhất. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `hotel_room_type_capacity_check` | CHECK ((capacity >= 0)) |
| Kiểm tra | `hotel_room_type_capacity_check1` | CHECK ((capacity > 0)) |
| Kiểm tra | `hotel_room_type_daily_price_check` | CHECK ((daily_price >= (0)::numeric)) |
| Kiểm tra | `hotel_room_type_room_type_check` | CHECK ((length(btrim(room_type)) > 0)) |
| Kiểm tra | `hotel_room_type_status_check` | CHECK ((length(btrim(status)) > 0)) |
| Khóa chính | `hotel_room_type_pkey` | PRIMARY KEY (id) |

### 42. inventory

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh bản ghi tồn kho. |
| 2 | `product_variant_id` | uuid | Có | — | Biến thể SKU được quản lý tồn kho. |
| 3 | `quantity_in_stock` | integer | Có | Có mặc định | Số lượng thực tế đang có trong kho. |
| 4 | `minimum_stock` | integer | Có | Có mặc định | Mức tồn kho tối thiểu để phát cảnh báo sắp hết hàng. |
| 5 | `last_updated_at` | timestamp with time zone | Có | Có mặc định | Thời điểm số liệu tồn kho được cập nhật gần nhất. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `inventory_minimum_stock_check` | CHECK ((minimum_stock >= 0)) |
| Kiểm tra | `inventory_quantity_in_stock_check` | CHECK ((quantity_in_stock >= 0)) |
| Khóa ngoại | `inventory_product_variant_id_fkey` | FOREIGN KEY (product_variant_id) REFERENCES product_variant(id) DEFERRABLE |
| Khóa chính | `inventory_pkey` | PRIMARY KEY (id) |
| Duy nhất | `inventory_product_variant_id_key` | UNIQUE (product_variant_id) |

### 43. inventory_transaction

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh giao dịch kho. |
| 2 | `product_variant_id` | uuid | Có | — | Biến thể SKU phát sinh thay đổi tồn kho. |
| 3 | `transaction_type` | text | Có | — | Loại thay đổi tồn kho. |
| 4 | `quantity` | integer | Có | — | Lượng tồn thay đổi có dấu: dương khi nhập và âm khi xuất hoặc đảo nhập. |
| 5 | `note` | text | Không | — | Lý do hoặc ghi chú về giao dịch điều chỉnh kho. |
| 6 | `staff_id` | uuid | Không | — | Nhân viên thực hiện hoặc xác nhận giao dịch kho. |
| 7 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 8 | `purchase_order_detail_id` | uuid | Không | — | Dòng mua hàng là nguồn nhập hoặc đảo nhập; NULL nếu giao dịch không phải nhập mua. |
| 9 | `sales_order_detail_id` | uuid | Không | — | Dòng bán hàng là nguồn xuất hoặc đảo xuất, nếu có. |
| 10 | `return_request_detail_id` | uuid | Không | — | Dòng hàng trả là nguồn nhập lại, nếu đủ điều kiện. |
| 11 | `idempotency_key` | text | Có | — | Khóa duy nhất ngăn ghi biến động kho trùng. |
| 12 | `recorded_at` | timestamp with time zone | Có | Có mặc định | Thời điểm nghiệp vụ kho thực tế phát sinh. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `inventory_transaction_idempotency_key_check` | CHECK ((length(btrim(idempotency_key)) > 0)) |
| Kiểm tra | `inventory_transaction_quantity_check` | CHECK ((quantity <> 0)) |
| Kiểm tra | `inventory_transaction_transaction_type_check` | CHECK ((length(btrim(transaction_type)) > 0)) |
| Khóa ngoại | `inventory_transaction_product_variant_id_fkey` | FOREIGN KEY (product_variant_id) REFERENCES product_variant(id) DEFERRABLE |
| Khóa ngoại | `inventory_transaction_purchase_order_detail_id_fkey` | FOREIGN KEY (purchase_order_detail_id) REFERENCES purchase_order_detail(id) DEFERRABLE |
| Khóa ngoại | `inventory_transaction_return_request_detail_id_fkey` | FOREIGN KEY (return_request_detail_id) REFERENCES return_request_detail(id) DEFERRABLE |
| Khóa ngoại | `inventory_transaction_sales_order_detail_id_fkey` | FOREIGN KEY (sales_order_detail_id) REFERENCES sales_order_detail(id) DEFERRABLE |
| Khóa ngoại | `inventory_transaction_staff_id_fkey` | FOREIGN KEY (staff_id) REFERENCES staff(id) DEFERRABLE |
| Khóa chính | `inventory_transaction_pkey` | PRIMARY KEY (id) |
| Duy nhất | `inventory_transaction_idempotency_key_key` | UNIQUE (idempotency_key) |

### 44. membership_tier

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh hạng thành viên |
| 2 | `tier_name` | text | Có | — | Tên hạng thành viên |
| 3 | `minimum_expenditure` | numeric(18,4) | Có | Có mặc định | Mức chi tiêu tối thiểu để đạt hạng |
| 4 | `discount_percent` | numeric(18,4) | Có | Có mặc định | Tỷ lệ giảm giá của hạng |
| 5 | `description` | text | Không | — | Quyền lợi của hạng thành viên |
| 6 | `is_active` | boolean | Có | Có mặc định | Hạng thành viên có đang áp dụng hay không |
| 7 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 8 | `updated_at` | timestamp with time zone | Có | Có mặc định | Thời điểm cập nhật gần nhất. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `membership_tier_discount_percent_check` | CHECK ((discount_percent >= (0)::numeric)) |
| Kiểm tra | `membership_tier_discount_percent_check1` | CHECK ((discount_percent <= (100)::numeric)) |
| Kiểm tra | `membership_tier_minimum_expenditure_check` | CHECK ((minimum_expenditure >= (0)::numeric)) |
| Kiểm tra | `membership_tier_tier_name_check` | CHECK ((length(btrim(tier_name)) > 0)) |
| Khóa chính | `membership_tier_pkey` | PRIMARY KEY (id) |
| Duy nhất | `membership_tier_tier_name_key` | UNIQUE (tier_name) |

### 45. notification

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh duy nhất của thông báo. |
| 2 | `customer_id` | uuid | Có | — | Khách hàng nhận thông báo. |
| 3 | `notification_type` | text | Có | — | Loại sự kiện tạo ra thông báo. |
| 4 | `title` | text | Có | — | Tiêu đề ngắn hiển thị trong danh sách thông báo. |
| 5 | `content` | text | Có | — | Nội dung chi tiết giúp khách hàng hiểu sự kiện đã xảy ra. |
| 6 | `sales_order_id` | uuid | Không | — | Đơn hàng liên quan đến thông báo. |
| 7 | `appointment_id` | uuid | Không | — | Lịch hẹn liên quan đến thông báo. |
| 8 | `support_ticket_id` | uuid | Không | — | Yêu cầu hỗ trợ liên quan đến thông báo. |
| 9 | `refund_transaction_id` | uuid | Không | — | Giao dịch hoàn tiền liên quan đến thông báo. |
| 10 | `sent_at` | timestamp with time zone | Có | Có mặc định | Thời điểm thông báo được gửi/ghi nhận thành công. |
| 11 | `read_at` | timestamp with time zone | Không | — | Thời điểm khách hàng đọc thông báo. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `notification_notification_type_check` | CHECK ((length(btrim(notification_type)) > 0)) |
| Kiểm tra | `notification_title_check` | CHECK ((length(btrim(title)) > 0)) |
| Khóa ngoại | `notification_appointment_id_fkey` | FOREIGN KEY (appointment_id) REFERENCES appointment(id) DEFERRABLE |
| Khóa ngoại | `notification_customer_id_fkey` | FOREIGN KEY (customer_id) REFERENCES customer(id) DEFERRABLE |
| Khóa ngoại | `notification_refund_transaction_id_fkey` | FOREIGN KEY (refund_transaction_id) REFERENCES refund_transaction(id) DEFERRABLE |
| Khóa ngoại | `notification_sales_order_id_fkey` | FOREIGN KEY (sales_order_id) REFERENCES sales_order(id) DEFERRABLE |
| Khóa ngoại | `notification_support_ticket_id_fkey` | FOREIGN KEY (support_ticket_id) REFERENCES support_ticket(id) DEFERRABLE |
| Khóa chính | `notification_pkey` | PRIMARY KEY (id) |

### 46. paw_point_transaction

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh giao dịch điểm |
| 2 | `customer_id` | uuid | Có | — | Khách hàng phát sinh giao dịch điểm |
| 3 | `payment_id` | uuid | Không | — | Giao dịch thanh toán liên quan |
| 4 | `review_id` | uuid | Không | — | Đánh giá làm phát sinh điểm |
| 5 | `reward_rule_id` | uuid | Không | — | Quy tắc tạo giao dịch điểm |
| 6 | `points` | integer | Có | — | Số điểm cộng hoặc trừ |
| 7 | `description` | text | Không | — | Lý do phát sinh giao dịch điểm |
| 8 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 9 | `refund_transaction_id` | uuid | Không | — | Lần hoàn tiền liên quan khi cần hoàn hoặc thu hồi điểm. |
| 10 | `voucher_redemption_id` | uuid | Không | — | Lượt dùng voucher liên quan nếu làm phát sinh điểm. |
| 11 | `customer_voucher_id` | uuid | Không | — | Lượt phát hành voucher nhận bằng đổi điểm, nếu có. |
| 12 | `idempotency_key` | text | Có | — | Khóa duy nhất ngăn một nghiệp vụ cộng hoặc trừ điểm nhiều lần. |
| 13 | `sequence_no` | bigint | Có | — | Thứ tự ghi sổ tăng dần trong phạm vi từng khách. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `paw_point_transaction_idempotency_key_check` | CHECK ((length(btrim(idempotency_key)) > 0)) |
| Kiểm tra | `paw_point_transaction_sequence_no_check` | CHECK ((sequence_no >= 0)) |
| Khóa ngoại | `paw_point_transaction_customer_id_fkey` | FOREIGN KEY (customer_id) REFERENCES customer(id) DEFERRABLE |
| Khóa ngoại | `paw_point_transaction_customer_voucher_id_fkey` | FOREIGN KEY (customer_voucher_id) REFERENCES customer_voucher(id) DEFERRABLE |
| Khóa ngoại | `paw_point_transaction_payment_id_fkey` | FOREIGN KEY (payment_id) REFERENCES payment(id) DEFERRABLE |
| Khóa ngoại | `paw_point_transaction_refund_transaction_id_fkey` | FOREIGN KEY (refund_transaction_id) REFERENCES refund_transaction(id) DEFERRABLE |
| Khóa ngoại | `paw_point_transaction_review_id_fkey` | FOREIGN KEY (review_id) REFERENCES review(id) DEFERRABLE |
| Khóa ngoại | `paw_point_transaction_reward_rule_id_fkey` | FOREIGN KEY (reward_rule_id) REFERENCES reward_rule(id) DEFERRABLE |
| Khóa ngoại | `paw_point_transaction_voucher_redemption_id_fkey` | FOREIGN KEY (voucher_redemption_id) REFERENCES voucher_redemption(id) DEFERRABLE |
| Khóa chính | `paw_point_transaction_pkey` | PRIMARY KEY (id) |
| Duy nhất | `paw_point_transaction_customer_id_sequence_no_key` | UNIQUE (customer_id, sequence_no) |
| Duy nhất | `paw_point_transaction_idempotency_key_key` | UNIQUE (idempotency_key) |

### 47. pawpal_setting

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh duy nhất của cấu hình. |
| 2 | `setting_key` | text | Có | — | Mã khóa duy nhất dùng để truy xuất cấu hình trong hệ thống. |
| 3 | `setting_value` | text | Có | — | Giá trị cấu hình được lưu theo kiểu dữ liệu đã khai báo. |
| 4 | `setting_type` | text | Có | — | Kiểu dữ liệu thực tế của setting_value. |
| 5 | `description` | text | Không | — | Giải thích mục đích và phạm vi sử dụng của cấu hình. |
| 6 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 7 | `updated_at` | timestamp with time zone | Có | Có mặc định | Thời điểm cập nhật gần nhất. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `pawpal_setting_setting_key_check` | CHECK ((length(btrim(setting_key)) > 0)) |
| Kiểm tra | `pawpal_setting_setting_type_check` | CHECK ((length(btrim(setting_type)) > 0)) |
| Kiểm tra | `pawpal_setting_setting_value_check` | CHECK ((length(btrim(setting_value)) > 0)) |
| Khóa chính | `pawpal_setting_pkey` | PRIMARY KEY (id) |
| Duy nhất | `pawpal_setting_setting_key_key` | UNIQUE (setting_key) |

### 48. payment

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh giao dịch thanh toán. |
| 2 | `payment_code` | text | Có | — | Mã giao dịch thanh toán dùng để đối soát. |
| 3 | `customer_id` | uuid | Có | — | Khách hàng thực hiện thanh toán. |
| 4 | `payment_method_config_id` | uuid | Có | — | Phương thức thanh toán được sử dụng. |
| 5 | `payment_type` | text | Có | — | Loại giao dịch thanh toán. |
| 6 | `amount` | numeric(18,4) | Có | — | Số tiền thực tế của giao dịch thanh toán. |
| 7 | `transaction_status` | text | Có | Có mặc định | Trạng thái xử lý giao dịch thanh toán. |
| 8 | `succeeded_at` | timestamp with time zone | Không | — | Thời điểm khoản thanh toán được xác nhận thu thành công. |
| 9 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 10 | `updated_at` | timestamp with time zone | Có | Có mặc định | Thời điểm cập nhật gần nhất. |
| 11 | `gateway_transaction_id` | text | Không | — | Mã thu tiền bên cổng thanh toán, khi có. |
| 12 | `idempotency_key` | text | Có | — | Khóa duy nhất chống thu hoặc ghi nhận lặp một yêu cầu. |
| 13 | `order_id` | uuid | Không | — | Đơn hàng được thanh toán; NULL khi lần thu thuộc một lịch hẹn. |
| 14 | `appointment_id` | uuid | Không | — | Lịch được thanh toán; NULL khi lần thu thuộc một đơn hàng. |
| 15 | `eligible_spend_amount` | numeric(18,4) | Có | Có mặc định | Phần tiền đủ điều kiện xét hạng đã được ghi nhận, từ 0 đến amount; tiền cọc chưa đủ điều kiện có giá trị 0. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `payment_amount_check` | CHECK ((amount >= (0)::numeric)) |
| Kiểm tra | `payment_amount_check1` | CHECK ((amount > (0)::numeric)) |
| Kiểm tra | `payment_check` | CHECK ((num_nonnulls(order_id, appointment_id) = 1)) |
| Kiểm tra | `payment_check1` | CHECK ((eligible_spend_amount <= amount)) |
| Kiểm tra | `payment_check2` | CHECK (((transaction_status = 'succeeded'::text) = (succeeded_at IS NOT NULL))) |
| Kiểm tra | `payment_check3` | CHECK (((transaction_status = 'succeeded'::text) OR (eligible_spend_amount = (0)::numeric))) |
| Kiểm tra | `payment_eligible_spend_amount_check` | CHECK ((eligible_spend_amount >= (0)::numeric)) |
| Kiểm tra | `payment_idempotency_key_check` | CHECK ((length(btrim(idempotency_key)) > 0)) |
| Kiểm tra | `payment_payment_code_check` | CHECK ((length(btrim(payment_code)) > 0)) |
| Kiểm tra | `payment_payment_type_check` | CHECK ((length(btrim(payment_type)) > 0)) |
| Kiểm tra | `payment_transaction_status_check` | CHECK ((length(btrim(transaction_status)) > 0)) |
| Kiểm tra | `payment_transaction_status_check1` | CHECK ((transaction_status = ANY (ARRAY['pending'::text, 'succeeded'::text, 'failed'::text, 'cancelled'::text]))) |
| Khóa ngoại | `payment_appointment_id_fkey` | FOREIGN KEY (appointment_id) REFERENCES appointment(id) DEFERRABLE |
| Khóa ngoại | `payment_customer_id_fkey` | FOREIGN KEY (customer_id) REFERENCES customer(id) DEFERRABLE |
| Khóa ngoại | `payment_order_id_fkey` | FOREIGN KEY (order_id) REFERENCES sales_order(id) DEFERRABLE |
| Khóa ngoại | `payment_payment_method_config_id_fkey` | FOREIGN KEY (payment_method_config_id) REFERENCES payment_method_config(id) DEFERRABLE |
| Khóa chính | `payment_pkey` | PRIMARY KEY (id) |
| t | `v1_money_check` | TRIGGER DEFERRABLE INITIALLY DEFERRED |
| Duy nhất | `payment_idempotency_key_key` | UNIQUE (idempotency_key) |
| Duy nhất | `payment_payment_code_key` | UNIQUE (payment_code) |

### 49. payment_method_config

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh phương thức thanh toán. |
| 2 | `name` | text | Có | — | Tên phương thức thanh toán hiển thị cho khách. |
| 3 | `short_name` | text | Không | — | Tên viết tắt dùng trong giao diện/quản trị. |
| 4 | `description` | text | Không | — | Mô tả cách thức hoặc điều kiện sử dụng phương thức. |
| 5 | `icon` | text | Không | — | Thông tin nhận diện icon hiển thị cho phương thức thanh toán. |
| 6 | `fee` | numeric(18,4) | Có | Có mặc định | Phí cố định áp dụng cho phương thức thanh toán nếu có. |
| 7 | `available` | boolean | Có | Có mặc định | Cho biết phương thức hiện có được phép sử dụng hay không. |
| 8 | `requires_info` | boolean | Có | Có mặc định | Thông tin bổ sung cần thu thập khi khách chọn phương thức. |
| 9 | `redirect_url` | text | Không | — | URL chuyển khách sang cổng thanh toán nếu phương thức yêu cầu. |
| 10 | `bank_info` | jsonb | Không | — | Thông tin tài khoản ngân hàng dùng cho chuyển khoản. |
| 11 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `payment_method_config_fee_check` | CHECK ((fee >= (0)::numeric)) |
| Kiểm tra | `payment_method_config_name_check` | CHECK ((length(btrim(name)) > 0)) |
| Khóa chính | `payment_method_config_pkey` | PRIMARY KEY (id) |

### 50. permission

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `code` | text | Có | — | Mã quyền duy nhất, dùng làm khóa chính. |
| 2 | `description` | text | Có | — | Nội dung và phạm vi thao tác được cấp quyền. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `permission_code_check` | CHECK ((length(btrim(code)) > 0)) |
| Khóa chính | `permission_pkey` | PRIMARY KEY (code) |

### 51. pet_breed

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã giống thú cưng. |
| 2 | `species_id` | uuid | Có | — | Loài mà giống thuộc về. |
| 3 | `breed_name` | text | Có | — | Tên giống, duy nhất trong cùng loài. |
| 4 | `is_active` | boolean | Có | Có mặc định | Giống còn được dùng trong danh mục hay không. |
| 5 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 6 | `updated_at` | timestamp with time zone | Có | Có mặc định | Thời điểm cập nhật gần nhất. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `pet_breed_breed_name_check` | CHECK ((length(btrim(breed_name)) > 0)) |
| Khóa ngoại | `pet_breed_species_id_fkey` | FOREIGN KEY (species_id) REFERENCES pet_species(id) DEFERRABLE |
| Khóa chính | `pet_breed_pkey` | PRIMARY KEY (id) |
| Duy nhất | `pet_breed_species_id_breed_name_key` | UNIQUE (species_id, breed_name) |

### 52. pet_profile

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh hồ sơ thú cưng |
| 2 | `customer_id` | uuid | Có | — | Chủ sở hữu thú cưng |
| 3 | `pet_code` | text | Có | — | Mã Pet ID của thú cưng |
| 4 | `pet_name` | text | Có | — | Tên thú cưng |
| 5 | `avatar_url` | text | Không | — | Ảnh đại diện của thú cưng |
| 6 | `gender` | text | Không | — | Giới tính thú cưng |
| 7 | `date_of_birth` | date | Không | — | Ngày sinh thú cưng |
| 8 | `color` | text | Không | — | Màu lông thú cưng |
| 9 | `routine` | text | Không | — | Thói quen và sở thích của thú cưng |
| 10 | `allergy` | text | Không | — | Thông tin dị ứng cần lưu ý khi chăm sóc |
| 11 | `status` | text | Có | Có mặc định | Trạng thái hồ sơ thú cưng |
| 12 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 13 | `updated_at` | timestamp with time zone | Có | Có mặc định | Thời điểm cập nhật gần nhất. |
| 14 | `breed_id` | uuid | Có | — | Giống thuộc loài đã chọn; từ giống suy ra loài. |
| 15 | `safety_note` | text | Không | — | Ghi chú an toàn tự do khi tiếp xúc và chăm sóc thú cưng. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `pet_profile_date_of_birth_check` | CHECK ((date_of_birth <= CURRENT_DATE)) |
| Kiểm tra | `pet_profile_pet_code_check` | CHECK ((length(btrim(pet_code)) > 0)) |
| Kiểm tra | `pet_profile_pet_name_check` | CHECK ((length(btrim(pet_name)) > 0)) |
| Kiểm tra | `pet_profile_status_check` | CHECK ((length(btrim(status)) > 0)) |
| Khóa ngoại | `pet_profile_breed_id_fkey` | FOREIGN KEY (breed_id) REFERENCES pet_breed(id) DEFERRABLE |
| Khóa ngoại | `pet_profile_customer_id_fkey` | FOREIGN KEY (customer_id) REFERENCES customer(id) DEFERRABLE |
| Khóa chính | `pet_profile_pkey` | PRIMARY KEY (id) |
| Duy nhất | `pet_profile_pet_code_key` | UNIQUE (pet_code) |

### 53. pet_species

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã loài thú cưng. |
| 2 | `species_name` | text | Có | — | Tên loài, duy nhất. |
| 3 | `is_active` | boolean | Có | Có mặc định | Loài còn được sử dụng trong danh mục hay không. |
| 4 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 5 | `updated_at` | timestamp with time zone | Có | Có mặc định | Thời điểm cập nhật gần nhất. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `pet_species_species_name_check` | CHECK ((length(btrim(species_name)) > 0)) |
| Khóa chính | `pet_species_pkey` | PRIMARY KEY (id) |
| Duy nhất | `pet_species_species_name_key` | UNIQUE (species_name) |

### 54. pet_weight_history

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh duy nhất của lượt cân đo. |
| 2 | `pet_id` | uuid | Có | — | Bé cưng được cân đo. |
| 3 | `weight` | numeric(18,4) | Có | — | Trọng lượng ghi nhận (kg). |
| 4 | `measured_at` | timestamp with time zone | Có | Có mặc định | Thời điểm thực hiện cân đo. |
| 5 | `recorded_by` | uuid | Không | — | Nhân viên ghi nhận nếu đã định danh. |
| 6 | `note` | text | Không | — | Ghi chú của lần cân. |
| 7 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `pet_weight_history_measured_at_check` | CHECK ((measured_at <= now())) |
| Kiểm tra | `pet_weight_history_weight_check` | CHECK ((weight > (0)::numeric)) |
| Khóa ngoại | `pet_weight_history_pet_id_fkey` | FOREIGN KEY (pet_id) REFERENCES pet_profile(id) DEFERRABLE |
| Khóa ngoại | `pet_weight_history_recorded_by_fkey` | FOREIGN KEY (recorded_by) REFERENCES staff(id) DEFERRABLE |
| Khóa chính | `pet_weight_history_pkey` | PRIMARY KEY (id) |

### 55. product

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh sản phẩm gốc, dùng để gom các biến thể cùng một sản phẩm. |
| 2 | `category_id` | uuid | Có | — | Nhóm sản phẩm mà sản phẩm thuộc về. |
| 3 | `product_name` | text | Có | — | Tên sản phẩm hiển thị cho khách hàng. |
| 4 | `unit` | text | Có | — | Đơn vị bán cơ bản của sản phẩm. |
| 5 | `target_pet` | text | Không | — | Loài thú cưng mà sản phẩm hướng đến. |
| 6 | `description` | text | Không | — | Mô tả sản phẩm, thành phần hoặc thông tin sử dụng. |
| 7 | `slug` | text | Có | — | Đường dẫn định danh trang chi tiết sản phẩm. |
| 8 | `status` | text | Có | Có mặc định | Trạng thái kinh doanh của sản phẩm. |
| 9 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 10 | `updated_at` | timestamp with time zone | Có | Có mặc định | Thời điểm cập nhật gần nhất. |
| 11 | `origin` | text | Không | — | Xuất xứ hoặc nơi sản xuất được công bố. |
| 12 | `ingredients` | text | Không | — | Nội dung thành phần sản phẩm dạng mô tả. |
| 13 | `benefits` | text | Không | — | Đoạn văn mô tả lợi ích sản phẩm. |
| 14 | `usage_instructions` | text | Không | — | Hướng dẫn sử dụng sản phẩm. |
| 15 | `specs` | jsonb | Không | — | Thông số giới thiệu; thuộc tính biến thể phải lưu tại bảng biến thể. |
| 16 | `badge` | text | Không | — | Nhãn giới thiệu sản phẩm, không thay thế trạng thái nghiệp vụ. |
| 17 | `brand_name` | text | Không | — | Tên thương hiệu dạng text; không quản lý danh mục thương hiệu riêng. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `product_product_name_check` | CHECK ((length(btrim(product_name)) > 0)) |
| Kiểm tra | `product_slug_check` | CHECK ((length(btrim(slug)) > 0)) |
| Kiểm tra | `product_status_check` | CHECK ((length(btrim(status)) > 0)) |
| Kiểm tra | `product_unit_check` | CHECK ((length(btrim(unit)) > 0)) |
| Khóa ngoại | `product_category_id_fkey` | FOREIGN KEY (category_id) REFERENCES product_category(id) DEFERRABLE |
| Khóa chính | `product_pkey` | PRIMARY KEY (id) |
| Duy nhất | `product_slug_key` | UNIQUE (slug) |

### 56. product_category

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh danh mục sản phẩm. |
| 2 | `category_name` | text | Có | — | Tên danh mục sản phẩm hiển thị trong quản trị và website. |
| 3 | `description` | text | Không | — | Mô tả phạm vi hoặc nội dung của danh mục. |
| 4 | `status` | text | Có | Có mặc định | Trạng thái sử dụng của danh mục. |
| 5 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 6 | `updated_at` | timestamp with time zone | Có | Có mặc định | Thời điểm cập nhật gần nhất. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `product_category_category_name_check` | CHECK ((length(btrim(category_name)) > 0)) |
| Kiểm tra | `product_category_status_check` | CHECK ((length(btrim(status)) > 0)) |
| Khóa chính | `product_category_pkey` | PRIMARY KEY (id) |

### 57. product_media

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã ảnh sản phẩm. |
| 2 | `product_id` | uuid | Có | — | Sản phẩm sở hữu ảnh. |
| 3 | `image_url` | text | Có | — | Đường dẫn hoặc khóa lưu ảnh. |
| 4 | `display_order` | integer | Có | Có mặc định | Thứ tự hiển thị. |
| 5 | `is_thumbnail` | boolean | Có | Có mặc định | Đánh dấu ảnh đại diện, tối đa một ảnh mỗi sản phẩm. |
| 6 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 7 | `updated_at` | timestamp with time zone | Có | Có mặc định | Thời điểm cập nhật gần nhất. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `product_media_display_order_check` | CHECK ((display_order >= 0)) |
| Kiểm tra | `product_media_image_url_check` | CHECK ((length(btrim(image_url)) > 0)) |
| Khóa ngoại | `product_media_product_id_fkey` | FOREIGN KEY (product_id) REFERENCES product(id) DEFERRABLE |
| Khóa chính | `product_media_pkey` | PRIMARY KEY (id) |

### 58. product_variant

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh biến thể sản phẩm. |
| 2 | `product_id` | uuid | Có | — | Sản phẩm gốc chứa biến thể này. |
| 3 | `color_id` | uuid | Không | — | Màu sắc của biến thể nếu sản phẩm có phân loại màu. |
| 4 | `size_id` | uuid | Không | — | Kích thước hoặc quy cách của biến thể. |
| 5 | `flavor_id` | uuid | Không | — | Hương vị của biến thể nếu sản phẩm có phân loại hương vị. |
| 6 | `sku_variant` | text | Có | — | Mã SKU duy nhất dùng để bán hàng và quản lý tồn kho cho đúng biến thể. |
| 7 | `cost_price` | numeric(18,4) | Có | — | Giá vốn của biến thể tại thời điểm quản lý sản phẩm. |
| 8 | `sale_price` | numeric(18,4) | Có | — | Giá bán hiện tại của biến thể. |
| 9 | `compare_at_price` | numeric(18,4) | Không | — | Giá niêm yết dùng để so sánh với sale_price khi hiển thị khuyến mãi. |
| 10 | `weight` | numeric(18,4) | Không | — | Khối lượng/quy cách của biến thể phục vụ hiển thị và nghiệp vụ bán hàng. |
| 11 | `barcode` | text | Không | — | Mã vạch của biến thể dùng cho bán hàng và kiểm kho. |
| 12 | `status` | text | Có | Có mặc định | Trạng thái kinh doanh của biến thể. |
| 13 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 14 | `updated_at` | timestamp with time zone | Có | Có mặc định | Thời điểm cập nhật gần nhất. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `product_variant_compare_at_price_check` | CHECK ((compare_at_price >= (0)::numeric)) |
| Kiểm tra | `product_variant_cost_price_check` | CHECK ((cost_price >= (0)::numeric)) |
| Kiểm tra | `product_variant_sale_price_check` | CHECK ((sale_price >= (0)::numeric)) |
| Kiểm tra | `product_variant_sku_variant_check` | CHECK ((length(btrim(sku_variant)) > 0)) |
| Kiểm tra | `product_variant_status_check` | CHECK ((length(btrim(status)) > 0)) |
| Kiểm tra | `product_variant_weight_check` | CHECK ((weight >= (0)::numeric)) |
| Khóa ngoại | `product_variant_color_id_fkey` | FOREIGN KEY (color_id) REFERENCES variant_color(id) DEFERRABLE |
| Khóa ngoại | `product_variant_flavor_id_fkey` | FOREIGN KEY (flavor_id) REFERENCES variant_flavor(id) DEFERRABLE |
| Khóa ngoại | `product_variant_product_id_fkey` | FOREIGN KEY (product_id) REFERENCES product(id) DEFERRABLE |
| Khóa ngoại | `product_variant_size_id_fkey` | FOREIGN KEY (size_id) REFERENCES variant_size(id) DEFERRABLE |
| Khóa chính | `product_variant_pkey` | PRIMARY KEY (id) |
| Duy nhất | `product_variant_barcode_key` | UNIQUE (barcode) |
| Duy nhất | `product_variant_product_id_color_id_size_id_flavor_id_key` | UNIQUE NULLS NOT DISTINCT (product_id, color_id, size_id, flavor_id) |
| Duy nhất | `product_variant_sku_variant_key` | UNIQUE (sku_variant) |

### 59. product_variant_media

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh bản ghi hình ảnh biến thể. |
| 2 | `product_variant_id` | uuid | Có | — | Biến thể sản phẩm sở hữu hình ảnh này. |
| 3 | `image_url` | text | Có | — | Đường dẫn đến file hình ảnh biến thể được lưu trữ. |
| 4 | `display_order` | integer | Có | Có mặc định | Thứ tự hình ảnh khi hiển thị trên trang sản phẩm. |
| 5 | `is_thumbnail` | boolean | Có | Có mặc định | Xác định hình ảnh đại diện của biến thể. |
| 6 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 7 | `updated_at` | timestamp with time zone | Có | Có mặc định | Thời điểm cập nhật gần nhất. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `product_variant_media_display_order_check` | CHECK ((display_order >= 0)) |
| Kiểm tra | `product_variant_media_image_url_check` | CHECK ((length(btrim(image_url)) > 0)) |
| Khóa ngoại | `product_variant_media_product_variant_id_fkey` | FOREIGN KEY (product_variant_id) REFERENCES product_variant(id) DEFERRABLE |
| Khóa chính | `product_variant_media_pkey` | PRIMARY KEY (id) |

### 60. promotion

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh duy nhất của chương trình. |
| 2 | `promotion_name` | text | Có | — | Tên chương trình khuyến mãi hiển thị trên hệ thống. |
| 3 | `description` | text | Không | — | Mô tả nội dung và điều kiện của chương trình. |
| 4 | `discount_type` | text | Có | — | Cách tính mức giảm giá của chương trình. |
| 5 | `discount_value` | numeric(18,4) | Có | — | Mức giảm theo phần trăm hoặc số tiền cố định. |
| 6 | `start_date` | date | Có | — | Ngày bắt đầu chương trình khuyến mãi. |
| 7 | `end_date` | date | Có | — | Ngày kết thúc chương trình khuyến mãi. |
| 8 | `minimum_order_value` | numeric(18,4) | Có | Có mặc định | Giá trị đơn hàng tối thiểu để được hưởng khuyến mãi. |
| 9 | `status` | text | Có | Có mặc định | Trạng thái vận hành của chương trình. |
| 10 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 11 | `updated_at` | timestamp with time zone | Có | Có mặc định | Thời điểm cập nhật gần nhất. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `promotion_check` | CHECK ((end_date >= start_date)) |
| Kiểm tra | `promotion_check1` | CHECK (((discount_type <> 'percent'::text) OR (discount_value <= (100)::numeric))) |
| Kiểm tra | `promotion_discount_type_check` | CHECK ((length(btrim(discount_type)) > 0)) |
| Kiểm tra | `promotion_discount_value_check` | CHECK ((discount_value >= (0)::numeric)) |
| Kiểm tra | `promotion_minimum_order_value_check` | CHECK ((minimum_order_value >= (0)::numeric)) |
| Kiểm tra | `promotion_promotion_name_check` | CHECK ((length(btrim(promotion_name)) > 0)) |
| Kiểm tra | `promotion_status_check` | CHECK ((length(btrim(status)) > 0)) |
| Khóa chính | `promotion_pkey` | PRIMARY KEY (id) |

### 61. promotion_product

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh bản ghi áp dụng khuyến mãi cho sản phẩm. |
| 2 | `promotion_id` | uuid | Có | — | Chương trình khuyến mãi được áp dụng. |
| 3 | `product_variant_id` | uuid | Có | — | Biến thể sản phẩm cụ thể được hưởng khuyến mãi. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Khóa ngoại | `promotion_product_product_variant_id_fkey` | FOREIGN KEY (product_variant_id) REFERENCES product_variant(id) DEFERRABLE |
| Khóa ngoại | `promotion_product_promotion_id_fkey` | FOREIGN KEY (promotion_id) REFERENCES promotion(id) DEFERRABLE |
| Khóa chính | `promotion_product_pkey` | PRIMARY KEY (id) |
| Duy nhất | `promotion_product_promotion_id_product_variant_id_key` | UNIQUE (promotion_id, product_variant_id) |

### 62. promotion_service

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh bản ghi áp dụng khuyến mãi cho dịch vụ. |
| 2 | `promotion_id` | uuid | Có | — | Chương trình khuyến mãi được áp dụng. |
| 3 | `service_id` | uuid | Có | — | Dịch vụ được hưởng khuyến mãi. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Khóa ngoại | `promotion_service_promotion_id_fkey` | FOREIGN KEY (promotion_id) REFERENCES promotion(id) DEFERRABLE |
| Khóa ngoại | `promotion_service_service_id_fkey` | FOREIGN KEY (service_id) REFERENCES service(id) DEFERRABLE |
| Khóa chính | `promotion_service_pkey` | PRIMARY KEY (id) |
| Duy nhất | `promotion_service_promotion_id_service_id_key` | UNIQUE (promotion_id, service_id) |

### 63. purchase_order

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh phiếu nhập hàng. |
| 2 | `supplier_id` | uuid | Có | — | Nhà cung cấp thực hiện giao lô hàng này. |
| 3 | `order_number` | text | Có | — | Mã phiếu nhập dùng để tra cứu và đối soát. |
| 4 | `order_date` | date | Có | — | Ngày PawPal tạo hoặc ghi nhận phiếu nhập. |
| 5 | `expected_date` | date | Không | — | Ngày dự kiến nhận hàng từ nhà cung cấp. |
| 6 | `order_status` | text | Có | Có mặc định | Trạng thái xử lý phiếu nhập. |
| 7 | `note` | text | Không | — | Ghi chú thêm về phiếu nhập hoặc lô hàng. |
| 8 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 9 | `updated_at` | timestamp with time zone | Có | Có mặc định | Thời điểm cập nhật gần nhất. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `purchase_order_order_number_check` | CHECK ((length(btrim(order_number)) > 0)) |
| Kiểm tra | `purchase_order_order_status_check` | CHECK ((length(btrim(order_status)) > 0)) |
| Khóa ngoại | `purchase_order_supplier_id_fkey` | FOREIGN KEY (supplier_id) REFERENCES supplier(id) DEFERRABLE |
| Khóa chính | `purchase_order_pkey` | PRIMARY KEY (id) |
| Duy nhất | `purchase_order_order_number_key` | UNIQUE (order_number) |

### 64. purchase_order_detail

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh dòng chi tiết phiếu nhập. |
| 2 | `purchase_order_id` | uuid | Có | — | Phiếu nhập chứa sản phẩm này. |
| 3 | `product_variant_id` | uuid | Có | — | Biến thể sản phẩm thực tế được nhập vào kho. |
| 4 | `quantity` | integer | Có | — | Số lượng sản phẩm được đặt nhập theo phiếu. |
| 5 | `unit_price` | numeric(18,4) | Có | — | Giá nhập trên mỗi đơn vị sản phẩm. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `purchase_order_detail_quantity_check` | CHECK ((quantity > 0)) |
| Kiểm tra | `purchase_order_detail_unit_price_check` | CHECK ((unit_price >= (0)::numeric)) |
| Khóa ngoại | `purchase_order_detail_product_variant_id_fkey` | FOREIGN KEY (product_variant_id) REFERENCES product_variant(id) DEFERRABLE |
| Khóa ngoại | `purchase_order_detail_purchase_order_id_fkey` | FOREIGN KEY (purchase_order_id) REFERENCES purchase_order(id) DEFERRABLE |
| Khóa chính | `purchase_order_detail_pkey` | PRIMARY KEY (id) |

### 65. refund_transaction

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh giao dịch hoàn tiền/bồi thường. |
| 2 | `refund_code` | text | Có | — | Mã giao dịch hoàn tiền dùng để tra cứu và đối soát. |
| 3 | `ticket_id` | uuid | Không | — | Ticket làm cơ sở phát sinh giao dịch hoàn/bồi thường. |
| 4 | `payment_id` | uuid | Có | — | Giao dịch thanh toán ban đầu liên quan đến khoản hoàn tiền. |
| 5 | `refund_type` | text | Có | — | Loại hoàn tiền hoặc bồi thường. |
| 6 | `requested_amount` | numeric(18,4) | Có | — | Số tiền khách yêu cầu hoàn/bồi thường. |
| 7 | `approved_amount` | numeric(18,4) | Có | — | Số tiền được PawPal phê duyệt. |
| 8 | `refunded_amount` | numeric(18,4) | Có | — | Số tiền thực tế đã hoàn/bồi thường thành công. |
| 9 | `refund_method` | text | Có | — | Phương thức hoàn tiền/bồi thường. |
| 10 | `refund_status` | text | Có | Có mặc định | Trạng thái xử lý giao dịch hoàn tiền. |
| 11 | `gateway_transaction_id` | text | Không | — | Mã giao dịch từ cổng thanh toán liên quan đến hoàn tiền. |
| 12 | `note` | text | Không | — | Ghi chú bổ sung về giao dịch hoàn tiền/bồi thường. |
| 13 | `processed_by` | uuid | Không | — | Nhân viên thực hiện giao dịch hoàn tiền/bồi thường. |
| 14 | `processed_at` | timestamp with time zone | Không | — | Thời điểm nhân viên/hệ thống bắt đầu xử lý hoàn tiền. |
| 15 | `completed_at` | timestamp with time zone | Không | — | Thời điểm giao dịch hoàn tiền hoàn tất thành công. |
| 16 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 17 | `updated_at` | timestamp with time zone | Có | Có mặc định | Thời điểm cập nhật gần nhất. |
| 18 | `return_request_id` | uuid | Không | — | Yêu cầu trả hàng liên quan; có thể NULL khi hoàn không thuộc yêu cầu trả hàng. |
| 19 | `eligible_refund_amount` | numeric(18,4) | Có | Có mặc định | Phần hoàn làm giảm chi tiêu xét hạng; không vượt số tiền thực hoàn và phần đủ điều kiện còn lại của lần thu gốc. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `refund_transaction_approved_amount_check` | CHECK ((approved_amount >= (0)::numeric)) |
| Kiểm tra | `refund_transaction_check` | CHECK ((eligible_refund_amount <= refunded_amount)) |
| Kiểm tra | `refund_transaction_check1` | CHECK ((refunded_amount <= approved_amount)) |
| Kiểm tra | `refund_transaction_check2` | CHECK ((approved_amount <= requested_amount)) |
| Kiểm tra | `refund_transaction_check3` | CHECK (((refund_status = 'succeeded'::text) = (completed_at IS NOT NULL))) |
| Kiểm tra | `refund_transaction_check4` | CHECK (((refund_status = 'succeeded'::text) OR (eligible_refund_amount = (0)::numeric))) |
| Kiểm tra | `refund_transaction_eligible_refund_amount_check` | CHECK ((eligible_refund_amount >= (0)::numeric)) |
| Kiểm tra | `refund_transaction_refund_code_check` | CHECK ((length(btrim(refund_code)) > 0)) |
| Kiểm tra | `refund_transaction_refund_method_check` | CHECK ((length(btrim(refund_method)) > 0)) |
| Kiểm tra | `refund_transaction_refund_status_check` | CHECK ((length(btrim(refund_status)) > 0)) |
| Kiểm tra | `refund_transaction_refund_status_check1` | CHECK ((refund_status = ANY (ARRAY['pending'::text, 'approved'::text, 'succeeded'::text, 'failed'::text, 'cancelled'::text]))) |
| Kiểm tra | `refund_transaction_refund_type_check` | CHECK ((length(btrim(refund_type)) > 0)) |
| Kiểm tra | `refund_transaction_refunded_amount_check` | CHECK ((refunded_amount >= (0)::numeric)) |
| Kiểm tra | `refund_transaction_requested_amount_check` | CHECK ((requested_amount >= (0)::numeric)) |
| Khóa ngoại | `refund_transaction_payment_id_fkey` | FOREIGN KEY (payment_id) REFERENCES payment(id) DEFERRABLE |
| Khóa ngoại | `refund_transaction_processed_by_fkey` | FOREIGN KEY (processed_by) REFERENCES staff(id) DEFERRABLE |
| Khóa ngoại | `refund_transaction_return_request_id_fkey` | FOREIGN KEY (return_request_id) REFERENCES return_request(id) DEFERRABLE |
| Khóa ngoại | `refund_transaction_ticket_id_fkey` | FOREIGN KEY (ticket_id) REFERENCES support_ticket(id) DEFERRABLE |
| Khóa chính | `refund_transaction_pkey` | PRIMARY KEY (id) |
| t | `v1_money_check` | TRIGGER DEFERRABLE INITIALLY DEFERRED |
| Duy nhất | `refund_transaction_refund_code_key` | UNIQUE (refund_code) |

### 66. return_request

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh yêu cầu đổi trả. |
| 2 | `sales_order_id` | uuid | Có | — | Đơn hàng phát sinh yêu cầu đổi trả. |
| 3 | `resolution_type` | text | Không | — | Kết quả xử lý cuối cùng của yêu cầu đổi trả. |
| 4 | `resolved_by` | uuid | Không | — | Nhân viên/Admin chốt kết quả yêu cầu đổi trả. |
| 5 | `reason` | text | Có | — | Lý do khách hàng yêu cầu đổi/trả. |
| 6 | `return_type` | text | Có | — | Loại yêu cầu đổi/trả của khách hàng. |
| 7 | `description` | text | Không | — | Thông tin chi tiết bổ sung về tình trạng hoặc yêu cầu đổi trả. |
| 8 | `request_status` | text | Có | Có mặc định | Trạng thái xử lý yêu cầu đổi trả. |
| 9 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 10 | `updated_at` | timestamp with time zone | Có | Có mặc định | Thời điểm cập nhật gần nhất. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `return_request_reason_check` | CHECK ((length(btrim(reason)) > 0)) |
| Kiểm tra | `return_request_request_status_check` | CHECK ((length(btrim(request_status)) > 0)) |
| Kiểm tra | `return_request_return_type_check` | CHECK ((length(btrim(return_type)) > 0)) |
| Khóa ngoại | `return_request_resolved_by_fkey` | FOREIGN KEY (resolved_by) REFERENCES staff(id) DEFERRABLE |
| Khóa ngoại | `return_request_sales_order_id_fkey` | FOREIGN KEY (sales_order_id) REFERENCES sales_order(id) DEFERRABLE |
| Khóa chính | `return_request_pkey` | PRIMARY KEY (id) |

### 67. return_request_detail

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh dòng chi tiết đổi trả. |
| 2 | `return_request_id` | uuid | Có | — | Yêu cầu đổi trả chứa sản phẩm này. |
| 3 | `quantity` | integer | Có | — | Số lượng SKU được yêu cầu đổi/trả. |
| 4 | `sales_order_detail_id` | uuid | Có | — | Dòng hàng đã mua được yêu cầu trả, từ đó suy ra biến thể và giá gốc. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `return_request_detail_quantity_check` | CHECK ((quantity > 0)) |
| Khóa ngoại | `return_request_detail_return_request_id_fkey` | FOREIGN KEY (return_request_id) REFERENCES return_request(id) DEFERRABLE |
| Khóa ngoại | `return_request_detail_sales_order_detail_id_fkey` | FOREIGN KEY (sales_order_detail_id) REFERENCES sales_order_detail(id) DEFERRABLE |
| Khóa chính | `return_request_detail_pkey` | PRIMARY KEY (id) |

### 68. return_request_evidence

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã ảnh bằng chứng. |
| 2 | `return_request_id` | uuid | Có | — | Yêu cầu trả hàng sở hữu ảnh. |
| 3 | `image_url` | text | Có | — | Đường dẫn hoặc khóa lưu ảnh. |
| 4 | `display_order` | integer | Có | Có mặc định | Thứ tự ảnh. |
| 5 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `return_request_evidence_display_order_check` | CHECK ((display_order >= 0)) |
| Kiểm tra | `return_request_evidence_image_url_check` | CHECK ((length(btrim(image_url)) > 0)) |
| Khóa ngoại | `return_request_evidence_return_request_id_fkey` | FOREIGN KEY (return_request_id) REFERENCES return_request(id) DEFERRABLE |
| Khóa chính | `return_request_evidence_pkey` | PRIMARY KEY (id) |

### 69. review

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh đánh giá. |
| 2 | `rating` | integer | Có | — | Số sao khách hàng chấm cho sản phẩm/dịch vụ. |
| 3 | `review_content` | text | Không | — | Nội dung nhận xét của khách hàng. |
| 4 | `review_status` | text | Có | Có mặc định | Trạng thái kiểm duyệt và hiển thị đánh giá. |
| 5 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 6 | `updated_at` | timestamp with time zone | Có | Có mặc định | Thời điểm cập nhật gần nhất. |
| 7 | `sales_order_detail_id` | uuid | Không | — | Dòng mua được đánh giá; NULL nếu đánh giá dòng dịch vụ. |
| 8 | `appointment_item_id` | uuid | Không | — | Dòng dịch vụ được đánh giá; NULL nếu đánh giá dòng mua. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `review_check` | CHECK ((num_nonnulls(sales_order_detail_id, appointment_item_id) = 1)) |
| Kiểm tra | `review_rating_check` | CHECK ((rating >= 0)) |
| Kiểm tra | `review_rating_check1` | CHECK (((rating >= 1) AND (rating <= 5))) |
| Kiểm tra | `review_review_status_check` | CHECK ((length(btrim(review_status)) > 0)) |
| Khóa ngoại | `review_appointment_item_id_fkey` | FOREIGN KEY (appointment_item_id) REFERENCES appointment_item(id) DEFERRABLE |
| Khóa ngoại | `review_sales_order_detail_id_fkey` | FOREIGN KEY (sales_order_detail_id) REFERENCES sales_order_detail(id) DEFERRABLE |
| Khóa chính | `review_pkey` | PRIMARY KEY (id) |

### 70. review_media

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã ảnh đánh giá. |
| 2 | `review_id` | uuid | Có | — | Đánh giá sở hữu ảnh. |
| 3 | `image_url` | text | Có | — | Đường dẫn hoặc khóa lưu ảnh. |
| 4 | `display_order` | integer | Có | Có mặc định | Thứ tự ảnh trong đánh giá. |
| 5 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `review_media_display_order_check` | CHECK ((display_order >= 0)) |
| Kiểm tra | `review_media_image_url_check` | CHECK ((length(btrim(image_url)) > 0)) |
| Khóa ngoại | `review_media_review_id_fkey` | FOREIGN KEY (review_id) REFERENCES review(id) DEFERRABLE |
| Khóa chính | `review_media_pkey` | PRIMARY KEY (id) |

### 71. review_response

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh phản hồi đánh giá. |
| 2 | `review_id` | uuid | Có | — | Đánh giá được Admin phản hồi. |
| 3 | `staff_id` | uuid | Có | — | Nhân viên/Admin thực hiện phản hồi. |
| 4 | `response_content` | text | Có | — | Nội dung phản hồi của Admin đối với khách hàng. |
| 5 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 6 | `updated_at` | timestamp with time zone | Có | Có mặc định | Thời điểm cập nhật gần nhất. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Khóa ngoại | `review_response_review_id_fkey` | FOREIGN KEY (review_id) REFERENCES review(id) DEFERRABLE |
| Khóa ngoại | `review_response_staff_id_fkey` | FOREIGN KEY (staff_id) REFERENCES staff(id) DEFERRABLE |
| Khóa chính | `review_response_pkey` | PRIMARY KEY (id) |

### 72. reward_rule

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh quy tắc |
| 2 | `rule_name` | text | Có | — | Tên quy tắc thưởng |
| 3 | `reward_type` | text | Có | — | Loại phần thưởng |
| 4 | `trigger_event` | text | Có | — | Sự kiện làm phát sinh phần thưởng |
| 5 | `reward_value` | numeric(18,4) | Có | — | Giá trị phần thưởng |
| 6 | `description` | text | Có | — | Mô tả cách áp dụng quy tắc |
| 7 | `is_active` | boolean | Có | Có mặc định | Quy tắc có đang áp dụng hay không |
| 8 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 9 | `updated_at` | timestamp with time zone | Có | Có mặc định | Thời điểm cập nhật gần nhất. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `reward_rule_reward_type_check` | CHECK ((length(btrim(reward_type)) > 0)) |
| Kiểm tra | `reward_rule_reward_value_check` | CHECK ((reward_value >= (0)::numeric)) |
| Kiểm tra | `reward_rule_rule_name_check` | CHECK ((length(btrim(rule_name)) > 0)) |
| Kiểm tra | `reward_rule_trigger_event_check` | CHECK ((length(btrim(trigger_event)) > 0)) |
| Khóa chính | `reward_rule_pkey` | PRIMARY KEY (id) |

### 73. role_permission

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `role_code` | text | Có | — | Vai trò được gán quyền; cùng permission_code tạo khóa chính. |
| 2 | `permission_code` | text | Có | — | Quyền thuộc vai trò; cùng role_code tạo khóa chính. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `role_permission_permission_code_check` | CHECK ((length(btrim(permission_code)) > 0)) |
| Kiểm tra | `role_permission_role_code_check` | CHECK ((length(btrim(role_code)) > 0)) |
| Khóa ngoại | `role_permission_permission_code_fkey` | FOREIGN KEY (permission_code) REFERENCES permission(code) DEFERRABLE |
| Khóa ngoại | `role_permission_role_code_fkey` | FOREIGN KEY (role_code) REFERENCES access_role(code) DEFERRABLE |
| Khóa chính | `role_permission_pkey` | PRIMARY KEY (role_code, permission_code) |

### 74. sales_order

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh đơn hàng. |
| 2 | `order_code` | text | Có | — | Mã đơn hàng hiển thị cho khách và Admin. |
| 3 | `customer_id` | uuid | Có | — | Khách hàng sở hữu đơn hàng. |
| 4 | `order_status` | text | Có | Có mặc định | Trạng thái xử lý đơn hàng. |
| 5 | `note` | text | Không | — | Ghi chú khách hàng gửi khi đặt đơn. |
| 6 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 7 | `updated_at` | timestamp with time zone | Có | Có mặc định | Thời điểm cập nhật gần nhất. |
| 8 | `shipping_fee_snapshot` | numeric(18,4) | Có | Có mặc định | Phí giao hàng được chốt khi đặt, không đổi theo cấu hình sau này. |
| 9 | `receiver_name_snapshot` | text | Không | — | Tên người nhận được chốt khi đặt đơn; không đổi theo sổ địa chỉ. |
| 10 | `receiver_phone_snapshot` | text | Không | — | Số điện thoại người nhận được chốt khi đặt đơn. |
| 11 | `province_snapshot` | text | Không | — | Tỉnh hoặc thành phố nhận hàng tại thời điểm đặt. |
| 12 | `street_address_snapshot` | text | Không | — | Địa chỉ giao hàng chi tiết tại thời điểm đặt. |
| 13 | `postal_code_snapshot` | text | Không | — | Mã bưu chính tại thời điểm đặt, nếu có. |
| 14 | `delivery_option_id` | uuid | Không | — | Hình thức giao hoặc nhận hàng được chọn cho đơn. |
| 15 | `shipping_provider_id` | uuid | Không | — | Đơn vị vận chuyển; có thể NULL khi khách nhận tại cửa hàng. |
| 16 | `tracking_code` | text | Không | — | Mã vận đơn của đơn hàng, khi có. |
| 17 | `shipped_at` | timestamp with time zone | Không | — | Thời điểm bàn giao đơn cho đơn vị vận chuyển. |
| 18 | `delivered_at` | timestamp with time zone | Không | — | Thời điểm giao hoặc nhận hàng thành công. |
| 19 | `shipping_status` | text | Không | — | Trạng thái giao nhận của đơn, độc lập trạng thái xử lý đơn. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `sales_order_order_code_check` | CHECK ((length(btrim(order_code)) > 0)) |
| Kiểm tra | `sales_order_order_status_check` | CHECK ((length(btrim(order_status)) > 0)) |
| Kiểm tra | `sales_order_shipping_fee_snapshot_check` | CHECK ((shipping_fee_snapshot >= (0)::numeric)) |
| Khóa ngoại | `sales_order_customer_id_fkey` | FOREIGN KEY (customer_id) REFERENCES customer(id) DEFERRABLE |
| Khóa ngoại | `sales_order_delivery_option_id_fkey` | FOREIGN KEY (delivery_option_id) REFERENCES delivery_option_config(id) DEFERRABLE |
| Khóa ngoại | `sales_order_shipping_provider_id_fkey` | FOREIGN KEY (shipping_provider_id) REFERENCES shipping_provider(id) DEFERRABLE |
| Khóa chính | `sales_order_pkey` | PRIMARY KEY (id) |
| t | `v1_money_check` | TRIGGER DEFERRABLE INITIALLY DEFERRED |
| Duy nhất | `sales_order_order_code_key` | UNIQUE (order_code) |

### 75. sales_order_detail

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh dòng chi tiết đơn hàng. |
| 2 | `order_id` | uuid | Có | — | Đơn hàng chứa dòng sản phẩm này. |
| 3 | `product_variant_id` | uuid | Có | — | Biến thể SKU thực tế khách mua. |
| 4 | `quantity` | integer | Có | — | Số lượng SKU được mua trong dòng đơn. |
| 5 | `unit_price` | numeric(18,4) | Có | — | Đơn giá SKU tại thời điểm chốt đơn. |
| 6 | `discount_amount` | numeric(18,4) | Có | Có mặc định | Số tiền giảm trực tiếp trên dòng sản phẩm. |
| 7 | `product_name_snapshot` | text | Có | — | Tên hàng tại thời điểm bán. |
| 8 | `sku_snapshot` | text | Có | — | SKU tại thời điểm bán, không đổi theo danh mục sau này. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `sales_order_detail_check` | CHECK ((discount_amount <= ((quantity)::numeric * unit_price))) |
| Kiểm tra | `sales_order_detail_discount_amount_check` | CHECK ((discount_amount >= (0)::numeric)) |
| Kiểm tra | `sales_order_detail_product_name_snapshot_check` | CHECK ((length(btrim(product_name_snapshot)) > 0)) |
| Kiểm tra | `sales_order_detail_quantity_check` | CHECK ((quantity > 0)) |
| Kiểm tra | `sales_order_detail_sku_snapshot_check` | CHECK ((length(btrim(sku_snapshot)) > 0)) |
| Kiểm tra | `sales_order_detail_unit_price_check` | CHECK ((unit_price >= (0)::numeric)) |
| Khóa ngoại | `sales_order_detail_order_id_fkey` | FOREIGN KEY (order_id) REFERENCES sales_order(id) DEFERRABLE |
| Khóa ngoại | `sales_order_detail_product_variant_id_fkey` | FOREIGN KEY (product_variant_id) REFERENCES product_variant(id) DEFERRABLE |
| Khóa chính | `sales_order_detail_pkey` | PRIMARY KEY (id) |
| t | `v1_money_check` | TRIGGER DEFERRABLE INITIALLY DEFERRED |

### 76. service

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh dịch vụ |
| 2 | `service_code` | text | Có | — | Mã dịch vụ |
| 3 | `service_name` | text | Có | — | Tên dịch vụ |
| 4 | `description` | text | Không | — | Mô tả dịch vụ |
| 5 | `estimated_duration` | integer | Có | — | Thời gian thực hiện dự kiến, tính bằng phút |
| 6 | `status` | text | Có | Có mặc định | Trạng thái cung cấp dịch vụ |
| 7 | `commission_rate` | numeric(18,4) | Không | Có mặc định | Tỷ lệ hoa hồng cấu hình cho dịch vụ; mức áp dụng lịch sử cần chốt theo ca. |
| 8 | `benefits` | text | Không | — | Lợi ích của dịch vụ |
| 9 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 10 | `updated_at` | timestamp with time zone | Có | Có mặc định | Thời điểm cập nhật gần nhất. |
| 11 | `category_id` | uuid | Có | — | Nhóm dịch vụ mà gói thuộc về. |
| 12 | `staff_level_required_id` | uuid | Không | — | Cấp độ chuyên môn tối thiểu cần để thực hiện gói, nếu có. |
| 13 | `amenities` | text | Không | — | Đoạn mô tả tiện ích đi kèm dịch vụ; có thể để trống và không tham chiếu danh mục riêng. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `service_commission_rate_check` | CHECK ((commission_rate >= (0)::numeric)) |
| Kiểm tra | `service_commission_rate_check1` | CHECK ((commission_rate <= (100)::numeric)) |
| Kiểm tra | `service_estimated_duration_check` | CHECK ((estimated_duration >= 0)) |
| Kiểm tra | `service_estimated_duration_check1` | CHECK ((estimated_duration > 0)) |
| Kiểm tra | `service_service_code_check` | CHECK ((length(btrim(service_code)) > 0)) |
| Kiểm tra | `service_service_name_check` | CHECK ((length(btrim(service_name)) > 0)) |
| Kiểm tra | `service_status_check` | CHECK ((length(btrim(status)) > 0)) |
| Khóa ngoại | `service_category_id_fkey` | FOREIGN KEY (category_id) REFERENCES service_category(id) DEFERRABLE |
| Khóa ngoại | `service_staff_level_required_id_fkey` | FOREIGN KEY (staff_level_required_id) REFERENCES staff_level(id) DEFERRABLE |
| Khóa chính | `service_pkey` | PRIMARY KEY (id) |
| Duy nhất | `service_service_code_key` | UNIQUE (service_code) |

### 77. service_addon

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh dịch vụ bổ sung |
| 2 | `service_id` | uuid | Có | — | Dịch vụ chính áp dụng addon |
| 3 | `addon_name` | text | Có | — | Tên dịch vụ bổ sung |
| 4 | `description` | text | Không | — | Mô tả dịch vụ bổ sung |
| 5 | `price` | numeric(18,4) | Có | — | Giá dịch vụ bổ sung |
| 6 | `estimated_duration` | integer | Có | — | Thời gian thực hiện dự kiến, tính bằng phút |
| 7 | `is_required` | boolean | Có | Có mặc định | Cho biết addon có bắt buộc hay không |
| 8 | `status` | text | Có | Có mặc định | Trạng thái cung cấp addon |
| 9 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 10 | `updated_at` | timestamp with time zone | Có | Có mặc định | Thời điểm cập nhật gần nhất. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `service_addon_addon_name_check` | CHECK ((length(btrim(addon_name)) > 0)) |
| Kiểm tra | `service_addon_estimated_duration_check` | CHECK ((estimated_duration >= 0)) |
| Kiểm tra | `service_addon_price_check` | CHECK ((price >= (0)::numeric)) |
| Kiểm tra | `service_addon_status_check` | CHECK ((length(btrim(status)) > 0)) |
| Khóa ngoại | `service_addon_service_id_fkey` | FOREIGN KEY (service_id) REFERENCES service(id) DEFERRABLE |
| Khóa chính | `service_addon_pkey` | PRIMARY KEY (id) |

### 78. service_care_action

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `service_id` | uuid | Có | — | Dịch vụ có bước chăm sóc; cùng care_action_id tạo khóa chính. |
| 2 | `care_action_id` | uuid | Có | — | Loại thao tác trong checklist; cùng service_id tạo khóa chính. |
| 3 | `display_order` | integer | Có | Có mặc định | Thứ tự thực hiện thao tác trong dịch vụ. |
| 4 | `estimated_duration` | integer | Có | — | Thời lượng dự kiến của bước, tính bằng phút. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `service_care_action_display_order_check` | CHECK ((display_order >= 0)) |
| Kiểm tra | `service_care_action_estimated_duration_check` | CHECK ((estimated_duration >= 0)) |
| Khóa ngoại | `service_care_action_care_action_id_fkey` | FOREIGN KEY (care_action_id) REFERENCES care_action(id) DEFERRABLE |
| Khóa ngoại | `service_care_action_service_id_fkey` | FOREIGN KEY (service_id) REFERENCES service(id) DEFERRABLE |
| Khóa chính | `service_care_action_pkey` | PRIMARY KEY (service_id, care_action_id) |

### 79. service_category

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã nhóm dịch vụ. |
| 2 | `category_code` | text | Có | — | Mã nhóm nghiệp vụ, duy nhất. |
| 3 | `category_name` | text | Có | — | Tên nhóm dịch vụ. |
| 4 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 5 | `updated_at` | timestamp with time zone | Có | Có mặc định | Thời điểm cập nhật gần nhất. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `service_category_category_code_check` | CHECK ((length(btrim(category_code)) > 0)) |
| Kiểm tra | `service_category_category_name_check` | CHECK ((length(btrim(category_name)) > 0)) |
| Khóa chính | `service_category_pkey` | PRIMARY KEY (id) |
| Duy nhất | `service_category_category_code_key` | UNIQUE (category_code) |

### 80. service_image

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã ảnh dịch vụ. |
| 2 | `service_id` | uuid | Có | — | Dịch vụ sở hữu ảnh. |
| 3 | `image_url` | text | Có | — | Đường dẫn hoặc khóa lưu ảnh. |
| 4 | `display_order` | integer | Có | Có mặc định | Thứ tự hiển thị ảnh. |
| 5 | `is_thumbnail` | boolean | Có | Có mặc định | Đánh dấu ảnh đại diện, tối đa một ảnh cho mỗi dịch vụ. |
| 6 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 7 | `updated_at` | timestamp with time zone | Có | Có mặc định | Thời điểm cập nhật gần nhất. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `service_image_display_order_check` | CHECK ((display_order >= 0)) |
| Kiểm tra | `service_image_image_url_check` | CHECK ((length(btrim(image_url)) > 0)) |
| Khóa ngoại | `service_image_service_id_fkey` | FOREIGN KEY (service_id) REFERENCES service(id) DEFERRABLE |
| Khóa chính | `service_image_pkey` | PRIMARY KEY (id) |

### 81. service_price_matrix

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh bảng giá |
| 2 | `service_id` | uuid | Có | — | Dịch vụ áp dụng bảng giá |
| 3 | `weight_from` | numeric(18,4) | Có | — | Mức cân nặng tối thiểu của khoảng giá |
| 4 | `weight_to` | numeric(18,4) | Không | — | Mức cân nặng tối đa của khoảng giá |
| 5 | `unit_price` | numeric(18,4) | Có | — | Giá dịch vụ theo khoảng điều kiện |
| 6 | `effective_from` | timestamp with time zone | Có | — | Thời điểm bắt đầu áp dụng giá |
| 7 | `effective_to` | timestamp with time zone | Không | — | Thời điểm kết thúc áp dụng giá |
| 8 | `status` | text | Có | Có mặc định | Trạng thái bảng giá |
| 9 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 10 | `updated_at` | timestamp with time zone | Có | Có mặc định | Thời điểm cập nhật gần nhất. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `service_price_matrix_check` | CHECK (((weight_to IS NULL) OR (weight_to > weight_from))) |
| Kiểm tra | `service_price_matrix_check1` | CHECK (((effective_to IS NULL) OR (effective_to > effective_from))) |
| Kiểm tra | `service_price_matrix_status_check` | CHECK ((length(btrim(status)) > 0)) |
| Kiểm tra | `service_price_matrix_unit_price_check` | CHECK ((unit_price >= (0)::numeric)) |
| Kiểm tra | `service_price_matrix_weight_from_check` | CHECK ((weight_from >= (0)::numeric)) |
| Kiểm tra | `service_price_matrix_weight_to_check` | CHECK ((weight_to >= (0)::numeric)) |
| Khóa ngoại | `service_price_matrix_service_id_fkey` | FOREIGN KEY (service_id) REFERENCES service(id) DEFERRABLE |
| Khóa chính | `service_price_matrix_pkey` | PRIMARY KEY (id) |
| Loại trừ | `service_price_no_overlap` | EXCLUDE USING gist (service_id WITH =, numrange(weight_from, weight_to, '[)'::text) WITH &&, tstzrange(effective_from, effective_to, '[)'::text) WITH &&) WHERE ((status = 'active'::text)) |

### 82. service_supported_species

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `service_id` | uuid | Có | — | Dịch vụ hỗ trợ loài; cùng species_id tạo khóa chính. |
| 2 | `species_id` | uuid | Có | — | Loài được phục vụ; cùng service_id tạo khóa chính. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Khóa ngoại | `service_supported_species_service_id_fkey` | FOREIGN KEY (service_id) REFERENCES service(id) DEFERRABLE |
| Khóa ngoại | `service_supported_species_species_id_fkey` | FOREIGN KEY (species_id) REFERENCES pet_species(id) DEFERRABLE |
| Khóa chính | `service_supported_species_pkey` | PRIMARY KEY (service_id, species_id) |

### 83. shipping_provider

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh đơn vị vận chuyển. |
| 2 | `provider_name` | text | Có | — | Tên đơn vị vận chuyển mà PawPal hợp tác. |
| 3 | `provider_code` | text | Có | — | Mã định danh ngắn của đơn vị vận chuyển trong hệ thống. |
| 4 | `logo_url` | text | Không | — | Đường dẫn logo của đơn vị vận chuyển. |
| 5 | `contact_phone` | text | Không | — | Số điện thoại liên hệ của đơn vị vận chuyển. |
| 6 | `tracking_url` | text | Không | — | Mẫu URL dùng để tra cứu vận đơn. |
| 7 | `status` | text | Có | Có mặc định | Trạng thái hợp tác/sử dụng đơn vị vận chuyển. |
| 8 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 9 | `updated_at` | timestamp with time zone | Có | Có mặc định | Thời điểm cập nhật gần nhất. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `shipping_provider_provider_code_check` | CHECK ((length(btrim(provider_code)) > 0)) |
| Kiểm tra | `shipping_provider_provider_name_check` | CHECK ((length(btrim(provider_name)) > 0)) |
| Kiểm tra | `shipping_provider_status_check` | CHECK ((length(btrim(status)) > 0)) |
| Khóa chính | `shipping_provider_pkey` | PRIMARY KEY (id) |

### 84. staff

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh nhân viên. |
| 2 | `full_name` | text | Có | — | Họ tên nhân viên hiển thị trong hệ thống quản trị. |
| 3 | `phone_number` | text | Không | — | Số điện thoại liên hệ của nhân viên. |
| 4 | `job_title` | text | Có | — | Chức danh công việc, không phải vai trò cấp quyền truy cập. |
| 5 | `specialization` | text | Không | — | Chuyên môn hoặc lĩnh vực phụ trách của nhân viên. |
| 6 | `hire_date` | date | Không | — | Ngày nhân viên bắt đầu làm việc tại PawPal. |
| 7 | `email` | text | Không | — | Email liên hệ công việc, không tự thay email đăng nhập. |
| 8 | `address` | text | Không | — | Địa chỉ liên hệ nhân viên. |
| 9 | `dob` | date | Không | — | Ngày sinh nhân viên. |
| 10 | `service_locked` | boolean | Có | Có mặc định | Cờ tạm ngừng phân công dịch vụ; độc lập quyền đăng nhập. |
| 11 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 12 | `updated_at` | timestamp with time zone | Có | Có mặc định | Thời điểm cập nhật gần nhất. |
| 13 | `auth_user_id` | uuid | Có | — | Tài khoản công vụ liên kết duy nhất của nhân viên. |
| 14 | `staff_level_id` | uuid | Không | — | Cấp độ chuyên môn hiện được công nhận. |
| 15 | `employment_status` | text | Có | Có mặc định | Trạng thái việc làm như đang làm, nghỉ phép dài hạn hoặc nghỉ việc. |
| 16 | `must_change_password` | boolean | Có | Có mặc định | Yêu cầu nhân viên đổi mật khẩu sau cấp hoặc reset; phải được kiểm tra phía máy chủ. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `staff_employment_status_check` | CHECK ((length(btrim(employment_status)) > 0)) |
| Kiểm tra | `staff_full_name_check` | CHECK ((length(btrim(full_name)) > 0)) |
| Kiểm tra | `staff_job_title_check` | CHECK ((length(btrim(job_title)) > 0)) |
| Khóa ngoại | `staff_auth_user_id_fkey` | FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) DEFERRABLE |
| Khóa ngoại | `staff_staff_level_id_fkey` | FOREIGN KEY (staff_level_id) REFERENCES staff_level(id) DEFERRABLE |
| Khóa chính | `staff_pkey` | PRIMARY KEY (id) |
| Duy nhất | `staff_auth_user_id_key` | UNIQUE (auth_user_id) |

### 85. staff_assessment

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã lần đánh giá. |
| 2 | `staff_id` | uuid | Có | — | Nhân viên được đánh giá. |
| 3 | `assessment_date` | date | Có | — | Ngày thực hiện đánh giá. |
| 4 | `assessment_type` | text | Có | — | Loại nội dung được đánh giá. |
| 5 | `score` | numeric(5,2) | Có | — | Điểm đánh giá theo thang 0–100. |
| 6 | `result` | text | Có | — | Kết quả đạt, không đạt hoặc cần đào tạo lại. |
| 7 | `note` | text | Không | — | Nhận xét và căn cứ đánh giá. |
| 8 | `assessed_by` | uuid | Có | — | Nhân viên có thẩm quyền thực hiện đánh giá. |
| 9 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 10 | `updated_at` | timestamp with time zone | Có | Có mặc định | Thời điểm cập nhật gần nhất. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `staff_assessment_assessment_type_check` | CHECK ((length(btrim(assessment_type)) > 0)) |
| Kiểm tra | `staff_assessment_result_check` | CHECK ((length(btrim(result)) > 0)) |
| Kiểm tra | `staff_assessment_score_check` | CHECK (((score >= (0)::numeric) AND (score <= (100)::numeric))) |
| Khóa ngoại | `staff_assessment_assessed_by_fkey` | FOREIGN KEY (assessed_by) REFERENCES staff(id) DEFERRABLE |
| Khóa ngoại | `staff_assessment_staff_id_fkey` | FOREIGN KEY (staff_id) REFERENCES staff(id) DEFERRABLE |
| Khóa chính | `staff_assessment_pkey` | PRIMARY KEY (id) |

### 86. staff_level

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã cấp độ chuyên môn. |
| 2 | `level_code` | text | Có | — | Mã cấp độ, duy nhất. |
| 3 | `level_name` | text | Có | — | Tên cấp độ hiển thị. |
| 4 | `rank_order` | integer | Có | — | Thứ tự cấp độ dùng đối chiếu yêu cầu dịch vụ. |
| 5 | `is_active` | boolean | Có | Có mặc định | Cấp độ còn được áp dụng hay không. |
| 6 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 7 | `updated_at` | timestamp with time zone | Có | Có mặc định | Thời điểm cập nhật gần nhất. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `staff_level_level_code_check` | CHECK ((length(btrim(level_code)) > 0)) |
| Kiểm tra | `staff_level_level_name_check` | CHECK ((length(btrim(level_name)) > 0)) |
| Kiểm tra | `staff_level_rank_order_check` | CHECK ((rank_order >= 0)) |
| Khóa chính | `staff_level_pkey` | PRIMARY KEY (id) |
| Duy nhất | `staff_level_level_code_key` | UNIQUE (level_code) |

### 87. staff_permission

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `staff_id` | uuid | Có | — | Nhân viên nhận quyền; cùng permission_code tạo khóa chính. |
| 2 | `permission_code` | text | Có | — | Quyền được cấp thêm; cùng staff_id tạo khóa chính. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `staff_permission_permission_code_check` | CHECK ((length(btrim(permission_code)) > 0)) |
| Khóa ngoại | `staff_permission_permission_code_fkey` | FOREIGN KEY (permission_code) REFERENCES permission(code) DEFERRABLE |
| Khóa ngoại | `staff_permission_staff_id_fkey` | FOREIGN KEY (staff_id) REFERENCES staff(id) DEFERRABLE |
| Khóa chính | `staff_permission_pkey` | PRIMARY KEY (staff_id, permission_code) |

### 88. staff_role

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `staff_id` | uuid | Có | — | Nhân viên được gán vai trò; cùng role_code tạo khóa chính. |
| 2 | `role_code` | text | Có | — | Vai trò truy cập được gán; cùng staff_id tạo khóa chính. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `staff_role_role_code_check` | CHECK ((length(btrim(role_code)) > 0)) |
| Khóa ngoại | `staff_role_role_code_fkey` | FOREIGN KEY (role_code) REFERENCES access_role(code) DEFERRABLE |
| Khóa ngoại | `staff_role_staff_id_fkey` | FOREIGN KEY (staff_id) REFERENCES staff(id) DEFERRABLE |
| Khóa chính | `staff_role_pkey` | PRIMARY KEY (staff_id, role_code) |

### 89. staff_schedule

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh lịch làm việc. |
| 2 | `staff_id` | uuid | Có | — | Nhân viên được xếp lịch. |
| 3 | `availability_status` | text | Có | Có mặc định | Trạng thái đi làm hoặc khả dụng của nhân viên trong ca. |
| 4 | `reason` | text | Không | — | Lý do nghỉ/vắng hoặc không được xếp ca. |
| 5 | `schedule_status` | text | Có | Có mặc định | Trạng thái phân ca và hiệu lực ca làm. |
| 6 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 7 | `updated_at` | timestamp with time zone | Có | Có mặc định | Thời điểm cập nhật gần nhất. |
| 8 | `start_at` | timestamp with time zone | Có | — | Thời điểm bắt đầu ca có múi giờ. |
| 9 | `end_at` | timestamp with time zone | Có | — | Thời điểm kết thúc ca có múi giờ. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `staff_schedule_availability_status_check` | CHECK ((length(btrim(availability_status)) > 0)) |
| Kiểm tra | `staff_schedule_check` | CHECK ((end_at > start_at)) |
| Kiểm tra | `staff_schedule_schedule_status_check` | CHECK ((length(btrim(schedule_status)) > 0)) |
| Khóa ngoại | `staff_schedule_staff_id_fkey` | FOREIGN KEY (staff_id) REFERENCES staff(id) DEFERRABLE |
| Khóa chính | `staff_schedule_pkey` | PRIMARY KEY (id) |
| Loại trừ | `staff_no_overlap` | EXCLUDE USING gist (staff_id WITH =, tstzrange(start_at, end_at, '[)'::text) WITH &&) WHERE ((schedule_status = 'active'::text)) |

### 90. staff_shift_request

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh duy nhất của yêu cầu đổi ca/nghỉ phép. |
| 2 | `request_type` | text | Có | — | Loại yêu cầu (xin nghỉ, đổi ca, tăng ca). |
| 3 | `staff_id` | uuid | Có | — | Nhân viên gửi yêu cầu. |
| 4 | `target_staff_id` | uuid | Không | — | Nhân viên liên quan trong yêu cầu đổi ca. |
| 5 | `replacement_staff_id` | uuid | Không | — | Nhân viên nhận ca làm thay thế. |
| 6 | `leave_type` | text | Không | — | Loại nghỉ phép (nghỉ ốm, nghỉ phép năm, việc riêng). |
| 7 | `start_date` | date | Có | — | Ngày bắt đầu nghỉ hoặc đổi ca. |
| 8 | `end_date` | date | Có | — | Ngày kết thúc nghỉ. |
| 9 | `shift` | text | Có | — | V1: UUID ca staff_schedule đã chọn; thời gian và phiên bản được lưu trong nhật ký tạo đơn. |
| 10 | `target_date` | date | Không | — | Ngày chuyển đến trong ca làm việc mới. |
| 11 | `target_shift` | text | Không | — | V1: UUID ca staff_schedule đối ứng trong đơn đổi ca. |
| 12 | `reason` | text | Có | — | Lý do gửi yêu cầu của nhân viên. |
| 13 | `status` | text | Có | Có mặc định | Trạng thái phê duyệt (chờ duyệt, đã duyệt, từ chối). |
| 14 | `created_by` | uuid | Có | — | Người khởi tạo yêu cầu. |
| 15 | `reviewed_by` | uuid | Không | — | Quản lý thực hiện xét duyệt yêu cầu. |
| 16 | `reviewed_at` | timestamp with time zone | Không | — | Thời điểm xét duyệt yêu cầu. |
| 17 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `staff_shift_request_check` | CHECK ((end_date >= start_date)) |
| Kiểm tra | `staff_shift_request_reason_check` | CHECK ((length(btrim(reason)) > 0)) |
| Kiểm tra | `staff_shift_request_request_type_check` | CHECK ((length(btrim(request_type)) > 0)) |
| Kiểm tra | `staff_shift_request_shift_check` | CHECK ((length(btrim(shift)) > 0)) |
| Kiểm tra | `staff_shift_request_status_check` | CHECK ((length(btrim(status)) > 0)) |
| Khóa ngoại | `staff_shift_request_created_by_fkey` | FOREIGN KEY (created_by) REFERENCES auth.users(id) DEFERRABLE |
| Khóa ngoại | `staff_shift_request_replacement_staff_id_fkey` | FOREIGN KEY (replacement_staff_id) REFERENCES staff(id) DEFERRABLE |
| Khóa ngoại | `staff_shift_request_reviewed_by_fkey` | FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) DEFERRABLE |
| Khóa ngoại | `staff_shift_request_staff_id_fkey` | FOREIGN KEY (staff_id) REFERENCES staff(id) DEFERRABLE |
| Khóa ngoại | `staff_shift_request_target_staff_id_fkey` | FOREIGN KEY (target_staff_id) REFERENCES staff(id) DEFERRABLE |
| Khóa chính | `staff_shift_request_pkey` | PRIMARY KEY (id) |

### 91. stock_reservation

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh lượt giữ hàng. |
| 2 | `product_variant_id` | uuid | Có | — | Biến thể SKU đang được giữ tồn kho. |
| 3 | `cart_id` | uuid | Không | — | Giỏ hàng tạo ra lượt giữ tồn kho. |
| 4 | `quantity` | integer | Có | — | Số lượng SKU được giữ tạm. |
| 5 | `reserved_at` | timestamp with time zone | Có | Có mặc định | Thời điểm hệ thống bắt đầu giữ hàng. |
| 6 | `expires_at` | timestamp with time zone | Có | — | Thời điểm reservation hết hiệu lực nếu khách không hoàn tất giao dịch. |
| 7 | `status` | text | Có | Có mặc định | Trạng thái của lượt giữ hàng. |
| 8 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 9 | `updated_at` | timestamp with time zone | Có | Có mặc định | Thời điểm cập nhật gần nhất. |
| 10 | `order_id` | uuid | Không | — | Đơn hàng sở hữu lượt giữ sau khi chuyển từ giỏ; NULL khi còn giữ cho giỏ. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `stock_reservation_check` | CHECK ((num_nonnulls(cart_id, order_id) = 1)) |
| Kiểm tra | `stock_reservation_check1` | CHECK ((expires_at > reserved_at)) |
| Kiểm tra | `stock_reservation_quantity_check` | CHECK ((quantity > 0)) |
| Kiểm tra | `stock_reservation_status_check` | CHECK ((length(btrim(status)) > 0)) |
| Khóa ngoại | `stock_reservation_cart_id_fkey` | FOREIGN KEY (cart_id) REFERENCES cart(id) DEFERRABLE |
| Khóa ngoại | `stock_reservation_order_id_fkey` | FOREIGN KEY (order_id) REFERENCES sales_order(id) DEFERRABLE |
| Khóa ngoại | `stock_reservation_product_variant_id_fkey` | FOREIGN KEY (product_variant_id) REFERENCES product_variant(id) DEFERRABLE |
| Khóa chính | `stock_reservation_pkey` | PRIMARY KEY (id) |

### 92. supplier

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh nhà cung cấp trong PawPal. |
| 2 | `supplier_name` | text | Có | — | Tên nhà cung cấp sản phẩm mà PawPal hợp tác. |
| 3 | `contact_person` | text | Không | — | Người phụ trách liên hệ phía nhà cung cấp. |
| 4 | `phone_number` | text | Không | — | Số điện thoại liên hệ chính với nhà cung cấp. |
| 5 | `email` | text | Không | — | Email dùng để liên hệ hoặc nhận chứng từ từ nhà cung cấp. |
| 6 | `address` | text | Không | — | Địa chỉ giao dịch hoặc nhận hàng của nhà cung cấp. |
| 7 | `status` | text | Có | Có mặc định | Trạng thái hợp tác hiện tại với nhà cung cấp. |
| 8 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 9 | `updated_at` | timestamp with time zone | Có | Có mặc định | Thời điểm cập nhật gần nhất. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `supplier_status_check` | CHECK ((length(btrim(status)) > 0)) |
| Kiểm tra | `supplier_supplier_name_check` | CHECK ((length(btrim(supplier_name)) > 0)) |
| Khóa chính | `supplier_pkey` | PRIMARY KEY (id) |

### 93. support_ticket

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh yêu cầu hỗ trợ. |
| 2 | `ticket_code` | text | Có | — | Mã yêu cầu hỗ trợ/khiếu nại dùng để khách hàng và Admin tra cứu. |
| 3 | `customer_id` | uuid | Không | — | Khách hàng tạo yêu cầu hỗ trợ. |
| 4 | `order_id` | uuid | Không | — | Đơn hàng liên quan đến yêu cầu nếu có. |
| 5 | `appointment_id` | uuid | Không | — | Lịch hẹn liên quan đến yêu cầu nếu có. |
| 6 | `channel` | text | Có | — | Kênh khách hàng sử dụng để gửi yêu cầu. |
| 7 | `category` | text | Có | — | Loại vấn đề hoặc yêu cầu cần xử lý. |
| 8 | `subject` | text | Có | — | Tiêu đề ngắn giúp Admin nhận diện nội dung ticket. |
| 9 | `description` | text | Không | — | Nội dung ban đầu khách hàng cung cấp về vấn đề cần hỗ trợ. |
| 10 | `priority` | text | Có | — | Mức độ ưu tiên xử lý ticket. |
| 11 | `type` | text | Có | — | Loại yêu cầu nghiệp vụ như khiếu nại, hỗ trợ hoặc yêu cầu khác. |
| 12 | `status` | text | Có | Có mặc định | Trạng thái xử lý hiện tại của ticket. |
| 13 | `requested_resolution` | text | Không | — | Phương án xử lý mà khách hàng đề nghị. |
| 14 | `requested_amount` | numeric(18,4) | Không | — | Số tiền khách hàng đề nghị hoàn/bồi thường nếu có. |
| 15 | `assigned_staff_id` | uuid | Không | — | Nhân viên đang được phân công xử lý ticket. |
| 16 | `first_response_at` | timestamp with time zone | Không | — | Thời điểm PawPal gửi phản hồi đầu tiên cho khách hàng. |
| 17 | `investigation_note` | text | Không | — | Ghi chú nội bộ về quá trình xác minh vụ việc và bằng chứng. |
| 18 | `resolution_type` | text | Không | — | Kết quả xử lý cuối cùng của ticket. |
| 19 | `resolution_note` | text | Không | — | Ghi chú giải thích phương án xử lý cuối cùng. |
| 20 | `approved_amount` | numeric(18,4) | Không | — | Số tiền được PawPal phê duyệt hoàn/bồi thường. |
| 21 | `resolved_by` | uuid | Không | — | Nhân viên thực hiện hoặc phê duyệt kết quả xử lý. |
| 22 | `resolved_at` | timestamp with time zone | Không | — | Thời điểm ticket được xác định là đã giải quyết. |
| 23 | `closed_at` | timestamp with time zone | Không | — | Thời điểm ticket chính thức đóng. |
| 24 | `rating` | integer | Không | — | Điểm khách hàng đánh giá chất lượng xử lý ticket. |
| 25 | `rating_comment` | text | Không | — | Nhận xét của khách hàng về quá trình hỗ trợ. |
| 26 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 27 | `updated_at` | timestamp with time zone | Có | Có mặc định | Thời điểm cập nhật gần nhất. |
| 28 | `created_by_account_id` | uuid | Không | — | Tài khoản lập ticket, khác khách liên quan nếu nhân viên lập hộ. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `support_ticket_approved_amount_check` | CHECK ((approved_amount >= (0)::numeric)) |
| Kiểm tra | `support_ticket_category_check` | CHECK ((length(btrim(category)) > 0)) |
| Kiểm tra | `support_ticket_channel_check` | CHECK ((length(btrim(channel)) > 0)) |
| Kiểm tra | `support_ticket_priority_check` | CHECK ((length(btrim(priority)) > 0)) |
| Kiểm tra | `support_ticket_rating_check` | CHECK ((rating >= 0)) |
| Kiểm tra | `support_ticket_rating_check1` | CHECK (((rating >= 1) AND (rating <= 5))) |
| Kiểm tra | `support_ticket_requested_amount_check` | CHECK ((requested_amount >= (0)::numeric)) |
| Kiểm tra | `support_ticket_status_check` | CHECK ((length(btrim(status)) > 0)) |
| Kiểm tra | `support_ticket_subject_check` | CHECK ((length(btrim(subject)) > 0)) |
| Kiểm tra | `support_ticket_ticket_code_check` | CHECK ((length(btrim(ticket_code)) > 0)) |
| Kiểm tra | `support_ticket_type_check` | CHECK ((length(btrim(type)) > 0)) |
| Khóa ngoại | `support_ticket_appointment_id_fkey` | FOREIGN KEY (appointment_id) REFERENCES appointment(id) DEFERRABLE |
| Khóa ngoại | `support_ticket_assigned_staff_id_fkey` | FOREIGN KEY (assigned_staff_id) REFERENCES staff(id) DEFERRABLE |
| Khóa ngoại | `support_ticket_created_by_account_id_fkey` | FOREIGN KEY (created_by_account_id) REFERENCES auth.users(id) DEFERRABLE |
| Khóa ngoại | `support_ticket_customer_id_fkey` | FOREIGN KEY (customer_id) REFERENCES customer(id) DEFERRABLE |
| Khóa ngoại | `support_ticket_order_id_fkey` | FOREIGN KEY (order_id) REFERENCES sales_order(id) DEFERRABLE |
| Khóa ngoại | `support_ticket_resolved_by_fkey` | FOREIGN KEY (resolved_by) REFERENCES staff(id) DEFERRABLE |
| Khóa chính | `support_ticket_pkey` | PRIMARY KEY (id) |
| Duy nhất | `support_ticket_ticket_code_key` | UNIQUE (ticket_code) |

### 94. support_ticket_message

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh tin nhắn/ghi nhận trao đổi. |
| 2 | `ticket_id` | uuid | Có | — | Ticket chứa nội dung trao đổi này. |
| 3 | `sender_type` | text | Có | — | Loại người gửi nội dung. |
| 4 | `content` | text | Có | — | Nội dung tin nhắn, phản hồi hoặc ghi chú được lưu trong ticket. |
| 5 | `is_internal` | boolean | Có | Có mặc định | Xác định nội dung chỉ dành cho nội bộ hay được hiển thị cho khách. |
| 6 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 7 | `sender_account_id` | uuid | Không | — | Tài khoản gửi tin, NULL khi người gửi là khách vãng lai hoặc hệ thống. |
| 8 | `sender_guest_session_id` | uuid | Không | — | Phiên khách vãng lai gửi tin, NULL với người gửi khác. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `support_ticket_message_sender_type_check` | CHECK ((length(btrim(sender_type)) > 0)) |
| Khóa ngoại | `support_ticket_message_sender_account_id_fkey` | FOREIGN KEY (sender_account_id) REFERENCES auth.users(id) DEFERRABLE |
| Khóa ngoại | `support_ticket_message_sender_guest_session_id_fkey` | FOREIGN KEY (sender_guest_session_id) REFERENCES guest_session(id) DEFERRABLE |
| Khóa ngoại | `support_ticket_message_ticket_id_fkey` | FOREIGN KEY (ticket_id) REFERENCES support_ticket(id) DEFERRABLE |
| Khóa chính | `support_ticket_message_pkey` | PRIMARY KEY (id) |

### 95. support_ticket_message_attachment

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã tệp đính kèm. |
| 2 | `message_id` | uuid | Có | — | Tin nhắn hỗ trợ sở hữu tệp. |
| 3 | `file_url` | text | Có | — | Đường dẫn hoặc khóa lưu tệp. |
| 4 | `file_name` | text | Có | — | Tên gốc của tệp. |
| 5 | `file_size` | bigint | Có | — | Kích thước tệp tính bằng byte. |
| 6 | `media_type` | text | Có | — | Loại nội dung tệp. |
| 7 | `display_order` | integer | Có | Có mặc định | Thứ tự tệp trong tin nhắn. |
| 8 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `support_ticket_message_attachment_display_order_check` | CHECK ((display_order >= 0)) |
| Kiểm tra | `support_ticket_message_attachment_file_name_check` | CHECK ((length(btrim(file_name)) > 0)) |
| Kiểm tra | `support_ticket_message_attachment_file_size_check` | CHECK ((file_size >= 0)) |
| Kiểm tra | `support_ticket_message_attachment_file_url_check` | CHECK ((length(btrim(file_url)) > 0)) |
| Kiểm tra | `support_ticket_message_attachment_media_type_check` | CHECK ((length(btrim(media_type)) > 0)) |
| Khóa ngoại | `support_ticket_message_attachment_message_id_fkey` | FOREIGN KEY (message_id) REFERENCES support_ticket_message(id) DEFERRABLE |
| Khóa chính | `support_ticket_message_attachment_pkey` | PRIMARY KEY (id) |

### 96. taxi_price_rule

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh quy tắc giá |
| 2 | `distance_from` | numeric(18,4) | Có | — | Mức khoảng cách tối thiểu của quy tắc |
| 3 | `distance_to` | numeric(18,4) | Không | — | Mức khoảng cách tối đa của quy tắc |
| 4 | `weight_from` | numeric(18,4) | Có | — | Mức cân nặng tối thiểu của quy tắc |
| 5 | `weight_to` | numeric(18,4) | Không | — | Mức cân nặng tối đa của quy tắc |
| 6 | `base_price` | numeric(18,4) | Có | — | Giá cơ bản của chuyến taxi |
| 7 | `surcharge` | numeric(18,4) | Có | Có mặc định | Phụ phí của quy tắc giá |
| 8 | `effective_from` | timestamp with time zone | Có | — | Thời điểm bắt đầu áp dụng quy tắc |
| 9 | `effective_to` | timestamp with time zone | Không | — | Thời điểm kết thúc áp dụng quy tắc |
| 10 | `status` | text | Có | Có mặc định | Trạng thái quy tắc giá |
| 11 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 12 | `updated_at` | timestamp with time zone | Có | Có mặc định | Thời điểm cập nhật gần nhất. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `taxi_price_rule_base_price_check` | CHECK ((base_price >= (0)::numeric)) |
| Kiểm tra | `taxi_price_rule_check` | CHECK (((weight_to IS NULL) OR (weight_to > weight_from))) |
| Kiểm tra | `taxi_price_rule_check1` | CHECK (((distance_to IS NULL) OR (distance_to > distance_from))) |
| Kiểm tra | `taxi_price_rule_check2` | CHECK (((effective_to IS NULL) OR (effective_to > effective_from))) |
| Kiểm tra | `taxi_price_rule_distance_from_check` | CHECK ((distance_from >= (0)::numeric)) |
| Kiểm tra | `taxi_price_rule_distance_to_check` | CHECK ((distance_to >= (0)::numeric)) |
| Kiểm tra | `taxi_price_rule_status_check` | CHECK ((length(btrim(status)) > 0)) |
| Kiểm tra | `taxi_price_rule_surcharge_check` | CHECK ((surcharge >= (0)::numeric)) |
| Kiểm tra | `taxi_price_rule_weight_from_check` | CHECK ((weight_from >= (0)::numeric)) |
| Kiểm tra | `taxi_price_rule_weight_to_check` | CHECK ((weight_to >= (0)::numeric)) |
| Khóa chính | `taxi_price_rule_pkey` | PRIMARY KEY (id) |
| Loại trừ | `taxi_price_no_overlap` | EXCLUDE USING gist (numrange(distance_from, distance_to, '[)'::text) WITH &&, numrange(weight_from, weight_to, '[)'::text) WITH &&, tstzrange(effective_from, effective_to, '[)'::text) WITH &&) WHERE ((status = 'active'::text)) |

### 97. taxi_trip

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã chuyến đưa đón. |
| 2 | `appointment_id` | uuid | Có | — | Lịch dịch vụ liên quan, duy nhất cho mỗi chuyến theo bản 1. |
| 3 | `driver_staff_id` | uuid | Không | — | Nhân viên phụ trách đưa đón. |
| 4 | `pickup_address` | text | Có | — | Địa chỉ đón được chốt khi đặt. |
| 5 | `dropoff_address` | text | Có | — | Địa chỉ trả được chốt khi đặt. |
| 6 | `distance_km` | numeric(18,4) | Có | — | Quãng đường dùng tính giá, lớn hơn 0. |
| 7 | `trip_type` | text | Có | — | Loại một chiều hoặc khứ hồi. |
| 8 | `outbound_at` | timestamp with time zone | Không | — | Thời điểm dự kiến đi. |
| 9 | `return_at` | timestamp with time zone | Không | — | Thời điểm dự kiến về khi là chuyến khứ hồi. |
| 10 | `taxi_price_rule_id` | uuid | Không | — | Quy tắc giá dùng tham chiếu khi báo giá. |
| 11 | `quoted_amount` | numeric(18,4) | Có | — | Giá chuyến đã báo và chốt. |
| 12 | `status` | text | Có | Có mặc định | Trạng thái điều phối và thực hiện chuyến. |
| 13 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 14 | `updated_at` | timestamp with time zone | Có | Có mặc định | Thời điểm cập nhật gần nhất. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `taxi_trip_distance_km_check` | CHECK ((distance_km >= (0)::numeric)) |
| Kiểm tra | `taxi_trip_dropoff_address_check` | CHECK ((length(btrim(dropoff_address)) > 0)) |
| Kiểm tra | `taxi_trip_pickup_address_check` | CHECK ((length(btrim(pickup_address)) > 0)) |
| Kiểm tra | `taxi_trip_quoted_amount_check` | CHECK ((quoted_amount >= (0)::numeric)) |
| Kiểm tra | `taxi_trip_status_check` | CHECK ((length(btrim(status)) > 0)) |
| Kiểm tra | `taxi_trip_trip_type_check` | CHECK ((length(btrim(trip_type)) > 0)) |
| Khóa ngoại | `taxi_trip_appointment_id_fkey` | FOREIGN KEY (appointment_id) REFERENCES appointment(id) DEFERRABLE |
| Khóa ngoại | `taxi_trip_driver_staff_id_fkey` | FOREIGN KEY (driver_staff_id) REFERENCES staff(id) DEFERRABLE |
| Khóa ngoại | `taxi_trip_taxi_price_rule_id_fkey` | FOREIGN KEY (taxi_price_rule_id) REFERENCES taxi_price_rule(id) DEFERRABLE |
| Khóa chính | `taxi_trip_pkey` | PRIMARY KEY (id) |
| Duy nhất | `taxi_trip_appointment_id_key` | UNIQUE (appointment_id) |

### 98. variant_color

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh màu sắc. |
| 2 | `color_name` | text | Có | — | Tên màu hiển thị cho khách hàng. |
| 3 | `hex_code` | text | Có | — | Mã màu dùng để hiển thị swatch màu trên website. |
| 4 | `display_order` | integer | Có | Có mặc định | Thứ tự hiển thị màu trên giao diện. |
| 5 | `is_active` | boolean | Có | Có mặc định | Cho biết màu còn được phép sử dụng cho biến thể mới hay không. |
| 6 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 7 | `updated_at` | timestamp with time zone | Có | Có mặc định | Thời điểm cập nhật gần nhất. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `variant_color_color_name_check` | CHECK ((length(btrim(color_name)) > 0)) |
| Kiểm tra | `variant_color_display_order_check` | CHECK ((display_order >= 0)) |
| Kiểm tra | `variant_color_hex_code_check` | CHECK ((length(btrim(hex_code)) > 0)) |
| Khóa chính | `variant_color_pkey` | PRIMARY KEY (id) |

### 99. variant_flavor

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh hương vị. |
| 2 | `flavor_name` | text | Có | — | Tên hương vị sản phẩm như gà, bò, cá hồi. |
| 3 | `display_order` | integer | Có | Có mặc định | Thứ tự hiển thị hương vị trên giao diện chọn biến thể. |
| 4 | `is_active` | boolean | Có | Có mặc định | Cho biết hương vị còn được phép sử dụng cho biến thể mới hay không. |
| 5 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 6 | `updated_at` | timestamp with time zone | Có | Có mặc định | Thời điểm cập nhật gần nhất. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `variant_flavor_display_order_check` | CHECK ((display_order >= 0)) |
| Kiểm tra | `variant_flavor_flavor_name_check` | CHECK ((length(btrim(flavor_name)) > 0)) |
| Khóa chính | `variant_flavor_pkey` | PRIMARY KEY (id) |

### 100. variant_size

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh kích thước/quy cách. |
| 2 | `size_name` | text | Có | — | Tên kích thước hoặc quy cách như S, M, L, 200g, 500g. |
| 3 | `display_order` | integer | Có | Có mặc định | Thứ tự hiển thị kích thước/quy cách trên giao diện. |
| 4 | `is_active` | boolean | Có | Có mặc định | Cho biết kích thước/quy cách còn được phép sử dụng cho biến thể mới hay không. |
| 5 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 6 | `updated_at` | timestamp with time zone | Có | Có mặc định | Thời điểm cập nhật gần nhất. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `variant_size_display_order_check` | CHECK ((display_order >= 0)) |
| Kiểm tra | `variant_size_size_name_check` | CHECK ((length(btrim(size_name)) > 0)) |
| Khóa chính | `variant_size_pkey` | PRIMARY KEY (id) |

### 101. voucher

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh voucher |
| 2 | `voucher_code` | text | Có | — | Mã voucher khách hàng nhập khi sử dụng |
| 3 | `voucher_name` | text | Có | — | Tên voucher |
| 4 | `discount_value` | numeric(18,4) | Có | — | Giá trị giảm giá |
| 5 | `minimum_order_amount` | numeric(18,4) | Có | Có mặc định | Giá trị đơn tối thiểu để dùng voucher |
| 6 | `required_points` | integer | Có | Có mặc định | Số Paw Points cần để đổi voucher |
| 7 | `start_date` | date | Có | — | Ngày bắt đầu áp dụng voucher |
| 8 | `end_date` | date | Có | — | Ngày kết thúc áp dụng voucher |
| 9 | `is_active` | boolean | Có | Có mặc định | Voucher có đang được kích hoạt hay không |
| 10 | `type` | text | Có | — | Cách tính mức giảm |
| 11 | `description` | text | Không | — | Điều kiện hoặc nội dung voucher |
| 12 | `applicable_for` | text | Có | — | Đối tượng được áp dụng voucher |
| 13 | `max_usage` | integer | Không | — | Số lần voucher được phép sử dụng |
| 14 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 15 | `updated_at` | timestamp with time zone | Có | Có mặc định | Thời điểm cập nhật gần nhất. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `voucher_applicable_for_check` | CHECK ((length(btrim(applicable_for)) > 0)) |
| Kiểm tra | `voucher_check` | CHECK ((end_date >= start_date)) |
| Kiểm tra | `voucher_check1` | CHECK (((type <> 'percent'::text) OR (discount_value <= (100)::numeric))) |
| Kiểm tra | `voucher_discount_value_check` | CHECK ((discount_value >= (0)::numeric)) |
| Kiểm tra | `voucher_max_usage_check` | CHECK ((max_usage >= 0)) |
| Kiểm tra | `voucher_minimum_order_amount_check` | CHECK ((minimum_order_amount >= (0)::numeric)) |
| Kiểm tra | `voucher_required_points_check` | CHECK ((required_points >= 0)) |
| Kiểm tra | `voucher_type_check` | CHECK ((length(btrim(type)) > 0)) |
| Kiểm tra | `voucher_voucher_code_check` | CHECK ((length(btrim(voucher_code)) > 0)) |
| Kiểm tra | `voucher_voucher_name_check` | CHECK ((length(btrim(voucher_name)) > 0)) |
| Khóa chính | `voucher_pkey` | PRIMARY KEY (id) |
| Duy nhất | `voucher_voucher_code_key` | UNIQUE (voucher_code) |

### 102. voucher_redemption

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã lượt sử dụng voucher. |
| 2 | `customer_voucher_id` | uuid | Không | — | Lượt phát hành cá nhân được sử dụng; có thể NULL cho mã công khai. |
| 3 | `voucher_id` | uuid | Có | — | Mẫu voucher áp dụng; với lượt cá nhân phải khớp mẫu đã phát hành. |
| 4 | `order_id` | uuid | Không | — | Đơn được giảm; NULL khi áp dụng cho lịch hẹn. |
| 5 | `appointment_id` | uuid | Không | — | Lịch được giảm; NULL khi áp dụng cho đơn hàng. |
| 6 | `discount_amount_snapshot` | numeric(18,4) | Có | Có mặc định | Số tiền thực giảm đã chốt. |
| 7 | `status` | text | Có | Có mặc định | Trạng thái áp dụng hoặc đã đảo/hủy lượt dùng. |
| 8 | `redeemed_at` | timestamp with time zone | Có | Có mặc định | Thời điểm áp dụng. |
| 9 | `reversed_at` | timestamp with time zone | Không | — | Thời điểm đảo lượt dùng khi có. |
| 10 | `idempotency_key` | text | Có | — | Khóa duy nhất chống áp dụng lặp. |
| 11 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Kiểm tra | `voucher_redemption_check` | CHECK ((num_nonnulls(order_id, appointment_id) = 1)) |
| Kiểm tra | `voucher_redemption_check1` | CHECK (((status = 'reversed'::text) = (reversed_at IS NOT NULL))) |
| Kiểm tra | `voucher_redemption_discount_amount_snapshot_check` | CHECK ((discount_amount_snapshot >= (0)::numeric)) |
| Kiểm tra | `voucher_redemption_idempotency_key_check` | CHECK ((length(btrim(idempotency_key)) > 0)) |
| Kiểm tra | `voucher_redemption_status_check` | CHECK ((length(btrim(status)) > 0)) |
| Kiểm tra | `voucher_redemption_status_check1` | CHECK ((status = ANY (ARRAY['applied'::text, 'reversed'::text, 'cancelled'::text]))) |
| Khóa ngoại | `voucher_redemption_appointment_id_fkey` | FOREIGN KEY (appointment_id) REFERENCES appointment(id) DEFERRABLE |
| Khóa ngoại | `voucher_redemption_customer_voucher_id_fkey` | FOREIGN KEY (customer_voucher_id) REFERENCES customer_voucher(id) DEFERRABLE |
| Khóa ngoại | `voucher_redemption_order_id_fkey` | FOREIGN KEY (order_id) REFERENCES sales_order(id) DEFERRABLE |
| Khóa ngoại | `voucher_redemption_voucher_id_fkey` | FOREIGN KEY (voucher_id) REFERENCES voucher(id) DEFERRABLE |
| Khóa chính | `voucher_redemption_pkey` | PRIMARY KEY (id) |
| t | `v1_money_check` | TRIGGER DEFERRABLE INITIALLY DEFERRED |
| Duy nhất | `voucher_redemption_idempotency_key_key` | UNIQUE (idempotency_key) |

### 103. wishlist

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `id` | uuid | Có | Có mặc định | Mã định danh danh sách yêu thích. |
| 2 | `customer_id` | uuid | Có | — | Khách hàng sở hữu danh sách yêu thích. |
| 3 | `created_at` | timestamp with time zone | Có | Có mặc định | Thời điểm tạo bản ghi. |
| 4 | `updated_at` | timestamp with time zone | Có | Có mặc định | Thời điểm cập nhật gần nhất. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Khóa ngoại | `wishlist_customer_id_fkey` | FOREIGN KEY (customer_id) REFERENCES customer(id) DEFERRABLE |
| Khóa chính | `wishlist_pkey` | PRIMARY KEY (id) |
| Duy nhất | `wishlist_customer_id_key` | UNIQUE (customer_id) |

### 104. wishlist_product

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `wishlist_id` | uuid | Có | — | Danh sách yêu thích; cùng product_id tạo khóa chính. |
| 2 | `product_id` | uuid | Có | — | Sản phẩm được yêu thích; cùng wishlist_id tạo khóa chính. |
| 3 | `added_at` | timestamp with time zone | Có | Có mặc định | Thời điểm thêm sản phẩm. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Khóa ngoại | `wishlist_product_product_id_fkey` | FOREIGN KEY (product_id) REFERENCES product(id) DEFERRABLE |
| Khóa ngoại | `wishlist_product_wishlist_id_fkey` | FOREIGN KEY (wishlist_id) REFERENCES wishlist(id) DEFERRABLE |
| Khóa chính | `wishlist_product_pkey` | PRIMARY KEY (wishlist_id, product_id) |

### 105. wishlist_service

RLS: **Bật**. Có RLS không đồng nghĩa mọi policy đã được nghiệm thu.

| STT | Thuộc tính | Kiểu dữ liệu | Bắt buộc | Mặc định / tự sinh | Ý nghĩa từ CSDL |
| :---: | --- | --- | :---: | --- | --- |
| 1 | `wishlist_id` | uuid | Có | — | Danh sách yêu thích; cùng service_id tạo khóa chính. |
| 2 | `service_id` | uuid | Có | — | Dịch vụ được yêu thích; cùng wishlist_id tạo khóa chính. |
| 3 | `added_at` | timestamp with time zone | Có | Có mặc định | Thời điểm thêm dịch vụ. |

| Loại | Tên ràng buộc | Định nghĩa |
| --- | --- | --- |
| Khóa ngoại | `wishlist_service_service_id_fkey` | FOREIGN KEY (service_id) REFERENCES service(id) DEFERRABLE |
| Khóa ngoại | `wishlist_service_wishlist_id_fkey` | FOREIGN KEY (wishlist_id) REFERENCES wishlist(id) DEFERRABLE |
| Khóa chính | `wishlist_service_pkey` | PRIMARY KEY (wishlist_id, service_id) |

## 3. View public

| STT | View | Loại |
| :---: | --- | --- |
| 1 | `appointment_totals` | View |
| 2 | `customer_eligible_spend` | View |
| 3 | `customer_point_balance` | View |
| 4 | `pet_current_weight` | View |
| 5 | `sales_order_totals` | View |
| 6 | `staff_public_view` | View |

## 4. Cách cập nhật

Chạy `node scripts/database/v1/export_cloud_schema_markdown.cjs`. Lệnh chỉ đọc metadata Cloud; ghi lại file Markdown này trong workspace. Không sửa thiết kế logic gốc và không thay đổi CSDL.
