# HƯỚNG DẪN TRIỂN KHAI MIGRATION SUPABASE CHO 8 PHÂN HỆ ADMIN PAWPAL-ER
## (ĐẢM BẢO 100% TÍNH TOÀN VẸN KHÓA CHÍNH VÀ KHÓA NGOẠI THEO CSDLDEMO)

> **Tài liệu chuẩn CSDL:** [CSDLdemo](file:///d:/Aboutme/MyProject/Pawpal/CSDLdemo)  
> **Tài liệu tham chiếu:** [PAWPAL_ADMIN_AUDIT_LOI_8_PHAN_HE.md](file:///d:/Aboutme/MyProject/Pawpal/pages/admin/PAWPAL_ADMIN_AUDIT_LOI_8_PHAN_HE.md)  
> **Tệp thực thi SQL:** [20261017_admin_audit_backend_enhancements.sql](file:///d:/Aboutme/MyProject/Pawpal/scripts/database/20261017_admin_audit_backend_enhancements.sql)  
> **Ngày cập nhật:** 17/10/2026  

---

## 1. BẢNG ĐỐI CHIẾU KHÓA CHÍNH (PK) VÀ KHÓA NGOẠI (FK) CHUẨN XÁC

Toàn bộ các bảng và hàm RPC trong tệp SQL đã được đối chiếu nghiêm ngặt với 62 thực thể trong [CSDLdemo](file:///d:/Aboutme/MyProject/Pawpal/CSDLdemo):

| Bảng dữ liệu | Khóa chính (PK) | Khóa ngoại (FK) | Bảng được tham chiếu | Hành động khi xóa (ON DELETE) |
|---|---|---|---|---|
| **`hotel_room`** | `id` (UUID) | `room_type_id` | `public.hotel_room_type(id)` | `RESTRICT` (Không cho xóa loại phòng khi đang có phòng vật lý) |
| **`hotel_booking`** | `id` (UUID) | `customer_id` | `public.customer(id)` | `CASCADE` (Xóa tài khoản khách thì xóa lịch sử đặt phòng) |
| | | `pet_id` | `public.pet_profile(id)` | `CASCADE` (Xóa thú cưng thì xóa lịch đặt) |
| | | `room_id` | `public.hotel_room(id)` | `RESTRICT` (Không cho xóa phòng đang có lịch đặt) |
| | | `appointment_id` | `public.appointment(id)` | `SET NULL` (Hủy liên kết nếu ca hẹn bị xóa) |
| **`product_variant`** | `id` (UUID) | `product_id` | `public.product(id)` | `CASCADE` (Xóa sản phẩm gốc thì xóa toàn bộ biến thể) |
| | | `color_id` | `public.variant_color(id)` | `SET NULL` (Xóa màu không làm mất biến thể) |
| | | `size_id` | `public.variant_size(id)` | `SET NULL` (Xóa size không làm mất biến thể) |
| | | `flavor_id` | `public.variant_flavor(id)` | `SET NULL` (Xóa hương vị không làm mất biến thể) |
| **`customer_membership`** | `id` (UUID) | `customer_id` | `public.customer(id)` | `CASCADE` |
| | | `membership_tier_id`| `public.membership_tier(id)`| `RESTRICT` (Tự động cập nhật qua Trigger đồng bộ với `tier_points`) |
| **`staff_shift_request`** | `id` (UUID) | `staff_id` | `public.staff(id)` | `RESTRICT` |
| | | `target_staff_id` | `public.staff(id)` | `SET NULL` |
| | | `created_by` | `auth.users(id)` | `RESTRICT` |
| | | `reviewed_by` | `auth.users(id)` | `SET NULL` |
| **`appointment` (trong RPC)**| `id` (UUID) | `customer_id` | `public.customer(id)` | Kiểm tra tồn tại trước khi tạo |
| | | `pet_id` | `public.pet_profile(id)` | Kiểm tra `pet_id` thuộc đúng `customer_id` |
| | | `service_id` | `public.service(id)` | Kiểm tra dịch vụ có tồn tại |
| | | `staff_id` | `public.staff(id)` | Kiểm tra KTV đang ở trạng thái `ACTIVE` |

---

## 2. RÀNG BUỘC TOÀN VẸN DỮ LIỆU & CHỈ MỤC TỐI ƯU (INDEXES)

- **Ràng buộc Duy nhất (UNIQUE):**
  - `hotel_room.room_number`: Trùng số phòng lập tức bị chặn.
  - `hotel_booking.booking_code`: Mã đặt phòng lưu trú duy nhất.
  - `product_variant.sku_variant`: Mỗi SKU biến thể là duy nhất trong toàn hệ thống.
  - `product_variant.barcode`: Mã vạch sản phẩm duy nhất.
- **Ràng buộc Kiểm tra (CHECK):**
  - `hotel_booking.check_out_date > hotel_booking.check_in_date`: Ngày trả phòng bắt buộc phải sau ngày nhận phòng.
  - Các trường tiền (`daily_price`, `total_amount`, `cost_price`, `sale_price`) và điểm thưởng (`tier_points`) đều có `CHECK (>= 0)` chống số âm.
- **Chỉ mục FK (Foreign Key Indexes):**
  - Mọi cột khóa ngoại đều được tạo `CREATE INDEX IF NOT EXISTS` để triệt tiêu tình trạng Quét toàn bảng (Full Table Scan) và chống nghẽn khóa (Table Lock Escalation) khi các giao dịch diễn ra đồng thời.

---

## 3. CÁCH THỰC THI TRÊN SUPABASE SQL EDITOR

1. Mở **Supabase Dashboard** của dự án Pawpal.
2. Điều hướng tới menu **SQL Editor**.
3. Bấm **New Query**.
4. Sao chép toàn bộ nội dung trong tệp [20261017_admin_audit_backend_enhancements.sql](file:///d:/Aboutme/MyProject/Pawpal/scripts/database/20261017_admin_audit_backend_enhancements.sql) và dán vào.
5. Bấm nút **Run** (hoặc `Ctrl + Enter`).
6. Supabase sẽ trả về `Success. No rows returned` trong vòng chưa đầy 1 giây.
