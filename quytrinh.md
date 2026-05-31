3.1.Mô tả quy trình nghiệp vụ và Sơ đồ BPMN
3.1.1. Quy trình đăng ký
Mô tả quy trình 
Quy trình đăng ký thành viên trên hệ thống Pawpal được thiết kế linh hoạt nhằm tối ưu hóa tỷ lệ chuyển đổi thông qua hai luồng tiếp cận chính là Đăng ký chủ động dành cho những khách hàng muốn trở thành thành viên chính thức trước khi sử dụng dịch vụ và Định danh lũy tiến khi khách hàng vãng lai thực hiện đặt lịch hoặc thanh toán mà chưa có tài khoản.
Đối với Đăng ký chủ động, quy trình bắt đầu khi người dùng chọn chức năng "Đăng ký" trên giao diện Pawpal và cung cấp các thông tin gồm Họ tên, Số điện thoại và Mật khẩu. Ngay lập tức, hệ thống thực hiện kiểm tra tính hợp lệ dữ liệu và tính duy nhất của số điện thoại trong cơ sở dữ liệu (CSDL). Sau khi xác nhận các thông tin đều hợp lệ, hệ thống gửi lệnh điều khiển đến tác nhân SMS Gateway gửi một mã OTP để xác thực quyền sở hữu số điện thoại. Sau khi xác thực thành công, tài khoản chính thức được xác lập và người dùng có thể đăng nhập, hệ thống điều hướng người dùng vào Trang chủ để bắt đầu hoàn thiện hồ sơ bé cưng. Hệ thống hiển thị dòng thông báo chào mừng và tặng ngay 50 điểm thưởng Paw Points cho khách hàng thành viên mới.  Quy trình hoàn tất khi hệ thống ghi nhận thông tin tài khoản hợp lệ vào CSDL.
Đối với Định danh lũy tiến dành cho khách hàng vãng lai, hệ thống yêu cầu người dùng hoàn thiện các thông tin liên lạc và thực thể bắt buộc ngay tại giao diện đặt lịch hoặc giỏ hàng bao gồm Họ tên, Số điện thoại, thông tin cơ bản của bé cưng hoặc Địa chỉ giao nhận sản phẩm. Sau khi xác nhận thông tin, hệ thống sẽ ngầm khởi tạo một "Tài khoản tạm" gắn với số điện thoại khách hàng cung cấp. Sau khi giao dịch hoàn tất, hệ thống tự động gửi một tin nhắn SMS với nội dung chào mừng, kèm theo đường dẫn thiết lập mật khẩu có hiệu lực trong 48 giờ và thông báo tặng ngay 50 điểm thưởng Paw Points để khuyến khích khách hàng kích hoạt tài khoản. Quy trình chính thức hoàn tất khi khách hàng nhấn vào liên kết, thiết lập mật khẩu và hệ thống ghi nhận tài khoản chuyển đổi trạng thái từ "Tài khoản tạm" sang "Thành viên chính thức" bằng cách đồng bộ dữ liệu vào “Nhật ký chăm sóc” và “Đơn hàng của tôi” 
Ngoài ra, trong trường hợp khách hàng trực tiếp đến cơ sở, Admin có thể hỗ trợ thực hiện quy trình đăng ký nhanh tại quầy thông qua giao diện quản trị để giúp khách hàng sở hữu tài khoản định danh ngay lập tức.
Quy tắc nghiệp vụ 
Định danh duy nhất: Số điện thoại phải là duy nhất trên hệ thống và đúng định dạng nhà mạng Việt Nam.
Xác thực OTP: Mã OTP có hiệu lực trong vòng 05 phút. Nếu quá thời gian này, khách hàng phải yêu cầu gửi lại mã mới.
Cơ chế tài khoản tạm: Tài khoản tạm được hệ thống tự động khởi tạo ngay khi khách hàng vãng lai nhấn Xác nhận đặt lịch/thanh toán.
Hiệu lực liên kết xác thực: Đường dẫn thiết lập mật khẩu được gửi qua SMS Gateway có thời hạn sử dụng tối đa là 48 giờ.
Quyền truy cập tạm thời: Sau khi nhập SĐT, khách hàng được cấp quyền truy cập ngay dưới dạng tài khoản chưa kích hoạt hoàn toàn để trải nghiệm dịch vụ.
Bảo mật mật khẩu: Hệ thống bắt buộc khách hàng phải thiết lập mật khẩu trước khi có thể thực hiện quy trình Đổi điểm thưởng hoặc Hủy lịch hẹn. 
Ưu đãi chuyển đổi: Điểm thưởng Paw Points chỉ được cộng vào ví khách hàng sau khi họ hoàn tất xác thực OTP hoặc thiết lập mật khẩu từ đường dẫn trong SMS.
Quyền hạn tài khoản tạm: Tài khoản tạm chỉ có quyền xem lịch hẹn hiện tại, không có quyền đổi điểm thưởng hay quản lý chuyên sâu Pet ID cho đến khi được kích hoạt chính thức.
Cấp tài khoản tại quầy: Admin có quyền tạo tài khoản cho khách chỉ với Họ tên và SĐT, quy trình gửi link xác thực mật khẩu diễn ra tương tự đăng ký trực tuyến.
Tình huống ngoại lệ
Số điện thoại đã tồn tại: Hệ thống từ chối đăng ký và hiển thị thông báo lỗi: "Số điện thoại đã tồn tại. Vui lòng đăng nhập hoặc khôi phục mật khẩu!" 
Lỗi kết nối SMS Gateway: Nếu hệ thống không thể liên kết với nhà mạng, quy trình sẽ thực hiện gửi lại tối đa 3 lần. Nếu vẫn thất bại, hệ thống thông báo "Dịch vụ xác thực tạm gián đoạn" và lưu yêu cầu vào hàng chờ báo lỗi cho Admin.
Link thiết lập mật khẩu hết hạn: Khi khách hàng nhấn vào link sau 48 giờ, hệ thống hiển thị thông báo lỗi "Liên kết đã hết hiệu lực" và cung cấp nút "Gửi lại link xác thực mới" để bảo mật lại từ đầu.
Số điện thoại không đúng định dạng: Hệ thống kiểm tra ngay tại bước nhập liệu, nếu không đủ 10 chữ số hoặc đầu số không hợp lệ sẽ hiển thị cảnh báo đỏ
Khách hàng không thiết lập mật khẩu: Sau 48 giờ nếu khách vãng lai không kích hoạt, "Tài khoản tạm" vẫn tồn tại để lưu trữ lịch sử giao dịch nhưng sẽ không có điểm thưởng và không thể đăng nhập cho đến khi khách yêu cầu khôi phục mật khẩu.
Nhập sai mã OTP quá 3 lần: Hệ thống sẽ tạm khóa tính năng đăng ký cho số điện thoại đó trong 15 phút để phòng chống hành vi tấn công giả mạo
3.1.2. Quy trình đăng nhập và bảo mật
Mô tả quy trình 
Quy trình đăng nhập bắt đầu khi người dùng chọn chức năng “Đăng nhập” trên giao diện hệ thống. Tại đây, người dùng thực hiện nhập Số điện thoại, đối với Thành viên chính thức hệ thống yêu cầu thêm Mật khẩu cá nhân, sau đó nhấn nút “Đăng nhập” để gửi yêu cầu truy cập. Khi nhận được yêu cầu, hệ thống tiến hành truy xuất và kiểm tra dữ liệu người dùng trong CSDL. Trong trường hợp hệ thống không tìm thấy số điện thoại tương ứng, hệ thống hiển thị thông báo “Số điện thoại chưa được đăng ký. Vui lòng thực hiện đăng ký” 
Đối với trường hợp tài khoản đã tồn tại, hệ thống thực hiện xác thực thông tin dựa trên phương thức mà người dùng lựa chọn:
Trường hợp khách hàng thành viên đã thiết lập mật khẩu, hệ thống tiến hành so sánh mật khẩu người dùng vừa nhập với mật khẩu đã được mã hóa lưu trữ trong CSDL. Nếu mật khẩu không hợp lệ, hệ thống hiển thị thông báo lỗi “Mật khẩu đăng nhập không chính xác” và yêu cầu người dùng nhập lại. Trong trường hợp người dùng không nhớ mật khẩu và kích hoạt chức năng “Quên mật khẩu”, hệ thống sẽ yêu cầu người dùng cung cấp lại Số điện thoại định danh. Ngay khi thông tin được xác nhận, tác nhân SMS Gateway tự động gửi một tin nhắn chứa đường dẫn khôi phục mật khẩu có hiệu lực sử dụng tối đa trong vòng 48 giờ. Khách hàng click vào liên kết này để truy cập giao diện thiết lập mật khẩu mới, hệ thống sẽ kiểm tra độ phức tạp của chuỗi ký tự trước khi mã hóa để khôi phục quyền đăng nhập.
Trường hợp khách hàng vãng lai đăng nhập bằng tài khoản tạm, người dùng chọn chức năng “Đăng nhập qua OTP”. Lúc này, hệ thống điều khiển tác nhân SMS Gateway gửi một mã xác thực về số điện thoại đã đăng ký. Sau khi người dùng nhập và hệ thống xác minh mã OTP trùng khớp, yêu cầu truy cập sẽ được chấp nhận.
Nếu thông tin hợp lệ và xác thực thành công, hệ thống tiến hành cập nhật trạng thái phiên đăng nhập, ghi nhận thời gian truy cập thực tế và khởi tạo các quyền hạn tương ứng. Đồng thời, hệ thống kiểm tra xem có Tài khoản tạm nào trùng số điện thoại này không để thực hiện gộp dữ liệu. Sau đó, hệ thống hiển thị thông báo “Đăng nhập thành công” và tự động điều hướng về Dashboard cá nhân.
Nhằm tăng cường tính an toàn cho tài khoản, trong quá trình sử dụng, người dùng có thể truy cập vào mục “Cấu hình tài khoản” để thay đổi mật khẩu hoặc cập nhật các lớp bảo mật nâng cao. Tại đây, hệ thống bắt buộc yêu cầu xác nhận mật khẩu cũ hoặc nhập mã xác thực OTP từ SMS Gateway để đảm bảo thao tác do chính chủ thực hiện trước khi cập nhật dữ liệu mới vào CSDL. 
Quy trình kết thúc khi người dùng truy cập thành công vào hệ thống hoặc sau khi hệ thống hiển thị các thông báo lỗi yêu cầu người dùng xử lý lại.
Quy tắc nghiệp vụ 
Định danh duy nhất: Hệ thống sử dụng Số điện thoại là khóa chính duy nhất để định danh tài khoản người dùng trong cơ sở dữ liệu.
Độ phức tạp mật khẩu: Mật khẩu phải có độ dài tối thiểu 8 ký tự, bao gồm ít nhất một chữ số và một ký tự đặc biệt
Hiệu lực mã OTP: Mã xác thực OTP được gửi qua hệ thống SMS Gateway có thời gian hiệu lực tối đa là 05 phút kể từ thời điểm phát sinh.
Ràng buộc bảo mật: Khách hàng bắt buộc phải hoàn tất bước thiết lập mật khẩu cá nhân mới có quyền truy cập vào các tính năng nhạy cảm như Đổi điểm thưởng (Paw Points) hoặc Thay đổi thông tin thanh toán.
Hệ thống bắt buộc đăng nhập để xem Nhật ký chăm sóc chuyên sâu để đảm bảo quyền riêng tư cho bé cưng.
Tình huống ngoại lệ
Truy cập từ thiết bị lạ: Hệ thống gửi cảnh báo "Phát hiện đăng nhập bất thường" qua tin nhắn để khách hàng chủ động kiểm tra và thực hiện đổi mật khẩu nếu cần.
3.1.3. Quản lý hồ sơ bé cưng
Mô tả quy trình 
Quy trình quản lý hồ sơ bé cưng khởi đầu sau khi người dùng đăng nhập thành công và truy cập vào mục "Hồ sơ của bé" trên Trang chủ. Tại giao diện này, hệ thống cho phép người dùng khởi tạo và duy trì Pet ID cho các bé cưng của mình thông qua các thao tác cụ thể
Trường hợp thêm mới hồ sơ, người dùng thực hiện cung cấp các thông tin định danh cơ bản bao gồm: Tên bé cưng, Giống loài, Cân nặng, Ảnh đại diện và đặc biệt là các thông tin nhạy cảm về y tế như tiền sử bệnh lý, dị ứng hoặc thói quen sinh hoạt. Sau khi nhấn nút “Lưu hồ sơ”, hệ thống sẽ kiểm tra tính hợp lệ của dữ liệu, sau đó khởi tạo một mã định danh Pet ID duy nhất trong CSDL.
Trường hợp cập nhật thông tin, người dùng chọn một hồ sơ hiện có để thay đổi các thông tin hoặc cập nhật ảnh mới. Hệ thống sẽ ghi nhận phiên bản cập nhật mới nhất để đảm bảo dữ liệu luôn khớp với tình trạng thực tế của thú cưng tại thời điểm sử dụng dịch vụ.
Ngay khi hồ sơ được xác lập, toàn bộ lịch sử từ lúc bé “Đã tiếp nhận” cho đến lúc hoàn thành sẽ được lưu trữ trong Nhật ký chăm sóc. Trong quá trình thú cưng lưu trú hoặc làm đẹp tại cửa hàng, các luồng dữ liệu hình ảnh từ Thiết bị ngoại vi sẽ được hệ thống gán trực tiếp vào mã Pet ID tương ứng, cho phép khách hàng giám sát thông tin một cách xuyên suốt. Khách hàng và Admin đều có quyền cập nhật các chỉ số sinh hoạt cho thú cưng để đảm bảo dữ liệu luôn khớp với tình trạng thực tế tại mỗi thời điểm sử dụng dịch vụ.
Quy trình kết thúc khi thông tin hồ sơ được lưu trữ thành công vào hệ thống hoặc sau khi khách hàng nhận được thông báo xác nhận cập nhật Pet ID hoàn tất.
Quy tắc nghiệp vụ 
Quyền sở hữu: Mỗi Pet ID phải thuộc sở hữu của một tài khoản khách hàng duy nhất; một khách hàng có quyền tạo không giới hạn số lượng Pet ID và ẩn hồ sơ khỏi trang.
Dữ liệu bắt buộc: Các trường thông tin gồm Tên, Giống loài và Cân nặng là bắt buộc phải hoàn thiện để hệ thống có cơ sở tính toán đơn giá dịch vụ chính xác trong quy trình Đặt lịch.
Ưu tiên hiển thị y tế: Thông tin về "Dị ứng" và "Lưu ý đặc biệt" phải luôn được làm nổi bật trên giao diện của hệ thống chăm sóc.
Đồng bộ Nhật ký chăm sóc: Mỗi Pet ID sẽ được hệ thống tự động gán một lịch sử chăm sóc riêng biệt, không được phép gộp chung nhật ký giữa các bé thú cưng khác nhau.
Cập nhật hình ảnh: Ảnh đại diện của Pet ID phải là ảnh thực tế và được khuyến khích cập nhật mới mỗi khi bé có sự thay đổi lớn về ngoại hình
Tính kế thừa dữ liệu: Mọi lịch sử dịch vụ, hình ảnh từ Nhật ký chăm sóc và hóa đơn mua sắm liên quan đều phải được gán theo mã Pet ID để phục vụ việc phân tích xu hướng sức khỏe vật nuôi lâu dài.
Tình huống ngoại lệ
Xóa hồ sơ: Hệ thống không xóa vĩnh viễn ngay mà đưa vào "Kho lưu trữ hồ sơ" trong 30 ngày. Khách hàng có thể tự khôi phục lại dữ liệu bé cưng trong thời gian này.
Ảnh tải lên sai định dạng/dung lượng: Hệ thống hiển thị thông báo "Dung lượng ảnh vượt quá 5MB" hoặc "Định dạng không hỗ trợ" và khóa nút lưu cho đến khi người dùng điều chỉnh lại.
Hồ sơ chưa hoàn thiện khi đặt lịch: Nếu khách hàng chọn một Pet ID thiếu thông tin để đặt dịch vụ, hệ thống sẽ tự động điều hướng về trang chỉnh sửa hồ sơ kèm thông báo: "Vui lòng cập nhật thông tin bé cưng".
Trùng tên vật nuôi trong một tài khoản: Hệ thống yêu cầu người dùng thêm ký hiệu phân biệt hoặc hậu tố nếu phát hiện tên thú cưng mới trùng với tên thú cưng đã có trong cùng một tài khoản khách hàng.
Sai lệch thông tin tại quầy: Trường hợp thông tin Pet ID bị khách hàng khai báo sai, Admin có quyền hiệu chỉnh lại dữ liệu dưới sự xác nhận của khách hàng ngay tại thời điểm tiếp nhận dịch vụ.
3.1.4. Đặt lịch hẹn
Mô tả quy trình 
Quy trình đặt lịch hẹn được thực hiện trực tuyến hoàn toàn trên website nhằm tối ưu hóa thời gian cho khách hàng và giảm tải vận hành cho Admin. Quy trình bắt đầu khi  người dùng truy cập mục "Đặt lịch ngay", nơi khách hàng lựa chọn loại hình mong muốn. Tại đây, hệ thống phân tách luồng xử lý dựa trên định danh người dùng.
Đối với Khách hàng thành viên, hệ thống điều hướng đến màn hình " Chọn bé cưng". Khách hàng chọn một hoặc nhiều hồ sơ có sẵn từ danh sách Pet ID. Hệ thống tự động truy xuất dữ liệu cân nặng và giống loài để làm cơ sở tính giá.
Đối với Khách vãng lai, hệ thống hiển thị màn hình “Thông tin khách hàng". Khách hàng nhập Họ tên, Số điện thoại và thông tin cơ bản của thú cưng bao gồm Tên, Giống loài, Cân nặng. Lúc này hệ thống chỉ ghi nhận dữ liệu vào bộ nhớ đệm , chưa lưu vào CSDL chính thức.
Sau khi xác định đối tượng, khách hàng được chuyển đến màn hình "Chọn lịch & Nhân viên". Hệ thống hiển thị các khung giờ trống theo thời gian thực và danh sách nhân viên chăm sóc đang sẵn sàng. Khách hàng có thể chọn đích danh nhân viên yêu thích hoặc chọn ngẫu nhiên để hệ thống tự điều phối. Ngay khi khách hàng nhấn chọn vào một ô lịch và nhân viên cụ thể, hệ thống sẽ thực hiện lệnh "Giữ chỗ tạm thời" và chuyển trạng thái ô đó sang "Đang chờ" trong vòng 15 phút. Trong thời gian này, không một người dùng nào khác có thể nhìn thấy hoặc thao tác trên ô đó. Cơ chế giữ chỗ này vẫn được duy trì ngay cả khi khách hàng thoát khỏi màn hình đặt lịch hoặc đóng trình duyệt, nhằm đảm bảo quyền ưu tiên cho khách hàng đã thao tác trước.
Tiếp theo, tại mục “Xác nhận thông tin dịch vụ", hệ thống hiển thị chi tiết dịch vụ và tổng tiền dự kiến. Để đảm bảo tính minh bạch và tránh hiểu lầm về mặt chi phí, hệ thống sẽ render một dòng thông báo lưu ý bắt mắt ngay trên hóa đơn tạm tính với nội dung “Mức giá hiển thị chỉ là giá dự kiến dựa trên số cân nặng do khách hàng tự khai báo, khi khách hàng mang bé cưng đến cửa hàng, nhân viên xin phép cân lại thực tế để áp mức giá niêm yết chính xác nhất”. Khi khách hàng nhấn nút "Xác nhận đặt lịch", lịch hẹn sẽ chuyển từ "Đang chờ" sang "Đã đặt". Đối với khách vãng lai, lúc này hệ thống mới ngầm khởi tạo "Tài khoản tạm" và đồng thời kích hoạt SMS Gateway gửi link thiết lập mật khẩu.
Quy trình hoàn tất khi khách hàng nhấn nút "Xác nhận đặt lịch", hệ thống hiển thị thông báo "Đặt lịch thành công" và đồng thời gửi tin nhắn thông báo đến số điện thoại khách hàng thông qua SMS Gateway. Trên website thì thông tin sẽ hiển thị ở mục “Lịch hẹn của bé” và đồng thời được đồng bộ lên lịch vận hành của cửa hàng.
Quy tắc nghiệp vụ
Cơ chế kích hoạt giữ chỗ: Trạng thái "Giữ chỗ tạm thời" bắt đầu ngay từ thời điểm khách hàng nhấn chọn vào ô lịch
Thời gian đặt lịch tối thiểu: Khách hàng phải đặt lịch trước ít nhất 2 tiếng so với thời điểm dịch vụ bắt đầu.
Tính bền vững của lượt giữ chỗ tạm thời: Lượt giữ chỗ gắn liền với phiên làm việc. Nếu khách đóng trình duyệt và quay lại trong vòng 15 phút, ô lịch đã chọn vẫn hiển thị trạng thái đang chờ riêng cho họ.
Chính sách đặt cọc: Hệ thống không thu bất kỳ khoản phí đặt cọc nào. Tổng giá trị đơn hàng sẽ được thanh toán trực tiếp tại cửa hàng sau khi hoàn thành dịch vụ
Định danh khách vãng lai: "Tài khoản tạm" chỉ được khởi tạo chính thức sau khi nút "Xác nhận đặt lịch" được nhấn thành công.
Số lượng lịch giữ: Mỗi khách hàng chỉ được phép giữ chỗ tối đa 1 ô lịch tại một thời điểm để tránh hành vi đầu cơ khung giờ đẹp
Xác thực khung giờ trống: Hệ thống chỉ hiển thị các khung thời gian dựa trên công suất thực tế của nhân viên và thiết bị tại cửa hàng.
Tính giá tự động: Đơn giá dịch vụ được hệ thống tự động tính toán dựa trên bảng giá niêm yết cộng với các hệ số phụ thu theo cân nặng/giống loài từ Pet ID.
Trạng thái lịch hẹn: Lịch hẹn chỉ có giá trị thực hiện khi chuyển sang trạng thái "Đã xác nhận" bởi hệ thống
Tình huống ngoại lệ
Hết thời gian giữ chỗ: Sau 15 phút nếu khách không nhấn "Xác nhận đặt lịch", hệ thống tự động xóa dữ liệu tạm và mở lại ô lịch đó trên bản đồ giờ trống.
Trường hợp hai người cùng bấm vào một ô lịch ở cùng một mili giây, hệ thống sẽ ưu tiên yêu cầu gửi đến máy chủ trước và báo lỗi "Khung giờ này vừa được đặt" cho người còn lại.
Khách vãng lai nhập sai SĐT: Nếu SĐT không hợp lệ, hệ thống sẽ không thể khởi tạo tài khoản tạm và gửi SMS. Khách hàng phải điều chỉnh thông tin chính xác mới có thể nhấn "Xác nhận đặt lịch"
Thoát trang nhưng không quay lại: Sau 15 phút, hệ thống tự giải phóng slot mà không cần bất kỳ thao tác nào từ phía người dùng hay Admin.
Đặt lịch vào khung giờ đã qua: Nếu khách hàng chọn khung giờ vừa mới trôi qua thời gian thực, hệ thống báo lỗi "Thời gian không hợp lệ" và tự động làm mới lại bảng giờ trống.
Pet ID chưa đủ thông tin yêu cầu: Hệ thống yêu cầu khách hàng cập nhật nhanh thông tin tại bước chọn Pet rồi mới cho phép đi tiếp.
3.1.5. Thay đổi lịch hẹn
Mô tả quy trình 
Quy trình thay đổi lịch hẹn bắt đầu khi khách hàng truy cập vào mục “Lịch hẹn chăm sóc” trên hệ thống PawPal và chọn một lịch hẹn đang ở trạng thái "Đã xác nhận", chọn chức năng "Thay đổi lịch". Người dùng chỉ có thể thay đổi lịch hẹn trước giờ bắt đầu dịch vụ tối thiểu 2 tiếng.
Hệ thống sẽ điều hướng người dùng đến màn hình “Chọn lịch mới". Tại đây, hệ thống hiển thị các khung giờ trống theo thời gian thực và danh sách nhân viên chăm sóc đang sẵn sàng. Tương tự như quy trình đặt lịch ban đầu, ngay khi khách hàng nhấn chọn vào một ô lịch mới, hệ thống sẽ thực hiện lệnh "Giữ chỗ tạm thời" cho khung giờ đó trong vòng 15 phút và chuyển trạng thái ô lịch sang "Đang chờ". Đồng thời, hệ thống vẫn giữ nguyên trạng thái ô lịch cũ của khách hàng cho đến khi thao tác thay đổi được xác nhận thành công.
Sau khi chọn giờ và nhân viên mới, khách hàng tiến hành kiểm tra lại thông tin tại màn hình xác nhận. Nếu có sự chênh lệch về giá, hệ thống sẽ hiển thị bảng kê chi tiết số tiền cần bù hoặc số tiền dư được chuyển vào ví điểm thưởng. Sau đó, khách hàng nhấn "Xác nhận thay đổi" tại màn hình “Xác nhận thông tin dịch vụ". Lúc này, hệ thống thực hiện cập nhật thời gian mới vào CSDL theo Hồ sơ bé cưng và chuyển trạng thái lịch hẹn mới thành "Đã đặt". Đồng thời, hệ thống lập tức giải phóng ô lịch cũ để chuyển về trạng thái "Trống" cho người dùng khác.
Quy trình hoàn tất khi khách hàng nhấn nút "Xác nhận thay đổi", hệ thống hiển thị thông báo "Thay đổi lịch hẹn thành công" và thông tin được đồng bộ lên lịch vận hành của cửa hàng.
Quy tắc nghiệp vụ 
Giới hạn thời gian thay đổi: Khách hàng chỉ được phép thay đổi lịch hẹn trước giờ bắt đầu dịch vụ tối thiểu 2 tiếng.
Cơ chế giữ chỗ mới: Ô lịch mới được khách hàng chọn sẽ được khóa tạm thời trong 15 phút. Nếu khách hàng thoát trang hoặc không xác nhận trong thời gian này, ô lịch mới sẽ bị giải phóng và lịch hẹn cũ vẫn được giữ nguyên.
Hiệu lực khung giờ cũ: Khung giờ ban đầu sẽ chỉ được giải phóng trên hệ thống sau khi việc thay đổi lịch hẹn mới đã được xác nhận thành công.
Giới hạn số lần thay đổi: Mỗi lịch hẹn chỉ được phép thay đổi trực tuyến tối đa 02 lần. Sau giới hạn này, nút "Thay đổi" sẽ bị ẩn và khách hàng bắt buộc phải liên hệ Hotline để được Admin hỗ trợ thủ công.
Ràng buộc loại dịch vụ: Khách hàng không được phép thay đổi loại dịch vụ chính từ Spa sang Hotel trong quy trình này. Mọi thay đổi về loại dịch vụ bắt buộc phải thực hiện thông qua quy trình Hủy lịch và Đặt lịch mới.
Bảo mật thao tác: Đối với tài khoản tạm, hệ thống yêu cầu khách hàng phải truy cập thông qua liên kết định danh trong SMS hoặc đã thiết lập mật khẩu trước đó mới có quyền thực hiện thay đổi.
Lưu vết hệ thống: Mọi thao tác thay đổi lịch phải ghi nhận rõ ID người thực hiện, thời gian thay đổi vào nhật ký hệ thống.
Tình huống ngoại lệ
Thay đổi sát giờ hẹn: Nếu thời gian còn lại dưới 2 tiếng, nút "Thay đổi" sẽ bị vô hiệu hóa, hệ thống hiển thị thông báo: "Đã quá thời gian tự thay đổi lịch tự động, vui lòng gọi Hotline để nhân viên hỗ trợ bạn trực tiếp".
Thông báo chênh lệch giá: Nếu đổi sang khung giờ có giá cao hơn, hệ thống hiển thị thông báo mức giá chênh lệch chi tiết để người dùng xác nhận.
Lịch hẹn đã Check-in: Nếu thú cưng đã ở cửa hàng và trạng thái là "Đang thực hiện", chức năng thay đổi lịch trên website sẽ bị khóa hoàn toàn. Mọi thay đổi về thời gian đón bé phải trao đổi trực tiếp với Lễ tân.
Hết 15 phút giữ chỗ mới: Nếu khách hàng để máy chờ quá 15 phút mà không nhấn xác nhận, hệ thống sẽ tự động hủy lệnh thay đổi, giải phóng ô lịch mới và giữ nguyên lịch hẹn cũ cho khách hàng.
3.1.6. Hủy lịch
Mô tả quy trình
Quy trình hủy lịch hẹn bắt đầu khi khách hàng truy cập vào màn hình “Lịch hẹn chăm sóc” trên hệ thống PawPal và lựa chọn một lịch hẹn đang ở trạng thái “Đã xác nhận”. Tại giao diện chi tiết lịch hẹn, khách hàng nhấn vào chức năng “Hủy lịch hẹn”, lúc này hệ thống hiển thị cửa sổ xác nhận nhằm tránh các thao tác nhầm lẫn ngoài ý muốn.
Sau khi khách hàng xác nhận yêu cầu hủy, hệ thống tiến hành kiểm tra nếu lịch hẹn vẫn còn trong thời gian cho phép hủy trực tuyến và chưa bước vào giai đoạn thực hiện dịch vụ, hệ thống sẽ cập nhật trạng thái lịch hẹn sang “Đã hủy”.
Ngay sau khi hủy thành công, hệ thống tự động giải phóng khung giờ tương ứng để cập nhật lại lịch trống trên hệ thống đặt lịch. Đồng thời, thông báo xác nhận hủy lịch được gửi đến khách hàng và Admin nhằm hỗ trợ cửa hàng chủ động điều chỉnh kế hoạch vận hành, phân bổ nhân sự và sắp xếp lịch tiếp nhận khách khác phù hợp hơn.
Thông tin lịch hẹn đã hủy vẫn được lưu trong lịch sử đặt lịch của khách hàng với trạng thái “Đã hủy”. Ngoài ra, hệ thống cũng ghi nhận dữ liệu về số lần hủy lịch nhằm hỗ trợ đánh giá mức độ ổn định của khách hàng trong tương lai.
Trong trường hợp khách hàng hủy lịch nhiều lần liên tiếp trong thời gian ngắn hoặc thường xuyên đặt lịch nhưng không sử dụng dịch vụ, hệ thống có thể ghi nhận hành vi bất thường để phục vụ cơ chế cảnh báo nội bộ hoặc áp dụng chính sách hạn chế đặt lịch tự động nhằm tránh ảnh hưởng đến khả năng vận hành thực tế của cửa hàng.
Sau khi trạng thái lịch hẹn được cập nhật hoàn tất và khung giờ được giải phóng thành công, quy trình hủy lịch kết thúc.
Quy tắc nghiệp vụ
Khách hàng chỉ được phép tự hủy lịch hẹn trước giờ bắt đầu dịch vụ tối thiểu 2 tiếng.
Các lịch hẹn đã chuyển sang trạng thái “Đang thực hiện”, “Đã tiếp nhận” hoặc “Hoàn thành” sẽ không được phép hủy trực tiếp trên website.
Sau khi lịch hẹn được hủy thành công, hệ thống phải tự động giải phóng khung giờ tương ứng để cập nhật lại khả năng đặt lịch.
Một lịch hẹn chỉ được phép hủy duy nhất một lần và không thể khôi phục sau khi xác nhận hủy thành công.
Hệ thống phải gửi thông báo xác nhận hủy lịch đến cả khách hàng và Admin ngay sau khi cập nhật trạng thái thành công.
Mọi thao tác hủy lịch phải được ghi nhận vào nhật ký hệ thống nhằm phục vụ tra soát hoặc xử lý khiếu nại khi cần thiết.
Hệ thống phải lưu lịch sử hủy lịch của khách hàng để phục vụ phân tích hành vi và hỗ trợ vận hành.
Đối với tài khoản tạm, hệ thống yêu cầu khách hàng phải truy cập thông qua liên kết định danh trong SMS hoặc đã thiết lập mật khẩu trước đó mới có quyền thực hiện thay đổi.
Tình huống ngoại lệ
Nếu khách hàng thực hiện hủy lịch khi thời gian còn lại dưới 2 tiếng trước giờ hẹn, hệ thống phải vô hiệu hóa nút “Hủy lịch” và hiển thị thông báo: “Quá thời gian cho phép hủy trực tuyến, vui lòng liên hệ trực tiếp Admin để được hỗ trợ.”
Trong trường hợp xảy ra lỗi đồng bộ dữ liệu khi cập nhật trạng thái lịch hẹn, hệ thống phải khôi phục giao dịch và giữ nguyên trạng thái cũ nhằm đảm bảo tính toàn vẹn dữ liệu.
Nếu khách hàng thoát trang hoặc mất kết nối internet trước khi xác nhận thao tác cuối cùng, hệ thống sẽ không ghi nhận yêu cầu hủy lịch.
Trong trường hợp nhiều thao tác xảy ra đồng thời trên cùng một lịch hẹn (ví dụ: Admin đang check-in trong khi khách yêu cầu hủy), hệ thống phải ưu tiên thao tác được xử lý trước và khóa lịch hẹn để tránh xung đột dữ liệu.
Nếu hệ thống không thể truy cập CSDL Đặt lịch tại thời điểm xử lý, hệ thống phải hiển thị thông báo: “Hệ thống đang bận, vui lòng thử lại sau.”
3.1.7. Theo dõi dịch vụ
Mô tả quy trình
Quy trình theo dõi dịch vụ bắt đầu khi khách hàng đã đặt lịch thành công và thú cưng được tiếp nhận tại cửa hàng PawPal để sử dụng các dịch vụ như Grooming, Spa, Pet Hotel hoặc chăm sóc đặc biệt. Tại thời điểm tiếp nhận, nhân viên lễ tân tiến hành xác nhận thông tin lịch hẹn, đối chiếu hồ sơ thú cưng và cập nhật trạng thái "Đã tiếp nhận" trên hệ thống. Đồng thời, hệ thống tự động khởi tạo một phiên "Theo dõi trải nghiệm dịch vụ" tương ứng với lịch hẹn hiện tại và liên kết với Hồ sơ bé cưng của khách hàng.
Sau khi phiên theo dõi được tạo, hệ thống chuyển sang cơ chế thông báo tức thì tới khách hàng thông qua giao diện "Nhật ký chăm sóc". Trong suốt quá trình chăm sóc, nhân viên phụ trách có trách nhiệm cập nhật các cột mốc dịch vụ quan trọng như: "Đang tắm", "Đang sấy lông", "Đang nghỉ ngơi", "Đã cho ăn", "Đã uống thuốc" hoặc "Hoàn tất chăm sóc". Mỗi trạng thái cập nhật đều được gắn thời gian thực tế nhằm giúp khách hàng dễ dàng theo dõi tiến độ dịch vụ.
Khi khách hàng truy cập màn hình "Nhật ký bé cưng", hệ thống tiến hành truy xuất dữ liệu dòng thời gian tương ứng với lịch dịch vụ đang diễn ra từ CSDL Nhật ký chăm sóc. Nếu phiên dịch vụ chưa có bất kỳ cập nhật nào, hệ thống hiển thị trạng thái "Đang chờ cập nhật từ nhân viên". Ngược lại, nếu đã có dữ liệu, toàn bộ các mốc trạng thái sẽ được hiển thị theo thứ tự thời gian từ mới đến cũ, kèm hình ảnh, ghi chú và thời gian cập nhật tương ứng.
Trong trường hợp phát sinh sự cố hoặc tình huống đặc biệt như thú cưng có dấu hiệu căng thẳng, bỏ ăn, dị ứng sản phẩm hoặc cần xử lý y tế cơ bản, nhân viên có thể tạo "Ghi chú khẩn cấp" trên timeline. Khi đó, hệ thống sẽ ưu tiên gửi thông báo SMS đến tài khoản khách hàng để chủ nuôi kịp thời nắm bắt tình trạng và đưa ra phản hồi cần thiết. Nếu khách hàng phản hồi thông qua hệ thống, dữ liệu trao đổi sẽ được lưu đồng thời vào lịch sử chăm sóc để phục vụ tra soát sau này.
Sau khi dịch vụ hoàn tất và thú cưng được bàn giao lại cho khách hàng, nhân viên cập nhật trạng thái cuối cùng là "Hoàn tất dịch vụ". Hệ thống sẽ đóng phiên theo dõi thời gian thực và tự động chuyển toàn bộ dữ liệu sang khu vực "Lưu trữ nhật ký". Tại đây, khách hàng có thể xem lại lịch sử chăm sóc của thú cưng theo từng lần sử dụng dịch vụ, bao gồm hình ảnh, ghi chú chăm sóc và dòng thời gian chi tiết. Dữ liệu này được lưu trữ như một hồ sơ hành trình trải nghiệm giúp khách hàng dễ dàng theo dõi quá trình phát triển và chăm sóc thú cưng theo thời gian.
Ngoài mục tiêu minh bạch hóa dịch vụ, hệ thống còn sử dụng dữ liệu từ nhật ký chăm sóc để hỗ trợ cá nhân hóa trải nghiệm khách hàng. Dựa trên lịch sử dịch vụ trước đó, hệ thống có thể gợi ý lịch chăm sóc định kỳ, đề xuất các gói dịch vụ phù hợp hoặc nhắc lịch grooming theo chu kỳ của từng giống thú cưng. 
Quy tắc nghiệp vụ
Mỗi lịch dịch vụ chỉ được phép tồn tại duy nhất một phiên "Theo dõi trải nghiệm dịch vụ" đang hoạt động tại cùng một thời điểm.
Hệ thống chỉ cho phép nhân viên có quyền phụ trách dịch vụ cập nhật trạng thái hoặc đăng tải nội dung lên Timeline của thú cưng.
Mọi cập nhật trạng thái trên Timeline phải được gắn timestamp nhằm đảm bảo tính minh bạch và khả năng tra soát dữ liệu.
Hình ảnh hoặc video được tải lên phải liên kết trực tiếp với phiên dịch vụ hiện tại của thú cưng để tránh nhầm lẫn dữ liệu.
Timeline phải hiển thị dữ liệu theo thứ tự thời gian thực tế từ mới đến cũ nhằm đảm bảo tính liên tục trải nghiệm.
Khi dịch vụ kết thúc, hệ thống phải tự động khóa quyền chỉnh sửa Timeline và chuyển dữ liệu sang chế độ lưu trữ.
Chỉ chủ sở hữu hợp lệ của thú cưng hoặc tài khoản được phân quyền mới được phép truy cập nhật ký chăm sóc.
Mọi thao tác cập nhật trạng thái, hình ảnh hoặc ghi chú phải được ghi nhận vào nhật ký hệ thống nhằm phục vụ kiểm tra nội bộ hoặc xử lý khiếu nại.
Tình huống ngoại lệ 
Nếu nhân viên chưa cập nhật bất kỳ trạng thái nào sau khi thú cưng được check-in, hệ thống phải hiển thị thông báo: "Dịch vụ đang được chuẩn bị, vui lòng chờ cập nhật từ nhân viên."
Khi nhân viên tải lên hình ảnh hoặc video không hợp lệ (sai định dạng, vượt dung lượng cho phép), hệ thống phải từ chối upload và hiển thị thông báo lỗi cụ thể.
Nếu kết nối mạng bị gián đoạn trong lúc cập nhật Timeline, hệ thống phải lưu tạm dữ liệu cục bộ và cho phép nhân viên gửi lại khi kết nối được khôi phục.
Trong trường hợp khách hàng truy cập Timeline nhưng hệ thống không thể truy xuất dữ liệu từ CSDL Nhật ký chăm sóc, hệ thống hiển thị thông báo: "Không thể tải dữ liệu trải nghiệm lúc này, vui lòng thử lại sau."
Nếu xảy ra xung đột dữ liệu do nhiều nhân viên cùng cập nhật một trạng thái tại cùng thời điểm, hệ thống phải ưu tiên bản ghi mới nhất và lưu lịch sử chỉnh sửa để phục vụ đối chiếu.
Khi phiên dịch vụ đã chuyển sang trạng thái "Hoàn tất", mọi thao tác chỉnh sửa hoặc xóa dữ liệu Timeline đều phải bị khóa nhằm đảm bảo tính toàn vẹn dữ liệu.
Nếu khách hàng mất kết nối hoặc thoát website trong lúc theo dõi realtime, hệ thống phải tự động đồng bộ lại toàn bộ Timeline mới nhất khi người dùng truy cập trở lại.
3.1.8. Mua sắm
Mô tả quy trình
Quy trình mua sắm sản phẩm bắt đầu khi khách hàng truy cập vào trang "Cửa hàng" trên hệ thống PawPal để tìm kiếm và lựa chọn các sản phẩm dành cho thú cưng như thức ăn, phụ kiện, đồ chơi, quần áo hoặc sản phẩm chăm sóc sức khỏe. Tại màn hình danh mục cửa hàng, hệ thống tiến hành truy xuất danh sách sản phẩm từ CSDL Sản phẩm và hiển thị theo nhiều nhóm phân loại như danh mục, thương hiệu, giá bán hoặc tình trạng còn hàng nhằm hỗ trợ khách hàng dễ dàng khám phá sản phẩm phù hợp với nhu cầu.
Trong quá trình duyệt sản phẩm, khách hàng có thể sử dụng thanh tìm kiếm hoặc các bộ lọc nâng cao để thu hẹp phạm vi lựa chọn. Khi người dùng nhập từ khóa tìm kiếm, hệ thống sẽ đối chiếu dữ liệu trong CSDL Sản phẩm theo tên sản phẩm, thương hiệu và các từ khóa liên quan để trả về kết quả tìm kiếm sản phẩm. Nếu không tìm thấy kết quả phù hợp, hệ thống hiển thị thông báo tương ứng và đề xuất các sản phẩm tương tự hoặc sản phẩm bán chạy nhằm giảm khả năng người dùng rời bỏ website.
Sau khi lựa chọn một sản phẩm cụ thể, khách hàng được chuyển đến màn hình "Chi tiết sản phẩm". Tại đây, hệ thống hiển thị đầy đủ các thông tin liên quan bao gồm hình ảnh sản phẩm, mô tả chi tiết, giá bán, số lượng tồn kho khả dụng, đánh giá từ khách hàng trước đó và các sản phẩm liên quan. Nếu sản phẩm đang trong trạng thái hết hàng, hệ thống phải hiển thị cảnh báo "Tạm hết hàng" và vô hiệu hóa chức năng thêm vào giỏ hàng nhằm tránh phát sinh yêu cầu mua vượt tồn kho thực tế.
Khi khách hàng muốn lưu sản phẩm để xem lại sau, hệ thống hỗ trợ chức năng "Danh sách yêu thích". Nếu người dùng đã đăng nhập, sản phẩm sẽ được lưu trực tiếp vào tài khoản cá nhân và đồng bộ trên nhiều thiết bị. Trong trường hợp khách vãng lai chưa đăng nhập, hệ thống sẽ lưu Wishlist tạm thời trên session trình duyệt để đảm bảo trải nghiệm liên tục trong suốt phiên truy cập.
Khi khách hàng lựa chọn "Thêm vào giỏ hàng", hệ thống tiến hành kiểm tra số lượng tồn kho thực tế. Nếu số lượng khách yêu cầu vượt quá số lượng còn lại trong kho, hệ thống phải ngay lập tức hiển thị thông báo lỗi và yêu cầu điều chỉnh số lượng phù hợp. Ngược lại, nếu tồn kho đáp ứng đủ điều kiện, sản phẩm sẽ được thêm vào "Giỏ hàng" cùng các thông tin bao gồm tên sản phẩm, số lượng, đơn giá và tổng tiền tạm tính.
Tại màn hình "Giỏ hàng", khách hàng có thể thực hiện các thao tác quản lý đơn hàng tạm thời như cập nhật số lượng sản phẩm, xóa sản phẩm khỏi giỏ hoặc áp dụng mã giảm giá nếu có. Sau mỗi thao tác thay đổi, hệ thống phải tự động tính toán lại tổng giá trị đơn hàng nhằm đảm bảo dữ liệu hiển thị luôn chính xác. Đồng thời, hệ thống tiếp tục kiểm tra tính hợp lệ của tồn kho trong thời gian thực nhằm tránh trường hợp sản phẩm đã hết hàng trong lúc khách đang thao tác mua sắm.
Trong trường hợp khách hàng rời khỏi website khi chưa hoàn tất đơn hàng, hệ thống sẽ lưu trạng thái giỏ hàng nhằm hỗ trợ khôi phục dữ liệu trong lần truy cập tiếp theo. Đối với khách hàng đã đăng nhập, dữ liệu giỏ hàng được đồng bộ trực tiếp với tài khoản cá nhân; còn đối với khách vãng lai, dữ liệu sẽ được lưu tạm trên session trình duyệt trong khoảng thời gian cho phép.
Khi khách hàng hoàn tất việc lựa chọn sản phẩm và xác nhận tiếp tục mua hàng, hệ thống chuyển người dùng sang bước "Thanh toán đơn hàng". Tại thời điểm này, quy trình mua sắm kết thúc và dữ liệu đơn hàng tạm thời được chuyển sang quy trình xử lý thanh toán để tiếp tục thực hiện giao dịch.
Quy tắc nghiệp vụ
Mỗi sản phẩm phải được liên kết với dữ liệu tồn kho thực tế nhằm đảm bảo tính chính xác khi mua sắm.
Hệ thống phải kiểm tra tồn kho tại thời điểm thêm vào giỏ hàng và cả khi khách cập nhật số lượng sản phẩm.
Một sản phẩm hết hàng không được phép thêm mới vào giỏ hàng.
Wishlist của khách hàng đã đăng nhập phải được đồng bộ đa thiết bị thông qua tài khoản cá nhân.
Hệ thống phải tự động cập nhật tổng giá trị đơn hàng sau mỗi thao tác thay đổi số lượng hoặc áp dụng mã giảm giá.
Dữ liệu giỏ hàng phải được lưu tạm để hỗ trợ khôi phục khi khách hàng quay lại website.
Các thao tác thêm/xóa/cập nhật sản phẩm trong giỏ hàng phải được ghi nhận vào nhật ký hệ thống nhằm phục vụ phân tích hành vi mua sắm và xử lý khiếu nại nếu có.
Tình huống ngoại lệ
Nếu hệ thống không tìm thấy bất kỳ sản phẩm nào phù hợp với từ khóa tìm kiếm, hệ thống phải hiển thị thông báo: "Không tìm thấy sản phẩm phù hợp" và đề xuất các sản phẩm tương tự hoặc sản phẩm bán chạy.
Nếu khách hàng cố gắng thêm số lượng sản phẩm vượt quá tồn kho khả dụng, hệ thống phải từ chối thao tác và hiển thị số lượng tối đa có thể mua.
Trong trường hợp sản phẩm vừa hết hàng khi khách đang thao tác trong giỏ hàng, hệ thống phải hiển thị cảnh báo và yêu cầu khách cập nhật lại đơn hàng trước khi tiếp tục.
Nếu mã giảm giá không hợp lệ hoặc đã hết hạn, hệ thống phải hiển thị thông báo lỗi cụ thể và không áp dụng ưu đãi vào tổng đơn hàng.
Khi hệ thống không thể truy cập CSDL Sản phẩm hoặc dữ liệu tồn kho, website phải hiển thị thông báo: "Hệ thống đang bận, vui lòng thử lại sau."
Nếu khách hàng mất kết nối trong quá trình mua sắm, dữ liệu giỏ hàng chưa thanh toán phải được lưu tạm để tránh mất thông tin lựa chọn sản phẩm.
Trong trường hợp nhiều khách hàng cùng đặt mua một sản phẩm với số lượng giới hạn tại cùng thời điểm, hệ thống phải ưu tiên người hoàn tất thao tác trước và cập nhật lại tồn kho theo thời gian thực nhằm tránh phát sinh đơn hàng vượt mức tồn kho.
3.1.9. Thanh toán
Quy trình thanh toán bắt đầu khi khách hàng hoàn tất bước lựa chọn sản phẩm tại "Giỏ hàng" và nhấn nút "Tiến hành thanh toán" trên hệ thống PawPal. Tại thời điểm này, hệ thống tiến hành kiểm tra lại toàn bộ dữ liệu đơn hàng bao gồm danh sách sản phẩm, số lượng, giá bán hiện tại, mã giảm giá đã áp dụng, điểm thưởng nhận được và tình trạng tồn kho thực tế nhằm đảm bảo dữ liệu thanh toán luôn chính xác trước khi tạo giao dịch.
Sau khi xác minh dữ liệu đơn hàng hợp lệ, hệ thống hiển thị màn hình "Thanh toán đơn hàng". Đối với khách hàng đã đăng nhập, hệ thống tự động truy xuất thông tin nhận hàng đã lưu trước đó như họ tên, số điện thoại và địa chỉ giao hàng nhằm rút ngắn thao tác nhập liệu. Trong trường hợp khách vãng lai chưa đăng nhập, hệ thống yêu cầu cung cấp các thông tin tối thiểu bao gồm họ tên, số điện thoại và địa chỉ nhận hàng trước khi tiếp tục quy trình thanh toán.
Khi khách hàng hoàn tất thông tin giao hàng, hệ thống hiển thị danh sách các phương thức thanh toán được hỗ trợ như thanh toán khi nhận hàng (COD) hoặc thanh toán trực tuyến thông qua cổng thanh toán tích hợp. Nếu khách hàng lựa chọn COD, hệ thống sẽ trực tiếp chuyển sang bước xác nhận đơn hàng và tạo giao dịch ở trạng thái "Chờ xử lý". Ngược lại, nếu khách hàng chọn thanh toán online, hệ thống sẽ tạo một mã giao dịch tạm thời và chuyển hướng người dùng sang cổng thanh toán tương ứng để tiếp tục xử lý.
Tại cổng thanh toán trực tuyến, khách hàng tiến hành xác thực và hoàn tất giao dịch theo quy trình của nhà cung cấp thanh toán. Sau khi xử lý xong, cổng thanh toán sẽ gửi kết quả phản hồi về hệ thống PawPal thông qua cơ chế callback/API xác nhận giao dịch. Khi nhận được tín hiệu phản hồi thành công, hệ thống tiến hành cập nhật trạng thái đơn hàng sang "Đã thanh toán", đồng thời ghi nhận thông tin giao dịch bao gồm mã giao dịch, thời gian thanh toán, phương thức thanh toán và số tiền thanh toán vào CSDL Giao dịch.
Sau khi giao dịch thành công, hệ thống hiển thị "Trang Kết quả giao dịch thành công" kèm theo mã đơn hàng, trạng thái thanh toán, thông tin giao hàng và tóm tắt danh sách sản phẩm đã mua. Đồng thời, hệ thống tự động gửi SMS hoặc thông báo xác nhận đơn hàng nhằm giúp khách hàng dễ dàng tra cứu trong tương lai. 
Trong trường hợp giao dịch thất bại, bị từ chối hoặc khách hàng hủy thanh toán giữa chừng, hệ thống cập nhật trạng thái giao dịch thành "Thanh toán thất bại" nhưng vẫn giữ lại dữ liệu đơn hàng tạm thời trong một khoảng thời gian nhất định. Sau đó, hệ thống hiển thị "Trang kết quả giao dịch thất bại" và cho phép khách hàng lựa chọn thanh toán lại bằng cùng phương thức hoặc chuyển sang phương thức thanh toán khác mà không cần tạo lại toàn bộ đơn hàng từ đầu.
Để tránh phát sinh tình trạng trùng giao dịch, hệ thống áp dụng cơ chế khóa thanh toán 15 phút đối với mỗi đơn hàng trong thời gian xử lý giao dịch online. Trong trường hợp người dùng refresh trang hoặc nhấn thanh toán nhiều lần liên tiếp, hệ thống phải đảm bảo chỉ ghi nhận duy nhất một giao dịch hợp lệ nhằm tránh thanh toán trùng lặp.
Sau khi đơn hàng được thanh toán thành công, hệ thống tiến hành xử lý cộng điểm thưởng Paw Points cho khách hàng và đồng bộ trạng thái tồn kho trên hệ thống. Các sản phẩm trong đơn hàng sẽ được khóa số lượng tồn tương ứng nhằm đảm bảo tính chính xác dữ liệu kho trước khi chuyển sang quy trình vận hành giao hàng.
Cuối cùng, toàn bộ lịch sử thanh toán và trạng thái giao dịch sẽ được lưu trữ tại "Chi tiết đơn hàng" để khách hàng có thể tra cứu lại bất kỳ lúc nào. Tại thời điểm này, quy trình thanh toán kết thúc và đơn hàng chính thức chuyển sang giai đoạn xử lý vận hành hậu cần.
Quy tắc nghiệp vụ
Hệ thống phải kiểm tra lại tồn kho và giá bán tại thời điểm thanh toán nhằm tránh sai lệch dữ liệu do thay đổi trong quá trình mua sắm.
Một đơn hàng chỉ được phép tồn tại duy nhất một giao dịch thành công.
Hệ thống chỉ cập nhật trạng thái "Đã thanh toán" khi nhận được tín hiệu xác nhận hợp lệ từ cổng thanh toán hoặc khi khách hàng chọn COD.
Trong trường hợp thanh toán online, hệ thống phải lưu mã giao dịch để phục vụ tra soát và xử lý khiếu nại.
Các giao dịch thất bại không được phép tự động trừ tồn kho chính thức.
Đơn hàng COD phải được đánh dấu trạng thái "Chờ thanh toán" cho đến khi hoàn tất giao hàng.
Hệ thống phải ghi nhận đầy đủ nhật ký giao dịch bao gồm thời gian thanh toán, IP truy cập, phương thức thanh toán và trạng thái xử lý.
Thông tin thanh toán của khách hàng phải được mã hóa và không lưu trữ trực tiếp dữ liệu nhạy cảm như mật khẩu ngân hàng hoặc mã CVV.
Tình huống ngoại lệ
Nếu sản phẩm trong giỏ hàng vừa hết hàng tại thời điểm thanh toán, hệ thống phải hiển thị thông báo: "Một số sản phẩm đã hết hàng hoặc không đủ số lượng." và yêu cầu khách cập nhật lại đơn hàng.
Nếu mã giảm giá hết hạn trong lúc thanh toán, hệ thống phải tự động loại bỏ ưu đãi và hiển thị thông báo giải thích rõ nguyên nhân.
Trong trường hợp khách hàng thanh toán online nhưng mất kết nối internet giữa chừng, hệ thống phải giữ trạng thái giao dịch ở mức "Đang chờ xác minh" cho đến khi nhận phản hồi chính thức từ cổng thanh toán.
Nếu cổng thanh toán phản hồi lỗi hoặc timeout, hệ thống phải cập nhật trạng thái "Thanh toán thất bại" và cho phép người dùng thực hiện lại giao dịch.
Khi khách hàng refresh trang thanh toán nhiều lần hoặc gửi yêu cầu thanh toán trùng lặp, hệ thống phải chặn duplicate transaction và chỉ ghi nhận một giao dịch hợp lệ duy nhất.
Nếu hệ thống không thể ghi dữ liệu giao dịch vào cơ sở dữ liệu do lỗi máy chủ, trạng thái thanh toán phải được chuyển sang "Cần tra soát" để tránh mất dữ liệu giao dịch.
Trong trường hợp callback từ cổng thanh toán bị trễ hoặc gửi nhiều lần, hệ thống phải kiểm tra mã giao dịch duy nhất trước khi cập nhật trạng thái nhằm tránh ghi nhận thanh toán trùng lặp.
Nếu khách hàng thoát trang trước khi hoàn tất thanh toán, đơn hàng tạm thời phải được lưu trong thời gian cho phép để hỗ trợ khách tiếp tục thanh toán sau đó mà không cần tạo lại đơn hàng mới.
3.1.10. Quản lý đơn hàng
Mô tả quy trình
Quy trình quản lý đơn hàng bắt đầu sau khi khách hàng hoàn tất giao dịch mua sắm trên hệ thống PawPal. Khi đơn hàng được tạo thành công, hệ thống tự động ghi nhận thông tin vào CSDL Đơn hàng và khởi tạo trạng thái ban đầu là “Chờ xác nhận”. Đồng thời, dữ liệu đơn hàng được đồng bộ sang “Đơn hàng của tôi” để hệ thống tiếp nhận và xử lý vận hành.
Tại phía khách hàng, người dùng có thể truy cập mục “Chi tiết đơn hàng” để theo dõi toàn bộ các đơn hàng đã phát sinh trên hệ thống. Khi truy cập màn hình này, hệ thống tiến hành truy xuất danh sách đơn hàng theo tài khoản khách hàng và hiển thị các thông tin cơ bản như mã đơn hàng, ngày đặt hàng, tổng giá trị đơn hàng, trạng thái thanh toán và trạng thái vận chuyển hiện tại.
Khi khách hàng chọn xem chi tiết một đơn hàng cụ thể, hệ thống hiển thị đầy đủ dữ liệu liên quan bao gồm danh sách sản phẩm đã mua, số lượng, giá bán từng sản phẩm, phương thức thanh toán, địa chỉ giao hàng, lịch sử cập nhật trạng thái và thông tin vận chuyển tương ứng. Các trạng thái đơn hàng được hiển thị theo tiến trình xử lý thực tế như “Chờ xác nhận”, “Đang chuẩn bị hàng”, “Đang giao”, “Hoàn thành”, “Đã hủy” hoặc “Hoàn trả”.
Trong quá trình xử lý vận chuyển, hệ thống sẽ cập nhật trạng thái đơn hàng sang “Đang giao” hoặc ghi nhận các tình huống ngoại lệ như giao thất bại, khách từ chối nhận hàng hoặc thiếu sản phẩm. Mỗi lần trạng thái được cập nhật, hệ thống tự động gửi thông báo realtime hoặc email đến khách hàng nhằm giúp người dùng dễ dàng theo dõi tiến độ đơn hàng mà không cần liên hệ trực tiếp cửa hàng.
Khi đơn hàng được giao thành công, hệ thống cập nhật trạng thái cuối cùng là “Hoàn thành”, đồng thời ghi nhận thời gian hoàn tất giao hàng vào lịch sử giao dịch của khách hàng. Sau đó, đơn hàng sẽ được lưu trữ lâu dài trong mục “Lịch sử mua hàng” nhằm hỗ trợ khách hàng tra cứu lại các giao dịch trước đây hoặc thực hiện các chức năng hậu mãi như đánh giá sản phẩm, yêu cầu đổi trả hoặc mua lại sản phẩm cũ.
Trong trường hợp khách hàng thực hiện hủy đơn hàng trước khi vận chuyển hoặc phát sinh yêu cầu hoàn trả sau khi giao hàng thành công, hệ thống sẽ chuyển sang quy trình xử lý hậu mãi tương ứng và cập nhật trạng thái đơn hàng liên quan theo thời gian thực. Đồng thời, các thay đổi trạng thái này cũng được phản ánh trực tiếp trong lịch sử đơn hàng của khách hàng để đảm bảo tính minh bạch dữ liệu.
Quy tắc nghiệp vụ
Mỗi đơn hàng phải được gắn một mã đơn hàng duy nhất để phục vụ tra cứu và quản lý.
Hệ thống phải lưu toàn bộ lịch sử thay đổi trạng thái đơn hàng nhằm đảm bảo khả năng kiểm tra và đối soát dữ liệu.
Chỉ Admin hoặc nhân viên được phân quyền mới có quyền cập nhật trạng thái đơn hàng.
Khi đơn hàng được xác nhận xử lý, hệ thống phải khóa số lượng tồn kho tương ứng.
Các trạng thái đơn hàng phải tuân thủ đúng luồng xử lý nghiệp vụ và không được phép chuyển ngược bất hợp lệ (ví dụ: từ “Hoàn thành” quay về “Đang chuẩn bị hàng”).
Mọi thay đổi trạng thái đơn hàng phải kích hoạt cơ chế gửi thông báo đến khách hàng.
Đơn hàng hoàn thành phải được lưu trữ trong Đơn hàng của tôi để phục vụ tra cứu lâu dài và các chức năng hậu mãi.
Tình huống ngoại lệ
Nếu hệ thống không thể truy xuất dữ liệu đơn hàng từ cơ sở dữ liệu, hệ thống phải hiển thị thông báo: “Không thể tải dữ liệu đơn hàng, vui lòng thử lại sau.”
Trong trường hợp tồn kho không đủ khi Admin xác nhận đơn hàng, hệ thống phải hiển thị cảnh báo để nhân viên xử lý thủ công trước khi tiếp tục.
Nếu xảy ra lỗi đồng bộ trạng thái giữa hệ thống PawPal và đơn vị vận chuyển, trạng thái đơn hàng sẽ được chuyển sang “Cần kiểm tra” để tránh hiển thị sai dữ liệu cho khách hàng.
Nếu khách hàng mất kết nối internet trong lúc theo dõi đơn hàng, hệ thống phải tự động đồng bộ lại trạng thái mới nhất khi người dùng truy cập lại.
Khi đơn hàng bị hủy hoặc hoàn trả, hệ thống phải cập nhật đồng thời trạng thái đơn hàng và dữ liệu tồn kho nhằm đảm bảo tính nhất quán dữ liệu vận hành.
3.1.11. Đánh giá
Mô tả quy trình nghiệp vụ
Quy trình đánh giá được thiết kế để thu thập phản hồi của khách hàng về chất lượng sản phẩm và dịch vụ, bắt đầu thông qua hai luồng kích hoạt song song. Ở luồng thứ nhất, ngay khi hệ thống ghi nhận một giao dịch (mua hàng hoặc hoàn tất Spa/Hotel) chuyển sang trạng thái 'Hoàn thành', hệ thống sẽ tự động gửi một thông báo đến tài khoản người dùng kèm đường dẫn trực tiếp đến biểu mẫu phản hồi. Ở luồng thứ hai, người dùng chủ động truy cập vào màn hình Lịch hẹn cho bé (đối với các gói dịch vụ đã xong) hoặc mục Đơn hàng của tôi (đối với sản phẩm Shop) trên Dashboard cá nhân. Tại đây, hệ thống thực hiện lệnh truy vấn cơ sở dữ liệu để lọc và hiển thị danh sách các hoạt động đã hoàn tất nhưng chưa thực hiện đánh giá, kèm theo nút thao tác “Viết đánh giá”
Khi người dùng nhấn vào thông báo hoặc chọn thực thể từ danh sách, hệ thống thực hiện bước truy vấn thông tin chi tiết để hiển thị chính xác tên sản phẩm, hình ảnh minh họa hoặc tên dịch vụ đã sử dụng. Đồng thời, hệ thống tự động thực hiện một bước kiểm tra bảo mật: đối soát mã tài khoản người dùng với mã hóa đơn để xác thực quyền hạn. Bước này nhằm ngăn chặn các hành vi phản hồi ảo hoặc trùng lặp, đảm bảo mỗi lượt giao dịch chỉ được đánh giá duy nhất một lần. Sau khi xác thực thành công, hệ thống hiển thị biểu mẫu yêu cầu người dùng cung cấp thông tin bao gồm: chọn số sao với thang đo từ 1 đến 5, viết nội dung nhận xét và tùy chọn đính kèm tệp tin đa phương tiện hình ảnh hoặc video thực tế.
Trước khi ghi nhận dữ liệu chính thức, hệ thống hiển thị một thông báo xác nhận cuối cùng: "Bạn có chắc chắn muốn công khai phản hồi này không?". Quy trình phân nhánh tại đây: nếu người dùng chọn "Hủy", thao tác sẽ dừng lại và giữ nguyên các dữ liệu đã nhập trong biểu mẫu để người dùng có thể chỉnh sửa tiếp; nếu chọn "Xác nhận", hệ thống sẽ tiến hành ghi dữ liệu vào CSDL Đánh giá và tự động gắn nhãn "Người mua thực" cho phản hồi đó.
Ngay sau khi dữ liệu được lưu thành công, hệ thống thực hiện luồng xử lý hiển thị tự động dựa trên mức độ hài lòng. Các đánh giá đạt từ 4 sao trở lên sẽ được hệ thống hiển thị công khai ngay lập tức trên trang chi tiết tương ứng. Trong trường hợp đánh giá dưới 3 sao, trạng thái phản hồi sẽ được hệ thống xác lập là "Đang chờ hỗ trợ" để kích hoạt các luồng xử lý hậu mãi tự động nhằm bảo vệ quyền lợi khách hàng. Cuối cùng, hệ thống thực hiện lệnh cộng điểm thưởng Paw Points vào ví ưu đãi của thành viên như một sự tri ân, chính thức kết thúc quy trình đánh giá.
Quy tắc nghiệp vụ
Chỉ những giao dịch có trạng thái "Hoàn thành" (đã nhận hàng hoặc đã Check-out và thanh toán 100%) mới được phép đánh giá.
Mỗi mã giao dịch (mã hóa đơn/mã lịch hẹn) chỉ được phép thực hiện đánh giá 01 lần duy nhất.
Trường dữ liệu "Số sao" là bắt buộc; trường "Nội dung văn bản" và "Hình ảnh/Video" là tùy chọn.
Hệ thống tự động gắn nhãn "Người mua thực" cho tất cả đánh giá phát sinh từ quy trình này.
Điểm thưởng chỉ được cộng sau khi nhấn "Xác nhận" và dữ liệu đã được ghi thành công vào CSDL.
Hệ thống tự động kiểm duyệt và ẩn các đánh giá chứa từ ngữ nhạy cảm, xúc phạm hoặc vi phạm tiêu chuẩn cộng đồng (Sử dụng bộ lọc từ khóa có sẵn).
Tình huống ngoại lệ
Người dùng cố tình truy cập đánh giá của người khác: Hệ thống đối soát mã định danh, nếu không khớp sẽ hiển thị lỗi "Bạn không có quyền thực hiện thao tác này" và điều hướng về trang chủ.
Đơn hàng đã được đánh giá trước đó: Ẩn nút "Viết đánh giá" và thay bằng nhãn "Đã đánh giá". Nếu truy cập bằng link trực tiếp, hệ thống hiển thị thông báo "Giao dịch này đã hoàn tất phản hồi".
Nếu tệp quá dung lượng hoặc sai định dạng, hệ thống hiển thị cảnh báo đỏ và yêu cầu chọn lại tệp trước khi cho phép nhấn "Gửi".
Mất kết nối mạng khi đang gửi: Hệ thống lưu tạm nội dung vào bộ nhớ đệm và hiển thị thông báo "Đang thử kết nối lại để gửi đánh giá".
Người dùng nhấn "Hủy" tại bước xác nhận cuối: Hệ thống đóng cửa sổ thông báo xác nhận, giữ nguyên các dữ liệu đã nhập trong biểu mẫu để khách hàng có thể chỉnh sửa tiếp.

