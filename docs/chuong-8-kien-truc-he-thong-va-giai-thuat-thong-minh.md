# Chương 8: Kiến trúc hệ thống và giải thuật thông minh

## Lời mở đầu chương
Chương này trình bày toàn bộ giải pháp kỹ thuật của hệ thống Pawpal, tập trung vào hai nội dung cốt lõi: kiến trúc hệ thống và giải thuật trợ lý trí tuệ nhân tạo. Phần kiến trúc làm rõ cách tổ chức phân tầng, kết nối các dịch vụ và cơ chế bảo mật đa lớp để bảo đảm hệ thống vận hành liên tục, an toàn. Phần giải thuật thông minh đi sâu vào giá trị thực tế mang lại cho hai đối tượng người dùng chính: hỗ trợ khách hàng tự tra cứu thông tin dịch vụ nhanh chóng và hỗ trợ nhân viên vận hành tối ưu hóa công việc hàng ngày, xét trên cả hai phương diện hoạt động thực tế và giải tỏa áp lực tinh thần.

---

## 8.1. Mô hình kiến trúc phân tầng hệ thống

### 8.1.1. Kiến trúc phân tầng chức năng
Hệ thống Pawpal được thiết kế theo mô hình phân tầng độc lập nhằm bảo đảm tính module hóa, dễ bảo trì và dễ mở rộng khi quy mô dịch vụ tăng lên. Kiến trúc gồm bốn tầng chính:

Tầng giao diện người dùng đảm nhận việc tiếp nhận tương tác và hiển thị thông tin trực quan. Tầng này phân tách làm hai môi trường riêng biệt: giao diện công chúng dành cho khách hàng tìm kiếm dịch vụ, đặt lịch, mua sản phẩm và trò chuyện với trợ lý ảo; giao diện quản trị dành cho nhân viên lễ tân, kỹ thuật viên và cấp quản lý thực hiện thao tác nghiệp vụ hàng ngày.

Tầng cổng dịch vụ đóng vai trò trung gian tiếp nhận mọi yêu cầu từ giao diện gửi lên. Tầng này thực hiện kiểm tra tính hợp lệ của dữ liệu đầu vào, xác thực danh tính người gửi, kiểm soát hạn mức gọi dịch vụ để chống nghẽn đường truyền và điều hướng yêu cầu đến đúng bộ xử lý nội bộ. Cơ chế truyền phát dữ liệu thời gian thực cũng được thiết lập tại tầng này để đẩy kết quả xử lý về màn hình người dùng ngay khi có dữ liệu mới.

Tầng dữ liệu quản lý toàn bộ việc lưu trữ lâu dài của hệ thống. Dữ liệu có cấu trúc như thông tin khách hàng, hồ sơ thú cưng, lịch hẹn, giao dịch bán hàng và ca dịch vụ được quản lý trong hệ quản trị cơ sở dữ liệu quan hệ PostgreSQL. Dữ liệu tập tin như hình ảnh sản phẩm và ảnh chụp hồ sơ thú cưng được phân tách lưu trữ tại kho tập tin riêng để giảm tải cho cơ sở dữ liệu chính.

Tầng tích hợp trí tuệ nhân tạo là dịch vụ độc lập chịu trách nhiệm kết nối với mô hình ngôn ngữ lớn. Tầng này không cho phép mô hình ngôn ngữ truy cập trực tiếp vào cơ sở dữ liệu, mà đứng ra lọc sạch dữ liệu nhạy cảm, chuẩn hóa câu hỏi, bóc tách tham số và chỉ cung cấp các đoạn trích dữ liệu đã được thẩm định an toàn cho mô hình tạo câu trả lời.

> **Hình 8.1: Sơ đồ kiến trúc phân tầng tổng thể của hệ thống Pawpal**  
> *(Sơ đồ thể hiện 4 tầng: Giao diện người dùng, Cổng dịch vụ trung gian, Quản trị cơ sở dữ liệu và Tầng tích hợp trí tuệ nhân tạo)*.

