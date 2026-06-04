3.1.Mô tả quy trình nghiệp vụ và Sơ đồ BPMN
### 3.1.1. Quy trình đăng ký
Mô tả quy trình 
Quy trình đăng ký thành viên trên hệ thống Pawpal được thiết kế linh hoạt nhằm tối ưu hóa tỷ lệ chuyển đổi thông qua hai luồng tiếp cận chính là Đăng ký chủ động dành cho những khách hàng muốn trở thành thành viên chính thức trước khi sử dụng dịch vụ và Định danh lũy tiến khi khách hàng vãng lai thực hiện đặt lịch hoặc mua hàng trước mà không cần dừng lại để tạo tài khoản.
Đối với Đăng ký chủ động, quy trình bắt đầu khi người dùng chọn chức năng "Đăng ký" trên giao diện Pawpal và cung cấp các thông tin gồm Họ tên, Số điện thoại và Mật khẩu. Ngay lập tức, Pawpal gửi một mã xác nhận (OTP) về số điện thoại để đảm bảo tài khoản thuộc về đúng chủ nhân. Sau khi nhập mã thành công, tài khoản được kích hoạt ngay lập tức và người dùng có thể đăng nhập, Pawpal điều hướng người dùng vào Trang chủ. Khách hàng được chào đón bằng thông báo chào mừng và nhận ngay 50 điểm thưởng Paw Points để bắt đầu hành trình chăm sóc thú cưng.
Đối với Định danh lũy tiến dành cho khách hàng vãng lai, Khi khách hàng đặt lịch hoặc thanh toán lần đầu, Pawpal chỉ yêu cầu những thông tin cần thiết cho giao dịch bao gồm Họ tên, Số điện thoại, thông tin cơ bản của bé cưng hoặc Địa chỉ giao nhận sản phẩm. Sau khi xác nhận thông tin, hệ thống sẽ ngầm khởi tạo một "Tài khoản tạm" gắn với số điện thoại khách hàng cung cấp. Khách hàng không cần gián đoạn để tạo tài khoản, giao dịch được ưu tiên hoàn tất trước. Sau khi giao dịch hoàn tất, Pawpal gửi một tin nhắn SMS với nội dung chào mừng, kèm theo đường dẫn thiết lập mật khẩu có hiệu lực trong 48 giờ và thông báo tặng ngay 50 điểm thưởng Paw Points để khuyến khích khách hàng kích hoạt tài khoản. Quy trình chính thức hoàn tất khi khách hàng nhấn vào liên kết, thiết lập mật khẩu, toàn bộ lịch sử đặt lịch và đơn hàng sẽ tự động hiển thị trong tài khoản mới, không cần nhập lại bất cứ thông tin nào.
Ngoài ra, trong trường hợp khách hàng trực tiếp đến cơ sở, Admin có thể hỗ trợ thực hiện quy trình đăng ký nhanh tại quầy chỉ với Họ tên và Số điện thoại để giúp khách hàng sở hữu tài khoản định danh ngay lập tức. Sau đó, Pawpal tự động gửi đường dẫn thiết lập mật khẩu về điện thoại khách hàng để họ hoàn tất kích hoạt khi thuận tiện.
Quy tắc nghiệp vụ 
Số điện thoại định danh: Mỗi số điện thoại chỉ tương ứng với một tài khoản duy nhất trên Pawpal, và phải đúng định dạng nhà mạng Việt Nam.
Xác thực OTP: Mã OTP có hiệu lực trong 5 phút để xác nhận số điện thoại là của khách hàng. Nếu mã hết hạn, khách hàng có thể yêu cầu gửi lại dễ dàng.
Cơ chế tài khoản tạm: Tài khoản tạm được hệ thống tự động khởi tạo ngay khi khách hàng vãng lai nhấn Xác nhận đặt lịch/mua hàng.
Hiệu lực liên kết xác thực: Đường dẫn thiết lập mật khẩu được gửi qua SMS Gateway có thời hạn sử dụng tối đa là 48 giờ.
Quyền truy cập tạm thời: Sau khi nhập SĐT, khách hàng được cấp quyền truy cập ngay dưới dạng tài khoản chưa kích hoạt hoàn toàn để trải nghiệm dịch vụ.
Bảo mật mật khẩu: Hệ thống bắt buộc khách hàng phải thiết lập mật khẩu trước khi có thể thực hiện quy trình Đổi điểm thưởng hoặc Hủy lịch hẹn. 
Mở khóa đầy đủ tính năng: Sau khi thiết lập mật khẩu, khách hàng mở khóa toàn bộ tính năng đổi điểm Paw Points, hủy/quản lý lịch hẹn, và xem nhật ký chăm sóc của thú cưng.
Quyền hạn tài khoản tạm: Tài khoản tạm chỉ có quyền xem lịch hẹn hiện tại, không có quyền đổi điểm thưởng hay quản lý chuyên sâu Pet ID cho đến khi được kích hoạt chính thức.
Cấp tài khoản tại quầy: Admin có quyền tạo tài khoản cho khách chỉ với Họ tên và SĐT, quy trình gửi link xác thực mật khẩu diễn ra tương tự đăng ký trực tuyến.
Tình huống ngoại lệ
Số điện thoại đã tồn tại: Pawpal từ chối đăng ký và hiển thị thông báo lỗi: "Số điện thoại đã tồn tại. Vui lòng đăng nhập hoặc khôi phục mật khẩu!" và hướng khách hàng đến trang đăng nhập hoặc khôi phục mật khẩu.
Không nhận được tin nhắn xác nhận: Nếu SMS không đến sau vài phút, Pawpal cho phép gửi lại tối đa 3 lần. Nếu vẫn không thành công, hệ thống hiển thị thông báo "Dịch vụ xác nhận đang tạm gián đoạn, vui lòng thử lại sau" và ghi nhận để đội kỹ thuật xử lý.
Link thiết lập mật khẩu hết hạn: Khi khách hàng nhấn vào link sau 48 giờ, hệ thống hiển thị thông báo lỗi "Liên kết đã hết hiệu lực" và cung cấp nút "Gửi lại link xác thực mới" để bảo mật lại từ đầu.
Số điện thoại không đúng định dạng: Hệ thống kiểm tra ngay tại bước nhập liệu, nếu không đủ 10 chữ số hoặc đầu số không hợp lệ sẽ hiển thị cảnh báo đỏ
Khách hàng không thiết lập mật khẩu: Sau 48 giờ nếu khách vãng lai không kích hoạt, "Tài khoản tạm" vẫn tồn tại để lưu trữ lịch sử giao dịch nhưng sẽ không có điểm thưởng và không thể đăng nhập cho đến khi khách yêu cầu khôi phục mật khẩu.
### 3.1.2. Quy trình đăng nhập và bảo mật
Mô tả quy trình 
Quy trình đăng nhập bắt đầu khi người dùng chọn chức năng “Đăng nhập” trên giao diện Pawpal. Tại đây, người dùng thực hiện nhập Số điện thoại, Pawpal nhận diện loại tài khoản và hướng dẫn bước tiếp theo phù hợp. 
Đối với Thành viên chính thức Pawpal yêu cầu Mật khẩu cá nhân, sau đó nhấn nút “Đăng nhập” để gửi yêu cầu truy cập. Nếu quên mật khẩu, khách hàng chọn "Quên mật khẩu" và nhập lại số điện thoại, Pawpal gửi ngay một đường dẫn đặt lại mật khẩu về điện thoại, có hiệu lực trong 48 giờ. Sau khi bấm vào đường dẫn và thiết lập mật khẩu mới, khách hàng đăng nhập bình thường. Trong trường hợp Pawpal không tìm thấy số điện thoại tương ứng, Pawpal hiển thị thông báo lỗi và hướng người dùng về trang Đăng ký.
Đối với Khách vãng lai có tài khoản tạm, chưa có mật khẩu, khách hàng chọn "Đăng nhập bằng SMS". Pawpal gửi một đường dẫn về điện thoại, khách hàng chỉ cần bấm vào là truy cập được ngay, không cần nhớ hay nhập thêm bất cứ thứ gì. Đây là luồng được thiết kế đặc biệt để hỗ trợ khách hàng lớn tuổi hoặc những ai muốn đơn giản hóa tối đa. Nếu khách hàng chưa thiết lập mật khẩu, đường dẫn sẽ dẫn vào Trang chủ Pawpal với một Popup hiện thông báo, khách hàng có thể chọn “Thiết lập mật khẩu” hoặc “Bỏ qua”. Nếu khách hàng chọn thiết lập thì Pawpal sẽ chuyển đến giao diện trang thiết lập mật khẩu, và nếu khách hàng bỏ qua thì khách hàng sẽ tiếp tục vào bằng tài khoản tạm chỉ có quyền truy cập Trang chủ, Dịch vụ, Đặt lịch và Mua hàng.
Sau khi đăng nhập thành công, Pawpal điều hướng về trang cá nhân và chào mừng khách hàng. Nếu khách hàng trước đây từng sử dụng dịch vụ với tư cách vãng lai, toàn bộ lịch sử được gộp tự động vào tài khoản, không có gì bị mất.
Nhằm tăng cường tính an toàn cho tài khoản, trong quá trình sử dụng, người dùng có thể truy cập vào mục “Cấu hình tài khoản” để thay đổi mật khẩu hoặc cập nhật các lớp bảo mật nâng cao. Để bảo vệ tài khoản, Pawpal bắt buộc yêu cầu xác nhận mật khẩu cũ hoặc người dùng chọn “Quên mật khẩu” và nhập SĐT, Pawpal sẽ gửi ngay đường link SMS để thiết lập mật khẩu mới để đảm bảo thao tác do chính chủ thực hiện trước khi cập nhật dữ liệu mới vào CSDL. 
Quy trình kết thúc khi người dùng truy cập thành công vào hệ thống hoặc sau khi hệ thống hiển thị các thông báo lỗi yêu cầu người dùng xử lý lại.

