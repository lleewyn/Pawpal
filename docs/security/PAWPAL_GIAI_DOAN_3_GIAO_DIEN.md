# Giai đoạn 3 — Giao diện theo vai trò

Ngày cập nhật: 05/11/2026. Trạng thái: **hoàn thành giai đoạn 3 trên môi trường thử nghiệm**; chưa chuyển đổi Cloud. Phần AI, cập nhật phiên và Realtime thuộc giai đoạn 4; bộ nghiệm thu PQ tổng hợp thuộc giai đoạn 5.

Vị trí hiện tại: xử lý và màn hình nghiệp vụ theo vai trò nằm trong JS phân hệ (`customers`, `pets`, `services`, `orders`, `complaints`, `chatbot`, `staff`). Thư mục `staff-workspace` đã được bỏ; phần điều hướng/bảng/phân trang chung nằm trong [admin.js](../../pages/admin/admin.js), CSS chung nằm trong [admin-components.css](../../pages/admin/admin-components.css). Các tên file rời và số liệu ghi trong lịch sử bên dưới mô tả từng thời điểm trước khi kết thúc. Bảng đối chiếu gộp form tại [domain-integration-results.txt](phase3/domain-integration-results.txt), tách màn hình tại [view-integration-results.txt](phase3/view-integration-results.txt). Kết quả kết thúc: 300 nhóm tích hợp bằng Auth thật, 10 nhóm đổi mật khẩu bằng Auth thật và 6 bài API PASS; nguồn khớp, tài nguyên bản sao đã dọn. Chi tiết và giới hạn tại mục Kết thúc giai đoạn 3 cuối tài liệu.

## Đã thực hiện

- Xác minh phiên và `get_staff_login_context` trước khi nạp phân hệ. Chỉ chấp nhận đúng một vai trò ADMIN/STAFF, tài khoản hoạt động và không còn yêu cầu đổi mật khẩu. Không lấy vai trò trong bộ nhớ trình duyệt làm căn cứ cấp quyền.
- Modal tài khoản dùng hai lựa chọn Quản lý/Nhân viên, không còn bảng quyền riêng. Lưu một vai trò và danh sách quyền riêng rỗng qua RPC; giữ kiểm tra phiên bản và lý do thay đổi. Người dùng đã nghiệm thu: “Đồng ý, tiếp tục”.
- Nhân viên dùng giao diện đọc riêng qua `get_staff_workspace`, tìm kiếm khách/đơn và xem dữ liệu theo phạm vi phía CSDL. Không khởi tạo bộ tải quản trị, không có phân hệ Cấu hình, không nạp trước dữ liệu dành cho Quản lý.
- Giữ vị trí tab, truy vấn và hồ sơ khi tải lại; phân trang tối đa 10 dòng. Lỗi xác minh hiển thị trạng thái thử lại/đăng nhập, không tiếp tục tin vai trò ADMIN lưu sẵn.
- Trả lời trực tiếp hội thoại được giao qua `act_admin_chat`; kiểm tra thông điệp thực lưu đúng nhân viên. Đây là trả lời hội thoại, chưa phải tích hợp công cụ chatbot AI của giai đoạn 4.
- Modal Thêm khách dành cho Nhân viên: Họ và tên, Số điện thoại là bắt buộc; chuẩn hóa đầu +84; báo trùng nhưng giữ dữ liệu nhập; lưu bằng `create_customer_quick`, email và liên kết Auth null; mở hồ sơ vừa tạo. Hỗ trợ Đóng, Hủy, nền ngoài và Escape, có giữ tiêu điểm bàn phím.
- Người dùng đã nghiệm thu Thêm khách: “Đồng ý, tiếp tục”.
- Modal Thêm bé cưng từ danh sách thú cưng hoặc hồ sơ khách: chủ nuôi tìm bằng tên/mã/SĐT, chọn sẽ tự điền SĐT; mở từ hồ sơ khách sẽ tự chọn đúng chủ nuôi. Giống hiển thị cùng loài trong danh mục CSDL đang hoạt động. Hai ô dùng autocomplete chữ thuần, có chọn bằng phím mũi tên/Enter và bỏ chọn; không có datalist hay dữ liệu giả. Escape đóng popover trước, bấm lại hoặc mũi tên xuống mở lại được.
- Tên bé, chủ nuôi và giống bắt buộc; giới tính mặc định Chưa rõ, ngày sinh không ở tương lai, cân nặng nếu nhập phải lớn hơn 0 và không quá 1000 kg. Màu lông, cảnh báo, dị ứng, tập tính nhập tự do. Lưu qua `save_admin_pet` với UUID giữ nguyên khi thử lại, khóa nút khi chờ; cân nặng ghi cùng giao dịch. Lưu thành công mở hồ sơ thật, tên trùng cùng chủ nuôi bị từ chối và giữ nội dung nhập. Không có thao tác chuyển chủ nuôi hoặc lưu trữ hồ sơ cho Nhân viên trong modal này.

## Bằng chứng kiểm thử

Chạy `node scripts/test/admin_access_phase3_ui.cjs`: **264 nhóm PASS**. Kết quả cuối và dấu kiểm mã nguồn trong [ui-results.txt](phase3/ui-results.txt). Bản sao CSDL và container kiểm thử đã được dọn.

Riêng đổi mật khẩu chạy `node scripts/test/admin_own_password_ui.cjs`: **10 nhóm PASS** với GoTrue/Auth đăng nhập thật, PostgREST và trình duyệt trên CSDL riêng. Kết quả tại [password-ui-results.txt](phase3/password-ui-results.txt); Auth/PostgREST và CSDL bản sao đều đã dọn. Bộ nghiệp vụ 264 nhóm tiếp tục dùng JWT ký cục bộ; chưa phải kiểm thử đăng nhập thật toàn bộ nghiệp vụ.

Bộ kiểm thử chạy trình duyệt thật với Supabase SDK và PostgREST, JWT ký cục bộ, CSDL PostgreSQL dùng cấu trúc migration 165, bổ sung 166/167/168/169/170/171/172 và dữ liệu nghiệp vụ tổng hợp riêng. Các lần gọi RPC đọc/ghi là thật trên CSDL thử nghiệm; không thay bằng dữ liệu trả lời giả trong giao diện. Có mô phỏng mất phản hồi mạng sau một lần ghi thật để kiểm tra thử lại. CSDL rà soát chính vẫn được giữ ở migration 165.

Kiểm tra gồm lưu vai trò thật và tự hạ vai trò, từ chối vai trò giả trong bộ nhớ, tài khoản bị khóa/lỗi xác minh, phạm vi dữ liệu ở tám phân hệ, không lấy hội thoại ngoài phạm vi, lưu trả lời đúng người, lưu khách mới đúng một bản ghi, số điện thoại trùng, trường bắt buộc và bố cục điện thoại.

Phần thú cưng kiểm tra chọn/bỏ chọn chủ nuôi và SĐT liên kết; Escape không đóng nhầm modal khi popover đang mở; chọn giống bằng bàn phím; ngày sinh/cân nặng sai không gửi ghi; lưu đúng chủ nuôi/giống/ghi chú và một bản cân nặng do nhân viên hiện tại ghi; tải lại vẫn còn; mở từ hồ sơ khách chọn sẵn chủ nuôi; tên trùng bị CSDL chặn; bốn cách đóng và không tràn ngang điện thoại. Kiểm tra cú pháp JavaScript và `git diff --check` đều đạt.

| Modal | Máy tính | Điện thoại | Nghiệm thu |
|---|---|---|---|
| Tài khoản | [Ảnh](phase3/role-modal-desktop.png) | [Ảnh](phase3/role-modal-mobile.png) | Người dùng đã đồng ý |
| Thêm khách | [Ảnh](phase3/customer-create-desktop.png) | [Ảnh](phase3/customer-create-mobile.png) | Người dùng đã đồng ý |
| Thêm bé cưng | [Ảnh](phase3/pet-create-desktop.png) | [Đầu form](phase3/pet-create-mobile.png), [cuối form](phase3/pet-create-mobile-bottom.png) | Đã đồng ý nghiệp vụ; màu đã sửa theo phản hồi |
| Sửa hồ sơ bé cưng | [Ảnh](phase3/pet-edit-desktop.png) | [Đầu form](phase3/pet-edit-mobile.png), [cuối form](phase3/pet-edit-mobile-bottom.png) | Người dùng đã đồng ý, bao gồm nền trắng |
| Sửa thông tin khách | [Ảnh](phase3/customer-edit-desktop.png) | [Ảnh](phase3/customer-edit-mobile.png) | Người dùng đã đồng ý |
| Sổ địa chỉ | [Ảnh](phase3/address-desktop.png) | [Đầu form](phase3/address-mobile.png), [cuối form](phase3/address-mobile-bottom.png) | Người dùng đã yêu cầu tiếp tục |
| Tạo lịch hẹn | [Ảnh](phase3/booking-desktop.png), [lưu trú](phase3/booking-hotel.png), [xe](phase3/booking-taxi.png) | [Đầu form](phase3/booking-mobile.png), [cuối form](phase3/booking-mobile-bottom.png), [lưu trú](phase3/booking-hotel-mobile.png), [xe](phase3/booking-taxi-mobile.png) | Người dùng đã đồng ý |
| Biên bản tiếp nhận | [Ảnh](phase3/intake-desktop.png) | [Đầu form](phase3/intake-mobile.png), [cuối form](phase3/intake-mobile-bottom.png) | Người dùng đã đồng ý |
| Nhật ký chăm sóc | [Thêm](phase3/care-log-desktop.png), [sửa](phase3/care-log-edit-desktop.png) | [Ảnh](phase3/care-log-mobile.png) | Người dùng đã đồng ý |
| Biên bản bàn giao | [Ảnh](phase3/handover-desktop.png) | [Ảnh](phase3/handover-mobile.png) | Người dùng đã đồng ý |
| Trả phòng | [Ảnh](phase3/hotel-checkout-desktop.png) | [Ảnh](phase3/hotel-checkout-mobile.png) | Người dùng yêu cầu tiếp tục sau ảnh |
| Tạo đơn tại quầy | [Ảnh](phase3/sales-create-desktop.png) | [Đầu form](phase3/sales-create-mobile.png), [cuối form](phase3/sales-create-mobile-bottom.png) | Người dùng đã đồng ý |
| Thu tiền đơn hàng | [Ảnh](phase3/cashier-sales-desktop.png) | [Đầu form](phase3/cashier-sales-mobile.png), [cuối form](phase3/cashier-sales-mobile-bottom.png) | Người dùng đã đồng ý |
| Thu tiền ca dịch vụ | [Ảnh](phase3/cashier-service-desktop.png) | [Đầu form](phase3/cashier-service-mobile.png), [cuối form](phase3/cashier-service-mobile-bottom.png) | Người dùng đã đồng ý |
| Trao đổi khiếu nại | [Phản hồi](phase3/complaint-message-desktop.png), [yêu cầu bổ sung](phase3/complaint-request-info-desktop.png) | [Phản hồi](phase3/complaint-message-mobile.png), [cuối form](phase3/complaint-message-mobile-bottom.png), [yêu cầu bổ sung](phase3/complaint-request-info-mobile.png) | Người dùng đã đồng ý |
| Đề xuất phương án xử lý | [Dịch vụ](phase3/complaint-proposal-service-desktop.png), [bán hàng](phase3/complaint-proposal-order-desktop.png) | [Ảnh](phase3/complaint-proposal-mobile.png), [cuối form](phase3/complaint-proposal-mobile-bottom.png) | Người dùng đã đồng ý |
| Tạo khiếu nại | [Dịch vụ](phase3/complaint-create-service-desktop.png), [bán hàng](phase3/complaint-create-order-desktop.png) | [Đầu form](phase3/complaint-create-mobile.png), [cuối form](phase3/complaint-create-mobile-bottom.png), [mã đơn dài](phase3/complaint-create-order-mobile.png) | Người dùng yêu cầu tiếp tục sau ảnh |
| Đổi mật khẩu cá nhân | [Ảnh](phase3/own-password-desktop.png) | [Ảnh](phase3/own-password-mobile.png) | Người dùng đã đồng ý |
| Kết thúc hội thoại | [Ảnh](phase3/chat-resolution-desktop.png) | [Ảnh](phase3/chat-resolution-mobile.png) | Đã nghiệm thu: Đồng ý, tiếp tục |
| Mời đón bé | [Ảnh](phase3/pickup-desktop.png) | [Ảnh](phase3/pickup-mobile.png) | Đã nghiệm thu: Đồng ý, tiếp tục |
| Ghi chú khách hàng | [Ảnh](phase3/customer-note-desktop.png) | [Ảnh](phase3/customer-note-mobile.png) | Đã nghiệm thu: Tiếp tục |
| Phiếu bán hàng | [Ảnh](phase3/sales-receipt-desktop.png) | [Ảnh](phase3/sales-receipt-mobile.png), [cuối form](phase3/sales-receipt-mobile-bottom.png) | Đã nghiệm thu: Đồng ý, tiếp tục |
| Phiếu ca dịch vụ | [Ảnh](phase3/service-receipt-desktop.png) | [Ảnh](phase3/service-receipt-mobile.png), [cuối form](phase3/service-receipt-mobile-bottom.png) | Đang chờ người dùng |
| Tạo khiếu nại từ hồ sơ | [Ca](phase3/complaint-origin-service-desktop.png), [đơn](phase3/complaint-origin-order-desktop.png) | [Đầu form](phase3/complaint-origin-service-mobile.png), [cuối form](phase3/complaint-origin-service-mobile-bottom.png) | Đang chờ người dùng |

