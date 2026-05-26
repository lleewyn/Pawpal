# PawPal — Tài liệu Yêu cầu Hệ thống (SRS)

> **Phiên bản:** 1.0  
> **Ngày cập nhật:** 27/05/2026  
> **Công nghệ:** HTML · CSS · JavaScript (Vanilla) · Supabase (backend/DB)  
> **Phạm vi:** Website chăm sóc thú cưng — TP. Hồ Chí Minh

---

## 1. Tổng quan dự án

### 1.1 Bối cảnh

PawPal ra đời để giải quyết khoảng trống số hóa trong ngành dịch vụ chăm sóc thú cưng tại Việt Nam. Phần lớn các cơ sở hiện tại vẫn tiếp nhận đặt lịch qua tin nhắn mạng xã hội, quản lý lịch hẹn bằng sổ tay và cập nhật tình trạng thú cưng thủ công qua Zalo cá nhân — dẫn đến trải nghiệm thiếu minh bạch và gây lo lắng cho chủ nuôi.

### 1.2 Mục tiêu hệ thống

| Góc độ | Mục tiêu |
|---|---|
| **Sản phẩm** | Website đầy đủ chức năng: xem dịch vụ, đặt lịch, mua sắm, quản lý hồ sơ thú cưng |
| **Người dùng** | Giảm thời gian đặt lịch xuống dưới 30 giây, tăng tính minh bạch qua nhật ký real-time |
| **Doanh nghiệp** | Số hóa vận hành, quản lý lịch hẹn, tồn kho và dữ liệu khách hàng tập trung |

### 1.3 Đối tượng sử dụng

- **Khách vãng lai:** Xem dịch vụ, đặt lịch không cần tài khoản
- **Thành viên đã đăng ký:** Quản lý Pet ID, xem lịch sử, tích điểm Paw Points
- **Quản trị viên (Admin):** Quản lý dịch vụ, sản phẩm, lịch hẹn, khách hàng

---

## 2. Cấu trúc hệ thống

### 2.1 Sơ đồ trang (Sitemap)

```
index.html              ← Landing page
├── pages/services.html ← Danh mục dịch vụ
├── pages/shop.html     ← Cửa hàng sản phẩm
├── pages/booking.html  ← Đặt lịch (4 bước)
├── pages/login.html    ← Đăng nhập / Đăng ký
└── pages/dashboard.html← Tài khoản cá nhân
```

### 2.2 Nguồn dữ liệu

| File | Mô tả |
|---|---|
| `Docs/dichvu.csv` | 14 dịch vụ Spa & Hotel với giá, thời gian, quy trình |
| `Docs/sanpham.csv` | 17 sản phẩm với SKU, giá, tồn kho, mô tả |
| `localStorage` | Giỏ hàng, lịch đặt (demo), phiên đăng nhập |
| `Supabase` | Tài khoản, Pet ID, lịch hẹn (production) |

---

## 3. Yêu cầu chức năng

### 3.1 Module Xác thực (Authentication)

#### US-1a: Đăng ký thành viên

| Trường | Yêu cầu |
|---|---|
| Họ tên | Bắt buộc, không rỗng |
| Số điện thoại | Đúng định dạng VN (10 số, bắt đầu 03/05/07/08/09) |
| Mật khẩu | Tối thiểu 8 ký tự, có ít nhất 1 số và 1 ký tự đặc biệt |
| Xác nhận mật khẩu | Phải khớp với mật khẩu |

**Luồng xử lý:**
1. Validate form → Nút "Đăng ký" chỉ mở khóa khi tất cả hợp lệ
2. Kiểm tra SĐT đã tồn tại → Hiển thị lỗi nếu trùng
3. Gửi OTP qua SMS Gateway → Hiệu lực 5 phút
4. Xác thực OTP thành công → Tạo tài khoản + cộng 50 Paw Points
5. Hiển thị popup chào mừng

**Giao diện OTP:** 6 ô nhập riêng biệt, đồng hồ đếm ngược 05:00, nút "Gửi lại" khóa 60 giây đầu.

---

#### US-1b: Định danh lũy tiến (Khách vãng lai)

Khi khách vãng lai đặt lịch thành công:
1. Hệ thống tự tạo "Tài khoản tạm" dựa trên SĐT
2. Gửi SMS chứa link thiết lập mật khẩu (hiệu lực 48 giờ)
3. Sau khi thiết lập mật khẩu → Chuyển thành "Thành viên chính thức" + 50 Paw Points

---

#### US-2a: Đăng nhập

