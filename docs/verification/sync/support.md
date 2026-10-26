# Kiểm tra đồng bộ hỗ trợ khách hàng — 26/10/2026

Bổ sung retry local: ID phản hồi được giữ trong sessionStorage theo owner/ticket/SHA-256 nội dung, không lưu nội dung hoặc token; kiểm tra ghi journal trước RPC, ack đúng mới xóa. `user_support_sync_ui.cjs` PASS với lỗi ghi → stop/nạp lại helper (mất Map trong bộ nhớ) → retry cùng ID; ý định gửi cùng nội dung sau ack dùng ID mới. Đây là tái nạp helper trong browser, chưa phải reload toàn portal hoặc mất response sau commit thật. SHA-256 chỉ dùng định danh nội dung, không coi là mã hóa bảo mật. Các giới hạn ID chỉ nằm trong bộ nhớ ghi trước đây đã được sửa ở phạm vi helper; E2E reload vẫn cần kiểm tra.

Phạm vi: mã local và RPC/RLS Supabase Cloud; chưa push/deploy hoặc nghiệm thu đầy đủ hai portal qua HTTP/Auth, commit, Realtime và reload.

## Kết quả

- **13 assertion Cloud PASS**, 111 SQL statements: liên kết đúng đơn/chủ sở hữu; tạo và phản hồi retry không trùng; Admin nhận phản hồi User; User nhận phản hồi công khai nhưng không thấy ghi chú nội bộ; chặn phiên bản Admin cũ; yêu cầu bổ sung → User trả lời → đang xử lý; cách ly B/Guest; giải quyết, đánh giá và đóng ticket đúng quy tắc. [Kết quả SQL](support-cloud-rollback.txt).
- Một ticket, hai đơn tham chiếu tổng hợp không có hàng/thu tiền, actor A/B/Admin trong transaction. Đã rollback và xác minh không còn fixture. Không thay dữ liệu khách thật, schema, RPC hoặc policy.
- **35 test Node PASS** cho service hỗ trợ và customer auth. Endpoint phản hồi dùng client mang JWT của người gọi và RPC sở hữu, không ghi trực tiếp bằng quyền quản trị. `requestId` bắt buộc, chỉ nhận xác nhận đúng ID.
- **Chrome offline PASS**: một channel chung cho danh sách/chi tiết; 10 lượt đọc song song dùng chung request; 10 sự kiện gom một lượt đọc; nhàn rỗi/ẩn tab 60 giây giả lập không polling; sự kiện trong lúc đọc chỉ thêm một lượt cập nhật; giữ bản nháp; chặn double-click; retry cùng ID; ý định gửi mới dùng ID mới; phân biệt lưu thành công với lỗi tải lại; đổi tài khoản dọn cache/channel và chặn phản hồi cũ. Kiểm tra escape tiêu đề và giờ Việt Nam trên browser UTC. [Ảnh fixture offline](support-detail-offline.png).

## Thay đổi local

| Mã lỗi | Sửa và kiểm chứng |
|---|---|
| SYNC-SUP-B01 | Bỏ channel riêng của modal; gom tải trùng/sự kiện 200 ms, hoãn đọc khi tab ẩn; browser xác nhận một channel và số lượt đọc |
| SYNC-SUP-B02 | Cache, request ID và phản hồi gắn tài khoản; đổi ticket không dùng nhầm bản nháp; response A không xuất hiện ở B |
| SYNC-SUP-B03 | Xác nhận ghi tách lỗi refresh; giữ draft khi ghi lỗi; retry ổn định nhưng lần gửi mới không tái dùng ID cũ |
| SYNC-SUP-B04 | Đường API support-reply dùng RPC với JWT người gọi, thay truy vấn trực tiếp sai cột `user_id`; test token/quyền và acknowledgement |
| SYNC-SUP-B05 | Escape tiền tố tiêu đề trước khi chèn HTML; thời gian hiển thị theo Việt Nam |

File production: `scripts/shared/support-handler.js`, `scripts/api/customer_support.js`, `scripts/api/customer_auth.js`, `pages/user/modules/support/support.js`. Không đổi bố cục modal Admin.

## Băng thông và giới hạn

Không dùng Supabase Logs, stress-test hoặc polling mới. Một lượt fixture Cloud thành công; đọc metadata RPC/schema và xác minh riêng trigger trạng thái. Trigger tạo message hệ thống công khai khi trạng thái đổi, cho phép dùng chung kênh message để yêu cầu cập nhật. Browser/Node dùng request giả, không gọi Cloud. Số SQL statements không phải số request portal; chưa đo tổng egress hoặc p95.

RPC `own_support_tickets()` vẫn trả toàn bộ ticket và lịch sử công khai của một chủ sở hữu, chưa phân trang: dữ liệu lớn vẫn cần tối ưu tiếp. ID retry phản hồi hiện giữ trong bộ nhớ, chưa bảo đảm qua reload. Chưa kiểm tra gửi đồng thời thực, upload/Storage, chuyển chatbot sang nhân viên, SLA/ưu tiên, Auth/HTTP thật hoặc delivery/reconnect Realtime thật. Ảnh offline dùng fixture và không thay nghiệm thu giao diện đầy đủ. Các case E2E giữ RETEST/NOT RUN.

## Tái hiện

- `node --test scripts/test/test_customer_support.cjs scripts/test/customer_auth.test.js`
- `node scripts/test/user_support_sync_ui.cjs`
- Cloud chỉ chạy khi cần: `node scripts/test/sync_support_cloud_rollback.cjs --cloud`; mặc định không kết nối, transaction luôn rollback.

Playwright/PG dùng dependency private có sẵn trên máy; credentials không nằm trong báo cáo. Không chạy lại Cloud chỉ để cập nhật tài liệu.
