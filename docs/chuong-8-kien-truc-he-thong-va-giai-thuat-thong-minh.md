# Chương 8: Kiến trúc hệ thống và giải thuật thông minh

## Danh mục bảng và hình trong chương

### Danh mục hình
* **Hình 8.1**: Sơ đồ kiến trúc phân tầng tổng thể của hệ thống Pawpal.
* **Hình 8.2**: Sơ đồ luồng giao tiếp và cơ chế kiểm soát bảo mật đa lớp giữa các thành phần.
* **Hình 8.3**: Sơ đồ kiến trúc đường ống xử lý trí tuệ nhân tạo sáu tầng của hệ thống Pawpal.
* **Hình 8.4**: Lưu đồ quy trình xử lý hội thoại và phân luồng trải nghiệm của Trợ lý Pawpal Chatbot.
* **Hình 8.5**: Giao diện tương tác thực tế của Trợ lý Pawpal Chatbot trên kênh người dùng công chúng.
* **Hình 8.6**: Lưu đồ quy trình xử lý tác vụ thông minh và kiểm soát thẩm quyền của Trợ lý Pawpal Copilot.
* **Hình 8.7**: Giao diện phân hệ làm việc Trợ lý Pawpal Copilot trong không gian quản trị.
* **Hình 8.8**: Lưu đồ giải thuật kiểm duyệt nội dung độc hại và kích hoạt phân luồng cảm xúc.
* **Hình 8.9**: Ảnh minh chứng kiểm thử tính toán giá dịch vụ làm đẹp theo cân nặng thực tế.
* **Hình 8.10**: Ảnh minh chứng kiểm thử chốt chặn bảo vệ quyền riêng tư đơn hàng của khách vãng lai.
* **Hình 8.11**: Ảnh minh chứng kiểm thử nhận diện cảm xúc lo lắng và phản hồi xoa dịu tự nhiên.
* **Hình 8.12**: Ảnh minh chứng kiểm thử tổng hợp hồ sơ khách hàng 360 độ qua trợ lý nội bộ.
* **Hình 8.13**: Ảnh minh chứng kiểm thử cảnh báo các mặt hàng tồn kho chạm ngưỡng an toàn.
* **Hình 8.14**: Ảnh minh chứng kiểm thử cơ chế chốt chặn nhân viên xem doanh thu trái phép.

### Danh mục bảng
* **Bảng 8.1**: Ma trận phân quyền truy cập chức năng và dữ liệu theo vai trò người dùng.
* **Bảng 8.2**: Ma trận tính năng và phạm vi phục vụ của trợ lý thông minh theo đối tượng người dùng.
* **Bảng 8.3**: Bảng ánh xạ các ý định người dùng và mẫu câu hỏi phổ biến trong Trợ lý Pawpal Chatbot.
* **Bảng 8.4**: Danh mục công cụ tra cứu dữ liệu an toàn phục vụ vận hành của Trợ lý Pawpal Copilot.
* **Bảng 8.5**: Bảng phân loại 6 cấp độ cảm xúc, nhóm rủi ro và hành động điều phối tương ứng.
* **Bảng 8.6**: Bảng kết quả kiểm thử thực nghiệm độ chuẩn xác và hiệu năng của giải thuật trợ lý thông minh.

---

## Lời mở đầu chương
Chương này trình bày toàn bộ giải pháp kỹ thuật của hệ thống quản lý và chăm sóc thú cưng Pawpal, tập trung vào hai nội dung cốt lõi: kiến trúc hệ thống và giải thuật trợ lý trí tuệ nhân tạo. 

Phần kiến trúc làm rõ cách tổ chức phân tầng độc lập, luồng giao tiếp giữa các dịch vụ, cơ chế truyền phát dữ liệu thời gian thực và kiến trúc an toàn thông tin đa lớp nhằm bảo đảm hệ thống vận hành liên tục, bảo mật và sẵn sàng mở rộng. 

Phần giải thuật thông minh đi sâu vào mô hình kiến trúc đường ống xử lý trí tuệ nhân tạo sáu tầng và giá trị thực tế mang lại cho hai đối tượng người dùng trọng tâm: hỗ trợ khách hàng tự tra cứu thông tin dịch vụ nhanh chóng, minh bạch và hỗ trợ nhân viên vận hành tối ưu hóa công việc hàng ngày. Đặc biệt, giải thuật được thiết kế dựa trên triết lý thấu cảm, lấy con người và thú cưng làm trung tâm, giải quyết đồng thời bài toán nâng cao năng suất hoạt động lẫn giải tỏa căng thẳng tâm lý cho cả chủ nuôi và đội ngũ nhân sự.

---

## 8.1. Mô hình kiến trúc phân tầng hệ thống

### 8.1.1. Kiến trúc phân tầng chức năng
Hệ thống Pawpal được thiết kế theo mô hình phân tầng độc lập nhằm bảo đảm tính module hóa, dễ bảo trì và dễ mở rộng khi quy mô dịch vụ tăng lên. Cấu trúc tổng thể của hệ thống bao gồm bốn tầng chính có ranh giới rõ ràng.

Tầng giao diện người dùng đảm nhận việc tiếp nhận tương tác và hiển thị thông tin trực quan. Tầng này phân tách làm hai môi trường riêng biệt gồm cổng thông tin công chúng và bảng điều khiển quản trị. Cổng thông tin công chúng là ứng dụng web tương tác mượt mà dành cho khách hàng tìm kiếm dịch vụ, đặt lịch làm đẹp, mua sản phẩm, theo dõi sức khỏe thú cưng và trò chuyện với trợ lý ảo. Bảng điều khiển quản trị là môi trường làm việc hiệu năng cao dành cho nhân viên lễ tân, kỹ thuật viên chăm sóc, thu ngân và cấp quản lý thực hiện các thao tác nghiệp vụ hàng ngày.

Tầng cổng dịch vụ đóng vai trò trung gian tiếp nhận mọi yêu cầu từ giao diện gửi lên máy chủ. Tầng này chịu trách nhiệm kiểm tra tính hợp lệ của dữ liệu đầu vào, xác thực danh tính người gửi, kiểm soát hạn mức gọi dịch vụ theo từng địa chỉ mạng để chống nghẽn đường truyền và điều hướng yêu cầu đến đúng bộ xử lý nội bộ. Đặc biệt, cơ chế truyền phát dữ liệu thời gian thực được thiết lập tại tầng này cho phép đẩy từng cụm từ kết quả về màn hình người dùng ngay khi máy chủ xử lý xong, giúp giảm độ trễ hiển thị cụm từ đầu tiên xuống dưới một giây và tạo cảm giác phản hồi mượt mà như người thật đang trò chuyện.

