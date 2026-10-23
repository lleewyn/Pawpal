# Đề xuất hoàn thiện chấm công, lương, thưởng và hoa hồng

Ngày 22/10/2026. **Bản đề xuất để người dùng xem trước khi triển khai. Chưa tạo bảng, áp migration, tính lương hay thay đổi dữ liệu Cloud.**

**Quyết định scope của người dùng: gác lại toàn bộ phần chấm công thực tế, lương, thưởng, hoa hồng và bảng lương. Chỉ xem xét lại sau khi hoàn tất các phần trong scope hiện tại và người dùng yêu cầu tiếp.** Giữ tài liệu làm tham khảo; không triển khai 6 bảng đề xuất, không áp công thức hoặc mức tiền và không coi phần này là điều kiện đóng nghiệm thu Nhân sự hiện tại.

## Phương án đề xuất cho Pawpal

Làm một quy trình gọn trong phân hệ Nhân sự: phân ca → ghi nhận giờ thực tế → quản lý xác nhận → lập bảng lương tháng → kiểm tra và duyệt → xác nhận đã trả. Lương, thưởng và hoa hồng đều xem được nguồn chi tiết, không chỉ hiển thị một con số tổng.

Giữ bốn tab hiện tại, dùng đúng các file core/tab sẵn có. Không thêm chi nhánh, máy chấm công, nhận diện khuôn mặt, định vị hoặc tự động chuyển khoản vào phạm vi này.

| Phần | Đề xuất mặc định |
|---|---|
| Chấm công | Quản lý ghi và xác nhận giờ vào/ra thực tế theo ca; chưa cần nhân viên có tài khoản đăng nhập để chấm công |
| Lương | Cấu hình riêng từng nhân viên: theo tháng hoặc theo giờ; không có cấu hình thì không lập số tiền lương |
| Thưởng | Nhập khoản thưởng theo nhân viên và kỳ, có số tiền, loại và lý do; chỉ cộng sau khi duyệt |
| Hoa hồng | Dùng tỷ lệ cấu hình ở dịch vụ, chốt tỷ lệ/người thực hiện/số tiền làm căn cứ khi đủ điều kiện; không tự áp một tỷ lệ chung |
| Kỳ lương | Theo tháng, múi giờ Việt Nam; có ngày bắt đầu/kết thúc rõ ràng |
| Chi trả | Quản lý xác nhận đã trả toàn bộ từng dòng lương, ghi phương thức và ngày trả thực tế; chưa tự động trả tiền hoặc trả từng phần |

## 1. Chấm công thực tế

Trong tab **Lịch làm việc**, mỗi ca có thêm nút **Chấm công**. Form hiển thị nhân viên, giờ phân ca, giờ vào/ra thực tế, thời gian nghỉ không tính công, ghi chú và trạng thái duyệt.

- Có thể để giờ ra trống khi ca chưa kết thúc. Chưa đủ giờ vào/ra thì chưa tổng hợp giờ tính lương.
- Quản lý nhập thời điểm thực tế; không tự sao chép giờ phân ca rồi coi đó là giờ đã làm.
- Số phút thực tế = giờ ra − giờ vào − số phút nghỉ được ghi nhận. Lưu độ chính xác tới phút, không tự làm tròn thành ca 4/8 giờ.
- Hỗ trợ ca qua đêm. Không cho giờ ra trước giờ vào, số phút nghỉ âm/vượt khoảng ca, hoặc giờ thực tế trùng ca khác của cùng nhân viên.
- Trạng thái: chưa đủ thông tin → chờ duyệt → đã duyệt; có thể từ chối với lý do. Chỉ công đã duyệt đi vào lương theo giờ.
- Sửa công đã duyệt phải có lý do và đưa về chờ duyệt lại. Công thuộc bảng lương đã duyệt không được sửa âm thầm.
- Không tự phạt đi muộn, trừ lương, tính hệ số tăng ca hoặc suy ra nghỉ không phép. Nếu cần khoản điều chỉnh, quản lý ghi riêng có lý do và duyệt.

Ví dụ minh họa, không phải dữ liệu sẽ nhập: ca phân 08:00–12:00; thực tế 08:10–12:05, nghỉ 15 phút → 220 phút được đề nghị xác nhận. Chỉ sau duyệt mới là giờ làm được chấp nhận.

## 2. Cấu hình và tính lương

Trong **Hồ sơ → Thu nhập**, có nút **Cấu hình lương**: cách tính, mức tiền, ngày hiệu lực và ghi chú. Lịch sử cấu hình được giữ lại; thay mức mới không sửa bảng lương cũ.

| Cách tính | Công thức đề xuất |
|---|---|
| Theo tháng | Mức lương tháng đã cấu hình. Không tự chia 26 công hoặc tự trừ theo số ca thiếu |
| Theo giờ | Tổng phút thực tế đã duyệt thuộc kỳ ÷ 60 × đơn giá giờ có hiệu lực |

