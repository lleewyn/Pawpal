# Từ điển dữ liệu và sơ đồ ánh xạ danh tính chatbot Pawpal — G0-02

Ngày lập: 16/10/2026.  
Phạm vi: Đối chiếu dữ liệu nghiệp vụ, quan hệ danh tính, danh mục trạng thái và bản đồ điều hướng màn hình phục vụ phân hệ Chatbot Admin (Trực chat — Trợ lý AI — Quy định).  
Nguồn dữ liệu: Đối chiếu trực tiếp từ metadata OpenAPI, truy vấn mẫu CSDL Supabase thực tế, mã nguồn giao diện Admin (`admin.js`, các subtab) và script kiểm thử nghiệp vụ.

---

## 1. Sơ đồ ánh xạ danh tính và khóa liên kết (Identity Mapping)

Tuyệt đối **không mặc định các ID bằng nhau**. Dưới đây là quan hệ phân cấp định danh thực tế trong hệ thống:

```
[Supabase Auth (auth.users)]
       ▲                     ▲
       │ auth_user_id        │ auth_user_id
       │ (1-1, Nullable)     │ (1-1, Bắt buộc)
       │                     │
[customer]               [staff]
   ▲   ▲                    ▲
   │   │                    │
   │   └── customer_id (1-1)│
   │       └── [customer_profile]
   │
   ├── customer_id (1-1) ── [customer_membership]
   │
   ├── customer_id (1-n) ── [pet_profile]
   ├── customer_id (1-n) ── [sales_order]
   ├── customer_id (1-n) ── [appointment]
   ├── customer_id (1-n) ── [paw_point_transaction]
   │
   └── customer_id (1-n) ── [chat_conversation] ── assigned_staff_id (n-1) ── [staff]
                                   ▲
                                   │ conversation_id (1-n)
                            [chat_message]
                            (sender_id: trỏ về customer.id HOẶC staff.id)
```

### Chi tiết các thực thể danh tính:

| Thực thể | Khóa chính (PK) | Liên kết với Supabase Auth | Quy tắc và Lưu ý nghiệp vụ |
|---|---|---|---|
| **Khách hàng** (`customer`) | `id` (UUID) | `customer.auth_user_id` (UUID) | Khách đăng ký tài khoản web có `auth_user_id`. Khách vãng lai tạo nhanh tại quầy POS có `auth_user_id = null`. Không dùng `auth.users.id` thay cho `customer.id`. |
| **Hồ sơ khách** (`customer_profile`) | `id` (UUID) | Không liên kết trực tiếp | Khóa ngoại `customer_id` trỏ về `customer.id`. Lưu họ tên (`full_name`), ngày sinh (`date_of_birth`), giới tính (`gender`). |
| **Nhân sự** (`staff`) | `id` (UUID) | `staff.auth_user_id` (UUID) | Luôn có `auth_user_id` gắn với tài khoản đăng nhập Supabase Auth. Quản lý phân quyền qua cột `system_role` và `permissions` (JSONB). |
| **Hội thoại** (`chat_conversation`) | `id` (UUID) | Không | Khóa ngoại `customer_id` trỏ tới `customer.id` (khách hàng); `assigned_staff_id` trỏ tới `staff.id` (nhân viên tiếp quản ca). |
| **Tin nhắn** (`chat_message`) | `id` (UUID) | Không | Khóa ngoại `conversation_id` trỏ về `chat_conversation.id`. Cột `sender_type` quy định người gửi: `customer`, `staff`, `bot`. Cột `sender_id` (UUID) lưu `customer.id` nếu là khách, `staff.id` nếu là nhân viên, hoặc `null` nếu là bot. |
| **Phiếu hỗ trợ** (`support_ticket`) | `id` (UUID) | Không | Cột `user_id` có kiểu dữ liệu `character varying` (chuỗi) lưu ID hoặc số điện thoại của khách hàng, không phải khóa ngoại UUID cứng. |

---