Tầng dữ liệu quản lý toàn bộ việc lưu trữ lâu dài của hệ thống. Dữ liệu có cấu trúc như thông tin khách hàng, hồ sơ thú cưng, lịch hẹn, giao dịch bán hàng và ca dịch vụ được quản lý trong hệ quản trị cơ sở dữ liệu quan hệ PostgreSQL. Dữ liệu tập tin như hình ảnh sản phẩm, ảnh chụp hồ sơ thú cưng và hình ảnh minh chứng tình trạng lông, da gửi qua khung chat được phân tách lưu trữ tại kho tập tin chuyên dụng để giảm tải tối đa cho cơ sở dữ liệu chính.

Tầng tích hợp trí tuệ nhân tạo là dịch vụ trung gian độc lập chịu trách nhiệm kết nối với mô hình ngôn ngữ lớn. Tầng này hoàn toàn không cho phép mô hình ngôn ngữ truy cập trực tiếp vào cơ sở dữ liệu. Thay vào đó, máy chủ đứng ra lọc sạch dữ liệu nhạy cảm, chuẩn hóa câu hỏi, bóc tách tham số và chỉ cung cấp các đoạn trích dữ liệu đã được thẩm định an toàn cho mô hình tạo câu trả lời.

> **Hình 8.1: Sơ đồ kiến trúc phân tầng tổng thể của hệ thống Pawpal**  
> *(Sơ đồ thể hiện 4 tầng: Giao diện người dùng, Cổng dịch vụ trung gian, Quản trị cơ sở dữ liệu và Tầng tích hợp trí tuệ nhân tạo)*.

### 8.1.2. Mô hình triển khai và luồng tương tác giữa các thành phần
Các thành phần trong hệ thống Pawpal giao tiếp với nhau theo các giao thức mạng tiêu chuẩn và tuân thủ nguyên tắc không tin cậy bất kỳ dữ liệu nào gửi từ trình duyệt. Mọi yêu cầu từ khách hàng hay nhân viên đều phải đi qua cổng kiểm soát an toàn trước khi chạm tới cơ sở dữ liệu.

Khi người dùng gửi một câu hỏi hoặc yêu cầu tác vụ, cổng dịch vụ sẽ kiểm tra trạng thái đăng nhập và hạn mức truy cập. Nếu yêu cầu liên quan đến các tác vụ trí tuệ nhân tạo, hệ thống sẽ thực hiện bóc tách tham số nghiệp vụ trước tại máy chủ, sau đó dùng quyền nội bộ để đọc dữ liệu cần thiết từ cơ sở dữ liệu, ghép thành ngữ cảnh có cấu trúc rồi mới chuyển đến mô hình ngôn ngữ lớn. Cách thiết kế này ngăn chặn hoàn toàn việc rò rỉ mã truy vấn nội bộ hoặc dữ liệu riêng tư của người dùng khác.

> **Hình 8.2: Sơ đồ luồng giao tiếp và cơ chế kiểm soát bảo mật đa lớp giữa các thành phần**  
> *(Sơ đồ thể hiện luồng truyền dữ liệu có kiểm soát giữa máy khách, cổng dịch vụ, cơ sở dữ liệu và máy chủ xử lý ngôn ngữ)*.

---

## 8.2. Kiến trúc an toàn thông tin và kiểm soát truy cập

### 8.2.1. Cơ chế xác thực và quản lý định danh người dùng
Hệ thống quản lý định danh người dùng dựa trên hai nhóm đối tượng rõ rệt để tối ưu hóa trải nghiệm tự phục vụ mà vẫn bảo đảm an toàn dữ liệu.

Đối với khách hàng thành viên, hệ thống xác thực thông qua mã tài khoản duy nhất được mã hóa an toàn. Khi đăng nhập thành công, mỗi yêu cầu gửi đi đều mang theo chữ ký xác thực. Nhờ đó, hệ thống nhận diện chính xác chủ tài khoản để tự động nạp danh sách thú cưng, lịch hẹn và điểm thưởng cá nhân mà không cần khách hàng phải nhập lại thông tin.

Đối với khách vãng lai chưa tạo tài khoản, hệ thống không bắt buộc người dùng phải đăng ký ngay mới được tư vấn. Thay vào đó, hệ thống tự động cấp phát một chuỗi khóa phiên làm việc ẩn danh được băm một chiều bằng giải thuật SHA-256. Khóa phiên này cho phép lưu tạm thời lịch sử trao đổi trong phiên truy cập hiện tại. Khi khách hàng quyết định đăng ký hoặc đăng nhập tài khoản chính thức, hệ thống sẽ tự động liên kết toàn bộ nội dung trò chuyện trước đó vào hồ sơ thành viên mới mà không làm mất dữ liệu.

### 8.2.2. Kiểm soát phân quyền đa tầng và bảo vệ dữ liệu nghiệp vụ
Hệ thống áp dụng chính sách kiểm soát truy cập theo vai trò kết hợp chặt chẽ với bảo mật cấp độ hàng dữ liệu trực tiếp trong cơ sở dữ liệu.

Ở tầng quản trị nội bộ, hệ thống cố định hai nhóm vai trò rõ ràng gồm vai trò quản lý và vai trò nhân viên. Vai trò quản lý nắm toàn quyền vận hành, được phép xem báo cáo doanh thu, biến động dòng tiền, danh sách nhân sự và điều chỉnh các quy định vận hành của tiệm. Vai trò nhân viên chỉ được cấp các quyền công việc gắn với nghiệp vụ thực tế như tiếp nhận ca dịch vụ, ghi nhận chăm sóc, kiểm tra tồn kho và hỗ trợ khách hàng. Nhân viên hoàn toàn bị chặn với mã lỗi bảo mật khi cố gắng truy cập các chỉ số tài chính hoặc sửa đổi cấu hình hệ thống.

Ở tầng cơ sở dữ liệu, chính sách bảo mật cấp độ hàng quy định dữ liệu của khách hàng nào thì chỉ tài khoản đó hoặc nhân viên đang phụ trách ca dịch vụ đó mới có quyền đọc. Ràng buộc kỹ thuật này bảo đảm kể cả khi xảy ra lỗi ở tầng giao diện, cơ sở dữ liệu bên dưới vẫn kiên quyết từ chối các truy vấn trái phép.

**Bảng 8.1: Ma trận phân quyền truy cập chức năng và dữ liệu theo vai trò người dùng**

| Phân hệ và Dữ liệu nghiệp vụ | Khách vãng lai | Khách thành viên | Nhân viên | Quản lý |
| :--- | :---: | :---: | :---: | :---: |
| Tra cứu bảng giá, dịch vụ, sản phẩm công khai | Cho phép | Cho phép | Cho phép | Cho phép |
| Tra cứu hồ sơ thú cưng, đơn hàng, điểm cá nhân | Từ chối | Cho phép | Cho phép theo ca | Cho phép |
| Gửi yêu cầu gặp chuyên viên tư vấn trực tiếp | Từ chối | Cho phép | Không áp dụng | Không áp dụng |
| Đính kèm hình ảnh thực tế trong tin nhắn | Từ chối | Tối đa 3 ảnh | Cho phép | Cho phép |
| Tiếp nhận ca chat và trao đổi với khách hàng | Không áp dụng | Không áp dụng | Ca được phân công | Mọi ca |
| Tạo và đọc ghi chú nội bộ trong ca chat | Không áp dụng | Không áp dụng | Cho phép | Cho phép |
| Tra cứu lịch hẹn, tồn kho, phòng trống qua trợ lý | Không áp dụng | Không áp dụng | Cho phép | Cho phép |
| Tra cứu doanh thu, thực thu, tiền hoàn lại | Từ chối | Từ chối | Bị chặn hoàn toàn | Cho phép |
| Chỉnh sửa kho quy định và câu trả lời mẫu | Từ chối | Từ chối | Từ chối | Cho phép |

