# Đặt lịch trước và chọn nhân viên yêu thích

Quy tắc đã được người dùng đồng ý ngày 09/11/2026. Áp dụng cho đặt lịch tắm và cắt tỉa của thành viên và khách vãng lai.

## Admin thiết lập

1. Vào **Nhân sự → Lịch làm việc → Lịch định kỳ**.
2. Chọn nhân viên, các ngày trong tuần, giờ bắt đầu và kết thúc, ngày bắt đầu áp dụng và ngày kết thúc nếu có. Lưu lịch định kỳ.
3. Khi lập lịch chính thức, dùng **Phân ca làm việc** để phân ca cụ thể theo ngày. Ca cụ thể được ưu tiên hơn lịch định kỳ; ngày nghỉ hoặc khoảng không khả dụng chặn nhận lịch.
4. Vào **Dịch vụ → Lịch hẹn → hồ sơ lịch hẹn** để xử lý yêu cầu. Sau khi phân ca cho đúng người khách chọn, bấm **Xác nhận đúng nhân viên yêu cầu**.

Lịch định kỳ không tự sinh hàng nghìn dòng phân ca và không tự xác nhận đơn. Admin không cần phân ca thủ công trước nhiều tuần. Hệ thống mở ngày đặt trong phạm vi 90 ngày, với mốc bắt đầu mỗi 30 phút và thời gian đặt trước hơn 2 tiếng.

## Ba trường hợp khách chọn nhân viên

- **Có ca cụ thể:** Chỉ hiển thị người đủ điều kiện và không bị trùng. Sau khi xác nhận đặt lịch, lưu nhân viên thực hiện và trạng thái **Đã xác nhận**.
- **Chỉ có lịch định kỳ:** Cho khách chọn nhân viên và giờ nằm trong lịch định kỳ. Hiển thị **Chờ xác nhận nhân viên**; lưu người khách yêu cầu, chưa gán người thực hiện chính thức.
- **Chưa có cả hai:** Vẫn cho chọn người đủ chuyên môn và gửi giờ đề nghị trong giờ mở cửa. Ghi rõ đây là yêu cầu, không cam kết giờ trống. Nếu nhân viên có lịch định kỳ áp dụng nhưng không làm vào ngày đó, hệ thống không coi đó là ngày chưa có lịch để mở yêu cầu tùy ý.

Thông tin ngày nghỉ, trạng thái nhân viên, khóa nhận dịch vụ, cấp độ chuyên môn, thời lượng, công suất tiếp nhận, lịch trùng và giữ chỗ đều được kiểm tra trên Supabase. Không thêm dữ liệu mẫu hoặc tự tạo ca làm việc.

## Giữ chỗ và trạng thái

Trước khi gửi, giữ lựa chọn trong 15 phút; với ngày chưa phân ca, màn hình ghi **Giữ yêu cầu**, không hứa đã bố trí nhân viên. Sau khi gửi thành công, yêu cầu trở thành lịch hẹn `pending`, giữ khoảng thời gian cho người khách chọn đến khi được xử lý hoặc hủy. Yêu cầu chờ xác nhận vẫn được tính khi chống trùng và kiểm tra công suất.

`appointment.requested_staff_id` là người khách yêu cầu. `appointment.staff_id` là người đã xác nhận nhận ca. Không dùng ghi chú làm nguồn liên kết nhân viên.

`staff_confirmation_status` có các giá trị:

- `not_required`: lịch cũ hoặc không áp dụng quy trình chọn nhân viên này.
- `pending`: chờ phân ca và xác nhận người khách chọn.
- `confirmed`: đã có ca cụ thể và xác nhận đúng nhân viên.
- `awaiting_customer`: Admin đã gửi đề xuất thay đổi, đang chờ khách đồng ý.

Lịch ngày và tuần của Nhân sự hiển thị cả yêu cầu chờ dưới tên nhân viên được yêu cầu, với nhãn phân biệt rõ. Không ghi người này là đã nhận ca khi chưa xác nhận. Hệ thống chặn xếp nghỉ, hủy hoặc thu ngắn ca nếu việc đó bỏ sót một lịch hẹn hoặc yêu cầu đang tồn tại.

## Đổi người hoặc giờ

Admin mở hồ sơ lịch hẹn, chọn **Nhân viên đề xuất**, **Giờ đề xuất**, nhập lý do rồi bấm **Gửi đề xuất cho khách**. Người đề xuất phải có ca cụ thể và không trùng việc.

Lịch hiện tại và yêu cầu ban đầu được giữ nguyên. Thành viên phản hồi trong chi tiết lịch hẹn; khách vãng lai phản hồi ở biên nhận hoặc trang tra cứu trên phiên đã đặt:

