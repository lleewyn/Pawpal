# Validation và thử lại checkout khách vãng lai

Ngày 27/10/2026. Thay đổi local trong `pages/shop/checkout/guest-checkout.mjs`; không migration, không gọi Cloud hoặc push/deploy trong đợt kiểm tra này.

## Thay đổi

Các ô checkout có thông báo bên dưới, `aria-describedby` và `aria-invalid`. Dữ liệu không hợp lệ focus về ô lỗi đầu tiên. Chặn tên/người nhận/địa chỉ chỉ có khoảng trắng, số điện thoại sai và dữ liệu vượt độ dài trước báo giá/đặt hàng. Định dạng phone cùng quy tắc hiện tại của máy chủ: 0, +84, 0084 hoặc 84, cho phép dấu phân cách được hỗ trợ. Sửa trường xóa lỗi của trường đó.

Nhận tại cửa hàng không yêu cầu hoặc kiểm tra các ô địa chỉ đang ẩn; chuyển từ giao hàng sang nhận tại cửa hàng xóa lỗi cũ của các ô này. Không xóa nội dung nhận hàng người dùng đã nhập chỉ vì đổi cách nhận.

Nút kiểm tra đơn bị khóa cho đến khi tải cấu hình nhận hàng/thanh toán và context xong. Hàm thao tác cũng kiểm tra trạng thái sẵn sàng để không thể gửi sớm qua lời gọi handler. Validation chạy trước khi khóa fieldset; không dựa vào `reportValidity()` sau khi các ô đã bị disabled (disabled controls không được trình duyệt validation).

Giữ quy trình mã yêu cầu/receipt hiện có: lỗi gửi chưa rõ kết quả không tự gửi lại, không dọn giỏ hoặc lưu contact/địa chỉ vào storage; sau kiểm tra lại, thử lại cùng mã. Không thay RPC, quyền, giá hoặc tồn kho.

## Kiểm thử đã chạy

- `node scripts/test/guest_checkout_validation_ui.cjs`: Chrome, import module thật, API/config fixture, không Cloud. PASS khóa nút khi config đang chờ; form trống/tên trắng/phone sai; giao hàng thiếu hoặc sai thông tin; nhận tại cửa hàng bỏ qua ô địa chỉ ẩn; ghi chú vượt 4.000 ký tự. Các trường hợp sai không gọi quote. ARIA/focus và xóa lỗi đúng.
- Cùng test: API create giả lập lỗi uncertain trước khi ghi nhận; form, giỏ, mã yêu cầu giữ nguyên; nút đặt bị khóa đến khi kiểm tra lại. Receipt 404 rồi quote lại; lần tạo tiếp theo cùng request ID, sau receipt hợp lệ mới hiện mã đơn và dọn phần đã mua. Không lỗi JavaScript, không persist tên liên hệ vào storage.
- `node --test scripts/test/guest_checkout_preferences.test.cjs scripts/test/guest_cart.test.cjs scripts/test/guest_commerce_client.test.cjs`: 24 test PASS, gồm voucher theo phạm vi, giỏ hai tab, account generation, timeout/uncertainty và request dedup.
- Syntax module PASS.

API fixture ở đây không chứng minh giao dịch committed hoặc cạnh tranh hai writer sau commit. Không đóng các mục chống đơn trùng/tài khoản thật/hai portal; các bằng chứng SQL rollback trước đó vẫn có phạm vi riêng. Lỗi nghiệp vụ do máy chủ chưa có field code vẫn hiện thông báo chung, không đoán trường lỗi. Chưa nghiệm thu toàn bộ checkout hoặc GĐ-04/GĐ-05.