### 8.1.2. Mô hình triển khai và luồng tương tác giữa các thành phần
Các thành phần trong hệ thống Pawpal giao tiếp với nhau theo các giao thức mạng tiêu chuẩn và tuân thủ nguyên tắc không tin cậy bất kỳ dữ liệu nào gửi từ trình duyệt. Mọi yêu cầu từ khách hàng hay nhân viên đều phải đi qua cổng kiểm soát an toàn trước khi chạm tới cơ sở dữ liệu.

Khi người dùng gửi một yêu cầu, cổng dịch vụ sẽ kiểm tra trạng thái đăng nhập và hạn mức truy cập. Nếu yêu cầu liên quan đến các tác vụ trí tuệ nhân tạo, hệ thống sẽ thực hiện bóc tách tham số nghiệp vụ trước tại máy chủ, sau đó dùng quyền nội bộ để đọc dữ liệu cần thiết từ cơ sở dữ liệu, ghép thành ngữ cảnh có cấu trúc rồi mới chuyển đến mô hình ngôn ngữ lớn. Cách thiết kế này ngăn chặn hoàn toàn việc rò rỉ mã truy vấn nội bộ hoặc dữ liệu riêng tư của người dùng khác.

> **Hình 8.2: Sơ đồ luồng giao tiếp và cơ chế kiểm soát bảo mật đa lớp giữa các thành phần**  
> *(Sơ đồ thể hiện luồng truyền dữ liệu có kiểm soát giữa máy khách, cổng dịch vụ, cơ sở dữ liệu và máy chủ xử lý ngôn ngữ)*.

---

## 8.2. Kiến trúc an toàn thông tin và kiểm soát truy cập

### 8.2.1. Cơ chế xác thực và quản lý định danh người dùng
Hệ thống quản lý định danh dựa trên hai nhóm đối tượng người dùng rõ rệt:

Đối với khách hàng thành viên, hệ thống xác thực thông qua mã tài khoản duy nhất được mã hóa an toàn. Khi đăng nhập thành công, mỗi yêu cầu gửi đi đều mang theo chữ ký xác thực. Nhờ đó, hệ thống nhận diện chính xác chủ tài khoản để tự động nạp danh sách thú cưng, lịch hẹn và điểm thưởng cá nhân mà không cần khách hàng phải nhập lại thông tin.

Đối với khách vãng lai chưa tạo tài khoản, hệ thống không bắt buộc người dùng phải đăng ký ngay mới được tư vấn. Thay vào đó, hệ thống tự động cấp phát một chuỗi khóa phiên làm việc ẩn danh được băm một chiều bằng giải thuật SHA-256. Khóa phiên này cho phép lưu tạm thời lịch sử trao đổi trong phiên truy cập hiện tại. Khi khách hàng quyết định đăng ký hoặc đăng nhập tài khoản chính thức, hệ thống sẽ tự động liên kết toàn bộ nội dung trò chuyện trước đó vào hồ sơ thành viên mới mà không làm mất dữ liệu.

### 8.2.2. Kiểm soát phân quyền đa tầng và bảo vệ dữ liệu nghiệp vụ
Hệ thống áp dụng chính sách kiểm soát truy cập theo vai trò kết hợp với bảo mật cấp độ hàng dữ liệu trực tiếp trong cơ sở dữ liệu.

Ở tầng quản trị nội bộ, hệ thống cố định hai nhóm vai trò rõ ràng:
Vai trò quản lý nắm toàn quyền vận hành, được phép xem báo cáo doanh thu, biến động dòng tiền, danh sách nhân sự và điều chỉnh các quy định vận hành của tiệm.
Vai trò nhân viên chỉ được cấp các quyền công việc gắn với nghiệp vụ thực tế như tiếp nhận ca dịch vụ, ghi nhận chăm sóc, kiểm tra tồn kho và hỗ trợ khách hàng. Nhân viên hoàn toàn bị chặn khi cố gắng truy cập các chỉ số tài chính hoặc sửa đổi cấu hình hệ thống.

Ở tầng cơ sở dữ liệu, chính sách bảo mật cấp độ hàng quy định dữ liệu của khách hàng nào thì chỉ tài khoản đó hoặc nhân viên đang phụ trách ca dịch vụ đó mới có quyền đọc. Điều này bảo đảm kể cả khi xảy ra lỗi ở tầng giao diện, cơ sở dữ liệu bên dưới vẫn kiên quyết từ chối các truy vấn trái phép.

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

