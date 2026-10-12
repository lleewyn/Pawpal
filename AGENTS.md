# QUY TẮC THIẾT KẾ VÀ PHÁT TRIỂN HỆ THỐNG ADMIN PAWPAL (PAWPAL-ER)
> Tài liệu này tổng hợp toàn bộ các quy chuẩn bất biến được yêu cầu và phê duyệt bởi người dùng cho hệ thống Quản trị Pawpal-er. Mọi phân hệ hiện tại và phát triển mới (Dashboard, Khách hàng, Thú cưng, Dịch vụ, Bán hàng, Nhân sự...) BẮT BUỘC tuân thủ nghiêm ngặt 100%.

---

## 1. QUY TẮC HÌNH KHỐI & BỀ MẶT (LAYOUT & SURFACES)

* **Bo góc cố định 9px**:
  - Toàn bộ các phần tử: Khung thẻ (`.admin-card`), ô nhập liệu (`.admin-input`, `.admin-select`), nút bấm (`.admin-btn`), modal, popover dropdown... đều dùng `--admin-radius: 9px;`.
* **100% Màu phẳng Solid & Nền bán trong suốt Frosted Glass (Translucent Surface)**:
  - Tuyệt đối không dùng gradient ở bất kỳ vị trí nào trong Admin.
  - Các khối thẻ chính (`.admin-card`, `.customer-master-card`, `.kpi-card`), Drawer hồ sơ (`.profile-drawer-container`) và Header (`.admin-header`) sử dụng màu trắng bán trong suốt `--surface-white: rgba(255, 255, 255, 0.70);` kết hợp `backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);` tạo vẻ đẹp thanh thoát, cao cấp và dịu mắt.
  - **Triệt tiêu hoàn toàn lớp nền lồng nhau (Anti-Opacity Stacking)**: Các thành phần bên trong bảng dữ liệu (`.table-responsive-wrapper`, `.admin-table`, `tbody`, `tr`, `td`) BẮT BUỘC để `background-color: transparent;` để tránh hiện tượng xếp lớp opacity làm đục màu bảng.
  - Nền tiêu đề bảng dùng `--table-header-bg: rgba(238, 245, 241, 0.75);`.
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
* **Avatar Cá Nhân Trong Bảng & Hồ Sơ Luôn Là Hình Tròn (`border-radius: 50%`)**:
  - Toàn bộ avatar hiển thị hình đại diện hoặc chữ cái viết tắt của Kỹ thuật viên, Nhân viên, Khách hàng, Quản trị viên trong bảng dữ liệu hoặc drawer (`.staff-avatar-initials`, `.customer-avatar`, `.user-avatar`...) BẮT BUỘC có `border-radius: 50%;` hình tròn hoàn hảo, tạo sự phân biệt trực quan sinh động so với hình khối bo góc 9px của khung thẻ và nút bấm.
* **Bố Cục Modal & Tiêu Chuẩn Kích Thước (Modal Layout & Width Standards)**:
  - **Khoảng cách thoáng & Không kẻ ngang**: Modal có padding `26px 30px;`, các nhóm trường cách đều `gap: 16px;`. Tuyệt đối không kẻ đường viền xám 100% cắt ngang chia vụn vặt ở Header và Footer của Modal (`border-bottom: none; border-top: none;`).
  - **Tiêu chuẩn chiều rộng Modal (Width Standards)**:
    * *Modal xác nhận / Hộp thoại ngắn*: `width: 480px - 540px; max-width: 92vw;`
    * *Modal Form nhỏ / Thêm nhanh thực thể (Thêm nhanh chủ nuôi, Cân nặng, Hẹn giờ)*: `width: 500px - 540px; max-width: 92vw;`
    * *Modal Form chuẩn (Thêm khách, Sổ địa chỉ, Thêm dịch vụ)*: `width: 560px - 600px; max-width: 94vw;`
    * *Modal Danh sách / Thêm bé cưng 2 cột / Đánh giá sản phẩm / Lịch sử / Bộ lọc nhiều chip*: `width: 720px - 760px; max-width: 95vw;` để đảm bảo các trường 2 cột dàn hàng ngang thoáng đãng, thanh tóm tắt chỉ số và các nút lọc không bị rớt dòng chật chội.
    * *Modal Bảng ma trận / Soạn thảo / Hồ sơ mở rộng*: `width: 880px - 1000px; max-width: 96vw;`
  - **Đa địa chỉ & 1 địa chỉ mặc định**: Hỗ trợ 1 khách hàng có thể lưu nhiều địa chỉ nhận hàng, có radio chọn đúng 1 "Địa chỉ mặc định" (thẻ mặc định có viền xanh `#C3DEC7`, nền `#F4FAF6`), các địa chỉ khác là địa chỉ phụ (có nút text `Xóa`). Nút `Thêm địa chỉ` text-only màu xanh thương hiệu `#236B48`.
  - **Chuẩn Hóa Bộ Ba Nút Thao Tác Trong Modal (Đóng, Hủy, Lưu - Modal Action Standards)**:
    * *Nút Đóng và Hủy*: BẮT BUỘC sử dụng thuộc tính `data-close-modal="[modalId]"` và được điều khiển bởi bộ lắng nghe sự kiện toàn cục. Đảm bảo hỗ trợ đồng thời 4 hình thức đóng tức thì: bấm nút "Đóng" (`.btn-modal-close`), bấm nút "Hủy" (`.admin-btn-secondary`), click vào vùng nền tối backdrop bên ngoài modal-card, và nhấn phím `Escape`.
    * *Nút Lưu & Form Submit*: Nút "Lưu" BẮT BUỘC đặt `type="button"` (viết `Lưu bé cưng`, `Lưu chủ nuôi`, `Lưu thay đổi`... theo Sentence Case), tuyệt đối không để `type="submit"` không kiểm soát. Thẻ `<form>` BẮT BUỘC có `onsubmit="return false;"` và trong JS chặn `form.addEventListener('submit', (e) => e.preventDefault());` để triệt tiêu hoàn toàn hiện tượng reload trang web làm mất dữ liệu hoặc xung đột request bất đồng bộ (async API) với Supabase.
    * *Modal Con Tạo Nhanh Thực Thể (Sub-Modal Quick Creation)*: Khi tạo nhanh thực thể phụ (ví dụ: Thêm nhanh chủ nuôi từ modal Thêm bé cưng): Sau khi lưu thành công vào CSDL, hệ thống phải **tự động chọn ngay thực thể đó** cho form chính, reset form con và tự động đóng modal con, không bắt người dùng phải tìm kiếm lại từ đầu. Cột `email` của khách tạo nhanh tại quầy BẮT BUỘC để `null` (không dùng chuỗi rỗng `''` gây vi phạm UNIQUE constraint trong Supabase).