## 2. Từ điển dữ liệu nghiệp vụ (Data Dictionary)

### 2.1. Khách hàng và Hội viên

#### Bảng `customer` (Khách hàng)
* `id` (uuid, PK): Mã định danh duy nhất của khách hàng.
* `auth_user_id` (uuid, FK, Nullable): Liên kết tới `auth.users.id`.
* `membership_tier_id` (uuid, FK, Nullable): Hạng thành viên hiện tại.
* `phone_main` (varchar, Unique): Số điện thoại chính dùng liên hệ và tra cứu.
* `email` (varchar, Nullable): Email khách hàng.
* `account_status` (enum `account_status_enum`): Trạng thái tài khoản (`ACTIVE`, `LOCKED`, `PENDING_ACTIVATION`).
* `is_temporary` (boolean): Đánh dấu khách vãng lai tạo nhanh chưa kích hoạt.
* `note` (text): Ghi chú đặc thù về khách hàng.

#### Bảng `customer_profile` (Thông tin cá nhân)
* `id` (uuid, PK): Mã hồ sơ.
* `customer_id` (uuid, FK): Trỏ tới `customer.id`.
* `full_name` (varchar): Họ và tên đầy đủ của chủ nuôi.
* `date_of_birth` (date): Ngày sinh.
* `gender` (enum `customer_gender_enum`): Giới tính (`MALE`, `FEMALE`, `OTHER`).

#### Bảng `customer_membership` (Số dư hội viên)
* `id` (uuid, PK): Mã bản ghi.
* `customer_id` (uuid, FK): Trỏ tới `customer.id`.
* `membership_tier_id` (uuid, FK): Trỏ tới `membership_tier.id`.
* `total_paw_points` (integer): Số dư điểm Pawpoint khả dụng hiện tại của khách.

---

### 2.2. Nhân sự

#### Bảng `staff` (Nhân viên và Chuyên viên)
* `id` (uuid, PK): Mã định danh nhân viên.
* `auth_user_id` (uuid, FK): Liên kết duy nhất tới `auth.users.id`.
* `full_name` (varchar): Họ và tên nhân viên.
* `phone_number` (varchar): Số điện thoại liên hệ.
* `email` (text): Email nội bộ.
* `system_role` (varchar): Vai trò quản trị (`ADMIN`, `RECEPTIONIST`, `GROOMER`, `CAREGIVER`, `CSKH`, `DRIVER`).
* `account_status` (varchar): Trạng thái tài khoản (`ACTIVE`, `LOCKED`, `PENDING_INVITE`).
* `permissions` (jsonb): Danh sách quyền chi tiết dạng JSONB.
* `must_change_password` (boolean): Cờ bắt buộc đổi mật khẩu lần đầu.

---

### 2.3. Thú cưng

#### Bảng `pet_profile` (Hồ sơ bé cưng)
* `id` (uuid, PK): Mã định danh bé cưng.
* `customer_id` (uuid, FK): Trỏ tới `customer.id` (Chủ sở hữu).
* `pet_code` (varchar): Mã hiển thị thú cưng (ví dụ: `PET-00123`).
* `pet_name` (varchar): Tên gọi của bé cưng.
* `species` (varchar): Loài thú cưng (`Chó`, `Mèo`...).
* `breed` (varchar): Giống loài (ví dụ: `Poodle`, `Mèo Anh lông ngắn`...).
* `gender` (enum `pet_gender_enum`): Giới tính (`MALE`, `FEMALE`).
* `date_of_birth` (date): Ngày sinh.
* `weight` (numeric): Cân nặng hiện tại (kg).
* `allergy` (text): Tiền sử dị ứng thức ăn/thuốc (quan trọng khi CSKH tư vấn).
* `routine` (text): Thói quen, tập tính, lưu ý an toàn.
* `vaccination_history` (text): Tóm tắt lịch sử tiêm phòng.
* `status` (enum `pet_status_enum`): Trạng thái hồ sơ (`ACTIVE`, `DECEASED`, `TRANSFERRED`).

