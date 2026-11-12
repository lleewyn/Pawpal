# Tab Kinh doanh và tăng trưởng

Nhánh triển khai: `nhanh-sua-dashboard-kinh-doanh-thi`. URL Admin: `/admin#tab-dashboard` (hoặc `/pages/admin/#tab-dashboard`). Tab vận hành vẫn ở `#tab-dashboard-operations`.

## Nguồn và công thức đã đối chiếu trong repository

| Thành phần | Mapping | Cách tính / kỳ |
| --- | --- | --- |
| Thu, hoàn, thu thuần | RPC `get_admin_dashboard_cashflow`, migration `044_admin_dashboard_cashflow.sql` | `payment.transaction_status = succeeded`, `succeeded_at`; `refund_transaction.refund_status = succeeded`, `completed_at`. Tổng thu trừ tổng hoàn. Hai nguồn tổng hợp độc lập, không nhân dòng. |
| Tăng trưởng | Cùng RPC cho kỳ trước | Hai kỳ liên tiếp cùng số ngày; `(hiện tại − trước) / abs(trước) × 100`. Mẫu số 0 → N/A. |
| Cơ cấu thu | `payment.amount, order_id, appointment_id` | Chỉ `succeeded` trong kỳ; đúng một FK xác định loại thu, cả hai/không FK vào chưa phân loại. |
| Top sản phẩm | `sales_order_detail` → `sales_order` | Đơn `completed` hoặc `delivered`, theo `created_at`. Nhóm theo `product_variant_id`, tên snapshot. `quantity × unit_price − discount_amount`. |
| Top dịch vụ | `appointment_item` → `appointment` | Cả dòng và ca `completed`, theo `scheduled_start_at`. Nhóm theo `service_id` hoặc `service_addon_id`, tên `name_snapshot`. Cùng công thức giá trị dòng. |
| Khách mới | `customer.registered_at` | Hồ sơ mới, bao gồm khách ghi nhận tại quầy; không gọi là tài khoản đăng ký trực tuyến. |
| Hạng thành viên | `customer_membership.membership_tier_id` → `membership_tier.id` | Phân bố hạng đã gán hiện tại, không giả lập lịch sử hạng theo ngày lọc. |
| Voucher | `voucher_redemption.status, redeemed_at, discount_amount_snapshot` | Đếm `applied`, cộng snapshot; loại `reversed/cancelled`. |
| Điểm thưởng | `paw_point_transaction.points, created_at` | Tổng điểm dương và trị tuyệt đối điểm âm riêng; không quy đổi sang tiền/doanh thu. |

Nguồn xác minh: `001_schema.sql` (cột, FK, CHECK), `002_rules.sql` (RLS, công thức dòng và đơn hoàn thành), `003_integrity.sql` (trạng thái dịch vụ hợp lệ), `014_admin_service_records.sql` (ghi trạng thái hoàn thành), `044_admin_dashboard_cashflow.sql` (RPC tài chính). Đây là xác minh theo migrations trong repository, chưa phải đối chiếu phiên bản đang chạy trên Cloud.

## Hành vi và giới hạn

- Mặc định 30 ngày; hôm nay/7/30/90 ngày; tùy chọn tối đa 92 ngày. Giờ Việt Nam, hai đầu ngày được chuẩn hóa `+07:00`, cận kết thúc loại trừ. RPC hiện tại giới hạn 31 ngày nên chia thành các đoạn không trùng; RPC tiếp tục kiểm tra ngày/quyền ở server.
- Top giao dịch là giá trị dòng của đơn/ca hoàn thành, **không phải tiền thực thu**. Chưa trừ voucher cấp đơn hoặc hoàn tiền; cơ sở ngày được giải thích trong “Cách tính”. Cần nghiệp vụ nghiệm thu cơ sở thời gian này nếu muốn chuyển sang ngày hoàn tất.
- Giao dịch COD chỉ được tính nếu hệ thống đã ghi payment thành công với ngày thu. Không suy ra thu tiền từ trạng thái giao hàng.
- Khách quay lại: đã chốt số khách có ít nhất 2 đơn/lịch hoàn thành chia số khách có ít nhất 1 trong kỳ. Đơn `completed/delivered` lọc theo `delivered_at`; lịch `completed` theo `check_out_time`. Đếm mỗi đơn/lịch một lần, gộp theo `customer_id` giữa hai nguồn. Không có khách hợp lệ → N/A; có khách nhưng không ai quay lại → 0%. Bản ghi thiếu ngày hoàn tất không nằm trong kỳ, không dùng ngày tạo thay thế. Không đếm payment hoặc dòng sản phẩm/dịch vụ.
- Dự báo chưa bật: chưa có chuỗi lịch sử và kiểm định sai số được xác nhận. Không tạo đường dự báo/nhận xét AI giả.
- Đọc trực tiếp bằng Supabase session hiện có, mỗi nguồn kiểm tra permission `.read`; RLS phía PostgreSQL kiểm soát truy cập. RPC dòng tiền có thêm kiểm tra vai trò tài chính. Không sử dụng service-role key, không xuất thông tin liên hệ khách hàng.
- Truy vấn bảng phân trang 500 dòng. Vượt 20.000 dòng thì báo thu hẹp kỳ, không hiển thị tổng bị cắt. Tối đa ba nhóm dữ liệu tải đồng thời. Phân trang top 10 không cần vì chỉ hiển thị top 10 kết quả tổng hợp.
- Mỗi vùng có loading/error/empty và thử lại riêng. Khi lỗi không thay bằng số 0. Refresh thủ công; workspace invalidation và polling 120 giây khi tab đang hiển thị. Không gắn nhãn live. Gỡ timer/listener khi chuyển tab/phân hệ.
- Giữ hash hiện có để tương thích router, lưu bộ lọc riêng trong sessionStorage. Không chỉnh schema/migration hoặc nghiệp vụ của tab vận hành.

## Kiểm thử

```text
node --test scripts/test/dashboard_business_metrics.cjs
node scripts/test/dashboard_business_ui.cjs
```

Bài kiểm thử UI cần Playwright (có thể chỉ định đường dẫn package bằng `PLAYWRIGHT_MODULE`). Dùng browser cô lập với fixture chỉ trong file test, chặn mọi network; không ghi dữ liệu nghiệp vụ. Đã kiểm tra viewport 1440 và 390, lỗi một nguồn, retry, quyền bị từ chối, khôi phục bộ lọc và ngày không hợp lệ. Unit test kiểm tra múi giờ, kỳ trước, hoàn một phần, mẫu số 0, phân loại nguồn thu, chống lặp dòng, gộp tuần, chia RPC 90 ngày và phân trang.

Chưa kiểm thử end-to-end bằng phiên Admin thật trên Supabase Cloud. Cần nghiệm thu đăng nhập Admin → Dashboard → Kinh doanh và tăng trưởng, đối chiếu tiền thu/hoàn với báo cáo thanh toán trong cùng kỳ; kiểm tra quyền `.read` từng bảng và RPC trên môi trường triển khai.
