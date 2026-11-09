# Giai đoạn 5 — Chốt kiểm tra bằng Admin

Cập nhật 09/11/2026. Phần triển khai các nhóm ảnh đã có trong mã; giai đoạn 5 **chưa đủ điều kiện đóng toàn bộ nghiệm thu**.

Preview mới nhất: xem `phase5-evidence-preview-finalized.txt`. Bản nghiệm thu Admin đã kiểm tra modal sửa bài viết dùng tiêu đề/nút lưu đúng, giữ nguồn ảnh cũ sau khôi phục và khóa cấu hình đang bật.

Đính chính lỗi đăng nhập khách trên các Preview trước: script triển khai thiếu bộ biến Supabase mà API khách hàng sử dụng, nên trả 503 trước khi xử lý tài khoản. Đã bổ sung cấu hình và kiểm tra trên Preview mới: lookup trả 200, nút Tiếp tục chuyển sang nhập mật khẩu. Không coi lỗi cấu hình này là bằng chứng tài khoản khách không tồn tại. Chưa nhập mật khẩu hoặc xác nhận phiên khách thật. Xem `phase5-customer-preview-auth-fix.txt`.

## Đã hoàn thiện thêm

- Khách đăng nhập đã gửi một ảnh mẫu qua chat trên Preview theo yêu cầu người dùng tự chọn ảnh. Tải lại trang và mở lại chat vẫn hiển thị ảnh; đối chiếu CSDL chỉ đọc xác nhận đúng một liên kết, hash khớp, 16.768 byte, asset/session đã gắn. Giữ tin nhắn kỹ thuật và ảnh đã gửi; quota hiện có phần sử dụng này. Xem `phase5-chat-member-live.txt`. Chưa nghiệm thu người nhận STAFF hoặc khách vãng lai.
- Realtime của ảnh đánh giá: Admin cập nhật danh sách và dữ liệu đánh giá khi `review_media`/phản hồi đổi; trang chi tiết đơn/lịch hẹn theo dõi metadata ảnh qua quyền RLS.
- Giữ bản nháp đánh giá khi chỉ chọn ảnh, chỉ chọn mức đánh giá, đang nhập nhận xét hoặc đang gửi. Form sạch được nạp lại để tránh giữ metadata cũ. Bộ lắng nghe đã hủy không tiếp tục refresh.
- Sửa bài viết chỉ thay ảnh sẽ giữ nguyên ngày công bố và trạng thái cũ; tiêu đề/nút lưu phản ánh đúng đang sửa hay tạo mới.

## Nghiệm thu thật trên Vercel

| Luồng | Kết quả |
|---|---|
| Avatar thú cưng | Admin thật lưu đúng ảnh gốc qua modal; tải private 200, hash khớp; anonymous 404 |
| Ảnh đại diện bài viết | Admin thật lưu đúng ảnh gốc qua modal; tải công khai 200, hash khớp; nội dung, trạng thái, ngày công bố giữ nguyên |
| Khôi phục | Đối chiếu toàn bộ snapshot và `updated_at`, cả hai bản ghi trở về chính xác trạng thái trước thử |
| Dọn file | Xóa đúng 2 file/chunks thử, giải phóng 59.989 byte; không xóa file khác |
| Khóa cấu hình | Chỉ mở khóa giao diện cho thao tác đã được phép, bật lại sau thử; không thay chính sách vận hành |

Không tạo phiếu tiếp nhận, bàn giao, phụ phí, khiếu nại, đổi trả, đánh giá hoặc tin nhắn giả trên Cloud. Thao tác sửa ảnh bài viết dùng luồng audit nghiệp vụ hiện có; không xóa dấu vết audit để che việc thử rồi khôi phục.

## Kiểm thử

- `npm run test:media`: 43/43 đạt, gồm kiểm tra giữ bản nháp và subscription.
- Trình duyệt riêng: form chỉ có ảnh vẫn được giữ nguyên khi refresh nền; bỏ ảnh và không còn thay đổi thì form được nạp lại.
- Form sửa bài viết giữ đúng ngày công bố, trạng thái `published` và slug của bản ghi kiểm thử riêng.
- Kiểm tra trực quan modal bài viết trên Preview; ảnh chụp thực tế lưu trong thư mục hạ tầng riêng, không đưa nội dung nghiệp vụ vào repo.
- `phase5-admin-live-media-cleanup.txt`: bằng chứng dọn file/quota.

## Các mục còn thiếu

- Chưa có tài khoản STAFF riêng; cửa sổ dự định dùng STAFF thực tế đăng nhập với vai trò ADMIN. Đã kiểm tra trực tiếp phiên khách trong Microsoft Edge trên Preview: trang tài khoản, danh sách đơn, chi tiết đơn hoàn thành, đánh giá chờ duyệt và hồ sơ đổi trả tải được. Phần đánh giá và hồ sơ đổi trả đã xem đều hiển thị chưa có ảnh. Đây là bằng chứng truy cập giao diện bằng phiên khách thật; chưa thay thế kiểm tra upload/lưu/tải lại ảnh hoặc đối chiếu API quyền sở hữu. Không dùng phiên Admin để kết luận đã nghiệm thu STAFF.
- Chưa có dữ liệu/ảnh thực tế và xác nhận nghiệp vụ để lưu tiếp nhận, bàn giao, phụ phí, khiếu nại/hoàn trả, đánh giá và trao đổi ảnh chat giữa các vai trò.
- Ảnh banner gốc kiểm tra hiện vượt 3 MiB; cần ảnh banner đúng nội dung và trong giới hạn để nghiệm thu thay trực tiếp.

Không đánh dấu các mục trên hoàn thành. Upload vẫn chỉ bật trên Preview, quota 100 MiB, video tắt; Production và Git remote không thay đổi.

## Thứ tự tiếp tục nghiệm thu

1. Giữ phiên khách trong Microsoft Edge tại Preview `https://pawpalgr3-5bph12hep-llwyns-projects.vercel.app`. Đã xem được dữ liệu qua giao diện; bước đối chiếu API quyền sở hữu còn cần kiểm tra, không yêu cầu gửi mật khẩu/token.
2. Đọc danh sách đơn/lịch hẹn của chính khách để xác định luồng đủ điều kiện. Chỉ lưu đánh giá, bằng chứng hoặc tin nhắn khi có nội dung/ảnh thực tế được người dùng chỉ định; nếu chưa có bản ghi đủ điều kiện thì ghi rõ lý do.
3. Kiểm tra từng luồng: upload, lưu, tải lại, quyền đọc đúng chủ và chặn người ngoài; đối chiếu ảnh và quota. Không suy ra đã đạt từ kiểm thử SQL hoặc chỉ xem trước ảnh.
4. Nghiệm thu STAFF khi có tài khoản mang vai trò STAFF thật và ca được phân công. Admin không thay thế bước này.
5. Nghiệm thu banner khi có ảnh đúng nội dung, đúng kích thước thiết kế và không quá 3 MiB. Sau thử, dọn đúng file nháp/thử, thu hồi bypass tạm và cập nhật từng ô theo bằng chứng.