## 8.3. Giải thuật trợ lý thông minh hỗ trợ khách hàng

### 8.3.1. Mục tiêu và giá trị hỗ trợ khách hàng
Trợ lý ảo trên kênh người dùng công chúng được xây dựng với mục tiêu trở thành nhân viên tư vấn số hoạt động liên tục 24/7, đồng hành cùng chủ nuôi thú cưng cả về mặt tiện ích thao tác lẫn xoa dịu tâm lý:

**Hỗ trợ về mặt hoạt động thực tế**:
* *Nhận báo giá chính xác tức thì bất kể ngày đêm*: Dịch vụ thú cưng có biểu phí thay đổi theo loài và cân nặng thực tế. Khách hàng chỉ cần nói giống chó hoặc mèo và số cân nặng, hệ thống sẽ tính toán ngay mức giá chuẩn mà không cần khách phải tự dò bảng biểu hay chờ đợi nhân viên phản hồi.
* *Tự tra cứu thông tin cá nhân một chạm*: Khách hàng thành viên chỉ cần gõ một câu hỏi ngắn là biết ngay tình trạng đơn hàng thức ăn đang giao đến đâu, lịch hẹn tắm sấy sắp tới lúc mấy giờ, còn bao nhiêu điểm thưởng và lịch sử tiêm phòng của bé cưng mà không cần gọi điện thoại lên tiệm.
* *Gửi hình ảnh thực tế để tiếp nhận nhanh*: Khách hàng có thể đính kèm tối đa 3 ảnh chụp tình trạng da, vết trầy xước hoặc kiểu lông mong muốn ngay trong cuộc trò chuyện để nhân viên chuẩn bị sẵn dụng cụ trước khi khách mang bé đến.

**Hỗ trợ về mặt tinh thần và cảm xúc**:
* *Xóa tan sự hoang mang, lo lắng trong các tình huống khẩn cấp*: Thú cưng là thành viên trong gia đình. Khi bé có dấu hiệu mệt mỏi, bỏ ăn hoặc trầy xước lúc đêm muộn, người nuôi rất dễ rơi vào trạng thái hoảng loạn. Trợ lý nhận diện sớm từ ngữ lo âu, phản hồi bằng giọng điệu điềm tĩnh, ấm áp, đưa ra lời khuyên theo dõi ban đầu và chuyển ngay hội thoại sang nhân viên chuyên trách, giúp khách hàng lấy lại sự bình tĩnh.
* *Cảm giác được quan tâm và thấu hiểu*: Hệ thống gọi thú cưng là "bé", ghi nhớ đúng tên, đặc điểm riêng (như bé nhát người, sợ tiếng sấy to) tạo cho khách hàng cảm giác tiệm thực sự quan tâm đến thú cưng của mình như một cá thể riêng biệt chứ không phải xử lý máy móc.
* *An tâm về tính minh bạch*: Khách hàng hoàn toàn tin tưởng vì mức giá và thời gian dịch vụ được tính toán rõ ràng theo quy định niêm yết, không sợ bị phụ thu vô lý hay báo giá mập mờ khi đến nơi.

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

### 8.3.2. Cách thức khách hàng tương tác và trải nghiệm
Khách hàng tương tác với trợ lý thông qua cửa sổ trò chuyện xuất hiện ở góc dưới màn hình. Giao diện được tối giản để người dùng chỉ cần gõ câu hỏi tự nhiên hoặc chạm vào các nút gợi ý có sẵn như hỏi bảng giá tắm sấy, quy định gửi khách sạn hoặc kiểm tra ưu đãi.

Khi nhận được câu hỏi, hệ thống áp dụng cơ chế truyền phát dữ liệu thời gian thực. Từng câu trả lời xuất hiện nối tiếp nhau ngay khi máy chủ xử lý xong từng cụm từ, giúp khách hàng đọc được nội dung ngay lập tức mà không phải nhìn biểu tượng chờ đợi lâu. Đi kèm câu trả lời là các liên kết dẫn thẳng đến trang đặt lịch hoặc trang chi tiết sản phẩm để khách hàng thao tác tiếp một cách liền mạch.

