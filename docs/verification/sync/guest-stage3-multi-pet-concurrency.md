# Kiểm tra nhiều bé và hai writer guest

Ngày 27/10/2026, Asia/Bangkok. Không thay schema hoặc mã nghiệp vụ; chạy RPC đã cài trên Cloud được người dùng cho phép. Dữ liệu thử nằm trong transaction rollback, không commit hồ sơ, lịch, dịch vụ, phòng hoặc audit.

## Nhiều bé

Lệnh: `node scripts/test/guest_booking_cloud.cjs --verify-installed`.

[33 kiểm tra, 336 SQL PASS](guest-booking-installed-rollback.txt). Bộ kiểm tra đi qua HTTP loopback thật, handler hiện tại và RPC SQL Cloud dưới role service. Kiểm lại spa, hotel, taxi, giá, giờ hoạt động, duration, retry và quyền phiên; dùng catalog thử chưa commit. Không gửi SMS hoặc gọi gateway.

Hai bé trùng tên trong cùng phiên có hai Pet ID. Tạo lịch riêng cho từng bé, kiểm tra cùng Customer ID nhưng khác Appointment ID/Pet ID; lịch đầu giữ nguyên. Retry lịch thứ hai không tạo thêm lịch. Cả hai receipt chỉ phiên tạo được đọc; phiên khác dù trùng phone vẫn bị từ chối. Chạy `SET CONSTRAINTS ALL IMMEDIATE` trước rollback để kiểm tra các ràng buộc trì hoãn. Sau rollback không còn lịch thử, các RPC đã cài vẫn tồn tại; định nghĩa quote/availability của member giữ nguyên baseline.

Chế độ `--verify-installed` không chạy lại migration và xuất bằng chứng riêng, giữ nguyên báo cáo trước khi áp dụng migration 114.

## Hai kết nối đồng thời

Lệnh: `node scripts/test/guest_session_serialization_rollback.cjs --verify-cloud`.

[Ba kiểm tra PASS](guest-session-serialization-rollback.txt). Hai kết nối PostgreSQL riêng, role service, gọi RPC lưu bé thật với cùng hash phiên. Writer A tạo dữ liệu chưa commit; writer B phải chờ khóa advisory của A. Kiểm tra qua `pg_blocking_pids` và khóa đang chờ, không đọc Supabase Logs. Giới hạn chờ khóa 5 giây, statement 8 giây và tối đa 10 lần quan sát cách nhau 100 ms; không phải stress test.

Rollback A giải phóng khóa; B hoàn tất với một binding hồ sơ, gửi lại cùng Pet ID trả bản ghi cũ. Kiểm tra deferred constraints, rollback B, xác minh không còn pet/session thử từ cả hai kết nối. Không sửa catalog công khai hoặc dữ liệu khách thật.

## Phạm vi chưa đạt

Bài hai writer chứng minh khóa thực sự tuần tự hóa lời gọi; chưa chứng minh hai yêu cầu sau commit trả cùng hồ sơ/giao dịch, hoặc ngăn bán vượt tồn khi cạnh tranh. Các mục concurrency/chống ghi nhận lặp tổng thể tiếp tục để trống. Giao diện nhiều bé, SMS thật, commit/Realtime hai portal và phát hành chưa nghiệm thu. Gate GĐ-03 chưa đóng; không push/deploy trong đợt này.
