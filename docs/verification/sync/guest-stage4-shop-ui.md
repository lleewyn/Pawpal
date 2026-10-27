# GĐ-04: giỏ hàng và thanh toán guest local

Ngày 27/10/2026, Asia/Bangkok. Đã nối phần shop local; chưa push/deploy, chưa nghiệm thu giao dịch committed User ↔ Admin. Không thay schema, không gửi SMS/upload hoặc gọi gateway thật.

## Thay đổi

- `guest-cart.mjs`: giỏ riêng `pawpal_guest_cart_v1`, chỉ lưu variant ID và số lượng. Web Locks bảo vệ cập nhật giữa tab, kiểm tra lại trạng thái khách sau khi chờ khóa. Không đọc/nhập giỏ member; dữ liệu hỏng được giữ để xử lý, không xóa hoặc fallback. Catalog hiện tại cung cấp tên, giá, ảnh và tồn; không dùng giá client để tạo đơn.
- API thêm giỏ tách nhánh guest, xác minh phân loại thuộc sản phẩm và tồn hiện tại; gỡ chặn đăng nhập tại nút thêm giỏ trên shop/product detail. Member tiếp tục đi nhánh cũ. Header guest có liên kết và số lượng giỏ, cập nhật từ storage/event, không polling.
- `guest-cart-page.mjs`: hiển thị riêng từng variant, tăng/giảm/xóa/chọn sản phẩm; reload giữ số lượng. Sản phẩm không còn bán vẫn hiện để khách chủ động xóa. Giỏ hiển thị tạm tính từ catalog, phí vận chuyển tính tại checkout. Chỉ lưu các dòng đã chọn sang checkout; không khởi tạo customer hoặc giữ kho khi xem giỏ.
- `guest-checkout.mjs`: nhập liên hệ, chọn nhận tại cửa hàng/giao hàng và phương thức manual hiện có; COD được chọn trước nếu khả dụng. Địa chỉ người nhận tách liên hệ hồ sơ. Cấu hình từ `customer_shop_options`, báo giá từ guest API, đổi form phải báo giá lại. Không yêu cầu login/OTP hoặc tạo pet để mua.
- Nhật ký trong sessionStorage chỉ giữ request ID, dòng variant/quantity, mode và trạng thái xử lý; không giữ tên, phone, địa chỉ, token hay receipt. Sau lỗi chưa rõ kết quả, kiểm tra receipt trước khi cho thử lại cùng mã; không tự tạo mã khác/gửi lại.
- Thành công chỉ hiển thị từ receipt; payment pending không hiển thị đã trả tiền. Sau receipt, chỉ trừ số lượng đã mua, giữ sản phẩm không chọn và số lượng thêm sau đó. Ghi ý định dọn giỏ trước khi sửa: nếu dọn bị gián đoạn, không tự trừ lần nữa khi reload; có thể còn sản phẩm cần khách kiểm tra. Đây là ưu tiên tránh mất dữ liệu, chưa phải quy trình khôi phục cleanup đầy đủ.

Checkout vẫn cần kiểm tra tiếp hướng dẫn chuyển khoản/VietQR, coupon/shipping/buy-now toàn luồng và hồi quy member; không suy ra thanh toán đã hoàn tất từ việc chọn phương thức.

## Sửa lỗi receipt trước khi có binding

Lúc lần ghi đầu chưa tạo customer/session DB, SQL receipt trả thiếu quyền vì chưa có binding. HTTP cũ sẽ xóa cookie như phiên bị thu hồi, làm mất đường thử lại yêu cầu chưa rõ kết quả.

Handler mới chỉ với receipt đơn hàng và cookie đã xác thực chữ ký: nếu RPC từ chối vì session, kiểm tra context. Context xác nhận chưa khởi tạo → HTTP 404, giữ cookie, không trả dữ liệu đơn. Context lỗi/đã có binding nhưng không hợp lệ → vẫn từ chối và xóa cookie. Cookie sai chữ ký bị chặn trước RPC. Không mở phone lookup hoặc quyền RPC cho browser; không thay định nghĩa SQL.

## Bằng chứng

[Kết quả và hash nguồn](guest-shop-ui-local.txt).

- Playwright MCP, các browser context mới riêng, frontend/backend thử `localhost:4001`; không thay tiến trình cổng 4000 của người dùng. Server thử đã dừng sau kiểm tra.
- Catalog/fulfillment/payment options là đọc thật. Giỏ trống không redirect; API thêm hai variant của cùng sản phẩm hiện hai dòng; đổi số lượng và reload giữ đúng dữ liệu, không ghi key member. Bấm nút thêm giỏ thật trên product detail thành công. Cart và checkout ở 390 px không tràn ngang.
- Báo giá thật qua HTTP local → Cloud. Contact thiếu bị chặn; quote thành công mới mở xác nhận. Chặn toàn bộ request tạo đơn trong các lượt này bằng route Playwright, không có đơn/hold/profile thật được tạo.
- Tạo đơn được giả lập lỗi 503: không hiện thành công, giữ giỏ và request ID. Hai lần chủ động gửi dùng cùng mã; hai receipt chưa khởi tạo gọi backend/Cloud thật trả 404, cookie vẫn giữ. Không có tự retry.
- Create/receipt thành công được giả lập riêng: receipt pending hiển thị chờ thanh toán; trừ đúng số lượng đã mua, giữ variant không chọn và số lượng thêm trong lúc gửi; reload chỉ đọc receipt, không tạo lại hoặc trừ giỏ lần nữa. Đây là kiểm tra UI với fixture, không phải commit Cloud/Realtime.
- Hai tab trình duyệt thật, Web Locks thật và session HTTP thật: hai bootstrap, chỉ một response cấp cookie; request thứ hai đã có cookie. Hai lần cộng giỏ 2 và 3 ở hai tab cho kết quả 5. Fixture cart chỉ nằm trong browser context đã đóng.
- 68 test Node Auth/access/cookie/HTTP/client/cart PASS; syntax các module đã sửa và `git diff --check` PASS. Bảy test cart và một guard receipt mới, các kiểm tra giả lập không thay cho thực thi nghiệp vụ committed.

Ảnh kiểm tra local dưới `.playwright-mcp/`: `guest-cart-mobile.png`, `guest-checkout-mobile.png`, `guest-checkout-recovery.png`, `guest-checkout-receipt.png`; không đưa vào git. Đã xem ảnh và dùng lớp giao diện checkout thương hiệu hiện tại. Bản chụp receipt dùng phản hồi giả lập.

Hai lượt đo Web Locks ban đầu không hợp lệ do trang 404 có CSP chặn import và API Playwright `headers()` không chứa Cookie. Đã đổi sang trang hợp lệ và `allHeaders()`, kiểm tra thêm số response cấp cookie; kết quả cuối PASS. Không kết luận website bị chặn từ lỗi công cụ.

## Còn lại

Booking guest/return-guest UI, liên kết Auth tự nguyện qua UI, SMS thật, coupon/shipping/buy-now và hướng dẫn thanh toán, kiểm thử chuyển tài khoản/quyền riêng tư, đơn committed/cạnh tranh sau commit/Realtime hai portal, phát hành. Checklist chỉ đánh ba mục nối/kiểm tra nhánh shop local, giữ các gate tổng thể mở.
