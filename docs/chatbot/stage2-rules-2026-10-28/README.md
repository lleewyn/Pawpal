# Giới hạn đọc quy tắc và thư viện câu mẫu

Ngày 28/10/2026. Migration140 đã triển khai và kiểm chứng trên clone local; chưa áp Cloud, chưa push. Gate2 tổng tài nguyên vẫn mở.

## Thay đổi

- Trang quy tắc dùng `admin_chat_rule_page_bounded`: giữ trang10 dòng, tìm/lọc và tổng số chính xác của RPC100; thêm whitelist tham số theo nhóm, quyền nguồn, timeout SQL5 giây/lock1 giây và cap nội dung32 KiB trước trả ra.
- Đếm huy hiệu các nhóm chưa mở được gom từ tối đa5 request song song thành một `admin_chat_rule_counts`. Chỉ nhận danh mục tối đa6 bảng quy tắc cố định, không cho tên bảng ngoài danh mục. Các truy vấn count chạy trong một transaction và chỉ trả số, không tải nội dung.
- Nguồn thiếu quyền bị bỏ khỏi kết quả đếm, không trả0 giả. Giao diện hiển thị dấu `—` khi chưa biết số đếm hoặc khi đọc lỗi. Không bắt nhân viên có quyền chat/history nếu chỉ được cấp quyền đọc một nhóm quy tắc.
- Thư viện câu mẫu bỏ vòng lặp tải toàn bộ dữ liệu từng đợt500 dòng. `admin_chat_canned_page` chỉ trả10 mẫu đang hoạt động/lần, tìm kiếm/chủ đề và phân trang tại SQL; sắp xếp theo số lần dùng và ID ổn định. Chủ đề được lấy từ toàn bộ nguồn active, không giới hạn trong trang đang xem.
- Modal có nút `<`, số trang và `>` ở ngoài danh sách cuộn. Bộ lọc không còn các số/chủ đề cố định giả. Chỉ bấm **Chèn vào chat** mới đổi bản nháp, không tự gửi tin.
- Ba đường đọc dùng chung4 advisory slot với nguồn Copilot/Inbox/history, không thêm acquire/release RPC cho mỗi trang. Đủ tải trảPT429 ngay; không tự retry hoặc prefetch.
- Cache60 giây và gộp request trùng vẫn giữ, theo từng truy vấn/trang và danh tính của DataStore. Realtime hoặc ghi quy tắc thành công hủy cache liên quan; không thêm channel hoặc polling. Search debounce250ms, hủy áp dụng response cũ, đóng modal trước khi timer chạy thì không tải thêm.

## Kiểm chứng local

`chat_rule_reads_local.cjs --local-fixtures`: **7 nhóm PASS**, danh tính Auth local, JWT được PostgREST xác minh, SQL/RLS thật trong database có marker riêng. Hash migration và số đo trong `rule-read-results.txt`.

| Kiểm tra | Kết quả |
|---|---|
|23 mẫu active và1 inactive trong fixture |Ba trang10/10/3, đủ23 ID không lặp; không trả inactive |
|Chủ đề B chỉ xuất hiện sau trang đầu |Có trong bộ lọc ngay từ trang1; lọc B ra13 mẫu, yêu cầu trang99 được kẹp về trang2 |
|Đếm đủ5 nguồn cho ADMIN |Một RPC, body158 byte trong fixture; thay5 request đếm độc lập |
|Staff chỉ có canned.read |Đọc được thư viện, không cần chat/history; nguồn FAQ không có trong counts và trang FAQ bị403 |
|Không có quyền, tên bảng/filter/status/page sai |403 hoặc22023, không trả dữ liệu giả |
|Giữ đủ4 slot ở transaction local khác |Cả ba RPC đềuPT429 |
|Khóa bảng khi count, timeout thử nghiệm200ms |PostgreSQL trả57014 trước1,5 giây dù lock giữ2 giây; sau test khôi phục5 giây |
|Trang rule/canned có nội dung quá lớn |54000 trước phát nội dung; count vẫn đọc được |
|Rollback140 |Bỏ ba RPC/helper mới, giữ RPC100 gốc |

Trang thư viện mẫu có body lớn nhất2.848 byte trong fixture này; giới hạn source chung vẫn32 KiB. Không lấy fixture nhỏ làm chứng nhận dung lượng hoặc năng lực Cloud. COUNT vẫn thực thi truy vấn nội bộ SQL và có thể quét dữ liệu; giảm round trip không có nghĩa mọi công việc database trở thành hằng số.

## Kiểm chứng giao diện

`chat_canned_library_paging_ui.cjs`: PASS trên module/renderer thật, transport offline. Xác nhận không tải thư viện khi đang ẩn,10 dòng/trang, không tải các trang còn lại tự động, tìm ở trang/chủ đề ngoài trang đầu, mở lại dùng cache, giữ draft trước khi chèn, escape HTML, không để response cũ ghi đè, và lỗi đọc khác với danh sách rỗng. Đóng bằng Escape trước khi debounce chạy không phát request mới.

Đã xem ảnh desktop1440 và điện thoại390: [desktop](canned-desktop.png), [điện thoại](canned-mobile.png). Chỉnh riêng modal thư viện: ô tìm kiếm đủ rộng trên điện thoại, bo9px, bỏ viền chia ngang header/footer và nền/khung lồng trong các mục; phân trang ngoài vùng cuộn. Không sửa các modal quản lý quy tắc khác trong đợt này.

`admin_chatbot_paging_cache_ui.cjs`: PASS, phần đếm chuyển sang một RPC và kiểm trường hợp lỗi hiển thị `—`; cache/coalescing, tải lười và deferred Realtime vẫn đạt. UI panel, business,40 case planner và24 test registry/admission/API/privacy cũng PASS. Ảnh hồi quy cũ được khôi phục sau test.

Không gọi Cloud, AI hoặc Logs. Đã thử rollback140, rồi xác minh marker/label và dọn database clone, hai container cùng credential tạm; nguồn được giữ nguyên (`local-environment.txt`).

## Phạm vi còn lại

- Một trang quy tắc/câu mẫu vượt32 KiB hiện bị từ chối rõ, không cắt nội dung rồi cho sửa/chèn bản thiếu. Chưa có luồng đọc chi tiết từng trường lớn cho trình biên tập quy tắc; có thể cần thu hẹp tìm kiếm. Không tuyên bố mọi dữ liệu quy tắc kích thước bất kỳ đều đọc được.
- Đợt141–143 đã thêm [rate cấp lượt dùng chung và nguồn raw/handlers/policies/benchmark/public](../stage2-rate-aux-2026-10-28/README.md). Auth, kiểm chống lặp/lưu, ingress trước Auth và các đường public/DB gốc còn phần ngoài pool. DB16/G2.2 tổng tài nguyên chưa đóng.
- Nguồn đếm cố định tối đa6 key số nên payload nhỏ theo cấu trúc; trần32 KiB áp trực tiếp lên hai RPC trang. Không suy từ đây thành giới hạn mọi kết nối hoặc tổng bytes của ứng dụng.

## Triển khai

Áp140 với dependency RPC100 trước triển khai browser mới. Không fallback về vòng lặp tải500 dòng hoặc count trực tiếp khi RPC mới thiếu. Khi rollback, đưa browser về bản trước rồi chạy `140_chat_rule_reads.rollback.sql`; không sửa dữ liệu quy tắc. Giữ các migration trước theo kế hoạch riêng, không tự áp lên Cloud.