Hệ thống phân luồng trải nghiệm dựa trên trạng thái tài khoản của người dùng:
Nếu là khách vãng lai, trợ lý phản hồi đầy đủ các thông tin công khai. Khi khách hỏi đến đơn hàng hoặc thông tin cá nhân, trợ lý sẽ lịch sự hướng dẫn khách đăng nhập để bảo mật thông tin.
Nếu là khách hàng thành viên, trợ lý cho phép gửi đính kèm tối đa 3 ảnh chụp thực tế tình trạng da, lông của bé cưng để nhân viên nắm bắt nhanh trước khi tiếp nhận ca.

> **Hình 8.3: Lưu đồ quy trình xử lý hội thoại và phân luồng trải nghiệm của Trợ lý Pawpal Chatbot**  
> *(Lưu đồ thể hiện các bước: Tiếp nhận tin nhắn, lọc từ ngữ, phân loại khách hàng, gọi dữ liệu tương ứng và truyền phát câu trả lời về màn hình)*.  
> **Hình 8.4: Giao diện tương tác thực tế của Trợ lý Pawpal Chatbot trên kênh người dùng công chúng**  
> *(Ảnh chụp màn hình thực tế thể hiện tư vấn giá làm đẹp theo cân nặng, liên kết đặt lịch và cơ chế phản hồi truyền phát)*.

**Bảng 8.3: Bảng ánh xạ các ý định người dùng và mẫu câu hỏi phổ biến trong Trợ lý Pawpal Chatbot**

| Nhóm ý định | Mẫu câu hỏi thực tế của khách hàng | Nguồn dữ liệu tra cứu | Kết quả trả về cho người dùng |
| :--- | :--- | :--- | :--- |
| Hỏi giá làm đẹp theo cân nặng | Bé cún phốc sóc nặng 4kg tắm sấy giá bao nhiêu | Bảng giá dịch vụ và phân loại cân nặng | Mức giá chính xác, thời lượng dự kiến, liên kết đặt lịch |
| Kiểm tra phòng khách sạn thú cưng | Tiệm còn phòng đôi cho mèo ngày mai không | Danh mục phòng và lịch lưu trú thực tế | Số phòng còn trống, tiện ích đi kèm, giá theo ngày |
| Tra cứu đơn hàng cá nhân | Đơn hàng thức ăn của mình giao đến đâu rồi | Bảng đơn hàng của chính tài khoản đó | Mã đơn, trạng thái đóng gói hoặc vận chuyển, ngày giao |
| Kiểm tra điểm thưởng tích lũy | Mình tích được bao nhiêu điểm và dùng thế nào | Bảng điểm thưởng của tài khoản | Số dư điểm hiện tại, giá trị quy đổi giảm trừ đơn hàng |
| Phản ánh sự cố dịch vụ | Bé nhà mình về bị trầy nhẹ ở chân, cần hỗ trợ | Bộ lọc từ ngữ và kích hoạt cảm xúc | Ghi nhận sự cố, chuyển ngay sang chế độ chờ chuyên viên |

---

## 8.4. Giải thuật trợ lý thông minh hỗ trợ vận hành

### 8.4.1. Mục tiêu và giá trị hỗ trợ đội ngũ vận hành
Trợ lý nội bộ được xây dựng như một cộng sự hỗ trợ nghiệp vụ cho đội ngũ nhân sự tiệm, mang lại giá trị thiết thực cho cả nhân viên tác nghiệp lẫn người quản lý cơ sở:

**Đối với nhân viên tác nghiệp (Kỹ thuật viên, Lễ tân, Chăm sóc khách hàng, Thu ngân)**:
* *Hỗ trợ về mặt hoạt động thực tế*:
  * Triệt tiêu thao tác tra cứu thủ công qua nhiều màn hình: Thay vì phải mở nhiều phân hệ riêng lẻ để tìm số điện thoại của chủ, xem lịch sử làm đẹp của bé và đọc lại tiền sử bệnh, nhân viên chỉ cần gõ tên khách là có ngay hồ sơ tổng hợp toàn diện trên một màn hình duy nhất.
  * Gợi ý nội dung phản hồi chuẩn mực: Khi xử lý thắc mắc hoặc khiếu nại khó, trợ lý tự động đọc ngữ cảnh và soạn sẵn một bản nháp trả lời lịch sự, đúng quy chuẩn của tiệm. Nhân viên chỉ cần kiểm tra nhanh rồi gửi, tiết kiệm đáng kể thời gian gõ phím.
  * Bàn giao ca làm việc liền mạch: Khi nhận lại ca trò chuyện từ hệ thống tự động, nhân viên đã có sẵn phần tóm tắt nội dung khách vừa trao đổi cùng các ghi chú nội bộ của ca trước, không cần hỏi lại khách từ đầu.
