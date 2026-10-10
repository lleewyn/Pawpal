# KẾ HOẠCH CHI TIẾT TÁCH FILE JAVASCRIPT THEO TỪNG SUBTAB CHO HỆ THỐNG ADMIN PAWPAL

> **Mục tiêu**: Tối ưu hóa kiến trúc Admin Pawpal-er bằng cách module hóa toàn bộ 8 phân hệ có subtabs, phân rã các file nguyên khối khổng lồ (từ 150KB - 410KB) thành các file JS chuyên biệt theo từng subtab, giữ nguyên 100% tính năng, tuân thủ nghiêm ngặt quy chuẩn [AGENTS.md](file:///d:/Aboutme/MyProject/Pawpal/AGENTS.md).

---

## 1. TỔNG QUAN HIỆN TRẠNG VÀ PHẠM VI DỰ ÁN

| Phân hệ | Số lượng Subtab | File JS hiện tại | Dung lượng gốc | Trạng thái đề xuất |
| :--- | :---: | :--- | :--- | :--- |
| **Dashboard** | 0 | `dashboard.js` | ~59 KB | Giữ nguyên (không có subtab) |
| **1. Bán hàng (`orders`)** | 4 | `orders.js` | **412 KB** (~7.500 dòng) | Tách thành 1 Core + 4 Subtab JS |
| **2. Khách hàng (`customers`)** | 3 | `customers.js` | **156 KB** (~3.000 dòng) | Tách thành 1 Core + 3 Subtab JS |
| **3. Thú cưng (`pets`)** | 4 | `pets.js` | **193 KB** (~3.500 dòng) | Tách thành 1 Core + 4 Subtab JS |
| **4. Dịch vụ (`services`)** | 4 | `services.js` | **330 KB** (~6.500 dòng) | Tách thành 1 Core + 4 Subtab JS |
| **5. Nhân sự (`staff`)** | 4 | `staff.js` | **240 KB** (~4.500 dòng) | Tách thành 1 Core + 4 Subtab JS |
| **6. Khiếu nại (`complaints`)** | 3 | `complaints.js` | **234 KB** (~4.200 dòng) | Tách thành 1 Core + 3 Subtab JS |
| **7. Chatbot (`chatbot`)** | 3 | `chatbot.js` | **203 KB** (~3.800 dòng) | Tách thành 1 Core + 3 Subtab JS |
| **8. Cấu hình (`settings`)** | 4 | `settings.js` | **144 KB** (~2.800 dòng) | Tách thành 1 Core + 4 Subtab JS |

---

## 2. NGUYÊN TẮC THIẾT KẾ KIẾN TRÚC (ARCHITECTURE DESIGN)

### 2.1. Cấu trúc thư mục đồng bộ cho mỗi phân hệ
Mỗi phân hệ sẽ có cấu trúc thư mục con `subtabs/`:
```text
pages/admin/modules/[module_name]/
├── [module_name].html            # Markup HTML chứa các section .subtab-content
├── [module_name].css             # Toàn bộ CSS giao diện phân hệ
├── [module_name].js              # FILE CORE: Điều phối, Live Supabase sync, State store chung
└── subtabs/
    ├── tab-[tên_subtab_1].js     # Nghiệp vụ & giao diện subtab 1
    ├── tab-[tên_subtab_2].js     # Nghiệp vụ & giao diện subtab 2
    └── ...
```

### 2.2. Cơ chế chia sẻ dữ liệu qua Global Namespace (Zero Collision)
Mỗi phân hệ sở hữu một đối tượng quản lý trạng thái duy nhất trên `window`:
- Bán hàng: `window.PawpalOrders`
- Khách hàng: `window.PawpalCustomers`
- Thú cưng: `window.PawpalPets`
- Dịch vụ: `window.PawpalServices`
- Nhân sự: `window.PawpalStaff`
- Khiếu nại: `window.PawpalComplaints`
- Chatbot: `window.PawpalChatbot`
- Cấu hình: `window.PawpalSettings`

Mỗi namespace cung cấp:
1. `state`: Dữ liệu bộ nhớ đệm dùng chung (danh sách thực thể, filter, trang hiện tại, chi tiết đang mở).
2. `syncFromSupabase()`: Đồng bộ dữ liệu thực tế từ Supabase (Rule 6).
3. `subtabs`: Bảng đăng ký các controller của từng subtab.
4. `switchTab(tabId, entityId)`: Điều hướng mượt mà giữa các tab (ví dụ: bấm một dòng ở tab danh sách để chuyển sang tab hồ sơ chi tiết và điền ID).

### 2.3. Cơ chế Nạp Script động trong `admin.js`
Nâng cấp hàm nạp script của `admin.js` để tự động dọn dẹp các script của phân hệ trước và nạp chuỗi script tuần tự:
```javascript
// admin.js
async function loadModuleScripts(scripts) {
    // 1. Gỡ bỏ toàn bộ script dynamic cũ
    document.querySelectorAll('.dynamic-module-script').forEach(el => el.remove());
    // 2. Nạp tuần tự đảm bảo file Core chạy trước, subtabs chạy ngay sau
    for (const src of scripts) {
        await new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.className = 'dynamic-module-script';
            s.src = `${src}?v=${Date.now()}`;
            s.onload = resolve;
            s.onerror = reject;
            document.body.appendChild(s);
        });
    }
}
```

---

## 3. KẾ HOẠCH TRIỂN KHAI CHI TIẾT TỪNG PHÂN HỆ

### Giai đoạn 0: Chuẩn bị nền tảng (Foundation Setup)
- Cập nhật hàm `loadModuleScripts()` trong [admin.js](file:///d:/Aboutme/MyProject/Pawpal/pages/admin/admin.js).
- Định nghĩa bản đồ script `MODULE_SCRIPTS_MAP` để hỗ trợ nạp mượt mà danh sách file của từng phân hệ.

---

### Giai đoạn 1: Phân hệ Bán hàng (`orders`) — *Thí điểm (Pilot)*
- **File Core**: `modules/orders/orders.js`
  - Quản lý `window.PawpalOrders`.
  - Đồng bộ `orders`, `products`, `vouchers`, `stock_logs` từ Supabase.
  - Phân luồng sự kiện chuyển tab giữa Đơn hàng ⟷ Hồ sơ ⟷ Kho ⟷ Voucher.
- **Tách 4 subtab**:
  1. `subtabs/tab-order-list.js`: Bảng danh sách đơn hàng, tìm kiếm, lọc theo trạng thái/kênh, phân trang chuẩn 10 dòng, cập nhật trạng thái đơn, viền cảnh báo đỏ khi quá hạn/khiếu nại.
  2. `subtabs/tab-order-detail.js`: Hồ sơ đơn hàng 360°, chi tiết giỏ hàng, thông tin thanh toán, tiến trình vận đơn, in phiếu xuất kho / hóa đơn.
  3. `subtabs/tab-order-products.js`: Quản lý danh mục sản phẩm, tồn kho, cảnh báo hết hàng, phiếu nhập kho (GRN), điều chỉnh kho.
  4. `subtabs/tab-order-promos.js`: Quản lý voucher, mã giảm giá, cấu hình điều kiện áp dụng, kiểm tra hiệu lực.

---

### Giai đoạn 2: Phân hệ Khách hàng (`customers`)
- **File Core**: `modules/customers/customers.js`
  - Quản lý `window.PawpalCustomers`.
  - Đồng bộ `customers`, `customer_addresses`, `pawpoint_history` từ Supabase.
- **Tách 3 subtab**:
  1. `subtabs/tab-customer-list.js`: Danh sách khách hàng, tìm kiếm đa năng, lọc theo hạng thẻ/trạng thái, modal thêm khách, modal đổi trạng thái tài khoản.
  2. `subtabs/tab-customer-profile.js`: Hồ sơ khách hàng 360°, danh sách thú cưng của khách, lịch sử dịch vụ và đơn hàng, sổ đa địa chỉ giao hàng.
  3. `subtabs/tab-customer-pawpoint.js`: Quản lý Pawpoint, nhật ký tích/tiêu điểm, modal điều chỉnh điểm thủ công với chip gợi ý lý do.

---

### Giai đoạn 3: Phân hệ Thú cưng (`pets`)
- **File Core**: `modules/pets/pets.js`
  - Quản lý `window.PawpalPets`.
  - Đồng bộ `pets`, `pet_care_logs`, `pet_vaccinations` từ Supabase.
- **Tách 4 subtab**:
  1. `subtabs/tab-pet-list.js`: Danh sách thú cưng, lọc theo loài/giống/trạng thái, hiển thị cảnh báo sức khỏe/tập tính.
  2. `subtabs/tab-pet-profile.js`: Hồ sơ thú cưng 360°, thẻ căn cước thú cưng, thông tin chủ nuôi, tiền sử bệnh án, khẩu phần ăn.
  3. `subtabs/tab-pet-carelog.js`: Nhật ký chăm sóc nội trú / spa, chỉ số cân nặng, hình ảnh ca chăm sóc.
  4. `subtabs/tab-pet-reminders.js`: Lịch nhắc tiêm phòng, tẩy giun, tái khám định kỳ, gửi thông báo nhắc nhở.

---

### Giai đoạn 4: Phân hệ Dịch vụ (`services`)
- **File Core**: `modules/services/services.js`
  - Quản lý `window.PawpalServices`.
  - Đồng bộ `service_bookings`, `service_catalog`, `service_reviews` từ Supabase.
- **Tách 4 subtab**:
  1. `subtabs/tab-service-bookings.js`: Danh sách lịch hẹn đặt dịch vụ, điều phối kỹ thuật viên, bộ lọc theo ngày và trạng thái tiếp nhận.
  2. `subtabs/tab-service-detail.js`: Hồ sơ ca dịch vụ 360°, biên bản tiếp nhận an toàn, ảnh check-in/check-out, chi phí vật tư phát sinh.
  3. `subtabs/tab-service-catalog.js`: Bảng giá dịch vụ spa/khách sạn/khám, combo chăm sóc, quy định phụ phí theo cân nặng.
  4. `subtabs/tab-service-reviews.js`: Danh sách đánh giá của khách hàng, xếp hạng sao, phản hồi đánh giá.

---

### Giai đoạn 5: Phân hệ Nhân sự (`staff`)
- **File Core**: `modules/staff/staff.js`
  - Quản lý `window.PawpalStaff`.
  - Đồng bộ `staff`, `shifts`, `kpi_assessments` từ Supabase.
- **Tách 4 subtab**:
  1. `subtabs/tab-staff-list.js`: Danh sách nhân sự, phân quyền, phòng ban, trạng thái làm việc, avatar chữ cái tròn 50%.
  2. `subtabs/tab-staff-profile.js`: Hồ sơ nhân sự, thông tin cá nhân, hợp đồng, chứng chỉ nghề nghiệp.
  3. `subtabs/tab-staff-schedule.js`: Lịch làm việc theo tuần/tháng, phân ca trực KTV, chấm công.
  4. `subtabs/tab-staff-assessment.js`: Đánh giá hiệu suất làm việc, tính toán KPI, tỷ lệ hài lòng từ khách.

---

### Giai đoạn 6: Phân hệ Khiếu nại (`complaints`)
- **File Core**: `modules/complaints/complaints.js`
  - Quản lý `window.PawpalComplaints`.
  - Đồng bộ `complaints`, `complaint_logs` từ Supabase.
- **Tách 3 subtab**:
  1. `subtabs/tab-complaint-services.js`: Danh sách khiếu nại liên quan đến dịch vụ (spa, thú y, trễ hẹn).
  2. `subtabs/tab-complaint-orders.js`: Danh sách khiếu nại đơn hàng (hàng lỗi, thiếu quà, giao trễ).
  3. `subtabs/tab-complaint-detail.js`: Hồ sơ xử lý khiếu nại, biên bản giải trình, phương án đền bù (voucher, hoàn tiền, cộng điểm).

---

### Giai đoạn 7: Phân hệ Chatbot (`chatbot`)
- **File Core**: `modules/chatbot/chatbot.js`
  - Quản lý `window.PawpalChatbot`.
  - Kết nối Supabase Realtime kênh tin nhắn.
- **Tách 3 subtab**:
  1. `subtabs/tab-chatbot-live.js`: Giao diện trực chat đa khách hàng, tiếp quản hội thoại giữa nhân viên và khách.
  2. `subtabs/tab-chatbot-copilot.js`: Trợ lý AI gợi ý phản hồi, tra cứu thông tin nhanh cho KTV.
  3. `subtabs/tab-chatbot-rules.js`: Cấu hình quy tắc trả lời tự động, kịch bản hội thoại, câu hỏi thường gặp FAQ.

---

### Giai đoạn 8: Phân hệ Cấu hình (`settings`)
- **File Core**: `modules/settings/settings.js`
  - Quản lý `window.PawpalSettings`.
  - Đồng bộ cài đặt hệ thống, banners, bài viết, logs.
- **Tách 4 subtab**:
  1. `subtabs/tab-settings-banners.js`: Cấu hình banner trang chủ, popup sự kiện, hình ảnh truyền thông.
  2. `subtabs/tab-settings-content.js`: Quản lý bài viết blog kiến thức thú cưng, bài hướng dẫn.
  3. `subtabs/tab-settings-system.js`: Cấu hình thông tin cơ sở, giờ mở cửa, chính sách tích điểm chung.
  4. `subtabs/tab-settings-audit.js`: Nhật ký kiểm toán hệ thống (Audit Logs), theo dõi truy vết thao tác của nhân viên.

---

## 4. TIÊU CHUẨN KIỂM ĐỊNH (ACCEPTANCE CRITERIA)

Mỗi phân hệ sau khi tách subtab BẮT BUỘC đạt đủ các tiêu chuẩn sau:
1. **Bảo toàn 100% tính năng**: Mọi thao tác thêm/sửa/xóa/lọc/tìm kiếm/chuyển tab hoạt động mượt mà như trước.
2. **Tuân thủ quy chuẩn [AGENTS.md](file:///d:/Aboutme/MyProject/Pawpal/AGENTS.md)**:
   - Bo góc cố định 9px, không viền dày, không gradient.
   - Text-only toàn bộ ngoại trừ icon sidebar.
   - Bảng màu Forest Green, avatar tròn 50%.
   - Cấm 100% mock JSON, nạp trực tiếp qua Supabase live database.
3. **Subtab State Persistence**: Reload trang (F5) hoặc đổi hash URL giữ nguyên tab đang chọn và dữ liệu hiển thị.
4. **Không phát sinh lỗi console**: Không có lỗi `undefined function`, không có lỗi vòng lặp hay trùng lặp event listener khi chuyển qua lại giữa các menu.
