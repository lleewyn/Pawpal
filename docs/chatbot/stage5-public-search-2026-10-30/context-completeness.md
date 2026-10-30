# Không dùng đoạn FAQ bị cắt như chính sách đầy đủ

Ngày30/10/2026. Tiếp tục giai đoạn5 trên mã chưa phát hành; không áp Cloud hoặc gọi Gemini.

## Vấn đề và hành vi mới

Tìm kiếm155 giới hạn300 ký tự câu hỏi,1600 ký tự answer và16000 bytes cho tối đa5 FAQ. Điều kiện hoặc ngoại lệ ở cuối bài dài có thể bị mất; trước đợt này API không phân biệt đoạn trích với nguồn đầy đủ. FAQ có thể đến từ nội dung bài viết đã đồng bộ, không chỉ các câu ngắn trong baseline.

155 đánh dấu `incomplete=true` nếu một trong5 mục được chọn bị cắt câu hỏi/answer hoặc một mục phải bỏ để giữ ngân sách bytes. API bắt buộc nhận cờ boolean hợp lệ. Nếu nguồn chưa đầy đủ, API bỏ qua model và lưu lời nói rõ chưa xác nhận điều kiện từ đoạn trích, đề nghị hỏi cụ thể/gặp nhân viên với `understood=false`. Bộ đếm/chuyển giao hiện hành tiếp tục xử lý. Không giả rằng nhân viên đã nhận ca.

Đây là kiểm tra thận trọng: có một FAQ bị cắt trong nhóm được chọn thì cả lượt tư vấn FAQ đó không gọi model, kể cả có mục khác đầy đủ. Không suy rằng5 kết quả bao phủ toàn bộ kho FAQ. Cắt lịch sử cũ không được coi là FAQ thiếu nội dung; giới hạn lịch sử riêng vẫn8 đoạn1000 ký tự theo thiết kế. Luồng giá xác định không qua nhánh FAQ này.

Không thêm truy vấn để tải nguyên bài hoặc retry tìm kiếm; vẫn rules + một context/catalog, pool4 nguồn chung, timeout5 giây và context32KiB/catalog16KiB. Metadata nhỏ được tính trong ngân sách context cuối cùng. Không đổi quyền khách hoặc tạo cache/listener.

## Kiểm chứng mới nhất

- [local-results.txt](local-results.txt): **20 nhóm tích hợp SQL/Auth/JWT/REST/API đạt**. Có ca guest với ngoại lệ ở cuối answer dài: không gọi model, lưu lời tiếp tục đúng, chỉ1 context RPC; cắt theo bytes với Unicode dù từng answer chưa chạm1600 ký tự; cắt câu hỏi dài khi answer còn nguyên.
- Các đường bình thường, giá, quyền và chuyển nhân viên vẫn đạt trong cùng bộ. Fixture đầy đủ được giữ riêng để chứng minh model stub còn được gọi khi hợp đồng đầy đủ; **0 lượt Gemini thật**.
- Bộ [rà nội dung](../stage5-faq-review-2026-10-30/local-results.txt)7 nhóm chạy lại: cả18 FAQ active đã sửa/thêm vẫn truy xuất đúng và `incomplete=false` trên baseline này; rollback/guard/CRLF tiếp tục đạt.
- Hồi quy **261 kiểm tra offline và40 ca nghiệp vụ đạt**, diff không lỗi khoảng trắng. Hai clone và container thử đã dọn, nguồn local giữ nguyên.

## Phụ thuộc phát hành

Phải áp phiên bản155 mới trả `incomplete` trước khi đưa API này phục vụ. Nếu backend còn hợp đồng cũ thiếu cờ, API báo chưa xử lý được thay vì coi ngầm là nguồn đầy đủ. Mã hiện còn local nên chỉnh155 chưa phát hành; nếu môi trường khác đã áp bản155 cũ, cần áp lại định nghĩa hàm từ bản diff này theo quy trình phát hành được phép.

Rollback API và RPC phải tương thích; nếu gỡ cả155/156, đưa API về bản cũ rồi rollback156 trước155. Không dùng DROP CASCADE và không fallback đọc500 FAQ.

Địa chỉ/giờ mở cửa/chính sách đổi trả/ưu đãi thực tế vẫn cần nguồn kinh doanh xác nhận. Footer có chuỗi liên hệ tĩnh và Admin có cấu hình vận hành, nhưng đợt này chưa có bằng chứng để lấy các giá trị đó làm dữ kiện chatbot đã được xác nhận; không đọc toàn bộ cấu hình hoặc đưa khóa đối tác vào context.
