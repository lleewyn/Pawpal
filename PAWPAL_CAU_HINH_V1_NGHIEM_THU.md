# Cấu hình V1 — đang kiểm tra

Cập nhật ngày 22/10/2026. Chưa nghiệm thu toàn phân hệ.

## Đã kiểm tra và sửa

- Bốn tab Production tải không có lỗi HTTP hoặc JavaScript trong lượt kiểm tra chỉ đọc. Bằng chứng ngoài webroot: `D:/Aboutme/Pawpal-infra/supabase-local/verification/all-modules-2026-10-22T12-16-29-485Z`.
- Thông tin cửa hàng không tự điền tên công ty, hotline, mã số thuế, số khẩn cấp hoặc liên kết mạng xã hội mẫu khi CSDL để trống. Email có dấu sao bắt buộc khớp kiểm tra khi lưu. Bỏ nhãn chi nhánh khỏi modal cửa hàng theo phạm vi đã chốt.
- Không lấy cấu hình vận hành ban đầu từ localStorage cũ. Lỗi đọc Supabase được kiểm tra, không biến lỗi thành danh sách rỗng để tiếp tục xử lý.
- Các form thiết lập sửa bản sao cấu hình. Khi lưu lỗi, trạng thái đang dùng không bị thay đổi trước khi CSDL xác nhận.
- Nhật ký lấy `staff.id` từ `get_staff_login_context`, không dùng Auth ID hoặc ID nhân viên giả làm khóa ngoại. Chưa coi sửa danh tính này là giao dịch nguyên tử giữa cấu hình và nhật ký.
- `node scripts/test/settings_store_v1.cjs` đạt trên bản phục hồi: bỏ cache cấu hình cũ, trường phụ trống, giữ nháp và không đổi state khi ngắt request lưu, lấy đúng ngữ cảnh nhân viên. Không ghi dữ liệu thử vào CSDL. Đã xem ảnh modal.

## Còn phải thực hiện

- Chuyển thao tác lưu thiết lập sang giao dịch máy chủ có kiểm tra phiên bản và nhật ký nguyên tử; kiểm tra phân quyền và chống ghi đè giữa hai người dùng.
- Rà modal thanh toán, vận chuyển và đặt lịch. Mã cũ còn mức phí/giờ mặc định và token vận chuyển mẫu; chưa coi chúng là cấu hình đã xác thực hoặc kết nối đối tác thật.
- Kiểm tra thêm/sửa/xóa banner, bài viết và voucher, cùng các liên kết sang Bán hàng; không bổ sung ưu đãi ngoài cấu hình CSDL.
- Kiểm tra nhật ký, phân trang, Realtime, tải lại và lỗi mạng cho các tab còn lại.
- Chưa sửa dữ liệu hoặc cấu trúc Cloud trong lượt này. Chưa nghiệm thu tích hợp gửi tin hoặc vận chuyển thật.
