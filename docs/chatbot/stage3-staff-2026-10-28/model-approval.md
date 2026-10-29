# Gói kiểm tra Gemini đã được đồng ý và thực hiện

**Đã đánh giá Hotel sau152:** Người dùng đồng ý riêng đúng1 lượt; đã chạy và đạt trong mẫu, không còn chờ duyệt lượt đó. [Bằng chứng mới nhất](../stage3-hotel-model-2026-10-29/README.md). Không gọi thêm lượt khác.

**Đợt mới ngày29/10 đã được đồng ý riêng và chạy đủ3 lượt:** [gói gửi và kết quả](../stage3-model-review-2026-10-29/README.md). Đặt lịch và nhóm C đạt trong mẫu, Hotel còn thiếu hữu ích. FAQ Hotel152 được sửa/kiểm thử SQL sau đó nhưng chưa gửi lại model. Không còn chờ duyệt3 lượt đã chạy và không gọi thêm lượt khác. Gói hai lượt bên dưới giữ nguyên như bằng chứng lịch sử.

**Hai phần FAQ đã hoàn tất local:**150 sửa đặt lịch;151 bổ sung3 FAQ nhóm C trong bảng nội bộ riêng và kiểm chứng khách không đọc được. Chưa áp Cloud hoặc gọi Gemini với nguồn mới. Gói hai lượt cũ bên dưới là bằng chứng lịch sử, không phải danh sách FAQ hiện có của bản local. [Bằng chứng](../stage3-faq-internal-2026-10-29/README.md).

**FAQ đặt lịch:** Migration150 và rollback đã đạt7 nhóm PostgreSQL local theo phần đối chiếu guest/member. Chưa áp Cloud, không thay gói hai lượt Gemini đã chạy hoặc gọi thêm model. [Bằng chứng](../stage3-faq-2026-10-29/README.md).

**Cập nhật 29/10/2026:** Hai lượt đã kết thúc với chỉ dẫn tại thời điểm chạy. Chỉ dẫn xử lý thiếu dữ liệu/đúng đối tượng được bổ sung sau đó, chưa gọi Gemini để đánh giá lại. Không còn chờ duyệt hai lượt cũ. [Đối chiếu guest/member và FAQ đề xuất](faq-audience-review-2026-10-29.md).

Đề nghị cho phép gửi **đúng 2 mẫu FAQ đã lọc** dưới đây đến **Google Gemini**, đích `https://generativelanguage.googleapis.com`, model `gemini-2.5-flash`, để kiểm tra câu trả lời có bám nguồn hay tự thêm thông tin.

Không gửi hồ sơ khách hàng, lịch sử hội thoại, email, điện thoại, đơn hàng hoặc lịch hẹn. Dùng cấu hình Gemini hiện có để xác thực; không gửi file môi trường hoặc đưa khóa vào nội dung câu hỏi. Mỗi mẫu một lần sinh; không kiểm thử tải hoặc gọi lặp hàng loạt. Không truy vấn hoặc ghi Supabase Cloud.

1. **Đặt lịch PawPal như thế nào?** Nguồn: chọn dịch vụ, thông tin thú cưng, thời gian và xác nhận theo hệ thống; FAQ có ghi thành viên cần đăng nhập. Cần kiểm tra model không tự diễn giải thành quy định của khách vãng lai. Việc FAQ có còn đúng với luồng guest hiện hành là bước đối chiếu riêng, không được chứng minh chỉ bằng việc model lặp lại FAQ.
2. **Phòng Hotel thường và VIP khác nhau về giá thế nào?** Nguồn chỉ nói có các loại phòng theo danh mục, có thể so sánh giá/sức chứa/tiện ích, chỉ hiển thị loại phòng đang cung cấp. Không có giá cụ thể; model phải tránh tự bịa giá hoặc tiện ích.

Nội dung chính xác sẽ gửi nằm trong [model-request.txt](model-request.txt), gồm câu hỏi, FAQ nguồn và giới hạn chỉ dùng nguồn đã cung cấp; không có lịch sử. System instruction hiện có của `requestGemini` trong `api/admin-chat.js` vẫn được áp dụng.

SHA-256 của payload: `0e618a6f5e952b52b76b6e46508b02a6567c12c4c7bf1de6313a1ccf5611aa67`.

Runner yêu cầu `--approved-payload-sha256` khớp trước khi đọc khóa hoặc gọi model. Thay payload cần duyệt lại. Không có mẫu nhóm C đủ phù hợp trong truy vấn local, nên không gọi model cho nhóm C hoặc tạo FAQ giả để lấp chỗ trống.

Lệnh gọi thật trước đó bị **bộ duyệt tự động** từ chối vì chưa có ủy quyền rõ payload/đích egress. Sau khi được giải thích, người dùng đã đồng ý và đúng2 lượt đã được thực hiện, không có lượt bổ sung. [Kết quả và giới hạn](model-verification.md); trạng thái đánh giá là PARTIAL, không còn chờ duyệt hai lượt này.
