# Streaming Admin SSE — 04/11/2026

Đã thêm streaming HTTP SSE cho POST Admin khi body.stream=true. Request JSON cũ vẫn được hỗ trợ. Không thêm nguồn SQL, lượt Auth hoặc Gemini.

## Hành vi

- Xác minh tài khoản, quyền dùng trợ lý, request và admission trước khi mở stream. Status reading gửi sau admission, trước truy vấn nghiệp vụ.
- Trả lời nghiệp vụ vẫn được kiểm tra bằng công cụ hiện hành và lưu cùng requestId trước khi phát delta. Các delta chia96 ký tự Unicode, nhường event loop giữa frame, không có timer cố tình làm chậm phản hồi. done giữ contract kết quả và continuation như JSON cũ.
- Đây là SSE thật giữa backend và browser cho trạng thái và câu trả lời đã xác nhận. **Không phải streaming token trực tiếp từ Gemini**: generator Admin vẫn trả bản hoàn chỉnh để được kiểm tra/lưu trước. Câu tra cứu phải đợi nguồn xong; các frame có thể được proxy/browser gom trong cùng network chunk, không hứa xuất hiện từng chữ như hiệu ứng gõ giả.
- Browser đọc ReadableStream với TextDecoder, xử lý frame tách qua nhiều chunk, giới hạn524288byte và timeout30s cho cả body. Nội dung render Markdown có escape trong khi nhận và chốt lại bằng reply của done. Không phát lại hiệu ứng typewriter cho phản hồi SSE.
- Error frame hoặc EOF thiếu done: bỏ câu trả lời dở, giữ đúng một câu hỏi/nháp để gửi lại cùng requestId. Nếu server đã lưu, retry phát phản hồi đã lưu, không đọc nguồn hoặc gọi model lại. Không tự retry khi chưa có thao tác của người dùng.

## Kiểm chứng

- **220/220 test Node đạt**:217 ca trước và3 ca SSE mới (Unicode/status/delta/done, source timeout không phát số liệu giả, chưa đăng nhập401/opt-in).
- [Browser với HTTP SSE kiểm soát](controlled-browser.txt): trạng thái xuất hiện trước nội dung; một delta hiện khi server vẫn giữ kết nối mở; completion hoàn tất; EOF thiếu done xóa câu dở; retry giữ ID và không nhân đôi. Dùng server test và dữ liệu QA, không Supabase/Gemini.
- [Browser/API localhost thật](local-real.txt): câu phòng Hotel ngày mai, HTTP200/content-typeSSE,3 lần đọc network,2 status,8 delta,done; khoảng1078,5ms từ status tới delta đầu. Một câu hỏi/một trả lời,9 dòng bảng, không lỗi gửi lại, không hiệu ứng gõ lại. Không xuất dòng nguồn riêng vào báo cáo.
- Hồi quy tải lịch sử ban đầu và chờ/503/gửi lại đạt. File ảnh cũ được test sinh lại đã được khôi phục, không đưa ảnh thay đổi không liên quan vào đợt này.

Code hiện local, chưa push. Vì vậy chưa kiểm SSE của bản mới trên Vercel. Không gọi model thật trong lượt này, không đọc Cloud Logs, không đo tải nhiều phiên; Gate2 vẫn mở.