Đã xem trực tiếp ảnh Thêm khách trên cả hai kích thước, các trường và nút không tràn màn hình.

Đã xem ảnh Thêm bé cưng trên máy tính, đầu/cuối form điện thoại và [popover chủ nuôi](phase3/pet-owner-autocomplete.png). Form có hai cột trên máy tính, một cột và cuộn bên trong trên điện thoại; không cắt ngang các trường hay nút lưu.

## Sửa hồ sơ bé cưng và điều chỉnh màu

Người dùng đồng ý Thêm bé cưng, phản ánh nền modal bị lạ màu và yêu cầu tiếp tục. Đã đổi nền modal Nhân viên từ trắng trong suốt sang trắng đặc `#fff`, bỏ backdrop blur trên card và overlay, giữ xanh thương hiệu và bo góc 9px theo modal chuẩn hiện có. Ảnh và kết quả kiểm thử đã được chụp lại sau sửa.

Sửa hồ sơ dùng cùng form thú cưng, mở từ hồ sơ đã tìm được, đọc lại thú cưng/chủ nuôi/danh mục giống trước khi bật lưu. Chủ nuôi và SĐT chỉ đọc, không có nút bỏ chọn chủ nuôi. Không có quyền lưu trữ hồ sơ. Nếu thiếu dữ liệu liên quan hoặc giống không còn trong danh mục hoạt động, form báo không tải đủ và khóa lưu để Quản lý kiểm tra. Tra giống qua RPC phân trang, tối đa 100 trang; không truy vấn bảng trực tiếp.

Gửi `p_expected_updated_at` từ lần đọc mới nhất qua `save_admin_pet`; sau lưu nạp lại hồ sơ đang mở. Kiểm thử xác nhận cùng ID và chủ nuôi, ghi đúng một cân nặng mới, tải lại vẫn thấy thay đổi. Mô phỏng một phiên khác sửa hồ sơ: bản lưu cũ bị PT409, nội dung nhập giữ nguyên và cân nặng không phát sinh; đóng/mở lại lấy đúng phiên bản mới. Payload giả mạo chuyển chủ nuôi trả 42501 và không đổi dữ liệu. Kiểm tra Enter không tự lưu, tiêu điểm bàn phím trong modal và bốn cách đóng đều đạt. Đã xem trực tiếp ảnh máy tính, đầu/cuối form điện thoại của modal sửa, không tràn ngang.

## Sửa thông tin khách

Người dùng nghiệm thu Sửa hồ sơ bé cưng: “Đồng ý, tiếp tục”. Modal tiếp theo là Sửa thông tin khách, mở từ hồ sơ tra cứu, đọc lại khách qua `get_staff_workspace` rồi mới bật lưu. Gồm họ tên/SĐT bắt buộc, email liên hệ, giới tính và ngày sinh. Không có quyền đổi hạng, khóa tài khoản hay sửa liên kết Auth trong form. Payload `update_customer_profile` giữ đúng `membership_tier_id` đã đọc, gửi `p_addresses: null` để bảo toàn sổ địa chỉ và `p_expected_updated_at` để chặn ghi đè phiên khác. Email trống gửi null, SĐT đầu +84 được chuẩn hóa.

Kiểm thử mới xác nhận tải các trường từ CSDL, dữ liệu sai không gửi ghi; SĐT trùng trả lỗi và giao dịch không lưu email đang nhập; lưu thành công đúng tên/SĐT/email/giới tính/ngày sinh, giữ hạng, địa chỉ và liên kết Auth null như ban đầu. Sau tải lại vẫn thấy dữ liệu. Bản sửa cũ bị PT409 và giữ nội dung nhập, mở lại lấy phiên bản mới. Payload giả mạo xóa hạng trả 42501, hạng không đổi. Bốn cách đóng, giữ tiêu điểm và Enter không tự lưu đều đạt. Đã xem ảnh máy tính/điện thoại, không tràn ngang. Chưa bổ sung chỉnh sổ địa chỉ trong modal này.

## Sổ địa chỉ

Sau khi người dùng nghiệm thu Sửa thông tin khách, bổ sung nút Sổ địa chỉ trong hồ sơ. Mở modal đọc mới khách và toàn bộ địa chỉ qua `get_staff_workspace`, tối đa 50 địa chỉ theo giới hạn RPC ghi; nếu phát hiện nhiều hơn hoặc có lỗi tải thì khóa lưu, tránh gửi danh sách thiếu làm mất dữ liệu. Form trắng, hai cột trên máy tính và một cột trên điện thoại, không đóng khung các địa chỉ phụ; địa chỉ mặc định có nền xanh nhạt và viền theo chuẩn `AGENTS.md`.

Thêm địa chỉ điền sẵn người nhận/SĐT của khách; bắt buộc người nhận, SĐT, tỉnh hoặc thành phố và địa chỉ nhận hàng; mã bưu chính tùy chọn. Người dùng sửa trực tiếp, xóa trong bản nháp rồi bấm Lưu địa chỉ để ghi. Radio chọn đúng một mặc định khi danh sách còn phần tử, xóa mặc định tự chọn địa chỉ còn lại đầu tiên. Có thể xóa hết thành sổ trống. Payload `update_customer_profile` giữ nguyên các trường khách và hạng đã đọc, kèm phiên bản `updated_at` và danh sách địa chỉ đầy đủ. Chưa ghi nếu chưa bấm lưu.

Kiểm thử gồm tải/lưu 11 địa chỉ qua nhiều trang không mất dữ liệu; thêm/xóa/chuyển mặc định thật; SĐT +84 được chuẩn hóa; giữ nguyên thông tin khách, hạng và thời điểm gán hạng (cột kỹ thuật `updated_at` của hạng được trigger cập nhật khi RPC chạy). Sau tải lại mặc định vẫn đúng; bản sửa cũ bị PT409, giữ nội dung nhập, không ghi đè địa chỉ mới. Xóa mặc định còn đúng một mặc định, xóa địa chỉ cuối lưu danh sách rỗng. ID địa chỉ khách khác bị RPC trả 42501; lỗi đọc địa chỉ khiến nút Lưu bị khóa. Bốn cách đóng, Enter không tự lưu, tiêu điểm trong modal và không tràn ngang đều đạt. Đã xem trực tiếp ảnh máy tính, đầu/cuối form điện thoại. Dữ liệu và container kiểm thử đã dọn.

## Tạo lịch hẹn

Người dùng yêu cầu “tiep tuc” sau Sổ địa chỉ. Đã nối modal Tạo lịch hẹn trên màn hình công việc và Dịch vụ của Nhân viên, dùng module riêng `admin-staff-booking.js`, không khởi tạo bộ tải quản trị. Khách hàng/thú cưng/gói dịch vụ/phòng dùng autocomplete chữ thuần từ CSDL. Chọn khách sẽ tự điền SĐT, nạp các trang thú cưng và chọn bé đầu tiên; chọn bé trước tự điền chủ nuôi và giữ đúng bé đã chọn. Lưu ý sức khỏe tự điền từ hồ sơ, cho sửa tự do. Cân nặng chỉ đọc từ hồ sơ; nếu chưa có thì phải ghi nhận trong hồ sơ thú cưng trước khi đặt lịch.

Ngày hẹn phải ở tương lai theo múi giờ +07. Trường tạo kiểu chỉ hiện cho tên gói Grooming/cắt tỉa/tạo kiểu/style thuộc nhóm chăm sóc. Lưu trú chỉ hiện ngày trả phòng, phòng, chế độ ăn và lưu ý chăm sóc. Xe chỉ hiện đón/trả, cự ly mỗi lượt, hành trình và thời gian lượt về khi khứ hồi. Khi đổi gói, xóa các trường riêng của gói trước. Không có ô chọn người được phân công. Thành công hiện mã lịch chờ Quản lý phân công; không tự mở rộng quyền đọc sang lịch chưa được giao.

Giá tạm tính lấy theo cân nặng, ngày hẹn, biên khoảng và thời gian hiệu lực từ danh mục. Lưu trú tính theo kỳ tính phí của phòng; xe khứ hồi tính hai lượt theo quy tắc của gói. RPC tạo lịch hiện có quyết định giá thực tế, kiểm tra chủ nuôi/loài, cân nặng, gói, phòng và xung đột. Payload không gửi giá. Giữ UUID yêu cầu cho cùng nội dung khi thử lại, khóa nhập và nút tạo khi chờ; sau thành công khóa tạo lần nữa trong form đó.

### Bổ sung CSDL 166

- [Migration](../../scripts/database/v1/166_staff_booking_catalog.sql) yêu cầu 165: thêm `get_staff_booking_catalog` chỉ cho nhân sự hợp lệ có `work.booking.create` hoặc ADMIN. Trả danh mục dịch vụ, các quy tắc giá gồm thời gian hiệu lực/biên khoảng, phòng theo đúng dịch vụ và giá xe theo đúng dịch vụ; không trả lịch/nhân sự ngoài phạm vi. Mỗi trang 10 dòng; trình duyệt tải đủ danh mục giá/phòng, tối đa 100 trang và báo lỗi nếu vượt giới hạn.
- Thêm guard vào hai RPC tạo lịch: STAFF gửi `staff_id` khác null bị 42501; ADMIN giữ quyền điều phối theo nghiệp vụ gốc. Bổ sung này siết cả yêu cầu trực tiếp, không chỉ ẩn ô trên giao diện.
- [Khôi phục](../../scripts/database/v1/166_staff_booking_catalog.rollback.sql) gỡ danh mục và guard mới. Đã chạy trên bản sao và so sánh MD5 định nghĩa hai RPC đặt lịch khớp hoàn toàn trước khi áp dụng 166.
- Chưa áp dụng 166 vào CSDL rà soát chính hoặc Cloud. Khi triển khai phải theo thứ tự 165 → 166 → giao diện mới.

### Bằng chứng mới

Kiểm thử xác nhận chọn bé trước tự điền chủ nuôi/SĐT; chọn khách nạp thú cưng, cân nặng và giá thật; ngày quá khứ không gửi ghi; tạo lịch chăm sóc đúng giá và chưa phân công. Mô phỏng RPC ghi thành công nhưng mất phản hồi, thử lại cùng UUID chỉ có một lịch trong CSDL. Payload Nhân viên phân công cho người khác bị 42501. Đổi gói cắt tỉa sang tắm ẩn và xóa yêu cầu tạo kiểu. Lưu trú hai ngày tính đúng 400.000 đ, đặt trùng phòng bị từ chối không có bản ghi một phần. Xe khứ hồi 5 km mỗi lượt ghi đúng 120.000 đ, không tự gán tài xế. Các số tiền và tên ở đây thuộc dữ liệu tổng hợp riêng trong CSDL thử nghiệm, không phải dữ liệu dự phòng của giao diện.

Ẩn danh bị chặn ở RPC danh mục mới. Form hỗ trợ bàn phím, bốn cách đóng và không tự submit bằng Enter. Đã xem trực tiếp ảnh chăm sóc trên máy tính/điện thoại, lưu trú và xe trên máy tính/điện thoại, cùng phần cuối form chăm sóc và xe. Không tràn ngang. Kết quả cuối 68 nhóm đạt; bản sao và container đã dọn. Đăng nhập Auth thực, Realtime và trọn bộ PQ vẫn chưa được nghiệm thu.

## Biên bản tiếp nhận

