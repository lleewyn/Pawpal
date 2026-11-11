# Đánh giá dữ liệu chatbot — chỉ đọc

Thời điểm: 11/11/2026, khoảng 16:47 giờ Việt Nam. Hai truy vấn tổng hợp, chỉ lấy số đếm, mã cấu hình và đoạn trích ngắn. Không tải toàn bộ hội thoại, ảnh/tệp hoặc Supabase Logs; không gọi mô hình AI; không thêm, sửa, xóa dữ liệu.

## Kết luận

Dữ liệu chatbot chưa sạch hoàn toàn. Cấu trúc liên kết đang ổn trong phạm vi kiểm tra, nhưng có dữ liệu kiểm thử lọt vào nguồn kiến thức đang bật và đã xuất hiện trong câu trả lời của bot.

## Hội thoại

- 106 hội thoại, 415 tin nhắn: 94 bot_handling, 2 waiting_agent, 5 agent_handling, 4 resolved và 1 closed.
- 97 hội thoại chưa đóng có updated_at cũ hơn 7 ngày; đây là dấu hiệu cần phân loại theo trạng thái, không tự coi tất cả là công việc nhân viên quá hạn.
- 5 hội thoại mở có mốc SLA đã qua, 3 hội thoại chưa có tin nhắn. Rà sâu sau đó xác nhận SLA này là thời hạn chờ tiếp nhận: chỉ 2 ca còn waiting_agent là quá hạn chờ, 3 ca đã được nhận giữ mốc hạn lịch sử; xem chatbot-sla-followup.md.
- Không thấy tin nhắn mất hội thoại, liên kết khách không tồn tại, tin nhắn rỗng, đánh giá ngoài 1–5 hoặc hội thoại mở đang giao cho nhân viên không khả dụng theo các điều kiện đã kiểm tra.
- Có 8 hội thoại chứa dấu vết kiểm thử. Bốn hội thoại có lời kiểm thử trực tiếp: 9e250f85-e1ab-432d-a1dd-e3e8afe5a67f, ad3e300d-5fb1-4783-b867-62741045ffcd, cf57c9e1-d211-4c4b-b77a-5ef3de0a2f45 và bf4ac1f0-ef86-4c51-81ad-8b09a61e16d2.
- Bốn hội thoại khác chỉ có dấu vết trong phản hồi như tên Cún Test, nội dung QA của phiếu hỗ trợ hoặc tiêu đề FAQ E2E11. Không đủ căn cứ xóa toàn bộ những hội thoại này chỉ theo từ khóa.

## Kho kiến thức và quy tắc

- FAQ: 99 mục, 97 đang bật; không có câu hỏi/trả lời rỗng hoặc câu hỏi đang bật bị trùng sau khi bỏ khoảng trắng và chuyển chữ thường.
- Một FAQ đang bật có tiêu đề “Bí quyết chăm sóc lông và phòng ngừa viêm da mùa nồm ẩm E2E11”, ID 015aa7c9-e007-4855-a3ad-2f9268a36799, category blog:015aa7c9-e007-4855-a3ad-2f9268a36799. Hội thoại 871c3fab-2982-48ed-989f-2ef9234857ae đã nhận câu trả lời nhắc đúng tiêu đề này. Đây là bằng chứng nguồn kiến thức thử đang được sử dụng, không chỉ là tên hiển thị trong Admin.
- FAQ “QA kiểm thử lưu FAQ 2026-10-15”, ID 112d121d-2dde-4694-8352-950e9a0455f4, đã tắt.
- 20 prompt cùng kênh web có prompt_key khác nhau, nội dung không trùng và không rỗng. Chưa có căn cứ xem việc cùng kênh là lỗi cấu hình.
- Tuy nhiên mã scripts/api/chat.js lấy các prompt đang bật không có order, rồi chỉ ghép systemPrompts.slice(0, 5) vào chỉ dẫn bổ sung. Vì vậy không thể khẳng định 20 prompt đang bật đều được sử dụng; cần rà cách chọn/ưu tiên trước khi đánh giá đủ các quy tắc. Đây là nhận xét từ mã local, chưa xác nhận phiên bản tương ứng đang deploy.
- 11 câu trả lời nhanh đều đang bật, không rỗng và không thấy từ khóa kiểm thử.
- 1 quy tắc chuyển nhân viên có SLA dương; 33 chính sách bồi thường không có hạn mức âm hoặc issue_type trùng nhau.

## Ưu tiên xử lý đề xuất — chưa thực hiện

1. Đối chiếu bài viết gốc của FAQ E2E11 trước khi sửa hoặc tắt; nếu nguồn bài viết đồng bộ tự động thì sửa đúng nguồn để dấu thử không bị đồng bộ trở lại.
2. Rà liên kết của bốn hội thoại kiểm thử trực tiếp trước khi xóa. Không xóa bốn hội thoại còn lại chỉ vì bot đã trích nguồn thử.
3. Đối soát 5 SLA quá hạn và phân loại hội thoại bot không còn hoạt động; không tự đổi trạng thái toàn bộ 97 hội thoại cũ.

Đây là kiểm tra chất lượng dữ liệu/cấu hình, chưa đánh giá đầy đủ độ đúng của từng câu trả lời, giá dịch vụ trong FAQ, khả năng truy xuất hoặc chất lượng mô hình AI.