---

### 2.4. Đơn hàng và Bán hàng

#### Bảng `sales_order` (Đơn hàng)
* `id` (uuid, PK): Mã định danh đơn hàng.
* `order_code` (varchar): Mã đơn hiển thị (ví dụ: `ORD-20261016-001`).
* `customer_id` (uuid, FK): Trỏ tới `customer.id`.
* `shipping_address_id` (uuid, FK): Trỏ tới địa chỉ giao hàng trong `customer_address`.
* `order_status` (enum `order_status_enum`): Trạng thái xử lý đơn hàng.
* `payment_status` (enum `payment_status_enum`): Trạng thái thanh toán.
* `total_amount` (numeric): Tổng giá trị thanh toán của đơn hàng.
* `note` (text): Ghi chú đơn hàng từ khách hoặc nhân viên quầy.

#### Bảng `sales_order_detail` (Chi tiết dòng hàng)
* `id` (uuid, PK): Mã dòng chi tiết.
* `sales_order_id` (uuid, FK): Trỏ tới `sales_order.id`.
* `product_id` (uuid, FK): Trỏ tới `product.id`.
* `quantity` (integer): Số lượng mua.
* `unit_price` (numeric): Đơn giá tại thời điểm mua.
* `total_price` (numeric): Thành tiền dòng hàng.

---

### 2.5. Dịch vụ và Lịch hẹn

#### Bảng `appointment` (Lịch hẹn dịch vụ)
* `id` (uuid, PK): Mã lịch hẹn.
* `appointment_code` (varchar): Mã hiển thị lịch hẹn.
* `customer_id` (uuid, FK): Trỏ tới `customer.id`.
* `pet_id` (uuid, FK): Trỏ tới `pet_profile.id`.
* `service_id` (uuid, FK): Trỏ tới `service.id`.
* `staff_id` (uuid, FK, Nullable): Trỏ tới `staff.id` (Kỹ thuật viên phụ trách).
* `appointment_date` (date): Ngày làm dịch vụ.
* `appointment_time` (time): Giờ hẹn.
* `appointment_status` (enum `appointment_status_enum`): Trạng thái lịch hẹn.
* `payment_status` (enum `payment_status_enum`): Trạng thái thanh toán dịch vụ.
* `total_price` (numeric): Chi phí dịch vụ thực tế.
* `change_count` (integer): Số lần dời lịch hẹn.

#### Bảng `service` (Danh mục dịch vụ)
* `id` (uuid, PK): Mã dịch vụ.
* `service_code` (varchar): Mã hiển thị dịch vụ.
* `service_name` (varchar): Tên dịch vụ (Tắm sấy, Grooming cắt tỉa, Khách sạn thú cưng...).
* `service_category` (enum `service_category_enum`): Phân loại dịch vụ.
* `estimated_duration` (integer): Thời lượng ước tính (phút).
* `status` (enum `service_status_enum`): Trạng thái kinh doanh dịch vụ (`ACTIVE`, `INACTIVE`).

---

### 2.6. Tồn kho và Sản phẩm

#### Bảng `product` (Sản phẩm)
* `id` (uuid, PK): Mã định danh sản phẩm.
* `category_id` (uuid, FK): Trỏ tới `product_category.id`.
* `product_name` (varchar): Tên sản phẩm.
* `sku` (varchar): Mã quản lý SKU duy nhất.
* `sale_price` (numeric): Giá bán niêm yết.
* `cost_price` (numeric): Giá vốn nhập.
* `status` (enum `product_status_enum`): Trạng thái bán (`ACTIVE`, `INACTIVE`, `DISCONTINUED`).

#### Bảng `inventory` (Tồn kho thực tế)
* `id` (uuid, PK): Mã dòng kho.
* `product_id` (uuid, FK): Trỏ tới `product.id`.
* `quantity_in_stock` (integer): Số lượng thực tế còn trong kho.
* `minimum_stock` (integer): Ngưỡng tồn kho tối thiểu (để cảnh báo sắp hết hàng).
* `last_updated_at` (timestamp with time zone): Mốc thời gian cập nhật kho gần nhất.

