# Wireframe: Quản Lý Thông Báo — Quy Trình 3.1.14

> **Tuân thủ 100%:** [DESIGN.md](file:///d:/Aboutme/MyProject/Pawpal/Docs/DESIGN.md) + [plan_user_stories.md](file:///d:/Aboutme/MyProject/Pawpal/Docs/plan_user_stories.md)
> **KHÔNG SỬ DỤNG EMOJI TRONG UI** (Trừ emoji `🎁` duy nhất trên Header thanh thông báo) — sử dụng ký tự text hoặc SVG tinh tế.
> **Cập nhật:** Tháng 6/2026

---

## 1. LUỒNG TỔNG QUAN (USER FLOW)

```
Sự kiện phát sinh (Đặt lịch, nhật ký, trạng thái đơn hàng)
  ├─ Nếu user online → Hiện Banner Toast đẩy trượt từ góc phải (tự ẩn sau 5 giây)
  └─ Cập nhật số Badge trên biểu tượng Chuông ở Header
       └─ Click Chuông → Mở Menu Dropdown thả xuống danh sách thông báo
            ├─ Bấm [Đánh dấu đọc tất cả] → Đưa badge về 0, chuyển trạng thái các dòng thành "Đã đọc"
            ├─ Bấm 1 thông báo cụ thể → Đánh dấu đã đọc thông báo đó → Tự động chuyển hướng tới trang chi tiết (Đơn hàng, Nhật ký, Lịch hẹn)
            └─ Vuốt sang trái (Swipe) trên Mobile hoặc bấm nút Xóa nhanh → Ẩn thông báo → Hiện Toast [Đã xóa thông báo. Hoàn tác] trong 3 giây
```

---

## 2. WIREFRAME: CHUÔNG & DROPDOWN THÔNG BÁO (Trên Header)

```
[Logo]   [Dịch vụ]   [Cửa hàng]       [Tra cứu]     [ [Icon Chuông] (3) ]   [ Đăng nhập ]
                                                   ┌────────────────────────┐
                                                   │ THÔNG BÁO              │
                                                   ├────────────────────────┤
                                                   │ [●] [Icon Dịch vụ]     │
                                                   │ Bé Bông đã tắm xong!   │
                                                   │ 5 phút trước           │
                                                   ├────────────────────────┤
                                                   │ [●] [Icon Đơn hàng]    │
                                                   │ Đơn #ORD-2026 đang giao│
                                                   │ 10 phút trước          │
                                                   ├────────────────────────┤
                                                   │ [ ] [Icon Ưu đãi]      │
                                                   │ Nhận ưu đãi 10%...     │
                                                   │ 1 giờ trước            │
                                                   ├────────────────────────┤
                                                   │ [ Đánh dấu đọc tất cả ]│
                                                   └────────────────────────┘
```
*(Ghi chú: [●] chỉ trạng thái Chưa đọc có nền xanh nhạt, [ ] chỉ trạng thái Đã đọc có nền trắng thông thường. Tất cả các Icon đều là SVG tối giản màu đơn sắc, không sử dụng emoji)*

---

## 3. WIREFRAME: TOAST THÔNG BÁO ĐẨY (Góc Phải Màn Hình)

```
                                                   ┌────────────────────────┐
                                                   │ [Icon Dịch vụ] DỊCH VỤ │
                                                   │ Bé Bông của bạn đã hoàn│
                                                   │ thành liệu trình Spa!  │
                                                   └────────────────────────┘
```
*(Ghi chú: Banner Toast tự động trượt mượt mà ra từ mép phải màn hình, có nút đóng nhanh ở góc và tự ẩn đi sau 5 giây)*

---

## 4. WIREFRAME: TRANG CÀI ĐẶT NHẬN THÔNG BÁO (Cài đặt riêng tư)

```
┌─────────────────────────────────────────────────────────────┐
│  CÀI ĐẶT RIÊNG TƯ & THÔNG BÁO                               │
├─────────────────────────────────────────────────────────────┤
│  Cấu hình các loại thông báo bạn muốn nhận:                 │
│                                                             │
│  [o] Nhận thông báo Lịch hẹn và Dịch vụ của bé cưng          │
│      (Bắt buộc để theo dõi tiến độ chăm sóc)               │
│                                                             │
│  [x] Nhận thông báo Mua sắm & Đơn hàng của tôi              │
│      (Cập nhật trạng thái đóng gói, giao hàng)              │
│                                                             │
│  [x] Nhận thông báo Khuyến mãi & Ưu đãi                    │
│      (Quà tặng sinh nhật bé, mã giảm giá)                   │
│                                                             │
│  [o] Nhận tin nhắn khẩn cấp qua SMS                         │
│      (Sử dụng khi có sự cố nghiêm trọng hoặc trễ hẹn)        │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  [ Lưu cấu hình ]                                           │
└─────────────────────────────────────────────────────────────┘
```
*(Ghi chú: [o] là Toggle bật màu xanh lá, [x] là Toggle tắt màu xám)*

---

## 5. CHI TIẾT CÁC THÀNH PHẦN GIAO DIỆN (UI COMPONENTS) & TRẠNG THÁI

### A. Icon Chuông & Badge Counter
- Icon chuông sử dụng SVG nét mảnh (Stroke).
- Khi có thông báo chưa đọc, góc phải trên của chuông hiển thị một vòng tròn nhỏ màu đỏ (`--color-danger`), bên trong ghi số lượng (ví dụ: `3`). Nếu số lượng > 9, hiển thị `9+`.
- Khi nhấp vào Chuông, nếu danh sách trống, hiển thị: *"Bạn không có thông báo mới nào"*.

### B. Dòng thông báo (Notification Item)
- **Trạng thái chưa đọc:** Nền màu xanh dương nhạt (`--color-info-light`), có chấm tròn xanh lam nhỏ ở đầu dòng để định vị thị giác.
- **Trạng thái đã đọc:** Nền màu trắng (`--color-bg-white`), không có chấm tròn chỉ thị.
- **Biểu tượng phân loại (Category Icon):**
  - Dịch vụ / Nhật ký bé cưng: Icon dấu chân thú cưng (🐾).
  - Đơn hàng / Shop: Icon giỏ hàng (🛒).
  - Ưu đãi / Loyalty: Icon thẻ ưu đãi / tag quà tặng (🎁).

### C. Cơ chế Vuốt để xóa (Swipe-to-Delete) & Undo Toast
- Trên thiết bị di động, người dùng có thể vuốt (Swipe) một dòng thông báo sang trái để làm lộ ra nút **Xóa (Delete)** màu đỏ.
- Khi nhấn Xóa, dòng thông báo biến mất tạm thời kèm theo một Toast nhỏ màu đen nhám xuất hiện ở đáy màn hình:
  - Nội dung: `Đã xóa thông báo. Bấm để Hoàn tác`
  - Thời gian hiển thị: 3 giây.
  - Nếu người dùng bấm vào chữ **Hoàn tác (Undo)**, dòng thông báo sẽ xuất hiện trở lại danh sách cũ.

---

## 6. RÀNG BUỘC KỊCH BẢN NGHIỆP VỤ (BUSINESS RULES)

1. **Cá nhân hóa và fallback tên bé cưng (US 14-1 / AC1.3):**
   - Nội dung thông báo dịch vụ phải được kiểm tra hồ sơ bé. Nếu bé đã được đặt tên, chèn tên bé (ví dụ: *"Bé Bông đã được tắm rửa xong"*). Nếu chưa có tên, hệ thống tự động thay thế bằng cụm từ mặc định *"Bé yêu của bạn"* (ví dụ: *"Bé yêu của bạn đã được tắm rửa xong"*).
2. **Cấu hình chặn thông báo Marketing (US 14-4 / AC4.2):**
   - Khi hệ thống chạy chiến dịch gửi thông báo tiếp thị, kiểm tra cấu hình riêng tư của khách hàng. Nếu khách tắt công tắc tiếp thị, hệ thống chặn gửi thông báo này. Hệ thống không cho phép tắt thông báo liên quan đến sức khỏe/lịch hẹn khẩn cấp của bé cưng.
3. **SMS dự phòng cho sự kiện khẩn cấp (US 14-5 / AC5.1):**
   - Đối với thông báo khẩn cấp (thay đổi lịch hẹn đột xuất, thông báo sức khỏe bé), nếu sau 15 phút khách hàng không mở xem trên website (trạng thái vẫn là "Chưa đọc"), hệ thống tự động kích hoạt gửi SMS dự phòng tới số điện thoại của họ với nội dung không dấu ngắn gọn dưới 160 ký tự.
4. **Khung giờ gửi thông báo Marketing (US 14-5 / AC5.2):**
   - Các thông báo tiếp thị chỉ được gửi trong khung giờ vàng từ **08:00 đến 21:00**. Các thông báo phát sinh ngoài khung giờ này sẽ được chuyển vào hàng đợi để gửi lúc 08:00 sáng hôm sau.
5. **Chặn thông báo trùng lặp & trễ hẹn (US 14-5 / AC5.3):**
   - Chặn gửi 2 thông báo cùng nội dung đến cùng một khách hàng trong vòng 5 phút.
   - Hủy bỏ các thông báo nhắc nhở lịch hẹn nếu thời gian gửi thực tế diễn ra sau thời gian hẹn.
