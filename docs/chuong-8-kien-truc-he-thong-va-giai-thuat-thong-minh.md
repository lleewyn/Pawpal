# Chương 8. Kiến trúc hệ thống và giải thuật thông minh

## Danh mục bảng và hình trong chương

Nhằm minh họa toàn diện và trực quan cho các cơ chế vận hành từ tầng tổng thể đến các luồng giải thuật chi tiết, Chương 8 sử dụng hệ thống sơ đồ kiến trúc, lưu đồ giải thuật và hình ảnh thực nghiệm thực tế được trích xuất trực tiếp từ nền tảng Pawpal:
* **Hình 8.1 đến Hình 8.3**: Biểu diễn mô hình kiến trúc phân tầng chức năng, sơ đồ trình tự giao tiếp có kiểm soát bảo mật đa lớp và đường ống xử lý trí tuệ nhân tạo sáu tầng khép kín.
* **Hình 8.4, Hình 8.6 và Hình 8.8**: Trình bày lưu đồ giải thuật phân luồng trải nghiệm Chatbot cho người dùng công chúng, quy trình điều phối tác vụ thông minh có kiểm soát thẩm quyền Copilot và lưu đồ kiểm duyệt nội dung độc hại kết hợp nhận diện cảm xúc sáu cấp độ.
* **Hình 8.5 và Hình 8.7**: Ghi nhận giao diện tương tác thực tế của Trợ lý Pawpal Chatbot khi tư vấn thông tin công khai và Trợ lý Pawpal Copilot khi tra cứu lịch dịch vụ trong không gian quản trị.
* **Hình 8.9 đến Hình 8.14**: Ảnh minh chứng thực nghiệm sáu kịch bản trọng yếu: tính giá dịch vụ theo cân nặng, chốt chặn bảo vệ quyền riêng tư đơn hàng, phản hồi xoa dịu cảm xúc lo lắng, tổng hợp hồ sơ khách hàng 360 độ, cảnh báo tồn kho an toàn và cơ chế ngăn chặn nhân viên xem doanh thu trái phép.

Hệ thống bảng biểu đặc tả kỹ thuật đi kèm đóng vai trò chuẩn hóa các quy tắc vận hành và đối soát dữ liệu:
* **Bảng 8.1**: Ma trận quyền truy cập chi tiết theo bốn vai trò người dùng trong hệ sinh thái Pawpal.
* **Bảng 8.2**: Phạm vi hỗ trợ nghiệp vụ phân định giữa kênh khách hàng (Chatbot) và kênh quản trị nội bộ (Copilot).
* **Bảng 8.3**: Bảng ánh xạ ý định người dùng với nguồn dữ liệu và định dạng kết quả trả về.
* **Bảng 8.4**: Danh mục các công cụ tra cứu dữ liệu an toàn tiêu biểu của Trợ lý Copilot.
* **Bảng 8.5 và Bảng so sánh phong cách**: Đặc tả sáu cấp độ cảm xúc, hành động điều phối tương ứng và bảng đối sánh trực quan giữa phong cách phản hồi hành chính máy móc với phong cách giao tiếp thấu cảm của Pawpal.

---

## Lời mở đầu chương

Trong kỷ nguyên chuyển đổi số ngành dịch vụ chăm sóc thú cưng (Pet Care Services), việc xây dựng một hệ thống phần mềm quản lý không chỉ dừng lại ở các tác vụ lưu trữ dữ liệu truyền thống mà đòi hỏi sự kết hợp mật thiết giữa kiến trúc hệ thống bền vững, an toàn thông tin nghiêm ngặt và năng lực trợ lý thông minh thấu cảm. Một hệ thống hiện đại phải giải quyết đồng thời hai bài toán tưởng chừng đối nghịch: một mặt phải mở rộng khả năng tiếp cận, tự động hóa tư vấn và đồng hành cùng khách hàng 24/7 trên môi trường số; mặt khác phải thiết lập những ranh giới bảo mật vững chắc, ngăn chặn triệt để nguy cơ rò rỉ dữ liệu nhạy cảm và kiểm soát chặt chẽ thẩm quyền tác nghiệp nội bộ.

Chương 8 tập trung phân tích sâu sắc kiến trúc hệ thống tổng thể và các giải thuật thông minh được thiết kế chuyên biệt cho nền tảng Pawpal. Hệ sinh thái trợ lý thông minh của Pawpal được cấu trúc thành hai phân hệ chuyên biệt:
1. **Trợ lý Pawpal Chatbot trên kênh người dùng công chúng**: Đóng vai trò là đại sứ thương hiệu số, hỗ trợ khách hàng vãng lai và thành viên tra cứu thông tin dịch vụ, tính toán chi phí chính xác theo cân nặng thực tế, hướng dẫn quy trình đặt lịch và tiếp nhận phản ánh với phong cách giao tiếp nhân văn, ấm áp.
2. **Trợ lý Pawpal Copilot trong cổng quản trị nội bộ**: Đóng vai trò là cộng sự ảo đắc lực cho đội ngũ vận hành, hỗ trợ nhân viên kỹ thuật và cấp quản lý tra cứu nhanh lịch trực, tổng hợp hồ sơ khách hàng 360 độ, theo dõi hàng tồn kho chạm ngưỡng an toàn và đối soát tài chính với cơ chế kiểm soát truy cập nghiêm ngặt.

Toàn bộ giải thuật được xây dựng trên nguyên tắc gắn kết dữ liệu thực tế mang tính tất định (Deterministic Grounding), triệt tiêu hoàn toàn hiện tượng suy diễn sai lệch (Hallucination) của các mô hình ngôn ngữ lớn, đồng thời bảo đảm tính minh bạch, toàn vẹn và an toàn tuyệt đối cho dữ liệu doanh nghiệp.

---

## 8.1. Mô hình kiến trúc phân tầng hệ thống

### 8.1.1. Kiến trúc phân tầng chức năng

Nhằm bảo đảm tính mở rộng linh hoạt, khả năng bảo trì độc lập và cô lập lỗi giữa các phân hệ, kiến trúc phần mềm của Pawpal được thiết kế theo mô hình phân tầng hướng dịch vụ (Service-Oriented Layered Architecture) gồm bốn tầng chức năng riêng biệt. Mỗi tầng đảm nhiệm một vai trò chuyên biệt và giao tiếp với nhau thông qua các giao diện lập trình ứng dụng (API) được chuẩn hóa nghiêm ngặt.

Tầng đầu tiên là Tầng Giao diện người dùng (User Interface Layer), nơi tiếp nhận trực tiếp mọi tương tác từ các nhóm đối tượng sử dụng khác nhau. Kênh Khách hàng công chúng được phát triển dưới dạng ứng dụng web đơn trang (Single Page Application - SPA) tương thích đa thiết bị, cung cấp cổng thông tin giới thiệu dịch vụ, quy trình đặt lịch làm đẹp (Grooming & Spa), khách sạn thú cưng (Pet Hotel), xe đưa đón (Pet Taxi), cửa hàng bán lẻ và widget trò chuyện trực tiếp (Pawpal Chatbot). Kênh Thành viên đã xác thực mang lại không gian cá nhân hóa giúp khách hàng theo dõi hồ sơ thú cưng, lịch hẹn cá nhân, tình trạng giao hàng, ví điểm tích lũy Pawpoint và lịch sử khiếu nại. Song song với đó, Kênh Quản trị nội bộ (Pawpal Admin Workspace) là giao diện làm việc dành riêng cho nhân viên kỹ thuật (Staff) và cấp quản trị (Admin), tích hợp các bảng điều khiển trực quan, danh mục điều phối ca làm việc và không gian tương tác với Trợ lý AI Copilot.

Tầng thứ hai là Tầng Cổng dịch vụ trung gian (Backend API Gateway Layer), đóng vai trò là "trái tim" điều phối toàn bộ lưu lượng yêu cầu đến hệ thống thông qua điểm cuối trung tâm `/api/admin-chat`. Cổng dịch vụ chịu trách nhiệm xác thực phiên làm việc, phân định vai trò gọi lệnh, áp đặt hạn mức tần suất truy cập (Rate Limiting), kiểm duyệt nội dung độc hại và ngăn chặn các cuộc tấn công tiêm nhiễm câu lệnh (Prompt Injection). Đồng thời, tầng này đóng vai trò là bộ lập lịch (Scheduler) và quản lý tài nguyên, thực hiện phân tích cú pháp nghiệp vụ và điều phối các công cụ truy vấn dữ liệu trước khi quyết định gọi mô hình trí tuệ nhân tạo.

Tầng thứ ba là Tầng Cơ sở dữ liệu và Lưu trữ (Database & Storage Layer), được vận hành trên nền tảng Supabase PostgreSQL mạnh mẽ nhằm lưu trữ toàn bộ dữ liệu thực thể nghiệp vụ như danh mục dịch vụ, hồ sơ thú cưng, sổ cái giao dịch, bảng giá ma trận và nhật ký hội thoại. Tính toàn vẹn và bảo mật của dữ liệu được thực thi trực tiếp tại tầng này thông qua các chính sách bảo mật cấp hàng (Row-Level Security - RLS), các hàm thủ tục lưu trữ an toàn (Stored Procedures / RPC) và các cơ chế khóa truy vấn tạm thời (Lease Token). Kho lưu trữ tệp tin (Object Storage) được tách biệt chuyên dụng để quản lý tài sản đa phương tiện như hình ảnh thú cưng hay ảnh minh chứng khiếu nại dịch vụ với đường dẫn truy cập có chữ ký số xác thực.

