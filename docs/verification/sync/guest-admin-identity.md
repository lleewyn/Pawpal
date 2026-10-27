# Admin nhận diện khách vãng lai — 26/10/2026

## Cập nhật Cloud đã áp dụng

Người dùng xác nhận không có staging và cho phép dùng production Cloud ngày 26/10/2026. [11 kiểm tra/37 SQL rollback PASS](guest-identity-cloud-rollback.txt), sau đó [migration 111 đã áp dụng](guest-identity-cloud-apply.txt). Giữ chữ ký/quyền đọc RPC cũ, không sửa hồ sơ/đơn/lịch; lưu định nghĩa trước thay đổi ngoài webroot tại `Pawpal-infra/supabase-local/admin-customer-page-before-111.private.sql` để phục hồi. Script `admin_customer_identity_cloud.cjs --apply-cloud` chỉ chạy khi file SQL có SHA-256 trùng bài verify PASS.

Các kiểm tra gồm member không có hạng, guest có hạng, guest bị khóa, category kết hợp trạng thái, active gồm hai loại, phân trang/thống kê, liên kết tài khoản giữ cùng Customer ID, customer/anon bị chặn. Lượt test đầu dùng nhầm Auth của staff cho bước liên kết và bị guard khác-portal chặn; đã rollback rồi dùng Auth khách mới riêng, không nới guard. Đồng thời sửa predicate ACTIVE để bao gồm guest active, không chỉ member.

Playwright MCP với Admin đăng nhập thật, mã local và RPC Cloud đã commit: tổng 35, member 1, guest 34; filter thành viên có một dòng, guest 10 dòng/trang và trang cuối 4 dòng; reload không mất nhãn. Chi tiết đơn và lịch hiện có đọc được trường linkage và hiển thị “Thành viên”, không console error. Chỉ đọc dữ liệu hiện có qua UI, không bấm thay đổi nghiệp vụ, không đưa tên/SĐT vào bằng chứng. Nội dung nhãn loại khách hồ sơ được render đúng vào DOM; chưa khẳng định kiểm tra visual hồ sơ vì vùng đó chưa mở hiển thị trong lượt đọc cuối.

Hồi quy sau apply: bốn test Node identity và ba UI offline (identity, paging, profile paging) PASS. Chưa push/frontend deploy; chưa kiểm thử liên kết tài khoản qua đăng ký thực và Realtime phân loại sau đăng ký. Những ghi chú staging/draft bên dưới là tiến độ trước khi người dùng cho phép Cloud.

Branch `feat/guest-admin-identity`, nền `51548731`. Chưa phát hành, chưa áp dụng migration 111.

Phát hiện: `admin_customer_page` và hydrate danh sách Admin dùng sự tồn tại `customer_membership` để xác định thành viên. Hạng điểm độc lập tài khoản, do đó cách này phân loại sai. Nhãn cũ còn suy ra “tại quầy” dù chưa có dữ liệu kênh giao dịch.

Mã local dùng trường máy chủ `customer_type` hoặc `auth_user_id` đã đọc qua quyền Admin: liên kết tài khoản → thành viên, NULL → khách vãng lai, thiếu trường → chưa xác định. Không đoán từ tên/điện thoại/hạng; trạng thái khóa không đổi loại khách. Thêm nhãn danh sách/hồ sơ/chi tiết lịch/đơn, không thêm request; chỉ mở rộng projection truy vấn chi tiết sẵn có. Helper được nạp trước module Admin. Chưa lưu loại khách vào snapshot giao dịch; nhãn mô tả loại hồ sơ hiện tại.

Draft `111_admin_customer_identity.sql` giữ chữ ký/quyền của RPC phân trang, đổi member/guest từ linkage tài khoản, thêm `customer_type` không trả Auth UUID. Guest stats và category TEMP tính cả khách vãng lai bị khóa, lọc trạng thái khóa vẫn độc lập. Chưa áp dụng lên Cloud theo yêu cầu staging trong kế hoạch.

Đã chạy bốn test Node: guest có hạng vẫn guest; member không hạng vẫn member; khóa/tên/SĐT không đổi identity; RPC cũ thiếu trường trả unknown. Kiểm tra cú pháp ba module PASS. Playwright MCP trên mã local + RPC Cloud cũ: 10 dòng khách hiển thị, helper có nạp, không console error; nhãn unknown đúng vì RPC cũ chưa trả linkage. Không coi đó là nghiệm thu phân loại/filter server mới. Số đếm member/guest để dấu — nếu dữ liệu chưa đủ nhận diện.

Chưa xác minh staging/RLS/grant cột `auth_user_id` trên các projection lịch/đơn, UI nhãn và bộ lọc mới với hai loại khách thật, liên kết tài khoản giữ ID, cập nhật Realtime sau liên kết. Chưa thay đổi guest checkout/booking, OTP, quyền dữ liệu hay dữ liệu khách hiện có. Chưa sao lưu schema hoặc có môi trường staging tách biệt, nên chưa qua Gate GĐ-00/GĐ-02.

## Bổ sung xác minh tiếp theo

[Audit Cloud chỉ đọc](guest-identity-readonly-audit.txt): 35 hồ sơ, 34 chưa liên kết tài khoản và một đã liên kết; 21 hồ sơ có kết quả phân loại theo hạng khác phân loại theo tài khoản. Đây là sai khác tiêu chí, không phải kết luận có 21 hồ sơ dữ liệu hỏng. Không xuất tên/SĐT/Auth UUID. Quyền authenticated SELECT cột `customer.auth_user_id` hiện có; RLS customer có policy chủ hồ sơ và policy `customer.read`. RPC Cloud hiện chưa trả `customer_type`. Không sửa DDL, policy hoặc dữ liệu.

Đã tách lựa chọn **Thành viên** khỏi **Đang hoạt động** trong dropdown “Loại khách và trạng thái”. Member/guest gửi bộ lọc category cùng status ALL để khách bị khóa vẫn xuất hiện đúng loại; Đang hoạt động chỉ lọc trạng thái, không ép thành viên. Không phát sinh request bổ sung cho phân loại.

Kiểm thử `admin_customer_identity_ui.cjs` PASS với HTML, enum shell và hai module khách thật, transport mock: guest có hạng vẫn guest; guest khóa hiển thị cả loại và khóa; member không hạng vẫn member; KPI/bộ lọc đúng; Đang hoạt động gồm cả hai loại. Không console error. Harness ban đầu thiếu enum shell khiến fixture khóa bị map sai; đã nạp enum thực, không thay production để chiều test.

Hai hồi quy `admin_customer_paging_ui.cjs`, `admin_customer_profile_paging_ui.cjs` PASS: 10 dòng/trang, cache quay lại, debounce, ledger tải theo yêu cầu và lịch sử trang cuối/lỗi. Cập nhật harness nạp helper mới và thay đường dẫn CSS v7 đã không còn bằng CSS hiện dùng. Bốn test Node identity vẫn PASS. Chưa coi mock transport là staging/Cloud RPC mới.

Đã tìm cấu hình kết nối hiện có: chỉ thấy connector khóa vào project Cloud dùng chung; chưa xác minh staging riêng. Đã hỏi người dùng về staging để tiếp tục migration 111 theo kế hoạch. Không áp dụng draft lên production trong lúc chờ.
