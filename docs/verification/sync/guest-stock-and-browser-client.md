# Tồn kho đồng thời và lớp gọi API guest

Ngày 27/10/2026, Asia/Bangkok. Không migration, commit dữ liệu thử, push hoặc deploy.

## Khóa tồn kho trên Cloud

Chạy `node scripts/test/guest_stock_serialization_rollback.cjs --verify-cloud`.

[Năm kiểm tra PASS](guest-stock-serialization-rollback.txt) trên hai kết nối PostgreSQL thật, role service, gọi RPC checkout đã cài. Chọn đúng một variant đang bán có tồn từ catalog công khai; chỉ đọc giá/ledger, không sửa giá, tình trạng sản phẩm hoặc ledger. Mọi hồ sơ, đơn, giữ kho, payment và audit thử được rollback.

Hai phiên khác hash cùng báo giá một sản phẩm. A tạo đơn chưa commit; B gửi tạo đơn và phải chờ khóa hàng của A. Xác minh bằng PID kết nối và `pg_blocking_pids`/`pg_locks`; không đọc Supabase Logs. Sau rollback A, B hoàn tất. Trong transaction B, tạo một đơn nữa giữ hết phần tồn khả dụng; đơn mới dùng báo giá cũ bị từ chối `sales_available_stock_insufficient` và không có order/hold rơi rớt. Retry chính xác đơn đã có vẫn trả mã cũ, giữ đúng một line/hold và tối đa một payment. Chạy ràng buộc trì hoãn trước rollback; kiểm lại mã đơn/session/customer thử không còn.

Giới hạn khóa 5 giây, statement 8 giây, tối đa 10 lần quan sát cách nhau 100 ms. Đây là kiểm tra chờ khóa với rollback và hết tồn trong cùng transaction, **chưa phải** cạnh tranh sau commit hoặc nghiệm thu chống bán vượt tồn toàn bộ. Không đánh mục concurrency tổng thể từ kết quả này.

## Lớp gọi API cho giao diện

Thêm `scripts/shared/guest-commerce-client.mjs`, một instance dùng chung cho các module giao diện sau này. Chưa import vào trang, chưa thay luồng thành viên hoặc chuyển hướng hiện tại.

- Import không phát sinh request. Chỉ bootstrap cookie khi có thao tác API guest; các lời gọi cùng tab chia sẻ bootstrap đang chạy, không polling hoặc tải lại dữ liệu định kỳ.
- Dùng Web Locks theo cùng origin để tuần tự hóa bootstrap giữa tab. Trình duyệt thiếu API này bị từ chối trước khi cấp cookie; cần kiểm tra trình duyệt mục tiêu khi nối giao diện. Bộ test Node dùng locks giả lập, chưa nghiệm thu hành vi nhiều tab thực tế.
- Gửi POST JSON đến đường dẫn cố định cùng origin, cookie tự gửi qua `credentials: same-origin`, `cache: no-store`. Không đọc cookie HttpOnly, không gửi Bearer, không lưu token/contact/pet/receipt vào storage.
- Các thao tác ghi bắt buộc có request ID từ caller. Hai lần bấm khi cùng request đang chạy chia sẻ một promise; sửa payload dưới cùng mã bị từ chối. Chụp payload trước khi chờ bootstrap để tránh chỉnh form làm thay đổi request đã gửi.
- Lỗi mạng, timeout hoặc phản hồi không đọc được không báo thành công và không tự gửi lại. Kết quả ghi được đánh dấu `uncertain`; màn hình phải giữ nguyên mã, kiểm tra receipt và cho thử lại có kiểm soát. Module chưa thay phần nhật ký phục hồi của checkout.
- Phiên 401 dừng yêu cầu hiện tại, không âm thầm tạo lại cookie rồi gửi lại đơn. Kiểm tra tài khoản trước dispatch và sau response; đăng nhập khi request đang chạy khiến kết quả cũ không được dùng để cập nhật UI.
- `end()` không bootstrap phiên mới; `invalidate()` chỉ bỏ trạng thái sẵn sàng phía client, không giả vờ thu hồi cookie server.

## Kiểm tra local và phần tiếp theo

Chạy:

```powershell
node --test scripts/test/guest_commerce_client.test.cjs scripts/test/customer_auth.test.js scripts/test/guest_account_cookie.test.cjs scripts/test/guest_commerce_http_guards.test.cjs scripts/test/guest_records_access.test.cjs
```

**60 test PASS**, gồm 10 test client với transport/locks giả lập. Các test mới kiểm bootstrap đồng thời, body snapshot, double click, đổi payload, timeout/abort, 401, chuyển sang thành viên trước dispatch và trong lúc ghi, response lỗi và thiếu Web Locks. Kết quả này không thay thế kiểm tra HTTP→Cloud hoặc UI thật của module mới.

Còn nối client vào booking/cart/checkout, lưu mã phục hồi đúng phiên, kiểm tra Web Locks/cookie ở hai tab thật, xử lý kết quả chưa rõ sau lỗi mạng trên UI và kiểm thử committed concurrency/Realtime hai portal. Gate GĐ-03 còn mở; chưa đánh hoàn thành GĐ-04.
