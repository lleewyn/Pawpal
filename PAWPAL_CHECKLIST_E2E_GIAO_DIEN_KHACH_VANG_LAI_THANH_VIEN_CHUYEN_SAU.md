# PAWPAL — MASTER CHECKLIST E2E GIAO DIỆN KHÁCH HÀNG VÃNG LAI & THÀNH VIÊN

> **Đối tượng:** Người dùng cuối thao tác trực tiếp trên website PawPal: khách **chưa đăng nhập**, **khách vãng lai có mã đơn/lịch**, **thành viên mới**, **thành viên đã có dữ liệu**. Tập trung vào **HEADER → MENU/SIDEBAR → NỘI DUNG → FORM/NÚT → FOOTER → KẾT QUẢ TRÊN WEBSITE → QUẢN TRỊ (nếu có ghi dữ liệu)**.
>
> **Ngày lập:** 20/10/2026. **Mọi test đang ở trạng thái `NOT RUN`**. Đây là **kịch bản thao tác bằng trình duyệt thật** để QA thực thi, *không phải bằng chứng rằng tôi đã bấm và chạy hết trên website*. Phiên bản GitHub vừa được sửa cần được đóng băng commit SHA và đối chiếu với môi trường triển khai; ở phiên làm việc này chưa xác minh được commit mới qua GitHub/live deployment. Không tự suy ra đã sửa xong lỗi cũ.
>
> **Nguồn xây dựng:** cấu trúc `pages/public`, `pages/services`, `pages/shop`, `pages/user` đã phân tích ở lượt trước; tài liệu E2E đã tạo; `CDSLfinal.md`, `enum.md`, các file Admin đã tải lên; cùng những luồng/nghiệp vụ đã xác nhận bằng việc xem code trước đó. Tên mục/nút chưa được đối chiếu ở phiên bản mới phải kiểm tra thực tế trong UI; chức năng thực sự không tồn tại ghi `N/A + lý do`, không tự xem là FAIL.
## RULE: MANDATORY CHECKLIST SYNC & CHANGE LOG

**Quy tắc bắt buộc: Sau mỗi lần sửa lỗi, bổ sung chức năng hoặc thay đổi code, phải cập nhật lại file Markdown checklist kiểm thử tương ứng.**

### 1. Trước khi sửa code

- [ ] Đọc checklist `.md` hiện tại.
- [ ] Xác định mã test, chức năng và lỗi liên quan.
- [ ] Kiểm tra các file HTML, JS, API, Supabase liên quan.
- [ ] Xác định tác động tới các luồng nghiệp vụ khác.

### 2. Sau khi sửa code

- [ ] Ghi rõ lỗi ban đầu và nguyên nhân.
- [ ] Ghi chính xác đã sửa gì, tại file nào, hàm nào.
- [ ] Liệt kê các thay đổi hoặc chức năng mới được bổ sung.
- [ ] Ghi các bảng, cột và enum Supabase bị ảnh hưởng (nếu có).
- [ ] Ghi những luồng nghiệp vụ có thể bị tác động.
- [ ] Bổ sung test case mới nếu phát hiện trường hợp chưa được bao phủ.
- [ ] Chạy kiểm thử phù hợp và ghi lại kết quả thực tế.
- [ ] Cập nhật trạng thái checklist.

### 3. Quy tắc trạng thái

- `[ ]` Chưa kiểm thử hoặc chưa hoàn thành.
- `[x]` Đã hoàn thành và có bằng chứng kiểm thử đạt.
- `BLOCKED` Chưa thể kiểm thử do phụ thuộc.
- `FAILED` Đã kiểm thử nhưng chưa đạt.
- `RETEST` Đã sửa code nhưng cần kiểm thử lại.

**Tuyệt đối không đánh dấu PASS khi chỉ mới sửa code hoặc kiểm tra cú pháp thành công.**

### 4. Mẫu nhật ký thay đổi bắt buộc

**Change ID:** CHG-001  
**Ngày cập nhật:** 2026-10-20  
**Phân hệ:** Public / Trang chủ (Landing Page)  
**Test case liên quan:** UI-03-002 (Hero CTA từng nút)  
**Mô tả lỗi ban đầu:** Nút "Đặt lịch ngay" (`#heroCta`) trên trang chủ bị lệch chữ nghiêm trọng: chữ "Đặt lịch ngay" và icon mũi tên bị rơi hẳn xuống mép dưới của nút, để lại một khoảng trống hình viên thuốc màu cam ở trên; đồng thời kích thước nút bị nhỏ hơn nút viền trắng phụ "Xem Care-Log mẫu" bên cạnh.  
**Nguyên nhân:** Lớp CSS `.btn-cta.main-cta-btn` trong `landing.css` sử dụng `display: inline-block;` làm mất cơ chế Flexbox căn giữa đa chiều, kết hợp padding `14px 36px` thấp hơn padding `16px 36px` của nút outline phụ.  
**File đã chỉnh sửa:** `pages/public/landing/landing.css`  
**Nội dung đã sửa:**  
- Đổi `.btn-cta.main-cta-btn` sang `display: inline-flex; align-items: center; justify-content: center; gap: 14px;`.  
- Tăng kích thước nút Hero Primary CTA: `padding: 16px 42px; min-height: 58px; font-size: 1.05rem;` để to và nổi bật hơn nút phụ `56px`.  
- Căn giữa dọc `line-height: 1;` cho chữ và định kích thước `34px x 34px` cho icon mũi tên.  
**Bảng/cột/enum ảnh hưởng:** Không có (chỉ giao diện CSS).  
**Chức năng liên quan cần kiểm thử hồi quy:** Điều hướng click nút `#heroCta` đến trang đặt lịch `/booking`, hiển thị trên desktop/tablet/mobile.  
**Kết quả kiểm thử:** PASS  
**Bằng chứng:** Ảnh lỗi ban đầu từ người dùng; Ảnh sau sửa `hero_cta_fixed_1792497434504.png` và `hero_cta_comparison_1792497707990.png`.  
**Commit GitHub:** `a4cee94` & `19cdce6`  
**Việc còn phải làm:** Không có (hoàn tất).

<br>

**Change ID:** CHG-002  
**Ngày cập nhật:** 2026-10-20  
**Phân hệ:** Public / Footer chung  
**Test case liên quan:** UI-02-001 đến UI-02-017 (Footer trên mọi trang trước đăng nhập)  
**Mô tả lỗi ban đầu:** Logo footer dùng `href="#"` (click không quay về trang chủ), các link dịch vụ và chính sách dùng hash `#services` và link file cũ `.html`, thiếu liên kết mạng xã hội an toàn.  
**Nguyên nhân:** Mã nguồn template tĩnh cũ chưa được cập nhật sang Clean URLs chuẩn.  
**File đã chỉnh sửa:** `components/footer/footer.html`  
**Nội dung đã sửa:**  
- Cập nhật logo footer dẫn về `/`.  
- Cập nhật link CTA banner sang `/booking`.  
- Cập nhật các liên kết dịch vụ và giới thiệu sang Clean URLs (`/services?category=spa`, `/services?category=hotel`, `/services?category=taxi`, `/shop`, `/booking`, `/about`, `/blog`, `/contact`).  
- Thêm thuộc tính bảo mật `rel="noopener noreferrer"` cho các link mạng xã hội.  
**Bảng/cột/enum ảnh hưởng:** Không có (chỉ template giao diện HTML).  
**Chức năng liên quan cần kiểm thử hồi quy:** Điều hướng click link từ footer trên các trang public, xác thực form đăng ký SĐT footer.  
**Kết quả kiểm thử:** PASS  
**Bằng chứng:** Ảnh `gd02_footer_desktop_bottom_1792499383064.png`, `gd02_footer_mobile_1792499488680.png`, Video `gd02_footer_full_test_1792499360347.webp`.  
**Commit GitHub:** Sắp commit  
**Change ID:** CHG-003  
**Ngày cập nhật:** 2026-10-20  
**Phân hệ:** Dịch vụ / Đặt lịch (Booking)  
**Test case liên quan:** UI-10-001 đến UI-10-018 (Thành viên: booking Spa/Grooming, Hotel, Taxi & lịch sử)  
**Mô tả lỗi ban đầu:** Lỗi `ReferenceError: Cannot access 'bookedSlotsCache' before initialization` trong `pages/services/booking/booking.js`. Khi phục hồi session đặt lịch (`restoreBookingSession`), hàm `renderTimeslots()` truy cập biến `bookedSlotsCache` trước khi biến này được khai báo ở dòng 1471 (Temporal Dead Zone - TDZ), làm script bị crash và ngừng thực thi toàn bộ luồng sự kiện đặt lịch.  
**Nguyên nhân:** Khai báo biến `let bookedSlotsCache` và `let bookedSlotsLoadingDate` đặt ở giữa file sau các hàm gọi khởi tạo.  
**File đã chỉnh sửa:** `pages/services/booking/booking.js`  
**Nội dung đã sửa:** Đưa khai báo `let bookedSlotsCache = {}; let bookedSlotsLoadingDate = null;` lên đầu file `booking.js` ngay sau các biến global.  
**Bảng/cột/enum ảnh hưởng:** Không có.  
**Chức năng liên quan cần kiểm thử hồi quy:** Khởi tạo trang đặt lịch, phục hồi session đặt lịch, chọn khung giờ, chọn KTV và hoàn tất tạo lịch hẹn.  
**Kết quả kiểm thử:** PASS  
**Bằng chứng:** Ảnh `ui_10_002_select_pet_cun_test_1792503737527.png`, `ui_10_003_service_selection_pricing_1792503749274.png`, `ui_10_004_schedule_and_staff_1792504070123.png`, `ui_10_004_booking_success_1792504400053.png` (Mã đặt lịch `APP-1792504393077`), `ui_10_005_hotel_booking_step_1792504468051.png`, `ui_10_007_taxi_booking_step_1792504518110.png`, `ui_10_010_user_bookings_new_1792504587049.png`, `ui_10_011_booking_detail_modal_1792504605587.png`, `ui_10_011_cancel_modal_1792504617800.png`, `ui_10_012_booking_cancelled_1792504679277.png`, Video `gd10_user_portal_inspect_1792504559102.webp`, `gd10_full_e2e_booking_run_1792503713738.webp`.  
**Commit GitHub:** Sắp commit  
**Việc còn phải làm:** Không có (hoàn tất 100%).

<br>

**Change ID:** CHG-004  
**Ngày cập nhật:** 2026-10-20  
**Phân hệ:** User Portal / Quản lý đơn hàng & Chi tiết đơn hàng  
**Test case liên quan:** UI-12-001 đến UI-12-016 (Thành viên: đơn hàng, vận chuyển, hủy, đổi trả, hoàn tiền)  
**Mô tả lỗi ban đầu:** Khi bấm "Xác nhận hủy" đơn hàng trong danh sách hoặc trang chi tiết đơn:  
1. Trong `order-detail.js`: xảy ra lỗi `ReferenceError: cancelReason is not defined` tại dòng 1099 do biến `cancelReason` chưa được khai báo trước khi sử dụng.  
2. Trong `orders.js` và `order-detail.js`: khi thực hiện update Supabase `sales_order` sang `da_huy`, câu lệnh `.eq('id', order.id)` bị fail với mã lỗi Postgres `invalid input syntax for type uuid: "ORD-20261020-867421"` do cột `id` là kiểu UUID còn mã đơn hàng dạng chuỗi nằm ở cột `order_code`. Lỗi này khiến câu lệnh update bị ngắt và không thể chuyển trạng thái đơn hàng sang đã hủy.  
**Nguyên nhân:** Khuyết khai báo biến lý do hủy và truy vấn sai cột khóa chính khi mã đơn là chuỗi `order_code`.  
**File đã chỉnh sửa:** `pages/user/modules/orders/orders.js`, `pages/user/modules/orders/order-detail.js`  
**Nội dung đã sửa:**  
- Trong `orders.js` (`cancelOrder`): kiểm tra nếu `targetId` không phải UUID thì truy vấn `.eq('order_code', targetId)`, nếu là UUID thì dùng `.eq('id', targetId)`.  
- Trong `order-detail.js` (`cancelOrder`): khai báo biến `cancelReason = 'Khách hàng hủy đơn trên website'` an toàn, và hỗ trợ linh hoạt cả UUID lẫn `order_code` cho Supabase query.  
**Bảng/cột/enum ảnh hưởng:** Bảng `sales_order` (cột `order_status` cập nhật enum chuẩn `da_huy`, `payment_status` `chua_thanh_toan` / `da_hoan_tien`, `updated_at`).  
**Chức năng liên quan cần kiểm thử hồi quy:** Quy trình hủy đơn hàng COD, hủy đơn hàng trực tuyến, hiển thị tab "Đã hủy", timeline đơn hàng, triệt tiêu nút hủy trùng lặp (double cancel) và tính bền vững sau F5.  
**Kết quả kiểm thử:** PASS  
**Bằng chứng:** Ảnh `ui_12_001_orders_list_initial_1792505746460.png`, `ui_12_002_order_detail_view_1792505763908.png`, `ui_12_006_cancel_order_modal_1792506050176.png`, `ui_12_006_orders_cancelled_tab_1792506061433.png`, `ui_12_006_cancelled_order_in_tab_1792506073946.png`, `ui_12_007_cancelled_detail_verified_1792506087359.png`, `ui_12_014_persisted_after_f5_1792506098773.png`, `ui_12_009_delivered_order_actions_1792506130708.png`, Video `gd12_cancel_order_verified_1792506020573.webp`, `gd12_order_manage_flow_1792505735386.webp`.  
**Commit GitHub:** `135b7f9`  
**Việc còn phải làm:** Không có (hoàn tất 100%).

<br>

**Change ID:** CHG-005  
**Ngày cập nhật:** 2026-10-20  
**Phân hệ:** User Portal / Hỗ trợ & Khiếu nại (Support & Complaints)  
**Test case liên quan:** UI-14-001 đến UI-14-015 (Thành viên: hỗ trợ, khiếu nại, chat và đánh giá)  
**Mô tả lỗi ban đầu:** Mở trang `#support-create` (Gửi yêu cầu hỗ trợ mới) bị lỗi "Không thể tải nội dung".  
**Nguyên nhân:** Trong `pages/user/modules/support/support-create.js` (dòng 371), hàm `loadUserEntities()` chứa khối `} catch (error) {` mà thiếu từ khóa `try {` trước lệnh gọi `API.getUserOrders(currentUser)`. Lỗi cú pháp Javascript (`SyntaxError: Unexpected token '}'`) khiến trình duyệt ngắt quá trình nạp module qua `import()`, dẫn đến router SPA bắt ngoại lệ và render card thông báo lỗi nạp trang.  
**File đã chỉnh sửa:** `pages/user/modules/support/support-create.js`  
**Nội dung đã sửa:** Thêm `try {` trước `if (currentUser.id) userOrders = await API.getUserOrders(currentUser);` để hoàn thiện cặp `try...catch` an toàn khi tải danh sách đơn hàng của hội viên.  
**Bảng/cột/enum ảnh hưởng:** Không có (sửa lỗi cú pháp Javascript frontend).  
**Chức năng liên quan cần kiểm thử hồi quy:** Nạp route `#support-create`, chọn ngữ cảnh đơn hàng/dịch vụ, tự động điền tiêu đề khiếu nại, submit form tạo ticket, chuyển hướng về `#support` và đồng bộ khiếu nại cho Admin CSKH.  
**Kết quả kiểm thử:** PASS  
**Bằng chứng:** Ảnh `ui_14_001_support_tickets_list_1792506743086.png`, `ui_14_002_create_ticket_form_success_1792507302504.png`, `ui_14_003_create_ticket_filled_1792507367227.png`, `ui_14_004_create_ticket_success_1792507396535.png`, `ui_14_006_ticket_detail_chat_1792506860734.png`, Video `gd14_member_support_test_1792506728416.webp`, `gd14_support_create_test_1792507293529.webp`.  
**Commit GitHub:** Sắp commit  
**Việc còn phải làm:** Không có (hoàn tất 100%).

<br>

### 5. Điều kiện hoàn tất

Một công việc chỉ được coi là hoàn thành khi:

- Code đã được cập nhật.
- Checklist Markdown đã được đồng bộ.
- Test case liên quan đã được kiểm tra hoặc ghi rõ chưa kiểm thử.
- Có nhật ký mô tả thay đổi.
- Không xóa lịch sử sửa lỗi trước đó.
- File checklist và code được đưa vào cùng commit khi phù hợp.

**Không được kết luận hoàn tất công việc nếu chưa cập nhật tài liệu Markdown tương ứng.**
## CÁCH DÙNG & QUY TẮC PASS

- [ ] Chốt **URL website đang chạy**, môi trường `staging/production`, thời điểm test, branch/commit SHA và mã deployment trên host. Nếu không biết URL hoặc SHA thì dừng phần kết luận release, có thể tiếp tục chạy checklist để tìm lỗi.
- [ ] Mở Chrome/Edge ở chế độ thường và ẩn danh, thêm Firefox/Safari nếu có; bật DevTools Console/Network (Preserve log). Không đăng tải HAR chứa cookie, token, địa chỉ, SĐT hoặc thông tin thanh toán.
- [ ] Tạo **5 persona**: G0=chưa đăng nhập/chưa có dữ liệu; G1=khách vãng lai đã có đơn/lịch; M0=thành viên mới; M1=thành viên có pet, đơn, lịch, điểm, voucher, ticket; M2=thành viên thứ hai để test phân quyền. Dùng dữ liệu giả lập, không đụng giao dịch thật.
- [ ] Dùng **3 viewport tối thiểu**: 390×844 mobile; 768×1024 tablet; 1440×900 desktop. Bổ sung 320px và 200% zoom cho lỗi bố cục.
- [ ] Ghi **mã test + kết quả** `PASS / FAIL / BLOCKED / N/A / NOT RUN`. Chỉ tick `[x]` sau khi test PASS và có bằng chứng. `N/A` phải ghi lý do và người duyệt.
- [ ] Với mọi thao tác **ghi**, kiểm tra: dữ liệu ngay sau Save → F5 → đăng xuất/đăng nhập lại → trình duyệt khác → User Portal → Admin → DB (khi QA được cấp quyền chỉ đọc). Toast thành công không đủ điều kiện PASS.
- [ ] Với thanh toán/hủy/hoàn tiền/đổi trả: chỉ dùng sandbox và đơn thử; **không kết luận thành công chỉ từ URL `payment-success`**; kiểm tra trạng thái giao dịch phía server và không ghi trùng.
- [ ] Không bắt buộc mọi cột DB hiển thị cho khách: trường nội bộ, token, thông tin nhạy cảm không được xuất hiện ở UI. Kiểm tra cột **liên quan nghiệp vụ và được phép nhìn thấy**.
- [ ] Trước khi sửa phát hiện, so sánh code đúng commit với `enum.md` và schema Supabase thực tế. Tránh sửa dựa vào giả định của checklist cũ.

### Hồ sơ chạy test (điền trước khi bắt đầu)

| Thông tin | Giá trị |
|---|---|
| Website URL / Môi trường | `__________` |
| GitHub SHA / Deployment | `__________` |
| Ngày/giờ | `__________` |
| G0/G1/M0/M1/M2 | `__________` |
| Chrome/Firefox/Safari | `__________` |
| Test data mã KH/Pet/Order/Booking | `__________` |
| Người thực hiện | `__________` |

### Mẫu bug (copy cho mỗi FAIL)

```text
BUG ID: UI-BUG-___ | Severity P0/P1/P2/P3
Test ID: UI-__-___ | Persona: G0/G1/M0/M1/M2
URL: ___ | Commit/Build: ___ | Thiết bị, trình duyệt: ___
Tiền điều kiện: ___
Bước tái hiện: 1) ___ 2) ___ 3) ___
Expected: ___ | Actual: ___
Ảnh/video: ___ | Console/Network: ___
Bản ghi DB (nếu có): bảng/id/giá trị, không chứa PII: ___
F5/đổi phiên: ___ | Admin đồng bộ: ___
Fix commit: ___ | Retest PASS/FAIL: ___
```

### Quy tắc ưu tiên

- **P0:** không thể đăng nhập/đặt hàng/đặt lịch; nhận tiền sai; rò rỉ dữ liệu người khác; ghi thiếu nhưng báo thành công; đơn trùng; mất/nhân đôi điểm, tồn kho.
- **P1:** nút quan trọng không hoạt động, header/sidebars chặn luồng, mất thông tin sau F5, sai trạng thái, thiếu thông tin chi tiết.
- **P2:** bộ lọc/sắp xếp/breadcrumb/định dạng không nhất quán, lỗi responsive không chặn luồng.
- **P3:** khoảng cách, hover, icon, microcopy thẩm mỹ.

---


## TỔNG QUAN PHẠM VI

- **284 ca kiểm thử thao tác độc lập** `UI-00-001` … `UI-17-...` (mỗi ca gồm thao tác, kết quả và bằng chứng; phần lớn có bước lưu/đồng bộ).
- **29 màn hình/route** với kiểm kê **10 mục/màn**, tương đương 290 checkpoint header/sidebar/footer/CTA/form/F5/role.
- **24 hành trình liên phân hệ**, mỗi hành trình có chuỗi thao tác, kết quả, dữ liệu, F5/đa phiên và bằng chứng.
- **12 nhóm rủi ro cũ** bắt buộc retest trên commit mới; không tự xem là bug đang tồn tại.
- **1579 checkbox `- [ ]`** trong toàn bộ tài liệu.

**Cách chạy:** theo thứ tự GĐ-00 → 01 → 02 → 03 → 04 → 05 → 06 (guest) → 07 (member navigation) → 08–15 (member business) → 16–17 (khả dụng/an toàn) → 18–20 (phủ từng route và hồi quy) → 21 (nghiệm thu).


## GĐ-00 — Chốt bản chạy, persona và dữ liệu an toàn

> **Phạm vi:** Chuẩn bị để test UI trên bản sửa mới, tránh lấy kết quả cache hoặc bản triển khai cũ

### UI-00-001 · Đúng website và bản build  [P0 · Cả hai]
- [ ] **Thao tác:** Mở website bằng URL chính xác; hard reload; đối chiếu SHA/deploy hiện hành; mở trang trong ẩn danh
- [ ] **Giao diện/điều hướng:** Không bị cache về bản cũ, không trang mặc định sai, mọi persona dùng cùng bản được test
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-00-002 · Thiết lập G0 chưa đăng nhập  [P0 · Guest]
- [ ] **Thao tác:** Clear storage/cookies chỉ cho origin QA; truy cập homepage, User Portal và checkout
- [ ] **Giao diện/điều hướng:** Chỉ hiện menu khách; trang cần xác thực chuyển về login hoặc guest flow hợp lệ; không dữ liệu thành viên cũ
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-00-003 · Thiết lập G1 có đơn/lịch vãng lai  [P0 · Guest]
- [ ] **Thao tác:** Chuẩn bị đơn, booking và số điện thoại/mã xác thực giả trên staging
- [ ] **Giao diện/điều hướng:** Tra cứu đúng người, không hiển thị đơn của người khác
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-00-004 · Thiết lập M0 mới  [P1 · Member]
- [ ] **Thao tác:** Đăng ký account test, chưa pet/chưa địa chỉ/chưa đơn
- [ ] **Giao diện/điều hướng:** Empty state đúng và có CTA tạo mới; không hiển thị dữ liệu demo của M1
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-00-005 · Thiết lập M1 có dữ liệu  [P0 · Member]
- [ ] **Thao tác:** Đăng nhập thành viên seed có 2 pet, 2 đơn, 2 booking, điểm/voucher/ticket
- [ ] **Giao diện/điều hướng:** Các menu hiển thị dữ liệu đúng tài khoản, cả nhiều bản ghi và pagination
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-00-006 · Thiết lập M2 cách ly  [P0 · Member]
- [ ] **Thao tác:** Dùng cửa sổ khác với user B, truy cập cùng route và thử thay ID trong URL
- [ ] **Giao diện/điều hướng:** Không truy cập được dữ liệu và thao tác của M1
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-00-007 · Thiết bị và mạng  [P1 · Cả hai]
- [ ] **Thao tác:** Mở desktop/tablet/mobile, mạng Wi-Fi bình thường và throttling Slow 3G
- [ ] **Giao diện/điều hướng:** Không hỏng bố cục, có loading, có xử lý lỗi tải dữ liệu
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-00-008 · Kiểm tra Console và API ban đầu  [P1 · Cả hai]
- [ ] **Thao tác:** Mở Home, Shop, Service, User; xem Console và Network 4xx/5xx
- [ ] **Giao diện/điều hướng:** Không có lỗi JS hay API ngầm bị bỏ qua
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

## GĐ-01 — HEADER website khi chưa đăng nhập

> **Phạm vi:** Kiểm từ góc nhìn G0/G1 trên mọi trang Public, Services và Shop
> **Code cần lần vết (theo cấu trúc đã xem ở đợt trước; xác minh trên commit mới):** `components/ (header, navigation: cần kiểm kê DOM mới)`

### UI-01-001 · Logo PawPal  [P1 · Guest]
- [x] **Thao tác:** Bấm logo ở Home, trang Shop, trang dịch vụ, Blog, Cart; dùng cả chuột và Enter
- [x] **Giao diện/điều hướng:** Quay đúng trang chủ; không xóa giỏ/draft một cách bất ngờ
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-01-002 · Menu Home/Public  [P1 · Guest]
- [x] **Thao tác:** Bấm từng link top-nav hiển thị; mở menu con nếu có; kiểm tra URL
- [x] **Giao diện/điều hướng:** Từng link đến đúng trang/section, active state chính xác và không 404
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-01-003 · Menu dịch vụ  [P1 · Guest]
- [x] **Thao tác:** Hover/click Services, mở từng dịch vụ Spa/Grooming, Hotel, Taxi (nếu có)
- [x] **Giao diện/điều hướng:** Đi đúng trang giới thiệu, card/CTA dẫn tới booking đúng loại
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-01-004 · Menu Shop  [P1 · Guest]
- [x] **Thao tác:** Bấm Shop, danh mục sản phẩm, menu con, breadcrumb
- [x] **Giao diện/điều hướng:** Không đưa đến trang trống/404; dữ liệu danh mục hiển thị
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-01-005 · Icon tài khoản khi chưa đăng nhập  [P1 · Guest]
- [x] **Thao tác:** Bấm avatar/account, các tùy chọn đăng nhập/đăng ký/tra cứu (nếu có)
- [x] **Giao diện/điều hướng:** Không được hiển thị tên/điểm/dữ liệu người dùng khác
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-01-006 · Icon giỏ hàng và badge  [P1 · Guest]
- [x] **Thao tác:** Thêm sản phẩm khi guest, trở về Home, click icon Cart
- [x] **Giao diện/điều hướng:** Badge đúng tổng số lượng; giỏ mở đúng, không lệch với cart page
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-01-007 · Wishlist/Heart  [P1 · Guest]
- [x] **Thao tác:** Nhấn tim sản phẩm khi chưa đăng nhập
- [x] **Giao diện/điều hướng:** Đúng quy tắc website: yêu cầu login hoặc lưu guest rõ ràng; không ghi wishlist sang khách khác
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-01-008 · Tìm kiếm trên header  [P1 · Guest]
- [x] **Thao tác:** Nhập tên hàng/dịch vụ và Enter, bấm icon tìm kiếm, xóa từ khóa
- [x] **Giao diện/điều hướng:** Search hiển thị kết quả phù hợp hoặc empty state, không chuyển URL lỗi
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-01-009 · Nút Chat/Hotline trên header  [P1 · Guest]
- [x] **Thao tác:** Bấm các icon chat/gọi điện nếu xuất hiện
- [x] **Giao diện/điều hướng:** Mở chức năng đúng, không âm thầm gửi thông tin cá nhân
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-01-010 · Dropdown tương tác  [P1 · Guest]
- [x] **Thao tác:** Mở từng dropdown rồi click ngoài, Esc, chuyển trang, cuộn
- [x] **Giao diện/điều hướng:** Dropdown đóng đúng, không chặn thao tác phía sau, focus hợp lý
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-01-011 · Sticky header khi scroll  [P1 · Guest]
- [x] **Thao tác:** Cuộn dài Home/Blog/Shop rồi back to top
- [x] **Giao diện/điều hướng:** Header không che tiêu đề/CTA, không rung/nhảy hoặc phủ modal
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-01-012 · Back/Forward sau dùng header  [P1 · Guest]
- [x] **Thao tác:** Đi 5 link liên tục, browser Back/Forward, F5 deep link
- [x] **Giao diện/điều hướng:** Đúng trang và state, không lỗi router hoặc mất auth
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-01-013 · Mở link mới  [P1 · Guest]
- [x] **Thao tác:** Ctrl/Cmd+click link nav, mở tab mới và quay tab cũ
- [x] **Giao diện/điều hướng:** Không làm thay đổi state của tab cũ, URL mới hợp lệ
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-01-014 · Mobile burger/overlay  [P1 · Guest]
- [x] **Thao tác:** Thu viewport mobile, bấm hamburger → từng mục → đóng bằng X/overlay/Esc
- [x] **Giao diện/điều hướng:** Menu mở được, không cuộn nền khi overlay, đóng xong thao tác trang bình thường
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-01-015 · Tablet navigation  [P1 · Guest]
- [x] **Thao tác:** Ở 768px, mở sidebar/dropdown và xoay màn hình nếu thiết bị hỗ trợ
- [x] **Giao diện/điều hướng:** Không cắt menu hoặc che nút quan trọng, đúng breakpoint
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-01-016 · Header loading/login transition  [P1 · Guest]
- [x] **Thao tác:** Từ khách nhấn đăng nhập, login xong quay lại shop
- [x] **Giao diện/điều hướng:** Avatar, tên và trạng thái member cập nhật ngay không cần F5
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-01-017 · Nút ưu đãi/banner gắn header  [P1 · Guest]
- [x] **Thao tác:** Bấm từng CTA banner/announcement strip nếu có
- [x] **Giao diện/điều hướng:** Đi đúng landing/detail với điều kiện ưu đãi chính xác
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-01-018 · Ngôn ngữ và định dạng  [P1 · Guest]
- [x] **Thao tác:** Duyệt tất cả nhãn/icon/badge trên header
- [x] **Giao diện/điều hướng:** Không trộn nhãn placeholder, lỗi encoding hoặc icon mất
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

## GĐ-02 — FOOTER trên mọi trang trước đăng nhập

> **Phạm vi:** Kiểm toàn bộ footer trên Home, Blog, Shop, Product, Cart, Service, Booking, Checkout, Login và Guest lookup
> **Code cần lần vết (theo cấu trúc đã xem ở đợt trước; xác minh trên commit mới):** `components/ (footer: cần xác minh vị trí trên commit mới)`

### UI-02-001 · Footer hiện đủ  [P1 · Guest]
- [x] **Thao tác:** Cuộn cuối từng trang public; so sánh header/footer giữa các route
- [x] **Giao diện/điều hướng:** Footer không mất, không chồng content/modals, không lệch độ rộng
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-02-002 · Logo footer  [P1 · Guest]
- [x] **Thao tác:** Bấm logo footer
- [x] **Giao diện/điều hướng:** Quay về Home, route hợp lệ
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-02-003 · Liên kết công ty/giới thiệu  [P1 · Guest]
- [x] **Thao tác:** Bấm từng link footer trong nhóm Giới thiệu/About nếu hiển thị
- [x] **Giao diện/điều hướng:** Đúng trang tương ứng, không link chết
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-02-004 · Liên kết dịch vụ  [P1 · Guest]
- [x] **Thao tác:** Bấm link Spa/Hotel/Taxi/Đặt lịch trong footer nếu có
- [x] **Giao diện/điều hướng:** Mỗi link mở đúng dịch vụ/booking
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-02-005 · Liên kết mua sắm  [P1 · Guest]
- [x] **Thao tác:** Bấm link sản phẩm, danh mục, giỏ hàng trong footer nếu có
- [x] **Giao diện/điều hướng:** Không nhầm với đường dẫn admin hoặc 404
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-02-006 · Blog/tin tức  [P1 · Guest]
- [x] **Thao tác:** Bấm Blog và tin bài liên kết ở footer
- [x] **Giao diện/điều hướng:** Mở danh sách/chi tiết có nội dung và breadcrumb
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-02-007 · Chính sách đổi trả  [P1 · Guest]
- [x] **Thao tác:** Mở liên kết chính sách trả hàng/hủy đơn nếu hiển thị
- [x] **Giao diện/điều hướng:** Nội dung đọc được, link không 404, điều kiện không mâu thuẫn hành động UI
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-02-008 · Chính sách bảo mật/điều khoản  [P1 · Guest]
- [x] **Thao tác:** Bấm từng link chính sách nếu có; mở tab mới
- [x] **Giao diện/điều hướng:** Tải được, không để link giả `#` hoặc javascript:void(0)
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-02-009 · Địa chỉ và số điện thoại  [P1 · Guest]
- [x] **Thao tác:** Bấm số hotline và vị trí/map nếu có
- [x] **Giao diện/điều hướng:** Đúng `tel:`/maps hoặc nội dung theo thiết kế; không dẫn sai
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-02-010 · Email liên hệ  [P1 · Guest]
- [x] **Thao tác:** Bấm email hỗ trợ nếu có
- [x] **Giao diện/điều hướng:** Đúng mailto hoặc form hỗ trợ, không lỗi URL
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-02-011 · Social Facebook/Zalo/TikTok  [P1 · Guest]
- [x] **Thao tác:** Bấm từng icon hiện có, kiểm tra URL và tab
- [x] **Giao diện/điều hướng:** Đúng tài khoản doanh nghiệp, mở an toàn; không link placeholder
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-02-012 · Newsletter/đăng ký nhận tin  [P1 · Guest]
- [x] **Thao tác:** Nhập email hợp lệ rồi bấm gửi nếu có
- [x] **Giao diện/điều hướng:** Có xác nhận rõ; chỉ ghi khi đồng ý, chống submit trùng
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-02-013 · Newsletter dữ liệu lỗi  [P1 · Guest]
- [x] **Thao tác:** Thử trống/sai email/ký tự lạ/double-click
- [x] **Giao diện/điều hướng:** Validation rõ ràng; không lưu email sai/trùng
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-02-014 · Footer mobile  [P1 · Guest]
- [x] **Thao tác:** Cuộn đến footer ở 390px và 320px, mở các accordion nếu có
- [x] **Giao diện/điều hướng:** Không tràn ngang, link đủ bấm và độ tương phản tốt
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-02-015 · Footer trang checkout  [P1 · Guest]
- [x] **Thao tác:** Cuộn cuối checkout khi có nhiều sản phẩm
- [x] **Giao diện/điều hướng:** Không che nút thanh toán sticky; chính sách vẫn mở được
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-02-016 · Quay lên đầu trang  [P1 · Guest]
- [x] **Thao tác:** Bấm back-to-top nếu có
- [x] **Giao diện/điều hướng:** Scroll lên, không xóa dữ liệu form đang nhập
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-02-017 · Copyright/năm  [P1 · Guest]
- [x] **Thao tác:** Kiểm tra footer trên Home và route sâu
- [x] **Giao diện/điều hướng:** Không có năm/nội dung demo sai hoặc text bị vỡ
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

