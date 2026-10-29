# G3.4 — Đánh giá ba lượt Gemini với FAQ mới

**Theo sau đợt này:** Người dùng đồng ý riêng1 lượt Hotel sau152, đã chạy và đạt trong mẫu. [Kết quả](../stage3-hotel-model-2026-10-29/README.md). Kết luận PARTIAL và phản hồi dưới đây vẫn là kết quả nguyên trạng của đợt3 lượt, không sửa hồi tố.

Ngày 29/10/2026. Người dùng đồng ý gửi đúng3 lượt tới Google Gemini sau khi xem phạm vi, đích gửi và gói FAQ. Đã thực hiện đủ3 lượt, không gọi thêm sau khi sửa FAQ Hotel.

Đích: `https://generativelanguage.googleapis.com`, model `gemini-2.5-flash`. [Gói đã duyệt](model-request.txt) có SHA-256 `c9ee67f8117e7995e1c55cba9f740509f4c510de75238941c5a239556c794007`, gồm FAQ đặt lịch150, FAQ Hotel cũ và3 FAQ Admin151 trong một mẫu kết hợp. Không có hồ sơ khách hàng, lịch sử hoặc bản ghi nghiệp vụ riêng. Khóa không được in/lưu vào bằng chứng. Không truy vấn database Cloud.

[Phản hồi nguyên bản và đánh giá](model-results.txt). Kết luận **PARTIAL**:

| Mẫu | Bám nguồn | Hữu ích và giới hạn |
|---|---|---|
| A — Đặt lịch | Đạt trong mẫu: phân biệt thành viên/vãng lai, giữ yêu cầu liên hệ/hồ sơ bé, không đánh đồng tiếp nhận với duyệt hoặc thanh toán. | Đạt trong mẫu; không chứng minh mọi cách hỏi hoặc luồng đặt lịch thực tế. |
| B — So sánh giá Hotel | Không bịa giá, sức chứa hoặc tiện ích. | Chưa đạt: vẫn lặp lời “có thể giúp so sánh”, không nêu rõ thiếu giá và không trả được phép so sánh. Không tính đây là mẫu trả lời hữu ích đã đạt. |
| C — Ba mảng Admin | Đạt trong mẫu: trình bày đúng nguồn nhân sự/lịch trực, bài viết/đánh giá, cấu hình/báo cáo và giới hạn quyền/chỉ đọc. | Đạt trong mẫu kết hợp. Phần tiếp tục xử lý cấu hình còn hạn chế vì nguồn không nêu bước chi tiết; không coi là đã kiểm chứng mọi quy trình vận hành. |

Đây là thử generator hiện có với gói FAQ đã chọn sẵn, không phải API end-to-end, bộ hiểu câu hỏi, RLS hoặc toàn bộ ma trận câu hỏi. Hai mẫu thật cũ ở hồ sơ ngày28/10 vẫn giữ nguyên; tổng cộng có5 lượt đã được đồng ý qua hai đợt, không phải5 mẫu đều đạt.

## Sửa sau đánh giá mẫu B

Đã chuẩn bị [migration152](../../../scripts/database/v1/152_chat_hotel_faq_missing_prices.sql) và [rollback](../../../scripts/database/v1/152_chat_hotel_faq_missing_prices.rollback.sql): FAQ nói rõ chưa có giá/sức chứa/tiện ích cụ thể nên chưa đủ để so sánh; cần đối chiếu bảng giá và thông tin phòng đang được cung cấp. Không thêm giá giả hoặc lời hứa có thể so sánh ngay.

Chỉ sửa đúng nội dung cũ đã đối chiếu, giữ trạng thái bật/tắt và metadata khác ngoài thời điểm cập nhật. FAQ thiếu/trùng/đã sửa độc lập thì dừng; chạy lại và rollback an toàn như150. [Bảy nhóm PostgreSQL local đạt](hotel-faq-results.txt), có hashes của hai tệp. Chưa gọi Gemini với FAQ152, nên không đổi mẫu B thành đạt hoặc kết luận chỉ sửa nguồn là đã sửa được mọi hành vi model.

Trong luồng tra giá Admin, câu hỏi giá Hotel vẫn đi qua `catalog.service_price` để đọc giá có quyền bằng SQL; không dựa vào mẫu FAQ-only này để suy ra giá. Đợt này không thay định tuyến giá hoặc tăng lượt đọc nguồn mỗi câu hỏi.

## Bảo vệ phạm vi duyệt và môi trường

Runner mới lưu fingerprint của generator và bộ lọc dữ liệu cùng gói gửi. Payload hoặc các tệp đó đổi thì dừng trước khi đọc khóa/gọi provider; bước chuẩn bị không được ghi đè gói đã có. Hai kiểm tra offline cho các chốt này đạt. Gói đã duyệt và phản hồi nguyên bản được giữ nguyên sau khi sửa FAQ152.

Hồi quy: **84 kiểm tra offline đạt**. Kiểm thử này chứng minh đường code và chốt duyệt, không chứng nhận chất lượng Gemini. Kết quả40 ca nghiệp vụ trước đó vẫn là mốc hồi quy gần nhất; không sửa mã nghiệp vụ trong đợt đánh giá này.

[Biên nhận dọn](local-environment.txt): database clone, hai container Auth/REST và tệp kết nối riêng đã dọn; database nguồn giữ nguyên. Không thêm dịch vụ, polling hoặc triển khai Cloud. Migration150–152 còn local; Gate2 và G3.4 vẫn mở. Phần còn lại của đánh giá là mẫu Hotel sau sửa nguồn và nghiệm thu môi trường triển khai; không tự gọi thêm lượt ngoài3 lượt được duyệt.
