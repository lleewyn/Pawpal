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

Phân hệ khách đang thực hiện; chưa nghiệm thu toàn bộ đặt mới, đổi/hủy lịch và đánh giá. Các mục Admin bên dưới là phạm vi riêng.

- [x] Migration `065_customer_booking_summary.sql`: chỉ trả tổng tiền chuẩn, thực thu sau hoàn thành công và các dòng đã đánh giá của chính khách đang đăng nhập; từ chối phiên không phải khách. Đã thử trên CSDL phục hồi và rollback.
- [x] Đã áp Cloud mới sau sao lưu `portal-bookings-cloud-2026-10-22T17-39-10-301Z`; đối soát dữ liệu public, Auth và 17 nhân viên không đổi.
- [x] Đọc lịch theo V1, không dùng cột đánh giá cũ; phân biệt thu một phần với thanh toán đủ. Không tự hoàn thành hoặc tiếp nhận lịch dựa vào thời gian trên trình duyệt.
- [x] Không gộp các lịch riêng chỉ vì cùng thú cưng/dịch vụ/giờ. Trình duyệt dùng mã local với Cloud thật đã xác nhận hai lịch thử hiển thị đủ hai thẻ, đúng tổng tiền, không ghi thu tiền; đã dọn fixture và xem ảnh.
- [x] Bộ kiểm thử đọc lịch, đăng ký Realtime và hồi quy giỏ hàng: 27/27 đạt.
- [ ] Chuyển form đặt mới và danh mục/bảng giá sang giao dịch máy chủ, bỏ JSON/cache nghiệp vụ cũ.
- [ ] Chuyển đổi/hủy lịch sang RPC có quyền chủ sở hữu, phiên bản và kiểm tra lịch/phòng/xe/thu tiền; nghiệm thu từng modal.
- [ ] Hoàn thiện chi tiết ca, đánh giá dịch vụ và Realtime; kiểm tra lại toàn luồng trên Vercel.
