# Wireframe: Đổi Trả Hàng (Sản Phẩm Vật Lý) — Quy Trình 3.1.12

> **Tuân thủ 100%:** [DESIGN.md](file:///d:/Aboutme/MyProject/Pawpal/Docs/DESIGN.md) + [plan_user_stories.md](file:///d:/Aboutme/MyProject/Pawpal/Docs/plan_user_stories.md)
> **KHÔNG SỬ DỤNG EMOJI** — chỉ sử dụng SVG monochrome hoặc ký tự text (• ▶ → ★)
> **HẠN CHẾ POPUP** — sử dụng Slide-out Panel (Drawer) từ cạnh phải cho biểu mẫu đổi trả để không gián đoạn trải nghiệm.
> **Cập nhật:** Tháng 6/2026

---

## 1. LUỒNG TỔNG QUAN (USER FLOW)

```
Đơn hàng của tôi (Trạng thái: Hoàn thành và thời gian nhận < 7 ngày)
  └─ Hiển thị nút [Yêu cầu Đổi trả] kèm nhãn đếm ngược "Còn N ngày"
       └─ Click nút → Mở Slide-out Panel (Drawer) trượt từ bên phải ra (chiếm 40% màn hình)
            ├─ Chọn sản phẩm muốn đổi trả (Checkbox)
            ├─ Chọn hình thức (Radio Cards): [Đổi sản phẩm mới] hoặc [Hoàn tiền]
            ├─ Chọn lý do (Dropdown)
            ├─ Nhập mô tả chi tiết (Textarea)
            ├─ Tải ảnh/video minh chứng (Tệp < 5MB)
            └─ Click [Gửi yêu cầu]
                 └─ Thành công → Đóng Drawer
                               → Chuyển hướng đến Chi tiết Phiếu Đổi Trả (RMA Page)
                               → Hiện Toast thông báo thành công

Trang Chi tiết Phiếu Đổi Trả (RMA Detail)
  ├─ Timeline tiến độ: Gửi yêu cầu → Đang kiểm duyệt → Đã chấp nhận → Đang gửi hàng trả → Hoàn tất
  ├─ Thông tin sản phẩm yêu cầu đổi trả + Số tiền hoàn dự kiến / thông tin đổi mới
  └─ Khối hướng dẫn gửi hàng trả (chỉ hiện khi ở trạng thái "Đã chấp nhận")
       ├─ Địa chỉ kho nhận hàng trả của Pawpal
       └─ Nhãn quy định phí ship (Pawpal chịu 100% / Khách tự thanh toán tùy theo lý do)

Trang tra cứu Đổi trả cho Khách vãng lai (Không cần đăng nhập)
  └─ Form nhập: Mã đơn hàng + Số điện thoại mua hàng
       ├─ Kiểm tra không khớp → Render cảnh báo lỗi đỏ tại chỗ
       └─ Khớp → Render tóm tắt đơn hàng và kích hoạt nút Đổi trả / xem trạng thái RMA tại chỗ
```

---

## 2. WIREFRAME: NÚT ĐỔI TRẢ TRÊN DANH SÁCH ĐƠN HÀNG (orders.html)

```
┌─────────────────────────────────────────────────────────────┐
│  Đơn hàng của tôi                                           │
├─────────────────────────────────────────────────────────────┤
│  Mã đơn hàng: #ORD-98274 • Ngày mua: 10/06/2026             │
│  Trạng thái: Giao hàng thành công (Hoàn thành)              │
│  ─────────────────────────────────────────────────────────  │
│  ┌────┐  Xương gặm dinh dưỡng vị bò                 120.000đ│
│  │ 🖼 │  Số lượng: 1                                         │
│  └────┘                                                     │
│  ┌────┐  Sữa tắm lông mượt Sage Green 500ml         320.000đ│
│  │ 🖼 │  Số lượng: 1                                         │
│  └────┘                                                     │
│  ─────────────────────────────────────────────────────────  │
│  Tổng tiền thanh toán: 440.000đ                             │
│                                                             │
│  [Đánh giá sản phẩm]   [Yêu cầu Đổi trả]                    │
│                        └─ Còn 3 ngày để đổi trả             │
│                           (font-size: 0.75rem, nhạt)        │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. WIREFRAME: SLIDE-OUT PANEL FORM ĐỔI TRẢ (RMA Drawer)

```
┌──────────────────────────────────────────────┬──────────────┐
│                                              │[×] ĐÓNG PANEL│
│                                              ├──────────────┤
│                                              │ Yêu cầu      │
│                                              │ Đổi trả      │
│                                              ├──────────────┤
│                                              │ Chọn sản phẩm│
│                                              │ [x] Xương bò │
│                                              │ [ ] Sữa tắm  │
│                                              │              │
│                                              │ Chọn hình thức│
│                                              │ ┌──────────┐ │
│                                              │ │ Đổi sản  │ │
│                                              │ │ phẩm mới │ │
│                                              │ └──────────┘ │
│                                              │ ┌──────────┐ │
│                                              │ │ Hoàn tiền│ │
│                                              │ └──────────┘ │
│                                              │              │
│                                              │ Lý do đổi trả│
│                                              │ [Sản phẩm lỗi]│
│                                              │              │
│                                              │ Chi tiết     │
│                                              │ ┌──────────┐ │
│                                              │ │Bị rách bao │ │
│                                              │ │bì...     │ │
│                                              │ └──────────┘ │
│                                              │              │
│                                              │ Minh chứng*  │
│                                              │ ┌──────────┐ │
│                                              │ │ [Tải lên]│ │
│                                              │ │ ảnh/video│ │
│                                              │ └──────────┘ │
│                                              │ *Bắt buộc ảnh│
│                                              │              │
│                                              │ [Gửi yêu cầu]│
│           (NỀN TRANG CHÍNH BỊ LÀM MỜ)        │              │
│               backdrop-filter: blur          │ 40% Chiều    │
│                                              │ rộng màn hình│
└──────────────────────────────────────────────┴──────────────┘
```

---

## 4. WIREFRAME: TRANG THEO DÕI PHIẾU ĐỔI TRẢ (return-detail.html)

```
┌─────────────────────────────────────────────────────────────┐
│  ← Quay lại đơn hàng                                        │
│                                                             │
│  Chi tiết yêu cầu đổi trả #RMA-12948                        │
│  Ngày tạo: 12/06/2026 • Trạng thái: Đã chấp nhận            │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  TIẾN ĐỘ XỬ LÝ                                              │
│  (●) Gửi yêu cầu                                            │
│   │                                                         │
│  (●) Đang kiểm duyệt                                        │
│   │                                                         │
│  (●) Đã chấp nhận   ← Vị trí hiện tại                       │
│   │                                                         │
│  (○) Đang gửi hàng trả                                      │
│   │                                                         │
│  (○) Hoàn tất                                               │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ HƯỚNG DẪN GỬI HÀNG TRẢ                                │  │
│  │ Quý khách vui lòng đóng gói sản phẩm nguyên vẹn vào   │  │
│  │ hộp, ghi mã phiếu RMA-12948 bên ngoài vỏ hộp và gửi   │  │
│  │ về địa chỉ sau:                                       │  │
│  │                                                       │  │
│  │ Người nhận: Bộ phận Hậu mãi PawPal                    │  │
│  │ Số điện thoại: 0901 234 567                            │  │
│  │ Địa chỉ: 123 Đường số 4, Phường Thảo Điền, TP. Thủ Đức│  │
│  │                                                       │  │
│  │ • Chi phí vận chuyển: PawPal chịu 100% phí ship       │  │
│  │ (do lỗi hỏng từ phía cửa hàng).                       │  │
│  └───────────────────────────────────────────────────────┘  │
│  ← Nền xanh dương nhạt (color-info-light)                   │
│                                                             │
│  Sản phẩm yêu cầu đổi trả:                                  │
│  - x1 Xương gặm dinh dưỡng vị bò - 120.000đ                 │
│  Lý do: Sản phẩm bị rách bao bì, ẩm mốc.                    │
│                                                             │
│  [Nhắn tin qua Zalo hỗ trợ]      [Gọi Hotline]              │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. WIREFRAME: TRA CỨU ĐỔI TRẢ KHÁCH VÃNG LAI (return-guest.html)

```
┌─────────────────────────────────────────────────────────────┐
│  Tra cứu yêu cầu đổi trả cho khách vãng lai                 │
├─────────────────────────────────────────────────────────────┤
│  Vui lòng điền mã đơn hàng và số điện thoại mua hàng để     │
│  thực hiện hoặc kiểm tra yêu cầu đổi trả của bạn.           │
│                                                             │
│  Mã đơn hàng *                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Ví dụ: ORD-98274                                      │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  Số điện thoại mua hàng *                                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Nhập số điện thoại                                     │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  [Tìm kiếm đơn hàng]                                        │
│                                                             │
│  [!] Cảnh báo lỗi (Chỉ hiển thị khi thông tin sai lệch):    │
│  "Thông tin đơn hàng hoặc số điện thoại không chính xác.    │
│  Vui lòng kiểm tra lại."                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. SPACING + COLOR SPEC (Quy chuẩn thiết kế)

### Slide-out Panel (Drawer)
| Phần tử | Token CSS tương ứng | Giá trị thực tế |
| :--- | :--- | :--- |
| Chiều rộng Panel | `width` | `40%` màn hình (Desktop), `100%` (Mobile) |
| Màu nền Panel | `--color-bg-white` | `#ffffff` |
| Lớp phủ hậu cảnh | `background-color` | `rgba(42, 89, 68, 0.4)` kèm `backdrop-filter: blur(8px)` |
| Khoảng đệm (Padding) | `--space-md` | `24px` |
| Khoảng cách giữa các ô nhập | `--space-md` | `24px` |

### Thẻ lựa chọn hình thức (Radio Cards)
| Trạng thái | Màu sắc / Token | Chi tiết thiết kế |
| :--- | :--- | :--- |
| Chưa chọn (Rest State) | Nền trắng, viền `--color-border` | Bo góc `10px`, hover tỉ lệ phóng to nhẹ `1.02` |
| Được chọn (Selected State)| Viền `--color-accent` (Amber Gold) | Độ dày viền `2px solid`, nổi bóng đổ nhẹ `--shadow-card` |

### Tiến trình xử lý (Timeline Stepper)
| Phần tử | Token / Màu sắc | Ý nghĩa hiển thị |
| :--- | :--- | :--- |
| Mốc đã hoàn thành | `--color-success` | Màu xanh lá cây chỉ thị bước đã qua |
| Mốc hiện tại | `--color-primary` | Màu xanh Sage chỉ thị trạng thái hiện tại |
| Mốc chưa tới | `--color-border` | Màu xám nhạt chỉ thị bước trong tương lai |

### Trạng thái Đặc biệt: Cần Hỗ Trợ Trực Tiếp (Tranh chấp - US 12-6)
- **Màu nhãn trạng thái:** Màu vàng cam ấm áp (`--color-accent`).
- **Nội dung cảnh báo:** Nền màu nhạt (`--color-accent-light`), chữ viền cam đậm (`--color-accent-dark`).

---

## 7. ÁNH XẠ FILE TRONG HỆ THỐNG (FILE MAP)

| File mới / Cập nhật | Vai trò trong quy trình |
| :--- | :--- |
| `pages/user/orders.html` | Hiển thị nút "Yêu cầu Đổi trả" cùng bộ đếm ngược 7 ngày. |
| `pages/user/return-detail.html` | Trang theo dõi tiến độ RMA dành cho thành viên chính thức. |
| `pages/public/return-guest.html` | Trang tra cứu đơn hàng và đổi trả dành cho khách vãng lai. |
| `assets/css/shop/checkout.css` | Tái sử dụng hoặc Cập nhật các định dạng form. |
| `assets/css/user/return-detail.css` | CSS định dạng Timeline tiến trình xử lý, khung địa chỉ gửi trả. |
| `assets/js/user/return-handler.js` | Xử lý sự kiện kéo Drawer, kiểm tra validation hình ảnh minh chứng. |
