# Chuyển dữ liệu Cloud cũ sang Cloud mới theo V1

## Quyết định đã chốt

- Project đích: `cpzuvaplseielhgcnqrn`, URL `https://cpzuvaplseielhgcnqrn.supabase.co`, do người dùng cung cấp.
- Dữ liệu nghiệp vụ lấy từ Cloud cũ, ánh xạ sang thiết kế V1. Giữ phần Khách hàng và các RPC, RLS, phân quyền, Realtime đã nghiệm thu.
- Các bảng/trường thiếu hoặc thừa được đối chiếu theo tài liệu V1 và nghiệp vụ hiện có. Không mặc định chép toàn bộ schema cũ rồi xóa hàng loạt, hoặc bổ sung bảng ngoài phạm vi đã chốt.
- So sánh với bản local hiện tại để giữ các thay đổi phát sinh sau lần nhập Cloud. Bản nguồn cũ và các bản ghi chưa chuyển phải được bảo toàn để tiếp tục xử lý.

## Nguồn đã có

Đã nhận bản xuất nghiệp vụ Cloud gồm 80 bảng, 2.167 dòng, cùng nguồn danh mục và bảng giá đủ 102 dòng. Một phần đã ánh xạ và nhập vào local V1, không cần nhập lại thành bản ghi trùng. Chi tiết tại [báo cáo nghiệp vụ](PAWPAL_NHAP_DU_LIEU_NGHIEP_VU_V1.md) và [báo cáo danh mục](PAWPAL_NHAP_DANH_MUC_CLOUD_VAO_V1.md).

Các mốc đã đối soát của phần Khách hàng là 35 khách, 82 thú cưng, 76 địa chỉ và 7.964 điểm. Sẽ kiểm kê lại trước khi chuyển, không coi các số này là số cố định nếu người dùng đã thêm/sửa dữ liệu.

Nguồn trước có 168 đơn vị chuyển đổi bị từ chối do thiếu hoặc không khớp dữ liệu. Chúng vẫn phải được đối chiếu, không được tuyên bố toàn bộ Cloud đã chuyển chỉ vì các bảng đã được tạo. Ví dụ 111 đơn nguồn có tổng không bằng tổng dòng hàng; cần làm rõ phần giảm giá, vận chuyển hoặc dòng thiếu trước khi nhập.

Bản xuất nghiệp vụ trước không gồm Auth, mật khẩu hay nội dung file Storage. Việc giữ tài khoản và liên kết hồ sơ phải xử lý riêng, không tự gắn Auth ID Cloud cũ vào Auth local/mới khi chưa có danh tính tương ứng. Giữ quyết định trước về 16 nhân viên bị khóa và Admin local, trừ khi người dùng thay đổi yêu cầu.

## Các bước thực hiện

1. Điền kết nối database project mới vào file riêng `D:\Aboutme\Pawpal-infra\supabase-local\CLOUD-MIGRATION.private.env`; không đưa credential vào Git hoặc chat.
2. Kiểm tra project đích: trạng thái dịch vụ, quota, phiên bản PostgreSQL, extension và dữ liệu có sẵn. Nếu có dữ liệu, kiểm kê và backup trước; không tự reset.
3. Backup local V1 và lập danh sách bảng/cột, số dòng, ràng buộc, RPC, RLS, grants và Realtime đang dùng.
4. Chuẩn bị schema tương thích Supabase Cloud từ V1. Các script `deploy_local.cjs`/`001_schema.sql` hiện dành cho local, không chạy nguyên xi vào Cloud. Không phục hồi chồng các schema hệ thống Auth/Storage hoặc role nội bộ từ full dump local.
5. Ánh xạ dữ liệu Cloud cũ, tận dụng phần đã nhập và đối chiếu thay đổi local. Bản ghi chưa rõ quan hệ, thiếu thông tin hoặc vi phạm ràng buộc được ghi nhận riêng để xử lý; không chế thêm dữ liệu để vượt constraint.
6. Thử phục hồi và kiểm tra trên môi trường tách biệt trước khi ghi đích. Kiểm tra đăng nhập, Auth liên kết, quyền anonymous/nhân viên/khách, lịch sử, số dư và thao tác Khách hàng.
7. Chuyển backend đổi mật khẩu sang Auth Cloud: endpoint Vercel hiện chuyển tiếp đến gateway local nên phải cập nhật, không chỉ thay URL và anon key. Giữ secret phía máy chủ và kiểm tra đúng tài khoản trước khi đổi mật khẩu.
8. Triển khai bản kiểm tra kết nối Cloud mới, nghiệm thu Khách hàng rồi đổi Production Vercel. Những trang hoặc phân hệ còn dùng cấu trúc Cloud cũ phải chuyển đổi hoặc giữ phạm vi kết nối rõ ràng, không mặc định đổi tất cả biến Cloud sang V1.
9. Kiểm tra Production thật: dữ liệu, thêm/sửa, Pawpoint, phân trang, quyền truy cập, Realtime và tải lại trang. Sau khi xác nhận không còn phụ thuộc local mới dừng gateway/tunnel; giữ backup và thông tin deployment trước để có thể quay lại.

