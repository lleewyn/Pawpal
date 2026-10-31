# Hoàn thiện chatbot cho khách vãng lai

Ngày lập31/10/2026. Đây là đầu việc ưu tiên hiện tại: giúp khách chưa đăng nhập tìm hiểu PawPal, chọn dịch vụ/sản phẩm và biết cách đặt/mua. Theo dõi bằng câu hỏi khách được giải đáp, không lấy số lượng công cụ kỹ thuật làm thước đo hoàn thành.

**Tiến độ hiện tại: đợt1 và đợt2 đã hoàn thành trong phạm vi nghiệm thu ghi dưới đây; đã push main556729ad.**31 câu hỏi khác nhau, hai câu Gemini được duyệt, bốn liên kết đi tiếp và vòng chuyển nhân viên/CSAT đạt trên browser localhost thật;43 test tự động đạt. Đã sửa thêm bốn lỗi phát hiện trong đợt2. Vercel đã cập nhật và smoke mua guest/giá cắt tỉa desktop/mobile đạt; chưa lặp toàn bộ matrix trên Production. [Báo cáo đợt2 và giới hạn](docs/chatbot/guest-phase2-2026-10-31/README.md).

## 1. Kết quả cần đạt

Khách hỏi bằng lời tự nhiên, chatbot trả lời đúng điều cần biết, hỏi thêm khi thiếu dữ kiện và chỉ rõ bước tiếp theo. Không bắt đăng nhập để hỏi thông tin công khai; không trả lời vòng vo hoặc đẩy mọi câu sang nhân viên.

Chỉ hạn chế thông tin cá nhân, giao dịch chưa xác minh và dữ liệu nội bộ. Phải phân biệt ba trường hợp:

- Có thông tin công khai: trả lời trực tiếp.
- Chưa có nguồn xác nhận: nói chính xác phần chưa biết, trả lời phần biết được và hướng dẫn kiểm tra.
- Yêu cầu thông tin riêng/nội bộ: giải thích ngắn, hướng đúng nơi xác minh; vẫn giải đáp chính sách và hướng dẫn chung.

## 2. Những câu khách cần hỏi được

Dấu[x] chỉ cho phần đã thử thực tế; mỗi hàng chưa hoàn tất phải có việc tiếp theo. Không đánh dấu cả hàng chỉ vì một câu mẫu trả lời được.

