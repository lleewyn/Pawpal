# Danh mục năng lực ưu tiên cho ba nhóm

**Xác nhận người dùng ngày 28/10/2026: tất cả nhóm nghiệp vụ Admin đều cần được hỗ trợ.** Toàn bộ A01–A19 là phạm vi bắt buộc, không loại nhóm có số thứ tự lớn hơn. Các số dưới đây chỉ là thứ tự kỹ thuật đề xuất theo độ sẵn sàng và phụ thuộc nguồn, không phải mức quan trọng của nhu cầu. Chưa có thống kê tần suất; việc chưa có thống kê không còn là lý do chờ chốt phạm vi.

“Có” nghĩa là thấy đường code/công cụ, không phải nghiệm thu end-to-end. Mọi năng lực phải giữ quyền thực tế của caller. Bộ câu hỏi tại `question-set.md` là đầu vào kiểm thử, không phải dữ liệu trả lời mẫu. Mỗi câu chỉ truy vấn nguồn cần thiết trong ngân sách; phạm vi bao quát không đồng nghĩa preload toàn bộ phân hệ hoặc tăng trần công cụ.

## Admin

Nền quyền chung: staff active, phiên hợp lệ, history.read; gửi câu hỏi mới cần history.write. Chi tiết bảng/quyền hiện có xem `routes-permissions.md`.

| ID | Thứ tự kỹ thuật | Năng lực và phạm vi bắt buộc | Nguồn/quyền | Hiện trạng và bước tiếp tục |
|---|---|---|---|---|
| A01 | 1 | Lịch theo ngày/nhóm/trạng thái; đếm distinct lịch | appointment/item/service/category.read | Có facts; tuần/tháng/buổi/chưa phân KTV chưa đầy đủ; mở Lịch với bộ lọc được hỗ trợ |
| A02 | 1 | Đơn theo mã, trạng thái, giao nhận | sales_order.read | Có facts mã; điều kiện đối soát nhiều trạng thái cần công cụ mới; mở Đơn |
| A03 | 1 | Khách theo tên/mã/SĐT | customer/profile/phone.read | Có facts, tối đa 10; cần chọn khi nhiều kết quả |
| A04 | 1 | Hồ sơ thú cưng, dị ứng, lịch sử chủ nuôi | pet_profile và nguồn lịch/khách; quyền đọc tương ứng cần đối chiếu khi thiết kế | Live có context, chưa có công cụ hội thoại riêng bao phủ; mở hồ sơ có quyền |
| A05 | 1 | Khiếu nại chưa kết thúc theo kỳ | support_ticket.read | Có facts tổng/20 dòng; priority, quá SLA, người xử lý cần bổ sung đúng nguồn |
| A06 | 1 | Tóm tắt ca và soạn phản hồi | chat_conversation/message.read; FAQ nếu dùng | Có công cụ, tối đa 12 tin; thiếu ca phải yêu cầu chọn |
| A07 | 1 | SKU tồn dưới ngưỡng | inventory/product_variant/product.read | Có facts tổng/20 dòng; so sánh bằng/trên ngưỡng chưa hỗ trợ |
| A08 | 1 | Sản phẩm, biến thể và giá bán | product/product_variant.read | Có facts, giá vốn ngoài phạm vi mặc định; chọn đúng SKU |
| A09 | 1 | Giá Spa/Hotel/Taxi và điều kiện | service/category và bảng giá theo nhóm | Có extended facts; ước tính cho một bé/chuyến cần thêm tham số/logic giá được kiểm chứng |
| A10 | 1 | Thực thu theo ngày | payment/refund_transaction.read | Có extended facts: thu thành công trừ hoàn thành công theo thời điểm; tuần/tháng/so sánh cần mở rộng |
| A11 | 1 | Hướng dẫn chính sách, tra tri thức | chatbot_knowledge_faq.read | Có search/guide; không có hướng dẫn phải nói rõ và dẫn quy trình |
| A12 | 2 | Điểm/hạng/lịch sử biến động | customer_point_balance/membership và giao dịch điểm; quyền theo nguồn thực tế | Live có số dư/hạng, chưa có công cụ hỏi rộng; chỉ đọc, không tự cộng |
| A13 | 2 | Đơn hủy đã thu chưa hoàn; COD chưa đối soát | sales_order/payment/refund và nguồn giao nhận/đối soát cần xác minh | Mới; định nghĩa khoản chưa hoàn và join chứng từ trước triển khai |
| A14 | 2 | Khách → bé → lịch → ca → khiếu nại | Các nguồn đọc A01/A03/A04/A05 | Mới; xác minh từng quan hệ và quyền từng nguồn, kết quả thiếu nguồn phải nêu rõ |
| A15 | 2 | Lịch trực, chưa phân công, ca chồng giờ | staff/schedule và appointment/phân công; cần mapping schema | Mới trong chatbot; không suy quyền từ job title; mở Nhân sự/Lịch |
| A16 | 2 | Công suất Hotel, chuồng/phòng và lượt lưu trú | hotel resource/booking theo schema thật | Mới; không trả số chỗ nếu chưa có nguồn công suất chuẩn |
| A17 | 2 | Việc cần xử lý, chờ nhân viên, quá hạn | chat_conversation/support_ticket/appointment theo quyền và SLA thật | Mới dưới dạng công cụ tổng hợp; không dùng mức ưu tiên AI tự gán |
| A18 | 3 | So sánh kỳ, sản phẩm bán nhiều/tồn thiếu | orders/items/inventory/payment/refund, quyền từng nguồn | Mới; chốt kỳ, công thức, status, tránh quét lịch sử vô hạn |
| A19 | 3 | Đánh giá/nội dung, thống kê và trạng thái duyệt | review/nội dung theo schema và quyền thực tế | Mới trong chatbot; chỉ đọc, duyệt tại màn hình nghiệp vụ |

