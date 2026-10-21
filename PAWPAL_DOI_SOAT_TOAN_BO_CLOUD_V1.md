# Đối soát toàn bộ sau khi chuyển Cloud V1

Ngày kiểm tra: 21/10/2026. Project đích `cpzuvaplseielhgcnqrn`. Website `https://pawpalgr3.vercel.app`.

**Cập nhật sau lượt đối soát:** phân hệ Thú cưng đã được chuyển V1, bổ sung migration 012 và kiểm tra đọc trên Cloud/ghi trên bản phục hồi. Các lỗi Thú cưng trong bảng dưới là mốc baseline trước sửa; kết quả mới tại [nghiệm thu Thú cưng V1](PAWPAL_THU_CUNG_V1_NGHIEM_THU.md). Các phân hệ khác vẫn cần xử lý theo báo cáo này.

**Dịch vụ — các đợt tiếp theo:** truy vấn lịch hẹn, danh mục và đánh giá đã chuyển V1; migration 013 bổ sung tạo lịch, xác nhận/hủy/đổi nhân viên, danh mục và phản hồi đánh giá. Migration 014 chuyển biên bản tiếp nhận/bàn giao, ghi/sửa/xóa nhật ký và phụ phí/dịch vụ đi cùng với xác nhận/phê duyệt. Các lỗi Dịch vụ trong bảng baseline dưới đây cần xem cùng [tiến độ Dịch vụ V1](PAWPAL_DICH_VU_V1_NGHIEM_THU.md). Lưu trú, xe khứ hồi, thu ngân và thông báo còn cần xử lý.

## Kết luận

Database Cloud mới khớp bản V1 local trên cả 105 bảng. Phần Khách hàng đã có kiểm tra Production riêng; các phân hệ còn lại chưa được nghiệm thu toàn bộ. Rà soát đã mở 9 phân hệ, 30 tab Admin và 10 đường dẫn phía khách, phát hiện các truy vấn legacy không tương thích V1 và trang khách vẫn dùng Cloud cũ.

Đây là đợt đối soát và kiểm tra đọc trên Production. Không chạy thanh toán, gửi tin, hoàn tiền, thay tồn kho hoặc tạo/sửa dữ liệu thật để kiểm tra. Tab chi tiết chưa chọn thực thể không đại diện cho việc đã kiểm tra hồ sơ cụ thể. Không có HTTP lỗi ở tab con cũng không có nghĩa chức năng hoạt động khi lượt tải của phân hệ cha đã thất bại.

## Database và dữ liệu đã đạt

| Kiểm tra | Kết quả |
|---|---|
| Tên bảng, cột, kiểu, NULL, PK theo mô hình | 105 bảng / 906 cột, khớp V1 |
| Khóa ngoại hợp lệ | 160; không constraint chưa validate |
| RLS | Bật trên 105 bảng |
| So hash toàn bộ dòng giữa local và Cloud | 105/105 bảng khớp tại thời điểm kiểm tra |
| REST Admin trên tất cả bảng | 105/105 đọc thành công, số dòng khớp kiểm kê SQL |
| REST chưa đăng nhập | Không truy cập được cả 105 bảng |
| Hàm public/private được anon thực thi | Không có |
| Hàm SECURITY DEFINER | Tất cả có cấu hình search_path cố định |
| Chỉ mục lỗi / trigger nghiệp vụ bị tắt | 0 / 0 |
| Auth nhân viên | 17 tài khoản, 16 bị khóa theo quyết định trước; không staff thiếu Auth |
| Số chính / địa chỉ mặc định | Không nhóm liên hệ vi phạm quy tắc đúng một |
| Pawpoint | 7.964; không số dư âm hoặc lỗi thứ tự sequence |
| Tồn kho | 4.382; tổng sổ = tổng tồn, không lệch theo biến thể, không tồn âm |
| Đơn / lịch đã nhập | Không đơn thiếu dòng hàng hoặc lịch thiếu appointment_item |
| Thu/hoàn đã nhập | Không số thu ròng âm hoặc vượt giá trị chứng từ theo view V1 |
| Publication Realtime | Có 95 bảng; chỉ xác nhận kết nối đọc, chưa thử phát sinh cho mọi bảng |

Các kết quả này xác nhận dữ liệu **đã nhập**, không xác nhận tất cả dữ liệu Cloud cũ đã được chuyển. Những dòng từng bị giữ ngoài bản nhập vẫn được bảo toàn ở thư mục nguồn để xử lý.

## Kết quả 9 phân hệ Admin