| Nhu cầu khách | Câu hỏi mẫu | Câu trả lời cần có | Hiện tại và việc còn làm |
| --- | --- | --- | --- |
| Biết cửa hàng | PawPal ở đâu? Mở đến mấy giờ? Liên hệ thế nào? | Địa chỉ, giờ, kênh liên hệ đã công bố; không tự tạo chi nhánh | Đã lấy cấu hình làm nguồn chính theo lựa chọn người dùng; đồng bộ footer/map, browser đợt2 đạt |
| Hiểu dịch vụ | Có tắm cho mèo không? Tắm khác cắt tỉa thế nào? | Các gói có thật, khác biệt có nguồn và câu hỏi giúp chọn gói | Đã có mô tả, điều kiện, lọc loài/cân nặng và link chọn gói; đã nghiệm thu câu trả lời trên UI đợt2 |
| Hỏi Hotel | Gửi trong ngày hay qua đêm? Phòng thường khác VIP gì? | Loại lưu trú/phòng và điều kiện đã công bố; thiếu tiện ích nào phải nói rõ | Đã đọc mô tả/tiện ích/đơn vị tính thật và lọc tên phòng/cân/loài; không tự suy VIP hoặc phòng trống |
| Hỏi Taxi | Có đón bé không? Tính giá thế nào? | Quy trình đặt, dữ kiện địa chỉ/khoảng cách/cân nặng cần cung cấp và cách xác nhận chuyến | Đã lọc giá theo km/cân/loài và hỏi phần còn thiếu; chuyến và lượt đi/về xác nhận tại bước đặt |
| Hỏi giá | Bé7kg tắm bao nhiêu? Hotel bao nhiêu? Sản phẩm này giá gì? | Mức giá đúng nguồn, đơn vị và điều kiện; đủ dữ kiện thì chọn đúng mức, thiếu thì hỏi thêm | Đã lọc cận đúng nguồn, giữ điều kiện và hỏi tiếp; không chốt giá tương lai hoặc phụ phí chưa có |
| Chọn sản phẩm | Có loại nào phù hợp nhu cầu này? Hai loại khác nhau gì? | Sản phẩm/biến thể đang công bố, khác biệt theo mô tả, giá và liên kết xem | Đã tìm theo tên/SKU/nhu cầu, lọc chó/mèo và đối chiếu tối đa hai truy vấn; nhiều biến thể phải chọn rõ |
| Biết còn chỗ/hàng | Còn size này không? Mai có lịch không? Hotel còn phòng không? | Chỉ xác nhận trạng thái công khai khi có nguồn mới; nếu chưa tra được, dẫn đúng màn hình kiểm tra | Có boolean còn/hết cho biến thể công khai đã chọn; lịch/phòng dẫn bước đặt kiểm tra, không xác nhận trong chat |
| Đặt lịch không tài khoản | Chưa đăng ký có đặt được không? Đặt cho hai bé thế nào? | Hướng dẫn đúng luồng guest hiện hành: chọn dịch vụ/bé/thời gian/thông tin liên hệ và xác nhận trên màn hình | Đã trả trực tiếp từ FAQ sửa, có link đặt; bộ browser đợt2 đạt |
| Mua hàng không tài khoản | Không đăng nhập có mua được không? Thanh toán thế nào? | Hướng dẫn mua guest, giao nhận/thanh toán đúng tùy chọn có thật | Đã trả trực tiếp hướng dẫn guest và link cửa hàng/tra cứu, không phụ thuộc model diễn giải lại |
| Giao nhận/đổi trả/hủy | Có giao tới chỗ tôi không? Phí bao nhiêu? Đổi trả hoặc hủy thế nào? | Chính sách được công bố, điều kiện và nơi xác nhận phí; tiếp nhận phản ánh khi cần | Đã có nguồn đúng câu và bước xác minh/gửi yêu cầu; chưa có số phí/thời hạn thì nói rõ, không tự tạo |
| Ưu đãi và Paw Points | Có khuyến mãi không? Paw Points là gì? Chưa có tài khoản dùng được không? | Giải thích công khai, thời hạn/điều kiện có nguồn; không xác nhận ưu đãi cá nhân khi chưa kiểm tra | Đã trả giải thích/policy công khai; ngưỡng/tỷ lệ hoặc ưu đãi riêng chưa có nguồn phải nói rõ, không tra số dư guest |
| Chuẩn bị và an toàn | Mang theo gì? Bé nhát hoặc dị ứng thì cần báo gì? | Hướng dẫn tiếp nhận theo nguồn, khuyên cung cấp lưu ý cho nhân viên; không chẩn đoán hoặc kê thuốc | Đã có hướng dẫn nguồn và nhắc báo nhân viên; không tự kết luận đủ điều kiện sức khỏe |
| Biết cách theo dõi | Xem đơn/lịch guest ở đâu? Không nhận được mã thì làm sao? | Chỉ đúng màn hình xác minh và bước hỗ trợ; không mở hồ sơ bằng mã đơn/SĐT đơn lẻ | Đã có hướng dẫn và link tra cứu/khôi phục; không mở truy vấn riêng trong chat |
| Gặp người thật | Cho gặp nhân viên. Tôi cần báo sự cố | Chuyển đúng ca, giữ nội dung khách đã gửi, nói rõ đang chờ; nhân viên trả lời/hoàn tất và khách đánh giá được | Chuỗi hai UI đã đạt local; lỗi khóa nút sau gửi đã sửa local, đợt2 kiểm lại hai UI/CSAT đạt; chờ phát hành |

## 3. Làm theo thứ tự này

### Đợt1 — Hoàn thiện nội dung và chức năng cho khách vãng lai

#### A. Trả lời đúng những việc khách thường hỏi

- [x] VL01 — Đã rà nguồn đủ14 nhu cầu: cấu hình cửa hàng, danh mục/giá/sản phẩm và16 FAQ chuẩn đang bật, đầy đủ. Dữ kiện chính sách chưa có số xác nhận được nêu rõ, không tự điền.
- [x] VL02-content — Đã đối chiếu và cập nhật21 trạng thái FAQ theo150/152/157 trênCloud:18 mục sửa,3 thêm; trong đó tắt một mục QA.20 mục đang bật được truy xuất đủ, sáu câu đại diện thấy nội dung mới qua UI localhost. Có guard nội dung cũ/rollback; không coi đây là nghiệm thu Gemini. [Bằng chứng](docs/chatbot/guest-completion-2026-10-31/README.md).
- [x] VL03 — Đã có kiểm tra tự động câu nguyên văn/không dấu, lỗi gõ giới hạn, hỏi ngắn/nối, đổi chủ đề và ranh giới thông tin riêng. Các biến thể browser thực tế để đợt2, không hứa hiểu mọi lỗi gõ.
- [x] VL04 — Các hướng dẫn phổ biến trả trực tiếp từ FAQ đúng câu/đầy đủ; dữ liệu danh mục trả mô tả/giá thật, thiếu phần nào nói rõ và có bước tiếp. Không đẩy sang nhân viên khi nguồn đã đủ.

