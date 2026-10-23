# Dịch vụ V1 — tiến độ và nghiệm thu

Cập nhật ngày 22/10/2026. Nguồn triển khai là Cloud mới `cpzuvaplseielhgcnqrn`; cấu trúc vẫn theo tài liệu 3NF V1 gồm 105 bảng, 906 cột và 160 khóa ngoại.

## 1. Phạm vi đã chuyển trong đợt này

- Đọc lịch hẹn qua `appointment` và `appointment_item`; lấy tên và giá đã chốt từ dòng dịch vụ, không lấy giá hiện tại thay cho giá lịch sử.
- Tổng tiền lấy từ `appointment_totals`. Trạng thái thu tiền tính từ khoản thu thành công trừ khoản hoàn tiền thành công; hỗ trợ hiển thị thu một phần.
- Số điện thoại lấy từ `customer_phone` chính; giống và loài đi qua `pet_breed` và `pet_species`; cân nặng lấy từ `pet_current_weight`.
- Tải đầy đủ các trang dữ liệu để tránh mất bản ghi do giới hạn mặc định của API. Thư mục khách và thú cưng được nạp trực tiếp, không phụ thuộc việc đã mở phân hệ Khách hàng trước đó.
- Đọc danh mục, loài hỗ trợ, cấp độ nhân viên và quy trình qua đúng các bảng quan hệ V1. Quy trình chưa có dữ liệu hiển thị trạng thái trống; không tự chèn quy trình mẫu vào dữ liệu đã lưu.
- Đọc đánh giá qua `review.appointment_item_id`; phản hồi lưu riêng trong `review_response`.
- Đọc nhật ký bằng `care_log.appointment_id`, người ghi bằng `recorded_by`, ảnh bằng `care_log_media`. Biên bản hiển thị từ `appointment_record`, không lấy khối biên bản nhúng trong ghi chú lịch hẹn làm dữ liệu V1.
- Realtime lắng nghe bảng V1 của lịch hẹn, dòng dịch vụ, điều chỉnh, thu và hoàn tiền, biên bản, chuyến xe, lưu trú, nhật ký, bảng giá và đánh giá.

## 2. Các thao tác ghi đã chuyển

Migration: `scripts/database/v1/013_admin_service_bookings.sql`.

| Thao tác | Hàm giao dịch | Kiểm soát chính |
| --- | --- | --- |
| Tạo lịch chăm sóc hoặc xe một chiều | `create_admin_service_booking` | Kiểm tra chủ và bé, loài hỗ trợ, cân nặng, giá đúng ngày hẹn, cấp độ nhân viên và lịch trùng. Tạo lịch, dòng dịch vụ, chuyến xe và nhật ký kiểm toán cùng giao dịch. ID yêu cầu giữ nguyên khi thử lại để tránh tạo trùng. |
| Xác nhận, ghi nhận đã đến, vắng mặt, hủy lịch | `update_admin_service_booking` | Kiểm tra phiên bản `updated_at`, chuyển trạng thái hợp lệ, lý do hủy. Chưa đến giờ không ghi vắng mặt; lịch có khoản thu thành công phải đi qua quy trình hoàn tiền trước khi hủy. |
| Đổi nhân viên phụ trách lịch | `update_admin_service_booking` | Kiểm tra nhân viên hoạt động, không khóa dịch vụ, đủ cấp độ và không trùng lịch. Không thay người thực hiện trong nhật ký đã ghi. |
| Lưu danh mục và cấu hình | `save_admin_service_catalog` | Lưu dịch vụ, loài hỗ trợ và quy trình trong một giao dịch. Bảng giá chỉ thay khi người dùng chọn rõ; giữ lịch sử giá cũ và giá đã chốt của lịch hẹn. |
| Lưu hoặc sửa phản hồi đánh giá dịch vụ | `reply_admin_service_review` | Xác định người phản hồi từ Auth hiện tại; kiểm tra phiên bản phản hồi để tránh ghi đè thay đổi của người khác. |

Các hàm dùng quyền người gọi và RLS, có kiểm tra quyền nghiệp vụ, ghi `audit_log`, cố định `search_path`, không cấp quyền chạy cho `anon`.

Các khoảng giá dùng quy tắc từ cận dưới đến trước cận trên: đúng 5 kg thuộc khoảng từ 5 đến dưới 10 kg. Khung cuối có cận trên `NULL`. Khi sửa danh mục, mặc định giữ nguyên toàn bộ bảng giá; chọn thay giá mới đóng hiệu lực giá đang dùng và tạo bộ giá mới. Bảng giá đã lên lịch cho tương lai cần đối soát riêng trước khi thay.

## 3. Thiếu thông tin trong dữ liệu nguồn

Cloud hiện có 22 dịch vụ nhưng chưa có dòng nào trong `service_supported_species`. Hệ thống không tự đoán dịch vụ hỗ trợ chó, mèo hay loài khác. Người quản trị mở **Danh mục → Sửa**, chọn loài thực sự hỗ trợ rồi lưu. Sau đó mới tạo lịch cho loài tương ứng.

Giá theo cân nặng, giá phòng và giá xe là các cấu hình khác nhau. Biểu mẫu thay bốn khung giá chỉ áp dụng cho nhóm chăm sóc; không ghi đè giá phòng hoặc quy tắc giá xe.

## 4. Bằng chứng kiểm tra

- `scripts/test/services_v1_stage.cjs`: mọi thao tác ghi chạy trên database phục hồi riêng và API `127.0.0.1:8011`, không tạo dữ liệu kiểm thử trên Cloud thật.
- Đối chiếu trạng thái, tổng tiền và số lượng lịch với bảng/view V1; mở cả bốn tab.
- Qua giao diện: sửa danh mục mà không đổi bảng giá, chọn khách tự điền số điện thoại và bé, tạo lịch, xác nhận và phản hồi đánh giá.
- Qua API: giao dịch lỗi hoàn tác cả dịch vụ, thử lại yêu cầu không tạo trùng, chọn sai loài không tạo lịch dở dang, chặn lịch nhân viên trùng, chặn phiên bản cũ, giữ giá lịch sử khi thay bảng giá, tạo chuyến xe và dòng giá đồng thời, từ chối người không có quyền.
- `scripts/test/services_v1_cloud_live.cjs`: chỉ đọc trên Vercel, đối chiếu với Cloud mới, kiểm tra nhật ký, bốn tab, Realtime và tải lại trang; chặn mọi thao tác ghi nghiệp vụ trong lần kiểm tra.
- Các kiểm tra cấu hình Vercel, Auth, sổ điểm trống và kiểm soát truy vấn băng thông vẫn đạt.

## 5. Phạm vi nghiệm thu hoàn thiện

**Các luồng Admin Dịch vụ trong phạm vi đã chốt đã được hoàn thiện và kiểm thử bằng migrations 013–018.** Các đoạn triển khai phía dưới lưu lại bằng chứng từng đợt; kết quả cuối nằm tại mục 10.

- [x] Lưu biên bản tiếp nhận và bàn giao bằng giao dịch V1; quản lý phiên bản biên bản và điều kiện hoàn tất ca.
- [x] Ghi, sửa, xóa nhật ký chăm sóc bằng giao dịch V1 có đối soát người thực hiện.
- [x] Phụ phí, dịch vụ đi cùng, đồng ý của khách và phê duyệt điều chỉnh qua các bảng V1; bỏ ghi chi phí trong `appointment.note`.
- [x] Chọn và giữ phòng khách sạn, xử lý nhận và trả phòng; bổ sung xe khứ hồi có thời gian về bằng migration 015.
- [x] Lưu thông báo đón bé nội bộ theo cấu trúc V1 bằng migration 016; không coi lưu nội bộ là đã gửi Zalo, SMS hoặc email.
- [x] Thu ngân V1: thu một phần/đủ, hoàn tiền thực tế, mã chuyển khoản đã đối soát, lịch sử và số dư; không tự cộng điểm, áp voucher hoặc xét hạng.
- [x] Tìm kiếm, bộ lọc, xuất CSV theo bộ lọc và phân trang tối đa 10 dòng; rà soát các modal và khôi phục hồ sơ sau tải lại.
- [x] Lịch làm việc/nghỉ và phân công từ dữ liệu thật; bỏ tên nhân viên, công suất và chi nhánh dựng sẵn. Chặn xếp người có lịch không khả dụng.
- [x] Tạo phiếu phản ánh từ ca/đánh giá bằng V1, ghi kiểm toán và lọc đánh giá theo ca có phiếu thật.