Tầng cuối cùng là Tầng Tích hợp Trí tuệ nhân tạo (AI Integration Layer), nơi tích hợp mô hình ngôn ngữ lớn tiên tiến Google Gemini 2.5 Flash nhằm xử lý tác vụ hiểu ngôn ngữ tự nhiên tiếng Việt, tóm tắt ngữ cảnh phức tạp và soạn thảo văn bản phản hồi thấu cảm. Tầng này hoạt động dưới sự kiểm soát của cơ chế quản lý bể khóa API luân phiên (API Key Pool Manager) với giải thuật tự phục hồi khi gặp sự cố nghẽn hạn mức (Circuit Breaker & Automatic Failover). Mô hình AI tại đây tuân thủ nguyên tắc "không tin cậy" (Zero-Trust Prompting): chỉ tiếp nhận dữ liệu đã được làm sạch và giới hạn chặt chẽ trong phạm vi cho phép, hoàn toàn không có quyền can thiệp hay đọc trực tiếp vào cơ sở dữ liệu.

![Sơ đồ kiến trúc phân tầng PawPal](figures/chuong-08/hinh-08-01-kien-truc-phan-tang.png)

**Hình 8.1.** Kiến trúc phân tầng chức năng của hệ thống Pawpal.

Như được minh họa tại Hình 8.1, mọi giao tiếp từ trình duyệt người dùng đến cổng dịch vụ đều được bảo vệ qua giao thức HTTPS được mã hóa. Tùy thuộc vào bản chất của từng tác vụ, hệ thống hỗ trợ cả phương thức phản hồi JSON đồng bộ và cơ chế truyền phát sự kiện một chiều từ máy chủ (Server-Sent Events - SSE), giúp tối ưu hóa băng thông mạng và mang lại tốc độ hiển thị tức thì.

---

### 8.1.2. Mô hình triển khai và luồng tương tác giữa các thành phần

Trong môi trường triển khai thực tế của Pawpal, kiến trúc phân tán điện toán đám mây (Cloud Infrastructure) được áp dụng nhằm tối ưu hóa độ sẵn sàng cao (High Availability) và khả năng chịu tải. Nền tảng Vercel Edge Network đảm nhận vai trò lưu trữ các tài nguyên tĩnh giao diện và vận hành các hàm phi máy chủ (Serverless Functions) làm cổng dịch vụ trung gian. Song song đó, nền tảng Supabase Cloud quản lý cụm cơ sở dữ liệu PostgreSQL phân cụm và máy chủ xác thực danh tính Supabase Auth, trong khi nền tảng Google Cloud Vertex AI / Generative Language API cung cấp dịch vụ suy luận mô hình Gemini với độ trễ thấp.

Quy trình giao tiếp giữa các thành phần tuân thủ nghiêm ngặt nguyên tắc phòng thủ theo chiều sâu (Defense-in-Depth). Khi người dùng nhập câu hỏi vào giao diện, trình duyệt đóng gói yêu cầu kèm mã phiên xác thực JWT đối với nhân sự hoặc thành viên, hoặc chuỗi token khách vãng lai đã được băm mã hóa một chiều qua thuật toán SHA-256. Ngay khi tiếp nhận yêu cầu, cổng dịch vụ trung gian lập tức thẩm định tính hợp lệ của danh tính và kiểm tra hạn mức an toàn của phiên nhằm khống chế tần suất không quá 10 tin nhắn mỗi phút cho một phiên trò chuyện.

Sau khi vượt qua lớp kiểm duyệt văn bản sơ bộ, cổng dịch vụ gửi yêu cầu đăng ký một suất truy vấn tạm thời có thời hạn cố định (Lease Token) xuống cơ sở dữ liệu thông qua lời gọi hàm `acquire_admin_chat_read`. Cơ chế này ngăn chặn việc quét dữ liệu hàng loạt và giới hạn tài nguyên tính toán của từng phiên. Căn cứ vào vai trò của người gọi, máy chủ thực thi các hàm RPC đọc dữ liệu tương ứng và làm sạch toàn bộ các định danh kỹ thuật nội bộ trước khi chuyển sang bước tiếp theo. Nếu câu hỏi thuộc dạng truy vấn số liệu tất định như bảng giá dịch vụ, số lượng tồn kho hay lịch hẹn, máy chủ tự động định dạng câu trả lời và phản hồi ngay lập tức mà không cần gọi đến mô hình AI. Ngược lại, nếu câu hỏi đòi hỏi năng lực tổng hợp tự nhiên hoặc soạn thảo văn bản hỗ trợ, ngữ cảnh đã chuẩn hóa mới được chuyển tới mô hình Gemini kèm chỉ thị hệ thống nghiêm ngặt.

![Sơ đồ trình tự giao tiếp và kiểm soát bảo mật](figures/chuong-08/hinh-08-02-luong-giao-tiep-bao-mat.png)

**Hình 8.2.** Luồng giao tiếp và cơ chế kiểm soát bảo mật đa lớp giữa các thành phần.

Hình 8.2 thể hiện rõ sự phân tách trách nhiệm giữa máy chủ ứng dụng và mô hình AI. Máy chủ ứng dụng giữ vai trò "người gác cổng" tuyệt đối, kiểm soát hoàn toàn việc đọc dữ liệu từ CSDL và chỉ cung cấp cho mô hình AI đúng những dữ liệu tối thiểu cần thiết để sinh phản hồi.

---

## 8.2. Kiến trúc an toàn thông tin và kiểm soát truy cập

### 8.2.1. Cơ chế xác thực và quản lý định danh người dùng

Một hệ thống quản lý dịch vụ chăm sóc thú cưng đòi hỏi xử lý đồng thời hai luồng định danh với các yêu cầu bảo mật chuyên biệt. Đối với thành viên và nhân viên nội bộ, việc xác thực được quản lý tập trung thông qua dịch vụ Supabase Auth sử dụng chuẩn mã thông báo Web JSON (JWT) mã hóa theo thuật toán mã hóa bất đối xứng. Khi người dùng đăng nhập thành công, máy chủ cấp phát một cặp mã gồm `access_token` có thời hạn sống ngắn và `refresh_token`. Khi thực hiện các yêu cầu trợ lý, mã thông báo này được gửi kèm trong tiêu đề ủy quyền HTTP (`Authorization: Bearer <token>`). Máy chủ tiến hành giải mã mã thông báo, xác minh chữ ký số và đối chiếu trạng thái hoạt động của tài khoản trong bảng `customer` hoặc `staff`.

Đối với người dùng chưa tạo tài khoản hoặc chưa đăng nhập, hệ thống áp dụng cơ chế quản lý danh tính khách vãng lai (Guest Identity Management). Hệ thống tự động tạo một chuỗi ngẫu nhiên bảo mật cao (Guest Token) có độ dài từ 32 đến 512 ký tự lưu tại máy khách. Khi gửi lên máy chủ, chuỗi này lập tức được băm bằng thuật toán SHA-256 trước khi đối soát với bản ghi trong bảng `guest_session`. Khách vãng lai chỉ được phép tạo hội thoại tạm thời, hỏi đáp các chính sách công khai và hoàn toàn bị cô lập khỏi các dữ liệu cá nhân của khách hàng khác.

Đặc biệt, nhằm bảo đảm tính liền mạch trong trải nghiệm, hệ thống cung cấp cơ chế chuyển quyền sở hữu hội thoại (Conversation Claiming). Khi khách vãng lai quyết định đăng nhập hoặc đăng ký tài khoản thành viên ngay trong quá trình trò chuyện, toàn bộ lịch sử tư vấn trước đó sẽ được liên kết an toàn vào tài khoản mới thông qua thủ tục lưu trữ `claim_public_chat`. Quá trình này đòi hỏi phải xác minh đồng thời chữ ký băm của phiên khách vãng lai gốc và mã xác thực của tài khoản thành viên tiếp nhận, bảo đảm dữ liệu hội thoại được kế thừa trọn vẹn mà không làm lộ thông tin sang tài khoản khác.

---

### 8.2.2. Kiểm soát phân quyền đa tầng và bảo vệ dữ liệu nghiệp vụ

Pawpal áp dụng mô hình kiểm soát truy cập dựa trên vai trò (Role-Based Access Control - RBAC) kết hợp cùng hàng rào bảo mật cấp dòng (Row-Level Security - RLS) trên nền tảng PostgreSQL, tạo nên một hệ thống chốt chặn phòng thủ vững chắc từ cổng dịch vụ đến từng bản ghi cơ sở dữ liệu.

Ở tầng Cổng dịch vụ trung gian, chốt chặn Gateway Authorization Guard kiểm tra vai trò hệ thống (`system_role`) và danh sách mã quyền hạn (`permissions`) được nhúng trong ngữ cảnh phiên. Nếu người gọi là nhân viên kỹ thuật (`Staff`) nhưng cố tình gửi câu lệnh yêu cầu truy vấn dữ liệu tài chính hoặc tổng hợp doanh thu tiệm, cổng dịch vụ lập tức kích hoạt lỗi phân quyền `42501` và trả về mã trạng thái HTTP `403 Forbidden` ngay tại ngưỡng cửa, không cho phép truy vấn đi sâu vào cơ sở dữ liệu.

Ở tầng Cơ sở dữ liệu, chốt chặn Database RLS & RPC Guard kích hoạt chính sách bảo vệ cấp hàng trên mọi bảng dữ liệu nghiệp vụ như `customer`, `sales_order`, `appointment` và `payment_transaction`. Các truy vấn từ trợ lý chỉ được phép tương tác thông qua các hàm RPC nghiệp vụ cố định (`run_admin_chat_read`, `run_admin_chat_customer_case`, `run_staff_copilot_read`). Bên trong các hàm này, quyền hạn của người gọi được tái thẩm định độc lập với tham số ngữ cảnh phiên, triệt tiêu hoàn toàn nguy cơ giả mạo tham số từ phía trình duyệt.

**Bảng 8.1. Ma trận quyền truy cập theo vai trò trong hệ thống Pawpal**