Người dùng nghiệm thu Tạo lịch hẹn: “Đồng ý, tiếp tục”. Bổ sung `admin-staff-intake.js` và nút Lập biên bản tiếp nhận trong hồ sơ ca được giao ở trạng thái đã xác nhận, đã tiếp nhận hoặc đang thực hiện. Mở form đọc mới ca, khách, thú cưng và biên bản qua RPC có phạm vi; thiếu dữ liệu, ca ngoài phạm vi hoặc trạng thái không hợp lệ thì khóa lưu. Không có bộ tải quản trị hoặc dữ liệu mẫu trên giao diện.

Form hiển thị đúng ca/khách/bé, cảnh báo và dị ứng hiện tại; cân nặng điền từ hồ sơ và cho ghi số cân thực tế. Người tiếp nhận chỉ đọc từ danh tính đã xác minh; payload lấy mã nhân viên trực tiếp từ `PawpalAdminAccess`. Da/lông, mắt/tai, vết thương, tập tính bắt buộc nhập ghi nhận thực tế; không tự điền nhận định “bình thường”. Tư trang và ghi chú nhập tự do. Checkbox Khách đã xác nhận không chọn sẵn; bỏ trống lưu đúng trạng thái pending, không suy diễn khách đã đồng ý.

`save_admin_service_record` kiểm tra quyền được giao, phiên bản ca, người thực hiện và điều kiện nghiệp vụ; ghi biên bản, cân nặng và chuyển ca/hạng mục chính sang in_progress trong cùng giao dịch. Nút Lưu và bắt đầu ca biểu đạt thay đổi này; ca đang thực hiện dùng Lưu tiếp nhận. Cùng nội dung thử lại dùng cùng UUID. Khi cần ghi nhận lại hoặc xác nhận sau, tạo revision mới, giữ biên bản cũ và cho đọc nội dung biên bản trước; không tự sửa đè lịch sử. Bảng biên bản thêm cột Xác nhận.

Kiểm thử mới xác nhận đọc đúng cảnh báo/cân nặng, người thực hiện cố định và checkbox trống; dữ liệu thiếu hoặc cân nặng sai không gửi ghi. Bản ca cũ bị PT409, không ghi biên bản/cân nặng; khi Quản lý phân lại ca trong lúc mở form, RPC từ chối. Payload giả mạo người thực hiện trả 42501. Mô phỏng phản hồi bị mất sau ghi thật rồi thử lại: chỉ một biên bản, một số cân mới, ca/hạng mục chính đúng nhân viên và đang thực hiện; tải lại vẫn thấy Chờ khách xác nhận. Lập biên bản xác nhận sau tạo revision 2 và giữ revision 1 pending.

Gọi trực tiếp modal với ca của người khác không nạp thông tin và không bật lưu. Lỗi đọc thú cưng khiến form khóa lưu. Bốn cách đóng, ngăn Enter submit và giữ tiêu điểm trong modal đều đạt. Đã xem ảnh máy tính, đầu/cuối form điện thoại, không tràn ngang. Kết quả cuối 78 nhóm đạt; bản sao CSDL/container đã dọn. Không cần migration bổ sung ngoài 165/166 cho phần tiếp nhận; chưa triển khai Cloud.

## Hạng mục và Nhật ký chăm sóc

Người dùng nghiệm thu Biên bản tiếp nhận: “Đồng ý, tiếp tục”. Hạng mục được giao có menu text `•••` với Bắt đầu hoặc Hoàn thành theo trạng thái. RPC `perform_staff_service_item` nhận phiên bản đã đọc, chỉ cho pending → in_progress → completed khi ca phù hợp và hạng mục được giao. Cập nhật hạng mục không tự bàn giao hoặc hoàn tất toàn bộ ca. Khi mất phản hồi, giao diện đọc lại hạng mục có phạm vi; nếu trạng thái mục tiêu đã có thì tải lại hồ sơ, tránh gửi thao tác lần nữa. Trường hợp chưa xác minh được hoặc bản ghi đã đổi thì báo tải lại.

Form `admin-staff-care-log.js` hỗ trợ thêm/sửa nhật ký trên ca đang thực hiện. Công việc và thời điểm bắt buộc, người ghi chỉ đọc từ phiên, ghi nhận nhập tự do. Thời điểm không ở tương lai; RPC kiểm tra mốc từ lúc tiếp nhận. Sửa chỉ hiện với nhật ký do chính nhân viên ghi, không có nút xóa. Mở form đọc mới ca và nhật ký; không tìm thấy dữ liệu, ca ngoài phạm vi hoặc nhật ký đồng nghiệp thì khóa lưu. Tra nhật ký qua các trang scoped, tối đa 100 trang và báo lỗi nếu vượt giới hạn. Gửi phiên bản ca và phiên bản nhật ký riêng; khi chỉ sửa nội dung, giữ nguyên chuỗi timestamp gốc gồm phần giây lẻ.

Tạo mới dùng UUID giữ nguyên khi thử lại cùng nội dung. Sửa nhật ký sau mất phản hồi được đối chiếu với dữ liệu scoped đã lưu (ID, người ghi, công việc, nội dung, thời điểm) trước khi báo thành công; nếu chưa khớp thì giữ form và báo lỗi. Không dùng bộ nhớ trình duyệt làm bằng chứng đã lưu.

### Bổ sung CSDL 167

[Migration 167](../../scripts/database/v1/167_staff_care_log_performer.sql) thêm kiểm tra tại `work_guard_rpc`: STAFF lưu nhật ký phải gửi `staff_id` đúng nhân viên đang đăng nhập. Giữ kiểm tra ca được giao, quyền sửa nhật ký của mình và cấm xóa có từ 165. ADMIN giữ thẩm quyền hiện có. [Khôi phục](../../scripts/database/v1/167_staff_care_log_performer.rollback.sql) đã chạy trên CSDL bản sao, MD5 định nghĩa guard sau khôi phục khớp trước khi áp dụng. Chưa áp dụng vào CSDL rà soát chính hoặc Cloud. Khi triển khai theo thứ tự 165 → 166 → 167; khôi phục theo chiều ngược lại.

### Bằng chứng mới

Kiểm thử xác nhận ghi nhật ký thật đúng nhân viên, tải lại vẫn còn; thiếu công việc/thời điểm tương lai không gửi ghi, thời điểm trước tiếp nhận bị CSDL chặn. Bản ca cũ và bản nhật ký cũ không ghi đè, giữ dữ liệu nhập. Mất phản hồi sau tạo rồi thử lại chỉ một bản ghi; mất phản hồi sau sửa được xác minh qua đọc scoped mà không gửi thêm lần ghi. Sửa nội dung giữ timestamp gốc có sáu chữ số phần giây. Nhật ký đồng nghiệp không có nút sửa, mở trực tiếp bị khóa; RPC từ chối giả mạo người ghi, sửa nhật ký đồng nghiệp và xóa (42501).

Hạng mục đồng nghiệp không được trả về, yêu cầu sửa trực tiếp bị 42501. Bản hạng mục cũ không chuyển trạng thái; bắt đầu rồi hoàn thành hạng mục của mình tạo đúng hai bản audit gắn nhân viên. Mất phản hồi sau bắt đầu được đối chiếu đúng trạng thái và không ghi lại. Form nhật ký qua kiểm tra bàn phím, Enter không submit và bốn cách đóng. Đã xem ảnh thêm/sửa trên máy tính, ảnh điện thoại; không tràn ngang. Kết quả cuối 91 nhóm đạt, đã dọn CSDL bản sao/container và thử khôi phục 167 rồi 166.

## Biên bản bàn giao

Người dùng nghiệm thu Nhật ký chăm sóc: “Đồng ý, tiếp tục”. Bổ sung `admin-staff-handover.js`, mở từ ca đang thực hiện trong phạm vi được giao. Đọc mới ca/khách/bé và toàn bộ các trang biên bản (tối đa 100 trang); chọn intake có revision cao nhất, không dựa vào việc từng có một bản đã xác nhận. Nếu thiếu dữ liệu, không đúng trạng thái hoặc intake mới nhất chưa confirmed thì khóa lưu.

Form hiển thị ca, khách, bé, nhân viên bàn giao và nội dung tiếp nhận đã ghi. Ba checkbox Chất lượng, Tư trang, Khách xác nhận bắt buộc và không chọn sẵn; ghi chú nhập tự do. Payload dùng `save_admin_service_record` loại handover, phiên bản ca và UUID giữ nguyên cho cùng nội dung khi thử lại. RPC kiểm tra điều kiện nghiệp vụ, ghi biên bản và hoàn tất ca/hạng mục trong một giao dịch. Sau thành công tải lại hồ sơ, ca hoàn tất không còn nút bàn giao hoặc ghi nhật ký.

Kiểm thử xác nhận thiếu checkbox không gửi ghi; hạng mục đồng nghiệp còn pending chặn và không bị hoàn tất nhầm. Tạo các revision tiếp nhận mới qua RPC để kiểm tra bản mới pending chặn dù bản cũ confirmed, giữ nguyên tính bất biến của bản đã xác nhận. Điều chỉnh pending hoặc approved nhưng khách chưa confirmed đều bị chặn. Phiên bản ca cũ không hoàn tất, giữ dữ liệu nhập; phân lại ca thu hồi quyền lưu. Gọi trực tiếp ca ngoài phạm vi hoặc lỗi đọc biên bản khóa lưu, không hiện dữ liệu ca khác. Bốn cách đóng, giữ tiêu điểm và ngăn Enter submit đều đạt; đã xem ảnh máy tính và điện thoại, không tràn ngang.

Mô phỏng ghi bàn giao thành công nhưng mất phản hồi, thử lại cùng UUID chỉ có một biên bản confirmed đúng nhân viên, check_out_time có giá trị và các hạng mục không hủy đã completed. Tải lại vẫn thấy biên bản; thao tác cho ca đang thực hiện được ẩn khỏi ca hoàn tất.

### Sửa tích hợp trigger lưu trú và xe — 168

Kiểm thử ca lưu trú thật phát hiện `sync_service_logistics` còn yêu cầu quyền ghi bảng quản trị cũ trong khi RPC đã có quyền STAFF, làm tiếp nhận bị `logistics_write_forbidden`. [Migration 168](../../scripts/database/v1/168_staff_logistics_transition.sql) thêm nhánh giới hạn theo `work.service.perform`, nhân viên phụ trách hợp lệ và phạm vi được giao. Chỉ các chuyển trạng thái phục vụ tiếp nhận/hoàn tất được nối; giữ khách, bé, thời gian lịch, số lần thay đổi và thẩm quyền người phụ trách, xe phải đúng tài xế được giao. Điều kiện nullable được `coalesce(...,false)` để không bỏ lọt do null. Không cấp quyền ghi bảng cũ cho STAFF, không sửa các ngoại lệ khách hàng hoặc ràng buộc giờ/phòng vốn có.

Kiểm thử xác nhận người phụ trách null không vượt được guard; ca lưu trú đúng người được tiếp nhận nhưng không bàn giao khi phòng còn checked_in. Sau khi trả phòng mới bàn giao thành công, trạng thái completed/closed đúng. Luồng kiểm thử cuối đã dùng modal Trả phòng bên dưới.

Ca xe đúng tài xế vẫn không được tiếp nhận trước giờ xuất phát. Khi đã đến giờ, tiếp nhận được nhưng bàn giao khứ hồi trước giờ lượt về bị chặn và không ghi biên bản một phần; đến giờ hợp lệ mới hoàn tất cả ca và chuyến. Các mốc thời gian được chuẩn bị trong CSDL thử nghiệm, không thay lịch Cloud. [Khôi phục 168](../../scripts/database/v1/168_staff_logistics_transition.rollback.sql) đã đối chiếu MD5 trigger khớp nguyên bản, sau đó tiếp tục thử khôi phục 167 và 166.

Lần kiểm thử bàn giao đạt 105 nhóm; lần bổ sung Trả phòng đạt 115 nhóm. Đã dọn CSDL/container bản sao và một tài nguyên chạy bị dừng giữa chừng sau khi xác minh marker sở hữu; giữ CSDL rà soát chính. Các migration 166/167/168/169 chưa áp dụng lên CSDL rà soát chính hoặc Cloud; khi triển khai cần 165 → 166 → 167 → 168 → 169, khôi phục theo chiều ngược lại.

## Trả phòng

