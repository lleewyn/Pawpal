User Story 1a: Đăng ký thành viên chủ động	"Là một Khách hàng mới, tôi muốn thực hiện đăng ký tài khoản bằng số điện thoại và xác thực OTP để trở thành thành viên chính thức, bắt đầu tích lũy điểm thưởng và sử dụng đầy đủ các tính năng của Pawpal.

Acceptance Criteria (AC):

Hiển thị Form: Hệ thống hiển thị Form đăng ký gồm các trường: Họ tên (Text), Số điện thoại (Number), Mật khẩu (Password), Xác nhận mật khẩu.

Lưu ý: Tất cả thông tin đều phải hợp lệ, Xác nhận mật khẩu phải khớp Mật khẩu thì nút Đăng ký mới được mở khóa

Kiểm tra tính duy nhất: 

Nếu SĐT đã tồn tại, hiển thị thông báo lỗi: ""Số điện thoại đăng ký đã tồn tại. Vui lòng đăng nhập hoặc khôi phục mật khẩu!"".

Nếu SĐT sai định dạng (không đủ 10 số), hiển thị dòng cảnh báo đỏ dưới ô nhập 

Kích hoạt OTP: Khi thông tin hợp lệ, hệ thống gửi mã OTP qua SMS Gateway. Mã có hiệu lực trong 05 phút.

Xác thực thành công: Sau khi nhập đúng OTP, tài khoản được xác lập. Hệ thống điều hướng về Trang chủ.

Ưu đãi chào mừng: Hiển thị Popup/Thông báo: ""Chào mừng thành viên mới! Bạn đã nhận được 50 Paw Points đầu tiên"".

Mô tả giao diện:

Giao diện đăng ký: đã des

Popup OTP: Một cửa sổ nhỏ hiện lên giữa màn hình với 6 ô nhập mã số, có đồng hồ đếm ngược (05:00) và dòng chữ ""Gửi lại mã"" (mờ đi cho đến khi hết 60 giây)."
User Story 1b: Định danh lũy tiến cho Khách vãng lai	"Là một Khách hàng vãng lai đang thực hiện đặt lịch, tôi muốn hệ thống tự động ghi nhận thông tin của tôi mà không bắt buộc đăng ký ngay để quy trình đặt lịch không bị gián đoạn, đồng thời vẫn có cơ hội nhận ưu đãi sau khi giao dịch hoàn tất.

Acceptance Criteria (AC):

Khởi tạo ngầm: Khi Khách vãng lai nhấn ""Xác nhận đặt lịch"", hệ thống tự động khởi tạo một ""Tài khoản tạm"" trong CSDL dựa trên SĐT đã nhập.

Quyền truy cập tạm thời: Hệ thống cho phép khách hàng xem lịch hẹn vừa đặt trên giao diện mà không yêu cầu mật khẩu ngay lúc đó.

Gửi SMS kích hoạt: Ngay sau khi đặt lịch thành công, hệ thống gửi SMS chứa: Nội dung chào mừng + Link thiết lập mật khẩu.

Hiệu lực liên kết: Link trong SMS phải có hiệu lực trong 48 giờ. Nếu truy cập sau 48 giờ, hiển thị trang lỗi kèm nút ""Gửi lại link xác thực mới"".

Chuyển đổi trạng thái: Sau khi khách hàng đặt mật khẩu qua Link thành công, tài khoản chuyển từ ""Tài khoản tạm"" sang ""Thành viên chính thức"" và cộng 50 Paw Points vào ví.

Mô tả giao diện:

Màn hình Xác nhận đặt lịch: Có một dòng thông tin nhỏ ở dưới cùng: ""Thông tin của bạn sẽ được lưu giữ để tích điểm thưởng cho lần sau"".

Trang thiết lập mật khẩu (từ Link SMS): Giao diện web hiển thị tên khách hàng và trường nhập Mật khẩu mới/Xác nhận mật khẩu, kèm theo hình ảnh món quà (50 điểm) để kích thích khách hàng hoàn tất.
"
User Story 1c: Admin hỗ trợ đăng ký nhanh tại quầy	"Là một Nhân viên quản trị (Admin), tôi muốn hỗ trợ khách hàng đăng ký tài khoản nhanh chỉ với Họ tên và SĐT ngay tại quầy để tối ưu hóa thời gian check-in và giúp khách hàng không rành công nghệ vẫn có Pet ID.

Acceptance Criteria (AC):

Giao diện Admin: Hệ thống hiển thị Form đăng ký nhanh trong bảng điều khiển của Admin.

Tối giản thông tin: Admin chỉ cần nhập Họ tên và SĐT của khách.

Cơ chế xác thực: Sau khi Admin nhấn ""Lưu"", hệ thống tự động kích hoạt luồng gửi SMS chứa Link thiết lập mật khẩu cho khách hàng (tương tự luồng vãng lai).

Đồng bộ Pet ID: Sau khi đăng ký nhanh, Admin có thể tạo ngay Pet ID gán cho tài khoản này để thực hiện Check-in.

Mô tả giao diện:

Trình quản lý khách hàng (Admin): Nút ""Thêm khách hàng nhanh"" nằm ở vị trí dễ thấy. Form nhập liệu dạng bảng ngang hoặc popup đơn giản, ưu tiên tốc độ nhập liệu.
"
User Story 2a: Đăng nhập hệ thống	"Là một Người dùng (Thành viên hoặc Khách vãng lai), tôi muốn có thể đăng nhập vào hệ thống bằng mật khẩu hoặc mã xác thực OTP để truy cập vào Dashboard cá nhân, quản lý Pet ID và theo dõi các dịch vụ đang sử dụng.

Acceptance Criteria (AC):

Kiểm tra định danh: Khi nhập SĐT, nếu SĐT chưa tồn tại trong CSDL, hệ thống hiển thị thông báo lỗi: ""Số điện thoại chưa được đăng ký. Vui lòng thực hiện đăng ký"" kèm nút ""Đăng ký ngay"".

Xác thực Mật khẩu (Thành viên): Đối với tài khoản đã kích hoạt bảo mật, nếu nhập sai mật khẩu, hệ thống báo lỗi: ""Mật khẩu đăng nhập không chính xác"".

Xác thực OTP: Khách vãng lai có thể chọn ""Đăng nhập qua OTP"". Hệ thống gửi mã qua SMS Gateway có hiệu lực trong 05 phút. Đăng nhập thành công khi mã khớp.

Quên mật khẩu: Hệ thống yêu cầu nhập số điện thoại, sau đó gửi link khôi phục qua SMS Gateway với hiệu lực 48 giờ để thiết lập lại mật khẩu mới.

Giới hạn đăng nhập sai: Nếu nhập sai mật khẩu 05 lần liên tiếp, hệ thống tự động khóa tài khoản trong 30 phút.

Khởi tạo phiên: Khi đăng nhập thành công, hệ thống cập nhật trạng thái Session Active, ghi nhận thời gian truy cập và điều hướng người dùng về Trang chủ.

Mô tả giao diện:

Màn hình Đăng nhập: Thiết kế tập trung vào hai trường chính (SĐT và Mật khẩu). Có tùy chọn chuyển đổi linh hoạt giữa ""Đăng nhập bằng mật khẩu"" và ""Đăng nhập bằng OTP"". Dòng “Quên mật khẩu” nằm dưới ô

Trạng thái Khóa tài khoản: Hiển thị một lớp phủ (Overlay) mờ trên màn hình với biểu tượng ổ khóa, đồng hồ đếm ngược thời gian chờ và nút bấm gọi nhanh Hotline hỗ trợ.
"
User Story 2b: Thay đổi mật khẩu và Bảo mật nâng cao	"Là một Thành viên đã đăng nhập, tôi muốn có thể thay đổi mật khẩu cá nhân trong mục cấu hình để tăng cường tính bảo mật cho tài khoản và bảo vệ thông tin của thú cưng.

Acceptance Criteria (AC):

Yêu cầu xác minh: Khi chọn ""Đổi mật khẩu"", hệ thống yêu cầu người dùng nhập mật khẩu cũ hoặc xác thực mã OTP từ SMS Gateway để xác nhận chính chủ.

Ràng buộc mật khẩu mới: Mật khẩu mới phải đáp ứng: tối thiểu 8 ký tự, có ít nhất 1 chữ số và 1 ký tự đặc biệt.

Đồng bộ hóa CSDL: Sau khi xác nhận mật khẩu mới hợp lệ, hệ thống cập nhật mật khẩu đã mã hóa vào CSDL và hiển thị thông báo ""Cập nhật mật khẩu thành công"".

Ràng buộc tính năng nhạy cảm: Nếu người dùng chưa thiết lập mật khẩu (tài khoản tạm), hệ thống sẽ chặn truy cập vào mục ""Đổi điểm thưởng"" và yêu cầu hoàn thiện mật khẩu trước.

Mô tả giao diện:

Trang Cấu hình tài khoản: Giao diện dạng thẻ (Tab), mục ""Bảo mật"" nằm riêng biệt với các trường nhập liệu rõ ràng, có bộ đo độ mạnh yếu của mật khẩu (Thanh màu từ Đỏ sang Xanh).

"
User Story 2c: Quản lý phiên và Cảnh báo bảo mật	"Là một Khách hàng, tôi muốn hệ thống tự động bảo vệ tài khoản khi tôi quên đăng xuất hoặc có truy cập lạ để giảm thiểu rủi ro bị đánh cắp thông tin cá  nhân.

Acceptance Criteria (AC):

Hết hạn phiên làm việc: Sau 55 phút không có thao tác, hiển thị một Popup đếm ngược (5 phút) với dòng chữ ""Phiên đăng nhập sắp hết hạn"" kèm nút ""Tiếp tục đăng nhập"" để gia hạn session. Đúng 60 phút không có thao tác, hệ thống tự động kết thúc phiên, điều hướng về trang đăng nhập kèm thông báo: ""Phiên đăng nhập đã kết thúc, vui lòng đăng nhập lại!"".

Cảnh báo thiết bị lạ: Nếu đăng nhập từ một địa chỉ IP hoặc thiết bị chưa từng được ghi nhận, hệ thống gửi ngay tin nhắn SMS: ""Phát hiện đăng nhập bất thường vào tài khoản Pawpal của bạn"".

Khôi phục mật khẩu: Tại màn hình đăng nhập, nếu chọn ""Quên mật khẩu"", hệ thống gửi link khôi phục qua SMS Gateway có hiệu lực 48 giờ để khách hàng thiết lập lại mật khẩu mới.

Mô tả giao diện:

Thông báo phiên hết hạn: Một Popup cảnh báo xuất hiện trước khi phiên kết thúc 1 phút, cho phép người dùng nhấn ""Tiếp tục đăng nhập"" để gia hạn phiên.

Email/SMS cảnh báo: Nội dung ngắn gọn, súc tích, bao gồm thông tin thiết bị, vị trí và thời gian truy cập.
"
User Story 3a: Khởi tạo và Cập nhật hồ sơ Pet ID	"Là một Khách hàng (Thành viên) hoặc Admin, tôi muốn khởi tạo và cập nhật hồ sơ chi tiết cho thú cưng để hệ thống có cơ sở tính toán giá dịch vụ chính xác và lưu trữ lịch sử y tế xuyên suốt cho bé.

Acceptance Criteria (AC):

Hiển thị Form nhập liệu: Hệ thống cung cấp form gồm: Tên thú cưng (Text), Giống loài (Text), Cân nặng (Number), Ảnh đại diện (Upload), Tiền sử y tế/Dị ứng (Textarea).

Ràng buộc dữ liệu bắt buộc: Hệ thống khóa nút ""Lưu"" và báo lỗi nếu các trường Tên, Giống loài, Cân nặng bị bỏ trống.

