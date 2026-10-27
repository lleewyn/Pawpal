# PAWPAL --- KẾ HOẠCH TRIỂN KHAI NHẬN DIỆN KHÁCH VÃNG LAI VÀ ĐẶT LỊCH/MUA HÀNG

**Phiên bản:** V1.27\
**Ngày lập:** 26/10/2026\
**Phạm vi:** Guest Identity, Pet Profile, Service Booking, Shop
Cart/Checkout\
**Nguyên tắc:** Kiểm tra trước --- thay đổi tối thiểu --- kiểm thử đầy
đủ.

**Cập nhật V1.27 (27/10/2026):** [Checkout hai cổng, E2E và review trước phát hành](docs/verification/sync/guest-checkout-e2e-release-review.md). Checkout committed → Admin nhận không reload/xác nhận/hủy → khách đọc đúng trạng thái; không thu tiền/xuất kho. Giỏ thật guest=3, A=2, B=1; A→B→A và reload không lẫn dữ liệu. Hai bé cùng tên/giống có mã riêng, tạo đúng hai lịch và cả hai INSERT thật đến Admin sau sửa Realtime; browser cùng phone nhưng khác owner bị chặn, expiry/revoke trả 401. 93 test Node, sáu bài Chrome và 33 kiểm tra/336 SQL rollback PASS. Các fixture đã dọn, giữ sáu audit mới. Rà 103 file syntax và ranh giới guest; API guest trên Vercel hiện 404 vì chưa push/deploy. Không đóng OTP giả lập, cạnh tranh sau commit hoặc gate phát hành tổng thể.

**Chốt phạm vi V1.26 (27/10/2026):** Người dùng xác nhận chỉ dùng OTP giả lập; SMS/OTP thật không áp dụng và không còn là điều kiện nghiệm thu. Kiểm thử còn lại là đăng ký/kích hoạt/đặt lại mật khẩu và liên kết guest bằng OTP giả lập qua giao diện và challenge máy chủ, gồm mã sai/hết hạn/dùng lại/giới hạn thử. Không coi cờ OTP trong browser là quyền đọc lịch sử hoặc gộp hồ sơ theo số điện thoại. Nhánh liên kết 116 hiện từ chối OTP giả lập; cần rà và nối đúng binding phiên cho phạm vi này, chưa đánh hoàn tất luồng OTP chỉ từ test đăng nhập V1.25. Các ghi chú “chưa OTP/SMS thật” trong báo cáo cũ là giới hạn lịch sử, không phải việc phải triển khai thêm.

**Cập nhật V1.25 (27/10/2026):** [Booking committed, Admin và đăng nhập sau liên kết](docs/verification/sync/guest-committed-two-portal.md). Một lịch spa guest đã tạo qua UI/HTTP thật, Admin xác nhận qua modal, khách xem đúng confirmed. Sửa GUEST-RT-01: bỏ đăng ký bảng `room_type` cũ khiến toàn channel Dịch vụ bị từ chối; sau sửa Admin tự nhận tên bé và nhãn Thành viên qua Realtime. A đăng nhập thật thấy đúng bé/lịch, đăng xuất rồi B đăng nhập trên cùng browser không thấy dữ liệu A và bị chặn deep link. Auth fixture được xác nhận sẵn, không SMS/OTP. Đã dọn hai khách/Auth và bé/lịch thử, giữ hai audit bất biến. Chưa push/deploy; INSERT Realtime sau sửa, checkout committed, nhiều writer và signup/OTP thật còn mở.

**Cập nhật V1.24 (27/10/2026):** [Hoàn thiện chức năng sửa hồ sơ guest, xem giờ/nhân viên và tra cứu riêng](docs/verification/sync/guest-features-completion.md). Migration 120–123 đã áp dụng Cloud sau SQL rollback/reverse; frontend/API còn local. Chrome → HTTP → SQL thật đã qua thêm/sửa bé cùng ID, sửa liên hệ/xoay phiên, slots, tạo spa và xóa cookie rồi dùng mã riêng để tra cứu; 60 SQL, 0 fixture còn lại. 91 test Node PASS. Không push/deploy; Auth thật, cạnh tranh sau commit và Admin/User Realtime vẫn là nghiệm thu còn mở. Các ghi chú lịch sử “chưa có API sửa”, “guest chưa có slots”, “tra cứu mất phiên chưa có proof” được thay bằng cập nhật này trong đúng phạm vi chức năng.

**Điều chỉnh môi trường 26–27/10/2026:** Người dùng xác nhận chưa có staging riêng và cho phép kiểm thử/áp dụng trên production Cloud. Kiểm tra transaction rollback trước, chỉ áp dụng sau PASS và có phương án khôi phục đúng phạm vi. Migration 111 lưu RPC cũ và kiểm tra UI; migration 112 lưu schema trước/sau, kiểm tra SQL đảo có chặn mất dữ liệu. Điều chỉnh này thay yêu cầu staging trong các đợt đã ghi nhận; không coi Cloud dùng chung là staging và không tự đánh dấu nghiệm thu toàn bộ guest checkout/booking hoặc backup toàn database.

## 1. Mục tiêu

-   [ ] Khách vãng lai đặt lịch và mua hàng không cần đăng nhập hoặc OTP
    trong quá trình giao dịch.
-   [ ] Dùng số điện thoại để tìm hồ sơ phù hợp, hạn chế tạo hồ sơ
    trùng.
-   [ ] Khách quay lại có thể chọn bé cưng đã lưu hoặc thêm bé mới.
-   [ ] Mỗi bé cưng có Pet ID riêng; mỗi lịch hẹn và đơn hàng có mã
    riêng.
-   [ ] Không cho phép chỉ dựa vào số điện thoại để truy cập lịch sử
    giao dịch hoặc dữ liệu riêng tư của người khác.
-   [ ] Không làm hỏng luồng thành viên, thanh toán, giỏ hàng hoặc chức
    năng Admin hiện có.

## 2. Quy tắc nghiệp vụ đã thống nhất

-   Khách vãng lai không bắt buộc đăng ký thành viên.
-   Không yêu cầu OTP khi đặt lịch hoặc mua hàng; không yêu cầu xác minh
    thiết bị.
-   Số điện thoại được chuẩn hóa để đối chiếu/tìm hồ sơ phù hợp. Số điện
    thoại nhập vào không tự chứng minh quyền sở hữu hồ sơ.
-   Một hồ sơ khách có thể liên kết với nhiều bé cưng; mỗi bé có Pet ID
    riêng.
-   Mỗi đơn hàng và lịch hẹn là giao dịch riêng, không ghi đè giao dịch
    cũ.
-   Trang Tra cứu đơn/dịch vụ tiếp tục giữ cơ chế xác minh riêng hiện
    tại.
-   Nếu không thể xác định hồ sơ phù hợp an toàn, vẫn cho khách bắt đầu
    giao dịch nhưng không tự động tiết lộ hồ sơ cũ.
-   Không tự động hợp nhất hồ sơ chỉ vì số điện thoại hoặc tên bị trùng.

## 3. GĐ-00 --- Khảo sát và khóa phiên bản hiện tại

### Bổ sung đã thống nhất: Admin nhận diện loại khách

Cập nhật V1.20 ngày 27/10: [tìm guest tại quầy, tìm đơn và lịch theo contact](docs/verification/sync/guest-admin-search.md). Migration 119 đã áp dụng Cloud sau chín nhóm kiểm tra/72 SQL rollback và reverse. Ba RPC đọc bổ sung contact tự khai; tìm đơn giữ riêng tên/số người nhận. Hai guest cùng số vẫn riêng ID, không tự gộp; ACL/invoker giữ nguyên, tìm đơn/lịch yêu cầu thêm `customer.read`. UI POS local hiện loại khách/nguồn số, kiểm thử Chrome fixture PASS; chưa Auth/commit hai portal hoặc push/deploy.