---

### 2.7. Phiếu hỗ trợ và Khiếu nại

#### Bảng `support_ticket` (Phiếu hỗ trợ)
* `id` (uuid, PK): Mã phiếu hỗ trợ.
* `user_id` (varchar): Lưu ID hoặc số điện thoại của khách hàng (dạng text).
* `title` (varchar): Tiêu đề tóm tắt khiếu nại hoặc sự cố.
* `type` (varchar): Phân loại sự cố (`service`, `booking`, `payment`, `health`, `contact`, `other`).
* `status` (varchar): Trạng thái xử lý ticket (`pending`, `processing`, `waiting_customer`, `completed`).
* `priority` (varchar): Mức độ ưu tiên (`Bình thường`, `Trung bình`, `Cao`).
* `rating` (integer, Nullable): Điểm đánh giá xử lý (1-5 sao).
* `rating_comment` (text, Nullable): Nhận xét phản hồi của khách hàng.

#### Bảng `support_ticket_message` (Trao đổi trong ticket)
* `id` (uuid, PK): Mã tin nhắn ticket.
* `ticket_id` (uuid, FK): Trỏ tới `support_ticket.id`.
* `sender_type` (varchar): Người phản hồi (`customer`, `staff`, `system`).
* `agent_name` (varchar): Tên hiển thị người phản hồi.
* `content` (text): Nội dung trao đổi giải quyết sự cố.

---

### 2.8. Điểm thưởng và Đổi quà

#### Bảng `paw_point_transaction` (Sổ cái giao dịch điểm)
* `id` (uuid, PK): Mã giao dịch điểm.
* `customer_id` (uuid, FK): Trỏ tới `customer.id`.
* `points` (integer): Số điểm biến động (+ là cộng, - là trừ/bồi hoàn/đổi quà).
* `balance_after` (integer): Số dư điểm khả dụng ngay sau khi giao dịch hoàn tất.
* `description` (text): Lý do phát sinh giao dịch.
* `reward_rule_id` (uuid, FK, Nullable): Quy tắc thưởng áp dụng.
* `created_at` (timestamp with time zone): Thời điểm ghi sổ.

---

### 2.9. Vận hành Chatbot và Trực chat

#### Bảng `chat_conversation` (Phiên hội thoại)
* `id` (uuid, PK): Mã phiên chat.
* `customer_id` (uuid, FK, Nullable): Trỏ tới `customer.id` (nếu khách đã định danh).
* `session_token` (varchar): Mã phiên ẩn danh phía client (widget).
* `status` (varchar): Trạng thái phiên (`bot_handling`, `waiting_agent`, `agent_handling`, `resolved`, `closed`).
* `sentiment_level` (integer): Mức cảm xúc hiện tại (1: Rất hài lòng đến 5: Rất giận dữ).
* `sentiment_trend` (varchar): Chiều hướng cảm xúc (`stable`, `escalating`, `de-escalating`).
* `is_urgent` (boolean): Cờ đánh dấu ca khẩn cấp (cần can thiệp ngay).
* `assigned_staff_id` (uuid, FK, Nullable): Trỏ tới `staff.id` (nhân viên tiếp quản).
* `ai_summary` (text, Nullable): Tóm tắt nội dung ca do AI sinh ra.
* `internal_note` (text, Nullable): Ghi chú nội bộ giữa các nhân viên trực chat.
* `sla_deadline` (timestamp with time zone, Nullable): Hạn xử lý SLA cam kết.
* `violation_count` (integer): Số lần phát hiện ngôn từ tiêu cực/vi phạm.
* `blocked_until` (timestamp with time zone, Nullable): Thời hạn tạm khóa chat.
* `channel` (varchar): Kênh hội thoại (CSDL chỉ chấp nhận giá trị `'web'`).

