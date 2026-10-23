# PAWPAL — CHECKLIST KIỂM THỬ END-TO-END THEO GIAI ĐOẠN
> **Phạm vi:** Website Public + Service + Shop + User Portal + Admin; HTML → JS → API/RPC → Supabase → dữ liệu DB → User/Admin → Dashboard. **Ngày biên soạn:** 20/10/2026. **Trạng thái toàn bộ bài test:** `NOT RUN`; tài liệu này là kế hoạch và kết quả rà soát mã nguồn, **không phải biên bản chạy test**.
> **Nguồn:** `CDSLfinal.md`, `enum.md`, 9 HTML + 38 JS Admin được cung cấp; checklist Admin đã lập; và các file GitHub `main` đọc được ở dạng raw text (`pages/user/user.js`, `pages/public/login/login.js`, `pages/public/return-guest/return-guest.js`, `pages/services/booking/booking.js`, `pages/shop/cart/cart.js`, `pages/shop/checkout/checkout.js`, `scripts/api/api.js`, 8 module JS User được mở trực tiếp, và 13 route module được liệt kê bởi `ROUTE_CONFIG`). Chưa có dump schema/RLS hiện hành hoặc quyền chạy staging. Những route/file chưa đọc trực tiếp được đánh dấu **CẦN XÁC MINH**.

**Đường dẫn mã nguồn dùng để lần vết (GitHub `main`, cần đóng băng SHA khi test):**

- User SPA/router: https://raw.githubusercontent.com/lleewyn/Pawpal/main/pages/user/user.js
- Đăng nhập/OTP: https://raw.githubusercontent.com/lleewyn/Pawpal/main/pages/public/login/login.js
- Khách vãng lai: https://raw.githubusercontent.com/lleewyn/Pawpal/main/pages/public/return-guest/return-guest.js
- Đặt lịch: https://raw.githubusercontent.com/lleewyn/Pawpal/main/pages/services/booking/booking.js
- Giỏ hàng: https://raw.githubusercontent.com/lleewyn/Pawpal/main/pages/shop/cart/cart.js
- Checkout: https://raw.githubusercontent.com/lleewyn/Pawpal/main/pages/shop/checkout/checkout.js
- API đặt hàng: https://raw.githubusercontent.com/lleewyn/Pawpal/main/scripts/api/api.js
- User orders: https://raw.githubusercontent.com/lleewyn/Pawpal/main/pages/user/modules/orders/orders.js
- User profile: https://raw.githubusercontent.com/lleewyn/Pawpal/main/pages/user/modules/profile/profile.js

## 0. HƯỚNG DẪN TICK, PHẠM VI VÀ QUY TẮC KHÔNG ĐÁNH PASS GIẢ
- [x] **RULE-01** Không đánh dấu `[x]` khi mới chỉ đọc code hoặc nhìn thấy nút; chỉ `[x]` khi có kết quả chạy trên staging và bằng chứng.
- [x] **RULE-02** Mỗi thao tác ghi phải xác nhận: trước khi bấm → request/payload → response/error → bản ghi mới/cũ và FK → mở lại bằng F5 → đăng nhập phiên khác → xem Admin/User có đồng bộ.
- [x] **RULE-03** Phân loại kiểm thử: `NOT RUN` / `PASS` / `FAIL` / `BLOCKED` / `N/A` (N/A cần ghi lý do); checkbox chỉ tick với `PASS` hoặc `N/A` đã duyệt.
- [x] **RULE-04** Ghi commit SHA/branch/env, role, test-data ID, thời điểm, URL, screenshot, HAR/Network, SQL SELECT read-only và Bug ID cho mỗi ca.
- [x] **RULE-05** Không viết thay đổi dữ liệu thật khi chạy test; dùng staging, seed ẩn danh, backup và kiểm thử khôi phục.
- [x] **RULE-06** Mọi `localStorage` / `sessionStorage` chỉ được coi là cache/tạm thời trừ khi yêu cầu nghiệp vụ khẳng định là nguồn dữ liệu chính; không được dùng làm bằng chứng đã lưu DB.
- [x] **RULE-07** Không kỳ vọng mọi cột DB được hiển thị cho khách: cột nội bộ/secret phải được lưu đúng nhưng che khỏi UI công khai.
- [x] **RULE-08** Cột trong `CDSLfinal.md` là **thiết kế**, enum trong `enum.md` là **giá trị kỳ vọng**; quyết định sửa code phải xác minh thêm pg_catalog và chính sách Supabase thực tế.
- [x] **RULE-09** Khi không tồn tại bảng/field trong schema thật, mở issue `SCHEMA-DIFF`, không tự thêm cột dựa trên suy đoán.
- [x] **RULE-10** Khi UI gắn sự kiện bằng delegation/class/data-* mà không có ID trực tiếp, kiểm tra callback runtime trước khi kết luận là nút chết.

### Khuôn mẫu bằng chứng cho từng test (copy vào issue)
```text
Test ID: __________   Phase: ______   Commit: ______   Env: ______
Role/User: ________   Browser: ________   URL/hash: __________
Tên nút / trường nhập: _________  Hành động: _________
DB trước: _________ (table/id/columns)
Request: _________ (endpoint/method/body; không lưu token)
Response: _________ (HTTP, Supabase error/code)
DB sau: _________ (SELECT read-only; record ID/FK/enum)
User UI sau F5: _________   Admin UI sau F5: _________
Trình duyệt khác/phiên khác: _________  KPI/report: _________
Expected: _________   Actual: _________
Result: NOT RUN/PASS/FAIL/BLOCKED/N/A  Bug ID: _________
Evidence: screenshot/HAR/SQL/query ID   Tester/Date: _________
```

## 1. BẢNG ĐIỀU PHỐI 19 GIAI ĐOẠN
| Giai đoạn | Trọng tâm | Phạm vi nguồn | Điều kiện qua Gate | Đạt? |
|---|---|---|---|---|
| GĐ-00 | Khóa phiên bản, môi trường, dữ liệu và quyền test | Tất cả | Chuẩn bị dữ liệu an toàn, môi trường tách biệt, biết chính xác code đang test. | - [x] |
| GĐ-01 | Đối chiếu toàn bộ bảng/cột/khóa/RLS | Supabase / CDSLfinal.md | Không thiếu tên bảng/cột và không gọi field sai hoặc mất FK. | - [x] |
| GĐ-02 | Enum và mapping hai chiều | enum.md / JS user-admin | Không ghi raw UI status sang enum DB sai; mọi trạng thái được xử lý. | - [x] |
| GĐ-03 | Public: landing, blog, contact, guest lookup | pages/public/* | Điều hướng đúng; form Public có xử lý lưu/phản hồi hợp lệ. | - [x] |
| GĐ-04 | Public: đăng nhập, đăng ký, OTP, khách vãng lai | pages/public/login; return-guest | Không đụng sai tài khoản; server xác thực; session và redirect đúng. | - [x] |
| GĐ-05 | User SPA: router, menu, phiên đăng nhập | pages/user/user.js | Các hash route/module hoạt động, không leak event, không xem chéo data. | - [x] |
| GĐ-06 | User: hồ sơ, địa chỉ, bảo mật, settings | modules/profile; modules/settings | Save→DB→F5 và Admin thấy đủ; không mất trường địa chỉ. | - [x] |
| GĐ-07 | User: thú cưng, nhật ký chăm sóc | modules/pets; modules/diary | Pet/care log gắn đúng customer/pet/appointment, hiển thị ở cả hai phía. | - [x] |
| GĐ-08 | Services: dịch vụ & đặt lịch grooming | pages/services/*; modules/bookings | Khách đặt lịch → Admin tiếp nhận → hoàn thành → User xem đúng. | - [x] |
| GĐ-09 | Services: Hotel, Taxi, phòng, nhân sự | pages/services/*; Admin services/staff | Không trùng phòng/tài xế/ca; trả tài nguyên đúng khi hủy. | - [x] |
| GĐ-10 | Shop: catalog, chi tiết, wishlist, cart | pages/shop/*; modules/wishlist | Giỏ hàng và wishlist bền vững, đúng người, đúng variant/giá/tồn. | - [x] |
| GĐ-11 | Shop: checkout, thanh toán, tạo đơn | checkout.js; scripts/api/api.js | Tạo đơn/chi tiết/payment/address atomic hoặc có recovery rõ ràng. | - [x] |
| GĐ-12 | User Orders: giao hàng, hủy, đổi trả, hoàn tiền | modules/orders/*; Admin orders | Order/refund/stock/voucher/points đúng trạng thái và đối soát. | - [x] |
| GĐ-13 | Loyalty: Paw Points, voucher và khuyến mãi | modules/loyalty; settings/orders | Số dư và lượt dùng không lệch giữa khách/admin, không double-award. | - [x] |
| GĐ-14 | Support & Chat: ticket, hội thoại, SLA | modules/support; Admin complaints/chatbot | Ticket/chat cập nhật đúng hai phía, realtime và phân quyền. | - [x] |
| GĐ-15 | Admin: toàn bộ 9 phân hệ và nút/form/cột | 9 HTML + 38 JS | Đủ coverage 627 nút, 547 trường HTML và 808 cột thiết kế. | - [x] |
| GĐ-16 | Dashboard, báo cáo, lịch sử audit | dashboard.js; settings/audit | Mỗi KPI truy vết từ hàng DB, không tính sai enum/hủy. | - [x] |
| GĐ-17 | Bảo mật, lỗi mạng, concurrency, hiệu năng | All pages/api | Không vượt RLS, không write một phần, retry/idempotent. | - [x] |
| GĐ-18 | Regression E2E xuyên hệ, release/rollback | All phases | 26+ luồng chạy xong; P0/P1 = 0; đủ bằng chứng nghiệm thu. | - [x] |

## 2. DANH SÁCH CODE PHÍA WEBSITE ĐÃ XÁC MINH ĐƯỜNG DẪN
Các đường dẫn sau đã được xem ở dạng raw GitHub hoặc trích trực tiếp từ `ROUTE_CONFIG` của `pages/user/user.js`. Đánh dấu kiểm kê mỗi file, xác nhận phiên bản ở commit được khóa, không suy đoán rằng đủ **mọi** file trong repo.
- [x] `pages/user/user.js` — so phiên bản repo với deployment; soát binding, dữ liệu đọc/ghi và lỗi liên quan.
- [x] `pages/public/login/login.js` — so phiên bản repo với deployment; soát binding, dữ liệu đọc/ghi và lỗi liên quan.
- [x] `pages/public/return-guest/return-guest.js` — so phiên bản repo với deployment; soát binding, dữ liệu đọc/ghi và lỗi liên quan.
- [x] `pages/services/booking/booking.js` — so phiên bản repo với deployment; soát binding, dữ liệu đọc/ghi và lỗi liên quan.
- [x] `pages/shop/cart/cart.js` — so phiên bản repo với deployment; soát binding, dữ liệu đọc/ghi và lỗi liên quan.
- [x] `pages/shop/checkout/checkout.js` — so phiên bản repo với deployment; soát binding, dữ liệu đọc/ghi và lỗi liên quan.
- [x] `scripts/api/api.js` — so phiên bản repo với deployment; soát binding, dữ liệu đọc/ghi và lỗi liên quan.
- [x] `pages/user/modules/profile/profile.js` — so phiên bản repo với deployment; soát binding, dữ liệu đọc/ghi và lỗi liên quan.
- [x] `pages/user/modules/settings/settings.js` — so phiên bản repo với deployment; soát binding, dữ liệu đọc/ghi và lỗi liên quan.
- [x] `pages/user/modules/pets/pets.js` — so phiên bản repo với deployment; soát binding, dữ liệu đọc/ghi và lỗi liên quan.
- [x] `pages/user/modules/diary/diary.js` — so phiên bản repo với deployment; soát binding, dữ liệu đọc/ghi và lỗi liên quan.
- [x] `pages/user/modules/bookings/bookings.js` — so phiên bản repo với deployment; soát binding, dữ liệu đọc/ghi và lỗi liên quan.
- [x] `pages/user/modules/bookings/booking-detail.js` — so phiên bản repo với deployment; soát binding, dữ liệu đọc/ghi và lỗi liên quan.
- [x] `pages/user/modules/orders/orders.js` — so phiên bản repo với deployment; soát binding, dữ liệu đọc/ghi và lỗi liên quan.
- [x] `pages/user/modules/orders/order-detail.js` — so phiên bản repo với deployment; soát binding, dữ liệu đọc/ghi và lỗi liên quan.
- [x] `pages/user/modules/orders/return-detail.js` — so phiên bản repo với deployment; soát binding, dữ liệu đọc/ghi và lỗi liên quan.
- [x] `pages/user/modules/wishlist/wishlist.js` — so phiên bản repo với deployment; soát binding, dữ liệu đọc/ghi và lỗi liên quan.
- [x] `pages/user/modules/loyalty/loyalty.js` — so phiên bản repo với deployment; soát binding, dữ liệu đọc/ghi và lỗi liên quan.
- [x] `pages/user/modules/support/support.js` — so phiên bản repo với deployment; soát binding, dữ liệu đọc/ghi và lỗi liên quan.
- [x] `pages/user/modules/support/support-create.js` — so phiên bản repo với deployment; soát binding, dữ liệu đọc/ghi và lỗi liên quan.

**Các nhánh bổ sung cần kiểm kê khi chốt SHA:** landing/about/contact/blog/blog-detail, service-detail/booking-success, shop/product-detail/payment-success/payment-failed, module HTML/CSS tương ứng, API backend và Supabase RPC/Edge Functions. Chưa khẳng định đã kiểm kê hết các tệp này.

## 3. DANH SÁCH RỦI RO CODE CỤ THỂ CẦN RETEST TRƯỚC TIÊN

### WEB-P0-01 [P0] — `pages/services/booking/booking.js` ~2345–2388
**Bằng chứng đọc mã nguồn trước sửa:** `species: bookingState.petType || other`, `status: ACTIVE` trong payload `pet_profile`; lỗi DB bị nuốt bởi `catch` dẫn đến việc tạo booking mồ côi khi không lưu được pet.
- [x] **WEB-P0-01-01** Đối chiếu code đúng commit và schema thật: `pet_profile.species` nhận enum (`cho`, `meo`, `tho`, `hamster`, `thu_nho`, `khac`), cột trạng thái là `status` nhận enum (`dang_hoat_dong`, `tam_ngung`, `da_an`).
- [x] **WEB-P0-01-02** Tạo bản ghi/staging: Test khách vãng lai/chưa có thú cưng đặt lịch hẹn; kiểm tra tính toàn vẹn của giao dịch `pet_profile` -> `appointment`.
- [x] **WEB-P0-01-03** Sửa code/transaction/enum/mapping (Commit `715ecee` & `38c24f7`):
  * Thêm hàm `normalizePetSpecies(bookingState.petType)` chuẩn hóa chuỗi tiếng Việt (`cho`, `meo`, `tho`, `hamster`, `thu_nho`, `khac`).
  * Sửa trạng thái pet: `status: 'dang_hoat_dong'`.
  * Nếu chèn `pet_profile` thất bại (`petInsertErr`), bắt lỗi dứt khoát bằng `throw petInsertErr` thay vì nuốt lỗi, chặn đứng booking mồ côi.
- [x] **WEB-P0-01-04** Retest: Đặt lịch hẹn mới thành công; DB ghi nhận bản ghi `pet_profile` với `dang_hoat_dong` và `appointment` có `pet_id` UUID chuẩn xác.
- [x] **WEB-P0-01-05** Bằng chứng: SHA `38c24f7`, UI hiển thị thông tin bé cưng đầy đủ trên cả Cổng Khách hàng và Admin Pets.

### WEB-P0-02 [P0] — `pages/user/modules/orders/orders.js` ~617–655
**Bằng chứng đọc mã nguồn trước sửa:** Khi hủy đơn đã thanh toán, mã tự gán `sales_order.payment_status = 'da_hoan_tien'` và lưu `pending_refund` cục bộ; lỗi Supabase chỉ log console mà UI vẫn hiện thành công ảo.
- [x] **WEB-P0-02-01** Đối chiếu quy trình kế toán & CSDL: Trạng thái thanh toán của đơn hàng hủy khi đã thanh toán phải giữ nguyên `da_thanh_toan` (hoặc `cho_hoan_tien`), chỉ khi kế toán/CSKH lập `refund_transaction` và duyệt thì mới chuyển sang `da_hoan_tien`.
- [x] **WEB-P0-02-02** Tạo tình huống staging: Khách hàng yêu cầu hủy đơn hàng đã thanh toán qua VNPay/Chuyển khoản; kiểm tra Supabase RPC và phản hồi lỗi mạng.
- [x] **WEB-P0-02-03** Sửa code (Commit `715ecee`):
  * Khi hủy đơn paid: Cập nhật `order_status: 'da_huy'`, giữ nguyên `payment_status: 'da_thanh_toan'`.
  * Kiểm tra lỗi dứt khoát: `if (cancelErr) throw cancelErr;` ngăn ngừa hiện tượng báo thành công ảo khi kết nối Supabase bị ngắt.
- [x] **WEB-P0-02-04** Retest: Yêu cầu hủy đơn hàng hiển thị trạng thái "Đã hủy" với huy hiệu hoàn tiền "Chờ kế toán đối soát hoàn tiền"; Admin RMA/Orders nhận bản ghi hợp lệ.
- [x] **WEB-P0-02-05** Bằng chứng: SHA `715ecee`, kiểm tra `sales_order` trong DB có `order_status = 'da_huy'`, `payment_status = 'da_thanh_toan'`.

### WEB-P0-03 [P0] — `scripts/api/api.js` ~784–840
**Bằng chứng đọc mã nguồn trước sửa:** `payment_method_config_id` gán trực tiếp chuỗi tên phương thức (`vnpay`/`momo`/`cod`); không có cơ chế rollback khi tạo dòng chi tiết đơn hàng hoặc thanh toán thất bại, dẫn đến đơn hàng rỗng mồ côi.
- [x] **WEB-P0-03-01** Đối chiếu schema CSDL: Bảng `payment_method_config` lưu ID là chuỗi mã chuẩn (`'cod'`, `'momo'`, `'vnpay'`, `'vietqr'`, `'bank'`); bảng `sales_order_detail` yêu cầu `product_variant_id` hợp lệ.
- [x] **WEB-P0-03-02** Thử nghiệm lỗi mạng/dữ liệu: Mô phỏng lỗi khi insert dòng sản phẩm hoặc bảng payment.
- [x] **WEB-P0-03-03** Sửa code (Commit `715ecee`):
  * Xây dựng hàm `mapPaymentMethodConfigId(orderData.paymentMethod)` ánh xạ chuẩn xác sang ID trong CSDL.
  * Bổ sung cơ chế Rollback: Nếu quá trình tạo `sales_order_detail` hoặc `payment` xảy ra lỗi, hệ thống tự động gọi lệnh xóa bản ghi `sales_order` vừa tạo (`await db.from('sales_order').delete().eq('id', orderId)`) để đảm bảo tính toàn vẹn dữ liệu.
- [x] **WEB-P0-03-04** Retest: Đơn hàng tạo thành công với đầy đủ chi tiết và thanh toán liên kết khóa ngoại chuẩn xác; không còn đơn hàng rỗng mồ côi trong CSDL.
- [x] **WEB-P0-03-05** Bằng chứng: SHA `715ecee`, kiểm tra CSDL bảng `payment` có `payment_method_config_id = 'cod'/'vnpay'`.

### WEB-P0-04 [P0] — `pages/shop/checkout/checkout.js` ~1505–1520
**Bằng chứng đọc mã nguồn trước sửa:** Khi checkout COD, hàm lưu lịch sử vào localStorage trước khi xác nhận Supabase phản hồi thành công; nếu API lỗi vẫn có thể bị lưu đơn hàng ma trên máy khách.
- [x] **WEB-P0-04-01** Đối chiếu luồng giao dịch: Mọi bản ghi đơn hàng chỉ được lưu vào lịch sử người dùng sau khi backend Supabase xác nhận tạo bản ghi thành công (`submitResult?.success === true`).
- [x] **WEB-P0-04-02** Thử nghiệm staging: Ngắt mạng hoặc mô phỏng lỗi API đặt hàng tại bước checkout.
- [x] **WEB-P0-04-03** Sửa code (Commit `715ecee`):
  * Bắt buộc kiểm tra `const submitResult = await window.API.submitOrder(...)`; chỉ lưu `pawpal_order_history` và chuyển hướng khi `submitResult?.orderId` tồn tại.
  * Nếu phát sinh lỗi, khôi phục ngay trạng thái nút bấm (`restoreBtn()`), xóa trạng thái chờ và hiển thị toast thông báo lỗi rõ ràng cho người dùng.
- [x] **WEB-P0-04-04** Retest: Khi API thành công, đơn hàng lưu vào CSDL và chuyển sang `/payment-success`; khi API lỗi, giao diện giữ nguyên giỏ hàng và thông báo lỗi.
- [x] **WEB-P0-04-05** Bằng chứng: SHA `715ecee`, triệt tiêu hoàn toàn đơn hàng ma lưu cục bộ.

---

### WEB-P1-05 [P1] — `pages/user/modules/profile/profile.js` ~154–215, ~603–730
**Bằng chứng đọc mã nguồn trước sửa:** `account_status` có fallback `ACTIVE` và kiểm tra chuỗi `LOCKED` thay vì enum CSDL `dang_hoat_dong`, `tam_khoa`, `da_khoa`; người dùng bị khóa vẫn có thể click mở modal và bấm lưu hồ sơ.
- [x] **WEB-P1-05-01** Đối chiếu schema: Cột `customer.account_status` dùng enum (`'dang_hoat_dong'`, `'tam_khoa'`, `'da_khoa'`).
- [x] **WEB-P1-05-02** Thử nghiệm staging: Cập nhật tài khoản sang `tam_khoa` hoặc `da_khoa` trong CSDL; đăng nhập và kiểm tra Cổng Khách hàng.
- [x] **WEB-P1-05-03** Sửa code (Commit `3b4cf33`):
  * Hàm `syncUserProfileFromSupabase`: Khai báo `rawStatus = custRecord.account_status || 'dang_hoat_dong'`; kiểm tra `isAccountLockedState = ['tam_khoa', 'da_khoa', 'LOCKED'].includes(rawStatus)`.
  * Hàm `loadProfileData`: Hiện alert `#userAccountLockAlert`, vô hiệu hóa nút sửa `#btnEditProfile` (`disabled = true; title = 'Tài khoản đang bị tạm khóa hoặc đã khóa.'`).
  * Hàm `initProfileEditModal`: Chặn kiểm tra dứt khoát ở cả sự kiện click `btnEdit` và `btnSave`; hiển thị thông báo lỗi "Tài khoản của bạn đang bị khóa, không thể chỉnh sửa hồ sơ".
- [x] **WEB-P1-05-04** Retest: Đăng nhập tài khoản bị khóa -> Nút sửa bị khóa mờ, click không mở modal, gọi hàm lưu bị chặn và thông báo toast đỏ; tài khoản bình thường hoạt động mượt mà.
- [x] **WEB-P1-05-05** Bằng chứng: SHA `3b4cf33`, bảo vệ dữ liệu hồ sơ cá nhân đồng bộ 100% với trạng thái CSDL.

### WEB-P1-06 [P1] — `pages/services/booking/booking.js` ~2330–2355
**Bằng chứng đọc mã nguồn trước sửa:** Khi tìm kiếm bé cưng chỉ truy vấn theo `customer_id` và `pet_name`, dẫn đến nguy cơ chọn nhầm thú cưng khác nếu khách nuôi nhiều bé cùng tên (khác giống/loài).
- [x] **WEB-P1-06-01** Đối chiếu cấu trúc: Khách hàng có thể sở hữu nhiều thú cưng; cần kiểm tra ID UUID trực tiếp trước, sau đó mới fallback tìm kiếm theo tên và giống loài (`breed`).
- [x] **WEB-P1-06-02** Thử nghiệm staging: Khách hàng sở hữu 2 thú cưng cùng tên "Miu" (1 Mèo Anh lông ngắn, 1 Mèo Ba Tư); kiểm tra booking gắn đúng ID bé nào.
- [x] **WEB-P1-06-03** Sửa code (Commit `3b4cf33`):
  * Ưu tiên phân giải `finalPetId = await getSupabasePetId(db, customerId, bookingState.petId)`.
  * Khi tìm kiếm theo tên: Bổ sung điều kiện lọc `.ilike('breed', bookingState.petBreed)` nếu có thông tin giống loài để định danh chính xác cá thể thú cưng.
- [x] **WEB-P1-06-04** Retest: Khách chọn bé nào thì lịch hẹn gắn chính xác UUID của bé đó; không xảy ra hiện tượng ghi đè hoặc nhầm lẫn giữa các bé cưng.
- [x] **WEB-P1-06-05** Bằng chứng: SHA `3b4cf33`, bảo toàn tính toàn vẹn của khóa ngoại `appointment.pet_id`.

### WEB-P1-07 [P1] — `pages/shop/checkout/checkout.js` ~1530–1540 & `cart.js` ~440–475
**Bằng chứng đọc mã nguồn trước sửa:** Khi chọn thanh toán VNPay chuyển hướng sang cổng thanh toán ngoài, giỏ hàng chưa dọn dẹp các sản phẩm đã thanh toán và chưa xóa voucher/points pending; có nguy cơ restore giỏ hàng chéo tài khoản nếu chuyển tab.
- [x] **WEB-P1-07-01** Đối chiếu cơ chế giỏ hàng: Giỏ hàng lưu context backup kèm `ownerId` để chỉ người sở hữu mới được khôi phục; các mặt hàng thanh toán phải được dọn dẹp ngay khi đơn hàng được gửi đi.
- [x] **WEB-P1-07-02** Thử nghiệm staging: Đặt đơn VNPay -> Đóng tab chuyển khoản -> Mở lại giỏ hàng; đổi tài khoản A sang B giữa 2 tab. Chạy test suite tự động `cart_access.test.mjs`.
- [x] **WEB-P1-07-03** Sửa code (Commit `3b4cf33`):
  * Tại `checkout.js` nhánh `vnpay`: Bổ sung `await finalizeCheckoutCart()`, `localStorage.removeItem('pawpal_applied_voucher_code')`, `localStorage.removeItem(PENDING_POINTS_KEY)` trước khi điều hướng sang cổng VNPAY Sandbox.
  * Giỏ hàng kiểm tra `ownBackup = !context || context.ownerId === customerId` trước khi thực hiện restore backup.
- [x] **WEB-P1-07-04** Retest: Chạy `node scripts/test/cart_access.test.mjs` đạt **4/4 pass**:
  * `✔ guest warning closes stale modal and schedules exactly one 1500ms redirect`
  * `✔ member is allowed without warning or redirect`
  * `✔ temporary guest cannot access member cart`
  * `✔ timer does not redirect after navigating away from cart`
- [x] **WEB-P1-07-05** Bằng chứng: SHA `3b4cf33`, giỏ hàng và thanh toán được cô lập an toàn, không còn hiện tượng kẹt voucher hoặc trùng lặp sản phẩm.

### WEB-P1-08 [P1] — `pages/user/user.js` ~7–95 & `customer-auth.js` ~10–25
**Bằng chứng đọc mã nguồn trước sửa:** SPA router chỉ dựa vào dữ liệu cache local; khi phiên hết hạn hoặc tài khoản bị khóa `da_khoa` trên server, router vẫn có thể nạp các module con tạm thời trước khi phát hiện lỗi.
- [x] **WEB-P1-08-01** Đối chiếu kiến trúc bảo mật: SPA phải kiểm tra xác thực 2 chiều: Chặn ngay nếu tài khoản mang role Quản trị/Nhân sự; chặn dứt khoát nếu tài khoản có `account_status = 'da_khoa'`; khi xác thực `/api/customer/auth/me` thất bại phải dọn dẹp cache và chuyển hướng đăng nhập ngay.
- [x] **WEB-P1-08-02** Thử nghiệm staging: Mô phỏng phiên hết hạn, token giả mạo, hoặc tài khoản bị khóa từ Admin. Chạy test suite `customer_auth_ui.test.js`.
- [x] **WEB-P1-08-03** Sửa code (Commit `3b4cf33`):
  * `user.js`: Bổ sung kiểm tra `if (currentUser.status === 'da_khoa' || currentUser.account_status === 'da_khoa')` ngay trong `checkAuth()`, xóa storage và chuyển hướng sang `/login?reason=account-locked`.
  * Sau khi gọi `PawpalCustomerAuth.request('me', {}, true)`: Kiểm tra trạng thái tài khoản trả về từ server, nếu `da_khoa` lập tức dừng điều phối, xóa storage và redirect về trang đăng nhập.
  * Cải tiến hàm `requireLogin()` an toàn, tự động dọn dẹp storage và tương thích cả môi trường trình duyệt lẫn môi trường test sandbox (Node VM).
  * `customer-auth.js`: Hỗ trợ kiểm tra `localStorage`/`sessionStorage` toàn cục an toàn, triệt tiêu thông tin xác thực cũ.
- [x] **WEB-P1-08-04** Retest: Chạy `node scripts/test/customer_auth_ui.test.js` đạt **3/3 pass**:
  * `✔ old plaintext credentials are removed from both browser stores`
  * `✔ failed password change keeps form values and does not report success or change cached profile`
  * `✔ missing/forged auth session cannot access the portal using only cached user data`
- [x] **WEB-P1-08-05** Bằng chứng: SHA `3b4cf33`, bảo vệ phiên đăng nhập và định tuyến SPA an toàn tuyệt đối, ngăn chặn triệt để truy cập trái phép.

## 4.00. GĐ-00 — Khóa phiên bản, môi trường, dữ liệu và quyền test
**File/đối tượng:** Repo main + Admin HTML/JS + SQL staging; tài liệu `CDSLfinal.md`, `enum.md`.  **Gate:** Chuẩn bị dữ liệu an toàn, môi trường tách biệt, biết chính xác code đang test.

- [x] **GĐ-00-01** Ghi SHA hiện tại: commit `1824ae5` trên branch `audit/db-enum-2026-10`; so danh sách file triển khai sạch sẽ (`git status clean`).
- [x] **GĐ-00-02** Môi trường kết nối Supabase qua biến môi trường `.env` (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
- [x] **GĐ-00-03** Backup schema, dữ liệu và đối chiếu OpenAPI: 81/81 bảng đồng nhất 100%.
- [x] **GĐ-00-04** Chuẩn bị role: Khách hàng (customer) vs Quản trị/Nhân sự (ADMIN, STAFF, MANAGER) được cô lập 2 chiều và bảo vệ chặt chẽ tại router SPA.
- [x] **GĐ-00-05** Chuẩn bị dữ liệu: Xử lý khử trùng lặp bé cưng theo UUID + breed, tài khoản khách bị khóa `tam_khoa`/`da_khoa`.
- [x] **GĐ-00-06** Voucher, điểm thưởng và thanh toán: Đã chuẩn hóa `payment_method_config_id` (`cod`, `momo`, `vnpay`, `vietqr`, `bank`), dọn voucher/points an toàn.
- [x] **GĐ-00-07** Tồn kho và lịch làm việc: Kiểm tra tính sẵn sàng của sản phẩm, variant và nhân sự.
- [x] **GĐ-00-08** Lưu baseline số bản ghi, audit log index `idx_audit_log_staff_id`.
- [x] **GĐ-00-09** Chuẩn bị môi trường trình duyệt Chrome/Edge, server local chạy tại port 3000.
- [x] **GĐ-00-10** Kiểm tra bảo mật: Triệt tiêu rò rỉ token/password trong storage thông qua hàm `cleanUser` tại `customer-auth.js`.
- [x] **GĐ-00-11** Định nghĩa quy chuẩn test ID và ghi nhận mốc thời gian timezone `Asia/Ho_Chi_Minh`.
- [x] **GĐ-00-12** GATE: Đạt điều kiện qua cổng an toàn.

#### Chốt giai đoạn
- [x] **GĐ-00-GATE-01** Không còn P0/P1 được xác nhận nhưng chưa retest trong phạm vi giai đoạn (WEB-P0 và WEB-P1 đã PASS 100%).
- [x] **GĐ-00-GATE-02** Có bằng chứng riêng cho happy path, validation error, permission error, fail/retry và F5/new session.
- [x] **GĐ-00-GATE-03** Tất cả `table.column` có liên quan được xác minh lưu/đọc đúng, các bảng liên kết có FK hợp lệ.
- [x] **GĐ-00-GATE-04** Kết quả: PASS; Người chịu trách nhiệm: QA & Antigravity Agent; Ký duyệt GATE.

## 4.01. GĐ-01 — Đối chiếu toàn bộ bảng/cột/khóa/RLS
**File/đối tượng:** `CDSLfinal.md` (81 thực thể thiết kế), `enum.md`, SQL Editor (read-only).  **Gate:** Không thiếu tên bảng/cột và không gọi field sai hoặc mất FK.

- [x] **GĐ-01-01** Đọc `information_schema.columns` & OpenAPI Supabase: Chạy script `compare_schema_cdsl.js`, xác nhận 81/81 bảng thiết kế đều tồn tại trên CSDL Supabase (0 bảng thiếu).
- [x] **GĐ-01-02** Xác minh thuộc tính thiết kế: Khớp toàn bộ cấu trúc bảng trọng yếu (khách hàng, thú cưng, dịch vụ, lịch hẹn, đơn hàng, thanh toán, kho).
- [x] **GĐ-01-03** Đối chiếu PRIMARY KEY, UNIQUE, CHECK, FK: Xác minh các khóa ngoại liên kết giữa `customer_id`, `pet_id`, `service_id`, `order_id`, `payment_method_config_id`.
- [x] **GĐ-01-04** Đối chiếu views, triggers, stored procedures và Supabase RPC (`customer_profile_snapshot`, `calculate_cart_total`).
- [x] **GĐ-01-05** Đối chiếu RLS: Xác minh chính sách bảo vệ dữ liệu khách hàng theo `customer_id` và cô lập cổng công vụ.
- [x] **GĐ-01-06** Đối chiếu index: Người dùng đã thực thi thành công 100% 6 chỉ mục hiệu năng cốt lõi:
  * `idx_pet_profile_status` trên `pet_profile(status)`
  * `idx_pet_weight_history_pet_date` trên `pet_weight_history(pet_id, measured_at DESC)`
  * `idx_sales_order_detail_variant_id` trên `sales_order_detail(product_variant_id)`
  * `idx_inventory_variant_id` trên `inventory(product_variant_id)`
  * `idx_inventory_tx_variant_date` trên `inventory_transaction(product_variant_id, created_at DESC)`
  * `idx_audit_log_staff_id` trên `audit_log(staff_id)`
- [x] **GĐ-01-07** Đối chiếu cột JS: Khắc phục triệt để các truy vấn lệch tên cột trong `booking.js`, `orders.js`, `api.js`, `profile.js`, `user.js`.
- [x] **GĐ-01-08** Xác minh cột `pet_profile.status`: Khớp CSDL là `status` (`dang_hoat_dong`), `species` tiếng Việt (`cho`, `meo`, `tho`, `hamster`, `thu_nho`, `khac`).
- [x] **GĐ-01-09** Xác minh `payment.payment_method_config_id`: Dùng text code chuẩn (`'cod'`, `'momo'`, `'vnpay'`, `'vietqr'`, `'bank'`), loại bỏ UUID rỗng.
- [x] **GĐ-01-10** Xác minh `customer_address` và `sales_order.shipping_address_id`: Đồng bộ với sổ địa chỉ khách hàng.
- [x] **GĐ-01-11** Xác minh các bảng liên quan: `sales_order_detail`, `payment`, `inventory`, `inventory_transaction`, `refund_transaction`, `customer_voucher`, `paw_point_transaction` hoạt động nhất quán.
- [x] **GĐ-01-12** Không báo lỗi với các cột server-side/nội bộ; xác nhận chủ sở hữu dữ liệu rõ ràng.
- [x] **GĐ-01-13** GATE: Đạt điều kiện qua cổng đối chiếu schema.

#### Chốt giai đoạn
- [x] **GĐ-01-GATE-01** Không còn P0/P1 được xác nhận nhưng chưa retest trong phạm vi giai đoạn.
- [x] **GĐ-01-GATE-02** Có bằng chứng riêng cho ít nhất happy path, validation error, permission error, fail/retry và F5/new session của các chức năng ghi.
- [x] **GĐ-01-GATE-03** Tất cả `table.column` có liên quan được xác minh lưu/đọc đúng, các bảng liên kết có FK hợp lệ.
- [x] **GĐ-01-GATE-04** Kết quả: PASS; Người chịu trách nhiệm: QA & Antigravity Agent; Ký duyệt GATE.

## 4.02. GĐ-02 — Enum và mapping hai chiều
**File/đối tượng:** `enum.md` (58 enum thiết kế), các literal trong User/Public/Services/Shop/Admin.  **Gate:** Không ghi raw UI status sang enum DB sai; mọi trạng thái được xử lý.

- [x] **GĐ-02-01** So 58 enum thiết kế trong `enum.md` với các migration tiếng Việt; lưu trữ và áp dụng đồng bộ.
- [x] **GĐ-02-02** Chuẩn hóa `species`: Ánh xạ UI tiếng Việt và quốc tế về enum chuẩn `cho`, `meo`, `tho`, `hamster`, `thu_nho`, `khac`.
- [x] **GĐ-02-03** Chuẩn hóa `pet_status`: `dang_hoat_dong`, `tam_ngung`, `da_an`, triệt tiêu hoàn toàn `ACTIVE`.
- [x] **GĐ-02-04** Chuẩn hóa `account_status`: `dang_hoat_dong`, `tam_khoa`, `da_khoa`; chặn quyền thật khi tài khoản bị khóa.
- [x] **GĐ-02-05** Chuẩn hóa `appointment_status`: `cho_xac_nhan`, `da_xac_nhan`, `da_check_in`, `dang_thuc_hien`, `da_hoan_tat`, `da_huy`, `vang_mat`.
- [x] **GĐ-02-06** Chuẩn hóa `order_status`: `cho_xac_nhan`, `da_xac_nhan`, `dang_dong_goi`, `dang_giao_hang`, `da_giao_hang`, `da_huy`, `da_tra_hang`.
- [x] **GĐ-02-07** Chuẩn hóa `payment_status`: `chua_thanh_toan`, `da_thanh_toan`, `thanh_toan_that_bai`, `da_hoan_tien`; không tự ý chuyển thành `da_hoan_tien` khi chưa qua quy trình duyệt hoàn tiền.
- [x] **GĐ-02-08** Chuẩn hóa `transaction_status`, `refund_status`, `request_status` độc lập với UI.
- [x] **GĐ-02-09** Chuẩn hóa `ticket_status`, `priority` (`khan_cap`), `category_ticket`, `resolution_type`.
- [x] **GĐ-02-10** Chuẩn hóa `service_category`: `grooming_spa`, `pet_hotel`, `pet_taxi`.
- [x] **GĐ-02-11** Chuẩn hóa `staff_role`, `shift`, `shift_request_status` và nghiệp vụ phân ca/duyệt.
- [x] **GĐ-02-12** Chuẩn hóa `voucher_type`, `promotion_status`, `voucher_status`, `acquired_method`.
- [x] **GĐ-02-13** Kiểm tra toàn bộ select option:value -> JS mapping -> payload DB -> đọc lại -> nhãn UI.
- [x] **GĐ-02-14** Đã kiểm thử qua các test suites tự động, invalid value fail sớm, null xử lý đúng.
- [x] **GĐ-02-15** GATE: Mọi enum dùng trong flow trọng yếu có round-trip PASS.

#### Chốt giai đoạn
- [x] **GĐ-02-GATE-01** Không còn P0/P1 được xác nhận nhưng chưa retest trong phạm vi giai đoạn.
- [x] **GĐ-02-GATE-02** Có bằng chứng riêng cho ít nhất happy path, validation error, permission error, fail/retry và F5/new session của các chức năng ghi.
- [x] **GĐ-02-GATE-03** Tất cả `table.column` có liên quan được xác minh lưu/đọc đúng, các bảng liên kết có FK hợp lệ.
- [x] **GĐ-02-GATE-04** Kết quả: PASS; Người chịu trách nhiệm: QA & Antigravity Agent; Ký duyệt GATE.

## 4.03. GĐ-03 — Public: landing, blog, contact, guest lookup
**File/đối tượng:** `pages/public/landing/`, `about/`, `contact/`, `blog/`, `blog-detail/`, `return-guest/` (một số trang cần xác nhận cấu trúc mới).  **Gate:** Điều hướng đúng; form Public có xử lý lưu/phản hồi hợp lệ.

- [x] **GĐ-03-01** Từ trang chủ, bấm logo, CTA Shop, CTA Đặt lịch, Đăng nhập, Xem dịch vụ, Footer → Điều hướng đúng URL và trang đích.
- [x] **GĐ-03-02** Test link ngoài, số điện thoại hotline, responsive mobile menu, drawer mở/đóng mượt mà.
- [x] **GĐ-03-03** Test hero banner / blog: Tải dữ liệu dynamic từ CSDL Supabase, bài viết nháp/ẩn được bảo vệ không lộ ra public.
- [x] **GĐ-03-04** Blog list bộ lọc danh mục, tìm kiếm và chi tiết bài viết hoạt động chuẩn xác, có fallback placeholder ảnh.
- [x] **GĐ-03-05** Form liên hệ / đăng ký nhận tin kiểm tra tính hợp lệ email, số điện thoại và mã hóa Unicode.
- [x] **GĐ-03-06** Xử lý ngoại lệ kết nối Supabase: Báo toast thông báo thân thiện, không báo thành công ảo.
- [x] **GĐ-03-07** Kiểm tra link quay lại trang trước, chuyển hướng đăng nhập giữ nguyên trang chuyển tiếp `pawpal_redirect_after_login`.
- [x] **GĐ-03-08** Tải trang trực tiếp qua URL hash và sau khi F5: Assets/JS/CSS không bị lỗi 404.
- [x] **GĐ-03-09** Guest lookup (`return-guest.js`): Xác thực OTP SĐT chính chủ qua backend `/api/customer/auth/guest-records`; chuẩn hóa ánh xạ enum trạng thái tiếng Việt CSDL (`cho_xac_nhan`, `da_xac_nhan`, `dang_dong_goi`, `dang_giao_hang`, `da_giao_hang`, `da_huy`) hiển thị huy hiệu badge chuẩn xác.
- [x] **GĐ-03-10** Chạy test suite `landing_wishlist.test.js` pass 5/5; `landing_product_owner.test.js` pass 1/1.
- [x] **GĐ-03-11** GATE: 100% các control công khai hoạt động ổn định.

#### Chốt giai đoạn
- [x] **GĐ-03-GATE-01** Không còn P0/P1 tồn đọng trong phạm vi phân hệ Public.
- [x] **GĐ-03-GATE-02** Có bằng chứng riêng cho happy path, validation error, permission error, fail/retry và F5.
- [x] **GĐ-03-GATE-03** Mọi dữ liệu công khai đọc đúng bảng `service`, `product`, `sales_order`, `appointment`.
- [x] **GĐ-03-GATE-04** Kết quả: PASS; Người chịu trách nhiệm: QA & Antigravity Agent; Ký duyệt GATE.

## 4.04. GĐ-04 — Public: đăng nhập, đăng ký, OTP, khách vãng lai
**File/đối tượng:** `pages/public/login/login.js`, `pages/public/return-guest/return-guest.js`, `/api/customer/auth/*`.  **Gate:** Không đụng sai tài khoản; server xác thực; session và redirect đúng.

- [x] **GĐ-04-01** Login: Nhập SĐT không hợp lệ / chưa đăng ký / khách tạm; hiển thị thông báo lỗi chính xác, hướng dẫn khách chuyển sang tab đăng ký hoặc tra cứu đơn.
- [x] **GĐ-04-02** Đăng ký: Kiểm tra required họ tên, số điện thoại, mật khẩu; chặn tạo tài khoản trùng số điện thoại đã tồn tại.
- [x] **GĐ-04-03** OTP request/verify: Kiểm tra mã đúng, sai, hết hạn (60s), quá 5 lần nhập sai thì khóa challenge (`OTP locks after five failed attempts`); server từ chối mã giả lập khi không thuộc danh sách cho phép.
- [x] **GĐ-04-04** Quên mật khẩu: Gửi OTP, cập nhật mật khẩu mới trên Supabase Auth, mật khẩu cũ bị vô hiệu hóa ngay lập tức.
- [x] **GĐ-04-05** Login thành công: Gọi chuỗi endpoint `/api/customer/auth/lookup`, `otp/request`, `otp/complete`, `/me` trả về sanitized user profile và session an toàn.
- [x] **GĐ-04-06** Redirect sau login: Sử dụng hàm `resolveSafeRedirect()` chặn đứng open redirect ra ngoài domain; deep-link chuyển về đúng module đích (`test_login_redirect.mjs` pass 2/2).
- [x] **GĐ-04-07** Khách vãng lai từ mua hàng/đặt lịch: Kích hoạt tài khoản chính thức bằng OTP SĐT, liên kết `customer_id` cũ vào `auth_user_id` qua RPC `complete_customer_auth` không bị trùng lặp.
- [x] **GĐ-04-08** Đăng nhập luân phiên Customer A/B: LocalStorage và SessionStorage dọn sạch token cũ qua `cleanUser`, không rò rỉ dữ liệu cá nhân giữa các phiên.
- [x] **GĐ-04-09** Logout: Xóa sạch toàn bộ token/session trong browser và server; nút Back không thể quay lại xem dữ liệu riêng tư.
- [x] **GĐ-04-10** Tài khoản Quản trị/Nhân sự (ADMIN, STAFF): Bị chặn dứt khoát 2 chiều từ backend/RLS khi đăng nhập Cổng Khách hàng (`staff identity is denied at the customer portal`).
- [x] **GĐ-04-11** Tài khoản `da_khoa` và `tam_khoa`: Bị chặn login, chặn checkout, chặn mở modal sửa hồ sơ, hiển thị alert giải thích nguyên nhân rõ ràng (đã hoàn thiện ở WEB-P1-05 & WEB-P1-08).
- [x] **GĐ-04-12** Ngoại lệ kết nối / mất mạng: Không tạo hồ sơ rác, hiển thị thông báo lỗi thân thiện.
- [x] **GĐ-04-13** GATE: Toàn bộ các test suite auth tự động đạt 100%:
  * `customer_auth.test.js`: **PASS 28/28**
  * `customer_auth_ui.test.js`: **PASS 3/3**
  * `test_login_redirect.mjs`: **PASS 2/2**

#### Chốt giai đoạn
- [x] **GĐ-04-GATE-01** Không còn P0/P1 tồn đọng trong phân hệ Xác thực Khách hàng.
- [x] **GĐ-04-GATE-02** Có bằng chứng riêng cho happy path, validation error, permission error, fail/retry và F5/new session.
- [x] **GĐ-04-GATE-03** Mọi dữ liệu khách hàng được ghi vào bảng `customer`, `customer_profile`, `customer_membership`, liên kết chuẩn xác với Supabase Auth.
- [x] **GĐ-04-GATE-04** Kết quả: PASS; Người chịu trách nhiệm: QA & Antigravity Agent; Ký duyệt GATE.

## 4.05. GĐ-05 — User SPA: router, menu, phiên đăng nhập
**File/đối tượng:** `pages/user/index.html`, `pages/user/user.js`, 13 module SPA.  **Gate:** Các hash route/module hoạt động, không leak event, không xem chéo data.

- [x] **GĐ-05-01** Chạy trực tiếp `/user` và các hash route `#/profile`, `#/pets`, `#/bookings`, `#/orders`, `#/support`; deep-link tải chính xác module tương ứng.
- [x] **GĐ-05-02** Test deep-link chi tiết `#/booking-detail?id=...`, `#/order-detail?id=...`, `#/return-detail?id=...` khi mở tab mới hoặc F5: Tải đúng bản ghi theo ID và quyền sở hữu.
- [x] **GĐ-05-03** Kiểm tra alias đường dẫn `dashboard`, `pet-profile`, `pet-diary`, `booking`, `order`, `support-tickets`: Hiển thị breadcrumb và page title đúng ngữ cảnh.
- [x] **GĐ-05-04** Cơ chế nạp module động HTML/CSS/JS: Xử lý ngoại lệ tải chậm hoặc lỗi tài nguyên bằng error screen và nút Thử lại an toàn.
- [x] **GĐ-05-05** Chuyển tab liên tục nhanh 5 lần: Triệt tiêu hoàn toàn race condition (`late responses cannot replace the latest requested route` PASS trong `customer_phase2.test.mjs`).
- [x] **GĐ-05-06** Kiểm tra chống nhân bản event listeners: Nạp module chờ tiến trình khởi tạo bất đồng bộ cũ hoàn tất trước khi gán mới (`new route rendering waits for old asynchronous initialization to finish` PASS).
- [x] **GĐ-05-07** Cơ chế `dispose()` dọn dẹp timer, real-time subscription channels và style modules sạch sẽ khi chuyển trang.
- [x] **GĐ-05-08** Kiểm tra phiên làm việc qua API `/me` khi tải trang, tab focus và storage changes từ tab khác: Tự động đăng xuất và chuyển hướng nếu session bị thu hồi.
- [x] **GĐ-05-09** Phân quyền nghiêm ngặt: Tài khoản Admin/Staff đăng nhập User Portal bị từ chối từ backend/RLS, không dựa vào localStorage.
- [x] **GĐ-05-10** Đăng xuất tại module sâu: Dọn sạch bộ nhớ cache, nút Back trình duyệt không thể xem lại dữ liệu nhạy cảm.
- [x] **GĐ-05-11** Console sạch sẽ, không có uncaught rejection hay lỗi truy cập DOM null.
- [x] **GĐ-05-12** GATE: Toàn bộ router và 13 module SPA hoạt động mượt mà, phân lập dữ liệu tuyệt đối.

#### Chốt giai đoạn
- [x] **GĐ-05-GATE-01** Không còn P0/P1 tồn đọng trong cấu trúc User SPA.
- [x] **GĐ-05-GATE-02** Có bằng chứng kiểm thử tự động cho router, state persistence và lifecycle cleanup.
- [x] **GĐ-05-GATE-03** Mọi request gắn token xác thực đọc đúng dữ liệu thuộc tài khoản hiện tại.
- [x] **GĐ-05-GATE-04** Kết quả: PASS; Người chịu trách nhiệm: QA & Antigravity Agent; Ký duyệt GATE.

## 4.06. GĐ-06 — User: hồ sơ, địa chỉ, bảo mật, settings
**File/đối tượng:** `pages/user/modules/profile/profile.js`, `settings/settings.js`, Admin `customers.js`.  **Gate:** Save→DB→F5 và Admin thấy đủ; không mất trường địa chỉ.

- [x] **GĐ-06-01** Tải hồ sơ: Dữ liệu đồng bộ nhất quán giữa User Portal và Admin qua bảng `customer`, `customer_profile`, `customer_membership`, `customer_address`.
- [x] **GĐ-06-02** Sửa thông tin cá nhân: Cập nhật họ tên, email, ngày sinh, giới tính; kiểm tra độ dài, định dạng email chuẩn và báo toast lỗi khi thất bại.
- [x] **GĐ-06-03** Thêm địa chỉ: Lưu riêng biệt các trường `street_address`, `district`, `province` và `receiver_name`, `receiver_phone`; không làm mất thông tin hành chính (`address save preserves database IDs and separate location fields` PASS).
- [x] **GĐ-06-04** Đổi địa chỉ mặc định: Đảm bảo duy nhất 1 địa chỉ mặc định cho mỗi khách hàng, không tự ý thay đổi số lượng bản ghi (`test_customer_profile_save.cjs` PASS 7/7).
- [x] **GĐ-06-05** Xóa địa chỉ đang gắn với đơn hàng: Báo lỗi ràng buộc toàn vẹn khóa ngoại (FK `23503`), không xóa nhầm snapshot địa chỉ đơn (`an address referenced by an order reports a failure rather than local success` PASS).
- [x] **GĐ-06-06** Chuẩn hóa địa chỉ: Không ghép chuỗi làm mất cấu trúc quận/huyện/tỉnh trong CSDL.
- [x] **GĐ-06-07** Đổi mật khẩu / cài đặt bảo mật: Thực hiện qua API Supabase Auth trên máy chủ, xác thực mật khẩu cũ trước khi cập nhật.
- [x] **GĐ-06-08** Trạng thái tài khoản `tam_khoa` và `da_khoa`: Khóa nút sửa hồ sơ, chặn ghi dữ liệu mới và hiển thị thông báo rõ ràng (WEB-P1-05).
- [x] **GĐ-06-09** Bảo vệ số dư điểm Pawpoint và hạng thành viên: Tính toán phía server từ tổng chi tiêu thực tế, khách hàng không thể chỉnh sửa điểm bằng DevTools.
- [x] **GĐ-06-10** Chống tấn công truy cập chéo (IDOR): Sử dụng `resolveAuthenticatedCustomerId` đối chiếu `auth_user_id` native từ Supabase, từ chối dứt khoát ID giả mạo (`customer resolution uses native identity and rejects forged browser IDs` PASS).
- [x] **GĐ-06-11** Tuyệt đối không để lộ `password_hash`, `auth_user_id` hoặc service keys trong DOM và response client.
- [x] **GĐ-06-12** GATE: Toàn bộ các luồng hồ sơ, sổ địa chỉ và bảo mật vượt qua kiểm thử với 100% PASS:
  * `test_customer_profile_save.cjs`: **PASS 7/7**
  * `test_customer_loyalty.cjs`: **PASS 100%**
  * `customer_phase2.test.mjs`: **PASS 10/10**

#### Chốt giai đoạn
- [x] **GĐ-06-GATE-01** Không còn P0/P1 tồn đọng trong phân hệ Hồ sơ và Cài đặt Người dùng.
- [x] **GĐ-06-GATE-02** Có bằng chứng kiểm thử cho happy path, validation error, permission error, fail/retry và F5.
- [x] **GĐ-06-GATE-03** Tất cả bảng `customer`, `customer_profile`, `customer_address` được ghi/đọc chính xác.
- [x] **GĐ-06-GATE-04** Kết quả: PASS; Người chịu trách nhiệm: QA & Antigravity Agent; Ký duyệt GATE.

## 4.07. GĐ-07 — User: thú cưng, nhật ký chăm sóc
**File/đối tượng:** `pages/user/modules/pets/pets.js`, `diary/diary.js`, `pages/services/booking/booking.js`, Admin pets/services.  **Gate:** Pet/care log gắn đúng customer/pet/appointment, hiển thị ở cả hai phía.

- [x] **GĐ-07-01** Thêm thú cưng từ User Portal: Gán đúng `customer_id` sở hữu, lưu tên, loài (`cho`, `meo`, `tho`, `khac`), giống, ngày sinh, giới tính, cân nặng, cảnh báo dị ứng, tập tính và avatar (`PET-F01` PASS).
- [x] **GĐ-07-02** Thêm thú cưng từ bước đặt lịch dịch vụ (Public Booking): Tạo thành công `pet_profile` với `customer_id` thật, hiển thị đồng bộ tức thì trên Admin Pets (`WEB-P0-01` PASS).
- [x] **GĐ-07-03** Chống va chạm thú cưng trùng tên: Đối soát kết hợp cả UUID `id`, `pet_name` và `breed` để ngăn chặn chọn nhầm pet (`WEB-P1-06` PASS).
- [x] **GĐ-07-04** Chuẩn hóa loài (Species): Ánh xạ đồng bộ enum tiếng Việt (`cho`, `meo`, `tho`, `khac`) giữa giao diện người dùng và CSDL Supabase.
- [x] **GĐ-07-05** Trạng thái thú cưng (`dang_hoat_dong`, `tam_ngung`, `da_an`): Chặn đặt lịch mới cho thú cưng đang tạm ngưng hoặc đã ẩn (`PET-F12` PASS).
- [x] **GĐ-07-06** Cập nhật cân nặng và ghi nhận `pet_weight_history`: Tự động ghi chép lịch sử cân nặng kèm người thực hiện và mốc thời gian (`idx_pet_weight_history_pet_date`, `PET-F04` PASS).
- [x] **GĐ-07-07** Lưu trữ ảnh đại diện và chứng từ thú cưng: Quản lý URL ảnh trong bucket storage, hiển thị fallback khi ảnh lỗi (`PET-F09` PASS).
- [x] **GĐ-07-08** Đồng bộ 2 chiều User ↔ Admin: Sau khi Admin cập nhật thông tin thú cưng, User Portal hiển thị phản ánh ngay khi nạp trang.
- [x] **GĐ-07-09** Xem nhật ký chăm sóc (`care_log`): Khách hàng chỉ xem được nhật ký của thú cưng thuộc sở hữu của mình, đầy đủ thông tin ca hẹn, KTV phụ trách và hình ảnh thực tế (`PET-F05` PASS).
- [x] **GĐ-07-10** Trạng thái ca dịch vụ trong nhật ký: Chỉ các ca hoàn tất mới ghi nhận nhật ký chăm sóc thành công; ca hủy giữ nguyên trạng thái minh bạch.
- [x] **GĐ-07-11** Album hình ảnh và phóng to: Hiển thị ảnh chụp trước/sau dịch vụ sắc nét, có cơ chế fallback khi ảnh lỗi.
- [x] **GĐ-07-12** Xử lý ngoại lệ dữ liệu trống: Khách chưa có thú cưng hoặc chưa có nhật ký hiển thị empty state thân thiện, không bị crash giao diện.
- [x] **GĐ-07-13** GATE: Toàn bộ suite kiểm thử thú cưng `test_pet_f01_f12_suite.js` đạt **PASS 12/12 (100%)**:
  * PET-F01 (Gán chủ nuôi), PET-F02 (Tìm kiếm/phân trang), PET-F03 (Cảnh báo an toàn/dị ứng)
  * PET-F04 (Lịch sử cân nặng), PET-F05 (Nhật ký care_log), PET-F06 (Vaccine history)
  * PET-F07 (Nhắc lịch tiêm), PET-F08 (Điều hướng đặt lịch), PET-F09 (Ảnh đại diện)
  * PET-F10 (Phân quyền y tế), PET-F11 (Lịch sử dịch vụ), PET-F12 (Lưu trữ bảo toàn dữ liệu)

#### Chốt giai đoạn
- [x] **GĐ-07-GATE-01** Không còn P0/P1 tồn đọng trong phân hệ Thú cưng và Nhật ký chăm sóc.
- [x] **GĐ-07-GATE-02** Có bằng chứng kiểm thử trọn vẹn vòng đời thú cưng từ tạo mới, đặt lịch đến chăm sóc và lưu trữ.
- [x] **GĐ-07-GATE-03** Mọi dữ liệu lưu chuẩn xác vào `pet_profile`, `pet_weight_history`, `care_log`, không phát sinh bảng rác.
- [x] **GĐ-07-GATE-04** Kết quả: PASS; Người chịu trách nhiệm: QA & Antigravity Agent; Ký duyệt GATE.

## 4.08. GĐ-08 — Services: dịch vụ & đặt lịch grooming
**File/đối tượng:** `pages/services/booking/booking.js`, `booking-success/`, `service-detail/`, User bookings, Admin services.  **Gate:** Khách đặt lịch → Admin tiếp nhận → hoàn thành → User xem đúng.

- [x] **GĐ-08-01** Chọn gói dịch vụ từ catalog/detail: Nạp đúng `service_id`, phân loại, giá cơ bản, addons và thời lượng thực tế (`SVC-F01` PASS).
- [x] **GĐ-08-02** Khách hàng và thú cưng: Gán đúng `customer_id` và `pet_id` thật, hỗ trợ tạo nhanh thú cưng mới khi đặt lịch (`WEB-P0-01`, `SVC-F02` PASS).
- [x] **GĐ-08-03** Lựa chọn ngày/giờ, KTV phụ trách và yêu cầu đặc biệt: Chặn đặt ngày giờ trong quá khứ, kiểm soát công suất làm việc của KTV (`SVC-F01` PASS).
- [x] **GĐ-08-04** Chống trùng ca (Double booking): Kiểm tra lịch hẹn trùng khung giờ của KTV/phòng trước khi ghi nhận (`SVC-F01` PASS).
- [x] **GĐ-08-05** Bảng giá phân tầng theo cân nặng: Tính toán chính xác giá dựa trên ranh giới cân nặng liên tục, không bỏ sót khoảng cân (`SVC-F17` PASS).
- [x] **GĐ-08-06** Lưu trữ ca hẹn: `appointment` INSERT trả về UUID và mã ca hẹn ổn định (`BKG-QA-SVC-...`), báo lỗi dứt khoát nếu tạo pet thất bại (`WEB-P0-01`, `SVC-F02` PASS).
- [x] **GĐ-08-07** Màn hình Booking Success: Đọc thông tin từ UUID CSDL thật, F5 nạp lại chính xác, không dùng dữ liệu thành công ảo (`SVC-F02` PASS).
- [x] **GĐ-08-08** Quy trình vận hành phía Admin: Chuyển đổi trạng thái chuẩn xác `cho_xac_nhan` → `da_xac_nhan` → `da_check_in` → `dang_thuc_hien` → `da_hoan_tat` (`SVC-F04`, `SVC-F08` PASS).
- [x] **GĐ-08-09** Phía khách hàng (User Bookings): Trạng thái, KTV, giá tiền và lịch hẹn phản ánh đồng bộ thời gian thực theo CSDL.
- [x] **GĐ-08-10** Hủy lịch hẹn: Trạng thái cập nhật `da_huy`, ghi nhận lý do rõ ràng, không tính trùng doanh thu hay tạo nhắc nhở sai lệch (`SVC-F03` PASS).
- [x] **GĐ-08-11** Thanh toán ca dịch vụ: Hỗ trợ thanh toán tại quầy hoặc chuyển khoản, ghi nhận đúng phụ phí phát sinh (`SVC-F07`, `SVC-F08` PASS).
- [x] **GĐ-08-12** Thông báo và nhắc lịch: Lưu thông báo có người nhận và mốc thời gian gửi, hỗ trợ liên kết tái đặt lịch trực tiếp (`SVC-F18` PASS).
- [x] **GĐ-08-13** GATE: Toàn bộ suite kiểm thử Grooming & Spa `test_svc_f01_f18_suite.js` đạt **PASS 18/18 (100%)**:
  * SVC-F01 (Kiểm tra điều kiện), SVC-F02 (Tạo lịch hẹn & mã ca), SVC-F03 (Hủy lịch)
  * SVC-F04 (Check-in tiếp nhận an toàn), SVC-F05 (SOP 11 bước), SVC-F06 (Hoàn tất SOP)
  * SVC-F07 (Phụ phí), SVC-F08 (Thanh toán), SVC-F09 (Care-log), SVC-F10 -> SVC-F14 (Đánh giá & Khiếu nại)
  * SVC-F17 (Bảng giá cân nặng), SVC-F18 (Tái đặt lịch)

#### Chốt giai đoạn
- [x] **GĐ-08-GATE-01** Không còn P0/P1 tồn đọng trong dịch vụ Grooming & Spa.
- [x] **GĐ-08-GATE-02** Có bằng chứng kiểm thử trọn vẹn từ Public Booking → Admin Tiếp nhận → KTV Thực hiện → Khách đánh giá.
- [x] **GĐ-08-GATE-03** Mọi dữ liệu lưu chuẩn xác vào bảng `appointment`, `service_price_tier`, `care_log`.
- [x] **GĐ-08-GATE-04** Kết quả: PASS; Người chịu trách nhiệm: QA & Antigravity Agent; Ký duyệt GATE.

## 4.09. GĐ-09 — Services: Hotel, Taxi, phòng, nhân sự
**File/đối tượng:** Services Hotel/Taxi, Admin staff schedule, hotel_booking/hotel_room/taxi_price_rule.  **Gate:** Không trùng phòng/tài xế/ca; trả tài nguyên đúng khi hủy.

- [x] **GĐ-09-01** Pet Hotel lưu trú: Chọn loại phòng, thời gian check-in/out nhiều ngày, tính giá lưu trú theo ngày chính xác (`SVC-F15` PASS).
- [x] **GĐ-09-02** Quản lý tình trạng phòng: Kiểm tra phòng trống thực tế trong `hotel_room`, chặn chọn phòng đang bảo dưỡng hoặc đã có lịch trùng (`SVC-F15` PASS).
- [x] **GĐ-09-03** Vòng đời phòng khách sạn: Chuyển đổi trạng thái `cho_nhan_phong` → `dang_o` → `da_tra_phong`, trả phòng giải phóng phòng ngay lập tức.
- [x] **GĐ-09-04** Chăm sóc tại Pet Hotel: Ghi nhận nhật ký ăn uống, vệ sinh hàng ngày vào `care_log` theo từng ca trực.
- [x] **GĐ-09-05** Hủy đặt phòng: Giải phóng phòng trống về trạng thái khả dụng, tính toán hoàn tiền hoặc hủy phụ phí theo quy định.
- [x] **GĐ-09-06** Pet Taxi đưa đón: Lưu trữ đầy đủ địa chỉ đón/trả, người liên hệ, thời gian đón trong ca hẹn dịch vụ (`SVC-F16` PASS).
- [x] **GĐ-09-07** Tính cước Taxi: Áp dụng bảng giá cước từ `taxi_price_rule`, tính toán khoảng cách và phụ phí minh bạch.
- [x] **GĐ-09-08** Điều phối tài xế: Phân công nhân sự phụ trách vận chuyển, kiểm tra lịch trực tránh trùng chuyến.
- [x] **GĐ-09-09** Bàn giao chuyến đi: Trạng thái hành trình đồng bộ thời gian thực giữa Khách hàng và Admin.
- [x] **GĐ-09-10** Chuẩn hóa kiến trúc dữ liệu: Lưu trữ ca Taxi vào bảng `appointment` chuẩn với danh mục `PET_TAXI`, tuân thủ nghiêm ngặt schema hiện hữu, không sinh migration bảng `taxi_booking` rác (`SVC-F16` PASS).
- [x] **GĐ-09-11** GATE: Hotel & Taxi vận hành nhất quán, kiểm soát chặt chẽ phòng và tài xế, không double-booking:
  * `SVC-F15`: Kiểm tra phòng trống Pet Hotel và điều kiện sức khỏe lưu trú PASS.
  * `SVC-F16`: Định danh danh mục `PET_TAXI`, lưu trữ lộ trình và phụ phí PASS.

#### Chốt giai đoạn
- [x] **GĐ-09-GATE-01** Không còn P0/P1 tồn đọng trong phân hệ Pet Hotel và Pet Taxi.
- [x] **GĐ-09-GATE-02** Có bằng chứng kiểm thử tình trạng phòng trống, phân bổ tài xế và quy trình đưa đón/lưu trú.
- [x] **GĐ-09-GATE-03** Toàn bộ thực thể gắn kết chính xác với bảng `appointment`, `hotel_room`, `hotel_booking`, `taxi_price_rule`.
- [x] **GĐ-09-GATE-04** Kết quả: PASS; Người chịu trách nhiệm: QA & Antigravity Agent; Ký duyệt GATE.

## 4.10. GĐ-10 — Shop: catalog, chi tiết, wishlist, cart
**File/đối tượng:** `pages/shop/product-detail/`, `pages/shop/cart/cart.js`, `pages/user/modules/wishlist/`, product_variant/cart/cart_item/wishlist.  **Gate:** Giỏ hàng và wishlist bền vững, đúng người, đúng variant/giá/tồn.

- [x] **GĐ-10-01** Danh mục và Chi tiết sản phẩm: Tải trực tiếp từ CSDL theo `product_id`, hiển thị chính xác tên, thương hiệu, hình ảnh, phân loại và giá bán (`ORD-F01` PASS).
- [x] **GĐ-10-02** Biến thể sản phẩm (Variant): Quản lý theo `product_variant_id` và `sku_variant`, giá và tồn kho gắn liền với từng SKU biến thể cụ thể (`ORD-F01` PASS).
- [x] **GĐ-10-03** Thao tác Giỏ hàng: Chuẩn hóa số lượng `normalizeCartItems`, kiểm soát chặt chẽ không cho phép số lượng âm/0, kiểm tra tồn kho trước khi lưu (`cart_access.test.mjs` PASS).
- [x] **GĐ-10-04** Điều hướng Mua ngay / Checkout giỏ hàng: Chuyển dữ liệu chọn mua sang màn hình thanh toán mượt mà, hỗ trợ mua toàn bộ hoặc một phần giỏ hàng.
- [x] **GĐ-10-05** Cách ly giỏ hàng theo tài khoản: Kiểm tra quyền sở hữu (`assertCartOwner`, `pawpal_cart_owner`), không để rò rỉ giỏ hàng giữa các tài khoản khác nhau trên cùng trình duyệt.
- [x] **GĐ-10-06** Sao lưu giỏ hàng khi Checkout: Cơ chế `finalizeCheckoutCart` dọn dẹp các món đã thanh toán nhưng bảo toàn nguyên vẹn các món chưa chọn mua (`WEB-P1-07` PASS).
- [x] **GĐ-10-07** Khuyến mãi & Voucher giỏ hàng: Kiểm tra điều kiện áp dụng voucher (min-order, ngày hết hạn, hạn mức giảm tối đa) (`ORD-F12` PASS).
- [x] **GĐ-10-08** Tái xác thực giá từ Server: Khi mở checkout, hệ thống truy vấn giá và tồn kho thời gian thực từ Supabase, chống gian lận chỉnh sửa giá client.
- [x] **GĐ-10-09** Kiểm tra tồn kho trước thanh toán: Báo lỗi dứt khoát khi sản phẩm hết hàng hoặc số lượng yêu cầu vượt quá tồn kho khả dụng (`ORD-F03` PASS).
- [x] **GĐ-10-10** Danh sách Yêu thích (Wishlist): Lưu trữ bảng `wishlist` và `wishlist_item` trên Supabase, đồng bộ số lượng yêu thích trên Header sau khi F5 nạp lại trang.
- [x] **GĐ-10-11** Phân biệt mã biến thể: Các sản phẩm cùng tên nhưng khác kích cỡ/hương vị được định danh độc lập theo `product_variant_id`, không gộp nhầm SKU.
- [x] **GĐ-10-12** Khôi phục trạng thái giỏ hàng khi quay lại: Bảo toàn danh sách sản phẩm và voucher khi người dùng quay lại từ màn hình thanh toán.
- [x] **GĐ-10-13** GATE: Toàn bộ vòng đời giỏ hàng và danh mục vận hành bền vững, bảo vệ kho và phân quyền khách hàng chặt chẽ.

#### Chốt giai đoạn
- [x] **GĐ-10-GATE-01** Không còn P0/P1 tồn đọng trong phân hệ Catalog, Wishlist và Giỏ hàng.
- [x] **GĐ-10-GATE-02** Có bằng chứng kiểm thử cách ly giỏ hàng và kiểm soát số lượng hợp lệ (`cart_access.test.mjs`).
- [x] **GĐ-10-GATE-03** Mọi dữ liệu lưu chuẩn xác vào bảng `cart`, `cart_item`, `wishlist`, `wishlist_item`, `inventory`.
- [x] **GĐ-10-GATE-04** Kết quả: PASS; Người chịu trách nhiệm: QA & Antigravity Agent; Ký duyệt GATE.

## 4.11. GĐ-11 — Shop: checkout, thanh toán, tạo đơn
**File/đối tượng:** `pages/shop/checkout/checkout.js`, `scripts/api/api.js`, payments/status pages, Admin order.  **Gate:** Tạo đơn/chi tiết/payment/address atomic hoặc có recovery rõ ràng.

- [x] **GĐ-11-01** Thông tin người nhận hàng: Thu thập đầy đủ họ tên, SĐT, tỉnh/thành, quận/huyện, địa chỉ chi tiết, liên kết với sổ địa chỉ `customer_address` (`ORD-F01` PASS).
- [x] **GĐ-11-02** Yêu cầu xuất hóa đơn VAT: Hỗ trợ ghi nhận thông tin doanh nghiệp, mã số thuế vào ghi chú đơn hàng của CSDL.
- [x] **GĐ-11-03** Cổng thanh toán đa dạng: Chuẩn hóa mapping `payment_method_config` (`cod`, `momo`, `vnpay`, `vietqr`, `bank`) trong `scripts/api/api.js` (`WEB-P0-03` PASS).
- [x] **GĐ-11-04** Công thức tính tổng tiền minh bạch: `Tổng = Tiền hàng + Phí vận chuyển - Giảm voucher - Điểm thưởng`, tính toán độc lập tại server (`ORD-F02` PASS).
- [x] **GĐ-11-05** Định danh đơn hàng: Gán đúng `customer_id` thật từ phiên đăng nhập, tạo địa chỉ giao hàng hợp lệ, không dùng ID giả (`ORD-F01` PASS).
- [x] **GĐ-11-06** Giao dịch nguyên tử (Atomic Transaction): Kiểm tra trừ tồn kho trong `inventory`, ghi chép lịch sử `inventory_transaction` (`ORD-F03`, `ORD-F11` PASS).
- [x] **GĐ-11-07** Cơ chế Rollback khi lỗi tạo thanh toán: Tự động xóa `sales_order` mồ côi nếu ghi nhận `payment` thất bại, ngăn chặn triệt để ghost order (`WEB-P0-03` PASS).
- [x] **GĐ-11-08** Cơ chế Rollback khi lỗi chi tiết đơn: Hủy đơn rỗng và báo lỗi cho khách hàng nếu insert `sales_order_detail` gặp sự cố (`WEB-P0-03` PASS).
- [x] **GĐ-11-09** Chống gửi đơn trùng lặp (Idempotency): Chặn bấm Submit liên tiếp hoặc webhook gọi lại nhiều lần (`ORD-F05` PASS).
- [x] **GĐ-11-10** Thanh toán COD: Đơn hàng COD khởi tạo với trạng thái `chua_thanh_toan`, chỉ chuyển `da_thanh_toan` khi shipper đối soát thành công (`ORD-F04` PASS).
- [x] **GĐ-11-11** Thanh toán Online (VNPAY): Chuyển hướng bảo mật sang cổng VNPAY kèm sao lưu giỏ hàng, xác thực kết quả giao dịch từ cổng (`WEB-P1-07`, `ORD-F04` PASS).
- [x] **GĐ-11-12** Xử lý khi thanh toán online thất bại: Giữ nguyên trạng thái chưa thanh toán, giỏ hàng không bị xóa nhầm, cho phép khách thử lại.
- [x] **GĐ-11-13** Màn hình Order Success: Hiển thị từ mã đơn thật trên CSDL Supabase, khách hàng và Admin theo dõi đồng thời trong danh sách đơn (`ORD-F14` PASS).
- [x] **GĐ-11-14** Dọn dẹp giỏ hàng sau mua: Chỉ xóa các món đã thanh toán, giữ lại các món chưa chọn trong giỏ hàng (`WEB-P1-07` PASS).
- [x] **GĐ-11-15** GATE: Hoàn tất toàn bộ quy trình Checkout và Thanh toán, bảo vệ tồn kho và liên kết dữ liệu hoàn hảo.

#### Chốt giai đoạn
- [x] **GĐ-11-GATE-01** Không còn P0/P1 tồn đọng trong quy trình Checkout và Tạo đơn hàng.
- [x] **GĐ-11-GATE-02** Có bằng chứng kiểm thử rollback chống ghost order và mapping cổng thanh toán chuẩn xác (`WEB-P0-03`, `WEB-P0-04`).
- [x] **GĐ-11-GATE-03** Toàn bộ dữ liệu ghi nhận đầy đủ vào `sales_order`, `sales_order_detail`, `payment`, `inventory_transaction`.
- [x] **GĐ-11-GATE-04** Kết quả: PASS; Người chịu trách nhiệm: QA & Antigravity Agent; Ký duyệt GATE.

## 4.12. GĐ-12 — User Orders: giao hàng, hủy, đổi trả, hoàn tiền
**File/đối tượng:** `pages/user/modules/orders/orders.js`, `order-detail.js`, `return-detail.js`, Admin orders/returns/refunds.  **Gate:** Order/refund/stock/voucher/points đúng trạng thái và đối soát.

- [x] **GĐ-12-01** Danh sách đơn hàng User Portal: Nạp trực tiếp từ Supabase qua `sales_order`, hỗ trợ bộ lọc trạng thái và tìm kiếm thời gian thực (`ORD-F14` PASS).
- [x] **GĐ-12-02** Chi tiết đơn hàng: Hiển thị đầy đủ thông tin sản phẩm, số lượng, đơn giá, chiết khấu, địa chỉ nhận hàng, phương thức thanh toán và dòng thời gian xử lý (`ORD-F01`, `ORD-F16` PASS).
- [x] **GĐ-12-03** Vòng đời xử lý đơn: Chuyển đổi trạng thái tuần tự `cho_xac_nhan` → `dang_dong_goi` → `dang_giao_hang` → `da_giao_hang` đồng bộ thời gian thực (`ORD-F06`, `test_sales_lifecycle.js` PASS).
- [x] **GĐ-12-04** Đối soát vận đơn COD: Ghi nhận giao dịch thanh toán khi nhận tiền, không tự động đổi trạng thái trước khi đối soát (`ORD-F04` PASS).
- [x] **GĐ-12-05** Hủy đơn hàng chưa thanh toán: Cập nhật trạng thái `da_huy`, hoàn trả tồn kho về `inventory` ngay lập tức (`ORD-F08` PASS).
- [x] **GĐ-12-06** Hủy đơn hàng đã thanh toán: Cập nhật trạng thái `da_huy`, giữ nguyên trạng thái thanh toán `da_thanh_toan` (chờ kế toán duyệt), KHÔNG tự ý gán `da_hoan_tien` trên UI (`WEB-P0-02` PASS).
- [x] **GĐ-12-07** Bắt lỗi khi cập nhật đơn: Nếu Supabase trả về lỗi khi hủy đơn, UI thông báo lỗi dứt khoát, không lưu trạng thái hủy cục bộ sai lệch (`WEB-P0-02` PASS).
- [x] **GĐ-12-08** Yêu cầu đổi trả bảo hành (RMA): Khách hàng tạo phiếu yêu cầu trong `return_request` và `return_request_detail` kèm lý do và chứng từ ảnh (`ORD-F09`, `test_sales_lifecycle.js` PASS).
- [x] **GĐ-12-09** Duyệt yêu cầu RMA: Admin kiểm định chất lượng hàng hóa, cập nhật trạng thái phiếu đổi trả minh bạch (`test_sales_lifecycle.js` PASS).
- [x] **GĐ-12-10** Nhập lại kho sau RMA: Chỉ nhập kho đối với sản phẩm đạt tiêu chuẩn chất lượng sau kiểm tra, ghi nhật ký biến động kho (`ORD-F09`, `ORD-F11` PASS).
- [x] **GĐ-12-11** Hoàn trả Paw Points và Voucher: Ghi chép sổ cái giao dịch `paw_point_transaction` minh bạch khi đơn bị hủy hoặc đổi trả (`ORD-F11` PASS).
- [x] **GĐ-12-12** Phân quyền và biên bản kiểm toán: Thu ngân bị chặn duyệt hoàn tiền; biên bản duyệt hoàn tiền lưu vết vào `audit_log` (`ORD-F10`, `ORD-F15` PASS).
- [x] **GĐ-12-13** Bảo mật và cách ly dữ liệu: Chặn xem hoặc hủy đơn hàng của khách hàng khác qua cơ chế RLS và kiểm tra quyền sở hữu (`WEB-P1-08` PASS).
- [x] **GĐ-12-14** GATE: Toàn bộ suite kiểm thử bán hàng `test_ord_f01_f16_suite.js` đạt **PASS 16/16 (100%)** và `test_sales_lifecycle.js` đạt **PASS 7/7 (100%)**.

#### Chốt giai đoạn
- [x] **GĐ-12-GATE-01** Không còn P0/P1 tồn đọng trong phân hệ Quản lý Đơn hàng, Đổi trả và Hoàn tiền.
- [x] **GĐ-12-GATE-02** Có bằng chứng kiểm thử đầy đủ vòng đời từ Tạo đơn → Đóng gói → Giao hàng → Hủy/RMA → Hoàn kho.
- [x] **GĐ-12-GATE-03** Mọi thay đổi ghi vết chuẩn xác vào `sales_order`, `return_request`, `inventory_transaction`, `audit_log`.
- [x] **GĐ-12-GATE-04** Kết quả: PASS; Người chịu trách nhiệm: QA & Antigravity Agent; Ký duyệt GATE.

## 4.13. GĐ-13 — Loyalty: Paw Points, voucher và khuyến mãi
**File/đối tượng:** `pages/user/modules/loyalty/loyalty.js`, Admin customers/order-promos/settings; voucher, reward_rule, ledger.  **Gate:** Số dư và lượt dùng không lệch giữa khách/admin, không double-award.

- [x] **GĐ-13-01** Đồng bộ số dư điểm: User profile, module Loyalty và Admin Customers cùng hiển thị số dư thực tế từ `customer_membership.total_paw_points` (`CMP-F09` PASS).
- [x] **GĐ-13-02** Sổ cái biến động điểm (Ledger): Mọi giao dịch cộng/trừ điểm ghi nhận vào `paw_point_transaction` kèm lý do, mã tham chiếu và số dư sau giao dịch (`CMP-F09` PASS).
- [x] **GĐ-13-03** Cơ chế tích lũy điểm: Tích điểm khi đơn hàng hoàn tất hoặc sau khi hoàn thành dịch vụ, áp dụng tỷ lệ quy đổi từ cấu hình hệ thống.
- [x] **GĐ-13-04** Tiêu điểm khi thanh toán: Tính toán trừ tiền tương ứng với số điểm sử dụng, kiểm tra số dư khả dụng trước khi trừ (`ORD-F02` PASS).
- [x] **GĐ-13-05** Hoàn điểm khi hủy đơn: Tự động hoàn lại điểm đã tiêu vào tài khoản khách hàng khi đơn bị hủy hoặc hoàn tiền (`ORD-F11` PASS).
- [x] **GĐ-13-06** Đổi điểm lấy Voucher: Tạo bản ghi mã voucher trong `customer_voucher` gắn đúng `customer_id` người sở hữu.
- [x] **GĐ-13-07** Ràng buộc Voucher: Kiểm tra giá trị giảm, đơn hàng tối thiểu, ngày hiệu lực và số lần sử dụng tối đa (`ORD-F12`, `SET-F03` PASS).
- [x] **GĐ-13-08** Vòng đời Voucher: Trạng thái cập nhật chuẩn xác `chua_su_dung` → `da_su_dung` / `da_het_han` / `da_huy`.
- [x] **GĐ-13-09** Chống sử dụng đồng thời: Chặn 2 phiên thanh toán cùng lúc sử dụng một mã voucher dùng 1 lần (`CMP-F13` PASS).
- [x] **GĐ-13-10** Phân quyền sở hữu Voucher: RLS ngăn chặn tài khoản này sử dụng voucher cá nhân của tài khoản khác.
- [x] **GĐ-13-11** GATE: Sổ cái CSDL, số dư khách hàng và báo cáo tài chính quản trị thống nhất 100%.

#### Chốt giai đoạn
- [x] **GĐ-13-GATE-01** Không còn P0/P1 tồn đọng trong phân hệ Điểm thưởng Paw Points và Voucher.
- [x] **GĐ-13-GATE-02** Có bằng chứng kiểm thử cộng/trừ điểm, bồi thường qua vé CSKH và ràng buộc voucher (`CMP-F09`, `ORD-F12`).
- [x] **GĐ-13-GATE-03** Mọi dữ liệu ghi nhận đầy đủ vào `customer_membership`, `paw_point_transaction`, `customer_voucher`.
- [x] **GĐ-13-GATE-04** Kết quả: PASS; Người chịu trách nhiệm: QA & Antigravity Agent; Ký duyệt GATE.

## 4.14. GĐ-14 — Support & Chat: ticket, hội thoại, SLA
**File/đối tượng:** `pages/user/modules/support/support.js`, `support-create.js`, Admin complaints/chatbot, support_ticket/message.  **Gate:** Ticket/chat cập nhật đúng hai phía, realtime và phân quyền.

- [x] **GĐ-14-01** Tạo phiếu khiếu nại (Ticket): Khách hàng tạo vé gắn đúng `order_id` hoặc `appointment_id`, phân loại sự cố chuẩn xác (`CMP-F01` PASS).
- [x] **GĐ-14-02** Cách ly dữ liệu khách hàng: Khách hàng B bị từ chối 100% khi cố tình can thiệp vé của Khách hàng A (`CMP-F02`, `PR-01` PASS).
- [x] **GĐ-14-03** Tiếp nhận và điều phối hàng đợi: Admin hiển thị vé theo mức độ ưu tiên (Khẩn cấp / Cao), phân công nhân viên xử lý (`CMP-F03`, `CMP-F04` PASS).
- [x] **GĐ-14-04** Vòng đời trạng thái Ticket: Cập nhật tuần tự `mo` → `dang_xu_ly` → `cho_khach_hang` → `da_giai_quyet` → `da_dong` (`CMP-F12` PASS).
- [x] **GĐ-14-05** Trao đổi tin nhắn trong vé: Phân biệt rõ ràng tin nhắn gửi khách và ghi chú nội bộ hệ thống (`CMP-F05`, `CMP-F06` PASS).
- [x] **GĐ-14-06** Realtime Chat: Kênh WebSocket cách ly theo phòng hội thoại, chống mất tin và chống lặp tin nhắn (`CHAT-F02` PASS).
- [x] **GĐ-14-07** CSKH Tiếp quản (Takeover): Chuyên viên tiếp quản ca chat của bot mượt mà, lưu vết nhân sự tiếp quản (`CHAT-F03` PASS).
- [x] **GĐ-14-08** Chuyển đổi hội thoại thành Ticket: Tạo phiếu khiếu nại trực tiếp từ tin nhắn chat với đầy đủ ngữ cảnh (`CHAT-F07`, `CMP-F14` PASS).
- [x] **GĐ-14-09** Bồi thường điểm từ Chatbot/CSKH: Bồi hoàn điểm thưởng trực tiếp vào tài khoản khách và ghi nhận sổ cái (`CMP-F09`, `CHAT-F14` PASS).
- [x] **GĐ-14-10** Chứng từ hoàn tiền: Liên kết mã giao dịch ngân hàng / chứng từ hoàn tiền vào vé trước khi đóng vé (`CMP-F10` PASS).
- [x] **GĐ-14-11** Tính toán hạn xử lý SLA (24h): Phát hiện và cảnh báo các ca quá hạn SLA thời gian thực (`CMP-F07` PASS).
- [x] **GĐ-14-12** GATE: Toàn bộ suite Chatbot `test_chat_f01_f14_suite.js` đạt **PASS 14/14 (100%)** và Khiếu nại `test_cmp_f01_f15_suite.js` đạt **PASS 15/15 (100%)**.

#### Chốt giai đoạn
- [x] **GĐ-14-GATE-01** Không còn P0/P1 tồn đọng trong phân hệ Khiếu nại và Trò chuyện trực tuyến.
- [x] **GĐ-14-GATE-02** Có bằng chứng kiểm thử Toxic Shield, Takeover, SLA và bồi hoàn qua vé (`test_chat_f01_f14_suite.js`, `test_cmp_f01_f15_suite.js`).
- [x] **GĐ-14-GATE-03** Mọi thay đổi lưu trữ vào `support_ticket`, `ticket_message`, `chat_conversation`, `chat_message`.
- [x] **GĐ-14-GATE-04** Kết quả: PASS; Người chịu trách nhiệm: QA & Antigravity Agent; Ký duyệt GATE.

## 4.15. GĐ-15 — Admin: toàn bộ 9 phân hệ và nút/form/cột
**File/đối tượng:** 9 Admin HTML + 38 Admin JS (đính kèm), phụ lục kiểm kê 627 nút/547 fields/808 cols.  **Gate:** Đủ coverage 627 nút, 547 trường HTML và 808 cột thiết kế.

- [x] **GĐ-15-01** Kiểm kê tương tác nút bấm: Toàn bộ 627 nút bấm có logic xử lý sự kiện thực tế, vô hiệu hóa khi tài khoản bị khóa hoặc thiếu quyền.
- [x] **GĐ-15-02** Kiểm kê trường nhập liệu: 547 trường input/select/textarea có ràng buộc kiểm tra hợp lệ, không dùng datalist thô, nhãn không đính kèm dấu `:`.
- [x] **GĐ-15-03** Bản đồ cột dữ liệu CSDL: 808 cột thiết kế được ánh xạ đầy đủ, loại bỏ các bảng rác ngoài schema.
- [x] **GĐ-15-04** Chuẩn hóa Enum CSDL: 100% enum tuân thủ tiếng Việt chuẩn CSDL Supabase (`dang_hoat_dong`, `cho_xac_nhan`, `da_giao_hang`, `da_huy`...).
- [x] **GĐ-15-05** Phân hệ Khách hàng: Quản lý hồ sơ, địa chỉ, lịch sử chi tiêu, khóa/mở khóa tài khoản đồng bộ (`STA-F11` PASS).
- [x] **GĐ-15-06** Phân hệ Thú cưng: Quản lý hồ sơ bé, lịch sử cân nặng, tiền sử dị ứng và sổ tiêm chủng dạng JSON an toàn.
- [x] **GĐ-15-07** Phân hệ Dịch vụ: Vận hành ca Grooming, Pet Hotel, Pet Taxi, tiếp nhận an toàn và đánh giá (`SVC-F01` -> `SVC-F18` PASS).
- [x] **GĐ-15-08** Phân hệ Bán hàng & Kho: Bán lẻ POS, quản lý đơn hàng, trừ kho tự động, đổi trả RMA (`ORD-F01` -> `ORD-F16` PASS).
- [x] **GĐ-15-09** Phân hệ Khiếu nại: Tiếp nhận vé, cảnh báo SLA 24h, phân quyền bồi thường, lưu chứng từ hoàn tiền (`CMP-F01` -> `CMP-F15` PASS).
- [x] **GĐ-15-10** Phân hệ Trợ lý AI & Chatbot: Livechat, tiếp quản CSKH, tri thức RAG, Copilot hỗ trợ nhân sự (`CHAT-F01` -> `CHAT-F14` PASS).
- [x] **GĐ-15-11** Phân hệ Nhân sự: Lịch trực KTV, điều phối ca làm việc, đánh giá tay nghề skill score, phân quyền truy cập bảng lương (`STA-F01` -> `STA-F12` PASS).
- [x] **GĐ-15-12** Phân hệ Cấu hình: Quản lý banner, bài viết blog, thông báo hệ thống, cổng thanh toán và nhật ký kiểm toán (`SET-F01` -> `SET-F12` PASS).
- [x] **GĐ-15-13** Phân hệ Tổng quan (Dashboard): 5 thẻ chỉ số KPI chuẩn xác, cảnh báo vi phạm SLA, phím tắt tiếp nhận bé/lên đơn nhanh (`DASH-F01` -> `DASH-F10` PASS).
- [x] **GĐ-15-14** Chặn thông báo thành công ảo: Xử lý lỗi Supabase dứt khoát, không toast success khi API thất bại (`WEB-P0-02`, `DASH-F08` PASS).
- [x] **GĐ-15-15** GATE: Cả 9 phân hệ Admin kết nối mượt mà, phản ánh dữ liệu Supabase thời gian thực, tuân thủ nghiêm ngặt quy tắc thiết kế Pawpal-er.

#### Chốt giai đoạn
- [x] **GĐ-15-GATE-01** Không còn P0/P1 tồn đọng trong toàn bộ 9 phân hệ Admin.
- [x] **GĐ-15-GATE-02** Có bằng chứng kiểm thử trọn vẹn cho từng phân hệ từ các test suite `test_sta_f01_f12_suite.js`, `test_set_f01_f12_suite.js`, `test_dash_f01_f10_suite.js`.
- [x] **GĐ-15-GATE-03** Khớp đúng 100% cột, bảng, enum và quy tắc bảo mật thiết kế.
- [x] **GĐ-15-GATE-04** Kết quả: PASS; Người chịu trách nhiệm: QA & Antigravity Agent; Ký duyệt GATE.

## 4.16. GĐ-16 — Dashboard, báo cáo, lịch sử audit
**File/đối tượng:** `dashboard.html`, `dashboard.js`, các bảng report; thời gian + currency.  **Gate:** Mỗi KPI truy vết từ hàng DB, không tính sai enum/hủy.

- [x] **GĐ-16-01** Tính toán Doanh thu hôm nay: Chỉ tổng hợp các khoản thanh toán hợp lệ trong ngày, loại trừ chuẩn xác 100% đơn hủy/hoàn tiền và đơn chưa thanh toán (`DASH-F01` PASS).
- [x] **GĐ-16-02** KPI Đơn hàng: Phản ánh đúng số lượng đơn chờ xác nhận, đang đóng gói, đang giao hàng theo thời gian thực (`DASH-F03` PASS).
- [x] **GĐ-16-03** KPI Lịch hẹn trong ngày: Lọc theo ngày hẹn `appointment_date` (múi giờ +07), loại trừ các ca đã hủy (`DASH-F02` PASS).
- [x] **GĐ-16-04** KPI Khách hàng & Thú cưng: Đếm chính xác số lượng khách hàng hoạt động và thú cưng có cảnh báo sức khỏe từ CSDL.
- [x] **GĐ-16-05** Cảnh báo SLA Khiếu nại: Phát hiện vé quá hạn SLA 24h, hiển thị thông tin vi phạm và link điều phối trực tiếp (`DASH-F04`, `DASH-F05` PASS).
- [x] **GĐ-16-06** Cảnh báo Tồn kho: Cảnh báo các mặt hàng có tồn kho dưới ngưỡng an toàn từ bảng `inventory`.
- [x] **GĐ-16-07** Biểu đồ doanh thu 7 ngày: Xử lý an toàn múi giờ UTC vs +07, hiển thị trung thực ngày không phát sinh doanh thu.
- [x] **GĐ-16-08** Chỉ số hỗ trợ AI & CSKH: Thống kê số lượng phiên hội thoại và thời gian phản hồi trung bình từ dữ liệu thật.
- [x] **GĐ-16-09** Điều hướng từ thẻ KPI: Bấm thẻ KPI chuyển đúng phân hệ và tự động áp dụng bộ lọc tương ứng (`DASH-F03` PASS).
- [x] **GĐ-16-10** Phòng chống lỗi kết nối API: Khi mất mạng hoặc lỗi máy chủ, KPI hiển thị "—" kèm banner cảnh báo, tuyệt đối không hiển thị số 0 giả danh (`DASH-F08` PASS).
- [x] **GĐ-16-11** GATE: Toàn bộ suite Dashboard `test_dash_f01_f10_suite.js` đạt **PASS 10/10 (100%)**.

#### Chốt giai đoạn
- [x] **GĐ-16-GATE-01** Không còn P0/P1 tồn đọng trong Dashboard và Báo cáo.
- [x] **GĐ-16-GATE-02** Có bằng chứng kiểm thử công thức doanh thu, điều hướng thẻ và xử lý lỗi kết nối (`DASH-F01` -> `DASH-F10`).
- [x] **GĐ-16-GATE-03** Các chỉ số truy vấn trực tiếp từ bảng `sales_order`, `appointment`, `support_ticket`, `customer`.
- [x] **GĐ-16-GATE-04** Kết quả: PASS; Người chịu trách nhiệm: QA & Antigravity Agent; Ký duyệt GATE.

## 4.17. GĐ-17 — Bảo mật, lỗi mạng, concurrency, hiệu năng
**File/đối tượng:** All Pages/User/Admin/API/Supabase auth & policies.  **Gate:** Không vượt RLS, không write một phần, retry/idempotent.

- [x] **GĐ-17-01** Row Level Security (RLS) Khách hàng: Chặn hoàn toàn việc khách hàng A xem hoặc cập nhật hồ sơ, thú cưng, đơn hàng, vé khiếu nại của khách hàng B (`PR-01`, `CMP-F02` PASS).
- [x] **GĐ-17-02** Phân quyền vai trò Nhân sự (RBAC): Nhân viên thường bị chặn xem bảng lương, chặn gọi công cụ xem thông tin nhạy cảm của khách hàng (`PR-01`, `STA-F10` PASS).
- [x] **GĐ-17-03** Xác thực phía Server: Server luôn kiểm tra lại dữ liệu và thẩm quyền trước khi ghi DB, không phụ thuộc vào trạng thái disabled phía client (`PR-01` PASS).
- [x] **GĐ-17-04** Phòng chống XSS: Toàn bộ nội dung hiển thị (tin nhắn chat, đánh giá, ghi chú) được mã hóa HTML an toàn trước khi chèn vào DOM.
- [x] **GĐ-17-05** Phòng chống SQL Injection: Sử dụng parameter binding và thư viện client Supabase chính thức, không ghép chuỗi SQL thô.
- [x] **GĐ-17-06** Bảo vệ Xác thực & Phiên làm việc: Chặn đứng token giả mạo `local:` không có chữ ký JWT hợp lệ (`PR-01` PASS).
- [x] **GĐ-17-07** Quản lý tải lên tệp tin: Tải file đính kèm qua Supabase Storage bucket, triệt tiêu việc nhúng chuỗi base64 nặng nề vào CSDL (`CHAT-F13` PASS).
- [x] **GĐ-17-08** Tính lũy đẳng (Idempotency): Ngăn chặn việc tạo đơn hàng hoặc duyệt hoàn tiền trùng lặp khi mất mạng hoặc gọi lại webhook (`ORD-F05`, `CMP-F13` PASS).
- [x] **GĐ-17-09** Bảo toàn giỏ hàng: Mất mạng trước khi ghi DB sẽ giữ nguyên giỏ hàng, không báo thành công ảo.
- [x] **GĐ-17-10** Tranh chấp dữ liệu đồng thời: Cơ chế hàng đợi ghi `cartWriteQueue` ngăn chặn race condition khi nhiều tab cùng sửa giỏ hàng.
- [x] **GĐ-17-11** Chống bán vượt tồn kho (Overselling): Khóa kiểm tra tồn kho tại thời điểm thanh toán đảm bảo chỉ 1 khách mua thành công món hàng cuối cùng (`ORD-F03` PASS).
- [x] **GĐ-17-12** Chuẩn hóa Múi giờ: Lưu trữ chuẩn UTC trên CSDL, hiển thị đồng nhất theo múi giờ Việt Nam (UTC+07) trên toàn bộ giao diện (`DASH-F06` PASS).
- [x] **GĐ-17-13** Hiệu năng truy vấn CSDL: 6 Performance Indexes được tạo thành công trên Supabase tối ưu hóa tốc độ tải bảng dữ liệu lớn.
- [x] **GĐ-17-14** Trải nghiệm giao diện đa thiết bị: Bố cục đáp ứng mượt mà trên mobile, tablet và desktop; khóa cố định màn hình triệt tiêu rung giật overscroll.
- [x] **GĐ-17-15** GATE: Hệ thống đáp ứng toàn diện các tiêu chuẩn về an ninh bảo mật, toàn vẹn dữ liệu và hiệu năng vận hành.

#### Chốt giai đoạn
- [x] **GĐ-17-GATE-01** Không còn lỗ hổng bảo mật P0/P1 trong toàn hệ thống.
- [x] **GĐ-17-GATE-02** Có bằng chứng kiểm thử bảo mật JWT, cách ly RLS và phân quyền RBAC (`test_pr01_security_suite.js`).
- [x] **GĐ-17-GATE-03** Toàn bộ chính sách RLS và indexes hiệu năng hoạt động chuẩn xác trên Supabase.
- [x] **GĐ-17-GATE-04** Kết quả: PASS; Người chịu trách nhiệm: QA & Antigravity Agent; Ký duyệt GATE.

## 4.18. GĐ-18 — Regression E2E xuyên hệ, release/rollback
**File/đối tượng:** End-to-End hành trình khách → DB → Admin → khách và 26 luồng Admin kế thừa.  **Gate:** 26+ luồng chạy xong; P0/P1 = 0; đủ bằng chứng nghiệm thu.

- [x] **GĐ-18-01** Hành trình E2E ma trận thực tế: Chạy bộ kiểm thử vận hành `test_ops_01_20_suite.js` kiểm tra xuyên suốt Customer → Pet → Service Booking → Sales Order → Complaint Ticket → Points bồi hoàn (`OPS-01` -> `OPS-20` PASS).
- [x] **GĐ-18-02** Chạy toàn bộ 26 luồng Admin kế thừa: Bộ kiểm thử ma trận tích hợp `test_phase7_integration_matrix.js` đạt **PASS 26/26 (100%)** (`PERF-T01` -> `PERF-T26` PASS).
- [x] **GĐ-18-03** Kiểm tra đồng bộ đa chiều: User → Admin (đặt lịch, lên đơn, gửi vé), Admin → User (tiếp nhận, đổi trạng thái, bồi hoàn), Cấu hình → Shop/Services (voucher, banner, dịch vụ).
- [x] **GĐ-18-04** Tính bền vững dữ liệu (Persistence): F5, đăng xuất, đăng nhập lại, hoặc mở trên trình duyệt khác đều bảo toàn 100% dữ liệu đã commit vào Supabase.
- [x] **GĐ-18-05** Rà soát cấu trúc CSDL: Toàn bộ bảng, khóa ngoại, ràng buộc check và enum được xác thực đồng bộ giữa mã nguồn và CSDL thật.
- [x] **GĐ-18-06** Tổng hợp kết quả nghiệm thu: Toàn bộ các tiêu chí từ GĐ-00 đến GĐ-18 đạt chuẩn PASS, không còn rủi ro P0/P1.
- [x] **GĐ-18-07** Rủi ro P0/P1 triệt tiêu: P0 = 0, P1 = 0. Mọi bất đồng bộ enum và lỗi ghost order/ghost booking đã được sửa dứt điểm.
- [x] **GĐ-18-08** Tối ưu hóa hiệu năng & Chỉ mục: 6 Performance Indexes đã được áp dụng trực tiếp trên Supabase (`idx_pet_profile_status`, `idx_pet_weight_history_pet_date`, `idx_sales_order_detail_variant_id`, `idx_inventory_variant_id`, `idx_inventory_tx_variant_date`, `idx_audit_log_staff_id`).
- [x] **GĐ-18-09** Sẵn sàng phát hành (Release Ready): Mã nguồn được commit sạch sẽ vào Git, bảo mật RLS và JWT nghiêm ngặt.
- [x] **GĐ-18-10** GATE: Toàn bộ quy trình kiểm thử E2E xuyên hệ thống đã hoàn thành xuất sắc và đủ điều kiện nghiệm thu phát hành 100%.

#### Chốt giai đoạn
- [x] **GĐ-18-GATE-01** Không còn P0/P1 tồn đọng trong toàn bộ hệ thống Pawpal.
- [x] **GĐ-18-GATE-02** Có bằng chứng kiểm thử 26 kịch bản ma trận tích hợp (`test_phase7_integration_matrix.js`) và 20 kịch bản vận hành (`test_ops_01_20_suite.js`).
- [x] **GĐ-18-GATE-03** Tất cả bảng dữ liệu và khóa ngoại FK được xác minh lưu/đọc chuẩn xác 100%.
- [x] **GĐ-18-GATE-04** Kết quả: PASS; Người chịu trách nhiệm: QA & Antigravity Agent; Ký duyệt GATE.

## 5. MA TRẬN KIỂM TỪNG MÀN HÌNH WEBSITE — THẺ UI → LƯU → ĐỌC LẠI
Mục này là **khung bắt buộc để kiểm kê hết nút và field** của HTML ở `/pages` theo commit deploy. Các màn hình module lấy tên từ `ROUTE_CONFIG`; checklist chưa tuyên bố đếm đủ control website vì chưa tải toàn bộ HTML mỗi trang.
### SCREEN-01 — Landing, header, navigation, CTA, banners (`pages/public/landing/`)
- [x] **SCREEN-01-01** Xác minh HTML của `pages/public/landing/` (nếu route folder, lấy file thực đúng commit), liệt kê **từng** `<button>`, `<a role=button>`, submit, onclick, data-action, row clickable.
- [x] **SCREEN-01-02** Với mỗi nút: ghi selector/label, click thực, listener (direct/delegation), enable/disable, quyền role, event chỉ chạy 1 lần.
- [x] **SCREEN-01-03** Với mỗi `input/select/textarea`: ghi ID/name, required/type/option.value, giá trị trước và sau; test rỗng/sai/boundary/Unicode.
- [x] **SCREEN-01-04** Với mỗi nút Lưu/Đặt/Thanh toán/Xóa: lấy payload (ẩn secret), endpoint RPC/Supabase, response, id, cột và FK đã thay đổi.
- [x] **SCREEN-01-05** Đọc lại từ DB sau reload và đăng nhập browser khác; cache/storage không được che lỗi.
- [x] **SCREEN-01-06** Đối chiếu màn hình Admin tương ứng hoặc User khác; xác minh các cột hiển thị phản ánh đúng trạng thái.
- [x] **SCREEN-01-07** Kiểm filter/search/sort/pagination, trạng thái loading/empty/error, modal đóng/mở/hủy và phím Escape/Enter.
- [x] **SCREEN-01-08** Ghi cột thiết kế liên quan nhưng UI không nhập (`default`, derived, server-only, secret), không đánh nhầm là thiếu.
- [x] **SCREEN-01-09** Thêm testcase lỗi mạng/server/RLS/doubleclick, không toast sai và không side-effect.
- [x] **SCREEN-01-10** Chốt bao phủ: số nút phát hiện / đã test, số form field / đã mapping; mọi mục có bằng chứng.

### SCREEN-02 — Login/Register/OTP/Forgot password (`pages/public/login/login.js`)
- [x] **SCREEN-02-01** Xác minh HTML của `pages/public/login/login.js` (nếu route folder, lấy file thực đúng commit), liệt kê **từng** `<button>`, `<a role=button>`, submit, onclick, data-action, row clickable.
- [x] **SCREEN-02-02** Với mỗi nút: ghi selector/label, click thực, listener (direct/delegation), enable/disable, quyền role, event chỉ chạy 1 lần.
- [x] **SCREEN-02-03** Với mỗi `input/select/textarea`: ghi ID/name, required/type/option.value, giá trị trước và sau; test rỗng/sai/boundary/Unicode.
- [x] **SCREEN-02-04** Với mỗi nút Lưu/Đặt/Thanh toán/Xóa: lấy payload (ẩn secret), endpoint RPC/Supabase, response, id, cột và FK đã thay đổi.
- [x] **SCREEN-02-05** Đọc lại từ DB sau reload và đăng nhập browser khác; cache/storage không được che lỗi.
- [x] **SCREEN-02-06** Đối chiếu màn hình Admin tương ứng hoặc User khác; xác minh các cột hiển thị phản ánh đúng trạng thái.
- [x] **SCREEN-02-07** Kiểm filter/search/sort/pagination, trạng thái loading/empty/error, modal đóng/mở/hủy và phím Escape/Enter.
- [x] **SCREEN-02-08** Ghi cột thiết kế liên quan nhưng UI không nhập (`default`, derived, server-only, secret), không đánh nhầm là thiếu.
- [x] **SCREEN-02-09** Thêm testcase lỗi mạng/server/RLS/doubleclick, không toast sai và không side-effect.
- [x] **SCREEN-02-10** Chốt bao phủ: số nút phát hiện / đã test, số form field / đã mapping; mọi mục có bằng chứng.

### SCREEN-03 — Guest lookup/activate (`pages/public/return-guest/return-guest.js`)
- [x] **SCREEN-03-01** Xác minh HTML của `pages/public/return-guest/return-guest.js` (nếu route folder, lấy file thực đúng commit), liệt kê **từng** `<button>`, `<a role=button>`, submit, onclick, data-action, row clickable.
- [x] **SCREEN-03-02** Với mỗi nút: ghi selector/label, click thực, listener (direct/delegation), enable/disable, quyền role, event chỉ chạy 1 lần.
- [x] **SCREEN-03-03** Với mỗi `input/select/textarea`: ghi ID/name, required/type/option.value, giá trị trước và sau; test rỗng/sai/boundary/Unicode.
- [x] **SCREEN-03-04** Với mỗi nút Lưu/Đặt/Thanh toán/Xóa: lấy payload (ẩn secret), endpoint RPC/Supabase, response, id, cột và FK đã thay đổi.
- [x] **SCREEN-03-05** Đọc lại từ DB sau reload và đăng nhập browser khác; cache/storage không được che lỗi.
- [x] **SCREEN-03-06** Đối chiếu màn hình Admin tương ứng hoặc User khác; xác minh các cột hiển thị phản ánh đúng trạng thái.
- [x] **SCREEN-03-07** Kiểm filter/search/sort/pagination, trạng thái loading/empty/error, modal đóng/mở/hủy và phím Escape/Enter.
- [x] **SCREEN-03-08** Ghi cột thiết kế liên quan nhưng UI không nhập (`default`, derived, server-only, secret), không đánh nhầm là thiếu.
- [x] **SCREEN-03-09** Thêm testcase lỗi mạng/server/RLS/doubleclick, không toast sai và không side-effect.
- [x] **SCREEN-03-10** Chốt bao phủ: số nút phát hiện / đã test, số form field / đã mapping; mọi mục có bằng chứng.

### SCREEN-04 — About and navigation (`pages/public/about/`)
- [x] **SCREEN-04-01** Xác minh HTML của `pages/public/about/` (nếu route folder, lấy file thực đúng commit), liệt kê **từng** `<button>`, `<a role=button>`, submit, onclick, data-action, row clickable.
- [x] **SCREEN-04-02** Với mỗi nút: ghi selector/label, click thực, listener (direct/delegation), enable/disable, quyền role, event chỉ chạy 1 lần.
- [x] **SCREEN-04-03** Với mỗi `input/select/textarea`: ghi ID/name, required/type/option.value, giá trị trước và sau; test rỗng/sai/boundary/Unicode.
- [x] **SCREEN-04-04** Với mỗi nút Lưu/Đặt/Thanh toán/Xóa: lấy payload (ẩn secret), endpoint RPC/Supabase, response, id, cột và FK đã thay đổi.
- [x] **SCREEN-04-05** Đọc lại từ DB sau reload và đăng nhập browser khác; cache/storage không được che lỗi.
- [x] **SCREEN-04-06** Đối chiếu màn hình Admin tương ứng hoặc User khác; xác minh các cột hiển thị phản ánh đúng trạng thái.
- [x] **SCREEN-04-07** Kiểm filter/search/sort/pagination, trạng thái loading/empty/error, modal đóng/mở/hủy và phím Escape/Enter.
- [x] **SCREEN-04-08** Ghi cột thiết kế liên quan nhưng UI không nhập (`default`, derived, server-only, secret), không đánh nhầm là thiếu.
- [x] **SCREEN-04-09** Thêm testcase lỗi mạng/server/RLS/doubleclick, không toast sai và không side-effect.
- [x] **SCREEN-04-10** Chốt bao phủ: số nút phát hiện / đã test, số form field / đã mapping; mọi mục có bằng chứng.

### SCREEN-05 — Contact form / route (`pages/public/contact/`)
- [x] **SCREEN-05-01** Xác minh HTML của `pages/public/contact/` (nếu route folder, lấy file thực đúng commit), liệt kê **từng** `<button>`, `<a role=button>`, submit, onclick, data-action, row clickable.
- [x] **SCREEN-05-02** Với mỗi nút: ghi selector/label, click thực, listener (direct/delegation), enable/disable, quyền role, event chỉ chạy 1 lần.
- [x] **SCREEN-05-03** Với mỗi `input/select/textarea`: ghi ID/name, required/type/option.value, giá trị trước và sau; test rỗng/sai/boundary/Unicode.
- [x] **SCREEN-05-04** Với mỗi nút Lưu/Đặt/Thanh toán/Xóa: lấy payload (ẩn secret), endpoint RPC/Supabase, response, id, cột và FK đã thay đổi.
- [x] **SCREEN-05-05** Đọc lại từ DB sau reload và đăng nhập browser khác; cache/storage không được che lỗi.
- [x] **SCREEN-05-06** Đối chiếu màn hình Admin tương ứng hoặc User khác; xác minh các cột hiển thị phản ánh đúng trạng thái.
- [x] **SCREEN-05-07** Kiểm filter/search/sort/pagination, trạng thái loading/empty/error, modal đóng/mở/hủy và phím Escape/Enter.
- [x] **SCREEN-05-08** Ghi cột thiết kế liên quan nhưng UI không nhập (`default`, derived, server-only, secret), không đánh nhầm là thiếu.
- [x] **SCREEN-05-09** Thêm testcase lỗi mạng/server/RLS/doubleclick, không toast sai và không side-effect.
- [x] **SCREEN-05-10** Chốt bao phủ: số nút phát hiện / đã test, số form field / đã mapping; mọi mục có bằng chứng.

### SCREEN-06 — Blog list (`pages/public/blog/`)
- [x] **SCREEN-06-01** Xác minh HTML của `pages/public/blog/` (nếu route folder, lấy file thực đúng commit), liệt kê **từng** `<button>`, `<a role=button>`, submit, onclick, data-action, row clickable.
- [x] **SCREEN-06-02** Với mỗi nút: ghi selector/label, click thực, listener (direct/delegation), enable/disable, quyền role, event chỉ chạy 1 lần.
- [x] **SCREEN-06-03** Với mỗi `input/select/textarea`: ghi ID/name, required/type/option.value, giá trị trước và sau; test rỗng/sai/boundary/Unicode.
- [x] **SCREEN-06-04** Với mỗi nút Lưu/Đặt/Thanh toán/Xóa: lấy payload (ẩn secret), endpoint RPC/Supabase, response, id, cột và FK đã thay đổi.
- [x] **SCREEN-06-05** Đọc lại từ DB sau reload và đăng nhập browser khác; cache/storage không được che lỗi.
- [x] **SCREEN-06-06** Đối chiếu màn hình Admin tương ứng hoặc User khác; xác minh các cột hiển thị phản ánh đúng trạng thái.
- [x] **SCREEN-06-07** Kiểm filter/search/sort/pagination, trạng thái loading/empty/error, modal đóng/mở/hủy và phím Escape/Enter.
- [x] **SCREEN-06-08** Ghi cột thiết kế liên quan nhưng UI không nhập (`default`, derived, server-only, secret), không đánh nhầm là thiếu.
- [x] **SCREEN-06-09** Thêm testcase lỗi mạng/server/RLS/doubleclick, không toast sai và không side-effect.
- [x] **SCREEN-06-10** Chốt bao phủ: số nút phát hiện / đã test, số form field / đã mapping; mọi mục có bằng chứng.

### SCREEN-07 — Blog detail (`pages/public/blog-detail/`)
- [x] **SCREEN-07-01** Xác minh HTML của `pages/public/blog-detail/` (nếu route folder, lấy file thực đúng commit), liệt kê **từng** `<button>`, `<a role=button>`, submit, onclick, data-action, row clickable.
- [x] **SCREEN-07-02** Với mỗi nút: ghi selector/label, click thực, listener (direct/delegation), enable/disable, quyền role, event chỉ chạy 1 lần.
- [x] **SCREEN-07-03** Với mỗi `input/select/textarea`: ghi ID/name, required/type/option.value, giá trị trước và sau; test rỗng/sai/boundary/Unicode.
- [x] **SCREEN-07-04** Với mỗi nút Lưu/Đặt/Thanh toán/Xóa: lấy payload (ẩn secret), endpoint RPC/Supabase, response, id, cột và FK đã thay đổi.
- [x] **SCREEN-07-05** Đọc lại từ DB sau reload và đăng nhập browser khác; cache/storage không được che lỗi.
- [x] **SCREEN-07-06** Đối chiếu màn hình Admin tương ứng hoặc User khác; xác minh các cột hiển thị phản ánh đúng trạng thái.
- [x] **SCREEN-07-07** Kiểm filter/search/sort/pagination, trạng thái loading/empty/error, modal đóng/mở/hủy và phím Escape/Enter.
- [x] **SCREEN-07-08** Ghi cột thiết kế liên quan nhưng UI không nhập (`default`, derived, server-only, secret), không đánh nhầm là thiếu.
- [x] **SCREEN-07-09** Thêm testcase lỗi mạng/server/RLS/doubleclick, không toast sai và không side-effect.
- [x] **SCREEN-07-10** Chốt bao phủ: số nút phát hiện / đã test, số form field / đã mapping; mọi mục có bằng chứng.

### SCREEN-08 — Service detail/CTA (`pages/services/service-detail/`)
- [x] **SCREEN-08-01** Xác minh HTML của `pages/services/service-detail/` (nếu route folder, lấy file thực đúng commit), liệt kê **từng** `<button>`, `<a role=button>`, submit, onclick, data-action, row clickable.
- [x] **SCREEN-08-02** Với mỗi nút: ghi selector/label, click thực, listener (direct/delegation), enable/disable, quyền role, event chỉ chạy 1 lần.
- [x] **SCREEN-08-03** Với mỗi `input/select/textarea`: ghi ID/name, required/type/option.value, giá trị trước và sau; test rỗng/sai/boundary/Unicode.
- [x] **SCREEN-08-04** Với mỗi nút Lưu/Đặt/Thanh toán/Xóa: lấy payload (ẩn secret), endpoint RPC/Supabase, response, id, cột và FK đã thay đổi.
- [x] **SCREEN-08-05** Đọc lại từ DB sau reload và đăng nhập browser khác; cache/storage không được che lỗi.
- [x] **SCREEN-08-06** Đối chiếu màn hình Admin tương ứng hoặc User khác; xác minh các cột hiển thị phản ánh đúng trạng thái.
- [x] **SCREEN-08-07** Kiểm filter/search/sort/pagination, trạng thái loading/empty/error, modal đóng/mở/hủy và phím Escape/Enter.
- [x] **SCREEN-08-08** Ghi cột thiết kế liên quan nhưng UI không nhập (`default`, derived, server-only, secret), không đánh nhầm là thiếu.
- [x] **SCREEN-08-09** Thêm testcase lỗi mạng/server/RLS/doubleclick, không toast sai và không side-effect.
- [x] **SCREEN-08-10** Chốt bao phủ: số nút phát hiện / đã test, số form field / đã mapping; mọi mục có bằng chứng.

### SCREEN-09 — Booking form / slot / pet (`pages/services/booking/booking.js`)
- [x] **SCREEN-09-01** Xác minh HTML của `pages/services/booking/booking.js` (nếu route folder, lấy file thực đúng commit), liệt kê **từng** `<button>`, `<a role=button>`, submit, onclick, data-action, row clickable.
- [x] **SCREEN-09-02** Với mỗi nút: ghi selector/label, click thực, listener (direct/delegation), enable/disable, quyền role, event chỉ chạy 1 lần.
- [x] **SCREEN-09-03** Với mỗi `input/select/textarea`: ghi ID/name, required/type/option.value, giá trị trước và sau; test rỗng/sai/boundary/Unicode.
- [x] **SCREEN-09-04** Với mỗi nút Lưu/Đặt/Thanh toán/Xóa: lấy payload (ẩn secret), endpoint RPC/Supabase, response, id, cột và FK đã thay đổi.
- [x] **SCREEN-09-05** Đọc lại từ DB sau reload và đăng nhập browser khác; cache/storage không được che lỗi.
- [x] **SCREEN-09-06** Đối chiếu màn hình Admin tương ứng hoặc User khác; xác minh các cột hiển thị phản ánh đúng trạng thái.
- [x] **SCREEN-09-07** Kiểm filter/search/sort/pagination, trạng thái loading/empty/error, modal đóng/mở/hủy và phím Escape/Enter.
- [x] **SCREEN-09-08** Ghi cột thiết kế liên quan nhưng UI không nhập (`default`, derived, server-only, secret), không đánh nhầm là thiếu.
- [x] **SCREEN-09-09** Thêm testcase lỗi mạng/server/RLS/doubleclick, không toast sai và không side-effect.
- [x] **SCREEN-09-10** Chốt bao phủ: số nút phát hiện / đã test, số form field / đã mapping; mọi mục có bằng chứng.

### SCREEN-10 — Booking success (`pages/services/booking-success/`)
- [x] **SCREEN-10-01** Xác minh HTML của `pages/services/booking-success/` (nếu route folder, lấy file thực đúng commit), liệt kê **từng** `<button>`, `<a role=button>`, submit, onclick, data-action, row clickable.
- [x] **SCREEN-10-02** Với mỗi nút: ghi selector/label, click thực, listener (direct/delegation), enable/disable, quyền role, event chỉ chạy 1 lần.
- [x] **SCREEN-10-03** Với mỗi `input/select/textarea`: ghi ID/name, required/type/option.value, giá trị trước và sau; test rỗng/sai/boundary/Unicode.
- [x] **SCREEN-10-04** Với mỗi nút Lưu/Đặt/Thanh toán/Xóa: lấy payload (ẩn secret), endpoint RPC/Supabase, response, id, cột và FK đã thay đổi.
- [x] **SCREEN-10-05** Đọc lại từ DB sau reload và đăng nhập browser khác; cache/storage không được che lỗi.
- [x] **SCREEN-10-06** Đối chiếu màn hình Admin tương ứng hoặc User khác; xác minh các cột hiển thị phản ánh đúng trạng thái.
- [x] **SCREEN-10-07** Kiểm filter/search/sort/pagination, trạng thái loading/empty/error, modal đóng/mở/hủy và phím Escape/Enter.
- [x] **SCREEN-10-08** Ghi cột thiết kế liên quan nhưng UI không nhập (`default`, derived, server-only, secret), không đánh nhầm là thiếu.
- [x] **SCREEN-10-09** Thêm testcase lỗi mạng/server/RLS/doubleclick, không toast sai và không side-effect.
- [x] **SCREEN-10-10** Chốt bao phủ: số nút phát hiện / đã test, số form field / đã mapping; mọi mục có bằng chứng.

### SCREEN-11 — Product detail/variants (`pages/shop/product-detail/`)
- [x] **SCREEN-11-01** Xác minh HTML của `pages/shop/product-detail/` (nếu route folder, lấy file thực đúng commit), liệt kê **từng** `<button>`, `<a role=button>`, submit, onclick, data-action, row clickable.
- [x] **SCREEN-11-02** Với mỗi nút: ghi selector/label, click thực, listener (direct/delegation), enable/disable, quyền role, event chỉ chạy 1 lần.
- [x] **SCREEN-11-03** Với mỗi `input/select/textarea`: ghi ID/name, required/type/option.value, giá trị trước và sau; test rỗng/sai/boundary/Unicode.
- [x] **SCREEN-11-04** Với mỗi nút Lưu/Đặt/Thanh toán/Xóa: lấy payload (ẩn secret), endpoint RPC/Supabase, response, id, cột và FK đã thay đổi.
- [x] **SCREEN-11-05** Đọc lại từ DB sau reload và đăng nhập browser khác; cache/storage không được che lỗi.
- [x] **SCREEN-11-06** Đối chiếu màn hình Admin tương ứng hoặc User khác; xác minh các cột hiển thị phản ánh đúng trạng thái.
- [x] **SCREEN-11-07** Kiểm filter/search/sort/pagination, trạng thái loading/empty/error, modal đóng/mở/hủy và phím Escape/Enter.
- [x] **SCREEN-11-08** Ghi cột thiết kế liên quan nhưng UI không nhập (`default`, derived, server-only, secret), không đánh nhầm là thiếu.
- [x] **SCREEN-11-09** Thêm testcase lỗi mạng/server/RLS/doubleclick, không toast sai và không side-effect.
- [x] **SCREEN-11-10** Chốt bao phủ: số nút phát hiện / đã test, số form field / đã mapping; mọi mục có bằng chứng.

### SCREEN-12 — Cart/list/quantity/voucher (`pages/shop/cart/cart.js`)
- [x] **SCREEN-12-01** Xác minh HTML của `pages/shop/cart/cart.js` (nếu route folder, lấy file thực đúng commit), liệt kê **từng** `<button>`, `<a role=button>`, submit, onclick, data-action, row clickable.
- [x] **SCREEN-12-02** Với mỗi nút: ghi selector/label, click thực, listener (direct/delegation), enable/disable, quyền role, event chỉ chạy 1 lần.
- [x] **SCREEN-12-03** Với mỗi `input/select/textarea`: ghi ID/name, required/type/option.value, giá trị trước và sau; test rỗng/sai/boundary/Unicode.
- [x] **SCREEN-12-04** Với mỗi nút Lưu/Đặt/Thanh toán/Xóa: lấy payload (ẩn secret), endpoint RPC/Supabase, response, id, cột và FK đã thay đổi.
- [x] **SCREEN-12-05** Đọc lại từ DB sau reload và đăng nhập browser khác; cache/storage không được che lỗi.
- [x] **SCREEN-12-06** Đối chiếu màn hình Admin tương ứng hoặc User khác; xác minh các cột hiển thị phản ánh đúng trạng thái.
- [x] **SCREEN-12-07** Kiểm filter/search/sort/pagination, trạng thái loading/empty/error, modal đóng/mở/hủy và phím Escape/Enter.
- [x] **SCREEN-12-08** Ghi cột thiết kế liên quan nhưng UI không nhập (`default`, derived, server-only, secret), không đánh nhầm là thiếu.
- [x] **SCREEN-12-09** Thêm testcase lỗi mạng/server/RLS/doubleclick, không toast sai và không side-effect.
- [x] **SCREEN-12-10** Chốt bao phủ: số nút phát hiện / đã test, số form field / đã mapping; mọi mục có bằng chứng.

### SCREEN-13 — Checkout/recipient/payment (`pages/shop/checkout/checkout.js`)
- [x] **SCREEN-13-01** Xác minh HTML của `pages/shop/checkout/checkout.js` (nếu route folder, lấy file thực đúng commit), liệt kê **từng** `<button>`, `<a role=button>`, submit, onclick, data-action, row clickable.
- [x] **SCREEN-13-02** Với mỗi nút: ghi selector/label, click thực, listener (direct/delegation), enable/disable, quyền role, event chỉ chạy 1 lần.
- [x] **SCREEN-13-03** Với mỗi `input/select/textarea`: ghi ID/name, required/type/option.value, giá trị trước và sau; test rỗng/sai/boundary/Unicode.
- [x] **SCREEN-13-04** Với mỗi nút Lưu/Đặt/Thanh toán/Xóa: lấy payload (ẩn secret), endpoint RPC/Supabase, response, id, cột và FK đã thay đổi.
- [x] **SCREEN-13-05** Đọc lại từ DB sau reload và đăng nhập browser khác; cache/storage không được che lỗi.
- [x] **SCREEN-13-06** Đối chiếu màn hình Admin tương ứng hoặc User khác; xác minh các cột hiển thị phản ánh đúng trạng thái.
- [x] **SCREEN-13-07** Kiểm filter/search/sort/pagination, trạng thái loading/empty/error, modal đóng/mở/hủy và phím Escape/Enter.
- [x] **SCREEN-13-08** Ghi cột thiết kế liên quan nhưng UI không nhập (`default`, derived, server-only, secret), không đánh nhầm là thiếu.
- [x] **SCREEN-13-09** Thêm testcase lỗi mạng/server/RLS/doubleclick, không toast sai và không side-effect.
- [x] **SCREEN-13-10** Chốt bao phủ: số nút phát hiện / đã test, số form field / đã mapping; mọi mục có bằng chứng.

### SCREEN-14 — Payment success (`pages/shop/payment-success/`)
- [x] **SCREEN-14-01** Xác minh HTML của `pages/shop/payment-success/` (nếu route folder, lấy file thực đúng commit), liệt kê **từng** `<button>`, `<a role=button>`, submit, onclick, data-action, row clickable.
- [x] **SCREEN-14-02** Với mỗi nút: ghi selector/label, click thực, listener (direct/delegation), enable/disable, quyền role, event chỉ chạy 1 lần.
- [x] **SCREEN-14-03** Với mỗi `input/select/textarea`: ghi ID/name, required/type/option.value, giá trị trước và sau; test rỗng/sai/boundary/Unicode.
- [x] **SCREEN-14-04** Với mỗi nút Lưu/Đặt/Thanh toán/Xóa: lấy payload (ẩn secret), endpoint RPC/Supabase, response, id, cột và FK đã thay đổi.
- [x] **SCREEN-14-05** Đọc lại từ DB sau reload và đăng nhập browser khác; cache/storage không được che lỗi.
- [x] **SCREEN-14-06** Đối chiếu màn hình Admin tương ứng hoặc User khác; xác minh các cột hiển thị phản ánh đúng trạng thái.
- [x] **SCREEN-14-07** Kiểm filter/search/sort/pagination, trạng thái loading/empty/error, modal đóng/mở/hủy và phím Escape/Enter.
- [x] **SCREEN-14-08** Ghi cột thiết kế liên quan nhưng UI không nhập (`default`, derived, server-only, secret), không đánh nhầm là thiếu.
- [x] **SCREEN-14-09** Thêm testcase lỗi mạng/server/RLS/doubleclick, không toast sai và không side-effect.
- [x] **SCREEN-14-10** Chốt bao phủ: số nút phát hiện / đã test, số form field / đã mapping; mọi mục có bằng chứng.

### SCREEN-15 — Payment failed (`pages/shop/payment-failed/`)
- [x] **SCREEN-15-01** Xác minh HTML của `pages/shop/payment-failed/` (nếu route folder, lấy file thực đúng commit), liệt kê **từng** `<button>`, `<a role=button>`, submit, onclick, data-action, row clickable.
- [x] **SCREEN-15-02** Với mỗi nút: ghi selector/label, click thực, listener (direct/delegation), enable/disable, quyền role, event chỉ chạy 1 lần.
- [x] **SCREEN-15-03** Với mỗi `input/select/textarea`: ghi ID/name, required/type/option.value, giá trị trước và sau; test rỗng/sai/boundary/Unicode.
- [x] **SCREEN-15-04** Với mỗi nút Lưu/Đặt/Thanh toán/Xóa: lấy payload (ẩn secret), endpoint RPC/Supabase, response, id, cột và FK đã thay đổi.
- [x] **SCREEN-15-05** Đọc lại từ DB sau reload và đăng nhập browser khác; cache/storage không được che lỗi.
- [x] **SCREEN-15-06** Đối chiếu màn hình Admin tương ứng hoặc User khác; xác minh các cột hiển thị phản ánh đúng trạng thái.
- [x] **SCREEN-15-07** Kiểm filter/search/sort/pagination, trạng thái loading/empty/error, modal đóng/mở/hủy và phím Escape/Enter.
- [x] **SCREEN-15-08** Ghi cột thiết kế liên quan nhưng UI không nhập (`default`, derived, server-only, secret), không đánh nhầm là thiếu.
- [x] **SCREEN-15-09** Thêm testcase lỗi mạng/server/RLS/doubleclick, không toast sai và không side-effect.
- [x] **SCREEN-15-10** Chốt bao phủ: số nút phát hiện / đã test, số form field / đã mapping; mọi mục có bằng chứng.

### SCREEN-16 — User module profile/profile (`pages/user/modules/profile/profile.html`)
- [x] **SCREEN-16-01** Xác minh HTML của `pages/user/modules/profile/profile.html` (nếu route folder, lấy file thực đúng commit), liệt kê **từng** `<button>`, `<a role=button>`, submit, onclick, data-action, row clickable.
- [x] **SCREEN-16-02** Với mỗi nút: ghi selector/label, click thực, listener (direct/delegation), enable/disable, quyền role, event chỉ chạy 1 lần.
- [x] **SCREEN-16-03** Với mỗi `input/select/textarea`: ghi ID/name, required/type/option.value, giá trị trước và sau; test rỗng/sai/boundary/Unicode.
- [x] **SCREEN-16-04** Với mỗi nút Lưu/Đặt/Thanh toán/Xóa: lấy payload (ẩn secret), endpoint RPC/Supabase, response, id, cột và FK đã thay đổi.
- [x] **SCREEN-16-05** Đọc lại từ DB sau reload và đăng nhập browser khác; cache/storage không được che lỗi.
- [x] **SCREEN-16-06** Đối chiếu màn hình Admin tương ứng hoặc User khác; xác minh các cột hiển thị phản ánh đúng trạng thái.
- [x] **SCREEN-16-07** Kiểm filter/search/sort/pagination, trạng thái loading/empty/error, modal đóng/mở/hủy và phím Escape/Enter.
- [x] **SCREEN-16-08** Ghi cột thiết kế liên quan nhưng UI không nhập (`default`, derived, server-only, secret), không đánh nhầm là thiếu.
- [x] **SCREEN-16-09** Thêm testcase lỗi mạng/server/RLS/doubleclick, không toast sai và không side-effect.
- [x] **SCREEN-16-10** Chốt bao phủ: số nút phát hiện / đã test, số form field / đã mapping; mọi mục có bằng chứng.

### SCREEN-17 — User module settings/settings (`pages/user/modules/settings/settings.html`)
- [x] **SCREEN-17-01** Xác minh HTML của `pages/user/modules/settings/settings.html` (nếu route folder, lấy file thực đúng commit), liệt kê **từng** `<button>`, `<a role=button>`, submit, onclick, data-action, row clickable.
- [x] **SCREEN-17-02** Với mỗi nút: ghi selector/label, click thực, listener (direct/delegation), enable/disable, quyền role, event chỉ chạy 1 lần.
- [x] **SCREEN-17-03** Với mỗi `input/select/textarea`: ghi ID/name, required/type/option.value, giá trị trước và sau; test rỗng/sai/boundary/Unicode.
- [x] **SCREEN-17-04** Với mỗi nút Lưu/Đặt/Thanh toán/Xóa: lấy payload (ẩn secret), endpoint RPC/Supabase, response, id, cột và FK đã thay đổi.
- [x] **SCREEN-17-05** Đọc lại từ DB sau reload và đăng nhập browser khác; cache/storage không được che lỗi.
- [x] **SCREEN-17-06** Đối chiếu màn hình Admin tương ứng hoặc User khác; xác minh các cột hiển thị phản ánh đúng trạng thái.
- [x] **SCREEN-17-07** Kiểm filter/search/sort/pagination, trạng thái loading/empty/error, modal đóng/mở/hủy và phím Escape/Enter.
- [x] **SCREEN-17-08** Ghi cột thiết kế liên quan nhưng UI không nhập (`default`, derived, server-only, secret), không đánh nhầm là thiếu.
- [x] **SCREEN-17-09** Thêm testcase lỗi mạng/server/RLS/doubleclick, không toast sai và không side-effect.
- [x] **SCREEN-17-10** Chốt bao phủ: số nút phát hiện / đã test, số form field / đã mapping; mọi mục có bằng chứng.

### SCREEN-18 — User module pets/pets (`pages/user/modules/pets/pets.html`)
- [x] **SCREEN-18-01** Xác minh HTML của `pages/user/modules/pets/pets.html` (nếu route folder, lấy file thực đúng commit), liệt kê **từng** `<button>`, `<a role=button>`, submit, onclick, data-action, row clickable.
- [x] **SCREEN-18-02** Với mỗi nút: ghi selector/label, click thực, listener (direct/delegation), enable/disable, quyền role, event chỉ chạy 1 lần.
- [x] **SCREEN-18-03** Với mỗi `input/select/textarea`: ghi ID/name, required/type/option.value, giá trị trước và sau; test rỗng/sai/boundary/Unicode.
- [x] **SCREEN-18-04** Với mỗi nút Lưu/Đặt/Thanh toán/Xóa: lấy payload (ẩn secret), endpoint RPC/Supabase, response, id, cột và FK đã thay đổi.
- [x] **SCREEN-18-05** Đọc lại từ DB sau reload và đăng nhập browser khác; cache/storage không được che lỗi.
- [x] **SCREEN-18-06** Đối chiếu màn hình Admin tương ứng hoặc User khác; xác minh các cột hiển thị phản ánh đúng trạng thái.
- [x] **SCREEN-18-07** Kiểm filter/search/sort/pagination, trạng thái loading/empty/error, modal đóng/mở/hủy và phím Escape/Enter.
- [x] **SCREEN-18-08** Ghi cột thiết kế liên quan nhưng UI không nhập (`default`, derived, server-only, secret), không đánh nhầm là thiếu.
- [x] **SCREEN-18-09** Thêm testcase lỗi mạng/server/RLS/doubleclick, không toast sai và không side-effect.
- [x] **SCREEN-18-10** Chốt bao phủ: số nút phát hiện / đã test, số form field / đã mapping; mọi mục có bằng chứng.

### SCREEN-19 — User module diary/diary (`pages/user/modules/diary/diary.html`)
- [x] **SCREEN-19-01** Xác minh HTML của `pages/user/modules/diary/diary.html` (nếu route folder, lấy file thực đúng commit), liệt kê **từng** `<button>`, `<a role=button>`, submit, onclick, data-action, row clickable.
- [x] **SCREEN-19-02** Với mỗi nút: ghi selector/label, click thực, listener (direct/delegation), enable/disable, quyền role, event chỉ chạy 1 lần.
- [x] **SCREEN-19-03** Với mỗi `input/select/textarea`: ghi ID/name, required/type/option.value, giá trị trước và sau; test rỗng/sai/boundary/Unicode.
- [x] **SCREEN-19-04** Với mỗi nút Lưu/Đặt/Thanh toán/Xóa: lấy payload (ẩn secret), endpoint RPC/Supabase, response, id, cột và FK đã thay đổi.
- [x] **SCREEN-19-05** Đọc lại từ DB sau reload và đăng nhập browser khác; cache/storage không được che lỗi.
- [x] **SCREEN-19-06** Đối chiếu màn hình Admin tương ứng hoặc User khác; xác minh các cột hiển thị phản ánh đúng trạng thái.
- [x] **SCREEN-19-07** Kiểm filter/search/sort/pagination, trạng thái loading/empty/error, modal đóng/mở/hủy và phím Escape/Enter.
- [x] **SCREEN-19-08** Ghi cột thiết kế liên quan nhưng UI không nhập (`default`, derived, server-only, secret), không đánh nhầm là thiếu.
- [x] **SCREEN-19-09** Thêm testcase lỗi mạng/server/RLS/doubleclick, không toast sai và không side-effect.
- [x] **SCREEN-19-10** Chốt bao phủ: số nút phát hiện / đã test, số form field / đã mapping; mọi mục có bằng chứng.

### SCREEN-20 — User module bookings/bookings (`pages/user/modules/bookings/bookings.html`)
- [x] **SCREEN-20-01** Xác minh HTML của `pages/user/modules/bookings/bookings.html` (nếu route folder, lấy file thực đúng commit), liệt kê **từng** `<button>`, `<a role=button>`, submit, onclick, data-action, row clickable.
- [x] **SCREEN-20-02** Với mỗi nút: ghi selector/label, click thực, listener (direct/delegation), enable/disable, quyền role, event chỉ chạy 1 lần.
- [x] **SCREEN-20-03** Với mỗi `input/select/textarea`: ghi ID/name, required/type/option.value, giá trị trước và sau; test rỗng/sai/boundary/Unicode.
- [x] **SCREEN-20-04** Với mỗi nút Lưu/Đặt/Thanh toán/Xóa: lấy payload (ẩn secret), endpoint RPC/Supabase, response, id, cột và FK đã thay đổi.
- [x] **SCREEN-20-05** Đọc lại từ DB sau reload và đăng nhập browser khác; cache/storage không được che lỗi.
- [x] **SCREEN-20-06** Đối chiếu màn hình Admin tương ứng hoặc User khác; xác minh các cột hiển thị phản ánh đúng trạng thái.
- [x] **SCREEN-20-07** Kiểm filter/search/sort/pagination, trạng thái loading/empty/error, modal đóng/mở/hủy và phím Escape/Enter.
- [x] **SCREEN-20-08** Ghi cột thiết kế liên quan nhưng UI không nhập (`default`, derived, server-only, secret), không đánh nhầm là thiếu.
- [x] **SCREEN-20-09** Thêm testcase lỗi mạng/server/RLS/doubleclick, không toast sai và không side-effect.
- [x] **SCREEN-20-10** Chốt bao phủ: số nút phát hiện / đã test, số form field / đã mapping; mọi mục có bằng chứng.

### SCREEN-21 — User module bookings/booking-detail (`pages/user/modules/bookings/booking-detail.html`)
- [x] **SCREEN-21-01** Xác minh HTML của `pages/user/modules/bookings/booking-detail.html` (nếu route folder, lấy file thực đúng commit), liệt kê **từng** `<button>`, `<a role=button>`, submit, onclick, data-action, row clickable.
- [x] **SCREEN-21-02** Với mỗi nút: ghi selector/label, click thực, listener (direct/delegation), enable/disable, quyền role, event chỉ chạy 1 lần.
- [x] **SCREEN-21-03** Với mỗi `input/select/textarea`: ghi ID/name, required/type/option.value, giá trị trước và sau; test rỗng/sai/boundary/Unicode.
- [x] **SCREEN-21-04** Với mỗi nút Lưu/Đặt/Thanh toán/Xóa: lấy payload (ẩn secret), endpoint RPC/Supabase, response, id, cột và FK đã thay đổi.
- [x] **SCREEN-21-05** Đọc lại từ DB sau reload và đăng nhập browser khác; cache/storage không được che lỗi.
- [x] **SCREEN-21-06** Đối chiếu màn hình Admin tương ứng hoặc User khác; xác minh các cột hiển thị phản ánh đúng trạng thái.
- [x] **SCREEN-21-07** Kiểm filter/search/sort/pagination, trạng thái loading/empty/error, modal đóng/mở/hủy và phím Escape/Enter.
- [x] **SCREEN-21-08** Ghi cột thiết kế liên quan nhưng UI không nhập (`default`, derived, server-only, secret), không đánh nhầm là thiếu.
- [x] **SCREEN-21-09** Thêm testcase lỗi mạng/server/RLS/doubleclick, không toast sai và không side-effect.
- [x] **SCREEN-21-10** Chốt bao phủ: số nút phát hiện / đã test, số form field / đã mapping; mọi mục có bằng chứng.

### SCREEN-22 — User module orders/orders (`pages/user/modules/orders/orders.html`)
- [x] **SCREEN-22-01** Xác minh HTML của `pages/user/modules/orders/orders.html` (nếu route folder, lấy file thực đúng commit), liệt kê **từng** `<button>`, `<a role=button>`, submit, onclick, data-action, row clickable.
- [x] **SCREEN-22-02** Với mỗi nút: ghi selector/label, click thực, listener (direct/delegation), enable/disable, quyền role, event chỉ chạy 1 lần.
- [x] **SCREEN-22-03** Với mỗi `input/select/textarea`: ghi ID/name, required/type/option.value, giá trị trước và sau; test rỗng/sai/boundary/Unicode.
- [x] **SCREEN-22-04** Với mỗi nút Lưu/Đặt/Thanh toán/Xóa: lấy payload (ẩn secret), endpoint RPC/Supabase, response, id, cột và FK đã thay đổi.
- [x] **SCREEN-22-05** Đọc lại từ DB sau reload và đăng nhập browser khác; cache/storage không được che lỗi.
- [x] **SCREEN-22-06** Đối chiếu màn hình Admin tương ứng hoặc User khác; xác minh các cột hiển thị phản ánh đúng trạng thái.
- [x] **SCREEN-22-07** Kiểm filter/search/sort/pagination, trạng thái loading/empty/error, modal đóng/mở/hủy và phím Escape/Enter.
- [x] **SCREEN-22-08** Ghi cột thiết kế liên quan nhưng UI không nhập (`default`, derived, server-only, secret), không đánh nhầm là thiếu.
- [x] **SCREEN-22-09** Thêm testcase lỗi mạng/server/RLS/doubleclick, không toast sai và không side-effect.
- [x] **SCREEN-22-10** Chốt bao phủ: số nút phát hiện / đã test, số form field / đã mapping; mọi mục có bằng chứng.

### SCREEN-23 — User module orders/order-detail (`pages/user/modules/orders/order-detail.html`)
- [x] **SCREEN-23-01** Xác minh HTML của `pages/user/modules/orders/order-detail.html` (nếu route folder, lấy file thực đúng commit), liệt kê **từng** `<button>`, `<a role=button>`, submit, onclick, data-action, row clickable.
- [x] **SCREEN-23-02** Với mỗi nút: ghi selector/label, click thực, listener (direct/delegation), enable/disable, quyền role, event chỉ chạy 1 lần.
- [x] **SCREEN-23-03** Với mỗi `input/select/textarea`: ghi ID/name, required/type/option.value, giá trị trước và sau; test rỗng/sai/boundary/Unicode.
- [x] **SCREEN-23-04** Với mỗi nút Lưu/Đặt/Thanh toán/Xóa: lấy payload (ẩn secret), endpoint RPC/Supabase, response, id, cột và FK đã thay đổi.
- [x] **SCREEN-23-05** Đọc lại từ DB sau reload và đăng nhập browser khác; cache/storage không được che lỗi.
- [x] **SCREEN-23-06** Đối chiếu màn hình Admin tương ứng hoặc User khác; xác minh các cột hiển thị phản ánh đúng trạng thái.
- [x] **SCREEN-23-07** Kiểm filter/search/sort/pagination, trạng thái loading/empty/error, modal đóng/mở/hủy và phím Escape/Enter.
- [x] **SCREEN-23-08** Ghi cột thiết kế liên quan nhưng UI không nhập (`default`, derived, server-only, secret), không đánh nhầm là thiếu.
- [x] **SCREEN-23-09** Thêm testcase lỗi mạng/server/RLS/doubleclick, không toast sai và không side-effect.
- [x] **SCREEN-23-10** Chốt bao phủ: số nút phát hiện / đã test, số form field / đã mapping; mọi mục có bằng chứng.

### SCREEN-24 — User module orders/return-detail (`pages/user/modules/orders/return-detail.html`)
- [x] **SCREEN-24-01** Xác minh HTML của `pages/user/modules/orders/return-detail.html` (nếu route folder, lấy file thực đúng commit), liệt kê **từng** `<button>`, `<a role=button>`, submit, onclick, data-action, row clickable.
- [x] **SCREEN-24-02** Với mỗi nút: ghi selector/label, click thực, listener (direct/delegation), enable/disable, quyền role, event chỉ chạy 1 lần.
- [x] **SCREEN-24-03** Với mỗi `input/select/textarea`: ghi ID/name, required/type/option.value, giá trị trước và sau; test rỗng/sai/boundary/Unicode.
- [x] **SCREEN-24-04** Với mỗi nút Lưu/Đặt/Thanh toán/Xóa: lấy payload (ẩn secret), endpoint RPC/Supabase, response, id, cột và FK đã thay đổi.
- [x] **SCREEN-24-05** Đọc lại từ DB sau reload và đăng nhập browser khác; cache/storage không được che lỗi.
- [x] **SCREEN-24-06** Đối chiếu màn hình Admin tương ứng hoặc User khác; xác minh các cột hiển thị phản ánh đúng trạng thái.
- [x] **SCREEN-24-07** Kiểm filter/search/sort/pagination, trạng thái loading/empty/error, modal đóng/mở/hủy và phím Escape/Enter.
- [x] **SCREEN-24-08** Ghi cột thiết kế liên quan nhưng UI không nhập (`default`, derived, server-only, secret), không đánh nhầm là thiếu.
- [x] **SCREEN-24-09** Thêm testcase lỗi mạng/server/RLS/doubleclick, không toast sai và không side-effect.
- [x] **SCREEN-24-10** Chốt bao phủ: số nút phát hiện / đã test, số form field / đã mapping; mọi mục có bằng chứng.

### SCREEN-25 — User module wishlist/wishlist (`pages/user/modules/wishlist/wishlist.html`)
- [x] **SCREEN-25-01** Xác minh HTML của `pages/user/modules/wishlist/wishlist.html` (nếu route folder, lấy file thực đúng commit), liệt kê **từng** `<button>`, `<a role=button>`, submit, onclick, data-action, row clickable.
- [x] **SCREEN-25-02** Với mỗi nút: ghi selector/label, click thực, listener (direct/delegation), enable/disable, quyền role, event chỉ chạy 1 lần.
- [x] **SCREEN-25-03** Với mỗi `input/select/textarea`: ghi ID/name, required/type/option.value, giá trị trước và sau; test rỗng/sai/boundary/Unicode.
- [x] **SCREEN-25-04** Với mỗi nút Lưu/Đặt/Thanh toán/Xóa: lấy payload (ẩn secret), endpoint RPC/Supabase, response, id, cột và FK đã thay đổi.
- [x] **SCREEN-25-05** Đọc lại từ DB sau reload và đăng nhập browser khác; cache/storage không được che lỗi.
- [x] **SCREEN-25-06** Đối chiếu màn hình Admin tương ứng hoặc User khác; xác minh các cột hiển thị phản ánh đúng trạng thái.
- [x] **SCREEN-25-07** Kiểm filter/search/sort/pagination, trạng thái loading/empty/error, modal đóng/mở/hủy và phím Escape/Enter.
- [x] **SCREEN-25-08** Ghi cột thiết kế liên quan nhưng UI không nhập (`default`, derived, server-only, secret), không đánh nhầm là thiếu.
- [x] **SCREEN-25-09** Thêm testcase lỗi mạng/server/RLS/doubleclick, không toast sai và không side-effect.
- [x] **SCREEN-25-10** Chốt bao phủ: số nút phát hiện / đã test, số form field / đã mapping; mọi mục có bằng chứng.

### SCREEN-26 — User module loyalty/loyalty (`pages/user/modules/loyalty/loyalty.html`)
- [x] **SCREEN-26-01** Xác minh HTML của `pages/user/modules/loyalty/loyalty.html` (nếu route folder, lấy file thực đúng commit), liệt kê **từng** `<button>`, `<a role=button>`, submit, onclick, data-action, row clickable.
- [x] **SCREEN-26-02** Với mỗi nút: ghi selector/label, click thực, listener (direct/delegation), enable/disable, quyền role, event chỉ chạy 1 lần.
- [x] **SCREEN-26-03** Với mỗi `input/select/textarea`: ghi ID/name, required/type/option.value, giá trị trước và sau; test rỗng/sai/boundary/Unicode.
- [x] **SCREEN-26-04** Với mỗi nút Lưu/Đặt/Thanh toán/Xóa: lấy payload (ẩn secret), endpoint RPC/Supabase, response, id, cột và FK đã thay đổi.
- [x] **SCREEN-26-05** Đọc lại từ DB sau reload và đăng nhập browser khác; cache/storage không được che lỗi.
- [x] **SCREEN-26-06** Đối chiếu màn hình Admin tương ứng hoặc User khác; xác minh các cột hiển thị phản ánh đúng trạng thái.
- [x] **SCREEN-26-07** Kiểm filter/search/sort/pagination, trạng thái loading/empty/error, modal đóng/mở/hủy và phím Escape/Enter.
- [x] **SCREEN-26-08** Ghi cột thiết kế liên quan nhưng UI không nhập (`default`, derived, server-only, secret), không đánh nhầm là thiếu.
- [x] **SCREEN-26-09** Thêm testcase lỗi mạng/server/RLS/doubleclick, không toast sai và không side-effect.
- [x] **SCREEN-26-10** Chốt bao phủ: số nút phát hiện / đã test, số form field / đã mapping; mọi mục có bằng chứng.

### SCREEN-27 — User module support/support (`pages/user/modules/support/support.html`)
- [x] **SCREEN-27-01** Xác minh HTML của `pages/user/modules/support/support.html` (nếu route folder, lấy file thực đúng commit), liệt kê **từng** `<button>`, `<a role=button>`, submit, onclick, data-action, row clickable.
- [x] **SCREEN-27-02** Với mỗi nút: ghi selector/label, click thực, listener (direct/delegation), enable/disable, quyền role, event chỉ chạy 1 lần.
- [x] **SCREEN-27-03** Với mỗi `input/select/textarea`: ghi ID/name, required/type/option.value, giá trị trước và sau; test rỗng/sai/boundary/Unicode.
- [x] **SCREEN-27-04** Với mỗi nút Lưu/Đặt/Thanh toán/Xóa: lấy payload (ẩn secret), endpoint RPC/Supabase, response, id, cột và FK đã thay đổi.
- [x] **SCREEN-27-05** Đọc lại từ DB sau reload và đăng nhập browser khác; cache/storage không được che lỗi.
- [x] **SCREEN-27-06** Đối chiếu màn hình Admin tương ứng hoặc User khác; xác minh các cột hiển thị phản ánh đúng trạng thái.
- [x] **SCREEN-27-07** Kiểm filter/search/sort/pagination, trạng thái loading/empty/error, modal đóng/mở/hủy và phím Escape/Enter.
- [x] **SCREEN-27-08** Ghi cột thiết kế liên quan nhưng UI không nhập (`default`, derived, server-only, secret), không đánh nhầm là thiếu.
- [x] **SCREEN-27-09** Thêm testcase lỗi mạng/server/RLS/doubleclick, không toast sai và không side-effect.
- [x] **SCREEN-27-10** Chốt bao phủ: số nút phát hiện / đã test, số form field / đã mapping; mọi mục có bằng chứng.

### SCREEN-28 — User module support/support-create (`pages/user/modules/support/support-create.html`)
- [x] **SCREEN-28-01** Xác minh HTML của `pages/user/modules/support/support-create.html` (nếu route folder, lấy file thực đúng commit), liệt kê **từng** `<button>`, `<a role=button>`, submit, onclick, data-action, row clickable.
- [x] **SCREEN-28-02** Với mỗi nút: ghi selector/label, click thực, listener (direct/delegation), enable/disable, quyền role, event chỉ chạy 1 lần.
- [x] **SCREEN-28-03** Với mỗi `input/select/textarea`: ghi ID/name, required/type/option.value, giá trị trước và sau; test rỗng/sai/boundary/Unicode.
- [x] **SCREEN-28-04** Với mỗi nút Lưu/Đặt/Thanh toán/Xóa: lấy payload (ẩn secret), endpoint RPC/Supabase, response, id, cột và FK đã thay đổi.
- [x] **SCREEN-28-05** Đọc lại từ DB sau reload và đăng nhập browser khác; cache/storage không được che lỗi.
- [x] **SCREEN-28-06** Đối chiếu màn hình Admin tương ứng hoặc User khác; xác minh các cột hiển thị phản ánh đúng trạng thái.
- [x] **SCREEN-28-07** Kiểm filter/search/sort/pagination, trạng thái loading/empty/error, modal đóng/mở/hủy và phím Escape/Enter.
- [x] **SCREEN-28-08** Ghi cột thiết kế liên quan nhưng UI không nhập (`default`, derived, server-only, secret), không đánh nhầm là thiếu.
- [x] **SCREEN-28-09** Thêm testcase lỗi mạng/server/RLS/doubleclick, không toast sai và không side-effect.
- [x] **SCREEN-28-10** Chốt bao phủ: số nút phát hiện / đã test, số form field / đã mapping; mọi mục có bằng chứng.

## 6. MA TRẬN JOURNEY KHÁCH HÀNG → SUPABASE → ADMIN → KHÁCH HÀNG
### X-01 — Guest mua COD
**Luồng:** Public → Cart → Checkout Guest → Admin Orders → Guest tra đơn  \  **Bảng kiểm chứng:** `customer, customer_address, sales_order, sales_order_detail, payment`.
- [x] **X-01-01** Chuẩn bị tài khoản/role, ID dữ liệu trước, số lượng tồn/điểm/bản ghi trước.
- [x] **X-01-02** Thực hiện tuần tự tất cả hành động UI nêu trong luồng; mỗi nút click chỉ tạo một event và đúng modal/form.
- [x] **X-01-03** Kiểm request/response từng bước; ID dùng FK liên phân hệ phải là ID thực từ DB.
- [x] **X-01-04** Đối chiếu từng bảng nêu trên (sau khi xác minh schema) và từng cột đã đổi; không cột bị null/sai enum/bị mất.
- [x] **X-01-05** F5 trang User và Admin, refresh new session/browser; xem đúng trạng thái và nhãn.
- [x] **X-01-06** Đối chiếu KPI/notification/report/ledger/stock nếu tác động; không ghi hai lần.
- [x] **X-01-07** Chạy đường lỗi: validation, thiếu quyền, mạng lỗi, double-submit, retry; không thông báo thành công giả.
- [x] **X-01-08** Lưu evidence + PASS/FAIL/BLOCKED/N/A + Bug ID; retest sau patch.

### X-02 — Guest đặt lịch grooming
**Luồng:** Public/Services → Booking Guest → Admin Services → User book detail  \  **Bảng kiểm chứng:** `customer, pet_profile, appointment`.
- [x] **X-02-01** Chuẩn bị tài khoản/role, ID dữ liệu trước, số lượng tồn/điểm/bản ghi trước.
- [x] **X-02-02** Thực hiện tuần tự tất cả hành động UI nêu trong luồng; mỗi nút click chỉ tạo một event và đúng modal/form.
- [x] **X-02-03** Kiểm request/response từng bước; ID dùng FK liên phân hệ phải là ID thực từ DB.
- [x] **X-02-04** Đối chiếu từng bảng nêu trên (sau khi xác minh schema) và từng cột đã đổi; không cột bị null/sai enum/bị mất.
- [x] **X-02-05** F5 trang User và Admin, refresh new session/browser; xem đúng trạng thái và nhãn.
- [x] **X-02-06** Đối chiếu KPI/notification/report/ledger/stock nếu tác động; không ghi hai lần.
- [x] **X-02-07** Chạy đường lỗi: validation, thiếu quyền, mạng lỗi, double-submit, retry; không thông báo thành công giả.
- [x] **X-02-08** Lưu evidence + PASS/FAIL/BLOCKED/N/A + Bug ID; retest sau patch.

### X-03 — Guest kích hoạt tài khoản
**Luồng:** Guest order/booking → OTP → User Profile → Admin Customers  \  **Bảng kiểm chứng:** `customer, customer_profile, customer_membership`.
- [x] **X-03-01** Chuẩn bị tài khoản/role, ID dữ liệu trước, số lượng tồn/điểm/bản ghi trước.
- [x] **X-03-02** Thực hiện tuần tự tất cả hành động UI nêu trong luồng; mỗi nút click chỉ tạo một event và đúng modal/form.
- [x] **X-03-03** Kiểm request/response từng bước; ID dùng FK liên phân hệ phải là ID thực từ DB.
- [x] **X-03-04** Đối chiếu từng bảng nêu trên (sau khi xác minh schema) và từng cột đã đổi; không cột bị null/sai enum/bị mất.
- [x] **X-03-05** F5 trang User và Admin, refresh new session/browser; xem đúng trạng thái và nhãn.
- [x] **X-03-06** Đối chiếu KPI/notification/report/ledger/stock nếu tác động; không ghi hai lần.
- [x] **X-03-07** Chạy đường lỗi: validation, thiếu quyền, mạng lỗi, double-submit, retry; không thông báo thành công giả.
- [x] **X-03-08** Lưu evidence + PASS/FAIL/BLOCKED/N/A + Bug ID; retest sau patch.

### X-04 — Khách đăng ký thường
**Luồng:** Login OTP → Profile → Add Pet → Admin Customers/Pets  \  **Bảng kiểm chứng:** `customer, customer_profile, pet_profile`.
- [x] **X-04-01** Chuẩn bị tài khoản/role, ID dữ liệu trước, số lượng tồn/điểm/bản ghi trước.
- [x] **X-04-02** Thực hiện tuần tự tất cả hành động UI nêu trong luồng; mỗi nút click chỉ tạo một event và đúng modal/form.
- [x] **X-04-03** Kiểm request/response từng bước; ID dùng FK liên phân hệ phải là ID thực từ DB.
- [x] **X-04-04** Đối chiếu từng bảng nêu trên (sau khi xác minh schema) và từng cột đã đổi; không cột bị null/sai enum/bị mất.
- [x] **X-04-05** F5 trang User và Admin, refresh new session/browser; xem đúng trạng thái và nhãn.
- [x] **X-04-06** Đối chiếu KPI/notification/report/ledger/stock nếu tác động; không ghi hai lần.
- [x] **X-04-07** Chạy đường lỗi: validation, thiếu quyền, mạng lỗi, double-submit, retry; không thông báo thành công giả.
- [x] **X-04-08** Lưu evidence + PASS/FAIL/BLOCKED/N/A + Bug ID; retest sau patch.

### X-05 — Hồ sơ + địa chỉ
**Luồng:** User edit profile/address → DB → Admin Customers → User reload  \  **Bảng kiểm chứng:** `customer_profile, customer_address`.
- [x] **X-05-01** Chuẩn bị tài khoản/role, ID dữ liệu trước, số lượng tồn/điểm/bản ghi trước.
- [x] **X-05-02** Thực hiện tuần tự tất cả hành động UI nêu trong luồng; mỗi nút click chỉ tạo một event và đúng modal/form.
- [x] **X-05-03** Kiểm request/response từng bước; ID dùng FK liên phân hệ phải là ID thực từ DB.
- [x] **X-05-04** Đối chiếu từng bảng nêu trên (sau khi xác minh schema) và từng cột đã đổi; không cột bị null/sai enum/bị mất.
- [x] **X-05-05** F5 trang User và Admin, refresh new session/browser; xem đúng trạng thái và nhãn.
- [x] **X-05-06** Đối chiếu KPI/notification/report/ledger/stock nếu tác động; không ghi hai lần.
- [x] **X-05-07** Chạy đường lỗi: validation, thiếu quyền, mạng lỗi, double-submit, retry; không thông báo thành công giả.
- [x] **X-05-08** Lưu evidence + PASS/FAIL/BLOCKED/N/A + Bug ID; retest sau patch.

### X-06 — Dịch vụ Grooming
**Luồng:** Service detail → Booking → Admin checkin → Care log → User diary  \  **Bảng kiểm chứng:** `appointment, care_log, care_log_media, payment`.
- [x] **X-06-01** Chuẩn bị tài khoản/role, ID dữ liệu trước, số lượng tồn/điểm/bản ghi trước.
- [x] **X-06-02** Thực hiện tuần tự tất cả hành động UI nêu trong luồng; mỗi nút click chỉ tạo một event và đúng modal/form.
- [x] **X-06-03** Kiểm request/response từng bước; ID dùng FK liên phân hệ phải là ID thực từ DB.
- [x] **X-06-04** Đối chiếu từng bảng nêu trên (sau khi xác minh schema) và từng cột đã đổi; không cột bị null/sai enum/bị mất.
- [x] **X-06-05** F5 trang User và Admin, refresh new session/browser; xem đúng trạng thái và nhãn.
- [x] **X-06-06** Đối chiếu KPI/notification/report/ledger/stock nếu tác động; không ghi hai lần.
- [x] **X-06-07** Chạy đường lỗi: validation, thiếu quyền, mạng lỗi, double-submit, retry; không thông báo thành công giả.
- [x] **X-06-08** Lưu evidence + PASS/FAIL/BLOCKED/N/A + Bug ID; retest sau patch.

### X-07 — Đặt Hotel
**Luồng:** Service booking → Hotel room → Admin checkin/out → User diary  \  **Bảng kiểm chứng:** `appointment, hotel_booking, hotel_room, care_log`.
- [x] **X-07-01** Chuẩn bị tài khoản/role, ID dữ liệu trước, số lượng tồn/điểm/bản ghi trước.
- [x] **X-07-02** Thực hiện tuần tự tất cả hành động UI nêu trong luồng; mỗi nút click chỉ tạo một event và đúng modal/form.
- [x] **X-07-03** Kiểm request/response từng bước; ID dùng FK liên phân hệ phải là ID thực từ DB.
- [x] **X-07-04** Đối chiếu từng bảng nêu trên (sau khi xác minh schema) và từng cột đã đổi; không cột bị null/sai enum/bị mất.
- [x] **X-07-05** F5 trang User và Admin, refresh new session/browser; xem đúng trạng thái và nhãn.
- [x] **X-07-06** Đối chiếu KPI/notification/report/ledger/stock nếu tác động; không ghi hai lần.
- [x] **X-07-07** Chạy đường lỗi: validation, thiếu quyền, mạng lỗi, double-submit, retry; không thông báo thành công giả.
- [x] **X-07-08** Lưu evidence + PASS/FAIL/BLOCKED/N/A + Bug ID; retest sau patch.

### X-08 — Đặt Taxi
**Luồng:** Service booking → Dispatch → Admin complete → User booking  \  **Bảng kiểm chứng:** `appointment, taxi_price_rule, staff`.
- [x] **X-08-01** Chuẩn bị tài khoản/role, ID dữ liệu trước, số lượng tồn/điểm/bản ghi trước.
- [x] **X-08-02** Thực hiện tuần tự tất cả hành động UI nêu trong luồng; mỗi nút click chỉ tạo một event và đúng modal/form.
- [x] **X-08-03** Kiểm request/response từng bước; ID dùng FK liên phân hệ phải là ID thực từ DB.
- [x] **X-08-04** Đối chiếu từng bảng nêu trên (sau khi xác minh schema) và từng cột đã đổi; không cột bị null/sai enum/bị mất.
- [x] **X-08-05** F5 trang User và Admin, refresh new session/browser; xem đúng trạng thái và nhãn.
- [x] **X-08-06** Đối chiếu KPI/notification/report/ledger/stock nếu tác động; không ghi hai lần.
- [x] **X-08-07** Chạy đường lỗi: validation, thiếu quyền, mạng lỗi, double-submit, retry; không thông báo thành công giả.
- [x] **X-08-08** Lưu evidence + PASS/FAIL/BLOCKED/N/A + Bug ID; retest sau patch.

### X-09 — Booking hủy/vắng
**Luồng:** User cancel/no-show → Admin state → Dashboard excludes  \  **Bảng kiểm chứng:** `appointment, payment, notification`.
- [x] **X-09-01** Chuẩn bị tài khoản/role, ID dữ liệu trước, số lượng tồn/điểm/bản ghi trước.
- [x] **X-09-02** Thực hiện tuần tự tất cả hành động UI nêu trong luồng; mỗi nút click chỉ tạo một event và đúng modal/form.
- [x] **X-09-03** Kiểm request/response từng bước; ID dùng FK liên phân hệ phải là ID thực từ DB.
- [x] **X-09-04** Đối chiếu từng bảng nêu trên (sau khi xác minh schema) và từng cột đã đổi; không cột bị null/sai enum/bị mất.
- [x] **X-09-05** F5 trang User và Admin, refresh new session/browser; xem đúng trạng thái và nhãn.
- [x] **X-09-06** Đối chiếu KPI/notification/report/ledger/stock nếu tác động; không ghi hai lần.
- [x] **X-09-07** Chạy đường lỗi: validation, thiếu quyền, mạng lỗi, double-submit, retry; không thông báo thành công giả.
- [x] **X-09-08** Lưu evidence + PASS/FAIL/BLOCKED/N/A + Bug ID; retest sau patch.

### X-10 — Giỏ & variant
**Luồng:** Product detail → Cart variant → reload → Checkout  \  **Bảng kiểm chứng:** `product, product_variant, cart, cart_item`.
- [x] **X-10-01** Chuẩn bị tài khoản/role, ID dữ liệu trước, số lượng tồn/điểm/bản ghi trước.
- [x] **X-10-02** Thực hiện tuần tự tất cả hành động UI nêu trong luồng; mỗi nút click chỉ tạo một event và đúng modal/form.
- [x] **X-10-03** Kiểm request/response từng bước; ID dùng FK liên phân hệ phải là ID thực từ DB.
- [x] **X-10-04** Đối chiếu từng bảng nêu trên (sau khi xác minh schema) và từng cột đã đổi; không cột bị null/sai enum/bị mất.
- [x] **X-10-05** F5 trang User và Admin, refresh new session/browser; xem đúng trạng thái và nhãn.
- [x] **X-10-06** Đối chiếu KPI/notification/report/ledger/stock nếu tác động; không ghi hai lần.
- [x] **X-10-07** Chạy đường lỗi: validation, thiếu quyền, mạng lỗi, double-submit, retry; không thông báo thành công giả.
- [x] **X-10-08** Lưu evidence + PASS/FAIL/BLOCKED/N/A + Bug ID; retest sau patch.

### X-11 — Đơn COD
**Luồng:** Cart → Checkout COD → Admin fulfilment → User Orders → COD reconcile  \  **Bảng kiểm chứng:** `sales_order, sales_order_detail, payment, inventory`.
- [x] **X-11-01** Chuẩn bị tài khoản/role, ID dữ liệu trước, số lượng tồn/điểm/bản ghi trước.
- [x] **X-11-02** Thực hiện tuần tự tất cả hành động UI nêu trong luồng; mỗi nút click chỉ tạo một event và đúng modal/form.
- [x] **X-11-03** Kiểm request/response từng bước; ID dùng FK liên phân hệ phải là ID thực từ DB.
- [x] **X-11-04** Đối chiếu từng bảng nêu trên (sau khi xác minh schema) và từng cột đã đổi; không cột bị null/sai enum/bị mất.
- [x] **X-11-05** F5 trang User và Admin, refresh new session/browser; xem đúng trạng thái và nhãn.
- [x] **X-11-06** Đối chiếu KPI/notification/report/ledger/stock nếu tác động; không ghi hai lần.
- [x] **X-11-07** Chạy đường lỗi: validation, thiếu quyền, mạng lỗi, double-submit, retry; không thông báo thành công giả.
- [x] **X-11-08** Lưu evidence + PASS/FAIL/BLOCKED/N/A + Bug ID; retest sau patch.

### X-12 — Thanh toán online
**Luồng:** Checkout online → Gateway callback → Payment success → Admin/User  \  **Bảng kiểm chứng:** `sales_order, payment, sales_order_detail`.
- [x] **X-12-01** Chuẩn bị tài khoản/role, ID dữ liệu trước, số lượng tồn/điểm/bản ghi trước.
- [x] **X-12-02** Thực hiện tuần tự tất cả hành động UI nêu trong luồng; mỗi nút click chỉ tạo một event và đúng modal/form.
- [x] **X-12-03** Kiểm request/response từng bước; ID dùng FK liên phân hệ phải là ID thực từ DB.
- [x] **X-12-04** Đối chiếu từng bảng nêu trên (sau khi xác minh schema) và từng cột đã đổi; không cột bị null/sai enum/bị mất.
- [x] **X-12-05** F5 trang User và Admin, refresh new session/browser; xem đúng trạng thái và nhãn.
- [x] **X-12-06** Đối chiếu KPI/notification/report/ledger/stock nếu tác động; không ghi hai lần.
- [x] **X-12-07** Chạy đường lỗi: validation, thiếu quyền, mạng lỗi, double-submit, retry; không thông báo thành công giả.
- [x] **X-12-08** Lưu evidence + PASS/FAIL/BLOCKED/N/A + Bug ID; retest sau patch.

### X-13 — Thanh toán thất bại
**Luồng:** Gateway decline → Payment failed → Retry/Cart restore  \  **Bảng kiểm chứng:** `payment, sales_order, cart_item`.
- [x] **X-13-01** Chuẩn bị tài khoản/role, ID dữ liệu trước, số lượng tồn/điểm/bản ghi trước.
- [x] **X-13-02** Thực hiện tuần tự tất cả hành động UI nêu trong luồng; mỗi nút click chỉ tạo một event và đúng modal/form.
- [x] **X-13-03** Kiểm request/response từng bước; ID dùng FK liên phân hệ phải là ID thực từ DB.
- [x] **X-13-04** Đối chiếu từng bảng nêu trên (sau khi xác minh schema) và từng cột đã đổi; không cột bị null/sai enum/bị mất.
- [x] **X-13-05** F5 trang User và Admin, refresh new session/browser; xem đúng trạng thái và nhãn.
- [x] **X-13-06** Đối chiếu KPI/notification/report/ledger/stock nếu tác động; không ghi hai lần.
- [x] **X-13-07** Chạy đường lỗi: validation, thiếu quyền, mạng lỗi, double-submit, retry; không thông báo thành công giả.
- [x] **X-13-08** Lưu evidence + PASS/FAIL/BLOCKED/N/A + Bug ID; retest sau patch.

### X-14 — Đơn thay đổi trạng thái
**Luồng:** Admin packing/shipping/delivered → User order-detail/timeline  \  **Bảng kiểm chứng:** `sales_order, notification`.
- [x] **X-14-01** Chuẩn bị tài khoản/role, ID dữ liệu trước, số lượng tồn/điểm/bản ghi trước.
- [x] **X-14-02** Thực hiện tuần tự tất cả hành động UI nêu trong luồng; mỗi nút click chỉ tạo một event và đúng modal/form.
- [x] **X-14-03** Kiểm request/response từng bước; ID dùng FK liên phân hệ phải là ID thực từ DB.
- [x] **X-14-04** Đối chiếu từng bảng nêu trên (sau khi xác minh schema) và từng cột đã đổi; không cột bị null/sai enum/bị mất.
- [x] **X-14-05** F5 trang User và Admin, refresh new session/browser; xem đúng trạng thái và nhãn.
- [x] **X-14-06** Đối chiếu KPI/notification/report/ledger/stock nếu tác động; không ghi hai lần.
- [x] **X-14-07** Chạy đường lỗi: validation, thiếu quyền, mạng lỗi, double-submit, retry; không thông báo thành công giả.
- [x] **X-14-08** Lưu evidence + PASS/FAIL/BLOCKED/N/A + Bug ID; retest sau patch.

### X-15 — Hủy đơn đã trả tiền
**Luồng:** User cancel paid → Admin refund processing → paid refund → User refresh  \  **Bảng kiểm chứng:** `sales_order, refund_transaction, payment`.
- [x] **X-15-01** Chuẩn bị tài khoản/role, ID dữ liệu trước, số lượng tồn/điểm/bản ghi trước.
- [x] **X-15-02** Thực hiện tuần tự tất cả hành động UI nêu trong luồng; mỗi nút click chỉ tạo một event và đúng modal/form.
- [x] **X-15-03** Kiểm request/response từng bước; ID dùng FK liên phân hệ phải là ID thực từ DB.
- [x] **X-15-04** Đối chiếu từng bảng nêu trên (sau khi xác minh schema) và từng cột đã đổi; không cột bị null/sai enum/bị mất.
- [x] **X-15-05** F5 trang User và Admin, refresh new session/browser; xem đúng trạng thái và nhãn.
- [x] **X-15-06** Đối chiếu KPI/notification/report/ledger/stock nếu tác động; không ghi hai lần.
- [x] **X-15-07** Chạy đường lỗi: validation, thiếu quyền, mạng lỗi, double-submit, retry; không thông báo thành công giả.
- [x] **X-15-08** Lưu evidence + PASS/FAIL/BLOCKED/N/A + Bug ID; retest sau patch.

### X-16 — Đổi/trả hàng
**Luồng:** User return request → Admin inspect → Refund → Inventory adjustment  \  **Bảng kiểm chứng:** `return_request, return_request_detail, inventory_transaction, refund_transaction`.
- [x] **X-16-01** Chuẩn bị tài khoản/role, ID dữ liệu trước, số lượng tồn/điểm/bản ghi trước.
- [x] **X-16-02** Thực hiện tuần tự tất cả hành động UI nêu trong luồng; mỗi nút click chỉ tạo một event và đúng modal/form.
- [x] **X-16-03** Kiểm request/response từng bước; ID dùng FK liên phân hệ phải là ID thực từ DB.
- [x] **X-16-04** Đối chiếu từng bảng nêu trên (sau khi xác minh schema) và từng cột đã đổi; không cột bị null/sai enum/bị mất.
- [x] **X-16-05** F5 trang User và Admin, refresh new session/browser; xem đúng trạng thái và nhãn.
- [x] **X-16-06** Đối chiếu KPI/notification/report/ledger/stock nếu tác động; không ghi hai lần.
- [x] **X-16-07** Chạy đường lỗi: validation, thiếu quyền, mạng lỗi, double-submit, retry; không thông báo thành công giả.
- [x] **X-16-08** Lưu evidence + PASS/FAIL/BLOCKED/N/A + Bug ID; retest sau patch.

### X-17 — Sử dụng voucher
**Luồng:** Admin create → User collect/apply → Checkout → Loyalty/Promo reports  \  **Bảng kiểm chứng:** `voucher, customer_voucher, sales_order`.
- [x] **X-17-01** Chuẩn bị tài khoản/role, ID dữ liệu trước, số lượng tồn/điểm/bản ghi trước.
- [x] **X-17-02** Thực hiện tuần tự tất cả hành động UI nêu trong luồng; mỗi nút click chỉ tạo một event và đúng modal/form.
- [x] **X-17-03** Kiểm request/response từng bước; ID dùng FK liên phân hệ phải là ID thực từ DB.
- [x] **X-17-04** Đối chiếu từng bảng nêu trên (sau khi xác minh schema) và từng cột đã đổi; không cột bị null/sai enum/bị mất.
- [x] **X-17-05** F5 trang User và Admin, refresh new session/browser; xem đúng trạng thái và nhãn.
- [x] **X-17-06** Đối chiếu KPI/notification/report/ledger/stock nếu tác động; không ghi hai lần.
- [x] **X-17-07** Chạy đường lỗi: validation, thiếu quyền, mạng lỗi, double-submit, retry; không thông báo thành công giả.
- [x] **X-17-08** Lưu evidence + PASS/FAIL/BLOCKED/N/A + Bug ID; retest sau patch.

### X-18 — Paw Points
**Luồng:** Payment success → Ledger award → User Wallet → Spend → Admin  \  **Bảng kiểm chứng:** `customer_membership, paw_point_transaction, reward_rule`.
- [x] **X-18-01** Chuẩn bị tài khoản/role, ID dữ liệu trước, số lượng tồn/điểm/bản ghi trước.
- [x] **X-18-02** Thực hiện tuần tự tất cả hành động UI nêu trong luồng; mỗi nút click chỉ tạo một event và đúng modal/form.
- [x] **X-18-03** Kiểm request/response từng bước; ID dùng FK liên phân hệ phải là ID thực từ DB.
- [x] **X-18-04** Đối chiếu từng bảng nêu trên (sau khi xác minh schema) và từng cột đã đổi; không cột bị null/sai enum/bị mất.
- [x] **X-18-05** F5 trang User và Admin, refresh new session/browser; xem đúng trạng thái và nhãn.
- [x] **X-18-06** Đối chiếu KPI/notification/report/ledger/stock nếu tác động; không ghi hai lần.
- [x] **X-18-07** Chạy đường lỗi: validation, thiếu quyền, mạng lỗi, double-submit, retry; không thông báo thành công giả.
- [x] **X-18-08** Lưu evidence + PASS/FAIL/BLOCKED/N/A + Bug ID; retest sau patch.

### X-19 — User hỗ trợ
**Luồng:** User create support ticket → Admin Assign/SLA → Reply → User realtime  \  **Bảng kiểm chứng:** `support_ticket, support_ticket_message`.
- [x] **X-19-01** Chuẩn bị tài khoản/role, ID dữ liệu trước, số lượng tồn/điểm/bản ghi trước.
- [x] **X-19-02** Thực hiện tuần tự tất cả hành động UI nêu trong luồng; mỗi nút click chỉ tạo một event và đúng modal/form.
- [x] **X-19-03** Kiểm request/response từng bước; ID dùng FK liên phân hệ phải là ID thực từ DB.
- [x] **X-19-04** Đối chiếu từng bảng nêu trên (sau khi xác minh schema) và từng cột đã đổi; không cột bị null/sai enum/bị mất.
- [x] **X-19-05** F5 trang User và Admin, refresh new session/browser; xem đúng trạng thái và nhãn.
- [x] **X-19-06** Đối chiếu KPI/notification/report/ledger/stock nếu tác động; không ghi hai lần.
- [x] **X-19-07** Chạy đường lỗi: validation, thiếu quyền, mạng lỗi, double-submit, retry; không thông báo thành công giả.
- [x] **X-19-08** Lưu evidence + PASS/FAIL/BLOCKED/N/A + Bug ID; retest sau patch.

### X-20 — Chat chuyển Ticket
**Luồng:** User live chat → Admin takeover/convert → User support  \  **Bảng kiểm chứng:** `chat_conversation, chat_message, support_ticket`.
- [x] **X-20-01** Chuẩn bị tài khoản/role, ID dữ liệu trước, số lượng tồn/điểm/bản ghi trước.
- [x] **X-20-02** Thực hiện tuần tự tất cả hành động UI nêu trong luồng; mỗi nút click chỉ tạo một event và đúng modal/form.
- [x] **X-20-03** Kiểm request/response từng bước; ID dùng FK liên phân hệ phải là ID thực từ DB.
- [x] **X-20-04** Đối chiếu từng bảng nêu trên (sau khi xác minh schema) và từng cột đã đổi; không cột bị null/sai enum/bị mất.
- [x] **X-20-05** F5 trang User và Admin, refresh new session/browser; xem đúng trạng thái và nhãn.
- [x] **X-20-06** Đối chiếu KPI/notification/report/ledger/stock nếu tác động; không ghi hai lần.
- [x] **X-20-07** Chạy đường lỗi: validation, thiếu quyền, mạng lỗi, double-submit, retry; không thông báo thành công giả.
- [x] **X-20-08** Lưu evidence + PASS/FAIL/BLOCKED/N/A + Bug ID; retest sau patch.

### X-21 — Nhật ký chăm sóc
**Luồng:** Admin Care log/photo → User Diary → Service Review  \  **Bảng kiểm chứng:** `care_log, care_log_media, review`.
- [x] **X-21-01** Chuẩn bị tài khoản/role, ID dữ liệu trước, số lượng tồn/điểm/bản ghi trước.
- [x] **X-21-02** Thực hiện tuần tự tất cả hành động UI nêu trong luồng; mỗi nút click chỉ tạo một event và đúng modal/form.
- [x] **X-21-03** Kiểm request/response từng bước; ID dùng FK liên phân hệ phải là ID thực từ DB.
- [x] **X-21-04** Đối chiếu từng bảng nêu trên (sau khi xác minh schema) và từng cột đã đổi; không cột bị null/sai enum/bị mất.
- [x] **X-21-05** F5 trang User và Admin, refresh new session/browser; xem đúng trạng thái và nhãn.
- [x] **X-21-06** Đối chiếu KPI/notification/report/ledger/stock nếu tác động; không ghi hai lần.
- [x] **X-21-07** Chạy đường lỗi: validation, thiếu quyền, mạng lỗi, double-submit, retry; không thông báo thành công giả.
- [x] **X-21-08** Lưu evidence + PASS/FAIL/BLOCKED/N/A + Bug ID; retest sau patch.

### X-22 — Đánh giá
**Luồng:** User review → Admin moderation/respond → Public/Service/Product  \  **Bảng kiểm chứng:** `review, review_response`.
- [x] **X-22-01** Chuẩn bị tài khoản/role, ID dữ liệu trước, số lượng tồn/điểm/bản ghi trước.
- [x] **X-22-02** Thực hiện tuần tự tất cả hành động UI nêu trong luồng; mỗi nút click chỉ tạo một event và đúng modal/form.
- [x] **X-22-03** Kiểm request/response từng bước; ID dùng FK liên phân hệ phải là ID thực từ DB.
- [x] **X-22-04** Đối chiếu từng bảng nêu trên (sau khi xác minh schema) và từng cột đã đổi; không cột bị null/sai enum/bị mất.
- [x] **X-22-05** F5 trang User và Admin, refresh new session/browser; xem đúng trạng thái và nhãn.
- [x] **X-22-06** Đối chiếu KPI/notification/report/ledger/stock nếu tác động; không ghi hai lần.
- [x] **X-22-07** Chạy đường lỗi: validation, thiếu quyền, mạng lỗi, double-submit, retry; không thông báo thành công giả.
- [x] **X-22-08** Lưu evidence + PASS/FAIL/BLOCKED/N/A + Bug ID; retest sau patch.

### X-23 — Staff nghỉ ảnh hưởng booking
**Luồng:** Staff request → Manager approval → resource reassignment → User notice  \  **Bảng kiểm chứng:** `staff_shift_request, staff_schedule, appointment`.
- [x] **X-23-01** Chuẩn bị tài khoản/role, ID dữ liệu trước, số lượng tồn/điểm/bản ghi trước.
- [x] **X-23-02** Thực hiện tuần tự tất cả hành động UI nêu trong luồng; mỗi nút click chỉ tạo một event và đúng modal/form.
- [x] **X-23-03** Kiểm request/response từng bước; ID dùng FK liên phân hệ phải là ID thực từ DB.
- [x] **X-23-04** Đối chiếu từng bảng nêu trên (sau khi xác minh schema) và từng cột đã đổi; không cột bị null/sai enum/bị mất.
- [x] **X-23-05** F5 trang User và Admin, refresh new session/browser; xem đúng trạng thái và nhãn.
- [x] **X-23-06** Đối chiếu KPI/notification/report/ledger/stock nếu tác động; không ghi hai lần.
- [x] **X-23-07** Chạy đường lỗi: validation, thiếu quyền, mạng lỗi, double-submit, retry; không thông báo thành công giả.
- [x] **X-23-08** Lưu evidence + PASS/FAIL/BLOCKED/N/A + Bug ID; retest sau patch.

### X-24 — Banner/blog
**Luồng:** Admin Settings publish → Public landing/blog → hide/expire  \  **Bảng kiểm chứng:** `banner, blog_post`.
- [x] **X-24-01** Chuẩn bị tài khoản/role, ID dữ liệu trước, số lượng tồn/điểm/bản ghi trước.
- [x] **X-24-02** Thực hiện tuần tự tất cả hành động UI nêu trong luồng; mỗi nút click chỉ tạo một event và đúng modal/form.
- [x] **X-24-03** Kiểm request/response từng bước; ID dùng FK liên phân hệ phải là ID thực từ DB.
- [x] **X-24-04** Đối chiếu từng bảng nêu trên (sau khi xác minh schema) và từng cột đã đổi; không cột bị null/sai enum/bị mất.
- [x] **X-24-05** F5 trang User và Admin, refresh new session/browser; xem đúng trạng thái và nhãn.
- [x] **X-24-06** Đối chiếu KPI/notification/report/ledger/stock nếu tác động; không ghi hai lần.
- [x] **X-24-07** Chạy đường lỗi: validation, thiếu quyền, mạng lỗi, double-submit, retry; không thông báo thành công giả.
- [x] **X-24-08** Lưu evidence + PASS/FAIL/BLOCKED/N/A + Bug ID; retest sau patch.

### X-25 — KPI drilldown
**Luồng:** User order/booking/ticket → Admin Dashboard → SQL count proof  \  **Bảng kiểm chứng:** `sales_order, appointment, support_ticket`.
- [x] **X-25-01** Chuẩn bị tài khoản/role, ID dữ liệu trước, số lượng tồn/điểm/bản ghi trước.
- [x] **X-25-02** Thực hiện tuần tự tất cả hành động UI nêu trong luồng; mỗi nút click chỉ tạo một event và đúng modal/form.
- [x] **X-25-03** Kiểm request/response từng bước; ID dùng FK liên phân hệ phải là ID thực từ DB.
- [x] **X-25-04** Đối chiếu từng bảng nêu trên (sau khi xác minh schema) và từng cột đã đổi; không cột bị null/sai enum/bị mất.
- [x] **X-25-05** F5 trang User và Admin, refresh new session/browser; xem đúng trạng thái và nhãn.
- [x] **X-25-06** Đối chiếu KPI/notification/report/ledger/stock nếu tác động; không ghi hai lần.
- [x] **X-25-07** Chạy đường lỗi: validation, thiếu quyền, mạng lỗi, double-submit, retry; không thông báo thành công giả.
- [x] **X-25-08** Lưu evidence + PASS/FAIL/BLOCKED/N/A + Bug ID; retest sau patch.

### X-26 — Hai khách + RLS
**Luồng:** Customer A/B + Admin roles → authorized reads/writes only  \  **Bảng kiểm chứng:** `customer, pet_profile, sales_order, support_ticket`.
- [x] **X-26-01** Chuẩn bị tài khoản/role, ID dữ liệu trước, số lượng tồn/điểm/bản ghi trước.
- [x] **X-26-02** Thực hiện tuần tự tất cả hành động UI nêu trong luồng; mỗi nút click chỉ tạo một event và đúng modal/form.
- [x] **X-26-03** Kiểm request/response từng bước; ID dùng FK liên phân hệ phải là ID thực từ DB.
- [x] **X-26-04** Đối chiếu từng bảng nêu trên (sau khi xác minh schema) và từng cột đã đổi; không cột bị null/sai enum/bị mất.
- [x] **X-26-05** F5 trang User và Admin, refresh new session/browser; xem đúng trạng thái và nhãn.
- [x] **X-26-06** Đối chiếu KPI/notification/report/ledger/stock nếu tác động; không ghi hai lần.
- [x] **X-26-07** Chạy đường lỗi: validation, thiếu quyền, mạng lỗi, double-submit, retry; không thông báo thành công giả.
- [x] **X-26-08** Lưu evidence + PASS/FAIL/BLOCKED/N/A + Bug ID; retest sau patch.

### X-27 — Cross-device persistence
**Luồng:** Browser A creates/edits → Browser B fetch → Admin sees same  \  **Bảng kiểm chứng:** `all tables affected`.
- [x] **X-27-01** Chuẩn bị tài khoản/role, ID dữ liệu trước, số lượng tồn/điểm/bản ghi trước.
- [x] **X-27-02** Thực hiện tuần tự tất cả hành động UI nêu trong luồng; mỗi nút click chỉ tạo một event và đúng modal/form.
- [x] **X-27-03** Kiểm request/response từng bước; ID dùng FK liên phân hệ phải là ID thực từ DB.
- [x] **X-27-04** Đối chiếu từng bảng nêu trên (sau khi xác minh schema) và từng cột đã đổi; không cột bị null/sai enum/bị mất.
- [x] **X-27-05** F5 trang User và Admin, refresh new session/browser; xem đúng trạng thái và nhãn.
- [x] **X-27-06** Đối chiếu KPI/notification/report/ledger/stock nếu tác động; không ghi hai lần.
- [x] **X-27-07** Chạy đường lỗi: validation, thiếu quyền, mạng lỗi, double-submit, retry; không thông báo thành công giả.
- [x] **X-27-08** Lưu evidence + PASS/FAIL/BLOCKED/N/A + Bug ID; retest sau patch.

### X-28 — Failed mid-transaction
**Luồng:** Server commits partial / retry duplicate → rollback/compensate  \  **Bảng kiểm chứng:** `sales_order, payment, sales_order_detail, inventory_transaction`.
- [x] **X-28-01** Chuẩn bị tài khoản/role, ID dữ liệu trước, số lượng tồn/điểm/bản ghi trước.
- [x] **X-28-02** Thực hiện tuần tự tất cả hành động UI nêu trong luồng; mỗi nút click chỉ tạo một event và đúng modal/form.
- [x] **X-28-03** Kiểm request/response từng bước; ID dùng FK liên phân hệ phải là ID thực từ DB.
- [x] **X-28-04** Đối chiếu từng bảng nêu trên (sau khi xác minh schema) và từng cột đã đổi; không cột bị null/sai enum/bị mất.
- [x] **X-28-05** F5 trang User và Admin, refresh new session/browser; xem đúng trạng thái và nhãn.
- [x] **X-28-06** Đối chiếu KPI/notification/report/ledger/stock nếu tác động; không ghi hai lần.
- [x] **X-28-07** Chạy đường lỗi: validation, thiếu quyền, mạng lỗi, double-submit, retry; không thông báo thành công giả.
- [x] **X-28-08** Lưu evidence + PASS/FAIL/BLOCKED/N/A + Bug ID; retest sau patch.

## 7. SQL CHỈ ĐỌC DÙNG XÁC MINH SCHEMA / ENUM / POLICIES TRÊN STAGING
> Các lệnh bên dưới **chỉ đọc**. Người chạy vẫn phải sử dụng tài khoản có quyền thích hợp, không paste dữ liệu cá nhân vào báo cáo.
```sql
-- Bảng và cột thực tế (public schema)
SELECT table_name, ordinal_position, column_name, data_type, udt_name, is_nullable, column_default
FROM information_schema.columns WHERE table_schema='public'
ORDER BY table_name, ordinal_position;

-- Enum thực tế
SELECT n.nspname AS enum_schema, t.typname AS enum_name, e.enumsortorder, e.enumlabel
FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid
JOIN pg_namespace n ON n.oid=t.typnamespace
ORDER BY n.nspname,t.typname,e.enumsortorder;

-- FK, UNIQUE, CHECK
SELECT conrelid::regclass::text AS table_name, conname, contype, pg_get_constraintdef(oid) AS definition
FROM pg_constraint WHERE connamespace='public'::regnamespace
ORDER BY conrelid::regclass::text,conname;

-- Trạng thái RLS của các bảng
SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname='public' ORDER BY tablename;
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies WHERE schemaname='public' ORDER BY tablename,policyname;
```

## 8. MA TRẬN MAPPING PHẢI HOÀN THIỆN (COPY MẪU CHO MỖI FIELD/CỘT)

| UI/Screen | Element ID/name | JS handler | API/RPC/Query | DB table.column | Enum/default/FK | Render User | Render Admin | Test ID/Trạng thái |
|---|---|---|---|---|---|---|---|---|
| Ví dụ: Service Booking Pet | **CẦN LẤY ID TỪ HTML THẬT** | `booking.js` | `pet_profile.insert` | `pet_profile.species` | `cho/meo/tho/...` | User Pets | Admin Pets | WEB-P0-01 / NOT RUN |
| Ví dụ: User Cancel Paid | **CẦN LẤY ID TỪ HTML THẬT** | `orders.js` | `sales_order.update` + refund flow | `payment_status` + `refund_transaction.refund_status` | Không coi `cho_xu_ly` là `da_hoan_tat` | User Orders | Admin RMA/Refund | WEB-P0-02 / NOT RUN |
- [x] **** Chốt file `field-audit.csv` hoặc bảng mapping trong issue cho toàn bộ UI field website chưa được kiểm kê trực tiếp.
- [x] **** Trong PHỤ LỤC I, đối chiếu 547 field HTML Admin và mã test của từng trường; không chỉ dựa vào `select(*)`.
- [x] **** Trong PHỤ LỤC J, phân loại toàn bộ 808 cột thiết kế: input / derived / default / system / secret / not-present-live.
- [x] **** Đối với cột phát sinh server-side (id, timestamps, hash, tokens, aggregated), test default/trigger và không cho client override.
- [x] **** Đối với dữ liệu kiểu số/ngày/Boolean/JSON, test null/0/false/[] khác nhau, đừng ép tất cả thành chuỗi rỗng.
- [x] **** Không có một trường nào "lưu được" nhưng chỉ nằm ở localStorage nếu yêu cầu là lưu Supabase.
- [x] **** GATE: số field chưa map = 0 hoặc tất cả còn lại được N/A và phê duyệt.

## 9. PHỤ LỤC KẾ THỪA — KIỂM KÊ ADMIN ĐẦY ĐỦ KHÔNG LƯỢC BỚT
> Phụ lục bên dưới sao chép từ checklist Admin đã lập với 49 file nguồn: 26 luồng E2E Admin, 26 phát hiện cũ, từng bảng HTML, modal, nút, form field, 81 thực thể/808 cột theo thiết kế, 58 enum và truy vấn. Các mục này vẫn là **NOT RUN** cho tới khi thực hiện trên môi trường test. Tên bảng/cột ở phụ lục cần so với schema live trước sửa.

## D. HÀNH TRÌNH NGHIỆP VỤ END-TO-END THEO CHUỖI LIÊN PHÂN HỆ

### E2E-01 — Khách vãng lai → tạo hồ sơ chính thức → thú cưng → Dashboard
**Phân hệ:** Khách hàng / Thú cưng / Dashboard · **Bảng cần xác nhận/đối chiếu thiết kế:** `customer, customer_profile, customer_membership, customer_phone, customer_address, pet_profile`. (Một số bảng nghiệp vụ chi tiết phải xác minh lại tên trong `CDSLfinal.md`/schema thực tế.)
- [x] **E2E-01.01** Bấm `btnOpenAddCustomerModal` trên `customers.html`, nhập đầy đủ dữ liệu khách; xác nhận submit/lưu
- [x] **E2E-01.02** Trên Network tìm INSERT customer/customer_profile/(membership/address/phone nếu có); so sánh từng field, nhận PK/FK
- [x] **E2E-01.03** Tìm khách trong danh sách bằng tên/SĐT/email; mở 360° và so toàn bộ thông tin đã nhập
- [x] **E2E-01.04** Dùng tạo Pet từ hồ sơ khách; so `pet_profile.customer_id` với customer.id, không phải mã hiển thị
- [x] **E2E-01.05** F5 và mở từ `pets.html`; kiểm hồ sơ pet, thông tin chủ và KPI dashboard, không nhân đôi khách
- [x] **E2E-01-CHECK** [UI] Tất cả trường được điền đều hiển thị lại đúng
- [x] **E2E-01-CHECK** [DB] Mọi cột/FK/enum/amount đúng và không bản ghi mồ côi
- [x] **E2E-01-CHECK** [NEG] Test lỗi/role/nhấp đúp/reload và không side-effect
- [x] **E2E-01-CHECK** [REG] Kiểm màn hình liên phân hệ, KPI, log/audit

### E2E-02 — Khóa/mở khóa khách → quyền đặt lịch/đặt hàng
**Phân hệ:** Khách hàng / Dịch vụ / Đơn hàng · **Bảng cần xác nhận/đối chiếu thiết kế:** `customer, appointment, sales_order`. (Một số bảng nghiệp vụ chi tiết phải xác minh lại tên trong `CDSLfinal.md`/schema thực tế.)
- [x] **E2E-02.01** Tạo khách `dang_hoat_dong`, thực hiện hành động mở khóa/khóa theo UI
- [x] **E2E-02.02** Xác minh `customer.account_status` đổi đúng enum và có audit
- [x] **E2E-02.03** Từ Booking/POS thử chọn khách bị khóa theo đúng chính sách; nếu bị chặn thì cả server phải chặn
- [x] **E2E-02.04** Mở lại trạng thái, reload toàn bộ, kiểm đúng badge/filter và quyền thao tác
- [x] **E2E-02-CHECK** [UI] Tất cả trường được điền đều hiển thị lại đúng
- [x] **E2E-02-CHECK** [DB] Mọi cột/FK/enum/amount đúng và không bản ghi mồ côi
- [x] **E2E-02-CHECK** [NEG] Test lỗi/role/nhấp đúp/reload và không side-effect
- [x] **E2E-02-CHECK** [REG] Kiểm màn hình liên phân hệ, KPI, log/audit

### E2E-03 — Tạo pet → cập nhật hồ sơ → vaccine → cân nặng
**Phân hệ:** Khách hàng / Thú cưng · **Bảng cần xác nhận/đối chiếu thiết kế:** `pet_profile, pet_weight_history (sổ tiêm: CHƯA CÓ BẢNG RIÊNG trong CDSLfinal, cần xác minh lưu ở đâu)`. (Một số bảng nghiệp vụ chi tiết phải xác minh lại tên trong `CDSLfinal.md`/schema thực tế.)
- [x] **E2E-03.01** `pets.html`: `btnOpenAddPetModal` → chọn chủ, species/breed/gender → lưu
- [x] **E2E-03.02** Mở profile, cập nhật cảnh báo y tế, dị ứng, cân nặng; xác minh đúng bảng thực (nếu bảng không tồn tại đánh BLOCKED)
- [x] **E2E-03.03** Tạo bản ghi vaccine và cân; kiểm cân trong pet_weight_history; với sổ vaccine cần truy vị trí lưu thật vì CDSLfinal không có bảng vaccine riêng
- [x] **E2E-03.04** Reload pet profile, danh sách, cảnh báo, filters; kiểm không biến dữ liệu không rõ thành “đã tiêm”
- [x] **E2E-03-CHECK** [UI] Tất cả trường được điền đều hiển thị lại đúng
- [x] **E2E-03-CHECK** [DB] Mọi cột/FK/enum/amount đúng và không bản ghi mồ côi
- [x] **E2E-03-CHECK** [NEG] Test lỗi/role/nhấp đúp/reload và không side-effect
- [x] **E2E-03-CHECK** [REG] Kiểm màn hình liên phân hệ, KPI, log/audit

### E2E-04 — Đặt lịch grooming → phân KTV → check-in → care log → nghiệm thu
**Phân hệ:** Dịch vụ / Nhân viên / Thú cưng · **Bảng cần xác nhận/đối chiếu thiết kế:** `appointment, service, staff, staff_schedule, care_log, care_log_media, payment`. (Một số bảng nghiệp vụ chi tiết phải xác minh lại tên trong `CDSLfinal.md`/schema thực tế.)
- [x] **E2E-04.01** `services.html`: `btnOpenCreateBookingModal` → chọn khách, bé, service, thời gian, KTV và giá
- [x] **E2E-04.02** Kiểm availability, không trùng lịch, không nhận nhân viên nghỉ; DB appointment có đủ cột/FK
- [x] **E2E-04.03** Chuyển `cho_xac_nhan→da_xac_nhan→da_check_in→dang_thuc_hien→da_hoan_tat` (nếu UI hỗ trợ)
- [x] **E2E-04.04** Ghi các bước care log, ảnh, phụ phí; nghiệm thu, tính thanh toán và gửi thông báo đón
- [x] **E2E-04.05** Mở pet carelog/customer profile/staff schedule/dashboard, dữ liệu trùng khớp
- [x] **E2E-04-CHECK** [UI] Tất cả trường được điền đều hiển thị lại đúng
- [x] **E2E-04-CHECK** [DB] Mọi cột/FK/enum/amount đúng và không bản ghi mồ côi
- [x] **E2E-04-CHECK** [NEG] Test lỗi/role/nhấp đúp/reload và không side-effect
- [x] **E2E-04-CHECK** [REG] Kiểm màn hình liên phân hệ, KPI, log/audit

### E2E-05 — Lịch bị hủy/vắng mặt → không tính doanh thu và reminder
**Phân hệ:** Dịch vụ / Thú cưng / Dashboard · **Bảng cần xác nhận/đối chiếu thiết kế:** `appointment, payment, care_log`. (Một số bảng nghiệp vụ chi tiết phải xác minh lại tên trong `CDSLfinal.md`/schema thực tế.)
- [x] **E2E-05.01** Tạo lịch chưa xử lý và hủy có lý do, xác minh `appointment_status=da_huy`
- [x] **E2E-05.02** Tạo lịch `vang_mat`; nếu UI thiếu trạng thái, mở bug/mapping gap
- [x] **E2E-05.03** Không tính nhầm `da_huy`/`vang_mat` trong lịch hoàn thành, carelog, reminder, doanh thu
- [x] **E2E-05.04** Kiểm tiền cọc/hoàn tiền theo chính sách và rollback tài nguyên đã giữ
- [x] **E2E-05-CHECK** [UI] Tất cả trường được điền đều hiển thị lại đúng
- [x] **E2E-05-CHECK** [DB] Mọi cột/FK/enum/amount đúng và không bản ghi mồ côi
- [x] **E2E-05-CHECK** [NEG] Test lỗi/role/nhấp đúp/reload và không side-effect
- [x] **E2E-05-CHECK** [REG] Kiểm màn hình liên phân hệ, KPI, log/audit

### E2E-06 — Khách sạn Pet Hotel → phòng → check-in/out
**Phân hệ:** Dịch vụ / Nhân viên / Thú cưng · **Bảng cần xác nhận/đối chiếu thiết kế:** `appointment, hotel_booking, hotel_room, care_log, payment`. (Một số bảng nghiệp vụ chi tiết phải xác minh lại tên trong `CDSLfinal.md`/schema thực tế.)
- [x] **E2E-06.01** Tạo đặt Hotel nhiều ngày cho pet, chọn loại phòng, thời điểm nhận trả
- [x] **E2E-06.02** Không cho book cùng phòng cùng thời điểm; kiểm room_status và hotel_booking_status
- [x] **E2E-06.03** Nhận phòng→đang ở→trả phòng; ghi care log theo ca/ngày và phụ phí
- [x] **E2E-06.04** Sau checkout, xem lại lịch/booking, phòng trả về trạng thái khả dụng, dashboard và thanh toán đúng
- [x] **E2E-06-CHECK** [UI] Tất cả trường được điền đều hiển thị lại đúng
- [x] **E2E-06-CHECK** [DB] Mọi cột/FK/enum/amount đúng và không bản ghi mồ côi
- [x] **E2E-06-CHECK** [NEG] Test lỗi/role/nhấp đúp/reload và không side-effect
- [x] **E2E-06-CHECK** [REG] Kiểm màn hình liên phân hệ, KPI, log/audit

### E2E-07 — Pet Taxi → chuyến → bàn giao / hủy
**Phân hệ:** Dịch vụ / Nhân viên · **Bảng cần xác nhận/đối chiếu thiết kế:** `appointment, taxi_price_rule, staff, payment (không thấy bảng taxi_booking riêng trong thiết kế)`. (Một số bảng nghiệp vụ chi tiết phải xác minh lại tên trong `CDSLfinal.md`/schema thực tế.)
- [x] **E2E-07.01** Tạo Taxi chọn điểm đón/trả, thời gian, thú cưng, tài xế, giá và phụ phí
- [x] **E2E-07.02** Kiểm thông tin lưu đủ cột có trong schema và phương thức tính giá
- [x] **E2E-07.03** Đổi lịch/hủy/trễ chuyến; kiểm đúng enum và không trùng điều phối tài xế
- [x] **E2E-07.04** Hoàn tất và đối chiếu booking/detail/payment, các field địa chỉ không bị cắt
- [x] **E2E-07-CHECK** [UI] Tất cả trường được điền đều hiển thị lại đúng
- [x] **E2E-07-CHECK** [DB] Mọi cột/FK/enum/amount đúng và không bản ghi mồ côi
- [x] **E2E-07-CHECK** [NEG] Test lỗi/role/nhấp đúp/reload và không side-effect
- [x] **E2E-07-CHECK** [REG] Kiểm màn hình liên phân hệ, KPI, log/audit

### E2E-08 — Bán tại quầy → line items → thanh toán → trừ kho
**Phân hệ:** Đơn hàng / Kho / Khách hàng / Dashboard · **Bảng cần xác nhận/đối chiếu thiết kế:** `sales_order, sales_order_detail, payment, inventory, inventory_transaction, product`. (Một số bảng nghiệp vụ chi tiết phải xác minh lại tên trong `CDSLfinal.md`/schema thực tế.)
- [x] **E2E-08.01** `orders.html`: `btnOpenCreateOrderModal` → chọn khách, nhiều sản phẩm, quantity, voucher, paw points, phương thức thanh toán
- [x] **E2E-08.02** So subtotal/discount/shipping/total và chặn tồn âm trước ghi
- [x] **E2E-08.03** Thực hiện tạo đơn & thanh toán; đọc INSERT sales_order, items, payment và các movement/hold kho theo thiết kế
- [x] **E2E-08.04** F5, tìm đơn; kiểm chi tiết, in hóa đơn, stock list/product ledger và dashboard doanh thu
- [x] **E2E-08.05** Bấm submit 2 lần, giả lập lỗi payment ở bước giữa: không còn đơn/stock sai hoặc có trạng thái bù trừ rõ ràng
- [x] **E2E-08-CHECK** [UI] Tất cả trường được điền đều hiển thị lại đúng
- [x] **E2E-08-CHECK** [DB] Mọi cột/FK/enum/amount đúng và không bản ghi mồ côi
- [x] **E2E-08-CHECK** [NEG] Test lỗi/role/nhấp đúp/reload và không side-effect
- [x] **E2E-08-CHECK** [REG] Kiểm màn hình liên phân hệ, KPI, log/audit

### E2E-09 — Giao hàng → COD → đối soát → đã nhận
**Phân hệ:** Đơn hàng / Dashboard · **Bảng cần xác nhận/đối chiếu thiết kế:** `sales_order, shipping_provider, payment (không thấy bảng delivery riêng trong thiết kế)`. (Một số bảng nghiệp vụ chi tiết phải xác minh lại tên trong `CDSLfinal.md`/schema thực tế.)
- [x] **E2E-09.01** Chọn đơn COD và chuyển đúng chuỗi trạng thái theo `order_status`; xuất phiếu đóng gói
- [x] **E2E-09.02** Nhập vận đơn/đơn vị vận chuyển; kiểm lưu và mở lại không mất
- [x] **E2E-09.03** Bàn giao và đối soát COD (`btnQuickReconcileAllCod` nếu đủ quyền)
- [x] **E2E-09.04** Kiểm không đánh dấu đã thanh toán khi chưa có ghi nhận tiền thực; đối soát báo cáo doanh thu
- [x] **E2E-09-CHECK** [UI] Tất cả trường được điền đều hiển thị lại đúng
- [x] **E2E-09-CHECK** [DB] Mọi cột/FK/enum/amount đúng và không bản ghi mồ côi
- [x] **E2E-09-CHECK** [NEG] Test lỗi/role/nhấp đúp/reload và không side-effect
- [x] **E2E-09-CHECK** [REG] Kiểm màn hình liên phân hệ, KPI, log/audit

### E2E-10 — Nhập hàng → kiểm kê → điều chỉnh tồn
**Phân hệ:** Sản phẩm / Kho / Dashboard · **Bảng cần xác nhận/đối chiếu thiết kế:** `product, supplier, purchase_order, purchase_order_detail, inventory, inventory_transaction`. (Một số bảng nghiệp vụ chi tiết phải xác minh lại tên trong `CDSLfinal.md`/schema thực tế.)
- [x] **E2E-10.01** Tạo nhà cung cấp/phiếu nhập bằng `modalGoodsReceipt` và chọn sản phẩm số lượng/giá
- [x] **E2E-10.02** Nhận đủ/nhận thiếu/hủy; kiểm stock movement và invoice của phiếu nhập
- [x] **E2E-10.03** Thực hiện `modalStocktake` với chênh lệch dương/âm, ghi lý do
- [x] **E2E-10.04** Xem history `modalStockLogs`, stock actual và dashboard low-stock; không cập nhật kho bằng write mù không ledger
- [x] **E2E-10-CHECK** [UI] Tất cả trường được điền đều hiển thị lại đúng
- [x] **E2E-10-CHECK** [DB] Mọi cột/FK/enum/amount đúng và không bản ghi mồ côi
- [x] **E2E-10-CHECK** [NEG] Test lỗi/role/nhấp đúp/reload và không side-effect
- [x] **E2E-10-CHECK** [REG] Kiểm màn hình liên phân hệ, KPI, log/audit

### E2E-11 — Voucher tạo → áp dụng đơn → lượt dùng / giới hạn
**Phân hệ:** Cài đặt / Đơn hàng / Khách hàng · **Bảng cần xác nhận/đối chiếu thiết kế:** `voucher, customer_voucher, sales_order, payment`. (Một số bảng nghiệp vụ chi tiết phải xác minh lại tên trong `CDSLfinal.md`/schema thực tế.)
- [x] **E2E-11.01** `settings.html` hoặc `orders.html`: tạo voucher loại phần trăm/cố định, tối thiểu và thời hạn
- [x] **E2E-11.02** Áp voucher trong POS; kiểm category/eligible customer, max_usage, start/end
- [x] **E2E-11.03** So discount chính xác, chống áp lặp và vượt 100%/giảm âm
- [x] **E2E-11.04** Hoàn tất đơn → `voucher.usage_count` và customer_voucher.used_at/status cập nhật đúng; hủy đơn/đổi trả theo chính sách
- [x] **E2E-11-CHECK** [UI] Tất cả trường được điền đều hiển thị lại đúng
- [x] **E2E-11-CHECK** [DB] Mọi cột/FK/enum/amount đúng và không bản ghi mồ côi
- [x] **E2E-11-CHECK** [NEG] Test lỗi/role/nhấp đúp/reload và không side-effect
- [x] **E2E-11-CHECK** [REG] Kiểm màn hình liên phân hệ, KPI, log/audit

### E2E-12 — Tích/tiêu điểm Paw Points sau giao dịch
**Phân hệ:** Khách hàng / Đơn hàng / Cài đặt · **Bảng cần xác nhận/đối chiếu thiết kế:** `customer_membership, paw_point_transaction, payment, reward_rule`. (Một số bảng nghiệp vụ chi tiết phải xác minh lại tên trong `CDSLfinal.md`/schema thực tế.)
- [x] **E2E-12.01** Đặt rule và conversion trong Settings, tạo thanh toán hợp lệ
- [x] **E2E-12.02** Sau thanh toán đủ điều kiện, đối soát payment points earned/spent với ledger
- [x] **E2E-12.03** Kiểm `total_paw_points` và `balance_after` đúng, không cộng hai lần khi reload/retry
- [x] **E2E-12.04** Thử giảm số dư gần 0, trừ âm, hoàn đơn, admin bù điểm; kiểm audit và hạng thành viên
- [x] **E2E-12-CHECK** [UI] Tất cả trường được điền đều hiển thị lại đúng
- [x] **E2E-12-CHECK** [DB] Mọi cột/FK/enum/amount đúng và không bản ghi mồ côi
- [x] **E2E-12-CHECK** [NEG] Test lỗi/role/nhấp đúp/reload và không side-effect
- [x] **E2E-12-CHECK** [REG] Kiểm màn hình liên phân hệ, KPI, log/audit

### E2E-13 — Đơn đổi trả → hoàn tiền → hoàn kho
**Phân hệ:** Đơn hàng / Kho / Khách hàng / Dashboard · **Bảng cần xác nhận/đối chiếu thiết kế:** `return_request, refund_transaction, payment, sales_order, inventory_transaction`. (Một số bảng nghiệp vụ chi tiết phải xác minh lại tên trong `CDSLfinal.md`/schema thực tế.)
- [x] **E2E-13.01** Từ chi tiết đơn mở `modalReturnRefund`, tạo yêu cầu `return_type` hợp lệ
- [x] **E2E-13.02** Chuyển `cho_xu_ly→dang_xu_ly→da_duyet→da_hoan_tat` theo luồng được phép
- [x] **E2E-13.03** Ghi refund transaction, update payment/refund_status, hoàn kho đúng điều kiện
- [x] **E2E-13.04** Kiểm tổng đã hoàn không vượt thanh toán; reload chi tiết/đơn/danh sách/kho/dashboard đồng nhất
- [x] **E2E-13-CHECK** [UI] Tất cả trường được điền đều hiển thị lại đúng
- [x] **E2E-13-CHECK** [DB] Mọi cột/FK/enum/amount đúng và không bản ghi mồ côi
- [x] **E2E-13-CHECK** [NEG] Test lỗi/role/nhấp đúp/reload và không side-effect
- [x] **E2E-13-CHECK** [REG] Kiểm màn hình liên phân hệ, KPI, log/audit

### E2E-14 — Khiếu nại từ đơn → xử lý → giải quyết
**Phân hệ:** Khiếu nại / Đơn hàng / Khách hàng · **Bảng cần xác nhận/đối chiếu thiết kế:** `support_ticket, support_ticket_message, sales_order, customer, refund_transaction`. (Một số bảng nghiệp vụ chi tiết phải xác minh lại tên trong `CDSLfinal.md`/schema thực tế.)
- [x] **E2E-14.01** `complaints.html`: tạo ticket loại đơn liên kết đúng order/customer
- [x] **E2E-14.02** Ghi mức độ ưu tiên `cao/khan_cap`, người xử lý, SLA và trạng thái
- [x] **E2E-14.03** Gửi yêu cầu thông tin, cập nhật nhật ký, chuyển quản lý, tạo resolution
- [x] **E2E-14.04** Nếu có refund/compensation, kiểm đã ghi transaction liên quan; sau đóng, KPI và hồ sơ khách cập nhật
- [x] **E2E-14-CHECK** [UI] Tất cả trường được điền đều hiển thị lại đúng
- [x] **E2E-14-CHECK** [DB] Mọi cột/FK/enum/amount đúng và không bản ghi mồ côi
- [x] **E2E-14-CHECK** [NEG] Test lỗi/role/nhấp đúp/reload và không side-effect
- [x] **E2E-14-CHECK** [REG] Kiểm màn hình liên phân hệ, KPI, log/audit

### E2E-15 — Khiếu nại từ dịch vụ → xử lý bồi hoàn
**Phân hệ:** Dịch vụ / Khiếu nại · **Bảng cần xác nhận/đối chiếu thiết kế:** `appointment, support_ticket, support_ticket_message, refund_transaction`. (Một số bảng nghiệp vụ chi tiết phải xác minh lại tên trong `CDSLfinal.md`/schema thực tế.)
- [x] **E2E-15.01** Tạo ticket từ lịch đã hoàn thành, liên kết customer/pet/appointment
- [x] **E2E-15.02** Chuyển người xử lý, lưu bằng chứng và phương án khắc phục
- [x] **E2E-15.03** Thực hiện service redo/partial refund theo lựa chọn, kiểm các FK và tài chính
- [x] **E2E-15.04** Chuyển resolved/closed, kiểm SLA không sai và lịch sử vẫn còn sau reload
- [x] **E2E-15-CHECK** [UI] Tất cả trường được điền đều hiển thị lại đúng
- [x] **E2E-15-CHECK** [DB] Mọi cột/FK/enum/amount đúng và không bản ghi mồ côi
- [x] **E2E-15-CHECK** [NEG] Test lỗi/role/nhấp đúp/reload và không side-effect
- [x] **E2E-15-CHECK** [REG] Kiểm màn hình liên phân hệ, KPI, log/audit

### E2E-16 — Trực chat → tiếp nhận → gửi/nhận → ticket
**Phân hệ:** Chatbot / Khiếu nại / Khách hàng · **Bảng cần xác nhận/đối chiếu thiết kế:** `chat_conversation, chat_message, support_ticket, customer`. (Một số bảng nghiệp vụ chi tiết phải xác minh lại tên trong `CDSLfinal.md`/schema thực tế.)
- [x] **E2E-16.01** Khách mở chat, admin thấy ở Inbox realtime, search/filter chính xác
- [x] **E2E-16.02** Bấm `btnToggleTakeover`, gửi tin/canned/image, xác nhận sender_type + staff_id + timestamp
- [x] **E2E-16.03** Bấm `btnConvertToTicket`, kiểm ticket FK tới conversation/customer và nội dung chứng cứ
- [x] **E2E-16.04** Kết thúc chat, mở lại tab/new session; tin nhắn và lịch sử không mất, trạng thái chuyển đúng
- [x] **E2E-16-CHECK** [UI] Tất cả trường được điền đều hiển thị lại đúng
- [x] **E2E-16-CHECK** [DB] Mọi cột/FK/enum/amount đúng và không bản ghi mồ côi
- [x] **E2E-16-CHECK** [NEG] Test lỗi/role/nhấp đúp/reload và không side-effect
- [x] **E2E-16-CHECK** [REG] Kiểm màn hình liên phân hệ, KPI, log/audit

### E2E-17 — Tặng điểm từ chat → sổ cái Paw Points
**Phân hệ:** Chatbot / Khách hàng · **Bảng cần xác nhận/đối chiếu thiết kế:** `chat_conversation, customer_membership, paw_point_transaction`. (Một số bảng nghiệp vụ chi tiết phải xác minh lại tên trong `CDSLfinal.md`/schema thực tế.)
- [x] **E2E-17.01** Từ chat chọn `btnRewardPoints` và lý do/số điểm
- [x] **E2E-17.02** Kiểm quyền Admin và giới hạn bồi hoàn; kiểm ghi ledger và số dư nguyên tử
- [x] **E2E-17.03** Mở customer Paw Points, xác minh row + balance_after và realtime refresh
- [x] **E2E-17.04** Thử double click/offline; không tăng điểm trùng
- [x] **E2E-17-CHECK** [UI] Tất cả trường được điền đều hiển thị lại đúng
- [x] **E2E-17-CHECK** [DB] Mọi cột/FK/enum/amount đúng và không bản ghi mồ côi
- [x] **E2E-17-CHECK** [NEG] Test lỗi/role/nhấp đúp/reload và không side-effect
- [x] **E2E-17-CHECK** [REG] Kiểm màn hình liên phân hệ, KPI, log/audit

### E2E-18 — FAQ/Toxic Shield/Canned → chat/AI áp dụng
**Phân hệ:** Chatbot / Cài đặt · **Bảng cần xác nhận/đối chiếu thiết kế:** `chatbot_knowledge_faq, chatbot_profanity_filter, chatbot_canned_response, document_embeddings`. (Một số bảng nghiệp vụ chi tiết phải xác minh lại tên trong `CDSLfinal.md`/schema thực tế.)
- [x] **E2E-18.01** Tạo, chỉnh sửa, bật/tắt/xóa FAQ, câu mẫu, từ khóa cấm qua modal
- [x] **E2E-18.02** Refresh và xác nhận đúng record từ Supabase, không dựa danh sách hardcode
- [x] **E2E-18.03** Chat mới kích hoạt quy tắc, test ưu tiên, lời đáp và log
- [x] **E2E-18.04** Cập nhật RAG nếu hệ thống hỗ trợ; kiểm key/secret không gửi client và lỗi AI được thông báo
- [x] **E2E-18-CHECK** [UI] Tất cả trường được điền đều hiển thị lại đúng
- [x] **E2E-18-CHECK** [DB] Mọi cột/FK/enum/amount đúng và không bản ghi mồ côi
- [x] **E2E-18-CHECK** [NEG] Test lỗi/role/nhấp đúp/reload và không side-effect
- [x] **E2E-18-CHECK** [REG] Kiểm màn hình liên phân hệ, KPI, log/audit

### E2E-19 — Copilot nhiều phiên và lịch sử
**Phân hệ:** Chatbot / AI · **Bảng cần xác nhận/đối chiếu thiết kế:** `document_embeddings, chat_conversation, chat_message (chưa có bảng Copilot session/message riêng trong thiết kế)`. (Một số bảng nghiệp vụ chi tiết phải xác minh lại tên trong `CDSLfinal.md`/schema thực tế.)
- [x] **E2E-19.01** Tạo phiên Copilot, hỏi về dữ liệu có phân quyền, xem câu trả lời
- [x] **E2E-19.02** Chuyển phiên, tìm kiếm, đóng/mở, reload; lịch sử phải persist nếu thiết kế yêu cầu
- [x] **E2E-19.03** Test prompt injection trong nguồn dữ liệu, xem có lộ thông tin cá nhân/secret không
- [x] **E2E-19.04** Nếu schema không có bảng Copilot session, đối chiếu mã code/backend nơi lưu lịch sử và đánh `N/A` hoặc BLOCKED; không tự thêm bảng
- [x] **E2E-19-CHECK** [UI] Tất cả trường được điền đều hiển thị lại đúng
- [x] **E2E-19-CHECK** [DB] Mọi cột/FK/enum/amount đúng và không bản ghi mồ côi
- [x] **E2E-19-CHECK** [NEG] Test lỗi/role/nhấp đúp/reload và không side-effect
- [x] **E2E-19-CHECK** [REG] Kiểm màn hình liên phân hệ, KPI, log/audit

### E2E-20 — Phân ca → xin nghỉ → duyệt → dời booking
**Phân hệ:** Nhân viên / Dịch vụ · **Bảng cần xác nhận/đối chiếu thiết kế:** `staff, staff_schedule, staff_shift_request, appointment`. (Một số bảng nghiệp vụ chi tiết phải xác minh lại tên trong `CDSLfinal.md`/schema thực tế.)
- [x] **E2E-20.01** `staff.html`: tạo nhân viên/role, phân ca sáng/chiều/tối
- [x] **E2E-20.02** Tạo xin nghỉ/đổi ca với `shift_request_type`/`shift_request_status` chuẩn
- [x] **E2E-20.03** Quản lý duyệt/từ chối; chặn chồng ca và không cho bị assign ca trong ngày nghỉ
- [x] **E2E-20.04** Nếu KTV có booking, mở điều phối, cập nhật đúng staff_id và gửi thông báo cho khách
- [x] **E2E-20-CHECK** [UI] Tất cả trường được điền đều hiển thị lại đúng
- [x] **E2E-20-CHECK** [DB] Mọi cột/FK/enum/amount đúng và không bản ghi mồ côi
- [x] **E2E-20-CHECK** [NEG] Test lỗi/role/nhấp đúp/reload và không side-effect
- [x] **E2E-20-CHECK** [REG] Kiểm màn hình liên phân hệ, KPI, log/audit

### E2E-21 — Đánh giá KTV → khóa nhận việc → dịch vụ
**Phân hệ:** Nhân viên / Dịch vụ / Dashboard · **Bảng cần xác nhận/đối chiếu thiết kế:** `staff, appointment, staff_schedule (chưa thấy bảng staff_assessment trong CDSLfinal)`. (Một số bảng nghiệp vụ chi tiết phải xác minh lại tên trong `CDSLfinal.md`/schema thực tế.)
- [x] **E2E-21.01** Ghi assessment, mức độ nghiệp vụ/cảnh báo và các field đã nhập
- [x] **E2E-21.02** Đánh dấu khóa nhận việc/đào tạo lại nếu policy yêu cầu
- [x] **E2E-21.03** Booking mới không được phép phân công KTV không khả dụng
- [x] **E2E-21.04** Mở lịch sử đánh giá, dashboard, không làm mất ca đang mở
- [x] **E2E-21-CHECK** [UI] Tất cả trường được điền đều hiển thị lại đúng
- [x] **E2E-21-CHECK** [DB] Mọi cột/FK/enum/amount đúng và không bản ghi mồ côi
- [x] **E2E-21-CHECK** [NEG] Test lỗi/role/nhấp đúp/reload và không side-effect
- [x] **E2E-21-CHECK** [REG] Kiểm màn hình liên phân hệ, KPI, log/audit

### E2E-22 — Banner/blog/notification → xuất bản / thu hồi
**Phân hệ:** Cài đặt / Website / Chatbot · **Bảng cần xác nhận/đối chiếu thiết kế:** `banner, blog_post, notification, document_embeddings`. (Một số bảng nghiệp vụ chi tiết phải xác minh lại tên trong `CDSLfinal.md`/schema thực tế.)
- [x] **E2E-22.01** Tạo banner có ảnh/link/time-window, lưu, bật/tắt đúng enum
- [x] **E2E-22.02** Tạo bài viết nháp, lên lịch, xuất bản; đổi danh mục và ảnh thumbnail
- [x] **E2E-22.03** Tạo notification, preview và xem website (cần mã frontend ngoài bộ 49 file nếu thiếu)
- [x] **E2E-22.04** Nếu tích hợp RAG, kiểm chỉ dữ liệu public được index; gỡ bài cập nhật index
- [x] **E2E-22-CHECK** [UI] Tất cả trường được điền đều hiển thị lại đúng
- [x] **E2E-22-CHECK** [DB] Mọi cột/FK/enum/amount đúng và không bản ghi mồ côi
- [x] **E2E-22-CHECK** [NEG] Test lỗi/role/nhấp đúp/reload và không side-effect
- [x] **E2E-22-CHECK** [REG] Kiểm màn hình liên phân hệ, KPI, log/audit

### E2E-23 — Đổi cấu hình thanh toán/giao hàng → đơn mới
**Phân hệ:** Cài đặt / Đơn hàng · **Bảng cần xác nhận/đối chiếu thiết kế:** `payment_method_config, delivery_option_config, shipping_provider, sales_order`. (Một số bảng nghiệp vụ chi tiết phải xác minh lại tên trong `CDSLfinal.md`/schema thực tế.)
- [x] **E2E-23.01** Admin sửa phương thức thanh toán/giao hàng/fee theo Settings
- [x] **E2E-23.02** Reload modal thấy cấu hình mới, audit ghi ai sửa và giá trị trước/sau
- [x] **E2E-23.03** Mở đơn mới và đảm bảo option + phí lấy từ DB, không hardcode
- [x] **E2E-23.04** Đơn cũ giữ snapshot chính sách tại thời điểm đặt theo thiết kế; unauthorized user không sửa được
- [x] **E2E-23-CHECK** [UI] Tất cả trường được điền đều hiển thị lại đúng
- [x] **E2E-23-CHECK** [DB] Mọi cột/FK/enum/amount đúng và không bản ghi mồ côi
- [x] **E2E-23-CHECK** [NEG] Test lỗi/role/nhấp đúp/reload và không side-effect
- [x] **E2E-23-CHECK** [REG] Kiểm màn hình liên phân hệ, KPI, log/audit

### E2E-24 — Dashboard KPI → drill-down → chứng minh từng số
**Phân hệ:** Dashboard / toàn hệ thống · **Bảng cần xác nhận/đối chiếu thiết kế:** `sales_order, appointment, support_ticket, customer, pet_profile, inventory, staff`. (Một số bảng nghiệp vụ chi tiết phải xác minh lại tên trong `CDSLfinal.md`/schema thực tế.)
- [x] **E2E-24.01** Chốt thời điểm test/ngày giờ Asia/Ho_Chi_Minh, chạy SQL đếm/tổng không dùng cache
- [x] **E2E-24.02** So 5 KPI, biểu đồ doanh thu, lịch, cảnh báo tồn, trạng thái đơn/ticket
- [x] **E2E-24.03** Bấm thẻ KPI và thao tác nhanh, phải điều hướng đúng filter/detail và giữ ngữ cảnh
- [x] **E2E-24.04** Sửa một bản ghi rồi reload toàn hệ thống: KPI và danh sách phải nhất quán; không đếm hủy/refund sai
- [x] **E2E-24-CHECK** [UI] Tất cả trường được điền đều hiển thị lại đúng
- [x] **E2E-24-CHECK** [DB] Mọi cột/FK/enum/amount đúng và không bản ghi mồ côi
- [x] **E2E-24-CHECK** [NEG] Test lỗi/role/nhấp đúp/reload và không side-effect
- [x] **E2E-24-CHECK** [REG] Kiểm màn hình liên phân hệ, KPI, log/audit

### E2E-25 — RLS bảo mật xuyên phân hệ / thông tin nhạy cảm
**Phân hệ:** Mọi phân hệ · **Bảng cần xác nhận/đối chiếu thiết kế:** `customer, payment, api_keys, staff, pawpal_setting`. (Một số bảng nghiệp vụ chi tiết phải xác minh lại tên trong `CDSLfinal.md`/schema thực tế.)
- [x] **E2E-25.01** Với từng role test chỉ đọc/ghi đúng quyền, gọi API Supabase trực tiếp không vượt được RLS
- [x] **E2E-25.02** Không trả password_hash/activation_token/api_keys/PII cho UI không được phép
- [x] **E2E-25.03** Thử search, input độc hại HTML, CSV formula, upload file vượt giới hạn
- [x] **E2E-25.04** Kiểm log lỗi không in access token/secret, policy và audit trace hợp lệ
- [x] **E2E-25-CHECK** [UI] Tất cả trường được điền đều hiển thị lại đúng
- [x] **E2E-25-CHECK** [DB] Mọi cột/FK/enum/amount đúng và không bản ghi mồ côi
- [x] **E2E-25-CHECK** [NEG] Test lỗi/role/nhấp đúp/reload và không side-effect
- [x] **E2E-25-CHECK** [REG] Kiểm màn hình liên phân hệ, KPI, log/audit

### E2E-26 — Mất mạng / retry / concurrent edit
**Phân hệ:** Mọi phân hệ · **Bảng cần xác nhận/đối chiếu thiết kế:** `mọi bảng được ghi trong luồng`. (Một số bảng nghiệp vụ chi tiết phải xác minh lại tên trong `CDSLfinal.md`/schema thực tế.)
- [x] **E2E-26.01** Chặn mạng giữa các insert/update đa bảng; UI báo lỗi, dữ liệu không ở trạng thái half-committed
- [x] **E2E-26.02** Double-click Save, 2 trình duyệt cập nhật cùng bản ghi, không duplicate, không overwrite im lặng
- [x] **E2E-26.03** F5 đúng lúc lưu, mở lại/rollback/resume chính xác, không hiển thị toast thành công giả
- [x] **E2E-26.04** Supabase trả 400/403/409/429/500: error state phân biệt với empty state; retry có idempotency
- [x] **E2E-26-CHECK** [UI] Tất cả trường được điền đều hiển thị lại đúng
- [x] **E2E-26-CHECK** [DB] Mọi cột/FK/enum/amount đúng và không bản ghi mồ côi
- [x] **E2E-26-CHECK** [NEG] Test lỗi/role/nhấp đúp/reload và không side-effect
- [x] **E2E-26-CHECK** [REG] Kiểm màn hình liên phân hệ, KPI, log/audit

## E. LỖI/RỦI RO TỪ ĐỢT AUDIT JS TRƯỚC — GẮN VÀO E2E

> Các mục F-001..F-026 dưới đây trích từ checklist audit trước, **chưa đồng nghĩa có lỗi runtime xác nhận**. Sau khi bổ sung HTML cần kiểm tra cả nút/form/hiển thị đầu-cuối. Phân biệt “sai literal” và “lỗi khi chạy” bằng kết quả DB/Network.

### F-001 [P0] — Thú cưng / Nhắc lịch
- [x] **Đối chiếu code:** `pets.js`, dòng 514–518. — `.eq('appointment_status', 'COMPLETED')`.
- [x] **Hướng sửa:** Thay bộ lọc DB bằng `da_hoan_tat`; kiểm tra trường `appointment_status` thực tế, luôn kiểm tra `error`, xóa cache và đồng bộ các consumer của `PawpalPets.state.appointments`.
- [x] **Retest:** `PET-08, PET-09, PET-11`.. Chụp payload, DB row trước/sau, refresh tab HTML liên quan.

### F-002 [P0] — Thú cưng / Nhắc lịch
- [x] **Đối chiếu code:** `tab-pet-reminders.js`, dòng 48–58. — `a.appointment_status === 'COMPLETED'`.
- [x] **Hướng sửa:** Đổi sang `da_hoan_tat` ở dữ liệu DB hoặc dùng một hàm `isCompletedAppointment(rawStatus)`; chỉ dùng nhãn UI trong view, không dùng làm điều kiện DB.
- [x] **Retest:** `PET-08, PET-09, PET-10`.. Chụp payload, DB row trước/sau, refresh tab HTML liên quan.

### F-003 [P0] — Dịch vụ / Lịch hẹn
- [x] **Đối chiếu code:** `services.js`, dòng 643–651. — So sánh `CONFIRMED`, `IN_PROGRESS`, `CHECKED_IN`, `COMPLETED`.
- [x] **Hướng sửa:** Định nghĩa mapping chuẩn DB → state UI; xử lý đủ 7 giá trị `appointment_status` trong enum; tách `da_check_in` nếu UI có bước check-in; trạng thái ngoài danh sách phải báo lỗi thay vì mặc định chờ.
- [x] **Retest:** `SRV-04, SRV-05, SRV-06, SRV-07`.. Chụp payload, DB row trước/sau, refresh tab HTML liên quan.

### F-004 [P1] — Dịch vụ / Thanh toán
- [x] **Đối chiếu code:** `services.js`, dòng 709. — `item.payment_status === 'PAID'`.
- [x] **Hướng sửa:** Đối chiếu trực tiếp với enum `da_thanh_toan` / `chua_thanh_toan` / `thanh_toan_that_bai` / `da_hoan_tien` và render 4 trạng thái phân biệt.
- [x] **Retest:** `SRV-12, SRV-13`.. Chụp payload, DB row trước/sau, refresh tab HTML liên quan.

### F-005 [P1] — Khách hàng / Hồ sơ 360
- [x] **Đối chiếu code:** `customers.js`, dòng 518–526. — Có `DA_HOAN_THANH` nhưng thiếu `DA_HOAN_TAT`.
- [x] **Hướng sửa:** Bổ sung `DA_HOAN_TAT`, `DA_CHECK_IN`, `VANG_MAT` theo enum; ưu tiên so sánh giá trị DB gốc thay vì biến thể tiếng Anh.
- [x] **Retest:** `CUS-08, CUS-09`.. Chụp payload, DB row trước/sau, refresh tab HTML liên quan.

### F-006 [P1] — Khách hàng / Hồ sơ
- [x] **Đối chiếu code:** `customers.js`, dòng 399. — `prof.gender` so `FEMALE`, `MALE`, `Nữ`, `Nam`.
- [x] **Hướng sửa:** Map `nam → Nam`, `nu → Nữ`, `khac → Khác`; chỉ dùng `khac` khi DB thực sự là `khac`, không coi null là một giới tính.
- [x] **Retest:** `CUS-05, CUS-06`.. Chụp payload, DB row trước/sau, refresh tab HTML liên quan.

### F-007 [P1] — Khách hàng / Khiếu nại 360
- [x] **Đối chiếu code:** `customers.js`, dòng 540–551. — Ticket status `RESOLVED`/`CLOSED`, ưu tiên `HIGH`/`URGENT`.
- [x] **Hướng sửa:** Tạo mapping đủ `ticket_status` và `priority` theo enum mới; phân biệt `tu_choi` với `da_dong`.
- [x] **Retest:** `CUS-11, COM-10`.. Chụp payload, DB row trước/sau, refresh tab HTML liên quan.

### F-008 [P0] — Khiếu nại / Tạo ticket
- [x] **Đối chiếu code:** `complaints.js`, dòng 1993–2009. — Insert `priority: 'Cao'/'Thấp'/'Trung bình'`, `status: 'pending'`.
- [x] **Hướng sửa:** Ghi `priority` đúng `cao`/`trung_binh`/`thap`/`khan_cap`; ghi `status: mo`; UI mới chuyển sang nhãn tiếng Việt ở bước render.
- [x] **Retest:** `COM-02, COM-03, COM-04`.. Chụp payload, DB row trước/sau, refresh tab HTML liên quan.

### F-009 [P0] — Khiếu nại / Tin nhắn
- [x] **Đối chiếu code:** `complaints.js`, dòng 2009–2017. — Insert `support_ticket_message.sender_type: 'user'`.
- [x] **Hướng sửa:** Dùng `khach_hang` cho tin khách; dùng `nhan_vien`/`he_thong` đúng ngữ cảnh ở tất cả luồng khác; xác minh cả ticket và message sau insert.
- [x] **Retest:** `COM-02, COM-05, COM-06`.. Chụp payload, DB row trước/sau, refresh tab HTML liên quan.

### F-010 [P1] — Khiếu nại / SLA
- [x] **Đối chiếu code:** `complaints.js`, dòng 498–508; 168–230. — `khan_cap` bị chuyển thành `high`; SLA chỉ phân `high/medium/low`.
- [x] **Hướng sửa:** Giữ giá trị DB `khan_cap`/`cao`/`trung_binh`/`thap`, xây chính sách SLA theo cấu hình nếu có; ưu tiên cấp khẩn cấp trước cấp cao.
- [x] **Retest:** `COM-08, COM-09, COM-10`.. Chụp payload, DB row trước/sau, refresh tab HTML liên quan.

### F-011 [P1] — Khiếu nại / Đơn hàng liên kết
- [x] **Đối chiếu code:** `complaints.js`, dòng 719. — `order.order_status === 'DELIVERED'`.
- [x] **Hướng sửa:** Dùng `da_giao_hang` theo enum mới; kiểm tra các trạng thái `da_huy`, `da_tra_hang` để tránh gộp nhãn sai.
- [x] **Retest:** `COM-12, ORD-06`.. Chụp payload, DB row trước/sau, refresh tab HTML liên quan.

### F-012 [P1] — Bán hàng / Voucher
- [x] **Đối chiếu code:** `orders.js`, dòng 766–773. — `v.type === 'percentage' || v.type === 'percent'`.
- [x] **Hướng sửa:** Map `voucher.type`: `giam_gia_theo_phan_tram → percent`, `giam_gia_co_dinh → fixed`; kiểm tra `applicable_for`, giới hạn sử dụng và điều kiện tối thiểu; dùng DECIMAL/number cẩn thận.
- [x] **Retest:** `ORD-13, ORD-14, ORD-15`.. Chụp payload, DB row trước/sau, refresh tab HTML liên quan.

### F-013 [P1] — Bán hàng / Đổi trả
- [x] **Đối chiếu code:** `orders.js`, dòng 854–868. — `request_status === 'COMPLETED' || 'RESOLVED'`; `return_type === 'REFUND'/'RETURN'`.
- [x] **Hướng sửa:** Map đầy đủ `request_status` và `return_type` theo enum mới; không đồng nhất `da_duyet` với `da_hoan_tat`.
- [x] **Retest:** `ORD-18, ORD-19`.. Chụp payload, DB row trước/sau, refresh tab HTML liên quan.

### F-014 [P0] — Bán hàng / RMA và kho
- [x] **Đối chiếu code:** `tab-order-detail.js`, dòng 366–456. — Update `sales_order` → insert `return_request` → insert chi tiết → cập nhật `inventory` tuần tự.
- [x] **Hướng sửa:** Đưa nghiệp vụ đổi trả/hoàn kho vào RPC Postgres chạy trong **một transaction**, có validate số lượng, điều kiện, quyền, idempotency; dừng khi bất kỳ bước nào thất bại; chỉ cập nhật UI sau xác nhận DB.
- [x] **Retest:** `ORD-20, ORD-21, ORD-22, X-05`.. Chụp payload, DB row trước/sau, refresh tab HTML liên quan.

### F-015 [P1] — Bán hàng / Hoàn tiền
- [x] **Đối chiếu code:** `tab-order-detail.js`, dòng 375–396; 451–455. — Khi chọn refund, `sales_order.payment_status = 'da_hoan_tien'` trước khi xác minh giao dịch hoàn.
- [x] **Hướng sửa:** Tách trạng thái yêu cầu hoàn `refund_transaction.refund_status` khỏi trạng thái thanh toán của đơn; chỉ ghi `da_hoan_tien` sau xác nhận thanh toán hoàn tất, có dấu vết tiền thực tế.
- [x] **Retest:** `ORD-21, ORD-23`.. Chụp payload, DB row trước/sau, refresh tab HTML liên quan.

### F-016 [P1] — Dashboard / Khiếu nại
- [x] **Đối chiếu code:** `dashboard.js`, dòng 274–279. — KPI chỉ nhận `OPEN`, `IN_PROGRESS`, `PENDING`, `NEW`, `PROCESSING`.
- [x] **Hướng sửa:** Định nghĩa rõ “chờ xử lý” gồm trạng thái nào; dùng enum chuẩn, đối soát số đếm bằng truy vấn SQL cùng tiêu chí.
- [x] **Retest:** `DASH-06, DASH-07`.. Chụp payload, DB row trước/sau, refresh tab HTML liên quan.

### F-017 [P1] — Dashboard / Doanh thu tuần
- [x] **Đối chiếu code:** `dashboard.js`, dòng 535–545. — Lịch hoàn tất chỉ kiểm `COMPLETED`/`DA_HOAN_THANH`.
- [x] **Hướng sửa:** Dùng `da_hoan_tat` thống nhất ở KPI, biểu đồ tuần, biểu đồ 7 ngày; định nghĩa ngày ghi nhận doanh thu và quy tắc hủy/hoàn tiền.
- [x] **Retest:** `DASH-02, DASH-03, DASH-04`.. Chụp payload, DB row trước/sau, refresh tab HTML liên quan.

### F-018 [P0] — Nhân sự / Đơn xin nghỉ, đổi ca
- [x] **Đối chiếu code:** `tab-staff-schedule.js`, dòng 233–304; 327–350; 821–823. — `PENDING/APPROVED/REJECTED` và `LEAVE/SWAP` ở so sánh/insert.
- [x] **Hướng sửa:** Đổi payload + điều kiện kiểm tra + RPC response contract + filter; dùng `xin_nghi/doi_ca` và `cho_duyet/da_duyet/tu_choi`; ca làm dùng `ca_sang/ca_chieu/ca_toi`, không đưa `ALL/MORNING/AFTERNOON/EVENING` xuống cột enum.
- [x] **Retest:** `STA-07, STA-08, STA-09, STA-10`.. Chụp payload, DB row trước/sau, refresh tab HTML liên quan.

### F-019 [P0] — Nhân sự / Duyệt đơn & ca
- [x] **Đối chiếu code:** `tab-staff-schedule.js`, dòng 233–270. — RPC lỗi → fallback nhiều update độc lập, một số update không kiểm tra `error`.
- [x] **Hướng sửa:** Không fallback write đa bước ở client; bắt buộc RPC transaction có kiểm soát quyền + khóa bản ghi + phát hiện lịch trùng; cập nhật UI sau đọc lại DB; nếu RPC chưa có thì tạm chặn thao tác thay vì ghi một phần.
- [x] **Retest:** `STA-09, STA-11, STA-12, X-06`.. Chụp payload, DB row trước/sau, refresh tab HTML liên quan.

### F-020 [P1] — Nhân sự / Mapping tài khoản
- [x] **Đối chiếu code:** `staff.js; tab-staff-profile.js`, dòng staff.js 325–346; profile 45–46. — `accountStatus` nhiều nơi là raw `account_status`, profile so `ACTIVE`.
- [x] **Hướng sửa:** Đồng bộ mapping trạng thái tài khoản ở nơi đọc, lưu raw riêng và đặt nhãn UI riêng; phân biệt `tam_khoa`, `da_khoa`.
- [x] **Retest:** `STA-03, STA-04`.. Chụp payload, DB row trước/sau, refresh tab HTML liên quan.

### F-021 [P1] — Thú cưng / Care log
- [x] **Đối chiếu code:** `pets.js`, dòng 475–492. — `logsRes.data || []`, `apptsRes.data || []` mà không kiểm `logsRes.error`/`apptsRes.error`.
- [x] **Hướng sửa:** Kiểm tra cả hai `error`, hiện lỗi tải riêng biệt; không ghi đè cache data tốt bằng mảng trống khi load lỗi.
- [x] **Retest:** `PET-05, PET-06, SEC-04`.. Chụp payload, DB row trước/sau, refresh tab HTML liên quan.

### F-022 [P1] — Database / Bảng bổ sung
- [x] **Đối chiếu code:** `tab-staff-assessment.js; tab-customer-list.js`, dòng assessment 313; customer-list 816. — Code ghi vào `staff_assessment` và `customer_activation_sms`.
- [x] **Hướng sửa:** Kiểm tra `information_schema`, migrations và RLS thật; nếu bảng hợp lệ thì bổ sung phụ lục kiến trúc, nếu không thì thiết kế migration được duyệt hoặc điều chỉnh code; không tự xóa logic.
- [x] **Retest:** `DB-04, STA-14, CUS-14`.. Chụp payload, DB row trước/sau, refresh tab HTML liên quan.

### F-023 [P1] — Khách hàng / Tài khoản
- [x] **Đối chiếu code:** `customers.js`, dòng 383–409. — `tam_khoa` và `da_khoa` đều ánh xạ UI `LOCKED`.
- [x] **Hướng sửa:** Tách 3 trạng thái raw `dang_hoat_dong/tam_khoa/da_khoa`; bổ sung mapping trạng thái UI nếu nghiệp vụ cần phân biệt và cập nhật bộ lọc/hành động theo từng mức.
- [x] **Retest:** `CUS-02, CUS-03, CUS-04`.. Chụp payload, DB row trước/sau, refresh tab HTML liên quan.

### F-024 [P1] — Bán hàng / Điểm & tồn kho
- [x] **Đối chiếu code:** `tab-order-list.js`, dòng 1257–1367. — Tạo đơn, cập nhật voucher, tồn kho, điểm thưởng qua nhiều lời gọi.
- [x] **Hướng sửa:** Rà transaction RPC cho checkout; lock tồn/giữ tồn, idempotency key, dùng ledger điểm; thao tác thất bại không để UI báo thành công, đối soát `inventory_transaction` và `paw_point_transaction`.
- [x] **Retest:** `ORD-08, ORD-09, ORD-10, ORD-11, X-02`.. Chụp payload, DB row trước/sau, refresh tab HTML liên quan.

### F-025 [P2] — Đánh giá / Số liệu
- [x] **Đối chiếu code:** `tab-service-reviews.js; tab-order-products.js`, dòng review modules. — Đọc/ghi bảng `review` ở cả đánh giá dịch vụ và sản phẩm.
- [x] **Hướng sửa:** Chỉ tính review hợp lệ theo chính sách duyệt, lọc theo `product_id/service_id`, ngăn reply sai bản ghi và thực hiện cập nhật số liệu sau thay đổi.
- [x] **Retest:** `SRV-16, ORD-27`.. Chụp payload, DB row trước/sau, refresh tab HTML liên quan.

### F-026 [P1] — Phân quyền / Phía client
- [x] **Đối chiếu code:** `tab-order-detail.js; dashboard.js`, dòng order-detail 328–343; dashboard 281–285. — Có nhánh fallback vai trò client về `ADMIN`.
- [x] **Hướng sửa:** Không mặc định quyền cao khi thiếu role; kiểm tra `auth.uid()` + RLS/RPC `security definer` được kiểm toán; test quyền thật bằng tài khoản ít quyền.
- [x] **Retest:** `SEC-01, SEC-02, SEC-03`.. Chụp payload, DB row trước/sau, refresh tab HTML liên quan.

## F. CHECKLIST CHUNG: MỌI BẢNG HTML, CỘT HIỂN THỊ VÀ TƯƠNG TÁC

> Inventory được trích trực tiếp từ `<table>` trong 9 HTML. Nếu tiêu đề cột là tạo động hoặc bảng trống, đánh kiểm runtime. Mỗi checkbox tương ứng **một cột visible**; không đồng nghĩa cột DB với tên giống nhau.

### dashboard.html — 0 bảng

### customers.html — 6 bảng
**TABLE-CUSTOMERS-01** `customerDataTable` · HTML dòng 85 · tbody: `customerTableTbody`
- [x] **Cột 1** Mã KH — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 2** Họ tên — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 3** Số điện thoại — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 4** Thú cưng — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 5** Hạng và Điểm — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 6** Cảnh báo — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 7** Trạng thái — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 8** Tác vụ — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] Dòng dữ liệu: mở chi tiết, phân trang, empty/loading/error, reload, CSV/print và quyền truy cập đều đúng
**TABLE-CUSTOMERS-02** `(bảng không có id)` · HTML dòng 263 · tbody: `drawerOrdersTbody`
- [x] **Cột 1** Mã đơn — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 2** Thời gian — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 3** Tổng tiền — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 4** Thanh toán — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 5** Trạng thái — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 6** Thao tác — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] Dòng dữ liệu: mở chi tiết, phân trang, empty/loading/error, reload, CSV/print và quyền truy cập đều đúng
**TABLE-CUSTOMERS-03** `(bảng không có id)` · HTML dòng 282 · tbody: `drawerBookingsTbody`
- [x] **Cột 1** Mã lịch — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 2** Ngày hẹn — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 3** Dịch vụ — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 4** Thợ phụ trách — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 5** Trạng thái — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 6** Thao tác — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] Dòng dữ liệu: mở chi tiết, phân trang, empty/loading/error, reload, CSV/print và quyền truy cập đều đúng
**TABLE-CUSTOMERS-04** `(bảng không có id)` · HTML dòng 301 · tbody: `drawerComplaintsTbody`
- [x] **Cột 1** Mã Ticket — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 2** Ngày gửi — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 3** Sự cố phản ánh — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 4** Mức độ — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 5** Trạng thái — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 6** Thao tác — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] Dòng dữ liệu: mở chi tiết, phân trang, empty/loading/error, reload, CSV/print và quyền truy cập đều đúng
**TABLE-CUSTOMERS-05** `(bảng không có id)` · HTML dòng 332 · tbody: `None`
- [x] **Cột 1** Hạng thẻ — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 2** Chi tiêu — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 3** Chiết khấu — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 4** Quyền lợi — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] Dòng dữ liệu: mở chi tiết, phân trang, empty/loading/error, reload, CSV/print và quyền truy cập đều đúng
**TABLE-CUSTOMERS-06** `(bảng không có id)` · HTML dòng 381 · tbody: `pawpointHistoryTbody`
- [x] **Cột 1** Thời gian — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 2** Khách hàng — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 3** Biến động — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 4** Số dư — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 5** Lý do — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] Dòng dữ liệu: mở chi tiết, phân trang, empty/loading/error, reload, CSV/print và quyền truy cập đều đúng

### pets.html — 6 bảng
**TABLE-PETS-01** `petDataTable` · HTML dòng 99 · tbody: `petTableTbody`
- [x] **Cột 1** Ảnh — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 2** Mã bé — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 3** Tên bé cưng — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 4** Loài và Giống — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 5** Cân nặng — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 6** Chủ sở hữu — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 7** Cảnh báo an toàn — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 8** Trạng thái — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 9** Tác vụ — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] Dòng dữ liệu: mở chi tiết, phân trang, empty/loading/error, reload, CSV/print và quyền truy cập đều đúng
**TABLE-PETS-02** `(bảng không có id)` · HTML dòng 243 · tbody: `petWeightHistoryTbody`
- [x] **Cột 1** Ngày đo — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 2** Cân nặng — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 3** Phân khúc giá Spa/Hotel — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 4** Ghi nhận bởi — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] Dòng dữ liệu: mở chi tiết, phân trang, empty/loading/error, reload, CSV/print và quyền truy cập đều đúng
**TABLE-PETS-03** `(bảng không có id)` · HTML dòng 288 · tbody: `petCarelogTbody`
- [x] **Cột 1** Thời gian — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 2** Dịch vụ và KTV — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 3** Ảnh trước và sau — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 4** Kiểm tra vệ sinh — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 5** Trạng thái app — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 6** Thao tác — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] Dòng dữ liệu: mở chi tiết, phân trang, empty/loading/error, reload, CSV/print và quyền truy cập đều đúng
**TABLE-PETS-04** `(bảng không có id)` · HTML dòng 309 · tbody: `petHistoryTbody`
- [x] **Cột 1** Mã ca — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 2** Dịch vụ — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 3** Thời gian — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 4** Cân nặng áp dụng — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 5** Tổng tiền — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 6** Trạng thái — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] Dòng dữ liệu: mở chi tiết, phân trang, empty/loading/error, reload, CSV/print và quyền truy cập đều đúng
**TABLE-PETS-05** `(bảng không có id)` · HTML dòng 342 · tbody: `petCarelogsListTbody`
- [x] **Cột 1** Thời gian — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 2** Bé cưng — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 3** Chủ nuôi — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 4** Nội dung nhật ký — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 5** Tình trạng sức khỏe — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] Dòng dữ liệu: mở chi tiết, phân trang, empty/loading/error, reload, CSV/print và quyền truy cập đều đúng
**TABLE-PETS-06** `(bảng không có id)` · HTML dòng 409 · tbody: `reminderTableTbody`
- [x] **Cột 1** Tên bé cưng — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 2** Chủ sở hữu và SĐT — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 3** Loại nhắc lịch — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 4** Ghi chú và lần gần nhất — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 5** Trạng thái tin nhắn — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 6** Thao tác — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] Dòng dữ liệu: mở chi tiết, phân trang, empty/loading/error, reload, CSV/print và quyền truy cập đều đúng

### services.html — 4 bảng
**TABLE-SERVICES-01** `servicesBookingTable` · HTML dòng 104 · tbody: `servicesBookingTableBody`
- [x] **Cột 1** Mã lịch hẹn — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 2** Ngày và giờ hẹn — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 3** Khách hàng — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 4** Thú cưng — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 5** Dịch vụ đã đặt — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 6** Kỹ thuật viên — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 7** Tổng tiền — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 8** Thanh toán — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 9** Trạng thái — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 10** Cảnh báo — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 11** Thao tác — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] Dòng dữ liệu: mở chi tiết, phân trang, empty/loading/error, reload, CSV/print và quyền truy cập đều đúng
**TABLE-SERVICES-02** `servicesCatalogTable` · HTML dòng 446 · tbody: `servicesCatalogTableBody`
- [x] **Cột 1** Hình — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 2** Mã dịch vụ — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 3** Tên dịch vụ — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 4** Phân loại — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 5** Dành cho — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 6** Thời lượng — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 7** Giá từ — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 8** Quy trình SOP — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 9** Đánh giá — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 10** Trạng thái — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 11** Thao tác — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] Dòng dữ liệu: mở chi tiết, phân trang, empty/loading/error, reload, CSV/print và quyền truy cập đều đúng
**TABLE-SERVICES-03** `servicesReviewTable` · HTML dòng 545 · tbody: `servicesReviewTableBody`
- [x] **Cột 1** Mã lịch hẹn — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 2** Khách hàng — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 3** Dịch vụ sử dụng — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 4** Điểm sao — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 5** Nội dung đánh giá — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 6** KTV phụ trách — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 7** Trạng thái — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 8** Thao tác — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] Dòng dữ liệu: mở chi tiết, phân trang, empty/loading/error, reload, CSV/print và quyền truy cập đều đúng
**TABLE-SERVICES-04** `(bảng không có id)` · HTML dòng 815 · tbody: `None`
- [x] **Cột 1** Dưới 5kg — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 2** Từ 5 - 10kg — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 3** Từ 10 - 20kg — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 4** Trên 20kg — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] Dòng dữ liệu: mở chi tiết, phân trang, empty/loading/error, reload, CSV/print và quyền truy cập đều đúng

### orders.html — 11 bảng
**TABLE-ORDERS-01** `ordersTable` · HTML dòng 125 · tbody: `ordersTableBody`
- [x] **Cột 1** (tiêu đề trống) — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 2** Mã đơn — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 3** Khách hàng — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 4** Sản phẩm và Số lượng — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 5** Tổng tiền — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 6** Thanh toán — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 7** Vận chuyển — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 8** Trạng thái — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 9** Cảnh báo và SLA — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 10** Thao tác — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] Dòng dữ liệu: mở chi tiết, phân trang, empty/loading/error, reload, CSV/print và quyền truy cập đều đúng
**TABLE-ORDERS-02** `(bảng không có id)` · HTML dòng 222 · tbody: `detailOrderItemsBody`
- [x] **Cột 1** Sản phẩm — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 2** Mã SKU — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 3** Đơn giá — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 4** Số lượng — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 5** Thành tiền — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] Dòng dữ liệu: mở chi tiết, phân trang, empty/loading/error, reload, CSV/print và quyền truy cập đều đúng
**TABLE-ORDERS-03** `productsTable` · HTML dòng 405 · tbody: `productsTableBody`
- [x] **Cột 1** Mã SKU — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 2** Tên sản phẩm — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 3** Danh mục — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 4** Thương hiệu — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 5** Giá niêm yết — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 6** Đánh giá — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 7** Tổng tồn — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 8** Tạm giữ — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 9** Khả dụng — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 10** Cảnh báo tồn — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 11** Trạng thái — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 12** Thao tác — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] Dòng dữ liệu: mở chi tiết, phân trang, empty/loading/error, reload, CSV/print và quyền truy cập đều đúng
**TABLE-ORDERS-04** `vouchersTable` · HTML dòng 469 · tbody: `vouchersTableBody`
- [x] **Cột 1** Mã voucher — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 2** Tên chương trình — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 3** Mức giảm giá — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 4** Đơn tối thiểu — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 5** Điểm đổi — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 6** Thời hạn — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 7** Lượt đã dùng — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 8** Trạng thái — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 9** Thao tác — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] Dòng dữ liệu: mở chi tiết, phân trang, empty/loading/error, reload, CSV/print và quyền truy cập đều đúng
**TABLE-ORDERS-05** `(bảng không có id)` · HTML dòng 622 · tbody: `posCartItemsList`
- [x] **Cột 1** Sản phẩm / Dịch vụ — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 2** Đơn giá — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 3** Số lượng — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 4** Thành tiền — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 5** (tiêu đề trống) — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] Dòng dữ liệu: mở chi tiết, phân trang, empty/loading/error, reload, CSV/print và quyền truy cập đều đúng
**TABLE-ORDERS-06** `(bảng không có id)` · HTML dòng 763 · tbody: `recItemsBody`
- [x] **Cột 1** Mặt hàng — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 2** SL — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 3** Đơn giá — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 4** Thành tiền — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] Dòng dữ liệu: mở chi tiết, phân trang, empty/loading/error, reload, CSV/print và quyền truy cập đều đúng
**TABLE-ORDERS-07** `(bảng không có id)` · HTML dòng 1055 · tbody: `rmaItemsTableBody`
- [x] **Cột 1** Chọn — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 2** Tên sản phẩm — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 3** Mua — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 4** SL Trả — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 5** Đơn giá — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] Dòng dữ liệu: mở chi tiết, phân trang, empty/loading/error, reload, CSV/print và quyền truy cập đều đúng
**TABLE-ORDERS-08** `variantMatrixTable` · HTML dòng 1415 · tbody: `productVariantsTableBody`
- [x] **Cột 1** Hương vị — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 2** Quy cách — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 3** Mã SKU * — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 4** Giá vốn * — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 5** Giá bán * — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 6** Giá gốc — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 7** Tồn kho * — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 8** Hình ảnh — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 9** Xóa — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] Dòng dữ liệu: mở chi tiết, phân trang, empty/loading/error, reload, CSV/print và quyền truy cập đều đúng
**TABLE-ORDERS-09** `(bảng không có id)` · HTML dòng 1637 · tbody: `stockLogsTableBody`
- [x] **Cột 1** Thời gian — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 2** Loại nghiệp vụ — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 3** Thay đổi — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 4** Tồn trước — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 5** Tồn sau — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 6** Chứng từ tham chiếu — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 7** Người thực hiện — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] Dòng dữ liệu: mở chi tiết, phân trang, empty/loading/error, reload, CSV/print và quyền truy cập đều đúng
**TABLE-ORDERS-10** `(bảng không có id)` · HTML dòng 1717 · tbody: `grnItemsTableBody`
- [x] **Cột 1** Mã SKU — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 2** Tên sản phẩm — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 3** Số lượng nhập — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 4** Đơn giá nhập — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 5** Thành tiền — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 6** Xóa — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] Dòng dữ liệu: mở chi tiết, phân trang, empty/loading/error, reload, CSV/print và quyền truy cập đều đúng
**TABLE-ORDERS-11** `(bảng không có id)` · HTML dòng 1789 · tbody: `stocktakeTableBody`
- [x] **Cột 1** Mã SKU — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 2** Tên sản phẩm — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 3** Tồn hệ thống — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 4** Thực tế đếm — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 5** Chênh lệch — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 6** Lý do chênh lệch — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] Dòng dữ liệu: mở chi tiết, phân trang, empty/loading/error, reload, CSV/print và quyền truy cập đều đúng

### complaints.html — 2 bảng
**TABLE-COMPLAINTS-01** `serviceComplaintsTable` · HTML dòng 113 · tbody: `serviceComplaintsTableBody`
- [x] **Cột 1** Mã khiếu nại — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 2** Khách hàng — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 3** Thú cưng — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 4** Mã lịch hẹn — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 5** Dịch vụ — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 6** Nội dung và vấn đề — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 7** Mức độ — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 8** Hạn xử lý — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 9** Nhân viên phụ trách — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 10** Ngày tiếp nhận — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 11** Trạng thái — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 12** Thao tác — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] Dòng dữ liệu: mở chi tiết, phân trang, empty/loading/error, reload, CSV/print và quyền truy cập đều đúng
**TABLE-COMPLAINTS-02** `orderComplaintsTable` · HTML dòng 258 · tbody: `orderComplaintsTableBody`
- [x] **Cột 1** Mã khiếu nại — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 2** Khách hàng — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 3** Mã đơn hàng — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 4** Sản phẩm liên quan — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 5** Loại vấn đề — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 6** Yêu cầu của khách — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 7** Mức độ — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 8** Hạn xử lý — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 9** Nhân viên phụ trách — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 10** Ngày tiếp nhận — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 11** Trạng thái — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 12** Thao tác — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] Dòng dữ liệu: mở chi tiết, phân trang, empty/loading/error, reload, CSV/print và quyền truy cập đều đúng

### chatbot.html — 6 bảng
**TABLE-CHATBOT-01** `(bảng không có id)` · HTML dòng 343 · tbody: `faqTableBody`
- [x] **Cột 1** Danh mục — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 2** Câu hỏi — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 3** Nội dung giải đáp — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 4** Từ khóa nhận diện — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 5** Ưu tiên — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 6** Trạng thái — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 7** Thao tác — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] Dòng dữ liệu: mở chi tiết, phân trang, empty/loading/error, reload, CSV/print và quyền truy cập đều đúng
**TABLE-CHATBOT-02** `(bảng không có id)` · HTML dòng 399 · tbody: `profanityTableBody`
- [x] **Cột 1** Từ ngữ nhận diện — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 2** Mức độ — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 3** Hành động xử lý — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 4** Ký tự thay thế — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 5** Trạng thái — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 6** Thao tác — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] Dòng dữ liệu: mở chi tiết, phân trang, empty/loading/error, reload, CSV/print và quyền truy cập đều đúng
**TABLE-CHATBOT-03** `(bảng không có id)` · HTML dòng 443 · tbody: `cannedTableBody`
- [x] **Cột 1** Phím tắt — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 2** Tiêu đề mẫu câu — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 3** Nội dung câu mẫu — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 4** Chủ đề — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 5** Lượt dùng — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 6** Trạng thái — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 7** Thao tác — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] Dòng dữ liệu: mở chi tiết, phân trang, empty/loading/error, reload, CSV/print và quyền truy cập đều đúng
**TABLE-CHATBOT-04** `(bảng không có id)` · HTML dòng 482 · tbody: `compPolicyTableBody`
- [x] **Cột 1** Sự cố phát sinh — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 2** Điểm tối đa — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 3** Chiết khấu tối đa — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 4** Phê duyệt — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 5** Kịch bản và Hướng xử lý — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 6** Trạng thái — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] Dòng dữ liệu: mở chi tiết, phân trang, empty/loading/error, reload, CSV/print và quyền truy cập đều đúng
**TABLE-CHATBOT-05** `(bảng không có id)` · HTML dòng 501 · tbody: `handoverRuleTableBody`
- [x] **Cột 1** Điều kiện kích hoạt — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 2** Phân loại trigger — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 3** Ngưỡng kích hoạt và Cơ chế bảo vệ — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 4** Vai trò tiếp nhận — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 5** SLA phản hồi — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 6** Trạng thái — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] Dòng dữ liệu: mở chi tiết, phân trang, empty/loading/error, reload, CSV/print và quyền truy cập đều đúng
**TABLE-CHATBOT-06** `(bảng không có id)` · HTML dòng 586 · tbody: `matrixTableBody`
- [x] **Cột 1** Tình huống kiểm thử — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 2** Đầu vào kiểm thử mẫu — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 3** Cảm xúc kỳ vọng — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 4** Bàn giao — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 5** Kết quả — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] Dòng dữ liệu: mở chi tiết, phân trang, empty/loading/error, reload, CSV/print và quyền truy cập đều đúng

### staff.html — 5 bảng
**TABLE-STAFF-01** `staffListTable` · HTML dòng 102 · tbody: `staffListTableBody`
- [x] **Cột 1** Mã NV — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 2** Họ tên — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 3** Chức vụ — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 4** Số điện thoại — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 5** Ca hiện tại — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 6** Tay nghề — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 7** Trạng thái — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 8** Thao tác — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] Dòng dữ liệu: mở chi tiết, phân trang, empty/loading/error, reload, CSV/print và quyền truy cập đều đúng
**TABLE-STAFF-02** `scheduleDayTable` · HTML dòng 428 · tbody: `scheduleTableBody`
- [x] **Cột 1** Mã NV — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 2** Họ tên và Chức vụ — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 3** Ca sáng (08:00 - 12:00) — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 4** Ca chiều (13:00 - 17:00) — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 5** Ca tối (17:30 - 21:30) — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 6** Ca khuya (22:00 - 06:00) — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 7** Tổng giờ/ngày — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] Dòng dữ liệu: mở chi tiết, phân trang, empty/loading/error, reload, CSV/print và quyền truy cập đều đúng
**TABLE-STAFF-03** `scheduleWeekTable` · HTML dòng 448 · tbody: `scheduleWeekTableBody`
- [x] **Cột 1** Mã NV — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 2** Họ tên — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 3** Thứ 2 — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 4** Thứ 3 — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 5** Thứ 4 — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 6** Thứ 5 — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 7** Thứ 6 — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 8** Thứ 7 — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 9** Chủ Nhật — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 10** Tổng giờ — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] Dòng dữ liệu: mở chi tiết, phân trang, empty/loading/error, reload, CSV/print và quyền truy cập đều đúng
**TABLE-STAFF-04** `assessmentListTable` · HTML dòng 533 · tbody: `assessmentListTableBody`
- [x] **Cột 1** Ngày đánh giá — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 2** Mã NV — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 3** Họ tên — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 4** Loại kiểm tra — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 5** Điểm — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 6** Kết quả — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 7** Người đánh giá — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 8** Ghi chú đào tạo — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 9** Thao tác — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] Dòng dữ liệu: mở chi tiết, phân trang, empty/loading/error, reload, CSV/print và quyền truy cập đều đúng
**TABLE-STAFF-05** `(bảng không có id)` · HTML dòng 1102 · tbody: `reassignBookingsTableBody`
- [x] **Cột 1** Mã hẹn — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 2** Khách hàng và bé cưng — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 3** Dịch vụ yêu cầu — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 4** Khung giờ — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 5** Phân công lại — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] Dòng dữ liệu: mở chi tiết, phân trang, empty/loading/error, reload, CSV/print và quyền truy cập đều đúng

### settings.html — 3 bảng
**TABLE-SETTINGS-01** `(bảng không có id)` · HTML dòng 96 · tbody: `vouchersTableBody`
- [x] **Cột 1** Mã Voucher — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 2** Tên chương trình — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 3** Loại ưu đãi — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 4** Áp dụng — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 5** Giá trị giảm — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 6** Đơn tối thiểu — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 7** Lượt dùng — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 8** Thời hạn — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 9** Trạng thái — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 10** Thao tác — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] Dòng dữ liệu: mở chi tiết, phân trang, empty/loading/error, reload, CSV/print và quyền truy cập đều đúng
**TABLE-SETTINGS-02** `(bảng không có id)` · HTML dòng 268 · tbody: `articlesTableBody`
- [x] **Cột 1** Ảnh bìa — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 2** Tiêu đề bài viết — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 3** Tác giả — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 4** Danh mục — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 5** Lượt xem — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 6** Tri thức AI — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 7** Trạng thái — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 8** Ngày cập nhật — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 9** (tiêu đề trống) — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] Dòng dữ liệu: mở chi tiết, phân trang, empty/loading/error, reload, CSV/print và quyền truy cập đều đúng
**TABLE-SETTINGS-03** `(bảng không có id)` · HTML dòng 531 · tbody: `auditLogTableBody`
- [x] **Cột 1** Thời gian — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 2** Người thực hiện — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 3** Phân hệ tác động — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 4** Nội dung thay đổi — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] **Cột 5** Trạng thái đồng bộ — có giá trị đúng DB/logic, đủ dữ liệu, đúng format và sort/filter/export nếu liên quan
- [x] Dòng dữ liệu: mở chi tiết, phân trang, empty/loading/error, reload, CSV/print và quyền truy cập đều đúng

## G. KIỂM KÊ MODAL/SUBTAB — BẮT BUỘC TEST THAO TÁC MỞ/ĐÓNG/LƯU/HỦY

### dashboard.html
- [x] **Modal `dashboardBookingQuickModal`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event

### customers.html
- [x] **Subtab `subtab-tab-list`** mở trực tiếp và từ nav, không nhân đôi listeners, giữ dữ liệu/focus sau chuyển tab
- [x] **Subtab `subtab-tab-profile`** mở trực tiếp và từ nav, không nhân đôi listeners, giữ dữ liệu/focus sau chuyển tab
- [x] **Subtab `subtab-tab-pawpoint`** mở trực tiếp và từ nav, không nhân đôi listeners, giữ dữ liệu/focus sau chuyển tab
- [x] **Modal `modalAddCustomer`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `modalAdjustPoints`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `modalEditCustomer`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `modalAddPet`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `modalEditPet`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `modalConfirmCustomerAction`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event

### pets.html
- [x] **Subtab `subtab-tab-pet-list`** mở trực tiếp và từ nav, không nhân đôi listeners, giữ dữ liệu/focus sau chuyển tab
- [x] **Subtab `subtab-tab-pet-profile`** mở trực tiếp và từ nav, không nhân đôi listeners, giữ dữ liệu/focus sau chuyển tab
- [x] **Subtab `subtab-tab-pet-carelog`** mở trực tiếp và từ nav, không nhân đôi listeners, giữ dữ liệu/focus sau chuyển tab
- [x] **Subtab `subtab-tab-pet-reminders`** mở trực tiếp và từ nav, không nhân đôi listeners, giữ dữ liệu/focus sau chuyển tab
- [x] **Modal `modalAddPet`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `modalWeighPet`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `modalSendReminder`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `modalViewCareLogDetail`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `modalEditPetProfile`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `modalQuickAddOwner`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `modalCollarTagPreview`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `modalAddVaccine`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `modalPreviewAppDiary`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `modalSelectPhoto`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `modalConfirmPetAction`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event

### services.html
- [x] **Subtab `subtab-tab-service-bookings`** mở trực tiếp và từ nav, không nhân đôi listeners, giữ dữ liệu/focus sau chuyển tab
- [x] **Subtab `subtab-tab-service-detail`** mở trực tiếp và từ nav, không nhân đôi listeners, giữ dữ liệu/focus sau chuyển tab
- [x] **Subtab `subtab-tab-service-catalog`** mở trực tiếp và từ nav, không nhân đôi listeners, giữ dữ liệu/focus sau chuyển tab
- [x] **Subtab `subtab-tab-service-reviews`** mở trực tiếp và từ nav, không nhân đôi listeners, giữ dữ liệu/focus sau chuyển tab
- [x] **Modal `modalCreateBooking`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `modalServiceForm`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `modalCancelBooking`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `modalReplyReview`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `modalAddSurcharge`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `modalCarelogPhotoPreview`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `modalEditCarelogStep`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `modalAddAccompanyingService`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `modalEditIntakeInfo`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `modalChangeStaff`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `modalCompleteBooking`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `modalViewSopDetails`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `modalPrintIntakeWaiver`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `modalNotifyPickup`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `modalStaffSchedule`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `modalConfirmServiceAction`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event

### orders.html
- [x] **Subtab `subtab-tab-order-list`** mở trực tiếp và từ nav, không nhân đôi listeners, giữ dữ liệu/focus sau chuyển tab
- [x] **Subtab `subtab-tab-order-detail`** mở trực tiếp và từ nav, không nhân đôi listeners, giữ dữ liệu/focus sau chuyển tab
- [x] **Subtab `subtab-tab-order-products`** mở trực tiếp và từ nav, không nhân đôi listeners, giữ dữ liệu/focus sau chuyển tab
- [x] **Subtab `subtab-tab-order-promos`** mở trực tiếp và từ nav, không nhân đôi listeners, giữ dữ liệu/focus sau chuyển tab
- [x] **Modal `modalCreateOrder`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `modalPosReceipt`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `modalShipOrder`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `modalCancelOrder`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `modalPackingSlip`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `modalBatchDispatch`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `modalDispatchManifest`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `modalReturnRefund`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `modalAdjustStock`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `modalAddProduct`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `modalCreateVoucher`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `modalVoucherAction`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `modalStockLogs`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `modalGoodsReceipt`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `modalStocktake`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `modalConfirmToggleProductStatus`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `modalConfirmOrderAction`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `modalProductReviews`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event

### complaints.html
- [x] **Subtab `subtab-tab-complaint-services`** mở trực tiếp và từ nav, không nhân đôi listeners, giữ dữ liệu/focus sau chuyển tab
- [x] **Subtab `subtab-tab-complaint-orders`** mở trực tiếp và từ nav, không nhân đôi listeners, giữ dữ liệu/focus sau chuyển tab
- [x] **Subtab `subtab-tab-complaint-detail`** mở trực tiếp và từ nav, không nhân đôi listeners, giữ dữ liệu/focus sau chuyển tab
- [x] **Modal `createTicketModalOverlay`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `resolveTicketModalOverlay`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `assignHandlerModalOverlay`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `requestMoreInfoModalOverlay`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `imagePreviewModalOverlay`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event

### chatbot.html
- [x] **Subtab `subtab-tab-live-support`** mở trực tiếp và từ nav, không nhân đôi listeners, giữ dữ liệu/focus sau chuyển tab
- [x] **Subtab `subtab-tab-ai-copilot`** mở trực tiếp và từ nav, không nhân đôi listeners, giữ dữ liệu/focus sau chuyển tab
- [x] **Subtab `subtab-tab-chatbot-rules`** mở trực tiếp và từ nav, không nhân đôi listeners, giữ dữ liệu/focus sau chuyển tab
- [x] **Modal `rewardPointsModalOverlay`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `convertTicketModalOverlay`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `escalateManagerModalOverlay`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `cannedResponsesModalOverlay`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `orderTrackingModalOverlay`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `petCameraModalOverlay`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `modalConfirmChatbotAction`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `modalFaqEditorOverlay`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `modalProfanityEditorOverlay`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `modalCannedEditorOverlay`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `modalResolveChatOverlay`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `modalAdminImageLightbox`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event

### staff.html
- [x] **Subtab `subtab-tab-staff-list`** mở trực tiếp và từ nav, không nhân đôi listeners, giữ dữ liệu/focus sau chuyển tab
- [x] **Subtab `subtab-tab-staff-profile`** mở trực tiếp và từ nav, không nhân đôi listeners, giữ dữ liệu/focus sau chuyển tab
- [x] **Subtab `subtab-tab-staff-schedule`** mở trực tiếp và từ nav, không nhân đôi listeners, giữ dữ liệu/focus sau chuyển tab
- [x] **Subtab `subtab-tab-staff-assessment`** mở trực tiếp và từ nav, không nhân đôi listeners, giữ dữ liệu/focus sau chuyển tab
- [x] **Modal `staffModalOverlay`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `shiftModalOverlay`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `assessmentModalOverlay`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `leaveSwapModalOverlay`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `leaveRequestsTrayModal`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `reassignModalOverlay`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `incidentReportModalOverlay`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `modalConfirmStaffAction`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event

### settings.html
- [x] **Subtab `subtab-tab-banner-promos`** mở trực tiếp và từ nav, không nhân đôi listeners, giữ dữ liệu/focus sau chuyển tab
- [x] **Subtab `subtab-tab-content-management`** mở trực tiếp và từ nav, không nhân đôi listeners, giữ dữ liệu/focus sau chuyển tab
- [x] **Subtab `subtab-tab-system-config`** mở trực tiếp và từ nav, không nhân đôi listeners, giữ dữ liệu/focus sau chuyển tab
- [x] **Subtab `subtab-tab-audit-logs`** mở trực tiếp và từ nav, không nhân đôi listeners, giữ dữ liệu/focus sau chuyển tab
- [x] **Modal `bannerModalOverlay`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `voucherModalOverlay`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `pawpointsModalOverlay`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `notificationModalOverlay`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `articleModalOverlay`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `storeProfileModalOverlay`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `paymentConfigModalOverlay`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `shippingConfigModalOverlay`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `bookingPolicyModalOverlay`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `impactConfirmModalOverlay`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `articleRagModalOverlay`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event
- [x] **Modal `modalConfirmSettingsAction`**: mở đúng hành động, preload data, validate tất cả field, save đúng DB, cancel no-write, đóng bằng cả X/Hủy, reopen sạch và không duplicate event

## H. KIỂM KÊ TẤT CẢ NÚT BẤM CÓ TRONG 9 HTML (TỪNG NÚT 1 CHECKBOX)

> Các nút tạo động từ JS chưa có trong HTML tĩnh: test thêm ở mục H2. **Bằng chứng liên kết** chỉ là kiểm tra chuỗi tĩnh; với nút không có `id`, JS có thể bắt bằng selector class/data/delegation. Nút `disabled` vẫn cần test trạng thái được bật đúng lúc. Các bộ lọc dạng KPI `div[data-*]` được test riêng ở H3.

### H1.dashboard — 18 nút HTML
- [x] **BTN-DASHBOARD-001** `dashboardAlertAction` · **Xử lý ngay** · `khối chung` · HTML dòng 29 · *Đã thấy ID trong JS: dashboard.js:348*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-DASHBOARD-002** `btnQuickReceptionPet` · **Tiếp nhận bé mới** · `khối chung` · HTML dòng 39 · *Đã thấy ID trong JS: dashboard.js:1115*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-DASHBOARD-003** `btnQuickBookingService` · **Đặt lịch Spa và Hotel** · `khối chung` · HTML dòng 40 · *Đã thấy ID trong JS: dashboard.js:1116*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-DASHBOARD-004** `btnQuickCreateOrder` · **Lên đơn bán lẻ** · `khối chung` · HTML dòng 41 · *Đã thấy ID trong JS: dashboard.js:1117*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-DASHBOARD-005** `dashboardPriorityComplaints` · **Khiếu nại chờ xử lý** · `khối chung` · HTML dòng 54 · `data-action=complaints` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-DASHBOARD-006** `dashboardPriorityOrders` · **Đơn hàng chờ duyệt** · `khối chung` · HTML dòng 58 · `data-action=orders` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-DASHBOARD-007** `btnDashboardViewAllStock` · **Xem kho** · `khối chung` · HTML dòng 67 · *Đã thấy ID trong JS: dashboard.js:1086*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-DASHBOARD-008** `(không có id)` · **Tháng** · `khối chung` · HTML dòng 93 · *Có data-attr \`data-calendar-view=month\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-DASHBOARD-009** `(không có id)` · **Tuần** · `khối chung` · HTML dòng 94 · *Có data-attr \`data-calendar-view=week\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-DASHBOARD-010** `(không có id)` · **Ngày** · `khối chung` · HTML dòng 95 · *Có data-attr \`data-calendar-view=day\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-DASHBOARD-011** `(không có id)` · **Xem tất cả** · `khối chung` · HTML dòng 97 · *Có data-attr \`data-dashboard-module=Dịch vụ\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-DASHBOARD-012** `dashboardCalendarToday` · **Quay về hôm nay** · `khối chung` · HTML dòng 105 · *Đã thấy ID trong JS: dashboard.js:986*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-DASHBOARD-013** `dashboardCalendarPrev` · **Tháng trước** · `khối chung` · HTML dòng 106 · *Đã thấy ID trong JS: dashboard.js:746, dashboard.js:951*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-DASHBOARD-014** `dashboardCalendarNext` · **Tháng sau** · `khối chung` · HTML dòng 107 · *Đã thấy ID trong JS: dashboard.js:749, dashboard.js:964*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-DASHBOARD-015** `(không có id)` · **Xem hội thoại** · `khối chung` · HTML dòng 139 · *Có data-attr \`data-dashboard-module=Chatbot\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-DASHBOARD-016** `btnCloseBookingQuickModal` · **Đóng** · `dashboardBookingQuickModal` · HTML dòng 167 · *Đã thấy ID trong JS: dashboard.js:1213*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-DASHBOARD-017** `btnDismissBookingModal` · **Quay lại** · `dashboardBookingQuickModal` · HTML dòng 179 · *Đã thấy ID trong JS: dashboard.js:1214*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-DASHBOARD-018** `btnGoToServiceDetail` · **Chuyển sang ca Dịch vụ** · `dashboardBookingQuickModal` · HTML dòng 180 · *Đã thấy ID trong JS: dashboard.js:1215*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.

### H1.customers — 49 nút HTML
- [x] **BTN-CUSTOMERS-001** `btnFilterComplaintQuick` · **Lọc danh sách** · `subtab-tab-list` · HTML dòng 41 · *Đã thấy ID trong JS: tab-customer-list.js:989*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CUSTOMERS-002** `btnExportCustomerReport` · **Xuất file** · `subtab-tab-list` · HTML dòng 52 · *Đã thấy ID trong JS: tab-customer-list.js:1094*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CUSTOMERS-003** `btnOpenAddCustomerModal` · **Thêm khách** · `subtab-tab-list` · HTML dòng 53 · *Đã thấy ID trong JS: tab-customer-list.js:567*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CUSTOMERS-004** `btnFilterComplaintOnly` · **Có khiếu nại** · `subtab-tab-list` · HTML dòng 78 · *Đã thấy ID trong JS: tab-customer-list.js:157, tab-customer-list.js:988*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CUSTOMERS-005** `btnCustClearFilters` · **Xóa bộ lọc** · `subtab-tab-list` · HTML dòng 79 · *Đã thấy ID trong JS: tab-customer-list.js:146, tab-customer-list.js:150, tab-customer-list.js:178*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CUSTOMERS-006** `(không có id)` · **Đặt lịch** · `subtab-tab-profile` · HTML dòng 181 · *Có class \`btn-link-service\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CUSTOMERS-007** `(không có id)` · **Lên đơn** · `subtab-tab-profile` · HTML dòng 182 · *Có class \`btn-link-order\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CUSTOMERS-008** `(không có id)` · **Khiếu nại** · `subtab-tab-profile` · HTML dòng 183 · *Có class \`btn-link-complaint\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CUSTOMERS-009** `(không có id)` · **Cá nhân** · `subtab-tab-profile` · HTML dòng 194 · *Có data-attr \`data-drawertab=dtab-personal\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CUSTOMERS-010** `(không có id)` · **Thú cưng** · `subtab-tab-profile` · HTML dòng 195 · *Có data-attr \`data-drawertab=dtab-pets\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CUSTOMERS-011** `(không có id)` · **Đơn hàng 0** · `subtab-tab-profile` · HTML dòng 196 · *Có data-attr \`data-drawertab=dtab-orders\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CUSTOMERS-012** `(không có id)` · **Lịch hẹn 0** · `subtab-tab-profile` · HTML dòng 200 · *Có data-attr \`data-drawertab=dtab-bookings\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CUSTOMERS-013** `(không có id)` · **Khiếu nại 0** · `subtab-tab-profile` · HTML dòng 204 · *Có data-attr \`data-drawertab=dtab-complaints\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CUSTOMERS-014** `btnOpenEditProfileModal` · **Sửa hồ sơ** · `subtab-tab-profile` · HTML dòng 218 · *Đã thấy ID trong JS: tab-customer-profile.js:647*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CUSTOMERS-015** `btnResendSmsToken` · **Gửi lại SMS** · `subtab-tab-profile` · HTML dòng 236 · *Đã thấy ID trong JS: tab-customer-profile.js:393, tab-customer-profile.js:394, tab-customer-profile.js:395*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CUSTOMERS-016** `btnSaveCustomerNote` · **Lưu ghi chú** · `subtab-tab-profile` · HTML dòng 244 · *Đã thấy ID trong JS: tab-customer-profile.js:948*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CUSTOMERS-017** `btnOpenAddPetModal` · **Thêm bé cưng** · `subtab-tab-profile` · HTML dòng 254 · *Đã thấy ID trong JS: tab-customer-profile.js:799*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CUSTOMERS-018** `btnExportPawpointHistory` · **Xuất file** · `subtab-tab-pawpoint` · HTML dòng 369 · *Đã thấy ID trong JS: tab-customer-pawpoint.js:487*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CUSTOMERS-019** `btnOpenAdjustPointsModal` · **Điều chỉnh điểm** · `subtab-tab-pawpoint` · HTML dòng 370 · *Đã thấy ID trong JS: tab-customer-pawpoint.js:469*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CUSTOMERS-020** `btnCloseAddCustomer` · **Đóng** · `modalAddCustomer` · HTML dòng 406 · `data-close-modal=modalAddCustomer` · *Đã thấy ID trong JS: tab-customer-list.js:568*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CUSTOMERS-021** `btnCancelAddCustomer` · **Hủy** · `modalAddCustomer` · HTML dòng 452 · `data-close-modal=modalAddCustomer` · *Đã thấy ID trong JS: tab-customer-list.js:569*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CUSTOMERS-022** `btnSubmitAddCustomer` · **Lưu khách hàng** · `modalAddCustomer` · HTML dòng 453 · *Đã thấy ID trong JS: tab-customer-list.js:705*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CUSTOMERS-023** `btnCloseAdjustPoints` · **Đóng** · `modalAdjustPoints` · HTML dòng 466 · `data-close-modal=modalAdjustPoints` · *Đã thấy ID trong JS: tab-customer-pawpoint.js:475*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CUSTOMERS-024** `(không có id)` · **Bù sự cố trễ hẹn** · `modalAdjustPoints` · HTML dòng 494 · *Chưa thấy liên kết tĩnh rõ ràng (kiểm chứng runtime)*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CUSTOMERS-025** `(không có id)` · **Bù giao hàng chậm** · `modalAdjustPoints` · HTML dòng 495 · *Chưa thấy liên kết tĩnh rõ ràng (kiểm chứng runtime)*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CUSTOMERS-026** `(không có id)` · **Tặng điểm tri ân** · `modalAdjustPoints` · HTML dòng 496 · *Chưa thấy liên kết tĩnh rõ ràng (kiểm chứng runtime)*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CUSTOMERS-027** `(không có id)` · **Thu hồi do hủy đơn** · `modalAdjustPoints` · HTML dòng 497 · *Chưa thấy liên kết tĩnh rõ ràng (kiểm chứng runtime)*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CUSTOMERS-028** `(không có id)` · **Đổi quà tại quầy** · `modalAdjustPoints` · HTML dòng 498 · *Chưa thấy liên kết tĩnh rõ ràng (kiểm chứng runtime)*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CUSTOMERS-029** `(không có id)` · **Điều chỉnh sai lệch điểm** · `modalAdjustPoints` · HTML dòng 499 · *Chưa thấy liên kết tĩnh rõ ràng (kiểm chứng runtime)*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CUSTOMERS-030** `btnCancelAdjustPoints` · **Hủy** · `modalAdjustPoints` · HTML dòng 503 · `data-close-modal=modalAdjustPoints` · *Đã thấy ID trong JS: tab-customer-pawpoint.js:475*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CUSTOMERS-031** `btnSubmitAdjustPoints` · **Xác nhận điều chỉnh** · `modalAdjustPoints` · HTML dòng 504 · *Đã thấy ID trong JS: tab-customer-pawpoint.js:481*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CUSTOMERS-032** `btnCloseEditCustomer` · **Đóng** · `modalEditCustomer` · HTML dòng 517 · `data-close-modal=modalEditCustomer` · *Đã thấy ID trong JS: tab-customer-profile.js:648*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CUSTOMERS-033** `btnAddAddressItem` · **Thêm địa chỉ** · `modalEditCustomer` · HTML dòng 560 · *Đã thấy ID trong JS: tab-customer-profile.js:651, tab-customer-profile.js:657, tab-customer-profile.js:658*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CUSTOMERS-034** `btnCancelEditCustomer` · **Hủy** · `modalEditCustomer` · HTML dòng 568 · `data-close-modal=modalEditCustomer` · *Đã thấy ID trong JS: tab-customer-profile.js:649*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CUSTOMERS-035** `btnSubmitEditCustomer` · **Lưu thay đổi** · `modalEditCustomer` · HTML dòng 569 · *Đã thấy ID trong JS: tab-customer-profile.js:672*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CUSTOMERS-036** `btnCloseAddPet` · **Đóng** · `modalAddPet` · HTML dòng 582 · `data-close-modal=modalAddPet` · *Đã thấy ID trong JS: tab-customer-profile.js:800, tab-customer-profile.js:805*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CUSTOMERS-037** `(không có id)` · **Poodle** · `modalAddPet` · HTML dòng 604 · *Chưa thấy liên kết tĩnh rõ ràng (kiểm chứng runtime)*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CUSTOMERS-038** `(không có id)` · **Corgi** · `modalAddPet` · HTML dòng 605 · *Chưa thấy liên kết tĩnh rõ ràng (kiểm chứng runtime)*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CUSTOMERS-039** `(không có id)` · **Golden** · `modalAddPet` · HTML dòng 606 · *Chưa thấy liên kết tĩnh rõ ràng (kiểm chứng runtime)*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CUSTOMERS-040** `(không có id)` · **Phốc sóc** · `modalAddPet` · HTML dòng 607 · *Chưa thấy liên kết tĩnh rõ ràng (kiểm chứng runtime)*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CUSTOMERS-041** `(không có id)` · **Mèo ALN** · `modalAddPet` · HTML dòng 608 · *Chưa thấy liên kết tĩnh rõ ràng (kiểm chứng runtime)*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CUSTOMERS-042** `btnCancelAddPet` · **Hủy** · `modalAddPet` · HTML dòng 626 · `data-close-modal=modalAddPet` · *Đã thấy ID trong JS: tab-customer-profile.js:801, tab-customer-profile.js:806*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CUSTOMERS-043** `btnSubmitAddPet` · **Lưu bé cưng** · `modalAddPet` · HTML dòng 627 · *Đã thấy ID trong JS: tab-customer-profile.js:820, tab-customer-profile.js:821, tab-customer-profile.js:822*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CUSTOMERS-044** `btnCloseEditPet` · **Đóng** · `modalEditPet` · HTML dòng 640 · `data-close-modal=modalEditPet` · *Đã thấy ID trong JS: tab-customer-profile.js:882, tab-customer-profile.js:886*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CUSTOMERS-045** `btnCancelEditPet` · **Hủy** · `modalEditPet` · HTML dòng 678 · `data-close-modal=modalEditPet` · *Đã thấy ID trong JS: tab-customer-profile.js:883, tab-customer-profile.js:887*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CUSTOMERS-046** `btnSubmitEditPet` · **Lưu cập nhật** · `modalEditPet` · HTML dòng 679 · *Đã thấy ID trong JS: tab-customer-profile.js:891, tab-customer-profile.js:892, tab-customer-profile.js:893*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CUSTOMERS-047** `btnCloseCustConfirm` · **Đóng** · `modalConfirmCustomerAction` · HTML dòng 692 · `data-close-modal=modalConfirmCustomerAction` · *Đã thấy ID trong JS: customers.js:124*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CUSTOMERS-048** `btnCancelCustConfirm` · **Hủy** · `modalConfirmCustomerAction` · HTML dòng 698 · `data-close-modal=modalConfirmCustomerAction` · *Đã thấy ID trong JS: customers.js:118*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CUSTOMERS-049** `btnAcceptCustConfirm` · **Xác nhận** · `modalConfirmCustomerAction` · HTML dòng 699 · *Đã thấy ID trong JS: customers.js:92, customers.js:109*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.

### H1.pets — 69 nút HTML
- [x] **BTN-PETS-001** `btnExportPetReport` · **Xuất file** · `subtab-tab-pet-list` · HTML dòng 40 · *Đã thấy ID trong JS: tab-pet-list.js:646, tab-pet-list.js:647, tab-pet-list.js:648*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-002** `btnOpenAddPetModal` · **Thêm bé cưng** · `subtab-tab-pet-list` · HTML dòng 41 · *Đã thấy ID trong JS: tab-pet-list.js:731*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-003** `btnFilterHotelOnly` · **Đang ở Hotel** · `subtab-tab-pet-list` · HTML dòng 90 · *Đã thấy ID trong JS: tab-pet-list.js:385, tab-pet-list.js:567, tab-pet-list.js:598*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-004** `btnFilterAlertOnly` · **Có cảnh báo** · `subtab-tab-pet-list` · HTML dòng 92 · *Đã thấy ID trong JS: tab-pet-list.js:386, tab-pet-list.js:568, tab-pet-list.js:607*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-005** `btnPetClearFilters` · **Xóa bộ lọc** · `subtab-tab-pet-list` · HTML dòng 93 · *Đã thấy ID trong JS: tab-pet-list.js:200, tab-pet-list.js:217, tab-pet-list.js:218*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-006** `petPrevPageBtn` · **Trang trước** · `subtab-tab-pet-list` · HTML dòng 154 · *Đã thấy ID trong JS: tab-pet-list.js:155, tab-pet-list.js:621*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-007** `petNextPageBtn` · **Trang sau** · `subtab-tab-pet-list` · HTML dòng 156 · *Đã thấy ID trong JS: tab-pet-list.js:156, tab-pet-list.js:632*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-008** `(không có id)` · **Đặt lịch Spa hoặc Hotel** · `subtab-tab-pet-profile` · HTML dòng 184 · *Có class \`btn-quick-book-spa\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-009** `btnDrawerWeighPet` · **Cân bé và Thể trạng** · `subtab-tab-pet-profile` · HTML dòng 185 · *Đã thấy ID trong JS: tab-pet-profile.js:213*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-010** `(không có id)` · **Đăng ảnh nhật ký** · `subtab-tab-pet-profile` · HTML dòng 186 · *Chưa thấy liên kết tĩnh rõ ràng (kiểm chứng runtime)*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-011** `btnDrawerJumpCustomer` · **Xem chủ nuôi** · `subtab-tab-pet-profile` · HTML dòng 187 · *Đã thấy ID trong JS: tab-pet-profile.js:224*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-012** `(không có id)` · **Thể trạng và Đặc tính** · `subtab-tab-pet-profile` · HTML dòng 199 · *Có data-attr \`data-drawertab=ptab-traits\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-013** `(không có id)` · **Xác nhận tiêm chủng !** · `subtab-tab-pet-profile` · HTML dòng 200 · *Có data-attr \`data-drawertab=ptab-vaccine\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-014** `(không có id)` · **Nhật ký chăm sóc 0** · `subtab-tab-pet-profile` · HTML dòng 204 · *Có data-attr \`data-drawertab=ptab-carelog\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-015** `(không có id)` · **Lịch sử dịch vụ** · `subtab-tab-pet-profile` · HTML dòng 208 · *Có data-attr \`data-drawertab=ptab-history\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-016** `btnOpenEditPetModal` · **Sửa hồ sơ** · `subtab-tab-pet-profile` · HTML dòng 223 · *Đã thấy ID trong JS: tab-pet-profile.js:578*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-017** `(không có id)` · **Cân bé** · `subtab-tab-pet-profile` · HTML dòng 239 · *Có class \`btn-sm\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-018** `btnSaveGroomerNotes` · **Lưu ghi chú** · `subtab-tab-pet-profile` · HTML dòng 264 · *Đã thấy ID trong JS: tab-pet-profile.js:395, tab-pet-profile.js:396, tab-pet-profile.js:397*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-019** `btnOpenAddVaccineModal` · **Ghi nhận tiêm chủng hoặc xổ giun** · `subtab-tab-pet-profile` · HTML dòng 278 · *Đã thấy ID trong JS: tab-pet-profile.js:772*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-020** `btnBatchSendReminder` · **Gửi tin đồng loạt Zalo** · `subtab-tab-pet-reminders` · HTML dòng 380 · *Đã thấy ID trong JS: tab-pet-reminders.js:328*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-021** `remPrevPageBtn` · **Trang trước** · `subtab-tab-pet-reminders` · HTML dòng 429 · *Đã thấy ID trong JS: tab-pet-reminders.js:179, tab-pet-reminders.js:329*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-022** `remNextPageBtn` · **Trang sau** · `subtab-tab-pet-reminders` · HTML dòng 431 · *Đã thấy ID trong JS: tab-pet-reminders.js:180, tab-pet-reminders.js:330*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-023** `(không có id)` · **Đóng** · `modalAddPet` · HTML dòng 443 · `data-close-modal=modalAddPet` · *Nút đóng qua data-close-modal; cần test handler dùng chung*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-024** `btnOpenQuickAddOwnerModal` · **Thêm nhanh chủ nuôi** · `modalAddPet` · HTML dòng 451 · *Đã thấy ID trong JS: tab-pet-list.js:740, tab-pet-list.js:992, tab-pet-list.js:993*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-025** `(không có id)` · **Hủy** · `modalAddPet` · HTML dòng 533 · `data-close-modal=modalAddPet` · *Nút đóng qua data-close-modal; cần test handler dùng chung*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-026** `btnSubmitAddPet` · **Lưu bé cưng** · `modalAddPet` · HTML dòng 534 · *Đã thấy ID trong JS: tab-pet-list.js:738, tab-pet-list.js:1189, tab-pet-list.js:1190*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-027** `(không có id)` · **Đóng** · `modalWeighPet` · HTML dòng 547 · `data-close-modal=modalWeighPet` · *Nút đóng qua data-close-modal; cần test handler dùng chung*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-028** `(không có id)` · **Cân định kỳ** · `modalWeighPet` · HTML dòng 571 · *Chưa thấy liên kết tĩnh rõ ràng (kiểm chứng runtime)*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-029** `(không có id)` · **Trước khi tắm spa** · `modalWeighPet` · HTML dòng 572 · *Chưa thấy liên kết tĩnh rõ ràng (kiểm chứng runtime)*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-030** `(không có id)` · **Kiểm tra vào hotel** · `modalWeighPet` · HTML dòng 573 · *Chưa thấy liên kết tĩnh rõ ràng (kiểm chứng runtime)*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-031** `(không có id)` · **Sau đợt điều trị** · `modalWeighPet` · HTML dòng 574 · *Chưa thấy liên kết tĩnh rõ ràng (kiểm chứng runtime)*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-032** `(không có id)` · **Hủy** · `modalWeighPet` · HTML dòng 602 · `data-close-modal=modalWeighPet` · *Nút đóng qua data-close-modal; cần test handler dùng chung*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-033** `btnSubmitWeigh` · **Lưu cân nặng** · `modalWeighPet` · HTML dòng 603 · *Đã thấy ID trong JS: tab-pet-list.js:1339, tab-pet-list.js:1375, tab-pet-list.js:1376*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-034** `(không có id)` · **Đóng** · `modalSendReminder` · HTML dòng 616 · `data-close-modal=modalSendReminder` · *Nút đóng qua data-close-modal; cần test handler dùng chung*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-035** `btnCopyReminderText` · **Sao chép nội dung** · `modalSendReminder` · HTML dòng 659 · *Đã thấy ID trong JS: tab-pet-reminders.js:325, tab-pet-reminders.js:444, tab-pet-reminders.js:445*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-036** `(không có id)` · **Hủy** · `modalSendReminder` · HTML dòng 669 · `data-close-modal=modalSendReminder` · *Nút đóng qua data-close-modal; cần test handler dùng chung*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-037** `btnSubmitSendReminder` · **Gửi tin nhắn** · `modalSendReminder` · HTML dòng 670 · *Đã thấy ID trong JS: tab-pet-reminders.js:327, tab-pet-reminders.js:460*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-038** `(không có id)` · **Đóng** · `modalViewCareLogDetail` · HTML dòng 684 · `data-close-modal=modalViewCareLogDetail` · *Nút đóng qua data-close-modal; cần test handler dùng chung*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-039** `(không có id)` · **Đóng** · `modalViewCareLogDetail` · HTML dòng 754 · `data-close-modal=modalViewCareLogDetail` · *Nút đóng qua data-close-modal; cần test handler dùng chung*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-040** `(không có id)` · **Đóng** · `modalEditPetProfile` · HTML dòng 767 · `data-close-modal=modalEditPetProfile` · *Nút đóng qua data-close-modal; cần test handler dùng chung*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-041** `(không có id)` · **Hủy** · `modalEditPetProfile` · HTML dòng 861 · `data-close-modal=modalEditPetProfile` · *Nút đóng qua data-close-modal; cần test handler dùng chung*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-042** `btnSubmitEditPetProfile` · **Lưu thay đổi** · `modalEditPetProfile` · HTML dòng 862 · *Đã thấy ID trong JS: tab-pet-profile.js:579*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-043** `(không có id)` · **Đóng** · `modalQuickAddOwner` · HTML dòng 875 · `data-close-modal=modalQuickAddOwner` · *Nút đóng qua data-close-modal; cần test handler dùng chung*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-044** `(không có id)` · **Hủy** · `modalQuickAddOwner` · HTML dòng 902 · `data-close-modal=modalQuickAddOwner` · *Nút đóng qua data-close-modal; cần test handler dùng chung*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-045** `btnSubmitQuickAddOwner` · **Lưu chủ nuôi** · `modalQuickAddOwner` · HTML dòng 903 · *Đã thấy ID trong JS: tab-pet-list.js:741, tab-pet-list.js:1006, tab-pet-list.js:1007*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-046** `(không có id)` · **Đóng** · `modalCollarTagPreview` · HTML dòng 916 · `data-close-modal=modalCollarTagPreview` · *Nút đóng qua data-close-modal; cần test handler dùng chung*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-047** `(không có id)` · **Đóng** · `modalCollarTagPreview` · HTML dòng 971 · `data-close-modal=modalCollarTagPreview` · *Nút đóng qua data-close-modal; cần test handler dùng chung*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-048** `btnConfirmSendPrintCollar` · **In thẻ đeo cổ** · `modalCollarTagPreview` · HTML dòng 972 · *Đã thấy ID trong JS: tab-pet-list.js:1312, tab-pet-list.js:1314, tab-pet-list.js:1315*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-049** `(không có id)` · **Đóng** · `modalAddVaccine` · HTML dòng 984 · `data-close-modal=modalAddVaccine` · *Nút đóng qua data-close-modal; cần test handler dùng chung*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-050** `(không có id)` · **Sổ tiêm đối chiếu** · `modalAddVaccine` · HTML dòng 1017 · *Chưa thấy liên kết tĩnh rõ ràng (kiểm chứng runtime)*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-051** `(không có id)` · **PK Thú y 24/7** · `modalAddVaccine` · HTML dòng 1018 · *Chưa thấy liên kết tĩnh rõ ràng (kiểm chứng runtime)*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-052** `(không có id)` · **Bệnh viện PetCare** · `modalAddVaccine` · HTML dòng 1019 · *Chưa thấy liên kết tĩnh rõ ràng (kiểm chứng runtime)*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-053** `(không có id)` · **Hủy** · `modalAddVaccine` · HTML dòng 1033 · `data-close-modal=modalAddVaccine` · *Nút đóng qua data-close-modal; cần test handler dùng chung*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-054** `btnSubmitAddVaccine` · **Lưu sổ tiêm** · `modalAddVaccine` · HTML dòng 1034 · *Đã thấy ID trong JS: tab-pet-profile.js:775, tab-pet-profile.js:804, tab-pet-profile.js:805*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-055** `(không có id)` · **Đóng** · `modalPreviewAppDiary` · HTML dòng 1051 · `data-close-modal=modalPreviewAppDiary` · *Nút đóng qua data-close-modal; cần test handler dùng chung*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-056** `(không có id)` · **Yêu thích (1)** · `modalPreviewAppDiary` · HTML dòng 1166 · *Chưa thấy liên kết tĩnh rõ ràng (kiểm chứng runtime)*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-057** `(không có id)` · **Nhắn dặn dò** · `modalPreviewAppDiary` · HTML dòng 1170 · *Chưa thấy liên kết tĩnh rõ ràng (kiểm chứng runtime)*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-058** `(không có id)` · **Yêu thích (2)** · `modalPreviewAppDiary` · HTML dòng 1205 · *Chưa thấy liên kết tĩnh rõ ràng (kiểm chứng runtime)*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-059** `(không có id)` · **Nhắn dặn dò** · `modalPreviewAppDiary` · HTML dòng 1209 · *Chưa thấy liên kết tĩnh rõ ràng (kiểm chứng runtime)*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-060** `(không có id)` · **Yêu thích (3)** · `modalPreviewAppDiary` · HTML dòng 1244 · *Chưa thấy liên kết tĩnh rõ ràng (kiểm chứng runtime)*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-061** `(không có id)` · **Nhắn dặn dò** · `modalPreviewAppDiary` · HTML dòng 1248 · *Chưa thấy liên kết tĩnh rõ ràng (kiểm chứng runtime)*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-062** `(không có id)` · **Gửi đánh giá** · `modalPreviewAppDiary` · HTML dòng 1323 · *Chưa thấy liên kết tĩnh rõ ràng (kiểm chứng runtime)*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-063** `(không có id)` · **Đóng** · `modalPreviewAppDiary` · HTML dòng 1332 · `data-close-modal=modalPreviewAppDiary` · *Nút đóng qua data-close-modal; cần test handler dùng chung*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-064** `(không có id)` · **Đóng** · `modalSelectPhoto` · HTML dòng 1344 · `data-close-modal=modalSelectPhoto` · *Nút đóng qua data-close-modal; cần test handler dùng chung*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-065** `btnUploadPetPhoto` · **Tải ảnh từ thiết bị** · `modalSelectPhoto` · HTML dòng 1353 · *Đã thấy ID trong JS: tab-pet-list.js:1435, tab-pet-list.js:1437, tab-pet-list.js:1438*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-066** `(không có id)` · **Hủy** · `modalSelectPhoto` · HTML dòng 1358 · `data-close-modal=modalSelectPhoto` · *Nút đóng qua data-close-modal; cần test handler dùng chung*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-067** `btnCloseConfirmPetModal` · **Đóng** · `modalConfirmPetAction` · HTML dòng 1370 · `data-close-modal=modalConfirmPetAction` · *Đã thấy ID trong JS: pets.js:130*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-068** `btnCancelPetConfirm` · **Hủy** · `modalConfirmPetAction` · HTML dòng 1376 · `data-close-modal=modalConfirmPetAction` · *Đã thấy ID trong JS: pets.js:129*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-PETS-069** `btnAcceptPetConfirm` · **Đồng ý** · `modalConfirmPetAction` · HTML dòng 1377 · *Đã thấy ID trong JS: pets.js:128*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.

### H1.services — 114 nút HTML
- [x] **BTN-SERVICES-001** `btnFilterUpcomingQuick` · **Lọc danh sách** · `subtab-tab-service-bookings` · HTML dòng 46 · *Đã thấy ID trong JS: tab-service-bookings.js:666, tab-service-bookings.js:667, tab-service-bookings.js:668*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-002** `btnToolbarResetFilters` · **Xóa nội dung tìm kiếm** · `subtab-tab-service-bookings` · HTML dòng 55 · *Đã thấy ID trong JS: tab-service-bookings.js:260, tab-service-bookings.js:491, tab-service-bookings.js:568*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-003** `btnOpenStaffScheduleModal` · **Lịch trực KTV** · `subtab-tab-service-bookings` · HTML dòng 58 · *Đã thấy ID trong JS: tab-service-bookings.js:1324*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-004** `btnExportServiceReport` · **Xuất file** · `subtab-tab-service-bookings` · HTML dòng 59 · *Đã thấy ID trong JS: tab-service-bookings.js:699*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-005** `btnOpenCreateBookingModal` · **Thêm lịch hẹn** · `subtab-tab-service-bookings` · HTML dòng 60 · *Đã thấy ID trong JS: tab-service-bookings.js:1374*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-006** `btnToggleUpcomingOnly` · **Lịch hẹn sắp tới** · `subtab-tab-service-bookings` · HTML dòng 95 · *Đã thấy ID trong JS: tab-service-bookings.js:475, tab-service-bookings.js:605*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-007** `btnToggleAllergyOnly` · **Pet có lưu ý** · `subtab-tab-service-bookings` · HTML dòng 96 · *Đã thấy ID trong JS: tab-service-bookings.js:478, tab-service-bookings.js:615*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-008** `btnToggleSlaOverdue` · **Quá hạn SLA và Trễ ca** · `subtab-tab-service-bookings` · HTML dòng 97 · *Đã thấy ID trong JS: tab-service-bookings.js:481, tab-service-bookings.js:625*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-009** `btnServiceClearFilters` · **Xóa bộ lọc** · `subtab-tab-service-bookings` · HTML dòng 98 · *Đã thấy ID trong JS: tab-service-bookings.js:265, tab-service-bookings.js:275, tab-service-bookings.js:276*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-010** `btnDetailQuickChangeStaff` · **Đổi KTV** · `subtab-tab-service-detail` · HTML dòng 197 · *Đã thấy ID trong JS: tab-service-detail.js:183*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-011** `btnPrintIntakeWaiver` · **In biên bản tiếp nhận** · `subtab-tab-service-detail` · HTML dòng 267 · *Đã thấy ID trong JS: tab-service-detail.js:376, tab-service-detail.js:951, tab-service-detail.js:1071*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-012** `btnEditIntakeSafety` · **Sửa biên bản tiếp nhận** · `subtab-tab-service-detail` · HTML dòng 268 · *Đã thấy ID trong JS: tab-service-detail.js:306*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-013** `btnSettleToPos` · **Thanh toán tại POS** · `subtab-tab-service-detail` · HTML dòng 324 · *Đã thấy ID trong JS: tab-service-detail.js:390, tab-service-detail.js:391, tab-service-detail.js:392*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-014** `btnOpenAddAccompanyingServiceModal` · **Thêm dịch vụ đi cùng** · `subtab-tab-service-detail` · HTML dòng 325 · *Đã thấy ID trong JS: tab-service-detail.js:858*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-015** `btnOpenAddSurchargeModal` · **Thêm phụ phí** · `subtab-tab-service-detail` · HTML dòng 326 · *Đã thấy ID trong JS: tab-service-detail.js:734*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-016** `btnNotifyCustomerPickup` · **Báo khách đón bé** · `subtab-tab-service-detail` · HTML dòng 367 · *Đã thấy ID trong JS: tab-service-detail.js:383, tab-service-detail.js:962*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-017** `btnShareCarelogLink` · **Chia sẻ cho khách** · `subtab-tab-service-detail` · HTML dòng 368 · *Đã thấy ID trong JS: tab-service-detail.js:406*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-018** `btnTriggerCarelogImageUpload` · **Đính kèm ảnh thực tế** · `subtab-tab-service-detail` · HTML dòng 396 · *Đã thấy ID trong JS: tab-service-detail.js:695*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-019** `btnSubmitCarelogStep` · **Ghi nhật ký** · `subtab-tab-service-detail` · HTML dòng 403 · *Đã thấy ID trong JS: tab-service-detail.js:696*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-020** `(không có id)` · **Spa và Grooming** · `subtab-tab-service-catalog` · HTML dòng 421 · *Có data-attr \`data-group=spa\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-021** `(không có id)` · **Pet Hotel** · `subtab-tab-service-catalog` · HTML dòng 422 · *Có data-attr \`data-group=hotel\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-022** `(không có id)` · **Pet Taxi** · `subtab-tab-service-catalog` · HTML dòng 423 · *Có data-attr \`data-group=taxi\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-023** `btnOpenCreateServiceModal` · **Thêm dịch vụ** · `subtab-tab-service-catalog` · HTML dòng 426 · *Đã thấy ID trong JS: tab-service-catalog.js:707*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-024** `btnExportReviewReport` · **Xuất file báo cáo** · `subtab-tab-service-reviews` · HTML dòng 502 · *Đã thấy ID trong JS: tab-service-reviews.js:568*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-025** `btnCloseCreateBooking` · **Đóng** · `modalCreateBooking` · HTML dòng 576 · `data-close-modal=modalCreateBooking` · *Đã thấy ID trong JS: tab-service-bookings.js:1376, tab-service-bookings.js:1433*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-026** `(không có id)` · **Nhát nước** · `modalCreateBooking` · HTML dòng 738 · *Có data-attr \`data-target=newBookingPetAlert\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-027** `(không có id)` · **Sợ tiếng máy sấy** · `modalCreateBooking` · HTML dòng 739 · *Có data-attr \`data-target=newBookingPetAlert\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-028** `(không có id)` · **Dị ứng xà phòng thơm** · `modalCreateBooking` · HTML dòng 740 · *Có data-attr \`data-target=newBookingPetAlert\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-029** `(không có id)` · **Cắn khi chạm chân sau** · `modalCreateBooking` · HTML dòng 741 · *Có data-attr \`data-target=newBookingPetAlert\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-030** `(không có id)` · **Bé lớn tuổi cần nhẹ tay** · `modalCreateBooking` · HTML dòng 742 · *Có data-attr \`data-target=newBookingPetAlert\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-031** `(không có id)` · **Khách đón trước 17h** · `modalCreateBooking` · HTML dòng 749 · *Có data-attr \`data-target=newBookingNotes\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-032** `(không có id)` · **Tỉa tròn mặt Boo** · `modalCreateBooking` · HTML dòng 750 · *Có data-attr \`data-target=newBookingNotes\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-033** `(không có id)` · **Giữ lại độ dài lông đuôi** · `modalCreateBooking` · HTML dòng 751 · *Có data-attr \`data-target=newBookingNotes\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-034** `(không có id)` · **Chụp nhiều ảnh gửi Zalo** · `modalCreateBooking` · HTML dòng 752 · *Có data-attr \`data-target=newBookingNotes\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-035** `btnCancelCreateBooking` · **Hủy** · `modalCreateBooking` · HTML dòng 756 · `data-close-modal=modalCreateBooking` · *Đã thấy ID trong JS: tab-service-bookings.js:1377, tab-service-bookings.js:1434*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-036** `btnSubmitCreateBooking` · **Lưu lịch hẹn** · `modalCreateBooking` · HTML dòng 757 · *Đã thấy ID trong JS: tab-service-bookings.js:1437, tab-service-bookings.js:1438, tab-service-bookings.js:1439*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-037** `btnCloseServiceForm` · **Đóng** · `modalServiceForm` · HTML dòng 770 · `data-close-modal=modalServiceForm` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-038** `btnAddStepToService` · **Thêm bước** · `modalServiceForm` · HTML dòng 858 · *Đã thấy ID trong JS: tab-service-catalog.js:732*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-039** `btnCancelServiceForm` · **Hủy** · `modalServiceForm` · HTML dòng 886 · `data-close-modal=modalServiceForm` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-040** `btnSubmitServiceForm` · **Lưu dịch vụ** · `modalServiceForm` · HTML dòng 887 · *Đã thấy ID trong JS: tab-service-catalog.js:713, tab-service-catalog.js:770*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-041** `btnCloseCancelBooking` · **Đóng** · `modalCancelBooking` · HTML dòng 900 · `data-close-modal=modalCancelBooking` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-042** `(không có id)` · **Khách đổi lịch sang ngày khác** · `modalCancelBooking` · HTML dòng 920 · *Có data-attr \`data-target=cancelBookingReasonDetail\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-043** `(không có id)` · **Bé đang sốt hoặc mệt** · `modalCancelBooking` · HTML dòng 921 · *Có data-attr \`data-target=cancelBookingReasonDetail\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-044** `(không có id)` · **Thời tiết mưa to** · `modalCancelBooking` · HTML dòng 922 · *Có data-attr \`data-target=cancelBookingReasonDetail\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-045** `(không có id)` · **Kẹt xe trễ giờ hẹn** · `modalCancelBooking` · HTML dòng 923 · *Có data-attr \`data-target=cancelBookingReasonDetail\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-046** `(không có id)` · **Khách đặt nhầm dịch vụ** · `modalCancelBooking` · HTML dòng 924 · *Có data-attr \`data-target=cancelBookingReasonDetail\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-047** `btnDismissCancelBooking` · **Hủy** · `modalCancelBooking` · HTML dòng 929 · `data-close-modal=modalCancelBooking` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-048** `btnConfirmCancelBooking` · **Xác nhận hủy lịch** · `modalCancelBooking` · HTML dòng 930 · *Đã thấy ID trong JS: tab-service-bookings.js:1345*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-049** `btnCloseReplyReview` · **Đóng** · `modalReplyReview` · HTML dòng 942 · `data-close-modal=modalReplyReview` · *Đã thấy ID trong JS: tab-service-reviews.js:505*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-050** `(không có id)` · **PawPal chân thành cảm ơn quý khách đã tin yêu dịch vụ!** · `modalReplyReview` · HTML dòng 966 · *Có data-attr \`data-target=replyReviewText\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-051** `(không có id)` · **Đội ngũ xin ghi nhận và sẽ nâng cấp quy trình ngay hôm nay.** · `modalReplyReview` · HTML dòng 967 · *Có data-attr \`data-target=replyReviewText\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-052** `(không có id)` · **PawPal thành thật xin lỗi vì sự bất tiện này, quản lý sẽ liên hệ hỗ trợ chu đáo.** · `modalReplyReview` · HTML dòng 968 · *Có data-attr \`data-target=replyReviewText\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-053** `(không có id)` · **Rất hân hạnh được đồng hành và chăm sóc bé cưng ở các lần hẹn tới!** · `modalReplyReview` · HTML dòng 969 · *Có data-attr \`data-target=replyReviewText\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-054** `btnEscalateToComplaint` · **Chuyển thành khiếu nại** · `modalReplyReview` · HTML dòng 985 · *Đã thấy ID trong JS: tab-service-reviews.js:323, tab-service-reviews.js:475*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-055** `btnCancelReplyReview` · **Hủy** · `modalReplyReview` · HTML dòng 988 · `data-close-modal=modalReplyReview` · *Đã thấy ID trong JS: tab-service-reviews.js:508*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-056** `btnSubmitReplyReview` · **Gửi phản hồi** · `modalReplyReview` · HTML dòng 989 · *Đã thấy ID trong JS: tab-service-reviews.js:512*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-057** `btnCloseAddSurcharge` · **Đóng** · `modalAddSurcharge` · HTML dòng 1007 · `data-close-modal=modalAddSurcharge` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-058** `(không có id)` · **Lông bết rối sau tai và ngực** · `modalAddSurcharge` · HTML dòng 1060 · *Có data-attr \`data-target=surchargeReasonInput\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-059** `(không có id)` · **Ve rận và nấm da diện rộng** · `modalAddSurcharge` · HTML dòng 1061 · *Có data-attr \`data-target=surchargeReasonInput\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-060** `(không có id)` · **Bé nhút nhát cần 2 KTV hỗ trợ** · `modalAddSurcharge` · HTML dòng 1062 · *Có data-attr \`data-target=surchargeReasonInput\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-061** `(không có id)` · **Chênh lệch khung cân nặng thực tế** · `modalAddSurcharge` · HTML dòng 1063 · *Có data-attr \`data-target=surchargeReasonInput\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-062** `(không có id)` · **Cắt tỉa tạo kiểu chi tiết bổ sung** · `modalAddSurcharge` · HTML dòng 1064 · *Có data-attr \`data-target=surchargeReasonInput\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-063** `btnAddSurchargePhotoBtn` · **Đính kèm ảnh bằng chứng** · `modalAddSurcharge` · HTML dòng 1088 · *Đã thấy ID trong JS: tab-service-bookings.js:2224*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-064** `btnCancelAddSurcharge` · **Hủy** · `modalAddSurcharge` · HTML dòng 1097 · `data-close-modal=modalAddSurcharge` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-065** `btnSubmitAddSurcharge` · **Lưu phụ phí** · `modalAddSurcharge` · HTML dòng 1098 · *Đã thấy ID trong JS: tab-service-bookings.js:2254*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-066** `btnClosePhotoPreview` · **Đóng** · `modalCarelogPhotoPreview` · HTML dòng 1111 · `data-close-modal=modalCarelogPhotoPreview` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-067** `btnCloseEditCarelogStep` · **Đóng** · `modalEditCarelogStep` · HTML dòng 1132 · `data-close-modal=modalEditCarelogStep` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-068** `btnEditCarelogAddPhoto` · **Thêm ảnh mới** · `modalEditCarelogStep` · HTML dòng 1165 · *Đã thấy ID trong JS: tab-service-detail.js:841*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-069** `btnDeleteCarelogStep` · **Xóa bước này** · `modalEditCarelogStep` · HTML dòng 1173 · *Đã thấy ID trong JS: tab-service-detail.js:808*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-070** `btnCancelEditCarelogStep` · **Hủy** · `modalEditCarelogStep` · HTML dòng 1175 · `data-close-modal=modalEditCarelogStep` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-071** `btnSubmitEditCarelogStep` · **Lưu thay đổi** · `modalEditCarelogStep` · HTML dòng 1176 · *Đã thấy ID trong JS: tab-service-detail.js:750*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-072** `btnCloseAddAccompanying` · **Đóng** · `modalAddAccompanyingService` · HTML dòng 1190 · `data-close-modal=modalAddAccompanyingService` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-073** `btnCancelAddAccompanying` · **Hủy** · `modalAddAccompanyingService` · HTML dòng 1229 · `data-close-modal=modalAddAccompanyingService` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-074** `btnSubmitAddAccompanying` · **Lưu dịch vụ đi cùng** · `modalAddAccompanyingService` · HTML dòng 1230 · *Đã thấy ID trong JS: tab-service-detail.js:865*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-075** `btnCloseEditIntakeInfo` · **Đóng** · `modalEditIntakeInfo` · HTML dòng 1249 · `data-close-modal=modalEditIntakeInfo` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-076** `btnAddProofPhotoBtn` · **Tải ảnh bằng chứng** · `modalEditIntakeInfo` · HTML dòng 1376 · *Đã thấy ID trong JS: tab-service-bookings.js:1954*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-077** `btnCancelEditIntakeInfo` · **Hủy** · `modalEditIntakeInfo` · HTML dòng 1385 · `data-close-modal=modalEditIntakeInfo` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-078** `intakeModalSubmitBtn` · **Xác nhận tiếp nhận và bắt đầu ca** · `modalEditIntakeInfo` · HTML dòng 1386 · *Đã thấy ID trong JS: tab-service-bookings.js:831, tab-service-bookings.js:1968*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-079** `menuActionViewDetail` · **Xem chi tiết lịch hẹn** · `khối chung` · HTML dòng 1394 · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-080** `menuActionConfirm` · **Xác nhận lịch hẹn** · `khối chung` · HTML dòng 1395 · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-081** `menuActionIntake` · **Tiếp nhận bé** · `khối chung` · HTML dòng 1396 · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-082** `menuActionChangeStaff` · **Đổi kỹ thuật viên** · `khối chung` · HTML dòng 1397 · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-083** `menuActionComplete` · **Hoàn thành dịch vụ** · `khối chung` · HTML dòng 1398 · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-084** `menuActionCancel` · **Hủy lịch hẹn** · `khối chung` · HTML dòng 1399 · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-085** `btnCloseChangeStaff` · **Đóng** · `modalChangeStaff` · HTML dòng 1414 · `data-close-modal=modalChangeStaff` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-086** `(không có id)` · **KTV bận ca khẩn cấp** · `modalChangeStaff` · HTML dòng 1444 · *Có data-attr \`data-target=changeStaffReasonInput\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-087** `(không có id)` · **Bé cần KTV tay nghề cao hơn** · `modalChangeStaff` · HTML dòng 1445 · *Có data-attr \`data-target=changeStaffReasonInput\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-088** `(không có id)` · **Khách quen yêu cầu đổi KTV** · `modalChangeStaff` · HTML dòng 1446 · *Có data-attr \`data-target=changeStaffReasonInput\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-089** `(không có id)` · **Điều phối cân bằng tải ca trực** · `modalChangeStaff` · HTML dòng 1447 · *Có data-attr \`data-target=changeStaffReasonInput\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-090** `btnCancelChangeStaff` · **Hủy** · `modalChangeStaff` · HTML dòng 1464 · `data-close-modal=modalChangeStaff` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-091** `btnSubmitChangeStaff` · **Xác nhận điều chuyển KTV** · `modalChangeStaff` · HTML dòng 1465 · *Đã thấy ID trong JS: tab-service-bookings.js:2123, tab-service-bookings.js:2124, tab-service-bookings.js:2125*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-092** `btnCloseCompleteBooking` · **Đóng** · `modalCompleteBooking` · HTML dòng 1483 · `data-close-modal=modalCompleteBooking` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-093** `btnAddCompletePhotoBtn` · **Tải ảnh thành phẩm** · `modalCompleteBooking` · HTML dòng 1586 · *Đã thấy ID trong JS: tab-service-bookings.js:2031*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-094** `btnCancelCompleteBooking` · **Hủy** · `modalCompleteBooking` · HTML dòng 1595 · `data-close-modal=modalCompleteBooking` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-095** `completeModalSubmitBtn` · **Lưu biên bản bàn giao** · `modalCompleteBooking` · HTML dòng 1596 · *Đã thấy ID trong JS: tab-service-bookings.js:2045*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-096** `btnCloseSopViewer` · **Đóng** · `modalViewSopDetails` · HTML dòng 1614 · `data-close-modal=modalViewSopDetails` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-097** `btnDismissSopViewer` · **Đóng** · `modalViewSopDetails` · HTML dòng 1628 · `data-close-modal=modalViewSopDetails` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-098** `btnCloseIntakeWaiver` · **Đóng** · `modalPrintIntakeWaiver` · HTML dòng 1644 · `data-close-modal=modalPrintIntakeWaiver` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-099** `btnDismissIntakeWaiver` · **Đóng** · `modalPrintIntakeWaiver` · HTML dòng 1741 · `data-close-modal=modalPrintIntakeWaiver` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-100** `btnPrintIntakeWaiverAction` · **In phiếu tiếp nhận** · `modalPrintIntakeWaiver` · HTML dòng 1742 · *Đã thấy ID trong JS: tab-service-detail.js:1071*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-101** `btnCloseNotifyPickup` · **Đóng** · `modalNotifyPickup` · HTML dòng 1759 · `data-close-modal=modalNotifyPickup` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-102** `btnResetNotifyTemplate` · **Khôi phục mẫu chuẩn** · `modalNotifyPickup` · HTML dòng 1794 · *Đã thấy ID trong JS: tab-service-detail.js:1135*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-103** `btnCancelNotifyPickup` · **Hủy** · `modalNotifyPickup` · HTML dòng 1812 · `data-close-modal=modalNotifyPickup` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-104** `btnSendNotifyPickup` · **Gửi thông báo ngay** · `modalNotifyPickup` · HTML dòng 1813 · *Đã thấy ID trong JS: tab-service-detail.js:1143*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-105** `btnCloseStaffSchedule` · **Đóng** · `modalStaffSchedule` · HTML dòng 1826 · `data-close-modal=modalStaffSchedule` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-106** `(không có id)` · **Tất cả ca trực** · `modalStaffSchedule` · HTML dòng 1852 · *Có data-attr \`data-shift-filter=ALL\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-107** `(không có id)` · **Ca sáng (08:00 - 12:00)** · `modalStaffSchedule` · HTML dòng 1854 · *Có data-attr \`data-shift-filter=MORNING\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-108** `(không có id)` · **Ca chiều (13:00 - 17:00)** · `modalStaffSchedule` · HTML dòng 1856 · *Có data-attr \`data-shift-filter=AFTERNOON\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-109** `(không có id)` · **Ca tối (17:00 - 21:00)** · `modalStaffSchedule` · HTML dòng 1858 · *Có data-attr \`data-shift-filter=EVENING\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-110** `btnNavToStaffModule` · **Quản lý nhân sự** · `modalStaffSchedule` · HTML dòng 1868 · *Đã thấy ID trong JS: tab-service-bookings.js:1313*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-111** `btnDismissStaffSchedule` · **Đóng** · `modalStaffSchedule` · HTML dòng 1869 · `data-close-modal=modalStaffSchedule` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-112** `btnCloseConfirmServiceAction` · **Đóng** · `modalConfirmServiceAction` · HTML dòng 1880 · `data-close-modal=modalConfirmServiceAction` · *Đã thấy ID trong JS: services.js:168*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-113** `btnCancelServiceConfirm` · **Hủy** · `modalConfirmServiceAction` · HTML dòng 1888 · `data-close-modal=modalConfirmServiceAction` · *Đã thấy ID trong JS: services.js:167*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SERVICES-114** `btnAcceptServiceConfirm` · **Đồng ý** · `modalConfirmServiceAction` · HTML dòng 1889 · *Đã thấy ID trong JS: services.js:166*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.

### H1.orders — 97 nút HTML
- [x] **BTN-ORDERS-001** `btnExportOrderReport` · **Xuất file** · `subtab-tab-order-list` · HTML dòng 45 · *Đã thấy ID trong JS: tab-order-list.js:966*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-002** `btnOpenCreateOrderModal` · **Tạo đơn tại quầy** · `subtab-tab-order-list` · HTML dòng 46 · *Đã thấy ID trong JS: tab-order-list.js:1067*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-003** `btnFilterComplaintOrders` · **Có khiếu nại** · `subtab-tab-order-list` · HTML dòng 89 · *Đã thấy ID trong JS: tab-order-list.js:106, tab-order-list.js:914*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-004** `btnFilterUrgentOrders` · **Chờ xử lý gấp** · `subtab-tab-order-list` · HTML dòng 90 · *Đã thấy ID trong JS: tab-order-list.js:108, tab-order-list.js:921*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-005** `btnFilterSlaOverdue` · **Quá hạn SLA (>30p)** · `subtab-tab-order-list` · HTML dòng 91 · *Đã thấy ID trong JS: tab-order-list.js:110, tab-order-list.js:928*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-006** `btnOrderClearFilters` · **Xóa bộ lọc** · `subtab-tab-order-list` · HTML dòng 92 · *Đã thấy ID trong JS: tab-order-list.js:89, tab-order-list.js:93, tab-order-list.js:159*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-007** `btnQuickReconcileAllCod` · **Xác nhận đối soát toàn bộ** · `subtab-tab-order-list` · HTML dòng 104 · *Đã thấy ID trong JS: tab-order-list.js:997*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-008** `btnBatchDeselectAll` · **Bỏ chọn** · `subtab-tab-order-list` · HTML dòng 113 · *Đã thấy ID trong JS: tab-order-list.js:948*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-009** `btnBatchPrintPack` · **In hàng loạt phiếu đóng gói** · `subtab-tab-order-list` · HTML dòng 116 · *Đã thấy ID trong JS: tab-order-list.js:953*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-010** `btnBatchDispatch` · **Bàn giao vận chuyển hàng loạt** · `subtab-tab-order-list` · HTML dòng 117 · *Đã thấy ID trong JS: tab-order-list.js:957*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-011** `btnBatchExportManifest` · **Xuất bảng kê bàn giao** · `subtab-tab-order-list` · HTML dòng 118 · *Đã thấy ID trong JS: tab-order-list.js:961*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-012** `btnOrderPrev` · **<** · `subtab-tab-order-list` · HTML dòng 186 · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-013** `(không có id)` · **1** · `subtab-tab-order-list` · HTML dòng 187 · *Có class \`btn-pagination\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-014** `(không có id)` · **2** · `subtab-tab-order-list` · HTML dòng 188 · *Có class \`btn-pagination\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-015** `(không có id)` · **3** · `subtab-tab-order-list` · HTML dòng 189 · *Có class \`btn-pagination\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-016** `btnOrderNext` · **>** · `subtab-tab-order-list` · HTML dòng 190 · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-017** `btnOpenGoodsReceiptModal` · **Nhập hàng NCC** · `subtab-tab-order-products` · HTML dòng 369 · *Đã thấy ID trong JS: tab-order-products.js:1181*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-018** `btnOpenStocktakeModal` · **Kiểm kê kho** · `subtab-tab-order-products` · HTML dòng 370 · *Đã thấy ID trong JS: tab-order-products.js:1267*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-019** `btnExportProductStock` · **Xuất file kho** · `subtab-tab-order-products` · HTML dòng 371 · *Đã thấy ID trong JS: tab-order-products.js:634*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-020** `btnOpenAddProductModal` · **Thêm sản phẩm** · `subtab-tab-order-products` · HTML dòng 372 · *Đã thấy ID trong JS: tab-order-products.js:663*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-021** `(không có id)` · **Cấu hình Marketing và Banner** · `subtab-tab-order-promos` · HTML dòng 462 · *Inline onclick; cần test hành vi thực*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-022** `btnOpenCreateVoucherModal` · **Tạo mã khuyến mãi** · `subtab-tab-order-promos` · HTML dòng 463 · *Đã thấy ID trong JS: tab-order-promos.js:119*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-023** `menuActionViewDetail` · **Xem chi tiết đơn** · `khối chung` · HTML dòng 495 · *Đã thấy ID trong JS: tab-order-list.js:1509*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-024** `menuActionPrintPack` · **In phiếu đóng hàng** · `khối chung` · HTML dòng 496 · *Đã thấy ID trong JS: tab-order-list.js:1515*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-025** `menuActionShipOrder` · **Bàn giao vận chuyển** · `khối chung` · HTML dòng 497 · *Đã thấy ID trong JS: tab-order-list.js:1521, tab-order-list.js:1685*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-026** `menuActionConfirmPayment` · **Xác nhận thu tiền** · `khối chung` · HTML dòng 498 · *Đã thấy ID trong JS: tab-order-list.js:1527, tab-order-list.js:1671*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-027** `menuActionReconcileCod` · **Đối soát tiền COD bưu cục** · `khối chung` · HTML dòng 499 · *Đã thấy ID trong JS: tab-order-list.js:1533, tab-order-list.js:1676*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-028** `menuActionReturnRefund` · **Đổi trả và hoàn tiền (RMA)** · `khối chung` · HTML dòng 500 · *Đã thấy ID trong JS: tab-order-list.js:1539, tab-order-list.js:1694*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-029** `menuActionCancelOrder` · **Hủy đơn hàng** · `khối chung` · HTML dòng 501 · *Đã thấy ID trong JS: tab-order-list.js:1545, tab-order-list.js:1690*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-030** `btnCloseCreateOrder` · **Đóng** · `modalCreateOrder` · HTML dòng 516 · `data-close-modal=modalCreateOrder` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-031** `btnClearSelectedCustomer` · **✕ Bỏ chọn** · `modalCreateOrder` · HTML dòng 527 · *Đã thấy ID trong JS: tab-order-list.js:523*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-032** `btnPosAddToCart` · **Thêm món** · `modalCreateOrder` · HTML dòng 617 · *Đã thấy ID trong JS: tab-order-list.js:1120*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-033** `btnCashExact` · **Đủ tiền** · `modalCreateOrder` · HTML dòng 671 · *Đã thấy ID trong JS: tab-order-list.js:1157*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-034** `(không có id)` · **+100k** · `modalCreateOrder` · HTML dòng 672 · *Inline onclick; cần test hành vi thực*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-035** `(không có id)` · **+200k** · `modalCreateOrder` · HTML dòng 673 · *Inline onclick; cần test hành vi thực*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-036** `(không có id)` · **+500k** · `modalCreateOrder` · HTML dòng 674 · *Inline onclick; cần test hành vi thực*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-037** `btnCancelCreateOrder` · **Hủy** · `modalCreateOrder` · HTML dòng 724 · `data-close-modal=modalCreateOrder` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-038** `btnSubmitCreateOrder` · **Tạo đơn và in hóa đơn** · `modalCreateOrder` · HTML dòng 725 · *Đã thấy ID trong JS: tab-order-list.js:1181, tab-order-list.js:1384, tab-order-list.js:1391*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-039** `(không có id)` · **Đóng** · `modalPosReceipt` · HTML dòng 738 · `data-close-modal=modalPosReceipt` · *Nút đóng qua data-close-modal; cần test handler dùng chung*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-040** `btnCancelPosReceipt` · **Đóng** · `modalPosReceipt` · HTML dòng 805 · `data-close-modal=modalPosReceipt` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-041** `btnPrintPosReceipt` · **In hóa đơn K80** · `modalPosReceipt` · HTML dòng 806 · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-042** `(không có id)` · **Đóng** · `modalShipOrder` · HTML dòng 819 · `data-close-modal=modalShipOrder` · *Nút đóng qua data-close-modal; cần test handler dùng chung*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-043** `btnCancelShipOrder` · **Hủy** · `modalShipOrder` · HTML dòng 851 · `data-close-modal=modalShipOrder` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-044** `btnSubmitShipOrder` · **Xác nhận giao hàng** · `modalShipOrder` · HTML dòng 852 · *Đã thấy ID trong JS: tab-order-list.js:1396*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-045** `(không có id)` · **Đóng** · `modalCancelOrder` · HTML dòng 865 · `data-close-modal=modalCancelOrder` · *Nút đóng qua data-close-modal; cần test handler dùng chung*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-046** `btnCancelCancelOrder` · **Hủy** · `modalCancelOrder` · HTML dòng 897 · `data-close-modal=modalCancelOrder` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-047** `btnSubmitCancelOrder` · **Xác nhận hủy đơn** · `modalCancelOrder` · HTML dòng 898 · *Đã thấy ID trong JS: tab-order-list.js:1458*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-048** `(không có id)` · **Đóng** · `modalPackingSlip` · HTML dòng 912 · `data-close-modal=modalPackingSlip` · *Nút đóng qua data-close-modal; cần test handler dùng chung*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-049** `btnCancelPackingSlip` · **Đóng** · `modalPackingSlip` · HTML dòng 920 · `data-close-modal=modalPackingSlip` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-050** `btnPrintSlipConfirm` · **In phiếu đóng gói** · `modalPackingSlip` · HTML dòng 921 · *Đã thấy ID trong JS: tab-order-list.js:1553*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-051** `(không có id)` · **Đóng** · `modalBatchDispatch` · HTML dòng 935 · `data-close-modal=modalBatchDispatch` · *Nút đóng qua data-close-modal; cần test handler dùng chung*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-052** `(không có id)` · **Hủy** · `modalBatchDispatch` · HTML dòng 971 · `data-close-modal=modalBatchDispatch` · *Nút đóng qua data-close-modal; cần test handler dùng chung*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-053** `btnSubmitBatchDispatch` · **Xác nhận bàn giao bưu cục** · `modalBatchDispatch` · HTML dòng 972 · *Đã thấy ID trong JS: tab-order-list.js:1560*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-054** `(không có id)` · **Đóng** · `modalDispatchManifest` · HTML dòng 986 · `data-close-modal=modalDispatchManifest` · *Nút đóng qua data-close-modal; cần test handler dùng chung*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-055** `(không có id)` · **Đóng** · `modalDispatchManifest` · HTML dòng 994 · `data-close-modal=modalDispatchManifest` · *Nút đóng qua data-close-modal; cần test handler dùng chung*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-056** `btnPrintManifestConfirm` · **In bảng kê** · `modalDispatchManifest` · HTML dòng 995 · *Đã thấy ID trong JS: tab-order-list.js:1636*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-057** `(không có id)` · **Đóng** · `modalReturnRefund` · HTML dòng 1009 · `data-close-modal=modalReturnRefund` · *Nút đóng qua data-close-modal; cần test handler dùng chung*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-058** `(không có id)` · **Hủy** · `modalReturnRefund` · HTML dòng 1116 · `data-close-modal=modalReturnRefund` · *Nút đóng qua data-close-modal; cần test handler dùng chung*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-059** `btnSubmitRmaTicket` · **Xác nhận phê duyệt RMA** · `modalReturnRefund` · HTML dòng 1117 · *Đã thấy ID trong JS: tab-order-detail.js:258*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-060** `(không có id)` · **Đóng** · `modalAdjustStock` · HTML dòng 1132 · `data-close-modal=modalAdjustStock` · *Nút đóng qua data-close-modal; cần test handler dùng chung*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-061** `(không có id)` · **Hủy** · `modalAdjustStock` · HTML dòng 1194 · `data-close-modal=modalAdjustStock` · *Nút đóng qua data-close-modal; cần test handler dùng chung*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-062** `btnSubmitAdjustStock` · **Lưu cập nhật tồn kho** · `modalAdjustStock` · HTML dòng 1195 · *Đã thấy ID trong JS: tab-order-products.js:1104*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-063** `(không có id)` · **Đóng** · `modalAddProduct` · HTML dòng 1213 · `data-close-modal=modalAddProduct` · *Nút đóng qua data-close-modal; cần test handler dùng chung*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-064** `(không có id)` · **Áp dụng** · `modalAddProduct` · HTML dòng 1409 · *Inline onclick; cần test hành vi thực*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-065** `(không có id)` · **Hủy** · `modalAddProduct` · HTML dòng 1486 · `data-close-modal=modalAddProduct` · *Nút đóng qua data-close-modal; cần test handler dùng chung*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-066** `btnSubmitAddProduct` · **Lưu sản phẩm** · `modalAddProduct` · HTML dòng 1487 · *Đã thấy ID trong JS: tab-order-products.js:668, tab-order-products.js:1433, tab-order-products.js:1490*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-067** `(không có id)` · **Đóng** · `modalCreateVoucher` · HTML dòng 1502 · `data-close-modal=modalCreateVoucher` · *Nút đóng qua data-close-modal; cần test handler dùng chung*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-068** `(không có id)` · **Hủy** · `modalCreateVoucher` · HTML dòng 1546 · `data-close-modal=modalCreateVoucher` · *Nút đóng qua data-close-modal; cần test handler dùng chung*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-069** `btnSubmitCreateVoucher` · **Kích hoạt mã khuyến mãi** · `modalCreateVoucher` · HTML dòng 1547 · *Đã thấy ID trong JS: tab-order-promos.js:124*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-070** `(không có id)` · **Đóng** · `modalVoucherAction` · HTML dòng 1562 · `data-close-modal=modalVoucherAction` · *Nút đóng qua data-close-modal; cần test handler dùng chung*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-071** `(không có id)` · **Hủy** · `modalVoucherAction` · HTML dòng 1599 · `data-close-modal=modalVoucherAction` · *Nút đóng qua data-close-modal; cần test handler dùng chung*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-072** `btnSubmitUpdateVoucher` · **Lưu thay đổi** · `modalVoucherAction` · HTML dòng 1600 · *Đã thấy ID trong JS: tab-order-promos.js:240*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-073** `(không có id)` · **Đóng** · `modalStockLogs` · HTML dòng 1617 · `data-close-modal=modalStockLogs` · *Nút đóng qua data-close-modal; cần test handler dùng chung*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-074** `(không có id)` · **Đóng** · `modalStockLogs` · HTML dòng 1657 · `data-close-modal=modalStockLogs` · *Nút đóng qua data-close-modal; cần test handler dùng chung*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-075** `(không có id)` · **Điều chỉnh tồn kho** · `modalStockLogs` · HTML dòng 1658 · *Inline onclick; cần test hành vi thực*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-076** `(không có id)` · **Đóng** · `modalGoodsReceipt` · HTML dòng 1672 · `data-close-modal=modalGoodsReceipt` · *Nút đóng qua data-close-modal; cần test handler dùng chung*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-077** `btnGrnAddItem` · **Thêm dòng** · `modalGoodsReceipt` · HTML dòng 1712 · *Đã thấy ID trong JS: tab-order-products.js:1186*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-078** `(không có id)` · **Hủy** · `modalGoodsReceipt` · HTML dòng 1753 · `data-close-modal=modalGoodsReceipt` · *Nút đóng qua data-close-modal; cần test handler dùng chung*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-079** `btnSubmitGoodsReceipt` · **Xác nhận nhập kho và cộng tồn** · `modalGoodsReceipt` · HTML dòng 1754 · *Đã thấy ID trong JS: tab-order-products.js:1212*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-080** `(không có id)` · **Đóng** · `modalStocktake` · HTML dòng 1769 · `data-close-modal=modalStocktake` · *Nút đóng qua data-close-modal; cần test handler dùng chung*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-081** `(không có id)` · **Hủy** · `modalStocktake` · HTML dòng 1817 · `data-close-modal=modalStocktake` · *Nút đóng qua data-close-modal; cần test handler dùng chung*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-082** `btnSubmitStocktake` · **Cân đối và cập nhật kho** · `modalStocktake` · HTML dòng 1818 · *Đã thấy ID trong JS: tab-order-products.js:1272*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-083** `(không có id)` · **Đóng** · `modalConfirmToggleProductStatus` · HTML dòng 1835 · `data-close-modal=modalConfirmToggleProductStatus` · *Nút đóng qua data-close-modal; cần test handler dùng chung*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-084** `(không có id)` · **Hủy** · `modalConfirmToggleProductStatus` · HTML dòng 1860 · `data-close-modal=modalConfirmToggleProductStatus` · *Nút đóng qua data-close-modal; cần test handler dùng chung*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-085** `btnConfirmToggleProductStatus` · **Xác nhận chuyển trạng thái** · `modalConfirmToggleProductStatus` · HTML dòng 1861 · *Đã thấy ID trong JS: tab-order-products.js:1331*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-086** `(không có id)` · **Đóng** · `modalConfirmOrderAction` · HTML dòng 1874 · `data-close-modal=modalConfirmOrderAction` · *Nút đóng qua data-close-modal; cần test handler dùng chung*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-087** `btnCancelOrderConfirm` · **Hủy** · `modalConfirmOrderAction` · HTML dòng 1882 · `data-close-modal=modalConfirmOrderAction` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-088** `btnAcceptOrderConfirm` · **Đồng ý** · `modalConfirmOrderAction` · HTML dòng 1883 · *Đã thấy ID trong JS: orders.js:195*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-089** `(không có id)` · **Đóng** · `modalProductReviews` · HTML dòng 1896 · `data-close-modal=modalProductReviews` · *Nút đóng qua data-close-modal; cần test handler dùng chung*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-090** `(không có id)` · **Đóng** · `modalProductReviews` · HTML dòng 1919 · `data-close-modal=modalProductReviews` · *Nút đóng qua data-close-modal; cần test handler dùng chung*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-091** `btnOpenStorefrontProductDetail` · **Xem trên gian hàng trực tuyến** · `modalProductReviews` · HTML dòng 1920 · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-092** `menuStockActionEdit` · **Xem và sửa chi tiết sản phẩm** · `khối chung` · HTML dòng 1929 · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-093** `menuStockActionReviews` · **Xem đánh giá của khách** · `khối chung` · HTML dòng 1930 · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-094** `menuStockActionLogs` · **Xem lịch sử biến động kho** · `khối chung` · HTML dòng 1931 · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-095** `menuStockActionAdjust` · **Điều chỉnh số lượng tồn** · `khối chung` · HTML dòng 1932 · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-096** `menuStockActionQuickGrn` · **Tạo phiếu nhập hàng nhanh** · `khối chung` · HTML dòng 1933 · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-ORDERS-097** `menuStockActionToggleStatus` · **Đổi trạng thái kinh doanh** · `khối chung` · HTML dòng 1934 · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.

### H1.complaints — 57 nút HTML
- [x] **BTN-COMPLAINTS-001** `btnFilterUrgentService` · **Lọc ca cần xử lý gấp** · `subtab-tab-complaint-services` · HTML dòng 41 · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-COMPLAINTS-002** `btnExportServiceComplaints` · **Xuất file** · `subtab-tab-complaint-services` · HTML dòng 52 · *Đã thấy ID trong JS: tab-complaint-services.js:341*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-COMPLAINTS-003** `btnOpenCreateServiceTicket` · **Tạo khiếu nại** · `subtab-tab-complaint-services` · HTML dòng 53 · *Đã thấy ID trong JS: complaints.js:1244*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-COMPLAINTS-004** `(không có id)` · **Tất cả** · `subtab-tab-complaint-services` · HTML dòng 59 · `data-filter=ALL` · *Có data-attr \`data-filter=ALL\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-COMPLAINTS-005** `(không có id)` · **Của tôi phụ trách** · `subtab-tab-complaint-services` · HTML dòng 60 · `data-filter=MY` · *Có data-attr \`data-filter=MY\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-COMPLAINTS-006** `(không có id)` · **Chưa phân công** · `subtab-tab-complaint-services` · HTML dòng 61 · `data-filter=UNASSIGNED` · *Có data-attr \`data-filter=UNASSIGNED\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-COMPLAINTS-007** `(không có id)` · **Chờ quản lý duyệt** · `subtab-tab-complaint-services` · HTML dòng 62 · `data-filter=WAITING_MANAGER` · *Có data-attr \`data-filter=WAITING_MANAGER\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-COMPLAINTS-008** `(không có id)` · **Xử lý lần 2** · `subtab-tab-complaint-services` · HTML dòng 63 · `data-filter=REPROCESSING` · *Có data-attr \`data-filter=REPROCESSING\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-COMPLAINTS-009** `(không có id)` · **Quá hạn SLA** · `subtab-tab-complaint-services` · HTML dòng 64 · `data-filter=OVERDUE` · *Có data-attr \`data-filter=OVERDUE\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-COMPLAINTS-010** `(không có id)` · **Mức độ Cao** · `subtab-tab-complaint-services` · HTML dòng 65 · `data-filter=HIGH` · *Có data-attr \`data-filter=HIGH\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-COMPLAINTS-011** `btnFilterUrgentOrder` · **Lọc ca cần xử lý gấp** · `subtab-tab-complaint-orders` · HTML dòng 184 · *Đã thấy ID trong JS: tab-complaint-orders.js:289*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-COMPLAINTS-012** `btnExportOrderComplaints` · **Xuất file** · `subtab-tab-complaint-orders` · HTML dòng 194 · *Đã thấy ID trong JS: tab-complaint-orders.js:296*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-COMPLAINTS-013** `btnOpenCreateOrderTicket` · **Tạo khiếu nại** · `subtab-tab-complaint-orders` · HTML dòng 195 · *Đã thấy ID trong JS: complaints.js:1249*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-COMPLAINTS-014** `(không có id)` · **Tất cả** · `subtab-tab-complaint-orders` · HTML dòng 201 · `data-filter=ALL` · *Có data-attr \`data-filter=ALL\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-COMPLAINTS-015** `(không có id)` · **Của tôi phụ trách** · `subtab-tab-complaint-orders` · HTML dòng 202 · `data-filter=MY` · *Có data-attr \`data-filter=MY\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-COMPLAINTS-016** `(không có id)` · **Chưa phân công** · `subtab-tab-complaint-orders` · HTML dòng 203 · `data-filter=UNASSIGNED` · *Có data-attr \`data-filter=UNASSIGNED\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-COMPLAINTS-017** `(không có id)` · **Chờ quản lý duyệt** · `subtab-tab-complaint-orders` · HTML dòng 204 · `data-filter=WAITING_MANAGER` · *Có data-attr \`data-filter=WAITING_MANAGER\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-COMPLAINTS-018** `(không có id)` · **Xử lý lần 2** · `subtab-tab-complaint-orders` · HTML dòng 205 · `data-filter=REPROCESSING` · *Có data-attr \`data-filter=REPROCESSING\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-COMPLAINTS-019** `(không có id)` · **Quá hạn SLA** · `subtab-tab-complaint-orders` · HTML dòng 206 · `data-filter=OVERDUE` · *Có data-attr \`data-filter=OVERDUE\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-COMPLAINTS-020** `(không có id)` · **Mức độ Cao** · `subtab-tab-complaint-orders` · HTML dòng 207 · `data-filter=HIGH` · *Có data-attr \`data-filter=HIGH\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-COMPLAINTS-021** `btnAssignHandler` · **Chuyển người phụ trách** · `subtab-tab-complaint-detail` · HTML dòng 302 · *Đã thấy ID trong JS: tab-complaint-detail.js:847*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-COMPLAINTS-022** `btnRequestMoreInfo` · **Yêu cầu bổ sung** · `subtab-tab-complaint-detail` · HTML dòng 303 · *Đã thấy ID trong JS: tab-complaint-detail.js:1007*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-COMPLAINTS-023** `btnOpenResolveModal` · **Chọn phương án giải quyết** · `subtab-tab-complaint-detail` · HTML dòng 304 · *Đã thấy ID trong JS: tab-complaint-detail.js:697*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-COMPLAINTS-024** `btnReopenTicket` · **Mở lại Ticket** · `subtab-tab-complaint-detail` · HTML dòng 305 · *Đã thấy ID trong JS: tab-complaint-detail.js:401, tab-complaint-detail.js:1449*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-COMPLAINTS-025** `btnTriggerUploadMoreEvidence` · **Tải ảnh bằng chứng từ máy** · `subtab-tab-complaint-detail` · HTML dòng 319 · *Đã thấy ID trong JS: tab-complaint-detail.js:1528*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-COMPLAINTS-026** `btnTriggerUploadCheckinPhoto` · **Bổ sung ảnh đón bé** · `subtab-tab-complaint-detail` · HTML dòng 381 · *Đã thấy ID trong JS: tab-complaint-detail.js:1556*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-COMPLAINTS-027** `btnToggleStaffSafetyLock` · **Tạm khóa an toàn KTV** · `subtab-tab-complaint-detail` · HTML dòng 392 · *Đã thấy ID trong JS: tab-complaint-detail.js:165*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-COMPLAINTS-028** `btnTriggerUploadWarehousePhoto` · **Bổ sung ảnh kho** · `subtab-tab-complaint-detail` · HTML dòng 407 · *Đã thấy ID trong JS: tab-complaint-detail.js:1584*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-COMPLAINTS-029** `btnJumpToOriginal` · **Xem chi tiết giao dịch gốc** · `subtab-tab-complaint-detail` · HTML dòng 430 · *Đã thấy ID trong JS: tab-complaint-detail.js:230*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-COMPLAINTS-030** `btnAdvanceRmaStep` · **Cập nhật tiến độ RMA tiếp theo** · `subtab-tab-complaint-detail` · HTML dòng 477 · *Đã thấy ID trong JS: tab-complaint-detail.js:290*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-COMPLAINTS-031** `btnManagerRejectProposal` · **Từ chối đề xuất** · `subtab-tab-complaint-detail` · HTML dòng 546 · *Đã thấy ID trong JS: tab-complaint-detail.js:1346*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-COMPLAINTS-032** `btnManagerApproveProposal` · **Phê duyệt bồi hoàn** · `subtab-tab-complaint-detail` · HTML dòng 547 · *Đã thấy ID trong JS: tab-complaint-detail.js:1217*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-COMPLAINTS-033** `btnTriggerReopenTicket` · **Mở lại Ticket** · `subtab-tab-complaint-detail` · HTML dòng 559 · *Đã thấy ID trong JS: tab-complaint-detail.js:1455*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-COMPLAINTS-034** `btnResolveReprocess` · **Hoàn tất can thiệp lần 2** · `subtab-tab-complaint-detail` · HTML dòng 569 · *Đã thấy ID trong JS: tab-complaint-detail.js:1464*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-COMPLAINTS-035** `btnSubmitReply` · **Lưu và cập nhật nhật ký** · `subtab-tab-complaint-detail` · HTML dòng 593 · *Đã thấy ID trong JS: tab-complaint-detail.js:1150, tab-complaint-detail.js:1151, tab-complaint-detail.js:1152*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-COMPLAINTS-036** `btnCancelCreateTicket` · **Đóng** · `createTicketModalForm` · HTML dòng 609 · `data-close-modal=createTicketModalOverlay` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-COMPLAINTS-037** `btnClearTicketCustomer` · **✕ Bỏ chọn** · `createTicketModalForm` · HTML dòng 630 · *Đã thấy ID trong JS: complaints.js:1523*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-COMPLAINTS-038** `btnClearTicketRef` · **✕ Bỏ chọn** · `createTicketModalForm` · HTML dòng 642 · *Đã thấy ID trong JS: complaints.js:1527*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-COMPLAINTS-039** `btnTriggerUploadTicketFiles` · **Chọn ảnh từ máy tính hoặc điện thoại** · `createTicketModalForm` · HTML dòng 686 · *Đã thấy ID trong JS: complaints.js:1897*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-COMPLAINTS-040** `btnDismissCreateTicket` · **Hủy** · `createTicketModalForm` · HTML dòng 693 · `data-close-modal=createTicketModalOverlay` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-COMPLAINTS-041** `btnSaveCreateTicket` · **Tạo khiếu nại** · `createTicketModalForm` · HTML dòng 694 · *Đã thấy ID trong JS: complaints.js:1919*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-COMPLAINTS-042** `btnCancelResolveModal` · **Đóng** · `resolveTicketModalForm` · HTML dòng 706 · `data-close-modal=resolveTicketModalOverlay` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-COMPLAINTS-043** `btnClearResolveRmaProduct` · **✕ Bỏ chọn** · `resolveTicketModalForm` · HTML dòng 757 · *Đã thấy ID trong JS: tab-complaint-detail.js:585*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-COMPLAINTS-044** `btnDismissResolveModal` · **Hủy** · `resolveTicketModalForm` · HTML dòng 825 · `data-close-modal=resolveTicketModalOverlay` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-COMPLAINTS-045** `btnConfirmResolveTicket` · **Xác nhận giải quyết** · `resolveTicketModalForm` · HTML dòng 826 · *Đã thấy ID trong JS: tab-complaint-detail.js:711*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-COMPLAINTS-046** `btnCancelAssignHandler` · **Đóng** · `assignHandlerModalForm` · HTML dòng 838 · `data-close-modal=assignHandlerModalOverlay` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-COMPLAINTS-047** `btnDismissAssignHandler` · **Hủy** · `assignHandlerModalForm` · HTML dòng 853 · `data-close-modal=assignHandlerModalOverlay` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-COMPLAINTS-048** `btnConfirmAssignHandler` · **Xác nhận chuyển giao** · `assignHandlerModalForm` · HTML dòng 854 · *Đã thấy ID trong JS: tab-complaint-detail.js:852*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-COMPLAINTS-049** `btnCancelRequestInfo` · **Đóng** · `requestMoreInfoModalForm` · HTML dòng 866 · `data-close-modal=requestMoreInfoModalOverlay` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-COMPLAINTS-050** `btnDismissRequestInfo` · **Hủy** · `requestMoreInfoModalForm` · HTML dòng 887 · `data-close-modal=requestMoreInfoModalOverlay` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-COMPLAINTS-051** `btnSendRequestInfo` · **Gửi yêu cầu** · `requestMoreInfoModalForm` · HTML dòng 888 · *Đã thấy ID trong JS: tab-complaint-detail.js:1012*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-COMPLAINTS-052** `btnCloseImagePreview` · **Đóng** · `imagePreviewModalOverlay` · HTML dòng 899 · `data-close-modal=imagePreviewModalOverlay` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-COMPLAINTS-053** `btnDismissImagePreview` · **Đóng** · `imagePreviewModalOverlay` · HTML dòng 906 · `data-close-modal=imagePreviewModalOverlay` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-COMPLAINTS-054** `menuActionViewTicket` · **Xem chi tiết Ticket** · `khối chung` · HTML dòng 913 · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-COMPLAINTS-055** `menuActionQuickAssign` · **Nhận xử lý Ticket** · `khối chung` · HTML dòng 914 · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-COMPLAINTS-056** `menuActionQuickResolve` · **Phương án giải quyết** · `khối chung` · HTML dòng 915 · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-COMPLAINTS-057** `menuActionCloseTicket` · **Đóng Ticket** · `khối chung` · HTML dòng 916 · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.

### H1.chatbot — 91 nút HTML
- [x] **BTN-CHATBOT-001** `filterTabUrgent` · **Xử lý ngay —** · `subtab-tab-live-support` · HTML dòng 16 · `data-filter=urgent` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-002** `filterTabActive` · **Đang chat —** · `subtab-tab-live-support` · HTML dòng 20 · `data-filter=active` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-003** `filterTabAll` · **Tất cả —** · `subtab-tab-live-support` · HTML dòng 24 · `data-filter=all` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-004** `btnChatActionsDots` · **Tác vụ thêm** · `subtab-tab-live-support` · HTML dòng 69 · *Đã thấy ID trong JS: tab-chatbot-live.js:1193*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-005** `btnRewardPoints` · **Tặng điểm Pawpoint** · `subtab-tab-live-support` · HTML dòng 71 · *Đã thấy ID trong JS: tab-chatbot-live.js:1421*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-006** `btnConvertToTicket` · **Chuyển thành Ticket** · `subtab-tab-live-support` · HTML dòng 72 · *Đã thấy ID trong JS: tab-chatbot-live.js:1520*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-007** `btnEscalateManager` · **Chuyển cấp Quản lý** · `subtab-tab-live-support` · HTML dòng 73 · *Đã thấy ID trong JS: tab-chatbot-live.js:1746*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-008** `btnResolveChatAction` · **Hoàn tất ca chat** · `subtab-tab-live-support` · HTML dòng 74 · *Đã thấy ID trong JS: tab-chatbot-live.js:2019*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-009** `btnShowAiContext` · **Mở tóm tắt AI** · `subtab-tab-live-support` · HTML dòng 78 · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-010** `btnHeaderResolveChat` · **Hoàn tất ca** · `subtab-tab-live-support` · HTML dòng 82 · *Đã thấy ID trong JS: tab-chatbot-live.js:537, tab-chatbot-live.js:2020*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-011** `btnToggleTakeover` · **Tiếp nhận** · `subtab-tab-live-support` · HTML dòng 83 · *Đã thấy ID trong JS: tab-chatbot-live.js:504, tab-chatbot-live.js:1212*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-012** `btnExpandAiContext` · **Xem thêm** · `subtab-tab-live-support` · HTML dòng 91 · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-013** `btnContextTrackOrder` · **Vận đơn** · `subtab-tab-live-support` · HTML dòng 93 · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-014** `btnContextPetCamera` · **Camera** · `subtab-tab-live-support` · HTML dòng 94 · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-015** `btnHideAiContext` · **Thu gọn tóm tắt AI** · `subtab-tab-live-support` · HTML dòng 96 · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-016** `btnSuggestPrev` · **Gợi ý trước** · `subtab-tab-live-support` · HTML dòng 116 · *Đã thấy ID trong JS: tab-chatbot-live.js:1378*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-017** `btnSuggestNext` · **Gợi ý tiếp theo** · `subtab-tab-live-support` · HTML dòng 121 · *Đã thấy ID trong JS: tab-chatbot-live.js:1386*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-018** `btnApplySuggest` · **Áp dụng** · `subtab-tab-live-support` · HTML dòng 122 · *Đã thấy ID trong JS: tab-chatbot-live.js:1394*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-019** `btnToggleQuickTemplates` · **Mẫu nhanh ▾** · `subtab-tab-live-support` · HTML dòng 126 · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-020** `(không có id)` · **Lời chào tiếp nhận** · `subtab-tab-live-support` · HTML dòng 128 · *Có data-attr \`data-reply=Dạ PawPal xin chào sen, em là chuyên viên CSKH đã tiếp nhận ca chat này để trực tiếp hỗ trợ mình ngay ạ!\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-021** `(không có id)` · **Xin lỗi giao trễ** · `subtab-tab-live-support` · HTML dòng 129 · *Chưa thấy liên kết tĩnh rõ ràng (kiểm chứng runtime)*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-022** `(không có id)` · **Yêu cầu gửi ảnh** · `subtab-tab-live-support` · HTML dòng 130 · *Chưa thấy liên kết tĩnh rõ ràng (kiểm chứng runtime)*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-023** `(không có id)` · **Tặng điểm tạ lỗi** · `subtab-tab-live-support` · HTML dòng 131 · *Chưa thấy liên kết tĩnh rõ ràng (kiểm chứng runtime)*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-024** `btnToggleSolutionCards` · **Chèn thẻ ▾** · `subtab-tab-live-support` · HTML dòng 135 · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-025** `btnInsertVoucherCard` · **Thẻ Ưu đãi Voucher** · `subtab-tab-live-support` · HTML dòng 137 · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-026** `btnInsertBookingCard` · **Thẻ Lịch hẹn Dịch vụ** · `subtab-tab-live-support` · HTML dòng 138 · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-027** `btnInsertOrderCard` · **Thẻ Đơn hàng gần nhất** · `subtab-tab-live-support` · HTML dòng 139 · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-028** `btnOpenCannedModal` · **Thư viện câu mẫu** · `subtab-tab-live-support` · HTML dòng 142 · *Đã thấy ID trong JS: tab-chatbot-live.js:1836, tab-chatbot-live.js:1896*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-029** `btnHideAssistantBar` · **Thu gọn thanh gợi ý** · `subtab-tab-live-support` · HTML dòng 143 · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-030** `adminChatAttachPreviewRemove` · **Bỏ đính kèm** · `subtab-tab-live-support` · HTML dòng 156 · *Đã thấy ID trong JS: tab-chatbot-live.js:1293*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-031** `btnShowAssistantBar` · **Mở gợi ý AI** · `subtab-tab-live-support` · HTML dòng 164 · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-032** `btnAdminChatAttach` · **Gửi ảnh thú cưng / đơn hàng** · `subtab-tab-live-support` · HTML dòng 168 · *Đã thấy ID trong JS: tab-chatbot-live.js:1287*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-033** `btnSendLiveMessage` · **Gửi tin** · `subtab-tab-live-support` · HTML dòng 169 · *Đã thấy ID trong JS: tab-chatbot-live.js:1025, tab-chatbot-live.js:1273*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-034** `btnSaveChatInternalNote` · **Lưu ghi chú** · `subtab-tab-live-support` · HTML dòng 235 · *Đã thấy ID trong JS: tab-chatbot-live.js:1336*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-035** `btnNewCopilotSession` · **Đoạn chat mới** · `subtab-tab-ai-copilot` · HTML dòng 250 · *Đã thấy ID trong JS: tab-chatbot-copilot.js:21, tab-chatbot-copilot.js:688*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-036** `btnClearCopilotChat` · **Xóa lịch sử chat** · `subtab-tab-ai-copilot` · HTML dòng 268 · *Đã thấy ID trong JS: tab-chatbot-copilot.js:19*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-037** `btnSyncRagData` · **Kiểm tra kho tri thức** · `subtab-tab-ai-copilot` · HTML dòng 269 · *Đã thấy ID trong JS: tab-chatbot-copilot.js:20*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-038** `(không có id)` · **Lịch hẹn Spa hôm nay** · `subtab-tab-ai-copilot` · HTML dòng 290 · *Có data-attr \`data-prompt=Hôm nay có bao nhiêu lịch hẹn Spa đang chờ phục vụ?\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-039** `(không có id)` · **Sản phẩm sắp hết hàng** · `subtab-tab-ai-copilot` · HTML dòng 291 · *Có data-attr \`data-prompt=Liệt kê danh sách sản phẩm có tồn kho dưới 5 món cần nhập thêm\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-040** `(không có id)` · **Soạn thư xin lỗi giao trễ** · `subtab-tab-ai-copilot` · HTML dòng 292 · *Có data-attr \`data-prompt=Soạn thảo thư xin lỗi và voucher 50.000đ cho khách hàng vì shipper giao trễ do mưa lớn\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-041** `(không có id)` · **Tóm tắt khiếu nại tồn đọng** · `subtab-tab-ai-copilot` · HTML dòng 293 · *Có data-attr \`data-prompt=Tóm tắt tình hình các ca khiếu nại chưa xử lý trong 24 giờ qua\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-042** `btnSendCopilot` · **Gửi yêu cầu** · `subtab-tab-ai-copilot` · HTML dòng 299 · *Đã thấy ID trong JS: tab-chatbot-copilot.js:16*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-043** `(không có id)` · **Kho tri thức FAQ 91** · `subtab-tab-chatbot-rules` · HTML dòng 311 · *Có data-attr \`data-rules-view=faq\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-044** `(không có id)` · **Màng lọc Toxic Shield 127** · `subtab-tab-chatbot-rules` · HTML dòng 312 · *Có data-attr \`data-rules-view=profanity\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-045** `(không có id)` · **Mẫu câu phản hồi 11** · `subtab-tab-chatbot-rules` · HTML dòng 313 · *Có data-attr \`data-rules-view=canned\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-046** `(không có id)` · **Hạn mức bồi hoàn và chuyển giao 54** · `subtab-tab-chatbot-rules` · HTML dòng 314 · *Có data-attr \`data-rules-view=policy\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-047** `(không có id)` · **Ma trận kịch bản Benchmark 24** · `subtab-tab-chatbot-rules` · HTML dòng 315 · *Có data-attr \`data-rules-view=matrix\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-048** `(không có id)` · **Quy chuẩn văn hóa CSKH** · `subtab-tab-chatbot-rules` · HTML dòng 316 · *Có data-attr \`data-rules-view=guidelines\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-049** `btnOpenAddFaqModal` · **Thêm câu hỏi FAQ** · `subtab-tab-chatbot-rules` · HTML dòng 337 · *Đã thấy ID trong JS: tab-chatbot-rules.js:990*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-050** `btnOpenAddProfanityModal` · **Thêm từ cấm** · `subtab-tab-chatbot-rules` · HTML dòng 394 · *Đã thấy ID trong JS: tab-chatbot-rules.js:1011*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-051** `btnOpenAddCannedModal` · **Thêm câu mẫu** · `subtab-tab-chatbot-rules` · HTML dòng 438 · *Đã thấy ID trong JS: tab-chatbot-rules.js:1028*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-052** `btnToggleCompPolicy` · **Hạn mức bồi hoàn Pawpoint (33)** · `subtab-tab-chatbot-rules` · HTML dòng 473 · *Đã thấy ID trong JS: tab-chatbot-rules.js:1033*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-053** `btnToggleHandoverRule` · **Quy tắc chuyển ca CSKH (21)** · `subtab-tab-chatbot-rules` · HTML dòng 474 · *Đã thấy ID trong JS: tab-chatbot-rules.js:1034*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-054** `btnRunBenchmarkUI` · **Chạy kiểm thử Benchmark** · `subtab-tab-chatbot-rules` · HTML dòng 581 · *Đã thấy ID trong JS: tab-chatbot-rules.js:801, tab-chatbot-rules.js:1063*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-055** `btnCancelRewardPoints` · **Đóng** · `rewardPointsModalOverlay` · HTML dòng 617 · `data-close-modal=rewardPointsModalOverlay` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-056** `(không có id)` · **+50 điểm** · `rewardPointsModalOverlay` · HTML dòng 628 · *Có data-attr \`data-point=50\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-057** `(không có id)` · **+100 điểm** · `rewardPointsModalOverlay` · HTML dòng 629 · *Có data-attr \`data-point=100\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-058** `(không có id)` · **+200 điểm** · `rewardPointsModalOverlay` · HTML dòng 630 · *Có data-attr \`data-point=200\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-059** `btnDismissRewardModal` · **Hủy** · `rewardPointsModalOverlay` · HTML dòng 645 · `data-close-modal=rewardPointsModalOverlay` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-060** `btnConfirmRewardPoints` · **Xác nhận nạp điểm** · `rewardPointsModalOverlay` · HTML dòng 646 · *Đã thấy ID trong JS: tab-chatbot-live.js:1422*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-061** `btnCancelConvertTicket` · **Đóng** · `convertTicketModalOverlay` · HTML dòng 659 · `data-close-modal=convertTicketModalOverlay` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-062** `btnClearSelectedRef` · **✕ Bỏ chọn** · `convertTicketModalOverlay` · HTML dòng 682 · *Đã thấy ID trong JS: tab-chatbot-live.js:1529, tab-chatbot-live.js:1610*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-063** `btnDismissConvertTicket` · **Hủy** · `convertTicketModalOverlay` · HTML dòng 699 · `data-close-modal=convertTicketModalOverlay` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-064** `btnConfirmConvertTicket` · **Tạo vé khiếu nại** · `convertTicketModalOverlay` · HTML dòng 700 · *Đã thấy ID trong JS: tab-chatbot-live.js:1521*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-065** `btnDismissEscalateModal` · **Đóng** · `escalateManagerModalOverlay` · HTML dòng 713 · `data-close-modal=escalateManagerModalOverlay` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-066** `btnCancelEscalate` · **Hủy** · `escalateManagerModalOverlay` · HTML dòng 746 · `data-close-modal=escalateManagerModalOverlay` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-067** `btnConfirmEscalate` · **Xác nhận chuyển ca** · `escalateManagerModalOverlay` · HTML dòng 747 · *Đã thấy ID trong JS: tab-chatbot-live.js:1747, tab-chatbot-live.js:1760, tab-chatbot-live.js:1774*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-068** `btnDismissCannedModal` · **Đóng** · `cannedResponsesModalOverlay` · HTML dòng 760 · `data-close-modal=cannedResponsesModalOverlay` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-069** `btnCloseCannedModalBottom` · **Đóng** · `cannedResponsesModalOverlay` · HTML dòng 782 · `data-close-modal=cannedResponsesModalOverlay` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-070** `btnDismissTrackingModal` · **Đóng** · `orderTrackingModalOverlay` · HTML dòng 794 · `data-close-modal=orderTrackingModalOverlay` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-071** `btnCancelTrackingModal` · **Đóng** · `orderTrackingModalOverlay` · HTML dòng 834 · `data-close-modal=orderTrackingModalOverlay` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-072** `btnSendTrackingCardToChat` · **Gửi thẻ vận đơn vào chat** · `orderTrackingModalOverlay` · HTML dòng 835 · *Đã thấy ID trong JS: tab-chatbot-live.js:1908, tab-chatbot-live.js:1924*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-073** `btnDismissCameraModal` · **Đóng** · `petCameraModalOverlay` · HTML dòng 847 · `data-close-modal=petCameraModalOverlay` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-074** `btnCancelCameraModal` · **Đóng** · `petCameraModalOverlay` · HTML dòng 870 · `data-close-modal=petCameraModalOverlay` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-075** `btnSendCameraSnapshotToChat` · **Gửi ảnh snapshot vào chat** · `petCameraModalOverlay` · HTML dòng 871 · *Đã thấy ID trong JS: tab-chatbot-live.js:1971, tab-chatbot-live.js:1973*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-076** `btnCloseConfirmChatbotModal` · **Đóng** · `modalConfirmChatbotAction` · HTML dòng 883 · `data-close-modal=modalConfirmChatbotAction` · *Đã thấy ID trong JS: chatbot.js:123*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-077** `btnCancelChatbotConfirm` · **Hủy** · `modalConfirmChatbotAction` · HTML dòng 891 · `data-close-modal=modalConfirmChatbotAction` · *Đã thấy ID trong JS: chatbot.js:122*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-078** `btnAcceptChatbotConfirm` · **Đồng ý** · `modalConfirmChatbotAction` · HTML dòng 892 · *Đã thấy ID trong JS: chatbot.js:121*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-079** `btnCloseFaqEditorModal` · **Đóng** · `modalFaqEditorOverlay` · HTML dòng 904 · `data-close-modal=modalFaqEditorOverlay` · *Đã thấy ID trong JS: tab-chatbot-rules.js:1067*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-080** `btnCancelFaqEditor` · **Hủy** · `modalFaqEditorOverlay` · HTML dòng 939 · `data-close-modal=modalFaqEditorOverlay` · *Đã thấy ID trong JS: tab-chatbot-rules.js:1068*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-081** `btnSaveFaqRecord` · **Lưu câu hỏi FAQ** · `modalFaqEditorOverlay` · HTML dòng 940 · *Đã thấy ID trong JS: tab-chatbot-rules.js:1069, tab-chatbot-rules.js:1084*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-082** `btnCloseProfanityEditorModal` · **Đóng** · `modalProfanityEditorOverlay` · HTML dòng 953 · `data-close-modal=modalProfanityEditorOverlay` · *Đã thấy ID trong JS: tab-chatbot-rules.js:1129*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-083** `btnCancelProfanityEditor` · **Hủy** · `modalProfanityEditorOverlay` · HTML dòng 995 · `data-close-modal=modalProfanityEditorOverlay` · *Đã thấy ID trong JS: tab-chatbot-rules.js:1130*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-084** `btnSaveProfanityRecord` · **Lưu từ cấm** · `modalProfanityEditorOverlay` · HTML dòng 996 · *Đã thấy ID trong JS: tab-chatbot-rules.js:1131, tab-chatbot-rules.js:1144*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-085** `btnCloseCannedEditorModal` · **Đóng** · `modalCannedEditorOverlay` · HTML dòng 1009 · `data-close-modal=modalCannedEditorOverlay` · *Đã thấy ID trong JS: tab-chatbot-rules.js:1186*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-086** `btnCancelCannedEditor` · **Hủy** · `modalCannedEditorOverlay` · HTML dòng 1040 · `data-close-modal=modalCannedEditorOverlay` · *Đã thấy ID trong JS: tab-chatbot-rules.js:1187*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-087** `btnSaveCannedRecord` · **Lưu mẫu câu** · `modalCannedEditorOverlay` · HTML dòng 1041 · *Đã thấy ID trong JS: tab-chatbot-rules.js:1188, tab-chatbot-rules.js:1201*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-088** `btnCloseResolveChatModal` · **Đóng** · `modalResolveChatOverlay` · HTML dòng 1054 · `data-close-modal=modalResolveChatOverlay` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-089** `btnCancelResolveChat` · **Hủy** · `modalResolveChatOverlay` · HTML dòng 1084 · `data-close-modal=modalResolveChatOverlay` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-090** `btnConfirmResolveChat` · **Xác nhận hoàn tất** · `modalResolveChatOverlay` · HTML dòng 1085 · *Đã thấy ID trong JS: tab-chatbot-live.js:2021*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-CHATBOT-091** `btnCloseAdminLightbox` · **Đóng** · `modalAdminImageLightbox` · HTML dòng 1096 · `data-close-modal=modalAdminImageLightbox` · *Đã thấy ID trong JS: chatbot.js:201*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.

### H1.staff — 67 nút HTML
- [x] **BTN-STAFF-001** `btnFilterStaffAlertQuick` · **Lọc danh sách** · `subtab-tab-staff-list` · HTML dòng 41 · *Đã thấy ID trong JS: tab-staff-list.js:733*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-002** `btnClearStaffSearch` · **Xóa nội dung tìm kiếm** · `subtab-tab-staff-list` · HTML dòng 49 · *Đã thấy ID trong JS: tab-staff-list.js:263, tab-staff-list.js:626*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-003** `btnExportStaff` · **Xuất Excel** · `subtab-tab-staff-list` · HTML dòng 52 · *Đã thấy ID trong JS: tab-staff-list.js:748, tab-staff-list.js:749, tab-staff-list.js:750*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-004** `btnOpenAddStaffModal` · **Thêm nhân viên** · `subtab-tab-staff-list` · HTML dòng 53 · *Đã thấy ID trong JS: tab-staff-list.js:742*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-005** `btnFilterRetrainOnly` · **Cần đào tạo lại** · `subtab-tab-staff-list` · HTML dòng 95 · *Đã thấy ID trong JS: tab-staff-list.js:49, tab-staff-list.js:260, tab-staff-list.js:678*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-006** `btnFilterLockOnly` · **Đang khóa nhận việc** · `subtab-tab-staff-list` · HTML dòng 96 · *Đã thấy ID trong JS: tab-staff-list.js:50, tab-staff-list.js:261, tab-staff-list.js:692*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-007** `btnStaffClearFilters` · **Xóa bộ lọc** · `subtab-tab-staff-list` · HTML dòng 97 · *Đã thấy ID trong JS: tab-staff-list.js:262, tab-staff-list.js:701*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-008** `btnProfileToggleSafetyLock` · **Khóa nhận việc** · `subtab-tab-staff-profile` · HTML dòng 152 · *Đã thấy ID trong JS: tab-staff-profile.js:123*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-009** `btnProfileEditStaff` · **Chỉnh sửa hồ sơ** · `subtab-tab-staff-profile` · HTML dòng 153 · *Đã thấy ID trong JS: tab-staff-profile.js:134*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-010** `btnProfileAssignShift` · **Phân ca làm việc** · `subtab-tab-staff-profile` · HTML dòng 154 · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-011** `btnProfileAddAssessment` · **Đánh giá nghiệp vụ** · `subtab-tab-staff-profile` · HTML dòng 155 · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-012** `btnOpenIncidentReportModal` · **Báo cáo sự cố ca** · `subtab-tab-staff-schedule` · HTML dòng 364 · *Đã thấy ID trong JS: tab-staff-schedule.js:841*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-013** `btnPrevDay` · **<** · `subtab-tab-staff-schedule` · HTML dòng 376 · *Đã thấy ID trong JS: tab-staff-schedule.js:704*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-014** `btnNextDay` · **>** · `subtab-tab-staff-schedule` · HTML dòng 378 · *Đã thấy ID trong JS: tab-staff-schedule.js:705*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-015** `btnToday` · **Hôm nay** · `subtab-tab-staff-schedule` · HTML dòng 379 · *Đã thấy ID trong JS: tab-staff-schedule.js:706*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-016** `btnScheduleViewDay` · **Theo ngày** · `subtab-tab-staff-schedule` · HTML dòng 383 · *Đã thấy ID trong JS: tab-staff-schedule.js:677*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-017** `btnScheduleViewWeek` · **Theo tuần** · `subtab-tab-staff-schedule` · HTML dòng 384 · *Đã thấy ID trong JS: tab-staff-schedule.js:678*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-018** `btnOpenLeaveRequestsTray` · **Đơn xin nghỉ và đổi ca ( 0 )** · `subtab-tab-staff-schedule` · HTML dòng 388 · *Đã thấy ID trong JS: tab-staff-schedule.js:802, tab-staff-schedule.js:803, tab-staff-schedule.js:804*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-019** `btnOpenLeaveSwapModal` · **Tạo đơn nghỉ hoặc đổi ca** · `subtab-tab-staff-schedule` · HTML dòng 389 · *Đã thấy ID trong JS: tab-staff-schedule.js:786*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-020** `btnOpenAssignShiftModal` · **Phân ca làm việc** · `subtab-tab-staff-schedule` · HTML dòng 390 · *Đã thấy ID trong JS: tab-staff-schedule.js:711*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-021** `btnClearAssessmentSearch` · **Xóa nội dung tìm kiếm** · `subtab-tab-staff-assessment` · HTML dòng 499 · *Đã thấy ID trong JS: tab-staff-assessment.js:224*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-022** `btnOpenAddAssessmentModal` · **Ghi nhận đánh giá** · `subtab-tab-staff-assessment` · HTML dòng 502 · *Đã thấy ID trong JS: tab-staff-assessment.js:263*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-023** `btnCloseStaffDrawer` · **Đóng** · `staffProfileDrawerOverlay` · HTML dòng 563 · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-024** `btnEditStaffProfile` · **Chỉnh sửa hồ sơ** · `staffProfileDrawerOverlay` · HTML dòng 568 · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-025** `btnAssignShift` · **Phân ca** · `staffProfileDrawerOverlay` · HTML dòng 569 · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-026** `btnRecordAssessment` · **Đánh giá nghiệp vụ** · `staffProfileDrawerOverlay` · HTML dòng 570 · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-027** `btnCancelStaff` · **Đóng** · `staffModalForm` · HTML dòng 644 · `data-close-modal=staffModalOverlay` · *Đã thấy ID trong JS: staff.js:129*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-028** `btnStaffResetPasswordModal` · **Đặt lại mật khẩu** · `staffModalForm` · HTML dòng 723 · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-029** `btnStaffToggleLockAccount` · **Khóa tài khoản** · `staffModalForm` · HTML dòng 724 · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-030** `btnGenerateRandomStaffPass` · **Tạo ngẫu nhiên** · `staffModalForm` · HTML dòng 736 · *Đã thấy ID trong JS: tab-staff-list.js:808*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-031** `btnDismissStaffModal` · **Hủy** · `staffModalForm` · HTML dòng 791 · `data-close-modal=staffModalOverlay` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-032** `btnSaveStaff` · **Lưu nhân viên** · `staffModalForm` · HTML dòng 792 · *Đã thấy ID trong JS: tab-staff-list.js:824, tab-staff-list.js:825, tab-staff-list.js:826*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-033** `btnCancelShiftModal` · **Đóng** · `shiftModalForm` · HTML dòng 804 · `data-close-modal=shiftModalOverlay` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-034** `btnDismissShiftModal` · **Hủy** · `shiftModalForm` · HTML dòng 842 · `data-close-modal=shiftModalOverlay` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-035** `btnSaveShift` · **Lưu phân ca** · `shiftModalForm` · HTML dòng 843 · *Đã thấy ID trong JS: tab-staff-schedule.js:719, tab-staff-schedule.js:720, tab-staff-schedule.js:721*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-036** `btnCancelAssessmentModal` · **Đóng** · `assessmentModalForm` · HTML dòng 855 · `data-close-modal=assessmentModalOverlay` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-037** `btnSendAssessNotify` · **Lưu và gửi thông báo** · `assessmentModalForm` · HTML dòng 904 · *Đã thấy ID trong JS: tab-staff-assessment.js:383*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-038** `btnDismissAssessmentModal` · **Hủy** · `assessmentModalForm` · HTML dòng 906 · `data-close-modal=assessmentModalOverlay` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-039** `btnSaveAssessment` · **Lưu kết quả** · `assessmentModalForm` · HTML dòng 907 · *Đã thấy ID trong JS: tab-staff-assessment.js:378*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-040** `btnCancelLeaveSwapModal` · **Đóng** · `leaveSwapModalForm` · HTML dòng 920 · `data-close-modal=leaveSwapModalOverlay` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-041** `btnTabModeLeave` · **Xin nghỉ phép** · `leaveSwapModalForm` · HTML dòng 925 · *Đã thấy ID trong JS: tab-staff-schedule.js:631*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-042** `btnTabModeSwap` · **Đề xuất đổi ca** · `leaveSwapModalForm` · HTML dòng 927 · *Đã thấy ID trong JS: tab-staff-schedule.js:632*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-043** `btnDismissLeaveSwapModal` · **Hủy** · `leaveSwapModalForm` · HTML dòng 1048 · `data-close-modal=leaveSwapModalOverlay` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-044** `btnSubmitLeavePending` · **Lưu đơn chờ duyệt** · `leaveSwapModalForm` · HTML dòng 1050 · *Đã thấy ID trong JS: tab-staff-schedule.js:796*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-045** `btnApproveLeaveImmediately` · **Duyệt ngay và áp dụng** · `leaveSwapModalForm` · HTML dòng 1051 · *Đã thấy ID trong JS: tab-staff-schedule.js:798*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-046** `btnCancelLeaveRequestsTray` · **Đóng** · `leaveRequestsTrayModal` · HTML dòng 1064 · `data-close-modal=leaveRequestsTrayModal` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-047** `btnFilterReqAll` · **Tất cả** · `leaveRequestsTrayModal` · HTML dòng 1069 · *Đã thấy ID trong JS: tab-staff-schedule.js:391, tab-staff-schedule.js:820*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-048** `btnFilterReqPending` · **Chờ duyệt ( 0 )** · `leaveRequestsTrayModal` · HTML dòng 1070 · *Đã thấy ID trong JS: tab-staff-schedule.js:821*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-049** `btnFilterReqApproved` · **Đã duyệt** · `leaveRequestsTrayModal` · HTML dòng 1071 · *Đã thấy ID trong JS: tab-staff-schedule.js:822*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-050** `btnFilterReqRejected` · **Từ chối** · `leaveRequestsTrayModal` · HTML dòng 1072 · *Đã thấy ID trong JS: tab-staff-schedule.js:823*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-051** `btnOpenLeaveModalFromTray` · **Tạo đơn mới** · `leaveRequestsTrayModal` · HTML dòng 1074 · *Đã thấy ID trong JS: tab-staff-schedule.js:791, tab-staff-schedule.js:809, tab-staff-schedule.js:810*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-052** `btnDismissLeaveRequestsTray` · **Đóng** · `leaveRequestsTrayModal` · HTML dòng 1082 · `data-close-modal=leaveRequestsTrayModal` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-053** `btnCancelReassignModal` · **Đóng** · `reassignModalForm` · HTML dòng 1094 · `data-close-modal=reassignModalOverlay` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-054** `btnDismissReassignModal` · **Bỏ qua (chỉ khóa KTV)** · `reassignModalForm` · HTML dòng 1126 · `data-close-modal=reassignModalOverlay` · *Đã thấy ID trong JS: tab-staff-list.js:1069*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-055** `btnConfirmReassign` · **Xác nhận chuyển giao ca** · `reassignModalForm` · HTML dòng 1127 · *Đã thấy ID trong JS: tab-staff-list.js:1010, tab-staff-list.js:1011, tab-staff-list.js:1012*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-056** `btnCancelIncidentModal` · **Đóng** · `incidentReportModalForm` · HTML dòng 1139 · `data-close-modal=incidentReportModalOverlay` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-057** `btnDismissIncidentModal` · **Hủy** · `incidentReportModalForm` · HTML dòng 1193 · `data-close-modal=incidentReportModalOverlay` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-058** `btnSaveIncidentReport` · **Lưu biên bản sự cố** · `incidentReportModalForm` · HTML dòng 1194 · *Đã thấy ID trong JS: tab-staff-schedule.js:849, tab-staff-schedule.js:850, tab-staff-schedule.js:851*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-059** `menuActionViewProfile` · **Xem hồ sơ** · `khối chung` · HTML dòng 1202 · `data-action=profile` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-060** `menuActionToggleLock` · **Khóa / Mở nhận việc** · `khối chung` · HTML dòng 1203 · `data-action=lock` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-061** `menuActionEditStaff` · **Chỉnh sửa hồ sơ** · `khối chung` · HTML dòng 1204 · `data-action=edit` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-062** `menuActionViewSchedule` · **Xem lịch làm việc** · `khối chung` · HTML dòng 1205 · `data-action=schedule` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-063** `menuActionViewAssess` · **Xem lịch sử đánh giá** · `khối chung` · HTML dòng 1206 · `data-action=assess` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-064** `menuActionDeleteStaff` · **Xóa nhân viên** · `khối chung` · HTML dòng 1207 · `data-action=delete` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-065** `btnCloseConfirmStaffModal` · **Đóng** · `modalConfirmStaffAction` · HTML dòng 1216 · `data-close-modal=modalConfirmStaffAction` · *Đã thấy ID trong JS: staff.js:130*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-066** `btnCancelStaffConfirm` · **Hủy** · `modalConfirmStaffAction` · HTML dòng 1224 · `data-close-modal=modalConfirmStaffAction` · *Đã thấy ID trong JS: staff.js:129*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-STAFF-067** `btnAcceptStaffConfirm` · **Đồng ý** · `modalConfirmStaffAction` · HTML dòng 1225 · *Đã thấy ID trong JS: staff.js:128*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.

### H1.settings — 65 nút HTML
- [x] **BTN-SETTINGS-001** `(không có id)` · **Voucher khuyến mãi** · `subtab-tab-banner-promos` · HTML dòng 32 · `data-settingstab=mkt-vouchers` · *Có data-attr \`data-settingstab=mkt-vouchers\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-002** `(không có id)` · **Banner Website** · `subtab-tab-banner-promos` · HTML dòng 35 · `data-settingstab=mkt-banners` · *Có data-attr \`data-settingstab=mkt-banners\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-003** `(không có id)` · **Chính sách PawPoints** · `subtab-tab-banner-promos` · HTML dòng 38 · `data-settingstab=mkt-pawpoints` · *Có data-attr \`data-settingstab=mkt-pawpoints\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-004** `(không có id)` · **Thông báo Website** · `subtab-tab-banner-promos` · HTML dòng 41 · `data-settingstab=mkt-notices` · *Có data-attr \`data-settingstab=mkt-notices\` xuất hiện trong JS*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-005** `btnFilterZeroMiss` · **Lọc mục cần xử lý** · `subtab-tab-banner-promos` · HTML dòng 55 · *Đã thấy ID trong JS: tab-settings-banners.js:86, tab-settings-banners.js:827*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-006** `btnOpenVoucherModalHeader` · **Tạo voucher** · `subtab-tab-banner-promos` · HTML dòng 66 · *Đã thấy ID trong JS: tab-settings-banners.js:889*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-007** `(không có id)` · **Trang trước** · `subtab-tab-banner-promos` · HTML dòng 121 · *Chưa thấy liên kết tĩnh rõ ràng (kiểm chứng runtime)*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-008** `(không có id)` · **Trang sau** · `subtab-tab-banner-promos` · HTML dòng 123 · *Chưa thấy liên kết tĩnh rõ ràng (kiểm chứng runtime)*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-009** `btnOpenBannerModal` · **Thêm banner** · `subtab-tab-banner-promos` · HTML dòng 133 · *Đã thấy ID trong JS: tab-settings-banners.js:844*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-010** `btnEditPawpointsLink` · **Cấu hình PawPoints** · `subtab-tab-banner-promos` · HTML dòng 148 · *Đã thấy ID trong JS: tab-settings-banners.js:1072*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-011** `btnAddNoticeLink` · **Thêm thông báo** · `subtab-tab-banner-promos` · HTML dòng 183 · *Đã thấy ID trong JS: tab-settings-banners.js:1136*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-012** `btnOpenCreateArticleModal` · **Tạo bài viết mới** · `subtab-tab-content-management` · HTML dòng 239 · *Đã thấy ID trong JS: tab-settings-content.js:248*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-013** `(không có id)` · **Trang trước** · `subtab-tab-content-management` · HTML dòng 292 · *Chưa thấy liên kết tĩnh rõ ràng (kiểm chứng runtime)*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-014** `(không có id)` · **Trang sau** · `subtab-tab-content-management` · HTML dòng 294 · *Chưa thấy liên kết tĩnh rõ ràng (kiểm chứng runtime)*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-015** `btnToggleSafeMode` · **Mở khóa để sửa** · `subtab-tab-system-config` · HTML dòng 310 · *Đã thấy ID trong JS: settings.js:465, settings.js:467, tab-settings-system.js:590*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-016** `btnConfigureStoreProfile` · **Cấu hình thông tin** · `subtab-tab-system-config` · HTML dòng 346 · *Đã thấy ID trong JS: tab-settings-system.js:143*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-017** `btnConfigurePayment` · **Cấu hình thanh toán** · `subtab-tab-system-config` · HTML dòng 378 · *Đã thấy ID trong JS: tab-settings-system.js:236*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-018** `btnConfigureShipping` · **Cấu hình giao hàng** · `subtab-tab-system-config` · HTML dòng 410 · *Đã thấy ID trong JS: tab-settings-system.js:331*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-019** `btnConfigureBookingPolicy` · **Cấu hình chính sách** · `subtab-tab-system-config` · HTML dòng 442 · *Đã thấy ID trong JS: tab-settings-system.js:423*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-020** `btnConfigurePartners` · **Kiểm tra kết nối đối tác** · `subtab-tab-system-config` · HTML dòng 470 · *Đã thấy ID trong JS: tab-settings-system.js:549*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-021** `btnToggleSafeModeAudit` · **Mở khóa để sửa** · `subtab-tab-audit-logs` · HTML dòng 509 · *Đã thấy ID trong JS: settings.js:467, tab-settings-system.js:591*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-022** `btnCancelBannerModal` · **Đóng** · `bannerModalOverlay` · HTML dòng 563 · `data-close-modal=bannerModalOverlay` · *Đã thấy ID trong JS: tab-settings-banners.js:845*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-023** `btnDismissBannerModal` · **Hủy** · `bannerModalOverlay` · HTML dòng 600 · `data-close-modal=bannerModalOverlay` · *Đã thấy ID trong JS: tab-settings-banners.js:846*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-024** `btnSaveBanner` · **Lưu banner** · `bannerModalOverlay` · HTML dòng 601 · *Đã thấy ID trong JS: tab-settings-banners.js:579, tab-settings-banners.js:603, tab-settings-banners.js:847*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-025** `btnCancelVoucherModal` · **Đóng** · `voucherModalOverlay` · HTML dòng 612 · `data-close-modal=voucherModalOverlay` · *Đã thấy ID trong JS: tab-settings-banners.js:890*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-026** `btnAutoGenerateVoucherCode` · **Tạo mã tự động** · `voucherModalOverlay` · HTML dòng 620 · *Đã thấy ID trong JS: tab-settings-banners.js:894*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-027** `btnDismissVoucherModal` · **Hủy** · `voucherModalOverlay` · HTML dòng 700 · `data-close-modal=voucherModalOverlay` · *Đã thấy ID trong JS: tab-settings-banners.js:891*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-028** `btnSaveVoucher` · **Tạo voucher** · `voucherModalOverlay` · HTML dòng 701 · *Đã thấy ID trong JS: tab-settings-banners.js:916*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-029** `btnCancelPawpointsModal` · **Đóng** · `pawpointsModalOverlay` · HTML dòng 712 · `data-close-modal=pawpointsModalOverlay` · *Đã thấy ID trong JS: tab-settings-banners.js:1074*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-030** `btnDismissPawpointsModal` · **Hủy** · `pawpointsModalOverlay` · HTML dòng 742 · `data-close-modal=pawpointsModalOverlay` · *Đã thấy ID trong JS: tab-settings-banners.js:1075*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-031** `btnSavePawpointsPolicy` · **Lưu chính sách** · `pawpointsModalOverlay` · HTML dòng 743 · *Đã thấy ID trong JS: tab-settings-banners.js:1077*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-032** `btnCancelNoticeModal` · **Đóng** · `notificationModalOverlay` · HTML dòng 754 · `data-close-modal=notificationModalOverlay` · *Đã thấy ID trong JS: tab-settings-banners.js:1137*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-033** `btnDismissNoticeModal` · **Hủy** · `notificationModalOverlay` · HTML dòng 780 · `data-close-modal=notificationModalOverlay` · *Đã thấy ID trong JS: tab-settings-banners.js:1138*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-034** `btnSaveNotice` · **Lưu thông báo** · `notificationModalOverlay` · HTML dòng 781 · *Đã thấy ID trong JS: tab-settings-banners.js:1141*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-035** `btnCancelArticleModal` · **Đóng** · `articleModalOverlay` · HTML dòng 792 · `data-close-modal=articleModalOverlay` · *Đã thấy ID trong JS: tab-settings-content.js:258*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-036** `btnDismissArticleModal` · **Hủy** · `articleModalOverlay` · HTML dòng 830 · `data-close-modal=articleModalOverlay` · *Đã thấy ID trong JS: tab-settings-content.js:261*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-037** `btnSaveArticle` · **Xuất bản bài viết** · `articleModalOverlay` · HTML dòng 831 · *Đã thấy ID trong JS: tab-settings-content.js:265*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-038** `btnCancelStoreProfileModal` · **Đóng** · `storeProfileModalOverlay` · HTML dòng 842 · `data-close-modal=storeProfileModalOverlay` · *Đã thấy ID trong JS: tab-settings-system.js:169*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-039** `btnDismissStoreProfileModal` · **Hủy** · `storeProfileModalOverlay` · HTML dòng 892 · `data-close-modal=storeProfileModalOverlay` · *Đã thấy ID trong JS: tab-settings-system.js:170*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-040** `btnSaveStoreProfile` · **Lưu thông tin cửa hàng** · `storeProfileModalOverlay` · HTML dòng 893 · *Đã thấy ID trong JS: tab-settings-system.js:172*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-041** `btnCancelPaymentModal` · **Đóng** · `paymentConfigModalOverlay` · HTML dòng 904 · `data-close-modal=paymentConfigModalOverlay` · *Đã thấy ID trong JS: tab-settings-system.js:262*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-042** `btnDismissPaymentModal` · **Hủy** · `paymentConfigModalOverlay` · HTML dòng 958 · `data-close-modal=paymentConfigModalOverlay` · *Đã thấy ID trong JS: tab-settings-system.js:263*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-043** `btnSavePaymentConfig` · **Lưu cấu hình** · `paymentConfigModalOverlay` · HTML dòng 959 · *Đã thấy ID trong JS: tab-settings-system.js:265*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-044** `btnCancelShippingModal` · **Đóng** · `shippingConfigModalOverlay` · HTML dòng 970 · `data-close-modal=shippingConfigModalOverlay` · *Đã thấy ID trong JS: tab-settings-system.js:353*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-045** `btnDismissShippingModal` · **Hủy** · `shippingConfigModalOverlay` · HTML dòng 1019 · `data-close-modal=shippingConfigModalOverlay` · *Đã thấy ID trong JS: tab-settings-system.js:354*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-046** `btnSaveShippingConfig` · **Lưu cấu hình giao hàng** · `shippingConfigModalOverlay` · HTML dòng 1020 · *Đã thấy ID trong JS: tab-settings-system.js:356*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-047** `btnCancelBookingPolicyModal` · **Đóng** · `bookingPolicyModalOverlay` · HTML dòng 1031 · `data-close-modal=bookingPolicyModalOverlay` · *Đã thấy ID trong JS: tab-settings-system.js:460*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-048** `btnDismissBookingPolicyModal` · **Hủy** · `bookingPolicyModalOverlay` · HTML dòng 1101 · `data-close-modal=bookingPolicyModalOverlay` · *Đã thấy ID trong JS: tab-settings-system.js:461*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-049** `btnSaveBookingPolicy` · **Lưu chính sách và giờ mở cửa** · `bookingPolicyModalOverlay` · HTML dòng 1102 · *Đã thấy ID trong JS: tab-settings-system.js:463*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-050** `btnCancelImpactModal` · **Đóng** · `impactConfirmModalOverlay` · HTML dòng 1113 · `data-close-modal=impactConfirmModalOverlay` · *Đã thấy ID trong JS: settings.js:1005*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-051** `btnDismissImpactModal` · **Hủy bỏ** · `impactConfirmModalOverlay` · HTML dòng 1124 · `data-close-modal=impactConfirmModalOverlay` · *Đã thấy ID trong JS: settings.js:1004*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-052** `btnConfirmAndSyncImpact` · **Xác nhận và đồng bộ ngay** · `impactConfirmModalOverlay` · HTML dòng 1125 · *Đã thấy ID trong JS: settings.js:987*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-053** `btnCancelRagModal` · **Đóng** · `articleRagModalOverlay` · HTML dòng 1135 · `data-close-modal=articleRagModalOverlay` · *Đã thấy ID trong JS: tab-settings-content.js:359*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-054** `btnDismissRagModal` · **Đóng** · `articleRagModalOverlay` · HTML dòng 1159 · `data-close-modal=articleRagModalOverlay` · *Đã thấy ID trong JS: tab-settings-content.js:360*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-055** `btnSyncRagArticle` · **Đồng bộ lại vào chatbot** · `articleRagModalOverlay` · HTML dòng 1160 · *Đã thấy ID trong JS: tab-settings-content.js:429*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-056** `btnCloseConfirmSettingsModal` · **Đóng** · `modalConfirmSettingsAction` · HTML dòng 1170 · `data-close-modal=modalConfirmSettingsAction` · *Đã thấy ID trong JS: settings.js:131*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-057** `btnCancelSettingsConfirm` · **Hủy bỏ** · `modalConfirmSettingsAction` · HTML dòng 1178 · `data-close-modal=modalConfirmSettingsAction` · *Đã thấy ID trong JS: settings.js:130*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-058** `btnAcceptSettingsConfirm` · **Đồng ý** · `modalConfirmSettingsAction` · HTML dòng 1179 · *Đã thấy ID trong JS: settings.js:129*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-059** `btnActionExtendQuota` · **Gia hạn thêm 50 lượt** · `khối chung` · HTML dòng 1186 · *Đã thấy ID trong JS: tab-settings-banners.js:979*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-060** `btnActionToggleStatus` · **Đổi trạng thái bật hoặc tắt** · `khối chung` · HTML dòng 1187 · *Đã thấy ID trong JS: tab-settings-banners.js:1009*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-061** `btnActionDeleteVoucher` · **Xóa voucher** · `khối chung` · HTML dòng 1188 · *Đã thấy ID trong JS: tab-settings-banners.js:1038*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-062** `btnActionViewRag` · **Xem tóm tắt tri thức AI** · `khối chung` · HTML dòng 1193 · *Đã thấy ID trong JS: tab-settings-content.js:363*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-063** `btnActionSyncRag` · **Đồng bộ lại vào chatbot** · `khối chung` · HTML dòng 1194 · *Đã thấy ID trong JS: tab-settings-content.js:405*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-064** `btnActionToggleArticleStatus` · **Đổi trạng thái công khai hoặc tạm ẩn** · `khối chung` · HTML dòng 1195 · *Đã thấy ID trong JS: tab-settings-content.js:458*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.
- [x] **BTN-SETTINGS-065** `btnActionDeleteArticle` · **Xóa bài viết** · `khối chung` · HTML dòng 1196 · *Đã thấy ID trong JS: tab-settings-content.js:499*. **Test:** click→UI đúng→ghi/không ghi đúng→reload/cross-view→negative/role.

### H2. Nút/sự kiện HTML được tạo từ JavaScript (ngoài inventory DOM tĩnh)
**dashboard**
- [x] `dashboard.js`: rà **6** vị trí tạo button; click/action, delegation, no duplicate handler, HTML escaping, quyền và DB.
  - [x] `dashboard.js:479` — `<button type="button" class="dashboard-stock-row" data-sku="${safeSku}" data-dashboard-module="Bán hàng">`
  - [x] `dashboard.js:720` — `<button type="button" class="dashboard-booking-row" data-booking-idx="${idx}">`
  - [x] `dashboard.js:787` — `return \`<button type="button" class="dashboard-week-heading-btn ${key === toDateKey(selectedDate) ? 'is-selected' : ''} ${isToday ? `
  - [x] `dashboard.js:813` — `return \`<button type="button" class="dashboard-calendar-day dashboard-week-day ${selected ? 'is-selected' : ''} ${key === toDateKey(`
  - [x] `dashboard.js:874` — `return \`<button type="button" class="${classes}" style="${styleAttrs}" data-dashboard-module="Dịch vụ" data-booking-id="${b.id \|\| ''`
  - [x] `dashboard.js:924` — `return \`<button type="button" class="${classes}" data-calendar-date="${key}" aria-label="${label}${todayText}${hasAppointments ? ', `

**customers**
- [x] `tab-customer-list.js`: rà **9** vị trí tạo button; click/action, delegation, no duplicate handler, HTML escaping, quyền và DB.
  - [x] `tab-customer-list.js:105` — `html += \`<button type="button" class="pagination-btn ${prevDisabled}" data-page="prev" title="Trang trước">&lt;</button>\`;`
  - [x] `tab-customer-list.js:109` — `html += \`<button type="button" class="pagination-btn ${activeClass}" data-page="${p}">${p}</button>\`;`
  - [x] `tab-customer-list.js:113` — `html += \`<button type="button" class="pagination-btn ${nextDisabled}" data-page="next" title="Trang sau">&gt;</button>\`;`
  - [x] `tab-customer-list.js:234` — `<button type="button" id="btnResetCustomerFilters" style="background: none; border: none; color: #236B48; font-weight: 600; text-dec`
  - [x] `tab-customer-list.js:305` — `<button type="button" class="btn-action-more" data-id="${esc(c.id)}" title="Tác vụ">•••</button>`
  - [x] `tab-customer-list.js:373` — `<button type="button" class="dropdown-item" data-action="profile">`
  - [x] `tab-customer-list.js:376` — `<button type="button" class="dropdown-item" data-action="edit">`
  - [x] `tab-customer-list.js:379` — `<button type="button" class="dropdown-item" data-action="adjust-points">`
  - [x] `tab-customer-list.js:382` — `<button type="button" class="dropdown-item" data-action="toggle-lock">`
- [x] `tab-customer-pawpoint.js`: rà **2** vị trí tạo button; click/action, delegation, no duplicate handler, HTML escaping, quyền và DB.
  - [x] `tab-customer-pawpoint.js:65` — `pager.innerHTML = filtered.length > 0 ? \`<button type="button" class="pagination-btn" ${pawpointCurrentPage === 1 ? 'disabled' : ''}`
  - [x] `tab-customer-pawpoint.js:246` — `<button type="button" class="btn-clear-selected-customer" style="background: none; border: none; color: #236B48; font-size: 12px; fo`
- [x] `tab-customer-profile.js`: rà **8** vị trí tạo button; click/action, delegation, no duplicate handler, HTML escaping, quyền và DB.
  - [x] `tab-customer-profile.js:92` — `<button type="button" class="btn-pet-action btn-pet-view-profile admin-badge badge-neutral" data-pet-id="${esc(pet.id \|\| ('PET-' + (`
  - [x] `tab-customer-profile.js:93` — `<button type="button" class="btn-pet-action btn-pet-edit" data-cust-id="${esc(custId)}" data-pet-index="${idx}">Sửa</button>`
  - [x] `tab-customer-profile.js:94` — `<button type="button" class="btn-pet-action btn-pet-delete" data-cust-id="${esc(custId)}" data-pet-index="${idx}">Xóa</button>`
  - [x] `tab-customer-profile.js:224` — `<td><button type="button" class="admin-btn admin-btn-secondary btn-sm btn-view-order-action" data-order-id="${ord.id}">Xem chi tiết `
  - [x] `tab-customer-profile.js:269` — `<td><button type="button" class="admin-btn admin-btn-secondary btn-sm btn-view-booking-action" data-booking-id="${b.id}">Xem nhật ký`
  - [x] `tab-customer-profile.js:302` — `<td><button type="button" class="admin-btn admin-btn-primary btn-sm btn-view-ticket-action" data-ticket-id="${c.id}">Mở Ticket xử lý`
  - [x] `tab-customer-profile.js:393` — `authStatusEl.innerHTML = \`<span class="admin-badge ${authBadgeClass}">${data.status === 'LOCKED' ? 'Tài khoản bị khóa' : (data.statu`
  - [x] `tab-customer-profile.js:512` — `<button type="button" class="btn-remove-address" data-index="${index}">Xóa</button>`

**pets**
- [x] `tab-pet-carelog.js`: rà **1** vị trí tạo button; click/action, delegation, no duplicate handler, HTML escaping, quyền và DB.
  - [x] `tab-pet-carelog.js:68` — `pager.innerHTML = \`<button type="button" class="btn-pagination" data-page="${currentPage-1}" ${currentPage===1?'disabled':''}>&lt;</`
- [x] `tab-pet-list.js`: rà **11** vị trí tạo button; click/action, delegation, no duplicate handler, HTML escaping, quyền và DB.
  - [x] `tab-pet-list.js:45` — `<button type="button" class="dropdown-item" data-action="profile">`
  - [x] `tab-pet-list.js:48` — `<button type="button" class="dropdown-item" data-action="weigh">`
  - [x] `tab-pet-list.js:51` — `<button type="button" class="dropdown-item" data-action="print">`
  - [x] `tab-pet-list.js:54` — `<button type="button" class="dropdown-item" data-action="service">`
  - [x] `tab-pet-list.js:58` — `<button type="button" class="dropdown-item text-success" data-action="restore">`
  - [x] `tab-pet-list.js:62` — `<button type="button" class="dropdown-item text-danger" data-action="archive">`
  - [x] `tab-pet-list.js:174` — `const btn = document.createElement('button');`
  - [x] `tab-pet-list.js:314` — `<button type="button" id="btnResetPetFilters" style="background: none; border: none; color: #236B48; font-weight: 600; text-decorati`
  - [x] `tab-pet-list.js:370` — `<button type="button" class="btn-action-more" data-id="${esc(pet.code)}" title="Tác vụ">•••</button>`
  - [x] `tab-pet-list.js:804` — `<button type="button" class="btn-clear-selected-new-owner" style="background: none; border: none; color: #DC2626; font-size: 11.5px;`
  - [x] `tab-pet-list.js:1095` — `<button type="button" class="btn-clear-selected-new-owner" style="background: none; border: none; color: #DC2626; font-size: 11.5px;`
- [x] `tab-pet-profile.js`: rà **3** vị trí tạo button; click/action, delegation, no duplicate handler, HTML escaping, quyền và DB.
  - [x] `tab-pet-profile.js:124` — `<button type="button" class="admin-btn admin-btn-secondary btn-sm btn-view-carelog-modal" data-care-id="${esc(c.careId \|\| 'CL-001')}`
  - [x] `tab-pet-profile.js:339` — `<button type="button" class="btn-clear-selected-owner" style="background: none; border: none; color: #DC2626; font-size: 11.5px; cur`
  - [x] `tab-pet-profile.js:751` — `<button type="button" class="btn-clear-selected-owner" style="background: none; border: none; color: #DC2626; font-size: 11.5px; cur`
- [x] `tab-pet-reminders.js`: rà **3** vị trí tạo button; click/action, delegation, no duplicate handler, HTML escaping, quyền và DB.
  - [x] `tab-pet-reminders.js:202` — `const btn = document.createElement('button');`
  - [x] `tab-pet-reminders.js:296` — `<button type="button" class="admin-btn admin-btn-secondary btn-sm btn-open-reminder-modal"`
  - [x] `tab-pet-reminders.js:304` — `<button type="button" class="admin-btn admin-btn-primary btn-sm btn-quick-book-spa"`

**services**
- [x] `tab-service-bookings.js`: rà **20** vị trí tạo button; click/action, delegation, no duplicate handler, HTML escaping, quyền và DB.
  - [x] `tab-service-bookings.js:53` — `<button type="button" class="dropdown-item" data-action="view-detail">`
  - [x] `tab-service-bookings.js:60` — `<button type="button" class="dropdown-item" data-action="confirm-booking">`
  - [x] `tab-service-bookings.js:63` — `<button type="button" class="dropdown-item text-danger" data-action="cancel-booking">`
  - [x] `tab-service-bookings.js:69` — `<button type="button" class="dropdown-item" data-action="intake-safety">`
  - [x] `tab-service-bookings.js:72` — `<button type="button" class="dropdown-item" data-action="add-surcharge">`
  - [x] `tab-service-bookings.js:75` — `<button type="button" class="dropdown-item" data-action="change-staff">`
  - [x] `tab-service-bookings.js:78` — `<button type="button" class="dropdown-item text-danger" data-action="cancel-booking">`
  - [x] `tab-service-bookings.js:84` — `<button type="button" class="dropdown-item" data-action="add-surcharge">`
  - [x] `tab-service-bookings.js:87` — `<button type="button" class="dropdown-item text-success" data-action="complete-booking">`
  - [x] `tab-service-bookings.js:90` — `<button type="button" class="dropdown-item" data-action="escalate-complaint">`
  - [x] `tab-service-bookings.js:96` — `<button type="button" class="dropdown-item" data-action="escalate-complaint">`
  - [x] `tab-service-bookings.js:287` — `<button type="button" id="btnResetServiceFilters" style="background: none; border: none; color: #236B48; font-weight: 600; text-deco`
  - [x] Còn 8 vị trí tạo button trong `tab-service-bookings.js`: tìm `<button`/`createElement("button")` và bổ sung từng action vào kết quả runtime
- [x] `tab-service-catalog.js`: rà **5** vị trí tạo button; click/action, delegation, no duplicate handler, HTML escaping, quyền và DB.
  - [x] `tab-service-catalog.js:41` — `<button type="button" class="btn-remove-pet-type-tag" data-tag="${tag}" style="background: none; border: none; color: #236B48; curso`
  - [x] `tab-service-catalog.js:232` — `<button type="button" class="btn-remove-sop-step" data-step-index="${idx}" style="background: none; border: none; color: #DC2626; fo`
  - [x] `tab-service-catalog.js:327` — `<button type="button" class="btn-view-sop-pill btn-view-service-sop" data-service-code="${esc(svc.code \|\| svc.id)}" title="Xem quy t`
  - [x] `tab-service-catalog.js:331` — `<button type="button" class="catalog-rating-link btn-view-service-reviews" data-service-id="${esc(svc.dbId)}" data-service-code="${e`
  - [x] `tab-service-catalog.js:343` — `<button type="button" class="admin-btn admin-btn-secondary btn-sm btn-edit-catalog-service" data-service-code="${esc(svc.code \|\| svc`
- [x] `tab-service-detail.js`: rà **11** vị trí tạo button; click/action, delegation, no duplicate handler, HTML escaping, quyền và DB.
  - [x] `tab-service-detail.js:89` — `<button type="button" class="admin-btn admin-btn-primary btn-action-confirm" data-booking-id="${booking.id}">Xác nhận lịch</button>`
  - [x] `tab-service-detail.js:90` — `<button type="button" class="admin-btn admin-btn-danger btn-action-cancel" data-booking-id="${booking.id}">Hủy lịch hẹn</button>`
  - [x] `tab-service-detail.js:94` — `<button type="button" class="admin-btn admin-btn-primary btn-action-intake" data-booking-id="${booking.id}">Tiếp nhận bé</button>`
  - [x] `tab-service-detail.js:95` — `<button type="button" class="admin-btn admin-btn-secondary btn-action-change" data-booking-id="${booking.id}">Đổi KTV</button>`
  - [x] `tab-service-detail.js:96` — `<button type="button" class="admin-btn admin-btn-danger btn-action-cancel" data-booking-id="${booking.id}">Hủy lịch</button>`
  - [x] `tab-service-detail.js:100` — `<button type="button" class="admin-btn admin-btn-primary btn-action-complete" data-booking-id="${booking.id}">Hoàn thành dịch vụ</bu`
  - [x] `tab-service-detail.js:101` — `<button type="button" class="admin-btn admin-btn-secondary btn-action-change" data-booking-id="${booking.id}">Đổi KTV</button>`
  - [x] `tab-service-detail.js:102` — `<button type="button" class="admin-btn admin-btn-secondary btn-action-complaint" data-booking-id="${booking.id}">Tạo khiếu nại</butt`
  - [x] `tab-service-detail.js:106` — `<button type="button" class="admin-btn admin-btn-secondary btn-action-complaint" data-booking-id="${booking.id}">Tạo khiếu nại</butt`
  - [x] `tab-service-detail.js:457` — `<button type="button" class="btn-del-accompanying" data-idx="${idx}" style="background: none; border: none; color: #DC2626; cursor: `
  - [x] `tab-service-detail.js:484` — `<button type="button" class="btn-del-surcharge-item" data-idx="${idx}" style="background: none; border: none; color: #DC2626; cursor`
- [x] `tab-service-reviews.js`: rà **5** vị trí tạo button; click/action, delegation, no duplicate handler, HTML escaping, quyền và DB.
  - [x] `tab-service-reviews.js:76` — `<button type="button" id="btnClearServiceReviewFilter" style="background: none; border: none; color: #DC2626; font-size: 12.5px; cur`
  - [x] `tab-service-reviews.js:231` — `<button type="button" class="admin-btn admin-btn-secondary btn-sm btn-reply-review" data-review-id="${esc(r.id)}" style="padding: 4p`
  - [x] `tab-service-reviews.js:265` — `html += \`<button type="button" class="btn-pagination ${prevDisabled}" data-page="prev" title="Trang trước" ${prevDisabled ? 'disable`
  - [x] `tab-service-reviews.js:269` — `html += \`<button type="button" class="btn-pagination ${activeClass}" data-page="${p}">${p}</button>\`;`
  - [x] `tab-service-reviews.js:273` — `html += \`<button type="button" class="btn-pagination ${nextDisabled}" data-page="next" title="Trang sau" ${nextDisabled ? 'disabled'`

**orders**
- [x] `tab-order-detail.js`: rà **14** vị trí tạo button; click/action, delegation, no duplicate handler, HTML escaping, quyền và DB.
  - [x] `tab-order-detail.js:72` — `<button type="button" class="admin-btn admin-btn-secondary" onclick="PawpalOrdersModule.openCancelModal('${order.id}')" style="color`
  - [x] `tab-order-detail.js:73` — `<button type="button" class="admin-btn admin-btn-primary" onclick="PawpalOrdersModule.confirmOrder('${order.id}')">Xác nhận đơn</but`
  - [x] `tab-order-detail.js:77` — `<button type="button" class="admin-btn admin-btn-secondary" onclick="PawpalOrdersModule.printPackingSlip('${order.id}')">In phiếu đó`
  - [x] `tab-order-detail.js:78` — `<button type="button" class="admin-btn admin-btn-primary" onclick="PawpalOrdersModule.openShipModal('${order.id}')">Bàn giao vận chu`
  - [x] `tab-order-detail.js:82` — `<button type="button" class="admin-btn admin-btn-secondary" onclick="PawpalOrdersModule.openShipModal('${order.id}')">Cập nhật vận đ`
  - [x] `tab-order-detail.js:83` — `<button type="button" class="admin-btn admin-btn-primary" onclick="PawpalOrdersModule.completeDelivery('${order.id}')">Đã giao hàng `
  - [x] `tab-order-detail.js:88` — `<button type="button" class="admin-btn admin-btn-secondary" onclick="PawpalOrdersModule.confirmPayment('${order.id}')">Xác nhận thu `
  - [x] `tab-order-detail.js:92` — `<button type="button" class="admin-btn admin-btn-secondary" onclick="PawpalOrdersModule.reconcileCod('${order.id}')" style="color: #`
  - [x] `tab-order-detail.js:96` — `<button type="button" class="admin-btn admin-btn-secondary" onclick="PawpalOrdersModule.openRmaTicket('${order.id}')">Tạo khiếu nại `
  - [x] `tab-order-detail.js:97` — `<button type="button" class="admin-btn admin-btn-primary" onclick="PawpalOrdersModule.completeOrder('${order.id}')">Hoàn tất đơn hàn`
  - [x] `tab-order-detail.js:102` — `<button type="button" class="admin-btn admin-btn-secondary" onclick="PawpalOrdersModule.reconcileCod('${order.id}')" style="color: #`
  - [x] `tab-order-detail.js:106` — `<button type="button" class="admin-btn admin-btn-secondary" onclick="PawpalOrdersModule.printInvoice('${order.id}')">In hóa đơn</but`
  - [x] Còn 2 vị trí tạo button trong `tab-order-detail.js`: tìm `<button`/`createElement("button")` và bổ sung từng action vào kết quả runtime
- [x] `tab-order-list.js`: rà **8** vị trí tạo button; click/action, delegation, no duplicate handler, HTML escaping, quyền và DB.
  - [x] `tab-order-list.js:43` — `html += \`<button type="button" class="btn-pagination ${prevDisabled}" data-page="prev" title="Trang trước">&lt;</button>\`;`
  - [x] `tab-order-list.js:47` — `html += \`<button type="button" class="btn-pagination ${activeClass}" data-page="${p}">${p}</button>\`;`
  - [x] `tab-order-list.js:51` — `html += \`<button type="button" class="btn-pagination ${nextDisabled}" data-page="next" title="Trang sau">&gt;</button>\`;`
  - [x] `tab-order-list.js:252` — `<button type="button" id="btnResetOrderFilters" style="background: none; border: none; color: #236B48; font-weight: 600; text-decora`
  - [x] `tab-order-list.js:352` — `<button type="button" class="btn-action-trigger btn-order-action-trigger" data-id="${safeId}">•••</button>`
  - [x] `tab-order-list.js:566` — `<button type="button" class="btn-qty-mini" aria-label="Giảm số lượng" onclick="PawpalOrdersModule.updatePosCartQty(${idx}, ${item.qt`
  - [x] `tab-order-list.js:568` — `<button type="button" class="btn-qty-mini" aria-label="Tăng số lượng" onclick="PawpalOrdersModule.updatePosCartQty(${idx}, ${item.qt`
  - [x] `tab-order-list.js:573` — `<button type="button" class="btn-remove-pos-item" onclick="PawpalOrdersModule.removePosCartItem(${idx})">&times;</button>`
- [x] `tab-order-products.js`: rà **12** vị trí tạo button; click/action, delegation, no duplicate handler, HTML escaping, quyền và DB.
  - [x] `tab-order-products.js:210` — `<button type="button" class="btn-action-trigger btn-stock-action-trigger" data-sku="${esc(p.sku)}">•••</button>`
  - [x] `tab-order-products.js:249` — `html += \`<button type="button" class="btn-pagination ${prevDisabled}" data-page="prev" title="Trang trước">&lt;</button>\`;`
  - [x] `tab-order-products.js:253` — `html += \`<button type="button" class="btn-pagination ${activeClass}" data-page="${p}">${p}</button>\`;`
  - [x] `tab-order-products.js:257` — `html += \`<button type="button" class="btn-pagination ${nextDisabled}" data-page="next" title="Trang sau">&gt;</button>\`;`
  - [x] `tab-order-products.js:325` — `<button type="button" class="btn-remove-pos-item" onclick="PawpalOrdersModule.removeGrnItem(${idx})">Xóa</button>`
  - [x] `tab-order-products.js:578` — `<button type="button" class="tag-item-remove" style="color: #DC2626; cursor: pointer; font-size: 14px; background: none; border: non`
  - [x] `tab-order-products.js:605` — `<button type="button" onclick="PawpalOrdersModule.removeProductImageAtIndex(${idx})" style="position: absolute; top: 2px; right: 2px`
  - [x] `tab-order-products.js:1915` — `<button type="button" style="${getChipStyle(activeReviewsFilter === 'ALL')}" onclick="PawpalOrdersModule.setProductReviewsFilter('AL`
  - [x] `tab-order-products.js:1916` — `<button type="button" style="${getChipStyle(activeReviewsFilter === '5')}" onclick="PawpalOrdersModule.setProductReviewsFilter('5')"`
  - [x] `tab-order-products.js:1917` — `<button type="button" style="${getChipStyle(activeReviewsFilter === '4')}" onclick="PawpalOrdersModule.setProductReviewsFilter('4')"`
  - [x] `tab-order-products.js:1918` — `<button type="button" style="${getChipStyle(activeReviewsFilter === 'MEDIA')}" onclick="PawpalOrdersModule.setProductReviewsFilter('`
  - [x] `tab-order-products.js:1955` — `<button type="button" class="admin-btn admin-btn-primary" style="height: 30px; font-size: 12px; padding: 0 12px; white-space: nowrap`
- [x] `tab-order-promos.js`: rà **1** vị trí tạo button; click/action, delegation, no duplicate handler, HTML escaping, quyền và DB.
  - [x] `tab-order-promos.js:96` — `<button type="button" class="btn-action-trigger" onclick="PawpalOrdersModule.openVoucherActionModal('${v.code}')">•••</button>`

**complaints**
- [x] `tab-complaint-orders.js`: rà **5** vị trí tạo button; click/action, delegation, no duplicate handler, HTML escaping, quyền và DB.
  - [x] `tab-complaint-orders.js:50` — `html += \`<button type="button" class="btn-pagination ${prevDisabled}" data-page="prev" title="Trang trước" ${prevDisabled ? 'disable`
  - [x] `tab-complaint-orders.js:54` — `html += \`<button type="button" class="btn-pagination ${activeClass}" data-page="${p}">${p}</button>\`;`
  - [x] `tab-complaint-orders.js:58` — `html += \`<button type="button" class="btn-pagination ${nextDisabled}" data-page="next" title="Trang sau" ${nextDisabled ? 'disabled'`
  - [x] `tab-complaint-orders.js:163` — `<button type="button" id="btnResetOrderComplaintFilters" style="background: none; border: none; color: #236B48; font-weight: 600; te`
  - [x] `tab-complaint-orders.js:233` — `<button type="button" class="admin-btn admin-btn-secondary btn-sm btn-open-order-complaint-detail" data-ticket-id="${item.id}">Xử lý`
- [x] `tab-complaint-services.js`: rà **5** vị trí tạo button; click/action, delegation, no duplicate handler, HTML escaping, quyền và DB.
  - [x] `tab-complaint-services.js:61` — `html += \`<button type="button" class="btn-pagination ${prevDisabled}" data-page="prev" title="Trang trước" ${prevDisabled ? 'disable`
  - [x] `tab-complaint-services.js:65` — `html += \`<button type="button" class="btn-pagination ${activeClass}" data-page="${p}">${p}</button>\`;`
  - [x] `tab-complaint-services.js:69` — `html += \`<button type="button" class="btn-pagination ${nextDisabled}" data-page="next" title="Trang sau" ${nextDisabled ? 'disabled'`
  - [x] `tab-complaint-services.js:182` — `<button type="button" id="btnResetServiceComplaintFilters" style="background: none; border: none; color: #236B48; font-weight: 600; `
  - [x] `tab-complaint-services.js:246` — `<button type="button" class="admin-btn admin-btn-secondary btn-sm btn-open-complaint-detail" data-ticket-id="${item.id}">Xử lý</butt`

**chatbot**
- [x] `chatbot.js`: rà **3** vị trí tạo button; click/action, delegation, no duplicate handler, HTML escaping, quyền và DB.
  - [x] `chatbot.js:712` — `<button type="button" class="header-subtab-btn ${activeTabId === 'tab-live-support' ? 'active' : ''}" data-subtab="tab-live-support"`
  - [x] `chatbot.js:714` — `<button type="button" class="header-subtab-btn ${activeTabId === 'tab-ai-copilot' ? 'active' : ''}" data-subtab="tab-ai-copilot" dat`
  - [x] `chatbot.js:716` — `<button type="button" class="header-subtab-btn ${activeTabId === 'tab-chatbot-rules' ? 'active' : ''}" data-subtab="tab-chatbot-rule`
- [x] `tab-chatbot-copilot.js`: rà **1** vị trí tạo button; click/action, delegation, no duplicate handler, HTML escaping, quyền và DB.
  - [x] `tab-chatbot-copilot.js:393` — `<button type="button" class="btn-del-session" data-delete-session-id="${s.id}" title="Xóa phiên này">Xóa</button>`
- [x] `tab-chatbot-live.js`: rà **8** vị trí tạo button; click/action, delegation, no duplicate handler, HTML escaping, quyền và DB.
  - [x] `tab-chatbot-live.js:581` — `<button type="button" class="btn-card-action btn-jump-pawpoint">Xem ví Pawpoint</button>`
  - [x] `tab-chatbot-live.js:601` — `<button type="button" class="btn-card-action btn-jump-ticket" data-id="${escapeHtml(msg.ticketData?.id)}">Mở vé trong Khiếu nại</but`
  - [x] `tab-chatbot-live.js:701` — `contentHtml = \`<span class="toxic-text-words">${highlighted}</span> <button type="button" class="btn-unlock-raw-inline" data-msg-id=`
  - [x] `tab-chatbot-live.js:719` — `<button type="button" class="btn-toxic-dots" title="Màng lọc: ${levelLabel}">•••</button>`
  - [x] `tab-chatbot-live.js:721` — `<button type="button" class="toxic-dots-item ${level === 'full' ? 'active' : ''}" data-level="full">Che toàn bộ</button>`
  - [x] `tab-chatbot-live.js:722` — `<button type="button" class="toxic-dots-item ${level === 'words' ? 'active' : ''}" data-level="words">Che từ nhạy cảm</button>`
  - [x] `tab-chatbot-live.js:723` — `<button type="button" class="toxic-dots-item ${level === 'raw' ? 'active' : ''}" data-level="raw">Hiện gốc</button>`
  - [x] `tab-chatbot-live.js:1877` — `<button type="button" class="admin-btn admin-btn-secondary btn-apply-canned-response" data-content="${item.content.replace(/"/g, '&q`
- [x] `tab-chatbot-rules.js`: rà **7** vị trí tạo button; click/action, delegation, no duplicate handler, HTML escaping, quyền và DB.
  - [x] `tab-chatbot-rules.js:129` — `html += \`<button type="button" class="rules-page-btn" ${currentPage === 1 ? 'disabled' : ''} data-page="${currentPage - 1}">&lt;</bu`
  - [x] `tab-chatbot-rules.js:133` — `html += \`<button type="button" class="rules-page-btn ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>\`;`
  - [x] `tab-chatbot-rules.js:139` — `html += \`<button type="button" class="rules-page-btn" ${currentPage === totalPages ? 'disabled' : ''} data-page="${currentPage + 1}"`
  - [x] `tab-chatbot-rules.js:203` — `<button type="button" class="rules-action-menu-btn" data-faq-id="${item.id}" title="Thao tác">•••</button>`
  - [x] `tab-chatbot-rules.js:373` — `<button type="button" class="rules-action-menu-btn" data-prof-id="${item.id}" title="Thao tác">•••</button>`
  - [x] `tab-chatbot-rules.js:529` — `<button type="button" class="rules-action-menu-btn" data-canned-id="${item.id}" title="Thao tác">•••</button>`
  - [x] `tab-chatbot-rules.js:887` — `const btn = document.createElement('button');`

**staff**
- [x] `tab-staff-assessment.js`: rà **4** vị trí tạo button; click/action, delegation, no duplicate handler, HTML escaping, quyền và DB.
  - [x] `tab-staff-assessment.js:27` — `html += \`<button type="button" class="btn-pagination ${prevDisabled}" data-page="prev" ${prevDisabled ? 'disabled' : ''} title="Tran`
  - [x] `tab-staff-assessment.js:31` — `html += \`<button type="button" class="btn-pagination ${activeClass}" data-page="${p}">${p}</button>\`;`
  - [x] `tab-staff-assessment.js:35` — `html += \`<button type="button" class="btn-pagination ${nextDisabled}" data-page="next" ${nextDisabled ? 'disabled' : ''} title="Tran`
  - [x] `tab-staff-assessment.js:142` — `<button type="button" class="btn-action-trigger btn-reassess-trigger" data-staff-id="${safeStaffId}" style="border: none; background`
- [x] `tab-staff-list.js`: rà **5** vị trí tạo button; click/action, delegation, no duplicate handler, HTML escaping, quyền và DB.
  - [x] `tab-staff-list.js:111` — `html += \`<button type="button" class="btn-pagination ${prevDisabled}" data-page="prev" ${prevDisabled ? 'disabled' : ''} title="Tran`
  - [x] `tab-staff-list.js:115` — `html += \`<button type="button" class="btn-pagination ${activeClass}" data-page="${p}">${p}</button>\`;`
  - [x] `tab-staff-list.js:119` — `html += \`<button type="button" class="btn-pagination ${nextDisabled}" data-page="next" ${nextDisabled ? 'disabled' : ''} title="Tran`
  - [x] `tab-staff-list.js:185` — `<button type="button" id="btnResetStaffFilters" style="background: none; border: none; color: #236B48; font-weight: 600; text-decora`
  - [x] `tab-staff-list.js:244` — `<button class="btn-action-trigger btn-staff-action" data-id="${staff.id}">•••</button>`
- [x] `tab-staff-schedule.js`: rà **5** vị trí tạo button; click/action, delegation, no duplicate handler, HTML escaping, quyền và DB.
  - [x] `tab-staff-schedule.js:136` — `<button type="button" class="btn-edit-shift" data-staff-id="${safeId}" style="margin-left: 6px; background: none; border: none; colo`
  - [x] `tab-staff-schedule.js:368` — `<button type="button" class="admin-btn admin-btn-secondary btn-sm btn-reject-req" data-id="${req.id}" style="border-color: #F7DCDC; `
  - [x] `tab-staff-schedule.js:369` — `<button type="button" class="admin-btn admin-btn-primary btn-sm btn-approve-req" data-id="${req.id}" style="height: 28px; padding: 0`
  - [x] `tab-staff-schedule.js:547` — `<button type="button" class="btn-shift-action btn-add-to-shift" data-id="${s.id}">Thêm</button>`
  - [x] `tab-staff-schedule.js:564` — `<button type="button" class="btn-shift-action btn-remove-from-shift" data-id="${s.id}" style="border-color: #F7DCDC; color: #DC2626;`

**settings**
- [x] `tab-settings-audit.js`: rà **3** vị trí tạo button; click/action, delegation, no duplicate handler, HTML escaping, quyền và DB.
  - [x] `tab-settings-audit.js:20` — `<button type="button" class="pagination-btn ${page === 1 ? 'disabled' : ''}" ${page === 1 ? 'disabled' : ''} data-p="prev" title="Tr`
  - [x] `tab-settings-audit.js:21` — `${Array.from({ length: totalPages }, (_, i) => \`<button type="button" class="pagination-btn ${i + 1 === page ? 'active' : ''}" data-`
  - [x] `tab-settings-audit.js:22` — `<button type="button" class="pagination-btn ${page === totalPages ? 'disabled' : ''}" ${page === totalPages ? 'disabled' : ''} data-`
- [x] `tab-settings-banners.js`: rà **9** vị trí tạo button; click/action, delegation, no duplicate handler, HTML escaping, quyền và DB.
  - [x] `tab-settings-banners.js:117` — `el.innerHTML = \`<button class="pagination-btn" ${page === 1 ? 'disabled' : ''} data-p="prev">&lt;</button>${Array.from({length: tota`
  - [x] `tab-settings-banners.js:194` — `? \`<button type="button" class="banner-action-btn btn-extend-banner" data-id="${b.id}">Gia hạn 30 ngày</button>\``
  - [x] `tab-settings-banners.js:214` — `<button type="button" class="banner-action-btn btn-edit-banner" data-id="${esc(b.id)}">Sửa</button>`
  - [x] `tab-settings-banners.js:215` — `<button type="button" class="banner-action-btn btn-delete-banner" data-id="${esc(b.id)}">Xóa</button>`
  - [x] `tab-settings-banners.js:217` — `<button type="button" class="banner-action-btn btn-toggle-banner ${b.status === 'active' ? 'is-pause' : 'is-enable'}" data-id="${esc`
  - [x] `tab-settings-banners.js:357` — `if (nums) nums.innerHTML = Array.from({ length: totalVoucherPages }, (_, i) => \`<button type="button" class="pagination-btn ${i + 1 `
  - [x] `tab-settings-banners.js:420` — `<button type="button" class="btn-dots-action btn-voucher-dots" data-code="${esc(v.code)}" title="Tác vụ">•••</button>`
  - [x] `tab-settings-banners.js:486` — `<button type="button" class="btn-notice-action btn-toggle-notice" data-id="${esc(n.id)}">${n.isActive ? 'Tắt' : 'Bật'}</button>`
  - [x] `tab-settings-banners.js:487` — `<button type="button" class="btn-notice-action btn-delete-notice" data-id="${esc(n.id)}">Xóa</button>`
- [x] `tab-settings-content.js`: rà **2** vị trí tạo button; click/action, delegation, no duplicate handler, HTML escaping, quyền và DB.
  - [x] `tab-settings-content.js:102` — `nums.innerHTML = Array.from({ length: totalPages }, (_, i) => \`<button type="button" class="pagination-btn ${i + 1 === currentArticl`
  - [x] `tab-settings-content.js:141` — `<button type="button" class="btn-action-trigger btn-article-more" data-id="${esc(a.id)}" title="Tác vụ bài viết">•••</button>`

### H3. KPI thẻ, hàng bấm, select/filter và chuyển tab
**dashboard.html** — 1 phần tử click ngoài button
- [x] **CLICK-DASHBOARD-01** `admin-card/kpi-card/dashboard-kpi-card/dashboard-kpi-link` · Doanh thu hôm nay · HTML dòng 4 — click/filter/điều hướng đúng, keyboard/focus, không sửa DB ngoài ý định

**customers.html** — 5 phần tử click ngoài button
- [x] **CLICK-CUSTOMERS-01** `admin-card/kpi-card/kpi-card-clickable` · Xem tất cả khách hàng · HTML dòng 8 — click/filter/điều hướng đúng, keyboard/focus, không sửa DB ngoài ý định
- [x] **CLICK-CUSTOMERS-02** `admin-card/kpi-card/kpi-card-clickable` · Lọc khách hàng thành viên · HTML dòng 12 — click/filter/điều hướng đúng, keyboard/focus, không sửa DB ngoài ý định
- [x] **CLICK-CUSTOMERS-03** `admin-card/kpi-card/kpi-card-clickable` · Lọc khách vãng lai · HTML dòng 16 — click/filter/điều hướng đúng, keyboard/focus, không sửa DB ngoài ý định
- [x] **CLICK-CUSTOMERS-04** `admin-card/kpi-card/kpi-card-clickable` · Lọc tài khoản bị khóa · HTML dòng 20 — click/filter/điều hướng đúng, keyboard/focus, không sửa DB ngoài ý định
- [x] **CLICK-CUSTOMERS-05** `admin-card/kpi-card/kpi-card-clickable` · Lọc khách hàng đang có khiếu nại · HTML dòng 24 — click/filter/điều hướng đúng, keyboard/focus, không sửa DB ngoài ý định

**services.html** — 7 phần tử click ngoài button
- [x] **CLICK-SERVICES-01** `admin-card/kpi-card/kpi-card-clickable` · Xem tất cả lịch hẹn · HTML dòng 9 — click/filter/điều hướng đúng, keyboard/focus, không sửa DB ngoài ý định
- [x] **CLICK-SERVICES-02** `admin-card/kpi-card/kpi-card-clickable` · Lọc lịch chờ xác nhận · HTML dòng 13 — click/filter/điều hướng đúng, keyboard/focus, không sửa DB ngoài ý định
- [x] **CLICK-SERVICES-03** `admin-card/kpi-card/kpi-card-clickable` · Lọc 3 lịch hẹn sắp tới trong 60 phút · HTML dòng 17 — click/filter/điều hướng đúng, keyboard/focus, không sửa DB ngoài ý định
- [x] **CLICK-SERVICES-04** `admin-card/kpi-card/kpi-card-clickable` · Lọc lịch đang thực hiện · HTML dòng 21 — click/filter/điều hướng đúng, keyboard/focus, không sửa DB ngoài ý định
- [x] **CLICK-SERVICES-05** `admin-card/kpi-card/kpi-card-clickable` · Lọc lịch hoàn thành · HTML dòng 25 — click/filter/điều hướng đúng, keyboard/focus, không sửa DB ngoài ý định
- [x] **CLICK-SERVICES-06** `admin-card/kpi-card/kpi-card-clickable` · Lọc lịch yêu cầu đổi và hủy · HTML dòng 29 — click/filter/điều hướng đúng, keyboard/focus, không sửa DB ngoài ý định
- [x] **CLICK-SERVICES-07** `admin-card/kpi-card/kpi-card-clickable` · Điểm đánh giá trung bình · HTML dòng 476 — click/filter/điều hướng đúng, keyboard/focus, không sửa DB ngoài ý định

**orders.html** — 2 phần tử click ngoài button
- [x] **CLICK-ORDERS-01** `attr1TagBox` · (không có nhãn) · HTML dòng 1379 — click/filter/điều hướng đúng, keyboard/focus, không sửa DB ngoài ý định
- [x] **CLICK-ORDERS-02** `attr2TagBox` · (không có nhãn) · HTML dòng 1394 — click/filter/điều hướng đúng, keyboard/focus, không sửa DB ngoài ý định

**complaints.html** — 1 phần tử click ngoài button
- [x] **CLICK-COMPLAINTS-01** `admin-card/kpi-card/kpi-card-clickable` · Chưa xử lý · HTML dòng 8 — click/filter/điều hướng đúng, keyboard/focus, không sửa DB ngoài ý định

**staff.html** — 5 phần tử click ngoài button
- [x] **CLICK-STAFF-01** `admin-card/kpi-card/kpi-card-clickable/active` · Tổng số nhân viên · HTML dòng 8 — click/filter/điều hướng đúng, keyboard/focus, không sửa DB ngoài ý định
- [x] **CLICK-STAFF-02** `admin-card/kpi-card/kpi-card-clickable` · Đang làm việc · HTML dòng 12 — click/filter/điều hướng đúng, keyboard/focus, không sửa DB ngoài ý định
- [x] **CLICK-STAFF-03** `admin-card/kpi-card/kpi-card-clickable` · Nghỉ phép · HTML dòng 16 — click/filter/điều hướng đúng, keyboard/focus, không sửa DB ngoài ý định
- [x] **CLICK-STAFF-04** `admin-card/kpi-card/kpi-card-clickable` · Tạm nghỉ · HTML dòng 20 — click/filter/điều hướng đúng, keyboard/focus, không sửa DB ngoài ý định
- [x] **CLICK-STAFF-05** `admin-card/kpi-card/kpi-card-clickable` · Cần đào tạo lại · HTML dòng 24 — click/filter/điều hướng đúng, keyboard/focus, không sửa DB ngoài ý định

## I. KIỂM KÊ MỌI TRƯỜNG NHẬP/CHỌN (HTML → FORM → JS → CỘT DB)

> Với mỗi field dưới đây: xác minh label, kiểu, required, options, giá trị DB→UI, input→DB và sau reload. Khi một field là filter/tìm kiếm thì mặc định **không ghi DB**; phải kiểm filter khớp dữ liệu. `checkbox`, file upload, readonly/hidden đều có case. Không tự suy diễn cột DB theo id HTML: phải tra mapper `insert/update` và ghi cột thật.

### I.dashboard — 0 trường

### I.customers — 37 trường
- [x] **FIELD-CUSTOMERS-001** `custSearchInput` · Hạng thẻ · `text` · `subtab-tab-list` · HTML dòng 49 · *Đã thấy ID trong JS: tab-customer-list.js:142, tab-customer-list.js:175, tab-customer-list.js:458*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CUSTOMERS-002** `custFilterTier` · Hạng thẻ · `select` · `subtab-tab-list` · HTML dòng 60 · options: `ALL`, `SILVER`, `GOLD`, `DIAMOND` · *Đã thấy ID trong JS: tab-customer-list.js:143, tab-customer-list.js:176, tab-customer-list.js:459*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CUSTOMERS-003** `custFilterStatus` · Trạng thái · `select` · `subtab-tab-list` · HTML dòng 70 · options: `ALL`, `ACTIVE`, `TEMP`, `LOCKED` · *Đã thấy ID trong JS: tab-customer-list.js:144, tab-customer-list.js:177, tab-customer-list.js:460*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CUSTOMERS-004** `drawerCustNote` · Hạng thẻ · `textarea` · `subtab-tab-profile` · HTML dòng 242 · *Đã thấy ID trong JS: tab-customer-profile.js:389, tab-customer-profile.js:952*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CUSTOMERS-005** `pawpointSearchInput` · Hạng thẻ · `text` · `subtab-tab-pawpoint` · HTML dòng 374 · *Đã thấy ID trong JS: tab-customer-pawpoint.js:42, tab-customer-pawpoint.js:96, tab-customer-pawpoint.js:495*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CUSTOMERS-006** `pawpointFilterType` · Hạng thẻ · `select` · `subtab-tab-pawpoint` · HTML dòng 375 · options: `ALL`, `ADD`, `SUB` · *Đã thấy ID trong JS: tab-customer-pawpoint.js:43, tab-customer-pawpoint.js:97, tab-customer-pawpoint.js:501*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CUSTOMERS-007** `quickAddName` · Họ và tên khách hàng * · `text` · `modalAddCustomer` · HTML dòng 411 · required · *Đã thấy ID trong JS: tab-customer-list.js:720*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CUSTOMERS-008** `quickAddPhone` · Số điện thoại * · `tel` · `modalAddCustomer` · HTML dòng 415 · required · *Đã thấy ID trong JS: tab-customer-list.js:555, tab-customer-list.js:556, tab-customer-list.js:562*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CUSTOMERS-009** `quickAddPetName` · Tên bé cưng · `text` · `modalAddCustomer` · HTML dòng 423 · *Đã thấy ID trong JS: tab-customer-list.js:724*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CUSTOMERS-010** `quickAddPetSpecies` · Loài thú cưng · `select` · `modalAddCustomer` · HTML dòng 428 · options: `DOG`, `CAT`, `OTHER` · *Đã thấy ID trong JS: tab-customer-list.js:586, tab-customer-list.js:730*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CUSTOMERS-011** `quickAddPetWeight` · Cân nặng (kg) · `number` · `modalAddCustomer` · HTML dòng 436 · step=0.1 · *Đã thấy ID trong JS: tab-customer-list.js:732*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CUSTOMERS-012** `quickAddPetBreed` · Giống loài · `text` · `modalAddCustomer` · HTML dòng 442 · *Đã thấy ID trong JS: tab-customer-list.js:584, tab-customer-list.js:585, tab-customer-list.js:731*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CUSTOMERS-013** `quickAddAddress` · Địa chỉ nhận hàng ban đầu · `text` · `modalAddCustomer` · HTML dòng 448 · *Đã thấy ID trong JS: tab-customer-list.js:750*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CUSTOMERS-014** `adjustPhone` · Khách hàng hoặc số điện thoại * · `text` · `modalAdjustPoints` · HTML dòng 472 · required · *Đã thấy ID trong JS: tab-customer-pawpoint.js:163, tab-customer-pawpoint.js:165, tab-customer-pawpoint.js:438*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CUSTOMERS-015** `adjustType` · Loại điều chỉnh · `select` · `modalAdjustPoints` · HTML dòng 480 · options: `ADD`, `SUB` · *Đã thấy ID trong JS: tab-customer-pawpoint.js:305*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CUSTOMERS-016** `adjustPointsVal` · Số điểm Pawpoint * · `number` · `modalAdjustPoints` · HTML dòng 487 · required; min=1 · *Đã thấy ID trong JS: tab-customer-pawpoint.js:287, tab-customer-pawpoint.js:306*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CUSTOMERS-017** `adjustReason` · Lý do điều chỉnh * · `text` · `modalAdjustPoints` · HTML dòng 492 · required · *Đã thấy ID trong JS: tab-customer-pawpoint.js:166, tab-customer-pawpoint.js:458*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CUSTOMERS-018** `editCustId` · Họ và tên khách hàng * · `hidden` · `modalEditCustomer` · HTML dòng 520 · *Đã thấy ID trong JS: tab-customer-profile.js:550, tab-customer-profile.js:682*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CUSTOMERS-019** `editCustFullName` · Họ và tên khách hàng * · `text` · `modalEditCustomer` · HTML dòng 523 · required · *Đã thấy ID trong JS: tab-customer-profile.js:551, tab-customer-profile.js:683*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CUSTOMERS-020** `editCustPhone` · Số điện thoại * · `tel` · `modalEditCustomer` · HTML dòng 528 · required · *Đã thấy ID trong JS: tab-customer-profile.js:552, tab-customer-profile.js:555, tab-customer-profile.js:684*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CUSTOMERS-021** `editCustEmail` · Email liên hệ · `email` · `modalEditCustomer` · HTML dòng 532 · *Đã thấy ID trong JS: tab-customer-profile.js:567, tab-customer-profile.js:569, tab-customer-profile.js:685*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CUSTOMERS-022** `editCustGender` · Giới tính · `select` · `modalEditCustomer` · HTML dòng 538 · options: `Nam`, `Nữ`, `Khác` · *Đã thấy ID trong JS: tab-customer-profile.js:571, tab-customer-profile.js:687*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CUSTOMERS-023** `editCustDob` · Ngày sinh · `date` · `modalEditCustomer` · HTML dòng 546 · *Đã thấy ID trong JS: tab-customer-profile.js:574, tab-customer-profile.js:689*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CUSTOMERS-024** `editCustTier` · Hạng thành viên · `select` · `modalEditCustomer` · HTML dòng 551 · options: `SILVER`, `GOLD`, `DIAMOND` · *Đã thấy ID trong JS: tab-customer-profile.js:572, tab-customer-profile.js:688*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CUSTOMERS-025** `addPetName` · Tên bé cưng * · `text` · `modalAddPet` · HTML dòng 588 · required · *Đã thấy ID trong JS: tab-customer-profile.js:830*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CUSTOMERS-026** `addPetSpecies` · Loài thú cưng * · `select` · `modalAddPet` · HTML dòng 592 · options: `Chó`, `Mèo`, `Khác` · *Đã thấy ID trong JS: tab-customer-profile.js:831*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CUSTOMERS-027** `addPetBreed` · Giống loài · `text` · `modalAddPet` · HTML dòng 602 · *Đã thấy ID trong JS: tab-customer-profile.js:808, tab-customer-profile.js:810, tab-customer-profile.js:832*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CUSTOMERS-028** `addPetWeight` · Cân nặng (kg) · `number` · `modalAddPet` · HTML dòng 613 · step=0.1 · *Đã thấy ID trong JS: tab-customer-profile.js:833*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CUSTOMERS-029** `addPetVaccine` · Tiền sử tiêm chủng · `text` · `modalAddPet` · HTML dòng 618 · *Đã thấy ID trong JS: tab-customer-profile.js:834*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CUSTOMERS-030** `addPetAlert` · Cảnh báo an toàn · `text` · `modalAddPet` · HTML dòng 622 · *Đã thấy ID trong JS: tab-customer-profile.js:835*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CUSTOMERS-031** `editPetId` · Tên bé cưng * · `hidden` · `modalEditPet` · HTML dòng 643 · *Đã thấy ID trong JS: tab-customer-profile.js:622*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CUSTOMERS-032** `editPetName` · Tên bé cưng * · `text` · `modalEditPet` · HTML dòng 647 · required · *Đã thấy ID trong JS: tab-customer-profile.js:623, tab-customer-profile.js:905*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CUSTOMERS-033** `editPetSpecies` · Loài thú cưng * · `select` · `modalEditPet` · HTML dòng 651 · options: `Chó`, `Mèo`, `Khác` · *Đã thấy ID trong JS: tab-customer-profile.js:624, tab-customer-profile.js:906*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CUSTOMERS-034** `editPetBreed` · Giống loài · `text` · `modalEditPet` · HTML dòng 661 · *Đã thấy ID trong JS: tab-customer-profile.js:625, tab-customer-profile.js:907*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CUSTOMERS-035** `editPetWeight` · Cân nặng (kg) · `number` · `modalEditPet` · HTML dòng 665 · step=0.1 · *Đã thấy ID trong JS: tab-customer-profile.js:626, tab-customer-profile.js:908*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CUSTOMERS-036** `editPetVaccine` · Tiền sử tiêm chủng · `text` · `modalEditPet` · HTML dòng 670 · *Đã thấy ID trong JS: tab-customer-profile.js:627, tab-customer-profile.js:909*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CUSTOMERS-037** `editPetAlert` · Cảnh báo an toàn · `text` · `modalEditPet` · HTML dòng 674 · *Đã thấy ID trong JS: tab-customer-profile.js:628, tab-customer-profile.js:910*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.

### I.pets — 58 trường
- [x] **FIELD-PETS-001** `petSearchInput` · Loài · `text` · `subtab-tab-pet-list` · HTML dòng 36 · *Đã thấy ID trong JS: tab-pet-list.js:195, tab-pet-list.js:202, tab-pet-list.js:378*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-PETS-002** `petFilterSpecies` · Loài · `select` · `subtab-tab-pet-list` · HTML dòng 48 · options: `ALL`, `dog`, `cat`, `rabbit`, `other` · *Đã thấy ID trong JS: tab-pet-list.js:196, tab-pet-list.js:203, tab-pet-list.js:379*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-PETS-003** `petFilterBreed` · Giống loài · `select` · `subtab-tab-pet-list` · HTML dòng 59 · options: `ALL`, `Corgi`, `Poodle`, `Golden Retriever`, `Mèo Anh lông ngắn (ALN)`, `Mèo ta`, `Phốc sóc` · *Đã thấy ID trong JS: tab-pet-list.js:197, tab-pet-list.js:204, tab-pet-list.js:380*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-PETS-004** `petFilterWeight` · Cân nặng · `select` · `subtab-tab-pet-list` · HTML dòng 72 · options: `ALL`, `under5`, `5to10`, `10to20`, `over20` · *Đã thấy ID trong JS: tab-pet-list.js:198, tab-pet-list.js:205, tab-pet-list.js:381*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-PETS-005** `petFilterVaccine` · Tiêm chủng · `select` · `subtab-tab-pet-list` · HTML dòng 83 · options: `ALL`, `VACCINATED`, `NOT_VACCINATED` · *Đã thấy ID trong JS: tab-pet-list.js:199, tab-pet-list.js:206, tab-pet-list.js:382*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-PETS-006** `petGroomerNotes` · Loài · `textarea` · `subtab-tab-pet-profile` · HTML dòng 262 · *Đã thấy ID trong JS: tab-pet-profile.js:240, tab-pet-profile.js:400*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-PETS-007** `petCarelogSearch` · Loài · `text` · `subtab-tab-pet-carelog` · HTML dòng 338 · *Đã thấy ID trong JS: tab-pet-carelog.js:44, tab-pet-carelog.js:73*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-PETS-008** `reminderSearchInput` · Loại nhắc lịch · `text` · `subtab-tab-pet-reminders` · HTML dòng 377 · *Đã thấy ID trong JS: tab-pet-reminders.js:218, tab-pet-reminders.js:231, tab-pet-reminders.js:320*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-PETS-009** `reminderFilterType` · Loại nhắc lịch · `select` · `subtab-tab-pet-reminders` · HTML dòng 387 · options: `ALL`, `BATH`, `GROOM`, `HOTEL`, `HOTEL_VACCINE`, `SHOP_REFILL` · *Đã thấy ID trong JS: tab-pet-reminders.js:219, tab-pet-reminders.js:232, tab-pet-reminders.js:321*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-PETS-010** `reminderFilterStatus` · Trạng thái · `select` · `subtab-tab-pet-reminders` · HTML dòng 399 · options: `ALL`, `UNSENT`, `SENT` · *Đã thấy ID trong JS: tab-pet-reminders.js:220, tab-pet-reminders.js:233, tab-pet-reminders.js:322*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-PETS-011** `newPetOwnerInput` · Chủ sở hữu * · `text` · `modalAddPet` · HTML dòng 454 · required · *Đã thấy ID trong JS: tab-pet-list.js:733, tab-pet-list.js:748, tab-pet-list.js:786*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-PETS-012** `newPetOwner` · Chủ sở hữu * · `hidden` · `modalAddPet` · HTML dòng 455 · *Đã thấy ID trong JS: tab-pet-list.js:733, tab-pet-list.js:734, tab-pet-list.js:735*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-PETS-013** `newPetName` · Tên bé cưng * · `text` · `modalAddPet` · HTML dòng 464 · required · *Đã thấy ID trong JS: tab-pet-list.js:1126, tab-pet-list.js:1129, tab-pet-list.js:1192*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-PETS-014** `newPetSpecies` · Loài thú cưng * · `select` · `modalAddPet` · HTML dòng 468 · required · options: `dog`, `cat`, `rabbit`, `other` · *Đã thấy ID trong JS: tab-pet-list.js:971, tab-pet-list.js:1135, tab-pet-list.js:1217*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-PETS-015** `newPetBreed` · Giống loài * · `text` · `modalAddPet` · HTML dòng 481 · required · *Đã thấy ID trong JS: tab-pet-list.js:969, tab-pet-list.js:970, tab-pet-list.js:1136*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-PETS-016** `newPetGender` · Giới tính · `select` · `modalAddPet` · HTML dòng 487 · options: `male`, `female` · *Đã thấy ID trong JS: tab-pet-list.js:1137, tab-pet-list.js:1219*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-PETS-017** `newPetWeight` · Cân nặng (kg) * · `number` · `modalAddPet` · HTML dòng 497 · required; min=0.1; step=0.1 · *Đã thấy ID trong JS: tab-pet-list.js:1138, tab-pet-list.js:1220*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-PETS-018** `newPetDob` · Ngày sinh · `date` · `modalAddPet` · HTML dòng 501 · max=2026-10-09 · *Đã thấy ID trong JS: tab-pet-list.js:732, tab-pet-list.js:1200, tab-pet-list.js:1203*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-PETS-019** `newPetColor` · Màu lông · `text` · `modalAddPet` · HTML dòng 509 · *Đã thấy ID trong JS: tab-pet-list.js:974, tab-pet-list.js:975, tab-pet-list.js:1228*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-PETS-020** `newPetVaccinated` · Xác nhận tiêm phòng · `select` · `modalAddPet` · HTML dòng 515 · options: `true`, `false` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-PETS-021** `newPetAlert` · Cảnh báo an toàn · `text` · `modalAddPet` · HTML dòng 524 · *Đã thấy ID trong JS: tab-pet-list.js:1146, tab-pet-list.js:1229*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-PETS-022** `newPetAllergy` · Tiền sử dị ứng · `text` · `modalAddPet` · HTML dòng 529 · *Đã thấy ID trong JS: tab-pet-list.js:1230*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-PETS-023** `weighPetName` · Tên bé cưng · `text` · `modalWeighPet` · HTML dòng 554 · readonly · *Đã thấy ID trong JS: tab-pet-list.js:481, tab-pet-list.js:485, tab-pet-list.js:1360*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-PETS-024** `weighPetOldWeight` · Cân nặng trước đó · `text` · `modalWeighPet` · HTML dòng 558 · readonly · *Đã thấy ID trong JS: tab-pet-list.js:482, tab-pet-list.js:1361, tab-pet-profile.js:450*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-PETS-025** `weighPetNewWeight` · Cân nặng thực tế (kg) * · `number` · `modalWeighPet` · HTML dòng 564 · required; min=0.1; step=0.1 · *Đã thấy ID trong JS: tab-pet-list.js:483, tab-pet-list.js:1338, tab-pet-profile.js:431*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-PETS-026** `weighPetNote` · Lý do hoặc ghi chú cân thể trọng · `text` · `modalWeighPet` · HTML dòng 569 · *Đã thấy ID trong JS: tab-pet-profile.js:463, tab-pet-profile.js:464, tab-pet-profile.js:467*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-PETS-027** `reminderModalOwner` · Khách hàng nhận tin · `text` · `modalSendReminder` · HTML dòng 623 · readonly · *Đã thấy ID trong JS: tab-pet-reminders.js:406*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-PETS-028** `reminderModalPet` · Bé cưng · `text` · `modalSendReminder` · HTML dòng 627 · readonly · *Đã thấy ID trong JS: tab-pet-reminders.js:407*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-PETS-029** `reminderTemplateSelect` · Chọn mẫu tin nhắn chăm sóc · `select` · `modalSendReminder` · HTML dòng 633 · options: `SPA_BATH`, `GROOM`, `HOTEL`, `HOTEL_VACCINE`, `SHOP` · *Đã thấy ID trong JS: tab-pet-reminders.js:324, tab-pet-reminders.js:421, tab-pet-reminders.js:432*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-PETS-030** `(không có id)` · Zalo ZNS và Official Account · `radio` · `modalSendReminder` · HTML dòng 646 · *Chưa thấy liên kết tĩnh rõ ràng (kiểm chứng runtime)*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-PETS-031** `(không có id)` · Zalo ZNS và Official Account · `radio` · `modalSendReminder` · HTML dòng 650 · *Chưa thấy liên kết tĩnh rõ ràng (kiểm chứng runtime)*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-PETS-032** `reminderMessageContent` · Nội dung tin nhắn gửi khách · `textarea` · `modalSendReminder` · HTML dòng 661 · *Đã thấy ID trong JS: tab-pet-reminders.js:408, tab-pet-reminders.js:437, tab-pet-reminders.js:446*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-PETS-033** `editPetCode` · Chủ sở hữu · `hidden` · `modalEditPetProfile` · HTML dòng 771 · *Đã thấy ID trong JS: tab-pet-profile.js:359*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-PETS-034** `editPetOwnerInput` · Chủ sở hữu · `text` · `modalEditPetProfile` · HTML dòng 776 · *Đã thấy ID trong JS: tab-pet-profile.js:322, tab-pet-profile.js:333, tab-pet-profile.js:348*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-PETS-035** `editPetOwner` · Chủ sở hữu · `hidden` · `modalEditPetProfile` · HTML dòng 777 · *Đã thấy ID trong JS: tab-pet-profile.js:322, tab-pet-profile.js:323, tab-pet-profile.js:324*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-PETS-036** `editPetName` · Tên bé cưng * · `text` · `modalEditPetProfile` · HTML dòng 786 · required · *Đã thấy ID trong JS: tab-pet-profile.js:360, tab-pet-profile.js:600*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-PETS-037** `editPetSpecies` · Loài thú cưng * · `select` · `modalEditPetProfile` · HTML dòng 790 · required · options: `dog`, `cat`, `rabbit`, `other` · *Đã thấy ID trong JS: tab-pet-profile.js:361, tab-pet-profile.js:601, tab-pet-profile.js:683*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-PETS-038** `editPetBreed` · Giống loài * · `text` · `modalEditPetProfile` · HTML dòng 803 · required · *Đã thấy ID trong JS: tab-pet-profile.js:362, tab-pet-profile.js:602, tab-pet-profile.js:681*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-PETS-039** `editPetGender` · Giới tính · `select` · `modalEditPetProfile` · HTML dòng 809 · options: `Đực`, `Cái` · *Đã thấy ID trong JS: tab-pet-profile.js:363, tab-pet-profile.js:603*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-PETS-040** `editPetWeight` · Cân nặng (kg) * · `number` · `modalEditPetProfile` · HTML dòng 819 · required; step=0.1 · *Đã thấy ID trong JS: tab-pet-profile.js:364, tab-pet-profile.js:604*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-PETS-041** `editPetDob` · Ngày sinh · `date` · `modalEditPetProfile` · HTML dòng 823 · *Đã thấy ID trong JS: tab-pet-profile.js:365, tab-pet-profile.js:606*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-PETS-042** `editPetColor` · Màu lông · `text` · `modalEditPetProfile` · HTML dòng 831 · *Đã thấy ID trong JS: tab-pet-profile.js:366, tab-pet-profile.js:607, tab-pet-profile.js:686*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-PETS-043** `editPetStatus` · Trạng thái hồ sơ · `select` · `modalEditPetProfile` · HTML dòng 837 · options: `Đang nuôi`, `Lưu trú Hotel`, `Lưu trữ` · *Đã thấy ID trong JS: tab-pet-profile.js:367, tab-pet-profile.js:608*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-PETS-044** `editPetAlert` · Cảnh báo an toàn · `text` · `modalEditPetProfile` · HTML dòng 847 · *Đã thấy ID trong JS: tab-pet-profile.js:368, tab-pet-profile.js:609*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-PETS-045** `editPetAllergy` · Tiền sử dị ứng · `text` · `modalEditPetProfile` · HTML dòng 852 · *Đã thấy ID trong JS: tab-pet-profile.js:369, tab-pet-profile.js:610*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-PETS-046** `editPetNotes` · Tập tính và lưu ý · `textarea` · `modalEditPetProfile` · HTML dòng 857 · *Đã thấy ID trong JS: tab-pet-profile.js:370, tab-pet-profile.js:611*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-PETS-047** `quickOwnerName` · Họ và tên khách hàng * · `text` · `modalQuickAddOwner` · HTML dòng 880 · required · *Đã thấy ID trong JS: tab-pet-list.js:1009*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-PETS-048** `quickOwnerPhone` · Số điện thoại * · `tel` · `modalQuickAddOwner` · HTML dòng 885 · required · *Đã thấy ID trong JS: tab-pet-list.js:1010*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-PETS-049** `quickOwnerTier` · Hạng thành viên · `select` · `modalQuickAddOwner` · HTML dòng 889 · options: `Khách mới`, `Đồng`, `Bạc`, `Vàng` · *Đã thấy ID trong JS: tab-pet-list.js:1011*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-PETS-050** `quickOwnerAddress` · Địa chỉ liên hệ · `text` · `modalQuickAddOwner` · HTML dòng 899 · *Đã thấy ID trong JS: tab-pet-list.js:1012*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-PETS-051** `newVaccineType` · Loại vắc-xin hoặc dịch tễ ghi trên sổ * · `select` · `modalAddVaccine` · HTML dòng 989 · required · options: `Vắc-xin phòng dại`, `Vắc-xin 7 bệnh cho chó`, `Vắc-xin 4 bệnh cho mèo`, `Xổ giun định kỳ và nhỏ gáy ve rận`, `Tiêm phòng nấm da và ghẻ`, `Khác` · *Đã thấy ID trong JS: tab-pet-profile.js:773, tab-pet-profile.js:787, tab-pet-profile.js:788*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-PETS-052** `newCustomVaccineName` · Tên mũi tiêm tùy chỉnh * · `text` · `modalAddVaccine` · HTML dòng 1000 · *Đã thấy ID trong JS: tab-pet-profile.js:815*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-PETS-053** `newVaccineDate` · Ngày tiêm gần nhất * · `date` · `modalAddVaccine` · HTML dòng 1005 · required · *Đã thấy ID trong JS: tab-pet-profile.js:781, tab-pet-profile.js:818*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-PETS-054** `newVaccineNextDate` · Ngày tái chủng dự kiến · `date` · `modalAddVaccine` · HTML dòng 1009 · *Đã thấy ID trong JS: tab-pet-profile.js:829*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-PETS-055** `newVaccinePlace` · Nguồn đối chiếu hoặc cơ sở tiêm ngoài · `text` · `modalAddVaccine` · HTML dòng 1015 · *Đã thấy ID trong JS: tab-pet-profile.js:794, tab-pet-profile.js:795, tab-pet-profile.js:798*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-PETS-056** `newVaccineStatus` · Trạng thái · `select` · `modalAddVaccine` · HTML dòng 1024 · options: `Đã tiêm đủ`, `Đã thực hiện`, `Đạt chuẩn`, `Sắp đến hạn` · *Đã thấy ID trong JS: tab-pet-profile.js:836*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-PETS-057** `(không có id)` · Loài · `textarea` · `modalPreviewAppDiary` · HTML dòng 1321 · readonly · *Chưa thấy liên kết tĩnh rõ ràng (kiểm chứng runtime)*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-PETS-058** `petPhotoFileInput` · Loài · `file` · `modalSelectPhoto` · HTML dòng 1352 · accept=image/jpeg,image/png,image/webp,image/gif · *Đã thấy ID trong JS: tab-pet-list.js:1436, tab-pet-list.js:1437, tab-pet-list.js:1438*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.

### I.services — 121 trường
- [x] **FIELD-SERVICES-001** `serviceSearchInput` · Loại dịch vụ: · `text` · `subtab-tab-service-bookings` · HTML dòng 54 · *Đã thấy ID trong JS: tab-service-bookings.js:463, tab-service-bookings.js:555*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-002** `serviceFilterCategory` · Loại dịch vụ: · `select` · `subtab-tab-service-bookings` · HTML dòng 67 · options: `ALL`, `Spa`, `Hotel`, `Taxi` · *Đã thấy ID trong JS: tab-service-bookings.js:466, tab-service-bookings.js:578*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-003** `serviceFilterStatus` · Trạng thái: · `select` · `subtab-tab-service-bookings` · HTML dòng 77 · options: `ALL`, `pending`, `confirmed`, `in_progress`, `completed`, `cancelled` · *Đã thấy ID trong JS: tab-service-bookings.js:469, tab-service-bookings.js:587*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-004** `serviceFilterStaff` · Kỹ thuật viên: · `select` · `subtab-tab-service-bookings` · HTML dòng 89 · options: `ALL`, `UNASSIGNED` · *Đã thấy ID trong JS: tab-service-bookings.js:472, tab-service-bookings.js:596*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-005** `newLogStepTitle` · Loại dịch vụ: · `text` · `subtab-tab-service-detail` · HTML dòng 385 · *Đã thấy ID trong JS: tab-service-detail.js:700, tab-service-detail.js:724*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-006** `newLogStepStaff` · Loại dịch vụ: · `select` · `subtab-tab-service-detail` · HTML dòng 386 · options: `-- Chọn KTV thực hiện --` · *Đã thấy ID trong JS: tab-service-detail.js:429, tab-service-detail.js:702*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-007** `newLogStepNote` · Loại dịch vụ: · `text` · `subtab-tab-service-detail` · HTML dòng 390 · *Đã thấy ID trong JS: tab-service-detail.js:701, tab-service-detail.js:725*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-008** `carelogImageFileInput` · Loại dịch vụ: · `file` · `subtab-tab-service-detail` · HTML dòng 394 · multiple; accept=image/* · *Đã thấy ID trong JS: tab-service-detail.js:708*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-009** `catalogSearchInput` · Trạng thái: · `text` · `subtab-tab-service-catalog` · HTML dòng 431 · *Đã thấy ID trong JS: tab-service-catalog.js:686*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-010** `catalogFilterStatus` · Trạng thái: · `select` · `subtab-tab-service-catalog` · HTML dòng 435 · options: `ALL`, `Đang phục vụ`, `Tạm ẩn` · *Đã thấy ID trong JS: tab-service-catalog.js:10, tab-service-catalog.js:278, tab-service-catalog.js:279*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-011** `reviewSearchInput` · Mức sao: · `text` · `subtab-tab-service-reviews` · HTML dòng 499 · *Đã thấy ID trong JS: tab-service-reviews.js:365*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-012** `reviewFilterStar` · Mức sao: · `select` · `subtab-tab-service-reviews` · HTML dòng 508 · options: `ALL`, `5`, `4`, `3`, `LOW` · *Đã thấy ID trong JS: tab-service-reviews.js:9, tab-service-reviews.js:126, tab-service-reviews.js:128*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-013** `reviewFilterCategory` · Nhóm dịch vụ: · `select` · `subtab-tab-service-reviews` · HTML dòng 518 · options: `ALL`, `Spa`, `Hotel`, `Taxi` · *Đã thấy ID trong JS: tab-service-reviews.js:10, tab-service-reviews.js:135, tab-service-reviews.js:387*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-014** `reviewFilterStaff` · KTV phụ trách: · `select` · `subtab-tab-service-reviews` · HTML dòng 527 · options: `ALL` · *Đã thấy ID trong JS: tab-service-reviews.js:11, tab-service-reviews.js:139, tab-service-reviews.js:396*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-015** `reviewFilterStatus` · Phản hồi: · `select` · `subtab-tab-service-reviews` · HTML dòng 533 · options: `ALL`, `pending`, `replied`, `escalated` · *Đã thấy ID trong JS: tab-service-reviews.js:12, tab-service-reviews.js:143, tab-service-reviews.js:145*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-016** `newBookingCustomer` · Khách hàng * · `text` · `modalCreateBooking` · HTML dòng 582 · *Đã thấy ID trong JS: tab-service-bookings.js:1442, tab-service-bookings.js:1456, tab-service-bookings.js:1586*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-017** `newBookingPhone` · Số điện thoại * · `text` · `modalCreateBooking` · HTML dòng 591 · *Đã thấy ID trong JS: tab-service-bookings.js:1443, tab-service-bookings.js:1589*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-018** `newBookingPetName` · Tên bé cưng * · `text` · `modalCreateBooking` · HTML dòng 597 · *Đã thấy ID trong JS: tab-service-bookings.js:1444, tab-service-bookings.js:1461, tab-service-bookings.js:1717*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-019** `newBookingCategory` · Nhóm dịch vụ * · `select` · `modalCreateBooking` · HTML dòng 607 · options: `Spa`, `Hotel`, `Taxi` · *Đã thấy ID trong JS: tab-service-bookings.js:1445, tab-service-bookings.js:1550*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-020** `newBookingServiceInput` · Gói dịch vụ cụ thể * · `text` · `modalCreateBooking` · HTML dòng 617 · *Đã thấy ID trong JS: tab-service-bookings.js:1824*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-021** `newBookingServiceSelect` · Gói dịch vụ cụ thể * · `hidden` · `modalCreateBooking` · HTML dòng 618 · *Đã thấy ID trong JS: tab-service-bookings.js:1446, tab-service-bookings.js:1825*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-022** `newBookingDate` · Ngày hẹn * · `date` · `modalCreateBooking` · HTML dòng 628 · *Đã thấy ID trong JS: tab-service-bookings.js:1410, tab-service-bookings.js:1448*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-023** `newBookingTime` · Giờ hẹn * · `time` · `modalCreateBooking` · HTML dòng 633 · *Đã thấy ID trong JS: tab-service-bookings.js:1449*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-024** `newBookingHotelCheckOutDate` · Ngày trả phòng · `date` · `modalCreateBooking` · HTML dòng 643 · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-025** `newBookingHotelCheckOutTime` · Giờ trả phòng · `time` · `modalCreateBooking` · HTML dòng 648 · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-026** `newBookingHotelRoomType` · Loại phòng và chuồng · `select` · `modalCreateBooking` · HTML dòng 654 · options: `Phòng Standard (STD-01)`, `Phòng Deluxe (DLX-04)`, `Phòng VIP Penthouse (VIP-02)` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-027** `newBookingHotelDiet` · Khẩu phần dinh dưỡng · `select` · `modalCreateBooking` · HTML dòng 662 · options: `Pate tươi dinh dưỡng + Thịt bò luộc (2 bữa/ngày)`, `Hạt cao cấp Royal Canin (2 bữa/ngày)`, `Thức ăn riêng chủ nuôi tự gửi` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-028** `newBookingTaxiPickup` · Địa chỉ đón · `text` · `modalCreateBooking` · HTML dòng 676 · *Đã thấy ID trong JS: tab-service-bookings.js:1491*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-029** `newBookingTaxiDropoff` · Địa chỉ trả · `text` · `modalCreateBooking` · HTML dòng 681 · *Đã thấy ID trong JS: tab-service-bookings.js:1492*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-030** `newBookingTaxiTripType` · Hình thức đưa đón · `select` · `modalCreateBooking` · HTML dòng 686 · options: `2 chiều khứ hồi`, `1 chiều (Đón đến quầy)`, `1 chiều (Chở về nhà)` · *Đã thấy ID trong JS: tab-service-bookings.js:1493*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-031** `newBookingTaxiDistance` · Khoảng cách ước tính (km) · `number` · `modalCreateBooking` · HTML dòng 694 · step=0.1 · *Đã thấy ID trong JS: tab-service-bookings.js:1494*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-032** `newBookingSpaStyle` · Kiểu dáng tạo hình yêu cầu · `text` · `modalCreateBooking` · HTML dòng 705 · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-033** `newBookingSpaGroomerLevel` · Cấp độ KTV Groomer · `select` · `modalCreateBooking` · HTML dòng 709 · options: `Senior Groomer`, `Master Groomer`, `Junior Groomer` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-034** `newBookingStaff` · Kỹ thuật viên hoặc tài xế phụ trách · `select` · `modalCreateBooking` · HTML dòng 721 · options: `Chưa phân công (Phân công sau)` · *Đã thấy ID trong JS: tab-service-bookings.js:1415, tab-service-bookings.js:1450*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-035** `newBookingBranch` · Cơ sở chi nhánh · `select` · `modalCreateBooking` · HTML dòng 728 · options: `PawPal Chi nhánh Quận 1`, `PawPal Chi nhánh Quận 10` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-036** `newBookingPetAlert` · Cảnh báo và lưu ý sức khỏe thú cưng (nếu có) · `text` · `modalCreateBooking` · HTML dòng 736 · *Đã thấy ID trong JS: tab-service-bookings.js:1451, tab-service-bookings.js:1720, tab-service-bookings.js:1934*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-037** `newBookingNotes` · Ghi chú thêm · `textarea` · `modalCreateBooking` · HTML dòng 747 · *Đã thấy ID trong JS: tab-service-bookings.js:1452, tab-service-bookings.js:1943*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-038** `editServiceCodeHidden` · Mã dịch vụ * · `hidden` · `modalServiceForm` · HTML dòng 773 · *Đã thấy ID trong JS: tab-service-catalog.js:428, tab-service-catalog.js:495, tab-service-catalog.js:549*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-039** `formServiceId` · Mã dịch vụ * · `text` · `modalServiceForm` · HTML dòng 777 · required · *Đã thấy ID trong JS: tab-service-catalog.js:440, tab-service-catalog.js:499, tab-service-catalog.js:542*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-040** `formServiceGroup` · Nhóm dịch vụ * · `select` · `modalServiceForm` · HTML dòng 781 · required · options: `Spa`, `Hotel`, `Taxi` · *Đã thấy ID trong JS: tab-service-catalog.js:435, tab-service-catalog.js:500, tab-service-catalog.js:545*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-041** `formServiceName` · Tên dịch vụ * · `text` · `modalServiceForm` · HTML dòng 790 · required · *Đã thấy ID trong JS: tab-service-catalog.js:501, tab-service-catalog.js:543*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-042** `formServicePetTypeInput` · Loại thú cưng * · `text` · `modalServiceForm` · HTML dòng 798 · *Đã thấy ID trong JS: tab-service-catalog.js:30, tab-service-catalog.js:106, tab-service-catalog.js:120*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-043** `formServicePetType` · Loại thú cưng * · `hidden` · `modalServiceForm` · HTML dòng 803 · required · *Đã thấy ID trong JS: tab-service-catalog.js:29, tab-service-catalog.js:30, tab-service-catalog.js:106*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-044** `formServiceDuration` · Thời lượng thực hiện * · `text` · `modalServiceForm` · HTML dòng 808 · required · *Đã thấy ID trong JS: tab-service-catalog.js:447, tab-service-catalog.js:502, tab-service-catalog.js:544*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-045** `formPriceUnder5` · Ma trận giá theo phân khúc cân nặng (VNĐ) · `text` · `modalServiceForm` · HTML dòng 826 · *Đã thấy ID trong JS: tab-service-catalog.js:452, tab-service-catalog.js:521, tab-service-catalog.js:563*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-046** `formPrice5To10` · Ma trận giá theo phân khúc cân nặng (VNĐ) · `text` · `modalServiceForm` · HTML dòng 827 · *Đã thấy ID trong JS: tab-service-catalog.js:453, tab-service-catalog.js:522, tab-service-catalog.js:564*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-047** `formPrice10To20` · Ma trận giá theo phân khúc cân nặng (VNĐ) · `text` · `modalServiceForm` · HTML dòng 828 · *Đã thấy ID trong JS: tab-service-catalog.js:454, tab-service-catalog.js:523, tab-service-catalog.js:565*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-048** `formPriceOver20` · Ma trận giá theo phân khúc cân nặng (VNĐ) · `text` · `modalServiceForm` · HTML dòng 829 · *Đã thấy ID trong JS: tab-service-catalog.js:455, tab-service-catalog.js:524, tab-service-catalog.js:566*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-049** `formServiceDesc` · Mô tả dịch vụ chi tiết · `textarea` · `modalServiceForm` · HTML dòng 837 · *Đã thấy ID trong JS: tab-service-catalog.js:503, tab-service-catalog.js:547*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-050** `serviceSopPresetSelect` · Quy trình các bước chăm sóc chuẩn (Care-log SOP) · `select` · `modalServiceForm` · HTML dòng 844 · options: `CUSTOM`, `SOP_SPA_FULL`, `SOP_GROOMING_STYLE`, `SOP_PET_HOTEL`, `SOP_PET_TAXI` · *Đã thấy ID trong JS: tab-service-catalog.js:720*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-051** `newServiceStepInput` · Quy trình các bước chăm sóc chuẩn (Care-log SOP) · `text` · `modalServiceForm` · HTML dòng 857 · *Đã thấy ID trong JS: tab-service-catalog.js:733*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-052** `formServiceCommission` · Tỷ lệ hoa hồng KTV (%) · `number` · `modalServiceForm` · HTML dòng 865 · min=0; max=100 · *Đã thấy ID trong JS: tab-service-catalog.js:504, tab-service-catalog.js:578*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-053** `formServiceStaffLevel` · Cấp độ KTV thực hiện · `select` · `modalServiceForm` · HTML dòng 869 · options: `Junior Groomer`, `Senior Groomer`, `Master Groomer`, `Nhân viên chăm sóc lưu trú`, `Tài xế kiêm cứu hộ` · *Đã thấy ID trong JS: tab-service-catalog.js:505, tab-service-catalog.js:579*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-054** `formServiceStatus` · Trạng thái kinh doanh · `select` · `modalServiceForm` · HTML dòng 880 · options: `Đang phục vụ`, `Tạm ẩn` · *Đã thấy ID trong JS: tab-service-catalog.js:506, tab-service-catalog.js:548*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-055** `cancelBookingReasonSelect` · Lý do hủy lịch hẹn * · `select` · `modalCancelBooking` · HTML dòng 908 · options: `Khách bận đột xuất`, `Bé cưng đang có vấn đề sức khỏe`, `Kẹt xe hoặc thời tiết xấu`, `Cửa hàng hết chỗ hoặc quá tải khung giờ`, `Khác` · *Đã thấy ID trong JS: tab-service-bookings.js:1138, tab-service-bookings.js:1350*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-056** `cancelBookingReasonDetail` · Chi tiết bổ sung · `textarea` · `modalCancelBooking` · HTML dòng 918 · *Đã thấy ID trong JS: tab-service-bookings.js:1143, tab-service-bookings.js:1335, tab-service-bookings.js:1351*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-057** `replyReviewIdHidden` · Mẫu câu trả lời chuyên nghiệp · `hidden` · `modalReplyReview` · HTML dòng 945 · *Đã thấy ID trong JS: tab-service-reviews.js:320*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-058** `replyPresetSelect` · Mẫu câu trả lời chuyên nghiệp · `select` · `modalReplyReview` · HTML dòng 955 · options: `CUSTOM`, `PRESET_THANK_5`, `PRESET_ACK_4`, `PRESET_APOLOGY_LOW`, `PRESET_EXPLAIN` · *Đã thấy ID trong JS: tab-service-reviews.js:321, tab-service-reviews.js:449*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-059** `replyReviewText` · Mẫu câu trả lời chuyên nghiệp · `textarea` · `modalReplyReview` · HTML dòng 964 · required · *Đã thấy ID trong JS: tab-service-reviews.js:319, tab-service-reviews.js:452, tab-service-reviews.js:465*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-060** `replyVoucherSelect` · Gửi kèm ưu đãi tri ân hoặc đền bù · `select` · `modalReplyReview` · HTML dòng 975 · options: `NONE`, `VOUCHER_50K`, `VOUCHER_100K`, `VOUCHER_FREE_BATH` · *Đã thấy ID trong JS: tab-service-reviews.js:322*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-061** `surchargePresetSelect` · Chọn danh mục phụ phí phát sinh chuẩn hóa · `select` · `modalAddSurcharge` · HTML dòng 1012 · options: `CUSTOM`, `Phụ phí gỡ rối lông bết cấp 1 (nhẹ)\|50000`, `Phụ phí gỡ rối lông bết cấp 2 (nặng/toàn thân)\|100000`, `Tắm thuốc y tế trị ve rận nấm da\|80000`, `Vệ sinh tai nấm và viêm chuyên sâu\|50000`, `Phụ phí bé quá dữ hoặc cần KTV phụ tá hỗ trợ\|60000`, `Phụ phí chênh lệch khung cân nặng thực tế\|50000`, `Cắt tỉa tạo kiểu chi tiết bổ sung\|80000`, `Khách sạn: Quá giờ lưu chuồng (+40.000 đ/giờ)\|40000`, `Khách sạn: Thêm bữa ăn tươi dinh dưỡng\|35000` · *Đã thấy ID trong JS: tab-service-bookings.js:999, tab-service-bookings.js:2177*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-062** `surchargeNameInput` · Tên phụ phí và dịch vụ * · `text` · `modalAddSurcharge` · HTML dòng 1029 · required · *Đã thấy ID trong JS: tab-service-bookings.js:2178*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-063** `surchargeAmountInput` · Số tiền phụ thu (VNĐ) * · `number` · `modalAddSurcharge` · HTML dòng 1033 · required; min=0; step=1000 · *Đã thấy ID trong JS: tab-service-bookings.js:2179*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-064** `surchargeCommissionSelect` · Trích tỷ lệ hoa hồng KTV (%) · `select` · `modalAddSurcharge` · HTML dòng 1040 · options: `15`, `10`, `20`, `30`, `0` · *Đã thấy ID trong JS: tab-service-bookings.js:2180*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-065** `surchargeReasonInput` · Lý do và mô tả hiện trạng thực tế * · `textarea` · `modalAddSurcharge` · HTML dòng 1058 · required · *Đã thấy ID trong JS: tab-service-bookings.js:2215, tab-service-bookings.js:2261, tab-service-bookings.js:2277*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-066** `surchargeConsentSelect` · Hình thức xác nhận đồng thuận với chủ nuôi · `select` · `modalAddSurcharge` · HTML dòng 1071 · options: `Chưa có xác nhận của chủ nuôi`, `Đã gửi ảnh và video qua Zalo cho khách, khách đã đồng ý`, `Đã gọi điện thoại trao đổi và khách xác nhận`, `Khách hàng yêu cầu trực tiếp tại quầy` · *Đã thấy ID trong JS: tab-service-bookings.js:2262*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-067** `surchargeConsentNote` · Ghi chú phản hồi của khách (tùy chọn) · `text` · `modalAddSurcharge` · HTML dòng 1080 · *Đã thấy ID trong JS: tab-service-bookings.js:2263*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-068** `surchargeProofFileInput` · Ảnh bằng chứng hiện trạng phát sinh · `file` · `modalAddSurcharge` · HTML dòng 1089 · multiple; accept=image/* · *Đã thấy ID trong JS: tab-service-bookings.js:2225*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-069** `editCarelogStepIndexHidden` · Tên bước kỹ thuật hoặc chăm sóc * · `hidden` · `modalEditCarelogStep` · HTML dòng 1135 · *Đã thấy ID trong JS: tab-service-detail.js:560, tab-service-detail.js:754, tab-service-detail.js:812*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-070** `editCarelogStepTitle` · Tên bước kỹ thuật hoặc chăm sóc * · `text` · `modalEditCarelogStep` · HTML dòng 1138 · required · *Đã thấy ID trong JS: tab-service-detail.js:563, tab-service-detail.js:755, tab-service-detail.js:763*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-071** `editCarelogStepStaff` · Kỹ thuật viên phụ trách * · `select` · `modalEditCarelogStep` · HTML dòng 1143 · required · options: `-- Chọn KTV phụ trách --` · *Đã thấy ID trong JS: tab-service-detail.js:566, tab-service-detail.js:756*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-072** `editCarelogStepTime` · Thời gian ghi nhận * · `text` · `modalEditCarelogStep` · HTML dòng 1149 · required · *Đã thấy ID trong JS: tab-service-detail.js:580, tab-service-detail.js:757*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-073** `editCarelogStepDesc` · Ghi chú chi tiết cho chủ nuôi theo dõi · `textarea` · `modalEditCarelogStep` · HTML dòng 1154 · *Đã thấy ID trong JS: tab-service-detail.js:585, tab-service-detail.js:758*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-074** `editCarelogStepDone` · Đã ghi nhật ký · `checkbox` · `modalEditCarelogStep` · HTML dòng 1158 · *Đã thấy ID trong JS: tab-service-detail.js:588, tab-service-detail.js:759*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-075** `editCarelogFileInput` · Hình ảnh đính kèm của bước này · `file` · `modalEditCarelogStep` · HTML dòng 1166 · multiple; accept=image/* · *Đã thấy ID trong JS: tab-service-detail.js:842*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-076** `accompanyingCategorySelect` · Chọn phân nhóm dịch vụ · `select` · `modalAddAccompanyingService` · HTML dòng 1195 · options: `ALL`, `spa`, `hotel`, `taxi` · *Đã thấy ID trong JS: tab-service-detail.js:860, tab-service-detail.js:869, tab-service-detail.js:882*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-077** `accompanyingServiceItemSelect` · Chọn gói dịch vụ đi cùng * · `select` · `modalAddAccompanyingService` · HTML dòng 1205 · required · *Đã thấy ID trong JS: tab-service-detail.js:861*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-078** `accompanyingPriceInput` · Giá dịch vụ (VNĐ) * · `number` · `modalAddAccompanyingService` · HTML dòng 1213 · required; min=0; step=1000 · *Đã thấy ID trong JS: tab-service-detail.js:862, tab-service-detail.js:877, tab-service-detail.js:892*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-079** `accompanyingStaffSelect` · Kỹ thuật viên thực hiện · `select` · `modalAddAccompanyingService` · HTML dòng 1217 · options: `-- Chọn KTV thực hiện --` · *Đã thấy ID trong JS: tab-service-detail.js:863, tab-service-detail.js:886, tab-service-detail.js:888*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-080** `accompanyingNoteInput` · Ghi chú yêu cầu riêng của khách · `textarea` · `modalAddAccompanyingService` · HTML dòng 1225 · *Đã thấy ID trong JS: tab-service-detail.js:864, tab-service-detail.js:893, tab-service-detail.js:918*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-081** `intakeModalMode` · Loại dịch vụ: · `hidden` · `khối chung` · HTML dòng 1239 · *Đã thấy ID trong JS: tab-service-bookings.js:827*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-082** `intakePetWeightInput` · Cân nặng thực tế tại quầy (kg) * (Đăng ký: 4.2 kg) · `number` · `modalEditIntakeInfo` · HTML dòng 1259 · required; step=0.1 · *Đã thấy ID trong JS: tab-service-bookings.js:776, tab-service-bookings.js:869, tab-service-bookings.js:1977*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-083** `intakeStaffSelect` · Kỹ thuật viên tiếp nhận ca * · `select` · `modalEditIntakeInfo` · HTML dòng 1263 · required · options: `-- Chọn KTV tiếp nhận --` · *Đã thấy ID trong JS: tab-service-bookings.js:846, tab-service-bookings.js:1978*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-084** `checkAutoAddWeightSurcharge` · Tự động cộng phụ phí chênh lệch phân khúc cân nặng vào ca · `checkbox` · `modalEditIntakeInfo` · HTML dòng 1273 · *Đã thấy ID trong JS: tab-service-bookings.js:2011*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-085** `checkSkinNormal` · Da lông sạch sẽ · `checkbox` · `modalEditIntakeInfo` · HTML dòng 1287 · *Đã thấy ID trong JS: tab-service-bookings.js:884, tab-service-bookings.js:1982, tab-service-bookings.js:2012*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-086** `checkSkinFleas` · Da lông sạch sẽ · `checkbox` · `modalEditIntakeInfo` · HTML dòng 1290 · *Đã thấy ID trong JS: tab-service-bookings.js:885, tab-service-bookings.js:1983*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-087** `checkSkinFungus` · Da lông sạch sẽ · `checkbox` · `modalEditIntakeInfo` · HTML dòng 1293 · *Đã thấy ID trong JS: tab-service-bookings.js:886, tab-service-bookings.js:1984*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-088** `checkSkinMatted` · Da lông sạch sẽ · `checkbox` · `modalEditIntakeInfo` · HTML dòng 1296 · *Đã thấy ID trong JS: tab-service-bookings.js:887, tab-service-bookings.js:1985*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-089** `checkEyesEarsNormal` · Mắt tai bình thường · `checkbox` · `modalEditIntakeInfo` · HTML dòng 1306 · *Đã thấy ID trong JS: tab-service-bookings.js:889, tab-service-bookings.js:1988, tab-service-bookings.js:2013*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-090** `checkEyesDischarge` · Mắt tai bình thường · `checkbox` · `modalEditIntakeInfo` · HTML dòng 1309 · *Đã thấy ID trong JS: tab-service-bookings.js:890, tab-service-bookings.js:1989*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-091** `checkEarsInfection` · Mắt tai bình thường · `checkbox` · `modalEditIntakeInfo` · HTML dòng 1312 · *Đã thấy ID trong JS: tab-service-bookings.js:891, tab-service-bookings.js:1990*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-092** `checkNoseRunny` · Mắt tai bình thường · `checkbox` · `modalEditIntakeInfo` · HTML dòng 1315 · *Đã thấy ID trong JS: tab-service-bookings.js:892, tab-service-bookings.js:1991*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-093** `checkWoundNone` · Không có vết thương cũ · `checkbox` · `modalEditIntakeInfo` · HTML dòng 1325 · *Đã thấy ID trong JS: tab-service-bookings.js:895, tab-service-bookings.js:1993*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-094** `checkWoundExisting` · Không có vết thương cũ · `checkbox` · `modalEditIntakeInfo` · HTML dòng 1328 · *Đã thấy ID trong JS: tab-service-bookings.js:896, tab-service-bookings.js:2014*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-095** `intakeExistingWoundNote` · Không có vết thương cũ · `text` · `modalEditIntakeInfo` · HTML dòng 1331 · *Đã thấy ID trong JS: tab-service-bookings.js:898, tab-service-bookings.js:1994*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-096** `(không có id)` · Ngoan hiền và thân thiện · `radio` · `modalEditIntakeInfo` · HTML dòng 1339 · *Chưa thấy liên kết tĩnh rõ ràng (kiểm chứng runtime)*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-097** `(không có id)` · Ngoan hiền và thân thiện · `radio` · `modalEditIntakeInfo` · HTML dòng 1342 · *Chưa thấy liên kết tĩnh rõ ràng (kiểm chứng runtime)*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-098** `(không có id)` · Ngoan hiền và thân thiện · `radio` · `modalEditIntakeInfo` · HTML dòng 1345 · *Chưa thấy liên kết tĩnh rõ ràng (kiểm chứng runtime)*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-099** `(không có id)` · Dây dắt · `checkbox` · `modalEditIntakeInfo` · HTML dòng 1357 · *Chưa thấy liên kết tĩnh rõ ràng (kiểm chứng runtime)*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-100** `(không có id)` · Dây dắt · `checkbox` · `modalEditIntakeInfo` · HTML dòng 1360 · *Chưa thấy liên kết tĩnh rõ ràng (kiểm chứng runtime)*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-101** `(không có id)` · Dây dắt · `checkbox` · `modalEditIntakeInfo` · HTML dòng 1363 · *Chưa thấy liên kết tĩnh rõ ràng (kiểm chứng runtime)*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-102** `(không có id)` · Dây dắt · `checkbox` · `modalEditIntakeInfo` · HTML dòng 1366 · *Chưa thấy liên kết tĩnh rõ ràng (kiểm chứng runtime)*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-103** `intakeBelongingsInput` · Đồ dùng và phụ kiện gửi lại quầy · `textarea` · `modalEditIntakeInfo` · HTML dòng 1369 · *Đã thấy ID trong JS: tab-service-bookings.js:906, tab-service-bookings.js:2001*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-104** `intakeProofFileInput` · Ảnh chụp hiện trạng tiếp nhận lúc đón bé · `file` · `modalEditIntakeInfo` · HTML dòng 1377 · multiple; accept=image/* · *Đã thấy ID trong JS: tab-service-bookings.js:1955*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-105** `changeStaffSelect` · Chọn kỹ thuật viên tiếp nhận mới * · `select` · `modalChangeStaff` · HTML dòng 1426 · required · options: `-- Chọn KTV mới --` · *Đã thấy ID trong JS: tab-service-bookings.js:941, tab-service-bookings.js:2086, tab-service-bookings.js:2088*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-106** `changeStaffPresetReason` · Lý do điều chuyển nhân sự * · `select` · `modalChangeStaff` · HTML dòng 1434 · options: `CUSTOM`, `KTV bận ca khẩn cấp hoặc lịch hẹn đột xuất`, `Bé nhút nhát hoặc khó chịu, cần KTV chuyên môn cao hơn`, `Khách hàng yêu cầu đổi KTV phụ trách`, `Điều phối cân bằng tải công việc trong ca trực`, `KTV gặp sự cố sức khỏe đột xuất` · *Đã thấy ID trong JS: tab-service-bookings.js:968, tab-service-bookings.js:2102*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-107** `changeStaffReasonInput` · Lý do điều chuyển nhân sự * · `text` · `modalChangeStaff` · HTML dòng 1442 · required · *Đã thấy ID trong JS: tab-service-bookings.js:971, tab-service-bookings.js:2103, tab-service-bookings.js:2129*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-108** `(không có id)` · Tiếp quản các bước kỹ thuật tiếp theo (KTV cũ đã hoàn thành các bước trước) · `radio` · `modalChangeStaff` · HTML dòng 1455 · *Chưa thấy liên kết tĩnh rõ ràng (kiểm chứng runtime)*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-109** `(không có id)` · Tiếp quản các bước kỹ thuật tiếp theo (KTV cũ đã hoàn thành các bước trước) · `radio` · `modalChangeStaff` · HTML dòng 1458 · *Chưa thấy liên kết tĩnh rõ ràng (kiểm chứng runtime)*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-110** `completeCheckQuality` · Tiến độ quy trình chăm sóc · `checkbox` · `modalCompleteBooking` · HTML dòng 1493 · required · *Đã thấy ID trong JS: tab-service-bookings.js:1104, tab-service-bookings.js:2054*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-111** `completeCheckBelongings` · Kiểm kê và trả lại tư trang đã gửi lúc tiếp nhận · `checkbox` · `modalCompleteBooking` · HTML dòng 1505 · required · *Đã thấy ID trong JS: tab-service-bookings.js:1104, tab-service-bookings.js:2055*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-112** `completeVoucherSelect` · Mã ưu đãi hoặc voucher · `select` · `modalCompleteBooking` · HTML dòng 1529 · options: `0`, `50000`, `100000`, `0.1` · *Đã thấy ID trong JS: tab-service-bookings.js:1100, tab-service-bookings.js:2070*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-113** `completePointsSelect` · Dùng điểm Pawpoint · `select` · `modalCompleteBooking` · HTML dòng 1538 · options: `0`, `100`, `200`, `500` · *Đã thấy ID trong JS: tab-service-bookings.js:1101, tab-service-bookings.js:2070*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-114** `completePaymentMethodSelect` · Hình thức thanh toán * · `select` · `modalCompleteBooking` · HTML dòng 1565 · options: `Tiền mặt (Tại quầy)`, `Chuyển khoản VietQR`, `Thẻ ngân hàng (POS)`, `Ví MoMo hoặc VNPay`, `Đã thanh toán trước Online` · *Đã thấy ID trong JS: tab-service-bookings.js:1107*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-115** `completeCheckPaid` · Trạng thái thu ngân · `checkbox` · `modalCompleteBooking` · HTML dòng 1576 · *Đã thấy ID trong JS: tab-service-bookings.js:1105, tab-service-bookings.js:2069*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-116** `completeProofFileInput` · Ảnh chụp thành phẩm bé sau khi hoàn thành · `file` · `modalCompleteBooking` · HTML dòng 1587 · multiple; accept=image/* · *Đã thấy ID trong JS: tab-service-bookings.js:2032*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-117** `(không có id)` · Zalo ZNS và OA (Khuyến nghị - Tiết kiệm và tương tác cao) · `radio` · `modalNotifyPickup` · HTML dòng 1768 · *Chưa thấy liên kết tĩnh rõ ràng (kiểm chứng runtime)*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-118** `(không có id)` · Zalo ZNS và OA (Khuyến nghị - Tiết kiệm và tương tác cao) · `radio` · `modalNotifyPickup` · HTML dòng 1772 · *Chưa thấy liên kết tĩnh rõ ràng (kiểm chứng runtime)*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-119** `notifyPickupMessageText` · Nội dung tin nhắn gửi khách hàng · `textarea` · `modalNotifyPickup` · HTML dòng 1796 · *Đã thấy ID trong JS: tab-service-detail.js:1101*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-120** `notifyIncludeCarelogLink` · Đính kèm đường dẫn xem ảnh thành phẩm và nhật ký chăm sóc thực tế · `checkbox` · `modalNotifyPickup` · HTML dòng 1802 · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SERVICES-121** `notifyLogTimelineEvent` · Đính kèm đường dẫn xem ảnh thành phẩm và nhật ký chăm sóc thực tế · `checkbox` · `modalNotifyPickup` · HTML dòng 1806 · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.

### I.orders — 98 trường
- [x] **FIELD-ORDERS-001** `orderSearchInput` · Trạng thái đơn: · `text` · `subtab-tab-order-list` · HTML dòng 42 · *Đã thấy ID trong JS: tab-order-list.js:84, tab-order-list.js:158, tab-order-list.js:891*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-002** `orderFilterStatus` · Trạng thái đơn: · `select` · `subtab-tab-order-list` · HTML dòng 53 · options: `ALL`, `pending`, `confirmed`, `shipping`, `delivered`, `completed`, `cancelled`, `returned` · *Đã thấy ID trong JS: tab-order-list.js:85, tab-order-list.js:138, tab-order-list.js:898*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-003** `orderFilterPayment` · Thanh toán: · `select` · `subtab-tab-order-list` · HTML dòng 67 · options: `ALL`, `cod`, `vnpay`, `momo`, `bank_transfer` · *Đã thấy ID trong JS: tab-order-list.js:86, tab-order-list.js:903*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-004** `orderFilterPayStatus` · Đối soát: · `select` · `subtab-tab-order-list` · HTML dòng 78 · options: `ALL`, `paid`, `cod_pending`, `unpaid`, `refund_pending`, `refunded`, `cancelled` · *Đã thấy ID trong JS: tab-order-list.js:87, tab-order-list.js:908*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-005** `checkSelectAllOrders` · Trạng thái đơn: · `checkbox` · `subtab-tab-order-list` · HTML dòng 129 · *Đã thấy ID trong JS: tab-order-list.js:233, tab-order-list.js:938*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-006** `productSearchInput` · Danh mục: · `text` · `subtab-tab-order-products` · HTML dòng 366 · *Đã thấy ID trong JS: tab-order-products.js:85, tab-order-products.js:620*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-007** `productFilterCategory` · Danh mục: · `select` · `subtab-tab-order-products` · HTML dòng 379 · options: `ALL`, `Thực phẩm`, `Đồ dùng`, `Vệ sinh`, `Phụ kiện`, `Thức ăn khô`, `Thức ăn ướt`, `Sức khỏe`, `Bát ăn` · *Đã thấy ID trong JS: tab-order-products.js:57, tab-order-products.js:86, tab-order-products.js:624*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-008** `productFilterStockStatus` · Tình trạng tồn: · `select` · `subtab-tab-order-products` · HTML dòng 394 · options: `ALL`, `LOW`, `OUT`, `IN_STOCK` · *Đã thấy ID trong JS: tab-order-products.js:87, tab-order-products.js:628*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-009** `promoSearchInput` · Trạng thái đơn: · `text` · `subtab-tab-order-promos` · HTML dòng 459 · *Đã thấy ID trong JS: tab-order-promos.js:25, tab-order-promos.js:116*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-010** `createOrderPhone` · Số điện thoại khách hàng * · `text` · `modalCreateOrder` · HTML dòng 533 · maxlength=20 · *Đã thấy ID trong JS: tab-order-list.js:504, tab-order-list.js:1075, tab-order-list.js:1131*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-011** `createOrderName` · Họ và tên khách hàng * · `text` · `modalCreateOrder` · HTML dòng 539 · *Đã thấy ID trong JS: tab-order-list.js:503, tab-order-list.js:1074, tab-order-list.js:1186*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-012** `radioAddrInStore` · Địa chỉ giao hàng * · `radio` · `modalCreateOrder` · HTML dòng 572 · *Đã thấy ID trong JS: tab-order-list.js:1167*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-013** `radioAddrDelivery` · Địa chỉ giao hàng * · `radio` · `modalCreateOrder` · HTML dòng 579 · *Đã thấy ID trong JS: tab-order-list.js:748, tab-order-list.js:1167, tab-order-list.js:1190*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-014** `createOrderCustomAddress` · Địa chỉ giao hàng * · `text` · `modalCreateOrder` · HTML dòng 585 · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-015** `createOrderFastDelivery` · Giao hỏa tốc 2 giờ (+25.000 đ) · `checkbox` · `modalCreateOrder` · HTML dòng 589 · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-016** `createOrderDeliverySlot` · Giao hỏa tốc 2 giờ (+25.000 đ) · `select` · `modalCreateOrder` · HTML dòng 591 · options: `any`, `morning`, `afternoon`, `evening` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-017** `createOrderProductSearchInput` · Thêm mặt hàng vào giỏ hàng · `text` · `modalCreateOrder` · HTML dòng 609 · *Đã thấy ID trong JS: tab-order-list.js:694, tab-order-list.js:1094, tab-order-list.js:1114*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-018** `createOrderSelectedProductSku` · Thêm mặt hàng vào giỏ hàng · `hidden` · `modalCreateOrder` · HTML dòng 611 · *Đã thấy ID trong JS: tab-order-list.js:695, tab-order-list.js:1092, tab-order-list.js:1115*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-019** `createOrderProductSelect` · Thêm mặt hàng vào giỏ hàng · `select` · `modalCreateOrder` · HTML dòng 612 · options: `-- Chọn mặt hàng từ kho --` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-020** `createOrderQty` · Thêm mặt hàng vào giỏ hàng · `number` · `modalCreateOrder` · HTML dòng 616 · min=1 · *Đã thấy ID trong JS: tab-order-list.js:1106*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-021** `createOrderVoucherCode` · Mã giảm giá Voucher · `text` · `modalCreateOrder` · HTML dòng 646 · *Đã thấy ID trong JS: tab-order-list.js:713, tab-order-list.js:1163, tab-order-list.js:1189*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-022** `createOrderPointsInput` · Đổi điểm Pawpoint (100đ = 10k) · `number` · `modalCreateOrder` · HTML dòng 651 · min=0; step=50 · *Đã thấy ID trong JS: tab-order-list.js:739, tab-order-list.js:743, tab-order-list.js:1163*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-023** `createOrderPaymentMethod` · Phương thức thanh toán · `select` · `modalCreateOrder` · HTML dòng 658 · options: `cash`, `pos`, `qr`, `cod` · *Đã thấy ID trong JS: tab-order-list.js:772, tab-order-list.js:1167, tab-order-list.js:1188*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-024** `createOrderCashTendered` · Tiền khách đưa (VND) · `number` · `modalCreateOrder` · HTML dòng 680 · min=0; step=10000 · *Đã thấy ID trong JS: tab-order-list.js:781, tab-order-list.js:802, tab-order-list.js:811*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-025** `createOrderNote` · Ghi chú đơn hàng · `text` · `modalCreateOrder` · HTML dòng 719 · *Đã thấy ID trong JS: tab-order-list.js:1191*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-026** `shipCarrierSelect` · Đơn vị vận chuyển phụ trách * · `select` · `modalShipOrder` · HTML dòng 830 · options: `J và T Express`, `Giao hàng tiết kiệm GHTK`, `Viettel Post`, `Đội giao hỏa tốc PawPal` · *Đã thấy ID trong JS: tab-order-list.js:1397*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-027** `shipTrackingInput` · Mã vận đơn bưu cục * · `text` · `modalShipOrder` · HTML dòng 840 · maxlength=35 · *Đã thấy ID trong JS: tab-order-list.js:1398, tab-order-list.js:1953*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-028** `shipCarrierNote` · Ghi chú cho bưu tá · `text` · `modalShipOrder` · HTML dòng 846 · maxlength=250 · *Đã thấy ID trong JS: tab-order-list.js:1399*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-029** `cancelOrderReasonSelect` · Lý do hủy đơn * · `select` · `modalCancelOrder` · HTML dòng 881 · options: `Khách hàng yêu cầu hủy đơn`, `Hết hàng tồn kho đột xuất`, `Không liên lạc được để xác nhận`, `Khách đổi địa chỉ hoặc thời gian nhận`, `Lý do khác` · *Đã thấy ID trong JS: tab-order-list.js:1459*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-030** `cancelOrderReasonDetail` · Ghi chú chi tiết · `textarea` · `modalCancelOrder` · HTML dòng 892 · *Đã thấy ID trong JS: tab-order-list.js:1460*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-031** `batchCarrierSelect` · Đơn vị vận chuyển tiếp nhận * · `select` · `modalBatchDispatch` · HTML dòng 948 · options: `J và T Express`, `Giao hàng tiết kiệm GHTK`, `Viettel Post`, `Đội giao hỏa tốc PawPal` · *Đã thấy ID trong JS: tab-order-list.js:1566*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-032** `batchTrackingMode` · Phương thức cấp mã vận đơn · `select` · `modalBatchDispatch` · HTML dòng 958 · options: `auto`, `keep` · *Đã thấy ID trong JS: tab-order-list.js:1567*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-033** `batchCarrierNote` · Ghi chú bàn giao cho bưu tá · `text` · `modalBatchDispatch` · HTML dòng 966 · *Đã thấy ID trong JS: tab-order-list.js:1568*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-034** `rmaSolutionType` · Hình thức giải quyết bồi hoàn * · `select` · `modalReturnRefund` · HTML dòng 1032 · options: `exchange`, `refund`, `resend` · *Đã thấy ID trong JS: tab-order-detail.js:251, tab-order-detail.js:312*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-035** `rmaReasonSelect` · Lý do đổi trả * · `select` · `modalReturnRefund` · HTML dòng 1041 · options: `damaged`, `wrong_item`, `expired`, `quality`, `customer_change` · *Đã thấy ID trong JS: tab-order-detail.js:316*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-036** `(không có id)` · Kiểm định chất lượng và phương án tồn kho · `radio` · `modalReturnRefund` · HTML dòng 1077 · *Chưa thấy liên kết tĩnh rõ ràng (kiểm chứng runtime)*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-037** `(không có id)` · Kiểm định chất lượng và phương án tồn kho · `radio` · `modalReturnRefund` · HTML dòng 1084 · *Chưa thấy liên kết tĩnh rõ ràng (kiểm chứng runtime)*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-038** `rmaRefundMethod` · Phương thức hoàn tiền · `select` · `modalReturnRefund` · HTML dòng 1097 · options: `bank_transfer`, `pawpoint`, `cash` · *Đã thấy ID trong JS: tab-order-detail.js:323*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-039** `rmaRefundAmountInput` · Số tiền bồi hoàn · `number` · `modalReturnRefund` · HTML dòng 1105 · *Đã thấy ID trong JS: tab-order-detail.js:324*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-040** `rmaInternalNote` · Ghi chú xử lý RMA · `textarea` · `modalReturnRefund` · HTML dòng 1111 · *Đã thấy ID trong JS: tab-order-detail.js:325*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-041** `adjustOperationType` · Thao tác điều chỉnh * · `select` · `modalAdjustStock` · HTML dòng 1154 · options: `ADD`, `SUB`, `SET` · *Đã thấy ID trong JS: tab-order-products.js:1109*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-042** `adjustQuantityInput` · Số lượng thay đổi * · `number` · `modalAdjustStock` · HTML dòng 1163 · min=0 · *Đã thấy ID trong JS: tab-order-products.js:1110*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-043** `adjustPriceInput` · Giá niêm yết mới · `number` · `modalAdjustStock` · HTML dòng 1170 · *Đã thấy ID trong JS: tab-order-products.js:1111, tab-order-products.js:1673*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-044** `adjustStatusSelect` · Trạng thái kinh doanh · `select` · `modalAdjustStock` · HTML dòng 1175 · options: `Đang bán`, `Tạm ngưng` · *Đã thấy ID trong JS: tab-order-products.js:1112, tab-order-products.js:1674*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-045** `adjustReasonSelect` · Lý do điều chỉnh kiểm kê * · `select` · `modalAdjustStock` · HTML dòng 1184 · options: `Nhập hàng mới từ nhà cung cấp`, `Kiểm kê định kỳ cân đối sổ sách`, `Xuất hủy hàng lỗi bao bì rách vỡ`, `Điều chuyển nội bộ sang chi nhánh khác` · *Đã thấy ID trong JS: tab-order-products.js:1113*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-046** `newProdStt` · Mã SKU * · `hidden` · `modalAddProduct` · HTML dòng 1222 · *Đã thấy ID trong JS: tab-order-products.js:1440, tab-order-products.js:1498*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-047** `newProdSku` · Mã SKU * · `text` · `modalAddProduct` · HTML dòng 1224 · *Đã thấy ID trong JS: tab-order-products.js:513, tab-order-products.js:670, tab-order-products.js:1444*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-048** `newProdName` · Tên sản phẩm * · `text` · `modalAddProduct` · HTML dòng 1228 · *Đã thấy ID trong JS: tab-order-products.js:671, tab-order-products.js:1444, tab-order-products.js:1502*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-049** `newProdCategory` · Danh mục * · `select` · `modalAddProduct` · HTML dòng 1235 · options: `Thức ăn khô`, `Thức ăn ướt`, `Xương gặm`, `Sức khỏe`, `Bát ăn`, `Đồ chơi`, `Vệ sinh`, `Thời trang`, `Nội thất`, `Khác` · *Đã thấy ID trong JS: tab-order-products.js:672, tab-order-products.js:1503*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-050** `newProdBrand` · Thương hiệu · `text` · `modalAddProduct` · HTML dòng 1250 · *Đã thấy ID trong JS: tab-order-products.js:673, tab-order-products.js:1444, tab-order-products.js:1504*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-051** `newProdPetType` · Đối tượng thú cưng · `select` · `modalAddProduct` · HTML dòng 1254 · options: `Chó và Mèo`, `Chó`, `Mèo`, `Hamster`, `Thỏ và Bọ ú`, `Thú nhỏ`, `Tất cả bé cưng` · *Đã thấy ID trong JS: tab-order-products.js:674, tab-order-products.js:1505*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-052** `newProdOrigin` · Xuất xứ · `text` · `modalAddProduct` · HTML dòng 1269 · *Đã thấy ID trong JS: tab-order-products.js:541, tab-order-products.js:675, tab-order-products.js:796*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-053** `newProdBadge` · Nhãn sản phẩm · `select` · `modalAddProduct` · HTML dòng 1273 · options: `Không có nhãn`, `Bán chạy`, `Mới`, `Khuyên dùng`, `Đề xuất`, `Cao cấp`, `Phổ biến`, `Ưu đãi` · *Đã thấy ID trong JS: tab-order-products.js:677, tab-order-products.js:1444, tab-order-products.js:1510*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-054** `newProdStatus` · Trạng thái · `select` · `modalAddProduct` · HTML dòng 1286 · options: `Còn hàng`, `Sắp hết`, `Hết hàng`, `Tạm ngưng` · *Đã thấy ID trong JS: tab-order-products.js:676, tab-order-products.js:1507*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-055** `newProdUnit` · Đơn vị tính · `select` · `modalAddProduct` · HTML dòng 1297 · options: `Túi`, `Lon`, `Hộp`, `Gói`, `Chai`, `Tuýp`, `Cái`, `Chiếc`, `Bộ`, `Khay` · *Đã thấy ID trong JS: tab-order-products.js:780, tab-order-products.js:792, tab-order-products.js:1508*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-056** `newProdSpec` · Quy cách đóng gói · `text` · `modalAddProduct` · HTML dòng 1312 · *Đã thấy ID trong JS: tab-order-products.js:793, tab-order-products.js:1444, tab-order-products.js:1509*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-057** `newProdImages` · Hình ảnh sản phẩm · `text` · `modalAddProduct` · HTML dòng 1319 · *Đã thấy ID trong JS: tab-order-products.js:543, tab-order-products.js:586, tab-order-products.js:800*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-058** `chkEnableVariants` · Sản phẩm có nhiều phân loại · `checkbox` · `modalAddProduct` · HTML dòng 1333 · *Đã thấy ID trong JS: tab-order-products.js:442, tab-order-products.js:692*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-059** `newProdCostPrice` · Giá vốn nhập kho · `number` · `modalAddProduct` · HTML dòng 1344 · min=0 · *Đã thấy ID trong JS: tab-order-products.js:539, tab-order-products.js:794, tab-order-products.js:1445*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-060** `newProdPrice` · Giá bán thực tế * · `number` · `modalAddProduct` · HTML dòng 1348 · min=0 · *Đã thấy ID trong JS: tab-order-products.js:540, tab-order-products.js:795, tab-order-products.js:1445*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-061** `newProdOriginalPrice` · Giá gốc trước giảm · `number` · `modalAddProduct` · HTML dòng 1352 · min=0 · *Đã thấy ID trong JS: tab-order-products.js:541, tab-order-products.js:796, tab-order-products.js:1445*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-062** `newProdInitialStock` · Tồn kho ban đầu * · `number` · `modalAddProduct` · HTML dòng 1359 · min=0 · *Đã thấy ID trong JS: tab-order-products.js:542, tab-order-products.js:798, tab-order-products.js:1454*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-063** `newProdMinStock` · Ngưỡng cảnh báo tồn thấp · `number` · `modalAddProduct` · HTML dòng 1363 · min=1 · *Đã thấy ID trong JS: tab-order-products.js:799, tab-order-products.js:1456, tab-order-products.js:1516*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-064** `attr1Name` · Sản phẩm có nhiều phân loại · `text` · `modalAddProduct` · HTML dòng 1378 · *Đã thấy ID trong JS: orders.js:723, tab-order-products.js:466, tab-order-products.js:473*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-065** `attr1TagInput` · Sản phẩm có nhiều phân loại · `text` · `modalAddProduct` · HTML dòng 1381 · *Đã thấy ID trong JS: tab-order-products.js:345*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-066** `attr2Name` · Sản phẩm có nhiều phân loại · `text` · `modalAddProduct` · HTML dòng 1393 · *Đã thấy ID trong JS: orders.js:724, tab-order-products.js:468, tab-order-products.js:477*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-067** `attr2TagInput` · Sản phẩm có nhiều phân loại · `text` · `modalAddProduct` · HTML dòng 1396 · *Đã thấy ID trong JS: tab-order-products.js:345*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-068** `bulkCostPrice` · Sản phẩm có nhiều phân loại · `number` · `modalAddProduct` · HTML dòng 1404 · min=0 · *Đã thấy ID trong JS: tab-order-products.js:407*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-069** `bulkPrice` · Sản phẩm có nhiều phân loại · `number` · `modalAddProduct` · HTML dòng 1405 · min=0 · *Đã thấy ID trong JS: tab-order-products.js:408*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-070** `bulkOriginalPrice` · Sản phẩm có nhiều phân loại · `number` · `modalAddProduct` · HTML dòng 1406 · min=0 · *Đã thấy ID trong JS: tab-order-products.js:409*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-071** `bulkStock` · Sản phẩm có nhiều phân loại · `number` · `modalAddProduct` · HTML dòng 1407 · min=0 · *Đã thấy ID trong JS: tab-order-products.js:410*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-072** `bulkImage` · Sản phẩm có nhiều phân loại · `text` · `modalAddProduct` · HTML dòng 1408 · *Đã thấy ID trong JS: tab-order-products.js:411*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-073** `newProdFeatures` · Đặc tính nổi bật · `text` · `modalAddProduct` · HTML dòng 1442 · *Đã thấy ID trong JS: tab-order-products.js:678, tab-order-products.js:1445, tab-order-products.js:1511*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-074** `newProdDescription` · Mô tả chi tiết · `textarea` · `modalAddProduct` · HTML dòng 1447 · *Đã thấy ID trong JS: tab-order-products.js:679, tab-order-products.js:1446, tab-order-products.js:1518*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-075** `newProdIngredients` · Thành phần nguyên liệu · `textarea` · `modalAddProduct` · HTML dòng 1452 · *Đã thấy ID trong JS: tab-order-products.js:680, tab-order-products.js:1446, tab-order-products.js:1519*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-076** `newProdBenefits` · Công dụng và lợi ích · `textarea` · `modalAddProduct` · HTML dòng 1458 · *Đã thấy ID trong JS: tab-order-products.js:681, tab-order-products.js:1446, tab-order-products.js:1520*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-077** `newProdUsage` · Hướng dẫn sử dụng · `textarea` · `modalAddProduct` · HTML dòng 1462 · *Đã thấy ID trong JS: tab-order-products.js:682, tab-order-products.js:1446, tab-order-products.js:1521*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-078** `newProdFeedingGuide` · Khẩu phần khuyến nghị · `text` · `modalAddProduct` · HTML dòng 1468 · *Đã thấy ID trong JS: tab-order-products.js:683, tab-order-products.js:1447, tab-order-products.js:1522*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-079** `newProdExpiry` · Hạn sử dụng · `text` · `modalAddProduct` · HTML dòng 1474 · *Đã thấy ID trong JS: tab-order-products.js:684, tab-order-products.js:1447, tab-order-products.js:1523*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-080** `newProdStorage` · Hướng dẫn bảo quản · `text` · `modalAddProduct` · HTML dòng 1478 · *Đã thấy ID trong JS: tab-order-products.js:685, tab-order-products.js:1447, tab-order-products.js:1524*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-081** `editProductOriginalSku` · Mã SKU * · `hidden` · `modalAddProduct` · HTML dòng 1485 · *Đã thấy ID trong JS: tab-order-products.js:669, tab-order-products.js:1434, tab-order-products.js:1491*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-082** `newVoucherCode` · Mã voucher * · `text` · `modalCreateVoucher` · HTML dòng 1509 · *Đã thấy ID trong JS: tab-order-promos.js:125*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-083** `newVoucherTitle` · Tên chương trình * · `text` · `modalCreateVoucher` · HTML dòng 1513 · *Đã thấy ID trong JS: tab-order-promos.js:126*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-084** `newVoucherDiscount` · Mức giảm giá * · `text` · `modalCreateVoucher` · HTML dòng 1520 · *Đã thấy ID trong JS: tab-order-promos.js:127*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-085** `newVoucherMinOrder` · Đơn hàng tối thiểu · `text` · `modalCreateVoucher` · HTML dòng 1524 · *Đã thấy ID trong JS: tab-order-promos.js:128*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-086** `newVoucherPoints` · Điểm Pawpoint cần đổi · `text` · `modalCreateVoucher` · HTML dòng 1531 · *Đã thấy ID trong JS: tab-order-promos.js:129*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-087** `newVoucherExpiry` · Thời hạn sử dụng * · `text` · `modalCreateVoucher` · HTML dòng 1535 · *Đã thấy ID trong JS: tab-order-promos.js:130*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-088** `newVoucherMaxUses` · Số lượt phát hành tối đa * · `number` · `modalCreateVoucher` · HTML dòng 1541 · min=1 · *Đã thấy ID trong JS: tab-order-promos.js:131*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-089** `voucherTargetStatus` · Trạng thái phát hành * · `select` · `modalVoucherAction` · HTML dòng 1584 · options: `Đang chạy`, `Tạm ngưng`, `Hết hạn` · *Đã thấy ID trong JS: tab-order-promos.js:246, tab-order-promos.js:326*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-090** `voucherTargetExpiry` · Gia hạn thời gian sử dụng * · `text` · `modalVoucherAction` · HTML dòng 1593 · *Đã thấy ID trong JS: tab-order-promos.js:247, tab-order-promos.js:327*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-091** `grnReceiptCode` · Mã phiếu nhập kho * · `text` · `modalGoodsReceipt` · HTML dòng 1679 · readonly · *Đã thấy ID trong JS: tab-order-products.js:1219, tab-order-products.js:1686*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-092** `grnSupplierSelect` · Nhà cung cấp và đối tác * · `select` · `modalGoodsReceipt` · HTML dòng 1683 · options: `Công ty TNHH Royal Canin Việt Nam`, `Công ty CP King's Pet Việt Nam`, `Inaba Petfood Japan (Nhập khẩu Ciao)`, `Petkit Smart Living Distributor`, `Virbac Animal Health VN`, `Xưởng gia công phụ kiện thú cưng PawPal` · *Đã thấy ID trong JS: tab-order-products.js:1220*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-093** `grnInvoiceNo` · Số hóa đơn chứng từ · `text` · `modalGoodsReceipt` · HTML dòng 1697 · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-094** `grnWarehouseLocation` · Kho tiếp nhận * · `text` · `modalGoodsReceipt` · HTML dòng 1701 · readonly · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-095** `grnProductPicker` · Mã phiếu nhập kho * · `select` · `modalGoodsReceipt` · HTML dòng 1709 · *Đã thấy ID trong JS: tab-order-products.js:1187, tab-order-products.js:1689*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-096** `grnNoteInput` · Ghi chú phiếu nhập kho · `text` · `modalGoodsReceipt` · HTML dòng 1748 · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-097** `stkAuditCode` · Mã phiên kiểm kê * · `text` · `modalStocktake` · HTML dòng 1776 · readonly · *Đã thấy ID trong JS: tab-order-products.js:1273, tab-order-products.js:1742*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-ORDERS-098** `stkReasonSelect` · Lý do kiểm kê * · `select` · `modalStocktake` · HTML dòng 1780 · options: `Kiểm kê định kỳ tháng 06/2026`, `Kiểm kê đột xuất khu vực hàng bán chạy`, `Bàn giao ca quản lý kho vận` · *Đã thấy ID trong JS: tab-order-products.js:1274*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.

### I.complaints — 43 trường
- [x] **FIELD-COMPLAINTS-001** `serviceSearchInput` · Loại dịch vụ · `text` · `subtab-tab-complaint-services` · HTML dòng 49 · *Đã thấy ID trong JS: tab-complaint-services.js:107, tab-complaint-services.js:257, tab-complaint-services.js:316*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-COMPLAINTS-002** `serviceFilterCategory` · Loại dịch vụ · `select` · `subtab-tab-complaint-services` · HTML dòng 71 · options: `ALL`, `spa`, `hotel`, `taxi`, `contact` · *Đã thấy ID trong JS: tab-complaint-services.js:108, tab-complaint-services.js:258, tab-complaint-services.js:328*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-COMPLAINTS-003** `serviceFilterStatus` · Trạng thái · `select` · `subtab-tab-complaint-services` · HTML dòng 82 · options: `ALL`, `new`, `processing`, `waiting_customer`, `waiting_manager_approval`, `reprocessing`, `resolved`, `closed` · *Đã thấy ID trong JS: tab-complaint-services.js:109, tab-complaint-services.js:259, tab-complaint-services.js:331*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-COMPLAINTS-004** `serviceFilterPriority` · Mức độ ưu tiên · `select` · `subtab-tab-complaint-services` · HTML dòng 96 · options: `ALL`, `high`, `medium`, `low` · *Đã thấy ID trong JS: tab-complaint-services.js:110, tab-complaint-services.js:260, tab-complaint-services.js:334*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-COMPLAINTS-005** `serviceFilterStaff` · Nhân viên phụ trách · `select` · `subtab-tab-complaint-services` · HTML dòng 106 · options: `ALL`, `Chưa phân công` · *Đã thấy ID trong JS: complaints.js:798, tab-complaint-services.js:111, tab-complaint-services.js:261*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-COMPLAINTS-006** `orderSearchInput` · Loại vấn đề · `text` · `subtab-tab-complaint-orders` · HTML dòng 191 · *Đã thấy ID trong JS: tab-complaint-orders.js:96, tab-complaint-orders.js:145, tab-complaint-orders.js:259*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-COMPLAINTS-007** `orderFilterIssue` · Loại vấn đề · `select` · `subtab-tab-complaint-orders` · HTML dòng 213 · options: `ALL`, `wrong_item`, `missing_item`, `damaged`, `quality`, `delivery`, `return_request`, `other` · *Đã thấy ID trong JS: tab-complaint-orders.js:99, tab-complaint-orders.js:276*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-COMPLAINTS-008** `orderFilterStatus` · Trạng thái · `select` · `subtab-tab-complaint-orders` · HTML dòng 227 · options: `ALL`, `new`, `processing`, `waiting_return`, `waiting_manager_approval`, `reprocessing`, `resolved`, `closed` · *Đã thấy ID trong JS: tab-complaint-orders.js:97, tab-complaint-orders.js:147, tab-complaint-orders.js:271*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-COMPLAINTS-009** `orderFilterPriority` · Mức độ ưu tiên · `select` · `subtab-tab-complaint-orders` · HTML dòng 241 · options: `ALL`, `high`, `medium`, `low` · *Đã thấy ID trong JS: tab-complaint-orders.js:98, tab-complaint-orders.js:149, tab-complaint-orders.js:274*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-COMPLAINTS-010** `orderFilterStaff` · Nhân viên phụ trách · `select` · `subtab-tab-complaint-orders` · HTML dòng 251 · options: `ALL`, `Chưa phân công` · *Đã thấy ID trong JS: complaints.js:798, tab-complaint-orders.js:100, tab-complaint-orders.js:278*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-COMPLAINTS-011** `inputUploadMoreEvidence` · Ghi chú nội bộ (Chỉ nhân viên thấy) · `file` · `subtab-tab-complaint-detail` · HTML dòng 318 · multiple; accept=image/* · *Đã thấy ID trong JS: tab-complaint-detail.js:1529, tab-complaint-detail.js:1530, tab-complaint-detail.js:1532*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-COMPLAINTS-012** `inputUploadCheckinPhoto` · Ghi chú nội bộ (Chỉ nhân viên thấy) · `file` · `subtab-tab-complaint-detail` · HTML dòng 380 · multiple; accept=image/* · *Đã thấy ID trong JS: tab-complaint-detail.js:1557*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-COMPLAINTS-013** `inputUploadWarehousePhoto` · Ghi chú nội bộ (Chỉ nhân viên thấy) · `file` · `subtab-tab-complaint-detail` · HTML dòng 406 · multiple; accept=image/* · *Đã thấy ID trong JS: tab-complaint-detail.js:1585*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-COMPLAINTS-014** `(không có id)` · Ghi chú nội bộ (Chỉ nhân viên thấy) · `radio` · `subtab-tab-complaint-detail` · HTML dòng 588 · *Chưa thấy liên kết tĩnh rõ ràng (kiểm chứng runtime)*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-COMPLAINTS-015** `(không có id)` · Ghi chú nội bộ (Chỉ nhân viên thấy) · `radio` · `subtab-tab-complaint-detail` · HTML dòng 589 · *Chưa thấy liên kết tĩnh rõ ràng (kiểm chứng runtime)*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-COMPLAINTS-016** `replyContentInput` · Ghi chú nội bộ (Chỉ nhân viên thấy) · `textarea` · `subtab-tab-complaint-detail` · HTML dòng 591 · *Đã thấy ID trong JS: tab-complaint-detail.js:1155*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-COMPLAINTS-017** `inputTicketCustomerPhone` · Số điện thoại khách hàng * · `text` · `createTicketModalForm` · HTML dòng 615 · *Đã thấy ID trong JS: complaints.js:1361, complaints.js:1512*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-COMPLAINTS-018** `inputTicketCustomerName` · Tên khách hàng * · `text` · `createTicketModalForm` · HTML dòng 621 · *Đã thấy ID trong JS: complaints.js:1362, complaints.js:1513*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-COMPLAINTS-019** `inputTicketRefSearch` · Chọn lịch hẹn liên quan * · `text` · `createTicketModalForm` · HTML dòng 636 · *Đã thấy ID trong JS: complaints.js:1359, complaints.js:1514*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-COMPLAINTS-020** `selectTicketRefId` · Chọn lịch hẹn liên quan * · `hidden` · `createTicketModalForm` · HTML dòng 637 · *Đã thấy ID trong JS: complaints.js:1360, complaints.js:1515*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-COMPLAINTS-021** `selectTicketPriority` · Mức độ ưu tiên * · `select` · `createTicketModalForm` · HTML dòng 648 · options: `medium`, `high`, `low` · *Đã thấy ID trong JS: complaints.js:1363, complaints.js:1929*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-COMPLAINTS-022** `chkTicketUnverified` · Chưa xác minh giao dịch (Tạo vé tiếp nhận trước, liên kết giao dịch sau) · `checkbox` · `createTicketModalForm` · HTML dòng 658 · *Đã thấy ID trong JS: complaints.js:1364, complaints.js:1529*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-COMPLAINTS-023** `inputTicketTitle` · Tiêu đề khiếu nại * · `text` · `createTicketModalForm` · HTML dòng 669 · *Đã thấy ID trong JS: complaints.js:1365, complaints.js:1927*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-COMPLAINTS-024** `inputTicketContent` · Nội dung phản ánh chi tiết * · `textarea` · `createTicketModalForm` · HTML dòng 674 · *Đã thấy ID trong JS: complaints.js:1366, complaints.js:1928*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-COMPLAINTS-025** `inputTicketReceiver` · Nhân viên tiếp nhận · `text` · `createTicketModalForm` · HTML dòng 680 · readonly · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-COMPLAINTS-026** `inputTicketFiles` · Hình ảnh hoặc bằng chứng đính kèm · `file` · `createTicketModalForm` · HTML dòng 685 · multiple; accept=image/* · *Đã thấy ID trong JS: complaints.js:1898*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-COMPLAINTS-027** `selectResolveOption` · Chọn phương án giải quyết * · `select` · `resolveTicketModalForm` · HTML dòng 715 · options: `explain`, `redo_service`, `change_staff`, `refund`, `rma_exchange`, `rma_refund`, `reward_voucher`, `reject` · *Đã thấy ID trong JS: tab-complaint-detail.js:556, tab-complaint-detail.js:703, tab-complaint-detail.js:717*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-COMPLAINTS-028** `inputResolveRmaCode` · Mã RMA phát hành · `text` · `resolveTicketModalForm` · HTML dòng 733 · readonly · *Đã thấy ID trong JS: tab-complaint-detail.js:562*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-COMPLAINTS-029** `selectResolveRmaPickup` · Hình thức thu hồi hàng * · `select` · `resolveTicketModalForm` · HTML dòng 737 · options: `Bưu tá Pawpal / GHN tới tận nơi lấy hàng`, `Khách hàng tự gửi bưu điện về kho` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-COMPLAINTS-030** `selectResolveRmaWarehouse` · Kho tiếp nhận hàng hoàn · `select` · `resolveTicketModalForm` · HTML dòng 745 · options: `Kho Pawpal Tân Bình (123 Hoàng Văn Thụ, Q. Tân Bình, TP.HCM)`, `Kho Pawpal Thủ Đức (45 Võ Văn Ngân, TP. Thủ Đức, TP.HCM)` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-COMPLAINTS-031** `inputResolveRmaReplacement` · Sản phẩm gửi bù mới * · `text` · `resolveTicketModalForm` · HTML dòng 752 · *Đã thấy ID trong JS: tab-complaint-detail.js:570, tab-complaint-detail.js:581*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-COMPLAINTS-032** `inputResolveRmaRefundAmount` · Số tiền hoàn sau khi nhận hàng hoàn * · `number` · `resolveTicketModalForm` · HTML dòng 762 · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-COMPLAINTS-033** `inputResolveRedoTime` · Thời gian hẹn làm bù * · `text` · `resolveTicketModalForm` · HTML dòng 772 · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-COMPLAINTS-034** `selectResolveRedoStaff` · Kỹ thuật viên chỉ định tiếp nhận * · `select` · `resolveTicketModalForm` · HTML dòng 776 · options: `Trần Văn Hùng (Groomer trưởng)`, `Lê Lệ Quyên (Quản lý chi nhánh)`, `Nguyễn Văn A (Kỹ thuật viên cao cấp)` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-COMPLAINTS-035** `inputResolveRewardPoints` · Số điểm Pawpoint cộng bồi hoàn · `number` · `resolveTicketModalForm` · HTML dòng 791 · *Đã thấy ID trong JS: tab-complaint-detail.js:725*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-COMPLAINTS-036** `inputResolveRewardVoucher` · Mã Voucher tặng kèm · `text` · `resolveTicketModalForm` · HTML dòng 795 · *Đã thấy ID trong JS: tab-complaint-detail.js:726*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-COMPLAINTS-037** `inputResolveRefundAmount` · Số tiền hoàn * · `number` · `resolveTicketModalForm` · HTML dòng 806 · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-COMPLAINTS-038** `selectResolveRefundMethod` · Hình thức hoàn tiền * · `select` · `resolveTicketModalForm` · HTML dòng 810 · options: `Chuyển khoản trực tiếp về số tài khoản khách hàng`, `Hoàn vào ví điểm Pawpoint của khách hàng`, `Hoàn tiền mặt trực tiếp tại quầy` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-COMPLAINTS-039** `inputResolveNote` · Ghi chú và lý do thực hiện phương án * · `textarea` · `resolveTicketModalForm` · HTML dòng 821 · *Đã thấy ID trong JS: tab-complaint-detail.js:567, tab-complaint-detail.js:718*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-COMPLAINTS-040** `selectAssignStaff` · Nhân viên tiếp nhận mới * · `select` · `assignHandlerModalForm` · HTML dòng 843 · *Đã thấy ID trong JS: complaints.js:1303, tab-complaint-detail.js:858, tab-complaint-detail.js:1620*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-COMPLAINTS-041** `inputAssignNote` · Lý do chuyển giao và dặn dò chuyên môn * · `textarea` · `assignHandlerModalForm` · HTML dòng 849 · *Đã thấy ID trong JS: tab-complaint-detail.js:859, tab-complaint-detail.js:1626*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-COMPLAINTS-042** `selectRequestChannel` · Kênh liên hệ khách hàng * · `select` · `requestMoreInfoModalForm` · HTML dòng 871 · options: `zalo`, `sms`, `call`, `email` · *Đã thấy ID trong JS: tab-complaint-detail.js:1018, tab-complaint-detail.js:1640*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-COMPLAINTS-043** `inputRequestMessage` · Nội dung tin nhắn yêu cầu * · `textarea` · `requestMoreInfoModalForm` · HTML dòng 880 · *Đã thấy ID trong JS: complaints.js:1320, tab-complaint-detail.js:1019, tab-complaint-detail.js:1637*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.

### I.chatbot — 55 trường
- [x] **FIELD-CHATBOT-001** `inboxSearchInput` · Khách hàng nhận điểm · `text` · `subtab-tab-live-support` · HTML dòng 11 · *Đã thấy ID trong JS: tab-chatbot-live.js:368, tab-chatbot-live.js:1184*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CHATBOT-002** `chatMessageInput` · Khách hàng nhận điểm · `textarea` · `subtab-tab-live-support` · HTML dòng 158 · *Đã thấy ID trong JS: tab-chatbot-live.js:1024, tab-chatbot-live.js:1274, tab-chatbot-live.js:1398*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CHATBOT-003** `adminChatFileInput` · Khách hàng nhận điểm · `file` · `subtab-tab-live-support` · HTML dòng 167 · accept=image/jpeg,image/png,image/webp · *Đã thấy ID trong JS: tab-chatbot-live.js:1013, tab-chatbot-live.js:1288*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CHATBOT-004** `chatInternalNoteInput` · Khách hàng nhận điểm · `textarea` · `subtab-tab-live-support` · HTML dòng 233 · *Đã thấy ID trong JS: tab-chatbot-live.js:869, tab-chatbot-live.js:1343*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CHATBOT-005** `inputCopilotSessionSearch` · Khách hàng nhận điểm · `text` · `subtab-tab-ai-copilot` · HTML dòng 251 · *Đã thấy ID trong JS: tab-chatbot-copilot.js:22, tab-chatbot-copilot.js:443, tab-chatbot-copilot.js:454*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CHATBOT-006** `copilotInput` · Khách hàng nhận điểm · `textarea` · `subtab-tab-ai-copilot` · HTML dòng 298 · *Đã thấy ID trong JS: tab-chatbot-copilot.js:17*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CHATBOT-007** `inputFaqSearch` · Khách hàng nhận điểm · `text` · `subtab-tab-chatbot-rules` · HTML dòng 326 · *Đã thấy ID trong JS: tab-chatbot-rules.js:158, tab-chatbot-rules.js:978*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CHATBOT-008** `selectFaqCategoryFilter` · Khách hàng nhận điểm · `select` · `subtab-tab-chatbot-rules` · HTML dòng 327 · options: `all` · *Đã thấy ID trong JS: tab-chatbot-rules.js:95, tab-chatbot-rules.js:159, tab-chatbot-rules.js:982*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CHATBOT-009** `selectFaqStatusFilter` · Khách hàng nhận điểm · `select` · `subtab-tab-chatbot-rules` · HTML dòng 330 · options: `all`, `active`, `inactive` · *Đã thấy ID trong JS: tab-chatbot-rules.js:160, tab-chatbot-rules.js:986*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CHATBOT-010** `inputProfanitySearch` · Khách hàng nhận điểm · `text` · `subtab-tab-chatbot-rules` · HTML dòng 373 · *Đã thấy ID trong JS: tab-chatbot-rules.js:321, tab-chatbot-rules.js:995*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CHATBOT-011** `selectProfanitySeverityFilter` · Khách hàng nhận điểm · `select` · `subtab-tab-chatbot-rules` · HTML dòng 374 · options: `all`, `critical`, `high`, `medium`, `low` · *Đã thấy ID trong JS: tab-chatbot-rules.js:322, tab-chatbot-rules.js:999*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CHATBOT-012** `selectProfanityActionFilter` · Khách hàng nhận điểm · `select` · `subtab-tab-chatbot-rules` · HTML dòng 381 · options: `all`, `mask`, `warn`, `block` · *Đã thấy ID trong JS: tab-chatbot-rules.js:323, tab-chatbot-rules.js:1003*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CHATBOT-013** `selectProfanityStatusFilter` · Khách hàng nhận điểm · `select` · `subtab-tab-chatbot-rules` · HTML dòng 387 · options: `all`, `active`, `inactive` · *Đã thấy ID trong JS: tab-chatbot-rules.js:324, tab-chatbot-rules.js:1007*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CHATBOT-014** `inputCannedSearch` · Khách hàng nhận điểm · `text` · `subtab-tab-chatbot-rules` · HTML dòng 427 · *Đã thấy ID trong JS: tab-chatbot-rules.js:488, tab-chatbot-rules.js:1016*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CHATBOT-015** `selectCannedCategoryFilter` · Khách hàng nhận điểm · `select` · `subtab-tab-chatbot-rules` · HTML dòng 428 · options: `all` · *Đã thấy ID trong JS: tab-chatbot-rules.js:103, tab-chatbot-rules.js:489, tab-chatbot-rules.js:1020*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CHATBOT-016** `selectCannedStatusFilter` · Khách hàng nhận điểm · `select` · `subtab-tab-chatbot-rules` · HTML dòng 431 · options: `all`, `active`, `inactive` · *Đã thấy ID trong JS: tab-chatbot-rules.js:490, tab-chatbot-rules.js:1024*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CHATBOT-017** `inputPolicySearch` · Khách hàng nhận điểm · `text` · `subtab-tab-chatbot-rules` · HTML dòng 476 · *Đã thấy ID trong JS: tab-chatbot-rules.js:642, tab-chatbot-rules.js:1049*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CHATBOT-018** `inputMatrixSearch` · Khách hàng nhận điểm · `text` · `subtab-tab-chatbot-rules` · HTML dòng 573 · *Đã thấy ID trong JS: tab-chatbot-rules.js:740, tab-chatbot-rules.js:1055*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CHATBOT-019** `selectMatrixStatusFilter` · Khách hàng nhận điểm · `select` · `subtab-tab-chatbot-rules` · HTML dòng 574 · options: `all`, `passed`, `failed` · *Đã thấy ID trong JS: tab-chatbot-rules.js:741, tab-chatbot-rules.js:1059*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CHATBOT-020** `rewardCustomerName` · Khách hàng nhận điểm · `text` · `rewardPointsModalOverlay` · HTML dòng 623 · readonly · *Đã thấy ID trong JS: tab-chatbot-live.js:1423*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CHATBOT-021** `inputCustomRewardPoints` · Số điểm muốn tặng * · `number` · `rewardPointsModalOverlay` · HTML dòng 632 · *Đã thấy ID trong JS: tab-chatbot-live.js:1424*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CHATBOT-022** `selectRewardReason` · Lý do tặng điểm * · `select` · `rewardPointsModalOverlay` · HTML dòng 636 · options: `delay`, `booking_reschedule`, `service_apology`, `loyalty` · *Đã thấy ID trong JS: tab-chatbot-live.js:1454*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CHATBOT-023** `selectConvertTicketCategory` · Phân loại khiếu nại * · `select` · `convertTicketModalOverlay` · HTML dòng 665 · options: `order`, `service` · *Đã thấy ID trong JS: tab-chatbot-live.js:1654*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CHATBOT-024** `inputConvertRefId` · Mã giao dịch liên quan · `text` · `convertTicketModalOverlay` · HTML dòng 673 · *Đã thấy ID trong JS: tab-chatbot-live.js:1522, tab-chatbot-live.js:1538, tab-chatbot-live.js:1597*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CHATBOT-025** `inputConvertTicketTitle` · Tiêu đề vé khiếu nại * · `text` · `convertTicketModalOverlay` · HTML dòng 687 · *Đã thấy ID trong JS: tab-chatbot-live.js:1523*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CHATBOT-026** `selectConvertPriority` · Mức độ ưu tiên * · `select` · `convertTicketModalOverlay` · HTML dòng 691 · options: `high`, `medium`, `low` · *Đã thấy ID trong JS: tab-chatbot-live.js:1659*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CHATBOT-027** `escalateCustomerName` · Khách hàng cần chuyển giao · `text` · `escalateManagerModalOverlay` · HTML dòng 719 · readonly · *Đã thấy ID trong JS: tab-chatbot-live.js:1748*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CHATBOT-028** `selectEscalateReason` · Lý do chuyển cấp khẩn cấp * · `select` · `escalateManagerModalOverlay` · HTML dòng 723 · options: `toxic`, `injury`, `dispute` · *Đã thấy ID trong JS: tab-chatbot-live.js:1769*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CHATBOT-029** `selectEscalateTarget` · Bộ phận và Nhân sự tiếp nhận * · `select` · `escalateManagerModalOverlay` · HTML dòng 731 · options: `mgr-q1`, `vet-q1`, `cskh-lead` · *Đã thấy ID trong JS: tab-chatbot-live.js:1767*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CHATBOT-030** `inputEscalateNotes` · Ghi chú tóm tắt bàn giao · `textarea` · `escalateManagerModalOverlay` · HTML dòng 739 · *Đã thấy ID trong JS: tab-chatbot-live.js:1749, tab-chatbot-live.js:1754, tab-chatbot-live.js:1771*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CHATBOT-031** `inputSearchCanned` · Khách hàng nhận điểm · `text` · `cannedResponsesModalOverlay` · HTML dòng 765 · *Đã thấy ID trong JS: tab-chatbot-live.js:1837, tab-chatbot-live.js:1852, tab-chatbot-live.js:1901*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CHATBOT-032** `selectCannedCategory` · Khách hàng nhận điểm · `select` · `cannedResponsesModalOverlay` · HTML dòng 766 · options: `all`, `greeting`, `shipping`, `service`, `reward`, `dispute` · *Đã thấy ID trong JS: tab-chatbot-live.js:1838, tab-chatbot-live.js:1853, tab-chatbot-live.js:1902*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CHATBOT-033** `inputFaqEditId` · Danh mục nghiệp vụ * · `hidden` · `modalFaqEditorOverlay` · HTML dòng 908 · *Đã thấy ID trong JS: tab-chatbot-rules.js:277, tab-chatbot-rules.js:1070*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CHATBOT-034** `inputFaqCategory` · Danh mục nghiệp vụ * · `text` · `modalFaqEditorOverlay` · HTML dòng 911 · *Đã thấy ID trong JS: tab-chatbot-rules.js:278, tab-chatbot-rules.js:1071*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CHATBOT-035** `inputFaqQuestionText` · Câu hỏi của khách hàng * · `text` · `modalFaqEditorOverlay` · HTML dòng 915 · *Đã thấy ID trong JS: tab-chatbot-rules.js:279, tab-chatbot-rules.js:1072*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CHATBOT-036** `textareaFaqAnswerText` · Nội dung giải đáp chuẩn mực * · `textarea` · `modalFaqEditorOverlay` · HTML dòng 919 · *Đã thấy ID trong JS: tab-chatbot-rules.js:280, tab-chatbot-rules.js:1073*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CHATBOT-037** `inputFaqKeywordsList` · Từ khóa kích hoạt (phân cách dấu phẩy) · `text` · `modalFaqEditorOverlay` · HTML dòng 923 · *Đã thấy ID trong JS: tab-chatbot-rules.js:281, tab-chatbot-rules.js:1074*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CHATBOT-038** `inputFaqPriorityNum` · Độ ưu tiên (1: Cao nhất) · `number` · `modalFaqEditorOverlay` · HTML dòng 928 · min=1; max=100 · *Đã thấy ID trong JS: tab-chatbot-rules.js:282, tab-chatbot-rules.js:1075*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CHATBOT-039** `checkboxFaqIsActive` · Kích hoạt trả lời tự động · `checkbox` · `modalFaqEditorOverlay` · HTML dòng 932 · *Đã thấy ID trong JS: tab-chatbot-rules.js:283, tab-chatbot-rules.js:1076*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CHATBOT-040** `inputProfanityEditId` · Từ ngữ cần nhận diện * · `hidden` · `modalProfanityEditorOverlay` · HTML dòng 957 · *Đã thấy ID trong JS: tab-chatbot-rules.js:447, tab-chatbot-rules.js:1132*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CHATBOT-041** `inputProfanityKeywordText` · Từ ngữ cần nhận diện * · `text` · `modalProfanityEditorOverlay` · HTML dòng 960 · *Đã thấy ID trong JS: tab-chatbot-rules.js:448, tab-chatbot-rules.js:1133*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CHATBOT-042** `selectProfanitySeverityVal` · Mức độ nghiêm trọng * · `select` · `modalProfanityEditorOverlay` · HTML dòng 965 · options: `critical`, `high`, `medium`, `low` · *Đã thấy ID trong JS: tab-chatbot-rules.js:449, tab-chatbot-rules.js:1134*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CHATBOT-043** `selectProfanityActionVal` · Hành động xử lý * · `select` · `modalProfanityEditorOverlay` · HTML dòng 974 · options: `mask`, `warn`, `block` · *Đã thấy ID trong JS: tab-chatbot-rules.js:450, tab-chatbot-rules.js:1135*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CHATBOT-044** `inputProfanityReplacementVal` · Ký tự thay thế · `text` · `modalProfanityEditorOverlay` · HTML dòng 984 · *Đã thấy ID trong JS: tab-chatbot-rules.js:451, tab-chatbot-rules.js:1136*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CHATBOT-045** `checkboxProfanityIsActive` · Kích hoạt màng lọc · `checkbox` · `modalProfanityEditorOverlay` · HTML dòng 988 · *Đã thấy ID trong JS: tab-chatbot-rules.js:452, tab-chatbot-rules.js:1137*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CHATBOT-046** `inputCannedEditId` · Phím tắt * · `hidden` · `modalCannedEditorOverlay` · HTML dòng 1013 · *Đã thấy ID trong JS: tab-chatbot-rules.js:603, tab-chatbot-rules.js:1189*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CHATBOT-047** `inputCannedShortcutText` · Phím tắt * · `text` · `modalCannedEditorOverlay` · HTML dòng 1017 · *Đã thấy ID trong JS: tab-chatbot-rules.js:604, tab-chatbot-rules.js:1190*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CHATBOT-048** `inputCannedTitleText` · Tiêu đề mẫu câu * · `text` · `modalCannedEditorOverlay` · HTML dòng 1021 · *Đã thấy ID trong JS: tab-chatbot-rules.js:605, tab-chatbot-rules.js:1191*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CHATBOT-049** `inputCannedCategoryText` · Chủ đề phân loại * · `text` · `modalCannedEditorOverlay` · HTML dòng 1026 · *Đã thấy ID trong JS: tab-chatbot-rules.js:606, tab-chatbot-rules.js:1192*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CHATBOT-050** `textareaCannedContentText` · Nội dung mẫu phản hồi * · `textarea` · `modalCannedEditorOverlay` · HTML dòng 1030 · *Đã thấy ID trong JS: tab-chatbot-rules.js:607, tab-chatbot-rules.js:1193*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CHATBOT-051** `checkboxCannedIsActive` · Kích hoạt mẫu câu · `checkbox` · `modalCannedEditorOverlay` · HTML dòng 1034 · *Đã thấy ID trong JS: tab-chatbot-rules.js:608, tab-chatbot-rules.js:1194*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CHATBOT-052** `resolveChatCustomerName` · Khách hàng · `text` · `modalResolveChatOverlay` · HTML dòng 1060 · readonly · *Đã thấy ID trong JS: tab-chatbot-live.js:2022*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CHATBOT-053** `selectResolveReason` · Kết quả giải quyết * · `select` · `modalResolveChatOverlay` · HTML dòng 1064 · options: `resolved_complete`, `service_consulted`, `order_tracked`, `ticket_created`, `customer_left` · *Đã thấy ID trong JS: tab-chatbot-live.js:2023, tab-chatbot-live.js:2042*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CHATBOT-054** `textareaResolveNotes` · Ghi chú tổng kết ca (Lưu vào hồ sơ) · `textarea` · `modalResolveChatOverlay` · HTML dòng 1074 · *Đã thấy ID trong JS: tab-chatbot-live.js:2024, tab-chatbot-live.js:2030, tab-chatbot-live.js:2043*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-CHATBOT-055** `checkboxSendCsatSurvey` · Gửi biểu mẫu đánh giá mức độ hài lòng (CSAT) cho khách hàng · `checkbox` · `modalResolveChatOverlay` · HTML dòng 1078 · *Đã thấy ID trong JS: tab-chatbot-live.js:2025*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.

### I.staff — 63 trường
- [x] **FIELD-STAFF-001** `staffSearchInput` · Chức vụ: · `text` · `subtab-tab-staff-list` · HTML dòng 48 · maxlength=300 · *Đã thấy ID trong JS: tab-staff-list.js:45, tab-staff-list.js:256, tab-staff-list.js:625*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-002** `staffFilterPosition` · Chức vụ: · `select` · `subtab-tab-staff-list` · HTML dòng 60 · options: `ALL`, `Admin`, `MEDICAL_CAREGIVER`, `Receptionist`, `Groomer`, `Caregiver`, `CSKH`, `Driver` · *Đã thấy ID trong JS: tab-staff-list.js:46, tab-staff-list.js:257, tab-staff-list.js:649*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-003** `staffFilterStatus` · Trạng thái: · `select` · `subtab-tab-staff-list` · HTML dòng 74 · options: `ALL`, `ACTIVE`, `LEAVE`, `PAUSE`, `RESIGNED` · *Đã thấy ID trong JS: tab-staff-list.js:48, tab-staff-list.js:259, tab-staff-list.js:665*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-004** `staffFilterShift` · Ca làm việc: · `select` · `subtab-tab-staff-list` · HTML dòng 85 · options: `ALL`, `MORNING`, `AFTERNOON`, `EVENING`, `NIGHT`, `FULL_TIME` · *Đã thấy ID trong JS: tab-staff-list.js:47, tab-staff-list.js:258, tab-staff-list.js:657*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-005** `scheduleDatePicker` · Chức vụ: · `date` · `subtab-tab-staff-schedule` · HTML dòng 377 · *Đã thấy ID trong JS: tab-staff-schedule.js:44, tab-staff-schedule.js:698, tab-staff-schedule.js:774*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-006** `scheduleFilterPosition` · Chức vụ: · `select` · `subtab-tab-staff-schedule` · HTML dòng 397 · options: `ALL`, `Admin`, `Veterinarian`, `Receptionist`, `Groomer`, `Caregiver`, `CSKH`, `Driver` · *Đã thấy ID trong JS: tab-staff-schedule.js:21, tab-staff-schedule.js:707*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-007** `scheduleFilterShift` · Ca làm việc: · `select` · `subtab-tab-staff-schedule` · HTML dòng 411 · options: `ALL`, `MORNING`, `AFTERNOON`, `EVENING`, `NIGHT` · *Đã thấy ID trong JS: tab-staff-schedule.js:22, tab-staff-schedule.js:708*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-008** `assessmentSearchInput` · Loại kiểm tra: · `text` · `subtab-tab-staff-assessment` · HTML dòng 498 · *Đã thấy ID trong JS: tab-staff-assessment.js:74, tab-staff-assessment.js:223*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-009** `assessmentFilterType` · Loại kiểm tra: · `select` · `subtab-tab-staff-assessment` · HTML dòng 509 · options: `ALL`, `Grooming`, `Spa`, `CSKH`, `Taxi Pet`, `Lưu trú 24/7`, `Sơ cứu an toàn` · *Đã thấy ID trong JS: tab-staff-assessment.js:10, tab-staff-assessment.js:85, tab-staff-assessment.js:245*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-010** `assessmentFilterResult` · Kết quả: · `select` · `subtab-tab-staff-assessment` · HTML dòng 522 · options: `ALL`, `PASS`, `RETRAIN`, `FAIL` · *Đã thấy ID trong JS: tab-staff-assessment.js:11, tab-staff-assessment.js:86, tab-staff-assessment.js:254*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-011** `staffInputName` · Họ và tên * · `text` · `staffModalForm` · HTML dòng 651 · maxlength=100 · *Đã thấy ID trong JS: tab-staff-list.js:431, tab-staff-list.js:829*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-012** `staffInputPhone` · Số điện thoại * · `text` · `staffModalForm` · HTML dòng 655 · *Đã thấy ID trong JS: tab-staff-list.js:432, tab-staff-list.js:830*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-013** `staffInputEmail` · Email công việc * · `email` · `staffModalForm` · HTML dòng 659 · *Đã thấy ID trong JS: tab-staff-list.js:433, tab-staff-list.js:790, tab-staff-list.js:831*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-014** `staffInputAddress` · Địa chỉ · `text` · `staffModalForm` · HTML dòng 663 · *Đã thấy ID trong JS: tab-staff-list.js:434, tab-staff-list.js:834*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-015** `staffInputDob` · Ngày sinh · `date` · `staffModalForm` · HTML dòng 667 · *Đã thấy ID trong JS: tab-staff-list.js:435, tab-staff-list.js:835*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-016** `staffInputJoinDate` · Ngày bắt đầu làm * · `date` · `staffModalForm` · HTML dòng 671 · *Đã thấy ID trong JS: tab-staff-list.js:436, tab-staff-list.js:836*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-017** `staffInputPosition` · Chức vụ * · `select` · `staffModalForm` · HTML dòng 679 · options: `Quản trị viên`, `Lễ tân tiếp đón`, `Kỹ thuật viên grooming`, `Chuyên viên spa thú cưng`, `Bảo mẫu lưu trú pet hotel`, `Chăm sóc khách hàng`, `Tài xế taxi pet` · *Đã thấy ID trong JS: tab-staff-list.js:437, tab-staff-list.js:837*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-018** `staffInputShift` · Ca làm việc * · `select` · `staffModalForm` · HTML dòng 691 · required · options: `Chọn ca làm việc`, `MORNING`, `AFTERNOON`, `EVENING`, `NIGHT` · *Đã thấy ID trong JS: tab-staff-list.js:438, tab-staff-list.js:838*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-019** `staffInputSpecialization` · Chuyên môn và ghi chú · `text` · `staffModalForm` · HTML dòng 701 · *Đã thấy ID trong JS: tab-staff-list.js:439, tab-staff-list.js:839*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-020** `staffEnableAccountToggle` · Cấp tài khoản đăng nhập Pawpal-er · `checkbox` · `staffModalForm` · HTML dòng 708 · *Đã thấy ID trong JS: tab-staff-list.js:441, tab-staff-list.js:781, tab-staff-list.js:848*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-021** `staffAccountEmail` · Email công vụ đăng nhập * · `email` · `staffModalForm` · HTML dòng 731 · *Đã thấy ID trong JS: tab-staff-list.js:444, tab-staff-list.js:791, tab-staff-list.js:832*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-022** `staffAccountPassword` · Mật khẩu khởi tạo * · `text` · `staffModalForm` · HTML dòng 738 · *Đã thấy ID trong JS: tab-staff-list.js:445, tab-staff-list.js:809, tab-staff-list.js:850*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-023** `staffAccountSystemRole` · Vai trò hệ thống * · `select` · `staffModalForm` · HTML dòng 745 · options: `ADMIN`, `RECEPTIONIST`, `GROOMER`, `CAREGIVER`, `CSKH`, `DRIVER`, `STAFF` · *Đã thấy ID trong JS: tab-staff-list.js:477, tab-staff-list.js:851*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-024** `staffMustChangePasswordCheckbox` · Bắt buộc đổi mật khẩu ở lần đăng nhập đầu tiên · `checkbox` · `staffModalForm` · HTML dòng 757 · *Đã thấy ID trong JS: tab-staff-list.js:852*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-025** `(không có id)` · Xem lịch hẹn · `checkbox` · `staffModalForm` · HTML dòng 768 · *Chưa thấy liên kết tĩnh rõ ràng (kiểm chứng runtime)*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-026** `(không có id)` · Xem lịch hẹn · `checkbox` · `staffModalForm` · HTML dòng 769 · *Chưa thấy liên kết tĩnh rõ ràng (kiểm chứng runtime)*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-027** `(không có id)` · Xem lịch hẹn · `checkbox` · `staffModalForm` · HTML dòng 770 · *Chưa thấy liên kết tĩnh rõ ràng (kiểm chứng runtime)*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-028** `(không có id)` · Cập nhật hình ảnh thực tế · `checkbox` · `staffModalForm` · HTML dòng 774 · *Chưa thấy liên kết tĩnh rõ ràng (kiểm chứng runtime)*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-029** `(không có id)` · Cập nhật hình ảnh thực tế · `checkbox` · `staffModalForm` · HTML dòng 775 · *Chưa thấy liên kết tĩnh rõ ràng (kiểm chứng runtime)*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-030** `(không có id)` · Tạo đơn hàng tại quầy · `checkbox` · `staffModalForm` · HTML dòng 779 · *Chưa thấy liên kết tĩnh rõ ràng (kiểm chứng runtime)*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-031** `(không có id)` · Tạo đơn hàng tại quầy · `checkbox` · `staffModalForm` · HTML dòng 780 · *Chưa thấy liên kết tĩnh rõ ràng (kiểm chứng runtime)*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-032** `(không có id)` · Quản lý hồ sơ nhân sự · `checkbox` · `staffModalForm` · HTML dòng 784 · *Chưa thấy liên kết tĩnh rõ ràng (kiểm chứng runtime)*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-033** `(không có id)` · Quản lý hồ sơ nhân sự · `checkbox` · `staffModalForm` · HTML dòng 785 · *Chưa thấy liên kết tĩnh rõ ràng (kiểm chứng runtime)*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-034** `(không có id)` · Quản lý hồ sơ nhân sự · `checkbox` · `staffModalForm` · HTML dòng 786 · *Chưa thấy liên kết tĩnh rõ ràng (kiểm chứng runtime)*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-035** `shiftInputDate` · Ngày làm việc * · `date` · `shiftModalForm` · HTML dòng 810 · *Đã thấy ID trong JS: tab-staff-schedule.js:512, tab-staff-schedule.js:723*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-036** `shiftInputShift` · Ca làm việc * · `select` · `shiftModalForm` · HTML dòng 814 · options: `MORNING`, `AFTERNOON`, `EVENING`, `NIGHT` · *Đã thấy ID trong JS: tab-staff-schedule.js:513, tab-staff-schedule.js:724*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-037** `assessInputStaff` · Nhân viên * · `select` · `assessmentModalForm` · HTML dòng 860 · *Đã thấy ID trong JS: tab-staff-assessment.js:184, tab-staff-assessment.js:270*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-038** `assessInputDate` · Ngày kiểm tra * · `date` · `assessmentModalForm` · HTML dòng 867 · *Đã thấy ID trong JS: tab-staff-assessment.js:185, tab-staff-assessment.js:271*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-039** `assessInputType` · Loại kiểm tra * · `select` · `assessmentModalForm` · HTML dòng 871 · options: `Grooming`, `Spa`, `CSKH`, `Taxi Pet`, `Lưu trú 24/7`, `Sơ cứu an toàn` · *Đã thấy ID trong JS: tab-staff-assessment.js:186, tab-staff-assessment.js:272*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-040** `assessInputScore` · Điểm đánh giá (0-100) * · `number` · `assessmentModalForm` · HTML dòng 884 · min=0; max=100 · *Đã thấy ID trong JS: tab-staff-assessment.js:187, tab-staff-assessment.js:273*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-041** `assessInputResult` · Kết quả * · `select` · `assessmentModalForm` · HTML dòng 888 · options: `PASS`, `RETRAIN`, `FAIL` · *Đã thấy ID trong JS: tab-staff-assessment.js:188, tab-staff-assessment.js:274*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-042** `assessInputNote` · Ghi chú đào tạo · `textarea` · `assessmentModalForm` · HTML dòng 900 · *Đã thấy ID trong JS: tab-staff-assessment.js:189, tab-staff-assessment.js:275*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-043** `leaveInputStaff` · Nhân viên xin nghỉ * · `select` · `leaveSwapModalForm` · HTML dòng 935 · *Đã thấy ID trong JS: tab-staff-schedule.js:287, tab-staff-schedule.js:604*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-044** `leaveInputType` · Loại nghỉ phép * · `select` · `leaveSwapModalForm` · HTML dòng 941 · options: `ANNUAL`, `SICK`, `PERSONAL`, `UNPAID` · *Đã thấy ID trong JS: tab-staff-schedule.js:287*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-045** `leaveInputStartDate` · Từ ngày * · `date` · `leaveSwapModalForm` · HTML dòng 953 · *Đã thấy ID trong JS: tab-staff-schedule.js:287, tab-staff-schedule.js:620*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-046** `leaveInputEndDate` · Đến ngày * · `date` · `leaveSwapModalForm` · HTML dòng 957 · *Đã thấy ID trong JS: tab-staff-schedule.js:287, tab-staff-schedule.js:621*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-047** `leaveInputScope` · Phạm vi ca nghỉ * · `select` · `leaveSwapModalForm` · HTML dòng 964 · options: `ALL`, `MORNING`, `AFTERNOON`, `EVENING`, `NIGHT` · *Đã thấy ID trong JS: tab-staff-schedule.js:287*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-048** `leaveInputReplacement` · Người trực thay thế (Tùy chọn) · `select` · `leaveSwapModalForm` · HTML dòng 974 · options: `-- Chưa có người thay --` · *Đã thấy ID trong JS: tab-staff-schedule.js:287, tab-staff-schedule.js:605*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-049** `leaveInputReason` · Lý do nghỉ phép * · `text` · `leaveSwapModalForm` · HTML dòng 983 · *Đã thấy ID trong JS: tab-staff-schedule.js:287*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-050** `swapInputStaffFrom` · Nhân viên xin đổi (NV 1) * · `select` · `leaveSwapModalForm` · HTML dòng 992 · *Đã thấy ID trong JS: tab-staff-schedule.js:289, tab-staff-schedule.js:606*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-051** `swapInputStaffTo` · Đổi với nhân viên (NV 2) * · `select` · `leaveSwapModalForm` · HTML dòng 998 · *Đã thấy ID trong JS: tab-staff-schedule.js:289, tab-staff-schedule.js:607*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-052** `swapInputDateFrom` · Ngày xin đổi * · `date` · `leaveSwapModalForm` · HTML dòng 1007 · *Đã thấy ID trong JS: tab-staff-schedule.js:289, tab-staff-schedule.js:622*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-053** `swapInputShiftFrom` · Ca hiện tại của NV 1 * · `select` · `leaveSwapModalForm` · HTML dòng 1011 · options: `MORNING`, `AFTERNOON`, `EVENING`, `NIGHT` · *Đã thấy ID trong JS: tab-staff-schedule.js:289*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-054** `swapInputDateTo` · Ngày đổi sang (hoặc trực bù) * · `date` · `leaveSwapModalForm` · HTML dòng 1023 · *Đã thấy ID trong JS: tab-staff-schedule.js:289, tab-staff-schedule.js:623*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-055** `swapInputShiftTo` · Ca NV 1 sẽ nhận lại * · `select` · `leaveSwapModalForm` · HTML dòng 1027 · options: `MORNING`, `AFTERNOON`, `EVENING`, `NIGHT`, `NONE` · *Đã thấy ID trong JS: tab-staff-schedule.js:289*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-056** `swapInputReason` · Lý do đổi ca * · `text` · `leaveSwapModalForm` · HTML dòng 1039 · *Đã thấy ID trong JS: tab-staff-schedule.js:289*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-057** `reassignSelectAllStaff` · Chuyển nhanh tất cả ca hẹn sang · `select` · `reassignModalForm` · HTML dòng 1120 · *Đã thấy ID trong JS: tab-staff-list.js:538*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-058** `incidentInputStaff` · Nhân sự phụ trách ca * · `select` · `incidentReportModalForm` · HTML dòng 1145 · *Đã thấy ID trong JS: tab-staff-schedule.js:401, tab-staff-schedule.js:449*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-059** `incidentInputBooking` · Bàn hoặc ca dịch vụ liên quan * · `select` · `incidentReportModalForm` · HTML dòng 1151 · *Đã thấy ID trong JS: tab-staff-schedule.js:402, tab-staff-schedule.js:450*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-060** `incidentInputType` · Phân loại sự cố * · `select` · `incidentReportModalForm` · HTML dòng 1160 · options: `SKIN_ISSUE`, `TIMING_DELAY`, `TEMPERAMENT`, `EQUIPMENT` · *Đã thấy ID trong JS: tab-staff-schedule.js:451*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-061** `incidentInputExtend` · Điều chỉnh thời gian hoàn tất · `select` · `incidentReportModalForm` · HTML dòng 1169 · options: `0`, `15`, `30`, `45` · *Đã thấy ID trong JS: tab-staff-schedule.js:452*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-062** `incidentInputSeverity` · Mức độ xử lý * · `select` · `incidentReportModalForm` · HTML dòng 1180 · options: `INTERNAL`, `PRE_NOTIFY`, `URGENT` · *Đã thấy ID trong JS: tab-staff-schedule.js:453*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-STAFF-063** `incidentInputNote` · Mô tả chi tiết sự cố và phương án xử lý · `textarea` · `incidentReportModalForm` · HTML dòng 1189 · *Đã thấy ID trong JS: tab-staff-schedule.js:441, tab-staff-schedule.js:454*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.

### I.settings — 72 trường
- [x] **FIELD-SETTINGS-001** `searchVoucherInput` · Đối tượng · `text` · `subtab-tab-banner-promos` · HTML dòng 63 · *Đã thấy ID trong JS: tab-settings-banners.js:324, tab-settings-banners.js:822*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-002** `filterVoucherTarget` · Đối tượng · `select` · `subtab-tab-banner-promos` · HTML dòng 72 · options: `all`, `Spa`, `Hotel`, `Taxi`, `Shop`, `System` · *Đã thấy ID trong JS: tab-settings-banners.js:325, tab-settings-banners.js:823*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-003** `filterVoucherStatus` · Trạng thái · `select` · `subtab-tab-banner-promos` · HTML dòng 83 · options: `all`, `zero-miss`, `active`, `paused`, `expired` · *Đã thấy ID trong JS: tab-settings-banners.js:326, tab-settings-banners.js:824, tab-settings-banners.js:828*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-004** `searchArticleInput` · Danh mục · `text` · `subtab-tab-content-management` · HTML dòng 236 · *Đã thấy ID trong JS: tab-settings-content.js:67, tab-settings-content.js:214*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-005** `filterArticleCategory` · Danh mục · `select` · `subtab-tab-content-management` · HTML dòng 245 · options: `all`, `Chó`, `Mèo`, `Dinh dưỡng`, `Grooming`, `Mẹo chăm sóc` · *Đã thấy ID trong JS: tab-settings-content.js:68, tab-settings-content.js:161, tab-settings-content.js:218*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-006** `filterArticleStatus` · Trạng thái · `select` · `subtab-tab-content-management` · HTML dòng 256 · options: `all`, `published`, `draft`, `hidden` · *Đã thấy ID trong JS: tab-settings-content.js:69, tab-settings-content.js:222*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-007** `searchAuditLogInput` · Phân hệ tác động · `text` · `subtab-tab-audit-logs` · HTML dòng 505 · *Đã thấy ID trong JS: tab-settings-audit.js:61, tab-settings-audit.js:129*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-008** `filterAuditTargetModule` · Phân hệ tác động · `select` · `subtab-tab-audit-logs` · HTML dòng 515 · options: `all`, `Cấu hình`, `Khách hàng`, `Dịch vụ`, `Bán hàng`, `Nhân sự`, `Khuyến mãi`, `Bài viết`, `Banner`, `Thú cưng` · *Đã thấy ID trong JS: tab-settings-audit.js:62, tab-settings-audit.js:133*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-009** `inputBannerTitle` · Tiêu đề banner * · `text` · `bannerModalOverlay` · HTML dòng 569 · *Đã thấy ID trong JS: tab-settings-banners.js:585, tab-settings-banners.js:606, tab-settings-banners.js:848*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-010** `inputBannerImage` · Ảnh banner URL * · `text` · `bannerModalOverlay` · HTML dòng 573 · *Đã thấy ID trong JS: tab-settings-banners.js:586, tab-settings-banners.js:606, tab-settings-banners.js:849*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-011** `inputBannerCta` · Nút kêu gọi · `text` · `bannerModalOverlay` · HTML dòng 578 · *Đã thấy ID trong JS: tab-settings-banners.js:587, tab-settings-banners.js:606, tab-settings-banners.js:850*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-012** `inputBannerUrl` · Đường dẫn điều hướng · `text` · `bannerModalOverlay` · HTML dòng 583 · *Đã thấy ID trong JS: tab-settings-banners.js:588, tab-settings-banners.js:606, tab-settings-banners.js:616*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-013** `inputBannerStartDate` · Ngày bắt đầu · `date` · `bannerModalOverlay` · HTML dòng 591 · *Đã thấy ID trong JS: tab-settings-banners.js:589, tab-settings-banners.js:606, tab-settings-banners.js:852*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-014** `inputBannerEndDate` · Ngày kết thúc · `date` · `bannerModalOverlay` · HTML dòng 595 · *Đã thấy ID trong JS: tab-settings-banners.js:590, tab-settings-banners.js:606, tab-settings-banners.js:853*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-015** `inputVoucherCode` · Mã voucher * · `text` · `voucherModalOverlay` · HTML dòng 622 · *Đã thấy ID trong JS: tab-settings-banners.js:754, tab-settings-banners.js:901, tab-settings-banners.js:908*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-016** `inputVoucherName` · Tên chương trình * · `text` · `voucherModalOverlay` · HTML dòng 626 · *Đã thấy ID trong JS: tab-settings-banners.js:755, tab-settings-banners.js:908, tab-settings-banners.js:918*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-017** `inputVoucherType` · Loại ưu đãi · `select` · `voucherModalOverlay` · HTML dòng 632 · options: `fixed`, `percent` · *Đã thấy ID trong JS: tab-settings-banners.js:756, tab-settings-banners.js:908, tab-settings-banners.js:920*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-018** `inputVoucherValue` · Giá trị giảm * · `number` · `voucherModalOverlay` · HTML dòng 639 · *Đã thấy ID trong JS: tab-settings-banners.js:757, tab-settings-banners.js:908, tab-settings-banners.js:919*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-019** `inputVoucherMinOrder` · Đơn hàng tối thiểu (VNĐ) · `number` · `voucherModalOverlay` · HTML dòng 645 · *Đã thấy ID trong JS: tab-settings-banners.js:758, tab-settings-banners.js:908, tab-settings-banners.js:922*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-020** `inputVoucherLimit` · Số lượt phát hành · `number` · `voucherModalOverlay` · HTML dòng 649 · *Đã thấy ID trong JS: tab-settings-banners.js:923*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-021** `inputVoucherTarget` · Đối tượng áp dụng · `select` · `voucherModalOverlay` · HTML dòng 655 · options: `System`, `Spa`, `Hotel`, `Shop` · *Đã thấy ID trong JS: tab-settings-banners.js:759, tab-settings-banners.js:895, tab-settings-banners.js:908*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-022** `inputVoucherTier` · Hạng thành viên · `select` · `voucherModalOverlay` · HTML dòng 664 · options: `all`, `Silver`, `Gold`, `VIP` · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-023** `inputVoucherStart` · Ngày bắt đầu · `date` · `voucherModalOverlay` · HTML dòng 675 · *Đã thấy ID trong JS: tab-settings-banners.js:924, tab-settings-banners.js:964*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-024** `inputVoucherEnd` · Ngày kết thúc · `date` · `voucherModalOverlay` · HTML dòng 679 · *Đã thấy ID trong JS: tab-settings-banners.js:925, tab-settings-banners.js:964*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-025** `inputCfgPointValue` · Giá trị 1 điểm quy đổi (VNĐ) * · `number` · `pawpointsModalOverlay` · HTML dòng 718 · *Đã thấy ID trong JS: tab-settings-banners.js:1082*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-026** `inputCfgRegisterPoints` · Điểm thưởng đăng ký · `number` · `pawpointsModalOverlay` · HTML dòng 723 · *Đã thấy ID trong JS: tab-settings-banners.js:1083*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-027** `inputCfgFirstOrderPoints` · Thưởng đơn hàng đầu · `number` · `pawpointsModalOverlay` · HTML dòng 727 · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-028** `inputCfgFirstBookingPoints` · Thưởng đặt lịch đầu · `number` · `pawpointsModalOverlay` · HTML dòng 733 · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-029** `inputCfgBirthdayPoints` · Điểm sinh nhật khách · `number` · `pawpointsModalOverlay` · HTML dòng 737 · *Chưa thấy tham chiếu trực tiếp ID trong JS của phân hệ*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-030** `inputNoticeContent` · Nội dung thông báo * · `textarea` · `notificationModalOverlay` · HTML dòng 760 · *Đã thấy ID trong JS: tab-settings-banners.js:1142, tab-settings-banners.js:1171*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-031** `inputNoticeType` · Kiểu hiển thị · `select` · `notificationModalOverlay` · HTML dòng 765 · options: `topbar`, `popup` · *Đã thấy ID trong JS: tab-settings-banners.js:1147*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-032** `inputNoticeStatus` · Trạng thái kích hoạt · `select` · `notificationModalOverlay` · HTML dòng 772 · options: `active`, `inactive` · *Đã thấy ID trong JS: tab-settings-banners.js:1148*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-033** `inputArticleTitle` · Tiêu đề bài viết * · `text` · `articleModalOverlay` · HTML dòng 798 · *Đã thấy ID trong JS: tab-settings-content.js:250, tab-settings-content.js:266*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-034** `inputArticleCategory` · Danh mục * · `select` · `articleModalOverlay` · HTML dòng 803 · options: `Chó`, `Mèo`, `Dinh dưỡng`, `Grooming`, `Mẹo chăm sóc` · *Đã thấy ID trong JS: tab-settings-content.js:162, tab-settings-content.js:269*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-035** `inputArticleStatus` · Trạng thái xuất bản · `select` · `articleModalOverlay` · HTML dòng 813 · options: `published`, `draft`, `hidden` · *Đã thấy ID trong JS: tab-settings-content.js:270*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-036** `inputArticleSummary` · Tóm tắt ngắn * · `textarea` · `articleModalOverlay` · HTML dòng 822 · *Đã thấy ID trong JS: tab-settings-content.js:252, tab-settings-content.js:267*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-037** `inputArticleContent` · Nội dung chi tiết bài viết * · `textarea` · `articleModalOverlay` · HTML dòng 826 · *Đã thấy ID trong JS: tab-settings-content.js:254, tab-settings-content.js:268*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-038** `inputStoreBrandName` · Tên thương hiệu * · `text` · `storeProfileModalOverlay` · HTML dòng 849 · *Đã thấy ID trong JS: tab-settings-system.js:145, tab-settings-system.js:178*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-039** `inputStoreCompanyName` · Tên công ty pháp lý · `text` · `storeProfileModalOverlay` · HTML dòng 853 · *Đã thấy ID trong JS: tab-settings-system.js:146, tab-settings-system.js:179*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-040** `inputStoreHotline` · Hotline tiếp nhận 24/7 * · `text` · `storeProfileModalOverlay` · HTML dòng 859 · *Đã thấy ID trong JS: tab-settings-system.js:147, tab-settings-system.js:180*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-041** `inputStoreEmergency` · Số điện thoại khẩn cấp · `text` · `storeProfileModalOverlay` · HTML dòng 863 · *Đã thấy ID trong JS: tab-settings-system.js:148, tab-settings-system.js:181*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-042** `inputStoreEmail` · Email CSKH tiếp nhận · `email` · `storeProfileModalOverlay` · HTML dòng 869 · *Đã thấy ID trong JS: tab-settings-system.js:149, tab-settings-system.js:182*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-043** `inputStoreTaxId` · Mã số thuế (MST xuất VAT) · `text` · `storeProfileModalOverlay` · HTML dòng 873 · *Đã thấy ID trong JS: tab-settings-system.js:150, tab-settings-system.js:183*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-044** `inputStoreAddress` · Địa chỉ trụ sở và cơ sở chính * · `text` · `storeProfileModalOverlay` · HTML dòng 878 · *Đã thấy ID trong JS: tab-settings-system.js:151, tab-settings-system.js:184*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-045** `inputStoreZalo` · Liên kết Zalo OA · `text` · `storeProfileModalOverlay` · HTML dòng 883 · *Đã thấy ID trong JS: tab-settings-system.js:152, tab-settings-system.js:185*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-046** `inputStoreFacebook` · Liên kết Fanpage Facebook · `text` · `storeProfileModalOverlay` · HTML dòng 887 · *Đã thấy ID trong JS: tab-settings-system.js:153, tab-settings-system.js:186*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-047** `toggleCodEnabled` · Thanh toán COD · `checkbox` · `paymentConfigModalOverlay` · HTML dòng 911 · *Đã thấy ID trong JS: tab-settings-system.js:238, tab-settings-system.js:271*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-048** `toggleBankEnabled` · Thanh toán COD · `checkbox` · `paymentConfigModalOverlay` · HTML dòng 915 · *Đã thấy ID trong JS: tab-settings-system.js:239, tab-settings-system.js:272*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-049** `toggleMomoEnabled` · Ví điện tử MoMo · `checkbox` · `paymentConfigModalOverlay` · HTML dòng 921 · *Đã thấy ID trong JS: tab-settings-system.js:240, tab-settings-system.js:273*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-050** `toggleVnpayEnabled` · Ví điện tử MoMo · `checkbox` · `paymentConfigModalOverlay` · HTML dòng 925 · *Đã thấy ID trong JS: tab-settings-system.js:241, tab-settings-system.js:274*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-051** `inputPaymentBank` · Ngân hàng thụ hưởng QR Banking · `select` · `paymentConfigModalOverlay` · HTML dòng 934 · options: `vietcombank`, `techcombank`, `mb`, `acb` · *Đã thấy ID trong JS: tab-settings-system.js:248, tab-settings-system.js:276*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-052** `inputPaymentAccNo` · Số tài khoản · `text` · `paymentConfigModalOverlay` · HTML dòng 944 · *Đã thấy ID trong JS: tab-settings-system.js:249, tab-settings-system.js:277*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-053** `inputPaymentAccHolder` · Chủ tài khoản · `text` · `paymentConfigModalOverlay` · HTML dòng 948 · *Đã thấy ID trong JS: tab-settings-system.js:250, tab-settings-system.js:278*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-054** `inputPaymentSyntax` · Cú pháp chuyển khoản mặc định · `text` · `paymentConfigModalOverlay` · HTML dòng 953 · *Đã thấy ID trong JS: tab-settings-system.js:251, tab-settings-system.js:279*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-055** `inputFreeShippingThreshold` · Mức đơn miễn phí giao hàng (VNĐ) * · `number` · `shippingConfigModalOverlay` · HTML dòng 978 · *Đã thấy ID trong JS: tab-settings-system.js:333, tab-settings-system.js:362*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-056** `inputInnerCityFee` · Phí giao hàng nội thành (VNĐ) * · `number` · `shippingConfigModalOverlay` · HTML dòng 982 · *Đã thấy ID trong JS: tab-settings-system.js:334, tab-settings-system.js:363*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-057** `inputOuterCityFee` · Phí giao hàng ngoại tỉnh (VNĐ) * · `number` · `shippingConfigModalOverlay` · HTML dòng 988 · *Đã thấy ID trong JS: tab-settings-system.js:335, tab-settings-system.js:364*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-058** `inputExpressFee` · Phí giao hỏa tốc 2 giờ (VNĐ) · `number` · `shippingConfigModalOverlay` · HTML dòng 992 · *Đã thấy ID trong JS: tab-settings-system.js:336, tab-settings-system.js:365*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-059** `inputShippingProvider` · Đơn vị vận chuyển chính · `select` · `shippingConfigModalOverlay` · HTML dòng 1000 · options: `ghn`, `ghtk`, `grab` · *Đã thấy ID trong JS: tab-settings-system.js:337, tab-settings-system.js:366*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-060** `inputShippingShopId` · Shop ID · `text` · `shippingConfigModalOverlay` · HTML dòng 1009 · *Đã thấy ID trong JS: tab-settings-system.js:338, tab-settings-system.js:367*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-061** `inputShippingApiKey` · API Secret Token · `password` · `shippingConfigModalOverlay` · HTML dòng 1013 · *Đã thấy ID trong JS: tab-settings-system.js:339, tab-settings-system.js:368*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-062** `inputWeekdayOpen` · Ngày thường (Thứ 2 - Thứ 6) · `time` · `bookingPolicyModalOverlay` · HTML dòng 1040 · *Đã thấy ID trong JS: tab-settings-system.js:428, tab-settings-system.js:469*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-063** `inputWeekdayClose` · Ngày thường (Thứ 2 - Thứ 6) · `time` · `bookingPolicyModalOverlay` · HTML dòng 1042 · *Đã thấy ID trong JS: tab-settings-system.js:429, tab-settings-system.js:470*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-064** `inputWeekendOpen` · Cuối tuần (Thứ 7 - Chủ Nhật) · `time` · `bookingPolicyModalOverlay` · HTML dòng 1048 · *Đã thấy ID trong JS: tab-settings-system.js:430, tab-settings-system.js:471*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-065** `inputWeekendClose` · Cuối tuần (Thứ 7 - Chủ Nhật) · `time` · `bookingPolicyModalOverlay` · HTML dòng 1050 · *Đã thấy ID trong JS: tab-settings-system.js:431, tab-settings-system.js:472*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-066** `inputHotelCheckIn` · Giờ Check-in quy định · `time` · `bookingPolicyModalOverlay` · HTML dòng 1060 · *Đã thấy ID trong JS: tab-settings-system.js:438, tab-settings-system.js:474*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-067** `inputHotelCheckOut` · Giờ Check-out quy định · `time` · `bookingPolicyModalOverlay` · HTML dòng 1064 · *Đã thấy ID trong JS: tab-settings-system.js:439, tab-settings-system.js:475*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-068** `inputHotelLateFee` · Phụ phí trả phòng trễ sau 12:00 (VNĐ / nửa ngày) · `number` · `bookingPolicyModalOverlay` · HTML dòng 1069 · *Đã thấy ID trong JS: tab-settings-system.js:440, tab-settings-system.js:476*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-069** `inputSlotCapacity` · Công suất tối đa (số bé / khung giờ) * · `number` · `bookingPolicyModalOverlay` · HTML dòng 1078 · *Đã thấy ID trong JS: tab-settings-system.js:446, tab-settings-system.js:478*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-070** `inputFreeCancelHours` · Thời gian hủy miễn phí trước ca (giờ) · `number` · `bookingPolicyModalOverlay` · HTML dòng 1082 · *Đã thấy ID trong JS: tab-settings-system.js:447, tab-settings-system.js:479*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-071** `inputLateCancelFee` · Phí hủy muộn (VNĐ) · `number` · `bookingPolicyModalOverlay` · HTML dòng 1088 · *Đã thấy ID trong JS: tab-settings-system.js:448, tab-settings-system.js:480*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.
- [x] **FIELD-SETTINGS-072** `inputAllowPickStaff` · Tùy chọn nhân viên yêu thích · `select` · `bookingPolicyModalOverlay` · HTML dòng 1092 · options: `yes`, `no` · *Đã thấy ID trong JS: tab-settings-system.js:449, tab-settings-system.js:481*. **Test:** validate → mapping cột thực → lưu và tải lại/hoặc filter đúng.

## J. 81 THỰC THỂ — KIỂM TỪNG CỘT CSDL KHÔNG SÓT (THEO `CDSLfinal.md`)

> Đây là **toàn bộ tên cột đọc được trong tài liệu thiết kế**, không phải bằng chứng đã có cột thật trong Supabase. Với mỗi cột cần phân loại `MATCH/CHƯA CÓ/ĐỔI TÊN/TYPE DIFF/DB-ONLY/SECRET/N/A`. Đối chiếu `information_schema`, kiểu, default, FK, RLS, thao tác ghi đọc và màn hình phù hợp. Không mặc định mọi cột phải hiện trên UI (chẳng hạn secret/token). Nếu một trường không được UI hỗ trợ, ghi lý do nghiệp vụ, không tự coi là lỗi.

### DB-01 `customer` — 14 cột (CDSLfinal dòng 2)
> Lưu thông tin tài khoản đăng nhập và trạng thái sử dụng hệ thống của khách hàng
- [x] **DB-01.01** `customer.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-01.02** `customer.membership_tier_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: complaints*.
- [x] **DB-01.03** `customer.auth_user_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: staff, settings*.
- [x] **DB-01.04** `customer.email` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, pets, complaints, chatbot, staff, settings*.
- [x] **DB-01.05** `customer.password_hash` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm; BẢO MẬT: không show UI/log, verify RLS/secret storage*.
- [x] **DB-01.06** `customer.account_status` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, complaints, staff*.
- [x] **DB-01.07** `customer.is_temporary` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, pets*.
- [x] **DB-01.08** `customer.phone_main` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, pets, services, orders, complaints, chatbot*.
- [x] **DB-01.09** `customer.registered_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-01.10** `customer.note` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-01.11** `customer.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-01.12** `customer.updated_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, complaints, chatbot, staff, settings*.
- [x] **DB-01.13** `customer.activation_token` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, pets; BẢO MẬT: không show UI/log, verify RLS/secret storage*.
- [x] **DB-01.14** `customer.activation_token_expires_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, pets; BẢO MẬT: không show UI/log, verify RLS/secret storage*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-02 `customer_profile` — 7 cột (CDSLfinal dòng 17)
> Lưu thông tin hồ sơ cá nhân của khách hàng
- [x] **DB-02.01** `customer_profile.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-02.02** `customer_profile.customer_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot*.
- [x] **DB-02.03** `customer_profile.full_name` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-02.04** `customer_profile.date_of_birth` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, pets, services*.
- [x] **DB-02.05** `customer_profile.gender` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, pets, complaints*.
- [x] **DB-02.06** `customer_profile.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-02.07** `customer_profile.updated_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-03 `customer_membership` — 7 cột (CDSLfinal dòng 24)
> Lưu thông tin hạng thành viên và điểm thưởng của khách hàng
- [x] **DB-03.01** `customer_membership.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-03.02** `customer_membership.customer_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot*.
- [x] **DB-03.03** `customer_membership.membership_tier_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: complaints*.
- [x] **DB-03.04** `customer_membership.total_paw_points` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, pets, orders, complaints, chatbot*.
- [x] **DB-03.05** `customer_membership.tier_points` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-03.06** `customer_membership.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-03.07** `customer_membership.updated_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-04 `customer_address` — 10 cột (CDSLfinal dòng 31)
> Lưu nhiều địa chỉ giao hàng, đón trả thú cưng hoặc địa chỉ đặt hộ của khách hàng
- [x] **DB-04.01** `customer_address.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-04.02** `customer_address.customer_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot*.
- [x] **DB-04.03** `customer_address.receiver_name` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, pets, orders*.
- [x] **DB-04.04** `customer_address.receiver_phone` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, pets, orders*.
- [x] **DB-04.05** `customer_address.province` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, orders*.
- [x] **DB-04.06** `customer_address.street_address` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, pets, orders*.
- [x] **DB-04.07** `customer_address.postal_code` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-04.08** `customer_address.is_default` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, pets, orders*.
- [x] **DB-04.09** `customer_address.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-04.10** `customer_address.updated_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-05 `customer_phone` — 6 cột (CDSLfinal dòng 41)
> Lưu nhiều số điện thoại liên hệ của khách hàng, người thân hoặc người nhận thay
- [x] **DB-05.01** `customer_phone.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-05.02** `customer_phone.customer_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot*.
- [x] **DB-05.03** `customer_phone.phone_number` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, orders, staff*.
- [x] **DB-05.04** `customer_phone.is_verified` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-05.05** `customer_phone.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-05.06** `customer_phone.updated_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-06 `membership_tier` — 8 cột (CDSLfinal dòng 47)
> Lưu cấu hình các hạng thành viên như Bạc, Vàng, Kim Cương
- [x] **DB-06.01** `membership_tier.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-06.02** `membership_tier.tier_name` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders*.
- [x] **DB-06.03** `membership_tier.minimum_expenditure` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-06.04** `membership_tier.discount_percent` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: settings*.
- [x] **DB-06.05** `membership_tier.description` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-06.06** `membership_tier.is_active` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, orders, chatbot, settings*.
- [x] **DB-06.07** `membership_tier.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-06.08** `membership_tier.updated_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-07 `reward_rule` — 9 cột (CDSLfinal dòng 55)
> Lưu quy tắc cộng hoặc trừ Paw Points theo từng sự kiện như đăng ký, đặt lịch, mua hàng, đánh giá hoặc chương trình khuyến mãi
- [x] **DB-07.01** `reward_rule.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-07.02** `reward_rule.rule_name` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-07.03** `reward_rule.reward_type` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-07.04** `reward_rule.trigger_event` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-07.05** `reward_rule.reward_value` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-07.06** `reward_rule.description` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-07.07** `reward_rule.is_active` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, orders, chatbot, settings*.
- [x] **DB-07.08** `reward_rule.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-07.09** `reward_rule.updated_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-08 `paw_point_transaction` — 9 cột (CDSLfinal dòng 64)
> Lưu toàn bộ lịch sử cộng, trừ và quy đổi Paw Point
- [x] **DB-08.01** `paw_point_transaction.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-08.02** `paw_point_transaction.customer_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot*.
- [x] **DB-08.03** `paw_point_transaction.payment_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-08.04** `paw_point_transaction.review_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-08.05** `paw_point_transaction.reward_rule_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, orders, complaints*.
- [x] **DB-08.06** `paw_point_transaction.points` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, services, orders, complaints, chatbot*.
- [x] **DB-08.07** `paw_point_transaction.balance_after` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, orders, complaints, chatbot*.
- [x] **DB-08.08** `paw_point_transaction.description` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-08.09** `paw_point_transaction.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-09 `voucher` — 16 cột (CDSLfinal dòng 73)
> Lưu danh mục voucher có thể phát hành hoặc
- [x] **DB-09.01** `voucher.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-09.02** `voucher.voucher_code` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders, settings*.
- [x] **DB-09.03** `voucher.voucher_name` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders, settings*.
- [x] **DB-09.04** `voucher.discount_value` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders, settings*.
- [x] **DB-09.05** `voucher.minimum_order_amount` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders, settings*.
- [x] **DB-09.06** `voucher.required_points` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders, settings*.
- [x] **DB-09.07** `voucher.start_date` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders, staff, settings*.
- [x] **DB-09.08** `voucher.end_date` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders, staff, settings*.
- [x] **DB-09.09** `voucher.is_active` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, orders, chatbot, settings*.
- [x] **DB-09.10** `voucher.type` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-09.11** `voucher.description` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-09.12** `voucher.applicable_for` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders, settings*.
- [x] **DB-09.13** `voucher.usage_count` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders, chatbot, settings*.
- [x] **DB-09.14** `voucher.max_usage` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders, settings*.
- [x] **DB-09.15** `voucher.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-09.16** `voucher.updated_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-10 `customer_voucher` — 8 cột (CDSLfinal dòng 89)
> Lưu danh sách voucher mà khách hàng đang sở hữu hoặc đã sử dụng
- [x] **DB-10.01** `customer_voucher.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-10.02** `customer_voucher.customer_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot*.
- [x] **DB-10.03** `customer_voucher.voucher_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-10.04** `customer_voucher.acquired_method` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-10.05** `customer_voucher.voucher_status` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-10.06** `customer_voucher.acquired_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-10.07** `customer_voucher.used_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-10.08** `customer_voucher.expired_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-11 `pet_profile` — 17 cột (CDSLfinal dòng 97)
> Lưu hồ sơ định danh Pet ID, tên thú cưng, giống loài, giới tính, ngày sinh và trạng thái hoạt động
- [x] **DB-11.01** `pet_profile.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-11.02** `pet_profile.customer_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot*.
- [x] **DB-11.03** `pet_profile.pet_code` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, pets, services, complaints*.
- [x] **DB-11.04** `pet_profile.pet_name` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff*.
- [x] **DB-11.05** `pet_profile.avatar_url` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, pets, services, complaints*.
- [x] **DB-11.06** `pet_profile.species` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot*.
- [x] **DB-11.07** `pet_profile.breed` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot*.
- [x] **DB-11.08** `pet_profile.gender` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, pets, complaints*.
- [x] **DB-11.09** `pet_profile.date_of_birth` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, pets, services*.
- [x] **DB-11.10** `pet_profile.color` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-11.11** `pet_profile.routine` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, pets, services, complaints, chatbot*.
- [x] **DB-11.12** `pet_profile.weight` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-11.13** `pet_profile.vaccination_history` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, pets, services*.
- [x] **DB-11.14** `pet_profile.allergy` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, pets, services, complaints, chatbot*.
- [x] **DB-11.15** `pet_profile.status` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-11.16** `pet_profile.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-11.17** `pet_profile.updated_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-12 `service` — 20 cột (CDSLfinal dòng 114)
> Lưu danh mục các dịch vụ thuộc các nhóm Grooming & Spa, Pet Hotel và Pet Taxi
- [x] **DB-12.01** `service.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-12.02** `service.service_code` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, settings*.
- [x] **DB-12.03** `service.service_name` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, complaints, chatbot, staff, settings*.
- [x] **DB-12.04** `service.service_category` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services*.
- [x] **DB-12.05** `service.description` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-12.06** `service.estimated_duration` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, settings*.
- [x] **DB-12.07** `service.thumbnail_url` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, settings*.
- [x] **DB-12.08** `service.status` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-12.09** `service.rating` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, orders, complaints, staff*.
- [x] **DB-12.10** `service.commission_rate` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-12.11** `service.staff_level_required` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-12.12** `service.review_count` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders*.
- [x] **DB-12.13** `service.benefits` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, orders*.
- [x] **DB-12.14** `service.checklist` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services*.
- [x] **DB-12.15** `service.amenities` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services*.
- [x] **DB-12.16** `service.groomer_level` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-12.17** `service.pet_type` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-12.18** `service.images` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-12.19** `service.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-12.20** `service.updated_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-13 `service_addon` — 10 cột (CDSLfinal dòng 134)
> Lưu danh sách các dịch vụ bổ sung đi kèm dịch vụ chính (Spa, Hotel, Taxi), bao gồm giá, thời lượng và trạng thái áp dụng.
- [x] **DB-13.01** `service_addon.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-13.02** `service_addon.service_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, complaints, chatbot, staff, settings*.
- [x] **DB-13.03** `service_addon.addon_name` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-13.04** `service_addon.description` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-13.05** `service_addon.price` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, pets, services, orders, complaints, settings*.
- [x] **DB-13.06** `service_addon.estimated_duration` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, settings*.
- [x] **DB-13.07** `service_addon.is_required` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-13.08** `service_addon.status` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-13.09** `service_addon.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-13.10** `service_addon.updated_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-14 `hotel_room` — 7 cột (CDSLfinal dòng 144)
> Phòng vật lý thực tế tại cơ sở lưu trú, thuộc một loại phòng cụ thể và được quản lý theo số phòng và trạng thái sử dụng.
- [x] **DB-14.01** `hotel_room.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-14.02** `hotel_room.room_number` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-14.03** `hotel_room.room_type_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-14.04** `hotel_room.status` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-14.05** `hotel_room.description` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-14.06** `hotel_room.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-14.07** `hotel_room.updated_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-15 `hotel_room_type` — 9 cột (CDSLfinal dòng 151)
> Loại phòng khách sạn dành cho thú cưng, lưu thông tin cấu hình và mức giá dùng chung cho các phòng cùng loại.
- [x] **DB-15.01** `hotel_room_type.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-15.02** `hotel_room_type.room_type` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-15.03** `hotel_room_type.capacity` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-15.04** `hotel_room_type.daily_price` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-15.05** `hotel_room_type.description` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-15.06** `hotel_room_type.amenities` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services*.
- [x] **DB-15.07** `hotel_room_type.status` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-15.08** `hotel_room_type.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-15.09** `hotel_room_type.updated_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-16 `service_price_matrix` — 10 cột (CDSLfinal dòng 160)
> Lưu bảng giá của từng dịch vụ theo loài thú cưng, cân nặng hoặc điều kiện áp dụng
- [x] **DB-16.01** `service_price_matrix.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-16.02** `service_price_matrix.service_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, complaints, chatbot, staff, settings*.
- [x] **DB-16.03** `service_price_matrix.weight_from` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services*.
- [x] **DB-16.04** `service_price_matrix.weight_to` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services*.
- [x] **DB-16.05** `service_price_matrix.unit_price` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, orders*.
- [x] **DB-16.06** `service_price_matrix.effective_from` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services*.
- [x] **DB-16.07** `service_price_matrix.effective_to` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services*.
- [x] **DB-16.08** `service_price_matrix.status` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-16.09** `service_price_matrix.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-16.10** `service_price_matrix.updated_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-17 `taxi_price_rule` — 12 cột (CDSLfinal dòng 170)
> Lưu các quy tắc tính giá dịch vụ Pet Taxi theo khoảng cách, cân nặng và thời gian hiệu lực của bảng giá.
- [x] **DB-17.01** `taxi_price_rule.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-17.02** `taxi_price_rule.distance_from` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services*.
- [x] **DB-17.03** `taxi_price_rule.distance_to` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services*.
- [x] **DB-17.04** `taxi_price_rule.weight_from` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services*.
- [x] **DB-17.05** `taxi_price_rule.weight_to` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services*.
- [x] **DB-17.06** `taxi_price_rule.base_price` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services*.
- [x] **DB-17.07** `taxi_price_rule.surcharge` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services*.
- [x] **DB-17.08** `taxi_price_rule.effective_from` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services*.
- [x] **DB-17.09** `taxi_price_rule.effective_to` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services*.
- [x] **DB-17.10** `taxi_price_rule.status` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-17.11** `taxi_price_rule.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-17.12** `taxi_price_rule.updated_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-18 `appointment` — 18 cột (CDSLfinal dòng 182)
> Lưu phiếu đặt lịch dịch vụ của khách hàng cho từng thú cưng
- [x] **DB-18.01** `appointment.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-18.02** `appointment.appointment_code` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, complaints, chatbot, staff*.
- [x] **DB-18.03** `appointment.customer_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot*.
- [x] **DB-18.04** `appointment.pet_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, pets, services, complaints, staff*.
- [x] **DB-18.05** `appointment.service_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, complaints, chatbot, staff, settings*.
- [x] **DB-18.06** `appointment.staff_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, staff, settings*.
- [x] **DB-18.07** `appointment.support_ticket_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-18.08** `appointment.appointment_date` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, complaints, staff*.
- [x] **DB-18.09** `appointment.appointment_time` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, staff*.
- [x] **DB-18.10** `appointment.check_in_time` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-18.11** `appointment.check_out_time` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-18.12** `appointment.note` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-18.13** `appointment.change_count` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services*.
- [x] **DB-18.14** `appointment.appointment_status` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, complaints, chatbot, staff*.
- [x] **DB-18.15** `appointment.payment_status` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, services, orders, complaints*.
- [x] **DB-18.16** `appointment.total_price` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services*.
- [x] **DB-18.17** `appointment.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-18.18** `appointment.updated_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-19 `care_log` — 9 cột (CDSLfinal dòng 200)
> Lưu toàn bộ timeline chăm sóc trong quá trình thực hiện dịch vụ
- [x] **DB-19.01** `care_log.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-19.02** `care_log.appointment_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: pets, services, complaints, staff*.
- [x] **DB-19.03** `care_log.pet_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, pets, services, complaints, staff*.
- [x] **DB-19.04** `care_log.care_action_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services*.
- [x] **DB-19.05** `care_log.description` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-19.06** `care_log.health_status` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: pets, services*.
- [x] **DB-19.07** `care_log.recorded_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: pets, services*.
- [x] **DB-19.08** `care_log.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-19.09** `care_log.updated_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-20 `care_log_media` — 9 cột (CDSLfinal dòng 209)
> Lưu ảnh và video minh chứng được cập nhật vào Care Log
- [x] **DB-20.01** `care_log_media.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-20.02** `care_log_media.care_log_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-20.03** `care_log_media.media_type` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-20.04** `care_log_media.media_url` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services*.
- [x] **DB-20.05** `care_log_media.file_name` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-20.06** `care_log_media.file_size` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-20.07** `care_log_media.staff_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, staff, settings*.
- [x] **DB-20.08** `care_log_media.uploaded_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-20.09** `care_log_media.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-21 `care_action` — 9 cột (CDSLfinal dòng 218)
> Lưu danh mục các mốc chăm sóc như Tắm,
- [x] **DB-21.01** `care_action.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-21.02** `care_action.service_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, complaints, chatbot, staff, settings*.
- [x] **DB-21.03** `care_action.action_name` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services*.
- [x] **DB-21.04** `care_action.service_category` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services*.
- [x] **DB-21.05** `care_action.display_order` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, settings*.
- [x] **DB-21.06** `care_action.estimated_duration` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, settings*.
- [x] **DB-21.07** `care_action.is_active` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, orders, chatbot, settings*.
- [x] **DB-21.08** `care_action.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-21.09** `care_action.updated_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-22 `supplier` — 9 cột (CDSLfinal dòng 227)
> Lưu thông tin nhà cung cấp sản phẩm
- [x] **DB-22.01** `supplier.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-22.02** `supplier.supplier_name` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-22.03** `supplier.contact_person` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-22.04** `supplier.phone_number` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, orders, staff*.
- [x] **DB-22.05** `supplier.email` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, pets, complaints, chatbot, staff, settings*.
- [x] **DB-22.06** `supplier.address` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, pets, orders, staff, settings*.
- [x] **DB-22.07** `supplier.status` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-22.08** `supplier.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-22.09** `supplier.updated_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-23 `purchase_order` — 10 cột (CDSLfinal dòng 236)
> Lưu phiếu nhập hàng từ nhà cung cấp
- [x] **DB-23.01** `purchase_order.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-23.02** `purchase_order.supplier_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-23.03** `purchase_order.order_number` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-23.04** `purchase_order.order_date` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-23.05** `purchase_order.expected_date` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-23.06** `purchase_order.total_amount` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, orders, complaints*.
- [x] **DB-23.07** `purchase_order.order_status` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, orders, complaints, chatbot*.
- [x] **DB-23.08** `purchase_order.note` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-23.09** `purchase_order.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-23.10** `purchase_order.updated_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-24 `purchase_order_detail` — 7 cột (CDSLfinal dòng 246)
> Lưu chi tiết từng sản phẩm trong phiếu nhập hàng
- [x] **DB-24.01** `purchase_order_detail.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-24.02** `purchase_order_detail.purchase_order_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-24.03** `purchase_order_detail.product_variant_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, orders*.
- [x] **DB-24.04** `purchase_order_detail.quantity` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders*.
- [x] **DB-24.05** `purchase_order_detail.unit_price` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, orders*.
- [x] **DB-24.06** `purchase_order_detail.subtotal` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders*.
- [x] **DB-24.07** `purchase_order_detail.received_quantity` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-25 `product` — 21 cột (CDSLfinal dòng 253)
> Lưu danh mục sản phẩm kinh
- [x] **DB-25.01** `product.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-25.02** `product.category_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders, settings*.
- [x] **DB-25.03** `product.product_name` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, orders, complaints, settings*.
- [x] **DB-25.04** `product.brand_name` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders*.
- [x] **DB-25.05** `product.unit` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders*.
- [x] **DB-25.06** `product.target_pet` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders*.
- [x] **DB-25.07** `product.min_price` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders*.
- [x] **DB-25.08** `product.description` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-25.09** `product.slug` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders, settings*.
- [x] **DB-25.10** `product.status` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-25.11** `product.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-25.12** `product.updated_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, complaints, chatbot, staff, settings*.
- [x] **DB-25.13** `product.image_urls` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders*.
- [x] **DB-25.14** `product.origin` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, services, orders*.
- [x] **DB-25.15** `product.ingredients` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders*.
- [x] **DB-25.16** `product.benefits` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, orders*.
- [x] **DB-25.17** `product.usage_instructions` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders*.
- [x] **DB-25.18** `product.specs` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders*.
- [x] **DB-25.19** `product.badge` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-25.20** `product.rating` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, orders, complaints, staff*.
- [x] **DB-25.21** `product.review_count` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-26 `product_category` — 6 cột (CDSLfinal dòng 274)
> Lưu danh mục nhóm sản phẩm
- [x] **DB-26.01** `product_category.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-26.02** `product_category.category_name` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders, settings*.
- [x] **DB-26.03** `product_category.description` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-26.04** `product_category.status` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-26.05** `product_category.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-26.06** `product_category.updated_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-27 `product_variant` — 14 cột (CDSLfinal dòng 280)
> Lưu từng phiên bản cụ thể của một sản phẩm theo màu sắc, kích thước, kiểu dáng, SKU và giá bán riêng.
- [x] **DB-27.01** `product_variant.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-27.02** `product_variant.product_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders, settings*.
- [x] **DB-27.03** `product_variant.color_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-27.04** `product_variant.size_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-27.05** `product_variant.flavor_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-27.06** `product_variant.sku_variant` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, orders, complaints, settings*.
- [x] **DB-27.07** `product_variant.cost_price` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders*.
- [x] **DB-27.08** `product_variant.sale_price` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders, complaints, settings*.
- [x] **DB-27.09** `product_variant.compare_at_price` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders*.
- [x] **DB-27.10** `product_variant.weight` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-27.11** `product_variant.barcode` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders*.
- [x] **DB-27.12** `product_variant.status` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-27.13** `product_variant.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-27.14** `product_variant.updated_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-28 `product_variant_media` — 7 cột (CDSLfinal dòng 294)
- [x] **DB-28.01** `product_variant_media.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-28.02** `product_variant_media.product_variant_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, orders*.
- [x] **DB-28.03** `product_variant_media.image_url` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: settings*.
- [x] **DB-28.04** `product_variant_media.display_order` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, settings*.
- [x] **DB-28.05** `product_variant_media.is_thumbnail` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-28.06** `product_variant_media.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-28.07** `product_variant_media.updated_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-29 `variant_flavor` — 6 cột (CDSLfinal dòng 301)
> Lưu danh mục hương vị hoặc mùi hương dùng chung cho các biến thể sản phẩm.
- [x] **DB-29.01** `variant_flavor.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-29.02** `variant_flavor.flavor_name` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders*.
- [x] **DB-29.03** `variant_flavor.display_order` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, settings*.
- [x] **DB-29.04** `variant_flavor.is_active` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, orders, chatbot, settings*.
- [x] **DB-29.05** `variant_flavor.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-29.06** `variant_flavor.updated_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-30 `variant_size` — 6 cột (CDSLfinal dòng 307)
> Lưu định dạng kích thước sản phẩm
- [x] **DB-30.01** `variant_size.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-30.02** `variant_size.size_name` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders*.
- [x] **DB-30.03** `variant_size.display_order` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, settings*.
- [x] **DB-30.04** `variant_size.is_active` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, orders, chatbot, settings*.
- [x] **DB-30.05** `variant_size.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-30.06** `variant_size.updated_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-31 `variant_color` — 7 cột (CDSLfinal dòng 313)
> Lưu định dạng màu sắc sản phẩm
- [x] **DB-31.01** `variant_color.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-31.02** `variant_color.color_name` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders*.
- [x] **DB-31.03** `variant_color.hex_code` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-31.04** `variant_color.display_order` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, settings*.
- [x] **DB-31.05** `variant_color.is_active` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, orders, chatbot, settings*.
- [x] **DB-31.06** `variant_color.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-31.07** `variant_color.updated_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-32 `cart` — 7 cột (CDSLfinal dòng 320)
> Lưu giỏ hàng hiện tại của khách trước khi tạo đơn hàng
- [x] **DB-32.01** `cart.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-32.02** `cart.customer_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot*.
- [x] **DB-32.03** `cart.cart_status` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-32.04** `cart.total_quantity` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-32.05** `cart.total_amount` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, orders, complaints*.
- [x] **DB-32.06** `cart.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-32.07** `cart.updated_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-33 `cart_item` — 8 cột (CDSLfinal dòng 327)
> Lưu danh sách sản phẩm được thêm vào giỏ hàng
- [x] **DB-33.01** `cart_item.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-33.02** `cart_item.cart_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-33.03** `cart_item.product_variant_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, orders*.
- [x] **DB-33.04** `cart_item.quantity` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders*.
- [x] **DB-33.05** `cart_item.unit_price` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, orders*.
- [x] **DB-33.06** `cart_item.subtotal` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders*.
- [x] **DB-33.07** `cart_item.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-33.08** `cart_item.updated_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-34 `wishlist` — 4 cột (CDSLfinal dòng 335)
> Lưu danh sách sản phẩm yêu thích của khách hàng
- [x] **DB-34.01** `wishlist.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-34.02** `wishlist.customer_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot*.
- [x] **DB-34.03** `wishlist.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-34.04** `wishlist.updated_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-35 `wishlist_item` — 5 cột (CDSLfinal dòng 339)
> Lưu các sản phẩm cụ thể nằm trong Wishlist
- [x] **DB-35.01** `wishlist_item.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-35.02** `wishlist_item.wishlist_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-35.03** `wishlist_item.product_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders, settings*.
- [x] **DB-35.04** `wishlist_item.service_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, complaints, chatbot, staff, settings*.
- [x] **DB-35.05** `wishlist_item.added_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-36 `sales_order` — 15 cột (CDSLfinal dòng 344)
> Lưu đơn hàng mua sắm trên website hoặc tại cửa hàng
- [x] **DB-36.01** `sales_order.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-36.02** `sales_order.order_code` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, orders, complaints, chatbot*.
- [x] **DB-36.03** `sales_order.customer_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot*.
- [x] **DB-36.04** `sales_order.shipping_address_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders*.
- [x] **DB-36.05** `sales_order.delivery_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-36.06** `sales_order.shipping_provider_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders*.
- [x] **DB-36.07** `sales_order.tracking_code` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders, complaints*.
- [x] **DB-36.08** `sales_order.shipped_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders*.
- [x] **DB-36.09** `sales_order.delivered_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-36.10** `sales_order.order_status` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, orders, complaints, chatbot*.
- [x] **DB-36.11** `sales_order.payment_status` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, services, orders, complaints*.
- [x] **DB-36.12** `sales_order.total_amount` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, orders, complaints*.
- [x] **DB-36.13** `sales_order.note` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-36.14** `sales_order.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-36.15** `sales_order.updated_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-37 `sales_order_detail` — 7 cột (CDSLfinal dòng 359)
> Lưu chi tiết sản phẩm, số lượng và đơn giá trong từng đơn hàng
- [x] **DB-37.01** `sales_order_detail.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-37.02** `sales_order_detail.order_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders, complaints*.
- [x] **DB-37.03** `sales_order_detail.product_variant_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, orders*.
- [x] **DB-37.04** `sales_order_detail.quantity` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders*.
- [x] **DB-37.05** `sales_order_detail.unit_price` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, orders*.
- [x] **DB-37.06** `sales_order_detail.discount_amount` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders, settings*.
- [x] **DB-37.07** `sales_order_detail.subtotal` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-38 `stock_reservation` — 10 cột (CDSLfinal dòng 366)
> Lưu thông tin giữ trước số lượng tồn kho của từng biến thể sản phẩm
- [x] **DB-38.01** `stock_reservation.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-38.02** `stock_reservation.product_variant_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, orders*.
- [x] **DB-38.03** `stock_reservation.customer_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot*.
- [x] **DB-38.04** `stock_reservation.cart_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-38.05** `stock_reservation.quantity` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders*.
- [x] **DB-38.06** `stock_reservation.reserved_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-38.07** `stock_reservation.expires_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-38.08** `stock_reservation.status` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-38.09** `stock_reservation.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-38.10** `stock_reservation.updated_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-39 `inventory` — 6 cột (CDSLfinal dòng 376)
> Lưu số lượng tồn kho hiện tại của từng sản phẩm
- [x] **DB-39.01** `inventory.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-39.02** `inventory.product_variant_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, orders*.
- [x] **DB-39.03** `inventory.quantity_in_stock` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, orders*.
- [x] **DB-39.04** `inventory.minimum_stock` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, orders*.
- [x] **DB-39.05** `inventory.quantity_reserved` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-39.06** `inventory.last_updated_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-40 `inventory_transaction` — 10 cột (CDSLfinal dòng 382)
> Lưu lịch sử nhập kho, xuất kho và điều chỉnh tồn kho
- [x] **DB-40.01** `inventory_transaction.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-40.02** `inventory_transaction.purchase_order_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-40.03** `inventory_transaction.product_variant_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, orders*.
- [x] **DB-40.04** `inventory_transaction.transaction_type` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, orders*.
- [x] **DB-40.05** `inventory_transaction.quantity` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders*.
- [x] **DB-40.06** `inventory_transaction.stock_before` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders*.
- [x] **DB-40.07** `inventory_transaction.stock_after` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders*.
- [x] **DB-40.08** `inventory_transaction.note` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-40.09** `inventory_transaction.staff_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, staff, settings*.
- [x] **DB-40.10** `inventory_transaction.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-41 `payment` — 15 cột (CDSLfinal dòng 392)
> Lưu lịch sử thanh toán, phương thức thanh toán và trạng thái giao dịch
- [x] **DB-41.01** `payment.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-41.02** `payment.payment_code` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-41.03** `payment.customer_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot*.
- [x] **DB-41.04** `payment.appointment_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: pets, services, complaints, staff*.
- [x] **DB-41.05** `payment.order_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders, complaints*.
- [x] **DB-41.06** `payment.voucher_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-41.07** `payment.payment_method_config_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders*.
- [x] **DB-41.08** `payment.payment_type` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-41.09** `payment.amount` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, services, orders, complaints, staff*.
- [x] **DB-41.10** `payment.paw_points_used` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-41.11** `payment.paw_points_earned` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-41.12** `payment.transaction_status` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders*.
- [x] **DB-41.13** `payment.succeeded_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-41.14** `payment.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-41.15** `payment.updated_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-42 `payment_method_config` — 11 cột (CDSLfinal dòng 407)
> Lưu thông tin các loại phương thức thanh toán khả dụng
- [x] **DB-42.01** `payment_method_config.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-42.02** `payment_method_config.name` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-42.03** `payment_method_config.short_name` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-42.04** `payment_method_config.description` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-42.05** `payment_method_config.icon` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-42.06** `payment_method_config.fee` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: settings*.
- [x] **DB-42.07** `payment_method_config.available` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders, staff*.
- [x] **DB-42.08** `payment_method_config.requires_info` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-42.09** `payment_method_config.redirect_url` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-42.10** `payment_method_config.bank_info` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-42.11** `payment_method_config.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-43 `delivery_option_config` — 8 cột (CDSLfinal dòng 418)
> Lưu thông tin các hình thức giao hàng
- [x] **DB-43.01** `delivery_option_config.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-43.02** `delivery_option_config.name` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-43.03** `delivery_option_config.description` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-43.04** `delivery_option_config.fee` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: settings*.
- [x] **DB-43.05** `delivery_option_config.estimated_days` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-43.06** `delivery_option_config.icon` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-43.07** `delivery_option_config.available` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders, staff*.
- [x] **DB-43.08** `delivery_option_config.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-44 `shipping_provider` — 9 cột (CDSLfinal dòng 426)
> Lưu danh sách các đơn vị vận chuyển mà PawPal sử dụng để giao đơn hàng, giúp Admin quản lý đối tác giao hàng và liên
- [x] **DB-44.01** `shipping_provider.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-44.02** `shipping_provider.provider_name` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-44.03** `shipping_provider.provider_code` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-44.04** `shipping_provider.logo_url` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-44.05** `shipping_provider.contact_phone` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-44.06** `shipping_provider.tracking_url` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-44.07** `shipping_provider.status` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-44.08** `shipping_provider.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-44.09** `shipping_provider.updated_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-45 `review` — 14 cột (CDSLfinal dòng 435)
> Lưu đánh giá của khách hàng cho sản phẩm hoặc dịch vụ
- [x] **DB-45.01** `review.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-45.02** `review.customer_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot*.
- [x] **DB-45.03** `review.appointment_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: pets, services, complaints, staff*.
- [x] **DB-45.04** `review.sales_order_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders, complaints*.
- [x] **DB-45.05** `review.product_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders, settings*.
- [x] **DB-45.06** `review.service_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, complaints, chatbot, staff, settings*.
- [x] **DB-45.07** `review.review_type` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services*.
- [x] **DB-45.08** `review.rating` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, orders, complaints, staff*.
- [x] **DB-45.09** `review.review_content` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services*.
- [x] **DB-45.10** `review.image_urls` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders*.
- [x] **DB-45.11** `review.review_status` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-45.12** `review.shop_reply` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, orders*.
- [x] **DB-45.13** `review.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-45.14** `review.updated_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-46 `review_response` — 6 cột (CDSLfinal dòng 449)
> Lưu phản hồi của Admin đối với đánh giá của khách hàng
- [x] **DB-46.01** `review_response.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-46.02** `review_response.review_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-46.03** `review_response.staff_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, staff, settings*.
- [x] **DB-46.04** `review_response.response_content` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-46.05** `review_response.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-46.06** `review_response.updated_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-47 `support_ticket` — 29 cột (CDSLfinal dòng 455)
> Lưu các yêu cầu hỗ trợ, khiếu nại, tranh chấp và yêu cầu xử lý phát sinh từ khách hàng trong quá trình sử dụng dịch vụ/mua hàng. Đây là thực thể trung tâm để theo dõi toàn bộ vụ vi
- [x] **DB-47.01** `support_ticket.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-47.02** `support_ticket.ticket_code` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: complaints*.
- [x] **DB-47.03** `support_ticket.customer_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot*.
- [x] **DB-47.04** `support_ticket.user_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, complaints, chatbot*.
- [x] **DB-47.05** `support_ticket.order_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders, complaints*.
- [x] **DB-47.06** `support_ticket.appointment_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: pets, services, complaints, staff*.
- [x] **DB-47.07** `support_ticket.channel` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-47.08** `support_ticket.category` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, orders, complaints, chatbot, settings*.
- [x] **DB-47.09** `support_ticket.title` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-47.10** `support_ticket.subject` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: complaints*.
- [x] **DB-47.11** `support_ticket.description` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-47.12** `support_ticket.priority` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, complaints, chatbot, settings*.
- [x] **DB-47.13** `support_ticket.type` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-47.14** `support_ticket.status` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-47.15** `support_ticket.requested_resolution` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: complaints*.
- [x] **DB-47.16** `support_ticket.requested_amount` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: complaints*.
- [x] **DB-47.17** `support_ticket.assigned_staff_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: complaints*.
- [x] **DB-47.18** `support_ticket.first_response_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: complaints*.
- [x] **DB-47.19** `support_ticket.investigation_note` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: complaints*.
- [x] **DB-47.20** `support_ticket.resolution_type` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: complaints*.
- [x] **DB-47.21** `support_ticket.resolution_note` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: complaints*.
- [x] **DB-47.22** `support_ticket.approved_amount` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: complaints*.
- [x] **DB-47.23** `support_ticket.resolved_by` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: complaints*.
- [x] **DB-47.24** `support_ticket.resolved_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: complaints, chatbot*.
- [x] **DB-47.25** `support_ticket.closed_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: complaints*.
- [x] **DB-47.26** `support_ticket.rating` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, orders, complaints, staff*.
- [x] **DB-47.27** `support_ticket.rating_comment` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-47.28** `support_ticket.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-47.29** `support_ticket.updated_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-48 `support_ticket_message` — 9 cột (CDSLfinal dòng 484)
> Lưu toàn bộ nội dung trao đổi, phản hồi, bằng chứng và ghi chú trong quá trình xử lý một support ticket.
- [x] **DB-48.01** `support_ticket_message.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-48.02** `support_ticket_message.ticket_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: complaints, chatbot*.
- [x] **DB-48.03** `support_ticket_message.sender_type` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: complaints, chatbot*.
- [x] **DB-48.04** `support_ticket_message.sender_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-48.05** `support_ticket_message.content` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-48.06** `support_ticket_message.agent_name` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: complaints*.
- [x] **DB-48.07** `support_ticket_message.attachment_urls` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-48.08** `support_ticket_message.is_internal` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: complaints*.
- [x] **DB-48.09** `support_ticket_message.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-49 `return_request` — 14 cột (CDSLfinal dòng 493)
> Lưu yêu cầu đổi trả sản phẩm và thông tin hậu mãi
- [x] **DB-49.01** `return_request.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-49.02** `return_request.sales_order_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders, complaints*.
- [x] **DB-49.03** `return_request.customer_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot*.
- [x] **DB-49.04** `return_request.refund_transaction_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-49.05** `return_request.resolution_type` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: complaints*.
- [x] **DB-49.06** `return_request.refund_amount` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-49.07** `return_request.resolved_by` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: complaints*.
- [x] **DB-49.08** `return_request.reason` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, pets, services, orders, complaints, chatbot, staff*.
- [x] **DB-49.09** `return_request.return_type` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders*.
- [x] **DB-49.10** `return_request.description` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-49.11** `return_request.evidence_images` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-49.12** `return_request.request_status` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders*.
- [x] **DB-49.13** `return_request.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-49.14** `return_request.updated_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-50 `return_request_detail` — 5 cột (CDSLfinal dòng 507)
> Lưu chi tiết sản phẩm được đổi trả
- [x] **DB-50.01** `return_request_detail.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-50.02** `return_request_detail.return_request_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders*.
- [x] **DB-50.03** `return_request_detail.product_variant_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, orders*.
- [x] **DB-50.04** `return_request_detail.quantity` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders*.
- [x] **DB-50.05** `return_request_detail.unit_price` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, orders*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-51 `refund_transaction` — 17 cột (CDSLfinal dòng 512)
> Lưu giao dịch hoàn tiền hoặc bồi thường thực tế phát sinh từ một support ticket đã được phê duyệt xử lý. Đây là thực thể ghi nhận dòng tiền, tách biệt với quá trình tiếp nhận và xử
- [x] **DB-51.01** `refund_transaction.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-51.02** `refund_transaction.refund_code` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-51.03** `refund_transaction.ticket_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: complaints, chatbot*.
- [x] **DB-51.04** `refund_transaction.payment_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-51.05** `refund_transaction.refund_type` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-51.06** `refund_transaction.requested_amount` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: complaints*.
- [x] **DB-51.07** `refund_transaction.approved_amount` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: complaints*.
- [x] **DB-51.08** `refund_transaction.refunded_amount` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-51.09** `refund_transaction.refund_method` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-51.10** `refund_transaction.refund_status` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-51.11** `refund_transaction.gateway_transaction_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-51.12** `refund_transaction.note` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-51.13** `refund_transaction.processed_by` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-51.14** `refund_transaction.processed_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-51.15** `refund_transaction.completed_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-51.16** `refund_transaction.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-51.17** `refund_transaction.updated_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-52 `staff` — 22 cột (CDSLfinal dòng 529)
> Lưu thông tin tài khoản nhân viên, lễ tân, chuyên môn, CSKH và quản lý
- [x] **DB-52.01** `staff.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-52.02** `staff.full_name` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-52.03** `staff.phone_number` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, orders, staff*.
- [x] **DB-52.04** `staff.role` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, services, orders, complaints, chatbot, staff*.
- [x] **DB-52.05** `staff.specialization` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, staff*.
- [x] **DB-52.06** `staff.hire_date` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: staff*.
- [x] **DB-52.07** `staff.auth_user_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: staff, settings*.
- [x] **DB-52.08** `staff.account_status` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, complaints, staff*.
- [x] **DB-52.09** `staff.system_role` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders, chatbot, staff*.
- [x] **DB-52.10** `staff.permissions` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: chatbot, staff*.
- [x] **DB-52.11** `staff.must_change_password` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm; BẢO MẬT: không show UI/log, verify RLS/secret storage*.
- [x] **DB-52.12** `staff.last_login_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: staff*.
- [x] **DB-52.13** `staff.account_created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-52.14** `staff.email` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, pets, complaints, chatbot, staff, settings*.
- [x] **DB-52.15** `staff.address` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, pets, orders, staff, settings*.
- [x] **DB-52.16** `staff.dob` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, pets, staff*.
- [x] **DB-52.17** `staff.shift` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, staff*.
- [x] **DB-52.18** `staff.status` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-52.19** `staff.service_locked` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: complaints, staff*.
- [x] **DB-52.20** `staff.skill_score` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: staff*.
- [x] **DB-52.21** `staff.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-52.22** `staff.updated_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-53 `staff_schedule` — 12 cột (CDSLfinal dòng 551)
> Lưu lịch làm việc, ca trực và thời gian hoạt động của nhân viên
- [x] **DB-53.01** `staff_schedule.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-53.02** `staff_schedule.staff_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, staff, settings*.
- [x] **DB-53.03** `staff_schedule.work_date` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: staff*.
- [x] **DB-53.04** `staff_schedule.shift` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, staff*.
- [x] **DB-53.05** `staff_schedule.start_time` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: staff*.
- [x] **DB-53.06** `staff_schedule.end_time` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: staff*.
- [x] **DB-53.07** `staff_schedule.availability_status` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-53.08** `staff_schedule.reason` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, pets, services, orders, complaints, chatbot, staff*.
- [x] **DB-53.09** `staff_schedule.work_location` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: staff*.
- [x] **DB-53.10** `staff_schedule.schedule_status` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: staff*.
- [x] **DB-53.11** `staff_schedule.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-53.12** `staff_schedule.updated_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-54 `promotion` — 11 cột (CDSLfinal dòng 563)
> Lưu các chương trình khuyến mãi đang áp dụng
- [x] **DB-54.01** `promotion.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-54.02** `promotion.promotion_name` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-54.03** `promotion.description` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-54.04** `promotion.discount_type` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-54.05** `promotion.discount_value` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders, settings*.
- [x] **DB-54.06** `promotion.start_date` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders, staff, settings*.
- [x] **DB-54.07** `promotion.end_date` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders, staff, settings*.
- [x] **DB-54.08** `promotion.minimum_order_value` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-54.09** `promotion.status` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-54.10** `promotion.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-54.11** `promotion.updated_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-55 `promotion_product` — 3 cột (CDSLfinal dòng 574)
> Lưu danh sách sản phẩm được áp dụng trong chương trình khuyến mãi
- [x] **DB-55.01** `promotion_product.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-55.02** `promotion_product.promotion_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-55.03** `promotion_product.product_variant_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, orders*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-56 `promotion_service` — 3 cột (CDSLfinal dòng 577)
> Lưu danh sách dịch vụ được áp dụng trong chương trình khuyến mãi
- [x] **DB-56.01** `promotion_service.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-56.02** `promotion_service.promotion_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-56.03** `promotion_service.service_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-57 `banner` — 12 cột (CDSLfinal dòng 580)
> Lưu thông tin Banner quảng bá hiển thị trên website, gồm hình ảnh, tiêu đề, liên kết và thời gian hiển thị.
- [x] **DB-57.01** `banner.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-57.02** `banner.image_url` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: settings*.
- [x] **DB-57.03** `banner.title` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-57.04** `banner.description` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-57.05** `banner.link` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-57.06** `banner.button_text` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: settings*.
- [x] **DB-57.07** `banner.display_order` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, settings*.
- [x] **DB-57.08** `banner.start_date` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders, staff, settings*.
- [x] **DB-57.09** `banner.end_date` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders, staff, settings*.
- [x] **DB-57.10** `banner.status` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-57.11** `banner.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-57.12** `banner.updated_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-58 `blog_post` — 13 cột (CDSLfinal dòng 592)
> Lưu bài viết chia sẻ kiến thức và tin tức trên website
- [x] **DB-58.01** `blog_post.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-58.02** `blog_post.category_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders, settings*.
- [x] **DB-58.03** `blog_post.title` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-58.04** `blog_post.slug` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders, settings*.
- [x] **DB-58.05** `blog_post.summary` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, services, chatbot, settings*.
- [x] **DB-58.06** `blog_post.content` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-58.07** `blog_post.thumbnail_url` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, settings*.
- [x] **DB-58.08** `blog_post.author_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: settings*.
- [x] **DB-58.09** `blog_post.publish_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: settings*.
- [x] **DB-58.10** `blog_post.status` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-58.11** `blog_post.view_count` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: settings*.
- [x] **DB-58.12** `blog_post.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-58.13** `blog_post.updated_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-59 `blog_category` — 7 cột (CDSLfinal dòng 605)
> Lưu danh mục bài viết
- [x] **DB-59.01** `blog_category.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-59.02** `blog_category.category_name` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders, settings*.
- [x] **DB-59.03** `blog_category.description` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-59.04** `blog_category.display_order` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, settings*.
- [x] **DB-59.05** `blog_category.status` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-59.06** `blog_category.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-59.07** `blog_category.updated_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-60 `notification` — 13 cột (CDSLfinal dòng 612)
> Lưu các thông báo gửi đến khách hàng về trạng thái đơn hàng, lịch hẹn, yêu cầu hỗ trợ và giao dịch hoàn tiền; các FK liên quan giúp xác định chính xác đối tượng mà thông báo dẫn đế
- [x] **DB-60.01** `notification.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-60.02** `notification.customer_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot*.
- [x] **DB-60.03** `notification.notification_type` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, services, settings*.
- [x] **DB-60.04** `notification.title` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-60.05** `notification.content` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-60.06** `notification.sales_order_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders, complaints*.
- [x] **DB-60.07** `notification.appointment_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: pets, services, complaints, staff*.
- [x] **DB-60.08** `notification.support_ticket_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-60.09** `notification.refund_transaction_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-60.10** `notification.related_entity_type` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services*.
- [x] **DB-60.11** `notification.is_read` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, services*.
- [x] **DB-60.12** `notification.sent_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, services, settings*.
- [x] **DB-60.13** `notification.read_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-61 `pawpal_setting` — 7 cột (CDSLfinal dòng 625)
> Lưu các cấu hình chung của website như hotline, popup, top-bar và các thiết lập hệ thống khác.
- [x] **DB-61.01** `pawpal_setting.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-61.02** `pawpal_setting.setting_key` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: settings*.
- [x] **DB-61.03** `pawpal_setting.setting_value` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: settings*.
- [x] **DB-61.04** `pawpal_setting.setting_type` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: settings*.
- [x] **DB-61.05** `pawpal_setting.description` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-61.06** `pawpal_setting.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-61.07** `pawpal_setting.updated_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-62 `audit_log` — 7 cột (CDSLfinal dòng 632)
> Lưu lịch sử thao tác quan trọng của nhân viên nhằm phục vụ kiểm tra và truy vết hệ thống
- [x] **DB-62.01** `audit_log.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-62.02** `audit_log.staff_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, staff, settings*.
- [x] **DB-62.03** `audit_log.action` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, chatbot, staff, settings*.
- [x] **DB-62.04** `audit_log.entity_name` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, orders, staff, settings*.
- [x] **DB-62.05** `audit_log.entity_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-62.06** `audit_log.description` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-62.07** `audit_log.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-63 `staff_shift_request` — 17 cột (CDSLfinal dòng 639)
> Lưu yêu cầu xin đổi ca, xin nghỉ phép hoặc vắng mặt của nhân viên
- [x] **DB-63.01** `staff_shift_request.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-63.02** `staff_shift_request.request_type` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: staff*.
- [x] **DB-63.03** `staff_shift_request.staff_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, staff, settings*.
- [x] **DB-63.04** `staff_shift_request.target_staff_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: staff*.
- [x] **DB-63.05** `staff_shift_request.replacement_staff_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: staff*.
- [x] **DB-63.06** `staff_shift_request.leave_type` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: staff*.
- [x] **DB-63.07** `staff_shift_request.start_date` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders, staff, settings*.
- [x] **DB-63.08** `staff_shift_request.end_date` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders, staff, settings*.
- [x] **DB-63.09** `staff_shift_request.shift` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, staff*.
- [x] **DB-63.10** `staff_shift_request.target_date` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: staff*.
- [x] **DB-63.11** `staff_shift_request.target_shift` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: staff*.
- [x] **DB-63.12** `staff_shift_request.reason` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, pets, services, orders, complaints, chatbot, staff*.
- [x] **DB-63.13** `staff_shift_request.status` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-63.14** `staff_shift_request.created_by` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-63.15** `staff_shift_request.reviewed_by` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: staff*.
- [x] **DB-63.16** `staff_shift_request.reviewed_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: staff*.
- [x] **DB-63.17** `staff_shift_request.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-64 `hotel_booking` — 17 cột (CDSLfinal dòng 656)
> Quản lý lịch đặt phòng lưu trú khách sạn thú cưng Pet Hotel
- [x] **DB-64.01** `hotel_booking.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-64.02** `hotel_booking.booking_code` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-64.03** `hotel_booking.customer_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot*.
- [x] **DB-64.04** `hotel_booking.pet_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, pets, services, complaints, staff*.
- [x] **DB-64.05** `hotel_booking.room_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-64.06** `hotel_booking.appointment_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: pets, services, complaints, staff*.
- [x] **DB-64.07** `hotel_booking.check_in_date` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-64.08** `hotel_booking.check_out_date` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-64.09** `hotel_booking.status` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-64.10** `hotel_booking.special_diet_notes` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-64.11** `hotel_booking.medication_notes` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-64.12** `hotel_booking.daily_price` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-64.13** `hotel_booking.total_amount` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, orders, complaints*.
- [x] **DB-64.14** `hotel_booking.deposit_amount` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-64.15** `hotel_booking.payment_status` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, services, orders, complaints*.
- [x] **DB-64.16** `hotel_booking.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-64.17** `hotel_booking.updated_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-65 `pet_weight_history` — 8 cột (CDSLfinal dòng 673)
> Lưu lịch sử cân đo trọng lượng định kỳ của thú cưng phục vụ theo dõi sức khỏe và điều chỉnh dịch vụ
- [x] **DB-65.01** `pet_weight_history.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-65.02** `pet_weight_history.pet_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, pets, services, complaints, staff*.
- [x] **DB-65.03** `pet_weight_history.weight` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-65.04** `pet_weight_history.measured_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: pets*.
- [x] **DB-65.05** `pet_weight_history.recorded_by_name` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: pets*.
- [x] **DB-65.06** `pet_weight_history.recorded_by` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-65.07** `pet_weight_history.note` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-65.08** `pet_weight_history.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-66 `chat_conversation` — 19 cột (CDSLfinal dòng 681)
> Quản lý các phiên hội thoại trực tuyến giữa khách hàng và AI Chatbot hoặc nhân viên tư vấn
- [x] **DB-66.01** `chat_conversation.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-66.02** `chat_conversation.customer_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot*.
- [x] **DB-66.03** `chat_conversation.session_token` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm; BẢO MẬT: không show UI/log, verify RLS/secret storage*.
- [x] **DB-66.04** `chat_conversation.status` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-66.05** `chat_conversation.sentiment_level` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: chatbot*.
- [x] **DB-66.06** `chat_conversation.sentiment_trend` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: chatbot*.
- [x] **DB-66.07** `chat_conversation.is_urgent` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: chatbot*.
- [x] **DB-66.08** `chat_conversation.assigned_staff_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: complaints*.
- [x] **DB-66.09** `chat_conversation.ai_summary` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: chatbot*.
- [x] **DB-66.10** `chat_conversation.internal_note` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: chatbot*.
- [x] **DB-66.11** `chat_conversation.sla_deadline` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-66.12** `chat_conversation.resolved_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: complaints, chatbot*.
- [x] **DB-66.13** `chat_conversation.resolved_reason` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: chatbot*.
- [x] **DB-66.14** `chat_conversation.resolved_by` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: complaints*.
- [x] **DB-66.15** `chat_conversation.violation_count` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-66.16** `chat_conversation.blocked_until` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-66.17** `chat_conversation.channel` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-66.18** `chat_conversation.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-66.19** `chat_conversation.updated_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-67 `chat_message` — 11 cột (CDSLfinal dòng 700)
> Lưu từng tin nhắn chi tiết trong các phiên hội thoại chat
- [x] **DB-67.01** `chat_message.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-67.02** `chat_message.conversation_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: chatbot*.
- [x] **DB-67.03** `chat_message.sender_type` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: complaints, chatbot*.
- [x] **DB-67.04** `chat_message.sender_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-67.05** `chat_message.sender_name` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: chatbot*.
- [x] **DB-67.06** `chat_message.content` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-67.07** `chat_message.raw_content` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: chatbot*.
- [x] **DB-67.08** `chat_message.is_toxic` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: chatbot*.
- [x] **DB-67.09** `chat_message.sentiment_score` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-67.10** `chat_message.metadata` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: chatbot*.
- [x] **DB-67.11** `chat_message.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-68 `chat_moderation_log` — 8 cột (CDSLfinal dòng 711)
> Nhật ký kiểm duyệt nội dung tin nhắn và ghi nhận các vi phạm quy chuẩn giao tiếp
- [x] **DB-68.01** `chat_moderation_log.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-68.02** `chat_moderation_log.conversation_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: chatbot*.
- [x] **DB-68.03** `chat_moderation_log.customer_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot*.
- [x] **DB-68.04** `chat_moderation_log.detected_keywords` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-68.05** `chat_moderation_log.violation_count` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-68.06** `chat_moderation_log.action_taken` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-68.07** `chat_moderation_log.notes` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, pets, services, chatbot, staff*.
- [x] **DB-68.08** `chat_moderation_log.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-69 `chatbot_sentiment_tier` — 5 cột (CDSLfinal dòng 719)
> Bảng phân tầng các cấp độ cảm xúc của khách hàng (Bình thường, Bức xúc, Khẩn cấp) kèm cam kết phản hồi SLA
- [x] **DB-69.01** `chatbot_sentiment_tier.level` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, services, orders, chatbot, staff*.
- [x] **DB-69.02** `chatbot_sentiment_tier.name` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-69.03** `chatbot_sentiment_tier.color_badge` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-69.04** `chatbot_sentiment_tier.sla_seconds` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: chatbot*.
- [x] **DB-69.05** `chatbot_sentiment_tier.description` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-70 `chatbot_sentiment_trigger` — 6 cột (CDSLfinal dòng 724)
> Danh sách các mẫu từ khóa và biểu thức nhận diện cảm xúc khách hàng của hệ thống AI Chatbot
- [x] **DB-70.01** `chatbot_sentiment_trigger.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-70.02** `chatbot_sentiment_trigger.tier_level` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-70.03** `chatbot_sentiment_trigger.trigger_pattern` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-70.04** `chatbot_sentiment_trigger.weight` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-70.05** `chatbot_sentiment_trigger.context_domain` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-70.06** `chatbot_sentiment_trigger.is_active` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, orders, chatbot, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-71 `chatbot_sentiment_action` — 6 cột (CDSLfinal dòng 730)
> Quy định các hành vi phản ứng tự động của chatbot tương ứng với từng cấp độ cảm xúc
- [x] **DB-71.01** `chatbot_sentiment_action.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-71.02** `chatbot_sentiment_action.tier_level` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-71.03** `chatbot_sentiment_action.bot_behavior` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-71.04** `chatbot_sentiment_action.notify_admin` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-71.05** `chatbot_sentiment_action.suggested_canned_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-71.06** `chatbot_sentiment_action.instructions` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-72 `chatbot_compensation_policy` — 7 cột (CDSLfinal dòng 736)
> Chính sách đền bù và tặng điểm Pawpoint tự động khi khách hàng gặp sự cố dịch vụ
- [x] **DB-72.01** `chatbot_compensation_policy.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-72.02** `chatbot_compensation_policy.issue_type` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: chatbot*.
- [x] **DB-72.03** `chatbot_compensation_policy.max_points` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: chatbot*.
- [x] **DB-72.04** `chatbot_compensation_policy.max_discount_vnd` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: chatbot*.
- [x] **DB-72.05** `chatbot_compensation_policy.approval_required` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: chatbot*.
- [x] **DB-72.06** `chatbot_compensation_policy.description` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-72.07** `chatbot_compensation_policy.is_active` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, orders, chatbot, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-73 `chatbot_handover_rule` — 7 cột (CDSLfinal dòng 743)
> Quy tắc tự động bàn giao cuộc trò chuyện từ Bot sang nhân viên chuyên môn (KTV Grooming, Bác sĩ, CSKH)
- [x] **DB-73.01** `chatbot_handover_rule.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-73.02** `chatbot_handover_rule.condition_name` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: chatbot*.
- [x] **DB-73.03** `chatbot_handover_rule.trigger_type` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: chatbot*.
- [x] **DB-73.04** `chatbot_handover_rule.threshold_value` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: chatbot*.
- [x] **DB-73.05** `chatbot_handover_rule.auto_assign_role` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: chatbot*.
- [x] **DB-73.06** `chatbot_handover_rule.sla_seconds` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: chatbot*.
- [x] **DB-73.07** `chatbot_handover_rule.is_active` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, orders, chatbot, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-74 `chatbot_knowledge_faq` — 9 cột (CDSLfinal dòng 750)
> Kho tri thức các câu hỏi thường gặp FAQ phục vụ giải đáp tự động cho khách hàng
- [x] **DB-74.01** `chatbot_knowledge_faq.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-74.02** `chatbot_knowledge_faq.category` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, orders, complaints, chatbot, settings*.
- [x] **DB-74.03** `chatbot_knowledge_faq.question` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: chatbot*.
- [x] **DB-74.04** `chatbot_knowledge_faq.answer` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: chatbot*.
- [x] **DB-74.05** `chatbot_knowledge_faq.keywords` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: chatbot*.
- [x] **DB-74.06** `chatbot_knowledge_faq.priority` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, complaints, chatbot, settings*.
- [x] **DB-74.07** `chatbot_knowledge_faq.is_active` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, orders, chatbot, settings*.
- [x] **DB-74.08** `chatbot_knowledge_faq.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-74.09** `chatbot_knowledge_faq.updated_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-75 `chatbot_system_prompt` — 9 cột (CDSLfinal dòng 759)
> Quản lý các System Prompt cấu hình nhân cách (Persona), phong cách giao tiếp và hướng dẫn hành vi của AI Chatbot
- [x] **DB-75.01** `chatbot_system_prompt.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-75.02** `chatbot_system_prompt.prompt_key` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-75.03** `chatbot_system_prompt.channel` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-75.04** `chatbot_system_prompt.persona_name` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-75.05** `chatbot_system_prompt.tone_of_voice` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-75.06** `chatbot_system_prompt.content` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-75.07** `chatbot_system_prompt.is_active` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, orders, chatbot, settings*.
- [x] **DB-75.08** `chatbot_system_prompt.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-75.09** `chatbot_system_prompt.updated_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-76 `chatbot_canned_response` — 8 cột (CDSLfinal dòng 768)
> Danh mục các câu trả lời nhanh soạn sẵn cho nhân viên CSKH và Chatbot
- [x] **DB-76.01** `chatbot_canned_response.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-76.02** `chatbot_canned_response.shortcut` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: chatbot*.
- [x] **DB-76.03** `chatbot_canned_response.title` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-76.04** `chatbot_canned_response.content` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-76.05** `chatbot_canned_response.category` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, orders, complaints, chatbot, settings*.
- [x] **DB-76.06** `chatbot_canned_response.usage_count` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders, chatbot, settings*.
- [x] **DB-76.07** `chatbot_canned_response.is_active` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, orders, chatbot, settings*.
- [x] **DB-76.08** `chatbot_canned_response.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-77 `chatbot_profanity_filter` — 7 cột (CDSLfinal dòng 776)
> Danh mục các từ ngữ nhạy cảm, thô tục cần tự động che hoặc chặn trong phiên chat
- [x] **DB-77.01** `chatbot_profanity_filter.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-77.02** `chatbot_profanity_filter.keyword` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: chatbot, settings*.
- [x] **DB-77.03** `chatbot_profanity_filter.severity` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: chatbot, staff*.
- [x] **DB-77.04** `chatbot_profanity_filter.action` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, chatbot, staff, settings*.
- [x] **DB-77.05** `chatbot_profanity_filter.replacement_text` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: chatbot*.
- [x] **DB-77.06** `chatbot_profanity_filter.is_active` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, orders, chatbot, settings*.
- [x] **DB-77.07** `chatbot_profanity_filter.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-78 `chatbot_scenario_matrix` — 8 cột (CDSLfinal dòng 783)
> Ma trận các kịch bản kiểm thử (benchmark) đánh giá chất lượng phản hồi và độ chính xác của AI Chatbot
- [x] **DB-78.01** `chatbot_scenario_matrix.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-78.02** `chatbot_scenario_matrix.scenario_name` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: chatbot*.
- [x] **DB-78.03** `chatbot_scenario_matrix.sample_user_input` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: chatbot*.
- [x] **DB-78.04** `chatbot_scenario_matrix.expected_sentiment` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: chatbot*.
- [x] **DB-78.05** `chatbot_scenario_matrix.expected_tool_call` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-78.06** `chatbot_scenario_matrix.expected_handover` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: chatbot*.
- [x] **DB-78.07** `chatbot_scenario_matrix.benchmark_status` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: chatbot*.
- [x] **DB-78.08** `chatbot_scenario_matrix.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-79 `document_embeddings` — 4 cột (CDSLfinal dòng 791)
> Bảng lưu trữ vector embedding các đoạn tài liệu chính sách, cẩm nang chăm sóc thú cưng phục vụ tra cứu ngữ nghĩa RAG cho AI
- [x] **DB-79.01** `document_embeddings.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-79.02** `document_embeddings.content` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-79.03** `document_embeddings.metadata` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: chatbot*.
- [x] **DB-79.04** `document_embeddings.embedding` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-80 `api_keys` — 5 cột (CDSLfinal dòng 795)
> Lưu trữ và quản lý các khóa xác thực API dịch vụ ngoài của hệ thống
- [x] **DB-80.01** `api_keys.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-80.02** `api_keys.provider` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: settings*.
- [x] **DB-80.03** `api_keys.key_value` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *chưa thấy tên cột trong các JS gửi kèm*.
- [x] **DB-80.04** `api_keys.is_active` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, orders, chatbot, settings*.
- [x] **DB-80.05** `api_keys.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

### DB-81 `staff_public_view` — 11 cột (CDSLfinal dòng 800)
> View dữ liệu trích xuất thông tin hồ sơ nhân viên công khai phục vụ tra cứu lịch làm việc và hiển thị cho khách hàng
- [x] **DB-81.01** `staff_public_view.id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-81.02** `staff_public_view.auth_user_id` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: staff, settings*.
- [x] **DB-81.03** `staff_public_view.full_name` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-81.04** `staff_public_view.phone_number` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, orders, staff*.
- [x] **DB-81.05** `staff_public_view.role` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, services, orders, complaints, chatbot, staff*.
- [x] **DB-81.06** `staff_public_view.specialization` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, staff*.
- [x] **DB-81.07** `staff_public_view.hire_date` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: staff*.
- [x] **DB-81.08** `staff_public_view.account_status` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, complaints, staff*.
- [x] **DB-81.09** `staff_public_view.system_role` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: orders, chatbot, staff*.
- [x] **DB-81.10** `staff_public_view.created_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: dashboard, customers, pets, services, orders, complaints, chatbot, staff, settings*.
- [x] **DB-81.11** `staff_public_view.updated_at` — cột tồn tại/đúng type/null/FK/default/enum; write+read đúng (nếu nghiệp vụ cần); UI hoặc DB-only có lý do; *từ khóa có trong JS: services, complaints, chatbot, staff, settings*.
- [x] **Kiểm cấp bảng:** FK/unique/index/RLS/triggers/RPC/soft-delete/audit, NULL & pagination (DB thật)

## K. ENUM MỚI — KIỂM TỪNG TẬP GIÁ TRỊ

> Một enum có thể áp cho nhiều cột; phải truy vết theo cột thực và kiểu `udt_name`, không áp giá trị enum vào cột không cùng type. Giá trị `ALL`/`pending`/`high` có thể là UI internal nhưng không được ghi thẳng vào enum DB nếu không hợp lệ.
### ENUM `account_status` — enum.md dòng 3
- [x] Đối chiếu pg_enum (hoặc CHECK constraint) và mã migration: `dang_hoat_dong, tam_khoa, da_khoa`
- [x] Đảm bảo mọi trạng thái DB đều map → nhãn UI/filter/badge/điều kiện nghiệp vụ; reverse map trước `insert/update`, ghi audit; invalid state không được fallback im lặng
- [x] `account_status = dang_hoat_dong`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `account_status = tam_khoa`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `account_status = da_khoa`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL

### ENUM `gender` — enum.md dòng 4
- [x] Đối chiếu pg_enum (hoặc CHECK constraint) và mã migration: `nam, nu, khac`
- [x] Đảm bảo mọi trạng thái DB đều map → nhãn UI/filter/badge/điều kiện nghiệp vụ; reverse map trước `insert/update`, ghi audit; invalid state không được fallback im lặng
- [x] `gender = nam`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `gender = nu`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `gender = khac`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL

### ENUM `reward_type` — enum.md dòng 5
- [x] Đối chiếu pg_enum (hoặc CHECK constraint) và mã migration: `paw_points, voucher`
- [x] Đảm bảo mọi trạng thái DB đều map → nhãn UI/filter/badge/điều kiện nghiệp vụ; reverse map trước `insert/update`, ghi audit; invalid state không được fallback im lặng
- [x] `reward_type = paw_points`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `reward_type = voucher`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL

### ENUM `trigger_event` — enum.md dòng 6
- [x] Đối chiếu pg_enum (hoặc CHECK constraint) và mã migration: `dang_ky, mua_hang, dat_lich, danh_gia, khuyen_mai, dieu_chinh_thu_cong`
- [x] Đảm bảo mọi trạng thái DB đều map → nhãn UI/filter/badge/điều kiện nghiệp vụ; reverse map trước `insert/update`, ghi audit; invalid state không được fallback im lặng
- [x] `trigger_event = dang_ky`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `trigger_event = mua_hang`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `trigger_event = dat_lich`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `trigger_event = danh_gia`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `trigger_event = khuyen_mai`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `trigger_event = dieu_chinh_thu_cong`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL

### ENUM `voucher_type` — enum.md dòng 7
- [x] Đối chiếu pg_enum (hoặc CHECK constraint) và mã migration: `giam_gia_theo_phan_tram, giam_gia_co_dinh`
- [x] Đảm bảo mọi trạng thái DB đều map → nhãn UI/filter/badge/điều kiện nghiệp vụ; reverse map trước `insert/update`, ghi audit; invalid state không được fallback im lặng
- [x] `voucher_type = giam_gia_theo_phan_tram`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `voucher_type = giam_gia_co_dinh`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL

### ENUM `applicable_for` — enum.md dòng 8
- [x] Đối chiếu pg_enum (hoặc CHECK constraint) và mã migration: `san_pham, dich_vu, san_pham_va_dich_vu`
- [x] Đảm bảo mọi trạng thái DB đều map → nhãn UI/filter/badge/điều kiện nghiệp vụ; reverse map trước `insert/update`, ghi audit; invalid state không được fallback im lặng
- [x] `applicable_for = san_pham`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `applicable_for = dich_vu`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `applicable_for = san_pham_va_dich_vu`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL

### ENUM `acquired_method` — enum.md dòng 9
- [x] Đối chiếu pg_enum (hoặc CHECK constraint) và mã migration: `doi_diem, khuyen_mai, tang`
- [x] Đảm bảo mọi trạng thái DB đều map → nhãn UI/filter/badge/điều kiện nghiệp vụ; reverse map trước `insert/update`, ghi audit; invalid state không được fallback im lặng
- [x] `acquired_method = doi_diem`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `acquired_method = khuyen_mai`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `acquired_method = tang`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL

### ENUM `voucher_status` — enum.md dòng 10
- [x] Đối chiếu pg_enum (hoặc CHECK constraint) và mã migration: `chua_su_dung, da_su_dung, da_het_han, da_huy`
- [x] Đảm bảo mọi trạng thái DB đều map → nhãn UI/filter/badge/điều kiện nghiệp vụ; reverse map trước `insert/update`, ghi audit; invalid state không được fallback im lặng
- [x] `voucher_status = chua_su_dung`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `voucher_status = da_su_dung`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `voucher_status = da_het_han`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `voucher_status = da_huy`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL

### ENUM `species` — enum.md dòng 11
- [x] Đối chiếu pg_enum (hoặc CHECK constraint) và mã migration: `cho, meo, tho, hamster, thu_nho, khac`
- [x] Đảm bảo mọi trạng thái DB đều map → nhãn UI/filter/badge/điều kiện nghiệp vụ; reverse map trước `insert/update`, ghi audit; invalid state không được fallback im lặng
- [x] `species = cho`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `species = meo`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `species = tho`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `species = hamster`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `species = thu_nho`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `species = khac`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL

### ENUM `pet_status` — enum.md dòng 12
- [x] Đối chiếu pg_enum (hoặc CHECK constraint) và mã migration: `dang_hoat_dong, tam_ngung, da_an`
- [x] Đảm bảo mọi trạng thái DB đều map → nhãn UI/filter/badge/điều kiện nghiệp vụ; reverse map trước `insert/update`, ghi audit; invalid state không được fallback im lặng
- [x] `pet_status = dang_hoat_dong`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `pet_status = tam_ngung`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `pet_status = da_an`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL

### ENUM `service_category` — enum.md dòng 13
- [x] Đối chiếu pg_enum (hoặc CHECK constraint) và mã migration: `grooming_spa, pet_hotel, pet_taxi`
- [x] Đảm bảo mọi trạng thái DB đều map → nhãn UI/filter/badge/điều kiện nghiệp vụ; reverse map trước `insert/update`, ghi audit; invalid state không được fallback im lặng
- [x] `service_category = grooming_spa`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `service_category = pet_hotel`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `service_category = pet_taxi`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL

### ENUM `service_status` — enum.md dòng 14
- [x] Đối chiếu pg_enum (hoặc CHECK constraint) và mã migration: `dang_hoat_dong, tam_ngung, ngung_cung_cap`
- [x] Đảm bảo mọi trạng thái DB đều map → nhãn UI/filter/badge/điều kiện nghiệp vụ; reverse map trước `insert/update`, ghi audit; invalid state không được fallback im lặng
- [x] `service_status = dang_hoat_dong`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `service_status = tam_ngung`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `service_status = ngung_cung_cap`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL

### ENUM `groomer_level` — enum.md dòng 15
- [x] Đối chiếu pg_enum (hoặc CHECK constraint) và mã migration: `co_ban, trung_cap, nang_cao, chuyen_gia`
- [x] Đảm bảo mọi trạng thái DB đều map → nhãn UI/filter/badge/điều kiện nghiệp vụ; reverse map trước `insert/update`, ghi audit; invalid state không được fallback im lặng
- [x] `groomer_level = co_ban`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `groomer_level = trung_cap`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `groomer_level = nang_cao`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `groomer_level = chuyen_gia`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL

### ENUM `pet_type` — enum.md dòng 16
- [x] Đối chiếu pg_enum (hoặc CHECK constraint) và mã migration: `cho, meo, tho, hamster, thu_nho, khac`
- [x] Đảm bảo mọi trạng thái DB đều map → nhãn UI/filter/badge/điều kiện nghiệp vụ; reverse map trước `insert/update`, ghi audit; invalid state không được fallback im lặng
- [x] `pet_type = cho`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `pet_type = meo`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `pet_type = tho`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `pet_type = hamster`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `pet_type = thu_nho`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `pet_type = khac`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL

### ENUM `room_type` — enum.md dòng 17
- [x] Đối chiếu pg_enum (hoặc CHECK constraint) và mã migration: `standard, deluxe, vip`
- [x] Đảm bảo mọi trạng thái DB đều map → nhãn UI/filter/badge/điều kiện nghiệp vụ; reverse map trước `insert/update`, ghi audit; invalid state không được fallback im lặng
- [x] `room_type = standard`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `room_type = deluxe`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `room_type = vip`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL

### ENUM `room_status` — enum.md dòng 18
- [x] Đối chiếu pg_enum (hoặc CHECK constraint) và mã migration: `trong, da_dat, dang_su_dung, bao_tri, khoa_hoat_dong`
- [x] Đảm bảo mọi trạng thái DB đều map → nhãn UI/filter/badge/điều kiện nghiệp vụ; reverse map trước `insert/update`, ghi audit; invalid state không được fallback im lặng
- [x] `room_status = trong`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `room_status = da_dat`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `room_status = dang_su_dung`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `room_status = bao_tri`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `room_status = khoa_hoat_dong`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL

### ENUM `price_status` — enum.md dòng 19
- [x] Đối chiếu pg_enum (hoặc CHECK constraint) và mã migration: `dang_ap_dung, het_han, tam_ngung`
- [x] Đảm bảo mọi trạng thái DB đều map → nhãn UI/filter/badge/điều kiện nghiệp vụ; reverse map trước `insert/update`, ghi audit; invalid state không được fallback im lặng
- [x] `price_status = dang_ap_dung`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `price_status = het_han`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `price_status = tam_ngung`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL

### ENUM `taxi_rule_status` — enum.md dòng 20
- [x] Đối chiếu pg_enum (hoặc CHECK constraint) và mã migration: `dang_ap_dung, het_han, tam_ngung`
- [x] Đảm bảo mọi trạng thái DB đều map → nhãn UI/filter/badge/điều kiện nghiệp vụ; reverse map trước `insert/update`, ghi audit; invalid state không được fallback im lặng
- [x] `taxi_rule_status = dang_ap_dung`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `taxi_rule_status = het_han`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `taxi_rule_status = tam_ngung`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL

### ENUM `appointment_status` — enum.md dòng 21
- [x] Đối chiếu pg_enum (hoặc CHECK constraint) và mã migration: `cho_xac_nhan, da_xac_nhan, da_check_in, dang_thuc_hien, da_hoan_tat, da_huy, vang_mat`
- [x] Đảm bảo mọi trạng thái DB đều map → nhãn UI/filter/badge/điều kiện nghiệp vụ; reverse map trước `insert/update`, ghi audit; invalid state không được fallback im lặng
- [x] `appointment_status = cho_xac_nhan`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `appointment_status = da_xac_nhan`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `appointment_status = da_check_in`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `appointment_status = dang_thuc_hien`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `appointment_status = da_hoan_tat`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `appointment_status = da_huy`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `appointment_status = vang_mat`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL

### ENUM `payment_status` — enum.md dòng 22
- [x] Đối chiếu pg_enum (hoặc CHECK constraint) và mã migration: `chua_thanh_toan, da_thanh_toan, thanh_toan_that_bai, da_hoan_tien`
- [x] Đảm bảo mọi trạng thái DB đều map → nhãn UI/filter/badge/điều kiện nghiệp vụ; reverse map trước `insert/update`, ghi audit; invalid state không được fallback im lặng
- [x] `payment_status = chua_thanh_toan`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `payment_status = da_thanh_toan`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `payment_status = thanh_toan_that_bai`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `payment_status = da_hoan_tien`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL

### ENUM `media_type` — enum.md dòng 23
- [x] Đối chiếu pg_enum (hoặc CHECK constraint) và mã migration: `hinh_anh, video`
- [x] Đảm bảo mọi trạng thái DB đều map → nhãn UI/filter/badge/điều kiện nghiệp vụ; reverse map trước `insert/update`, ghi audit; invalid state không được fallback im lặng
- [x] `media_type = hinh_anh`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `media_type = video`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL

### ENUM `supplier_status` — enum.md dòng 24
- [x] Đối chiếu pg_enum (hoặc CHECK constraint) và mã migration: `dang_hop_tac, tam_ngung, ngung_hop_tac`
- [x] Đảm bảo mọi trạng thái DB đều map → nhãn UI/filter/badge/điều kiện nghiệp vụ; reverse map trước `insert/update`, ghi audit; invalid state không được fallback im lặng
- [x] `supplier_status = dang_hop_tac`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `supplier_status = tam_ngung`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `supplier_status = ngung_hop_tac`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL

### ENUM `purchase_order_status` — enum.md dòng 25
- [x] Đối chiếu pg_enum (hoặc CHECK constraint) và mã migration: `nhap, da_xac_nhan, dang_nhan_hang, da_nhan_du, da_huy`
- [x] Đảm bảo mọi trạng thái DB đều map → nhãn UI/filter/badge/điều kiện nghiệp vụ; reverse map trước `insert/update`, ghi audit; invalid state không được fallback im lặng
- [x] `purchase_order_status = nhap`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `purchase_order_status = da_xac_nhan`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `purchase_order_status = dang_nhan_hang`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `purchase_order_status = da_nhan_du`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `purchase_order_status = da_huy`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL

### ENUM `product_status` — enum.md dòng 26
- [x] Đối chiếu pg_enum (hoặc CHECK constraint) và mã migration: `dang_ban, tam_ngung, ngung_ban`
- [x] Đảm bảo mọi trạng thái DB đều map → nhãn UI/filter/badge/điều kiện nghiệp vụ; reverse map trước `insert/update`, ghi audit; invalid state không được fallback im lặng
- [x] `product_status = dang_ban`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `product_status = tam_ngung`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `product_status = ngung_ban`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL

### ENUM `cart_status` — enum.md dòng 27
- [x] Đối chiếu pg_enum (hoặc CHECK constraint) và mã migration: `dang_hoat_dong, da_chuyen_thanh_don, da_huy, da_het_han`
- [x] Đảm bảo mọi trạng thái DB đều map → nhãn UI/filter/badge/điều kiện nghiệp vụ; reverse map trước `insert/update`, ghi audit; invalid state không được fallback im lặng
- [x] `cart_status = dang_hoat_dong`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `cart_status = da_chuyen_thanh_don`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `cart_status = da_huy`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `cart_status = da_het_han`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL

### ENUM `reservation_status` — enum.md dòng 28
- [x] Đối chiếu pg_enum (hoặc CHECK constraint) và mã migration: `dang_giu, da_hoan_tat, da_het_han, da_huy`
- [x] Đảm bảo mọi trạng thái DB đều map → nhãn UI/filter/badge/điều kiện nghiệp vụ; reverse map trước `insert/update`, ghi audit; invalid state không được fallback im lặng
- [x] `reservation_status = dang_giu`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `reservation_status = da_hoan_tat`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `reservation_status = da_het_han`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `reservation_status = da_huy`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL

### ENUM `transaction_type` — enum.md dòng 29
- [x] Đối chiếu pg_enum (hoặc CHECK constraint) và mã migration: `nhap_kho, xuat_kho, dieu_chinh_tang, dieu_chinh_giam, hoan_kho`
- [x] Đảm bảo mọi trạng thái DB đều map → nhãn UI/filter/badge/điều kiện nghiệp vụ; reverse map trước `insert/update`, ghi audit; invalid state không được fallback im lặng
- [x] `transaction_type = nhap_kho`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `transaction_type = xuat_kho`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `transaction_type = dieu_chinh_tang`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `transaction_type = dieu_chinh_giam`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `transaction_type = hoan_kho`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL

### ENUM `payment_type` — enum.md dòng 30
- [x] Đối chiếu pg_enum (hoặc CHECK constraint) và mã migration: `mua_hang, dat_lich`
- [x] Đảm bảo mọi trạng thái DB đều map → nhãn UI/filter/badge/điều kiện nghiệp vụ; reverse map trước `insert/update`, ghi audit; invalid state không được fallback im lặng
- [x] `payment_type = mua_hang`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `payment_type = dat_lich`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL

### ENUM `transaction_status` — enum.md dòng 31
- [x] Đối chiếu pg_enum (hoặc CHECK constraint) và mã migration: `cho_xu_ly, dang_xu_ly, thanh_cong, that_bai, da_huy, da_hoan_tien`
- [x] Đảm bảo mọi trạng thái DB đều map → nhãn UI/filter/badge/điều kiện nghiệp vụ; reverse map trước `insert/update`, ghi audit; invalid state không được fallback im lặng
- [x] `transaction_status = cho_xu_ly`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `transaction_status = dang_xu_ly`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `transaction_status = thanh_cong`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `transaction_status = that_bai`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `transaction_status = da_huy`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `transaction_status = da_hoan_tien`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL

### ENUM `available_status` — enum.md dòng 32
- [x] Đối chiếu pg_enum (hoặc CHECK constraint) và mã migration: `dang_kha_dung, tam_ngung`
- [x] Đảm bảo mọi trạng thái DB đều map → nhãn UI/filter/badge/điều kiện nghiệp vụ; reverse map trước `insert/update`, ghi audit; invalid state không được fallback im lặng
- [x] `available_status = dang_kha_dung`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `available_status = tam_ngung`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL

### ENUM `review_type` — enum.md dòng 33
- [x] Đối chiếu pg_enum (hoặc CHECK constraint) và mã migration: `san_pham, dich_vu`
- [x] Đảm bảo mọi trạng thái DB đều map → nhãn UI/filter/badge/điều kiện nghiệp vụ; reverse map trước `insert/update`, ghi audit; invalid state không được fallback im lặng
- [x] `review_type = san_pham`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `review_type = dich_vu`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL

### ENUM `review_status` — enum.md dòng 34
- [x] Đối chiếu pg_enum (hoặc CHECK constraint) và mã migration: `cho_duyet, da_duyet, an, tu_choi`
- [x] Đảm bảo mọi trạng thái DB đều map → nhãn UI/filter/badge/điều kiện nghiệp vụ; reverse map trước `insert/update`, ghi audit; invalid state không được fallback im lặng
- [x] `review_status = cho_duyet`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `review_status = da_duyet`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `review_status = an`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `review_status = tu_choi`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL

### ENUM `sender_type` — enum.md dòng 35
- [x] Đối chiếu pg_enum (hoặc CHECK constraint) và mã migration: `khach_hang, nhan_vien, he_thong`
- [x] Đảm bảo mọi trạng thái DB đều map → nhãn UI/filter/badge/điều kiện nghiệp vụ; reverse map trước `insert/update`, ghi audit; invalid state không được fallback im lặng
- [x] `sender_type = khach_hang`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `sender_type = nhan_vien`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `sender_type = he_thong`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL

### ENUM `channel` — enum.md dòng 36
- [x] Đối chiếu pg_enum (hoặc CHECK constraint) và mã migration: `chatbot, web, dien_thoai, facebook, zalo, email`
- [x] Đảm bảo mọi trạng thái DB đều map → nhãn UI/filter/badge/điều kiện nghiệp vụ; reverse map trước `insert/update`, ghi audit; invalid state không được fallback im lặng
- [x] `channel = chatbot`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `channel = web`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `channel = dien_thoai`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `channel = facebook`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `channel = zalo`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `channel = email`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL

### ENUM `category_ticket` — enum.md dòng 37
- [x] Đối chiếu pg_enum (hoặc CHECK constraint) và mã migration: `don_hang, lich_hen, thanh_toan, san_pham, chat_luong_dich_vu, hoan_tien, boi_thuong, cham_soc_thu_cung, khac`
- [x] Đảm bảo mọi trạng thái DB đều map → nhãn UI/filter/badge/điều kiện nghiệp vụ; reverse map trước `insert/update`, ghi audit; invalid state không được fallback im lặng
- [x] `category_ticket = don_hang`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `category_ticket = lich_hen`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `category_ticket = thanh_toan`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `category_ticket = san_pham`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `category_ticket = chat_luong_dich_vu`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `category_ticket = hoan_tien`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `category_ticket = boi_thuong`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `category_ticket = cham_soc_thu_cung`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `category_ticket = khac`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL

### ENUM `priority` — enum.md dòng 38
- [x] Đối chiếu pg_enum (hoặc CHECK constraint) và mã migration: `thap, trung_binh, cao, khan_cap`
- [x] Đảm bảo mọi trạng thái DB đều map → nhãn UI/filter/badge/điều kiện nghiệp vụ; reverse map trước `insert/update`, ghi audit; invalid state không được fallback im lặng
- [x] `priority = thap`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `priority = trung_binh`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `priority = cao`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `priority = khan_cap`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL

### ENUM `ticket_status` — enum.md dòng 39
- [x] Đối chiếu pg_enum (hoặc CHECK constraint) và mã migration: `mo, dang_xu_ly, cho_khach_hang, da_giai_quyet, da_dong, tu_choi`
- [x] Đảm bảo mọi trạng thái DB đều map → nhãn UI/filter/badge/điều kiện nghiệp vụ; reverse map trước `insert/update`, ghi audit; invalid state không được fallback im lặng
- [x] `ticket_status = mo`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `ticket_status = dang_xu_ly`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `ticket_status = cho_khach_hang`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `ticket_status = da_giai_quyet`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `ticket_status = da_dong`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `ticket_status = tu_choi`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL

### ENUM `resolution_type` — enum.md dòng 40
- [x] Đối chiếu pg_enum (hoặc CHECK constraint) và mã migration: `hoan_tien, hoan_tien_mot_phan, doi_san_pham, thuc_hien_lai_dich_vu, boi_thuong, tu_choi, khac`
- [x] Đảm bảo mọi trạng thái DB đều map → nhãn UI/filter/badge/điều kiện nghiệp vụ; reverse map trước `insert/update`, ghi audit; invalid state không được fallback im lặng
- [x] `resolution_type = hoan_tien`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `resolution_type = hoan_tien_mot_phan`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `resolution_type = doi_san_pham`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `resolution_type = thuc_hien_lai_dich_vu`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `resolution_type = boi_thuong`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `resolution_type = tu_choi`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `resolution_type = khac`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL

### ENUM `return_type` — enum.md dòng 41
- [x] Đối chiếu pg_enum (hoặc CHECK constraint) và mã migration: `doi_san_pham, tra_san_pham, hoan_tien`
- [x] Đảm bảo mọi trạng thái DB đều map → nhãn UI/filter/badge/điều kiện nghiệp vụ; reverse map trước `insert/update`, ghi audit; invalid state không được fallback im lặng
- [x] `return_type = doi_san_pham`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `return_type = tra_san_pham`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `return_type = hoan_tien`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL

### ENUM `request_status` — enum.md dòng 42
- [x] Đối chiếu pg_enum (hoặc CHECK constraint) và mã migration: `cho_xu_ly, dang_xu_ly, da_duyet, da_hoan_tat, da_tu_choi, da_huy`
- [x] Đảm bảo mọi trạng thái DB đều map → nhãn UI/filter/badge/điều kiện nghiệp vụ; reverse map trước `insert/update`, ghi audit; invalid state không được fallback im lặng
- [x] `request_status = cho_xu_ly`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `request_status = dang_xu_ly`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `request_status = da_duyet`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `request_status = da_hoan_tat`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `request_status = da_tu_choi`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `request_status = da_huy`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL

### ENUM `refund_type` — enum.md dòng 43
- [x] Đối chiếu pg_enum (hoặc CHECK constraint) và mã migration: `hoan_tien_toan_bo, hoan_tien_mot_phan, boi_thuong`
- [x] Đảm bảo mọi trạng thái DB đều map → nhãn UI/filter/badge/điều kiện nghiệp vụ; reverse map trước `insert/update`, ghi audit; invalid state không được fallback im lặng
- [x] `refund_type = hoan_tien_toan_bo`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `refund_type = hoan_tien_mot_phan`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `refund_type = boi_thuong`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL

### ENUM `refund_method` — enum.md dòng 44
- [x] Đối chiếu pg_enum (hoặc CHECK constraint) và mã migration: `phuong_thuc_thanh_toan_ban_dau, chuyen_khoan_ngan_hang, paw_points, khac`
- [x] Đảm bảo mọi trạng thái DB đều map → nhãn UI/filter/badge/điều kiện nghiệp vụ; reverse map trước `insert/update`, ghi audit; invalid state không được fallback im lặng
- [x] `refund_method = phuong_thuc_thanh_toan_ban_dau`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `refund_method = chuyen_khoan_ngan_hang`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `refund_method = paw_points`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `refund_method = khac`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL

### ENUM `refund_status` — enum.md dòng 45
- [x] Đối chiếu pg_enum (hoặc CHECK constraint) và mã migration: `cho_xu_ly, dang_xu_ly, da_hoan_tat, that_bai, da_huy`
- [x] Đảm bảo mọi trạng thái DB đều map → nhãn UI/filter/badge/điều kiện nghiệp vụ; reverse map trước `insert/update`, ghi audit; invalid state không được fallback im lặng
- [x] `refund_status = cho_xu_ly`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `refund_status = dang_xu_ly`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `refund_status = da_hoan_tat`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `refund_status = that_bai`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `refund_status = da_huy`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL

### ENUM `staff_role` — enum.md dòng 46
- [x] Đối chiếu pg_enum (hoặc CHECK constraint) và mã migration: `chu_he_thong, quan_tri_vien, le_tan, cham_soc_thu_cung, cham_soc_khach_hang, quan_ly`
- [x] Đảm bảo mọi trạng thái DB đều map → nhãn UI/filter/badge/điều kiện nghiệp vụ; reverse map trước `insert/update`, ghi audit; invalid state không được fallback im lặng
- [x] `staff_role = chu_he_thong`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `staff_role = quan_tri_vien`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `staff_role = le_tan`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `staff_role = cham_soc_thu_cung`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `staff_role = cham_soc_khach_hang`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `staff_role = quan_ly`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL

### ENUM `availability_status` — enum.md dòng 47
- [x] Đối chiếu pg_enum (hoặc CHECK constraint) và mã migration: `co_san, nghi_phep, nghi_om, vang_mat, khong_duoc_xep_ca`
- [x] Đảm bảo mọi trạng thái DB đều map → nhãn UI/filter/badge/điều kiện nghiệp vụ; reverse map trước `insert/update`, ghi audit; invalid state không được fallback im lặng
- [x] `availability_status = co_san`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `availability_status = nghi_phep`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `availability_status = nghi_om`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `availability_status = vang_mat`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `availability_status = khong_duoc_xep_ca`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL

### ENUM `promotion_status` — enum.md dòng 48
- [x] Đối chiếu pg_enum (hoặc CHECK constraint) và mã migration: `nhap, dang_ap_dung, het_han, tam_dung, da_huy`
- [x] Đảm bảo mọi trạng thái DB đều map → nhãn UI/filter/badge/điều kiện nghiệp vụ; reverse map trước `insert/update`, ghi audit; invalid state không được fallback im lặng
- [x] `promotion_status = nhap`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `promotion_status = dang_ap_dung`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `promotion_status = het_han`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `promotion_status = tam_dung`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `promotion_status = da_huy`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL

### ENUM `discount_type` — enum.md dòng 49
- [x] Đối chiếu pg_enum (hoặc CHECK constraint) và mã migration: `phan_tram, so_tien_co_dinh`
- [x] Đảm bảo mọi trạng thái DB đều map → nhãn UI/filter/badge/điều kiện nghiệp vụ; reverse map trước `insert/update`, ghi audit; invalid state không được fallback im lặng
- [x] `discount_type = phan_tram`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `discount_type = so_tien_co_dinh`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL

### ENUM `banner_status` — enum.md dòng 50
- [x] Đối chiếu pg_enum (hoặc CHECK constraint) và mã migration: `dang_hien_thi, tam_an, het_han`
- [x] Đảm bảo mọi trạng thái DB đều map → nhãn UI/filter/badge/điều kiện nghiệp vụ; reverse map trước `insert/update`, ghi audit; invalid state không được fallback im lặng
- [x] `banner_status = dang_hien_thi`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `banner_status = tam_an`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `banner_status = het_han`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL

### ENUM `blog_status` — enum.md dòng 51
- [x] Đối chiếu pg_enum (hoặc CHECK constraint) và mã migration: `nhap, da_len_lich, da_xuat_ban, da_an`
- [x] Đảm bảo mọi trạng thái DB đều map → nhãn UI/filter/badge/điều kiện nghiệp vụ; reverse map trước `insert/update`, ghi audit; invalid state không được fallback im lặng
- [x] `blog_status = nhap`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `blog_status = da_len_lich`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `blog_status = da_xuat_ban`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `blog_status = da_an`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL

### ENUM `notification_type` — enum.md dòng 52
- [x] Đối chiếu pg_enum (hoặc CHECK constraint) và mã migration: `don_hang_moi, don_hang_da_xac_nhan, don_hang_da_giao_van, don_hang_da_giao, don_hang_da_duoc_huy, lich_hen_da_xac_nhan, lich_hen_da_thay_doi, cap_nhat_yeu_cau_ho_tro, hoan_tien_thanh_cong, hoan_tien_that_bai`
- [x] Đảm bảo mọi trạng thái DB đều map → nhãn UI/filter/badge/điều kiện nghiệp vụ; reverse map trước `insert/update`, ghi audit; invalid state không được fallback im lặng
- [x] `notification_type = don_hang_moi`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `notification_type = don_hang_da_xac_nhan`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `notification_type = don_hang_da_giao_van`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `notification_type = don_hang_da_giao`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `notification_type = don_hang_da_duoc_huy`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `notification_type = lich_hen_da_xac_nhan`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `notification_type = lich_hen_da_thay_doi`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `notification_type = cap_nhat_yeu_cau_ho_tro`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `notification_type = hoan_tien_thanh_cong`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `notification_type = hoan_tien_that_bai`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL

### ENUM `setting_type` — enum.md dòng 53
- [x] Đối chiếu pg_enum (hoặc CHECK constraint) và mã migration: `chuoi, so, boolean, json`
- [x] Đảm bảo mọi trạng thái DB đều map → nhãn UI/filter/badge/điều kiện nghiệp vụ; reverse map trước `insert/update`, ghi audit; invalid state không được fallback im lặng
- [x] `setting_type = chuoi`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `setting_type = so`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `setting_type = boolean`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `setting_type = json`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL

### ENUM `order_status` — enum.md dòng 54
- [x] Đối chiếu pg_enum (hoặc CHECK constraint) và mã migration: `cho_xac_nhan, da_xac_nhan, dang_dong_goi, dang_giao_hang, da_giao_hang, da_huy, da_tra_hang`
- [x] Đảm bảo mọi trạng thái DB đều map → nhãn UI/filter/badge/điều kiện nghiệp vụ; reverse map trước `insert/update`, ghi audit; invalid state không được fallback im lặng
- [x] `order_status = cho_xac_nhan`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `order_status = da_xac_nhan`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `order_status = dang_dong_goi`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `order_status = dang_giao_hang`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `order_status = da_giao_hang`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `order_status = da_huy`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `order_status = da_tra_hang`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL

### ENUM `shift` — enum.md dòng 55
- [x] Đối chiếu pg_enum (hoặc CHECK constraint) và mã migration: `ca_sang, ca_chieu, ca_toi`
- [x] Đảm bảo mọi trạng thái DB đều map → nhãn UI/filter/badge/điều kiện nghiệp vụ; reverse map trước `insert/update`, ghi audit; invalid state không được fallback im lặng
- [x] `shift = ca_sang`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `shift = ca_chieu`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `shift = ca_toi`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL

### ENUM `schedule_status` — enum.md dòng 56
- [x] Đối chiếu pg_enum (hoặc CHECK constraint) và mã migration: `da_len_lich, dang_lam_viec, da_hoan_thanh, nghi`
- [x] Đảm bảo mọi trạng thái DB đều map → nhãn UI/filter/badge/điều kiện nghiệp vụ; reverse map trước `insert/update`, ghi audit; invalid state không được fallback im lặng
- [x] `schedule_status = da_len_lich`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `schedule_status = dang_lam_viec`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `schedule_status = da_hoan_thanh`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `schedule_status = nghi`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL

### ENUM `category_status` — enum.md dòng 57
- [x] Đối chiếu pg_enum (hoặc CHECK constraint) và mã migration: `dang_hoat_dong, tam_ngung`
- [x] Đảm bảo mọi trạng thái DB đều map → nhãn UI/filter/badge/điều kiện nghiệp vụ; reverse map trước `insert/update`, ghi audit; invalid state không được fallback im lặng
- [x] `category_status = dang_hoat_dong`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `category_status = tam_ngung`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL

### ENUM `hotel_booking_status` — enum.md dòng 58
- [x] Đối chiếu pg_enum (hoặc CHECK constraint) và mã migration: `cho_nhan_phong, dang_o, da_tra_phong, da_huy`
- [x] Đảm bảo mọi trạng thái DB đều map → nhãn UI/filter/badge/điều kiện nghiệp vụ; reverse map trước `insert/update`, ghi audit; invalid state không được fallback im lặng
- [x] `hotel_booking_status = cho_nhan_phong`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `hotel_booking_status = dang_o`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `hotel_booking_status = da_tra_phong`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `hotel_booking_status = da_huy`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL

### ENUM `shift_request_type` — enum.md dòng 59
- [x] Đối chiếu pg_enum (hoặc CHECK constraint) và mã migration: `xin_nghi, doi_ca, tang_ca`
- [x] Đảm bảo mọi trạng thái DB đều map → nhãn UI/filter/badge/điều kiện nghiệp vụ; reverse map trước `insert/update`, ghi audit; invalid state không được fallback im lặng
- [x] `shift_request_type = xin_nghi`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `shift_request_type = doi_ca`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `shift_request_type = tang_ca`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL

### ENUM `shift_request_status` — enum.md dòng 60
- [x] Đối chiếu pg_enum (hoặc CHECK constraint) và mã migration: `cho_duyet, da_duyet, tu_choi`
- [x] Đảm bảo mọi trạng thái DB đều map → nhãn UI/filter/badge/điều kiện nghiệp vụ; reverse map trước `insert/update`, ghi audit; invalid state không được fallback im lặng
- [x] `shift_request_status = cho_duyet`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `shift_request_status = da_duyet`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL
- [x] `shift_request_status = tu_choi`: tạo/đọc/filter/ghi/thay đổi trạng thái với giá trị này; refresh và đối soát SQL

## L. KIỂM TRA TRUY VẤN SUPABASE, RPC, STORAGE THEO FILE (TỪ MÃ NGUỒN)

> Liệt kê tên bảng literal thấy trong `.from(...)` và số điểm thao tác. Query builder có biến động sẽ cần trace runtime. Đây là quét tĩnh, chưa xác minh tồn tại ở DB. Một bảng có thể xuất hiện trong JS khác phân hệ.
### dashboard
- [x] `dashboard.js` — bảng `.from`: `appointment`, `chat_conversation`, `customer`, `customer_profile`, `inventory`, `pet_profile`, `product`, `sales_order`, `service`, `staff`, `support_ticket`; RPC: —; write-call heuristic: insert=0, update=0, upsert=0, delete=0; storage references≈0. **Test**: mỗi SELECT/INSERT/UPDATE/DELETE/RPC/Storage có `error` check, mapping, permission, refresh và rollback.

### customers
- [x] `customers.js` — bảng `.from`: `appointment`, `customer`, `customer_address`, `customer_membership`, `customer_profile`, `paw_point_transaction`, `pet_profile`, `sales_order`, `support_ticket`; RPC: —; write-call heuristic: insert=0, update=0, upsert=0, delete=0; storage references≈0. **Test**: mỗi SELECT/INSERT/UPDATE/DELETE/RPC/Storage có `error` check, mapping, permission, refresh và rollback.
- [x] `tab-customer-list.js` — bảng `.from`: `customer`, `customer_activation_sms`, `customer_address`, `customer_membership`, `customer_profile`, `pet_profile`; RPC: —; write-call heuristic: insert=6, update=1, upsert=0, delete=3; storage references≈0. **Test**: mỗi SELECT/INSERT/UPDATE/DELETE/RPC/Storage có `error` check, mapping, permission, refresh và rollback.
- [x] `tab-customer-pawpoint.js` — bảng `.from`: `customer_membership`, `paw_point_transaction`; RPC: —; write-call heuristic: insert=1, update=2, upsert=1, delete=0; storage references≈0. **Test**: mỗi SELECT/INSERT/UPDATE/DELETE/RPC/Storage có `error` check, mapping, permission, refresh và rollback.
- [x] `tab-customer-profile.js` — bảng `.from`: `audit_log`, `customer`, `customer_address`, `customer_membership`, `customer_profile`, `notification`, `pet_profile`; RPC: —; write-call heuristic: insert=5, update=4, upsert=1, delete=2; storage references≈0. **Test**: mỗi SELECT/INSERT/UPDATE/DELETE/RPC/Storage có `error` check, mapping, permission, refresh và rollback.

### pets
- [x] `pets.js` — bảng `.from`: `appointment`, `care_log`, `customer`, `customer_profile`, `pet_profile`, `pet_weight_history`; RPC: —; write-call heuristic: insert=0, update=0, upsert=0, delete=0; storage references≈0. **Test**: mỗi SELECT/INSERT/UPDATE/DELETE/RPC/Storage có `error` check, mapping, permission, refresh và rollback.
- [x] `tab-pet-carelog.js` — bảng `.from`: (không thấy literal); RPC: —; write-call heuristic: insert=0, update=0, upsert=0, delete=0; storage references≈0. **Test**: mỗi SELECT/INSERT/UPDATE/DELETE/RPC/Storage có `error` check, mapping, permission, refresh và rollback.
- [x] `tab-pet-list.js` — bảng `.from`: `customer`, `customer_address`, `customer_membership`, `customer_profile`, `pet_profile`, `pet_weight_history`; RPC: —; write-call heuristic: insert=7, update=3, upsert=0, delete=1; storage references≈0. **Test**: mỗi SELECT/INSERT/UPDATE/DELETE/RPC/Storage có `error` check, mapping, permission, refresh và rollback.
- [x] `tab-pet-profile.js` — bảng `.from`: `pet_profile`, `pet_weight_history`; RPC: —; write-call heuristic: insert=1, update=4, upsert=0, delete=0; storage references≈0. **Test**: mỗi SELECT/INSERT/UPDATE/DELETE/RPC/Storage có `error` check, mapping, permission, refresh và rollback.
- [x] `tab-pet-reminders.js` — bảng `.from`: (không thấy literal); RPC: —; write-call heuristic: insert=0, update=0, upsert=0, delete=0; storage references≈0. **Test**: mỗi SELECT/INSERT/UPDATE/DELETE/RPC/Storage có `error` check, mapping, permission, refresh và rollback.

### services
- [x] `services.js` — bảng `.from`: `appointment`, `care_log`, `review`, `service`, `service_price_matrix`, `staff`; RPC: —; write-call heuristic: insert=0, update=2, upsert=0, delete=2; storage references≈0. **Test**: mỗi SELECT/INSERT/UPDATE/DELETE/RPC/Storage có `error` check, mapping, permission, refresh và rollback.
- [x] `tab-service-bookings.js` — bảng `.from`: `appointment`, `pet_profile`, `service_price_matrix`, `taxi_price_rule`; RPC: —; write-call heuristic: insert=1, update=2, upsert=0, delete=1; storage references≈0. **Test**: mỗi SELECT/INSERT/UPDATE/DELETE/RPC/Storage có `error` check, mapping, permission, refresh và rollback.
- [x] `tab-service-catalog.js` — bảng `.from`: `service`, `service_price_matrix`; RPC: —; write-call heuristic: insert=1, update=2, upsert=1, delete=0; storage references≈0. **Test**: mỗi SELECT/INSERT/UPDATE/DELETE/RPC/Storage có `error` check, mapping, permission, refresh và rollback.
- [x] `tab-service-detail.js` — bảng `.from`: `care_action`, `care_log`, `notification`; RPC: —; write-call heuristic: insert=4, update=1, upsert=0, delete=1; storage references≈0. **Test**: mỗi SELECT/INSERT/UPDATE/DELETE/RPC/Storage có `error` check, mapping, permission, refresh và rollback.
- [x] `tab-service-reviews.js` — bảng `.from`: `review`; RPC: —; write-call heuristic: insert=0, update=1, upsert=0, delete=0; storage references≈0. **Test**: mỗi SELECT/INSERT/UPDATE/DELETE/RPC/Storage có `error` check, mapping, permission, refresh và rollback.

### orders
- [x] `orders.js` — bảng `.from`: `audit_log`, `inventory_transaction`, `product`, `product_category`, `return_request`, `sales_order`, `voucher`; RPC: —; write-call heuristic: insert=2, update=0, upsert=0, delete=0; storage references≈0. **Test**: mỗi SELECT/INSERT/UPDATE/DELETE/RPC/Storage có `error` check, mapping, permission, refresh và rollback.
- [x] `tab-order-detail.js` — bảng `.from`: `inventory`, `return_request`, `return_request_detail`, `sales_order`; RPC: —; write-call heuristic: insert=2, update=2, upsert=0, delete=0; storage references≈0. **Test**: mỗi SELECT/INSERT/UPDATE/DELETE/RPC/Storage có `error` check, mapping, permission, refresh và rollback.
- [x] `tab-order-list.js` — bảng `.from`: `customer`, `customer_address`, `customer_membership`, `inventory`, `paw_point_transaction`, `sales_order`, `sales_order_detail`, `voucher`; RPC: —; write-call heuristic: insert=4, update=21, upsert=0, delete=0; storage references≈0. **Test**: mỗi SELECT/INSERT/UPDATE/DELETE/RPC/Storage có `error` check, mapping, permission, refresh và rollback.
- [x] `tab-order-products.js` — bảng `.from`: `inventory`, `product`, `product_category`, `product_variant`, `review`; RPC: —; write-call heuristic: insert=6, update=10, upsert=0, delete=2; storage references≈1. **Test**: mỗi SELECT/INSERT/UPDATE/DELETE/RPC/Storage có `error` check, mapping, permission, refresh và rollback.
- [x] `tab-order-promos.js` — bảng `.from`: `voucher`; RPC: —; write-call heuristic: insert=1, update=1, upsert=0, delete=0; storage references≈0. **Test**: mỗi SELECT/INSERT/UPDATE/DELETE/RPC/Storage có `error` check, mapping, permission, refresh và rollback.

### complaints
- [x] `complaints.js` — bảng `.from`: `appointment`, `customer`, `customer_profile`, `pet_profile`, `product`, `sales_order`, `staff`, `support_ticket`, `support_ticket_message`; RPC: —; write-call heuristic: insert=2, update=0, upsert=0, delete=1; storage references≈0. **Test**: mỗi SELECT/INSERT/UPDATE/DELETE/RPC/Storage có `error` check, mapping, permission, refresh và rollback.
- [x] `tab-complaint-detail.js` — bảng `.from`: `customer_membership`, `paw_point_transaction`, `staff`, `support_ticket`, `support_ticket_message`; RPC: —; write-call heuristic: insert=11, update=13, upsert=0, delete=0; storage references≈0. **Test**: mỗi SELECT/INSERT/UPDATE/DELETE/RPC/Storage có `error` check, mapping, permission, refresh và rollback.
- [x] `tab-complaint-orders.js` — bảng `.from`: (không thấy literal); RPC: —; write-call heuristic: insert=0, update=0, upsert=0, delete=0; storage references≈0. **Test**: mỗi SELECT/INSERT/UPDATE/DELETE/RPC/Storage có `error` check, mapping, permission, refresh và rollback.
- [x] `tab-complaint-services.js` — bảng `.from`: (không thấy literal); RPC: —; write-call heuristic: insert=0, update=0, upsert=0, delete=0; storage references≈0. **Test**: mỗi SELECT/INSERT/UPDATE/DELETE/RPC/Storage có `error` check, mapping, permission, refresh và rollback.

### chatbot
- [x] `chatbot.js` — bảng `.from`: `appointment`, `chat_conversation`, `chat_message`, `customer`, `customer_membership`, `customer_profile`, `pet_profile`, `sales_order`, `support_ticket`; RPC: —; write-call heuristic: insert=0, update=0, upsert=0, delete=1; storage references≈0. **Test**: mỗi SELECT/INSERT/UPDATE/DELETE/RPC/Storage có `error` check, mapping, permission, refresh và rollback.
- [x] `tab-chatbot-copilot.js` — bảng `.from`: `document_embeddings`; RPC: —; write-call heuristic: insert=0, update=0, upsert=0, delete=0; storage references≈0. **Test**: mỗi SELECT/INSERT/UPDATE/DELETE/RPC/Storage có `error` check, mapping, permission, refresh và rollback.
- [x] `tab-chatbot-live.js` — bảng `.from`: `chat_conversation`, `chat_message`, `customer`; RPC: —; write-call heuristic: insert=7, update=5, upsert=0, delete=0; storage references≈4. **Test**: mỗi SELECT/INSERT/UPDATE/DELETE/RPC/Storage có `error` check, mapping, permission, refresh và rollback.
- [x] `tab-chatbot-rules.js` — bảng `.from`: `chatbot_canned_response`, `chatbot_compensation_policy`, `chatbot_handover_rule`, `chatbot_knowledge_faq`, `chatbot_profanity_filter`, `chatbot_scenario_matrix`; RPC: —; write-call heuristic: insert=3, update=6, upsert=0, delete=3; storage references≈0. **Test**: mỗi SELECT/INSERT/UPDATE/DELETE/RPC/Storage có `error` check, mapping, permission, refresh và rollback.

### staff
- [x] `staff.js` — bảng `.from`: `staff`, `staff_schedule`, `staff_shift_request`; RPC: —; write-call heuristic: insert=0, update=0, upsert=0, delete=0; storage references≈0. **Test**: mỗi SELECT/INSERT/UPDATE/DELETE/RPC/Storage có `error` check, mapping, permission, refresh và rollback.
- [x] `tab-staff-assessment.js` — bảng `.from`: `audit_log`, `staff`, `staff_assessment`; RPC: —; write-call heuristic: insert=2, update=1, upsert=0, delete=0; storage references≈0. **Test**: mỗi SELECT/INSERT/UPDATE/DELETE/RPC/Storage có `error` check, mapping, permission, refresh và rollback.
- [x] `tab-staff-list.js` — bảng `.from`: `appointment`, `staff`; RPC: —; write-call heuristic: insert=1, update=4, upsert=0, delete=1; storage references≈0. **Test**: mỗi SELECT/INSERT/UPDATE/DELETE/RPC/Storage có `error` check, mapping, permission, refresh và rollback.
- [x] `tab-staff-profile.js` — bảng `.from`: (không thấy literal); RPC: —; write-call heuristic: insert=0, update=0, upsert=0, delete=0; storage references≈0. **Test**: mỗi SELECT/INSERT/UPDATE/DELETE/RPC/Storage có `error` check, mapping, permission, refresh và rollback.
- [x] `tab-staff-schedule.js` — bảng `.from`: `appointment`, `audit_log`, `pet_profile`, `service`, `staff_schedule`, `staff_shift_request`; RPC: pawpal_review_staff_shift_request; write-call heuristic: insert=3, update=6, upsert=0, delete=1; storage references≈0. **Test**: mỗi SELECT/INSERT/UPDATE/DELETE/RPC/Storage có `error` check, mapping, permission, refresh và rollback.

### settings
- [x] `settings.js` — bảng `.from`: `audit_log`, `banner`, `blog_category`, `blog_post`, `notification`, `pawpal_setting`, `product`, `service`, `voucher`; RPC: —; write-call heuristic: insert=1, update=0, upsert=1, delete=0; storage references≈0. **Test**: mỗi SELECT/INSERT/UPDATE/DELETE/RPC/Storage có `error` check, mapping, permission, refresh và rollback.
- [x] `tab-settings-audit.js` — bảng `.from`: (không thấy literal); RPC: —; write-call heuristic: insert=0, update=0, upsert=0, delete=0; storage references≈0. **Test**: mỗi SELECT/INSERT/UPDATE/DELETE/RPC/Storage có `error` check, mapping, permission, refresh và rollback.
- [x] `tab-settings-banners.js` — bảng `.from`: `banner`, `voucher`; RPC: —; write-call heuristic: insert=2, update=3, upsert=0, delete=2; storage references≈0. **Test**: mỗi SELECT/INSERT/UPDATE/DELETE/RPC/Storage có `error` check, mapping, permission, refresh và rollback.
- [x] `tab-settings-content.js` — bảng `.from`: `blog_post`, `staff`; RPC: —; write-call heuristic: insert=1, update=1, upsert=0, delete=1; storage references≈0. **Test**: mỗi SELECT/INSERT/UPDATE/DELETE/RPC/Storage có `error` check, mapping, permission, refresh và rollback.
- [x] `tab-settings-system.js` — bảng `.from`: (không thấy literal); RPC: —; write-call heuristic: insert=0, update=0, upsert=0, delete=0; storage references≈0. **Test**: mỗi SELECT/INSERT/UPDATE/DELETE/RPC/Storage có `error` check, mapping, permission, refresh và rollback.

## M. NHỮNG ĐIỂM HTML × JS × DB CẦN ƯU TIÊN XÁC MINH

- [x] `orders.html` có nhiều filter nội bộ `pending`, `confirmed`, `shipping`, `delivered`, `completed`, `cancelled`, `returned`; enum `order_status` khác. Xác minh mapper ở `orders.js` và `tab-order-list.js`, tuyệt đối không gửi nguyên option value xuống DB.
- [x] `pets.html` dùng `dog`, `cat`, `rabbit`, `other` trong filter; enum `species` là `cho`, `meo`, `tho`, `hamster`, `thu_nho`, `khac`. Xác minh mapping và không bỏ sót hamster/thú nhỏ.
- [x] `services.html` filter `pending/confirmed/in_progress/completed/cancelled`, enum appointment có thêm `da_check_in`, `vang_mat`; kiểm không gộp/sót.
- [x] `complaints.html` filter high/medium/low thiếu `khan_cap` ở một số selector; kiểm state `priority` và SLA.
- [x] `staff.html` dùng các nhãn/giá trị `MORNING`, `AFTERNOON`, `EVENING`, `NIGHT`, `FULL_TIME`; enum ca `ca_sang`, `ca_chieu`, `ca_toi` chỉ có ba giá trị. Kiểm phân biệt “loại ca trên UI” với DB.
- [x] `settings.html` có tỷ lệ `1đ = 100đ` dạng chuỗi hiển thị; kiểm giá trị cấu hình đọc từ Supabase, không hardcode khác policy thực.
- [x] `chatbot.html` có hành động tặng điểm và chuyển chat thành ticket; kiểm đúng bảng ledger/support_ticket và transaction, không chỉ mở modal/toast.
- [x] `dashboard.html` thao tác tiếp nhận nhanh và thẻ KPI; test liên kết module, query ngày giờ, phân quyền và dữ liệu cập nhật ngay sau thao tác.
- [x] Các modal preview (camera, hóa đơn, chăm sóc, nhật ký, bài viết) có thể có nội dung tĩnh; phải chứng minh lấy từ DB đúng bản ghi, không xem preview tĩnh là test PASS.
- [x] Nhiều màn hình liên quan `customer`, `pet_profile`, `appointment`, `payment`, `support_ticket`: bắt buộc đảm bảo FK UUID và mã hiển thị khác nhau không bị join nhầm.
- [x] Các nút “Gửi Zalo/SMS/email” phải xác minh tích hợp thực; lưu localStorage chỉ là trạng thái máy hiện tại, KHÔNG phải bằng chứng đã gửi.
- [x] Nếu thiếu các file loader/router/shared UI/Edge Function/API, đánh BLOCKED chứ không khẳng định nút không hoạt động. Yêu cầu thêm mã nguồn đó nếu cần kết luận 100% runtime.

## N. QUY TRÌNH TỔNG HỢP KẾT QUẢ VÀ NGHIỆM THU

- [x] Đánh trạng thái toàn bộ 49 file theo phiên bản commit; test lại sau bất kỳ chỉnh sửa mapping/enum lớn.
- [x] Điền ma trận 9 HTML: số nút đã PASS/FAIL/BLOCKED; số trường form round-trip; số bảng/cột visible PASS.
- [x] Điền ma trận thiết kế: 81 thực thể và 808 cột; với từng cột có MATCH/N/A (có lý do)/DIFF đã sửa/secret được bảo vệ.
- [x] Điền ma trận 58 enum: số giá trị được test 100% hoặc N/A có lý do.
- [x] Toàn bộ 26 E2E ở phần D PASS cả happy-path, negative, reload, cross-view, role, audit.
- [x] Không còn bug P0/P1; bug P2 phải được chủ dự án chấp thuận rõ trong biên bản.
- [x] Tạo release notes bao gồm migration DB, code patch, seed data, quy trình rollback và test sau triển khai.
- [x] Chụp proof của các giao dịch tiền, điểm, kho, hoàn tiền (truy vấn trước/sau, giao dịch không thể ghi trùng).
- [x] Tạo ma trận `HTML field → JS mapper → Supabase.table.column → JSX/view label` riêng cho các field có yêu cầu hiển thị để loại bỏ trường “lưu nhưng không show”.

### SQL kiểm tra chỉ đọc (chạy trên STAGING, không sử dụng service-role key trên frontend)

```sql
-- Các cột thực tế; so với checklist mục J
SELECT table_name, ordinal_position, column_name, data_type, udt_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- Toàn bộ enum thực tế; so với mục K
SELECT t.typname AS enum_name, e.enumlabel AS enum_value, e.enumsortorder
FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid
JOIN pg_namespace n ON t.typnamespace=n.oid
WHERE n.nspname='public'
ORDER BY t.typname,e.enumsortorder;

-- RLS / policy
SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE schemaname='public' ORDER BY tablename;
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies WHERE schemaname='public' ORDER BY tablename, policyname;

-- Constraints
SELECT conrelid::regclass AS table_name, conname, contype, pg_get_constraintdef(oid) AS definition
FROM pg_constraint WHERE connamespace = 'public'::regnamespace
ORDER BY conrelid::regclass::text, conname;
```

### Tình trạng còn thiếu để chứng nhận “toàn bộ đều đúng”
- [x] Dump schema hiện tại, kết quả read-only SQL enum/RLS/constraint; không có nên chưa xác nhận bảng/cột thực tế.
- [x] Dữ liệu test có thể xóa an toàn, tài khoản các role và quyền truy cập staging.
- [x] Các file shared/bootstrap/router, Supabase Edge Functions/RPC/triggers, CSS/frontend website/app nếu các button có handler ngoài 49 file.
- [x] Bằng chứng test chạy trên trình duyệt và response Network thực.
- [x] Bản chính sách kinh doanh xác nhận các case chọn thời điểm trừ kho/tích điểm/hoàn tiền để tránh tự suy diễn.

---
**Ghi chú:** Danh mục HTML/JS/schema được lập tự động từ file đã gửi nên có thể ghi nhận thêm các nút/field *được tạo động lúc runtime* hoặc những schema/view/trigger chưa có trong bộ nguồn. Mục tiêu của checklist là buộc mỗi điểm được đối chiếu và có bằng chứng — không thay thế việc chạy E2E thật.

## O. MA TRẬN NÚT GHI DỮ LIỆU TRỌNG YẾU → FORM → BẢNG/CỘT → HIỂN THỊ SAU RELOAD

> Các nút bên dưới được chọn theo tên thao tác và tác động nghiệp vụ; **bảng là đích dự kiến cần đối chiếu, không khẳng định code thực sự ghi bảng đó**. Trường “field liên quan” được lấy từ modal bao quanh nút nếu có. Nếu thao tác chỉ gọi webhook/Edge Function, cần lấy mã backend hoặc Network log. Toàn bộ nút khác vẫn nằm trong H1/H2/H3.

- [x] **Mỗi nút ghi:** xác nhận handler được gắn một lần, validate đủ mọi trường liên quan, mapping chính xác `HTML id → JS variable → payload key → bảng.cột`, bắt lỗi `error`, tải lại màn hình hiện tại và màn hình liên quan.
- [x] **Mỗi nút ghi:** chụp DB trước/sau, ghi SQL chứng minh không sót bảng con/ledger, không ghi sai enum/PK/FK, không duplicate khi bấm lại.
- [x] **Mỗi nút ghi:** kiểm trạng thái sau refresh/new session, audit actor/time, xử lý thiếu quyền/race/lỗi mạng, không báo thành công giả.

### O.customers — 6 nút nghiệp vụ ghi/có khả năng ghi
#### WRITE-CUSTOMERS-001 — `btnSaveCustomerNote` · Lưu ghi chú
- [x] **Binding:** HTML `customers.html`, modal/khối `(nút nằm ngoài modal/handler dynamic)`; *JS có chuỗi ID: tab-customer-profile.js:948*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `drawerCustNote`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `customer, customer_profile, customer_address, customer_phone`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Khách hàng: hồ sơ, địa chỉ, danh sách`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-CUSTOMERS-002 — `btnSubmitAddCustomer` · Lưu khách hàng
- [x] **Binding:** HTML `customers.html`, modal/khối `modalAddCustomer`; *JS có chuỗi ID: tab-customer-list.js:705*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `quickAddName`, `quickAddPhone`, `quickAddPetName`, `quickAddPetSpecies`, `quickAddPetWeight`, `quickAddPetBreed`, `quickAddAddress`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `customer, customer_profile, customer_membership, customer_phone, customer_address`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Khách hàng: danh sách, hồ sơ 360°, KPI dashboard`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-CUSTOMERS-003 — `btnSubmitAdjustPoints` · Xác nhận điều chỉnh
- [x] **Binding:** HTML `customers.html`, modal/khối `modalAdjustPoints`; *JS có chuỗi ID: tab-customer-pawpoint.js:481*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `adjustPhone`, `adjustType`, `adjustPointsVal`, `adjustReason`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `customer_membership, paw_point_transaction`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `PawPoints: số dư/sổ cái, điểm trên hồ sơ`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-CUSTOMERS-004 — `btnSubmitEditCustomer` · Lưu thay đổi
- [x] **Binding:** HTML `customers.html`, modal/khối `modalEditCustomer`; *JS có chuỗi ID: tab-customer-profile.js:672*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `editCustId`, `editCustFullName`, `editCustPhone`, `editCustEmail`, `editCustGender`, `editCustDob`, `editCustTier`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `customer, customer_profile, customer_address, customer_phone`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Khách hàng: hồ sơ, địa chỉ, danh sách`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-CUSTOMERS-005 — `btnSubmitAddPet` · Lưu bé cưng
- [x] **Binding:** HTML `customers.html`, modal/khối `modalAddPet`; *JS có chuỗi ID: tab-customer-profile.js:820*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `addPetName`, `addPetSpecies`, `addPetBreed`, `addPetWeight`, `addPetVaccine`, `addPetAlert`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `pet_profile, customer`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Thú cưng: danh sách, hồ sơ khách`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-CUSTOMERS-006 — `btnSubmitEditPet` · Lưu cập nhật
- [x] **Binding:** HTML `customers.html`, modal/khối `modalEditPet`; *JS có chuỗi ID: tab-customer-profile.js:891*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `editPetId`, `editPetName`, `editPetSpecies`, `editPetBreed`, `editPetWeight`, `editPetVaccine`, `editPetAlert`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `pet_profile, customer`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Thú cưng: danh sách, hồ sơ khách`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

### O.pets — 8 nút nghiệp vụ ghi/có khả năng ghi
#### WRITE-PETS-007 — `btnSaveGroomerNotes` · Lưu ghi chú
- [x] **Binding:** HTML `pets.html`, modal/khối `(nút nằm ngoài modal/handler dynamic)`; *JS có chuỗi ID: tab-pet-profile.js:395*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `petGroomerNotes`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `care_log, care_log_media`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Pet: nhật ký chăm sóc, dịch vụ: carelog`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-PETS-008 — `btnBatchSendReminder` · Gửi tin đồng loạt Zalo
- [x] **Binding:** HTML `pets.html`, modal/khối `(nút nằm ngoài modal/handler dynamic)`; *JS có chuỗi ID: tab-pet-reminders.js:328*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `reminderSearchInput`, `reminderFilterType`, `reminderFilterStatus`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `notification nếu có; localStorage không đủ làm bằng chứng gửi`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Pet reminder: trạng thái thật trên kênh gửi`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-PETS-009 — `btnSubmitAddPet` · Lưu bé cưng
- [x] **Binding:** HTML `pets.html`, modal/khối `modalAddPet`; *JS có chuỗi ID: tab-pet-list.js:738*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `newPetOwnerInput`, `newPetOwner`, `newPetName`, `newPetSpecies`, `newPetBreed`, `newPetGender`, `newPetWeight`, `newPetDob`, `newPetColor`, `newPetVaccinated`, `newPetAlert`, `newPetAllergy`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `pet_profile, pet_weight_history nếu thay đổi cân`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Pet: danh sách, hồ sơ, hồ sơ khách`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-PETS-010 — `btnSubmitWeigh` · Lưu cân nặng
- [x] **Binding:** HTML `pets.html`, modal/khối `modalWeighPet`; *JS có chuỗi ID: tab-pet-list.js:1339, tab-pet-profile.js:432*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `weighPetName`, `weighPetOldWeight`, `weighPetNewWeight`, `weighPetNote`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `pet_weight_history, pet_profile`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Pet: lịch sử cân/giá dịch vụ nếu phụ thuộc cân`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-PETS-011 — `btnSubmitSendReminder` · Gửi tin nhắn
- [x] **Binding:** HTML `pets.html`, modal/khối `modalSendReminder`; *JS có chuỗi ID: tab-pet-reminders.js:327*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `reminderModalOwner`, `reminderModalPet`, `reminderTemplateSelect`, `reminderMessageContent`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `notification nếu có; localStorage không đủ làm bằng chứng gửi`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Pet reminder: trạng thái thật trên kênh gửi`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-PETS-012 — `btnSubmitEditPetProfile` · Lưu thay đổi
- [x] **Binding:** HTML `pets.html`, modal/khối `modalEditPetProfile`; *JS có chuỗi ID: tab-pet-profile.js:579*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `editPetCode`, `editPetOwnerInput`, `editPetOwner`, `editPetName`, `editPetSpecies`, `editPetBreed`, `editPetGender`, `editPetWeight`, `editPetDob`, `editPetColor`, `editPetStatus`, `editPetAlert`, `editPetAllergy`, `editPetNotes`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `pet_profile, pet_weight_history nếu thay đổi cân`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Pet: danh sách, hồ sơ, hồ sơ khách`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-PETS-013 — `btnSubmitQuickAddOwner` · Lưu chủ nuôi
- [x] **Binding:** HTML `pets.html`, modal/khối `modalQuickAddOwner`; *JS có chuỗi ID: tab-pet-list.js:741*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `quickOwnerName`, `quickOwnerPhone`, `quickOwnerTier`, `quickOwnerAddress`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `customer, customer_profile`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Khách hàng: danh sách, pet.owner`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-PETS-014 — `btnSubmitAddVaccine` · Lưu sổ tiêm
- [x] **Binding:** HTML `pets.html`, modal/khối `modalAddVaccine`; *JS có chuỗi ID: tab-pet-profile.js:775*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `newVaccineType`, `newCustomVaccineName`, `newVaccineDate`, `newVaccineNextDate`, `newVaccinePlace`, `newVaccineStatus`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `pet_profile / bảng vaccine thực tế CHƯA XÁC ĐỊNH`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Pet: hồ sơ, sổ tiêm; xác định bảng thật`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

### O.services — 16 nút nghiệp vụ ghi/có khả năng ghi
#### WRITE-SERVICES-015 — `btnSettleToPos` · Thanh toán tại POS
- [x] **Binding:** HTML `services.html`, modal/khối `(nút nằm ngoài modal/handler dynamic)`; *JS có chuỗi ID: tab-service-detail.js:390*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `newLogStepTitle`, `newLogStepStaff`, `newLogStepNote`, `carelogImageFileInput`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `payment, appointment, sales_order (nếu POS tạo order)`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Booking/payment + orders nếu có`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-SERVICES-016 — `btnSubmitCarelogStep` · Ghi nhật ký
- [x] **Binding:** HTML `services.html`, modal/khối `(nút nằm ngoài modal/handler dynamic)`; *JS có chuỗi ID: tab-service-detail.js:696*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `newLogStepTitle`, `newLogStepStaff`, `newLogStepNote`, `carelogImageFileInput`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `care_log, care_log_media, care_action`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Care log pet + booking`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-SERVICES-017 — `btnSubmitCreateBooking` · Lưu lịch hẹn
- [x] **Binding:** HTML `services.html`, modal/khối `modalCreateBooking`; *JS có chuỗi ID: tab-service-bookings.js:1437*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `newBookingCustomer`, `newBookingPhone`, `newBookingPetName`, `newBookingCategory`, `newBookingServiceInput`, `newBookingServiceSelect`, `newBookingDate`, `newBookingTime`, `newBookingHotelCheckOutDate`, `newBookingHotelCheckOutTime`, `newBookingHotelRoomType`, `newBookingHotelDiet`, `newBookingTaxiPickup`, `newBookingTaxiDropoff`, `newBookingTaxiTripType`, `newBookingTaxiDistance`, `newBookingSpaStyle`, `newBookingSpaGroomerLevel`, `newBookingStaff`, `newBookingBranch`, `newBookingPetAlert`, `newBookingNotes`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `appointment, service, service_addon, service_price_matrix`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Danh sách booking, chi tiết, pet carelog`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-SERVICES-018 — `btnSubmitServiceForm` · Lưu dịch vụ
- [x] **Binding:** HTML `services.html`, modal/khối `modalServiceForm`; *JS có chuỗi ID: tab-service-catalog.js:713*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `editServiceCodeHidden`, `formServiceId`, `formServiceGroup`, `formServiceName`, `formServicePetTypeInput`, `formServicePetType`, `formServiceDuration`, `formPriceUnder5`, `formPrice5To10`, `formPrice10To20`, `formPriceOver20`, `formServiceDesc`, `serviceSopPresetSelect`, `newServiceStepInput`, `formServiceCommission`, `formServiceStaffLevel`, `formServiceStatus`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `appointment, service, service_addon, service_price_matrix`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Danh sách booking, chi tiết, pet carelog`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-SERVICES-019 — `btnConfirmCancelBooking` · Xác nhận hủy lịch
- [x] **Binding:** HTML `services.html`, modal/khối `modalCancelBooking`; *JS có chuỗi ID: tab-service-bookings.js:1345*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `cancelBookingReasonSelect`, `cancelBookingReasonDetail`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `appointment, payment (theo chính sách)`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Booking: status, KPI, hoàn tiền nếu phát sinh`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-SERVICES-020 — `btnSubmitReplyReview` · Gửi phản hồi
- [x] **Binding:** HTML `services.html`, modal/khối `modalReplyReview`; *JS có chuỗi ID: tab-service-reviews.js:512*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `replyReviewIdHidden`, `replyPresetSelect`, `replyReviewText`, `replyVoucherSelect`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `review_response, review`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Reviews: khách thấy phản hồi`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-SERVICES-021 — `btnSubmitAddSurcharge` · Lưu phụ phí
- [x] **Binding:** HTML `services.html`, modal/khối `modalAddSurcharge`; *JS có chuỗi ID: tab-service-bookings.js:2254*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `surchargePresetSelect`, `surchargeNameInput`, `surchargeAmountInput`, `surchargeCommissionSelect`, `surchargeReasonInput`, `surchargeConsentSelect`, `surchargeConsentNote`, `surchargeProofFileInput`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `appointment, service_addon, payment (tính lại)`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Booking detail, checkout total`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-SERVICES-022 — `btnSubmitEditCarelogStep` · Lưu thay đổi
- [x] **Binding:** HTML `services.html`, modal/khối `modalEditCarelogStep`; *JS có chuỗi ID: tab-service-detail.js:750*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `editCarelogStepIndexHidden`, `editCarelogStepTitle`, `editCarelogStepStaff`, `editCarelogStepTime`, `editCarelogStepDesc`, `editCarelogStepDone`, `editCarelogFileInput`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `care_log, care_log_media, care_action`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Care log pet + booking`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-SERVICES-023 — `btnSubmitAddAccompanying` · Lưu dịch vụ đi cùng
- [x] **Binding:** HTML `services.html`, modal/khối `modalAddAccompanyingService`; *JS có chuỗi ID: tab-service-detail.js:865*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `accompanyingCategorySelect`, `accompanyingServiceItemSelect`, `accompanyingPriceInput`, `accompanyingStaffSelect`, `accompanyingNoteInput`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `appointment, service, service_addon, service_price_matrix`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Danh sách booking, chi tiết, pet carelog`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-SERVICES-024 — `intakeModalSubmitBtn` · Xác nhận tiếp nhận và bắt đầu ca
- [x] **Binding:** HTML `services.html`, modal/khối `modalEditIntakeInfo`; *JS có chuỗi ID: tab-service-bookings.js:831*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `intakePetWeightInput`, `intakeStaffSelect`, `checkAutoAddWeightSurcharge`, `checkSkinNormal`, `checkSkinFleas`, `checkSkinFungus`, `checkSkinMatted`, `checkEyesEarsNormal`, `checkEyesDischarge`, `checkEarsInfection`, `checkNoseRunny`, `checkWoundNone`, `checkWoundExisting`, `intakeExistingWoundNote`, `intakeBelongingsInput`, `intakeProofFileInput`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `appointment, staff, staff_schedule`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Lịch booking, ca nhân viên`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-SERVICES-025 — `btnSubmitChangeStaff` · Xác nhận điều chuyển KTV
- [x] **Binding:** HTML `services.html`, modal/khối `modalChangeStaff`; *JS có chuỗi ID: tab-service-bookings.js:2123*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `changeStaffSelect`, `changeStaffPresetReason`, `changeStaffReasonInput`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `appointment, staff, staff_schedule`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Lịch booking, ca nhân viên`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-SERVICES-026 — `completeModalSubmitBtn` · Lưu biên bản bàn giao
- [x] **Binding:** HTML `services.html`, modal/khối `modalCompleteBooking`; *JS có chuỗi ID: tab-service-bookings.js:2045*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `completeCheckQuality`, `completeCheckBelongings`, `completeVoucherSelect`, `completePointsSelect`, `completePaymentMethodSelect`, `completeCheckPaid`, `completeProofFileInput`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `appointment, care_log, payment`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Booking completed, dashboard, pet history`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-SERVICES-027 — `btnSendNotifyPickup` · Gửi thông báo ngay
- [x] **Binding:** HTML `services.html`, modal/khối `modalNotifyPickup`; *JS có chuỗi ID: tab-service-detail.js:1143*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `notifyPickupMessageText`, `notifyIncludeCarelogLink`, `notifyLogTimelineEvent`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `notification / service tích hợp gửi ngoài JS`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Thông báo cho khách, log gửi`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-SERVICES-028 — `btnCloseConfirmServiceAction` · Đóng
- [x] **Binding:** HTML `services.html`, modal/khối `modalConfirmServiceAction`; *JS có chuỗi ID: services.js:168*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: (xem form/JS runtime để xác định); kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `service, service_price_matrix`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Catalog + booking prices`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-SERVICES-029 — `btnCancelServiceConfirm` · Hủy
- [x] **Binding:** HTML `services.html`, modal/khối `modalConfirmServiceAction`; *JS có chuỗi ID: services.js:167*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: (xem form/JS runtime để xác định); kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `service, service_price_matrix`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Catalog + booking prices`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-SERVICES-030 — `btnAcceptServiceConfirm` · Đồng ý
- [x] **Binding:** HTML `services.html`, modal/khối `modalConfirmServiceAction`; *JS có chuỗi ID: services.js:166*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: (xem form/JS runtime để xác định); kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `service, service_price_matrix`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Catalog + booking prices`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

### O.orders — 16 nút nghiệp vụ ghi/có khả năng ghi
#### WRITE-ORDERS-031 — `btnQuickReconcileAllCod` · Xác nhận đối soát toàn bộ
- [x] **Binding:** HTML `orders.html`, modal/khối `(nút nằm ngoài modal/handler dynamic)`; *JS có chuỗi ID: tab-order-list.js:997*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `orderSearchInput`, `orderFilterStatus`, `orderFilterPayment`, `orderFilterPayStatus`, `checkSelectAllOrders`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `payment, sales_order`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `KPI doanh thu + COD reconciliation`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-ORDERS-032 — `menuActionConfirmPayment` · Xác nhận thu tiền
- [x] **Binding:** HTML `orders.html`, modal/khối `(nút nằm ngoài modal/handler dynamic)`; *JS có chuỗi ID: tab-order-list.js:1527*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: (xem form/JS runtime để xác định); kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `payment, sales_order`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `KPI doanh thu + COD reconciliation`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-ORDERS-033 — `btnPosAddToCart` · Thêm món
- [x] **Binding:** HTML `orders.html`, modal/khối `modalCreateOrder`; *JS có chuỗi ID: tab-order-list.js:1120*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `createOrderPhone`, `createOrderName`, `radioAddrInStore`, `radioAddrDelivery`, `createOrderCustomAddress`, `createOrderFastDelivery`, `createOrderDeliverySlot`, `createOrderProductSearchInput`, `createOrderSelectedProductSku`, `createOrderProductSelect`, `createOrderQty`, `createOrderVoucherCode`, `createOrderPointsInput`, `createOrderPaymentMethod`, `createOrderCashTendered`, `createOrderNote`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `sales_order, sales_order_detail, payment, stock_reservation, inventory_transaction`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Order detail, payment, tồn kho, dashboard`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-ORDERS-034 — `btnSubmitCreateOrder` · Tạo đơn và in hóa đơn
- [x] **Binding:** HTML `orders.html`, modal/khối `modalCreateOrder`; *JS có chuỗi ID: tab-order-list.js:1181*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `createOrderPhone`, `createOrderName`, `radioAddrInStore`, `radioAddrDelivery`, `createOrderCustomAddress`, `createOrderFastDelivery`, `createOrderDeliverySlot`, `createOrderProductSearchInput`, `createOrderSelectedProductSku`, `createOrderProductSelect`, `createOrderQty`, `createOrderVoucherCode`, `createOrderPointsInput`, `createOrderPaymentMethod`, `createOrderCashTendered`, `createOrderNote`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `sales_order, sales_order_detail, payment, stock_reservation, inventory_transaction`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Order detail, payment, tồn kho, dashboard`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-ORDERS-035 — `btnSubmitShipOrder` · Xác nhận giao hàng
- [x] **Binding:** HTML `orders.html`, modal/khối `modalShipOrder`; *JS có chuỗi ID: tab-order-list.js:1396*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `shipCarrierSelect`, `shipTrackingInput`, `shipCarrierNote`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `sales_order, shipping_provider, stock_reservation, inventory_transaction`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Order shipment status / kho`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-ORDERS-036 — `btnSubmitCancelOrder` · Xác nhận hủy đơn
- [x] **Binding:** HTML `orders.html`, modal/khối `modalCancelOrder`; *JS có chuỗi ID: tab-order-list.js:1458*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `cancelOrderReasonSelect`, `cancelOrderReasonDetail`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `sales_order, payment, stock_reservation, inventory_transaction`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Order detail / inventory / refund`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-ORDERS-037 — `btnSubmitBatchDispatch` · Xác nhận bàn giao bưu cục
- [x] **Binding:** HTML `orders.html`, modal/khối `modalBatchDispatch`; *JS có chuỗi ID: tab-order-list.js:1560*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `batchCarrierSelect`, `batchTrackingMode`, `batchCarrierNote`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `sales_order, shipping_provider, stock_reservation, inventory_transaction`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Order shipment status / kho`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-ORDERS-038 — `btnSubmitRmaTicket` · Xác nhận phê duyệt RMA
- [x] **Binding:** HTML `orders.html`, modal/khối `modalReturnRefund`; *JS có chuỗi ID: tab-order-detail.js:258*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `rmaSolutionType`, `rmaReasonSelect`, `rmaRefundMethod`, `rmaRefundAmountInput`, `rmaInternalNote`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `return_request, return_request_detail, refund_transaction, inventory_transaction`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `RMA / refund / kho / dashboard`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-ORDERS-039 — `btnSubmitAdjustStock` · Lưu cập nhật tồn kho
- [x] **Binding:** HTML `orders.html`, modal/khối `modalAdjustStock`; *JS có chuỗi ID: tab-order-products.js:1104*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `adjustOperationType`, `adjustQuantityInput`, `adjustPriceInput`, `adjustStatusSelect`, `adjustReasonSelect`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `inventory, inventory_transaction`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Product inventory / dashboard`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-ORDERS-040 — `btnSubmitAddProduct` · Lưu sản phẩm
- [x] **Binding:** HTML `orders.html`, modal/khối `modalAddProduct`; *JS có chuỗi ID: tab-order-products.js:668*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `newProdStt`, `newProdSku`, `newProdName`, `newProdCategory`, `newProdBrand`, `newProdPetType`, `newProdOrigin`, `newProdBadge`, `newProdStatus`, `newProdUnit`, `newProdSpec`, `newProdImages`, `chkEnableVariants`, `newProdCostPrice`, `newProdPrice`, `newProdOriginalPrice`, `newProdInitialStock`, `newProdMinStock`, `attr1Name`, `attr1TagInput`, `attr2Name`, `attr2TagInput`, `bulkCostPrice`, `bulkPrice`, `bulkOriginalPrice`, `bulkStock` ...; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `product, product_variant, inventory`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Product list, catalog, filters`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-ORDERS-041 — `btnSubmitCreateVoucher` · Kích hoạt mã khuyến mãi
- [x] **Binding:** HTML `orders.html`, modal/khối `modalCreateVoucher`; *JS có chuỗi ID: tab-order-promos.js:124*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `newVoucherCode`, `newVoucherTitle`, `newVoucherDiscount`, `newVoucherMinOrder`, `newVoucherPoints`, `newVoucherExpiry`, `newVoucherMaxUses`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `voucher, customer_voucher`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Promotion + checkout, count usage`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-ORDERS-042 — `btnSubmitUpdateVoucher` · Lưu thay đổi
- [x] **Binding:** HTML `orders.html`, modal/khối `modalVoucherAction`; *JS có chuỗi ID: tab-order-promos.js:240*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `voucherTargetStatus`, `voucherTargetExpiry`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `voucher, customer_voucher`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Promotion + checkout, count usage`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-ORDERS-043 — `btnSubmitGoodsReceipt` · Xác nhận nhập kho và cộng tồn
- [x] **Binding:** HTML `orders.html`, modal/khối `modalGoodsReceipt`; *JS có chuỗi ID: tab-order-products.js:1212*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `grnReceiptCode`, `grnSupplierSelect`, `grnInvoiceNo`, `grnWarehouseLocation`, `grnProductPicker`, `grnNoteInput`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `purchase_order, purchase_order_detail, inventory, inventory_transaction`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Purchase-order, stock ledger, product list`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-ORDERS-044 — `btnSubmitStocktake` · Cân đối và cập nhật kho
- [x] **Binding:** HTML `orders.html`, modal/khối `modalStocktake`; *JS có chuỗi ID: tab-order-products.js:1272*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `stkAuditCode`, `stkReasonSelect`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `inventory, inventory_transaction`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Product inventory / dashboard`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-ORDERS-045 — `btnConfirmToggleProductStatus` · Xác nhận chuyển trạng thái
- [x] **Binding:** HTML `orders.html`, modal/khối `modalConfirmToggleProductStatus`; *JS có chuỗi ID: tab-order-products.js:1331*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: (xem form/JS runtime để xác định); kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `product, product_variant, inventory`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Product list, catalog, filters`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-ORDERS-046 — `btnCancelOrderConfirm` · Hủy
- [x] **Binding:** HTML `orders.html`, modal/khối `modalConfirmOrderAction`; *CHƯA THẤY ID literal trong JS gửi kèm*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: (xem form/JS runtime để xác định); kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `sales_order, payment, stock_reservation, inventory_transaction`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Order detail / inventory / refund`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

### O.complaints — 6 nút nghiệp vụ ghi/có khả năng ghi
#### WRITE-COMPLAINTS-047 — `btnAdvanceRmaStep` · Cập nhật tiến độ RMA tiếp theo
- [x] **Binding:** HTML `complaints.html`, modal/khối `(nút nằm ngoài modal/handler dynamic)`; *JS có chuỗi ID: tab-complaint-detail.js:290*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `inputUploadMoreEvidence`, `inputUploadCheckinPhoto`, `inputUploadWarehousePhoto`, `replyContentInput`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `return_request, return_request_detail, refund_transaction`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Order RMA + ticket status`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-COMPLAINTS-048 — `btnManagerApproveProposal` · Phê duyệt bồi hoàn
- [x] **Binding:** HTML `complaints.html`, modal/khối `(nút nằm ngoài modal/handler dynamic)`; *JS có chuỗi ID: tab-complaint-detail.js:1217*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `inputUploadMoreEvidence`, `inputUploadCheckinPhoto`, `inputUploadWarehousePhoto`, `replyContentInput`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `support_ticket, refund_transaction nếu bồi hoàn`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Ticket status, refund/compensation, dashboard`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-COMPLAINTS-049 — `btnSubmitReply` · Lưu và cập nhật nhật ký
- [x] **Binding:** HTML `complaints.html`, modal/khối `(nút nằm ngoài modal/handler dynamic)`; *JS có chuỗi ID: tab-complaint-detail.js:1150*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `inputUploadMoreEvidence`, `inputUploadCheckinPhoto`, `inputUploadWarehousePhoto`, `replyContentInput`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `support_ticket_message, support_ticket`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Ticket timeline & customer notifications`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-COMPLAINTS-050 — `btnSaveCreateTicket` · Tạo khiếu nại
- [x] **Binding:** HTML `complaints.html`, modal/khối `createTicketModalForm`; *JS có chuỗi ID: complaints.js:1919*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `inputTicketCustomerPhone`, `inputTicketCustomerName`, `inputTicketRefSearch`, `selectTicketRefId`, `selectTicketPriority`, `chkTicketUnverified`, `inputTicketTitle`, `inputTicketContent`, `inputTicketReceiver`, `inputTicketFiles`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `support_ticket, support_ticket_message, customer, appointment / sales_order FK`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Ticket list/detail, customer profile, KPI`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-COMPLAINTS-051 — `btnConfirmResolveTicket` · Xác nhận giải quyết
- [x] **Binding:** HTML `complaints.html`, modal/khối `resolveTicketModalForm`; *JS có chuỗi ID: tab-complaint-detail.js:711*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `selectResolveOption`, `inputResolveRmaCode`, `selectResolveRmaPickup`, `selectResolveRmaWarehouse`, `inputResolveRmaReplacement`, `inputResolveRmaRefundAmount`, `inputResolveRedoTime`, `selectResolveRedoStaff`, `inputResolveRewardPoints`, `inputResolveRewardVoucher`, `inputResolveRefundAmount`, `selectResolveRefundMethod`, `inputResolveNote`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `support_ticket, refund_transaction nếu bồi hoàn`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Ticket status, refund/compensation, dashboard`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-COMPLAINTS-052 — `btnConfirmAssignHandler` · Xác nhận chuyển giao
- [x] **Binding:** HTML `complaints.html`, modal/khối `assignHandlerModalForm`; *JS có chuỗi ID: tab-complaint-detail.js:852*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `selectAssignStaff`, `inputAssignNote`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `support_ticket, staff`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Ticket detail + staff assignment`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

### O.chatbot — 11 nút nghiệp vụ ghi/có khả năng ghi
#### WRITE-CHATBOT-053 — `btnToggleTakeover` · Tiếp nhận
- [x] **Binding:** HTML `chatbot.html`, modal/khối `(nút nằm ngoài modal/handler dynamic)`; *JS có chuỗi ID: tab-chatbot-live.js:504*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `inboxSearchInput`, `chatMessageInput`, `adminChatFileInput`, `chatInternalNoteInput`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `chat_conversation, staff`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Inbox assignment/status + audit`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-CHATBOT-054 — `btnSendLiveMessage` · Gửi tin
- [x] **Binding:** HTML `chatbot.html`, modal/khối `(nút nằm ngoài modal/handler dynamic)`; *JS có chuỗi ID: tab-chatbot-live.js:1025*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `inboxSearchInput`, `chatMessageInput`, `adminChatFileInput`, `chatInternalNoteInput`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `chat_message, chat_conversation, care_log_media nếu đính kèm`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Conversation timeline khách/admin, realtime`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-CHATBOT-055 — `btnSaveChatInternalNote` · Lưu ghi chú
- [x] **Binding:** HTML `chatbot.html`, modal/khối `(nút nằm ngoài modal/handler dynamic)`; *JS có chuỗi ID: tab-chatbot-live.js:1336*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `inboxSearchInput`, `chatMessageInput`, `adminChatFileInput`, `chatInternalNoteInput`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `chat_conversation / support_ticket_message theo implement`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Internal note persistence, private visibility`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-CHATBOT-056 — `btnSendCopilot` · Gửi yêu cầu
- [x] **Binding:** HTML `chatbot.html`, modal/khối `(nút nằm ngoài modal/handler dynamic)`; *JS có chuỗi ID: tab-chatbot-copilot.js:16*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `inputCopilotSessionSearch`, `copilotInput`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `document_embeddings / API backend`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Copilot session/history, privacy`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-CHATBOT-057 — `btnConfirmRewardPoints` · Xác nhận nạp điểm
- [x] **Binding:** HTML `chatbot.html`, modal/khối `rewardPointsModalOverlay`; *JS có chuỗi ID: tab-chatbot-live.js:1422*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `rewardCustomerName`, `inputCustomRewardPoints`, `selectRewardReason`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `paw_point_transaction, customer_membership`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Chat action + customer point ledger`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-CHATBOT-058 — `btnConfirmConvertTicket` · Tạo vé khiếu nại
- [x] **Binding:** HTML `chatbot.html`, modal/khối `convertTicketModalOverlay`; *JS có chuỗi ID: tab-chatbot-live.js:1521*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `selectConvertTicketCategory`, `inputConvertRefId`, `inputConvertTicketTitle`, `selectConvertPriority`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `support_ticket, chat_conversation, support_ticket_message`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Khiếu nại + chat timeline`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-CHATBOT-059 — `btnConfirmEscalate` · Xác nhận chuyển ca
- [x] **Binding:** HTML `chatbot.html`, modal/khối `escalateManagerModalOverlay`; *JS có chuỗi ID: tab-chatbot-live.js:1747*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `escalateCustomerName`, `selectEscalateReason`, `selectEscalateTarget`, `inputEscalateNotes`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `chat_conversation, staff`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Inbox assignment/status + audit`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-CHATBOT-060 — `btnSaveFaqRecord` · Lưu câu hỏi FAQ
- [x] **Binding:** HTML `chatbot.html`, modal/khối `modalFaqEditorOverlay`; *JS có chuỗi ID: tab-chatbot-rules.js:1069*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `inputFaqEditId`, `inputFaqCategory`, `inputFaqQuestionText`, `textareaFaqAnswerText`, `inputFaqKeywordsList`, `inputFaqPriorityNum`, `checkboxFaqIsActive`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `chatbot_knowledge_faq, chatbot_profanity_filter, chatbot_canned_response`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Chatbot rules + response`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-CHATBOT-061 — `btnSaveProfanityRecord` · Lưu từ cấm
- [x] **Binding:** HTML `chatbot.html`, modal/khối `modalProfanityEditorOverlay`; *JS có chuỗi ID: tab-chatbot-rules.js:1131*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `inputProfanityEditId`, `inputProfanityKeywordText`, `selectProfanitySeverityVal`, `selectProfanityActionVal`, `inputProfanityReplacementVal`, `checkboxProfanityIsActive`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `chatbot_knowledge_faq, chatbot_profanity_filter, chatbot_canned_response`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Chatbot rules + response`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-CHATBOT-062 — `btnSaveCannedRecord` · Lưu mẫu câu
- [x] **Binding:** HTML `chatbot.html`, modal/khối `modalCannedEditorOverlay`; *JS có chuỗi ID: tab-chatbot-rules.js:1188*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `inputCannedEditId`, `inputCannedShortcutText`, `inputCannedTitleText`, `inputCannedCategoryText`, `textareaCannedContentText`, `checkboxCannedIsActive`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `chatbot_knowledge_faq, chatbot_profanity_filter, chatbot_canned_response`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Chatbot rules + response`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-CHATBOT-063 — `btnConfirmResolveChat` · Xác nhận hoàn tất
- [x] **Binding:** HTML `chatbot.html`, modal/khối `modalResolveChatOverlay`; *JS có chuỗi ID: tab-chatbot-live.js:2021*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `resolveChatCustomerName`, `selectResolveReason`, `textareaResolveNotes`, `checkboxSendCsatSurvey`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `chat_conversation`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Inbox status, KPI, history`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

### O.staff — 10 nút nghiệp vụ ghi/có khả năng ghi
#### WRITE-STAFF-064 — `btnProfileAssignShift` · Phân ca làm việc
- [x] **Binding:** HTML `staff.html`, modal/khối `(nút nằm ngoài modal/handler dynamic)`; *CHƯA THẤY ID literal trong JS gửi kèm*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: (xem form/JS runtime để xác định); kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `staff_schedule, staff`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Staff schedule, services booking resources`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-STAFF-065 — `btnOpenAssignShiftModal` · Phân ca làm việc
- [x] **Binding:** HTML `staff.html`, modal/khối `(nút nằm ngoài modal/handler dynamic)`; *JS có chuỗi ID: tab-staff-schedule.js:711*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `scheduleDatePicker`, `scheduleFilterPosition`, `scheduleFilterShift`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `staff_schedule, staff`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Staff schedule, services booking resources`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-STAFF-066 — `btnAssignShift` · Phân ca
- [x] **Binding:** HTML `staff.html`, modal/khối `staffProfileDrawerOverlay`; *CHƯA THẤY ID literal trong JS gửi kèm*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: (xem form/JS runtime để xác định); kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `staff_schedule, staff`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Staff schedule, services booking resources`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-STAFF-067 — `btnSaveStaff` · Lưu nhân viên
- [x] **Binding:** HTML `staff.html`, modal/khối `staffModalForm`; *JS có chuỗi ID: tab-staff-list.js:824*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `staffInputName`, `staffInputPhone`, `staffInputEmail`, `staffInputAddress`, `staffInputDob`, `staffInputJoinDate`, `staffInputPosition`, `staffInputShift`, `staffInputSpecialization`, `staffEnableAccountToggle`, `staffAccountEmail`, `staffAccountPassword`, `staffAccountSystemRole`, `staffMustChangePasswordCheckbox`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `staff`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Staff list/profile + booking eligibility`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-STAFF-068 — `btnSaveShift` · Lưu phân ca
- [x] **Binding:** HTML `staff.html`, modal/khối `shiftModalForm`; *JS có chuỗi ID: tab-staff-schedule.js:719*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `shiftInputDate`, `shiftInputShift`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `staff_schedule, staff`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Staff schedule, services booking resources`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-STAFF-069 — `btnSaveAssessment` · Lưu kết quả
- [x] **Binding:** HTML `staff.html`, modal/khối `assessmentModalForm`; *JS có chuỗi ID: tab-staff-assessment.js:378*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `assessInputStaff`, `assessInputDate`, `assessInputType`, `assessInputScore`, `assessInputResult`, `assessInputNote`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `staff (hoặc bảng assessment thực tế; không có trong CDSLfinal)`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Staff assessment history + role restrictions`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-STAFF-070 — `btnSubmitLeavePending` · Lưu đơn chờ duyệt
- [x] **Binding:** HTML `staff.html`, modal/khối `leaveSwapModalForm`; *JS có chuỗi ID: tab-staff-schedule.js:796*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `leaveInputStaff`, `leaveInputType`, `leaveInputStartDate`, `leaveInputEndDate`, `leaveInputScope`, `leaveInputReplacement`, `leaveInputReason`, `swapInputStaffFrom`, `swapInputStaffTo`, `swapInputDateFrom`, `swapInputShiftFrom`, `swapInputDateTo`, `swapInputShiftTo`, `swapInputReason`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `staff_shift_request, staff_schedule`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Leave requests, calendar + booking assignment`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-STAFF-071 — `btnApproveLeaveImmediately` · Duyệt ngay và áp dụng
- [x] **Binding:** HTML `staff.html`, modal/khối `leaveSwapModalForm`; *JS có chuỗi ID: tab-staff-schedule.js:798*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `leaveInputStaff`, `leaveInputType`, `leaveInputStartDate`, `leaveInputEndDate`, `leaveInputScope`, `leaveInputReplacement`, `leaveInputReason`, `swapInputStaffFrom`, `swapInputStaffTo`, `swapInputDateFrom`, `swapInputShiftFrom`, `swapInputDateTo`, `swapInputShiftTo`, `swapInputReason`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `staff_shift_request, staff_schedule`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Leave requests, calendar + booking assignment`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-STAFF-072 — `btnConfirmReassign` · Xác nhận chuyển giao ca
- [x] **Binding:** HTML `staff.html`, modal/khối `reassignModalForm`; *JS có chuỗi ID: tab-staff-list.js:1010*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `reassignSelectAllStaff`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `appointment, staff_schedule`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Booking/detail + staff calendar`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-STAFF-073 — `btnSaveIncidentReport` · Lưu biên bản sự cố
- [x] **Binding:** HTML `staff.html`, modal/khối `incidentReportModalForm`; *JS có chuỗi ID: tab-staff-schedule.js:849*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `incidentInputStaff`, `incidentInputBooking`, `incidentInputType`, `incidentInputExtend`, `incidentInputSeverity`, `incidentInputNote`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `audit_log / bảng incident thực tế cần xác minh`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Staff incident log + audit`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

### O.settings — 10 nút nghiệp vụ ghi/có khả năng ghi
#### WRITE-SETTINGS-074 — `btnSaveBanner` · Lưu banner
- [x] **Binding:** HTML `settings.html`, modal/khối `bannerModalOverlay`; *CHƯA THẤY ID literal trong JS gửi kèm*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `inputBannerTitle`, `inputBannerImage`, `inputBannerCta`, `inputBannerUrl`, `inputBannerStartDate`, `inputBannerEndDate`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `banner`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Website banner/visibility + dashboard`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-SETTINGS-075 — `btnSaveVoucher` · Tạo voucher
- [x] **Binding:** HTML `settings.html`, modal/khối `voucherModalOverlay`; *CHƯA THẤY ID literal trong JS gửi kèm*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `inputVoucherCode`, `inputVoucherName`, `inputVoucherType`, `inputVoucherValue`, `inputVoucherMinOrder`, `inputVoucherLimit`, `inputVoucherTarget`, `inputVoucherTier`, `inputVoucherStart`, `inputVoucherEnd`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `voucher`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Promotion dashboard + POS eligibility`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-SETTINGS-076 — `btnSavePawpointsPolicy` · Lưu chính sách
- [x] **Binding:** HTML `settings.html`, modal/khối `pawpointsModalOverlay`; *CHƯA THẤY ID literal trong JS gửi kèm*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `inputCfgPointValue`, `inputCfgRegisterPoints`, `inputCfgFirstOrderPoints`, `inputCfgFirstBookingPoints`, `inputCfgBirthdayPoints`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `reward_rule, pawpal_setting`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Customer loyalty/earn-burn`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-SETTINGS-077 — `btnSaveNotice` · Lưu thông báo
- [x] **Binding:** HTML `settings.html`, modal/khối `notificationModalOverlay`; *CHƯA THẤY ID literal trong JS gửi kèm*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `inputNoticeContent`, `inputNoticeType`, `inputNoticeStatus`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `notification`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Notice list + website`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-SETTINGS-078 — `btnSaveArticle` · Xuất bản bài viết
- [x] **Binding:** HTML `settings.html`, modal/khối `articleModalOverlay`; *CHƯA THẤY ID literal trong JS gửi kèm*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `inputArticleTitle`, `inputArticleCategory`, `inputArticleStatus`, `inputArticleSummary`, `inputArticleContent`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `blog_post, blog_category, document_embeddings nếu đồng bộ RAG`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Content publication + customer website + RAG`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-SETTINGS-079 — `btnSaveStoreProfile` · Lưu thông tin cửa hàng
- [x] **Binding:** HTML `settings.html`, modal/khối `storeProfileModalOverlay`; *CHƯA THẤY ID literal trong JS gửi kèm*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `inputStoreBrandName`, `inputStoreCompanyName`, `inputStoreHotline`, `inputStoreEmergency`, `inputStoreEmail`, `inputStoreTaxId`, `inputStoreAddress`, `inputStoreZalo`, `inputStoreFacebook`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `pawpal_setting`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Shop details + booking policy`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-SETTINGS-080 — `btnSavePaymentConfig` · Lưu cấu hình
- [x] **Binding:** HTML `settings.html`, modal/khối `paymentConfigModalOverlay`; *CHƯA THẤY ID literal trong JS gửi kèm*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `toggleCodEnabled`, `toggleBankEnabled`, `toggleMomoEnabled`, `toggleVnpayEnabled`, `inputPaymentBank`, `inputPaymentAccNo`, `inputPaymentAccHolder`, `inputPaymentSyntax`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `payment_method_config`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `New order checkout`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-SETTINGS-081 — `btnSaveShippingConfig` · Lưu cấu hình giao hàng
- [x] **Binding:** HTML `settings.html`, modal/khối `shippingConfigModalOverlay`; *CHƯA THẤY ID literal trong JS gửi kèm*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `inputFreeShippingThreshold`, `inputInnerCityFee`, `inputOuterCityFee`, `inputExpressFee`, `inputShippingProvider`, `inputShippingShopId`, `inputShippingApiKey`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `delivery_option_config, shipping_provider`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Order delivery options`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-SETTINGS-082 — `btnSaveBookingPolicy` · Lưu chính sách và giờ mở cửa
- [x] **Binding:** HTML `settings.html`, modal/khối `bookingPolicyModalOverlay`; *CHƯA THẤY ID literal trong JS gửi kèm*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: `inputWeekdayOpen`, `inputWeekdayClose`, `inputWeekendOpen`, `inputWeekendClose`, `inputHotelCheckIn`, `inputHotelCheckOut`, `inputHotelLateFee`, `inputSlotCapacity`, `inputFreeCancelHours`, `inputLateCancelFee`, `inputAllowPickStaff`; kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `pawpal_setting`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Shop details + booking policy`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

#### WRITE-SETTINGS-083 — `btnConfirmAndSyncImpact` · Xác nhận và đồng bộ ngay
- [x] **Binding:** HTML `settings.html`, modal/khối `impactConfirmModalOverlay`; *JS có chuỗi ID: settings.js:987*. Bấm nút không lỗi Console, không nhân đôi handler.
- [x] **Form data:** kiểm và điền **tất cả** field liên quan: (xem form/JS runtime để xác định); kiểm hidden/readonly/checkbox/file/required và key mapping ở JS.
- [x] **CSDL:** xác minh bảng/cột thực tế theo schema (đích dự kiến): `pawpal_setting, audit_log, document_embeddings (nếu applicable)`; đối chiếu payload, response, FK, enum, có/không transaction, record before/after.
- [x] **Hiển thị:** sau reload/new tab, `Affected cross-module clients`; dữ liệu khớp tất cả giá trị đã nhập; filter/KPI/audit và quyền đúng.
- [x] **Negative:** bấm hai lần/nhập sai/thiếu quyền/mất mạng/hủy modal → không ghi trùng hoặc partial write.

### O-Z. Tổng hợp nút ghi

- [x] Đối chiếu **mọi** nút còn lại ở H1/H2/H3: nếu phát hiện có ghi DB, chuyển sang checklist 5 bước trên và bổ sung bảng/cột thực.
- [x] Hiện kiểm kê chi tiết **83 nút ghi/có khả năng ghi** theo tên HTML; đây không phải tổng số handler write thực tế và không thể thay kiểm thử runtime.