3.1.12. Quy trình Đổi trả hàng
Mô tả quy trình
Quy trình bắt đầu khi người dùng chủ động truy cập vào màn hình Đơn hàng của tôi trên Dashboard cá nhân. Ngay khi trang được tải, hệ thống thực hiện lệnh truy vấn cơ sở dữ liệu giao dịch để lọc và hiển thị danh sách các sản phẩm đã mua có trạng thái “Hoàn thành”. Tại đây, hệ thống thực hiện bước kiểm tra logic về thời gian: chỉ những đơn hàng nằm trong thời hạn đổi trả quy định (07 ngày kể từ ngày nhận hàng) mới hiển thị nút thao tác “Yêu cầu Đổi trả”
Khi người dùng nhấn vào nút yêu cầu, hệ thống hiển thị một biểu mẫu điện tử yêu cầu cung cấp các thông tin cần thiết bao gồm: lựa chọn loại hình là đổi hàng mới hoặc hoàn tiền, nhập lý do chi tiết và đính kèm tệp tin minh chứng là hình ảnh hoặc video thực tế của sản phẩm. Sau khi người dùng nhấn "Gửi yêu cầu", hệ thống thực hiện bước kiểm tra tính đầy đủ của dữ liệu; nếu hợp lệ, một Phiếu hậu mãi sẽ được khởi tạo với mã định danh duy nhất. Khách hàng ngay lập tức nhận được thông báo xác nhận và có thể theo dõi trạng thái của phiếu "Chờ kiểm duyệt", "Đã chấp nhận" hoặc "Cần bổ sung thông tin" trực tiếp tại màn hình quản lý yêu cầu trong mục “Đơn hàng của tôi”.
Quy trình phân nhánh dựa trên kết quả phản hồi của hệ thống được hiển thị tới người dùng. Trong trường hợp yêu cầu được chấp nhận, hệ thống hiển thị thông tin hướng dẫn chi tiết về quy trình đóng gói và địa chỉ gửi trả hàng về trung tâm chăm sóc của PawPal. Sau khi sản phẩm trả về được xác nhận khớp với minh chứng, người dùng sẽ nhận được thông báo về kết quả cuối cùng: nếu là đổi hàng, hệ thống tự động hiển thị mã đơn hàng mới với giá trị 0đ; nếu là hoàn tiền, hệ thống gửi thông báo xác nhận số tiền sẽ được hoàn trả về phương thức thanh toán ban đầu. Quy trình kết thúc khi trạng thái phiếu hậu mãi chuyển sang "Hoàn tất", hệ thống phải thu hồi toàn bộ Paw Points phát sinh từ luồng giao dịch đó, bao gồm cả điểm tích lũy mua sắm và điểm thưởng từ việc viết đánh giá (nếu có).
Quy tắc nghiệp vụ
Chỉ áp dụng cho sản phẩm vật lý mua tại Shop (thức ăn, phụ kiện, đồ chơi...). Không áp dụng đổi trả đối với các dịch vụ đã thực hiện xong (Spa, Hotel).
Yêu cầu phải được gửi trong vòng 07 ngày kể từ ngày đơn hàng chuyển sang trạng thái "Hoàn thành". Quá thời hạn này, nút "Yêu cầu Đổi trả" sẽ tự động ẩn.
Sản phẩm trả về phải còn nguyên tem mác, bao bì (đối với lỗi do khách hàng muốn đổi ý) hoặc có hình ảnh minh chứng hư hỏng/sai lệch (đối với lỗi do cửa hàng).
Hoàn lại 100% giá trị thực trả của sản phẩm sau khi trừ mã giảm giá.
Chỉ hỗ trợ đổi sang sản phẩm cùng loại hoặc sản phẩm có giá trị bằng/cao hơn (khách hàng bù chênh lệch).
Khi phiếu hoàn tiền được xác nhận thành công, hệ thống tự động khấu trừ số điểm Paw Points mà khách hàng đã nhận được từ đơn hàng đó.
Nếu lỗi do cửa hàng (giao sai, sản phẩm lỗi), shop chịu 100% phí ship. Nếu lỗi do khách hàng đổi ý, khách hàng chịu phí ship gửi trả và nhận hàng mới.
Xử lý ngoại lệ
Sản phẩm cần đổi đã hết hàng trong kho: Hệ thống hiển thị cảnh báo cho Nhân viên. Nhân viên liên hệ khách hàng để chuyển sang phương án hoàn tiền hoặc đổi sang sản phẩm tương đương.
Khách hàng đã dùng hết số điểm Paw Points định thu hồi: Hệ thống ghi nhận số dư Paw Points âm và sẽ trừ trừ dần vào các lần tích điểm tiếp theo của khách hàng.
Hàng trả về thực tế không đúng với minh chứng trong ảnh: Nhân viên nhấn nút "Khiếu nại yêu cầu", đính kèm ảnh chụp hàng thực tế nhận được. Hệ thống chuyển trạng thái phiếu sang "Tranh chấp" để Quản lý cơ sở vào phân xử.
Mất kết nối cổng thanh toán khi đang thực hiện hoàn tiền online: Hệ thống lưu trạng thái "Hoàn tiền thất bại", tự động thử lại sau mỗi 30 phút và gửi thông báo lỗi đến kỹ thuật viên nếu sau 3 lần vẫn thất bại.
Khách hàng đã đánh giá sản phẩm trước khi yêu cầu đổi trả: Hệ thống vẫn cho phép đổi trả, nhưng nếu hoàn tiền thành công, hệ thống sẽ gắn nhãn "Giao dịch đã hủy" lên bài đánh giá cũ để đảm bảo tính khách quan.
Khách hàng vãng lai yêu cầu đổi trả: Hệ thống yêu cầu khách hàng nhập "Mã đơn hàng" và "OTP SĐT" để xác thực quyền truy cập vào Phiếu hậu mãi mà không bắt buộc tạo mật khẩu.
3.1.13. Ưu đãi thành viên
Mô tả quy trình
Quy trình bắt đầu khi người dùng chủ động truy cập vào trang "Ưu đãi & Thành viên" thông qua Dashboard cá nhân. Ngay khi giao diện được tải, hệ thống tự động thực hiện lệnh truy vấn cơ sở dữ liệu thành viên để hiển thị chính xác số dư điểm thưởng Paw Points tích lũy và hạng thành viên hiện tại (Bạc, Vàng hoặc Kim Cương). Đồng thời, hệ thống cũng tiến hành quét danh mục ưu đãi để lọc ra các mã giảm giá hoặc phần thưởng đang khả dụng và phù hợp với cấp bậc tài khoản của người dùng. Luồng dữ liệu này giúp khách hàng nắm bắt nhanh chóng quyền lợi của mình và các mốc điểm cần thiết để đổi lấy những ưu đãi mong muốn.
Khi khách hàng chọn một phần thưởng cụ thể và nhấn nút "Đổi ưu đãi", hệ thống thực hiện một bước đối soát logic quan trọng: kiểm tra số dư Paw Points hiện có so với mức điểm yêu cầu của phần thưởng đó. Quy trình phân nhánh tại đây: nếu số dư không đủ, hệ thống hiển thị thông báo "Số điểm hiện tại chưa đủ để đổi quà" kèm theo gợi ý các cách thức tích lũy thêm điểm qua việc mua sắm; nếu số dư đạt yêu cầu, hệ thống sẽ hiển thị một cửa sổ xác nhận cuối cùng: "Bạn có chắc chắn muốn sử dụng [X] điểm để đổi lấy ưu đãi này không?". Bước xác nhận này giúp đảm bảo khách hàng đã kiểm tra kỹ trước khi hệ thống thực hiện lệnh trừ điểm vĩnh viễn.
Sau khi người dùng nhấn "Xác nhận", hệ thống bắt đầu thực hiện giao dịch ghi nợ điểm trong CSDL và đồng thời khởi tạo một Mã ưu đãi duy nhất gắn liền với tài khoản người dùng. Ngay lập tức, hệ thống thực hiện lệnh đồng bộ hóa dữ liệu để chuyển mã ưu đãi này vào mục "Voucher của tôi", giúp khách hàng có thể quản lý và sử dụng ngay tại bước thanh toán cho các đơn hàng tiếp theo. Quy trình kết thúc khi hệ thống hiển thị thông báo "Đổi quà thành công" kèm theo các thông tin về thời hạn sử dụng và điều kiện áp dụng, đảm bảo khách hàng luôn chủ động trong việc tận hưởng các đặc quyền thành viên tại PawPal.
Quy tắc nghiệp vụ
Hệ thống tự động cộng điểm theo tỷ lệ 100.000 VNĐ hóa đơn = 1 Paw Point. Điểm chỉ được cộng khi giao dịch ở trạng thái "Hoàn thành".
Phân hạng thành viên:
Hạng Bạc (Silver): Tổng chi tiêu < 5.000.000 VNĐ.
Hạng Vàng (Gold): Tổng chi tiêu từ 5.000.000 - 15.000.000 VNĐ.
Hạng Kim cương (Diamond): Tổng chi tiêu > 15.000.000 VNĐ.
 Khách hàng phải có tài khoản định danh chính thức (đã thiết lập mật khẩu) mới được thực hiện quyền đổi điểm lấy ưu đãi.