Người dùng nghiệm thu Biên bản bàn giao: “Đồng ý, tiếp tục”. Modal Trả phòng đọc mới ca, khách, bé, phòng, lịch nhận/trả và đơn giá đã chốt. Không có trường sửa giá hoặc phân công. Chỉ nhân viên phụ trách ca đang thực hiện, phòng checked_in mới được xác nhận. Gửi phiên bản ca qua `close_admin_hotel_stay`; sai phiên bản, phân lại ca, chỉ được giao hạng mục nhưng không phụ trách, dữ liệu ngoài phạm vi hoặc lỗi đọc đều bị chặn.

[Migration 169](../../scripts/database/v1/169_staff_hotel_checkout_context.sql) chỉ bổ sung đơn giá/tên phòng/loại phòng/người phụ trách vào phép chiếu hotel_stays hiện có, giữ điều kiện phạm vi. Đã thử [khôi phục](../../scripts/database/v1/169_staff_hotel_checkout_context.rollback.sql) và đối chiếu MD5 khớp định nghĩa workspace trước khi áp dụng.

RPC đóng phòng không có UUID yêu cầu. Khi mất phản hồi, giao diện đọc trạng thái lưu trú thật trong phạm vi và đối chiếu đúng lượt/phòng/người phụ trách; đã đóng thì tải lại hồ sơ, không gửi lần đóng thứ hai. Kiểm thử xác nhận đúng một audit, giá và thông tin đặt phòng giữ nguyên, hạng mục/thanh toán giữ nguyên, ca vẫn đang thực hiện và chưa ghi check_out_time. Phòng đã trả nhận được đặt chỗ mới trong khoảng lịch cũ. Tải lại hoặc mở lại phòng đã trả không cho đóng thêm. Đã xem ảnh máy tính/điện thoại, kiểm tra bốn cách đóng, tiêu điểm và không tràn ngang. Người dùng yêu cầu “tiếp tục” sau ảnh; chuyển sang Tạo đơn tại quầy.

## Tạo đơn tại quầy

Người dùng yêu cầu tiếp tục sau Trả phòng. Module `admin-staff-sales.js` mở từ danh sách Đơn hàng dành cho Nhân viên, không nạp phân hệ quản trị. Khách và sản phẩm dùng autocomplete chữ thuần, hỗ trợ bàn phím và phân trang; chọn khách điền SĐT chỉ đọc, bỏ chọn xóa SĐT. Chọn sản phẩm cùng biến thể tăng số lượng trong một dòng; có đổi số lượng và xóa sản phẩm. Không có ô sửa đơn giá, phân công hoặc hoàn tiền. Modal này chỉ tạo đơn nhận tại quầy; giao hàng và thu tiền chưa được nối trong luồng Nhân viên.

Giá, tồn có thể bán và các ưu đãi Không áp dụng/Theo hạng/Mã ưu đãi/Quy đổi điểm do `quote_admin_sales_order` tính. Bản tính thay đổi khi đổi khách, giỏ, ưu đãi hoặc ghi chú; không cho tạo khi thiếu bản tính hợp lệ. Ghi qua `create_admin_sales_order` với version của bản tính và UUID giữ nguyên cho cùng nội dung khi thử lại. Máy chủ kiểm tra lại giá/tồn/ưu đãi trong giao dịch; bản tính cũ bị từ chối, giữ nội dung nhập để kiểm tra. Chưa cần migration mới, dùng các RPC đã được nối quyền cố định ở 165 và phép chiếu stock có phạm vi.

Kiểm thử xác nhận gộp cùng biến thể, tự điền/xóa SĐT đúng khách; số lượng 0 không gửi bản tính và vượt tồn bị CSDL từ chối; ưu đãi theo hạng lấy đúng cấu hình thực. Mã không hợp lệ và điểm vượt số dư không tạo được bản tính. Đổi giá sau báo giá làm tạo đơn bị PT409, không tạo đơn/giữ hàng một phần và giữ bản nháp. Lần đầu kiểm tra điểm thiếu cấu hình quy đổi trong dữ liệu thử nghiệm; đã bổ sung cấu hình vào fixture CSDL riêng rồi chạy lại toàn bộ, không sửa cấu hình Cloud.

Mô phỏng mất phản hồi sau ghi thật rồi thử lại cùng UUID: chỉ có một đơn pending đúng khách, một dòng số lượng 2 × 110.000 đ, giảm theo hạng 22.000 đ, đúng một giữ chỗ số lượng 2 và một audit đúng người thực hiện; không có payment. Tải lại vẫn thấy sản phẩm, đơn sau chỉ được báo tồn bán sau khi trừ giữ chỗ. Đã xem ảnh máy tính, đầu/cuối form điện thoại; không tràn ngang, cuộn được đến footer, Enter không tự tạo đơn, tiêu điểm và bốn cách đóng đều đạt. Tổng 126 nhóm PASS, dấu kiểm nguồn khớp và tài nguyên bản sao đã dọn. Chưa coi modal này đã được người dùng nghiệm thu.

Người dùng đã nghiệm thu modal Tạo đơn tại quầy: “Đồng ý, tiếp tục”.

## Thu tiền đơn hàng

Người dùng nghiệm thu Tạo đơn tại quầy: “Đồng ý, tiếp tục”. Đã nối module `admin-staff-cashier.js` từ hồ sơ đơn. Dùng `get_admin_sales_cashier` để đọc tổng tiền, đã thu sau hoàn, số còn phải thu, lịch sử và phương thức hợp lệ; ghi qua `post_admin_sales_money` chỉ với action collect. Không có thao tác hoàn tiền, sửa giá hoặc sửa bảng thanh toán trực tiếp.

Phương thức dùng autocomplete chữ thuần; tiền mặt có thể chọn sẵn nếu thực sự được phép trong CSDL. Chuyển khoản/VietQR yêu cầu mã giao dịch đã đối soát. Số tiền nguyên dương không vượt số dư, nội dung thu tiền và checkbox thực nhận bắt buộc; thay đổi thông tin sẽ bỏ xác nhận. Lịch sử phân trang 10 giao dịch. Đơn đã thu đủ, bị hủy/trả hàng, không có phương thức hợp lệ hoặc không đọc đủ dữ liệu không được ghi thêm.

Giữ phiên bản trạng thái và UUID của yêu cầu. Kết quả mạng chưa rõ được đối chiếu đúng ID khoản thu, đơn, số tiền, phương thức và trạng thái succeeded trong CSDL. Nếu chưa đối chiếu được thì khóa nội dung, giữ nguyên yêu cầu khi thử lại và khi đóng/mở lại trong cùng phiên; không tự tạo khoản mới. Lỗi kiểm tra nghiệp vụ yêu cầu đóng/mở lại để đọc dữ liệu mới. Chưa nghiệm thu modal này.

Kiểm thử mới gồm thiếu lý do/xác nhận, vượt số dư, thiếu mã ngân hàng; sửa tiền bỏ chọn xác nhận. Lỗi mạng trước ghi giữ nguyên UUID khi thử lại và chỉ có một khoản chuyển khoản 20.000 đ. Mã ngân hàng trùng, phiên bản cũ và phương thức bị tắt sau mở form đều bị CSDL từ chối, không thêm payment. Mất phản hồi sau ghi khoản tiền mặt 50.000 đ được đối chiếu bằng payment thật với một lần ghi và audit đúng nhân viên; dòng hàng, đơn giá, sổ kho và hàng giữ chỗ giữ nguyên. Nếu cả phản hồi ghi và đối chiếu bị mất, đóng/mở lại vẫn tìm đúng khoản cũ thay vì gửi khoản mới. Thu số còn lại đưa tổng payment thành công về đúng 198.000 đ; tải lại đơn thu đủ không được thu thêm. Payload refund của STAFF bị 42501, không tạo refund_transaction. Lỗi tải và ID đơn không tồn tại không giữ dữ liệu modal trước hoặc bật lưu.

Đã sửa sự kiện bỏ chọn phương thức làm popover vừa mở bị đóng; chạy lại toàn bộ đạt 140 nhóm. Đã xem ảnh máy tính và đầu/cuối form điện thoại: nền trắng, trường không tràn ngang, lịch sử và nút lưu tiếp cận được. Enter không tự ghi giao dịch, giữ tiêu điểm và bốn cách đóng đạt. Dấu kiểm mã nguồn khớp, cú pháp JavaScript và `git diff --check` đạt; bản sao CSDL/container đã dọn. Không cần migration mới cho modal này, CSDL rà soát chính/Cloud chưa thay đổi.

## Thu tiền ca dịch vụ

Người dùng nghiệm thu Thu tiền đơn hàng: “Đồng ý, tiếp tục”. Module riêng `admin-staff-service-cashier.js` mở từ hồ sơ ca được giao, dùng `get_admin_service_cashier` và `post_admin_service_money` với action collect. Bộ quyền và phạm vi theo 165 đã có, không cần migration mới. Giữ giao diện modal trắng, góc 9px, chữ thuần, dấu sao đỏ, phương thức autocomplete và bốn cách đóng như modal thu tiền đã nghiệm thu.

Đọc mới tổng tiền, đã thu sau hoàn, số còn phải thu, phương thức hợp lệ và lịch sử thanh toán của ca. Số tiền/nội dung/xác nhận thực nhận bắt buộc; chuyển khoản cần mã đã đối soát. Mỗi thay đổi bỏ xác nhận. Không có sửa giá, duyệt điều chỉnh hoặc hoàn tiền. CSDL kiểm tra lại phạm vi phân công, phiên bản ca và điều chỉnh chờ duyệt/khách chưa xác nhận trước khi ghi; lỗi bị chặn và yêu cầu mở lại để đối chiếu.

Khoản thu dùng UUID và phiên bản trạng thái; phản hồi mạng chưa rõ được đối chiếu đúng payment ID, appointment_id, số tiền, phương thức và succeeded. Nếu chưa xác minh được, khóa nội dung và giữ nguyên yêu cầu để thử lại. Ca hủy/vắng mặt, thu đủ, không có phương thức hoặc lỗi đọc bị khóa lưu. Chưa nghiệm thu modal này.

Kiểm thử xác nhận không gọi RPC tiền bán hàng; số tiền vượt số dư hoặc thiếu xác nhận không gửi ghi. Bản ca cũ bị PT409. Cả điều chỉnh pending và approved nhưng khách chưa xác nhận đều chặn thu, không thêm payment. Phân lại ca cùng hạng mục khi form đang mở khiến ghi bị 42501; mở lại cũng không đọc được số dư. Ca người khác và lỗi tải không hiển thị dữ liệu cũ hoặc bật lưu.

Phương thức chỉ có ba giá trị hợp lệ từ CSDL, hỗ trợ bàn phím/Escape; mã ngân hàng đã dùng ở đơn bán hàng bị từ chối cho ca dịch vụ. Mất phản hồi sau ghi 20.000 đ chỉ có một payment loại service_collection, đúng appointment_id, order_id null và một audit đúng nhân viên; toàn bộ ca ngoại trừ updated_at, hạng mục và biên bản đã ký giữ nguyên. Lỗi trước ghi khoản 10.000 đ giữ cùng UUID khi thử lại và chỉ thêm một khoản. Tải lại lịch sử/số dư khớp; thu đủ phần còn lại đưa tổng thu về đúng 300.000 đ và không đổi trạng thái completed. Yêu cầu refund giả mạo bị 42501, không có refund_transaction.

Đã sửa bộ chọn kiểm thử để phân biệt thông báo cùng nội dung trong hai modal, chạy lại toàn bộ đạt 153 nhóm. Đã xem ảnh máy tính và đầu/cuối form điện thoại; không tràn ngang, footer cuộn tới được, Enter không tự ghi tiền, giữ tiêu điểm và bốn cách đóng đạt. Dấu kiểm nguồn khớp mã hiện tại, kiểm tra cú pháp và `git diff --check` đạt; bản sao CSDL/container đã dọn. Chưa kiểm thử Auth đăng nhập thực hoặc Realtime, chưa đổi Cloud và chưa push.

## Trao đổi khiếu nại

Người dùng nghiệm thu Thu tiền ca dịch vụ: “Đồng ý, tiếp tục”. Modal `admin-staff-complaint-message.js` mở từ hồ sơ phiếu được giao, đọc mới qua `get_staff_workspace` rồi ghi bằng `act_admin_complaint`. Mặc định Ghi chú nội bộ; chọn Phản hồi khách sẽ lưu message không nội bộ; Yêu cầu bổ sung ghi nhận kênh đã liên hệ và chuyển phiếu sang waiting_customer. Kênh tại quầy/điện thoại/Zalo/email/SMS chỉ ghi nhận nghiệp vụ, không tự gửi tin hoặc gọi dịch vụ ngoài.