#### B. Giúp khách chọn và đi tiếp

- [x] VL05 — Đã hỏi/giữ dữ kiện loài, cân, km và tên/SKU theo ca; lọc đúng loài được nhận và cận giá, không đòi SĐT/hồ sơ để tư vấn công khai.
- [x] VL06 — Đã đối chiếu tối đa hai truy vấn sản phẩm và loại Hotel theo mô tả/giá/đơn vị nguồn; thiếu loại VIP/tiện ích hoặc trùng lựa chọn phải nói rõ/chọn lại, không tự suy tương đương.
- [x] VL07 — Đã có link nội bộ thực tới đặt theo service, sản phẩm theo ID công khai, cửa hàng và tra cứu; widget chỉ dựng whitelist link an toàn. Không nhận giao dịch bằng lời chat.
- [x] VL08 — Đã có còn/hết cho biến thể đã chọn theo nguồn công khai của shop, không trả số tồn nội bộ. Lịch/phòng dùng link kiểm tra ở bước đặt; chưa mở xác nhận trong chat và không gắn nhãn đã tra được.

#### C. Không làm khách bị gián đoạn

- [x] VL09-local — Guest yêu cầu người → Admin nhận/trả lời → guest nhận → hoàn tất/CSAT đã đạt trên hai UI localhost. Guest mở lại widget để nhận dữ liệu mới; chưa chứng minh tốc độ cập nhật nền.
- [x] VL09-code — Sửa nút chuyển người bị khóa sau gửi và giữ lỗi/nháp khi chuyển thất bại đã có trong code local, kèm hồi quy. Phát hành và browser kiểm lại chuyển xuống đợt2 để đúng cách chia triển khai rồi nghiệm thu.
- [x] VL10 — Đã giữ các guard pending/requestId/ownership/retry và thông báo chưa có nguồn; kiểm thử kỹ thuật nguồn sai/timeout/cap/khác chủ và model boundary đạt. Browser lỗi mạng và gửi lại là phần nghiệm thu đợt2.

### Đợt2 — Nghiệm thu trực tiếp bằng browser localhost

- [x] VL09-release — Đã push main556729ad và thấy marker mới trênVercel; smoke công khai desktop/mobile đạt. Vòng hai UI/CSAT đã đạt local dùngCloud thật; chưa lặp vòng Admin/CSAT trênProduction.

- [x] VL11 —31 câu hỏi khác nhau theo13 nhóm thông tin và vòng chuyển người cho nhu cầu thứ14; có hỏi tiếp/không dấu/giá/đổi chủ đề, cùng hai câu model đại diện. Đã ghi lỗi ban đầu và lượt sửa/thử lại, không hứa hiểu mọi cách hỏi.
- [x] VL12 — UI localhost/API và Cloud thật đạt. Bốn link bấm đi tiếp, mobile/bàn phím/nháp và vòng hai UI/CSAT đạt; mất response/gửi lại không trùng, quyền khác chủ bị chặn. Fault injection an toàn được ghi riêng, không thay nghiệm thu dữ liệu thật.
- [x] VL13 — Hai câu Gemini đã được duyệt đạt qua UI, chỉ FAQ công khai/lịch sử trống, đúng hai lượt gửi và không thử tay lại; trần backend tối đa8 provider attempts theo phê duyệt. Chưa đánh giá mọi câu tự do.
- [x] VL14 — Smoke bảnVercel mới đạt mua guest/giá cắt tỉa. Một câu giá:3 request,599bytes gửi/1.361bytes nhận body browser,7,466 giây. Không coi đây là tổng egress DB hoặc thử tải đồng thời. Thiếu nguồn: ngưỡng điểm/tỷ lệ, danh sách ưu đãi hiện hành, mọi phí/điều kiện chưa công bố; chat chưa xác nhận phòng/lịch hoặc tra giao dịch riêng. Có hướng dẫn tiếp tục thay vì bịa.

## 4. Điều kiện không được bỏ

- Không bắt guest đăng nhập để hỏi thông tin công khai, không cho guest xem hồ sơ người khác hoặc dữ liệu nội bộ.
- Không thêm một lần đọc toàn danh mục/lịch sử cho mỗi câu hỏi; chỉ lấy thông tin liên quan, phân trang và lấy tiếp theo yêu cầu.
- Giữ ngân sách hiện có: FAQ tối đa5 mục, giá tối đa10 mức; dùng cache/gộp request phù hợp, không thêm polling hoặc channel cho từng chủ đề.
- Khi thêm kiểm tra hàng/lịch/phòng, chỉ đọc phạm vi khách đã chọn; xác nhận lần cuối vẫn tại bước đặt/mua. Không tăng tải cho dashboard, đặt lịch và bán hàng để chatbot trả lời rộng hơn.
- Không sửa dữ liệu nghiệp vụ thật để thử. Không dùng dữ liệu giả trong runtime, không đọc Cloud Logs, không tự gọi thêm model bên ngoài ngoài phạm vi đã được cho phép.