Quy tắc nghiệp vụ 
Định danh duy nhất: Hệ thống sử dụng Số điện thoại là khóa chính duy nhất để định danh tài khoản người dùng trong cơ sở dữ liệu.
Độ phức tạp mật khẩu: Mật khẩu phải có độ dài tối thiểu 8 ký tự, bao gồm ít nhất một chữ số và một ký tự đặc biệt
Hiệu lực mã OTP: Mã xác thực OTP được gửi qua hệ thống SMS Gateway có thời gian hiệu lực tối đa là 05 phút kể từ thời điểm phát sinh.
Ràng buộc bảo mật: Khách hàng bắt buộc phải hoàn tất bước thiết lập mật khẩu cá nhân mới có quyền truy cập vào các tính năng nhạy cảm như Đổi điểm thưởng (Paw Points) hoặc Thay đổi thông tin thanh toán.
Riêng tư cho bé cưng: Nhật ký chăm sóc chỉ hiển thị sau khi đăng nhập, đảm bảo thông tin của bé cưng được bảo mật.
Tình huống ngoại lệ
Truy cập từ thiết bị lạ: Hệ thống gửi cảnh báo "Phát hiện đăng nhập bất thường" qua tin nhắn để khách hàng chủ động kiểm tra và thực hiện đổi mật khẩu nếu cần.
3.1.3. Quản lý hồ sơ bé cưng
Mô tả quy trình 
Quy trình quản lý hồ sơ bé cưng khởi đầu sau khi người dùng đăng nhập thành công và truy cập vào mục "Hồ sơ của bé" trên Trang chủ. Tại giao diện này, Pawpal cho phép người dùng khởi tạo và duy trì Pet ID cho các bé cưng của mình thông qua các thao tác cụ thể
Trường hợp thêm mới hồ sơ, người dùng thực hiện cung cấp các thông tin định danh cơ bản bao gồm: Tên bé cưng, Giống loài, Cân nặng, Ảnh đại diện và đặc biệt là các thông tin nhạy cảm về y tế như tiền sử bệnh lý, dị ứng hoặc thói quen sinh hoạt. Sau khi nhấn nút “Lưu hồ sơ”, khởi tạo một mã định danh Pet ID duy nhất hiển thị trên giao diện người dùng
Trường hợp cập nhật thông tin, người dùng chọn một hồ sơ hiện có để thay đổi các thông tin hoặc cập nhật ảnh mới. Pawpal sẽ ghi nhận phiên bản cập nhật mới nhất để đảm bảo dữ liệu luôn khớp với tình trạng thực tế của thú cưng tại thời điểm sử dụng dịch vụ.
Ngay khi hồ sơ được xác lập, toàn bộ lịch sử từ lúc bé “Đã tiếp nhận” cho đến lúc hoàn thành sẽ được lưu trữ trong Nhật ký chăm sóc. Trong quá trình bé cưng lưu trú hoặc làm đẹp tại cửa hàng, các luồng dữ liệu hình ảnh từ Thiết bị ngoại vi sẽ được hệ thống gán trực tiếp vào mã Pet ID tương ứng, cho phép khách hàng giám sát thông tin một cách xuyên suốt. Khách hàng và Admin đều có quyền cập nhật các chỉ số sinh hoạt cho thú cưng để đảm bảo dữ liệu luôn khớp với tình trạng thực tế tại mỗi thời điểm sử dụng dịch vụ.
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
Trùng tên bé cưng trong một tài khoản: Hệ thống yêu cầu người dùng thêm ký hiệu phân biệt hoặc hậu tố nếu phát hiện tên thú cưng mới trùng với tên thú cưng đã có trong cùng một tài khoản khách hàng.
Sai lệch thông tin tại quầy: Trường hợp thông tin Pet ID bị khách hàng khai báo sai, Admin có quyền hiệu chỉnh lại dữ liệu dưới sự xác nhận của khách hàng ngay tại thời điểm tiếp nhận dịch vụ.
3.1.4. Đặt lịch hẹn
Mô tả quy trình 
Quy trình đặt lịch hẹn được thực hiện trực tuyến hoàn toàn trên website nhằm tối ưu hóa thời gian cho khách hàng và giảm tải vận hành cho Admin. Quy trình bắt đầu khi  người dùng truy cập mục "Đặt lịch ngay", nơi khách hàng lựa chọn loại hình mong muốn. Tại đây, Pawpal phân tách luồng xử lý dựa trên định danh người dùng.
Đối với Khách hàng thành viên, Pawpal điều hướng đến màn hình " Chọn bé cưng". Khách hàng chọn một hoặc nhiều hồ sơ có sẵn từ danh sách Pet ID. Hệ thống tự động truy xuất dữ liệu cân nặng và giống loài để làm cơ sở tính giá.
Đối với Khách vãng lai, Pawpal hiển thị màn hình “Thông tin khách hàng". Khách hàng nhập Họ tên, Số điện thoại và thông tin cơ bản của thú cưng bao gồm Tên, Giống loài, Cân nặng. Lúc này Pawpal chỉ ghi nhận dữ liệu vào bộ nhớ đệm.
Sau khi xác định đối tượng, khách hàng được chuyển đến màn hình "Chọn lịch & Nhân viên". Pawpal hiển thị các khung giờ trống theo thời gian thực và danh sách nhân viên chăm sóc đang sẵn sàng. Khách hàng có thể chọn đích danh nhân viên yêu thích hoặc chọn ngẫu nhiên để hệ thống tự điều phối. Ngay khi khách hàng nhấn chọn vào một ô lịch và nhân viên cụ thể, màn hình sẽ hiển thị đồng hồ đém ngược "Giữ chỗ tạm thời" và chuyển trạng thái ô đó sang "Đang chờ" trong vòng 15 phút. Trong thời gian này, không một người dùng nào khác có thể nhìn thấy hoặc thao tác trên ô đó. Cơ chế giữ chỗ này vẫn được duy trì ngay cả khi khách hàng thoát khỏi màn hình đặt lịch hoặc đóng trình duyệt, nhằm đảm bảo quyền ưu tiên cho khách hàng đã thao tác trước.
Tiếp theo, tại mục “Xác nhận thông tin dịch vụ", Pawpal hiển thị chi tiết dịch vụ và tổng tiền dự kiến. Để đảm bảo tính minh bạch và tránh hiểu lầm về mặt chi phí, hệ thống sẽ render một dòng thông báo lưu ý bắt mắt ngay trên hóa đơn tạm tính với nội dung “Mức giá hiển thị chỉ là giá dự kiến dựa trên số cân nặng do khách hàng tự khai báo, khi khách hàng mang bé cưng đến cửa hàng, nhân viên xin phép cân lại thực tế để áp mức giá niêm yết chính xác nhất”. Khi khách hàng nhấn nút "Xác nhận đặt lịch", lịch hẹn sẽ chuyển từ "Đang chờ" sang "Đã đặt". Đối với khách vãng lai, lúc này hệ thống mới ngầm khởi tạo "Tài khoản tạm" và đồng thời kích hoạt SMS Gateway gửi link thiết lập mật khẩu.
Quy trình hoàn tất khi khách hàng nhấn nút "Xác nhận đặt lịch", Pawpal hiển thị thông báo "Đặt lịch thành công" và đồng thời gửi tin nhắn thông báo đến số điện thoại khách hàng. Trên website thì thông tin sẽ hiển thị ở mục “Lịch hẹn của bé” và đồng thời được đồng bộ lên lịch vận hành của cửa hàng.
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
Pawpal sẽ điều hướng người dùng đến màn hình “Chọn lịch mới". Tại đây, Pawpal hiển thị các khung giờ trống theo thời gian thực và danh sách nhân viên chăm sóc đang sẵn sàng. Tương tự như quy trình đặt lịch ban đầu, ngay khi khách hàng nhấn chọn vào một ô lịch mới, màn hình sẽ hiển thị đồng hồ đém ngược "Giữ chỗ tạm thời" cho khung giờ đó trong vòng 15 phút và chuyển trạng thái ô lịch sang "Đang chờ". Đồng thời, Pawpal vẫn giữ nguyên trạng thái ô lịch cũ của khách hàng cho đến khi thao tác thay đổi được xác nhận thành công.
Sau khi chọn giờ và nhân viên mới, khách hàng tiến hành kiểm tra lại thông tin tại màn hình xác nhận. Nếu có sự chênh lệch về giá, Pawpal sẽ hiển thị bảng kê chi tiết số tiền cần bù hoặc số tiền dư được chuyển vào ví điểm thưởng. Sau đó, khách hàng nhấn "Xác nhận thay đổi" tại màn hình “Xác nhận thông tin dịch vụ". Lúc này, hệ thống Pawpal sẽ hiển thị trên màn hình chuyển trạng thái lịch hẹn mới thành "Đã đặt". Đồng thời, Pawpal lập tức giải phóng ô lịch cũ, người dùng sẽ thấy ô lịch chuyển về trạng thái "Trống" cho người dùng khác.
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
Khi khách hàng truy cập vào mục “Lịch hẹn chăm sóc” trên PawPal và lựa chọn một lịch hẹn đang ở trạng thái “Đã xác nhận”. Tại màn hình chi tiết lịch hẹn, khách hàng có thể xem lại đầy đủ thông tin về dịch vụ đã đặt, thời gian thực hiện và thông tin thú cưng trước khi quyết định hủy lịch.
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
Đối với tài khoản tạm, hệ thống yêu cầu khách hàng phải truy cập thông qua liên kết định danh trong SMS hoặc đã thiết lập mật khẩu trước đó mới có quyền thực hiện thay đổi.
Tình huống ngoại lệ
Nếu khách hàng thực hiện hủy lịch khi thời gian còn lại dưới 2 tiếng trước giờ hẹn, PawPal vô hiệu hóa nút “Hủy lịch”.
Trong trường hợp xảy ra lỗi đồng bộ dữ liệu khi cập nhật trạng thái lịch hẹn, PawPal khôi phục giao dịch và giữ nguyên trạng thái cũ.
Nếu khách hàng thoát trang hoặc mất kết nối internet trước khi xác nhận thao tác cuối cùng, PawPal sẽ không ghi nhận yêu cầu hủy lịch.
Nếu không thể truy cập CSDL Đặt lịch tại thời điểm xử lý, PawPal phải hiển thị thông báo: “PawPal đang bận, vui lòng thử lại sau.”
### 3.1.7. Theo dõi dịch vụ
Mô tả quy trình
Sau khi thú cưng được tiếp nhận tại cửa hàng PawPal để sử dụng các dịch vụ như Grooming, Spa, Pet Hotel hoặc chăm sóc đặc biệt. PawPal tự động tạo một phiên "Theo dõi trải nghiệm dịch vụ" tương ứng với lịch hẹn hiện tại và liên kết trực tiếp với hồ sơ bé cưng của khách hàng.
Trong suốt thời gian sử dụng dịch vụ, khách hàng có thể truy cập mục "Nhật ký bé cưng" để theo dõi tình trạng thú cưng theo thời gian thực. PawPal liên tục hiển thị các cột mốc chăm sóc được cập nhật trong quá trình phục vụ như "Đã tiếp nhận", "Đang tắm", "Đang sấy lông", "Đang nghỉ ngơi", "Đã cho ăn", "Đã uống thuốc" hoặc "Hoàn tất chăm sóc". Mỗi cập nhật đều đi kèm thời gian ghi nhận nhằm giúp khách hàng nắm bắt chính xác tiến độ dịch vụ của bé cưng. 
Khi khách hàng truy cập màn hình "Nhật ký bé cưng", khách hàng có thể xem toàn bộ dòng thời gian chăm sóc đang diễn ra. Nếu chưa có dữ liệu mới, PawPal hiển thị trạng thái "Đang chờ cập nhật từ nhân viên". Ngược lại, nếu đã có thông tin chăm sóc, các mốc hoạt động sẽ được hiển thị theo trình tự thời gian kèm hình ảnh, video hoặc ghi chú liên quan để khách hàng dễ dàng theo dõi. 
Trong trường hợp phát sinh các tình huống đặc biệt như thú cưng có dấu hiệu căng thẳng, bỏ ăn, dị ứng sản phẩm hoặc cần được theo dõi sức khỏe bổ sung, PawPal sẽ gửi tin nhắn SMS đến khách hàng và hiển thị thông báo đỏ ở màn hình nhật ký và trung tâm thông báo trên website. Bên cạnh đó, nhân viên phụ trách cũng sẽ gọi điện trao đổi trực tiếp với khách hàng. Khách hàng có thể xem nội dung ghi chú, theo dõi diễn biến và phản hồi trực tiếp khi cần thiết.
Sau khi dịch vụ hoàn tất và thú cưng được bàn giao lại cho khách hàng, PawPal cập nhật trạng thái cuối cùng là "Hoàn tất dịch vụ" và kết thúc phiên theo dõi thời gian thực. Toàn bộ dữ liệu trong phiên chăm sóc sẽ được chuyển sang khu vực lưu trữ lịch sử, cho phép khách hàng xem lại bất kỳ lúc nào.
Thông qua mục "Lịch sử chăm sóc", khách hàng có thể tra cứu các lần sử dụng dịch vụ trước đây của thú cưng, bao gồm hình ảnh, ghi chú chăm sóc và toàn bộ dòng thời gian trải nghiệm. Dữ liệu này giúp khách hàng theo dõi quá trình phát triển, tình trạng sức khỏe và lịch sử chăm sóc của thú cưng một cách đầy đủ theo thời gian.
Ngoài chức năng theo dõi dịch vụ, PawPal còn sử dụng dữ liệu lịch sử chăm sóc để cá nhân hóa trải nghiệm khách hàng. Dựa trên các lần sử dụng dịch vụ trước đó, PawPal có thể gợi ý lịch chăm sóc định kỳ, đề xuất các gói dịch vụ phù hợp hoặc gửi nhắc lịch grooming theo chu kỳ nhằm hỗ trợ khách hàng chăm sóc thú cưng hiệu quả hơn. 
Quy tắc nghiệp vụ
Mỗi lịch dịch vụ chỉ được phép tồn tại duy nhất một phiên "Theo dõi trải nghiệm dịch vụ" đang hoạt động tại cùng một thời điểm.
Mọi cập nhật trạng thái trên Timeline phải được gắn timestamp nhằm đảm bảo tính minh bạch và khả năng tra soát dữ liệu.
Hình ảnh hoặc video được tải lên phải liên kết trực tiếp với phiên dịch vụ hiện tại của thú cưng để tránh nhầm lẫn dữ liệu.
Timeline phải hiển thị dữ liệu theo thứ tự thời gian thực tế từ mới đến cũ nhằm đảm bảo tính liên tục trải nghiệm.
Khi dịch vụ kết thúc, PawPal tự động khóa quyền chỉnh sửa Timeline và chuyển dữ liệu sang chế độ lưu trữ.
Chỉ chủ sở hữu hợp lệ của thú cưng mới được phép truy cập nhật ký chăm sóc.
Mọi thao tác cập nhật trạng thái, hình ảnh hoặc ghi chú phải được ghi nhận vào nhật ký hệ thống nhằm phục vụ kiểm tra nội bộ hoặc xử lý khiếu nại.
Tình huống ngoại lệ 
Nếu nhân viên chưa cập nhật bất kỳ trạng thái nào sau khi thú cưng được check-in, PawPal sẽ hiển thị thông báo: "Dịch vụ đang được chuẩn bị, vui lòng chờ cập nhật từ nhân viên."
Khi nhân viên tải lên hình ảnh hoặc video không hợp lệ (sai định dạng, vượt dung lượng cho phép), PawPal từ chối upload và hiển thị thông báo lỗi cụ thể.
Nếu mất kết nối khi đang cập nhật, Pawpal tự động lưu tạm nội dung và cho nhân viên gửi lại khi có mạng trở lại để không mất dữ liệu.
Pawpal gửi thông báo và mời khách hàng thử lại sau nếu không tải được nhật ký, thay vì hiển thị màn hình trống.
Khi nhiều nhân viên cùng cập nhật một lúc, Pawpal giữ bản mới nhất và lưu lịch sử chỉnh sửa để đối chiếu nếu cần.
Nếu khách hàng thoát web rồi vào lại, Pawpal tự động đồng bộ toàn bộ nhật ký mới nhất để khách hàng không bỏ lỡ bất kỳ cập nhật nào.
### 3.1.8. Mua sắm
Mô tả quy trình
Khi khách hàng truy cập vào trang "Cửa hàng" trên PawPal để tìm kiếm và lựa chọn các sản phẩm dành cho thú cưng như thức ăn, phụ kiện, đồ chơi, quần áo hoặc sản phẩm chăm sóc sức khỏe, PawPal sẽ hiển thị danh sách sản phẩm theo nhiều nhóm phân loại như danh mục, thương hiệu, khoảng giá và tình trạng còn hàng, giúp khách hàng dễ dàng tìm thấy sản phẩm phù hợp với nhu cầu của thú cưng. 
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
Wishlist của khách hàng đã đăng nhập phải được đồng bộ đa thiết bị thông qua tài khoản cá nhân.
PawPal tự động cập nhật tổng giá trị đơn hàng sau mỗi thao tác thay đổi số lượng hoặc áp dụng mã giảm giá.
Dữ liệu giỏ hàng phải được lưu tạm để hỗ trợ khôi phục khi khách hàng quay lại website.
Tình huống ngoại lệ
Nếu không tìm thấy bất kỳ sản phẩm nào phù hợp với từ khóa tìm kiếm, PawPal hiển thị thông báo: "Không tìm thấy sản phẩm phù hợp" và đề xuất các sản phẩm tương tự hoặc sản phẩm bán chạy.
Nếu khách hàng cố gắng thêm số lượng sản phẩm vượt quá tồn kho khả dụng, PawPal từ chối thao tác và hiển thị số lượng tối đa có thể mua.
Trong trường hợp sản phẩm vừa hết hàng khi khách đang thao tác trong giỏ hàng, PawPal hiển thị cảnh báo và yêu cầu khách cập nhật lại đơn hàng trước khi tiếp tục.
Nếu mã giảm giá không hợp lệ hoặc đã hết hạn, Pawpal giải thích rõ lý do (hết hạn, không đủ điều kiện) để khách hàng biết và không bị nhầm.
Khi hệ thống không thể truy cập CSDL Sản phẩm hoặc dữ liệu tồn kho, PawPal hiển thị thông báo: "Hệ thống đang bận, vui lòng thử lại sau."
Nếu khách hàng mất kết nối trong quá trình mua sắm, dữ liệu giỏ hàng chưa thanh toán phải được lưu tạm để tránh mất thông tin lựa chọn sản phẩm.
Trong trường hợp nhiều khách hàng cùng đặt mua một sản phẩm với số lượng giới hạn tại cùng thời điểm, PawPal ưu tiên người hoàn tất thao tác trước và cập nhật lại tồn kho theo thời gian thực nhằm tránh phát sinh đơn hàng vượt mức tồn kho.
3.1.9. Thanh toán
Quy trình thanh toán bắt đầu khi khách hàng hoàn tất việc lựa chọn sản phẩm trong "Giỏ hàng" và nhấn nút "Tiến hành thanh toán" trên website PawPal. Trước khi chuyển sang bước thanh toán, PawPal kiểm tra lại thông tin đơn hàng bao gồm danh sách sản phẩm, số lượng, giá bán hiện tại, mã giảm giá đã áp dụng và tình trạng còn hàng nhằm đảm bảo dữ liệu hiển thị cho khách hàng là chính xác nhất.
Sau khi thông tin đơn hàng hợp lệ, PawPal hiển thị màn hình "Thanh toán đơn hàng". Đối với khách hàng đã đăng nhập, các thông tin nhận hàng đã lưu trước đó như họ tên, số điện thoại và địa chỉ giao hàng sẽ được tự động điền để giúp rút ngắn thời gian thao tác. Đối với khách vãng lai, PawPal yêu cầu cung cấp các thông tin cần thiết trước khi tiếp tục thanh toán.
Khi hoàn tất thông tin giao hàng, khách hàng lựa chọn phương thức thanh toán phù hợp. PawPal hỗ trợ các hình thức thanh toán như thanh toán khi nhận hàng (COD) hoặc thanh toán trực tuyến thông qua các cổng thanh toán được tích hợp trên website.
Nếu khách hàng lựa chọn thanh toán khi nhận hàng (COD), PawPal sẽ xác nhận đơn hàng thành công và chuyển đơn hàng sang trạng thái chờ xử lý. Khách hàng có thể tiếp tục theo dõi tình trạng đơn hàng trong mục "Đơn hàng của tôi" cho đến khi đơn hàng được giao thành công.
Nếu khách hàng lựa chọn thanh toán trực tuyến, PawPal sẽ chuyển hướng người dùng đến cổng thanh toán tương ứng để hoàn tất giao dịch. Tại đây, khách hàng thực hiện các bước xác thực theo quy định của đơn vị thanh toán. Sau khi giao dịch hoàn tất, khách hàng sẽ được chuyển trở lại website PawPal để nhận kết quả thanh toán.
Trong trường hợp giao dịch thành công, PawPal hiển thị "Trang Kết quả giao dịch thành công" cùng các thông tin quan trọng như mã đơn hàng, trạng thái thanh toán, thông tin giao hàng và danh sách sản phẩm đã mua. Đồng thời, khách hàng sẽ nhận được thông báo xác nhận đơn hàng để thuận tiện cho việc theo dõi và tra cứu về sau.
Trong trường hợp giao dịch không thành công hoặc khách hàng hủy thao tác thanh toán giữa chừng, PawPal hiển thị "Trang Kết quả giao dịch thất bại" kèm thông báo nguyên nhân tương ứng (nếu có). Khách hàng có thể lựa chọn thực hiện thanh toán lại hoặc thay đổi phương thức thanh toán mà không cần tạo lại đơn hàng từ đầu.
Sau khi thanh toán thành công, đơn hàng được ghi nhận vào mục "Đơn hàng của tôi", nơi khách hàng có thể theo dõi trạng thái xử lý, tra cứu lịch sử thanh toán và xem lại thông tin giao dịch bất kỳ lúc nào. 
Quy tắc nghiệp vụ
Tồn kho và giá sẽ được kiểm tra lại ngay lúc khách hàng thanh toán để đảm bảo không có nhầm lẫn về giá hoặc hàng hết.
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
Nếu nhấn thanh toán nhiều lần liên tiếp, Pawpal chỉ ghi nhận một giao dịch duy nhất và không trừ tiền nhiều lần.
Nếu khách hàng thoát trang trước khi hoàn tất thanh toán, đơn hàng tạm thời phải được lưu trong thời gian cho phép để hỗ trợ khách tiếp tục thanh toán sau đó mà không cần tạo lại đơn hàng mới.
### 3.1.10. Quản lý đơn hàng
Mô tả quy trình
Sau khi khách hàng hoàn tất giao dịch mua sắm trên PawPal, khách hàng có thể truy cập mục "Đơn hàng của tôi" để theo dõi tình trạng xử lý đơn hàng trong suốt vòng đời mua sắm.
Tại màn hình này, PawPal hiển thị danh sách toàn bộ các đơn hàng đã phát sinh theo tài khoản khách hàng, bao gồm các thông tin cơ bản như mã đơn hàng, ngày đặt hàng, tổng giá trị đơn hàng, trạng thái thanh toán và trạng thái xử lý hiện tại. Điều này giúp khách hàng dễ dàng nắm bắt tiến độ của từng đơn hàng mà không cần liên hệ trực tiếp với cửa hàng.
Khi lựa chọn một đơn hàng cụ thể, khách hàng được chuyển đến màn hình "Chi tiết đơn hàng". Tại đây, PawPal hiển thị đầy đủ các thông tin liên quan như danh sách sản phẩm đã mua, số lượng, đơn giá, tổng tiền thanh toán, địa chỉ giao hàng, phương thức thanh toán và lịch sử thay đổi trạng thái của đơn hàng. Đồng thời, khách hàng có thể theo dõi tiến trình xử lý thông qua các trạng thái như "Chờ xác nhận", "Đang chuẩn bị hàng", "Đang giao", "Hoàn thành", "Đã hủy" hoặc "Hoàn trả".
Khi đơn hàng được giao thành công, PawPal cập nhật trạng thái cuối cùng là "Hoàn thành" và lưu trữ đơn hàng trong khu vực "Lịch sử mua hàng". Khách hàng có thể truy cập lại bất kỳ lúc nào để xem thông tin giao dịch trước đây, mua lại sản phẩm đã từng sử dụng hoặc thực hiện các yêu cầu hậu mãi liên quan.
Trong trường hợp khách hàng hủy đơn hàng hoặc phát sinh yêu cầu đổi trả sau khi nhận hàng, trạng thái đơn hàng sẽ được cập nhật tương ứng và phản ánh trực tiếp trên màn hình chi tiết đơn hàng. Toàn bộ lịch sử thay đổi trạng thái đều được lưu lại nhằm đảm bảo tính minh bạch và hỗ trợ khách hàng dễ dàng theo dõi quá trình xử lý.
Quy tắc nghiệp vụ
Mỗi đơn hàng phải được gắn một mã đơn hàng duy nhất để phục vụ tra cứu và quản lý.
Đối với đơn hàng COD, trạng thái thanh toán chỉ được chuyển sang "Đã thanh toán" khi nhân viên xác nhận giao hàng thành công và đã thu đủ tiền từ khách hàng. Sau đó đơn hàng mới được phép chuyển sang trạng thái "Hoàn thành". 
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


