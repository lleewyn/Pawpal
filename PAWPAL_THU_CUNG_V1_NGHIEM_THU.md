# Chuyển phân hệ Thú cưng sang Cloud V1

## Bổ sung cổng khách hàng — 22/10/2026

Phạm vi: hồ sơ thú cưng, cân nặng, lưu trữ/khôi phục và đọc nhật ký chăm sóc của chính chủ nuôi. Không bao gồm tải ảnh/tệp, sổ tiêm chủng, gửi tin thật hay tạo lịch qua trợ lý. Các mục Admin bên dưới là biên bản đợt trước.

- [x] Thêm/sửa qua form thật với Cloud: tên, giống đúng loài, giới tính, ngày sinh, màu lông, dị ứng, lưu ý và cân nặng được lưu bởi `save_own_pet` trong cùng giao dịch. Có đối chiếu phiên bản; form giữ bản chụp lúc mở. Cân không đổi không ghi thêm lịch sử.
- [x] Đọc danh sách chỉ từ Cloud, không phục hồi hồ sơ cache cũ; lỗi không báo thành công. Giống dùng autocomplete từ danh mục, không tự chọn giống đầu tiên.
- [x] Lưu trữ/khôi phục qua RPC riêng `change_own_pet_status`, giữ lịch hẹn/cân nặng/nhật ký. Quyền ghi xác định chủ nuôi từ Auth, không nhận ID chủ nuôi theo yêu cầu client.
- [x] Bổ sung RLS chỉ đọc lịch hẹn, dòng dịch vụ, nhật ký và media theo chủ nuôi. Kiểm tra trên CSDL riêng với hai khách độc lập: khách khác không đọc hoặc lưu trữ hồ sơ được; tài khoản Auth bị khóa cũng bị từ chối.
- [x] Nhật ký rỗng và nhật ký có dữ liệu đều được kiểm tra trên Cloud thật; bỏ seed JSON, nhật ký trong browser, phản hồi chat tự sinh, tên nhân viên/ảnh mẫu và chỉ số yêu thích giả.
- [x] Realtime: sau phía quản trị ghi nhật ký, khách thấy ghi nhận mới mà không reload. Danh sách thú cưng có kênh cập nhật riêng, form đang mở giữ nguyên bản nháp; hủy kênh khi rời phân hệ.
- [x] Mở ca không có nhật ký không hiển thị ca khác; bản ghi không có ảnh không dựng ảnh lỗi từ URL trang hiện tại.
- [ ] Đưa mã giao diện/API hiện nằm trong working tree lên bản triển khai Vercel và chạy lại nghiệm thu trên bản đã deploy. CSDL mới đã có migration 058–060; không coi mã local là bản production.

Kiểm tra: `customer_pet_atomic_v1.cjs`, `customer_pet_live_contract.cjs`, `customer_diary_live_contract.cjs` và `customer_portal_profile_v1.cjs --cloud-browser --pets --pets-only --diary` trong `scripts/test`. Các fixture Cloud được dọn; kiểm tra SQL riêng dùng rollback. Thao tác quản trị trong bài Realtime thực hiện qua service client trên fixture riêng, không phải chứng nhận lại toàn bộ giao diện Admin.

Sao lưu trước migration 060: `D:/Aboutme/Pawpal-infra/supabase-local/backups/portal-diary-cloud-2026-10-22T15-43-07-458Z`. Đã đối chiếu toàn bộ hàng public, danh tính/mật khẩu/trạng thái khóa Auth không đổi khi triển khai migration; giữ 17 hồ sơ nhân sự nguồn.

Ảnh nghiệm thu riêng ngoài Git: `portal-pet-form.private.png`, `portal-diary-empty.private.png`, `portal-diary-populated.private.png` trong `D:/Aboutme/Pawpal-infra/supabase-local/verification/`.

Nút trao đổi nhật ký chuyển sang Hỗ trợ; đánh giá chuyển sang Lịch hẹn, không tự ghi đánh giá hay phản hồi thành công vào bộ nhớ trình duyệt. Nghiệp vụ Hỗ trợ/Đánh giá được nghiệm thu trong phân hệ tương ứng.

## Biên bản Admin trước đó

Ngày: 21/10/2026. Project `cpzuvaplseielhgcnqrn`. Phạm vi đợt này là phân hệ Thú cưng của Admin; không chuyển các trang khách hoặc các phân hệ khác.

Đã triển khai lên Vercel Production: `dpl_4AGaZ2pf5LLEhoJXjvQRDFHhkTKb`. Kiểm tra cuối trên bản này đạt Thú cưng và hồi quy Khách hàng. Cloud vẫn có 82 pet / 35 khách / 7 nhật ký sau kiểm tra; không có quyền thực thi 3 RPC mới cho anon. Các thay đổi mã của đợt này chưa commit/push GitHub.

## Thay đổi

