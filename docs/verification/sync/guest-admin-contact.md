# Admin đọc đúng liên hệ guest và người nhận

Ngày 27/10/2026, Asia/Bangkok. Migration 117 đã áp dụng Cloud; frontend local chưa push/deploy. Không sửa dữ liệu khách/phone/order/appointment hiện có.

## Vấn đề và thay đổi

Guest commerce chủ ý lưu `customer.unverified_contact_phone`, không ghi phone chính khi chưa chứng minh quyền sở hữu. Một số mapper Admin chỉ đọc `customer_phone.is_primary`, nên khách guest mới không có số để liên hệ; search RPC cũng không tìm được bằng contact tự khai. Chi tiết giao nhận còn dùng tên/phone chủ đặt thay cho snapshot người nhận riêng.

- Helper identity dùng số chính trước, rồi contact tự khai nếu không có số chính; cờ `unverified` chỉ cho fallback tự khai. Không gắn nhãn số chính là đã qua OTP. Không phân loại khách từ số điện thoại hoặc hạng.
- Mapper khách, lịch và đơn đọc field đã có; danh sách khách và chi tiết lịch hiển thị “Chưa xác minh” khi dùng fallback. Không tăng số request/polling hoặc lấy cả danh bạ bổ sung.
- Chi tiết đơn có hai dòng chủ đặt/liên hệ riêng; người nhận và SĐT lấy snapshot của đơn trước. Người nhận khác chủ không dẫn nhầm sang hồ sơ chủ khi click tên.
- RPC `admin_customer_page` giữ chữ ký/quyền/guard/paging, tìm theo số chính hoặc contact dự phòng; trả contact tự khai bằng field riêng cho Admin. Không đưa nó vào `phonesData`, không tạo canonical phone, đổi Auth linkage, xóa hoặc gộp customer.

## Migration và kiểm tra Cloud

[Bảy kiểm tra/36 SQL rollback](admin-guest-contact-rollback.txt): hai guest cùng contact vẫn có hai ID; Admin search tìm cả hai khi không có phone chính; trả field riêng và loại guest, không Auth UUID/phone chính giả; member có phone chính giữ ưu tiên. Customer/anon bị từ chối. SQL reverse khôi phục định nghĩa 111; toàn bộ fixture Auth/staff/customer/phone và DDL rollback sạch.

[Apply 117](admin-guest-contact-apply.txt): trước áp dụng đối chiếu đúng body 111 đang cài và bằng chứng theo SHA-256; sau áp dụng body khớp, ACL giữ nguyên. Không cập nhật hàng dữ liệu. Backup ngoài webroot tại `D:/Aboutme/Pawpal-infra/supabase-local/backups/admin-guest-contact-117/`, có before/forward/reverse. File `117_admin_guest_contact_rollback.sql` chỉ khôi phục RPC đọc cũ, không xóa contact đã thu thập; đây không phải backup toàn DB.

## UI/local

`admin_customer_identity_ui.cjs`: HTML/module customer thật, transport giả lập. Kiểm tra guest hiện contact + nhãn chưa xác minh; member có phone chính hiện số chính, không nhãn fallback. KPI/loại khách/khóa/filter hồi quy PASS.

`admin_guest_order_contact_ui.cjs`: renderer chi tiết đơn thật trên HTML Admin, fixture owner/receiver khác nhau. Hiển thị đúng hai tên/hai phone; chỉ liên hệ owner có nhãn chưa xác minh, receiver khác không click mở nhầm owner. Không gọi Cloud.

Năm test helper identity/contact PASS, gồm bốn test identity cũ và một test phone precedence/fallback. Tổng bộ Node guest/Auth/access/identity **88 PASS**; syntax/whitespace PASS. Lượt UI order ban đầu chờ load toàn bộ HTML bị timeout; chuyển sang DOMContentLoaded để kiểm renderer riêng, không kết luận lỗi website. Không đọc Logs, SMS/gateway/Storage hoặc fixture committed.

## Giới hạn

Services detail mới qua syntax/mapping và helper, chưa có lượt UI service detail đầy đủ trong đợt này. UI customer/order dùng fixture transport; chưa phải Admin Auth thật xem đơn guest đã commit hoặc Realtime hai portal. Migration có hiệu lực Cloud nhưng frontend cần push/deploy trước khi người dùng môi trường public thấy nhãn/snapshot mới. Gate tổng thể giữ mở.
