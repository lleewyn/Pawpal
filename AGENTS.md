# QUY TẮC THIẾT KẾ VÀ PHÁT TRIỂN HỆ THỐNG ADMIN PAWPAL (PAWPAL-ER)
> Tài liệu này tổng hợp toàn bộ các quy chuẩn bất biến được yêu cầu và phê duyệt bởi người dùng cho hệ thống Quản trị Pawpal-er. Mọi phân hệ hiện tại và phát triển mới (Dashboard, Khách hàng, Thú cưng, Dịch vụ, Bán hàng, Nhân sự...) BẮT BUỘC tuân thủ nghiêm ngặt 100%.

---

## 1. QUY TẮC HÌNH KHỐI & BỀ MẶT (LAYOUT & SURFACES)

* **Bo góc cố định 9px**:
  - Toàn bộ các phần tử: Khung thẻ (`.admin-card`), ô nhập liệu (`.admin-input`, `.admin-select`), nút bấm (`.admin-btn`), modal, popover dropdown... đều dùng `--admin-radius: 9px;`.
* **100% Màu phẳng Solid**:
  - Tuyệt đối không dùng gradient ở bất kỳ vị trí nào trong Admin.
* **Tĩnh hoàn toàn - Triệt tiêu Hover rung giật**:
  - Không hiệu ứng transform phóng to/thu nhỏ, không nhảy giật (`transform: none !important;`).
* **Độ đậm viền tối giản (Ultra-Subtle Borders)**:
  - Viền phân cách các khung thẻ, bảng, input dùng màu siêu mảnh nhẹ: `--border-neutral: #ECF2EE;`.
  - Không dùng viền đậm làm người dùng có cảm giác "bị đóng khung hộp".
* **Gom khối thống nhất (Không xé lẻ hộp)**:
  - Thanh tìm kiếm, công cụ và bộ lọc được tích hợp trực tiếp làm phần đầu của Khối Bảng dữ liệu (`.customer-master-card`), không tách rời thành từng hộp card riêng rẽ.
  - Trên màn hình chỉ phân bố các khối chức năng lớn, rõ ràng.
* **Cấm "Hộp lồng trong Hộp" & Nền chồng Nền**:
  - Bên trong các khối chi tiết (như Drawer Hồ sơ): Tuyệt đối không bôi thêm màu nền xám (`#F8FAF9`) và **không bọc thêm viền đóng khung** (`border: none;`) cho các khối con (`.detail-box`, `.pet-detail-card`). Toàn bộ thông tin trình bày thoáng đãng trực tiếp trên nền trắng chính để triệt tiêu hoàn toàn cảm giác "nhiều khung / hộp lồng trong hộp".
* **Đường Kẻ Ngang Chỉ Dài Bằng Chữ (Underline & Dividers Theo Nội Dung)**:
  - Tuyệt đối không kẻ các đường viền xám dài 100% cắt ngang qua khoảng trống vô tận (như dưới thanh tabs hay dưới tiêu đề cột).
  - "Chữ trên ở đâu thì đường kẻ ngang bấy nhiêu ở đó": Đường kẻ (như vạch active của tab) chỉ nằm gọn gàng ngay dưới chữ của tab đó (`border-bottom: 2px solid #236B48;`), không kéo dài tràn lan sang vùng trống bên phải. Tiêu đề không kẻ đường phân cách giả nếu không có nội dung đối xứng.
* **Thanh Phân Trang Căn Giữa & Không Đóng Khung (Nằm Ngoài Bảng & Không Nền)**:
  - Phân trang nằm **hoàn toàn bên ngoài khối bảng dữ liệu** (`.admin-card`), nền hoàn toàn trong suốt (`background-color: transparent; border: none;`).
  - Khoảng cách trên dưới gọn gàng, vừa vặn (`padding: 2px 0; margin-top: -6px;`), không để khoảng trống lớn lơ lửng.
  - Căn chính giữa (`justify-content: center;`), không đóng khung, không kẻ đường viền phân cách phía trên (`border-top: none;`).
  - Các nút số trang và nút điều hướng `< >` để nền trong suốt, không đóng khung hộp, hover đổi màu nhẹ, chỉ nút active có nền màu xanh thương hiệu (`#236B48`).
  - Bỏ dòng chữ thống kê ("Hiển thị ... trên tổng số ...").
  - Phím chuyển trang dùng ký tự `<` và `>` thay vì chữ "Trước"/"Sau".
  - Tiêu chuẩn hiển thị tối đa 10 dòng dữ liệu trên 1 trang.