- [x] Tìm khách hoạt động tại quầy bằng contact tự khai, hiển thị loại khách/nguồn số; hai guest cùng số phải chọn theo hồ sơ, không tự gộp. SQL Cloud rollback và UI transport fixture PASS, migration 119 Cloud.
- [x] RPC phân trang đơn/lịch tìm được contact guest; đơn tìm riêng người nhận khác chủ đặt; customer/anon bị chặn, giữ giới hạn trang. SQL rollback/reverse PASS; chưa nghiệm thu giao diện với Auth thật và giao dịch committed.

Cập nhật V1.19 ngày 27/10: [lưu hồ sơ Admin không nâng số tự khai thành số chính](docs/verification/sync/guest-admin-profile-contact.md). Migration 118 đã áp dụng Cloud sau chín kiểm tra/65 SQL rollback và reverse. Guest commerce không có phone chính: đổi tên/để nguyên số không tạo canonical phone; sửa contact vẫn là tự khai, thu hồi phiên cũ, không gộp hoặc chiếm số member. ACL/SECURITY INVOKER giữ nguyên; apply không sửa hàng hiện có. UI form/profile local có nhãn nguồn contact, test fixture PASS; chưa Auth/E2E committed hoặc push/deploy frontend.

Cập nhật V1.18 ngày 27/10: [liên hệ guest trong Admin và người nhận riêng](docs/verification/sync/guest-admin-contact.md). Guest mới chỉ có contact tự khai nên UI cũ có thể hiện trống hoặc lấy nhầm số người nhận. Migration 117 đã áp dụng Cloud sau bảy kiểm tra/36 SQL rollback và SQL đảo: Admin tìm theo contact, trả field riêng; quyền/signature giữ nguyên, không tạo số chính hoặc gộp hồ sơ. Frontend local dùng số chính trước, contact dự phòng có nhãn chưa xác minh; chi tiết đơn tách chủ đặt/người nhận. Hai UI test dùng transport/fixture riêng PASS; không coi là E2E committed hai portal, chưa push/deploy frontend.

- Loại khách lấy từ hồ sơ máy chủ: chưa liên kết tài khoản là **Khách vãng lai**, đã liên kết tài khoản là **Thành viên**. Không suy luận từ tên, số điện thoại, hạng tích điểm hay trạng thái đăng nhập trình duyệt.
- Loại khách độc lập trạng thái hoạt động/khóa: khách vãng lai bị khóa vẫn thuộc nhóm khách vãng lai.
- Hiển thị loại khách trong danh sách/hồ sơ khách và chi tiết lịch hẹn/đơn hàng; có bộ lọc Khách vãng lai/Thành viên.
- Khi liên kết tài khoản hợp lệ, giữ nguyên Customer ID, bé cưng và giao dịch; không tự gộp hồ sơ khác cùng số điện thoại.

Tiến độ 26/10/2026:

- [x] Ghi nhận nền `main` tại commit `51548731`; tạo branch `feat/guest-admin-identity`.
- [x] Rà code Admin và RPC trang khách: phát hiện phân loại dựa trên `customer_membership`, sai với khách có hạng nhưng chưa có tài khoản hoặc thành viên chưa có hạng.
- [x] Chuẩn bị mã local phân loại độc lập hạng, nhãn danh sách/hồ sơ/chi tiết đơn/lịch và migration draft `111_admin_customer_identity.sql` cho bộ lọc/thống kê phía máy chủ.
- [x] Audit Cloud chỉ đọc xác minh quyền SELECT cột liên kết tài khoản/RLS hiện có, RPC cũ thiếu loại khách; 21/35 hồ sơ khác tiêu chí hạng so với liên kết tài khoản. Không sửa dữ liệu. [Bằng chứng](docs/verification/sync/guest-identity-readonly-audit.txt).
- [x] Kiểm tra giao diện offline dùng module/enum thật cho nhãn, KPI và bộ lọc loại khách/trạng thái độc lập; hai hồi quy phân trang/hồ sơ và bốn test Node identity PASS. [Báo cáo](docs/verification/sync/guest-admin-identity.md).
- [x] Migration 111 qua 11 kiểm tra/37 SQL transaction rollback: quyền Admin/customer/anon, phân loại độc lập hạng, khách khóa, bộ lọc kết hợp, phân trang, thống kê, liên kết tài khoản giữ Customer ID; fixture và DDL rollback sạch.
- [x] Áp dụng 111 lên Cloud theo lựa chọn môi trường của người dùng; giữ chữ ký/quyền RPC, sao lưu định nghĩa cũ ngoài repo, không UPDATE hồ sơ/giao dịch hiện có. [Bằng chứng](docs/verification/sync/guest-identity-cloud-apply.txt).
- [x] Playwright MCP trên frontend local + Cloud RPC mới: 35 hồ sơ/1 thành viên/34 vãng lai; lọc member/guest đúng, trang cuối guest 4 dòng, nhãn giữ sau reload. Chi tiết đơn/lịch hiển thị “Thành viên”, không lỗi console/quyền đọc.
- [x] Fixture committed chuyển linkage qua service RPC: cùng Customer ID/Pet ID/Appointment ID, retry không trùng; Admin UI tự đổi vãng lai→thành viên qua Realtime và reload. Fixture đã dọn, không xóa ledger/audit. [Bằng chứng](docs/verification/sync/guest-activation-and-lookup.md).
- [x] Đăng nhập phone/mật khẩu thật sau liên kết: khách A thấy lại đúng bé/lịch, giữ Customer ID/Pet ID/Appointment ID. V1.25 kiểm trên fixture committed, đã dọn; không thay cho signup/OTP.
- [ ] Đăng ký/kích hoạt bằng OTP giả lập và xem lại bé/lịch trọn luồng: chưa nghiệm thu. Auth ở lượt V1.25 được xác nhận sẵn bằng fixture, không thay cho kiểm thử challenge OTP giả lập; frontend local chưa phát hành. SMS thật không áp dụng.
- [x] Phát hiện GUEST-LOOKUP-01: backend lịch sử tra cứu đọc theo phone bằng service client chưa xác minh owner. Chuẩn bị bản vá local yêu cầu Auth owner, bỏ frontend fallback; 35 test Auth/access và hai HTTP deny thật PASS.
- [x] Cơ chế mã tra cứu riêng được backend xác minh cho từng đơn/lịch guest: HMAC ràng buộc loại/UUID/hạn 90 ngày, không phone/browser OTP. Migration 122 Cloud; UI/HTTP/SQL rollback và tamper/type/expiry/browser-role deny PASS. API/UI chưa phát hành, không coi là nghiệm thu Auth/hai portal.
- [x] Hoàn tất khảo sát đặt lịch/giỏ hàng/checkout/thành viên, đối chiếu schema/RPC/RLS và deployment; gate khảo sát GĐ-00 đạt. [Báo cáo và vấn đề chuyển tiếp](docs/verification/sync/guest-stage0-audit.md). Chưa nghiệm thu luồng guest không OTP.

**Ưu tiên: P0 --- Bắt buộc trước khi sửa code/database.**

### 3.1. Khóa phiên bản và môi trường

