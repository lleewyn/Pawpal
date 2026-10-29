# G3.4 — Giữ kết quả tra cứu khi thiếu hướng dẫn

Ngày: 29/10/2026. Thay đổi local, chưa push hoặc triển khai Cloud.

## Hành vi

Với câu “Hướng dẫn xử lý đơn hàng: ORD-001”, trước đây chatbot có thể đọc được đơn nhưng chỉ trả thông báo thiếu FAQ. Nay chatbot giữ phần dữ liệu đã đọc trong quyền của nhân viên, ghi nguồn và thời điểm của dữ liệu đó, nói rõ chưa đủ nguồn để hướng dẫn cách xử lý và cho mở phân hệ Đơn hàng.

Nếu không có dữ liệu nghiệp vụ đi kèm, ví dụ câu hỏi cách đặt lịch chỉ tìm FAQ, chatbot không dựng dữ liệu. Khi không có FAQ sử dụng được, nó đưa đường mở Quy định để nhân viên tiếp tục kiểm tra.

Các liên kết chỉ lấy từ danh mục công cụ đã đăng ký và danh sách được giao diện chấp nhận. Không lấy URL từ nội dung câu hỏi hoặc FAQ. Đây là dữ liệu trả lời được một phần, không phải hướng dẫn nghiệp vụ đã được xác minh.

## Điều kiện và ngân sách

- Không gọi model khi không có câu trả lời FAQ sử dụng được.
- Giữ nguyên kiểm tra quyền từng nguồn; thiếu quyền hoặc lỗi nguồn vẫn báo lỗi, không chuyển lỗi thành câu trả lời thành công một phần.
- Tái sử dụng dữ liệu trong lượt hỏi hiện tại; không truy vấn lại đơn, mở rộng phạm vi hoặc thêm truy vấn để dựng đường dẫn.
- Nhánh dữ liệu và FAQ dùng 2 nguồn; có lịch sử riêng đã đọc thì tổng là 3 nguồn. Giữ nguyên các giới hạn đồng thời, thời gian và bytes đang áp dụng.
- Không thêm polling, Realtime, dịch vụ bên ngoài hoặc migration.

## Bổ sung khi bước soạn AI không sẵn sàng

Khi đã có dữ liệu nghiệp vụ hợp lệ nhưng generator báo chưa cấu hình, lỗi khả dụng của khóa/pool hoặc trả nội dung rỗng/sai dạng, chatbot trả phần dữ liệu đó với lời giải thích chưa tạo được nội dung AI. Không gắn nhãn bản nháp hoàn tất, không tự tạo hướng dẫn, không in lỗi kỹ thuật/khóa và không gọi lại model hoặc đọc lại nguồn.

Phạm vi trả về giữ bộ lọc, nguồn, thời điểm và các giới hạn dạng danh sách của dữ liệu đã tra cứu. Giao diện tiếp tục dùng liên kết phân hệ đã đăng ký. API lưu nội dung trả về một lần và nhả lease theo luồng hiện có.

Không áp dụng cho lỗi nguồn, thiếu quyền, yêu cầu AI bị từ chối, lỗi không xác định hoặc lỗi có mã nguồn/quyền đi kèm. Khi không có dữ liệu nghiệp vụ, lỗi AI vẫn được đưa lên bộ xử lý lỗi. Timeout tổng ở API và lỗi lưu lịch sử giữ hành vi báo lỗi; thay đổi này không bảo đảm mọi lỗi đều trả được dữ liệu.

Đồng thời sửa bộ lọc nhãn phản hồi: nếu model chỉ trả “Bản nháp AI” rồi “Phạm vi”, phần còn lại được coi là rỗng thay vì hiển thị một bản nháp không có nội dung.

## Kiểm chứng

- `chat_stage3_partial_guidance.test.cjs`: 4 nhóm đạt — giữ dữ liệu/nguồn/thời điểm khi FAQ thiếu hoặc rỗng; tổng 3 nguồn có lịch sử; liên kết Quy định khi không có dữ liệu nghiệp vụ; lỗi nguồn và thiếu quyền không trở thành kết quả thành công một phần.
- `chat_stage3_ai_availability.test.cjs`: 5 nhóm đạt — lỗi khả dụng AI chỉ trả dữ liệu đã tra cứu; bỏ bản nháp sai dạng; lỗi khác vẫn báo lỗi; giữ trần 3 nguồn có lịch sử; API lưu một lần/nhả lease và vẫn báo lỗi lưu.
- Tổng 81 kiểm tra offline chatbot/guest đạt, gồm các kiểm tra mới. Không dùng kết quả này để chứng nhận model thật hoặc database Cloud.
- 40 ca nghiệp vụ và hợp đồng API hồi quy đạt.
- `chat_read_contract_ui.cjs`: trình duyệt Chrome với API giả lập xác nhận hiển thị liên kết Đơn hàng và Quy định, cùng danh mục liên kết hiện có; URL tùy ý vẫn bị chặn. Không thử API Cloud hoặc tạo giao dịch thật.

G3.4 vẫn còn mở vì FAQ chính thức chưa được cập nhật/kiểm chứng, thiếu nguồn nhóm C và cần đánh giá thêm chất lượng model. Hai lượt Gemini đã chạy vẫn giữ kết luận PARTIAL; không gọi thêm Gemini trong thay đổi này.
