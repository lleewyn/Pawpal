# Nhánh từ chối và hàng trả không bán lại — 26/10/2026

**9 kiểm tra Cloud PASS, 94 SQL statements** trong một lượt; một đơn/return tổng hợp với hai nhánh savepoint. [Kết quả](return-branches-cloud-rollback.txt). Mọi thay đổi đã rollback và xác minh không còn fixture order/return/catalog/config/customer/auth/staff. Không tiền thật, không Logs/stress-test, không đổi schema/RPC/policy.

- Số lượng trả 0, lẻ 1,5 và vượt số đã mua bị chặn; không để lại request dở dang. Tổng số đã yêu cầu trong pending cũng tính vào giới hạn trả.
- Admin từ chối phải có revision hiện hành và lý do. Retry cùng ID lưu một kết quả rejected/lý do, không nhập kho. User đọc được cả trạng thái và resolution_type.
- Rollback nhánh từ chối, dùng lại cùng request pending để nhận hàng đã kiểm định nhưng không bán lại: retry không thêm tồn bán được, resolution là received_unsaleable. Request đã giải quyết không được nhận lại thành saleable.
- User đọc được received và resolution không bán lại. Không suy việc nhận hàng thành tự hoàn tiền.

## Lỗi giao diện đã sửa local

`return-detail.js` trước đây bỏ `resolution_type` khi chuẩn hóa dữ liệu, timeline chỉ ghi lời chung nên User không thấy lý do Admin từ chối. Đã giữ resolution riêng với lý do yêu cầu của khách, dùng nó trên timeline rejected và escape khi chèn HTML. Chưa thay bố cục/modal Admin.

`node --test scripts/test/return_resolution.test.cjs`: **3/3 PASS** cho mapping lý do, escape nội dung chèn HTML và fallback khi không có giải thích. Test VM chạy các hàm module thật; chưa phải browser/HTTP/Realtime trọn luồng.

## Giới hạn

### Bổ sung browser offline

`node scripts/test/user_return_detail_ui.cjs`: **PASS Chrome** với HTML và module chi tiết đổi trả thật, RPC/query mock, toàn bộ request bị chặn/intercept; không gọi Cloud. Browser timezone UTC vẫn hiển thị 03:00Z thành 10:00 giờ Việt Nam. Lý do chứa thẻ img/onerror hiển thị chữ, không tạo node img hoặc chạy script. Đổi tài khoản dọn timeline cũ và channel; request đang chờ khi dispose/đổi phiên không render hoặc tạo lại channel.

Sửa local thêm guard owner/version và auth/storage lifecycle; bỏ việc gọi dispose rồi tự tạo lại watcher sau khi tải; lỗi phiên dọn trạng thái loading để thông báo hiện ngay. Không đổi bố cục Admin. Ba test Node mapping/escape/fallback vẫn PASS. Lượt browser đầu cần chờ lớp skeleton được tháo qua requestAnimationFrame trước khi đọc innerText; harness đã sửa, không thay production để bỏ skeleton.

Chưa kiểm tra bằng hai portal thật hoặc delivery Realtime; browser offline không thay các mục còn thiếu bên dưới.

Chưa kiểm tra đổi hàng/gửi bù, cạnh tranh nhiều transaction, toàn bộ UI/Auth/commit/reload hoặc notification. Hai nhánh loại trừ nhau dùng savepoint để không tạo nhiều đơn test. RPC/JWT claims mô phỏng không thay đăng nhập thật. 94 là SQL statements, không phải số request hoặc số đo egress.

Tái hiện khi cần: `node scripts/test/sync_return_branches_cloud_rollback.cjs --cloud`; mặc định không kết nối, statement timeout 8 giây/lock 3 giây, luôn rollback. Code production mới còn local, chưa push/deploy.