## Khách vãng lai

Nguồn chỉ là thông tin đã công bố hoặc giao dịch đã có bằng chứng truy cập server. Không gọi các facts Admin dưới service role để phục vụ khách.

| ID | Ưu tiên | Năng lực | Nguồn/điều kiện | Hiện trạng và bước tiếp tục |
|---|---|---|---|---|
| G01 | 1 | Giờ/địa chỉ/liên hệ, chuẩn bị, chính sách | FAQ hoặc cấu hình đã công bố | Có FAQ tổng quát; chưa tìm liên quan có trần bytes; thông tin thiếu chuyển nhân viên |
| G02 | 1 | Chọn dịch vụ và giá có điều kiện | Catalog/bảng giá công khai; cân nặng/nhóm bé/gói | Chưa có công cụ giá khách riêng; không suy giá từ FAQ cũ |
| G03 | 1 | Sản phẩm/biến thể/giá/còn hàng công khai | Public catalog/in-stock signal hiện hành | Chưa có công cụ riêng; không trả giá vốn/tồn chính xác nội bộ |
| G04 | 1 | Hướng dẫn đặt/mua, giao nhận/đổi trả | Chính sách và màn hình thực hiện thật | Có FAQ, chưa kiểm thử deep link giữ lựa chọn; không nói đã tạo giao dịch |
| G05 | 1 | Yêu cầu nhân viên, xem hội thoại/đánh giá | Guest token hash và ownership conversation | Có gateway; giữ danh tính phiên, không lộ ghi chú riêng |
| G06 | 2 | Theo dõi đơn/lịch/yêu cầu guest của mình | Cần session hoặc bằng chứng server gắn đúng giao dịch | Chưa xác minh cơ chế trong chatbot; hiện chuyển người/luồng xác minh hợp lệ |

## Thành viên

Kế thừa G01–G05 và thêm các mục dưới. JWT hợp lệ chỉ xác định tài khoản; từng truy vấn phải ràng buộc chủ sở hữu ở server/DB.

| ID | Ưu tiên | Năng lực | Nguồn/điều kiện | Hiện trạng và bước tiếp tục |
|---|---|---|---|---|
| M01 | 1 | Đơn, thanh toán, giao nhận của mình | Customer từ auth_user_id và quan hệ sales_order/giao dịch | Chưa có công cụ chatbot; chọn mã khi có nhiều đơn; không nhận owner từ request |
| M02 | 1 | Lịch hẹn/ca dịch vụ của mình | Customer và appointment/item/pet đúng quan hệ | Chưa có công cụ; không lộ ghi chú/phân công nội bộ ngoài dữ liệu công khai |
| M03 | 1 | Bé của mình, tư vấn dựa trên hồ sơ | Customer/pet_profile; chỉ trường cần và được phép | Chưa có công cụ; chọn đúng bé, không chẩn đoán từ hồ sơ |
| M04 | 2 | Pawpoint/hạng/ưu đãi của mình | balance/membership/voucher theo quyền và thời hạn thật | Chưa có công cụ; số dư dùng dữ liệu mới, không hứa phát ưu đãi |
| M05 | 2 | Khiếu nại/đổi trả/hoàn tiền/đánh giá của mình | Customer và ticket/return/refund/review theo quan hệ thật | Chưa có công cụ; chỉ trạng thái/bước tiếp theo cho khách |
| M06 | 2 | Giao dịch guest sau đăng nhập | Luồng liên kết đã xác minh, không ghép theo SĐT/email | Chưa xác minh; không tự mở rộng quyền khi đổi danh tính |

## Quy tắc nguồn và phép tính

- Kết quả chi tiết: đúng đối tượng và revision/thời điểm; nhiều đối tượng thì chọn trước.
- Tổng hợp: đếm trên toàn phạm vi đã lọc; danh sách giới hạn không thay tổng. Appointment nhiều item chỉ đếm một lịch.
- Tồn thấp: chỉ SKU đang bán, stock nhỏ hơn minimum; điều kiện bằng không thuộc kết quả hiện tại.
- Thực thu: payment thành công theo succeeded_at trừ refund thành công theo completed_at; không gọi tổng giá trị đơn là thực thu.
- Ngoài năng lực/quyền/nguồn: hỏi rõ hoặc cung cấp đường tiếp tục; không chạy truy vấn rộng để cố trả lời.
