# Rà soát tích hợp giao diện phân quyền — 05/11/2026

Phạm vi: đối chiếu thiết kế giai đoạn 1, migration 165–176, giao diện STAFF và các bằng chứng kiểm thử. Giai đoạn 3 **hoàn thành trên môi trường thử nghiệm ngày 05/11/2026**: 300 nhóm tích hợp bằng Auth thật, 10 nhóm đổi mật khẩu Auth thật và 6 bài API đạt; nguồn khớp và tài nguyên bản sao đã dọn. Người dùng đã nghiệm thu các modal, gồm tạo khiếu nại từ hồ sơ ca/đơn, hội thoại và Phiếu ca dịch vụ; đánh giá khách giữ cho Quản lý theo lựa chọn người dùng. Chưa triển khai Cloud hoặc nghiệm thu trọn bộ PQ.

## Kết quả đối chiếu

| Nhóm | Kết quả giai đoạn 3 | Ranh giới hoặc kiểm tra các giai đoạn sau |
|---|---|---|
| Tài khoản và cổng truy cập | Hai vai trò độc quyền, không quyền riêng; xác minh CSDL trước tải; chặn loader/hash quản trị; đăng nhập qua form hai vai trò, hồi quy chín phân hệ và đổi mật khẩu Auth thật đạt | Nhiều tab/cập nhật phiên thuộc giai đoạn 4; bộ PQ thuộc giai đoạn 5 |
| Khách và thú cưng | Tra cứu có phạm vi, thêm/sửa, sổ địa chỉ, cân nặng, cảnh báo/ghi chú sức khỏe; hạng/Pawpoint chỉ đọc và ghi chú khách đã nghiệm thu; bộ nghiệp vụ Auth thật đạt | Nghiệm thu tổng hợp giai đoạn 5 |
| Lịch và dịch vụ | Tạo lịch ba nhóm, tiếp nhận, hạng mục của mình, chăm sóc, bàn giao, trả phòng, thu tiền; Mời đón bé và Phiếu ca dịch vụ đã nghiệm thu. Tiếp nhận ca/chuyến, phân trang và mất phản hồi ở trang sau đạt bằng Auth thật | Bộ PQ thuộc giai đoạn 5; không suy ra mọi biến thể quản trị cũ đã được kiểm thử |
| Bán hàng/kho | Tạo đơn tại quầy, ưu đãi theo máy chủ, thu tiền, tồn kho chỉ đọc; Phiếu bán hàng và Phiếu ca dịch vụ đã nghiệm thu | Điều phối giao hàng thuộc phần cấm STAFF tại mục 3 thiết kế giai đoạn 1, không phải chức năng còn thiếu cần mở thêm |
| Hội thoại | Hàng chờ tối thiểu, tự nhận, ghi chú riêng, phân trang, kết thúc và tạo khiếu nại đầy đủ nội dung đã nghiệm thu; kiểm thử bằng Auth thật đạt | AI và phiên thuộc giai đoạn 4 |
| Khiếu nại | Tạo phiếu chờ phân công, trao đổi/yêu cầu bổ sung, đề xuất chờ Quản lý duyệt; tạo từ hồ sơ ca/đơn và hội thoại đã nghiệm thu và kiểm thử Auth thật | Không mở quyền phân công hoặc đóng phiếu cho STAFF; bộ PQ thuộc giai đoạn 5 |
| Nhân sự cá nhân | Hồ sơ, lịch và đánh giá của người đăng nhập, tự đổi mật khẩu; kiểm tra ID ngoại lai, giao diện cá nhân và Auth thật đạt | Các biến thể tổng hợp tiếp tục ở bộ PQ giai đoạn 5 |
| Đánh giá khách | Người dùng đã chọn “Giữ Quản lý xử lý đánh giá (đề xuất)”. Nhân viên tiếp nhận phản hồi qua hội thoại và khiếu nại | Đã chốt phạm vi; không thêm trang đánh giá STAFF hoặc quyền tra cứu/kiểm duyệt |
| Chatbot AI và phiên | Chưa tích hợp công cụ AI theo STAFF, ngữ cảnh nhiều tab hoặc Realtime | Giữ ở giai đoạn 4; không coi trả lời hội thoại là đã phân quyền chatbot AI |

Đã đóng các khoảng trống giao diện trong phạm vi giai đoạn 3 bằng kết quả kiểm thử và lựa chọn phạm vi của người dùng. Không cấp thêm quyền bảng hoặc quyền riêng để làm giao diện; không suy ra đã hoàn thành AI/Realtime hoặc bộ PQ từ các RPC hiện có.

Đợt dọn thư mục ban đầu giữ nguyên 19 file và đạt 252 nhóm hồi quy/10 nhóm Auth. Sau khi người dùng làm rõ, các form đã được gộp vào JS phân hệ; tiếp đó các màn hình, cột bảng và nút tác vụ cũng được đưa về JS phân hệ. Hiện không còn thư mục `staff-workspace`; `admin.js` giữ phần điều hướng/bảng/phân trang chung, `admin-components.css` giữ kiểu trình bày chung. Trạng thái kết thúc đã được chốt trong bảng trên. Xem mục Kết thúc giai đoạn 3 trong [báo cáo giao diện](PAWPAL_GIAI_DOAN_3_GIAO_DIEN.md) để biết bằng chứng, cách chạy lại và giới hạn.

## Bổ sung từ rà soát: hội thoại

- Tab Chờ tiếp nhận chỉ đọc ID, thời gian, trạng thái và phiên bản hàng chờ; không tải nội dung/khách trước khi tự nhận.
- Tiếp nhận dùng `act_admin_chat` với phiên bản, CSDL quyết định người nhận; không có chọn hoặc chuyển cho đồng nghiệp.
- Trả lời và ghi chú riêng dùng cùng composer với lựa chọn rõ ràng; ghi chú cập nhật internal_note, không chèn tin nhắn cho khách. Lịch sử phân trang 10 dòng.
- Modal Kết thúc hội thoại yêu cầu chọn kết quả và xác nhận hoàn tất; lời mời đánh giá mặc định tắt. Chỉ ca đang do mình xử lý được kết thúc.
- Kết thúc xóa phân công theo RPC hiện có, nên không thể đọc lại nguyên văn để đoán đã lưu. Migration 172 thêm biên nhận theo đúng UUID và nhân viên của audit, chỉ trả request/conversation/operation; không trả nội dung audit hay cấp quyền đọc nhật ký thô.
- Migration 172 giữ nguyên các guard ghi, chỉ thêm phiên bản hàng chờ và RPC biên nhận có phạm vi. Triển khai sau 165–171; khôi phục ngược thứ tự.

Kết quả kiểm thử cuối và trạng thái nghiệm thu được cập nhật trong [báo cáo giao diện](PAWPAL_GIAI_DOAN_3_GIAO_DIEN.md) và [checklist](../../PAWPAL_CHECKLIST_PHAN_QUYEN_ADMIN.md).