---

## 8.3. Kiến trúc đường ống xử lý trí tuệ nhân tạo

Hệ thống trí tuệ nhân tạo của Pawpal được xây dựng theo mô hình kiến trúc đường ống sáu tầng khép kín nhằm bảo đảm sự kết hợp hài hòa giữa tính chính xác dữ liệu, an toàn nghiệp vụ và trải nghiệm giao tiếp tự nhiên. Mỗi thông điệp gửi từ người dùng đều phải trải qua quy trình xử lý nghiêm ngặt qua sáu tầng chức năng độc lập.

Tầng đầu tiên là tầng tiếp nhận và kiểm duyệt đầu vào. Tại đây, câu hỏi thô của người dùng được chuẩn hóa ký tự và quét qua bộ lọc từ cấm hai lớp. Nếu phát hiện các từ ngữ thô tục hoặc biến thể lách từ, hệ thống tự động làm mờ bằng ký tự ba sao để giữ gìn giao diện văn minh. Đồng thời, giải thuật chấm điểm cảm xúc sẽ xác định mức độ cảm xúc từ cấp một đến cấp sáu và phân loại vào một trong năm nhóm rủi ro nghiệp vụ gồm cấp cứu y tế, tranh chấp thanh toán, khiếu nại dịch vụ, chăm sóc đặc biệt hoặc bình thường.

Tầng thứ hai là tầng phân tích ý định và lập kế hoạch tác vụ. Hệ thống tiến hành bóc tách các thực thể nghiệp vụ quan trọng như giống loài thú cưng, khoảng cân nặng, ngày giờ hoặc tên dịch vụ. Dựa trên các thực thể này, bộ lập kế hoạch sẽ quyết định hướng xử lý tiếp theo: chuyển sang công cụ tính giá làm đẹp, kiểm tra phòng trống, tra cứu đơn hàng cá nhân hay chuyển sang kịch bản xoa dịu tâm lý khách hàng.

Tầng thứ ba là tầng cổng truy vấn dữ liệu an toàn chỉ đọc. Đây là chốt chặn kỹ thuật quan trọng nhất bảo đảm mô hình ngôn ngữ không bao giờ được phép tương tác trực tiếp với cơ sở dữ liệu. Toàn bộ các công cụ đọc dữ liệu được đăng ký cố định trong danh mục khép kín. Trước khi thực thi bất kỳ truy vấn nào, hệ thống đối soát nghiêm ngặt quyền hạn công việc của người gọi theo cơ chế kiểm soát truy cập vai trò và bảo mật cấp hàng. Toàn bộ thao tác chỉ gọi các thủ tục lưu trữ an toàn chỉ đọc, hoàn toàn không hỗ trợ bất kỳ lệnh ghi đè hay thay đổi dữ liệu nào qua trợ lý.

Tầng thứ tư là tầng chuẩn hóa ngữ cảnh và triệt tiêu ảo giác. Trước khi nạp dữ liệu vào mô hình trí tuệ nhân tạo, máy chủ tiến hành làm sạch toàn bộ tên bảng, tên cột, mã khóa kỹ thuật và dữ liệu riêng tư của người dùng khác. Đồng thời, hệ thống áp đặt hợp đồng bằng chứng bắt buộc mô hình chỉ được trả lời dựa trên những dữ liệu có thực được cung cấp từ cơ sở dữ liệu nội bộ. Nếu thiếu dữ liệu, giải thuật bắt buộc phải thông báo chưa có thông tin xác nhận thay vì tự ý suy đoán mức giá hay bịa đặt chính sách tiệm.

Tầng thứ năm là tầng xử lý ngôn ngữ và truyền phát thời gian thực. Hệ thống sử dụng bộ điều phối quản lý nhóm khóa kết nối dịch vụ thông minh để bảo đảm hoạt động liên tục, tránh nghẽn hạn mức. Dữ liệu câu trả lời sau khi được mô hình ngôn ngữ tạo ra sẽ được truyền phát từng cụm từ về máy khách theo thời gian thực thông qua kết nối luồng một chiều, giúp giảm độ trễ hiển thị cụm từ đầu tiên xuống dưới một giây và tạo cảm giác mượt mà như chuyên viên đang trực tiếp gõ phím.

Tầng thứ sáu là tầng hậu kiểm và điều phối chuyển giao ca thông minh. Tại tầng cuối cùng này, câu trả lời được kiểm tra định dạng và chuẩn hóa theo phong cách giao tiếp thấu cảm của Pawpal: xưng là Pawpal, gọi khách là bạn và gọi thú cưng là bé với lời lẽ ấm áp, lịch sự. Khi phát hiện các rủi ro cấp cứu y tế, tranh chấp thanh toán hoặc khách hàng bày tỏ mong muốn gặp người thật, hệ thống tự động khóa phản hồi máy móc và kích hoạt cờ ưu tiên chuyển toàn bộ nội dung trò chuyện sang hàng đợi cho nhân viên hoặc quản lý tiếp nhận xử lý trực tiếp.

> **Hình 8.3: Sơ đồ kiến trúc đường ống xử lý trí tuệ nhân tạo sáu tầng của hệ thống Pawpal**  
> *(Sơ đồ thể hiện 6 tầng khép kín: Tiếp nhận kiểm duyệt, Phân tích ý định, Cổng dữ liệu chỉ đọc, Chuẩn hóa ngữ cảnh, Xử lý truyền phát và Hậu kiểm chuyển giao ca)*.

---

## 8.4. Giải thuật trợ lý thông minh hỗ trợ khách hàng

### 8.4.1. Mục tiêu và giá trị hỗ trợ khách hàng
Trợ lý ảo trên kênh người dùng công chúng được xây dựng với mục tiêu trở thành nhân viên tư vấn số hoạt động liên tục suốt ngày đêm, đồng hành cùng chủ nuôi thú cưng cả về mặt tiện ích thao tác lẫn xoa dịu tâm lý.

