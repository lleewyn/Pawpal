# Khách hàng V7: giới hạn tải dữ liệu

- Danh sách: `admin_customer_page`, 10 hồ sơ/trang. Thống kê trả về cùng RPC; phần Cần xử lý tối đa 20 việc lâu nhất. Các chủ nuôi liên quan được nạp để mở drawer đúng người.
- Pawpoint: `admin_pawpoint_page`, 10 giao dịch/trang. Số dư tính theo sequence trước khi lọc; không cộng lại chỉ từ trang hiện tại.
- Tìm kiếm: debounce 350ms, hỗ trợ tiếng Việt không dấu. Gợi ý khách hàng tối đa 15 kết quả, không giới hạn theo trang danh sách đang xem.
- Cache trang: 60 giây, tối đa 20 trang cho mỗi nguồn; gộp request cùng khóa. Cache hồ sơ tối đa 200 bản ghi khi đổi trang. Realtime và làm mới xóa cache liên quan. Không thêm polling.
- Ledger chỉ tải khi mở tab Pawpoint. Kết quả request cũ không được ghi đè lựa chọn mới.
- Xuất CSV: thao tác chủ động, tối đa 1.000 dòng; lấy tuần tự 100 dòng/lần. Vượt giới hạn thì yêu cầu thu hẹp bộ lọc, không xuất âm thầm một phần. Dữ liệu biến động số lượng/ID giữa các trang thì dừng xuất.
- RPC kiểm tra quyền đọc cụ thể trước khi đọc; không mở cho anon. Giới hạn page size 100 phía server. Không thay đổi API ghi hồ sơ/điểm.

## Kiểm tra

- `node scripts/test/admin_customer_paging_ui.cjs`: API giả lập, đếm request khi đổi trang/cache/tìm kiếm; không ghi Cloud.
- `node scripts/test/admin_customer_paging.cjs`: fixture CSDL trong transaction, ROLLBACK.
- `node scripts/test/admin_pawpoint_paging.cjs`: số dư lịch sử khi lọc, phân trang, từ chối quyền; ROLLBACK.

Không truy vấn Supabase Logs, không chạy stress test Cloud. Các kiểm tra này xác minh hành vi và giảm số request; không khẳng định khả năng chịu tải production quy mô lớn.