#### Bảng `chat_message` (Tin nhắn hội thoại)
* `id` (uuid, PK): Mã tin nhắn.
* `conversation_id` (uuid, FK): Trỏ tới `chat_conversation.id`.
* `sender_type` (varchar): Loại người gửi (`customer`, `bot`, `staff`, `system`).
* `sender_id` (uuid, Nullable): Trỏ tới `customer.id` hoặc `staff.id`.
* `sender_name` (varchar): Tên hiển thị người gửi.
* `content` (text): Nội dung tin nhắn hiển thị (đã qua kiểm duyệt/làm sạch nếu có).
* `raw_content` (text, Nullable): Nội dung nguyên văn (chỉ người có quyền xem).
* `is_toxic` (boolean): Cờ cảnh báo tin nhắn có yếu tố xúc phạm/độc hại.
* `sentiment_score` (numeric, Nullable): Điểm số cảm xúc tính toán.
* `metadata` (jsonb, Nullable): Dữ liệu đính kèm (sản phẩm, đơn hàng, gợi ý).

#### Bảng `chat_moderation_log` (Nhật ký kiểm duyệt ngôn từ)
* `id` (uuid, PK): Mã nhật ký.
* `conversation_id` (uuid, FK): Trỏ tới `chat_conversation.id`.
* `customer_id` (uuid, FK, Nullable): Trỏ tới `customer.id`.
* `detected_keywords` (text[]): Mảng các từ ngữ vi phạm được phát hiện.
* `violation_count` (integer): Số lần vi phạm tính đến thời điểm đó.
* `action_taken` (varchar): Hành động xử lý (`warn`, `mask`, `block_temp`, `handover_manager`).
* `notes` (text, Nullable): Ghi chú thêm từ hệ thống.

---

## 3. Danh mục trạng thái và Enum thực tế trong CSDL