- **Đồng ý thay đổi:** Backend kiểm tra lại ca và xung đột, sau đó mới đổi người/giờ và xác nhận.
- **Giữ yêu cầu ban đầu:** Không đổi người/giờ, trả lại trạng thái trước đề xuất.

Không tự đổi sang người khác, không coi im lặng là đồng ý. Đề xuất đã thay đổi, lịch đã kết thúc hoặc người không còn trống thì không thể dùng phản hồi cũ để ghi đè. Chỉ chủ lịch hoặc phiên khách có quyền mới được phản hồi.

Đề xuất giờ khác chỉ xử lý khi giá và thời lượng gói vẫn khớp với hóa đơn đã lưu. Nếu bảng giá/thời lượng thay đổi, phải đối soát riêng; không tự đổi giá hoặc thu thêm tiền trong bước đồng ý đổi nhân viên.

## Lưu trữ và kiểm tra

- Migration: `scripts/database/v1/212_future_staff_booking.sql` (sau các migration 209–211).
- Lịch định kỳ: bảng `staff_recurring_schedule`, ghi qua RPC có kiểm tra quyền phân ca và phiên bản cập nhật.
- Xác nhận và phản hồi: ghi trực tiếp Supabase, có kiểm tra quyền sở hữu, chống xung đột và nhật ký thao tác.
- Kiểm tra CSDL: `node scripts/test/future_staff_booking_cloud.cjs`; mặc định rollback cả migration và fixture. Chỉ dùng `--apply` khi cần áp dụng migration; dữ liệu thử vẫn rollback.
- Không truy vấn Supabase Logs; không tự gửi SMS thật. Link thiết lập mật khẩu 48 giờ tiếp tục là giả lập như yêu cầu đã chốt.
- Không tự commit hoặc push.

## Testcase 8 — Phân bổ ngẫu nhiên và tiếp nhận

- Chọn ngẫu nhiên là một chế độ chọn giờ: chưa chọn người khi chưa có giờ. Khi chọn hoặc đổi giờ, chỉ phân bổ từ danh sách nhân viên hợp lệ của chính khung giờ đó; ưu tiên người đã được phân ca cụ thể. Backend kiểm tra lại điều kiện và xung đột khi giữ chỗ và xác nhận.
- Nếu ngày đặt trước chưa có ca cụ thể, giao diện vẫn ghi rõ chờ cửa hàng xác nhận; không chuyển thành lịch đã xác nhận chỉ vì bấm chọn ngẫu nhiên. Tên được phân bổ hiển thị trước khi khách xác nhận, sau đó dùng chung quy trình xác nhận/đề xuất thay đổi người đã chốt.
- Danh sách tiếp nhận kiểm tra cấp độ của tất cả dịch vụ còn hiệu lực, khóa chuyên môn, lịch nghỉ và xung đột người được gán ở cả lịch hẹn lẫn từng dịch vụ. Với lịch đã chốt nhân viên, đổi người đi qua quy trình đề xuất thay đổi.
- Một KTV trong danh sách có thể là kết quả hợp lệ nếu những người khác chưa có cấp độ hoặc không đủ điều kiện. Không tự nâng cấp nhân viên để lách kiểm tra. Nếu không còn người hợp lệ, hiển thị cấp độ cần có và khóa lưu tiếp nhận.
- Khi lưu bị từ chối do điều kiện KTV thay đổi, tự tải lại danh sách, xóa gợi ý cũ và giữ nguyên nội dung biên bản. Ô tìm KTV và nút lưu đồng bộ ngay với kết quả mới.
- Migration bổ sung: `214_intake_staff_eligibility.sql`. Kiểm tra: `booking_random_staff_ui.cjs`, `intake_staff_picker_ui.cjs`, `intake_staff_candidates_cloud.cjs` (dữ liệu thử rollback; thêm `--apply` để chỉ giữ migration).

## Testcase 9 — Giờ cũ trên màn hình đang mở

- Kiểm tra lại mốc cách hiện tại **hơn 2 tiếng** ngay khi bấm khung giờ và khi chọn nhân viên sau đó. Giờ đã qua, còn một phút, dưới hoặc đúng hai tiếng đều không được giữ chỗ.
- Hiển thị chính xác `Thời gian không hợp lệ`, xóa giờ/nhân viên/giữ chỗ/báo giá cũ, khóa tiếp tục và tự gọi lại bảng giờ của ngày đang xem. Danh sách trả về được lọc lại theo thời gian hiện tại.
- Nếu máy chủ từ chối vì thời gian hết hạn khi giữ chỗ, xem giá hoặc xác nhận, xử lý giống nhau cho thành viên và khách vãng lai; không chỉ dựa vào lần lọc lúc mở trang.
- Kiểm tra bằng đồng hồ giả lập trong `member_booking_hold_ui.cjs --expired` và `--guest --expired`; không cần chờ thực tế hay tạo lịch thật.