* **Chuẩn Hóa Ô Tìm Kiếm, Chọn Thực Thể & Gợi Ý Trong Modal (Custom Autocomplete Popover & Suggestion Chips)**:
  - **Cấm 100% sử dụng thẻ `<datalist>` mặc định của trình duyệt**: Tuyệt đối không dùng `<datalist>` vì gây popup thô kệch, không đồng bộ với hệ thống, không kiểm soát được vị trí và đè lấp che khuất các ô nhập liệu bên dưới.
  - **Bắt buộc dùng Custom Autocomplete Popover đồng bộ hệ thống (`.autocomplete-dropdown`, `.customer-autocomplete-popover`)**:
    * Khung bọc `.pet-field-autocomplete-wrapper`, `.customer-autocomplete-wrapper` có `position: relative; width: 100%;`.
    * Popover nằm ngay dưới ô nhập (`position: absolute; top: calc(100% + 4px); left: 0; right: 0;`), bo góc chuẩn 9px (`border-radius: var(--admin-radius);`), viền mảnh `--border-neutral: #ECF2EE;`, đổ bóng thanh thoát `box-shadow: 0 10px 28px rgba(35, 107, 72, 0.14);`, cuộn tối đa `max-height: 240px; overscroll-behavior: contain;`, `z-index: 2500;`.
    * **Tuyệt Đối Không Để Icon / Avatar Hình Tròn Trong Autocomplete Popover (100% Flat Text-Only)**: Trong các mục lựa chọn dropdown (chọn chủ nuôi, giống loài, màu lông...), triệt tiêu hoàn toàn các icon hay avatar tròn mang chữ cái viết tắt (`.autocomplete-avatar`). Trình bày 100% thuần chữ phẳng:
      - Bên trái: Tên thực thể in đậm rõ nét (`font-weight: 600; color: #203A2C;`), dòng thông tin phụ bên dưới (Số điện thoại, mã định danh, số bé cưng đang nuôi, hoặc phân loài) dùng chữ mỏng nhẹ (`color: #4F7A65; font-size: 11.5px;`).
      - Bên phải: Huy hiệu badge (`Hạng Bạc`, `Phổ biến`, `7 bé trong tiệm`...).
      - Hover / Active: Đổi màu nền xanh xô thơm nhẹ `#EEF5F1`, chuyển động mượt mà.
    * Khi bấm chọn: Điền dữ liệu chính xác, tự động đóng popover, và hiển thị thẻ tóm tắt xác nhận lựa chọn: Nền `#EEF5F1`, bo góc 9px, chữ Forest Green `#236B48`, có nút text `✕ Bỏ chọn`.
  - **Liên Kết Thực Thể & Tự Động Điền Thông Minh Trong Form/Modal (Smart Entity Auto-Fill Relations)**:
    * *Khi chọn Khách hàng*: BẮT BUỘC **tự động điền ngay Số điện thoại (SĐT)** của khách hàng vào ô SĐT tương ứng; tự động nạp danh sách thú cưng của khách đó vào ô Bé cưng (tự điền bé đầu tiên nếu có, điền tiền sử/dị ứng/cảnh báo an toàn vào ô Cảnh báo sức khỏe). Hiển thị thẻ tóm tắt xác nhận lựa chọn (`.adjust-customer-selected-card`, nền `#EEF5F1`, chữ Forest Green `#236B48`, có nút text `✕ Bỏ chọn`).
    * *Khi chọn Bé cưng trước*: Nếu ô khách hàng và SĐT đang trống, hệ thống phải tự động điền ngược lại tên Chủ nuôi và Số điện thoại của chủ nuôi vào các ô tương ứng.
  - **Chọn Gói Dịch Vụ Cụ Thể & Hiển Thị Trường Đặc Thù Có Điều Kiện (Searchable Service Autocomplete & Conditional Fields)**:
    * *Ô chọn Gói dịch vụ cụ thể*: BẮT BUỘC sử dụng Custom Autocomplete Popover (hoặc ô tìm kiếm có danh sách sổ xuống với Tên gói in đậm, Thời lượng/mô tả và Mức giá khởi điểm bên phải), tuyệt đối không để thẻ `select` trơ trọi một dòng rỗng hoặc không có dữ liệu khi mở modal.
    * *Hiển thị trường đặc thù có điều kiện (Conditional Dynamic Fields)*: Các khối trường mang tính đặc thù riêng biệt theo dịch vụ (ví dụ: *Yêu cầu tạo hình và Grooming* - kiểu dáng tạo hình, cấp độ KTV): Mặc định BẮT BUỘC **ẨN**, CHỈ ĐƯỢC PHÉP HIỂN THỊ khi người dùng chọn đúng dịch vụ có liên quan đến cắt tỉa / tạo kiểu (chứa các từ khóa *Grooming*, *Cắt tỉa*, *Tạo kiểu*, *Style*...). Tuyệt đối không để hiện tràn lan khi khách chỉ tắm vệ sinh cơ bản, gửi khách sạn Pet Hotel hay gọi Pet Taxi. Tương tự, thông tin Pet Hotel (ngày/giờ trả phòng, chuồng) và Pet Taxi (địa chỉ đón/trả, km) chỉ hiển thị đúng khi chọn nhóm dịch vụ tương ứng.
  - **Lọc Sạch Dữ Liệu Rác Trong Gợi Ý CSDL (Database Autocomplete Sanitization)**:
    * Dữ liệu gợi ý sổ xuống từ Supabase phải qua bộ lọc làm sạch: Loại bỏ các chuỗi rỗng, chuỗi chỉ chứa số (như `7`, ID kỹ thuật), hoặc các giá trị mặc định vô nghĩa (`Chưa rõ`, `Chưa cập nhật`, `unknown`, `null`, `undefined`).
  - **Triệt Tiêu Sự Dư Thừa Giữa Autocomplete Popover và Quick Chips**:
    * Khi một trường nhập liệu đã được trang bị Autocomplete Popover sổ xuống từ CSDL (như Giống loài, Chủ sở hữu...): **TUYỆT ĐỐI KHÔNG bố trí thêm hàng chip gợi ý (`.reason-quick-chip`) bên dưới**. Dropdown sổ xuống đã đáp ứng trọn vẹn việc tìm và chọn nhanh, hàng chip nằm dưới sẽ bị đè che khuất và gây dư thừa vị trí trên màn hình.
  - **Tự Do Nhập Liệu Cho Các Trường Cá Nhân Hóa (Custom Text Input For Personalized Fields)**:
    * Các trường mang tính đặc thù riêng biệt theo từng thực thể như "Cảnh báo an toàn", "Tiền sử dị ứng", "Ghi chú tập tính", "Lưu ý cá nhân"...: BẮT BUỘC để dạng ô nhập tự do (`<input type="text" class="admin-input">` hoặc `textarea`), không ép dùng dropdown popover hay áp đặt các nút chip gò bó, đảm bảo người quản trị tự do ghi chép chính xác tình trạng thực tế.
  - **Chip Gợi Ý Một Chạm (Recommendation / Quick Chips - `.reason-quick-chip`)**:
    * Chỉ sử dụng cho các ô nhập lý do biến động số dư, ghi chú điều chỉnh kho, phân loại xử lý khiếu nại (ví dụ: `Bù sự cố trễ hẹn`, `Tặng điểm tri ân`, `Thu hồi do hủy đơn`...).
    * Dạng nút phẳng không viền, nền `#EEF5F1`, hover `#DCEEE2`, bo góc 9px, chữ Forest Green `#236B48`, bấm một chạm là điền ngay nội dung mà không cần gõ bàn phím.
  - **Chống Tràn Cắt Chữ Ở Ô Chọn Dropdown (`select`)**:
    * Nhãn tùy chọn trong thẻ `select` phải viết tự nhiên, ngắn gọn và gãy gọn (ví dụ: `Cộng điểm`, `Trừ điểm`), tuyệt đối không đính kèm các câu giải thích dài trong ngoặc đơn làm tràn chiều ngang cột gây cắt chữ thành `Cộn...`.
