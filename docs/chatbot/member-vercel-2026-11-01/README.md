# Nghiệm thu Vercel — 01/11/2026

Đã kiểm tra trực tiếp https://pawpalgr3.vercel.app bằng browser, API Vercel thật và Supabase Cloud. Bản đã push9b5e0ccd có marker20261031_member_complete trên scripts/shared/components.js. Không gọi thêm Gemini, không đọc Cloud Logs, không sửa đơn/lịch/hồ sơ của người dùng.

## Kết quả cuối

-10/10 nhóm trên phiên thành viên người dùng đăng nhập đạt, so với RPC caller-JWT có giới hạn: lịch sắp tới0, đơn5, bé5, điểm/hạng1, lịch sử điểm5, ví ưu đãi5, nhật ký0, Hotel0, Taxi0, hỗ trợ3. Bốn nhóm0 là trạng thái trống đúng nguồn, không phải chứng nhận UI có dữ liệu cho các nhóm đó. Các ca không rỗng vẫn có SQL/formatter trong báo cáo trước. Tất cả có link tài khoản; không xuất tên bé/mã/điểm/nội dung riêng vào bằng chứng. [Kết quả](member-checks.txt).
-30 request chatbot public_open/send/read đều200 cho10 câu. Tổng response body18.525bytes;10 RPC oracle được gọi riêng để đối chiếu, không tính trong30 request đó. Latency end-to-end khoảng4.443–7.380ms/câu trong lượt này. Không gồm header/TLS/Auth, DB egress hoặc phép đo tải đồng thời; không kết luận toàn hệ thống không thể quá tải.
-Bấm link từ câu trả lời đơn hàng mở đúng UUID chi tiết đã chọn trên Vercel, chỉ giữ boolean trong [bằng chứng link](detail-link.txt).
-Guest mobile390px: mua không tài khoản trả đúng/linkshop; đơn riêng dẫn login, câu hỏi hiện ngay trong lúc chờ; widget nằm trong viewport. [Bằng chứng](public-checks.txt).
-Hai tài khoản QA thật đăng nhập bằng form phone/password trên Vercel: A/B chỉ thấy pet của mình, logout thật, B không lấy transcriptA; dùng JWTB đọc chatA bị403, RPCpetA rỗng; trở vềA đúng chủ; khóaA không nhận private answer mới. Ngoài pet có dữ liệu,9 nhóm còn lại trên QA được kiểm empty/zero state và link. Account/customer/pet/chat QA đã dọn hết. Phiên/tài khoản người dùng được giữ nguyên. [Bằng chứng A/B](accounts-browser.txt).

## Lượt thử đầu và giới hạn

Lần automation đầu đã đạt A/B và chặn chéo, nhưng timeout lúc quay lạiA vì bài test bấm trước khi widget JavaScript khởi tạo xong. Đã thêm chờ __pawpalFabInitialized trước khi click và thử lại đạt; không đổi runtime sản phẩm. Giữ [lượt đầu](accounts-first-attempt.txt) và [xác minh dọn dữ liệu lượt đầu](first-attempt-cleanup.txt), không xóa bằng chứng thất bại.

Đây là smoke triển khai và kiểm quyền, không phải chạy lại mọi oracleSQL, test lỗi nguồn, media hoặc bộlọc nghiệp vụ. Không kiểm streaming Gemini/chất lượng model trên Production trong lượt này vì không có phạm vi gọi model mới; các câu thành viên trả xác định bằng dữ liệu riêng. Tổng tải đồng thời và Gate2 vẫn mở.

Checklist được cập nhật local sau nghiệm thu. Lượt này chỉ kiểm tra, chưa push các thay đổi báo cáo/test harness mới.
