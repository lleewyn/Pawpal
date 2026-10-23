# Chatbot V1 — nghiệm thu phạm vi hiện tại

Cập nhật ngày 22/10/2026. Đã hoàn tất triển khai và kiểm tra phạm vi chatbot đã chốt trên Cloud mới và Vercel. Mã chức năng đã triển khai qua commits `4f75ed2` và `90182e4`. Bằng chứng bên dưới phân biệt kiểm tra trình duyệt Production, kiểm tra giao dịch Cloud hoàn tác và kiểm tra trên bản phục hồi; không tuyên bố mọi trường hợp đều đã chạy trên dữ liệu Production.

## Phạm vi chốt với người dùng

- Trực chat, Trợ lý tra cứu, FAQ, bộ lọc và câu trả lời mẫu thuộc phạm vi hiện tại.
- Trợ lý chỉ tra cứu và tư vấn; không tự tạo đơn, đặt lịch, sửa nghiệp vụ, cộng điểm, hoàn tiền hoặc phát voucher. Các thao tác quản trị có nút riêng vẫn do nhân viên xác nhận và được kiểm tra quyền phía máy chủ.
- Ảnh, tệp, camera và gửi Zalo/SMS/email thật chưa cần; không phải hạng mục còn thiếu để nghiệm thu lần này.
- Ma trận có kịch bản yêu cầu AI gọi công cụ ghi nghiệp vụ vẫn để chờ vì nằm ngoài phạm vi; không sửa kết quả thành đạt giả.

## Kết quả kiểm tra cuối

| Hạng mục | Kết quả và môi trường |
| --- | --- |
| Chat khách và Gemini | Đạt trên trình duyệt Production; câu trả lời thật được lưu trên Cloud qua bảng key riêng |
| Realtime | Đạt trên Production: đợi kênh đăng ký thành công rồi gửi tin khách từ phiên khác; quản trị nhận tin mà không làm mới thủ công |
| Tiếp nhận, gửi tin và ghi chú | Đạt trên trình duyệt Production; ghi chú nội bộ không xuất hiện trong dữ liệu khách được đọc |
| Hoàn tất và đánh giá | Đạt trên trình duyệt Production/API khách; trạng thái đóng, khóa ô nhập, mời đánh giá, lưu điểm và đánh dấu đã gửi |
| FAQ, bộ lọc, câu trả lời mẫu | Đạt khi lưu từ trình duyệt Production và đọc lại CSDL; kiểm tra xung đột và chặn ghi trực tiếp đạt trên bản phục hồi |
| Trợ lý quản trị | Đạt trên Production: Gemini trả lời thật, lưu đủ hai bản ghi lịch sử; giữ bản nháp khi ngắt request từ trình duyệt |
| Tạo khiếu nại | Đạt qua giao dịch Cloud hoàn tác: tạo đúng khách và nguồn hội thoại, gửi lặp không tạo thêm, thay nội dung bị từ chối; modal và lỗi mạng đạt trên bản phục hồi |
| Chuyển nhân viên | Chuyển sang nhân viên hợp lệ, chống lặp và xung đột đạt trên bản phục hồi trong giao dịch hoàn tác; Cloud từ chối người nhận không hợp lệ. Không mở khóa nhân viên Cloud để tạo ca kiểm tra |
| Quyền truy cập | Production từ chối khách khác đọc hội thoại; kiểm tra bản phục hồi đạt cho nội dung gốc, nhật ký đọc và lịch sử riêng từng nhân viên |
| Tải lại, màn hình hẹp và mất mạng | Tải lại khôi phục phân hệ trên Production; đã xem ảnh bố cục 1024px; giữ bản nháp Trợ lý khi request lỗi. Các form ghi cũng được kiểm tra giữ nháp trên bản phục hồi |
| Xoay key | Gọi thật qua Cloud đạt; kiểm tra đồng thời, 429, key lỗi và không bỏ qua thời gian nghỉ đạt trên bản phục hồi |

Lệnh kiểm tra có chủ ý ghi dữ liệu thử trên Production: `node scripts/test/chat_production_acceptance.cjs run`. Chỉ dùng bản ghi gắn mã kiểm tra riêng; script dọn tin nhắn, phiên khách, hội thoại, đánh giá, quy định và lịch sử Trợ lý thử trong `finally`, giữ nhật ký thao tác. Không chạy tự động mỗi lần khởi động ứng dụng.

## Phạm vi đã thực hiện

- Trực chat: danh sách và lịch sử có phân trang; nhận phiên, trả AI, gửi tin, ghi chú, chuyển nhân viên, hoàn tất và mời đánh giá. Máy chủ kiểm tra tài khoản, quyền, người phụ trách, phiên bản dữ liệu và UUID chống gửi lặp.
- Tạo khiếu nại dùng luồng Khiếu nại V1 và kiểm tra giao dịch thuộc khách. Không tự hoàn tiền, cộng điểm hoặc phát voucher. Điều chỉnh điểm thủ công dùng giao dịch có kiểm tra quyền.
- Quy định: lưu FAQ, bộ lọc và câu trả lời mẫu qua RPC; kiểm tra xung đột dữ liệu. Kiểm thử ma trận dùng kết quả kiểm duyệt thật; trường hợp cần công cụ chưa hỗ trợ vẫn để chờ, không báo đạt giả.
- Trợ lý quản trị chỉ tra cứu; lịch sử riêng theo nhân viên được lưu trên CSDL. Không lưu nội dung hội thoại trong localStorage.
- Khung chat khách dùng API xác thực khách hoặc phiên khách vãng lai; kiểm tra quyền sở hữu khi đọc, gửi và đánh giá. Tin nhắn gốc không trả về công khai. Xem nội dung gốc ở quản trị phải có quyền và ghi nhật ký.
- Tệp và camera chưa tích hợp lưu trữ nên không báo tải thành công. Email, SMS và Zalo vẫn là giả lập theo phạm vi đã chốt.