## Trạng thái hiện tại

Đã chuyển bản V1 đã ánh xạ dữ liệu Cloud cũ lên project mới và chuyển kết nối Admin Production Vercel. Lỗi xác thực lúc đầu là do `PGPASSWORD` sẵn trong container được ưu tiên hơn file `.pgpass`; mật khẩu người dùng cung cấp hợp lệ. Công cụ mới truyền mật khẩu riêng qua stdin và không in credential.

- Project đích ban đầu trống, PostgreSQL 17.11; cấu trúc `auth.users`/`auth.identities` khớp local 17.6.
- Backup local mới đã thử phục hồi thành công tại `D:\Aboutme\Pawpal-infra\supabase-local\backups\v1-verified-a76b30a46dd48f3a`.
- Bộ xuất logical, schema đích trước chuyển và kết quả riêng nằm trong `D:\Aboutme\Pawpal-infra\supabase-local\backups\cloud-v1-2026-10-21T12-51-27-440Z`.
- Lượt nhập thử Cloud trong transaction đã rollback thành công; 105 hash dữ liệu bảng, Auth users, chính sách RLS và quyền bảng khớp nguồn. Sau đó áp dụng chính thức và xác minh 105 bảng / 906 cột / 160 FK / 105 bảng bật RLS. Không thay cấu trúc các schema hệ thống Auth/Storage.
- Tài khoản Admin giữ nguyên mật khẩu; 16 nhân viên tiếp tục giữ trạng thái khóa đã chốt. Không lấy thêm dữ liệu Cloud cũ trực tiếp trong đợt này: nguồn là bản local đã ánh xạ và có các cải tiến Khách hàng. Các đơn vị từng bị từ chối vẫn cần xử lý riêng theo báo cáo nhập nguồn.
- Production: `https://pawpalgr3.vercel.app/admin/login`, deployment `dpl_CXRu7BJMPzs2MjFh6dCEzfyDgt53`. Triển khai CLI từ workspace, chưa push mã lên GitHub.
- Vercel dùng URL/anon key của Cloud mới cho Admin. API đổi mật khẩu dùng service_role Cloud mới phía máy chủ, kiểm tra phiên và staff trước khi cập nhật; không qua gateway local. Các biến Cloud cũ của phân hệ chưa chuyển vẫn giữ nguyên.
- Chrome trên Production thật đã đạt: đăng nhập, 35 khách, 7.964 điểm, Realtime joined và reload; không gọi Cloud cũ hoặc trycloudflare. API từ chối chưa đăng nhập/token sai và config public không có service_role key. Ảnh `verification/vercel-production-cloud-customers.png` ngoài webroot.
- Tunnel demo đã dừng; Docker và preview local giữ để phát triển. Tiếp tục dùng các biến Production mới cho lần triển khai sau, không dùng lại file cấu hình demo cũ.

Phạm vi đã xác nhận độc lập máy cá nhân là **Admin V1 và phần Khách hàng**. Các phân hệ/trang khác vẫn cần chuyển mã và đối soát dữ liệu còn thiếu; không coi việc tạo đủ bảng là nghiệm thu toàn bộ website.

## Kết quả rà soát toàn hệ thống sau chuyển

Cập nhật sau Chatbot ngày 22/10/2026: chatbot đã triển khai Cloud/Vercel và nghiệm thu trong phạm vi Trực chat, Trợ lý chỉ tra cứu và Quy định. Chi tiết mức kiểm tra Production, giao dịch hoàn tác và bản phục hồi tại [nghiệm thu Chatbot](PAWPAL_CHATBOT_V1_NGHIEM_THU.md). Không cần ảnh/tệp, camera, gửi Zalo/SMS/email thật hoặc AI tự tạo đơn/đặt lịch trong phạm vi này.

