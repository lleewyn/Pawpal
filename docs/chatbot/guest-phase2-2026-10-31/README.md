# Nghiệm thu khách vãng lai đợt 2 — 31/10/2026

Đã thử trực tiếp widget trên localhost:4000 với API thật và Supabase Cloud. Chỉ tạo/sửa hội thoại kiểm thử của lượt này; không sửa đơn, lịch, khách hàng hay hồ sơ thật. Không đọc Cloud Logs. Code chưa push tại thời điểm nghiệm thu local; trạng thái phát hành ghi riêng bên dưới.

## Kết quả

- 31 câu hỏi khác nhau đạt sau sửa, bao phủ 13 nhóm thông tin; nhu cầu thứ 14 là chuyển người được kiểm riêng qua hai UI. Có hỏi tiếp, không dấu, giá theo cân/km, so sánh, tồn hàng công khai, giới hạn phòng/lịch, mua/đặt guest, chính sách, điểm, chuẩn bị và khôi phục mã.
- Hai câu Gemini đã được người dùng đồng ý: “PawPal có những dịch vụ gì?” và “Lần đầu đến PawPal có điều gì cần lưu ý?” đạt, HTTP200, khoảng9,1 và8,1 giây. Đúng hai lượt gửi UI, lịch sử trống; chỉ FAQ công khai. Backend cho phép tối đa4 lần thử/câu, nằm trong trần8 đã duyệt; không đo được số lần gọi provider thực tế. Không gửi thử thêm.
- Bốn liên kết được bấm thật: đặt lịch giữ service đã chọn, trang sản phẩm, tra cứu guest và cửa hàng. Nháp giữ khi Escape/đóng mở, Shift+Enter không gửi. Widget nằm trong viewport desktop/tablet/mobile; ảnh mobile được xem sau khi animation kết thúc.
- Vòng chuyển người đạt6 bước: nút mở ngay sau trả lời; chờ nhân viên; Admin tiếp nhận/trả lời; guest trả lời ngược tự cập nhật Admin; hoàn tất/CSAT và khóa nhập; yêu cầu người bằng lời rồi quay lại trợ lý. Guest đang mở nhận tin nhân viên sau32.342ms qua polling foreground, không đóng/mở. Khi nghiệm thu hoàn tất/CSAT có chủ động đóng/mở widget; không suy ra tốc độ cập nhật nền ở mọi trạng thái.
- Bảy kiểm tra phục hồi/an toàn đạt: mất response sau server đã lưu vẫn giữ nháp; reload/gửi lại giữ requestId và nhận replay, không trùng; câu thiếu chủ đề được hỏi rõ; giới hạn độ dài; lịch sử khách khác rỗng; khách khác đọc ca kiểm thử bị403; HTML/link nguy hiểm không thực thi. Mất response và nội dung độc là fault injection riêng, không dùng làm bằng chứng dữ liệu nghiệp vụ hoạt động.
- 43 test Node đạt; hồi quy Chrome controls và backoff30/60/120 giây đạt với transport kiểm thử riêng.

## Lỗi phát hiện và đã sửa

1. “Cắt tỉa” không tìm được các gói tên Grooming: bổ sung alias nguồn SQL159, vẫn lọc cân/loài và không lấy cắt móng thay cắt tỉa. Đã áp cập nhật có guard lênCloud và thử lại UI đạt.
2. “Không nhận được mã đơn” bị hiểu là OTP: phân biệt mã đơn/khôi phục với mã xác thực; câu không rõ loại mã hỏi lại. Ba biến thể OTP/mã không rõ đạt.
3. Mua hàng không tài khoản dẫn sang đặt lịch: tách chủ đề mua/đặt, bấm link cửa hàng thật đạt sau sửa.
4. Phiên guest mới chưa cập nhật mốc tạo trong bộ nhớ: sau lỗi mạng/reload bản nháp bị loại. Đã cập nhật mốc ngay khi phát token; thử lại thực tế nhận replay và không tạo tin trùng.
5. Lỗi nút chuyển người bị khóa sau gửi đã sửa từ đợt1; đợt2 kiểm lại cả chuyển thất bại và vòng hai UI đạt.

Không xóa kết quả thất bại ban đầu: [kết quả chi tiết](browser-results.txt) giữ batchA/B, lượt thử lạiC và các kiểm tra bổ sung. Các script browser trong scripts/test/guest_phase2_* chạy qua Playwright; không phải Node CLI và phải dùng phiên Admin đã đăng nhập cho handover. Không chạy cả bộ khi chưa có phạm vi model mới; các script lưu trong repo hiện chỉ dùng câu xác định, không chứa hai câu gọi Gemini.

## Ngân sách và giới hạn

Một câu “Giá cắt tỉa bé7kg” trên phiên mới:3 request public_open/send/read, tất cả200; tổng JSON gửi599bytes, nhận1.362bytes, khoảng4.933ms. Đây là body tại browser, không gồm header/TLS/Auth/DB/provider và không phải phép đo tải đồng thời. BatchA/B/C tương ứng37/32/17 request API; không có lỗi network/JavaScript ngoài các lỗi chủ động ở kiểm tra riêng. Câu trả lời dài lấy phần tiếp theo theo yêu cầu UI.

Giữ cap đọc liên quan, timeout/pool hiện có, không thêm polling theo chủ đề. Gate2 tổng tải dùng chung vẫn chưa đóng; không kết luận database chịu mọi mức tải từ phép đo này.

Phần chưa có nguồn/năng lực vẫn được nói rõ: xác nhận phòng/lịch trống trong chat, ngưỡng điểm/tỷ lệ đổi, mọi ưu đãi/phí/điều kiện kinh doanh chưa công bố, giá tương lai và tra giao dịch riêng bằng chat. Các mục này có hướng dẫn bước tiếp theo; không chặn kiến thức công khai vì khách chưa đăng nhập. Hai câu model đại diện không thay bộ đánh giá mọi câu hỏi tự do.

## Phát hành

Local đã đạt và đủ điều kiện push theo yêu cầu người dùng. Chưa ghi Production đạt trước khi kiểm tra bản triển khai mới. Không đánh dấu hoàn tất dữ liệu riêng thành viên, Admin nâng cao, Gate2 hoặc toàn bộ checklist hệ thống.
