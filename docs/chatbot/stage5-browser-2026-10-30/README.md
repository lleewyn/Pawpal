# Kiểm tra web đang chạy cổng4000 — chưa đạt

Ngày30/10/2026, mở `http://localhost:4000/` bằng trình duyệt thật. Không dùng mock network hoặc chèn UI vào trang thử. Trang chủ, danh mục công khai và nút chat hiển thị. Client công khai đang kết nối Supabase Cloud.

## Tái hiện

1. Bấm Hỏi AI PawPal.
2. Nhập “Giá Pet Hotel” và nhấn Enter.
3. API `/api/admin-chat` có một lượt200, sau đó các lượt503. UI hiện “Chưa thể xử lý chat. Hãy thử lại hoặc yêu cầu chuyên viên.”; không có câu trả lời, bản nháp vẫn còn trong ô nhập.
4. Khi khung mở và có hội thoại, frontend tiếp tục đọc mỗi10 giây dù lỗi. Đã đóng khung để dừng polling, giữ nguyên bản nháp và hội thoại trên trình duyệt.

Ảnh thực tế: [chat-port4000-error.png](chat-port4000-error.png). Không kết luận toàn bộ guest/FAQ/model/Admin hoạt động chỉ từ các test local trước. Các ca FAQ, chuyển nhân viên và thành viên chưa được kiểm chứng trên bản này vì luồng cơ sở đang lỗi.

## Chẩn đoán có giới hạn

Probe chỉ đọc qua cấu hình backend local, chỉ gọi hai RPC đã biết; không đọc Cloud Logs hoặc dữ liệu khách:

| RPC | Kết quả |
| --- | --- |
| read_public_chat_rules | PGRST202 — không tìm thấy trong schema cache |
| read_public_chat_catalog với pet_hotel | PGRST202 — không tìm thấy trong schema cache |

HTTP503/UI lỗi và kết quả probe cho thấy mã mới chưa tương thích với RPC sẵn có tại backend đang dùng. Rules cần143, catalog cần156 và các phụ thuộc. Chưa kiểm tra toàn bộ migrations/grants/schema thực tế, nên không được chạy mù cả135–157 hoặc kết luận chỉ áp hai tệp là đủ.

## Việc đã/không thực hiện

- Đã mở đúng cổng4000 sau khi lần đầu nhầm3000;3000 không có server.
- Một lượt gửi qua UI cho câu giá xác định; không gọi Gemini hoặc thực hiện đặt hàng/đặt lịch/chuyển tin cho nhân viên.
- Đã đóng khung chat khi xong, giữ trang4000 mở. Không xóa hội thoại Cloud để tránh xóa audit/dữ liệu ngoài phạm vi.
- Clone local tạo trong bước chuẩn bị trước khi người dùng sửa cổng đã được dọn theo marker; xem local-environment.txt. Không dùng clone đó làm bằng chứng cho web4000.
- Không sửa cấu hình đích, áp migration Cloud, restart server4000 hoặc push.

## Bước cần trước khi thử lại

Đối chiếu API4000/migration/grants với định nghĩa backend thực tế trong phạm vi đọc có giới hạn, chốt diff và rollback cụ thể rồi triển khai trong phạm vi được cho phép. Sau đó thử lại cả giá, FAQ, no-match, quyền và chuyển nhân viên trực tiếp trên web. Lỗi retry10 giây sau503 cũng cần được xử lý theo backoff để tránh các lượt đọc thất bại lặp lại.