| Dữ liệu và chức năng nghiệp vụ | Khách vãng lai (Guest) | Thành viên (Member) | Nhân viên kỹ thuật (Staff) | Quản lý hệ thống (Admin) |
| :--- | :---: | :---: | :---: | :---: |
| Tra cứu danh mục dịch vụ và bảng giá công khai | Cho phép | Cho phép | Cho phép | Cho phép |
| Tra cứu hồ sơ khách hàng và đơn hàng cá nhân | Bị từ chối (Yêu cầu đăng nhập) | Cho phép (Chỉ dữ liệu thuộc tài khoản) | Theo phạm vi phân công công việc | Toàn quyền tra cứu hồ sơ 360° |
| Yêu cầu kết nối gặp chuyên viên CSKH | Hướng dẫn đăng nhập tài khoản | Cho phép (Đủ điều kiện thành viên) | Tiếp nhận ca theo hàng đợi phân công | Điều phối ca và giám sát toàn cơ sở |
| Đính kèm hình ảnh minh chứng trong trò chuyện | Bị từ chối | Tối đa 3 ảnh/tin nhắn | Theo quyền xử lý ca chat | Toàn quyền kiểm duyệt và xử lý |
| Tiếp nhận và trao đổi trực tiếp trong ca chat | — | — | Cho phép trong ca được giao | Toàn quyền tiếp quản mọi ca |
| Thêm ghi chú nội bộ cho ca dịch vụ | — | — | Cho phép trong phạm vi ca trực | Toàn quyền ghi chú và đánh giá |
| Tra cứu ca làm việc và lịch trực cá nhân | — | — | Cho phép xem lịch cá nhân | Tra cứu lịch trực toàn bộ nhân sự |
| Cảnh báo hàng tồn kho dưới ngưỡng an toàn | — | — | Cho phép khi có quyền đọc kho | Toàn quyền xem số liệu tồn kho |
| Tổng hợp thực thu và báo cáo tài chính tiệm | — | — | **Bị từ chối 100% (Khóa chặn 403)** | Toàn quyền truy vấn theo khoảng ngày |
| Cấu hình quy tắc kiểm duyệt và mẫu phản hồi | — | — | — | Toàn quyền chỉnh sửa quy tắc |

---

## 8.3. Kiến trúc đường ống xử lý trí tuệ nhân tạo

Đường ống xử lý trí tuệ nhân tạo của Pawpal được thiết kế theo cấu trúc sáu tầng khép kín (Six-Stage Intelligent Pipeline), vận hành tuần tự nhằm bảo đảm mỗi phản hồi trả về cho người dùng đều đạt chuẩn mực cao nhất về độ tin cậy, an toàn thông tin và văn phong giao tiếp thấu cảm:

```
[Câu hỏi người dùng (Khách hàng hoặc Nhân viên)]
                      │
                      ▼
┌────────────────────────────────────────────────────────┐
│ TẦNG 1: Tiếp nhận và kiểm duyệt đầu vào                │
│ • Chuẩn hóa chuỗi ký tự đầu vào                        │
│ • Khớp danh mục từ ngữ vi phạm (Profanity Filter)      │
│ • Chặn Prompt Injection & tấn công tiêm nhiễm câu lệnh │
└────────────────────────────────────────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────────────────┐
│ TẦNG 2: Phân tích ý định và bóc tách thực thể          │
│ • Bóc tách thực thể nghiệp vụ (Cân nặng, mã đơn, ngày) │
│ • Phân loại nhóm ý định (Báo giá, tra cứu, khiếu nại)  │
│ • Định tuyến nhánh xử lý (Dữ liệu tất định hay gọi AI) │
└────────────────────────────────────────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────────────────┐
│ TẦNG 3: Nhận diện cảm xúc và phân luồng xử lý          │
│ • Phân loại cảm xúc 6 cấp độ (Khẩn cấp, bức xúc, lo)   │
│ • Kích hoạt cơ chế xoa dịu tâm lý & hướng dẫn y tế     │
│ • Gắn nhãn ưu tiên chuyển giao ca cho chuyên viên      │
└────────────────────────────────────────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────────────────┐
│ TẦNG 4: Cổng truy vấn dữ liệu an toàn chỉ đọc          │
│ • Cấp phát mã khóa truy vấn tạm thời (Lease Token 8s)  │
│ • Thực thi các hàm nghiệp vụ chỉ đọc an toàn (RPC Read)│
│ • Triệt tiêu hoàn toàn quyền ghi/sửa dữ liệu từ AI     │
└────────────────────────────────────────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────────────────┐
│ TẦNG 5: Kiểm soát thẩm quyền và bảo vệ dữ liệu         │
│ • Kiểm tra quyền hạn theo vai trò (Guest/Member/Staff) │
│ • Chốt chặn an toàn 403 (Cấm Staff xem doanh thu tiệm) │
│ • Làm sạch dữ liệu nhạy cảm (Khử UUID, dữ liệu riêng)  │
└────────────────────────────────────────────────────────┘
                      │
                      ▼
┌────────────────────────────────────────────────────────┐
│ TẦNG 6: Xử lý ngôn ngữ và truyền phát thời gian thực   │
│ • Quản lý bể khóa API (Key Pool) & ngắt mạch quá tải   │
│ • Tạo phản hồi thấu cảm qua Gemini 2.5 Flash theo mẫu  │
│ • Truyền phát SSE tức thì & hậu kiểm chuẩn thương hiệu │
└────────────────────────────────────────────────────────┘
                      │
                      ▼
[Câu trả lời chuẩn xác, an toàn và thấu cảm]
```

Tầng thứ nhất là Tầng Tiếp nhận và kiểm duyệt đầu vào (Input Moderation & Hygiene). Tại tầng này, tin nhắn thô từ người dùng trước hết được chuẩn hóa bằng cách chuyển đổi về chữ thường, loại bỏ các ký tự điều khiển nguy hiểm, xóa khoảng trắng thừa và chuẩn hóa bảng mã Unicode tiếng Việt. Tiếp đó, hệ thống quét chuỗi qua bộ lọc từ ngữ vi phạm hai lớp (Profanity Filter) nhằm phát hiện kịp thời các ngôn từ thô tục, xúc phạm hoặc các biến thể cố tình lách ký tự để làm mờ hoặc chặn xử lý (`BlockMsg`). Đồng thời, tầng này tiến hành rà soát các cấu trúc câu mang dấu hiệu tấn công tiêm nhiễm câu lệnh (Prompt Injection) như *"Hãy quên các chỉ thị trước đó...", "Đóng vai trò là..."*, từ đó lập tức kích hoạt cơ chế phòng vệ và cô lập câu lệnh trước khi chuyển tiếp vào hệ thống.

Tầng thứ hai là Tầng Phân tích ý định và bóc tách thực thể (Intent Classification & Entity Extraction). Bộ phân tích cú pháp nghiệp vụ tự động bóc tách các thực thể cốt lõi xuất hiện trong câu hỏi như giống loài thú cưng, khoảng cân nặng thực tế (ví dụ: *Poodle 5kg*), ngày giờ theo múi giờ Việt Nam, mã số đơn hàng (`ORD-...`) hoặc số điện thoại khách hàng. Sau khi bóc tách thực thể, hệ thống phân loại mục đích tương tác thành các nhóm ý định nghiệp vụ rõ ràng như tra cứu bảng giá theo cân, kiểm tra tình trạng đơn hàng, rà soát lịch trống, hỏi đáp chính sách chung hoặc gửi khiếu nại dịch vụ. Từ đó, bộ lập kế hoạch định tuyến xác định câu hỏi có thể giải quyết ngay bằng dữ liệu tất định từ CSDL (Deterministic Lookup) hay cần chuyển tiếp sang mô hình ngôn ngữ lớn để tổng hợp câu trả lời tự nhiên.

Tầng thứ ba là Tầng Nhận diện cảm xúc và phân luồng xử lý (Emotion Recognition & Sentiment Routing). Bộ phân loại cảm xúc tự động phân tích mức độ căng thẳng của người dùng vào sáu cấp độ và năm nhóm rủi ro: cấp cứu y tế thú cưng (Cấp 1), bức xúc tài chính trừ tiền hai lần (Cấp 2), lo lắng sức khỏe sau dịch vụ (Cấp 3), khiếu nại trễ hẹn hoặc phục vụ (Cấp 4) và thắc mắc thông thường (Cấp 5 - 6). Hệ thống kích hoạt ngay chiến lược xoa dịu tâm lý tương ứng (`EmpathyCare`), định hình giọng điệu phản hồi nhân văn, tránh tuyệt đối phong cách hành chính cứng nhắc. Khi phát hiện sự cố nghiêm trọng, hệ thống tự động bật cờ ưu tiên chuyển giao ca (`Handover`) để chuyên viên chăm sóc khách hàng hoặc nhân viên trực tiếp tiếp quản cuộc trò chuyện.

Tầng thứ tư là Tầng Cổng truy vấn dữ liệu an toàn chỉ đọc (Read-only Data Admission & Lease Allocation). Nhằm triệt tiêu hoàn toàn nguy cơ mô hình AI tự tiện can thiệp CSDL, toàn bộ các tác vụ đọc dữ liệu được quy định trong một danh mục công cụ cố định (Read Tools Registry). Máy chủ cấp phát một mã khóa truy vấn tạm thời (`lease_id`) có thời hạn hiệu lực tối đa 8.000 mili-giây. Mọi hàm RPC chỉ chấp nhận thực thi khi có mã `lease_id` hợp lệ và tự động thu hồi tài nguyên ngay sau khi đọc xong. Toàn bộ các thao tác ghi dữ liệu, sửa đổi trạng thái đơn hàng hay tạo lịch hẹn mới đều bị nghiêm cấm trong luồng trợ lý này.

