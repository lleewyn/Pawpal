# Tiến độ nghiệp vụ — 25/10/2026

Đây là trạng thái từng phần, không thay thế nghiệm thu đầy đủ T01–T30.

| Khu vực | Thay đổi | Kiểm chứng | Còn lại |
|---|---|---|---|
| Trực chat — chọn ca | Bỏ chọn ca đầu tiên ngầm; khóa thao tác khi chưa chọn hoặc ca kết thúc | UI offline có inbox nhưng không chọn ca | E2E tài khoản thật và mọi nút |
| Modal tặng điểm | Chụp ID khách/ca/phiên bản; chặn đổi ca; nạp policy thật; RPC kiểm tra hạn mức và retry | UI đổi A sang B không ghi; SQL rollback kiểm tra giới hạn, actor, phiên bản, approval, idempotency | Review modal với người dùng, luồng duyệt điểm vượt hạn chưa triển khai |
| Modal khiếu nại/chuyển/hoàn tất | Thêm đối chiếu ca đang chọn trước xác nhận | Đọc code; chưa đầy đủ E2E | Test đồng thời, trùng ticket, quyền người nhận |
| SLA | Bỏ nhánh nhận ca tự coi là hoàn tất SLA | Đọc code | Test trước/trong/sau nhận ca với thời gian server |
| Copilot — tra dữ liệu | 7 ý định cố định; SQL có quyền, count chính xác, tên/mã nghiệp vụ, phạm vi và thời điểm | 40 câu planner; SQL fixture và 3 oracle Cloud | Thêm bộ lọc và cách nói theo nhu cầu thực tế |
| Copilot — bản nháp | Ngữ cảnh có giới hạn và lọc; gắn nhãn cần kiểm tra | Test generator giả lập; SQL wrapper context | Chưa đánh giá Gemini thật với reviewer CSKH; chưa đo chất lượng 80% |
| Copilot — gửi/thử lại | Giữ câu hỏi/requestId khi lỗi; chỉ thêm lịch sử khi server xác nhận; không tải lại toàn lịch sử sau gửi | UI 503 rồi thử lại thành công | 429/timeout/mất mạng thật và đóng tab giữa request |
| Lịch sử và Rules | Giữ phân trang/cache đang có; không viết lại chức năng đã đúng | Regression paging/cache và realtime offline | CRUD FAQ/rules end-to-end, xung đột hai người và benchmark |
| Bảo mật | RPC mới không cho anon; đọc theo quyền; context lịch sử chỉ thuộc caller | SQL rollback quyền/context; API auth giả lập | Full audit các RPC chat cũ, raw audit, prompt injection end-to-end |
| Tài nguyên | Không model cho số liệu; giới hạn dữ liệu đưa vào model | Test không gọi Gemini/history khi hỏi số liệu; đo 3 phản hồi Cloud | Chưa có p50/p95 hoặc so sánh tải đồng thời |

Chưa triển khai: private upload ảnh/tệp, tự động thực hiện nghiệp vụ, duyệt bồi hoàn vượt hạn, RAG tài liệu tải lên. Chưa nghiệm thu toàn bộ giao diện ở 1366/1440/1920 và zoom 125%. CSS phụ cũ `chatbot-v8.css` chưa được dọn trong đợt này; nguồn chạy chính dùng `chatbot.css`.
