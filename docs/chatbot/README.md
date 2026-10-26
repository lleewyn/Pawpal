# Trợ lý quản trị Pawpal — cập nhật 25/10/2026

Đợt này tập trung vào tra cứu đúng dữ liệu, giới hạn tài nguyên và bảo vệ thao tác theo ca. Chưa nghiệm thu toàn bộ checklist Chatbot.

## Chức năng đã bổ sung

| Nhu cầu | Ví dụ | Phạm vi |
|---|---|---|
| Lịch hẹn | Hôm nay có bao nhiêu lịch Spa chờ phục vụ? | Theo từng ngày Việt Nam; nhóm Spa, khách sạn, taxi; đếm lịch một lần dù nhiều dịch vụ |
| Tồn kho | Có bao nhiêu SKU dưới ngưỡng? | SKU đang bán có tồn nhỏ hơn tồn tối thiểu; tổng chính xác và tối đa 20 dòng |
| Khiếu nại | Khiếu nại chưa kết thúc trong 24 giờ qua | Tổng và tối đa 20 phiếu; khoảng thời gian theo ngày tạo |
| Khách hàng | Khách hàng: tên, số điện thoại hoặc mã | Tối đa 10 kết quả theo quyền |
| Đơn hàng | Đơn hàng: ORD-… | Tra mã và trạng thái; tối đa 10 kết quả |
| Danh mục | Sản phẩm: SKU hoặc Dịch vụ: tên | Giá biến thể sản phẩm; dịch vụ chưa báo giá khi chưa chọn gói |
| Hỗ trợ CSKH | Soạn lời xin lỗi giao hàng trễ | Bản nháp để nhân viên kiểm tra, không tự gửi |
| Tóm tắt | Tóm tắt hội thoại đang chọn | Tối đa 12 tin gần nhất đã lọc; cần chọn ca và có quyền |

Số liệu lấy qua RPC theo quyền người gọi, không giao cho mô hình tự đếm hoặc tự chọn SQL. Khi nguồn lỗi, API báo lỗi; không thay bằng số 0 hay dữ liệu mẫu. Câu hỏi ngoài khả năng hiện tại nhận hướng dẫn hoặc yêu cầu làm rõ. Chưa hỗ trợ mọi cách diễn đạt tự nhiên hoặc mọi tổ hợp bộ lọc.

AI không tự cộng điểm, hoàn tiền, đặt lịch, sửa đơn, chuyển ca, gửi tin hoặc xóa dữ liệu. Nút tặng điểm do nhân viên xác nhận được kiểm tra riêng ở server: ca đang nhận, đúng người phụ trách, phiên bản, chính sách đang bật, hạn mức, phê duyệt và requestId.

## Trạng thái triển khai

- Nhánh gốc `main`, SHA trước thay đổi: `d8bb56e918105865d38d01592e4255d480f65849`. Working tree có nhiều thay đổi từ công việc trước; chưa commit/push.
- Frontend gọi `/api/admin-chat`; handler nguồn là `api/admin-chat.js`. Route Cloud đã trả 401 khi chưa đăng nhập; điều này không chứng minh mã đang deploy trùng working tree.
- Bốn RPC mới đã áp dụng lên Supabase Cloud `cpzuvaplseielhgcnqrn.supabase.co`. API và giao diện mới vẫn ở local, chưa deploy.
- `server.js` và `vercel.json` đã ở trạng thái xóa trước đợt này. Không khôi phục hoặc suy đoán cấu hình deploy thay người dùng.
- Không truy vấn Supabase Logs; không stress-test Cloud Free.

## Tài nguyên

Câu hỏi số liệu chỉ gọi một RPC nguồn, không tải lịch sử và không gọi Gemini. API vẫn có bước xác thực, kiểm tra request đã lưu và lưu câu hỏi/trả lời. Không mô tả toàn bộ HTTP request là chỉ có một truy vấn DB.

Ngữ cảnh mô hình bị giới hạn: 6 tin lịch sử cá nhân, mỗi tin tối đa 1.200 ký tự; 12 tin chat đã lọc, mỗi tin tối đa 800 ký tự; tối đa 5 FAQ liên quan. Không lấy toàn bộ catalog/tồn kho/FAQ ở mỗi câu hỏi. Không gửi nguyên văn độc hại hoặc metadata từ chat context.

## Kiểm tra và vận hành

Xem [bằng chứng kiểm thử](test-evidence.md) và [tiến độ nghiệp vụ](checklist-nghiep-vu.md). Dùng `node scripts/test/admin_copilot_business.cjs` cho kiểm tra offline. Kiểm tra UI cần Playwright tại đường dẫn máy hiện tại được ghi trong script.

Migration: `101_admin_copilot_facts.sql`, `102_chat_points_context.sql`. Không chạy lại các migration V1 cũ. Script `apply_copilot_business_cloud.cjs` mặc định chạy thử và hoàn tác; `--apply` mới commit, có sao lưu định nghĩa hàm và kiểm thử fixture trong savepoint.

Sao lưu nền riêng tại `%TEMP%/pawpal-chatbot-baseline-20261025`. Lần áp dụng cuối có bản khôi phục riêng tại `%TEMP%/pawpal-copilot-business-1792920118681/rollback.private.sql`. Đây là khôi phục về ngay trước lần áp dụng cuối, không phải trước cả đợt nâng cấp. Bản đầu đợt tại `%TEMP%/pawpal-copilot-business-1792919781219/rollback.private.sql` khôi phục hai RPC đầu; hai wrapper ngữ cảnh mới cần bỏ riêng nếu khôi phục toàn bộ đợt. Không tự chạy rollback trên Cloud khi chưa kiểm tra dependency và nguồn đang deploy.

Khi hoàn tác giao diện/API, phục hồi riêng các diff của đợt Chatbot từ bản lưu/review; không dùng reset toàn workspace vì còn công việc sản phẩm và dịch vụ của người dùng. Các tài liệu ngày 16–17/10 trong thư mục này là baseline cũ, không phải bằng chứng nghiệm thu hiện tại.