# 3.1.11. Đánh giá
Mô tả quy trình nghiệp vụ
Quy trình đánh giá được thiết kế để lắng nghe phản hồi thực tế của khách hàng về chất lượng sản phẩm và dịch vụ. Ngay khi một giao dịch mua hàng hoặc dịch vụ Spa/Hotel chuyển sang trạng thái "Hoàn thành", Pawpal tự động gửi thông báo đến tài khoản khách hàng kèm đường dẫn trực tiếp đến form phản hồi. Khách hàng có thể chủ động vào "Lịch hẹn cho bé" (đối với dịch vụ) hoặc "Đơn hàng của tôi" (đối với sản phẩm Shop) trên trang cá nhân. Tại đây, khách hàng thấy danh sách các giao dịch đã hoàn thành nhưng chưa được đánh giá, kèm nút "Viết đánh giá" ngay bên cạnh.
Khi khách hàng nhấn vào thông báo hoặc chọn giao dịch từ danh sách, Pawpal hiển thị chính xác tên sản phẩm và hình ảnh minh họa hoặc tên dịch vụ tương ứng mà khách hàng không cần tự tìm lại. Đồng thời, Pawpal xác minh ngầm rằng đây đúng là giao dịch của khách hàng, nhằm đảm bảo mỗi lần mua hàng chỉ được đánh giá đúng một lần và không có phản hồi ảo.
Sau khi xác thực, khách hàng thấy form đánh giá gồm: chọn số sao từ 1 đến 5, viết nhận xét và tùy chọn đính kèm ảnh hoặc video thực tế.
Trước khi lưu, Pawpal hỏi xác nhận: "Bạn có chắc chắn muốn công khai phản hồi này không?". Nếu chọn "Hủy", toàn bộ nội dung đã nhập vẫn được giữ nguyên để chỉnh sửa tiếp. Nếu chọn "Xác nhận", đánh giá được lưu lại và tự động gắn nhãn "Người mua thực".
Ngay sau khi lưu thành công, Pawpal xử lý hiển thị dựa trên mức hài lòng: đánh giá từ 4 sao trở lên được công khai ngay trên trang sản phẩm/dịch vụ tương ứng. Với các đánh giá dưới 3 sao vẫn được hiển thị công khai trên trang sản phẩm/dịch vụ, đồng thời trạng thái phản hồi được xác lập là “Đang chờ hỗ trợ” để Pawpal chủ động kích hoạt các bước hậu mãi bảo vệ quyền lợi khách hàng. Ngay sau đó, Pawpal cộng điểm thưởng Paw Points vào tài khoản như lời cảm ơn chân thành, chính thức kết thúc quy trình đánh giá.


