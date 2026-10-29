# G3.4 — Nội dung dài, các mức giá và bộ lọc rõ nghĩa

Đạt kiểm chứng **local** cho phần bổ sung147–148. Chưa push, chưa áp Cloud; Gate 2 còn mở. Không gọi model bên ngoài hoặc Supabase Cloud.

## Phạm vi mới

| Câu hỏi/thao tác | Nguồn và hành vi |
|---|---|
| `Nội dung bài viết: mã, slug hoặc tên đầy đủ` | `content.read`: định danh chính xác; trùng tên thì yêu cầu mã, không chọn bản đầu. |
| `Nội dung đánh giá: mã đánh giá` | `review.read`: đọc nội dung gốc theo ID, không suy ra chủ nuôi hoặc chi tiết đơn ngoài quyền. |
| `Đọc phần tiếp` | Nút thuần chữ; mỗi lần bấm đọc tối đa 2000 ký tự Unicode. Không tải tiếp khi mở panel hoặc tự gom toàn bộ nội dung. |
| `Bảng giá chi tiết Spa 5 kg: mã dịch vụ` | `catalog.price_rows`: từng trang 10 mức giá của một dịch vụ, lọc tại SQL. Không tải toàn bộ ma trận rồi cắt trên ứng dụng. |
| `Ma trận giá taxi 4 kg 10 km: mã dịch vụ` | Các quy tắc taxi đang hiệu lực, cân nặng/cự ly cụ thể nếu được cung cấp. |
| `Bảng giá chi tiết khách sạn: mã dịch vụ` | Các loại phòng đang hoạt động; không tự suy ra báo giá đặt phòng hoặc phòng trống. |
| `Đánh giá 5 sao hôm nay` | Min=max5, không trả tất cả đánh giá. “Ít nhất 4 sao” lọc min4; “tối đa 2 sao” lọc max2; “đánh giá thấp” vẫn là tối đa2. |
| `Nhân viên đã nghỉ việc` / `Nhân viên tạm ngừng` | Lọc employment_status tương ứng terminated/inactive; không trả toàn bộ nhân sự rồi đổi tiêu đề. |

Đây là danh mục cụ thể, không phải khả năng hiểu mọi cách diễn đạt hoặc phân tích liên phân hệ. Bộ lọc tên KTV trên lịch hẹn chưa được thêm; câu hỏi đó tiếp tục được yêu cầu làm rõ thay vì trả danh sách không lọc.

## Phiên bản và lịch sử

- Mỗi phần gắn với ID và phiên bản bản ghi. Token được tính từ ID/xmin/updated_at, không băm lại toàn bộ nội dung dài. Bản ghi được sửa giữa hai lượt thì SQL trả PT409; API yêu cầu tra lại phần đầu, không ghép hai phiên bản.
- Nội dung gốc vẫn chỉ truyền từng phần. Việc tính số phần theo số ký tự có thể phải đọc/decompress trường dài trong database; không xem trần byte là chứng minh chi phí scan thấp. Có trần 10000 phần và timeout.
- Nút đọc tiếp được lưu cùng hai dòng exchange hiện có bằng RPC service-only `save_admin_copilot_detail`. Không thêm lượt cập nhật metadata riêng hoặc bảng mới. Giữ ownership, khóa idempotency và kiểm tra staff của luồng cũ; lưu có timeout5s/lock1s.
- Lịch sử có quyền và ngân sách hiện có trả metadata để khôi phục nút sau tải lại; replay giữ đúng nút cũ và không đọc lại nguồn. Giao diện chỉ cho phép mẫu câu đọc tiếp cố định, giấu token kỹ thuật khỏi dòng tin người dùng, không tạo nút thực thi từ nội dung nguồn tùy ý.
- HTML gốc hiển thị an toàn qua renderer đã escape, không chạy script hoặc tải ảnh trong nội dung. Phần văn bản không bị cắt thêm ở ngưỡng600 ký tự của các dòng tóm tắt.

## Điều kiện tài nguyên và quyền

- Mỗi phần/mỗi trang: **một lượt đọc nguồn**; giữ trần3 nguồn/câu, 2 đồng thời, 32 KiB/nguồn, 64 KiB/câu, ngân sách đọc8 giây. Dùng lại lease/pool4/rate10 câu/phút/staff; SQL5s/lock1s. Không thêm polling, realtime hoặc dịch vụ ngoài.
- Nội dung bài cần blog_post.read; đánh giá cần review.read. Giá cần quyền service/category và các bảng giá tương ứng nhóm đã chọn. Không chỉ dựa vào quyền xem chat.
- Khoảng giá theo nghiệp vụ013: bao gồm cận dưới, loại cận trên. Dữ liệu đang hiệu lực **hiện tại**; không phải báo giá cuối cùng. Không tự chọn một điểm trong khoảng cân nặng/cự ly hoặc diễn giải số âm thành số dương. Ngày khác hiện tại được yêu cầu làm rõ.
- Tên dịch vụ trùng thì yêu cầu mã. Nhóm không khớp hoặc không có mức phù hợp trả đúng rỗng. Không suy ra mức giá từ mô tả dịch vụ hoặc từ một trang mẫu.
- Nội dung chỉ có một phần khi đưa vào bản nháp phải được ghi giới hạn, không coi là tóm tắt toàn bài. Chưa kiểm chứng model thật.

## Bằng chứng

- 42 test offline trong bộ hồi quy gồm `chat_stage3_parts.test.cjs`, `chat_stage3_detail.test.cjs`, `chat_stage3.test.cjs`, `chat_read_tools.test.cjs`, `chat_read_api_budget.test.cjs`, `chat_read_admission_api.test.cjs`, `chat_public_owner.test.cjs`: đạt.
- `admin_copilot_business.cjs`: 40 ca nghiệp vụ/định tuyến và kiểm tra hợp đồng API đạt.
- Chrome thật với transport offline: `chat_stage3_parts_ui.cjs` và `chat_read_contract_ui.cjs` đạt. Có kiểm tra chỉ đọc sau click, khôi phục nút từ metadata khi refresh cưỡng bức, escape HTML và chặn tiếp nối tùy ý.
- `node scripts/test/chat_stage3_parts_local.cjs --local-fixtures`: 11 nhóm Auth/JWT/PostgREST/API/SQL thật local đạt; xem [kết quả](local-results.txt). Phục hồi chính xác6000 ký tự Unicode của cả bài viết và đánh giá qua3 phần; đổi phiên bản bị chặn; trùng tiêu đề không tải hai nội dung; ma trận25 mức chia10/10/5, không lặp, 5kg khớp đúng cận dưới; sai quyền/lease/byte/filter bị từ chối; pool bận/timeout thật; nút lưu/replay/history đúng; lọc sao; rollback/reapply.
- Migration148 chỉ bổ sung khoảng sao vào hàm stage3 hiện có. Rollback148 khôi phục nguyên định nghĩa145; không xóa dữ liệu. Rollback147 chỉ gỡ hai RPC mới. Các phiên bản ứng dụng và migration phải được triển khai/rollback tương ứng.

G3.4 đã giải quyết phần nội dung dài và mức giá từng dòng trong danh mục này. Còn kiểm chứng chất lượng hướng dẫn/nháp bằng model thật với FAQ thực tế và các bộ lọc chuyên sâu chưa có công cụ nguồn; chưa tuyên bố toàn giai đoạn3 hoặc Production đã hoàn thành.
