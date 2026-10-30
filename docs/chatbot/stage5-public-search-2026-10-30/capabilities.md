# Năng lực công khai và điều kiện nghiệm thu giai đoạn5

Ngày 30/10/2026. Trạng thái: triển khai và kiểm chứng local, chưa phát hành Cloud. Không mở quyền dữ liệu riêng cho khách.

**Cập nhật nội dung tiếp theo:** Đã rà92 FAQ local và kiểm tra157/rollback với19 thay đổi;155 ưu tiên câu trùng nguyên văn và150/152 xử lý file CRLF.7 nhóm tích hợp nội dung mới,17 nhóm công cụ chạy lại,259 kiểm tra offline và40 ca nghiệp vụ đạt. [Chi tiết](../stage5-faq-review-2026-10-30/README.md). Các số255 phía dưới là mốc trước đợt rà nội dung.

| Nhóm câu hỏi | Nguồn và cách trả lời | Giới hạn/hướng tiếp tục |
| --- | --- | --- |
| Cửa hàng, địa chỉ, giờ mở cửa | FAQ công khai đang bật, tìm liên quan | Không tự lấy cấu hình nội bộ làm thông tin công khai; thiếu FAQ thì hỏi rõ/gặp nhân viên |
| Dịch vụ, chuẩn bị trước khi đến | FAQ công khai | Không chẩn đoán thú y hoặc suy lịch trống |
| Hướng dẫn đặt lịch/mua hàng | FAQ theo đối tượng guest/thành viên | Không khẳng định đã tạo đơn/lịch; không tự áp điều kiện đăng nhập của thành viên cho guest |
| Giao nhận, đổi trả, ưu đãi công khai | FAQ công khai, giữ điều kiện trong nguồn | Không xác nhận ưu đãi riêng hoặc quyền lợi cá nhân; chưa có công cụ kiểm tra hiệu lực/điều kiện chiến dịch riêng |
| Giá sản phẩm | Tên sản phẩm theo từ khóa hoặc SKU chính xác; product và variant active | Tối đa10 biến thể, không đọc kho/giá vốn, không hứa còn hàng; chưa tính vận chuyển/ưu đãi cá nhân |
| Giá tắm/cắt tỉa | service active thuộc grooming_spa, price matrix active, effective_from ≤ hiện tại < effective_to | Hiện các khoảng cân nặng đang cấu hình, không tự chọn một khoảng làm báo giá cho bé; tối đa10 mức |
| Giá Hotel | hotel_room_type active, daily_price | Giá/ngày theo loại phòng, chưa xác nhận phòng trống hoặc tổng tiền theo lịch ở |
| Giá Taxi | taxi_price_rule active trong khoảng hiệu lực | Hiện khoảng km/kg, giá cơ bản/phụ phí; không nhân km hoặc tự suy phụ phí vào báo giá |
| Tồn hàng, lịch/phòng trống, tạo đơn/đặt hộ | Phản hồi xác định, không tìm FAQ/không gọi model | Hướng tới màn hình nghiệp vụ/nhân viên để xác nhận |
| Nội bộ, hồ sơ, giao dịch riêng | Phản hồi ranh giới với mẫu đã hỗ trợ | Không cấp quyền qua câu “tôi là admin”, SĐT hoặc mã đơn; tra cứu có xác minh thuộc giai đoạn6 |
| Gặp nhân viên | Chuyển bằng giao dịch post hiện hành | Lưu waiting_agent cùng yêu cầu mới nhất tối đa300 ký tự trong phản hồi; nhân viên còn xem nguyên hội thoại. Không coi đây là bản tóm tắt toàn lịch sử hoặc đã có người nhận ca |

## Ngân sách

Rules + FAQ/history hoặc rules + catalog: tối đa2 nguồn. Giá dùng bộ định dạng xác định, không model; hỏi riêng tư/thiếu điều kiện/yêu cầu nhân viên không thêm nguồn nội dung. Giữ pool4 nguồn chung, SQL5 giây/lock1 giây, FAQ context32KiB hoặc catalog16KiB. Không thêm cache, listener, polling hay dịch vụ ngoài.

Catalog có chỉ mục GIN tên sản phẩm và B-tree SKU cho bản ghi active; không truy vấn kho, reservation, khách hàng hoặc chi tiết giao dịch. Chi phí ghi/index tăng khi đổi tên/trạng thái/SKU. Chưa có benchmark p95 trên dữ liệu đại diện lớn; giới hạn response không thay thế việc đo tải thật. Kế hoạch FAQ trên fixture chứng minh biểu thức dùng được GIN khi tắt seqscan, không hứa planner luôn chọn index.

## Kiểm chứng mới nhất

- 17 nhóm SQL/Auth/JWT/REST/API local đạt: tìm kiếm, bytes trước/sau,8 nhóm chủ đề tiếng Việt/không dấu, giới hạn Unicode, quyền, giá theo hiệu lực/trạng thái, guest/member, no-match, chuyển nhân viên và rollback/reapply.
- 255 kiểm tra offline và40 ca nghiệp vụ đạt, không gửi Gemini. Model trong tích hợp là stub; không suy chất lượng Gemini từ các con số này.
- Trên cùng fixture: context cũ43.854 bytes, mới8.264 bytes, giảm khoảng81%; nguồn vẫn2. Đây là phép đo fixture cụ thể, không phải mức giảm bảo đảm cho mọi câu hỏi.
- Môi trường đã dọn, nguồn local giữ nguyên. [Kết quả](local-results.txt), [môi trường](local-environment.txt).

## Phần chưa nghiệm thu

Chưa chứng nhận bộ FAQ thực tế đầy đủ/còn đúng cho mọi chủ đề;8 mẫu chủ đề chỉ xác minh truy xuất. Tìm kiếm từ khóa không hiểu mọi cách nói hoặc câu nối tiếp. Chính sách/ưu đãi không có nguồn xác nhận thì nói thiếu thông tin, không tự tạo chính sách. Chưa chạy đánh giá AI thực tế rộng, E2E mới trên UI, p95/tải đồng thời hoặc đối chiếu bản triển khai. Các phần này tiếp tục trong nghiệm thu chất lượng/phát hành; không đánh dấu cả giai đoạn đạt Production.

## Thứ tự triển khai/rollback

Áp143 (nếu chưa có),155 rồi156 trước API mới. API không fallback sang nạp hàng loạt khi thiếu hàm. Rollback: đưa API về trước đợt này, chạy156 rollback rồi155 rollback;156 phụ thuộc các helper của155. Không DROP CASCADE, không xóa bản ghi nguồn. Đợt này chưa push hoặc áp Cloud.
