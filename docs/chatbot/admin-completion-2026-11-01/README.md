# Nghiệm thu Admin — 01/11/2026

Đã hoàn thành các mục local AD01–AD09 trong [file công việc](../../../PAWPAL_HOAN_THIEN_CHATBOT_ADMIN.md). Không push. SQL162–164 đã áp dụng; dữ liệu QA được rollback. Không sửa đơn/lịch/hồ sơ thật, không đọc Cloud Logs.

## Thay đổi chính

- Hỏi tên khách/bé/sản phẩm và điểm khách tự nhiên hơn; ngày mai, Hotel/Taxi và so sánh có định tuyến xác định.
- Nguồn mới: số phòng có thể nhận trọn khoảng, lượt lưu trú và chuyến Taxi. Số phòng không phải tổng sức chứa; bé còn trạng thái đang ở vẫn chặn phòng. Biên trả phòng không chiếm khoảng tiếp theo. Câu hỏi theo ngày dùng trọn ngày, gồm ngày kết thúc; câu trả lời ghi giờ bắt đầu và mốc kết thúc loại trừ, không tự coi là giờ nhận/trả của đặt lịch.
- Giá Hotel lấy đúng đơn vị và đúng dịch vụ liên kết. Sửa cả nguồn giá tóm tắt có phân trang, nguồn cũ và giá chi tiết; không gắn mọi loại phòng cho mọi dịch vụ Hotel.
- Giữ giới hạn đọc, quyền nhân viên, phản hồi từng phần và từ chối tự thực hiện thao tác ghi.

## Bằng chứng

| Kiểm tra | Kết quả |
|---|---|
| Hồi quy routing, nguồn, định dạng, hai luồng liên phân hệ, so sánh, việc chờ |193/193 đạt|
| Auth, lease, ngân sách đọc, timeout và payload |20/20 đạt|
| Browser localhost mở rộng |24/24 đạt; có đọc câu trả lời hiển thị trong ô chat|
| Browser đợt đầu |8/8 đạt; tổng hai đợt30 câu khác nhau|
| SQL162–164 |Phòng trùng khoảng/đang ở, biên ngày Taxi, giá Hotel đúng gói/đơn vị, thiếu quyền, nhân viên chấm dứt, bộ lọc lạ và byte cap đều đạt|
| Oracle độc lập trên dữ liệu thật |Thực thu6 kỳ ngày/tuần/tháng; giá Spa/Taxi ở biên cân/cự ly; lịch buổi sáng; hai nhóm việc chờ; hai luồng liên phân hệ cùng khách đều khớp|
| Gemini thật |Đúng1 yêu cầu công khai được duyệt; bản nháp đã đọc lại, không bắt tạo tài khoản hoặc xác nhận đã thanh toán/duyệt lịch|

[Chi tiết browser](browser-results.txt), [SQL logistics](logistics-sql.txt), [oracle nguồn](source-oracles.txt), [gói model](model-request.txt), [kết quả model công khai](model-result.txt).

Browser dùng tài khoản Admin có sẵn, tạo các phiên chat kiểm tra của chính tài khoản đó. Không xuất dòng dữ liệu riêng vào báo cáo. Kiểm tra thiếu quyền/nhân viên chấm dứt làm bằng SQL vai trò thật và rollback; không giả thành kiểm tra browser tài khoản bị khóa.

## Tải và giới hạn

24 lượt browser đạt sử dụng0–2 nguồn/câu; phản hồi nguồn lớn nhất3334 byte. Hai luồng liên phân hệ SQL dùng3 nguồn/câu. Đây là byte payload nguồn, chưa phải tổng byte Auth/PostgREST/database. Độ trễ browser gồm cả Auth/lưu lịch sử; có lượt8,5s dù nguồn còn trong ngân sách. Không cam kết mọi câu dưới8s đầu-cuối.

Một số lượt thử nhanh ban đầu gặp429 theo giới hạn10 câu/phút; lần nghiệm thu cuối giãn9s giữa câu và đạt. Câu “Bảng giá chi tiết Hotel” cần tên/mã dịch vụ; đã thử lại với “Bảng giá chi tiết Hotel: Dịch Vụ Daycare”. Không sửa giới hạn hoặc bỏ bước làm rõ để cho test qua.

Không gọi Gemini trong24 lượt browser. Lượt Gemini duy nhất chạy riêng bằng generator thật, đúng FAQ công khai đã duyệt và lịch sử trống; chưa nghiệm thu model với dữ liệu hội thoại/khách thật.

Chưa đo tổng băng thông/tải nhiều phiên của Gate2, chưa triển khai code mới hoặc nghiệm thu Admin Vercel. Những giới hạn về SLA, lợi nhuận, điều phối và mọi phép ghép dữ liệu tùy ý vẫn được ghi rõ trong file công việc.