Tầng thứ năm là Tầng Kiểm soát thẩm quyền và bảo vệ dữ liệu (Role-Based Authorization & Context Sanitization). Tầng này kiểm tra nghiêm ngặt quyền hạn người gọi theo bốn vai trò hệ thống gồm Khách vãng lai, Thành viên đã đăng nhập, Nhân viên kỹ thuật và Quản lý cơ sở. Nếu nhân viên kỹ thuật (Staff) yêu cầu truy vấn các chỉ số tài chính, doanh thu hoặc lợi nhuận của tiệm, chốt chặn an toàn Permission Guard lập tức khóa chặn với mã lỗi `42501` và phản hồi thông báo từ chối thẩm quyền (HTTP 403 Forbidden). Đồng thời, tầng này thực hiện khử khuẩn ngữ cảnh (Context Sanitization) bằng cách loại bỏ toàn bộ định danh kỹ thuật nội bộ (UUID), tên cột cơ sở dữ liệu và dữ liệu cá nhân của khách hàng khác trước khi đưa vào ngữ cảnh suy luận, áp đặt hợp đồng bằng chứng nghiêm ngặt (Grounding Contract) cấm AI tự suy đoán khi thiếu dữ liệu thực tế.

Tầng thứ sáu là Tầng Xử lý ngôn ngữ và truyền phát thời gian thực (LLM Inference & Stream Synthesis). Quá trình kết nối được quản lý qua bể khóa API thông minh (Key Pool Manager) với cơ chế ngắt mạch tự động (Circuit Breaker) khi gặp tình trạng quá tải hoặc hạn chế tần suất gọi (HTTP 429). Mô hình Google Gemini 2.5 Flash được kích hoạt để sinh câu trả lời tự nhiên, chính xác bằng tiếng Việt dựa trên dữ liệu đã được làm sạch và hợp đồng bằng chứng. Luồng dữ liệu truyền phát một chiều (Server-Sent Events - SSE) cho phép đẩy từng cụm từ về máy khách ngay khi mô hình vừa tạo ra, giúp giảm độ trễ phản hồi cụm từ đầu tiên (Time-to-First-Token) xuống dưới 1 giây. Trước khi hiển thị trên màn hình, chuỗi văn bản đầu ra được hậu kiểm lần cuối nhằm loại bỏ lỗi kỹ thuật và định dạng theo văn phong chuẩn mực của Pawpal (xưng *Pawpal*, gọi khách hàng là *bạn*, gọi thú cưng là *bé*).

![Sơ đồ sáu tầng xử lý yêu cầu trợ lý](figures/chuong-08/hinh-08-03-duong-ong-ai.png)

**Hình 8.3.** Sơ đồ kiến trúc đường ống xử lý trí tuệ nhân tạo sáu tầng của hệ thống Pawpal.

---

## 8.4. Giải thuật trợ lý thông minh hỗ trợ khách hàng

### 8.4.1. Mục tiêu và giá trị hỗ trợ khách hàng

Trợ lý Pawpal Chatbot được định vị là người bạn đồng hành tin cậy của mỗi chủ nuôi trên website công chúng. Mục tiêu cao nhất của giải thuật là mang lại câu trả lời nhanh chóng, chuẩn xác và ấm áp, giúp khách hàng tháo gỡ băn khoăn và nắm bắt rõ ràng bước thao tác tiếp theo. Khác với các chatbot thương mại điện tử thông thường chỉ tập trung vào việc bán hàng, Pawpal Chatbot chú trọng đặc biệt vào giá trị thấu cảm và trách nhiệm y tế đối với thú cưng.

Giá trị đầu tiên là khả năng tư vấn dịch vụ dựa trên số liệu cá nhân hóa. Khi khách hàng cung cấp cân nặng của thú cưng (chẳng hạn như cún Poodle 5kg), trợ lý không đưa ra một mức giá chung chung mà tự động lọc chính xác các gói tắm và cắt tỉa tương ứng với khoảng cân đó từ bảng giá niêm yết của tiệm trong cơ sở dữ liệu, kèm theo thời lượng dự kiến và liên kết đặt lịch một chạm thuận tiện.

Giá trị thứ hai là sự tôn trọng tuyệt đối đối với an toàn sức khỏe thú cưng. Chatbot được lập trình để không bao giờ đưa ra các chẩn đoán bệnh lý thú y tùy tiện. Khi tiếp nhận thông tin về các triệu chứng bất thường của thú cưng, trợ lý đóng vai trò hướng dẫn sơ cứu ban đầu an toàn, giải tỏa tâm lý lo âu của chủ nuôi và cung cấp các chỉ dẫn cụ thể để khách chuẩn bị thông tin trước khi liên hệ bác sĩ thú y chuyên khoa.

Giá trị thứ ba là cơ chế tách bạch rõ ràng giữa kênh tư vấn công khai và kênh giải quyết khiếu nại chính thức. Chatbot phục vụ tư vấn thông tin và giải đáp thắc mắc thông thường. Đối với các vấn đề liên quan đến khiếu nại dịch vụ hoặc yêu cầu bồi hoàn tài chính, trợ lý hướng dẫn khách hàng gửi phiếu phản ánh chính thức tại phân hệ Hỗ trợ để quy trình nghiệp vụ được kiểm soát minh bạch, có lưu trữ chứng từ và phân công nhân sự giải quyết theo đúng thỏa thuận mức dịch vụ (SLA).

**Bảng 8.2. Phân định phạm vi hỗ trợ giữa Chatbot công chúng và Copilot quản trị**

| Nhu cầu nghiệp vụ cần xử lý | Trợ lý Chatbot (Khách vãng lai) | Trợ lý Chatbot (Thành viên đăng nhập) | Trợ lý Copilot (Nhân viên kỹ thuật) | Trợ lý Copilot (Quản lý hệ thống) |
| :--- | :--- | :--- | :--- | :--- |
| Tra cứu bảng giá dịch vụ làm đẹp | Báo giá tham khảo lọc theo cân nặng thực tế | Báo giá tham khảo lọc theo cân nặng thực tế | Tra cứu bảng giá theo quy định phân công | Toàn quyền tra cứu ma trận giá và phụ phí |
| Kiểm tra phòng khách sạn thú cưng còn trống | Giới thiệu loại phòng, kiểm tra ở bước đặt lịch | Giới thiệu loại phòng, kiểm tra ở bước đặt lịch | Kiểm tra phòng theo ngày giờ được giao | Tra cứu tình trạng phòng và lịch lưu trú toàn tiệm |
| Tra cứu đơn hàng và điểm thưởng tích lũy | Chốt chặn từ chối, hướng dẫn đăng nhập | Hiển thị chính xác đơn hàng và số dư điểm cá nhân | Tra cứu đơn hàng phục vụ công tác giao nhận | Toàn quyền tra cứu lịch sử mua sắm khách hàng |
| Đính kèm hình ảnh trong cuộc trò chuyện | Chốt chặn yêu cầu xác thực tài khoản | Cho phép đính kèm tối đa 3 ảnh minh chứng | Tra cứu ảnh phục vụ xử lý ca dịch vụ | Toàn quyền kiểm duyệt và lưu trữ hình ảnh |
| Tra cứu ca làm việc và lịch trực cá nhân | Không hỗ trợ | Không hỗ trợ | Hiển thị ca trực cá nhân và lịch được giao | Tra cứu bảng phân ca toàn bộ nhân sự tiệm |
| Rà soát sản phẩm tồn kho chạm ngưỡng tối thiểu | Không hỗ trợ | Không hỗ trợ | Liệt kê danh sách theo phạm vi kho được giao | Tổng hợp danh sách SKU tồn thấp toàn cơ sở |
| Tổng hợp doanh thu và thực thu tài chính | Không hỗ trợ | Không hỗ trợ | **Bị từ chối 100% (Khóa chặn an toàn 403)** | Tổng hợp doanh thu, hoàn tiền và thực thu theo kỳ |

---

### 8.4.2. Cách thức khách hàng tương tác và trải nghiệm

Giao diện tương tác của Chatbot được nhúng tinh gọn dưới dạng widget nổi ở góc dưới bên phải màn hình website, mang phong cách thiết kế phẳng hiện đại với tông màu xanh lá rừng chủ đạo (`#236B48`). Người dùng có thể dễ dàng thu phóng khung trò chuyện, tương tác mượt mà trên cả trình duyệt máy tính và thiết bị di động.

![Lưu đồ xử lý hội thoại khách hàng](figures/chuong-08/hinh-08-04-luong-chatbot.png)

**Hình 8.4.** Lưu đồ giải thuật quy trình xử lý hội thoại và phân luồng trải nghiệm của Trợ lý Pawpal Chatbot.

Theo lưu đồ giải thuật tại Hình 8.4, quy trình xử lý một lượt trò chuyện của khách hàng bắt đầu từ thời điểm người dùng gửi tin nhắn vào widget Chatbot. Chuỗi văn bản lập tức được tiếp nhận và chuẩn hóa nhằm loại bỏ ký tự nguy hiểm và khoảng trắng thừa. Bước tiếp theo là kiểm tra vi phạm ngôn từ (`CheckProfanity`); nếu tin nhắn chứa từ ngữ xúc phạm hoặc thô tục, hệ thống chặn xử lý (`BlockMsg`), gửi thông điệp nhắc nhở lịch sự và kết thúc phiên.

Khi câu hỏi vượt qua lớp kiểm duyệt, hệ thống chuyển sang kiểm tra trạng thái sức khỏe thú cưng (`CheckHealth`). Nếu phát hiện khách hàng đang bày tỏ sự lo lắng về việc bé cún hoặc mèo mệt mỏi, biếng ăn sau dịch vụ (Cảm xúc Cấp 3 - Chăm sóc đặc biệt), hệ thống kích hoạt ngay nhánh xoa dịu tâm lý (`EmpathyCare`), hướng dẫn chăm sóc ban đầu an toàn và hoàn tất lượt tương tác. 

