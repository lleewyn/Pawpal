3.1.Mô tả quy trình nghiệp vụ và Sơ đồ BPMN
3.1.1. Quy trình đăng ký
Mô tả quy trình 
Đối với Đăng ký chủ động, quy trình bắt đầu khi người dùng chọn chức năng "Đăng ký" trên giao diện Pawpal và cung cấp các thông tin gồm Họ tên, Số điện thoại và Mật khẩu. Ngay lập tức, Pawpal gửi một mã xác nhận (OTP) về số điện thoại để đảm bảo tài khoản thuộc về đúng chủ nhân. Sau khi nhập mã thành công, tài khoản được kích hoạt ngay lập tức và người dùng có thể đăng nhập, Pawpal điều hướng người dùng vào Trang chủ. Khách hàng được chào đón bằng thông báo chào mừng và nhận ngay 50 điểm thưởng Paw Points để bắt đầu hành trình chăm sóc thú cưng.
Đối với Định danh lũy tiến dành cho khách hàng vãng lai, Khi khách hàng đặt lịch hoặc mua sắm lần đầu, Pawpal chỉ yêu cầu những thông tin cần thiết cho giao dịch bao gồm Họ tên, Số điện thoại, thông tin cơ bản của bé cưng hoặc Địa chỉ giao nhận sản phẩm. Khách hàng không cần gián đoạn để tạo tài khoản, giao dịch được ưu tiên hoàn tất trước. Sau khi giao dịch hoàn tất, Pawpal sẽ ngầm khởi tạo một "Tài khoản tạm" gắn với số điện thoại khách hàng cung cấp và đồng thời gửi một tin nhắn SMS với nội dung chào mừng, kèm theo đường dẫn thiết lập mật khẩu có hiệu lực trong 48 giờ và thông báo tặng ngay 50 điểm thưởng Paw Points để khuyến khích khách hàng kích hoạt tài khoản. Quy trình chính thức hoàn tất khi khách hàng nhấn vào liên kết, thiết lập mật khẩu, toàn bộ lịch sử đặt lịch và đơn hàng sẽ tự động hiển thị trong tài khoản mới, không cần nhập lại bất cứ thông tin nào.
Ngoài ra, trong trường hợp khách hàng trực tiếp đến cơ sở, Admin có thể hỗ trợ thực hiện quy trình đăng ký nhanh tại quầy chỉ với Họ tên và Số điện thoại để giúp khách hàng sở hữu tài khoản định danh ngay lập tức. Sau đó, Pawpal tự động gửi đường dẫn thiết lập mật khẩu về điện thoại khách hàng để họ hoàn tất kích hoạt khi thuận tiện.
Quy tắc nghiệp vụ 
Mỗi số điện thoại chỉ tương ứng với một tài khoản duy nhất trên Pawpal, và phải đúng định dạng nhà mạng Việt Nam.
Mã OTP có hiệu lực trong 5 phút để xác nhận số điện thoại là của khách hàng. Nếu mã hết hạn, khách hàng có thể yêu cầu gửi lại dễ dàng.
Tài khoản tạm được hệ thống tự động khởi tạo ngay khi khách hàng vãng lai nhấn Xác nhận đặt lịch/mua hàng.
Đường dẫn thiết lập mật khẩu được gửi qua SMS Gateway có thời hạn sử dụng tối đa là 48 giờ.
Sau khi nhập SĐT, khách hàng được cấp quyền truy cập ngay dưới dạng tài khoản chưa kích hoạt hoàn toàn để trải nghiệm dịch vụ.
Hệ thống bắt buộc khách hàng phải thiết lập mật khẩu trước khi có thể thực hiện quy trình Đổi điểm thưởng hoặc Thay đổi lịch, Hủy lịch hẹn. 
Sau khi thiết lập mật khẩu, khách hàng mở khóa toàn bộ tính năng đổi điểm Paw Points, quản lý lịch hẹn, và xem nhật ký chăm sóc của thú cưng
Admin có quyền tạo tài khoản cho khách chỉ với Họ tên và SĐT, quy trình gửi link xác thực mật khẩu diễn ra tương tự đăng ký trực tuyến.
Tình huống ngoại lệ
Pawpal từ chối đăng ký và hiển thị thông báo lỗi: "Số điện thoại đã tồn tại. Vui lòng đăng nhập hoặc khôi phục mật khẩu!" và hướng khách hàng đến trang đăng nhập hoặc khôi phục mật khẩu.
Nếu SMS không đến sau vài phút, Pawpal cho phép gửi lại tối đa 3 lần. Nếu vẫn không thành công, hệ thống hiển thị thông báo "Dịch vụ xác nhận đang tạm gián đoạn, vui lòng thử lại sau" và ghi nhận để đội kỹ thuật xử lý.
Khi khách hàng nhấn vào link sau 48 giờ, hệ thống hiển thị thông báo lỗi "Liên kết đã hết hiệu lực" và cung cấp nút "Gửi lại link xác thực mới" để bảo mật lại từ đầu.
Hệ thống kiểm tra ngay tại bước nhập liệu, nếu không đủ 10 chữ số hoặc đầu số không hợp lệ sẽ hiển thị cảnh báo đỏ
Sau 48 giờ nếu khách vãng lai không kích hoạt, "Tài khoản tạm" vẫn tồn tại để lưu trữ lịch sử giao dịch nhưng các tính năng như Đổi điểm thưởng, quản lý lịch hẹn, xem nhật ký chăm sóc sẽ bị khóa
Nếu OTP sai thì người dùng chọn “Gửi lại mã” và mã OTP mới sẽ được gửi về số điện thoại
3.1.2. Quy trình đăng nhập và bảo mật
Mô tả quy trình 
Quy trình đăng nhập bắt đầu khi người dùng chọn chức năng “Đăng nhập” trên giao diện Pawpal. Tại đây, người dùng thực hiện nhập Số điện thoại, Pawpal nhận diện loại tài khoản và hướng dẫn bước tiếp theo phù hợp. 
Đối với Thành viên chính thức Pawpal yêu cầu Mật khẩu cá nhân, sau đó nhấn nút “Đăng nhập” để gửi yêu cầu truy cập. Nếu quên mật khẩu, khách hàng chọn "Quên mật khẩu" và nhập lại số điện thoại, Pawpal gửi ngay một OTP định danh về số điện thoại để đảm bảo tài khoản thuộc về đúng chủ nhân. Sau khi nhập mã thành công,  Pawpal đưa người dùng đến trang thiết lập mật khẩu mới, sau khi tạo mật khẩu thành công, khách hàng đăng nhập bình thường. 
Đối với Khách vãng lai có tài khoản tạm chưa có mật khẩu, Pawpal sẽ điều hướng người dùng đến trang Thiết lập mật khẩu. Tại biểu mẫu bắt buộc này, người dùng phải thiết lập mật khẩu cá nhân để mở khóa lại lịch sử giao dịch và bảo vệ quyền riêng tư cho tài khoản, khách hàng bắt buộc phải thực hiện đồng thời hai thao tác Thiết lập mật khẩu cá nhân mới và Tick chọn đồng ý với Chính sách & Điều khoản vận hành của cửa hàng. Giao diện khóa hoàn toàn mọi tính năng ẩn hoặc nút bấm bỏ qua, nút "Xác nhận kích hoạt" chỉ chuyển sang trạng thái khả dụng khi cả hai điều kiện trên được thỏa mãn hoàn toàn. Sau khi người dùng nhấn xác nhận thành công, Pawpal mới chính thức chuyển đổi tài khoản tạm sang tài khoản thành viên chính thức và điều hướng về trang cá nhân.
Trong trường hợp Pawpal không tìm thấy số điện thoại tương ứng, Pawpal hiển thị thông báo lỗi và hướng người dùng về trang Đăng ký.
Sau khi đăng nhập thành công, Pawpal điều hướng về trang cá nhân và chào mừng khách hàng. Nếu khách hàng trước đây từng sử dụng dịch vụ với tư cách vãng lai, toàn bộ lịch sử được gộp tự động vào tài khoản, không có gì bị mất.
Nhằm tăng cường tính an toàn cho tài khoản, trong quá trình sử dụng, người dùng có thể truy cập vào mục “Cấu hình tài khoản” để thay đổi mật khẩu hoặc cập nhật các lớp bảo mật nâng cao. Để bảo vệ tài khoản, Pawpal bắt buộc yêu cầu xác nhận mật khẩu cũ hoặc người dùng chọn “Quên mật khẩu” và nhập SĐT, Pawpal sẽ gửi ngay mã OTP định danh để thiết lập mật khẩu mới để đảm bảo thao tác do chính chủ thực hiện trước khi cập nhật dữ liệu mới vào CSDL. 
Quy trình kết thúc khi người dùng truy cập thành công vào hệ thống hoặc sau khi hệ thống hiển thị các thông báo lỗi yêu cầu người dùng xử lý lại.
Quy tắc nghiệp vụ 
Hệ thống sử dụng số điện thoại là khóa chính duy nhất để định danh tài khoản người dùng trong cơ sở dữ liệu.
Mật khẩu phải có độ dài tối thiểu 8 ký tự, bao gồm ít nhất một chữ số và một ký tự đặc biệt
Mã xác thực OTP được gửi qua hệ thống SMS Gateway có thời gian hiệu lực tối đa là 05 phút kể từ thời điểm phát sinh.
Khách hàng bắt buộc phải hoàn tất bước thiết lập mật khẩu cá nhân mới có quyền truy cập vào các tính năng như Đổi điểm thưởng Paw Points, Quản lý lịch hẹn, Thay đổi thông tin thanh toán.
Nhật ký chăm sóc chỉ hiển thị sau khi đăng nhập, đảm bảo thông tin của bé cưng được bảo mật.
Tình huống ngoại lệ
Hệ thống gửi cảnh báo "Phát hiện đăng nhập bất thường" qua tin nhắn để khách hàng chủ động kiểm tra và thực hiện đổi mật khẩu nếu cần.
Trong trường hợp Pawpal không tìm thấy số điện thoại tương ứng, Pawpal hiển thị thông báo lỗi và hướng người dùng về trang Đăng ký.
3.1.3. Quản lý hồ sơ bé cưng
Mô tả quy trình 
Quy trình quản lý hồ sơ bé cưng khởi đầu sau khi người dùng đăng nhập thành công và truy cập vào mục "Hồ sơ bé cưng" trên Trang chủ. Tại giao diện này, Pawpal cho phép người dùng khởi tạo và duy trì Pet ID cho các bé cưng của mình thông qua các thao tác cụ thể
Trường hợp thêm mới hồ sơ, người dùng thực hiện cung cấp các thông tin định danh cơ bản bao gồm Tên bé cưng, Giống loài, Cân nặng, Ảnh đại diện và đặc biệt là các thông tin nhạy cảm về y tế như tiền sử bệnh lý, dị ứng hoặc thói quen sinh hoạt. Sau khi nhấn nút “Lưu hồ sơ”, khởi tạo một mã định danh Pet ID duy nhất hiển thị trên giao diện người dùng
Trường hợp cập nhật thông tin, người dùng chọn một hồ sơ hiện có để thay đổi các thông tin hoặc cập nhật ảnh mới. Pawpal sẽ ghi nhận phiên bản cập nhật mới nhất để đảm bảo dữ liệu luôn khớp với tình trạng thực tế của thú cưng tại thời điểm sử dụng dịch vụ.
Ngay khi hồ sơ được xác lập, toàn bộ lịch sử từ lúc bé “Đã tiếp nhận” cho đến lúc hoàn thành sẽ được lưu trữ trong Nhật ký chăm sóc. Trong quá trình bé cưng lưu trú hoặc làm đẹp tại cửa hàng, các luồng dữ liệu hình ảnh sẽ được hệ thống gán trực tiếp vào mã Pet ID tương ứng, cho phép khách hàng giám sát thông tin một cách xuyên suốt. Khách hàng và Admin đều có quyền cập nhật các chỉ số sinh hoạt cho thú cưng để đảm bảo dữ liệu luôn khớp với tình trạng thực tế tại mỗi thời điểm sử dụng dịch vụ.
Quy trình kết thúc khi thông tin hồ sơ được lưu trữ thành công vào hệ thống hoặc sau khi khách hàng nhận được thông báo xác nhận cập nhật Pet ID hoàn tất.
Quy tắc nghiệp vụ 
Mỗi Pet ID phải thuộc sở hữu của một tài khoản khách hàng duy nhất, một khách hàng có quyền tạo không giới hạn số lượng Pet ID và ẩn hồ sơ khỏi trang.
Các trường thông tin gồm Tên, Giống loài và Cân nặng là bắt buộc phải hoàn thiện để hệ thống có cơ sở tính toán đơn giá dịch vụ chính xác trong quy trình Đặt lịch.
Thông tin về "Dị ứng" và "Lưu ý đặc biệt" phải luôn được làm nổi bật trên giao diện của hệ thống chăm sóc.
Mỗi Pet ID sẽ được hệ thống tự động gán một lịch sử chăm sóc riêng biệt, không được phép gộp chung nhật ký giữa các bé thú cưng khác nhau.
Ảnh đại diện của Pet ID phải là ảnh thực tế và được khuyến khích cập nhật mới mỗi khi bé có sự thay đổi lớn về ngoại hình
Mọi lịch sử dịch vụ, hình ảnh từ Nhật ký chăm sóc và hóa đơn mua sắm liên quan đều phải được gán theo mã Pet ID để phục vụ việc phân tích xu hướng sức khỏe vật nuôi lâu dài.
Tình huống ngoại lệ
Hệ thống không xóa vĩnh viễn ngay mà đưa vào "Kho lưu trữ hồ sơ" trong 30 ngày. Khách hàng có thể tự khôi phục lại dữ liệu bé cưng trong thời gian này.
Hệ thống hiển thị thông báo "Dung lượng ảnh vượt quá 5MB" hoặc "Định dạng không hỗ trợ" và khóa nút lưu cho đến khi người dùng điều chỉnh lại.
Nếu khách hàng chọn một Pet ID thiếu thông tin để đặt dịch vụ, hệ thống sẽ tự động điều hướng về trang chỉnh sửa hồ sơ kèm thông báo: "Vui lòng cập nhật thông tin bé cưng".
Pawpal yêu cầu người dùng thêm một số điểm phân biệt như màu lông, màu mắt nếu phát hiện tên thú cưng mới trùng với tên thú cưng đã có trong cùng một tài khoản khách hàng.
Trường hợp thông tin Pet ID bị khách hàng khai báo sai, Admin có quyền hiệu chỉnh lại dữ liệu dưới sự xác nhận của khách hàng ngay tại thời điểm tiếp nhận dịch vụ.
3.1.4. Đặt lịch hẹn
Mô tả quy trình 
Bản mới viết theo quy trình 4 bước ở trên giao diện:
Quy trình đặt lịch hẹn trực tuyến trên hệ thống Pawpal trải qua quy trình 4 bước. Ngay khi người dùng nhấn nút "Đặt lịch ngay" trên giao diện Trang chủ hoặc mục Dịch vụ, Pawpal sẽ điều hướng khách hàng đến “Bước 01: Thông tin bé”.
Nếu là tài khoản thành viên, Pawpal hiển thị màn hình "Thông tin bé" dưới với các trường thông tin bắt buộc đã được điền sẵn theo Pet ID khởi tạo trước đó. Trong trường hợp Khách vãng lai đã có Tài khoản tạm hoặc đặt lịch lần đầu, Pawpal hiển thị màn hình "Thông tin bé" và yêu cầu người dùng nhập đầy đủ các trường thông tin bắt buộc bao gồm Họ tên, Số điện thoại, thông tin cơ bản của bé cưng. Khách hàng không cần gián đoạn để tạo tài khoản, giao dịch được ưu tiên hoàn tất trước. Nút "Tiếp tục" chỉ sáng lên khi các dữ liệu đầu vào hoàn toàn hợp lệ. 
Sau khi hoàn tất thông tin bé cưng, khách hàng bấm chuyển sang “Bước 02: Chọn dịch vụ”. Dựa trên chỉ số cân nặng và giống loài đã ghi nhận từ Bước 1, Pawpal tự động truy xuất ma trận giá niêm yết từ hệ thống để thực hiện cơ chế áp giá động. Lúc này, giao diện hiển thị các thẻ dịch vụ với mức giá chính xác tương ứng với hạng cân của bé. 
Khi khách hàng chọn gói dịch vụ mong muốn, thẻ đó sẽ đổi màu viền và mở khóa cho phép chuyển tiếp sang “Bước 03: Chọn lịch & Nhân viên”. Tại đây, bảng lịch sẽ hiển thị các ô giờ trống theo thời gian thực và danh sách nhân viên. Khách hàng có thể tùy chọn đích danh nhân viên yêu thích hoặc chọn phân bổ ngẫu nhiên. Ngay khi người dùng nhấp chuột vào một ô giờ và nhân viên cụ thể, một dải băng đếm ok ngược "Giữ chỗ tạm thời" trong vòng 15 phút. Ô lịch này sẽ chuyển sang màu xám và bị khóa đối với tất cả người dùng khác trên hệ thống. 
Bước cuối cùng trong tiến trình đặt lịch là “Bước 04: Xác nhận”, Pawpal hiển thị một tờ hóa đơn chi tiết dịch vụ và chi phí trên giao diện. Vì Pawpal áp dụng chính sách không thu bất kỳ khoản phí đặt cọc nào trước, trường dữ liệu "Chi phí đặt cọc" sẽ được hiển thị in đậm nổi bật với con số 0 VNĐ. Nhằm đảm bảo tính minh bạch và tránh các hiểu lầm về mặt tài chính, một dòng thông báo cảnh báo sẽ được chèn ngay dưới tổng tiền, nhắc nhở khách hàng rằng mức giá hiện tại chỉ là dự kiến dựa trên số cân nặng tự khai báo và nhân viên sẽ tiến hành cân lại thực tế tại quầy để áp giá chuẩn nhất theo quy định. Khi khách hàng bấm nút "Xác nhận đặt lịch", nút này sẽ lập tức chuyển sang trạng thái khóa mờ và hiển thị icon Loading Spinner. Pawpal hiển thị một hiệu ứng chúc mừng, mã đặt lịch được cấp, đồng thời thông tin cuộc hẹn tự động đồng bộ lên mục "Lịch hẹn của bé" trên Dashboard cá nhân và lịch vận hành chung của cửa hàng. 
Sau khi giao dịch hoàn tất, đối với Khách hàng vãng lai, Pawpal sẽ gửi một tin nhắn SMS với nội dung chào mừng, kèm theo đường dẫn thiết lập mật khẩu có hiệu lực trong 48 giờ và thông báo tặng ngay 50 điểm thưởng Paw Points để khuyến khích khách hàng kích hoạt tài khoản.
Quy tắc nghiệp vụ
Trạng thái "Giữ chỗ tạm thời" bắt đầu ngay từ thời điểm khách hàng nhấn chọn vào ô lịch và nhân viên
Khách hàng phải đặt lịch trước ít nhất 2 tiếng so với thời điểm dịch vụ bắt đầu.
Nếu khách đóng trình duyệt và quay lại trong vòng 15 phút, ô lịch đã chọn vẫn hiển thị trạng thái đang chờ riêng cho họ.
Hệ thống không thu bất kỳ khoản phí đặt cọc nào. Tổng giá trị đơn hàng sẽ được thanh toán trực tiếp tại cửa hàng sau khi hoàn thành dịch vụ
Tài khoản tạm chỉ được khởi tạo chính thức sau khi nút "Xác nhận đặt lịch" được nhấn thành công.
Mỗi khách hàng chỉ được phép giữ chỗ tối đa 1 ô lịch tại một thời điểm để tránh hành vi đầu cơ khung giờ đẹp
Hệ thống chỉ hiển thị các khung thời gian dựa trên công suất thực tế của nhân viên và thiết bị tại cửa hàng.
Đơn giá dịch vụ được hệ thống tự động tính toán dựa trên bảng giá niêm yết cộng với các hệ số phụ thu theo cân nặng/giống loài từ Pet ID.
Lịch hẹn chỉ có giá trị thực hiện khi chuyển sang trạng thái "Đã xác nhận" bởi hệ thống
Khách hàng có thể dùng số điện thoại khác số điện thoại đăng ký để đặt lịch
Tình huống ngoại lệ
Sau 15 phút nếu khách không nhấn "Xác nhận đặt lịch", hệ thống tự động xóa dữ liệu tạm và mở lại ô lịch đó trên bản đồ giờ trống.
Trường hợp hai người cùng bấm vào một ô lịch ở cùng một mili giây, hệ thống sẽ ưu tiên yêu cầu gửi đến máy chủ trước và báo lỗi "Khung giờ này vừa được đặt" cho người còn lại.
Nếu SĐT không hợp lệ, hệ thống sẽ không thể khởi tạo tài khoản tạm và gửi SMS. Khách hàng phải điều chỉnh thông tin hợp lệ mới có thể nhấn "Xác nhận đặt lịch"
Sau 15 phút, hệ thống tự giải phóng slot mà không cần bất kỳ thao tác nào từ phía người dùng hay Admin.
Nếu khách hàng chọn khung giờ vừa mới trôi qua thời gian thực, hệ thống báo lỗi "Thời gian không hợp lệ" và tự động làm mới lại bảng giờ trống.
Hệ thống yêu cầu khách hàng cập nhật nhanh thông tin tại bước chọn Pet rồi mới cho phép đi tiếp.
3.1.5. Thay đổi lịch hẹn
Mô tả quy trình 
Quy trình thay đổi lịch hẹn trực tuyến trên hệ thống Pawpal được kích hoạt từ hai cổng tiếp cận linh hoạt trên giao diện, cổng thứ nhất dành riêng cho Khách hàng thành viên thông qua phân mục “Lịch hẹn chăm sóc” tại trang cá nhân, cổng thứ hai là tính năng “Tra cứu dịch vụ” hiển thị công khai ngay trên Trang chủ, hỗ trợ khách hàng vãng lai chỉ cần nhập số điện thoại là có thể tra cứu toàn bộ danh sách đơn hàng và lịch hẹn đã đặt. 
Đối với Khách hàng thành viên, người dùng truy cập trực tiếp vào phân mục “Lịch hẹn chăm sóc” tại Dashboard trang cá nhân của mình. Khi thành viên tìm đến một lịch hẹn có trạng thái "Đã xác nhận" và nhấn nút "Thay đổi lịch" với điều kiện thời gian cách giờ bắt đầu dịch vụ tối thiểu 2 tiếng, Pawpal điều hướng thẳng người dùng đến màn hình “Chọn lịch mới" mà không cần yêu cầu xác thực thêm bất kỳ bước nào.
Đối với Khách hàng vãng lai, Pawpal cung cấp tính năng “Tra cứu dịch vụ” hiển thị công khai ngay trên Trang chủ. Khách hàng chỉ cần nhập số điện thoại và Pawpal sẽ hiển thị danh sách đơn hàng, lịch hẹn của họ ngay trên giao diện tra cứu. Khi khách hàng chọn một lịch hẹn có trạng thái "Đã xác nhận và nhấn nút "Thay đổi lịch", PawPal sẽ lập tức gửi một mã OTP về số điện thoại để đảm bảo tài khoản thuộc về đúng chủ nhân. Sau khi nhập mã thành công, Pawpal hiển thị giao diện chứa 2 lựa chọn hành động là Thiết lập mật khẩu hoặc Liên hệ Hotline. Nếu khách hàng chọn Thiết lập mật khẩu, Pawpal dẫn vào giao diện trang tạo mật khẩu mới và tích chọn đồng ý với chính sách của cửa hàng. Khi hoàn tất, tài khoản tạm được nâng cấp thành thành viên chính thức và hệ thống tự động mở màn hình “Chọn lịch mới". Nếu khách hàng không muốn tạo tài khoản mật khẩu trên Pawpal, họ bắt buộc phải chọn Liên hệ Hotline để lấy số cửa hàng và gọi điện cho nhân viên hỗ trợ điều chỉnh thủ công trên hệ thống nội bộ.
Tại màn hình “Chọn lịch mới". Tại đây, Pawpal hiển thị các khung giờ trống theo thời gian thực và danh sách nhân viên chăm sóc đang sẵn sàng. Tương tự như quy trình đặt lịch ban đầu, ngay khi khách hàng nhấn chọn vào một ô lịch mới, màn hình sẽ hiển thị đồng hồ đếm ngược "Giữ chỗ tạm thời" cho khung giờ đó trong vòng 15 phút và chuyển trạng thái ô lịch sang "Đang chờ". Đồng thời, Pawpal vẫn giữ nguyên trạng thái ô lịch cũ của khách hàng cho đến khi thao tác thay đổi được xác nhận thành công.
Sau khi chọn giờ và nhân viên mới, khách hàng tiến hành kiểm tra lại thông tin tại màn hình xác nhận. Nếu có sự chênh lệch về giá, Pawpal sẽ hiển thị bảng kê chi tiết số tiền cần bù hoặc số tiền dư ra để minh bạch giá cả. Sau đó, khách hàng nhấn "Xác nhận thay đổi" tại màn hình “Xác nhận thông tin dịch vụ”". Ngay lập tức, Pawpal gửi một OTP về số điện thoại để đảm bảo tài khoản thuộc về đúng chủ nhân, sau khi nhập mã thành công Pawpal sẽ hiển thị trên màn hình chuyển trạng thái lịch hẹn mới thành "Đã xác nhận". Đồng thời, Pawpal lập tức giải phóng ô lịch cũ, người dùng sẽ thấy ô lịch chuyển về trạng thái "Trống" cho người dùng khác.
Quy trình hoàn tất khi khách hàng nhấn nút "Xác nhận thay đổi", hệ thống hiển thị thông báo "Thay đổi lịch hẹn thành công" và thông tin được đồng bộ lên lịch vận hành của cửa hàng. 
Quy tắc nghiệp vụ 
Khách hàng chỉ được phép thay đổi lịch hẹn trước giờ bắt đầu dịch vụ tối thiểu 2 tiếng.
Ô lịch mới được khách hàng chọn sẽ được khóa tạm thời trong 15 phút. Nếu khách hàng thoát trang hoặc không xác nhận trong thời gian này, ô lịch mới sẽ bị giải phóng và lịch hẹn cũ vẫn được giữ nguyên.
Khung giờ ban đầu sẽ chỉ được giải phóng trên hệ thống sau khi việc thay đổi lịch hẹn mới đã được xác nhận thành công.
Mỗi lịch hẹn chỉ được phép thay đổi trực tuyến tối đa 02 lần. Sau giới hạn này, nút "Thay đổi" sẽ bị ẩn và khách hàng bắt buộc phải liên hệ Hotline để được Admin hỗ trợ thủ công.
Khách hàng không được phép thay đổi loại dịch vụ chính từ Spa sang Hotel trong quy trình này. Mọi thay đổi về loại dịch vụ bắt buộc phải thực hiện thông qua quy trình Hủy lịch và Đặt lịch mới.
Đối với tài khoản tạm, hệ thống yêu cầu khách hàng phải thiết lập mật khẩu mới có quyền thao tác thay đổi lịch hẹn trên hệ thống.
Mọi thao tác thay đổi lịch phải ghi nhận rõ ID người thực hiện, thời gian thay đổi vào nhật ký hệ thống.
Tính năng "Tra cứu dịch vụ" ngoài Trang chủ chỉ áp dụng cho Khách hàng vãng lai tra cứu bằng SĐT. Khách hàng thành viên phải đăng nhập để xem và quản lý lịch hẹn trong Dashboard cá nhân, hệ thống không hỗ trợ luồng tra cứu thành viên ngoài trang chủ.
Mỗi lịch hẹn chỉ được thay đổi trực tuyến tối đa 2 lần, từ lần thứ 3 bắt buộc khách hàng phải liên hệ Hotline.
Tình huống ngoại lệ
Nếu thời gian còn lại dưới 2 tiếng, nút "Thay đổi" sẽ bị vô hiệu hóa, hệ thống hiển thị thông báo "Đã quá thời gian tự thay đổi lịch tự động, vui lòng gọi Hotline để nhân viên hỗ trợ bạn trực tiếp".
Nếu bé cưng đã ở cửa hàng và trạng thái là "Đang thực hiện", chức năng thay đổi lịch trên website sẽ bị khóa hoàn toàn. Mọi thay đổi về thời gian đón bé phải trao đổi trực tiếp với Lễ tân.
Nếu khách hàng để máy chờ quá 15 phút mà không nhấn xác nhận, hệ thống sẽ tự động hủy lệnh thay đổi, giải phóng ô lịch mới và giữ nguyên lịch hẹn cũ cho khách hàng.
3.1.6. Hủy lịch
Mô tả quy trình
Quy trình hủy lịch trực tuyến trên hệ thống PawPal được kích hoạt từ hai cổng tiếp cận khác nhau trên giao diện. Cổng thứ nhất dành cho khách hàng thành viên thông qua phân mục “Lịch hẹn chăm sóc” tại trang cá nhân. Cổng thứ hai là tính năng “Tra cứu dịch vụ” hiển thị công khai trên Trang chủ, hỗ trợ khách hàng vãng lai chỉ cần nhập số điện thoại là có thể tra cứu toàn bộ danh sách lịch hẹn đã đặt.
Đối với khách hàng thành viên, khách hàng truy cập trực tiếp vào phân mục “Lịch hẹn chăm sóc” tại Trang cá nhân. Khi lựa chọn một lịch hẹn có trạng thái “Đã xác nhận” và vẫn còn trong thời gian cho phép hủy trực tuyến, khách hàng có thể nhấn nút “Hủy lịch hẹn” để bắt đầu quy trình. PawPal hiển thị cửa sổ xác nhận nhằm tránh thao tác nhầm. Nếu khách hàng đồng ý tiếp tục, hệ thống chuyển sang bước kiểm tra điều kiện hủy lịch.
Đối với khách hàng vãng lai, PawPal cung cấp tính năng “Tra cứu dịch vụ” hiển thị công khai trên Trang chủ. Khách hàng nhập số điện thoại đã sử dụng khi đặt lịch để tra cứu danh sách lịch hẹn tương ứng. Khi khách hàng lựa chọn một lịch hẹn có trạng thái “Đã xác nhận” và nhấn nút “Hủy lịch hẹn”, PawPal sẽ gửi một mã OTP đến số điện thoại đã đăng ký nhằm xác thực chủ sở hữu lịch hẹn. Sau khi nhập OTP thành công, PawPal hiển thị giao diện gồm hai lựa chọn gồm Thiết lập mật khẩu và Liên hệ Hotline. Nếu khách hàng chọn Thiết lập mật khẩu, hệ thống chuyển đến màn hình tạo mật khẩu mới và yêu cầu đồng ý với các điều khoản sử dụng. Sau khi hoàn tất, tài khoản tạm được nâng cấp thành tài khoản thành viên chính thức và khách hàng được phép tiếp tục thực hiện thao tác hủy lịch trực tuyến. Nếu khách hàng không muốn tạo tài khoản, khách hàng bắt buộc phải chọn Liên hệ Hotline để nhân viên cửa hàng hỗ trợ hủy lịch thủ công trên hệ thống nội bộ.
Sau khi hoàn tất bước xác thực và được cấp quyền thao tác, PawPal tiến hành kiểm tra điều kiện hủy lịch theo chính sách của cửa hàng. Nếu lịch hẹn vẫn còn trong thời gian cho phép hủy trực tuyến và chưa chuyển sang các trạng thái thực hiện dịch vụ, hệ thống cập nhật trạng thái lịch hẹn sang “Đã hủy”. Đồng thời, khung giờ tương ứng được giải phóng và tự động cập nhật trở lại lịch trống của cửa hàng để phục vụ các lượt đặt lịch khác. Ngay sau khi hủy thành công, PawPal gửi thông báo xác nhận trên website, Trung tâm thông báo và SMS đến khách hàng. Mặc dù lịch hẹn không còn hiệu lực, toàn bộ thông tin đặt lịch vẫn được lưu trong mục “Lịch sử lịch hẹn” với trạng thái “Đã hủy” nhằm phục vụ tra cứu, thống kê và đối soát dữ liệu sau này. Quy trình kết thúc khi trạng thái lịch hẹn được cập nhật thành công và dữ liệu được lưu vào lịch sử hệ thống.
Quy tắc nghiệp vụ
Khách hàng chỉ được phép tự hủy lịch hẹn trước giờ bắt đầu dịch vụ tối thiểu 2 tiếng.
Khi khách hàng hủy lịch vượt quá ngưỡng được cấu hình trong một khoảng thời gian nhất định (> 3 lần), PawPal sẽ tạm khóa chức năng đặt lịch trực tuyến của tài khoản đó và yêu cầu khách hàng liên hệ trực tiếp cửa hàng để được hỗ trợ đặt lịch.
Các lịch hẹn đã chuyển sang trạng thái “Đang thực hiện”, “Đã tiếp nhận” hoặc “Hoàn thành” sẽ không được phép hủy trực tiếp trên website.
Một lịch hẹn chỉ được phép hủy duy nhất một lần và không thể khôi phục sau khi xác nhận hủy thành công.
PawPal phải gửi thông báo xác nhận hủy lịch đến cả khách hàng và Admin ngay sau khi cập nhật trạng thái thành công.
Tình huống ngoại lệ
Nếu khách hàng thực hiện hủy lịch khi thời gian còn lại dưới 2 tiếng trước giờ hẹn, PawPal vô hiệu hóa nút “Hủy lịch”.
Trong trường hợp xảy ra lỗi đồng bộ dữ liệu khi cập nhật trạng thái lịch hẹn, PawPal khôi phục giao dịch và giữ nguyên trạng thái cũ.
Nếu khách hàng thoát trang hoặc mất kết nối internet trước khi xác nhận thao tác cuối cùng, PawPal sẽ không ghi nhận yêu cầu hủy lịch.
Nếu không thể truy cập CSDL Đặt lịch tại thời điểm xử lý, PawPal phải hiển thị thông báo: “PawPal đang bận, vui lòng thử lại sau.”
3.1.7. Mua sắm
Mô tả quy trình
Khi khách hàng truy cập vào trang "Cửa hàng" trên PawPal để tìm kiếm và lựa chọn các sản phẩm dành cho thú cưng như thức ăn, phụ kiện, đồ chơi, quần áo hoặc sản phẩm chăm sóc sức khỏe, PawPal sẽ hiển thị danh sách sản phẩm theo nhiều nhóm phân loại như danh mục, thương hiệu, sản phẩm bán chạy, khoảng giá và tình trạng còn hàng, giúp khách hàng dễ dàng tìm thấy sản phẩm phù hợp với nhu cầu của thú cưng. 
Trong quá trình mua sắm, khách hàng có thể sử dụng thanh tìm kiếm hoặc các bộ lọc để thu hẹp phạm vi lựa chọn. Khi nhập từ khóa tìm kiếm, PawPal hiển thị các sản phẩm phù hợp dựa trên tên sản phẩm, thương hiệu và các thông tin liên quan. Nếu không tìm thấy sản phẩm phù hợp, PawPal sẽ thông báo kết quả tìm kiếm không khả dụng và gợi ý một số sản phẩm tương tự hoặc sản phẩm nổi bật để khách hàng tiếp tục tham khảo. 
Khi lựa chọn một sản phẩm cụ thể, khách hàng được chuyển đến màn hình "Chi tiết sản phẩm" để xem đầy đủ thông tin như hình ảnh, mô tả, giá bán, số lượng còn lại trong kho, đánh giá từ khách hàng khác và các sản phẩm liên quan. Nếu sản phẩm đang tạm hết hàng, PawPal hiển thị trạng thái "Tạm hết hàng" và không cho phép thêm sản phẩm vào giỏ hàng.
Trong trường hợp muốn lưu lại sản phẩm để xem hoặc mua sau, khách hàng có thể sử dụng chức năng "Danh sách yêu thích". Chức năng này chỉ khả dụng đối với khách hàng đã đăng nhập tài khoản. Khi khách hàng nhấn biểu tượng yêu thích, PawPal sẽ lưu sản phẩm vào danh sách yêu thích cá nhân và đồng bộ trên các thiết bị. Đối với khách vãng lai, khi nhấn chức năng "Yêu thích", hệ thống sẽ hiển thị thông báo yêu cầu đăng nhập hoặc tạo tài khoản để sử dụng tính năng này.
Khi khách hàng chọn "Thêm vào giỏ hàng", PawPal kiểm tra số lượng tồn kho hiện tại. Nếu số lượng yêu cầu vượt quá mức tồn kho khả dụng, khách hàng sẽ nhận được thông báo điều chỉnh số lượng. Nếu sản phẩm còn đủ hàng, sản phẩm được thêm vào giỏ hàng cùng với các thông tin gồm tên sản phẩm, số lượng, đơn giá và giá trị tạm tính.
Tại màn hình "Giỏ hàng", khách hàng có thể thay đổi số lượng sản phẩm, xóa sản phẩm khỏi giỏ hàng hoặc áp dụng mã giảm giá nếu có. Sau mỗi thao tác, PawPal tự động cập nhật tổng giá trị đơn hàng để khách hàng dễ dàng theo dõi chi phí mua sắm. Đồng thời, tồn kho sản phẩm vẫn được kiểm tra định kỳ nhằm đảm bảo dữ liệu hiển thị luôn chính xác trước khi chuyển sang bước tiếp theo.
Đối với khách hàng đã đăng nhập, giỏ hàng được đồng bộ với tài khoản cá nhân; đối với khách vãng lai, dữ liệu được lưu tạm trong trình duyệt trong khoảng thời gian cho phép.
Sau khi hoàn tất việc lựa chọn sản phẩm và kiểm tra lại giỏ hàng, khách hàng nhấn "Tiến hành thanh toán" để chuyển sang quy trình thanh toán. PawPal tiến hành xử lý giao dịch theo phương thức thanh toán mà khách hàng lựa chọn và khởi tạo đơn hàng thành công khi các điều kiện thanh toán được đáp ứng. 
Sau khi đơn hàng được xác nhận, PawPal cập nhật trạng thái đơn hàng sang "Chờ xác nhận" và tiến hành kiểm tra đơn hàng, xác nhận tồn kho, chuẩn bị sản phẩm và đóng gói hàng hóa, sau đó tiến hành bàn giao cho đơn vị vận chuyển.
Sau khi đơn vị vận chuyển hoàn tất việc giao hàng đến địa chỉ nhận hàng, PawPal cập nhật trạng thái đơn hàng sang "Đã giao hàng" và gửi thông báo đến khách hàng. Tại thời điểm này, khách hàng có thể kiểm tra sản phẩm thực tế và sử dụng chức năng "Xác nhận đã nhận hàng" trên màn hình chi tiết đơn hàng.
Khi khách hàng xác nhận đã nhận hàng, PawPal cập nhật trạng thái đơn hàng sang "Hoàn thành", lưu đơn hàng vào lịch sử mua hàng và ghi nhận giao dịch kết thúc thành công. Đối với các đơn hàng thanh toán khi nhận hàng (COD), trạng thái thanh toán cũng được cập nhật sang "Đã thanh toán" sau khi đơn vị vận chuyển xác nhận đã thu tiền thành công.
Trong trường hợp khách hàng không thực hiện xác nhận trong thời gian quy định, PawPal sẽ tự động cập nhật trạng thái đơn hàng sang "Hoàn thành" sau 03 ngày kể từ thời điểm giao hàng thành công.
Sau khi đơn hàng chuyển sang trạng thái "Hoàn thành", quy trình mua sắm kết thúc.
Quy tắc nghiệp vụ
Mỗi sản phẩm phải được liên kết với dữ liệu tồn kho thực tế nhằm đảm bảo tính chính xác khi mua sắm.
Một sản phẩm hết hàng không được phép thêm mới vào giỏ hàng.
Danh sách yêu thích của khách hàng đã đăng nhập phải được đồng bộ đa thiết bị thông qua tài khoản cá nhân.
PawPal tự động cập nhật tổng giá trị đơn hàng sau mỗi thao tác thay đổi số lượng hoặc áp dụng mã giảm giá.
Dữ liệu giỏ hàng phải được lưu tạm để hỗ trợ khôi phục khi khách hàng quay lại website.
Tình huống ngoại lệ
Trong trường hợp sản phẩm vừa hết hàng khi khách đang thao tác trong giỏ hàng, PawPal hiển thị cảnh báo và yêu cầu khách cập nhật lại đơn hàng trước khi tiếp tục.
Nếu mã giảm giá không hợp lệ hoặc đã hết hạn, Pawpal giải thích rõ lý do (hết hạn, không đủ điều kiện) để khách hàng biết và không bị nhầm.
Khi hệ thống không thể truy cập CSDL Sản phẩm hoặc dữ liệu tồn kho, PawPal hiển thị thông báo: "Hệ thống đang bận, vui lòng thử lại sau."
Nếu khách hàng mất kết nối trong quá trình mua sắm, dữ liệu giỏ hàng chưa thanh toán phải được lưu tạm để tránh mất thông tin lựa chọn sản phẩm.
Trong trường hợp nhiều khách hàng cùng đặt mua một sản phẩm với số lượng giới hạn tại cùng thời điểm, PawPal ưu tiên người hoàn tất thao tác trước và cập nhật lại tồn kho theo thời gian thực nhằm tránh phát sinh đơn hàng vượt mức tồn kho.
3.1.8. Thanh toán
Quy trình thanh toán bắt đầu khi khách hàng hoàn tất việc lựa chọn sản phẩm trong "Giỏ hàng", và nhấn nút "Tiến hành thanh toán" trên trang chi tiết sản phẩm. Trước khi chuyển sang bước thanh toán, PawPal kiểm tra lại thông tin đơn hàng bao gồm danh sách sản phẩm, số lượng, giá bán hiện tại, mã giảm giá đã áp dụng và tình trạng còn hàng nhằm đảm bảo dữ liệu hiển thị cho khách hàng là chính xác nhất.
Sau khi thông tin đơn hàng hợp lệ, PawPal hiển thị màn hình "Thanh toán đơn hàng". Đối với khách hàng đã đăng nhập, các thông tin nhận hàng đã lưu trước đó như họ tên, số điện thoại và địa chỉ giao hàng sẽ được tự động điền để giúp rút ngắn thời gian thao tác. Đối với khách vãng lai, PawPal yêu cầu cung cấp các thông tin cần thiết trước khi tiếp tục thanh toán.
Khi hoàn tất thông tin giao hàng, khách hàng lựa chọn phương thức thanh toán phù hợp. PawPal hỗ trợ các hình thức thanh toán như thanh toán khi nhận hàng (COD) hoặc thanh toán trực tuyến thông qua các cổng thanh toán được tích hợp trên website.
Nếu khách hàng lựa chọn thanh toán khi nhận hàng (COD), PawPal sẽ xác nhận đơn hàng thành công và chuyển đơn hàng sang trạng thái chờ xử lý. Khách hàng có thể tiếp tục theo dõi tình trạng đơn hàng trong mục "Đơn hàng của tôi" cho đến khi đơn hàng được giao thành công.
Nếu khách hàng lựa chọn thanh toán trực tuyến, PawPal sẽ chuyển hướng người dùng đến cổng thanh toán tương ứng để hoàn tất giao dịch. Tại đây, khách hàng thực hiện các bước xác thực theo quy định của đơn vị thanh toán. Sau khi giao dịch hoàn tất, khách hàng sẽ được chuyển trở lại website PawPal để nhận kết quả thanh toán.
Trong trường hợp giao dịch thành công, PawPal hiển thị "Trang Kết quả giao dịch thành công" cùng các thông tin quan trọng như mã đơn hàng, trạng thái thanh toán, thông tin giao hàng và danh sách sản phẩm đã mua. Đồng thời, khách hàng sẽ nhận được thông báo xác nhận đơn hàng để thuận tiện cho việc theo dõi và tra cứu về sau.
Trong trường hợp giao dịch không thành công hoặc khách hàng hủy thao tác thanh toán giữa chừng, PawPal hiển thị "Trang Kết quả giao dịch thất bại" kèm thông báo nguyên nhân tương ứng (nếu có). Khách hàng có thể lựa chọn thực hiện thanh toán lại hoặc thay đổi phương thức thanh toán mà không cần tạo lại đơn hàng từ đầu.
Sau khi thanh toán thành công, đơn hàng được ghi nhận vào mục "Đơn hàng của tôi", nơi khách hàng có thể theo dõi trạng thái xử lý, tra cứu lịch sử thanh toán và xem lại thông tin giao dịch bất kỳ lúc nào. 
Quy tắc nghiệp vụ
Tồn kho và giá sẽ được kiểm tra lại ngay lúc khách hàng thanh toán để đảm bảo không có nhầm lẫn về giá hoặc hàng hết.
Khách hàng có thể chọn tất cả hoặc chọn từng sản phẩm trong giỏ hàng để thanh toán.
Một đơn hàng chỉ được phép tồn tại duy nhất một giao dịch thành công.
Chỉ cập nhật trạng thái "Đã thanh toán" khi nhận được tín hiệu xác nhận hợp lệ từ cổng thanh toán.
Trong trường hợp thanh toán online, hệ thống phải lưu mã giao dịch để phục vụ tra soát và xử lý khiếu nại.
Đơn hàng COD phải được đánh dấu trạng thái "Chờ thanh toán" cho đến khi hoàn tất giao hàng.
PawPal ghi nhận đầy đủ nhật ký giao dịch bao gồm thời gian thanh toán, IP truy cập, phương thức thanh toán và trạng thái xử lý.
Thông tin thanh toán của khách hàng phải được mã hóa và không lưu trữ trực tiếp dữ liệu nhạy cảm như mật khẩu ngân hàng hoặc mã CVV.
Tình huống ngoại lệ
Nếu sản phẩm trong giỏ hàng vừa hết hàng tại thời điểm thanh toán, PawPal hiển thị thông báo: "Một số sản phẩm đã hết hàng hoặc không đủ số lượng." và yêu cầu khách cập nhật lại đơn hàng.
Nếu mã giảm giá hết hạn trong lúc thanh toán, PawPal tự động loại bỏ ưu đãi và hiển thị thông báo giải thích rõ nguyên nhân.
Trong trường hợp khách hàng thanh toán online nhưng mất kết nối internet giữa chừng, PawPal phải giữ trạng thái giao dịch ở mức "Đang chờ xác minh" cho đến khi nhận phản hồi chính thức từ cổng thanh toán.
Nếu cổng thanh toán phản hồi lỗi hoặc timeout, hệ thống phải cập nhật trạng thái "Thanh toán thất bại" và cho phép người dùng thực hiện lại giao dịch.
Nếu nhấn thanh toán nhiều lần liên tiếp cho cùng một đơn hàng, Pawpal chỉ ghi nhận một giao dịch thành công duy nhất và hiển thị thông báo thanh toán thành công.
Nếu khách hàng thoát trang trước khi hoàn tất thanh toán, đơn hàng tạm thời phải được lưu trong thời gian cho phép để hỗ trợ khách tiếp tục thanh toán sau đó mà không cần tạo lại đơn hàng mới.
3.1.9. Quản lý đơn hàng
Mô tả quy trình
Quy trình quản lý đơn hàng bắt đầu sau khi khách hàng hoàn tất giao dịch mua sắm trên PawPal. Để theo dõi tình trạng xử lý đơn hàng, khách hàng có thể truy cập hệ thống thông qua hai hình thức khác nhau.
Đối với khách hàng thành viên đã đăng nhập, khách hàng truy cập mục "Đơn hàng của tôi" trong khu vực tài khoản cá nhân. PawPal tự động truy xuất toàn bộ các đơn hàng đã phát sinh theo tài khoản và hiển thị danh sách đơn hàng tương ứng.
Đối với khách hàng vãng lai, khách hàng có thể sử dụng chức năng "Tra cứu dịch vụ" được hiển thị công khai trên Trang chủ. Tại đây, khách hàng nhập số điện thoại đã sử dụng khi đặt hàng. PawPal tiến hành kiểm tra tính hợp lệ của dữ liệu và truy xuất danh sách đơn hàng tương ứng với số điện thoại đó.
Khi lựa chọn một đơn hàng cụ thể, khách hàng được chuyển đến màn hình "Chi tiết đơn hàng". Tại đây, PawPal hiển thị đầy đủ các thông tin liên quan như danh sách sản phẩm đã mua, số lượng, đơn giá, tổng tiền thanh toán, địa chỉ giao hàng, phương thức thanh toán và lịch sử thay đổi trạng thái đơn hàng. Đồng thời, khách hàng có thể theo dõi tiến trình xử lý thông qua các trạng thái như "Chờ xác nhận", "Đang chuẩn bị hàng", "Đang giao", "Đã giao hàng", "Hoàn thành", "Đã hủy" hoặc "Hoàn trả".
Trong quá trình sử dụng sản phẩm, nếu khách hàng phát sinh nhu cầu đổi trả hoặc các yêu cầu hậu mãi khác, trạng thái đơn hàng sẽ được cập nhật tương ứng và phản ánh trực tiếp trên màn hình chi tiết đơn hàng. Toàn bộ lịch sử thay đổi trạng thái đều được lưu trữ nhằm đảm bảo tính minh bạch và hỗ trợ công tác tra cứu khi cần thiết.
Sau khi đơn hàng chuyển sang trạng thái cuối cùng và dữ liệu được lưu vào lịch sử giao dịch, quy trình quản lý đơn hàng kết thúc.
Quy tắc nghiệp vụ
Mỗi đơn hàng phải được gắn một mã đơn hàng duy nhất để phục vụ tra cứu và quản lý.
Đối với đơn hàng COD, trạng thái thanh toán chỉ được chuyển sang "Đã thanh toán" khi nhân viên xác nhận giao hàng thành công và đã thu đủ tiền từ khách hàng. Sau đó đơn hàng mới được phép chuyển sang trạng thái "Hoàn thành". 
Hệ thống phải lưu toàn bộ lịch sử thay đổi trạng thái đơn hàng nhằm đảm bảo khả năng kiểm tra và đối soát dữ liệu.
Chỉ Admin hoặc nhân viên được phân quyền mới có quyền cập nhật trạng thái đơn hàng.
Khi đơn hàng được xác nhận xử lý, hệ thống phải khóa số lượng tồn kho tương ứng.
Các trạng thái đơn hàng phải tuân thủ đúng luồng xử lý nghiệp vụ và không được phép chuyển ngược bất hợp lệ (ví dụ: từ “Hoàn thành” quay về “Đang chuẩn bị hàng”).
Mọi thay đổi trạng thái đơn hàng phải kích hoạt cơ chế gửi thông báo đến khách hàng.
Đơn hàng hoàn thành phải được lưu trữ trong “Đơn hàng của tôi” để phục vụ tra cứu lâu dài và các chức năng hậu mãi.
Tình huống ngoại lệ
Nếu khách hàng nhập số điện thoại không tồn tại hoặc không hợp lệ tại chức năng “Tra cứu dịch vụ”, PawPal hiển thị thông báo: “Không tìm thấy đơn hàng phù hợp, vui lòng kiểm tra lại thông tin.” 
Trong trường hợp tồn kho không đủ khi Admin xác nhận đơn hàng, hệ thống phải hiển thị cảnh báo để nhân viên xử lý thủ công trước khi tiếp tục.
Nếu xảy ra lỗi đồng bộ trạng thái giữa hệ thống PawPal và đơn vị vận chuyển, trạng thái đơn hàng sẽ được chuyển sang “Cần kiểm tra” để tránh hiển thị sai dữ liệu cho khách hàng.
Nếu khách hàng mất kết nối internet trong lúc theo dõi đơn hàng, hệ thống phải tự động đồng bộ lại trạng thái mới nhất khi người dùng truy cập lại.
Khi đơn hàng bị hủy hoặc hoàn trả, hệ thống phải cập nhật đồng thời trạng thái đơn hàng và dữ liệu tồn kho nhằm đảm bảo tính nhất quán dữ liệu vận hành.
3.1.10. Quy trình hủy đơn hàng
Mô tả quy trình
Quy trình hủy đơn hàng được kích hoạt khi khách hàng không còn nhu cầu mua sản phẩm và muốn chấm dứt giao dịch trước khi đơn hàng được giao thành công.
Khách hàng có thể truy cập quy trình thông qua hai hình thức. Đối với khách hàng thành viên đã đăng nhập, khách hàng truy cập mục "Đơn hàng của tôi" để xem danh sách các đơn hàng đã đặt. Đối với khách hàng vãng lai, khách hàng có thể sử dụng chức năng "Tra cứu dịch vụ" trên Trang chủ bằng cách nhập số điện thoại đã sử dụng khi đặt hàng để tra cứu đơn hàng tương ứng.
Khi lựa chọn một đơn hàng cụ thể, khách hàng được chuyển đến màn hình "Chi tiết đơn hàng". Tại đây, PawPal hiển thị đầy đủ thông tin đơn hàng cùng trạng thái xử lý hiện tại. Nếu đơn hàng vẫn còn đủ điều kiện hủy, hệ thống hiển thị nút chức năng "Hủy đơn hàng".
Khi khách hàng nhấn nút "Hủy đơn hàng", PawPal hiển thị cửa sổ xác nhận nhằm tránh các thao tác nhầm lẫn. Khách hàng có thể lựa chọn xác nhận hủy hoặc quay lại để tiếp tục giữ nguyên đơn hàng. Sau khi khách hàng xác nhận yêu cầu hủy, PawPal kiểm tra trạng thái xử lý của đơn hàng. Nếu đơn hàng chưa được bàn giao cho đơn vị vận chuyển hoặc chưa chuyển sang trạng thái "Đang giao", hệ thống cập nhật trạng thái đơn hàng thành "Đã hủy". Ngay sau khi hủy thành công, PawPal gửi thông báo xác nhận đến khách hàng và đồng thời cập nhật lại số lượng tồn kho tương ứng của các sản phẩm trong đơn hàng nhằm đảm bảo dữ liệu vận hành chính xác.
Đối với các đơn hàng đã thanh toán trực tuyến, PawPal ghi nhận yêu cầu hoàn tiền và chuyển giao cho quy trình xử lý hoàn tiền theo chính sách của cửa hàng. Trạng thái hoàn tiền được theo dõi riêng và hiển thị trên màn hình chi tiết đơn hàng.
Mặc dù đơn hàng không còn hiệu lực mua bán, toàn bộ thông tin giao dịch vẫn được lưu trong khu vực lịch sử đơn hàng với trạng thái "Đã hủy" để phục vụ tra cứu và đối soát sau này. Sau khi trạng thái đơn hàng được cập nhật thành công và các dữ liệu liên quan được xử lý hoàn tất, quy trình hủy đơn hàng kết thúc.
Quy tắc nghiệp vụ
Khách hàng chỉ được phép hủy đơn hàng khi trạng thái đơn hàng là "Chờ xác nhận" hoặc "Đang chuẩn bị hàng".
Các đơn hàng đã chuyển sang trạng thái "Đang giao", "Đã giao hàng" hoặc "Hoàn thành" không được phép hủy trực tiếp trên website.
Mỗi đơn hàng chỉ được phép hủy một lần và không thể khôi phục sau khi xác nhận hủy thành công.
Khi đơn hàng bị hủy, hệ thống phải tự động hoàn trả số lượng tồn kho đã khóa trước đó.
Đối với đơn hàng thanh toán trực tuyến, hệ thống phải ghi nhận yêu cầu hoàn tiền và liên kết với quy trình hoàn tiền tương ứng.
Mọi thao tác hủy đơn hàng phải được ghi nhận vào nhật ký hệ thống bao gồm người thực hiện, thời gian thực hiện và lý do hủy (nếu có).
Đối với khách hàng vãng lai, hệ thống chỉ cho phép hủy đơn hàng khi khách hàng truy cập thông qua liên kết định danh trong SMS hoặc đã thiết lập mật khẩu tài khoản.
Tình huống ngoại lệ
Nếu đơn hàng đã được bàn giao cho đơn vị vận chuyển, PawPal vô hiệu hóa nút "Hủy đơn hàng" và hiển thị nút liên hệ cửa hàng để được hỗ trợ.
Nếu xảy ra lỗi khi cập nhật trạng thái đơn hàng hoặc hoàn trả tồn kho, hệ thống phải khôi phục giao dịch và giữ nguyên trạng thái đơn hàng ban đầu.
Nếu khách hàng mất kết nối internet hoặc đóng trình duyệt trước khi xác nhận thao tác cuối cùng, PawPal sẽ không ghi nhận yêu cầu hủy đơn hàng.
3.1.11. Quy trình đổi trả hàng
Mô tả quy trình
Pawpal hỗ trợ đổi trả sản phẩm vật lý trong vòng 7 ngày sau khi nhận hàng. Toàn bộ quy trình được thực hiện trực tuyến để khách hàng không cần đến cửa hàng.
Khách hàng vào "Đơn hàng của tôi" trên trang cá nhân. Các đơn hàng còn trong thời hạn đổi trả hiển thị nút "Yêu cầu đổi trả" ngay bên cạnh đơn nào hết hạn thì nút tự ẩn để tránh nhầm lẫn.
Khi khách hàng nhấn vào nút yêu cầu, Pawpal hiển thị form gồm: lựa chọn hình thức (đổi hàng mới hoặc hoàn tiền), lý do chi tiết và đính kèm ảnh/video thực tế của sản phẩm làm minh chứng. Sau khi gửi, Pawpal cấp ngay một mã phiếu hậu mãi để khách hàng theo dõi tiến độ tại "Đơn hàng của tôi" không cần liên hệ hỏi lại.
Khách hàng có thể theo dõi trạng thái phiếu theo thời gian thực: "Chờ kiểm duyệt", "Đã chấp nhận" hoặc "Cần bổ sung thông tin" trực tiếp tại “Đơn hàng của tôi”. Khi yêu cầu được chấp nhận, Pawpal hướng dẫn chi tiết cách đóng gói và địa chỉ gửi trả. Sau khi hàng trả về được xác nhận:
Đổi hàng: Pawpal tạo đơn hàng mới với giá trị 0đ khách hàng nhận hàng mà không cần thanh toán thêm (trừ trường hợp đổi sản phẩm giá cao hơn).
Hoàn tiền: Pawpal thông báo số tiền và phương thức hoàn trả về đúng tài khoản/ví ban đầu.
Quy trình kết thúc khi phiếu hậu mãi chuyển sang "Hoàn tất"; lúc này Pawpal tự động điều chỉnh lại toàn bộ điểm Paw Points phát sinh từ giao dịch đó, bao gồm cả điểm tích lũy mua sắm và điểm thưởng từ đánh giá (nếu có).     
Quy tắc nghiệp vụ
Chỉ áp dụng cho sản phẩm vật lý mua tại Shop (thức ăn, phụ kiện, đồ chơi...). Không áp dụng đổi trả đối với các dịch vụ đã thực hiện xong (Spa, Hotel).
Yêu cầu phải được gửi trong vòng 07 ngày kể từ ngày đơn hàng chuyển sang trạng thái "Hoàn thành". Quá thời hạn này, nút "Yêu cầu Đổi trả" sẽ tự động ẩn.
Sản phẩm trả về phải còn nguyên tem mác, bao bì đối với lỗi do khách hàng muốn đổi ý hoặc có hình ảnh minh chứng hư hỏng/sai lệch đối với lỗi do cửa hàng.
Hoàn lại 100% giá trị thực trả của sản phẩm sau khi trừ mã giảm giá.
Đổi sang sản phẩm tương đương hoặc cao hơn: Nếu sản phẩm mới có giá cao hơn, khách hàng bù thêm phần chênh lệch.
Khi phiếu hoàn tiền được xác nhận thành công, điểm tích lũy từ đơn hàng đó sẽ được điều chỉnh lại tương ứng.
Nếu lỗi do cửa hàng (giao sai, hàng hỏng), Pawpal chịu toàn bộ phí ship. Nếu khách hàng muốn đổi ý, khách hàng chịu phí gửi trả và nhận hàng mới.
Tình huống ngoại lệ
Nếu Sản phẩm cần đổi đã hết hàng trong kho thì Pawpal hiển thị cảnh báo cho Nhân viên. Nhân viên liên hệ khách hàng để chuyển sang phương án hoàn tiền hoặc đổi sang sản phẩm tương đương.
Hàng trả về thực tế không khớp với khai báo: Để giữ trải nghiệm thân thiện, hệ thống không tự động phạt khách. Phiếu đổi trả sẽ chuyển trạng thái sang "Cần hỗ trợ trực tiếp". Nhân viên CSKH sẽ gọi điện/nhắn tin hỗ trợ khách xử lý thủ công.
Hoàn tiền cho đơn hàng COD thì khách hàng có thể điền Số tài khoản ngân hàng/Số MoMo ngay trên Form đổi trả. Nếu khách không điền, nhân viên CSKH sẽ liên hệ trực tiếp qua điện thoại trong vòng 24 giờ để xin thông tin chuyển khoản và thực hiện hoàn tiền thủ công cho khách.
Sau khi hoàn tiền thành công, hệ thống tự động cấn trừ số điểm tích lũy của sản phẩm đó trong tài khoản khách (số dư điểm tối thiểu là 0, không bao giờ bị âm). Bài đánh giá cũ của sản phẩm (nếu có) được gắn nhãn "Giao dịch đã hủy".
Một khi khách hàng đã thực hiện gửi đánh giá cho sản phẩm hoặc dịch vụ, đơn hàng đó sẽ được coi là đã chấp nhận hoàn thành tuyệt đối và hệ thống sẽ tự động ẩn/khóa nút "Yêu cầu đổi trả" của đơn hàng đó nhằm ngăn chặn việc trục lợi điểm thưởng từ đánh giá.
Khách hàng vãng lai yêu cầu đổi trả: Khách hàng nhập Mã đơn hàng và Số điện thoại mua hàng mà không cần đăng nhập tài khoản. Hai thông tin này đã đủ để xác minh quyền sở hữu đơn hàng, đơn giản hơn cho khách lớn tuổi.
3.1.12. Đánh giá
Mô tả quy trình nghiệp vụ
Quy trình đánh giá được thiết kế để lắng nghe phản hồi thực tế của khách hàng về chất lượng sản phẩm và dịch vụ. Ngay khi một giao dịch mua hàng hoặc dịch vụ Spa/Hotel chuyển sang trạng thái "Hoàn thành", Pawpal tự động gửi thông báo đến tài khoản khách hàng kèm đường dẫn trực tiếp đến form phản hồi. Khách hàng có thể chủ động vào "Lịch hẹn cho bé" (đối với dịch vụ) hoặc "Đơn hàng của tôi" (đối với sản phẩm Shop) trên trang cá nhân. Tại đây, khách hàng thấy danh sách các giao dịch đã hoàn thành nhưng chưa được đánh giá, kèm nút "Viết đánh giá" ngay bên cạnh.
Khi khách hàng nhấn vào thông báo hoặc chọn giao dịch từ danh sách, Pawpal hiển thị chính xác tên sản phẩm và hình ảnh minh họa hoặc tên dịch vụ tương ứng mà khách hàng không cần tự tìm lại. 
Sau khi xác thực, khách hàng thấy form đánh giá gồm: chọn số sao từ 1 đến 5, viết nhận xét và tùy chọn đính kèm ảnh hoặc video thực tế. Khi khách hàng hoàn tất điền form và nhấn "Gửi đánh giá", hệ thống kiểm tra tính hợp lệ của đánh giá và lưu đánh giá vào cơ sở dữ liệu.
Ngay sau khi lưu thành công, Tất cả đánh giá sẽ được công khai ngay trên trang sản phẩm/dịch vụ tương ứng. Với các đánh giá dưới 4 sao được gán nhãn “Đang chờ hỗ trợ” để Pawpal chủ động kích hoạt các bước hậu mãi bảo vệ quyền lợi khách hàng. Ngay sau đó, Pawpal cộng điểm thưởng Paw Points vào tài khoản như lời cảm ơn chân thành, chính thức kết thúc quy trình đánh giá.
Quy tắc nghiệp vụ
Khách hàng chỉ thấy nút "Viết đánh giá" sau khi đã nhận hàng hoặc Check-out và thanh toán đầy đủ đảm bảo phản hồi dựa trên trải nghiệm thực tế.
Mỗi đơn hàng hoặc lịch hẹn chỉ được đánh giá một lần để đảm bảo tính khách quan.
Khách hàng cần chọn số sao; phần nhận xét và hình ảnh là tùy chọn linh hoạt theo mức độ muốn chia sẻ.
Tất cả đánh giá qua quy trình này được gắn nhãn tự động, giúp cộng đồng tin tưởng vào độ xác thực.
Hệ thống áp dụng cơ chế cộng điểm Paw Points theo chất lượng đánh giá nhằm khuyến khích khách hàng phản hồi chân thật: Đánh giá tiêu chuẩn (chỉ có số sao và chữ nhận xét) được cộng +1 Paw Point; Đánh giá chất lượng cao (có đính kèm hình ảnh hoặc video thực tế) được cộng +5 Paw Points. Điểm được tự động cộng vào ví tài khoản ngay sau khi khách hàng nhấn nút "Gửi đánh giá" thành công.
Pawpal tự động phát hiện và ẩn các đánh giá chứa từ ngữ xúc phạm hoặc vi phạm tiêu chuẩn cộng đồng thông qua bộ lọc từ khóa tích hợp.
Tình huống ngoại lệ
Người dùng cố tình truy cập đánh giá của người khác thì Pawpal kiểm tra quyền truy cập và thông báo rõ ràng, sau đó hướng khách hàng về trang cá nhân của mình.
Với giao dịch đã được đánh giá trước đó nút "Viết đánh giá" và thay bằng nhãn "Đã đánh giá" để khách hàng biết ngay mà không bị nhầm lẫn. Nếu truy cập bằng link trực tiếp, Pawpal hiển thị thông báo "Giao dịch này đã hoàn tất phản hồi".
Nếu tệp quá dung lượng hoặc sai định dạng, Pawpal báo ngay lý do như sai định dạng hoặc quá dung lượng cho phép chọn lại mà không mất nội dung đã nhập.
Mất kết nối mạng khi đang gửi thì Pawpal sẽ lưu tạm nội dung và thông báo đang thử kết nối lại khách hàng không cần nhập lại từ đầu
Người dùng nhấn "Hủy" tại bước xác nhận cuối thì Form sẽ đóng lại, nội dung vẫn được giữ nguyên để khách hàng tiếp tục chỉnh sửa khi sẵn sàng.
3.1.13. Ưu đãi thành viên
Mô tả quy trình
Quy trình bắt đầu khi khách hàng chủ động vào trang "Ưu đãi & Thành viên" trên trang cá nhân. Ngay khi trang tải, Pawpal hiển thị chính xác số dư điểm Paw Points tích lũy và hạng thành viên hiện tại (Bạc, Vàng hoặc Kim Cương). Đồng thời, Pawpal lọc và hiển thị các mã giảm giá hoặc phần thưởng đang khả dụng và phù hợp với cấp bậc của khách hàng giúp khách hàng nắm bắt nhanh quyền lợi của mình và biết cần bao nhiêu điểm nữa để đổi được những ưu đãi mong muốn.
Khi khách hàng chọn một phần thưởng và nhấn "Đổi ưu đãi", Pawpal kiểm tra số dư điểm hiện có so với mức yêu cầu. Quy trình phân nhánh tại đây: nếu điểm chưa đủ, Pawpal thông báo "Số điểm hiện tại chưa đủ để đổi quà" kèm gợi ý các cách tích lũy thêm điểm qua mua sắm; nếu đủ điểm, Pawpal hiển thị cửa sổ xác nhận: "Bạn có chắc chắn muốn sử dụng [X] điểm để đổi lấy ưu đãi này không?". Bước xác nhận này giúp khách hàng kiểm tra kỹ trước khi điểm bị trừ vĩnh viễn.
Sau khi khách hàng nhấn "Xác nhận", Pawpal trừ điểm và đồng thời tạo một mã ưu đãi riêng gắn liền với tài khoản. Mã này xuất hiện ngay trong "Voucher của tôi" để khách hàng sử dụng trực tiếp tại bước thanh toán cho các đơn hàng tiếp theo. Quy trình kết thúc khi Pawpal hiển thị thông báo "Đổi quà thành công" kèm đầy đủ thông tin về thời hạn sử dụng và điều kiện áp dụng đảm bảo khách hàng luôn chủ động tận hưởng đặc quyền thành viên.
Quy tắc nghiệp vụ
Cứ 10.000 VNĐ hoá đơn = 1 Paw Point. Điểm chỉ được cộng khi giao dịch ở trạng thái “Hoàn thành”. Áp dụng cho cả dịch vụ và sản phẩm tại shop.
Bảng quy đổi điểm:

