3.1.Mô tả quy trình nghiệp vụ và Sơ đồ BPMN
3.1.1. Quy trình đăng ký
Mô tả quy trình 
Đối với Đăng ký chủ động, quy trình bắt đầu khi người dùng chọn chức năng "Đăng ký" trên giao diện Pawpal và cung cấp các thông tin gồm Họ tên, Số điện thoại và Mật khẩu. Ngay lập tức, Pawpal gửi một mã xác nhận (OTP) về số điện thoại để đảm bảo tài khoản thuộc về đúng chủ nhân. Sau khi nhập mã thành công, tài khoản được kích hoạt ngay lập tức và người dùng có thể đăng nhập, Pawpal điều hướng người dùng vào Trang chủ. Khách hàng được chào đón bằng thông báo chào mừng và nhận ngay 50 điểm thưởng Paw Points để bắt đầu hành trình chăm sóc thú cưng.
Đối với Định danh lũy tiến dành cho khách hàng vãng lai, Khi khách hàng đặt lịch hoặc mua sắm lần đầu, Pawpal chỉ yêu cầu những thông tin cần thiết cho giao dịch bao gồm Họ tên, Số điện thoại, thông tin cơ bản của bé cưng hoặc Địa chỉ giao nhận sản phẩm. Sau khi xác nhận thông tin, hệ thống sẽ ngầm khởi tạo một "Tài khoản tạm" gắn với số điện thoại khách hàng cung cấp. Khách hàng không cần gián đoạn để tạo tài khoản, giao dịch được ưu tiên hoàn tất trước. Sau khi giao dịch hoàn tất, Pawpal gửi một tin nhắn SMS với nội dung chào mừng, kèm theo đường dẫn thiết lập mật khẩu có hiệu lực trong 48 giờ và thông báo tặng ngay 50 điểm thưởng Paw Points để khuyến khích khách hàng kích hoạt tài khoản. Quy trình chính thức hoàn tất khi khách hàng nhấn vào liên kết, thiết lập mật khẩu, toàn bộ lịch sử đặt lịch và đơn hàng sẽ tự động hiển thị trong tài khoản mới, không cần nhập lại bất cứ thông tin nào.
Ngoài ra, trong trường hợp khách hàng trực tiếp đến cơ sở, Admin có thể hỗ trợ thực hiện quy trình đăng ký nhanh tại quầy chỉ với Họ tên và Số điện thoại để giúp khách hàng sở hữu tài khoản định danh ngay lập tức. Sau đó, Pawpal tự động gửi đường dẫn thiết lập mật khẩu về điện thoại khách hàng để họ hoàn tất kích hoạt khi thuận tiện.
Quy tắc nghiệp vụ 
Mỗi số điện thoại chỉ tương ứng với một tài khoản duy nhất trên Pawpal, và phải đúng định dạng nhà mạng Việt Nam.
Mã OTP có hiệu lực trong 5 phút để xác nhận số điện thoại là của khách hàng. Nếu mã hết hạn, khách hàng có thể yêu cầu gửi lại dễ dàng.
Tài khoản tạm được hệ thống tự động khởi tạo ngay khi khách hàng vãng lai nhấn Xác nhận đặt lịch/mua hàng.
Đường dẫn thiết lập mật khẩu được gửi qua SMS Gateway có thời hạn sử dụng tối đa là 48 giờ.
Sau khi nhập SĐT, khách hàng được cấp quyền truy cập ngay dưới dạng tài khoản chưa kích hoạt hoàn toàn để trải nghiệm dịch vụ.
Hệ thống bắt buộc khách hàng phải thiết lập mật khẩu trước khi có thể thực hiện quy trình Đổi điểm thưởng hoặc Thay đổi lịch, Hủy lịch hẹn. 
Sau khi thiết lập mật khẩu, khách hàng mở khóa toàn bộ tính năng đổi điểm Paw Points, quản lý lịch hẹn, và xem nhật ký chăm sóc của thú cưng.
Tài khoản tạm được khởi tạo ở lần đặt dịch vụ đầu tiên, nếu muốn đăng nhập lại, Pawpal buộc khách hàng phải thiết lập mật khẩu và đồng ý với chính sách của cửa hàng
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
Đối với Thành viên chính thức Pawpal yêu cầu Mật khẩu cá nhân, sau đó nhấn nút “Đăng nhập” để gửi yêu cầu truy cập. Nếu quên mật khẩu, khách hàng chọn "Quên mật khẩu" và nhập lại số điện thoại, Pawpal gửi ngay một OTP định danh về số điện thoại để đảm bảo tài khoản thuộc về đúng chủ nhân. Sau khi nhập mã thành công,  Pawpal đưa người dùng đến trang thiết lập mật khẩu mới, sau khi tạo mật khẩu thành công, khách hàng đăng nhập bình thường. Trong trường hợp Pawpal không tìm thấy số điện thoại tương ứng, Pawpal hiển thị thông báo lỗi và hướng người dùng về trang Đăng ký.
Đối với Khách vãng lai có tài khoản tạm chưa có mật khẩu, Pawpal sẽ điều hướng người dùng đến trang Thiết lập mật khẩu. Tại biểu mẫu bắt buộc này, người dùng phải thiết lập mật khẩu cá nhân để mở khóa lại lịch sử giao dịch và bảo vệ quyền riêng tư cho Nhật ký chăm sóc của bé cưng, khách hàng bắt buộc phải thực hiện đồng thời hai thao tác Thiết lập mật khẩu cá nhân mới và Tick chọn đồng ý với Chính sách & Điều khoản vận hành của cửa hàng. Giao diện khóa hoàn toàn mọi tính năng ẩn hoặc nút bấm bỏ qua, nút "Xác nhận kích hoạt" chỉ chuyển sang trạng thái khả dụng khi cả hai điều kiện trên được thỏa mãn hoàn toàn. Sau khi người dùng nhấn xác nhận thành công, Pawpal mới chính thức chuyển đổi tài khoản tạm sang tài khoản thành viên chính thức và điều hướng về trang cá nhân.
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
3.1.3. Quản lý hồ sơ bé cưng
Mô tả quy trình 
Quy trình quản lý hồ sơ bé cưng khởi đầu sau khi người dùng đăng nhập thành công và truy cập vào mục "Hồ sơ của bé" trên Trang chủ. Tại giao diện này, Pawpal cho phép người dùng khởi tạo và duy trì Pet ID cho các bé cưng của mình thông qua các thao tác cụ thể
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
Quy trình đặt lịch hẹn trực tuyến trên hệ thống Pawpal trải qua quy trình 4 bước. Ngay khi người dùng nhấn nút "Đặt lịch ngay" trên giao diện Trang chủ hoặc mục Dịch vụ, Pawpal sẽ lập tức kiểm tra trạng thái đăng nhập để điều hướng luồng xử lý tại “Bước 01: Thông tin bé”.
Nếu khách hàng đã đăng nhập tài khoản thành viên, Pawpal hiển thị màn hình "Chọn bé cưng" dưới dạng danh sách các thẻ Pet ID có sẵn, người dùng chỉ cần tick chọn hồ sơ bé cưng để Pawpal tự động truy xuất dữ liệu giống loài và cân nặng làm cơ sở tính giá cho chặng sau. Ngược lại, nếu khách hàng chưa đăng nhập, biểu mẫu "Thông tin khách hàng" sẽ hiện ra yêu cầu nhập Họ tên, Số điện thoại, Tên bé, Giống loài và Cân nặng. Để tránh việc thành viên quên đăng nhập dẫn đến trùng lặp dữ liệu, form này tích hợp sẵn nút "Đăng nhập ngay" nổi bật. Đặc biệt, khi người dùng vừa nhập xong Số điện thoại, Pawpal sẽ kiểm tra dữ liệu thực tế, nếu phát hiện SĐT đã tồn tại dưới tư cách thành viên chính thức, một ô "Nhập mật khẩu" sẽ lập tức xuất hiện ngay tại chỗ kèm cảnh báo đỏ thông báo SĐT đã được đăng ký và yêu cầu đăng nhập. Để giảm thiểu ma sát và tránh làm gián đoạn luồng đặt lịch, Pawpal cung cấp thêm tùy chọn "Đăng nhập nhanh bằng SMS" (gửi OTP) hoặc liên kết "Quên mật khẩu" ngay bên dưới ô mật khẩu này, giúp khách hàng xác thực tức thì mà không bị mất dữ liệu đã điền. Trong trường hợp Pawpal kiểm tra SĐT hoàn toàn mới, ngay khi các trường dữ liệu đầu vào của biểu mẫu được điền đầy đủ và hợp lệ, hệ thống Pawpal sẽ lập tức khởi tạo một "Tài khoản tạm" dành cho Khách hàng vãng lai. Nút "Tiếp tục" chỉ sáng lên khi các dữ liệu đầu vào hoàn toàn hợp lệ.
Sau khi hoàn tất thông tin bé cưng, khách hàng bấm chuyển sang “Bước 02: Chọn dịch vụ”. Dựa trên chỉ số cân nặng và giống loài đã ghi nhận từ Bước 1, Pawpal tự động truy xuất ma trận giá niêm yết từ hệ thống để thực hiện cơ chế áp giá động. Lúc này, giao diện hiển thị các thẻ dịch vụ với mức giá chính xác tương ứng với hạng cân của bé. 
Khi khách hàng chọn gói dịch vụ mong muốn, thẻ đó sẽ đổi màu viền và mở khóa cho phép chuyển tiếp sang “Bước 03: Chọn lịch & Nhân viên”. Tại đây, bảng lịch sẽ hiển thị các ô giờ trống theo thời gian thực và danh sách nhân viên. Khách hàng có thể tùy chọn đích danh nhân viên yêu thích hoặc chọn phân bổ ngẫu nhiên. Ngay khi người dùng nhấp chuột vào một ô giờ và nhân viên cụ thể, một dải băng đếm ok ngược "Giữ chỗ tạm thời" trong vòng 15 phút. Ô lịch này sẽ chuyển sang màu xám và bị khóa đối với tất cả người dùng khác trên hệ thống. 
Bước cuối cùng trong tiến trình đặt lịch là “Bước 04: Xác nhận”, Pawpal hiển thị một tờ hóa đơn chi tiết dịch vụ và chi phí trên giao diện. Vì Pawpal áp dụng chính sách không thu bất kỳ khoản phí đặt cọc nào trước, trường dữ liệu "Chi phí đặt cọc" sẽ được hiển thị in đậm nổi bật với con số 0 VNĐ. Nhằm đảm bảo tính minh bạch và tránh các hiểu lầm về mặt tài chính, một dòng thông báo cảnh báo sẽ được chèn ngay dưới tổng tiền, nhắc nhở khách hàng rằng mức giá hiện tại chỉ là dự kiến dựa trên số cân nặng tự khai báo và nhân viên sẽ tiến hành cân lại thực tế tại quầy để áp giá chuẩn nhất theo quy định. Khi khách hàng bấm nút "Xác nhận đặt lịch", nút này sẽ lập tức chuyển sang trạng thái khóa mờ và hiển thị icon Loading Spinner. Pawpal hiển thị một hiệu ứng chúc mừng, mã đặt lịch được cấp, đồng thời thông tin cuộc hẹn tự động đồng bộ lên mục "Lịch hẹn của bé" trên Dashboard cá nhân và lịch vận hành chung của cửa hàng. Đồng thời, lịch hẹn mới cũng sẽ được thông báo gửi về SMS. 
Đối với Khách hàng vãng lai, sau khi giao dịch hoàn tất, Pawpal gửi một tin nhắn SMS với nội dung chào mừng, kèm theo đường dẫn thiết lập mật khẩu có hiệu lực trong 48 giờ và thông báo tặng ngay 50 điểm thưởng Paw Points để khuyến khích khách hàng kích hoạt tài khoản.
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
Tình huống ngoại lệ
Sau 15 phút nếu khách không nhấn "Xác nhận đặt lịch", hệ thống tự động xóa dữ liệu tạm và mở lại ô lịch đó trên bản đồ giờ trống.
Trường hợp hai người cùng bấm vào một ô lịch ở cùng một mili giây, hệ thống sẽ ưu tiên yêu cầu gửi đến máy chủ trước và báo lỗi "Khung giờ này vừa được đặt" cho người còn lại.
Nếu SĐT không hợp lệ, hệ thống sẽ không thể khởi tạo tài khoản tạm và gửi SMS. Khách hàng phải điều chỉnh thông tin hợp lệ mới có thể nhấn "Xác nhận đặt lịch"
Sau 15 phút, hệ thống tự giải phóng slot mà không cần bất kỳ thao tác nào từ phía người dùng hay Admin.
Nếu khách hàng chọn khung giờ vừa mới trôi qua thời gian thực, hệ thống báo lỗi "Thời gian không hợp lệ" và tự động làm mới lại bảng giờ trống.
Hệ thống yêu cầu khách hàng cập nhật nhanh thông tin tại bước chọn Pet rồi mới cho phép đi tiếp.
3.1.5. Thay đổi lịch hẹn
Mô tả quy trình 
Quy trình thay đổi lịch hẹn trực tuyến trên hệ thống Pawpal được kích hoạt từ hai cổng tiếp cận linh hoạt trên giao diện, cổng thứ nhất dành riêng cho Khách hàng thành viên đã đăng nhập thông qua phân mục “Lịch hẹn chăm sóc” tại trang cá nhân, cổng thứ hai là tính năng “Tra cứu dịch vụ” hiển thị công khai ngay trên Trang chủ, cho phép mọi đối tượng khách hàng chỉ cần nhập Số điện thoại là có thể tra cứu toàn bộ danh sách đơn hàng và lịch hẹn đã đặt. 
Đối với Khách hàng thành viên đã đăng nhập, hệ thống cấp quyền tối đa cho phép họ chủ động thao tác trên cả hai giao diện phân mục “Lịch hẹn chăm sóc” tại trang cá nhân hoặc tính năng “Tra cứu dịch vụ” công khai trên Landing Page. Khi thành viên tìm đến một lịch hẹn có trạng thái "Đã xác nhận" và nhấn nút "Thay đổi lịch" với điều kiện thời gian cách giờ hẹn tối thiểu 2 tiếng, Pawpal điều hướng thẳng người dùng đến màn hình “Chọn lịch mới" mà không cần yêu cầu xác thực thêm bất kỳ bước nào.
Đối với Người dùng chưa đăng nhập, Pawpal giới hạn quyền truy cập khi họ chỉ có thể xem danh sách đơn hàng và lịch hẹn bằng cách nhập SĐT tại trang “Tra cứu dịch vụ” công khai trên Trang chủ. Khi người dùng này tiến hành nhấp chuột vào chức năng "Thay đổi lịch", Pawpal sẽ lập tức yêu cầu người dùng nhập Số điện thoại trước. Ngay khi SĐT được xác nhận, Pawpal sẽ xác định loại tài khoản để phân nhánh đối tượng
Trường hợp SĐT thuộc về Khách hàng thành viên, trang "Nhập mật khẩu" sẽ lập tức xuất hiện ngay tại chỗ để yêu cầu người dùng đăng nhập tài khoản. Sau khi xác thực mật khẩu chính xác, hệ thống mới mở khóa quyền và chuyển hướng họ sang trang “Chọn lịch mới".
Trường hợp Pawpal nhận diện đây là SĐT tài khoản tạm, PawPal sẽ lập tức hiển thị giao diện chứa 2 lựa chọn hành động Thiết lập mật khẩu hoặc Liên hệ Hotline. Nếu khách hàng chọn Thiết lập mật khẩu, Pawpal dẫn vào giao diện trang tạo mật khẩu mới và tích chọn đồng ý với chính sách của cửa hàng. Khi hoàn tất, tài khoản tạm được nâng cấp thành thành viên chính thức và hệ thống tự động mở màn hình “Chọn lịch mới" Nếu khách hàng không muốn tạo tài khoản mật khẩu trên Pawpal, họ bắt buộc phải chọn Liên hệ Hotline để lấy số cửa hàng và gọi điện cho nhân viên hỗ trợ điều chỉnh thủ công trên hệ thống nội bộ.
Tại màn hình “Chọn lịch mới". Tại đây, Pawpal hiển thị các khung giờ trống theo thời gian thực và danh sách nhân viên chăm sóc đang sẵn sàng. Tương tự như quy trình đặt lịch ban đầu, ngay khi khách hàng nhấn chọn vào một ô lịch mới, màn hình sẽ hiển thị đồng hồ đếm ngược "Giữ chỗ tạm thời" cho khung giờ đó trong vòng 15 phút và chuyển trạng thái ô lịch sang "Đang chờ". Đồng thời, Pawpal vẫn giữ nguyên trạng thái ô lịch cũ của khách hàng cho đến khi thao tác thay đổi được xác nhận thành công.
Sau khi chọn giờ và nhân viên mới, khách hàng tiến hành kiểm tra lại thông tin tại màn hình xác nhận. Nếu có sự chênh lệch về giá, Pawpal sẽ hiển thị bảng kê chi tiết số tiền cần bù hoặc số tiền dư ra để minh bạch giá cả. Sau đó, khách hàng nhấn "Xác nhận thay đổi" tại màn hình “Xác nhận thông tin dịch vụ”". Lúc này, hệ thống Pawpal sẽ hiển thị trên màn hình chuyển trạng thái lịch hẹn mới thành "Đã xác nhận". Đồng thời, Pawpal lập tức giải phóng ô lịch cũ, người dùng sẽ thấy ô lịch chuyển về trạng thái "Trống" cho người dùng khác.
Quy trình hoàn tất khi khách hàng nhấn nút "Xác nhận thay đổi", hệ thống hiển thị thông báo "Thay đổi lịch hẹn thành công" và thông tin được đồng bộ lên lịch vận hành của cửa hàng. 
Quy tắc nghiệp vụ 
Khách hàng chỉ được phép thay đổi lịch hẹn trước giờ bắt đầu dịch vụ tối thiểu 2 tiếng.
Ô lịch mới được khách hàng chọn sẽ được khóa tạm thời trong 15 phút. Nếu khách hàng thoát trang hoặc không xác nhận trong thời gian này, ô lịch mới sẽ bị giải phóng và lịch hẹn cũ vẫn được giữ nguyên.
Khung giờ ban đầu sẽ chỉ được giải phóng trên hệ thống sau khi việc thay đổi lịch hẹn mới đã được xác nhận thành công.
Mỗi lịch hẹn chỉ được phép thay đổi trực tuyến tối đa 02 lần. Sau giới hạn này, nút "Thay đổi" sẽ bị ẩn và khách hàng bắt buộc phải liên hệ Hotline để được Admin hỗ trợ thủ công.
Khách hàng không được phép thay đổi loại dịch vụ chính từ Spa sang Hotel trong quy trình này. Mọi thay đổi về loại dịch vụ bắt buộc phải thực hiện thông qua quy trình Hủy lịch và Đặt lịch mới.
Đối với tài khoản tạm, hệ thống yêu cầu khách hàng phải thiết lập mật khẩu mới có quyền thực hiện thay đổi lịch hẹn.
Mọi thao tác thay đổi lịch phải ghi nhận rõ ID người thực hiện, thời gian thay đổi vào nhật ký hệ thống.
Tình huống ngoại lệ
Nếu thời gian còn lại dưới 2 tiếng, nút "Thay đổi" sẽ bị vô hiệu hóa, hệ thống hiển thị thông báo "Đã quá thời gian tự thay đổi lịch tự động, vui lòng gọi Hotline để nhân viên hỗ trợ bạn trực tiếp".
Nếu thú cưng đã ở cửa hàng và trạng thái là "Đang thực hiện", chức năng thay đổi lịch trên website sẽ bị khóa hoàn toàn. Mọi thay đổi về thời gian đón bé phải trao đổi trực tiếp với Lễ tân.
Nếu khách hàng để máy chờ quá 15 phút mà không nhấn xác nhận, hệ thống sẽ tự động hủy lệnh thay đổi, giải phóng ô lịch mới và giữ nguyên lịch hẹn cũ cho khách hàng.
3.1.6. Hủy lịch
Mô tả quy trình
Khi khách hàng truy cập vào mục “Lịch hẹn chăm sóc” hoặc “Tra cứu dịch vụ” trên PawPal, khách hàng có thể xem lại đầy đủ thông tin về dịch vụ đã đặt, thời gian thực hiện và thông tin thú cưng trước khi quyết định hủy lịch. 
Khi khách hàng nhấn nút “Hủy lịch hẹn”, PawPal hiển thị cửa sổ xác nhận nhằm đảm bảo người dùng không thao tác nhầm. Khách hàng có thể lựa chọn tiếp tục hủy hoặc quay lại màn hình trước đó để giữ nguyên lịch hẹn hiện tại.
Sau khi khách hàng xác nhận yêu cầu hủy, PawPal kiểm tra điều kiện hủy lịch theo chính sách của cửa hàng. Nếu lịch hẹn vẫn còn trong thời gian cho phép hủy trực tuyến và chưa bước vào quá trình thực hiện dịch vụ, PawPal sẽ cập nhật trạng thái lịch hẹn sang “Đã hủy”.
Ngay sau khi hủy thành công, khách hàng nhận được thông báo xác nhận trên website và tại Trung tâm thông báo cá nhân. Đồng thời, khung giờ tương ứng được cập nhật lại vào lịch trống để hỗ trợ các khách hàng khác đặt lịch trong thời gian đó.
Mặc dù lịch hẹn không còn hiệu lực, thông tin về lần đặt lịch vẫn được lưu trong mục “Lịch sử lịch hẹn” với trạng thái “Đã hủy”. Điều này giúp khách hàng dễ dàng tra cứu lại các giao dịch trước đây, theo dõi lịch sử sử dụng dịch vụ và quản lý các lần đặt lịch của thú cưng một cách thuận tiện.
Trong trường hợp khách hàng thường xuyên hủy lịch hoặc đặt lịch nhưng không sử dụng dịch vụ, PawPal có quyền tạm khóa chức năng đặt lịch trực tuyến của tài khoản đó và yêu cầu khách hàng liên hệ trực tiếp cửa hàng để được hỗ trợ đặt lịch.
Sau khi trạng thái lịch hẹn được cập nhật thành công và thông tin được lưu vào lịch sử đặt lịch, quy trình hủy lịch kết thúc.
Quy tắc nghiệp vụ
Khách hàng chỉ được phép tự hủy lịch hẹn trước giờ bắt đầu dịch vụ tối thiểu 2 tiếng.
Các lịch hẹn đã chuyển sang trạng thái “Đang thực hiện”, “Đã tiếp nhận” hoặc “Hoàn thành” sẽ không được phép hủy trực tiếp trên website.
Một lịch hẹn chỉ được phép hủy duy nhất một lần và không thể khôi phục sau khi xác nhận hủy thành công.
PawPal phải gửi thông báo xác nhận hủy lịch đến cả khách hàng và Admin ngay sau khi cập nhật trạng thái thành công.
Đối với khách hàng vãng lai, PawPal yêu cầu khách hàng thiết lập mật khẩu và kích hoạt tài khoản trước khi được phép thực hiện các thao tác thay đổi hoặc hủy lịch hẹn. 
Tình huống ngoại lệ
Nếu khách hàng thực hiện hủy lịch khi thời gian còn lại dưới 2 tiếng trước giờ hẹn, PawPal vô hiệu hóa nút “Hủy lịch”.
Nếu khách hàng vãng lai chưa thiết lập mật khẩu nhưng thực hiện thao tác thay đổi hoặc hủy lịch hẹn, PawPal sẽ hiển thị thông báo: "Vui lòng thiết lập mật khẩu để quản lý lịch hẹn" và chuyển người dùng đến quy trình kích hoạt tài khoản. 
Trong trường hợp xảy ra lỗi đồng bộ dữ liệu khi cập nhật trạng thái lịch hẹn, PawPal khôi phục giao dịch và giữ nguyên trạng thái cũ.
Nếu khách hàng thoát trang hoặc mất kết nối internet trước khi xác nhận thao tác cuối cùng, PawPal sẽ không ghi nhận yêu cầu hủy lịch.
Nếu không thể truy cập CSDL Đặt lịch tại thời điểm xử lý, PawPal phải hiển thị thông báo: “PawPal đang bận, vui lòng thử lại sau.”
3.1.7. Theo dõi dịch vụ
Mô tả quy trình
Quy trình theo dõi dịch vụ bắt đầu khi khách hàng đưa thú cưng đến cửa hàng PawPal theo lịch hẹn đã đặt trước. Sau khi tiếp nhận, nhân viên xác nhận thông tin lịch hẹn, đối chiếu hồ sơ thú cưng và cập nhật trạng thái "Đã tiếp nhận". PawPal đồng thời khởi tạo phiên theo dõi trải nghiệm dịch vụ tương ứng với lịch hẹn hiện tại để ghi nhận toàn bộ quá trình chăm sóc. Trong thời gian sử dụng dịch vụ, khách hàng có thể truy cập mục "Nhật ký bé cưng" để theo dõi tình trạng thú cưng theo thời gian thực. Đối với khách hàng thành viên đã đăng nhập, PawPal hiển thị trực tiếp nhật ký chăm sóc từ hồ sơ thú cưng tương ứng. Đối với khách hàng vãng lai, PawPal hỗ trợ chức năng tra cứu dịch vụ bằng số điện thoại đã sử dụng khi đặt lịch tại trang “Tra cứu dịch vụ”, cho phép khách hàng theo dõi tiến trình chăm sóc và các cập nhật liên quan mà không cần đăng nhập tài khoản.
PawPal liên tục hiển thị các cột mốc chăm sóc được cập nhật trong quá trình phục vụ như "Đã tiếp nhận", "Đang tắm", "Đang sấy lông", "Đang nghỉ ngơi", "Đã cho ăn", "Đã uống thuốc" hoặc "Hoàn tất chăm sóc". Mỗi cập nhật đều đi kèm thời gian ghi nhận nhằm giúp khách hàng nắm bắt chính xác tiến độ dịch vụ của bé cưng.
Trong trường hợp phát sinh các tình huống đặc biệt như thú cưng có dấu hiệu căng thẳng, bỏ ăn, dị ứng sản phẩm hoặc cần được theo dõi sức khỏe bổ sung, PawPal sẽ gửi tin nhắn SMS đến khách hàng và hiển thị thông báo đỏ tại màn hình nhật ký cũng như trung tâm thông báo trên website. Đồng thời, nhân viên phụ trách sẽ chủ động liên hệ với khách hàng để trao đổi tình trạng thực tế và thống nhất phương án xử lý nếu cần thiết.
Sau khi hoàn tất toàn bộ quá trình chăm sóc, nhân viên cập nhật trạng thái "Hoàn tất chăm sóc". Tại thời điểm này, PawPal tự động tổng hợp các dịch vụ đã thực hiện và hiển thị hóa đơn dự kiến cho khách hàng thông qua website. Hóa đơn bao gồm thông tin dịch vụ đã sử dụng, các khoản phát sinh (nếu có) và tổng chi phí cần thanh toán.
Khi khách hàng đến nhận thú cưng, nhân viên tiến hành bàn giao thú cưng và thực hiện thanh toán trực tiếp tại quầy. Sau khi khách hàng hoàn tất thanh toán, nhân viên xác nhận giao dịch trên PawPal bằng chức năng "Xác nhận đã thanh toán". Lúc này, trạng thái dịch vụ được cập nhật từ "Hoàn tất chăm sóc" sang "Hoàn thành", đánh dấu việc kết thúc toàn bộ quá trình cung cấp dịch vụ.
Ngay sau khi dịch vụ chuyển sang trạng thái "Hoàn thành", PawPal tự động cộng điểm thưởng Paw Points vào tài khoản khách hàng, gửi hóa đơn điện tử và mở biểu mẫu đánh giá dịch vụ. Khách hàng có thể gửi phản hồi về chất lượng chăm sóc, thái độ phục vụ và trải nghiệm tổng thể nhằm giúp PawPal cải thiện chất lượng dịch vụ trong tương lai.
Toàn bộ dữ liệu trong phiên chăm sóc sẽ được chuyển sang khu vực lưu trữ lịch sử. Thông qua mục "Lịch sử chăm sóc", khách hàng có thể tra cứu các lần sử dụng dịch vụ trước đây của thú cưng, bao gồm hình ảnh, ghi chú chăm sóc, hóa đơn dịch vụ và toàn bộ dòng thời gian trải nghiệm. Dữ liệu này giúp khách hàng theo dõi quá trình phát triển, tình trạng sức khỏe và lịch sử chăm sóc của thú cưng một cách đầy đủ theo thời gian.
Ngoài chức năng theo dõi dịch vụ, PawPal còn sử dụng dữ liệu lịch sử chăm sóc để cá nhân hóa trải nghiệm khách hàng. Dựa trên các lần sử dụng dịch vụ trước đó, PawPal có thể gợi ý lịch chăm sóc định kỳ, đề xuất các gói dịch vụ phù hợp hoặc gửi nhắc lịch grooming theo chu kỳ nhằm hỗ trợ khách hàng chăm sóc thú cưng hiệu quả hơn. 
Quy tắc nghiệp vụ
Mỗi lịch dịch vụ chỉ được phép tồn tại duy nhất một phiên "Theo dõi trải nghiệm dịch vụ" đang hoạt động tại cùng một thời điểm.
Nếu chưa có dữ liệu mới, PawPal hiển thị trạng thái "Đang chờ cập nhật từ nhân viên".
Mọi cập nhật trạng thái trên Timeline phải được gắn timestamp nhằm đảm bảo tính minh bạch và khả năng tra soát dữ liệu.
Hình ảnh hoặc video được tải lên phải liên kết trực tiếp với phiên dịch vụ hiện tại của thú cưng để tránh nhầm lẫn dữ liệu.
Timeline phải hiển thị dữ liệu theo thứ tự thời gian thực tế từ mới đến cũ nhằm đảm bảo tính liên tục trải nghiệm.
Khách hàng vãng lai được phép tra cứu nhật ký chăm sóc bằng số điện thoại đã sử dụng khi đặt lịch và chỉ được xem dữ liệu của các phiên dịch vụ thuộc số điện thoại đó. 
Khi dịch vụ kết thúc, PawPal tự động khóa quyền chỉnh sửa Timeline và chuyển dữ liệu sang chế độ lưu trữ.
Chỉ chủ sở hữu hợp lệ của thú cưng mới được phép truy cập nhật ký chăm sóc.
Dịch vụ chỉ được chuyển sang trạng thái “Hoàn thành” sau khi nhân viên xác nhận khách hàng đã thanh toán và nhận lại thú cưng. 
Mọi thao tác cập nhật trạng thái, hình ảnh hoặc ghi chú phải được ghi nhận vào nhật ký hệ thống nhằm phục vụ kiểm tra nội bộ hoặc xử lý khiếu nại.
Tình huống ngoại lệ 
Khi nhân viên tải lên hình ảnh hoặc video không hợp lệ (sai định dạng, vượt dung lượng cho phép), PawPal từ chối upload và hiển thị thông báo lỗi cụ thể.
Nếu mất kết nối khi đang cập nhật, Pawpal tự động lưu tạm nội dung và cho nhân viên gửi lại khi có mạng trở lại để không mất dữ liệu.
Pawpal gửi thông báo và mời khách hàng thử lại sau nếu không tải được nhật ký, thay vì hiển thị màn hình trống.
Khi nhiều nhân viên cùng cập nhật một lúc, Pawpal giữ bản mới nhất và lưu lịch sử chỉnh sửa để đối chiếu nếu cần.
Nếu khách hàng thoát web rồi vào lại, Pawpal tự động đồng bộ toàn bộ nhật ký mới nhất để khách hàng không bỏ lỡ bất kỳ cập nhật nào.
3.1.8. Mua sắm
Mô tả quy trình
Khi khách hàng truy cập vào trang "Cửa hàng" trên PawPal để tìm kiếm và lựa chọn các sản phẩm dành cho thú cưng như thức ăn, phụ kiện, đồ chơi, quần áo hoặc sản phẩm chăm sóc sức khỏe, PawPal sẽ hiển thị danh sách sản phẩm theo nhiều nhóm phân loại như danh mục, thương hiệu, sản phẩm bán chạy, khoảng giá và tình trạng còn hàng, giúp khách hàng dễ dàng tìm thấy sản phẩm phù hợp với nhu cầu của thú cưng. 
Trong quá trình mua sắm, khách hàng có thể sử dụng thanh tìm kiếm hoặc các bộ lọc để thu hẹp phạm vi lựa chọn. Khi nhập từ khóa tìm kiếm, PawPal hiển thị các sản phẩm phù hợp dựa trên tên sản phẩm, thương hiệu và các thông tin liên quan. Nếu không tìm thấy sản phẩm phù hợp, PawPal sẽ thông báo kết quả tìm kiếm không khả dụng và gợi ý một số sản phẩm tương tự hoặc sản phẩm nổi bật để khách hàng tiếp tục tham khảo. 
Khi lựa chọn một sản phẩm cụ thể, khách hàng được chuyển đến màn hình "Chi tiết sản phẩm" để xem đầy đủ thông tin như hình ảnh, mô tả, giá bán, số lượng còn lại trong kho, đánh giá từ khách hàng khác và các sản phẩm liên quan. Nếu sản phẩm đang tạm hết hàng, PawPal hiển thị trạng thái "Tạm hết hàng" và không cho phép thêm sản phẩm vào giỏ hàng.
Trong trường hợp muốn lưu lại sản phẩm để xem hoặc mua sau, khách hàng có thể sử dụng chức năng "Danh sách yêu thích". Đối với khách hàng đã đăng nhập, danh sách này được lưu vào tài khoản cá nhân và đồng bộ trên các thiết bị. Đối với khách vãng lai, PawPal lưu tạm dữ liệu trong phiên truy cập hiện tại để duy trì trải nghiệm mua sắm liên tục.
Khi khách hàng chọn "Thêm vào giỏ hàng", PawPal kiểm tra số lượng tồn kho hiện tại. Nếu số lượng yêu cầu vượt quá mức tồn kho khả dụng, khách hàng sẽ nhận được thông báo điều chỉnh số lượng. Nếu sản phẩm còn đủ hàng, sản phẩm được thêm vào giỏ hàng cùng với các thông tin gồm tên sản phẩm, số lượng, đơn giá và giá trị tạm tính.
Tại màn hình "Giỏ hàng", khách hàng có thể thay đổi số lượng sản phẩm, xóa sản phẩm khỏi giỏ hàng hoặc áp dụng mã giảm giá nếu có. Sau mỗi thao tác, PawPal tự động cập nhật tổng giá trị đơn hàng để khách hàng dễ dàng theo dõi chi phí mua sắm. Đồng thời, tồn kho sản phẩm vẫn được kiểm tra định kỳ nhằm đảm bảo dữ liệu hiển thị luôn chính xác trước khi chuyển sang bước tiếp theo.
Nếu khách hàng rời khỏi website khi chưa hoàn tất mua hàng, PawPal sẽ lưu lại trạng thái giỏ hàng để hỗ trợ khôi phục trong lần truy cập tiếp theo. Đối với khách hàng đã đăng nhập, giỏ hàng được đồng bộ với tài khoản cá nhân; đối với khách vãng lai, dữ liệu được lưu tạm trong trình duyệt trong khoảng thời gian cho phép.
Sau khi hoàn tất việc lựa chọn sản phẩm và kiểm tra lại giỏ hàng, khách hàng nhấn "Tiến hành thanh toán" để chuyển sang quy trình thanh toán. Tại thời điểm này, dữ liệu đơn hàng tạm thời được chuyển sang bước xử lý thanh toán và quy trình mua sắm kết thúc.
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
3.1.9. Thanh toán
Quy trình thanh toán bắt đầu khi khách hàng hoàn tất việc lựa chọn sản phẩm trong "Giỏ hàng", và nhấn nút "Tiến hành thanh toán" hoặc chọn “Mua ngay” trên trang chi tiết sản phẩm. Trước khi chuyển sang bước thanh toán, PawPal kiểm tra lại thông tin đơn hàng bao gồm danh sách sản phẩm, số lượng, giá bán hiện tại, mã giảm giá đã áp dụng và tình trạng còn hàng nhằm đảm bảo dữ liệu hiển thị cho khách hàng là chính xác nhất.
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
3.1.10. Quản lý đơn hàng
Mô tả quy trình
Quy trình quản lý đơn hàng bắt đầu sau khi khách hàng hoàn tất giao dịch mua sắm trên PawPal. Để theo dõi tình trạng xử lý đơn hàng, khách hàng có thể truy cập hệ thống thông qua hai hình thức khác nhau.
Đối với khách hàng thành viên đã đăng nhập, khách hàng truy cập mục "Đơn hàng của tôi" trong khu vực tài khoản cá nhân. PawPal tự động truy xuất toàn bộ các đơn hàng đã phát sinh theo tài khoản và hiển thị danh sách đơn hàng tương ứng.
Đối với khách hàng vãng lai hoặc khách hàng thành viên chưa đăng nhập, khách hàng có thể sử dụng chức năng "Tra cứu dịch vụ" được hiển thị công khai trên Trang chủ. Tại đây, khách hàng nhập số điện thoại đã sử dụng khi đặt hàng. PawPal tiến hành kiểm tra tính hợp lệ của dữ liệu và truy xuất danh sách đơn hàng tương ứng với số điện thoại đó.
Khi lựa chọn một đơn hàng cụ thể, khách hàng được chuyển đến màn hình "Chi tiết đơn hàng". Tại đây, PawPal hiển thị đầy đủ các thông tin liên quan như danh sách sản phẩm đã mua, số lượng, đơn giá, tổng tiền thanh toán, địa chỉ giao hàng, phương thức thanh toán và lịch sử thay đổi trạng thái đơn hàng. Đồng thời, khách hàng có thể theo dõi tiến trình xử lý thông qua các trạng thái như "Chờ xác nhận", "Đang chuẩn bị hàng", "Đang giao", "Đã giao hàng", "Hoàn thành", "Đã hủy" hoặc "Hoàn trả".
Khi đơn hàng được giao thành công đến địa chỉ nhận hàng, PawPal cập nhật trạng thái đơn hàng sang "Đã giao hàng" và gửi thông báo đến khách hàng. Sau khi kiểm tra và nhận đủ sản phẩm, khách hàng có thể sử dụng chức năng "Xác nhận đã nhận hàng" trên màn hình chi tiết đơn hàng.
Khi khách hàng xác nhận đã nhận hàng, PawPal cập nhật trạng thái đơn hàng sang "Hoàn thành", đồng thời lưu trữ đơn hàng vào khu vực "Lịch sử mua hàng" để phục vụ việc tra cứu và các hoạt động hậu mãi sau này. Trong trường hợp khách hàng không thực hiện xác nhận trong thời gian quy định, PawPal sẽ tự động cập nhật trạng thái đơn hàng sang "Hoàn thành" sau 03 ngày kể từ thời điểm giao hàng thành công.
Trong quá trình sử dụng sản phẩm, nếu khách hàng phát sinh nhu cầu hủy đơn hàng, đổi trả hoặc các yêu cầu hậu mãi khác, trạng thái đơn hàng sẽ được cập nhật tương ứng và phản ánh trực tiếp trên màn hình chi tiết đơn hàng. Toàn bộ lịch sử thay đổi trạng thái đều được lưu trữ nhằm đảm bảo tính minh bạch và hỗ trợ công tác tra cứu khi cần thiết.
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
3.1.11. Đánh giá
Mô tả quy trình nghiệp vụ
Quy trình đánh giá được thiết kế để lắng nghe phản hồi thực tế của khách hàng về chất lượng sản phẩm và dịch vụ. Ngay khi một giao dịch mua hàng hoặc dịch vụ Spa/Hotel chuyển sang trạng thái "Hoàn thành", Pawpal tự động gửi thông báo đến tài khoản khách hàng kèm đường dẫn trực tiếp đến form phản hồi. Khách hàng có thể chủ động vào "Lịch hẹn cho bé" (đối với dịch vụ) hoặc "Đơn hàng của tôi" (đối với sản phẩm Shop) trên trang cá nhân. Tại đây, khách hàng thấy danh sách các giao dịch đã hoàn thành nhưng chưa được đánh giá, kèm nút "Viết đánh giá" ngay bên cạnh.
Khi khách hàng nhấn vào thông báo hoặc chọn giao dịch từ danh sách, Pawpal hiển thị chính xác tên sản phẩm và hình ảnh minh họa hoặc tên dịch vụ tương ứng mà khách hàng không cần tự tìm lại. Đồng thời, Pawpal xác minh ngầm rằng đây đúng là giao dịch của khách hàng, nhằm đảm bảo mỗi lần mua hàng chỉ được đánh giá đúng một lần và không có phản hồi ảo.
Sau khi xác thực, khách hàng thấy form đánh giá gồm: chọn số sao từ 1 đến 5, viết nhận xét và tùy chọn đính kèm ảnh hoặc video thực tế.
Khi khách hàng hoàn tất điền form và nhấn "Gửi đánh giá", hệ thống sẽ lập tức lưu đánh giá vào cơ sở dữ liệu và tự động gắn nhãn "Người mua thực" (form hiển thị sẵn dòng lưu ý tĩnh về việc công khai thông tin để khách hàng biết trước).
Ngay sau khi lưu thành công, Pawpal xử lý hiển thị dựa trên mức hài lòng: đánh giá từ 4 sao trở lên được công khai ngay trên trang sản phẩm/dịch vụ tương ứng. Với các đánh giá dưới 4 sao vẫn được hiển thị công khai trên trang sản phẩm/dịch vụ, đồng thời trạng thái phản hồi được xác lập là “Đang chờ hỗ trợ” để Pawpal chủ động kích hoạt các bước hậu mãi bảo vệ quyền lợi khách hàng. Ngay sau đó, Pawpal cộng điểm thưởng Paw Points vào tài khoản như lời cảm ơn chân thành, chính thức kết thúc quy trình đánh giá.
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