Xử lý hình ảnh: 

Chỉ chấp nhận định dạng JPG, PNG, WEBP.

Nếu dung lượng > 5MB, hiển thị thông báo lỗi: ""Dung lượng ảnh vượt quá 5MB"".

Kiểm tra trùng tên: Nếu tên thú cưng mới trùng với tên thú cưng đã có trong cùng một tài khoản, hệ thống yêu cầu: ""Vui lòng thêm ký hiệu phân biệt cho bé (Ví dụ: Bông 1, Bông 2)"".

Khởi tạo định danh: Khi nhấn ""Lưu"", hệ thống cấp một mã Pet ID duy nhất và hiển thị thông báo: ""Khởi tạo hồ sơ thành công"".

Mô tả giao diện:

Trang ""Bé cưng của tôi"": Giao diện dạng lưới (Grid) hiển thị các thẻ (Card) của từng bé thú cưng với ảnh đại diện tròn và thông số nhanh (cân nặng, giống). Khi click vào thì ra trang thông tin từng bé và lịch sử các lần dịch vụ

Màn hình chỉnh sửa: Thiết kế như một trang ""Hồ sơ cá nhân"" (Bio) thu nhỏ. Các thông tin về Dị ứng/Lưu ý được đặt trong khung màu đỏ/vàng nổi bật để dễ gây chú ý.
"
User Story 3b: Kết nối Nhật ký chăm sóc và Thiết bị ngoại vi	"Là một Khách hàng, tôi muốn hồ sơ thú cưng của mình được kết nối tự động với các thiết bị giám sát để tôi có thể theo dõi hình ảnh và Nhật ký chăm sóc thực tế của bé bất cứ lúc nào.

Acceptance Criteria (AC):

Liên kết tự động: Ngay khi Pet ID được tạo, hệ thống tự động khởi tạo một phân mục ""Nhật ký chăm sóc"" riêng biệt gắn liền với mã định danh đó.

Truy xuất dữ liệu thiết bị: Hệ thống cho phép hiển thị luồng dữ liệu hình ảnh/video từ Thiết bị ngoại vi trực tiếp lên Dashboard của Pet ID khi bé đang ở tiệm.

Tính kế thừa: Mọi lịch sử tắm, cắt tỉa, lưu trú và hóa đơn mua sắm phải được liệt kê chi tiết trong hồ sơ của từng Pet ID riêng lẻ.

Cập nhật chỉ số sinh hoạt: Cho phép cả Khách hàng và Admin cập nhật các chỉ số hàng ngày (ăn uống, đi vệ sinh, tâm trạng) vào Nhật ký để đảm bảo dữ liệu khớp với thực tế.

Mô tả giao diện:

Nhật ký chăm sóc: Một dòng thời gian (Timeline) hiển thị các mốc sự kiện. Ví dụ: ""10:00 - Bé bắt đầu tắm"", kèm theo hình ảnh hoặc nút xem Live-Stream từ thiết bị ngoại vi.

Mục ""Lịch sử"": Liệt kê danh sách các lần sử dụng dịch vụ trước đó, nhấn vào từng lần để xem lại chi tiết nhật ký và ảnh cũ.

"
User Story 3c: Lưu trữ và Phục hồi hồ sơ	"Là một Khách hàng, tôi muốn hồ sơ thú cưng của mình không bị mất vĩnh viễn nếu lỡ tay xóa để tôi có thể khôi phục lại dữ liệu y tế và lịch sử chăm sóc quan trọng khi cần.

Acceptance Criteria (AC):

Cơ chế xóa tạm thời: Khi chọn ""Xóa"", hệ thống hiển thị xác nhận và chuyển hồ sơ vào ""Trạng thái lưu trữ"" trong 30 ngày.

Quyền khôi phục: Trong vòng 30 ngày, hồ sơ vẫn tồn tại trong mục ""Đã xóa"". Khách hàng có thể nhấn ""Khôi phục"" để đưa bé trở lại danh sách hoạt động.

Ràng buộc quy trình Đặt lịch: Nếu người dùng chọn một hồ sơ chưa hoàn thiện (thiếu cân nặng/thông tin y tế) để đặt lịch, hệ thống điều hướng về trang chỉnh sửa kèm thông báo: ""Vui lòng cập nhật thông tin thú cưng trước khi đặt lịch"".

Quyền hạn Admin: Admin có quyền hiệu chỉnh dữ liệu Pet ID tại quầy khi tiếp nhận thú cưng nếu phát hiện thông tin khách khai báo sai lệch so với thực tế.

Mô tả giao diện:

Thông báo điều hướng: Một Banner màu vàng xuất hiện phía trên cùng màn hình Đặt lịch nếu hồ sơ Pet ID chưa đủ điều kiện để tính giá dịch vụ.

Mục ""Kho lưu trữ"": Nằm trong phần Cài đặt, nơi hiển thị các hồ sơ sắp bị xóa vĩnh viễn kèm đồng hồ đếm ngược số ngày còn lại.

"
User Story 4a: Lựa chọn Dịch vụ và Khai báo thực thể	"Là một Người dùng (Thành viên hoặc Khách vãng lai), tôi muốn hệ thống nhận diện đúng đối tượng và hồ sơ thú cưng để làm cơ sở tính toán giá dịch vụ chính xác trước khi chọn lịch.

Acceptance Criteria (AC):

Phân tách luồng:  

Nếu là Thành viên: Hiển thị danh sách Pet ID sẵn có. Khách có thể chọn một hoặc nhiều bé.

Nếu là Khách vãng lai: Hiển thị Form nhập: Họ tên, SĐT và thông tin thú cưng (Tên, Giống, Cân nặng).

Ghi nhớ tạm thời (Cache): Đối với khách vãng lai, thông tin nhập vào chỉ được lưu vào bộ nhớ đệm (Session), chưa được ghi vào CSDL chính thức ở bước này.

Ràng buộc dữ liệu: Nếu Pet ID (Thành viên) thiếu cân nặng hoặc Khách vãng lai bỏ trống thông tin thú cưng, hệ thống báo lỗi và yêu cầu cập nhật ngay tại màn hình này.

Tính giá tự động: Dựa vào giống loài và cân nặng đã chọn, hệ thống hiển thị mức giá dự kiến (Base Price) cho dịch vụ đó.

Mô tả giao diện:

Bước 1: Đưa chuột vào ô Dịch vụ, cửa sổ xổ xuống:

 Spa & Grooming

Pet Hotel

Pet Shop

Sau khi người dùng chọn loại dịch vụ màn hình hướng tới trang đó với các thông tin giới thiệu. Phần này chủ yếu kêu AI làm i mà phải tuân theo quy tắc tính giá trong doc, r chỉnh lại hình ảnh, cấu trúc

 Spa & Grooming: Hình ảnh liên quan, Quy trình các bước, Giá cả (Coi bảng giá trong doc nha)

Pet Hotel: Hình ảnh các loại phòng cho thú cưng, hình ảnh vui đùa cùng bảo mẫu, hình ảnh ăn

Pet Shop: Hình ảnh thông tin các loại hạt

Ở mỗi trang dịch vụ đề có nút “Đặt lịch ngay” nổi bật. Sau khi bấm Đặt lịch ngay thì tiến tới Bước 4 và hiện thanh Tiến trình từ đây

Màn hình Phân tách Luồng Định danh (Thông tin bé cưng)

Luồng A: Đối với Khách hàng thành viên (Đã đăng nhập)

Tên màn hình: ""Chọn bé cưng của bạn""

Thành phần UI: * Hiển thị danh sách các Pet ID dưới dạng các thẻ bo góc nhỏ. Mỗi thẻ gồm: Ảnh đại diện tròn của thú cưng, Tên bé, Giống loài, Cân nặng (ví dụ: Bông - Samoyed - 25kg).

Mỗi thẻ có một ô dấu tick (Checkbox) ở góc phải. Khách có thể chọn một hoặc nhiều bé cùng lúc.

Nút bấm bổ sung: Thẻ cuối cùng luôn là một nút dấu cộng [+] Thêm bé mới để kích hoạt nhanh form tạo Pet ID ngắn nếu khách chưa khai báo bé này trước đó.

Luồng B: Đối với Khách vãng lai (Chưa đăng nhập)

Tên màn hình: ""Thông tin đặt lịch nhanh""

Biểu mẫu (Form) nhập liệu: Thiết kế một cột dọc, chữ tiêu đề input to, khoảng cách rộng rãi:

Thông tin chủ nuôi: Ô nhập Họ tên (Text Input), Ô nhập Số điện thoại (Phone Input - Bắt buộc định dạng 10 số).

Thông tin bé cưng: Ô nhập Tên bé (Text), Ô nhập giống loài, Ô nhập Cân nặng (Number Input kèm nút tăng giảm + -).

Trạng thái Sai định dạng nhập liệu: Nếu khách vãng lai nhập thiếu số điện thoại hoặc sai cấu trúc, trường nhập liệu đó lập tức đổi viền sang màu đỏ, xuất hiện dòng chữ nhỏ phía dưới: ""Số điện thoại phải bao gồm 10 chữ số"", đồng thời nút ""Xác nhận"" ở bước cuối sẽ bị mờ đi và không thể click.

Ghi chú chân trang: Một dòng chữ nhỏ màu xanh mờ: ""Thông tin sẽ được lưu tạm để tính giá chính xác và tích điểm thưởng sau khi hoàn tất. "".

Màn hình Chọn Lịch & Nhân viên

Bố cục: Chia làm 2 khu vực:

Bên trái - Chọn nhân viên: Giao diện trượt ngang (Carousel) hiển thị các thẻ tròn gồm Ảnh chân dung nhân viên, Tên, Chuyên viên bao nhiêu năm kinh nghiệm và số sao đánh giá. Thẻ đầu tiên luôn là tùy chọn ""Chọn ngẫu nhiên (Hệ thống tự điều phối)"" với biểu tượng PawPal màu xanh lá. Trong trường hợp này, khi chọn ngẫu nhiên xong thì hệ thống phải hiện lên nhân viên đó trên màn hình (Như 1 cái popup), Khách hàng nhấn Đồng ý      

Bên phải - Bảng giờ (Time Slot Grid): Hiển thị danh sách các ô giờ theo hàng và cột (Ví dụ: 08:00, 09:00, 10:00,...). Làm như cái Calendar í

Logic tương tác và Giao diện Giữ chỗ (Hold UI):

Ô giờ trống: Hiển thị viền xanh lá nhạt, nền trắng.

Ô giờ đã có người đặt: Nền xám mờ, bị khóa (Disabled) và có icon ổ khóa nhỏ.

Ngay khi khách click chọn 1 ô giờ: Ô đó lập tức đổi sang màu Vàng nghệ (trạng thái ""Đang chờ"").

Một Thanh đếm ngược thời gian (Countdown Banner) màu vàng cam tinh tế sẽ trượt nhẹ từ trên xuống đầu trang với nội dung: ""Paw & Pal đang giữ khung giờ này riêng cho bạn trong: 14:59s""

Nếu khách đóng trình duyệt hoặc mất kết nối, trong vòng 15 phút đó, nếu họ quay lại, hệ thống vẫn nhận diện Session và giữ nguyên lượt chọn cho họ.

Giới hạn số lượng: Mỗi SĐT/Session chỉ được giữ tối đa 01 ô lịch tại một thời điểm. Nếu chọn ô mới, ô cũ tự động giải phóng.

Ngoại lệ: 

