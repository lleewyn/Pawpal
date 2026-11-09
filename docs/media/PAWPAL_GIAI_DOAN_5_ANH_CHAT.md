# Giai đoạn 5 — Ảnh trong chat hỗ trợ

Cập nhật 09/11/2026. Phạm vi gồm **khách vãng lai, khách đã đăng nhập, STAFF được giao hội thoại và Admin**. Không yêu cầu khách vãng lai tạo tài khoản.

## Cách lưu và quyền truy cập

- File ảnh nằm trong MongoDB Atlas/GridFS; Supabase lưu phiên upload, metadata và liên kết `chat_message_media` đến đúng tin nhắn.
- Dùng phiên `guest_session` hiện có cho khách vãng lai. API băm token, kiểm tra thời hạn, thu hồi và chủ hội thoại; không đặt token trong URL ảnh.
- Khách đăng nhập dùng Bearer Supabase. STAFF phải có quyền xử lý chat và được giao đúng cuộc trò chuyện. Admin đọc được ảnh; muốn gửi phải tiếp nhận hội thoại theo nghiệp vụ hiện có.
- Tối đa 3 ảnh/tin nhắn, 3 MiB/ảnh; chỉ JPEG, PNG, WebP. Máy chủ kiểm tra nội dung ảnh thực tế. Dùng chung quota 100 MiB của media Preview.
- Ảnh chat luôn riêng tư, `private, no-store`; không dùng cache công khai hoặc ETag/304. Trình duyệt tải ảnh có xác thực rồi tạo URL blob tạm, thu hồi khi thay nội dung/phiên.
- Lưu tin nhắn và gắn ảnh trong cùng giao dịch. Gửi lại giữ nguyên mã tin nhắn và danh sách asset; không được lấy ảnh của phiên/tin nhắn khác hoặc bổ sung ảnh vào yêu cầu đã hoàn tất.
- Gửi ảnh chuyển hội thoại sang chờ nhân viên; trợ lý tự động chưa phân tích nội dung ảnh. Ảnh không được đưa vào lời gọi mô hình văn bản.
- Hủy ảnh nháp không giải phóng quota trước khi dọn file vật lý. Ảnh đã gắn được bảo vệ khỏi tác vụ dọn nháp; xóa tham chiếu áp dụng thời gian giữ 7 ngày.

## Checklist triển khai

- [x] Migration 203: chủ upload tài khoản hoặc phiên khách, ngữ cảnh hội thoại/tin nhắn, liên kết ảnh và RPC nguyên tử.
- [x] Kiểm thử SQL trong CSDL riêng và rollback/reapply; fixture được rollback, không tạo tin nhắn giả trên Cloud.
- [x] Áp dụng migration Cloud sau đối chiếu định nghĩa hàm; không đọc Supabase Logs.
- [x] API `/api/chat-media` dành riêng cho chat; RPC có tham số actor/guest chỉ cấp cho service role.
- [x] Khung chat website: chọn ảnh, gửi, giữ mã gửi và asset khi lỗi, khôi phục yêu cầu đã upload sau reload, đọc ảnh riêng tư.
- [x] STAFF: ảnh trong trả lời khách; ghi chú nội bộ không tự gửi ảnh. Admin: chọn ảnh, retry giữ nguyên payload và đọc ảnh theo quyền.
- [x] Kiểm thử trình duyệt riêng cho khách vãng lai, thành viên, STAFF và Admin; lỗi lưu rồi gửi lại chỉ upload một lần. Thành viên reload rồi thử lại không upload lại.
- [x] Vercel Preview: API thật chặn upload thiếu phiên (401), ảnh không có quyền/không tồn tại (404), danh sách khách chưa mở chat trả rỗng; không ghi nghiệp vụ Cloud.
- [x] Nghiệm thu upload/đọc/hủy nháp chat trên Vercel bằng Admin thật trong hội thoại đang do Admin đó xử lý; hash khớp, anonymous và phiên khách khác nhận 404, hội thoại không thay đổi, không gửi tin nhắn.
- [x] Kiểm tra bộ chọn ảnh trong giao diện Admin thật trên Preview: chọn/xem trước/bỏ ảnh, không thay nội dung soạn và không bấm gửi.
- [x] Dọn đúng file thử và chunks, trả quota thử về 0 byte; deployment dọn tạm đã xóa. `phase5-chat-live-draft-cleanup.txt`.
- [ ] Nghiệm thu gửi ảnh thực tế giữa khách vãng lai/thành viên và STAFF trên Preview, gồm tải lại và thu hồi phân công.
- [x] Khách đăng nhập gửi ảnh kỹ thuật do người dùng cho phép chọn từ assets qua giao diện Preview: ảnh hiển thị sau tải lại/mở chat, đúng một liên kết, hash/16.768 byte khớp, asset/session `attached`, hội thoại `waiting_agent`. Xem `phase5-chat-member-live.txt`. Tin nhắn và ảnh này được giữ lại; chưa nghiệm thu khách vãng lai hoặc STAFF.

## Đồng bộ

Giao dịch gửi cập nhật `chat_conversation.updated_at` cùng lúc lưu tin nhắn/ảnh. Admin đang lắng nghe Realtime của bảng này và nạp lại metadata ảnh qua RPC sau commit. Khung chat khách giữ cơ chế đọc có kiểm tra phiên và revision mỗi 10 giây khi đang mở; không mở quyền SELECT ảnh/phiên khách để làm Realtime trực tiếp.

## Bằng chứng

- `phase5-chat-database.txt`, `phase5-chat-cloud.txt`: SQL, quyền khách, thời hạn/thu hồi, sai đích, nguyên tử, retry và quyền STAFF sau đổi phân công.
- `phase5-chat-guest-mobile.png`, `phase5-chat-member-desktop.png`, `phase5-chat-staff-mobile.png`, `phase5-chat-admin-desktop.png`: giao diện kiểm thử riêng.
- `phase5-chat-browser-checks.txt`, `phase5-chat-live-preview.txt`, `phase5-chat-live-draft-cleanup.txt`: kết quả trình duyệt, Admin thật trên Vercel và dọn file/quota. Preview dùng lúc nghiệm thu chat đã được thay thế; Preview hiện tại xem trong `phase5-evidence-preview-finalized.txt` và biên bản chốt kiểm tra Admin.
- `npm run test:media`: 39/39 đạt; nhóm kiểm thử chủ sở hữu, streaming, thành viên và chat công khai: 33/33 đạt sau mở rộng media.

Chưa gọi giai đoạn 5 hoàn tất nghiệm thu: các ô tài khoản thật/nghiệp vụ thật trên Preview vẫn để mở. Không phát hành Production, không push.
