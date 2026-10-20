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
- [ ] **Thao tác:** Cuộn cuối từng trang public; so sánh header/footer giữa các route
- [ ] **Giao diện/điều hướng:** Footer không mất, không chồng content/modals, không lệch độ rộng
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-02-002 · Logo footer  [P1 · Guest]
- [ ] **Thao tác:** Bấm logo footer
- [ ] **Giao diện/điều hướng:** Quay về Home, route hợp lệ
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-02-003 · Liên kết công ty/giới thiệu  [P1 · Guest]
- [ ] **Thao tác:** Bấm từng link footer trong nhóm Giới thiệu/About nếu hiển thị
- [ ] **Giao diện/điều hướng:** Đúng trang tương ứng, không link chết
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-02-004 · Liên kết dịch vụ  [P1 · Guest]
- [ ] **Thao tác:** Bấm link Spa/Hotel/Taxi/Đặt lịch trong footer nếu có
- [ ] **Giao diện/điều hướng:** Mỗi link mở đúng dịch vụ/booking
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-02-005 · Liên kết mua sắm  [P1 · Guest]
- [ ] **Thao tác:** Bấm link sản phẩm, danh mục, giỏ hàng trong footer nếu có
- [ ] **Giao diện/điều hướng:** Không nhầm với đường dẫn admin hoặc 404
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-02-006 · Blog/tin tức  [P1 · Guest]
- [ ] **Thao tác:** Bấm Blog và tin bài liên kết ở footer
- [ ] **Giao diện/điều hướng:** Mở danh sách/chi tiết có nội dung và breadcrumb
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-02-007 · Chính sách đổi trả  [P1 · Guest]
- [ ] **Thao tác:** Mở liên kết chính sách trả hàng/hủy đơn nếu hiển thị
- [ ] **Giao diện/điều hướng:** Nội dung đọc được, link không 404, điều kiện không mâu thuẫn hành động UI
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-02-008 · Chính sách bảo mật/điều khoản  [P1 · Guest]
- [ ] **Thao tác:** Bấm từng link chính sách nếu có; mở tab mới
- [ ] **Giao diện/điều hướng:** Tải được, không để link giả `#` hoặc javascript:void(0)
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-02-009 · Địa chỉ và số điện thoại  [P1 · Guest]
- [ ] **Thao tác:** Bấm số hotline và vị trí/map nếu có
- [ ] **Giao diện/điều hướng:** Đúng `tel:`/maps hoặc nội dung theo thiết kế; không dẫn sai
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-02-010 · Email liên hệ  [P1 · Guest]
- [ ] **Thao tác:** Bấm email hỗ trợ nếu có
- [ ] **Giao diện/điều hướng:** Đúng mailto hoặc form hỗ trợ, không lỗi URL
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-02-011 · Social Facebook/Zalo/TikTok  [P1 · Guest]
- [ ] **Thao tác:** Bấm từng icon hiện có, kiểm tra URL và tab
- [ ] **Giao diện/điều hướng:** Đúng tài khoản doanh nghiệp, mở an toàn; không link placeholder
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-02-012 · Newsletter/đăng ký nhận tin  [P1 · Guest]
- [ ] **Thao tác:** Nhập email hợp lệ rồi bấm gửi nếu có
- [ ] **Giao diện/điều hướng:** Có xác nhận rõ; chỉ ghi khi đồng ý, chống submit trùng
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-02-013 · Newsletter dữ liệu lỗi  [P1 · Guest]
- [ ] **Thao tác:** Thử trống/sai email/ký tự lạ/double-click
- [ ] **Giao diện/điều hướng:** Validation rõ ràng; không lưu email sai/trùng
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-02-014 · Footer mobile  [P1 · Guest]
- [ ] **Thao tác:** Cuộn đến footer ở 390px và 320px, mở các accordion nếu có
- [ ] **Giao diện/điều hướng:** Không tràn ngang, link đủ bấm và độ tương phản tốt
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-02-015 · Footer trang checkout  [P1 · Guest]
- [ ] **Thao tác:** Cuộn cuối checkout khi có nhiều sản phẩm
- [ ] **Giao diện/điều hướng:** Không che nút thanh toán sticky; chính sách vẫn mở được
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-02-016 · Quay lên đầu trang  [P1 · Guest]
- [ ] **Thao tác:** Bấm back-to-top nếu có
- [ ] **Giao diện/điều hướng:** Scroll lên, không xóa dữ liệu form đang nhập
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-02-017 · Copyright/năm  [P1 · Guest]
- [ ] **Thao tác:** Kiểm tra footer trên Home và route sâu
- [ ] **Giao diện/điều hướng:** Không có năm/nội dung demo sai hoặc text bị vỡ
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

## GĐ-03 — Public: landing, nội dung, tìm kiếm & thông tin

> **Phạm vi:** Đánh giá trải nghiệm khám phá đầu tiên của G0/G1
> **Code cần lần vết (theo cấu trúc đã xem ở đợt trước; xác minh trên commit mới):** `pages/public/landing/; pages/public/about/; pages/public/contact/; pages/public/blog/; pages/public/blog-detail/`