Ảnh tải lên, gửi Zalo/SMS/email thật và cổng khách xem nhật ký không nằm trong đợt này; giao diện không báo đã gửi hoặc đã lưu ảnh. Nguồn thiếu loài hỗ trợ, phòng/chuyến xe vẫn phải bổ sung thông tin thật; không tự tạo. Khoản thu cũ đã gắn chi tiêu xét hạng hoặc điểm cần đối soát sổ trước khi hoàn, không tự đoán cách đảo điểm. Nghiệm thu Dịch vụ không đồng nghĩa các phân hệ khác hoặc cổng khách đã bỏ Cloud cũ.

## 6. Triển khai

- Schema và hàm được kiểm tra trên bản phục hồi riêng, sau đó áp dụng local và Cloud mới.
- Sao lưu và biên bản triển khai lưu ngoài thư mục web trong `D:/Aboutme/Pawpal-infra/supabase-local/backups/services-cloud-*`.
- Trạng thái triển khai và nghiệm thu Cloud được lưu trong `services-cloud-deployment.private.txt` và `services-cloud-read-verification.private.txt` ngoài repository. Không đưa các file khóa hoặc thông tin đăng nhập vào Git.
- Kết quả cuối cùng của lần triển khai này được ghi ở cuối tài liệu sau khi kiểm tra Production.

**Kết quả Production:** deployment `dpl_DVXMEGWbepDH4sTikPtwqU2JCjBt` đã sẵn sàng tại `https://pawpalgr3.vercel.app`. Bài kiểm tra đọc xác nhận 71 lịch hẹn khớp trạng thái/tổng tiền/số điện thoại, 22 dịch vụ, 3 đánh giá, nhật ký thật, bốn tab, Realtime và tải lại trang. Không có lỗi REST/JavaScript, yêu cầu Cloud cũ/tunnel/JSON hoặc ghi nghiệp vụ trong bài kiểm tra. Khách hàng (35 khách, 7.964 điểm) và Thú cưng (82 bé, 7 nhật ký) cũng đạt trên cùng lần triển khai. Các phép thử ghi chỉ chạy trên bản phục hồi riêng; môi trường thử đã được dọn và giữ lại backup.

Mã đã deploy từ thư mục làm việc; thay đổi của đợt Thú cưng và Dịch vụ hiện chưa commit/push Git.

## 7. Bổ sung migration 014 — biên bản, nhật ký và phát sinh

- `save_admin_service_record`: ghi `appointment_record` riêng, phiên bản mới thay vì sửa biên bản đã xác nhận. Cân khi tiếp nhận ghi `pet_weight_history` trong cùng giao dịch, cùng thời điểm với biên bản; không tạo cột cân nặng cũ. Người lập lấy từ Auth hiện tại, người phụ trách được kiểm tra trạng thái/cấp độ/lịch trùng. Các mục ngoại quan chưa chọn không được tự xem là bình thường.
- Mỗi lần lập hoặc sửa biên bản phải ghi nhận rõ khách có xác nhận nội dung phiên bản mới hay chưa. Bàn giao cần biên bản tiếp nhận mới nhất đã xác nhận, xác nhận chất lượng, trả tư trang và xác nhận bàn giao của khách. Còn đề xuất phụ phí chờ xử lý thì chưa hoàn tất ca. Hoàn tất cập nhật cả lịch và các dòng dịch vụ trong giao dịch; không tự đánh dấu đã thu tiền, ghi điểm hoặc trừ kho.
- `save_admin_service_care_log`: thêm/sửa/xóa nhật ký, kiểm tra phiên bản lịch và nhật ký; chỉ thao tác khi ca đang thực hiện. `recorded_by` liên kết nhân viên thực hiện ghi nhận, `audit_log.staff_id` giữ người thao tác hiện tại. Bước tự do lưu trong `action_name_snapshot`; chỉ liên kết `care_action_id` nếu khớp quy trình dịch vụ đã có, không tự tạo danh mục rác khi ghi nhật ký. Không xóa nhật ký có ảnh đính kèm bằng luồng hiện tại.
- `change_admin_service_charge`: đề xuất phụ phí, ghi nhận khách đồng ý, duyệt và hủy là các thao tác riêng. Tổng chỉ thay đổi khi đã duyệt và khách đã đồng ý. Hủy giữ nguyên bản ghi để đối soát; không xóa lịch sử đã duyệt. Quyền duyệt hiện là quyền ghi `appointment_adjustment` cùng các quyền giao dịch liên quan; chưa áp dụng quy tắc bắt buộc hai nhân viên khác nhau.
- Dịch vụ đi cùng lưu `appointment_item` với giá được máy chủ đối chiếu theo cân nặng hiện tại và ngày hẹn. Khách phải đồng ý giá báo. Thêm dịch vụ tăng thời gian giữ lịch tương ứng và kiểm tra nhân viên trùng ca; hủy dịch vụ đánh dấu dòng `cancelled`, giữ lịch sử. Người thực hiện đi theo nhân viên phụ trách ca hiện tại. Khác nhân viên cần điều phối riêng, không giả nhận lựa chọn nhân viên khác là đã lưu.
- Đã có khoản thu thành công hoặc ca kết thúc thì khóa sửa chi phí qua luồng này, yêu cầu xử lý bằng thu ngân. Thanh toán/hoàn tiền, thay giá lịch đã chốt theo cân nặng mới, và các quy trình lưu trú/xe chưa nằm trong phạm vi đợt này.
- Giao diện lấy tổng cuối từ `appointment_totals`, không ghi đè tổng bằng phép tính tạm trong hồ sơ. Nhật ký được nạp lại sau khi lưu để tránh hiển thị bản cache rỗng. Lựa chọn người thực hiện và dịch vụ đi cùng dùng popover thuần chữ từ danh mục sống; ảnh vẫn báo chưa cấu hình.

`scripts/test/service_records_v1_stage.cjs` đã đạt luồng giao diện tiếp nhận/xác nhận phiên bản mới, thêm/sửa/xóa nhật ký, ghi nhận đồng ý và duyệt phụ phí, báo giá/thêm dịch vụ đi cùng và bàn giao. Kiểm tra API bổ sung: không nhân bản khi thử lại, cân nặng đúng thời điểm biên bản, biên bản xác nhận bất biến, phụ phí chờ chưa vào tổng, hủy giữ lịch sử, từ chối phiên bản cũ/người không có quyền, không bàn giao khi thiếu xác nhận hoặc còn đề xuất chờ, khóa nhật ký sau hoàn tất. Toàn bộ dữ liệu thử nằm trong database phục hồi riêng.

**Triển khai đợt 014:** đã áp dụng local/Cloud, đối chiếu 105 bảng, 906 cột, 160 khóa ngoại; ba hàm RPC khớp bản đã thử, không cấp quyền cho anon. Số lượng khách, thú cưng, lịch, dòng dịch vụ, biên bản, nhật ký, điều chỉnh, tổng điểm và tồn kho Cloud không đổi. Backup trước khi chạy nằm ngoài webroot ở thư mục `backups/service-records-cloud-4a687aff723d`; database/API thử đã được dọn, backup local giữ tại `backups/customers-complete-62307fa380d6`.