Trạng thái Hết giờ giữ chỗ (Timeout): Khi đồng hồ đếm ngược về 00:00, hệ thống tự động làm mờ màn hình và hiện một Popup thông báo màu đỏ nhạt: ""Thời gian giữ chỗ 15 phút đã hết. Vui lòng chọn lại khung giờ mới!"" kèm một nút bấm duy nhất: ""Làm mới bảng giờ"".

Trạng thái Tranh chấp: Nếu ô lịch vừa có người giật trước ở mili giây trước, ngay khi khách bấm vào, ô lịch lập tức chuyển sang màu xám khóa lại và một Thông báo nhỏ tự ẩn màu đỏ hiện ở góc phải màn hình: ""Rất tiếc, khung giờ này vừa được người khác giữ chỗ!"".



Màn hình Xác nhận thông tin dịch vụ (Hóa đơn tạm tính)

Bố cục trực quan: Thiết kế theo phong cách một tờ hóa đơn (Receipt) tối giản, bo tròn đặt giữa màn hình nền kính mờ.

Thông tin hiển thị:

Dòng chữ trên đầu: “Hãy cùng kiểm tra thông tin thật kỹ, mọi chi tiết xin vui lòng liên hệ Hotline để được tư vấn thêm.”

Tên dịch vụ đã chọn (Ví dụ: Tắm & sấy lông toàn diện cho giống chó lớn).

Tên nhân viên chăm sóc 

Thời gian thực hiện: Giờ cụ thể, ngày/tháng/năm.

Thông tin thú cưng nhận diện (Tên + Mã Pet ID hoặc tên bé vãng lai).

Bảng tính giá công khai: 

Giá gốc dịch vụ: [Số tiền] VNĐ

Phụ thu cân nặng/giống loài (nếu có): [Số tiền] VNĐ

Mã giảm giá/Voucher (nếu có): - [Số tiền] VNĐ

Tổng thanh toán tại cửa hàng: [Tổng số tiền] VNĐ.

Hiển thị dòng chữ nhỏ ở dưới/trên “*Mọi chi phí sẽ được thanh toán sau khi hoàn tất dịch vụ tại Pawpal.”

Nút hành động chính (Primary CTA Button): Nút capsule kích thước lớn đặt ở dưới cùng với dòng chữ: ""XÁC NHẬN ĐẶT LỊCH"".

Màn hình / Popup Đặt lịch thành công

Xuất hiện hiệu ứng: Một Popup tràn màn hình nhẹ nhàng với hiệu ứng pháo hoa giấy bay nhẹ hoặc cái gì liên quan đến thú cưng (con mèo đi qua màn hình giống cái lquyn gửi thread á)

Thành phần UI:

Biểu tượng dấu tích xanh lá lớn hoặc hình ảnh hoạt họa bàn chân chó PawPal đang vẫy chào vui vẻ.

Dòng chữ lớn: ""Đặt lịch thành công! PawPal đang chờ đón bé"".

Mã đặt lịch (Booking ID) bằng chữ in hoa đậm (Ví dụ: PP-180526).

Nút điều hướng chính: ""Theo dõi hành trình tại Nhật ký chăm sóc"" 
"
User Story 4b: Giữ chỗ thời gian thực	"Là một Khách hàng, tôi muốn khung giờ và nhân viên tôi chọn được giữ riêng cho tôi ngay lập tức để tôi có đủ thời gian hoàn tất thông tin mà không sợ người khác đặt mất.

Acceptance Criteria (AC):

Kích hoạt giữ chỗ: Ngay khi khách nhấn vào một ô lịch/nhân viên, hệ thống chuyển trạng thái ô đó thành ""Đang chờ"".

Khóa đối xứng: Trong 15 phút giữ chỗ, ô lịch này sẽ hiển thị trạng thái ""Đã có người giữ"" hoặc mờ đi đối với tất cả người dùng khác.

Tính bền vững (Persistence): Nếu khách đóng trình duyệt hoặc mất kết nối, trong vòng 15 phút đó, nếu họ quay lại, hệ thống vẫn nhận diện Session và giữ nguyên lượt chọn cho họ.

Giới hạn số lượng: Mỗi SĐT/Session chỉ được giữ tối đa 01 ô lịch tại một thời điểm. Nếu chọn ô mới, ô cũ tự động giải phóng.

Xử lý tranh chấp (Race Condition): Nếu 2 người bấm cùng lúc vào 1 mili giây, hệ thống ưu tiên yêu cầu đến máy chủ trước và báo lỗi cho người thứ hai: ""Khung giờ này vừa được người khác giữ"".

Mô tả giao diện:

Bảng lịch (Calendar Grid): Ô lịch khách đang chọn đổi sang màu vàng (Đang chờ) kèm biểu tượng đồng hồ đếm ngược nhỏ (15:00). Các ô người khác đang giữ sẽ có màu xám mờ. 

=> CÁI NÀY ỨNG DỤNG CÁI LỊCH HỒI PHƯỢNG LÀM BÊN KIẾN TẬP MÀ KHÔNG XÀI NÈ"
User Story 4c: Xác nhận đặt lịch và Định danh lũy tiến	"Là một Khách vãng lai, tôi muốn hoàn tất đặt lịch mà không cần cọc tiền để trải nghiệm dịch vụ nhanh chóng, đồng thời được tự động tạo tài khoản để tích điểm.

Acceptance Criteria (AC):

Xác nhận 0 VNĐ: Màn hình xác nhận hiển thị tổng tiền thanh toán tại quầy là 100%, tiền cọc là 0 VNĐ.

Khởi tạo định danh (Guest-to-Member): Khi nhấn ""Xác nhận đặt lịch"", nếu là SĐT mới, hệ thống thực hiện:

Tạo ""Tài khoản tạm"" trong CSDL.

Tạo hồ sơ Pet ID tương ứng.

Lưu thông tin lịch hẹn với trạng thái ""Đã đặt"".

Kích hoạt SMS: Hệ thống SMS Gateway gửi tin nhắn: ""Chào mừng bạn đến Pawpal! Nhấn vào [Link] để tạo mật khẩu trong 48h và nhận 50 điểm thưởng"".

Đồng bộ vận hành: Thông báo đặt lịch thành công hiển thị cho khách và đẩy thông báo tức thời (Real-time notification) đến màn hình Admin.

Mô tả giao diện:

Màn hình Xác nhận: Hiển thị như một tờ hóa đơn tạm tính gồm Dịch vụ, Thông tin thú cưng, Tổng tạm tính (dựa trên bảng giá niêm yết cộng với các hệ số phụ thu theo cân nặng/giống loài từ Pet ID) rõ ràng.

Popup Thành công: Hiển thị mã đặt chỗ (Booking Code) và lời nhắc check-in trước 5-10 phút, lời “Cảm ơn vì đã tin tưởng Pawpal, nơi trái tim yêu thương trao đúng chỗ”
"
User Story 4d: Kiểm soát quy tắc và Giải phóng tài nguyên	"Là một Quản trị viên, tôi muốn hệ thống tự động quét và giải phóng các lượt giữ chỗ quá hạn để tối ưu hóa công suất phục vụ của cửa hàng.

Acceptance Criteria (AC):

Tự động giải phóng (Timeout): Sau 15 phút ""Đang chờ"" mà khách không nhấn ""Xác nhận"", hệ thống tự động xóa dữ liệu đệm và đưa ô lịch về trạng thái ""Trống"".

Kiểm tra thời gian đặt trước: Nếu khách cố tình đặt lịch vào khung giờ cách hiện tại dưới 02 tiếng, hệ thống báo lỗi: ""Vui lòng đặt lịch trước giờ bắt đầu tối thiểu 2 tiếng"".

Cập nhật khung giờ đã qua: Hệ thống tự động làm mới (Auto-refresh) mỗi phút để ẩn các khung giờ đã trôi qua so với thời gian thực.

Định danh SĐT: Nếu khách vãng lai nhập SĐT sai định dạng (không phải 10 số), nút ""Xác nhận"" sẽ bị vô hiệu hóa.

Mô tả giao diện:

Thông báo lỗi: Banner màu đỏ xuất hiện phía trên cùng của bảng lịch nếu khách vi phạm quy tắc thời gian hoặc định dạng SĐT.

"
User Story 5a: Tiếp cận và Kiểm tra điều kiện thay đổi	"Là một Khách hàng, tôi muốn truy cập vào danh sách lịch hẹn và chọn chức năng thay đổi để hệ thống kiểm tra các ràng buộc về thời gian và quyền hạn trước khi tôi thực hiện chọn lịch mới.

Acceptance Criteria (AC):

Hiển thị danh sách: Hệ thống liệt kê đầy đủ các lịch hẹn của khách hàng tại màn hình ""Quản lý lịch hẹn"".

Kiểm tra trạng thái: Nút ""Thay đổi lịch"" chỉ hiển thị/kích hoạt đối với các lịch hẹn ở trạng thái ""Đã xác nhận"".

Ràng buộc thời gian 2h: * Nếu thời gian hiện tại cách giờ hẹn >= 2 tiếng: Cho phép nhấn nút thay đổi.

Nếu thời gian hiện tại cách giờ hẹn < 2 tiếng: Vô hiệu hóa nút và hiển thị tooltip/thông báo: ""Đã quá thời gian tự thay đổi lịch tự động, vui lòng gọi Hotline để được hỗ trợ"".

Giới hạn số lần: Hệ thống kiểm tra số lần đã thay đổi. Nếu đã thực hiện 02 lần, ẩn nút ""Thay đổi"" và yêu cầu liên hệ Hotline.

Kiểm tra trạng thái tại tiệm: Nếu lịch hẹn có trạng thái ""Đang thực hiện"" (đã check-in), hệ thống khóa chức năng thay đổi và báo lỗi.

Bảo mật khách vãng lai: Nếu là Tài khoản tạm, hệ thống yêu cầu xác thực qua link SMS hoặc mật khẩu đã thiết lập mới cho phép vào màn hình này.

Mô tả giao diện:

Màn hình Quản lý lịch hẹn: Danh sách dạng thẻ (List view). Lịch hẹn sắp tới nằm ở trên cùng.

Trạng thái nút: Nút ""Thay đổi lịch"" có màu xanh khi hoạt động và chuyển sang màu xám mờ khi bị khóa.

=> màu gì tùy mí bà nha miễn cho nó có cái hiệu ứng hoạt động vs khóa là đc"
User Story 5b: Chọn lịch mới và Giữ chỗ tạm thời	"Là một Khách hàng, tôi muốn chọn khung giờ và nhân viên mới với cơ chế giữ chỗ tạm thời để đảm bảo tôi không bị người khác chiếm chỗ trong lúc đang cân nhắc xác nhận.

Acceptance Criteria (AC):

Hiển thị lịch trống: Hệ thống điều hướng đến màn hình ""Chọn lịch mới"", hiển thị bảng giờ và danh sách nhân viên tương tự quy trình đặt lịch.

Giữ chỗ song song: * Ngay khi khách click chọn ô lịch mới, hệ thống thực hiện lệnh ""Giữ chỗ tạm thời"" trong 15 phút (Trạng thái ô mới: ""Đang chờ"").

Quan trọng: Hệ thống phải giữ nguyên trạng thái chiếm chỗ của ô lịch cũ trên lịch vận hành chung để đảm bảo an toàn cho khách.

Đồng bộ nhân viên: Nếu khách chọn đích danh nhân viên, hệ thống kiểm tra lịch trống của nhân viên đó theo thời gian thực.

Xử lý thoát trang/Timeout: Nếu khách đóng trình duyệt hoặc quá 15 phút không nhấn xác nhận, hệ thống tự động:

Giải phóng ô lịch mới (chuyển về ""Trống"").

Giữ nguyên lịch hẹn cũ như ban đầu.

Mô tả giao diện:

Màn hình Chọn lịch mới: Hiển thị đồng hồ đếm ngược 15:00 ngay khi khách chọn ô lịch mới.

Thông báo chênh lệch: Nếu khung giờ mới có giá dịch vụ cao hơn giờ cũ, một dòng chữ đỏ hiển thị: ""Lưu ý: Khung giờ này có phụ thu chênh lệch giá dịch vụ"".

"
User Story 5c: Xác nhận thay đổi và Đồng bộ dữ liệu	"Là một Khách hàng, tôi muốn xác nhận thông tin thay đổi cuối cùng để hệ thống cập nhật lịch làm việc mới và giải phóng lịch cũ cho người khác.

Acceptance Criteria (AC):

Màn hình xác nhận: Hiển thị chi tiết: Giờ cũ -> Giờ mới, Nhân viên cũ -> Nhân viên mới, Pet ID tương ứng.

Cập nhật CSDL: Khi nhấn ""Xác nhận thay đổi"":

Cập nhật thời gian và nhân viên mới vào bản ghi Pet ID trong CSDL.

Chuyển trạng thái lịch mới thành ""Đã đặt"".

Giải phóng lịch cũ: Lập tức chuyển ô lịch cũ về trạng thái ""Trống"" trên toàn hệ thống để khách hàng khác có thể đặt.

Thông báo thành công: Hiển thị Popup ""Thay đổi lịch hẹn thành công"" và gửi SMS/Thông báo hệ thống cho khách hàng.

Đồng bộ Admin: Lịch vận hành của cửa hàng (Admin Dashboard) tự động cập nhật thông tin mới nhất mà không cần tải lại trang (Real-time update).

Mô tả giao diện:

Màn hình Xác nhận thông tin: Bảng so sánh ""Trước"" và ""Sau"" khi đổi để khách hàng dễ đối chiếu.

Popup thành công: Biểu tượng tích xanh lớn kèm nút ""Quay lại Trang chủ"".

"
User Story 5d: Ràng buộc loại dịch vụ	"Là một Hệ thống, tôi muốn ngăn chặn việc thay đổi loại dịch vụ chính trong luồng đổi lịch để đảm bảo tính chính xác của quy trình vận hành và kế toán.

Acceptance Criteria (AC):

Khóa chuyển đổi dịch vụ: Trong màn hình đổi lịch, hệ thống không hiển thị tùy chọn thay đổi từ Spa sang Hotel hoặc ngược lại.

Hướng dẫn người dùng: Nếu khách hàng có nhu cầu đổi loại dịch vụ, hệ thống hiển thị hướng dẫn: ""Để thay đổi loại dịch vụ (ví dụ từ Spa sang Hotel), vui lòng thực hiện Hủy lịch hiện tại và Đặt lịch mới"".

Mô tả giao diện:

Nội dung hướng dẫn này được đặt ở phần chú thích dưới cùng của trang thay đổi lịch.

"
User Story 6: Hủy lịch	"

Là một Khách hàng của PawPal, Tôi muốn có thể chủ động hủy lịch hẹn ngay trên hệ thống khi không còn nhu cầu

Acceptance Criteria (AC)

Điều kiện tiên quyết: Khách hàng chỉ được phép chọn chức năng ""Hủy lịch hẹn"" đối với các lịch hẹn đang ở trạng thái ""Chờ xác nhận"" hoặc ""Đã xác nhận"".

Ràng buộc thời gian: Hệ thống bắt buộc phải kiểm tra điều kiện thời gian: Lịch hẹn phải còn trong thời gian cho phép hủy trực tuyến (theo quy định của hệ thống) và chưa bước vào giai đoạn thực hiện dịch vụ.

Xác nhận hành động: Khi khách hàng bấm hủy, hệ thống bắt buộc phải hiển thị một cửa sổ (Popup/Modal) xác nhận nhằm tránh thao tác nhầm lẫn.

Cập nhật trạng thái & Tài nguyên: Sau khi khách hàng xác nhận hủy thành công:

Trạng thái lịch hẹn chuyển sang ""Đã hủy"".

Khung giờ (Timeslot) tương ứng được giải phóng lập tức về trạng thái ""Trống"" trên hệ thống đặt lịch công khai.

Thông báo tự động: Hệ thống tự động gửi thông báo (Notification/Email) xác nhận hủy lịch đến cả Khách hàng và Admin/Cửa hàng.

Lưu trữ & Đếm dữ liệu: * Lịch hẹn đã hủy vẫn phải lưu trong lịch sử đặt lịch của khách hàng với trạng thái ""Đã hủy"".

Hệ thống tự động cộng thêm 1 vào biến đếm tổng số lần hủy lịch trong hồ sơ của khách hàng đó.

Giao diện (UI)

Bố cục chủ đạo: Trang chi tiết lịch hẹn (Appointment Detail) kết hợp với Cửa sổ xác nhận (Confirmation Modal).

Thành phần giao diện:

Nút chức năng: Nút ""Hủy lịch hẹn"" được bố trí ở góc dưới giao diện chi tiết lịch hẹn.

Modal ""Xác nhận hủy lịch"": Một cửa sổ popup hiện lên ở giữa màn hình khi bấm nút hủy, bao gồm: tiêu đề cảnh báo, nút ""Xác nhận hủy"" (màu đỏ hoặc xám) và nút ""Quay lại/Đóng"".

Tương tác UX:

Trạng thái nút: Nếu lịch hẹn đã quá hạn hủy hoặc đang ở trạng thái ""Đang thực hiện"", nút ""Hủy lịch hẹn"" sẽ bị mờ đi (Disabled) và khi hover vào sẽ hiện tooltip: ""Đã quá thời gian hủy trực tuyến, vui lòng liên hệ hotline để được hỗ trợ"".

Cảnh báo hành vi: Nếu hệ thống kiểm tra thấy khách hàng thuộc danh sách ""Ghi nhận hành vi bất thường"" (hủy lịch liên tục trong thời gian ngắn), giao diện Modal xác nhận sẽ hiển thị thêm dòng lưu ý về chính sách hạn chế đặt lịch tự động của cửa hàng để nhắc nhở khách hàng.

Dòng chảy dữ liệu (Data Flow)

Khi click ""Xác nhận hủy"": Hệ thống thực hiện đồng thời 3 tác vụ background: (1) Đổi State lịch hẹn thành CANCELLED -> (2) Cập nhật Availability của Timeslot đó thành TRUE -> (3) Gửi Event sang Module thông báo (Notification Service).

Kiểm tra ngưỡng (Threshold Check): Sau khi trạng thái chuyển sang CANCELLED, hệ thống chạy một hàm trigger kiểm tra số lần hủy trong khoảng thời gian $T$. Nếu vượt ngưỡng quy định, hệ thống tự động gắn tag Suspect_Behavior vào hồ sơ khách hàng và đẩy một cảnh báo nội bộ (Internal Alert) lên Dashboard của Admin.

"
User Story 7a: Theo dõi tiến độ dịch vụ	"Là một Khách hàng của PawPal, Tôi muốn theo dõi tiến độ chăm sóc thú cưng của mình theo thời gian thực thông qua giao diện ""Nhật ký Thú cưng"", để tôi hoàn toàn yên tâm về tình trạng của thú cưng và tính minh bạch của dịch vụ khi gửi thú cưng tại cửa hàng.

Acceptance Criteria (AC)

Khởi tạo phiên (Check-in): Khi nhân viên lễ tân cập nhật trạng thái lịch hẹn sang ""Đã tiếp nhận"", hệ thống bắt buộc phải tự động khởi tạo một phiên ""Theo dõi trải nghiệm dịch vụ"" mới và liên kết trực tiếp với Hồ sơ thú cưng tương ứng.

Cập nhật mốc dịch vụ: Hệ thống cho phép nhân viên phụ trách chọn và cập nhật các mốc trạng thái định sẵn gồm: ""Đang tắm"", ""Đang sấy lông"", ""Đang Grooming"", ""Đang nghỉ ngơi"", ""Đã cho ăn"", ""Đã uống thuốc"", ""Hoàn tất chăm sóc"". Mỗi lần cập nhật phải tự động ghi nhận Timestamp (ngày/giờ thực tế).

Hiển thị mặc định: Nếu phiên dịch vụ vừa khởi tạo và chưa có cập nhật nào từ nhân viên, giao diện phía khách hàng phải hiển thị trạng thái ""Đang chờ cập nhật từ nhân viên"".

Xử lý sự cố (Ghi chú khẩn): Khi nhân viên tạo một ""Ghi chú khẩn"" (do thú cưng căng thẳng, bỏ ăn, dị ứng...), hệ thống bắt buộc phải đẩy thông báo SMS lập tức đến thiết bị của khách hàng.

Tương tác 2 chiều: Hệ thống cho phép khách hàng gửi phản hồi trực tiếp dưới Ghi chú khẩn đó. Toàn bộ nội dung trao đổi phải được lưu lại vào CSDL Nhật ký chăm sóc.

Đóng phiên: Khi nhân viên cập nhật trạng thái cuối cùng là ""Hoàn tất dịch vụ"" (sau khi bàn giao thú cưng), hệ thống thực hiện đóng phiên theo dõi realtime hiện tại.

Giao diện

Bố cục chủ đạo: Giao diện dạng Timeline (Trục thời gian) chạy dọc từ trên xuống dưới (hoặc từ cũ đến mới).

Thành phần giao diện (Màn hình Khách hàng):

Thẻ thông tin thú cưng (Pet Header): Hiển thị tên, giống loài, ảnh đại diện của thú cưng đang làm dịch vụ.

Trục Timeline: Các nút tròn biểu diễn mốc trạng thái. Mỗi mốc gồm: Tên trạng thái, Thời gian cập nhật (ví dụ: 14:30), hình ảnh thực tế đính kèm (nếu có) và ghi chú của nhân viên.

Khung Chat/Phản hồi: Chỉ xuất hiện ngay bên dưới ""Ghi chú khẩn"" để khách hàng nhập nội dung phản hồi.

Tương tác UX:

Hiệu ứng Realtime: Khi nhân viên cập nhật mốc mới, màn hình Timeline của khách hàng tự động xuất hiện mốc mới với hiệu ứng animation (Fade-in) mà không cần phải tải lại trang (F5).

Cảnh báo trực quan (Khẩn cấp): Mốc ""Ghi chú khẩn"" sẽ hiển thị với icon cảnh báo màu đỏ nhấp nháy để thu hút sự chú ý của chủ nuôi.

Dòng chảy dữ liệu (Data Flow)

Luồng Realtime: Sử dụng giao thức WebSockets (hoặc Firebase/Supabase Realtime) để đồng bộ dữ liệu ngay khi nhân viên bấm ""Cập nhật mốc"" trên App nhân viên -> Đẩy dữ liệu qua Live_Tracking_Session -> Cập nhật UI của Khách hàng.

Khi đóng phiên: Lệnh Update_Status = 'COMPLETED' sẽ kích hoạt Trigger chuyển toàn bộ dữ liệu từ Table Active_Logs sang Table Historical_Logs.
"
User Story 7b: Lưu trữ Nhật ký	"Là một Khách hàng của PawPal, Tôi muốn xem lại toàn bộ hồ sơ hành trình trải nghiệm cũ của thú cưng và nhận các gợi ý chăm sóc phù hợp, Để tôi dễ dàng theo dõi quá trình phát triển dài hạn của thú cưng và chủ động lên lịch làm đẹp tiếp theo.

Acceptance Criteria (AC)

Truy xuất lịch sử: Hệ thống cho phép khách hàng truy cập khu vực ""Chi tiết nhật ký cũ"" để xem lại toàn bộ các phiên dịch vụ đã đóng, sắp xếp theo thứ tự thời gian gần nhất.

