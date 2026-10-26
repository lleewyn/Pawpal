# Đồng bộ đơn hàng và checkout — 26/10/2026

Môi trường: mã local, nhánh nền `main`, SHA `d8bb56e918105865d38d01592e4255d480f65849` cộng working tree; RPC/RLS trên Supabase Cloud `cpzuvaplseielhgcnqrn`. Người thực hiện: Codex. Chưa push/deploy, chưa nghiệm thu hai portal đăng nhập thật qua HTTP/Auth/Realtime sau commit.

## SQL/RLS Cloud

`node scripts/test/sync_orders_cloud_rollback.cjs --cloud`: **13 assertion PASS**, **113 SQL statements**, một lần chạy fixture thành công. Chỉ tạo một đơn COD, một sản phẩm/SKU có tồn mở đầu 3, quantity đặt 2, giá 50.000, phí giao 5.000; các actor A/B/Admin và cấu hình thanh toán/giao hàng/provider đều tổng hợp. Không dùng SKU, đơn hoặc tiền khách thật.

Mọi dữ liệu trong transaction luôn ROLLBACK. Có statement timeout 8 giây và lock timeout 3 giây. Sau rollback kiểm tra EXISTS theo ID xác nhận order/product/customer/auth/config/provider fixture không còn. Claims và role mô phỏng ở DB, không phải phiên đăng nhập HTTP thật. Không có giao dịch thanh toán hay giao hàng bên ngoài.

| Kiểm tra | Expected / Actual | Kết quả |
|---|---|---|
| Client gửi unit_price = 1 | Server lấy giá SKU 50.000, tổng 105.000 gồm shipping | PASS SQL |
| Quantity 4 khi tồn 3 | Server trả 23514 | PASS SQL |
| Quote version sai | PT409, chưa có đơn nửa vời | PASS SQL |
| Create rồi retry cùng ID | Một order/detail/payment, giữ kho quantity 2; Admin đọc đúng owner/giá | PASS SQL |
| Admin xác nhận với version cũ | PT409 | PASS SQL |
| Admin xác nhận đúng | User đọc confirmed | PASS SQL |
| B dùng ID đơn A | Không đọc/hủy được; không gọi được RPC fulfillment Admin | PASS SQL |
| Admin hủy (savepoint riêng) | User đọc cancelled, reservation active về 0 | PASS SQL |
| User hủy và retry (savepoint riêng) | Admin đọc cancelled, chỉ một audit theo request ID | PASS SQL |
| Admin giao và retry cùng ID | Chỉ xuất kho 2 một lần, tồn còn 1; User đọc shipped và vận đơn | PASS SQL |
| Admin hoàn tất | User đọc completed; payment COD vẫn pending, không tự coi đã thu tiền | PASS SQL |
| Guest gọi quote riêng | 42501 | PASS SQL |
| Cleanup | Fixture không còn sau rollback | PASS SQL |

Hai nhánh hủy dùng savepoint và hoàn tác để tái sử dụng cùng một đơn cho luồng giao/hoàn tất; không tạo nhiều đơn để kiểm tra. Bằng chứng máy đọc: [orders-cloud-rollback.txt](orders-cloud-rollback.txt).

## Lỗi đã sửa local

- **SYNC-ORD-B01 — reload có thể đổi ID đặt hàng khi mất phản hồi.** Checkout trước đây tạo UUID mới ở mỗi lần tải module. Thêm `checkout-request.mjs`, giữ ID đã gửi trong sessionStorage theo customer. Khi có yêu cầu chưa xác minh, tra đúng `sales_order.id + customer_id` trước khi tải/báo giá giỏ hoặc tạo lại. Nếu tìm thấy thì mở kết quả của đúng đơn đó. Không polling hoặc retry tự động.
- **SYNC-ORD-B02 — acknowledgement chưa được đối chiếu.** `API.submitOrder` và caller checkout chỉ coi thành công khi ID trả về trùng request ID; null hoặc ID khác giữ trạng thái chưa xác minh, không xóa giỏ.
- **SYNC-ORD-B03 — lỗi giỏ sau commit bị báo như lỗi tạo đơn.** Ghi nhận trạng thái đơn đã xác nhận trước khi dọn giỏ. Lỗi hoặc kết quả chưa rõ của dọn giỏ không tạo thêm đơn và không tự trừ quantity lần hai. Trang kết quả chỉ dẫn kiểm tra giỏ sau khi đã xác minh đơn của đúng tài khoản. Journal chỉ được xóa sau khi trang kết quả xác minh đơn; lỗi storage không che kết quả đơn đã đọc được.
- **SYNC-ORD-B04 — đổi actor khi quote đang chạy.** Kiểm tra actor trước recovery và sau các bước async quan trọng; không gửi tiếp yêu cầu tạo với form của tài khoản trước. Thêm cờ processing ngoài trạng thái nút để chặn gọi trùng.

File production: `scripts/shared/checkout-request.mjs`, `pages/shop/checkout/checkout.js`, `scripts/api/api.js`, `pages/shop/payment-success/payment-success.js`. Không đổi modal, schema, RPC hoặc policy Cloud. Giữ các diff cũ trong API/checkout và các phân hệ khác.

Journal chỉ có UUID, phase và cờ cartCleaned, key theo customer; không lưu token, địa chỉ, giá hay dữ liệu liên hệ. Journal dùng sessionStorage nên phạm vi khôi phục là cùng phiên tab; chưa nghiệm thu nhiều tab hoặc trình duyệt khác. Khi giỏ có kết quả ghi không rõ sau đơn thành công, giữ trạng thái cần kiểm tra thay vì tự replay phép trừ giỏ. Không cam kết tự động đối soát hoàn toàn giỏ trong tình huống này.

