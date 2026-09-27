# BỘ QUY CHUẨN THIẾT KẾ TOÀN DIỆN - PAWPAL ADMIN (PAWPAL-ER)
> File lưu trữ tiêu chuẩn chính thức của dự án Quản trị Pawpal. Cập nhật ngày 27/09/2026.

---

## 1. HÌNH KHỐI, BỀ MẶT VÀ BỐ CỤC (LAYOUT & SURFACES)
1. **Bo góc**: Cố định `9px` (`--admin-radius: 9px;`).
2. **Màu sắc**: 100% màu phẳng Solid, tuyệt đối không dùng gradient.
3. **Hiệu ứng**: Tĩnh hoàn toàn, không hiệu ứng nhảy giật hover, không zoom `transform`.
4. **Độ đậm viền**: Viền khung, thẻ, bảng, ô nhập liệu dùng màu siêu mảnh nhẹ: `--border-neutral: #ECF2EE;`.
5. **Gom khối thống nhất**: Bộ lọc Toolbar và Bảng danh sách hợp nhất vào chung 1 khối `.customer-master-card`, không xé lẻ thành các hộp rời rạc.
6. **Không lồng nền & Không lồng khung (Cấm Hộp lồng Hộp)**: Trong màn hình chi tiết Drawer, bỏ tất cả màu nền xám con `#F8FAF9` và bỏ hoàn toàn các viền đóng khung hộp của các khối con (`.detail-box`, `.pet-detail-card`). Toàn bộ thông tin được trình bày phẳng, thoáng đãng trực tiếp trên nền trắng chính.
7. **Đồng bộ chiều cao tiêu đề thẻ (`height: 56px;`)**: Header thẻ luôn có chiều cao cố định để khi xếp song song (như 2 bảng trên trang Pawpoint), hàng tiêu đề cột bên dưới luôn nằm trên cùng 1 đường thẳng tắp.
8. **Thanh phân trang tối giản (Nằm ngoài bảng & Không nền)**: Nằm hoàn toàn bên ngoài khối bảng dữ liệu (`.admin-card`), nền trong suốt (`transparent`), không đóng khung hộp, khoảng cách trên dưới tinh gọn vừa vặn (`padding: 2px 0; margin-top: -6px;`), căn chính giữa trang (`justify-content: center;`), không viền ngăn cách phía trên (`border-top: none;`), các nút trang để nền trong suốt không hộp hộp, bỏ dòng chữ "Hiển thị...", dùng phím `<` và `>` thay cho chữ "Trước"/"Sau". Tiêu chuẩn tối đa 10 dòng/trang.
9. **Đường kẻ ngang chỉ dài bằng chữ (Chữ ở đâu vạch kẻ ở đó)**: Không kẻ các đường viền dài 100% cắt ngang qua khoảng trống vô tận (như dưới thanh subtabs hoặc dưới tiêu đề). Vạch kẻ chỉ nằm gọn gàng bên dưới chữ của mục đang chọn (ví dụ: gạch chân active tab `border-bottom: 2px solid #236B48;`), không kéo dài lê thê qua khoảng trắng bên phải.

---

## 2. QUY TẮC ICON VÀ VĂN BẢN (STRICT TEXT-ONLY RULE)
1. **Sidebar bên trái**: Nơi DUY NHẤT được sử dụng icon nét mảnh Lucide (9 menu + 2 nút chân).
2. **Bên ngoài Sidebar (100% Text-Only)**:
   - Header Bar: Text thuần, không icon.
   - Nút bấm: Text thuần (`+ Thêm khách`, `Xuất file`, `Có khiếu nại`), không icon.
   - Cột tác vụ: Nút 3 chấm text `•••`.
   - Dropdown menu: Text thuần (`Xem hồ sơ 360°`, `Khóa tài khoản`), không icon.
   - Thao tác nhanh trong Drawer: Text-only pills (`Gọi điện`, `Zalo`, `Đặt lịch`, `Lên đơn`).

---