Chỉ hiển thị ba hình thức trao đổi; không có duyệt bồi hoàn, kết thúc/đóng/mở lại hoặc phân công. Phiếu chờ Quản lý duyệt không chọn được Yêu cầu bổ sung; CSDL vẫn kiểm tra action/trạng thái/phân công khi ghi. Phiếu kết thúc hoặc không đọc được không bật lưu. Lưu phiên bản phiếu và UUID; nếu chưa rõ kết quả thì khóa nội dung, giữ nguyên yêu cầu khi thử lại và đóng/mở lại trong phiên. Không suy đoán thành công chỉ vì thấy nội dung giống nhau trong lịch sử.

Lịch sử có phân trang 10 dòng, nhãn Nội bộ/Trao đổi với khách; mã kênh trong tiền tố hệ thống được trình bày bằng tiếng Việt. Chưa cần migration mới; dùng guard/phạm vi đã có ở 165. Chưa nghiệm thu modal.

Kiểm thử lịch sử 13 dòng thật qua hai trang 10/3; nội dung ngắn không gửi ghi. Ghi chú nội bộ lưu is_internal true, đúng auth.uid() và không đặt first_response_at; phản hồi khách lưu false và đặt thời điểm phản hồi đầu tiên. Bản phiếu cũ bị PT409 và giữ bản nháp. Phân lại phiếu khi form mở chặn ghi; mở lại hoặc dùng ID phiếu người khác không đọc được bối cảnh. Mất phản hồi sau ghi rồi đóng/mở lại và thử lại cùng UUID chỉ có một message và một COMPLAINT_ACTION audit đúng nhân viên.

Yêu cầu bổ sung qua điện thoại lưu bằng chứng nội bộ, đổi sang waiting_customer, tải lại vẫn đúng và tiền tố kênh hiển thị tiếng Việt. Phiếu waiting_manager_approval vẫn lưu ghi chú nhưng không cho chuyển sang yêu cầu bổ sung, kể cả sửa DOM để cố gửi. Các action approve/resolve/close/complete/reopen/link_source của STAFF đều bị 42501, không có hoàn tiền phát sinh. Phiếu closed không có nút Trao đổi và mở trực tiếp không bật lưu. Lỗi tải xóa bối cảnh cũ, không cho lưu. Quy tắc đọc khách hiện có tại migration 073 lọc NOT is_internal; lần này đối chiếu cờ lưu thật, chưa chạy đăng nhập khách qua Auth thực.

Đã xem ảnh phản hồi/yêu cầu bổ sung trên máy tính và điện thoại; không tràn ngang, nút lưu tiếp cận được. Giữ tiêu điểm, bốn cách đóng và Enter chỉ xuống dòng trong nội dung đều đạt. Tổng 167 nhóm PASS, dấu kiểm nguồn khớp, cú pháp JavaScript và `git diff --check` đạt; CSDL/container thử nghiệm đã dọn. Cloud và CSDL rà soát chính chưa thay đổi; chưa push.

## Đề xuất phương án xử lý

Người dùng nghiệm thu Trao đổi khiếu nại: “Đồng ý, tiếp tục”. Modal riêng `admin-staff-complaint-proposal.js` dùng action propose của `act_admin_complaint`, không gọi approve/resolve hoặc công cụ bồi hoàn. Phiếu dịch vụ có Hoàn tiền/Thực hiện lại dịch vụ/Đổi nhân viên; phiếu bán hàng có Hoàn tiền/Nhận hàng trả và hoàn tiền/Đổi hàng. Chỉ phương án hoàn tiền hiện số tiền đề xuất nguyên dương; các phương án khác gửi 0, đổi phương án xóa số tiền cũ. Lý do nhập tự do, bắt buộc. Không tự đặt trần theo tiền đã thu cho bước đề xuất; Quản lý xét duyệt, nghiệp vụ hoàn tiền thực tế tiếp tục chịu ràng buộc số dư ở RPC thu ngân hiện có.

[Migration 170](../../scripts/database/v1/170_staff_complaint_proposal_context.sql) chỉ bổ sung liên kết giao dịch và kết quả xử lý vào phép chiếu phiếu được giao trong `get_staff_workspace`. Mã giao dịch chỉ trả khi khớp khách của phiếu. Không cấp quyền bảng nguồn hoặc quyền phê duyệt. Giao diện khóa khi thiếu liên kết hợp lệ, phiếu kết thúc/chờ duyệt hoặc lỗi đọc; giữ phiên bản/UUID và nội dung chưa rõ kết quả khi thử lại, kể cả đóng/mở lại. Chưa nghiệm thu modal.

Kiểm thử xác nhận ba lựa chọn đúng cho mỗi loại giao dịch, số tiền/lý do sai không gửi ghi, đổi phương án xóa tiền cũ và phương án không tiền gửi 0 dù sửa ô ẩn. Bản cũ bị PT409, phân lại phiếu chặn đọc/ghi; phiếu không liên kết hoặc người khác không nhận phương án. Ràng buộc CSDL hiện có từ chối tạo phiếu gắn đơn của khách khác, không tắt trigger để nạp dữ liệu sai. Phương án đổi hàng trên phiếu dịch vụ bị chặn cả giao diện và RPC.

Mất phản hồi sau ghi đề xuất hoàn tiền 10.000 đ rồi đóng/mở lại/thử lại chỉ có một message nội bộ và một audit đúng nhân viên, giữ source_staff_id, approved_amount và resolved_by vẫn null. Tải lại hiển thị Chưa duyệt và không cho gửi thêm khi đang chờ duyệt. Các phương án đổi hàng, thực hiện lại dịch vụ, đổi nhân viên và nhận hàng trả/hoàn tiền đều lưu trạng thái waiting_manager_approval. Lỗi mạng trước ghi vẫn thử lại cùng UUID. Đối chiếu toàn bộ payment/refund_transaction/inventory_transaction/return_request và phân công ca trước/sau không đổi; đề xuất chưa thực thi nghiệp vụ bồi hoàn.

Đã xem ảnh dịch vụ/bán hàng trên máy tính và ảnh điện thoại; không tràn ngang, nút lưu tiếp cận được. Enter không tự gửi, bốn cách đóng và giữ tiêu điểm đạt. Bộ kiểm thử cuối 180 nhóm PASS, dấu kiểm nguồn khớp, cú pháp và `git diff --check` đạt. [Khôi phục 170](../../scripts/database/v1/170_staff_complaint_proposal_context.rollback.sql) trả đúng MD5 định nghĩa trước áp dụng, sau đó khôi phục 169/168/167/166 và dọn CSDL/container bản sao. CSDL rà soát chính vẫn 165, Cloud chưa đổi. Triển khai mã hiện tại cần 165 → 166 → 167 → 168 → 169 → 170; khôi phục theo chiều ngược lại.

## Tạo khiếu nại

Người dùng nghiệm thu Đề xuất phương án xử lý: “Đồng ý, tiếp tục”. Modal `admin-staff-complaint-create.js` mở từ danh sách Khiếu nại. Chọn khách bằng autocomplete có phân trang, tự điền SĐT chỉ đọc; đổi/bỏ khách xóa nguồn đã chọn. Hai nhóm Dịch vụ/Bán hàng, bốn mức ưu tiên và tiêu đề/nội dung bắt buộc. Giao dịch dùng autocomplete theo khách, nhóm, mã tìm kiếm và phân trang 10 dòng. Muốn tiếp nhận trước khi biết giao dịch phải chọn rõ Chưa xác định giao dịch liên quan, không tự fallback khi tra cứu lỗi.

[Migration 171](../../scripts/database/v1/171_staff_complaint_sources.sql) thêm RPC `get_staff_complaint_sources` chỉ trả mã/trạng thái/thời gian và ID của giao dịch đúng khách; dịch vụ còn phải thuộc phạm vi ca được giao. Không cấp quyền ghi hoặc bảng nguồn. Lưu qua `create_admin_complaint` hiện có, CSDL kiểm tra khách–giao dịch và phạm vi ca. Phiếu mới pending, chưa assigned_staff_id; người tạo không tự nhận quyền xử lý. Nội dung ban đầu là trao đổi hiển thị cho khách theo hợp đồng RPC, form nêu rõ điều này. Thành công báo chờ Quản lý phân công, không điều hướng vào phiếu chưa được giao.

Giữ UUID và toàn bộ nội dung khi kết quả chưa rõ, khóa chỉnh sửa để thử lại cùng yêu cầu kể cả đóng/mở lại; không tự tạo phiếu thứ hai. Chưa nghiệm thu modal.

Kiểm thử xác nhận mặc định nhóm dịch vụ/ưu tiên thông thường; chọn khách điền SĐT, bỏ khách hoặc đổi nhóm xóa giao dịch cũ. Các trường thiếu không gửi ghi; RPC từ chối sai khách hoặc ca ngoài phạm vi, phân lại ca sau chọn cũng bị chặn mà giữ bản nhập. Danh sách nguồn chỉ có ca đúng khách và được giao, không có dữ liệu thu ngân. Lỗi tra cứu không tự bỏ qua nguồn. Dữ liệu 11 đơn thật trong CSDL thử nghiệm được tìm/phân trang 10/1 và chọn trang sau.

Mất phản hồi sau ghi phiếu rồi đóng/mở/thử lại cùng UUID tạo đúng một support_ticket, một message ban đầu không nội bộ và một audit đúng nhân viên. Phiếu pending, assigned_staff_id null; tra theo workspace của người tạo vẫn không đọc được phiếu chưa giao. Tạo theo đơn bán hàng giữ đúng order_id và appointment_id null; lựa chọn chưa xác định giao dịch tạo hai ID nguồn null, không bịa liên kết. RPC nguồn từ chối ẩn danh và nhóm không hợp lệ.

Đã sửa sự kiện click phân trang làm mất phản hồi gợi ý; bổ sung xuống dòng mã đơn dài trong tóm tắt lựa chọn. Đã xem ảnh dịch vụ/bán hàng trên máy tính và điện thoại, không tràn ngang, footer cuộn tới được. Enter không tự gửi, Escape đóng popover trước modal, giữ tiêu điểm và bốn cách đóng đạt. Lần chạy cuối 194 nhóm PASS, dấu kiểm nguồn khớp, cú pháp và `git diff --check` đạt. [Khôi phục 171](../../scripts/database/v1/171_staff_complaint_sources.rollback.sql) chỉ bỏ RPC mới, sau đó khôi phục 170–166 và dọn CSDL/container bản sao. CSDL rà soát chính vẫn 165; Cloud chưa thay đổi. Triển khai mã hiện tại cần 165 → 166 → 167 → 168 → 169 → 170 → 171, khôi phục ngược lại.

## Đổi mật khẩu cá nhân

Người dùng yêu cầu tiếp tục sau ảnh Tạo khiếu nại. Nút Đổi mật khẩu trên header chỉ hiện sau xác minh Quản lý/Nhân viên; mở modal chung `admin-own-password.js`, ba trường che mật khẩu và định danh chỉ đọc. Mật khẩu mới từ 6–128 ký tự theo quy tắc hiện có, khác mật khẩu cũ và nhập lại khớp. Đóng modal hoặc lỗi đều xóa ô mật khẩu; không ghi mật khẩu vào storage hoặc nội dung báo cáo.

Endpoint `/api/admin/staff/change-own-password` dùng `staff-own-password.cjs`: xác minh token và vai trò công vụ, lấy email từ Auth, kiểm tra mật khẩu hiện tại qua đăng nhập thật, xác minh lại quyền bằng phiên vừa đăng nhập rồi cập nhật chính người đó. Không nhận staffId/userId/email đích hoặc service key để thay mật khẩu. Phiên Auth tạm được đăng xuất cục bộ sau xử lý. Luồng bắt buộc đổi lần đầu vẫn tách riêng và không được bỏ qua ở endpoint này.

Sau thành công, trình duyệt dọn phiên cục bộ và chuyển đăng nhập lại. Nếu kết quả mạng chưa rõ, xóa mật khẩu và khóa thử lại mù, yêu cầu đăng nhập để kiểm tra; không cố thử mật khẩu mới như mật khẩu cũ. Chưa nghiệm thu modal.