Đã hoàn thiện Cấu hình V1, áp migration 057 trên Cloud mới và kiểm tra Production sau triển khai: lưu nguyên tử/phân quyền/xung đột, banner/voucher, bài viết/tri thức thật, thiết lập, biểu phí từng hình thức giao hàng, thông báo công khai và nhật ký. Chi tiết môi trường kiểm tra và giới hạn tại [nghiệm thu Cấu hình](PAWPAL_CAU_HINH_V1_NGHIEM_THU.md). Các báo cáo rà soát ban đầu bên dưới là mốc lịch sử, không thay thế biên bản nghiệm thu cập nhật từng phân hệ.

Cập nhật Nhân sự 22/10/2026: đã áp migration 029–038 lên Cloud mới, push mã và triển khai Vercel. Đối soát giữ nguyên toàn bộ dữ liệu public, danh tính/mật khẩu/trạng thái khóa Auth; vẫn 17 nhân sự, 16 tài khoản khóa. Đủ 105 bảng/906 cột/160 FK và publication 8 bảng Nhân sự/phân quyền. Kiểm tra Production Nhân sự, Khách hàng, Thú cưng, Dịch vụ và Bán hàng cuối đạt. Đã sửa lỗi chuyển phân hệ khi script còn tải, có kiểm thử cố tình trì hoãn script để tái hiện. Chi tiết phạm vi và giới hạn tại [nghiệm thu Nhân sự V1](PAWPAL_NHAN_SU_V1_NGHIEM_THU.md). Không coi các phân hệ hoặc trang phía khách chưa chuyển là đã hoàn tất.

Cập nhật 22/10/2026: Admin Bán hàng đã chuyển sang V1 trên Cloud mới và triển khai Vercel. Chi tiết phạm vi, bộ kiểm thử, số liệu đối chiếu, backup và giới hạn tại [nghiệm thu Bán hàng V1](PAWPAL_BAN_HANG_V1_NGHIEM_THU.md). Không coi trang gian hàng phía khách hoặc các phân hệ chưa chuyển là đã hoàn tất theo cập nhật này.

Đã đối soát SQL/REST đủ 105 bảng, mở 30 tab của 9 phân hệ Admin và 10 đường dẫn phía khách. Chi tiết, lỗi còn lại và thứ tự xử lý tại [báo cáo toàn bộ Cloud V1](PAWPAL_DOI_SOAT_TOAN_BO_CLOUD_V1.md). Database khớp local, quyền đọc đúng; nhiều phân hệ vẫn dùng truy vấn legacy và phía khách vẫn gọi Cloud cũ. Đã sửa client không mang phiên Admin của Khiếu nại và triển khai bản `dpl_CnGFdH7ukQFxQhS7HNDiRSA3d9D7`; kiểm tra Khách hàng Production sau sửa vẫn đạt. Không coi toàn bộ chức năng đã nghiệm thu.


## Cập nhật Khiếu nại V1 ngày 22/10/2026

Đã hoàn thiện ba tab Admin Khiếu nại và áp migration 039–042 lên Cloud mới. Kiểm thử ghi trên bản phục hồi; kiểm tra Cloud thật chỉ đọc xác nhận 25/25 phiếu, bộ lọc/xuất file, hồ sơ khi tải lại và Realtime, không gọi nguồn cũ. Hash toàn bộ dữ liệu public cùng danh tính/mật khẩu/trạng thái khóa Auth giữ nguyên; vẫn 17 nhân viên và 16 tài khoản khóa.

Quyết định đã chốt: Khiếu nại ghi đề xuất/quyết định; hoàn tiền, đổi trả và làm lại thực hiện qua Bán hàng/Dịch vụ, rồi liên kết kết quả thực tế. Không tự cộng điểm/voucher hoặc tạo tiền. Chi tiết kiểm thử và giới hạn tại [nghiệm thu Khiếu nại V1](PAWPAL_KHIEU_NAI_V1_NGHIEM_THU.md). Chấm công, lương, thưởng và hoa hồng tiếp tục ngoài scope.
