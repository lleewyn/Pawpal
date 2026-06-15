# Wireframe: Trang Chi Tiết Dịch Vụ — Quy Trình 3.1.4

> **Tuân thủ 100%:** [DESIGN.md](file:///d:/Aboutme/MyProject/Pawpal/Docs/DESIGN.md)
> **KHÔNG SỬ DỤNG EMOJI TRONG GIAO DIỆN** — thay thế bằng ký tự văn bản hoặc hình vẽ SVG tinh tế.
> **KHÔNG SỬ DỤNG KÝ TỰ &** — thay thế hoàn toàn bằng chữ "và".
> **KHÔNG CHIA ĐÔI BỐ CỤC 50/50** — sử dụng bố cục bất đối xứng hoặc lưới bento sang trọng.
> **CHỈ SỬ DỤNG TIẾNG VIỆT** — việt hóa toàn bộ thuật ngữ kỹ thuật.
> **Cập nhật:** Tháng 6/2026

---

## 1. LUỒNG TRẢI NGHIỆM NGƯỜI DÙNG

```
Danh sách Dịch vụ (pages/services/services.html)
  └─ Nhấp chuột vào một Dịch vụ bất kỳ (Ví dụ: SPA01)
       └─ Trang Chi tiết Dịch vụ (pages/services/service-detail.html?id=SPA01)
            ├─ Khối Thông tin chính (Khung bất đối xứng tỷ lệ 1.86 : 1)
            │    ├─ Trái (1.86fr): Bộ sưu tập hình ảnh trưng bày (Gallery) + Nút Lưu yêu thích/Chia sẻ
            │    └─ Phải (1fr): Thông tin định danh + Xếp hạng thực tế + Giá và Trạng thái
            ├─ Khối Đặt cấu hình và Bảng so sánh giá thành viên (Bento Grid)
            │    ├─ Trái: Trình chọn cấu hình (Loại thú cưng, Cân nặng, Cấp bậc nhân viên)
            │    └─ Phải: Bảng giá ưu đãi theo từng hạng thành viên (Bạc, Vàng, Kim Cương) để kích thích đăng ký hội viên
            ├─ Khối Lợi ích, Cam kết an toàn và Quy trình thực hiện (Checklist trục thời gian dọc)
            ├─ Khối Tiện ích và Cơ sở vật chất (Dạng lưới bento)
            ├─ Khối Các câu hỏi thường gặp nhanh (FAQ cho riêng dịch vụ)
            ├─ Khối Đánh giá thực tế từ Khách hàng (Đồng bộ cấu trúc trang mua sắm)
            │    ├─ Bảng tổng hợp điểm trung bình và biểu đồ phân bổ sao (5 sao -> 1 sao)
            │    ├─ Bộ lọc thẻ lọc nhanh (Tất cả, 5 sao, 4 sao..., Có ảnh/video)
            │    └─ Danh sách bài viết đánh giá có kèm hình ảnh thực tế và nút xác nhận hữu ích
            └─ Thanh Đặt lịch cố định chân trang (Sticky Bar): Hiển thị tổng tiền tạm tính và nút Đặt lịch
```

---

## 2. GIAO DIỆN BẢN PHÁC THẢO (service-detail.html)

```
┌───────────────────────────────────────────────────────────────────────────┐
│ [Đầu trang: Logo | Dịch vụ | Cửa hàng ...      Tra đơn hàng | Đăng nhập ] │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ◀ QUAY LẠI DANH SÁCH DỊCH VỤ                                             │
│                                                                           │
│  1. KHỐI THÔNG TIN CHÍNH (Lưới bất đối xứng tỷ lệ 1.86 : 1)               │
│  ┌───────────────────────────────────────────────┬───────────────────────┐  │
│  │                                               │ [SPA01]               │  │
│  │  [ BỘ SƯU TẬP HÌNH ẢNH TRƯNG BÀY (GALLERY) ]  │ GÓI TẮM VỆ SINH CƠ BẢN│  │
│  │  ┌─────────────────────────────────────────┐  │                       │  │
│  │  │                                         │  │ Đánh giá: 4.8 / 5     │  │
│  │  │              [ ẢNH LỚN ]                │  │ (154 lượt đánh giá)   │  │
│  │  │                                         │  │                       │  │
│  │  └─────────────────────────────────────────┘  │ Thời gian: 60 phút    │  │
│  │  [Ảnh nhỏ 1] [Ảnh nhỏ 2] [Ảnh nhỏ 3]          │                       │  │
│  │                                               │ Trạng thái:           │  │
│  │  [ Nút lưu yêu thích ]  [ Nút chia sẻ nhanh ] │ Đang phục vụ          │  │
│  └───────────────────────────────────────────────┴───────────────────────┘  │
│                                                                           │
│  2. KHỐI ĐẶT CẤU HÌNH VÀ ƯU ĐÃI THÀNH VIÊN (Lưới Bento)                   │
│  ┌───────────────────────────────────────────────┬───────────────────────┐  │
│  │ CHỌN CẤU HÌNH THÚ CƯNG CỦA CHỒNG              │ GIÁ ƯU ĐÃI THÀNH VIÊN │  │
│  │                                               │                       │  │
│  │ Loại thú cưng:                                │ Giá niêm yết:         │  │
│  │ ( ) Chó    ( ) Mèo                            │ 120.000 VNĐ           │  │
│  │                                               │                       │  │
│  │ Hạng cân của bé:                              │ Hạng hội viên của cưng│  │
│  │ ( ) Dưới 5kg   ( ) 5kg - 10kg   ( ) Trên 10kg │ - Bạc: 114.000 VNĐ    │  │
│  │                                               │ - Vàng: 108.000 VNĐ   │  │
│  │ Cấp độ nhân viên thực hiện:                   │ - Kim Cương: 102.000  │  │
│  │ ( ) Sơ cấp (Mặc định)                         │                       │  │
│  │ ( ) Trung cấp (Phụ thu 50.000 VNĐ)            │ [ Đăng ký hội viên ]  │  │
│  └───────────────────────────────────────────────┴───────────────────────┘  │
│                                                                           │
│  3. LỢI ÍCH, CAM KẾT VÀ QUY TRÌNH (Trục Thời Gian Dọc)                    │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ Lợi ích chính mang lại:                                             │  │
│  │ - Làm sạch bụi bẩn, khử mùi hôi hiệu quả lên đến 7 ngày             │  │
│  │ - Cắt móng và mài mịn giúp bảo vệ chân bé                           │  │
│  │                                                                     │  │
│  │ Cam kết an toàn của PawPal:                                         │  │
│  │ - Hoàn tiền 100% nếu phát hiện nhân viên bạo hành hoặc dùng an thần │  │
│  │ - Bảo hiểm sức khỏe thú cưng trọn gói trong suốt quá trình chăm sóc │  │
│  │                                                                     │  │
│  │ Quy trình thực hiện (Danh sách 9 bước chuẩn y khoa):                │  │
│  │ [o] Bước 1: Tiếp nhận bé và kiểm tra tình trạng da lông sơ bộ        │  │
│  │ [o] Bước 2: Cắt móng và mài mịn góc sắc                             │  │
│  │ [o] Bước 3: Vệ sinh tai bằng dung dịch chuyên dụng                  │  │
│  │ [o] Bước 4: Chải lông loại bỏ lông rụng                             │  │
│  │ [o] Bước 5: Tắm lần 1 bằng sữa tắm loại bỏ bụi bẩn                  │  │
│  │ [o] Bước 6: Tắm lần 2 bằng dầu dưỡng cao cấp                        │  │
│  │ [o] Bước 7: Sấy khô và chải tạo kiểu dáng                           │  │
│  │ [o] Bước 8: Vắt tuyến hôi và xịt nước hoa thảo mộc                  │  │
│  │ [o] Bước 9: Bàn giao bé và gửi Nhật ký chăm sóc chi tiết            │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  4. TIỆN ÍCH VÀ CƠ SỞ VẬT CHẤT                                            │
│  ┌─────────────────────────┬─────────────────────────┬─────────────────┐  │
│  │ Phòng tắm điều hòa      │ Máy sấy giảm ồn         │ Sữa tắm dịu nhẹ │  │
│  │ Nhiệt độ luôn duy trì   │ Luồng gió êm ái tránh   │ Chiết xuất thảo │  │
│  │ ấm áp ở mức 26 độ C     │ bé bị giật mình hoảng sợ│ dược tự nhiên   │  │
│  └─────────────────────────┴─────────────────────────┴─────────────────┘  │
│                                                                           │
│  5. CÂU HỎI THƯỜNG GẶP NHANH VỀ DỊCH VỤ                                   │
│  [+] Bé đang bị nấm da có dùng gói này được không?                        │
│  [+] Quy trình sấy khô có làm cún bị bỏng hay hoảng sợ không?             │
│                                                                           │
│  6. ĐÁNH GIÁ THỰC TẾ (Đồng bộ cấu trúc trang mua sắm)                     │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │ BẢNG TỔNG HỢP ĐIỂM SỐ                                               │  │
│  │ Điểm trung bình: 4.8 / 5    [ Phân bổ sao ]                         │  │
│  │ (154 lượt đánh giá)          - 5 sao: [==================] 92%      │  │
│  │                              - 4 sao: [==] 6%                       │  │
│  │                              - 3 sao: [.] 2%                        │  │
│  │                                                                     │  │
│  │ BỘ LỌC ĐÁNH GIÁ NHANH (Thẻ chọn)                                    │  │
│  │ [ Tất cả (154) ] [ 5 Sao (142) ] [ 4 Sao (9) ] [ Có ảnh/video (45) ]  │  │
│  │ ─────────────────────────────────────────────────────────────────── │  │
│  │ DANH SÁCH ĐÁNH GIÁ                                                  │  │
│  │ - Khách hàng N***A • Hạng Vàng • Ngày 10/06/2026                     │  │
│  │   Đánh giá: 5.0 / 5 điểm                                            │  │
│  │   "Nhân viên cẩn thận tắm cho bé rất kỹ, lông thơm và mềm mượt."    │  │
│  │   [Ảnh đính kèm 1] [Ảnh đính kèm 2]                                 │  │
│  │   (Bạn thấy đánh giá này hữu ích? [Hữu ích (12)])                   │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
├───────────────────────────────────────────────────────────────────────────┤
│                               CHÂN TRANG                                  │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 3. CHI TIẾT CÁC THÀNH PHẦN GIAO DIỆN VÀ TRẠNG THÁI

### A. Bộ sưu tập hình ảnh trưng bày (Gallery)
- **Hành vi tương tác:**
  - Nhấp vào các ảnh nhỏ (thumbnail) bên dưới để đổi ảnh hiển thị chính lớn ở trên một cách mượt mà bằng hiệu ứng mờ dần (GSAP fade).
  - Hỗ trợ vuốt chạm (swipe) trên thiết bị di động.

### B. Bộ chọn cấu hình động và Bảng so sánh giá thành viên
- **Hành vi tương tác:**
  - Khi người dùng thay đổi lựa chọn (ví dụ: đổi từ thú cưng nhỏ sang lớn hoặc nâng cấp bậc nhân viên từ Sơ cấp lên Trung cấp), giá thành niêm yết và các mức giá thành viên (Bạc: -5%, Vàng: -10%, Kim Cương: -15%) sẽ thay đổi lập tức bằng hiệu ứng chuyển số mượt mà (chạy chữ số tăng giảm tăng tính trực quan) mà không cần tải lại trang.
  - Phụ thu giá dựa trên:
    - Cân nặng (theo quy định phụ thu của từng nhóm dịch vụ).
    - Cấp độ nhân viên thực hiện (Sơ cấp: Mặc định; Trung cấp: +50.000 VNĐ; Chuyên gia: +100.000 VNĐ).
  - Bảng giá thành viên hiển thị rõ số tiền tiết kiệm được để khuyến khích người dùng đăng ký tài khoản hội viên.

### C. Nút Lưu yêu thích và Chia sẻ nhanh
- **Hành vi tương tác:**
  - **Lưu yêu thích**: Nút bấm hình trái tim viền mỏng. Khi nhấp chọn, trái tim sẽ chuyển thành màu đỏ đậm (hoặc màu thương hiệu Sage Green) và lưu dịch vụ đó vào danh sách yêu thích (`pawpal_wishlist_services`) trong bộ nhớ máy (`localStorage`). Bắn thông báo nhẹ (Toast) thông báo: "Đã lưu vào danh sách yêu thích của chồng iu!".
  - **Chia sẻ**: Nhấp chọn mở ra một menu nhỏ (Zalo, Facebook, sao chép liên kết). Khi chọn sao chép liên kết, hiển thị thông báo "Đã sao chép liên kết dịch vụ!".

### D. Trục thời gian tiến trình thực hiện
- **Hành vi tương tác:**
  - Sử dụng thanh chỉ dẫn dọc kết nối các điểm mốc.
  - Khi người dùng cuộn màn hình qua khối này, các bước quy trình sẽ tự động sáng lên từ xám sang xanh lá nhạt (Sage Green) và hiển thị dấu tích hoàn thành lần lượt bằng hiệu ứng hoạt họa cuộn trang (GSAP ScrollTrigger).

### E. Hộp Câu hỏi thường gặp nhanh (FAQ)
- **Hành vi tương tác:**
  - Nhấp vào từng câu hỏi để mở rộng câu trả lời chi tiết riêng cho gói dịch vụ đó, hoạt động độc lập bằng hiệu ứng trượt tự nhiên.

### F. Khối Đánh giá dịch vụ chi tiết (Đồng bộ trang mua sắm)
- **Hành vi tương tác:**
  - **Bảng tổng hợp điểm**: Hiển thị điểm số trung bình thực tế lấy trực tiếp từ cột Đánh giá trong file dữ liệu.
  - **Thẻ lọc nhanh**: Khi người dùng nhấn chọn một thẻ lọc (ví dụ: `5 Sao` hoặc `Có ảnh/video`), danh sách bài đánh giá bên dưới sẽ ngay lập tức được lọc và sắp xếp bằng hiệu ứng mượt mà (GSAP fade) mà không tải lại trang.
  - **Xem ảnh phóng to (Lightbox)**: Nhấp vào ảnh thực tế đính kèm của khách hàng để mở màn hình xem phóng to ảnh (Lightbox) có hiệu ứng mờ nền tối giản.
  - **Xác nhận hữu ích**: Người dùng nhấp chọn nút "Hữu ích", số đếm sẽ tăng lên kèm hiệu ứng chuyển màu nút nhằm tăng độ tương tác và tính xác thực cho dịch vụ.

---

## 4. QUY TẮC LẬP TRÌNH
- **Vị trí tệp tin:**
  - Giao diện HTML: `pages/services/service-detail.html`
  - Định dạng CSS: `assets/css/services/service-detail.css`
  - Logic Javascript: `assets/js/services/service-detail.js`
- **Hiệu ứng chuyển trang:** Sử dụng API chuyển tiếp góc nhìn (View Transition API) để tạo chuyển động thu phóng mượt mà từ danh sách dịch vụ chính sang trang chi tiết (qua tham chiếu tên chuyển tiếp `view-transition-name: service-card-SPA01`).
- **Liên hệ xưng hô:** Đảm bảo tất cả các câu phản hồi, văn bản gợi ý hoặc trạng thái rỗng đều gọi khách hàng là "chồng iu".
