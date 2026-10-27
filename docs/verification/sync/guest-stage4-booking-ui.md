# GĐ-04: đặt lịch guest local

Ngày 27/10/2026, Asia/Bangkok. Nối guest vào form booking hiện có; chưa push/deploy hoặc nghiệm thu committed User ↔ Admin. Không migration trong đợt này.

## Hành vi

Khi không có Auth user và browser đang ở trạng thái guest, mở chọn/thêm bé thay cho yêu cầu đăng nhập. Nếu có trạng thái member cũ nhưng Auth không hợp lệ, không tự hạ thành guest. Nhánh member tiếp tục dùng RPC và form cũ.

`booking-guest-pets.mjs` đọc context theo cookie và catalog giống/dịch vụ công khai. Không tra hồ sơ theo số điện thoại. Các bé tối đa 10 dòng mỗi trang, nút xem thêm tải trang kế tiếp theo thao tác. Giống được chọn bằng popover thuần chữ, lọc chuỗi rỗng/số/giá trị vô nghĩa và loài inactive. Form thêm bé có contact, tên, giống, cân nặng, giới tính, dị ứng/lưu ý tự do; sau lưu máy chủ xác nhận, tự chọn đúng Pet ID. Contact đã gắn phiên được hiển thị lại, không tự sửa số hồ sơ. Chỉ request ID của lần lưu pet được giữ để thử lại; không lưu contact/health/profile vào storage.

Các bước dịch vụ/lịch/xác nhận tái sử dụng form hiện có, chọn theo loài từ catalog. Context chỉ có pet tối thiểu, không tự đoán cân nặng: server quote đọc cân nặng đã lưu và trả giá thật. Spa ẩn hotel/taxi; hotel hiện phòng/trả phòng, taxi hiện địa chỉ/km/hành trình/lượt về phù hợp. Guest nhập giờ rồi server kiểm tra giá và khả dụng; chưa nối API gợi ý toàn bộ khung giờ hoặc chọn nhân viên như member.

Nhật ký booking guest chỉ giữ request ID. Khi xác nhận hoặc reload, đọc receipt trước; nếu chưa có kết quả thì dùng lại cùng mã. Thành công chỉ hiển thị từ receipt, không suy ra đã thanh toán; mã/giờ/tổng/trạng thái lấy từ server. Nút đặt lịch cho bé khác bắt đầu một request mới, giữ cookie/hồ sơ. Nhánh guest kiểm tra thay đổi tài khoản; API client vẫn chặn gửi guest khi đã đăng nhập.

## Lỗi UUID phát hiện qua catalog thật

Mã một số dịch vụ cũ có dạng canonical UUID nhưng không có bit phiên bản RFC v1–8. PostgreSQL nhận các mã này; regex mới trước đó từ chối, trong khi fixture v4 vẫn PASS. Đã sửa validators API, client và giỏ guest để nhận đúng chuỗi UUID canonical mà DB dùng, không bỏ kiểm tra định dạng hoặc quan hệ quyền/giá/tồn. Thêm hai regression test cho service ID và variant ID cũ. Không sửa ID/catalog/SQL hoặc nới quyền RPC.

## Kiểm thử

[Rollback SQL từ luồng browser](guest-booking-browser-rollback.txt): **37 SQL**, một pet và một booking ở lượt PASS cuối; kiểm tra toàn bộ ràng buộc trì hoãn rồi rollback, còn 0 pet/booking/customer thử. Các lượt tìm lỗi UUID trước cũng kết thúc rollback, không giữ fixture.

Playwright MCP dùng context riêng và frontend thử cổng 4001. Route guest được chuyển tiếp sang HTTP handler thật của `guest_booking_browser_bridge.cjs` ở 4002, gọi RPC đã cài trên Cloud dưới service role trong transaction rollback. Catalog/giống vẫn qua Supabase REST công khai thật. **Không giả lập quote/create/receipt** ở lượt spa này. Bridge dùng clock theo DB và bypass rate limiter cho thử UI, do đó không dùng kết quả này nghiệm thu rate limit, Vercel hay commit/Realtime.

Luồng PASS: không login/OTP → thêm pet 5 kg → tự chọn pet → chọn Express Care → nhập giờ → quote 80.000 đ/30 phút → đồng ý → create/receipt → reload cùng mã. Không lỗi page JavaScript. Kiểm tra spa không có trường hotel/taxi. Receipt được xem ảnh dưới `.playwright-mcp/guest-booking-real-sql-receipt.png`.

Lượt UI riêng ở 390 px dùng catalog thật nhưng intercept context/lưu pet: hotel có phòng/trả phòng, popover phòng có dữ liệu; taxi có địa chỉ/km và trường lượt về đúng hành trình; không tràn ngang, không lỗi page. Ảnh `.playwright-mcp/guest-booking-taxi-mobile.png` đã xem. Không dùng lượt này thay bằng chứng tạo lịch hotel/taxi thật.

Lượt riêng cho receipt dùng response intercept: pending → Chờ xác nhận, confirmed → Đã xác nhận, completed → Hoàn tất, cancelled → Đã hủy. Không sửa trạng thái trên Cloud.

**72 test Node PASS** cho Auth/access/cookie/client/cart/HTTP guard và mapping pet. Hai test mới lọc catalog giống và bảo đảm mapping không tự thêm cân nặng/owner/phone. Syntax và whitespace checks PASS. Không dùng Supabase Logs, stress test, gateway, SMS hoặc Storage. Các server thử được dừng sau lượt kiểm tra.

## Chưa nghiệm thu

Sửa contact/bé guest, gợi ý khung giờ và nhân viên, validation đủ mọi trường, UI guest mất/đổi phiên và nhiều bé đồng thời, Auth link tự nguyện/SMS thật/return-guest, hồi quy member đầy đủ, booking hotel/taxi committed, đơn shop committed, đồng bộ Admin/User và chống lặp sau commit. GĐ-03/04/05 tổng thể còn mở. Ba dấu mới mục booking chỉ áp dụng phạm vi local/rollback đã ghi.
