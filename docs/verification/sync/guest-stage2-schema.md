# GĐ-02: nền dữ liệu phiên giao dịch guest

Ngày 27/10/2026, Asia/Bangkok. Migration **112 đã áp dụng Cloud** sau kiểm tra transaction rollback. Không có staging riêng; dùng Cloud theo lựa chọn môi trường trước đó của người dùng. Không coi đây là nghiệm thu API hoặc giao diện guest.

## Thiết kế đã chọn

- Giữ `customer` là hồ sơ nghiệp vụ duy nhất. Thêm `unverified_contact_phone` nullable, kiểm tra định dạng phone nội địa. Đây là liên hệ tự khai, không phải bằng chứng sở hữu. Hai hồ sơ có thể tự khai cùng liên hệ mà không chiếm số chính của nhau; không tự gộp hoặc chuyển owner.
- Giữ nguyên toàn bộ index và dữ liệu `customer_phone`. Backend guest ở GĐ-03 sẽ chỉ lưu liên hệ tự khai cho hồ sơ được tạo riêng, không dùng phone để cấp quyền lên hồ sơ có sẵn.
- `guest_session` thêm `purpose` (`general` mặc định, `commerce`) và `customer_id` nullable có FK. Phiên general giữ phạm vi chat/support và không được gắn customer. Phiên commerce bắt buộc có customer, thời hạn không quá 7 ngày từ lúc tạo, chỉ gắn hồ sơ guest active có liên hệ tự khai.
- Scope, owner, hash và thời điểm tạo của phiên commerce không đổi. Không cho kéo dài hạn hoặc khôi phục token đã thu hồi; xoay token phải tạo phiên khác theo API tương lai. Token general không được đổi scope thành commerce.
- Trigger thu hồi phiên commerce khi hồ sơ đổi liên kết Auth, trạng thái hoặc liên hệ tự khai. Trigger không sửa phiên general. Luồng API cần khóa customer trước khi cập nhật session để giữ thứ tự khóa nhất quán.
- Không thêm bảng khách riêng, không thêm guest session vào tất cả giao dịch, không thay Auth member/RLS/grants/RPC giao dịch hiện có. Không mở truy vấn anon để vượt kiểm soát quyền.
- Giỏ guest sẽ lưu browser theo namespace riêng `pawpal_guest_cart_v1`, chỉ chứa variant/quantity và phiên bản dữ liệu; không coi giá hoặc ID owner từ browser là tin cậy. Chưa ghi guest cart vào `cart/cart_item`; giữ giỏ member hiện tại. API quote/submit ở GĐ-03 phải kiểm tra lại giá/kho và giỏ giao dịch; chuyển giỏ khi đăng nhập cần lựa chọn rõ ràng, không tự ghi đè. Đây là quyết định thiết kế, chưa phải mã UI đã triển khai.

## Bằng chứng kiểm tra

1. [28 kiểm tra / 80 SQL trong transaction rollback](guest-commerce-schema-rollback.txt): quyền/RPC và index phone cũ không đổi, general session tương thích, contact tự khai trùng không chiếm primary, kiểm tra scope/owner/hạn/thu hồi/khóa/liên kết Auth, customer và anon bị chặn, đảo migration và outer rollback sạch.
2. [Áp dụng Cloud](guest-commerce-schema-apply.txt): hash khớp migration đã qua kiểm tra; đối chiếu schema ngay trước apply, fingerprint dữ liệu các cột cũ trước/sau bên trong transaction khóa bảng ngắn. **35 customer giữ nguyên dữ liệu**; trước apply có **0 guest_session**. Kiểm tra general session dùng fixture rollback, không giả định đã có phiên chat thật để đối chiếu.
3. [Kiểm tra metadata sau áp dụng](guest-commerce-schema-readonly.txt): bốn constraint đã validate, hai trigger bật, hai function `SECURITY DEFINER` có search path cố định và không cấp EXECUTE cho anon/customer; hai unique index primary phone còn nguyên, không thêm policy anon.
4. [Sáu kiểm tra guard đã cài](guest-commerce-guards-rollback.txt): đổi contact thu hồi commerce token, general không đổi, không khôi phục token, INSERT/UPDATE lịch sai chủ bé bị chặn, quan hệ đúng được giữ. Một SQL DO block ngắn, tất cả fixture và tác động rollback.

Lượt test đầu gặp lỗi bộ chạy ghép nhiều prepared statement; đã sửa runner và chạy lại đạt trước apply. Không bỏ qua kiểm tra lỗi hoặc ghi PASS cho lượt thất bại. Không đọc Logs, gửi SMS, tạo thanh toán hoặc để lại fixture committed trong đợt này.

## Khôi phục trong phạm vi 112

Ngoài webroot: `D:/Aboutme/Pawpal-infra/supabase-local/backups/guest-commerce-112/` chứa metadata/định nghĩa schema trước/sau, SQL forward và SQL đảo `rollback-no-commerce-data.sql`.

SQL đảo được **thực thi kiểm tra** trong transaction: khôi phục cấu trúc logic, constraints/indexes/triggers, ACL/policy và định nghĩa RPC được bảo vệ về đúng mốc trước 112 khi chưa có dữ liệu mới. Đây là quy trình đảo thay đổi cộng thêm của 112; không phải backup toàn database và không chứng minh phục hồi thảm họa.

Trước khi đảo phải dừng commerce writers. Script lấy khóa với timeout ngắn và **từ chối** nếu có contact tự khai hoặc session commerce/customer binding; không xóa các dữ liệu đó để ép rollback. Nếu đã có giao dịch guest, cần đối soát/bảo toàn dữ liệu và fix forward hoặc lập kế hoạch di chuyển riêng. Không dùng `CASCADE`, không restore đè database Cloud.

## Giới hạn và bước tiếp theo

GĐ-02 hoàn tất ở phạm vi nền schema đã chọn và tương thích ngược. Chưa có endpoint cấp cookie/hash token, phân giải phiên hay submit guest; chưa đổi trang đặt lịch/checkout. Các RPC `ensure_guest_customer`/`complete_customer_auth` cũ vẫn cần xử lý tình huống phone mơ hồ ở GĐ-03; thêm cột không tự giải quyết việc đó.

Liên hệ tự khai mới chưa được hiển thị/tìm kiếm trong Admin, vì chưa có luồng guest ghi dữ liệu và UI tương ứng; không nhận xét rằng Admin đã quản lý hoàn chỉnh giao dịch mới. Cơ chế xem lịch sử riêng, OTP/SMS thật, đồng thời hai writer và kiểm thử hai portal vẫn chưa nghiệm thu. Upload/Storage hoãn, gateway thật ngoài phạm vi.

File: `scripts/database/v1/112_guest_commerce_identity.sql`, `112_guest_commerce_identity_rollback.sql`. Kiểm tra sau cài có thể chạy riêng bằng `node scripts/test/guest_commerce_schema_readonly.cjs --cloud-readonly`; không lặp bài DDL rollback trên schema đã cài. Bài guards là kiểm tra ghi trong transaction rollback, chỉ chạy có chủ đích khi cần.