Tính toàn vẹn của dữ liệu cũ: Mỗi bản ghi nhật ký cũ phải hiển thị đầy đủ thông tin: Ngày sử dụng, loại dịch vụ (Grooming, Spa...), timeline chi tiết, hình ảnh và tất cả các ghi chú trao đổi trong phiên đó.

Cơ chế gợi ý tự động (Recommendation Engine): Dựa trên lịch sử dịch vụ (loại dịch vụ đã dùng, ngày thực hiện, giống thú cưng), hệ thống phải tự động tính toán và đưa ra các đề xuất cá nhân hóa:

Gợi ý lịch chăm sóc định kỳ tiếp theo (Ví dụ: Đã tắm spa cách đây 2 tuần -> Gợi ý đặt lịch tắm mới).

Đề xuất các gói dịch vụ/sản phẩm phù hợp (Ví dụ: Giống Poodle -> Nhắc lịch cắt tỉa lông theo chu kỳ 4-6 tuần).

Giao diện

Bố cục chủ đạo: Dạng Danh sách thẻ (Card List) phân trang, kết hợp với một khu vực Widget dành riêng cho ""Gợi ý dành cho bé"" (Recommendations Side-widget).

Thành phần giao diện:

Danh sách nhật ký cũ: Mỗi thẻ (Card) đại diện cho một lần đi spa/hotel cũ, hiển thị: Mã lịch hẹn, Ngày thực hiện, Tên dịch vụ chính, Tên nhân viên phụ trách, và nút ""Xem chi tiết"". Khi click ""Xem chi tiết"", một Modal hiện ra hiển thị lại nguyên vẹn Timeline của ngày hôm đó.

Widget Gợi ý: Nằm ở vị trí nổi bật (phía trên hoặc bên phải màn hình), hiển thị thông điệp cá nhân hóa dạng: ""Đã 4 tuần kể từ lần cuối [Tên Pet] tỉa lông. Hãy đặt lịch Grooming định kỳ ngay để bé luôn xinh xắn nhé!"" kèm nút ""Đặt lịch ngay"".

Tương tác UX: * Nút ""Đặt lịch ngay"" trong Widget gợi ý khi click vào sẽ tự động điều hướng sang màn hình Đặt lịch (Booking) và tự động điền sẵn (Pre-fill) thông tin của Thú cưng đó và loại Dịch vụ được gợi ý để giảm thao tác cho khách hàng.

Dòng chảy dữ liệu (Data Flow)

Hàm gợi ý (Recommendation Trigger): Hệ thống chạy định kỳ (Cron Job) hàng ngày để quét bảng Historical_Logs. Thuật toán áp dụng công thức tính chu kỳ C dựa trên giống loài (Breed) trong hồ sơ thú cưng:

Thời gian gợi ý = Ngày dùng dịch vụ gần nhất + C

Nếu Ngày hiện tại >= Thời gian gợi ý, hệ thống sẽ generate bản ghi vào bảng User_Recommendations để hiển thị lên UI của khách hàng.
"
User Story 8a: Duyệt tìm sản phẩm & Xem chi tiết	"Là một Khách hàng của PawPal, Tôi muốn dễ dàng tìm kiếm, lọc và xem thông tin chi tiết các sản phẩm thú cưng, để tôi có đầy đủ thông tin tin cậy trước khi quyết định chọn mua sản phẩm.

Acceptance Criteria (AC)

Truy xuất & Phân loại: Hệ thống phải hiển thị danh sách sản phẩm phân loại theo: Danh mục (thức ăn, đồ chơi...), Thương hiệu, Giá bán, Tình trạng kho.

Tìm kiếm thông minh (Search): Hệ thống thực hiện đối chiếu từ khóa với Tên sản phẩm, Thương hiệu, Từ khóa liên quan (Tags) để trả kết quả.

Xử lý Không tìm thấy kết quả (No Search Result): Nếu không có sản phẩm trùng khớp, hệ thống phải hiển thị thông báo lỗi và tự động hiển thị danh sách ""Sản phẩm tương tự"" hoặc ""Sản phẩm bán chạy"".

Thông tin trang Chi tiết (Product Detail): Phải hiển thị đầy đủ: Ảnh sản phẩm, Mô tả, Giá, Số lượng tồn kho khả dụng, Đánh giá (Reviews), và Sản phẩm liên quan (Related Products).

Ràng buộc Hết hàng (Out of Stock): Nếu số lượng tồn kho khả dụng bằng 0, hệ thống bắt buộc phải hiển thị nhãn ""Tạm hết hàng"" và vô hiệu hóa (Disable) nút ""Thêm vào giỏ hàng"".

Giao diện

Bố cục chủ đạo: Trang Cửa hàng dạng Lưới (Grid View) kết hợp thanh Bộ lọc (Sidebar Filter). Trang Chi tiết sản phẩm dạng chia đôi (Ảnh bên trái, Thông tin mua hàng bên phải).

Thành phần giao diện:

Thanh công cụ: Ô Search box có tính năng Auto-suggest (gợi ý từ khóa khi gõ).

Trang Chi tiết: Nút tăng/giảm số lượng (+ / -), khu vực hiển thị sao đánh giá (1-5\star).

Tương tác UX:

Trạng thái hết hàng: Khi sản phẩm hết hàng, hình ảnh sản phẩm tại trang danh mục sẽ bị phủ một lớp màu xám mờ (Opacity 50%) kèm chữ ""Tạm hết hàng"". Nút mua hàng chuyển thành màu xám.

Dòng chảy dữ liệu (Data Flow)

Search Query: Khi người dùng nhập từ khóa, hệ thống gọi API GET /api/v1/products?search=keyword.

Nếu products.length == 0, hệ thống kích hoạt fallback API GET /api/v1/products/recommended?type=best-seller để lấy danh sách sản phẩm bán chạy lấp vào giao diện.

"
User Story 8b: Quản lý danh sách yêu thích (wishlist)	"Là một Khách hàng của PawPal, Tôi muốn lưu lại các sản phẩm mình quan tâm vào ""Danh sách yêu thích"", Để tôi có thể nhanh chóng xem lại và mua chúng trong tương lai mà không cần tìm kiếm lại.

Acceptance Criteria (AC)

Cơ chế lưu trữ theo đối tượng:

Đối với Khách đã đăng nhập: Sản phẩm yêu thích phải được lưu trực tiếp vào CSDL gắn với User ID và đồng bộ trên mọi thiết bị (Mobile, Web).

Đối với Khách vãng lai (Chưa đăng nhập): Sản phẩm yêu thích được lưu tạm thời vào Session/LocalStorage của trình duyệt hiện tại.

Đồng bộ hóa khi Đăng nhập: Nếu khách vãng lai thêm sản phẩm vào Wishlist, sau đó thực hiện đăng nhập, hệ thống phải tự động gộp (Merge) danh sách từ Session vào CSDL của tài khoản đó.

Giao diện

Bố cục chủ đạo: Biểu tượng Trái tim trên mỗi thẻ sản phẩm và một trang ""Danh sách yêu thích"" riêng biệt.

Thành phần giao diện:

Icon Trái tim: Nằm ở góc trên cùng bên phải của mỗi ảnh sản phẩm (ở trang danh mục lẫn trang chi tiết).

Tương tác UX:

Trạng thái Icon: Khi bấm vào trái tim trống, icon lập tức chuyển sang màu đỏ rực (Filled Heart) và hiển thị Toast Message: ""Đã thêm vào danh sách yêu thích"". Bấm lần nữa để hủy yêu thích (icon trở về dạng viền trống).

Dòng chảy dữ liệu (Data Flow)

Khách vãng lai: Thao tác tác động trực tiếp vào mảng dữ liệu localStorage.getItem('pawpal_wishlist').

Khách đã đăng nhập: Trigger API POST /api/v1/wishlist/toggle để cập nhật trạng thái dữ liệu trong CSDL.
"
User Story 8c: Giỏ hàng & Đồng bộ dữ liệu	"Là một Khách hàng của PawPal, Tôi muốn thêm sản phẩm vào giỏ hàng, điều chỉnh số lượng và áp mã giảm giá, Để tôi chuẩn bị đầy đủ danh sách mặt hàng trước khi tiến hành thanh toán đơn hàng.

Acceptance Criteria (AC)

Kiểm tra tồn kho khi Thêm (Add to Cart): Hệ thống bắt buộc phải check CSDL tồn kho. Nếu Số lượng yêu cầu > Số lượng tồn kho, hệ thống chặn hành động và báo lỗi. Ngược lại, thêm vào giỏ thành công.

Tính toán tự động tại Giỏ hàng: Khi khách hàng thay đổi số lượng hoặc xóa sản phẩm trong Giỏ hàng, hệ thống phải cập nhật lập tức: Đơn giá, Số lượng, Tổng tiền tạm tính của sản phẩm, Tổng giá trị đơn hàng.

Kiểm tra tồn kho Realtime tại Giỏ: Trong lúc khách hàng đang ở màn hình Giỏ hàng, hệ thống phải liên tục hoặc định kỳ kiểm tra trạng thái tồn kho thực tế để đưa ra cảnh báo kịp thời nếu sản phẩm vừa bị khách khác mua hết.

Áp dụng Mã giảm giá (Coupon): Hệ thống cho phép nhập mã giảm giá và tự động trừ tiền vào tổng đơn nếu mã hợp lệ.

Lưu trạng thái Giỏ hàng bỏ rơi (Abandoned Cart): * Khách đã đăng nhập: Lưu vào DB (Giỏ hàng không bị mất khi đổi thiết bị/tắt trình duyệt).

Khách vãng lai: Lưu vào Cookie/Session trình duyệt với thời gian hết hạn (TTL) quy định.

Giao diện

Bố cục chủ đạo: Trang ""Giỏ hàng"" (Cart Page) dạng danh sách dòng sản phẩm kèm cột thông tin giá; có một khu vực Tổng kết đơn hàng (Order Summary Side-bar) ở bên phải.

Thành phần giao diện:

Nút cập nhật: Bộ tăng/giảm số lượng ngay trên từng hàng sản phẩm. Nút ""Xóa"" (Icon Thùng rác).

Khung Coupon: Ô nhập text ""Mã giảm giá"" và nút ""Áp dụng"".

Tương tác UX:

Lỗi vượt tồn kho: Nếu khách cố bấm cộng số lượng vượt mức kho cho phép, hệ thống hiển thị thông báo ngay dưới chân sản phẩm: ""Rất tiếc, cửa hàng chỉ còn [X] sản phẩm này"".

Dòng chảy dữ liệu (Data Flow)

Khi Click ""Thanh toán"": Hệ thống đóng gói toàn bộ Data trong Giỏ hàng chuyển trạng thái thành Đơn hàng tạm thời (Draft Order) và thực hiện Redirect người dùng sang cổng Module 3.1.9. Thanh toán.

Cơ chế khóa tồn kho tạm thời (Soft-lock): Khi bấm ""Thêm vào giỏ"", hệ thống có thể tùy chọn giữ chỗ (soft-lock) số lượng sản phẩm đó trong vòng x phút nhằm đảm bảo trải nghiệm checkout không bị tranh chấp dữ liệu.
"
User Story 9a: Khởi tạo thông tin & Lựa chọn phương thức thanh toán	"Là một Khách hàng của PawPal, Tôi muốn kiểm tra lại thông tin đơn hàng, điền địa chỉ giao hàng và lựa chọn phương thức thanh toán phù hợp để tôi có thể chuẩn bị hoàn tất giao dịch mua sắm một cách nhanh chóng và chính xác.

Acceptance Criteria (AC)