3.1.12. Quy trình Đổi trả hàng
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
Xử lý ngoại lệ
Nếu Sản phẩm cần đổi đã hết hàng trong kho thì Pawpal hiển thị cảnh báo cho Nhân viên. Nhân viên liên hệ khách hàng để chuyển sang phương án hoàn tiền hoặc đổi sang sản phẩm tương đương.
Hàng trả về thực tế không khớp với khai báo: Để giữ trải nghiệm thân thiện, hệ thống không tự động phạt khách. Phiếu đổi trả sẽ chuyển trạng thái sang "Cần hỗ trợ trực tiếp". Nhân viên CSKH sẽ gọi điện/nhắn tin hỗ trợ khách xử lý thủ công.
Hoàn tiền cho đơn hàng COD thì khách hàng có thể điền Số tài khoản ngân hàng/Số MoMo ngay trên Form đổi trả. Nếu khách không điền, nhân viên CSKH sẽ liên hệ trực tiếp qua điện thoại trong vòng 24 giờ để xin thông tin chuyển khoản và thực hiện hoàn tiền thủ công cho khách.
Sau khi hoàn tiền thành công, hệ thống tự động cấn trừ số điểm tích lũy của sản phẩm đó trong tài khoản khách (số dư điểm tối thiểu là 0, không bao giờ bị âm). Bài đánh giá cũ của sản phẩm (nếu có) được gắn nhãn "Giao dịch đã hủy".
Một khi khách hàng đã thực hiện gửi đánh giá cho sản phẩm hoặc dịch vụ, đơn hàng đó sẽ được coi là đã chấp nhận hoàn thành tuyệt đối và hệ thống sẽ tự động ẩn/khóa nút "Yêu cầu đổi trả" của đơn hàng đó nhằm ngăn chặn việc trục lợi điểm thưởng từ đánh giá.
Khách hàng vãng lai yêu cầu đổi trả: Khách hàng nhập Mã đơn hàng và Số điện thoại mua hàng mà không cần đăng nhập tài khoản. Hai thông tin này đã đủ để xác minh quyền sở hữu đơn hàng, đơn giản hơn cho khách lớn tuổi.
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
Viết đánh giá tiêu chuẩn (chỉ có số sao và chữ nhận xét) | +1 điểm/lần
Viết đánh giá chất lượng cao (kèm hình ảnh/video thực tế) | +5 điểm/lần
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

