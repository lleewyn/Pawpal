# Dashboard — kiểm tra sau chỉnh sửa 16/11/2026

Giữ nguyên dữ liệu nghiệp vụ và toàn bộ công việc chưa xử lý. Không đổi trạng thái, xóa việc cũ, sửa tiền thu hoặc nhập chi phí mặc định để cải thiện chỉ số.

## Kinh doanh

- Bỏ cấu hình tài chính trong trình duyệt và các giá trị mặc định 100 triệu mục tiêu, 45 triệu chi phí, 55% giá vốn và 8% vật tư.
- Một modal kế hoạch thu và chi cho đúng kỳ đang xem. Lưu chung qua Supabase, kiểm tra quyền phía máy chủ, ghi nhật ký, chống ghi đè và chống lưu lặp khi thử lại.
- Kết quả là **ước tính thu trừ chi**, không phải báo cáo lợi nhuận thực tế. Chưa có kế hoạch hoặc nguồn dữ liệu lỗi/thiếu/chưa phân loại thì không tính và không xuất kết quả.
- Giữ số thu thuần âm. Kế hoạch của kỳ khác không được dùng lại. Giá trị 0 phải được nhập rõ, không thay dữ liệu thiếu bằng 0.
- Thêm thông tin cần đối soát giữa giá trị giao dịch dịch vụ hoàn thành và tiền thu. Chỉ số giao dịch lặp lại ghi rõ số khách và mẫu số trong kỳ.
- Nghe Realtime khi Dashboard hiển thị; gỡ kênh khi rời phân hệ. Tiếp tục làm mới định kỳ khi cần.

## Vận hành và giao diện

- Tổng công việc và số việc khẩn cấp luôn gồm toàn bộ tồn đọng; mặc định xem tất cả.
- Bộ lọc chờ tối đa 7 ngày/chờ trên 7 ngày chỉ thay danh sách đang xem. Không coi việc cũ đã được giải quyết.
- Danh sách mở rộng 10 dòng/trang, phân trang ở ngoài card, rút gọn số trang khi màn hình hẹp.
- Card 9px, trắng 70%, blur 10px, viền #ECF2EE; bỏ các hộp con và chú giải tiếng Anh trong khối tài chính.
- Header Dashboard có hai hàng trên điện thoại để tên tab và thao tác luôn đọc được.

## Xác minh

- `node --test scripts/test/dashboard_business_metrics.cjs`: 10 kiểm thử đạt.
- `node scripts/test/dashboard_operations_metrics.cjs`: 22 kiểm thử đạt.
- `node scripts/test/dashboard_finance_ui.cjs`: đạt; không lấy chi phí cũ từ trình duyệt, lưu hợp lệ, chặn giá trị âm, giữ số âm, chặn xuất dữ liệu cũ khi nguồn lỗi, đúng kỳ và CSS sau toàn bộ cascade.
- `scripts/test/dashboard_business_ui.cjs`: đạt các kiểm tra khoảng ngày, lỗi từng nguồn, thử lại, quyền, biểu đồ và khôi phục trạng thái.
- Migration `246_admin_dashboard_plan.sql` đã kiểm tra trong giao dịch hoàn tác rồi áp dụng lên Supabase. Không tạo sẵn kế hoạch hay chi phí. Chỉ bổ sung bảng kế hoạch, RPC, quyền đọc và Realtime.
- RPC đã thử lưu/đọc, giá trị 0, thử lại cùng yêu cầu, xung đột, đầu vào âm và quyền ghi trực tiếp; mọi bản ghi thử được hoàn tác.
- Phiên Admin thật tại bản local: thu thuần vẫn 1.454.000đ; vẫn 78 việc, 55 khẩn cấp. Đã kiểm tra Đóng, Hủy, backdrop và Escape của modal.
- Kiểm tra desktop 1440px và điện thoại 390/320px; phân trang ngoài card; các tab giữ vị trí sau reload.

Chưa có sổ chi phí thực tế, số dư và công nợ đối soát để kết luận lãi/lỗ thực tế hay khả năng chi trả. Không suy diễn các chỉ số này từ kế hoạch. Source được giữ local, chưa push.
