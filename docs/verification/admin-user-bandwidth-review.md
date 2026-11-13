# Rà soát tải dữ liệu Admin và User — 13/11/2026

Cập nhật sau đợt rà soát: Nhật ký Cấu hình đã chuyển sang phân trang server; danh mục Dịch vụ dùng số tổng hợp đánh giá, và realtime Bán hàng/Dịch vụ chỉ tải nhóm của tab hiện tại. Xem `admin-load-followup.md`. Những nhận định dưới đây ghi lại trạng thái ở thời điểm rà soát ban đầu.

Đợt bổ sung sau đó đã xử lý các danh sách còn lại được nêu: xem `paged-data-and-realtime.md` cho phân trang Đánh giá/Cấu hình/lịch sử User và realtime nền.

Rà mã nguồn 63 file JavaScript trong `pages/admin/modules` và `pages/user/modules`, các bộ điều phối và lớp API/realtime/cache liên quan. Đây là rà soát mã và kiểm thử cục bộ, không phải phép đo băng thông production của từng màn hình. Không truy vấn Supabase Cloud Logs, không thêm dữ liệu mẫu vào ứng dụng và không sửa dữ liệu nghiệp vụ.

## Những thay đổi đã thực hiện

- Lớp Supabase dùng chung giới hạn bốn yêu cầu đọc đang truyền dữ liệu; xếp hàng các yêu cầu còn lại và hủy yêu cầu chưa chạy nếu AbortSignal bị hủy. Auth và thao tác ghi không bị đưa vào hàng đọc.
- Chỉ gộp POST của danh sách RPC đọc đã chỉ định rõ; khóa gộp gồm URL, body và headers để giữ riêng tài khoản, tham số, trang và bộ lọc. Không cache lâu dài dữ liệu cá nhân hoặc gộp RPC ghi.
- User dùng một hàng làm mới cho mỗi view: gom sự kiện, không tải khi document ẩn, không chạy chồng truy vấn, giữ một lượt cập nhật tiếp theo nếu thay đổi đến trong khi đang tải, gỡ listener/channel khi dispose. Áp dụng cho lịch/đơn và các trang chi tiết qua helper hiện có; chuyển Nhật ký và Thú cưng sang helper này.
- Chi tiết đơn/lịch thêm điều kiện mã hoặc UUID cùng điều kiện chủ sở hữu, thay vì tải mọi bản ghi rồi tìm trên trình duyệt. Kết quả trống bỏ qua các RPC bổ sung.
- Yêu thích không tải danh mục sản phẩm/dịch vụ nếu nhóm tương ứng trống; giữ filter theo wishlist trên realtime của bảng con.
- Admin Cấu hình tải nhóm của tab đang xem. Sự kiện cập nhật chỉ vô hiệu hóa nhóm liên quan; tab không hiển thị không truy vấn lại; yêu cầu đồng thời được phối hợp để không bỏ sót nhóm của tab mới. Mở Banner không đọc sẵn bài viết hoặc toàn bộ audit_log.
- Dashboard vận hành không làm mới định kỳ hoặc xử lý yêu cầu làm mới khi root đã gỡ/ẩn; giữ dirty để làm mới khi quay lại.
- Dịch vụ không mặc định tải ngầm toàn bộ danh mục và đánh giá trong lúc mở danh sách lịch.
- Bán hàng mặc định đồng bộ nhóm của tab đang xem; các lệnh chỉ định nhiều resources vẫn giữ nguyên.
- Trang chủ/danh mục công khai có cache ngắn và gộp yêu cầu như mô tả trong `public-data-bandwidth.md`.

## Phạm vi Admin đã xem

