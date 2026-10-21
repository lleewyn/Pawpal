# Chuyển phân hệ Thú cưng sang Cloud V1

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