* **Khóa Cố Định Màn Hình & Triệt Tiêu Cuộn Nảy (Viewport Lock & Anti-Overscroll)**:
  - `html, body.admin-body`: BẮT BUỘC áp dụng `height: 100%; width: 100%; overflow: hidden; overscroll-behavior: none; overscroll-behavior-y: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0;` để khóa cứng toàn bộ khung màn hình ngoài, triệt tiêu 100% hiện tượng lướt quá tay bị hở mép trên/dưới (Rubber-band scroll bounce).
  - Khung nội dung cuộn bên trong (`.admin-preview-content`, Drawer, Modal card): Áp dụng `overscroll-behavior: contain;` để khi cuộn chạm đỉnh/đáy sẽ dừng dứt khoát tại chỗ, không bao giờ truyền sự kiện cuộn làm nảy hay rung giật khung layout chính.
* **Bố Cục Modal & Sổ Địa Chỉ Nhận Hàng (Address Book)**:
  - **Khoảng cách thoáng & Không kẻ ngang**: Modal có độ rộng thoáng chuẩn `width: 560px; max-width: 94vw;`, padding `26px 30px;`, các nhóm trường cách đều `gap: 16px;`. Tuyệt đối không kẻ đường viền xám 100% cắt ngang chia vụn vặt ở Header và Footer của Modal (`border-bottom: none; border-top: none;`).
  - **Đa địa chỉ & 1 địa chỉ mặc định**: Hỗ trợ 1 khách hàng có thể lưu nhiều địa chỉ nhận hàng, có radio chọn đúng 1 "Địa chỉ mặc định" (thẻ mặc định có viền xanh `#C3DEC7`, nền `#F4FAF6`), các địa chỉ khác là địa chỉ phụ (có nút text `Xóa`). Nút `+ Thêm địa chỉ` text-only màu xanh thương hiệu `#236B48`.

---

## 2. QUY TẮC ICON BẤM & TEXT-ONLY

* **Chỉ Sidebar bên trái được dùng Lucide Icons**:
  - 9 menu chức năng và 2 nút chân sidebar là nơi duy nhất được hiển thị icon nét mảnh Lucide.
* **Tất cả các khu vực khác bên ngoài Sidebar là 100% Text-Only**:
  - **Header Bar**: Thuần chữ, không icon.
  - **Toolbar & Bộ lọc**: Nút bấm dùng text thuần (ví dụ: `+ Thêm khách`, `Xuất file`, `Có khiếu nại`), không gắn icon.
  - **Bảng dữ liệu**: Cột tác vụ dùng nút 3 chấm text `•••`.
  - **Menu tác vụ thả xuống (Dropdown)**: Các mục hành động là Text thuần (`Xem hồ sơ 360°`, `Khóa tài khoản`), không icon.
  - **Drawer & Nút thao tác một chạm**: Dùng các nút text pill (`Gọi điện`, `Zalo`, `Đặt lịch`, `Lên đơn`), không icon.

---

## 3. QUY TẮC HEADER BAR, SUBTABS & STATE PERSISTENCE

* **Cấu trúc Subtab trên Header Bar**:
  - Hiển thị danh sách subtab dạng text thuần: `Khách hàng | Hồ sơ | Pawpoint`.
  - Phân tách bằng dấu gạch đứng `|` (`#AEC8B9`).
  - Không viền bao quanh hộp, không icon.
  - Tab đang chọn (Active): In đậm `font-weight: 700;` với màu xanh thương hiệu (`#236B48`).
  - Tab chưa chọn: Màu xanh xô thơm nhẹ (`#4F7A65`), không để xám chì.
* **Tên Subtab**:
  - Rút ngắn gọn gàng, súc tích, dễ nhìn (ví dụ: `Pawpoint` thay vì viết dài dòng).
* **Không lặp tiêu đề phân hệ**:
  - Khi phân hệ có subtabs, tiêu đề phân hệ bên trái được ẩn/tối giản để nhường chỗ cho subtabs, tránh lặp lại tên 2 lần.
* **Đường dẫn cấp con (Deep Breadcrumb)**:
  - Khi ở tab chi tiết/hồ sơ một thực thể (khách hàng, thú cưng, đơn hàng), Header Bar tự động nối thêm đường dẫn tinh gọn: `/ [Tên đối tượng]` (bỏ chữ "Chi tiết", bỏ ngoặc tròn).
  - Định dạng: Chữ nhỏ hơn (`font-size: 13px;`), màu xanh xô thơm mờ nhẹ (`--text-muted: #4F7A65;`), độ đậm vừa vặn `font-weight: 500;`. Dấu `/` dùng màu `--subtab-divider-color: #AEC8B9;`. Tự động ẩn đi khi quay về tab danh sách.