Bản Production cuối `dpl_BJf2B2SFgpTgXfBuxfSCpCEv7DhM` tại `https://pawpalgr3.vercel.app` đã đạt kiểm tra đọc Dịch vụ: 71 lịch hẹn, 22 dịch vụ, 3 đánh giá, nhật ký, bốn tab, Realtime và tải lại; không có lỗi REST/JavaScript hoặc yêu cầu tới Cloud cũ/tunnel/JSON trong lượt đạt. Khách hàng đạt 35 khách và 7.964 điểm trên cùng bản. Một lượt kiểm tra Dịch vụ trước đó timeout chưa xác định nguyên nhân; lượt chạy tiếp có thêm chẩn đoán đã đạt. Không chạy các thao tác ghi thử biên bản/phụ phí trên dữ liệu Production. Mã của các đợt này vẫn chưa commit/push Git.

## 8. Bổ sung migration 015 — lưu trú và xe khứ hồi

Người dùng đã xác nhận hai quy tắc: khách sạn tính mỗi 24 giờ và làm tròn lên một ngày; xe khứ hồi cộng giá hai lượt theo bảng giá có hiệu lực ở thời điểm từng lượt.

- `create_admin_logistics_booking`: tạo lịch, dòng giá, lưu trú hoặc chuyến xe và kiểm toán trong cùng giao dịch; kiểm tra chủ/bé, loài hỗ trợ, thời gian, nhân viên, phiên bản giá và yêu cầu thử lại. Chọn phòng thật từ CSDL qua popover, lấy giá ngày từ loại phòng. Một phòng được giữ độc quyền cho một lượt lưu trú; sức chứa không được tự diễn giải thành chia sẻ phòng.
- Khách sạn chặn đặt trùng kể cả hai yêu cầu đồng thời, cho phép hai khoảng kế tiếp nhau. Tiếp nhận đồng thời chuyển lưu trú sang `checked_in`; phòng còn khách chưa trả thì chưa nhận khách tiếp theo. `close_admin_hotel_stay` giải phóng phòng, ghi thời điểm trả thật vào kiểm toán rồi mới cho bàn giao. Ngày dự kiến và giá đã chốt được giữ lại; chưa tự thu phụ phí trả muộn hoặc hoàn tiền trả sớm.
- Xe khứ hồi có giờ về bắt buộc, địa chỉ lượt về đảo chiều và quãng đường mỗi lượt như biểu mẫu đã ghi rõ. Mỗi lượt được đối chiếu riêng theo cân nặng, quãng đường và thời điểm. Giá tổng lưu ở dòng dịch vụ/chuyến xe; mã hai quy tắc và số tiền từng lượt lưu trong kiểm toán vì V1 chỉ có một khóa bảng giá trên chuyến xe. Nhân viên được giữ trong cả khoảng đi, chờ và về.
- Lịch khách sạn/xe cũ thiếu thông tin phòng/chuyến hiển thị cảnh báo; không tự dựng thông tin để tiếp nhận hoặc hoàn tất. Hiện Cloud nguồn có 0 lưu trú và 0 chuyến xe chi tiết. Quản trị cần đối soát các lịch thiếu thông tin này trước khi xử lý. Danh mục chưa khai báo loài hỗ trợ vẫn cần bổ sung đúng thực tế trước khi tạo lịch mới.
- Chưa chia nhân viên lưu trú thành các ca độc lập: nếu gán người phụ trách, kiểm tra lịch trùng hiện giữ toàn khoảng lưu trú. Thu ngân và thông báo vẫn là phạm vi tiếp theo.

`scripts/test/logistics_v1_stage.cjs` đã đạt giao diện đặt phòng, 25 giờ thành 2 ngày, giữ phòng đồng thời, hủy giải phóng phòng, nhận/trả và bàn giao; xe hai phiên bản giá cho tổng 110.000 đồng, giờ về không hợp lệ, thử lại và người không có quyền. Kiểm thử 013 và 014 tiếp tục đạt trên bản phục hồi riêng. Dữ liệu thử không được ghi vào Cloud thật.

Đã áp dụng 015 lên local và Cloud mới: 105 bảng, 906 cột, 160 khóa ngoại và RLS toàn bộ bảng vẫn đúng. Bốn định nghĩa hàm khớp bản đã thử, không mở quyền anon, trigger đồng bộ đang bật. Dấu vân tay dữ liệu của cả 105 bảng trước/sau giống nhau. Backup Cloud tại `backups/logistics-cloud-643ea0b43af9`, backup local tại `backups/customers-complete-e31604c11368` bên ngoài webroot. Database/API thử đã được dọn.

Production đợt 015: `dpl_GRjp4qWKbx4sV2KqVtFsRaiXJVMX`, đang phục vụ tại `https://pawpalgr3.vercel.app`. Kiểm tra đọc đạt 71 lịch khớp nguồn, trạng thái/tổng tiền/số điện thoại, 22 dịch vụ, 3 đánh giá, nhật ký, bốn tab, Realtime và tải lại trang. Không ghi dữ liệu thử, không lỗi REST/JavaScript hoặc yêu cầu Cloud cũ/tunnel/JSON trong lượt kiểm tra. Đăng nhập và Khách hàng đạt 35 khách, 7.964 điểm trên cùng bản. Kiểm tra cấu hình, endpoint mật khẩu và hồi quy băng thông đều đạt. Đã sửa route cấu hình Admin và đổi mật khẩu của máy chủ local để cổng `localhost:3000/admin/login` dùng Cloud mới. Mã đã deploy từ thư mục làm việc, chưa commit/push các thay đổi đang có.

## 9. Bổ sung migration 016 — thông báo nội bộ mời đón bé

Đợt này chỉ nghiệm thu modal thông báo trước khi chuyển sang modal thu ngân, theo quy trình từng modal trong `AGENTS.md`.

- `save_admin_pickup_notification` dùng quyền người gọi, RLS và `search_path` cố định. Khách nhận lấy từ lịch hẹn, không nhận ID khách tùy ý từ trình duyệt. Thông báo và `audit_log` được ghi cùng giao dịch, có ID yêu cầu để thử lại hoặc gọi đồng thời không nhân bản. Cùng ID nhưng khác nội dung bị từ chối.
- Chỉ lưu cho ca đang thực hiện hoặc đã hoàn tất, có biên bản tiếp nhận mới nhất được xác nhận; còn phụ phí chờ hoặc chưa được khách đồng ý thì cần xử lý trước. Người thao tác phải xác nhận bé sẵn sàng để đón. Kiểm tra phiên bản lịch ngăn dùng thông tin hồ sơ cũ.
- Dùng đúng các cột V1 `notification.customer_id`, `appointment_id`, `notification_type`, `title`, `content`, `sent_at`, `read_at`; bỏ các cột cũ `related_entity_type`, `is_read`. `sent_at` là thời điểm ghi nhận nội bộ, không phải bằng chứng gửi qua nhà cung cấp bên ngoài.
- Modal bỏ lựa chọn Zalo/SMS, tùy chọn ảnh và liên kết chưa triển khai. Nút ghi rõ **Lưu thông báo**, hiển thị rõ chưa gửi Zalo/SMS/email. Không tạo `care_log` giả, không đổi trạng thái ca, không ghi thu/hoàn tiền. Kiểm toán giữ người thực hiện và kênh `internal` với `external_delivery=false`.
- Bỏ trình xử lý mở modal bị gắn hai lần; mở bằng class để Escape không để lại overlay vô hình chặn trang. Đóng, Hủy, Escape và backdrop đều đã thử bằng trình duyệt. Nội dung trống và thiếu xác nhận hiển thị lỗi ngay tại form; không reload trang.

`scripts/test/pickup_notification_v1_stage.cjs` đã đạt giao diện lưu, bốn cách đóng, đúng khách/lịch và kiểm toán, yêu cầu đồng thời/thử lại, xung đột nội dung, phiên bản cũ, chưa sẵn sàng, không đủ quyền và hoàn tác thông báo khi ghi kiểm toán lỗi. Số dòng nhật ký, thu/hoàn và trạng thái lịch không thay đổi ngoài thao tác được yêu cầu. Mọi thao tác thử ghi chạy trên bản phục hồi riêng; ảnh kiểm tra lưu ngoài webroot.

