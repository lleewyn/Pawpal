# Đồng bộ thú cưng — 25/10/2026

Phạm vi: mã local và RPC/RLS Cloud `cpzuvaplseielhgcnqrn`. Nhánh nền `main`, SHA `d8bb56e918105865d38d01592e4255d480f65849`, cộng working tree chưa commit. Người thực hiện: Codex. Chưa push/deploy; chưa nghiệm thu toàn bộ luồng HTTP/Auth/Reatime/UI sau commit.

## Kiểm tra Cloud đã chạy

`node scripts/test/sync_pets_cloud_rollback.cjs --cloud` đạt **13 assertion**, 75 SQL statements có phạm vi cụ thể, một lần chạy. Một pet, hai customer A/B và một staff tổng hợp chỉ tồn tại trong transaction. Có timeout statement 8 giây, lock 3 giây; luôn ROLLBACK, sau đó kiểm tra fixture không còn. Không dùng khách thật, không commit thay đổi nghiệp vụ hoặc schema.

| Kiểm tra | Expected / Actual | Kết quả |
|---|---|---|
| User tạo pet với customer_id giả B | Server lấy owner từ phiên A; pet thuộc A | PASS SQL |
| Gửi lại cùng ID tạo pet | Không tạo pet thứ hai; server trả conflict | PASS SQL |
| User sửa, Admin đọc | Tên, chủ và các trường safety/allergy/routine khớp theo ID | PASS SQL |
| Admin dùng sai customer/pet relation | RPC sửa theo khách trả P0002 | PASS SQL |
| Admin sửa, User đọc | Đúng tên và cảnh báo mới từ cùng pet ID | PASS SQL |
| Cân nặng 0, phiên bản cũ | 22023/PT409, không thay đổi một phần | PASS SQL |
| User lưu trữ, Admin đọc | Status inactive, không xóa pet | PASS SQL |
| Admin khôi phục, User đọc | Status active, giữ chủ A | PASS SQL |
| Sửa tên/trạng thái với weight null | Không thêm dòng cân nặng thừa | PASS SQL |
| B truy cập pet A theo ID | Không đọc, sửa hoặc lưu trữ được | PASS SQL |
| Guest gọi RPC ghi riêng | 42501 | PASS SQL |
| Kiểm tra sau các lệnh bị chặn | Tên pet giữ nguyên | PASS SQL |
| Cleanup | Pet/customer/auth fixture không còn sau rollback | PASS SQL |

Báo cáo theo máy: [pets-cloud-rollback.txt](pets-cloud-rollback.txt). Claims và role được mô phỏng trong transaction, không phải đăng nhập thật qua Supabase Auth. Không suy kết quả Realtime delivery từ việc bảng đã có trong publication.

## Kiểm tra offline đã chạy

- `node --test scripts/test/customer_pet_live_contract.cjs`: **12/12 PASS**. Có kiểm tra lỗi/empty không fallback cache, scope chủ, mapping lưu trữ, RPC nguyên tử, breed không hợp lệ, cảnh báo an toàn độc lập, response tài khoản cũ. SDK Supabase đang cài được chạy với fetch giả: chỉ một request, query gửi `pet_weight_history.limit=3`, sắp xếp measured_at/created_at/id giảm dần và filter customer_id.
- `node scripts/test/user_pets_sync_ui.cjs`: **PASS** trên Chrome headless. Dùng HTML/JS/CSS form thật, mọi transport bị thay bằng fixture offline. Bấm submit hai lần khi đọc đang chờ chỉ có một read rồi một write; lỗi giữ tên đã nhập và mở lại nút lưu; không đọc lại pets lần hai để lấy createdAt; cảnh báo safety của Admin giữ nguyên khi thay dị ứng; đổi actor trong lúc kiểm tra trùng không ghi; retry tạo mới dùng cùng `_pendingId`.
- Đã kiểm tra cú pháp JS và whitespace diff. Ảnh [pets-form-offline.png](pets-form-offline.png) là bằng chứng trạng thái giữ bản nháp sau lỗi giả lập, không phải screenshot portal đã đăng nhập hoặc kiểm chứng responsive toàn hệ thống.

## Thay đổi production

Chỉ chạm `scripts/api/petService.js` và `pages/user/modules/pets/pets.js`. Không thay modal Admin, schema, RPC hoặc policy Cloud.

- **SYNC-PET-B01:** form khóa trạng thái lưu trước truy vấn kiểm tra trùng; mọi early return/error đều mở khóa qua finally. Giữ snapshot và ID tạo ở đầu request, không lấy lại từ form khác sau await. Bind handler lưu một lần cho mỗi DOM form.
- **SYNC-PET-B02:** tách `safetyNote` khỏi nội dung hiển thị dị ứng; User sửa tên/dị ứng không tự thay cảnh báo an toàn được Admin lưu trước đó.
- **SYNC-PET-B03:** tái sử dụng kết quả kiểm tra trùng để lấy createdAt, bỏ một lượt getPets khi sửa; giới hạn lịch sử cân nặng ở server query còn 3 dòng/pet, tương ứng UI hiện chỉ hiển thị 3 dòng gần nhất. Không giới hạn mất danh sách thú cưng của khách.
- **SYNC-PET-B04:** kiểm tra actor sau các bước async; không trả rows cũ, ghi tiếp hoặc render lỗi vào tài khoản khác. Lưới đã thay DOM cũng không nhận kết quả từ lưới cũ.

Không tăng polling hoặc bật publication mới. Trong đợt này chỉ có một lần đọc metadata RPC/publication và một lần chạy fixture Cloud; browser/Node regression không gọi Cloud. Chưa đo egress tổng hoặc p95.

## Còn thiếu

SYNC-02 vẫn RETEST ở mức E2E: hai portal đăng nhập thật, UI → HTTP → commit → UI bên kia, Realtime delivery, persistence sau reload. Upload avatar, chủ sở hữu ngoài scope vai trò staff cụ thể, lịch sử đặt lịch liên quan, tải khi tab ẩn và toàn bộ vòng đời listener của màn hình pet chưa được nghiệm thu. Chưa coi các kiểm tra source/offline/SQL là PASS đầy đủ những mục này.

Không tự chạy lại Cloud test nếu chưa có thay đổi cần kiểm chứng. Hoàn tác riêng diff petService/pets của đợt này khi cần; giữ các thay đổi hồ sơ, dịch vụ, sản phẩm và Chatbot trước đó.