Mỗi mã giảm giá chỉ được áp dụng cho 01 đơn hàng/dịch vụ duy nhất và không có giá trị quy đổi thành tiền mặt.
Điểm Paw Points có thời hạn sử dụng trong vòng 12 tháng kể từ ngày phát sinh giao dịch cuối cùng. Hệ thống sẽ tự động gửi thông báo nhắc nhở 30 ngày trước khi điểm hết hạn.
Voucher đổi từ điểm thưởng có thể áp dụng đồng thời với các chương trình khuyến mãi chung của hệ thống.
Tình huống ngoại lệ
Hết số lượng ưu đãi: Hệ thống cập nhật trạng thái "Hết hàng" ngay trên giao diện đổi quà và ẩn nút "Đổi quà" để tránh khách hàng bị trừ điểm oan.
Mất kết nối CSDL khi đang thực hiện trừ điểm: Hệ thống áp dụng cơ chế Transaction: Nếu lệnh trừ điểm thất bại, lệnh cấp mã Voucher sẽ không được thực hiện. Hiển thị lỗi "Hệ thống bận, vui lòng thử lại sau".
Khách hàng vãng lai muốn đổi điểm: Hệ thống hiển thị popup: "Bạn cần thiết lập mật khẩu để sử dụng điểm thưởng". Sau khi khách tạo mật khẩu thành công, hệ thống tự động quay lại trang đổi quà.
Lỗi áp dụng Voucher khi thanh toán: Nếu mã đã hết hạn hoặc không khớp điều kiện, hệ thống hiển thị cảnh báo chi tiết lý do mã không hợp lệ.
Hoàn trả đơn hàng đã dùng Voucher đổi từ điểm: Nếu đơn hàng bị hủy/hoàn, hệ thống hoàn trả lại Voucher vào ví "Voucher của tôi" và thu hồi lại số điểm tích lũy mới (nhưng không trả lại điểm đã dùng để đổi Voucher đó).
3.1.14. Quản lý thông báo
Mô tả quy trình
Quy trình bắt đầu khi hệ thống ghi nhận một sự kiện thay đổi trạng thái liên quan đến hành trình trải nghiệm của khách hàng và bé cưng, bao gồm: xác nhận đặt lịch thành công, có cập nhật mới tại Nhật ký chăm sóc, đơn hàng chuyển sang trạng thái đang giao, hoặc các chương trình ưu đãi sắp hết hạn. Ngay khi sự kiện phát sinh, hệ thống tự động thực hiện lệnh truy vấn Cơ sở dữ liệu để trích xuất thông tin định danh và thực hiện luồng "Cá nhân hóa nội dung", đảm bảo các thông báo gửi đi bao gồm chính xác tên của người dùng và tên thú cưng từ Hồ sơ bé cưng tương ứng.
Khách hàng tiếp nhận thông báo thông qua hai hình thức chính trên giao diện website. Ở hình thức thứ nhất, một thông báo đẩy sẽ xuất hiện tức thì tại góc màn hình để thu hút sự chú ý đối với các sự kiện quan trọng. Ở hình thức thứ hai, người dùng có thể chủ động theo dõi tại biểu tượng "Chuông thông báo" trên thanh trình đơn. Khi nhấn vào biểu tượng này, hệ thống thực hiện truy vấn CSDL thông báo để hiển thị danh sách các tin nhắn được sắp xếp theo trình tự thời gian từ mới nhất đến cũ nhất, kèm theo các nhãn phân loại: dịch vụ, mua sắm, ưu đãi, giúp người dùng dễ dàng lọc và quản lý thông tin.
Quy trình phân nhánh khi người dùng tương tác với danh sách thông báo. Nếu người dùng nhấn vào một tiêu đề thông báo cụ thể, hệ thống sẽ thực hiện đồng thời hai hành động: (1) Thực hiện lệnh điều hướng dẫn người dùng đến chính xác màn hình liên quan đến nội dung đó, như dẫn về mục Lịch hẹn cho bé đối với các thông báo xác nhận/nhắc lịch, dẫn về Nhật ký chăm sóc đối với các cập nhật hình ảnh real-time, hoặc trang Chi tiết đơn hàng đối với việc mua sắm sản phẩm, (2) Tự động cập nhật trạng thái từ "Chưa đọc" sang "Đã đọc" trong CSDL để đồng bộ hiển thị.
Trong trường hợp người dùng muốn dọn dẹp không gian quản lý, hệ thống cung cấp tính năng "Đánh dấu đã đọc tất cả" hoặc "Xóa thông báo". Khi người dùng xác nhận thao tác xóa, hệ thống sẽ hiển thị một thông báo kiểm tra cuối cùng trước khi thực hiện lệnh ẩn hoặc xóa vĩnh viễn bản ghi khỏi giao diện Dashboard cá nhân. Quy trình kết thúc khi trạng thái hiển thị của các thông báo được cập nhật chính xác theo hành vi tương tác của khách hàng, đảm bảo một trải nghiệm quản lý thông tin liền mạch và không bị bỏ lỡ các cột mốc quan trọng trong quá trình sử dụng dịch vụ tại PawPal.
Quy tắc nghiệp vụ
Tất cả thông báo liên quan đến dịch vụ chăm sóc bắt buộc phải bao gồm tên của thú cưng (ví dụ: "Bé Bông đã tắm xong!") để tăng sự gắn kết cảm xúc.
Thời gian gửi: Các thông báo về khuyến mãi/marketing chỉ được gửi trong khung giờ từ 08:00 đến 21:00. Các thông báo giao dịch (OTP, xác nhận lịch) được gửi tức thì 24/7.
Nếu thông báo quan trọng (như thay đổi lịch hẹn) không được người dùng đọc trên website sau 15 phút, hệ thống tự động chuyển sang gửi tin nhắn Zalo/SMS dự phòng.
Giới hạn không quá 03 thông báo marketing/tuần cho mỗi khách hàng để tránh gây phiền hà.
Thông báo được lưu trữ trong danh sách "Thông báo của tôi" trong vòng 90 ngày, sau thời gian này hệ thống sẽ tự động xóa để tối ưu dung lượng.
Tình huống ngoại lệ
Gửi thông báo thất bại do lỗi mạng: Hệ thống lưu thông báo vào hàng chờ và thực hiện gửi lại tối đa 3 lần. Nếu vẫn thất bại, ghi nhận vào log lỗi để kỹ thuật viên kiểm tra.
Người dùng chặn nhận thông báo: Hệ thống kiểm tra cài đặt quyền riêng tư của người dùng trước khi gửi. Nếu người dùng tắt thông báo Shop, hệ thống chỉ gửi thông báo Dịch vụ khẩn cấp.
Thông báo nhắc lịch bị trễ: Nếu thời gian gửi thông báo nhắc lịch diễn ra sau giờ hẹn thực tế, hệ thống sẽ tự động hủy lệnh gửi để tránh gây hiểu lầm cho khách hàng.
Sai lệch thông tin trong nội dung: Nếu dữ liệu Hồ sơ thú cưng bị trống, hệ thống sử dụng cụm từ thay thế mặc định (ví dụ: "Bé yêu của bạn") để đảm bảo thông báo không bị lỗi hiển thị.
Trùng lặp thông báo: Hệ thống có bộ lọc kiểm tra trong vòng 5 phút, nếu có 2 thông báo cùng nội dung gửi cho 1 người dùng, hệ thống sẽ tự động hủy bỏ thông báo thứ hai.
3.1.15. Hỗ trợ khách hàng
Mô tả quy trình
Quy trình bắt đầu khi người dùng truy cập vào trang "Trung tâm trợ giúp" hoặc nhấn vào biểu tượng Chat trực tuyến tích hợp trên website. Ngay khi trang được tải, hệ thống thực hiện lệnh truy vấn vào cơ sở dữ liệu để hiển thị danh sách các câu hỏi thường gặp (FAQ) đã được phân loại theo từng danh mục như: tài khoản, đặt lịch và chính sách. Luồng dữ liệu này giúp người dùng có thể chủ động tìm kiếm giải pháp cho các vấn đề phổ biến thông qua thanh tìm kiếm thông minh mà không cần sự trợ giúp trực tiếp.
Trong trường hợp cần hỗ trợ chuyên sâu, người dùng tương tác qua khung chat để kích hoạt Chatbot AI. Hệ thống thực hiện lệnh đối soát thông tin từ mục Lịch hẹn cho bé (để kiểm tra lịch sắp tới), Nhật ký chăm sóc (để xem trạng thái chăm sóc hiện tại) và Đơn hàng của tôi (để theo dõi vận chuyển) để trả về các hướng dẫn cá nhân hóa ngay lập tức. Nếu giải pháp của AI đáp ứng được nhu cầu, người dùng nhấn "Hài lòng" để kết thúc. Ngược lại, hệ thống hiển thị tùy chọn "Kết nối với nhân viên". Tại đây, hệ thống kiểm tra trạng thái khả dụng của tư vấn viên; nếu trong giờ làm việc, người dùng sẽ được chuyển sang giao diện Chat trực tiếp.

