# Liên kết tài khoản và kiểm soát tra cứu — 26/10/2026

## Hồ sơ vãng lai chuyển thành viên

Một khách tổng hợp mới được tạo qua `ensure_guest_customer`, kiểm tra số điện thoại ngẫu nhiên chưa có và created_at mới. Tạo một bé cưng/lịch hẹn tổng hợp; Auth thử được tạo riêng, chưa liên kết. Admin đăng nhập thật tìm đúng khách và thấy “Khách vãng lai”.

Gọi service-only `complete_customer_auth` hai lần với cùng Auth/phone thử: cùng Customer ID được trả về, chỉ một hồ sơ gắn Auth đó, Pet ID/owner và Appointment ID/customer/pet giữ nguyên. Admin đang mở tự cập nhật “Thành viên” qua cơ chế Realtime có sẵn, không gọi refresh thủ công; sau reload không có nhãn unknown. Không thêm channel/query/polling.

Khách đăng nhập qua form thật thành công, nhưng sessionStorage còn redirect của lượt thử cũ nên chuyển vào lịch cũ, không đúng trang danh sách đang chờ trong harness. Không đánh PASS việc khách nhìn thấy bé/lịch sau liên kết. Không gửi SMS, không chạy OTP UI; service RPC không thay E2E đăng ký thực. Guard OTP preview hiện không cho giả lập hồ sơ khách cũ chưa liên kết; không nới guard để chạy test.

Đã dọn Auth/khách/bé/lịch tổng hợp; kiểm tra không có ledger trước cleanup, không xóa audit/ledger, không sửa khách thực. Script `guest_activation_fixture.cjs setup|link|cleanup` là fixture workflow rõ ràng, không chạy mặc định.

## GUEST-LOOKUP-01 — truy cập lịch sử bằng số điện thoại

Rà code phát hiện `guestRecords` dùng service client đọc appointment/sales_order chỉ theo phone, chưa kiểm chứng caller ở backend. Trang return-guest tải dữ liệu trước, rồi mới hỏi OTP giả lập trong trình duyệt. Do đó rào UI không bảo vệ được API; không gửi request khai thác với số khách thật để chứng minh.

Bản sửa local:

- `guestRecords` đòi bearer được Supabase Auth xác minh, tìm hồ sơ đang active của caller, rồi đối chiếu hồ sơ phone với đúng owner trước mọi query appointment/sales_order. Thiếu token/giả token trả 401; khác chủ/bị khóa trả 403. Số điện thoại chưa xác minh, localStorage hoặc OTP flag phía browser không đủ quyền.
- Frontend gửi session bearer nếu có; API lỗi không truy vấn fallback customer_phone/appointment/sales_order. Hiển thị thông báo xác thực do backend trả bằng textContent.
- Đây là biện pháp đóng đường đọc không có quyền, **chưa phải triển khai token tra cứu riêng cho khách vãng lai**. Khách chưa có tài khoản hiện không được xem lịch sử qua endpoint này; cần bổ sung bằng chứng xác minh do máy chủ cấp cho tra cứu, độc lập với đặt lịch/mua hàng không OTP. Không thay default SMS mode, flow đăng ký hoặc cơ chế OTP khác trong đợt này. UI OTP demo còn tồn tại ở luồng cũ và không được coi là chứng minh quyền backend.

`guest_records_access.test.cjs` + `customer_auth.test.js`: **35 PASS**. Test riêng chứng minh thiếu/giả token, khách khác và khách bị khóa không chạm bảng giao dịch; đúng active owner đọc được dữ liệu giới hạn theo owner; frontend không fallback sau denied. Mock transport chỉ xác minh hành vi handler.

[Hai request HTTP thật](guest-records-http-access.txt): handler Express tại cổng loopback tạm, Cloud readiness/Auth/rate-limit thật. Phone-only và JWT giả trả 401 không có trường bookings/orders. Không dùng số khách thật, không SMS/Logs; cổng test đóng sau test. Không thay test authenticated happy path qua HTTP bằng bài này.

Frontend/backend đang sửa chưa push/deploy; không khẳng định production endpoint đã được bảo vệ bởi bản vá này. Nhánh lưu guest transaction và reuse pet có quyền vẫn tiếp tục theo kế hoạch.