Đã áp dụng 016 lên local và Cloud mới, đối chiếu 105 bảng/906 cột/160 khóa ngoại/RLS và định nghĩa RPC khớp bản thử; không mở quyền anon. Dấu vân tay dữ liệu cả 105 bảng trước/sau giống nhau. Backup Cloud giữ tại `backups/pickup-cloud-03a06db23dd9`, backup local tại `backups/customers-complete-4aad7d76f9d7`; môi trường thử đã được dọn.

Production `dpl_AdFXVEcDsg3VRFnCDieV9jTBBp7q` tại `https://pawpalgr3.vercel.app` đạt kiểm tra đọc Dịch vụ, mở modal thông báo đúng bản mới và Escape đóng hoàn toàn, bốn tab/Realtime/tải lại, 71 lịch/22 dịch vụ/3 đánh giá khớp nguồn. Đăng nhập và Khách hàng đạt 35 khách/7.964 điểm. Không lỗi REST/JavaScript hoặc yêu cầu Cloud cũ/tunnel/JSON trong các lượt này; không ghi thông báo thử lên Cloud thật. Kiểm tra cấu hình, endpoint mật khẩu và hồi quy băng thông đạt. Mã đã deploy nhưng chưa commit/push các thay đổi đang có. Thu ngân được triển khai tiếp tại mục 10.

## 10. Hoàn tất phạm vi Admin Dịch vụ — migrations 017 và 018

Ngày 22/10/2026, người dùng chốt: thu một phần/đủ bằng tiền mặt hoặc chuyển khoản đã nhận, hoàn tiền có lý do; không tự cộng điểm, áp voucher, xét hạng hoặc xác nhận chuyển khoản trước nhân viên.

| Luồng | Kết quả và bằng chứng |
| --- | --- |
| Thu ngân | `get_admin_service_cashier` đọc tổng/số đã thu sau hoàn/còn thiếu và lịch sử. `post_admin_service_money` là giao dịch máy chủ hẹp, kiểm tra quyền trước thao tác, khóa lịch và khoản thu gốc, phiên bản số dư, số tiền nguyên dương, lý do và xác nhận thực tế. Thu/hoàn và audit cùng giao dịch. Không cấp quyền ghi trực tiếp bảng tiền cho authenticated. |
| Chống thu/hoàn trùng | Cùng ID và nội dung thử lại trả giao dịch cũ; đổi nội dung bị từ chối. Hai người cùng ghi chỉ một phiên bản được chấp nhận. Mã ngân hàng được ghi với tiền tố `manual-bank:`, không phải xác nhận từ cổng thanh toán; không dùng lại cùng mã. Chỉ hỗ trợ phương thức khả dụng không thu phí: tiền mặt, chuyển khoản ngân hàng, VietQR. |
| Hoàn và hủy | Hoàn từ đúng khoản thu thành công, không vượt phần còn được hoàn; không xóa hoặc sửa giao dịch đã ghi. Hủy lịch còn tiền đã thu bị chặn; sau hoàn hết có thể hủy theo chuyển trạng thái hợp lệ. Khoản cũ có chi tiêu xét hạng/điểm liên kết cần đối soát riêng trước khi hoàn. |
| Nhân viên và lịch trực | Đọc `staff_schedule`, ngày và khung giờ thật; không tự chia ca theo thứ tự nhân viên hoặc bịa công suất. Phân công lưu UUID thay vì tên, không thêm KTV mẫu. Trigger chặn lịch không khả dụng đã khai báo. Không tự coi thiếu lịch làm việc là lịch nghỉ. |
| Biểu mẫu tạo lịch | Gói dịch vụ được chọn bằng ID nên tên trùng không gây chọn nhầm. Yêu cầu tạo kiểu được lưu trong ghi chú lịch; cấp độ lấy từ gói thật. Đổi sang nhóm khác xóa trường tạo kiểu không còn liên quan. Bỏ chi nhánh, voucher, điểm và phương thức thanh toán dựng sẵn trong biểu mẫu bàn giao. |
| Danh mục và SOP | Danh mục phân trang 10 dòng, không gắn ảnh đại diện giả khi chưa có ảnh. Bỏ SOP mẫu tĩnh và lời hứa tự ghi nhật ký; nhân viên cấu hình các bước thật rồi ghi nhận công việc thực tế. Giữ giá lịch sử của lịch hẹn đã tạo. |
| Phản ánh từ ca/đánh giá | `create_admin_service_ticket` tạo `support_ticket` và audit cùng giao dịch. Khách lấy từ lịch, tài khoản tạo từ Auth, kiểm tra đánh giá thuộc đúng ca. Không điều hướng sang phân hệ cũ để giả lập việc đã tạo phiếu. Modal đọc các phiếu gần đây theo ca; bộ lọc đánh giá đối chiếu các phiếu hỗ trợ thật của ca. Việc điều tra/xử lý phiếu vẫn thuộc phân hệ Khiếu nại. |
| Bộ lọc, xuất file và tải lại | Xuất lịch hẹn/đánh giá theo tập đã lọc; CSV xử lý dấu nháy và ký tự công thức. Tối đa 10 dòng mỗi trang danh sách. Tải lại giữ subtab/hồ sơ theo cơ chế hiện có. Không để lớp modal vô hình chặn trang, chặn submit form gây reload. |

Kiểm thử ghi chỉ chạy trên database phục hồi riêng:

- `services_v1_stage.cjs`: danh mục, giá lịch sử, đặt lịch, xác nhận/hủy/đổi nhân viên, loài/cân nặng/lịch trùng, đánh giá và phản hồi.
- `service_records_v1_stage.cjs`: biên bản xác nhận và phiên bản, cân, nhật ký, phụ phí/dịch vụ đi cùng và bàn giao.
- `logistics_v1_stage.cjs`: đặt/giữ phòng, hai phiên tranh phòng, nhận/trả, khách sạn 24 giờ làm tròn lên và hai lượt xe theo thời điểm.
- `pickup_notification_v1_stage.cjs`: thông báo nội bộ, xác nhận, thử lại, lỗi audit và quyền.
- `service_cashier_v1_stage.cjs`: giao diện thu/hoàn, số dư, thu đồng thời, mã ngân hàng, thử lại, lỗi audit hoàn tác, quyền bảng tiền và hủy sau hoàn hết; điểm/kho và trạng thái hoàn thành không tự thay đổi.
- `services_v1_completion_stage.cjs`: lịch trực/nghỉ thật, lọc ngày/khung giờ, ID nhân viên, xuất theo bộ lọc, CSV an toàn, phân trang, lưu yêu cầu tạo kiểu và xóa trường ẩn, không chi nhánh giả, 18 modal đóng qua nút/huỷ/Escape/backdrop và khôi phục hồ sơ sau reload.
- `service_ticket_v1_stage.cjs`: giao diện từ đánh giá sang phiếu phản ánh, đúng khách/ca/tài khoản tạo, lịch sử, lọc phiếu thật, đồng thời/thử lại, lỗi audit, đánh giá sai ca và quyền.

017 và 018 đã áp dụng lên local/Cloud mới, vẫn đúng 105 bảng/906 cột/160 khóa ngoại và RLS toàn bộ bảng. Các định nghĩa hàm khớp bản đã thử; không mở quyền anon hoặc quyền ghi trực tiếp bảng tiền. Dữ liệu nghiệp vụ không đổi; chỉ bổ sung cấu hình phương thức **Tiền mặt** được người dùng cho phép. Backup ngoài webroot: `backups/service-completion-cloud-7ec9e4931c45`, `backups/service-ticket-cloud-e7f9c466dd45` và local `backups/customers-complete-4347a4d50128`. Môi trường thử đã được dọn.

