# Đồng bộ lịch hẹn — 26/10/2026

## Bổ sung vòng đời chi tiết lịch — 26/10/2026

Sửa bổ sung guard form review: refresh nền giữ draft không vô hiệu hóa submit chỉ vì read sequence đã tăng; guard form theo mount/owner/booking, guard response đọc vẫn theo read sequence. Bài Chrome booking detail hiện có vẫn PASS; chưa có case Realtime thật để thay nghiệm thu.

Bổ sung retry qua reload: giữ riêng UUID request trong sessionStorage theo owner/booking/line trước khi gửi, kiểm tra ghi thành công; đúng acknowledgement mới xóa ID. Không lưu rating/content/token. Harness Chrome thực hiện lỗi RPC rồi navigation/reload module và nhập lại cùng nội dung: request mới dùng đúng ID cũ, PASS. Nếu nội dung đổi sau một lần có thể commit, RPC server vẫn đối chiếu và từ chối khác payload; chưa có UX phục hồi tự động nội dung hoặc E2E mất response sau commit. Gateway thật được người dùng loại khỏi phạm vi, không phải tiêu chí chặn nghiệm thu.

Bổ sung gửi review offline: `user_booking_detail_actor_ui.cjs` PASS form thật cho một dòng completed; lỗi RPC giữ nhận xét và cho retry cùng UUID, hai click lúc đang gửi chỉ một request bổ sung, ack trả đúng IDs chuyển form sang review chờ duyệt. Đổi account trong lúc submit không dựng lại section sau response. Production thêm kiểm tra button.disabled trong handler; không đổi server/RLS. Mock dùng hai lượt submit (một lỗi, một thành công); không gọi Cloud, không chứng minh idempotency server hoặc moderation thật. ID mới giữ trong closure, chưa bảo đảm retry qua reload. Không nghiệm thu lưu review qua HTTP/Auth/commit hoặc công bố review.

Bổ sung hotel/taxi/review offline: harness Chrome dùng origin localhost (crypto context an toàn), RPC giả trả thông tin phòng và taxi khứ hồi; xác minh 03:00Z thành 10:00 và nội dung chứa thẻ HTML chỉ hiện chữ. Lịch completed có một dòng dịch vụ và review đã lưu hiển thị nội dung an toàn, không có nút gửi lại. Phát hiện production thiếu định nghĩa `escapeHtml` được gọi khi render dòng dịch vụ/nhật ký; đã bổ sung hàm escape trong module và chạy lại PASS. Nhánh confirmed trước dùng items rỗng nên không phát hiện lỗi này. Chưa kiểm tra gửi review, approval/publication thật, toàn bộ trường hotel/taxi, gateway hoặc hai portal. Không gọi Cloud; sửa code còn local.

Bổ sung tiếp `user_booking_detail_actor_ui.cjs`: Chrome offline PASS cho lịch confirmed hợp lệ, mã PRIVATE-A/dịch vụ Spa, scheduled 03:00Z thành 10:00 trong browser UTC; truy vấn execution được gọi và một channel được tạo. Đổi auth khi logistics còn chờ hoặc đổi tài khoản khi execution còn chờ dọn nội dung và không tạo channel sau response. API/query/channel là mock, logistics/execution dùng dữ liệu rỗng; chưa kiểm tra nội dung nhật ký phong phú, hotel/taxi hoặc review submit. 8 test Node `booking_time.test.mjs` và `customer_booking_read.test.mjs` vẫn PASS. Không gọi Cloud; kết quả mở rộng phạm vi bài browser trước, không thay nghiệm thu hai portal.

Sửa local `booking-detail.js`: export dispose, vô hiệu hóa lượt tải khi hash/auth/storage đổi, dọn channel/listener và trạng thái booking/pet/care log. Guard owner, mount version và read version sau các bước initData, danh sách lịch, logistics, pet, care log, execution và review; callback từ phiên cũ không render hoặc dựng lại channel. Form đánh giá chặn submit/kết quả khi context đã hết hiệu lực. Không thay schema/RPC/policy.

`node scripts/test/user_booking_detail_actor_ui.cjs`: **Chrome offline PASS**, HTML/module chi tiết thật, API/channel mock, request intercepted. ID không nằm trong danh sách owner hiển thị không tìm thấy và không tạo channel; response lịch khớp đang chờ khi đổi tài khoản hoặc dispose không render dữ liệu cũ/không tạo channel. Booking-list helpers được stub; chưa kiểm tra đầy đủ màn hình lịch hợp lệ, logistics/execution/review UI hoặc thao tác submit. Không gọi Cloud/Logs/stress-test; không coi kết quả này là bằng chứng RLS, Auth/HTTP/Realtime thật hoặc toàn chuỗi hai portal.

Thay đổi sau commit đã push `0ef89a39` còn local. Các kết quả lịch hẹn SQL trước đó được giữ riêng dưới đây.

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
