# Dashboard theo giao diện Khách hàng — 21/11/2026

## Nguyên nhân

Hai tab tự định nghĩa bề mặt kính mờ, bảng màu, KPI 25px/700, khoảng đệm thẻ và nút; Dashboard còn ghi đè header chung. Trong khi đó, trang Khách hàng đã có giao diện được chốt khác. Các kiểm thử cũ chỉ so hai tab với nhau hoặc so với Dashboard cũ, nên không chứng minh được sự thống nhất với Admin.

## Thay đổi

- Cả hai tab dùng `admin-ui-standard admin-ui-customer-reference`. Các thành phần thẻ, tiêu đề, bộ lọc và nút được lấy từ lớp dùng chung trong `admin-components.css`; không sao chép `customers.css` hoặc sửa trang Khách hàng.
- Mốc đối chiếu là **Khách hàng đang hiển thị**, gồm bề mặt trắng, viền và hình khối của thẻ/dải KPI hiện tại, KPI 23px/650, nhãn 11px, tiêu đề 13px/650, nút 32px, ô chọn 37px và bảng dùng typography chung. Các giá trị này phản ánh yêu cầu mới nhất dùng trang Khách hàng hiện tại làm chuẩn.
- Bỏ các ghi đè riêng của hai tab đối với thành phần chung và toàn bộ ghi đè `body.dashboard-active` trên header. Giữ CSS riêng cho bố cục, biểu đồ và trạng thái nghiệp vụ.
- Bảng Vận hành đi sát khung như bảng Khách hàng; phần nội dung trong nhóm biểu đồ Kinh doanh trong suốt, chỉ có một bề mặt ở khối ngoài.
- Phân trang Vận hành dùng các class phân trang chung của Admin. Modal kế hoạch thu và chi dùng header/footer modal chung; giữ nguyên bốn trường và nghiệp vụ lưu.
- Cập nhật phiên bản CSS và script trong `index.html` và bộ nạp module để tránh trình duyệt giữ tài nguyên cũ khi phát hành.

## Kiểm tra

`node scripts/test/dashboard_admin_style_ui.cjs` nạp đúng HTML Khách hàng, Dashboard và toàn bộ stylesheet theo thứ tự trong `pages/admin/index.html`. So trực tiếp computed styles của cả hai tab với Khách hàng: dải KPI, thẻ KPI, nhãn, số, khung thẻ, tiêu đề, nút, ô chọn, nhãn bộ lọc và bảng ở cả hai tab. Kiểm tra header không đổi khi bật `dashboard-active`, không tràn ngang ngoài vùng cuộn có chủ đích tại 1440/820/390/320px, nhóm biểu đồ không lồng bề mặt; kiểm tra và chụp modal kế hoạch ở desktop/điện thoại. Fixture chỉ tồn tại trong test, toàn bộ network bị chặn.

Ảnh local đã kiểm tra: `artifacts/dashboard-admin-style/customer-1440.png`, `operations-1440.png`, `business-1440.png`, các bản `390.png` tương ứng và `plan-390.png`. Artifacts không đưa vào Git.

Các bài kiểm tra chức năng kinh doanh, ước tính tài chính và bảng việc Vận hành đều đạt. Các kiểm thử cũ yêu cầu kính mờ được thay bằng mốc Khách hàng hiện tại; `dashboard_operations_style_check.cjs` chuyển đến bài so sánh mới thay vì giữ các khẳng định lỗi thời.

`node scripts/test/dashboard_workboard_cloud_readonly.cjs` dùng mã/CSS local trong phiên Admin thật: đọc nguồn vận hành thành công, số lịch hôm nay khớp truy vấn độc lập; bề mặt thẻ/KPI/header khớp trang Khách hàng trong cùng phiên. Chặn mọi ghi nghiệp vụ; không sử dụng Supabase Logs. Đây là kiểm tra local với dữ liệu Cloud, không phải xác nhận đã phát hành.

Biên bản này ghi nhận kiểm tra local trước phát hành. Phạm vi đóng gói và giới hạn nghiệm thu được cập nhật tại [kiểm tra phát hành Dashboard](dashboard-release-check.md). Không đổi công thức chỉ số, schema, quyền hoặc nội dung dữ liệu nghiệp vụ.