Giới hạn đã chốt: chưa phát triển ảnh/file, gửi tin bên ngoài hoặc cổng khách xem nhật ký; không tự áp voucher/điểm/xét hạng. Dữ liệu nguồn thiếu loài hỗ trợ, lưu trú/chuyến xe cần nhập thông tin thật; không tự tạo dữ liệu bù. Phạm vi này hoàn thiện phần Admin Dịch vụ, không bao gồm chuyển toàn bộ Nhân sự/Khiếu nại/Bán hàng hoặc cổng khách sang V1.

**Kết quả Production cuối:** `dpl_HV6p1kN6SwGvT2NL1ixJ4TnR9A7o` tại `https://pawpalgr3.vercel.app`. Kiểm tra chỉ đọc đạt 71 lịch hẹn khớp trạng thái/tổng tiền/số điện thoại, 22 dịch vụ, 3 đánh giá, nhật ký, thu ngân, lịch trực, phiếu phản ánh, thông báo nội bộ, bốn subtab, Realtime và tải lại. Bộ lọc cảnh báo đã đồng bộ với KPI 1–3 sao và được đối chiếu với nguồn thật. Không có lỗi REST/JavaScript, yêu cầu Cloud cũ/tunnel/JSON hoặc ghi nghiệp vụ tự phát trong lượt kiểm tra. Khách hàng đạt 35 hồ sơ/7.964 điểm; Thú cưng đạt 82 bé/7 nhật ký trong đợt triển khai. Các bài kiểm tra cấu hình/Auth, băng thông và `git diff --check` đạt. Tất cả thao tác thử ghi giữ trong bản phục hồi riêng đã dọn; không ghi khoản thu/phiếu thử lên Cloud thật. Mã đã deploy từ thư mục làm việc và **chưa commit/push** các thay đổi đang có.
# Cổng khách hàng — đợt đối soát 23/10/2026

Các luồng đã kiểm tra trên Vercel được ghi cụ thể bên dưới; chưa chốt nghiệm thu toàn bộ phân hệ khi chưa đối soát liên thông đầy đủ.

- [x] Migration `065_customer_booking_summary.sql`: chỉ trả tổng tiền chuẩn, thực thu sau hoàn thành công và các dòng đã đánh giá của chính khách đang đăng nhập; từ chối phiên không phải khách. Đã thử trên CSDL phục hồi và rollback.
- [x] Đã áp Cloud mới sau sao lưu `portal-bookings-cloud-2026-10-22T17-39-10-301Z`; đối soát dữ liệu public, Auth và 17 nhân viên không đổi.
- [x] Đọc lịch theo V1, không dùng cột đánh giá cũ; phân biệt thu một phần với thanh toán đủ. Không tự hoàn thành hoặc tiếp nhận lịch dựa vào thời gian trên trình duyệt.
- [x] Không gộp các lịch riêng chỉ vì cùng thú cưng/dịch vụ/giờ. Trình duyệt dùng mã local với Cloud thật đã xác nhận hai lịch thử hiển thị đủ hai thẻ, đúng tổng tiền, không ghi thu tiền; đã dọn fixture và xem ảnh.
- [x] Bộ kiểm thử đọc lịch, đăng ký Realtime và hồi quy giỏ hàng: 27/27 đạt.
- [x] Commit `babc776` đã lên Vercel; `node scripts/test/customer_booking_cloud_read.cjs --deployed` đạt. Đây là nghiệm thu phần danh sách/đọc số tiền, không phải nghiệm thu form đặt mới hoặc đổi/hủy lịch.
- [x] `068_customer_booking_create.sql` đã áp Cloud sau sao lưu `portal-bookings-cloud-2026-10-22T18-19-05-136Z`; catalog/phòng/phần thêm và hồ sơ bé đọc qua RPC, báo giá rồi tạo lịch cùng các dòng trong một giao dịch. Bỏ giảm 5% cố định, khách tạm/cache lịch, giờ/nhân viên mẫu và JSON/CSV dự phòng. Chưa thu tiền hoặc cộng điểm khi gửi lịch; journal chỉ lưu UUID yêu cầu để chống tạo trùng sau tải lại.
- [x] Kiểm thử phục hồi đạt spa/khách sạn/xe khứ hồi, phần thêm bắt buộc, giá thật thay giá client, rollback khi quote cũ, chống gửi lặp và quyền chủ bé. Trình duyệt mã local + Cloud thật đã tạo cả ba nhóm qua form bốn bước, xem ảnh, dọn fixture; kiểm tra không có yêu cầu `/data/` hoặc khoản thu/điểm thử.
- [x] `066_customer_booking_cancel.sql`: hủy có lý do, quyền chủ lịch, phiên bản, chống gửi lặp; giữ hạn trước giờ bắt đầu 2 tiếng, chặn đã thu/đang thực hiện. Giải phóng phòng và chuyến xe qua trigger hiện có. Kiểm thử giao dịch phục hồi đạt, rollback toàn bộ fixture.
- [x] Form hủy dùng chung từ danh sách và chi tiết đã thử trên trình duyệt với Cloud thật: thiếu lý do, Escape, xác nhận, đọc lại trạng thái và lý do trong nhật ký sau reload. Đã xem ảnh form, bỏ khóa tài khoản/lịch sử hủy và cộng điểm chỉ trong trình duyệt. Kiểm thử hồi quy 44/44 đạt; nhận diện khách kiểm tra phiên Auth và từ chối ID trình duyệt khác chủ.
- [x] Migration hủy đã áp Cloud sau sao lưu `portal-bookings-cloud-2026-10-22T17-48-28-876Z`, không đổi dữ liệu public/Auth hoặc 17 nhân viên khi triển khai.
- [x] Commit `76efecd` đã lên Vercel; `customer_booking_cloud_read.cjs --cancel --deployed` đạt cả hủy từ danh sách và chi tiết, trạng thái/lý do lưu bền, không tạo khoản thu. Đã dọn hồ sơ/lịch/Auth thử riêng.
- [x] Hồi quy mua hàng trên Vercel sau thay đổi nhận diện khách: `customer_sales_cloud_v1.cjs --deployed` đạt. Đã sửa thêm bộ hẹn giờ dọn form đổi trả sau chuyển trang (`396c9b8`); không còn lỗi JavaScript chưa xử lý trong luồng kiểm tra.
- [x] `067_customer_booking_reschedule.sql`: báo giá và đổi lịch qua máy chủ, giữ nguyên thời lượng/lượt về, tính lại giá spa theo cân nặng, khách sạn làm tròn 24 giờ, xe khứ hồi cộng giá hai lượt đúng thời điểm. Chặn trùng nhân viên/phòng, phiên báo giá cũ và gửi lặp; tối đa hai lần, lịch chuyển chờ xác nhận. Ca có khoản thu/chờ thu, voucher hoặc điều chỉnh cần đối soát chuyển nhân viên xử lý.
- [x] Áp Cloud sau sao lưu `portal-bookings-cloud-2026-10-22T18-04-55-775Z`; không đổi dữ liệu public/Auth/17 nhân viên khi triển khai. Kiểm thử phục hồi đạt cho spa/khách sạn/xe khứ hồi, giá thay đổi giữa xem và lưu, xung đột tài nguyên, giới hạn lần đổi, quyền chủ lịch và hủy lịch hồi quy.
- [x] Form đổi dùng chung danh sách/chi tiết đã thử với Cloud thật: thiếu thời gian/lý do, xem giá trước xác nhận, Escape, lưu bền và gửi lại cùng mã chỉ ghi một lần. Đã xem ảnh; fixture dịch vụ/loài/giá/khách/lịch/Auth thử riêng được dọn. Kiểm thử mã đọc/đổi/hủy/hồ sơ/Realtime đạt 21/21.
- [x] Commit `a6e371b` đã lên Vercel. `customer_booking_cloud_read.cjs --move --deployed` và `--cancel --deployed` đều đạt cho hai điểm vào danh sách/chi tiết; không tạo khoản thu, đã dọn fixture. Đổi lịch thử trên dịch vụ kiểm thử riêng có cấu hình loài/giá đầy đủ, không suy đoán cấu hình cho các gói nguồn.
- [x] Người dùng cho phép chuẩn bị dữ liệu loài theo từng dịch vụ. `069_service_species_seed.sql` đã điền 38 liên kết cho 22 gói, không gán chung mọi loài; đã sao lưu bảng mục tiêu, giữ nguyên liên kết cũ và đối soát mọi bảng public khác/Auth không đổi. Các chỉnh sửa tiếp theo thực hiện theo từng gói trong Admin.
- [x] Commit `66ea0ab` đã lên Vercel. `customer_booking_create_cloud.cjs --deployed` đạt spa/khách sạn/xe khứ hồi, lọc gói theo loài thật, trường điều kiện, phần thêm bắt buộc, báo giá máy chủ và chống tạo trùng sau tải lại. Hồi quy `customer_booking_cloud_read.cjs --cancel --deployed` và `--move --deployed` đều đạt; không tạo khoản thu/điểm và đã dọn dữ liệu thử riêng.
- [x] Đã kiểm tra liên thông trên Vercel: tìm gói ở danh mục → mở chi tiết → bấm đặt lịch → chọn bé và tự chọn đúng gói → xem báo giá → tạo lịch → xem chi tiết trong tài khoản. `customer_booking_create_cloud.cjs --deployed` đạt cả spa, khách sạn và taxi khứ hồi; URL không truyền giá để tính tiền, không tạo khoản thu/điểm và đã dọn dữ liệu thử. Hồi quy `customer_booking_cloud_read.cjs --cancel --deployed`, `--move --deployed` và `customer_service_reviews_cloud.cjs --deployed` đều đạt trên cùng bản triển khai.
- [x] Nhánh “Phản ánh ca dịch vụ” ghi phiếu và tin nhắn đầu tiên trong cùng giao dịch Cloud qua migration `073_customer_support.sql`. Máy chủ xác định khách từ Auth, kiểm tra quyền sở hữu lịch, chống tạo trùng khi gửi lại. Khi ghi lỗi, giữ nội dung và không báo tiếp nhận thành công. Admin đọc được đúng phiếu và liên kết khách/lịch. Đính chính: `order_id` là cột đúng của V1; lỗi trước đây nằm ở luồng ghi và đồng bộ local, không phải tên cột này.
- [x] Khách đọc phiếu, gửi phản hồi và đánh giá qua RPC có kiểm tra chủ sở hữu. Realtime chỉ truyền tin nhắn công khai; ghi chú điều tra và tin nhắn nội bộ không được trả về. Đánh giá không tự đóng phiếu, hoàn tiền hay cộng điểm. Rời trang khi modal mở rồi quay lại không để sót modal hoặc kết nối cũ.

