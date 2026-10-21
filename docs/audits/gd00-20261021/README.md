# GĐ-00 — Tiếp tục audit validation ngày 21/10/2026

Trạng thái: **ĐANG THỰC HIỆN; gate GĐ-00 CHƯA ĐẠT**. Không chuyển GĐ-01 và không sửa mã chức năng. Owner: Codex. Ngày và giờ nghiệp vụ theo Asia/Bangkok.

## Baseline và bản lưu nguồn

- Branch `main`, HEAD `37c274561460ff5351dafd175636cfc79697f6b0`. Working tree sạch trước khi thêm thư mục audit này. Không commit/reset hoặc đổi branch trong đợt này.
- Mốc nguồn mới khác cả HEAD đầu và cuối đợt 20/10. Giữ nguyên [báo cáo cũ](../gd00-20261020/README.md), không thay ảnh cũ bằng chứng cứ mới.
- [baseline.txt](baseline.txt): thời điểm, Node, HEAD và tên file đổi từ HEAD cuối audit cũ. [source-drift.csv](source-drift.csv): 9 file trong phạm vi `pages` khác SHA-256 so với bản kiểm kê cũ; đây không phải tổng số file thay đổi toàn repo.
- [source-baseline.zip](source-baseline.zip): archive từ HEAD, gồm nguồn tracked trong pages/scripts/styles/components cùng server, package files, AGENTS, CDSLfinal, enum, index và master plan. Có 468 entry, CRC hợp lệ, không chứa `.env`. SHA-256 và phạm vi chính xác trong [archive-verification.txt](archive-verification.txt).
- Archive là bản lưu nguồn có chọn phạm vi; **không phải `Pawpal-main.zip` gốc, backup đầy đủ workspace, assets hay CSDL**. ZIP gốc chưa được tìm thấy trong file listing của workspace; chưa xác minh phiên bản artifact gốc/production.
- Không đóng băng hoạt động Git của người dùng. HEAD phải được kiểm lại trước lần sửa/kiểm thử sau. Hash đầu và cuối bước kiểm kê khớp; kiểm tra cuối đợt ghi riêng trong `final-check.txt`.

## Kiểm kê mới và giới hạn parser

| Khu vực | HTML | Form mở | Control tĩnh |
|---|---:|---:|---:|
| Admin | 12 | 62 | 551 |
| Public | 8 | 12 | 49 |
| Services | 5 | 1 | 83 |
| Shop | 8 | 4 | 69 |
| User | 14 | 4 | 46 |
| Tổng | 47 | 83 | 798 |

- [fields.csv](fields.csv), [forms.csv](forms.csv), [source-hashes.csv](source-hashes.csv) và [inventory-run.txt](inventory-run.txt): chạy lại cùng script kiểm kê cũ, exit 0; có 1.732 dòng tín hiệu render/validation/lifecycle. Số này tăng 1 so với audit cũ, không phải số lỗi hay số form động.
- [dynamic-controls.csv](dynamic-controls.csv): 56 thẻ input/select/textarea/form literal trong JavaScript. Chỉ là ứng viên; có thể ở comment, nhánh không chạy hoặc lặp theo từng bản ghi. Chưa bao gồm mọi `createElement`, HTML trong script inline, template chia nhỏ hoặc control không dùng thẻ native. Không cộng 56 với 798 để tuyên bố coverage.
- [form-scopes.csv](form-scopes.csv): chỉ ghép được 82 cặp form mở/đóng từ parser từ vựng. Đã truy nguyên chênh lệch: `pages/public/login/login.html:524` mở `forgotNewPasswordForm` nhưng không có `</form>` tương ứng trong source. Đây là phát hiện markup, chưa xác minh DOM mà browser sửa tự động.
- Phân loại required/readonly/filter trong CSV là dữ kiện HTML hoặc suy luận tên, chưa phải quyết định nghiệp vụ. Không tự áp thêm required, giới hạn cân nặng, giá hay số ký tự.

## Modal đang rà: Thêm khách hàng

Phạm vi `modalAddCustomer` / `formAddCustomerQuick`, VAL-12-01, FM-037, REG-0262–0268, E2E-ADMIN-01. Chưa chỉnh modal và chưa chuyển sang nghiệm thu modal khác.

| Trường | Rule hiện tại trong source | Việc cần đối chiếu |
|---|---|---|
| `quickAddName` | HTML required; JS gộp khoảng trắng, trim, tối thiểu 2 ký tự | Độ dài tối đa/constraint live; label thiếu `for`, chưa có error node/ARIA riêng |
| `quickAddPhone` | HTML required; JS đúng 10 chữ số; phát hiện trùng từ dữ liệu đã tải | Khác checkout yêu cầu bắt đầu 0; chưa chốt policy/constraint; duplicate server cần map đúng field |
| `quickAddPetName` | Optional; có tên mới insert pet | Quan hệ conditional với weight; không tự biến thành bắt buộc |
| `quickAddPetSpecies` | DOG/CAT/OTHER trên UI, đổi dog/cat/other trong insert | Enum live và diễn giải loài khác chưa xác minh |
| `quickAddPetWeight` | Optional; nếu nhập phải finite và >0; step 0.1 | Insert null khi trống trong khi migration cục bộ có NOT NULL; phải xác nhận schema live |
| `quickAddPetBreed` | Custom popover lấy dữ liệu; fallback chuỗi `Chưa cập nhật` | Không dùng fallback này làm gợi ý thực thể; kiểm rule DB thật |
| `quickAddAddress` | Optional; nếu trống handler dùng câu tiếp nhận tại quầy và tỉnh cố định | Không coi câu này là địa chỉ giao hàng đã được xác minh |

