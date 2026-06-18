# Wireframe: Ưu Đãi Thành Viên (Loyalty / Rewards) — Quy Trình 3.1.13

> **Tuân thủ 100%:** [DESIGN.md](file:///d:/Aboutme/MyProject/Pawpal/Docs/DESIGN.md) + [plan_user_stories.md](file:///d:/Aboutme/MyProject/Pawpal/Docs/plan_user_stories.md)
> **KHÔNG SỬ DỤNG EMOJI TRONG UI** (Trừ emoji `🎁` duy nhất trên Header thanh thông báo) — thay thế bằng ký tự text hoặc SVG tinh tế.
> **Cập nhật:** Tháng 6/2026

---

## 1. LUỒNG TỔNG QUAN (USER FLOW)

```
Trang Ưu đãi & Thành viên (pages/user/loyalty.html)
  ├─ Banner Cảnh báo (Chỉ hiện khi có điểm sắp hết hạn trong 30 ngày)
  ├─ Thẻ Thành viên ảo (Loyalty Card): Tự động đổi màu/style theo hạng (Bạc / Vàng / Kim cương)
  ├─ Thanh Tiến trình nâng hạng: Chỉ rõ số chi tiêu tích lũy và số tiền còn thiếu để lên hạng kế tiếp
  └─ Danh sách Voucher đổi điểm:
       ├─ Thẻ đủ điểm đổi → Kéo thanh trượt [Trượt sang phải để đổi voucher]
       │    ├─ Nếu là Tài khoản tạm:
       │    │    └─ Hiện Pop-up yêu cầu thiết lập mật khẩu bảo mật → Nhấp nút [Tạo mật khẩu] → Đi tới trang đặt mật khẩu → Quay lại tự động khôi phục luồng đổi quà.
       │    └─ Nếu là Thành viên chính thức:
       │         └─ Kéo thành công → Trừ điểm, sinh mã đẩy vào "Voucher của tôi", hiện Toast thông báo thành công.
       ├─ Thẻ thiếu điểm đổi → Nút trượt bị khóa + hiển thị nhãn "Không đủ điểm"
       └─ Thẻ hết voucher → Phủ màu xám mờ (Grayscale opacity) + hiển thị nhãn "Hết quà"
```

---

## 2. WIREFRAME GIAO DIỆN CHÍNH (loyalty.html)

```
┌───────────────────────────────────────────────────────────────────────────┐
│ [Header: Logo | Dịch vụ | Cửa hàng ...      Tra đơn hàng | Đăng nhập ]    │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ◀ TRANG CÁ NHÂN                                                          │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ ⚠ Bạn có 50 điểm Paw Points sắp hết hạn sử dụng vào ngày 15/07/2026. │  │
│  │   Hãy đổi ưu đãi ngay nhé!                                          │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  PAWPAL LOYALTY CARD                                    [ HẠNG VÀNG ]│  │
│  │  Khách hàng: NGUYỄN VĂN A                                           │  │
│  │  Điểm tích lũy hiện tại: 350 Paw Points                             │  │
│  │                                                                     │  │
│  │  Tiến trình nâng hạng Kim Cương:                                    │  │
│  │  [=============>.................................] 5.000.000đ/15.000.000đ│
│  │  (Bạn cần chi tiêu thêm 10.000.000đ để đạt hạng Kim Cương)          │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  DANH SÁCH VOUCHER ĐỔI ĐIỂM                                              │
│  ┌──────────────────────────────────┐ ┌──────────────────────────────────┐│
│  │ Voucher Giảm giá dịch vụ Spa 50k │ │ Voucher Mua sắm hạt hạt 10%      ││
│  │ Trị giá: 50.000đ                 │ │ Trị giá: Giảm 10% (Tối đa 100k)  ││
│  │ Điểm đổi: 100 Paw Points         │ │ Điểm đổi: 150 Paw Points         ││
│  │ ──────────────────────────────── │ │ ──────────────────────────────── ││
│  │ ◯══════════════════════════════▶ │ │ [ Không đủ điểm ]                ││
│  │  Trượt sang phải để đổi voucher  │ │                                  ││
│  └──────────────────────────────────┘ └──────────────────────────────────┘│
│  ┌──────────────────────────────────┐                                     │
│  │ [Hết quà] Voucher Cắt tỉa lông   │                                     │
│  │ Trị giá: 100.000đ                │                                     │
│  │ Điểm đổi: 200 Paw Points         │                                     │
│  │ ──────────────────────────────── │                                     │
│  │ [ Đã hết voucher ]                │                                     │
│  └──────────────────────────────────┘                                     │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 3. WIREFRAME POP-UP BẢO MẬT TÀI KHOẢN TẠM

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│                     BẢO MẬT TÀI KHOẢN                    │
│                                                          │
│     Bạn cần thiết lập mật khẩu tài khoản để sử dụng      │
│     tính năng đổi điểm thưởng Paw Points.                │
│                                                          │
│     [ Thiết lập mật khẩu ngay ]    [ Để sau ]            │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 4. CHI TIẾT CÁC THÀNH PHẦN GIAO DIỆN (UI COMPONENTS) & TRẠNG THÁI

### A. Thẻ ảo thành viên (Virtual Loyalty Card)
- **Hạng Bạc (Silver):**
  - Màu nền: `linear-gradient(135deg, #e0e0e0, #f5f5f5, #bdbdbd)` (Xám bạc ánh kim).
  - Màu chữ: `#333333`.
- **Hạng Vàng (Gold):**
  - Màu nền: `linear-gradient(135deg, #ffe259, #ffa751)` (Vàng đồng ấm áp, bóng bẩy).
  - Màu chữ: `#5d4037`.
- **Hạng Kim Cương (Diamond):**
  - Màu nền: `linear-gradient(135deg, #4f46e5, #7c3aed, #db2777)` (Tím xanh ánh hồng đa sắc).
  - Hiệu ứng: Thêm lớp phủ lấp lánh (Shimmer overlay) động bằng CSS animation.
  - Màu chữ: `#ffffff`.

### B. Thanh trượt xác nhận đổi điểm (Slide-to-Redeem)
- **Cấu tạo:**
  - Container (`.slider-container`): Nền xám nhạt, chiều rộng đầy đủ của card voucher.
  - Nút trượt (`.slider-handle`): Hình tròn, có chứa một mũi tên tinh tế (`▶`).
  - Dòng chữ nhắc nhở (`.slider-text`): Nằm bên dưới handle để hướng dẫn người dùng "Trượt sang phải để đổi voucher".
- **Hành vi tương tác (JavaScript + GSAP / Draggable):**
  - Người dùng nhấn và kéo `.slider-handle` sang bên phải.
  - Khi handle đạt 100% chiều rộng của container:
    - Trigger sự kiện đổi quà.
    - Cập nhật giao diện: Đổi thanh trượt thành nút bấm tĩnh với chữ `Đang đổi...` hoặc `Đã đổi thành công!`.
    - Trừ điểm trên thẻ Loyalty card theo thời gian thực (giả lập trong `localStorage`).
  - Nếu người dùng thả tay giữa chừng: Handle tự động trả về vị trí ban đầu bằng transition mượt mà (`transform: translateX(0)`).

### C. Trạng thái Voucher
- **Đủ điểm (Available):**
  - Thể hiện thanh trượt trơn tru.
- **Thiếu điểm (Locked):**
  - Thanh trượt bị vô hiệu hóa, handle cố định ở góc trái, opacity 0.5.
  - Hiển thị nhãn cảnh báo đỏ nhạt hoặc xám: `Không đủ điểm`.
- **Hết voucher (Out of Stock):**
  - Toàn bộ thẻ voucher bị áp dụng thuộc tính CSS `filter: grayscale(100%) opacity(0.6)`.
  - Nút đổi quà được thay bằng nhãn chữ: `Đã hết quà`.

---

## 5. RÀNG BUỘC KỊCH BẢN NGHIỆP VỤ (BUSINESS RULES)

1. **Khôi phục trạng thái sau khi đặt mật khẩu (US 13-3):**
   - Khi tài khoản tạm thực hiện đổi điểm, lưu trạng thái mã voucher mong muốn đổi vào `sessionStorage`.
   - Chuyển hướng sang `/pages/public/login.html?action=setup-password`.
   - Sau khi thiết lập mật khẩu thành công, JS tại trang thiết lập mật khẩu kiểm tra xem có cờ đổi điểm đang chờ trong `sessionStorage` không. Nếu có, tự động đưa người dùng trở lại trang `/pages/user/loyalty.html` và kích hoạt tự động phần thưởng đó.
2. **Xử lý Rollback lỗi giao dịch (US 13-4):**
   - Giả lập xác suất 5% lỗi mạng/hệ thống khi bấm đổi quà để trình diễn cơ chế Rollback:
     - Giao diện báo lỗi "Hệ thống bận, vui lòng thử lại sau. Điểm của bạn đã được giữ an toàn."
     - Điểm số không bị trừ (hoặc được cộng trả lại ngay lập tức nếu đã trừ).