-   [x] Ghi nhận branch, HEAD/origin main và SHA Production `51548731`; metadata deployment thành công và ba asset tại domain thật khớp commit.
-   [x] Tạo branch riêng cho chức năng nhận diện khách vãng lai.
-   [x] Xác định chưa có staging riêng; ghi nhận lựa chọn Cloud dùng chung của người dùng, không gọi đó là staging.
-   [x] Lưu bản chụp catalog schema ngoài webroot (kèm SHA-256) và chuẩn bị bộ tình huống/fixture. Đây không phải archive pg_dump tự động restore; chưa kiểm thử phục hồi, cần backup phục hồi được trước thay đổi cấu trúc tiếp theo.
-   [x] Không chạy migration trong đợt khảo sát GĐ-00; chỉ dùng transaction đọc và rollback. Yêu cầu staging cũ được thay theo quyết định môi trường của người dùng; migration tương lai cần kế hoạch kiểm tra và phục hồi riêng.
-   [x] Ghi nhận hiện trạng trước sửa để so sánh sau triển khai.

### 3.2. Kiểm tra các file liên quan

-   [x] `pages/public/login/login.js` --- xác định phạm vi OTP hiện tại;
    không đưa OTP vào checkout/đặt lịch.
-   [x] `pages/public/return-guest/return-guest.js` --- kiểm tra luồng
    khách quay lại.
-   [x] `pages/services/booking/booking.js` --- kiểm tra luồng đặt lịch
    và lưu thông tin thú cưng.
-   [x] `pages/shop/cart/cart.js` --- kiểm tra lưu/khôi phục giỏ hàng và
    trạng thái phiên.
-   [x] `pages/shop/checkout/checkout.js` --- kiểm tra thông tin khách,
    địa chỉ và tạo đơn.
-   [x] `scripts/api/api.js` --- xác định API/RPC tạo khách hàng, thú
    cưng, lịch hẹn và đơn hàng.
-   [x] Kiểm tra module hồ sơ/lịch sử giao dịch thành viên để tránh ảnh
    hưởng ngoài phạm vi.
-   [x] Lần theo luồng UI → JS → API/RPC → Supabase → DB → Admin/User.

### 3.3. Đối chiếu database thực tế

-   [x] Kiểm tra `customer`, `customer_phone`, `customer_profile` (nếu
    có), `guest_session`.
-   [x] Kiểm tra `pet_profile`, `appointment`, `appointment_item` (nếu
    có).
-   [x] Kiểm tra `cart`, `cart_item`, `sales_order`,
    `sales_order_detail`, `payment`.
-   [x] Kiểm tra khóa ngoại, unique index, trigger, RPC và các ràng buộc
    liên quan.
-   [x] Kiểm tra RLS policies thực tế; không chỉ dựa vào việc RLS đã
    bật.
-   [x] Xác định chức năng nào truy vấn Supabase trực tiếp từ trình
    duyệt và chức năng nào đi qua backend/Edge Function.
-   [x] Ghi rõ điểm đã xác minh và điểm chưa có bằng chứng.

**Gate GĐ-00: Đạt ở phạm vi khảo sát.** Đã có danh sách file/luồng thực tế, schema/ràng buộc/RLS đã xác minh và danh sách vấn đề cần xử lý. [Báo cáo chi tiết, bản chụp schema và giới hạn](docs/verification/sync/guest-stage0-audit.md). Không kết luận chức năng hoạt động chỉ vì bảng tương ứng tồn tại; chưa nghiệm thu guest booking/checkout hoặc quy trình restore backup.

## 4. GĐ-01 --- Chốt quy tắc nghiệp vụ

**Ưu tiên: P0.**

**Cập nhật 27/10/2026:** [Đặc tả GĐ-01](docs/verification/sync/guest-stage1-rules.md) cụ thể hóa yêu cầu đã thống nhất: giao dịch không đăng nhập/OTP, cùng phiên có quyền mới được dùng lại bé, phone trùng không tự chọn/gộp hồ sơ và vẫn được nhập giao dịch mới với liên hệ chưa xác minh. Các dấu `[x]` ở mục 4 là **hoàn tất đặc tả nghiệp vụ**, không phải tính năng đã triển khai hoặc test E2E PASS. Phương án lưu liên hệ chưa xác minh phải được giải quyết ở GĐ-02, không tự bỏ unique index phone chính.

### 4.1. Luồng khách lần đầu

-   [x] Khách xem sản phẩm/dịch vụ mà không cần đăng nhập.
-   [x] Khi đặt lịch/checkout, khách nhập thông tin cần thiết, bao gồm
    số điện thoại.
-   [x] Chuẩn hóa số điện thoại trước khi đối chiếu.
-   [x] Nếu chưa có hồ sơ phù hợp, chỉ tạo hồ sơ khách nghiệp vụ khi cần
    lưu giao dịch hoặc hồ sơ thú cưng.
-   [x] Lưu thông tin liên hệ và hồ sơ bé cưng theo quan hệ khách hàng
    --- thú cưng.
-   [x] Cho khách tiếp tục đặt lịch/mua hàng mà không yêu cầu đăng nhập
    hoặc OTP.

### 4.2. Luồng khách quay lại

-   [x] Khách nhập số điện thoại khi bắt đầu đặt lịch/mua hàng.
-   [x] Hệ thống tìm hồ sơ phù hợp theo quy tắc nhận diện đã chốt.
-   [x] Nếu hồ sơ đã được liên kết an toàn với phiên hiện tại, có thể
    điền sẵn thông tin và hiển thị các bé cưng được phép sử dụng.
-   [x] Nếu chỉ trùng số điện thoại nhưng chưa có căn cứ xác định quyền
    truy cập, không tự động tiết lộ dữ liệu riêng tư.
-   [x] Nếu có nhiều hồ sơ cùng số điện thoại hoặc dữ liệu không nhất
    quán, không tự động chọn/gộp hồ sơ.
-   [x] Nếu chưa xác định được hồ sơ, vẫn cho khách tiếp tục giao dịch
    và nhập thông tin cần thiết.
-   [x] Không tạo hồ sơ khách mới chỉ vì khách mở lại website.

### 4.3. Quy tắc dữ liệu

-   [x] Một hồ sơ khách có thể liên kết nhiều bé cưng.
-   [x] Mỗi bé cưng có Pet ID riêng; không dùng tên bé làm khóa duy
    nhất.
-   [x] Mỗi lịch hẹn tham chiếu đúng bé cưng.
-   [x] Nếu khách đặt dịch vụ cho nhiều bé, tạo lịch riêng cho từng bé
    theo nghiệp vụ hiện tại.
-   [x] Mỗi đơn hàng có mã riêng; các dòng sản phẩm liên kết đúng đơn.
-   [x] Phân biệt số điện thoại hồ sơ khách với số điện thoại người nhận
    hàng lưu tại thời điểm đặt.
-   [x] Giữ lịch sử giao dịch cũ khi khách đặt lịch/đơn mới.

**Gate GĐ-01: Hoàn tất đặc tả.** Luồng chính, luồng lỗi, xử lý số điện thoại trùng và quyền truy cập đã được cụ thể hóa theo yêu cầu hiện có. Thời hạn phiên 7 ngày là mặc định thiết kế, chưa áp dụng Cloud. Không đánh dấu nghiệm thu triển khai ở các giai đoạn sau.

## 5. GĐ-02 --- Kiểm tra và điều chỉnh database

**Ưu tiên: P0. Chỉ bắt đầu sau GĐ-00 và GĐ-01.**

### 5.1. Kiểm tra dữ liệu hiện có

27/10/2026: [Bằng chứng chỉ đọc tổng hợp](docs/verification/sync/guest-data-integrity-readonly.txt). Có 33 dòng phone; các chỉ số trùng/sai định dạng, bé thiếu chủ, lịch sai chủ và chi tiết mất cha đều bằng 0. Không sửa dữ liệu hoặc xuất phone/ID/tên; chưa chạy migration GĐ-02.

