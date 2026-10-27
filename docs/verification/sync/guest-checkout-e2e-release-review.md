# Checkout hai cổng, các ca E2E còn thiếu và rà trước phát hành

Ngày 27/10/2026, Asia/Bangkok. Thực hiện ba nhóm người dùng chọn: checkout committed/Admin, giỏ đổi tài khoản, nhiều bé/trùng tên/phiên/quyền/INSERT Realtime, cùng review và hồi quy trước phát hành. Không làm nhánh OTP giả lập trong đợt này. Không push/deploy khi chưa có yêu cầu rõ ràng.

## Checkout và giỏ đổi tài khoản

[Checkout UI committed](guest-checkout-committed-ui.txt) chạy Chrome thật với hai context Admin/guest và server local 4001, không mock business API:

1. Guest mở sản phẩm thật, thêm một SKU vào giỏ, đi qua giỏ/checkout, nhận tại cửa hàng, tạo một đơn pending bằng API thật mà không đăng nhập/OTP.
2. Admin đã mở và lọc đúng số QA từ trước; đơn mới xuất hiện mà không reload. Mở đúng link mã đơn và bấm Xác nhận đơn; khách mở tra cứu thấy trạng thái đã xác nhận/chuẩn bị theo receipt máy chủ.
3. Admin hủy đơn qua menu và modal với lý do QA; khách bấm Cập nhật trạng thái và thấy Đã hủy. Không bấm thu tiền, bàn giao vận chuyển hoặc hoàn tất.
4. Đối chiếu DB: một dòng hàng, không còn giữ kho active, không payment succeeded hoặc xuất kho. Sản phẩm thật chỉ bị giữ tạm một đơn vị rồi giải phóng, không sửa giá hoặc ledger tồn.

Các timeout đầu do harness bấm nhầm liên kết hồ sơ khách và tìm nút hủy ở tab chi tiết thay vì menu danh sách. Đã đọc lại UI và chạy tiếp đúng một đơn có sẵn theo UUID; không tạo thêm đơn để che lỗi. Các cờ kiểm tra được giữ trong manifest private theo từng checkpoint. Không coi timeout harness là lỗi nghiệp vụ.

[Giỏ A → B → A](guest-cart-account-committed-ui.txt): guest có 3 đơn vị trong giỏ cục bộ; liên kết hồ sơ với Auth QA, đăng nhập A bằng form phone/mật khẩu thật. A khởi đầu giỏ member trống rồi thêm 2; đăng xuất A, đăng nhập B trên cùng browser, B trống rồi thêm 1. Quay lại A và reload vẫn đúng 2. SQL đối chiếu cart A=2, B=1; giỏ guest riêng vẫn 3, không bị chép sang member. Auth QA được xác nhận sẵn bởi fixture; đây không phải nghiệm thu OTP.

[Cleanup checkout](guest-checkout-committed-cleanup.txt): dọn đúng hai Auth/customer, đơn cancelled, payment pending chưa thu, giữ kho cancelled và các cart. Không payment/điểm/xuất kho đã ghi sổ; giữ bốn audit bất biến gồm hai SALES_FULFILLMENT, SALES_ORDER_CREATE, GUEST_ORDER_CREATE. Sản phẩm/variant thật không bị sửa; không tắt trigger hoặc xóa ledger. Credential/cookie/browser state private đã xóa.

## Nhiều bé, quyền và phiên

[E2E booking committed](guest-booking-e2e-committed.txt) chạy UI/HTTP thật, không bridge rollback:

