# Sửa dependency Quy định và Trực chat trên Cloud

Ngày31/10/2026. Sau khi sửa Inbox137, người dùng phát hiện tab Quy định vẫn404. Nguyên nhân là nhóm đọc140 chưa có trên Cloud dù giao diện đã dùng. Lượt trước chỉ sửa Inbox nên chưa xử lý đủ dependency của module.

Đã áp migration140 nguyên bản trong một transaction, kiểm tra dependency và yêu cầu các hàm đích chưa tồn tại. Hash sau chuẩn hóa LF khớp bằng chứng kiểm thử local trước đây. Tạo ba RPC đọc trang quy định, đếm và thư viện câu mẫu cùng helper admission. Không sửa hàm lưu hay dữ liệu quy định.

Rà soát ba module trình duyệt còn phát hiện năm RPC đọc thiếu ở Trực chat. Đã tạo đúng các hàm cần dùng từ139 và142: helper history, transcript bounded, đọc phần tin nhắn, helper aux, raw bounded, danh sách nhân viên và chính sách điểm. Không áp toàn bộ139 hoặc thay các hàm lịch sử Copilot. Gói SQL cụ thể và rollback nằm cạnh tài liệu này. Các hàm đích đều chưa tồn tại trước khi áp; wrapper gọi hàm gốc đã có.

Tất cả hàm mới giữ SECURITY INVOKER, quyền authenticated và chặn anon/service_role; vẫn kiểm tra quyền nguồn và RLS. Giữ pool bốn slot dùng chung, timeout5 giây, payload32KiB và phân trang. Không đổi quyền để vượt lỗi. Không chỉnh dữ liệu nghiệp vụ, không thực hiện bù điểm hoặc chuyển người. Một probe raw dùng UUID toàn số0 không tồn tại trả P0002; không đọc raw của tin nhắn thật.

## Kiểm chứng

- Cloud SQL thật trong transaction READ ONLY, `SET LOCAL ROLE authenticated` và danh tính một Admin đang hoạt động: cả sáu trang quy định trả tối đa10 dòng, counts đủ sáu nguồn, thư viện tối đa10 dòng và Inbox137 đều PASS. Chỉ lưu số dòng/dung lượng, không xuất nội dung hay ID khách.
- Cùng quyền Admin/RLS: transcript, đọc phần tin nhắn, danh sách nhân viên và chính sách điểm PASS. Không chạy hàm raw vì hàm gốc có ghi audit.
- Website Vercel thật: ba endpoint140 nhận401/code42501 khi chưa đăng nhập, không còn404. Phiên đăng nhập xuất hiện trong lúc kiểm tra tiếp: ba endpoint transcript rỗng/chính sách/nhân viên trả200, probe phần tin nhắn UUID không tồn tại trả403, probe raw UUID không tồn tại trả500/P0002; không có404. Không xuất nội dung trả về.
- Sau khi có phiên đăng nhập, mở tab kiểm tra riêng tới `/admin#tab-chatbot-rules`, bảng đang hiển thị tải được bốn dòng, không có thông báo lỗi tải; đóng đúng tab kiểm tra sau đó. Đây là smoke UI đọc thực tế, chưa kiểm thử lưu/xóa hoặc mọi tab con/thao tác end-to-end.
- `chat_canned_library_paging_ui.cjs` và `chat_message_parts_ui.cjs`: PASS, transport offline, kiểm tra phân trang/cache/response muộn/draft/Unicode/đọc tiếp theo yêu cầu.
- Rà soát16 tên RPC literal của ba module chatbot trình duyệt: sau sửa không còn tên thiếu. Đây là kiểm tra sự tồn tại, không chứng nhận mọi hành vi, API hoặc tên công cụ động.

Chi tiết: `cloud-apply.txt`, `live-read-apply.txt`, `browser-dependency-audit.txt`. Không đọc Cloud Logs, không gọi model. Đây là sửa runtime có phạm vi; Gate2 và phát hành Production đầy đủ vẫn chưa hoàn tất. Khi rollback cần đưa giao diện về phiên bản tương thích trước khi bỏ các hàm mới.
