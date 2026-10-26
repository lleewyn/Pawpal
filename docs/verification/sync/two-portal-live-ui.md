# Kiểm thử hai giao diện bằng Playwright MCP — 26/10/2026

Bổ sung tiếp theo: [UI chuyển ca và công bố sau commit](advanced-portal-live-ui.md). Các giới hạn bên dưới mô tả mốc trước đợt bổ sung này; kết quả mới và các nhánh còn thiếu được ghi rõ ở báo cáo mới.

Đã thao tác trực tiếp qua Playwright MCP với mã đang sửa trên máy: Admin `http://localhost:4000`, khách `http://127.0.0.1:4000`. Hai origin tách bộ nhớ đăng nhập; không dùng hai tab cùng origin để giả lập hai tài khoản. Backend là Supabase Cloud thật `cpzuvaplseielhgcnqrn`; không mock transport hoặc chèn trạng thái giả vào ứng dụng. Khách A, B đăng nhập bằng form số điện thoại/mật khẩu; QA Admin đăng nhập form Admin. Server khởi động bằng `node server.js` vì ban đầu cổng 4000 không chạy.

## Kết quả quan sát trực tiếp

| Nhánh | Kết quả | Bằng chứng quan sát |
|---|---|---|
| Đăng nhập hai cổng | PASS | Admin và Customer mở riêng, xác thực thật; `/api/customer/auth/login` và `/me` trả 200 |
| Khách tạo ticket → Admin | PASS | Một ticket tạo từ form khách xuất hiện ở Admin đang mở mà không reload |
| Ghi chú nội bộ | PASS | Admin nhìn thấy ghi chú đã lưu; hộp ticket khách không có nội dung PRIVATE |
| Trao đổi hai chiều | PASS | Public reply Admin đến khách; khách gửi followup và Admin thấy nội dung |
| Giải quyết ticket | PASS | Admin chọn giải thích, lưu lý do; khách thấy “Đã giải quyết” và phương án, không phát sinh tiền/voucher |
| Reload ticket hai cổng | PASS | Admin giữ hồ sơ đang mở; khách mở lại thấy đúng trạng thái và một public reply, ghi chú riêng vẫn ẩn |
| Thông báo và liên kết | PASS sau sửa | Hai notice ticket, một notice review; mở chi tiết và link đúng ticket/lịch. Modal được tháo và khôi phục cuộn sau khi bấm link |
| Review khách → Admin → khách | PASS trong phạm vi riêng tư | Gửi 5/5 chờ duyệt; Admin thấy và chuyển Ẩn; khách tự cập nhật “5/5 — Đã ẩn”, reload giữ trạng thái, lý do riêng không lộ |
| Chat khách ↔ Admin | PASS | Khách yêu cầu chuyên viên; Admin nhận ca, gửi tin, khách trả lời, Admin hoàn tất. Khách nhận system message kết thúc; reload hai cổng giữ lịch sử và một tin staff |
| Chuyển khách A → B | PASS | Đăng xuất A, đăng nhập B thật. B có ticket trống, badge 0; deep link ticket A không mở dialog, lịch A báo “Không tìm thấy lịch hẹn này.”; khung chat không lộ lịch sử A |
| Form tạo ticket lúc khởi tạo | PASS sau sửa | Ban đầu nút disabled, chỉ bật khi auth/context/handler sẵn sàng; bấm form rỗng hiện đúng lỗi kiểm tra |

Ba ảnh chỉ chứa dữ liệu thử đã xem lại: [ticket sau reload](two-portal-ticket-customer.png), [review đã ẩn](two-portal-review-customer.png), [chat hoàn tất sau reload](two-portal-chat-customer.png).

## Hai lỗi đã sửa

1. **UI-NOTICE-01:** link “Mở nội dung liên quan” chuyển hash đúng nhưng modal thông báo còn phủ lên trang và chặn bấm sau khi đóng ticket. Sửa `components/header/header.js`: dùng cơ chế close sẵn có khi click link trong chi tiết thông báo, tháo modal, gỡ listener Escape và khôi phục overflow. Kiểm lại trên notice review: mở đúng lịch, modal detached, cuộn được; không thêm query/channel/polling.
2. **UI-SUPPORT-READY-01:** form đã hiển thị và nút gửi đã bấm được khi initializer còn chờ Auth/context, khiến lần bấm đầu không chạy handler. Sửa template để nút disabled/“Đang tải…”; chỉ bật sau khi gắn handler. Kiểm lại bằng reload thật: disabled ban đầu → enabled khi sẵn sàng → validation hoạt động; không tạo ticket thứ hai.

Hồi quy `node --test scripts/test/header_notifications.test.js scripts/test/notification_sync.test.cjs`: **18 PASS**. Kiểm tra cú pháp module tạo ticket và harness fixture PASS.

## Xung đột và giới hạn

- Một lần gửi chat ngay sau nhận ca gặp HTTP 409 do snapshot cũ. Bản nháp vẫn còn, gửi lại sau refresh thành công đúng một tin; không coi đây là request bị mất hay đánh PASS tự retry. Chưa kiểm tra đầy đủ mất response sau commit, nhiều writer, hoặc gửi liên tục khi đổi quyền.
- Một số lệnh tìm phần tử ban đầu hết hạn vì chờ sai nhãn (`Hoàn tất` thay vì `Đã giải quyết`, `Ẩn` thay vì `Đã ẩn`) hoặc ref đã đổi sau render. Kết quả chỉ xác nhận sau khi đọc lại snapshot và tìm đúng nhãn; không tính các timeout này thành lỗi nghiệp vụ.
- Chưa công bố review tổng hợp lên dịch vụ thật. Publication/public filtering vẫn có bằng chứng SQL rollback riêng, chưa đóng UI E2E công bố sau commit.
- Chưa chuyển qua hai nhân viên trong UI, chưa cấu hình rule SLA thật hoặc nghiệm thu engine phân công tự động. Transfer Auth/PostgREST/Realtime có báo cáo riêng; không đồng nhất với UI transfer.
- Frontend sửa mới ở local, chưa push/deploy. Không khẳng định website Vercel đã có các bản sửa này. Upload/Storage hoãn; gateway thanh toán thật N/A theo yêu cầu. Không Logs, stress test, thanh toán, AI inference hoặc ảnh upload.

## Dọn dữ liệu và bảo vệ thông tin

[Bằng chứng committed-state và cleanup](two-portal-live-cleanup.txt): trước dọn có hai khách, một ticket, một chat, một review hidden, ba notice với ba `source_event` khác nhau và không notice nào của B. Dọn Auth/customer và các fixture liên quan theo UUID; kiểm tra không còn dữ liệu đó. Giữ **bảy audit bất biến**: ba xử lý ticket, một moderation, hai chat operation và một chat resolve. Không xóa audit hoặc vô hiệu trigger. Harness cleanup ban đầu dùng sai FK `review.appointment_id`, dừng trước khi xóa; đã sửa thành `appointment_item_id` và dọn thành công.

`scripts/test/two_portal_live_fixture.cjs` chỉ tạo/dọn fixture, không tự xác nhận toàn bộ UI. Credential tạm lưu ngoài repo và đã xóa sau dọn; không ghi mật khẩu/token vào bằng chứng. Thư mục snapshot/console `.playwright-mcp/` được gitignore vì có thể chứa nội dung phiên đăng nhập. Không dùng file JSON làm nguồn dữ liệu ứng dụng.