3.3. Yêu cầu chức năng
3.3.1. Đăng ký và định danh

Mã số
Tên chức năng
Mô tả chi tiết
Ưu tiên
FR1-1
Đăng ký chủ động
Hệ thống phải cho phép người dùng tạo tài khoản mới bằng cách nhập đầy đủ: Họ tên, Số điện thoại (chưa tồn tại trong hệ thống) và Mật khẩu.
Rất cao
FR1-2
Xác thực OTP
Hệ thống phải tích hợp SMS Gateway để gửi mã OTP xác minh số điện thoại định danh ngay khi người dùng nhấn nút đăng ký.
Cao
FR1-3
Khởi tạo tài khoản tạm
Hệ thống phải tự động khởi tạo ngầm một tài khoản tạm gắn với số điện thoại của khách vãng lai khi họ thực hiện đặt lịch hoặc thanh toán đơn hàng lần đầu.
Cao
FR1-4
SMS Kích hoạt
Sau khi khách vãng lai hoàn tất giao dịch, hệ thống phải tự động gửi tin nhắn SMS chứa link kích hoạt và thiết lập mật khẩu (link có hiệu lực trong 48 giờ).
Rất cao
FR1-5
Đăng ký tại quầy
Hệ thống phải cung cấp giao diện quản trị cho Admin đăng ký nhanh tài khoản cho khách trực tiếp tại quầy chỉ với Họ tên và SĐT.
Trung bình
FR1-6
Tặng điểm thưởng
Hệ thống phải tự động cộng +50 Paw Points vào ví điểm thưởng của khách hàng ngay sau khi tài khoản được kích hoạt thành công (Đăng ký mới hoặc nâng cấp từ tài khoản tạm).
Cao