-   [x] Tìm số điện thoại trùng sau khi chuẩn hóa.
-   [x] Kiểm tra một số điện thoại có được gán làm số chính cho nhiều
    khách không.
-   [x] Kiểm tra hồ sơ khách có bản ghi số điện thoại trùng không.
-   [x] Kiểm tra hồ sơ thú cưng có chủ sở hữu hợp lệ.
-   [x] Kiểm tra lịch hẹn tham chiếu đúng chủ sở hữu thú cưng.
-   [x] Xác định cách xử lý dữ liệu trùng trước khi thêm unique
    constraint/index.

Hiện không có dữ liệu trùng cần sửa; giữ nguyên index đang có. Với liên hệ trùng mới chưa xác minh: không tự hợp nhất hoặc chiếm phone chính; cần phương án lưu riêng trong mục 5.2 trước khi triển khai.

### 5.2. Thay đổi cấu trúc nếu thực sự cần

27/10/2026: [Thiết kế, migration 112 và bằng chứng](docs/verification/sync/guest-stage2-schema.md). Đã áp dụng Cloud sau 28 kiểm tra rollback; có kiểm tra metadata và sáu guard sau cài. Không sửa giá trị các cột cũ của 35 customer; chưa có API/UI giao dịch guest.

-   [x] Cân nhắc thêm `customer_id` nullable vào `guest_session`, có
    khóa ngoại tới `customer(id)`, để liên kết phiên với hồ sơ sau khi
    phân giải danh tính an toàn.
-   [x] Kiểm tra index duy nhất của số điện thoại chính trước khi bổ
    sung; xử lý dữ liệu trùng trước khi tạo ràng buộc.
-   [x] Bảo đảm lịch hẹn không thể liên kết `customer_id` của khách A
    với `pet_id` thuộc khách B.
-   [x] Xác định cách lưu giỏ hàng khách vãng lai; nếu giỏ hiện chỉ lưu
    ở trình duyệt đến checkout thì không tự ý thay đổi schema giỏ hàng.
-   [x] Không tạo bảng khách vãng lai riêng nếu `customer` đã đáp ứng
    vai trò hồ sơ nghiệp vụ.
-   [x] Không thay đổi cơ chế `auth_user_id` của thành viên nếu không có
    yêu cầu rõ ràng.
-   [x] Không thêm `guest_session_id` vào mọi bảng giao dịch nếu chưa có
    nhu cầu cụ thể.

### 5.3. Migration

-   [x] Viết migration SQL riêng, có thể rà soát và chạy an toàn theo
    thiết kế.
-   [x] Ưu tiên thay đổi tương thích ngược.
-   [x] Kiểm tra khóa ngoại, index và trigger sau migration.
-   [x] Theo điều chỉnh môi trường của người dùng: chạy DDL/fixture trong transaction rollback trên Cloud, sau PASS mới áp dụng; không có staging riêng.
-   [x] Chuẩn bị và kiểm tra SQL đảo trong phạm vi 112, lưu schema trước/sau ngoài webroot; từ chối đảo nếu đã có dữ liệu mới. Chưa có backup/restore toàn database.
-   [x] Ghi lại schema trước và sau thay đổi.

**Gate GĐ-02: Đạt trong phạm vi schema nền.** Migration 112 đã qua rollback, kiểm tra SQL đảo và áp dụng Cloud theo lựa chọn môi trường của người dùng; giữ dữ liệu, quyền/RPC và unique index phone cũ. Chỉ bổ sung liên hệ tự khai, scope/binding phiên và guard cần thiết. API/UI chưa triển khai; GĐ-03 và các bài E2E vẫn để trống.

## 6. GĐ-03 --- Hoàn thiện API và nghiệp vụ phía máy chủ

**Ưu tiên: P0.**

27/10/2026: [API phiên và lưu bé đã kiểm tra](docs/verification/sync/guest-stage3-session-pets.md). Migration 113 đã áp dụng Cloud sau 24 kiểm tra HTTP→SQL rollback; hai probe REST thật và 39 test Node PASS. Backend/route local chưa push/deploy. Mới hoàn tất phần phiên/contact/bé, chưa tạo lịch/đơn guest, chưa test hai writer hoặc hai portal; **gate GĐ-03 chưa đạt**.

Cập nhật tiếp 27/10: [API booking guest/migration 114](docs/verification/sync/guest-stage3-booking.md) đã có quote/create/receipt cho spa, hotel và taxi. 31 kiểm tra HTTP→SQL rollback, SQL đảo/quyền, hai REST probe chỉ đọc, hai guard RPC sau cài và 40 test Node PASS. 114 đã áp dụng Cloud, backend/UI chưa phát hành. Dòng “chưa tạo lịch” ở mốc 113 được thay bằng kết quả API 114; vẫn chưa tạo đơn shop guest hoặc nghiệm thu UI/concurrency/commit hai portal.

Cập nhật 115 ngày 27/10: [API báo giá/tạo đơn/receipt guest](docs/verification/sync/guest-stage3-sales.md) đã có, checkout không cần tạo pet, quote không tự tạo customer. 24 kiểm tra HTTP→SQL rollback, SQL đảo/quyền, ba REST probe chỉ đọc, deferred constraints sau cài và 41 test Node PASS; migration 115 đã áp dụng Cloud. Kết quả này thay mốc “chưa tạo đơn shop” ở 114; chưa push/deploy/UI, chưa nghiệm thu concurrency/commit/Realtime, chuẩn hóa legacy và liên kết Auth cho contact mới. **Gate GĐ-03 vẫn chưa đạt toàn bộ.**

Cập nhật 116 ngày 27/10: [Liên kết Auth có chủ đích và phone dùng chung](docs/verification/sync/guest-stage3-account-link.md). Migration đã áp dụng Cloud sau 22 kiểm tra HTTP/SQL rollback (OTP/Auth verifier mock), SQL đảo/grants; hai REST negative probe và 50 test Node PASS. Giữ Customer/Pet/Appointment/Order ID, xung đột không gộp, thu hồi guest token; chuẩn hóa Auth/commerce dùng cùng helper. Đây thay phần backend còn thiếu tại mốc 115, không phải SMS thật/UI đã nghiệm thu. Hai writer, nhiều bé và phát hành/kiểm thử hai portal còn mở.

### 6.1. Phân giải khách hàng

Cập nhật tiếp 27/10: [khóa tồn kho và lớp gọi API giao diện](docs/verification/sync/guest-stock-and-browser-client.md). Năm kiểm tra SQL Cloud PASS: hai phiên cạnh tranh cùng variant chờ khóa hàng, tiếp tục sau rollback; hết tồn từ chối đơn dùng báo giá cũ, retry giữ nguyên đơn. Không commit fixture, không sửa ledger/catalog. Bộ Node Auth/access/client/HTTP guard có 60 test PASS. Đây chưa phải kiểm thử chống bán vượt tồn sau commit hoặc UI; các mục concurrency tổng thể vẫn mở.

Cập nhật kiểm thử 27/10: [nhiều bé và khóa hai writer](docs/verification/sync/guest-stage3-multi-pet-concurrency.md). 33 kiểm tra booking trên RPC đã cài (336 SQL) và ba kiểm tra bằng hai kết nối Cloud PASS, toàn bộ fixture rollback. Đã xác minh lịch riêng cho hai bé cùng hồ sơ và writer thứ hai chờ khóa token. Chưa xác minh retry cạnh tranh sau commit hoặc tranh chấp tồn kho; các mục concurrency/chống lặp tổng thể tiếp tục để trống, gate GĐ-03 còn mở.

