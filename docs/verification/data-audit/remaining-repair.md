# Sửa các phần còn lại và giới hạn băng thông

## Đã áp dụng trực tiếp trên Supabase

- Sửa nguyên nhân 404 của thông báo phản hồi: bổ sung bảng riêng đang thiếu, RPC đọc/đánh dấu đã đọc, và trigger tương thích với luồng trả lời hiện tại. Không áp hàng loạt migration hay sửa luồng xử lý khiếu nại khác.
- Không tạo thông báo lịch sử hoặc thông báo giả. Khi vừa sửa, API trả unread=0 và items rỗng.
- Kiểm tra bằng tài khoản Admin thật: RPC hoạt động; truy cập ẩn danh bị từ chối.
- Khóa đúng 6 hồ sơ khách kiểm thử đã xác minh qua RPC hiện có và có lịch sử thao tác thật. Không đổi tên thành khách giả mới, không thêm khách hoặc giao dịch thử.
- Đã thử khóa rồi ROLLBACK trước khi áp dụng. Sáu hồ sơ hiện đều locked; 1.701 điểm, thanh toán đã ghi sổ 110.000đ và các khách khác giữ nguyên.
- Bản sao lưu đặt ngoài webroot/Git trong D:/Aboutme/Pawpal-infra/supabase-local/backups/notice-repair-2026-11-11T04-06-04-287Z và test-profile-lock-2026-11-11T04-08-40-957Z.

## Giảm request thông báo — thay đổi mã ở local

- Gom sự kiện trong 300ms, giới hạn làm mới nền mỗi 30 giây và gộp các yêu cầu đang chạy.
- Không gọi lại khi cửa sổ lấy focus mà hộp thông báo đang đóng; bỏ qua sự kiện danh mục không liên quan.
- Có một lần làm mới cuối thời gian chờ để không mất cập nhật; người dùng mở hộp thông báo vẫn được làm mới ngay.
- Bỏ kết quả cũ khi đổi tài khoản. Bài kiểm tra ngoại tuyến đã mô phỏng các đợt 100 sự kiện và xác minh không gọi dồn hoặc lộ dữ liệu giữa tài khoản.
- Sau lần ngắt, chỉ kiểm tra lại ở local, không chạy lặp thao tác Supabase. Bổ sung và kiểm tra trường hợp request chậm: giữ lại một lần làm mới sau thời gian chờ nếu có sự kiện mới trong lúc request trước đang chạy.
- Chưa push/deploy thay đổi JavaScript; không tự coi yêu cầu sửa là yêu cầu push.

## Lượng kiểm chứng HTTP

Lượt kiểm chứng cuối dùng 5 request, nhận 2.569 byte payload phản hồi được đo trong trình kiểm tra. Không tải ảnh hoặc truy vấn Supabase Logs. Con số này chỉ là lượng payload của lượt HTTP kiểm chứng, không phải tổng băng thông tính phí của mọi thao tác SQL/schema.

## Các dữ liệu chưa tự thay đổi

- 14 hồ sơ thiếu tên đều không có tài khoản đăng nhập; đây là nhóm khách vãng lai. Không đủ căn cứ kết luận chúng là dữ liệu lỗi hoặc tự tạo họ tên/bản ghi hồ sơ mới.
- Lịch quá hạn còn lại không có thanh toán thành công hoặc dấu thời gian tiếp nhận/trả bé trong các trường đã kiểm tra. Điều đó chưa chứng minh lịch đã hoàn tất hoặc phải hủy; không tự ghi kết quả nghiệp vụ chỉ để làm mất cảnh báo.
- Có 42 lịch trong nhóm trên: 34 pending, 7 confirmed và 1 in_progress. Đây là danh sách cần quyết định nghiệp vụ; không coi toàn bộ là dữ liệu thử chỉ dựa trên ngày quá hạn.
- Nhân viên Test còn lại đã nghỉ việc, bị khóa đăng nhập và đứng tên 28 tin nhắn. Giữ nguyên tác giả để bảo toàn lịch sử.
- Không tắt trigger bảo vệ điểm/tiền, không xóa sổ đã ghi hoặc tạo bút toán bù để lách ràng buộc.