Paw Points
Ưu đãi nhận được
Ghi chú
50 điểm
Giảm 7.500 VNĐ
Tích được sau 2 lần dùng dịch vụ
100 điểm
Giảm 15.000 VNĐ
Tích được sau 4 lần dùng dịch vụ
300 điểm
Giảm 45.000 VNĐ
Tương đương 1 lần tắm cơ bản
500 điểm
Giảm 75.000 VNĐ
Tương dương 1 lần Gromming
1.000 điểm
Giảm 150.000 VNĐ
Tương đương 1 lần Spa tầm trung.


Ngoài tích điểm theo chi tiêu, khách hàng còn nhận được Paw Points từ các hoạt động sau: 

Hoạt động
Điểm thưởng
Đăng ký tài khoản lần đầu
+50 điểm
Viết đánh giá kèm hình ảnh thực tế
+5 điểm/lần
Sinh nhật thú cưng
+20 điểm/ năm
Giới thiệu bạn bè đăng ký thành công
+30 điểm/ người

Khi quy đổi, 1 Paw Point = 150 VNĐ, tương đương 1,5% trên tổng chi tiêu. Nghĩa là khi khách hàng có 30 điểm Paw Points, sẽ đổi được 30 x150 VNĐ = 4.500 VNĐ giảm giá.

