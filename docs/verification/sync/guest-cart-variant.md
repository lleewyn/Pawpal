# Đổi phân loại tại giỏ khách vãng lai

Ngày kiểm tra: 27/10/2026. Thay đổi chưa push/deploy.

Khách bấm phân loại dưới tên sản phẩm để chọn lại. Các lựa chọn hiển thị giá và tồn kho; hết hàng hoặc không đủ tổng số lượng thì không chọn được. Đổi cập nhật ảnh, đơn giá, tổng tiền và giữ số lượng. Nếu đích đã có trong giỏ, gộp hai dòng trong khóa ghi giỏ, đọc số lượng mới nhất. Chỉ lưu ID phân loại và số lượng; máy chủ báo giá/kiểm tra tồn kho lại khi checkout. Trạng thái chọn thanh toán được giữ; khi gộp, dòng kết quả được chọn nếu một trong hai dòng đã chọn.

Không thêm truy vấn catalog, polling hay ghi CSDL khi chọn. Dùng catalog đã tải lúc mở giỏ; kiểm tra tồn kho tại đây là ảnh chụp thời điểm tải trang. Không thay đổi luồng chọn phân loại của thành viên.

## Kết quả

- 45/45 test Node PASS: `node --test scripts/test/guest_cart.test.cjs scripts/test/cart_access.test.mjs scripts/test/cart_persistence.test.mjs scripts/test/guest_checkout_preferences.test.cjs scripts/test/checkout_request.test.mjs`.
- `node scripts/test/guest_cart_variant_ui.cjs` PASS trong Chrome thật, chạy module và CSS thật, catalog fixture tại transport: đổi ảnh/giá/tổng, giữ số lượng, reload, gộp, thiếu tồn, bỏ chọn thanh toán, Escape/focus/bấm ngoài và menu trong viewport 390px. Không lỗi JavaScript, không request ra ngoài/ghi Cloud.
- `node scripts/test/guest_checkout_validation_ui.cjs` PASS: hồi quy module checkout với API fixture.
- Syntax module và `git diff --check` PASS.
- Kiểm tra ảnh [menu trên điện thoại](guest-cart-variant-mobile.png). Đây là giao diện test tối giản, không phải ảnh nghiệm thu Vercel.

Bộ kiểm thử giỏ thành viên cũ trích phương thức API vào VM nhưng thiếu dependency `isGuestShopper` sau lần tích hợp guest trước. Bổ sung hàm đọc danh tính fixture vào VM; không sửa mã runtime thành viên. Bốn test từng lỗi thiếu tên dependency đã PASS cùng toàn bộ 45 test.

Không đánh dấu nghiệm thu E2E Cloud/Vercel hoặc OTP dựa trên kiểm thử fixture này.
