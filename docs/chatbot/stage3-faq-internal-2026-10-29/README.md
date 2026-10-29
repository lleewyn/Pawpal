# Hoàn thiện FAQ đặt lịch và FAQ nhóm C

Ngày 29/10/2026. **Hai phần FAQ đã hoàn thành và kiểm chứng local. Chưa push hoặc áp Cloud.**

## Nội dung hoàn thành

1. FAQ đặt lịch: migration150 phân biệt thành viên đăng nhập dùng hồ sơ tài khoản với khách vãng lai dùng luồng riêng; không đánh đồng tiếp nhận lịch với duyệt lịch/thanh toán. Giữ trạng thái bật/tắt và không ghi đè nội dung đã sửa. [Bảy nhóm kiểm tra riêng](../stage3-faq-2026-10-29/README.md).
2. FAQ nhóm C: migration151 bổ sung ba câu hướng dẫn có nguồn trong chức năng hiện có:
   - Trợ lý Admin hỗ trợ tra cứu nhân sự và lịch trực như thế nào?
   - Trợ lý Admin hỗ trợ tra cứu bài viết và đánh giá như thế nào?
   - Trợ lý Admin hỗ trợ tra cứu cấu hình và báo cáo vận hành như thế nào?

Nội dung đầy đủ nằm tại [migration151](../../../scripts/database/v1/151_admin_chat_internal_faq.sql). Các câu này hướng dẫn sử dụng công cụ đã có, không tự đặt quy trình nhân sự, chính sách bồi hoàn hoặc quyền nghiệp vụ mới. Nguồn đối chiếu là danh mục công cụ trong `chat_read_tools.js`, bộ lọc trong `chat_stage3_planner.js`, SQL145–149 và định tuyến/hiển thị trong `admin_copilot.js`.

## Tách quyền và nguồn

FAQ nhóm C lưu trong bảng `admin_chat_knowledge_faq`, tách khỏi bảng FAQ công khai `chatbot_knowledge_faq`. Anonymous không được cấp quyền đọc; tài khoản thành viên và nhân viên thiếu quyền bị RLS chặn. Nhân viên cần cả quyền dùng trợ lý và đọc FAQ. Service role được dùng để quản trị bảng, không cấp khả năng này cho khách.

Công cụ Admin `knowledge.search` tìm hai bảng trong cùng RPC, cùng giới hạn top5 và câu trả lời tối đa3000 ký tự mỗi mục. Giữ ngân sách 3 nguồn/câu, 2 đồng thời, 32 KiB/nguồn và 64 KiB/câu. Không thêm polling hoặc dịch vụ. Truy vấn tìm kiếm vẫn có chi phí quét nguồn như trước; không xem việc gộp một RPC là bảo đảm không tăng chi phí SQL. Đợt này chỉ thêm3 FAQ ngắn, chưa benchmark Production.

Luồng khách `read_public_chat_context` tiếp tục chỉ đọc kho công khai. Bảng FAQ nội bộ không được đưa vào ngữ cảnh khách hoặc truy vấn trực tiếp của anonymous. Giao diện Quy định hiện tại quản lý kho công khai; FAQ nội bộ đợt này quản lý qua migration có rollback, chưa có trình sửa riêng trên giao diện.

Đã sửa định tuyến câu hỏi về khả năng của trợ lý: câu hỏi hướng dẫn nhóm C đi tìm FAQ, không tự tra danh sách nhân sự/lịch trực/bài viết rồi dừng vì danh sách rỗng. Các câu yêu cầu dữ liệu thực tế như “Lịch trực tuần này”, “Bài viết đã đăng”, “Giờ mở cửa” giữ công cụ tra cứu cũ.

## Kiểm chứng

[Kết quả và SHA-256](local-results.txt), [biên nhận dọn môi trường](local-environment.txt), [script tái lập](../../../scripts/test/chat_stage3_internal_faq_local.cjs).

Đạt7 nhóm SQL/Auth/JWT/REST local:

1. Ba FAQ nội bộ được lưu riêng, không chèn vào kho khách.
2. FAQ đặt lịch mới được tìm thấy qua công cụ Admin có quyền.
3. Cả ba câu hỏi nhóm C lấy FAQ đúng trong một lượt đọc, chuyển nguồn vào nhánh hướng dẫn. Generator được giả lập; không gọi Gemini.
4. Anonymous, tài khoản thành viên thực và nhân viên thiếu quyền không đọc được FAQ nội bộ, cả trực tiếp và qua RPC.
5. Ngữ cảnh khách chứa FAQ đặt lịch đã sửa, không chứa bất kỳ FAQ nội bộ nào.
6. Rollback151 từ chối xóa bảng nếu nội dung đã được chỉnh độc lập.
7. Rollback151 và150 khôi phục tìm kiếm và câu trả lời đặt lịch trước thay đổi.

Đợt chạy đầu phát hiện dependency tìm kiếm091 còn thiếu trong clone và lỗi fixture/SQL rollback; đã sửa trước lần chạy đầy đủ đạt. Môi trường gồm database clone và hai container Auth/REST đã dọn, thông tin kết nối riêng đã xóa, database nguồn giữ nguyên.

Hồi quy: **82 kiểm tra offline và40 ca nghiệp vụ đạt**. Kiểm tra này không thay thế đánh giá Gemini thật, thử API đầy đủ trên bản deploy hoặc chứng nhận chịu tải Production.

## Triển khai và phần còn lại

Migration150 có rollback riêng; migration151 có [rollback](../../../scripts/database/v1/151_admin_chat_internal_faq.rollback.sql) kiểm tra toàn bộ nội dung seed trước khi xóa bảng. Chạy151 lần thứ hai sẽ dừng vì bảng đã tồn tại, không có cơ chế ghi đè seed tự động. Khi rollback cần thực hiện151 trước150. Nếu nội dung đã sửa hoặc có thêm FAQ nội bộ, rollback151 dừng để rà soát, không xóa nội dung mới.

FAQ đang chạy trên Cloud chưa thay đổi. Migrations135–151 vẫn chưa áp Cloud, Gate2 còn mở. **Không còn thiếu nguồn FAQ nhóm C trong bản local**; G3.4 còn đánh giá model và kiểm chứng trên môi trường triển khai. Hai lượt Gemini cũ giữ nguyên kết luận PARTIAL, không có lượt gọi bổ sung trong công việc này.
