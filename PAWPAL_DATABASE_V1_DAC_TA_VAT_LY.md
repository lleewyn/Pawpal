# Đặc tả vật lý database V1

Fingerprint mô hình: `4385e82e3ef3e375f7743fa5232cccbc266cf9ce51045c9d49c0e2d8042685e4`.

Nguồn: mục 15 của PAWPAL_THIET_KE_DATABASE_3NF_V1.md, kết hợp các quy tắc mục 3–13. Không thêm bảng/cột nghiệp vụ ngoài 105 bảng/906 thuộc tính.

Quyết định vật lý: UUID nghiệp vụ; tiền/cân/khoảng cách numeric(18,4); số lượng nguyên; thời điểm timestamptz; ngày date; vector không khóa chiều khi chưa chọn mô hình embedding. Các trường metadata/specs/bank_info dùng jsonb theo ý nghĩa nội dung; không nạp file JSON làm dữ liệu giả. Từ khóa dạng text[].

Trạng thái dùng mã tiếng Anh chữ thường; đây là mã lưu trữ, giao diện phải dịch tiếng Việt. active là đang áp dụng; pending là chờ; draft là nháp; succeeded/completed/delivered ghi nhận thu hoặc hoàn tất; cancelled/reversed/disabled không còn hiệu lực. Cột loại nghiệp vụ không có default phải được bên ghi chỉ định. Chưa có quy trình/API không đồng nghĩa default cho phép bỏ qua kiểm tra quyền.

FK mặc định NO ACTION, DEFERRABLE INITIALLY IMMEDIATE để không xóa dây chuyền lịch sử. Chỉ rõ quy tắc cùng bảng và các trigger bổ sung trong 002_rules.sql. promotion_id ở hai bảng khuyến mãi được gắn FK vì quy tắc V1 yêu cầu dù bảng từ điển thiếu nhãn FK.

Mỗi PK xác định toàn bộ thuộc tính của bảng; PK ghép dùng toàn bộ các cột được đánh dấu. Các khóa ứng viên UQ và khóa theo tổ hợp được tạo trong SQL. Quan hệ customer_profile/customer_membership dùng customer_id PK/FK; loài được suy từ breed, không lưu lại ở pet; trạng thái đọc suy từ read_at; tổng/điểm/cân hiện tại qua view. Snapshot là sự kiện lịch sử, không đồng nhất với giá trị danh mục hiện tại. Đây là đặc tả triển khai, không tuyên bố tự động chứng minh 3NF cho mọi nội dung text/metadata.

## guest_session

Định danh phiên khách vãng lai mà không tạo hồ sơ khách giả.

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `token_hash` | text | Không | — | UQ |
| `expires_at` | timestamptz | Không | — | — |
| `revoked_at` | timestamptz | Có | — | — |
| `created_at` | timestamptz | Không | `now()` | — |

## permission

Danh mục các quyền thao tác được máy chủ kiểm tra.

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `code` | text | Không | — | PK |
| `description` | text | Không | — | — |

## access_role

Danh mục vai trò truy cập, độc lập chức danh nghề nghiệp.

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `code` | text | Không | — | PK |
| `role_name` | text | Không | — | — |
| `created_at` | timestamptz | Không | `now()` | — |
| `updated_at` | timestamptz | Không | `now()` | — |

## role_permission

Liên kết nhiều quyền với nhiều vai trò truy cập.

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `role_code` | text | Không | — | PK; FK → public.access_role(code) |
| `permission_code` | text | Không | — | PK; FK → public.permission(code) |

## staff_role

Gán các vai trò truy cập cho nhân viên.

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `staff_id` | uuid | Không | — | PK; FK → public.staff(id) |
| `role_code` | text | Không | — | PK; FK → public.access_role(code) |

## staff_permission

Cấp thêm quyền trực tiếp cho nhân viên, không biểu diễn quyền từ chối.

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `staff_id` | uuid | Không | — | PK; FK → public.staff(id) |
| `permission_code` | text | Không | — | PK; FK → public.permission(code) |

## customer

Hồ sơ nghiệp vụ khách hàng, có thể được tạo tại quầy trước khi có tài khoản.

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `auth_user_id` | uuid | Có | — | UQ; FK → auth.users(id) |
| `customer_code` | text | Không | — | UQ |
| `customer_status` | text | Không | `'active'` | — |
| `registered_at` | timestamptz | Không | `now()` | — |
| `note` | text | Có | — | — |
| `created_at` | timestamptz | Không | `now()` | — |
| `updated_at` | timestamptz | Không | `now()` | — |
| `contact_email` | text | Có | — | — |

## customer_profile

Lưu một hồ sơ cá nhân cho mỗi khách hàng.

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `customer_id` | uuid | Không | — | PK; FK → public.customer(id) |
| `full_name` | text | Không | — | — |
| `date_of_birth` | date | Có | — | — |
| `gender` | text | Có | — | — |
| `created_at` | timestamptz | Không | `now()` | — |
| `updated_at` | timestamptz | Không | `now()` | — |

## customer_phone

Lưu các số điện thoại liên hệ và số chính dùng xác minh đăng nhập.

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `customer_id` | uuid | Không | — | FK → public.customer(id) |
| `phone_number` | text | Không | — | — |
| `is_primary` | boolean | Không | `false` | — |
| `verified_at` | timestamptz | Có | — | — |
| `created_at` | timestamptz | Không | `now()` | — |
| `updated_at` | timestamptz | Không | `now()` | — |

## customer_address

Lưu nhiều địa chỉ giao hàng, đón trả thú cưng hoặc địa chỉ đặt hộ của khách hàng

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `customer_id` | uuid | Không | — | FK → public.customer(id) |
| `receiver_name` | text | Không | — | — |
| `receiver_phone` | text | Không | — | — |
| `province` | text | Không | — | — |
| `street_address` | text | Không | — | — |
| `postal_code` | text | Có | — | — |
| `is_default` | boolean | Không | `false` | — |
| `created_at` | timestamptz | Không | `now()` | — |
| `updated_at` | timestamptz | Không | `now()` | — |

## membership_tier

Lưu cấu hình các hạng thành viên như Bạc, Vàng, Kim Cương

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `tier_name` | text | Không | — | UQ |
| `minimum_expenditure` | numeric(18,4) | Không | `0` | — |
| `discount_percent` | numeric(18,4) | Không | `0` | — |
| `description` | text | Có | — | — |
| `is_active` | boolean | Không | `true` | — |
| `created_at` | timestamptz | Không | `now()` | — |
| `updated_at` | timestamptz | Không | `now()` | — |

## customer_membership

Lưu hạng thành viên hiện đang được gán; không lưu số dư điểm lặp.

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `customer_id` | uuid | Không | — | PK; FK → public.customer(id) |
| `membership_tier_id` | uuid | Không | — | FK → public.membership_tier(id) |
| `assigned_at` | timestamptz | Không | `now()` | — |
| `created_at` | timestamptz | Không | `now()` | — |
| `updated_at` | timestamptz | Không | `now()` | — |

## reward_rule

Lưu quy tắc cộng hoặc trừ Paw Points theo từng sự kiện như đăng ký, đặt lịch, mua hàng, đánh giá hoặc chương trình khuyến mãi

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `rule_name` | text | Không | — | — |
| `reward_type` | text | Không | — | — |
| `trigger_event` | text | Không | — | — |
| `reward_value` | numeric(18,4) | Không | — | — |
| `description` | text | Không | — | — |
| `is_active` | boolean | Không | `true` | — |
| `created_at` | timestamptz | Không | `now()` | — |
| `updated_at` | timestamptz | Không | `now()` | — |

## paw_point_transaction