-   [x] Hoàn thiện cơ chế tạo/quản lý phiên khách vãng lai nếu cần.
-   [x] Nếu dùng `guest_session`, token phải đủ ngẫu nhiên, lưu dạng
    hash ở phía máy chủ, có thời hạn và có thể thu hồi.
-   [x] Chuẩn hóa số điện thoại nhất quán ở điểm vào API Auth và commerce bằng helper chung, kiểm tra các dạng nội địa/+84/0084/84 và dữ liệu rác. Các form/browser legacy chờ GĐ-04, không đổi phone cũ trong DB.
-   [x] Tìm hồ sơ khách theo quy tắc nghiệp vụ đã thống nhất: chỉ dùng binding server của phiên, không tìm/chọn hồ sơ cũ bằng phone.
-   [x] Nếu hồ sơ được xác định hợp lệ, liên kết phiên với hồ sơ đó: chỉ liên kết hồ sơ mới do phiên tạo trong transaction; nhận lại/liên kết Auth cũ chưa triển khai.
-   [x] Nếu chưa có hồ sơ, chỉ tạo khi nghiệp vụ cần lưu thông tin.
-   [ ] Xử lý yêu cầu đồng thời để hạn chế tạo hai hồ sơ trùng.
-   [x] Nếu có nhiều kết quả không thể phân biệt, không tự động gộp/chọn
    hồ sơ.
-   [x] Backend liên kết hồ sơ guest mới với Auth sau xác minh hợp lệ mà giữ ID/lịch sử; xung đột không tự hợp nhất. 116 kiểm tra phone-confirmed/Auth và signed guest proof; HTTP verifier được mock trong test. Probe 111 không được dùng thay bằng chứng 116; SMS thật ngoài phạm vi từ V1.26.
-   [ ] Rà/nối và kiểm thử nhánh liên kết guest với OTP giả lập máy chủ, giữ Customer/Pet/Appointment/Order ID theo binding cookie, không cấp quyền từ phone hoặc cờ browser. Không bỏ kiểm tra owner của RPC hiện có để làm test qua.

### 6.2. Hồ sơ thú cưng

-   [x] API trả về danh sách bé cưng tối thiểu cần thiết cho việc lựa
    chọn.
-   [x] Không trả dữ liệu riêng tư không cần thiết chỉ vì khách nhập số
    điện thoại.
-   [x] Khi khách chọn bé, máy chủ kiểm tra quyền sử dụng và trạng thái
    hồ sơ.
-   [x] Khi thêm bé mới, tạo Pet ID mới và liên kết đúng `customer_id`.
-   [x] Không gộp hai bé chỉ vì trùng tên.
-   [x] Không cho client gửi `customer_id` tùy ý để sửa hồ sơ hoặc đặt
    lịch cho người khác.

API lưu bé và quote/create lịch guest đều từ chối owner tùy ý ở HTTP và RPC; các thao tác sửa hồ sơ member cũ giữ nguyên quyền hiện tại.

### 6.3. Đặt lịch và mua hàng

-   [x] Tạo lịch với `customer_id` và `pet_id` hợp lệ.
-   [x] API tạo lịch riêng cho từng bé cùng hồ sơ, kể cả trùng tên; kiểm tra HTTP→Cloud SQL rollback, receipt/retry và ràng buộc dữ liệu PASS. Giao diện chọn nhiều bé chờ GĐ-04.
-   [x] Tạo đơn hàng với `customer_id` hợp lệ và lưu thông tin giao nhận
    tại thời điểm đặt.
-   [x] Bảo đảm các bước tạo đơn/chi tiết đơn/thanh toán nhất quán bằng
    transaction hoặc cơ chế tương đương phù hợp.
-   [ ] Chống ghi nhận lặp khi khách bấm nhiều lần hoặc gửi lại yêu cầu
    sau lỗi mạng.
-   [x] Không để lỗi giữa chừng tạo giao dịch thiếu liên kết.
-   [x] Giữ OTP của trang Tra cứu đơn/dịch vụ độc lập; không đưa OTP vào
    đặt lịch/checkout.

Booking 114 và shop 115 đã kiểm tra transaction, retry tuần tự, giá/chỗ/tồn thay đổi và receipt đúng phiên, không yêu cầu Auth/OTP. Đã buộc chạy deferred constraints cho đơn thử và hai lịch của hai bé rồi rollback. API nhiều bé đã kiểm tra; giao diện chưa nối. Dòng chống ghi nhận lặp vẫn để trống: bài hai writer mới chứng minh chờ khóa rồi tiếp tục sau rollback, chưa có cạnh tranh sau commit hoặc tồn kho. Tra cứu riêng chưa được coi là hoàn tất chỉ vì API giao dịch không dùng OTP.

### 6.4. Bảo mật

Các dấu `[x]` mục này áp dụng cho API guest mới 113–115 đã kiểm tra, không phải nghiệm thu bảo mật toàn bộ mã legacy hoặc frontend Production chưa phát hành.

-   [x] Kiểm tra RLS và quyền thực thi RPC/API thực tế.
-   [x] Không cho frontend truy vấn hồ sơ chỉ bằng số điện thoại mà
    không có kiểm soát phía máy chủ.
-   [x] Không đưa service-role key hoặc bí mật máy chủ vào frontend.
-   [x] Không coi số điện thoại chưa xác minh là bằng chứng chắc chắn về
    quyền sở hữu.
-   [x] Không cho xem lịch sử đơn/lịch hẹn riêng tư chỉ bằng số điện
    thoại.
-   [x] Kiểm thử truy cập trực tiếp qua API, không chỉ kiểm tra giao
    diện.

**Gate GĐ-03:** API xử lý đúng khách, bé cưng và giao dịch; quyền truy
cập được kiểm soát phía máy chủ.

## 7. GĐ-04 --- Sửa giao diện và kết nối API

**Ưu tiên: P1 --- Sau khi API ổn định.**

Chuẩn bị local 27/10: [lớp gọi API chung](docs/verification/sync/guest-stock-and-browser-client.md) đã có trong `scripts/shared/guest-commerce-client.mjs`, chưa import vào màn hình. Không gọi mạng khi import, gom bootstrap cùng tab, dùng Web Locks điều phối cookie giữa các tab, gom thao tác ghi cùng mã và payload đang chạy, không tự retry sau lỗi mạng; không lưu token/contact/receipt vào storage. Mười test client chạy bằng transport/locks giả lập PASS trong bộ 60 test Node. Chưa kiểm chứng Web Locks trên trình duyệt thực hoặc nối cart/checkout/booking, vì vậy chưa đánh các mục giao diện bên dưới.

### 7.1. Màn hình khách vãng lai

Cập nhật luồng tra cứu 27/10: [nút từ receipt đến lịch được phép xem](docs/verification/sync/guest-stage4-booking-lookup.md). Nút truyền đúng ID lịch, không đưa phone/token lên URL. Panel dùng cookie server để đọc receipt; có cập nhật thủ công, không polling hoặc phone/history fallback. Luồng tạo spa → nút tra cứu → receipt/refresh qua UI/HTTP/SQL thật trong rollback PASS (một pet/một lịch, còn 0 fixture); phiên mới không có binding nhận 401 và không hiện dữ liệu. UI trạng thái/chuyển tài khoản dùng intercept riêng, 77 test Node PASS. Không thay hoặc nghiệm thu tra cứu lịch sử qua phone/OTP khi đã mất phiên, không commit hai portal/phát hành.

Cập nhật tiếp 27/10: [đặt lịch guest đã nối local](docs/verification/sync/guest-stage4-booking-ui.md). Playwright → HTTP bridge → SQL Cloud thật trong transaction rollback: lưu bé, quote spa, tạo lịch, receipt và reload PASS; một pet/một lịch thử đã rollback, còn 0 dòng fixture. Catalog/giống đọc thật khi chưa đăng nhập. Hotel/taxi/mobile và bốn trạng thái receipt kiểm tra UI riêng có intercept; 72 test Node PASS. Không migration, không commit nghiệp vụ/Realtime hai portal hoặc phát hành. Các mốc “booking UI chưa nối” phía trên là lịch sử trước đợt này.

