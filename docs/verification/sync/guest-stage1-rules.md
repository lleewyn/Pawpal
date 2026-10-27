# GĐ-01: quy tắc giao dịch khách vãng lai

Ngày 27/10/2026 (Asia/Bangkok). Đây là đặc tả cho bước triển khai tiếp theo, **không phải kết quả chạy thành công giao dịch guest**. Kế thừa yêu cầu người dùng: đặt lịch/mua hàng không đăng nhập, không OTP; số điện thoại không chứng minh quyền sở hữu; không tự gộp hồ sơ; Admin nhận diện được khách vãng lai.

## Những gì khách được làm

Khách được xem catalog, chọn sản phẩm/gói dịch vụ, điền thông tin liên hệ và gửi yêu cầu. Đặt lịch cần chọn bé đã được phiên cho phép hoặc nhập bé mới. Mua hàng cần người nhận và địa chỉ theo phương thức giao nhận. Không đưa bước đăng ký, xác minh thiết bị hay OTP vào các thao tác này.

Chỉ tạo hồ sơ nghiệp vụ khi cần lưu bé hoặc gửi giao dịch; mở trang, nhập phone hoặc xin báo giá không tự tạo customer/pet/order. Sau thành công, hiển thị mã và trạng thái lấy từ máy chủ, không tự báo đã thanh toán.

## Quy tắc nhận diện

| Trường hợp | Quyết định phía máy chủ | UI được hiển thị |
| --- | --- | --- |
| Thành viên có Auth hợp lệ | Dùng đúng customer liên kết Auth, kiểm tra active; bỏ qua customer ID tùy ý từ client | Hồ sơ/bé của chính thành viên theo quyền hiện tại |
| Guest có phiên hợp lệ, phone không thay đổi | Dùng lại hồ sơ đã được server liên kết với phiên; giới hạn tài nguyên đúng phạm vi phiên | Thông tin và bé phiên được phép dùng, có thể thêm bé mới |
| Guest không có phiên, phone chưa gặp | Nhận dữ liệu mới; chỉ tạo customer/bé khi ghi nhận nghiệp vụ | Nội dung khách vừa nhập; không cần màn hình đăng ký |
| Guest khác phiên, phone trùng hồ sơ cũ | Không cấp quyền hồ sơ cũ, không cập nhật tên/phone/bé của hồ sơ đó. Cho giao dịch mới với dữ liệu khách tự nhập, lưu liên hệ chưa xác minh riêng | Không trả tên chủ, danh sách bé, hạng, địa chỉ, đơn hoặc lịch cũ |
| Có nhiều hồ sơ khớp phone | Không `LIMIT 1` để chọn/gộp. Xử lý như liên hệ chưa xác minh; Admin đối soát riêng | Vẫn nhập giao dịch mới; không lộ số hồ sơ hoặc danh tính người khác |
| Token hết hạn/thu hồi hoặc client sửa token | Không sử dụng quyền phiên cũ. Có thể bắt đầu phiên/giao dịch mới | Giữ bản nháp khách đang nhập nếu an toàn; không hiện dữ liệu cũ |
| Phiên đã xác định đúng hồ sơ nhưng hồ sơ bị khóa | Từ chối ghi cho hồ sơ bị khóa, thông báo liên hệ cửa hàng | Không âm thầm tạo hồ sơ khác để né khóa |

Phone trùng một hồ sơ bị khóa nhưng người gửi chưa chứng minh sở hữu không đủ để kết luận đó là cùng người. Không tiết lộ trạng thái khóa qua endpoint guest công khai. Giao dịch mới chưa xác minh vẫn chịu kiểm soát spam và Admin duyệt, không tự khôi phục tài khoản cũ.

Việc tạo hồ sơ nghiệp vụ tách biệt khi không chứng minh được quyền có thể tạo hai Customer ID có cùng liên hệ tự khai. Đây **không phải hợp nhất tự động** và không được khẳng định là cùng người. Chống trùng áp dụng cho cùng phiên/cùng yêu cầu gửi lại; không dùng nó để vượt kiểm soát quyền. Không đổi ID hay chuyển giao dịch cũ khi tiếp nhận liên hệ chưa xác minh.