* *Hỗ trợ về mặt tinh thần và giảm tải áp lực*:
  * Giải tỏa áp lực quá tải trong giờ cao điểm: Vào các dịp lễ tết hoặc cuối tuần, nhân viên thường bị căng thẳng tột độ vì hàng trăm tin nhắn hỏi giá, hỏi địa chỉ, hỏi giờ mở cửa dồn dập. Việc trợ lý giải quyết trước các câu hỏi lặp lại giúp nhân viên không bị kiệt sức, giữ được năng lượng để phục vụ trực tiếp cho các bé tại tiệm.
  * Tự tin và an tâm khi xử lý tình huống khó: Nhân viên mới thường e ngại, lúng túng khi gặp khách hàng khó tính hoặc phát sinh tranh chấp. Sự hỗ trợ từ trợ lý giúp nhân viên luôn có điểm tựa thông tin vững chắc, tránh cảm giác đơn độc, bối rối hoặc sợ mắc lỗi.
  * Bảo đảm an toàn thân thể cho kỹ thuật viên: Nhờ trợ lý cảnh báo trước tập tính của thú cưng (như bé hay cắn khi chạm vào tai, bé sợ máy sấy), kỹ thuật viên chủ động mang đồ bảo hộ và có biện pháp tiếp cận nhẹ nhàng, giảm thiểu tối đa rủi ro bị cắn hoặc cào, giúp tâm lý làm việc thoải mái hơn.

**Đối với người quản lý và chủ cơ sở**:
* *Hỗ trợ về mặt hoạt động quản trị*:
  * Giám sát và ra quyết định dựa trên dữ liệu thời gian thực: Quản lý có thể hỏi nhanh về tình trạng phòng khách sạn còn trống, danh sách các sản phẩm chạm ngưỡng tồn kho tối thiểu để lên kế hoạch nhập hàng mà không cần chờ nhân viên tổng hợp báo cáo giấy.
  * Bảo vệ tuyệt đối bí mật kinh doanh: Cơ chế phân quyền tự động ngăn chặn nhân viên xem các dữ liệu nhạy cảm về doanh thu và tiền hoàn trả, giúp chủ tiệm quản trị an toàn mà không phải tốn công phân quyền thủ công cho từng người.
* *Hỗ trợ về mặt tinh thần và sự yên tâm*:
  * An tâm tiệm luôn hoạt động liên tục: Dù tiệm đã đóng cửa lúc đêm muộn, chủ tiệm vẫn yên tâm vì trợ lý ảo vẫn hoạt động liên tục để tiếp đón khách, tư vấn dịch vụ và giữ chân khách hàng tiềm năng không tìm sang đối thủ cạnh tranh.
  * Giữ vững uy tín và chuẩn mực phục vụ của thương hiệu: Chủ tiệm không phải lo lắng về việc nhân viên tư vấn sai giá, trả lời thiếu lịch sự hoặc cãi nhau với khách, vì toàn bộ nội dung của trợ lý đều được kiểm soát theo đúng quy chuẩn đạo đức và văn phong của thương hiệu.

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

### 8.4.2. Cách thức nhân viên khai thác và sử dụng Copilot
Nhân viên sử dụng trợ lý thông qua thanh nhập lệnh chuyên biệt nằm ngay trong giao diện làm việc quản trị. Khung tương tác có sẵn các nút lệnh nhanh để nhân viên bấm chọn tra cứu chỉ với một thao tác.