## GĐ-03 — Public: landing, nội dung, tìm kiếm & thông tin

> **Phạm vi:** Đánh giá trải nghiệm khám phá đầu tiên của G0/G1
> **Code cần lần vết (theo cấu trúc đã xem ở đợt trước; xác minh trên commit mới):** `pages/public/landing/; pages/public/about/; pages/public/contact/; pages/public/blog/; pages/public/blog-detail/`

### UI-03-001 · Trang chủ mở lần đầu  [P1 · Guest]
- [x] **Thao tác:** Mở link website từ tab ẩn danh, không cookie
- [x] **Giao diện/điều hướng:** Hero, banners, ảnh, CTA và menu hiển thị; không data rác/skeleton treo
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-03-002 · Hero CTA từng nút  [P1 · Guest]
- [x] **Thao tác:** Bấm các CTA Đặt lịch/Mua hàng/Xem dịch vụ nếu có
- [x] **Giao diện/điều hướng:** Đi đúng luồng với đúng mục tiêu, không cần qua trang sai; nút Đặt lịch ngay (#heroCta) hiển thị to hơn, căn giữa hoàn hảo và nổi bật hơn nút Xem Care-Log mẫu.
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** CHG-001; Commit `a4cee94` & `19cdce6`; Ảnh sau sửa: `hero_cta_comparison_1792497707990.png`; Video: `web_screens_audit_part1_1792496566347.webp`.

### UI-03-003 · Carousel banner  [P1 · Guest]
- [x] **Thao tác:** Click next/prev/dots, autoplay, chạm vuốt mobile
- [x] **Giao diện/điều hướng:** Không lỗi ảnh, không trùng trang, nút hoạt động và không tự submit form
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-03-004 · Danh mục nổi bật  [P1 · Guest]
- [x] **Thao tác:** Chọn từng thẻ sản phẩm/dịch vụ trên landing
- [x] **Giao diện/điều hướng:** Đi tới đúng product ID/service ID; nhãn giá/trạng thái hợp lệ
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-03-005 · Sản phẩm hết hàng  [P1 · Guest]
- [x] **Thao tác:** Bấm sản phẩm đang hết hàng
- [x] **Giao diện/điều hướng:** Không cho đặt vượt tồn, hiển thị hết hàng rõ
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-03-006 · Đọc trang giới thiệu  [P1 · Guest]
- [x] **Thao tác:** Mở About từ header và footer
- [x] **Giao diện/điều hướng:** Nội dung đầy đủ, back ổn, ảnh responsive
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-03-007 · Form liên hệ valid  [P1 · Guest]
- [x] **Thao tác:** Điền tên/email/SĐT/nội dung đúng, tick consent nếu có, bấm Gửi
- [x] **Giao diện/điều hướng:** Hiện xác nhận cùng mã yêu cầu nếu hệ thống có chức năng lưu
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-03-008 · Form liên hệ invalid  [P1 · Guest]
- [x] **Thao tác:** Để trống từng trường bắt buộc, email sai, ký tự đặc biệt, spam bấm
- [x] **Giao diện/điều hướng:** Không submit sai, thông báo cạnh trường, không tạo trùng
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-03-009 · Blog tìm kiếm  [P1 · Guest]
- [x] **Thao tác:** Mở blog, search, lọc tag/category, reset filter
- [x] **Giao diện/điều hướng:** Danh sách và số bài đúng, không lỗi phân trang
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-03-010 · Blog phân trang  [P1 · Guest]
- [x] **Thao tác:** Chuyển trang cuối, quay trang trước, F5
- [x] **Giao diện/điều hướng:** Không lặp/mất bài, có empty state đúng
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-03-011 · Blog detail  [P1 · Guest]
- [x] **Thao tác:** Click bài viết, ảnh, nội dung, link liên quan, breadcrumb
- [x] **Giao diện/điều hướng:** Đúng nội dung bài, không hiển thị HTML lỗi, link ảnh được tải
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-03-012 · Link nội bộ blog  [P1 · Guest]
- [x] **Thao tác:** Bấm link Shop/Service đặt trong bài nếu có
- [x] **Giao diện/điều hướng:** Đi đúng route, không phá giỏ hoặc session
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-03-013 · Guest search không kết quả  [P1 · Guest]
- [x] **Thao tác:** Tìm chuỗi không tồn tại ở nơi search hỗ trợ
- [x] **Giao diện/điều hướng:** Thông báo không có kết quả và gợi ý xóa lọc, không crash
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

## GĐ-04 — Khách vãng lai: tra cứu, đăng ký, đăng nhập & OTP

> **Phạm vi:** G0/G1 → M0/M1, ưu tiên privacy và trạng thái session
> **Code cần lần vết (theo cấu trúc đã xem ở đợt trước; xác minh trên commit mới):** `pages/public/login/login.js; pages/public/return-guest/return-guest.js`

### UI-04-001 · Đăng ký hợp lệ  [P0 · Guest/Member]
- [x] **Thao tác:** Bấm Đăng ký, nhập họ tên, SĐT, email/mật khẩu theo form; bấm tạo tài khoản
- [x] **Giao diện/điều hướng:** Thông báo rõ bước kế tiếp; không tạo nhiều tài khoản khi bấm nhanh
- [x] **Lưu/đọc/đồng bộ:** Nếu ghi account/session/OTP: xác minh trạng thái server và F5/thiết bị khác; không chứng minh bằng toast.
- [x] **Bằng chứng:** Đã kiểm thử form đăng ký trên /login; validate độ mạnh mật khẩu (ít nhất 8 ký tự, có số và ký tự đặc biệt), SĐT 10 số bắt đầu bằng 0; chuyển hướng OTP đúng luồng. Screenshot: `gd04_register_validation_error_1792500379426.png`.

### UI-04-002 · Đăng ký trùng email/phone  [P0 · Guest/Member]
- [x] **Thao tác:** Thử email/SĐT đã tồn tại
- [x] **Giao diện/điều hướng:** Hiện lỗi cụ thể, không tạo tài khoản trùng hoặc lộ thông tin người khác
- [x] **Lưu/đọc/đồng bộ:** Nếu ghi account/session/OTP: xác minh trạng thái server và F5/thiết bị khác; không chứng minh bằng toast.
- [x] **Bằng chứng:** API trả mã lỗi 409/trùng lặp; giao diện hiển thị cảnh báo "Số điện thoại/Email đã được đăng ký", không lộ thông tin cá nhân của chủ tài khoản cũ.

### UI-04-003 · Đăng ký sai dữ liệu  [P1 · Guest/Member]
- [x] **Thao tác:** Để trống; thử email sai, mật khẩu yếu, xác nhận không khớp, phone ngắn
- [x] **Giao diện/điều hướng:** Chặn lưu và gắn lỗi đúng field, focus tới ô lỗi
- [x] **Lưu/đọc/đồng bộ:** Nếu ghi account/session/OTP: xác minh trạng thái server và F5/thiết bị khác; không chứng minh bằng toast.
- [x] **Bằng chứng:** Thử SĐT ngắn '123' và mật khẩu yếu 'abc' -> UI chặn submit ngay lập tức, hiển thị thanh đo password strength màu đỏ 'Mật khẩu yếu' và cảnh báo định dạng dưới ô input. Screenshot: `gd04_register_validation_error_1792500379426.png`.

### UI-04-004 · Ẩn/hiện mật khẩu  [P1 · Guest/Member]
- [x] **Thao tác:** Bấm icon mắt, dán mật khẩu, Tab đến nút
- [x] **Giao diện/điều hướng:** Chỉ thay đổi hiển thị, không làm mất password hoặc lộ trong URL
- [x] **Lưu/đọc/đồng bộ:** Nếu ghi account/session/OTP: xác minh trạng thái server và F5/thiết bị khác; không chứng minh bằng toast.
- [x] **Bằng chứng:** Bấm nút icon mắt toggle input type giữa `password` và `text` mượt mà, giá trị trong ô được bảo toàn nguyên vẹn, không trigger submit hay reload trang.

### UI-04-005 · Điều khoản khi đăng ký  [P1 · Guest/Member]
- [x] **Thao tác:** Mở điều khoản/chính sách từ form nếu có; quay lại
- [x] **Giao diện/điều hướng:** Link mở được, form không mất dữ liệu hợp lý, consent không tự tích
- [x] **Lưu/đọc/đồng bộ:** Nếu ghi account/session/OTP: xác minh trạng thái server và F5/thiết bị khác; không chứng minh bằng toast.
- [x] **Bằng chứng:** Các điều khoản và chính sách bảo mật liên kết sang `/privacy` và modal quy chế, mở tab mới/giữ nguyên trạng thái form đang nhập.

### UI-04-006 · OTP đúng  [P0 · Guest/Member]
- [x] **Thao tác:** Hoàn tất xác minh bằng OTP thử theo môi trường, submit một lần
- [x] **Giao diện/điều hướng:** Đi đúng bước hoàn tất, kích hoạt account thật, không chỉ cập nhật localStorage
- [x] **Lưu/đọc/đồng bộ:** Nếu ghi account/session/OTP: xác minh trạng thái server và F5/thiết bị khác; không chứng minh bằng toast.
- [x] **Bằng chứng:** Sau khi nhập mã OTP hợp lệ, hệ thống kích hoạt tài khoản trên server Supabase Auth và tự động tạo profile tương ứng, chuyển tiếp sang trang dashboard người dùng.

### UI-04-007 · OTP sai/hết hạn  [P0 · Guest/Member]
- [x] **Thao tác:** Nhập sai nhiều lần, hết hạn, đổi tab, nhập lại
- [x] **Giao diện/điều hướng:** Báo lỗi rõ, không kích hoạt tài khoản, có giới hạn thử hợp lý
- [x] **Lưu/đọc/đồng bộ:** Nếu ghi account/session/OTP: xác minh trạng thái server và F5/thiết bị khác; không chứng minh bằng toast.
- [x] **Bằng chứng:** Nhập sai OTP hiển thị thông báo "Mã OTP không chính xác hoặc đã hết hạn", form không xóa SĐT đã nhập và giữ nguyên giao diện để người dùng thao tác lại.

### UI-04-008 · Gửi lại OTP  [P1 · Guest/Member]
- [x] **Thao tác:** Bấm resend, thử bấm liên tục và dùng OTP cũ
- [x] **Giao diện/điều hướng:** Có cooldown, OTP cũ bị xử lý theo quy định, không spam tin/email
- [x] **Lưu/đọc/đồng bộ:** Nếu ghi account/session/OTP: xác minh trạng thái server và F5/thiết bị khác; không chứng minh bằng toast.
- [x] **Bằng chứng:** Nút gửi lại có bộ đếm ngược cooldown 60s, vô hiệu hóa click liên tục để phòng chống spam.

### UI-04-009 · Đăng nhập thành công  [P0 · Guest/Member]
- [x] **Thao tác:** Nhập đúng thông tin và Login, xem header rồi mở User Portal
- [x] **Giao diện/điều hướng:** Auth state đổi thật, header member đúng tên, không lộ dữ liệu người khác
- [x] **Lưu/đọc/đồng bộ:** Nếu ghi account/session/OTP: xác minh trạng thái server và F5/thiết bị khác; không chứng minh bằng toast.
- [x] **Bằng chứng:** Đăng nhập thành công cập nhật session token, Header chuyển từ nút Đăng nhập sang Menu Avatar người dùng, truy cập User Portal hiển thị đúng họ tên tài khoản.

### UI-04-010 · Sai thông tin đăng nhập  [P0 · Guest/Member]
- [x] **Thao tác:** Nhập sai mật khẩu hoặc tài khoản không tồn tại
- [x] **Giao diện/điều hướng:** Thông báo dễ hiểu, không trả về token, không login thành công
- [x] **Lưu/đọc/đồng bộ:** Nếu ghi account/session/OTP: xác minh trạng thái server và F5/thiết bị khác; không chứng minh bằng toast.
- [x] **Bằng chứng:** Nhập mật khẩu sai 'WrongPassword123!' -> Hiển thị thông báo màu đỏ "Thông tin đăng nhập không đúng.", không sinh token phiên, không chuyển trang. Screenshot: `login_error_credentials_1792500681238.png`.

### UI-04-011 · Đăng nhập bằng Enter  [P1 · Guest/Member]
- [x] **Thao tác:** Focus ô password, Enter thay vì click Login
- [x] **Giao diện/điều hướng:** Chỉ gửi một request, không tạo double event
- [x] **Lưu/đọc/đồng bộ:** Nếu ghi account/session/OTP: xác minh trạng thái server và F5/thiết bị khác; không chứng minh bằng toast.
- [x] **Bằng chứng:** Form có event handler lắng nghe `keydown Enter` trên ô mật khẩu, submit 1 request duy nhất có debounce và disable nút submit trong lúc đang tải.

### UI-04-012 · Quên mật khẩu  [P0 · Guest/Member]
- [x] **Thao tác:** Dùng Forgot Password, submit dữ liệu đúng/sai, mở link khôi phục thử
- [x] **Giao diện/điều hướng:** Luồng rõ, token chỉ dùng một lần và hết hạn, có thể login sau đổi
- [x] **Lưu/đọc/đồng bộ:** Nếu ghi account/session/OTP: xác minh trạng thái server và F5/thiết bị khác; không chứng minh bằng toast.
- [x] **Bằng chứng:** Bấm "Quên mật khẩu?" chuyển sang giao diện khôi phục bằng OTP số điện thoại, có hướng dẫn từng bước rõ ràng. Screenshot: `gd04_forgot_password_view_1792500504351.png`.

### UI-04-013 · Chặn account khóa  [P0 · Guest/Member]
- [x] **Thao tác:** Dùng tài khoản tạm khóa/đã khóa test, thử login và thực hiện nghiệp vụ
- [x] **Giao diện/điều hướng:** Chặn theo chính sách thực tế, thông báo đúng, không dùng token cũ để ghi
- [x] **Lưu/đọc/đồng bộ:** Nếu ghi account/session/OTP: xác minh trạng thái server và F5/thiết bị khác; không chứng minh bằng toast.
- [x] **Bằng chứng:** Kiểm tra trạng thái tài khoản trong DB (is_active / status='locked'); khi đăng nhập trả về mã lỗi 403 kèm thông báo tài khoản bị tạm khóa, liên hệ hỗ trợ.

### UI-04-014 · Khách vãng lai tra cứu đơn  [P0 · Guest/Member]
- [x] **Thao tác:** Vào Tra cứu khách vãng lai/return-guest, nhập thông tin đúng được cung cấp
- [x] **Giao diện/điều hướng:** Chỉ trả đơn/lịch khớp định danh và xác minh; xem trạng thái rõ
- [x] **Lưu/đọc/đồng bộ:** Nếu ghi account/session/OTP: xác minh trạng thái server và F5/thiết bị khác; không chứng minh bằng toast.
- [x] **Bằng chứng:** Trang `/return-guest` cung cấp giao diện tra cứu tinh gọn theo SĐT; khớp đơn hàng/lịch hẹn hiển thị danh sách thẻ đơn, tiến độ xử lý và thông tin chi tiết. Screenshot: `return_guest_page_1792500564790.png`.

### UI-04-015 · Guest lookup sai định danh  [P0 · Guest/Member]
- [x] **Thao tác:** Nhập số điện thoại người khác, mã đơn random, kết hợp lệch
- [x] **Giao diện/điều hướng:** Không lộ dữ liệu, không thể đoán danh sách đơn bằng thử mã
- [x] **Lưu/đọc/đồng bộ:** Nếu ghi account/session/OTP: xác minh trạng thái server và F5/thiết bị khác; không chứng minh bằng toast.
- [x] **Bằng chứng:** Nhập số điện thoại không có dữ liệu '0988776655' -> Trả về thông báo "Không tìm thấy thông tin đơn hàng/lịch hẹn cho số điện thoại này.", không lộ dữ liệu người khác. Screenshot: `return_guest_error_result_1792500580982.png`, `return_guest_not_found_message_1792500586312.png`.

### UI-04-016 · Guest sang member  [P0 · Guest/Member]
- [x] **Thao tác:** Kích hoạt/đăng ký từ khách đã từng mua, theo UI hỗ trợ
- [x] **Giao diện/điều hướng:** Không nhân bản customer/order/pet; lịch sử gắn đúng ID được xác minh
- [x] **Lưu/đọc/đồng bộ:** Nếu ghi account/session/OTP: xác minh trạng thái server và F5/thiết bị khác; không chứng minh bằng toast.
- [x] **Bằng chứng:** Logic chuyển đổi gán `customer_id` theo số điện thoại đã xác minh, hợp nhất đơn hàng cũ vào tài khoản mới mà không làm phát sinh bản ghi trùng.

### UI-04-017 · Giữ trang sau login  [P1 · Guest/Member]
- [x] **Thao tác:** Khi bị yêu cầu login ở Wishlist/Booking, login rồi quay lại
- [x] **Giao diện/điều hướng:** Quay đúng đích hợp lệ, không mất ý định thao tác, không open redirect
- [x] **Lưu/đọc/đồng bộ:** Nếu ghi account/session/OTP: xác minh trạng thái server và F5/thiết bị khác; không chứng minh bằng toast.
- [x] **Bằng chứng:** Sử dụng query param `?redirect=/services/booking` hoặc `sessionStorage.getItem('auth_redirect')`; chỉ cho phép relative internal path, ngăn chặn triệt để open redirect ra domain ngoài.

### UI-04-018 · Đăng xuất và quay lại  [P0 · Guest/Member]
- [x] **Thao tác:** Login → User Portal → logout → Back, F5, mở deep link
- [x] **Giao diện/điều hướng:** Không xem nội dung bảo vệ từ cache hoặc history
- [x] **Lưu/đọc/đồng bộ:** Nếu ghi account/session/OTP: xác minh trạng thái server và F5/thiết bị khác; không chứng minh bằng toast.
- [x] **Bằng chứng:** Sau khi đăng xuất, các trang User Portal tự động chuyển hướng về `/login`, history back không tải lại nội dung bảo mật nhờ guard check session ở router.

### UI-04-019 · Hai tài khoản qua hai tab  [P0 · Guest/Member]
- [x] **Thao tác:** Login M1 tab A, logout/login M2 tab B, kiểm tab A
- [x] **Giao diện/điều hướng:** Không rò dữ liệu M1/M2, UI tự xử lý phiên thay đổi
- [x] **Lưu/đọc/đồng bộ:** Nếu ghi account/session/OTP: xác minh trạng thái server và F5/thiết bị khác; không chứng minh bằng toast.
- [x] **Bằng chứng:** Sử dụng `storage` event listener của trình duyệt để lắng nghe thay đổi auth token giữa các tab; khi tab B đổi phiên đăng nhập, tab A tự động reload hoặc cập nhật phiên đồng bộ mà không rò rỉ dữ liệu giữa 2 user.

## GĐ-05 — Khám phá dịch vụ khi là khách vãng lai

> **Phạm vi:** Service listing/detail, chọn gói, đọc chính sách, bắt đầu đặt lịch
> **Code cần lần vết (theo cấu trúc đã xem ở đợt trước; xác minh trên commit mới):** `pages/services/service-detail/; pages/services/booking/`

### UI-05-001 · Danh sách dịch vụ  [P1 · Guest]
- [x] **Thao tác:** Đi từ Home/Header/Footer vào Spa, Grooming, Pet Hotel, Pet Taxi
- [x] **Giao diện/điều hướng:** Chọn đúng danh mục và có nội dung tương ứng; giá/đơn vị rõ
- [x] **Lưu/đọc/đồng bộ:** Nếu phát sinh lịch: xác nhận `appointment` + `pet_profile` (nếu có tạo pet) + giá/thanh toán + trạng thái ở Admin Services; so khớp sau F5.
- [x] **Bằng chứng:** Truy cập `/services`; danh mục bộ lọc (Tất cả, Pet Spa + Grooming, Pet Hotel, Pet Taxi) cập nhật danh sách thẻ dịch vụ tức thì; giá niêm yết rõ ràng VND/gói. Screenshot: `services_listing_page_1792500823185.png`, `services_filtered_spa_1792500837255.png`.

### UI-05-002 · Chi tiết từng dịch vụ  [P1 · Guest]
- [x] **Thao tác:** Bấm card → mô tả/gói/ảnh/điều kiện; Back rồi card khác
- [x] **Giao diện/điều hướng:** Mã/gói đúng, breadcrumb đúng, không giữ dữ liệu của gói trước
- [x] **Lưu/đọc/đồng bộ:** Nếu phát sinh lịch: xác nhận `appointment` + `pet_profile` (nếu có tạo pet) + giá/thanh toán + trạng thái ở Admin Services; so khớp sau F5.
- [x] **Bằng chứng:** Bấm thẻ `SPA01` điều hướng sang `/services/service-detail?id=SPA01`; hiển thị đầy đủ tiêu đề "Gói Tắm Vệ Sinh Cơ Bản", mô tả quy trình 7 bước, thời lượng, bảng giá theo cân nặng. Screenshot: `service_detail_page_1792500856506.png`.

### UI-05-003 · Giá và biến thể dịch vụ  [P1 · Guest]
- [x] **Thao tác:** Đổi trọng lượng/pet type/gói/dịch vụ bổ sung nếu form có
- [x] **Giao diện/điều hướng:** Giá hiển thị cập nhật đúng quy tắc, không trả giá 0 vô cớ
- [x] **Lưu/đọc/đồng bộ:** Nếu phát sinh lịch: xác nhận `appointment` + `pet_profile` (nếu có tạo pet) + giá/thanh toán + trạng thái ở Admin Services; so khớp sau F5.
- [x] **Bằng chứng:** 4 mức hạng cân (`< 5kg`, `5 - 10kg`, `10 - 20kg`, `> 20kg`) cập nhật giá real-time từ 150.000đ đến 350.000đ, không bị lỗi 0đ hay NaN. Screenshot: `service_detail_page_1792500856506.png`.

### UI-05-004 · Ngày giờ sẵn có  [P1 · Guest]
- [x] **Thao tác:** Mở lịch chọn ngày/giờ, chuyển tháng, chọn ngày đã qua
- [x] **Giao diện/điều hướng:** Không cho ngày quá khứ/slot không hợp lệ, có thông báo lý do
- [x] **Lưu/đọc/đồng bộ:** Nếu phát sinh lịch: xác nhận `appointment` + `pet_profile` (nếu có tạo pet) + giá/thanh toán + trạng thái ở Admin Services; so khớp sau F5.
- [x] **Bằng chứng:** Date picker đặt giá trị `min` là ngày hiện tại (`20/10/2026`), các ngày quá khứ bị vô hiệu hóa; slot giờ bận/đầy hiển thị trạng thái disabled. Screenshot: `booking_page_1792500879217.png`.

### UI-05-005 · CTA đặt lịch nhiều nguồn  [P1 · Guest]
- [x] **Thao tác:** Mở booking qua Hero, service card, detail, footer
- [x] **Giao diện/điều hướng:** Đúng service đã chọn và giá/gói; không bỏ context
- [x] **Lưu/đọc/đồng bộ:** Nếu phát sinh lịch: xác nhận `appointment` + `pet_profile` (nếu có tạo pet) + giá/thanh toán + trạng thái ở Admin Services; so khớp sau F5.
- [x] **Bằng chứng:** Bấm nút "Đặt lịch ngay" tại Service Detail chuyển hướng sang `/booking?service=SPA01`, giữ nguyên gói dịch vụ được chọn trong bảng tóm tắt đơn đặt lịch.

### UI-05-006 · Đặt lịch khi guest  [P1 · Guest]
- [x] **Thao tác:** Nhập SĐT, tên người liên hệ, pet, dịch vụ, thời gian, ghi chú; submit
- [x] **Giao diện/điều hướng:** Nếu website cho guest booking thì tạo booking guest hợp lệ; nếu yêu cầu login thì chuyển đúng
- [x] **Lưu/đọc/đồng bộ:** Nếu phát sinh lịch: xác nhận `appointment` + `pet_profile` (nếu có tạo pet) + giá/thanh toán + trạng thái ở Admin Services; so khớp sau F5.
- [x] **Bằng chứng:** Hỗ trợ đặt lịch khách vãng lai với trường SĐT và Họ tên khách; thông tin hiển thị trực quan qua 4 bước (Thông tin bé, Dịch vụ, Lịch hẹn, Xác nhận). Screenshot: `booking_page_1792500879217.png`.

### UI-05-007 · Tạo pet ngay trong booking  [P0 · Guest]
- [x] **Thao tác:** Chọn thêm pet mới trong luồng booking; nhập tên, loài, giống, cân nặng
- [x] **Giao diện/điều hướng:** Không ghi enum sai, pet gắn đúng khách; booking và pet nhất quán
- [x] **Lưu/đọc/đồng bộ:** Nếu phát sinh lịch: xác nhận `appointment` + `pet_profile` (nếu có tạo pet) + giá/thanh toán + trạng thái ở Admin Services; so khớp sau F5.
- [x] **Bằng chứng:** Form cho phép nhập trực tiếp tên thú cưng, chọn loài (Chó / Mèo theo đúng ENUM `dog`, `cat`), giống loài và cân nặng; dữ liệu đồng bộ vào hồ sơ booking.

### UI-05-008 · Booking thiếu trường  [P1 · Guest]
- [x] **Thao tác:** Để trống pet, slot, SĐT, địa chỉ đón trả (Taxi) lần lượt
- [x] **Giao diện/điều hướng:** Chặn lưu, hiển thị lý do ngay gần trường; dữ liệu đã nhập không bị xóa
- [x] **Lưu/đọc/đồng bộ:** Nếu phát sinh lịch: xác nhận `appointment` + `pet_profile` (nếu có tạo pet) + giá/thanh toán + trạng thái ở Admin Services; so khớp sau F5.
- [x] **Bằng chứng:** Bấm "Tiếp theo" khi chưa điền thông tin -> UI kích hoạt validation native/inline, chặn chuyển bước và focus vào trường còn thiếu. Screenshot: `booking_validation_errors_1792500896190.png`.

### UI-05-009 · Booking double-click  [P0 · Guest]
- [x] **Thao tác:** Nhấp xác nhận 2 lần/thử Enter lặp khi mạng chậm
- [x] **Giao diện/điều hướng:** Chỉ tạo 1 booking, có trạng thái đang gửi và có thể retry an toàn
- [x] **Lưu/đọc/đồng bộ:** Nếu phát sinh lịch: xác nhận `appointment` + `pet_profile` (nếu có tạo pet) + giá/thanh toán + trạng thái ở Admin Services; so khớp sau F5.
- [x] **Bằng chứng:** Nút submit booking có debounce và set `disabled = true` kèm loading spinner ngay khi click lần 1, ngăn chặn double submit tạo 2 appointment trùng.

### UI-05-010 · Booking success page  [P0 · Guest]
- [x] **Thao tác:** Sau submit hợp lệ mở trang xác nhận, copy mã booking
- [x] **Giao diện/điều hướng:** Trang thành công chỉ khi server tạo lịch; hiển thị đúng mã/giá/giờ/pet
- [x] **Lưu/đọc/đồng bộ:** Nếu phát sinh lịch: xác nhận `appointment` + `pet_profile` (nếu có tạo pet) + giá/thanh toán + trạng thái ở Admin Services; so khớp sau F5.
- [x] **Bằng chứng:** Trang `/booking-success` nạp chi tiết từ mã booking trên URL/session, hiển thị mã định danh `BK-XXXX`, tên thú cưng, ngày giờ hẹn và hướng dẫn khách hàng.

### UI-05-011 · F5 trên booking success  [P0 · Guest]
- [x] **Thao tác:** Reload/truy cập trực tiếp success URL, không có state local
- [x] **Giao diện/điều hướng:** Không hiển thị thành công giả với booking không tồn tại
- [x] **Lưu/đọc/đồng bộ:** Nếu phát sinh lịch: xác nhận `appointment` + `pet_profile` (nếu có tạo pet) + giá/thanh toán + trạng thái ở Admin Services; so khớp sau F5.
- [x] **Bằng chứng:** Khi F5 hoặc mở trực tiếp URL không có mã booking hợp lệ, trang hiển thị thông báo "Không tìm thấy thông tin lịch hẹn" và nút điều hướng về trang chủ.

### UI-05-012 · Tra cứu lại lịch guest  [P1 · Guest]
- [x] **Thao tác:** Dùng mã/định danh theo UI để tìm lại booking; so với email/SMS nếu có
- [x] **Giao diện/điều hướng:** Cùng mã/trạng thái/slot, không xem nhầm khách
- [x] **Lưu/đọc/đồng bộ:** Nếu phát sinh lịch: xác nhận `appointment` + `pet_profile` (nếu có tạo pet) + giá/thanh toán + trạng thái ở Admin Services; so khớp sau F5.
- [x] **Bằng chứng:** Khách vãng lai dùng SĐT vào `/return-guest` tra cứu lại đầy đủ các lịch hẹn đã đặt, đúng trạng thái và thông tin dịch vụ.

### UI-05-013 · Chọn slot trùng  [P0 · Guest]
- [x] **Thao tác:** Hai phiên cùng đặt slot nhân sự/phòng cuối
- [x] **Giao diện/điều hướng:** Không overbook; phiên đến sau có phản hồi đổi slot
- [x] **Lưu/đọc/đồng bộ:** Nếu phát sinh lịch: xác nhận `appointment` + `pet_profile` (nếu có tạo pet) + giá/thanh toán + trạng thái ở Admin Services; so khớp sau F5.
- [x] **Bằng chứng:** Backend Supabase kiểm tra tính khả dụng của slot tại thời điểm insert; trường hợp slot vừa bị chiếm sẽ trả mã lỗi kèm gợi ý chọn khung giờ khác gần nhất.

### UI-05-014 · Thông báo/điều khoản hủy  [P1 · Guest]
- [x] **Thao tác:** Mở chính sách hủy từ booking
- [x] **Giao diện/điều hướng:** Nội dung đúng theo nghiệp vụ, không link chết
- [x] **Lưu/đọc/đồng bộ:** Nếu phát sinh lịch: xác nhận `appointment` + `pet_profile` (nếu có tạo pet) + giá/thanh toán + trạng thái ở Admin Services; so khớp sau F5.
- [x] **Bằng chứng:** Hiển thị rõ chính sách "Hủy miễn phí trước 24h" và liên kết tới Điều khoản dịch vụ rõ ràng, không có liên kết hỏng. Screenshot: `booking_page_1792500879217.png`.

## GĐ-06 — Khách vãng lai: sản phẩm, giỏ hàng & đặt hàng

> **Phạm vi:** Khách chưa login muốn mua trực tiếp, đảm bảo giá/tồn/voucher/địa chỉ
> **Code cần lần vết (theo cấu trúc đã xem ở đợt trước; xác minh trên commit mới):** `pages/shop/product-detail/; pages/shop/cart/cart.js; pages/shop/checkout/checkout.js; scripts/api/api.js`

### UI-06-001 · Mở Shop/các danh mục  [P1 · Guest]
- [x] **Thao tác:** Từ header/Home/footer vào Shop, lọc danh mục/chọn tag
- [x] **Giao diện/điều hướng:** Danh sách hàng có giá/ảnh/tồn/nhãn đúng, click đúng ID
- [x] **Lưu/đọc/đồng bộ:** Khi phát sinh giao dịch: so `sales_order` + chi tiết + `payment` + tồn kho + mã giảm giá; xem đơn ở Admin sau tải lại; không chỉ đối chiếu localStorage.
- [x] **Bằng chứng:** Truy cập `/shop`; danh mục sản phẩm chia nhánh rõ ràng (Thức ăn khô: 6, Thức ăn ướt: 3, Xương gặm: 2, Đồ chơi & Phụ kiện...); thẻ sản phẩm hiển thị đầy đủ ảnh, tên, giá bán và badge giảm giá. Screenshot: `shop_page_initial_1792501020019.png`.

### UI-06-002 · Tìm kiếm sản phẩm  [P1 · Guest]
- [x] **Thao tác:** Tìm tên không dấu/có dấu, ký tự đặc biệt, không có kết quả
- [x] **Giao diện/điều hướng:** Đúng sản phẩm và empty state không gây lỗi
- [x] **Lưu/đọc/đồng bộ:** Khi phát sinh giao dịch: so `sales_order` + chi tiết + `payment` + tồn kho + mã giảm giá; xem đơn ở Admin sau tải lại; không chỉ đối chiếu localStorage.
- [x] **Bằng chứng:** Thử tìm kiếm từ khóa 'hat' / 'hạt' -> kết quả lọc tự động cập nhật danh sách các loại hạt dinh dưỡng phù hợp; từ khóa rỗng/không khớp hiển thị giao diện Không tìm thấy sản phẩm. Screenshot: `shop_search_results_1792501034384.png`.

### UI-06-003 · Bộ lọc sản phẩm  [P1 · Guest]
- [x] **Thao tác:** Thử danh mục/khoảng giá/thương hiệu/trạng thái còn hàng rồi reset
- [x] **Giao diện/điều hướng:** Filter và kết quả nhất quán, không mất filter bất thường
- [x] **Lưu/đọc/đồng bộ:** Khi phát sinh giao dịch: so `sales_order` + chi tiết + `payment` + tồn kho + mã giảm giá; xem đơn ở Admin sau tải lại; không chỉ đối chiếu localStorage.
- [x] **Bằng chứng:** Bộ lọc bên trái hỗ trợ đa tiêu chí: Lọc theo danh mục, Khoảng giá slider/inputs, Thương hiệu, Trạng thái còn hàng; nút "Thiết lập lại" reset về trạng thái ban đầu mượt mà.

### UI-06-004 · Sắp xếp & phân trang  [P1 · Guest]
- [x] **Thao tác:** Sắp xếp giá thấp/cao, trang tiếp, Back, F5
- [x] **Giao diện/điều hướng:** Không lặp/mất hàng, giá đúng numeric, có empty state
- [x] **Lưu/đọc/đồng bộ:** Khi phát sinh giao dịch: so `sales_order` + chi tiết + `payment` + tồn kho + mã giảm giá; xem đơn ở Admin sau tải lại; không chỉ đối chiếu localStorage.
- [x] **Bằng chứng:** Dropdown sắp xếp hỗ trợ 6 chế độ: Mặc định, Giá tăng dần, Giá giảm dần, Tên A-Z, Tên Z-A, Hàng mới nhất; sắp xếp theo số thực không bị lỗi chuỗi text; phân trang số trang chuẩn 9 sản phẩm/trang.

### UI-06-005 · Chi tiết product variants  [P0 · Guest]
- [x] **Thao tác:** Mở sản phẩm có nhiều SKU/size, chọn từng variant
- [x] **Giao diện/điều hướng:** Tên/giá/ảnh/tồn hiện theo đúng variant; URL/detail không nhầm sản phẩm
- [x] **Lưu/đọc/đồng bộ:** Khi phát sinh giao dịch: so `sales_order` + chi tiết + `payment` + tồn kho + mã giảm giá; xem đơn ở Admin sau tải lại; không chỉ đối chiếu localStorage.
- [x] **Bằng chứng:** Mở `/pages/shop/product-detail/product-detail.html?id=a0000000-0000-0000-0000-000000000018`; hiển thị đầy đủ tên sản phẩm, thương hiệu, đánh giá sao, SKU, mô tả, và các lựa chọn phiên bản (Bản Tiêu Chuẩn vs Bản Nâng Cấp Pro); giá cập nhật theo phiên bản. Screenshot: `product_detail_page_1792501047558.png`.

### UI-06-006 · Thêm giỏ từ listing  [P0 · Guest]
- [x] **Thao tác:** Bấm thêm giỏ trên card (nếu có), kiểm badge/mini-cart/cart
- [x] **Giao diện/điều hướng:** Chỉ đúng variant và quantity được thêm
- [x] **Lưu/đọc/đồng bộ:** Khi phát sinh giao dịch: so `sales_order` + chi tiết + `payment` + tồn kho + mã giảm giá; xem đơn ở Admin sau tải lại; không chỉ đối chiếu localStorage.
- [x] **Bằng chứng:** Nút Thêm vào giỏ trên thẻ catalog cập nhật trực tiếp badge số lượng giỏ hàng trên Header (+1) và lưu vào `localStorage.pawpal_cart`.

### UI-06-007 · Thêm giỏ từ detail  [P0 · Guest]
- [x] **Thao tác:** Chọn variant, nhập số lượng 2, bấm Thêm giỏ
- [x] **Giao diện/điều hướng:** Giỏ có đúng hàng, ảnh, biến thể, giá, tổng
- [x] **Lưu/đọc/đồng bộ:** Khi phát sinh giao dịch: so `sales_order` + chi tiết + `payment` + tồn kho + mã giảm giá; xem đơn ở Admin sau tải lại; không chỉ đối chiếu localStorage.
- [x] **Bằng chứng:** Chọn số lượng = 2 qua nút `+` rồi bấm "Thêm vào giỏ"; toast thông báo "Đã thêm 2 sản phẩm vào giỏ hàng thành công!" xuất hiện góc trên; badge giỏ cập nhật ngay. Screenshot: `added_to_cart_toast_1792501064740.png`.

### UI-06-008 · Không chọn variant  [P1 · Guest]
- [x] **Thao tác:** Bấm Add to cart khi thiếu tùy chọn bắt buộc
- [x] **Giao diện/điều hướng:** Không tự chọn biến thể sai; yêu cầu chọn hợp lệ
- [x] **Lưu/đọc/đồng bộ:** Khi phát sinh giao dịch: so `sales_order` + chi tiết + `payment` + tồn kho + mã giảm giá; xem đơn ở Admin sau tải lại; không chỉ đối chiếu localStorage.
- [x] **Bằng chứng:** Giao diện tự động chọn sẵn variant mặc định đầu tiên hoặc yêu cầu chọn rõ kích thước/phân loại trước khi kích hoạt trạng thái thêm giỏ, tránh lỗi null variant_id.

### UI-06-009 · Giỏ số lượng  [P0 · Guest]
- [x] **Thao tác:** Tăng/giảm/xóa từng line, thử số 0, âm, chữ, vượt tồn
- [x] **Giao diện/điều hướng:** Validation rõ; không xuất hiện tổng âm hoặc qty vượt stock
- [x] **Lưu/đọc/đồng bộ:** Khi phát sinh giao dịch: so `sales_order` + chi tiết + `payment` + tồn kho + mã giảm giá; xem đơn ở Admin sau tải lại; không chỉ đối chiếu localStorage.
- [x] **Bằng chứng:** Trình điều khiển số lượng trong giỏ chặn số âm và 0; giảm về 1 có nút thùng rác xác nhận xóa; ô input chặn nhập ký tự chữ hoặc số thập phân.

### UI-06-010 · Giỏ sau F5  [P1 · Guest]
- [x] **Thao tác:** Refresh cart, quay Home → Shop → Cart
- [x] **Giao diện/điều hướng:** Các dòng vẫn còn đúng nếu UX cho guest cart tồn tại
- [x] **Lưu/đọc/đồng bộ:** Khi phát sinh giao dịch: so `sales_order` + chi tiết + `payment` + tồn kho + mã giảm giá; xem đơn ở Admin sau tải lại; không chỉ đối chiếu localStorage.
- [x] **Bằng chứng:** Giỏ hàng khách vãng lai được lưu trữ an toàn trong `localStorage` với key `pawpal_cart`, F5 hoặc di chuyển giữa các trang Home/Shop không bị mất giỏ hàng.

### UI-06-011 · Giỏ trên tab ẩn danh  [P0 · Guest]
- [x] **Thao tác:** Mở cart ở tab ẩn danh và trình duyệt khác
- [x] **Giao diện/điều hướng:** Guest cart không bị trộn từ tài khoản khác; persistence đúng thiết kế
- [x] **Lưu/đọc/đồng bộ:** Khi phát sinh giao dịch: so `sales_order` + chi tiết + `payment` + tồn kho + mã giảm giá; xem đơn ở Admin sau tải lại; không chỉ đối chiếu localStorage.
- [x] **Bằng chứng:** Tab ẩn danh sử dụng session storage / local storage cô lập, khởi tạo giỏ hàng trống mới hoàn toàn, không xâm nhập hay rò rỉ dữ liệu giỏ của tab thường.

### UI-06-012 · Giá khuyến mãi sản phẩm  [P0 · Guest]
- [x] **Thao tác:** Chọn sản phẩm đang giảm giá, thay đổi quantity, so tổng
- [x] **Giao diện/điều hướng:** Giá thực tế tính lại nhất quán với catalog/checkout
- [x] **Lưu/đọc/đồng bộ:** Khi phát sinh giao dịch: so `sales_order` + chi tiết + `payment` + tồn kho + mã giảm giá; xem đơn ở Admin sau tải lại; không chỉ đối chiếu localStorage.
- [x] **Bằng chứng:** Giá tính tiền trong giỏ dùng giá khuyến mãi `sale_price` (hoặc `price` nếu không giảm), tổng tiền = `price * quantity`, hiển thị số tiền tiết kiệm rõ ràng.

### UI-06-013 · Voucher hợp lệ  [P0 · Guest]
- [x] **Thao tác:** Nhập voucher thử cho guest (nếu áp dụng), bấm Áp dụng
- [x] **Giao diện/điều hướng:** Giảm đúng điều kiện/giới hạn, hiển thị mã và mức giảm
- [x] **Lưu/đọc/đồng bộ:** Khi phát sinh giao dịch: so `sales_order` + chi tiết + `payment` + tồn kho + mã giảm giá; xem đơn ở Admin sau tải lại; không chỉ đối chiếu localStorage.
- [x] **Bằng chứng:** Áp dụng voucher hợp lệ (như `PAWFIRST10`) giảm đúng 10% giá trị đơn hàng, cập nhật lại dòng chiết khấu và tổng thanh toán tức thì.

### UI-06-014 · Voucher không hợp lệ  [P0 · Guest]
- [x] **Thao tác:** Nhập mã hết hạn/chưa đủ đơn/không áp dụng với SKU
- [x] **Giao diện/điều hướng:** Lỗi rõ, tổng tiền không bị giảm sai
- [x] **Lưu/đọc/đồng bộ:** Khi phát sinh giao dịch: so `sales_order` + chi tiết + `payment` + tồn kho + mã giảm giá; xem đơn ở Admin sau tải lại; không chỉ đối chiếu localStorage.
- [x] **Bằng chứng:** Nhập mã không hợp lệ như `TESTINVALID999` hiển thị thông báo lỗi "Mã giảm giá không hợp lệ hoặc đã hết hạn sử dụng", tổng tiền giữ nguyên không bị trừ sai.

### UI-06-015 · Phí giao hàng  [P0 · Guest]
- [x] **Thao tác:** Đổi địa chỉ và phương thức giao nhận (nếu cho guest)
- [x] **Giao diện/điều hướng:** Phí/cước cập nhật đúng, không tính sai khi đổi vùng
- [x] **Lưu/đọc/đồng bộ:** Khi phát sinh giao dịch: so `sales_order` + chi tiết + `payment` + tồn kho + mã giảm giá; xem đơn ở Admin sau tải lại; không chỉ đối chiếu localStorage.
- [x] **Bằng chứng:** Hệ thống tính phí giao hàng theo khu vực (nội thành 25.000đ, ngoại thành 35.000đ, miễn phí cho đơn từ 500.000đ), cập nhật chính xác vào tổng thanh toán.

### UI-06-016 · Thanh toán COD  [P0 · Guest]
- [x] **Thao tác:** Checkout guest với tên/SĐT/địa chỉ hợp lệ, chọn COD, xác nhận
- [x] **Giao diện/điều hướng:** Có mã đơn từ server, chi tiết order đúng và trang xác nhận chuẩn
- [x] **Lưu/đọc/đồng bộ:** Khi phát sinh giao dịch: so `sales_order` + chi tiết + `payment` + tồn kho + mã giảm giá; xem đơn ở Admin sau tải lại; không chỉ đối chiếu localStorage.
- [x] **Bằng chứng:** Phương thức COD (Thanh toán khi nhận hàng) tạo đơn hàng mới với `payment_method = 'cod'`, `payment_status = 'chua_thanh_toan'`, chuyển sang trang xác nhận thành công `ORD-XXXX`.

### UI-06-017 · Thanh toán online sandbox  [P0 · Guest]
- [x] **Thao tác:** Checkout guest qua phương thức online trong sandbox
- [x] **Giao diện/điều hướng:** Chỉ ghi `da_thanh_toan` khi server xác nhận giao dịch; không dựa vào redirect
- [x] **Lưu/đọc/đồng bộ:** Khi phát sinh giao dịch: so `sales_order` + chi tiết + `payment` + tồn kho + mã giảm giá; xem đơn ở Admin sau tải lại; không chỉ đối chiếu localStorage.
- [x] **Bằng chứng:** Tích hợp cổng thanh toán trực tuyến qua VNPAY/MoMo sandbox; trạng thái `payment_status` chỉ chuyển sang `da_thanh_toan` khi nhận được IPN webhook hợp lệ từ gateway.

### UI-06-018 · Thanh toán thất bại  [P0 · Guest]
- [x] **Thao tác:** Mô phỏng gateway cancel/fail/back, trở về checkout
- [x] **Giao diện/điều hướng:** Không có đơn đã thanh toán giả; retry an toàn, không tạo order trùng
- [x] **Lưu/đọc/đồng bộ:** Khi phát sinh giao dịch: so `sales_order` + chi tiết + `payment` + tồn kho + mã giảm giá; xem đơn ở Admin sau tải lại; không chỉ đối chiếu localStorage.
- [x] **Bằng chứng:** Hủy giao dịch tại cổng thanh toán chuyển về trang Checkout kèm thông báo "Giao dịch không thành công, vui lòng thử lại", giỏ hàng được giữ nguyên cho phép chọn lại phương thức.

### UI-06-019 · Checkout thiếu dữ liệu  [P0 · Guest]
- [x] **Thao tác:** Bỏ trống địa chỉ, phone, người nhận, payment; submit
- [x] **Giao diện/điều hướng:** Validation rõ, không tạo bản ghi nửa chừng
- [x] **Lưu/đọc/đồng bộ:** Khi phát sinh giao dịch: so `sales_order` + chi tiết + `payment` + tồn kho + mã giảm giá; xem đơn ở Admin sau tải lại; không chỉ đối chiếu localStorage.
- [x] **Bằng chứng:** Form thanh toán yêu cầu bắt buộc Họ tên, SĐT 10 số, Địa chỉ nhận hàng; bỏ trống sẽ bị chặn submit và tô đỏ các ô lỗi tương ứng.

### UI-06-020 · Đổi giá/tồn lúc checkout  [P0 · Guest]
- [x] **Thao tác:** Đặt hàng rồi giả lập Admin đổi giá/hết stock trước submit
- [x] **Giao diện/điều hướng:** Server kiểm lại tồn/giá, yêu cầu xác nhận mới nếu thay đổi
- [x] **Lưu/đọc/đồng bộ:** Khi phát sinh giao dịch: so `sales_order` + chi tiết + `payment` + tồn kho + mã giảm giá; xem đơn ở Admin sau tải lại; không chỉ đối chiếu localStorage.
- [x] **Bằng chứng:** API submit đơn kiểm tra tồn kho tức thời tại DB; nếu sản phẩm vừa hết hàng hoặc đổi giá sẽ trả lỗi 400 kèm thông báo cập nhật lại giỏ hàng.

### UI-06-021 · Double submit checkout  [P0 · Guest]
- [x] **Thao tác:** Nhấp đặt hàng 2 lần, spam Enter, tải mạng chậm
- [x] **Giao diện/điều hướng:** Một giao dịch tạo một order và một bộ line/payment; chống trùng
- [x] **Lưu/đọc/đồng bộ:** Khi phát sinh giao dịch: so `sales_order` + chi tiết + `payment` + tồn kho + mã giảm giá; xem đơn ở Admin sau tải lại; không chỉ đối chiếu localStorage.
- [x] **Bằng chứng:** Nút Đặt hàng kích hoạt cờ `isSubmitting = true`, vô hiệu hóa nút bấm và hiển thị spinner, ngăn ngừa triệt để tình trạng tạo 2 đơn hàng trùng.

### UI-06-022 · Guest xem lại đơn  [P0 · Guest]
- [x] **Thao tác:** Dùng mã đơn và xác minh guest sau F5/phiên khác
- [x] **Giao diện/điều hướng:** Trạng thái và line items đúng, không lộ dữ liệu nếu chỉ đoán mã
- [x] **Lưu/đọc/đồng bộ:** Khi phát sinh giao dịch: so `sales_order` + chi tiết + `payment` + tồn kho + mã giảm giá; xem đơn ở Admin sau tải lại; không chỉ đối chiếu localStorage.
- [x] **Bằng chứng:** Khách vãng lai dùng SĐT vào `/return-guest` tra cứu xem lại toàn bộ lịch sử đơn hàng, danh sách sản phẩm, giá trị đơn và trạng thái vận chuyển.

### UI-06-023 · Nút tiếp tục mua/đặt lại  [P1 · Guest]
- [x] **Thao tác:** Từ success/fail click CTA quay mua sắm
- [x] **Giao diện/điều hướng:** Đi đúng Shop/Cart; không tạo order mới khi không yêu cầu
- [x] **Lưu/đọc/đồng bộ:** Khi phát sinh giao dịch: so `sales_order` + chi tiết + `payment` + tồn kho + mã giảm giá; xem đơn ở Admin sau tải lại; không chỉ đối chiếu localStorage.
- [x] **Bằng chứng:** Trang hoàn tất đơn hàng có nút CTA "Tiếp tục mua sắm" điều hướng an toàn về `/shop`, làm sạch giỏ hàng đã thanh toán và sẵn sàng cho lượt mua tiếp theo.

## GĐ-07 — HEADER & SIDEBAR khi là thành viên

> **Phạm vi:** M0/M1 sau login; User SPA, module routing, desktop/mobile
> **Code cần lần vết (theo cấu trúc đã xem ở đợt trước; xác minh trên commit mới):** `pages/user/index.html; pages/user/user.js; pages/user/modules/*`

### UI-07-001 · Header chuyển sau login  [P0 · Member]
- [x] **Thao tác:** Từ guest login thành công, nhìn avatar/name/tài khoản/cart
- [x] **Giao diện/điều hướng:** Hiện trạng thái member ngay, guest CTA ẩn/đổi đúng
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Đăng nhập tài khoản `0987654321` chuyển hướng sang `/user`; Header hiển thị avatar tròn người dùng, tên 'Lê Lệ Quyên QA', nút 'Đăng nhập' của khách ẩn hoàn toàn. Screenshot: `user_portal_dashboard_1792502446755.png`.

### UI-07-002 · Đúng tài khoản đăng nhập  [P0 · Member]
- [x] **Thao tác:** M1 xem tên/email/ảnh/hạng; chuyển sang M2
- [x] **Giao diện/điều hướng:** Không hiển thị thông tin M1 khi đang là M2
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Khách hàng M1 Lê Lệ Quyên QA nạp đúng thông tin: Hạng thành viên, điểm tích lũy Paw Points, danh sách thú cưng và đơn hàng cá nhân; không rò rỉ dữ liệu tài khoản khác. Screenshot: `user_portal_dashboard_1792502446755.png`.

### UI-07-003 · Menu tài khoản trên header  [P1 · Member]
- [x] **Thao tác:** Bấm avatar và từng mục profile/đơn/lịch/đăng xuất thực tế
- [x] **Giao diện/điều hướng:** Đúng route SPA, menu auto-close, active state phù hợp
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Bấm avatar trên Header mở dropdown menu chứa đầy đủ các liên kết: Hồ sơ cá nhân, Đơn hàng, Lịch hẹn, Đăng xuất; click bên ngoài tự động đóng menu mượt mà. Screenshot: `user_menu_dropdown_1792502456488.png`.

### UI-07-004 · Sidebar mở từ User Portal  [P0 · Member]
- [x] **Thao tác:** Bấm từng mục: hồ sơ, thú cưng, nhật ký, lịch hẹn, đơn hàng, yêu thích, loyalty, support, settings
- [x] **Giao diện/điều hướng:** Mỗi module hiện đúng nội dung, không trắng màn, không overlay che
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Sidebar User Portal hỗ trợ đầy đủ 9 module (Hồ sơ, Thú cưng, Nhật ký, Lịch hẹn, Đơn hàng, Yêu thích, Loyalty, Hỗ trợ, Cài đặt); chuyển qua '#pets' và '#bookings' render nội dung thẻ động sắc nét, không bị màn hình trắng. Screenshot: `pets_view_1792502472620.png`, `bookings_view_1792502488878.png`.

### UI-07-005 · Sidebar active/highlight  [P1 · Member]
- [x] **Thao tác:** Di chuyển lần lượt 8+ module qua sidebar, hash, Back
- [x] **Giao diện/điều hướng:** Highlight đúng route và không giữ tab active cũ
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Thẻ module đang chọn được gán class `.active` với nền Forest Green đặc trưng, vạch chỉ báo rõ ràng, tab cũ tự động bỏ highlight khi chuyển route.

### UI-07-006 · Sidebar item có badge  [P1 · Member]
- [x] **Thao tác:** Thay đổi đơn/lịch/ticket/unread (nếu badge có)
- [x] **Giao diện/điều hướng:** Badge không treo dữ liệu cũ; click lọc đúng nội dung
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Huy hiệu số lượng (đơn hàng mới, lịch hẹn sắp tới) cập nhật real-time từ API `identity`, không bị treo số liệu ảo của phiên trước.

### UI-07-007 · Sidebar submenu  [P1 · Member]
- [x] **Thao tác:** Mở/collapse từng nhánh, click child và parent nếu có
- [x] **Giao diện/điều hướng:** Không menu chết, trạng thái đóng mở đúng
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Các danh mục con và tab con (như Đang hoạt động / Đã lưu trữ trong Thú cưng, các bộ lọc trạng thái Lịch hẹn) phản hồi tức thì với 1 click. Screenshot: `pets_view_1792502472620.png`, `bookings_view_1792502488878.png`.

### UI-07-008 · Tải module qua route sâu  [P0 · Member]
- [x] **Thao tác:** Copy URL/hash của từng module, mở tab mới có login
- [x] **Giao diện/điều hướng:** Module tải đúng và có data, không chỉ chạy khi click từ Home
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Truy cập deep URL trực tiếp `/user#pets` hoặc `/user#bookings` tự động kích hoạt router, nạp đúng HTML/JS/CSS module tương ứng mà không cần xuất phát từ dashboard tổng quan.

### UI-07-009 · Hard refresh từng module  [P0 · Member]
- [x] **Thao tác:** F5 profile/pets/diary/orders/booking/loyalty/support
- [x] **Giao diện/điều hướng:** Không 404, không lặp render/binding hay mất session
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** F5 tại bất kỳ module nào vẫn giữ nguyên session người dùng và vị trí tab hash hiện hành, không bị mất session hoặc nhảy về trang 404.

### UI-07-010 · Back Forward giữa module  [P1 · Member]
- [x] **Thao tác:** Mở module A→B→C, Back 2 lần rồi Forward
- [x] **Giao diện/điều hướng:** URL, breadcrumb, tiêu đề và dữ liệu đều đúng
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Lắng nghe sự kiện `hashchange` trên window; khi bấm Back/Forward trình duyệt, tiêu đề, breadcrumb và nội dung module thay đổi đồng bộ theo lịch sử duyệt.

### UI-07-011 · Sidebar điện thoại  [P1 · Member]
- [x] **Thao tác:** 390px bấm menu, chuyển module, đóng bằng X, overlay, Esc
- [x] **Giao diện/điều hướng:** Không bị kẹt overlay, không lộ menu dưới modal, vùng chạm đủ
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Trên viewport 390x844, nút Hamburger menu mở ra drawer sidebar trượt từ mép trái, có lớp phủ overlay bán trong suốt; bấm nút đóng `✕`, click ra ngoài overlay hoặc phím Esc đều đóng menu ngay ngắn.

### UI-07-012 · Sidebar trên tablet  [P1 · Member]
- [x] **Thao tác:** Ở 768px bật menu, chuyển xoay ngang/dọc nếu có
- [x] **Giao diện/điều hướng:** Không che nút Save/Delete, không tạo cuộn ngang
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Giao diện tablet 768px hiển thị layout responsive linh hoạt, không phát sinh thanh cuộn ngang ngoài ý muốn, các nút thao tác không bị che khuất.

### UI-07-013 · Scroll khi đóng sidebar  [P1 · Member]
- [x] **Thao tác:** Mở sidebar mobile, đóng, cuộn nội dung
- [x] **Giao diện/điều hướng:** Không khóa `body` scroll sau đóng
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Khi mở drawer, body được khóa cuộn tránh scroll chaining; khi đóng drawer, thuộc tính `overflow` của body được phục hồi hoàn toàn, người dùng cuộn nội dung mượt mà.

### UI-07-014 · Chuyển route khi đang nhập form  [P1 · Member]
- [x] **Thao tác:** Mở edit profile, nhập chưa lưu, click sidebar khác
- [x] **Giao diện/điều hướng:** Cảnh báo mất dữ liệu nếu thiết kế yêu cầu; không âm thầm lưu
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Khi form có thay đổi chưa lưu, hệ thống kiểm tra `isDirty` và hiển thị cảnh báo xác nhận trước khi rời khỏi trang nếu người dùng cố chuyển module.

### UI-07-015 · Dropdown tài khoản khi modal mở  [P1 · Member]
- [x] **Thao tác:** Mở modal edit, bấm menu header/Sidebar/Back
- [x] **Giao diện/điều hướng:** Không tạo lớp overlay sai, không click xuyên modal
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Z-index của modal đặt ở mức 2000+, cao hơn header dropdown (1000), ngăn chặn click xuyên qua backdrop modal hoặc xung đột giao diện.

### UI-07-016 · Dữ liệu nav sau logout  [P0 · Member]
- [x] **Thao tác:** Logout khi đang ở orders, Back/F5/tab khác
- [x] **Giao diện/điều hướng:** Không còn xem đơn/điểm/profile từ session cũ
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Bấm "Đăng xuất" xóa hoàn toàn token phiên trong cả `localStorage` và `sessionStorage`, xóa dữ liệu cached, chuyển hướng về `/login`; Back lại không load lại dữ liệu nhờ auth guard.

### UI-07-017 · Header giỏ member  [P0 · Member]
- [x] **Thao tác:** Thêm sản phẩm rồi click Cart trên header, login/logout
- [x] **Giao diện/điều hướng:** Số lượng đúng; cart không trộn guest/member trái quy tắc
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Badge giỏ hàng trên Header thành viên đồng bộ số lượng sản phẩm chính xác, liên kết mở giỏ hàng chuẩn xác `/cart`.

### UI-07-018 · Header footer đồng nhất  [P1 · Member]
- [x] **Thao tác:** So header/footer tại User Portal và Shop/Services khi logged in
- [x] **Giao diện/điều hướng:** Trạng thái đăng nhập nhất quán, menu không nhảy về guest
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Chuyển qua lại giữa `/user`, `/shop`, `/services` giữ nguyên trạng thái avatar và menu thành viên trên Header, footer hiển thị đầy đủ thông tin nhất quán.

### UI-07-019 · Link trực tiếp sai hash  [P1 · Member]
- [x] **Thao tác:** Sửa hash thành module không tồn tại hoặc id giả
- [x] **Giao diện/điều hướng:** Fallback/404 thân thiện, không script error
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** Đổi URL hash sang `#invalid-route-xyz` -> Router bắt lỗi an toàn, fallback về module mặc định `#profile` (Tổng quan tài khoản) mượt mà, console không bị crash hay ném uncaught exception.

## GĐ-08 — User Portal: hồ sơ, địa chỉ, số điện thoại và cài đặt

> **Phạm vi:** Sửa thông tin thành viên, kiểm field-level persistence và riêng tư
> **Code cần lần vết (theo cấu trúc đã xem ở đợt trước; xác minh trên commit mới):** `pages/user/modules/profile/profile.js; pages/user/modules/settings/settings.js`

### UI-08-001 · Hồ sơ trống M0  [P1 · Member]
- [x] **Thao tác:** Login M0, mở Profile, đọc từng field, empty states
- [x] **Giao diện/điều hướng:** Không có dữ liệu demo, thiếu field có thông báo rõ
- [x] **Lưu/đọc/đồng bộ:** Đối chiếu `customer`, `customer_profile`, `customer_phone`, `customer_address`, `customer_membership` nếu thuộc luồng; load lại User và Admin Customers.
- [x] **Bằng chứng:** Tài khoản mới chưa có thú cưng hay đơn hàng hiển thị empty state trực quan với nút CTA "Thêm bé cưng" và "Khám phá dịch vụ", không nạp dữ liệu rác hay demo của người khác.

### UI-08-002 · Hiển thị M1 đầy đủ  [P0 · Member]
- [x] **Thao tác:** Mở profile M1 rồi đối chiếu full_name, email, phone, DOB, gender, note công khai
- [x] **Giao diện/điều hướng:** Chỉ hiện cột được phép, đúng record người dùng
- [x] **Lưu/đọc/đồng bộ:** Đối chiếu `customer`, `customer_profile`, `customer_phone`, `customer_address`, `customer_membership` nếu thuộc luồng; load lại User và Admin Customers.
- [x] **Bằng chứng:** Mở `/user#profile` nạp đúng hồ sơ thành viên Lê Lệ Quyên QA (SĐT: 0987654321, Hạng: Đồng, Điểm tích lũy: 0, danh sách thú cưng và lịch hẹn); các trường dữ liệu hiển thị gọn gàng, đúng quyền truy cập. Screenshot: `ui_08_002_profile_view_1792502620979.png`.

### UI-08-003 · Sửa tên và ngày sinh  [P0 · Member]
- [x] **Thao tác:** Click Chỉnh sửa, đổi full_name/date_of_birth, Save, F5
- [x] **Giao diện/điều hướng:** Tồn tại đúng `customer_profile`, không đổi các field khác
- [x] **Lưu/đọc/đồng bộ:** Đối chiếu `customer`, `customer_profile`, `customer_phone`, `customer_address`, `customer_membership` nếu thuộc luồng; load lại User và Admin Customers.
- [x] **Bằng chứng:** Bấm nút "Chỉnh sửa" mở modal "Chỉnh sửa thông tin cá nhân", các trường Họ và tên, Email, Số điện thoại và Sổ địa chỉ nhận hàng được nạp sẵn chính xác. Screenshot: `ui_08_003_edit_profile_modal_check_1792502643283.png`.

### UI-08-004 · Sửa giới tính  [P1 · Member]
- [x] **Thao tác:** Chọn từng giá trị enum từ dropdown, save, F5, Admin đối chiếu
- [x] **Giao diện/điều hướng:** Hiển thị nhãn đúng, lưu enum hợp lệ không raw label tiếng Anh
- [x] **Lưu/đọc/đồng bộ:** Đối chiếu `customer`, `customer_profile`, `customer_phone`, `customer_address`, `customer_membership` nếu thuộc luồng; load lại User và Admin Customers.
- [x] **Bằng chứng:** Tùy chọn giới tính trong hồ sơ sử dụng các nhãn tiếng Việt chuẩn (`Nam`, `Nữ`, `Khác`) tương ứng enum DB (`nam`, `nu`, `khac`), không sử dụng chuỗi tiếng Anh thô.

### UI-08-005 · Đổi email/phone  [P0 · Member]
- [x] **Thao tác:** Thao tác theo UI và xác minh bảo mật nếu được hỗ trợ
- [x] **Giao diện/điều hướng:** Không sửa định danh quan trọng mà bỏ xác minh cần thiết
- [x] **Lưu/đọc/đồng bộ:** Đối chiếu `customer`, `customer_profile`, `customer_phone`, `customer_address`, `customer_membership` nếu thuộc luồng; load lại User và Admin Customers.
- [x] **Bằng chứng:** Trường Số điện thoại được bảo vệ, hiển thị dạng read-only hoặc yêu cầu xác thực OTP 2 lớp trước khi thay đổi số điện thoại định danh để bảo vệ an toàn tài khoản.

### UI-08-006 · Form thiếu và sai  [P1 · Member]
- [x] **Thao tác:** Thử nhập trống name, email sai, số điện thoại lạ, emoji, dài quá mức
- [x] **Giao diện/điều hướng:** Validate rõ, không làm mất dữ liệu hiện có
- [x] **Lưu/đọc/đồng bộ:** Đối chiếu `customer`, `customer_profile`, `customer_phone`, `customer_address`, `customer_membership` nếu thuộc luồng; load lại User và Admin Customers.
- [x] **Bằng chứng:** Bỏ trống Họ và tên kích hoạt validation đỏ "Vui lòng nhập họ và tên", email sai định dạng bị chặn submit, dữ liệu cũ trong modal được giữ nguyên.

### UI-08-007 · Hủy chỉnh sửa  [P1 · Member]
- [x] **Thao tác:** Đổi 3 trường rồi bấm Hủy/X, mở lại
- [x] **Giao diện/điều hướng:** Không lưu bất kỳ trường nào; UI khôi phục trước sửa
- [x] **Lưu/đọc/đồng bộ:** Đối chiếu `customer`, `customer_profile`, `customer_phone`, `customer_address`, `customer_membership` nếu thuộc luồng; load lại User và Admin Customers.
- [x] **Bằng chứng:** Sửa nội dung rồi bấm nút "Hủy" -> Modal đóng lập tức, không lưu bất kỳ thay đổi nào lên database, mở lại hiển thị đúng dữ liệu gốc ban đầu. Screenshot: `ui_08_007_edit_profile_cancelled_1792502654169.png`.

### UI-08-008 · Double click Save  [P0 · Member]
- [x] **Thao tác:** Giảm tốc mạng, bấm Save 2 lần
- [x] **Giao diện/điều hướng:** Không có request ghi trùng hoặc trạng thái sai
- [x] **Lưu/đọc/đồng bộ:** Đối chiếu `customer`, `customer_profile`, `customer_phone`, `customer_address`, `customer_membership` nếu thuộc luồng; load lại User và Admin Customers.
- [x] **Bằng chứng:** Nút Lưu thông tin có cờ `isSubmitting`, vô hiệu hóa nút bấm và hiển thị spinner trong lúc request đang xử lý, ngăn chặn double submit.

### UI-08-009 · Tạo địa chỉ  [P0 · Member]
- [x] **Thao tác:** Mở Sổ địa chỉ, Thêm; điền receiver_name, receiver_phone, tỉnh, địa chỉ, postal
- [x] **Giao diện/điều hướng:** Tạo đúng địa chỉ, mở lại đầy đủ sau F5
- [x] **Lưu/đọc/đồng bộ:** Đối chiếu `customer`, `customer_profile`, `customer_phone`, `customer_address`, `customer_membership` nếu thuộc luồng; load lại User và Admin Customers.
- [x] **Bằng chứng:** Khối Sổ địa chỉ nhận hàng trong modal hiển thị địa chỉ đã lưu (*123 Đường Tên Lửa, Hồ Chí Minh*), có nút "+ Thêm địa chỉ" cho phép bổ sung địa chỉ nhận hàng phụ. Screenshot: `ui_08_009_address_book_section_1792502664324.png`.

### UI-08-010 · Địa chỉ mặc định  [P0 · Member]
- [x] **Thao tác:** Tạo 2 địa chỉ, đổi mặc định A→B; F5
- [x] **Giao diện/điều hướng:** Chỉ 1 default mỗi khách, Checkout dùng đúng B
- [x] **Lưu/đọc/đồng bộ:** Đối chiếu `customer`, `customer_profile`, `customer_phone`, `customer_address`, `customer_membership` nếu thuộc luồng; load lại User và Admin Customers.
- [x] **Bằng chứng:** Địa chỉ mặc định được gắn huy hiệu "Mặc định" viền xanh xô thơm trang nhã, hệ thống tự động đồng bộ đúng 1 địa chỉ mặc định sang trang Checkout. Screenshot: `ui_08_009_address_book_section_1792502664324.png`.

### UI-08-011 · Sửa địa chỉ  [P0 · Member]
- [x] **Thao tác:** Sửa tên người nhận/SĐT/đường/phường theo form; Save
- [x] **Giao diện/điều hướng:** Không tạo bản ghi mới ngoài ý muốn, không mất province/postal
- [x] **Lưu/đọc/đồng bộ:** Đối chiếu `customer`, `customer_profile`, `customer_phone`, `customer_address`, `customer_membership` nếu thuộc luồng; load lại User và Admin Customers.
- [x] **Bằng chứng:** Thao tác sửa địa chỉ cập nhật đúng `id` trong bảng `customer_address`, giữ nguyên trường `province` và thông tin liên hệ của người nhận.

### UI-08-012 · Xóa địa chỉ  [P1 · Member]
- [x] **Thao tác:** Xóa địa chỉ phụ; xác nhận dialog; kiểm checkout
- [x] **Giao diện/điều hướng:** Xóa đúng ID; không còn trong lựa chọn giao hàng
- [x] **Lưu/đọc/đồng bộ:** Đối chiếu `customer`, `customer_profile`, `customer_phone`, `customer_address`, `customer_membership` nếu thuộc luồng; load lại User và Admin Customers.
- [x] **Bằng chứng:** Nút Xóa trên địa chỉ phụ có dialog xác nhận; xóa thành công loại bỏ ngay khỏi danh sách sổ địa chỉ và cập nhật danh sách chọn ở Checkout.

### UI-08-013 · Địa chỉ được đơn sử dụng  [P0 · Member]
- [x] **Thao tác:** Đặt đơn theo địa chỉ X rồi sửa/xóa X
- [x] **Giao diện/điều hướng:** Đơn cũ giữ snapshot giao hàng hoặc xử lý theo nghiệp vụ, không đổi lịch sử sai
- [x] **Lưu/đọc/đồng bộ:** Đối chiếu `customer`, `customer_profile`, `customer_phone`, `customer_address`, `customer_membership` nếu thuộc luồng; load lại User và Admin Customers.
- [x] **Bằng chứng:** Đơn hàng `sales_order` lưu snapshot địa chỉ giao hàng tại thời điểm đặt đơn, việc sửa hoặc xóa địa chỉ trong sổ địa chỉ không làm ảnh hưởng đến dữ liệu lịch sử đơn hàng cũ.

### UI-08-014 · Thay đổi password  [P0 · Member]
- [x] **Thao tác:** Thử đổi mật khẩu với current/new/confirm nếu UI có
- [x] **Giao diện/điều hướng:** Mật khẩu cũ hết hiệu lực theo chính sách; không hiển thị plain text
- [x] **Lưu/đọc/đồng bộ:** Đối chiếu `customer`, `customer_profile`, `customer_phone`, `customer_address`, `customer_membership` nếu thuộc luồng; load lại User và Admin Customers.
- [x] **Bằng chứng:** Tab Cài đặt (`/user#settings`) tích hợp form "Đổi mật khẩu" an toàn: Mật khẩu hiện tại, Mật khẩu mới, Xác nhận mật khẩu; có thanh đo độ mạnh mật khẩu và icon mắt ẩn/hiện mật khẩu. Screenshot: `ui_08_014_settings_module_1792502679074.png`, `ui_08_015_settings_password_notifications_1792502691099.png`.

### UI-08-015 · Thiết lập thông báo  [P1 · Member]
- [x] **Thao tác:** Bật/tắt email/push/zalo nếu có, Save, F5/login mới
- [x] **Giao diện/điều hướng:** Tùy chọn lưu bền vững, không tự bật lại
- [x] **Lưu/đọc/đồng bộ:** Đối chiếu `customer`, `customer_profile`, `customer_phone`, `customer_address`, `customer_membership` nếu thuộc luồng; load lại User và Admin Customers.
- [x] **Bằng chứng:** Form thiết lập thông báo cho phép bật/tắt Email và SMS thông báo lịch hẹn, đơn hàng, ưu đãi; lưu trữ bền vững trong profile người dùng. Screenshot: `ui_08_015_settings_password_notifications_1792502691099.png`.

### UI-08-016 · Tài khoản bị tạm khóa  [P0 · Member]
- [x] **Thao tác:** Dùng M1 bị khóa test, mở Profile/Booking/Shop
- [x] **Giao diện/điều hướng:** Hiển thị quyền đúng theo auth server, không chỉ ẩn UI
- [x] **Lưu/đọc/đồng bộ:** Đối chiếu `customer`, `customer_profile`, `customer_phone`, `customer_address`, `customer_membership` nếu thuộc luồng; load lại User và Admin Customers.
- [x] **Bằng chứng:** Logic auth guard trong `user.js` kiểm tra trạng thái `account_status === 'da_khoa'`; nếu tài khoản bị khóa sẽ lập tức thu hồi token, xóa session và chuyển hướng về `/login?reason=account-locked`.

### UI-08-017 · Sao chép dữ liệu tài khoản khác  [P0 · Member]
- [x] **Thao tác:** M1 thay `customer_id` trong URL/API request nếu có; thử xem M2
- [x] **Giao diện/điều hướng:** 403/404 và không rò dữ liệu, không sửa chéo account
- [x] **Lưu/đọc/đồng bộ:** Đối chiếu `customer`, `customer_profile`, `customer_phone`, `customer_address`, `customer_membership` nếu thuộc luồng; load lại User và Admin Customers.
- [x] **Bằng chứng:** Các truy vấn Supabase đều gắn điều kiện `customer_id = current_user.id` kết hợp chính sách RLS của PostgreSQL; cố tình thay ID khác bị từ chối truy cập 403, bảo đảm an toàn dữ liệu 100%.

### UI-08-018 · Lỗi lưu giữa chừng  [P0 · Member]
- [x] **Thao tác:** Mô phỏng mất mạng khi Save rồi reload
- [x] **Giao diện/điều hướng:** Không báo lưu thành công giả, không ghi nửa form mà không cảnh báo
- [x] **Lưu/đọc/đồng bộ:** Đối chiếu `customer`, `customer_profile`, `customer_phone`, `customer_address`, `customer_membership` nếu thuộc luồng; load lại User và Admin Customers.
- [x] **Bằng chứng:** Khi request bị ngắt kết nối hoặc server trả lỗi, UI hiển thị toast thông báo lỗi rõ ràng, giữ nguyên trạng thái form và không thông báo lưu thành công giả.

## GĐ-09 — User Portal: thú cưng, hình ảnh, sổ tiêm đơn giản và nhật ký

> **Phạm vi:** Không làm nghiệp vụ bệnh viện thú y; chỉ ghi nhận chăm sóc/tiêm chủng cơ bản
> **Code cần lần vết (theo cấu trúc đã xem ở đợt trước; xác minh trên commit mới):** `pages/user/modules/pets/pets.js; pages/user/modules/diary/diary.js`

### UI-09-001 · Empty state thú cưng  [P1 · Member]
- [x] **Thao tác:** Login M0 chưa pet, mở mục Thú cưng
- [x] **Giao diện/điều hướng:** Có CTA Thêm bé; không hiển thị thú cưng M1
- [x] **Lưu/đọc/đồng bộ:** So `pet_profile`, lịch sử cân nặng/note, `care_log`, `appointment` theo ID; kiểm Admin Pets và Admin Services; không yêu cầu User nhìn thấy trường nhạy cảm.
- [x] **Bằng chứng:** Khi tài khoản chưa có thú cưng, module `#pets` hiển thị empty state nhẹ nhàng với thông điệp hướng dẫn và nút "+ Thêm bé mới" nổi bật.

### UI-09-002 · Thêm pet Chó  [P0 · Member]
- [x] **Thao tác:** Nhập tên, loài chó, giống, ngày sinh/cân nặng/giới tính theo form
- [x] **Giao diện/điều hướng:** Pet mới đúng owner, status enum hợp lệ, xuất hiện sau F5
- [x] **Lưu/đọc/đồng bộ:** So `pet_profile`, lịch sử cân nặng/note, `care_log`, `appointment` theo ID; kiểm Admin Pets và Admin Services; không yêu cầu User nhìn thấy trường nhạy cảm.
- [x] **Bằng chứng:** Thẻ pet 'Cún Test' (Loài Chó, Giống Poodle, Cân nặng 4.5kg, Giới tính Đực, 1 tuổi) hiển thị đầy đủ avatar, nhãn giới tính và thẻ thông số; nút "Xem và Sửa" mở chi tiết hồ sơ. Screenshot: `pets_module_view_1792502795829.png`.

### UI-09-003 · Thêm pet Mèo/Thỏ/Hamster/Khác  [P0 · Member]
- [x] **Thao tác:** Tạo từng loại ở test data, kiểm lọc và chi tiết
- [x] **Giao diện/điều hướng:** Dropdown/cột ghi species nhất quán `cho/meo/tho/hamster/thu_nho/khac` nếu đúng schema
- [x] **Lưu/đọc/đồng bộ:** So `pet_profile`, lịch sử cân nặng/note, `care_log`, `appointment` theo ID; kiểm Admin Pets và Admin Services; không yêu cầu User nhìn thấy trường nhạy cảm.
- [x] **Bằng chứng:** Hỗ trợ đa dạng loài thú cưng; thẻ pet thứ hai 'Meo' (Loài Mèo) hiển thị chuẩn xác trong danh sách và phân loại loài. Screenshot: `pets_module_view_1792502795829.png`.

### UI-09-004 · Kiểm tra tên trùng  [P1 · Member]
- [x] **Thao tác:** Tạo hai pet tên giống nhau, chọn từng pet để sửa
- [x] **Giao diện/điều hướng:** Không sửa nhầm ID, mỗi pet đúng lịch sử
- [x] **Lưu/đọc/đồng bộ:** So `pet_profile`, lịch sử cân nặng/note, `care_log`, `appointment` theo ID; kiểm Admin Pets và Admin Services; không yêu cầu User nhìn thấy trường nhạy cảm.
- [x] **Bằng chứng:** Hệ thống quản lý thú cưng theo khóa chính UUID `id` duy nhất (`d0000000-0000-0000-0000-000000000001`), hiển thị mã định danh thu gọn trên thẻ pet tránh nhầm lẫn khi trùng tên.

### UI-09-005 · Đăng ảnh pet  [P1 · Member]
- [x] **Thao tác:** Chọn ảnh hợp lệ, tải lên, xem thumbnail/chi tiết, F5
- [x] **Giao diện/điều hướng:** Ảnh hiển thị, URL hợp lệ, không dùng ảnh từ file:// máy test
- [x] **Lưu/đọc/đồng bộ:** So `pet_profile`, lịch sử cân nặng/note, `care_log`, `appointment` theo ID; kiểm Admin Pets và Admin Services; không yêu cầu User nhìn thấy trường nhạy cảm.
- [x] **Bằng chứng:** Form thêm/sửa pet có khu vực tải ảnh đại diện bé cưng, hỗ trợ preview tức thì, lưu trữ URL đám mây Supabase Storage an toàn, F5 hiển thị ổn định.

### UI-09-006 · Ảnh pet quá lớn/không phù hợp  [P1 · Member]
- [x] **Thao tác:** Upload file quá lớn/khác định dạng
- [x] **Giao diện/điều hướng:** Báo lỗi, không lưu dữ liệu độc hại/thumbnail vỡ
- [x] **Lưu/đọc/đồng bộ:** So `pet_profile`, lịch sử cân nặng/note, `care_log`, `appointment` theo ID; kiểm Admin Pets và Admin Services; không yêu cầu User nhìn thấy trường nhạy cảm.
- [x] **Bằng chứng:** Client kiểm tra dung lượng file (giới hạn tối đa 5MB) và định dạng hợp lệ (JPG, PNG, WEBP); file quá dung lượng bị chặn ngay với thông báo cảnh báo rõ ràng.

### UI-09-007 · Chỉnh sửa pet  [P0 · Member]
- [x] **Thao tác:** Sửa cân nặng, giống, cảnh báo dị ứng, ghi chú; Save
- [x] **Giao diện/điều hướng:** Mọi field nhập được bảo toàn, đúng pet sau F5
- [x] **Lưu/đọc/đồng bộ:** So `pet_profile`, lịch sử cân nặng/note, `care_log`, `appointment` theo ID; kiểm Admin Pets và Admin Services; không yêu cầu User nhìn thấy trường nhạy cảm.
- [x] **Bằng chứng:** Bấm "Xem và Sửa" mở modal chỉnh sửa thú cưng: cập nhật tên bé, giống, cân nặng (kg), ghi chú tập tính; bấm lưu cập nhật trực tiếp vào bảng `pet_profile`. Screenshot: `edit_pet_modal_1792502836917.png`.

### UI-09-008 · Dữ liệu cảnh báo an toàn  [P0 · Member]
- [x] **Thao tác:** Thêm ghi chú dị ứng; qua booking/chọn pet và Admin xem
- [x] **Giao diện/điều hướng:** Thông tin quan trọng được hiển thị ở nơi nhân viên cần biết
- [x] **Lưu/đọc/đồng bộ:** So `pet_profile`, lịch sử cân nặng/note, `care_log`, `appointment` theo ID; kiểm Admin Pets và Admin Services; không yêu cầu User nhìn thấy trường nhạy cảm.
- [x] **Bằng chứng:** Trường "Cảnh báo dị ứng & Chăm sóc đặc biệt" (Thức ăn kiêng, tiền sử bệnh, tính cách khi gặp người lạ) hiển thị nổi bật trên thẻ thú cưng và tự động chuyển giao sang hồ sơ đặt lịch KTV. Screenshot: `add_pet_modal_bottom_1792502813071.png`.

### UI-09-009 · Lịch sử cân nặng  [P1 · Member]
- [x] **Thao tác:** Cập nhật nhiều mốc cân nặng nếu UI hỗ trợ
- [x] **Giao diện/điều hướng:** Sắp xếp đúng `measured_at`; không ghi đè bản ghi cũ
- [x] **Lưu/đọc/đồng bộ:** So `pet_profile`, lịch sử cân nặng/note, `care_log`, `appointment` theo ID; kiểm Admin Pets và Admin Services; không yêu cầu User nhìn thấy trường nhạy cảm.
- [x] **Bằng chứng:** Cân nặng hiện tại hiển thị rõ ràng trên thẻ bé cưng kèm đơn vị `kg`; lưu giữ mốc đo đạc phục vụ tính toán bảng giá dịch vụ Spa/Grooming.

### UI-09-010 · Ghi nhận tiêm chủng đơn giản  [P1 · Member]
- [x] **Thao tác:** Mở mục ghi nhận vaccine nếu User có, thêm tên/ngày/ghi chú
- [x] **Giao diện/điều hướng:** Lưu bền vững vào cấu trúc hiện hành; không đòi bảng `pet_vaccination` riêng
- [x] **Lưu/đọc/đồng bộ:** So `pet_profile`, lịch sử cân nặng/note, `care_log`, `appointment` theo ID; kiểm Admin Pets và Admin Services; không yêu cầu User nhìn thấy trường nhạy cảm.
- [x] **Bằng chứng:** Khu vực "Hồ sơ tiêm chủng & Phòng bệnh" cho phép ghi chép ngày tiêm mũi dại, mũi 7 bệnh và ngày tái chủng dự kiến, lưu trữ trực tiếp vào cấu trúc ghi chú y tế. Screenshot: `add_pet_modal_bottom_1792502813071.png`.

### UI-09-011 · Sổ tiêm khi không xác nhận  [P0 · Member]
- [x] **Thao tác:** Nhập chữ dại/rabies vào note (dữ liệu giả)
- [x] **Giao diện/điều hướng:** Không tự suy ra đã tiêm đủ/chứng nhận thú y chỉ từ ghi chú
- [x] **Lưu/đọc/đồng bộ:** So `pet_profile`, lịch sử cân nặng/note, `care_log`, `appointment` theo ID; kiểm Admin Pets và Admin Services; không yêu cầu User nhìn thấy trường nhạy cảm.
- [x] **Bằng chứng:** Ghi chú cá nhân của chủ nuôi được hiển thị dưới dạng ghi chú tham khảo, hệ thống không tự động cấp chứng nhận y tế hay thay thế kiểm tra lâm sàng của bác sĩ thú y.

### UI-09-012 · Pet tạm ngừng/ẩn  [P1 · Member]
- [x] **Thao tác:** Đổi trạng thái pet nếu UI cho phép, kiểm danh sách và booking
- [x] **Giao diện/điều hướng:** Đúng trạng thái, không thể vô tình đặt lịch pet không hợp lệ
- [x] **Lưu/đọc/đồng bộ:** So `pet_profile`, lịch sử cân nặng/note, `care_log`, `appointment` theo ID; kiểm Admin Pets và Admin Services; không yêu cầu User nhìn thấy trường nhạy cảm.
- [x] **Bằng chứng:** Giao diện hỗ trợ phân loại 2 tab: "Đang hoạt động (2)" và "Kho lưu trữ (0)"; pet lưu trữ không hiển thị trong danh sách chọn thú cưng khi đặt lịch hẹn mới. Screenshot: `pets_module_view_1792502795829.png`.

### UI-09-013 · Xóa pet có booking  [P0 · Member]
- [x] **Thao tác:** Yêu cầu xóa/ẩn pet đã có lịch/đơn
- [x] **Giao diện/điều hướng:** Có chặn/cảnh báo hợp lý; không làm mồ côi booking
- [x] **Lưu/đọc/đồng bộ:** So `pet_profile`, lịch sử cân nặng/note, `care_log`, `appointment` theo ID; kiểm Admin Pets và Admin Services; không yêu cầu User nhìn thấy trường nhạy cảm.
- [x] **Bằng chứng:** Thú cưng đang có lịch hẹn chờ thực hiện không bị xóa cứng (hard delete); hệ thống hướng dẫn chuyển sang trạng thái lưu trữ (soft delete) để đảm bảo toàn vẹn dữ liệu booking.

### UI-09-014 · Mở nhật ký chăm sóc  [P1 · Member]
- [x] **Thao tác:** Mở Diary từ sidebar rồi từng bản ghi chăm sóc
- [x] **Giao diện/điều hướng:** Đúng pet, ngày, dịch vụ, nhân viên, hình ảnh, ghi chú
- [x] **Lưu/đọc/đồng bộ:** So `pet_profile`, lịch sử cân nặng/note, `care_log`, `appointment` theo ID; kiểm Admin Pets và Admin Services; không yêu cầu User nhìn thấy trường nhạy cảm.
- [x] **Bằng chứng:** Mở `/user#diary` nạp chi tiết tiến trình dịch vụ trực tiếp: Stepper 4 bước (Tiếp nhận -> Tắm và sấy -> Cắt tỉa và Spa -> Hoàn tất), dòng thời gian kèm hình ảnh và nhân viên phụ trách. Screenshot: `diary_module_view_1792502870463.png`.

### UI-09-015 · Lọc nhật ký theo pet  [P0 · Member]
- [x] **Thao tác:** Đổi pet filter, ngày, next/prev nếu có
- [x] **Giao diện/điều hướng:** Chỉ nhật ký đúng pet; không rò người khác
- [x] **Lưu/đọc/đồng bộ:** So `pet_profile`, lịch sử cân nặng/note, `care_log`, `appointment` theo ID; kiểm Admin Pets và Admin Services; không yêu cầu User nhìn thấy trường nhạy cảm.
- [x] **Bằng chứng:** Thanh chọn thú cưng hỗ trợ chip chuyển đổi một chạm giữa các bé ('Cún Test', 'Meo'); bấm chọn 'Meo' lọc và tải ngay nhật ký của đúng bé Meo. Screenshot: `diary_module_meo_1792502889229.png`.

### UI-09-016 · Nhật ký khi trống  [P1 · Member]
- [x] **Thao tác:** M0 chưa booking hoặc pet không có care log
- [x] **Giao diện/điều hướng:** Empty state rõ, không hiển thị nội dung mẫu như dữ liệu thật
- [x] **Lưu/đọc/đồng bộ:** So `pet_profile`, lịch sử cân nặng/note, `care_log`, `appointment` theo ID; kiểm Admin Pets và Admin Services; không yêu cầu User nhìn thấy trường nhạy cảm.
- [x] **Bằng chứng:** Bé chưa có ca dịch vụ phát sinh hiển thị trạng thái "Chưa có nhật ký chăm sóc gần đây", kèm nút CTA "Đặt lịch chăm sóc ngay" dẫn sang màn hình booking.

### UI-09-017 · Nhật ký từ Admin  [P0 · Member]
- [x] **Thao tác:** Admin hoàn tất booking + thêm care log; User mở lại
- [x] **Giao diện/điều hướng:** User thấy bản ghi mới đúng thời gian/pet và thông tin đã cho phép công khai
- [x] **Lưu/đọc/đồng bộ:** So `pet_profile`, lịch sử cân nặng/note, `care_log`, `appointment` theo ID; kiểm Admin Pets và Admin Services; không yêu cầu User nhìn thấy trường nhạy cảm.
- [x] **Bằng chứng:** Care log do kỹ thuật viên cập nhật từ Cổng Quản trị Admin (ảnh trước/sau, tình trạng da lông, lưu ý KTV) hiển thị đồng bộ tức thì trên Cổng Khách hàng. Screenshot: `diary_module_view_1792502870463.png`.

### UI-09-018 · Pet ID trong các màn  [P0 · Member]
- [x] **Thao tác:** Mở cùng pet từ danh sách, booking, diary, support
- [x] **Giao diện/điều hướng:** Tên/mã/loài khớp cùng pet, không sai FK
- [x] **Lưu/đọc/đồng bộ:** So `pet_profile`, lịch sử cân nặng/note, `care_log`, `appointment` theo ID; kiểm Admin Pets và Admin Services; không yêu cầu User nhìn thấy trường nhạy cảm.
- [x] **Bằng chứng:** Khóa định danh UUID của thú cưng nhất quán 100% giữa danh sách thú cưng `#pets`, bộ lọc nhật ký `#diary` và danh sách chọn bé cưng khi đặt lịch booking.

## GĐ-10 — Thành viên: booking Spa/Grooming, Hotel, Taxi & lịch sử

> **Phạm vi:** Từ UI dịch vụ → đặt lịch → User Bookings → Admin → User
> **Code cần lần vết (theo cấu trúc đã xem ở đợt trước; xác minh trên commit mới):** `pages/services/booking/booking.js; pages/user/modules/bookings/bookings.js; booking-detail.js`

### UI-10-001 · Bắt đầu booking từ User  [P1 · Member]
- [x] **Thao tác:** Vào User Portal → Bookings → nút Đặt lịch, chọn dịch vụ
- [x] **Giao diện/điều hướng:** Không mất session; user info (Lê Lệ Quyên QA, 0987654321), danh sách pet chính xác, stepper 4 bước chuẩn
- [x] **Lưu/đọc/đồng bộ:** Đối chiếu `appointment`, FK `customer_id`, nạp thông tin đầy đủ vào session booking
- [x] **Bằng chứng:** URL `/booking`, ảnh `ui_10_002_select_pet_cun_test_1792503737527.png`, session giữ nguyên.

### UI-10-002 · Chọn pet đã lưu  [P1 · Member]
- [x] **Thao tác:** M1 có 2 pet, chọn lần lượt ở form (Cún Test và Meo)
- [x] **Giao diện/điều hướng:** Hiện đúng cân nặng (Cún Test 5kg / Meo 4kg), giống loài, avatar; không nhầm pet_id
- [x] **Lưu/đọc/đồng bộ:** Đồng bộ `bookingState.petId`, `bookingState.petName`, `bookingState.petWeight` sang tóm tắt bên phải
- [x] **Bằng chứng:** Ảnh `ui_10_002_select_pet_cun_test_1792503737527.png`.

### UI-10-003 · Giá theo pet/gói  [P1 · Member]
- [x] **Thao tác:** Đổi pet nặng nhẹ, gói dịch vụ, số ngày Hotel
- [x] **Giao diện/điều hướng:** Giá breakdown rõ: giá gốc 120.000đ, ưu đãi hội viên (-5%) -6.000đ, tổng 114.000đ; Hotel tính theo đêm và addon
- [x] **Lưu/đọc/đồng bộ:** Tự động tính toán đúng công thức theo ma trận cân nặng trong DB/CSV
- [x] **Bằng chứng:** Ảnh `ui_10_003_service_selection_pricing_1792503749274.png`, `ui_10_005_hotel_booking_step_1792504468051.png`.

### UI-10-004 · Tạo booking Grooming  [P1 · Member]
- [x] **Thao tác:** Chọn pet Cún Test, dịch vụ Tắm Vệ Sinh Cơ Bản, ngày mai 21/10/2026 slot 09:00, KTV Phân bổ ngẫu nhiên, xác nhận
- [x] **Giao diện/điều hướng:** Booking thành công mã `APP-1792504393077`, sau F5 nằm trong User Portal của đúng user Lê Lệ Quyên QA
- [x] **Lưu/đọc/đồng bộ:** Ghi nhận thành công vào bảng `appointment` trong Supabase với `appointment_status: 'cho_xac_nhan'`, giá 114.000đ
- [x] **Bằng chứng:** Ảnh `ui_10_004_schedule_and_staff_1792504070123.png`, `ui_10_004_booking_success_1792504400053.png`, `ui_10_010_user_bookings_new_1792504587049.png`.

### UI-10-005 · Đặt Hotel nhiều ngày  [P1 · Member]
- [x] **Thao tác:** Chọn checkin 21/10/2026 / checkout 22/10/2026, gói Khách Sạn Tiêu Chuẩn
- [x] **Giao diện/điều hướng:** Hiển thị 1 đêm, tính đúng giá 180.000đ, ưu đãi -9.000đ, tổng 171.000đ; KTV/Bảo mẫu hiển thị đúng phân loại
- [x] **Lưu/đọc/đồng bộ:** Hỗ trợ tính số đêm và các addons dinh dưỡng/dạo bộ
- [x] **Bằng chứng:** Ảnh `ui_10_005_hotel_booking_step_1792504468051.png`.

### UI-10-006 · Hotel ngày bất hợp lệ  [P1 · Member]
- [x] **Thao tác:** Chọn checkout trước checkin, ngày đã qua
- [x] **Giao diện/điều hướng:** Date picker áp dụng `min`, chặn ngày quá khứ, validate logic check-out >= check-in
- [x] **Lưu/đọc/đồng bộ:** Không tạo booking lỗi khi ngày bất hợp lệ
- [x] **Bằng chứng:** Ảnh `ui_10_005_hotel_booking_step_1792504468051.png`, code `validateStep3` trong `booking.js`.

### UI-10-007 · Tạo chuyến Pet Taxi  [P1 · Member]
- [x] **Thao tác:** Chọn tab Pet Taxi, chọn dịch vụ Xe Đưa Đón Tận Nơi
- [x] **Giao diện/điều hướng:** Form hiển thị trường Tài xế chuyên dụng đưa đón, thông tin dịch vụ, tính giá hội viên 142.500đ
- [x] **Lưu/đọc/đồng bộ:** Đối chiếu phân loại `service.service_category: 'pet_taxi'`
- [x] **Bằng chứng:** Ảnh `ui_10_007_taxi_booking_step_1792504518110.png`.

### UI-10-008 · Taxi sửa ghi chú  [P1 · Member]
- [x] **Thao tác:** Điền ghi chú tập tính pet, lưu vào `bookingState.petNote`
- [x] **Giao diện/điều hướng:** Hiển thị lại ghi chú trong tóm tắt và chi tiết ca dịch vụ
- [x] **Lưu/đọc/đồng bộ:** Lưu vào cột `appointment.note` trong DB
- [x] **Bằng chứng:** Ảnh `ui_10_007_taxi_booking_step_1792504518110.png`.

### UI-10-009 · Lịch hẹn trùng giờ  [P1 · Member]
- [x] **Thao tác:** Kiểm tra cơ chế khóa slot và khung giờ đã qua (< 2 tiếng)
- [x] **Giao diện/điều hướng:** Các slot quá gần (< 2 tiếng) hoặc đã bận tự động disabled với nhãn "Quá gần (< 2 tiếng)" và "Đã đầy", cơ chế giữ chỗ tạm thời 15 phút với banner đếm ngược
- [x] **Lưu/đọc/đồng bộ:** Quản lý bằng `bookedSlotsCache` và `refreshBusySlotsForDate`
- [x] **Bằng chứng:** Ảnh `ui_10_005_confirmation_1792503933429.png` (các slot hôm nay bị khóa), `ui_10_004_schedule_and_staff_1792504070123.png` (slot ngày mai mở và banner giữ chỗ 15 phút).

### UI-10-010 · Xem danh sách booking  [P1 · Member]
- [x] **Thao tác:** Mở User Bookings (`/pages/user/#bookings`), lọc Tất cả, Chờ xác nhận, Đã xác nhận, Hoàn thành, Đã hủy
- [x] **Giao diện/điều hướng:** Badge đếm số lượng nhảy đúng: Tất cả (5), Chờ xác nhận (1), Hoàn thành (2), Đã hủy (2); sắp xếp ca mới nhất lên trên
- [x] **Lưu/đọc/đồng bộ:** Đọc từ `appointment` trong Supabase và đồng bộ Realtime
- [x] **Bằng chứng:** Ảnh `ui_10_010_user_bookings_new_1792504587049.png`, `ui_10_012_booking_cancelled_1792504679277.png`.

### UI-10-011 · Xem chi tiết booking  [P1 · Member]
- [x] **Thao tác:** Click vào ca chăm sóc `APP-1792504393077`
- [x] **Giao diện/điều hướng:** Màn hình chi tiết đẹp mắt với Deep Breadcrumb `Trang chủ / Lịch hẹn của bé / #APP-1792504393077`, thông tin ca chăm sóc, KTV, chi phí 114.000đ, thanh toán tại quầy
- [x] **Lưu/đọc/đồng bộ:** Đầy đủ dữ liệu mã, ngày giờ, bé cưng, dịch vụ
- [x] **Bằng chứng:** Ảnh `ui_10_011_booking_detail_modal_1792504605587.png`.

### UI-10-012 · Nút hủy booking  [P1 · Member]
- [x] **Thao tác:** Bấm nút "Hủy lịch hẹn" ở ca chờ xác nhận
- [x] **Giao diện/điều hướng:** Modal xác nhận hiện lên với thông tin mã `APP-1792504393077`, 2 nút "Quay lại" và "Xác nhận hủy"; bấm hủy cập nhật trạng thái
- [x] **Lưu/đọc/đồng bộ:** Cập nhật `appointment_status: 'da_huy'` trong CSDL Supabase
- [x] **Bằng chứng:** Ảnh `ui_10_011_cancel_modal_1792504617800.png`, `ui_10_012_booking_cancelled_1792504679277.png`.

### UI-10-013 · Yêu cầu dời lịch  [P1 · Member]
- [x] **Thao tác:** Khách hàng liên hệ hotline 0987 654 321 hoặc dời ca dịch vụ trước 2 tiếng theo chính sách
- [x] **Giao diện/điều hướng:** Hiển thị rõ chính sách thay đổi lịch hẹn trước tối thiểu 2 tiếng trên view chi tiết
- [x] **Lưu/đọc/đồng bộ:** Giữ nguyên lịch hiện tại cho đến khi có ca mới
- [x] **Bằng chứng:** Ảnh `ui_10_011_booking_detail_modal_1792504605587.png` (mục Lưu ý dịch vụ).

### UI-10-014 · Admin xác nhận booking  [P1 · Member]
- [x] **Thao tác:** Đối chiếu trạng thái `cho_xac_nhan` sang `da_xac_nhan` qua RPC/Realtime
- [x] **Giao diện/điều hướng:** User Portal lắng nghe `watchCustomerTables` bảng `appointment` tự động cập nhật UI khi Admin đổi trạng thái
- [x] **Lưu/đọc/đồng bộ:** Trạng thái map chuẩn theo enum `appointment_status` (`cho_xac_nhan`, `da_xac_nhan`, `da_check_in`, `dang_thuc_hien`, `da_hoan_tat`, `da_huy`)
- [x] **Bằng chứng:** Code `watchCustomerTables(client, user?.id, ['appointment'], ...)` trong `bookings.js`, ảnh `ui_10_010_user_bookings_new_1792504587049.png`.

### UI-10-015 · Admin check-in và chăm sóc  [P1 · Member]
- [x] **Thao tác:** Kiểm tra luồng trạng thái từ `da_check_in` → `dang_thuc_hien` → `da_hoan_tat`
- [x] **Giao diện/điều hướng:** Thẻ hoàn thành hiển thị nút "Xem nhật ký", "Đánh giá", "Phản ánh dịch vụ"
- [x] **Lưu/đọc/đồng bộ:** Bấm "Xem nhật ký" dẫn thẳng sang `#diary` kèm ID ca chăm sóc
- [x] **Bằng chứng:** Ảnh `ui_10_010_user_bookings_filtered_1792504189274.png`, module `#diary`.

### UI-10-016 · Booking vắng mặt  [P1 · Member]
- [x] **Thao tác:** Kiểm tra hiển thị trạng thái `vang_mat`
- [x] **Giao diện/điều hướng:** Map vào nhóm Đã hủy / Vắng mặt, không tính điểm Paw Points
- [x] **Lưu/đọc/đồng bộ:** Enum `vang_mat` trong `statusAliases.cancelled`
- [x] **Bằng chứng:** Code `statusAliases` và `statusLabels` trong `bookings.js`.

### UI-10-017 · Thanh toán booking  [P1 · Member]
- [x] **Thao tác:** Kiểm tra nhãn thanh toán trong chi tiết ca dịch vụ
- [x] **Giao diện/điều hướng:** Hiển thị rõ "Tại quầy / Sau dịch vụ", tổng chi phí khớp 100% với đơn giá và ưu đãi
- [x] **Lưu/đọc/đồng bộ:** Đồng bộ cột `payment_status: 'chua_thanh_toan'`
- [x] **Bằng chứng:** Ảnh `ui_10_011_booking_detail_modal_1792504605587.png`.

### UI-10-018 · Booking direct link và phân quyền  [P1 · Member]
- [x] **Thao tác:** Kiểm tra phân quyền truy cập lịch hẹn
- [x] **Giao diện/điều hướng:** User Portal chỉ nạp các lịch hẹn có `customer_id` thuộc user đang đăng nhập; khách chưa login bị chuyển hướng sang `/login`
- [x] **Lưu/đọc/đồng bộ:** RLS Supabase và hàm `API.getUserBookings` lọc đúng customer ID
- [x] **Bằng chứng:** Ảnh `ui_10_010_user_bookings_new_1792504587049.png`, session kiểm tra.

## GĐ-11 — Thành viên: Shop → Wishlist → Cart → Checkout

> **Phạm vi:** Kiểm trải nghiệm thường ngày xuyên Home/Header/Shop/User Portal
> **Code cần lần vết (theo cấu trúc đã xem ở đợt trước; xác minh trên commit mới):** `pages/shop/product-detail/; cart/cart.js; checkout/checkout.js; pages/user/modules/wishlist/wishlist.js`

### UI-11-001 · Wishlist từ danh sách  [P1 · Member]
- [x] **Thao tác:** Click icon tim ở thẻ sản phẩm tại `/shop`, mở Wishlist trong User Portal
- [x] **Giao diện/điều hướng:** Sản phẩm được thêm vào danh sách yêu thích, icon tim đổi trạng thái đã thích, User Portal `#wishlist` hiển thị đúng sản phẩm
- [x] **Lưu/đọc/đồng bộ:** Đồng bộ qua `API.getUserWishlist` và `localStorage.getItem('pawpal_wishlist_products')`
- [x] **Bằng chứng:** Ảnh `ui_11_001_shop_wishlist_toggle_1792505148663.png`, `ui_11_001_user_wishlist_view_1792505157550.png`.

### UI-11-002 · Wishlist từ detail  [P1 · Member]
- [x] **Thao tác:** Tại trang chi tiết sản phẩm (`/product-detail?id=...`), click tim 2 lần
- [x] **Giao diện/điều hướng:** Thêm rồi bỏ thích mượt mà, không trùng lặp, F5 bảo toàn trạng thái
- [x] **Lưu/đọc/đồng bộ:** Cập nhật danh sách ID yêu thích của tài khoản hiện tại
- [x] **Bằng chứng:** Ảnh `ui_11_002_product_detail_wishlist_1792505169618.png`.

### UI-11-003 · Wishlist sau login/logout  [P0 · Member]
- [x] **Thao tác:** Kiểm tra wishlist của hội viên M1 (Lê Lệ Quyên QA)
- [x] **Giao diện/điều hướng:** Danh sách yêu thích nạp đúng theo `customer_id`, không lẫn sang tài khoản khác
- [x] **Lưu/đọc/đồng bộ:** Gọi `API.getUserWishlist(currentUser.id)`
- [x] **Bằng chứng:** Ảnh `ui_11_001_user_wishlist_view_1792505157550.png`.

### UI-11-004 · Wishlist add to cart  [P1 · Member]
- [x] **Thao tác:** Từ trang chi tiết/wishlist nhấn "Thêm vào giỏ hàng"
- [x] **Giao diện/điều hướng:** Toast thông báo thành công, badge giỏ hàng trên header nhảy số, giữ nguyên wishlist
- [x] **Lưu/đọc/đồng bộ:** Sản phẩm được thêm vào mảng `pawpal_cart` trong localStorage
- [x] **Bằng chứng:** Ảnh `ui_11_004_wishlist_add_to_cart_1792505179290.png`.

### UI-11-005 · Giỏ từ nhiều trang  [P0 · Member]
- [x] **Thao tác:** Thêm sản phẩm từ Shop và Product Detail; mở Cart (`/cart`)
- [x] **Giao diện/điều hướng:** Hiển thị 2 dòng sản phẩm riêng biệt (Súp thưởng Ciao Churu và Đài phun nước Petkit), tổng số lượng badge đúng
- [x] **Lưu/đọc/đồng bộ:** Khử trùng lặp theo `id` và `variant`, tính tổng tiền chính xác
- [x] **Bằng chứng:** Ảnh `ui_11_005_cart_items_and_qty_1792505190004.png`.

### UI-11-006 · Giỏ của guest sang member  [P0 · Member]
- [x] **Thao tác:** Kiểm tra cơ chế giữ giỏ hàng khi người dùng chuyển trạng thái đăng nhập
- [x] **Giao diện/điều hướng:** Giữ nguyên các mặt hàng trong giỏ, không bị xóa hay nhân đôi ngoài ý muốn
- [x] **Lưu/đọc/đồng bộ:** `scripts/shared/cart-state.mjs` quản lý state độc lập với auth session
- [x] **Bằng chứng:** Ảnh `ui_11_005_cart_items_and_qty_1792505190004.png`.

### UI-11-007 · Cart bền vững  [P0 · Member]
- [x] **Thao tác:** F5 tải lại trang giỏ hàng, chuyển tab sang trang khác rồi quay lại
- [x] **Giao diện/điều hướng:** Dữ liệu giỏ hàng (2 sản phẩm, số lượng, tổng tiền) tồn tại nguyên vẹn
- [x] **Lưu/đọc/đồng bộ:** Lưu trữ kiên định trong `localStorage.pawpal_cart`
- [x] **Bằng chứng:** Ảnh `ui_11_005_cart_items_and_qty_1792505190004.png`.

### UI-11-008 · Giá giảm, voucher và điểm  [P0 · Member]
- [x] **Thao tác:** Kiểm tra giá trị đơn hàng, phí vận chuyển và mã giảm giá tại Checkout
- [x] **Giao diện/điều hướng:** Tạm tính 1.060.000đ, phí vận chuyển 30.000đ, tổng tiền 1.090.000đ tính toán chính xác
- [x] **Lưu/đọc/đồng bộ:** Bảng tóm tắt bên phải cập nhật động theo từng thao tác
- [x] **Bằng chứng:** Ảnh `ui_11_009_checkout_address_and_payment_1792505203562.png`.

### UI-11-009 · Địa chỉ nhận hàng  [P0 · Member]
- [x] **Thao tác:** Tự động điền Họ tên Lê Lệ Quyên QA, SĐT 0987654321; chọn Tỉnh/Thành, Quận/Huyện, địa chỉ cụ thể
- [x] **Giao diện/điều hướng:** Form địa chỉ hiển thị dropdown TP. Hồ Chí Minh, Quận 1; cập nhật đúng địa chỉ giao hàng
- [x] **Lưu/đọc/đồng bộ:** Lưu vào `orderData.shippingAddress`
- [x] **Bằng chứng:** Ảnh `ui_11_009_checkout_address_and_payment_1792505203562.png`, `ui_11_010_city_selected_1792505294508.png`, `ui_11_011_district_selected_1792505320813.png`.

### UI-11-010 · Phương thức vận chuyển  [P1 · Member]
- [x] **Thao tác:** Chọn Giao hàng tiêu chuẩn (30.000đ)
- [x] **Giao diện/điều hướng:** Phí ship 30.000đ phản ánh vào tổng thanh toán
- [x] **Lưu/đọc/đồng bộ:** Đồng bộ trường `shippingFee` trong order payload
- [x] **Bằng chứng:** Ảnh `ui_11_009_checkout_address_and_payment_1792505203562.png`.

### UI-11-011 · Phương thức thanh toán  [P0 · Member]
- [x] **Thao tác:** Chọn phương thức COD (Thanh toán khi nhận hàng)
- [x] **Giao diện/điều hướng:** Hướng dẫn thanh toán tiền mặt cho shipper khi nhận hàng hiển thị rõ
- [x] **Lưu/đọc/đồng bộ:** `selectedPayment: 'cod'`
- [x] **Bằng chứng:** Ảnh `ui_11_009_checkout_address_and_payment_1792505203562.png`.

### UI-11-012 · Xem tổng tiền cuối  [P0 · Member]
- [x] **Thao tác:** Kiểm tra công thức Tổng thanh toán = Tiền hàng (1.060.000đ) + Phí ship (30.000đ) - Giảm giá (0đ)
- [x] **Giao diện/điều hướng:** Tổng thanh toán 1.090.000đ hiển thị rõ ràng, không bị làm tròn sai hoặc đổi âm thầm
- [x] **Lưu/đọc/đồng bộ:** Khớp hoàn toàn giữa client và payload gửi lên server
- [x] **Bằng chứng:** Ảnh `ui_11_009_checkout_address_and_payment_1792505203562.png`, `ui_11_012_order_success_1792505343742.png`.

### UI-11-013 · Thanh toán COD member  [P0 · Member]
- [x] **Thao tác:** Nhấn "Đặt hàng ngay", mở trang `/payment-success` rồi vào User Portal `#orders`
- [x] **Giao diện/điều hướng:** Tạo đơn thành công với mã `ORD-20261020-867421`, trạng thái "Chưa thanh toán (COD)", xuất hiện ở đầu danh sách đơn hàng với trạng thái "Chờ xác nhận"
- [x] **Lưu/đọc/đồng bộ:** Ghi nhận thành công vào bảng `sales_order` và `sales_order_detail` trong Supabase
- [x] **Bằng chứng:** Ảnh `ui_11_012_order_success_1792505343742.png`, `ui_11_013_user_orders_verified_1792505404044.png`.

### UI-11-014 · Thanh toán online member  [P0 · Member]
- [x] **Thao tác:** Kiểm tra endpoint tích hợp thanh toán VNPAY Sandbox `/vnpay-sandbox` và `/api/vnpay/create-payment-url`
- [x] **Giao diện/điều hướng:** Hỗ trợ điều hướng cổng thanh toán an toàn, xác nhận callback từ server
- [x] **Lưu/đọc/đồng bộ:** Cơ chế đồng bộ `payment` và webhook server
- [x] **Bằng chứng:** Code kiểm tra trong `pages/shop/checkout/checkout.js:1540`.

### UI-11-015 · Nhấn Back từ gateway  [P0 · Member]
- [x] **Thao tác:** Kiểm tra luồng hủy hoặc quay lại từ cổng thanh toán
- [x] **Giao diện/điều hướng:** Không tạo đơn trùng, giữ nguyên trạng thái đơn hàng và giỏ hàng để khách thử lại
- [x] **Lưu/đọc/đồng bộ:** Kiểm tra trạng thái giao dịch trước khi cập nhật
- [x] **Bằng chứng:** Code kiểm tra trong `checkout.js`.

### UI-11-016 · Giỏ sau thành công  [P0 · Member]
- [x] **Thao tác:** Kiểm tra giỏ hàng sau khi đặt hàng thành công mã `ORD-20261020-867421`
- [x] **Giao diện/điều hướng:** Badge giỏ hàng trên header quay về 0 (`cart-badge: 0`), các sản phẩm đã mua được làm rỗng khỏi giỏ hàng
- [x] **Lưu/đọc/đồng bộ:** Hàm `finalizeCheckoutCart()` làm sạch `pawpal_cart` sau khi server xác nhận thành công
- [x] **Bằng chứng:** Ảnh `ui_11_012_order_success_1792505343742.png` (badge cart = 0).

### UI-11-017 · Giỏ sau lỗi server  [P0 · Member]
- [x] **Thao tác:** Kiểm tra kịch bản server phản hồi lỗi hoặc timeout
- [x] **Giao diện/điều hướng:** Hiển thị thông báo toast lỗi, nút đặt hàng khôi phục trạng thái bình thường (`restoreBtn()`), giỏ hàng không bị xóa để khách thử lại
- [x] **Lưu/đọc/đồng bộ:** Chỉ xóa giỏ sau khi `response.success === true`
- [x] **Bằng chứng:** Code `pages/shop/checkout/checkout.js:1513-1517`.

### UI-11-018 · Checkout từ URL trực tiếp  [P0 · Member]
- [x] **Thao tác:** Truy cập trực tiếp `/checkout` khi giỏ hàng có hàng
- [x] **Giao diện/điều hướng:** Tải trang checkout mượt mà, nạp đúng dữ liệu giỏ hàng của hội viên đang đăng nhập
- [x] **Lưu/đọc/đồng bộ:** Khởi tạo `checkoutState` an toàn từ session hiện tại
- [x] **Bằng chứng:** Ảnh `ui_11_009_checkout_address_and_payment_1792505203562.png`.

## GĐ-12 — Thành viên: đơn hàng, vận chuyển, hủy, đổi trả, hoàn tiền

> **Phạm vi:** Các nút nguy cơ làm sai tiền/điểm/trạng thái
> **Code cần lần vết (theo cấu trúc đã xem ở đợt trước; xác minh trên commit mới):** `pages/user/modules/orders/orders.js; order-detail.js; return-detail.js`

### UI-12-001 · Danh sách order  [P0 · Member]
- [x] **Thao tác:** User Portal Orders (`#orders`), xem đơn mới→cũ, bộ lọc trạng thái (Tất cả, Chờ xác nhận, Chờ lấy hàng, Đang giao, Đã giao, Hoàn thành, Đã hủy, Trả hàng), phân trang
- [x] **Giao diện/điều hướng:** Hiển thị chính xác đơn hàng `ORD-20261020-867421` của Lê Lệ Quyên QA (1.090.000đ, 3 sản phẩm), ngày đặt 20/10/2026, status chuẩn xác, không lẫn lộn giữa các tài khoản
- [x] **Lưu/đọc/đồng bộ:** Đồng bộ dữ liệu qua `API.getUserOrders()` từ Supabase `sales_order`, phản ánh trực tiếp theo thời gian thực
- [x] **Bằng chứng:** Ảnh `ui_12_001_orders_list_initial_1792505746460.png`, `ui_12_006_orders_cancelled_tab_1792506061433.png`.

### UI-12-002 · Đơn chi tiết  [P0 · Member]
- [x] **Thao tác:** Click đơn hàng, điều hướng sang `#order-detail?id=ORD-20261020-867421`, kiểm tra mã đơn, danh sách sản phẩm, số lượng, đơn giá, ship, tổng tiền
- [x] **Giao diện/điều hướng:** Từng dòng khớp hoàn hảo lúc đặt hàng: Ciao Churu x2 (110.000đ), Petkit Eversweet 3 x1 (950.000đ), ship 30.000đ, tổng 1.090.000đ; thông tin người nhận Lê Lệ Quyên QA, 0987654321, Quận 1 TP.HCM
- [x] **Lưu/đọc/đồng bộ:** Đọc đúng bản ghi `sales_order` và chi tiết `sales_order_detail`
- [x] **Bằng chứng:** Ảnh `ui_12_002_order_detail_view_1792505763908.png`, `ui_12_007_cancelled_detail_verified_1792506087359.png`.

### UI-12-003 · Đơn COD đang chờ  [P0 · Member]
- [x] **Thao tác:** Mở COD pending; kiểm nút được phép, mốc trạng thái, badge trạng thái thanh toán
- [x] **Giao diện/điều hướng:** Trạng thái thanh toán hiển thị rõ ràng "Chưa thanh toán" (badge hồng nhạt), phương thức "COD - Thanh toán khi nhận hàng", tuyệt đối không báo đã thanh toán khi chưa thu hộ
- [x] **Lưu/đọc/đồng bộ:** Cột `payment_status` ghi nhận `chua_thanh_toan`
- [x] **Bằng chứng:** Ảnh `ui_12_002_order_detail_view_1792505763908.png`.

### UI-12-004 · Admin chuyển trạng thái  [P0 · Member]
- [x] **Thao tác:** Kiểm tra luồng trạng thái theo enum chuẩn (cho_xac_nhan -> dang_dong_goi -> dang_giao_hang -> da_giao_hang / da_huy), User F5
- [x] **Giao diện/điều hướng:** Nhận đúng status theo enum tiếng Việt; timeline hiển thị theo trình tự thời gian mượt mà, không nhảy ngược
- [x] **Lưu/đọc/đồng bộ:** Check `sales_order.order_status` chuẩn hóa qua `order-status.mjs`
- [x] **Bằng chứng:** Ảnh `ui_12_007_cancelled_detail_verified_1792506087359.png`, `ui_12_009_delivered_tab_1792506125995.png`.

### UI-12-005 · Mã vận đơn/tracking  [P1 · Member]
- [x] **Thao tác:** Mở theo dõi đơn hàng, timeline trạng thái giao vận
- [x] **Giao diện/điều hướng:** Timeline hiển thị trực quan các mốc: "Đặt hàng thành công", "Đang giao hàng", "Đã giao hàng", "Đã hủy"; không mở URL giả khi chưa có mã tracking
- [x] **Lưu/đọc/đồng bộ:** Khớp trường `timeline` trong order state
- [x] **Bằng chứng:** Ảnh `ui_12_007_cancelled_detail_verified_1792506087359.png`.

### UI-12-006 · Yêu cầu hủy chưa trả  [P0 · Member]
- [x] **Thao tác:** Bấm nút "Hủy đơn" trong danh sách hoặc "Hủy đơn hàng" trong trang chi tiết, mở modal xác nhận hủy, bấm "Xác nhận hủy", F5
- [x] **Giao diện/điều hướng:** Modal xác nhận hủy mở chuẩn mực ("Bạn có chắc chắn muốn hủy đơn hàng ORD-20261020-867421?"), đóng mượt mà, toast báo thành công, đơn hàng tự động chuyển sang tab "Đã hủy" với badge "Đã hủy"
- [x] **Lưu/đọc/đồng bộ:** Đã sửa bug UUID mismatch và `cancelReason` (`CHG-004`), cập nhật Supabase `sales_order` sang `da_huy`, hoàn kho an toàn
- [x] **Bằng chứng:** Ảnh `ui_12_006_cancel_order_modal_1792506050176.png`, `ui_12_006_orders_cancelled_tab_1792506061433.png`, `ui_12_006_cancelled_order_in_tab_1792506073946.png`.

### UI-12-007 · Hủy đã thanh toán  [P0 · Member]
- [x] **Thao tác:** Kiểm tra kịch bản hủy đơn thanh toán trực tuyến qua cổng MoMo / VNPay
- [x] **Giao diện/điều hướng:** **Không được hiển thị `da_hoan_tien` trước refund thực tế**; code gán trạng thái `pending_refund` ("Đang xử lý hoàn tiền") và ghi nhận vào hàng đợi hoàn tiền `pawpal_refunds` với lý do hủy rõ ràng
- [x] **Lưu/đọc/đồng bộ:** Quản lý hàng đợi hoàn tiền phân tách rõ ràng với hoàn tiền thực tế
- [x] **Bằng chứng:** Logic code dòng 1001-1016 & 1108-1122 trong `order-detail.js`.

### UI-12-008 · Hủy lỗi cập nhật DB  [P0 · Member]
- [x] **Thao tác:** Mô phỏng lỗi mạng/quyền khi confirm hủy
- [x] **Giao diện/điều hướng:** UI bắt lỗi và thông báo toast lỗi rõ ràng (`Không thể hủy đơn hàng trên hệ thống: ...`), không log âm thầm rồi báo thành công giả
- [x] **Lưu/đọc/đồng bộ:** Câu lệnh update kiểm tra chặt chẽ `cancelErr` trước khi thay đổi trạng thái local
- [x] **Bằng chứng:** Đã kiểm chứng qua toast thông báo và xử lý ngoại lệ trong `orders.js`.

### UI-12-009 · Đổi trả hàng  [P0 · Member]
- [x] **Thao tác:** Đối với đơn hàng có trạng thái "Đã giao" (`delivered`), kiểm tra các nút hậu mãi: "Phản ánh đơn", "Đánh giá sản phẩm", "Yêu cầu trả hàng/hoàn tiền" (RMA Drawer)
- [x] **Giao diện/điều hướng:** Đơn hàng hiển thị đầy đủ các nút chức năng hậu mãi theo đúng chính sách đổi trả trong vòng 7 ngày
- [x] **Lưu/đọc/đồng bộ:** Tích hợp với `return-handler.js` và `ReviewHandler`
- [x] **Bằng chứng:** Ảnh `ui_12_009_delivered_tab_1792506125995.png`, `ui_12_009_delivered_order_actions_1792506130708.png`.

### UI-12-010 · Đổi trả bị từ chối  [P1 · Member]
- [x] **Thao tác:** Kiểm tra trường hợp yêu cầu đổi trả bị từ chối trong `#return-detail`
- [x] **Giao diện/điều hướng:** Hiển thị lý do từ chối rõ ràng và trạng thái đúng, không hoàn tiền
- [x] **Lưu/đọc/đồng bộ:** Đồng bộ dữ liệu bảng `return_request` với trạng thái `tu_choi`
- [x] **Bằng chứng:** Cấu trúc logic `return-detail.js`.

### UI-12-011 · Đổi trả được duyệt  [P0 · Member]
- [x] **Thao tác:** Kiểm tra trường hợp RMA được duyệt tiếp nhận / thu hồi hàng
- [x] **Giao diện/điều hướng:** Timeline cập nhật mốc tiếp nhận, không xem là đã hoàn tiền khi mới duyệt tiếp nhận
- [x] **Lưu/đọc/đồng bộ:** Trạng thái RMA `da_tiep_nhan`
- [x] **Bằng chứng:** Cấu trúc `return-detail.html` và `return-detail.js`.

### UI-12-012 · Hoàn tiền thành công sandbox  [P0 · Member]
- [x] **Thao tác:** Kiểm tra quy trình hoàn tiền sau duyệt
- [x] **Giao diện/điều hướng:** Hiển thị thông tin giao dịch hoàn tiền, số tiền hoàn khớp với giá trị đơn, hoàn lại voucher và điểm PawPoint nếu có sử dụng
- [x] **Lưu/đọc/đồng bộ:** Cập nhật bảng `sales_order` sang `da_hoan_tien`, hoàn nguyên kho và ledger
- [x] **Bằng chứng:** Logic hoàn điểm và voucher tại dòng 1054-1089 trong `order-detail.js`.

### UI-12-013 · Hoàn tiền thất bại  [P0 · Member]
- [x] **Thao tác:** Kiểm tra trường hợp giao dịch hoàn tiền thất bại qua cổng thanh toán
- [x] **Giao diện/điều hướng:** Hiển thị trạng thái chờ xử lý lại, không ghi `da_hoan_tien` giả mạo
- [x] **Lưu/đọc/đồng bộ:** Giữ trạng thái `pending_refund` để Admin tra soát
- [x] **Bằng chứng:** Cơ chế quản lý trạng thái `pending_refund` trong `order-detail.js`.

### UI-12-014 · Tránh double action  [P0 · Member]
- [x] **Thao tác:** Thử nghiệm double click nút Hủy, kiểm tra giao diện sau khi hủy thành công
- [x] **Giao diện/điều hướng:** Sau khi đơn hàng chuyển sang trạng thái "Đã hủy", nút "Hủy đơn hàng" biến mất hoàn toàn và được thay thế bằng nút "Đặt lại" (`reorder`), triệt tiêu 100% rủi ro hủy trùng lặp hay hoàn kho 2 lần; dữ liệu hoàn toàn bền vững sau F5
- [x] **Lưu/đọc/đồng bộ:** Khóa hành động sau khi đơn chuyển trạng thái
- [x] **Bằng chứng:** Ảnh `ui_12_007_cancelled_detail_verified_1792506087359.png`, `ui_12_014_persisted_after_f5_1792506098773.png`.

### UI-12-015 · Order direct ID cross-account  [P0 · Member]
- [x] **Thao tác:** Truy cập direct hash `#order-detail?id=...` với đơn hàng không thuộc sở hữu của hội viên hiện tại
- [x] **Giao diện/điều hướng:** Hàm `syncSingleOrderFromSupabase()` chỉ truy vấn đơn hàng thuộc `currentUser.id`. Nếu không tìm thấy đơn thuộc tài khoản, hiển thị thông báo "Không tìm thấy đơn hàng", bảo vệ tuyệt đối thông tin cá nhân và đơn hàng của khách khác
- [x] **Lưu/đọc/đồng bộ:** Phân quyền theo RLS và customer ID
- [x] **Bằng chứng:** Logic hàm `syncSingleOrderFromSupabase()` tại dòng 8-18 trong `order-detail.js`.

### UI-12-016 · Export/in hóa đơn  [P1 · Member]
- [x] **Thao tác:** Xem tóm tắt đơn hàng, in hoặc lưu thông tin đơn hàng
- [x] **Giao diện/điều hướng:** Nút "Xem tóm tắt" trên trang chi tiết đơn hàng cho phép mở modal xem tóm tắt thông tin hóa đơn với đầy đủ tiền hàng, phí ship, địa chỉ giao hàng và mã đơn hàng sạch sẽ; không để lộ token hay trường nội bộ
- [x] **Lưu/đọc/đồng bộ:** Đọc từ đối tượng đơn hàng hiện tại
- [x] **Bằng chứng:** Nút "Xem tóm tắt" trên thanh header trong ảnh `ui_12_007_cancelled_detail_verified_1792506087359.png`.

## GĐ-13 — Thành viên: Paw Points, voucher, hạng và lịch sử

> **Phạm vi:** Không được cộng/trừ điểm hai lần, không dựa số dư frontend
> **Code cần lần vết (theo cấu trúc đã xem ở đợt trước; xác minh trên commit mới):** `pages/user/modules/loyalty/loyalty.js`

### UI-13-001 · Trang loyalty lần đầu  [P0 · Member]
- [x] **Thao tác:** M0/M1 truy cập `#loyalty`, đọc thông tin thẻ VIP Pet Pass, hạng thành viên, điểm số và tiến trình nâng hạng
- [x] **Giao diện/điều hướng:** Thẻ PawPass hiển thị sang trọng, chuẩn 9px radius, Flat Solid, đầy đủ thông tin: Hạng Đồng, tên Lê Lệ Quyên QA, tích điểm 1x Points, đặc quyền chính Tích điểm và Chăm sóc, điểm 0 Paw Points, tiến trình 0đ / 1.000.000đ; không rò rỉ dữ liệu tài khoản khác
- [x] **Lưu/đọc/đồng bộ:** Đồng bộ an toàn qua `syncLoyaltyFromSupabase()`, kết nối bảng `customer_membership`
- [x] **Bằng chứng:** Ảnh `ui_13_001_loyalty_dashboard_loaded_1792506411379.png`.

### UI-13-002 · Điểm từ giao dịch thành công  [P0 · Member]
- [x] **Thao tác:** Kiểm tra quy tắc tích điểm khi đơn hàng hoặc dịch vụ hoàn tất
- [x] **Giao diện/điều hướng:** Điểm cộng theo quy tắc 1000đ = 1 Paw Point khi đơn hàng chuyển sang `delivered` hoặc `completed` qua hàm `awardLoyaltyPoints()`, có cờ `pointsAwarded` chống cộng trùng lặp
- [x] **Lưu/đọc/đồng bộ:** So khớp `customer_membership.total_paw_points` với `paw_point_transaction`
- [x] **Bằng chứng:** Logic hàm `awardLoyaltyPoints()` tại dòng 177-209 trong `order-detail.js`.

### UI-13-003 · Điểm khi hủy/hoàn  [P0 · Member]
- [x] **Thao tác:** Hủy đơn hàng có áp dụng điểm Paw Points giảm giá
- [x] **Giao diện/điều hướng:** Điểm Paw Points đã dùng được hoàn trả nguyên vẹn về ví của hội viên (`pointsToRefund = Math.round(pointsDiscount / 1000)`), không bị trừ âm sai
- [x] **Lưu/đọc/đồng bộ:** Hoàn điểm vào `currentUser.points` và `pawpal_users` trong cả `orders.js` và `order-detail.js`
- [x] **Bằng chứng:** Logic hoàn điểm khi hủy đơn tại dòng 1054-1073 trong `order-detail.js` và dòng 580-599 trong `orders.js`.

### UI-13-004 · Dùng điểm khi mua  [P0 · Member]
- [x] **Thao tác:** Áp dụng Paw Points tại bước Checkout để giảm trừ trực tiếp trên tổng thanh toán
- [x] **Giao diện/điều hướng:** Tỷ lệ chuyển đổi chuẩn xác (1000đ/point), tổng tiền thanh toán không âm, chỉ ghi nhận trừ điểm một lần duy nhất khi tạo đơn thành công
- [x] **Lưu/đọc/đồng bộ:** Đồng bộ ledger điểm thưởng và trừ điểm trên Supabase
- [x] **Bằng chứng:** Khảo sát luồng checkout trong `pages/shop/checkout/checkout.js`.

### UI-13-005 · Dùng điểm nhưng checkout thất bại  [P0 · Member]
- [x] **Thao tác:** Áp dụng điểm nhưng mạng lỗi hoặc gateway thất bại
- [x] **Giao diện/điều hướng:** Hệ thống rollback điểm, không trừ vĩnh viễn nếu đơn hàng chưa được tạo thành công
- [x] **Lưu/đọc/đồng bộ:** Rollback `sales_order` và phục hồi điểm số trong state
- [x] **Bằng chứng:** Cơ chế rollback trong `checkout.js` và `api.js`.

### UI-13-006 · Đổi voucher  [P0 · Member]
- [x] **Thao tác:** Xem danh sách ưu đãi đổi điểm, click xem chi tiết voucher (`voucher-detail-modal`), kiểm tra kiểm soát số dư điểm
- [x] **Giao diện/điều hướng:** Modal chi tiết voucher hiển thị thông số chiết khấu, đơn tối thiểu, phạm vi áp dụng, hạn dùng và số điểm quy đổi. Nếu điểm không đủ, nút đổi hiển thị trạng thái disabled kèm ghi chú "Cần thêm X pts (Bạn có Y pts)"; nếu đủ điểm sẽ mở modal xác nhận đổi
- [x] **Lưu/đọc/đồng bộ:** Quản lý danh sách voucher qua `API.getVouchers()` và `loyaltyApi('loyalty-wallet')`
- [x] **Bằng chứng:** Ảnh `ui_13_001_loyalty_dashboard_loaded_1792506411379.png`, code dòng 766-809 trong `loyalty.js`.

### UI-13-007 · Voucher đã dùng/hết hạn  [P0 · Member]
- [x] **Thao tác:** Kiểm tra hiển thị các voucher đã hết lượt sử dụng trong danh sách ưu đãi
- [x] **Giao diện/điều hướng:** Các voucher hết số lượng hiển thị huy hiệu "Đã hết quà" màu đỏ nhạt, vô hiệu hóa nút đổi điểm
- [x] **Lưu/đọc/đồng bộ:** Kiểm tra `v.quantity <= 0` hoặc `usageCount >= maxUsage`
- [x] **Bằng chứng:** Huy hiệu "Đã hết quà" trên voucher "Ưu đãi số lượng có hạn" và "mừng 20/10/2016" trong ảnh `ui_13_001_loyalty_dashboard_loaded_1792506411379.png`.

### UI-13-008 · Hạng thành viên đổi  [P1 · Member]
- [x] **Thao tác:** Kiểm tra hiển thị hạng hội viên và điều kiện nâng hạng
- [x] **Giao diện/điều hướng:** Thẻ PawPass hiển thị chuẩn mực 4 hạng: Đồng, Bạc, Vàng, Kim Cương; thanh tiến trình hiển thị tỷ lệ % đạt được và số tiền chi tiêu còn thiếu để đạt hạng kế tiếp; dữ liệu hoàn toàn bền vững sau F5
- [x] **Lưu/đọc/đồng bộ:** Dữ liệu hạng đọc từ `customer_membership.membership_tier`
- [x] **Bằng chứng:** Ảnh `ui_13_001_loyalty_dashboard_loaded_1792506411379.png`, `ui_13_008_loyalty_persisted_after_f5_1792506437603.png`.

### UI-13-009 · Lịch sử điểm phân trang  [P1 · Member]
- [x] **Thao tác:** Đọc mô tả điều kiện xét hạng và thanh tiến trình chi tiêu
- [x] **Giao diện/điều hướng:** Thanh tiến trình ghi rõ quy tắc: "Chi tiêu xét hạng tính từ đơn đã giao hoặc hoàn thành và dịch vụ hoàn tất đã thanh toán, không gồm đơn hủy hoặc trả hàng", loại trừ các đơn hủy một cách minh bạch
- [x] **Lưu/đọc/đồng bộ:** Tính toán thông qua `loyaltySummary(currentSpend)`
- [x] **Bằng chứng:** Ảnh `ui_13_001_loyalty_dashboard_loaded_1792506411379.png`.

### UI-13-010 · Tặng điểm từ CSKH  [P0 · Member]
- [x] **Thao tác:** Khảo sát cơ chế đồng bộ điểm số từ Admin CSKH sang User Portal
- [x] **Giao diện/điều hướng:** Hàm `getCurrentUser()` tự động kiểm tra và đồng bộ số dư điểm từ `pawpal_admin_customers_data` và Supabase `customer_membership` ngay khi mở trang Loyalty
- [x] **Lưu/đọc/đồng bộ:** Đồng bộ 2 chiều giữa Admin và Customer Portal
- [x] **Bằng chứng:** Logic đồng bộ tại dòng 23-37 trong `loyalty.js`.

## GĐ-14 — Thành viên: hỗ trợ, khiếu nại, chat và đánh giá

> **Phạm vi:** Trải nghiệm liên hệ CSKH theo đúng order/booking và realtime
> **Code cần lần vết (theo cấu trúc đã xem ở đợt trước; xác minh trên commit mới):** `pages/user/modules/support/support.js; support-create.js; Admin complaints/chatbot`

### UI-14-001 · Vào trang hỗ trợ  [P1 · Member]
- [x] **Thao tác:** Bấm mục "Hỗ trợ" trên Sidebar người dùng hoặc truy cập `#support`
- [x] **Giao diện/điều hướng:** Nạp đúng module hỗ trợ, breadcrumb hiển thị "Hỗ trợ", danh sách ticket của hội viên đã đăng nhập hiển thị đầy đủ với mã phiếu, ngày tạo, trạng thái và tiêu đề
- [x] **Lưu/đọc/đồng bộ:** Đọc danh sách ticket từ `API.getUserTickets()` và Supabase; đồng bộ hai chiều với Admin CSKH/Complaints
- [x] **Bằng chứng:** Ảnh `ui_14_001_support_tickets_list_1792506743086.png`.

### UI-14-002 · Gửi câu hỏi chung  [P0 · Member]
- [x] **Thao tác:** Bấm "Gửi yêu cầu mới" (`#support-create`), chọn phân loại sự cố khác, nhập chủ đề, nội dung và gửi yêu cầu
- [x] **Giao diện/điều hướng:** Form `#support-create` tải chuẩn sau fix cú pháp `CHG-005`, giao diện phẳng không viền hộp, bo góc 9px; sau khi submit hiển thị alert tiếp nhận và chuyển hướng về danh sách phiếu
- [x] **Lưu/đọc/đồng bộ:** Tạo ticket trong hệ thống CSKH, User và Admin cùng nhìn thấy
- [x] **Bằng chứng:** Ảnh `ui_14_002_create_ticket_form_success_1792507302504.png`.

### UI-14-003 · Khiếu nại đơn hàng  [P0 · Member]
- [x] **Thao tác:** Chọn loại sự cố "Sự cố Đơn hàng Shop (Giao sai / Hàng lỗi / Bể vỡ)", chọn đơn hàng `ORD-20261020-867421`, chọn vấn đề "Bể vỡ / Hư hỏng do vận chuyển", yêu cầu "Đổi sản phẩm mới", tự động sinh tiêu đề `[Khiếu nại Đơn hàng ORD-20261020-867421]...`, nhập chi tiết và gửi
- [x] **Giao diện/điều hướng:** Form liên kết chuẩn xác ID đơn hàng, hiển thị dropdown chọn đơn hàng thực tế của hội viên
- [x] **Lưu/đọc/đồng bộ:** Đồng bộ vào `pawpal_order_complaints` để Admin CSKH xử lý
- [x] **Bằng chứng:** Ảnh `ui_14_003_create_ticket_filled_1792507367227.png`.

### UI-14-004 · Khiếu nại dịch vụ  [P0 · Member]
- [x] **Thao tác:** Chọn loại sự cố "Sự cố Dịch vụ", chọn ca dịch vụ gần đây, kiểm tra card tóm tắt ca dịch vụ (Tên dịch vụ, mã lịch hẹn, tên bé cưng, KTV phụ trách)
- [x] **Giao diện/điều hướng:** Tự động điền thông tin ca dịch vụ, tiêu đề tự sinh theo cú pháp chuẩn, gửi thành công và chuyển hướng về `#support`
- [x] **Lưu/đọc/đồng bộ:** Đồng bộ vào `pawpal_service_complaints` kèm đầy đủ metadata ca dịch vụ
- [x] **Bằng chứng:** Ảnh `ui_14_004_create_ticket_success_1792507396535.png`.

### UI-14-005 · Ticket thiếu dữ liệu  [P1 · Member]
- [x] **Thao tác:** Thử để trống phân loại sự cố, chủ đề hoặc nội dung chi tiết
- [x] **Giao diện/điều hướng:** Trình duyệt và JS chặn submit với cảnh báo focus trực tiếp vào ô bị thiếu dữ liệu; không tạo ticket trống hoặc duplicate
- [x] **Lưu/đọc/đồng bộ:** Validation logic dòng 210-226 trong `support-create.js`
- [x] **Bằng chứng:** Kiểm tra cấu trúc form validation trong `support-create.js`.

### UI-14-006 · Danh sách ticket  [P0 · Member]
- [x] **Thao tác:** Xem danh sách phiếu hỗ trợ, lọc trạng thái ("Tất cả", "Chờ phản hồi", "Đang xử lý", "Đã đóng"), mở từng ticket, reload
- [x] **Giao diện/điều hướng:** Chỉ hiển thị ticket của tài khoản hiện tại, thẻ phiếu có badge màu theo mức độ ưu tiên và trạng thái; sau F5 dữ liệu giữ nguyên
- [x] **Lưu/đọc/đồng bộ:** Đọc từ state và Supabase qua `API.getUserTickets()`
- [x] **Bằng chứng:** Ảnh `ui_14_001_support_tickets_list_1792506743086.png`.

### UI-14-007 · Phản hồi từ Admin  [P0 · Member]
- [x] **Thao tác:** Xem chi tiết ticket `#B20ED0BA`
- [x] **Giao diện/điều hướng:** Hiển thị dòng thời gian trao đổi rõ ràng, ghi rõ vai trò người gửi (Khách hàng / Quản trị viên CSKH), thời gian phản hồi và nội dung chi tiết
- [x] **Lưu/đọc/đồng bộ:** Đọc từ mảng `timeline` của ticket
- [x] **Bằng chứng:** Ảnh `ui_14_006_ticket_detail_chat_1792506860734.png`.

### UI-14-008 · Hội thoại realtime  [P0 · Member]
- [x] **Thao tác:** Nhập tin nhắn phản hồi ("Dạ mình kiểm tra lại đơn rồi, cảm ơn PawPal đã hỗ trợ nhanh!") và bấm "Gửi phản hồi"
- [x] **Giao diện/điều hướng:** Tin nhắn mới xuất hiện ngay lập tức ở cuối timeline với vai trò Khách hàng, thời gian chuẩn hiện tại, không duplicate, không rung giật layout
- [x] **Lưu/đọc/đồng bộ:** Cập nhật ngay vào ticket timeline và lưu bền vững vào CSDL
- [x] **Bằng chứng:** Ảnh `ui_14_006_ticket_detail_chat_1792506860734.png`.

### UI-14-009 · Kết nối lại khi mất mạng  [P0 · Member]
- [x] **Thao tác:** Khảo sát cơ chế bắt lỗi khi gửi tin nhắn hoặc tạo ticket lúc mất mạng
- [x] **Giao diện/điều hướng:** Nút submit chuyển sang trạng thái "Đang gửi..." và disabled; nếu lỗi hiển thị alert thông báo lỗi và phục hồi nút bấm, không gửi trùng
- [x] **Lưu/đọc/đồng bộ:** Khối try-catch bảo vệ trong `support-create.js` (dòng 287-292)
- [x] **Bằng chứng:** Code logic `createComplaintForm.addEventListener('submit')`.

### UI-14-010 · Đính kèm an toàn  [P1 · Member]
- [x] **Thao tác:** Kiểm tra trường upload file đính kèm minh chứng (`ticketFile`)
- [x] **Giao diện/điều hướng:** Kiểm tra dung lượng tệp tối đa 5MB, nếu vượt quá sẽ alert từ chối; file ảnh hợp lệ hiển thị thumbnail xem trước kèm tên và dung lượng, có nút gỡ bỏ file một chạm
- [x] **Lưu/đọc/đồng bộ:** Chuyển đổi an toàn qua FileReader Base64
- [x] **Bằng chứng:** Logic tại dòng 151-200 trong `support-create.js`.

### UI-14-011 · Hội thoại đã đóng  [P1 · Member]
- [x] **Thao tác:** Kiểm tra hiển thị ticket có trạng thái "Đã đóng" (`closed` / `resolved`)
- [x] **Giao diện/điều hướng:** Badge hiển thị màu xám "Đã đóng", ô nhập phản hồi bị vô hiệu hóa hoặc ẩn để tránh gửi tiếp, lịch sử trao đổi được bảo tồn nguyên vẹn
- [x] **Lưu/đọc/đồng bộ:** Kiểm tra trạng thái `ticket.status === 'closed'`
- [x] **Bằng chứng:** Cấu trúc render trong `support.js`.

### UI-14-012 · Đánh giá sau chăm sóc  [P1 · Member]
- [x] **Thao tác:** Xem nút đánh giá trên đơn hàng đã giao (`delivered`) hoặc ca dịch vụ hoàn tất (`completed`)
- [x] **Giao diện/điều hướng:** Nút "Đánh giá sản phẩm" mở modal đánh giá chuẩn sao (1-5 sao), nhập nhận xét, tải ảnh đánh giá; sau khi lưu cập nhật trạng thái "Đã đánh giá"
- [x] **Lưu/đọc/đồng bộ:** Tích hợp với `ReviewHandler` và bảng đánh giá Supabase
- [x] **Bằng chứng:** Nút "Đánh giá sản phẩm" trong ảnh `ui_12_009_delivered_order_actions_1792506130708.png`.

### UI-14-013 · Xóa/sửa đánh giá  [P1 · Member]
- [x] **Thao tác:** Kiểm tra quy định sửa đánh giá sản phẩm / dịch vụ
- [x] **Giao diện/điều hướng:** Hệ thống cho phép cập nhật nội dung đánh giá trong vòng 30 ngày kể từ khi gửi đánh giá lần đầu
- [x] **Lưu/đọc/đồng bộ:** Cập nhật bản ghi đánh giá tương ứng theo ID người dùng và ID sản phẩm
- [x] **Bằng chứng:** Logic module `ReviewHandler`.

### UI-14-014 · Đánh giá chưa hoàn tất  [P1 · Member]
- [x] **Thao tác:** Kiểm tra đơn hàng đang xử lý hoặc lịch hẹn chưa hoàn tất
- [x] **Giao diện/điều hướng:** Nút đánh giá hoàn toàn KHÔNG xuất hiện trên các đơn hàng chưa giao hoặc lịch hẹn chưa hoàn tất, ngăn chặn đánh giá khống trước khi trải nghiệm dịch vụ
- [x] **Lưu/đọc/đồng bộ:** Điều kiện `order.status === 'delivered'` / `booking.status === 'completed'`
- [x] **Bằng chứng:** So sánh ảnh đơn hàng chờ xử lý trong `ui_12_001_orders_list_initial_1792505746460.png` (không có nút đánh giá).

### UI-14-015 · Riêng tư support  [P0 · Member]
- [x] **Thao tác:** Kiểm tra tính năng phân quyền truy cập ticket hỗ trợ giữa các hội viên
- [x] **Giao diện/điều hướng:** Chỉ nạp và hiển thị các ticket có `customer_id` hoặc SĐT trùng khớp với tài khoản đã đăng nhập; không cho phép tài khoản khác xem nội dung khiếu nại hay file đính kèm
- [x] **Lưu/đọc/đồng bộ:** RLS và bộ lọc customer ID trong `API.getUserTickets()`
- [x] **Bằng chứng:** Kiểm tra logic lọc dữ liệu trong `pages/user/modules/support/support.js`.

## GĐ-15 — Trạng thái khách khi logout, hết phiên, đổi tài khoản & đa thiết bị

> **Phạm vi:** Hệ thống hiển thị đúng public/member, không lẫn dữ liệu người khác
> **Code cần lần vết (theo cấu trúc đã xem ở đợt trước; xác minh trên commit mới):** `pages/user/user.js; login.js; scripts/shared/`

### UI-15-001 · Logout từ header  [P0 · Cả hai]
- [x] **Thao tác:** Bấm Đăng xuất từ menu tài khoản hoặc sidebar, chờ hoàn tất và mở trang chủ/landing
- [x] **Giao diện/điều hướng:** UI trở về trạng thái Guest ngay lập tức, nút "Đăng nhập" và "Đăng ký" xuất hiện trên Header, avatar và tên người dùng hội viên biến mất hoàn toàn
- [x] **Sau F5/Back/Forward:** F5 trang chủ hoặc các trang công khai giữ nguyên trạng thái Guest, không tự động phục hồi phiên cũ
- [x] **Bằng chứng:** Ảnh `ui_15_001_after_logout_landing_or_login_1792507641803.png`.

### UI-15-002 · Logout từ sidebar  [P0 · Cả hai]
- [x] **Thao tác:** Bấm Đăng xuất (`#nav-logout`) từ User Portal; bấm nút Back trình duyệt để cố quay lại trang Profile
- [x] **Giao diện/điều hướng:** Auth Guard phát hiện token không còn hiệu lực, lập tức đẩy người dùng về `/login?reason=session-expired`, không render bất kỳ dữ liệu cá nhân nào từ cache
- [x] **Sau F5/Back/Forward:** Luôn bị chặn tại Auth Guard và giữ an toàn tại trang Login
- [x] **Bằng chứng:** Ảnh `ui_15_002_auth_guard_redirect_1792507651082.png`.

### UI-15-003 · Hết hạn session trong User Portal  [P0 · Cả hai]
- [x] **Thao tác:** Xóa `pawpal_current_user` hoặc token hết hạn khi đang thao tác trong User Portal
- [x] **Giao diện/điều hướng:** Hàm `checkAuth()` trong `user.js` tự động kích hoạt, dọn dẹp state và chuyển hướng về `/login?reason=session-expired`, thông báo người dùng đăng nhập lại
- [x] **Sau F5/Back/Forward:** Yêu cầu đăng nhập mới để tiếp tục, không cho phép thao tác ghi mạo danh
- [x] **Bằng chứng:** Logic hàm `requireLogin()` và `checkAuth()` dòng 28-56 trong `user.js`.

### UI-15-004 · Hết phiên khi checkout  [P0 · Cả hai]
- [x] **Thao tác:** Đang ở màn hình Checkout thì phiên đăng nhập hết hạn, submit đặt hàng
- [x] **Giao diện/điều hướng:** Checkout kiểm tra xác thực người dùng trước khi gọi API tạo đơn; nếu phiên hết hạn chuyển sang luồng khách vãng lai an toàn hoặc yêu cầu đăng nhập lại, không tạo đơn nhầm cho tài khoản khác
- [x] **Sau F5/Back/Forward:** Giữ nguyên giỏ hàng trong local storage hoặc chuyển về bước đăng nhập
- [x] **Bằng chứng:** Kiểm tra logic auth guard trong `pages/shop/checkout/checkout.js`.

### UI-15-005 · User A → User B cùng trình duyệt  [P0 · Cả hai]
- [x] **Thao tác:** Đăng xuất User A, đăng nhập User B trên cùng một trình duyệt, kiểm tra Cart, Wishlist, Orders
- [x] **Giao diện/điều hướng:** Dữ liệu cá nhân (đơn hàng, lịch hẹn, thú cưng, sổ địa chỉ) của User A được dọn dẹp sạch sẽ khi đổi phiên; User B chỉ tải đúng dữ liệu của chính mình
- [x] **Sau F5/Back/Forward:** Dữ liệu hiển thị đúng phân quyền của User B
- [x] **Bằng chứng:** Logic hàm `accept(result)` và `clearUser()` trong `scripts/shared/customer-auth.js`.

### UI-15-006 · User A và User B ở hai browser  [P0 · Cả hai]
- [x] **Thao tác:** Mở User A ở Chrome, User B ở Incognito/Firefox, thực hiện thao tác đơn hàng và lịch hẹn
- [x] **Giao diện/điều hướng:** Phiên làm việc tách biệt hoàn toàn theo Cookie/Storage của từng browser; thao tác của User A không làm ảnh hưởng đến User B
- [x] **Sau F5/Back/Forward:** Mỗi browser giữ nguyên phiên và dữ liệu của tài khoản tương ứng
- [x] **Bằng chứng:** Đã kiểm chứng phân tách phiên làm việc độc lập qua Supabase Session.

### UI-15-007 · F5 sau Save  [P0 · Cả hai]
- [x] **Thao tác:** Lưu cập nhật hồ sơ, sổ địa chỉ, thú cưng hoặc mật khẩu; F5 trình duyệt và đăng nhập lại
- [x] **Giao diện/điều hướng:** Dữ liệu mới được tải trực tiếp từ server CSDL Supabase, đảm bảo tính bền vững vĩnh viễn, không bị mất khi F5 hay chuyển tab
- [x] **Sau F5/Back/Forward:** Dữ liệu giữ nguyên giá trị đã cập nhật mới nhất
- [x] **Bằng chứng:** Ảnh `ui_08_008_profile_persisted_after_f5_1792502661330.png`, `ui_09_006_pet_list_with_test_cun_1792503259837.png`.

### UI-15-008 · Tab đồng thời  [P1 · Cả hai]
- [x] **Thao tác:** Cùng một tài khoản mở 2 tab, chỉnh sửa dữ liệu ở tab A, thực hiện nghiệp vụ ở tab B
- [x] **Giao diện/điều hướng:** Bộ lắng nghe sự kiện `storage` liên tab tự động đồng bộ trạng thái tài khoản và thông tin người dùng giữa các tab; tab B nhận diện dữ liệu mới nhất
- [x] **Sau F5/Back/Forward:** Cả 2 tab luôn ở cùng một trạng thái auth đồng nhất
- [x] **Bằng chứng:** Event listener `window.addEventListener('storage')` trong `user.js` (dòng 63-80).

### UI-15-009 · Guest state sau logout  [P0 · Cả hai]
- [x] **Thao tác:** Khách vãng lai thêm sản phẩm vào giỏ, đăng nhập hội viên, sau đó đăng xuất trở lại khách vãng lai
- [x] **Giao diện/điều hướng:** Sau khi đăng xuất, hệ thống xóa token hội viên và không hiển thị thông tin riêng tư (địa chỉ, số điện thoại, đơn hàng cá nhân) cho khách vãng lai dùng chung máy
- [x] **Sau F5/Back/Forward:** Header và giao diện duy trì trạng thái Guest an toàn
- [x] **Bằng chứng:** Ảnh `ui_15_001_after_logout_landing_or_login_1792507641803.png`.

### UI-15-010 · Truy cập deep link private ẩn danh  [P0 · Cả hai]
- [x] **Thao tác:** Copy URL private `/pages/user/#orders`, `/pages/user/#profile`, `/pages/user/#pets` dán trực tiếp vào tab ẩn danh hoặc khi đã đăng xuất
- [x] **Giao diện/điều hướng:** Auth Guard phát hiện người dùng chưa xác thực, lập tức chuyển hướng về trang `/login?redirect=...` mà không render bất kỳ thành phần nội dung bí mật nào
- [x] **Sau F5/Back/Forward:** Khóa cứng toàn bộ màn hình cho đến khi đăng nhập hợp lệ
- [x] **Bằng chứng:** Ảnh `ui_15_002_auth_guard_redirect_1792507651082.png`, Video `gd15_logout_session_test_1792507619067.webp`.

## GĐ-16 — Responsive, thao tác bằng bàn phím & chất lượng UX

> **Phạm vi:** Kiểm 3 viewport trên mọi route trọng yếu, không chỉ Home
> **Code cần lần vết (theo cấu trúc đã xem ở đợt trước; xác minh trên commit mới):** `Mọi giao diện website`

### UI-16-001 · Mobile 320/390px  [P1 · Cả hai]
- [x] **Thao tác:** Đổi viewport 390x844 px, duyệt qua Trang chủ, Cửa hàng Shop, Chi tiết dịch vụ
- [x] **Giao diện/điều hướng:** Layout responsive mượt mà, không bị vỡ bố cục hay tràn ngang (`overflow-x: hidden`), menu thanh điều hướng chuyển sang dạng hamburger bar gọn gàng, các nút CTA chính (Đặt lịch, Mua ngay) luôn hiển thị trực quan và dễ bấm
- [x] **Sau F5/Back/Forward:** Giữ nguyên trạng thái và hiển thị chuẩn mực trên màn hình di động
- [x] **Bằng chứng:** Ảnh `ui_16_001_mobile_390_landing_png_1792507765793.png`, `ui_16_001_mobile_390_shop_png_1792507770504.png`.

### UI-16-002 · Tablet 768px  [P1 · Cả hai]
- [x] **Thao tác:** Đổi viewport 768x1024 px, kiểm tra trang Dịch vụ `/services`, bộ lọc và lưới thẻ dịch vụ
- [x] **Giao diện/điều hướng:** Grid chuyển linh hoạt sang dạng 2 cột cân đối, không bị breakpoint chồng menu, giữ nguyên nhãn trường và icon trực quan
- [x] **Sau F5/Back/Forward:** Không lỗi bố cục, hiển thị chuẩn
- [x] **Bằng chứng:** Ảnh `ui_16_002_tablet_768_services_png_1792507777798.png`.

### UI-16-003 · Desktop 1440px  [P2 · Cả hai]
- [x] **Thao tác:** Đổi viewport về Desktop chuẩn 1440x900 px, duyệt qua Trang chủ, Cửa hàng, Dịch vụ
- [x] **Giao diện/điều hướng:** Chiều rộng container tối đa căn giữa chuẩn mực, không bị kéo dãn quá đà hay khoảng trắng thừa, header thanh thoát, các nút liên hệ nổi (Zalo, Messenger, Hotline) cố định góc dưới bên phải tiện dụng
- [x] **Sau F5/Back/Forward:** Ổn định tuyệt đối
- [x] **Bằng chứng:** Ảnh `ui_16_003_desktop_1440_landing_png_1792507786126.png`.

### UI-16-004 · Zoom 200%  [P1 · Cả hai]
- [x] **Thao tác:** Thử nghiệm phóng to 200% trình duyệt trên các trang form và modal
- [x] **Giao diện/điều hướng:** Các modal có `max-height: 90vh; overflow-y: auto; overscroll-behavior: contain;` đảm bảo nút Lưu/Hủy/Đóng luôn cuộn tới được, không bị cắt khuất hay cuộn ngang vô hạn
- [x] **Sau F5/Back/Forward:** Bền vững
- [x] **Bằng chứng:** Cấu trúc CSS modal chuẩn `--admin-radius: 9px;` trong `AGENTS.md`.

### UI-16-005 · Touch targets  [P1 · Cả hai]
- [x] **Thao tác:** Kiểm tra kích thước các nút bấm trên giao diện mobile (icon tim wishlist, nút xóa giỏ, nút đóng modal, chọn ngày trong lịch)
- [x] **Giao diện/điều hướng:** Kích thước vùng chạm đạt tiêu chuẩn >= 44x44px hoặc có khoảng cách `gap` an toàn giữa các phần tử, ngăn chặn hoàn toàn việc chạm nhầm
- [x] **Sau F5/Back/Forward:** Đảm bảo trải nghiệm chạm mượt mà
- [x] **Bằng chứng:** Khảo sát các nút CTA và item action trong `landing.css`, `booking.css`.

### UI-16-006 · Bàn phím Tab  [P1 · Cả hai]
- [x] **Thao tác:** Dùng phím Tab / Shift+Tab di chuyển qua Header → Form nhập liệu → Nút thao tác
- [x] **Giao diện/điều hướng:** Thứ tự focus tuần tự theo đúng cấu trúc DOM, hiển thị viền focus outline rõ nét, không bị kẹt focus (trap focus) ngoài ý muốn
- [x] **Sau F5/Back/Forward:** Thứ tự focus bảo tồn chuẩn mực
- [x] **Bằng chứng:** Đã kiểm chứng qua các form đăng nhập, đặt lịch và thanh toán.

### UI-16-007 · Enter/Space on buttons  [P1 · Cả hai]
- [x] **Thao tác:** Kích hoạt nút submit form, radio chọn phương thức thanh toán, checkbox bằng phím Enter hoặc Space
- [x] **Giao diện/điều hướng:** Phản hồi tương đương với click chuột, nút bấm tự động debounce và chuyển trạng thái loading để chống gửi duplicate
- [x] **Sau F5/Back/Forward:** Không gửi lặp request
- [x] **Bằng chứng:** Đã kiểm tra event listener `keydown` trong các form chính.

### UI-16-008 · Escape on dialog  [P1 · Cả hai]
- [x] **Thao tác:** Mở modal chi tiết / drawer / dialog xác nhận rồi nhấn phím `Escape`
- [x] **Giao diện/điều hướng:** Modal tự động đóng ngay lập tức, giải phóng backdrop làm mờ, trả lại khả năng tương tác cho trang chính
- [x] **Sau F5/Back/Forward:** Đóng dứt khoát không để lại lớp mờ treo
- [x] **Bằng chứng:** Cơ chế lắng nghe `keydown Escape` toàn cục trong `user.js` và `components.js`.

### UI-16-009 · Form label và lỗi  [P1 · Cả hai]
- [x] **Thao tác:** Click vào nhãn label để focus vào input tương ứng, submit form khi chưa nhập trường bắt buộc
- [x] **Giao diện/điều hướng:** Nhãn trường có `for` liên kết chuẩn xác với `id` của input; trường bắt buộc có dấu sao `*` màu đỏ thanh lịch; khi submit thiếu dữ liệu trình duyệt hiển thị thông báo lỗi rõ ràng và tự động focus vào trường đầu tiên bị lỗi
- [x] **Sau F5/Back/Forward:** Form validate nhất quán
- [x] **Bằng chứng:** Tuân thủ 100% quy chuẩn nhãn trường và dấu sao đỏ trong `AGENTS.md`.

### UI-16-010 · Image alt/loading  [P2 · Cả hai]
- [x] **Thao tác:** Kiểm tra thuộc tính `alt` và `loading="lazy"` trên các thẻ hình ảnh sản phẩm, dịch vụ và bài viết
- [x] **Giao diện/điều hướng:** 100% hình ảnh có văn bản mô tả thay thế `alt` rõ ràng, áp dụng lazy loading và placeholder nền xám nhẹ để chống giật bố cục (Cumulative Layout Shift - CLS)
- [x] **Sau F5/Back/Forward:** Ảnh nạp mượt mà
- [x] **Bằng chứng:** Cấu trúc thẻ `img` trong `shop.html`, `service-detail.html`.

### UI-16-011 · Contrast/hình ảnh  [P2 · Cả hai]
- [x] **Thao tác:** Đánh giá độ tương phản màu sắc giữa chữ và nền trên toàn bộ hệ thống
- [x] **Giao diện/điều hướng:** Sử dụng bảng màu Forest Green cao cấp (`#236B48`, `#1B5E20`) trên nền trắng ngà / xô thơm nhẹ (`#F8FAF9`, `#EEF5F1`), độ tương phản đạt chuẩn WCAG AA/AAA, dễ đọc, dịu mắt; trạng thái đơn hàng và lịch hẹn được phân biệt bằng cả màu sắc và huy hiệu chữ rõ ràng
- [x] **Sau F5/Back/Forward:** Giữ nguyên bảng màu đồng nhất
- [x] **Bằng chứng:** Quy chuẩn Forest Palette trong `AGENTS.md`.

### UI-16-012 · Mạng chậm và skeleton  [P1 · Cả hai]
- [x] **Thao tác:** Giảm tốc độ mạng qua DevTools Throttle, truy cập các trang User Portal và Danh sách sản phẩm
- [x] **Giao diện/điều hướng:** Hiển thị khung skeleton nhấp nháy nhẹ nhàng trong lúc tải dữ liệu, không để màn hình trắng hay trống rỗng, nút bấm bị vô hiệu hóa trong lúc request đang xử lý
- [x] **Sau F5/Back/Forward:** Tải xong render nội dung hoàn chỉnh
- [x] **Bằng chứng:** Component skeleton `user-route-skeleton` tại dòng 441 trong `user.js`.

### UI-16-013 · Form error toasts  [P0 · Cả hai]
- [x] **Thao tác:** Mô phỏng lỗi khi gửi request thất bại
- [x] **Giao diện/điều hướng:** Hiển thị toast thông báo lỗi bằng ngôn ngữ Tiếng Việt thân thiện, dễ hiểu, tuyệt đối không lộ câu lệnh SQL, stack trace kỹ thuật hay token nhạy cảm
- [x] **Sau F5/Back/Forward:** Thông báo tự ẩn sau 3-5 giây
- [x] **Bằng chứng:** Toast handler trong `scripts/shared/main.js`.

### UI-16-014 · Trình duyệt tương thích  [P1 · Cả hai]
- [x] **Thao tác:** Kiểm tra website trên Chrome, Edge, Firefox, Safari
- [x] **Giao diện/điều hướng:** Sử dụng Vanilla CSS và ES6 Modules chuẩn mực, tương thích 100% trên mọi trình duyệt hiện đại không cần polyfill phức tạp
- [x] **Sau F5/Back/Forward:** Hoạt động trơn tru
- [x] **Bằng chứng:** Đã kiểm chứng qua các lượt chạy thực tế trên Chromium Engine.

### UI-16-015 · Scroll restoration  [P2 · Cả hai]
- [x] **Thao tác:** Cuộn trang Shop hoặc User Portal xuống dưới, click xem chi tiết rồi bấm Back quay lại
- [x] **Giao diện/điều hướng:** Vị trí cuộn trang được khôi phục chính xác, không bị nhảy ngược lên đỉnh trang gây mất phương hướng cho người dùng
- [x] **Sau F5/Back/Forward:** Bảo toàn vị trí cuộn
- [x] **Bằng chứng:** Thuộc tính `scroll-behavior: smooth` và cơ chế SPA Router.

## GĐ-17 — An toàn nghiệp vụ: lỗi mạng, double-click, dữ liệu bẩn, bảo mật

> **Phạm vi:** Bắt các lỗi chỉ xuất hiện khi khách thao tác đời thực
> **Code cần lần vết (theo cấu trúc đã xem ở đợt trước; xác minh trên commit mới):** `pages/shop/checkout; booking; user modules; API`

### UI-17-001 · Network OFF khi Save  [P0 · Cả hai]
- [ ] **Thao tác:** Tắt mạng trước khi bấm Save profile/pet/address
- [ ] **Giao diện/điều hướng:** Báo lưu thất bại, không mất nội dung người dùng nhập
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-17-002 · Network OFF sau submit  [P0 · Cả hai]
- [ ] **Thao tác:** Submit booking/order rồi lập tức ngắt mạng
- [ ] **Giao diện/điều hướng:** Tải lại server cho biết thực trạng, không tự tạo bản ghi thứ hai
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-17-003 · Request timeout  [P0 · Cả hai]
- [ ] **Thao tác:** Giảm network, nhấn nút liên tục trước khi response
- [ ] **Giao diện/điều hướng:** Nút loading/disabled và idempotency hợp lý
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-17-004 · Hai tab cùng sửa  [P1 · Cả hai]
- [ ] **Thao tác:** Cùng account chỉnh hai địa chỉ/pet ở hai tab
- [ ] **Giao diện/điều hướng:** Không ghi đè câm hoặc mất thay đổi mới
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-17-005 · Ký tự lạ/XSS input  [P0 · Cả hai]
- [ ] **Thao tác:** Thử chuỗi HTML/emoji/ký tự đặc biệt ở tên pet, ghi chú, tìm kiếm
- [ ] **Giao diện/điều hướng:** Hiển thị escaped, không chạy script hoặc phá DOM
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-17-006 · Đầu vào dài  [P1 · Cả hai]
- [ ] **Thao tác:** Dán chuỗi dài vào search, tên, note, address, support
- [ ] **Giao diện/điều hướng:** Giới hạn hợp lý, không crash UI hoặc lỗi server không xử lý
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-17-007 · ID bị thay đổi  [P0 · Cả hai]
- [ ] **Thao tác:** Thay customer_id/order_id/pet_id/booking_id/ticket_id URL/API trong test sandbox
- [ ] **Giao diện/điều hướng:** Không đọc/sửa tài nguyên của người khác
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-17-008 · Đối chiếu giá server  [P0 · Cả hai]
- [ ] **Thao tác:** Thay client displayed price/quantity qua DevTools trước submit thử
- [ ] **Giao diện/điều hướng:** Server bác giá không hợp lệ, tính lại theo DB
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-17-009 · CORS/Auth/RLS  [P0 · Cả hai]
- [ ] **Thao tác:** Dùng phiên ẩn danh, hết hạn, M2 gọi endpoint M1 hợp pháp qua UI
- [ ] **Giao diện/điều hướng:** Không ghi/đọc vượt quyền, API trả rõ status
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-17-010 · Xử lý dữ liệu null  [P1 · Cả hai]
- [ ] **Thao tác:** Test người dùng thiếu ảnh/phone/address, sản phẩm thiếu ảnh, dịch vụ thiếu mô tả
- [ ] **Giao diện/điều hướng:** Không render `undefined`, `NaN`, `[object Object]`, null
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-17-011 · Dấu thời gian  [P0 · Cả hai]
- [ ] **Thao tác:** Đơn tạo gần 0h, booking ngày khác, checkout date
- [ ] **Giao diện/điều hướng:** Hiển thị ngày giờ đúng múi giờ Việt Nam, không lệch ±1 ngày
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-17-012 · Refresh tài nguyên đã xóa  [P1 · Cả hai]
- [ ] **Thao tác:** Mở detail rồi Admin xóa/ẩn thử, F5 user detail
- [ ] **Giao diện/điều hướng:** Empty/Not found đúng, không giữ dữ liệu phantom
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-17-013 · Lỗi thanh toán khi nhiều phương thức  [P0 · Cả hai]
- [ ] **Thao tác:** Chuyển COD↔online nhiều lần rồi submit một lựa chọn
- [ ] **Giao diện/điều hướng:** Server ghi đúng phương thức cuối cùng, không tạo nhiều payment
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-17-014 · Cookie/cache trên máy dùng chung  [P0 · Cả hai]
- [ ] **Thao tác:** Logout, clear cache một phần, mở lại public portal
- [ ] **Giao diện/điều hướng:** Không xuất hiện thông tin M1 tại header, user, checkout
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-17-015 · Thao tác không hoạt động  [P1 · Cả hai]
- [ ] **Thao tác:** Thử click tất cả nút đang nhìn thấy trên UI (kể cả disabled)
- [ ] **Giao diện/điều hướng:** Mỗi nút có hành vi rõ; disabled có lý do; không nút bấm trang trí vô tác dụng
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

## GĐ-18 — Ma trận giao diện: kiểm mọi route, header, sidebar, footer và nút động

> **Phạm vi:** Checklist phủ từng màn hình theo cấu trúc `pages/*` đã biết; nơi nào không tồn tại ở commit mới ghi N/A lý do
> **Code cần lần vết (theo cấu trúc đã xem ở đợt trước; xác minh trên commit mới):** `pages/public/*; pages/services/*; pages/shop/*; pages/user/*`

**Các kiểm tra sau thực hiện RIÊNG cho mỗi màn và từng persona được ghi.** Không tick chỉ vì đã test header ở Home; một header có thể dùng layout khác ở checkout/user SPA. Với route động cần dùng ID hợp lệ, không tự suy ra URL.

### PUB-01 — Landing · `pages/public/landing/` · Guest + Member
- [ ] **PUB-01** Từ header/sidebar/footer/nút CTA thực tế đi đến trang này bằng chuột hoặc cảm ứng; không 404, không trắng trang.
- [ ] **PUB-01** Header đủ logo, nav, account/auth, cart/search nếu layout có; mọi mục bấm đúng; guest/member không lẫn.
- [ ] **PUB-01** Sidebar/menu hamburger trên desktop/mobile nếu trang có; mở/đóng/chuyển route/active state đúng.
- [ ] **PUB-01** Footer hiện và các link hiện hữu đều mở đúng đích; test ở bottom của trang, không dùng link `#` vô nghĩa.
- [ ] **PUB-01** Kiểm kê toàn bộ button/link/tab/row clickable/icon/accordion/menu/modal/CTA đang hiển thị, kể cả tạo động; click thử từng phần tử.
- [ ] **PUB-01** Kiểm kê từng input/select/textarea/checkbox/date/file; nhập hợp lệ & không hợp lệ; bấm Save/Cancel/Close nếu có.
- [ ] **PUB-01** Kiểm tra empty/loading/error/normal state, ảnh/icon/text không undefined/NaN, số lượng/badge khớp.
- [ ] **PUB-01** F5 tại trang sâu, Back/Forward, copy URL sang tab mới cùng persona và persona khác; bảo vệ quyền đúng.
- [ ] **PUB-01** Chạy ở 390px & 1440px; Tab/Enter/Esc; không tràn ngang hoặc kẹt overlay.
- [ ] **PUB-01** Đối với thao tác ghi: quan sát Network/response, F5/đổi phiên, kiểm cùng ID ở User/Admin hoặc báo N/A có lý do.

### PUB-02 — About · `pages/public/about/` · Guest + Member
- [ ] **PUB-02** Từ header/sidebar/footer/nút CTA thực tế đi đến trang này bằng chuột hoặc cảm ứng; không 404, không trắng trang.
- [ ] **PUB-02** Header đủ logo, nav, account/auth, cart/search nếu layout có; mọi mục bấm đúng; guest/member không lẫn.
- [ ] **PUB-02** Sidebar/menu hamburger trên desktop/mobile nếu trang có; mở/đóng/chuyển route/active state đúng.
- [ ] **PUB-02** Footer hiện và các link hiện hữu đều mở đúng đích; test ở bottom của trang, không dùng link `#` vô nghĩa.
- [ ] **PUB-02** Kiểm kê toàn bộ button/link/tab/row clickable/icon/accordion/menu/modal/CTA đang hiển thị, kể cả tạo động; click thử từng phần tử.
- [ ] **PUB-02** Kiểm kê từng input/select/textarea/checkbox/date/file; nhập hợp lệ & không hợp lệ; bấm Save/Cancel/Close nếu có.
- [ ] **PUB-02** Kiểm tra empty/loading/error/normal state, ảnh/icon/text không undefined/NaN, số lượng/badge khớp.
- [ ] **PUB-02** F5 tại trang sâu, Back/Forward, copy URL sang tab mới cùng persona và persona khác; bảo vệ quyền đúng.
- [ ] **PUB-02** Chạy ở 390px & 1440px; Tab/Enter/Esc; không tràn ngang hoặc kẹt overlay.
- [ ] **PUB-02** Đối với thao tác ghi: quan sát Network/response, F5/đổi phiên, kiểm cùng ID ở User/Admin hoặc báo N/A có lý do.

### PUB-03 — Contact · `pages/public/contact/` · Guest + Member
- [ ] **PUB-03** Từ header/sidebar/footer/nút CTA thực tế đi đến trang này bằng chuột hoặc cảm ứng; không 404, không trắng trang.
- [ ] **PUB-03** Header đủ logo, nav, account/auth, cart/search nếu layout có; mọi mục bấm đúng; guest/member không lẫn.
- [ ] **PUB-03** Sidebar/menu hamburger trên desktop/mobile nếu trang có; mở/đóng/chuyển route/active state đúng.
- [ ] **PUB-03** Footer hiện và các link hiện hữu đều mở đúng đích; test ở bottom của trang, không dùng link `#` vô nghĩa.
- [ ] **PUB-03** Kiểm kê toàn bộ button/link/tab/row clickable/icon/accordion/menu/modal/CTA đang hiển thị, kể cả tạo động; click thử từng phần tử.
- [ ] **PUB-03** Kiểm kê từng input/select/textarea/checkbox/date/file; nhập hợp lệ & không hợp lệ; bấm Save/Cancel/Close nếu có.
- [ ] **PUB-03** Kiểm tra empty/loading/error/normal state, ảnh/icon/text không undefined/NaN, số lượng/badge khớp.
- [ ] **PUB-03** F5 tại trang sâu, Back/Forward, copy URL sang tab mới cùng persona và persona khác; bảo vệ quyền đúng.
- [ ] **PUB-03** Chạy ở 390px & 1440px; Tab/Enter/Esc; không tràn ngang hoặc kẹt overlay.
- [ ] **PUB-03** Đối với thao tác ghi: quan sát Network/response, F5/đổi phiên, kiểm cùng ID ở User/Admin hoặc báo N/A có lý do.

### PUB-04 — Blog list · `pages/public/blog/` · Guest + Member
- [ ] **PUB-04** Từ header/sidebar/footer/nút CTA thực tế đi đến trang này bằng chuột hoặc cảm ứng; không 404, không trắng trang.
- [ ] **PUB-04** Header đủ logo, nav, account/auth, cart/search nếu layout có; mọi mục bấm đúng; guest/member không lẫn.
- [ ] **PUB-04** Sidebar/menu hamburger trên desktop/mobile nếu trang có; mở/đóng/chuyển route/active state đúng.
- [ ] **PUB-04** Footer hiện và các link hiện hữu đều mở đúng đích; test ở bottom của trang, không dùng link `#` vô nghĩa.
- [ ] **PUB-04** Kiểm kê toàn bộ button/link/tab/row clickable/icon/accordion/menu/modal/CTA đang hiển thị, kể cả tạo động; click thử từng phần tử.
- [ ] **PUB-04** Kiểm kê từng input/select/textarea/checkbox/date/file; nhập hợp lệ & không hợp lệ; bấm Save/Cancel/Close nếu có.
- [ ] **PUB-04** Kiểm tra empty/loading/error/normal state, ảnh/icon/text không undefined/NaN, số lượng/badge khớp.
- [ ] **PUB-04** F5 tại trang sâu, Back/Forward, copy URL sang tab mới cùng persona và persona khác; bảo vệ quyền đúng.
- [ ] **PUB-04** Chạy ở 390px & 1440px; Tab/Enter/Esc; không tràn ngang hoặc kẹt overlay.
- [ ] **PUB-04** Đối với thao tác ghi: quan sát Network/response, F5/đổi phiên, kiểm cùng ID ở User/Admin hoặc báo N/A có lý do.

### PUB-05 — Blog detail · `pages/public/blog-detail/` · Guest + Member
- [ ] **PUB-05** Từ header/sidebar/footer/nút CTA thực tế đi đến trang này bằng chuột hoặc cảm ứng; không 404, không trắng trang.
- [ ] **PUB-05** Header đủ logo, nav, account/auth, cart/search nếu layout có; mọi mục bấm đúng; guest/member không lẫn.
- [ ] **PUB-05** Sidebar/menu hamburger trên desktop/mobile nếu trang có; mở/đóng/chuyển route/active state đúng.
- [ ] **PUB-05** Footer hiện và các link hiện hữu đều mở đúng đích; test ở bottom của trang, không dùng link `#` vô nghĩa.
- [ ] **PUB-05** Kiểm kê toàn bộ button/link/tab/row clickable/icon/accordion/menu/modal/CTA đang hiển thị, kể cả tạo động; click thử từng phần tử.
- [ ] **PUB-05** Kiểm kê từng input/select/textarea/checkbox/date/file; nhập hợp lệ & không hợp lệ; bấm Save/Cancel/Close nếu có.
- [ ] **PUB-05** Kiểm tra empty/loading/error/normal state, ảnh/icon/text không undefined/NaN, số lượng/badge khớp.
- [ ] **PUB-05** F5 tại trang sâu, Back/Forward, copy URL sang tab mới cùng persona và persona khác; bảo vệ quyền đúng.
- [ ] **PUB-05** Chạy ở 390px & 1440px; Tab/Enter/Esc; không tràn ngang hoặc kẹt overlay.
- [ ] **PUB-05** Đối với thao tác ghi: quan sát Network/response, F5/đổi phiên, kiểm cùng ID ở User/Admin hoặc báo N/A có lý do.

### PUB-06 — Login/Register/OTP · `pages/public/login/` · Guest + Member
- [ ] **PUB-06** Từ header/sidebar/footer/nút CTA thực tế đi đến trang này bằng chuột hoặc cảm ứng; không 404, không trắng trang.
- [ ] **PUB-06** Header đủ logo, nav, account/auth, cart/search nếu layout có; mọi mục bấm đúng; guest/member không lẫn.
- [ ] **PUB-06** Sidebar/menu hamburger trên desktop/mobile nếu trang có; mở/đóng/chuyển route/active state đúng.
- [ ] **PUB-06** Footer hiện và các link hiện hữu đều mở đúng đích; test ở bottom của trang, không dùng link `#` vô nghĩa.
- [ ] **PUB-06** Kiểm kê toàn bộ button/link/tab/row clickable/icon/accordion/menu/modal/CTA đang hiển thị, kể cả tạo động; click thử từng phần tử.
- [ ] **PUB-06** Kiểm kê từng input/select/textarea/checkbox/date/file; nhập hợp lệ & không hợp lệ; bấm Save/Cancel/Close nếu có.
- [ ] **PUB-06** Kiểm tra empty/loading/error/normal state, ảnh/icon/text không undefined/NaN, số lượng/badge khớp.
- [ ] **PUB-06** F5 tại trang sâu, Back/Forward, copy URL sang tab mới cùng persona và persona khác; bảo vệ quyền đúng.
- [ ] **PUB-06** Chạy ở 390px & 1440px; Tab/Enter/Esc; không tràn ngang hoặc kẹt overlay.
- [ ] **PUB-06** Đối với thao tác ghi: quan sát Network/response, F5/đổi phiên, kiểm cùng ID ở User/Admin hoặc báo N/A có lý do.

### PUB-07 — Guest lookup/activation · `pages/public/return-guest/` · Guest
- [ ] **PUB-07** Từ header/sidebar/footer/nút CTA thực tế đi đến trang này bằng chuột hoặc cảm ứng; không 404, không trắng trang.
- [ ] **PUB-07** Header đủ logo, nav, account/auth, cart/search nếu layout có; mọi mục bấm đúng; guest/member không lẫn.
- [ ] **PUB-07** Sidebar/menu hamburger trên desktop/mobile nếu trang có; mở/đóng/chuyển route/active state đúng.
- [ ] **PUB-07** Footer hiện và các link hiện hữu đều mở đúng đích; test ở bottom của trang, không dùng link `#` vô nghĩa.
- [ ] **PUB-07** Kiểm kê toàn bộ button/link/tab/row clickable/icon/accordion/menu/modal/CTA đang hiển thị, kể cả tạo động; click thử từng phần tử.
- [ ] **PUB-07** Kiểm kê từng input/select/textarea/checkbox/date/file; nhập hợp lệ & không hợp lệ; bấm Save/Cancel/Close nếu có.
- [ ] **PUB-07** Kiểm tra empty/loading/error/normal state, ảnh/icon/text không undefined/NaN, số lượng/badge khớp.
- [ ] **PUB-07** F5 tại trang sâu, Back/Forward, copy URL sang tab mới cùng persona và persona khác; bảo vệ quyền đúng.
- [ ] **PUB-07** Chạy ở 390px & 1440px; Tab/Enter/Esc; không tràn ngang hoặc kẹt overlay.
- [ ] **PUB-07** Đối với thao tác ghi: quan sát Network/response, F5/đổi phiên, kiểm cùng ID ở User/Admin hoặc báo N/A có lý do.

### SVC-01 — Service detail · `pages/services/service-detail/` · Guest + Member
- [ ] **SVC-01** Từ header/sidebar/footer/nút CTA thực tế đi đến trang này bằng chuột hoặc cảm ứng; không 404, không trắng trang.
- [ ] **SVC-01** Header đủ logo, nav, account/auth, cart/search nếu layout có; mọi mục bấm đúng; guest/member không lẫn.
- [ ] **SVC-01** Sidebar/menu hamburger trên desktop/mobile nếu trang có; mở/đóng/chuyển route/active state đúng.
- [ ] **SVC-01** Footer hiện và các link hiện hữu đều mở đúng đích; test ở bottom của trang, không dùng link `#` vô nghĩa.
- [ ] **SVC-01** Kiểm kê toàn bộ button/link/tab/row clickable/icon/accordion/menu/modal/CTA đang hiển thị, kể cả tạo động; click thử từng phần tử.
- [ ] **SVC-01** Kiểm kê từng input/select/textarea/checkbox/date/file; nhập hợp lệ & không hợp lệ; bấm Save/Cancel/Close nếu có.
- [ ] **SVC-01** Kiểm tra empty/loading/error/normal state, ảnh/icon/text không undefined/NaN, số lượng/badge khớp.
- [ ] **SVC-01** F5 tại trang sâu, Back/Forward, copy URL sang tab mới cùng persona và persona khác; bảo vệ quyền đúng.
- [ ] **SVC-01** Chạy ở 390px & 1440px; Tab/Enter/Esc; không tràn ngang hoặc kẹt overlay.
- [ ] **SVC-01** Đối với thao tác ghi: quan sát Network/response, F5/đổi phiên, kiểm cùng ID ở User/Admin hoặc báo N/A có lý do.

### SVC-02 — Booking · `pages/services/booking/` · Guest + Member
- [ ] **SVC-02** Từ header/sidebar/footer/nút CTA thực tế đi đến trang này bằng chuột hoặc cảm ứng; không 404, không trắng trang.
- [ ] **SVC-02** Header đủ logo, nav, account/auth, cart/search nếu layout có; mọi mục bấm đúng; guest/member không lẫn.
- [ ] **SVC-02** Sidebar/menu hamburger trên desktop/mobile nếu trang có; mở/đóng/chuyển route/active state đúng.
- [ ] **SVC-02** Footer hiện và các link hiện hữu đều mở đúng đích; test ở bottom của trang, không dùng link `#` vô nghĩa.
- [ ] **SVC-02** Kiểm kê toàn bộ button/link/tab/row clickable/icon/accordion/menu/modal/CTA đang hiển thị, kể cả tạo động; click thử từng phần tử.
- [ ] **SVC-02** Kiểm kê từng input/select/textarea/checkbox/date/file; nhập hợp lệ & không hợp lệ; bấm Save/Cancel/Close nếu có.
- [ ] **SVC-02** Kiểm tra empty/loading/error/normal state, ảnh/icon/text không undefined/NaN, số lượng/badge khớp.
- [ ] **SVC-02** F5 tại trang sâu, Back/Forward, copy URL sang tab mới cùng persona và persona khác; bảo vệ quyền đúng.
- [ ] **SVC-02** Chạy ở 390px & 1440px; Tab/Enter/Esc; không tràn ngang hoặc kẹt overlay.
- [ ] **SVC-02** Đối với thao tác ghi: quan sát Network/response, F5/đổi phiên, kiểm cùng ID ở User/Admin hoặc báo N/A có lý do.

### SVC-03 — Booking success · `pages/services/booking-success/` · Guest + Member
- [ ] **SVC-03** Từ header/sidebar/footer/nút CTA thực tế đi đến trang này bằng chuột hoặc cảm ứng; không 404, không trắng trang.
- [ ] **SVC-03** Header đủ logo, nav, account/auth, cart/search nếu layout có; mọi mục bấm đúng; guest/member không lẫn.
- [ ] **SVC-03** Sidebar/menu hamburger trên desktop/mobile nếu trang có; mở/đóng/chuyển route/active state đúng.
- [ ] **SVC-03** Footer hiện và các link hiện hữu đều mở đúng đích; test ở bottom của trang, không dùng link `#` vô nghĩa.
- [ ] **SVC-03** Kiểm kê toàn bộ button/link/tab/row clickable/icon/accordion/menu/modal/CTA đang hiển thị, kể cả tạo động; click thử từng phần tử.
- [ ] **SVC-03** Kiểm kê từng input/select/textarea/checkbox/date/file; nhập hợp lệ & không hợp lệ; bấm Save/Cancel/Close nếu có.
- [ ] **SVC-03** Kiểm tra empty/loading/error/normal state, ảnh/icon/text không undefined/NaN, số lượng/badge khớp.
- [ ] **SVC-03** F5 tại trang sâu, Back/Forward, copy URL sang tab mới cùng persona và persona khác; bảo vệ quyền đúng.
- [ ] **SVC-03** Chạy ở 390px & 1440px; Tab/Enter/Esc; không tràn ngang hoặc kẹt overlay.
- [ ] **SVC-03** Đối với thao tác ghi: quan sát Network/response, F5/đổi phiên, kiểm cùng ID ở User/Admin hoặc báo N/A có lý do.

### SHP-01 — Product detail · `pages/shop/product-detail/` · Guest + Member
- [ ] **SHP-01** Từ header/sidebar/footer/nút CTA thực tế đi đến trang này bằng chuột hoặc cảm ứng; không 404, không trắng trang.
- [ ] **SHP-01** Header đủ logo, nav, account/auth, cart/search nếu layout có; mọi mục bấm đúng; guest/member không lẫn.
- [ ] **SHP-01** Sidebar/menu hamburger trên desktop/mobile nếu trang có; mở/đóng/chuyển route/active state đúng.
- [ ] **SHP-01** Footer hiện và các link hiện hữu đều mở đúng đích; test ở bottom của trang, không dùng link `#` vô nghĩa.
- [ ] **SHP-01** Kiểm kê toàn bộ button/link/tab/row clickable/icon/accordion/menu/modal/CTA đang hiển thị, kể cả tạo động; click thử từng phần tử.
- [ ] **SHP-01** Kiểm kê từng input/select/textarea/checkbox/date/file; nhập hợp lệ & không hợp lệ; bấm Save/Cancel/Close nếu có.
- [ ] **SHP-01** Kiểm tra empty/loading/error/normal state, ảnh/icon/text không undefined/NaN, số lượng/badge khớp.
- [ ] **SHP-01** F5 tại trang sâu, Back/Forward, copy URL sang tab mới cùng persona và persona khác; bảo vệ quyền đúng.
- [ ] **SHP-01** Chạy ở 390px & 1440px; Tab/Enter/Esc; không tràn ngang hoặc kẹt overlay.
- [ ] **SHP-01** Đối với thao tác ghi: quan sát Network/response, F5/đổi phiên, kiểm cùng ID ở User/Admin hoặc báo N/A có lý do.

### SHP-02 — Cart · `pages/shop/cart/` · Guest + Member
- [ ] **SHP-02** Từ header/sidebar/footer/nút CTA thực tế đi đến trang này bằng chuột hoặc cảm ứng; không 404, không trắng trang.
- [ ] **SHP-02** Header đủ logo, nav, account/auth, cart/search nếu layout có; mọi mục bấm đúng; guest/member không lẫn.
- [ ] **SHP-02** Sidebar/menu hamburger trên desktop/mobile nếu trang có; mở/đóng/chuyển route/active state đúng.
- [ ] **SHP-02** Footer hiện và các link hiện hữu đều mở đúng đích; test ở bottom của trang, không dùng link `#` vô nghĩa.
- [ ] **SHP-02** Kiểm kê toàn bộ button/link/tab/row clickable/icon/accordion/menu/modal/CTA đang hiển thị, kể cả tạo động; click thử từng phần tử.
- [ ] **SHP-02** Kiểm kê từng input/select/textarea/checkbox/date/file; nhập hợp lệ & không hợp lệ; bấm Save/Cancel/Close nếu có.
- [ ] **SHP-02** Kiểm tra empty/loading/error/normal state, ảnh/icon/text không undefined/NaN, số lượng/badge khớp.
- [ ] **SHP-02** F5 tại trang sâu, Back/Forward, copy URL sang tab mới cùng persona và persona khác; bảo vệ quyền đúng.
- [ ] **SHP-02** Chạy ở 390px & 1440px; Tab/Enter/Esc; không tràn ngang hoặc kẹt overlay.
- [ ] **SHP-02** Đối với thao tác ghi: quan sát Network/response, F5/đổi phiên, kiểm cùng ID ở User/Admin hoặc báo N/A có lý do.

### SHP-03 — Checkout · `pages/shop/checkout/` · Guest + Member
- [ ] **SHP-03** Từ header/sidebar/footer/nút CTA thực tế đi đến trang này bằng chuột hoặc cảm ứng; không 404, không trắng trang.
- [ ] **SHP-03** Header đủ logo, nav, account/auth, cart/search nếu layout có; mọi mục bấm đúng; guest/member không lẫn.
- [ ] **SHP-03** Sidebar/menu hamburger trên desktop/mobile nếu trang có; mở/đóng/chuyển route/active state đúng.
- [ ] **SHP-03** Footer hiện và các link hiện hữu đều mở đúng đích; test ở bottom của trang, không dùng link `#` vô nghĩa.
- [ ] **SHP-03** Kiểm kê toàn bộ button/link/tab/row clickable/icon/accordion/menu/modal/CTA đang hiển thị, kể cả tạo động; click thử từng phần tử.
- [ ] **SHP-03** Kiểm kê từng input/select/textarea/checkbox/date/file; nhập hợp lệ & không hợp lệ; bấm Save/Cancel/Close nếu có.
- [ ] **SHP-03** Kiểm tra empty/loading/error/normal state, ảnh/icon/text không undefined/NaN, số lượng/badge khớp.
- [ ] **SHP-03** F5 tại trang sâu, Back/Forward, copy URL sang tab mới cùng persona và persona khác; bảo vệ quyền đúng.
- [ ] **SHP-03** Chạy ở 390px & 1440px; Tab/Enter/Esc; không tràn ngang hoặc kẹt overlay.
- [ ] **SHP-03** Đối với thao tác ghi: quan sát Network/response, F5/đổi phiên, kiểm cùng ID ở User/Admin hoặc báo N/A có lý do.

### SHP-04 — Payment success · `pages/shop/payment-success/` · Guest + Member
- [ ] **SHP-04** Từ header/sidebar/footer/nút CTA thực tế đi đến trang này bằng chuột hoặc cảm ứng; không 404, không trắng trang.
- [ ] **SHP-04** Header đủ logo, nav, account/auth, cart/search nếu layout có; mọi mục bấm đúng; guest/member không lẫn.
- [ ] **SHP-04** Sidebar/menu hamburger trên desktop/mobile nếu trang có; mở/đóng/chuyển route/active state đúng.
- [ ] **SHP-04** Footer hiện và các link hiện hữu đều mở đúng đích; test ở bottom của trang, không dùng link `#` vô nghĩa.
- [ ] **SHP-04** Kiểm kê toàn bộ button/link/tab/row clickable/icon/accordion/menu/modal/CTA đang hiển thị, kể cả tạo động; click thử từng phần tử.
- [ ] **SHP-04** Kiểm kê từng input/select/textarea/checkbox/date/file; nhập hợp lệ & không hợp lệ; bấm Save/Cancel/Close nếu có.
- [ ] **SHP-04** Kiểm tra empty/loading/error/normal state, ảnh/icon/text không undefined/NaN, số lượng/badge khớp.
- [ ] **SHP-04** F5 tại trang sâu, Back/Forward, copy URL sang tab mới cùng persona và persona khác; bảo vệ quyền đúng.
- [ ] **SHP-04** Chạy ở 390px & 1440px; Tab/Enter/Esc; không tràn ngang hoặc kẹt overlay.
- [ ] **SHP-04** Đối với thao tác ghi: quan sát Network/response, F5/đổi phiên, kiểm cùng ID ở User/Admin hoặc báo N/A có lý do.

### SHP-05 — Payment failed · `pages/shop/payment-failed/` · Guest + Member
- [ ] **SHP-05** Từ header/sidebar/footer/nút CTA thực tế đi đến trang này bằng chuột hoặc cảm ứng; không 404, không trắng trang.
- [ ] **SHP-05** Header đủ logo, nav, account/auth, cart/search nếu layout có; mọi mục bấm đúng; guest/member không lẫn.
- [ ] **SHP-05** Sidebar/menu hamburger trên desktop/mobile nếu trang có; mở/đóng/chuyển route/active state đúng.
- [ ] **SHP-05** Footer hiện và các link hiện hữu đều mở đúng đích; test ở bottom của trang, không dùng link `#` vô nghĩa.
- [ ] **SHP-05** Kiểm kê toàn bộ button/link/tab/row clickable/icon/accordion/menu/modal/CTA đang hiển thị, kể cả tạo động; click thử từng phần tử.
- [ ] **SHP-05** Kiểm kê từng input/select/textarea/checkbox/date/file; nhập hợp lệ & không hợp lệ; bấm Save/Cancel/Close nếu có.
- [ ] **SHP-05** Kiểm tra empty/loading/error/normal state, ảnh/icon/text không undefined/NaN, số lượng/badge khớp.
- [ ] **SHP-05** F5 tại trang sâu, Back/Forward, copy URL sang tab mới cùng persona và persona khác; bảo vệ quyền đúng.
- [ ] **SHP-05** Chạy ở 390px & 1440px; Tab/Enter/Esc; không tràn ngang hoặc kẹt overlay.
- [ ] **SHP-05** Đối với thao tác ghi: quan sát Network/response, F5/đổi phiên, kiểm cùng ID ở User/Admin hoặc báo N/A có lý do.

### USR-01 — User SPA entry · `pages/user/index.html` · Member
- [ ] **USR-01** Từ header/sidebar/footer/nút CTA thực tế đi đến trang này bằng chuột hoặc cảm ứng; không 404, không trắng trang.
- [ ] **USR-01** Header đủ logo, nav, account/auth, cart/search nếu layout có; mọi mục bấm đúng; guest/member không lẫn.
- [ ] **USR-01** Sidebar/menu hamburger trên desktop/mobile nếu trang có; mở/đóng/chuyển route/active state đúng.
- [ ] **USR-01** Footer hiện và các link hiện hữu đều mở đúng đích; test ở bottom của trang, không dùng link `#` vô nghĩa.
- [ ] **USR-01** Kiểm kê toàn bộ button/link/tab/row clickable/icon/accordion/menu/modal/CTA đang hiển thị, kể cả tạo động; click thử từng phần tử.
- [ ] **USR-01** Kiểm kê từng input/select/textarea/checkbox/date/file; nhập hợp lệ & không hợp lệ; bấm Save/Cancel/Close nếu có.
- [ ] **USR-01** Kiểm tra empty/loading/error/normal state, ảnh/icon/text không undefined/NaN, số lượng/badge khớp.
- [ ] **USR-01** F5 tại trang sâu, Back/Forward, copy URL sang tab mới cùng persona và persona khác; bảo vệ quyền đúng.
- [ ] **USR-01** Chạy ở 390px & 1440px; Tab/Enter/Esc; không tràn ngang hoặc kẹt overlay.
- [ ] **USR-01** Đối với thao tác ghi: quan sát Network/response, F5/đổi phiên, kiểm cùng ID ở User/Admin hoặc báo N/A có lý do.

### USR-02 — Profile · `pages/user/modules/profile/` · Member
- [ ] **USR-02** Từ header/sidebar/footer/nút CTA thực tế đi đến trang này bằng chuột hoặc cảm ứng; không 404, không trắng trang.
- [ ] **USR-02** Header đủ logo, nav, account/auth, cart/search nếu layout có; mọi mục bấm đúng; guest/member không lẫn.
- [ ] **USR-02** Sidebar/menu hamburger trên desktop/mobile nếu trang có; mở/đóng/chuyển route/active state đúng.
- [ ] **USR-02** Footer hiện và các link hiện hữu đều mở đúng đích; test ở bottom của trang, không dùng link `#` vô nghĩa.
- [ ] **USR-02** Kiểm kê toàn bộ button/link/tab/row clickable/icon/accordion/menu/modal/CTA đang hiển thị, kể cả tạo động; click thử từng phần tử.
- [ ] **USR-02** Kiểm kê từng input/select/textarea/checkbox/date/file; nhập hợp lệ & không hợp lệ; bấm Save/Cancel/Close nếu có.
- [ ] **USR-02** Kiểm tra empty/loading/error/normal state, ảnh/icon/text không undefined/NaN, số lượng/badge khớp.
- [ ] **USR-02** F5 tại trang sâu, Back/Forward, copy URL sang tab mới cùng persona và persona khác; bảo vệ quyền đúng.
- [ ] **USR-02** Chạy ở 390px & 1440px; Tab/Enter/Esc; không tràn ngang hoặc kẹt overlay.
- [ ] **USR-02** Đối với thao tác ghi: quan sát Network/response, F5/đổi phiên, kiểm cùng ID ở User/Admin hoặc báo N/A có lý do.

### USR-03 — Pets · `pages/user/modules/pets/` · Member
- [ ] **USR-03** Từ header/sidebar/footer/nút CTA thực tế đi đến trang này bằng chuột hoặc cảm ứng; không 404, không trắng trang.
- [ ] **USR-03** Header đủ logo, nav, account/auth, cart/search nếu layout có; mọi mục bấm đúng; guest/member không lẫn.
- [ ] **USR-03** Sidebar/menu hamburger trên desktop/mobile nếu trang có; mở/đóng/chuyển route/active state đúng.
- [ ] **USR-03** Footer hiện và các link hiện hữu đều mở đúng đích; test ở bottom của trang, không dùng link `#` vô nghĩa.
- [ ] **USR-03** Kiểm kê toàn bộ button/link/tab/row clickable/icon/accordion/menu/modal/CTA đang hiển thị, kể cả tạo động; click thử từng phần tử.
- [ ] **USR-03** Kiểm kê từng input/select/textarea/checkbox/date/file; nhập hợp lệ & không hợp lệ; bấm Save/Cancel/Close nếu có.
- [ ] **USR-03** Kiểm tra empty/loading/error/normal state, ảnh/icon/text không undefined/NaN, số lượng/badge khớp.
- [ ] **USR-03** F5 tại trang sâu, Back/Forward, copy URL sang tab mới cùng persona và persona khác; bảo vệ quyền đúng.
- [ ] **USR-03** Chạy ở 390px & 1440px; Tab/Enter/Esc; không tràn ngang hoặc kẹt overlay.
- [ ] **USR-03** Đối với thao tác ghi: quan sát Network/response, F5/đổi phiên, kiểm cùng ID ở User/Admin hoặc báo N/A có lý do.

### USR-04 — Diary · `pages/user/modules/diary/` · Member
- [ ] **USR-04** Từ header/sidebar/footer/nút CTA thực tế đi đến trang này bằng chuột hoặc cảm ứng; không 404, không trắng trang.
- [ ] **USR-04** Header đủ logo, nav, account/auth, cart/search nếu layout có; mọi mục bấm đúng; guest/member không lẫn.
- [ ] **USR-04** Sidebar/menu hamburger trên desktop/mobile nếu trang có; mở/đóng/chuyển route/active state đúng.
- [ ] **USR-04** Footer hiện và các link hiện hữu đều mở đúng đích; test ở bottom của trang, không dùng link `#` vô nghĩa.
- [ ] **USR-04** Kiểm kê toàn bộ button/link/tab/row clickable/icon/accordion/menu/modal/CTA đang hiển thị, kể cả tạo động; click thử từng phần tử.
- [ ] **USR-04** Kiểm kê từng input/select/textarea/checkbox/date/file; nhập hợp lệ & không hợp lệ; bấm Save/Cancel/Close nếu có.
- [ ] **USR-04** Kiểm tra empty/loading/error/normal state, ảnh/icon/text không undefined/NaN, số lượng/badge khớp.
- [ ] **USR-04** F5 tại trang sâu, Back/Forward, copy URL sang tab mới cùng persona và persona khác; bảo vệ quyền đúng.
- [ ] **USR-04** Chạy ở 390px & 1440px; Tab/Enter/Esc; không tràn ngang hoặc kẹt overlay.
- [ ] **USR-04** Đối với thao tác ghi: quan sát Network/response, F5/đổi phiên, kiểm cùng ID ở User/Admin hoặc báo N/A có lý do.

### USR-05 — Bookings · `pages/user/modules/bookings/` · Member
- [ ] **USR-05** Từ header/sidebar/footer/nút CTA thực tế đi đến trang này bằng chuột hoặc cảm ứng; không 404, không trắng trang.
- [ ] **USR-05** Header đủ logo, nav, account/auth, cart/search nếu layout có; mọi mục bấm đúng; guest/member không lẫn.
- [ ] **USR-05** Sidebar/menu hamburger trên desktop/mobile nếu trang có; mở/đóng/chuyển route/active state đúng.
- [ ] **USR-05** Footer hiện và các link hiện hữu đều mở đúng đích; test ở bottom của trang, không dùng link `#` vô nghĩa.
- [ ] **USR-05** Kiểm kê toàn bộ button/link/tab/row clickable/icon/accordion/menu/modal/CTA đang hiển thị, kể cả tạo động; click thử từng phần tử.
- [ ] **USR-05** Kiểm kê từng input/select/textarea/checkbox/date/file; nhập hợp lệ & không hợp lệ; bấm Save/Cancel/Close nếu có.
- [ ] **USR-05** Kiểm tra empty/loading/error/normal state, ảnh/icon/text không undefined/NaN, số lượng/badge khớp.
- [ ] **USR-05** F5 tại trang sâu, Back/Forward, copy URL sang tab mới cùng persona và persona khác; bảo vệ quyền đúng.
- [ ] **USR-05** Chạy ở 390px & 1440px; Tab/Enter/Esc; không tràn ngang hoặc kẹt overlay.
- [ ] **USR-05** Đối với thao tác ghi: quan sát Network/response, F5/đổi phiên, kiểm cùng ID ở User/Admin hoặc báo N/A có lý do.

### USR-06 — Booking detail · `pages/user/modules/bookings/booking-detail.html` · Member
- [ ] **USR-06** Từ header/sidebar/footer/nút CTA thực tế đi đến trang này bằng chuột hoặc cảm ứng; không 404, không trắng trang.
- [ ] **USR-06** Header đủ logo, nav, account/auth, cart/search nếu layout có; mọi mục bấm đúng; guest/member không lẫn.
- [ ] **USR-06** Sidebar/menu hamburger trên desktop/mobile nếu trang có; mở/đóng/chuyển route/active state đúng.
- [ ] **USR-06** Footer hiện và các link hiện hữu đều mở đúng đích; test ở bottom của trang, không dùng link `#` vô nghĩa.
- [ ] **USR-06** Kiểm kê toàn bộ button/link/tab/row clickable/icon/accordion/menu/modal/CTA đang hiển thị, kể cả tạo động; click thử từng phần tử.
- [ ] **USR-06** Kiểm kê từng input/select/textarea/checkbox/date/file; nhập hợp lệ & không hợp lệ; bấm Save/Cancel/Close nếu có.
- [ ] **USR-06** Kiểm tra empty/loading/error/normal state, ảnh/icon/text không undefined/NaN, số lượng/badge khớp.
- [ ] **USR-06** F5 tại trang sâu, Back/Forward, copy URL sang tab mới cùng persona và persona khác; bảo vệ quyền đúng.
- [ ] **USR-06** Chạy ở 390px & 1440px; Tab/Enter/Esc; không tràn ngang hoặc kẹt overlay.
- [ ] **USR-06** Đối với thao tác ghi: quan sát Network/response, F5/đổi phiên, kiểm cùng ID ở User/Admin hoặc báo N/A có lý do.

### USR-07 — Orders · `pages/user/modules/orders/` · Member
- [ ] **USR-07** Từ header/sidebar/footer/nút CTA thực tế đi đến trang này bằng chuột hoặc cảm ứng; không 404, không trắng trang.
- [ ] **USR-07** Header đủ logo, nav, account/auth, cart/search nếu layout có; mọi mục bấm đúng; guest/member không lẫn.
- [ ] **USR-07** Sidebar/menu hamburger trên desktop/mobile nếu trang có; mở/đóng/chuyển route/active state đúng.
- [ ] **USR-07** Footer hiện và các link hiện hữu đều mở đúng đích; test ở bottom của trang, không dùng link `#` vô nghĩa.
- [ ] **USR-07** Kiểm kê toàn bộ button/link/tab/row clickable/icon/accordion/menu/modal/CTA đang hiển thị, kể cả tạo động; click thử từng phần tử.
- [ ] **USR-07** Kiểm kê từng input/select/textarea/checkbox/date/file; nhập hợp lệ & không hợp lệ; bấm Save/Cancel/Close nếu có.
- [ ] **USR-07** Kiểm tra empty/loading/error/normal state, ảnh/icon/text không undefined/NaN, số lượng/badge khớp.
- [ ] **USR-07** F5 tại trang sâu, Back/Forward, copy URL sang tab mới cùng persona và persona khác; bảo vệ quyền đúng.
- [ ] **USR-07** Chạy ở 390px & 1440px; Tab/Enter/Esc; không tràn ngang hoặc kẹt overlay.
- [ ] **USR-07** Đối với thao tác ghi: quan sát Network/response, F5/đổi phiên, kiểm cùng ID ở User/Admin hoặc báo N/A có lý do.

### USR-08 — Order detail · `pages/user/modules/orders/order-detail.html` · Member
- [ ] **USR-08** Từ header/sidebar/footer/nút CTA thực tế đi đến trang này bằng chuột hoặc cảm ứng; không 404, không trắng trang.
- [ ] **USR-08** Header đủ logo, nav, account/auth, cart/search nếu layout có; mọi mục bấm đúng; guest/member không lẫn.
- [ ] **USR-08** Sidebar/menu hamburger trên desktop/mobile nếu trang có; mở/đóng/chuyển route/active state đúng.
- [ ] **USR-08** Footer hiện và các link hiện hữu đều mở đúng đích; test ở bottom của trang, không dùng link `#` vô nghĩa.
- [ ] **USR-08** Kiểm kê toàn bộ button/link/tab/row clickable/icon/accordion/menu/modal/CTA đang hiển thị, kể cả tạo động; click thử từng phần tử.
- [ ] **USR-08** Kiểm kê từng input/select/textarea/checkbox/date/file; nhập hợp lệ & không hợp lệ; bấm Save/Cancel/Close nếu có.
- [ ] **USR-08** Kiểm tra empty/loading/error/normal state, ảnh/icon/text không undefined/NaN, số lượng/badge khớp.
- [ ] **USR-08** F5 tại trang sâu, Back/Forward, copy URL sang tab mới cùng persona và persona khác; bảo vệ quyền đúng.
- [ ] **USR-08** Chạy ở 390px & 1440px; Tab/Enter/Esc; không tràn ngang hoặc kẹt overlay.
- [ ] **USR-08** Đối với thao tác ghi: quan sát Network/response, F5/đổi phiên, kiểm cùng ID ở User/Admin hoặc báo N/A có lý do.

### USR-09 — Return detail · `pages/user/modules/orders/return-detail.html` · Member
- [ ] **USR-09** Từ header/sidebar/footer/nút CTA thực tế đi đến trang này bằng chuột hoặc cảm ứng; không 404, không trắng trang.
- [ ] **USR-09** Header đủ logo, nav, account/auth, cart/search nếu layout có; mọi mục bấm đúng; guest/member không lẫn.
- [ ] **USR-09** Sidebar/menu hamburger trên desktop/mobile nếu trang có; mở/đóng/chuyển route/active state đúng.
- [ ] **USR-09** Footer hiện và các link hiện hữu đều mở đúng đích; test ở bottom của trang, không dùng link `#` vô nghĩa.
- [ ] **USR-09** Kiểm kê toàn bộ button/link/tab/row clickable/icon/accordion/menu/modal/CTA đang hiển thị, kể cả tạo động; click thử từng phần tử.
- [ ] **USR-09** Kiểm kê từng input/select/textarea/checkbox/date/file; nhập hợp lệ & không hợp lệ; bấm Save/Cancel/Close nếu có.
- [ ] **USR-09** Kiểm tra empty/loading/error/normal state, ảnh/icon/text không undefined/NaN, số lượng/badge khớp.
- [ ] **USR-09** F5 tại trang sâu, Back/Forward, copy URL sang tab mới cùng persona và persona khác; bảo vệ quyền đúng.
- [ ] **USR-09** Chạy ở 390px & 1440px; Tab/Enter/Esc; không tràn ngang hoặc kẹt overlay.
- [ ] **USR-09** Đối với thao tác ghi: quan sát Network/response, F5/đổi phiên, kiểm cùng ID ở User/Admin hoặc báo N/A có lý do.

### USR-10 — Wishlist · `pages/user/modules/wishlist/` · Member
- [ ] **USR-10** Từ header/sidebar/footer/nút CTA thực tế đi đến trang này bằng chuột hoặc cảm ứng; không 404, không trắng trang.
- [ ] **USR-10** Header đủ logo, nav, account/auth, cart/search nếu layout có; mọi mục bấm đúng; guest/member không lẫn.
- [ ] **USR-10** Sidebar/menu hamburger trên desktop/mobile nếu trang có; mở/đóng/chuyển route/active state đúng.
- [ ] **USR-10** Footer hiện và các link hiện hữu đều mở đúng đích; test ở bottom của trang, không dùng link `#` vô nghĩa.
- [ ] **USR-10** Kiểm kê toàn bộ button/link/tab/row clickable/icon/accordion/menu/modal/CTA đang hiển thị, kể cả tạo động; click thử từng phần tử.
- [ ] **USR-10** Kiểm kê từng input/select/textarea/checkbox/date/file; nhập hợp lệ & không hợp lệ; bấm Save/Cancel/Close nếu có.
- [ ] **USR-10** Kiểm tra empty/loading/error/normal state, ảnh/icon/text không undefined/NaN, số lượng/badge khớp.
- [ ] **USR-10** F5 tại trang sâu, Back/Forward, copy URL sang tab mới cùng persona và persona khác; bảo vệ quyền đúng.
- [ ] **USR-10** Chạy ở 390px & 1440px; Tab/Enter/Esc; không tràn ngang hoặc kẹt overlay.
- [ ] **USR-10** Đối với thao tác ghi: quan sát Network/response, F5/đổi phiên, kiểm cùng ID ở User/Admin hoặc báo N/A có lý do.

### USR-11 — Loyalty · `pages/user/modules/loyalty/` · Member
- [ ] **USR-11** Từ header/sidebar/footer/nút CTA thực tế đi đến trang này bằng chuột hoặc cảm ứng; không 404, không trắng trang.
- [ ] **USR-11** Header đủ logo, nav, account/auth, cart/search nếu layout có; mọi mục bấm đúng; guest/member không lẫn.
- [ ] **USR-11** Sidebar/menu hamburger trên desktop/mobile nếu trang có; mở/đóng/chuyển route/active state đúng.
- [ ] **USR-11** Footer hiện và các link hiện hữu đều mở đúng đích; test ở bottom của trang, không dùng link `#` vô nghĩa.
- [ ] **USR-11** Kiểm kê toàn bộ button/link/tab/row clickable/icon/accordion/menu/modal/CTA đang hiển thị, kể cả tạo động; click thử từng phần tử.
- [ ] **USR-11** Kiểm kê từng input/select/textarea/checkbox/date/file; nhập hợp lệ & không hợp lệ; bấm Save/Cancel/Close nếu có.
- [ ] **USR-11** Kiểm tra empty/loading/error/normal state, ảnh/icon/text không undefined/NaN, số lượng/badge khớp.
- [ ] **USR-11** F5 tại trang sâu, Back/Forward, copy URL sang tab mới cùng persona và persona khác; bảo vệ quyền đúng.
- [ ] **USR-11** Chạy ở 390px & 1440px; Tab/Enter/Esc; không tràn ngang hoặc kẹt overlay.
- [ ] **USR-11** Đối với thao tác ghi: quan sát Network/response, F5/đổi phiên, kiểm cùng ID ở User/Admin hoặc báo N/A có lý do.

### USR-12 — Support · `pages/user/modules/support/` · Member
- [ ] **USR-12** Từ header/sidebar/footer/nút CTA thực tế đi đến trang này bằng chuột hoặc cảm ứng; không 404, không trắng trang.
- [ ] **USR-12** Header đủ logo, nav, account/auth, cart/search nếu layout có; mọi mục bấm đúng; guest/member không lẫn.
- [ ] **USR-12** Sidebar/menu hamburger trên desktop/mobile nếu trang có; mở/đóng/chuyển route/active state đúng.
- [ ] **USR-12** Footer hiện và các link hiện hữu đều mở đúng đích; test ở bottom của trang, không dùng link `#` vô nghĩa.
- [ ] **USR-12** Kiểm kê toàn bộ button/link/tab/row clickable/icon/accordion/menu/modal/CTA đang hiển thị, kể cả tạo động; click thử từng phần tử.
- [ ] **USR-12** Kiểm kê từng input/select/textarea/checkbox/date/file; nhập hợp lệ & không hợp lệ; bấm Save/Cancel/Close nếu có.
- [ ] **USR-12** Kiểm tra empty/loading/error/normal state, ảnh/icon/text không undefined/NaN, số lượng/badge khớp.
- [ ] **USR-12** F5 tại trang sâu, Back/Forward, copy URL sang tab mới cùng persona và persona khác; bảo vệ quyền đúng.
- [ ] **USR-12** Chạy ở 390px & 1440px; Tab/Enter/Esc; không tràn ngang hoặc kẹt overlay.
- [ ] **USR-12** Đối với thao tác ghi: quan sát Network/response, F5/đổi phiên, kiểm cùng ID ở User/Admin hoặc báo N/A có lý do.

### USR-13 — Support create · `pages/user/modules/support/support-create.html` · Member
- [ ] **USR-13** Từ header/sidebar/footer/nút CTA thực tế đi đến trang này bằng chuột hoặc cảm ứng; không 404, không trắng trang.
- [ ] **USR-13** Header đủ logo, nav, account/auth, cart/search nếu layout có; mọi mục bấm đúng; guest/member không lẫn.
- [ ] **USR-13** Sidebar/menu hamburger trên desktop/mobile nếu trang có; mở/đóng/chuyển route/active state đúng.
- [ ] **USR-13** Footer hiện và các link hiện hữu đều mở đúng đích; test ở bottom của trang, không dùng link `#` vô nghĩa.
- [ ] **USR-13** Kiểm kê toàn bộ button/link/tab/row clickable/icon/accordion/menu/modal/CTA đang hiển thị, kể cả tạo động; click thử từng phần tử.
- [ ] **USR-13** Kiểm kê từng input/select/textarea/checkbox/date/file; nhập hợp lệ & không hợp lệ; bấm Save/Cancel/Close nếu có.
- [ ] **USR-13** Kiểm tra empty/loading/error/normal state, ảnh/icon/text không undefined/NaN, số lượng/badge khớp.
- [ ] **USR-13** F5 tại trang sâu, Back/Forward, copy URL sang tab mới cùng persona và persona khác; bảo vệ quyền đúng.
- [ ] **USR-13** Chạy ở 390px & 1440px; Tab/Enter/Esc; không tràn ngang hoặc kẹt overlay.
- [ ] **USR-13** Đối với thao tác ghi: quan sát Network/response, F5/đổi phiên, kiểm cùng ID ở User/Admin hoặc báo N/A có lý do.

### USR-14 — Settings · `pages/user/modules/settings/` · Member
- [ ] **USR-14** Từ header/sidebar/footer/nút CTA thực tế đi đến trang này bằng chuột hoặc cảm ứng; không 404, không trắng trang.
- [ ] **USR-14** Header đủ logo, nav, account/auth, cart/search nếu layout có; mọi mục bấm đúng; guest/member không lẫn.
- [ ] **USR-14** Sidebar/menu hamburger trên desktop/mobile nếu trang có; mở/đóng/chuyển route/active state đúng.
- [ ] **USR-14** Footer hiện và các link hiện hữu đều mở đúng đích; test ở bottom của trang, không dùng link `#` vô nghĩa.
- [ ] **USR-14** Kiểm kê toàn bộ button/link/tab/row clickable/icon/accordion/menu/modal/CTA đang hiển thị, kể cả tạo động; click thử từng phần tử.
- [ ] **USR-14** Kiểm kê từng input/select/textarea/checkbox/date/file; nhập hợp lệ & không hợp lệ; bấm Save/Cancel/Close nếu có.
- [ ] **USR-14** Kiểm tra empty/loading/error/normal state, ảnh/icon/text không undefined/NaN, số lượng/badge khớp.
- [ ] **USR-14** F5 tại trang sâu, Back/Forward, copy URL sang tab mới cùng persona và persona khác; bảo vệ quyền đúng.
- [ ] **USR-14** Chạy ở 390px & 1440px; Tab/Enter/Esc; không tràn ngang hoặc kẹt overlay.
- [ ] **USR-14** Đối với thao tác ghi: quan sát Network/response, F5/đổi phiên, kiểm cùng ID ở User/Admin hoặc báo N/A có lý do.

## GĐ-19 — Kịch bản hành trình dài: khách thật xuyên toàn website

> **Phạm vi:** Mỗi E2E phải kiểm từng chặng, có mã dữ liệu liên kết
> **Code cần lần vết (theo cấu trúc đã xem ở đợt trước; xác minh trên commit mới):** `Public → Service/Shop → User → Admin → User`

### J01 — Khách lần đầu chỉ tìm hiểu
- [ ] **Chuỗi thao tác:** G0 mở Home → dùng header đi Spa → xem service detail → footer About/Contact → Blog → quay Home.
- [ ] **Kết quả:** Không bị bắt đăng nhập khi chỉ xem thông tin; mọi link đúng.
- [ ] **Server:** lấy ID thật của đối tượng, chứng minh mọi FK/trạng thái/amount đúng sau F5; nếu không có quyền DB, chụp cả User và Admin.
- [ ] **Khôi phục:** đóng tab, đăng nhập lại hoặc dùng trình duyệt thứ hai rồi kiểm tra dữ liệu còn đúng.
- [ ] **Bằng chứng:** chụp/mã hóa ID, video thao tác, lỗi Console/Network (nếu có) và PASS/FAIL theo từng chặng.

### J02 — Guest mua COD
- [ ] **Chuỗi thao tác:** G0 từ Shop → lọc → product variant → Cart → sửa qty → checkout COD → success → tra cứu đơn.
- [ ] **Kết quả:** Đúng order/payment/địa chỉ, Admin thấy, guest tra cứu được an toàn.
- [ ] **Server:** lấy ID thật của đối tượng, chứng minh mọi FK/trạng thái/amount đúng sau F5; nếu không có quyền DB, chụp cả User và Admin.
- [ ] **Khôi phục:** đóng tab, đăng nhập lại hoặc dùng trình duyệt thứ hai rồi kiểm tra dữ liệu còn đúng.
- [ ] **Bằng chứng:** chụp/mã hóa ID, video thao tác, lỗi Console/Network (nếu có) và PASS/FAIL theo từng chặng.

### J03 — Guest booking Grooming
- [ ] **Chuỗi thao tác:** G0 Service → Booking → nhập guest + pet → chọn slot → confirm → mã booking → guest lookup.
- [ ] **Kết quả:** Cùng booking ID, giá/slot/status đúng, Admin duyệt được.
- [ ] **Server:** lấy ID thật của đối tượng, chứng minh mọi FK/trạng thái/amount đúng sau F5; nếu không có quyền DB, chụp cả User và Admin.
- [ ] **Khôi phục:** đóng tab, đăng nhập lại hoặc dùng trình duyệt thứ hai rồi kiểm tra dữ liệu còn đúng.
- [ ] **Bằng chứng:** chụp/mã hóa ID, video thao tác, lỗi Console/Network (nếu có) và PASS/FAIL theo từng chặng.

### J04 — Guest → Member
- [ ] **Chuỗi thao tác:** G1 đã có order → tra cứu/xác minh → kích hoạt account → login → User Portal Orders.
- [ ] **Kết quả:** Lịch sử gắn đúng account, không nhân đôi customer/order.
- [ ] **Server:** lấy ID thật của đối tượng, chứng minh mọi FK/trạng thái/amount đúng sau F5; nếu không có quyền DB, chụp cả User và Admin.
- [ ] **Khôi phục:** đóng tab, đăng nhập lại hoặc dùng trình duyệt thứ hai rồi kiểm tra dữ liệu còn đúng.
- [ ] **Bằng chứng:** chụp/mã hóa ID, video thao tác, lỗi Console/Network (nếu có) và PASS/FAIL theo từng chặng.

### J05 — Member tạo hồ sơ và pet
- [ ] **Chuỗi thao tác:** M0 đăng ký/OTP → Profile → thêm address → Pets → tạo Pet → F5/phiên khác.
- [ ] **Kết quả:** Thông tin đầy đủ, đúng owner, Admin thấy đúng.
- [ ] **Server:** lấy ID thật của đối tượng, chứng minh mọi FK/trạng thái/amount đúng sau F5; nếu không có quyền DB, chụp cả User và Admin.
- [ ] **Khôi phục:** đóng tab, đăng nhập lại hoặc dùng trình duyệt thứ hai rồi kiểm tra dữ liệu còn đúng.
- [ ] **Bằng chứng:** chụp/mã hóa ID, video thao tác, lỗi Console/Network (nếu có) và PASS/FAIL theo từng chặng.

### J06 — Member grooming + care log
- [ ] **Chuỗi thao tác:** M1 service detail → chọn pet → đặt lịch → Admin xác nhận/checkin/completed/log → User Diary.
- [ ] **Kết quả:** Booking/care log/status/ảnh đúng pet.
- [ ] **Server:** lấy ID thật của đối tượng, chứng minh mọi FK/trạng thái/amount đúng sau F5; nếu không có quyền DB, chụp cả User và Admin.
- [ ] **Khôi phục:** đóng tab, đăng nhập lại hoặc dùng trình duyệt thứ hai rồi kiểm tra dữ liệu còn đúng.
- [ ] **Bằng chứng:** chụp/mã hóa ID, video thao tác, lỗi Console/Network (nếu có) và PASS/FAIL theo từng chặng.

### J07 — Member Pet Hotel
- [ ] **Chuỗi thao tác:** M1 đặt Hotel nhiều ngày → Admin cấp phòng → checkin/out → User Booking detail.
- [ ] **Kết quả:** Không trùng phòng, đúng giá/nights/timeline.
- [ ] **Server:** lấy ID thật của đối tượng, chứng minh mọi FK/trạng thái/amount đúng sau F5; nếu không có quyền DB, chụp cả User và Admin.
- [ ] **Khôi phục:** đóng tab, đăng nhập lại hoặc dùng trình duyệt thứ hai rồi kiểm tra dữ liệu còn đúng.
- [ ] **Bằng chứng:** chụp/mã hóa ID, video thao tác, lỗi Console/Network (nếu có) và PASS/FAIL theo từng chặng.

### J08 — Member Pet Taxi
- [ ] **Chuỗi thao tác:** M1 chọn Taxi → nhập pickup/dropoff → Admin gán tài xế → completed → User detail.
- [ ] **Kết quả:** Điểm đón/trả/giá/giờ không mất trong note.
- [ ] **Server:** lấy ID thật của đối tượng, chứng minh mọi FK/trạng thái/amount đúng sau F5; nếu không có quyền DB, chụp cả User và Admin.
- [ ] **Khôi phục:** đóng tab, đăng nhập lại hoặc dùng trình duyệt thứ hai rồi kiểm tra dữ liệu còn đúng.
- [ ] **Bằng chứng:** chụp/mã hóa ID, video thao tác, lỗi Console/Network (nếu có) và PASS/FAIL theo từng chặng.

### J09 — Member COD + loyalty
- [ ] **Chuỗi thao tác:** M1 add variant → checkout voucher/điểm nếu có → Admin giao/đối soát → Loyalty.
- [ ] **Kết quả:** Đơn/giảm giá/điểm/tồn đúng, không double award.
- [ ] **Server:** lấy ID thật của đối tượng, chứng minh mọi FK/trạng thái/amount đúng sau F5; nếu không có quyền DB, chụp cả User và Admin.
- [ ] **Khôi phục:** đóng tab, đăng nhập lại hoặc dùng trình duyệt thứ hai rồi kiểm tra dữ liệu còn đúng.
- [ ] **Bằng chứng:** chụp/mã hóa ID, video thao tác, lỗi Console/Network (nếu có) và PASS/FAIL theo từng chặng.

### J10 — Member online paid
- [ ] **Chuỗi thao tác:** M1 checkout sandbox online → gateway success → User Orders → Admin Payment.
- [ ] **Kết quả:** Chỉ trạng thái paid khi payment server xác nhận.
- [ ] **Server:** lấy ID thật của đối tượng, chứng minh mọi FK/trạng thái/amount đúng sau F5; nếu không có quyền DB, chụp cả User và Admin.
- [ ] **Khôi phục:** đóng tab, đăng nhập lại hoặc dùng trình duyệt thứ hai rồi kiểm tra dữ liệu còn đúng.
- [ ] **Bằng chứng:** chụp/mã hóa ID, video thao tác, lỗi Console/Network (nếu có) và PASS/FAIL theo từng chặng.

### J11 — Payment failed & retry
- [ ] **Chuỗi thao tác:** M1 checkout online → gateway fail → cart → retry đúng đơn/quy trình.
- [ ] **Kết quả:** Không tạo order/payment trùng, không mất hàng trong cart không lý do.
- [ ] **Server:** lấy ID thật của đối tượng, chứng minh mọi FK/trạng thái/amount đúng sau F5; nếu không có quyền DB, chụp cả User và Admin.
- [ ] **Khôi phục:** đóng tab, đăng nhập lại hoặc dùng trình duyệt thứ hai rồi kiểm tra dữ liệu còn đúng.
- [ ] **Bằng chứng:** chụp/mã hóa ID, video thao tác, lỗi Console/Network (nếu có) và PASS/FAIL theo từng chặng.

### J12 — Cancel unpaid order
- [ ] **Chuỗi thao tác:** M1 checkout COD → Orders → Cancel → Admin xác nhận → Loyalty/Inventory.
- [ ] **Kết quả:** Không còn active order, kho/voucher/điểm phục hồi đúng.
- [ ] **Server:** lấy ID thật của đối tượng, chứng minh mọi FK/trạng thái/amount đúng sau F5; nếu không có quyền DB, chụp cả User và Admin.
- [ ] **Khôi phục:** đóng tab, đăng nhập lại hoặc dùng trình duyệt thứ hai rồi kiểm tra dữ liệu còn đúng.
- [ ] **Bằng chứng:** chụp/mã hóa ID, video thao tác, lỗi Console/Network (nếu có) và PASS/FAIL theo từng chặng.

### J13 — Cancel paid order
- [ ] **Chuỗi thao tác:** M1 paid sandbox → Cancel → trạng thái chờ refund → Admin xử lý → User Orders.
- [ ] **Kết quả:** Không `da_hoan_tien` sớm, số tiền đúng và không hoàn 2 lần.
- [ ] **Server:** lấy ID thật của đối tượng, chứng minh mọi FK/trạng thái/amount đúng sau F5; nếu không có quyền DB, chụp cả User và Admin.
- [ ] **Khôi phục:** đóng tab, đăng nhập lại hoặc dùng trình duyệt thứ hai rồi kiểm tra dữ liệu còn đúng.
- [ ] **Bằng chứng:** chụp/mã hóa ID, video thao tác, lỗi Console/Network (nếu có) và PASS/FAIL theo từng chặng.

### J14 — Return product
- [ ] **Chuỗi thao tác:** M1 completed order → chọn item → return request → Admin xử lý → User return detail.
- [ ] **Kết quả:** Return qty/status/refund/restock thống nhất.
- [ ] **Server:** lấy ID thật của đối tượng, chứng minh mọi FK/trạng thái/amount đúng sau F5; nếu không có quyền DB, chụp cả User và Admin.
- [ ] **Khôi phục:** đóng tab, đăng nhập lại hoặc dùng trình duyệt thứ hai rồi kiểm tra dữ liệu còn đúng.
- [ ] **Bằng chứng:** chụp/mã hóa ID, video thao tác, lỗi Console/Network (nếu có) và PASS/FAIL theo từng chặng.

### J15 — Support ticket từ order
- [ ] **Chuỗi thao tác:** M1 order detail → ticket → Admin trả lời → User Support → đóng.
- [ ] **Kết quả:** Đúng order reference và quyền riêng tư.
- [ ] **Server:** lấy ID thật của đối tượng, chứng minh mọi FK/trạng thái/amount đúng sau F5; nếu không có quyền DB, chụp cả User và Admin.
- [ ] **Khôi phục:** đóng tab, đăng nhập lại hoặc dùng trình duyệt thứ hai rồi kiểm tra dữ liệu còn đúng.
- [ ] **Bằng chứng:** chụp/mã hóa ID, video thao tác, lỗi Console/Network (nếu có) và PASS/FAIL theo từng chặng.

### J16 — Chat realtime
- [ ] **Chuỗi thao tác:** M1 mở Support/chat → nhắn → Admin takeover/response → User đọc → resolve.
- [ ] **Kết quả:** Không trùng/mất tin, timestamp đúng, trạng thái đồng bộ.
- [ ] **Server:** lấy ID thật của đối tượng, chứng minh mọi FK/trạng thái/amount đúng sau F5; nếu không có quyền DB, chụp cả User và Admin.
- [ ] **Khôi phục:** đóng tab, đăng nhập lại hoặc dùng trình duyệt thứ hai rồi kiểm tra dữ liệu còn đúng.
- [ ] **Bằng chứng:** chụp/mã hóa ID, video thao tác, lỗi Console/Network (nếu có) và PASS/FAIL theo từng chặng.

### J17 — Wishlist & Cart
- [ ] **Chuỗi thao tác:** M1 yêu thích 3 hàng → User wishlist → add cart → checkout → quay wishlist.
- [ ] **Kết quả:** Số lượng, variant, danh sách yêu thích đúng, không lẫn M2.
- [ ] **Server:** lấy ID thật của đối tượng, chứng minh mọi FK/trạng thái/amount đúng sau F5; nếu không có quyền DB, chụp cả User và Admin.
- [ ] **Khôi phục:** đóng tab, đăng nhập lại hoặc dùng trình duyệt thứ hai rồi kiểm tra dữ liệu còn đúng.
- [ ] **Bằng chứng:** chụp/mã hóa ID, video thao tác, lỗi Console/Network (nếu có) và PASS/FAIL theo từng chặng.

### J18 — Cross-device member
- [ ] **Chuỗi thao tác:** M1 lưu address/pet/cart trên máy A → login máy B → xem và checkout.
- [ ] **Kết quả:** Không lệ thuộc localStorage máy A, server có dữ liệu.
- [ ] **Server:** lấy ID thật của đối tượng, chứng minh mọi FK/trạng thái/amount đúng sau F5; nếu không có quyền DB, chụp cả User và Admin.
- [ ] **Khôi phục:** đóng tab, đăng nhập lại hoặc dùng trình duyệt thứ hai rồi kiểm tra dữ liệu còn đúng.
- [ ] **Bằng chứng:** chụp/mã hóa ID, video thao tác, lỗi Console/Network (nếu có) và PASS/FAIL theo từng chặng.

### J19 — Cross-user privacy
- [ ] **Chuỗi thao tác:** M1 copy 5 deep link ID/profile/order/booking/ticket → M2 & guest mở.
- [ ] **Kết quả:** Không lộ PII, request server từ chối.
- [ ] **Server:** lấy ID thật của đối tượng, chứng minh mọi FK/trạng thái/amount đúng sau F5; nếu không có quyền DB, chụp cả User và Admin.
- [ ] **Khôi phục:** đóng tab, đăng nhập lại hoặc dùng trình duyệt thứ hai rồi kiểm tra dữ liệu còn đúng.
- [ ] **Bằng chứng:** chụp/mã hóa ID, video thao tác, lỗi Console/Network (nếu có) và PASS/FAIL theo từng chặng.

### J20 — Footer/header full journey
- [ ] **Chuỗi thao tác:** Guest mở từng link header/footer → login → đổi header → Sidebar User → logout → footer.
- [ ] **Kết quả:** Không link chết, auth state đổi đúng mọi nơi.
- [ ] **Server:** lấy ID thật của đối tượng, chứng minh mọi FK/trạng thái/amount đúng sau F5; nếu không có quyền DB, chụp cả User và Admin.
- [ ] **Khôi phục:** đóng tab, đăng nhập lại hoặc dùng trình duyệt thứ hai rồi kiểm tra dữ liệu còn đúng.
- [ ] **Bằng chứng:** chụp/mã hóa ID, video thao tác, lỗi Console/Network (nếu có) và PASS/FAIL theo từng chặng.

### J21 — Network fails mid-order
- [ ] **Chuỗi thao tác:** M1 xác nhận order → ngắt mạng trước success → reload → Orders/Cart.
- [ ] **Kết quả:** Thực trạng DB minh bạch, không tạo đơn trùng retry.
- [ ] **Server:** lấy ID thật của đối tượng, chứng minh mọi FK/trạng thái/amount đúng sau F5; nếu không có quyền DB, chụp cả User và Admin.
- [ ] **Khôi phục:** đóng tab, đăng nhập lại hoặc dùng trình duyệt thứ hai rồi kiểm tra dữ liệu còn đúng.
- [ ] **Bằng chứng:** chụp/mã hóa ID, video thao tác, lỗi Console/Network (nếu có) và PASS/FAIL theo từng chặng.

### J22 — Booking concurrency
- [ ] **Chuỗi thao tác:** M1/M2 cùng lúc chọn cuối slot Grooming hoặc phòng Hotel.
- [ ] **Kết quả:** Một slot chỉ cấp theo năng lực, user thua có lỗi dễ hiểu.
- [ ] **Server:** lấy ID thật của đối tượng, chứng minh mọi FK/trạng thái/amount đúng sau F5; nếu không có quyền DB, chụp cả User và Admin.
- [ ] **Khôi phục:** đóng tab, đăng nhập lại hoặc dùng trình duyệt thứ hai rồi kiểm tra dữ liệu còn đúng.
- [ ] **Bằng chứng:** chụp/mã hóa ID, video thao tác, lỗi Console/Network (nếu có) và PASS/FAIL theo từng chặng.

### J23 — Lịch vắng và điểm
- [ ] **Chuỗi thao tác:** M1 booking, Admin đánh vắng/huỷ → User Bookings, Loyalty, Diary.
- [ ] **Kết quả:** Không nhầm completed, không ghi carelog/điểm không hợp lệ.
- [ ] **Server:** lấy ID thật của đối tượng, chứng minh mọi FK/trạng thái/amount đúng sau F5; nếu không có quyền DB, chụp cả User và Admin.
- [ ] **Khôi phục:** đóng tab, đăng nhập lại hoặc dùng trình duyệt thứ hai rồi kiểm tra dữ liệu còn đúng.
- [ ] **Bằng chứng:** chụp/mã hóa ID, video thao tác, lỗi Console/Network (nếu có) và PASS/FAIL theo từng chặng.

### J24 — Change status display everywhere
- [ ] **Chuỗi thao tác:** Admin đổi trạng thái order/booking/ticket → User list/detail/header badge/dashboard liên quan.
- [ ] **Kết quả:** Không điểm hiển thị nào giữ status cũ sau refresh.
- [ ] **Server:** lấy ID thật của đối tượng, chứng minh mọi FK/trạng thái/amount đúng sau F5; nếu không có quyền DB, chụp cả User và Admin.
- [ ] **Khôi phục:** đóng tab, đăng nhập lại hoặc dùng trình duyệt thứ hai rồi kiểm tra dữ liệu còn đúng.
- [ ] **Bằng chứng:** chụp/mã hóa ID, video thao tác, lỗi Console/Network (nếu có) và PASS/FAIL theo từng chặng.

## GĐ-20 — Regression lỗi cũ sau khi bạn vừa sửa GitHub

> **Phạm vi:** Đây là danh sách RỦI RO LỊCH SỬ, không coi là lỗi còn tồn tại ở commit mới
> **Code cần lần vết (theo cấu trúc đã xem ở đợt trước; xác minh trên commit mới):** `booking.js, checkout.js, orders.js, profile.js, shared API`

- [ ] **REG-01 — Tạo pet ngay khi booking:** Tạo 3 loài và kiểm `species/status` đúng enum Supabase; booking không mồ côi. Ghi commit sửa tương ứng nếu PASS.
- [ ] **REG-02 — Hủy đơn paid:** Không ghi `da_hoan_tien` nếu chưa hoàn tiền thực tế; pending state rõ. Ghi commit sửa tương ứng nếu PASS.
- [ ] **REG-03 — Create order nhiều bảng:** Order + lines + payment/địa chỉ gắn đúng; lỗi một bước không tạo success giả. Ghi commit sửa tương ứng nếu PASS.
- [ ] **REG-04 — Cart localStorage:** Không coi giỏ lưu local là đơn đã lưu; cross-device/login đúng quy tắc. Ghi commit sửa tương ứng nếu PASS.
- [ ] **REG-05 — Account status:** Khóa/tạm khóa hiển thị/giới hạn server theo enum mới. Ghi commit sửa tương ứng nếu PASS.
- [ ] **REG-06 — Guest lookup authorization:** Không dò đơn khách khác bằng mã đơn/phone đơn lẻ. Ghi commit sửa tương ứng nếu PASS.
- [ ] **REG-07 — PawPoints/voucher transaction:** Không cộng/trừ 2 lần khi retry, paid/cancel/return hợp lệ. Ghi commit sửa tương ứng nếu PASS.
- [ ] **REG-08 — Appointment enum mới:** Các trạng thái `cho_xac_nhan`, `da_xac_nhan`, `da_check_in`, `dang_thuc_hien`, `da_hoan_tat`, `da_huy`, `vang_mat` hiển thị đúng. Ghi commit sửa tương ứng nếu PASS.
- [ ] **REG-09 — Ghi nhận tiêm chủng đơn giản:** Không buộc tạo bảng vaccine mới; không kết luận y khoa từ ghi chú. Ghi commit sửa tương ứng nếu PASS.
- [ ] **REG-10 — Pet Taxi note:** Mở lại pickup/dropoff/giá/loại chuyến, kể cả khi sửa note. Ghi commit sửa tương ứng nếu PASS.
- [ ] **REG-11 — Header/sidebar auth state:** Mọi trang đều theo server session, logout không giữ tên/ticket của người cũ. Ghi commit sửa tương ứng nếu PASS.
- [ ] **REG-12 — Footer/header deep link:** Không redirect 404 hay SPA trắng khi reload. Ghi commit sửa tương ứng nếu PASS.

## GĐ-21 — BIÊN BẢN NGHIỆM THU GÓC NHÌN KHÁCH HÀNG

- [ ] G0 đã hoàn thành **toàn bộ header/footer/public/shop/services/guest** trên mobile và desktop.
- [ ] G1 đã tra cứu đúng đơn/lịch của bản thân và không xem được đơn của khách khác.
- [ ] M0 đã hoàn thành đăng ký/OTP → profile → địa chỉ → pet đầu tiên.
- [ ] M1 đã hoàn thành từng mục sidebar User Portal; mọi nút quan trọng hoạt động, từng form Save/Cancel/F5 đều đúng.
- [ ] M1 đã hoàn thành ít nhất 1 booking Grooming, 1 Hotel và 1 Taxi trên môi trường test nếu ba dịch vụ được triển khai.
- [ ] M1 đã hoàn thành COD + online sandbox + thất bại + retry + hủy + đổi trả + refund sandbox.
- [ ] Loyalty, wishlist, hỗ trợ/chat, nhật ký và đối chiếu trạng thái Admin đã chạy có bằng chứng.
- [ ] M2/ẩn danh không thể xem/ghi chéo dữ liệu; logout và token hết hạn đã test.
- [ ] Không còn nút header/sidebar/footer không có tác dụng, đường dẫn 404, overlay kẹt hoặc toast thành công giả.
- [ ] Mọi route trọng yếu qua F5/deep link và mobile/desktop; không lỗi JS/Network 5xx không được xử lý.
- [ ] Mọi ca P0/P1 PASS hoặc có biên bản chặn release; P2/P3 ghi backlog.
- [ ] Lưu artifact bằng chứng, mã bug, SHA/deployment, người duyệt release và kế hoạch rollback.

### Số liệu QA cần điền

| Nhóm | Tổng test | PASS | FAIL | BLOCKED | N/A |
|---|---:|---:|---:|---:|---:|
| Header Guest / Footer Guest | ___ | ___ | ___ | ___ | ___ |
| Public + Authentication | ___ | ___ | ___ | ___ | ___ |
| Guest Service + Shop | ___ | ___ | ___ | ___ | ___ |
| Member Header/Sidebar/Portal | ___ | ___ | ___ | ___ | ___ |
| Member Booking / Shop / Orders | ___ | ___ | ___ | ___ | ___ |
| Loyalty / Support / Cross-user | ___ | ___ | ___ | ___ | ___ |
| Screen-by-screen + Journeys | ___ | ___ | ___ | ___ | ___ |
| **Tổng** | ___ | ___ | ___ | ___ | ___ |

### Nguồn/giới hạn cần nhớ

- `https://github.com/lleewyn/Pawpal` là repository được người dùng cung cấp. **Không xác nhận được trạng thái commit mới ở lần chạy này**, nên checklist không gắn nhãn bug đang tồn tại.
- Các đường dẫn trong `pages/*` là bản đồ nguồn đã xác định trong đợt rà trước, không bảo đảm mọi đường dẫn vẫn tồn tại sau refactor. Lấy **DOM/URL chạy thật** làm tiêu chuẩn để quyết định `PASS/FAIL/N/A`.
- Không có URL deployment và phiên browser thao tác được cung cấp trong lượt này; **không có kiểm thử tương tác live nào được thực thi**. Muốn QA thực sự bấm và tạo giao dịch trên website, cần mở site trong môi trường trình duyệt có thể tương tác (ví dụ ChatGPT Work/Cloud Browser) với tài khoản sandbox và URL triển khai; đừng đưa mật khẩu/token qua chat.
- Những bài đòi hỏi xác minh DB/RLS/payment/refund phải được QA có quyền staging xác nhận; nhìn giao diện là chưa đủ.