**Ràng buộc cần giải quyết ở GĐ-02:** index phone chính hiện chỉ cho một hồ sơ dùng cùng số chính. Không tự bỏ index hoặc ghi đè phone để chạy được luồng mới. Thiết kế chỗ lưu liên hệ chưa xác minh/snapshot riêng phải bảo toàn dữ liệu người gửi và không chiếm phone chính của hồ sơ cũ. Nếu chưa triển khai phần lưu này thì trường hợp phone trùng chưa được coi là hỗ trợ xong. Không lưu phone chưa xác minh giả thành phone đã chứng minh sở hữu.

## Phiên và quyền dữ liệu

- Dùng token ngẫu nhiên tối thiểu 32 byte, lưu hash phía server. Cookie production `HttpOnly`, `Secure`, `SameSite=Lax`, path thống nhất; không ghi token vào URL, HTML, localStorage, log hay bằng chứng test.
- Mặc định thiết kế thời hạn tuyệt đối 7 ngày, có thể thu hồi. Hoạt động không tự kéo dài vô hạn. Đây là lựa chọn triển khai của đợt này, chưa áp dụng Cloud.
- Không gắn guest session giao dịch vào hồ sơ cũ chỉ bằng phone. Cookie tồn tại cũng chưa đủ: server kiểm tra token/hash, hạn, thu hồi, customer và phạm vi bé/tài nguyên mỗi lần đọc hoặc ghi.
- Chỉ trả trường tối thiểu cho chọn bé, phân trang khi cần; không trả lịch sử y tế/địa chỉ/giao dịch ngoài nhu cầu. Giữ riêng quyền tra cứu lịch sử; token giao dịch guest không tự cấp toàn bộ lịch sử customer.
- Đổi phone không chuyển quyền từ hồ sơ A sang B. Bản nháp được giữ, nhưng phải phân giải lại phạm vi phiên; quyền/tài nguyên cũ không được mang sang hồ sơ khác.
- Đăng nhập/đăng xuất phải tách cache giỏ, hồ sơ, danh sách bé và request journal theo owner. Không trộn giỏ guest với member bằng cách ghi đè; giữ hai bản và chỉ chuyển các dòng sản phẩm theo quy tắc rõ ràng, tính lại giá/kho/ưu đãi.
- Xác minh chủ sở hữu để nhận lại dữ liệu khi mất phiên hoặc kích hoạt thành viên là luồng riêng. OTP browser `555666` không tạo quyền server. Không thay đổi chế độ OTP hoặc gọi SMS trong GĐ-01.

## Số điện thoại và liên hệ

- Trong phạm vi hiện tại hỗ trợ số Việt Nam 10 chữ số bắt đầu `0`. Chuẩn hóa khoảng trắng, dấu cách trình bày `-`, `(`, `)`, `.`; `+84`, `0084` hoặc `84` kèm chín chữ số được đổi về `0` + chín chữ số.
- Không xóa tùy ý mọi ký tự để biến dữ liệu sai thành đúng; chữ cái, mã máy lẻ, số thiếu/thừa hoặc đầu số quốc tế khác phải báo lỗi tại trường. Kiểm tra ở server, không chỉ UI.
- So sánh bằng giá trị đã chuẩn hóa ở tất cả endpoint liên quan. Tên không phải khóa nhận diện; phone chỉ là liên hệ/đầu mối đối soát.
- Số hồ sơ và số người nhận đơn là hai trường nghiệp vụ riêng. Sửa người nhận không sửa phone hồ sơ hoặc chuyển owner của đơn.

## Bé cưng, lịch hẹn và đơn hàng