Với lương tháng, trường hợp vào/nghỉ việc giữa tháng hoặc đổi mức giữa kỳ phải được quản lý xác nhận số tiền lương cơ bản của kỳ kèm lý do; không tự chọn công thức chia ngày. Với lương giờ, tách phần thời gian theo mốc đổi đơn giá và theo biên kỳ, tránh tính toàn bộ ca qua tháng vào một kỳ.

Tiền hiển thị bằng đồng Việt Nam. Tính bằng kiểu số thập phân ở CSDL, làm tròn đến đồng khi chốt từng khoản trả; không nhân/chia bằng số thực JavaScript để quyết định tiền.

## 3. Thưởng và điều chỉnh

Nút **Thêm khoản thưởng** trong chi tiết lương: nhân viên, kỳ, loại thưởng, số tiền và lý do. Các loại ban đầu: khách chỉ định, an toàn, thưởng khác. Có thể ghi khoản điều chỉnh tăng hoặc giảm riêng với lý do; không biến điểm đánh giá thành khoản phạt tự động.

- Không mặc định 20.000đ/lượt hay thưởng vì “không có khiếu nại”.
- Nhập nháp chưa cộng vào thu nhập được duyệt. Ghi rõ ai đề nghị, ai duyệt và lúc duyệt.
- Không xóa khoản đã chốt; hủy/đảo khoản bằng bản ghi có liên kết và lý do.
- Bảng lương sau duyệt chỉ thay đổi bằng quy trình mở lại có nhật ký nếu chưa trả, hoặc điều chỉnh kỳ sau nếu đã trả.

## 4. Hoa hồng dịch vụ

Tận dụng `service.commission_rate` hiện có, nhưng không lấy tỷ lệ hiện tại để tính lại mọi ca trong quá khứ.

1. Chỉ xét dịch vụ đã hoàn thành, xác định được người thực hiện và khoản tiền khách đã thanh toán đủ.
2. Chốt người hưởng và tỷ lệ theo cấu hình tại thời điểm hoàn thành dịch vụ; giữ thông tin này khi chờ khách thanh toán. Dịch vụ chưa bật tính hoa hồng hoặc mức 0 thì không tự phát sinh tiền.
3. Khi xác định chắc số tiền thuộc dòng dịch vụ, tính: **tiền làm căn cứ × tỷ lệ đã chốt / 100**. Khoản thu hộ, phí giao nhận hoặc khoản ngoài dịch vụ không tự gộp vào căn cứ.
4. Nếu có giảm giá/điều chỉnh/hoàn tiền ở cấp cả lịch mà chưa phân bổ được cho dòng dịch vụ, hoặc nhiều người thực hiện chưa có tỷ lệ chia: đưa vào **Chờ xác nhận căn cứ**. Quản lý xác nhận số tiền/người hưởng có lý do; không tự chia đều hay đoán số tiền.
5. Tiền hoa hồng đủ điều kiện vào kỳ chứa thời điểm đủ cả điều kiện hoàn thành và thanh toán. Dịch vụ cũ trước khi có cơ chế chốt cần đối soát riêng, không tự hồi tố hàng loạt.
6. Hoàn tiền trước chốt kỳ thì xem xét lại khoản hoa hồng tương ứng; sau khi đã trả thì tạo điều chỉnh kỳ sau có nguồn. Nếu chưa phân bổ được khoản hoàn, chờ quản lý xác nhận, không tự trừ nhầm người.

Mỗi nguồn có mã chống ghi lặp. Bấm lưu hoặc nhận sự kiện thanh toán nhiều lần không tạo hoa hồng trùng. Không sửa đơn hàng/lịch dịch vụ để phục vụ bảng lương.

## 5. Bảng lương tháng

Từ tab **Nhân sự**, nút **Bảng lương** mở danh sách kỳ. Chi tiết một kỳ gồm từng nhân viên: lương cơ bản, giờ được duyệt nếu theo giờ, hoa hồng, thưởng, điều chỉnh và tổng được nhận.

**Tổng được nhận = lương cơ bản đã xác nhận + hoa hồng đủ điều kiện + thưởng đã duyệt + điều chỉnh đã duyệt.**

Trạng thái kỳ: nháp → đã duyệt → đã trả khi tất cả các dòng cần trả đã được xác nhận. Từng nhân viên có trạng thái chi trả riêng để không coi cả kỳ đã trả khi mới trả một người.

- Khi tạo/cập nhật nháp, phải liệt kê công còn chờ duyệt, cấu hình lương còn thiếu và hoa hồng cần đối soát.
- Không duyệt nếu còn khoản tiền chưa xác định, công chưa đủ hoặc tổng âm cần xử lý. Không biến khoản thiếu cấu hình thành 0đ.
- Duyệt sẽ chốt các nguồn và số tiền. Thay cấu hình hoặc thêm công sau đó không làm tiền đã duyệt tự đổi.
- Chỉ được xác nhận đã trả sau khi duyệt, ghi ngày trả/phương thức thực tế và tham chiếu nếu có. Đây là xác nhận thủ công, không phải lệnh chuyển tiền.
- Không dùng bảng thu tiền khách hàng để ghi khoản chi lương; hai nghiệp vụ khác nhau.