3.3.2. Đăng nhập và Bảo mật

Mã số
Tên chức năng
Mô tả chi tiết
Ưu tiên
FR2.1
Nhận diện tài khoản
Hệ thống phải cho phép người dùng nhập SĐT tại màn hình đăng nhập, tự động kiểm tra CSDL và điều hướng:
Nếu SĐT chưa đăng ký: Hiển thị thông báo lỗi và nút chuyển hướng sang trang Đăng ký.
Nếu SĐT là Thành viên chính thức: Hiển thị màn hình yêu cầu nhập mật khẩu.
Nếu SĐT là Khách vãng lai: Hiển thị tùy chọn đăng nhập bằng SMS.
Rất cao
FR2.2
Xác thực mật khẩu
Hệ thống phải đối chiếu mật khẩu người dùng nhập với mật khẩu đã mã hóa trong CSDL, báo lỗi nếu nhập sai.
Rất cao
FR2.3
Quên mật khẩu
Hệ thống phải cho phép người dùng yêu cầu khôi phục mật khẩu qua SĐT, tự động gửi link đặt lại mật khẩu qua SMS (hiệu lực 48 giờ).
Cao
FR2.4
Đăng nhập bằng SMS
Hệ thống phải hỗ trợ khách vãng lai đăng nhập thông qua Magic Link gửi qua SMS mà không cần nhập mật khẩu.
Rất cao
FR2.5
Gợi ý nâng cấp tài khoản
Hệ thống phải tự động hiển thị Popup nhắc nhở khách vãng lai thiết lập mật khẩu để nhận quà ngay khi họ đăng nhập vào Trang chủ bằng Magic Link.
Cao
FR2.6
Gộp lịch sử giao dịch
Hệ thống phải tự động đồng bộ và gộp toàn bộ lịch sử mua sắm/lịch hẹn cũ từ tài khoản tạm vào tài khoản mới ngay sau khi đăng nhập/kích hoạt thành công.
Cao
FR2.7
Đổi mật khẩu
Hệ thống phải cho phép người dùng thay đổi mật khẩu trong mục "Cấu hình tài khoản" và bắt buộc xác thực bằng mật khẩu cũ hoặc mã OTP gửi qua SMS trước khi lưu.


