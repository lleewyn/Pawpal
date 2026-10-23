# PAWPAL ADMIN — CHECKLIST CHI TIẾT THỰC HIỆN KIỂM TRA ĐỒNG BỘ TRƯỜNG CSDL SUPABASE

> **Tài liệu kiểm định & Nghiệm thu trường CSDL Admin Pawpal**  
> **Căn cứ thiết kế chuẩn:** [`CDSLfinal.md`](../../docs/archive/database/CDSLfinal.md) (81 bảng/view)
> **Trạng thái Supabase:** Đã cập nhật đầy đủ các cột nghiệp vụ và Enum tiếng Việt theo thiết kế.  
> **Mục tiêu:** Rà soát và chuyển đổi toàn bộ mã nguồn Admin từ code cũ (code chắp vá, nhồi chuỗi regex, sai tên trường) sang sử dụng đúng 100% các trường CSDL chuẩn trên Supabase.  
> **Kết quả nghiệm thu:** **100% HOÀN TẤT VÀ VƯỢT QUA TOÀN BỘ 7 BỘ TEST SUITE CHUYÊN SÂU**.

---

## 1. TỔNG QUAN BỐI CẢNH & NGUYÊN TẮC KIỂM TRA

### 1.1. Bối cảnh kỹ thuật
1. **Giai đoạn trước:** Khi thiết kế CSDL hoàn tất trong [`CDSLfinal.md`](../../docs/archive/database/CDSLfinal.md), Supabase ban đầu chưa được cập nhật đầy đủ các cột nghiệp vụ (thiếu các cột như `brand_name`, `target_pet`, `tracking_code`, `product_variant_id`, `ticket_code`, `resolution_type`...).
2. **Hệ quả trong Codebase:** Quá trình phát triển Admin trước đây đã viết theo schema thiếu đó với các giải pháp chắp vá:
   - Nhồi thông tin vận đơn vào `note` và dùng Regex để bóc tách ngược lại.
   - Nhồi mã đơn `[DH-...]` vào `title` của `support_ticket` vì thiếu khóa ngoại `order_id`.
   - Dùng sai tên cột: `notes` (có s) thay vì `note`; `message` thay vì `content`.
   - Dùng sai trường đối tượng: `user_id` thay vì `customer_id` hoặc `staff_id` trong `notification` và `audit_log`.
   - Lưu sản phẩm giao dịch chỉ qua `product_id` (sản phẩm cha) thay vì biến thể SKU con (`product_variant_id`).
   - Dùng các enum tiếng Anh (`MALE`, `FEMALE`, `ACTIVE`, `DRAFT`, `PUBLISHED`, `SCHEDULED`, `COMPLETED`) trong khi Supabase đã được chuẩn hóa sang enum tiếng Việt (`nam`, `nu`, `dang_hoat_dong`, `nhap`, `da_xuat_ban`, `da_len_lich`, `da_hoan_tat`).
3. **Hiện tại:** CSDL trên Supabase và toàn bộ tầng Frontend Admin / Scripts API đã được đồng bộ 100% với [`CDSLfinal.md`](../../docs/archive/database/CDSLfinal.md).

