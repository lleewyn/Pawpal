# Trang chủ PawPal V2.18

Cập nhật ngày 23/10/2026. Áp dụng bố cục từ `PAWPAL_PUBLIC_V218_HANDOFF/trang-chu.html` vào trang chủ hiện tại, giữ kết nối Supabase Cloud mới.

## Phạm vi đã làm

- Giữ phong cách xanh rừng, vàng, tiêu đề serif, banner giới hạn chiều rộng và các phần nội dung của mẫu: dịch vụ, tính cách thú cưng, nhật ký minh họa, cửa hàng, quy trình, hình hoạt động, thành viên, đánh giá, câu hỏi và chân trang.
- Banner được chỉnh bằng imagegen theo yêu cầu: bỏ giá 150k, hotline và địa chỉ website; giữ hình và phong cách. Ảnh được nén WebP và lưu trong `assets/images/landing-v218/`. Tổng 13 ảnh khoảng 705 KiB; không nhúng ảnh base64 vào HTML.
- Dịch vụ, loài hỗ trợ, giá và số đánh giá dùng `public_service_directory`. Lọc nhóm tại trình duyệt; giới thiệu tối đa 5 dịch vụ mỗi nhóm. Hotel và Taxi chưa có giá cố định sẽ dẫn đến báo giá khi đặt lịch.
- Hạng thành viên và mức giảm đọc từ `membership_tier`; không dùng hệ số điểm minh họa của mẫu. Đánh giá dùng `public_service_reviews`, chỉ đọc một dịch vụ có đánh giá công bố, không dựng lời nhận xét giả.
- Banner Cloud chỉ bổ sung khi còn hiệu lực và ảnh tải được. Bỏ qua URL mẫu `example.com`; chỉ một banner hợp lệ thì ẩn nút chuyển, không hiển thị số lượng giả.
- Nhật ký bé Lu ghi rõ minh họa. Không đọc nhật ký khách khi chưa đăng nhập. Bỏ nội dung khám sức khỏe và tên nhân viên chưa xác nhận.
- Giữ Header, Auth, điều hướng, giỏ hàng và trợ lý dùng chung. Danh mục cửa hàng dẫn sang bộ lọc cửa hàng thật; không đưa mảng dữ liệu của prototype vào ứng dụng.
- CSS giới hạn trong trang chủ. Khi điều hướng SPA sang trang có body class rỗng, xóa class trang trước; trở lại trang chủ khởi tạo lại đúng một lần.
- Không thay đổi schema, dữ liệu Cloud, cấu hình Admin hay Supabase cũ. Không truy vấn Cloud Logs.

## Kiểm tra

Chạy `node scripts/test/homepage_v218_cloud.cjs` với máy chủ local cổng 3000. Chạy thêm `--deployed` để kiểm tra website Vercel.

Đã đạt kiểm tra local: đối chiếu mã dịch vụ, giá và số hạng với Cloud; bốn bộ lọc; nhật ký minh họa; mở câu hỏi; menu điện thoại; không tràn ở 320, 390, 768, 1024, 1440 và 1920px; ảnh tải được; chuyển Cửa hàng và quay lại; không đọc lặp khi phát sự kiện khởi tạo; khi API lỗi hiển thị lỗi và thử lại được. Không tạo dữ liệu kiểm thử.

Ảnh kiểm tra lưu ngoài repo trong thư mục xác minh riêng. Thư mục handoff gốc không sửa và không đóng gói lên Vercel. Chưa chuyển giao diện bảy trang còn lại trong handoff.
