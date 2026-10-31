# Admin theo câu hỏi công việc — đợt đầu01/11/2026

Đã bắt đầu bằng ma trận23 câu đại diện19 nhómA01–A19 trong scripts/test/chat_admin_business_questions.cjs. Đây là audit routing và đầu vào nghiệm thu, không phải chứng nhận mọi câu/nguồn của19 nhóm. Không thay đổi các sourceSQL hoặc quyền hiện hành trong đợt này. Code còn local, chưa push.

## Đã sửa

- “Khách hàng Nguyễn An”, “Thú cưng Miu” nhận tên làm filter thay vì bắt dấu hai chấm. “Sản phẩm Royal Canin” giữ đúng tên lọc, không rơi thành toàn danh mục. Mã/SĐT giữ nguyên, nhiều kết quả vẫn do công cụ/nguồn yêu cầu chọn rõ.
- “Điểm của khách CUS-…” đi vào nguồn points.lookup, không nhầm thành hồ sơ khách.
- “Lịch ngày mai”, “Hotel hôm nay”, “Taxi hôm nay” vào lịch đúng ngày/nhóm; câu so sánh “So sánh thực thu hôm nay và hôm qua” dùng công cụ so sánh xác định hiện có.
- Hỏi giá có cân/km nhưng chưa có gói cụ thể sẽ hỏi mã/tên gói để dùng công cụ mức giá chi tiết, thay vì trả danh sách chưa lọc rồi làm người hỏi tưởng đã lọc theo7kg.
- Hai formatter giá Hotel không tự gắn “/ngày” khi nguồn không trả đơn vị. Nếu billing_minutes có trong projection thì hiển thị theo60phút/24giờ đúng nguồn; hiện nguồn Admin147 chưa có trường này nên phải nói chưa xác nhận đơn vị. Chưa sửa migration giá hoặc coi hourlyHotel đã được oracleAdmin đầy đủ.
- Hỏi phòng trống/công suất Hotel chưa có nguồn đúng sẽ hỏi ngày/loại phòng và chỉ bước kiểm tra, không đưa câu này sangFAQ/AI rồi đoán còn phòng.

## Kiểm chứng

-178 test Node đạt:4 ca mới cùng ma trận readtools, permissions, empty/error, pagination, KTV, compare, pending và liên khách/bé/đơn. Model không được gọi cho tra dữ liệu xác định.
-8 câu trên giao diện Admin localhost: lịch ngày mai, khách không tồn tại, bé không tồn tại, sản phẩmRoyalCanin, điểm khách không tồn tại, lịchHotelhômnay, hỏi phòng trống và giá tắm7kg. Tất cả HTTP200 và answer_type đúng;6 câu có dữ liệu/công cụ dùng1 nguồn mỗi câu;2 clarify không mở nguồn. Phản hồi khoảng1,6–5,2giây. Không xuất kết quả riêng/mã thực vào bằng chứng. [Browser](browser-checks.txt).
-Lượt browser đầu dùng nhầm hash tab-copilot nên không thấy input và không gửi câu hỏi; đã sửa sangtab-ai-copilot, thử lại8 câu đạt. Đây là lỗi script kiểm thử, không phải chứng nhận runtime lỗi.

Giới hạn:8 câu là smoke UI/API thật vớiCloud, chưa phải SQL oracle rộng cho mọi dữ kiện trả lời. Không gọi Gemini mới, không đọcCloudLogs; chỉ ghi lịch sử hội thoại chẩn đoán của chính nhân viên, không sửa hồ sơ/đơn/lịch nghiệp vụ. Chưa đo tổngAuth/DBbytes hoặc tải đồng thời, không thêm polling/công cụ/nguồn mới.

## Tiếp theo trong phạm vi Admin

Ưu tiên nguồn phòng/công suấtHotel/Taxi và đơn vị giá đúng schema, các câu liên phân hệ ngoài hai luồng hiện có, oracle tuần/tháng và việc chờ theo chính sách thật. Còn nghiệm thu quyền/nguồn/chất lượng model rộng hơn vàProduction; không đánh dấu toànAdmin hoặcGate2 hoàn tất từ đợt này.
