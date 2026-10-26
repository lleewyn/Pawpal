# Rà soát và hồi quy tổng hợp — 26/10/2026

Gateway thật được người dùng loại khỏi phạm vi. Các mục còn lại không tự coi là N/A vì thiếu triển khai.

`node scripts/test/sync_offline_batch.cjs`: **PASS** toàn bộ allowlist offline. Gồm 9 bài Chrome (support, booking detail, order detail/list, return detail, notification modal, chat inbox/realtime và chatbot business), 75 test Node và hai script Copilot business/loyalty service. [Kết quả có output từng nhóm](offline-batch.txt). Mọi transport trong browser là mock/intercept; không chạy các script Cloud fixture, không Logs/stress-test/deploy. Không phải xác nhận tổng egress, Auth/HTTP/WebSocket hoặc DB commit thực tế.

Inbox chat xác minh trang 10 dòng, trang cuối, cache quay về trang cũ và filter server; invalidation transcript chỉ hội thoại thay đổi. Copilot xác minh 40 case intent/date/scope và hợp đồng API/mock. SLA thiếu hoặc ngày không hợp lệ hiện “Chưa có hạn phản hồi” thay vì NaN; 3 test cho deadline/overdue/trạng thái đã đóng/chuyển nhân viên. Test hiển thị SLA không chứng minh server tạo deadline hoặc handoff thật.

## Phần chưa thể đóng checklist từ bằng chứng hiện tại

- Snapshot ticket/messages, notifications, history/wallet loyalty vẫn chưa phân trang server. Giảm số request không giới hạn kích thước dữ liệu mỗi request.
- Ticket form không có input/upload/storage workflow thực tế (biến `fileInput` cũ không được dùng). Không coi đọc source này là kiểm tra quyền Storage.
- Đổi/gửi bù có loại yêu cầu nhưng chưa có bằng chứng workflow tạo/giao đơn thay thế và điều chỉnh tồn/tiền đầy đủ.
- Hoàn nhanh chặn nguồn có ledger; chưa có nghiệm thu workflow đối soát/thu hồi điểm và tính lại hạng. Không tự nới chốt chặn để cho phép hoàn thiếu ledger.
- Full E2E hai portal: Auth thật, ghi commit, delivery Realtime, reload/login, nguồn notification, handoff/moderation và các đường quyền chưa được chứng minh bằng các bài mock.

Các mục trên vẫn là công việc chưa hoàn tất, không phải hạn chế gateway. Chưa push/deploy thay đổi sau `0ef89a39`. Cần tiếp tục triển khai và nghiệm thu; không đánh `[x]` toàn hệ thống từ số lượng test PASS.
