# Giai đoạn 5 — Tìm FAQ công khai có giới hạn

**Mốc mới nhất:** Bổ sung [kiểm tra FAQ đầy đủ](context-completeness.md),20 nhóm công cụ +7 nhóm rà FAQ chạy lại,261 kiểm tra offline và40 ca nghiệp vụ đạt. RPC155/API có thêm hợp đồng incomplete; nội dung thiếu do cắt không gọi model. Các số dưới là lịch sử từng đợt.

**Cập nhật tiếp theo ngày30/10:** Đã bổ sung catalog giá156, phản hồi xác định cho dữ liệu riêng/tồn hàng/lịch trống và chuyển nhân viên có yêu cầu mới nhất. **17 nhóm tích hợp,255 kiểm tra offline và40 ca nghiệp vụ đạt**. Xem [ma trận năng lực, giới hạn và thứ tự triển khai mới nhất](capabilities.md). Các số9/248 và mô tả “chưa bổ sung công cụ giá” phía dưới là mốc đầu155, không phải trạng thái mới nhất.

Ngày 30/10/2026. Bắt đầu G5.1 theo yêu cầu chuyển giai đoạn; các phần G4 chưa đạt vẫn được giữ mở. Đợt này sửa đường API đang dùng, không sửa `scripts/api/chat.js` cũ và không dùng RPC Admin cho khách.

## Thay đổi

- Migration155 thêm `search_public_chat_context(uuid,text)` chỉ dành cho service_role. API xác minh đúng chủ hội thoại guest/thành viên trước khi gọi. Không cho client tự gọi hàm server để đọc lịch sử hội thoại khác.
- Tìm trong FAQ công khai đang bật, loại câu trả lời trống. Chuẩn hóa dấu/hoa thường, tối đa12 từ tìm kiếm, xếp hạng và chọn tối đa5 mục; không nạp500 FAQ vào model. Dùng partial GIN index trên văn bản question/answer/keywords; không đọc kho FAQ nội bộ Admin hoặc dữ liệu giao dịch.
- Mỗi mục trả tối đa300 ký tự câu hỏi và1600 ký tự câu trả lời; FAQ tối đa16000 bytes. Lịch sử riêng tối đa8 đoạn, mỗi đoạn1000 ký tự; bỏ đoạn cũ nhất nếu tổng context vượt32768 bytes. Cắt Unicode ở SQL theo ký tự. Đây là excerpt, chưa có cơ chế lấy tiếp đoạn FAQ hoặc lấy lại đầy đủ lịch sử cho model.
- Mỗi câu rõ nghĩa vẫn2 nguồn: rules và context tìm kiếm. Giữ4 slot nguồn dùng chung, statement timeout5 giây và lock timeout1 giây. Không thêm polling, cache, embedding, dịch vụ ngoài hoặc model call mới.
- Không có FAQ liên quan: lưu lời hỏi làm rõ/hướng gặp nhân viên với `understood=false`, bỏ qua model. Bộ đếm/chuyển nhân viên hiện hành tiếp tục xử lý; không giả đã có nhân viên nhận ca. Lỗi nguồn vẫn báo lỗi, không fallback nạp FAQ hàng loạt.
- API kiểm tra số dòng, kiểu trường và tổng bytes trước khi gọi model. Không âm thầm tiếp tục với nguồn sai hợp đồng.

## Kiểm chứng

[local-results.txt](local-results.txt): **9 nhóm tích hợp SQL/Auth/JWT/REST/API đạt**, gồm lựa chọn FAQ liên quan, inactive/no-match, chặn anon/member gọi trực tiếp RPC, tham số không hợp lệ, lịch sử Unicode dài, chỉ mục, rollback/reapply, luồng gửi thật guest/thành viên và no-match không gọi model. Model được thay bằng stub cục bộ; **0 lượt gửi Gemini**, chưa chứng minh chất lượng diễn giải thực tế.

Kế hoạch truy vấn mẫu dùng Bitmap Index Scan khi tắt seqscan để xác minh biểu thức khớp chỉ mục. Đây không phải benchmark tải hoặc bằng chứng planner luôn chọn index trên dữ liệu thật. Chỉ mục có chi phí lưu trữ và cập nhật khi sửa FAQ; không tạo index trên bảng giao dịch.

Hồi quy: **248 kiểm tra offline và40 ca nghiệp vụ đạt**, `git diff --check` đạt. 5 ca mới kiểm tra hợp đồng API, quyền, không có kết quả, lỗi nguồn và giới hạn. Database thử/fixture/hai container/tệp cấu hình riêng đã dọn; nguồn local giữ nguyên: [local-environment.txt](local-environment.txt).

## Triển khai và giới hạn

Chưa push hoặc áp Cloud. Cần áp155 trước khi đưa API mới phục vụ; nếu chưa có hàm, API báo lỗi thay vì quay về đọc hàng loạt. Rollback: đưa API về phiên bản trước đợt này, sau đó chạy155 rollback; hàm context143 cũ và bản ghi FAQ vẫn được giữ.

G5.1 mới đạt tìm kiếm/cắt ngữ cảnh/đường không có kết quả; còn đo trước–sau trên bộ câu hỏi tiếng Việt đại diện, cải thiện truy vấn nối tiếp và kiểm chứng độ liên quan. Tìm kiếm từ khóa OR chưa phải hiểu ngữ nghĩa; FAQ có từ chung có thể được chọn. Không tuyên bố đã bao phủ mọi câu hỏi.

G5.2–G5.4 chưa được đóng: cần danh mục nguồn công khai cho cửa hàng, dịch vụ, sản phẩm/biến thể, chính sách, ưu đãi; công cụ giá có hiệu lực và điều kiện báo giá; kiểm tra không hứa tồn kho/lịch trống và phân biệt dữ liệu riêng. Đợt này vẫn chỉ đưa FAQ tham khảo vào model, chưa thay FAQ bằng báo giá giao dịch đã xác nhận.
