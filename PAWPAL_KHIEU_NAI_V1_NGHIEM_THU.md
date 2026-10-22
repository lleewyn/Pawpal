# Khiếu nại V1 — nghiệm thu phạm vi Admin

Ngày 22/10/2026. Đã áp migration 039–042 lên Cloud mới, hoàn thiện giao diện Admin và kiểm tra với Cloud thật. Kiểm tra bản triển khai Vercel bằng complaints_v1_cloud_live.cjs. Không coi các trang phía khách hoặc phân hệ chưa chuyển là đã hoàn tất.

## Phạm vi hoàn thiện

- Giữ cấu trúc core và ba tab hiện có: theo dịch vụ, theo đơn hàng, hồ sơ xử lý. Không thêm file chạy giao diện riêng.
- Danh sách lấy dữ liệu V1 thật, đọc phân trang ổn định; số điện thoại từ customer_phone, giống loài từ pet_breed/pet_species, gói dịch vụ từ appointment_item, nhân sự và vận chuyển từ quan hệ tương ứng.
- Tạo phiếu, tin tiếp nhận và nhật ký trong cùng giao dịch. Chọn khách từ dữ liệu thật; khách chưa có hồ sơ cần tạo tại Khách hàng trước. Cho ghi nhận chưa xác minh giao dịch rồi liên kết đúng đơn/lịch của khách sau.
- Phân công bằng tìm kiếm nhân viên có quyền xử lý, còn hoạt động và có tài khoản sử dụng được. Máy chủ xác minh điều kiện nhận việc.
- Lưu nội dung trao đổi hoặc ghi chú nội bộ; ghi nhận yêu cầu bổ sung và chuyển sang chờ khách phản hồi. Nội dung tiếp nhận ban đầu được giữ nguyên.
- Giải thích/từ chối có lý do; đề xuất phương án, quản trị duyệt hoặc từ chối để sửa lại; liên kết kết quả thực hiện, đóng và mở lại có lịch sử.
- Màn hình duyệt hiển thị số tiền đề xuất; số tiền khách yêu cầu ban đầu được giữ riêng, không bị ghi đè bởi đề xuất của nhân viên.
- Đọc biên bản tiếp nhận, nhật ký dịch vụ và tệp đính kèm đã có; mở giao dịch gốc để thao tác tại Bán hàng/Dịch vụ.
- Lọc, xuất CSV theo đúng kết quả đang lọc, tối đa 10 dòng/trang, giữ hồ sơ khi tải lại và giao diện một cột trên màn hình hẹp.
- Realtime cho phiếu, tin nhắn, tệp, hoàn tiền, trả hàng, biên bản và nhật ký. Chặn kết quả tải cũ ghi đè lượt tải mới.

## Quy tắc kết quả đã được người dùng chốt

Phiếu Khiếu nại chỉ ghi đề xuất và quyết định. Thực hiện tiền/hàng/lịch qua luồng Bán hàng hoặc Dịch vụ đã có, sau đó liên kết kết quả:

| Phương án | Điều kiện hoàn tất tại máy chủ |
|---|---|
| Giải thích hoặc từ chối | Có lý do lưu vào lịch sử |
| Hoàn tiền | Được duyệt; giao dịch hoàn thành công, đúng khách và đơn/lịch, đủ số tiền; không dùng lại khoản hoàn đã liên kết phiếu khác |
| Trả hàng và hoàn tiền | Có khoản hoàn hợp lệ và yêu cầu trả hàng đã nhận thuộc cùng đơn |
| Đổi sản phẩm | Yêu cầu trả hàng đã nhận và đơn đổi mới của khách đã giao |
| Làm lại dịch vụ | Lịch mới tạo sau phiếu, đúng khách/bé cưng/dịch vụ và đã hoàn tất |
| Đổi kỹ thuật viên | Lịch đã hoàn tất với nhân viên khác thời điểm đề xuất; mã nhân viên gốc được giữ trong nhật ký máy chủ |

Duyệt không tạo dòng tiền, điểm, voucher, tồn kho hoặc lịch mới. Giao dịch hoàn thành công giữ bất biến; liên kết được lưu bằng sự kiện nhật ký đã kiểm tra, không sửa lại khoản hoàn.