Nguồn: `pages/admin/modules/customers/customers.html:402–455`, `subtabs/tab-customer-list.js:558–869`.

Luồng lưu hiện có: customer → customer_profile → customer_membership → customer_address → customer_activation_sms → pet_profile nếu có tên. Email khách tạo nhanh là `null`. Một số lỗi phụ chỉ log cảnh báo rồi tiếp tục. Có Realtime trong customers.js, nhưng chưa kiểm chứng event/đồng bộ thực tế.

Nút lưu đã là type button; gọi `requestSubmit()`. Form không có novalidate. JS chỉ gọi `setCustomValidity` trong submit; không thấy listener input xóa lỗi tên/cân nặng. Vì native validation chạy trước submit event, có nguy cơ lỗi custom đã đặt làm lần submit sửa đúng không vào handler để clear. Đây là phân tích source, **runtime NOT RUN**.

Global handler trong `pages/admin/admin.js:1482–1521` thao tác `.admin-modal-overlay.active`; modal này dùng `.admin-modal-backdrop` và `style.display`. Nút Đóng/Hủy có handler riêng. Chưa thấy global handler đọc `[data-close-modal]` trong file này; chưa xác nhận đủ bốn cách đóng ở runtime hoặc handler ngoài file. Không suy ra mọi modal lỗi.

## Backlog cập nhật

Tất cả phát hiện source dưới đây **chưa là kết quả E2E FAIL/PASS của phiên mới**. Ảnh required FM-037 cũ chỉ áp dụng phiên audit 20/10.

| ID | Ưu tiên / tầng | Bằng chứng hiện tại | Mã test | Bước xử lý sau audit |
|---|---|---|---|---|
| GD00-01 | P1 / UI | Source cùng cơ chế native required; ảnh FAIL UX chỉ có ở đợt cũ | VAL-12-01, FM-037 | Khi browser khả dụng: tái hiện trống/sai/sửa đúng, focus và số request; chờ nghiệm thu modal |
| GD00-02 | P0 / flow | contact.js:56–111 vẫn trả mã CT theo Date.now khi provider thiếu/result falsy, rồi reset và báo thành công | VAL-05-04, FM-010 | Failure injection trên môi trường test; phân biệt không provider với provider reject |
| GD00-03 | P0 / UI | checkout.js:1302–1355 dùng toast cho saved address/hóa đơn; guest dùng checkValidity | VAL-08, FM-024–027 | Kiểm Guest/Member và lỗi conditional; chưa kết luận toàn form thiếu inline |
| GD00-04 | P0 / API | `/api/customer/auth/me` → customer_auth.js:261–265 → profile service; wrap tại :70–77 trả mọi exception HTTP 400 với message, không giữ mã/fields | VAL-03, VAL-09, FM-028–029 | Kiểm response thật cho format/conflict/permission; map mã an toàn |
| GD00-05 | P0 / DB | Metadata anon HTTP 401, backend credential HTTP 402; chưa lấy được schema | VAL-00-05 | Cần metadata/catalog đọc được; không chạy migration để thử |
| GD00-06 | P1 / dependency | Local module tồn tại; GET localhost asset 200, SHA-256 khớp source; GitHub đúng commit có file và blob SHA khớp local | VAL-00-06, VAL-09-08 | Production artifact chưa xác minh; xem github-verification.md |
| GD00-07 | P1 / lifecycle | Global handler và quick-add dùng selector/cách mở khác nhau | VAL-00-08, RUNTIME-04 | Kiểm Đóng/Hủy/backdrop/Escape và reopen từng modal |
| GD00-08 | P1 / UI | setCustomValidity chỉ cập nhật trong submit; requestSubmit có native gate | VAL-02-07, FM-037 | Nhập tên 1 ký tự rồi sửa; weight âm rồi sửa; quan sát customError/reset |
| GD00-09 | P0 / flow | Quick-add không có busy guard ở handler; tạo nhiều bảng tuần tự; lỗi địa chỉ/SMS chỉ warn, lỗi pet báo đã tạo khách nhưng không giữ modal | VAL-12-08, E2E-ADMIN-01 | Kiểm submit đôi/partial write/rollback trên dữ liệu test có kiểm soát; chưa khẳng định đã xảy ra duplicate |
| GD00-10 | P1 / markup auth | Có 5 form mở, 4 đóng ở login.html; form cuối chưa có thẻ đóng | VAL-04-09, FM-008 | Xác minh DOM và Enter/reset flow trước khi sửa |
| GD00-11 | P0 / rule consistency | quick-add `/^\d{10}$/` khác checkout `/^0[0-9]{9}$/`; migration SQL và weight optional/null cần đối chiếu live | VAL-00-03, VAL-00-05, FM-037 | Chốt policy từ schema/nghiệp vụ, không tự chọn regex mới |
| GD00-12 | P1 / support | support-create.js:151–158, 211–251 dùng alert cho file/quy tắc từng trường | VAL-11-01–05, FM-033–035 | Giữ nội dung và map lỗi upload/field khi tích hợp sau |
| GD00-13 | P1 / booking | booking.js:962,1391 dùng alert cho quick pet/hotel; validateGuestInput đã có lỗi riêng | VAL-06, FM-018, FM-021 | Tái dùng phần đúng; kiểm hotel cross-field và modal con |

