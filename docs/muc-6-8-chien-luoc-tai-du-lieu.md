## 6.8. Chiến lược tải dữ liệu

PawPal áp dụng chiến lược chuyển trang tức thì và tải dữ liệu tiết kiệm tài nguyên. Nguyên tắc chung là hiển thị nội dung chính trước, dùng lại dữ liệu đã tải và chỉ làm mới phần có thay đổi. Trong trang quản trị, chiến lược này giúp nhân viên chuyển qua lại giữa các phân hệ mà ít bị gián đoạn. Trên website và cổng tài khoản, hệ thống ưu tiên dữ liệu cần cho từng bước khách hàng đang thực hiện.

### 6.8.1. So sánh cách triển khai

**Bảng 6.8.1. So sánh chiến lược tải dữ liệu trên trang quản trị và phía khách hàng**

| Nội dung | Nguyên tắc chung | Trang quản trị | Website và cổng khách hàng |
| --- | --- | --- | --- |
| Chuyển trang và hiển thị ban đầu | Hiển thị khung trang trước và chỉ báo đang tải tại vùng thiếu dữ liệu. | Giữ thanh điều hướng và phần đầu trang khi đổi phân hệ. Khôi phục bộ lọc, trang danh sách hoặc vị trí cuộn ở màn hình có hỗ trợ. | Hiển thị tiêu đề và bộ lọc của Đơn hàng hoặc Lịch hẹn trong lúc tải danh sách. Trang chi tiết hiển thị thông tin sản phẩm chính trước. |
| Tải theo mức độ ưu tiên | Tải dữ liệu cần cho thao tác hiện tại trước. Phần phụ được tải khi người dùng cần đến. | Ưu tiên bảng hoặc nội dung chính của phân hệ đang mở. | Đánh giá và gợi ý được tải khi khách cuộn đến gần. Tùy chọn giao hàng được lấy khi mở mục tương ứng. Giá tham khảo được tải ở bước chọn dịch vụ. |
| Dùng lại dữ liệu và cập nhật ngầm | Dùng lại dữ liệu còn mới. Ở các màn hình có hỗ trợ, người dùng vẫn xem được dữ liệu đã lưu trong lúc hệ thống lấy bản mới. | Hiển thị lại bảng của phân hệ vừa xem từ dữ liệu đã lưu. | Dùng lại danh sách Đơn hàng và Lịch hẹn khi khách chuyển qua lại giữa các mục. |
| Làm mới dữ liệu và quản lý bộ nhớ tạm | Chỉ làm mới nhóm dữ liệu bị ảnh hưởng. Giới hạn số mục lưu và thời hạn sử dụng. | Khi có thao tác thêm, sửa hoặc xóa, hệ thống làm mới các nhóm dữ liệu liên quan, kể cả ở phân hệ khác nếu có liên kết. | Khi khách đổi hoặc hủy lịch, danh sách lịch hẹn được lấy lại. Dữ liệu riêng được phân theo tài khoản và xóa khi khách đăng xuất hoặc đổi phiên. |
| Kiểm soát và chuẩn bị yêu cầu | Gộp yêu cầu trùng đang chạy. Truy vấn độc lập có thể chạy song song. Chỉ tải trước tệp giao diện có khả năng được dùng. | Giới hạn số lượt đọc đồng thời để giảm tải cho cơ sở dữ liệu. | Cổng tài khoản có thể tải trước tệp giao diện khi khách đưa chuột lên mục điều hướng. Dữ liệu chỉ được yêu cầu khi mở mục cần dùng. |
| Giảm lượng dữ liệu truyền | Chia trang danh sách dài và chỉ lấy dữ liệu cần cho màn hình hiện tại. | Mỗi trang danh sách chỉ lấy các dòng và các trường cần hiển thị. | Chi tiết sản phẩm chỉ lấy sản phẩm đang xem. Giỏ hàng chỉ lấy các mặt hàng trong giỏ. Khi thanh toán, giá và tồn kho được lấy từ báo giá của đơn. |

### 6.8.2. Kết quả kiểm tra trên bản đang vận hành

**Trang quản trị.** Trong ba lượt đo, trung vị thời gian từ lúc chọn phân hệ đến khi bảng hiển thị ở lần mở đầu là **1,78 giây** với Bán hàng và **1,95 giây** với Dịch vụ. Khi quay lại hai phân hệ trong cùng phiên, bảng hiển thị trong **17 đến 26 phần nghìn giây** mà không cần chờ truy vấn mới.

**Website dành cho khách hàng.** Trung vị của ba lượt đo là **1,56 giây** để hiển thị chi tiết sản phẩm, **1,38 giây** để hiển thị giỏ hàng khách vãng lai và **4,15 giây** để mở biểu mẫu đặt lịch. Trong ba trường hợp đối chiếu, dữ liệu trả về cho một sản phẩm khoảng **4,0 đến 4,4 kilôbyte**, so với **138 kilôbyte** khi lấy cả danh mục. Biểu mẫu đặt lịch vẫn là màn hình có thời gian chờ dài nhất trong ba màn hình được đo.
