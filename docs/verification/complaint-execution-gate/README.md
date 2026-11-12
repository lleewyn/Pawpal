# Phê duyệt và bắt đầu xử lý khiếu nại

Ảnh quản lý đã được chụp lại: chỉ mở tab hồ sơ, cung cấp đề xuất và lịch sử kiểm thử đầy đủ, đợi phần tệp tải xong. Đã sửa bố cục thật của hai textarea để nhãn nằm trên ô nhập rộng toàn cột; ghi chú nội bộ nằm riêng. Nút duyệt bị khóa trong khi tải hoặc không có đề xuất khớp phương án. Kiểm tra giao diện xác nhận vị trí nhãn/ô nhập, ẩn danh sách khi xem hồ sơ, và bật/tắt duyệt theo dữ liệu đề xuất.

- Nhân viên được tự quyết “Giải thích và phản hồi” và “Từ chối khiếu nại”. Nội dung quyết định được gửi công khai vào trao đổi của phiếu Hỗ trợ cho khách.
- Các phương án bồi hoàn/đổi hàng/làm lại dịch vụ/đổi kỹ thuật viên được gửi thành đề xuất. Chỉ quản lý được duyệt hoặc từ chối, có kiểm tra tại CSDL.
- Chờ duyệt hoặc vừa được duyệt nhưng chưa bắt đầu đều hiển thị “Chờ xử lý” phía khách. Bộ đếm, bộ lọc, danh sách và chi tiết dùng cùng cách phân loại từ API.
- Thêm bước “Thông báo phương án và bắt đầu xử lý”. Chỉ dùng được với phương án đã duyệt; ghi phản hồi công khai gồm phương án và giá trị đã duyệt, đồng thời lưu thời điểm thông báo/bắt đầu trong cùng giao dịch. Đây là xác nhận bắt đầu của nhân viên; hoàn tất vẫn cần kết quả thực hiện nghiệp vụ thật.
- Chưa có bước bắt đầu thì không thể liên kết kết quả/hoàn tất. Sau bắt đầu, giao diện nhân viên có đường dẫn tới đơn hàng/lịch hẹn liên quan để xử lý theo quyền hiện có.
- Khi quản lý từ chối, nhân viên chỉ được chọn từ chối khiếu nại và phản hồi lý do cho khách. Không được bắt đầu phương án đã bị từ chối.
- Nhóm phê duyệt chỉ hiển thị cho quản lý. Các nút xử lý thay đổi theo giai đoạn; giữ việc bỏ tạo phiếu từ Chatbot ở thay đổi trước.

Migration `233_complaint_execution_gate.sql` đã áp dụng lên Supabase; không sửa dữ liệu nghiệp vụ hiện có. Phiếu đang xử lý cũ chưa có dấu mốc thông báo/bắt đầu sẽ hiển thị Chờ xử lý cho tới khi nhân viên xác nhận bước này. Không suy đoán lịch sử thực hiện.

## Kiểm tra

- `node scripts/test/complaint_execution_gate_cloud.cjs`: 16 kiểm tra đạt trên Supabase trong giao dịch luôn hoàn tác. Bao gồm từ chối tự duyệt/tự hoàn tiền của nhân viên, trạng thái trước/sau duyệt, chặn bắt đầu chưa duyệt, chặn hoàn tất chưa thông báo, phản hồi công khai đúng phương án, gửi lại không trùng, thống kê/phân trang và API cũ, nhánh từ chối, giải thích, phạm vi nhân viên. Không giữ lại đơn/phiếu thử, không chuyển tiền thật.
- `node scripts/test/complaint_execution_gate_ui.cjs`: đạt kiểm tra form nhân viên, đề xuất, bước thông báo/bắt đầu, nhánh từ chối, nhóm phê duyệt của quản lý và nút hoàn tất sau bắt đầu.
- `node scripts/test/user_support_execution_status_ui.cjs`: đạt kiểm tra các nhãn và bộ đếm phía khách.
- `node scripts/test/user_support_page_ui.cjs`: đạt kiểm tra phân trang danh sách/trao đổi và chi tiết phiếu ngoài trang.
- Kiểm tra cũ `user_support_sync_ui.cjs` hết thời gian khi chờ vùng đánh giá ở dòng 62. Bộ giả lập của bài này vẫn trả mảng cho API mặc định phân trang; chưa xác nhận được toàn bộ bài kiểm tra cũ. Các kiểm tra mới và kiểm tra phân trang phía trên đã đạt.

## Ảnh local

- [Trạng thái phía khách](user-statuses.png)
- [Nhân viên đề xuất phương án](staff-proposal.png)
- [Thông báo và bắt đầu xử lý](staff-notify-start.png)
- [Quản lý phê duyệt](manager-approval.png)

Ảnh sử dụng giao diện thật với dữ liệu kiểm thử và API cô lập, chưa phải kiểm thử xuyên suốt trên bản triển khai. Mã giao diện còn local, chưa push/triển khai.