Cao


3.3.3. Quản lý hồ sơ bé cưng
Mã số
Tên chức năng
Mô tả chi tiết
Ưu tiên
FR3.1
Tạo hồ sơ thú cưng
Hệ thống phải cho phép thành viên đăng nhập tạo mới hồ sơ cho bé cưng bằng cách điền: Tên, Giống loài, Cân nặng, Ảnh đại diện, và các thông tin dị ứng/y tế đặc biệt.
Rất cao
FR3.2
Cấp mã định danh
Hệ thống phải tự động tạo một mã Pet ID duy nhất cho mỗi hồ sơ thú cưng mới để phục vụ liên kết dữ liệu.
Cao
FR3.3
Cập nhật hồ sơ
Hệ thống phải cho phép người dùng chỉnh sửa thông tin hoặc cập nhật cân nặng/hình ảnh mới nhất của thú cưng.
Cao
FR3.4
Đánh dấu thông tin y tế
Hệ thống phải tự động bôi đỏ và làm nổi bật các trường dữ liệu "Dị ứng" và "Lưu ý y tế" của thú cưng trên giao diện quản lý của Admin và nhân viên Spa.
Rất cao
FR3.5
Lưu trữ lịch sử
Hệ thống phải tự động ghi nhận và hiển thị lịch sử sử dụng dịch vụ của thú cưng theo dòng thời gian dựa trên mã Pet ID tương ứng.
Cao
FR3.6
Xóa và khôi phục hồ sơ
Hệ thống phải hỗ trợ đưa hồ sơ thú cưng bị xóa vào "Kho lưu trữ tạm thời" trong 30 ngày để khách hàng có thể tự khôi phục trước khi xóa vĩnh viễn khỏi CSDL.
Cao

3.3.4. Quản lý đặt lịch hẹn

Mã số
Tên chức năng
Mô tả chi tiết
Ưu tiên
FR4.1
Giao diện đặt lịch
Hệ thống phải cung cấp giao diện trực quan cho phép khách hàng chọn loại dịch vụ, khung giờ trống và nhân viên chăm sóc yêu thích.
Rất cao
FR4.2
Đồng bộ giờ trống
Hệ thống phải hiển thị trạng thái các khung giờ trống theo thời gian thực dựa trên lịch làm việc thực tế của nhân viên và công suất thiết bị tại cơ sở.
Cao
FR4.3
Tự động tải Pet ID
Đối với thành viên đã đăng nhập, hệ thống phải tự động tải danh sách thú cưng hiện có của họ để chọn nhanh mà không cần nhập lại thông tin.
Cao
FR4.4
Đặt lịch vãng lai
Hệ thống phải cho phép khách vãng lai điền thông tin liên hệ và thông tin cơ bản của thú cưng để hoàn tất đặt lịch. Nếu phát hiện số điện thoại đã đăng ký thành viên, hệ thống hiển thị ô nhập mật khẩu kèm các tùy chọn đăng nhập nhanh bằng SMS (OTP) hoặc link Quên mật khẩu tại chỗ để khách hàng xác thực thuận tiện nhất
Rất cao
FR4.5
Khóa giữ chỗ tạm thời
Hệ thống phải tự động khóa tạm thời khung giờ khách hàng đang chọn trong 15 phút và hiển thị đồng hồ đếm ngược trên màn hình.
Cao
FR4.6
Tính giá tự động
Hệ thống phải tự động áp đơn giá dịch vụ dựa trên Giống loài và Cân nặng của thú cưng, đồng thời hiển thị thông tin lưu ý về việc cân lại thực tế tại quầy trên hóa đơn tạm tính.
Cao
FR4.7
Đồng bộ lịch vận hành
Sau khi xác nhận thành công, hệ thống phải chuyển lịch hẹn sang trạng thái "Đã đặt", đồng bộ lên màn hình quản lý lịch của Admin và gửi tin nhắn SMS xác nhận về điện thoại khách.
Cao


3.3.5. Thay đổi lịch hẹn

Mã số
Tên chức năng
Mô tả chi tiết
Ưu tiên
FR5.1
Yêu cầu thay đổi
Hệ thống phải cho phép khách hàng thực hiện thay đổi lịch hẹn trực tuyến trên website đối với các lịch hẹn đang ở trạng thái "Đã xác nhận".
Rất cao
FR5.2
Ràng buộc thời gian
Hệ thống phải vô hiệu hóa chức năng thay đổi lịch và ẩn nút "Thay đổi" nếu thời gian còn lại dưới 2 tiếng trước giờ hẹn bắt đầu.
Cao
FR5.3
Giới hạn số lần đổi
Hệ thống phải giới hạn mỗi lịch hẹn chỉ được thay đổi trực tuyến tối đa 02 lần, từ lần thứ 3 bắt buộc khách hàng phải liên hệ Hotline.
Cao
FR5.4
Khóa giữ chỗ lịch mới
Hệ thống phải tự động khóa tạm thời khung giờ mới trong 15 phút trong khi giữ nguyên khung giờ cũ cho đến khi khách hàng bấm xác nhận thay đổi thành công.
Rất cao
FR5.5
Tính toán chênh lệch giá
Hệ thống phải tự động tính hiệu số chênh lệch giá giữa khung giờ/dịch vụ mới và cũ, hiển thị số tiền khách cần đóng thêm hoặc số tiền dư.
Cao
FR5.6
Bảo mật tài khoản tạm
Đối với tài khoản tạm, hệ thống phải yêu cầu xác thực truy cập qua link định danh SMS mới cho phép thao tác đổi lịch.
Cao
FR5.7
Giải phóng ô lịch cũ
Ngay sau khi thay đổi thành công, hệ thống phải cập nhật lịch hẹn mới, gửi tin nhắn thông báo cho khách và giải phóng ô lịch cũ về trạng thái "Trống" cho người dùng khác đặt lịch.
Cao


3.3.6. Hủy lịch hẹn

Mã số
Tên chức năng
Mô tả chi tiết
Ưu tiên
FR6.1
Kiểm tra điều kiện hủy lịch
Hệ thống tự động kiểm tra trạng thái lịch hẹn và thời gian còn lại trước giờ sử dụng dịch vụ; chỉ hiển thị nút "Hủy lịch" đối với các lịch còn tối thiểu 02 giờ trước thời điểm bắt đầu dịch vụ.
Rất cao
FR6.2
Xác nhận yêu cầu hủy lịch
Khi khách hàng chọn chức năng "Hủy lịch", hệ thống hiển thị hộp thoại xác nhận để tránh thao tác nhầm. Chỉ khi khách hàng xác nhận lần cuối, hệ thống mới tiếp tục xử lý yêu cầu hủy.
Rất cao
FR6.3
Cập nhật trạng thái lịch hẹn
Sau khi xác minh điều kiện hợp lệ, hệ thống cập nhật trạng thái lịch hẹn từ "Đã xác nhận" sang "Đã hủy" và khóa không cho phép thực hiện lại thao tác hủy hoặc khôi phục lịch hẹn.
Rất cao
FR6.4
Giải phóng khung giờ đặt lịch
Ngay sau khi hủy thành công, hệ thống tự động giải phóng khung giờ tương ứng và cập nhật lại lịch trống để khách hàng khác có thể đặt lịch.
Cao
FR6.5
Gửi thông báo hủy lịch
Hệ thống tự động gửi thông báo xác nhận hủy lịch đến khách hàng và Admin thông qua SMS 
Cao
FR6.6
Lưu lịch sử hủy lịch
Hệ thống lưu lại toàn bộ thông tin lịch hẹn đã hủy trong lịch sử đặt lịch của khách hàng, bao gồm thời gian hủy, người thực hiện hủy và lý do hủy.
Cao
FR6.7
Ghi nhận nhật ký hệ thống (Audit Log)
Hệ thống ghi nhận toàn bộ thao tác hủy lịch vào nhật ký hệ thống để phục vụ kiểm tra, đối soát dữ liệu và xử lý khiếu nại phát sinh sau này.
Cao
FR6.8
Theo dõi tần suất hủy lịch
Hệ thống tự động thống kê số lần hủy lịch của từng khách hàng và lưu vào hồ sơ khách hàng nhằm hỗ trợ phân tích hành vi sử dụng dịch vụ.
Trung bình
FR6.9
Cảnh báo hành vi hủy lịch bất thường
Khi khách hàng hủy lịch vượt quá ngưỡng được cấu hình trong một khoảng thời gian nhất định (> 3 lần), hệ thống tự động gắn cờ cảnh báo nội bộ để Admin theo dõi hoặc áp dụng chính sách hạn chế đặt lịch trực tuyến.
Trung bình
FR6.10
Kiểm soát xung đột dữ liệu
Hệ thống khóa lịch hẹn trong quá trình xử lý hủy nhằm ngăn chặn các thao tác đồng thời như Check-in, thay đổi lịch hoặc chỉnh sửa trạng thái từ phía Admin gây sai lệch dữ liệu.
Cao
FR6.11
Khôi phục giao dịch khi lỗi cập nhật
Nếu xảy ra lỗi trong quá trình cập nhật trạng thái hoặc giải phóng khung giờ, hệ thống phải rollback toàn bộ giao dịch và giữ nguyên trạng thái lịch hẹn ban đầu nhằm đảm bảo tính toàn vẹn dữ liệu.
Rất cao
FR6.12
Xử lý mất kết nối hoặc hủy thao tác
Nếu khách hàng đóng trình duyệt, thoát trang hoặc mất kết nối trước khi xác nhận cuối cùng, hệ thống không thực hiện bất kỳ thay đổi nào đối với lịch hẹn.
Trung bình


