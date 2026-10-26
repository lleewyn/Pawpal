# Đồng bộ lịch hẹn — 26/10/2026

Phạm vi: mã local và RPC/RLS Cloud `cpzuvaplseielhgcnqrn`. Nhánh nền `main`, SHA `d8bb56e918105865d38d01592e4255d480f65849`, cộng working tree chưa commit. Người kiểm tra: Codex. Chưa push/deploy; chưa nghiệm thu luồng UI → HTTP Auth/API → commit → portal phía kia → reload.

## Kiểm tra Cloud

`node scripts/test/sync_bookings_cloud_rollback.cjs --cloud`: **13 assertion PASS**, **112 SQL statements** trong lần chạy thành công. Một lịch Spa, một pet, hai customer A/B, một staff/ca làm và một dịch vụ/bảng giá tổng hợp; không sửa khách hoặc giá dịch vụ thật. Lịch đặt sau ngày hiện tại 30 ngày, dựa trên giờ mở cửa cấu hình, không giả định múi giờ máy.

Mọi fixture trong transaction luôn ROLLBACK; kiểm tra EXISTS theo ID sau rollback xác nhận không còn fixture. Có statement timeout 8 giây, lock timeout 3 giây. Role/claims được mô phỏng tại DB, không phải đăng nhập thật. Không dùng Supabase Logs, không stress-test, không gọi API lấy tất cả slot trong ngày hoặc tạo nhiều lịch để lấp đầy công suất.

| Kiểm tra | Expected / Actual | Kết quả |
|---|---|---|
| Báo giá thời gian quá khứ hoặc nhân viên ưu tiên không hợp lệ | Server từ chối | PASS SQL |
| Tạo với quote version sai | PT409, chưa có appointment nửa vời | PASS SQL |
| Tạo rồi retry cùng ID và payload | Cùng ID trả về, chỉ một appointment | PASS SQL |
| Retry cùng ID nhưng sửa payload | PT409 | PASS SQL |
| Admin đọc lịch User tạo | Đúng customer, pet, dịch vụ, giá 50.000 và pending | PASS SQL |
| Admin xác nhận | User đọc confirmed | PASS SQL |
| User gọi RPC quản trị để đổi trạng thái | 42501 | PASS SQL |
| Admin hủy trong savepoint riêng | User thấy cancelled; nhánh sau đó hoàn tác để dùng lại cùng fixture | PASS SQL |
| User đổi lịch và retry cùng request | Admin thấy giờ mới, pending, change_count chỉ tăng một | PASS SQL |
| B đọc/đổi/hủy lịch A theo ID | Không đọc được, RPC từ chối | PASS SQL |
| User hủy sau khi Admin xác nhận lại, rồi retry | Admin thấy cancelled, chỉ một audit hủy theo request ID | PASS SQL |
| Guest gọi quote riêng | 42501 | PASS SQL |
| Cleanup | Không còn lịch/service/pet/customer/auth fixture sau rollback | PASS SQL |

Có kiểm tra thêm phiên bản cũ bị chặn trước khi hủy. Bằng chứng máy đọc: [bookings-cloud-rollback.txt](bookings-cloud-rollback.txt). Lần khởi chạy đầu bị lỗi alias SQL `day` ở bước lấy giờ cấu hình, trước bước tạo fixture; đã sửa test và chạy lại thành công. Không sửa RPC Cloud để làm bài test qua.

## Lỗi tìm thấy và sửa local

**SYNC-BKG-B01 — giờ nhập phụ thuộc múi giờ browser.** `new Date(datetime-local.value)` hiểu giá trị theo múi giờ máy. Ví dụ nhập 10:00 trên browser UTC trước đây gửi 10:00Z, tương ứng 17:00 Việt Nam. Slot được chọn cũng có thể hiện lại thành giờ của máy, khác nhãn slot Việt Nam.

- Thêm `scripts/shared/booking-time.mjs`: chuyển wall clock Việt Nam ↔ instant UTC, có kiểm tra ngày/tháng/giờ hợp lệ.
- Form đặt lịch dùng cùng quy tắc cho bắt đầu, trả phòng, taxi lượt về, min và slot được chọn. Tóm tắt/xác nhận dùng giờ Việt Nam.
- `API.getUserBookings` trả ngày/giờ Việt Nam, không tách ngày bằng getFullYear/getMonth của máy.
- Danh sách/chi tiết ưu tiên `scheduledStartAt` từ DB cho điều kiện thao tác theo thời gian; fallback ngày/giờ cũ cũng hiểu là giờ Việt Nam.
- Modal đổi lịch và các thời gian chi tiết hiển thị theo Việt Nam. Không đổi trường dữ liệu hoặc bố cục modal, không sửa modal hủy.

Các file production của đợt này: `booking-time.mjs`, `scripts/api/api.js`, `pages/services/booking/booking.js`, `pages/user/modules/bookings/bookings.js`, `pages/user/modules/bookings/booking-detail.js`. Các diff cũ có trước đợt được giữ; không reset cả file/workspace.

## Kiểm tra offline

- `node --test scripts/test/booking_time.test.mjs scripts/test/customer_booking_read.test.mjs scripts/test/customer_booking_move.test.mjs scripts/test/customer_booking_cancel.test.mjs`: **14/14 PASS**. Gồm chuyển ngày/năm, leap day, ngày giờ không hợp lệ, mapping lịch qua nửa đêm UTC, timestamp authoritative, version/request ID/acknowledgement, số tiền thu một phần và lỗi nguồn không bị thay bằng số đoán.
- `node scripts/test/user_booking_timezone_ui.cjs`: **PASS** trên Chrome với timezone `UTC`, `America/Los_Angeles`, `Asia/Tokyo`. Chạy code thật của form Spa/hotel/taxi và modal đổi lịch, mọi transport giả lập; cùng input 10:00 Việt Nam gửi 03:00Z, preview kết thúc 10:30 Việt Nam nhất quán.
- Đã kiểm tra cú pháp các JS thay đổi và diff whitespace. Đã xem [ảnh modal đổi lịch offline](booking-move-vn-time-offline.png); ảnh là harness chức năng, không phải nghiệm thu thiết kế toàn portal/responsive.

Các bài browser/Node không gọi Cloud. Sau khi sửa timezone chỉ chạy lại offline; không lặp Cloud test khi RPC không thay đổi. Chưa đo p95 hoặc tổng egress; 112 statements là số câu SQL trong test, không phải 112 thao tác ghi hay số request của portal.

## Chưa nghiệm thu

Full E2E và Realtime delivery thật; chuyển trạng thái đang làm/hoàn thành; Admin đổi lịch qua UI; công suất đầy và cạnh tranh slot; workflow hoàn tiền cho lịch đã thu tiền; notification đúng một lần; hotel/taxi RPC hai chiều. Phần hotel/taxi hiện chỉ kiểm tra chuyển thời gian ở browser, không suy là đã PASS nghiệp vụ trên DB.

Trong quy trình đã test, User đổi lịch thực sự cập nhật cùng appointment sang pending để cửa hàng duyệt lại; hủy lịch chưa thanh toán đủ điều kiện được áp dụng trực tiếp. Không diễn giải toast hoặc lời gọi API là một yêu cầu duyệt riêng nếu schema/RPC không có luồng đó.

Rollback: hoàn tác riêng các diff timezone và file helper/test của đợt 26/10 khi cần. Không có migration hoặc thay đổi Cloud cần hoàn tác sau bài test. Không tự chạy lại các script Cloud cũ tạo nhiều lịch hoặc ghi vào dữ liệu khách lấy bằng limit(1).
