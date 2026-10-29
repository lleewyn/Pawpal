# G3.4 — Hotel sau sửa FAQ152

Ngày 29/10/2026. Người dùng đồng ý riêng **đúng1 lượt** tới Google Gemini, sau khi ba lượt đợt trước đã kết thúc. Đã chạy đúng1 lượt, không tự thử lại.

[Gói gửi](model-request.txt) có SHA-256 `34d9717e90969a44f575b56679b7a8b54e0a48698f276ea3162196999b7755ba`; model `gemini-2.5-flash`, đích `https://generativelanguage.googleapis.com`. Gói chỉ có câu hỏi Hotel và FAQ152 lấy từ clone local đã áp migration, không có hồ sơ khách hàng hoặc lịch sử. Không đọc database Cloud; khóa không được in hoặc lưu vào bằng chứng.

## Kết quả

[Phản hồi nguyên bản và đánh giá](model-results.txt): **PASS_SAMPLE**.

Model nêu đúng ba phần chưa có trong FAQ: giá cụ thể, sức chứa và tiện ích của phòng thường/VIP. Model nói chưa đủ để so sánh hoặc tính chênh lệch, yêu cầu đối chiếu bảng giá và thông tin phòng đang được cung cấp trong danh mục Pet Hotel. Không bịa số hoặc thay câu trả lời bằng lời hứa “có thể giúp so sánh”.

| Tiêu chí | Kết quả |
|---|---|
| Bám nguồn FAQ152 | Đạt trên mẫu này |
| Nêu rõ thông tin thiếu | Đạt trên mẫu này |
| Không suy ra giá/chênh lệch/tiện ích | Đạt trên mẫu này |
| Chỉ ra cách kiểm tra tiếp | Đạt trên mẫu này |

Đây là câu trả lời phù hợp khi nguồn thiếu dữ liệu, không phải báo giá hoặc bằng chứng đã thực sự đọc danh mục phòng. Không kiểm chứng mọi cách hỏi, API end-to-end hoặc toàn bộ ma trận câu hỏi.

Mẫu Hotel thất bại của [đợt3 lượt trước](../stage3-model-review-2026-10-29/README.md) giữ nguyên đánh giá, không được sửa hồi tố. Qua đợt đó và đợt này, các mẫu đại diện đặt lịch, nhóm C và Hotel sau sửa đều đã có kết quả đạt trong phạm vi từng mẫu. Tổng số lượt Gemini đã được đồng ý và thực hiện qua ba đợt là6; không phải6 lượt đều đạt.

## Kiểm chứng và môi trường

Runner giới hạn1 lượt theo gói duyệt; kiểm tra số mẫu READY không vượt ngân sách trước khi đọc khóa. Payload, generator hoặc bộ lọc thay đổi thì dừng; không ghi đè gói đã duyệt. Đã thêm kiểm tra ngân sách1 lượt/đầu vào ngân sách sai, nâng bộ hồi quy lên **85 kiểm tra offline đạt**. Kết quả40 ca nghiệp vụ trước đó vẫn là mốc gần nhất, không sửa code nghiệp vụ trong đợt này.

[Biên nhận dọn](local-environment.txt): database clone, hai container Auth/REST và tệp kết nối riêng đã dọn; database nguồn giữ nguyên. Giữ nguyên payload và phản hồi để đối chiếu; không thêm query vào mỗi câu hỏi, polling hoặc dịch vụ mới.

FAQ150–152 và các thay đổi API vẫn chưa push/áp Cloud. Phần sửa FAQ và đánh giá các mẫu đại diện đã hoàn tất trong phạm vi ghi nhận; G3.4 toàn bộ ma trận và nghiệm thu triển khai chưa được chứng nhận. Gate2 vẫn mở.