Lưu toàn bộ lịch sử cộng, trừ và quy đổi Paw Point

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `customer_id` | uuid | Không | — | FK → public.customer(id) |
| `payment_id` | uuid | Có | — | FK → public.payment(id) |
| `review_id` | uuid | Có | — | FK → public.review(id) |
| `reward_rule_id` | uuid | Có | — | FK → public.reward_rule(id) |
| `points` | integer | Không | — | — |
| `description` | text | Có | — | — |
| `created_at` | timestamptz | Không | `now()` | — |
| `refund_transaction_id` | uuid | Có | — | FK → public.refund_transaction(id) |
| `voucher_redemption_id` | uuid | Có | — | FK → public.voucher_redemption(id) |
| `customer_voucher_id` | uuid | Có | — | FK → public.customer_voucher(id) |
| `idempotency_key` | text | Không | — | UQ |
| `sequence_no` | bigint | Không | — | — |

## voucher

Lưu danh mục voucher có thể phát hành hoặc

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `voucher_code` | text | Không | — | UQ |
| `voucher_name` | text | Không | — | — |
| `discount_value` | numeric(18,4) | Không | — | — |
| `minimum_order_amount` | numeric(18,4) | Không | `0` | — |
| `required_points` | integer | Không | `0` | — |
| `start_date` | date | Không | — | — |
| `end_date` | date | Không | — | — |
| `is_active` | boolean | Không | `true` | — |
| `type` | text | Không | — | — |
| `description` | text | Có | — | — |
| `applicable_for` | text | Không | — | — |
| `max_usage` | integer | Có | — | — |
| `created_at` | timestamptz | Không | `now()` | — |
| `updated_at` | timestamptz | Không | `now()` | — |

## customer_voucher

Lưu danh sách voucher mà khách hàng đang sở hữu hoặc đã sử dụng

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `customer_id` | uuid | Không | — | FK → public.customer(id) |
| `voucher_id` | uuid | Không | — | FK → public.voucher(id) |
| `acquired_method` | text | Không | — | — |
| `voucher_status` | text | Không | `'available'` | — |
| `acquired_at` | timestamptz | Không | `now()` | — |
| `expired_at` | timestamptz | Có | — | — |

## voucher_redemption

Lưu từng lượt áp dụng voucher vào đơn hoặc lịch, giữ mức giảm đã chốt.

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `customer_voucher_id` | uuid | Có | — | FK → public.customer_voucher(id) |
| `voucher_id` | uuid | Không | — | FK → public.voucher(id) |
| `order_id` | uuid | Có | — | FK → public.sales_order(id) |
| `appointment_id` | uuid | Có | — | FK → public.appointment(id) |
| `discount_amount_snapshot` | numeric(18,4) | Không | `0` | — |
| `status` | text | Không | `'applied'` | — |
| `redeemed_at` | timestamptz | Không | `now()` | — |
| `reversed_at` | timestamptz | Có | — | — |
| `idempotency_key` | text | Không | — | UQ |
| `created_at` | timestamptz | Không | `now()` | — |

## pet_species

Danh mục loài thú cưng.

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `species_name` | text | Không | — | UQ |
| `is_active` | boolean | Không | `true` | — |
| `created_at` | timestamptz | Không | `now()` | — |
| `updated_at` | timestamptz | Không | `now()` | — |

## pet_breed

Danh mục giống thuộc từng loài thú cưng.

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `species_id` | uuid | Không | — | FK → public.pet_species(id) |
| `breed_name` | text | Không | — | — |
| `is_active` | boolean | Không | `true` | — |
| `created_at` | timestamptz | Không | `now()` | — |
| `updated_at` | timestamptz | Không | `now()` | — |

## pet_profile

Lưu hồ sơ định danh Pet ID, tên thú cưng, giống loài, giới tính, ngày sinh và trạng thái hoạt động

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `customer_id` | uuid | Không | — | FK → public.customer(id) |
| `pet_code` | text | Không | — | UQ |
| `pet_name` | text | Không | — | — |
| `avatar_url` | text | Có | — | — |
| `gender` | text | Có | — | — |
| `date_of_birth` | date | Có | — | — |
| `color` | text | Có | — | — |
| `routine` | text | Có | — | — |
| `allergy` | text | Có | — | — |
| `status` | text | Không | `'active'` | — |
| `created_at` | timestamptz | Không | `now()` | — |
| `updated_at` | timestamptz | Không | `now()` | — |
| `breed_id` | uuid | Không | — | FK → public.pet_breed(id) |
| `safety_note` | text | Có | — | — |

## pet_weight_history

Lưu lịch sử cân đo trọng lượng định kỳ của thú cưng phục vụ theo dõi sức khỏe và điều chỉnh dịch vụ

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `pet_id` | uuid | Không | — | FK → public.pet_profile(id) |
| `weight` | numeric(18,4) | Không | — | — |
| `measured_at` | timestamptz | Không | `now()` | — |
| `recorded_by` | uuid | Có | — | FK → public.staff(id) |
| `note` | text | Có | — | — |
| `created_at` | timestamptz | Không | `now()` | — |

## staff_level

Danh mục cấp độ chuyên môn của kỹ thuật viên.

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `level_code` | text | Không | — | UQ |
| `level_name` | text | Không | — | — |
| `rank_order` | integer | Không | — | — |
| `is_active` | boolean | Không | `true` | — |
| `created_at` | timestamptz | Không | `now()` | — |
| `updated_at` | timestamptz | Không | `now()` | — |

## service_category

Danh mục nhóm dịch vụ chăm sóc, lưu trú và đưa đón.

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `category_code` | text | Không | — | UQ |
| `category_name` | text | Không | — | — |
| `created_at` | timestamptz | Không | `now()` | — |
| `updated_at` | timestamptz | Không | `now()` | — |

## service

Lưu danh mục các dịch vụ thuộc các nhóm Grooming & Spa, Pet Hotel và Pet Taxi

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `service_code` | text | Không | — | UQ |
| `service_name` | text | Không | — | — |
| `description` | text | Có | — | — |
| `estimated_duration` | integer | Không | — | — |
| `status` | text | Không | `'active'` | — |
| `commission_rate` | numeric(18,4) | Có | `0` | — |
| `benefits` | text | Có | — | — |
| `created_at` | timestamptz | Không | `now()` | — |
| `updated_at` | timestamptz | Không | `now()` | — |
| `category_id` | uuid | Không | — | FK → public.service_category(id) |
| `staff_level_required_id` | uuid | Có | — | FK → public.staff_level(id) |
| `amenities` | text | Có | — | — |

## service_image

Lưu ảnh của dịch vụ và xác định ảnh đại diện từ cùng một nguồn.

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `service_id` | uuid | Không | — | FK → public.service(id) |
| `image_url` | text | Không | — | — |
| `display_order` | integer | Không | `0` | — |
| `is_thumbnail` | boolean | Không | `false` | — |
| `created_at` | timestamptz | Không | `now()` | — |
| `updated_at` | timestamptz | Không | `now()` | — |

## service_supported_species

Liên kết dịch vụ với các loài được phục vụ.

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `service_id` | uuid | Không | — | PK; FK → public.service(id) |
| `species_id` | uuid | Không | — | PK; FK → public.pet_species(id) |

## service_addon

Lưu danh sách các dịch vụ bổ sung đi kèm dịch vụ chính (Spa, Hotel, Taxi), bao gồm giá, thời lượng và trạng thái áp dụng.

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `service_id` | uuid | Không | — | FK → public.service(id) |
| `addon_name` | text | Không | — | — |
| `description` | text | Có | — | — |
| `price` | numeric(18,4) | Không | — | — |
| `estimated_duration` | integer | Không | — | — |
| `is_required` | boolean | Không | `false` | — |
| `status` | text | Không | `'active'` | — |
| `created_at` | timestamptz | Không | `now()` | — |
| `updated_at` | timestamptz | Không | `now()` | — |

