# PawPal — Kế hoạch làm giao diện theo quy trình nghiệp vụ

> Dựa trên 7 quy trình trong `Dinhhuong.txt` mục 3.1  
> Cập nhật: 27/05/2026

---

## Trạng thái tổng quan

| Phần | Trang | Quy trình | Trạng thái |
|---|---|---|---|
| Đăng ký / Đăng nhập | `login.html` | 3.1.1 + 3.1.2 | ✅ Hoàn thành |
| Xem dịch vụ | `services.html` | — | ✅ Hoàn thành |
| Cửa hàng + Giỏ hàng | `shop.html` | — | ✅ Hoàn thành |
| Đặt lịch (4 bước) | `booking.html` | 3.1.4 | ✅ Cơ bản |
| **Pet ID form** | `dashboard.html` | **3.1.3** | ✅ Hoàn thành |
| Lịch hẹn + Hủy lịch | `dashboard.html` | 3.1.4 + 3.1.6 | ✅ Hoàn thành |
| Nhật ký chăm sóc | `dashboard.html` | 3.1.7 | ⏳ Chưa làm |
| Timeslot thực + giữ chỗ | `booking.html` | 3.1.4 | ⏳ Chưa làm |
| Đổi lịch UI | `dashboard.html` | 3.1.5 | ⏳ Chưa làm |

---

## Phần 1 — Pet ID Form (dashboard.html › Tab "Hồ sơ Pet ID")

**Quy trình nghiệp vụ:** 3.1.3 Quản lý hồ sơ bé cưng  
**File:** `pages/dashboard.html` + `assets/js/dashboard.js` (mới)

### Hiện trạng
Tab "Hồ sơ Pet ID" đang hardcode 1 thẻ Pawport tĩnh (bé Bông - Poodle).  
Không có form thêm/sửa, không lưu dữ liệu.

### Cần làm

#### UI — Danh sách Pet ID
- Hiển thị danh sách các bé dưới dạng thẻ Pawport (như thiết kế hiện tại)
- Mỗi thẻ có nút **Sửa** và **Xóa**
- Nút **+ Thêm bé mới** ở cuối danh sách
- Nếu chưa có bé nào → hiển thị empty state với nút thêm

#### UI — Form thêm / sửa Pet ID
- Mở dạng modal hoặc inline expand bên dưới thẻ
- Các trường:
  - Tên bé `*` (text)
  - Loài `*` (select: Chó / Mèo)
  - Giống (text, ví dụ: Poodle, Mèo Anh lông ngắn)
  - Cân nặng `*` (number, kg)
  - Ngày sinh (date, không bắt buộc)
  - Ảnh đại diện (upload, tối đa 5MB, jpg/png/webp)
  - Dị ứng / Lưu ý y tế (textarea — **làm nổi bật màu vàng cảnh báo**)
  - Ghi chú thêm (textarea)
- Nút **Lưu hồ sơ** / **Hủy**

#### Logic (JavaScript)
- Lưu danh sách Pet ID vào `localStorage` key `pawpal_pets`
- Mỗi Pet ID có cấu trúc:
  ```json
  {
    "id": "PP-XXXX",
    "name": "Bé Bông",
    "species": "Chó",
    "breed": "Poodle",
    "weight": 4.5,
    "birthday": "2022-03-15",
    "photo": "base64 hoặc url",
    "allergies": "Dị ứng lúa mì",
    "notes": "",
    "createdAt": "2026-05-27"
  }
  ```
- Tạo mã `PP-XXXX` ngẫu nhiên khi thêm mới
- Validate: tên + loài + cân nặng bắt buộc
- Xóa → confirm dialog → đưa vào "trạng thái lưu trữ" (soft delete, không xóa hẳn)
- Khi booking.html load → đọc `pawpal_pets` để pre-fill bước 2

#### Quy tắc nghiệp vụ cần implement
- Trường **Dị ứng** phải luôn hiển thị nổi bật (badge màu đỏ/vàng) trên thẻ Pawport
- Một tài khoản có thể có nhiều Pet ID (không giới hạn)
- Tên bé trùng trong cùng tài khoản → cảnh báo yêu cầu thêm ký hiệu phân biệt
- Ảnh sai định dạng hoặc > 5MB → thông báo lỗi, khóa nút lưu