- Một customer có nhiều bé; mỗi bé có UUID riêng. Hai bé trùng tên vẫn độc lập; chỉ tạo ID khi cần lưu, không tạo lại khi refresh/retry cùng yêu cầu.
- Server xác định customer từ Auth/phiên hợp lệ; không tin `customer_id`, `pet_id` hay số tiền client gửi. Bé được chọn phải đúng owner, trạng thái và phạm vi phiên.
- Khi đặt cho nhiều bé: mỗi bé có lịch riêng. Trong đợt đầu, mỗi bé là một yêu cầu xác nhận có request ID riêng; không giả vờ một submit nhiều bé đã thành công hết nếu chỉ một lịch được lưu.
- Quote từ server, có phiên bản; giá đổi hoặc hết chỗ/hết kho phải yêu cầu xem lại. Khi submit, server kiểm tra lại cùng logic giá/kho/khả dụng của luồng đang dùng; không tạo payment thành công giả.
- Tạo customer/bé/lịch/items hoặc đơn/details/payment phải nhất quán trong transaction thích hợp. Lỗi giữa chừng rollback; không để đơn thiếu dòng hay bé mất owner.
- Request ID cố định cho mỗi lần xác nhận. Retry cùng owner, payload và ID trả cùng kết quả; cùng ID nhưng payload khác bị từ chối xung đột. Lỗi mạng chưa rõ kết quả phải kiểm tra mã cũ trước khi tạo mã mới.
- Giữ nguyên customer/pet/appointment/order cũ. Không hợp nhất hay chuyển owner tự động khi phát hiện trùng phone. Liên kết Auth hợp lệ phải giữ ID và lịch sử, xử lý xung đột rõ ràng trước khi ghi.

## Luồng lỗi và hiển thị

| Tình huống | Hành vi bắt buộc |
| --- | --- |
| Phone/tên/địa chỉ/bé thiếu hoặc không hợp lệ | Báo đúng trường, không ghi hồ sơ/giao dịch dang dở |
| Tra hồ sơ chậm hoặc thất bại | Không fallback đọc dữ liệu riêng bằng phone; không yêu cầu OTP chỉ để tiếp tục nhập giao dịch mới |
| Phone trùng, không đủ quyền | Hiển thị form nhập mới bình thường; không báo tên hoặc tình trạng tài khoản bị trùng |
| Hai tab gửi cùng request | Một kết quả nghiệp vụ; không nhân đôi customer/bé/đơn vì retry |
| Hai yêu cầu khác nhau | Mỗi giao dịch có mã riêng; không ghi đè giao dịch trước |
| Quote thay đổi/hết tồn/chỗ | Giữ giỏ/form, báo thay đổi và chờ khách xác nhận lại |
| Lỗi mạng sau submit | Giữ request ID và giỏ; xác minh kết quả cũ, chỉ dọn sau xác nhận thành công |
| Truy cập tài nguyên không thuộc phiên | Từ chối phía server, không trả dữ liệu của owner khác |

## Admin và băng thông

Admin phân loại `auth_user_id` có liên kết là Thành viên, chưa liên kết là Khách vãng lai; độc lập hạng điểm và khóa/hoạt động. Liên hệ tự khai chưa xác minh phải phân biệt với phone hồ sơ đã được xác lập; không hiển thị là tài khoản đã xác thực.

Không polling tìm hồ sơ theo mỗi phím gõ. Chỉ gửi sau khi phone hợp lệ và khách hoàn tất trường hoặc gửi form, hủy/loại kết quả request cũ. Quote khi đủ dữ liệu cần tính; không tải toàn bộ pet/order/customer. Realtime dùng bộ lọc đúng owner/tài nguyên cần xem; không mở subscription toàn bảng cho guest. Rate limit, giới hạn payload và kiểm tra nguồn request ở backend; không đưa service key ra browser. Upload/Storage và gateway thật giữ ngoài phạm vi hiện tại.

## Chuyển tiếp

GĐ-01 đã đặc tả luồng chính/lỗi, phone mơ hồ, quyền phiên, dữ liệu và retry theo các yêu cầu đã thống nhất. **Đánh dấu hoàn tất đặc tả không phải PASS kiểm thử tính năng.** GĐ-02 cần chọn phương án lưu liên hệ chưa xác minh, kiểm tra tương thích các lookup Auth cũ và chuẩn bị backup phục hồi được trước migration.

Khảo sát dữ liệu chỉ đọc ngày 27/10 giờ Việt Nam: 33 dòng phone, không sai định dạng/trùng sau chuẩn hóa, không bé thiếu chủ, không lịch sai chủ hoặc dòng chi tiết mất cha. [Bằng chứng tổng hợp](guest-data-integrity-readonly.txt). Không xuất phone/ID/tên khách; không sửa dữ liệu. Kết quả hiện tại không bảo đảm dữ liệu tương lai không thể trùng.