## care_action

Lưu danh mục các mốc chăm sóc như Tắm,

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `action_name` | text | Không | — | — |
| `is_active` | boolean | Không | `true` | — |
| `created_at` | timestamptz | Không | `now()` | — |
| `updated_at` | timestamptz | Không | `now()` | — |

## service_care_action

Checklist mẫu của từng dịch vụ, độc lập nhật ký thực hiện.

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `service_id` | uuid | Không | — | PK; FK → public.service(id) |
| `care_action_id` | uuid | Không | — | PK; FK → public.care_action(id) |
| `display_order` | integer | Không | `0` | — |
| `estimated_duration` | integer | Không | — | — |

## service_price_matrix

Lưu bảng giá của từng dịch vụ theo loài thú cưng, cân nặng hoặc điều kiện áp dụng

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `service_id` | uuid | Không | — | FK → public.service(id) |
| `weight_from` | numeric(18,4) | Không | — | — |
| `weight_to` | numeric(18,4) | Có | — | — |
| `unit_price` | numeric(18,4) | Không | — | — |
| `effective_from` | timestamptz | Không | — | — |
| `effective_to` | timestamptz | Có | — | — |
| `status` | text | Không | `'active'` | — |
| `created_at` | timestamptz | Không | `now()` | — |
| `updated_at` | timestamptz | Không | `now()` | — |

## taxi_price_rule

Lưu các quy tắc tính giá dịch vụ Pet Taxi theo khoảng cách, cân nặng và thời gian hiệu lực của bảng giá.

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `distance_from` | numeric(18,4) | Không | — | — |
| `distance_to` | numeric(18,4) | Có | — | — |
| `weight_from` | numeric(18,4) | Không | — | — |
| `weight_to` | numeric(18,4) | Có | — | — |
| `base_price` | numeric(18,4) | Không | — | — |
| `surcharge` | numeric(18,4) | Không | `0` | — |
| `effective_from` | timestamptz | Không | — | — |
| `effective_to` | timestamptz | Có | — | — |
| `status` | text | Không | `'active'` | — |
| `created_at` | timestamptz | Không | `now()` | — |
| `updated_at` | timestamptz | Không | `now()` | — |

## hotel_room_type

Loại phòng khách sạn dành cho thú cưng, lưu thông tin cấu hình và mức giá dùng chung cho các phòng cùng loại.

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `room_type` | text | Không | — | — |
| `capacity` | integer | Không | — | — |
| `daily_price` | numeric(18,4) | Không | — | — |
| `description` | text | Có | — | — |
| `amenities` | text | Có | — | — |
| `status` | text | Không | `'active'` | — |
| `created_at` | timestamptz | Không | `now()` | — |
| `updated_at` | timestamptz | Không | `now()` | — |

## hotel_room

Phòng vật lý thực tế tại cơ sở lưu trú, thuộc một loại phòng cụ thể và được quản lý theo số phòng và trạng thái sử dụng.

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `room_number` | text | Không | — | UQ |
| `room_type_id` | uuid | Không | — | FK → public.hotel_room_type(id) |
| `status` | text | Không | `'active'` | — |
| `description` | text | Có | — | — |
| `created_at` | timestamptz | Không | `now()` | — |
| `updated_at` | timestamptz | Không | `now()` | — |

## appointment

Lưu phiếu đặt lịch dịch vụ của khách hàng cho từng thú cưng

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `appointment_code` | text | Không | — | UQ |
| `customer_id` | uuid | Không | — | FK → public.customer(id) |
| `pet_id` | uuid | Không | — | FK → public.pet_profile(id) |
| `staff_id` | uuid | Có | — | FK → public.staff(id) |
| `check_in_time` | timestamptz | Có | — | — |
| `check_out_time` | timestamptz | Có | — | — |
| `note` | text | Có | — | — |
| `change_count` | integer | Không | `0` | — |
| `appointment_status` | text | Không | `'pending'` | — |
| `created_at` | timestamptz | Không | `now()` | — |
| `updated_at` | timestamptz | Không | `now()` | — |
| `scheduled_start_at` | timestamptz | Không | — | — |
| `scheduled_end_at` | timestamptz | Không | — | — |

## appointment_item

Dòng dịch vụ hoặc addon thực tế của một ca, giữ nội dung giá đã chốt.

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `appointment_id` | uuid | Không | — | FK → public.appointment(id) |
| `service_id` | uuid | Có | — | FK → public.service(id) |
| `service_addon_id` | uuid | Có | — | FK → public.service_addon(id) |
| `is_primary` | boolean | Không | `false` | — |
| `name_snapshot` | text | Không | — | — |
| `quantity` | integer | Không | — | — |
| `unit_price` | numeric(18,4) | Không | — | — |
| `discount_amount` | numeric(18,4) | Không | `0` | — |
| `duration_minutes` | integer | Không | — | — |
| `weight_snapshot` | numeric(18,4) | Có | — | — |
| `staff_id` | uuid | Có | — | FK → public.staff(id) |
| `status` | text | Không | `'pending'` | — |
| `created_at` | timestamptz | Không | `now()` | — |
| `updated_at` | timestamptz | Không | `now()` | — |

## appointment_record

Biên bản tiếp nhận hoặc bàn giao có phiên bản, giữ thông tin tại thời điểm lập.

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `appointment_id` | uuid | Không | — | FK → public.appointment(id) |
| `record_type` | text | Không | — | — |
| `schema_version` | integer | Không | — | — |
| `revision_no` | integer | Không | `1` | — |
| `recorded_by` | uuid | Không | — | FK → public.staff(id) |
| `recorded_at` | timestamptz | Không | `now()` | — |
| `condition_note` | text | Không | — | — |
| `safety_note_snapshot` | text | Có | — | — |
| `allergy_note_snapshot` | text | Có | — | — |
| `customer_confirmation_status` | text | Không | `'pending'` | — |
| `confirmed_at` | timestamptz | Có | — | — |
| `note` | text | Có | — | — |
| `created_at` | timestamptz | Không | `now()` | — |

## appointment_adjustment

Ghi nhận phụ phí, giảm trừ, gia hạn hoặc sự cố cần duyệt.

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `appointment_id` | uuid | Không | — | FK → public.appointment(id) |
| `adjustment_type` | text | Không | — | — |
| `duration_delta_minutes` | integer | Không | `0` | — |
| `amount_delta` | numeric(18,4) | Không | `0` | — |
| `reason` | text | Không | — | — |
| `proposed_by` | uuid | Không | — | FK → public.staff(id) |
| `approved_by` | uuid | Có | — | FK → public.staff(id) |
| `approval_status` | text | Không | `'pending'` | — |
| `customer_consent_status` | text | Không | `'pending'` | — |
| `approved_at` | timestamptz | Có | — | — |
| `created_at` | timestamptz | Không | `now()` | — |

## hotel_booking

Quản lý lịch đặt phòng lưu trú khách sạn thú cưng Pet Hotel

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `booking_code` | text | Không | — | UQ |
| `room_id` | uuid | Không | — | FK → public.hotel_room(id) |
| `appointment_id` | uuid | Không | — | UQ; FK → public.appointment(id) |
| `check_in_at` | timestamptz | Không | — | — |
| `check_out_at` | timestamptz | Không | — | — |
| `status` | text | Không | `'pending'` | — |
| `special_diet_notes` | text | Có | — | — |
| `care_notes` | text | Có | — | — |
| `daily_price` | numeric(18,4) | Không | — | — |
| `created_at` | timestamptz | Không | `now()` | — |
| `updated_at` | timestamptz | Không | `now()` | — |

## taxi_trip