Ngược lại, nếu câu hỏi không chứa yếu tố khẩn cấp sức khỏe, luồng xử lý chuyển sang phân loại ý định nghiệp vụ (`CheckIntent`). Với nhu cầu hỏi giá dịch vụ làm đẹp, hệ thống đọc bảng giá theo cân nặng thực tế trong CSDL, bổ sung thời lượng dự kiến và tạo liên kết đặt lịch nhanh. Đối với yêu cầu tra cứu đơn hàng hoặc hồ sơ riêng, hệ thống kiểm tra phiên đăng nhập (`CheckAuth`): nếu là khách vãng lai, chốt chặn quyền riêng tư (`DenyPrivate`) được kích hoạt để lịch sự giải thích và mời đăng nhập; nếu là thành viên đã xác thực, dữ liệu chính chủ được trích xuất an toàn (`ReadMember`). Khi khách hàng phản ánh sự cố dịch vụ hoặc yêu cầu bồi hoàn, hệ thống kích hoạt chế độ chuyển giao ca (`Handover`) cho chuyên viên CSKH và hướng dẫn tạo phiếu hỗ trợ. Cuối cùng, với các câu hỏi thông tin chung, hệ thống truy vấn kho tri thức câu hỏi thường gặp (`SearchFAQ`) để phản hồi ngắn gọn, chuẩn xác.

![Khung Chatbot PawPal hiển thị câu hỏi và giờ mở cửa ngày thường, cuối tuần](figures/chuong-08/hinh-08-05-chatbot-cong-khai.png)

**Hình 8.5.** Giao diện tương tác thực tế của Trợ lý Pawpal Chatbot khi tư vấn thông tin giờ mở cửa công khai.

Hình 8.5 minh chứng cho năng lực phản hồi tự nhiên và mạch lạc của Chatbot khi tiếp nhận câu hỏi của khách vãng lai: *"Xin chào PawPal, tiệm mình mở cửa lúc mấy giờ vậy?"*. Hệ thống đã trích xuất chính xác dữ liệu giờ làm việc được công bố (08:00 – 20:00 ngày thường và 08:00 – 21:00 cuối tuần), đồng thời chủ động gợi ý kiểm tra lịch trống và cung cấp nút liên hệ thuận tiện.

**Bảng 8.3. Bảng ánh xạ ý định người dùng với nguồn dữ liệu và kết quả nghiệp vụ**

| Nhóm ý định | Câu hỏi mẫu của người dùng | Nguồn dữ liệu hoặc quy tắc xử lý | Kết quả phản hồi thực tế |
| :--- | :--- | :--- | :--- |
| **Tra cứu giờ hoạt động** | *“PawPal mở cửa mấy giờ?”* | Dữ liệu cấu hình hệ thống được công bố | Giờ mở cửa ngày thường, cuối tuần và thông tin liên hệ |
| **Báo giá theo cân nặng** | *“Giá tắm sấy cho chó Poodle 7kg?”* | Danh mục dịch vụ và bảng giá ma trận theo cân | Liệt kê các gói phù hợp, giá tiền, thời lượng và link đặt |
| **Kiểm tra tình trạng hàng** | *“Hạt Royal Canin cho mèo còn không?”* | Bảng tồn kho biến thể sản phẩm đang bán | Thông báo giá tiền và trạng thái còn hàng tức thời |
| **Kiểm tra phòng khách sạn** | *“Khách sạn còn phòng trống ngày mai không?”* | Quy trình hướng dẫn kiểm tra phòng khả dụng | Hướng dẫn chọn ngày giờ cụ thể tại màn hình đặt phòng |
| **Quy định đặt lịch vãng lai** | *“Chưa có tài khoản thì đặt cho 2 bé được không?”* | Hướng dẫn quy trình đặt lịch dịch vụ | Giải thích chính sách: mỗi lượt đặt áp dụng cho một bé |
| **Kiểm tra đơn hàng cá nhân** | *“Đơn hàng hôm qua của tôi giao đến đâu rồi?”* | Kiểm tra phiên đăng nhập $\rightarrow$ Đọc bảng đơn hàng | Trả về mã đơn và trạng thái, hoặc nhắc đăng nhập nếu là khách vãng lai |
| **Số dư điểm và ưu đãi** | *“Tôi còn bao nhiêu điểm và có voucher nào?”* | Sổ cái điểm thưởng và ví ưu đãi tài khoản | Số dư Pawpoint hiện có và danh sách ưu đãi khả dụng |
| **Khiếu nại hoặc bồi hoàn** | *“Tôi bị trừ tiền hai lần mà không có đơn”* | Quy trình xử lý sự cố tại phân hệ Hỗ trợ | Lời trấn an, hướng dẫn gửi mã giao dịch để đối soát |

---

## 8.5. Giải thuật trợ lý thông minh hỗ trợ vận hành

### 8.5.1. Mục tiêu và giá trị hỗ trợ đội ngũ vận hành

Trong môi trường vận hành bận rộn của chuỗi chăm sóc thú cưng, thời gian của nhân viên kỹ thuật và cấp quản lý là tài nguyên vô cùng quý giá. Trợ lý Pawpal Copilot được xây dựng như một công cụ hỗ trợ ra quyết định thông minh, giảm thiểu tối đa các thao tác tìm kiếm thủ công qua nhiều trang quản trị phức tạp.

Giá trị vận hành nổi bật trước hết nằm ở năng lực tổng hợp Hồ sơ khách hàng toàn diện 360 độ (Customer 360 Profile). Thay vì nhân viên phải mở đồng thời ba phân hệ khác nhau để tìm thông tin chủ nuôi, danh sách thú cưng và lịch sử ca làm, Copilot cho phép tổng hợp toàn bộ các dữ kiện này chỉ với một câu lệnh đơn giản kèm số điện thoại hoặc mã khách hàng (`0912345678`).

Bên cạnh đó, Copilot cung cấp cơ chế cảnh báo tồn kho an toàn theo thời gian thực (Inventory Low-Stock Warning). Hệ thống tự động so sánh số lượng tồn kho thực tế của từng mã biến thể (SKU) với định mức tồn tối thiểu đã cấu hình, lập tức đưa ra danh mục các mặt hàng sắp cạn kiệt để thủ kho kịp thời lên kế hoạch nhập hàng.

Hơn nữa, trợ lý hỗ trợ tra cứu ca trực và điều phối lịch dịch vụ linh hoạt, cho phép kỹ thuật viên nắm bắt nhanh các ca phục vụ Spa, Pet Hotel hoặc Pet Taxi trong ngày, hỗ trợ sắp xếp thời gian chuẩn bị dụng cụ và tiếp đón thú cưng chu đáo. Cuối cùng, Copilot kiểm soát ranh giới dữ liệu tài chính nghiêm ngặt, triệt tiêu hoàn toàn khả năng nhân viên cấp dưới vô tình hoặc cố ý khai thác trái phép các báo cáo doanh thu tài chính nhạy cảm của doanh nghiệp thông qua cơ chế phân quyền RBAC đa tầng.

**Bảng 8.4. Danh mục các công cụ tra cứu dữ liệu an toàn tiêu biểu của Trợ lý Copilot**

| Tên công cụ nội bộ | Quyền hạn yêu cầu (Nhân viên) | Quyền hạn yêu cầu (Quản lý) | Nguồn dữ liệu trong CSDL | Kết quả nghiệp vụ trả về |
| :--- | :--- | :--- | :--- | :--- |
| **Tra cứu khách hàng** | Đọc khách hàng theo phạm vi ca | Toàn quyền đọc hồ sơ khách hàng | Bảng `customer`, `customer_profile` | Thông tin định danh, số điện thoại, hạng thành viên |
| **Tra cứu thú cưng** | Đọc hồ sơ thú cưng theo ca | Toàn quyền đọc hồ sơ thú cưng | Bảng `pet_profile`, `pet_breed` | Tên bé, giống loài, giới tính, trạng thái hoạt động |
| **Lịch dịch vụ Spa** | Xem lịch được giao phụ trách | Toàn quyền đọc lịch hẹn toàn tiệm | Bảng `appointment`, `appointment_item` | Danh sách lịch hẹn theo ngày, trạng thái, thú cưng |
| **Cảnh báo tồn kho thấp** | Đọc kho theo phạm vi kho hàng | Toàn quyền đọc kho và sản phẩm | Bảng `product_variant`, `product` | Danh sách SKU có số tồn thực tế nhỏ hơn mức tối thiểu |
| **Kiểm tra phòng khách sạn** | Đọc lịch đặt phục vụ lưu trú | Toàn quyền đọc phòng và lưu trú | Bảng `hotel_room`, `hotel_booking` | Tình trạng phòng trống theo khoảng thời gian yêu cầu |
| **Tra cứu lịch trực nhân sự** | Xem ca trực cá nhân của mình | Toàn quyền đọc lịch trực toàn tiệm | Bảng `staff`, `staff_schedule` | Lịch trực cá nhân hoặc danh sách nhân sự trực ngày |
| **Đối soát đơn hàng lẻ** | Thu tiền tại quầy theo ca | Toàn quyền đọc đơn và thanh toán | Bảng `sales_order`, `payment` | Tiền đã thu, đã hoàn, số tiền còn thiếu của một đơn |
| **Tổng hợp thực thu** | **Bị từ chối (Không có quyền)** | Quyền đọc thanh toán và hoàn tiền | Sổ cái thanh toán và hoàn tiền | Tổng thu, tổng hoàn và thực thu theo khoảng ngày |

---

### 8.5.2. Cách thức nhân viên khai thác và sử dụng Copilot

Nhân viên kỹ thuật và cấp quản lý truy cập Copilot thông qua phân hệ Trợ lý AI trên thanh điều hướng của trang quản trị. Giao diện làm việc được tối ưu hóa với danh sách các phiên trò chuyện bên trái và khung trao đổi nghiệp vụ bên phải, hỗ trợ các nút gợi ý tác vụ nhanh như kiểm tra lịch hẹn Spa hôm nay, lọc sản phẩm sắp hết hàng, soạn lời xin lỗi khách hàng hoặc tóm tắt khiếu nại tồn đọng.