| Bảng | Tên trường | Giá trị thực tế đã xác minh | Ghi chú nghiệp vụ |
|---|---|---|---|
| `sales_order` | `order_status` | `PENDING`, `PACKING`, `SHIPPING`, `DELIVERED`, `CANCELLED`, `RETURNED` | `PACKING` là chờ đóng gói/đã xác nhận; `DELIVERED` là đã giao/hoàn tất (không dùng `CONFIRMED`/`COMPLETED` trong SQL). |
| `sales_order` | `payment_status` | `PENDING`, `UNPAID`, `PAID` | Trạng thái thanh toán đơn hàng. |
| `appointment` | `appointment_status` | `PENDING`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED` | Vòng đời lịch hẹn dịch vụ từ chờ duyệt đến hoàn tất hoặc hủy. |
| `appointment` | `payment_status` | `PENDING`, `UNPAID`, `PAID` | Trạng thái thanh toán lịch hẹn. |
| `support_ticket` | `status` | `pending`, `processing`, `waiting_customer`, `completed` | Trạng thái phiếu hỗ trợ (lưu chữ thường). |
| `support_ticket` | `priority` | `Bình thường`, `Trung bình`, `Cao` | Mức ưu tiên xử lý ticket. |
| `support_ticket` | `type` | `service`, `booking`, `payment`, `health`, `contact`, `other` | Phân loại vấn đề phản ánh. |
| `chat_conversation` | `status` | `bot_handling`, `waiting_agent`, `agent_handling`, `resolved`, `closed` | Vòng đời ca chat: Bot trực → Chờ nhân viên → Nhân viên chat → Đã giải quyết → Đóng phiên. |
| `chat_conversation` | `sentiment_trend` | `stable`, `escalating`, `de-escalating` | Xu hướng diễn biến cảm xúc khách hàng. |
| `chat_conversation` | `channel` | `web` | Chỉ hỗ trợ kênh Web Chat nội bộ theo ràng buộc CHECK CSDL. |
| `chat_message` | `sender_type` | `customer`, `bot`, `staff`, `system` | Định danh vai trò tạo tin nhắn. |

---

## 4. Quy tắc quản lý điểm Pawpoint

1. **Nguồn số dư khả dụng**:
   - Lưu trữ chính thức tại `customer_membership.total_paw_points`.
   - Đối chiếu kiểm tra bằng trường `balance_after` của giao dịch mới nhất trong `paw_point_transaction`.
2. **Điểm xét hạng thành viên (Tier Qualifying Points)**:
   - Được tính bằng tổng chi tiêu tích lũy qua các đơn hàng/dịch vụ hoàn tất, không bị trừ khi khách đổi quà hoặc nhận bồi hoàn sự cố.
3. **Quy tắc cộng / trừ điểm bồi hoàn từ Chatbot**:
   - Khi chuyên viên CSKH bồi hoàn điểm cho khách qua modal hỗ trợ:
     * **Bắt buộc** ghi 1 bản ghi mới vào `paw_point_transaction` với `points` (số điểm cộng), `balance_after` (số dư mới sau cộng) và `description` (ghi rõ lý do sự cố).
     * Cập nhật đồng bộ `customer_membership.total_paw_points = newBalance`.
     * Ở các giai đoạn tiếp theo (G1 và G4), thao tác này **phải được chuyển sang Backend RPC có transaction bảo vệ**, tuyệt đối không để client tính toán số dư rồi ghi đè tự do.

---

## 5. Xác nhận đơn vị vận hành (Cửa hàng / Chi nhánh)

* **Hiện trạng dữ liệu thực tế**:
  - Không có bảng `branch` hoặc `store` trong CSDL.
  - Các bảng `sales_order`, `appointment`, `staff`, `inventory`, `chat_conversation` **không có cột `branch_id`**.
* **Kết luận nghiệm thu**:
  - Hệ thống Pawpal hiện tại vận hành theo mô hình **Đơn cửa hàng (Single Store)** tập trung.
  - Phân hệ Chatbot Admin **không triển khai phạm vi đa chi nhánh** để tránh sinh thêm mã nguồn phức tạp và dữ liệu rác không có thật trong CSDL.

---

## 6. Múi giờ nghiệp vụ và quy ước thời gian

* **Múi giờ chuẩn**: `Asia/Ho_Chi_Minh` (UTC+7).
* **Quy ước tính toán mốc thời gian**:
  - **"Hôm nay"**: Tính từ `00:00:00` đến `23:59:59` của ngày hiện tại theo giờ Việt Nam.
  - **"24 giờ qua"**: Khoảng thời gian từ `NOW() - INTERVAL '24 hours'` đến thời điểm hiện tại.
  - **"Đang chờ" (Ca chat cần hỗ trợ)**: Phiên hội thoại thỏa mãn:
    * `status = 'waiting_agent'` (khách yêu cầu gặp nhân viên hoặc bot chuyển giao).
    * HOẶC `status = 'bot_handling' AND is_urgent = true` (phát hiện ca khẩn cấp hoặc cảm xúc tiêu cực vượt ngưỡng).
  - **"Sắp hết hàng"**: Mặt hàng trong bảng `inventory` có số lượng tồn kho `quantity_in_stock <= minimum_stock` (thông thường ngưỡng mặc định là `<= 5`).

---

## 7. Bản đồ điều hướng màn hình Admin (Deep Navigation Map)

Khi người dùng nhấn các nút thao tác nhanh từ bảng điều khiển Chatbot hoặc Copilot ("Mở đơn", "Mở ca", "Mở ticket", "Xem hồ sơ khách"), hệ thống điều hướng chính xác theo hash URL và lưu trạng thái vào `sessionStorage`:

| Thao tác trên giao diện Chatbot | Màn hình đích (Hash URL) | Trạng thái lưu `sessionStorage` | Tác vụ hiển thị tương ứng |
|---|---|---|---|
| **Mở đơn hàng** | `#tab-order-detail` | `sessionStorage.setItem('pawpal_admin_order_subtab', 'tab-order-detail')`<br>`sessionStorage.setItem('pawpal_admin_selected_order_id', orderId)` | Mở thẳng hồ sơ 360° của đơn hàng có mã tương ứng. Nếu không có ID đơn thì về `#tab-order-list`. |
| **Mở lịch hẹn dịch vụ** | `#tab-service-detail` | `sessionStorage.setItem('pawpal_admin_services_active_subtab', 'tab-service-detail')`<br>`sessionStorage.setItem('pawpal_admin_selected_appointment_id', appointmentId)` | Mở chi tiết ca hẹn. Nếu không có ID hẹn thì chuyển về danh sách `#tab-service-bookings`. |
| **Mở ca chat (Live Support)** | `#tab-live-support` | `sessionStorage.setItem('pawpal_admin_chatbot_subtab', 'tab-live-support')`<br>`sessionStorage.setItem('pawpal_admin_current_conversation_id', conversationId)` | Mở subtab Trực chat và kích hoạt ngay khung chat với hội thoại được chọn. |
| **Mở hồ sơ khách hàng** | `#tab-customer-profile` | `sessionStorage.setItem('pawpal_admin_customer_active_subtab', 'tab-customer-profile')`<br>`sessionStorage.setItem('pawpal_admin_selected_customer_id', customerId)` | Mở hồ sơ 360° của khách hàng, nạp thông tin thú cưng và lịch sử tương tác. |
| **Mở phiếu khiếu nại (Ticket)** | `#tab-complaint-detail` | `sessionStorage.setItem('pawpal_admin_complaint_active_subtab', 'tab-complaint-detail')`<br>`sessionStorage.setItem('pawpal_admin_selected_ticket_id', ticketId)` | Mở màn hình giải quyết khiếu nại chi tiết. Nếu không có ID thì về `#tab-complaint-services` hoặc `#tab-complaint-orders`. |