Thông tin chuyến đưa đón gắn duy nhất với một lịch dịch vụ.

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `appointment_id` | uuid | Không | — | UQ; FK → public.appointment(id) |
| `driver_staff_id` | uuid | Có | — | FK → public.staff(id) |
| `pickup_address` | text | Không | — | — |
| `dropoff_address` | text | Không | — | — |
| `distance_km` | numeric(18,4) | Không | — | — |
| `trip_type` | text | Không | — | — |
| `outbound_at` | timestamptz | Có | — | — |
| `return_at` | timestamptz | Có | — | — |
| `taxi_price_rule_id` | uuid | Có | — | FK → public.taxi_price_rule(id) |
| `quoted_amount` | numeric(18,4) | Không | — | — |
| `status` | text | Không | `'pending'` | — |
| `created_at` | timestamptz | Không | `now()` | — |
| `updated_at` | timestamptz | Không | `now()` | — |

## care_log

Lưu toàn bộ timeline chăm sóc trong quá trình thực hiện dịch vụ

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `appointment_id` | uuid | Không | — | FK → public.appointment(id) |
| `care_action_id` | uuid | Có | — | FK → public.care_action(id) |
| `description` | text | Có | — | — |
| `observed_condition` | text | Có | — | — |
| `recorded_at` | timestamptz | Không | `now()` | — |
| `created_at` | timestamptz | Không | `now()` | — |
| `updated_at` | timestamptz | Không | `now()` | — |
| `recorded_by` | uuid | Có | — | FK → public.staff(id) |
| `action_name_snapshot` | text | Không | — | — |

## care_log_media

Lưu ảnh và video minh chứng được cập nhật vào Care Log

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `care_log_id` | uuid | Không | — | FK → public.care_log(id) |
| `media_type` | text | Không | — | — |
| `media_url` | text | Không | — | — |
| `file_name` | text | Không | — | — |
| `file_size` | bigint | Không | — | — |
| `staff_id` | uuid | Có | — | FK → public.staff(id) |
| `uploaded_at` | timestamptz | Không | `now()` | — |
| `created_at` | timestamptz | Không | `now()` | — |

## supplier

Lưu thông tin nhà cung cấp sản phẩm

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `supplier_name` | text | Không | — | — |
| `contact_person` | text | Có | — | — |
| `phone_number` | text | Có | — | — |
| `email` | text | Có | — | — |
| `address` | text | Có | — | — |
| `status` | text | Không | `'active'` | — |
| `created_at` | timestamptz | Không | `now()` | — |
| `updated_at` | timestamptz | Không | `now()` | — |

## product_category

Lưu danh mục nhóm sản phẩm

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `category_name` | text | Không | — | — |
| `description` | text | Có | — | — |
| `status` | text | Không | `'active'` | — |
| `created_at` | timestamptz | Không | `now()` | — |
| `updated_at` | timestamptz | Không | `now()` | — |

## product

Lưu danh mục sản phẩm kinh

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `category_id` | uuid | Không | — | FK → public.product_category(id) |
| `product_name` | text | Không | — | — |
| `unit` | text | Không | — | — |
| `target_pet` | text | Có | — | — |
| `description` | text | Có | — | — |
| `slug` | text | Không | — | UQ |
| `status` | text | Không | `'active'` | — |
| `created_at` | timestamptz | Không | `now()` | — |
| `updated_at` | timestamptz | Không | `now()` | — |
| `origin` | text | Có | — | — |
| `ingredients` | text | Có | — | — |
| `benefits` | text | Có | — | — |
| `usage_instructions` | text | Có | — | — |
| `specs` | jsonb | Có | — | — |
| `badge` | text | Có | — | — |
| `brand_name` | text | Có | — | — |

## product_media

Ảnh dùng chung của sản phẩm, độc lập ảnh riêng từng biến thể.

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `product_id` | uuid | Không | — | FK → public.product(id) |
| `image_url` | text | Không | — | — |
| `display_order` | integer | Không | `0` | — |
| `is_thumbnail` | boolean | Không | `false` | — |
| `created_at` | timestamptz | Không | `now()` | — |
| `updated_at` | timestamptz | Không | `now()` | — |

## variant_color

Lưu định dạng màu sắc sản phẩm

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `color_name` | text | Không | — | — |
| `hex_code` | text | Không | — | — |
| `display_order` | integer | Không | `0` | — |
| `is_active` | boolean | Không | `true` | — |
| `created_at` | timestamptz | Không | `now()` | — |
| `updated_at` | timestamptz | Không | `now()` | — |

## variant_size

Lưu định dạng kích thước sản phẩm

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `size_name` | text | Không | — | — |
| `display_order` | integer | Không | `0` | — |
| `is_active` | boolean | Không | `true` | — |
| `created_at` | timestamptz | Không | `now()` | — |
| `updated_at` | timestamptz | Không | `now()` | — |

## variant_flavor

Lưu danh mục hương vị hoặc mùi hương dùng chung cho các biến thể sản phẩm.

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `flavor_name` | text | Không | — | — |
| `display_order` | integer | Không | `0` | — |
| `is_active` | boolean | Không | `true` | — |
| `created_at` | timestamptz | Không | `now()` | — |
| `updated_at` | timestamptz | Không | `now()` | — |

## product_variant

Lưu từng phiên bản cụ thể của một sản phẩm theo màu sắc, kích thước, kiểu dáng, SKU và giá bán riêng.

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `product_id` | uuid | Không | — | FK → public.product(id) |
| `color_id` | uuid | Có | — | FK → public.variant_color(id) |
| `size_id` | uuid | Có | — | FK → public.variant_size(id) |
| `flavor_id` | uuid | Có | — | FK → public.variant_flavor(id) |
| `sku_variant` | text | Không | — | UQ |
| `cost_price` | numeric(18,4) | Không | — | — |
| `sale_price` | numeric(18,4) | Không | — | — |
| `compare_at_price` | numeric(18,4) | Có | — | — |
| `weight` | numeric(18,4) | Có | — | — |
| `barcode` | text | Có | — | UQ |
| `status` | text | Không | `'active'` | — |
| `created_at` | timestamptz | Không | `now()` | — |
| `updated_at` | timestamptz | Không | `now()` | — |

## product_variant_media

Lưu ảnh riêng của từng biến thể sản phẩm, độc lập ảnh dùng chung của sản phẩm.

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `product_variant_id` | uuid | Không | — | FK → public.product_variant(id) |
| `image_url` | text | Không | — | — |
| `display_order` | integer | Không | `0` | — |
| `is_thumbnail` | boolean | Không | `false` | — |
| `created_at` | timestamptz | Không | `now()` | — |
| `updated_at` | timestamptz | Không | `now()` | — |

## purchase_order

Lưu phiếu nhập hàng từ nhà cung cấp

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `supplier_id` | uuid | Không | — | FK → public.supplier(id) |
| `order_number` | text | Không | — | UQ |
| `order_date` | date | Không | — | — |
| `expected_date` | date | Có | — | — |
| `order_status` | text | Không | `'draft'` | — |
| `note` | text | Có | — | — |
| `created_at` | timestamptz | Không | `now()` | — |
| `updated_at` | timestamptz | Không | `now()` | — |

## purchase_order_detail

Lưu chi tiết từng sản phẩm trong phiếu nhập hàng

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `purchase_order_id` | uuid | Không | — | FK → public.purchase_order(id) |
| `product_variant_id` | uuid | Không | — | FK → public.product_variant(id) |
| `quantity` | integer | Không | — | — |
| `unit_price` | numeric(18,4) | Không | — | — |

## cart

Lưu giỏ hàng hiện tại của khách trước khi tạo đơn hàng

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `customer_id` | uuid | Không | — | FK → public.customer(id) |
| `cart_status` | text | Không | `'active'` | — |
| `created_at` | timestamptz | Không | `now()` | — |
| `updated_at` | timestamptz | Không | `now()` | — |