## 3. THANH ĐIỀU HƯỚNG HEADER BAR & SUBTABS
1. **Định dạng Subtab**: Dạng text thuần `Khách hàng | Hồ sơ | Pawpoint` ngăn cách bằng dấu `|`. Không đóng khung hộp, không icon.
2. **Trạng thái Active**: In đậm `font-weight: 700;` với màu xanh thương hiệu `#236B48`. Inactive dùng màu xanh xô thơm nhẹ `#4F7A65`.
3. **Độ dài tên**: Tối ưu ngắn gọn, súc tích (ví dụ: `Pawpoint` thay vì tên dài).
4. **Tiêu đề phân hệ**: Ẩn khi có subtabs để tránh lặp từ.
5. **Breadcrumb**: Khi xem chi tiết đối tượng, tự động nối thêm `/ Chi tiết (Tên đối tượng)`.

---

## 4. BẢNG MÀU VÀ TYPOGRAPHY (FOREST PALETTE)
1. **Màu xanh thương hiệu rõ rệt**:
   - Tiêu đề khối, tiêu đề thẻ, tên đối tượng, tiêu đề modal: `--text-heading: #236B48;`.
   - Tiêu đề cột bảng dữ liệu (`th`), nhãn bộ lọc: `--table-header-text: #236B48;`.
   - Tên liên kết mở hồ sơ: `#236B48; font-weight: 600;`.
2. **Tiêu đề cột bảng**:
   - **Tuyệt đối không in hoa toàn bộ chữ** (bỏ `text-transform: uppercase`).
   - Viết hoa chữ cái đầu: `Mã KH`, `Họ tên`, `Số điện thoại`, `Hạng & Điểm`, `Cảnh báo`, `Trạng thái`.
   - Nền tiêu đề bảng: `--table-header-bg: #EEF5F1;`.
3. **Chữ chính & Chữ phụ**:
   - Chữ chính: `--text-main: #203A2C;`.
   - Chữ phụ: `--text-muted: #4F7A65;`.

---

## 5. QUY TẮC CẢNH BÁO (ALERTS) & TRẠNG THÁI (STATUSES)
1. **Viền cạnh mép trái (`border-left`)**:
   - **Áp dụng cho dòng dữ liệu bảng cần Alert**: Vạch đỏ 3px (`border-left: 3px solid #DC2626;`) cho khiếu nại, vạch cam 3px (`#D97706;`) cho lưu ý. Dòng bình thường dùng `border-left: 3px solid transparent;` để căn lề thẳng hàng.
   - **Đồng bộ hàng tiêu đề cột (`th:first-child`)**: Luôn luôn có `border-left: 3px solid var(--table-header-bg);` để ăn khớp thẳng tắp với các dòng dữ liệu bên dưới, không bao giờ để hở vệt trắng bên trái.
   - **Dòng cảnh báo thuần chữ đỏ (Không nền & Không viền khung)**: Banner cảnh báo khẩn cấp trình bày dạng dòng chữ màu đỏ thuần (`color: #DC2626; background: transparent; border: none;`), không vẽ khung viền hộp và không bôi màu nền để triệt tiêu hoàn toàn cảm giác "hộp viền bao quanh".
2. **Dòng tài khoản bị khóa (`.row-locked`)**:
   - **Làm mờ rõ rệt toàn bộ dòng**: `opacity: 0.52;` giúp người quản trị nhận diện ngay tài khoản vô hiệu hóa.
3. **Huy hiệu trạng thái (`.admin-badge`)**:
   - Viền của huy hiệu phải rất mờ và tiệp màu với nền (ví dụ: viền xanh lá `#D1F9DF`, viền đỏ `#FED8D8`, viền vàng `#FDEEB0`), tránh tạo khung viền đen/đậm cứng nhắc.
4. **Số đếm cảnh báo trên Tab con (`.tab-badge-count`)**:
   - Khi có đơn hàng, lịch hẹn hoặc khiếu nại đang chờ xử lý, hiển thị con số màu đỏ đặt ở **góc trên bên phải** của tên tab (dạng pill mini `color: #DC2626; background: #FEE2E2; border-radius: 9px; position: absolute; top: -7px; right: -9px;`) để người quản trị nhận diện ngay tức thì.
