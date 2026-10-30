# Sửa bố cục hồ sơ dịch vụ

Ngày31/10/2026. Ảnh người dùng cho thấy nội dung hồ sơ sát mép khung, vùng nhật ký bị đẩy về bên phải và khối Hotel có nền/viền lồng. CSS tham chiếu phía cuối ghi đè padding hồ sơ về0 và thêm đường kẻ ngang header; track grid dùng cận dưới tự động, chưa giới hạn theo chiều rộng thực tế.

Đã sửa trong `services.css` và HTML hồ sơ:

- Khôi phục padding24px,18px ở màn nhỏ; bề mặt trắng70%, blur10px, viền nhẹ và góc9px.
- Grid dùng minmax(0,...) cho cả cột lớn và cặp trường; chuyển một cột ở viewport tối đa1200px, trường thông tin một cột ở tối đa600px. Header, mã dài và nhóm nút được phép xuống dòng.
- Khối thông tin và Hotel trình bày trực tiếp trên nền chung, bỏ panel con và đường kẻ chia ngang. Giữ khoảng cách giữa các nhóm.
- Nhãn bỏ dấu hai chấm, chuẩn hóa viết hoa; bỏ phụ chú nhật ký dư thừa. Giữ ID và các event nghiệp vụ. Tăng phiên bản CSS ở entry Admin để trình duyệt tải bản mới.

Kiểm tra bằng trình duyệt thật, tab riêng với phiên Admin và bản ghi Hotel thật. Trước push, intercept đúng hai tài nguyên CSS/HTML của trang Vercel bằng nội dung server local4000; JavaScript/API/dữ liệu vẫn thật. Không thay dữ liệu và không bấm các nút xác nhận/hủy/chuyển người.

Viewport1520/1238/900/600/390px: lưới và hai cột không có scrollWidth vượt chiều rộng, khung nằm trong viewport, bố cục chuyển cột đúng breakpoint. Kiểm tra cuối xác nhận padding24px, radius9px, nền rgba(255,255,255,0.7), Hotel trong suốt và không viền; đã xem ảnh crop hồ sơ. Ảnh nằm ngoài repository, không đưa dữ liệu hồ sơ thật vào Git. Không gọi Logs hoặc model và không thêm truy vấn database vào runtime.

Đây là kiểm tra bố cục đọc; không phải nghiệm thu thao tác nghiệp vụ hoặc cách tính thời lượng/số ngày tính phí.