## Bảo vệ thao tác

- Kiểm tra quyền, trạng thái tài khoản và danh tính qua auth.uid() cùng dữ liệu quyền V1; không tin danh tính/vai trò tự khai trong trình duyệt.
- UUID chống gửi lặp, khóa phiếu và kiểm tra phiên bản updated_at; trả lỗi khi có người khác thay đổi phiếu.
- Thu hồi quyền ghi phiếu/tin nhắn trực tiếp từ trình duyệt và chặn giả sự kiện COMPLAINT_*.
- Giữ tương thích RPC tạo phản ánh từ Dịch vụ; đã kiểm tra sau khi siết quyền.
- Không ghép phiếu RMA từ sessionStorage, không ghi đè trạng thái bằng localStorage, không tự mở lại vì điểm đánh giá thấp.
- Không dùng ghi chú đặt lịch làm biên bản hoặc nhật ký thực hiện; không khóa nhân viên trực tiếp từ phiếu.

## Kiểm tra và đối soát

Các kiểm thử ghi chỉ chạy trên database phục hồi tách biệt. Fixture tạo trong database thật, không thay dữ liệu giao diện bằng JSON hoặc mảng mẫu. Nhật ký bất biến được giữ; không chạy kiểm thử ghi trên Cloud.

- complaints_v1_read.cjs: đúng danh sách ID phiếu, khách và người phụ trách.
- complaints_v1_create.cjs: tạo từ trình duyệt, gửi đồng thời, xung đột nội dung, sai chủ giao dịch, anonymous và Escape.
- complaints_v1_workflow.cjs: phân công, phiên bản cũ, tin nhắn, yêu cầu bổ sung, modal giải quyết, đóng/mở lại, giả quyền/nhật ký, tải lại và màn hình hẹp.
- complaints_v1_refund.cjs: duyệt không tạo tiền; khoản hoàn chưa thực hiện bị từ chối; hoàn qua Thu ngân Dịch vụ rồi liên kết từ trình duyệt; khoản hoàn không bị sửa.
- complaints_v1_results.cjs: từ chối/sửa lại đề xuất; làm lại; đổi kỹ thuật viên; nhận hàng và giao đơn đổi mới; trả hàng kèm hoàn qua Thu ngân Bán hàng.
- complaints_v1_cloud_live.cjs: 25/25 phiếu Cloud, ba tab, CSV khi bộ lọc rỗng, modal phân công, giữ hồ sơ khi tải lại, Realtime, không gọi Cloud cũ/tunnel/JSON và không ghi nghiệp vụ.

Đã kiểm tra ảnh các modal tiếp nhận, phân công, yêu cầu bổ sung, phương án, liên kết kết quả và hồ sơ trên màn hình hẹp. Ảnh và báo cáo riêng ở thư mục infra ngoài repository.

## Triển khai Cloud

Project: cpzuvaplseielhgcnqrn. Migration 039–042 áp nguyên tử; hash toàn bộ dữ liệu public và danh tính/mật khẩu/trạng thái khóa Auth giữ nguyên. Vẫn 105 bảng, 906 cột, 160 khóa ngoại; 17 nhân viên nguồn, 16 tài khoản giữ khóa.

Backup đã xác minh: D:/Aboutme/Pawpal-infra/supabase-local/backups/complaints-cloud-2026-10-22T07-36-27-111Z. Không đưa dữ liệu fixture lên Cloud.

## Giới hạn đã làm rõ

- Chưa cấu hình hạn xử lý trong dữ liệu V1: hiển thị chưa cấu hình, không tự đặt thời hạn 2/4/24/48 giờ hoặc đếm quá hạn giả.
- Zalo/SMS/email là ghi nhận liên hệ bên ngoài; chưa tự gửi thông báo qua các nhà cung cấp này.
- Chưa phát triển nơi lưu file: không có nút tải ảnh giả. Tệp đã tồn tại có thể mở qua liên kết HTTPS.
- Chưa tự cấp điểm/voucher hay áp một chính sách bồi thường tiền mặc định.
- Lương, thưởng, hoa hồng và chấm công thực tế tiếp tục nằm ngoài scope.
