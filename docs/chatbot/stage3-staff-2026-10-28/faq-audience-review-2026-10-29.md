# G3.4 — Đối chiếu đối tượng và nguồn thiếu thông tin

Ngày đối chiếu: 29/10/2026. Phạm vi: mã nguồn và kiểm thử offline, không truy vấn hoặc sửa database Cloud, không gọi thêm Gemini.

## Đặt lịch theo đối tượng

| Đối tượng | Hành vi trong mã nguồn | Cách hướng dẫn phù hợp |
|---|---|---|
| Khách vãng lai | `booking.js:init` chọn nhánh guest khi không có người dùng Auth và `isGuestShopper()` đúng. API phát cookie phiên khách; tạo lịch đi qua `guest_booking_create`. | Có luồng đặt lịch dành cho khách vãng lai; cần thông tin liên hệ, hồ sơ bé và phiên khách hợp lệ. Không nói mọi khách đều phải đăng nhập thành viên. |
| Thành viên | Nhánh tài khoản nạp hồ sơ, bé cưng của tài khoản và gọi `create_own_service_booking`. Khi không đủ điều kiện guest và không có Auth, màn hình yêu cầu đăng nhập. | Đăng nhập để chọn hồ sơ bé của tài khoản và đặt lịch theo luồng thành viên. |
| Cả hai | Kiểm tra giờ, báo giá rồi gửi yêu cầu; màn hình biên nhận phân biệt đã tiếp nhận với đã thanh toán. | Không hứa giờ còn trống, phân công KTV, đã duyệt hoặc đã thanh toán chỉ từ FAQ. |

Nguồn đối chiếu:

- [Màn hình đặt lịch](../../../pages/services/booking/booking.js): `init`, `quote`, nhánh xác nhận guest/member và biên nhận.
- [Điều kiện khách vãng lai](../../../scripts/shared/guest-cart.mjs): `isGuestShopper`.
- [Thông tin liên hệ và bé của khách](../../../pages/services/booking/booking-guest-pets.mjs).
- [API phiên khách](../../../scripts/api/guest_commerce.js): `session`, `booking-quote`, `booking-create`.
- [SQL đặt lịch khách](../../../scripts/database/v1/114_guest_booking.sql): phiên phải hợp lệ, khách chưa liên kết Auth, kiểm tra chủ sở hữu bé và báo giá trước khi tạo lịch.

Các liên kết nguồn dưới đây tính từ thư mục tài liệu này; mã nguồn không chứng minh phiên bản Production đã triển khai đầy đủ các migration.

## FAQ đề xuất để cập nhật qua nguồn nghiệp vụ

Đã chuyển đề xuất này thành migration150 có điều kiện và rollback; 7 nhóm PostgreSQL local đạt, môi trường riêng đã dọn. Chưa áp vào FAQ Cloud. [Kết quả](../stage3-faq-2026-10-29/README.md).

**Đặt lịch PawPal như thế nào?**

Chọn dịch vụ, nhập hoặc chọn thông tin bé cưng, chọn thời gian phù hợp, kiểm tra báo giá và gửi yêu cầu đặt lịch. Thành viên đăng nhập để sử dụng hồ sơ bé của tài khoản. Khách vãng lai có thể dùng luồng dành cho khách vãng lai, cung cấp thông tin liên hệ và hồ sơ bé; cần giữ phiên khách hoặc thông tin khôi phục để xem lại yêu cầu. Sau khi gửi, hãy kiểm tra biên nhận và trạng thái lịch; đã tiếp nhận yêu cầu chưa có nghĩa là đã thanh toán hoặc đã được cửa hàng duyệt.

Đây là nội dung đề xuất dựa trên mã nguồn. Chưa cập nhật FAQ trong Supabase; chatbot đang đọc FAQ cũ sẽ chưa tự nhận đoạn đề xuất này. Câu cũ “thành viên cần đăng nhập” phù hợp nhánh tài khoản nhưng thiếu hướng dẫn riêng cho khách vãng lai. Không chèn FAQ tĩnh vào dữ liệu chạy ứng dụng.

## Thay đổi đã thực hiện

- Chỉ dẫn dùng chung tại `requestGemini` yêu cầu trả lời trực tiếp phần có nguồn, nêu rõ phần thiếu giá/tiện ích/điều kiện; không thay bằng lời hứa “có thể giúp so sánh”. Quy định của một nhóm không được mở rộng sang nhóm khác.
- Hướng dẫn Admin bỏ qua FAQ có câu trả lời trống. Nếu không còn FAQ sử dụng được, trả thông báo thiếu hướng dẫn và không gọi model; vẫn báo số lượt đọc đã sử dụng.
- Không thêm RPC, đọc nguồn, polling, dịch vụ hoặc thay đổi giới hạn database. Giữ ngân sách tối đa 3 nguồn/lượt, 2 nguồn đồng thời, 32 KiB/nguồn, 64 KiB tổng; câu trả lời giá Admin tiếp tục dùng công cụ dữ liệu có quyền.

## Kiểm chứng và giới hạn

- 56 kiểm tra chatbot offline đạt, gồm 3 kiểm tra mới cho cấu hình SDK thực tế bằng SDK giả lập, FAQ trống và chỉ chuyển FAQ có câu trả lời. Chúng kiểm chứng đường code và chỉ dẫn được truyền, không chứng minh model thật sẽ luôn tuân thủ.
- 16 kiểm tra guest đạt, gồm kiểm tra mới: tạo phiên khách rồi gọi nhánh tạo lịch không cần thành viên Auth; thiếu cookie bị chặn trước RPC. RPC được giả lập, không phải thử tạo lịch thật hoặc chứng minh RLS/SQL trên Cloud.
- 40 ca định tuyến/nghiệp vụ và hợp đồng API hồi quy đạt.
- Hai phản hồi Gemini cũ và gói payload đã đồng ý giữ nguyên. Đánh giá thật vẫn **PARTIAL**; không dùng kiểm tra offline để đổi kết luận mẫu Hotel thành đạt.

G3.4 còn mở: cập nhật/kiểm chứng FAQ chính thức trong nguồn nghiệp vụ, bổ sung nguồn nhóm C, đánh giá thêm chất lượng thực tế. Gate 2 và việc triển khai Cloud vẫn chưa hoàn thành.