## Appointment records requiring business confirmation
- BKG-GUEST-001 | Chờ xác nhận | 15:00:00 13/7/2026 | c06036fb-da50-44d3-92e2-fd1665908332
- APP-1784708053693 | Chờ xác nhận | 09:00:00 23/7/2026 | 4bf01555-a02c-4e0e-907d-6904510af6d8
- APP-1784651149915 | Chờ xác nhận | 10:00:00 23/7/2026 | 14282769-d103-4627-a51e-b6b1c8ab1bfa
- APP-1784709676050 | Chờ xác nhận | 11:00:00 23/7/2026 | d96fb39a-0d3d-458b-8b2a-02aa426800a2
- APP-1784708733970 | Chờ xác nhận | 11:00:00 23/7/2026 | 83535279-47ee-428a-99fa-830db1b7086d
- APP-1784707284651 | Chờ xác nhận | 11:30:00 23/7/2026 | 5a2a78d3-06fb-421f-9ed9-c65d7904ff7f
- APP-1784708534497 | Chờ xác nhận | 16:30:00 23/7/2026 | f92cb61c-6e8e-4791-8b11-33e258133314
- APP-1784707131814 | Chờ xác nhận | 10:00:00 24/7/2026 | 8ed307d8-cb91-4502-a997-6341036f5323
- APP-1784709728407 | Chờ xác nhận | 11:30:00 24/7/2026 | 9a1aa41b-fb5d-4654-91d9-f9ac578ff2bd
- APP-1784706786565 | Chờ xác nhận | 12:30:00 24/7/2026 | 7a224541-8d77-47ac-83ec-ce5e110bdd0c
- APP-1784708570435 | Chờ xác nhận | 14:30:00 24/7/2026 | b2a15250-846a-41b8-8f12-9bd4c8d3ebb9
- APP-1784708303889 | Chờ xác nhận | 17:00:00 25/7/2026 | ec391582-d70d-467f-89ee-061351f90dfd
- APP-1784706811215 | Chờ xác nhận | 18:00:00 25/7/2026 | 824485e2-d1ab-49d4-9264-9ffcae31d90c
- APP-1784707229481 | Chờ xác nhận | 11:00:00 31/7/2026 | 279016f8-caa2-463a-9278-fb6f29d17d1e
- APP-1784707259943 | Chờ xác nhận | 11:00:00 31/7/2026 | ebbe2151-6aab-4c48-8083-b0cf7b048227
- APP-1784709617391 | Chờ xác nhận | 17:30:00 31/7/2026 | 084942d4-1bac-4cd2-8e66-10ae1ed00569
- APP-1783547146-1 | Chờ xác nhận | 10:00:00 10/8/2026 | 64db87dd-6080-4270-b4bf-607b43beff54
- APP-1783547698-CANCEL | Chờ xác nhận | 10:00:00 10/9/2026 | f0a23bd3-3748-4e5b-9992-a4a9615217d1
- APP-1791037234640 | Chờ xác nhận | 20:30:00 7/10/2026 | 31279816-c8f6-45b7-9460-7f0761d9935f
- APP-1791698744423 | Chờ xác nhận | 17:00:00 11/10/2026 | eccf45ae-9198-4cab-90e1-d390fed08330
- APP-1791711934420 | Đã xác nhận | 20:00:00 11/10/2026 | 9cc08c22-c2ab-468a-a6fe-f643d81f00f6
- APP-1791994127798 | Chờ xác nhận | 11:00:00 15/10/2026 | eff7725d-f0d2-46d0-a6fb-60c8f42dfd2a
- APP-1791037215950 | Đang thực hiện | 16:00:00 15/10/2026 | e7c221e6-d72e-4fbe-a9f6-2cac7252658a
- APP-1792036829782 | Chờ xác nhận | 10:00:00 16/10/2026 | 757c4ab9-ec3b-48bb-89b9-3eba5b45e38b
- APP-1791037802004 | Chờ xác nhận | 21:30:00 16/10/2026 | 4972bdb3-9392-470d-8d4e-fb61dbebee7c
- APP-1792168128821 | Chờ xác nhận | 11:00:00 17/10/2026 | af57b254-1920-4d4a-ac3b-caed509396a8
- APP-1792168232726 | Chờ xác nhận | 12:00:00 17/10/2026 | e607d936-7bea-4a4d-a5c4-a2c96b6d30d5
- APP-1792204069769 | Chờ xác nhận | 14:00:00 17/10/2026 | 1dce0d92-27c0-4410-8819-05f8cdfe34eb
- APP-1792243100418 | Chờ xác nhận | 11:00:00 18/10/2026 | a2a90a14-c19a-4348-ba28-e529ab80d38d
- APP-1792243889763 | Chờ xác nhận | 11:30:00 19/10/2026 | a24e2e30-26a3-4378-9885-b3195e872878
- APP-1791038004646 | Chờ xác nhận | 23:00:00 22/10/2026 | df949da2-534d-4ccc-9d13-2dc25e03bd85
- APP-1791036962552 | Chờ xác nhận | 21:00:00 23/10/2026 | 8da43cfc-3888-4fcc-9934-0d2398d5474a
- APP-1791994723572 | Chờ xác nhận | 21:00:00 23/10/2026 | 012fb7ed-c8c8-4830-86df-ae970bb4c450
- BKG-B3D26BB1E5454DF4A4EE671D22EF9B8E | Đã xác nhận | 04:00:00 25/10/2026 | b3d26bb1-e545-4df4-a4ee-671d22ef9b8e
- BKG-A4B8608655B943578E1CDF9CA00EC49F | Đã xác nhận | 12:47:00 26/10/2026 | a4b86086-55b9-4357-8e1c-df9ca00ec49f
- BKG-03C15AF8B6D2458B88D7C8A1DFA54141 | Đã xác nhận | 00:06:00 1/11/2026 | 03c15af8-b6d2-458b-88d7-c8a1dfa54141
- BKG-C019813C6C884964A73DE828BD9026E7 | Chờ xác nhận | 17:37:00 1/11/2026 | c019813c-6c88-4964-a73d-e828bd9026e7
- BKG-1A4C691C85F94094847D80863F4B6CEC | Đã xác nhận | 19:39:00 1/11/2026 | 1a4c691c-85f9-4094-847d-80863f4b6cec
- BKG-9DEE8C0E785649FF9CD382C78315BFBE | Đã xác nhận | 20:00:00 1/11/2026 | 9dee8c0e-7856-49ff-9cd3-82c78315bfbe
- BKG-30659DD5E49646FE9E83F7DF0E148378 | Chờ xác nhận | 20:30:00 1/11/2026 | 30659dd5-e496-46fe-9e83-f7df0e148378
- BKG-909C85348B8C47778FCDA3A0143B8774 | Đã xác nhận | 10:30:00 2/11/2026 | 909c8534-8b8c-4777-8fcd-a3a0143b8774
- BKG-D52E2AD8B38F417AAF12A1E68236B71F | Chờ xác nhận | 09:35:00 6/11/2026 | d52e2ad8-b38f-417a-af12-a1e68236b71f
