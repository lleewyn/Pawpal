# Nạp danh mục dịch vụ ngày 25/10/2026

Nguồn chuẩn: `data/Dich_vu_data_final.csv` (thực tế phân tách bằng tab, có ô chứa nhiều dòng).

SHA-256: `53a148d897d201a23ef2ce26d8b4d555809b0758918e48df88766225efe39b30`.

## Kết quả trên Supabase Cloud

- Đã ghi chính thức 24 dịch vụ: 14 chăm sóc/cắt tỉa, 8 khách sạn và 2 đưa đón.
- 38 dòng nguồn tạo 37 biến thể: hai dòng Standard chung mã biến thể nhưng là hai phòng vật lý khác nhau.
- 21 biến thể chăm sóc, 8 cấu hình khách sạn, 8 biểu giá taxi; 9 phòng có thể chọn theo CSV.
- Mã dịch vụ cũ được ánh xạ sang mã mới nhưng giữ UUID cho các dịch vụ tương ứng. Bổ sung dịch vụ SPA-10 và taxi khứ hồi còn thiếu.
- Giá cũ được giữ dưới trạng thái không còn áp dụng; lịch hẹn, dòng dịch vụ đã bán, lưu trú, chuyến xe, thanh toán và đánh giá có sẵn không bị sửa.
- Hai mã phòng cũ `H-PLUS-001`, `H-LUX-001` không có lịch đặt; chuyển sang `inactive` để danh mục chỉ sử dụng mã trong CSV. Không xóa hoặc đổi tên bản ghi phòng.
- Chỉ dùng đánh giá thực tế đã công bố, theo lựa chọn của người dùng. Không nhập điểm/số lượt đánh giá điền sẵn trong CSV thành đánh giá khách hàng.
- Nội dung, lợi ích, tiện ích, gói, quy trình, loài, mã biến thể, điều kiện, giá, thời lượng và ảnh hợp lệ được lưu trong CSDL.
- Cấp độ Basic / Intermediate / Advanced ánh xạ sang các cấp đã có JUNIOR / SENIOR / MASTER. Hamster ánh xạ sang Chuột Hamster; bổ sung loài Bọ Ú và Rùa theo nguồn.
- `Chó từ 10kg trở lên` lưu liên kết loài Chó; giới hạn từ 10 kg do bảng giá kiểm soát.
- Quy tắc đã được người dùng đồng ý: cận dưới được bao gồm, cận trên không bao gồm tại các mốc chuyển nhóm; 99 kg và 20 km vẫn thuộc nhóm cuối. Các khoảng ghi rõ `<10` vẫn không nhận 10 kg.
- Taxi khứ hồi dùng giá trọn chuyến trong CSV, không cộng hai lần giá một chiều. Giữ trẻ trong ngày tính theo mỗi 60 phút, làm tròn lên.

## Ảnh

Lưu 23 liên kết ảnh có thật vào bảng `service_image`, hợp nhất ảnh của các biến thể cùng dịch vụ theo thứ tự nguồn. Những dịch vụ chưa khai báo ảnh tiếp tục dùng ảnh minh họa hiện có của giao diện.

Không tìm thấy ba tệp được nhắc trong CSV: `tam_cho3.jpg`, `say_long.jpg`, `spa02.webp`. Không tạo đường dẫn ảnh hỏng; các ảnh hợp lệ còn lại vẫn hiển thị.

## Thay đổi giao diện

- Khách hàng: lấy giá cả ba nhóm, ảnh, lợi ích, tiện ích và thời lượng từ Supabase; chọn biến thể cập nhật giá và thời lượng.
- Đặt lịch: lọc phòng theo đúng dịch vụ, hiển thị đơn vị giờ/ngày, khóa loại hành trình theo gói taxi. CSDL kiểm tra lại toàn bộ giá và điều kiện.
- Admin: hiện giá thật cho khách sạn/taxi; sửa giá từng biến thể và thời lượng chăm sóc, lợi ích, tiện ích ngay trong modal dịch vụ hiện có. Bảng bốn khung giá cũ được ẩn khi dịch vụ đã có biến thể.
- Giá chăm sóc và taxi chỉnh từ Admin được lập phiên bản theo thời điểm hiệu lực, có kiểm tra xung đột cập nhật; dữ liệu thanh toán/lịch hẹn đã chốt vẫn dùng bản chụp.
- Thêm lắng nghe realtime cho ảnh, loại phòng và biểu giá taxi. Các bảng liên quan có trong publication.

