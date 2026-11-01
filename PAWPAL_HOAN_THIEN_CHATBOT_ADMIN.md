# Hoàn thiện chatbot Admin

Cập nhật 01/11/2026. Đã push main003d5e85 và smoke Admin Vercel:24/24 câu browser đạt, Trực chat/Quy định tải được, API lịch sử chặn phiên chưa đăng nhập bằng401. [Kết quả Vercel và giới hạn](docs/chatbot/admin-vercel-2026-11-01/README.md). SQL162–164 đã áp dụng trên Supabase; Gate2 vẫn mở.

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

Phát hành UI: người dùng yêu cầu push toàn bộ UI-local01–03 ngày01/11/2026; nghiệm thu Vercel cho các thay đổi UI mới vẫn còn chờ.

- [x] UI-local01/11 — Sửa câu hỏi hiện ngay/trạng thái chờ, gửi lại không lặp, lời hướng dẫn trống căn trái và nhóm tác vụ Trực chat căn phải. Browser local/API thật, ca lỗi kiểm soát và desktop/mobile đạt. [Bằng chứng](docs/chatbot/admin-ui-feedback-2026-11-01/README.md). Nghiệm thu Vercel cho UI mới còn chờ.
- [x] UI-local02 — Thêm nhãn tải rõ, nội dung hiện dần ở frontend sau xác nhận dữ liệu; Hotel thành bảng, lịch trực rỗng tự nhiên hơn, bỏTrang1/1.217 test và browser local thật đạt, không thêm nguồn đọc/model. [Kết quả và giới hạn](docs/chatbot/admin-answer-ui-2026-11-01/README.md). SSE Admin chưa triển khai; nghiệm thu Vercel cho UI mới còn chờ.
- [x] UI-local03 — Khi mới mở tab, HTML báo đang tải phiên/lịch sử ngay; bỏ lời chào tĩnh, có lỗi/thử lại, chống phản hồi cũ đè phiên mới và tải chồng bị kẹt.6 kiểm tra UI kiểm soát, hồi quy lịch sử và browser/API local thật đạt. [Bằng chứng](docs/chatbot/admin-history-loading-2026-11-01/README.md). Nghiệm thu Vercel cho UI mới còn chờ.

- [x] Phát hành main003d5e85 và kiểm tra Vercel bằng phiên Admin thật:24/24 câu, Trực chat/Quy định và chặn401 đạt. Đây là smoke các luồng đã chọn, không thay toàn bộ oracle/quyền/lỗi nguồn trên Production.
- [ ] Gate2: đo tổng lưu lượng Auth/PostgREST/database và tải nhiều phiên. Số byte nguồn đã ghi không thay phép đo này; hiện chưa có Redis/proxy dùng chung ngoài database.
- [ ] Mở thêm SLA, ưu tiên, lợi nhuận/phân nhóm hoặc luồng liên phân hệ khác khi có chính sách/công thức cụ thể. Đây là mở rộng ngoài các nguồn đã nghiệm thu, không tự tạo quy tắc thay người quản trị.
