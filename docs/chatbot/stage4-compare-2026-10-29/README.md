# Giai đoạn4 — So sánh thực thu

**Cập nhật tiếp theo:** Đã bổ sung [luồng một khách/lịch/khiếu nại](../stage4-customer-case-2026-10-29/README.md),8 nhóm SQL/Auth/API153 và tổng223 kiểm tra offline đạt. Các số214/11 nhóm phía dưới là mốc riêng của đợt so sánh thực thu.

Ngày 29/10/2026. Bắt đầu giai đoạn4 theo yêu cầu người dùng, giữ các giới hạn/nghiệm thu giai đoạn3 và Gate2 còn mở. **Luồng đầu tiên đã triển khai local**, chưa push hoặc áp Cloud.

## Câu hỏi hỗ trợ

- “Tuần này thực thu so tuần trước?”
- “So sánh thực thu tuần này với tuần trước”
- “Thực thu hôm nay so hôm qua”
- “Thực thu tháng này so tháng trước”

Có hỗ trợ không dấu cho các mẫu này. Chưa hỗ trợ thêm chi nhánh, phân nhóm, khoảng ngày tùy ý, doanh số hoặc lợi nhuận vào câu so sánh; chatbot hỏi làm rõ thay vì bỏ điều kiện rồi trả số toàn hệ thống. Câu tra thực thu một kỳ giữ luồng cũ.

## Công thức và mốc kỳ

Giữ công thức nguồn đã có: **thực thu = thu thành công − hoàn thành công**, theo thời điểm thu/hoàn tương ứng. Không dùng tổng giá trị đơn tạo trong kỳ hoặc để model tự tính. Mỗi kỳ trả đủ thu, hoàn và thực thu.

Mặc định so phần thời gian đã trôi qua: đầu kỳ hiện tại đến thời điểm hỏi, với khoảng có cùng độ dài bắt đầu từ đầu kỳ trước. Tuần bắt đầu thứ Hai theo giờ Việt Nam, tháng theo lịch. Không so tuần đang dở với cả tuần trước. Nếu tháng trước ngắn hơn, kỳ đối chiếu dừng ở cuối tháng trước; phản hồi ghi rõ giới hạn này, không vượt sang tháng sau.

Chênh lệch là thực thu hiện tại trừ thực thu kỳ trước. Chỉ hiển thị phần trăm khi thực thu kỳ trước dương; bằng0 hoặc âm thì chỉ hiển thị chênh lệch và giải thích không tính tỷ lệ. Hai nguồn được đọc riêng, có thể có thay đổi dữ liệu giữa hai lần đọc; không tuyên bố cùng một snapshot.

## Quyền, kết quả từng phần và ngân sách

- Tái sử dụng `revenue.summary` qua công cụ đã đăng ký. Kiểm tra cả `payment.read` và `refund_transaction.read` trước khi khởi chạy nguồn nào. Các kiểm tra SQL/RLS của nguồn giữ nguyên.
- Hai nguồn đọc đồng thời tối đa2, không gọi model. Mỗi câu mới cần lease như cũ; không tự mở thêm slot hoặc tăng ngân sách3 nguồn,32 KiB/nguồn,64 KiB/câu. Nếu đã đọc1 nguồn lịch sử thì tổng vẫn tối đa3.
- Dữ liệu nguồn phải có tổng/tiền hợp lệ, công thức khớp, mốc phạm vi trùng yêu cầu và thời điểm đọc hợp lệ. Nguồn sai hoặc lỗi không được đưa vào phép so sánh.
- Một kỳ lỗi: trả kỳ có dữ liệu và nhãn kỳ chưa đọc được, không giả0, không tính chênh lệch/phần trăm hoặc đoán nguyên nhân tăng/giảm. Hai kỳ cùng lỗi: báo lỗi, không lưu một phép so sánh giả.
- API lưu phản hồi đầy đủ/từng phần một lần và nhả lease; không nạp lịch sử chỉ vì đây là câu hỏi so sánh. Replay giữ hành vi cũ: đọc nội dung đã lưu, không đọc lại nguồn.

## Kiểm chứng

[11 nhóm kiểm tra mới](../../../scripts/test/chat_stage4_compare.test.cjs) đạt: mốc tuần Việt Nam, hai kỳ cùng độ dài, giới hạn tháng ngắn, đầu kỳ chưa có thời gian; câu ngoài phạm vi; quyền trước RPC; phép tính và phần trăm; kỳ trước0/âm; nguồn lỗi/tổng sai/phạm vi sai; ngân sách có lịch sử; handler API với hai nguồn đồng thời, lưu và nhả lease cho cả phản hồi đầy đủ/từng phần/lỗi.

[Kết quả hồi quy đầy đủ](offline-results.txt), [tóm tắt và fingerprints](verification.txt): **214 kiểm tra offline đạt**; bộ40 ca định tuyến/nghiệp vụ riêng cũng đạt.

Các bài kiểm tra mới dùng nguồn SQL giả lập và handler API thật, không phải hai truy vấn SQL/Auth thật. Nguồn `revenue.summary` có các bằng chứng SQL trước đó; đợt này không bổ sung oracle database hoặc chứng nhận chịu tải Production. Không gọi Gemini, tạo fixture database/container hoặc truy vấn Cloud.

## Trạng thái giai đoạn4

- G4.2: đã có so sánh thực thu ngày/tuần/tháng với kỳ trước theo phần thời gian đã trôi qua; còn phân nhóm, chỉ số/công thức khác và oracle SQL cho luồng kết hợp.
- G4.4: có kết quả từng phần cho luồng so sánh thực thu; chưa áp dụng chung cho mọi câu hỏi liên phân hệ.
- G4.1 và G4.3: chưa triển khai trong đợt này.

Không có migration mới. Migrations135–152 và các thay đổi trước vẫn chưa áp Cloud; Gate2 và phần nghiệm thu G3.4 chưa được đóng chỉ vì bắt đầu giai đoạn4.