Bộ kiểm thử dựng GoTrue và PostgREST riêng trỏ vào bản sao có marker, tạo danh tính Auth tổng hợp và gắn với vai trò STAFF cố định. Đăng nhập, đổi mật khẩu và kiểm tra lại đều gọi Auth thật, không giả dữ liệu Auth. Sai mật khẩu hiện tại không đổi mật khẩu; thiếu phiên, truyền ID đích, nhân viên bị khóa hoặc còn must_change_password bị chặn. Mô phỏng Quản lý đổi trạng thái sau khi xác minh mật khẩu: lần kiểm tra quyền thứ hai chặn cập nhật. Sau đổi thành công, mật khẩu cũ bị từ chối, mật khẩu mới đăng nhập được, vai trò và cờ bắt buộc đổi lần đầu không bị sửa.

Mất phản hồi sau cập nhật Auth thật: mật khẩu mới vẫn đăng nhập được, UI xóa ba ô, khóa gửi lại kể cả đóng/mở modal và hướng dẫn đăng nhập để xác minh; chỉ có một yêu cầu cập nhật. Endpoint cũng đổi được cho tài khoản ADMIN đã xác minh, vẫn chỉ dùng phiên tự thân. Đã xem ảnh máy tính/điện thoại; trường không tràn ngang, thông báo lỗi cũ được xóa khi nhập lại, bốn cách đóng xóa mật khẩu, giữ tiêu điểm và Enter không tự cập nhật đạt.

Kết quả cuối: 10 nhóm Auth thật, 194 nhóm hồi quy nghiệp vụ và 6 bài `admin_fixed_roles_api.test.cjs` đều đạt. Dấu kiểm nguồn khớp, kiểm tra cú pháp và `git diff --check` đạt. Tài nguyên Auth/PostgREST/CSDL/env riêng được dọn; không đổi mật khẩu tài khoản thật, không thay Cloud hoặc CSDL rà soát chính. Không cần migration mới; khi triển khai cần đưa endpoint mới lên server cùng giao diện. Chưa kiểm thử toàn bộ nghiệp vụ bằng Auth thực hoặc Realtime/PQ tổng hợp.

## Rà soát tích hợp và bổ sung hội thoại

Người dùng nghiệm thu Đổi mật khẩu cá nhân: “Đồng ý, tiếp tục”. Đã đối chiếu với thiết kế giai đoạn 1 và lập [báo cáo khoảng trống](PAWPAL_GIAI_DOAN_3_RASOAT_TICH_HOP.md). Giai đoạn 3 chưa hoàn tất: trước rà soát chat chỉ có xem/trả lời; Pawpoint/hạng, chứng từ, thông báo mời đón bé và một số điểm nối vẫn thiếu.

Đã nối tab Chờ tiếp nhận đúng hash và tải lại; danh sách chỉ có ID/thời gian/trạng thái/phiên bản, không lấy nguyên văn trước nhận. Cạnh tranh hai STAFF thật chỉ một người nhận được. Bản hàng chờ cũ bị chặn, mất phản hồi sau nhận được đối chiếu từ biên nhận để mở đúng ca mới giao. Ghi chú nội bộ cập nhật đúng internal_note và không tạo message cho khách; tin nhắn phân trang 10 dòng, không trả raw_content. Mất phản hồi sau trả lời chỉ có một message.

Modal Kết thúc hội thoại chọn kết quả, xác nhận hoàn tất không chọn sẵn, ghi chú tự do; lời mời khảo sát mặc định tắt. Bản cũ, phân lại người hoặc ca khác không kết thúc được. [Migration 172](../../scripts/database/v1/172_staff_chat_completion.sql) thêm phiên bản hàng chờ và `get_staff_chat_receipt` chỉ tìm UUID audit của chính người gọi, trả request/conversation/operation; không cấp quyền nhật ký thô hoặc nới guard ghi. Biên nhận cho phép xác nhận thao tác đã commit sau khi resolve xóa assigned_staff_id, tránh thử lại mù bị guard chặn.

Kiểm thử mất phản hồi sau kết thúc: chỉ một request ghi, một audit đúng nhân viên và một lời mời khảo sát khi chủ động chọn; ca resolved, không còn assigned_staff_id và không đọc nguyên văn qua đường dẫn cũ. Biên nhận người khác trả null, ẩn danh bị chặn. Đã xem ảnh máy tính/điện thoại, trường không tràn ngang, bốn cách đóng/tiêu điểm/Enter đạt; modal đã được người dùng nghiệm thu: “Đồng ý, tiếp tục”.

Rà soát còn phát hiện nhánh lỗi xác minh quyền chưa gọi dọn module Tạo lịch hẹn. Đã nối closeAll; thử lỗi xác minh trong lúc form có khách/SĐT sẽ đóng modal, xóa dữ liệu và ẩn thao tác tài khoản. Lần chạy cuối 219 nhóm hồi quy và 10 nhóm Auth thực đều đạt, dấu kiểm nguồn khớp. [Khôi phục 172](../../scripts/database/v1/172_staff_chat_completion.rollback.sql) bỏ receipt và trả đúng MD5 workspace trước thay đổi, tiếp tục khôi phục 171–166 và dọn toàn bộ bản sao. CSDL chính/Cloud chưa đổi; thứ tự triển khai hiện tại là 165 → 166 → 167 → 168 → 169 → 170 → 171 → 172.

## Bổ sung: Mời đón bé

Người dùng đã nghiệm thu Kết thúc hội thoại: “Đồng ý, tiếp tục”. Modal Mời đón bé dành cho Nhân viên mở từ hồ sơ ca đang thực hiện hoặc hoàn thành, nạp khách và bé qua `get_staff_workspace` theo phạm vi. Hiển thị mã lịch, khách, bé; nội dung tự do tối đa 4000 ký tự và xác nhận bé sẵn sàng bắt buộc, mặc định chưa tích. Sửa nội dung sẽ bỏ xác nhận để người dùng kiểm tra lại.

Gửi qua `save_admin_pickup_notification` hiện có, chỉ tạo thông báo vào tài khoản PawPal của đúng khách gắn ca. Không thêm migration, quyền đọc bảng thông báo hoặc kênh SMS/Zalo. CSDL tiếp tục kiểm tra phân công, phiên bản ca, trạng thái, biên bản tiếp nhận mới nhất được xác nhận và điều chỉnh dịch vụ đã xử lý đủ điều kiện.

Nếu chưa xác nhận kết quả gửi, giữ nguyên UUID và khóa nội dung, yêu cầu xác nhận lại trước khi thử cùng thông báo; giữ cả khi đóng/mở modal trong cùng phiên trang. Bản ghi và audit được RPC xử lý cùng giao dịch, không đoán thành công từ dữ liệu phía trình duyệt. Đóng modal, chuyển trang hoặc lỗi xác minh quyền xóa thông tin hiển thị. Hỗ trợ bốn cách đóng và giữ tiêu điểm bàn phím; form không tự gửi khi nhấn Enter.

Ảnh máy tính/điện thoại đã được xem; modal chờ nghiệm thu. Kết quả cuối: 219 nhóm hồi quy và 10 nhóm Auth thực PASS, dấu kiểm nguồn khớp và tài nguyên bản sao đã dọn. Riêng Mời đón bé có 11 nhóm kiểm tra: nhập liệu/xác nhận, sửa nội dung bỏ xác nhận, giao diện/bốn cách đóng/tiêu điểm, bản cũ, phân lại ca, ca khác/lỗi đọc, xác nhận tiếp nhận mới nhất, hai trạng thái điều chỉnh bị chặn, mất phản hồi thử lại cùng UUID qua đóng/mở và dọn khi xác minh quyền thất bại. Chỉ một thông báo nội bộ đúng khách và một audit đúng nhân viên được tạo khi thử lại phản hồi bị mất; không gửi ra kênh ngoài. Việc chuẩn bị dữ liệu test tạo phiên bản tiếp nhận mới kế tiếp, giữ nguyên bản đã xác nhận; không tắt trigger bảo vệ. Phông chữ/icon từ CDN trong bộ test được giới hạn thời gian tải để lỗi mạng tài nguyên phụ không làm treo kiểm tra nghiệp vụ; không thay dữ liệu nghiệp vụ bằng dữ liệu giả trên giao diện.

## Bổ sung: hạng, Pawpoint và ghi chú khách hàng

Người dùng đã nghiệm thu Mời đón bé: “Đồng ý, tiếp tục”. Hồ sơ khách hiển thị hạng thành viên, số Pawpoint và ghi chú nội bộ. Migration 173 thêm `get_staff_customer_context` chỉ nhận một mã khách bắt buộc, trả mã/tên khách, phiên bản hồ sơ, ghi chú, tên hạng và tổng điểm hiện tại. Không trả chi tiêu, danh sách giao dịch điểm, Auth hoặc dữ liệu toàn cửa hàng; không cấp quyền đọc bảng hoặc thay đổi bộ quyền cố định.

Modal Ghi chú khách hàng có tên/mã khách và ô ghi chú tự do tối đa 10000 ký tự. Nạp dữ liệu mới khi mở, cho phép để trống để xóa ghi chú, lưu qua `save_customer_note` hiện có với phiên bản khách. Không có điều khiển sửa hạng, điểm hoặc tài khoản. Xung đột giữ bản nháp; lỗi chưa rõ kết quả khóa lưu, yêu cầu mở lại để đọc dữ liệu thật trước khi lưu tiếp. Không tự gửi lại thao tác không có UUID. Đóng, đổi trang và lỗi xác minh quyền dọn thông tin hiển thị.

Kết quả cuối trên CSDL bản sao: 231 nhóm hồi quy và 10 nhóm Auth thực PASS, dấu kiểm nguồn khớp và tài nguyên đã dọn. Đã kiểm tra dữ liệu đọc đúng bảy trường cho một khách, không nhận ID null/ẩn danh, khách không tồn tại trả null; hạng và điểm đối chiếu CSDL. Lưu ghi chú không đổi tài khoản, hạng, điểm hoặc trường khách khác; chuỗi có thẻ script hiển thị chữ thuần, không chạy mã. Xóa ghi chú lưu null. Bản cũ bị từ chối và giữ bản nháp; mất phản hồi sau ghi thật khóa thử lại, mở lại thấy nội dung đã lưu với chỉ một yêu cầu ghi. Lỗi đọc xóa dữ liệu cũ; ngừng hoạt động nhân viên chặn đọc/ghi, lỗi xác minh đóng và dọn modal. Đã xem ảnh máy tính/điện thoại, không tràn ngang, giữ tiêu điểm và bốn cách đóng đạt.

Migration 173 chỉ thêm RPC đọc; đã kiểm tra khôi phục bằng cách bỏ đúng RPC đó trước khi khôi phục 172–166, không thay định nghĩa workspace hoặc RPC ghi hiện có. Chuỗi triển khai hiện tại là 165 → 166 → 167 → 168 → 169 → 170 → 171 → 172 → 173. Cloud và CSDL chính chưa áp dụng các bổ sung này. Modal Ghi chú khách hàng chờ người dùng nghiệm thu.

## Bổ sung: Phiếu bán hàng

Người dùng tiếp tục sau modal Ghi chú khách hàng. Đã nối Phiếu bán hàng từ hồ sơ một đơn được xem, với migration/khôi phục 174 thêm RPC đọc tối thiểu `get_staff_sales_receipt(uuid)`. RPC xác minh nhân viên hoạt động và quyền thu ngân, bắt buộc đúng một mã đơn, đọc ảnh chụp tên/SKU/giá/giảm giá đã chốt; tổng đơn lấy từ `sales_order_totals`. Chỉ trả số đã thu sau hoàn, đã hoàn và còn phải thu của đơn, không trả dòng thanh toán thô, giá vốn, Auth hay tổng hợp cửa hàng. Giới hạn xem đơn tương ứng với đường đọc đơn của STAFF đã chốt ở giai đoạn 1.

Modal chỉ đọc, phân trang tối đa 10 sản phẩm, bảng cuộn ngang trên điện thoại, nền trắng và góc 9px. In phiếu phải gọi lại RPC để xác minh quyền và lấy dữ liệu mới; bản in gồm toàn bộ sản phẩm của đúng đơn, độc lập với trang đang xem. Nội dung người dùng được dựng bằng nút DOM/chữ thuần. Không có xuất danh sách/Excel hoặc nút hủy/hoàn tiền. Đóng, đổi trang hay lỗi xác minh dọn nội dung và khung in. Nếu đọc mới trước khi in thất bại thì không dùng bản xem trước để in.