| Phương thức | Mô tả |
|---|---|
| Mật khẩu | SĐT + mật khẩu, sai 5 lần → khóa 30 phút |
| OTP | Gửi mã 6 số qua SMS, hiệu lực 5 phút |
| Quên mật khẩu | Link khôi phục qua SMS, hiệu lực 48 giờ |

**Xử lý lỗi:**
- SĐT chưa đăng ký → Hiển thị nút "Đăng ký ngay"
- Sai mật khẩu → Thông báo lỗi rõ ràng
- Tài khoản bị khóa → Overlay đếm ngược + nút gọi Hotline

---

#### US-2b: Đổi mật khẩu

- Yêu cầu xác minh bằng mật khẩu cũ hoặc OTP
- Mật khẩu mới: ≥ 8 ký tự, có số và ký tự đặc biệt
- Hiển thị thanh đo độ mạnh (Yếu → Trung bình → Mạnh)
- Tài khoản tạm chưa có mật khẩu → Chặn tính năng "Đổi điểm thưởng"

---

#### US-2c: Quản lý phiên

- Sau 55 phút không thao tác → Popup cảnh báo đếm ngược 5 phút
- Sau 60 phút → Tự động đăng xuất, chuyển về trang đăng nhập
- Đăng nhập từ thiết bị/IP lạ → Gửi SMS cảnh báo

---

### 3.2 Module Dịch vụ (Services)

**Trang:** `pages/services.html`  
**Dữ liệu:** Load từ `Docs/dichvu.csv`

#### Tính năng:

| Tính năng | Mô tả |
|---|---|
| Hiển thị danh sách | Grid/List view, load từ CSV |
| Filter đa chiều | Loại (Spa/Hotel), Loài (Chó/Mèo), Cân nặng, Trạng thái |
| Tìm kiếm | Theo tên, mô tả dịch vụ |
| Modal chi tiết | Quy trình từng bước, giá thành viên theo hạng, nút đặt lịch |
| Đếm số lượng | Hiển thị số dịch vụ theo từng filter |
| Trạng thái | Đang phục vụ / Tạm ngưng (hiển thị rõ, không cho đặt nếu tạm ngưng) |

#### Dữ liệu dịch vụ (từ CSV):

| Trường | Mô tả |
|---|---|
| Mã dịch vụ | SPA01–SPA09, HTL01–HTL06 |
| Tên dịch vụ | Tên hiển thị |
| Loại thú cưng | Chó / Mèo / Cả hai |
| Phân khúc cân nặng | Siêu nhỏ / Nhỏ / Vừa / Lớn / Tất cả |
| Giá niêm yết | Giá gốc |
| Giá thành viên | Bạc -5% / Vàng -10% / Kim cương -15% |
| Thời gian | Tính bằng phút hoặc "Theo ngày" |
| Mô tả | Lợi ích ngắn gọn |
| Quy trình | Các bước thực hiện (phân tách bằng →) |
| Trạng thái | Đang phục vụ / Tạm ngưng |

---

### 3.3 Module Cửa hàng (Shop)

**Trang:** `pages/shop.html`  
**Dữ liệu:** Load từ `Docs/sanpham.csv`

#### Tính năng:

| Tính năng | Mô tả |
|---|---|
| Hiển thị sản phẩm | Grid/List view, load từ CSV |
| Filter | Danh mục, Trạng thái tồn kho, Thương hiệu (auto-build), Khoảng giá |
| Tìm kiếm + Sort | Theo tên, thương hiệu; sắp xếp giá/tên/tồn kho |
| Cảnh báo tồn kho | Banner tự động khi có sản phẩm sắp hết (tồn kho < mức tối thiểu) |
| Modal chi tiết | 3 tab: Mô tả / Cách dùng / Thành phần; thanh tồn kho; chọn số lượng |
| Giỏ hàng (Cart Drawer) | Thêm/xóa/sửa số lượng, tính tổng, miễn ship từ 300.000đ |
| Lưu giỏ hàng | Persist qua `localStorage` |

#### Dữ liệu sản phẩm (từ CSV):

| Trường | Mô tả |
|---|---|
| SKU | Mã sản phẩm duy nhất |
| Tên sản phẩm | Tên hiển thị |
| Thương hiệu | Brand |
| Danh mục | Thực phẩm / Đồ dùng / Vệ sinh / Phụ kiện |
| Giá bán lẻ | Giá gốc |
| Giá sau tích điểm | Giá thành viên |
| Tồn kho | Số lượng thực tế |
| Cảnh báo tối thiểu | Ngưỡng cảnh báo nhập thêm hàng |
| Mô tả | Thành phần (TP) / Công dụng (CD) / Hướng dẫn (HDSD) |
| Thuộc tính đặc biệt | Thông tin bổ sung |
| Trạng thái | Còn hàng / Hết hàng / Ngừng kinh doanh |

