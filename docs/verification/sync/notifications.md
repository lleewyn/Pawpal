# Đồng bộ thông báo — tiến độ 26/10/2026

## Phân trang server — đã áp dụng Cloud

Cập nhật sau xác nhận của người dùng: migration 103 đã được commit trên Cloud; truy vấn metadata xác nhận overload `(integer,integer,boolean)` và RPC zero-argument cũ đều tồn tại. Không sửa/xóa notification hoặc thay RLS bảng. Header local bật phân trang mặc định (chỉ `PAWPAL_NOTIFICATION_PAGING_ENABLED=false` mới tắt để rollback); Chrome và 18 test Node header/scheduler PASS sau bật. Chưa push/deploy frontend, nên không tuyên bố website đang deploy đã dùng payload giới hạn. Chưa nghiệm thu Auth/Realtime đầy đủ.

Migration `103_customer_notification_page.sql` bổ sung overload `(p_page,p_size,p_unread)`, giữ zero-argument RPC. Owner lấy từ profile xác thực; page size 1–50, sort sent_at/id ổn định, total/unread_count tính riêng toàn owner, snapshot cutoff giữ nguyên cho mark-all. Không thay dữ liệu nghiệp vụ.

`sync_notification_page_cloud_rollback.cjs --cloud`: **9 kiểm tra PASS/61 SQL statements**, bao gồm tạo overload trong transaction, trang size 1 không trùng ID, tổng/số unread đúng và reject size 51; kế thừa kiểm tra A/B/Guest/read/retry/cutoff. Tất cả fixture và DDL đều rollback. [Kết quả](notification-page-cloud-rollback.txt).

Chrome `user_notification_modal_ui.cjs` bật cờ thử nghiệm, mock 23 thông báo: 10/10/3 dòng, unread filter phân trang và badge 9+ dựa trên tổng unread. 18 test Node header/scheduler PASS. Không gọi Cloud từ browser.

Lịch sử duyệt: lần áp dụng đầu bị auto-review từ chối vì thiếu xác nhận cụ thể thay đổi schema/quyền; sau khi người dùng nhắc lại quyền áp dụng Cloud, lệnh đã được duyệt và chạy thành công. Không обход hoặc thực thi gián tiếp lần bị chặn. Trạng thái hiện tại theo đoạn cập nhật trên.

Phần này còn local sau commit đã push `0ef89a39`; chưa nghiệm thu E2E hai portal.

- Bỏ tự nạp `notifications-handler.js` trong loader component. Header đã sở hữu RPC snapshot và subscription; helper cũ tự đọc bảng, tạo channel riêng và ghi đè giao diện. File helper cũ còn trong repo, chưa chuyển toàn bộ API của nó.
- Header gom sự kiện trong 200 ms, dùng chung request đang chạy; sự kiện giữa lượt đọc được tải bù một lần. Tab ẩn chỉ ghi nhận thay đổi, hiện lại mới đọc. Không thêm polling.
- Reconnect sau lần subscribe đầu yêu cầu tải bù; pagehide hủy timer/channel và vô hiệu hóa phản hồi đang chạy; pageshow từ bộ nhớ trình duyệt khôi phục.
- Epoch gắn vòng đời chặn phản hồi cũ, kể cả đổi A → B → A; sự kiện storage và auth thay phiên dọn subscription.
- Đánh dấu đọc dùng `p_expected_owner` và mốc snapshot cho thao tác tất cả; gom double-click cùng thao tác. Không đổi trạng thái trước xác nhận RPC hợp lệ. Chờ lượt đọc cũ kết thúc rồi lấy snapshot mới để tránh hiện lại dữ liệu chưa đọc trước lúc ghi; phản hồi ghi của phiên cũ không tải lại tài khoản mới.

## Kiểm tra

`node --test scripts/test/header_notifications.test.js scripts/test/notification_sync.test.cjs`: **18/18 PASS**. VM chạy mã header thực với RPC, DOM và đồng hồ giả. Kiểm tra badge, lỗi không lấy cache cũ, thay subscription theo owner, loader không nạp helper trùng, 10 sự kiện gom một read, hoãn tab ẩn, đọc bù khi request đang chạy, reconnect và pagehide/pageshow. Bổ sung bốn test đánh dấu đọc: chờ xác nhận/double-click/cutoff, lỗi hoặc ack sai giữ trạng thái, đổi actor khi ghi và snapshot cũ trước ghi. Các test offline không gọi Cloud.

**Cloud: 8/8 kiểm tra PASS, 54 SQL statements**, một lượt chạy với ba thông báo tổng hợp và hai owner. Xác minh snapshot chỉ trả đúng owner theo thứ tự thời gian; đánh dấu một thông báo và retry; chặn ID của người khác và expected owner sai; yêu cầu cutoff hợp lệ; đánh dấu tất cả theo cutoff và retry; cách ly B; chặn Guest. Đã rollback và kiểm tra không còn notification/customer/auth fixture. [Kết quả](notifications-cloud-rollback.txt). Không thay schema/RPC/policy hoặc dữ liệu khách thật; không Logs/stress-test; chưa đo bytes/egress thực. Số SQL statements không phải số request portal.

Tái hiện khi cần: `node scripts/test/sync_notifications_cloud_rollback.cjs --cloud`. Mặc định không kết nối; dùng transaction luôn rollback và timeout câu lệnh/lock. Không cần chạy lại chỉ để cập nhật tài liệu.

Fixture test header cũ được bổ sung API timer của browser; không thay production để né lỗi mock.

## Còn lại

### Bổ sung Chrome offline — 26/10/2026

`node scripts/test/user_notification_modal_ui.cjs`: PASS, chạy phần snapshot và popup thật trích từ header, DOM trình duyệt thật, RPC/channel giả, toàn bộ request bị intercept. Mở lần đầu khi chưa tải badge; kiểm tra route `/user#order-detail?id=...`, `/user#booking-detail?id=...`, `/user#support?id=...` và encode ID; nội dung chứa HTML không tạo node/script; 03:00Z hiển thị 10:00 trên browser UTC; lỗi tải được xóa sau phục hồi; đổi owner đóng modal và dọn channel cũ. Không gọi Cloud.

Đã sửa local: mở modal sau lượt đồng bộ owner đầu tiên để tránh refresh tự đóng popup vừa tạo; render từ chối owner cũ; giờ theo Việt Nam cho dropdown/modal và xóa dòng lỗi sau tải thành công. Harness dùng origin localhost để browser có crypto.randomUUID; lần thử origin HTTP không an toàn không phản ánh môi trường localhost/HTTPS thực tế. Không đổi giao diện Admin.

Chưa mở tài nguyên đích qua Auth/RLS thật hoặc chứng minh quyền trang đích từ kết quả href. Các kiểm tra Node header/scheduler vẫn cần giữ cùng bài browser trong hồi quy liên quan.

Chưa kiểm tra commit và persistence đọc qua reload, Auth/HTTP/WebSocket thật, toàn bộ nguồn nghiệp vụ tạo notification hoặc quyền mở tài nguyên đích. SQL dùng role/JWT claims mô phỏng, không thay đăng nhập thật. Snapshot hiện trả toàn bộ thông báo của owner: gom request chưa giải quyết kích thước lịch sử lớn. Chưa có nghiệm thu browser đầy đủ; các ô SYNC-06 toàn chuỗi giữ trống.