## 6. CSDL tối thiểu đề xuất

Thiết kế 105 bảng hiện tại chưa có các thực thể này. **Đề xuất bổ sung 6 bảng thành 111 bảng**, không coi đây là các bảng bắt buộc do chuẩn hóa 3NF của nghiệp vụ cũ. Chúng phục vụ phạm vi lương/chấm công mới vừa được yêu cầu.

| Bảng đề xuất | Nội dung và ràng buộc chính |
|---|---|
| `staff_attendance` | Một bản ghi công cho một ca; FK ca/nhân viên, giờ vào/ra, phút nghỉ, trạng thái, người xác nhận, phiên bản; giữ lịch sử sửa trong audit |
| `staff_compensation` | Cấu hình lương theo nhân viên và khoảng hiệu lực; loại tháng/giờ, mức tiền, bật/tắt hoa hồng; không trùng khoảng hiệu lực |
| `payroll_period` | Khoảng kỳ, trạng thái, người duyệt và ngày duyệt; không tạo kỳ chồng nhau trong phạm vi chi trả này |
| `payroll_entry` | Một nhân viên/một kỳ; các khoản chốt, cấu hình/cách tính đã dùng, trạng thái/ngày/phương thức chi trả; UNIQUE nhân viên và kỳ |
| `payroll_adjustment` | Thưởng/điều chỉnh tăng giảm, lý do, trạng thái duyệt, người tạo/duyệt; liên kết khoản gốc nếu đảo hoặc điều chỉnh kỳ sau |
| `staff_commission_entry` | Nguồn dòng dịch vụ/người hưởng, thời điểm chốt tỷ lệ, tỷ lệ và căn cứ tiền đã xác nhận, trạng thái, liên kết kỳ hoặc khoản đảo; khóa chống ghi lặp |

Chi tiết nguồn công và cách tính của một dòng lương phải được giữ khi chốt. Trong phương án tối thiểu, lưu bản chốt nguồn bất biến có phiên bản để đối soát; đây là dữ liệu chứng từ trong CSDL, không phải file JSON giả dùng thay Supabase. Nếu cần truy vấn từng nguồn chốt bằng quan hệ đầy đủ, sẽ bổ sung bảng liên kết sau khi xét yêu cầu báo cáo, không lén thêm vào con số 6 bảng trên.

## 7. Quyền và tính nhất quán

- Các quyền riêng: đọc công, ghi công, duyệt công; đọc lương, cấu hình lương, lập lương, duyệt lương và xác nhận chi trả.
- Quyền phải kiểm tra trong RPC/API. Không dùng role trong sessionStorage để bảo vệ dữ liệu lương, không gửi lương của người khác xuống trình duyệt rồi mới che chữ.
- Admin có thể vận hành toàn bộ. Người được cấp quyền từng phần chỉ làm đúng phần được cấp; không tự suy quyền từ chức danh.
- Nhân viên chưa được mở Auth vẫn có thể được quản lý phân ca, xác nhận công và trả lương. Không tự mở khóa 16 tài khoản hiện có.
- Kiểm tra phiên bản khi sửa/duyệt; các bước duyệt, chốt và xác nhận trả là giao dịch nguyên tử, có mã chống ghi lặp và nhật ký. Không cho hai yêu cầu cùng ghi trả hai lần.
- Thực hiện trên bản phục hồi trước, đối soát và sao lưu trước khi áp Cloud. Không tạo lương, thưởng hay khoản chi thử trong dữ liệu Production.

## 8. Thứ tự triển khai và nghiệm thu

1. Chốt đề xuất và cập nhật tài liệu thiết kế vật lý cho các thực thể mới.
2. Làm form chấm công, kiểm tra trực quan riêng, thử ca qua đêm/trùng giờ/công chưa đủ/duyệt và sửa sau duyệt.
3. Làm cấu hình lương có hiệu lực, thử thay mức giữa kỳ và ca qua tháng.
4. Làm thưởng/điều chỉnh, kiểm tra duyệt và đảo khoản.
5. Làm hoa hồng có chốt tỷ lệ, kiểm tra thanh toán thiếu/đủ, giảm giá không phân bổ, hoàn tiền và gửi lặp.
6. Làm bảng lương, nguồn chi tiết, duyệt và xác nhận chi trả; kiểm tra quyền, đồng thời, sửa cấu hình sau duyệt và không trả trùng.
7. Sau khi từng form đã được kiểm tra và người dùng duyệt, mới triển khai Cloud/Vercel và cập nhật nghiệm thu Nhân sự. Không đánh dấu hoàn tất chỉ vì đã có giao diện.

**Khuyến nghị chốt:** dùng quy trình trên; cho quản lý nhập mức lương và thưởng thực tế, hoa hồng lấy từ cấu hình dịch vụ được bật. Chưa đặt mức lương, tỷ lệ, phụ cấp, hệ số tăng ca hoặc thưởng cố định cho bất kỳ nhân viên nào.