Owner cho backlog: Codex. Thứ tự dự kiến: hoàn thiện baseline modal đang rà → contact/checkout/profile/auth/booking → mở rộng form động và các module còn lại. Thời điểm kiểm runtime/DB phụ thuộc môi trường truy cập được; chưa cam kết hạn hoàn tất hay tuyên bố backlog đã phủ toàn hệ thống.

## Môi trường và bằng chứng thực thi

| Kiểm tra | Thực tế | Giới hạn |
|---|---|---|
| Kiểm kê source | refresh.cjs exit 0; 47/83/798, 56 ứng viên động | Không chạy app hoặc DB |
| Archive | verify.py exit 0; CRC và hash ghi nhận | Bản lưu source có phạm vi, không phải backup DB |
| Local server | `npm run dev` báo localhost:3000; GET 5 route HTTP 200 | Không xác minh UI đã mount hay session đăng nhập |
| Address module | GET asset HTTP 200 và hash khớp local; GitHub fetch_file tại đúng HEAD trả blob SHA khớp `git hash-object` | Chưa phải xác minh production; [bằng chứng GitHub](github-verification.md) |
| Browser | `cua.getState()` hai lần trả apps/browsers rỗng; tạo Chrome và iab đều trả Browser is not available | Runtime phiên này **BLOCKED** do không có browser surface. Người dùng đã trả lời “ok” với đề nghị kết nối; kiểm lại vẫn chưa có surface |
| Supabase metadata | Trong sandbox EACCES; thử lại có escalation: anon HTTP 401, backend HTTP 402; exit 1 | **BLOCKED** đọc metadata qua cấu hình hiện tại. Không suy luận nguyên nhân 402; không có dữ liệu đủ để kết luận schema/RLS |

Lịch sử metadata trong [metadata-run.txt](metadata-run.txt); không lưu khóa/URL/raw response. Chưa thực hiện CRUD, RPC, OTP, gửi tin nhắn, tạo đơn, thanh toán hoặc migration trong đợt này. Không dùng mock/JSON dữ liệu nghiệp vụ. Không ghi E2E PASS từ script audit.

## Tiến độ VAL-00

| Mã | Trạng thái | Bổ sung đợt này / phần còn lại |
|---|---|---|
| VAL-00-01 | PARTIAL | Mốc HEAD sạch, archive nguồn có SHA/CRC; ZIP gốc, full backup và deploy version chưa xác minh |
| VAL-00-02 | PARTIAL | Kiểm kê lại + 56 literal control trong JS; mọi form động và browser chưa kiểm đủ |
| VAL-00-03 | PARTIAL | Bảng rule theo từng field cho modal đang rà; các form khác và rule live còn thiếu |
| VAL-00-04 | PARTIAL | Mở rộng backlog lên 13 mục; phân biệt UI/API/flow/DB; chưa phủ toàn hệ thống |
| VAL-00-05 | PARTIAL; live BLOCKED | Đã thử GET metadata, có HTTP status; catalog/constraint/index/trigger/RLS chưa xác minh |
| VAL-00-06 | PARTIAL | Local, served localhost và GitHub đúng commit khớp; production NOT RUN |
| VAL-00-07 | PARTIAL; runtime BLOCKED | Giữ ảnh cũ, chưa có ảnh/Console/Network/mobile mới |
| VAL-00-08 | PARTIAL | Đọc AGENTS và rà cơ chế đóng/lifecycle của modal hiện tại; runtime cần browser |
| VAL-00-09 | PARTIAL | Có owner, độ ưu tiên, test ID, thứ tự tiếp theo; backlog toàn form và lịch hoàn tất chưa chốt |
| VAL-00-10 | IN PROGRESS | Báo cáo và master plan đã đồng bộ đợt này; gate chưa đủ điều kiện |

Điểm tiếp tục: kết nối browser để xác minh modal Thêm khách; khôi phục khả năng đọc metadata Supabase hoặc cung cấp catalog export đã lược bí mật. Theo AGENTS.md mục 8, chưa chuyển nghiệm thu modal tiếp theo khi modal hiện tại chưa được kiểm trực quan và báo cáo nghiệm thu.