* **Quy Chuẩn Nhãn Trường Dữ Liệu & Đánh Dấu Bắt Buộc (Clean Form Labels & Red Asterisk)**:
  - **Triệt tiêu dấu hai chấm `:` ở cuối nhãn trường**: Toàn bộ nhãn trường dữ liệu trong form, modal (`.form-label`, `.filter-label`) KHÔNG dùng dấu hai chấm `:` ở cuối để giao diện phẳng, thanh thoát và hiện đại (viết `Họ và tên chủ nuôi`, `Số điện thoại`, `Loài thú cưng`, `Ghi chú`... thay vì `Họ và tên chủ nuôi:`, `Số điện thoại:`).
  - **Trường bắt buộc giữ dấu sao `*` màu đỏ**: Đối với trường bắt buộc nhập (`required`), giữ dấu sao `*` màu đỏ (`color: #DC2626; font-weight: 700;` hoặc `<span style="color: #DC2626;">*</span>`) đặt ngay sát sau chữ, không có dấu hai chấm `:`.
  - *Ví dụ chuẩn*: `<label class="form-label">Họ và tên chủ nuôi <span style="color: #DC2626;">*</span></label>`, `<label class="form-label">Số điện thoại <span style="color: #DC2626;">*</span></label>`, `<label class="form-label">Địa chỉ liên hệ</label>`.
  - **TUYỆT ĐỐI KHÔNG bỏ dấu sao trong ngoặc đơn và không đính kèm dấu `:`**: Cấm viết kiểu `(*)`, `*:`, `(*):` hoặc `(bắt buộc)`. Trình bày dấu `*` đỏ thanh lịch, tinh gọn và chuẩn mực.