## Quản lý và xoay Gemini API key

- Migration 056 tạo `pawpal_private.ai_api_key`, nằm ngoài schema public. Chỉ máy chủ dùng service role được đọc và gọi RPC cấp lượt sử dụng key; anon và authenticated không có quyền.
- Mỗi lượt giữ key tối đa 45 giây, chọn bằng khóa hàng để tránh hai yêu cầu đồng thời dùng chung lượt. Một yêu cầu thử tối đa bốn key trong giới hạn thời gian.
- Lỗi 429 đặt thời gian nghỉ; key không hợp lệ bị vô hiệu hóa; lỗi tạm thời đặt thời gian nghỉ ngắn. Không ghi giá trị key vào log hoặc phản hồi trình duyệt.
- Chỉ dùng `GEMINI_API_KEY` từ môi trường khi bảng chưa có key nào. Khi đã có danh sách nhưng các key đang nghỉ hoặc bị tắt, không dùng key môi trường để bỏ qua trạng thái đó.
- Key được lưu trong bảng riêng, không tuyên bố có mã hóa ứng dụng hoặc Vault. Quyền service role phải giữ ở máy chủ.
- Nhập key bằng `node scripts/database/v1/import_ai_keys.cjs apply`. Nguồn là file riêng ngoài Git: `D:/Aboutme/Pawpal-infra/supabase-local/AI-KEYS.private.env`, các biến `GEMINI_KEY_1`, `GEMINI_KEY_2`… Script chỉ báo số lượng và không tự bật lại key đã bị tắt.

## Bằng chứng kiểm tra

Các bộ kiểm tra trên bản phục hồi đã đạt: thao tác hội thoại, hoàn tất, khiếu nại, thư viện câu trả lời và chuyển giao; quy định và xung đột khi lưu; lịch sử Trợ lý và chống gửi lặp; quyền đọc tin gốc và lịch sử riêng; biểu mẫu đánh giá có kiểm tra chủ sở hữu; điểm và chuyển nhân viên trong giao dịch hoàn tác.

`chat_key_rotation_v1.cjs` đã đạt: quyền RPC riêng, giữ lượt đồng thời khác nhau, nghỉ và chuyển key khi 429, tắt key không hợp lệ, không bỏ qua thời gian nghỉ và dự phòng môi trường khi danh sách trống. Kiểm tra chỉ dùng key thử trên CSDL phục hồi, không nhập key thử lên Cloud.

Đã xem ảnh các modal và giao diện chat sau lưu trên bản phục hồi, cùng ảnh chat quản trị Production ở chiều rộng 1024px. Realtime Production đã được kiểm tra riêng trong lượt nghiệm thu cuối, không suy ra từ kết quả bản phục hồi.

## Tình trạng Cloud và giới hạn kỹ thuật

- Đã áp bản bảo vệ 050 ban đầu và migration 056 tạo bảng key trên Cloud mới. Có bản sao lưu trước mỗi lần áp; đối chiếu không thay đổi dữ liệu public, mật khẩu hoặc trạng thái khóa tài khoản Auth.
- Bản sao lưu trước migration 056: `D:/Aboutme/Pawpal-infra/supabase-local/backups/chats-cloud-2026-10-22T11-20-24-868Z`.
- Đã áp đầy đủ phiên bản cuối của migrations 045–056 trên Cloud mới; đối chiếu dữ liệu public và thông tin Auth không thay đổi. Bản sao lưu: `D:/Aboutme/Pawpal-infra/supabase-local/backups/chats-cloud-2026-10-22T11-25-41-794Z`.
- Người dùng đã nhập 18 Gemini key trực tiếp vào bảng riêng trên Cloud. Kiểm tra có 18 key đang bật; gọi Gemini qua cơ chế cấp lượt từ CSDL thành công, không in giá trị key hoặc đưa dữ liệu nghiệp vụ vào yêu cầu thử.
- GitHub báo trạng thái Vercel thành công cho commit `4f75ed2`. Trên `https://pawpalgr3.vercel.app`, API mới trả 401 cho yêu cầu quản trị chưa đăng nhập; mã khung chat mới đã được phục vụ.
- Kiểm tra trình duyệt Production đạt: khách vãng lai gửi câu hỏi → Vercel API → bảng key Cloud → Gemini trả lời → lưu và hiển thị tin nhắn thật. Phiên khách khác bị từ chối đọc hội thoại với 403. Đã xóa hội thoại, tin nhắn và phiên khách kiểm tra sau khi thử.
- Kiểm tra quản trị Production đạt: đăng nhập, tải phân hệ Chatbot và đọc lịch sử Trợ lý qua API có xác thực trả 200. Các kiểm tra cuối được ghi chi tiết trong bảng ở trên.
- Kiểm tra ghi Production tiếp theo đạt trên hội thoại thử riêng: khách yêu cầu nhân viên → quản trị tiếp nhận → gửi tin từ trình duyệt → khách nhận đúng tin → quản trị hoàn tất → khách đọc đúng trạng thái đã hoàn tất. Đã xóa tin nhắn, hội thoại và phiên khách thử; giữ nhật ký thao tác.
- Đã sửa giao diện hội thoại đã kết thúc: khóa ô nhập, gửi tin và tiếp nhận; hiển thị trạng thái kết thúc. Kiểm tra hồi quy hoàn tất và thao tác hội thoại đạt trên bản phục hồi, có ảnh kiểm tra.
- Giới hạn số yêu cầu trong API hiện nằm trong bộ nhớ mỗi tiến trình, chưa phải hạn mức dùng chung giữa mọi phiên bản máy chủ.
