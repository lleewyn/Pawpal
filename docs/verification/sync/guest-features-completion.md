# Hoàn thiện chức năng guest: sửa hồ sơ, khung giờ và tra cứu riêng

Ngày 27/10/2026, Asia/Bangkok. Migration 120–123 đã áp dụng Cloud theo phạm vi production người dùng cho phép. API/giao diện mới còn local; không push/deploy. Upload/Storage và gateway thật vẫn ngoài phạm vi.

## Các chức năng đã nối

**Sửa bé đã lưu:** chọn bé tại bước đầu đặt lịch, bấm “Sửa bé đã chọn”. Form đọc đúng Pet ID theo phiên, điền tên/giống/giới tính/cân nặng/dị ứng/lưu ý. Lưu giữ nguyên Pet ID và owner; cập nhật cân nặng bằng lịch sử đo, không sửa cân nặng lịch hẹn cũ. Revision chặn ghi đè thay đổi mới, mã yêu cầu chặn ghi cân nặng trùng khi thử lại. Quote cũ bị bỏ sau khi chọn lại bé đã sửa.

**Sửa liên hệ:** có ở bước chọn bé và checkout khi đã có hồ sơ phiên. Checkout không cho gõ đè contact đã gắn hồ sơ qua form tạo đơn; dùng “Sửa liên hệ” riêng. Tên/số vẫn tự khai, không tạo canonical phone, không gộp customer và không thay snapshot người nhận trên đơn cũ. Đổi số thu hồi mọi phiên commerce cũ bằng trigger 112, tạo phiên thay thế giữ nguyên Customer ID và hạn cũ. RPC dùng ledger riêng có kiểm tra chính xác payload/revision và phiên; retry với cookie cũ hoặc cookie mới sau phản hồi gián đoạn không xoay tiếp hoặc hồi sinh phiên đã thu hồi. Không persist contact/pet/revision trong browser storage.

Migration 120 thêm hai RPC service-only, ledger retry trong `pawpal_private` không cấp quyền browser/service trực tiếp, và giữ quyền đọc receipt của cùng owner sau khi xoay phiên. Migration 123 chỉ điều chỉnh nhánh retry để xử lý trường hợp cookie mới đã đến trình duyệt nhưng nội dung phản hồi bị mất. Không thay trigger bất biến hoặc bỏ kiểm tra RLS.

**Gợi ý giờ và nhân viên:** nút “Xem giờ có thể đặt” cho guest gọi RPC 121 service-only, kiểm tra binding/pet, ngày trong 90 ngày và cấu hình vận hành. Tối đa 48 mốc cách nhau 30 phút, chỉ tải khi bấm, không polling. Staff lấy từ logic availability hiện hành; chọn nhân viên ưu tiên hoặc ngẫu nhiên vẫn chờ Admin xác nhận. Đổi giờ xóa lựa chọn nhân viên cũ. Quote/create kiểm tra lại giờ/chỗ/giá và nhân viên, không tin slot cũ.

**Tra cứu khi mất phiên:** mỗi response receipt hợp lệ cấp mã riêng cho đúng loại giao dịch và UUID, được HMAC ký ở backend với domain riêng, hết hạn sau 90 ngày. Receipt hiển thị và có nút sao chép để khách tự lưu. Trang tra cứu nhận mã bằng POST, không đưa mã vào URL/storage, không dùng phone hoặc OTP giả lập để cấp quyền. Mã không cấp quyền xem danh sách hồ sơ/pet hay giao dịch khác, không đăng nhập/liên kết tài khoản. Hai RPC 122 chỉ service_role được gọi; HTTP kiểm tra chữ ký/loại/ID/hạn trước khi gọi. Cookie thiếu/sai/hết hạn không cản nhập mã hợp lệ. Nếu không còn cookie hoặc mã riêng, khách cần được cửa hàng hỗ trợ; không tự mở lịch sử bằng phone. Mã riêng là quyền đọc từng receipt trong thời hạn; việc thu hồi commerce cookie không thu hồi mã riêng. Thay secret backend làm mã cũ mất hiệu lực.

Luồng phone/OTP giả lập cũ trên trang tra cứu đã ngừng khởi tạo và form cũ ẩn sẵn; không tạo Auth session từ tra cứu. Thành viên có liên kết vào trang tài khoản. Link “Tra cứu đơn hàng” sau checkout và “Tra cứu lịch hẹn” sau booking dùng ID làm lựa chọn, cookie làm bằng chứng; ID công khai không cấp quyền. Khi đổi tài khoản, các panel xóa dữ liệu và bỏ phản hồi trễ.

