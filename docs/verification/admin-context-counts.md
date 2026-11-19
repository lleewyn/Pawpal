# Số đếm Tổng quan và dữ liệu liên kết Khiếu nại

Ngày kiểm tra: 13/11/2026. Migration 242 đã áp dụng lên Supabase. Thay đổi code chưa push.

## Phạm vi đã sửa

- Tổng quan nhận hai số đếm chính xác (đơn chờ, phiếu còn mở) và tối đa một phiếu ưu tiên. Không còn tải toàn bộ danh sách đơn/phiếu để đếm. Sự kiện của đơn hoặc phiếu đều làm mất hiệu lực cache số đếm.
- Danh sách Khiếu nại chỉ tải giao dịch được gắn trên những phiếu đang xem. Hồ sơ bé chỉ lấy theo các giao dịch đó. Bỏ chế độ mở rộng thành toàn bộ danh mục khách/giao dịch.
- Form tạo phiếu dùng tìm kiếm phía CSDL, tối đa 10 khách hoặc 10 giao dịch. Hỗ trợ tìm theo mã, sản phẩm, dịch vụ và tên khách; liên kết từ phân hệ khác đọc đúng giao dịch theo mã/ID. Kết quả chứa chủ sở hữu và cảnh báo phiếu trùng. Khách vãng lai vẫn có thể được tìm/chọn.
- Bộ chọn giao dịch trong phần liên kết phiếu cũng tìm phía máy chủ theo đúng khách của phiếu.
- Form giữ dữ liệu được chọn riêng với dữ liệu bảng, nên bảng cập nhật không làm mất lựa chọn đang nhập. Tìm kiếm chờ ngừng gõ 250 ms, dùng cache theo phiên, từ khóa và chủ sở hữu; kết quả đến muộn không ghi đè lựa chọn mới.
- Lịch nhân sự định kỳ tải 10 dòng/trang, có số trang từ CSDL; cập nhật Realtime được gom 250 ms và không tải lại khi panel không hiển thị. Kênh riêng của lịch định kỳ cũng được quản lý theo phân hệ đang mở.

Lịch sử đánh giá nhân sự hiện đã dùng trang 10 dòng trong cả danh sách và hồ sơ. Dashboard vận hành đã dừng polling khi Realtime hoạt động và chỉ dùng polling khi mất kết nối; giữ nguyên hai luồng đã đúng này.

## Kiểm chứng

- `admin_context_counts_cloud.cjs`: đối chiếu số đếm Tổng quan trực tiếp với dữ liệu nghiệp vụ; 23 giao dịch chỉ trả tối đa 10 kết quả, tìm giao dịch cũ, giới hạn chủ sở hữu, cảnh báo trùng, từ chối staff/anonymous. Fixture được rollback.
- `admin_context_counts_ui.cjs`: module giao diện thật với transport cô lập; KPI hơn 1.000 mục không cần danh sách tương ứng, chỉ đọc giao dịch gắn với phiếu, chọn giao dịch cũ và tự điền chủ, giữ lựa chọn sau khi bảng tải lại, loại phản hồi tìm kiếm chậm, trang lịch 10/10/3, gom sự kiện và dừng sau dispose.
- `admin_complaint_server_paging_ui.cjs`: danh sách phiếu, cache trang, bộ lọc, KPI toàn cục, xuất dữ liệu và mở phiếu ngoài trang đầu đều đạt.
- `future_staff_planning_ui.cjs`: tạo/sửa/ngừng lịch định kỳ và các luồng yêu cầu nhân sự hiện có đều đạt. Ảnh sinh bởi bài kiểm tra này không được đưa vào thay đổi.
- 10 kiểm tra của Realtime, cập nhật tab đang mở và hàng đợi đọc Supabase đều đạt. Kiểm tra cú pháp và whitespace đạt. Đã xem ảnh form Khiếu nại với CSS thực tế; ảnh riêng nằm ngoài repo.

Bài kiểm tra cũ `admin_staff_complaints_egress_ui.cjs` dừng ở harness Staff không khởi tạo namespace dưới guard Admin hiện tại; bài này cũng còn kỳ vọng luồng tải toàn bộ danh mục đã bị thay thế. Không dùng kết quả của bài cũ để kết luận về thay đổi này.

Không đọc Logs hạ tầng hoặc ghi dữ liệu kiểm thử lâu dài. Chưa đo tổng lưu lượng production.