Phân hạng thành viên:
Hạng Bạc (Silver): Tổng chi tiêu < 5.000.000 VNĐ.
Hạng Vàng (Gold): Tổng chi tiêu từ 5.000.000 - 15.000.000 VNĐ.
Hạng Kim cương (Diamond): Tổng chi tiêu > 15.000.000 VNĐ.
Khách hàng phải thiết lập mật khẩu để bảo vệ quyền lợi điểm thưởng trước khi thực hiện đổi quà.
Mỗi mã giảm giá chỉ được áp dụng cho 01 đơn hàng/dịch vụ duy nhất và không có giá trị quy đổi thành tiền mặt.
Điểm Paw Points có thời hạn sử dụng trong vòng 12 tháng kể từ ngày phát sinh giao dịch cuối cùng. Pawpal sẽ tự động gửi thông báo nhắc nhở 30 ngày trước khi điểm hết hạn.
Voucher đổi từ điểm thưởng có thể áp dụng đồng thời với các chương trình khuyến mãi chung của Pawpal.
Tình huống ngoại lệ
Nếu hết số lượng ưu đãi thì Pawpal cập nhật trạng thái "Hết hàng" ngay trên giao diện đổi quà và ẩn nút "Đổi quà" để tránh khách hàng bị trừ điểm oan.
Pawpal áp dụng cơ chế an toàn nếu trừ điểm thất bại, lệnh cấp mã Voucher sẽ không được thực hiện. Hiển thị lỗi "Pawpal bận, vui lòng thử lại sau".
Khi khách hàng vãng lai muốn đổi điểm, Pawpal hiển thị hướng dẫn: "Bạn cần thiết lập mật khẩu để sử dụng điểm thưởng". Sau khi khách tạo mật khẩu thành công, Pawpal tự động quay lại trang đổi quà.
Nếu mã đã hết hạn hoặc không khớp điều kiện, Pawpal hiển thị cảnh báo chi tiết lý do mã không hợp lệ và chọn phương án khác.
Nếu đang hàng bị huỷ/hoàn, Pawpal hoàn trả voucher về “Voucher của tôi” và thu hồi điểm tích luỹ mới từ đơn đó, nhưng không thu lại điểm đã dùng để đổi voucher.
Pawpal chỉ thu hồi phần điểm còn tồn tại trong tài khoản. Số điểm không thu hồi được Pawpal chịu, tài khoản khách hàng không bao giờ bị âm điểm
3.1.14. Quản lý thông báo
Mô tả quy trình
Quy trình bắt đầu khi Pawpal ghi nhận một sự kiện thay đổi trạng thái liên quan đến hành trình của khách hàng và thú cưng, bao gồm: xác nhận đặt lịch thành công, có cập nhật mới tại Nhật ký chăm sóc, đơn hàng chuyển sang đang giao, hoặc các ưu đãi sắp hết hạn. Ngay khi sự kiện phát sinh, Pawpal trích xuất thông tin định danh và cá nhân hóa nội dung thông báo đảm bảo mỗi tin nhắn gửi đi đều có tên khách hàng và tên thú cưng tương ứng từ hồ sơ bé cưng.
Khách hàng tiếp nhận thông báo qua hai hình thức trên giao diện website. Ở hình thức thứ nhất, thông báo đẩy xuất hiện ngay góc màn hình để thu hút sự chú ý với các sự kiện quan trọng. Ở hình thức thứ hai, khách hàng chủ động xem tại biểu tượng "Chuông thông báo" trên menu. Khi nhấn vào biểu tượng này, danh sách thông báo hiển thị theo thứ tự từ mới nhất đến cũ nhất, kèm nhãn phân loại dịch vụ, mua sắm, ưu đãi giúp khách hàng dễ dàng lọc và quản lý thông tin.
Quy trình phân nhánh khi khách hàng tương tác với danh sách thông báo. Nếu nhấn vào một thông báo cụ thể, Pawpal thực hiện đồng thời hai việc: dẫn khách hàng đến đúng màn hình liên quan (Lịch hẹn cho bé với thông báo xác nhận/nhắc lịch, Nhật ký chăm sóc với cập nhật hình ảnh, Chi tiết đơn hàng với mua sắm) và tự động đánh dấu thông báo đó là "Đã đọc".
Khi muốn dọn dẹp thông báo, khách hàng có thể "Đánh dấu đã đọc tất cả" hoặc "Xóa thông báo". Pawpal hỏi xác nhận một lần trước khi xóa để tránh thao tác nhầm. Quy trình kết thúc khi trạng thái hiển thị của thông báo được cập nhật theo đúng hành vi của khách hàng đảm bảo một trải nghiệm quản lý thông tin liền mạch và không bỏ lỡ các cột mốc quan trọng trong hành trình sử dụng dịch vụ tại Pawpal.
Quy tắc nghiệp vụ
Tất cả thông báo liên quan đến dịch vụ chăm sóc bắt buộc phải bao gồm tên của thú cưng, ví dụ: "Bé Bông đã tắm xong!" để tăng sự gắn kết cảm xúc.
Thời gian gửi: Các thông báo về khuyến mãi/marketing chỉ được gửi trong khung giờ từ 08:00 đến 21:00. Các thông báo giao dịch (xác nhận lịch) được gửi tức thì 24/7.
Giới hạn không quá 03 thông báo marketing/tuần cho mỗi khách hàng để tránh gây phiền hà.
Thông báo được lưu trữ trong danh sách "Thông báo của tôi" trong vòng 90 ngày, sau thời gian này Pawpal sẽ tự động xóa để tối ưu dung lượng.
Tình huống ngoại lệ
Nếu gửi thông báo thất bại do lỗi mạng, Pawpal đưa vào hàng chờ và thử lại tối đa 3 lần. Nếu vẫn thất bại, sự cố được ghi nhận để đội kỹ thuật kiểm tra và xử lý.
Người dùng chặn nhận thông báo, Pawpal kiểm tra cài đặt quyền riêng tư của người dùng trước khi gửi. Nếu người dùng tắt thông báo Shop, Pawpal chỉ gửi thông báo Dịch vụ khẩn cấp.
Thông báo nhắc lịch bị trễ: Nếu thời gian gửi thông báo nhắc lịch diễn ra sau giờ hẹn thực tế, Pawpal tự động hủy lệnh gửi để tránh gây nhầm lẫn hoặc lo lắng không cần thiết cho khách hàng.
Nếu thú cưng chưa có tên trong hồ sơ, Pawpal dùng cụm từ thay thế mặc định (ví dụ: "Bé yêu của bạn") để thông báo vẫn được gửi bình thường mà không bị lỗi hiển thị.
Pawpal kiểm tra trong vòng 5 phút; nếu có 2 thông báo giống nhau gửi cho cùng một khách hàng, thông báo thứ hai tự động bị hủy khách hàng không bị làm phiền nhiều lần.
3.1.15. Hỗ trợ khách hàng
Mô tả quy trình
Quy trình bắt đầu khi khách hàng vào trang "Trung tâm trợ giúp" hoặc nhấn biểu tượng Chat trực tuyến tích hợp trên website. Ngay khi trang tải, Pawpal hiển thị danh sách câu hỏi thường gặp (FAQ) được phân loại rõ ràng theo từng chủ đề: tài khoản, đặt lịch và chính sách. Khách hàng có thể tự tìm câu trả lời qua thanh tìm kiếm thông minh mà không cần đợi nhân viên hỗ trợ.
Trong trường hợp cần hỗ trợ chuyên sâu hơn, khách hàng chat qua khung chat để kết nối với Pawpal AI. AI tự tra cứu thông tin từ "Lịch hẹn cho bé", "Nhật ký chăm sóc" và "Đơn hàng của tôi" để trả lời cá nhân hóa ngay lập tức khách hàng không cần cung cấp lại mã đơn hàng hay tên thú cưng. Nếu câu trả lời của AI đáp ứng được nhu cầu, khách hàng nhấn "Hài lòng" để kết thúc. Ngược lại, Pawpal hiển thị tùy chọn "Kết nối với nhân viên".
Khi khách hàng chọn kết nối nhân viên, Pawpal kiểm tra trạng thái sẵn sàng của tư vấn viên; nếu trong giờ làm việc, khách hàng được chuyển sang giao diện Chat trực tiếp ngay lập tức.
Nếu yêu cầu phát sinh ngoài giờ làm việc hoặc khách hàng muốn gửi khiếu nại bằng văn bản, Pawpal cung cấp form tạo phiếu hỗ trợ. Khách hàng nhập tiêu đề, mô tả chi tiết sự cố và tùy chọn đính kèm ảnh/video minh chứng. Sau khi nhấn "Gửi yêu cầu", Pawpal hiển thị xác nhận kèm mã Ticket riêng. Khách hàng theo dõi tiến độ xử lý, xem phản hồi và gửi thêm thông tin tại màn hình "Yêu cầu của tôi" trên trang cá nhân.
Quy trình phân nhánh ở giai đoạn kết thúc: sau khi nhận được phản hồi giải quyết từ cửa hàng, khách hàng có thể chọn "Tiếp tục trao đổi" nếu chưa thỏa đáng, hoặc nhấn "Đóng hỗ trợ" để hoàn tất. Ngay khi đóng, Pawpal hiển thị form đánh giá ngắn để khách hàng cho điểm chất lượng hỗ trợ. Quy trình khép lại khi phản hồi được ghi nhận và Pawpal gửi thông báo cảm ơn đến khách hàng.