- Danh sách và hồ sơ lấy `contact_email`, số chính từ `customer_phone`, loài/giống từ `pet_breed` → `pet_species`, cân hiện tại từ view `pet_current_weight`. Không còn đọc các cột legacy `species`, `breed`, `weight`, `vaccination_history` trên pet_profile.
- Nhật ký lấy thú cưng qua appointment, người ghi qua staff, tình trạng từ observed_condition. Lịch sử dịch vụ lấy tên snapshot qua appointment_item và tổng tiền qua appointment_totals. Không bổ sung lịch sử từ sessionStorage.
- Thêm migration `012_admin_pet_profile.sql`, chỉ bổ sung 3 RPC, không thêm bảng/cột: `save_admin_pet`, `record_admin_pet_weight`, `record_pet_contact`. Hàm invoker tuân theo RLS và quyền staff hiện có; anon không được thực thi.
- Thêm/sửa hồ sơ cùng cân nặng và audit trong một transaction. Có kiểm tra ngày sinh, cân nặng, chủ nuôi, danh mục, trùng tên trong cùng chủ nuôi; timestamp để từ chối sửa trên phiên bản cũ.
- Cân lại ghi lịch sử và audit; cân hiện tại suy ra từ lịch sử. Mã lần cân hỗ trợ idempotency tại RPC. Lưu trữ/khôi phục đổi trạng thái active/archived, không xóa lịch sử.
- Thêm nhanh chủ nuôi dùng RPC Khách hàng đã có; email NULL, tự chọn vào form chính. Không tạo mã kích hoạt, số dư/hạng giả hoặc gọi các bảng cũ.
- Ghi chú giữ bản nháp khi làm mới; lưu bằng phiên bản đã mở để không ghi đè thay đổi đồng thời.
- Nhắc lịch tắm/cắt tỉa/lưu trú dựa trên lịch completed và snapshot dịch vụ. Ghi nhận liên hệ lưu audit phía database, gắn với đúng pet/appointment. Mở Zalo không tự coi là đã gửi; nút ghi nhận là xác nhận thủ công, không phải dịch vụ gửi tin.
- Bỏ phần tiêm chủng/điều kiện dịch tễ khỏi giao diện vì nghiệp vụ đã chốt không có thú y. Bỏ giá cân nặng hardcode và cảnh báo giả cho nội dung “Không ghi nhận”. Không seed nghiệp vụ, đọc JSON mock hoặc nới quyền anonymous.

## Kiểm tra đã chạy

1. Tạo full backup local và phục hồi vào database/API tách biệt bằng customer_completion_local.cjs; chỉ bản phục hồi nhận fixture. Áp dụng 012 vào bản phục hồi trước khi chạy kiểm thử ghi.
2. `pets_v1_stage.cjs`: đối chiếu danh sách, danh mục, nhật ký, chi tiết; UI thêm/sửa/cân, ghi chú hai lần, giữ bản nháp, thêm nhanh chủ nuôi; RPC chống phiên bản cũ, idempotent cân, lưu trữ/khôi phục và kiểm tra pet/lịch khi ghi nhận liên hệ. Không có lỗi REST/JavaScript trong luồng đã thử.
3. `pets_v1_integrity_stage.cjs`: gây lỗi cuối giao dịch khi ghi audit và xác nhận pet/cân không bị lưu một phần; từ chối ngày sinh tương lai, cân âm, anon RPC và người không có hồ sơ staff.
4. Backup application Cloud trước migration, áp dụng 012 và so hash chính sách RLS trước/sau: không thay RLS. Local cũng áp dụng cùng migration. Sau thử đã xóa database/API tạm; không xóa fixture qua database chính.
5. `pets_v1_cloud_live.cjs`: Chrome trên Production thật đọc 82 pet, so toàn bộ chủ nuôi/số chính/giống/cân/trạng thái với database; 7 nhật ký, hồ sơ có nhật ký thực, 4 tab, Realtime joined và reload. Không gọi Cloud cũ, tunnel hoặc file dữ liệu JSON; không lỗi REST/JavaScript.
6. `self_host_vercel_production_live.cjs --cloud`: Khách hàng tiếp tục đạt 35 khách, 7.964 điểm, đăng nhập, Realtime và reload sau triển khai. Các kiểm thử unit cấu hình, endpoint mật khẩu và vòng tải Pawpoint tiếp tục đạt.

## Giới hạn

- Phép thử ghi và rollback chạy trên bản phục hồi; Production kiểm tra đọc, kết nối và ánh xạ. Không gửi Zalo/SMS/email tự động, không tải ảnh lên Storage, không tạo dịch vụ hoặc booking thật trong đợt này.
- Lịch sử chi tiết đang lấy 30 dòng gần nhất mỗi nguồn; nhật ký chung 100 dòng gần nhất; nhắc lịch lấy tối đa 500 lịch completed. Cần phân trang phía server nếu nguồn tăng vượt các mức này; không coi đây là xuất toàn bộ lịch sử.
- 14 khách nguồn thiếu hồ sơ và dữ liệu cũ từng bị từ chối nhập vẫn giữ nguyên trạng thái đối soát. Không tạo tên/chủ nuôi/cân/nhật ký giả để bù dữ liệu thiếu.
- Các nút đặt dịch vụ chuyển thông tin sang phân hệ Dịch vụ. Luồng xử lý tại Dịch vụ phải chuyển V1 và nghiệm thu riêng.
- Docker được giữ làm môi trường phát triển/bản dự phòng, không phục vụ Admin Production. Những trang khách và các phân hệ chưa chuyển vẫn theo báo cáo đối soát toàn bộ.

## Bản sao và bằng chứng

Local backup sau kiểm thử: `D:\Aboutme\Pawpal-infra\supabase-local\backups\customers-complete-8deaf1a7e7c5`. Bản sao Cloud trước 012 và trạng thái triển khai được ghi trong file riêng `pets-cloud-deployment.private.txt` cùng thư mục hạ tầng.

Ảnh nằm ngoài webroot: `verification/v1-pets-stage.png` và `verification/v1-pets-cloud-list.png`. Không đưa ảnh có dữ liệu cá nhân, SQL dump hoặc credential lên Git/Vercel.
