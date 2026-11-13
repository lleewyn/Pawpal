# Các luồng đọc dữ liệu còn lại

Ngày kiểm tra: 13/11/2026. Migration 241 đã áp dụng trên Supabase.

## Thay đổi

- Dashboard kinh doanh: tổng hợp nguồn thu, khách mới theo ngày, khách quay lại, hạng thành viên, voucher, điểm và bảng xếp hạng trong CSDL. Mỗi bảng xếp hạng nhận tối đa 20 nhóm để giữ đúng cả hai kiểu sắp xếp (10 nhóm theo giá trị và 10 nhóm theo số lượng). Dòng tiền vẫn dùng hàm đối soát hiện có; dữ liệu không bị cắt ở 20.000 giao dịch như giới hạn đọc cũ.
- Bán hàng: bộ chọn khách đã tìm kiếm phía máy chủ từ trước, không sửa lại. Danh sách voucher chuyển sang 10 dòng/trang, tìm toàn bộ dữ liệu bằng từ khóa, giữ KPI toàn cục. Chỉ đếm lượt sử dụng của voucher trên trang; lượt dùng hôm nay tổng hợp riêng. POS tìm tối đa 10 voucher phù hợp sau khi ngừng gõ, không tải cả danh sách khi mở form.
- Chi tiết khiếu nại: tải 10 trao đổi gần nhất, có nút xem trao đổi trước. Đề xuất mới nhất và 10 kết quả thực hiện được lấy riêng; các kết quả cũ vẫn xem tiếp được. Không cần tải mọi dòng audit để tìm đề xuất quản lý cần duyệt.
- Danh mục dịch vụ: danh sách chỉ nhận mô tả rút gọn, một ảnh và số bước. Mô tả đầy đủ, toàn bộ ảnh và quy trình chỉ tải khi mở xem/sửa. Kiểm tra phiên và phiên bản trước khi dùng dữ liệu chi tiết. Cấu hình giá vẫn được giữ để tính giá và kiểm tra các gói khi đặt lịch.
- Tra cứu: áp dụng 10 đơn và 10 lịch/lượt cho phiên khách, tra cứu OTP và tài khoản đăng nhập. Có nút xem giao dịch trước; truy vấn lấy thêm một ID/dòng để xác định còn trang kế tiếp. Đường tra cứu theo phiên chỉ tải tối đa bốn biên nhận đồng thời. Quyền tải tiếp sau OTP được ký, gắn với chủ sở hữu, số điện thoại và hạn dùng; mỗi trang kiểm tra lại chủ sở hữu. Bỏ fallback sang lịch sử cục bộ hoặc truy vấn trực tiếp khi máy chủ từ chối tra cứu.

## Kiểm chứng

- 45 kiểm tra tự động đạt: các phép tổng hợp, sắp xếp, ngày Việt Nam, 10/10/3 trang, quyền đọc, OTP, chữ ký tải tiếp, hàng đợi và cập nhật tab đang mở.
- `remaining_budget_cloud.cjs`: so sánh số khách, điểm và lượt dùng voucher với dữ liệu nghiệp vụ; kiểm tra giới hạn phản hồi, 23 kết quả audit và voucher, đề xuất mới nhất, lọc bản ghi cũ không phải JSON, từ chối staff/anonymous. Dữ liệu kiểm thử rollback.
- `dashboard_business_ui.cjs`: giao diện thật, khoảng ngày 90 ngày, lỗi từng khối và thử lại, quyền xem, desktop và điện thoại.
- `catalog_voucher_budget_ui.cjs`: bảng voucher thật và hàm đọc thật, trang cuối, tìm voucher ngoài trang đầu, KPI toàn cục, tải chi tiết dịch vụ khi cần và từ chối bản ghi đã thay đổi.
- `remaining_budget_ui.cjs`: lịch sử khiếu nại và bộ điều khiển tra cứu thật, tải tiếp 10/20/23 dòng khi bấm và xóa dữ liệu khi đổi số điện thoại.
- Kiểm tra lại form tạo lịch Spa/Taxi và tab đánh giá: đạt. Đã xem ảnh bảng voucher và modal quy trình với CSS thực tế; ảnh kiểm tra nằm ngoài repo, chỉ dùng dữ liệu giả lập.

Không truy vấn Logs hạ tầng. Chưa đo tổng byte truyền tải của production; không đưa ra cam kết về hạn mức Free.
