# Sửa lỗi 404 Trực chat trên Vercel

Ngày 31/10/2026. Giao diện đã gọi `get_admin_chat_inbox_view`, nhưng Cloud chưa có RPC này và `get_admin_chat_customer_panel`. RPC Inbox gốc và hàm kiểm tra quyền vẫn tồn tại.

Đã áp đúng migration137 trong một transaction, kiểm tra dependency và xác nhận ba hàm mới chưa tồn tại trước khi tạo. Không sửa dữ liệu nghiệp vụ. Hai RPC công khai dùng SECURITY INVOKER, quyền authenticated, không cấp anon; giữ kiểm tra quyền nguồn/RLS, trang10 hội thoại, payload32KiB, timeout5 giây và bốn slot đọc dùng chung. Rollback có sẵn tại `scripts/database/v1/137_chat_panel_reads.rollback.sql`; phải đưa giao diện về bản tương thích trước khi bỏ RPC.

Hash nguồn sau chuẩn hóa CRLF sang LF khớp bằng chứng kiểm thử local trước đây. Lần kiểm tra hash đầu dùng byte CRLF nên dừng trước kết nối/mutation; sau đó đối chiếu đúng hash LF mới áp dụng. Chi tiết không chứa dữ liệu khách hoặc credential: [cloud-apply.txt](cloud-apply.txt).

Kiểm tra sau sửa:

- `node scripts/test/chat_panel_reads_ui.cjs`: PASS cho một RPC Inbox, cache/coalescing/TTL/invalidation, phản hồi đến muộn, hasMore và không hiển thị số dư0 giả khi lỗi. Đây là transport offline.
- Từ website thật `https://pawpalgr3.vercel.app/admin`, trình duyệt kiểm thử chuyển về đăng nhập. Gọi RPC qua SupabaseClient công khai nhận HTTP401/code42501, không còn404/PGRST202 và không trả dữ liệu. Xác nhận schema cache đã nhận hàm và anon vẫn bị chặn.
- Chưa nghiệm thu danh sách bằng phiên Admin trên Vercel vì trình duyệt kiểm thử không có phiên đăng nhập. Không lấy token từ ảnh hoặc phiên người dùng, không đọc Cloud Logs, không gọi model.

Đây là sửa dependency runtime137; không đánh dấu toàn bộ giai đoạn2 hoặc phát hành Production hoàn tất.