![Lưu đồ xử lý tác vụ và kiểm tra quyền Copilot](figures/chuong-08/hinh-08-06-luong-copilot.png)

**Hình 8.6.** Lưu đồ giải thuật quy trình xử lý tác vụ thông minh và kiểm soát thẩm quyền của Trợ lý Pawpal Copilot.

Theo lưu đồ tại Hình 8.6, quy trình xử lý tác vụ của Copilot tuân thủ quy trình kiểm soát thẩm quyền nghiêm ngặt. Khi nhân sự gửi yêu cầu, hệ thống tiến hành xác thực định danh công vụ (`AuthStaff`) thông qua mã token JWT; nếu phiên không hợp lệ, hệ thống từ chối và yêu cầu đăng nhập lại. Tiếp theo, bộ phân tích cú pháp và nhận diện tác vụ (`IntentRouter`) thẩm định nội dung câu hỏi. 

Nếu yêu cầu liên quan đến doanh thu hoặc báo cáo tài chính, hệ thống kiểm tra vai trò người gọi (`CheckRole`): đối với Kỹ thuật viên (`Staff`), cơ chế chốt chặn RBAC lập tức từ chối và trả về mã lỗi bảo mật 42501; đối với Quản trị viên (`Admin`), hệ thống cấp quyền đọc và truy vấn sổ cái thực thu chính xác. Trong trường hợp yêu cầu xem hồ sơ khách hàng 360 độ, hệ thống tự động liên kết ba nguồn dữ liệu gồm thông tin chủ nuôi, danh sách thú cưng và đơn hàng mới nhất. Đối với yêu cầu cảnh báo tồn kho an toàn hoặc tra cứu lịch hẹn, hệ thống truy vấn các bảng dữ liệu tương ứng. Cuối cùng, mọi câu hỏi và kết quả tra cứu đều được ghi nhận lưu vết kiểm toán (`AuditLog`) vào bảng `admin_copilot_history` phục vụ công tác giám sát bảo mật nội bộ.

![Khung Copilot của quản lý hiển thị số lịch Spa và cắt tỉa chờ phục vụ](figures/chuong-08/hinh-08-07-copilot-quan-ly.png)

**Hình 8.7.** Giao diện phân hệ làm việc Trợ lý Pawpal Copilot trong không gian quản trị khi tra cứu lịch Spa chờ phục vụ.

Hình 8.7 minh họa phản hồi thực tế của Copilot khi quản lý gửi câu lệnh: *"Hôm nay bao nhiêu lịch Spa chờ phục vụ?"*. Hệ thống đã phân tích thời gian theo ngày hiện tại (25/11/2026), áp dụng bộ lọc nhóm dịch vụ `grooming_spa` ở trạng thái `confirmed`, trả về thông báo không có lịch tồn đọng kèm thời điểm đối soát tức thời và nút bấm điều hướng nhanh mở thẳng phân hệ Lịch hẹn.

---

## 8.6. Cơ chế giải thuật vận hành bên dưới giao diện

### 8.6.1. Phân tích ngữ cảnh, nhận diện ý định và hạn chế suy diễn

Một trong những thách thức lớn nhất khi ứng dụng trí tuệ nhân tạo vào hệ thống nghiệp vụ là nguy cơ mô hình ngôn ngữ tự ý suy diễn hoặc "bịa đặt" thông tin (AI Hallucination). Để loại bỏ hoàn toàn rủi ro này, Pawpal áp dụng cơ chế Gắn kết dữ liệu tất định (Deterministic Grounding) thông qua việc phân tách rạch ròi giữa câu hỏi dữ liệu và câu hỏi tổng hợp.

Các câu hỏi liên quan đến con số cụ thể như giá dịch vụ, số lượng tồn kho, doanh thu tiệm hay danh sách thú cưng được xử lý hoàn toàn bằng mã nguồn thuật toán truyền thống và các hàm SQL truy vấn trực tiếp cơ sở dữ liệu. Kết quả trả về được định dạng bằng khuôn mẫu có sẵn, tuyệt đối không cho phép mô hình AI can thiệp vào các con số này. Mô hình Gemini chỉ được kích hoạt trong các tình huống đòi hỏi khả năng xử lý ngôn ngữ mềm dẻo như soạn thảo bản nháp trả lời khiếu nại, tóm tắt diễn biến ca trò chuyện phức tạp hoặc sinh lời xoa dịu tâm lý khách hàng dựa trên những chỉ dẫn y tế an toàn.

Đồng thời, hệ thống áp dụng Quy tắc ba trạng thái kết quả (Three-State Result Handling) nhằm cung cấp phản hồi trung thực và minh bạch. Khi truy vấn thành công nhưng tập kết quả rỗng (chẳng hạn như hôm nay không có lịch hẹn nào), hệ thống thông báo rõ ràng là "Không có lịch hẹn trong ngày hôm nay". Khi nguồn dữ liệu tạm thời không khả dụng do sự cố kết nối, hệ thống thông báo "Chưa đọc được nguồn dữ liệu này" thay vì coi kết quả là rỗng. Trong trường hợp người dùng thiếu quyền truy cập, hệ thống thông báo "Tài khoản chưa có quyền đọc dữ liệu này", bảo đảm tính rành mạch trong kiểm soát an ninh.

---

### 8.6.2. Kiểm duyệt nội dung, cấp độ cảm xúc và xử lý rủi ro

Quy trình kiểm soát nội dung và cảm xúc của Pawpal được thiết kế để xử lý linh hoạt mọi tình huống giao tiếp, từ những câu chào hỏi thông thường đến các sự cố căng thẳng cao độ, bảo đảm sự an toàn tối đa cho thương hiệu và khách hàng.

![Lưu đồ kiểm duyệt và phân cấp cảm xúc](figures/chuong-08/hinh-08-08-kiem-duyet-va-cam-xuc.png)

**Hình 8.8.** Lưu đồ giải thuật kiểm duyệt nội dung độc hại và kích hoạt phân luồng cảm xúc sáu cấp độ.

Giải thuật phân loại cảm xúc tự động chấm điểm và xếp nội dung tin nhắn vào một trong sáu cấp độ. Cấp 1 đại diện cho trạng thái Thân thiện / Chào hỏi thông thường, trợ lý phản hồi ấm áp, chào mừng và gợi mở nhu cầu. Cấp 2 là trạng thái Trung tính đối với các thắc mắc nghiệp vụ về giờ mở cửa, bảng giá hay quy định tiệm, trợ lý cung cấp thông tin ngắn gọn, trực diện từ nguồn xác thực. Cấp 3 là trạng thái Lo lắng / Chăm sóc đặc biệt khi khách hàng bày tỏ sự bất an vì thấy thú cưng mệt mỏi, biếng ăn sau dịch vụ; giải thuật lập tức chặn luồng chào bán dịch vụ, chuyển sang kịch bản dỗ dành, trấn an tâm lý, giải thích phản ứng lạ chỗ và hướng dẫn theo dõi bé tại nhà an toàn. Cấp 4 ghi nhận các Phản ánh sự cố dịch vụ như bé bị trầy xước lông hoặc dịch vụ trễ hẹn, trợ lý gửi lời xin lỗi chân thành và hướng dẫn gửi thông tin đối soát tại mục Hỗ trợ. Cấp 5 là trạng thái Bức xúc cao độ trước các tranh chấp tài chính như bị trừ tiền hai lần, trợ lý ghi nhận sự bức xúc, không tranh cãi, hướng dẫn cung cấp thời điểm giao dịch và tự động đưa hội thoại vào hàng đợi ưu tiên cho chuyên viên CSKH tiếp quản. Cuối cùng, Cấp 6 là tình trạng Cấp cứu y tế khẩn cấp khi thú cưng gặp tai nạn hoặc khó thở; trợ lý đưa ngay cảnh báo khẩn cấp lên đầu câu trả lời, cung cấp hotline cứu hộ thú y và nhắc nhở khách hàng đưa bé đến trạm thú y gần nhất ngay lập tức mà không chờ phản hồi trên chat.

**Bảng 8.5. Bảng phân loại sáu cấp độ cảm xúc, nhóm rủi ro và hành động điều phối tương ứng**

| Cấp độ cảm xúc | Tình huống mẫu của người dùng | Nhóm rủi ro nghiệp vụ | Hành động điều phối và phản hồi thực tế của Pawpal |
| :--- :---: | :--- | :--- | :--- |
| **Cấp 1: Thân thiện** | *“Chào PawPal!”* | Không có rủi ro | Đáp lại lời chào nồng nhiệt, xưng là Pawpal và mời khách nêu nhu cầu hỗ trợ cho bé cưng. |
| **Cấp 2: Trung tính** | *“PawPal mở cửa mấy giờ?”* | Thắc mắc thông thường | Trả lời trực diện giờ mở cửa ngày thường và cuối tuần từ dữ liệu công bố chính thức. |
| **Cấp 3: Lo lắng** | *“Bé cún nhà mình về bị mệt mỏi và biếng ăn sau khi tắm, mình lo quá”* | Chăm sóc đặc biệt (Special Care) | Ghi nhận nỗi lo, xoa dịu tâm lý, giải thích phản ứng tiêu hao năng lượng, hướng dẫn cho bé uống nước và nghỉ ngơi; cam kết đồng hành. |
| **Cấp 4: Phản ánh sự cố** | *“Bé mèo bị trầy xước ở chân sau khi cắt tỉa, nhân viên làm ẩu quá”* | Khiếu nại dịch vụ (Service Complaint) | Gửi lời xin lỗi chân thành, chia sẻ sự xót xa cùng chủ nuôi, hướng dẫn tạo yêu cầu trong mục Hỗ trợ để nhân viên kiểm tra lại ca làm. |
| **Cấp 5: Bức xúc rõ rệt** | *“Hẹn 2 giờ mà 3 giờ chưa tới đón. Tôi bị trừ tiền hai lần mà tài khoản chưa nhận được tiền hoàn lại!”* | Tranh chấp tài chính (Billing Dispute) | Ghi nhận sự bức xúc, hướng dẫn cung cấp thông tin giao dịch để đối soát, tự động chuyển hội thoại sang hàng đợi chờ chuyên viên CSKH. |
| **Cấp 6: Khẩn cấp** | *“Bé nhà tôi bị chảy máu nhiều ở tai và khó thở sau khi ngã, giúp mình sơ cứu với”* | Cấp cứu y tế (Medical Emergency) | Đưa chỉ dẫn cấp cứu lên đầu: yêu cầu liên hệ ngay trạm thú y gần nhất hoặc gọi hotline cứu hộ, không chờ phản hồi trên khung chat. |