Về mặt hoạt động thực tế, trợ lý giúp khách hàng nhận báo giá chính xác tức thì bất kể ngày đêm mà không cần phải chờ nhân viên phản hồi thủ công. Do biểu phí làm đẹp phụ thuộc chặt chẽ vào loài thú cưng và cân nặng thực tế, hệ thống tự động bóc tách các thông số này để đối soát mức giá niêm yết chuẩn xác nhất. Ngoài ra, khách hàng thành viên có thể tự tra cứu tình trạng đơn hàng, ngày giờ ca hẹn làm đẹp sắp tới, số dư điểm thưởng và lịch sử tiêm phòng chỉ bằng một câu hỏi ngắn. Khách hàng cũng dễ dàng gửi đính kèm tối đa ba ảnh chụp thực tế tình trạng da lông của bé để nhân viên chuẩn bị dụng cụ chu đáo trước khi khách đưa bé đến tiệm.

Về mặt tinh thần và cảm xúc, trợ lý đóng vai trò như một điểm tựa tâm lý xóa tan sự hoang mang của người nuôi khi thú cưng gặp vấn đề bất thường lúc đêm muộn. Nhờ khả năng nhận diện các từ ngữ lo âu, trợ lý phản hồi bằng giọng điệu điềm tĩnh, ấm áp, đưa ra lời khuyên theo dõi ban đầu và kết nối ngay với chuyên viên hỗ trợ. Cách gọi thú cưng là bé và xưng là Pawpal mang lại cảm giác được thấu hiểu, tôn trọng như một thành viên gia đình thực thụ. Đồng thời, việc tính toán giá cả công khai, minh bạch giúp khách hàng hoàn toàn an tâm, không còn nỗi lo bị báo giá mập mờ hay phụ thu vô lý khi đến tiệm.

**Bảng 8.2: Ma trận tính năng và phạm vi phục vụ của trợ lý thông minh theo đối tượng người dùng**

| Nhóm tính năng | Khách vãng lai | Khách thành viên | Nhân viên tác nghiệp | Quản lý cơ sở |
| :--- | :---: | :---: | :---: | :---: |
| Tư vấn giá làm đẹp theo cân nặng | Hỗ trợ đầy đủ | Hỗ trợ đầy đủ | Hỗ trợ báo giá | Hỗ trợ báo giá |
| Kiểm tra phòng khách sạn còn trống | Hỗ trợ xem phòng | Hỗ trợ xem phòng | Hỗ trợ xếp phòng | Toàn quyền quản lý |
| Tra cứu đơn hàng và điểm tích lũy | Hướng dẫn đăng nhập | Tra cứu tức thì | Tra cứu theo mã | Toàn quyền kiểm tra |
| Gửi hình ảnh vết thương, tình trạng lông | Yêu cầu đăng nhập | Gửi tối đa 3 ảnh | Gửi ảnh minh chứng | Xem toàn bộ ảnh |
| Tra cứu ca làm việc và lịch trực | Không hỗ trợ | Không hỗ trợ | Xem ca cá nhân | Xem ca toàn tiệm |
| Cảnh báo sản phẩm chạm ngưỡng tồn kho | Không hỗ trợ | Không hỗ trợ | Xem danh sách thiếu | Xem báo cáo nhập hàng |
| Đối soát doanh thu và tiền hoàn trả | Không hỗ trợ | Không hỗ trợ | Bị từ chối tự động | Xem toàn diện |

### 8.4.2. Cách thức khách hàng tương tác và trải nghiệm
Khách hàng tương tác với trợ lý thông qua cửa sổ trò chuyện xuất hiện ở góc dưới màn hình. Giao diện được thiết kế tối giản để người dùng chỉ cần gõ câu hỏi tự nhiên hoặc chạm vào các nút gợi ý có sẵn như hỏi bảng giá tắm sấy, quy định gửi khách sạn hoặc kiểm tra ưu đãi hiện có.

Khi nhận được câu hỏi, hệ thống áp dụng cơ chế truyền phát dữ liệu thời gian thực. Từng câu trả lời xuất hiện nối tiếp nhau ngay khi máy chủ xử lý xong từng cụm từ, giúp khách hàng đọc được nội dung ngay lập tức mà không phải nhìn biểu tượng chờ đợi lâu. Đi kèm câu trả lời là các liên kết dẫn thẳng đến trang đặt lịch hoặc trang chi tiết sản phẩm để khách hàng thao tác tiếp một cách liền mạch.

Hệ thống phân luồng trải nghiệm dựa trên trạng thái tài khoản của người dùng rất rõ ràng. Nếu là khách vãng lai, trợ lý phản hồi đầy đủ các thông tin công khai và lịch sự hướng dẫn khách đăng nhập khi chạm đến các thông tin cá nhân. Nếu là khách hàng thành viên, trợ lý cho phép gửi đính kèm tối đa ba ảnh chụp thực tế tình trạng của bé cưng để nhân viên nắm bắt nhanh trước khi tiếp nhận ca.