Quy tắc nghiệp vụ
Các yêu cầu hỗ trợ liên quan đến sự cố sức khỏe bé cưng tại Hotel hoặc lỗi thanh toán trực tuyến bắt buộc phải được gắn nhãn "Ưu tiên cao" và xử lý trong vòng 15 phút.
Trong giờ làm việc (08:00 - 22:00), các Ticket thông thường phải được phản hồi trong tối đa 60 phút. Ngoài giờ làm việc, Pawpal tự động gửi thông báo hẹn thời gian xử lý vào đầu giờ sáng hôm sau.
Chatbot bắt buộc phải truy xuất được tên bé từ Hồ sơ bé cưng và mã vận đơn từ Đơn hàng của tôi để đưa ra câu trả lời chính xác, tránh bắt khách hàng phải cung cấp lại mã đơn hàng nhiều lần.
Nhân viên CSKH chỉ được quyền xem và xử lý các Ticket được phân phối cho mình hoặc của nhóm mình phụ trách.
Toàn bộ lịch sử hỗ trợ và Ticket phải được lưu trữ trong hồ sơ khách hàng để phục vụ công tác tra soát và cải thiện dịch vụ tại module CRM.
Tình huống ngoại lệ
Nhân viên hỗ trợ đang bận hoặc offline hết: Chatbot tự động gửi thông báo: : Pawpal thông báo ngay: "Hiện tại các tư vấn viên đều đang bận, bạn vui lòng để lại lời nhắn, chúng tôi sẽ phản hồi sớm nhất trong vòng 1 giờ", khách hàng không bị bỏ rơi mà không nhận được phản hồi nào.
Khách hàng vãng lai yêu cầu hỗ trợ: Khách vãng lai có thể gửi Ticket chỉ với họ tên, số điện thoại và mô tả vấn đề không cần tài khoản. Pawpal dùng số điện thoại để liên hệ phản hồi và đối chiếu với đơn hàng liên quan."
Người dùng sử dụng từ ngữ không phù hợp trong Chat Pawpal tự động kích hoạt bộ lọc nội dung, cảnh báo người dùng và có quyền tự động ngắt phiên chat nếu vi phạm nhiều lần.
Nếu tệp không đúng định dạng hoặc quá dung lượng, Pawpal hiển thị cảnh báo và hướng dẫn khách hàng gửi ảnh qua link Zalo chính thức của PawPal.
Pawpal tự động kích hoạt lệnh nhắc nhở gửi đến Quản lý cơ sở để yêu cầu kiểm tra và xử lý ngay lập tức.
