# Kiểm tra phạm vi Dashboard — 21/11/2026

Đối chiếu mã hiện tại với `docs/dashboard-development-plan.md`. Đây là kiểm tra tiến độ và giới hạn của đợt phát hành, không phải nghiệm thu toàn bộ M0–M5.

## Phần đã có trong snapshot phát hành

- Hai tab dùng nền tảng giao diện chung theo trang Khách hàng hiện tại; bỏ ghi đè header, thống nhất thẻ, KPI, nút, bộ lọc, bảng và phân trang. Có kiểm thử computed styles với toàn bộ thứ tự CSS trong `index.html`.
- Tab Vận hành ưu tiên danh sách việc, gom lý do theo hồ sơ, lọc nhóm/khẩn cấp/chưa phân công/chờ lâu, phân trang 10 dòng, giữ bộ lọc và hiển thị lịch bắt đầu hôm nay.
- Giữ lịch cũ còn mở, cập nhật ngưỡng theo đồng hồ và khi chuyển ngày; nhận biết lỗi nguồn, thiếu quyền và kết quả bị cắt. Có kiểm tra đường dẫn hỗ trợ dùng loader của router, đồng bộ ID cho phân hệ được cache.
- Kinh doanh giữ nguồn thu/hoàn/thu thuần, so sánh kỳ, cơ cấu nguồn thu, xếp hạng, hồ sơ khách mới, giao dịch lặp lại trong kỳ, thành viên, voucher và điểm. Kế hoạch thu/chi là giả định, không phải lợi nhuận thực tế.
- Không có migration mới hoặc dữ liệu mẫu trong ứng dụng. Các thay đổi Khiếu nại/Dịch vụ đang dở trong workspace không thuộc phạm vi commit Dashboard.

## Còn thiếu, theo thứ tự ưu tiên

### 1. Đồng nhất SLA và nghĩa của thời gian chờ

`operations-metrics.js` dùng `ticketResolveHours` 48 giờ và `ticketResolveUrgentHours` 24 giờ theo ưu tiên; `tab-dashboard-operations.js` chưa đọc `support_ticket.sla_due_at`. Migration `248_complaint_sla_order.sql` đã định nghĩa hạn giải quyết theo mức khẩn 4 giờ, cao 24 giờ, thường 48 giờ và thấp 72 giờ. Vì vậy cảnh báo Dashboard có thể lệch với Khiếu nại. Cần dùng hạn gốc và phân biệt hạn phản hồi với hạn giải quyết, xử lý rõ bản ghi thiếu hạn.

Tuổi đơn đang chuẩn bị vẫn dùng `updated_at || created_at`, không phải sự kiện xác nhận đơn. Sửa ghi chú cũng có thể đổi tuổi cảnh báo. Không được coi đây là thời gian kể từ xác nhận đã được chứng minh. Căn cứ: `operations-metrics.js`, `buildAlerts()`.

### 2. Hoàn thành điều hành và vòng đời công việc — phần còn lại của M1

- Danh sách hiện chỉ là việc phát hiện từ trạng thái nguồn, chưa có lịch sử nhận việc/xử lý/mở lại; chưa tính tồn đầu kỳ, phát sinh, đã giải quyết và tồn cuối kỳ từ sự kiện thật.
- Có người phụ trách ở lịch hẹn và hỗ trợ; chưa có nguồn giao việc đáng tin cậy cho đơn hàng, tồn kho và mọi loại đổi trả. Chưa có hạn xử lý và ảnh hưởng xác minh được cho từng việc.
- Lịch hôm nay chỉ dựa trên `appointment.scheduled_start_at`. Chưa có hàng đợi riêng cho khách sạn đang lưu trú, trả phòng hôm nay và từng chặng đưa đón. Không được xem danh sách này là lịch điều phối đầy đủ.
- Mức tải nhân sự còn là số lịch đồng thời/ca và thời lượng; chưa đủ mô hình kỹ năng, loại dịch vụ, phòng hoặc tài xế để kết luận năng lực chuyên biệt.
- Chưa có đầy đủ hàng chậm luân chuyển, vốn tồn, hàng sắp hết hạn, hàng đang về và thời gian nhập bổ sung. Chỉ mở khi nguồn có thật và đủ định nghĩa.

