# Sửa câu tư vấn dịch vụ bị chặn bởi FAQ dài

Ngày30/10/2026. Tái hiện từ ảnh người dùng: “Tư vấn dịch vụ tắm và cắt tỉa” bị trả thông báo về đoạn trích. Đây là lỗi xử lý/diễn đạt, không phải khách hỏi sai hoặc thiếu quyền.

## Sửa nguyên nhân

- Planner nhận nhóm câu tư vấn/giới thiệu/chọn gói tắm/cắt tỉa, Hotel và Taxi; lấy tối đa5 gói active và thời lượng dự kiến từ danh mục public. Không dùng FAQ hoặc model cho lượt giới thiệu này. Hỏi thêm nhu cầu phù hợp, không tự xác nhận báo giá hoặc giữ lịch. Tư vấn đổi trả/sản phẩm không bị chuyển nhầm thành hỏi nhóm dịch vụ.
-158 mở rộng đúng read_public_chat_catalog bằng ba loại overview và sửa search_public_chat_context: loại các FAQ có câu hỏi/answer bị cắt khỏi output, gắn complete=true cho mục được giữ đầy đủ. Không dùng một FAQ dài làm lý do chặn các FAQ đầy đủ khác.
-API chỉ dùng mục đã xác nhận complete khi nguồn báo có phần bị loại. Nếu không còn nguồn dùng được thì hỏi rõ/gặp chuyên viên bằng lời tự nhiên; không đưa “vượt phần chat”, “đoạn trích” hoặc chi tiết giới hạn kỹ thuật ra luồng khách.
-API vẫn an toàn nếu RPC155 cũ trả phần cắt mà không có cờ complete: không gửi các mục đó sang model. Không fallback tải toàn bộ FAQ.

## Giới hạn tải/quyền

Giữ rules + một catalog/context,4 slot chung, timeout5 giây, overview5 dòng/catalog16KiB/context32KiB. Không thêm index, cache, polling, thông tin riêng hoặc truy vấn từng dòng.158 chỉ thay2 định nghĩa hàm đọc;service-only và SECURITY INVOKER giữ nguyên. Không sửa bản ghi dịch vụ/FAQ hoặc gọi Gemini.

## Bằng chứng

- [local-results.txt](local-results.txt):5 nhóm SQL/REST/API thật trên clone riêng đạt: ba nhóm overview, quyền, đúng câu guest từ ảnh không gọi FAQ/model, giữ FAQ đầy đủ khi loại bài dài, rollback/reapply. Clone đã dọn theo marker.
- [cloud-apply.txt](cloud-apply.txt): đã áp158, trước khi thay so khớp prosrc với bản155/156 đã triển khai để chặn ghi đè chỉnh sửa độc lập. [Định nghĩa trước thay đổi](cloud-before.txt). Không Cloud Logs hoặc dữ liệu khách. Rollback158 khôi phục chức năng155/156;API phải tương thích với bản RPC được phục vụ.
- Đã nạp lại server4000 và thử **đúng câu trong ảnh trên trình duyệt thật**, không mock network: trả danh sách gói hiện hành, thời lượng và câu hỏi loài/cân nặng; trạng thái Hỗ trợ tự động, draft được xóa. [Ảnh](browser-success.png). Server đang chạy mã mới; lời đáp lỗi cũ vẫn là lịch sử, không bị sửa/xóa.
-264 kiểm tra offline và40 ca nghiệp vụ đạt;17 ca public/catalog liên quan chạy lại sau sửa phân tuyến. Không có lượt Gemini mới; việc giữ FAQ đầy đủ đi vào model được kiểm tra bằng stub, chưa coi là đánh giá chất lượng model thật.

Không suy đây là tư vấn cá nhân/đầy đủ mọi tổ hợp: danh sách tối đa5 gói đang cấu hình. Giá, lịch trống, loài hỗ trợ và phần thêm phải kiểm tra theo công cụ/luồng tương ứng. Cắt bớt một mục không có nghĩa kho FAQ còn lại bao phủ mọi điều kiện nghiệp vụ.