3.3.7. Theo dõi dịch vụ

Mã số
Tên chức năng
Mô tả chi tiết
Ưu tiên
FR7.1
Khởi tạo phiên theo dõi dịch vụ
Khi lịch hẹn được chuyển sang trạng thái "Đã tiếp nhận", hệ thống tự động tạo một phiên "Theo dõi trải nghiệm dịch vụ" và liên kết với lịch hẹn cùng hồ sơ Pet ID tương ứng.
Rất cao
FR7.2
Quản lý trạng thái phiên dịch vụ
Hệ thống quản lý vòng đời phiên theo dõi gồm các trạng thái: Đang hoạt động, Tạm gián đoạn và Hoàn tất; đảm bảo mỗi lịch hẹn chỉ có duy nhất một phiên theo dõi đang hoạt động tại cùng thời điểm.
Rất cao
FR7.3
Cập nhật Timeline chăm sóc
Hệ thống cho phép nhân viên phụ trách cập nhật các cột mốc dịch vụ như: Đang tắm, Đang sấy lông, Đang nghỉ ngơi, Đã cho ăn, Đã uống thuốc, Hoàn tất chăm sóc,... lên Timeline của thú cưng.
Rất cao
FR7.4
Ghi nhận thời gian thực (Timestamp)
Mỗi trạng thái, hình ảnh hoặc ghi chú được cập nhật phải được hệ thống tự động gắn timestamp nhằm đảm bảo tính minh bạch và khả năng tra soát dữ liệu.
Rất cao
FR7.5
Tải lên hình ảnh và video
Hệ thống cho phép nhân viên tải lên hình ảnh hoặc video trong quá trình chăm sóc; dữ liệu được liên kết trực tiếp với phiên dịch vụ hiện tại của thú cưng.
Cao
FR7.6
Hiển thị Timeline theo thời gian thực
Hệ thống hiển thị các cập nhật mới nhất trên Nhật ký thú cưng theo thứ tự từ mới đến cũ và tự động đồng bộ khi có dữ liệu mới.
Rất cao
FR7.7
Thông báo cập nhật cho khách hàng
Khi có cập nhật mới trên Timeline, hệ thống gửi thông báo đến Trung tâm thông báo của khách hàng để tăng khả năng theo dõi dịch vụ theo thời gian thực.
Cao
FR7.8
Tạo ghi chú khẩn cấp
Nhân viên được phép tạo các ghi chú đặc biệt hoặc khẩn cấp liên quan đến sức khỏe và tình trạng của thú cưng như bỏ ăn, dị ứng, căng thẳng hoặc cần xử lý y tế cơ bản.
Cao
FR7.9
Gửi cảnh báo khẩn cấp qua SMS
Khi xuất hiện ghi chú khẩn cấp, hệ thống tự động gửi SMS đến chủ nuôi nhằm đảm bảo thông tin được tiếp nhận nhanh chóng.
Cao
FR7.10
Quản lý phản hồi khách hàng
Hệ thống cho phép khách hàng gửi phản hồi hoặc hướng dẫn bổ sung liên quan đến ghi chú khẩn cấp; toàn bộ nội dung trao đổi được lưu vào lịch sử chăm sóc.
Trung bình
FR7.11
Kiểm soát quyền cập nhật Timeline
Chỉ nhân viên được phân công thực hiện dịch vụ hoặc Admin mới được phép tạo, chỉnh sửa hoặc cập nhật dữ liệu trên Timeline.
Rất cao
FR7.12
Kiểm soát quyền truy cập Nhật ký
Chỉ chủ sở hữu thú cưng hoặc tài khoản được ủy quyền hợp lệ mới được phép truy cập dữ liệu Nhật ký chăm sóc.
Rất cao
FR7.13
Hiển thị trạng thái chờ cập nhật
Nếu phiên dịch vụ chưa có bất kỳ cập nhật nào sau khi check-in, hệ thống hiển thị thông báo "Dịch vụ đang được chuẩn bị, vui lòng chờ cập nhật từ nhân viên".
Trung bình
FR7.14
Kết thúc và lưu trữ phiên dịch vụ
Khi nhân viên cập nhật trạng thái "Hoàn tất dịch vụ", hệ thống tự động đóng phiên theo dõi và chuyển toàn bộ dữ liệu sang kho lưu trữ Nhật ký cũ.
Rất cao
FR7.15
Khóa chỉnh sửa sau khi hoàn tất
Sau khi phiên dịch vụ được đóng, hệ thống tự động khóa toàn bộ quyền chỉnh sửa, xóa hoặc cập nhật Timeline nhằm đảm bảo tính toàn vẹn dữ liệu.
Rất cao
FR7.16
Quản lý Nhật ký lưu trữ
Hệ thống cho phép khách hàng xem lại các nhật ký chăm sóc trước đây theo từng lần sử dụng dịch vụ, bao gồm hình ảnh, video, trạng thái và ghi chú liên quan.
Cao
FR7.17
Ghi nhận Audit Log
Mọi thao tác thêm mới, chỉnh sửa, tải ảnh, tạo ghi chú hoặc đóng phiên dịch vụ đều phải được ghi nhận vào nhật ký hệ thống.
Cao
FR7.18
Đồng bộ dữ liệu khi kết nối lại
Nếu khách hàng mất kết nối hoặc rời khỏi website trong lúc theo dõi, hệ thống phải tự động tải lại toàn bộ Timeline mới nhất khi truy cập trở lại.
Trung bình
FR7.19
Kiểm tra dữ liệu tải lên
Hệ thống kiểm tra định dạng, dung lượng và tính hợp lệ của hình ảnh/video trước khi cho phép lưu vào hệ thống.
Cao
FR7.20
Lưu tạm dữ liệu khi mất kết nối
Nếu nhân viên mất kết nối mạng trong lúc cập nhật Timeline, hệ thống phải hỗ trợ lưu nháp tạm thời và đồng bộ lại khi kết nối được khôi phục.
Trung bình
FR7.21
Xử lý xung đột cập nhật
Khi nhiều nhân viên cùng cập nhật trên một Timeline tại cùng thời điểm, hệ thống phải ghi nhận lịch sử thay đổi và ưu tiên bản ghi mới nhất theo timestamp.
Cao


3.3.8. Mua sắm

Mã số
Tên chức năng
Mô tả chi tiết
Ưu tiên
FR8.1
Hiển thị danh mục sản phẩm
Hệ thống truy xuất dữ liệu từ CSDL Sản phẩm và hiển thị danh sách sản phẩm theo danh mục, thương hiệu, giá bán, loại thú cưng và tình trạng tồn kho để hỗ trợ khách hàng tìm kiếm sản phẩm phù hợp.
Rất cao
FR8.2
Tìm kiếm sản phẩm
Hệ thống cho phép khách hàng tìm kiếm sản phẩm theo từ khóa. Kết quả tìm kiếm được đối chiếu theo tên sản phẩm, thương hiệu, mô tả và từ khóa liên quan trong CSDL Sản phẩm.
Rất cao
FR8.3
Lọc sản phẩm nâng cao
Hệ thống hỗ trợ lọc sản phẩm theo nhiều tiêu chí như danh mục, thương hiệu, mức giá, đối tượng thú cưng, độ tuổi và trạng thái còn hàng nhằm giúp khách hàng thu hẹp phạm vi tìm kiếm.
Cao
FR8.4
Gợi ý sản phẩm thay thế
Khi không tìm thấy sản phẩm phù hợp hoặc sản phẩm đã hết hàng, hệ thống hiển thị danh sách sản phẩm tương tự hoặc sản phẩm bán chạy nhằm tăng khả năng chuyển đổi đơn hàng.
Trung bình
FR8.5
Xem chi tiết sản phẩm
Hệ thống hiển thị đầy đủ thông tin sản phẩm bao gồm hình ảnh, mô tả, giá bán, đánh giá khách hàng, tồn kho khả dụng, hướng dẫn sử dụng và sản phẩm liên quan.
Rất cao
FR8.6
Kiểm tra trạng thái tồn kho
Hệ thống tự động kiểm tra và hiển thị trạng thái tồn kho theo thời gian thực. Đối với sản phẩm hết hàng, hệ thống hiển thị nhãn "Tạm hết hàng" và vô hiệu hóa nút "Thêm vào giỏ hàng".
Rất cao
FR8.7
Thêm sản phẩm vào Wishlist
Hệ thống cho phép khách hàng lưu sản phẩm yêu thích để xem lại sau. Đối với người dùng đăng nhập, Wishlist được đồng bộ trên nhiều thiết bị; đối với khách vãng lai, dữ liệu được lưu trên session trình duyệt.
Cao
FR8.8
Quản lý Wishlist
Hệ thống cho phép khách hàng xem, xóa hoặc chuyển sản phẩm từ Wishlist sang Giỏ hàng mà không cần tìm kiếm lại sản phẩm.
Trung bình
FR8.9
Thêm sản phẩm vào giỏ hàng
Khi khách hàng chọn "Thêm vào giỏ hàng", hệ thống kiểm tra tồn kho và ghi nhận sản phẩm vào giỏ hàng nếu số lượng yêu cầu hợp lệ.
Rất cao
FR8.10
Kiểm tra tồn kho khi thêm sản phẩm
Hệ thống tự động đối chiếu số lượng yêu cầu với tồn kho thực tế. Nếu vượt quá số lượng khả dụng, hệ thống từ chối thao tác và hiển thị số lượng tối đa có thể mua.
Rất cao
FR8.11
Hiển thị thông tin giỏ hàng
Hệ thống hiển thị danh sách sản phẩm đã chọn cùng các thông tin gồm tên sản phẩm, số lượng, đơn giá, thành tiền và tổng giá trị đơn hàng tạm tính.
Rất cao
FR8.12
Cập nhật số lượng sản phẩm trong giỏ
Hệ thống cho phép khách hàng tăng hoặc giảm số lượng sản phẩm trong giỏ hàng và tự động kiểm tra lại tồn kho sau mỗi lần cập nhật.
Rất cao
FR8.13
Xóa sản phẩm khỏi giỏ hàng
Hệ thống cho phép khách hàng loại bỏ sản phẩm khỏi giỏ hàng và cập nhật lại tổng giá trị đơn hàng ngay lập tức.
Cao
FR8.14
Áp dụng mã giảm giá
Hệ thống cho phép khách hàng nhập mã khuyến mãi, kiểm tra điều kiện áp dụng và tính toán lại giá trị đơn hàng sau khi ưu đãi được chấp nhận.
Cao
FR8.15
Tính toán tổng đơn hàng
Hệ thống tự động tính toán tổng tiền hàng, giảm giá, phí vận chuyển (nếu có) và tổng giá trị thanh toán dự kiến sau mỗi thay đổi trong giỏ hàng.
Rất cao
FR8.16
Kiểm tra tồn kho thời gian thực trong giỏ hàng
Hệ thống tiếp tục kiểm tra tồn kho định kỳ hoặc khi khách hàng thao tác trong giỏ hàng nhằm phát hiện trường hợp sản phẩm vừa hết hàng hoặc số lượng tồn thay đổi.
Rất cao
FR8.17
Lưu giỏ hàng tạm thời
Hệ thống tự động lưu dữ liệu giỏ hàng để hỗ trợ khách hàng khôi phục trạng thái mua sắm khi quay lại website.
Cao
FR8.18
Đồng bộ giỏ hàng theo tài khoản
Đối với khách hàng đã đăng nhập, dữ liệu giỏ hàng phải được đồng bộ giữa các thiết bị thông qua tài khoản người dùng.
Cao
FR8.19
Chuyển sang bước thanh toán
Khi khách hàng xác nhận tiếp tục mua hàng, hệ thống kiểm tra lần cuối tính hợp lệ của giỏ hàng và chuyển dữ liệu sang quy trình Thanh toán đơn hàng.
Rất cao
FR8.20
Ghi nhận nhật ký hành vi mua sắm
Hệ thống ghi nhận các thao tác tìm kiếm, xem sản phẩm, thêm vào Wishlist, thêm/xóa sản phẩm trong giỏ hàng và áp dụng mã giảm giá nhằm phục vụ phân tích hành vi khách hàng và cá nhân hóa trải nghiệm mua sắm.
Trung bình
FR8.21
Xử lý xung đột tồn kho
Khi nhiều khách hàng cùng đặt mua một sản phẩm giới hạn số lượng, hệ thống phải ưu tiên người hoàn tất thao tác trước và cập nhật tồn kho theo thời gian thực để ngăn ngừa overselling.
Rất cao
FR8.22
Khôi phục giỏ hàng sau mất kết nối
Nếu khách hàng mất kết nối hoặc đóng trình duyệt trong quá trình mua sắm, hệ thống phải khôi phục dữ liệu giỏ hàng gần nhất khi khách truy cập lại website.
Cao