### 3. Giải thích biến động kinh doanh — M2

- Chưa phân rã giá trị giao dịch hoàn thành thành số giao dịch và giá trị bình quân của sản phẩm/dịch vụ.
- Chưa có các nhóm khách giao dịch lần đầu trong lịch sử quan sát và khách đã giao dịch trước kỳ nay quay lại. Chỉ số lặp lại hiện tại là khách có từ hai giao dịch hoàn thành **trong kỳ**, không thay thế giữ chân khách.
- Chưa đủ tỷ lệ hủy/vắng mặt/hoàn tiền có mẫu số rõ và danh sách chứng minh mở từ từng số tổng.
- Kỳ trước hiện được lấy cùng số ngày theo ngày lịch (`business-metrics.js`, `period()`). Kỳ đang chạy chưa được đối chiếu tới cùng thời điểm trong ngày của kỳ trước; chưa phân biệt đầy đủ phần kỳ đã trôi qua.
- Thứ hạng sản phẩm dùng ngày tạo đơn; dịch vụ dùng giờ bắt đầu lịch. Giá trị dòng khác tiền thực thu và còn khác cơ sở ngày hoàn tất. Không dùng chênh lệch giữa chúng để tự kết luận nguyên nhân.

### 4. Dữ liệu tài chính và báo cáo thực tế — M3/M4

Chưa có trong Dashboard báo cáo kết quả hoạt động dựa trên doanh thu ghi nhận, giá vốn lịch sử và chi phí đã đối soát; số dư khả dụng, công nợ đến hạn, lịch thu/chi và cảnh báo thiếu hụt có căn cứ. Các RPC kế hoạch `246/247` không thay thế các nguồn này. Cần quy trình ghi nhận/duyệt/chứng từ và đối soát trước khi công bố lãi/lỗ hoặc khả năng chi trả. Dự báo vẫn chưa bật vì chưa có lịch sử và kiểm định được nghiệm thu.

### 5. Nghiệm thu và hiệu năng — M0/M5

- Còn xác nhận định nghĩa/ngưỡng nghiệp vụ, quyền theo vai trò và nguồn chuyên biệt; kiểm tra Realtime đầu cuối khi nghiệp vụ thật thay đổi ở môi trường thử nghiệm.
- Chưa nghiệm thu toàn bộ luồng mở hồ sơ A→B trong các phân hệ đã cache bằng snapshot phát hành. Test hiện xác nhận ID, router hỗ trợ và luồng bảng việc, không chứng minh mọi màn hình đích đã tải đầy đủ.
- Vận hành còn đọc bảng phân trang 500 dòng, giới hạn 5.000 dòng mỗi nguồn ở trình duyệt (`readPaged()`). Đã báo thiếu dữ liệu khi bị cắt nhưng chưa có RPC tổng hợp và phân trang công việc tại server. Đổi bộ lọc ngày không làm nhỏ mọi nguồn snapshot.
- Cần đối chiếu mã đang phục vụ sau phát hành; việc push Git thành công không tự chứng minh Vercel đã triển khai xong.

## Kiểm tra snapshot

- `dashboard_admin_style_ui.cjs`: đạt, đối chiếu Khách hàng và hai tab ở 1440/820/390/320px, modal kế hoạch và header chung.
- `dashboard_business_ui.cjs`, `dashboard_finance_ui.cjs`, `dashboard_operations_workboard_ui.cjs`: đạt.
- `dashboard_operations_metrics.cjs`: 26 kiểm thử đạt; `dashboard_business_metrics.cjs`: 10 kiểm thử đạt.
- Kiểm tra cú pháp và `git diff --check`: đạt tại thời điểm đóng gói.
- Các lượt kiểm tra Cloud chỉ đọc trước phát hành đã xác minh nguồn vận hành, số lịch hôm nay và style với mã local; không ghi dữ liệu nghiệp vụ, không truy vấn Supabase Logs.

Đợt tiếp theo nên ưu tiên mục 1 rồi hoàn thiện mục 2 trước khi mở rộng tài chính.
