# Phạm vi công khai cho khách vãng lai

Theo chỉ đạo người dùng ngày30/10/2026: không siết khả năng hỏi thông tin chung chỉ vì người hỏi chưa đăng nhập. Giới hạn theo dữ liệu được công khai/quyền sở hữu, không theo từ khóa rời rạc.

| Được hỏi như thông tin công khai | Dữ liệu riêng cần xác minh |
| --- | --- |
| Paw Points là gì, cách tham gia/đổi thưởng | Tôi còn bao nhiêu điểm, số dư của một khách |
| Mã đơn là gì, cách tra cứu, xem đơn ở đâu | Nội dung/trạng thái giao dịch cụ thể chưa xác minh quyền |
| Dịch vụ, tư vấn, các loại phòng, giá hiện tại, điều kiện | Hồ sơ khách/bé, lịch sử chat/giao dịch, báo cáo/lương/giá vốn nội bộ |
| Còn hàng/lịch công khai được công bố, cách kiểm tra | Tồn kho chi tiết nội bộ hoặc lịch/phân công chưa công khai |
| Hướng dẫn đặt/mua/hủy/đổi trả, ưu đãi/chính sách | Thực hiện hành động hoặc xác nhận đã đặt/đã hoàn/được ưu đãi khi chưa có kết quả nghiệp vụ |

Đã bỏ chặn blanket theo Pawpoint/mã đơn/còn hàng; phân biệt câu hỏi khái niệm/hướng dẫn với yêu cầu xem một hồ sơ thật. Câu hỏi hướng dẫn có mã ví dụ vẫn không mở công cụ tra giao dịch. Chính sách/khái niệm chỉ đi vào nguồn public FAQ; không có RPC đọc hồ sơ user/Admin mới được cấp cho guest. Chủ hội thoại vẫn xác minh phía server trước khi lấy lịch sử riêng của phiên.

Giá tắm và cắt tỉa hoặc so sánh các loại Hotel không bị ép tách câu vô lý. Ngày dự kiến không làm mất quyền xem giá đang cấu hình: phản hồi ghi rõ mức hiện tại/thời điểm và chưa xác nhận giá cho ngày/điều kiện cụ thể. Sản phẩm “sữa tắm” có tiền tố sản phẩm/SKU được tra đúng sản phẩm, không bị từ “tắm” kéo sang dịch vụ; Vitamin không bị khớp nhầm chữ “tắm”. Nhiều nhóm giá cùng lúc hiện hỏi nhóm cần xem trước, không báo khách không có quyền hỏi.

**Không đánh đồng chưa có nguồn với bị cấm:** hỏi tình trạng còn hàng được phép, nhưng đợt này chưa thêm công cụ tồn/lịch trống trực tiếp. FAQ/hướng dẫn có thể giải thích cách kiểm tra; không tự xác nhận tồn hoặc giữ chỗ. Địa chỉ/giờ/chính sách chưa có dữ liệu xác nhận vẫn được nói rõ thiếu dữ kiện, không bịa để lấp chỗ trống.

## Kiểm chứng

- API offline dùng fixture guest đã xác minh và model stub: khái niệm điểm/cách tra mã/hỏi còn hàng được vào FAQ; hỏi số dư riêng không đọc nguồn riêng hoặc gọi model. Đây không phải đánh giá Gemini thật.
- Trình duyệt thật4000 sau nạp lại API: “Giá tắm và cắt tỉa” và “So sánh giá Hotel” đều trả giá từ backend thật, trạng thái Hỗ trợ tự động, draft xóa sau thành công. Không gọi Gemini trong các lượt này.
- Hồi quy266 kiểm tra offline và40 ca nghiệp vụ đạt. Thay đổi phạm vi này không thêm migration, quyền, source pool, polling hoặc request cho mỗi câu hỏi. Mô hình vẫn không nhận SQL/tên bảng/RPC tùy ý.

## Checklist

Đã sửa bảng tiến độ đầu file, trạng thái tổng quát và mục16, thay các tiêu đề giai đoạn cũ ở mục3–8 bằng nhóm yêu cầu. Mục3–15 giữ mã yêu cầu làm tham chiếu thay vì tạo bộ checkbox mâu thuẫn;nhật ký cũ ở phần riêng. G4.2 ghi nhận oracle cặp ngày đã làm;G5 ghi Cloud/web thực tế;G7 ghi backoff đã có;G8 ghi phần runtime đã triển khai. Không đánh dấu toàn bộ giai đoạn hoàn tất khi còn thiếu nghiệm thu.

Code chưa push;không phát sinh lượt Gemini hoặc schema Cloud mới trong đợt nới phân tuyến này.
