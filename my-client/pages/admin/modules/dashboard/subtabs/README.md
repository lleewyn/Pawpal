# Dashboard — Tab Quản trị vận hành

Người làm: Khanh · Nhánh: `nhanh-sua-dashboard-quan-tri-van-hanh-khanh` · Cập nhật: 09/11/2026

Tab thứ hai của Dashboard Tổng quan, trả lời 7 câu hỏi vận hành VH01–VH07 trong `PAWPAL_ADMIN_DASHBOARD_CODEX_SPEC.md` và `BQ + Dashboard.md` (đặt ở gốc repo).

Module độc lập, **không sửa file dùng chung nào** (`admin.js`, `dashboard.html`, `dashboard.js`, CSS chung đều giữ nguyên) để không xung đột với tab Kinh doanh và Tăng trưởng. Việc gắn vào khung Dashboard do leader quyết định khi hợp nhất.

## 1. Tệp trong module

| Tệp | Vai trò |
|---|---|
| `dashboard-operations.html` | Khung giao diện của tab |
| `dashboard-operations.css` | Kiểu dáng; mọi selector nằm dưới `.ops-dash` nên không ảnh hưởng phân hệ khác |
| `operations-metrics.js` | Lớp tính toán thuần (không DOM, không Supabase): nhóm trạng thái, ngưỡng cảnh báo, công thức |
| `dashboard-operations.js` | Đọc dữ liệu, Realtime, vẽ biểu đồ; cung cấp `window.PawpalOperationsDashboard` |
| `preview.html` | Trang xem trước để phát triển; **không dùng trong sản phẩm**, có thể xóa sau khi gắn |

Kiểm thử: `scripts/test/dashboard_operations_metrics.cjs`.

## 2. Cách gắn vào khung Dashboard

1. Nạp CSS trong `pages/admin/index.html`:
   ```html
   <link rel="stylesheet" href="/pages/admin/modules/dashboard-operations/dashboard-operations.css">
   ```
2. Nạp script theo đúng thứ tự (`operations-metrics.js` trước), ví dụ thêm vào `scripts` của mục Dashboard trong `MODULE_CONFIG` (`admin.js`):
   ```js
   scripts: [
       'modules/dashboard/dashboard.js',
       'modules/dashboard-operations/operations-metrics.js',
       'modules/dashboard-operations/dashboard-operations.js'
   ]
   ```
3. Khi người dùng mở tab Quản trị vận hành, gọi:
   ```js
   await window.PawpalOperationsDashboard.mount(vungHienThiCuaTab);
   ```
   `mount` tự tải `dashboard-operations.html` nếu vùng hiển thị đang trống. Nếu khung tab đã chèn sẵn HTML này thì truyền chính phần tử `[data-ops-root]`.
4. Khi rời tab (đổi tab hoặc đổi phân hệ), gọi `window.PawpalOperationsDashboard.unmount()` để gỡ kênh Realtime, bộ đếm giờ và sự kiện, tránh nghe trùng.

API khác: `refresh()` tải lại toàn bộ; `getState()` trả kỳ đang xem, trạng thái Realtime, lỗi.

Thanh tab con trên header, lưu tab vào URL hash và `sessionStorage` (AGENTS.md mục 3) thuộc phần khung. Bản thân tab chỉ lưu bộ lọc thời gian ở khóa `pawpal_admin_ops_dashboard_range`.

## 3. Dữ liệu

- Đọc 100% từ Supabase bằng phiên đăng nhập Admin. Quyền do RLS kiểm soát (`has_permission('<bảng>.read')`). Không dùng khóa máy chủ ở trình duyệt, không có dữ liệu giả.
- Tài khoản vai trò STAFF không đọc trực tiếp các bảng này (chính sách `v165_staff_boundary`), nên tab dành cho **ADMIN**.
- Dashboard chỉ đọc. Nút "Mở" và các thẻ KPI chuyển sang phân hệ nghiệp vụ (Dịch vụ, Bán hàng, Nhân sự, Khiếu nại) bằng các khóa `sessionStorage` hiện có của từng phân hệ, rồi bấm mục tương ứng trên sidebar.

| Khối | Bảng | Ghi chú |
|---|---|---|
| Lịch hẹn, giờ cao điểm, dịch vụ được đặt nhiều | `appointment`, `appointment_item` | Theo giờ hẹn `scheduled_start_at`, múi giờ Việt Nam; mỗi lịch đếm một lần |
| Đơn hàng | `sales_order`, `return_request` | Theo ngày tạo đơn |
| Nhân sự | `staff`, `staff_schedule`, `appointment_item.duration_minutes` | Ca hợp lệ: `schedule_status = active` và `availability_status = available` |
| Tồn kho | `inventory`, `product_variant`, `product`, `stock_reservation`, `sales_order_detail` | Tồn khả dụng = tồn kho − giữ hàng còn hiệu lực (giữ hàng không trừ vào `quantity_in_stock`, xem M027, M122). Tốc độ bán tính trên 30 ngày |
| Chất lượng | `review`, `support_ticket` | Tồn kho và hỗ trợ đang mở là số liệu hiện tại, không theo bộ lọc thời gian |