Nếu yêu cầu phát sinh ngoài giờ làm việc hoặc người dùng muốn gửi khiếu nại bằng văn bản, hệ thống cung cấp biểu mẫu khởi tạo phiếu hỗ trợ. Người dùng thực hiện nhập tiêu đề, mô tả chi tiết sự cố và có tùy chọn đính kèm tệp tin đa phương tiện (hình ảnh/video) để minh chứng. Sau khi nhấn "Gửi yêu cầu", hệ thống hiển thị thông báo xác nhận kèm mã định danh Ticket duy nhất. Người dùng có thể theo dõi tiến độ xử lý, xem các phản hồi và gửi thêm phản biện trực tiếp tại màn hình "Yêu cầu của tôi" trên Dashboard cá nhân.
Quy trình phân nhánh ở giai đoạn kết thúc: sau khi nhận được phản hồi giải quyết từ phía cửa hàng, người dùng có quyền lựa chọn "Tiếp tục trao đổi" nếu chưa thỏa đáng, hoặc nhấn nút "Đóng hỗ trợ" để hoàn tất yêu cầu. Ngay sau khi nhấn đóng, hệ thống hiển thị một biểu mẫu đánh giá chất lượng cho phép người dùng chấm điểm mức độ hài lòng về quá trình hỗ trợ. Quy trình chính thức khép lại khi dữ liệu đánh giá được ghi nhận và hệ thống gửi thông báo cảm ơn đến người dùng.