---

### 3.4 Module Đặt lịch (Booking)

**Trang:** `pages/booking.html`  
**Dữ liệu:** Load dịch vụ từ `Docs/dichvu.csv`

#### Flow 4 bước:

```
Bước 1: Chọn dịch vụ
  → Tab Spa & Grooming / Pet Hotel
  → Chọn 1 dịch vụ từ danh sách (load từ CSV)
  → Nút "Tiếp theo" chỉ mở khi đã chọn

Bước 2: Thông tin bé cưng
  → Họ tên chủ nuôi (bắt buộc)
  → SĐT (bắt buộc, validate định dạng VN)
  → Tên bé, Loài, Giống, Cân nặng (bắt buộc)
  → Ghi chú đặc biệt (dị ứng, sở thích...)

Bước 3: Chọn lịch hẹn
  → Spa: Chọn ngày + timeslot (hiển thị slot trống/đầy)
  → Hotel: Chọn check-in / check-out → Tự tính số đêm + tổng tiền

Bước 4: Xác nhận
  → Review toàn bộ thông tin
  → Nút "Sửa" từng phần quay về bước tương ứng
  → Checkbox đồng ý điều khoản
  → Xác nhận → Tạo mã đặt lịch PP-XXXXXX
  → Lưu vào localStorage
  → Modal thành công + link xem lịch hẹn
```

#### Yêu cầu bổ sung:

- Pre-select dịch vụ qua URL param `?service=SPA01`
- Summary sidebar cập nhật real-time theo từng bước
- Ngày tối thiểu = ngày hiện tại (không cho chọn ngày quá khứ)
- Khách vãng lai đặt lịch → Hiển thị note "Thông tin sẽ được lưu để tích điểm"

---

### 3.5 Module Dashboard (Tài khoản cá nhân)

**Trang:** `pages/dashboard.html`

#### Các tab:

| Tab | Nội dung |
|---|---|
| **Thông tin chung** | SĐT, Paw Points, hạng thành viên, nút đổi điểm |
| **Hồ sơ Pet ID** | Thẻ "Pawport" với ảnh, tên, giống, tuổi, cân nặng, mã ID |
| **Lịch hẹn** | Danh sách booking từ localStorage, trạng thái, nút hủy |
| **Bảo mật** | Đổi mật khẩu, thanh đo độ mạnh, xác minh OTP |

#### Hạng thành viên:

| Hạng | Điều kiện | Ưu đãi |
|---|---|---|
| Bạc | Mặc định | Giảm 5% dịch vụ |
| Vàng | ≥ 500 Paw Points | Giảm 10% dịch vụ |
| Kim cương | ≥ 2000 Paw Points | Giảm 15% dịch vụ |

---

## 4. Yêu cầu phi chức năng

### 4.1 Hiệu năng

- Trang tải trong < 3 giây trên kết nối 4G
- Loader chỉ hiển thị nếu tải > 300ms (smart loader)
- Ảnh dùng `loading="lazy"` để tối ưu

### 4.2 Responsive

| Breakpoint | Hành vi |
|---|---|
| ≥ 1024px | Layout đầy đủ, sidebar hiển thị |
| 768px – 1023px | Sidebar collapse, filter dạng grid |
| < 768px | Single column, stepper ẩn label |

### 4.3 Bảo mật

- Mật khẩu lưu dạng hash (bcrypt khi tích hợp Supabase)
- Session timeout sau 60 phút không hoạt động
- Cảnh báo đăng nhập từ thiết bị lạ qua SMS
- Khóa tài khoản sau 5 lần nhập sai mật khẩu (30 phút)

### 4.4 Khả năng tiếp cận (Accessibility)

- Tất cả button/link có `aria-label`
- Form có `label` liên kết với input
- Contrast ratio đạt WCAG AA
- Keyboard navigation hỗ trợ đầy đủ

### 4.5 Trình duyệt hỗ trợ

Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

---

## 5. Kiến trúc kỹ thuật

### 5.1 Stack công nghệ

| Tầng | Công nghệ |
|---|---|
| Frontend | HTML5, CSS3 (Vanilla), JavaScript ES6+ |
| Font | Be Vietnam Pro, EB Garamond, Instrument Serif (Google Fonts) |
| Data (demo) | CSV files (tab-separated), localStorage |
| Backend (production) | Python + Supabase |
| Database | Supabase (PostgreSQL) |
| SMS Gateway | Tích hợp sau (Twilio / ESMS) |