- Dashboard: coordinator, Tổng quan, Vận hành, Kinh doanh và hai lớp metrics. Có cache theo resource, thời gian truy vấn, debounce và kiểm tra visibility; bổ sung kiểm tra root Vận hành. Kinh doanh có polling khi đang hiển thị; Vận hành polling dự phòng khi realtime mất kết nối.
- Khách hàng: danh sách, hồ sơ, Pawpoint. Trang danh sách và lịch sử dùng page RPC/range; cache theo bộ lọc/trang; thay đổi lịch sử không tải lại các lịch sử không liên quan.
- Thú cưng: danh sách, hồ sơ, nhật ký và nhắc lịch. Page RPC, detail theo resource, phụ trợ khi cần; chỉ làm mới màn hình đang xem. Kiểm thử phân trang/giữ cache/realtime đạt.
- Dịch vụ: danh sách lịch, hồ sơ, danh mục, đánh giá, thu ngân và hỗ trợ. Danh sách lịch dùng page RPC và hydrate ID; bỏ prefetch mặc định. Những dữ liệu tổng hợp danh mục/đánh giá vẫn là snapshot khi vào đúng tab.
- Bán hàng: đơn hàng, hồ sơ đơn, sản phẩm/kho, khuyến mãi và đổi sản phẩm. Danh sách chính dùng page RPC; lịch sử kho/đánh giá có page riêng; đổi mặc định đồng bộ theo tab. Xuất toàn bộ là thao tác có chủ đích.
- Nhân sự: danh sách, hồ sơ, lịch và sát hạch. Danh sách/sát hạch dùng page RPC, ca làm việc giới hạn theo khoảng; polling giữ chỗ kiểm tra tab active, document ẩn và hình học hiển thị, có khóa yêu cầu đang chạy.
- Khiếu nại: dịch vụ, đơn hàng và hồ sơ. Page RPC 10 dòng, hydrate theo các ID trang, directory đầy đủ chỉ theo yêu cầu form. Kiểm thử cache trang, KPI toàn cục, xuất đầy đủ và hồ sơ ngoài trang đạt.
- Chatbot: trực chat, trợ lý và quy định. Có trang hội thoại, phần lịch sử tin nhắn, cache theo actor, debounce tìm kiếm, kiểm tra module/subtab/visibility; polling hộp thư chỉ khi realtime không khỏe. Timer SLA chỉ cập nhật DOM.
- Cấu hình: banner/khuyến mãi, nội dung, thiết lập và nhật ký. Sửa lazy loading và invalidation như trên; kiểm thử số truy vấn trên từng nhóm đạt.
- Shell dùng chung: DataStore, thông báo khiếu nại, Supabase fetch. Kiểm thử cách ly actor/chi nhánh, cache, invalidation, logout và chống bão sự kiện đạt.

## Phạm vi User đã xem

- Tài khoản: hồ sơ, lịch gần nhất, đơn gần nhất, thú cưng và ảnh đại diện; có truy vấn giới hạn và làm mới theo resource. Kiểm tra đứng yên/ẩn 60 giây không truy vấn, đổi owner chặn phản hồi cũ đạt.
- Cài đặt: thông tin cá nhân, quyền riêng tư; xuất dữ liệu chỉ chạy khi bấm nút, truy vấn theo owner và từng lô, không cắt bớt dữ liệu xuất.
- Thú cưng: form/danh sách, lưu trữ, ảnh, giống loài; weight history đã giới hạn ba bản ghi mỗi bé; timer đếm ngược lưu trữ chỉ cập nhật DOM. Thay hàng realtime như trên; kiểm tra form/lưu/double submit/owner đạt.
- Nhật ký: lựa chọn bé, buổi dịch vụ, care log và ảnh; thay realtime như trên. Reader ảnh riêng tư giữ kiểm tra quyền.
- Lịch hẹn: danh sách, hủy/đổi lịch, chi tiết, thực thi, logistics, đánh giá; lọc chi tiết tại server và chống tải chồng khi realtime.
- Đơn hàng: danh sách, chi tiết, hủy/nhận/mua lại, đổi trả, đánh giá; chi tiết lọc tại server, thumbnail metadata theo lô ID thay vì một request mỗi ảnh. Kiểm thử API thumbnail và chống phản hồi của owner cũ đạt.
- Yêu thích: đọc server, sản phẩm/dịch vụ, thao tác thêm/xóa và realtime; bỏ lượt tải nhóm trống, giữ filter bảng con và dùng hàng làm mới chống bão sự kiện.
- Pawpoint: lịch sử/ví/danh mục có trang riêng, snapshot theo owner; kiểm thử các trang độc lập và số dư đạt.
- Hỗ trợ: danh sách có page RPC, chi tiết có trang tin nhắn, refresh theo dirty/in-flight/owner và view đang mở. Không thêm tải ảnh vào danh sách hoặc polling mới.
- Header: thông báo và giỏ có scope khách; thông báo đọc giới hạn; khách vãng lai giữ luồng tra cứu/giỏ riêng. Không cache hồ sơ riêng tư trong cache công khai mới.