---

## 8. Danh mục chênh lệch giữa tài liệu cũ và CSDL thực tế

| Thành phần | Trong tài liệu cũ / Master Plan | Thực tế CSDL Supabase | Xử lý chuẩn hóa |
|---|---|---|---|
| Chi tiết đơn hàng | Gọi là `sales_order_item` | Tên bảng thực tế là `sales_order_detail` | Dùng chuẩn `sales_order_detail`. |
| Trạng thái đơn | Dùng `CONFIRMED`, `COMPLETED` | Enum CSDL dùng `PACKING`, `DELIVERED` | Đã ánh xạ `PACKING` = xác nhận; `DELIVERED` = hoàn tất. |
| Bảng điểm hội viên | Đề cập `customer_point` hoặc `points` trong `customer` | Tách riêng `customer_membership` (số dư) và `paw_point_transaction` (sổ cái) | Truy vấn số dư từ `customer_membership` và ghi log vào `paw_point_transaction`. |
| Khóa liên kết ticket | Giả định `user_id` là khóa ngoại UUID tới `customer.id` | Cột `support_ticket.user_id` có kiểu `VARCHAR` | Lưu chuỗi `customer.id` dạng text; không ép kiểu quan hệ FK cứng trong SQL nếu chưa migration. |
| Kênh hội thoại | Đề cập `web_chat`, `zalo`, `facebook` | Ràng buộc CHECK `chat_conversation_channel_check` chỉ chấp nhận `'web'` | Ở bản đầu, chỉ ghi nhận `channel = 'web'`. Các kênh ngoài nếu có chỉ là nguồn phụ thuộc đối chiếu luồng. |
| Cột hoàn tất & CSAT | Giả định có sẵn `resolved_at`, `csat_score` | 6 cột này chưa được áp dụng trên bảng `chat_conversation` | Sử dụng cột `status = 'resolved'` và `internal_note` tạm thời; không gọi các cột chưa tồn tại tránh lỗi 42703. |
| Quản lý chi nhánh | Đề xuất lọc dữ liệu theo chi nhánh | Không có bảng `branch` và không có cột `branch_id` | Đơn giản hóa kiến trúc theo mô hình Đơn cửa hàng (Single Store). |
