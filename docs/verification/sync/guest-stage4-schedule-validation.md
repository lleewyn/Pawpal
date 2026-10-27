# Lỗi theo trường ở bước chọn lịch

Ngày 27/10/2026. Thay đổi local trong `pages/services/booking/booking.js`; dùng chung bước chọn lịch của guest và member. Không migration, Cloud query hoặc push/deploy trong đợt này.

Mỗi ô nhập/ghi chú liên kết thông báo bằng `aria-describedby`, có `aria-invalid`, sửa lại xóa lỗi của ô. Lưu/tiếp tục sai focus về ô lỗi đầu tiên. Chọn phòng hợp lệ xóa lỗi phòng. Chuyển taxi khứ hồi sang một chiều xóa giá trị, lỗi và yêu cầu bắt buộc của giờ về.

Trước báo giá, form chặn thời gian bắt đầu không hợp lệ/đã qua; trả phòng hoặc lượt về không sau giờ bắt đầu; phòng chưa chọn bằng ID; địa chỉ chỉ có khoảng trắng/quá 1.000 ký tự; quãng đường không dương hoặc sai bước 0,01; ghi chú vượt 4.000 ký tự. Payload hợp lệ vẫn chuyển giờ Việt Nam thành UTC và dùng Pet ID/Room ID như trước.

Frontend chỉ kiểm tra quan hệ giờ cơ bản. Máy chủ vẫn quyết định thời lượng lượt đi, giờ vận hành, chỗ/phòng/tồn và giá; giờ về sau giờ bắt đầu chưa bảo đảm đã sau khi hoàn thành lượt đi. Lỗi nghiệp vụ từ quote vẫn hiện tại thông báo chung, chưa có hợp đồng lỗi theo từng trường để gán chính xác. Không đoán trường từ câu lỗi.

## Kiểm thử đã chạy

- `node scripts/test/guest_booking_schedule_validation_ui.cjs`: Chrome với module thật và API quote fixture PASS. Các trường hợp sai nêu trên, ARIA/focus, sửa lỗi, chọn/sửa chữ phòng, taxi đổi một chiều và payload giờ Việt Nam đúng; bấm tiếp tục với dữ liệu sai tạo **0** lời gọi quote. Không gọi Cloud.
- `node scripts/test/user_booking_timezone_ui.cjs`: hồi quy module thật, transport offline PASS tại UTC, Los Angeles và Tokyo; spa/hotel/taxi và modal đổi lịch giữ cùng thời điểm UTC, hiển thị theo Việt Nam. Không coi là hồi quy member đăng nhập thật.
- `node --test scripts/test/booking_time.test.mjs scripts/test/guest_booking_pet_context.test.cjs`: 4 test PASS. Syntax booking.js PASS.

Thay đổi dùng thông báo và CSS lỗi sẵn có, không thêm request kiểm tra trường, polling, lưu PII hoặc cấu trúc CSDL. Chưa nghiệm thu lỗi quote/create/receipt trên giao dịch committed hoặc hai portal/Auth thật. Checklist chỉ đánh phần validation local có bằng chứng; mục lỗi tổng thể và gate GĐ-04/GĐ-05 còn mở.
