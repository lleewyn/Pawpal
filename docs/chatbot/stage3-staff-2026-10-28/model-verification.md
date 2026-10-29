# Kết quả hai lượt Gemini đã được đồng ý

**Đợt tiếp theo ngày29/10:** Đã chạy đúng3 lượt mới được đồng ý với FAQ150–151, đặt lịch và nhóm C đạt trong mẫu; Hotel vẫn chưa hữu ích. Đã sửa nguồn Hotel bằng152 và kiểm chứng SQL local, chưa gọi lại model. Đánh giá mới vẫn PARTIAL. [Phản hồi và giới hạn đợt mới](../stage3-model-review-2026-10-29/README.md). Phần dưới là kết quả hai lượt cũ, không bị thay thế hoặc sửa hồi tố.

Đã chạy **đúng2 lần sinh** bằng `gemini-2.5-flash` với payload có SHA-256 `0e618a6f5e952b52b76b6e46508b02a6567c12c4c7bf1de6313a1ccf5611aa67`. Người dùng đã đồng ý sau khi được giải thích payload và đích Google Gemini. Khóa không được in/lưu vào bằng chứng; không gửi hồ sơ khách hàng hoặc lịch sử, không truy vấn database Cloud.

Nguồn/đáp án gốc và đánh giá nằm trong [model-results.txt](model-results.txt). Gói gửi vẫn giữ nguyên tại [model-request.txt](model-request.txt).

| Mẫu | Kết quả bám nguồn | Mức hữu ích và giới hạn |
|---|---|---|
| A — Cách đặt lịch | Bám các bước trong FAQ, chỉ nhắc thành viên cần đăng nhập; không tự nói mọi khách đều phải đăng nhập. | Đạt trên mẫu đã duyệt. Chưa chứng minh FAQ đúng với luồng guest hiện hành hoặc chatbot trả đúng mọi câu về guest. |
| B — Giá Hotel thường/VIP | Không bịa mức giá, sức chứa hoặc tiện ích. | Cần cải thiện: lặp lời giới thiệu “có thể giúp so sánh”, chưa so sánh thực tế và chưa nói rõ FAQ thiếu giá. Không tính mẫu này đạt về khả năng trả lời hữu ích. |
| C — Quy trình nhóm nhân sự/nội dung/cấu hình | Không có FAQ phù hợp trong truy vấn local đã giới hạn. | Không gọi model, không giả nguồn để đủ ba nhóm. |

**Kết luận mẫu: PARTIAL**, không chứng nhận hoàn thành G3.4, toàn ma trận câu hỏi hoặc chất lượng Production. Đây là kiểm tra generator thật bằng đúng gói FAQ được duyệt, không phải thử API đầy đủ hoặc cấu hình Cloud.

## Đối chiếu định tuyến Admin

- Câu hỏi giá Hotel trong mẫu đi qua `catalog.service_price` ở luồng Admin: lấy bảng giá có quyền bằng SQL, không dùng model để suy ra giá từ FAQ. Vì vậy lỗi thiếu hữu ích của generator chỉ với FAQ không đồng nghĩa luồng tra giá Admin cũng chỉ trả FAQ.
- Phát hiện câu “Đặt lịch PawPal như thế nào?” bị nhận nhầm thành yêu cầu ghi và từ chối. Đã sửa để các câu hỏi “như thế nào/làm sao” về thao tác trở thành hướng dẫn chỉ đọc. Lệnh yêu cầu đặt lịch/hoàn tiền/xóa thật vẫn bị từ chối.
- Thêm `chat_stage3_model_routing.test.cjs`: kiểm tra câu hỏi hướng dẫn, lệnh ghi, định tuyến giá Hotel, quyền FAQ và không gọi model khi thiếu nguồn. Tổng49 test offline đạt; 40 ca nghiệp vụ và các kiểm tra hợp đồng API hồi quy đạt.
- Không gọi thêm Gemini sau sửa định tuyến. Không thay system instruction hoặc nội dung FAQ trong đợt này.

## Tiếp tục ngày 29/10/2026

Đã đối chiếu mã nguồn guest/member, soạn FAQ đề xuất và bổ sung chỉ dẫn nêu rõ phần thiếu thông tin. Hướng dẫn từ FAQ rỗng bị chặn trước model. 56 kiểm tra chatbot và 16 kiểm tra guest offline đạt, cùng 40 ca nghiệp vụ hồi quy. Không gọi thêm model; kết luận hai mẫu thật ở trên vẫn PARTIAL. FAQ Cloud chưa cập nhật. [Phạm vi, bằng chứng và giới hạn](faq-audience-review-2026-10-29.md).

## Còn phải làm

**FAQ đã hoàn tất local:** Migration150 sửa đặt lịch,151 bổ sung3 FAQ nhóm C tách riêng cho Admin. Đạt7 nhóm SQL/Auth/JWT/REST tích hợp;82 kiểm tra offline và40 ca nghiệp vụ hồi quy đạt. Không dùng kết quả này thay đánh giá model thật. [Bằng chứng](../stage3-faq-internal-2026-10-29/README.md).

Đã bổ sung [giữ dữ liệu tra cứu khi thiếu FAQ](partial-guidance-2026-10-29.md), không gọi model hoặc đọc lại nguồn. Kết quả này chỉ chứng minh nhánh trả lời xác định, không thay đổi kết luận đánh giá Gemini.

1. Đã đối chiếu mã nguồn thành viên/vãng lai và kiểm chứng migration FAQ trên local; còn triển khai/kiểm chứng phiên bản đang phục vụ.
2. Đã bổ sung chỉ dẫn nêu rõ phần thiếu chi tiết; còn đánh giá chất lượng model thực tế sau thay đổi. Với Admin giữ đường facts đang có.
3. FAQ nhóm C đã có và được kiểm chứng quyền/nguồn trên local; còn đánh giá model với nguồn mới và mở rộng bộ đánh giá, không dùng hai mẫu cũ làm bằng chứng bao phủ mọi phân hệ.

Lần từ chối tự động trước đó đã được giải quyết bằng sự đồng ý rõ của người dùng. Không còn chờ duyệt cho hai lượt đã chạy; không tự coi đó là quyền gọi thêm lượt khác. Thay payload hoặc mở rộng kiểm tra bên ngoài cần phạm vi được đồng ý tương ứng.
