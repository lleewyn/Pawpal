# Giảm truy vấn dữ liệu công khai

Phạm vi: DataLoader danh mục dịch vụ và dữ liệu trang chủ. Không thay đổi quyền đọc, thanh toán, kiểm tra tồn kho, dữ liệu cá nhân hoặc luồng Admin.

- Danh mục dịch vụ: cache 60 giây; banner: 30 giây; hạng thành viên: 120 giây.
- Gộp các yêu cầu đồng thời thành một truy vấn. Cache theo dự án và từng nhóm dữ liệu trong bộ nhớ và sessionStorage, tối đa 250.000 ký tự mỗi nhóm; không lưu dữ liệu cá nhân.
- Trả bản sao để sắp xếp/lọc ở một trang không làm thay đổi cache của trang khác.
- Cache hết hạn phải đọc lại Supabase; không dùng dữ liệu cũ để che lỗi. Lỗi không bị cache, cho phép thử lại.
- Kiểm tra ngày bắt đầu/kết thúc banner mỗi lần render dù metadata đang được cache.
- Không tải trước các banner chưa chọn. Đánh giá chỉ tải khi đến gần khu vực hiển thị, bỏ truy vấn review_media vì trang chủ chỉ dùng chữ.
- Không thêm polling hoặc kết nối realtime. Thay đổi nội dung công khai có thể xuất hiện chậm tối đa TTL tương ứng ở lần đọc tiếp theo. Dữ liệu giao dịch vẫn được xác nhận bởi luồng nghiệp vụ hiện có.

Kiểm chứng ngày 13/11/2026:

- `node --test scripts/test/public_data_cache.test.cjs`: 6 bài kiểm tra, gồm gộp yêu cầu, TTL, reload, cách ly dự án, lỗi/retry, chặn storage và bỏ ảnh đánh giá.
- `node scripts/test/home_public_bandwidth_ui.cjs`: Chrome đọc dữ liệu live; lần đầu 3 truy vấn cho ba nhóm, reload trong TTL thêm 0 truy vấn; không truy vấn review_media. Không sửa dữ liệu hoặc đọc Cloud Logs.
- Bài hồi quy cũ `test_bandwidth_regression.js`: phần REST deduplication đạt; phần dashboard thất bại ở dòng 115 (`0 !== 11`), nằm ngoài các file/phạm vi thay đổi này.

Chưa đo băng thông toàn hệ thống hoặc production; kết quả trên không phải cam kết mức giảm cho mọi phân hệ.