---

## 2. QUY TẮC ICON BẤM, TEXT-ONLY & VĂN PHONG (COPYWRITING)

* **Triệt Tiêu Dòng Phụ Chú Thích Dài Dòng (No Redundant Subtitles)**:
  - Đưa mốc thời gian / ngày tháng trực tiếp lên dòng Tiêu đề chính (ví dụ: `Lịch trực và Điều phối Kỹ thuật viên (25/06/2026)`).
  - Tuyệt đối không thêm dòng phụ chú thích mô tả chức năng rườm rà dưới tiêu đề modal/card làm vụn vặt giao diện.
* **Triệt tiêu ký hiệu `+` thừa trên các nút bấm thao tác (Clean Flat Text Buttons)**:
  - Nút bấm trình bày dạng text thuần túy, phẳng và thanh lịch, **tuyệt đối KHÔNG gắn tiền tố `+ `** (viết `Thêm khách`, `Tạo đơn tại quầy`, `Phân ca làm việc`, `Thêm sản phẩm`, `Ghi nhật ký`, `Tạo bài viết mới`, `Tạo khiếu nại`... thay vì viết `+ Thêm khách`, `+ Tạo đơn`...).
  - Ký hiệu toán học `+` chỉ được phép sử dụng duy nhất trong ngữ cảnh tính toán số liệu thực tế (ví dụ: `+15 phút gia hạn`, `+50 điểm Pawpoint`, `+100k phụ phí`).
* **Triệt tiêu từ Tiếng Anh và Chú thích trong ngoặc đơn không cần thiết (Pure Natural Vietnamese)**:
  - Toàn bộ giao diện sử dụng 100% Tiếng Việt chuẩn mực, tự nhiên, thanh thoát và gãy gọn.
  - Tuyệt đối không chèn thêm các từ tiếng Anh dịch kèm / chú giải rườm rà trong ngoặc đơn (ví dụ: cấm viết `Tóm tắt ngắn (Summary)`, `Từ khóa cốt lõi (Keywords và Entities)`, `Bảng kê (Manifest)`, `Thời gian hoàn tất (ETC)`, `Ngưỡng tồn kho (Min Stock)`, `Hoàn tiền (Refund)`, `Nhập lại kho (Restock)`...).
  - Chỉ giữ lại các thuật ngữ viết tắt kỹ thuật / mã nghiệp vụ chuẩn ngành bắt buộc: `COD`, `POS`, `RMA`, `SKU`, `SOP`, `SLA`, `KTV`, `VIP`, `Zalo`.
* **Chỉ Sidebar bên trái được dùng Lucide Icons**:
  - 9 menu chức năng và 2 nút chân sidebar là nơi duy nhất được hiển thị icon nét mảnh Lucide.