## Điểm còn cần phân biệt với “không thể vượt quota”

- Danh sách lịch và đơn User vẫn đọc toàn bộ lịch sử thuộc khách để phục vụ các bộ lọc hiện tại; sửa trong đợt này giới hạn riêng trang chi tiết, không âm thầm cắt danh sách hoặc làm sai tổng số. Chuyển danh sách sang phân trang server là một thay đổi API/UI riêng còn cần làm khi lịch sử tăng lớn.
- Khi thực sự mở Nhật ký Cấu hình, mã hiện tại vẫn đọc snapshot audit_log để tìm kiếm/lọc toàn cục trên trình duyệt. Đợt này đã bỏ tải snapshot đó ở mọi tab khác và bỏ reload nó theo thay đổi không liên quan; chưa chuyển bộ lọc nhật ký sang server.
- Một số bảng danh mục/báo cáo, thư viện cấu hình và tác vụ xuất vẫn đọc nhiều lô. Giới hạn đồng thời không làm giảm tổng byte của tác vụ cần đọc toàn bộ.
- Channel nền của một số phân hệ Admin còn nhận sự kiện để invalidation. Không tuyên bố đã loại bỏ toàn bộ egress Realtime. Không đổi mô hình kênh tùy tiện làm mất cập nhật giữa phân hệ.
- Cache danh mục công khai có thể chậm phản ánh chỉnh sửa tối đa TTL tương ứng; giá, tồn kho và quyền ghi vẫn do luồng giao dịch trên server xác nhận.

## Kiểm tra và giới hạn kiểm thử

Đạt: `supabase_read_budget.test.cjs` (4), `public_data_cache.test.cjs` (6), `customer_detail_bandwidth.test.cjs` (1), `customer_realtime_filters.test.mjs` (4), `admin_settings_bandwidth_ui.cjs`, `test_phase2_datastore.js` (8), `complaint_notices_bandwidth.cjs`, `user_profile_sync_bandwidth_ui.cjs`, `user_loyalty_page_ui.cjs`, `user_pets_sync_ui.cjs`, `user_order_thumbnails_ui.cjs`, `user_order_detail_actor_ui.cjs`, `user_orders_actor_ui.cjs`, `user_return_detail_ui.cjs`, `admin_pet_paging_ui.cjs`, `admin_complaint_server_paging_ui.cjs`, `dashboard_business_ui.cjs`, `dashboard_operations_metrics.cjs` (22), `dashboard_business_metrics.cjs` (9). Trang chủ live read-only có kiểm tra reload không phát sinh thêm ba truy vấn công khai trong TTL.

Các bài cũ chưa đạt với harness hiện hành: Orders paging (mock không xử lý RPC lịch sử mới), Services paging (mock không tương thích dữ liệu phụ trợ), Customers paging (harness thiếu guard/wrapper Admin mới), Chatbot paging (mock handler theo hợp đồng cũ), Support sync và Booking detail actor (harness media/đánh giá dùng giao diện cũ); bài `test_bandwidth_regression.js` vẫn kỳ vọng coordinator Dashboard cũ tự phát 11 request. Không dùng những bài này làm bằng chứng PASS; không sửa quyền runtime để vượt kiểm thử.

Chưa chạy trọn E2E đăng nhập mọi vai trò trên production, chưa đo tổng quota Cloud. Các thay đổi đang ở local, không tự push hoặc deploy.