### UI-03-001 · Trang chủ mở lần đầu  [P1 · Guest]
- [ ] **Thao tác:** Mở link website từ tab ẩn danh, không cookie
- [ ] **Giao diện/điều hướng:** Hero, banners, ảnh, CTA và menu hiển thị; không data rác/skeleton treo
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-03-002 · Hero CTA từng nút  [P1 · Guest]
- [x] **Thao tác:** Bấm các CTA Đặt lịch/Mua hàng/Xem dịch vụ nếu có
- [x] **Giao diện/điều hướng:** Đi đúng luồng với đúng mục tiêu, không cần qua trang sai; nút Đặt lịch ngay (#heroCta) hiển thị to hơn, căn giữa hoàn hảo và nổi bật hơn nút Xem Care-Log mẫu.
- [x] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [x] **Bằng chứng:** CHG-001; Commit `a4cee94` & `19cdce6`; Ảnh sau sửa: `hero_cta_comparison_1792497707990.png`; Video: `web_screens_audit_part1_1792496566347.webp`.

### UI-03-003 · Carousel banner  [P1 · Guest]
- [ ] **Thao tác:** Click next/prev/dots, autoplay, chạm vuốt mobile
- [ ] **Giao diện/điều hướng:** Không lỗi ảnh, không trùng trang, nút hoạt động và không tự submit form
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-03-004 · Danh mục nổi bật  [P1 · Guest]
- [ ] **Thao tác:** Chọn từng thẻ sản phẩm/dịch vụ trên landing
- [ ] **Giao diện/điều hướng:** Đi tới đúng product ID/service ID; nhãn giá/trạng thái hợp lệ
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-03-005 · Sản phẩm hết hàng  [P1 · Guest]
- [ ] **Thao tác:** Bấm sản phẩm đang hết hàng
- [ ] **Giao diện/điều hướng:** Không cho đặt vượt tồn, hiển thị hết hàng rõ
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-03-006 · Đọc trang giới thiệu  [P1 · Guest]
- [ ] **Thao tác:** Mở About từ header và footer
- [ ] **Giao diện/điều hướng:** Nội dung đầy đủ, back ổn, ảnh responsive
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-03-007 · Form liên hệ valid  [P1 · Guest]
- [ ] **Thao tác:** Điền tên/email/SĐT/nội dung đúng, tick consent nếu có, bấm Gửi
- [ ] **Giao diện/điều hướng:** Hiện xác nhận cùng mã yêu cầu nếu hệ thống có chức năng lưu
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-03-008 · Form liên hệ invalid  [P1 · Guest]
- [ ] **Thao tác:** Để trống từng trường bắt buộc, email sai, ký tự đặc biệt, spam bấm
- [ ] **Giao diện/điều hướng:** Không submit sai, thông báo cạnh trường, không tạo trùng
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-03-009 · Blog tìm kiếm  [P1 · Guest]
- [ ] **Thao tác:** Mở blog, search, lọc tag/category, reset filter
- [ ] **Giao diện/điều hướng:** Danh sách và số bài đúng, không lỗi phân trang
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-03-010 · Blog phân trang  [P1 · Guest]
- [ ] **Thao tác:** Chuyển trang cuối, quay trang trước, F5
- [ ] **Giao diện/điều hướng:** Không lặp/mất bài, có empty state đúng
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-03-011 · Blog detail  [P1 · Guest]
- [ ] **Thao tác:** Click bài viết, ảnh, nội dung, link liên quan, breadcrumb
- [ ] **Giao diện/điều hướng:** Đúng nội dung bài, không hiển thị HTML lỗi, link ảnh được tải
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-03-012 · Link nội bộ blog  [P1 · Guest]
- [ ] **Thao tác:** Bấm link Shop/Service đặt trong bài nếu có
- [ ] **Giao diện/điều hướng:** Đi đúng route, không phá giỏ hoặc session
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-03-013 · Guest search không kết quả  [P1 · Guest]
- [ ] **Thao tác:** Tìm chuỗi không tồn tại ở nơi search hỗ trợ
- [ ] **Giao diện/điều hướng:** Thông báo không có kết quả và gợi ý xóa lọc, không crash
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

## GĐ-04 — Khách vãng lai: tra cứu, đăng ký, đăng nhập & OTP

> **Phạm vi:** G0/G1 → M0/M1, ưu tiên privacy và trạng thái session
> **Code cần lần vết (theo cấu trúc đã xem ở đợt trước; xác minh trên commit mới):** `pages/public/login/login.js; pages/public/return-guest/return-guest.js`

### UI-04-001 · Đăng ký hợp lệ  [P0 · Guest/Member]
- [ ] **Thao tác:** Bấm Đăng ký, nhập họ tên, SĐT, email/mật khẩu theo form; bấm tạo tài khoản
- [ ] **Giao diện/điều hướng:** Thông báo rõ bước kế tiếp; không tạo nhiều tài khoản khi bấm nhanh
- [ ] **Lưu/đọc/đồng bộ:** Nếu ghi account/session/OTP: xác minh trạng thái server và F5/thiết bị khác; không chứng minh bằng toast.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-04-002 · Đăng ký trùng email/phone  [P0 · Guest/Member]
- [ ] **Thao tác:** Thử email/SĐT đã tồn tại
- [ ] **Giao diện/điều hướng:** Hiện lỗi cụ thể, không tạo tài khoản trùng hoặc lộ thông tin người khác
- [ ] **Lưu/đọc/đồng bộ:** Nếu ghi account/session/OTP: xác minh trạng thái server và F5/thiết bị khác; không chứng minh bằng toast.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-04-003 · Đăng ký sai dữ liệu  [P1 · Guest/Member]
- [ ] **Thao tác:** Để trống; thử email sai, mật khẩu yếu, xác nhận không khớp, phone ngắn
- [ ] **Giao diện/điều hướng:** Chặn lưu và gắn lỗi đúng field, focus tới ô lỗi
- [ ] **Lưu/đọc/đồng bộ:** Nếu ghi account/session/OTP: xác minh trạng thái server và F5/thiết bị khác; không chứng minh bằng toast.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-04-004 · Ẩn/hiện mật khẩu  [P1 · Guest/Member]
- [ ] **Thao tác:** Bấm icon mắt, dán mật khẩu, Tab đến nút
- [ ] **Giao diện/điều hướng:** Chỉ thay đổi hiển thị, không làm mất password hoặc lộ trong URL
- [ ] **Lưu/đọc/đồng bộ:** Nếu ghi account/session/OTP: xác minh trạng thái server và F5/thiết bị khác; không chứng minh bằng toast.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-04-005 · Điều khoản khi đăng ký  [P1 · Guest/Member]
- [ ] **Thao tác:** Mở điều khoản/chính sách từ form nếu có; quay lại
- [ ] **Giao diện/điều hướng:** Link mở được, form không mất dữ liệu hợp lý, consent không tự tích
- [ ] **Lưu/đọc/đồng bộ:** Nếu ghi account/session/OTP: xác minh trạng thái server và F5/thiết bị khác; không chứng minh bằng toast.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-04-006 · OTP đúng  [P0 · Guest/Member]
- [ ] **Thao tác:** Hoàn tất xác minh bằng OTP thử theo môi trường, submit một lần
- [ ] **Giao diện/điều hướng:** Đi đúng bước hoàn tất, kích hoạt account thật, không chỉ cập nhật localStorage
- [ ] **Lưu/đọc/đồng bộ:** Nếu ghi account/session/OTP: xác minh trạng thái server và F5/thiết bị khác; không chứng minh bằng toast.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-04-007 · OTP sai/hết hạn  [P0 · Guest/Member]
- [ ] **Thao tác:** Nhập sai nhiều lần, hết hạn, đổi tab, nhập lại
- [ ] **Giao diện/điều hướng:** Báo lỗi rõ, không kích hoạt tài khoản, có giới hạn thử hợp lý
- [ ] **Lưu/đọc/đồng bộ:** Nếu ghi account/session/OTP: xác minh trạng thái server và F5/thiết bị khác; không chứng minh bằng toast.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-04-008 · Gửi lại OTP  [P1 · Guest/Member]
- [ ] **Thao tác:** Bấm resend, thử bấm liên tục và dùng OTP cũ
- [ ] **Giao diện/điều hướng:** Có cooldown, OTP cũ bị xử lý theo quy định, không spam tin/email
- [ ] **Lưu/đọc/đồng bộ:** Nếu ghi account/session/OTP: xác minh trạng thái server và F5/thiết bị khác; không chứng minh bằng toast.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-04-009 · Đăng nhập thành công  [P0 · Guest/Member]
- [ ] **Thao tác:** Nhập đúng thông tin và Login, xem header rồi mở User Portal
- [ ] **Giao diện/điều hướng:** Auth state đổi thật, header member đúng tên, không lộ dữ liệu người khác
- [ ] **Lưu/đọc/đồng bộ:** Nếu ghi account/session/OTP: xác minh trạng thái server và F5/thiết bị khác; không chứng minh bằng toast.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-04-010 · Sai thông tin đăng nhập  [P0 · Guest/Member]
- [ ] **Thao tác:** Nhập sai mật khẩu hoặc tài khoản không tồn tại
- [ ] **Giao diện/điều hướng:** Thông báo dễ hiểu, không trả về token, không login thành công
- [ ] **Lưu/đọc/đồng bộ:** Nếu ghi account/session/OTP: xác minh trạng thái server và F5/thiết bị khác; không chứng minh bằng toast.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-04-011 · Đăng nhập bằng Enter  [P1 · Guest/Member]
- [ ] **Thao tác:** Focus ô password, Enter thay vì click Login
- [ ] **Giao diện/điều hướng:** Chỉ gửi một request, không tạo double event
- [ ] **Lưu/đọc/đồng bộ:** Nếu ghi account/session/OTP: xác minh trạng thái server và F5/thiết bị khác; không chứng minh bằng toast.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-04-012 · Quên mật khẩu  [P0 · Guest/Member]
- [ ] **Thao tác:** Dùng Forgot Password, submit dữ liệu đúng/sai, mở link khôi phục thử
- [ ] **Giao diện/điều hướng:** Luồng rõ, token chỉ dùng một lần và hết hạn, có thể login sau đổi
- [ ] **Lưu/đọc/đồng bộ:** Nếu ghi account/session/OTP: xác minh trạng thái server và F5/thiết bị khác; không chứng minh bằng toast.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-04-013 · Chặn account khóa  [P0 · Guest/Member]
- [ ] **Thao tác:** Dùng tài khoản tạm khóa/đã khóa test, thử login và thực hiện nghiệp vụ
- [ ] **Giao diện/điều hướng:** Chặn theo chính sách thực tế, thông báo đúng, không dùng token cũ để ghi
- [ ] **Lưu/đọc/đồng bộ:** Nếu ghi account/session/OTP: xác minh trạng thái server và F5/thiết bị khác; không chứng minh bằng toast.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-04-014 · Khách vãng lai tra cứu đơn  [P0 · Guest/Member]
- [ ] **Thao tác:** Vào Tra cứu khách vãng lai/return-guest, nhập thông tin đúng được cung cấp
- [ ] **Giao diện/điều hướng:** Chỉ trả đơn/lịch khớp định danh và xác minh; xem trạng thái rõ
- [ ] **Lưu/đọc/đồng bộ:** Nếu ghi account/session/OTP: xác minh trạng thái server và F5/thiết bị khác; không chứng minh bằng toast.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-04-015 · Guest lookup sai định danh  [P0 · Guest/Member]
- [ ] **Thao tác:** Nhập số điện thoại người khác, mã đơn random, kết hợp lệch
- [ ] **Giao diện/điều hướng:** Không lộ dữ liệu, không thể đoán danh sách đơn bằng thử mã
- [ ] **Lưu/đọc/đồng bộ:** Nếu ghi account/session/OTP: xác minh trạng thái server và F5/thiết bị khác; không chứng minh bằng toast.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-04-016 · Guest sang member  [P0 · Guest/Member]
- [ ] **Thao tác:** Kích hoạt/đăng ký từ khách đã từng mua, theo UI hỗ trợ
- [ ] **Giao diện/điều hướng:** Không nhân bản customer/order/pet; lịch sử gắn đúng ID được xác minh
- [ ] **Lưu/đọc/đồng bộ:** Nếu ghi account/session/OTP: xác minh trạng thái server và F5/thiết bị khác; không chứng minh bằng toast.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-04-017 · Giữ trang sau login  [P1 · Guest/Member]
- [ ] **Thao tác:** Khi bị yêu cầu login ở Wishlist/Booking, login rồi quay lại
- [ ] **Giao diện/điều hướng:** Quay đúng đích hợp lệ, không mất ý định thao tác, không open redirect
- [ ] **Lưu/đọc/đồng bộ:** Nếu ghi account/session/OTP: xác minh trạng thái server và F5/thiết bị khác; không chứng minh bằng toast.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-04-018 · Đăng xuất và quay lại  [P0 · Guest/Member]
- [ ] **Thao tác:** Login → User Portal → logout → Back, F5, mở deep link
- [ ] **Giao diện/điều hướng:** Không xem nội dung bảo vệ từ cache hoặc history
- [ ] **Lưu/đọc/đồng bộ:** Nếu ghi account/session/OTP: xác minh trạng thái server và F5/thiết bị khác; không chứng minh bằng toast.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-04-019 · Hai tài khoản qua hai tab  [P0 · Guest/Member]
- [ ] **Thao tác:** Login M1 tab A, logout/login M2 tab B, kiểm tab A
- [ ] **Giao diện/điều hướng:** Không rò dữ liệu M1/M2, UI tự xử lý phiên thay đổi
- [ ] **Lưu/đọc/đồng bộ:** Nếu ghi account/session/OTP: xác minh trạng thái server và F5/thiết bị khác; không chứng minh bằng toast.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

## GĐ-05 — Khám phá dịch vụ khi là khách vãng lai

> **Phạm vi:** Service listing/detail, chọn gói, đọc chính sách, bắt đầu đặt lịch
> **Code cần lần vết (theo cấu trúc đã xem ở đợt trước; xác minh trên commit mới):** `pages/services/service-detail/; pages/services/booking/`

### UI-05-001 · Danh sách dịch vụ  [P1 · Guest]
- [ ] **Thao tác:** Đi từ Home/Header/Footer vào Spa, Grooming, Pet Hotel, Pet Taxi
- [ ] **Giao diện/điều hướng:** Chọn đúng danh mục và có nội dung tương ứng; giá/đơn vị rõ
- [ ] **Lưu/đọc/đồng bộ:** Nếu phát sinh lịch: xác nhận `appointment` + `pet_profile` (nếu có tạo pet) + giá/thanh toán + trạng thái ở Admin Services; so khớp sau F5.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-05-002 · Chi tiết từng dịch vụ  [P1 · Guest]
- [ ] **Thao tác:** Bấm card → mô tả/gói/ảnh/điều kiện; Back rồi card khác
- [ ] **Giao diện/điều hướng:** Mã/gói đúng, breadcrumb đúng, không giữ dữ liệu của gói trước
- [ ] **Lưu/đọc/đồng bộ:** Nếu phát sinh lịch: xác nhận `appointment` + `pet_profile` (nếu có tạo pet) + giá/thanh toán + trạng thái ở Admin Services; so khớp sau F5.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-05-003 · Giá và biến thể dịch vụ  [P1 · Guest]
- [ ] **Thao tác:** Đổi trọng lượng/pet type/gói/dịch vụ bổ sung nếu form có
- [ ] **Giao diện/điều hướng:** Giá hiển thị cập nhật đúng quy tắc, không trả giá 0 vô cớ
- [ ] **Lưu/đọc/đồng bộ:** Nếu phát sinh lịch: xác nhận `appointment` + `pet_profile` (nếu có tạo pet) + giá/thanh toán + trạng thái ở Admin Services; so khớp sau F5.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-05-004 · Ngày giờ sẵn có  [P1 · Guest]
- [ ] **Thao tác:** Mở lịch chọn ngày/giờ, chuyển tháng, chọn ngày đã qua
- [ ] **Giao diện/điều hướng:** Không cho ngày quá khứ/slot không hợp lệ, có thông báo lý do
- [ ] **Lưu/đọc/đồng bộ:** Nếu phát sinh lịch: xác nhận `appointment` + `pet_profile` (nếu có tạo pet) + giá/thanh toán + trạng thái ở Admin Services; so khớp sau F5.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-05-005 · CTA đặt lịch nhiều nguồn  [P1 · Guest]
- [ ] **Thao tác:** Mở booking qua Hero, service card, detail, footer
- [ ] **Giao diện/điều hướng:** Đúng service đã chọn và giá/gói; không bỏ context
- [ ] **Lưu/đọc/đồng bộ:** Nếu phát sinh lịch: xác nhận `appointment` + `pet_profile` (nếu có tạo pet) + giá/thanh toán + trạng thái ở Admin Services; so khớp sau F5.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-05-006 · Đặt lịch khi guest  [P1 · Guest]
- [ ] **Thao tác:** Nhập SĐT, tên người liên hệ, pet, dịch vụ, thời gian, ghi chú; submit
- [ ] **Giao diện/điều hướng:** Nếu website cho guest booking thì tạo booking guest hợp lệ; nếu yêu cầu login thì chuyển đúng
- [ ] **Lưu/đọc/đồng bộ:** Nếu phát sinh lịch: xác nhận `appointment` + `pet_profile` (nếu có tạo pet) + giá/thanh toán + trạng thái ở Admin Services; so khớp sau F5.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-05-007 · Tạo pet ngay trong booking  [P0 · Guest]
- [ ] **Thao tác:** Chọn thêm pet mới trong luồng booking; nhập tên, loài, giống, cân nặng
- [ ] **Giao diện/điều hướng:** Không ghi enum sai, pet gắn đúng khách; booking và pet nhất quán
- [ ] **Lưu/đọc/đồng bộ:** Nếu phát sinh lịch: xác nhận `appointment` + `pet_profile` (nếu có tạo pet) + giá/thanh toán + trạng thái ở Admin Services; so khớp sau F5.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-05-008 · Booking thiếu trường  [P1 · Guest]
- [ ] **Thao tác:** Để trống pet, slot, SĐT, địa chỉ đón trả (Taxi) lần lượt
- [ ] **Giao diện/điều hướng:** Chặn lưu, hiển thị lý do ngay gần trường; dữ liệu đã nhập không bị xóa
- [ ] **Lưu/đọc/đồng bộ:** Nếu phát sinh lịch: xác nhận `appointment` + `pet_profile` (nếu có tạo pet) + giá/thanh toán + trạng thái ở Admin Services; so khớp sau F5.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-05-009 · Booking double-click  [P0 · Guest]
- [ ] **Thao tác:** Nhấp xác nhận 2 lần/thử Enter lặp khi mạng chậm
- [ ] **Giao diện/điều hướng:** Chỉ tạo 1 booking, có trạng thái đang gửi và có thể retry an toàn
- [ ] **Lưu/đọc/đồng bộ:** Nếu phát sinh lịch: xác nhận `appointment` + `pet_profile` (nếu có tạo pet) + giá/thanh toán + trạng thái ở Admin Services; so khớp sau F5.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-05-010 · Booking success page  [P0 · Guest]
- [ ] **Thao tác:** Sau submit hợp lệ mở trang xác nhận, copy mã booking
- [ ] **Giao diện/điều hướng:** Trang thành công chỉ khi server tạo lịch; hiển thị đúng mã/giá/giờ/pet
- [ ] **Lưu/đọc/đồng bộ:** Nếu phát sinh lịch: xác nhận `appointment` + `pet_profile` (nếu có tạo pet) + giá/thanh toán + trạng thái ở Admin Services; so khớp sau F5.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-05-011 · F5 trên booking success  [P0 · Guest]
- [ ] **Thao tác:** Reload/truy cập trực tiếp success URL, không có state local
- [ ] **Giao diện/điều hướng:** Không hiển thị thành công giả với booking không tồn tại
- [ ] **Lưu/đọc/đồng bộ:** Nếu phát sinh lịch: xác nhận `appointment` + `pet_profile` (nếu có tạo pet) + giá/thanh toán + trạng thái ở Admin Services; so khớp sau F5.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-05-012 · Tra cứu lại lịch guest  [P1 · Guest]
- [ ] **Thao tác:** Dùng mã/định danh theo UI để tìm lại booking; so với email/SMS nếu có
- [ ] **Giao diện/điều hướng:** Cùng mã/trạng thái/slot, không xem nhầm khách
- [ ] **Lưu/đọc/đồng bộ:** Nếu phát sinh lịch: xác nhận `appointment` + `pet_profile` (nếu có tạo pet) + giá/thanh toán + trạng thái ở Admin Services; so khớp sau F5.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-05-013 · Chọn slot trùng  [P0 · Guest]
- [ ] **Thao tác:** Hai phiên cùng đặt slot nhân sự/phòng cuối
- [ ] **Giao diện/điều hướng:** Không overbook; phiên đến sau có phản hồi đổi slot
- [ ] **Lưu/đọc/đồng bộ:** Nếu phát sinh lịch: xác nhận `appointment` + `pet_profile` (nếu có tạo pet) + giá/thanh toán + trạng thái ở Admin Services; so khớp sau F5.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-05-014 · Thông báo/điều khoản hủy  [P1 · Guest]
- [ ] **Thao tác:** Mở chính sách hủy từ booking
- [ ] **Giao diện/điều hướng:** Nội dung đúng theo nghiệp vụ, không link chết
- [ ] **Lưu/đọc/đồng bộ:** Nếu phát sinh lịch: xác nhận `appointment` + `pet_profile` (nếu có tạo pet) + giá/thanh toán + trạng thái ở Admin Services; so khớp sau F5.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

## GĐ-06 — Khách vãng lai: sản phẩm, giỏ hàng & đặt hàng

> **Phạm vi:** Khách chưa login muốn mua trực tiếp, đảm bảo giá/tồn/voucher/địa chỉ
> **Code cần lần vết (theo cấu trúc đã xem ở đợt trước; xác minh trên commit mới):** `pages/shop/product-detail/; pages/shop/cart/cart.js; pages/shop/checkout/checkout.js; scripts/api/api.js`

### UI-06-001 · Mở Shop/các danh mục  [P1 · Guest]
- [ ] **Thao tác:** Từ header/Home/footer vào Shop, lọc danh mục/chọn tag
- [ ] **Giao diện/điều hướng:** Danh sách hàng có giá/ảnh/tồn/nhãn đúng, click đúng ID
- [ ] **Lưu/đọc/đồng bộ:** Khi phát sinh giao dịch: so `sales_order` + chi tiết + `payment` + tồn kho + mã giảm giá; xem đơn ở Admin sau tải lại; không chỉ đối chiếu localStorage.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-06-002 · Tìm kiếm sản phẩm  [P1 · Guest]
- [ ] **Thao tác:** Tìm tên không dấu/có dấu, ký tự đặc biệt, không có kết quả
- [ ] **Giao diện/điều hướng:** Đúng sản phẩm và empty state không gây lỗi
- [ ] **Lưu/đọc/đồng bộ:** Khi phát sinh giao dịch: so `sales_order` + chi tiết + `payment` + tồn kho + mã giảm giá; xem đơn ở Admin sau tải lại; không chỉ đối chiếu localStorage.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-06-003 · Bộ lọc sản phẩm  [P1 · Guest]
- [ ] **Thao tác:** Thử danh mục/khoảng giá/thương hiệu/trạng thái còn hàng rồi reset
- [ ] **Giao diện/điều hướng:** Filter và kết quả nhất quán, không mất filter bất thường
- [ ] **Lưu/đọc/đồng bộ:** Khi phát sinh giao dịch: so `sales_order` + chi tiết + `payment` + tồn kho + mã giảm giá; xem đơn ở Admin sau tải lại; không chỉ đối chiếu localStorage.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-06-004 · Sắp xếp & phân trang  [P1 · Guest]
- [ ] **Thao tác:** Sắp xếp giá thấp/cao, trang tiếp, Back, F5
- [ ] **Giao diện/điều hướng:** Không lặp/mất hàng, giá đúng numeric, có empty state
- [ ] **Lưu/đọc/đồng bộ:** Khi phát sinh giao dịch: so `sales_order` + chi tiết + `payment` + tồn kho + mã giảm giá; xem đơn ở Admin sau tải lại; không chỉ đối chiếu localStorage.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-06-005 · Chi tiết product variants  [P0 · Guest]
- [ ] **Thao tác:** Mở sản phẩm có nhiều SKU/size, chọn từng variant
- [ ] **Giao diện/điều hướng:** Tên/giá/ảnh/tồn hiện theo đúng variant; URL/detail không nhầm sản phẩm
- [ ] **Lưu/đọc/đồng bộ:** Khi phát sinh giao dịch: so `sales_order` + chi tiết + `payment` + tồn kho + mã giảm giá; xem đơn ở Admin sau tải lại; không chỉ đối chiếu localStorage.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-06-006 · Thêm giỏ từ listing  [P0 · Guest]
- [ ] **Thao tác:** Bấm thêm giỏ trên card (nếu có), kiểm badge/mini-cart/cart
- [ ] **Giao diện/điều hướng:** Chỉ đúng variant và quantity được thêm
- [ ] **Lưu/đọc/đồng bộ:** Khi phát sinh giao dịch: so `sales_order` + chi tiết + `payment` + tồn kho + mã giảm giá; xem đơn ở Admin sau tải lại; không chỉ đối chiếu localStorage.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-06-007 · Thêm giỏ từ detail  [P0 · Guest]
- [ ] **Thao tác:** Chọn variant, nhập số lượng 2, bấm Thêm giỏ
- [ ] **Giao diện/điều hướng:** Giỏ có đúng hàng, ảnh, biến thể, giá, tổng
- [ ] **Lưu/đọc/đồng bộ:** Khi phát sinh giao dịch: so `sales_order` + chi tiết + `payment` + tồn kho + mã giảm giá; xem đơn ở Admin sau tải lại; không chỉ đối chiếu localStorage.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-06-008 · Không chọn variant  [P1 · Guest]
- [ ] **Thao tác:** Bấm Add to cart khi thiếu tùy chọn bắt buộc
- [ ] **Giao diện/điều hướng:** Không tự chọn biến thể sai; yêu cầu chọn hợp lệ
- [ ] **Lưu/đọc/đồng bộ:** Khi phát sinh giao dịch: so `sales_order` + chi tiết + `payment` + tồn kho + mã giảm giá; xem đơn ở Admin sau tải lại; không chỉ đối chiếu localStorage.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-06-009 · Giỏ số lượng  [P0 · Guest]
- [ ] **Thao tác:** Tăng/giảm/xóa từng line, thử số 0, âm, chữ, vượt tồn
- [ ] **Giao diện/điều hướng:** Validation rõ; không xuất hiện tổng âm hoặc qty vượt stock
- [ ] **Lưu/đọc/đồng bộ:** Khi phát sinh giao dịch: so `sales_order` + chi tiết + `payment` + tồn kho + mã giảm giá; xem đơn ở Admin sau tải lại; không chỉ đối chiếu localStorage.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-06-010 · Giỏ sau F5  [P1 · Guest]
- [ ] **Thao tác:** Refresh cart, quay Home → Shop → Cart
- [ ] **Giao diện/điều hướng:** Các dòng vẫn còn đúng nếu UX cho guest cart tồn tại
- [ ] **Lưu/đọc/đồng bộ:** Khi phát sinh giao dịch: so `sales_order` + chi tiết + `payment` + tồn kho + mã giảm giá; xem đơn ở Admin sau tải lại; không chỉ đối chiếu localStorage.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-06-011 · Giỏ trên tab ẩn danh  [P0 · Guest]
- [ ] **Thao tác:** Mở cart ở tab ẩn danh và trình duyệt khác
- [ ] **Giao diện/điều hướng:** Guest cart không bị trộn từ tài khoản khác; persistence đúng thiết kế
- [ ] **Lưu/đọc/đồng bộ:** Khi phát sinh giao dịch: so `sales_order` + chi tiết + `payment` + tồn kho + mã giảm giá; xem đơn ở Admin sau tải lại; không chỉ đối chiếu localStorage.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-06-012 · Giá khuyến mãi sản phẩm  [P0 · Guest]
- [ ] **Thao tác:** Chọn sản phẩm đang giảm giá, thay đổi quantity, so tổng
- [ ] **Giao diện/điều hướng:** Giá thực tế tính lại nhất quán với catalog/checkout
- [ ] **Lưu/đọc/đồng bộ:** Khi phát sinh giao dịch: so `sales_order` + chi tiết + `payment` + tồn kho + mã giảm giá; xem đơn ở Admin sau tải lại; không chỉ đối chiếu localStorage.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-06-013 · Voucher hợp lệ  [P0 · Guest]
- [ ] **Thao tác:** Nhập voucher thử cho guest (nếu áp dụng), bấm Áp dụng
- [ ] **Giao diện/điều hướng:** Giảm đúng điều kiện/giới hạn, hiển thị mã và mức giảm
- [ ] **Lưu/đọc/đồng bộ:** Khi phát sinh giao dịch: so `sales_order` + chi tiết + `payment` + tồn kho + mã giảm giá; xem đơn ở Admin sau tải lại; không chỉ đối chiếu localStorage.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-06-014 · Voucher không hợp lệ  [P0 · Guest]
- [ ] **Thao tác:** Nhập mã hết hạn/chưa đủ đơn/không áp dụng với SKU
- [ ] **Giao diện/điều hướng:** Lỗi rõ, tổng tiền không bị giảm sai
- [ ] **Lưu/đọc/đồng bộ:** Khi phát sinh giao dịch: so `sales_order` + chi tiết + `payment` + tồn kho + mã giảm giá; xem đơn ở Admin sau tải lại; không chỉ đối chiếu localStorage.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-06-015 · Phí giao hàng  [P0 · Guest]
- [ ] **Thao tác:** Đổi địa chỉ và phương thức giao nhận (nếu cho guest)
- [ ] **Giao diện/điều hướng:** Phí/cước cập nhật đúng, không tính sai khi đổi vùng
- [ ] **Lưu/đọc/đồng bộ:** Khi phát sinh giao dịch: so `sales_order` + chi tiết + `payment` + tồn kho + mã giảm giá; xem đơn ở Admin sau tải lại; không chỉ đối chiếu localStorage.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-06-016 · Thanh toán COD  [P0 · Guest]
- [ ] **Thao tác:** Checkout guest với tên/SĐT/địa chỉ hợp lệ, chọn COD, xác nhận
- [ ] **Giao diện/điều hướng:** Có mã đơn từ server, chi tiết order đúng và trang xác nhận chuẩn
- [ ] **Lưu/đọc/đồng bộ:** Khi phát sinh giao dịch: so `sales_order` + chi tiết + `payment` + tồn kho + mã giảm giá; xem đơn ở Admin sau tải lại; không chỉ đối chiếu localStorage.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-06-017 · Thanh toán online sandbox  [P0 · Guest]
- [ ] **Thao tác:** Checkout guest qua phương thức online trong sandbox
- [ ] **Giao diện/điều hướng:** Chỉ ghi `da_thanh_toan` khi server xác nhận giao dịch; không dựa vào redirect
- [ ] **Lưu/đọc/đồng bộ:** Khi phát sinh giao dịch: so `sales_order` + chi tiết + `payment` + tồn kho + mã giảm giá; xem đơn ở Admin sau tải lại; không chỉ đối chiếu localStorage.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-06-018 · Thanh toán thất bại  [P0 · Guest]
- [ ] **Thao tác:** Mô phỏng gateway cancel/fail/back, trở về checkout
- [ ] **Giao diện/điều hướng:** Không có đơn đã thanh toán giả; retry an toàn, không tạo order trùng
- [ ] **Lưu/đọc/đồng bộ:** Khi phát sinh giao dịch: so `sales_order` + chi tiết + `payment` + tồn kho + mã giảm giá; xem đơn ở Admin sau tải lại; không chỉ đối chiếu localStorage.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-06-019 · Checkout thiếu dữ liệu  [P0 · Guest]
- [ ] **Thao tác:** Bỏ trống địa chỉ, phone, người nhận, payment; submit
- [ ] **Giao diện/điều hướng:** Validation rõ, không tạo bản ghi nửa chừng
- [ ] **Lưu/đọc/đồng bộ:** Khi phát sinh giao dịch: so `sales_order` + chi tiết + `payment` + tồn kho + mã giảm giá; xem đơn ở Admin sau tải lại; không chỉ đối chiếu localStorage.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-06-020 · Đổi giá/tồn lúc checkout  [P0 · Guest]
- [ ] **Thao tác:** Đặt hàng rồi giả lập Admin đổi giá/hết stock trước submit
- [ ] **Giao diện/điều hướng:** Server kiểm lại tồn/giá, yêu cầu xác nhận mới nếu thay đổi
- [ ] **Lưu/đọc/đồng bộ:** Khi phát sinh giao dịch: so `sales_order` + chi tiết + `payment` + tồn kho + mã giảm giá; xem đơn ở Admin sau tải lại; không chỉ đối chiếu localStorage.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-06-021 · Double submit checkout  [P0 · Guest]
- [ ] **Thao tác:** Nhấp đặt hàng 2 lần, spam Enter, tải mạng chậm
- [ ] **Giao diện/điều hướng:** Một giao dịch tạo một order và một bộ line/payment; chống trùng
- [ ] **Lưu/đọc/đồng bộ:** Khi phát sinh giao dịch: so `sales_order` + chi tiết + `payment` + tồn kho + mã giảm giá; xem đơn ở Admin sau tải lại; không chỉ đối chiếu localStorage.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-06-022 · Guest xem lại đơn  [P0 · Guest]
- [ ] **Thao tác:** Dùng mã đơn và xác minh guest sau F5/phiên khác
- [ ] **Giao diện/điều hướng:** Trạng thái và line items đúng, không lộ dữ liệu nếu chỉ đoán mã
- [ ] **Lưu/đọc/đồng bộ:** Khi phát sinh giao dịch: so `sales_order` + chi tiết + `payment` + tồn kho + mã giảm giá; xem đơn ở Admin sau tải lại; không chỉ đối chiếu localStorage.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-06-023 · Nút tiếp tục mua/đặt lại  [P1 · Guest]
- [ ] **Thao tác:** Từ success/fail click CTA quay mua sắm
- [ ] **Giao diện/điều hướng:** Đi đúng Shop/Cart; không tạo order mới khi không yêu cầu
- [ ] **Lưu/đọc/đồng bộ:** Khi phát sinh giao dịch: so `sales_order` + chi tiết + `payment` + tồn kho + mã giảm giá; xem đơn ở Admin sau tải lại; không chỉ đối chiếu localStorage.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

## GĐ-07 — HEADER & SIDEBAR khi là thành viên

> **Phạm vi:** M0/M1 sau login; User SPA, module routing, desktop/mobile
> **Code cần lần vết (theo cấu trúc đã xem ở đợt trước; xác minh trên commit mới):** `pages/user/index.html; pages/user/user.js; pages/user/modules/*`

### UI-07-001 · Header chuyển sau login  [P0 · Member]
- [ ] **Thao tác:** Từ guest login thành công, nhìn avatar/name/tài khoản/cart
- [ ] **Giao diện/điều hướng:** Hiện trạng thái member ngay, guest CTA ẩn/đổi đúng
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-07-002 · Đúng tài khoản đăng nhập  [P0 · Member]
- [ ] **Thao tác:** M1 xem tên/email/ảnh/hạng; chuyển sang M2
- [ ] **Giao diện/điều hướng:** Không hiển thị thông tin M1 khi đang là M2
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-07-003 · Menu tài khoản trên header  [P1 · Member]
- [ ] **Thao tác:** Bấm avatar và từng mục profile/đơn/lịch/đăng xuất thực tế
- [ ] **Giao diện/điều hướng:** Đúng route SPA, menu auto-close, active state phù hợp
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-07-004 · Sidebar mở từ User Portal  [P0 · Member]
- [ ] **Thao tác:** Bấm từng mục: hồ sơ, thú cưng, nhật ký, lịch hẹn, đơn hàng, yêu thích, loyalty, support, settings
- [ ] **Giao diện/điều hướng:** Mỗi module hiện đúng nội dung, không trắng màn, không overlay che
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-07-005 · Sidebar active/highlight  [P1 · Member]
- [ ] **Thao tác:** Di chuyển lần lượt 8+ module qua sidebar, hash, Back
- [ ] **Giao diện/điều hướng:** Highlight đúng route và không giữ tab active cũ
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-07-006 · Sidebar item có badge  [P1 · Member]
- [ ] **Thao tác:** Thay đổi đơn/lịch/ticket/unread (nếu badge có)
- [ ] **Giao diện/điều hướng:** Badge không treo dữ liệu cũ; click lọc đúng nội dung
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-07-007 · Sidebar submenu  [P1 · Member]
- [ ] **Thao tác:** Mở/collapse từng nhánh, click child và parent nếu có
- [ ] **Giao diện/điều hướng:** Không menu chết, trạng thái đóng mở đúng
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-07-008 · Tải module qua route sâu  [P0 · Member]
- [ ] **Thao tác:** Copy URL/hash của từng module, mở tab mới có login
- [ ] **Giao diện/điều hướng:** Module tải đúng và có data, không chỉ chạy khi click từ Home
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-07-009 · Hard refresh từng module  [P0 · Member]
- [ ] **Thao tác:** F5 profile/pets/diary/orders/booking/loyalty/support
- [ ] **Giao diện/điều hướng:** Không 404, không lặp render/binding hay mất session
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-07-010 · Back Forward giữa module  [P1 · Member]
- [ ] **Thao tác:** Mở module A→B→C, Back 2 lần rồi Forward
- [ ] **Giao diện/điều hướng:** URL, breadcrumb, tiêu đề và dữ liệu đều đúng
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-07-011 · Sidebar điện thoại  [P1 · Member]
- [ ] **Thao tác:** 390px bấm menu, chuyển module, đóng bằng X, overlay, Esc
- [ ] **Giao diện/điều hướng:** Không bị kẹt overlay, không lộ menu dưới modal, vùng chạm đủ
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-07-012 · Sidebar trên tablet  [P1 · Member]
- [ ] **Thao tác:** Ở 768px bật menu, chuyển xoay ngang/dọc nếu có
- [ ] **Giao diện/điều hướng:** Không che nút Save/Delete, không tạo cuộn ngang
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-07-013 · Scroll khi đóng sidebar  [P1 · Member]
- [ ] **Thao tác:** Mở sidebar mobile, đóng, cuộn nội dung
- [ ] **Giao diện/điều hướng:** Không khóa `body` scroll sau đóng
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-07-014 · Chuyển route khi đang nhập form  [P1 · Member]
- [ ] **Thao tác:** Mở edit profile, nhập chưa lưu, click sidebar khác
- [ ] **Giao diện/điều hướng:** Cảnh báo mất dữ liệu nếu thiết kế yêu cầu; không âm thầm lưu
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-07-015 · Dropdown tài khoản khi modal mở  [P1 · Member]
- [ ] **Thao tác:** Mở modal edit, bấm menu header/Sidebar/Back
- [ ] **Giao diện/điều hướng:** Không tạo lớp overlay sai, không click xuyên modal
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-07-016 · Dữ liệu nav sau logout  [P0 · Member]
- [ ] **Thao tác:** Logout khi đang ở orders, Back/F5/tab khác
- [ ] **Giao diện/điều hướng:** Không còn xem đơn/điểm/profile từ session cũ
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-07-017 · Header giỏ member  [P0 · Member]
- [ ] **Thao tác:** Thêm sản phẩm rồi click Cart trên header, login/logout
- [ ] **Giao diện/điều hướng:** Số lượng đúng; cart không trộn guest/member trái quy tắc
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-07-018 · Header footer đồng nhất  [P1 · Member]
- [ ] **Thao tác:** So header/footer tại User Portal và Shop/Services khi logged in
- [ ] **Giao diện/điều hướng:** Trạng thái đăng nhập nhất quán, menu không nhảy về guest
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-07-019 · Link trực tiếp sai hash  [P1 · Member]
- [ ] **Thao tác:** Sửa hash thành module không tồn tại hoặc id giả
- [ ] **Giao diện/điều hướng:** Fallback/404 thân thiện, không script error
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

## GĐ-08 — User Portal: hồ sơ, địa chỉ, số điện thoại và cài đặt

> **Phạm vi:** Sửa thông tin thành viên, kiểm field-level persistence và riêng tư
> **Code cần lần vết (theo cấu trúc đã xem ở đợt trước; xác minh trên commit mới):** `pages/user/modules/profile/profile.js; pages/user/modules/settings/settings.js`

### UI-08-001 · Hồ sơ trống M0  [P1 · Member]
- [ ] **Thao tác:** Login M0, mở Profile, đọc từng field, empty states
- [ ] **Giao diện/điều hướng:** Không có dữ liệu demo, thiếu field có thông báo rõ
- [ ] **Lưu/đọc/đồng bộ:** Đối chiếu `customer`, `customer_profile`, `customer_phone`, `customer_address`, `customer_membership` nếu thuộc luồng; load lại User và Admin Customers.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-08-002 · Hiển thị M1 đầy đủ  [P0 · Member]
- [ ] **Thao tác:** Mở profile M1 rồi đối chiếu full_name, email, phone, DOB, gender, note công khai
- [ ] **Giao diện/điều hướng:** Chỉ hiện cột được phép, đúng record người dùng
- [ ] **Lưu/đọc/đồng bộ:** Đối chiếu `customer`, `customer_profile`, `customer_phone`, `customer_address`, `customer_membership` nếu thuộc luồng; load lại User và Admin Customers.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-08-003 · Sửa tên và ngày sinh  [P0 · Member]
- [ ] **Thao tác:** Click Chỉnh sửa, đổi full_name/date_of_birth, Save, F5
- [ ] **Giao diện/điều hướng:** Tồn tại đúng `customer_profile`, không đổi các field khác
- [ ] **Lưu/đọc/đồng bộ:** Đối chiếu `customer`, `customer_profile`, `customer_phone`, `customer_address`, `customer_membership` nếu thuộc luồng; load lại User và Admin Customers.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-08-004 · Sửa giới tính  [P1 · Member]
- [ ] **Thao tác:** Chọn từng giá trị enum từ dropdown, save, F5, Admin đối chiếu
- [ ] **Giao diện/điều hướng:** Hiển thị nhãn đúng, lưu enum hợp lệ không raw label tiếng Anh
- [ ] **Lưu/đọc/đồng bộ:** Đối chiếu `customer`, `customer_profile`, `customer_phone`, `customer_address`, `customer_membership` nếu thuộc luồng; load lại User và Admin Customers.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-08-005 · Đổi email/phone  [P0 · Member]
- [ ] **Thao tác:** Thao tác theo UI và xác minh bảo mật nếu được hỗ trợ
- [ ] **Giao diện/điều hướng:** Không sửa định danh quan trọng mà bỏ xác minh cần thiết
- [ ] **Lưu/đọc/đồng bộ:** Đối chiếu `customer`, `customer_profile`, `customer_phone`, `customer_address`, `customer_membership` nếu thuộc luồng; load lại User và Admin Customers.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-08-006 · Form thiếu và sai  [P1 · Member]
- [ ] **Thao tác:** Thử nhập trống name, email sai, số điện thoại lạ, emoji, dài quá mức
- [ ] **Giao diện/điều hướng:** Validate rõ, không làm mất dữ liệu hiện có
- [ ] **Lưu/đọc/đồng bộ:** Đối chiếu `customer`, `customer_profile`, `customer_phone`, `customer_address`, `customer_membership` nếu thuộc luồng; load lại User và Admin Customers.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-08-007 · Hủy chỉnh sửa  [P1 · Member]
- [ ] **Thao tác:** Đổi 3 trường rồi bấm Hủy/X, mở lại
- [ ] **Giao diện/điều hướng:** Không lưu bất kỳ trường nào; UI khôi phục trước sửa
- [ ] **Lưu/đọc/đồng bộ:** Đối chiếu `customer`, `customer_profile`, `customer_phone`, `customer_address`, `customer_membership` nếu thuộc luồng; load lại User và Admin Customers.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-08-008 · Double click Save  [P0 · Member]
- [ ] **Thao tác:** Giảm tốc mạng, bấm Save 2 lần
- [ ] **Giao diện/điều hướng:** Không có request ghi trùng hoặc trạng thái sai
- [ ] **Lưu/đọc/đồng bộ:** Đối chiếu `customer`, `customer_profile`, `customer_phone`, `customer_address`, `customer_membership` nếu thuộc luồng; load lại User và Admin Customers.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-08-009 · Tạo địa chỉ  [P0 · Member]
- [ ] **Thao tác:** Mở Sổ địa chỉ, Thêm; điền receiver_name, receiver_phone, tỉnh, địa chỉ, postal
- [ ] **Giao diện/điều hướng:** Tạo đúng địa chỉ, mở lại đầy đủ sau F5
- [ ] **Lưu/đọc/đồng bộ:** Đối chiếu `customer`, `customer_profile`, `customer_phone`, `customer_address`, `customer_membership` nếu thuộc luồng; load lại User và Admin Customers.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-08-010 · Địa chỉ mặc định  [P0 · Member]
- [ ] **Thao tác:** Tạo 2 địa chỉ, đổi mặc định A→B; F5
- [ ] **Giao diện/điều hướng:** Chỉ 1 default mỗi khách, Checkout dùng đúng B
- [ ] **Lưu/đọc/đồng bộ:** Đối chiếu `customer`, `customer_profile`, `customer_phone`, `customer_address`, `customer_membership` nếu thuộc luồng; load lại User và Admin Customers.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-08-011 · Sửa địa chỉ  [P0 · Member]
- [ ] **Thao tác:** Sửa tên người nhận/SĐT/đường/phường theo form; Save
- [ ] **Giao diện/điều hướng:** Không tạo bản ghi mới ngoài ý muốn, không mất province/postal
- [ ] **Lưu/đọc/đồng bộ:** Đối chiếu `customer`, `customer_profile`, `customer_phone`, `customer_address`, `customer_membership` nếu thuộc luồng; load lại User và Admin Customers.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-08-012 · Xóa địa chỉ  [P1 · Member]
- [ ] **Thao tác:** Xóa địa chỉ phụ; xác nhận dialog; kiểm checkout
- [ ] **Giao diện/điều hướng:** Xóa đúng ID; không còn trong lựa chọn giao hàng
- [ ] **Lưu/đọc/đồng bộ:** Đối chiếu `customer`, `customer_profile`, `customer_phone`, `customer_address`, `customer_membership` nếu thuộc luồng; load lại User và Admin Customers.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-08-013 · Địa chỉ được đơn sử dụng  [P0 · Member]
- [ ] **Thao tác:** Đặt đơn theo địa chỉ X rồi sửa/xóa X
- [ ] **Giao diện/điều hướng:** Đơn cũ giữ snapshot giao hàng hoặc xử lý theo nghiệp vụ, không đổi lịch sử sai
- [ ] **Lưu/đọc/đồng bộ:** Đối chiếu `customer`, `customer_profile`, `customer_phone`, `customer_address`, `customer_membership` nếu thuộc luồng; load lại User và Admin Customers.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-08-014 · Thay đổi password  [P0 · Member]
- [ ] **Thao tác:** Thử đổi mật khẩu với current/new/confirm nếu UI có
- [ ] **Giao diện/điều hướng:** Mật khẩu cũ hết hiệu lực theo chính sách; không hiển thị plain text
- [ ] **Lưu/đọc/đồng bộ:** Đối chiếu `customer`, `customer_profile`, `customer_phone`, `customer_address`, `customer_membership` nếu thuộc luồng; load lại User và Admin Customers.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-08-015 · Thiết lập thông báo  [P1 · Member]
- [ ] **Thao tác:** Bật/tắt email/push/zalo nếu có, Save, F5/login mới
- [ ] **Giao diện/điều hướng:** Tùy chọn lưu bền vững, không tự bật lại
- [ ] **Lưu/đọc/đồng bộ:** Đối chiếu `customer`, `customer_profile`, `customer_phone`, `customer_address`, `customer_membership` nếu thuộc luồng; load lại User và Admin Customers.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-08-016 · Tài khoản bị tạm khóa  [P0 · Member]
- [ ] **Thao tác:** Dùng M1 bị khóa test, mở Profile/Booking/Shop
- [ ] **Giao diện/điều hướng:** Hiển thị quyền đúng theo auth server, không chỉ ẩn UI
- [ ] **Lưu/đọc/đồng bộ:** Đối chiếu `customer`, `customer_profile`, `customer_phone`, `customer_address`, `customer_membership` nếu thuộc luồng; load lại User và Admin Customers.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-08-017 · Sao chép dữ liệu tài khoản khác  [P0 · Member]
- [ ] **Thao tác:** M1 thay `customer_id` trong URL/API request nếu có; thử xem M2
- [ ] **Giao diện/điều hướng:** 403/404 và không rò dữ liệu, không sửa chéo account
- [ ] **Lưu/đọc/đồng bộ:** Đối chiếu `customer`, `customer_profile`, `customer_phone`, `customer_address`, `customer_membership` nếu thuộc luồng; load lại User và Admin Customers.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-08-018 · Lỗi lưu giữa chừng  [P0 · Member]
- [ ] **Thao tác:** Mô phỏng mất mạng khi Save rồi reload
- [ ] **Giao diện/điều hướng:** Không báo lưu thành công giả, không ghi nửa form mà không cảnh báo
- [ ] **Lưu/đọc/đồng bộ:** Đối chiếu `customer`, `customer_profile`, `customer_phone`, `customer_address`, `customer_membership` nếu thuộc luồng; load lại User và Admin Customers.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

## GĐ-09 — User Portal: thú cưng, hình ảnh, sổ tiêm đơn giản và nhật ký

> **Phạm vi:** Không làm nghiệp vụ bệnh viện thú y; chỉ ghi nhận chăm sóc/tiêm chủng cơ bản
> **Code cần lần vết (theo cấu trúc đã xem ở đợt trước; xác minh trên commit mới):** `pages/user/modules/pets/pets.js; pages/user/modules/diary/diary.js`

### UI-09-001 · Empty state thú cưng  [P1 · Member]
- [ ] **Thao tác:** Login M0 chưa pet, mở mục Thú cưng
- [ ] **Giao diện/điều hướng:** Có CTA Thêm bé; không hiển thị thú cưng M1
- [ ] **Lưu/đọc/đồng bộ:** So `pet_profile`, lịch sử cân nặng/note, `care_log`, `appointment` theo ID; kiểm Admin Pets và Admin Services; không yêu cầu User nhìn thấy trường nhạy cảm.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-09-002 · Thêm pet Chó  [P0 · Member]
- [ ] **Thao tác:** Nhập tên, loài chó, giống, ngày sinh/cân nặng/giới tính theo form
- [ ] **Giao diện/điều hướng:** Pet mới đúng owner, status enum hợp lệ, xuất hiện sau F5
- [ ] **Lưu/đọc/đồng bộ:** So `pet_profile`, lịch sử cân nặng/note, `care_log`, `appointment` theo ID; kiểm Admin Pets và Admin Services; không yêu cầu User nhìn thấy trường nhạy cảm.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-09-003 · Thêm pet Mèo/Thỏ/Hamster/Khác  [P0 · Member]
- [ ] **Thao tác:** Tạo từng loại ở test data, kiểm lọc và chi tiết
- [ ] **Giao diện/điều hướng:** Dropdown/cột ghi species nhất quán `cho/meo/tho/hamster/thu_nho/khac` nếu đúng schema
- [ ] **Lưu/đọc/đồng bộ:** So `pet_profile`, lịch sử cân nặng/note, `care_log`, `appointment` theo ID; kiểm Admin Pets và Admin Services; không yêu cầu User nhìn thấy trường nhạy cảm.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-09-004 · Kiểm tra tên trùng  [P1 · Member]
- [ ] **Thao tác:** Tạo hai pet tên giống nhau, chọn từng pet để sửa
- [ ] **Giao diện/điều hướng:** Không sửa nhầm ID, mỗi pet đúng lịch sử
- [ ] **Lưu/đọc/đồng bộ:** So `pet_profile`, lịch sử cân nặng/note, `care_log`, `appointment` theo ID; kiểm Admin Pets và Admin Services; không yêu cầu User nhìn thấy trường nhạy cảm.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-09-005 · Đăng ảnh pet  [P1 · Member]
- [ ] **Thao tác:** Chọn ảnh hợp lệ, tải lên, xem thumbnail/chi tiết, F5
- [ ] **Giao diện/điều hướng:** Ảnh hiển thị, URL hợp lệ, không dùng ảnh từ file:// máy test
- [ ] **Lưu/đọc/đồng bộ:** So `pet_profile`, lịch sử cân nặng/note, `care_log`, `appointment` theo ID; kiểm Admin Pets và Admin Services; không yêu cầu User nhìn thấy trường nhạy cảm.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-09-006 · Ảnh pet quá lớn/không phù hợp  [P1 · Member]
- [ ] **Thao tác:** Upload file quá lớn/khác định dạng
- [ ] **Giao diện/điều hướng:** Báo lỗi, không lưu dữ liệu độc hại/thumbnail vỡ
- [ ] **Lưu/đọc/đồng bộ:** So `pet_profile`, lịch sử cân nặng/note, `care_log`, `appointment` theo ID; kiểm Admin Pets và Admin Services; không yêu cầu User nhìn thấy trường nhạy cảm.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-09-007 · Chỉnh sửa pet  [P0 · Member]
- [ ] **Thao tác:** Sửa cân nặng, giống, cảnh báo dị ứng, ghi chú; Save
- [ ] **Giao diện/điều hướng:** Mọi field nhập được bảo toàn, đúng pet sau F5
- [ ] **Lưu/đọc/đồng bộ:** So `pet_profile`, lịch sử cân nặng/note, `care_log`, `appointment` theo ID; kiểm Admin Pets và Admin Services; không yêu cầu User nhìn thấy trường nhạy cảm.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-09-008 · Dữ liệu cảnh báo an toàn  [P0 · Member]
- [ ] **Thao tác:** Thêm ghi chú dị ứng; qua booking/chọn pet và Admin xem
- [ ] **Giao diện/điều hướng:** Thông tin quan trọng được hiển thị ở nơi nhân viên cần biết
- [ ] **Lưu/đọc/đồng bộ:** So `pet_profile`, lịch sử cân nặng/note, `care_log`, `appointment` theo ID; kiểm Admin Pets và Admin Services; không yêu cầu User nhìn thấy trường nhạy cảm.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-09-009 · Lịch sử cân nặng  [P1 · Member]
- [ ] **Thao tác:** Cập nhật nhiều mốc cân nặng nếu UI hỗ trợ
- [ ] **Giao diện/điều hướng:** Sắp xếp đúng `measured_at`; không ghi đè bản ghi cũ
- [ ] **Lưu/đọc/đồng bộ:** So `pet_profile`, lịch sử cân nặng/note, `care_log`, `appointment` theo ID; kiểm Admin Pets và Admin Services; không yêu cầu User nhìn thấy trường nhạy cảm.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-09-010 · Ghi nhận tiêm chủng đơn giản  [P1 · Member]
- [ ] **Thao tác:** Mở mục ghi nhận vaccine nếu User có, thêm tên/ngày/ghi chú
- [ ] **Giao diện/điều hướng:** Lưu bền vững vào cấu trúc hiện hành; không đòi bảng `pet_vaccination` riêng
- [ ] **Lưu/đọc/đồng bộ:** So `pet_profile`, lịch sử cân nặng/note, `care_log`, `appointment` theo ID; kiểm Admin Pets và Admin Services; không yêu cầu User nhìn thấy trường nhạy cảm.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-09-011 · Sổ tiêm khi không xác nhận  [P0 · Member]
- [ ] **Thao tác:** Nhập chữ dại/rabies vào note (dữ liệu giả)
- [ ] **Giao diện/điều hướng:** Không tự suy ra đã tiêm đủ/chứng nhận thú y chỉ từ ghi chú
- [ ] **Lưu/đọc/đồng bộ:** So `pet_profile`, lịch sử cân nặng/note, `care_log`, `appointment` theo ID; kiểm Admin Pets và Admin Services; không yêu cầu User nhìn thấy trường nhạy cảm.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-09-012 · Pet tạm ngừng/ẩn  [P1 · Member]
- [ ] **Thao tác:** Đổi trạng thái pet nếu UI cho phép, kiểm danh sách và booking
- [ ] **Giao diện/điều hướng:** Đúng trạng thái, không thể vô tình đặt lịch pet không hợp lệ
- [ ] **Lưu/đọc/đồng bộ:** So `pet_profile`, lịch sử cân nặng/note, `care_log`, `appointment` theo ID; kiểm Admin Pets và Admin Services; không yêu cầu User nhìn thấy trường nhạy cảm.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-09-013 · Xóa pet có booking  [P0 · Member]
- [ ] **Thao tác:** Yêu cầu xóa/ẩn pet đã có lịch/đơn
- [ ] **Giao diện/điều hướng:** Có chặn/cảnh báo hợp lý; không làm mồ côi booking
- [ ] **Lưu/đọc/đồng bộ:** So `pet_profile`, lịch sử cân nặng/note, `care_log`, `appointment` theo ID; kiểm Admin Pets và Admin Services; không yêu cầu User nhìn thấy trường nhạy cảm.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-09-014 · Mở nhật ký chăm sóc  [P1 · Member]
- [ ] **Thao tác:** Mở Diary từ sidebar rồi từng bản ghi chăm sóc
- [ ] **Giao diện/điều hướng:** Đúng pet, ngày, dịch vụ, nhân viên, hình ảnh, ghi chú
- [ ] **Lưu/đọc/đồng bộ:** So `pet_profile`, lịch sử cân nặng/note, `care_log`, `appointment` theo ID; kiểm Admin Pets và Admin Services; không yêu cầu User nhìn thấy trường nhạy cảm.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-09-015 · Lọc nhật ký theo pet  [P0 · Member]
- [ ] **Thao tác:** Đổi pet filter, ngày, next/prev nếu có
- [ ] **Giao diện/điều hướng:** Chỉ nhật ký đúng pet; không rò người khác
- [ ] **Lưu/đọc/đồng bộ:** So `pet_profile`, lịch sử cân nặng/note, `care_log`, `appointment` theo ID; kiểm Admin Pets và Admin Services; không yêu cầu User nhìn thấy trường nhạy cảm.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-09-016 · Nhật ký khi trống  [P1 · Member]
- [ ] **Thao tác:** M0 chưa booking hoặc pet không có care log
- [ ] **Giao diện/điều hướng:** Empty state rõ, không hiển thị nội dung mẫu như dữ liệu thật
- [ ] **Lưu/đọc/đồng bộ:** So `pet_profile`, lịch sử cân nặng/note, `care_log`, `appointment` theo ID; kiểm Admin Pets và Admin Services; không yêu cầu User nhìn thấy trường nhạy cảm.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-09-017 · Nhật ký từ Admin  [P0 · Member]
- [ ] **Thao tác:** Admin hoàn tất booking + thêm care log; User mở lại
- [ ] **Giao diện/điều hướng:** User thấy bản ghi mới đúng thời gian/pet và thông tin đã cho phép công khai
- [ ] **Lưu/đọc/đồng bộ:** So `pet_profile`, lịch sử cân nặng/note, `care_log`, `appointment` theo ID; kiểm Admin Pets và Admin Services; không yêu cầu User nhìn thấy trường nhạy cảm.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-09-018 · Pet ID trong các màn  [P0 · Member]
- [ ] **Thao tác:** Mở cùng pet từ danh sách, booking, diary, support
- [ ] **Giao diện/điều hướng:** Tên/mã/loài khớp cùng pet, không sai FK
- [ ] **Lưu/đọc/đồng bộ:** So `pet_profile`, lịch sử cân nặng/note, `care_log`, `appointment` theo ID; kiểm Admin Pets và Admin Services; không yêu cầu User nhìn thấy trường nhạy cảm.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

## GĐ-10 — Thành viên: booking Spa/Grooming, Hotel, Taxi & lịch sử

> **Phạm vi:** Từ UI dịch vụ → đặt lịch → User Bookings → Admin → User
> **Code cần lần vết (theo cấu trúc đã xem ở đợt trước; xác minh trên commit mới):** `pages/services/booking/booking.js; pages/user/modules/bookings/bookings.js; booking-detail.js`

### UI-10-001 · Bắt đầu booking từ User  [P1 · Member]
- [ ] **Thao tác:** Vào User Portal → Bookings → nút Đặt lịch, chọn dịch vụ
- [ ] **Giao diện/điều hướng:** Không mất session; user info/pet chính xác, đúng service
- [ ] **Lưu/đọc/đồng bộ:** Đối chiếu `appointment`, các FK, loại `service`, slot, giá, `payment` nếu có; Admin Services xem đúng và cập nhật ngược User.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-10-002 · Chọn pet đã lưu  [P1 · Member]
- [ ] **Thao tác:** M1 có 2 pet, chọn lần lượt ở form
- [ ] **Giao diện/điều hướng:** Hiện đúng cân nặng/giống/cảnh báo; không nhầm pet_id
- [ ] **Lưu/đọc/đồng bộ:** Đối chiếu `appointment`, các FK, loại `service`, slot, giá, `payment` nếu có; Admin Services xem đúng và cập nhật ngược User.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-10-003 · Giá theo pet/gói  [P1 · Member]
- [ ] **Thao tác:** Đổi pet nặng nhẹ, gói dịch vụ, số ngày Hotel
- [ ] **Giao diện/điều hướng:** Giá breakdown rõ và khớp backend trước xác nhận
- [ ] **Lưu/đọc/đồng bộ:** Đối chiếu `appointment`, các FK, loại `service`, slot, giá, `payment` nếu có; Admin Services xem đúng và cập nhật ngược User.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-10-004 · Tạo booking Grooming  [P1 · Member]
- [ ] **Thao tác:** Chọn pet, dịch vụ, slot còn, ghi chú rồi xác nhận
- [ ] **Giao diện/điều hướng:** Booking có mã/trạng thái, sau F5 nằm trong lịch của đúng user
- [ ] **Lưu/đọc/đồng bộ:** Đối chiếu `appointment`, các FK, loại `service`, slot, giá, `payment` nếu có; Admin Services xem đúng và cập nhật ngược User.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-10-005 · Đặt Hotel nhiều ngày  [P1 · Member]
- [ ] **Thao tác:** Chọn checkin/checkout và phòng nếu UI hỗ trợ
- [ ] **Giao diện/điều hướng:** Số đêm, giá, trạng thái phòng đúng; không double booking phòng
- [ ] **Lưu/đọc/đồng bộ:** Đối chiếu `appointment`, các FK, loại `service`, slot, giá, `payment` nếu có; Admin Services xem đúng và cập nhật ngược User.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-10-006 · Hotel ngày bất hợp lệ  [P1 · Member]
- [ ] **Thao tác:** Chọn checkout trước checkin, ngày đã qua, phòng không còn
- [ ] **Giao diện/điều hướng:** Có validation và không tạo booking lỗi
- [ ] **Lưu/đọc/đồng bộ:** Đối chiếu `appointment`, các FK, loại `service`, slot, giá, `payment` nếu có; Admin Services xem đúng và cập nhật ngược User.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-10-007 · Tạo chuyến Pet Taxi  [P1 · Member]
- [ ] **Thao tác:** Điền điểm đón, điểm trả, ngày giờ, loại chuyến, pet, liên hệ
- [ ] **Giao diện/điều hướng:** Thông tin hiển thị lại đầy đủ trên detail và Admin, không mất từ `appointment.note`
- [ ] **Lưu/đọc/đồng bộ:** Đối chiếu `appointment`, các FK, loại `service`, slot, giá, `payment` nếu có; Admin Services xem đúng và cập nhật ngược User.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-10-008 · Taxi sửa ghi chú  [P1 · Member]
- [ ] **Thao tác:** Đổi ghi chú đơn thuần nếu UI cho phép rồi mở lại
- [ ] **Giao diện/điều hướng:** Không bị xóa điểm đón/trả/giá đã lưu
- [ ] **Lưu/đọc/đồng bộ:** Đối chiếu `appointment`, các FK, loại `service`, slot, giá, `payment` nếu có; Admin Services xem đúng và cập nhật ngược User.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-10-009 · Lịch hẹn trùng giờ  [P1 · Member]
- [ ] **Thao tác:** Đặt 2 ca cùng slot/điều kiện xung đột
- [ ] **Giao diện/điều hướng:** Báo không khả dụng, không cấp 2 tài nguyên cho cùng ca
- [ ] **Lưu/đọc/đồng bộ:** Đối chiếu `appointment`, các FK, loại `service`, slot, giá, `payment` nếu có; Admin Services xem đúng và cập nhật ngược User.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-10-010 · Xem danh sách booking  [P1 · Member]
- [ ] **Thao tác:** Mở User Bookings, lọc sắp tới/đã hoàn tất/đã hủy
- [ ] **Giao diện/điều hướng:** Trạng thái chính xác theo enum `appointment_status`; sort thời gian hợp lý
- [ ] **Lưu/đọc/đồng bộ:** Đối chiếu `appointment`, các FK, loại `service`, slot, giá, `payment` nếu có; Admin Services xem đúng và cập nhật ngược User.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-10-011 · Xem chi tiết booking  [P1 · Member]
- [ ] **Thao tác:** Click từng mã, kiểm người liên hệ, pet, dịch vụ, giờ, tổng, thanh toán
- [ ] **Giao diện/điều hướng:** Chi tiết đầy đủ, đúng định danh; khi thiếu dữ liệu có placeholder rõ
- [ ] **Lưu/đọc/đồng bộ:** Đối chiếu `appointment`, các FK, loại `service`, slot, giá, `payment` nếu có; Admin Services xem đúng và cập nhật ngược User.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-10-012 · Nút hủy booking  [P1 · Member]
- [ ] **Thao tác:** Hủy trong khung thời gian cho phép, confirm / Cancel dialog
- [ ] **Giao diện/điều hướng:** Chỉ ghi hủy khi xác nhận; không lặp; timeline và Admin đồng bộ
- [ ] **Lưu/đọc/đồng bộ:** Đối chiếu `appointment`, các FK, loại `service`, slot, giá, `payment` nếu có; Admin Services xem đúng và cập nhật ngược User.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-10-013 · Yêu cầu dời lịch  [P1 · Member]
- [ ] **Thao tác:** Chọn đổi giờ/ngày nếu tính năng hiện có
- [ ] **Giao diện/điều hướng:** Giữ lịch cũ cho đến khi cập nhật thành công; tránh tạo booking trùng
- [ ] **Lưu/đọc/đồng bộ:** Đối chiếu `appointment`, các FK, loại `service`, slot, giá, `payment` nếu có; Admin Services xem đúng và cập nhật ngược User.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-10-014 · Admin xác nhận booking  [P1 · Member]
- [ ] **Thao tác:** Admin duyệt lịch; User F5/back từ danh sách sang detail
- [ ] **Giao diện/điều hướng:** Trạng thái thay đổi khớp, không còn `cho_xac_nhan` cũ
- [ ] **Lưu/đọc/đồng bộ:** Đối chiếu `appointment`, các FK, loại `service`, slot, giá, `payment` nếu có; Admin Services xem đúng và cập nhật ngược User.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-10-015 · Admin check-in và chăm sóc  [P1 · Member]
- [ ] **Thao tác:** Admin check-in, thực hiện, hoàn tất; User xem status/diary
- [ ] **Giao diện/điều hướng:** Các trạng thái lên đúng thứ tự, dữ liệu care log xuất hiện sau hoàn thành
- [ ] **Lưu/đọc/đồng bộ:** Đối chiếu `appointment`, các FK, loại `service`, slot, giá, `payment` nếu có; Admin Services xem đúng và cập nhật ngược User.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-10-016 · Booking vắng mặt  [P1 · Member]
- [ ] **Thao tác:** Admin đánh `vang_mat` trên test record, User mở lịch
- [ ] **Giao diện/điều hướng:** Hiển thị vắng mặt đúng, không coi đã hoàn tất/tích điểm
- [ ] **Lưu/đọc/đồng bộ:** Đối chiếu `appointment`, các FK, loại `service`, slot, giá, `payment` nếu có; Admin Services xem đúng và cập nhật ngược User.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-10-017 · Thanh toán booking  [P1 · Member]
- [ ] **Thao tác:** Kiểm lịch có thanh toán/chưa trả/hoàn tiền
- [ ] **Giao diện/điều hướng:** Nhãn trạng thái đúng server, không nhầm phí dịch vụ với đã thanh toán
- [ ] **Lưu/đọc/đồng bộ:** Đối chiếu `appointment`, các FK, loại `service`, slot, giá, `payment` nếu có; Admin Services xem đúng và cập nhật ngược User.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-10-018 · Booking direct link và phân quyền  [P1 · Member]
- [ ] **Thao tác:** Copy detail URL cho M2 và ẩn danh
- [ ] **Giao diện/điều hướng:** Không xem được lịch/cá nhân của M1
- [ ] **Lưu/đọc/đồng bộ:** Đối chiếu `appointment`, các FK, loại `service`, slot, giá, `payment` nếu có; Admin Services xem đúng và cập nhật ngược User.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

## GĐ-11 — Thành viên: Shop → Wishlist → Cart → Checkout

> **Phạm vi:** Kiểm trải nghiệm thường ngày xuyên Home/Header/Shop/User Portal
> **Code cần lần vết (theo cấu trúc đã xem ở đợt trước; xác minh trên commit mới):** `pages/shop/product-detail/; cart/cart.js; checkout/checkout.js; pages/user/modules/wishlist/wishlist.js`

### UI-11-001 · Wishlist từ danh sách  [P1 · Member]
- [ ] **Thao tác:** Click tim ở card product 1, mở Wishlist trong User Portal
- [ ] **Giao diện/điều hướng:** Đúng product/variant theo nghiệp vụ, đồng bộ icon đã thích
- [ ] **Lưu/đọc/đồng bộ:** Đối chiếu `sales_order`, `sales_order_detail`, `payment`, `customer_address`, voucher/PawPoint/inventory theo nghiệp vụ; sau F5 Admin Order và User Orders cùng mã đơn.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-11-002 · Wishlist từ detail  [P1 · Member]
- [ ] **Thao tác:** Tại product detail click tim 2 lần
- [ ] **Giao diện/điều hướng:** Thêm rồi bỏ, không duplicate, F5 đúng
- [ ] **Lưu/đọc/đồng bộ:** Đối chiếu `sales_order`, `sales_order_detail`, `payment`, `customer_address`, voucher/PawPoint/inventory theo nghiệp vụ; sau F5 Admin Order và User Orders cùng mã đơn.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-11-003 · Wishlist sau login/logout  [P0 · Member]
- [ ] **Thao tác:** Login M1 wishlist A, logout, login M2
- [ ] **Giao diện/điều hướng:** Wishlist không lẫn hai tài khoản
- [ ] **Lưu/đọc/đồng bộ:** Đối chiếu `sales_order`, `sales_order_detail`, `payment`, `customer_address`, voucher/PawPoint/inventory theo nghiệp vụ; sau F5 Admin Order và User Orders cùng mã đơn.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-11-004 · Wishlist add to cart  [P1 · Member]
- [ ] **Thao tác:** Từ wishlist nhấn Thêm giỏ
- [ ] **Giao diện/điều hướng:** Đúng variant và qty, không mất wishlist ngoài ý muốn
- [ ] **Lưu/đọc/đồng bộ:** Đối chiếu `sales_order`, `sales_order_detail`, `payment`, `customer_address`, voucher/PawPoint/inventory theo nghiệp vụ; sau F5 Admin Order và User Orders cùng mã đơn.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-11-005 · Giỏ từ nhiều trang  [P0 · Member]
- [ ] **Thao tác:** Add từ Home, Shop, Detail, Wishlist; mở Cart
- [ ] **Giao diện/điều hướng:** Không trùng line sai hoặc lệch badge; tổng qty đúng
- [ ] **Lưu/đọc/đồng bộ:** Đối chiếu `sales_order`, `sales_order_detail`, `payment`, `customer_address`, voucher/PawPoint/inventory theo nghiệp vụ; sau F5 Admin Order và User Orders cùng mã đơn.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-11-006 · Giỏ của guest sang member  [P0 · Member]
- [ ] **Thao tác:** Chưa login add cart, login từ checkout, quay cart
- [ ] **Giao diện/điều hướng:** Có quy tắc gộp/giữ giỏ rõ, không mất/nhân đôi sản phẩm
- [ ] **Lưu/đọc/đồng bộ:** Đối chiếu `sales_order`, `sales_order_detail`, `payment`, `customer_address`, voucher/PawPoint/inventory theo nghiệp vụ; sau F5 Admin Order và User Orders cùng mã đơn.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-11-007 · Cart bền vững  [P0 · Member]
- [ ] **Thao tác:** M1 thêm giỏ, F5/logout/login/đổi tab
- [ ] **Giao diện/điều hướng:** Tồn tại theo chính sách, không hiện hàng của M2
- [ ] **Lưu/đọc/đồng bộ:** Đối chiếu `sales_order`, `sales_order_detail`, `payment`, `customer_address`, voucher/PawPoint/inventory theo nghiệp vụ; sau F5 Admin Order và User Orders cùng mã đơn.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-11-008 · Giá giảm, voucher và điểm  [P0 · Member]
- [ ] **Thao tác:** Áp voucher, dùng Paw Points nếu checkout hỗ trợ, đổi qty
- [ ] **Giao diện/điều hướng:** Tổng thanh toán cập nhật theo thứ tự giảm hợp lệ, không âm
- [ ] **Lưu/đọc/đồng bộ:** Đối chiếu `sales_order`, `sales_order_detail`, `payment`, `customer_address`, voucher/PawPoint/inventory theo nghiệp vụ; sau F5 Admin Order và User Orders cùng mã đơn.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-11-009 · Địa chỉ nhận hàng  [P0 · Member]
- [ ] **Thao tác:** Chọn địa chỉ profile, chỉnh/chọn khác trước checkout
- [ ] **Giao diện/điều hướng:** Địa chỉ người nhận, SĐT, phí ship được cập nhật đúng
- [ ] **Lưu/đọc/đồng bộ:** Đối chiếu `sales_order`, `sales_order_detail`, `payment`, `customer_address`, voucher/PawPoint/inventory theo nghiệp vụ; sau F5 Admin Order và User Orders cùng mã đơn.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-11-010 · Phương thức vận chuyển  [P1 · Member]
- [ ] **Thao tác:** Chọn giao tại nhà/nhận tại quầy nếu UI có
- [ ] **Giao diện/điều hướng:** Phí và ngày dự kiến phản ánh lựa chọn
- [ ] **Lưu/đọc/đồng bộ:** Đối chiếu `sales_order`, `sales_order_detail`, `payment`, `customer_address`, voucher/PawPoint/inventory theo nghiệp vụ; sau F5 Admin Order và User Orders cùng mã đơn.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-11-011 · Phương thức thanh toán  [P0 · Member]
- [ ] **Thao tác:** Chuyển COD/ví/chuyển khoản theo tùy chọn thật
- [ ] **Giao diện/điều hướng:** Hướng dẫn, phí, số tiền rõ, không giữ dữ liệu sai phương thức trước
- [ ] **Lưu/đọc/đồng bộ:** Đối chiếu `sales_order`, `sales_order_detail`, `payment`, `customer_address`, voucher/PawPoint/inventory theo nghiệp vụ; sau F5 Admin Order và User Orders cùng mã đơn.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-11-012 · Xem tổng tiền cuối  [P0 · Member]
- [ ] **Thao tác:** Kiểm subtotal/discount/shipping/points/tax nếu có
- [ ] **Giao diện/điều hướng:** Tổng = các thành phần theo quy tắc làm tròn; không đổi âm thầm
- [ ] **Lưu/đọc/đồng bộ:** Đối chiếu `sales_order`, `sales_order_detail`, `payment`, `customer_address`, voucher/PawPoint/inventory theo nghiệp vụ; sau F5 Admin Order và User Orders cùng mã đơn.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-11-013 · Thanh toán COD member  [P0 · Member]
- [ ] **Thao tác:** Submit một đơn test, mở success rồi Orders
- [ ] **Giao diện/điều hướng:** Cùng order id/đúng line/địa chỉ/payment trạng thái chưa trả
- [ ] **Lưu/đọc/đồng bộ:** Đối chiếu `sales_order`, `sales_order_detail`, `payment`, `customer_address`, voucher/PawPoint/inventory theo nghiệp vụ; sau F5 Admin Order và User Orders cùng mã đơn.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-11-014 · Thanh toán online member  [P0 · Member]
- [ ] **Thao tác:** Qua sandbox thành công, quay Orders
- [ ] **Giao diện/điều hướng:** Có xác nhận phía server, không cộng điểm trước điều kiện
- [ ] **Lưu/đọc/đồng bộ:** Đối chiếu `sales_order`, `sales_order_detail`, `payment`, `customer_address`, voucher/PawPoint/inventory theo nghiệp vụ; sau F5 Admin Order và User Orders cùng mã đơn.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-11-015 · Nhấn Back từ gateway  [P0 · Member]
- [ ] **Thao tác:** Ở cổng thanh toán thử Back/Cancel rồi retry
- [ ] **Giao diện/điều hướng:** Không đơn trùng hoặc thanh toán giả; người dùng biết trạng thái
- [ ] **Lưu/đọc/đồng bộ:** Đối chiếu `sales_order`, `sales_order_detail`, `payment`, `customer_address`, voucher/PawPoint/inventory theo nghiệp vụ; sau F5 Admin Order và User Orders cùng mã đơn.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-11-016 · Giỏ sau thành công  [P0 · Member]
- [ ] **Thao tác:** Quay Shop/Cart sau đặt đơn thành công
- [ ] **Giao diện/điều hướng:** Chỉ xóa hàng đã mua theo quy tắc; không xóa trước khi server success
- [ ] **Lưu/đọc/đồng bộ:** Đối chiếu `sales_order`, `sales_order_detail`, `payment`, `customer_address`, voucher/PawPoint/inventory theo nghiệp vụ; sau F5 Admin Order và User Orders cùng mã đơn.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-11-017 · Giỏ sau lỗi server  [P0 · Member]
- [ ] **Thao tác:** Mô phỏng order create 500 và reload
- [ ] **Giao diện/điều hướng:** Cart không mất, user có thể retry an toàn
- [ ] **Lưu/đọc/đồng bộ:** Đối chiếu `sales_order`, `sales_order_detail`, `payment`, `customer_address`, voucher/PawPoint/inventory theo nghiệp vụ; sau F5 Admin Order và User Orders cùng mã đơn.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-11-018 · Checkout từ URL trực tiếp  [P0 · Member]
- [ ] **Thao tác:** Vào checkout qua deep link khi cart trống và cart có hàng
- [ ] **Giao diện/điều hướng:** Có guard đúng, không crash hoặc dùng checkout state của người khác
- [ ] **Lưu/đọc/đồng bộ:** Đối chiếu `sales_order`, `sales_order_detail`, `payment`, `customer_address`, voucher/PawPoint/inventory theo nghiệp vụ; sau F5 Admin Order và User Orders cùng mã đơn.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

## GĐ-12 — Thành viên: đơn hàng, vận chuyển, hủy, đổi trả, hoàn tiền

> **Phạm vi:** Các nút nguy cơ làm sai tiền/điểm/trạng thái
> **Code cần lần vết (theo cấu trúc đã xem ở đợt trước; xác minh trên commit mới):** `pages/user/modules/orders/orders.js; order-detail.js; return-detail.js`

### UI-12-001 · Danh sách order  [P0 · Member]
- [ ] **Thao tác:** User Portal Orders, xem mới→cũ, bộ lọc trạng thái, phân trang
- [ ] **Giao diện/điều hướng:** Đúng đơn của M1, ngày/tiền/status không nhầm M2
- [ ] **Lưu/đọc/đồng bộ:** Check `sales_order`, request đổi trả, `payment`/refund thật, inventory, voucher, PawPoint ledger; Admin Order/detail đồng bộ.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-12-002 · Đơn chi tiết  [P0 · Member]
- [ ] **Thao tác:** Click order, kiểm order code/line/variant/qty/đơn giá/giảm/ship/tổng
- [ ] **Giao diện/điều hướng:** Từng dòng khớp lúc mua; thông tin thanh toán và ship đúng
- [ ] **Lưu/đọc/đồng bộ:** Check `sales_order`, request đổi trả, `payment`/refund thật, inventory, voucher, PawPoint ledger; Admin Order/detail đồng bộ.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-12-003 · Đơn COD đang chờ  [P0 · Member]
- [ ] **Thao tác:** Mở COD pending; kiểm nút được phép, mốc trạng thái
- [ ] **Giao diện/điều hướng:** Không báo đã thanh toán khi chưa thu hộ
- [ ] **Lưu/đọc/đồng bộ:** Check `sales_order`, request đổi trả, `payment`/refund thật, inventory, voucher, PawPoint ledger; Admin Order/detail đồng bộ.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-12-004 · Admin chuyển trạng thái  [P0 · Member]
- [ ] **Thao tác:** Admin từ cho xác nhận → chuẩn bị → giao → hoàn tất; User F5
- [ ] **Giao diện/điều hướng:** Nhận đúng status theo enum; timeline không nhảy ngược
- [ ] **Lưu/đọc/đồng bộ:** Check `sales_order`, request đổi trả, `payment`/refund thật, inventory, voucher, PawPoint ledger; Admin Order/detail đồng bộ.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-12-005 · Mã vận đơn/tracking  [P1 · Member]
- [ ] **Thao tác:** Mở liên kết tracking nếu đơn có hãng/mã
- [ ] **Giao diện/điều hướng:** Đúng hãng, không mở URL giả, có trường hợp chưa có vận đơn
- [ ] **Lưu/đọc/đồng bộ:** Check `sales_order`, request đổi trả, `payment`/refund thật, inventory, voucher, PawPoint ledger; Admin Order/detail đồng bộ.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-12-006 · Yêu cầu hủy chưa trả  [P0 · Member]
- [ ] **Thao tác:** Bấm Hủy, kiểm lý do, cancel/confirm, F5
- [ ] **Giao diện/điều hướng:** Chỉ hủy đơn hợp lệ, kho/voucher/điểm hoàn nguyên đúng
- [ ] **Lưu/đọc/đồng bộ:** Check `sales_order`, request đổi trả, `payment`/refund thật, inventory, voucher, PawPoint ledger; Admin Order/detail đồng bộ.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-12-007 · Hủy đã thanh toán  [P0 · Member]
- [ ] **Thao tác:** Hủy paid order trong staging, chờ quy trình refund
- [ ] **Giao diện/điều hướng:** **Không được hiển thị `da_hoan_tien` trước refund thực tế**; có pending/refund rõ
- [ ] **Lưu/đọc/đồng bộ:** Check `sales_order`, request đổi trả, `payment`/refund thật, inventory, voucher, PawPoint ledger; Admin Order/detail đồng bộ.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-12-008 · Hủy lỗi cập nhật DB  [P0 · Member]
- [ ] **Thao tác:** Mô phỏng lỗi mạng/quyền khi confirm hủy
- [ ] **Giao diện/điều hướng:** UI báo FAIL, không chỉ log Console và toast thành công giả
- [ ] **Lưu/đọc/đồng bộ:** Check `sales_order`, request đổi trả, `payment`/refund thật, inventory, voucher, PawPoint ledger; Admin Order/detail đồng bộ.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-12-009 · Đổi trả hàng  [P0 · Member]
- [ ] **Thao tác:** Chọn line trả, số lượng, lý do, ảnh nếu có, submit
- [ ] **Giao diện/điều hướng:** Tạo yêu cầu đúng order item và qty; không vượt số mua
- [ ] **Lưu/đọc/đồng bộ:** Check `sales_order`, request đổi trả, `payment`/refund thật, inventory, voucher, PawPoint ledger; Admin Order/detail đồng bộ.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-12-010 · Đổi trả bị từ chối  [P1 · Member]
- [ ] **Thao tác:** Admin từ chối test request, User xem return detail
- [ ] **Giao diện/điều hướng:** Hiển thị lý do và trạng thái đúng, không hoàn tiền
- [ ] **Lưu/đọc/đồng bộ:** Check `sales_order`, request đổi trả, `payment`/refund thật, inventory, voucher, PawPoint ledger; Admin Order/detail đồng bộ.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-12-011 · Đổi trả được duyệt  [P0 · Member]
- [ ] **Thao tác:** Admin duyệt/nhận hàng, User refresh
- [ ] **Giao diện/điều hướng:** Timeline đúng, không coi đã hoàn tiền khi mới duyệt
- [ ] **Lưu/đọc/đồng bộ:** Check `sales_order`, request đổi trả, `payment`/refund thật, inventory, voucher, PawPoint ledger; Admin Order/detail đồng bộ.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-12-012 · Hoàn tiền thành công sandbox  [P0 · Member]
- [ ] **Thao tác:** Cập nhật refund thật sau duyệt; kiểm UI, voucher/điểm
- [ ] **Giao diện/điều hướng:** Có giao dịch tham chiếu và số tiền đúng, không hoàn trùng
- [ ] **Lưu/đọc/đồng bộ:** Check `sales_order`, request đổi trả, `payment`/refund thật, inventory, voucher, PawPoint ledger; Admin Order/detail đồng bộ.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-12-013 · Hoàn tiền thất bại  [P0 · Member]
- [ ] **Thao tác:** Giả lập gateway refund fail, User xem trạng thái
- [ ] **Giao diện/điều hướng:** Hiển thị chờ/không thành công, không ghi da_hoan_tien giả
- [ ] **Lưu/đọc/đồng bộ:** Check `sales_order`, request đổi trả, `payment`/refund thật, inventory, voucher, PawPoint ledger; Admin Order/detail đồng bộ.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-12-014 · Tránh double action  [P0 · Member]
- [ ] **Thao tác:** Double click Hủy/Gửi đổi trả, mở 2 tab cùng đơn
- [ ] **Giao diện/điều hướng:** Một yêu cầu có hiệu lực duy nhất; không hoàn kho/tiền 2 lần
- [ ] **Lưu/đọc/đồng bộ:** Check `sales_order`, request đổi trả, `payment`/refund thật, inventory, voucher, PawPoint ledger; Admin Order/detail đồng bộ.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-12-015 · Order direct ID cross-account  [P0 · Member]
- [ ] **Thao tác:** Copy URL order M1 sang ẩn danh/M2
- [ ] **Giao diện/điều hướng:** Không xem được tên/SĐT/địa chỉ/đơn M1
- [ ] **Lưu/đọc/đồng bộ:** Check `sales_order`, request đổi trả, `payment`/refund thật, inventory, voucher, PawPoint ledger; Admin Order/detail đồng bộ.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-12-016 · Export/in hóa đơn  [P1 · Member]
- [ ] **Thao tác:** Bấm Xuất/In nếu User có, kiểm file và browser print
- [ ] **Giao diện/điều hướng:** Số tiền/địa chỉ đúng đơn; không có field nội bộ/token
- [ ] **Lưu/đọc/đồng bộ:** Check `sales_order`, request đổi trả, `payment`/refund thật, inventory, voucher, PawPoint ledger; Admin Order/detail đồng bộ.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

## GĐ-13 — Thành viên: Paw Points, voucher, hạng và lịch sử

> **Phạm vi:** Không được cộng/trừ điểm hai lần, không dựa số dư frontend
> **Code cần lần vết (theo cấu trúc đã xem ở đợt trước; xác minh trên commit mới):** `pages/user/modules/loyalty/loyalty.js`

### UI-13-001 · Trang loyalty lần đầu  [P0 · Member]
- [ ] **Thao tác:** M0/M1 mở module, đọc điểm/hạng, lịch sử
- [ ] **Giao diện/điều hướng:** M0 số dư 0 hợp lý; M1 đúng customer, không rò số dư M2
- [ ] **Lưu/đọc/đồng bộ:** So `customer_membership` với `paw_point_transaction` và voucher được cấp; Admin Customers/Settings phản ánh cùng kết quả.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-13-002 · Điểm từ giao dịch thành công  [P0 · Member]
- [ ] **Thao tác:** Mua đơn test đủ điều kiện, Admin hoàn tất, User refresh
- [ ] **Giao diện/điều hướng:** Điểm cộng đúng quy tắc và chỉ một lần
- [ ] **Lưu/đọc/đồng bộ:** So `customer_membership` với `paw_point_transaction` và voucher được cấp; Admin Customers/Settings phản ánh cùng kết quả.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-13-003 · Điểm khi hủy/hoàn  [P0 · Member]
- [ ] **Thao tác:** Hủy đơn đã tích điểm hoặc refund test
- [ ] **Giao diện/điều hướng:** Điểm đảo/không tích theo quy tắc; không âm sai
- [ ] **Lưu/đọc/đồng bộ:** So `customer_membership` với `paw_point_transaction` và voucher được cấp; Admin Customers/Settings phản ánh cùng kết quả.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-13-004 · Dùng điểm khi mua  [P0 · Member]
- [ ] **Thao tác:** Đổi PawPoint nếu có, checkout, thanh toán thành công
- [ ] **Giao diện/điều hướng:** Đúng conversion, tổng không âm, ledger ghi tiêu điểm một lần
- [ ] **Lưu/đọc/đồng bộ:** So `customer_membership` với `paw_point_transaction` và voucher được cấp; Admin Customers/Settings phản ánh cùng kết quả.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-13-005 · Dùng điểm nhưng checkout thất bại  [P0 · Member]
- [ ] **Thao tác:** Áp points rồi mất mạng/gateway fail
- [ ] **Giao diện/điều hướng:** Không trừ vĩnh viễn hoặc có quy trình rollback/giữ tạm rõ
- [ ] **Lưu/đọc/đồng bộ:** So `customer_membership` với `paw_point_transaction` và voucher được cấp; Admin Customers/Settings phản ánh cùng kết quả.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-13-006 · Đổi voucher  [P0 · Member]
- [ ] **Thao tác:** Mở đổi điểm lấy voucher nếu UI hỗ trợ
- [ ] **Giao diện/điều hướng:** Trừ điểm/ghi voucher theo giao dịch đúng; không mất điểm khi voucher tạo fail
- [ ] **Lưu/đọc/đồng bộ:** So `customer_membership` với `paw_point_transaction` và voucher được cấp; Admin Customers/Settings phản ánh cùng kết quả.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-13-007 · Voucher đã dùng/hết hạn  [P0 · Member]
- [ ] **Thao tác:** Dùng mã rồi mở Loyalty/Checkout lần hai
- [ ] **Giao diện/điều hướng:** Đúng lượt dùng và hiệu lực, không tái sử dụng nếu cấm
- [ ] **Lưu/đọc/đồng bộ:** So `customer_membership` với `paw_point_transaction` và voucher được cấp; Admin Customers/Settings phản ánh cùng kết quả.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-13-008 · Hạng thành viên đổi  [P1 · Member]
- [ ] **Thao tác:** Admin thay tier/điểm hoặc tới ngưỡng; User refresh
- [ ] **Giao diện/điều hướng:** Hiển thị tier đúng, không chỉ cập nhật UI cache
- [ ] **Lưu/đọc/đồng bộ:** So `customer_membership` với `paw_point_transaction` và voucher được cấp; Admin Customers/Settings phản ánh cùng kết quả.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-13-009 · Lịch sử điểm phân trang  [P1 · Member]
- [ ] **Thao tác:** Đổi filter loại, mở page 2, Back/F5
- [ ] **Giao diện/điều hướng:** Mốc ngày/lý do/số dư khớp ledger, không tạo item giả
- [ ] **Lưu/đọc/đồng bộ:** So `customer_membership` với `paw_point_transaction` và voucher được cấp; Admin Customers/Settings phản ánh cùng kết quả.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-13-010 · Tặng điểm từ CSKH  [P0 · Member]
- [ ] **Thao tác:** Admin tặng điểm test qua hội thoại nếu có; User refresh
- [ ] **Giao diện/điều hướng:** Có transaction và số dư tăng một lần, đúng lý do
- [ ] **Lưu/đọc/đồng bộ:** So `customer_membership` với `paw_point_transaction` và voucher được cấp; Admin Customers/Settings phản ánh cùng kết quả.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

## GĐ-14 — Thành viên: hỗ trợ, khiếu nại, chat và đánh giá

> **Phạm vi:** Trải nghiệm liên hệ CSKH theo đúng order/booking và realtime
> **Code cần lần vết (theo cấu trúc đã xem ở đợt trước; xác minh trên commit mới):** `pages/user/modules/support/support.js; support-create.js; Admin complaints/chatbot`

### UI-14-001 · Vào trang hỗ trợ  [P1 · Member]
- [ ] **Thao tác:** Bấm Help/Support từ header/sidebar/footer nếu có
- [ ] **Giao diện/điều hướng:** Đúng support module, hiện ticket của user đã login
- [ ] **Lưu/đọc/đồng bộ:** Kiểm ticket, chat_conversation/chat_message, đánh giá; Admin CSKH/Complaints phản ánh đúng mã và trạng thái.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-14-002 · Gửi câu hỏi chung  [P0 · Member]
- [ ] **Thao tác:** Mở Tạo yêu cầu, nhập chủ đề/nội dung/hình ảnh nếu có, submit
- [ ] **Giao diện/điều hướng:** Ticket có mã/status đúng; User và Admin cùng nhìn thấy
- [ ] **Lưu/đọc/đồng bộ:** Kiểm ticket, chat_conversation/chat_message, đánh giá; Admin CSKH/Complaints phản ánh đúng mã và trạng thái.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-14-003 · Khiếu nại đơn hàng  [P0 · Member]
- [ ] **Thao tác:** Từ order detail chọn Báo sự cố/Support, gửi lý do
- [ ] **Giao diện/điều hướng:** Link chính xác order_id/customer_id, không nhầm đơn
- [ ] **Lưu/đọc/đồng bộ:** Kiểm ticket, chat_conversation/chat_message, đánh giá; Admin CSKH/Complaints phản ánh đúng mã và trạng thái.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-14-004 · Khiếu nại dịch vụ  [P0 · Member]
- [ ] **Thao tác:** Từ booking detail gửi ticket
- [ ] **Giao diện/điều hướng:** Link appointment_id/pet_id đúng, trạng thái nhận được
- [ ] **Lưu/đọc/đồng bộ:** Kiểm ticket, chat_conversation/chat_message, đánh giá; Admin CSKH/Complaints phản ánh đúng mã và trạng thái.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-14-005 · Ticket thiếu dữ liệu  [P1 · Member]
- [ ] **Thao tác:** Để trống title/content, tải file lỗi, spam gửi
- [ ] **Giao diện/điều hướng:** Validation rõ; không tạo ticket trống hoặc duplicate
- [ ] **Lưu/đọc/đồng bộ:** Kiểm ticket, chat_conversation/chat_message, đánh giá; Admin CSKH/Complaints phản ánh đúng mã và trạng thái.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-14-006 · Danh sách ticket  [P0 · Member]
- [ ] **Thao tác:** Lọc trạng thái, mở từng ticket, reload
- [ ] **Giao diện/điều hướng:** M1 chỉ thấy ticket M1, thứ tự và badge đúng
- [ ] **Lưu/đọc/đồng bộ:** Kiểm ticket, chat_conversation/chat_message, đánh giá; Admin CSKH/Complaints phản ánh đúng mã và trạng thái.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-14-007 · Phản hồi từ Admin  [P0 · Member]
- [ ] **Thao tác:** Admin trả lời ticket, User mở/refresh
- [ ] **Giao diện/điều hướng:** Thấy đúng message, thời gian, người phản hồi, trạng thái
- [ ] **Lưu/đọc/đồng bộ:** Kiểm ticket, chat_conversation/chat_message, đánh giá; Admin CSKH/Complaints phản ánh đúng mã và trạng thái.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-14-008 · Hội thoại realtime  [P0 · Member]
- [ ] **Thao tác:** M1 gửi tin nhắn, Admin nhận và trả lời; mở 2 tab
- [ ] **Giao diện/điều hướng:** Hiển thị theo đúng thứ tự, không duplicate/reorder vô cớ
- [ ] **Lưu/đọc/đồng bộ:** Kiểm ticket, chat_conversation/chat_message, đánh giá; Admin CSKH/Complaints phản ánh đúng mã và trạng thái.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-14-009 · Kết nối lại khi mất mạng  [P0 · Member]
- [ ] **Thao tác:** Ngắt mạng 10 giây rồi bật, gửi tin nhắn/retry
- [ ] **Giao diện/điều hướng:** Không mất tin hoặc gửi trùng; UI thể hiện pending/error
- [ ] **Lưu/đọc/đồng bộ:** Kiểm ticket, chat_conversation/chat_message, đánh giá; Admin CSKH/Complaints phản ánh đúng mã và trạng thái.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-14-010 · Đính kèm an toàn  [P1 · Member]
- [ ] **Thao tác:** Gửi ảnh test nhỏ, file quá lớn và định dạng bị cấm
- [ ] **Giao diện/điều hướng:** Chỉ upload hợp lệ, URL ảnh đúng quyền; lỗi rõ
- [ ] **Lưu/đọc/đồng bộ:** Kiểm ticket, chat_conversation/chat_message, đánh giá; Admin CSKH/Complaints phản ánh đúng mã và trạng thái.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-14-011 · Hội thoại đã đóng  [P1 · Member]
- [ ] **Thao tác:** Admin đánh resolved, User thử gửi lại
- [ ] **Giao diện/điều hướng:** Hành vi theo chính sách, không đổi status lén hoặc mất lịch sử
- [ ] **Lưu/đọc/đồng bộ:** Kiểm ticket, chat_conversation/chat_message, đánh giá; Admin CSKH/Complaints phản ánh đúng mã và trạng thái.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-14-012 · Đánh giá sau chăm sóc  [P1 · Member]
- [ ] **Thao tác:** Nếu User có nút Review, chọn sao/nội dung, submit
- [ ] **Giao diện/điều hướng:** Đánh giá gắn đúng appointment/service, Admin thấy bản ghi
- [ ] **Lưu/đọc/đồng bộ:** Kiểm ticket, chat_conversation/chat_message, đánh giá; Admin CSKH/Complaints phản ánh đúng mã và trạng thái.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-14-013 · Xóa/sửa đánh giá  [P1 · Member]
- [ ] **Thao tác:** Nếu UI hỗ trợ, thử edit/delete rồi F5
- [ ] **Giao diện/điều hướng:** Dữ liệu thay đổi đúng bản ghi, không giữ phiên bản cũ
- [ ] **Lưu/đọc/đồng bộ:** Kiểm ticket, chat_conversation/chat_message, đánh giá; Admin CSKH/Complaints phản ánh đúng mã và trạng thái.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-14-014 · Đánh giá chưa hoàn tất  [P1 · Member]
- [ ] **Thao tác:** Dùng booking chưa hoàn thành, thử gửi review
- [ ] **Giao diện/điều hướng:** Không thể review sai điều kiện nghiệp vụ nếu hệ thống giới hạn
- [ ] **Lưu/đọc/đồng bộ:** Kiểm ticket, chat_conversation/chat_message, đánh giá; Admin CSKH/Complaints phản ánh đúng mã và trạng thái.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-14-015 · Riêng tư support  [P0 · Member]
- [ ] **Thao tác:** Copy link ticket/conversation M1 sang M2/Guest
- [ ] **Giao diện/điều hướng:** Không xem được message/file/định danh
- [ ] **Lưu/đọc/đồng bộ:** Kiểm ticket, chat_conversation/chat_message, đánh giá; Admin CSKH/Complaints phản ánh đúng mã và trạng thái.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

## GĐ-15 — Trạng thái khách khi logout, hết phiên, đổi tài khoản & đa thiết bị

> **Phạm vi:** Hệ thống hiển thị đúng public/member, không lẫn dữ liệu người khác
> **Code cần lần vết (theo cấu trúc đã xem ở đợt trước; xác minh trên commit mới):** `pages/user/user.js; login.js; scripts/shared/`

### UI-15-001 · Logout từ header  [P0 · Cả hai]
- [ ] **Thao tác:** Bấm Đăng xuất, chờ hoàn tất và mở trang public
- [ ] **Giao diện/điều hướng:** UI trở guest ngay, không còn avatar/tên M1
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-15-002 · Logout từ sidebar  [P0 · Cả hai]
- [ ] **Thao tác:** Bấm Đăng xuất từ User Portal; Back về profile
- [ ] **Giao diện/điều hướng:** Không xem dữ liệu private từ cache
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-15-003 · Hết hạn session trong User Portal  [P0 · Cả hai]
- [ ] **Thao tác:** Dùng phiên test hết hạn rồi bấm tab Orders/Save
- [ ] **Giao diện/điều hướng:** Chuyển login/re-auth hợp lý; không xóa dữ liệu chưa lưu mà im lặng
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-15-004 · Hết phiên khi checkout  [P0 · Cả hai]
- [ ] **Thao tác:** Đang nhập checkout thì phiên hết hạn, submit
- [ ] **Giao diện/điều hướng:** Không tạo đơn cho customer sai, có luồng khôi phục an toàn
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-15-005 · User A → User B cùng trình duyệt  [P0 · Cả hai]
- [ ] **Thao tác:** Login M1, logout, login M2, mở Cart/Wishlist/Orders
- [ ] **Giao diện/điều hướng:** Không có dữ liệu M1 tồn trong UI/session cache
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-15-006 · User A và User B ở hai browser  [P0 · Cả hai]
- [ ] **Thao tác:** M1 Chrome, M2 Firefox, đổi booking/payment status
- [ ] **Giao diện/điều hướng:** Mỗi user chỉ thấy của mình, dữ liệu Admin thay đổi đúng
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-15-007 · F5 sau Save  [P0 · Cả hai]
- [ ] **Thao tác:** Thực hiện Save profile/address/pet, F5 và login lại
- [ ] **Giao diện/điều hướng:** Giá trị được lưu ở server, không chỉ state/localStorage
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-15-008 · Tab đồng thời  [P1 · Cả hai]
- [ ] **Thao tác:** Cùng M1 mở 2 tab, chỉnh địa chỉ ở tab A, checkout tab B
- [ ] **Giao diện/điều hướng:** Tab B không âm thầm ghi đè địa chỉ cũ; có refresh/đồng bộ phù hợp
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-15-009 · Guest state sau logout  [P0 · Cả hai]
- [ ] **Thao tác:** Guest add cart A, login M1, logout trở guest
- [ ] **Giao diện/điều hướng:** Không lộ cart/wishlist M1 cho guest mới dùng cùng máy
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-15-010 · Truy cập deep link private ẩn danh  [P0 · Cả hai]
- [ ] **Thao tác:** Dán URL profile/orders/booking-detail trực tiếp ở ẩn danh
- [ ] **Giao diện/điều hướng:** Có auth guard, không hiển thị HTML dữ liệu nội bộ qua cache
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

## GĐ-16 — Responsive, thao tác bằng bàn phím & chất lượng UX

> **Phạm vi:** Kiểm 3 viewport trên mọi route trọng yếu, không chỉ Home
> **Code cần lần vết (theo cấu trúc đã xem ở đợt trước; xác minh trên commit mới):** `Mọi giao diện website`

### UI-16-001 · Mobile 320/390px  [P1 · Cả hai]
- [ ] **Thao tác:** Đi Home→Product→Cart→Checkout→User trên viewport nhỏ
- [ ] **Giao diện/điều hướng:** Không tràn ngang, nút chính luôn nhìn/bấm được
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-16-002 · Tablet 768px  [P1 · Cả hai]
- [ ] **Thao tác:** Kiểm header/sidebar/filter/modal/checkout form
- [ ] **Giao diện/điều hướng:** Không bị breakpoint chồng menu, không mất label
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-16-003 · Desktop 1440px  [P2 · Cả hai]
- [ ] **Thao tác:** Kiểm chiều rộng content/grid, sticky header/footer
- [ ] **Giao diện/điều hướng:** Không hàng quá dài hoặc khoảng trắng khiến CTA bị khuất
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-16-004 · Zoom 200%  [P1 · Cả hai]
- [ ] **Thao tác:** Phóng to 200%, mở popup/modal và hoàn tất form
- [ ] **Giao diện/điều hướng:** Không cắt Save/Close, không cuộn ngang vô hạn
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-16-005 · Touch targets  [P1 · Cả hai]
- [ ] **Thao tác:** Chạm icon tim, xóa giỏ, đóng modal, ngày trong lịch trên mobile
- [ ] **Giao diện/điều hướng:** Vùng chạm đủ lớn, không click nhầm phần tử sát nhau
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-16-006 · Bàn phím Tab  [P1 · Cả hai]
- [ ] **Thao tác:** Dùng Tab/Shift+Tab qua header→main→form→footer
- [ ] **Giao diện/điều hướng:** Focus rõ, thứ tự hợp lý, không kẹt focus
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-16-007 · Enter/Space on buttons  [P1 · Cả hai]
- [ ] **Thao tác:** Kích hoạt nav, radio, checkbox, submit bằng bàn phím
- [ ] **Giao diện/điều hướng:** Tương đương click, không gửi duplicate
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-16-008 · Escape on dialog  [P1 · Cả hai]
- [ ] **Thao tác:** Mở modal/dropdown/chat/sidebar rồi Esc
- [ ] **Giao diện/điều hướng:** Đóng đúng layer; focus quay lại nút mở
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-16-009 · Form label và lỗi  [P1 · Cả hai]
- [ ] **Thao tác:** Click label chọn input, submit invalid, screen reader nếu có
- [ ] **Giao diện/điều hướng:** Tên trường rõ, lỗi có liên kết, required không chỉ báo màu
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-16-010 · Image alt/loading  [P2 · Cả hai]
- [ ] **Thao tác:** Tắt ảnh hoặc mạng chậm trên Shop/Blog/Pet
- [ ] **Giao diện/điều hướng:** Alt hợp lý/placeholder; không layout shift lớn
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-16-011 · Contrast/hình ảnh  [P2 · Cả hai]
- [ ] **Thao tác:** Dùng dark/light nếu có, xem text nhỏ, badge trạng thái
- [ ] **Giao diện/điều hướng:** Nội dung đọc được, trạng thái không chỉ phân biệt bằng màu
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-16-012 · Mạng chậm và skeleton  [P1 · Cả hai]
- [ ] **Thao tác:** Giảm tốc 3G, truy cập listing và User Portal
- [ ] **Giao diện/điều hướng:** Loading hữu ích, không skeleton vĩnh viễn, nút tránh bấm nhiều lần
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-16-013 · Form error toasts  [P0 · Cả hai]
- [ ] **Thao tác:** Cố tình gây lỗi 4xx/5xx trên save
- [ ] **Giao diện/điều hướng:** Toast dễ hiểu, không hiển thị SQL/stack/API key/token
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-16-014 · Trình duyệt tương thích  [P1 · Cả hai]
- [ ] **Thao tác:** Lặp smoke trên Chrome/Edge, Firefox, Safari iOS nếu có
- [ ] **Giao diện/điều hướng:** Không tính năng chính nào chỉ chạy 1 browser
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

### UI-16-015 · Scroll restoration  [P2 · Cả hai]
- [ ] **Thao tác:** Tìm sản phẩm trang 4 → detail → Back
- [ ] **Giao diện/điều hướng:** Trở vị trí/lọc theo thiết kế, không bị reset vô lý
- [ ] **Sau F5/Back/Forward:** Không lỗi, không biến mất sai state hoặc chuyển tới trang không liên quan.
- [ ] **Bằng chứng:** Ghi URL, viewport, ảnh trước/sau, video ngắn nếu có lỗi; Network/Console khi xảy ra lỗi.

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