Khi nhân viên chăm sóc khách hàng tiếp nhận một ca khiếu nại, trợ lý sẽ hỗ trợ đọc ngữ cảnh trao đổi và đưa ra gợi ý câu trả lời mẫu theo đúng chuẩn mực lịch sự của tiệm. Nhân viên có thể sử dụng nguyên văn hoặc chỉnh sửa lại cho phù hợp với tình huống thực tế trước khi gửi cho khách.

Khi có ca chat chuyển tiếp từ khách hàng, nhân viên sẽ thấy bản tóm tắt ngắn gọn nội dung mà khách đã trao đổi với máy trước đó. Trong suốt quá trình hỗ trợ, nhân viên có thể ghi lại các ghi chú nội bộ ngay trong ca chat để các nhân sự ca sau cùng nắm được tình hình của bé cưng mà không hiển thị cho khách hàng thấy.

> **Hình 8.5: Lưu đồ quy trình xử lý tác vụ thông minh và kiểm soát thẩm quyền của Trợ lý Pawpal Copilot**  
> *(Lưu đồ thể hiện các bước: Tiếp nhận câu lệnh nhân viên, xác thực quyền công việc, truy vấn dữ liệu an toàn chỉ đọc, tổng hợp kết quả và trả về giao diện)*.  
> **Hình 8.6: Giao diện phân hệ làm việc Trợ lý Pawpal Copilot trong không gian quản trị**  
> *(Ảnh chụp màn hình phân hệ Copilot thể hiện tra cứu hồ sơ 360 độ, cảnh báo tồn kho và thông báo từ chối truy cập doanh thu)*.

---

## 8.5. Cơ chế giải thuật thông minh vận hành bên dưới giao diện

### 8.5.1. Giải thuật phân tích ngữ cảnh, nhận diện ý định và trích xuất tham số
Khi nhận được câu hỏi từ người dùng, giải thuật đầu tiên sẽ bóc tách các thực thể quan trọng như tên loài thú cưng, số cân nặng, ngày giờ hoặc tên dịch vụ.

Giải thuật tuân thủ nghiêm ngặt nguyên tắc trung thực dữ liệu: mô hình ngôn ngữ chỉ được phép trả lời dựa trên những dữ liệu có thực được cung cấp từ cơ sở dữ liệu nội bộ. Nếu trong cơ sở dữ liệu chưa có thông tin về dịch vụ hoặc khoảng giá đó, giải thuật bắt buộc trợ lý phải thông báo rõ ràng là chưa có dữ liệu xác nhận, tuyệt đối không được tự ý suy đoán mức giá hoặc bịa đặt chính sách làm sai lệch thông tin đến khách hàng.

### 8.5.2. Giải thuật kiểm duyệt nội dung độc hại và kích hoạt cảm xúc
Hệ thống tích hợp bộ lọc kiểm duyệt hai lớp chạy trực tiếp trước khi câu hỏi được gửi tới bộ xử lý ngôn ngữ.

Lớp thứ nhất quét các từ ngữ phản cảm hoặc độc hại để chặn ngay các hành vi cố tình quấy phá hệ thống. Lớp thứ hai phân tích các dấu hiệu cảm xúc tiêu cực của khách hàng, đặc biệt là các phản ánh liên quan đến sự cố dịch vụ hoặc khiếu nại về tiền bạc. Khi nhận thấy mức độ bức xúc vượt ngưỡng an toàn, hệ thống sẽ tự động hạ cờ ưu tiên và chuyển ngay cuộc trò chuyện cho nhân viên chăm sóc khách hàng vào tiếp quản, tránh để máy trả lời làm khách hàng khó chịu hơn.

> **Hình 8.7: Lưu đồ giải thuật kiểm duyệt nội dung độc hại và kích hoạt phân luồng cảm xúc**  
> *(Lưu đồ thể hiện các bước: Kiểm tra từ cấm, chấm điểm cảm xúc tiêu cực, phân loại nguy cơ và kích hoạt điều hướng ca khẩn cấp)*.

**Bảng 8.5: Bảng phân loại mức độ rủi ro cảm xúc và hành động điều phối tương ứng**