## cart_item

Lưu danh sách sản phẩm được thêm vào giỏ hàng

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `cart_id` | uuid | Không | — | FK → public.cart(id) |
| `product_variant_id` | uuid | Không | — | FK → public.product_variant(id) |
| `quantity` | integer | Không | — | — |
| `unit_price` | numeric(18,4) | Không | — | — |
| `created_at` | timestamptz | Không | `now()` | — |
| `updated_at` | timestamptz | Không | `now()` | — |

## wishlist

Lưu danh sách sản phẩm yêu thích của khách hàng

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `customer_id` | uuid | Không | — | UQ; FK → public.customer(id) |
| `created_at` | timestamptz | Không | `now()` | — |
| `updated_at` | timestamptz | Không | `now()` | — |

## wishlist_product

Sản phẩm yêu thích của khách thông qua wishlist.

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `wishlist_id` | uuid | Không | — | PK; FK → public.wishlist(id) |
| `product_id` | uuid | Không | — | PK; FK → public.product(id) |
| `added_at` | timestamptz | Không | `now()` | — |

## wishlist_service

Dịch vụ yêu thích của khách thông qua wishlist.

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `wishlist_id` | uuid | Không | — | PK; FK → public.wishlist(id) |
| `service_id` | uuid | Không | — | PK; FK → public.service(id) |
| `added_at` | timestamptz | Không | `now()` | — |

## sales_order

Lưu đơn hàng mua sắm trên website hoặc tại cửa hàng

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `order_code` | text | Không | — | UQ |
| `customer_id` | uuid | Không | — | FK → public.customer(id) |
| `order_status` | text | Không | `'draft'` | — |
| `note` | text | Có | — | — |
| `created_at` | timestamptz | Không | `now()` | — |
| `updated_at` | timestamptz | Không | `now()` | — |
| `shipping_fee_snapshot` | numeric(18,4) | Không | `0` | — |
| `receiver_name_snapshot` | text | Có | — | — |
| `receiver_phone_snapshot` | text | Có | — | — |
| `province_snapshot` | text | Có | — | — |
| `street_address_snapshot` | text | Có | — | — |
| `postal_code_snapshot` | text | Có | — | — |
| `delivery_option_id` | uuid | Có | — | FK → public.delivery_option_config(id) |
| `shipping_provider_id` | uuid | Có | — | FK → public.shipping_provider(id) |
| `tracking_code` | text | Có | — | — |
| `shipped_at` | timestamptz | Có | — | — |
| `delivered_at` | timestamptz | Có | — | — |
| `shipping_status` | text | Có | — | — |

## sales_order_detail

Lưu chi tiết sản phẩm, số lượng và đơn giá trong từng đơn hàng

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `order_id` | uuid | Không | — | FK → public.sales_order(id) |
| `product_variant_id` | uuid | Không | — | FK → public.product_variant(id) |
| `quantity` | integer | Không | — | — |
| `unit_price` | numeric(18,4) | Không | — | — |
| `discount_amount` | numeric(18,4) | Không | `0` | — |
| `product_name_snapshot` | text | Không | — | — |
| `sku_snapshot` | text | Không | — | — |

## stock_reservation

Lưu thông tin giữ trước số lượng tồn kho của từng biến thể sản phẩm

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `product_variant_id` | uuid | Không | — | FK → public.product_variant(id) |
| `cart_id` | uuid | Có | — | FK → public.cart(id) |
| `quantity` | integer | Không | — | — |
| `reserved_at` | timestamptz | Không | `now()` | — |
| `expires_at` | timestamptz | Không | — | — |
| `status` | text | Không | `'pending'` | — |
| `created_at` | timestamptz | Không | `now()` | — |
| `updated_at` | timestamptz | Không | `now()` | — |
| `order_id` | uuid | Có | — | FK → public.sales_order(id) |

## inventory

Bảng số dư tồn tổng hợp của kho chung theo từng biến thể; có thể dựng lại từ sổ kho, không thuộc lõi chuẩn hóa độc lập.

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `product_variant_id` | uuid | Không | — | UQ; FK → public.product_variant(id) |
| `quantity_in_stock` | integer | Không | `0` | — |
| `minimum_stock` | integer | Không | `0` | — |
| `last_updated_at` | timestamptz | Không | `now()` | — |

## inventory_transaction

Lưu lịch sử nhập kho, xuất kho và điều chỉnh tồn kho

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `product_variant_id` | uuid | Không | — | FK → public.product_variant(id) |
| `transaction_type` | text | Không | — | — |
| `quantity` | integer | Không | — | — |
| `note` | text | Có | — | — |
| `staff_id` | uuid | Có | — | FK → public.staff(id) |
| `created_at` | timestamptz | Không | `now()` | — |
| `purchase_order_detail_id` | uuid | Có | — | FK → public.purchase_order_detail(id) |
| `sales_order_detail_id` | uuid | Có | — | FK → public.sales_order_detail(id) |
| `return_request_detail_id` | uuid | Có | — | FK → public.return_request_detail(id) |
| `idempotency_key` | text | Không | — | UQ |
| `recorded_at` | timestamptz | Không | `now()` | — |

## payment_method_config

Lưu thông tin các loại phương thức thanh toán khả dụng

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `name` | text | Không | — | — |
| `short_name` | text | Có | — | — |
| `description` | text | Có | — | — |
| `icon` | text | Có | — | — |
| `fee` | numeric(18,4) | Không | `0` | — |
| `available` | boolean | Không | `true` | — |
| `requires_info` | boolean | Không | `false` | — |
| `redirect_url` | text | Có | — | — |
| `bank_info` | jsonb | Có | — | — |
| `created_at` | timestamptz | Không | `now()` | — |

## delivery_option_config

Lưu thông tin các hình thức giao hàng

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `name` | text | Không | — | — |
| `description` | text | Có | — | — |
| `fee` | numeric(18,4) | Không | `0` | — |
| `estimated_days` | integer | Có | — | — |
| `icon` | text | Có | — | — |
| `available` | boolean | Không | `true` | — |
| `created_at` | timestamptz | Không | `now()` | — |

## shipping_provider

Lưu danh sách các đơn vị vận chuyển mà PawPal sử dụng để giao đơn hàng, giúp Admin quản lý đối tác giao hàng và liên

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `provider_name` | text | Không | — | — |
| `provider_code` | text | Không | — | — |
| `logo_url` | text | Có | — | — |
| `contact_phone` | text | Có | — | — |
| `tracking_url` | text | Có | — | — |
| `status` | text | Không | `'active'` | — |
| `created_at` | timestamptz | Không | `now()` | — |
| `updated_at` | timestamptz | Không | `now()` | — |

## payment

Lưu lịch sử thanh toán, phương thức thanh toán và trạng thái giao dịch

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `payment_code` | text | Không | — | UQ |
| `customer_id` | uuid | Không | — | FK → public.customer(id) |
| `payment_method_config_id` | uuid | Không | — | FK → public.payment_method_config(id) |
| `payment_type` | text | Không | — | — |
| `amount` | numeric(18,4) | Không | — | — |
| `transaction_status` | text | Không | `'pending'` | — |
| `succeeded_at` | timestamptz | Có | — | — |
| `created_at` | timestamptz | Không | `now()` | — |
| `updated_at` | timestamptz | Không | `now()` | — |
| `gateway_transaction_id` | text | Có | — | — |
| `idempotency_key` | text | Không | — | UQ |
| `order_id` | uuid | Có | — | FK → public.sales_order(id) |
| `appointment_id` | uuid | Có | — | FK → public.appointment(id) |
| `eligible_spend_amount` | numeric(18,4) | Không | `0` | — |