Kiểm tra bổ sung ngày 23/10/2026: `customer_support_v1.cjs` đạt trên CSDL kiểm thử với rollback; `customer_support_cloud.cjs` đạt bằng giao diện đang sửa kết nối Cloud thật, gồm lỗi mạng giữ bản nháp, gửi lại không trùng, tài khoản Admin thật, phản hồi Realtime, đánh giá, bốn cách đóng modal và rời/quay lại trang. Commit `9413677d` đã lên Vercel; chạy lại `customer_support_cloud.cjs --deployed` cũng đạt toàn bộ luồng trên. Dữ liệu thử đã dọn. Bản sao lưu trước migration nằm ngoài Git tại `portal-bookings-cloud-2026-10-23T03-49-16-837Z`; đối soát áp dụng DDL giữ nguyên dữ liệu nghiệp vụ và Auth. Phạm vi này không bao gồm ảnh/tệp, gửi thông báo thật hay chuyển toàn bộ FAQ/chat. Không truy vấn Logs Cloud.
- [x] Đã bổ sung quy tắc không truy vấn hệ thống Logs Cloud vào `AGENTS.md` theo yêu cầu người dùng; chỉ dùng dữ liệu nghiệp vụ/định nghĩa CSDL, API và trình duyệt để kiểm tra. Không gọi Logs Explorer, Logs API, CLI/MCP logs hoặc polling logs.
- [x] `072_public_service_directory.sql` áp Cloud sau sao lưu `portal-bookings-cloud-2026-10-23T01-10-01-631Z`, đối soát public/Auth/17 nhân viên không đổi. Danh mục công khai chỉ trả dịch vụ hoạt động, loài liên kết, giá đang hiệu lực, quy trình đã cấu hình và thống kê đánh giá đã công bố; RPC đánh giá không trả danh tính khách hàng.
- [x] DataLoader dịch vụ và trang danh mục/chi tiết đã bỏ nhánh JSON/CSV, sao/số lượt/nội dung/ảnh đánh giá mẫu và giá giảm hạng tự tính. Khách sạn/xe báo giá trong form đặt lịch theo phòng hoặc quãng đường, không lấy giá ma trận spa. Giữ ảnh minh họa có sẵn theo mã gói; bỏ quảng cáo thú y/video/bảo hiểm chưa triển khai trong thẻ chi tiết. Kiểm thử CSDL phục hồi và trình duyệt mã local + Cloud thật đạt; lỗi kết nối hiển thị lỗi, không đọc file dữ liệu dự phòng.
- [x] `070_customer_service_reviews.sql`: gửi theo từng dòng dịch vụ hoàn thành của chính khách, chờ duyệt; batch nguyên tử, gửi lại cùng mã không trùng, nội dung khác bị chặn. RPC đọc kèm phản hồi cửa hàng, không đọc cột đánh giá Cloud cũ hoặc ghi thành công giả vào localStorage. Đã thử rollback CSDL phục hồi và áp Cloud sau sao lưu `portal-bookings-cloud-2026-10-23T00-17-58-755Z`; public/Auth/17 nhân viên không đổi khi triển khai.
- [x] Chi tiết hiển thị các dòng/phần thêm, khoảng thời gian đầy đủ và thực thu sau hoàn; thông báo hủy khớp quy tắc 2 tiếng. Đăng ký Realtime chi tiết cho lịch/dòng/thu tiền/đánh giá, dọn khi rời trang và giữ nội dung nhận xét đang soạn. Kiểm tra trình duyệt mã local với Cloud thật đạt form, kiểm tra bắt buộc, lưu bền sau reload và nhận thay đổi duyệt/ghi chú trực tiếp; đã dọn dữ liệu thử.
- [x] `0a1cbc9a` và `0a196ba7` đã lên Vercel. `customer_service_reviews_cloud.cjs --deployed` đạt: hai dòng dịch vụ, lỗi bắt buộc, trạng thái chờ duyệt, tải lại không hiện form gửi trùng, nhận cập nhật duyệt/ghi chú qua Realtime và không mất nhận xét đang soạn. Đã xem ảnh form/kết quả cuối, dọn fixture/Auth; `customer_booking_cloud_read.cjs --cancel --deployed` hồi quy đạt. Phần chi tiết chuyên biệt phòng/chuyến/nhân viên và đối soát toàn phân hệ vẫn cần kiểm tra tiếp.
- [x] `071_customer_booking_logistics.sql` đã áp Cloud sau sao lưu `portal-bookings-cloud-2026-10-23T00-33-20-863Z`, không đổi dữ liệu public/Auth/17 nhân viên. RPC chỉ trả thông tin lưu trú/chuyến xe và tên nhân viên liên quan cho chủ lịch; không trả hồ sơ liên hệ nội bộ. CSDL phục hồi đã kiểm tra đúng giá chốt, đúng loại dịch vụ, chặn khách khác qua RPC và RLS; rollback toàn bộ dữ liệu thử. Không truy vấn Logs Explorer trong đợt này.
- [x] Trình duyệt mã local + Cloud thật đạt ba nhóm: spa ẩn khối lưu trú/xe, khách sạn hiện phòng/giờ/đơn giá/lưu ý, taxi hiện địa chỉ/km/lượt đi-về/giá chốt; tên phụ trách và nhân viên từng dòng lấy từ CSDL. Đã thử thay đổi ghi chú lưu trú/địa chỉ đón/phân công qua Realtime, bảo vệ chuỗi HTML trong địa chỉ, xem ảnh và dọn dữ liệu thử. Sửa tiền đã thu bằng 0 hiển thị `0 ₫`, thêm nhãn trạng thái giữ phòng và dùng UUID ca khi mở nhật ký. Hồi quy form đánh giá với Cloud thật đạt.