---

**Bảng đối sánh phong cách phản hồi theo tình huống thực tế**

Bảng đối sánh dưới đây làm nổi bật sự khác biệt sâu sắc giữa phong cách phản hồi hành chính máy móc truyền thống với phong cách giao tiếp thấu cảm nhân văn của hệ thống Pawpal:

| Tình huống thực tế của khách hàng | Phong cách hành chính máy móc (Cũ) | Phong cách giao tiếp thấu cảm của Pawpal (Hiện tại) |
| :--- | :--- | :--- |
| **Bé mệt và biếng ăn sau khi tắm sấy** | *“Vui lòng liên hệ bác sĩ thú y để kiểm tra sức khỏe.”* | *“Dạ bạn đừng quá lo nhé, PawPal hiểu tâm lý của bạn lúc này. Sau khi tắm sấy, nhiều bé do lạ chỗ hoặc tiêu hao nhiều năng lượng nên sẽ thèm ngủ và hơi lười ăn một chút. Bạn để bé nghỉ ngơi ở góc quen thuộc, đặt sẵn chén nước sạch gần bé nha. Nếu bé có biểu hiện nào bất thường hơn hoặc bạn vẫn chưa an tâm, bạn cứ nhắn hoặc gửi ảnh cho PawPal liền nhé, tụi mình luôn ở đây cùng bạn.”* |
| **Khách vãng lai hỏi thủ tục bồi hoàn** | *“Vui lòng tạo yêu cầu bồi hoàn trong mục Hỗ trợ.”* | *“PawPal sẽ hướng dẫn bạn gửi yêu cầu và theo dõi kết quả nhé. Bạn đăng nhập tài khoản trước nha. Trong mục Hỗ trợ, bạn chọn đơn hàng hoặc lịch hẹn liên quan, mô tả sự việc và đính kèm minh chứng nếu có. Sau khi gửi yêu cầu, bạn có thể theo dõi tiến độ xử lý ngay tại đó.”* |
| **Khách vãng lai phản ánh bị trừ tiền hai lần** | *“Tài khoản chưa đăng nhập. Vui lòng đăng nhập để kiểm tra.”* | *“Thấy tiền bị trừ hai lần, bạn lo lắng là điều hoàn toàn dễ hiểu. Bạn vui lòng đăng nhập tài khoản trước nhé. Trong mục Hỗ trợ, bạn chọn đơn hàng và ghi rõ thời điểm của hai giao dịch để bên mình đối soát ngay. Tụi mình sẽ hỗ trợ bạn kiểm tra nhanh nhất.”* |
| **Khách vãng lai báo bé bị trầy xước sau dịch vụ** | *“Vui lòng đăng nhập để gửi phản ánh khiếu nại.”* | *“PawPal rất tiếc khi biết bé bị trầy xước. Bên mình hiểu bạn đang rất lo lắng và xót cho bé. Bạn đăng nhập tài khoản trước nhé. Trong mục Hỗ trợ, bạn chọn lịch hẹn vừa qua và mô tả tình trạng của bé để nhân viên kiểm tra lại ca chăm sóc và hỗ trợ bạn chu đáo nhất.”* |
| **Khách hàng bức xúc vì bị trễ giờ đón** | *“Vui lòng gửi mã đơn để bộ phận giao vận kiểm tra.”* | *“PawPal rất tiếc vì chuyện này khiến bạn bức xúc và phải chờ đợi quá giờ hẹn. Bên mình cần một vài thông tin để kiểm tra chuyện đã xảy ra. Bạn vui lòng gửi mã lịch hẹn và thời gian bạn đã liên hệ để nhân viên kiểm tra ngay với tài xế đón bé nhé.”* |
| **Chủ nuôi thông báo thú cưng khó thở nguy kịch** | *“Vui lòng liên hệ cơ sở y tế gần nhất.”* | *“Bạn hãy liên hệ ngay bác sĩ thú y hoặc đưa bé đến cơ sở cấp cứu thú y gần nhất ngay lập tức! PawPal hiểu lúc này bạn đang rất lo cho bé. Xin vui lòng không chờ phản hồi trong khung chat này để tránh lỡ mất thời gian vàng cấp cứu cho bé!”* |

---

### 8.6.3. Cổng truy vấn dữ liệu an toàn chỉ đọc

Cơ chế Cổng truy vấn dữ liệu an toàn chỉ đọc (Read Admission Gateway) được triển khai tại tệp mã nguồn `scripts/api/chat_read_tools.js` và hàm cơ sở dữ liệu `acquire_admin_chat_read`. Đây là một giải pháp kiến trúc mang tính đột phá nhằm giải quyết triệt để các rủi ro bảo mật trong ứng dụng trí tuệ nhân tạo doanh nghiệp.

Giải pháp thứ nhất là kiến trúc Khóa truy vấn tạm thời (Lease Token Architecture). Khi một câu lệnh Copilot được gửi đến, cổng dịch vụ tạo một mã định danh yêu cầu duy nhất (`requestId`) và yêu cầu cơ sở dữ liệu cấp phát một mã khóa truy vấn tạm thời (`p_lease`). Mã khóa này có thời hạn sống tính bằng giây (TTL) và được lưu vết trong bảng trạng thái tạm thời của PostgreSQL. Khi thực thi truy vấn nghiệp vụ, hàm RPC đối chiếu mã khóa với danh tính người gọi; mọi hành vi cố tình sử dụng lại mã khóa đã hết hạn hoặc mượn mã khóa của phiên khác đều bị hủy bỏ với mã lỗi bảo mật `PT409`.

Giải pháp thứ hai là chốt chặn Kiểm soát ngân sách tài nguyên (Resource Budget Guard). Nhằm ngăn chặn các cuộc tấn công từ chối dịch vụ (DoS) hoặc làm cạn kiệt tài nguyên máy chủ, mỗi lượt tra cứu được giới hạn nghiêm ngặt bởi ngân sách tài nguyên cố định: không quá 3 cuộc gọi RPC trong một câu hỏi, giới hạn tối đa 10 dòng dữ liệu đại diện trên mỗi trang và dung lượng bộ đệm tối đa không vượt quá 65.536 byte (64 KB). Nếu kích thước dữ liệu vượt quá ngưỡng an toàn, cơ sở dữ liệu chủ động cắt ngắn an toàn và trả về cờ cảnh báo `has_more`, bảo đảm đường truyền mạng luôn thông suốt.

---

## 8.7. Đánh giá thực nghiệm và kết luận chương

### 8.7.1. Kết quả theo các kịch bản tiêu biểu

Nhằm kiểm chứng tính đúng đắn của các giải thuật và tính ổn định của mô hình kiến trúc, một bộ thử nghiệm toàn diện gồm sáu kịch bản đại diện đã được tiến hành trên hệ thống Pawpal đang hoạt động thực tế. Dữ liệu thực nghiệm được đối soát trực tiếp giữa máy chủ ứng dụng và cơ sở dữ liệu PostgreSQL.

Kịch bản thử nghiệm đầu tiên đánh giá khả năng bóc tách thực thể cân nặng và tính toán bảng giá ma trận tự động từ CSDL mà không phụ thuộc vào trí tưởng tượng của mô hình AI. Khi khách hàng gửi câu hỏi: *“Bé cún Poodle nhà mình nặng 7kg tắm sấy giá bao nhiêu?”*, hệ thống đã nhận diện chính xác khoảng cân nặng `5 – 10 kg (không gồm cận trên)` và truy vấn bảng giá niêm yết trong cơ sở dữ liệu. Kết quả ghi nhận trên giao diện Hình 8.9 cho thấy hệ thống trả về chính xác bốn gói dịch vụ phù hợp gồm Gói Tắm Vệ Sinh Cơ Bản (170.000 đ, 75 phút), Gói Tắm Dưỡng Premium (220.000 đ, 90 phút), Tắm Khô Khử Mùi (90.000 đ, 25 phút) và Tắm Thuốc Trị Liệu Da Liễu (280.000 đ, 90 phút), đính kèm đầy đủ mô tả quy trình, lưu ý phụ phí và nút liên kết đặt lịch nhanh `[Chọn gói này]`.

![Khung Chatbot hiển thị giá các gói tắm cho chó 7 kg](figures/chuong-08/hinh-08-09-gia-tam-theo-can-nang.png)

**Hình 8.9.** Kết quả thử nghiệm tính toán giá dịch vụ làm đẹp theo cân nặng thực tế trên giao diện Chatbot.

Kịch bản thử nghiệm thứ hai xác thực cơ chế ngăn chặn rò rỉ dữ liệu cá nhân khi người dùng chưa đăng nhập tài khoản. Khi một phiên khách vãng lai gửi câu hỏi: *“Đơn hàng của tôi hôm qua đã giao chưa?”*, hệ thống nhận diện câu hỏi nhắm vào thực thể đơn hàng cá nhân nhưng phiên hiện tại thiếu mã thông báo xác thực thành viên. Chatbot lập tức kích hoạt chốt chặn quyền riêng tư, kiên quyết từ chối trích xuất thông tin đơn hàng và gửi lời hướng dẫn thân thiện: *"Đây là thông tin thuộc hồ sơ riêng của bạn. Bạn Đăng nhập rồi hỏi lại nhé; PawPal chỉ tra dữ liệu thuộc tài khoản đã xác minh."* kèm đường dẫn đăng nhập an toàn như thể hiện tại Hình 8.10.