* **Tất cả các khu vực khác bên ngoài Sidebar là 100% Text-Only**:
  - **Header Bar**: Thuần chữ, không icon.
  - **Toolbar & Bộ lọc**: Nút bấm dùng text thuần (ví dụ: `Thêm khách`, `Xuất file`, `Có khiếu nại`), không gắn icon.
  - **Bảng dữ liệu**: Cột tác vụ dùng nút 3 chấm text `•••`.
  - **Menu tác vụ thả xuống (Dropdown)**: Các mục hành động là Text thuần (`Xem hồ sơ 360°`, `Khóa tài khoản`), không icon.
  - **Drawer & Nút thao tác một chạm**: Dùng các nút text pill (`Gọi điện`, `Zalo`, `Đặt lịch`, `Lên đơn`), không icon.
* **Tuyệt đối không dùng ký hiệu `&` để thay cho chữ "và"**:
  - Bắt buộc viết rõ ràng chữ "và" trong toàn bộ giao diện: tiêu đề, nhãn (label), nút bấm, mô tả, cột bảng... (Ví dụ: viết `Hạng và Điểm`, `Tắm sấy và Cắt tỉa`, `Lưu và Gửi`, không viết `Hạng & Điểm`, `Tắm sấy & Cắt tỉa`).
  - Ngoại trừ các cú pháp kỹ thuật trong URL hoặc code logic nếu bắt buộc.

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
* **Quy chuẩn Viết hoa Tiêu đề chuẩn Tiếng Việt (Sentence Case - Chỉ viết hoa chữ cái đầu tiên)**:
  - Toàn bộ tiêu đề modal, tiêu đề khối thẻ, tiêu đề phân hệ, nhãn bộ lọc, nút bấm BẮT BUỘC chỉ viết hoa duy nhất chữ cái đầu tiên của câu/cụm từ (ngoại trừ tên riêng, tên thú cưng, từ viết tắt SOP/KTV/COD/RMA/POS hoặc mã ID).
  - *Ví dụ chuẩn*: `Lịch trực và điều phối kỹ thuật viên (25/06/2026)`, `Biên bản tiếp nhận an toàn`, `Hồ sơ ca dịch vụ 360°`, `Thêm lịch hẹn mới`, `Đổi kỹ thuật viên`.
  - *Tuyệt đối cấm viết hoa từng từ kiểu Tiếng Anh (Title Case)*: Không viết `Lịch Trực Và Điều Phối Kỹ Thuật Viên`, `Thêm Lịch Hẹn Mới`.
* **Tiêu đề cột bảng (Table Headers)**:
  - **Tuyệt đối không in hoa toàn bộ chữ** (bỏ `text-transform: uppercase`).
  - Viết hoa chữ cái đầu tiêu chuẩn: `Mã KH`, `Họ tên`, `Số điện thoại`, `Hạng và điểm`, `Cảnh báo`, `Trạng thái`.
  - Nền tiêu đề bảng: `--table-header-bg: #EEF5F1;` (xanh xô thơm rất nhạt).
* **Chữ chính & Chữ phụ**:
  - Chữ chính: `--text-main: #203A2C;` (xanh than sẫm, êm mắt).
  - Chữ phụ, email, chú thích: `--text-muted: #4F7A65;`.

---

## 5. QUY TẮC CẢNH BÁO (ALERTS) & TRẠNG THÁI (STATUSES)

* **Viền cạnh mép trái (`border-left`)**:
  - **DUY NHẤT & ĐỘC QUYỀN cho dòng dữ liệu bảng cần Alert**: Vạch đỏ 3px (`border-left: 3px solid #DC2626;` cho khiếu nại) hoặc vạch cam 3px (`#D97706;` cho lưu ý) CHỈ ĐƯỢC PHÉP ÁP DỤNG trên ô đầu tiên (`td:first-child`) của dòng bảng dữ liệu. Các dòng bình thường dùng viền trong suốt `border-left: 3px solid transparent;` để căn hàng thẳng tắp.
  - **Đồng bộ hàng tiêu đề cột (`th:first-child`)**: Ô đầu tiên của hàng tiêu đề bảng BẮT BUỘC có `border-left: 3px solid var(--table-header-bg);` để ăn khớp thẳng tắp với các dòng dữ liệu bên dưới, triệt tiêu hoàn toàn khe hở màu trắng bên trái.
  - **TUYỆT ĐỐI CẤM DÙNG `border-left` Ở BẤT KỲ VỊ TRÍ NÀO KHÁC**: Ngoại trừ dòng trong bảng, tuyệt đối không dùng viền mép trái làm trang trí (callout, trích dẫn quote, danh sách, khối ghi chú, thẻ thông tin...). Các khối trích dẫn/nội dung phản ánh phải trình bày dạng chữ phẳng tự nhiên, thoáng đãng (`border: none; background: transparent;`).
  - **Dòng cảnh báo thuần chữ đỏ (Không nền & Không viền khung)**: Cảnh báo khẩn cấp trình bày dạng dòng chữ màu đỏ thuần (`color: #DC2626; background: transparent; border: none;`), không vẽ khung viền hộp và không bôi màu nền để triệt tiêu hoàn toàn cảm giác "hộp viền bao quanh".