Xác minh giỏ hàng cuối (Final Validation): Ngay khi khách bấm ""Tiến hành thanh toán"", hệ thống bắt buộc phải quét lại CSDL để kiểm tra: Tính hợp lệ của giá, Số lượng tồn kho thực tế, Trạng thái hoạt động của mã giảm giá. Nếu có sai lệch, chặn luồng và trả về Giỏ hàng kèm cảnh báo.

Tự động điền (Pre-fill) thông tin: * Khách đã đăng nhập: Hệ thống tự động truy xuất và điền sẵn Họ tên, Số điện thoại, Địa chỉ nhận hàng từ Profile.

Khách vãng lai: Hệ thống hiển thị form trống và bắt buộc nhập đầy đủ 3 trường thông tin trên mới cho phép tiếp tục.

Xử lý theo Phương thức thanh toán:

Nếu chọn COD: Hệ thống tạo ngay đơn hàng ở trạng thái ""Chờ xử lý"", bỏ qua bước chuyển hướng cổng thanh toán và đi thẳng đến màn hình Thành công.

Nếu chọn Thanh toán trực tuyến (Online): Hệ thống tạo mã giao dịch tạm thời, thực hiện Khóa thanh toán tạm thời đơn hàng đó (để tránh xử lý trùng) và chuẩn bị chuyển hướng (Redirect) sang cổng thanh toán.

Giao diện

Bố cục chủ đạo: Giao diện 2 cột (Cột trái: Thông tin giao hàng & Phương thức thanh toán; Cột phải: Tóm tắt đơn hàng - Order Summary gồm danh sách sản phẩm, phí ship, tổng tiền).

Thành phần giao diện:

Form thông tin: Các ô nhập Họ tên, SĐT, Bộ chọn Tỉnh/Thành, Quận/Huyện, Phường/Xã và ô nhập Địa chỉ chi tiết.

Radio Button nhóm thanh toán: Chọn giữa ""Thanh toán khi nhận hàng (COD)"" và ""Thanh toán trực tuyến (Thẻ quốc tế/Ví điện tử/Chuyển khoản QR)"".

Tương tác UX:

Nếu thông tin giao hàng bắt buộc bị bỏ trống, nút ""Thanh toán"" sẽ giữ trạng thái mờ (Disabled). Khi click vào sẽ highlight viền đỏ các ô còn thiếu kèm text thông báo lỗi.

Dòng chảy dữ liệu (Data Flow)

Khi chọn thanh toán Online và click xác nhận, hệ thống gọi API POST /api/v1/checkout/initialize. Hệ thống ghi nhận một bản ghi đơn hàng ở trạng thái PENDING_PAYMENT kèm theo một mã token giao dịch có thời gian hết hạn (TTL) nhất định.

"
User Story 9b: Xử lý cổng thanh toán trực tuyến & Đồng bộ kết quả	"Là một Khách hàng của PawPal, Tôi muốn hệ thống xử lý giao dịch trực tuyến một cách an toàn và nhận được thông báo kết quả rõ ràng, Để tôi chắc chắn đơn hàng của mình đã được hệ thống ghi nhận thành công.

Acceptance Criteria (AC)

Chống trùng lặp thanh toán (Anti-Duplicate Payment): Hệ thống phải áp dụng cơ chế khóa tạm thời đơn hàng đang xử lý online. Nếu người dùng F5 (Refresh) hoặc cố tình click nút thanh toán nhiều lần liên tiếp, hệ thống chỉ xử lý và ghi nhận duy nhất một yêu cầu giao dịch hợp lệ.

Xử lý phản hồi từ Cổng thanh toán (Callback/Webhook):

Trường hợp Thành công: Cập nhật trạng thái đơn hàng thành ""Đã thanh toán"", lưu thông tin đối chiếu (Mã GD, thời gian, số tiền) vào CSDL Giao dịch. Kích hoạt Khóa cứng số lượng tồn kho (Trừ trực tiếp vào kho thực tế).

Trường hợp Thất bại/Hủy giữa chừng: Cập nhật trạng thái thành ""Thanh toán thất bại"", giữ nguyên giỏ hàng tạm thời và không trừ kho.

Hành động sau giao dịch:

Nếu thành công: Hiển thị ""Trang kết quả giao dịch thành công"" (Mã đơn, thông tin ship, tóm tắt sản phẩm) và tự động gửi SMS/Thông báo xác nhận đơn hàng qua website.

Nếu thất bại: Hiển thị ""Trang kết quả giao dịch thất bại"" kèm nút ""Thanh toán lại"", cho phép khách chọn lại phương thức thanh toán mà không phải gom hàng vào giỏ từ đầu.

Lưu trữ lịch sử: Toàn bộ lịch sử log giao dịch và trạng thái đơn hàng phải được đẩy vào mục ""Chi tiết đơn hàng"" trong tài khoản để phục vụ tra cứu/tra soát.

Giao diện

Bố cục chủ đạo: Trang trạng thái kết quả (Full-page status) với thiết kế tối giản, tập trung vào trải nghiệm cảm xúc của khách hàng.

Thành phần giao diện:

Màn hình Thành công: Icon check xanh lớn, Mã đơn hàng (có tính năng click-to-copy), nút ""Tiếp tục mua sắm"" và ""Theo dõi đơn hàng"".

Màn hình Thất bại: Icon cảnh báo đỏ, lý do thất bại (nếu có), nút ""Thử lại bằng phương thức khác"" và nút ""Quay về giỏ hàng"".

Tương tác UX:

Màn hình chờ (Loading Screen): Trong lúc hệ thống đang đợi callback phản hồi từ bên thứ 3, hiển thị một màn hình chờ với hiệu ứng xoay (Spinner) kèm thông điệp: ""PawPal đang xử lý giao dịch của bạn, vui lòng không tắt hoặc refresh trình duyệt..."" để tránh người dùng thoát trang đột ngột.

Dòng chảy dữ liệu (Data Flow)

Xử lý Idempotency: Mọi yêu cầu thanh toán online gửi đi từ PawPal phải đính kèm một Idempotency-Key (thường là Mã đơn hàng + Mã lượt bấm). Backend dựa vào key này để drop tất cả các request trùng lặp trong thời gian $T$.

Cập nhật kho thực tế: Khi webhook trả về status = 'SUCCESS', hệ thống thực thi câu lệnh SQL giảm trừ tồn kho đồng thời: Số lượng tồn kho mới = Số lượng tồn kho hiện tại - Số lượng mua

Nếu thành công, chuyển Event sang Shipping_Service để bắt đầu quy trình đóng gói hậu cần.
"
User Story 10a: Danh sách đơn hàng	"Là một Khách hàng của PawPal, Tôi muốn xem danh sách các đơn hàng đã mua và nhận thông báo khi đơn hàng đổi trạng thái để tôi nắm bắt được tiến độ xử lý và chủ động thời gian nhận hàng.

Acceptance Criteria (AC)

Khởi tạo & Đồng bộ: Ngay sau khi đơn hàng được tạo thành công từ quy trình Thanh toán, hệ thống bắt buộc phải ghi nhận vào CSDL với trạng thái mặc định là ""Chờ xác nhận"" và đồng bộ ngay lên giao diện quản lý của cả Khách hàng và Admin.

Truy xuất danh sách: Hệ thống hiển thị toàn bộ đơn hàng gắn liền với User ID của tài khoản đang đăng nhập, sắp xếp theo thứ tự ngày đặt mới nhất ở trên cùng.

Thông tin hiển thị tổng quan: Mỗi đơn hàng trong danh sách phải hiển thị tối thiểu: Mã đơn hàng, Ngày đặt, Tổng giá trị, Trạng thái thanh toán (Đã thanh toán/Chưa thanh toán) và Trạng thái vận chuyển hiện tại.

Thông báo Realtime: Mỗi khi hệ thống hoặc Admin cập nhật trạng thái đơn hàng (Ví dụ: từ ""Chờ xác nhận"" $\rightarrow$ ""Đang chuẩn bị hàng"" $\rightarrow$ ""Đang giao""), hệ thống bắt buộc phải tự động kích hoạt gửi Email và Thông báo Realtime (Push/In-app Notification) cho khách hàng.

Giao diện

Bố cục chủ đạo: Dạng Danh sách phân tab (Tabbed List View). Mỗi tab đại diện cho một nhóm trạng thái lớn để người dùng dễ phân loại.

Thành phần giao diện:

Thanh Tab Trạng thái: Bao gồm các tab: Tất cả, Chờ thanh toán, Đang xử lý (Chờ xác nhận + Đang chuẩn bị), Đang giao, Hoàn thành, Đã hủy/Hoàn trả.

Thẻ đơn hàng (Order Card): Hiển thị tóm tắt thông tin đơn hàng, ảnh đại diện của 1-2 sản phẩm đầu tiên và nút ""Xem chi tiết đơn hàng"".

Tương tác UX:

Hệ thống nhãn màu (Status Badges): Mỗi trạng thái vận chuyển sử dụng một màu sắc đặc trưng giúp người dùng nhận diện trực quan nhanh chóng:

Chờ xác nhận: Màu vàng cam (Warning).

Đang giao: Màu xanh dương (Information).

Hoàn thành: Màu xanh lá (Success).

Đã hủy / Hoàn trả: Màu xám / đỏ (Danger).

Dòng chảy dữ liệu (Data Flow)

Khi người dùng chuyển tab trạng thái, hệ thống gọi API: GET /api/v1/orders?status={status_param}.

Luồng Webhook/Notification: Khi trạng thái đơn hàng trong DB thay đổi -> Kích hoạt Order_Status_Event -> Đẩy qua Notification_Service để phân phối tin nhắn đến thiết bị của người dùng cuối theo thời gian thực.

"
User Story 10b: Chi tiết đơn hàng 	"Là một Khách hàng của PawPal, Tôi muốn xem chi tiết thông tin và dòng thời gian xử lý của từng đơn hàng cụ thể, Để tôi đối chiếu được sản phẩm, chi phí và thực hiện các thao tác hậu mãi (đổi trả, đánh giá, mua lại) khi đơn hàng hoàn tất.

Acceptance Criteria (AC)

Thông tin chi tiết toàn diện: Khi khách hàng click chọn một đơn hàng cụ thể, hệ thống phải truy xuất và hiển thị đầy đủ dữ liệu:

Danh sách sản phẩm (Tên, hình ảnh, số lượng, giá bán từng món).

Phương thức thanh toán & Địa chỉ giao hàng chi tiết.

Tổng chi phí (Tiền hàng, phí vận chuyển, giảm giá, tổng thanh toán).

Trục lịch sử trạng thái (Order Timeline): Hiển thị một chuỗi tiến trình ghi nhận các mốc thời gian thực tế ứng với các trạng thái: Chờ xác nhận, Đang chuẩn bị hàng, Đang giao, Hoàn thành, Đã hủy, Hoàn trả.

Lưu trữ lâu dài & Xử lý hậu mãi: * Khi đơn hàng chuyển sang trạng thái cuối cùng là ""Hoàn thành"", hệ thống đóng đơn và chuyển vào khu vực ""Lịch sử mua hàng"".

Kích hoạt các nút chức năng hậu mãi tương ứng: ""Đánh giá sản phẩm"", ""Yêu cầu đổi/trả"".

Đồng bộ trạng thái ngoại lệ: Nếu phát sinh tình huống lỗi vận chuyển (Giao thất bại, Khách từ chối nhận, Thiếu hàng) dẫn đến Hủy hoặc Hoàn trả, hệ thống phải cập nhật trạng thái liên quan theo thời gian thực và phản ánh chính xác trong mục lịch sử này.

Giao diện