## Offline và regression

`node --test scripts/test/cart_persistence.test.mjs scripts/test/cart_access.test.mjs scripts/test/checkout_request.test.mjs`: **30/30 PASS**, hoàn toàn offline. Có kiểm tra ID tồn qua reader mới, scope A/B, storage lỗi/corrupt không tự tạo yêu cầu mới, payload chỉ SKU/quantity và server quote, acknowledgement sai, cùng hồi quy giỏ hàng/backup/quyền.

`node scripts/test/user_checkout_recovery_ui.cjs`: **PASS** Chrome với code orchestration checkout thật và transport giả lập. Các tình huống: double-click chỉ một lần tạo; response tạo đơn mất nhưng record đã tồn tại; reload module rồi khôi phục đúng ID trước quote; lỗi dọn giỏ sau ack không replay cleanup; ack null không chuyển trang/xóa giỏ; đổi actor trong lúc quote không gửi create.

Bài browser dùng harness chức năng, không phải toàn bộ UI portal hoặc Auth thật. Các test concurrency trong suite cart là mock offline, không phải load test Cloud. Đã chạy kiểm tra cú pháp JS và diff whitespace.

## Tài nguyên và phần chưa làm

### Bổ sung chi tiết đơn User — 26/10/2026

Sửa local `order-detail.js`: owner và version cùng chặn response cũ, init đã dispose không tạo lại watcher; auth/storage đổi phiên xóa currentOrder và dialog/channel cũ, thay nội dung bằng lời yêu cầu mở lại. Mua lại kiểm tra owner/order trước và sau đọc giỏ; hủy/nhận hàng kiểm tra owner/order trước submit và sau RPC. Ngày giờ dùng Việt Nam. Không đổi RPC/schema/policy.

`node scripts/test/user_order_detail_actor_ui.cjs`: Chrome offline PASS với HTML/module thật, API/channel giả, request intercepted. Đơn A hiển thị ban đầu; đổi B xóa nội dung riêng và tháo channel. Response A chậm sau đổi auth hoặc dispose không render, không tạo channel. Test danh sách `user_orders_actor_ui.cjs` vẫn PASS. Action modules trả hàng/đánh giá được stub; chưa kiểm thử submit hủy/nhận/mua lại hoặc quyền server trong bài browser này. Chưa kiểm tra chi tiết lịch, Auth/HTTP/commit/reload, Realtime delivery thật hoặc tổng egress. Không có truy vấn Cloud trong đợt.

### Bổ sung danh sách đơn User — 26/10/2026

Sửa local `pages/user/modules/orders/orders.js`: kiểm tra owner cùng load version trước query và sau các lượt đọc đơn/return/review; đổi auth/storage dọn channel, xóa state/danh sách/thống kê; AbortController tháo listener tìm kiếm/lọc/phân trang khi dispose hoặc init lại. Mount đã dispose không tiếp tục bind listener sau request chậm. Không đổi bố cục hoặc query Cloud trong đợt này.

`node scripts/test/user_orders_actor_ui.cjs`: **Chrome offline PASS**, HTML/module danh sách thật, transport giả và mọi request bị intercept. Đơn PRIVATE-A hiển thị ban đầu; đổi B xóa A và đưa thống kê về 0; mở lại hiển thị B. Response A chậm sau đổi phiên hoặc dispose không render. Channel cũ được dọn. Return/review action modules được stub vì ngoài phạm vi case danh sách; chưa kiểm tra các hành động đó. Assertion tiền ban đầu được sửa để chấp nhận định dạng tiền Việt Nam có khoảng trắng/ký hiệu đồng, không đổi production theo fixture.

Regression `node scripts/test/user_return_detail_ui.cjs` cũng PASS. Không Cloud/Logs/stress-test. Chưa kiểm chứng login/HTTP/commit/reload, tab ẩn/reconnect hoặc delivery thật của danh sách đơn; không đánh PASS toàn chuỗi từ browser offline.

Bổ sung 26/10: [áp voucher/hủy COD](voucher-order.md) và [đổi trả/hoàn tiền một phần](returns.md) đã được kiểm tra riêng ở lớp RPC/RLS, fixture rollback sạch. Các giới hạn toàn chuỗi bên dưới vẫn áp dụng; hoàn điểm/chi tiêu xét hạng và gateway còn chưa kiểm tra.

Chỉ một lần đọc metadata RPC/cột bắt buộc, một lượt fixture Cloud; các lần hồi quy sau sửa chỉ offline. Không dùng Supabase Logs, không stress-test, không SELECT toàn bộ đơn khách. Recovery chỉ đọc một ID với scope customer; không có truy vấn recovery cho checkout mới chưa từng gửi request. 113 SQL statements là số câu trong test, không phải số request portal hoặc số thao tác ghi. Chưa đo tổng egress/p95.

Còn thiếu: full UI → HTTP/Auth → DB commit → UI Admin/User → reload; notification, đổi trả/hoàn tiền thực tế, voucher/điểm và rollback các ưu đãi khi hủy; lỗi gateway thanh toán; cạnh tranh tồn giữa nhiều phiên; trạng thái đóng gói riêng nếu có. Không suy các mục này PASS từ fixture COD hoặc test offline.

Để rollback code, phục hồi riêng diff của đợt checkout và helper/test mới; không reset toàn workspace. Không có migration Cloud cần hoàn tác sau kiểm tra. Không chạy lại Cloud fixture nếu chưa có thay đổi cần xác minh.