* **Triệt Tiêu Badge Hộp Màu Ở Cột Cảnh Báo (No Boxed Alert Badges - Text Dot Indicators)**:
  - Cột Cảnh báo **TUYỆT ĐỐI KHÔNG DÙNG BADGE KHUNG HỘP NỀN MÀU**: Triệt tiêu hoàn toàn các khối pill nền đỏ/cam/xanh lồng nhau gây rối mắt.
  - **Chỉ hiển thị khi THẬT SỰ CẦN LƯU Ý / KHẨN CẤP**: Hiển thị dưới dạng Text phẳng màu dịu kèm dấu chấm tròn (`• Pet có lưu ý`, `• Quá hạn duyệt (>30p)`, `• Chờ thanh toán COD`).
  - **Dòng bình thường / Hoàn tất**: Không bôi chữ "Bình thường", không bôi badge màu, chỉ hiển thị dấu gạch ngang nhẹ `—` (`color: var(--text-muted); opacity: 0.35; font-size: 13px;`) để mắt người quản trị được nghỉ ngơi và tập trung 100% vào các dòng có vấn đề.
  - **Triệt tiêu các nhãn hiển nhiên**: Không gắn nhãn *"Đúng tiến độ"*, *"Đang chạy bình thường"*.
* **Triệt Tiêu Các Chip Màu Con Lồng Trong Cột Dữ Liệu (No Nested Colored Sub-Chips)**:
  - Toàn bộ thông tin phụ bên trong các cột dữ liệu (như mã phòng, số đêm, thực đơn, cự ly taxi, phương thức giao nhận, chi nhánh): Trình bày dạng **dòng chữ phụ mỏng nhẹ** (`color: var(--text-muted); font-size: 11.5px; margin-top: 2px;`), tuyệt đối **không bọc chip nền màu cam, xanh, vàng** lồng bên trong ô bảng làm vụn vặt và nặng nề giao diện.
* **Dải Thông Báo Nhanh Đầu Bảng (Translucent Upcoming / Alert Strip)**:
  - **Nền dải chung**: Dùng nền trắng bán trong suốt thanh thoát tiệp màu hệ thống `background-color: rgba(244, 249, 246, 0.85); border-bottom: 1px solid var(--border-neutral);`. Tiêu đề dải và liên kết lọc dùng màu xanh Forest Green `--text-heading: #236B48; font-weight: 700;`, không dùng màu vàng cam chói gắt.
  - **Đồng nhất 100% hình khối các thẻ tag con (`.alert-item-tag`, `.upcoming-item-tag`, `.complaint-item-tag`)**: 
    * Toàn bộ các tag con dùng chung một nền xanh xô thơm rất nhạt thanh lịch `background-color: #EEF5F1; border-radius: 9px; border: none !important; padding: 3px 10px; font-size: 12.5px;`, hover nhẹ sang `#E2ECE5`.
    * **Triệt tiêu hoàn toàn các hộp tag nền vàng/cam/hồng chói mắt** lồng trên dải thông báo.
    * Điểm nhấn / Mốc thời gian / Số lượng: In đậm `font-weight: 700; color: #236B48;`.
    * Tên chính: `font-weight: 600; color: #203A2C;`.
    * Chú thích phụ / Tên thú cưng / Ghi chú trong ngoặc: Chữ nhỏ hơn `font-size: 11.5px; color: #4F7A65;`.
* **Tài khoản bị khóa (`.row-locked`)**:
  - **Làm mờ rõ rệt toàn bộ dòng**: Áp dụng `opacity: 0.52;` cho cả hàng dữ liệu để người quản trị phân biệt ngay lập tức tài khoản đã bị vô hiệu hóa so với các tài khoản đang hoạt động.