## refund_transaction

Lưu giao dịch hoàn tiền hoặc bồi thường thực tế phát sinh từ một support ticket đã được phê duyệt xử lý. Đây là thực thể ghi nhận dòng tiền, tách biệt với quá trình tiếp nhận và xử lý khiếu nại.

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `refund_code` | text | Không | — | UQ |
| `ticket_id` | uuid | Có | — | FK → public.support_ticket(id) |
| `payment_id` | uuid | Không | — | FK → public.payment(id) |
| `refund_type` | text | Không | — | — |
| `requested_amount` | numeric(18,4) | Không | — | — |
| `approved_amount` | numeric(18,4) | Không | — | — |
| `refunded_amount` | numeric(18,4) | Không | — | — |
| `refund_method` | text | Không | — | — |
| `refund_status` | text | Không | `'pending'` | — |
| `gateway_transaction_id` | text | Có | — | — |
| `note` | text | Có | — | — |
| `processed_by` | uuid | Có | — | FK → public.staff(id) |
| `processed_at` | timestamptz | Có | — | — |
| `completed_at` | timestamptz | Có | — | — |
| `created_at` | timestamptz | Không | `now()` | — |
| `updated_at` | timestamptz | Không | `now()` | — |
| `return_request_id` | uuid | Có | — | FK → public.return_request(id) |
| `eligible_refund_amount` | numeric(18,4) | Không | `0` | — |

## return_request

Lưu yêu cầu đổi trả sản phẩm và thông tin hậu mãi

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `sales_order_id` | uuid | Không | — | FK → public.sales_order(id) |
| `resolution_type` | text | Có | — | — |
| `resolved_by` | uuid | Có | — | FK → public.staff(id) |
| `reason` | text | Không | — | — |
| `return_type` | text | Không | — | — |
| `description` | text | Có | — | — |
| `request_status` | text | Không | `'pending'` | — |
| `created_at` | timestamptz | Không | `now()` | — |
| `updated_at` | timestamptz | Không | `now()` | — |

## return_request_detail

Lưu chi tiết sản phẩm được đổi trả

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `return_request_id` | uuid | Không | — | FK → public.return_request(id) |
| `quantity` | integer | Không | — | — |
| `sales_order_detail_id` | uuid | Không | — | FK → public.sales_order_detail(id) |

## return_request_evidence

Ảnh bằng chứng của yêu cầu trả hàng.

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `return_request_id` | uuid | Không | — | FK → public.return_request(id) |
| `image_url` | text | Không | — | — |
| `display_order` | integer | Không | `0` | — |
| `created_at` | timestamptz | Không | `now()` | — |

## review

Lưu đánh giá của khách hàng cho sản phẩm hoặc dịch vụ

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `rating` | integer | Không | — | — |
| `review_content` | text | Có | — | — |
| `review_status` | text | Không | `'pending'` | — |
| `created_at` | timestamptz | Không | `now()` | — |
| `updated_at` | timestamptz | Không | `now()` | — |
| `sales_order_detail_id` | uuid | Có | — | FK → public.sales_order_detail(id) |
| `appointment_item_id` | uuid | Có | — | FK → public.appointment_item(id) |

## review_response

Lưu phản hồi của Admin đối với đánh giá của khách hàng

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `review_id` | uuid | Không | — | FK → public.review(id) |
| `staff_id` | uuid | Không | — | FK → public.staff(id) |
| `response_content` | text | Không | — | — |
| `created_at` | timestamptz | Không | `now()` | — |
| `updated_at` | timestamptz | Không | `now()` | — |

## review_media

Ảnh minh chứng đính kèm đánh giá.

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `review_id` | uuid | Không | — | FK → public.review(id) |
| `image_url` | text | Không | — | — |
| `display_order` | integer | Không | `0` | — |
| `created_at` | timestamptz | Không | `now()` | — |

## support_ticket

Lưu các yêu cầu hỗ trợ, khiếu nại, tranh chấp và yêu cầu xử lý phát sinh từ khách hàng trong quá trình sử dụng dịch vụ/mua hàng. Đây là thực thể trung tâm để theo dõi toàn bộ vụ việc từ lúc tiếp nhận đến khi giải quyết và đóng yêu cầu.

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `ticket_code` | text | Không | — | UQ |
| `customer_id` | uuid | Có | — | FK → public.customer(id) |
| `order_id` | uuid | Có | — | FK → public.sales_order(id) |
| `appointment_id` | uuid | Có | — | FK → public.appointment(id) |
| `channel` | text | Không | — | — |
| `category` | text | Không | — | — |
| `subject` | text | Không | — | — |
| `description` | text | Có | — | — |
| `priority` | text | Không | — | — |
| `type` | text | Không | — | — |
| `status` | text | Không | `'pending'` | — |
| `requested_resolution` | text | Có | — | — |
| `requested_amount` | numeric(18,4) | Có | — | — |
| `assigned_staff_id` | uuid | Có | — | FK → public.staff(id) |
| `first_response_at` | timestamptz | Có | — | — |
| `investigation_note` | text | Có | — | — |
| `resolution_type` | text | Có | — | — |
| `resolution_note` | text | Có | — | — |
| `approved_amount` | numeric(18,4) | Có | — | — |
| `resolved_by` | uuid | Có | — | FK → public.staff(id) |
| `resolved_at` | timestamptz | Có | — | — |
| `closed_at` | timestamptz | Có | — | — |
| `rating` | integer | Có | — | — |
| `rating_comment` | text | Có | — | — |
| `created_at` | timestamptz | Không | `now()` | — |
| `updated_at` | timestamptz | Không | `now()` | — |
| `created_by_account_id` | uuid | Có | — | FK → auth.users(id) |

## support_ticket_message

Lưu toàn bộ nội dung trao đổi, phản hồi, bằng chứng và ghi chú trong quá trình xử lý một support ticket.

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `ticket_id` | uuid | Không | — | FK → public.support_ticket(id) |
| `sender_type` | text | Không | — | — |
| `content` | text | Không | — | — |
| `is_internal` | boolean | Không | `false` | — |
| `created_at` | timestamptz | Không | `now()` | — |
| `sender_account_id` | uuid | Có | — | FK → auth.users(id) |
| `sender_guest_session_id` | uuid | Có | — | FK → public.guest_session(id) |

## support_ticket_message_attachment

Tệp đính kèm của từng tin nhắn hỗ trợ.

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `message_id` | uuid | Không | — | FK → public.support_ticket_message(id) |
| `file_url` | text | Không | — | — |
| `file_name` | text | Không | — | — |
| `file_size` | bigint | Không | — | — |
| `media_type` | text | Không | — | — |
| `display_order` | integer | Không | `0` | — |
| `created_at` | timestamptz | Không | `now()` | — |

## staff

Lưu thông tin tài khoản nhân viên, lễ tân, chuyên môn, CSKH và quản lý

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `full_name` | text | Không | — | — |
| `phone_number` | text | Có | — | — |
| `job_title` | text | Không | — | — |
| `specialization` | text | Có | — | — |
| `hire_date` | date | Có | — | — |
| `email` | text | Có | — | — |
| `address` | text | Có | — | — |
| `dob` | date | Có | — | — |
| `service_locked` | boolean | Không | `false` | — |
| `created_at` | timestamptz | Không | `now()` | — |
| `updated_at` | timestamptz | Không | `now()` | — |
| `auth_user_id` | uuid | Không | — | UQ; FK → auth.users(id) |
| `staff_level_id` | uuid | Có | — | FK → public.staff_level(id) |
| `employment_status` | text | Không | `'active'` | — |
| `must_change_password` | boolean | Không | `false` | — |

## staff_schedule

