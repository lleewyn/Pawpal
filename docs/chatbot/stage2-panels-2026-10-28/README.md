# Giảm truy vấn trực tiếp của Inbox và hồ sơ khách

Ngày 28/10/2026. Đã triển khai và kiểm chứng local; migration137 chưa áp Cloud, chưa push. Gate2 tổng tài nguyên vẫn mở.

## Thay đổi

- Inbox dùng `get_admin_chat_inbox_view`: trả trang10 hội thoại kèm tên/email/điện thoại đã giới hạn theo caller. Bỏ ba lượt enrich từ trình duyệt. Giữ tìm kiếm, thống kê, phân trang và tin nhắn mới nhất của RPC089.
- Hồ sơ khách dùng `get_admin_chat_customer_panel`: gom sáu lượt HTTP DB thành một. Không còn tải toàn bộ danh sách thú cưng hoặc join appointment_item chưa dùng. Tối đa10 bé cưng,5 khiếu nại mở, một đơn và một lịch gần nhất; dùng ID để sắp xếp ổn định khi trùng thời gian. Có cờ còn dữ liệu và thông báo trên UI, không âm thầm coi phần trả về là toàn bộ danh sách.
- Cả hai RPC dùng quyền caller và RLS, kiểm permission nguồn, timeout SQL5 giây/lock1 giây, chặn nội dung JSON lớn hơn32 KiB trước khi trả ra. Không dùng service role để lấy hồ sơ. Nhân viên thiếu quyền nguồn nhận42501, không trả thông tin khách hoặc số dư0 giả.
- RPC từ trình duyệt dùng cùng bốn advisory slot transaction với nguồn Copilot của migration136. Khi đầy trảPT429 ngay, không hàng đợi/retry ngầm. Không thêm hai lượt acquire/release cho mỗi lần tải panel: lock được giữ và giải phóng trong chính transaction đọc.
- Cache hồ sơ tối đa50 khách, thời hạn30 giây; các lần tải đồng thời cùng khách dùng chung một promise. Sau đổi điểm/tạo khiếu nại, bỏ cache trước lần nạp tiếp. Không thêm polling. Đổi phiên bản request ngăn response cũ ghi đè cache hoặc thông tin vừa tải mới.
- Khi nguồn lỗi, UI ghi rõ chưa tải được điểm/thú cưng/đơn/lịch/khiếu nại, không dùng dữ liệu trống hoặc0 làm kết luận nghiệp vụ.

## Kiểm chứng

`chat_panel_reads_local.cjs --local-fixtures`: **5 nhóm PASS**, JWT Auth local, PostgREST thật, database có marker riêng. `panel-results.txt` lưu hash migration136/137, kết quả quyền/budget và số đo; không lưu token hoặc nội dung khách.

| Mẫu local | Trước | Sau |
|---|---:|---:|
| Inbox một khách: lượt HTTP DB | 4 | 1 |
| Tổng body JSON Inbox và enrich, cùng fixture | 725 byte | 653 byte |
| Hồ sơ khách: lượt HTTP DB | 6 trong luồng JS cũ | 1 RPC thật |
| Hồ sơ mẫu11 thú cưng: nội dung phản hồi mới | Không dùng làm baseline bytes cũ | 1.186 byte, trả10 bé và petsHasMore |

Đã thử dữ liệu6 khiếu nại: trả5 và ticketsHasMore. Thử staff chỉ có chat.read và JWT không phải staff đều bị403. Khi một transaction local giữ đủ bốn slot, cả Inbox, panel và `run_admin_chat_read` đều bịPT429; giải phóng xong đọc lại thành công. Nội dung dài trong Inbox hoặc ghi chú thú cưng gây54000 tại SQL trước trả payload. Tham số tìm kiếm null bị22023.

Số đo là body JSON và số lượt gọi của fixture nhỏ, không phải tổng băng thông có TLS/header/Auth hoặc chứng nhận tải Cloud. Giảm round trip không đồng nghĩa mọi truy vấn nội bộ SQL đều biến thành một thao tác bảng; giới hạn thời gian, projection và số dòng vẫn cần giữ.

`chat_panel_reads_ui.cjs`: **PASS** trên module/renderer thật, transport offline. Kiểm một RPC Inbox, coalescing, TTL, invalidation, response cũ đến muộn, thông báo phần dữ liệu còn lại và không false-zero khi lỗi. Ảnh đã xem: [panel-ui.png](panel-ui.png).

Hồi quy `admin_chatbot_paging_cache_ui.cjs`, `chatbot_business_ui.cjs` và21 test registry/admission/API/privacy đều PASS. Ảnh hồi quy cũ được khôi phục sau bài test, không trộn thay đổi vào bằng chứng khác.

Lượt kiểm tra lặp đầu dùng nhãn fixture không duy nhất nên tìm thấy hai khách thay vì một. Đã sửa riêng fixture để có nhãn UUID theo từng lần chạy; logic truy vấn ứng dụng giữ nguyên. Kết quả cuối dùng nhãn duy nhất và PASS.

Đã thử rollback137 rồi136 trên clone: các function mới được bỏ, RPC Inbox gốc vẫn tồn tại (`rollback-results.txt`). Sau đó kiểm marker/label và xóa đúng DB clone, hai container, credential tạm; nguồn vẫn còn (`local-environment.txt`). Không gọi Cloud, Logs hay AI.

## Các lượt ngoài hạn mức nguồn hiện tại

| Đường đọc | Hiện trạng và việc còn lại |
|---|---|
| POST Copilot facts | Hai lượt xác thực hiện tại (Auth getUser và staff context), kiểm request chống lặp, acquire,1–3 nguồn, lưu và release:7–9 lượt Auth/DB khi thành công, không model. Hạn mức bốn slot chỉ giữ transaction nguồn, chưa bao phủ các lượt còn lại. |
| GET Copilot sessions/history | Đợt138 đã [đưa nguồn vào pool và gom history/title](../stage2-history-2026-10-28/README.md), còn3 lượt Auth/DB khi đọc history/title. Hai lượt Auth vẫn ngoài pool. |
| Trình duyệt Inbox/panel | Đã đi qua pool chung; giữ JWT/RLS. Auth refresh của SDK không nằm trong số đo panel. |
| Transcript, rules/counts/canned/raw/handlers và RPC cũ | Đợt138 đã đưa transcript của UI vào pool; rules/counts/canned/raw/handlers và RPC gốc vẫn có đường riêng, không tuyên bố tất cả direct DB đã được chặn. |
| Benchmark, public chatbot, Realtime/polling và thao tác ghi | Chưa được bao phủ bởi migration137. Không tự đổi ngân sách nghiệp vụ ghi hoặc thêm vòng quét nền để bù. |

Hạn mức10 câu/phút của API hiện còn theo process. Cần thiết kế hạn mức dùng chung cho request trước/ngoài source, gồm Auth, và hoàn tất các đường còn lại trước đánh dấu DB16/Gate2 tài nguyên toàn hệ thống. Không bỏ xác thực hoặc cache quyền để giảm số request.

## Thứ tự triển khai

Áp migration137 sau các dependency Inbox089 và pool136, rồi triển khai JS mới. Không fallback về các truy vấn cũ khi thiếu RPC mới. Khi rollback, đưa browser module về phiên bản trước rồi chạy `137_chat_panel_reads.rollback.sql`; không xóa RPC khi browser mới vẫn đang hoạt động. Script có timeout lock/statement riêng và không sửa dữ liệu nghiệp vụ.