### 5.2 Cấu trúc thư mục

```
Pawpal/
├── index.html
├── pages/
│   ├── services.html
│   ├── shop.html
│   ├── booking.html
│   ├── login.html
│   └── dashboard.html
├── assets/
│   ├── css/
│   │   ├── style.css       ← Design system chung
│   │   ├── services.css
│   │   ├── shop.css
│   │   └── booking.css
│   ├── js/
│   │   ├── main.js         ← Shared: header, carousel, FAQ...
│   │   ├── auth.js         ← Login/Register logic
│   │   ├── services.js     ← Load & filter dịch vụ
│   │   ├── shop.js         ← Load sản phẩm, giỏ hàng
│   │   └── booking.js      ← 4-step booking flow
│   └── images/
│       ├── services/
│       ├── experts/
│       ├── tracker/
│       └── products/       ← (cần bổ sung ảnh thực)
└── Docs/
    ├── dichvu.csv
    ├── sanpham.csv
    └── requirements.md     ← File này
```

### 5.3 Design System (CSS Variables)

```css
--color-primary:       hsl(156, 36%, 26%)  /* Forest Green #2A5944 */
--color-accent:        hsl(38, 77%, 57%)   /* Gold #E5A93C */
--font-primary:        'Be Vietnam Pro'
--font-heading:        'EB Garamond'
--font-display:        'Instrument Serif'
--border-radius-lg:    24px
--border-radius-pill:  100px
```

---

## 6. Trạng thái triển khai

| Module | Trạng thái | Ghi chú |
|---|---|---|
| Landing page (`index.html`) | ✅ Hoàn thành | Hero, Services, Shop, Tracker, FAQ, Footer |
| Đăng nhập / Đăng ký (`login.html`) | ✅ Hoàn thành | OTP flow, quên mật khẩu, tài khoản tạm |
| Trang Dịch vụ (`services.html`) | ✅ Hoàn thành | Load CSV, filter, modal chi tiết |
| Trang Cửa hàng (`shop.html`) | ✅ Hoàn thành | Load CSV, giỏ hàng, modal sản phẩm |
| Trang Đặt lịch (`booking.html`) | ✅ Hoàn thành | 4-step flow, lưu localStorage |
| Dashboard (`dashboard.html`) | 🔄 Cơ bản | Cần hoàn thiện tab Lịch hẹn thực |
| Tích hợp Supabase | ⏳ Chưa làm | Cần backend thực |
| SMS Gateway | ⏳ Chưa làm | OTP hiện là mock |
| Trang Admin | ⏳ Chưa làm | Quản lý lịch hẹn, sản phẩm |
| Ảnh sản phẩm thực | ⏳ Chưa làm | Đang dùng Unsplash placeholder |

---

## 7. Backlog ưu tiên tiếp theo

### P1 — Cao (cần làm ngay)

- [ ] **Dashboard hoàn thiện:** Hiển thị lịch hẹn từ localStorage, Pet ID form thêm/sửa
- [ ] **Kết nối Supabase:** Auth thực, lưu booking, Pet ID vào DB
- [ ] **Ảnh sản phẩm thực:** Thay thế Unsplash bằng ảnh thật

### P2 — Trung bình

- [ ] **Trang Admin:** Quản lý lịch hẹn, cập nhật trạng thái, quản lý tồn kho
- [ ] **SMS OTP thực:** Tích hợp ESMS hoặc Twilio
- [ ] **Nhật ký tracker thực:** Upload ảnh/video theo mốc quy trình

### P3 — Thấp (tương lai)

- [ ] **Thanh toán online:** VNPay / MoMo
- [ ] **Nhắc lịch tự động:** Zalo OA / SMS
- [ ] **Hệ thống đánh giá:** Review sau dịch vụ
- [ ] **Gợi ý sản phẩm:** Dựa trên hồ sơ Pet ID

---

## 8. Ghi chú kỹ thuật

- **CSV parsing:** Tab-separated, hỗ trợ quoted fields có newline bên trong
- **Giỏ hàng:** Persist qua `localStorage` key `pawpal_cart`
- **Booking:** Persist qua `localStorage` key `pawpal_bookings`
- **Pre-select dịch vụ:** `booking.html?service=SPA01` tự động chọn dịch vụ
- **Timeslot:** Hiện tại mock cứng, cần thay bằng API kiểm tra lịch thực
- **Responsive breakpoints:** 1024px (tablet), 768px (mobile)