Bố cục chủ đạo: Trang chi tiết đơn hàng (Order Detail Page) chia làm 3 phân khu rõ ràng: Thông tin vận chuyển/thanh toán (Trên), Danh sách sản phẩm (Dưới bên trái) và Trục thời gian xử lý (Dưới bên phải).

Thành phần giao diện:

Khối Timeline: Trục dọc biểu diễn tiến trình di chuyển của đơn hàng kèm giờ-ngày cụ thể (Ví dụ: 10:15 - 15/05/2026: Đơn hàng đã được bàn giao cho đơn vị vận chuyển).

Nhóm nút tác vụ hậu mãi: Nút ""Đánh giá ngay"" (màu xanh), ""Khiếu nại/Đổi trả"" (màu xám nhạt).

Tương tác UX:

Nếu đơn hàng đang ở trạng thái ""Đang giao"" hoặc ""Hoàn thành"", nút ""Hủy đơn hàng"" tại trang chi tiết sẽ bị ẩn hoặc vô hiệu hóa (Disabled) hoàn toàn để tránh xung đột vận hành.

Dòng chảy dữ liệu (Data Flow)

Chuyển tiếp trạng thái ngoại lệ: Nếu hệ thống nhận tín hiệu Update_Status = 'RETURNED' từ bộ phận kho/vận chuyển, bản ghi đơn hàng lập tức được cập nhật, đồng thời giải phóng/hoàn trả lại số lượng tồn kho tương ứng của các sản phẩm đó vào CSDL sản phẩm.
"
"User Story 11a: Thực hiện đánh giá sản phẩm và dịch vụ
"	"Là một khách hàngtôi muốn gửi đánh giá cho các đơn hàng/dịch vụ đã hoàn thành, để tôi có thể chia sẻ trải nghiệm thực tế và nhận điểm thưởng Paw Points.

Acceptance Criteria (AC):

AC 1: Hiển thị danh sách chờ đánh giá tại màn hình ""Quản lý hoạt động""

Màn hình phải hiển thị các ""Thẻ hoạt động"".

Mỗi thẻ bao gồm: Ảnh đại diện sản phẩm/dịch vụ, Tên thực thể, Ngày hoàn thành.

Nút ""Viết đánh giá"": Hiển thị màu xanh lá đậm, chữ trắng. Nút này chỉ xuất hiện nếu đơn hàng có trạng thái Completed và chưa có bản ghi đánh giá trong CSDL.

AC 2: Giao diện biểu mẫu đánh giá 

Header Form: Hiển thị ảnh và tên chính xác của sản phẩm/dịch vụ đang được đánh giá.

Thanh chấm sao: Hiển thị 05 biểu tượng ngôi sao lớn (icon star).

Hành vi: Khi chưa chọn, 5 sao có màu xám nhạt. Khi di chuột hoặc chạm vào sao thứ 4, cả 4 ngôi sao từ trái qua phải phải chuyển sang màu vàng tươi.

Ô nhập nội dung: Dạng Textarea có placeholder: ""Hãy chia sẻ cảm nhận của bạn về chất lượng dịch vụ và thái độ nhân viên..."". Giới hạn tối đa 1000 ký tự.

Khu vực tải tệp tin (Media Upload): Hiển thị icon hình máy ảnh/máy quay.

Hành vi: Khi chọn tệp, phải hiển thị hình ảnh thu nhỏ của tệp đó kèm nút ""x"" để xóa.

AC 3: Logic xác nhận gửi đánh giá

Khi nhấn nút ""Gửi"", hệ thống phải hiện một Pop-up xác nhận giữa màn hình với thông điệp: ""Bạn có chắc chắn muốn công khai phản hồi này không?"".

Pop-up có 2 nút: ""Hủy""và ""Xác nhận""

AC 4: Kiểm duyệt từ ngữ nhạy cảm

Hệ thống phải chạy bộ lọc tự động đối soát nội dung với ""Danh mục từ khóa cấm"".

Nếu phát hiện từ cấm, sau khi khách nhấn ""Xác nhận"", hệ thống không lưu và báo lỗi đỏ ngay dưới ô nhập: ""Nội dung chứa từ ngữ không phù hợp, vui lòng điều chỉnh lại.""

AC 5: Quy tắc cộng điểm 

Sau khi lưu thành công, màn hình hiển thị thông báo chúc mừng: ""Cảm ơn bạn! Bạn đã nhận được +5 Paw Points cho đánh giá này.""

Hệ thống phải cập nhật ngay lập tức vào trong CSDL.

"
"User Story 11b: Xử lý ngoại lệ và bảo mật đánh giá
"	"Là một admin, tôi muốn ngăn chặn các hành vi đánh giá sai lệch để đảm bảo tính minh bạch của website.

AC 1: Chặn truy cập trái phép

Nếu User A cố tình nhập URL dẫn đến form đánh giá của đơn hàng thuộc User B -> Hệ thống kiểm tra Owner_ID.

Kết quả: Chuyển hướng về trang chủ và hiển thị Toast Message: ""Bạn không có quyền đánh giá giao dịch này.""

AC 2: Xử lý tệp tin lỗi

Nếu tệp > 10MB hoặc không phải định dạng .jpg, .png, .mp4 -> Hiển thị cảnh báo: ""Tệp không hợp lệ. Vui lòng chọn ảnh/video dưới 10MB."" và vô hiệu hóa nút Gửi.

AC 3: Lưu trữ đệm khi mất kết nối 

Nếu đang nhấn Gửi mà Internet mất kết nối -> Hệ thống lưu nội dung vào LocalStorage.

Hiển thị thông báo: ""Mất kết nối. Đánh giá của bạn đã được lưu nháp, hệ thống sẽ tự động gửi lại khi có mạng.""

AC 4: Phân nhánh xử lý đánh giá thấp (Negative Feedback)

Nếu Rating_Stars < 3:

Trạng thái đánh giá trong CSDL để là Pending_Support.

Nội dung không hiển thị ngay lên trang chủ mà được đẩy về danh sách ""Cần hỗ trợ"" của Admin."
"User Story 12a: Khởi tạo yêu cầu đổi trả sản phẩm
"	"Là một khách hàng, tôi muốn gửi yêu cầu đổi trả cho đơn hàng lỗi, để tôi được đảm bảo quyền lợi mua sắm minh bạch tại PawPal.

Acceptance Criteria (AC):

AC 1: Hiển thị điều kiện đổi trả tại màn hình ""Quản lý hoạt động""

Hệ thống kiểm tra ngày hoàn thành đơn hàng. Nếu Current_Date - Completion_Date <= 7 ngày, hiển thị nút ""Đổi trả hàng"". Nếu quá 7 ngày, nút này tự động ẩn.

Nút này chỉ xuất hiện với các thực thể là ""Sản phẩm"" (Shop), không xuất hiện với ""Dịch vụ"" (Spa/Hotel).

AC 2: Giao diện biểu mẫu yêu cầu đổi trả

Dropdown ""Loại yêu cầu"": Gồm 2 tùy chọn: ""Đổi sản phẩm mới"" và ""Hoàn tiền"".

Ô nhập ""Lý do"": Dạng text, bắt buộc nhập tối thiểu 20 ký tự.

Khu vực ""Minh chứng"": Nút bấm cho phép tải tối đa 3 ảnh và 1 video.

Hành vi: Hiển thị thanh tiến trình khi đang tải tệp.

AC 3: Luồng xác nhận gửi yêu cầu

Sau khi nhấn ""Gửi"", hệ thống hiển thị Toast Message thông báo: ""Yêu cầu của bạn đã được tiếp nhận. Mã phiếu: #RT123. Vui lòng chờ phản hồi trong 24h.""

Trạng thái đơn hàng trong danh mục hoạt động cập nhật nhãn: ""Đang xử lý đổi trả""."
User Story 12b: Theo dõi và thực hiện quy trình gửi trả hàng	"Là một khách hàng, tôi muốn theo dõi tiến độ xử lý phiếu hậu mãi và nhận hướng dẫn gửi trả hàng, để tôi biết rõ các bước cần làm tiếp theo.

Acceptance Criteria (AC):

AC 1: Màn hình chi tiết Phiếu hậu mãi

Hiển thị dòng thời gian trạng thái phiếu: Chờ kiểm duyệt -> Đã chấp nhận -> Đang gửi hàng -> Hoàn tất.

Nếu trạng thái là ""Cần bổ sung thông tin"": Hiển thị ô chat/nhập liệu bổ sung và nút ""Cập nhật minh chứng"".

AC 2: Hiển thị hướng dẫn gửi hàng (khi Phiếu được chấp nhận)

Hệ thống hiển thị một khung  chứa: Địa chỉ kho nhận hàng, Tên người nhận, Số điện thoại và Mã vận đơn dự kiến (nếu shop hỗ trợ thu hồi).

Có nút ""Sao chép thông tin"" để khách hàng sử dụng khi đóng gói hàng.

AC 3: Kết quả xử lý cuối cùng

Nếu chọn Đổi hàng: Hiển thị thông tin đơn hàng mới (Mã đơn, Giá trị 0đ) kèm link theo dõi hành trình giao hàng.

Nếu chọn Hoàn tiền: Hiển thị thông báo xác nhận số tiền đã hoàn trả và phương thức nhận tiền.

"
User Story 12c: Xử lý logic nghiệp vụ và bảo mật hậu mãi	"Là một hệ thống, tôi muốn tự động điều chỉnh quyền lợi và kiểm soát truy cập đơn hàng, để đảm bảo tính chính xác của dữ liệu tài chính và an toàn thông tin.

AC 1: Khấu trừ điểm thưởng 

Khi trạng thái phiếu chuyển sang Refund_Success (Hoàn tiền thành công), hệ thống tự động chạy lệnh trừ điểm Paw Points tương ứng với đơn hàng đó trong ví khách hàng.

Hành vi ngoại lệ: Nếu số dư hiện tại < số điểm cần trừ, ví điểm sẽ hiển thị Số âm (ví dụ: -15 Paw Points) và ghi chú: ""Điểm nợ do hoàn đơn"".

AC 2: Xác thực quyền cho khách vãng lai 

Màn hình tra cứu đơn hàng vãng lai (không cần đăng nhập) phải có form yêu cầu: ""Mã đơn hàng"" + ""Số điện thoại"".

Hệ thống gửi mã OTP về SĐT đó. Chỉ khi nhập đúng OTP mới cho phép khách truy cập vào giao diện gửi yêu cầu Đổi trả.

AC 3: Đồng bộ trạng thái đánh giá

Nếu đơn hàng đã được đánh giá trước khi đổi trả: Sau khi hoàn tiền, hệ thống tự động gắn thêm một nhãn nhỏ màu xám cạnh tên khách hàng trong bài đánh giá đó với nội dung: ""Giao dịch đã hủy/hoàn"".

AC 4: Xử lý lỗi thanh toán 

Nếu lệnh hoàn tiền qua cổng thanh toán online bị lỗi, hệ thống ghi trạng thái Refund_Failed.

Tự động bắn thông báo đến màn hình Admin Kỹ thuật để xử lý thủ công."
User Story 13a: Quản lý hạng thành viên và Điểm thưởng	"Với tư cách là khách hàng thành viên, tôi muốn xem hạng thành viên và số dư điểm Paw Points hiện tại, để tôi nắm rõ các đặc quyền và kế hoạch mua sắm của mình.

Acceptance Criteria (AC):

AC 1: Giao diện tổng quan tại trang ""Ưu đãi & Thành viên""

Màn hình phải hiển thị một Thẻ thành viên số nổi bật ở đầu trang.

Hạng thành viên: Hiển thị nhãn  tương ứng: Bạc , Vàng , hoặc Kim Cương . Mỗi hạng có màu sắc khác nhau (Xám bạc, Vàng đồng, Xanh lấp lánh).