| Phân hệ | Kết quả kiểm tra đọc trên Vercel | Cần xử lý |
|---|---|---|
| Dashboard | Chưa đạt | Còn select `sales_order.payment_status`, `appointment.service_id`, `support_ticket.title`, `staff.role`; KPI có thể thiếu dù trang vẫn render |
| Khách hàng | Đạt kiểm tra đọc; CRUD đã nghiệm thu ở đợt trước trên local | Giữ bộ RPC/RLS hiện có; cần kiểm thử ghi trên bản Cloud tách biệt trước khi xác nhận lại toàn bộ CRUD Cloud |
| Thú cưng | Chưa đạt | Còn `customer_profile.id`, `pet_profile.species`, `customer.email`, join lịch qua `service_id` |
| Dịch vụ | Chưa đạt | Còn `staff.role`, quan hệ appointment → service trực tiếp và review → customer trực tiếp |
| Bán hàng | Chưa đạt | Còn `product.min_price`, quan hệ sales_order → customer_address và return_request_detail → product_variant theo cấu trúc cũ |
| Nhân sự | Chưa đạt | Còn `staff.role`, `staff_schedule.work_date`; RPC `pawpal_review_staff_shift_request` được mã gọi nhưng chưa có trong V1 |
| Khiếu nại | Chưa đạt | Từng dùng client anon cho support_ticket; đã sửa dùng phiên Admin. Các truy vấn khách, pet, staff, đơn/lịch vẫn cần ánh xạ V1 |
| Chatbot | Chưa đạt | `/api/admin/copilot/history` trả 404 trên Vercel; còn sender_name, breed, title, total_paw_points và quan hệ lịch cũ |
| Cấu hình | Các tab đọc không phát sinh HTTP/JS lỗi trong lượt rà | Chưa thử lưu/xóa banner, bài viết, cấu hình hoặc thao tác quản trị trên Cloud |

Lượt baseline phát hiện 18 tổ hợp endpoint/mã lỗi/thông báo khác nhau. Không có lỗi JavaScript chưa bắt được trong lượt điều hướng 30 tab; đây không phải bằng chứng dữ liệu hiển thị đầy đủ.

### Lỗi đã sửa trong đợt này

`pages/admin/modules/complaints/complaints.js` từng tạo client mới với `persistSession:false`, không mang JWT Admin, để đọc ticket và dựng Realtime. Cloud V1 từ chối anonymous đúng quy định. Đã bỏ client riêng, dùng client Admin hiện có cho ticket, hội thoại và subscription; alias cũ giữ để các tab không vỡ import. Không cấp thêm quyền anon hoặc sửa RLS để né lỗi.

Đã thử mã workspace trong trình duyệt dưới origin Vercel với Cloud thật: không còn HTTP 401 cho ticket. Phân hệ vẫn còn lỗi truy vấn legacy nên **chưa coi Khiếu nại là hoàn thiện**.

Đã triển khai bản sửa lên Production `dpl_CnGFdH7ukQFxQhS7HNDiRSA3d9D7` và chạy lại trên web thật: 0 lỗi HTTP 401/403 và 0 lỗi JavaScript trong 3 tab Khiếu nại; các lỗi schema legacy vẫn còn. Kiểm tra Khách hàng Production sau triển khai tiếp tục đạt đăng nhập, 35 khách, 7.964 điểm, Realtime và reload. Chưa commit/push workspace lên GitHub.

## Phía khách: chưa chuyển sang Cloud mới

Đã mở `/`, `/shop`, `/services`, `/booking`, `/login`, `/user`, `/cart`, `/checkout`, `/blog`, `/contact`. Các trang đều còn request tới project Cloud cũ `ralnsebcwdqelikykxic`; cần chuyển frontend lẫn backend Auth, không chỉ đổi biến Admin.

`/user` và `/cart` chuyển về đăng nhập khi chưa có phiên; `/checkout` chuyển về trang shop khi chưa có giỏ phù hợp. Chưa kiểm tra cổng khách sau đăng nhập vì hiện 0/35 khách được liên kết Auth mới; không tạo tài khoản giả để che phần chưa triển khai.

Quan sát trực tiếp `/shop` nạp `/data/products.json`, `/booking` nạp `/data/booking-config.json`. Rà mã còn thấy file JSON ở luồng shop/checkout/dịch vụ/nhật ký khách và `scripts/api/api.js`. Những chỗ này phải phân loại cấu hình tĩnh và dữ liệu nghiệp vụ; không được dùng làm dữ liệu nghiệp vụ fallback cho Admin. Lượt Admin hiện tại không thấy fetch file dữ liệu JSON.

Mã backend còn dùng các RPC Auth khách cũ, `wishlist_item`, bảng cấu hình `api_keys` và RPC `match_documents` chưa tồn tại ở V1. Đây là tham chiếu cần chuyển mã hoặc xác định lại nghiệp vụ, không phải yêu cầu tự thêm các bảng cũ. `chat-attachments` là bucket Storage, không phải bảng; tính năng file vẫn chưa triển khai.

## Dữ liệu nguồn còn phải đối soát