Lưu lịch làm việc, ca trực và thời gian hoạt động của nhân viên

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `staff_id` | uuid | Không | — | FK → public.staff(id) |
| `availability_status` | text | Không | `'available'` | — |
| `reason` | text | Có | — | — |
| `schedule_status` | text | Không | `'active'` | — |
| `created_at` | timestamptz | Không | `now()` | — |
| `updated_at` | timestamptz | Không | `now()` | — |
| `start_at` | timestamptz | Không | — | — |
| `end_at` | timestamptz | Không | — | — |

## staff_assessment

Lưu các lần sát hạch hoặc đánh giá kỹ năng thực tế của nhân viên.

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `staff_id` | uuid | Không | — | FK → public.staff(id) |
| `assessment_date` | date | Không | — | — |
| `assessment_type` | text | Không | — | — |
| `score` | numeric(5,2) | Không | — | — |
| `result` | text | Không | — | — |
| `note` | text | Có | — | — |
| `assessed_by` | uuid | Không | — | FK → public.staff(id) |
| `created_at` | timestamptz | Không | `now()` | — |
| `updated_at` | timestamptz | Không | `now()` | — |

## staff_shift_request

Lưu yêu cầu xin đổi ca, xin nghỉ phép hoặc vắng mặt của nhân viên

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `request_type` | text | Không | — | — |
| `staff_id` | uuid | Không | — | FK → public.staff(id) |
| `target_staff_id` | uuid | Có | — | FK → public.staff(id) |
| `replacement_staff_id` | uuid | Có | — | FK → public.staff(id) |
| `leave_type` | text | Có | — | — |
| `start_date` | date | Không | — | — |
| `end_date` | date | Không | — | — |
| `shift` | text | Không | — | — |
| `target_date` | date | Có | — | — |
| `target_shift` | text | Có | — | — |
| `reason` | text | Không | — | — |
| `status` | text | Không | `'pending'` | — |
| `created_by` | uuid | Không | — | FK → auth.users(id) |
| `reviewed_by` | uuid | Có | — | FK → auth.users(id) |
| `reviewed_at` | timestamptz | Có | — | — |
| `created_at` | timestamptz | Không | `now()` | — |

## promotion

Lưu các chương trình khuyến mãi đang áp dụng

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `promotion_name` | text | Không | — | — |
| `description` | text | Có | — | — |
| `discount_type` | text | Không | — | — |
| `discount_value` | numeric(18,4) | Không | — | — |
| `start_date` | date | Không | — | — |
| `end_date` | date | Không | — | — |
| `minimum_order_value` | numeric(18,4) | Không | `0` | — |
| `status` | text | Không | `'pending'` | — |
| `created_at` | timestamptz | Không | `now()` | — |
| `updated_at` | timestamptz | Không | `now()` | — |

## promotion_product

Lưu danh sách sản phẩm được áp dụng trong chương trình khuyến mãi

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `promotion_id` | uuid | Không | — | FK → public.promotion(id) |
| `product_variant_id` | uuid | Không | — | FK → public.product_variant(id) |

## promotion_service

Lưu danh sách dịch vụ được áp dụng trong chương trình khuyến mãi

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `promotion_id` | uuid | Không | — | FK → public.promotion(id) |
| `service_id` | uuid | Không | — | FK → public.service(id) |

## banner

Lưu thông tin Banner quảng bá hiển thị trên website, gồm hình ảnh, tiêu đề, liên kết và thời gian hiển thị.

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `image_url` | text | Không | — | — |
| `title` | text | Không | — | — |
| `description` | text | Có | — | — |
| `link` | text | Có | — | — |
| `button_text` | text | Có | — | — |
| `display_order` | integer | Không | `0` | — |
| `start_date` | date | Có | — | — |
| `end_date` | date | Có | — | — |
| `status` | text | Không | `'pending'` | — |
| `created_at` | timestamptz | Không | `now()` | — |
| `updated_at` | timestamptz | Không | `now()` | — |

## blog_category

Lưu danh mục bài viết

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `category_name` | text | Không | — | — |
| `description` | text | Có | — | — |
| `display_order` | integer | Không | `0` | — |
| `status` | text | Không | `'active'` | — |
| `created_at` | timestamptz | Không | `now()` | — |
| `updated_at` | timestamptz | Không | `now()` | — |

## blog_post

Lưu bài viết chia sẻ kiến thức và tin tức trên website

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `category_id` | uuid | Không | — | FK → public.blog_category(id) |
| `title` | text | Không | — | — |
| `slug` | text | Không | — | UQ |
| `summary` | text | Có | — | — |
| `content` | text | Không | — | — |
| `thumbnail_url` | text | Có | — | — |
| `author_id` | uuid | Không | — | FK → public.staff(id) |
| `publish_at` | timestamptz | Có | — | — |
| `status` | text | Không | `'pending'` | — |
| `view_count` | integer | Không | `0` | — |
| `created_at` | timestamptz | Không | `now()` | — |
| `updated_at` | timestamptz | Không | `now()` | — |

## notification

Lưu các thông báo gửi đến khách hàng về trạng thái đơn hàng, lịch hẹn, yêu cầu hỗ trợ và giao dịch hoàn tiền; các FK liên quan giúp xác định chính xác đối tượng mà thông báo dẫn đến.

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `customer_id` | uuid | Không | — | FK → public.customer(id) |
| `notification_type` | text | Không | — | — |
| `title` | text | Không | — | — |
| `content` | text | Không | — | — |
| `sales_order_id` | uuid | Có | — | FK → public.sales_order(id) |
| `appointment_id` | uuid | Có | — | FK → public.appointment(id) |
| `support_ticket_id` | uuid | Có | — | FK → public.support_ticket(id) |
| `refund_transaction_id` | uuid | Có | — | FK → public.refund_transaction(id) |
| `sent_at` | timestamptz | Không | `now()` | — |
| `read_at` | timestamptz | Có | — | — |

## pawpal_setting

Lưu các cấu hình chung của website như hotline, popup, top-bar và các thiết lập hệ thống khác.

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `setting_key` | text | Không | — | UQ |
| `setting_value` | text | Không | — | — |
| `setting_type` | text | Không | — | — |
| `description` | text | Có | — | — |
| `created_at` | timestamptz | Không | `now()` | — |
| `updated_at` | timestamptz | Không | `now()` | — |

## audit_log

Lưu lịch sử thao tác quan trọng của nhân viên nhằm phục vụ kiểm tra và truy vết hệ thống

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `staff_id` | uuid | Có | — | FK → public.staff(id) |
| `action` | text | Không | — | — |
| `entity_name` | text | Có | — | — |
| `entity_id` | uuid | Có | — | — |
| `description` | text | Có | — | — |
| `created_at` | timestamptz | Không | `now()` | — |

## chat_conversation

Quản lý các phiên hội thoại trực tuyến giữa khách hàng và AI Chatbot hoặc nhân viên tư vấn

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `customer_id` | uuid | Có | — | FK → public.customer(id) |
| `status` | text | Không | `'pending'` | — |
| `sentiment_level` | integer | Không | — | FK → public.chatbot_sentiment_tier(level) |
| `sentiment_trend` | text | Không | — | — |
| `is_urgent` | boolean | Không | `false` | — |
| `assigned_staff_id` | uuid | Có | — | FK → public.staff(id) |
| `ai_summary` | text | Có | — | — |
| `internal_note` | text | Có | — | — |
| `sla_deadline` | timestamptz | Có | — | — |
| `resolved_at` | timestamptz | Có | — | — |
| `resolved_reason` | text | Có | — | — |
| `resolved_by` | uuid | Có | — | FK → public.staff(id) |
| `violation_count` | integer | Không | `0` | — |
| `blocked_until` | timestamptz | Có | — | — |
| `channel` | text | Không | — | — |
| `created_at` | timestamptz | Không | `now()` | — |
| `updated_at` | timestamptz | Không | `now()` | — |
| `guest_session_id` | uuid | Có | — | FK → public.guest_session(id) |