Cập nhật 27/10: [giỏ và checkout guest đã nối local](docs/verification/sync/guest-stage4-shop-ui.md). Nút thêm giỏ từ sản phẩm, giỏ nhiều phân loại, số lượng/reload và checkout không đăng nhập đã kiểm tra bằng Playwright/catalog thật; báo giá gọi Cloud thật. Hai tab thật dùng chung cookie qua Web Locks và không mất cộng số lượng. UI thành công/dọn giỏ/reload dùng create/receipt giả lập, **chưa nghiệm thu đơn committed hai portal**, giao diện booking và tra cứu vẫn chưa nối. Bộ local 68 test Node PASS. Mốc “chưa import vào màn hình” ở phần chuẩn bị phía trên được thay bởi cập nhật này, không đóng toàn bộ GĐ-04.

-   [x] Thay nhánh khởi tạo phone/OTP browser cũ trong `pages/public/return-guest/return-guest.js` bằng tra cứu receipt qua cookie hoặc mã riêng. Form phone cũ ẩn sẵn; thành viên có link vào tài khoản. Chưa phát hành.
-   [x] Tra cứu có trạng thái đang tải/tìm thấy/mã sai hoặc hết hạn/không tìm thấy và lỗi kết nối; chỉ tìm từng giao dịch, không phân giải hồ sơ theo phone. Chrome module và HTTP/SQL kiểm riêng, luồng booking mất cookie đã chạy SQL thật trong rollback.
-   [x] Danh sách bé được phiên cho phép được chọn ở bước đầu booking, không lộ danh sách qua mã receipt; hai bé trùng tên vẫn khác ID. Kiểm thử UI/SQL rollback, chưa Auth/commit hai portal.
-   [x] Thêm bé và tự chọn sau lưu ở booking; kiểm thử UI → HTTP → Cloud SQL rollback PASS.
-   [x] Receipt/pet/profile chỉ đọc theo binding phiên hoặc mã riêng của giao dịch; phone/mã công khai không đủ quyền. Test tamper/foreign owner/browser-role deny PASS, chưa nghiệm thu toàn app legacy.
-   [x] Nhánh guest local của đặt lịch và mua hàng không tự chuyển sang đăng nhập/OTP; Playwright kiểm tra shop và booking spa. Không thay cơ chế tra cứu lịch sử riêng.

### 7.2. Đặt lịch

Cập nhật V1.22 ngày 27/10: [lỗi theo trường ở bước chọn lịch](docs/verification/sync/guest-stage4-schedule-validation.md). Chặn giờ quá khứ/thứ tự giờ sai, phòng chưa chọn ID, địa chỉ trắng/quá dài, quãng đường sai và ghi chú quá dài trước quote; lỗi/ARIA/focus ở đúng ô, taxi một chiều xóa giờ về cũ. Chrome module thật và hồi quy múi giờ UTC/Los Angeles/Tokyo PASS, bốn test liên quan PASS. Không Cloud/migration/push/deploy. Máy chủ vẫn kiểm tra giá/chỗ và thời lượng; lỗi nghiệp vụ quote/create chưa nghiệm thu theo trường.

- [x] Validation local bước chọn lịch spa/hotel/taxi hiện lỗi đúng ô và không gọi quote khi dữ liệu sai; sửa/chọn lại xóa lỗi, đổi một chiều bỏ lỗi giờ về; payload giữ giờ Việt Nam. Kiểm thử module thật offline PASS, chưa Auth/commit hai portal.

Cập nhật V1.21 ngày 27/10: [lỗi theo trường ở form thêm bé guest](docs/verification/sync/guest-stage4-pet-validation.md). Lỗi hiện dưới ô, liên kết ARIA và focus ô sai đầu tiên; dữ liệu sai không gửi API, lỗi lưu giữ form/request ID. Chrome module thật với transport fixture PASS; hai test context và syntax PASS. Không gọi Cloud/migration hoặc push/deploy; không đóng mục lỗi toàn bộ đặt lịch vì các nhánh lịch/phòng/taxi và API còn cần kiểm tra.

- [x] Form thêm bé guest local hiển thị lỗi tên/contact/giống/cân nặng/ghi chú tại ô tương ứng, sửa lại xóa lỗi; thử lưu thất bại giữ nội dung và thử lại cùng mã. Kiểm thử Chrome transport fixture PASS, chưa nghiệm thu lỗi máy chủ theo trường hoặc Auth thật.

-   [x] Nối và kiểm tra nhánh guest trong `pages/services/booking/booking.js`: spa, hotel và taxi khứ hồi đều quote/create/receipt qua UI→HTTP→Cloud SQL rollback. Spa có reload/tra cứu; chưa nghiệm thu hồi quy member hoặc giao dịch committed.
-   [x] API và form dùng Pet ID được phiên xác nhận: hai bé trùng tên vẫn khác ID, hotel lưu đúng bé được chọn trước đó; SQL kiểm tra owner/quan hệ và rollback. Nhiều bé cạnh tranh/đổi tài khoản Auth thật cần kiểm tra tiếp.
-   [x] Liên hệ của phiên được dùng lại khi thêm bé thứ hai, chọn bé đã lưu không bắt nhập lại cân nặng trước quote; kiểm tra hotel UI→SQL rollback với hai pet/một owner. Không coi phone nhập tay là quyền xem hồ sơ cũ.
-   [x] Cho phép thêm bé mới, sửa tên/giống/giới tính/cân nặng/dị ứng/lưu ý của bé đã lưu và sửa contact tự khai trong phiên; giữ ID, kiểm revision/retry và quyền owner. Migration 120/123 Cloud; UI/HTTP/SQL rollback PASS, không tự nâng phone thành số chính.
-   [x] Hiển thị lỗi validation local tại ô và reason code máy chủ đã biết tại giờ/phòng/lượt về; field lạ giữ thông báo chung. Chrome/HTTP PASS; không đánh là đã thử mọi lỗi production.
-   [x] Sau khi API xác nhận, đọc receipt máy chủ để hiển thị mã, giờ, tổng và trạng thái; spa UI→SQL rollback PASS, reload giữ mã cũ. Bốn nhãn trạng thái được kiểm tra bằng response intercept, chưa kiểm thử chuyển trạng thái committed qua Admin.
-   [x] Nút “Tra cứu lịch hẹn” mở đúng receipt trên trang tra cứu bằng cookie phiên; kiểm tra cả luồng spa→SQL rollback, cập nhật thủ công và từ chối phiên không có quyền. Mã lịch trên URL chỉ chọn đối tượng, không cấp quyền xem.

Đã có form thêm/sửa bé và tự chọn sau lưu; contact/breed/weight/health không được lưu trong browser storage. V1.24 đã nối API sửa bé/contact và gợi ý giờ/nhân viên theo quyền phiên; chỉ gọi slots khi bấm, tối đa 48 mốc, quote/create kiểm tra lại. Lỗi máy chủ có field code đã biết được gán về ô; các lỗi còn lại báo chung. Auth thật/commit/Realtime vẫn cần nghiệm thu.

Cập nhật V1.17 ngày 27/10: [hotel, taxi và nhiều bé qua UI/SQL thật](docs/verification/sync/guest-stage4-hotel-taxi-ui.md). Hotel 39 SQL/hai pet/một owner/một hotel booking; taxi 33 SQL/một pet/một trip khứ hồi. Đúng Pet ID, status pending và không payment; cả hai lượt kiểm tra deferred constraints rồi rollback, 0 fixture còn lại. Không dùng response fixture cho quote/create/receipt. Không commit/Realtime hoặc phát hành.