3.3.9. Thanh toán

Mã số
Tên chức năng
Mô tả chi tiết
Ưu tiên
FR9.1
Kiểm tra đơn hàng trước thanh toán
Hệ thống kiểm tra lại sản phẩm, số lượng, giá bán, mã giảm giá và tồn kho trước khi khởi tạo giao dịch thanh toán.
Rất cao
FR9.2
Quản lý thông tin giao hàng
Hệ thống tự động điền thông tin giao hàng đối với khách đã đăng nhập hoặc yêu cầu khách vãng lai nhập thông tin nhận hàng bắt buộc.
Rất cao
FR9.3
Hiển thị và lựa chọn phương thức thanh toán
Hệ thống cho phép khách hàng lựa chọn COD hoặc thanh toán trực tuyến thông qua cổng thanh toán tích hợp.
Rất cao
FR9.4
Khởi tạo giao dịch thanh toán
Hệ thống tạo giao dịch thanh toán, sinh mã giao dịch duy nhất và chuyển hướng người dùng đến cổng thanh toán nếu chọn thanh toán online.
Rất cao
FR9.5
Tiếp nhận và xử lý kết quả thanh toán
Hệ thống nhận phản hồi từ cổng thanh toán, xác minh giao dịch và cập nhật trạng thái đơn hàng tương ứng.
Rất cao
FR9.6
Hiển thị kết quả giao dịch
Hệ thống hiển thị trang giao dịch thành công hoặc thất bại cùng thông tin đơn hàng và trạng thái thanh toán.
Rất cao
FR9.7
Hỗ trợ thanh toán lại
Đối với giao dịch thất bại, hệ thống cho phép khách hàng thực hiện thanh toán lại mà không cần tạo đơn hàng mới.
Cao
FR9.8
Kiểm soát giao dịch trùng lặp
Hệ thống áp dụng cơ chế khóa giao dịch và kiểm tra mã giao dịch nhằm ngăn ngừa thanh toán trùng nhiều lần trên cùng một đơn hàng.
Rất cao
FR9.9
Đồng bộ tồn kho sau thanh toán
Sau khi thanh toán thành công, hệ thống tự động cập nhật hoặc khóa số lượng tồn kho tương ứng với đơn hàng.
Rất cao
FR9.10
Tích lũy điểm thưởng Paw Points
Hệ thống tự động tính toán và cộng điểm thưởng cho khách hàng sau khi giao dịch hoàn tất thành công.
Trung bình
FR9.11
Lưu lịch sử giao dịch
Hệ thống lưu toàn bộ thông tin thanh toán và trạng thái giao dịch để khách hàng và Admin có thể tra cứu sau này.
Cao
FR9.12
Ghi nhật ký và bảo mật giao dịch
Hệ thống ghi nhận nhật ký thanh toán, mã hóa dữ liệu và đảm bảo không lưu trữ thông tin thanh toán nhạy cảm của khách hàng.
Cao


3.3.10. Quản lý đơn hàng

Mã số
Tên chức năng
Mô tả chi tiết
Ưu tiên
FR10.1
Xem danh sách đơn hàng
Hệ thống cho phép khách hàng truy cập màn hình "Đơn hàng của tôi" để xem danh sách toàn bộ đơn hàng đã phát sinh. Mỗi đơn hàng hiển thị các thông tin cơ bản gồm mã đơn hàng, ngày đặt hàng, tổng tiền, trạng thái thanh toán và trạng thái vận chuyển hiện tại.
Cao
FR10.2
Xem chi tiết đơn hàng
Hệ thống cho phép khách hàng xem chi tiết một đơn hàng cụ thể bao gồm danh sách sản phẩm, số lượng, đơn giá, tổng tiền, địa chỉ giao hàng, phương thức thanh toán và lịch sử trạng thái xử lý đơn hàng.
Cao
FR10.3
Theo dõi trạng thái đơn hàng
Hệ thống hiển thị tiến trình xử lý đơn hàng theo thời gian thực với các trạng thái như Chờ xác nhận, Đang chuẩn bị hàng, Đang giao, Hoàn thành, Đã hủy hoặc Hoàn trả.
Cao
FR10.4
Cập nhật trạng thái đơn hàng
Hệ thống cho phép Admin hoặc Staff được phân quyền cập nhật trạng thái đơn hàng theo quy trình xử lý thực tế. Mọi thay đổi phải được ghi nhận vào lịch sử trạng thái đơn hàng.
Cao
FR10.5
Gửi thông báo thay đổi trạng thái
Hệ thống tự động gửi thông báo đến khách hàng khi trạng thái đơn hàng thay đổi nhằm giúp khách hàng theo dõi tiến độ xử lý mà không cần truy cập thường xuyên vào hệ thống.
Trung bình
FR10.6
Lưu trữ lịch sử mua hàng
Hệ thống lưu trữ toàn bộ đơn hàng đã hoàn thành, đã hủy hoặc hoàn trả để khách hàng có thể tra cứu lại lịch sử giao dịch bất kỳ lúc nào.
Trung bình
FR10.7
Đồng bộ dữ liệu tồn kho khi xử lý đơn hàng
Khi Admin xác nhận đơn hàng hoặc thực hiện hủy/hoàn trả đơn hàng, hệ thống tự động cập nhật số lượng tồn kho tương ứng nhằm đảm bảo tính chính xác dữ liệu kho.
Cao
FR10.8
Ghi nhận nhật ký xử lý đơn hàng
Hệ thống ghi nhận toàn bộ thao tác cập nhật trạng thái, thời gian xử lý và người thực hiện để phục vụ tra soát, kiểm tra nội bộ và xử lý khiếu nại khi cần thiết.
Trung bình


3.3.11. Đánh giá

Mã số
Tên chức năng
Mô tả chi tiết
Ưu tiên
FR11.1
Tự động gửi thông báo đánh giá
Ngay khi giao dịch chuyển sang trạng thái "Hoàn thành", hệ thống tự động gửi thông báo kèm đường dẫn trực tiếp đến form phản hồi.
Cao
FR11.2
Tự động tải thông tin giao dịch
Khi người dùng mở form đánh giá, hệ thống tự động hiển thị chính xác tên, hình ảnh minh họa của sản phẩm/dịch vụ tương ứng.
Cao
FR11.3
Xác thực quyền đánh giá ngầm
Hệ thống kiểm tra ngầm để đảm bảo người dùng hiện tại đúng là người thực hiện giao dịch và mỗi giao dịch chỉ được phép đánh giá 1 lần.
Cao
FR11.4
Ghi nhận thông tin Form đánh giá
Cho phép người dùng chọn số sao (bắt buộc từ 1 - 5), viết nhận xét (tùy chọn) và đính kèm hình ảnh/video thực tế (tùy chọn).
Cao
FR11.5
Xác nhận công khai phản hồi
Nếu phản hồi tốt đạt 4-5 sao sẽ hiển thị ô tick chọn "Bạn có muốn công khai phản hồi này lên trang chủ của chúng tôi không?". Nếu chọn "Không" thì hệ thống chỉ lưu vào CSDL, ngược lại thì hệ thống tự động cập nhật lên trang chủ.
Trung bình
FR11.6
Tự động lọc từ ngữ vi phạm
Tích hợp bộ lọc từ khóa để tự động phát hiện, ngăn chặn hoặc đề nghị viết đánh giá không được chứa từ ngữ xúc phạm, vi phạm tiêu chuẩn cộng đồng.
Cao
FR11.7
Tặng điểm thưởng Paw Points
Tự động cộng 5 điểm thưởng Paw Points vào tài khoản khách hàng ngay sau khi lưu đánh giá thành công.
Cao
FR11.8
Kiểm soát dung lượng và định dạng tệp
Kiểm tra tệp đính kèm; nếu quá dung lượng hoặc sai định dạng, hiển thị thông báo lỗi cụ thể và giữ nguyên nội dung form để khách điều chỉnh lại.
Cao


3.3.12. Quy trình Đổi trả hàng