* **Huy hiệu trạng thái (`.admin-badge`) - Muted Pastel & Không viền**:
  - **Tuyệt đối không viền (`border: none !important;`)**: Triệt tiêu hoàn toàn cảm giác đóng khung hộp cứng nhắc.
  - **Độ đậm & Hình khối chữ nhật chuẩn 9px**: `height: 24px; padding: 0 9px; font-size: 12px; font-weight: 500; border-radius: 9px !important; line-height: 1;`. Chiều cao 24px đảm bảo hai cạnh bên có đoạn thẳng đứng (6px), tạo hình khối chữ nhật bo góc 9px vuông vức đồng bộ với Card/Button/Input, triệt tiêu hoàn toàn hình dạng viên thuốc (oval / pill) hai đầu bị bo tròn ủng bán nguyệt.
  - **Bảng màu dịu mắt (Muted Pastel / Tone-down)**: Triệt tiêu hiệu ứng kẹo cầu vồng chói mắt, gom về các sắc thái tự nhiên, dịu nhẹ, tiệp với nền kính mờ:
    * *Trung tính / Mặc định / Bản nháp*: Nền `#E2ECE5`, chữ xanh than xô thơm `#2D483B`.
    * *Tích cực (Hoạt động, Hoàn thành, Đã thanh toán, Đang làm việc)*: Nền xanh Forest nhạt `#DCEEE2`, chữ `#165335`.
    * *Chú ý / Chờ duyệt (Chờ xác nhận, Tạm dừng, Nghỉ phép, Chưa thanh toán)*: Nền hổ phách ấm `#F5E8D3`, chữ nâu ấm `#734718`.
    * *Khẩn cấp / Tiêu cực (Đã hủy, Nghỉ việc, Bị khóa, Không đạt, Cảnh báo)*: Nền đỏ đất nhạt `#F7DCDC`, chữ đỏ đất sẫm mềm `#8F2424`.
    * *Tiến trình / Thông tin (Đang thực hiện, Đang giao, Đã xác nhận, Tạm nghỉ)*: Nền xô thơm / xanh phấn nhẹ `#DCEAF2`, chữ `#20495E`.
* **Số đếm cảnh báo trên Tab con (`.tab-badge-count`)**:
  - Khi có đơn hàng, lịch hẹn hoặc khiếu nại đang chờ xử lý, hiển thị con số màu đỏ đặt ở **góc trên bên phải** của tên tab (dạng pill mini `color: #DC2626; background: #FEE2E2; border-radius: 9px; position: absolute; top: -7px; right: -9px;`) để người quản trị nhận diện ngay tức thì.

---

## 6. QUY TẮC DỮ LIỆU THỰC & CẤM TUYỆT ĐỐI SỬ DỤNG JSON (PURE SUPABASE LIVE DATABASE - ZERO JSON MOCK)

* **Cấm 100% sử dụng và nạp dữ liệu từ file `.json`**:
  - Tuyệt đối KHÔNG đọc, nạp, import hay fetch bất kỳ file `.json` nào (`/data/staff.json`, `services.json`, `orders.json`, `customers.json`, `pets.json`, `vouchers.json`...) trong toàn bộ hệ thống Admin.
  - Toàn bộ các phân hệ (Dashboard, Khách hàng, Thú cưng, Dịch vụ, Bán hàng, Nhân sự, Đánh giá, Báo cáo...) BẮT BUỘC kết nối, nạp dữ liệu, tạo mới, chỉnh sửa, khóa và xóa (CRUD) **100% trực tiếp từ Cơ sở dữ liệu Supabase Live Database**.
* **Tuyệt đối không Fallback về JSON hay chèn Mock Data tĩnh**:
  - Khi CSDL chưa có dữ liệu hoặc danh sách trả về rỗng, giao diện hiển thị đúng trạng thái trống (Empty State) sạch sẽ và trang nhã, tuyệt đối không tự ý fallback về file `.json` hay tự ý tạo các mảng mock tĩnh chứa tên giả.
* **Đồng bộ thời gian thực (Supabase Realtime Channel)**:
  - Mọi thao tác thêm/sửa/xóa đều được ghi trực tiếp vào các bảng Supabase tương ứng (`staff`, `staff_schedule`, `appointment`, `customer`, `pet`, `service`, `orders`, `order_items`, `review`, `audit_log`...) và tự động lắng nghe Realtime Channel để cập nhật giao diện tức thì.

---

## 7. QUY TẮC FORM, MODAL & LIÊN KẾT THỰC THỂ THÔNG MINH (INTELLIGENT ENTITY AUTOCOMPLETE & CONDITIONAL FIELDS)

* **Chuẩn Hóa Ô Tìm Kiếm Thực Thể Bằng Custom Autocomplete Popover**:
  - Mọi form/modal khi nhập hoặc chọn thực thể (Khách hàng, Bé cưng, Gói dịch vụ cụ thể, Sản phẩm, Nhân viên/KTV) **BẮT BUỘC sử dụng Custom Autocomplete Popover** đồng bộ hệ thống (`.customer-autocomplete-popover`, `.service-autocomplete-popover`...).
  - **Cấm 100% sử dụng thẻ `<datalist>` hoặc thẻ `<select>` trần thô** cho các danh sách lớn hoặc có liên kết dữ liệu phức tạp.
  - **100% Flat Text-Only (Tuyệt đối không có icon hay avatar tròn lồng trong danh sách popover)**: Trình bày thuần chữ phẳng, tên in đậm rõ nét, dòng thông tin phụ mỏng nhẹ (`font-size: 11.5px; color: #4F7A65;`), bên phải có badge định danh nhẹ nhàng (Hạng thành viên, thời lượng, giá tiền).