Quy tắc nghiệp vụ
Khách hàng chỉ thấy nút "Viết đánh giá" sau khi đã nhận hàng hoặc Check-out và thanh toán đầy đủ đảm bảo phản hồi dựa trên trải nghiệm thực tế.
Mỗi đơn hàng hoặc lịch hẹn chỉ được đánh giá một lần để đảm bảo tính khách quan.
Khách hàng cần chọn số sao; phần nhận xét và hình ảnh là tùy chọn linh hoạt theo mức độ muốn chia sẻ.
Tất cả đánh giá qua quy trình này được gắn nhãn tự động, giúp cộng đồng tin tưởng vào độ xác thực.
Paw Points được cộng ngay sau khi khách hàng nhấn "Xác nhận" thành công.
Pawpal tự động phát hiện và ẩn các đánh giá chứa từ ngữ xúc phạm hoặc vi phạm tiêu chuẩn cộng đồng thông qua bộ lọc từ khóa tích hợp.
Tình huống ngoại lệ
Người dùng cố tình truy cập đánh giá của người khác thì Pawpal kiểm tra quyền truy cập và thông báo rõ ràng, sau đó hướng khách hàng về trang cá nhân của mình.
Với giao dịch đã được đánh giá trước đó nút "Viết đánh giá" và thay bằng nhãn "Đã đánh giá" để khách hàng biết ngay mà không bị nhầm lẫn. Nếu truy cập bằng link trực tiếp, Pawpal hiển thị thông báo "Giao dịch này đã hoàn tất phản hồi".
Nếu tệp quá dung lượng hoặc sai định dạng, Pawpal báo ngay lý do như sai định dạng hoặc quá dung lượng cho phép chọn lại mà không mất nội dung đã nhập.
Mất kết nối mạng khi đang gửi thì Pawpal sẽ lưu tạm nội dung và thông báo đang thử kết nối lại khách hàng không cần nhập lại từ đầu
Người dùng nhấn "Hủy" tại bước xác nhận cuối thì Form sẽ đóng lại, nội dung vẫn được giữ nguyên để khách hàng tiếp tục chỉnh sửa khi sẵn sàng.

