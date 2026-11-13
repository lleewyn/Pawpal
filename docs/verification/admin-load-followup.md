# Sửa tải dữ liệu Admin — 13/11/2026

Bổ sung tiếp theo: Đánh giá dịch vụ, các danh sách Cấu hình và lịch sử User đã chuyển sang trang server; các channel dữ liệu Admin có pause/resume theo màn hình. Xem `paged-data-and-realtime.md` cho kết quả hiện tại. Tài liệu này ghi đợt sửa đầu với migration 235/236.

## Kết quả

- Nhật ký Cấu hình chuyển từ tải toàn bộ bảng sang RPC `admin_audit_page`: tối đa 10 dòng/trang; bộ lọc và tìm kiếm chạy trên toàn bộ dữ liệu ở server. Tổng nhật ký, số lần đồng bộ và phân hệ cập nhật cuối vẫn là số tổng toàn cục.
- Nội dung `description` không có trong payload danh sách, chỉ đọc khi mở “Xem thay đổi”. Trang có cache theo tài khoản/bộ lọc/trang, debounce tìm kiếm, chống phản hồi cũ và trạng thái lỗi có nút thử lại. Không thay dữ liệu thật bằng mảng mẫu hoặc fallback tải toàn bộ.
- Danh mục Dịch vụ dùng RPC tổng hợp `admin_service_review_summary` để lấy số lượt và điểm trung bình theo dịch vụ; không còn tải mọi nội dung đánh giá, phản hồi, khách hàng và phiếu hỗ trợ chỉ để hiển thị sao. Cách tính vẫn giữ phạm vi đánh giá và các giá trị sao hợp lệ như trước.
- Realtime Bán hàng chỉ làm mới resource của tab đang xem. Dịch vụ chỉ làm mới nhóm phụ thuộc của tab hiện tại; nếu đang xem danh mục, thay đổi đánh giá chỉ cập nhật số tổng hợp. Cache của các nhóm khác vẫn bị vô hiệu hóa; khi mở lại tab sẽ đọc mới qua lớp cache, không giữ snapshot cũ chỉ vì đã tải trước đó.
- RPC mới yêu cầu tài khoản Admin hợp lệ và quyền đọc tương ứng, không cấp cho anonymous. Giới hạn đọc đồng thời hiện có cũng áp dụng cho hai RPC mới.

## Cơ sở dữ liệu

Đã áp dụng migration 235 và 236 lên Supabase được cấu hình của dự án. Đây là hai hàm đọc bổ sung, không sửa/xóa bản ghi nghiệp vụ. Kiểm tra bằng giao dịch rollback với nhân sự/nhật ký kiểm thử và đối chiếu số tổng hợp; không giữ lại fixture. Không sử dụng Supabase infrastructure Logs.

## Kiểm chứng

- `admin_audit_page_cloud.cjs`: trang đầu/cuối tối đa 10 dòng, bộ lọc toàn cục, trang vượt phạm vi, trạng thái rỗng, tổng số chính xác, không trả description, chặn anonymous; đối chiếu số lượt và điểm trung bình của summary với SQL nguồn. Đạt.
- `admin_audit_bandwidth_ui.cjs`: phân trang, cache khi quay lại trang, tìm bản ghi ngoài trang đầu, KPI toàn cục, tải chi tiết khi bấm, phản hồi đến sai thứ tự, lỗi và thử lại. Đạt; browser dùng dữ liệu kiểm thử cô lập.
- `admin_settings_bandwidth_ui.cjs`: nhóm lazy theo tab và invalidation. Đạt.
- `admin_active_tab_refresh.test.cjs`: realtime theo tab đang xem, không tải khi ẩn, metadata tổng hợp thay nội dung đánh giá. 3 bài đạt.
- `supabase_read_budget.test.cjs`: bốn bài về giới hạn đồng thời, gộp RPC theo actor/body, hủy yêu cầu và giữ slot trong suốt thời gian truyền body. Đạt.
- Kiểm tra cú pháp các JS thay đổi và `git diff --check`: đạt.

Chưa đo tốc độ toàn bộ Admin trên production hoặc tổng quota theo ngày. Các tác vụ xuất đầy đủ và tab lịch sử/đánh giá yêu cầu nhiều bản ghi vẫn có thể đọc nhiều dữ liệu khi người dùng thực sự mở/chạy. Luồng User không thay đổi trong đợt sửa này. Hai hàm đọc trên CSDL đã sẵn sàng.