Quy tắc nghiệp vụ
Các yêu cầu hỗ trợ liên quan đến sự cố sức khỏe bé cưng tại Hotel hoặc lỗi thanh toán trực tuyến bắt buộc phải được gắn nhãn "Ưu tiên cao" (High Priority) và xử lý trong vòng 15 phút.
Trong giờ làm việc (08:00 - 22:00), các Ticket thông thường phải được phản hồi trong tối đa 60 phút. Ngoài giờ làm việc, hệ thống tự động gửi thông báo hẹn thời gian xử lý vào đầu giờ sáng hôm sau.
Chatbot bắt buộc phải truy xuất được tên bé từ Hồ sơ bé cưng và mã vận đơn từ Đơn hàng của tôi để đưa ra câu trả lời chính xác, tránh bắt khách hàng phải cung cấp lại mã đơn hàng nhiều lần.
Nhân viên CSKH chỉ được quyền xem và xử lý các Ticket được phân phối cho mình hoặc của nhóm mình phụ trách.
Toàn bộ lịch sử hỗ trợ và Ticket phải được lưu trữ trong hồ sơ khách hàng để phục vụ công tác tra soát và cải thiện dịch vụ tại module CRM.
Tình huống ngoại lệ
Nhân viên hỗ trợ đang bận hoặc offline hết: Chatbot tự động gửi thông báo: "Hiện tại các tư vấn viên đều đang bận, bạn vui lòng để lại lời nhắn, chúng tôi sẽ phản hồi sớm nhất trong vòng 1 giờ".
Khách hàng vãng lai yêu cầu hỗ trợ: Hệ thống cho phép gửi Ticket nhưng yêu cầu cung cấp SĐT để xác thực qua OTP trước khi lưu Ticket nhằm tránh hành vi spam hệ thống.
Người dùng sử dụng từ ngữ không phù hợp trong Chat	Hệ thống tự động kích hoạt bộ lọc nội dung, cảnh báo người dùng và có quyền tự động ngắt phiên chat nếu vi phạm nhiều lần.
Lỗi tải tệp tin đính kèm: Nếu tệp không đúng định dạng hoặc quá dung lượng, hệ thống hiển thị cảnh báo và hướng dẫn khách hàng gửi ảnh qua link Zalo chính thức của PawPal.
Ticket bị bỏ quên: Hệ thống tự động kích hoạt lệnh nhắc nhở gửi đến Quản lý cơ sở để yêu cầu kiểm tra và xử lý ngay lập tức.
