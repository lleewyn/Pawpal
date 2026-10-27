# Đặt lịch guest committed, Admin và đăng nhập sau liên kết

Ngày 27/10/2026, Asia/Bangkok. Frontend/API local tại `http://localhost:4001`, Supabase Cloud thật. Chrome dùng các browser context riêng cho Admin, guest và thành viên; không mock API hoặc chèn user/Auth session giả vào ứng dụng. Không push/deploy, không migration trong đợt này.

## Kết quả đã quan sát

| Nhánh | Kết quả | Phạm vi |
|---|---|---|
| Admin đăng nhập | PASS | Form Admin dùng Auth thật; mở module Dịch vụ |
| Guest tạo bé và lịch spa | PASS | Một hồ sơ/bé mới, Express Care; không đăng nhập/OTP, chọn xác nhận chính sách trước khi gửi. Receipt 404 trước create, create 200, receipt 200; một lịch pending committed, không payment |
| Sửa bé guest | PASS | Form sửa bé ghi đúng Pet ID đã có, không tạo thêm owner/pet; thay đổi committed |
| Admin tự cập nhật tên bé sau sửa | PASS sau sửa GUEST-RT-01 | Không reload Admin; WebSocket nhận `pet_profile`, bộ debounce làm mới danh sách một lần |
| Admin xác nhận lịch | PASS | Mở đúng hồ sơ QA, bấm Xác nhận lịch và xác nhận trong modal; DB chuyển confirmed |
| Khách xem trạng thái sau Admin duyệt | PASS | Mở trang tra cứu receipt bằng cookie, thấy “Đã xác nhận”. Đây là thao tác mở/đọc lại, không phải push Realtime tự động ở guest |
| Liên kết tài khoản giữ ID | PASS theo fixture | Auth QA có phone/email được admin xác nhận sẵn; gọi service-only `complete_guest_customer_auth`, giữ Customer ID/Pet ID/Appointment ID. Không thử SMS/OTP |
| Admin đổi nhãn sau liên kết | PASS | Module đang mở tự đổi sang Thành viên, không reload |
| A đăng nhập và xem lại dữ liệu | PASS | Đăng nhập phone/mật khẩu qua form thật; trang Bé cưng thấy bé cũ, trang Lịch hẹn thấy đúng BKG; SQL đối chiếu owner/pet không đổi |
| Đăng xuất A → đăng nhập B | PASS | Thực hiện nút đăng xuất và form đăng nhập B trên cùng browser context. B có danh sách lịch trống, không lộ tên bé/mã lịch A; deep link lịch A báo không tìm thấy |
| INSERT lịch mới đến Admin sau bản sửa | RETEST | Lịch mới được tạo trước khi phát hiện lỗi channel. Sau sửa đã chứng minh UPDATE pet và linkage đến qua Realtime; chưa tạo lịch thứ hai để xác nhận riêng INSERT |
| Reload cuối hai cổng | NOT RUN | Lượt harness cuối chờ sai ô tìm kiếm đang ẩn vì Admin khôi phục tab chi tiết; không đánh PASS lượt này |

Trong quá trình chạy, harness bị reset khi chờ thao tác trên nút gửi đang disabled do chưa tick chính sách. Đối chiếu DB xác nhận chưa có lịch, rồi khôi phục đúng cookie HttpOnly đã cấp cho fixture để tiếp tục, không tạo thêm hồ sơ hoặc giả mạo binding. Các timeout do chờ UI sai bước (chưa xác nhận modal, tab chi tiết khôi phục sau reload) được phân biệt với lỗi ứng dụng; chỉ các bước đã có kết quả được đánh PASS.

## GUEST-RT-01 — bảng đăng ký cũ làm hỏng channel Dịch vụ

Trước sửa, booking đã committed và RPC tìm theo contact trả một kết quả, nhưng danh sách Admin vẫn rỗng. Channel có trạng thái `joined`; metadata WebSocket cho thấy `phx_reply: ok` trước thông báo `system: error`:

`Unable to subscribe to changes with given parameters ... table: room_type ...`

Module đã đăng ký `hotel_room_type` đúng từ trước, nhưng còn một dòng đăng ký `room_type` cũ. Một tham số sai khiến subscription PostgreSQL của toàn channel bị từ chối. Không phải lỗi phân quyền của khách hoặc thiếu dữ liệu booking.

Sửa đúng một dòng trong `pages/admin/modules/services/services.js`: bỏ đăng ký `room_type` cũ. Không đổi schema/RLS/quyền, không thêm channel, bus hoặc polling. Phương án relay liên module đã được khảo sát nhưng bỏ trước khi chốt thay đổi vì không giải quyết đúng nguyên nhân.

Sau reload bản sửa: join có **27** bộ lọc, `system: ok` với “Subscribed to PostgreSQL”, rồi nhận `postgres_changes` cho `pet_profile`. Sửa tên bé qua UI guest làm Admin tự cập nhật đúng; thống kê DataStore ghi một sự kiện, một lần refresh, một lần invalidate. Sau liên kết Auth, nhãn khách cũng cập nhật thật. Giữ debounce 400 ms và phân trang tối đa 10 dòng hiện có.

[Kiểm tra contract Realtime](guest-admin-realtime-contract.txt): `node scripts/test/admin_service_realtime_contract.cjs --verify-cloud`, một query metadata xác nhận cả 27 bảng đăng ký tồn tại và có trong publication. Không đọc Logs hoặc sửa publication.

## Hồi quy và dọn fixture

- `node scripts/test/admin_services_bookings_ui.cjs`: PASS phân trang/tìm kiếm/trạng thái lỗi bằng browser fixture.
- `node scripts/test/test_phase2_datastore.js`: 8 kiểm tra cache/single-flight/invalidation/event bus PASS. Không giữ thay đổi kiến trúc DataStore.
- [Dọn dữ liệu committed](guest-committed-ui-cleanup.txt): trước dọn có hai khách/Auth QA, một bé và một lịch confirmed đúng owner/pet; không đơn hàng, payment hoặc điểm thưởng. Đã xóa đúng fixture theo UUID và kiểm tra còn 0 dòng nghiệp vụ thử, hai Auth user đã xóa; file credential/cookie riêng ngoài repo đã xóa.
- Giữ hai audit bất biến `GUEST_BOOKING_CREATE` và `UPDATE_APPOINTMENT`; không tắt trigger hoặc xóa ledger/audit. Không gửi SMS/email, thu/hoàn tiền, upload hoặc gọi AI inference.

Script `guest_committed_ui_cleanup.cjs --cleanup` là harness dọn fixture và kiểm tra số liệu committed, không tự xác nhận mọi thao tác UI. Credential/cookie/mã riêng chỉ ở file private ngoài repo trong lúc chạy; không ghi vào bằng chứng công khai.

Đợt này chưa nghiệm thu signup/OTP thật, checkout committed hai cổng, nhiều writer sau commit, hồi quy toàn bộ thành viên hoặc triển khai Vercel. GĐ-05/GĐ-06 vẫn mở. Kết quả mới bổ sung cho các test SQL rollback trước đó, không thay chúng thành nghiệm thu toàn hệ thống.