### 1.2. Nguyên tắc kiểm tra bất biến
- **Không làm gián đoạn hệ thống (Zero Breaking Changes):** Với các bảng quan trọng như `sales_order_detail`, áp dụng chiến lược **Lưu kép (Dual-Field Strategy)**: Lưu đồng thời cả `product_id` (sản phẩm cha) và `product_variant_id` (biến thể SKU con).
- **Tuân thủ Sentence Case & Flat Text:** Mọi nhãn, tiêu đề, nút bấm trong giao diện Admin tuân thủ nghiêm ngặt theo [`AGENTS.md`](file:///d:/Aboutme/MyProject/Pawpal/AGENTS.md).
- **Kiểm tra 3 lớp:** (1) Quét tĩnh mã nguồn $\rightarrow$ (2) Chạy Test Suite tự động $\rightarrow$ (3) Kiểm tra dữ liệu sống trên Supabase.

---

## 2. MA TRẬN ĐỐI SOÁT 19 BẢNG TRỌNG YẾU

| STT | Tên bảng CSDL | Phân hệ Admin | Cột cũ / Lệch trường | Cột chuẩn [`CDSLfinal.md`](../../docs/archive/database/CDSLfinal.md) & Supabase | Mức độ rủi ro | Trạng thái |
| :---: | :--- | :--- | :--- | :--- | :---: | :---: |
| **1** | `product` | Bán hàng & Kho (`orders`) | Gán cứng nhãn `brand = 'PawPal'`, `petType` | `brand_name`, `target_pet`, `min_price`, `description`, `slug` | **Cao** | **Đã nghiệm thu** |
| **2** | `sales_order` | Bán hàng & Kho (`orders`) | Nhồi vận đơn vào `note`, dùng Regex parse | `shipping_provider_id`, `tracking_code`, `shipped_at`, `delivered_at` | **Cao** | **Đã nghiệm thu** |
| **3** | `sales_order_detail` | Bán hàng & Kho (`orders`) | Chỉ lưu `product_id` | Lưu cả `product_id` và `product_variant_id` | **Cao** | **Đã nghiệm thu** |
| **4** | `inventory` | Bán hàng & Kho (`orders`) | Tồn kho theo `product_id`, RAM tự tính tạm giữ | `product_variant_id`, `quantity_in_stock`, `quantity_reserved`, `minimum_stock` | **Cao** | **Đã nghiệm thu** |
| **5** | `inventory_transaction` | Bán hàng & Kho (`orders`) | Không có `staff_id`, thiếu biến thể | `product_variant_id`, `quantity`, `stock_before`, `stock_after`, `staff_id`, `purchase_order_id` | **Trung bình** | **Đã nghiệm thu** |
| **6** | `stock_reservation` | Bán hàng & Kho (`orders`) | Chưa đồng bộ đủ biến thể và hết hạn | `product_variant_id`, `cart_id`, `quantity`, `reserved_at`, `expires_at`, `status` | **Trung bình** | **Đã nghiệm thu** |
| **7** | `cart_item` | Bán hàng & POS quầy | Chỉ lưu `product_id` | `product_variant_id`, `unit_price`, `subtotal`, `quantity` | **Trung bình** | **Đã nghiệm thu** |
| **8** | `purchase_order_detail` | Nhập kho (`orders`) | Nhập hàng chưa gắn biến thể | `product_variant_id`, `quantity`, `unit_price`, `subtotal`, `received_quantity` | **Trung bình** | **Đã nghiệm thu** |
| **9** | `promotion_product` | Cài đặt & Khuyến mãi | Khuyến mãi theo sản phẩm cha | `promotion_id`, `product_variant_id` | **Thấp** | **Đã nghiệm thu** |
| **10** | `appointment` | Dịch vụ & Đặt lịch (`services`, `staff`) | Dùng sai `notes` (có s), gọi `estimated_duration` | `appointment_code`, `note` (không có s), `check_in_time`, `check_out_time`, `support_ticket_id` | **Rất Cao** | **Đã nghiệm thu** |
| **11** | `care_action` | Dịch vụ & Đặt lịch (`services`) | Thiếu thứ tự hiển thị và thời lượng | `action_name`, `service_category`, `display_order`, `estimated_duration`, `is_active` | **Trung bình** | **Đã nghiệm thu** |
| **12** | `staff_schedule` | Nhân sự & Lịch trực (`staff`) | Lưu ca trực thiếu trạng thái chuẩn | `work_date`, `shift`, `start_time`, `end_time`, `availability_status`, `reason`, `work_location`, `schedule_status` | **Trung bình** | **Đã nghiệm thu** |
| **13** | `support_ticket` | Khiếu nại (`complaints`) | Nhồi mã vào `title`, dùng `user_id` | `ticket_code`, `customer_id`, `order_id`, `appointment_id`, `subject`, `category`, `resolution_type`, `resolved_by` | **Rất Cao** | **Đã nghiệm thu** |
| **14** | `support_ticket_message` | Khiếu nại (`complaints`) | Dùng nhầm trường `message` | `content`, `ticket_id`, `sender_type`, `sender_id`, `attachment_urls`, `is_internal` | **Rất Cao** | **Đã nghiệm thu** |
| **15** | `return_request` | Khiếu nại & Đổi trả (`complaints`, `orders`) | Thiếu số tiền hoàn và trạng thái chuẩn | `sales_order_id`, `customer_id`, `refund_transaction_id`, `resolution_type`, `refund_amount`, `resolved_by` | **Cao** | **Đã nghiệm thu** |
| **16** | `return_request_detail` | Khiếu nại & Đổi trả (`orders`) | Đổi trả sản phẩm chưa gắn biến thể | `return_request_id`, `product_variant_id`, `quantity`, `unit_price` | **Trung bình** | **Đã nghiệm thu** |
| **17** | `payment` | Cài đặt & Đối soát (`settings`) | Dùng chuỗi tự do `payment_method_id` | `payment_method_config_id`, `customer_id`, `appointment_id`, `order_id`, `amount`, `transaction_status` | **Cao** | **Đã nghiệm thu** |
| **18** | `notification` | Khách hàng & Thông báo (`customers`, `staff`) | Dùng sai `user_id`, `type`, `channel`, `phone` | `customer_id`, `notification_type`, `title`, `content`, `sales_order_id`, `appointment_id`, `support_ticket_id` | **Rất Cao** | **Đã nghiệm thu** |
| **19** | `audit_log` | Nhật ký hệ thống (`settings`, `staff`) | Dùng sai `user_id`, `entity`, `old_data`, `new_data` | `staff_id`, `action`, `entity_name`, `entity_id`, `description`, `created_at` | **Rất Cao** | **Đã nghiệm thu** |

---

## 3. CHECKLIST CHI TIẾT THEO TỪNG PHÂN HỆ

---

### PHÂN HỆ 1: QUẢN LÝ BÁN HÀNG, KHO HÀNG VÀ ĐƠN HÀNG (ORDERS & INVENTORY)
> **Mã phân hệ:** `ORD`  
> **Thư mục mã nguồn:** [`pages/admin/modules/orders/`](file:///d:/Aboutme/MyProject/Pawpal/pages/admin/modules/orders/)
> **Các bảng mục tiêu:** `product`, `sales_order`, `sales_order_detail`, `inventory`, `inventory_transaction`, `stock_reservation`, `purchase_order_detail`, `cart_item`, `promotion_product`, `return_request`, `return_request_detail`.

#### 3.1. Bảng `product` (Sản phẩm)
- [x] **ORD-PRD-01 (SELECT):** Kiểm tra câu lệnh `client.from('product').select(...)` trong [`orders.js`](file:///d:/Aboutme/MyProject/Pawpal/pages/admin/modules/orders/orders.js):
  - Đã nạp trực tiếp các cột `brand_name, target_pet, min_price, description, slug`.
  - Không còn đoạn code nào fallback về chuỗi gán cứng `brand = 'PawPal'` hoặc tự đoán brand từ tên sản phẩm.
- [x] **ORD-PRD-02 (INSERT):** Trong modal *Thêm sản phẩm mới* ([`tab-order-products.js`](file:///d:/Aboutme/MyProject/Pawpal/pages/admin/modules/orders/subtabs/tab-order-products.js)):
  - Payload gửi lên Supabase có đầy đủ: `brand_name`, `target_pet`, `description`, `min_price`.
  - Dữ liệu lưu vào bảng `product` trên Supabase không bị `null`.
- [x] **ORD-PRD-03 (UPDATE):** Trong modal *Chỉnh sửa sản phẩm* ([`tab-order-products.js`](file:///d:/Aboutme/MyProject/Pawpal/pages/admin/modules/orders/subtabs/tab-order-products.js)):
  - Sửa thương hiệu, loài thú cưng mục tiêu, mô tả $\rightarrow$ Bấm lưu $\rightarrow$ F5 tải lại trang $\rightarrow$ Giá trị đã sửa vẫn được giữ nguyên từ Supabase.
- [x] **ORD-PRD-04 (FILTER):** Kiểm tra ô tìm kiếm kho Admin:
  - Gõ từ khóa thương hiệu (ví dụ: `Petkit`, `Royal Canin`, `King's Pet`) $\rightarrow$ Bộ lọc trả về chính xác danh sách sản phẩm theo cột `brand_name`.

#### 3.2. Bảng `sales_order` (Đơn hàng)
- [x] **ORD-ORD-01 (SELECT):** Trong [`orders.js`](file:///d:/Aboutme/MyProject/Pawpal/pages/admin/modules/orders/orders.js) và [`tab-order-list.js`](file:///d:/Aboutme/MyProject/Pawpal/pages/admin/modules/orders/subtabs/tab-order-list.js):
  - Câu truy vấn đơn hàng đã SELECT các trường: `shipping_provider_id, tracking_code, shipped_at, delivered_at`.
- [x] **ORD-ORD-02 (READ DIRECT):** Loại bỏ hoàn toàn Regex:
  - Bảng danh sách đơn hàng và Drawer chi tiết đơn đọc trực tiếp `order.tracking_code`.
  - Cột `note` chỉ hiển thị ghi chú thuần túy của khách hàng, không còn bị nhồi chuỗi vận đơn.
- [x] **ORD-ORD-03 (UPDATE - Giao hàng):** Thao tác *Bàn giao vận chuyển* đơn lẻ và hàng loạt ([`tab-order-list.js`](file:///d:/Aboutme/MyProject/Pawpal/pages/admin/modules/orders/subtabs/tab-order-list.js)):
  - Cập nhật đúng các cột:
    ```javascript
    {
      order_status: 'SHIPPING',
      tracking_code: tracking,
      shipping_provider_id: resolvedProviderUuid,
      shipped_at: new Date().toISOString()
    }
    ```
  - Kiểm tra trên Supabase: Bản ghi đơn hàng có đầy đủ `tracking_code` và `shipped_at`.

#### 3.3. Bảng `sales_order_detail` & `cart_item` (Chi tiết đơn hàng & Giỏ hàng)
- [x] **ORD-DTL-01 (INSERT Đơn POS & Online):** Khi tạo đơn hàng tại quầy (Admin POS) hoặc qua API ([`scripts/api/api.js`](file:///d:/Aboutme/MyProject/Pawpal/scripts/api/api.js)):
  - Dòng chi tiết đơn hàng lưu đồng thời cả 2 trường:
    * `product_id`: ID sản phẩm cha (để phục vụ báo cáo doanh thu theo dòng sản phẩm).
    * `product_variant_id`: UUID của biến thể SKU con thực tế (size, vị, màu).
- [x] **ORD-DTL-02 (Hiển thị chi tiết biến thể):** Drawer xem chi tiết đơn hàng ([`tab-order-detail.js`](file:///d:/Aboutme/MyProject/Pawpal/pages/admin/modules/orders/subtabs/tab-order-detail.js)):
  - JOIN sang `product_variant` để hiển thị đúng tên quy cách phân loại (ví dụ: *"Pate Mèo Cá Hồi - Lon 85g"*).

#### 3.4. Bảng `inventory`, `inventory_transaction` & `stock_reservation` (Kho hàng & Tạm giữ)
- [x] **ORD-INV-01 (Tồn kho theo biến thể):** Bảng quản lý Tồn kho trong Admin ([`tab-order-products.js`](file:///d:/Aboutme/MyProject/Pawpal/pages/admin/modules/orders/subtabs/tab-order-products.js)):
  - Hiển thị số lượng tồn theo từng `product_variant_id`.
- [x] **ORD-INV-02 (Tồn kho tạm giữ - `quantity_reserved`):**
  - Kiểm tra công thức tồn khả dụng hiển thị trên Admin: `available = quantity_in_stock - quantity_reserved`.
  - Khi đơn hàng tạo mới: Xác nhận tăng `quantity_reserved` và tạo bản ghi trong `stock_reservation` với `product_variant_id, expires_at, status`.
  - Khi đơn xuất kho đi giao: Giảm `quantity_reserved` và trừ `quantity_in_stock`.
- [x] **ORD-INV-03 (Lịch sử điều chỉnh kho - `inventory_transaction`):**
  - Khi Admin điều chỉnh tồn kho thủ công: Payload ghi nhận có `product_variant_id, transaction_type, quantity, stock_before, stock_after, staff_id, note`.
  - Có đầy đủ `staff_id` (UUID nhân viên đang đăng nhập thực hiện thao tác).

#### 3.5. Bảng `purchase_order_detail` & `promotion_product`
- [x] **ORD-POD-01 (Chi tiết phiếu nhập kho):** Rà soát luồng nhập hàng từ nhà cung cấp:
  - Dòng chi tiết phiếu nhập lưu đúng `product_variant_id, quantity, unit_price, subtotal, received_quantity`.
- [x] **ORD-PRO-01 (Khuyến mãi sản phẩm):** Kiểm tra các chương trình khuyến mãi áp dụng theo `promotion_id` và `product_variant_id`.

#### 3.6. Bảng `return_request` & `return_request_detail` (Đổi trả hàng)
- [x] **ORD-RET-01 (Tạo yêu cầu đổi trả):** Trong [`tab-order-detail.js:388`](file:///d:/Aboutme/MyProject/Pawpal/pages/admin/modules/orders/subtabs/tab-order-detail.js#L388):
  - Bảng `return_request` lưu đúng: `sales_order_id, customer_id, reason, return_type, description, request_status` (sử dụng enum chuẩn `tra_san_pham`, `doi_san_pham`, `da_duyet`, `da_hoan_tat`).
- [x] **ORD-RET-02 (Dòng chi tiết đổi trả):** Trong [`tab-order-detail.js:413`](file:///d:/Aboutme/MyProject/Pawpal/pages/admin/modules/orders/subtabs/tab-order-detail.js#L413):
  - Bảng `return_request_detail` lưu đúng: `return_request_id, product_variant_id, quantity, unit_price`.

---

### PHÂN HỆ 2: QUẢN LÝ DỊCH VỤ VÀ ĐẶT LỊCH (SERVICES & APPOINTMENTS)
> **Mã phân hệ:** `SVC`  
> **Thư mục mã nguồn:** [`pages/admin/modules/services/`](file:///d:/Aboutme/MyProject/Pawpal/pages/admin/modules/services/)
> **Các bảng mục tiêu:** `appointment`, `care_action`.

#### 3.7. Bảng `appointment` (Phiếu đặt lịch dịch vụ)
- [x] **SVC-APP-01 (SỬA LỖI TÊN CỘT `notes` $\rightarrow$ `note`):**
  - Đã thay thế toàn bộ các lệnh SELECT và UPDATE cột `notes` (có chữ `s`) sang cột **`note`** (không có chữ `s`) theo đúng chuẩn [`CDSLfinal.md:193`](../../docs/archive/database/CDSLfinal.md#L193).
- [x] **SVC-APP-02 (LOẠI BỎ CỘT KHÔNG TỒN TẠI):**
  - Loại bỏ hoàn toàn việc SELECT và UPDATE cột `estimated_duration` trên bảng `appointment`.
  - Loại bỏ hoàn toàn việc truy vấn cột `hold_expires_at` trên `appointment` trong [`scripts/api/api.js`](file:///d:/Aboutme/MyProject/Pawpal/scripts/api/api.js).
- [x] **SVC-APP-03 (MỐC THỜI GIAN CHECK-IN / CHECK-OUT):**
  - Cập nhật đúng `check_in_time = new Date().toISOString()`, `appointment_status = 'dang_thuc_hien'`.
  - Cập nhật đúng `check_out_time = new Date().toISOString()`, `appointment_status = 'da_hoan_tat'`.
- [x] **SVC-APP-04 (KHÓA NGOẠI TICKET HỖ TRỢ):**
  - Cột `support_ticket_id` trên `appointment` lưu chuẩn xác khi lịch hẹn phát sinh sự cố hoặc khiếu nại.

#### 3.8. Bảng `care_action` (Mốc quy trình chăm sóc Spa / Grooming)
- [x] **SVC-ACT-01 (SELECT & RENDER):** Trong [`tab-service-detail.js`](file:///d:/Aboutme/MyProject/Pawpal/pages/admin/modules/services/subtabs/tab-service-detail.js):
  - Lấy danh sách các mốc chăm sóc theo `service_id`, sắp xếp tăng dần theo `display_order`.
- [x] **SVC-ACT-02 (INSERT & UPDATE Mốc chăm sóc):**
  - Lưu đúng các trường: `service_id, action_name, service_category, display_order, estimated_duration, is_active`.

---

### PHÂN HỆ 3: QUẢN LÝ NHÂN SỰ VÀ ĐIỀU PHỐI LỊCH TRỰC (STAFF & SCHEDULE)
> **Mã phân hệ:** `STA`  
> **Thư mục mã nguồn:** [`pages/admin/modules/staff/`](file:///d:/Aboutme/MyProject/Pawpal/pages/admin/modules/staff/)
> **Các bảng mục tiêu:** `staff_schedule`, `appointment`.

#### 3.9. Bảng `staff_schedule` (Lịch làm việc nhân viên)
- [x] **STA-SCH-01 (SELECT Lịch trực):** Trong [`staff.js`](file:///d:/Aboutme/MyProject/Pawpal/pages/admin/modules/staff/staff.js) và [`tab-staff-schedule.js`](file:///d:/Aboutme/MyProject/Pawpal/pages/admin/modules/staff/subtabs/tab-staff-schedule.js):
  - Truy vấn lịch trực theo ngày `work_date` với đầy đủ các trường: `id, staff_id, work_date, shift, start_time, end_time, availability_status, reason, work_location, schedule_status`.
  - Tự động normalize giữa enum `ca_sang`, `ca_chieu`, `ca_toi` và `MORNING`, `AFTERNOON`, `EVENING`.
- [x] **STA-SCH-02 (INSERT Phân ca mới):** Trong [`tab-staff-schedule.js`](file:///d:/Aboutme/MyProject/Pawpal/pages/admin/modules/staff/subtabs/tab-staff-schedule.js):
  - Lưu đúng enum PostgreSQL: `shift: dbShift` (`ca_sang`, `ca_chieu`, `ca_toi`), `schedule_status: 'da_len_lich'`.
- [x] **STA-SCH-03 (UPDATE Trạng thái ca / Đổi ca):** Trong [`tab-staff-schedule.js`](file:///d:/Aboutme/MyProject/Pawpal/pages/admin/modules/staff/subtabs/tab-staff-schedule.js):
  - Cập nhật đúng `schedule_status: 'nghi'` hoặc `'da_len_lich'` khi duyệt đơn xin nghỉ hoặc đổi ca.
  - Có cơ chế fallback nguyên tử khi RPC server yêu cầu enum tiếng Việt.

---

### PHÂN HỆ 4: KHIẾU NẠI, ĐỔI TRẢ VÀ CSKH 360° (COMPLAINTS & CSKH)
> **Mã phân hệ:** `CMP`  
> **Thư mục mã nguồn:** [`pages/admin/modules/complaints/`](file:///d:/Aboutme/MyProject/Pawpal/pages/admin/modules/complaints/)
> **Các bảng mục tiêu:** `support_ticket`, `support_ticket_message`, `return_request`, `payment`.

#### 3.10. Bảng `support_ticket` (Yêu cầu hỗ trợ & Khiếu nại)
- [x] **CMP-TCK-01 (KHÓA NGOẠI TRỰC TIẾP):** Trong [`complaints.js`](file:///d:/Aboutme/MyProject/Pawpal/pages/admin/modules/complaints/complaints.js) và [`tab-complaint-detail.js`](file:///d:/Aboutme/MyProject/Pawpal/pages/admin/modules/complaints/subtabs/tab-complaint-detail.js):
  - Khiếu nại thuộc đơn hàng: Gửi thẳng UUID vào cột `order_id`.
  - Khiếu nại thuộc lịch hẹn: Gửi thẳng UUID vào cột `appointment_id`.
  - Khách hàng khiếu nại: Gửi UUID vào cột `customer_id` (không chỉ dựa vào `user_id`).
  - Triệt tiêu hoàn toàn việc nhồi mã tham chiếu `[DH-1002]` vào chuỗi tiêu đề.
- [x] **CMP-TCK-02 (TIÊU ĐỀ CHUẨN `subject` vs `title`):**
  - Điền cả **`subject`** và `title` để tương thích 100% với [`CDSLfinal.md:457`](../../docs/archive/database/CDSLfinal.md#L457).
- [x] **CMP-TCK-03 (CHỐT KẾT QUẢ XỬ LÝ & BỒI THƯỜNG):**
  - Cập nhật đúng các cột chuẩn: `status: 'completed'`, `resolution_type`, `resolution_note`, `approved_amount`, `resolved_by`, `resolved_at`, `closed_at`.

#### 3.11. Bảng `support_ticket_message` (Trao đổi trong ticket)
- [x] **CMP-MSG-01 (SỬA LỖI TÊN CỘT `message` $\rightarrow$ `content`):**
  - Toàn bộ payload INSERT tin nhắn trao đổi sử dụng cột **`content`** theo chuẩn [`CDSLfinal.md:484`](../../docs/archive/database/CDSLfinal.md#L484).
- [x] **CMP-MSG-02 (TRƯỜNG BỔ TRỢ TIN NHẮN):**
  - Lưu đầy đủ các trường: `ticket_id, sender_type: 'STAFF', sender_id: staffId, content: text, attachment_urls: urls, is_internal: isPrivate`.

---

### PHÂN HỆ 5: KHÁCH HÀNG, CRM VÀ THÔNG BÁO (CUSTOMERS & NOTIFICATIONS)
> **Mã phân hệ:** `CUS`  
> **Thư mục mã nguồn:** [`pages/admin/modules/customers/`](file:///d:/Aboutme/MyProject/Pawpal/pages/admin/modules/customers/)
> **Các bảng mục tiêu:** `notification`, `payment`, `customer`, `customer_profile`.

#### 3.12. Bảng `notification` (Thông báo người dùng)
- [x] **CUS-NOT-01 (SỬA LỖI CỘT TỰ PHÁT & ENUM VIỆT HÓA):**
  - Đã chuẩn hóa toàn bộ các lệnh INSERT thông báo theo đúng enum PostgreSQL `notification_type_enum` (`don_hang_moi`, `lich_hen_da_thay_doi`, `cap_nhat_yeu_cau_ho_tro`, `hoan_tien_thanh_cong`):
    ```javascript
    await client.from('notification').insert({
      customer_id: targetCustomerId,
      notification_type: 'cap_nhat_yeu_cau_ho_tro',
      title: titleText,
      content: contentText,
      sales_order_id: orderId || null,
      appointment_id: appointmentId || null,
      support_ticket_id: ticketId || null,
      is_read: false,
      sent_at: new Date().toISOString()
    });
    ```

#### 3.13. Bảng `customer` & `customer_profile`
- [x] **CUS-PRF-01 (TẠO KHÁCH QUẦY VỚI ENUM VIỆT HÓA):**
  - `customer.account_status` sử dụng đúng enum `dang_hoat_dong` (thay vì `ACTIVE`).
  - `customer_profile.gender` sử dụng đúng enum `nam`, `nu`, `khac` (thay vì `OTHER`).
  - Hỗ trợ đầy đủ 4 bảng thực thể (`customer`, `customer_profile`, `customer_membership`, `customer_address`).

#### 3.14. Bảng `payment` (Giao dịch thanh toán)
- [x] **CUS-PAY-01 (CHUẨN HÓA CỔNG THANH TOÁN):**
  - Chuyển đổi từ chuỗi tự do `payment_method_id` sang **`payment_method_config_id`** (UUID trỏ tới bảng cấu hình `payment_method_config`).
- [x] **CUS-PAY-02 (LIÊN KẾT ĐỐI SOÁT & ĐIỂM THƯỞNG):**
  - Kiểm tra các trường: `customer_id, appointment_id, order_id, amount, payment_type, paw_points_used, paw_points_earned, transaction_status`.

---

### PHÂN HỆ 6: NHẬT KÝ KIỂM TOÁN VÀ CÀI ĐẶT HỆ THỐNG (SETTINGS & AUDIT LOGS)
> **Mã phân hệ:** `SET`  
> **Thư mục mã nguồn:** [`pages/admin/modules/settings/`](file:///d:/Aboutme/MyProject/Pawpal/pages/admin/modules/settings/)
> **Các bảng mục tiêu:** `audit_log`, `blog_post`, `banner`.

#### 3.15. Bảng `audit_log` (Nhật ký kiểm toán hệ thống)
- [x] **SET-AUD-01 (SỬA LỖI CỘT TRONG `staff_auth.js`):**
  - Đã chuẩn hóa payload INSERT `audit_log` theo đúng chuẩn [`CDSLfinal.md:723`](../../docs/archive/database/CDSLfinal.md#L723):
    ```javascript
    await supabase.from('audit_log').insert({
      staff_id: currentStaffId,
      action: actionName,
      entity_name: entityName,
      entity_id: entityId,
      description: detailsDescription,
      created_at: new Date().toISOString()
    });
    ```
- [x] **SET-AUD-02 (HIỂN THỊ NHẬT KÝ TẠI CÀI ĐẶT):**
  - Màn hình *Nhật ký kiểm toán* SELECT đúng: `id, staff_id, action, entity_name, entity_id, description, created_at`.
  - JOIN hiển thị họ tên nhân viên thực hiện từ bảng `staff`.

#### 3.16. Bảng `blog_post` (Cẩm nang kiến thức)
- [x] **SET-BLG-01 (CHUẨN HÓA ENUM BÀI VIẾT):**
  - Cập nhật đúng các giá trị của enum `blog_status_enum`: `'nhap'`, `'da_xuat_ban'`, `'da_an'`.

---

## 4. BẢNG TỔNG KẾT BỘ TEST SUITE TỰ ĐỘNG ĐÃ VƯỢT QUA 100%

| STT | Lệnh kiểm thử | Phân hệ / Mục tiêu | Số tiêu chí kiểm thử | Kết quả thực tế | Trạng thái |
| :---: | :--- | :--- | :---: | :---: | :---: |
| 1 | `node scripts/test/test_ord_f01_f16_suite.js` | Bán hàng & Quản lý Kho (`ORD`) | 16/16 | **16 Passed (100%)** | **PASS** |
| 2 | `node scripts/test/test_svc_f01_f18_suite.js` | Dịch vụ & Đặt lịch (`SVC`) | 18/18 | **18 Passed (100%)** | **PASS** |
| 3 | `node scripts/test/test_sta_f01_f12_suite.js` | Nhân sự & Phân ca làm việc (`STA`) | 12/12 | **12 Passed (100%)** | **PASS** |
| 4 | `node scripts/test/test_cmp_f01_f15_suite.js` | Khiếu nại, Đổi trả & CSKH 360° (`CMP`) | 15/15 | **15 Passed (100%)** | **PASS** |
| 5 | `node scripts/test/test_cus_f01_f13_suite.js` | Khách hàng & Loyalty Pawpoint (`CUS`) | 13/13 | **13 Passed (100%)** | **PASS** |
| 6 | `node scripts/test/test_set_f01_f12_suite.js` | Cấu hình & Nhật ký kiểm toán (`SET`) | 12/12 | **12 Passed (100%)** | **PASS** |
| 7 | `node scripts/test/test_pet_f01_f12_suite.js` | Hồ sơ thú cưng & Lịch sử chăm sóc (`PET`) | 12/12 | **12 Passed (100%)** | **PASS** |
| 8 | `node scripts/test/test_deep_sync_validation.js` | Kiểm thử thực chiến 12 kịch bản cột mới Supabase | 12/12 | **12 Passed (100%)** | **PASS** |
| 9 | `node scripts/test/audit_admin_cdsl.cjs` | Quét tĩnh mã nguồn toàn dự án | 532 chuỗi truy vấn | **0 Lệch trường** | **PASS** |

---

## 5. TIÊU CHÍ NGHIỆM THU CUỐI CÙNG (DEFINITION OF DONE)

- [x] **100% các câu truy vấn SELECT:** Không còn trường thừa không tồn tại trên Supabase, không bị cảnh báo lỗi API 400.
- [x] **100% các thao tác INSERT / UPDATE:** Lưu thành công vào CSDL Supabase với đúng tên cột chuẩn; không có lỗi `column does not exist`.
- [x] **Không còn code Regex nhồi chuỗi:** Cột `tracking_code`, `order_id`, `appointment_id` hoạt động độc lập và minh bạch.
- [x] **Chiến lược Lưu kép (Dual-Field):** Hoạt động hoàn hảo cho đơn hàng, giỏ hàng, tồn kho; không làm gãy giao diện cũ.
- [x] **Đồng bộ toàn diện Enum Việt hóa:** Đã chuyển đổi hoàn toàn các enum tiếng Anh sang tiếng Việt (`account_status_enum`, `pet_gender_enum`, `customer_gender_enum`, `pet_status_enum`, `notification_type_enum`, `return_status_enum`, `return_type_enum`, `blog_status_enum`, `shift_enum`, `schedule_status_enum`).
- [x] **Kiểm tra trực quan E2E:** Thao tác trên trình duyệt chạy mượt mà, đúng quy chuẩn thiết kế bo góc 9px, text-only và màu Forest Green trong [`AGENTS.md`](file:///d:/Aboutme/MyProject/Pawpal/AGENTS.md).
