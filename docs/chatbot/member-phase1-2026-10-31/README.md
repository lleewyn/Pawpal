# Chatbot thành viên — triển khai và nghiệm thu31/10/2026

Đã có bốn nhóm tra cứu riêng: lịch hẹn, đơn hàng, thú cưng, số dư điểm/hạng. API/frontend còn local, chưa push. Migration160 đã áp lên Supabase Cloud sau kiểm tra transaction rollback; không thay đổi hồ sơ hoặc giao dịch thật.

## Phạm vi hoạt động

- Lịch: sắp tới, hôm nay, ngày mai, đã qua hoặc danh sách; mã/UUID chính xác chỉ trong chủ sở hữu. Ngày giờ hiển thị Việt Nam. Khoảng tuần/tháng tùy ý chưa hỗ trợ trong chat, có bước tới trang lịch.
- Đơn: trạng thái xử lý và giao nhận, tổng tiền hiện ghi nhận, tổng thanh toán thành công và hoàn thành công được nói riêng; không suy “đã thanh toán” từ trạng thái đơn. Chỉ đúng mã hoặc tối đa5 đơn/trang.
- Thú cưng: tối đa5 bé/trang, tên/mã, giống/loài, ngày sinh/giới tính nếu có, lần cân mới nhất, dị ứng/lưu ý đã ghi. Tên trùng giữ từng hồ sơ, đề nghị dùng mã; không chẩn đoán hoặc sửa hồ sơ.
- Điểm: số dư sổ điểm và hạng đang gán; không tự tạo hạng cho người chưa được gán. Lịch sử điểm/ví ưu đãi và nhật ký chăm sóc dẫn đúng trang tài khoản, chưa đọc sâu trong chat.
- Hỏi tiếp “Xem tiếp” hoặc số trang có giới hạn, giữ chủ đề từ tối đa4 câu hỏi của chính hội thoại. Chọn theo thứ tự dễ thay đổi thì yêu cầu mã. Câu nhiều nhóm hỏi chọn trước. Đổi/hủy/tạo vẫn do khách xác nhận ở màn hình nghiệp vụ.

## Quyền và bảo mật

Nguồn read_member_chat_context chạy SECURITY INVOKER bằng JWT thành viên, không nhận customer_id từ câu hỏi/request. DB tự xác định customer từ auth.uid, từ chối khách/nhân sự/customer ngừng hoạt động/Auth bị cấm. API xác minh chủ hội thoại trước khi gọi nguồn và kiểm owner trong response. Service-role không có quyền thực thi nguồn này.

Helper tổng tiền hẹp chạy SECURITY DEFINER vì view tổng tiền có các bảng con cố ý không cho member đọc rộng. Helper chỉ nhận tối đa6 ID, tự xác định chủ và trả tổng của đúng đơn/lịch của chủ đó; không trả thông tin giảm giá hoặc điều chỉnh nội bộ. Không thêm policy/grant đọc bảng con. Ca voucher10000 trên đơn100000 được đối chiếu trả90000, không bị RLS làm thiếu giảm giá. Các projection còn lại giữ RLS caller.

Thông tin riêng trả bằng formatter xác định, không đi qua Gemini. Với thành viên, lượt hỏi công khai về sau luôn gửi history rỗng cho model; chỉ FAQ công khai được dùng làm context. Trong lượt thực hiện này không gọi Gemini. Đổi tài khoản/đăng xuất vẫn dùng cơ chế epoch để loại response cũ và tách lịch sử.

## Kiểm thử

-61 test Node đạt: planner/formatter/API member cùng hồi quy public/ownership/privacy/streaming. Có lỗi nguồn và response sai chủ không fallback về model hoặc giả số0.
-16 kiểm tra SQL/RLS thật đạt với hai danh tính và dữ liệu QA trong transaction rollback: bốn nhóm, cap/trang không trùng, mã khác chủ/không tồn tại, tên trùng, điểm/hạng, thời gian, payload sai, customer inactive, Auth banned, anon/service-role denied. Fixture không commit; migration mới được áp riêng sau đó. [SQL](sql-checks.txt), [phát hành nguồn](migration-apply.txt).
- Browser localhost đăng nhập thật đạt12 kiểm tra chính và2 kiểm tra tiếp: bốn nguồn đối chiếu RPC caller-JWT; bốn link trang tài khoản; trang2; chặn hỏi người khác; hướng thao tác hủy; chính sách điểm công khai; hỏi nối Xem tiếp; link chi tiết giữ đúng ID. Tài khoản thử không có lịch sắp tới nên empty state thật đạt; ca lịch có dữ liệu được kiểm ở SQL rollback. Không xuất thông tin riêng vào bằng chứng. [Browser](browser-checks.txt).
- Chrome kiểm soát transport đạt đổiA/B, trở lại lịch sửA, response đang chờ lúc đổi tài khoản, đăng xuất xóa nội dung riêng và whitelist link. Đây không phải hai phiên đăng nhập thật trên browser. Các quyền khác chủ thật đã kiểm ở SQL; browser tài khoản thực chỉ dùng một phiên người dùng cung cấp. Không tự đăng xuất phiên của người dùng để thử.
- Khách chưa đăng nhập thử thật đơn/điểm đều được dẫn tới đăng nhập; không truy cập nguồn riêng. Public controls và SSE UI hồi quy đạt.

## Tài nguyên và phần còn mở

Một câu đọc một nhóm qua một RPC, tối đa5 kết quả và16KiB; lấy6 hàng để biết còn trang. Helper tổng tiền tính gộp chỉ trong các ID đã chọn. Điểm aggregate chỉ trong đúng customer, không tải toàn sổ ra API/model. SQL5s/lock1s, client nguồn7s và4 source slots dùng chung; không thêm polling/subscription hoặc truy vấn theo token.

Bốn câu chính trên phiên chat mới mỗi câu có public_open/send/read; bấm link rồi trở lại có thêm public_read. Toàn bài browser chính28 request, body trả về19.665bytes (xem metrics từng lượt); không gồm Auth/DB/header/TLS/provider, không phải chứng nhận tổng tải đồng thời. Không đọc Cloud Logs.

Chưa hoàn thiện: nhật ký/Hotel/Taxi chi tiết trong chat, lịch sử điểm/voucher, yêu cầu hỗ trợ riêng, khoảng thời gian tùy ý, tự thực hiện giao dịch, browser hai tài khoản thật/blocked thật, benchmark tải đồng thời và smoke Vercel. Năng lực hiện có có link tiếp tục khi thiếu phần sâu. Không coi các mục này đã xong chỉ vì có ownership chung. Chỉ push theo yêu cầu mới của người dùng.
