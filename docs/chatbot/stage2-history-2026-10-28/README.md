# Lịch sử Copilot và transcript có giới hạn

Ngày 28/10/2026. Migration138 đã kiểm chứng và rollback trên clone local; chưa áp Cloud, chưa push. Không đóng Gate2 tổng tài nguyên từ kết quả này.

## Thay đổi

- GET danh sách phiên dùng `admin_copilot_sessions_bounded`, giữ trang10 phiên, caller và quyền đọc lịch sử; thêm timeout5 giây/lock1 giây, cap nội dung32 KiB và pool chung4 transaction.
- GET lịch sử dùng `admin_copilot_history_page`: một RPC trả lịch sử và tiêu đề khi cần. Actor lấy từ ngữ cảnh đăng nhập, không nhận staff_id từ request, không đòi thêm quyền staff.read. Dữ liệu vẫn lọc theo actor và session.
- Bỏ đường GET không chỉ định session từng trả tới200 dòng; đường tương thích này nay dùng cùng trang tối đa30 tin, chỉ của chính caller, có hasMore. Frontend hiện dùng danh sách phiên và session cụ thể.
- Trang lịch sử giảm số tin theo ngân sách bytes, giữ nguyên nội dung từng tin và thứ tự; có hasMore khi còn dữ liệu. Frontend lấy offset theo số tin thực đã tải, không giả định mỗi trang luôn30 tin. Tiêu đề trình bày tối đa80 ký tự, phù hợp độ dài tiêu đề đang lưu.
- Transcript dùng `get_admin_chat_messages_bounded`: giữ quyền nghiệp vụ từ RPC053, projection công khai cho staff và cursor theo thời gian/ID. Hợp đồng mới `{messages,hasMore}` giúp trang ít hơn30 tin vẫn tải tiếp được. Quyền truy cập transcript theo chat.read/message.read gốc, không nhầm với lịch sử Copilot riêng của từng nhân viên.
- Cả ba luồng giữ cùng bốn advisory slot với nguồn Copilot/Inbox/panel; đầy trảPT429 ngay. Chưa bao phủ lượt Auth trước đó, chống lặp, lưu history hoặc RPC gốc được gọi trực tiếp.
- Lượt138 ban đầu từ chối tin đơn lẻ vượt32 KiB bằng54000. Đợt139 đã bổ sung [preview và công cụ đọc phần theo thao tác](../stage2-message-parts-2026-10-28/README.md), giữ nội dung, quyền và phiên bản. Nhiều tin dài hoặc nhiều phần vẫn cần nhiều request để giữ trần bytes; không tuyên bố giảm mọi round trip.

## Kiểm chứng

`chat_history_reads_local.cjs --local-fixtures`: **8 nhóm PASS** qua JWT đăng nhập GoTrue thật, PostgREST thật và API thật trong database riêng có marker. Hash migration và kết quả: `history-results.txt`.

| Kiểm tra | Kết quả |
|---|---|
|35 tin Copilot, mỗi tin1.000 chữ có dấu và hậu tố riêng |3 trang; body nguồn lớn nhất31.287 byte; đủ35 ID duy nhất, nội dung không bị cắt |
|35 tin transcript dài tương tự |3 trang; cursor đi tiếp đúng; đủ35 tin, không có raw_content |
|Hai ADMIN dùng cùng session UUID |Chỉ thấy dữ liệu của chính actor |
|Staff chỉ có history.read |Đọc được lịch sử của mình, không bị ép staff.read; không đọc được transcript |
|JWT không phải staff |403 |
|API GET history có tiêu đề |3 lượt Auth/DB: Auth getUser, staff context và một RPC history/title; trước đây cần thêm truy vấn title khi chưa có trong danh sách |
|Giữ đủ4 advisory slot bằng transaction local riêng |History, danh sách phiên và transcript đều bịPT429 |
|Khóa bảng history, timeout wrapper thử nghiệm200ms |SQL trả57014 trước1,5 giây dù lock giữ2 giây; sau test khôi phục5 giây |
|Tin đơn lẻ34.000 byte/offset âm |54000/22023; không false-empty hoặc cắt nội dung |
|Rollback138 |Ba wrapper mới được bỏ; giữ nguyên các RPC gốc |

Trong lúc kiểm chứng đã sửa lỗi thật của RPC mới: lookup staff qua bảng RLS làm nhân viên history.read bị yêu cầu thêm staff.read. Actor nay lấy qua login-context đã xác thực, không nới quyền bảng. Lỗi fixture ban đầu thiếu chủ sở hữu hội thoại và lỗi helper chờ hết thời gian giữ lock được sửa trong test; không thay ràng buộc nghiệp vụ để làm test đạt.

`chat_history_pages_ui.cjs`: PASS trên frontend Copilot thật với trang7 tin thay vì30; offset0/7/14/21/28, hiển thị đủ35 tin và dừng đúng lúc. `chat_panel_reads_ui.cjs` mở rộng PASS: trang transcript7 tin vẫn có nút tải tiếp, cursor gửi đúng và ghép trang cũ vào đúng thứ tự.

Các bài UI paging/cache, business, contract, initial-load race,40 case business và21 test registry/admission/API/privacy đều PASS. Không gọi model, Cloud hoặc Logs. Đã dọn DB clone, hai container và credential tạm sau kiểm marker; nguồn được giữ nguyên (`local-environment.txt`).

## Triển khai và phần còn lại

Áp138 với các dependency053/099 và context đăng nhập hiện có trước triển khai API/JS mới. Không fallback gọi RPC không giới hạn khi thiếu function mới. Khi rollback: khôi phục API/browser trước, rồi chạy `138_chat_history_reads.rollback.sql`; không bỏ các RPC khi browser mới còn đang hoạt động.

Đợt140 đã bao phủ [trang rules/counts/canned](../stage2-rules-2026-10-28/README.md). Raw/handlers, benchmark/public và các đường direct RPC khác vẫn cần xử lý; rate limit theo phút dùng chung, tổng Auth/DB, request chống lặp/lưu và Auth refresh chưa được giới hạn toàn hệ thống. DB16 và G2.2 tổng tài nguyên tiếp tục để mở. Không tăng pool hoặc bỏ xác thực để đóng checklist.