# 3.1.12. Quy trình Đổi trả hàng
Mô tả quy trình
Pawpal hỗ trợ đổi trả sản phẩm vật lý trong vòng 7 ngày sau khi nhận hàng. Toàn bộ quy trình được thực hiện trực tuyến để khách hàng không cần đến cửa hàng.
Khách hàng vào "Đơn hàng của tôi" trên trang cá nhân. Các đơn hàng còn trong thời hạn đổi trả hiển thị nút "Yêu cầu Đổi trả" ngay bên cạnh đơn nào hết hạn thì nút tự ẩn để tránh nhầm lẫn.
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
Khách hàng đã dùng hết số điểm Paw Points định thu hồi, tài khoản điểm tối thiểu là 0, không bao giờ âm. Phần điểm không thu hồi được thì Pawpal chịu.
Hàng trả về thực tế không đúng với minh chứng trong ảnh thì nhân viên nhấn nút "Khiếu nại yêu cầu", đính kèm ảnh chụp hàng thực tế nhận được. Pawpal chuyển trạng thái phiếu sang "Tranh chấp" để Quản lý cơ sở vào phân xử.
Mất kết nối cổng thanh toán khi đang thực hiện hoàn tiền online, Pawpal lưu trạng thái "Hoàn tiền thất bại" và tự động thử lại sau mỗi 30 phút; nếu sau 3 lần vẫn thất bại, đội kỹ thuật được thông báo để xử lý thủ công.
Khách hàng đã đánh giá sản phẩm trước khi yêu cầu đổi trả, Pawpal vẫn cho phép đổi trả. Nếu hoàn tiền thành công, bài đánh giá cũ được gắn nhãn "Giao dịch đã hủy" để đảm bảo tính minh bạch với cộng đồng.
Khách hàng vãng lai yêu cầu đổi trả: Khách hàng nhập mã đơn hàng và không cần xác thực thêm, 2 thông tin này đã đủ để xác minh quyền sở hữu đơn hàng, đơn giản hơn cho khách lớn tuổi.
# 3.1.13. Ưu đãi thành viên
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
# 3.1.14. Quản lý thông báo
Mô tả quy trình
Quy trình bắt đầu khi Pawpal ghi nhận một sự kiện thay đổi trạng thái liên quan đến hành trình của khách hàng và thú cưng, bao gồm: xác nhận đặt lịch thành công, có cập nhật mới tại Nhật ký chăm sóc, đơn hàng chuyển sang đang giao, hoặc các ưu đãi sắp hết hạn. Ngay khi sự kiện phát sinh, Pawpal trích xuất thông tin định danh và cá nhân hóa nội dung thông báo đảm bảo mỗi tin nhắn gửi đi đều có tên khách hàng và tên thú cưng tương ứng từ hồ sơ bé cưng.
Khách hàng tiếp nhận thông báo qua hai hình thức trên giao diện website. Ở hình thức thứ nhất, thông báo đẩy xuất hiện ngay góc màn hình để thu hút sự chú ý với các sự kiện quan trọng. Ở hình thức thứ hai, khách hàng chủ động xem tại biểu tượng "Chuông thông báo" trên menu. Khi nhấn vào biểu tượng này, danh sách thông báo hiển thị theo thứ tự từ mới nhất đến cũ nhất, kèm nhãn phân loại dịch vụ, mua sắm, ưu đãi giúp khách hàng dễ dàng lọc và quản lý thông tin.
Quy trình phân nhánh khi khách hàng tương tác với danh sách thông báo. Nếu nhấn vào một thông báo cụ thể, Pawpal thực hiện đồng thời hai việc: dẫn khách hàng đến đúng màn hình liên quan (Lịch hẹn cho bé với thông báo xác nhận/nhắc lịch, Nhật ký chăm sóc với cập nhật hình ảnh, Chi tiết đơn hàng với mua sắm) và tự động đánh dấu thông báo đó là "Đã đọc".
Khi muốn dọn dẹp thông báo, khách hàng có thể "Đánh dấu đã đọc tất cả" hoặc "Xóa thông báo". Pawpal hỏi xác nhận một lần trước khi xóa để tránh thao tác nhầm. Quy trình kết thúc khi trạng thái hiển thị của thông báo được cập nhật theo đúng hành vi của khách hàng đảm bảo một trải nghiệm quản lý thông tin liền mạch và không bỏ lỡ các cột mốc quan trọng trong hành trình sử dụng dịch vụ tại Pawpal.
Quy tắc nghiệp vụ
Tất cả thông báo liên quan đến dịch vụ chăm sóc bắt buộc phải bao gồm tên của thú cưng, ví dụ: "Bé Bông đã tắm xong!" để tăng sự gắn kết cảm xúc.
Thời gian gửi: Các thông báo về khuyến mãi/marketing chỉ được gửi trong khung giờ từ 08:00 đến 21:00. Các thông báo giao dịch (xác nhận lịch) được gửi tức thì 24/7.
Nếu thông báo quan trọng (như thay đổi lịch hẹn) không được người dùng đọc trên website sau 15 phút, Pawpal tự động chuyển sang gửi tin nhắn SMS dự phòng.
Giới hạn không quá 03 thông báo marketing/tuần cho mỗi khách hàng để tránh gây phiền hà.
Thông báo được lưu trữ trong danh sách "Thông báo của tôi" trong vòng 90 ngày, sau thời gian này Pawpal sẽ tự động xóa để tối ưu dung lượng.
Tình huống ngoại lệ
Nếu gửi thông báo thất bại do lỗi mạng, Pawpal đưa vào hàng chờ và thử lại tối đa 3 lần. Nếu vẫn thất bại, sự cố được ghi nhận để đội kỹ thuật kiểm tra và xử lý.
Người dùng chặn nhận thông báo, Pawpal kiểm tra cài đặt quyền riêng tư của người dùng trước khi gửi. Nếu người dùng tắt thông báo Shop, Pawpal chỉ gửi thông báo Dịch vụ khẩn cấp.
Thông báo nhắc lịch bị trễ: Nếu thời gian gửi thông báo nhắc lịch diễn ra sau giờ hẹn thực tế, Pawpal tự động hủy lệnh gửi để tránh gây nhầm lẫn hoặc lo lắng không cần thiết cho khách hàng.
Nếu thú cưng chưa có tên trong hồ sơ, Pawpal dùng cụm từ thay thế mặc định (ví dụ: "Bé yêu của bạn") để thông báo vẫn được gửi bình thường mà không bị lỗi hiển thị.
Pawpal kiểm tra trong vòng 5 phút; nếu có 2 thông báo giống nhau gửi cho cùng một khách hàng, thông báo thứ hai tự động bị hủy khách hàng không bị làm phiền nhiều lần.
# 3.1.15. Hỗ trợ khách hàng
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