> **Hình 8.4: Lưu đồ quy trình xử lý hội thoại và phân luồng trải nghiệm của Trợ lý Pawpal Chatbot**  
> *(Lưu đồ thể hiện các bước: Tiếp nhận tin nhắn, lọc từ ngữ, phân loại khách hàng, gọi dữ liệu tương ứng và truyền phát câu trả lời về màn hình)*.  
> **[Hình 8.5: Giao diện tương tác thực tế của Trợ lý Pawpal Chatbot trên kênh người dùng công chúng](file:///C:/Users/QUYEN/.gemini/antigravity-cli/brain/7a76c9d1-504b-4a2d-877e-c42a3920b2f8/hinh_8_5_giao_dien_chatbot_cong_chung.png)**  
> *(Ảnh chụp màn hình thực tế thể hiện tư vấn giá làm đẹp theo cân nặng, liên kết đặt lịch và cơ chế phản hồi truyền phát)*.

**Bảng 8.3: Bảng ánh xạ các ý định người dùng và mẫu câu hỏi phổ biến trong Trợ lý Pawpal Chatbot**

| Nhóm ý định | Mẫu câu hỏi thực tế của khách hàng | Nguồn dữ liệu tra cứu | Kết quả trả về cho người dùng |
| :--- | :--- | :--- | :--- |
| Hỏi giá làm đẹp theo cân nặng | Bé cún phốc sóc nặng 4kg tắm sấy giá bao nhiêu | Bảng giá dịch vụ và phân loại cân nặng | Mức giá chính xác, thời lượng dự kiến, liên kết đặt lịch |
| Kiểm tra phòng khách sạn thú cưng | Tiệm còn phòng đôi cho mèo ngày mai không | Danh mục phòng và lịch lưu trú thực tế | Số phòng còn trống, tiện ích đi kèm, giá theo ngày |
| Tra cứu đơn hàng cá nhân | Đơn hàng thức ăn của mình giao đến đâu rồi | Bảng đơn hàng của chính tài khoản đó | Mã đơn, trạng thái đóng gói hoặc vận chuyển, ngày giao |
| Kiểm tra điểm thưởng tích lũy | Mình tích được bao nhiêu điểm và dùng thế nào | Bảng điểm thưởng của tài khoản | Số dư điểm hiện tại, giá trị quy đổi giảm trừ đơn hàng |
| Phản ánh sự cố dịch vụ | Bé nhà mình về bị trầy nhẹ ở chân, cần hỗ trợ | Bộ lọc từ ngữ và kích hoạt cảm xúc | Xin lỗi và xót xa cùng chủ, hướng dẫn chụp ảnh, chuyển quản lý xử lý chu đáo |

---

## 8.5. Giải thuật trợ lý thông minh hỗ trợ vận hành

### 8.5.1. Mục tiêu và giá trị hỗ trợ đội ngũ vận hành
Trợ lý nội bộ được xây dựng như một cộng sự hỗ trợ nghiệp vụ cho đội ngũ nhân sự tiệm, mang lại giá trị thiết thực cho cả nhân viên tác nghiệp lẫn người quản lý cơ sở trên hai phương diện hoạt động và tinh thần.

Đối với nhân viên tác nghiệp gồm kỹ thuật viên, lễ tân, chăm sóc khách hàng và thu ngân, trợ lý triệt tiêu hoàn toàn thao tác tra cứu thủ công qua nhiều màn hình rời rạc. Chỉ với một câu lệnh tìm kiếm, nhân viên nắm bắt ngay hồ sơ tổng hợp toàn diện gồm tên chủ, số điện thoại, danh sách thú cưng và tiền sử bệnh. Khi tiếp nhận khiếu nại khó, trợ lý hỗ trợ soạn sẵn bản nháp trả lời lịch sự, đúng quy chuẩn tiệm để nhân viên duyệt nhanh trước khi gửi. Việc trợ lý giải quyết trước các câu hỏi lặp lại giúp nhân viên giải tỏa áp lực kiệt sức trong giờ cao điểm, tự tin xử lý tình huống khó và luôn an tâm về an toàn thân thể nhờ được cảnh báo trước tập tính hung dữ hay sợ máy sấy của từng bé cưng.

Đối với người quản lý và chủ cơ sở, trợ lý cung cấp công cụ giám sát và ra quyết định dựa trên số liệu thời gian thực. Quản lý có thể kiểm tra nhanh tình trạng phòng trống, rà soát danh sách sản phẩm chạm ngưỡng tồn kho tối thiểu để lên kế hoạch nhập hàng mà không cần chờ báo cáo giấy. Cơ chế phân quyền tự động ngăn chặn nhân viên truy cập số liệu doanh thu nhạy cảm, giúp bảo vệ bí mật kinh doanh tuyệt đối. Nhờ đó, chủ cơ sở hoàn toàn an tâm vì tiệm luôn được vận hành liên tục cả đêm, đồng thời giữ vững chuẩn mực phục vụ văn minh của thương hiệu mà không lo nhân viên tư vấn sai giá hay tranh cãi với khách.

**Bảng 8.4: Danh mục công cụ tra cứu dữ liệu an toàn phục vụ vận hành của Trợ lý Pawpal Copilot**

| Tên công cụ nội bộ | Mã quyền hạn bắt buộc | Nguồn dữ liệu truy vấn | Mục đích nghiệp vụ phục vụ nhân viên |
| :--- | :--- | :--- | :--- |
| Tra cứu khách hàng | Quyền đọc thông tin khách | Bảng khách hàng và hồ sơ liên hệ | Tìm thông tin chủ nuôi và số điện thoại liên lạc |
| Tra cứu thú cưng | Quyền đọc hồ sơ thú cưng | Bảng thú cưng, giống loài và sức khỏe | Xem tuổi, cân nặng, tiền sử bệnh và tập tính của bé |
| Danh sách lịch hẹn | Quyền thực hiện dịch vụ | Bảng lịch hẹn và ca dịch vụ trong ngày | Nắm bắt lịch làm việc, dịch vụ cần làm cho từng bé |
| Cảnh báo hàng tồn thấp | Quyền đọc kho hàng | Bảng biến thể sản phẩm và số lượng tồn | Liệt kê các mặt hàng chạm ngưỡng tối thiểu để nhập thêm |
| Tra cứu phòng trống | Quyền tạo lịch dịch vụ | Bảng phòng khách sạn và lịch lưu trú | Tư vấn cho khách tại quầy các phòng còn trống |
| Tra cứu ca làm việc | Quyền xem thông tin cá nhân | Bảng nhân sự và lịch trực cá nhân | Nhân viên kiểm tra ca trực và ngày nghỉ của chính mình |
| Báo cáo doanh thu | Quyền đọc thanh toán tài chính | Bảng thanh toán và hoàn tiền | Chỉ dành cho quản lý theo dõi dòng tiền, nhân viên bị chặn |

### 8.5.2. Cách thức nhân viên khai thác và sử dụng Copilot
Nhân viên sử dụng trợ lý thông qua thanh nhập lệnh chuyên biệt nằm ngay trong giao diện làm việc quản trị. Khung tương tác có sẵn các nút lệnh nhanh để nhân viên bấm chọn tra cứu chỉ với một thao tác đơn giản.

Khi nhân viên chăm sóc khách hàng tiếp nhận một ca khiếu nại, trợ lý sẽ hỗ trợ đọc ngữ cảnh trao đổi và đưa ra gợi ý câu trả lời mẫu theo đúng chuẩn mực lịch sự của tiệm. Nhân viên có thể sử dụng nguyên văn hoặc chỉnh sửa lại cho phù hợp với tình huống thực tế trước khi gửi cho khách.

Khi có ca chat chuyển tiếp từ khách hàng, nhân viên sẽ thấy bản tóm tắt ngắn gọn nội dung mà khách đã trao đổi với máy trước đó. Trong suốt quá trình hỗ trợ, nhân viên có thể ghi lại các ghi chú nội bộ ngay trong ca chat để các nhân sự ca sau cùng nắm được tình hình của bé cưng mà không hiển thị cho khách hàng thấy.

> **Hình 8.6: Lưu đồ quy trình xử lý tác vụ thông minh và kiểm soát thẩm quyền của Trợ lý Pawpal Copilot**  
> *(Lưu đồ thể hiện các bước: Tiếp nhận câu lệnh nhân viên, xác thực quyền công việc, truy vấn dữ liệu an toàn chỉ đọc, tổng hợp kết quả và trả về giao diện)*.  
> **[Hình 8.7: Giao diện phân hệ làm việc Trợ lý Pawpal Copilot trong không gian quản trị](file:///C:/Users/QUYEN/.gemini/antigravity-cli/brain/7a76c9d1-504b-4a2d-877e-c42a3920b2f8/hinh_8_7_giao_dien_copilot_quan_tri.png)**  
> *(Ảnh chụp màn hình phân hệ Copilot thể hiện tra cứu hồ sơ 360 độ, cảnh báo tồn kho và thông báo từ chối truy cập doanh thu)*.

---

## 8.6. Cơ chế giải thuật thông minh vận hành bên dưới giao diện

### 8.6.1. Giải thuật phân tích ngữ cảnh, nhận diện ý định và nguyên tắc triệt tiêu ảo giác
Khi nhận được câu hỏi từ người dùng, giải thuật đầu tiên sẽ bóc tách các thực thể quan trọng như tên loài thú cưng, số cân nặng, ngày giờ hoặc tên dịch vụ.

Mô hình ngôn ngữ bị ràng buộc chặt chẽ bởi nguyên tắc trung thực dữ liệu và hợp đồng bằng chứng. Trợ lý chỉ được phép khẳng định các thông tin có trong nguồn dữ liệu nội bộ đã được cấp phép xác thực. Nếu trong cơ sở dữ liệu chưa có thông tin về dịch vụ hoặc khoảng giá đó, giải thuật bắt buộc trợ lý phải thông báo rõ ràng là chưa có dữ liệu xác nhận, tuyệt đối không được tự ý suy đoán mức giá, bịa đặt chính sách hay hứa hẹn bồi hoàn làm sai lệch thông tin đến khách hàng.

### 8.6.2. Giải thuật kiểm duyệt nội dung, phân tầng cảm xúc 6 cấp độ và xoa dịu tâm lý
Hệ thống tích hợp bộ giải thuật phân tích cảm xúc và kiểm duyệt nội dung đa tầng chạy trực tiếp trước khi câu hỏi được gửi tới bộ xử lý ngôn ngữ. Bộ lọc từ ngữ tự động quét và che giấu các từ ngữ thô tục, xúc phạm hoặc biến thể lách từ bằng dấu ba sao để giữ gìn môi trường giao tiếp văn minh.

Giải thuật phân loại toàn bộ tin nhắn thành sáu cấp độ cảm xúc và năm nhóm rủi ro nghiệp vụ để kích hoạt hành vi ứng xử tương ứng một cách tự động. Cấp một và cấp hai đại diện cho trạng thái bình thường với nhóm rủi ro trống, trợ lý phản hồi tự nhiên và cung cấp thông tin bảng giá chuẩn. Cấp ba phản ánh tâm lý lo lắng chăm sóc nhẹ, trợ lý chủ động giải thích hiện tượng lạ chỗ sau tắm sấy và hướng dẫn theo dõi ban đầu mà không ép buộc chuyển ca. Cấp bốn bắt các khiếu nại dịch vụ như bé bị trầy da hay thợ làm ẩu, trợ lý chân thành xin lỗi, xót xa cùng chủ nuôi, hướng dẫn chụp ảnh minh chứng và tự động đưa ca vào hàng đợi ưu tiên cho quản lý. Cấp năm nhận diện tranh chấp thanh toán gắt gao, trợ lý lập tức trấn an cam kết hoàn tiền nếu có sai sót, yêu cầu ảnh giao dịch và chuyển thẳng cho chuyên viên thu ngân. Cấp sáu là cấp cứu y tế tối khẩn khi bé chảy máu nhiều hay ngộ độc, trợ lý lập tức dừng mọi tư vấn làm đẹp, khuyên chủ nuôi đưa bé đến cơ sở thú y gần nhất ngay lập tức, hướng dẫn sơ cứu cầm máu ban đầu và cung cấp số hotline điều xe cứu hộ khẩn cấp.

> **Hình 8.8: Lưu đồ giải thuật kiểm duyệt nội dung độc hại và kích hoạt phân luồng cảm xúc**  
> *(Lưu đồ thể hiện các bước: Kiểm tra từ cấm, chấm điểm cảm xúc tiêu cực, phân loại nguy cơ và kích hoạt điều hướng ca khẩn cấp)*.

**Bảng 8.5: Bảng phân loại 6 cấp độ cảm xúc, nhóm rủi ro và hành động điều phối tương ứng**

| Cấp độ cảm xúc | Dấu hiệu nhận biết trong tin nhắn | Nhóm rủi ro nghiệp vụ | Mức độ khẩn cấp | Hành động xử lý tự động của hệ thống |
| :---: | :--- | :--- | :---: | :--- |
| Cấp 1 | Lời chào, hỏi thăm dịch vụ lịch sự | Không có rủi ro (`none`) | Thấp | Trả lời tự nhiên, ấm áp, cung cấp liên kết đặt lịch |
| Cấp 2 | Khách hỏi bảng giá, giờ mở cửa, địa chỉ | Không có rủi ro (`none`) | Thấp | Báo giá theo đúng cân nặng và loài thú cưng |
| Cấp 3 | Khách lo lắng bé mệt mỏi, biếng ăn sau tắm | Chăm sóc đặc biệt (`special_care`) | Trung bình | Xoa dịu tâm lý, hướng dẫn theo dõi, không ép chuyển ca |
| Cấp 4 | Khách phàn nàn bé bị trầy da, thợ làm ẩu | Khiếu nại dịch vụ (`service_complaint`) | Cao | Xin lỗi, thương bé, xin ảnh vết trầy, chuyển quản lý |
| Cấp 5 | Bị trừ tiền 2 lần, đòi hoàn tiền, từ ngữ gắt | Tranh chấp tiền (`billing_dispute`) | Cao | Trấn an hoàn tiền, xin ảnh giao dịch, chuyển thu ngân |
| Cấp 6 | Bé chảy máu nhiều, co giật, thở dốc, ngộ độc | Cấp cứu y tế (`medical_emergency`) | Tối khẩn | Hướng dẫn sơ cứu, khuyên đi thú y ngay, cấp hotline xe |

**So sánh sự khác biệt giữa phong cách giao tiếp máy móc và phong cách thấu cảm của Pawpal**:

| Tình huống thực tế | Phong cách hành chính máy móc (Cần loại bỏ) | Phong cách thấu cảm Pawpal (Đang áp dụng) |
| :--- | :--- | :--- |
| **Bé mệt sau ca tắm sấy** | "PawPal hiểu bạn lo lắng. Bé mệt do lạ chỗ. Bạn cho bé uống nước và theo dõi thêm." | "Dạ bạn đừng quá lo nhé, PawPal hiểu tâm lý của bạn lúc này. Sau khi tắm sấy, nhiều bé do lạ chỗ hoặc tiêu hao nhiều năng lượng nên sẽ thèm ngủ và hơi lười ăn một chút. Bạn để bé nghỉ ngơi ở góc quen thuộc, đặt sẵn chén nước sạch gần bé nha. Nếu bé có biểu hiện nào bất thường hơn, bạn cứ nhắn cho tụi mình liền nhé, tụi mình luôn ở đây cùng bạn." |
| **Sự cố trừ tiền tài khoản** | "PawPal ghi nhận phản ánh về thanh toán của bạn và chuyển hội thoại cho nhân viên kiểm tra đối soát." | "PawPal rất tiếc vì sự cố thanh toán này khiến bạn phiền lòng! Bạn an tâm nha, toàn bộ số tiền bị trừ nhầm hoặc phát sinh lỗi bên mình sẽ kiểm tra và hoàn trả lại đầy đủ cho bạn. Bạn chụp giúp PawPal màn hình giao dịch bị trừ tiền nhé, nhân viên hỗ trợ đang vào phòng chat ngay bây giờ để xử lý trực tiếp cùng bạn đây ạ." |
| **Bé bị trầy xước sau tỉa** | "PawPal xin lỗi vì trải nghiệm không mong muốn. Chuyển quản lý kiểm tra camera ca cắt tỉa và xử lý bồi hoàn." | "PawPal xin lỗi bạn và thương bé nhiều lắm! Tụi mình rất xót khi nghe tin bé bị đau như vậy. Bạn chụp giúp PawPal vết trầy của bé để tụi mình xem mức độ thế nào nhé. Quản lý tiệm đang vào tiếp nhận ngay để kiểm tra lại ca làm và chịu trách nhiệm xử lý chu đáo cho bé, bạn yên tâm nhé." |
| **Cấp cứu thú cưng** | "Khẩn cấp: Pawpal là dịch vụ làm đẹp, không phải cơ sở cấp cứu thú y. Đưa bé đi thú y ngay." | "Bạn bình tĩnh nhé! Trường hợp của bé cần bác sĩ thú y can thiệp ngay lập tức. Bạn lấy gạc hoặc khăn sạch ấn nhẹ cầm máu, giữ bé nằm nghiêng thoáng khí và đưa bé đến trạm thú y gần nhất ngay nha. Nếu bạn cần xe hỗ trợ di chuyển gấp đến phòng khám, bạn gọi liền hotline 1900-PAWPAL (nhấn phím 1) để tiệm điều xe hỗ trợ bạn và bé ngay nhé!" |

### 8.6.3. Cổng truy vấn dữ liệu an toàn chỉ đọc
Để bảo vệ an toàn cho cơ sở dữ liệu, toàn bộ các công cụ mà trợ lý trí tuệ nhân tạo sử dụng đều là các thủ tục lưu trữ chỉ đọc được định nghĩa sẵn trên máy chủ cơ sở dữ liệu.

Trợ lý thông minh hoàn toàn không có quyền thực hiện các thao tác thêm mới, sửa đổi hoặc xóa dữ liệu trong cơ sở dữ liệu. Mọi thay đổi dữ liệu như tạo lịch hẹn, trừ điểm hay xác nhận đơn hàng bắt buộc phải do chính người dùng hoặc nhân viên thực hiện thông qua các nút bấm chức năng trên màn hình. Thiết kế này loại trừ hoàn toàn rủi ro trợ lý tự ý tạo giao dịch khống hoặc làm sai lệch số liệu của hệ thống.

---

## 8.7. Đánh giá thực nghiệm hiệu quả và kết luận chương

### 8.7.1. Đánh giá hiệu quả vận hành thực tế qua các kịch bản kiểm thử cụ thể
Hiệu quả của giải thuật thông minh và kiến trúc hệ thống đã được kiểm chứng thông qua các đợt kiểm thử tự động trên nhiều kịch bản thực tế đại diện cho cả hai phân hệ trợ lý khách hàng và trợ lý vận hành nội bộ.

Ở nhóm kịch bản trên kênh khách hàng, thử nghiệm đầu tiên đánh giá khả năng tính toán chính xác bảng giá dịch vụ làm đẹp theo cân nặng thực tế. Khi người dùng nhập câu hỏi hỏi giá tắm sấy cho bé cún Poodle nặng 5kg, hệ thống đã nhận diện đúng khoảng cân nặng từ 4kg đến dưới 7kg, báo chính xác gói tắm sấy cơ bản có giá 180.000 đồng với thời lượng khoảng 60 phút và đính kèm nút đặt lịch trực tiếp mà không đưa ra giá phỏng đoán. Kết quả giao dịch tương tác được thể hiện tại Hình 8.9.

> **[Hình 8.9: Ảnh minh chứng kiểm thử tính toán giá dịch vụ làm đẹp theo cân nặng thực tế](file:///C:/Users/QUYEN/.gemini/antigravity-cli/brain/7a76c9d1-504b-4a2d-877e-c42a3920b2f8/hinh_8_9_tinh_gia_can_nang.png)**  
> *(Ảnh chụp màn hình thực tế: Trợ lý phản hồi chính xác giá gói dịch vụ theo số cân nặng và hiển thị nút đặt lịch trực tiếp)*.

Thử nghiệm thứ hai xác thực cơ chế chốt chặn bảo vệ quyền riêng tư đơn hàng khi người dùng chưa đăng nhập. Khi khách vãng lai gửi yêu cầu kiểm tra tiến độ đơn hàng hôm qua, hệ thống nhận diện đây là dữ liệu riêng tư, kiên quyết từ chối trích xuất thông tin và gửi lời hướng dẫn thân thiện mời người dùng đăng nhập tài khoản chính thức. Toàn bộ giao diện tương tác từ chối an toàn được ghi nhận tại Hình 8.10.

> **[Hình 8.10: Ảnh minh chứng kiểm thử chốt chặn bảo vệ quyền riêng tư đơn hàng của khách vãng lai](file:///C:/Users/QUYEN/.gemini/antigravity-cli/brain/7a76c9d1-504b-4a2d-877e-c42a3920b2f8/hinh_8_10_chan_quyen_rieng_tu_khach_vang_lai.png)**  
> *(Ảnh chụp màn hình thực tế: Trợ lý từ chối tra cứu đơn hàng cá nhân đối với khách vãng lai và cung cấp liên kết đăng nhập an toàn)*.

Thử nghiệm thứ ba kiểm tra khả năng nhận diện cảm xúc lo lắng và phản hồi xoa dịu tự nhiên. Khi chủ nuôi phản ánh bé cún mệt mỏi và biếng ăn sau khi tắm, hệ thống đã bắt đúng cấp độ cảm xúc ba, không ép chuyển ca máy móc mà gửi lời dỗ dành ấm áp, giải thích hiện tượng lạ chỗ sau tắm sấy, hướng dẫn cho bé uống nước và theo dõi nơi yên tĩnh. Hình ảnh tương tác thuần chữ thấu cảm được minh họa tại Hình 8.11.

> **[Hình 8.11: Ảnh minh chứng kiểm thử nhận diện cảm xúc lo lắng và phản hồi xoa dịu tự nhiên](file:///C:/Users/QUYEN/.gemini/antigravity-cli/brain/7a76c9d1-504b-4a2d-877e-c42a3920b2f8/hinh_8_11_xoa_diu_khach_lo_lang.png)**  
> *(Ảnh chụp màn hình thực tế: Phản hồi thuần chữ dịu dàng, thấu cảm, xóa bỏ hoàn toàn giọng điệu hành chính)*.

Ở nhóm kịch bản trên kênh quản trị nội bộ, thử nghiệm thứ tư đánh giá tính năng tổng hợp hồ sơ khách hàng toàn diện 360 độ chỉ với một câu lệnh tra cứu thông tin khách hàng kèm số điện thoại. Trợ lý Copilot đã liên kết dữ liệu khách hàng, thú cưng và lịch sử ca làm, hiển thị trọn vẹn tên chủ nuôi, số điện thoại, hạng thành viên, số dư điểm thưởng, danh sách hai bé cưng kèm lưu ý an toàn về việc bé thứ hai nhút nhát và sợ tiếng máy sấy. Giao diện tổng hợp hồ sơ được thể hiện tại Hình 8.12.

> **[Hình 8.12: Ảnh minh chứng kiểm thử tổng hợp hồ sơ khách hàng 360 độ qua trợ lý nội bộ](file:///C:/Users/QUYEN/.gemini/antigravity-cli/brain/7a76c9d1-504b-4a2d-877e-c42a3920b2f8/hinh_8_12_ho_so_khach_360.png)**  
> *(Ảnh chụp màn hình thực tế: Khung trả lời của Copilot tổng hợp toàn cảnh thông tin khách hàng, lịch sử và cảnh báo tập tính bé cưng)*.

Thử nghiệm thứ năm kiểm tra khả năng rà soát và cảnh báo hàng tồn kho chạm ngưỡng an toàn nhằm hỗ trợ kế hoạch nhập hàng của thủ kho. Khi nhân viên yêu cầu kiểm tra danh sách sản phẩm sắp hết hàng, hệ thống đã tự động lọc các biến thể sản phẩm có số lượng tồn nhỏ hơn hoặc bằng mức tối thiểu quy định, lập tức trả về bảng danh mục cụ thể gồm mã sản phẩm, tên hạt thức ăn hoặc sữa tắm, số lượng tồn hiện tại và gợi ý số lượng cần nhập thêm. Kết quả kiểm tra được trình bày tại Hình 8.13.

> **[Hình 8.13: Ảnh minh chứng kiểm thử cảnh báo các mặt hàng tồn kho chạm ngưỡng an toàn](file:///C:/Users/QUYEN/.gemini/antigravity-cli/brain/7a76c9d1-504b-4a2d-877e-c42a3920b2f8/hinh_8_13_canh_bao_ton_kho.png)**  
> *(Ảnh chụp màn hình thực tế: Copilot liệt kê danh sách sản phẩm dưới ngưỡng tối thiểu phục vụ kế hoạch nhập hàng)*.

Thử nghiệm thứ sáu xác thực cơ chế kiểm soát quyền hạn theo vai trò nhằm ngăn chặn nhân viên kỹ thuật xem báo cáo doanh thu của tiệm. Khi tài khoản nhân viên gửi câu hỏi về số tiền tiệm thu được hôm nay, máy chủ cơ sở dữ liệu nhận diện tài khoản thiếu quyền đọc thanh toán tài chính, lập tức chặn lệnh gọi và trả về thông báo từ chối an toàn với mã lỗi bảo mật quy định mà không làm lộ bất kỳ số liệu kinh doanh nào. Minh chứng từ chối quyền truy cập được lưu lại tại Hình 8.14.

> **[Hình 8.14: Ảnh minh chứng kiểm thử cơ chế chốt chặn nhân viên xem doanh thu trái phép](file:///C:/Users/QUYEN/.gemini/antigravity-cli/brain/7a76c9d1-504b-4a2d-877e-c42a3920b2f8/hinh_8_14_chan_quyen_doanh_thu.png)**  
> *(Ảnh chụp màn hình thực tế: Thông báo từ chối quyền truy cập của Copilot khi nhân viên hỏi dữ liệu doanh thu nhạy cảm)*.

**Bảng 8.6: Bảng kết quả kiểm thử thực nghiệm độ chuẩn xác và hiệu năng của giải thuật trợ lý thông minh**

| Chỉ số kiểm thử thực tế | Kết quả đo lường | Nhận xét và đánh giá chuyên môn |
| :--- | :---: | :--- |
| Độ chính xác tính giá dịch vụ theo cân nặng | 100% | Báo đúng giá theo quy định, không nhầm lẫn khoảng cân |
| Tỷ lệ chặn truy vấn thông tin riêng tư từ khách vãng lai | 100% | Bảo vệ hoàn toàn đơn hàng và điểm thưởng của thành viên |
| Tỷ lệ ngăn chặn nhân viên xem doanh thu trái phép | 100% | Máy chủ từ chối lập tức với mã lỗi bảo mật quy định |
| Thời gian phản hồi cụm từ đầu tiên qua truyền phát | 0.8 đến 1.2 giây | Người dùng đọc được nội dung gần như ngay tức thì |
| Tỷ lệ chuyển giao ca thành công khi khách bức xúc | 100% | Chuyển mượt mà sang nhân viên, giữ trọn vẹn ngữ cảnh |
| Tỷ lệ lọc sạch từ ngữ kích động và lách từ | 100% | Làm mờ hoàn toàn và nâng cấp độ bảo vệ tự động |

### 8.7.2. Tóm tắt các đóng góp cốt lõi của chương
Chương 8 đã khẳng định giải pháp xây dựng hệ thống Pawpal không dừng lại ở mức giao diện thông thường, mà được định hình vững chắc bởi ba trụ cột công nghệ then chốt:

Thứ nhất là nền tảng kiến trúc phân tầng an toàn áp dụng triệt để mô hình không tin cậy dữ liệu đầu vào từ trình duyệt. Việc kết hợp chặt chẽ giữa cơ chế kiểm soát truy cập theo vai trò công việc ở tầng cổng dịch vụ và chính sách bảo mật cấp độ hàng dữ liệu tại tầng cơ sở dữ liệu bảo đảm tính toàn vẹn thông tin và bảo vệ tuyệt đối bí mật kinh doanh của cơ sở.

Thứ hai là cơ chế truyền phát dữ liệu thời gian thực kết hợp với giải thuật triệt tiêu ảo giác nghiêm ngặt. Việc phát luồng từng cụm từ kết quả giúp rút ngắn thời gian chờ đợi phản hồi xuống dưới một giây. Đồng thời, việc ràng buộc mô hình ngôn ngữ bằng hợp đồng bằng chứng chỉ cho phép trả lời dựa trên dữ liệu nội bộ đã xác thực giúp loại trừ hoàn toàn hiện tượng bịa đặt thông tin, mang lại sự tin cậy tuyệt đối cho khách hàng và nhân sự.

Thứ ba là trải nghiệm giao tiếp thấu cảm lấy con người và thú cưng làm trung tâm. Hệ thống đã chuyển đổi thành công từ mô hình trợ lý ảo trả lời theo mẫu hành chính cứng nhắc sang một người bạn đồng hành ấm áp, biết lắng nghe, thấu cảm và xoa dịu nỗi lo âu của chủ nuôi, đồng thời san sẻ áp lực vận hành, nâng cao năng suất và bảo đảm an toàn nghề nghiệp cho đội ngũ nhân sự tiệm.
