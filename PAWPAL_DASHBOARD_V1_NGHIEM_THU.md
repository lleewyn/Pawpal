# Dashboard V1 — thực thu ròng

Ngày 22/10/2026. Người dùng đã chốt: thực thu ròng bằng tiền thu thành công trừ tiền hoàn thành công, tính theo ngày giao dịch ở múi giờ Asia/Bangkok (UTC+7). Không dùng giá trị đơn chưa thu hoặc trạng thái hoàn tất dịch vụ thay cho khoản tiền thực nhận.

## Đã thực hiện

- Migration 044 bổ sung get_admin_dashboard_cashflow: tổng hợp theo ngày bằng numeric trong PostgreSQL, trả thu/hoàn/ròng; tối đa 31 ngày mỗi lần.
- Thu lấy payment.amount khi transaction_status=succeeded theo succeeded_at. Hoàn lấy refund_transaction.refunded_amount khi refund_status=succeeded theo completed_at. Hoàn ở ngày khác trừ vào ngày hoàn, không sửa lại ngày thu.
- Cho hiển thị ngày có số âm và ngày không phát sinh bằng 0; ngày tương lai không vẽ như số tiền thực tế đã xảy ra.
- Khoản thành công thiếu ngày giao dịch được báo riêng, không tự lấy ngày tạo bản ghi thay thế.
- Máy chủ kiểm tra phiên, tài khoản hoạt động, quyền payment.read/refund_transaction.read và vai trò ADMIN/MANAGER/ACCOUNTANT. Không tin vai trò do trình duyệt tự khai.
- KPI và biểu đồ dùng cùng nguồn tổng hợp, có cache 90 giây và vô hiệu hóa khi phát sinh thu/hoàn.
- Truy vấn đơn, lịch, nhân sự và phiếu dùng cột V1; lịch lấy giờ thực và gói qua appointment_item.
- Tồn kho theo từng SKU, dùng ngưỡng cảnh báo CSDL; không tự đặt ngưỡng 5.
- Số nhân sự có lịch hôm nay tính trên nhân viên còn hoạt động, bao gồm phân công từng dòng dịch vụ. Không gọi đây là chấm công thực tế.
- Đổi chỉ số hội thoại thành chưa chuyển/chuyển nhân viên; không gọi mọi hội thoại chưa chuyển là AI đã giải quyết thành công.
- Bỏ các phép tính tài chính dựa trên cột Cloud cũ và trạng thái thanh toán suy đoán.

## Kiểm thử

- dashboard_v1_cashflow.cjs: fixture trong giao dịch trên bản phục hồi, rollback toàn bộ. Kiểm tra sát nửa đêm UTC+7, thu một phần, hoàn khác ngày, số âm, ngày trống, loại khoản pending, giới hạn khoảng ngày và từ chối người không có quyền.
- dashboard_v1_browser.cjs: số tiền theo nguồn thật, số khách/thú cưng, biểu đồ, lịch tháng/tuần/ngày, điều hướng ngày, làm mới và ảnh màn hình hẹp. Không thay dữ liệu bằng mock.
- dashboard_v1_cloud_live.cjs: kiểm tra chỉ đọc với Cloud mới, đối chiếu KPI, biểu đồ, lịch, Realtime và tải lại; chặn mọi thao tác ghi nghiệp vụ.

Giữ nguyên các thay đổi cổng khách đang có trong workspace. Không áp migration 043 của cổng khách trong đợt Dashboard. Zalo/SMS/email tiếp tục là giả lập theo scope đã chốt.

## Áp dụng Cloud

Đã áp migration 044 riêng trên project cpzuvaplseielhgcnqrn. Đối soát hash toàn bộ dữ liệu public và danh tính/mật khẩu/trạng thái khóa Auth giữ nguyên; vẫn 17 hồ sơ nhân sự. Schema giữ 105 bảng, 906 cột và 160 khóa ngoại.

Backup: D:/Aboutme/Pawpal-infra/supabase-local/backups/dashboards-cloud-2026-10-22T07-59-40-765Z. Kiểm thử ghi chỉ chạy trên bản phục hồi và rollback; không ghi giao dịch thử vào Cloud.