- Cùng một owner thêm hai bé cùng tên và giống, cân nặng khác nhau. Hai Pet ID riêng. Chọn từng card và tạo hai lịch spa, SQL kiểm tra từng lịch gắn đúng owner/Pet ID, không ghi đè lịch đầu.
- Bổ sung nhãn “Mã bé” khi tên trùng để các card phân biệt được bằng mắt sau reload. Mã dùng phần cuối ID; nếu phần cuối trùng thì dùng toàn ID. Chỉ hiện khi cần, xử lý bằng chữ đã escape và bảng đếm trong bộ nhớ; không thêm API hoặc lưu PII.
- Chờ `system: ok` của subscription PostgreSQL trước tạo lịch. Cả hai INSERT `appointment` thật đến channel Admin, mỗi lịch xuất hiện trên màn hình đang mở không reload. Đóng RETEST INSERT của V1.25.
- Browser khác nhập cùng số tự khai vẫn có owner riêng. Gọi receipt của owner đầu trả 404; đọc pet của owner đầu trả 403, không có dữ liệu riêng tư trong phản hồi.
- Chỉ đặt expires_at của session fixture thứ hai về quá khứ để kiểm tra expiry: cookie có chữ ký hợp lệ vẫn bị trả 401, không contact/pets. Không đổi đồng hồ server hoặc session khách thật.
- Kết thúc phiên đầu qua API, sau đó replay cookie ký thật ban đầu vẫn nhận 401 khi đọc receipt.

[Cleanup booking](guest-booking-e2e-cleanup.txt): dọn đúng hai owner, ba pet và hai lịch; còn 0 fixture. Giữ hai audit tạo lịch, không payment/điểm hoặc thay cấu hình thật.

## Rà và hồi quy

- [93 test Node PASS](guest-review-regression-tests.txt): Auth, identity, access, cart, client/epoch, HTTP guards, recovery code và thời gian Việt Nam.
- Sáu bài Chrome/module offline PASS: hai bé trùng tên; thêm/sửa bé/contact; chọn lịch/nhân viên/validation; checkout validation/retry; recovery/session order; hồi quy spa/hotel/taxi/đổi lịch ở UTC/Los Angeles/Tokyo.
- `guest_booking_cloud.cjs --verify-installed`: **33 kiểm tra/336 SQL PASS**, HTTP thật đến SQL Cloud trong rollback. Gồm spa/hotel/taxi, retry tuần tự, hai bé cùng tên, foreign pet/receipt và phiên thu hồi. Không gọi đó là cạnh tranh sau commit.
- [Kiểm tra local](guest-release-local-checks.txt): **103 file JS/CJS/MJS** thay đổi/thêm mới qua syntax; không có file `.private`/`.env` trong diff, không còn các file credential/fixture của đợt này. About/Blog đang có thay đổi riêng được loại khỏi phạm vi syntax/review guest; không tự gom vào phát hành.
- Metadata sau cài: năm RPC mới khớp file và chỉ service_role được execute; 27 bảng subscription Dịch vụ tồn tại và published. Danh sách 31 bảng subscription Bán hàng cũng được đối chiếu metadata, không thiếu bảng. Không sửa schema/grants/publication trong đợt này.
- Rà các ranh giới chính: cookie ký/HttpOnly/origin/body size/whitelist/rate fail-closed; owner/revision/idempotency RPC; server recompute quote/stock; không phone fallback; token recovery không vào URL/storage; cache/giỏ tách actor và generation. Chưa có bằng chứng để đóng các gate OTP giả lập, nhiều writer sau commit hoặc toàn bộ member payment/return.

## Trạng thái phát hành

HEAD local và `origin/main` đang cùng `515487316452d2df1394984e74d45926c4f0cca9`; nhánh làm việc `feat/guest-admin-identity`. Thay đổi guest chưa commit/push. Còn diff About/Blog riêng trong workspace, không được gộp mù vào một commit guest.

[HTTP Vercel trước phát hành](guest-vercel-before-release.txt): `/`, `/shop`, `/booking`, `/return-guest` trả 200; `/api/customer/guest/context` trả 404 ở deployment hiện tại. Chỉ kiểm tra HTTP/HTML, không chạy JS hoặc ghi dữ liệu trên Vercel. Kết quả này xác nhận tuyến API guest mới chưa được phát hành, không phải nghiệm thu code local trên production và không kết luận website bị chặn.

Khi được yêu cầu push/deploy: chốt phạm vi commit theo checklist, giữ migration Cloud đã cài, cấu hình backend/cookie origin, deploy rồi kiểm tra lại API guest và smoke đúng deployment. Không chạy lại migration đã cài mù quáng. OTP giả lập liên kết và cạnh tranh sau commit vẫn là mục mở của kế hoạch tổng thể; không tự đóng GĐ-05/GĐ-06 hoặc coi website đã phát hành từ kết quả local.
