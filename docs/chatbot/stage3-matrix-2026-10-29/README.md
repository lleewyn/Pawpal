# G3.4 — Ma trận 28 công cụ đọc nghiệp vụ

Ngày 29/10/2026. Ma trận offline gồm **118 nhóm kiểm tra đạt**; kết hợp bộ hồi quy hiện có là **203 kiểm tra đạt**. Bộ40 ca định tuyến/nghiệp vụ riêng cũng đạt. Không gọi Gemini, tạo database/container hoặc truy vấn Cloud trong đợt này.

Script: [chat_stage3_acceptance_matrix.test.cjs](../../../scripts/test/chat_stage3_acceptance_matrix.test.cjs). [Kết quả đầy đủ](offline-results.txt), [tóm tắt và fingerprint](verification.txt).

## Phạm vi

Kiểm tra đủ mọi công cụ đọc nghiệp vụ đã đăng ký, tự đối chiếu registry để không bỏ sót công cụ mới. Hai công cụ ngữ cảnh `history.context` và `conversation.context` nằm trong bộ kiểm tra riêng, không được tính thành công cụ nghiệp vụ của ma trận này.

| Nhóm | Công cụ |
|---|---|
| Lịch, tồn kho, hỗ trợ | appointment.list, appointment.search, inventory.low_stock, ticket.open, ticket.lookup, conversation.list |
| Khách và thú cưng | customer.lookup, customer.pets, pet.lookup, points.lookup |
| Đơn và tài chính | order.lookup, payment.order, order.refund_pending, revenue.summary |
| Danh mục và ưu đãi | catalog.product, catalog.service, catalog.service_price, catalog.price_rows, offer.list |
| Nhân sự | staff.lookup, staff.schedule |
| Nội dung và đánh giá | content.list, content.read, review.list, review.read |
| Vận hành và tri thức | report.operations, settings.read, knowledge.search |

Với từng công cụ kiểm tra:

- Hai cách diễn đạt, chủ yếu có dấu/không dấu, đi đúng công cụ và giữ cùng bộ lọc sau chuẩn hóa dấu. Đối với FAQ, vẫn giữ nguyên câu hỏi gửi nguồn; SQL tìm kiếm chuẩn hóa riêng.
- Dữ liệu hợp lệ hiển thị đúng dấu hiệu trong fixture, nguồn/thời điểm và chỉ đọc1 nguồn; không gọi model.
- Nguồn trả rỗng giữ tổng0/danh sách rỗng; không tự tạo dữ liệu.
- Bỏ từng quyền cơ sở bắt buộc đều bị chặn trước RPC. Quyền bổ sung theo bộ lọc có kiểm tra riêng trong các bộ trước; không coi kiểm tra quyền cơ sở là bao phủ hết quyền có điều kiện.
- Nguồn trả `42501` hoặc `57014` được đưa lên xử lý lỗi, không trả0 giả.

Ngoài ra kiểm tra thiếu mã/ngày sai không đọc nguồn; các trường số hỏng, phép tính thanh toán không nhất quán, bộ đếm sai và số sao ngoài miền bị từ chối. Số0 hợp lệ, số dư âm và chuỗi số từ SQL vẫn được xử lý đúng. API thật với nguồn giả lập xác nhận dữ liệu thanh toán hỏng trả lỗi, không lưu câu trả lời và vẫn nhả lease.

## Lỗi phát hiện và sửa

1. “Thanh toán đơn” thiếu mã bị định tuyến sang FAQ vì điều kiện nhận từ “đơn” kiểm tra chuỗi chưa chuẩn hóa dấu. Đã dùng chuỗi chuẩn hóa nhất quán; nay hỏi mã đơn trước RPC. Câu có mã vẫn đi `payment.order`.
2. Formatter nhóm mới dùng `Number(null)` có thể biến dữ liệu thiếu thành0, hoặc hiển thịNaN với dữ liệu khác. Đã kiểm tra kiểu/giá trị cho số tiền thanh toán và hoàn, số dư Pawpoint, số đếm vận hành, số sao, giá chi tiết; kiểm tra `net=collected-refunded`, số nguyên an toàn cho bộ đếm/số dư, số sao1–5. Không đổi phép tổng hợp SQL hoặc thêm truy vấn để xác minh.

Một fixture cũ của bài kiểm tra nhiều khách có Pawpoint chưa có trường số dư; đã bổ sung giá trị fixture hợp lệ để bài kiểm tra tiếp tục kiểm chứng tình huống trùng đối tượng. Không thêm dữ liệu giả vào runtime.

## Ngân sách và giới hạn

Không thêm RPC, nguồn đọc, polling, listener, migration hoặc dịch vụ. Dữ liệu sai dừng tại formatter; không tự đọc lại, tăng ngân sách hoặc gửi sang model. Giữ ngân sách3 nguồn/câu,2 đồng thời,32 KiB/nguồn,64 KiB/câu và các giới hạn SQL đang có.

Ma trận này dùng nguồn giả lập để kiểm tra định tuyến/quyền/điều phối/formatter và một ca handler API. Không phải chạy28 công cụ trên SQL thật, không bổ sung oracle database hoặc chứng nhận chịu tải/độ trễ Production. Các oracle SQL/Auth/REST và mẫu Gemini thật trước đó giữ nguyên phạm vi bằng chứng riêng.203 bài kiểm tra không đồng nghĩa203 câu hỏi thực tế độc lập hoặc tỷ lệ đúng trên mọi câu hỏi tiếng Việt.

G3.4 còn việc đối chiếu oracle/ma trận nghiệp vụ rộng hơn trên môi trường nghiệm thu và xác minh phiên bản triển khai. Gate2 vẫn mở, chưa push hoặc áp Cloud. Kết quả mẫu Hotel sau152 và FAQ đặt lịch/nhóm C trước đó vẫn được giữ nguyên, không gọi thêm model.