## chat_message

Lưu từng tin nhắn chi tiết trong các phiên hội thoại chat

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `conversation_id` | uuid | Không | — | FK → public.chat_conversation(id) |
| `sender_type` | text | Không | — | — |
| `content` | text | Không | — | — |
| `raw_content` | text | Có | — | — |
| `is_toxic` | boolean | Không | `false` | — |
| `sentiment_score` | numeric(18,4) | Không | — | — |
| `metadata` | jsonb | Không | `'{}'::jsonb` | — |
| `created_at` | timestamptz | Không | `now()` | — |
| `sender_account_id` | uuid | Có | — | FK → auth.users(id) |
| `sender_guest_session_id` | uuid | Có | — | FK → public.guest_session(id) |

## chat_moderation_log

Nhật ký kiểm duyệt nội dung tin nhắn và ghi nhận các vi phạm quy chuẩn giao tiếp

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `conversation_id` | uuid | Không | — | FK → public.chat_conversation(id) |
| `customer_id` | uuid | Có | — | FK → public.customer(id) |
| `detected_keywords` | text[] | Không | `'{}'::text[]` | — |
| `violation_count` | integer | Không | `0` | — |
| `action_taken` | text | Không | — | — |
| `notes` | text | Có | — | — |
| `created_at` | timestamptz | Không | `now()` | — |

## chat_feedback

Ghi nhận một đánh giá hài lòng cho mỗi hội thoại.

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `conversation_id` | uuid | Không | — | UQ; FK → public.chat_conversation(id) |
| `score` | smallint | Không | — | — |
| `comment` | text | Có | — | — |
| `submitted_at` | timestamptz | Không | `now()` | — |

## admin_copilot_history

Lưu tin nhắn trợ lý nội bộ theo phiên của từng nhân viên.

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `session_id` | uuid | Không | — | — |
| `staff_id` | uuid | Không | — | FK → public.staff(id) |
| `role` | text | Không | — | — |
| `content` | text | Không | — | — |
| `metadata` | jsonb | Không | `'{}'::jsonb` | — |
| `created_at` | timestamptz | Không | `now()` | — |

## chatbot_sentiment_tier

Bảng phân tầng các cấp độ cảm xúc của khách hàng (Bình thường, Bức xúc, Khẩn cấp) kèm cam kết phản hồi SLA

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `level` | integer | Không | — | PK |
| `name` | text | Không | — | — |
| `color_badge` | text | Không | — | — |
| `sla_seconds` | integer | Không | — | — |
| `description` | text | Có | — | — |

## chatbot_sentiment_trigger

Danh sách các mẫu từ khóa và biểu thức nhận diện cảm xúc khách hàng của hệ thống AI Chatbot

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `tier_level` | integer | Không | — | FK → public.chatbot_sentiment_tier(level) |
| `trigger_pattern` | text | Không | — | — |
| `weight` | numeric(10,4) | Không | — | — |
| `context_domain` | text | Không | — | — |
| `is_active` | boolean | Không | `true` | — |

## chatbot_sentiment_action

Quy định các hành vi phản ứng tự động của chatbot tương ứng với từng cấp độ cảm xúc

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `tier_level` | integer | Không | — | FK → public.chatbot_sentiment_tier(level) |
| `bot_behavior` | text | Không | — | — |
| `notify_admin` | boolean | Không | `false` | — |
| `suggested_canned_id` | uuid | Có | — | FK → public.chatbot_canned_response(id) |
| `instructions` | text | Có | — | — |

## chatbot_compensation_policy

Chính sách đền bù và tặng điểm Pawpoint tự động khi khách hàng gặp sự cố dịch vụ

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `issue_type` | text | Không | — | — |
| `max_points` | integer | Không | — | — |
| `max_discount_vnd` | numeric(18,4) | Không | — | — |
| `approval_required` | boolean | Không | `false` | — |
| `description` | text | Có | — | — |
| `is_active` | boolean | Không | `true` | — |

## chatbot_handover_rule

Quy tắc tự động bàn giao cuộc trò chuyện từ Bot sang nhân viên chuyên môn như KTV Grooming hoặc CSKH; không có thú y.

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `condition_name` | text | Không | — | — |
| `trigger_type` | text | Không | — | — |
| `threshold_value` | numeric(18,4) | Không | — | — |
| `auto_assign_role` | text | Có | — | FK → public.access_role(code) |
| `sla_seconds` | integer | Không | — | — |
| `is_active` | boolean | Không | `true` | — |

## chatbot_knowledge_faq

Kho tri thức các câu hỏi thường gặp FAQ phục vụ giải đáp tự động cho khách hàng

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `category` | text | Không | — | — |
| `question` | text | Không | — | — |
| `answer` | text | Không | — | — |
| `keywords` | text[] | Không | `'{}'::text[]` | — |
| `priority` | integer | Không | — | — |
| `is_active` | boolean | Không | `true` | — |
| `created_at` | timestamptz | Không | `now()` | — |
| `updated_at` | timestamptz | Không | `now()` | — |

## chatbot_system_prompt

Quản lý các System Prompt cấu hình nhân cách (Persona), phong cách giao tiếp và hướng dẫn hành vi của AI Chatbot

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `prompt_key` | text | Không | — | UQ |
| `channel` | text | Không | — | — |
| `persona_name` | text | Không | — | — |
| `tone_of_voice` | text | Không | — | — |
| `content` | text | Không | — | — |
| `is_active` | boolean | Không | `true` | — |
| `created_at` | timestamptz | Không | `now()` | — |
| `updated_at` | timestamptz | Không | `now()` | — |

## chatbot_canned_response

Danh mục các câu trả lời nhanh soạn sẵn cho nhân viên CSKH và Chatbot

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `shortcut` | text | Không | — | — |
| `title` | text | Không | — | — |
| `content` | text | Không | — | — |
| `category` | text | Không | — | — |
| `usage_count` | integer | Không | `0` | — |
| `is_active` | boolean | Không | `true` | — |
| `created_at` | timestamptz | Không | `now()` | — |

## chatbot_profanity_filter

Danh mục các từ ngữ nhạy cảm, thô tục cần tự động che hoặc chặn trong phiên chat

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `keyword` | text | Không | — | — |
| `severity` | text | Không | — | — |
| `action` | text | Không | — | — |
| `replacement_text` | text | Có | — | — |
| `is_active` | boolean | Không | `true` | — |
| `created_at` | timestamptz | Không | `now()` | — |

## chatbot_scenario_matrix

Ma trận các kịch bản kiểm thử (benchmark) đánh giá chất lượng phản hồi và độ chính xác của AI Chatbot

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `scenario_name` | text | Không | — | — |
| `sample_user_input` | text | Không | — | — |
| `expected_sentiment` | integer | Không | — | — |
| `expected_tool_call` | text | Có | — | — |
| `expected_handover` | boolean | Không | `false` | — |
| `benchmark_status` | text | Không | `'pending'` | — |
| `created_at` | timestamptz | Không | `now()` | — |

## document_embeddings

Bảng lưu trữ vector embedding các đoạn tài liệu chính sách, cẩm nang chăm sóc thú cưng phục vụ tra cứu ngữ nghĩa RAG cho AI

| Cột | Kiểu | NULL | Default | Khóa |
|---|---|---|---|---|
| `id` | uuid | Không | `gen_random_uuid()` | PK |
| `content` | text | Không | — | — |
| `metadata` | jsonb | Không | `'{}'::jsonb` | — |
| `embedding` | extensions.vector | Không | — | — |
