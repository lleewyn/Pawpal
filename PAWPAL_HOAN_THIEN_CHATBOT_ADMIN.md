# Hoàn thiện chatbot Admin

Cập nhật 01/11/2026. Đã hoàn thành đợt triển khai và nghiệm thu **local** bên dưới. Người dùng đã yêu cầu phát hành lên main; kết quả local chưa chứng minh Vercel đã có bản mới hoặc đã nghiệm thu. SQL162–164 đã áp dụng trên Supabase sau khi kiểm tra bằng giao dịch QA và hoàn tác dữ liệu thử.

[Báo cáo nghiệm thu](docs/chatbot/admin-completion-2026-11-01/README.md). Kết quả: **213/213 test tự động, 24/24 lượt browser mở rộng**, cùng 8 lượt browser đợt đầu. Tổng cộng30 câu khác nhau; kiểm tra đại diện, không có nghĩa hiểu được mọi cách diễn đạt.

## Công việc đã làm

- [x] AD01 — Rà23 câu thuộc19 nhóm A01–A19 với bộ định tuyến; có câu yêu cầu hỏi rõ đối tượng/ngày/gói thay vì đoán.
- [x] AD02 — Tra tên khách, bé và sản phẩm bằng cách hỏi tự nhiên; giữ bộ lọc khi phân trang. Câu hỏi điểm khách vào đúng nguồn Pawpoint.
- [x] AD03 — Kiểm tra lịch theo ngày, kỳ, buổi và KTV; SQL đối chiếu riêng lịch Spa buổi sáng. Hỏi tiếp ngày mai giữ nhóm/buổi; đổi sang sản phẩm bỏ bộ lọc lịch. KTV không tồn tại/trùng phải làm rõ trước.
- [x] AD04 — Giá Hotel có đơn vị từ cấu hình; giá tóm tắt và chi tiết chỉ lấy loại phòng gắn đúng dịch vụ. Đối chiếu SQL biên cân Spa, cân và cự ly Taxi; giá cấu hình chưa phải báo giá đã xác nhận.
- [x] AD05 — Tách trả dữ kiện trực tiếp với soạn nháp/hướng dẫn. Đã thử đúng1 lượt Gemini công khai được duyệt; bản nháp không bắt đăng ký, không xác nhận đã thanh toán hoặc duyệt lịch. Không gửi dữ liệu nghiệp vụ riêng để thử model.
- [x] AD06-local — Browser localhost thật với tài khoản Admin đã đăng nhập, API thật và Supabase thật. Kiểm tra SQL vai trò thiếu quyền/bị chấm dứt và test API lỗi/giới hạn; không suy thành kiểm thử browser tài khoản bị khóa trên Production.
- [x] AD07 — Thêm nguồn phòng Hotel khả dụng theo toàn khoảng, lượt lưu trú và chuyến Taxi. Xét trùng lịch, bé vẫn đang ở, biên nhận/trả; phân biệt phòng vật lý với sức chứa. Không tự giữ phòng hoặc điều phối tài xế.
- [x] AD08 — Đối chiếu SQL thực thu ngày/tuần/tháng, hai nhóm việc chờ, hai luồng liên phân hệ của cùng khách. Khi thiếu quyền tài chính vẫn giữ phần lịch đọc được; lỗi nguồn không thành số0.
- [x] AD09-local — Ghi kết quả, phạm vi và số nguồn/byte phản hồi/độ trễ. Không push, không đọc Cloud Logs.

## Admin hiện có thể hỏi gì

| Nhóm | Phạm vi trả lời hiện có |
|---|---|
| A01 Lịch hẹn | Ngày/kỳ tối đa31 ngày, nhóm dịch vụ, trạng thái, buổi, phân công và KTV. |
| A02 Đơn hàng | Tra theo mã; đọc trạng thái có nguồn, không tự kết luận đã thanh toán từ trạng thái đơn. |
| A03 Khách hàng | Tìm mã, tên hoặc số điện thoại theo quyền. |
| A04 Thú cưng | Hồ sơ bé, chủ nuôi và thông tin được phép đọc. |
| A05 Khiếu nại | Phiếu còn mở hoặc tra phiếu cụ thể. |
| A06 Hội thoại | Danh sách; tóm tắt hội thoại đã chọn và soạn nháp khi có nguồn phù hợp. Tóm tắt chỉ dựa phần tin được cung cấp. |
| A07 Tồn kho | Sản phẩm có tồn thấp theo cấu hình hiện có. |
| A08 Sản phẩm | Tra tên/mã, biến thể trong phạm vi nguồn. |
| A09 Bảng giá | Dịch vụ, cân nặng, cự ly và loại phòng; chi tiết cần đúng gói. |
| A10 Thực thu | Thu thành công trừ hoàn thành công theo thời điểm giao dịch; khác doanh số/lợi nhuận. |
| A11 Chính sách | FAQ/hướng dẫn đang có; thiếu nguồn thì nêu rõ, không tự tạo quy định. |
| A12 Điểm và ưu đãi | Số dư Pawpoint của khách, ưu đãi đang hiệu lực; không tự cộng điểm/cấp ưu đãi. |
| A13 Đối soát | Đã thu/đã hoàn, đơn hủy còn chênh lệch; không coi là hoàn tiền được duyệt. |
| A14 Liên phân hệ | Một khách: thú cưng và đơn mới nhất; hoặc lịch gần nhất theo hướng hỏi và phiếu còn mở. Không hỗ trợ mọi phép ghép tùy ý. |
| A15 Nhân sự | Danh sách/chức danh/trạng thái và lịch trực; lương/hoa hồng cần luồng chuyên môn. |
| A16 Hotel và Taxi | Lượt lưu trú, phòng có thể nhận trọn khoảng, chuyến Taxi theo giờ đi. Không dự đoán khả dụng tài xế. |
| A17 Việc cần kiểm tra | Hai nhóm: đơn hủy còn chênh lệch và lịch đã xác nhận chưa phân KTV. Chưa có chính sách để tính mọi SLA/quá hạn. |
| A18 So sánh | Thực thu ngày/tuần/tháng với kỳ trước theo cùng phần thời gian đã trôi qua. |
| A19 Nội dung và cấu hình | Đánh giá, bài viết và phần nội dung; cấu hình kinh doanh trong danh sách cho phép. Không đọc khóa bí mật. |

## Điều kiện tối ưu luôn giữ

JWT và quyền từng nguồn của nhân viên; tối đa3 nguồn/câu,2 đồng thời,32KiB/nguồn và64KiB/câu; danh sách10 dòng/trang, kỳ trực tiếp tối đa31 ngày. SQL timeout5s/lock1s, lease/pool/rate hiện có. Không truy vấn theo token streaming, không tải toàn lịch sử cho AI lọc. Thiếu nguồn/quyền phải nói rõ, không đoán số liệu hoặc tự ghi/sửa nghiệp vụ.

## Phần phát hành và mở rộng còn riêng

- [ ] Push code khi người dùng yêu cầu, chờ bản triển khai rồi nghiệm thu Vercel bằng phiên Admin thật. Local đạt chưa chứng minh Production đạt.
- [ ] Gate2: đo tổng lưu lượng Auth/PostgREST/database và tải nhiều phiên. Số byte nguồn đã ghi không thay phép đo này; hiện chưa có Redis/proxy dùng chung ngoài database.
- [ ] Mở thêm SLA, ưu tiên, lợi nhuận/phân nhóm hoặc luồng liên phân hệ khác khi có chính sách/công thức cụ thể. Đây là mở rộng ngoài các nguồn đã nghiệm thu, không tự tạo quy tắc thay người quản trị.