**Lỗi theo trường từ máy chủ:** API ánh xạ các reason code đã biết (giờ quá khứ/ngoài giờ/đủ lịch, phòng xung đột/không khả dụng, trả phòng/lượt về sai) thành field lỗi; client truyền field qua error, form đặt lịch tô lỗi và focus đúng ô. Các lỗi không xác định trường vẫn hiện thông báo chung, không đoán từ câu lỗi. Validation local thêm bé/lịch/checkout của V1.21–V1.23 giữ nguyên.

## Kiểm thử và Cloud

| Bằng chứng | Kết quả và phạm vi |
|---|---|
| [120 rollback](guest-profile-edit-rollback.txt), [apply](guest-profile-edit-apply.txt) | 9 nhóm/85 SQL: ownership, revision, retry, weight, contact rotation, không canonical/merge, receipt continuity, browser deny, reverse/rollback |
| [121 rollback](guest-slots-rollback.txt), [apply](guest-slots-apply.txt) | 4 nhóm/31 SQL: settings/slot thật, giới hạn, foreign pet/session, browser deny, reverse/rollback |
| [122 rollback](guest-recovery-rollback.txt), [apply](guest-recovery-apply.txt) | 4 nhóm/43 SQL: receipt chính xác sau thu hồi phiên, đúng loại/guest audit, browser deny, reverse/rollback |
| [123 rollback](guest-edit-retry-rollback.txt), [apply](guest-edit-retry-apply.txt) | 9 nhóm/87 SQL: gồm retry với cookie thay thế không xoay lần hai và từ chối phiên thay thế đã thu hồi |
| [Metadata sau cài](guest-features-installed-readonly.txt) | Một query cho năm RPC mới: body khớp file, service execute, anon/authenticated không execute |
| [Chrome → HTTP → SQL thật](guest-profile-slots-recovery-browser-rollback.txt) | 60 SQL, một owner/một pet/một lịch spa, đúng Pet ID, không payment. Thêm/sửa bé, đổi contact/xoay cookie, slots, quote/create/receipt, xóa cookie rồi recovery; rollback 0 fixture còn lại |

SQL test fixture cân nặng ban đầu được đặt sớm hơn một giây vì `now()` cố định trong transaction rollback; không thay định nghĩa view cân nặng hoặc dữ liệu thật để làm test qua. Không dùng Logs hoặc load test. Bridge chỉ dùng loopback, bỏ rate limiter trong bài tích hợp; giới hạn/rate fail-closed kiểm riêng bằng unit tests. Bridge đã dừng.

Các bài offline/module thật trên Chrome PASS: thêm/sửa bé và contact; chọn lịch/slot/nhân viên và reset; checkout validation/uncertain retry/bound-contact editor không form lồng; recovery booking/order, session-order lookup và xóa dữ liệu khi account đổi. Hồi quy spa/hotel/taxi/đổi lịch ở UTC, Los Angeles, Tokyo PASS. [Bộ Node Auth/identity/access/cart/client/HTTP/recovery](guest-features-node-tests.txt) **91 test PASS**; syntax/whitespace PASS.

Có thể tái hiện theo từng script mới trong `scripts/test/`. Script migration `--verify-cloud` chỉ dùng khi RPC chưa cài như điều kiện đầu vào; sau cài dùng `guest_features_installed_readonly.cjs --verify-installed`, không chạy lại migration-test cũ mù quáng. Bài HTTP sử dụng fixture signature/transport; bài SQL tách kiểm quyền thật. Không gọi đó là Auth login thật.

## Khôi phục và việc còn phải nghiệm thu

Before/forward/reverse đã lưu ngoài webroot trong `D:/Aboutme/Pawpal-infra/supabase-local/backups/guest-profile-edit-120/`, `guest-slots-121/`, `guest-recovery-122/`, `guest-edit-retry-123/`. Reverse theo thứ tự 123 → 122 → 121 → 120 sau khi dừng UI/API mới. Reverse 120 chặn nếu ledger edit đã có dữ liệu; không tự xóa lịch sử edit hoặc hoàn tác contact/weight nghiệp vụ. Khi đã phát sinh edit thật cần giữ ledger và khôi phục hàm có kiểm soát. Đây không phải backup toàn DB.

Đã xây dựng/nối các nhóm chức năng còn thiếu nêu trên. **Chưa nghiệm thu toàn hệ thống:** Auth/đăng ký/OTP thật, giữ hồ sơ sau liên kết thật, cạnh tranh sau commit và tồn kho, Admin/User committed/Realtime, review tổng diff và phát hành Vercel. GĐ-03/GĐ-04/GĐ-05/GĐ-06 không tự đóng từ kết quả rollback/offline. Không push khi chưa có yêu cầu rõ ràng.
