# Lịch sử khách hàng có trần dữ liệu

Ngày 28/10/2026. Đã push checkpoint giai đoạn2 đến migration143 lên `origin/feat/guest-admin-identity`, commit **472da7ed87ec8fcf95ef8e9c56e49cab4beca3ce**, sau kiểm tra test và đối chiếu SHA remote. Ba tài liệu đã bị xóa trước tác vụ không nằm trong commit. Phần tiếp theo ở đây (migration144/API/widget/test) hiện còn local, chưa push; chưa áp migration lên Cloud.

## Thay đổi

- `public_read` giữ xác thực và kiểm ownership trước khi gọi một RPC `read_public_chat_page`, gom đọc tin và trạng thái feedback. Revision không đổi vẫn trả notModified trước RPC, không đọc lại lịch sử hoặc feedback.
- RPC chỉ service role được gọi; guest/member không truy cập trực tiếp. Source dùng chung4 transaction slot với các nguồn chatbot khác, SQL timeout5 giây/lock1 giây, trần JSON nguồn32 KiB. Tối đa30 tin; giảm số tin theo bytes, giữ nguyên từng tin và báo hasMore. Lookahead31 giúp biết khi nào thực sự còn tin.
- SQL chỉ trả id/sender_type/content/created_at và metadata đã allowlist cho CSAT. Không tải nguyên metadata rồi mới lọc ở API; raw_content, ghi chú nội bộ và nội dung feedback không nằm trong projection.
- Tin đơn lẻ quá lớn có preview tối đa1.200 ký tự và nút **Đọc tiếp tin nhắn**. Mỗi thao tác đọc thêm tối đa2.000 ký tự qua `public_read_part`, vẫn kiểm ownership, conversation/message và dấu phiên bản. Không dùng endpoint staff raw, không tự tải toàn bộ.
- Widget dùng hasMore thay vì suy từ số30. Phần đang đọc được coalesce theo epoch/conv/message/offset/revision, không ghép trùng khi DOM render lại. Refresh giữ phần đã mở nếu cùng phiên bản; đổi tài khoản hủy/bỏ response cũ và giữ draft mới đúng chủ.
- Khi một trang tin mới không giao nhau với lịch sử đang hiển thị và vẫn còn phần chưa tải, widget không ghép hai đoạn rời rồi làm mất đường đọc đoạn giữa. Hiện **Xem tin nhắn mới** để người dùng chuyển trang; sau đó cursor **Tin nhắn trước** vẫn đi qua toàn bộ đoạn còn lại. Không thêm vòng tải nền để lấp khoảng trống.
- Giữ interval polling10 giây hiện có và các điều kiện ẩn/busy. Không thêm channel, polling hoặc retry tự động. Các nút đọc là text-only, có style riêng; bản nháp không bị đổi bởi thao tác đọc.

## Kiểm chứng local

`chat_public_history_local.cjs --local-fixtures`: **9 nhóm PASS** qua Auth GoTrue/JWT, active handler/SDK/PostgREST thật, clone riêng có marker. Hash migration và số đo: `public-history-results.txt`.

| Đường đọc | Trước (baseline) | Sau |
|---|---:|---:|
| Thành viên: lần đọc đầu |5 lượt Auth/DB |4 |
| Guest: lần đọc đầu |4 lượt DB |3 |
| Thành viên: revision không đổi |3 |3, không RPC lịch sử |
| Guest: revision không đổi |2 |2, không RPC lịch sử |

Hai danh tính đều tải đủ35 tin dài, qua3 trang; không trùng/mất ID dù thời gian có giá trị trùng nhau. Body API lớn nhất32.270 byte trong fixture. Trần32 KiB áp lên JSON nguồn SQL; không bao gồm HTTP header hoặc envelope trạng thái/revision của API. Không lấy mẫu này làm cam kết tổng băng thông/SLO Production.

Đã kiểm owner sai bị403 trước source, CSAT submitted false/true giữ đúng allowlist, và tin Unicode dài được ghép đủ qua10 phần. Dùng conversation của chính mình để xin message thuộc conversation khác cũng bị403. Sửa tin giữa lúc đọc gây409. Function mới bị từ chối khi gọi trực tiếp bằng JWT member/anon.

Pool đủ4 slot trả429; timeout thử nghiệm200ms thực sự hủy truy vấn đang chờ khóa bảng2 giây. Sau test khôi phục5 giây. Rollback144 bỏ đúng hai function mới, giữ các operation cũ.

## Giao diện và hồi quy

`chat_public_history_widget.cjs`: PASS trên widget thật, transport offline: trang7/5 tin vẫn tải tiếp, đọc phần theo thao tác, retry giữ preview/draft, coalesce khi render lại, refresh giữ phần đã mở, HTML không thực thi, đoạn lịch sử mới không mất đường đọc, và late response của tài khoản A không hiện trong B. Ảnh đã xem: [widget](widget.png).

`chat_widget_session_races.cjs` (8 nhóm) và `chat_widget_reload_retry.cjs` (2 nhóm) đều PASS. Bộ32 test API/registry/admission/privacy/public-owner/message-parts,40 case business/extended và UI Copilot paging đều PASS. Không gọi Cloud, AI hoặc Logs.

Sau kiểm chứng và rollback đã xóa đúng DB clone, hai container và credential tạm sau xác minh marker/label; database nguồn giữ nguyên (`local-environment.txt`).

## Phạm vi còn lại

Gate2 tổng tài nguyên vẫn mở: Auth trước source, public open/list/mode/feedback, kiểm ownership/chống lặp và thao tác lưu/audit/config còn phần ngoài source pool. RPC/table gốc còn để tương thích; chưa có hard cap ingress toàn hệ thống ở hosting. Không thêm Redis/Upstash theo lựa chọn người dùng. Các luồng chỉnh sửa rule/raw quá lớn vẫn có giới hạn riêng đã ghi.

Triển khai: áp dependency143 và144 trước API/widget mới. Thiếu RPC thì fail closed, không fallback đọc nguyên lịch sử không giới hạn. Khi rollback, khôi phục API/widget trước rồi chạy `144_public_chat_history_budget.rollback.sql`. Phần144 chưa push trong lượt này theo thứ tự yêu cầu “push rồi làm tiếp”.