**Các thay đổi giao diện chỉ ở local, chưa git push hoặc triển khai.** Kiểm thử trình duyệt dùng mã local đè các tài nguyên tương ứng trên trang đang chạy, đọc trực tiếp dữ liệu Cloud. Website đang triển khai cần nhận các tệp giao diện mới để sử dụng đầy đủ các trường vừa bổ sung.

## Kiểm tra đã đạt

- Nhập thử trong transaction và ROLLBACK trước khi COMMIT chính thức.
- Đối chiếu đủ 24 dịch vụ, 37 biến thể, từng giá, cân nặng, thời lượng, mô tả, lợi ích, tiện ích và thứ tự ảnh với CSV.
- Hash các bảng lịch hẹn/dịch vụ đã bán/lưu trú/chuyến xe/thanh toán/đánh giá không đổi trước và sau nạp.
- Kiểm thử dưới quyền authenticated: spa đúng giá và 75 phút tại mốc 5 kg; taxi một chiều 150.000đ và khứ hồi 280.000đ; khách đặt khứ hồi tại 15 km đúng 450.000đ; giữ trẻ 3 giờ đúng 300.000đ.
- Mốc 10 kg / 15 km và 99 kg / 20 km chỉ khớp đúng một biểu giá. Chặn hành trình taxi sai gói và chọn phòng khác dịch vụ.
- Thử thực sự đổi giá/thời lượng qua RPC admin cho ba nhóm rồi hoàn tác; các dữ liệu thử không lưu lại.
- Trình duyệt: khách xem danh mục/chi tiết, giá và thời lượng khi chọn biến thể; admin tải đủ 37 biến thể, mở modal từng nhóm; kích thước modal trên điện thoại. Không tải file dữ liệu JSON hoặc ghi dữ liệu trong kiểm tra trình duyệt.
- Đã xem ảnh kiểm tra trong `docs/verification/services-final/`.
- Kiểm tra cú pháp các tệp JavaScript thay đổi và `git diff --check` đạt.

## Công cụ và chạy lại

`scripts/database/v1/import_service_catalog_final.cjs --validate` chỉ kiểm tra CSV/ảnh, không kết nối CSDL.

Chạy không cờ thực hiện toàn bộ trong transaction rồi ROLLBACK. Cờ `--apply` mới COMMIT. Chỉ chạy lại khi muốn áp lại CSV làm chuẩn, vì thao tác này thay thế cấu hình dịch vụ hiện tại.

Transport đọc thông tin kết nối từ cấu hình Cloud riêng đã có của dự án; không đưa khóa/mật khẩu vào mã nguồn. Dùng thư viện `pg` cài tạm tại `%TEMP%/pawpal-service-import-tools/node_modules` và CA Supabase tại `%TEMP%/pawpal-service-import-tools/supabase-ca.crt`. TLS vẫn kiểm tra chứng chỉ; CA tải qua HTTPS từ `https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt`.

Migration: `096_service_catalog_final.sql`, `097_service_catalog_functions.sql`, `098_public_service_catalog.sql`. Phải áp trong transaction của importer để schema, hàm và dữ liệu nhất quán.

Kiểm thử SQL: `scripts/test/service_catalog_final_rollback.sql` (chạy bên trong transaction ngoài và luôn ROLLBACK). Kiểm thử giao diện chỉ đọc: `node scripts/test/service_catalog_final_ui.cjs`.

Bản chụp dữ liệu cấu hình và định nghĩa hàm trước lần COMMIT lưu ngoài webroot: `%TEMP%/pawpal-services-final-2026-10-25T07-25-56-048Z.private.sql`. Đây là bản chụp để phục hồi có kiểm tra, không phải script tự động ghi đè CSDL.