## Testcase 12 — Tự hết hạn giữ chỗ 15 phút

- Lease có `expires_at` theo đồng hồ CSDL, không được gia hạn ngầm khi tải lại danh sách. Đồng hồ đếm ngược hiển thị từ phản hồi giữ chỗ cho cả thành viên và khách vãng lai.
- Tại mốc hết hạn, truy vấn giờ trống lập tức bỏ qua lease cũ; khách khác có thể giữ chỗ mà không phụ thuộc trình duyệt người giữ hay cron. Cron `pawpal-expire-booking-holds` chạy mỗi phút để xóa bản ghi hết hạn khỏi bảng riêng. Không xóa lease còn hiệu lực hoặc lịch hẹn đã xác nhận.
- Trang đặt lịch kiểm tra lại bảng giờ mỗi 15 giây khi đang ở bước chọn giờ, trang đang hiển thị và chưa có lựa chọn/lease. Không thay thế lựa chọn người dùng đang thao tác. Khi lease của chính người dùng hết hạn, khóa xác nhận, xóa lựa chọn/báo giá cũ và tự tải lại bảng giờ; không tự giữ tiếp.
- Lịch ngày/tuần của Admin hiển thị trạng thái `Đang giữ chỗ` và giờ hết hạn, riêng với lịch đã xác nhận; polling 15 giây tự cập nhật và loại bỏ giữ chỗ hết hạn. RPC chỉ trả thời gian, mã lease và KTV; không trả thông tin khách. Quyền đọc theo phân quyền lịch làm việc, nhân viên thường chỉ thấy giữ chỗ của chính mình.
- Độ trễ hiển thị ở các màn hình khác tối đa khoảng 15 giây khi có kết nối; dọn bản ghi tối đa khoảng một phút sau hết hạn. Không yêu cầu người dùng/Admin thao tác hoặc F5.
- Migration: `215_booking_hold_expiry.sql` (bật `pg_cron`, tạo tác vụ dọn và RPC đọc giữ chỗ cho lịch Admin). Kiểm tra CSDL: `booking_hold_expiry_cloud.cjs`; hai phiên và đồng hồ giả lập: `booking_hold_live_expiry_ui.cjs` với/không `--guest`; lịch Admin: `staff_calendar_appointments_ui.cjs`. Không tạo lịch thật trong kiểm tra.
- Bổ sung sau phản hồi không thấy đồng hồ: mặc định phân bổ tự động nên **chỉ bấm ô giờ** cũng tạo lease; trước đây nhánh này còn chờ bấm KTV mới bắt đầu giữ chỗ. Đồng hồ nằm ngay dưới bảng giờ ở Bước 3 và chuyển lên phần đầu khi sang Bước 4. Chỉ hiện đếm ngược sau khi API xác nhận; lỗi giữ chỗ hiển thị cạnh bảng giờ và có thể thử lại. Bấm lại đúng giờ/KTV đang giữ không khởi động lại 15 phút. Tệp giao diện được đổi phiên bản `2.5` để trình duyệt nhận bản sửa.

## Testcase 14 — Số điện thoại liên hệ riêng cho lịch hẹn

- Thành viên có ô `Số điện thoại liên hệ` ở Bước 1, mặc định điền số tài khoản, được sửa thành số người thân/người đưa bé đi. Giá trị chỉ nằm trong bản đặt lịch hiện tại; cập nhật hồ sơ chủ nuôi vẫn là thao tác riêng.
- SĐT được kiểm tra ở giao diện và CSDL, lưu vào `appointment.booking_contact_phone`. Không cập nhật `customer_phone`, không tạo/chuyển tài khoản và không dùng SĐT liên hệ để xác định chủ lịch; quyền sở hữu vẫn dựa trên khách hàng của phiên đăng nhập.
- Số liên hệ theo lịch xuất hiện ở bước xác nhận, biên nhận, chi tiết lịch của thành viên và Admin. Admin tìm kiếm/xuất danh sách theo số liên hệ này. Số tài khoản tiếp tục là thông tin định danh khách trong hồ sơ khách hàng.
- Lời gọi cũ không truyền SĐT vẫn chốt số tài khoản làm số liên hệ khi tạo lịch mới. Lịch cũ không có snapshot giữ cách hiển thị cũ; không tự ghi đè dữ liệu lịch sử hoặc số đăng nhập.
- Migration: `216_booking_contact_phone.sql`. Kiểm tra CSDL `booking_contact_phone_cloud.cjs` (fixture rollback), giao diện `member_booking_hold_ui.cjs --contact` với hai kích thước 1280 và 390px. Kiểm tra gồm số khác tài khoản, số không hợp lệ, giữ nguyên tài khoản, gửi lại không tạo trùng, quyền sở hữu và đọc/tìm kiếm/xuất phía Admin.