### Cấu hình loài phục vụ khởi tạo

Danh mục/chi tiết gói công khai: commit `7cde5929` đã lên Vercel; `public_services_cloud.cjs --deployed` đạt đối chiếu danh mục, loài từ CSDL, số đánh giá đã công bố, bỏ giảm hạng giả và giá gạch ngang, ảnh tải thành công và trạng thái lỗi khi RPC mất kết nối mà không gọi file dữ liệu. Lượt kiểm tra này không tạo fixture và không truy vấn Logs.

Nghiệm thu triển khai chi tiết phòng/chuyến/nhân viên: commit `bfa9a906` đã lên Vercel; `customer_booking_create_cloud.cjs --deployed` và `customer_service_reviews_cloud.cjs --deployed` đều đạt. Bao gồm hiển thị số tiền bằng 0, ba nhóm dịch vụ, phân công ca/từng dòng, cập nhật ghi chú lưu trú/địa chỉ đón qua Realtime và đánh giá sau hoàn thành. Đã dọn dữ liệu thử; không truy vấn hệ thống Logs trong quá trình kiểm tra.

| Dịch vụ | Loài hỗ trợ |
| --- | --- |
| SPA01, SPA02, SPA04, SPA05, SPA06, SPA12; HTL01, HTL02, HTL03, HTL05, HTL07 | Chó, mèo |
| SPA03, SPA07, SPA08, SPA11; HTL06 | Chó |
| SPA09; HTL04 | Mèo |
| SPA13 | Thỏ |
| SPA14; HTL08 | Thỏ, chuột hamster |
| TXI01 | Chó, mèo, thỏ, chuột hamster |

Dùng các loài cụ thể hiện có trong danh mục; không dùng “Khác” thay cho bọ ú hoặc loài chưa định danh. Tên/mô tả gói là căn cứ phân loại ban đầu; cấu hình nằm trong CSDL, không hardcode danh sách này trong form.

### Rà soát Hỗ trợ và phạm vi User còn lại (23/10/2026)

- Đã bỏ FAQ chính sách mẫu và hàm chat cũ không có nơi gọi khỏi `support-handler.js`. Không dựng thêm trang FAQ; khung chat hiện dùng `components/fab/fab.js` gọi `/api/admin-chat`, đã có nghiệm thu riêng tại tài liệu Chatbot.
- Bộ lọc “Đang giải quyết” bao gồm xử lý, chờ khách bổ sung, chờ duyệt và xử lý lại. Kiểm tra trình duyệt Cloud thật đạt cả ba trạng thái từng bị bỏ sót, cùng toàn bộ luồng phản ánh trước đó. Commit `9aa7a812` đã lên Vercel; `customer_support_cloud.cjs --deployed` đạt, dữ liệu thử đã dọn và không truy vấn Logs Cloud.
- Rà mã xác nhận các route User `settings`, `loyalty`, `wishlist` vẫn hoạt động và cần nghiệm thu riêng. Đã xác nhận cụ thể: Cài đặt xuất dữ liệu có nhánh dự phòng từ `pawpal_pets`/`pawpal_bookings`/`pawpal_orders`; Ưu đãi có hồ sơ và số điểm mẫu khi không đọc được phiên, cùng nhánh đồng bộ khách từ local Admin. Yêu thích có danh sách lưu trên trình duyệt, cần kiểm tra hành vi đăng nhập/đổi tài khoản. Không coi các phần này là hoàn tất Cloud, cũng không sửa gộp sang chúng trong đợt Hỗ trợ.

### Cài đặt phía khách (23/10/2026)

- Người dùng đồng ý ưu tiên đổi mật khẩu và xuất dữ liệu thật; tạm ẩn tạm khóa tài khoản, Google/Facebook, tiếng Anh và đổi đơn vị. Email/SMS ghi rõ giả lập, không lưu tùy chọn thành công giả.
- Đổi mật khẩu qua API Auth hiện có; nút lưu `type="button"`, chặn submit/reload. Không lưu mật khẩu vào danh sách tài khoản local.
- Xuất dữ liệu xác định chủ bằng Auth và `customer_profile_snapshot`, đọc các cột cho phép của hồ sơ thú cưng, lịch hẹn và danh sách đơn; phân trang 500 dòng, lỗi bất kỳ nguồn nào thì không tải tệp. Kiểm tra lại phiên trước khi tạo tệp, không dùng hồ sơ/đơn/lịch local dự phòng. Nội dung JSON tải về là bản xuất, không phải nguồn dữ liệu mock của ứng dụng.
- Phạm vi tệp gồm hồ sơ cá nhân, địa chỉ, thú cưng, lịch và danh sách đơn; không gồm nhật ký, tin nhắn, chi tiết giao dịch hoặc bản sao Auth. Không quảng cáo là sao lưu toàn bộ; các nguồn được đọc lần lượt theo trang, không phải snapshot giao dịch đồng thời.
- `customer_settings_cloud.cjs` đạt với mã đang sửa và Cloud thật: chèn dữ liệu local nhiễu không lọt vào tệp, API lỗi không có download, danh sách trống vẫn rỗng, mật khẩu sai bị từ chối, đổi đúng và đăng nhập Auth bằng mật khẩu mới thành công. Đã xem ảnh giao diện và dọn tài khoản/thú cưng thử. Không truy vấn Logs Cloud.
- Commit `3ce012ed` đã lên Vercel; `customer_settings_cloud.cjs --deployed` đạt toàn bộ các kiểm tra trên. Tài khoản và dữ liệu thử đã dọn sau lượt Production.

### Paw Points và ưu đãi phía khách (23/10/2026)

- `074_customer_loyalty.sql` đọc số dư từ toàn bộ sổ điểm, hạng thực tế từ `customer_membership`, danh mục đổi từ voucher đang hiệu lực và có `required_points > 0`. Không dựng khách/điểm/voucher mẫu, không đọc ví local, không tự suy ra điểm đổi, quyền lợi hoặc ngưỡng nâng hạng. Lịch sử điểm phân trang 10 dòng; ví phân biệt khả dụng và không khả dụng.
- `redeem_own_loyalty_voucher` kiểm tra Auth/chủ hồ sơ, khóa khách và voucher, đối chiếu phiên bản điều kiện đã xem, hiệu lực và số dư. Cấp `customer_voucher` và ghi ledger trừ điểm, số thứ tự cùng khóa chống lặp trong một giao dịch. Lỗi bất kỳ bước nào hoàn tác cả giao dịch; gửi lại cùng UUID không trừ thêm, nội dung khác bị chặn. Không tạo khoản thu, áp giảm giá hoặc nâng hạng.
- `max_usage` là giới hạn lượt sử dụng voucher; không biến thành số lượng quà còn lại giả. Máy chủ chặn đổi khi đã hết lượt sử dụng; việc áp mã sau đó vẫn theo luồng Bán hàng và điều kiện ở thời điểm đặt đơn.
- Đã bỏ đường ghi nhiều bước và các cột legacy `usage_count` trong API đổi điểm cũ; API tương thích chỉ gọi RPC bằng JWT của khách và yêu cầu UUID/phiên bản điều kiện. Không còn khóa tuần tự chỉ trong bộ nhớ máy chủ hoặc tự xóa ledger để giả lập rollback.
- Cửa sổ chi tiết và xác nhận được xem ảnh/kiểm tra lần lượt. Có đóng bằng nút, backdrop, Escape và dọn khi rời trang. Lỗi mạng giữ yêu cầu UUID trong sessionStorage theo khách/voucher; không lưu ví hoặc số dư ở đó. Sau ACK mới thông báo thành công và tải số dư/ví thật. Realtime điểm/ví/hạng tải lại snapshot, dọn channel khi rời trang.
- CSDL phục hồi đã đạt `customer_loyalty_v1.cjs`: chủ sở hữu, hoàn tác sau lỗi cố ý ở ledger, gửi lặp/xung đột, thiếu điểm, không tự đặt mức điểm và không tạo tiền. `test_customer_loyalty.cjs` cập nhật quy tắc chỉ dùng cấu hình.
- Đã áp migration sau sao lưu ngoài Git `portal-loyalty-cloud-2026-10-23T06-47-25-210Z`, đối chiếu toàn bộ dữ liệu public và danh tính/mật khẩu/trạng thái khóa Auth giữ nguyên, vẫn 17 nhân viên. Không thêm bảng/cột. Không truy vấn Logs Cloud.
- Nghiệm thu Vercel: commit `48559158` đã được phục vụ; `customer_loyalty_cloud.cjs --deployed` đạt đọc dữ liệu thật, loại dữ liệu local nhiễu, chi tiết và bốn cách đóng, rời trang, API lỗi không cấp/trừ, điều kiện thay đổi bị từ chối và phục hồi sau reload, đổi 100 → 60 điểm, gửi lại cùng yêu cầu qua RPC và API tương thích không trừ lặp, ví tồn tại sau reload. Hai yêu cầu đồng thời đổi 40 điểm khi còn 60 chỉ một thành công, số dư còn 20 và cập nhật qua Realtime. Đã dọn tài khoản, voucher và ledger thử có kiểm tra định danh fixture; giữ các sự kiện audit theo quy tắc bất biến. Không chỉnh số dư/hạng hoặc dữ liệu nguồn của khách đang có.