Thanh tiến trình: Hiển thị số tiền còn thiếu để nâng cấp lên hạng tiếp theo (Ví dụ: ""Chi tiêu thêm 1.200.000đ để lên hạng Vàng"").

Số dư Paw Points: Hiển thị con số lớn, rõ ràng kèm icon dấu chân thú cưng.

AC 2: Hiển thị lịch sử tích điểm

Bảng danh sách liệt kê các giao dịch: Ngày | Nội dung | Số điểm (+/-).

Điểm sắp hết hạn: Hiển thị dòng thông báo nhỏ: ""Có [X] điểm sẽ hết hạn vào ngày [dd/mm/yyyy]""."
User Story 13b: Đổi điểm lấy mã giảm giá	
User Story 13c: Xử lý ngoại lệ và logic đồng bộ	"Với tư cách là hệ thống, tôi muốn tự động xử lý các tình huống lỗi và hoàn trả quyền lợi, để đảm bảo tính công bằng và chính xác cho dữ liệu ưu đãi.

Acceptance Criteria (AC):

AC 1: Cơ chế Transaction trong CSDL

Hệ thống phải đảm bảo tính nhất quán (Atomic): Việc trừ điểm và cấp mã Voucher phải diễn ra đồng thời.

Nếu bước ""Cấp mã"" lỗi, hệ thống phải tự động hoàn trả  số điểm đã trừ và báo lỗi cho khách hàng.

AC 2: Logic thu hồi điểm khi Hoàn đơn (Refund)

Khi một đơn hàng được Hoàn tiền, hệ thống tự động tìm mã đơn hàng trong bảng Points_History và thực hiện lệnh Trừ số điểm tương ứng đã cộng trước đó.

Xử lý điểm âm: Nếu ví hiện tại không đủ điểm để trừ, số dư hiển thị là số âm và khóa tính năng đổi quà cho đến khi khách tích lũy đủ điểm dương.

AC 3: Hoàn trả Voucher khi đơn hàng bị hủy

Nếu khách hàng mua hàng có áp dụng Voucher đổi từ điểm, nhưng sau đó đơn hàng bị hủy (không do lỗi khách hàng): Hệ thống phải tự động khôi phục Voucher đó về trạng thái ""Khả dụng"" trong ví của khách.
"
"User Story 14a: Tiếp nhận và hiển thị thông báo


"	"Với tư cách là khách hàng thành viên, tôi muốn xem hạng thành viên và số dư điểm Paw Points hiện tại, để tôi nắm rõ các đặc quyền và kế hoạch mua sắm của mình.

Acceptance Criteria (AC):

AC 1: Giao diện tổng quan tại trang ""Ưu đãi & Thành viên""

Màn hình phải hiển thị một Thẻ thành viên số (Digital Member Card) nổi bật ở đầu trang.

Hạng thành viên: Hiển thị nhãn (Badge) tương ứng: Bạc (Silver), Vàng (Gold), hoặc Kim Cương (Diamond). Mỗi hạng có màu sắc khác nhau (Xám bạc, Vàng đồng, Xanh lấp lánh).

Thanh tiến trình (Progress Bar): Hiển thị số tiền còn thiếu để nâng cấp lên hạng tiếp theo (Ví dụ: ""Chi tiêu thêm 1.200.000đ để lên hạng Vàng"").

Số dư Paw Points: Hiển thị con số lớn, rõ ràng kèm icon dấu chân thú cưng.

AC 2: Hiển thị lịch sử tích điểm

Bảng danh sách liệt kê các giao dịch: Ngày | Nội dung | Số điểm (+/-).

Điểm sắp hết hạn: Hiển thị dòng thông báo nhỏ: ""Có [X] điểm sẽ hết hạn vào ngày [dd/mm/yyyy]""."
"User Story 14b: Tương tác và Quản lý danh sách thông báo


"	
User Story 14c: Logic vận hành và cơ chế dự phòng	"Với tư cách là hệ thống, tôi muốn tự động hóa việc gửi thông báo đúng thời điểm và qua đúng kênh, để đảm bảo tính kịp thời và không gây phiền hà cho người dùng.

Acceptance Criteria (AC):

AC 1: Quy tắc khung giờ gửi (Marketing Quiet Hours)

Các thông báo Marketing chỉ được phát đi trong khung giờ 08:00 - 21:00.

Nếu có thông báo Marketing phát sinh ngoài giờ này, hệ thống phải đưa vào hàng chờ (Queue) và tự động gửi vào 08:01 sáng hôm sau.

AC 2: Cơ chế chuyển đổi kênh dự phòng (Fallback Mechanism)

Đối với các thông báo quan trọng (Nhắc lịch hẹn, Cập nhật khẩn cấp):

Hệ thống gửi In-app/Push trước.

Sau 15 phút, nếu trạng thái thông báo vẫn là Unread, hệ thống tự động kích hoạt API gửi tin nhắn SMS hoặc Zalo OA dự phòng.

AC 3: Kiểm soát tần suất và Trùng lặp

Hệ thống không được gửi quá 3 thông báo Marketing/tuần/người dùng.

Deduplication: Nếu có 2 yêu cầu gửi thông báo giống hệt nhau cho cùng 1 user trong vòng 5 phút, hệ thống chỉ thực thi yêu cầu đầu tiên."
User Story 15a: Tự tra cứu thông tin và tương tác với Chatbot AI	"Với tư cách là khách hàng, tôi muốn tự tra cứu FAQ hoặc trao đổi với Chatbot, để tôi có thể giải quyết các thắc mắc thường gặp một cách tức thì mà không cần chờ đợi nhân viên.

Acceptance Criteria (AC):

AC 1: Giao diện Trung tâm trợ giúp (Help Center)

Màn hình hiển thị Thanh tìm kiếm (Search Bar) nổi bật ở đầu trang với placeholder: ""Bạn cần trợ giúp điều gì?"".

Danh sách các chủ đề FAQ được chia theo các khối (Categories) có Icon minh họa: Tài khoản, Đặt lịch, Thanh toán, Sản phẩm.

Hành vi: Khi nhấn vào một câu hỏi, nội dung câu trả lời sẽ mở rộng xuống dưới (dạng Accordion).

AC 2: Giao diện Khung Chat thông minh 

Một biểu tượng Chat hình tròn nằm cố định ở góc dưới bên phải màn hình.

Cơ chế AI: Khi khách nhập câu hỏi, Chatbot phải trả về kết quả sau tối đa 2 giây. Nếu câu hỏi liên quan đến đơn hàng, Bot phải hiển thị danh sách đơn hàng gần đây của khách để khách chọn nhanh.

AC 3: Bộ lọc nội dung 

Nếu khách nhập từ ngữ khiếm nhã, Chatbot tự động gửi tin nhắn cảnh báo: ""PawPal là cộng đồng văn minh, vui lòng sử dụng từ ngữ phù hợp để được hỗ trợ tốt nhất."""
User Story 15b: Gửi Phiếu hỗ trợ và Kết nối nhân viên	"Với tư cách là khách hàng gặp vấn đề phức tạp, tôi muốn kết nối trực tiếp với nhân viên hoặc gửi phiếu yêu cầu, để vấn đề của tôi được nhân viên chuyên môn xử lý triệt để.

Acceptance Criteria (AC):

AC 1: Chuyển đổi sang Live Chat 

Khung chat hiển thị nút ""Kết nối với tư vấn viên"" nếu Chatbot không giải quyết được vấn đề.

Kiểm tra trạng thái: Hệ thống phải kiểm tra xem có nhân viên nào đang Online không. Nếu không, tự động chuyển sang Form gửi Ticket.

AC 2: Biểu mẫu gửi Phiếu hỗ trợ 

Các trường thông tin: Tiêu đề, Loại vấn đề (Dropdown), Mô tả chi tiết.

Khu vực đính kèm: Cho phép tải lên tối đa 3 tệp tin.

Xử lý ngoại lệ: Nếu tệp lỗi/quá dung lượng, hiển thị dòng text đỏ: ""Tệp quá lớn, bạn có thể gửi ảnh trực tiếp qua Zalo [Link] để được hỗ trợ nhanh"".

AC 3: Xác thực cho khách vãng lai 

Nếu khách chưa đăng nhập yêu cầu gửi Ticket, hệ thống hiện Form: ""Nhập SĐT để nhận mã xác thực"".

Khách phải nhập đúng mã OTP gửi về máy thì nút ""Gửi yêu cầu"" mới kích hoạt."
User Story 15c: Theo dõi tiến độ và đánh giá chất lượng hỗ trợ	"
là 1 Khách hàng, tôi muốn theo dõi trạng thái xử lý các yêu cầu hỗ trợ của mình và thực hiện đánh giá sau khi hoàn tất, để tôi đảm bảo vấn đề của mình được giải quyết triệt để và đóng góp ý kiến cải thiện dịch vụ.
Acceptance Criteria (AC) - Tiêu chí nghiệm thu:
AC 1: Giao diện màn hình ""Yêu cầu hỗ trợ của tôi"" 
Màn hình phải hiển thị danh sách tất cả các yêu cầu mà khách hàng đã gửi.
Mỗi dòng yêu cầu bao gồm: Mã Ticket (VD: #TK-99), Tiêu đề yêu cầu, Ngày gửi, và Nhãn trạng thái (Status Badge).
Quy định màu sắc trạng thái:
Đang chờ: Màu xám (Nhân viên chưa tiếp nhận).
Đang xử lý: Màu xanh dương (Nhân viên đang trao đổi/kiểm tra).
Đã phản hồi: Màu vàng (Nhân viên đã trả lời, chờ khách hàng xem).
Đã đóng: Màu xanh lá cây (Vấn đề đã kết thúc).
AC 2: Màn hình Chi tiết Yêu cầu (Ticket Detail)
Hiển thị luồng hội thoại theo dạng Timeline giống như cửa sổ Chat, bao gồm cả nội dung của khách hàng và phản hồi của nhân viên.
Hiển thị các tệp tin đính kèm (hình ảnh/video) mà hai bên đã gửi.
Phải có nhãn ""Ưu tiên cao"" (Màu đỏ) hiển thị nổi bật nếu vấn đề liên quan đến sức khỏe bé cưng hoặc lỗi thanh toán tiền nong.
AC 3: Tính năng tương tác phản biện
Hệ thống cho phép khách hàng gửi thêm tin nhắn hoặc hình ảnh bổ sung vào một Ticket đang mở (Open) cho đến khi khách hàng cảm thấy thỏa đáng.
Mỗi khi nhân viên phản hồi, hệ thống phải tự động bắn Thông báo (Push Notification) để khách hàng biết và vào kiểm tra ngay.
AC 4: Luồng Đóng yêu cầu và Đánh giá (CSAT)
Khi nhân viên đưa ra giải pháp cuối cùng, nút ""Đóng hỗ trợ & Đánh giá"" sẽ hiện lên rõ rệt ở cuối trang.
Hành vi khi nhấn nút: Một Pop-up hiện lên giữa màn hình yêu cầu khách hàng:
Chọn mức độ hài lòng (từ 1 đến 5 ngôi sao).
Nhập nhận xét ngắn về thái độ phục vụ của nhân viên (tùy chọn).
Sau khi nhấn ""Gửi đánh giá"", Ticket chuyển sang trạng thái Closed và không được phép nhắn tin thêm vào Ticket đó nữa.
AC 5: Logic nhắc nhở (SLA Reminder)
Nếu sau 60 phút ở trạng thái Đang chờ mà không có phản hồi, hệ thống hiển thị dòng chữ thông báo cho khách: ""Yêu cầu của bạn đang được chuyển đến Quản lý cơ sở để xử lý khẩn cấp"".
"