* **Liên Kết Thực Thể & Tự Động Điền Thông Minh 2 Chiều (Two-Way Smart Auto-Fill)**:
  - **Khi chọn Khách hàng**:
    * Tự động điền ngay Số điện thoại (SĐT) vào ô tương ứng (ví dụ: `#newBookingPhone`), không bắt người quản trị phải gõ lại SĐT thủ công.
    * Tự động nạp và lọc danh sách bé cưng thuộc sở hữu của khách hàng đó vào ô chọn Bé cưng.
    * Tự động điền cảnh báo an toàn / tiền sử lưu ý của khách hàng nếu có.
  - **Khi chọn Bé cưng trước**:
    * Hệ thống tự động truy xuất và điền ngược lại thông tin Chủ nuôi và Số điện thoại vào form (nếu các ô này đang trống).
  - **Khi chọn Gói dịch vụ cụ thể**:
    * Popover hiển thị tên gói dịch vụ, thời lượng thực hiện và mức giá niêm yết rõ ràng.
    * Tự động cập nhật thời lượng và giá tiền dự kiến vào form.
  - **Thẻ xác nhận lựa chọn (`Selected Entity Confirmation Card`)**:
    * Ngay khi chọn một thực thể (khách hàng, dịch vụ...), ẩn ô tìm kiếm hoặc hiển thị thẻ xác nhận xanh dịu: Nền xanh xô thơm `#EEF5F1`, bo góc 9px, chữ Forest Green `#236B48`, có nút text `✕ Bỏ chọn`.
    * Khi bấm `✕ Bỏ chọn`: Xóa giá trị đã chọn, xóa các trường phụ thuộc tự điền (như SĐT), mở lại ô tìm kiếm và focus để người dùng chọn lại.

* **Hiển Thị Trường Đặc Thù Có Điều Kiện (Conditional Dynamic Fields)**:
  - Toàn bộ các nhóm trường đặc thù (như *Yêu cầu tạo hình và Grooming*, *Kiểu cắt tỉa*, *Chỉ định dụng cụ*, *Ghi chú lưu chuồng Khách sạn*...) **MẶC ĐỊNH BẮT BUỘC ẨN**.
  - **Chỉ hiển thị khi thỏa mãn điều kiện dịch vụ liên quan**: Khối trường chỉ được kích hoạt hiển thị khi người dùng chọn Nhóm dịch vụ (Spa & Grooming) VÀ Gói dịch vụ cụ thể có liên quan trực tiếp đến cắt tỉa / tạo kiểu / nhuộm lông.
  - Khi người dùng chuyển sang các dịch vụ khác (Tắm vệ sinh cơ bản, Lưu chuồng, Khám sức khỏe), khối trường tạo hình BẮT BUỘC tự động ẩn đi và xóa dữ liệu thừa.

* **Quy Chuẩn Nhãn Trường & Bộ Ba Nút Thao Tác Trong Modal**:
  - **Triệt tiêu 100% dấu hai chấm `:` ở cuối nhãn**: Ghi `Họ và tên khách hàng`, `Số điện thoại`, `Gói dịch vụ cụ thể`, `Ngày hẹn` (không ghi `Họ và tên:`).
  - **Sao đỏ `*` cho trường bắt buộc**: Dùng `<span style="color: #DC2626;">*</span>` đặt ngay sát sau chữ. Tuyệt đối không dùng `(*)`, `*:`, `(*):` hoặc `(bắt buộc)`.
  - **Bộ ba nút thao tác**: Nút Đóng và Hủy BẮT BUỘC có thuộc tính `data-close-modal="[modalId]"`, hỗ trợ đóng 4 chiều (nút Đóng, nút Hủy, click backdrop, phím Escape). Nút Lưu BẮT BUỘC đặt `type="button"` và viết theo Sentence Case (`Lưu lịch hẹn`, `Lưu dịch vụ`). Form có `onsubmit="return false;"`.

---

## 8. NGUYÊN TẮC RÀ SOÁT & PHÁT TRIỂN TỪNG BƯỚC (STEP-BY-STEP REVIEW PRINCIPLE)

* **Tuyệt Đối Không Dùng Lệnh Sửa Hàng Loạt Nhiều Modal Cùng Lúc**:
  - Không được dùng các script thay thế mù hoặc sửa gộp tất cả modal trong một lượt mà không qua xem xét.
* **Quy Trình Nghiệm Thu Từng Modal Một (One Modal At A Time)**:
  - Bắt buộc thực hiện tuần tự: Phân tích từng modal -> Thống nhất các trường dữ liệu -> Áp dụng đúng toàn bộ quy tắc thiết kế & nghiệp vụ -> Kiểm tra trực quan bằng hình ảnh/browser -> Báo cáo người dùng nghiệm thu xong mới chuyển sang modal kế tiếp.