#### Tình huống ngoại lệ cần xử lý
- Xóa nhầm → soft delete, giữ 30 ngày (đánh dấu `deleted: true`, ẩn khỏi UI)
- Ảnh tải lên sai → thông báo rõ ràng
- Hồ sơ chưa đủ thông tin khi đặt lịch → redirect về form sửa

---

## Phần 2 — Lịch hẹn + Hủy lịch (dashboard.html › Tab "Lịch hẹn")

**Quy trình nghiệp vụ:** 3.1.4 + 3.1.6  
**File:** `pages/dashboard.html` + `assets/js/dashboard.js`

### Cần làm
- Load danh sách booking từ `localStorage` key `pawpal_bookings`
- Hiển thị mỗi booking dạng card với: tên dịch vụ, tên bé, ngày giờ, trạng thái, mã PP-XXXXXX
- Badge trạng thái màu: Chờ xác nhận (vàng) / Đã đặt (xanh) / Đang thực hiện (xanh đậm) / Hoàn thành (xám) / Đã hủy (đỏ)
- Nút **Hủy lịch** (chỉ hiện khi trạng thái là "Đã đặt" và còn > 2 tiếng)
  - Click → confirm dialog "Bạn có chắc muốn hủy?"
  - Xác nhận → cập nhật trạng thái thành "Đã hủy", đếm số lần hủy
  - Nếu hủy ≥ 3 lần trong 7 ngày → hiển thị cảnh báo
- Nút **Đặt lịch mới** → link sang `booking.html`
- Empty state nếu chưa có lịch nào

---

## Phần 3 — Nhật ký chăm sóc (dashboard.html › Tab mới "Nhật ký")

**Quy trình nghiệp vụ:** 3.1.7  
**File:** `pages/dashboard.html` + `assets/js/dashboard.js`

### Cần làm
- Tab mới "Nhật ký bé" trong dashboard
- Hiển thị timeline dọc theo các mốc: Đã tiếp nhận → Đang tắm → Đang sấy → Đã cho ăn → Hoàn tất
- Mỗi mốc có: icon, tên trạng thái, timestamp, ảnh (placeholder)
- Dữ liệu mock từ localStorage (thực tế sẽ từ API)
- Nếu không có dịch vụ đang diễn ra → empty state "Bé chưa có lịch hẹn đang thực hiện"

---

## Phần 4 — Timeslot thực + giữ chỗ 15 phút (booking.html › Bước 3)

**Quy trình nghiệp vụ:** 3.1.4  
**File:** `pages/booking.html` + `assets/js/booking.js`

### Cần làm
- Timeslot hiển thị theo ngày chọn (hiện đang mock cứng)
- Khi chọn slot → bắt đầu đếm ngược 15 phút (hiển thị timer nhỏ)
- Hết 15 phút chưa confirm → tự giải phóng slot, reset về bước 3
- Nếu đã đăng nhập → pre-fill thông tin bé từ `pawpal_pets`
- Validate: không cho chọn ngày/giờ trong quá khứ, phải đặt trước ít nhất 2 tiếng

---

## Phần 5 — Đổi lịch UI (dashboard.html › Tab "Lịch hẹn")

**Quy trình nghiệp vụ:** 3.1.5  
**File:** `pages/dashboard.html` + `assets/js/dashboard.js`

### Cần làm
- Nút **Đổi lịch** trên booking card (chỉ hiện khi còn > 2 tiếng, chưa đổi quá 2 lần)
- Click → mở modal chọn ngày/giờ mới (tái sử dụng timeslot component từ booking.js)
- Giữ giờ cũ đến khi confirm xong
- Confirm → cập nhật booking trong localStorage, ghi nhận lần đổi
- Sau 2 lần đổi → ẩn nút, hiển thị "Vui lòng gọi Hotline"
- Không cho đổi loại dịch vụ (Spa ↔ Hotel) trong luồng này

---

## Ghi chú chung

- Tất cả dữ liệu hiện tại dùng `localStorage` (demo), sau này thay bằng Supabase API
- Mỗi phần làm xong cần test các tình huống ngoại lệ đã liệt kê
- CSS mới cho dashboard viết vào file riêng `assets/css/dashboard.css`