### Chi tiết sản phẩm, hạng thành viên và thông báo (23/10/2026)

- Rà tiếp header: bỏ dải khuyến mãi tĩnh `PAWFIRST10` khỏi template; chỉ dùng `get_public_site_notices`. Khi phản hồi rỗng, sai định dạng hoặc lỗi, gỡ dải cũ để không tiếp tục quảng cáo nội dung không xác minh được. Không chỉnh dữ liệu khuyến mãi trên Cloud.

- Migration `076_customer_public_details_notifications.sql` đã áp lên Cloud mới sau sao lưu `public-details-cloud-2026-10-23T07-35-03-098Z` ngoài Git. Đối chiếu public/Auth giữ nguyên; không thêm bảng/cột.
- Chi tiết sản phẩm đọc số sao và số đánh giá đã duyệt thật, lọc và phân trang 10 đánh giá. Nút đánh giá dẫn về đơn đã nhận; bỏ báo thành công giả, số liệu mẫu và cam kết giao/đổi trả không có cấu hình. Vận chuyển đọc danh mục đang khả dụng; nội dung từ CSDL được escape. Sửa phạm vi hàm cho nút yêu thích ở sản phẩm liên quan.
- API tài khoản đọc hạng đã gán, số dư điểm và chi tiêu từ view V1; không tự suy hạng theo ngưỡng cứng.
- Header đọc thông báo bằng RPC xác định chủ qua Auth, không dùng danh sách hoặc trạng thái đọc local. Chỉ cập nhật đã đọc sau máy chủ xác nhận; đọc tất cả theo mốc snapshot để không nuốt thông báo mới. Từ chối sai chủ; Realtime tải lại danh sách. Phạm vi này sửa đọc/đánh dấu, không bổ sung tự sinh thông báo cho mọi nghiệp vụ.
- Đạt 41 kiểm thử Auth/header, kiểm thử RPC trên CSDL phục hồi và trình duyệt dùng mã local với Cloud thật: đánh giá chưa duyệt bị ẩn, nội dung không chạy HTML, hạng đã gán không phụ thuộc chi tiêu, lỗi ghi không đổi trạng thái, riêng tư hai tài khoản, bốn cách đóng cửa sổ và Realtime. Đã xem ảnh từng màn hình và dọn dữ liệu/tài khoản thử. Không truy vấn Logs Cloud.
- Nghiệm thu Production: commit `30dbd7af` đã lên Vercel. `customer_public_details_cloud.cjs --deployed` đạt hạng thực tế, đánh giá công khai, quyền thông báo, lỗi ghi, bốn cách đóng và Realtime. Kiểm tra hồi quy `customer_wishlist_cloud.cjs --deployed`, `customer_settings_cloud.cjs --deployed`, `customer_loyalty_cloud.cjs --deployed` đều đạt; gồm yêu thích, đổi mật khẩu, xuất dữ liệu, đổi điểm không trừ lặp và ví/số dư sau reload. Các lệnh kết thúc thành công sau dọn dữ liệu thử; giữ sự kiện audit bất biến. Không truy vấn Logs Cloud.

### Yêu thích phía khách (23/10/2026)

- `075_customer_wishlist.sql` đọc và lưu đúng `wishlist_product`/`wishlist_service`, bỏ bảng legacy `wishlist_item`. Chủ danh sách lấy từ Auth; thao tác ghi đối chiếu thêm chủ đang hiển thị để chặn đổi tài khoản giữa chừng. Lưu/xóa dùng trạng thái mong muốn, gửi lại không đảo ngược trạng thái hoặc tạo trùng. Không thêm bảng/cột.
- Đã nối màn hình Yêu thích, nút ở chi tiết sản phẩm/dịch vụ, danh mục và trang chủ qua API Cloud. Không nhập ví yêu thích local vào tài khoản, không báo lưu thành công trước ACK. Danh sách thành viên không dùng dữ liệu local dự phòng; riêng danh sách khách vãng lai ở trang chủ vẫn là tiện ích trình duyệt riêng, không đồng bộ vào tài khoản.
- Hiển thị thời điểm đã lưu thật; mục đã ngừng hoạt động vẫn đọc được để gỡ. Giá không có nguồn thì hiển thị cần xem giá, không tự ghi 0đ. Sản phẩm chuyển tới trang chọn sản phẩm/phân loại thay vì tự chọn biến thể để thêm giỏ. Nội dung văn bản/thuộc tính ảnh được escape; bỏ số lượt thích mẫu ở chi tiết sản phẩm.
- Đã sửa đường dẫn tài nguyên tuyệt đối cho chi tiết dịch vụ và lỗi rời cổng tài khoản khi yêu cầu xác nhận Auth đang chạy: hủy yêu cầu do rời trang không xóa phiên đang dùng ở trang mới. Lỗi xác thực thực sự khi vẫn ở trang tiếp tục xử lý như cũ; quyền ghi luôn kiểm tra máy chủ.
- `customer_wishlist_v1.cjs` đạt trên CSDL phục hồi: chủ sở hữu, loại sản phẩm/dịch vụ độc lập, lưu/xóa lặp, mục không còn hoạt động, từ chối sai tài khoản và anon. 9 kiểm thử API/trang chủ đạt. Trình duyệt với mã local và Cloud thật đạt lưu từ hai trang chi tiết, lọc, lỗi ghi giữ mục, xóa/reload, đổi tài khoản và dữ liệu local nhiễu không lọt vào danh sách. Đã xem ảnh và dọn hai tài khoản/danh sách thử.
- Bản sao lưu ngoài Git trước migration: `portal-wishlist-cloud-2026-10-23T07-06-53-452Z`. Đối chiếu sau áp giữ nguyên public/Auth và 17 nhân viên. Không truy vấn Logs Cloud.
- Nghiệm thu Production: commit `422ae76b` đã lên Vercel; `customer_wishlist_cloud.cjs --deployed` đạt toàn luồng trên. Bổ sung thêm/xóa mục thử qua kết nối máy chủ riêng: giao diện nhận đúng 1 → 2 → 1 qua Realtime, không cần tải lại. Đã dọn hai tài khoản và toàn bộ danh sách/mục yêu thích thử; sản phẩm/dịch vụ nguồn chỉ được đọc, không sửa. Không truy vấn Logs Cloud.