Kết quả cuối trên môi trường CSDL riêng: 241 nhóm hồi quy và 10 nhóm Auth thực PASS; dấu kiểm nguồn khớp và tài nguyên đã dọn. Riêng phiếu có 10 nhóm kiểm tra gồm dữ liệu tối thiểu/tổng tiền đúng, ảnh hai kích thước, bốn cách đóng/tiêu điểm, mã null/ẩn danh/đơn không tồn tại, 12 sản phẩm phân trang 10/2, in dữ liệu mới và đủ 12 dòng, lỗi đọc chặn in, thu hồi hoạt động chặn in, lỗi xác minh dọn nội dung và khôi phục 174. Mã HTML trong tên sản phẩm được in như chữ, không thực thi; đơn, sản phẩm và khoản thu không đổi do xem/in. Kiểm thử đã phát hiện và sửa việc trả tiêu điểm về nút In phiếu sau sự kiện `afterprint`; khung in được dọn khi kết thúc hộp thoại in hoặc đóng modal.

Kiểm tra chức năng in bằng cách bắt lời gọi hộp thoại in, kiểm tra DOM bản in và phát sự kiện kết thúc in trong trình duyệt; không gửi giấy đến máy in thật, chưa nghiệm thu thiết bị in hoặc bố cục từng trang giấy. Đã xem ảnh máy tính/điện thoại. Chưa triển khai Cloud hoặc áp dụng 174 lên CSDL chính. Chuỗi triển khai hiện tại là 165 → 166 → 167 → 168 → 169 → 170 → 171 → 172 → 173 → 174, khôi phục ngược thứ tự. Nghiệm thu Phiếu bán hàng trước khi chuyển sang phiếu ca dịch vụ.

## Bổ sung: Phiếu ca dịch vụ

Người dùng đã nghiệm thu Phiếu bán hàng: “Đồng ý, tiếp tục”. Đã nối modal Phiếu ca dịch vụ từ hồ sơ ca được giao, chỉ đọc và in. Migration/khôi phục 175 thêm `get_staff_service_receipt(uuid)` với phạm vi `work_owns_appointment` giống thu ngân ca: nhân viên hoạt động và có quyền thu ngân; mã ca bắt buộc; ca không được giao bị từ chối. Không thay quyền hoặc RPC ghi hiện có.

Phiếu gồm mã ca, lịch bắt đầu, khách/SĐT/bé cưng, toàn bộ hạng mục tính tiền của ca, giảm trên hạng mục, điều chỉnh đã được duyệt và khách xác nhận, ưu đãi, tổng tiền, đã thu sau hoàn, đã hoàn và còn phải thu. Không trả người thực hiện, ghi chú nội bộ của hạng mục, thông tin sức khỏe, bảng thanh toán thô hoặc báo cáo toàn cửa hàng. Hạng mục đã hủy bị loại khỏi danh sách và phép tính; tổng ca lấy từ `appointment_totals`.

Xem tối đa 10 hạng mục/trang; bản in lấy toàn bộ hạng mục tính tiền sau một lần đọc mới để kiểm tra lại quyền và số tiền. Khung in riêng, dựng chữ thuần, dọn sau `afterprint` và trả tiêu điểm về In phiếu; đóng/đổi trang/lỗi xác minh dọn dữ liệu. Lỗi đọc trước khi in không dùng bản xem cũ.

Kết quả mới nhất: 252 nhóm hồi quy và 10 nhóm Auth thực PASS, dấu kiểm nguồn khớp và bản sao đã dọn. Riêng phiếu ca có 11 nhóm kiểm tra: projection tối thiểu/tổng thu đúng, ảnh hai kích thước, bốn cách đóng/tiêu điểm, ca khác/null/ẩn danh, phân trang 10 hạng mục, hạng mục hủy bị loại và điều chỉnh dương/âm chỉ tính khi duyệt và xác nhận đủ, in dữ liệu mới/đủ dòng/chữ thuần/không ghi nghiệp vụ, lỗi đọc chặn in, phân lại ca chặn in, lỗi xác minh dọn dữ liệu và khôi phục 175. Dữ liệu bản sao gồm 14 hạng mục tính tiền và một hạng mục hủy; bản in đủ 14 dòng, không có hạng mục hủy. Điều chỉnh đã xác nhận mới là +12.345 và -500, số điều chỉnh trên bản in đọc mới là 11.845 đ; khoản chờ duyệt 11.111 và chưa xác nhận 22.222 không được tính. Ca, giá/hạng mục, khoản thu và biên bản đã xác nhận không đổi do xem/in. Đã xem ảnh máy tính/điện thoại và cuối form.

Chức năng in được kiểm tra qua lời gọi in, DOM bản in và sự kiện kết thúc in trong trình duyệt; chưa nghiệm thu thiết bị in hoặc từng trang giấy. Chuỗi triển khai hiện tại là 165 → 166 → 167 → 168 → 169 → 170 → 171 → 172 → 173 → 174 → 175, khôi phục ngược thứ tự. Chưa áp dụng bổ sung lên Cloud/CSDL chính hoặc push. Modal Phiếu ca dịch vụ chờ người dùng nghiệm thu.

## Rà soát dùng chung JS: Nhật ký chăm sóc

Sau khi dọn thư mục, người dùng yêu cầu xem lại việc tách JS theo vai trò. Đã đối chiếu Nhật ký chăm sóc: Quản lý dùng form sẵn có trong `tab-service-detail.js`, được chọn người thực hiện và xóa; Nhân viên dùng form đã nghiệm thu, chỉ ghi/sửa nhật ký của mình. Các đường đọc và cập nhật giao diện sau lưu khác nhau nên chưa gộp hai form hoặc nạp bộ dữ liệu Quản lý cho Nhân viên.

Ở bước đầu, Nhật ký chăm sóc được chuyển sang file dùng chung; sau yêu cầu làm rõ, mã này đã được gộp vào [services.js](../../pages/admin/modules/services/services.js), vẫn cung cấp `PawpalCareLog.save` dùng chung cho hai vai trò. `PawpalServices.saveCareLog` giữ UUID, khóa thao tác, phiên bản và làm mới hồ sơ hiện có nhưng gọi hàm chung thay đoạn RPC trùng. Form Nhân viên cũng gọi cùng hàm; kiểm tra phạm vi, quyền, ghi nhận người thực hiện và xóa vẫn do CSDL quyết định. Đường đọc có phạm vi và xử lý mất phản hồi của Nhân viên được giữ nguyên.

Không thêm file thay thế song song hoặc migration; file `staff-workspace/services/admin-staff-care-log.js` đã được chuyển, không còn được tải. Đã cập nhật workspace, dọn phiên, đường dẫn kiểm thử và phiên bản bộ nhớ đệm của script. Bảng chuyển 19 file ở đợt dọn thư mục là bằng chứng lịch sử trước thay đổi này.

Kết quả cuối: 255 nhóm hồi quy và 10 nhóm Auth thực PASS, mã băm nguồn khớp và tài nguyên bản sao đã dọn. Kiểm tra mới gọi hàm chung qua JWT ký cục bộ của Quản lý trên CSDL riêng: lưu với người thực hiện được chọn nhưng audit giữ đúng Quản lý, xóa với phiên bản ca/nhật ký hiện tại; cùng hàm với quyền STAFF thì thao tác xóa bị chặn 42501 và không đổi nhật ký. Các kiểm tra tạo/sửa của Nhân viên, phiên bản cũ, đồng nghiệp, phân lại ca và mất phản hồi tiếp tục đạt. Đã xem lại ảnh form Nhân viên. Chưa hợp nhất hàng loạt các module khác, chưa kiểm thử toàn bộ form Quản lý từ đầu đến cuối; kiểm thử Quản lý mới xác nhận hàm dùng chung và ràng buộc CSDL, không thay thế nghiệm thu đầy đủ phân hệ.

## Gộp xử lý vào JS phân hệ theo yêu cầu đã làm rõ

Đã gộp 17 file chức năng vào `customers.js` (khách/địa chỉ/ghi chú), `pets.js` (thêm/sửa thú cưng), `services.js` (lịch, ca, nhật ký, bàn giao, lưu trú, mời đón, thu tiền/phiếu ca), `orders.js` (tạo đơn, thu tiền/phiếu), `complaints.js` (tạo/trao đổi/đề xuất) và `chatbot.js` (kết thúc hội thoại). Đã bỏ các file nguồn rời và thư mục con nghiệp vụ trong `staff-workspace`; không còn `care-log.js` riêng. Gói form khách/thú cưng được tách tại ranh giới hàm đã đối chiếu, giữ các hàm gọi tương thích; 16 phần thân nguồn khác giữ nguyên. Phần thân sáu JS Quản lý giữ nguyên trong cổng khởi tạo ADMIN.

Sau khi xác minh STAFF, `admin.js` tải sáu file một lần trước khi dựng khung công việc. Các file đăng ký nhánh thao tác theo vai trò; phần khởi tạo Quản lý không chạy cho STAFF. Không tải subtab quản trị hoặc chuyển STAFF sang đọc bảng rộng. Giao diện, tham số RPC, phiên bản, UUID và các ràng buộc CSDL giữ nguyên. Đây là gộp mã vào đúng phân hệ; không tuyên bố đã xóa mọi khác biệt hay trùng lặp giữa hai giao diện.

Kiểm thử cuối: 255 nhóm hồi quy và 10 nhóm Auth thực PASS, dấu kiểm nguồn khớp, toàn bộ bản sao đã dọn. Kiểm tra mỗi JS phân hệ tải một lần trên STAFF, các namespace Quản lý và `PawpalOrderV1` không khởi tạo, không tải subtab Quản lý và tất cả yêu cầu dữ liệu của STAFF vẫn là RPC. Các kiểm tra form và phạm vi đang có tiếp tục đạt; kiểm tra hàm Nhật ký chăm sóc bằng quyền Quản lý tiếp tục đạt. Chưa bao phủ toàn bộ luồng giao diện/nghiệp vụ Quản lý; việc gộp không thay nghiệm thu các modal hoặc hoàn tất giai đoạn 3. Bảng chuyển thư mục trước đó là bằng chứng lịch sử, không mô tả vị trí hiện tại.

## Đưa màn hình về phân hệ và bỏ workspace riêng

Đã bỏ toàn bộ thư mục `modules/staff-workspace`, gồm JS, CSS và README. Hồ sơ, cấu hình cột, nút công việc, tác vụ dòng và màn hình hội thoại được đăng ký bởi chính `customers.js`, `pets.js`, `services.js`, `orders.js`, `complaints.js`, `chatbot.js`; hồ sơ/lịch/đánh giá cá nhân đăng ký từ `staff.js`. Nhánh Quản lý trong `staff.js` cũng chỉ khởi tạo sau khi xác minh ADMIN, giống sáu phân hệ còn lại.

`PawpalAdminViews` trong `admin.js` giữ công cụ chung: điều hướng theo vai trò, header, bảng, khối thông tin, phân trang và lời gọi đọc có phạm vi. Mỗi phân hệ cung cấp bộ dựng màn hình/tác vụ của mình; `admin.js` không còn xử lý gửi chat, nhận hội thoại, cập nhật hạng mục hoặc các form nghiệp vụ. CSS được đưa vào `admin-components.css`. `admin-access.js` và `admin-own-password.js` tiếp tục là phần dùng chung toàn Admin.

Đổi vị trí CSS ban đầu làm một quy tắc overlay phía sau ghi đè và gây mờ nền. Đã tăng độ ưu tiên đúng selector `.admin-modal-overlay.staff-workspace-modal`, giữ nguyên giá trị kiểu trình bày đã chốt. Bộ kiểm thử bổ sung kiểm tra `backdrop-filter: none` và nền modal trắng; ảnh mới được xem lại sau khi sửa. Không đổi dữ liệu, RPC, UUID, phiên bản hay quyền CSDL. Bằng chứng cấu trúc tại [view-integration-results.txt](phase3/view-integration-results.txt).

## Điểm mở Tạo khiếu nại từ hồ sơ ca và đơn

Đã thêm nút trong JS Dịch vụ/Bán hàng để mở form hiện có của `complaints.js` với mã nguồn. Mở form đọc lại đúng ca được giao hoặc đơn được phép xem, rồi đọc đúng khách gắn nguồn và điền SĐT. Khách, nhóm và giao dịch được khóa; ẩn lựa chọn chưa xác định nguồn và nút bỏ chọn. Người dùng vẫn nhập tiêu đề, nội dung và mức ưu tiên; không tự dựng lời phản ánh. Mở từ danh sách khiếu nại giữ cách tìm/chọn cũ.

Thiếu nguồn, ca khác hoặc lỗi đọc khách sẽ khóa lưu và xóa phần nguồn/liên hệ cũ. Lưu dùng `create_admin_complaint` hiện có, kiểm tra quyền/liên kết ở CSDL và tạo phiếu pending chưa phân công. Lần gửi chưa rõ kết quả giữ UUID, nguồn và nội dung cũ qua đóng/mở lại, không tự chuyển sang một nguồn khác. Chưa thêm migration hoặc cấp quyền mới.