Kỳ lọc: hôm nay (mặc định), 7, 30, 90 ngày hoặc tùy chọn (tối đa 92 ngày). Mỗi truy vấn đọc tối đa 5.000 dòng; vượt ngưỡng thì giao diện báo để thu hẹp kỳ.

## 4. Cập nhật tức thời

- Kênh `admin-ops-dashboard-live` nghe thay đổi trên 13 bảng: `appointment`, `appointment_item`, `sales_order`, `sales_order_detail`, `return_request`, `staff`, `staff_schedule`, `inventory`, `product_variant`, `product`, `stock_reservation`, `support_ticket`, `review`.
- Nghe thêm sự kiện `pawpal:workspace-invalidated` của Admin (tín hiệu migration 183, bao gồm thao tác xóa mà Realtime theo bảng không gửi) và `pawpal:mutation`.
- Có thay đổi thì gom trong 0,8 giây rồi truy vấn lại đúng nhóm dữ liệu liên quan; không cộng trừ số từ nội dung sự kiện.
- Mất Realtime thì tự làm mới mỗi phút và ghi rõ trên giao diện; tạm dừng khi tab trình duyệt bị ẩn.

## 5. Ngưỡng cảnh báo (VH07)

CSDL chưa lưu SLA cho lịch, đơn, hỗ trợ. Mọi ngưỡng nằm trong `THRESHOLDS` đầu file `operations-metrics.js`, sửa một chỗ là xong.

| Việc | Ngưỡng | Nguồn |
|---|---|---|
| Lịch, đơn chờ xác nhận | Từ 15 phút cần xử lý, quá 30 phút khẩn cấp | Như `services.js`, `orders.js` |
| Lịch chờ xác nhận sắp tới giờ hẹn | Còn không quá 1 giờ, hoặc đã qua giờ hẹn: khẩn cấp | Như `services.js` |
| Lịch đã xác nhận chưa có KTV | Trong 24 giờ tới | Như `services.js` |
| Khách chưa đến | Quá giờ hẹn 30 phút | Đề xuất |
| Đơn đã xác nhận chưa giao | Từ 4 giờ | Như `orders.js` |
| Đổi trả chưa xử lý xong | Quá 48 giờ | Đề xuất |
| Hỗ trợ | Chưa phản hồi quá 4 giờ; chưa giải quyết quá 48 giờ (ưu tiên "Cao", "Khẩn cấp": 24 giờ) | Đề xuất |
| Tồn kho | Hết hàng: khẩn cấp; dưới mức tối thiểu hoặc đủ bán dưới 7 ngày: ưu tiên cao; dưới 14 ngày: theo dõi | Đề xuất |
| Thiếu người | Số lịch diễn ra cùng lúc vượt số nhân viên có ca. Chỉ xét ngày đã xếp ca; ngày chưa xếp ca báo riêng | Đề xuất |

Nhóm trạng thái (`STATUS_GROUPS`) lấy theo giá trị các RPC đang ghi trong migrations, kèm giá trị cũ còn đọc được (ví dụ `shipping`, `delivered`, `da_duyet`, "Khẩn cấp"). Trạng thái lạ không bị gộp im lặng: giao diện báo số bản ghi chưa phân loại.

## 6. Đã kiểm tra

- `node scripts/test/dashboard_operations_metrics.cjs`: 22/22 đạt (múi giờ, đếm không trùng, giữ hàng, ngưỡng, ngày tùy chọn sai, kỳ trước bằng 0).
- Đăng nhập Admin thật trên project `cpzuvaplseielhgcnqrn`: 15 truy vấn chạy không lỗi, số liệu khớp đối chiếu độc lập, 13 bảng đăng ký Realtime thành công, không lỗi Console, không phát sinh thao tác ghi.
- Giao diện ở 1440, 820, 390px không tràn ngang; trạng thái tải, trống, lỗi từng khối có nút "Thử lại".
- **Chưa quan sát** một sự kiện Realtime đầu cuối (thay đổi dữ liệu rồi xem số tự đổi) vì không ghi vào CSDL dùng chung.

## 7. Cần leader quyết định

1. Dựng khung 2 tab trên header và gắn tab này theo mục 2.
2. Giữ hay bỏ nội dung Dashboard cũ (lịch tháng/tuần/ngày, tiếp đón nhanh, chỉ số Chatbot).
3. Duyệt các ngưỡng "Đề xuất" ở mục 5, và việc tính mức ưu tiên "Cao" chung với "Khẩn cấp".
4. Xóa `preview.html` sau khi gắn (nếu muốn).

## 8. Hạn chế đã biết

- Khối "Cần xử lý ngay" báo lỗi cả khối nếu một nguồn dữ liệu của nó lỗi.
- Chú thích khi rê chuột dùng `position: fixed`; vùng chứa tab không nên có `transform` hoặc `filter`.
- Trên `preview.html` không có sidebar nên nút "Mở" chỉ chuyển về `/admin`; sau khi gắn vào Dashboard sẽ mở đúng phân hệ.
- Nếu dữ liệu lớn, nên chuyển phần tổng hợp sang hàm SQL trên CSDL (cần migration riêng, chờ duyệt).
