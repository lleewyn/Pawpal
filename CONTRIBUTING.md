# 🐾 Hướng Dẫn Phát Triển Nhóm & Quy Chuẩn Dự Án (CONTRIBUTING.md)

Chào mừng bạn tham gia phát triển dự án **PawPal**! Để đảm bảo dự án chạy ổn định, code không bị xung đột (conflict) và giao diện luôn giữ vững quy chuẩn thiết kế, tất cả thành viên bắt buộc phải đọc và tuân thủ các nguyên tắc dưới đây.

---

## 👥 1. Phân Chia Vai Trò & Phạm Vi Code (Scope)

Dự án được chia thành 4 phân hệ chính tương ứng với cấu trúc thư mục. Vui lòng chỉ chỉnh sửa các file thuộc phạm vi quản lý của mình:

| Vai trò | Thành viên phụ trách | Phạm vi thư mục/files được phép chỉnh sửa |
| :--- | :--- | :--- |
| **1. Core Architect & Admin Panel** | *[Tên Dev 1]* | <ul><li>`components/` (Header, Footer dùng chung)</li><li>`assets/css/tokens/` (Màu sắc, font, spacing)</li><li>`assets/css/style.css`, `assets/css/admin/`</li><li>`pages/admin/` (Bao gồm: `index.html`, `bookings.html`, `orders.html`, `care-log.html`, `products.html`, `users.html`)</li><li>`scripts/`</li></ul> |
| **2. Public & Marketing Web** | *[Tên Dev 2]* | <ul><li>`pages/public/` (Landing, About, Login, Blog...)</li><li>`assets/css/public/`</li></ul> |
| **3. Customer Portal (User Area)** | *[Tên Dev 3]* | <ul><li>`pages/user/` (Dashboard, Pet Archive, Loyalty...)</li><li>`assets/css/user/`</li></ul> |
| **4. Commerce & Services Engine** | *[Tên Dev 4]* | <ul><li>`pages/shop/` & `pages/services/`</li><li>`assets/css/shop/` & `assets/css/services/`</li></ul> |

---

## 🌿 2. Quy Trình Git & Quản Lý Nhánh (Git Flow)

Để tránh tình trạng code đè lên nhau, chúng ta áp dụng quy trình Git Flow nghiêm ngặt:

1. **Không commit trực tiếp vào nhánh `main`:** Nhánh `main` là nhánh sản phẩm chính chạy stable, chỉ được gộp qua Pull Request.
2. **Tạo nhánh tính năng cá nhân:** Trước khi làm tính năng mới, tạo nhánh từ `main`:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b feature/ten-tinh-nang
   ```
   *Ví dụ:* `feature/loyalty-system`, `feature/booking-hotel`
3. **Tạo Pull Request (PR):** Sau khi hoàn thành và test xong ở máy cá nhân, push nhánh lên github và tạo PR về `main`.
4. **Code Review:** Trưởng nhóm (hoặc Core Architect) kiểm tra PR. Nếu đảm bảo không sửa nhầm file ngoài phạm vi phân công, code không lỗi sẽ đồng ý gộp (Merge).

---

## 🎨 3. Quy Chuẩn Thiết Kế & Giao Diện (Design System Rules)

### 📐 Thiết kế góc vuông (Square corners) - RẤT QUAN TRỌNG
* Chủ dự án đã thống nhất chuyển toàn bộ Card, Button, Form Input sang **thiết kế góc vuông hoàn toàn để tạo cảm giác tối giản & cao cấp**.
* **Nguyên tắc:** Thiết lập `border-radius: 0;` cho tất cả thẻ card hoặc khối nội dung mới.
* *Ngoại lệ:* Chỉ những icon tròn hoặc badge dạng pill đã có sẵn token toàn cục mới giữ bo tròn.

### 🎨 Sử dụng Design Tokens (Biến CSS)
* **Không dùng mã màu tự do:** Cấm sử dụng trực tiếp các mã màu như `#1a4332` hay `#FAF9F6` trong các file CSS riêng.
* **Bắt buộc dùng biến:** Sử dụng các biến CSS đã khai báo sẵn trong `assets/css/tokens/colors.css`:
  - `var(--color-primary)` (Xanh lá đậm thương hiệu)
  - `var(--color-primary-dark)` (Xanh lá đậm sâu)
  - `var(--color-accent)` (Vàng Gold làm điểm nhấn)
  - `var(--color-bg-light)` (Màu kem ấm áp làm nền)
  - `var(--color-bg-white)` (Trắng tinh khiết cho thẻ nổi)

---

## ⚙️ 4. Cơ Chế Template & Lệnh Build (Sync)

Dự án này sử dụng cơ chế render tĩnh để tối ưu tốc độ tải trang. Header và Footer được quản lý tập trung:

1. **Cấm sửa Header/Footer trong trang con:** Tuyệt đối không chỉnh sửa code trong thẻ `<header>` và `<footer>` của các file HTML nằm trong thư mục `pages/`. Mọi thay đổi ở đây sẽ bị ghi đè khi chạy script.
2. **Cách sửa Header/Footer:** Sửa file gốc tại `components/header.html` và `components/footer.html`.
3. **Lệnh đồng bộ bắt buộc:** Sau khi kéo code mới về hoặc sau khi thay đổi layout, hãy chạy lệnh sau ở terminal tại thư mục root để hệ thống tự động ghép nối layout:
   ```bash
   npm run sync
   ```

Chúc cả nhóm làm việc hiệu quả và hoàn thành dự án PawPal xuất sắc! 🐾