Kết quả cuối: 264 nhóm hồi quy và 10 nhóm Auth thực PASS, dấu kiểm nguồn khớp, bản sao đã dọn. Chín nhóm bổ sung kiểm tra nguồn ca tự điền/khóa, ảnh hai kích thước và tiêu điểm, kiểm tra bắt buộc/lưu đúng phiếu, phân lại ca chặn tạo, ca khác/lỗi đọc chặn và dọn nguồn, mất phản hồi sau ghi thử lại cùng UUID dù mở từ hồ sơ khác, mở đơn mới sau đối chiếu xong, luồng danh sách cũ vẫn chọn tự do, và lỗi xác minh quyền đóng/dọn dữ liệu. Hai loại phiếu được lưu đúng khách và ca/đơn, chưa phân công; thử lại chỉ tạo một phiếu và một tin nhắn. Đã xem ảnh ca/đơn và đầu/cuối form điện thoại. Biến thể form này chờ người dùng nghiệm thu.

Người dùng đã nghiệm thu biến thể từ hồ sơ ca/đơn: “Đồng ý, tiếp tục”. Giới hạn RPC hội thoại chỉ nhận tiêu đề được xử lý ở bước tiếp theo dưới đây.

## Tạo khiếu nại từ hội thoại được giao

Nút mở thuộc `chatbot.js`, form dùng lại trong `complaints.js`; không thêm file JS. Form đọc lại hội thoại đang do người đăng nhập xử lý và khách gắn với hội thoại. Khách và SĐT được cố định; nhóm khiếu nại, mức ưu tiên, giao dịch liên quan, tiêu đề và nội dung vẫn nhập/chọn rõ ràng. Có lựa chọn chưa xác định giao dịch; không tự dựng nội dung phản ánh từ tin nhắn chat.

Migration 176 thêm overload tám tham số cho `create_chat_complaint`, giữ nguyên định nghĩa bảy tham số của màn hình Quản lý hiện có. CSDL tự lấy khách từ hội thoại, khóa dòng hội thoại và UUID yêu cầu, kiểm tra người xử lý/phiên bản rồi gọi `create_admin_complaint` với toàn bộ nội dung tối đa 8000 ký tự. Phiếu và tin nhắn giữ nội dung đầy đủ; audit `CREATE_CHAT_COMPLAINT` chỉ ghi mã hội thoại để liên kết nguồn. Phiếu mới pending, chưa phân công; không tự gửi tin nhắn hoặc kết thúc hội thoại.

Thử lại yêu cầu đã ghi nhưng mất phản hồi dùng đúng UUID, khách, giao dịch, hội thoại và nội dung ban đầu kể cả khi mở form từ hội thoại khác. CSDL chặn dùng UUID ấy cho hội thoại hoặc nội dung khác. Phân lại người xử lý, mất quyền hoặc lỗi đọc chặn tạo; xác minh vai trò thất bại đóng form và dọn dữ liệu. Không cấp quyền bảng mới. Áp dụng 176 sau 165–175; khôi phục theo thứ tự ngược, 176 chỉ xóa overload mới. Chưa áp dụng vào Cloud hoặc CSDL rà soát chính.

Kết quả: 279 nhóm hồi quy, 10 nhóm Auth thực và 6 bài API PASS. Mã băm nguồn khớp; các bản sao kiểm thử đã dọn. Mười bốn kiểm tra hội thoại bổ sung bao phủ tự điền/khóa khách, lưu nội dung nhiều dòng, giao diện và bốn cách đóng, nguồn ca/đơn, phiên bản cũ, phân lại người xử lý, hội thoại ngoài phạm vi/khách vãng lai/lỗi đọc, thử lại sau mất phản hồi, chặn đổi hội thoại hoặc nội dung của UUID cũ, giới hạn 8000 ký tự, nguồn sai khách/ca không được giao, ẩn danh/mất quyền, tương thích RPC cũ và dọn dữ liệu khi xác minh thất bại. Kiểm tra khôi phục 176 xác nhận chỉ xóa overload mới và giữ nguyên định nghĩa bảy tham số. Đã sửa thông báo chọn giao dịch còn lưu sau khi đánh dấu chưa xác định giao dịch.

Đã xem ảnh [máy tính](phase3/complaint-chat-desktop.png), [điện thoại](phase3/complaint-chat-mobile.png), [cuối form điện thoại](phase3/complaint-chat-mobile-bottom.png) và [gắn đơn hàng](phase3/complaint-chat-order-desktop.png). Người dùng đã nghiệm thu biến thể hội thoại: “Đồng ý, tiếp tục”. Bộ nghiệp vụ dùng JWT ký cục bộ với PostgREST/CSDL thật; 10 nhóm đăng nhập/đổi mật khẩu dùng Auth thật riêng. Chưa kiểm thử Auth thật cho toàn bộ nghiệp vụ hoặc Realtime.

## Ranh giới sau giai đoạn 3

- Các modal, gồm Phiếu bán hàng, Phiếu ca dịch vụ và tạo khiếu nại từ hội thoại, đã được người dùng nghiệm thu. Không còn modal chờ nghiệm thu trong phạm vi giai đoạn 3.
- Người dùng chốt “Giữ Quản lý xử lý đánh giá (đề xuất)”; STAFF tiếp nhận phản hồi qua hội thoại/khiếu nại. Không thêm trang đánh giá hoặc quyền kiểm duyệt cho STAFF.
- Đã chạy toàn bộ bộ nghiệp vụ phân quyền bằng Auth thật và hồi quy các phần Quản lý bị ảnh hưởng. Chi tiết tại mục kết thúc bên dưới; các số liệu/chờ nghiệm thu trong lịch sử phía trên mô tả trạng thái từng thời điểm.
- Tích hợp AI, ngữ cảnh chat, nhiều tab, Realtime và cập nhật phiên thuộc giai đoạn 4. Kết quả giai đoạn 3 không thay thế kiểm thử các phần này.
- Chưa chạy trọn bộ PQ-01 đến PQ-30; không đánh dấu các kịch bản tổng hợp hoàn tất từ kết quả kiểm tra một phần.
- Chưa áp dụng migration lên Cloud, chưa mở khóa/gán vai trò cho người thật và chưa push.

## Phân trang lịch sử hồ sơ dịch vụ

Sau khi người dùng nghiệm thu Phiếu ca dịch vụ, đã rà soát điểm nhận ca/chuyến: Biên bản tiếp nhận và bàn giao đã nối; kiểm tra phòng, thời gian chuyến và phân công vẫn do CSDL quyết định. Không thêm quyền tự phân công hoặc điều phối giao hàng cho Nhân viên.

Phát hiện hồ sơ ca chỉ đọc trang đầu của Hạng mục của tôi, Biên bản và Nhật ký chăm sóc. Đã thêm thanh trang độc lập cho ba bảng ngay trong `services.js`, tối đa 10 dòng/trang, thanh trang nằm ngoài card. Lỗi đọc trang mới xóa dòng và thanh trang cũ; kết quả đến sau khi rời hồ sơ không được chèn vào màn hình mới. Giữ các kiểm tra sửa nhật ký của mình và cập nhật hạng mục được giao.

Đối chiếu mất phản hồi của hạng mục trước đây cũng chỉ tìm 10 dòng đầu. Đã sửa đọc tuần tự qua các trang có phạm vi đến đúng hạng mục hoặc hết kết quả; chỉ xác nhận thành công khi thấy trạng thái mục tiêu, không gửi lại thao tác ghi. Không thêm RPC, migration, CSS hoặc file JS mới; cập nhật phiên bản tải script.

Sáu kiểm tra riêng trên CSDL bản sao đã đạt với 23 hạng mục, 23 biên bản và 23 nhật ký: trang 10/10/3 không trùng, phân trang độc lập, nhật ký đồng nghiệp ở trang cuối không sửa được, ảnh hai kích thước, mất phản hồi ở trang 2 chỉ ghi một lần, lỗi trang xóa dữ liệu cũ và phân lại ca chặn trang tiếp theo. Hồi quy đầy đủ: 285 nhóm đạt, cùng 10 nhóm Auth thực và 6 bài API; mã băm nguồn khớp, tài nguyên bản sao đã dọn. Đã xem ảnh [máy tính](phase3/service-history-desktop.png) và [điện thoại](phase3/service-history-mobile.png). Không sửa modal hoặc yêu cầu nghiệm thu lại các form đã chốt; chưa coi giai đoạn 3 hoàn tất.

## Kết thúc giai đoạn 3 — 05/11/2026

Đã đóng ba mục còn mở: kiểm thử bộ nghiệp vụ bằng Auth thật, hồi quy Quản lý sau gộp JS và chốt phạm vi đánh giá. Người dùng chọn giữ Quản lý xử lý đánh giá; STAFF dùng hội thoại/khiếu nại để tiếp nhận phản hồi. Các modal trong phạm vi đã được nghiệm thu, không bổ sung modal mới ở đợt kết thúc.

- [Bộ tích hợp Auth thật](phase3/auth-integration/ui-results.txt): 300 nhóm PASS, gồm toàn bộ 285 nhóm hồi quy nghiệp vụ trước đó và 15 nhóm về thiết lập Auth, đăng nhập qua form, so sánh mã Quản lý, nạp chín phân hệ và tạo khách. Mọi phiên nghiệp vụ trong chế độ này được GoTrue cấp sau đăng nhập bằng mật khẩu; CSDL vẫn quyết định vai trò/phân công. Không dùng JWT tự ký để giả lập người dùng. Chỉ khóa anon/service của hạ tầng cục bộ được tạo để cấu hình dịch vụ và chuẩn bị tài khoản kiểm thử.
- [Hồi quy Quản lý bổ sung](phase3/auth-smoke/ui-results.txt): 15 nhóm PASS; tăng kiểm tra sau lưu để chờ đúng khách mới xuất hiện trên bảng, rồi xem ảnh [máy tính](phase3/auth-smoke/manager-customers-desktop.png) và [điện thoại](phase3/auth-smoke/manager-customers-mobile.png). Sáu phần thân Quản lý giữ nguyên Git gốc sau chuẩn hóa xuống dòng; nhánh dịch vụ dùng chung đã được bộ đầy đủ kiểm tra lưu/xóa, phiên bản và audit. Chín phân hệ nạp đúng namespace, không chạy giao diện STAFF; không có lỗi JavaScript hay phản hồi đọc CSDL thất bại trong lượt điều hướng này. Đây là hồi quy các phần bị ảnh hưởng, không khẳng định đã thử mọi biến thể của mọi chức năng quản trị cũ.
- [Đổi mật khẩu Auth thật](phase3/password-ui-results.txt): 10 nhóm PASS; API giữ mục tiêu chính mình, xác minh lại mật khẩu/quyền, đổi thành công và xử lý mất phản hồi. Sáu bài `node --test scripts/test/admin_fixed_roles_api.test.cjs` PASS.
- Mã băm nguồn của ba báo cáo khớp file hiện tại. Các CSDL/container kiểm thử và tệp cấu hình bí mật tạm đã dọn; CSDL rà soát chính không bị chuyển đổi. Không đọc Logs Supabase Cloud, không cấp quyền cho người thật, không triển khai Cloud hoặc push.

Chạy lại bộ đầy đủ bằng PowerShell: `$env:PAWPAL_PHASE3_REAL_AUTH='1'; node scripts/test/admin_access_phase3_ui.cjs`. Báo cáo nằm riêng trong `phase3/auth-integration/`; bộ JWT cục bộ cũ vẫn lưu bằng chứng 285 nhóm trong `phase3/ui-results.txt`. Không cộng 15 nhóm bổ sung vào 300 vì chúng lặp lại phần Quản lý với kiểm tra sau lưu mạnh hơn.

Giai đoạn 3 hoàn thành trên môi trường thử nghiệm theo phạm vi giao diện đã chốt. AI, lịch sử/ngữ cảnh AI, cập nhật phiên nhiều tab và Realtime chưa được kiểm thử ở đây, tiếp tục thuộc giai đoạn 4. Bộ PQ-01 đến PQ-30, hồi quy luồng công khai và nghiệm thu tổng hợp thuộc giai đoạn 5; chuyển đổi Cloud thuộc giai đoạn 6. Không đánh dấu các giai đoạn đó hoàn tất từ kết quả này.