### 7.3. Giỏ hàng và checkout

- [x] Checkout committed qua UI thật: guest tạo một đơn, Admin đang mở nhận không reload, xác nhận rồi hủy; khách thấy cả hai trạng thái qua receipt/refresh. Giữ kho giải phóng, không payment succeeded hoặc xuất kho; fixture đã dọn. [V1.27](docs/verification/sync/guest-checkout-e2e-release-review.md).
- [x] Giỏ qua Auth thật A→B→A trên cùng browser: guest riêng 3 đơn vị, A=2, B=1, quay lại/reload A vẫn 2; SQL đối chiếu đúng owner. Không thay cho cạnh tranh ghi nhiều tab sau commit.

Cập nhật V1.23 ngày 27/10: [validation checkout và thử lại sau lỗi](docs/verification/sync/guest-stage4-checkout-validation.md). Checkout local có lỗi tại ô/ARIA/focus, chặn tên trắng/phone/địa chỉ/độ dài sai trước quote; nhận tại cửa hàng không giữ lỗi ở ô địa chỉ ẩn. Khóa kiểm tra đơn đến khi config/context sẵn sàng. Chrome module thật với API fixture PASS, 24 test giỏ/voucher/client PASS. Lỗi uncertain giữ form/giỏ/request ID, kiểm tra receipt trước retry cùng mã; chưa chứng minh cạnh tranh sau commit hoặc Auth/hai portal. Không Cloud/migration/push/deploy.

- [x] Validation local checkout guest hiện lỗi tại ô và không gửi quote khi dữ liệu sai; chặn thao tác trước khi tải xong cấu hình/context, đổi nhận tại cửa hàng bỏ lỗi địa chỉ ẩn. Chrome module thật/transport fixture PASS.
- [x] Kiểm tra hồi quy UI local lỗi create uncertain: giữ form/giỏ/mã, yêu cầu kiểm tra lại, dùng cùng mã sau receipt 404 và chỉ dọn giỏ khi receipt hợp lệ. API giả lập, không đánh nghiệm thu chống trùng committed.

Cập nhật 27/10: [checkout UI→SQL thật](docs/verification/sync/guest-stage4-sales-sql-ui.md) đã PASS trong transaction rollback, thay giới hạn “chỉ response giả lập” của đợt UI shop trước. Catalog là kết quả RPC anon thật với hai sản phẩm thử chưa commit, không sửa/khóa sản phẩm đang bán. Giao hàng/voucher/create/receipt/reload/retry tuần tự: một đơn, một dòng, một giữ kho, một payment pending, một redemption, còn 0 fixture sau rollback. Chưa kiểm thử cạnh tranh sau commit hoặc Admin/User Realtime.

-   [x] Nối và kiểm tra nhánh guest trong `pages/shop/cart/cart.js`: thêm giỏ từ trang sản phẩm, hai phân loại riêng, số lượng/reload và mobile qua Playwright/catalog thật. Giỏ member giữ nhánh riêng; hồi quy đăng nhập member UI đầy đủ còn ở GĐ-05.
-   [x] Nối nhánh guest trong `pages/shop/checkout/checkout.js`: cấu hình nhận hàng/thanh toán, quote/voucher/create/receipt/reload/retry đã kiểm tra UI→HTTP→SQL thật trong rollback. Lượt lỗi mạng UI trước dùng intercept riêng; chưa nghiệm thu tạo đơn committed.
-   [x] Giỏ và checkout dùng chung cookie/client guest, không lấy customer ID từ storage. Web Locks hai tab thật: hai bootstrap nhưng chỉ cấp một cookie, tab sau dùng lại; cart additions 2+3 giữ đủ 5.
-   [x] Giữ giỏ và voucher khi lỗi mạng 503 trước server rồi reload: giữ request ID, khôi phục mã theo đúng mode/dòng hàng và quote lại bằng SQL thật trước khi gửi. Không lưu contact/địa chỉ/giá trong bản nhớ. Các lỗi khác và commit cạnh tranh vẫn cần kiểm tra.
-   [x] “Mua ngay” từ nút product detail mở checkout guest, tạo đơn SQL thật trong rollback và giữ nguyên giỏ có sẵn; không kế thừa voucher của chế độ cart, chỉ dọn state buy-now sau receipt.
-   [ ] Không khôi phục giỏ nhầm khách khi đổi phiên, mở nhiều tab hoặc
    đổi tài khoản.
-   [x] Hủy kết quả guest đang bay và ghi giỏ đang chờ sau sự kiện đổi tài khoản, kể cả vòng guest→member→guest nhanh. Web Locks/storage hai tab thật PASS với trạng thái Auth giả lập; stale member không có Auth token bị RPC thật từ chối, không fallback giỏ guest. Chưa nghiệm thu đăng nhập/chuyển tài khoản Auth thật toàn luồng.
-   [ ] Không tạo đơn trùng khi gửi lại yêu cầu.
-   [x] UI chỉ báo thành công sau API tạo đơn và receipt hợp lệ: kiểm tra SQL thật trong rollback cho đơn pending/chưa thu tiền; giữ đúng sản phẩm không chọn và không lặp cleanup khi reload. Chưa nghiệm thu commit/Realtime hai portal.

**Gate GĐ-04:** Giao diện hoạt động xuyên suốt, không tạo cơ chế nhận
diện riêng cho từng màn hình.

Gate chưa đạt: đã nối shop/booking/receipt local và kiểm tra SQL rollback, gồm voucher sau lỗi 503/reload và buy-now. Đổi tài khoản, các lỗi khác, chống trùng cạnh tranh sau commit và hai portal tiếp tục để mở. Receipt trước binding đã giữ signed cookie/404 để thử lại cùng ID; token sai/hết hạn/thu hồi vẫn bị từ chối. Không áp dụng migration trong các đợt UI này.

Cập nhật V1.15 ngày 27/10: [khôi phục voucher và buy-now](docs/verification/sync/guest-stage4-checkout-recovery.md), 81 test Node PASS. Browser thử một 503 giả lập trước server; sau đó context/quote/create/receipt đều đi SQL Cloud thật trong rollback: 83 SQL, hai đơn/hai giữ kho/hai payment pending/một redemption, còn 0 fixture. Không sửa catalog đang bán, không commit/Realtime hoặc phát hành.

Cập nhật V1.16 ngày 27/10: [chặn tác vụ cũ qua lần đổi tài khoản](docs/verification/sync/guest-stage4-account-boundary.md), 83 test Node PASS. Thêm generation trong bộ nhớ chung cho client/cart; response ghi đến muộn được đánh dấu chưa rõ kết quả, không tự gửi lại. Test browser dùng event/storage/Web Locks thật nhưng Auth state và response ghi được giả lập; không coi là đăng nhập member thật. Luồng guest quote bình thường vẫn PASS qua API/Cloud đọc thật, không tạo đơn thử.

## 8. GĐ-05 --- Kiểm thử end-to-end

**Ưu tiên: P0 --- Bắt buộc trước triển khai.**

### 8.1. Kiểm thử nghiệp vụ

V1.25 đã kiểm một giao dịch spa committed; các dấu hoàn tất hẹp bên dưới không nghiệm thu checkout hoặc mọi loại dịch vụ.

