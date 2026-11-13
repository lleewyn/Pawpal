# Hoàn thiện phân trang và realtime — 13/11/2026

## Phần đã sửa

- Đánh giá dịch vụ Admin: RPC trang 10 dòng, lọc/tìm kiếm trên toàn bộ dữ liệu; KPI toàn cục; chỉ đọc dữ liệu của các bản ghi cần hiển thị. Ảnh đánh giá vẫn tải khi mở chi tiết. Xuất CSV chủ động đọc từng lô tối đa 100 dòng và kiểm tra đủ kết quả, không xuất riêng trang hiện tại hoặc âm thầm bỏ phần thiếu.
- Cấu hình: Banner, voucher và bài viết có trang riêng tối đa 10 dòng. Bộ lọc và thống kê toàn cục chạy ở server. Số lượt dùng voucher là số tổng hợp, không tải bảng redemption về trình duyệt. Voucher không giới hạn lượt không bị coi là hết lượt.
- Danh sách bài viết không chứa body; chỉ lấy metadata tri thức của các bài trong trang. Body/tri thức đầy đủ tải theo một bản ghi khi xem/sửa. Trước khi dùng body mới, đối chiếu metadata đã đọc để giữ kiểm tra xung đột phiên bản; không thay bản nháp khi realtime làm mới danh sách.
- Ảnh Banner không tải trước khi đang xem voucher/thông báo; reader tiếp tục tái sử dụng blob đã đọc trong cùng phiên quản trị.
- Realtime Admin: các channel dữ liệu phân hệ được quản lý theo phân hệ đang mở và document visibility. Phân hệ không xem không đăng ký native channel; chuyển đi/ẩn tab gỡ đăng ký, quay lại tạo channel mới và thực hiện một đợt invalidation/cập nhật bù có debounce. Payload của channel cũ bị chặn. Primary refresh chạy cuối để giữ đúng cập nhật toàn màn hình ở các module dùng debounce theo phân hệ, kể cả Nhân sự và Khiếu nại.
- Workspace signal/phân quyền và channel broadcast soạn tin của hội thoại không bị ngắt bởi cơ chế trên. Không bỏ kiểm tra quyền hoặc thông báo bảo mật để giảm băng thông.
- User Đơn hàng và Lịch hẹn: trang 10 bản ghi, bộ lọc/tìm kiếm chọn ID ở server; hydration và đối soát tiền chỉ nhận các ID/tổng của trang đó. Số lượng tab, thống kê và tổng chi tiêu vẫn là số toàn cục. Lịch hẹn bỏ truy vấn danh sách pet riêng vì trang đã có đủ trường hiển thị. Có phân trang điện thoại, giữ phiên bản request và chặn kết quả của owner cũ.
- Không thêm polling, không cache dài dữ liệu giao dịch. RPC đọc mới được đưa vào hàng đọc có giới hạn đồng thời; các thao tác ghi/Auth không đi qua hàng này.

## CSDL

Đã áp dụng migration 237, 238 và 239; cùng với 235/236 của đợt trước. Đây là các hàm đọc mới và helper đi kèm, không đổi dữ liệu nghiệp vụ hoặc hợp đồng ghi hiện có. Hàm Admin kiểm tra ADMIN và quyền bảng cần dùng; hàm User tự xác định owner từ JWT, không nhận customer ID để mở rộng phạm vi.

Kiểm tra Cloud chỉ dùng định nghĩa hàm/dữ liệu nghiệp vụ trong phạm vi rõ ràng. Fixture nhân sự, nhật ký, bài viết, voucher, khách hàng, đơn và lịch đều nằm trong giao dịch rollback. Không đọc Supabase infrastructure Logs và không giữ dữ liệu kiểm thử trên hệ thống.

## Kiểm tra

- 22 bài unit/contract cho read budget, cache, owner, DTO theo ID, realtime visibility/catch-up và active-tab refresh: đạt.
- `admin_review_pages_ui.cjs`: trang 10/10/3, KPI toàn cục, tìm kiếm ngoài trang đầu, xuất đủ 23 bản ghi: đạt.
- `admin_settings_pages_ui.cjs`: trang voucher/bài viết, KPI toàn cục, tìm ngoài trang đầu, chỉ tải body theo yêu cầu, giữ draft và chặn metadata đã đổi: đạt.
- `admin_settings_bandwidth_ui.cjs`, `admin_audit_bandwidth_ui.cjs`: lazy loading, cache, lỗi/thử lại và Nhật ký: đạt.
- `admin_audit_page_cloud.cjs`: đối chiếu SQL, số tổng, bộ lọc, số sao tổng hợp, trang cuối, không trả body/redemptions, voucher không giới hạn, chặn anonymous và STAFF: đạt.
- `customer_history_page_cloud.cjs`: 23 bản ghi chia 10/10/3, lọc/tìm kiếm/số tổng, scoped summaries, hai owner tách biệt, chặn anonymous: đạt.
- `customer_history_api.test.cjs`: hydration đúng ID trang, không gọi RPC tải toàn bộ summary, từ chối owner sai: đạt.
- `customer_history_pages_ui.cjs`: DOM thật của danh sách User, trang cuối, số tổng, không gọi pet list dư, đổi owner; kiểm tra 390px không tràn ngang: đạt. Ảnh kiểm tra riêng ở `Pawpal-infra/verification/customer-booking-pages.private.png`, không đưa dữ liệu giả lên ứng dụng.
- Kiểm tra lại User Orders actor, Order detail actor và Profile sync bandwidth: đạt.

Kiểm tra giao diện dùng API giả lập cô lập trong bài kiểm thử; các kiểm tra SQL dùng Supabase với fixture rollback. Chưa đo tổng byte/quota hoặc mọi thao tác trên production, vì vậy không tuyên bố một tỷ lệ giảm băng thông cho toàn hệ thống. Xuất toàn bộ dữ liệu vẫn có tải tương ứng khi được chủ động yêu cầu. Các RPC mới trên CSDL đã sẵn sàng.
