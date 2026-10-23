# PAWPAL — MASTER PLAN V3: CHUẨN HÓA INLINE FORM VALIDATION & FIELD-LEVEL ERROR HANDLING
**Phạm vi:** toàn bộ PawPal — khách vãng lai (Public), khách thành viên (User Portal), Services/Hotel/Taxi, Shop/Checkout, và Admin (9 phân hệ), bao gồm form trực tiếp, modal, drawer, wizard và form sinh động.
**Ngày lập:** 20/10/2026 · **Nguồn chính của kế hoạch:** `Pawpal-main.zip` · **Cập nhật thực hiện:** đã bắt đầu GĐ-00 trên workspace hiện tại và kiểm tra một modal trên localhost; chưa sửa mã chức năng, chưa kiểm thử Supabase thực tế. Chi tiết tại nhật ký GĐ-00 cuối tài liệu. Các mô tả từ ZIP vẫn cần đối chiếu với mã hiện tại.
**Mục tiêu:** người dùng nhập/chọn sai ở ô nào thì được chỉ rõ **ô đó sai điều gì và sửa ra sao**, được dẫn đến đúng ô, không mất dữ liệu, không có thông báo lưu thành công giả; backend vẫn kiểm tra lại dữ liệu.
**Ưu tiên:** P0 = sai lệch nghiệp vụ, quyền dữ liệu, thanh toán, lỗi lưu giả; P1 = trải nghiệm form trọng yếu; P2 = tính nhất quán hình thức/bộ lọc/phần nâng cao.

## 0. Kết luận nhanh từ code thật
Khác với việc “PawPal chưa có validation”, ZIP **đã có nhiều dạng validation riêng lẻ**. Kế hoạch này là **chuẩn hóa và mở rộng**, không thay trắng.
| Mã bằng chứng | File thật trong ZIP | Hiện trạng đọc từ mã nguồn | Hướng xử lý |
| --- | --- | --- | --- |
| SRC-01 | `pages/services/booking/booking.js` → `validateGuestInput()` | Đã dùng các vùng `id + Err` và `is-invalid` cho thông tin chủ nuôi/thú cưng. | Giữ quy tắc nghiệp vụ đang đúng, kết nối engine chung, bổ sung ARIA, lỗi các bước dịch vụ/giờ/hotel/taxi. |
| SRC-02 | `pages/user/modules/profile/profile.html/.js` | Đã có `profileNameError`, `profileEmailError`, lỗi địa chỉ, `aria-invalid`, `aria-describedby`. | Giữ markup tốt, chuẩn hóa submit/server error/unsaved changes. |
| SRC-03 | `pages/user/modules/settings/settings.js` | Xác nhận mật khẩu lệch hiện `.is-invalid`/`.invalid-feedback`; nút submit bị disable. | Bổ sung gợi ý thiếu quy tắc ở mật khẩu mới/cũ và lỗi do server. |
| SRC-04 | `pages/shop/checkout/checkout.js` → `validateCheckoutForm()` | Nhiều nhánh báo `showToast` chung khi thông tin giao hàng, địa chỉ đã lưu, xuất hóa đơn sai. | Ánh xạ lỗi đến trường thật, mở panel chỉnh địa chỉ nếu cần. |
| SRC-05 | `pages/public/login/login.js` | Dùng kiểm tra điều kiện để khóa nút, `run()` chuyển lỗi về toast. | Bổ sung lỗi tại phone/password/OTP và phân loại mã lỗi API an toàn. |
| SRC-06 | `pages/admin/modules/customers/subtabs/tab-customer-list.js` | Đã dùng `setCustomValidity`, `reportValidity`, cộng với toast cho modal thêm nhanh. | Chuyển về lỗi cạnh `quickAddName/Phone/PetWeight`; xóa `setCustomValidity` sau khi hợp lệ. |
| SRC-07 | `pages/admin/modules/orders/orders.html` | Đã có vùng `createOrderPhoneError`, `createOrderNameError`, `createOrderAddressError`. | Tái sử dụng các vùng hiện hữu; kiểm tra JS có thực sự gắn thông điệp lỗi. |
| SRC-08 | `pages/user/modules/support/support-create.js` | File đính kèm lớn hơn 5 MB đang `alert(...)`, thay vì lỗi gắn file. | Lỗi cạnh `ticketFile`, giữ nội dung, ghi rõ giới hạn và định dạng. |
| SRC-09 | `pages/public/contact/contact.js` | `validatePayload()` chỉ trả về chuỗi lỗi đầu tiên, `showFeedback()` mang tính toàn form. | Ánh xạ `fullName`, `phoneNumber`, `message` và lỗi lưu support ticket. |
| SRC-10 | `pages/user/modules/pets/pets.js` | Có `.error-msg` và toast; kiểm tra loài khác, cân nặng trên modal hồ sơ. | Cố định error cho từng nhóm radio, ngày sinh/cân nặng/avatar/loài khác. |
| SRC-11 | `scripts/api/customer_profile_persistence.js` | Backend có lỗi email trùng `23505`, stale revision, kiểm tra số địa chỉ và địa chỉ mặc định. | Trả/ánh xạ mã lỗi theo trường (`email`, `addresses`, `revision`); không lộ SQL/raw exception. |
| SRC-12 | `pages/user/modules/profile/profile.js` và `scripts/api/customer_profile_persistence.js` | Cùng import `scripts/shared/address-validation.mjs`; file đó **không thấy trong ZIP giải nén**. | Xác minh artifact/deploy trước khi refactor; không viết đè file hoặc mặc định đã lỗi production. |

