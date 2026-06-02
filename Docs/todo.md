# PawPal — Kế hoạch làm giao diện theo quy trình nghiệp vụ

> Dựa trên 14 quy trình trong `quytrinh.md` mục 3.1  
> Cập nhật: 02/06/2026

---

## Trạng thái tổng quan

| Phần | Trang | Quy trình | Trạng thái |
|---|---|---|---|
| Đăng ký / Đăng nhập | `login.html` | 3.1.1 + 3.1.2 | ✅ Hoàn thành |
| Xem dịch vụ | `services.html` | — | ✅ Hoàn thành |
| Cửa hàng + Giỏ hàng | `shop.html` | 3.1.8 | ✅ Hoàn thành |
| Đặt lịch (4 bước + timeslot + giữ chỗ) | `booking.html` | 3.1.4 | ✅ Hoàn thành |
| Pet ID form | `dashboard.html` | 3.1.3 | ✅ Hoàn thành |
| Lịch hẹn + Hủy lịch | `dashboard.html` | 3.1.4 + 3.1.6 | ✅ Hoàn thành |
| Đổi lịch UI | `dashboard.html` | 3.1.5 | ✅ Hoàn thành |
| Nhật ký chăm sóc (tracker) | `dashboard.html` | 3.1.7 | ✅ Hoàn thành |
| Thanh toán | `checkout.html` | 3.1.9 | ✅ Hoàn thành |
| Quản lý đơn hàng | `orders.html` + `order-detail.html` | 3.1.10 | ✅ Hoàn thành |
| **Đánh giá dịch vụ / sản phẩm** | `dashboard.html` | **3.1.11** | ⏳ Chưa làm |
| **Đổi trả hàng** | `orders.html` / `order-detail.html` | **3.1.12** | ⏳ Chưa làm |
| **Ưu đãi thành viên (Paw Points)** | `dashboard.html` | **3.1.13** | ⏳ Chưa làm |
| **Quản lý thông báo** | Toàn site | **3.1.14** | ⏳ Chưa làm |
| **Trang Admin** | `admin.html` | — | ⏳ Cơ bản |

---

## Phần tiếp theo — Đánh giá (3.1.11)

**Quy trình nghiệp vụ:** 3.1.11 Đánh giá  
**File:** `pages/dashboard.html` + `assets/js/dashboard.js`

### Cần làm

#### UI — Tab "Đánh giá" trong Dashboard
- Hiển thị danh sách giao dịch đã hoàn thành chưa đánh giá (booking + đơn hàng)
- Mỗi item có nút **Viết đánh giá**
- Form đánh giá: chọn sao (1–5), textarea nội dung, upload ảnh/video (tùy chọn)
- Popup xác nhận trước khi gửi: "Bạn có chắc muốn công khai phản hồi này?"
- Sau khi gửi: cộng Paw Points, hiển thị badge "Đã đánh giá"

#### Logic
- Chỉ giao dịch trạng thái "Hoàn thành" mới được đánh giá
- Mỗi mã giao dịch chỉ đánh giá 1 lần
- Đánh giá ≥ 4 sao → hiển thị ngay; < 3 sao → trạng thái "Đang chờ hỗ trợ"
- Lưu vào `localStorage` key `pawpal_reviews`

---

## Phần tiếp theo — Đổi trả hàng (3.1.12)

**Quy trình nghiệp vụ:** 3.1.12  
**File:** `pages/order-detail.html` + `assets/js/order-detail.js`

### Cần làm
- Nút **Yêu cầu Đổi trả** trên trang chi tiết đơn hàng (chỉ hiện trong 7 ngày sau khi hoàn thành)
- Form: chọn loại (đổi hàng / hoàn tiền), lý do, upload ảnh minh chứng
- Tạo phiếu hậu mãi với mã duy nhất, trạng thái "Chờ kiểm duyệt"
- Lưu vào `localStorage` key `pawpal_returns`

---

## Phần tiếp theo — Ưu đãi thành viên (3.1.13)

**Quy trình nghiệp vụ:** 3.1.13  
**File:** `pages/dashboard.html` tab mới "Ưu đãi"

### Cần làm
- Hiển thị số dư Paw Points + hạng thành viên (Bạc/Vàng/Kim cương)
- Danh sách ưu đãi có thể đổi (mock data)
- Nút **Đổi ưu đãi** → confirm → trừ điểm → tạo mã voucher
- Lưu voucher vào `localStorage` key `pawpal_vouchers`
- Chặn đổi điểm nếu tài khoản tạm (chưa thiết lập mật khẩu)

---

## Phần tiếp theo — Thông báo (3.1.14)

**Quy trình nghiệp vụ:** 3.1.14  
**File:** Toàn site (header notification bell)

### Cần làm
- Icon chuông thông báo trên header với badge số chưa đọc
- Dropdown/panel danh sách thông báo (sắp xếp mới → cũ)
- Nhãn phân loại: Dịch vụ / Mua sắm / Ưu đãi
- Click vào thông báo → điều hướng đến trang liên quan + đánh dấu đã đọc
- Nút "Đánh dấu tất cả đã đọc"
- Lưu vào `localStorage` key `pawpal_notifications`

---

## Ghi chú chung

- Tất cả dữ liệu dùng `localStorage` (demo), sau này thay bằng Supabase API
- CSS mới cho dashboard viết vào `assets/css/dashboard.css`
- CSS mới cho các trang khác viết vào file CSS tương ứng
- Mỗi phần làm xong cần test các tình huống ngoại lệ đã liệt kê trong `quytrinh.md`
