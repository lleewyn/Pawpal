# Streaming và giọng trò chuyện — 31/10/2026

Phát hành lên main theo yêu cầu push của người dùng. Kế thừa phần hiện câu hỏi ngay khi gửi và giữ nháp của lượt trước. Các kết quả dưới đây là nghiệm thu local; chưa đo buffering/streaming Gemini trên Vercel sau phát hành.

## Hành vi

- Câu cần Gemini: dùng generateContentStream, chuyển từng đoạn câu trả lời từ server tới widget bằng SSE trên chính request public_send. Chưa phải đợi câu trả lời đầy đủ mới hiện. Chỉ lấy chuỗi reply từ JSON có cấu trúc, không đưa schema/understood ra UI; bản đang trả hiển thị như nội dung tạm.
- Câu FAQ/giá có sẵn: trả trực tiếp, không gọi Gemini hoặc cố tình làm chậm để giả streaming. Client cũ vẫn nhận JSON khi không bật stream; widget cũng hỗ trợ phản hồi JSON.
- Chỉ gửi done sau khi post_public_chat_message lưu thành công. Nếu ngắt stream hoặc lưu lỗi, bỏ phần trả lời tạm, giữ nháp và requestId để gửi lại an toàn. Lỗi đọc sau khi đã xác nhận gửi được phân biệt riêng; không bắt gửi lại giao dịch đã xác nhận. Khi đổi khóa model, reset bản tạm để không nối hai lần thử thành một câu.
- Giọng khách hàng: xưng PawPal, gọi khách là bạn, thú cưng là bé. Không đoán tuổi/giới tính, không tự gọi anh/chị hoặc sen/boss; không chào lại mọi lượt, không lạm dụng dạ/ạ, emoji hoặc lời hứa. FAQ xác định và phần mở đầu tư vấn cũng được chỉnh nhẹ mà giữ dữ kiện/điều kiện.
- Sửa lỗi phát hiện lúc kiểm UI: chữ “cắt” sau bỏ dấu từng bị hiểu thành tiếng Anh “cat”, làm lọc ngầm sang mèo. Đã phân biệt tiếng Việt/tiếng Anh và kiểm lại có gói Grooming chung, không chỉ gói mèo.

## Kiểm thử

- 54 test Node đạt: quyền/ownership, FAQ/giá, model privacy, nguồn, JSON prefix với escape/Unicode, byte cap, SDK streaming trước khi hoàn tất, lưu một lần, xung đột lưu và replay.
- Chrome có transport kiểm soát: immediate_send, controls, backoff và stream_ui đều đạt. Có chia UTF-8 giữa hai chunk, thấy phần chữ trước done, giữ nháp tiếp theo, bỏ bản tạm khi ngắt/lỗi, reset lượt model, không chạy HTML và fallback JSON.
- UI localhost/API/Cloud thật: mua guest và giá cắt tỉa nhận SSE delta/done, đúng dữ kiện và không trùng câu hỏi. Bộ mất response sau lưu → reload → gửi lại nhận replay, quyền khác chủ/renderer an toàn đều đạt. Các lượt này không gọi Gemini.
- Một câu Gemini thật đã được duyệt riêng: “PawPal có những dịch vụ gì?”, chỉ FAQ công khai, lịch sử trống, đúng một lần gửi UI và không gửi lại; trần backend tối đa4 provider attempts. UI hoàn tất trả lời, sau đó Chrome DevTools không cho đọc lại SSE response body qua response.text. Đã đối chiếu đúng một hội thoại QA theo nguyên câu hỏi và thời gian tạo script bằng truy vấn chỉ đọc, không đọc Cloud Logs hoặc hội thoại khác. Câu cuối: “Chào bạn, PawPal hiện có các dịch vụ như Pet Spa/Grooming, Pet Hotel và Pet Taxi nhé. Ngoài ra, PawPal cũng có các sản phẩm dành cho thú cưng nữa. Bạn muốn tìm hiểu thêm về dịch vụ nào không?”
- Không thu được số đo first-chunk/completion hay số provider attempts thực tế của lượt thật; không suy ra các con số đó từ fixture. Script browser đã sửa để lỗi đọc lại body không làm mất kết quả UI trong lượt sau; chưa chạy lại vì phạm vi duyệt đã dùng. [Kết quả thật đã đối chiếu](streaming-real-model-result.txt), [kết quả local khác](streaming-local-results.txt), [gói đã duyệt](streaming-model-request.txt).

## Tài nguyên và phạm vi

Không thêm truy vấn DB theo token, không thêm polling/subscription hoặc một lượt AI để viết lại FAQ. Giữ các cap/timeout/pool/ownership hiện hành; chỉ một lần ghi cuối, cùng số lượt đọc nguồn như trước. SSE có overhead framing và giới hạn32KiB nội dung delta cộng dồn qua các lần đổi khóa; client giới hạn128KiB toàn stream và16.000 ký tự bản tạm. Chưa đo tải đồng thời hoặc buffering trên Vercel; cần kiểm lại bản triển khai khi được yêu cầu push. Admin nội bộ vẫn dùng luồng hiện hành, không bật streaming Admin trong thay đổi này.

Đối chiếu API theo [tài liệu Google về streaming](https://ai.google.dev/gemini-api/docs/generate-content/text-generation) và khai báo SDK @google/generative-ai đang cài trong repo; không nâng phiên bản SDK trong lượt này.