- [x] Guest tạo bé/lịch spa không login/OTP qua UI thật, Admin xác nhận lịch và khách đọc đúng trạng thái sau commit; không payment. Đã dọn fixture, giữ audit.
- [x] Sửa bé và liên kết Auth fixture giữ ID; Admin nhận cập nhật tên bé/nhãn Thành viên qua Realtime sau sửa GUEST-RT-01. INSERT lịch mới sau bản sửa vẫn cần thử riêng.
- [x] A đăng nhập phone/mật khẩu thật thấy bé/lịch cũ; đăng xuất A rồi đăng nhập B trên cùng browser, B không thấy lịch A và bị chặn deep link. Không gửi OTP/SMS.

-   [ ] Khách lần đầu đặt lịch không đăng nhập/OTP.
-   [x] Khách lần đầu mua hàng không đăng nhập/OTP: V1.27 đã tạo đơn committed qua sản phẩm/giỏ/checkout thật, nhận tại cửa hàng, Admin xử lý, không thu tiền hoặc xuất kho; không nghiệm thu gateway thật.
-   [ ] Khách quay lại cùng trình duyệt và nhập cùng số điện thoại.
-   [x] Khách có nhiều bé cưng và chọn đúng Pet ID: hai bé cùng owner được chọn qua UI và tạo hai lịch committed riêng, SQL đối chiếu đúng pet/owner.
-   [x] Thêm bé thứ hai giữ bé/lịch đầu, không gộp hoặc ghi đè; kiểm thử V1.27 với hai Pet ID và hai Appointment ID riêng.
-   [x] Hai bé trùng tên/giống phân biệt đúng: card có mã riêng khi trùng, chọn đúng ID; hai INSERT thật đến Admin không reload sau sửa Realtime.
-   [ ] Hai yêu cầu đồng thời không tạo khách/giao dịch trùng.
-   [ ] Số điện thoại có định dạng khác nhau được chuẩn hóa nhất quán.
-   [ ] Số điện thoại trùng nhiều hồ sơ không tự động chọn/gộp sai.
-   [x] Phiên fixture hết hạn bị HTTP 401; sau end/revoke replay cookie ký thật ban đầu cũng 401. Chỉ ép expiry trên session QA, không đổi giờ server hoặc phiên khách thật.
-   [x] Pet/receipt của owner khác bị từ chối: browser khác cùng phone nhận 403/404 không dữ liệu; quote với foreign Pet ID cũng qua kiểm tra HTTP→SQL rollback. Không nới quyền browser.
-   [x] Cùng số tự khai không cấp quyền hồ sơ/lịch cũ: hai browser có owner riêng; test committed và bộ guard backend PASS. Đây là code local, chưa khẳng định deployment Vercel đã có bản vá.
-   [x] Đơn/lịch QA committed gắn đúng owner/Pet ID, đối chiếu Cloud trước dọn; không suy rộng thành kiểm toán mọi bản ghi production.
-   [ ] Checkout thất bại không mất giỏ hoặc tạo đơn nửa chừng.
-   [ ] Thành viên vẫn dùng được chức năng hiện có.
-   [x] Admin nhận đơn mới và hai INSERT lịch mới không reload; guest receipt đọc trạng thái sau Admin xác nhận/hủy, link Auth giữ ID. Không khẳng định mọi nhánh vận chuyển/thanh toán/đổi trả đã nghiệm thu.

### 8.2. Bằng chứng cho mỗi test

-   [ ] Ghi dữ liệu đầu vào và thao tác.
-   [ ] Kiểm tra giao diện và thông báo lỗi.
-   [ ] Kiểm tra Network/API response.
-   [ ] Đối chiếu dữ liệu trong Supabase.
-   [ ] Tải lại trang hoặc tạo phiên mới để kiểm tra tính nhất quán.
-   [ ] Kiểm thử quyền truy cập trực tiếp và RLS.
-   [ ] Lưu bug ID, bằng chứng và commit sửa.
-   [ ] Chỉ đánh dấu PASS khi test đã chạy thành công; nếu chưa chạy thì
    để NOT RUN/BLOCKED.

**Gate GĐ-05:** Tất cả test P0 đạt PASS hoặc có trạng thái tồn đọng rõ
ràng; không đánh dấu nghiệm thu khi chưa kiểm chứng.

## 9. GĐ-06 --- Triển khai và theo dõi

-   [ ] Review migration và toàn bộ code thay đổi.
-   [x] Review trong phạm vi guest: API/session/owner/quote/stock/cache/recovery và bằng chứng migration Cloud; 103 file syntax PASS, không private credential trong diff. Review/gom commit tổng thể vẫn mở vì có diff About/Blog riêng và các gate OTP/concurrency chưa đóng.
-   [x] Chạy hồi quy liên quan: 93 test Node, sáu bài Chrome, 33 kiểm tra/336 SQL rollback; metadata RPC/subscription PASS.
-   [x] Kiểm tra lỗi console/HTTP và dữ liệu giao dịch QA trên Cloud được người dùng cho phép; dọn fixture, giữ audit. Không Supabase Logs; staging/SMS/gateway thật không áp dụng theo phạm vi đã chốt.
-   [ ] Triển khai theo từng bước và có phương án khôi phục.
-   [ ] Theo dõi hồ sơ khách trùng, lỗi đặt lịch và lỗi checkout.
-   [ ] Kiểm tra phản hồi về việc nhập lại thông tin/chọn bé cưng.
-   [ ] Chỉ đóng công việc khi có bằng chứng nghiệm thu.

## 10. Thứ tự thực hiện

  -----------------------------------------------------------------------
  Giai đoạn               Công việc               Điều kiện
  ----------------------- ----------------------- -----------------------
  GĐ-00                   Khảo sát code, schema,  Bắt đầu ngay
                          RLS

  GĐ-01                   Chốt nghiệp vụ và quy   Sau khi hiểu luồng hiện
                          tắc nhận diện           tại

  GĐ-02                   Thiết kế/migration      Sau GĐ-00 và GĐ-01
                          database

  GĐ-03                   API và bảo mật          Sau khi chốt cấu trúc
                                                  dữ liệu

  GĐ-04                   Giao diện               Sau khi API ổn định

  GĐ-05                   Kiểm thử E2E            Sau tích hợp

  GĐ-06                   Triển khai              Sau nghiệm thu
  -----------------------------------------------------------------------

## 11. Tiêu chí hoàn thành toàn bộ

-   [ ] Khách đặt lịch và mua hàng không cần đăng nhập/OTP.
-   [ ] Khách quay lại có thể chọn bé cưng phù hợp hoặc thêm bé mới.
-   [ ] Không phát sinh hồ sơ trùng trong các tình huống đã được thiết
    kế để chống trùng.
-   [ ] Không có quan hệ sai giữa khách hàng, thú cưng, lịch hẹn và đơn
    hàng.
-   [ ] Không có lỗ hổng truy cập dữ liệu riêng tư qua API.
-   [ ] Luồng thành viên và Admin không bị ảnh hưởng.
-   [ ] Migration, code và kết quả test có bằng chứng.
-   [ ] Có hướng dẫn rollback và danh sách lỗi còn tồn đọng.

## 12. Quy tắc triển khai

1.  Hoàn thành và xác minh từng giai đoạn trước khi chuyển bước.
2.  Không chạy migration lớn hoặc sửa nhiều module cùng lúc khi chưa
    biết nguyên nhân.
3.  Không tự đánh dấu checklist là hoàn thành nếu chưa chạy test.
4.  Không sửa module ngoài phạm vi nếu chưa xác định tác động và thống
    nhất.
5.  Ưu tiên tận dụng schema/API hiện có; chỉ bổ sung bảng/cột/ràng buộc
    khi có bằng chứng cần thiết.
6.  Giữ riêng cơ chế tra cứu đơn/dịch vụ với luồng đặt lịch/mua hàng.
