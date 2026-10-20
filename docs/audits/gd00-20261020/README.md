# GĐ-00 — Báo cáo khởi động kiểm kê validation

Ngày: 20/10/2026 (Asia/Bangkok). Trạng thái: **ĐANG THỰC HIỆN; chưa đạt gate GĐ-00**.

## Phiên bản và phạm vi bằng chứng

- Branch `main`, HEAD `9a2d45224d6ac489170e4afdc2b9a749810e2d4c`.
- Kiểm tra cuối đợt thấy HEAD đã đổi thành `b078d165fc131e7048eab4449e4d1a1dc2068031`, tracked working tree sạch. Audit này không chạy commit/reset: có hoạt động ngoài đợt audit. Vì vậy baseline chưa đóng băng xuyên suốt; hashes và patch ghi nhận mốc đọc, cần đối chiếu commit mới trước khi sửa hoặc nghiệm thu.
- Working tree không sạch: 5 file chức năng đã sửa trước đợt audit. Xem `initial-status.txt` và bản lưu `pre-existing-changes.patch`. Không reset, commit hoặc thay đổi các file này.
- Bản lưu patch chỉ chứa tracked diff; không phải backup toàn bộ workspace hoặc CSDL. Các file nguồn HTML/JS/MJS trong `pages/` được ghi SHA-256 ở `source-hashes.csv`; chưa định danh bản ZIP gốc vì chưa xác minh artifact ZIP.
- SHA-256 master plan trước khi thêm nhật ký: `601AE34D1FE90AB38D4F67537BFCD9165ADC46CD89336C3AEF460F24C3D86E52`.
- Kiểm kê tĩnh chạy bằng Node v24.15.0: `node docs/audits/gd00-20261020/inventory.cjs`, exit 0. Không thực thi mã ứng dụng, không kết nối DB trong script.
- Browser: localhost:3000, phiên Admin sẵn có; quan sát Dashboard, Khách hàng và modal Thêm khách. Không gửi form hợp lệ, không chủ động ghi DB.

## Kiểm kê tĩnh

| Khu vực | HTML | Form | Control |
|---|---:|---:|---:|
| Admin | 12 | 62 | 551 |
| Public | 8 | 12 | 49 |
| Services | 5 | 1 | 83 |
| Shop | 8 | 4 | 69 |
| User | 14 | 4 | 46 |
| Tổng | 47 | 83 | 798 |

Số đếm khớp bảng trong master plan. Đây là số thẻ tĩnh, có lặp; không phải số trường nghiệp vụ hoặc coverage E2E.

- `fields.csv`: từng control có file/dòng, type, id/name, required, readonly/disabled, ARIA, pattern, min/max/maxlength và phân loại sơ bộ.
- `forms.csv`: định danh form, onsubmit và novalidate.
- `dynamic-signals.csv`: 1.731 dòng ứng viên chứa render động, validation, toast hoặc lifecycle. Không đồng nghĩa có 1.731 form động.
- Parser từ vựng loại comment/script/style; phân loại search/filter là ứng viên dựa theo tên. Chưa phân tích DOM lồng nhau, điều kiện JS, ownership hay rule server. Cần rà soát thủ công trước khi đặt required.

## Phát hiện và backlog

Owner thực hiện: Codex; thời điểm tiếp theo là thứ tự xử lý đề xuất, chưa phải cam kết ngày hoàn tất.

| ID | Ưu tiên / tầng | Bằng chứng | Kết luận hiện tại | Test / bước tiếp theo |
|---|---|---|---|---|
| GD00-01 | P1 / UI | Browser Admin → Khách hàng → Thêm khách → để trống → Lưu khách hàng | **FAIL so với UX mục tiêu**: popup native tiếng Anh `Please fill out this field.`, focus `quickAddName`; không có đồng thời lỗi inline tên và SĐT. Có ảnh baseline. | VAL-12-01, FM-037; kiểm tiếp sau nghiệm thu modal này. Positive/save/F5 chưa chạy. |
| GD00-02 | P0 / flow | `pages/public/contact/contact.js:58-78`, `handleSubmit` | **Xác nhận từ mã**: `saveContactTicket` có nhánh trả `CT-${Date.now()}` khi không có provider hoặc result rỗng; handler reset và báo đã nhận. Chưa tái hiện runtime, chưa khẳng định DB đã mất ticket. | VAL-05-04, FM-010; ưu tiên kiểm failure provider/response trên môi trường test. |
| GD00-03 | P0 / UI | `pages/shop/checkout/checkout.js:1302-1355` | **Xác nhận từ mã**: lỗi địa chỉ đã lưu và hóa đơn trả toast chung; nhánh guest dùng checkValidity/was-validated. Chưa audit hết markup/flow để kết luận mọi trường thiếu inline. | VAL-08, FM-024–027; mở checkout Guest và Member, kiểm focus/conditional fields. |
| GD00-04 | P0 / API | `scripts/api/customer_profile_persistence.js:29-60` | **Xác nhận từ mã**: có kiểm tên/email, revision, địa chỉ và default; nhiều nhánh throw Error chuỗi, nhánh 23505 đổi thành chuỗi email. Chưa xác minh HTTP adapter giữ/loại mã lỗi như thế nào. | VAL-03, VAL-09, FM-028–029; trace route/API response và conflict thực tế. |
| GD00-05 | P0 / DB cần xác minh | `scripts/database/20261010_customer_phone_validation.sql`, `20261009_pet_profile_positive_weight.sql` | Migration cục bộ có kiểm phone và weight; **không chứng minh đã apply**. Phone SQL cần kiểm escaping regex và sự đồng nhất với policy bắt đầu bằng 0. Migration weight đặt NULL rồi SET NOT NULL cần kiểm dữ liệu cũ trước khi chạy. Không chạy migration trong audit. | VAL-00-05; đối chiếu catalog/constraints/RLS live theo quyền đọc. |
| GD00-06 | P1 / tài liệu và dependency | `scripts/shared/address-validation.mjs`; import tại profile.js:1 và persistence.js:38 | **Đã xác minh tồn tại local**, khác nghi vấn thiếu file trong ZIP. Chưa xác minh deployment/GitHub. | VAL-00-06, VAL-09-08; xác minh artifact deploy sau. |
| GD00-07 | P1 / lifecycle | `pages/admin/admin.js:1484-1521` | Có global close/cancel/backdrop/Escape; chưa kiểm đủ handler `data-close-modal` toàn dự án hoặc listener khi mount lại. Không suy ra mọi modal đóng đúng. | VAL-00-08, RUNTIME-04; kiểm từng modal theo AGENTS mục 8. |