Mã số
Tên chức năng
Mô tả chi tiết
Ưu tiên
FR12.1
Kiểm tra thời hạn đổi trả
Hệ thống tự động kiểm tra thời hạn 7 ngày kể từ khi đơn hàng chuyển sang "Hoàn thành". Chỉ hiển thị nút "Yêu cầu đổi trả" với sản phẩm vật lý còn trong hạn, quá hạn nút sẽ tự động ẩn.
Cao
FR12.2
Ghi nhận yêu cầu đổi trả
Cho phép khách hàng chọn hình thức (Đổi hàng mới hoặc Hoàn tiền), chọn/nhập lý do chi tiết và bắt buộc đính kèm ảnh/video thực tế làm minh chứng.
Cao
FR12.3
Tạo đơn đổi hàng mới 0đ
Nếu khách chọn "Đổi hàng", hệ thống tự động tạo một đơn hàng mới giá trị 0đ, khách chỉ bù tiền nếu đổi sang sản phẩm giá cao hơn.
Cao
FR12.4
Tính toán số tiền hoàn trả
Nếu khách chọn "Hoàn tiền", hệ thống tự động tính số tiền hoàn lại bằng 100% giá trị thực trả của sản phẩm, sau khi trừ các mã giảm giá đã áp dụng.
Rất cao
FR12.5
Tự động thử lại khi lỗi cổng thanh toán
Nếu mất kết nối cổng thanh toán khi hoàn tiền online, hệ thống lưu trạng thái "Hoàn tiền thất bại", tự động thử lại sau mỗi 30 phút (tối đa 3 lần) trước khi báo lỗi kỹ thuật.
Cao
FR12.6
Giới hạn sàn điểm thưởng 
Khi thu hồi điểm, nếu tài khoản khách không đủ điểm, hệ thống chỉ khấu trừ đến mức tối thiểu là 0 điểm, không được phép hiển thị số điểm âm.
Cao
FR12.7
Đổi trả cho khách vãng lai
Cho phép khách hàng vãng lai thực hiện yêu cầu đổi trả bằng cách nhập Mã đơn hàng và Số điện thoại mua hàng mà không cần đăng nhập tài khoản.
Cao



3.3.13. Ưu đãi thành viên


Mã số
Tên chức năng
Mô tả chi tiết
Ưu tiên
FR13.1
Tự động tính điểm theo hóa đơn
Hệ thống tự động cộng điểm thưởng theo tỷ lệ: 10.000 VNĐ hóa đơn = 1 Paw Point ngay khi đơn hàng/dịch vụ chuyển sang trạng thái "Hoàn thành".
Cao
FR13.2
Cộng điểm thưởng theo hoạt động
Hệ thống tự động cộng điểm cho các sự kiện: đăng ký tài khoản mới (+50), đánh giá phản hồi (+5/lần), sinh nhật thú cưng (+20/năm), giới thiệu bạn bè (+30/người).
Cao
FR13.3
Tự động phân hạng thành viên
Hệ thống tự động tính tổng chi tiêu lũy kế của khách hàng để xếp hạng: Bạc (< 5tr VNĐ), Vàng (từ 5tr - 15tr VNĐ), Kim Cương (> 15tr VNĐ).
Cao
FR13.4
Hiển thị thông tin ưu đãi cá nhân hóa
Hệ thống hiển thị số điểm hiện tại, hạng thành viên, số điểm cần tích lũy để lên hạng tiếp theo và lọc các voucher phù hợp theo hạng.
Cao
FR13.5
Kiểm tra điều kiện đổi ưu đãi
Hệ thống kiểm tra số điểm: nếu không đủ, hiển thị thông báo lỗi kèm gợi ý tích điểm; nếu đủ, hiển thị cửa sổ xác nhận trừ điểm.
Cao
FR13.6
Khởi tạo và lưu trữ Voucher
Sau khi xác nhận đổi quà thành công, hệ thống sinh mã ưu đãi riêng gắn với tài khoản, kèm thông tin hạn dùng và điều kiện áp dụng.
Cao
FR13.7
Ràng buộc áp dụng Voucher
Hệ thống áp dụng quy tắc 1 voucher chỉ áp dụng cho 1 đơn hàng/dịch vụ, không quy đổi thành tiền mặt, nhưng cho phép áp dụng đồng thời với khuyến mãi chung của Pawpal.
Cao
FR13.8
Quản lý thời hạn và thông báo hết hạn điểm
Điểm Paw Points tự động hết hạn sau 12 tháng kể từ giao dịch cuối. Hệ thống tự động quét và gửi thông báo nhắc nhở cho khách hàng 30 ngày trước khi điểm hết hạn.
Cao
FR13.9
Đồng bộ dữ liệu ưu đãi
Sau mỗi lần khách hàng tích điểm hay sử dụng ưu đãi, hệ thống tự động đồng bộ lại dữ liệu và hiển thị lên giao diện.
Cao
FR13.10
Yêu cầu mật khẩu bảo vệ điểm thưởng
Bắt buộc khách hàng phải thiết lập mật khẩu tài khoản trước khi thực hiện đổi quà. Nếu là khách vãng lai, hiển thị form hướng dẫn tạo mật khẩu trước khi quay lại trang đổi quà.
Cao


3.3.14. Quản lý thông báo

Mã số
Tên chức năng
Mô tả chi tiết
Ưu tiên
FR14.1
Cá nhân hóa nội dung thông báo
Hệ thống tự động trích xuất dữ liệu để chèn tên khách hàng và tên thú cưng vào nội dung thông báo. Nếu thú cưng chưa có tên, tự động dùng "Bé cưng của bạn".
Cao
FR14.2
Hiển thị thông báo đa hình thức
Hỗ trợ hiển thị dưới 2 dạng gồm thông báo đẩy ở góc màn hình và danh sách trong biểu tượng chuông thông báo. Các thông báo được sắp xếp theo thứ tự mới đến cũ và tự động gắn nhãn phân loại (dịch vụ, mua sắm, ưu đãi)
Cao
FR14.3
Quản lý dọn dẹp thông báo
Cung cấp chức năng "Đánh dấu đã đọc tất cả" và "Xóa thông báo". Khi chọn xóa, hệ thống hiển thị hộp thoại yêu cầu xác nhận trước khi thực hiện.
Trung bình
FR14.4
Ràng buộc khung giờ gửi thông báo marketing
Hệ thống chỉ cho phép gửi thông báo mang tính chất khuyến mãi/marketing trong khung giờ từ 08:00 đến 21:00. Các thông báo giao dịch/hệ thống được gửi 24/7.
Cao
FR14.5
Giới hạn tần suất thông báo marketing
Kiểm soát tần suất gửi thông báo marketing không vượt quá 03 thông báo/tuần.
Trung bình
FR14.6
Tự động dọn dẹp bộ nhớ (Xóa định kỳ)
Hệ thống tự động quét và xóa vĩnh viễn các thông báo đã lưu trữ quá 90 ngày trong danh sách "Thông báo của tôi".
Thấp
FR14.7
Cài đặt nhận thông báo
Hệ thống kiểm tra cấu hình quyền riêng tư của người dùng trước khi gửi. Nếu người dùng tắt thông báo, hệ thống chặn gửi thông báo marketing và chỉ gửi thông báo Dịch vụ khẩn cấp.
Cao


3.3.15. Hỗ trợ khách hàng

Mã số
Tên chức năng
Mô tả chi tiết
Ưu tiên
FR15.1
Hiển thị và tìm kiếm FAQ thông minh
Hiển thị danh sách câu hỏi thường gặp phân loại theo chủ đề (tài khoản, đặt lịch, chính sách,..) và cung cấp thanh tìm kiếm thông minh hỗ trợ khách hàng tự tra cứu.
Cao
FR15.2
Chatbot AI cá nhân hóa
Tích hợp Pawpal AI Chatbot có khả năng tự động tra cứu dữ liệu lịch hẹn, nhật ký chăm sóc, đơn hàng dựa trên phiên đăng nhập để trả lời khách hàng.
Cao
FR15.3
Chuyển đổi kết nối tư vấn viên
Hiển thị tùy chọn "Kết nối với nhân viên" trong khung chat. Nếu trong giờ làm việc (08:00 - 21:00), hệ thống kiểm tra trạng thái và chuyển hướng sang giao diện Chat trực tiếp với nhân viên.
Cao
FR15.4
Đánh giá chất lượng hỗ trợ
Cho phép khách hàng chọn "Tiếp tục trao đổi" hoặc "Đóng chat hỗ trợ". Khi nhấn đóng, hệ thống hiển thị form ngắn để khách hàng chấm điểm chất lượng hỗ trợ.
Trung bình
FR15.5
Tự động phản hồi ngoài giờ làm việc
Ngoài giờ làm việc (sau 22:00 - trước 08:00), hệ thống tự động gửi tin nhắn hẹn thời gian xử lý vào đầu giờ sáng hôm sau khi khách hàng liên hệ chat.
Cao
FR15.6
Đồng bộ lịch sử hỗ trợ vào CRM
Toàn bộ lịch sử chat, nội dung và kết quả xử lý phải được tự động lưu trữ tập trung vào hồ sơ khách hàng. 
Cao
FR15.7
Bộ lọc từ ngữ và ngắt phiên chat vi phạm
Tự động kích hoạt bộ lọc nội dung chat; hiển thị cảnh báo nếu người dùng dùng từ ngữ không phù hợp và tự động ngắt phiên chat nếu vi phạm nhiều lần.
Trung bình
FR15.8
Hướng dẫn tải tệp lỗi qua Zalo
Nếu tệp đính kèm trong khung chat không đúng định dạng hoặc quá dung lượng, hệ thống hiển thị thông báo cảnh báo và hướng dẫn khách hàng gửi qua link Zalo OA chính thức.
Trung bình


3.4. Yêu cầu phi chức năng

Yêu cầu phi chức năng
Mã số
Yêu cầu phi chức năng
Mô tả chi tiết
Ưu tiên
NFR-01
Hiệu suất
Thời gian phản hồi trang < 2 giây. Hỗ trợ tối thiểu 100 người dùng truy cập cùng lúc không lag.
Cao
NFR-02
Bảo mật
Mã hóa mật khẩu một chiều. Xác thực OTP cho giao dịch và đăng ký. Tuân thủ chuẩn HTTPS.
Rất cao
NFR-03
Phân quyền truy cập
Hệ thống phân quyền chặt chẽ. Mỗi nhóm chỉ thấy và sử dụng đúng chức năng của mình.
Rất cao
NFR-04
Khả năng chịu lỗi
Nếu có lỗi xảy ra hệ thống phải báo lỗi rõ ràng cho người dùng thay vì hiện trang trắng hoặc sập luôn.
Trung bình
NFR-05
Sao lưu dữ liệu
Dữ liệu được lưu dự phòng hàng ngày để không bị mất nếu máy chủ gặp sự cố.
Cao
NFR-06
Khả năng mở rộng
Dễ dàng thêm các dịch vụ mới hoặc thêm cơ sở mới vào hệ thống sau này mà không cần làm lại từ đầu.
Trung bình
NFR-07
Giao diện người dùng
Giao diện đơn giản, dễ dùng, chữ to rõ ràng. Hoạt động tốt trên cả máy tính và điện thoại di động.
Cao
NFR-08
Khả năng bảo trì
Code viết gọn gàng, có ghi chú để khi cần sửa chữa hoặc nâng cấp thì người khác cũng làm được dễ dàng.
Trung bình
NFR-09
Thời gian hoạt động
Web luôn sẵn sàng hoạt động 24/7 để khách có thể đặt lịch bất cứ lúc nào.
Cao



