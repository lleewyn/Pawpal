# Đọc tin dài theo từng phần

Ngày 28/10/2026. Đã triển khai và kiểm chứng local; migration139 chưa áp Cloud, chưa push. Gate2 tổng tài nguyên vẫn mở.

## Hành vi

Tin có nội dung quá lớn để nằm trọn trong trang32 KiB được trả bản xem trước tối đa1.200 ký tự, có cờ chưa đầy đủ và nút **Đọc tiếp tin nhắn**. Các tin bình thường vẫn giữ cách phân trang của138. Bản xem trước được tính là một tin để offset/cursor trang tiếp không bỏ qua hoặc lặp lại tin.

Mỗi lần bấm tải tối đa2.000 ký tự tiếp theo, không tự tải nền hoặc tự retry. Sau lỗi, phần đã đọc được giữ nguyên và nút dùng lại được. Khi đọc hết, nút biến mất. Áp dụng cho lịch sử Copilot và transcript trong Trực chat, kể cả nhánh trình bày tin hệ thống.

RPC `read_admin_chat_message_part` dùng quyền caller: Copilot lọc theo staff từ login-context; transcript đòi chat_conversation.read và chat_message.read, giữ RLS khi đọc content. Không đọc raw_content, không cấp quyền nguyên văn qua công cụ này. API GET chỉ cho loại copilot; transcript gọi RPC có kiểm quyền riêng từ trình duyệt.

Cursor dùng số ký tự Unicode của PostgreSQL và next_offset trả về; frontend không lấy độ dài chuỗi UTF-16 để suy ra offset. Mỗi phần kiểm lại dấu phiên bản nội dung với bản xem trước. Tin đã đổi trảPT409, giữ nội dung đang xem và yêu cầu tải lại thay vì ghép hai phiên bản. Dấu phiên bản chỉ dùng kiểm thay đổi; quyền truy cập vẫn do Auth, permission và ownership/RLS.

Mọi phần dùng chung pool4 transaction với các nguồn đọc trước, timeout SQL5 giây/lock1 giây, nội dung JSON tối đa32 KiB. API từ chối ID/cursor/phiên bản sai trước RPC. Không mở SQL, tên bảng hoặc loại raw tùy ý.

## Kiểm chứng

`chat_message_parts_local.cjs --local-fixtures`: **6 nhóm PASS**, trong clone riêng có marker, danh tính Auth local và JWT được PostgREST xác minh. Hash migration139 và số đo: `message-parts-results.txt`.

- Tin mẫu72.000 byte với36.000 ký tự Unicode gồm emoji, tiếng Việt, xuống dòng và ngoặc kép xuất hiện dưới dạng preview, không làm hỏng cả trang.
- Cả Copilot lẫn transcript ghép đúng toàn bộ nội dung:18 phần sau preview, mỗi phần tối đa2.000 ký tự; body JSON lớn nhất **5.165 byte** trong mẫu này. Trần chung vẫn32 KiB, không lấy số đo nhỏ này làm cam kết cho mọi nội dung.
- ADMIN khác không đọc được tin Copilot của chủ sở hữu; staff chỉ có history.read đọc được tin của mình và bị chặn transcript. Không có raw_content trong preview/phần trả về.
- Sửa tin giữa lúc đọc gâyPT409; offset âm và loại raw tùy ý bị22023.
- Khi giữ đủ4 advisory slot bằng transaction riêng, đọc phần bịPT429 ngay.
- Rollback139 xóa RPC đọc phần và phục hồi đúng hành vi138, gồm việc từ chối tin quá lớn khi chưa có cơ chế phần.

`chat_message_parts_api.test.cjs`: **3 test PASS**, scope API luôn là copilot, validation trước RPC và giữ mã403/409. Kết hợp registry/admission/API/privacy thành **24 test offline PASS**.

`chat_message_parts_ui.cjs`: PASS trên frontend thật với transport offline. Không có request phần trước khi bấm; lỗi503 giữ preview, retry đúng offset; các click ghép Unicode đúng và chuỗi HTML không được thực thi. `chat_panel_reads_ui.cjs` mở rộng PASS cho transcript: không prefetch, bấm nối phần vào tin hiện tại và bỏ nút khi xong.

Hồi quy UI paging/cache, trang7 tin, initial-load race, contract, business và40 case planner đều PASS. Không gọi AI, Cloud hoặc Logs. Đã dọn DB clone, hai container và credential tạm sau kiểm marker/label; database nguồn giữ nguyên (`local-environment.txt`). Ảnh hồi quy cũ được khôi phục sau test.

## Phạm vi và triển khai

Giới hạn32 KiB là nội dung nguồn của từng lần đọc, không phải tổng kích thước tin sau nhiều thao tác. Đọc đủ một tin lớn cần nhiều request theo thao tác người dùng; không tuyên bố tổng bytes/request giảm cho toàn bộ tin. Auth/đổi token, các RPC khác và rate limit phân tán vẫn là đầu việc riêng. Trường metadata hoặc trường khác quá lớn vẫn có thể bị từ chối tại trần payload; cơ chế này xử lý phần content.

Áp139 sau nền138 trước khi đưa API/browser mới vào sử dụng. Không fallback về tải nguyên tin lớn khi RPC phần chưa tồn tại. Khi rollback, khôi phục API/browser phiên bản138 trước rồi chạy `139_chat_large_message_parts.rollback.sql`; script phục hồi các function138 và bỏ function phần, không sửa nội dung tin hoặc ghi dữ liệu nghiệp vụ.
