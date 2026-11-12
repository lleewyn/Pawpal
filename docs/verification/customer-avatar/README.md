# Ảnh đại diện tài khoản User

Trang tài khoản có Đổi ảnh và Xóa ảnh. Ảnh được lưu qua kho media riêng tư hiện có, gắn với hồ sơ khách hàng bằng RPC, hiển thị ở header và phần tài khoản sau khi tải lại. Hỗ trợ JPEG/PNG/WEBP tối đa 5 MB; dùng bộ kiểm tra/thu nhỏ ảnh hiện có trước tải lên. Không lưu dữ liệu ảnh vào localStorage.

Migration 234 đã áp dụng lên Supabase. Quyền chuẩn bị ảnh gắn với khách hàng đã xác thực, ảnh phải thuộc đúng phiên/tài khoản; cập nhật kiểm tra ảnh cũ để tránh ghi đè thay đổi mới. Có kiểm tra tại trigger và bảo vệ ảnh đang dùng khỏi cleanup. Không thay đổi ảnh bé cưng.

Kiểm tra đạt:

- `node scripts/test/customer_avatar_cloud.cjs`: giao dịch Supabase luôn hoàn tác, kiểm tra chủ sở hữu, gắn ảnh, lặp thao tác, tải lại con trỏ ảnh, đọc riêng tư, chặn ghi đè phiên bản cũ và xóa ảnh. Dùng bản ghi media kiểm thử, không tải byte ảnh thật hoặc giữ dữ liệu thử.
- `node --test scripts/test/media_api.test.cjs`: 20 kiểm tra đạt, bao gồm purpose ảnh tài khoản qua token người gọi và chặn phạm vi trộn lẫn.
- `node scripts/test/customer_avatar_ui.cjs`: giao diện đổi/xóa, header/hồ sơ, tải lại, báo lỗi định dạng; media transport cô lập.

Đã sửa cấu hình máy local: nạp file media riêng tư ngoài webroot qua `PAWPAL_MEDIA_ENV_FILE`, bật upload trong `.env` bị Git bỏ qua và chỉ định DNS hoạt động qua `PAWPAL_MEDIA_DNS_SERVERS`. Server local đã khởi động lại. Trước sửa API trả `503 MEDIA_DISABLED`; sau sửa endpoint yêu cầu token hợp lệ (`401` nếu không có token).

`node scripts/test/customer_avatar_local_live.cjs` đã đạt kiểm tra xuyên suốt **local HTTP → Supabase Cloud → MongoDB Atlas**: chuẩn bị phiên, tải ảnh PNG thật, lưu tài khoản, đọc lại con trỏ, tải byte ảnh khớp SHA-256, chặn anonymous và xóa ảnh. Tài khoản thử, phiên media, bản ghi asset và byte GridFS đều đã dọn. Không chỉnh tài khoản khách thật. Kiểm tra header/profile vẫn đạt bằng browser UI.

Chưa thử trên bản online và chưa push mã giao diện/API. Không thay cấu hình Vercel; thao tác đọc cấu hình Vercel bị từ chối `403`, cấu hình local dùng file riêng sẵn có. Không đưa bí mật vào repo.