| Cấp độ cảm xúc | Dấu hiệu nhận biết trong tin nhắn | Loại rủi ro nghiệp vụ | Hành động xử lý tự động của hệ thống |
| :---: | :--- | :--- | :--- |
| Cấp 1 | Câu hỏi lịch sự, hỏi thăm dịch vụ thông thường | Không có rủi ro | Trợ lý tự động trả lời bình thường |
| Cấp 2 | Khách lo lắng về tình trạng sức khỏe nhẹ của bé | Lo lắng chăm sóc | Trợ lý ghi nhận dịu dàng, khuyên khách đưa bé đến tiệm |
| Cấp 3 | Khách phản ánh dịch vụ cắt tỉa hoặc thái độ nhân viên | Phản ánh dịch vụ | Trợ lý xin lỗi, tự động chuyển ca sang hàng đợi nhân viên |
| Cấp 4 | Khách bức xúc về trừ tiền sai hoặc đòi hoàn tiền | Tranh chấp thanh toán | Chặn trả lời tự động, chuyển ngay cho quản lý xử lý |

### 8.5.3. Cổng truy vấn dữ liệu an toàn chỉ đọc
Để bảo vệ an toàn cho cơ sở dữ liệu, toàn bộ các công cụ mà trợ lý trí tuệ nhân tạo sử dụng đều là các thủ tục lưu trữ chỉ đọc được định nghĩa sẵn trên máy chủ cơ sở dữ liệu.

Trợ lý thông minh hoàn toàn không có quyền thực hiện các thao tác thêm mới, sửa đổi hoặc xóa dữ liệu trong cơ sở dữ liệu. Mọi thay đổi dữ liệu như tạo lịch hẹn, trừ điểm hay xác nhận đơn hàng bắt buộc phải do chính người dùng hoặc nhân viên thực hiện thông qua các nút bấm chức năng trên màn hình. Thiết kế này loại trừ hoàn toàn rủi ro trợ lý tự ý tạo giao dịch khống hoặc làm sai lệch số liệu của hệ thống.

---

## 8.6. Đánh giá thực nghiệm hiệu quả và kết luận chương

### 8.6.1. Đánh giá hiệu quả vận hành thực tế
Hiệu quả của giải thuật thông minh và kiến trúc hệ thống đã được kiểm chứng thông qua các đợt kiểm thử tự động trên nhiều kịch bản thực tế:

**Bảng 8.6: Bảng kết quả kiểm thử thực nghiệm độ chuẩn xác và hiệu năng của giải thuật trợ lý thông minh**

| Chỉ số kiểm thử thực tế | Kết quả đo lường | Nhận xét và đánh giá chuyên môn |
| :--- | :---: | :--- |
| Độ chính xác tính giá dịch vụ theo cân nặng | 100% | Báo đúng giá theo quy định, không nhầm lẫn khoảng cân |
| Tỷ lệ chặn truy vấn thông tin riêng tư từ khách vãng lai | 100% | Bảo vệ hoàn toàn đơn hàng và điểm thưởng của thành viên |
| Tỷ lệ ngăn chặn nhân viên xem doanh thu trái phép | 100% | Máy chủ từ chối lập tức với mã lỗi bảo mật quy định |
| Thời gian phản hồi cụm từ đầu tiên qua truyền phát | 0.8 đến 1.2 giây | Người dùng đọc được nội dung gần như ngay tức thì |
| Tỷ lệ chuyển giao ca thành công khi khách bức xúc | 100% | Chuyển mượt mà sang nhân viên, giữ trọn vẹn ngữ cảnh |

### 8.6.2. Tóm tắt các đóng góp cốt lõi của chương
Chương 8 đã chứng minh giải pháp xây dựng hệ thống Pawpal không dừng lại ở mức giao diện thông thường, mà được chống đỡ bởi một nền tảng kiến trúc phân tầng vững chắc, kiểm soát truy cập đa lớp và giải thuật trợ lý trí tuệ nhân tạo thiết thực. Việc phân định rõ ràng giữa hai luồng hỗ trợ: trợ lý tự phục vụ cho khách hàng và trợ lý nghiệp vụ cho nhân viên đã giải quyết đúng các điểm nghẽn trong vận hành thực tế của một cơ sở dịch vụ chăm sóc thú cưng hiện đại, mang lại giá trị thực tế cả về mặt tăng năng suất hoạt động lẫn giải tỏa căng thẳng tâm lý cho con người.