## Đối chiếu mô hình dữ liệu

`CDSLfinal.md` phân tách customer, customer_profile, customer_address; địa chỉ trong tài liệu có province/street_address/is_default, không thể mặc định district/ward tồn tại ở DB. Service profile hiện có nhánh structured/legacy. `enum.md` định nghĩa account_status, species, service_category, appointment_status, payment_status và order_status bằng các mã cụ thể. Rule triển khai phải theo enum thật, không tự dùng nhãn hiển thị làm mã DB.

CDSLfinal và enum là tài liệu thiết kế; chưa thay cho catalog DB, constraint name, indexes, trigger và RLS thực tế. Không lấy khóa bí mật hoặc chạy migration để xác minh.

AGENTS.md đã đọc toàn bộ. Khi triển khai: Admin text-only ngoài sidebar; không viền trái summary; nút lưu type=button, chống submit reload; tự do nhập ghi chú cá nhân; không JSON mock. Mục 8 yêu cầu nghiệm thu từng modal trước khi chuyển sửa modal khác. Đợt này chỉ kiểm một modal, chưa sửa chức năng.

## Bằng chứng runtime đã chạy

`BASELINE-ADMIN-CUSTOMER-EMPTY` / FM-037 (chỉ phần required): mở modal sạch, để trống, bấm Lưu → native required bubble tiếng Anh, focus tên; đóng bằng Đóng thành công. Ảnh `customer-empty-baseline.png` chụp desktop 2133×1571. Đây là **FAIL UX**, không phải E2E CRUD PASS. Không có Network capture nên chưa kết luận số request ghi từ chứng cứ mạng.

Chưa kiểm mobile, screen reader, lỗi server, lưu thành công, F5 hay DB/Admin đối chiếu. Không đánh dấu hoàn thành FM-037 hoặc E2E-ADMIN-01. Danh sách có dữ liệu hiện hữu được quan sát trên UI không chứng minh từng constraint/RLS đã đúng.

## Tiến độ VAL-00 và việc tiếp theo

| Mã | Trạng thái | Còn lại |
|---|---|---|
| VAL-00-01 | PARTIAL | Có HEAD, tracked patch, hashes; chưa xác minh ZIP/backup đầy đủ. |
| VAL-00-02 | PARTIAL | HTML đã kiểm kê; cần rà 1.731 tín hiệu và mở form động. |
| VAL-00-03 | PARTIAL | Có type/required/readonly/filter candidates; cần phân loại nghiệp vụ theo từng form. |
| VAL-00-04 | PARTIAL | Có backlog ban đầu; còn các module chưa rà sâu. |
| VAL-00-05 | PARTIAL | Đã đọc tài liệu và migration tiêu biểu; DB live/RLS NOT RUN. |
| VAL-00-06 | PARTIAL | Local có file; deployment/GitHub NOT RUN. |
| VAL-00-07 | PARTIAL | Có desktop baseline một modal; mobile/Console/Network và các form còn lại NOT RUN. |
| VAL-00-08 | PARTIAL | AGENTS và global modal đã đọc; audit lifecycle toàn SPA chưa đủ. |
| VAL-00-09 | PARTIAL | Có owner/thứ tự ưu tiên; chưa hoàn tất backlog toàn bộ form hoặc hạn cụ thể. |
| VAL-00-10 | IN PROGRESS | Báo cáo này tách code evidence/runtime; chưa nghiệm thu GĐ-00. |

Tiếp tục: nghiệm thu baseline modal khách hàng đã kiểm; rà luồng P0 contact/auth/booking/checkout/profile và API tương ứng; mở rộng kiểm kê form động; bổ sung mobile/Console/Network; xác minh metadata Supabase thực tế bằng quyền đọc được cung cấp. Chỉ chuyển giai đoạn khi gate được đáp ứng. Không tự gắn BLOCKED chỉ vì một hạng mục chưa chạy.