![Khung Chatbot hướng dẫn đăng nhập để tra đơn hàng cá nhân](figures/chuong-08/hinh-08-10-gioi-han-don-hang-vang-lai.png)

**Hình 8.10.** Kết quả thử nghiệm chốt chặn bảo vệ quyền riêng tư đơn hàng của khách vãng lai.

Kịch bản thử nghiệm thứ ba đánh giá năng lực nhận diện cảm xúc Cấp 3 (Special Care), triệt tiêu lỗi bắt nhầm từ khóa bán dịch vụ và kiểm tra khả năng duy trì ngữ cảnh qua hai lượt trao đổi tiếp nối. Ở lượt trao đổi thứ nhất, khi chủ nuôi nhắn: *“Bé cún mệt mỏi và biếng ăn sau khi tắm, mình lo quá”*, hệ thống nhận diện các triệu chứng sức khỏe, phân loại vào nhóm chăm sóc đặc biệt, gửi lời dỗ dành ấm áp, giải thích hiện tượng lạ chỗ sau tắm sấy và hướng dẫn chuẩn bị thông tin theo dõi bé. Ở lượt trao đổi thứ hai trong cùng phiên, khi chủ nuôi nhắn tiếp: *“Bé vừa nôn một lần”*, hệ thống kế thừa lịch sử trò chuyện trong vòng 30 phút, lập tức đưa ra lời khuyên y tế cụ thể: hướng dẫn chủ nuôi báo chính xác số lần nôn và thời điểm nôn cho bác sĩ thú y để có phác đồ điều trị kịp thời như ghi nhận tại Hình 8.11.

![Hai lượt trao đổi khi chủ nuôi báo bé mệt sau tắm và bổ sung tình trạng nôn](figures/chuong-08/hinh-08-11-luu-y-suc-khoe.png)

**Hình 8.11.** Kết quả thử nghiệm nhận diện cảm xúc lo lắng và phản hồi xoa dịu tự nhiên qua các lượt trao đổi tiếp nối.

Kịch bản thử nghiệm thứ tư đánh giá khả năng liên kết dữ liệu đa nguồn của Copilot để xây dựng bức tranh toàn diện về khách hàng chỉ với một câu lệnh tra cứu duy nhất. Khi tài khoản Quản trị viên gửi câu lệnh: *“Xem hồ sơ khách hàng 360° theo số điện thoại: 0901234567”*, Copilot thực hiện truy vấn hàm `run_admin_chat_customer_case`, tự động liên kết thành công ba nguồn dữ liệu và hiển thị bảng hồ sơ 360 độ hoàn chỉnh tại Hình 8.12. Bảng tổng hợp thể hiện đầy đủ thông tin chủ nuôi (Lê Lệ Quyên QA, mã quản lý, số điện thoại), danh sách hai thú cưng đang chăm sóc (bé mèo Lala và bé cún Corgi Milu kèm tập tính) cùng đơn hàng mới nhất `ORD-20260707-973249` kèm mốc thời gian đối soát độc lập.

![Khung Copilot hiển thị hồ sơ thú cưng và kết quả tra đơn mới nhất của cùng khách](figures/chuong-08/hinh-08-12-ho-so-khach-360.png)

**Hình 8.12.** Kết quả thử nghiệm tổng hợp hồ sơ khách hàng 360 độ qua Trợ lý Copilot.

Kịch bản thử nghiệm thứ năm kiểm tra tính chính xác của giải thuật rà soát kho vận tự động hỗ trợ nhân viên lập kế hoạch nhập hàng. Khi tài khoản Nhân viên gửi câu lệnh: *“Có bao nhiêu SKU dưới ngưỡng?”*, Copilot gọi công cụ `inventory.low_stock`, quét toàn bộ các biến thể sản phẩm đang bán có số lượng tồn kho nhỏ hơn định mức an toàn và trả về bảng danh mục chi tiết tại Hình 8.13. Cụ thể, hệ thống cảnh báo hai mã hàng gồm SKU `TP-HAT-01-V2` (tồn thực tế 29, ngưỡng tối thiểu 80) và SKU `TP-HAT-01-V1` (tồn thực tế 37, ngưỡng tối thiểu 80) từ dòng thức ăn hạt Royal Canin Mother và Babycat, với số liệu được trích xuất tức thời từ cơ sở dữ liệu không có độ trễ đồng bộ.

![Khung trợ lý nhân viên hiển thị hai SKU dưới mức tồn tối thiểu trên trang đầu tiên](figures/chuong-08/hinh-08-13-ton-kho-duoi-nguong.png)

**Hình 8.13.** Kết quả thử nghiệm cảnh báo các mặt hàng tồn kho chạm ngưỡng an toàn.

Kịch bản thử nghiệm thứ sáu xác thực chốt chặn an ninh RBAC ngăn chặn việc lộ lọt số liệu kinh doanh tài chính cho các vai trò không được ủy quyền. Khi tài khoản Kỹ thuật viên (`Staff`) chỉ có quyền dịch vụ gửi câu lệnh: *“Thực thu hôm nay bao nhiêu?”*, cổng dịch vụ trung gian phát hiện tài khoản thiếu quyền hạn đọc thanh toán (`payment.read`) và hoàn tiền (`refund_transaction.read`), lập tức kích hoạt chốt chặn an toàn. Phía máy chủ từ chối yêu cầu và phản hồi mã lỗi HTTP `403 Forbidden`, trong khi giao diện Copilot tại Hình 8.14 hiển thị thông báo từ chối an toàn: *"Chưa có quyền đọc dữ liệu hoặc dùng nguồn này."*. Toàn bộ số liệu tiền thu, tiền hoàn và doanh thu trong ngày được bảo vệ an toàn tuyệt đối, không bị rò rỉ bất kỳ thông tin nào ra màn hình.

![Khung trợ lý nhân viên hiển thị thông báo thiếu quyền và câu hỏi về thực thu](figures/chuong-08/hinh-08-14-gioi-han-quyen-nhan-vien.png)

**Hình 8.14.** Kết quả thử nghiệm cơ chế chốt chặn nhân viên kỹ thuật xem doanh thu trái phép.

---

### 8.7.2. Kết luận chương

Nội dung Chương 8 đã trình bày một cách toàn diện và sâu sắc từ nền tảng lý thuyết kiến trúc đến giải thuật thực thi chi tiết của hệ thống trợ lý thông minh Pawpal. Về mặt kiến trúc hệ thống, mô hình phân tầng chức năng kết hợp cùng cơ chế cổng dịch vụ trung gian và chốt chặn CSDL đa tầng (RLS/RBAC/Lease Token) đã tạo nên một bộ khung công nghệ vững chắc, giải quyết triệt để bài toán cô lập rủi ro, bảo vệ sự riêng tư của khách hàng và ngăn chặn hoàn toàn các hành vi vượt quyền truy cập trong nội bộ tổ chức.

Về mặt giải thuật trí tuệ nhân tạo, đường ống xử lý AI sáu tầng khép kín vận hành dựa trên nguyên tắc Gắn kết dữ liệu tất định (Deterministic Grounding) đã khắc phục hoàn toàn nhược điểm cố hữu của các mô hình ngôn ngữ lớn là hiện tượng suy diễn sai lệch (Hallucination). Mọi số liệu nghiệp vụ quan trọng như giá tiền, ngày giờ, số tồn kho và số dư điểm đều được bảo đảm độ chính xác 100% từ cơ sở dữ liệu gốc.

Về mặt trải nghiệm người dùng, giải thuật phân loại cảm xúc sáu cấp độ và cơ chế điều phối ca thông minh đã nâng tầm trợ lý ảo từ một công cụ trả lời tự động máy móc thành một đại sứ thương hiệu số thấu cảm, biết lắng nghe, xoa dịu nỗi lo lắng của chủ nuôi và kịp thời chuyển giao cho chuyên viên con người khi gặp các tình huống nguy cấp. Kết quả kiểm thử thực nghiệm trên sáu kịch bản trọng yếu đã chứng minh hệ thống hoạt động với độ ổn định cao, tốc độ phản hồi nhanh chóng (độ trễ trung bình dưới 2.5 giây) và bảo đảm tính toàn vẹn dữ liệu tuyệt đối, đáp ứng hoàn hảo các yêu cầu khắt khe của một nền tảng quản lý và chăm sóc thú cưng chuyên nghiệp trong thực tiễn.

---

### Mã nguồn tham chiếu

Các thành phần giải thuật và cơ chế kiến trúc trình bày trong chương được triển khai trực tiếp tại các mô đun mã nguồn chính trong hệ thống:
* **Cổng điều phối trung tâm và xử lý luồng AI**: [api/admin-chat.js](../api/admin-chat.js)
* **Bộ định tuyến Chatbot khách hàng công chúng**: [scripts/api/chat_public_guest.js](../scripts/api/chat_public_guest.js)
* **Bộ tra cứu dữ liệu khách hàng thành viên**: [scripts/api/chat_member.js](../scripts/api/chat_member.js)
* **Giải thuật kiểm duyệt từ ngữ và phân cấp cảm xúc**: [scripts/api/chat_moderation.js](../scripts/api/chat_moderation.js)
* **Cơ chế kế thừa ngữ cảnh hội thoại tiếp nối**: [scripts/api/chat_public_continuity.js](../scripts/api/chat_public_continuity.js)
* **Bộ lập kế hoạch tác vụ Trợ lý Copilot nội bộ**: [scripts/api/admin_copilot.js](../scripts/api/admin_copilot.js)
* **Danh mục công cụ truy vấn dữ liệu an toàn chỉ đọc**: [scripts/api/chat_read_tools.js](../scripts/api/chat_read_tools.js)