**Nguồn WCAG tham chiếu bổ sung (không phải yêu cầu từ CSDL):** [W3C ARIA21 — `aria-invalid` và mô tả lỗi](https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA21), [W3C WCAG 3.3.1 Error Identification](https://www.w3.org/WAI/WCAG22/Understanding/error-identification). Nền tảng này không bắt buộc mọi lỗi phải inline, nhưng PawPal chọn inline làm chuẩn UX.

## 1. Định nghĩa sản phẩm: UX mà PawPal sẽ thống nhất
| Trạng thái | Khi nào | Người dùng nhìn thấy | Không được làm |
| --- | --- | --- | --- |
| Pristine | Mới mở form, chưa nhập/chạm | Nhãn, gợi ý và trạng thái bình thường | Không hiện một loạt viền đỏ ngay khi mở |
| Editing | Đang nhập | Hướng dẫn tĩnh; có thể báo đạt định dạng nhẹ nhàng | Không hiện lỗi “bắt buộc” ngay ở ký tự đầu |
| Touched/Blur | Đã rời ô | Báo lỗi rõ ràng dưới ô nếu không hợp lệ | Không chỉ toast rồi mất thông điệp |
| Submitted invalid | Bấm Lưu/Gửi/Thanh toán khi sai | Hiện mọi lỗi theo đúng ô + tóm tắt + focus ô đầu tiên | Không gửi request ghi dữ liệu |
| Server rejected | API/Supabase từ chối | Gắn field error khi biết trường; lỗi toàn form nếu không xác định | Không hiển thị raw error/SQL/stack trace |
| Submitting | Đang gửi hợp lệ | Loading và chặn submit lặp; giữ giá trị form | Không khóa tất cả input mà làm mất nội dung |
| Saved | Backend phản hồi thành công và hậu kiểm hợp lý | Toast thành công; cập nhật danh sách/giá trị | Không báo lưu thành công từ localStorage hoặc UI-only |
| Conflict / stale | Dữ liệu đã đổi nơi khác | Thông báo xung đột, lựa chọn tải lại/giữ bản nháp | Không âm thầm ghi đè |
| Network / offline | Mạng lỗi, timeout | Lỗi cấp form + nút thử lại, giữ nội dung đã nhập | Không gửi lặp gây tạo 2 đơn/hai vé/hai yêu cầu |

**Chuẩn bản địa hóa:** tiếng Việt rõ ràng, có ví dụ hợp lệ, không trách móc; nói **nguyên nhân + cách sửa**. Với trường nhạy cảm (đăng nhập, đăng ký), không tiết lộ tài khoản khác có tồn tại trừ khi sản phẩm chủ đích và không tạo nguy cơ liệt kê tài khoản.
**Chuẩn trigger mặc định:** blur với ô văn bản/định dạng; change ngay với select/radio/checkbox, sau khi tương tác; input để **xóa/cập nhật lỗi đã hiển thị**; submit để quét toàn bộ; async server check chỉ gọi khi thật cần, sau debounce/cancel và không dùng thay xác thực backend.
**Chuẩn field error:** viền + icon (nếu có) + đoạn văn dưới control; ID lỗi ổn định; `aria-invalid="true"` khi sai; `aria-describedby` trỏ đúng vùng; nhãn `<label for>`; tóm tắt lỗi ở đầu form; chuyển focus/scroll đến ô lỗi đầu tiên. Không dùng màu đỏ làm kênh nhận biết duy nhất.
**Chuẩn toast:** dùng để thông báo trạng thái chung, thành công hoặc lỗi mạng/ hệ thống; **không thay thế field error** khi đã biết ô sai. Toast lỗi tổng quát có thể đi kèm field errors nếu cần.
**Các ngoại lệ có chủ đích:** tìm kiếm và bộ lọc đơn giản không bắt buộc `required`; trạng thái không có kết quả nên là empty state, không phải lỗi form. Giá/khung giờ/tồn kho luôn cần xác minh trên server tại thời điểm xác nhận.

## 2. Cấu trúc đề xuất — ưu tiên dùng lại code hiện có
```text
Pawpal-main/
├── scripts/shared/form-validation.mjs       # MỚI ĐỀ XUẤT: rules + lifecycle + render error
├── scripts/shared/form-error-map.mjs        # MỚI ĐỀ XUẤT: map mã lỗi backend -> field
├── styles/form-validation.css               # MỚI ĐỀ XUẤT: style có scope User/Admin
├── pages/public/login/login.js             # TÍCH HỢP từng màn
├── pages/services/booking/booking.js
├── pages/shop/checkout/checkout.js
├── pages/user/modules/.../                 # TÍCH HỢP sau khi SPA mount
├── pages/admin/modules/.../                # TÍCH HỢP sau khi modal/drawer render
└── scripts/test/                             # MỚI: unit/DOM/flow validation test
```
Đây là **đề xuất file mới**, không phải khẳng định chúng đã có. Chọn `.mjs` để tái sử dụng từ ES module; các file JS Admin legacy cần adapter `import()` khi phù hợp, không đổi toàn bộ module chỉ vì validation. Không thay đổi bảng Supabase chỉ để hiển thị lỗi.
**Quy ước hợp đồng validator:** `(value, context) => null | { code, message }`; cùng rule có thể dùng ở client và server khi chung môi trường/runtime, nhưng backend luôn kiểm tra độc lập. Tách rules **định dạng** khỏi rules **nghiệp vụ có dữ liệu realtime**.

## 3. Ví dụ UI đúng chuẩn — tên, SĐT, lỗi email từ server
```html
<form id="profileEditForm" novalidate>
  <div class="pp-form-field">
    <label for="profileEmailInput">Email</label>
    <input id="profileEmailInput" name="email" type="email"
           autocomplete="email" aria-describedby="profileEmailHint profileEmailError">
    <p id="profileEmailHint" class="pp-field-hint">Ví dụ: ban@gmail.com</p>
    <p id="profileEmailError" class="pp-field-error" hidden></p>
  </div>
  <div id="profileFormSummary" class="pp-form-summary" tabindex="-1" hidden></div>
  <button type="button" id="btnSaveProfile">Lưu thay đổi</button>
</form>
```
Lưu ý: trên User Portal đã có vùng lỗi `profileEmailError`, **không tạo ID mới trùng**. Ví dụ HTML này chỉ minh họa cấu trúc chuẩn; khi tích hợp hãy sửa markup hiện tại. Với Admin, tiếp tục tuân thủ `AGENTS.md`: nút Lưu modal là `type="button"`, chống form submit gây reload.
```css
/* Đề xuất thêm vào styles/form-validation.css; không dùng gradient */
.pp-form-field [aria-invalid="true"],
.admin-form-field [aria-invalid="true"] {
  border: 1px solid #B42318;
  outline-offset: 2px;
}
.pp-field-error, .admin-field-error {
  display: block;
  margin-top: 4px;
  color: #A12525;
  font-size: 12px;
  line-height: 1.45;
}
.pp-field-error[hidden], .admin-field-error[hidden],
.pp-form-summary[hidden], .admin-form-summary[hidden] { display: none !important; }
.pp-form-field :focus-visible, .admin-form-field :focus-visible {
  outline: 2px solid #236B48;
}
.pp-form-summary, .admin-form-summary {
  margin-block: 12px;
  padding: 10px 12px;
  border-inline-start: 3px solid #B42318;
  background: transparent;
}
@media (prefers-reduced-motion: reduce) {
  .pp-form-field *, .admin-form-field * { scroll-behavior: auto; transition: none; }
}
```
Trong Admin, chuẩn **bo góc 9px, bề mặt phẳng, không gradient/box lồng box** vẫn theo `AGENTS.md`. CSS trên chỉ giới hạn ở vùng form để tránh ảnh hưởng tất cả bảng, filter và input tìm kiếm.

## 4. Mẫu engine JavaScript dùng chung (tham khảo triển khai)
Mục tiêu: render lỗi an toàn qua `textContent`, không ép toàn bộ PawPal dùng framework mới; đăng ký/hủy listeners khi trang SPA hoặc modal được mount/unmount; hỗ trợ kiểm tra qua `validate()` gọi từ nút `type="button"`.
```js
// scripts/shared/form-validation.mjs — mã ví dụ, chưa tích hợp vào code thật
export function createFormValidator({ root, rules, summaryId }) {
  if (!root) throw new Error('Missing form root');
  const touched = new Set();
  const cleanups = [];
  const errorTexts = new Map();
  const controls = new Map();
  const summary = summaryId ? root.querySelector(`#${summaryId}`) : null;

  for (const [field, rule] of Object.entries(rules)) {
    const input = root.querySelector(`[name="${field}"]`) || root.querySelector(`#${field}`);
    if (!input) { console.warn(`Validation control not found: ${field}`); continue; }
    controls.set(field, input);
    const id = `${input.id || field}-error`;
    let error = root.querySelector(`#${id}`);
    if (!error) {
      error = document.createElement('p');
      error.id = id;
      error.className = 'pp-field-error';
      error.hidden = true;
      // Tích hợp thực tế: đặt sau wrapper radio/combobox khi phù hợp.
      input.insertAdjacentElement('afterend', error);
    }
    errorTexts.set(field, error);
    const describedBy = (input.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
    if (!describedBy.includes(id)) input.setAttribute('aria-describedby', [...describedBy, id].join(' '));
    const validateOne = () => {
      const issue = rule(input.value, { root, input, field });
      showFieldError(field, issue?.message || '');
      return !issue;
    };
    const onBlur = () => { touched.add(field); validateOne(); };
    const onInput = () => { if (touched.has(field) || input.getAttribute('aria-invalid') === 'true') validateOne(); };
    const onChange = () => { touched.add(field); validateOne(); };
    input.addEventListener('blur', onBlur);
    input.addEventListener('input', onInput);
    input.addEventListener('change', onChange);
    cleanups.push(() => {
      input.removeEventListener('blur', onBlur);
      input.removeEventListener('input', onInput);
      input.removeEventListener('change', onChange);
    });
  }

  function showFieldError(field, message) {
    const input = controls.get(field);
    const error = errorTexts.get(field);
    if (!input || !error) return;
    error.textContent = message; // KHÔNG innerHTML với message từ server
    error.hidden = !message;
    if (message) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }

  function validate({ focus = true } = {}) {
    let firstInvalid;
    let count = 0;
    for (const [field, rule] of Object.entries(rules)) {
      const input = controls.get(field);
      if (!input || input.disabled) continue;
      touched.add(field);
      const issue = rule(input.value, { root, input, field });
      showFieldError(field, issue?.message || '');
      if (issue) { count++; firstInvalid ||= input; }
    }
    if (summary) {
      summary.hidden = count === 0;
      summary.textContent = count ? `Có ${count} trường cần kiểm tra. Vui lòng sửa các ô được đánh dấu.` : '';
    }
    if (focus && firstInvalid) {
      // Nếu ô nằm trong tab/panel đang ẩn: MỞ panel trước khi gọi focus.
      firstInvalid.focus({ preventScroll: false });
    }
    return count === 0;
  }

  function applyServerErrors(fieldErrors = {}, formMessage = '') {
    let firstInvalid;
    for (const [field, message] of Object.entries(fieldErrors)) {
      if (!controls.has(field)) continue;
      touched.add(field);
      showFieldError(field, String(message));
      firstInvalid ||= controls.get(field);
    }
    if (summary) {
      summary.hidden = !(formMessage || firstInvalid);
      summary.textContent = formMessage || 'Có dữ liệu chưa hợp lệ. Vui lòng kiểm tra các ô được đánh dấu.';
    }
    firstInvalid?.focus();
  }

  return { validate, showFieldError, applyServerErrors,
    destroy() { cleanups.forEach(fn => fn()); controls.clear(); errorTexts.clear(); } };
}
```
**Giới hạn của ví dụ:** engine trên dùng value từ control đơn. Khi triển khai radio/checkbox group, ngày–giờ, upload, multiselect, input sinh động/Shadow DOM, cần **adapter theo nhóm**; không dùng nguyên mẫu cho mọi form. Nếu `id`/`name` có ký tự đặc biệt, không ghép thẳng vào selector; dùng `CSS.escape()` hoặc mapping đến HTMLElement đã biết. Không dùng `aria-live="assertive"` trên mỗi ô vì gây đọc lặp; vùng summary có thể dùng `role="alert"` khi submit.
```js
// Ví dụ tích hợp cho User Profile, chỉ minh họa flow (không ghi đè code sẵn có).
const validator = createFormValidator({
  root: document.getElementById('profileEditForm'),
  summaryId: 'profileFormSummary',
  rules: {
    profileEmailInput: (value) => value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
      ? { code: 'EMAIL_FORMAT', message: 'Email chưa đúng định dạng. Ví dụ: ban@gmail.com.' }
      : null
  }
});

async function saveProfile() {
  if (!validator.validate()) return;
  const button = document.getElementById('btnSaveProfile');
  if (button.dataset.busy === '1') return;
  button.dataset.busy = '1'; button.disabled = true;
  try {
    const result = await saveProfileThroughExistingApi(); // thay bằng hàm có thật
    if (!result?.success) throw result?.error || new Error('Save failed');
    showExistingSuccessToast('Đã lưu thông tin');
  } catch (error) {
    const mapped = mapApiFieldErrors(error, { context: 'profile' });
    validator.applyServerErrors(mapped.fieldErrors, mapped.formMessage);
  } finally {
    button.dataset.busy = '0'; button.disabled = false;
  }
}
// SPA unmount: validator.destroy();
```
Các hàm `saveProfileThroughExistingApi`, `showExistingSuccessToast` và `mapApiFieldErrors` trong ví dụ là **điểm nối giả định**, phải thay bằng hàm thật sau khi kiểm tra code, không được copy nguyên rồi coi là chức năng chạy được.

## 5. Hợp đồng lỗi API/Supabase — phân biệt lỗi thuộc trường và lỗi hệ thống
**Đề xuất cho API mới/được nâng cấp** (không phải định dạng API hiện có của PawPal):
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Có thông tin cần kiểm tra lại.",
    "fields": {
      "phone": { "code": "PHONE_FORMAT", "message": "Số điện thoại cần có 10 chữ số, bắt đầu bằng 0." },
      "email": { "code": "EMAIL_TAKEN", "message": "Email này đã được sử dụng." }
    },
    "requestId": "req_..."
  }
}
```
| Nguồn/mã lỗi | Bản chất | Cách hiển thị | Ghi chú bảo mật |
| --- | --- | --- | --- |
| Client required/format/range | Chưa nhập/định dạng/range | Dưới input thật ngay blur/submit | Không gửi request khi rule chắc chắn sai |
| HTTP 400/422 + `fields` | Backend từ chối dữ liệu cụ thể | Ánh xạ key allowlist tới đúng field | Không tin HTML/JS hay trường tùy ý do server trả |
| Postgres `23505` unique | Trùng email/SĐT/mã nếu constraint xác định | Gắn đúng email/phone/code nếu **constraint name được allowlist** | Không phân tích string lỗi rồi đoán bất kỳ trường |
| Postgres `23502` not-null | Thiếu cột bắt buộc | Map field nếu biết cột an toàn, nếu không hiện toàn form | Không lộ tên cột nhạy cảm |
| Postgres `23503` FK | Tham chiếu không còn hoặc không thuộc quyền | Chọn lại pet/customer/order/service phù hợp | Không tiết lộ tài nguyên người khác |
| Postgres `23514` CHECK | Ràng buộc enum/range | Lỗi dưới field nếu map được | Backend vẫn validate enum chính thức |
| Postgres `22P02` invalid text | Giá trị định danh/kiểu dữ liệu không hợp lệ | Lỗi chung hoặc lựa chọn liên quan | Không gửi raw SQL cho khách |
| HTTP 401 | Phiên hết hạn | Thông báo cấp form + hành động đăng nhập lại | Không vô hiệu hóa nhầm dữ liệu đã nhập |
| HTTP 403 / RLS | Không đủ quyền | Thông báo cấp form, không suy đoán nội dung | Không diễn đạt là “trường X sai” |
| HTTP 409 / revision mismatch | Conflict/stale dữ liệu | Banner conflict, làm mới có xác nhận, giữ draft | Không silent overwrite |
| HTTP 429 | OTP/rate limit | Gợi ý thời gian thử lại nếu server trả thời gian tin cậy | Không tiết lộ người dùng khác |
| Timeout/5xx/offline | Mạng/hệ thống | Banner toàn form + retry có kiểm soát | Không phát sinh duplicate order/payment/ticket |

**Quan trọng:** `IF error then showToast(error.message)` là chưa đủ: phải phân loại theo ngữ nghĩa. Từng form cung cấp bảng `serverFieldMap` ánh xạ giữa tên cột DB, tên field JSON, và `id` input HTML; không assume `customer.email` trùng `registerEmail` (đăng ký hiện dùng SĐT).
```js
// scripts/shared/form-error-map.mjs — ví dụ adapter *dành riêng* cho hồ sơ.
export function mapProfileError(error) {
  const code = error?.code || error?.error?.code;
  const constraint = error?.constraint || error?.error?.constraint;
  // Khuyến nghị: backend trả mã ổn định; frontend không parse error.message để suy ra cột.
  if (code === 'EMAIL_TAKEN' || (code === '23505' && constraint === 'customer_email_key')) {
    return { fieldErrors: { profileEmailInput: 'Email đã được sử dụng. Hãy chọn email khác.' }, formMessage: '' };
  }
  if (code === 'PROFILE_REVISION_CONFLICT' || code === 'REVISION_CONFLICT') {
    return { fieldErrors: {}, formMessage: 'Hồ sơ đã thay đổi ở phiên khác. Vui lòng kiểm tra lại trước khi lưu.' };
  }
  return { fieldErrors: {}, formMessage: 'Không thể lưu lúc này. Thông tin bạn đã nhập vẫn được giữ lại.' };
}
```
**Chú ý:** `customer_email_key` chỉ là **ví dụ tên constraint**, phải lấy tên thực từ Supabase trước khi dùng; không gán mặc định. Quy tắc xử lý lỗi đăng ký/đăng nhập/khôi phục mật khẩu phải đánh giá rủi ro liệt kê tài khoản (account enumeration) riêng.

## 6. Bộ quy tắc nghiệp vụ cần thống nhất trước khi mã hóa
| Loại dữ liệu | Rule client ví dụ | Rule bắt buộc xác nhận phía server | Lỗi dễ hiểu |
| --- | --- | --- | --- |
| Họ tên | Trim, không toàn dấu cách; giới hạn theo schema | Giới hạn cột/constraint, xử lý Unicode | “Vui lòng nhập họ tên, không chỉ dấu cách.” |
| SĐT VN | Ở các form đang yêu cầu SĐT VN: `^0\d{9}$` | Chuẩn hóa/tránh trùng/quyền tài khoản | “Số điện thoại cần 10 chữ số, bắt đầu bằng 0.” |
| Email | Nếu không bắt buộc thì cho phép trống; nếu có thì đúng định dạng | Unique/đối soát tùy nghiệp vụ | “Email chưa đúng định dạng, ví dụ: ban@gmail.com.” |
| Mật khẩu | Theo chính sách auth thực tế: tối thiểu 8, có số/ký tự đặc biệt, tối đa 128 | Backend auth là nguồn quyết định cuối | “Thêm ít nhất 1 chữ số và 1 ký tự đặc biệt.” |
| OTP | 6 chữ số, hết hạn, giới hạn thử lại | Challenge/expiry/rate limit ở backend | “Mã OTP chưa đủ 6 số.” / “Mã đã hết hạn.” |
| Cân nặng pet | Số hữu hạn >0; đơn vị hiển thị nhất quán | Dải hợp lý theo nghiệp vụ/chỉ định CSDL | “Cân nặng phải lớn hơn 0 kg.” |
| Ngày sinh pet | Ngày hợp lệ, không tương lai | DOB hợp lệ và không vi phạm trigger | “Ngày sinh không thể ở tương lai.” |
| Loài khác | Chỉ required khi chọn Khác | Map enum loài + trường diễn giải | “Bạn hãy ghi rõ loại thú cưng.” |
| Ngày giờ đặt lịch | Không quá khứ, ngày kết thúc sau ngày bắt đầu | Lịch trống, nhân viên, năng lực, timezone | “Khung giờ vừa được đặt, vui lòng chọn giờ khác.” |
| Hotel | Check-out sau check-in, số ngày/đêm hợp lệ | Giá dịch vụ và lịch trống mới nhất | “Ngày trả bé phải sau ngày nhận bé.” |
| Taxi | Địa chỉ đón/trả không trống, đủ định vị/đơn vị cự ly | Vùng phục vụ/bảng giá/khả dụng | “Vui lòng nhập địa chỉ trả bé.” |
| Số lượng mua | Số nguyên dương theo biến thể sản phẩm | Tồn kho và giới hạn mua mới nhất | “Hiện chỉ còn N sản phẩm, hãy giảm số lượng.” |
| Địa chỉ giao hàng | Người nhận, phone, đường, tỉnh, huyện khi cần | Địa bàn hỗ trợ, địa chỉ thuộc chủ sở hữu | “Bạn chưa chọn Quận/Huyện.” |
| Xuất hóa đơn | Chỉ required khi tick yêu cầu hóa đơn | Quy tắc hóa đơn đang áp dụng | “Vui lòng nhập mã số thuế.” |
| Voucher / điểm | Định dạng mã, điểm không âm | Hiệu lực/đối tượng/tổng tiền/không cộng trùng | “Mã đã hết hạn” / “Không đủ điểm áp dụng”. |
| Tệp minh chứng | Type/MIME/size theo từng màn | MIME sniffing/scan/quota ở server | “Ảnh vượt 5 MB. Hãy chọn ảnh nhỏ hơn.” |
| Trạng thái nghiệp vụ Admin | Chỉ chọn enum thực tế | Quyền chuyển trạng thái hợp lệ | “Không thể chuyển sang trạng thái này.” |
| Giá/phụ phí/điểm | Số hợp lệ; không âm; làm tròn đúng đơn vị | Ràng buộc DB + quyền duyệt | “Số tiền phải lớn hơn 0.” |
| Đánh giá | Rating nằm trong dải hỗ trợ, bình luận theo policy | Khách sở hữu giao dịch, không đánh giá trùng | “Vui lòng chọn số sao.” |

Không tự áp trần cân nặng, giới hạn ký tự, giá tiền, ngày đặt trước hay phương thức thanh toán nếu **chưa kiểm tra đúng schema/rule hiện hành**. Những dải nói trên là yêu cầu xác minh/đề xuất, không được coi đã tồn tại trong DB.

## 7. Lộ trình theo 18 giai đoạn — có điều kiện nghiệm thu rõ ràng
### GĐ-00 — Audit & baseline toàn bộ form
**Ưu tiên:** P0 · **Mục tiêu nghiệm thu:** Kiểm kê field thật, xác nhận branch/commit, Supabase thực tế; không chỉnh code ngay.
**Cập nhật 20/10/2026:** ĐANG THỰC HIỆN — chưa đạt gate GĐ-00, chưa sửa mã chức năng. Các mục dưới đây mới hoàn thành một phần nên giữ checkbox chưa tích. [Báo cáo và bằng chứng](../audits/gd00-20261020/README.md).

- [ ] **VAL-00-01:** Đóng băng mã commit đang test; chụp backup và gắn phiên bản ZIP.
  - **Đã làm:** ghi branch `main`, HEAD đầu đợt `9a2d45224d6ac489170e4afdc2b9a749810e2d4c`; lưu trạng thái, tracked diff có sẵn và hash nguồn trong thư mục audit.
  - **Còn lại:** xác minh ZIP/backup đầy đủ; chốt lại baseline vì HEAD đổi trong đợt audit thành `b078d165fc131e7048eab4449e4d1a1dc2068031` do hoạt động ngoài audit. Chưa đóng băng phiên bản xuyên suốt.
- [ ] **VAL-00-02:** Liệt kê từng trang, từng modal/drawer, wizard và form do JS render; so với phụ lục kiểm kê tự động bên dưới.
  - **Đã làm:** kiểm kê 47 file HTML, 83 form và 798 control tĩnh, khớp số đếm phụ lục; xuất [forms.csv](../audits/gd00-20261020/forms.csv) và [fields.csv](../audits/gd00-20261020/fields.csv). Script kiểm kê chạy exit `0`.
  - **Còn lại:** rà 1.731 dòng tín hiệu JavaScript và mở các form động/modal/drawer/wizard; số tín hiệu không phải số form hay coverage E2E.
- [ ] **VAL-00-03:** Phân loại field là input, select, radio, checkbox, tệp, ngày/giờ, autocomplete, read-only hoặc filter.
  - **Đã làm:** ghi type, id/name, required, readonly/disabled, ARIA, pattern và min/max/maxlength; phân loại sơ bộ hidden, readonly, search/filter và editable trong fields.csv.
  - **Còn lại:** xác nhận phân loại nghiệp vụ, autocomplete, nhóm trường và điều kiện hiển thị theo từng form; chưa tự đặt thêm required.
- [ ] **VAL-00-04:** Đánh dấu field quan trọng; tách lỗi field, lỗi cross-field, lỗi nghiệp vụ, lỗi mạng, lỗi xác thực.
  - **Đã làm:** lập backlog GD00-01–07, phân tầng UI/API/DB/flow; ưu tiên P0 cho contact, checkout, profile và xác minh DB, P1 cho modal khách hàng/lifecycle.
  - **Còn lại:** rà sâu và phân loại đầy đủ các form còn lại, lỗi cross-field, mạng và xác thực.
- [ ] **VAL-00-05:** Đối chiếu loại field với `CDSLfinal.md`, `enum.md`, constraints, API response và RLS thực tế.
  - **Đã làm:** đọc cấu trúc customer/customer_profile/customer_address, enum nghiệp vụ và migration phone/weight tiêu biểu; ghi các điểm cần đối chiếu trong báo cáo.
  - **Còn lại — NOT RUN:** schema/constraint/index/trigger/RLS live và API response thực tế; chưa xác nhận migration đã apply, chưa chạy migration hoặc sửa CSDL.
- [ ] **VAL-00-06:** Xác minh tính tồn tại của `scripts/shared/address-validation.mjs` trên deployment/GitHub.
  - **Đã làm:** xác minh file tồn tại local, được profile.js và customer_profile_persistence.js import; nghi vấn thiếu file trong ZIP không được coi là lỗi local hiện tại.
  - **Còn lại — NOT RUN:** xác minh artifact deployment và GitHub tương ứng.
- [ ] **VAL-00-07:** Lấy baseline screenshot của form lỗi ở desktop/mobile; lưu Console/Network, thời gian xử lý và hành vi focus.
  - **Đã chạy:** Admin → Khách hàng → Thêm khách → để trống → Lưu: popup native tiếng Anh `Please fill out this field.`, focus `quickAddName`; **FAIL so với UX mục tiêu**. Đóng modal bằng nút Đóng thành công. [Ảnh desktop baseline](../audits/gd00-20261020/customer-empty-baseline.png).
  - **Còn lại — NOT RUN:** mobile, Console/Network, thời gian, positive/save/F5/DB và các form khác. Đây chỉ là phần required của FM-037; chưa hoàn thành FM-037/E2E-ADMIN-01, chưa xác nhận số request ghi bằng Network.
- [ ] **VAL-00-08:** Kiểm tra file AGENTS.md/SPA mount conventions/Admin modal actions, không phá rule thiết kế.
  - **Đã làm:** đọc toàn bộ AGENTS.md và global modal handler; ghi nhận quy tắc Admin text-only ngoài sidebar, không viền trái summary, kiểm từng modal theo mục 8. Đã quan sát mở/đóng modal Thêm khách.
  - **Còn lại:** kiểm mount/unmount, listener trùng, data-close-modal và đủ các cách đóng trên toàn hệ thống; chưa kết luận mọi modal đúng.
- [ ] **VAL-00-09:** Tạo backlog theo form: P0/P1/P2, owner, thời hạn, nguyên nhân, test ID liên quan.
  - **Đã làm:** backlog GD00-01–07 có ưu tiên, bằng chứng/nguyên nhân hoặc nghi vấn và mã VAL/FM liên quan; owner thực hiện Codex, thứ tự xử lý đề xuất đã ghi trong báo cáo.
  - **Còn lại:** hoàn thiện backlog toàn bộ form, nhóm P2 và thời hạn cụ thể; chưa có cam kết ngày hoàn tất.
- [ ] **VAL-00-10:** Báo cáo phân biệt lỗi đã xác minh với các nghi vấn từ đọc tĩnh; không mặc định DB test đã PASS.
  - **Đã làm:** lưu báo cáo riêng, tách FAIL UI đã tái hiện ở FM-037 với phát hiện từ mã (contact tự tạo mã hỗ trợ, checkout toast chung, profile Error chuỗi) và các mục DB/deployment chưa xác minh.
  - **Còn lại:** bổ sung bằng chứng cho phạm vi chưa kiểm và nghiệm thu cuối GĐ-00. Không đánh dấu PASS từ việc đọc mã hoặc script kiểm kê chạy thành công.

**Gate GĐ-00:** Chỉ chuyển qua giai đoạn kế tiếp khi các ca P0 của giai đoạn đạt kiểm thử thực tế; mục chưa thể test ghi `BLOCKED` + lý do + owner, không ghi PASS.
**Kết quả gate hiện tại:** CHƯA ĐẠT — tiếp tục GĐ-00; chưa chuyển GĐ-01. Các mục chưa thực thi ghi NOT RUN, không tự coi là BLOCKED.
### GĐ-01 — UX design system và nội dung tiếng Việt
**Ưu tiên:** P1 · **Mục tiêu nghiệm thu:** Một thông điệp dễ hiểu, một kiểu hiển thị, không phá nhận diện PawPal.
- [ ] **VAL-01-01:** Định nghĩa `pristine`, `touched`, `invalid`, `pending`, `valid`, `server-error`, `conflict`.
- [ ] **VAL-01-02:** Thiết kế field helper, error, success, required/optional; test màu sắc/contrast.
- [ ] **VAL-01-03:** Định vị lỗi dưới đúng ô, radio group, checkbox group, lựa chọn autocomplete, upload/drag-drop.
- [ ] **VAL-01-04:** Chuẩn toast bổ sung, không thay cho field errors; summary khi form có nhiều lỗi.
- [ ] **VAL-01-05:** Nhất quán viền/surface Admin 9px, solid, không gradient, không hộp lồng hộp.
- [ ] **VAL-01-06:** Bản mobile 320px/375px/768px; không bị bàn phím ảo che lỗi.
- [ ] **VAL-01-07:** Soạn error copy tiếng Việt theo loại dữ liệu và trường, có hướng sửa, không đổ lỗi cho khách.
- [ ] **VAL-01-08:** Giữ đủ label và mô tả ngắn khi input không lỗi; lỗi không đẩy nút ra ngoài màn hình.
- [ ] **VAL-01-09:** Dùng icon + chữ chứ không chỉ màu; thêm `aria-invalid`, `aria-describedby`, focus visible.
- [ ] **VAL-01-10:** Chốt component style scope `.pp-`/`.admin-` và tránh đụng tìm kiếm/filter không cần validate.

**Gate GĐ-01:** Chỉ chuyển qua giai đoạn kế tiếp khi các ca P0 của giai đoạn đạt kiểm thử thực tế; mục chưa thể test ghi `BLOCKED` + lý do + owner, không ghi PASS.
### GĐ-02 — Shared validation engine, lifecycle và unit test
**Ưu tiên:** P0 · **Mục tiêu nghiệm thu:** Tạo adapter reusable mà không buộc refactor toàn bộ legacy JS.
- [ ] **VAL-02-01:** Triển khai helper `createFormValidator` và field adapters (text, number, date, phone, email, select).
- [ ] **VAL-02-02:** Hỗ trợ radio/checkbox groups: lỗi hiển thị tại legend/wrapper, không dán sau từng radio.
- [ ] **VAL-02-03:** Hỗ trợ conditional required: `loài khác`, xuất hóa đơn, khách vãng lai/thành viên, các bước wizard.
- [ ] **VAL-02-04:** Hỗ trợ `validate({focus:true})`, `applyServerErrors`, `reset`, `destroy` khi SPA unmount.
- [ ] **VAL-02-05:** Xóa listener đúng lúc; không thêm listener trùng khi mở modal 10 lần.
- [ ] **VAL-02-06:** Không dùng `innerHTML` để chèn error text từ server.
- [ ] **VAL-02-07:** Không dùng `setCustomValidity` vĩnh viễn; clear khi input hợp lệ.
- [ ] **VAL-02-08:** Giữ nguyên aria-describedby hiện có, thêm ID lỗi ổn định, không tạo trùng ID.
- [ ] **VAL-02-09:** Tự động focus trường sai đầu tiên sau khi mở tab/collapse chứa nó.
- [ ] **VAL-02-10:** Viết unit tests cho required, whitespace, unicode, phone, email, number, date, group fields.
- [ ] **VAL-02-11:** Test duplicate submit, async race condition, stale field error và network failure.
- [ ] **VAL-02-12:** Làm POC cho 1 form Guest + 1 form Admin trước khi rollout diện rộng.

**Gate GĐ-02:** Chỉ chuyển qua giai đoạn kế tiếp khi các ca P0 của giai đoạn đạt kiểm thử thực tế; mục chưa thể test ghi `BLOCKED` + lý do + owner, không ghi PASS.
### GĐ-03 — API/Supabase error contract & data safety
**Ưu tiên:** P0 · **Mục tiêu nghiệm thu:** Chuyển lỗi backend thành thông báo dễ hiểu tại trường mà không mất tính xác thực.
- [ ] **VAL-03-01:** Thiết kế JSON API error ổn định (`code`, `fields`, `message`, `requestId`) cho endpoint do dự án kiểm soát.
- [ ] **VAL-03-02:** Tạo allowlist map Postgres 23505/23503/23514/23502 sang field đúng khi biết constraint.
- [ ] **VAL-03-03:** Không suy đoán mã field từ chuỗi SQL thô; không render `error.message` bằng innerHTML.
- [ ] **VAL-03-04:** Xác minh error response thực tế API auth, customer profile, checkout, booking, ticket và các endpoint admin.
- [ ] **VAL-03-05:** Tách lỗi validation 400/422, auth 401, quyền 403, conflict 409, giới hạn 429, hạ tầng 5xx.
- [ ] **VAL-03-06:** Lỗi RLS không được công bố tồn tại dữ liệu khách khác; không lộ enum/schema/SQL.
- [ ] **VAL-03-07:** Không tạo giao dịch thành công giả; chỉ thông báo lưu thành công sau response/backend state xác minh.
- [ ] **VAL-03-08:** Giữ dữ liệu đã nhập khi mạng lỗi; vô hiệu hóa double submit; có idempotency key cho giao dịch quan trọng.
- [ ] **VAL-03-09:** Kiểm tra server validation độc lập khi bỏ qua client (DevTools/direct API).
- [ ] **VAL-03-10:** Đảm bảo lỗi cross-field hiển thị ở nhóm phù hợp (ngày vào/ngày ra, địa chỉ/huyện/tỉnh, voucher/tổng tiền).
- [ ] **VAL-03-11:** Log mã lỗi nội bộ/requestId, không log mật khẩu/OTP/dữ liệu thẻ.

**Gate GĐ-03:** Chỉ chuyển qua giai đoạn kế tiếp khi các ca P0 của giai đoạn đạt kiểm thử thực tế; mục chưa thể test ghi `BLOCKED` + lý do + owner, không ghi PASS.
### GĐ-04 — Public Auth (Login, Register, OTP, Reset)
**Ưu tiên:** P0 · **Mục tiêu nghiệm thu:** Mọi lỗi ở bước xác thực phải rõ và không lộ dữ liệu tài khoản.
- [ ] **VAL-04-01:** `loginPhone` rỗng/sai 10 số → lỗi dưới phone trước khi Tiếp tục.
- [ ] **VAL-04-02:** `loginPassword` trống → lỗi dưới password; mật khẩu sai → phản hồi an toàn theo policy auth.
- [ ] **VAL-04-03:** `registerName` trống/toàn khoảng trắng/quá dài → lỗi dưới tên.
- [ ] **VAL-04-04:** `registerPhone` sai định dạng → lỗi đúng trường; lỗi đã tồn tại xử lý chống enumeration.
- [ ] **VAL-04-05:** `registerPassword` thiếu số/ký tự đặc biệt/dưới 8/trên 128 → thông điệp cụ thể.
- [ ] **VAL-04-06:** `registerConfirmPassword` không khớp → lỗi tại ô xác nhận, xóa khi sửa.
- [ ] **VAL-04-07:** OTP chưa đủ 6 chữ số → lỗi nhóm OTP; sai/hết hạn/quá lần → thông điệp riêng.
- [ ] **VAL-04-08:** OTP resend không tạo luồng đua; countdown/quota rõ ràng, không bấm liên tục.
- [ ] **VAL-04-09:** `forgotPhone` / `forgotNewPassword` / `forgotConfirmNewPassword` xử lý như luồng đăng ký.
- [ ] **VAL-04-10:** `setupPassword`, `setupConfirmPassword`, `setupTermsCheckbox` hiện đúng lỗi.
- [ ] **VAL-04-11:** Bật lại submit khi sửa hợp lệ; không khóa nút mãi vì form bị đánh giá sai.
- [ ] **VAL-04-12:** Test từng màn `show()`/back/refresh, không lỗi tồn đọng ở tab khác, không mất redirect an toàn.

**Gate GĐ-04:** Chỉ chuyển qua giai đoạn kế tiếp khi các ca P0 của giai đoạn đạt kiểm thử thực tế; mục chưa thể test ghi `BLOCKED` + lý do + owner, không ghi PASS.
### GĐ-05 — Public Contact, Blog, Return Guest, Landing
**Ưu tiên:** P1 · **Mục tiêu nghiệm thu:** Khách chưa có tài khoản vẫn được báo lỗi rõ khi liên hệ, nhận ưu đãi, phản hồi.
- [ ] **VAL-05-01:** `pages/public/contact/contact.js`: map `fullName`, `phoneNumber`, `serviceInterest`, `message` vào error spans.
- [ ] **VAL-05-02:** SĐT liên hệ sai → lỗi dưới `phoneNumber`; tin nhắn chỉ dấu cách → lỗi dưới `message`.
- [ ] **VAL-05-03:** Khách gửi yêu cầu không có session → backend kiểm tra đúng guest flow.
- [ ] **VAL-05-04:** Không reset form khi ticket chưa được server xác nhận; không dùng mã ticket giả làm bằng chứng lưu.
- [ ] **VAL-05-05:** `pages/public/landing/landing.html`: `bookingName`, `bookingPhone`, `bookingService` có lỗi theo từng ô.
- [ ] **VAL-05-06:** `pages/public/return-guest/return-guest.html`: `rg-phone` có hint, errors, rate limit UX.
- [ ] **VAL-05-07:** Blog-detail: `commentAuthorInput`, `commentEmailInput`, `commentContentInput` được kiểm tra.
- [ ] **VAL-05-08:** Email bản tin blog nếu hiện có submit → chuẩn hóa định dạng, không hiện lỗi vô cớ khi để trống nếu optional.
- [ ] **VAL-05-09:** Nút/đường dẫn điều hướng từ Header/Footer không chặn bởi form lỗi unrelated.
- [ ] **VAL-05-10:** Test kết nối mất trong lúc submit, retry không tạo 2 ticket/comment.

**Gate GĐ-05:** Chỉ chuyển qua giai đoạn kế tiếp khi các ca P0 của giai đoạn đạt kiểm thử thực tế; mục chưa thể test ghi `BLOCKED` + lý do + owner, không ghi PASS.
### GĐ-06 — Booking Spa/Grooming/Hotel/Taxi cho Guest/Member
**Ưu tiên:** P0 · **Mục tiêu nghiệm thu:** Giữ validation sẵn có tại `validateGuestInput`; bổ sung lỗi ở từng bước và dữ liệu nguồn server.
- [ ] **VAL-06-01:** Giữ và chuẩn hóa lỗi `ownerName`, `ownerPhone`, `memberOwnerName`, `memberOwnerPhone`.
- [ ] **VAL-06-02:** `petName`, `petType`, `petTypeOther`, `petWeight` đúng field; khi đổi Khác→Chó lỗi “loài khác” phải ẩn và không chặn tiếp tục.
- [ ] **VAL-06-03:** Cân nặng âm/0/chữ/NaN, ngày sinh không hợp lệ nếu có → lỗi ngay trường.
- [ ] **VAL-06-04:** Dịch vụ chưa chọn/chọn loại sai → card dịch vụ lỗi rõ và đưa viewport tới bước dịch vụ.
- [ ] **VAL-06-05:** Lịch Spa có ngày trong quá khứ/giờ hết slot → lỗi cạnh `bookingDate`/khung giờ.
- [ ] **VAL-06-06:** Hotel: `checkInDate`, `checkOutDate` sai quan hệ ngày → báo dưới trường kết thúc.
- [ ] **VAL-06-07:** Số lượng addons `addonWalkQty`/`addonPlayQty`/`addonBathQty` không hợp lệ → lỗi dưới input tương ứng khi addon đã chọn.
- [ ] **VAL-06-08:** Taxi: thông tin đón/trả và tính giá nếu form động → xác minh field JS sinh, không tưởng tượng ID.
- [ ] **VAL-06-09:** Voucher `bookingVoucherInput` hết hạn/không đủ điều kiện → lỗi dưới mã, giữ giá gốc.
- [ ] **VAL-06-10:** `policyCheck` chưa tick → lỗi cạnh checkbox; focus được tới khối policy.
- [ ] **VAL-06-11:** Quick-add pet `quickPetOwnerPhone`, `quickPetName`, `quickPetSpecies`, `quickPetWeight` kiểm riêng trong modal.
- [ ] **VAL-06-12:** Khung giờ bị chiếm sau khi người dùng chọn → server trả slot conflict và cho chọn lại mà không mất hồ sơ.
- [ ] **VAL-06-13:** Chỉ tạo 1 appointment khi bấm 2 lần/trùng request; success page dùng ID thật.

**Gate GĐ-06:** Chỉ chuyển qua giai đoạn kế tiếp khi các ca P0 của giai đoạn đạt kiểm thử thực tế; mục chưa thể test ghi `BLOCKED` + lý do + owner, không ghi PASS.
### GĐ-07 — Shop Catalog, Product Detail, Cart, Voucher
**Ưu tiên:** P1 · **Mục tiêu nghiệm thu:** Phân biệt form dữ liệu với filter, giữ giỏ hàng hợp lệ theo tồn kho thực.
- [ ] **VAL-07-01:** Bộ lọc/tìm kiếm sản phẩm không đánh lỗi required nếu để trống.
- [ ] **VAL-07-02:** `pages/shop/product-detail/product-detail.html` → `quantity` là số nguyên dương, không NaN/thập phân/0.
- [ ] **VAL-07-03:** Biến thể màu/size/hương nếu được render động: yêu cầu chọn đúng biến thể trước thêm giỏ.
- [ ] **VAL-07-04:** Tồn kho không đủ → lỗi tại số lượng hoặc lựa chọn biến thể, cập nhật lượng có thể mua.
- [ ] **VAL-07-05:** Giỏ hàng có `voucher-input` → lỗi dưới mã, không chỉ toast.
- [ ] **VAL-07-06:** Giỏ hàng không có sản phẩm → empty state, disable checkout kèm CTA quay lại shop.
- [ ] **VAL-07-07:** Số lượng giỏ vượt tồn → đúng dòng sản phẩm/biến thể; không cập nhật giá sai.
- [ ] **VAL-07-08:** Khách sửa voucher rồi áp dụng lại → lỗi cũ được xóa, tổng tiền tính lại theo server.
- [ ] **VAL-07-09:** Mất mạng lúc lưu giỏ → không báo thêm giỏ thành công nếu backend không lưu theo policy.

**Gate GĐ-07:** Chỉ chuyển qua giai đoạn kế tiếp khi các ca P0 của giai đoạn đạt kiểm thử thực tế; mục chưa thể test ghi `BLOCKED` + lý do + owner, không ghi PASS.
### GĐ-08 — Shop Checkout, Địa chỉ, Hóa đơn, Voucher, Payment
**Ưu tiên:** P0 · **Mục tiêu nghiệm thu:** Đây là vùng giá trị cao: mọi trường hợp lỗi phải gắn chính xác và giữ giỏ.
- [ ] **VAL-08-01:** Form shipping: `fullName`, `phone`, `address`, `city`, `district` đều có lỗi cạnh ô.
- [ ] **VAL-08-02:** Modal address: `modalFullName`, `modalPhone`, `modalAddress`, `modalCity`, `modalDistrict` lỗi ngay ô; không đóng modal khi invalid.
- [ ] **VAL-08-03:** Địa chỉ đã lưu thiếu trường: mở đúng phần “Sửa”, focus trường lỗi, không chỉ toast “bấm Sửa”.
- [ ] **VAL-08-04:** Đổi tỉnh→reset huyện và thông báo yêu cầu chọn lại; không giữ huyện cũ của tỉnh trước.
- [ ] **VAL-08-05:** Yêu cầu hóa đơn bật `invoice-checkbox` → kiểm `companyName`, `taxCode`, `companyAddress`, `invoiceEmail` theo rule hiện hành.
- [ ] **VAL-08-06:** Tắt hóa đơn → xóa lỗi các ô ẩn và không block checkout.
- [ ] **VAL-08-07:** Voucher `voucher-input`: rỗng, sai, hết hạn, không đúng đối tượng, đã dùng, xung đột với điểm.
- [ ] **VAL-08-08:** Paw Points slider/checkbox → khóa tối đa hợp lệ, không âm, server xác nhận số dư.
- [ ] **VAL-08-09:** Chọn phương thức thanh toán thiếu / không khả dụng → lỗi nhóm phương thức, không tạo order.
- [ ] **VAL-08-10:** Khi trả về từ thanh toán thất bại/timeout → giữ giỏ và phương án thử lại an toàn.
- [ ] **VAL-08-11:** Đơn đã tạo nhưng payment insert thất bại → hiển thị trạng thái chưa hoàn thành thật; không tự kết luận thành công.
- [ ] **VAL-08-12:** Chống double click hoàn tất/QR callback trùng; server idempotency/order details nhất quán.
- [ ] **VAL-08-13:** User Guest và Member thanh toán được theo nghiệp vụ; mọi lỗi phải trở về đúng trường hoặc step.

**Gate GĐ-08:** Chỉ chuyển qua giai đoạn kế tiếp khi các ca P0 của giai đoạn đạt kiểm thử thực tế; mục chưa thể test ghi `BLOCKED` + lý do + owner, không ghi PASS.
### GĐ-09 — User Portal: Profile, Address, Account
**Ưu tiên:** P0 · **Mục tiêu nghiệm thu:** Tận dụng `profileNameError`, `profileEmailError` hiện có; chỉ sửa logic lỗ hổng.
- [ ] **VAL-09-01:** Sửa họ tên rỗng/toàn dấu cách/độ dài theo schema → báo `profileNameError`.
- [ ] **VAL-09-02:** Email sai định dạng → `profileEmailError`, email trùng từ API → error chính xác; optional email được phép rỗng theo schema.
- [ ] **VAL-09-03:** Nếu SĐT đăng nhập không thể sửa ở profile thì readonly/giải thích; không báo field error giả.
- [ ] **VAL-09-04:** `newAddressStreetInput`, `newAddressDistrictInput`, `newAddressCityInput` có lỗi cụ thể.
- [ ] **VAL-09-05:** Thêm địa chỉ trùng / quá số lượng / địa chỉ mặc định không duy nhất → thông điệp đúng nhóm.
- [ ] **VAL-09-06:** Không reset `tempAddresses` khi profile API fail; giữ dữ liệu user nhập trong modal.
- [ ] **VAL-09-07:** Revision conflict → thông báo có người/phiên khác sửa, không ghi đè im lặng.
- [ ] **VAL-09-08:** Kiểm tra import `address-validation.mjs` tồn tại và rules đồng nhất client/backend.
- [ ] **VAL-09-09:** Modal đóng/reopen làm sạch error cũ nhưng giữ draft theo chính sách, không duplicate event handlers.
- [ ] **VAL-09-10:** F5/đăng nhập trên thiết bị khác thấy cùng hồ sơ sau khi thật sự lưu thành công.

**Gate GĐ-09:** Chỉ chuyển qua giai đoạn kế tiếp khi các ca P0 của giai đoạn đạt kiểm thử thực tế; mục chưa thể test ghi `BLOCKED` + lý do + owner, không ghi PASS.
### GĐ-10 — User Portal: Pets, Settings, Password
**Ưu tiên:** P1 · **Mục tiêu nghiệm thu:** Form thú cưng và mật khẩu cần thông báo ngay từng trường, không chỉ khóa nút.
- [ ] **VAL-10-01:** `petName`, nhóm radio species, `otherSpecies` có lỗi đúng khu vực.
- [ ] **VAL-10-02:** `weight` > 0, `dob` không ở tương lai, `breed`/`color` theo ràng buộc hiện hành.
- [ ] **VAL-10-03:** Upload `avatar-input`, `vaccine-card-input`: định dạng/size rõ; reset file invalid mà không mất phần text.
- [ ] **VAL-10-04:** Nhiều hồ sơ pet có id khác nhau: không gắn nhầm lỗi khi sửa bé A rồi chuyển bé B.
- [ ] **VAL-10-05:** Mật khẩu `currentPassword` rỗng/sai được báo tại ô đúng theo policy an toàn.
- [ ] **VAL-10-06:** `newPassword` có mô tả rõ các tiêu chí còn thiếu, không chỉ disable nút.
- [ ] **VAL-10-07:** `confirmNewPassword` lệch → hiển thị lỗi, tự cập nhật khi sửa bất kỳ ô mật khẩu nào.
- [ ] **VAL-10-08:** Toggle notifyEmail/notifySMS, chọn ngôn ngữ và đơn vị: lỗi nếu server reject, không hiển thị success giả.
- [ ] **VAL-10-09:** Logout/timeout trong lúc lưu: chuyển hướng xác thực nhưng giữ draft không nhạy cảm.

**Gate GĐ-10:** Chỉ chuyển qua giai đoạn kế tiếp khi các ca P0 của giai đoạn đạt kiểm thử thực tế; mục chưa thể test ghi `BLOCKED` + lý do + owner, không ghi PASS.
### GĐ-11 — User Portal: Support, Reviews, Orders, Returns
**Ưu tiên:** P0 · **Mục tiêu nghiệm thu:** Đánh dấu đúng ca hỗ trợ/đơn hàng và tránh duplicate khi người dùng đang bức xúc.
- [ ] **VAL-11-01:** Ticket `ticketType` chưa chọn → lỗi select; hiển thị nhóm trường phụ thuộc loại.
- [ ] **VAL-11-02:** Khi chọn service: `serviceBookingSelect`, `serviceIssueType` phải hợp lệ và thuộc khách đang đăng nhập.
- [ ] **VAL-11-03:** Khi chọn order: `orderSelect`, `orderIssueType`, `orderCustomerDemand` hợp lệ; chỉ đơn của chủ sở hữu.
- [ ] **VAL-11-04:** `ticketTitle`, `ticketContent` bắt buộc, không chỉ dấu cách; độ dài theo schema.
- [ ] **VAL-11-05:** `ticketFile` >5MB hoặc file không hỗ trợ → lỗi dưới upload thay vì `alert(...)`.
- [ ] **VAL-11-06:** Khi đổi loại ticket: xóa field errors ở section ẩn, không submit dữ liệu trái ngữ cảnh.
- [ ] **VAL-11-07:** Gửi ticket lỗi mạng → giữ toàn bộ form/ảnh, retry không tạo trùng.
- [ ] **VAL-11-08:** Reply CSKH `replyTextarea` rỗng/đính kèm không hợp lệ → lỗi cạnh control.
- [ ] **VAL-11-09:** Rating `ratingComment`/số sao khi bắt buộc; hủy/xóa lỗi sai nếu form đóng.
- [ ] **VAL-11-10:** Yêu cầu đổi trả/hoàn tiền: lý do, chứng từ, trạng thái đủ điều kiện; không hứa hoàn tiền chưa được phê duyệt.
- [ ] **VAL-11-11:** Review dịch vụ/sản phẩm: chỉ khách có giao dịch hợp lệ; lỗi điểm sao/bình luận theo yêu cầu.

**Gate GĐ-11:** Chỉ chuyển qua giai đoạn kế tiếp khi các ca P0 của giai đoạn đạt kiểm thử thực tế; mục chưa thể test ghi `BLOCKED` + lý do + owner, không ghi PASS.
### GĐ-12 — Admin: Customers & Pets
**Ưu tiên:** P1 · **Mục tiêu nghiệm thu:** Modal thêm nhanh/sửa hồ sơ/ghi nhận thú cưng cần tách lỗi theo field.
- [ ] **VAL-12-01:** Customers quick add: `quickAddName`, `quickAddPhone`, `quickAddPetWeight` gắn lỗi riêng thay vì toast tổng.
- [ ] **VAL-12-02:** Trùng SĐT từ DB → `quickAddPhone`; phân biệt email/phone optional theo thiết kế.
- [ ] **VAL-12-03:** Customers edit: `editCustFullName`, `editCustPhone`, `editCustEmail`, `editCustDob` có rules chính xác.
- [ ] **VAL-12-04:** Thêm pet phụ qua `addPetName`, `addPetSpecies`, `addPetWeight` và owner quan hệ đúng.
- [ ] **VAL-12-05:** Pets edit: `editPetName`, `editPetSpecies`, `editPetWeight`, vaccine/alert theo tính chất ghi chú.
- [ ] **VAL-12-06:** Lưu ghi chú/sổ tiêm bình thường; không dựng validation “hồ sơ y khoa bắt buộc”.
- [ ] **VAL-12-07:** Điều chỉnh Paw Points `adjustPhone`, `adjustPointsVal`, `adjustReason` đủ điều kiện mới cho lưu.
- [ ] **VAL-12-08:** Không tự tạo khách/pet nửa chừng nếu validation fail; hiển thị field error phù hợp khi FK lỗi.
- [ ] **VAL-12-09:** Sửa modal con rồi quay lại modal cha: không mất chọn chủ nuôi, không reset form không cần thiết.

**Gate GĐ-12:** Chỉ chuyển qua giai đoạn kế tiếp khi các ca P0 của giai đoạn đạt kiểm thử thực tế; mục chưa thể test ghi `BLOCKED` + lý do + owner, không ghi PASS.
### GĐ-13 — Admin: Services, Appointment, Hotel, Taxi, Staff
**Ưu tiên:** P0 · **Mục tiêu nghiệm thu:** Luồng điều phối giờ/nhân viên và giá dịch vụ cần thông điệp nghiệp vụ theo bước.
- [ ] **VAL-13-01:** Từng loại lịch hẹn có required fields riêng, không bật validate ô của tab ẩn.
- [ ] **VAL-13-02:** Tạo/sửa dịch vụ: mã, tên, loại, đơn giá, thời lượng hợp lệ theo CSDL.
- [ ] **VAL-13-03:** Đặt lịch ngày/giờ trống, nhân viên phục vụ, pet/customer đúng quan hệ.
- [ ] **VAL-13-04:** Hotel check-in/check-out: ngày, thêm dịch vụ phụ, số lần/phí đều hợp lệ.
- [ ] **VAL-13-05:** Taxi đón/trả, cự ly, giá theo rule, không mất dữ liệu trong `appointment.note`.
- [ ] **VAL-13-06:** Surcharge: `surchargeNameInput`, `surchargeAmountInput`, `surchargeReasonInput` gắn đúng field.
- [ ] **VAL-13-07:** Nhân viên: ca trùng, nghỉ phép, ngày nghỉ, kỹ năng phân ca hiển thị ngay lựa chọn không hợp lệ.
- [ ] **VAL-13-08:** Modal chăm sóc `intakePetWeightInput`, `intakeStaffSelect`, `changeStaffReasonInput` báo lỗi riêng.
- [ ] **VAL-13-09:** Checkbox hoàn tất `completeCheckQuality`, `completeCheckBelongings` có lỗi nhóm khi chưa tick.
- [ ] **VAL-13-10:** Chuyển trạng thái appointment bị từ chối → mô tả điều kiện, không “cập nhật thành công” giả.

**Gate GĐ-13:** Chỉ chuyển qua giai đoạn kế tiếp khi các ca P0 của giai đoạn đạt kiểm thử thực tế; mục chưa thể test ghi `BLOCKED` + lý do + owner, không ghi PASS.
### GĐ-14 — Admin: Orders, Inventory, Products, Voucher
**Ưu tiên:** P0 · **Mục tiêu nghiệm thu:** Ưu tiên nơi có tiền, tồn kho, combo và dữ liệu đa bảng.
- [ ] **VAL-14-01:** Tái sử dụng `createOrderPhoneError`, `createOrderNameError`, `createOrderAddressError` hiện có.
- [ ] **VAL-14-02:** Các field Customer/Phone/Address khác trong modal createOrder phải được map đúng, không báo sai chỗ.
- [ ] **VAL-14-03:** Chọn sản phẩm/biến thể, số lượng/tồn kho, giá trị chiết khấu, trạng thái thanh toán đúng trường.
- [ ] **VAL-14-04:** Sửa biến thể: SKU/mã, giá, khối lượng, tồn kho, ảnh phải có rule riêng theo sản phẩm.
- [ ] **VAL-14-05:** Voucher Admin: ngày bắt đầu/kết thúc, số lượt, điều kiện, loại giảm và giá trị hợp lệ.
- [ ] **VAL-14-06:** Xóa sản phẩm có tham chiếu đơn hàng → lỗi nghiệp vụ rõ, không crash modal.
- [ ] **VAL-14-07:** Inventory transaction: số lượng nguyên, lý do nhập/xuất, không âm hoặc vượt tồn.
- [ ] **VAL-14-08:** Phụ phí giao hàng/địa chỉ không đủ thì focus đúng phần shipping.
- [ ] **VAL-14-09:** Đơn có detail được lưu nhưng payment lỗi phải báo lỗi trạng thái thanh toán thật.
- [ ] **VAL-14-10:** Dữ liệu không thay đổi sau khi save fail; retry an toàn không double order.

**Gate GĐ-14:** Chỉ chuyển qua giai đoạn kế tiếp khi các ca P0 của giai đoạn đạt kiểm thử thực tế; mục chưa thể test ghi `BLOCKED` + lý do + owner, không ghi PASS.
### GĐ-15 — Admin: Complaints, Chatbot, Settings, Content
**Ưu tiên:** P1 · **Mục tiêu nghiệm thu:** Form CSKH/FAQ và cấu hình cũng cần validation nhất quán, nhưng không bó buộc textarea chat như form bắt buộc khi chỉ đang xem.
- [ ] **VAL-15-01:** Ticket/status/priority/assignee/response: rule theo nghiệp vụ, phản hồi rỗng lỗi cạnh editor.
- [ ] **VAL-15-02:** Chất lượng CSKH: lý do từ chối, evidence, quyết định refund phải rõ required fields.
- [ ] **VAL-15-03:** Chatbot FAQ: question/answer/rule/toxic keywords, các trường chỉ required khi lưu mới/chỉnh.
- [ ] **VAL-15-04:** Đính kèm chat: loại file/size/chờ upload, lỗi cạnh nút file, không xóa text đã gõ.
- [ ] **VAL-15-05:** Copilot prompt có giới hạn ký tự và lỗi kết nối riêng, không coi câu hỏi không rõ là validation lỗi.
- [ ] **VAL-15-06:** Settings voucher/banner/blog: title, dates, summary, content, URL, file, vị trí/priority hợp lệ.
- [ ] **VAL-15-07:** `tab-settings-content.js` đang tổng hợp nhiều lỗi thành toast → chuyển sang field errors.
- [ ] **VAL-15-08:** Không chặn thao tác tìm kiếm/filter/đọc tài liệu nếu field tạo mới đang lỗi trong modal khác.
- [ ] **VAL-15-09:** Thay đổi Rule/FAQ chỉ báo thành công sau khi API/Supabase xác nhận.

**Gate GĐ-15:** Chỉ chuyển qua giai đoạn kế tiếp khi các ca P0 của giai đoạn đạt kiểm thử thực tế; mục chưa thể test ghi `BLOCKED` + lý do + owner, không ghi PASS.
### GĐ-16 — Accessibility, Security, Responsive, Cross-browser
**Ưu tiên:** P0 · **Mục tiêu nghiệm thu:** Nâng chất lượng trải nghiệm thật, không chỉ để giao diện có chữ đỏ.
- [ ] **VAL-16-01:** Tab/Shift+Tab tới mọi control và lỗi, không trapped focus khi đóng modal.
- [ ] **VAL-16-02:** `aria-describedby`, `aria-invalid` trỏ đúng; trình đọc màn hình phát hiện lỗi.
- [ ] **VAL-16-03:** Khi submit nhiều lỗi, summary cho biết số lỗi và liên kết/focus đúng trường đầu tiên.
- [ ] **VAL-16-04:** Lỗi trong tab/modal/collapse bị ẩn: mở đúng panel trước khi focus.
- [ ] **VAL-16-05:** Bàn phím ảo mobile không che field lỗi hoặc nút xử lý.
- [ ] **VAL-16-06:** Không render HTML từ lỗi server qua `innerHTML` (XSS).
- [ ] **VAL-16-07:** Không lộ email, số điện thoại, sự tồn tại tài khoản ở luồng auth nhạy cảm.
- [ ] **VAL-16-08:** Không dùng regex bắt buộc cho mọi quốc gia nếu sản phẩm cho SĐT quốc tế; theo policy PawPal hiện hành.
- [ ] **VAL-16-09:** Đóng modal/reopen và SPA route changes không giữ stale errors/listeners.
- [ ] **VAL-16-10:** Chrome/Edge/Firefox/Safari + Android/iOS; Vietnamese Unicode, paste, IME/emoji trong text.
- [ ] **VAL-16-11:** Test mạng mất/chậm, 401, 403, 409, 422, 429, 500, Supabase timeout/RLS.
- [ ] **VAL-16-12:** Bảo đảm lỗi không chuyển nhầm người nhận, ghi thiếu quan hệ, trừ tiền/hủy đơn ngoài ý muốn.

**Gate GĐ-16:** Chỉ chuyển qua giai đoạn kế tiếp khi các ca P0 của giai đoạn đạt kiểm thử thực tế; mục chưa thể test ghi `BLOCKED` + lý do + owner, không ghi PASS.
### GĐ-17 — E2E, roll-out, rollback & checklist sync
**Ưu tiên:** P0 · **Mục tiêu nghiệm thu:** Rollout tuần tự, có bằng chứng và quy định update `.md` sau mỗi lần sửa.
- [ ] **VAL-17-01:** Chạy unit tests rule/mapper; test DOM với các form được pilot.
- [ ] **VAL-17-02:** Chạy E2E Guest và Member ở desktop/mobile; mỗi trường negative case và positive case.
- [ ] **VAL-17-03:** Chạy E2E Admin với ít nhất một modal/drawer mỗi phân hệ.
- [ ] **VAL-17-04:** Tạo failure injection 400/401/403/409/422/429/500/network; không success giả.
- [ ] **VAL-17-05:** Tải lại/đăng nhập lại/đổi thiết bị → dữ liệu thành công đồng bộ; lỗi không làm mất draft ngoài ý muốn.
- [ ] **VAL-17-06:** Đo thời gian render field error; không tạo nhiều listeners/double submit.
- [ ] **VAL-17-07:** Canary 1-2 module rồi mở rộng; lưu ảnh trước/sau và log không nhạy cảm.
- [ ] **VAL-17-08:** Có feature flag/rollback UI validation mà **không tắt server validation**.
- [ ] **VAL-17-09:** Sau mỗi fix cập nhật checklist mã test, trạng thái PASS/FAIL/RETEST/NOT RUN, file sửa, commit và ảnh bằng chứng.
- [ ] **VAL-17-10:** Không đánh dấu [x] nếu chỉ code review/unit syntax pass; báo cáo phạm vi đã chạy thực tế.

**Gate GĐ-17:** Chỉ chuyển qua giai đoạn kế tiếp khi các ca P0 của giai đoạn đạt kiểm thử thực tế; mục chưa thể test ghi `BLOCKED` + lý do + owner, không ghi PASS.
## 8. Ma trận test chuyên sâu theo màn hình thật (đúng ID trong ZIP)
Danh sách dưới đây lấy từ `id` HTML và logic JS đã đọc. Mỗi “test” cần chạy tối thiểu: **giá trị sai → lỗi dưới ô → sửa → lỗi biến mất → lưu → F5 → đối chiếu DB/Admin khi là thao tác ghi**. Trường có thể là optional; trường đó chỉ kiểm định dạng nếu người dùng có nhập, không tự đổi thành bắt buộc.
- [ ] **FM-001 · GUEST-AUTH:** `pages/public/login/login.html` — ``loginPhone``. **Tình huống:** rỗng, 9 số, 11 số, chữ, khoảng trắng; login sau sửa. **PASS:** lỗi đúng trường/group; sửa hết lỗi; backend kiểm tra; không mất draft; không lưu giả; retest sau F5.
- [ ] **FM-002 · GUEST-AUTH:** `pages/public/login/login.html` — ``loginPassword``. **Tình huống:** rỗng, đúng định dạng nhưng sai; không tiết lộ tài khoản. **PASS:** lỗi đúng trường/group; sửa hết lỗi; backend kiểm tra; không mất draft; không lưu giả; retest sau F5.
- [ ] **FM-003 · GUEST-AUTH:** `pages/public/login/login.html` — ``registerName``. **Tình huống:** trống, toàn khoảng trắng, unicode tiếng Việt, độ dài ràng buộc. **PASS:** lỗi đúng trường/group; sửa hết lỗi; backend kiểm tra; không mất draft; không lưu giả; retest sau F5.
- [ ] **FM-004 · GUEST-AUTH:** `pages/public/login/login.html` — ``registerPhone``. **Tình huống:** SĐT sai định dạng, trùng theo chính sách bảo mật. **PASS:** lỗi đúng trường/group; sửa hết lỗi; backend kiểm tra; không mất draft; không lưu giả; retest sau F5.
- [ ] **FM-005 · GUEST-AUTH:** `pages/public/login/login.html` — ``registerPassword``. **Tình huống:** thiếu số, thiếu đặc biệt, dưới 8, trên 128, paste. **PASS:** lỗi đúng trường/group; sửa hết lỗi; backend kiểm tra; không mất draft; không lưu giả; retest sau F5.
- [ ] **FM-006 · GUEST-AUTH:** `pages/public/login/login.html` — ``registerConfirmPassword``. **Tình huống:** không khớp → sửa khớp → biến mất. **PASS:** lỗi đúng trường/group; sửa hết lỗi; backend kiểm tra; không mất draft; không lưu giả; retest sau F5.
- [ ] **FM-007 · GUEST-AUTH:** `pages/public/login/login.html` — ``forgotPhone``. **Tình huống:** rỗng, không đủ 10, lỗi resend OTP / rate limit. **PASS:** lỗi đúng trường/group; sửa hết lỗi; backend kiểm tra; không mất draft; không lưu giả; retest sau F5.
- [ ] **FM-008 · GUEST-AUTH:** `pages/public/login/login.html` — ``forgotNewPassword`, `forgotConfirmNewPassword``. **Tình huống:** mật khẩu mới không đạt rule, xác nhận lệch. **PASS:** lỗi đúng trường/group; sửa hết lỗi; backend kiểm tra; không mất draft; không lưu giả; retest sau F5.
- [ ] **FM-009 · GUEST-AUTH:** `pages/public/login/login.html` — ``setupPassword`, `setupConfirmPassword`, `setupTermsCheckbox``. **Tình huống:** thiếu đồng ý điều khoản hoặc mật khẩu setup không hợp lệ. **PASS:** lỗi đúng trường/group; sửa hết lỗi; backend kiểm tra; không mất draft; không lưu giả; retest sau F5.
- [ ] **FM-010 · PUBLIC:** `pages/public/contact/contact.html` — ``fullName`, `phoneNumber`, `serviceInterest`, `message``. **Tình huống:** bỏ trống từng field, SĐT sai, message chỉ whitespace, server ticket lỗi. **PASS:** lỗi đúng trường/group; sửa hết lỗi; backend kiểm tra; không mất draft; không lưu giả; retest sau F5.
- [ ] **FM-011 · PUBLIC:** `pages/public/landing/landing.html` — ``bookingName`, `bookingPhone`, `bookingService``. **Tình huống:** nhập sai, chưa chọn, bấm đặt hẹn, mất draft. **PASS:** lỗi đúng trường/group; sửa hết lỗi; backend kiểm tra; không mất draft; không lưu giả; retest sau F5.
- [ ] **FM-012 · PUBLIC:** `pages/public/return-guest/return-guest.html` — ``rg-phone``. **Tình huống:** thiếu SĐT, sai format, lookup không thấy/không có quyền. **PASS:** lỗi đúng trường/group; sửa hết lỗi; backend kiểm tra; không mất draft; không lưu giả; retest sau F5.
- [ ] **FM-013 · PUBLIC:** `pages/public/blog-detail/blog-detail.html` — ``commentAuthorInput`, `commentEmailInput`, `commentContentInput``. **Tình huống:** comment trống/email sai, lỗi gửi nhận xét. **PASS:** lỗi đúng trường/group; sửa hết lỗi; backend kiểm tra; không mất draft; không lưu giả; retest sau F5.
- [ ] **FM-014 · SERVICES:** `pages/services/booking/booking.html` — ``ownerName`, `ownerPhone``. **Tình huống:** Guest: tên/phone không hợp lệ. **PASS:** lỗi đúng trường/group; sửa hết lỗi; backend kiểm tra; không mất draft; không lưu giả; retest sau F5.
- [ ] **FM-015 · SERVICES:** `pages/services/booking/booking.html` — ``memberOwnerName`, `memberOwnerPhone``. **Tình huống:** Member: contact dữ liệu tự điền sai hoặc đổi liên hệ. **PASS:** lỗi đúng trường/group; sửa hết lỗi; backend kiểm tra; không mất draft; không lưu giả; retest sau F5.
- [ ] **FM-016 · SERVICES:** `pages/services/booking/booking.html` — ``petName`, `petType`, `petTypeOther`, `petWeight``. **Tình huống:** thiếu pet, chọn loài khác không diễn giải, cân nặng 0/âm. **PASS:** lỗi đúng trường/group; sửa hết lỗi; backend kiểm tra; không mất draft; không lưu giả; retest sau F5.
- [ ] **FM-017 · SERVICES:** `pages/services/booking/booking.html` — ``bookingDate`, `policyCheck``. **Tình huống:** lịch quá khứ/slot mất, thiếu đồng ý policy. **PASS:** lỗi đúng trường/group; sửa hết lỗi; backend kiểm tra; không mất draft; không lưu giả; retest sau F5.
- [ ] **FM-018 · SERVICES:** `pages/services/booking/booking.html` — ``checkInDate`, `checkOutDate``. **Tình huống:** hotel ngày ra trước/ngang ngày vào. **PASS:** lỗi đúng trường/group; sửa hết lỗi; backend kiểm tra; không mất draft; không lưu giả; retest sau F5.
- [ ] **FM-019 · SERVICES:** `pages/services/booking/booking.html` — ``addonWalkQty`, `addonPlayQty`, `addonBathQty``. **Tình huống:** chỉ bắt buộc khi chọn addon, số lượng nguyên không âm. **PASS:** lỗi đúng trường/group; sửa hết lỗi; backend kiểm tra; không mất draft; không lưu giả; retest sau F5.
- [ ] **FM-020 · SERVICES:** `pages/services/booking/booking.html` — ``bookingVoucherInput``. **Tình huống:** voucher không hợp lệ/hết hạn/không đủ điều kiện. **PASS:** lỗi đúng trường/group; sửa hết lỗi; backend kiểm tra; không mất draft; không lưu giả; retest sau F5.
- [ ] **FM-021 · SERVICES:** `pages/services/booking/booking.html` — ``quickPetOwnerName`, `quickPetOwnerPhone`, `quickPetName`, `quickPetSpecies`, `quickPetWeight``. **Tình huống:** modal thêm nhanh pet; focus modal con và quay lại wizard. **PASS:** lỗi đúng trường/group; sửa hết lỗi; backend kiểm tra; không mất draft; không lưu giả; retest sau F5.
- [ ] **FM-022 · SHOP:** `pages/shop/product-detail/product-detail.html` — ``quantity``. **Tình huống:** 0, âm, số thập phân, quá tồn, variant đổi. **PASS:** lỗi đúng trường/group; sửa hết lỗi; backend kiểm tra; không mất draft; không lưu giả; retest sau F5.
- [ ] **FM-023 · SHOP:** `pages/shop/cart/cart.html` — ``voucher-input``. **Tình huống:** mã sai/hết hạn, tính lại discount khi sửa. **PASS:** lỗi đúng trường/group; sửa hết lỗi; backend kiểm tra; không mất draft; không lưu giả; retest sau F5.
- [ ] **FM-024 · SHOP:** `pages/shop/checkout/checkout.html` — ``fullName`, `phone`, `address`, `city`, `district``. **Tình huống:** Guest form bắt buộc, chỉnh từng ô, refresh. **PASS:** lỗi đúng trường/group; sửa hết lỗi; backend kiểm tra; không mất draft; không lưu giả; retest sau F5.
- [ ] **FM-025 · SHOP:** `pages/shop/checkout/checkout.html` — ``modalFullName`, `modalPhone`, `modalAddress`, `modalCity`, `modalDistrict``. **Tình huống:** Member thêm/sửa địa chỉ, select tỉnh→huyện. **PASS:** lỗi đúng trường/group; sửa hết lỗi; backend kiểm tra; không mất draft; không lưu giả; retest sau F5.
- [ ] **FM-026 · SHOP:** `pages/shop/checkout/checkout.html` — ``invoice-checkbox`, `companyName`, `taxCode`, `companyAddress`, `invoiceEmail``. **Tình huống:** tắt/bật hóa đơn, conditional error, email hóa đơn nếu nhập. **PASS:** lỗi đúng trường/group; sửa hết lỗi; backend kiểm tra; không mất draft; không lưu giả; retest sau F5.
- [ ] **FM-027 · SHOP:** `pages/shop/checkout/checkout.html` — ``voucher-input`, `points-slider`, `use-points-checkbox``. **Tình huống:** mã giảm, xung đột điểm và voucher, số dư server. **PASS:** lỗi đúng trường/group; sửa hết lỗi; backend kiểm tra; không mất draft; không lưu giả; retest sau F5.
- [ ] **FM-028 · USER:** `pages/user/modules/profile/profile.html` — ``profileNameInput`, `profileEmailInput``. **Tình huống:** lỗi field, trùng email 23505, revision conflict. **PASS:** lỗi đúng trường/group; sửa hết lỗi; backend kiểm tra; không mất draft; không lưu giả; retest sau F5.
- [ ] **FM-029 · USER:** `pages/user/modules/profile/profile.html` — ``newAddressStreetInput`, `newAddressDistrictInput`, `newAddressCityInput``. **Tình huống:** địa chỉ thiếu/trùng, nhiều address, default. **PASS:** lỗi đúng trường/group; sửa hết lỗi; backend kiểm tra; không mất draft; không lưu giả; retest sau F5.
- [ ] **FM-030 · USER:** `pages/user/modules/pets/pets.html` — ``petName`, nhóm `species`, `otherSpecies`, `weight`, `dob``. **Tình huống:** tạo/sửa pet; giới tính optional theo schema. **PASS:** lỗi đúng trường/group; sửa hết lỗi; backend kiểm tra; không mất draft; không lưu giả; retest sau F5.
- [ ] **FM-031 · USER:** `pages/user/modules/pets/pets.html` — ``avatar-input`, `vaccine-card-input``. **Tình huống:** ảnh sai định dạng/vượt giới hạn; lỗi bên cạnh upload. **PASS:** lỗi đúng trường/group; sửa hết lỗi; backend kiểm tra; không mất draft; không lưu giả; retest sau F5.
- [ ] **FM-032 · USER:** `pages/user/modules/settings/settings.html` — ``currentPassword`, `newPassword`, `confirmNewPassword``. **Tình huống:** lỗi từng điều kiện, mật khẩu cũ sai, xác nhận lệch. **PASS:** lỗi đúng trường/group; sửa hết lỗi; backend kiểm tra; không mất draft; không lưu giả; retest sau F5.
- [ ] **FM-033 · USER:** `pages/user/modules/support/support-create.html` — ``ticketType`, `serviceBookingSelect`, `serviceIssueType``. **Tình huống:** loại support service và lịch liên quan. **PASS:** lỗi đúng trường/group; sửa hết lỗi; backend kiểm tra; không mất draft; không lưu giả; retest sau F5.
- [ ] **FM-034 · USER:** `pages/user/modules/support/support-create.html` — ``orderSelect`, `orderIssueType`, `orderCustomerDemand``. **Tình huống:** loại support order/đổi trả. **PASS:** lỗi đúng trường/group; sửa hết lỗi; backend kiểm tra; không mất draft; không lưu giả; retest sau F5.
- [ ] **FM-035 · USER:** `pages/user/modules/support/support-create.html` — ``ticketTitle`, `ticketContent`, `ticketFile``. **Tình huống:** trống, tệp >5 MB, gửi lỗi mạng. **PASS:** lỗi đúng trường/group; sửa hết lỗi; backend kiểm tra; không mất draft; không lưu giả; retest sau F5.
- [ ] **FM-036 · USER:** `pages/user/modules/support/support.html` — ``replyTextarea`, `replyFileInput`, `ratingComment``. **Tình huống:** nhắn tin/reply, file, đánh giá CSAT. **PASS:** lỗi đúng trường/group; sửa hết lỗi; backend kiểm tra; không mất draft; không lưu giả; retest sau F5.
- [ ] **FM-037 · ADMIN-CUSTOMERS:** `pages/admin/modules/customers/customers.html` — ``quickAddName`, `quickAddPhone`, `quickAddPetWeight``. **Tình huống:** rỗng/sai/trùng, helper không chỉ reportValidity/toast. **PASS:** lỗi đúng trường/group; sửa hết lỗi; backend kiểm tra; không mất draft; không lưu giả; retest sau F5.
- [ ] **FM-038 · ADMIN-CUSTOMERS:** `pages/admin/modules/customers/customers.html` — ``editCustFullName`, `editCustPhone`, `editCustEmail`, `editCustDob``. **Tình huống:** form sửa hồ sơ, DOB tương lai. **PASS:** lỗi đúng trường/group; sửa hết lỗi; backend kiểm tra; không mất draft; không lưu giả; retest sau F5.
- [ ] **FM-039 · ADMIN-CUSTOMERS:** `pages/admin/modules/customers/customers.html` — ``adjustPhone`, `adjustPointsVal`, `adjustReason``. **Tình huống:** điều chỉnh điểm, số không hợp lệ, thiếu lý do. **PASS:** lỗi đúng trường/group; sửa hết lỗi; backend kiểm tra; không mất draft; không lưu giả; retest sau F5.
- [ ] **FM-040 · ADMIN-CUSTOMERS:** `pages/admin/modules/customers/customers.html` — ``addPetName`, `addPetSpecies`, `addPetWeight``. **Tình huống:** thêm bé vào hồ sơ customer. **PASS:** lỗi đúng trường/group; sửa hết lỗi; backend kiểm tra; không mất draft; không lưu giả; retest sau F5.
- [ ] **FM-041 · ADMIN-CUSTOMERS:** `pages/admin/modules/customers/customers.html` — ``editPetName`, `editPetSpecies`, `editPetWeight``. **Tình huống:** sửa pet trong drawer. **PASS:** lỗi đúng trường/group; sửa hết lỗi; backend kiểm tra; không mất draft; không lưu giả; retest sau F5.
- [ ] **FM-042 · ADMIN-ORDERS:** `pages/admin/modules/orders/orders.html` — ``createOrderPhoneError`, `createOrderNameError`, `createOrderAddressError``. **Tình huống:** đây là ID vùng lỗi, xác minh chúng được JS fill từ input tương ứng. **PASS:** lỗi đúng trường/group; sửa hết lỗi; backend kiểm tra; không mất draft; không lưu giả; retest sau F5.
- [ ] **FM-043 · ADMIN-SERVICES:** `pages/admin/modules/services/services.html` — ``surchargeNameInput`, `surchargeAmountInput`, `surchargeReasonInput``. **Tình huống:** phụ phí phải có lý do và số tiền hợp lệ. **PASS:** lỗi đúng trường/group; sửa hết lỗi; backend kiểm tra; không mất draft; không lưu giả; retest sau F5.
- [ ] **FM-044 · ADMIN-SERVICES:** `pages/admin/modules/services/services.html` — ``intakePetWeightInput`, `intakeStaffSelect``. **Tình huống:** kiểm tra nhận bé tại quầy. **PASS:** lỗi đúng trường/group; sửa hết lỗi; backend kiểm tra; không mất draft; không lưu giả; retest sau F5.
- [ ] **FM-045 · ADMIN-SERVICES:** `pages/admin/modules/services/services.html` — ``changeStaffSelect`, `changeStaffReasonInput``. **Tình huống:** chuyển nhân viên: chọn người và lý do. **PASS:** lỗi đúng trường/group; sửa hết lỗi; backend kiểm tra; không mất draft; không lưu giả; retest sau F5.
- [ ] **FM-046 · ADMIN-SERVICES:** `pages/admin/modules/services/services.html` — ``completeCheckQuality`, `completeCheckBelongings``. **Tình huống:** checkbox yêu cầu trước hoàn tất. **PASS:** lỗi đúng trường/group; sửa hết lỗi; backend kiểm tra; không mất draft; không lưu giả; retest sau F5.

## 9. Hành trình E2E người dùng thật: không chỉ “có chữ đỏ”
#### E2E-GUEST-01 — Khách vãng lai vào trang đăng ký, nhập SĐT 9 số rồi sửa thành đủ 10 số
**Phạm vi:** Public Auth. **Điều kiện:** dùng dữ liệu test có kiểm soát; ghi lại ID được tạo nếu có.
- [ ] **E2E-GUEST-01-1:** Truy cập màn hình với tài khoản Guest/Member/Admin đúng vai trò, ghi branch/URL/test data.
- [ ] **E2E-GUEST-01-2:** Thực hiện thao tác sai mô tả: Khách vãng lai vào trang đăng ký, nhập SĐT 9 số rồi sửa thành đủ 10 số. Ghi screenshot và lỗi hiện thực tế.
- [ ] **E2E-GUEST-01-3:** **Kết quả mong đợi:** phone lỗi → sửa hết → OTP → hoàn tất hoặc được giải thích lý do server từ chối. Kiểm focus và error tại trường, không chỉ toast.
- [ ] **E2E-GUEST-01-4:** Sửa đúng trường lỗi; kiểm thông báo mất đi, không làm mất các trường khác.
- [ ] **E2E-GUEST-01-5:** Thử lưu lại, đối chiếu Network/response và Supabase nếu có ghi. F5/đăng nhập lại rồi xác minh dữ liệu; ghi PASS/FAIL/BLOCKED kèm bằng chứng.

#### E2E-GUEST-02 — Khách điền mật khẩu sai rồi xác nhận không khớp
**Phạm vi:** Public Auth. **Điều kiện:** dùng dữ liệu test có kiểm soát; ghi lại ID được tạo nếu có.
- [ ] **E2E-GUEST-02-1:** Truy cập màn hình với tài khoản Guest/Member/Admin đúng vai trò, ghi branch/URL/test data.
- [ ] **E2E-GUEST-02-2:** Thực hiện thao tác sai mô tả: Khách điền mật khẩu sai rồi xác nhận không khớp. Ghi screenshot và lỗi hiện thực tế.
- [ ] **E2E-GUEST-02-3:** **Kết quả mong đợi:** gợi ý ngay từng điều kiện, không mất mật khẩu ở ô khác do re-render. Kiểm focus và error tại trường, không chỉ toast.
- [ ] **E2E-GUEST-02-4:** Sửa đúng trường lỗi; kiểm thông báo mất đi, không làm mất các trường khác.
- [ ] **E2E-GUEST-02-5:** Thử lưu lại, đối chiếu Network/response và Supabase nếu có ghi. F5/đăng nhập lại rồi xác minh dữ liệu; ghi PASS/FAIL/BLOCKED kèm bằng chứng.

#### E2E-GUEST-03 — Khách dùng OTP hết hạn và gửi lại
**Phạm vi:** Public Auth. **Điều kiện:** dùng dữ liệu test có kiểm soát; ghi lại ID được tạo nếu có.
- [ ] **E2E-GUEST-03-1:** Truy cập màn hình với tài khoản Guest/Member/Admin đúng vai trò, ghi branch/URL/test data.
- [ ] **E2E-GUEST-03-2:** Thực hiện thao tác sai mô tả: Khách dùng OTP hết hạn và gửi lại. Ghi screenshot và lỗi hiện thực tế.
- [ ] **E2E-GUEST-03-3:** **Kết quả mong đợi:** lỗi tại cụm OTP, countdown phù hợp, không tiết lộ tài khoản. Kiểm focus và error tại trường, không chỉ toast.
- [ ] **E2E-GUEST-03-4:** Sửa đúng trường lỗi; kiểm thông báo mất đi, không làm mất các trường khác.
- [ ] **E2E-GUEST-03-5:** Thử lưu lại, đối chiếu Network/response và Supabase nếu có ghi. F5/đăng nhập lại rồi xác minh dữ liệu; ghi PASS/FAIL/BLOCKED kèm bằng chứng.

#### E2E-GUEST-04 — Khách gửi form liên hệ thiếu SĐT nhưng có lời nhắn dài
**Phạm vi:** Public Contact. **Điều kiện:** dùng dữ liệu test có kiểm soát; ghi lại ID được tạo nếu có.
- [ ] **E2E-GUEST-04-1:** Truy cập màn hình với tài khoản Guest/Member/Admin đúng vai trò, ghi branch/URL/test data.
- [ ] **E2E-GUEST-04-2:** Thực hiện thao tác sai mô tả: Khách gửi form liên hệ thiếu SĐT nhưng có lời nhắn dài. Ghi screenshot và lỗi hiện thực tế.
- [ ] **E2E-GUEST-04-3:** **Kết quả mong đợi:** gắn lỗi SĐT, giữ lời nhắn, chỉ tạo ticket một lần sau khi sửa. Kiểm focus và error tại trường, không chỉ toast.
- [ ] **E2E-GUEST-04-4:** Sửa đúng trường lỗi; kiểm thông báo mất đi, không làm mất các trường khác.
- [ ] **E2E-GUEST-04-5:** Thử lưu lại, đối chiếu Network/response và Supabase nếu có ghi. F5/đăng nhập lại rồi xác minh dữ liệu; ghi PASS/FAIL/BLOCKED kèm bằng chứng.

#### E2E-GUEST-05 — Khách booking Spa thiếu tên pet, đã chọn dịch vụ và giờ
**Phạm vi:** Services. **Điều kiện:** dùng dữ liệu test có kiểm soát; ghi lại ID được tạo nếu có.
- [ ] **E2E-GUEST-05-1:** Truy cập màn hình với tài khoản Guest/Member/Admin đúng vai trò, ghi branch/URL/test data.
- [ ] **E2E-GUEST-05-2:** Thực hiện thao tác sai mô tả: Khách booking Spa thiếu tên pet, đã chọn dịch vụ và giờ. Ghi screenshot và lỗi hiện thực tế.
- [ ] **E2E-GUEST-05-3:** **Kết quả mong đợi:** chỉ báo petName, giữ dịch vụ/giờ hợp lệ, backend lưu appointment đúng. Kiểm focus và error tại trường, không chỉ toast.
- [ ] **E2E-GUEST-05-4:** Sửa đúng trường lỗi; kiểm thông báo mất đi, không làm mất các trường khác.
- [ ] **E2E-GUEST-05-5:** Thử lưu lại, đối chiếu Network/response và Supabase nếu có ghi. F5/đăng nhập lại rồi xác minh dữ liệu; ghi PASS/FAIL/BLOCKED kèm bằng chứng.

#### E2E-GUEST-06 — Khách chọn “loài khác”, bỏ trống mô tả, rồi đổi lại Chó
**Phạm vi:** Services. **Điều kiện:** dùng dữ liệu test có kiểm soát; ghi lại ID được tạo nếu có.
- [ ] **E2E-GUEST-06-1:** Truy cập màn hình với tài khoản Guest/Member/Admin đúng vai trò, ghi branch/URL/test data.
- [ ] **E2E-GUEST-06-2:** Thực hiện thao tác sai mô tả: Khách chọn “loài khác”, bỏ trống mô tả, rồi đổi lại Chó. Ghi screenshot và lỗi hiện thực tế.
- [ ] **E2E-GUEST-06-3:** **Kết quả mong đợi:** bật lỗi khi cần; xóa lỗi khi điều kiện không còn. Kiểm focus và error tại trường, không chỉ toast.
- [ ] **E2E-GUEST-06-4:** Sửa đúng trường lỗi; kiểm thông báo mất đi, không làm mất các trường khác.
- [ ] **E2E-GUEST-06-5:** Thử lưu lại, đối chiếu Network/response và Supabase nếu có ghi. F5/đăng nhập lại rồi xác minh dữ liệu; ghi PASS/FAIL/BLOCKED kèm bằng chứng.

#### E2E-GUEST-07 — Khách đặt hotel ngày trả trước ngày nhận
**Phạm vi:** Services. **Điều kiện:** dùng dữ liệu test có kiểm soát; ghi lại ID được tạo nếu có.
- [ ] **E2E-GUEST-07-1:** Truy cập màn hình với tài khoản Guest/Member/Admin đúng vai trò, ghi branch/URL/test data.
- [ ] **E2E-GUEST-07-2:** Thực hiện thao tác sai mô tả: Khách đặt hotel ngày trả trước ngày nhận. Ghi screenshot và lỗi hiện thực tế.
- [ ] **E2E-GUEST-07-3:** **Kết quả mong đợi:** lỗi checkOutDate, giá không bị tính sai. Kiểm focus và error tại trường, không chỉ toast.
- [ ] **E2E-GUEST-07-4:** Sửa đúng trường lỗi; kiểm thông báo mất đi, không làm mất các trường khác.
- [ ] **E2E-GUEST-07-5:** Thử lưu lại, đối chiếu Network/response và Supabase nếu có ghi. F5/đăng nhập lại rồi xác minh dữ liệu; ghi PASS/FAIL/BLOCKED kèm bằng chứng.

#### E2E-GUEST-08 — Khách đang chọn lịch thì slot hết
**Phạm vi:** Services. **Điều kiện:** dùng dữ liệu test có kiểm soát; ghi lại ID được tạo nếu có.
- [ ] **E2E-GUEST-08-1:** Truy cập màn hình với tài khoản Guest/Member/Admin đúng vai trò, ghi branch/URL/test data.
- [ ] **E2E-GUEST-08-2:** Thực hiện thao tác sai mô tả: Khách đang chọn lịch thì slot hết. Ghi screenshot và lỗi hiện thực tế.
- [ ] **E2E-GUEST-08-3:** **Kết quả mong đợi:** server conflict, giữ hồ sơ và cho chọn giờ khác. Kiểm focus và error tại trường, không chỉ toast.
- [ ] **E2E-GUEST-08-4:** Sửa đúng trường lỗi; kiểm thông báo mất đi, không làm mất các trường khác.
- [ ] **E2E-GUEST-08-5:** Thử lưu lại, đối chiếu Network/response và Supabase nếu có ghi. F5/đăng nhập lại rồi xác minh dữ liệu; ghi PASS/FAIL/BLOCKED kèm bằng chứng.

#### E2E-GUEST-09 — Khách thêm sản phẩm với số lượng lớn hơn tồn
**Phạm vi:** Shop. **Điều kiện:** dùng dữ liệu test có kiểm soát; ghi lại ID được tạo nếu có.
- [ ] **E2E-GUEST-09-1:** Truy cập màn hình với tài khoản Guest/Member/Admin đúng vai trò, ghi branch/URL/test data.
- [ ] **E2E-GUEST-09-2:** Thực hiện thao tác sai mô tả: Khách thêm sản phẩm với số lượng lớn hơn tồn. Ghi screenshot và lỗi hiện thực tế.
- [ ] **E2E-GUEST-09-3:** **Kết quả mong đợi:** lỗi quantity, chọn lại variant/quantity, đúng tồn kho. Kiểm focus và error tại trường, không chỉ toast.
- [ ] **E2E-GUEST-09-4:** Sửa đúng trường lỗi; kiểm thông báo mất đi, không làm mất các trường khác.
- [ ] **E2E-GUEST-09-5:** Thử lưu lại, đối chiếu Network/response và Supabase nếu có ghi. F5/đăng nhập lại rồi xác minh dữ liệu; ghi PASS/FAIL/BLOCKED kèm bằng chứng.

#### E2E-GUEST-10 — Khách checkout nhập sai SĐT, thiếu huyện, có voucher hợp lệ
**Phạm vi:** Shop Checkout. **Điều kiện:** dùng dữ liệu test có kiểm soát; ghi lại ID được tạo nếu có.
- [ ] **E2E-GUEST-10-1:** Truy cập màn hình với tài khoản Guest/Member/Admin đúng vai trò, ghi branch/URL/test data.
- [ ] **E2E-GUEST-10-2:** Thực hiện thao tác sai mô tả: Khách checkout nhập sai SĐT, thiếu huyện, có voucher hợp lệ. Ghi screenshot và lỗi hiện thực tế.
- [ ] **E2E-GUEST-10-3:** **Kết quả mong đợi:** 2 lỗi riêng, voucher/giỏ không mất, không tạo order. Kiểm focus và error tại trường, không chỉ toast.
- [ ] **E2E-GUEST-10-4:** Sửa đúng trường lỗi; kiểm thông báo mất đi, không làm mất các trường khác.
- [ ] **E2E-GUEST-10-5:** Thử lưu lại, đối chiếu Network/response và Supabase nếu có ghi. F5/đăng nhập lại rồi xác minh dữ liệu; ghi PASS/FAIL/BLOCKED kèm bằng chứng.

#### E2E-GUEST-11 — Khách tick xuất hóa đơn rồi bỏ mã số thuế
**Phạm vi:** Shop Checkout. **Điều kiện:** dùng dữ liệu test có kiểm soát; ghi lại ID được tạo nếu có.
- [ ] **E2E-GUEST-11-1:** Truy cập màn hình với tài khoản Guest/Member/Admin đúng vai trò, ghi branch/URL/test data.
- [ ] **E2E-GUEST-11-2:** Thực hiện thao tác sai mô tả: Khách tick xuất hóa đơn rồi bỏ mã số thuế. Ghi screenshot và lỗi hiện thực tế.
- [ ] **E2E-GUEST-11-3:** **Kết quả mong đợi:** lỗi taxCode; khi tắt hóa đơn lỗi phải biến mất. Kiểm focus và error tại trường, không chỉ toast.
- [ ] **E2E-GUEST-11-4:** Sửa đúng trường lỗi; kiểm thông báo mất đi, không làm mất các trường khác.
- [ ] **E2E-GUEST-11-5:** Thử lưu lại, đối chiếu Network/response và Supabase nếu có ghi. F5/đăng nhập lại rồi xác minh dữ liệu; ghi PASS/FAIL/BLOCKED kèm bằng chứng.

#### E2E-GUEST-12 — Khách áp voucher hết hạn sau khi đã chọn Paw Points
**Phạm vi:** Shop Checkout. **Điều kiện:** dùng dữ liệu test có kiểm soát; ghi lại ID được tạo nếu có.
- [ ] **E2E-GUEST-12-1:** Truy cập màn hình với tài khoản Guest/Member/Admin đúng vai trò, ghi branch/URL/test data.
- [ ] **E2E-GUEST-12-2:** Thực hiện thao tác sai mô tả: Khách áp voucher hết hạn sau khi đã chọn Paw Points. Ghi screenshot và lỗi hiện thực tế.
- [ ] **E2E-GUEST-12-3:** **Kết quả mong đợi:** giá không giảm sai, mã lỗi gần voucher, điểm không bị trừ. Kiểm focus và error tại trường, không chỉ toast.
- [ ] **E2E-GUEST-12-4:** Sửa đúng trường lỗi; kiểm thông báo mất đi, không làm mất các trường khác.
- [ ] **E2E-GUEST-12-5:** Thử lưu lại, đối chiếu Network/response và Supabase nếu có ghi. F5/đăng nhập lại rồi xác minh dữ liệu; ghi PASS/FAIL/BLOCKED kèm bằng chứng.

#### E2E-GUEST-13 — Khách mất mạng đúng lúc xác nhận mua hàng, bấm nhiều lần
**Phạm vi:** Shop Checkout. **Điều kiện:** dùng dữ liệu test có kiểm soát; ghi lại ID được tạo nếu có.
- [ ] **E2E-GUEST-13-1:** Truy cập màn hình với tài khoản Guest/Member/Admin đúng vai trò, ghi branch/URL/test data.
- [ ] **E2E-GUEST-13-2:** Thực hiện thao tác sai mô tả: Khách mất mạng đúng lúc xác nhận mua hàng, bấm nhiều lần. Ghi screenshot và lỗi hiện thực tế.
- [ ] **E2E-GUEST-13-3:** **Kết quả mong đợi:** giữ draft; không tạo trùng sales_order/payment/sales_order_detail. Kiểm focus và error tại trường, không chỉ toast.
- [ ] **E2E-GUEST-13-4:** Sửa đúng trường lỗi; kiểm thông báo mất đi, không làm mất các trường khác.
- [ ] **E2E-GUEST-13-5:** Thử lưu lại, đối chiếu Network/response và Supabase nếu có ghi. F5/đăng nhập lại rồi xác minh dữ liệu; ghi PASS/FAIL/BLOCKED kèm bằng chứng.

#### E2E-MEMBER-01 — Khách thành viên sửa email trùng trong profile
**Phạm vi:** User Profile. **Điều kiện:** dùng dữ liệu test có kiểm soát; ghi lại ID được tạo nếu có.
- [ ] **E2E-MEMBER-01-1:** Truy cập màn hình với tài khoản Guest/Member/Admin đúng vai trò, ghi branch/URL/test data.
- [ ] **E2E-MEMBER-01-2:** Thực hiện thao tác sai mô tả: Khách thành viên sửa email trùng trong profile. Ghi screenshot và lỗi hiện thực tế.
- [ ] **E2E-MEMBER-01-3:** **Kết quả mong đợi:** server error gắn profileEmailInput, dữ liệu cũ không bị mất. Kiểm focus và error tại trường, không chỉ toast.
- [ ] **E2E-MEMBER-01-4:** Sửa đúng trường lỗi; kiểm thông báo mất đi, không làm mất các trường khác.
- [ ] **E2E-MEMBER-01-5:** Thử lưu lại, đối chiếu Network/response và Supabase nếu có ghi. F5/đăng nhập lại rồi xác minh dữ liệu; ghi PASS/FAIL/BLOCKED kèm bằng chứng.

#### E2E-MEMBER-02 — Khách mở hai tab sửa địa chỉ, tab A lưu trước
**Phạm vi:** User Profile. **Điều kiện:** dùng dữ liệu test có kiểm soát; ghi lại ID được tạo nếu có.
- [ ] **E2E-MEMBER-02-1:** Truy cập màn hình với tài khoản Guest/Member/Admin đúng vai trò, ghi branch/URL/test data.
- [ ] **E2E-MEMBER-02-2:** Thực hiện thao tác sai mô tả: Khách mở hai tab sửa địa chỉ, tab A lưu trước. Ghi screenshot và lỗi hiện thực tế.
- [ ] **E2E-MEMBER-02-3:** **Kết quả mong đợi:** tab B nhận revision conflict, không ghi đè âm thầm. Kiểm focus và error tại trường, không chỉ toast.
- [ ] **E2E-MEMBER-02-4:** Sửa đúng trường lỗi; kiểm thông báo mất đi, không làm mất các trường khác.
- [ ] **E2E-MEMBER-02-5:** Thử lưu lại, đối chiếu Network/response và Supabase nếu có ghi. F5/đăng nhập lại rồi xác minh dữ liệu; ghi PASS/FAIL/BLOCKED kèm bằng chứng.

#### E2E-MEMBER-03 — Khách tạo bé cưng cân nặng 0, ngày sinh tương lai
**Phạm vi:** User Pets. **Điều kiện:** dùng dữ liệu test có kiểm soát; ghi lại ID được tạo nếu có.
- [ ] **E2E-MEMBER-03-1:** Truy cập màn hình với tài khoản Guest/Member/Admin đúng vai trò, ghi branch/URL/test data.
- [ ] **E2E-MEMBER-03-2:** Thực hiện thao tác sai mô tả: Khách tạo bé cưng cân nặng 0, ngày sinh tương lai. Ghi screenshot và lỗi hiện thực tế.
- [ ] **E2E-MEMBER-03-3:** **Kết quả mong đợi:** 2 lỗi rõ ràng, không insert pet_profile. Kiểm focus và error tại trường, không chỉ toast.
- [ ] **E2E-MEMBER-03-4:** Sửa đúng trường lỗi; kiểm thông báo mất đi, không làm mất các trường khác.
- [ ] **E2E-MEMBER-03-5:** Thử lưu lại, đối chiếu Network/response và Supabase nếu có ghi. F5/đăng nhập lại rồi xác minh dữ liệu; ghi PASS/FAIL/BLOCKED kèm bằng chứng.

#### E2E-MEMBER-04 — Khách đổi mật khẩu mới không có ký tự đặc biệt
**Phạm vi:** User Settings. **Điều kiện:** dùng dữ liệu test có kiểm soát; ghi lại ID được tạo nếu có.
- [ ] **E2E-MEMBER-04-1:** Truy cập màn hình với tài khoản Guest/Member/Admin đúng vai trò, ghi branch/URL/test data.
- [ ] **E2E-MEMBER-04-2:** Thực hiện thao tác sai mô tả: Khách đổi mật khẩu mới không có ký tự đặc biệt. Ghi screenshot và lỗi hiện thực tế.
- [ ] **E2E-MEMBER-04-3:** **Kết quả mong đợi:** báo newPassword cụ thể; không chỉ nút disabled vô lời giải thích. Kiểm focus và error tại trường, không chỉ toast.
- [ ] **E2E-MEMBER-04-4:** Sửa đúng trường lỗi; kiểm thông báo mất đi, không làm mất các trường khác.
- [ ] **E2E-MEMBER-04-5:** Thử lưu lại, đối chiếu Network/response và Supabase nếu có ghi. F5/đăng nhập lại rồi xác minh dữ liệu; ghi PASS/FAIL/BLOCKED kèm bằng chứng.

#### E2E-MEMBER-05 — Khách gửi khiếu nại đơn hàng, bỏ lý do, đính file 9MB
**Phạm vi:** User Support. **Điều kiện:** dùng dữ liệu test có kiểm soát; ghi lại ID được tạo nếu có.
- [ ] **E2E-MEMBER-05-1:** Truy cập màn hình với tài khoản Guest/Member/Admin đúng vai trò, ghi branch/URL/test data.
- [ ] **E2E-MEMBER-05-2:** Thực hiện thao tác sai mô tả: Khách gửi khiếu nại đơn hàng, bỏ lý do, đính file 9MB. Ghi screenshot và lỗi hiện thực tế.
- [ ] **E2E-MEMBER-05-3:** **Kết quả mong đợi:** 2 lỗi ngay vị trí, không xóa tiêu đề/chi tiết. Kiểm focus và error tại trường, không chỉ toast.
- [ ] **E2E-MEMBER-05-4:** Sửa đúng trường lỗi; kiểm thông báo mất đi, không làm mất các trường khác.
- [ ] **E2E-MEMBER-05-5:** Thử lưu lại, đối chiếu Network/response và Supabase nếu có ghi. F5/đăng nhập lại rồi xác minh dữ liệu; ghi PASS/FAIL/BLOCKED kèm bằng chứng.

#### E2E-MEMBER-06 — Khách phản hồi ticket và bấm gửi 2 lần do mạng chậm
**Phạm vi:** User Support. **Điều kiện:** dùng dữ liệu test có kiểm soát; ghi lại ID được tạo nếu có.
- [ ] **E2E-MEMBER-06-1:** Truy cập màn hình với tài khoản Guest/Member/Admin đúng vai trò, ghi branch/URL/test data.
- [ ] **E2E-MEMBER-06-2:** Thực hiện thao tác sai mô tả: Khách phản hồi ticket và bấm gửi 2 lần do mạng chậm. Ghi screenshot và lỗi hiện thực tế.
- [ ] **E2E-MEMBER-06-3:** **Kết quả mong đợi:** không tạo message đôi, nút pending rõ. Kiểm focus và error tại trường, không chỉ toast.
- [ ] **E2E-MEMBER-06-4:** Sửa đúng trường lỗi; kiểm thông báo mất đi, không làm mất các trường khác.
- [ ] **E2E-MEMBER-06-5:** Thử lưu lại, đối chiếu Network/response và Supabase nếu có ghi. F5/đăng nhập lại rồi xác minh dữ liệu; ghi PASS/FAIL/BLOCKED kèm bằng chứng.

#### E2E-MEMBER-07 — Khách đặt lại lịch đã bị Admin thay đổi
**Phạm vi:** Bookings. **Điều kiện:** dùng dữ liệu test có kiểm soát; ghi lại ID được tạo nếu có.
- [ ] **E2E-MEMBER-07-1:** Truy cập màn hình với tài khoản Guest/Member/Admin đúng vai trò, ghi branch/URL/test data.
- [ ] **E2E-MEMBER-07-2:** Thực hiện thao tác sai mô tả: Khách đặt lại lịch đã bị Admin thay đổi. Ghi screenshot và lỗi hiện thực tế.
- [ ] **E2E-MEMBER-07-3:** **Kết quả mong đợi:** conflict theo lịch hẹn, không đổi lịch trước khi server chấp nhận. Kiểm focus và error tại trường, không chỉ toast.
- [ ] **E2E-MEMBER-07-4:** Sửa đúng trường lỗi; kiểm thông báo mất đi, không làm mất các trường khác.
- [ ] **E2E-MEMBER-07-5:** Thử lưu lại, đối chiếu Network/response và Supabase nếu có ghi. F5/đăng nhập lại rồi xác minh dữ liệu; ghi PASS/FAIL/BLOCKED kèm bằng chứng.

#### E2E-ADMIN-01 — Admin tạo khách hàng số trùng, cân nặng bé âm
**Phạm vi:** Customers. **Điều kiện:** dùng dữ liệu test có kiểm soát; ghi lại ID được tạo nếu có.
- [ ] **E2E-ADMIN-01-1:** Truy cập màn hình với tài khoản Guest/Member/Admin đúng vai trò, ghi branch/URL/test data.
- [ ] **E2E-ADMIN-01-2:** Thực hiện thao tác sai mô tả: Admin tạo khách hàng số trùng, cân nặng bé âm. Ghi screenshot và lỗi hiện thực tế.
- [ ] **E2E-ADMIN-01-3:** **Kết quả mong đợi:** field error Phone và Weight riêng, không tạo hồ sơ nửa chừng. Kiểm focus và error tại trường, không chỉ toast.
- [ ] **E2E-ADMIN-01-4:** Sửa đúng trường lỗi; kiểm thông báo mất đi, không làm mất các trường khác.
- [ ] **E2E-ADMIN-01-5:** Thử lưu lại, đối chiếu Network/response và Supabase nếu có ghi. F5/đăng nhập lại rồi xác minh dữ liệu; ghi PASS/FAIL/BLOCKED kèm bằng chứng.

#### E2E-ADMIN-02 — Admin sửa khách từ modal, đồng thời modal con tạo pet
**Phạm vi:** Customers/Pets. **Điều kiện:** dùng dữ liệu test có kiểm soát; ghi lại ID được tạo nếu có.
- [ ] **E2E-ADMIN-02-1:** Truy cập màn hình với tài khoản Guest/Member/Admin đúng vai trò, ghi branch/URL/test data.
- [ ] **E2E-ADMIN-02-2:** Thực hiện thao tác sai mô tả: Admin sửa khách từ modal, đồng thời modal con tạo pet. Ghi screenshot và lỗi hiện thực tế.
- [ ] **E2E-ADMIN-02-3:** **Kết quả mong đợi:** giữ trường modal cha, lỗi modal con đúng scope. Kiểm focus và error tại trường, không chỉ toast.
- [ ] **E2E-ADMIN-02-4:** Sửa đúng trường lỗi; kiểm thông báo mất đi, không làm mất các trường khác.
- [ ] **E2E-ADMIN-02-5:** Thử lưu lại, đối chiếu Network/response và Supabase nếu có ghi. F5/đăng nhập lại rồi xác minh dữ liệu; ghi PASS/FAIL/BLOCKED kèm bằng chứng.

#### E2E-ADMIN-03 — Admin tạo lịch nhân viên trùng ca
**Phạm vi:** Staff/Services. **Điều kiện:** dùng dữ liệu test có kiểm soát; ghi lại ID được tạo nếu có.
- [ ] **E2E-ADMIN-03-1:** Truy cập màn hình với tài khoản Guest/Member/Admin đúng vai trò, ghi branch/URL/test data.
- [ ] **E2E-ADMIN-03-2:** Thực hiện thao tác sai mô tả: Admin tạo lịch nhân viên trùng ca. Ghi screenshot và lỗi hiện thực tế.
- [ ] **E2E-ADMIN-03-3:** **Kết quả mong đợi:** lỗi tại ca/ngày/nhân viên, không ghi ca trùng. Kiểm focus và error tại trường, không chỉ toast.
- [ ] **E2E-ADMIN-03-4:** Sửa đúng trường lỗi; kiểm thông báo mất đi, không làm mất các trường khác.
- [ ] **E2E-ADMIN-03-5:** Thử lưu lại, đối chiếu Network/response và Supabase nếu có ghi. F5/đăng nhập lại rồi xác minh dữ liệu; ghi PASS/FAIL/BLOCKED kèm bằng chứng.

#### E2E-ADMIN-04 — Admin nhập phụ phí âm và bỏ trống lý do
**Phạm vi:** Services. **Điều kiện:** dùng dữ liệu test có kiểm soát; ghi lại ID được tạo nếu có.
- [ ] **E2E-ADMIN-04-1:** Truy cập màn hình với tài khoản Guest/Member/Admin đúng vai trò, ghi branch/URL/test data.
- [ ] **E2E-ADMIN-04-2:** Thực hiện thao tác sai mô tả: Admin nhập phụ phí âm và bỏ trống lý do. Ghi screenshot và lỗi hiện thực tế.
- [ ] **E2E-ADMIN-04-3:** **Kết quả mong đợi:** 2 field errors, không tăng giá dịch vụ. Kiểm focus và error tại trường, không chỉ toast.
- [ ] **E2E-ADMIN-04-4:** Sửa đúng trường lỗi; kiểm thông báo mất đi, không làm mất các trường khác.
- [ ] **E2E-ADMIN-04-5:** Thử lưu lại, đối chiếu Network/response và Supabase nếu có ghi. F5/đăng nhập lại rồi xác minh dữ liệu; ghi PASS/FAIL/BLOCKED kèm bằng chứng.

#### E2E-ADMIN-05 — Admin tạo đơn mới thiếu địa chỉ và sản phẩm vượt tồn
**Phạm vi:** Orders. **Điều kiện:** dùng dữ liệu test có kiểm soát; ghi lại ID được tạo nếu có.
- [ ] **E2E-ADMIN-05-1:** Truy cập màn hình với tài khoản Guest/Member/Admin đúng vai trò, ghi branch/URL/test data.
- [ ] **E2E-ADMIN-05-2:** Thực hiện thao tác sai mô tả: Admin tạo đơn mới thiếu địa chỉ và sản phẩm vượt tồn. Ghi screenshot và lỗi hiện thực tế.
- [ ] **E2E-ADMIN-05-3:** **Kết quả mong đợi:** errors tách theo Address/Stock, không tạo đơn nửa chừng. Kiểm focus và error tại trường, không chỉ toast.
- [ ] **E2E-ADMIN-05-4:** Sửa đúng trường lỗi; kiểm thông báo mất đi, không làm mất các trường khác.
- [ ] **E2E-ADMIN-05-5:** Thử lưu lại, đối chiếu Network/response và Supabase nếu có ghi. F5/đăng nhập lại rồi xác minh dữ liệu; ghi PASS/FAIL/BLOCKED kèm bằng chứng.

#### E2E-ADMIN-06 — Admin chỉnh sửa voucher có ngày kết thúc trước ngày bắt đầu
**Phạm vi:** Settings/Promotions. **Điều kiện:** dùng dữ liệu test có kiểm soát; ghi lại ID được tạo nếu có.
- [ ] **E2E-ADMIN-06-1:** Truy cập màn hình với tài khoản Guest/Member/Admin đúng vai trò, ghi branch/URL/test data.
- [ ] **E2E-ADMIN-06-2:** Thực hiện thao tác sai mô tả: Admin chỉnh sửa voucher có ngày kết thúc trước ngày bắt đầu. Ghi screenshot và lỗi hiện thực tế.
- [ ] **E2E-ADMIN-06-3:** **Kết quả mong đợi:** báo trường ngày kết thúc, không publish voucher sai. Kiểm focus và error tại trường, không chỉ toast.
- [ ] **E2E-ADMIN-06-4:** Sửa đúng trường lỗi; kiểm thông báo mất đi, không làm mất các trường khác.
- [ ] **E2E-ADMIN-06-5:** Thử lưu lại, đối chiếu Network/response và Supabase nếu có ghi. F5/đăng nhập lại rồi xác minh dữ liệu; ghi PASS/FAIL/BLOCKED kèm bằng chứng.

#### E2E-ADMIN-07 — Admin lưu FAQ chatbot với phần trả lời trống
**Phạm vi:** Chatbot Rules. **Điều kiện:** dùng dữ liệu test có kiểm soát; ghi lại ID được tạo nếu có.
- [ ] **E2E-ADMIN-07-1:** Truy cập màn hình với tài khoản Guest/Member/Admin đúng vai trò, ghi branch/URL/test data.
- [ ] **E2E-ADMIN-07-2:** Thực hiện thao tác sai mô tả: Admin lưu FAQ chatbot với phần trả lời trống. Ghi screenshot và lỗi hiện thực tế.
- [ ] **E2E-ADMIN-07-3:** **Kết quả mong đợi:** báo ô Answer, không ghi rules rỗng. Kiểm focus và error tại trường, không chỉ toast.
- [ ] **E2E-ADMIN-07-4:** Sửa đúng trường lỗi; kiểm thông báo mất đi, không làm mất các trường khác.
- [ ] **E2E-ADMIN-07-5:** Thử lưu lại, đối chiếu Network/response và Supabase nếu có ghi. F5/đăng nhập lại rồi xác minh dữ liệu; ghi PASS/FAIL/BLOCKED kèm bằng chứng.

#### E2E-ADMIN-08 — Admin từ chối khiếu nại thiếu lý do
**Phạm vi:** Complaints. **Điều kiện:** dùng dữ liệu test có kiểm soát; ghi lại ID được tạo nếu có.
- [ ] **E2E-ADMIN-08-1:** Truy cập màn hình với tài khoản Guest/Member/Admin đúng vai trò, ghi branch/URL/test data.
- [ ] **E2E-ADMIN-08-2:** Thực hiện thao tác sai mô tả: Admin từ chối khiếu nại thiếu lý do. Ghi screenshot và lỗi hiện thực tế.
- [ ] **E2E-ADMIN-08-3:** **Kết quả mong đợi:** lỗi cạnh phần lý do, không đổi trạng thái ticket. Kiểm focus và error tại trường, không chỉ toast.
- [ ] **E2E-ADMIN-08-4:** Sửa đúng trường lỗi; kiểm thông báo mất đi, không làm mất các trường khác.
- [ ] **E2E-ADMIN-08-5:** Thử lưu lại, đối chiếu Network/response và Supabase nếu có ghi. F5/đăng nhập lại rồi xác minh dữ liệu; ghi PASS/FAIL/BLOCKED kèm bằng chứng.

#### E2E-SEC-01 — Người dùng đổi customerId/orderId trong request
**Phạm vi:** Auth/Supabase. **Điều kiện:** dùng dữ liệu test có kiểm soát; ghi lại ID được tạo nếu có.
- [ ] **E2E-SEC-01-1:** Truy cập màn hình với tài khoản Guest/Member/Admin đúng vai trò, ghi branch/URL/test data.
- [ ] **E2E-SEC-01-2:** Thực hiện thao tác sai mô tả: Người dùng đổi customerId/orderId trong request. Ghi screenshot và lỗi hiện thực tế.
- [ ] **E2E-SEC-01-3:** **Kết quả mong đợi:** server 403/404, không hiển thị dữ liệu của người khác. Kiểm focus và error tại trường, không chỉ toast.
- [ ] **E2E-SEC-01-4:** Sửa đúng trường lỗi; kiểm thông báo mất đi, không làm mất các trường khác.
- [ ] **E2E-SEC-01-5:** Thử lưu lại, đối chiếu Network/response và Supabase nếu có ghi. F5/đăng nhập lại rồi xác minh dữ liệu; ghi PASS/FAIL/BLOCKED kèm bằng chứng.

#### E2E-SEC-02 — Khách nhập `<script>` trong họ tên/nội dung hỗ trợ
**Phạm vi:** All. **Điều kiện:** dùng dữ liệu test có kiểm soát; ghi lại ID được tạo nếu có.
- [ ] **E2E-SEC-02-1:** Truy cập màn hình với tài khoản Guest/Member/Admin đúng vai trò, ghi branch/URL/test data.
- [ ] **E2E-SEC-02-2:** Thực hiện thao tác sai mô tả: Khách nhập `<script>` trong họ tên/nội dung hỗ trợ. Ghi screenshot và lỗi hiện thực tế.
- [ ] **E2E-SEC-02-3:** **Kết quả mong đợi:** chuỗi hiển thị nguyên văn, không thực thi HTML/JS. Kiểm focus và error tại trường, không chỉ toast.
- [ ] **E2E-SEC-02-4:** Sửa đúng trường lỗi; kiểm thông báo mất đi, không làm mất các trường khác.
- [ ] **E2E-SEC-02-5:** Thử lưu lại, đối chiếu Network/response và Supabase nếu có ghi. F5/đăng nhập lại rồi xác minh dữ liệu; ghi PASS/FAIL/BLOCKED kèm bằng chứng.

#### E2E-PERF-01 — Mở/đóng modal 15 lần rồi nhập một ký tự
**Phạm vi:** All SPA/Admin. **Điều kiện:** dùng dữ liệu test có kiểm soát; ghi lại ID được tạo nếu có.
- [ ] **E2E-PERF-01-1:** Truy cập màn hình với tài khoản Guest/Member/Admin đúng vai trò, ghi branch/URL/test data.
- [ ] **E2E-PERF-01-2:** Thực hiện thao tác sai mô tả: Mở/đóng modal 15 lần rồi nhập một ký tự. Ghi screenshot và lỗi hiện thực tế.
- [ ] **E2E-PERF-01-3:** **Kết quả mong đợi:** chỉ một validation listener; không popup/toast lặp. Kiểm focus và error tại trường, không chỉ toast.
- [ ] **E2E-PERF-01-4:** Sửa đúng trường lỗi; kiểm thông báo mất đi, không làm mất các trường khác.
- [ ] **E2E-PERF-01-5:** Thử lưu lại, đối chiếu Network/response và Supabase nếu có ghi. F5/đăng nhập lại rồi xác minh dữ liệu; ghi PASS/FAIL/BLOCKED kèm bằng chứng.

#### E2E-A11Y-01 — Người dùng chỉ sử dụng bàn phím bấm Lưu khi 3 trường sai
**Phạm vi:** All. **Điều kiện:** dùng dữ liệu test có kiểm soát; ghi lại ID được tạo nếu có.
- [ ] **E2E-A11Y-01-1:** Truy cập màn hình với tài khoản Guest/Member/Admin đúng vai trò, ghi branch/URL/test data.
- [ ] **E2E-A11Y-01-2:** Thực hiện thao tác sai mô tả: Người dùng chỉ sử dụng bàn phím bấm Lưu khi 3 trường sai. Ghi screenshot và lỗi hiện thực tế.
- [ ] **E2E-A11Y-01-3:** **Kết quả mong đợi:** focus ô sai đầu tiên, screen reader liên kết lỗi, tab order không mất. Kiểm focus và error tại trường, không chỉ toast.
- [ ] **E2E-A11Y-01-4:** Sửa đúng trường lỗi; kiểm thông báo mất đi, không làm mất các trường khác.
- [ ] **E2E-A11Y-01-5:** Thử lưu lại, đối chiếu Network/response và Supabase nếu có ghi. F5/đăng nhập lại rồi xác minh dữ liệu; ghi PASS/FAIL/BLOCKED kèm bằng chứng.

#### E2E-MOBILE-01 — Checkout trên màn hình 320px, bàn phím ảo đang mở
**Phạm vi:** Shop/User. **Điều kiện:** dùng dữ liệu test có kiểm soát; ghi lại ID được tạo nếu có.
- [ ] **E2E-MOBILE-01-1:** Truy cập màn hình với tài khoản Guest/Member/Admin đúng vai trò, ghi branch/URL/test data.
- [ ] **E2E-MOBILE-01-2:** Thực hiện thao tác sai mô tả: Checkout trên màn hình 320px, bàn phím ảo đang mở. Ghi screenshot và lỗi hiện thực tế.
- [ ] **E2E-MOBILE-01-3:** **Kết quả mong đợi:** lỗi hiện đủ bên ô; ô có thể scroll thấy và sửa. Kiểm focus và error tại trường, không chỉ toast.
- [ ] **E2E-MOBILE-01-4:** Sửa đúng trường lỗi; kiểm thông báo mất đi, không làm mất các trường khác.
- [ ] **E2E-MOBILE-01-5:** Thử lưu lại, đối chiếu Network/response và Supabase nếu có ghi. F5/đăng nhập lại rồi xác minh dữ liệu; ghi PASS/FAIL/BLOCKED kèm bằng chứng.

## 10. Danh mục form/field kiểm kê tự động từ ZIP — dùng làm checklist không bỏ sót
Bảng được sinh bằng cách parse **HTML tĩnh** ở `pages/**/*.html` thuộc Public, Services, Shop, User, Admin. Mỗi field có `id` hoặc `name` được liệt kê; **chưa bao gồm các ô do JavaScript sinh động, field điều khiển trong shadow DOM, lỗi trạng thái modal runtime** — phải bổ sung thủ công khi audit UI. Nhiều file lặp Header search, radio/checkbox và filter: phải phân loại trước khi áp quy tắc `required`.
| Khu vực | Số file HTML | Số thẻ form | Số thẻ input/select/textarea (thô, có lặp) |
| --- | --- | --- | --- |
| PUBLIC | 8 | 12 | 49 |
| SERVICES | 5 | 1 | 83 |
| SHOP | 8 | 4 | 69 |
| USER | 14 | 4 | 46 |
| ADMIN | 12 | 62 | 551 |

**Chú ý số đếm:** đây là số lần xuất hiện thẻ trong HTML tĩnh, **không** phải số trường nghiệp vụ duy nhất hoặc số lỗi xác minh. Không được dùng số đếm này để tuyên bố kiểm thử PASS.
### 10.1. Inventory — PUBLIC
#### pages/public/about/about.html · 1 field thô, 0 form
_Không có field định danh tĩnh đủ rõ; cần kiểm tra UI runtime._
#### pages/public/blog/blog.html · 4 field thô, 2 form
- [ ] **REG-0001** · `blogSearchInput` (`search`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0002** · `blogSortSelect` (`select`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-UNNAMED** · Có 2 thẻ nhập **thiếu cả `id` và `name`** trong file: phân loại header/search, các control động hoặc cần gắn định danh để liên kết nhãn/lỗi; không tự giả định chúng là field lưu DB.

#### pages/public/blog-detail/blog-detail.html · 5 field thô, 2 form
- [ ] **REG-0003** · `commentAuthorInput` (`text`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0004** · `commentEmailInput` (`email`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0005** · `commentContentInput` (`textarea`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0006** · `sidebarSearchInput` (`search`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-UNNAMED** · Có 1 thẻ nhập **thiếu cả `id` và `name`** trong file: phân loại header/search, các control động hoặc cần gắn định danh để liên kết nhãn/lỗi; không tự giả định chúng là field lưu DB.

#### pages/public/contact/contact.html · 5 field thô, 1 form
- [ ] **REG-0007** · `fullName` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0008** · `phoneNumber` (`tel`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0009** · `serviceInterest` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0010** · `message` (`textarea`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-UNNAMED** · Có 1 thẻ nhập **thiếu cả `id` và `name`** trong file: phân loại header/search, các control động hoặc cần gắn định danh để liên kết nhãn/lỗi; không tự giả định chúng là field lưu DB.

#### pages/public/landing/landing.html · 4 field thô, 1 form
- [ ] **REG-0011** · `bookingName` (`text`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0012** · `bookingPhone` (`tel`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0013** · `bookingService` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-UNNAMED** · Có 1 thẻ nhập **thiếu cả `id` và `name`** trong file: phân loại header/search, các control động hoặc cần gắn định danh để liên kết nhãn/lỗi; không tự giả định chúng là field lưu DB.

#### pages/public/login/login.html · 28 field thô, 5 form
- [ ] **REG-0014** · `loginPhone` (`tel`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0015** · `loginPassword` (`password`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0016** · `registerName` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0017** · `registerPhone` (`tel`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0018** · `registerPassword` (`password`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0019** · `registerConfirmPassword` (`password`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0020** · `username` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0021** · `setupPassword` (`password`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0022** · `setupConfirmPassword` (`password`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0023** · `setupTermsCheckbox` (`checkbox`) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0024** · `expiredPhone` (`tel`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0025** · `forgotPhone` (`tel`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0026** · `forgotNewPassword` (`password`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0027** · `forgotConfirmNewPassword` (`password`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-UNNAMED** · Có 13 thẻ nhập **thiếu cả `id` và `name`** trong file: phân loại header/search, các control động hoặc cần gắn định danh để liên kết nhãn/lỗi; không tự giả định chúng là field lưu DB.

#### pages/public/return-guest/return-guest.html · 2 field thô, 1 form
- [ ] **REG-0028** · `rg-phone` (`tel`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-UNNAMED** · Có 1 thẻ nhập **thiếu cả `id` và `name`** trong file: phân loại header/search, các control động hoặc cần gắn định danh để liên kết nhãn/lỗi; không tự giả định chúng là field lưu DB.

### 10.2. Inventory — SERVICES
#### pages/services/booking/booking.html · 31 field thô, 1 form
- [ ] **REG-0029** · `memberOwnerName` (`text`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0030** · `memberOwnerPhone` (`tel`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0031** · `ownerName` (`text`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0032** · `ownerPhone` (`tel`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0033** · `petName` (`text`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0034** · `petType` (`select`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0035** · `petTypeOther` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0036** · `petBreed` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0037** · `petWeight` (`number`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0038** · `petNote` (`textarea`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0039** · `svcSearchInput` (`text`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0040** · `checkInDate` (`date`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0041** · `checkOutDate` (`date`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0042** · `addonMeal` (`checkbox`) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0043** · `addonWalk` (`checkbox`) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0044** · `addonWalkQty` (`number`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0045** · `addonPlay` (`checkbox`) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0046** · `addonPlayQty` (`number`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0047** · `addonBath` (`checkbox`) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0048** · `addonBathQty` (`number`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0049** · `bookingDate` (`date`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0050** · `policyCheck` (`checkbox`) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0051** · `bookingVoucherInput` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0052** · `quickPetOwnerName` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0053** · `quickPetOwnerPhone` (`tel`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0054** · `quickPetName` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0055** · `quickPetSpecies` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0056** · `quickPetBreed` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0057** · `quickPetWeight` (`number`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0058** · `quickPetNote` (`textarea`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-UNNAMED** · Có 1 thẻ nhập **thiếu cả `id` và `name`** trong file: phân loại header/search, các control động hoặc cần gắn định danh để liên kết nhãn/lỗi; không tự giả định chúng là field lưu DB.

#### pages/services/booking-success/booking-success.html · 1 field thô, 0 form
_Không có field định danh tĩnh đủ rõ; cần kiểm tra UI runtime._
#### pages/services/index.html · 25 field thô, 0 form
- [ ] **REG-0059** · `sortFilter` (`radio`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0060** · `categoryFilter` (`radio`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0061** · `petFilter` (`radio`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0062** · `priceBucketFilter` (`radio`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0063** · `ratingAll` (`checkbox`) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0064** · `searchServiceInput` (`text`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-UNNAMED** · Có 6 thẻ nhập **thiếu cả `id` và `name`** trong file: phân loại header/search, các control động hoặc cần gắn định danh để liên kết nhãn/lỗi; không tự giả định chúng là field lưu DB.

#### pages/services/service-detail/service-detail.html · 1 field thô, 0 form
_Không có field định danh tĩnh đủ rõ; cần kiểm tra UI runtime._
#### pages/services/services.html · 25 field thô, 0 form
- [ ] **REG-0065** · `sortFilter` (`radio`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0066** · `categoryFilter` (`radio`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0067** · `petFilter` (`radio`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0068** · `priceBucketFilter` (`radio`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0069** · `ratingAll` (`checkbox`) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0070** · `searchServiceInput` (`text`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-UNNAMED** · Có 6 thẻ nhập **thiếu cả `id` và `name`** trong file: phân loại header/search, các control động hoặc cần gắn định danh để liên kết nhãn/lỗi; không tự giả định chúng là field lưu DB.

### 10.3. Inventory — SHOP
#### pages/shop/cart/cart.html · 3 field thô, 0 form
- [ ] **REG-0071** · `select-all-items` (`checkbox`) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0072** · `voucher-input` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-UNNAMED** · Có 1 thẻ nhập **thiếu cả `id` và `name`** trong file: phân loại header/search, các control động hoặc cần gắn định danh để liên kết nhãn/lỗi; không tự giả định chúng là field lưu DB.

#### pages/shop/checkout/checkout.html · 24 field thô, 2 form
- [ ] **REG-0073** · `fullName` (`text`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0074** · `phone` (`tel`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0075** · `address` (`text`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0076** · `city` (`select`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0077** · `district` (`select`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0078** · `note` (`textarea`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0079** · `saveAddress` (`checkbox`) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0080** · `points-slider` (`range`) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0081** · `use-points-checkbox` (`checkbox`) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0082** · `savePaymentMethod` (`checkbox`) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0083** · `invoice-checkbox` (`checkbox`) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0084** · `companyName` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0085** · `taxCode` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0086** · `companyAddress` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0087** · `invoiceEmail` (`email`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0088** · `voucher-input` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0089** · `modalFullName` (`text`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0090** · `modalPhone` (`tel`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0091** · `modalAddress` (`text`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0092** · `modalCity` (`select`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0093** · `modalDistrict` (`select`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0094** · `modalNote` (`textarea`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0095** · `modalSetDefault` (`checkbox`) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-UNNAMED** · Có 1 thẻ nhập **thiếu cả `id` và `name`** trong file: phân loại header/search, các control động hoặc cần gắn định danh để liên kết nhãn/lỗi; không tự giả định chúng là field lưu DB.

#### pages/shop/index.html · 15 field thô, 0 form
- [ ] **REG-0096** · `sortFilter` (`radio`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0097** · `priceFilter` (`radio`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0098** · `filterInStock` (`checkbox`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0099** · `filterOnSale` (`checkbox`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0100** · `searchInput` (`text`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-UNNAMED** · Có 1 thẻ nhập **thiếu cả `id` và `name`** trong file: phân loại header/search, các control động hoặc cần gắn định danh để liên kết nhãn/lỗi; không tự giả định chúng là field lưu DB.

#### pages/shop/payment-failed/payment-failed.html · 1 field thô, 0 form
_Không có field định danh tĩnh đủ rõ; cần kiểm tra UI runtime._
#### pages/shop/payment-success/payment-success.html · 1 field thô, 0 form
_Không có field định danh tĩnh đủ rõ; cần kiểm tra UI runtime._
#### pages/shop/product-detail/product-detail.html · 2 field thô, 0 form
- [ ] **REG-0101** · `quantity` (`number`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-UNNAMED** · Có 1 thẻ nhập **thiếu cả `id` và `name`** trong file: phân loại header/search, các control động hoặc cần gắn định danh để liên kết nhãn/lỗi; không tự giả định chúng là field lưu DB.

#### pages/shop/shop.html · 15 field thô, 0 form
- [ ] **REG-0102** · `sortFilter` (`radio`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0103** · `priceFilter` (`radio`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0104** · `filterInStock` (`checkbox`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0105** · `filterOnSale` (`checkbox`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0106** · `searchInput` (`text`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-UNNAMED** · Có 1 thẻ nhập **thiếu cả `id` và `name`** trong file: phân loại header/search, các control động hoặc cần gắn định danh để liên kết nhãn/lỗi; không tự giả định chúng là field lưu DB.

#### pages/shop/vnpay-sandbox/vnpay-sandbox.html · 8 field thô, 2 form
- [ ] **REG-0107** · `atm-card-number` (`text`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0108** · `atm-card-holder` (`text`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0109** · `atm-issue-date` (`text`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0110** · `otp-input` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0111** · `intl-card-number` (`text`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0112** · `intl-card-holder` (`text`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0113** · `intl-expiry` (`text`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0114** · `intl-cvv` (`password`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.

### 10.4. Inventory — USER
#### pages/user/index.html · 1 field thô, 0 form
_Không có field định danh tĩnh đủ rõ; cần kiểm tra UI runtime._
#### pages/user/modules/bookings/booking-detail.html · 1 field thô, 0 form
- [ ] **REG-0115** · `serviceReviewComment` (`textarea`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.

#### pages/user/modules/diary/diary.html · 1 field thô, 0 form
- [ ] **REG-0116** · `petSelector` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.

#### pages/user/modules/orders/orders.html · 1 field thô, 0 form
- [ ] **REG-0117** · `order-search` (`text`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.

#### pages/user/modules/pets/pets.html · 18 field thô, 1 form
- [ ] **REG-0118** · `avatar-input` (`file`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0119** · `petName` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0120** · `dog` (`radio`) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0121** · `cat` (`radio`) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0122** · `rabbit` (`radio`) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0123** · `other` (`radio`) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0124** · `otherSpecies` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0125** · `breed` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0126** · `male` (`radio`) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0127** · `female` (`radio`) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0128** · `weight` (`number`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0129** · `dob` (`date`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0130** · `color` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0131** · `vaccinated` (`checkbox`) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0132** · `vaccine-card-input` (`file`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0133** · `allergies` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0134** · `notes` (`textarea`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.

#### pages/user/modules/profile/profile.html · 6 field thô, 1 form
- [ ] **REG-0135** · `profileNameInput` (`text`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0136** · `profileEmailInput` (`email`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0137** · `profilePhoneInput` (`tel`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0138** · `newAddressStreetInput` (`input`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0139** · `newAddressDistrictInput` (`input`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0140** · `newAddressCityInput` (`input`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.

#### pages/user/modules/settings/settings.html · 6 field thô, 1 form
- [ ] **REG-0141** · `currentPassword` (`password`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0142** · `newPassword` (`password`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0143** · `confirmNewPassword` (`password`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0144** · `notifyEmail` (`checkbox`) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0145** · `notifySMS` (`checkbox`) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0146** · `languageSelect` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.

#### pages/user/modules/support/support-create.html · 9 field thô, 1 form
- [ ] **REG-0147** · `ticketType` (`select`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0148** · `serviceBookingSelect` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0149** · `serviceIssueType` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0150** · `orderSelect` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0151** · `orderIssueType` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0152** · `orderCustomerDemand` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0153** · `ticketTitle` (`text`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0154** · `ticketContent` (`textarea`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0155** · `ticketFile` (`file`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.

#### pages/user/modules/support/support.html · 3 field thô, 0 form
- [ ] **REG-0156** · `replyFileInput` (`file`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0157** · `replyTextarea` (`textarea`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0158** · `ratingComment` (`textarea`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.

### 10.5. Inventory — ADMIN
#### pages/admin/login/login.html · 4 field thô, 2 form
- [ ] **REG-0159** · `inputAdminEmail` (`email`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0160** · `inputAdminPassword` (`password`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0161** · `inputNewPassword` (`password`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0162** · `inputConfirmPassword` (`password`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.

#### pages/admin/modules/chatbot/chatbot.html · 55 field thô, 7 form
- [ ] **REG-0163** · `inboxSearchInput` (`text`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0164** · `chatMessageInput` (`textarea`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0165** · `adminChatFileInput` (`file`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0166** · `chatInternalNoteInput` (`textarea`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0167** · `inputCopilotSessionSearch` (`text`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0168** · `copilotInput` (`textarea`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0169** · `inputFaqSearch` (`text`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0170** · `selectFaqCategoryFilter` (`select`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0171** · `selectFaqStatusFilter` (`select`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0172** · `inputProfanitySearch` (`text`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0173** · `selectProfanitySeverityFilter` (`select`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0174** · `selectProfanityActionFilter` (`select`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0175** · `selectProfanityStatusFilter` (`select`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0176** · `inputCannedSearch` (`text`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0177** · `selectCannedCategoryFilter` (`select`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0178** · `selectCannedStatusFilter` (`select`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0179** · `inputPolicySearch` (`text`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0180** · `inputMatrixSearch` (`text`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0181** · `selectMatrixStatusFilter` (`select`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0182** · `rewardCustomerName` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0183** · `inputCustomRewardPoints` (`number`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0184** · `selectRewardReason` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0185** · `selectConvertTicketCategory` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0186** · `inputConvertRefId` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0187** · `inputConvertTicketTitle` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0188** · `selectConvertPriority` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0189** · `escalateCustomerName` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0190** · `selectEscalateReason` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0191** · `selectEscalateTarget` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0192** · `inputEscalateNotes` (`textarea`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0193** · `inputSearchCanned` (`text`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0194** · `selectCannedCategory` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0195** · `inputFaqCategory` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0196** · `inputFaqQuestionText` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0197** · `textareaFaqAnswerText` (`textarea`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0198** · `inputFaqKeywordsList` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0199** · `inputFaqPriorityNum` (`number`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0200** · `checkboxFaqIsActive` (`checkbox`) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0201** · `inputProfanityKeywordText` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0202** · `selectProfanitySeverityVal` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0203** · `selectProfanityActionVal` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0204** · `inputProfanityReplacementVal` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0205** · `checkboxProfanityIsActive` (`checkbox`) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0206** · `inputCannedShortcutText` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0207** · `inputCannedTitleText` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0208** · `inputCannedCategoryText` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0209** · `textareaCannedContentText` (`textarea`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0210** · `checkboxCannedIsActive` (`checkbox`) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0211** · `resolveChatCustomerName` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0212** · `selectResolveReason` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0213** · `textareaResolveNotes` (`textarea`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0214** · `checkboxSendCsatSurvey` (`checkbox`) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.

#### pages/admin/modules/complaints/complaints.html · 43 field thô, 4 form
- [ ] **REG-0215** · `serviceSearchInput` (`text`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0216** · `serviceFilterCategory` (`select`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0217** · `serviceFilterStatus` (`select`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0218** · `serviceFilterPriority` (`select`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0219** · `serviceFilterStaff` (`select`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0220** · `orderSearchInput` (`text`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0221** · `orderFilterIssue` (`select`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0222** · `orderFilterStatus` (`select`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0223** · `orderFilterPriority` (`select`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0224** · `orderFilterStaff` (`select`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0225** · `inputUploadMoreEvidence` (`file`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0226** · `inputUploadCheckinPhoto` (`file`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0227** · `inputUploadWarehousePhoto` (`file`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0228** · `replyType` (`radio`) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0229** · `replyContentInput` (`textarea`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0230** · `inputTicketCustomerPhone` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0231** · `inputTicketCustomerName` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0232** · `inputTicketRefSearch` (`text`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0233** · `selectTicketPriority` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0234** · `chkTicketUnverified` (`checkbox`) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0235** · `inputTicketTitle` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0236** · `inputTicketContent` (`textarea`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0237** · `inputTicketReceiver` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0238** · `inputTicketFiles` (`file`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0239** · `selectResolveOption` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0240** · `inputResolveRmaCode` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0241** · `selectResolveRmaPickup` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0242** · `selectResolveRmaWarehouse` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0243** · `inputResolveRmaReplacement` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0244** · `inputResolveRmaRefundAmount` (`number`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0245** · `inputResolveRedoTime` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0246** · `selectResolveRedoStaff` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0247** · `inputResolveRewardPoints` (`number`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0248** · `inputResolveRewardVoucher` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0249** · `inputResolveRefundAmount` (`number`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0250** · `selectResolveRefundMethod` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0251** · `inputResolveNote` (`textarea`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0252** · `selectAssignStaff` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0253** · `inputAssignNote` (`textarea`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0254** · `selectRequestChannel` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0255** · `inputRequestMessage` (`textarea`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.

#### pages/admin/modules/customers/customers.html · 37 field thô, 5 form
- [ ] **REG-0256** · `custSearchInput` (`text`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0257** · `custFilterTier` (`select`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0258** · `custFilterStatus` (`select`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0259** · `drawerCustNote` (`textarea`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0260** · `pawpointSearchInput` (`text`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0261** · `pawpointFilterType` (`select`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0262** · `quickAddName` (`text`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0263** · `quickAddPhone` (`tel`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0264** · `quickAddPetName` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0265** · `quickAddPetSpecies` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0266** · `quickAddPetWeight` (`number`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0267** · `quickAddPetBreed` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0268** · `quickAddAddress` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0269** · `adjustPhone` (`text`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0270** · `adjustType` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0271** · `adjustPointsVal` (`number`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0272** · `adjustReason` (`text`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0273** · `editCustFullName` (`text`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0274** · `editCustPhone` (`tel`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0275** · `editCustEmail` (`email`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0276** · `editCustGender` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0277** · `editCustDob` (`date`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0278** · `editCustTier` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0279** · `addPetName` (`text`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0280** · `addPetSpecies` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0281** · `addPetBreed` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0282** · `addPetWeight` (`number`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0283** · `addPetVaccine` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0284** · `addPetAlert` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0285** · `editPetName` (`text`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0286** · `editPetSpecies` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0287** · `editPetBreed` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0288** · `editPetWeight` (`number`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0289** · `editPetVaccine` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0290** · `editPetAlert` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.

#### pages/admin/modules/orders/orders.html · 98 field thô, 11 form
- [ ] **REG-0291** · `orderSearchInput` (`text`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0292** · `orderFilterStatus` (`select`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0293** · `orderFilterPayment` (`select`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0294** · `orderFilterPayStatus` (`select`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0295** · `checkSelectAllOrders` (`checkbox`) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0296** · `productSearchInput` (`text`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0297** · `productFilterCategory` (`select`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0298** · `productFilterStockStatus` (`select`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0299** · `promoSearchInput` (`text`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0300** · `createOrderPhone` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0301** · `createOrderName` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0302** · `radioAddrInStore` (`radio`) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0303** · `radioAddrDelivery` (`radio`) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0304** · `createOrderCustomAddress` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0305** · `createOrderFastDelivery` (`checkbox`) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0306** · `createOrderDeliverySlot` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0307** · `createOrderProductSearchInput` (`text`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0308** · `createOrderProductSelect` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0309** · `createOrderQty` (`number`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0310** · `createOrderVoucherCode` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0311** · `createOrderPointsInput` (`number`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0312** · `createOrderPaymentMethod` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0313** · `createOrderCashTendered` (`number`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0314** · `createOrderNote` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0315** · `shipCarrierSelect` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0316** · `shipTrackingInput` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0317** · `shipCarrierNote` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0318** · `cancelOrderReasonSelect` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0319** · `cancelOrderReasonDetail` (`textarea`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0320** · `batchCarrierSelect` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0321** · `batchTrackingMode` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0322** · `batchCarrierNote` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0323** · `rmaSolutionType` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0324** · `rmaReasonSelect` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0325** · `rmaRestockAction` (`radio`) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0326** · `rmaRefundMethod` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0327** · `rmaRefundAmountInput` (`number`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0328** · `rmaInternalNote` (`textarea`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0329** · `adjustOperationType` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0330** · `adjustQuantityInput` (`number`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0331** · `adjustPriceInput` (`number`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0332** · `adjustStatusSelect` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0333** · `adjustReasonSelect` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0334** · `newProdSku` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0335** · `newProdName` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0336** · `newProdCategory` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0337** · `newProdBrand` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0338** · `newProdPetType` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0339** · `newProdOrigin` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0340** · `newProdBadge` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0341** · `newProdStatus` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0342** · `newProdUnit` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0343** · `newProdSpec` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0344** · `newProdImages` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0345** · `chkEnableVariants` (`checkbox`) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0346** · `newProdCostPrice` (`number`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0347** · `newProdPrice` (`number`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0348** · `newProdOriginalPrice` (`number`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0349** · `newProdInitialStock` (`number`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0350** · `newProdMinStock` (`number`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0351** · `attr1Name` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0352** · `attr1TagInput` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0353** · `attr2Name` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0354** · `attr2TagInput` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0355** · `bulkCostPrice` (`number`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0356** · `bulkPrice` (`number`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0357** · `bulkOriginalPrice` (`number`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0358** · `bulkStock` (`number`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0359** · `bulkImage` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0360** · `newProdFeatures` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0361** · `newProdDescription` (`textarea`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0362** · `newProdIngredients` (`textarea`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0363** · `newProdBenefits` (`textarea`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0364** · `newProdUsage` (`textarea`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0365** · `newProdFeedingGuide` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0366** · `newProdExpiry` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0367** · `newProdStorage` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0368** · `newVoucherCode` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0369** · `newVoucherTitle` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0370** · `newVoucherDiscount` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0371** · `newVoucherMinOrder` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0372** · `newVoucherPoints` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0373** · `newVoucherExpiry` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0374** · `newVoucherMaxUses` (`number`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0375** · `voucherTargetStatus` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0376** · `voucherTargetExpiry` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0377** · `grnReceiptCode` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0378** · `grnSupplierSelect` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0379** · `grnInvoiceNo` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0380** · `grnWarehouseLocation` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0381** · `grnProductPicker` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0382** · `grnNoteInput` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0383** · `stkAuditCode` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0384** · `stkReasonSelect` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.

#### pages/admin/modules/pets/pets.html · 58 field thô, 6 form
- [ ] **REG-0385** · `petSearchInput` (`text`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0386** · `petFilterSpecies` (`select`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0387** · `petFilterBreed` (`select`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0388** · `petFilterWeight` (`select`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0389** · `petFilterVaccine` (`select`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0390** · `petGroomerNotes` (`textarea`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0391** · `petCarelogSearch` (`text`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0392** · `reminderSearchInput` (`text`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0393** · `reminderFilterType` (`select`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0394** · `reminderFilterStatus` (`select`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0395** · `newPetOwnerInput` (`text`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0396** · `newPetName` (`text`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0397** · `newPetSpecies` (`select`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0398** · `newPetBreed` (`text`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0399** · `newPetGender` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0400** · `newPetWeight` (`number`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0401** · `newPetDob` (`date`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0402** · `newPetColor` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0403** · `newPetVaccinated` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0404** · `newPetAlert` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0405** · `newPetAllergy` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0406** · `weighPetName` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0407** · `weighPetOldWeight` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0408** · `weighPetNewWeight` (`number`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0409** · `weighPetNote` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0410** · `reminderModalOwner` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0411** · `reminderModalPet` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0412** · `reminderTemplateSelect` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0413** · `reminderChannel` (`radio`) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0414** · `reminderMessageContent` (`textarea`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0415** · `editPetOwnerInput` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0416** · `editPetName` (`text`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0417** · `editPetSpecies` (`select`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0418** · `editPetBreed` (`text`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0419** · `editPetGender` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0420** · `editPetWeight` (`number`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0421** · `editPetDob` (`date`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0422** · `editPetColor` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0423** · `editPetStatus` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0424** · `editPetAlert` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0425** · `editPetAllergy` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0426** · `editPetNotes` (`textarea`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0427** · `quickOwnerName` (`text`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0428** · `quickOwnerPhone` (`tel`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0429** · `quickOwnerTier` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0430** · `quickOwnerAddress` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0431** · `newVaccineType` (`select`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0432** · `newCustomVaccineName` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0433** · `newVaccineDate` (`date`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0434** · `newVaccineNextDate` (`date`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0435** · `newVaccinePlace` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0436** · `newVaccineStatus` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0437** · `petPhotoFileInput` (`file`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-UNNAMED** · Có 1 thẻ nhập **thiếu cả `id` và `name`** trong file: phân loại header/search, các control động hoặc cần gắn định danh để liên kết nhãn/lỗi; không tự giả định chúng là field lưu DB.

#### pages/admin/modules/services/services.html · 121 field thô, 10 form
- [ ] **REG-0438** · `serviceSearchInput` (`text`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0439** · `serviceFilterCategory` (`select`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0440** · `serviceFilterStatus` (`select`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0441** · `serviceFilterStaff` (`select`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0442** · `newLogStepTitle` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0443** · `newLogStepStaff` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0444** · `newLogStepNote` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0445** · `carelogImageFileInput` (`file`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0446** · `catalogSearchInput` (`text`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0447** · `catalogFilterStatus` (`select`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0448** · `reviewSearchInput` (`text`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0449** · `reviewFilterStar` (`select`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0450** · `reviewFilterCategory` (`select`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0451** · `reviewFilterStaff` (`select`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0452** · `reviewFilterStatus` (`select`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0453** · `newBookingCustomer` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0454** · `newBookingPhone` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0455** · `newBookingPetName` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0456** · `newBookingCategory` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0457** · `newBookingServiceInput` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0458** · `newBookingDate` (`date`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0459** · `newBookingTime` (`time`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0460** · `newBookingHotelCheckOutDate` (`date`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0461** · `newBookingHotelCheckOutTime` (`time`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0462** · `newBookingHotelRoomType` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0463** · `newBookingHotelDiet` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0464** · `newBookingTaxiPickup` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0465** · `newBookingTaxiDropoff` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0466** · `newBookingTaxiTripType` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0467** · `newBookingTaxiDistance` (`number`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0468** · `newBookingSpaStyle` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0469** · `newBookingSpaGroomerLevel` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0470** · `newBookingStaff` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0471** · `newBookingBranch` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0472** · `newBookingPetAlert` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0473** · `newBookingNotes` (`textarea`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0474** · `formServiceId` (`text`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0475** · `formServiceGroup` (`select`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0476** · `formServiceName` (`text`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0477** · `formServicePetTypeInput` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0478** · `formServiceDuration` (`text`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0479** · `formPriceUnder5` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0480** · `formPrice5To10` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0481** · `formPrice10To20` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0482** · `formPriceOver20` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0483** · `formServiceDesc` (`textarea`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0484** · `serviceSopPresetSelect` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0485** · `newServiceStepInput` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0486** · `formServiceCommission` (`number`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0487** · `formServiceStaffLevel` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0488** · `formServiceStatus` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0489** · `cancelBookingReasonSelect` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0490** · `cancelBookingReasonDetail` (`textarea`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0491** · `replyPresetSelect` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0492** · `replyReviewText` (`textarea`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0493** · `replyVoucherSelect` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0494** · `surchargePresetSelect` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0495** · `surchargeNameInput` (`text`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0496** · `surchargeAmountInput` (`number`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0497** · `surchargeCommissionSelect` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0498** · `surchargeReasonInput` (`textarea`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0499** · `surchargeConsentSelect` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0500** · `surchargeConsentNote` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0501** · `surchargeProofFileInput` (`file`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0502** · `editCarelogStepTitle` (`text`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0503** · `editCarelogStepStaff` (`select`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0504** · `editCarelogStepTime` (`text`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0505** · `editCarelogStepDesc` (`textarea`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0506** · `editCarelogStepDone` (`checkbox`) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0507** · `editCarelogFileInput` (`file`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0508** · `accompanyingCategorySelect` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0509** · `accompanyingServiceItemSelect` (`select`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0510** · `accompanyingPriceInput` (`number`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0511** · `accompanyingStaffSelect` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0512** · `accompanyingNoteInput` (`textarea`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0513** · `intakePetWeightInput` (`number`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0514** · `intakeStaffSelect` (`select`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0515** · `checkAutoAddWeightSurcharge` (`checkbox`) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0516** · `checkSkinNormal` (`checkbox`) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0517** · `checkSkinFleas` (`checkbox`) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0518** · `checkSkinFungus` (`checkbox`) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0519** · `checkSkinMatted` (`checkbox`) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0520** · `checkEyesEarsNormal` (`checkbox`) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0521** · `checkEyesDischarge` (`checkbox`) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0522** · `checkEarsInfection` (`checkbox`) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0523** · `checkNoseRunny` (`checkbox`) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0524** · `checkWoundNone` (`checkbox`) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0525** · `checkWoundExisting` (`checkbox`) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0526** · `intakeExistingWoundNote` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0527** · `intakeTemperamentRadio` (`radio`) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0528** · `intakeBelongingsInput` (`textarea`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0529** · `intakeProofFileInput` (`file`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0530** · `changeStaffSelect` (`select`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0531** · `changeStaffPresetReason` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0532** · `changeStaffReasonInput` (`text`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0533** · `changeStaffScope` (`radio`) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0534** · `completeCheckQuality` (`checkbox`, HTML required) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0535** · `completeCheckBelongings` (`checkbox`, HTML required) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0536** · `completeVoucherSelect` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0537** · `completePointsSelect` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0538** · `completePaymentMethodSelect` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0539** · `completeCheckPaid` (`checkbox`) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0540** · `completeProofFileInput` (`file`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0541** · `pickupChannel` (`radio`) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0542** · `notifyPickupMessageText` (`textarea`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0543** · `notifyIncludeCarelogLink` (`checkbox`) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0544** · `notifyLogTimelineEvent` (`checkbox`) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-UNNAMED** · Có 4 thẻ nhập **thiếu cả `id` và `name`** trong file: phân loại header/search, các control động hoặc cần gắn định danh để liên kết nhãn/lỗi; không tự giả định chúng là field lưu DB.

#### pages/admin/modules/settings/settings.html · 72 field thô, 9 form
- [ ] **REG-0545** · `searchVoucherInput` (`text`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0546** · `filterVoucherTarget` (`select`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0547** · `filterVoucherStatus` (`select`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0548** · `searchArticleInput` (`text`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0549** · `filterArticleCategory` (`select`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0550** · `filterArticleStatus` (`select`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0551** · `searchAuditLogInput` (`text`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0552** · `filterAuditTargetModule` (`select`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0553** · `inputBannerTitle` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0554** · `inputBannerImage` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0555** · `inputBannerCta` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0556** · `inputBannerUrl` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0557** · `inputBannerStartDate` (`date`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0558** · `inputBannerEndDate` (`date`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0559** · `inputVoucherCode` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0560** · `inputVoucherName` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0561** · `inputVoucherType` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0562** · `inputVoucherValue` (`number`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0563** · `inputVoucherMinOrder` (`number`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0564** · `inputVoucherLimit` (`number`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0565** · `inputVoucherTarget` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0566** · `inputVoucherTier` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0567** · `inputVoucherStart` (`date`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0568** · `inputVoucherEnd` (`date`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0569** · `inputCfgPointValue` (`number`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0570** · `inputCfgRegisterPoints` (`number`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0571** · `inputCfgFirstOrderPoints` (`number`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0572** · `inputCfgFirstBookingPoints` (`number`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0573** · `inputCfgBirthdayPoints` (`number`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0574** · `inputNoticeContent` (`textarea`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0575** · `inputNoticeType` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0576** · `inputNoticeStatus` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0577** · `inputArticleTitle` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0578** · `inputArticleCategory` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0579** · `inputArticleStatus` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0580** · `inputArticleSummary` (`textarea`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0581** · `inputArticleContent` (`textarea`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0582** · `inputStoreBrandName` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0583** · `inputStoreCompanyName` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0584** · `inputStoreHotline` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0585** · `inputStoreEmergency` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0586** · `inputStoreEmail` (`email`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0587** · `inputStoreTaxId` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0588** · `inputStoreAddress` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0589** · `inputStoreZalo` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0590** · `inputStoreFacebook` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0591** · `toggleCodEnabled` (`checkbox`) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0592** · `toggleBankEnabled` (`checkbox`) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0593** · `toggleMomoEnabled` (`checkbox`) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0594** · `toggleVnpayEnabled` (`checkbox`) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0595** · `inputPaymentBank` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0596** · `inputPaymentAccNo` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0597** · `inputPaymentAccHolder` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0598** · `inputPaymentSyntax` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0599** · `inputFreeShippingThreshold` (`number`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0600** · `inputInnerCityFee` (`number`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0601** · `inputOuterCityFee` (`number`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0602** · `inputExpressFee` (`number`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0603** · `inputShippingProvider` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0604** · `inputShippingShopId` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0605** · `inputShippingApiKey` (`password`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0606** · `inputWeekdayOpen` (`time`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0607** · `inputWeekdayClose` (`time`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0608** · `inputWeekendOpen` (`time`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0609** · `inputWeekendClose` (`time`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0610** · `inputHotelCheckIn` (`time`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0611** · `inputHotelCheckOut` (`time`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0612** · `inputHotelLateFee` (`number`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0613** · `inputSlotCapacity` (`number`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0614** · `inputFreeCancelHours` (`number`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0615** · `inputLateCancelFee` (`number`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0616** · `inputAllowPickStaff` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.

#### pages/admin/modules/staff/staff.html · 63 field thô, 8 form
- [ ] **REG-0617** · `staffSearchInput` (`text`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0618** · `staffFilterPosition` (`select`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0619** · `staffFilterStatus` (`select`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0620** · `staffFilterShift` (`select`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0621** · `scheduleDatePicker` (`date`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0622** · `scheduleFilterPosition` (`select`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0623** · `scheduleFilterShift` (`select`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0624** · `assessmentSearchInput` (`text`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0625** · `assessmentFilterType` (`select`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0626** · `assessmentFilterResult` (`select`) — Filter/search: không ép required; kiểm empty state, cú pháp nếu cần. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0627** · `staffInputName` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0628** · `staffInputPhone` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0629** · `staffInputEmail` (`email`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0630** · `staffInputAddress` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0631** · `staffInputDob` (`date`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0632** · `staffInputJoinDate` (`date`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0633** · `staffInputPosition` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0634** · `staffInputShift` (`select`, HTML required) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0635** · `staffInputSpecialization` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0636** · `staffEnableAccountToggle` (`checkbox`) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0637** · `staffAccountEmail` (`email`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0638** · `staffAccountPassword` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0639** · `staffAccountSystemRole` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0640** · `staffMustChangePasswordCheckbox` (`checkbox`) — Nhóm chọn/điều kiện: chỉ required khi flow yêu cầu. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0641** · `shiftInputDate` (`date`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0642** · `shiftInputShift` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0643** · `assessInputStaff` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0644** · `assessInputDate` (`date`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0645** · `assessInputType` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0646** · `assessInputScore` (`number`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0647** · `assessInputResult` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0648** · `assessInputNote` (`textarea`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0649** · `leaveInputStaff` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0650** · `leaveInputType` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0651** · `leaveInputStartDate` (`date`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0652** · `leaveInputEndDate` (`date`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0653** · `leaveInputScope` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0654** · `leaveInputReplacement` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0655** · `leaveInputReason` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0656** · `swapInputStaffFrom` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0657** · `swapInputStaffTo` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0658** · `swapInputDateFrom` (`date`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0659** · `swapInputShiftFrom` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0660** · `swapInputDateTo` (`date`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0661** · `swapInputShiftTo` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0662** · `swapInputReason` (`text`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0663** · `reassignSelectAllStaff` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0664** · `incidentInputStaff` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0665** · `incidentInputBooking` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0666** · `incidentInputType` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0667** · `incidentInputExtend` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0668** · `incidentInputSeverity` (`select`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-0669** · `incidentInputNote` (`textarea`) — Kiểm tra required (nếu nghiệp vụ yêu cầu), format/range và lỗi server tương ứng. Gắn đúng field/group; sửa xong lỗi ẩn; retest submit/F5 nếu có lưu.
- [ ] **REG-UNNAMED** · Có 10 thẻ nhập **thiếu cả `id` và `name`** trong file: phân loại header/search, các control động hoặc cần gắn định danh để liên kết nhãn/lỗi; không tự giả định chúng là field lưu DB.

## 11. Phần kiểm kê runtime bắt buộc (HTML tĩnh không nhìn thấy)
- [ ] **RUNTIME-01:** Duyệt browser thật từng route, click mở mọi modal/drawer/accordion/step trong Admin và User.
- [ ] **RUNTIME-02:** Ghi ảnh/chụp video với DevTools Elements cho input được JS dựng bằng template string; đối chiếu IDs và field name.
- [ ] **RUNTIME-03:** Tìm `innerHTML`, `.insertAdjacentHTML`, `createElement` để phát hiện form động; chỉ render error bằng `textContent`.
- [ ] **RUNTIME-04:** Audit việc một ID xuất hiện nhiều lần khi modal được append vào `document.body` hoặc nội dung tab được load lại.
- [ ] **RUNTIME-05:** Thử các conditional rules trong JS và server cho tất cả hidden fields; hủy lỗi khi field không còn liên quan.
- [ ] **RUNTIME-06:** Kiểm tra dropdown autocomplete và popover: lỗi phải gắn control trigger, không tự tạo lựa chọn sai.
- [ ] **RUNTIME-07:** Audit mọi toast/alert liên quan validation trong `pages/**/*.js`; phân loại lỗi field vs hệ thống.
- [ ] **RUNTIME-08:** Tạo báo cáo coverage: registered form fields / actual editable fields; chỉ nghiệm thu sau khi kiểm thực tế.

## 12. Data-driven testing: bộ giá trị thử bắt buộc cho từng loại trường
| Loại | Dữ liệu test âm (negative) | Dữ liệu test dương (positive) | Đối chiếu quan trọng |
| --- | --- | --- | --- |
| Text required | `""`, `"   "`, tab/newline, chuỗi quá dài, emoji nếu bị cấm | Tên tiếng Việt có dấu, dấu gạch hợp lệ | Trim nhưng không làm mất dấu; giới hạn DB thật |
| Phone | `09123`, `1234567890`, `09123456789`, chữ, ký tự lạ | `0912345678` | Theo policy số VN hiện đang dùng |
| Email | `a`, `a@`, `a@b`, khoảng trắng giữa, email trùng | `khach@example.com` | Optional rỗng nếu schema cho phép; unique server |
| Password | 7 ký tự; thiếu số; thiếu đặc biệt; không khớp | Chuỗi test đạt chính sách hiện hành | Không log mật khẩu, không hiện password thô |
| OTP | 5 số, chữ, OTP sai, hết hạn, retry nhanh | 6 số hợp lệ do backend tạo | Không dùng OTP thật trong log/bằng chứng |
| Number / qty | `0`, `-1`, `1.5` khi chỉ integer, `NaN`, vô cực, rất lớn | `1`, `2`, số trong dải hợp lệ | Có kiểm tra cả backend và race stock |
| Weight | `0`, `-2`, chữ, số cực lớn, `4,5` tùy locale | `4.5` | Xử lý dấu phẩy thập phân rõ ràng, không tự ép sai |
| Date/time | Ngày quá khứ, ngày 31/02, end<=start, slot vừa hết | Ngày tương lai có slot thực | Múi giờ Việt Nam, backend chống double booking |
| Select/radio | Chưa chọn, stale option ID, lựa chọn bị xóa | ID có thật và thuộc quyền | Không chỉ kiểm label hiển thị |
| Checkbox policy | Chưa tick khi bắt buộc; chọn→bỏ chọn | Tích theo ngữ cảnh | Không vô tình dùng policy của luồng khác |
| Voucher | Mã sai, hết hạn, quá quota, ngoài đối tượng | Mã hợp lệ test fixture | Giá tính lại backend, không trừ điểm sai |
| File upload | > limit, MIME không hỗ trợ, 0-byte, file giả đuôi `.jpg` | File ảnh nhỏ hợp lệ | Backend xác minh MIME, giới hạn storage |
| Rich text | HTML nguy hiểm, script, unicode dài | Văn bản rõ ràng | TextContent/escape và giới hạn data |
| Network | offline, 500, 429, timeout, stale session | 200/201 server verified | Không có success giả, không double write |


## 13. Quy ước test ID / bằng chứng / trạng thái
```markdown
| Test ID | Role | Route/Form | Field | Giá trị thử | Expected inline error | Result | Evidence | Commit |
|---|---|---|---|---|---|---|---|---|
| FM-024 | Guest | /checkout / shipping-form | phone | 09123 | Số điện thoại cần 10 số | NOT RUN | — | — |

- [ ] **NOT RUN:** chưa thực thi thao tác thực tế.
- [ ] **PASS:** có thao tác, bằng chứng và dữ liệu đối chiếu phù hợp.
- [ ] **FAIL:** có hành vi thực tế khác expected.
- [ ] **RETEST:** đã sửa nhưng chưa test lại.
- [ ] **BLOCKED:** môi trường/quyền dữ liệu/endpoint không cho phép kiểm thử.
```
**Không đánh dấu `- [x]` chỉ vì code đã sửa, lint/node syntax pass hay mô phỏng không kết nối backend.** Nếu chạy automated tests, lưu lệnh thực thi, exit code, output, commit và môi trường.

## 14. Quy tắc bắt buộc cập nhật Markdown và nhật ký sau mỗi lần sửa
- [ ] **SYNC-01:** Trước sửa: chọn mã `VAL-xx` + `FM-xxx` / `REG-xxxx` / E2E ID bị ảnh hưởng.
- [ ] **SYNC-02:** Ghi lỗi ban đầu có ảnh trước, cách tái hiện, nguyên nhân và tầng lỗi (UI/API/DB/flow).
- [ ] **SYNC-03:** Sửa code ít nhất có thể: tái dùng markup `Err` đang có, không thay đổi workflow nếu không được yêu cầu.
- [ ] **SYNC-04:** Cập nhật dòng checklist: đã sửa gì, path nào, function nào, thêm test ID nào, retest kết quả.
- [ ] **SYNC-05:** Không xóa lịch sử lỗi đã giải quyết; ghi liên kết PR/commit và phiên bản deploy tương ứng.
- [ ] **SYNC-06:** Tách trạng thái code-change (`DONE`) với test-result (`PASS/FAIL/NOT RUN`).
- [ ] **SYNC-07:** Sửa field validation làm thay đổi request payload thì kiểm E2E Supabase/Admin liên quan.
- [ ] **SYNC-08:** Nếu thêm DB constraint/enum thì ghi migration + rollback + kiểm RLS, tuyệt đối không tự sửa CSDL trái thiết kế.

```markdown
### CHG-YYYYMMDD-001 — Chuẩn hóa lỗi form Checkout
- Ngày/Người thực hiện:
- Commit / PR / Deployment URL:
- Modules & test IDs: VAL-08-xx, FM-0xx, E2E-GUEST-10
- Lỗi cũ và cách tái hiện:
- Root cause (UI / backend / Supabase / business rule):
- File/hàm đã sửa:
- Quy tắc validation / mapping error mới:
- DB/enum/RLS ảnh hưởng: Có/Không — chi tiết
- Kiểm thử đã chạy (thực tế):
- Trạng thái: NOT RUN / PASS / FAIL / RETEST / BLOCKED
- Screenshot / Console / requestId (che dữ liệu nhạy cảm):
- Regression cases phải chạy lại:
- Việc còn tồn đọng / rollback:
```
**Rule đưa vào `AGENTS.md` nếu chấp thuận:** *Mọi PR thay đổi form/API liên quan dữ liệu đầu vào bắt buộc có field-level error kế hoạch, kiểm thử âm/dương và cập nhật Markdown này. Nếu không thể thực thi E2E, ghi NOT RUN kèm lý do, không dùng PASS.*

## 15. Quy trình rollout khuyến nghị + nghiệm thu cuối
**Thứ tự triển khai ưu tiên:** P0 (checkout, booking, auth, account profile, thanh toán/orders, API error) → P1 (pets, support, admin customers/services, settings) → P2 (content editor, đánh giá, các form ít sử dụng). Làm từng module trong PR nhỏ, không đẩy hàng loạt vào production.
- [ ] **AC-01:** 100% P0 form có inline errors đúng trường cho trường bắt buộc, format và các lỗi server map được.
- [ ] **AC-02:** Không có P0 flow báo lưu/thanh toán thành công khi server thất bại hoặc DB ghi chưa đủ.
- [ ] **AC-03:** Tất cả bước đặt lịch/checkout/booking giữ thông tin khác khi sửa một trường sai.
- [ ] **AC-04:** Các biểu mẫu modal/drawer/wizard không lặp listener, không focus field đang bị ẩn.
- [ ] **AC-05:** 100% API ghi vẫn có server validation và phân quyền dù tắt JS client validation.
- [ ] **AC-06:** Lỗi server không render HTML độc hại, không lộ stack trace, SQL, khóa riêng.
- [ ] **AC-07:** Khách dùng keyboard/screen reader hiểu trường sai, sửa được; mobile vẫn thấy lỗi.
- [ ] **AC-08:** Checkbox checklist có bằng chứng, commit, môi trường và trạng thái đúng.
- [ ] **AC-09:** Có rollback UI validation độc lập với server-side validation.
- [ ] **AC-10:** Sau pilot, không gây tăng đáng kể request duplicate khi blur/input; async validation debounce + cancel.

**KPI gợi ý để tự đo, không phải số PawPal đã đạt:** tỉ lệ submit bị từ chối do dữ liệu hợp lệ/không hợp lệ, % field error có thể click/focus, % sự cố trả lỗi rõ ràng, % E2E PASS, số lỗi duplicate write, thời gian trung vị hoàn thành form, số khiếu nại “không biết sai ở đâu”. Đặt baseline rồi chốt ngưỡng phù hợp bằng số đo thật.

## 16. Phạm vi đã / chưa xác minh
| Hạng mục | Trạng thái | Chú ý |
| --- | --- | --- |
| Danh sách file trong ZIP | ĐÃ ĐỌC TĨNH | Dựa trên code người dùng gửi; không khẳng định đồng nhất GitHub HEAD mới nhất. |
| Các ví dụ field và JS | ĐÃ ĐỐI CHIẾU TĨNH | Các `id` tiêu biểu lấy từ HTML; đề xuất code mới chưa được chạy. |
| Danh sách các form động | CHƯA KIỂM ĐỦ | Phải mở UI runtime và audit JS templates. |
| Schema Supabase thực tế, indexes/RLS | CHƯA TRUY CẬP | Không sử dụng khóa thật hoặc thao tác DB production. |
| Kiểm thử website thực sự trong trình duyệt | ĐÃ CHẠY MỘT PHẦN | Đã kiểm modal Thêm khách trên localhost bằng phiên Admin sẵn có; lỗi required chưa đạt UX mục tiêu. Chưa chạy E2E lưu/F5/DB, mobile và các form còn lại. |
| Triển khai/fix code | CHƯA THỰC HIỆN | File này là kế hoạch + checklist + mẫu code; không phải PR. |

**Kết luận triển khai:** Không cần xây lại toàn bộ giao diện hay thay database chỉ vì validation. Điểm cần làm là **chuẩn hóa hành vi và giao tiếp lỗi xuyên suốt UI ↔ API ↔ Supabase**, ưu tiên các thao tác có ghi dữ liệu và giao dịch; giữ nguyên quy tắc thiết kế Admin hiện có.

---
**Hết kế hoạch.**

## Nhật ký GĐ-00 — 20/10/2026

- Trạng thái: ĐANG THỰC HIỆN, chưa đạt gate GĐ-00; chưa sửa mã chức năng.
- Baseline: main / 9a2d45224d6ac489170e4afdc2b9a749810e2d4c, có thay đổi sẵn trong working tree.
- Báo cáo và backlog: [docs/audits/gd00-20261020/README.md](../audits/gd00-20261020/README.md).
- Kiểm kê tĩnh: 47 HTML, 83 form, 798 control; script chạy exit 0. Không xem số đếm là E2E PASS.
- Local đã có scripts/shared/address-validation.mjs; deployment chưa xác minh.
- FM-037 baseline required: FAIL so với UX mục tiêu — popup native tiếng Anh, focus tên; chưa chạy positive/save/F5/DB. Có ảnh trong thư mục audit.
- VAL-00-01 đến VAL-00-10 còn phạm vi chưa hoàn tất; giữ nguyên checkbox, không đánh dấu PASS thay cho đọc mã.

### Phiên bản và phạm vi đã ghi nhận

- HEAD đầu đợt: `9a2d45224d6ac489170e4afdc2b9a749810e2d4c` trên `main`; 5 file chức năng có thay đổi sẵn, đã lưu tracked diff và trạng thái ban đầu trong thư mục audit.
- HEAD cuối đợt: `b078d165fc131e7048eab4449e4d1a1dc2068031`; có hoạt động bên ngoài đợt audit. Audit không chạy commit/reset. Cần đối chiếu phiên bản mới trước khi sửa và nghiệm thu; chưa coi baseline đã đóng băng xuyên suốt.
- Lệnh kiểm kê: `node docs/audits/gd00-20261020/inventory.cjs`, Node v24.15.0, exit code `0`.
- Đầu ra: [danh sách trường](../audits/gd00-20261020/fields.csv), [danh sách form](../audits/gd00-20261020/forms.csv), [tín hiệu render/validation/lifecycle](../audits/gd00-20261020/dynamic-signals.csv), [hash nguồn](../audits/gd00-20261020/source-hashes.csv).
- 1.731 dòng tín hiệu JavaScript là ứng viên rà soát, không phải số form động hay số lỗi. Phân loại trường/filter hiện mới là sơ bộ.

### Phát hiện ban đầu

| Mã | Ưu tiên | Kết quả và mức xác minh | Mã kế hoạch liên quan |
|---|---|---|---|
| GD00-01 | P1 | **Đã tái hiện UI / FAIL UX**: modal Thêm khách để trống rồi Lưu hiện popup native `Please fill out this field.`, focus `quickAddName`; chưa có bộ lỗi inline đồng thời cho tên và SĐT. Đóng modal thành công. | VAL-12-01, FM-037 |
| GD00-02 | P0 | **Xác nhận từ mã, runtime NOT RUN**: `saveContactTicket()` có nhánh tự tạo mã `CT-${Date.now()}` khi thiếu provider hoặc result rỗng; handler reset form và báo đã nhận. Chưa kết luận ticket thực tế bị mất. | VAL-05-04, FM-010 |
| GD00-03 | P0 | **Xác nhận từ mã, runtime NOT RUN**: checkout có nhánh lỗi địa chỉ đã lưu và hóa đơn chỉ báo toast chung; cần kiểm đủ markup và focus trước khi kết luận toàn bộ form. | VAL-08, FM-024–027 |
| GD00-04 | P0 | **Xác nhận từ mã, API thực tế NOT RUN**: profile persistence đã kiểm tên/email/revision/địa chỉ nhưng nhiều nhánh trả Error chuỗi; cần trace HTTP adapter và ánh xạ lỗi trường. | VAL-03, VAL-09, FM-028–029 |
| GD00-05 | P0 | **Cần xác minh DB**: có migration phone/weight trong repo; chưa xác nhận đã apply, constraint/RLS live hoặc escaping regex phone. Không chạy migration. | VAL-00-05 |
| GD00-06 | P1 | **Đã xác minh local**: `scripts/shared/address-validation.mjs` tồn tại và được client/backend import; deployment/GitHub chưa xác minh. | VAL-00-06, VAL-09-08 |
| GD00-07 | P1 | **Đã đọc mã một phần**: có global close/cancel/backdrop/Escape; chưa kiểm lifecycle và listener toàn bộ modal/SPA. | VAL-00-08, RUNTIME-04 |

Ảnh baseline: [customer-empty-baseline.png](../audits/gd00-20261020/customer-empty-baseline.png). Chỉ phần required của FM-037 đã chạy; chưa hoàn thành toàn bộ FM-037 hoặc E2E-ADMIN-01. Chưa có Network capture để xác nhận số request ghi.

### Tiến độ GĐ-00

| Mã | Trạng thái thực hiện | Phần còn lại |
|---|---|---|
| VAL-00-01 | Một phần | Xác minh ZIP/backup đầy đủ và chốt lại phiên bản sau thay đổi HEAD. |
| VAL-00-02 | Một phần | Rà form do JavaScript tạo và mở các modal/drawer/wizard còn lại. |
| VAL-00-03 | Một phần | Xác nhận phân loại nghiệp vụ từng trường và rule có điều kiện. |
| VAL-00-04 | Một phần | Mở rộng phân loại lỗi cho các module chưa rà sâu. |
| VAL-00-05 | Một phần | Đối chiếu schema, constraint, API response và RLS thực tế. |
| VAL-00-06 | Một phần | Xác minh file address-validation trên deployment/GitHub. |
| VAL-00-07 | Một phần | Bổ sung mobile, Console/Network, thời gian và baseline các form khác. |
| VAL-00-08 | Một phần | Kiểm quy ước mount/unmount, listener và hành vi modal toàn hệ thống. |
| VAL-00-09 | Một phần | Hoàn thiện backlog từng form; hiện có owner Codex và thứ tự ưu tiên, chưa chốt hạn. |
| VAL-00-10 | Đang thực hiện | Tiếp tục bổ sung bằng chứng; chưa nghiệm thu GĐ-00. |

### Việc tiếp theo và quy tắc giữ nguyên

1. Đối chiếu HEAD mới và hoàn thiện baseline modal khách hàng đang kiểm theo quy trình từng modal trong AGENTS.md mục 8.
2. Rà các luồng P0 Liên hệ, xác thực, booking, checkout, hồ sơ và API liên quan; phân biệt lỗi đã tái hiện với nghi vấn từ mã.
3. Hoàn thiện kiểm kê form động, mobile, Console/Network và xác minh metadata Supabase bằng quyền đọc phù hợp.

Không đánh dấu hoàn thành checkbox hoặc E2E PASS từ kết quả script kiểm kê. Chưa chuyển GĐ-01. Khi triển khai Admin, mẫu icon và viền trái summary trong kế hoạch phải nhường quy tắc AGENTS.md: text-only ngoài sidebar, không viền trái ngoài alert trong bảng.

## Nhật ký tiếp tục GĐ-00 — 21/10/2026

- **ĐANG THỰC HIỆN; gate CHƯA ĐẠT; chưa chuyển GĐ-01.** Phiên này tiếp tục audit, không sửa mã chức năng.
- Baseline mới: `main` / `37c274561460ff5351dafd175636cfc79697f6b0`, working tree sạch trước khi thêm audit. Đã lưu archive nguồn tracked có chọn phạm vi và kiểm CRC/SHA-256; không phải ZIP gốc/full workspace/DB backup.
- Báo cáo mới: [docs/audits/gd00-20261021/README.md](../audits/gd00-20261021/README.md). Giữ nguyên lịch sử và ảnh đợt 20/10.
- Kiểm kê lại: **47 HTML, 83 form mở, 798 control tĩnh**, 1.732 dòng tín hiệu JS và 56 literal control/form trong JS cần rà runtime. Không xem các số này là coverage hoặc E2E PASS.
- Parser ghép 82 cặp form; đã truy nguyên source `login.html` thiếu thẻ đóng của `forgotNewPasswordForm`. Chưa xác minh DOM runtime.
- Đã phân loại rule 7 field của modal Thêm khách; bổ sung backlog về custom validity còn lưu sau sửa, nguy cơ submit trùng/ghi nhiều bảng từng phần, khác biệt policy phone và conditional weight. Đây là bằng chứng source, runtime NOT RUN.
- Đã trace profile-save qua `/api/customer/auth/me`: wrapper hiện trả exception dưới dạng HTTP 400 + message, chưa có field error contract. Cần kiểm API thực tế trước khi nghiệm thu.
- GET `/admin`, `/contact`, `/login`, `/booking`, `/checkout`: HTTP 200. GET `address-validation.mjs`: HTTP 200 và SHA-256 khớp local. GitHub fetch_file tại đúng commit audit xác nhận file tồn tại, blob SHA khớp local; production chưa xác minh.
- **Browser runtime BLOCKED:** inventory không có browser/app, Chrome và iab không khả dụng; kiểm lại sau phản hồi người dùng vẫn chưa có surface. Chưa tạo ảnh/Console/Network/mobile hoặc chạy lại FM-037 trong phiên này. Ảnh FAIL cũ chỉ là bằng chứng ngày 20/10.
- **Metadata live BLOCKED qua cấu hình hiện tại:** sandbox EACCES; sau escalation anon HTTP 401, cấu hình backend HTTP 402. Không suy đoán nguyên nhân 402; chưa truy cập schema/constraint/index/trigger/RLS, không đọc dòng nghiệp vụ hay ghi DB.
- `refresh.cjs` và `verify.py` exit 0 chỉ xác nhận artifact audit. VAL-00-01–10 vẫn còn phạm vi chưa hoàn tất; giữ checkbox chưa tích, không đánh dấu E2E PASS.
- Tiếp tục khi có môi trường: kiểm trực quan modal Thêm khách hiện tại và metadata/catalog chỉ đọc; báo cáo nghiệm thu modal theo AGENTS.md mục 8 trước khi chuyển sang modal khác.
