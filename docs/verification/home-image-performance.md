# Tối ưu ảnh trang chủ — 13/11/2026

Đo trên localhost:4000 bằng Chrome, context mới, dữ liệu banner hiện hành từ Supabase; không sửa dữ liệu nghiệp vụ.

- Trước: banner đầu tải 2.042.422 byte, khoảng 6.885 ms. Các banner khác tải đồng loạt, mỗi ảnh tới 2,4 MB.
- Sau: desktop 1440px chọn bản WebP 1720px, tải 108.862 byte; mobile 390px chọn bản 640px, tải 28.124 byte. Số byte gồm overhead đo bởi Resource Timing.
- Ảnh mèo đầu trang: file từ 99.646 xuống 18.034 byte, giữ ảnh gốc.
- Chỉ tải trước một slide kế tiếp sau khi ảnh hiện tại đã giải mã; không tải đồng loạt toàn bộ carousel.
- Dữ liệu dịch vụ và hạng thành viên bắt đầu tải khi người dùng đến gần khu vực đó, ưu tiên banner đầu trang.
- Ảnh riêng tư không được dùng biến thể công khai. Kiểm tra quyền vẫn thực hiện trước khi trả ảnh hoặc 304; thời hạn cache hiện có giữ nguyên.

Kiểm tra: 21 bài media API đạt; Chrome desktop/mobile hiển thị ảnh thành công, không tràn ngang; kiểm tra cuộn tới dịch vụ, bộ lọc, hạng thành viên và chuyển banner. Ảnh chụp kiểm tra nằm ngoài Git trong thư mục verification của Pawpal-infra.

Giới hạn: độ trễ lấy ảnh từ kho lưu trữ vẫn tồn tại trong lần tải đầu. Lần đo sau ghi nhận khoảng 5,5 giây desktop và 3 giây mobile cho request ảnh, không phải cam kết tốc độ mạng thực tế. Chưa đo trên production.
