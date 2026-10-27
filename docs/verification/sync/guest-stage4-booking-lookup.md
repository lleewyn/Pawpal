# Từ đặt lịch thành công sang tra cứu

Ngày 27/10/2026, Asia/Bangkok. Đã nối local nút “Tra cứu lịch hẹn” với panel receipt trên trang `/return-guest`. Chưa push/deploy, không migration hoặc commit giao dịch thử.

Nút mang theo ID lịch qua query `booking`, không tự chuyển trang, không truyền tên/phone/token. ID chỉ chọn lịch cần đọc; quyền vẫn do API kiểm tra signed cookie, binding hồ sơ và phiên đã tạo lịch. Người dùng biết mã/ID hoặc phone không được cấp quyền từ URL.

`guest-booking-lookup.mjs` chỉ gọi action `booking-receipt` qua client chung, không tra phone, đọc bảng private trực tiếp, gửi OTP hoặc fallback dữ liệu. URL rõ ràng được ưu tiên; nếu mở trang tra cứu không có query, có thể dùng ID yêu cầu gần nhất trong sessionStorage. Không có ID thì không gọi receipt. Link sai định dạng bị chặn trước API; server trả sai ID/ngày/tổng cũng không render thành kết quả hợp lệ.

Panel hiển thị mã lịch, trạng thái, giờ bắt đầu/kết thúc và tổng dự kiến từ receipt. “Cập nhật trạng thái” tải theo thao tác, không polling. Lỗi quyền không hiện các trường dữ liệu; thay đổi tài khoản xóa panel data, khóa refresh và chặn response đang chờ xuất hiện lại. Nội dung server đưa vào DOM bằng `textContent`. Giữ nguyên form tra cứu cũ bên dưới; không đánh hoàn tất luồng phone/OTP hoặc lịch sử khi mất cookie.

## Kiểm thử

- [UI → HTTP → SQL Cloud rollback](guest-booking-lookup-rollback.txt): luồng spa thật, lưu pet/quote/create/receipt → bấm nút → trang tra cứu cùng mã, pending và 80.000 đ → bấm refresh. Không dùng response fixture cho luồng này; bridge bypass rate limiter như đợt booking trước. 37 SQL, một pet/một booking, chạy deferred constraints rồi rollback; còn 0 dòng fixture. Không gọi phone lookup hoặc guest-records, không lỗi page JavaScript.
- Phiên browser mới, ID ngẫu nhiên không có binding: request receipt qua local backend/Cloud thật trả **401**, render 0 trường private, không phone/history fallback. Không truy vấn lịch thật của người khác.
- UI ở 390 px với session/receipt intercept riêng: nút mở đúng ID, refresh pending→confirmed, URL không có phone/token, đổi tài khoản xóa kết quả/khóa nút. Không tràn ngang hoặc lỗi JavaScript. Đây là test UI, không phải cập nhật trạng thái thật từ Admin.
- **77 test Node PASS**: bộ 72 trước và năm test cho chọn đúng ID thay phone, link sai không gọi API, đúng action/ID, từ chối không fallback, response sai ID/ngày/tổng không render. Syntax/whitespace PASS.

Ảnh `.playwright-mcp/guest-booking-lookup-mobile.png` và `guest-booking-lookup-real-sql.png` đã kiểm tra local; không đưa vào git. Báo cáo booking trước giữ riêng tại `guest-booking-browser-rollback.txt`. Runner có cờ `--lookup-run` để ghi bằng chứng mới vào file riêng. Các server thử được dừng sau kiểm tra.

## Giới hạn

Đây là tra cứu đúng một lịch được cookie hiện tại cho phép. Chưa nghiệm thu tìm lại hồ sơ sau mất phiên, xác minh phone/OTP thật, danh sách toàn bộ lịch guest, Auth link UI, kiểm thử committed Admin/User hoặc phát hành. Không đưa OTP vào quá trình đặt lịch/mua hàng, không tự nới quyền theo query ID. Gate GĐ-03/04/05 vẫn mở.