* **Lưu và khôi phục trạng thái Subtab khi Reload (State Persistence)**:
  - Hệ thống tự động đồng bộ subtab đang chọn vào URL Hash và `sessionStorage` để khi người dùng F5 / reload trang vẫn giữ nguyên vị trí làm việc (giữ nguyên subtab, hồ sơ đang mở và tab con bên trong).

---

## 4. BẢNG MÀU & TYPOGRAPHY (FOREST PALETTE)

* **Tone màu xanh thương hiệu rõ rệt (Không để tối ngả đen)**:
  - Tiêu đề khối, tiêu đề thẻ, tên hồ sơ, tiêu đề modal (`.admin-card-title`, `h4`, `.headline-name`): `--text-heading: #236B48;` (Forest Green đậm đà, sắc nét).
  - Tiêu đề cột bảng dữ liệu (`th`), nhãn bộ lọc: `--table-header-text: #236B48;`.
  - Tên liên kết bấm vào xem hồ sơ (`.user-name-link`): `#236B48; font-weight: 600;`.
* **Tiêu đề cột bảng (Table Headers)**:
  - **Tuyệt đối không in hoa toàn bộ chữ** (bỏ `text-transform: uppercase`).
  - Viết hoa chữ cái đầu tiêu chuẩn: `Mã KH`, `Họ tên`, `Số điện thoại`, `Hạng & Điểm`, `Cảnh báo`, `Trạng thái`.
  - Nền tiêu đề bảng: `--table-header-bg: #EEF5F1;` (xanh xô thơm rất nhạt).
* **Chữ chính & Chữ phụ**:
  - Chữ chính: `--text-main: #203A2C;` (xanh than sẫm, êm mắt).
  - Chữ phụ, email, chú thích: `--text-muted: #4F7A65;`.

---

## 5. QUY TẮC CẢNH BÁO (ALERTS) & TRẠNG THÁI (STATUSES)

* **Viền cạnh mép trái (`border-left`)**:
  - **Được dùng cho dòng dữ liệu bảng cần Alert**: Ô đầu tiên của dòng cảnh báo có vạch đỏ 3px (`border-left: 3px solid #DC2626;` cho khiếu nại) hoặc vạch cam 3px (`#D97706;` cho lưu ý). Các dòng bình thường dùng viền trong suốt `border-left: 3px solid transparent;` để căn hàng thẳng tắp.
  - **Đồng bộ hàng tiêu đề cột (`th:first-child`)**: Ô đầu tiên của hàng tiêu đề bảng BẮT BUỘC có `border-left: 3px solid var(--table-header-bg);` để ăn khớp thẳng tắp với các dòng dữ liệu bên dưới, triệt tiêu hoàn toàn khe hở màu trắng bên trái.
  - **Dòng cảnh báo thuần chữ đỏ (Không nền & Không viền khung)**: Cảnh báo khẩn cấp trình bày dạng dòng chữ màu đỏ thuần (`color: #DC2626; background: transparent; border: none;`), không vẽ khung viền hộp và không bôi màu nền để triệt tiêu hoàn toàn cảm giác "hộp viền bao quanh".
* **Tài khoản bị khóa (`.row-locked`)**:
  - **Làm mờ rõ rệt toàn bộ dòng**: Áp dụng `opacity: 0.52;` cho cả hàng dữ liệu để người quản trị phân biệt ngay lập tức tài khoản đã bị vô hiệu hóa so với các tài khoản đang hoạt động.
* **Huy hiệu trạng thái (`.admin-badge`)**:
  - Viền của huy hiệu phải rất mờ và tiệp màu với nền (ví dụ: viền xanh lá `#D1F9DF`, viền đỏ `#FED8D8`, viền vàng `#FDEEB0`), tránh tạo khung viền đen/đậm cứng nhắc.
* **Số đếm cảnh báo trên Tab con (`.tab-badge-count`)**:
  - Khi có đơn hàng, lịch hẹn hoặc khiếu nại đang chờ xử lý, hiển thị con số màu đỏ đặt ở **góc trên bên phải** của tên tab (dạng pill mini `color: #DC2626; background: #FEE2E2; border-radius: 9px; position: absolute; top: -7px; right: -9px;`) để người quản trị nhận diện ngay tức thì.