- 14/35 khách thiếu customer_profile từ nguồn. Không tự tạo họ tên, ngày sinh hoặc thông tin cá nhân giả.
- 0 khách liên kết Auth Cloud mới. Hồ sơ tại quầy đã có nhưng khách chưa thể dùng những hồ sơ này để đăng nhập cổng khách mới.
- Những đơn vị nhập từng bị từ chối vẫn chưa được sửa: xem [báo cáo nhập nghiệp vụ](PAWPAL_NHAP_DU_LIEU_NGHIEP_VU_V1.md). Có 111 đơn nguồn có tổng không khớp tổng dòng, thiếu phân rã vận chuyển/giảm giá hoặc dòng hàng; không hạ ràng buộc để nhập ép.
- Chưa có kết nối trực tiếp Cloud cũ trong file migration. Đối soát nguồn dựa trên các bản xuất đã cung cấp, không khẳng định đã lấy thay đổi mới hơn từ Cloud cũ.
- 23 bảng hiện trống, gồm appointment_record, hotel_booking, taxi_trip, staff_assessment, refund_transaction và các bảng media/liên kết khác. Trống không đồng nghĩa thiếu bảng hoặc được phép seed dữ liệu giả; cần đối chiếu luồng nghiệp vụ và nguồn trước khi nhập.

## Thứ tự hoàn thiện sau kiểm tra

1. Thú cưng: danh sách, hồ sơ chủ nuôi, danh mục loài/giống, cân nặng, nhật ký và nhắc lịch; giữ nghiệp vụ không thú y.
2. Dịch vụ: appointment_item, bảng giá, KTV, biên bản xác nhận, hotel/taxi và đánh giá.
3. Bán hàng: giá từ product_variant, địa chỉ snapshot, chi tiết đổi trả; đối soát các đơn nguồn chưa nhập.
4. Nhân sự và phân quyền; Khiếu nại theo thực thể V1; Dashboard dùng view/tổng hợp đúng schema.
5. Chatbot và các API Vercel còn thiếu; Cấu hình kiểm tra ghi trên bản thử.
6. Cổng khách: Auth liên kết hồ sơ, catalog/RLS public, giỏ/đặt lịch/thanh toán và loại bỏ dữ liệu nghiệp vụ JSON; chỉ sau kiểm tra mới đổi các biến Cloud cũ còn lại.

## Bằng chứng và cách chạy lại

Cập nhật hoàn thiện Dịch vụ (017–018): thu/hoàn thực tế, hủy sau hoàn hết, lịch trực thật/đổi KTV bằng ID/chặn lịch nghỉ, bộ lọc/phân trang/xuất file, các modal, lưu yêu cầu tạo kiểu và tạo phiếu phản ánh đã được kiểm thử riêng và áp dụng local/Cloud mới. Schema vẫn 105 bảng/906 cột/160 FK; chỉ thêm cấu hình phương thức Tiền mặt, không tạo khoản thu giả hoặc sửa dữ liệu nghiệp vụ nguồn. Xem mục 10 của [nghiệm thu Dịch vụ V1](PAWPAL_DICH_VU_V1_NGHIEM_THU.md) để biết đầy đủ bằng chứng và giới hạn.

Cập nhật đợt 016: thông báo mời đón bé đã lưu nội bộ qua giao dịch V1 và kiểm toán, được thử riêng rồi triển khai Cloud/Vercel. Chưa tích hợp gửi Zalo/SMS/email. Schema và dữ liệu nguồn không đổi; thu ngân còn cần chuyển tiếp. Xem phần 9 của [nghiệm thu Dịch vụ V1](PAWPAL_DICH_VU_V1_NGHIEM_THU.md).

Cập nhật 22/10/2026: Dịch vụ đã chuyển tiếp lưu trú và xe khứ hồi bằng migration 015; chính sách giá, luồng nhận/trả, bằng chứng kiểm thử và các giới hạn còn lại nằm trong [nghiệm thu Dịch vụ V1](PAWPAL_DICH_VU_V1_NGHIEM_THU.md). Đối chiếu Cloud sau migration vẫn đúng 105 bảng/906 cột/160 khóa ngoại; dữ liệu cả 105 bảng không đổi. Thu ngân, thông báo và các phân hệ chưa chuyển vẫn cần xử lý tiếp.

- `node scripts/database/v1/audit_cloud_all.cjs`: schema, hash 105 bảng, quyền đọc anon/Admin và kiểm kê.
- `node scripts/test/cloud_all_modules_audit.cjs`: điều hướng 30 tab Production; chặn thao tác ghi tự phát, chụp ảnh và lưu lỗi riêng.
- `node scripts/test/public_cloud_audit.cjs`: 10 đường dẫn phía khách khi chưa đăng nhập.
- `node scripts/test/self_host_vercel_production_live.cjs --cloud`: kiểm tra riêng phần Khách hàng trên Production.

SQL truy vấn trực tiếp trong đợt rà chỉ đọc. Không chạy script bootstrap hoặc nhập lại dữ liệu. Báo cáo có thông tin cá nhân/ảnh trình duyệt/log chi tiết nằm ngoài webroot tại `D:\Aboutme\Pawpal-infra\supabase-local\verification\all-modules-*` và các file `all-*-audit*.private.txt`; không đưa lên Git/Vercel.