## 5. Khi nào được gọi là hoàn thiện?

Không còn nội dung sai đã biết trong các hướng dẫn guest; mỗi nhu cầu ở mục2 có câu trả lời hữu ích hoặc cách kiểm tra cụ thể, và năng lực tra cứu chưa có được ghi rõ. Câu hỏi riêng/nội bộ được chặn đúng phần, không chặn lan sang kiến thức công khai. Vòng chuyển nhân viên hoạt động, lỗi không làm mất nội dung, các kiểm tra browser và ngân sách dữ liệu đạt trên đúng bản phát hành.

Tra dữ liệu cá nhân của thành viên, báo cáo Admin nâng cao, trợ lý tự tạo giao dịch và thiết kế hệ thống phân tích lớn không nằm trong đợt ưu tiên này. Tra giao dịch guest riêng chỉ mở khi có bằng chứng sở hữu an toàn; hiện phải hướng khách tới màn hình xác minh có sẵn.

## 6. Điểm bắt đầu và bằng chứng

- Điểm bắt đầu: VL01–VL04, ưu tiên những câu khách sẽ hỏi trước khi đặt/mua; không mở thêm công cụ sâu nếu nội dung cơ bản chưa đúng.
- Đã thử local:8 tình huống guest và6 bước chuyển người trong [báo cáo browser31/10](docs/chatbot/local-browser-review-2026-10-31/README.md). Chưa bao phủ cả14 nhu cầu hoặc chất lượng Gemini.
- Nội dung cần đối chiếu: [FAQ đã chuẩn bị](docs/chatbot/stage5-faq-review-2026-10-30/README.md); [giới thiệu và giá đang có](docs/chatbot/stage5-service-guidance-2026-10-30/README.md).
- Mỗi lần tiếp tục: đọc file này trước, chọn mục còn mở theo thứ tự, làm → thử UI → ghi kết quả/giới hạn ngay dưới đây. Chỉ tick đúng phần đã kiểm chứng; chưa được đánh đồng local với bản phát hành.

## 7. Nhật ký thực hiện

- 31/10/2026: tách kế hoạch theo nhu cầu khách vãng lai; giữ các năng lực đã có và phần thiếu cụ thể. Chưa đánh dấu hoàn tất FAQ, tra tồn/lịch/phòng hoặc Gemini chỉ từ các smoke trước.
- 31/10/2026, bắt đầu đợt1: đã rà/cập nhật nhóm21 FAQ trênCloud và kiểm tra nguồn/nhãn tiếng Việt/UI. Ưu tiên tiếp: VL01 phần dữ kiện công khai còn thiếu và VL03–VL04 về cách hỏi/câu trả lời; sau đó mới mở thêm năng lực chọn gói/tra trạng thái. Xem [kết quả đợt đầu](docs/chatbot/guest-completion-2026-10-31/README.md).
- 31/10/2026: đổi kế hoạch từ bốn nhóm thực hiện sang đúng hai đợt theo yêu cầu: đợt1 hoàn thiện cả nội dung/chức năng, đợt2 nghiệm thu browser. Giữ nguyên trạng thái các mục còn mở, không đánh dấu đã làm từ lời hứa hoặc các smoke cũ.
- 31/10/2026: hoàn tất phần triển khai/kiểm tra kỹ thuật đợt1; chốt cấu hình cửa hàng theo lựa chọn người dùng, bổ sung159 và các luồng trả lời/hỏi tiếp/link.42 test tự động,19 tình huống handler/Cloud,16 nguồn FAQ, sáu tổ hợp loài và hai tuyến HTTP localhost đạt. Chưa chạy bộ browser đợt2 hoặc push code. [Báo cáo](docs/chatbot/guest-phase1-2026-10-31/README.md).
- 31/10/2026, đợt2:31 câu hỏi khác nhau đạt sau sửa alias Grooming, phân biệt mã đơn/OTP, link mua guest và phục hồi nháp phiên mới. Hai câu Gemini đạt trong phạm vi duyệt; vòng hai UI nhận tin nhân viên foreground sau32,3 giây, hoàn tất/CSAT đạt. Đo một câu giá mới:3 request,599bytes gửi/1.362bytes nhận ở body browser; không đại diện tổng tải DB. [Bằng chứng](docs/chatbot/guest-phase2-2026-10-31/README.md).
