# Kế hoạch phát triển Dashboard quản trị Pawpal

Ngày lập: 19/11/2026. Cập nhật tiến độ: 22/11/2026. Mục tiêu đã thống nhất: phục vụ người chủ kinh doanh dịch vụ thú cưng và sản phẩm. Các mốc dưới đây là phạm vi nghiệm thu; phần đã triển khai trong mã và CSDL được ghi tại mục 15.

## 1. Mục tiêu

**Mở Dashboard là biết cửa hàng đang thế nào, vấn đề nằm ở đâu và hôm nay cần quyết định việc gì.**

Người chủ không phải tự chọn hàng chục chỉ số hoặc suy luận từ nhiều biểu đồ. Người triển khai chịu trách nhiệm chọn thông tin, tổ chức màn hình và giải thích cách tính bằng ngôn ngữ kinh doanh dễ hiểu.

Dashboard phải trả lời được năm câu hỏi:

1. Kinh doanh tăng hay giảm, biến động đến từ đâu?
2. Hoạt động trong kỳ đang lãi hay lỗ, dựa trên dữ liệu nào?
3. Doanh nghiệp có đủ tiền đáp ứng các nghĩa vụ sắp đến hạn không?
4. Vấn đề đang nằm ở bán hàng, dịch vụ, khách hàng, nhân sự hay tồn kho?
5. Ai cần xử lý việc gì, trong thời hạn nào, và kết quả đã cải thiện chưa?

Mỗi kết luận phải có kỳ dữ liệu, công thức, độ đầy đủ và liên kết đến bản ghi chứng minh. Khi dữ liệu chưa đủ, hiển thị đúng giới hạn; không tự kết luận doanh nghiệp an toàn, có lãi hoặc sắp mất khả năng chi trả.

### 1.1. Cách người chủ sử dụng

- **Đầu ngày:** mở Vận hành để biết lịch phục vụ, đơn cần giao, việc khẩn cấp và nguồn lực còn thiếu; giao hoặc mở nơi giao việc.
- **Trong ngày:** theo dõi việc đang thực hiện, việc quá hạn và người phụ trách; xử lý tại hồ sơ nghiệp vụ gốc.
- **Cuối ngày:** kiểm tra việc chưa xong, tiền đã ghi nhận và phần cần đối soát. Khi chưa có sổ thu chi đầy đủ, không gọi đây là số dư cuối ngày.
- **Hằng tuần:** xem Kinh doanh để biết giao dịch, khách và nhóm dịch vụ/sản phẩm đang tăng hay giảm; chọn hành động điều chỉnh có căn cứ.
- **Cuối kỳ:** xem kết quả hoạt động, chi phí, công nợ và khả năng chi trả khi các nguồn tài chính đã đạt nghiệm thu.

### 1.2. Nguyên tắc chọn nội dung

Mỗi khối phải nêu được quyết định mà nó hỗ trợ. Khối không dẫn đến hành động hoặc giải thích kết quả được đưa xuống phần bổ trợ.

- Dịch vụ: ưu tiên phục vụ đúng lịch, phân công phù hợp, chất lượng chăm sóc và hiệu quả từng nhóm dịch vụ.
- Sản phẩm: ưu tiên giao được hàng, tránh thiếu hàng, nhận ra hàng chậm bán và xác định hiệu quả sau giá vốn khi có nguồn.
- Tài chính: phân biệt kết quả hoạt động với khả năng có tiền trả đúng hạn.
- Giữ hai tab. Đề xuất lần mở đầu chưa lưu trạng thái vào Vận hành; khi đã có lựa chọn, tiếp tục khôi phục đúng tab và bộ lọc của người dùng.

## 2. Hiện trạng đã đối chiếu

Đây là hiện trạng khi lập kế hoạch ngày 19/11, dựa trên mã và migrations trong repository. Khi đó chưa đối chiếu schema, dữ liệu và quyền của phiên bản Supabase Cloud đang chạy. Xem mục 15 và biên bản kiểm tra phát hành để biết kết quả triển khai tiếp theo; không dùng hiện trạng ban đầu hoặc số liệu kiểm thử để mô tả tình hình kinh doanh hiện tại.

### 2.1. Tab Kinh doanh

- Có tiền thu thành công, hoàn tiền, thu thuần, so sánh kỳ trước và cơ cấu nguồn thu.
- Có xếp hạng sản phẩm/dịch vụ theo giá trị dòng hoặc số lượng; chưa phản ánh lợi nhuận.
- Có khách hàng mới, khách giao dịch lặp lại trong kỳ, hạng thành viên, voucher và biến động điểm.
- Có kế hoạch thu và chi theo đúng kỳ, lưu qua Supabase; kết quả là ước tính dựa trên tỷ lệ chi phí và khoản chi nhập vào.
- Chưa có báo cáo lợi nhuận thực tế, số dư tiền đối soát, công nợ và lịch thu chi đủ để đánh giá khả năng chi trả.

### 2.2. Tab Vận hành

- Có cảnh báo lịch hẹn, đơn hàng, đổi trả, hỗ trợ, thiếu hàng và thiếu nhân sự theo khung giờ.
- Có trạng thái công việc, giờ cao điểm, tải nhân sự và chất lượng phục vụ.
- Có liên kết mở phân hệ để xử lý và lọc việc tồn đọng theo thời gian chờ.
- Chưa có bức tranh đầy đủ về người chịu trách nhiệm, tiến độ xử lý qua thời gian và mức ảnh hưởng của từng vấn đề.
- Ước lượng năng lực phục vụ còn dựa trên số lịch đồng thời và số nhân viên có ca; chưa tách đầy đủ theo chuyên môn và loại dịch vụ.

### 2.3. Nền kỹ thuật giữ lại

- Giữ hai tab `Kinh doanh` và `Vận hành`, cơ chế router, URL hash và khôi phục bộ lọc.
- Giữ bộ điều phối Dashboard và tách lớp tính toán khỏi lớp hiển thị.
- Giữ dữ liệu Supabase, kiểm soát quyền phía máy chủ, Realtime và tải lại khi dữ liệu thay đổi.
- Giữ khối kế hoạch hiện có như một công cụ lập giả định; trình bày tách biệt với kết quả thực tế.

## 3. Phạm vi và thứ tự triển khai

Triển khai theo các mốc M0 đến M5. Mỗi mốc có đầu ra và điều kiện hoàn thành; chưa ấn định ngày phát hành trước khi kiểm kê dữ liệu ở M0.

- **M0 — Chốt định nghĩa và khả năng cung cấp dữ liệu.** Điều kiện đầu vào cho mọi mốc còn lại.
- **M1 — Điều hành cửa hàng hằng ngày.** Ưu tiên việc cần làm, lịch phục vụ, đơn cần giao và người phụ trách; sử dụng được trước khi có báo cáo tài chính hoàn chỉnh.
- **M2 — Giải thích biến động kinh doanh.** Biết tăng/giảm ở đâu, từ số giao dịch, giá trị bình quân hay nhóm khách; dùng nguồn hiện có sau khi đối chiếu.
- **M3 — Xây nền dữ liệu tài chính thực tế.** Có quy trình ghi chi phí, giá vốn, số dư và công nợ; điều kiện bắt buộc trước kết luận tài chính.
- **M4 — Kết quả hoạt động và khả năng chi trả.** Chỉ mở từng phần khi nguồn tương ứng đã đạt đối soát.
- **M5 — Nghiệm thu quản lý và phát hành từng phần.** Áp dụng cổng nghiệm thu cho từng mốc, sau đó nghiệm thu tích hợp.

Những phần chưa nằm trong đợt đầu: dự báo bằng AI, kết luận tự động nguy cơ phá sản, thay thế hệ thống kế toán đầy đủ, thêm tab hoặc viết lại toàn bộ Admin.

**Bản sử dụng đầu tiên gồm M0 và phần cốt lõi M1.** Không bắt người chủ chờ hoàn thiện toàn bộ kế toán mới có màn hình điều hành hữu ích. Trong M0 đã phải xác định cách thu thập dữ liệu tài chính để tránh tiếp tục thiếu lịch sử cho M3.

## 4. M0 — Chốt định nghĩa và kiểm kê dữ liệu

### Công việc

- [ ] Kiểm kê có phạm vi các bảng, cột, RPC, RLS và Realtime liên quan trên môi trường triển khai; so sánh với migrations hiện có.
- [ ] Phân loại nguồn: đã có và dùng được; đã có nhưng thiếu lịch sử/đối soát; cần bổ sung.
- [ ] Chốt phạm vi báo cáo: đơn vị kinh doanh, địa điểm nếu có, tiền tệ, thuế và kỳ báo cáo. Không tạo bộ lọc địa điểm nếu dữ liệu chưa hỗ trợ.
- [ ] Lập từ điển chỉ số: tên, ý nghĩa, nguồn, trạng thái hợp lệ, cơ sở ngày, đơn vị, công thức, quyền đọc và cách xử lý dữ liệu thiếu.
- [ ] Phân biệt tiền thực thu, giá trị giao dịch hoàn thành, doanh thu ghi nhận, thu thuần, lợi nhuận gộp, kết quả hoạt động và dòng tiền.
- [ ] Chốt cách xử lý đặt cọc/trả trước, COD, voucher, hoàn một phần, đổi trả, dịch vụ nhiều ngày, phụ phí và giảm trừ.
- [ ] Chốt phương pháp xác định giá vốn, thời điểm ghi nhận chi phí và nguyên tắc phân bổ chi phí dùng chung.
- [ ] Kiểm kê thời gian lịch sử đủ tin cậy. Công bố mốc bắt đầu nếu dữ liệu quá khứ không thể tái dựng chính xác.
- [ ] Xác định đầu mối nghiệm thu nghiệp vụ, tài chính và kỹ thuật; ghi người phụ trách thực tế trước khi nhận việc.
- [ ] Với từng luồng dịch vụ/bán sản phẩm, kiểm tra có đủ tên thực thể, giờ hẹn/hạn giao, trạng thái, người phụ trách và đường dẫn mở hồ sơ hay không.
- [ ] Xác định mốc bắt đầu thu sự kiện công việc và dữ liệu tài chính; phần chưa đủ nguồn được ghi thành đầu việc có nơi nhập, người xác nhận và kiểm tra đối soát.

### Điều kiện hoàn thành

- Có từ điển chỉ số và bản đồ nguồn dữ liệu được người phụ trách xác nhận.
- Mỗi nguồn thiếu có công việc bổ sung hoặc giới hạn hiển thị rõ ràng.
- Những định nghĩa chưa thống nhất được ghi là chờ chốt; tính năng phụ thuộc chưa được gắn nhãn kết quả thực tế.
- Nghiệm thu M0 theo từng nhóm nguồn. Khi nguồn vận hành đã rõ, được bắt đầu M1 dù chính sách tài chính còn đang đối chiếu; không lấy sự thiếu dữ liệu ở một nhóm để dừng mọi phần còn lại.

## 5. M1 — Điều hành cửa hàng hằng ngày

### 5.1. Người phụ trách và vòng đời xử lý

- [ ] Dựng màn hình điều hành hôm nay: lịch sắp tới, bé đang được chăm sóc, lịch trả phòng và đơn cần giao; mỗi loại dùng đúng dữ liệu và mốc thời gian nghiệp vụ.
- [ ] Đặt danh sách việc cần xử lý trước các biểu đồ; mỗi việc có đối tượng, lý do, người phụ trách hoặc `Chưa phân công`, thời hạn nếu đã xác định và thao tác tiếp theo.
- [ ] Nút thao tác mở đúng hồ sơ và giữ bộ lọc khi quay lại. Tái sử dụng luồng phân công/xử lý hiện có, không tạo cơ chế hoàn tất công việc riêng trái trạng thái nguồn.
- [ ] Tái sử dụng người phụ trách tại phân hệ gốc; nếu thiếu, thiết kế quan hệ giao việc riêng, tránh sao chép trạng thái nghiệp vụ sang nhiều nơi.
- [ ] Mỗi việc có người/nhóm chịu trách nhiệm, thời điểm phát hiện, hạn xử lý, lần cập nhật cuối và đường dẫn chứng minh.
- [ ] Cảnh báo dùng định danh ổn định theo thực thể và quy tắc để việc tải lại không tạo việc trùng.
- [ ] Một hồ sơ có nhiều lý do cảnh báo được gom thành một việc khi đếm tổng công việc; giữ đủ các lý do trong chi tiết. Tách rõ số việc khỏi số lần vi phạm.
- [ ] Ghi nhận sự kiện phát sinh, nhận việc, xử lý xong và mở lại; tính riêng số việc tồn đầu kỳ, mới phát sinh, đã xử lý, mở lại và tồn cuối kỳ.
- [ ] Việc cũ vẫn nằm trong tồn đọng đến khi nghiệp vụ gốc xác nhận xử lý; không tự đóng để cải thiện chỉ số.
- [ ] Đo thời gian xử lý và tỷ lệ đúng hạn theo loại việc; nguồn chưa có lịch sử thì bắt đầu đo từ mốc triển khai đã công bố.
- [ ] Bản đầu ưu tiên danh sách và liên kết hành động; biểu đồ xu hướng chỉ bật sau khi cơ chế ghi sự kiện đầy đủ đã đạt kiểm tra.

### 5.2. Ưu tiên theo ảnh hưởng

- [ ] Giữ mức khẩn cấp nghiệp vụ, bổ sung số khách và giá trị giao dịch liên quan nếu truy xuất được.
- [ ] Phân biệt giá trị đang bị ảnh hưởng với tổn thất đã xác nhận; không gọi toàn bộ giá trị đơn chậm là doanh thu đã mất.
- [ ] Quy tắc xếp ưu tiên có thứ tự rõ: an toàn thú cưng, nghĩa vụ đến hạn, mức quá hạn và ảnh hưởng xác minh được; cần người phụ trách chốt trước khi áp dụng.
- [ ] Có nhóm chưa giao việc và nhóm quá hạn theo người phụ trách; mở được danh sách để điều phối.
- [ ] Không suy kết lỗi nhân sự chỉ từ cảnh báo hoặc đánh giá thấp khi chưa có bằng chứng nghiệp vụ.

### 5.3. Năng lực phục vụ và hàng tồn

- [ ] Tách nhu cầu nhân sự theo dịch vụ, chuyên môn/cấp độ và thời gian phục vụ thực tế có thể xác định.
- [ ] Xét ca khả dụng, nghỉ, trùng phân công và nhân viên không còn hoạt động; chỉ kết luận trong phạm vi dữ liệu đã kiểm tra.
- [ ] Dịch vụ lưu trú xét công suất phòng và lịch chăm sóc; đưa đón xét tài xế/phương tiện nếu đã được mô hình hóa. Không áp một lịch bằng một KTV cho mọi loại dịch vụ.
- [ ] Bổ sung hàng chậm luân chuyển và giá trị vốn tồn kho khi có giá vốn lịch sử; hàng sắp hết hạn chỉ hiện nếu nguồn lô/hạn dùng có thật.
- [ ] Phân biệt thiếu hàng làm gián đoạn phục vụ với tồn thấp không có nhu cầu; đề xuất nhập hàng phải nêu thời gian giao hàng nếu có dữ liệu.

### Điều kiện hoàn thành

- Người quản lý xác định được việc nào cần làm, ai phụ trách và hạn xử lý.
- Bản đầu được nghiệm thu khi người chủ có thể chọn một việc cần ưu tiên và mở đúng nơi xử lý, kể cả lúc một nguồn phụ trợ bị lỗi.
- Đối chiếu được tồn đầu kỳ + mới phát sinh + mở lại − đã xử lý = tồn cuối kỳ theo cùng định nghĩa.
- Dashboard phản ánh việc được giải quyết từ phân hệ gốc, kể cả cập nhật Realtime và tải lại trang.
- Có thể nhận ra xu hướng tồn đọng tăng hoặc giảm từ lịch sử thật, không tái dựng giả từ trạng thái hiện tại.

## 6. M2 — Giải thích tình hình kinh doanh

### 6.1. Bổ sung các yếu tố tạo nên kết quả

- [ ] Hiển thị số đơn bán hàng hoàn thành, số ca dịch vụ hoàn thành và giá trị bình quân tương ứng; tách hai nhóm trước khi tổng hợp.
- [ ] Phân tích thay đổi giá trị giao dịch hoàn thành thành phần do số giao dịch và phần do giá trị bình quân, sử dụng cùng tập bản ghi và cùng cơ sở ngày.
- [ ] Đối chiếu riêng tiền thu với giao dịch hoàn thành. Không lấy số đơn hoàn thành để giải thích trực tiếp toàn bộ thay đổi tiền thu khi hai tập khác cơ sở ngày.
- [ ] Bổ sung hủy đơn, hủy lịch, khách không đến và hoàn tiền; mỗi tỷ lệ ghi rõ mẫu số và kỳ áp dụng.
- [ ] Cho phép mở danh sách giao dịch tạo nên số tổng, giữ bộ lọc khi điều hướng.
- [ ] Xác định phần chênh lệch chưa giải thích được; không tự quy nguyên nhân cho nhân viên, marketing hay chất lượng dịch vụ.

### 6.2. Đo khách hàng quay lại đúng mục đích

- [ ] Giữ chỉ số hiện tại với tên rõ nghĩa: khách có từ hai giao dịch hoàn thành trong kỳ.
- [ ] Bổ sung khách có giao dịch hoàn thành lần đầu trong lịch sử quan sát; tách chỉ số này khỏi số hồ sơ mới theo `customer.registered_at`.
- [ ] Bổ sung khách đã có giao dịch hoàn thành trước kỳ và tiếp tục giao dịch trong kỳ; xác định khách bằng `customer_id`, không đếm theo số payment hoặc số dòng hàng.
- [ ] Nếu thêm tỷ lệ quay lại theo nhóm khách có giao dịch đầu tiên cùng kỳ, chỉ tính khi cửa sổ theo dõi đã đủ; mốc 30/60/90 ngày là đề xuất cần nghiệp vụ lựa chọn.
- [ ] Nếu không có lịch sử trước mốc hệ thống, ghi rõ phạm vi quan sát; không khẳng định một khách là khách mua lần đầu trên toàn bộ lịch sử.

### 6.3. Chuẩn hóa so sánh

- [ ] So sánh các kỳ có cùng độ dài và nêu rõ thời gian đã trôi qua; không so tháng đang chạy với toàn bộ tháng trước mà thiếu giải thích.
- [ ] Mẫu số bằng 0 không tạo phần trăm vô hạn; số âm được giữ nguyên và có giải thích.
- [ ] Hiển thị mức thay đổi tuyệt đối cùng tỷ lệ để tránh tỷ lệ lớn trên nền giá trị nhỏ gây hiểu nhầm.

### Điều kiện hoàn thành

- Người quản lý nhận ra biến động đến từ số giao dịch, giá trị bình quân hay chênh lệch thời điểm thu tiền.
- Từng số tổng mở được danh sách chứng minh và đối chiếu khớp.
- Chưa có giá vốn thực tế thì xếp hạng vẫn được gọi là giá trị giao dịch/số lượng, không đổi thành xếp hạng lợi nhuận.

## 7. M3 — Nền dữ liệu tài chính thực tế

Các nhóm dữ liệu dưới đây là **đề xuất cần thiết kế sau M0**, không phải các bảng đã được xác nhận tồn tại. Ưu tiên tái sử dụng nguồn hiện có; chỉ thêm bảng khi nguồn hiện tại không đáp ứng được nghiệp vụ.

### 7.1. Chi phí và giá vốn

- [ ] Quản lý khoản chi phí với loại chi phí, số tiền, kỳ được ghi nhận, ngày phát sinh, trạng thái duyệt, chứng từ và người ghi nhận.
- [ ] Theo dõi thanh toán chi phí riêng với ghi nhận chi phí; một khoản chi phí có thể chưa trả hoặc trả nhiều lần.
- [ ] Lưu giá vốn lịch sử gắn với xuất hàng/bán hàng theo phương pháp đã chốt. Không dùng `product_variant.cost_price` hiện tại để tính lại lợi nhuận của giao dịch quá khứ.
- [ ] Ghi nhận vật tư và chi phí trực tiếp dịch vụ khi có nguồn đáng tin cậy; tránh cộng lại khoản đã nằm trong lương hoặc chi phí chung.
- [ ] Chốt cách xử lý hàng trả lại có thể nhập kho, hàng hỏng và phần chi phí không thu hồi được.
- [ ] Chi phí thực tế không bị tính lại theo tỷ lệ kế hoạch. Kế hoạch tiếp tục là một nguồn giả định riêng.

### 7.2. Tiền, công nợ và nghĩa vụ thanh toán

- [ ] Quản lý tài khoản tiền mặt/ngân hàng, số dư đầu kỳ tại mốc xác nhận và các biến động đã đối soát.
- [ ] Liên kết giao dịch thu/chi với payment, hoàn tiền hoặc chứng từ nghiệp vụ để chống ghi trùng.
- [ ] Theo dõi khoản phải thu, khoản phải trả, ngày đến hạn, phần đã thanh toán, phần còn lại và điều chỉnh.
- [ ] Theo dõi khoản thu hộ/tiền chưa được chuyển về nếu quy trình COD hoặc đơn vị thanh toán có phát sinh.
- [ ] Tách tiền nhận trước, tiền bị hạn chế sử dụng và nghĩa vụ hoàn tiền theo chính sách đã chốt; không cộng tiền dự kiến vào số dư hiện có.
- [ ] Phân loại góp vốn, vay, trả gốc vay và chuyển tiền nội bộ đúng bản chất; chuyển tiền nội bộ không tạo thêm thu/chi toàn doanh nghiệp.
- [ ] Bảo đảm tổng nghĩa vụ không đếm trùng khoản phải trả, hoàn tiền và khoản chi đã được lập lịch từ cùng một chứng từ.

### 7.3. Kiểm soát ghi nhận

- [ ] RPC ghi dữ liệu kiểm tra quyền, dữ liệu đầu vào, chống lưu lặp và chống ghi đè phiên bản mới.
- [ ] Có nhật ký ai tạo, duyệt, sửa hoặc điều chỉnh; bản ghi đã chốt được điều chỉnh bằng nghiệp vụ có dấu vết.
- [ ] Có cơ chế chốt kỳ và mở lại theo quyền để báo cáo quá khứ không thay đổi âm thầm.
- [ ] Không tự tạo số dư đầu kỳ, chi phí hoặc công nợ mặc định. Dữ liệu chuyển đổi phải có nguồn và được xác nhận.

### Điều kiện hoàn thành

- Số dư đầu kỳ cộng các biến động đã đối soát khớp số dư cuối kỳ trong phạm vi được xác nhận.
- Công nợ có chứng từ gốc, kỳ hạn, phần đã thanh toán và số còn lại khớp nhau.
- Giá vốn lịch sử vẫn giữ đúng khi thay đổi giá vốn hiện tại trong danh mục.
- Dữ liệu chưa có nguồn được báo thiếu, không coi là 0.

## 8. M4 — Kết quả kinh doanh và khả năng chi trả

### 8.1. Báo cáo kết quả hoạt động

- [ ] Tổng hợp doanh thu được ghi nhận sau giảm trừ theo chính sách M0, giá vốn thực tế, lợi nhuận gộp, chi phí vận hành và kết quả hoạt động.
- [ ] Hoàn tiền được phân loại theo giao dịch gốc: không phải mọi khoản hoàn đều là giảm doanh thu trong kỳ hiện tại; hoàn tiền nhận trước cần xử lý đúng nghĩa vụ tương ứng.
- [ ] Không gọi kết quả hoạt động là lợi nhuận sau thuế nếu chưa bao gồm đầy đủ thuế, chi phí tài chính và các khoản cần thiết.
- [ ] Phân tích theo sản phẩm/dịch vụ khi có dữ liệu giá vốn phù hợp. Phần phân bổ phải có quy tắc, phiên bản và khả năng truy nguyên.
- [ ] Cho phép đối chiếu thực tế với kế hoạch đúng kỳ; kỳ chưa kết thúc được ghi là tạm tính.
- [ ] Chỉ hiển thị điểm hòa vốn nếu đã xác định được chi phí cố định, biến đổi và cơ cấu bán phù hợp; ghi rõ giả định sử dụng.

### 8.2. Khả năng đáp ứng nghĩa vụ thanh toán

- [ ] Hiển thị số dư đã đối soát, thời điểm đối soát và phần tiền khả dụng theo định nghĩa M0.
- [ ] Tổng hợp khoản phải trả, phải thu, khoản quá hạn và nghĩa vụ hoàn tiền theo lịch.
- [ ] Lập lịch thu chi dự kiến theo ngày/tuần; cửa sổ xem trước là cấu hình được chốt, không tự áp một ngưỡng an toàn chung.
- [ ] Số dư dự kiến tại mỗi mốc = số dư khả dụng ban đầu + khoản thu dự kiến lũy kế − khoản chi dự kiến lũy kế, cùng phạm vi và không đếm trùng.
- [ ] Tách dòng tiền đã xác nhận khỏi khoản dự kiến; nếu có kịch bản chậm thu phải ghi rõ giả định và nguồn.
- [ ] Khi số dư dự kiến âm, chỉ rõ mốc thiếu, khoản tạo thiếu hụt và căn cứ. Đây là cảnh báo theo kịch bản, không phải kết luận phá sản.

### 8.3. Nguyên tắc kết luận

- Chỉ công bố lãi/lỗ trong phạm vi báo cáo đã đủ nguồn, đúng chính sách và đạt đối soát.
- Chưa đủ nguồn thì ghi `Chưa đủ dữ liệu để kết luận`, kèm nhóm dữ liệu còn thiếu và thao tác mở nơi bổ sung.
- Tách rủi ro kết quả hoạt động khỏi rủi ro thiếu tiền; doanh nghiệp có kết quả dương vẫn có thể thiếu tiền đến hạn.
- Không dùng một điểm sức khỏe tổng hợp hoặc màu xanh để che khuất nguồn dữ liệu chưa đầy đủ.
- Mỗi cảnh báo có chỉ số, ngưỡng đã cấu hình, khoảng thời gian, nguồn chứng minh và hành động đề xuất cụ thể.

### Điều kiện hoàn thành

- Người quản lý phân biệt được thực tế, kế hoạch, tạm tính và dự kiến trên giao diện lẫn file xuất.
- Kết quả khớp báo cáo đối chiếu theo cùng phạm vi và kỳ; sai lệch làm tròn có quy định rõ.
- Không phát sinh trạng thái an toàn khi mất nguồn số dư, công nợ hoặc chi phí bắt buộc.

## 9. Bố cục Dashboard dự kiến

Giữ hai tab hiện tại. Đây là thứ tự ưu tiên nội dung, không phải thêm một card riêng cho từng chỉ số.

### 9.1. Tab Vận hành — hôm nay cần làm gì?

1. **Tóm tắt đầu màn hình:** lịch cần phục vụ hôm nay, đơn cần xử lý hiện tại, việc khẩn cấp và việc chưa phân công trong phạm vi theo dõi. Mỗi số ghi rõ phạm vi, không để đổi kỳ làm người dùng hiểu nhầm số hiện tại.
2. **Việc cần xử lý:** nội dung chiếm ưu tiên lớn nhất; lọc khẩn cấp, quá hạn, chưa phân công và theo nhóm nghiệp vụ. Một dòng dẫn đến một hành động cụ thể.
3. **Nhịp phục vụ trong ngày:** lịch sắp tới, đang phục vụ, trả phòng/đưa đón nếu có; biết đối tượng, giờ cần phục vụ, người phụ trách và vướng mắc.
4. **Nguồn lực cần điều chỉnh:** KTV theo chuyên môn, phòng và hàng khả dụng. Nhận diện thiếu nguồn lực trong phạm vi kiểm tra được.
5. **Kết quả xử lý và chất lượng:** việc phát sinh/đã xong/tồn đọng khi đã có lịch sử; hỗ trợ chưa phản hồi và đánh giá cần kiểm tra.

Quyết định được hỗ trợ: phân công lại, gọi khách, xử lý đơn, điều chỉnh lịch, bổ sung hàng hoặc mở khiếu nại. Dashboard dẫn đến nơi xử lý, không tự thay đổi nghiệp vụ từ một nhận xét tổng hợp.

### 9.2. Tab Kinh doanh — kết quả ra sao và thay đổi ở đâu?

1. **Kết quả trong kỳ:** tiền thu, hoàn tiền, thu thuần, số ca hoàn thành và số đơn hoàn thành. Giá trị bình quân thể hiện tại phần phân tích tương ứng, tránh dồn nhiều chỉ số ngang hàng.
2. **Điều cần chú ý:** thông báo dựa trên điều kiện kiểm chứng được, kèm giá trị thay đổi và liên kết. Nêu `Chưa xác định nguyên nhân` khi chỉ mới biết biến động.
3. **Dịch vụ và sản phẩm:** tách nhóm để biết số lượng, giá trị bình quân và giá trị giao dịch thay đổi ở đâu. Sau M4 mới thêm hiệu quả sau chi phí cho phần đủ nguồn.
4. **Khách hàng:** khách mới có giao dịch, khách từng giao dịch trước kỳ nay quay lại và các chỉ số đủ cửa sổ quan sát. Phân biệt khách giao dịch lần đầu với hồ sơ khách mới được tạo.
5. **Tài chính thực tế:** kết quả hoạt động, số dư khả dụng, khoản đến hạn và thiếu hụt theo lịch dự kiến sau M3/M4. Khi chưa đủ nguồn, hiện ngắn gọn nhóm dữ liệu cần bổ sung; không dựng biểu đồ bằng số 0.
6. **Thông tin bổ trợ:** kế hoạch thu và chi, voucher, điểm thưởng, hạng thành viên. Giữ chức năng hiện có nhưng đặt sau nội dung ra quyết định chính.

Quyết định được hỗ trợ: kiểm tra nhóm dịch vụ giảm, xem hàng chậm bán, liên hệ nhóm khách phù hợp, kiểm tra chi phí và chuẩn bị khoản thanh toán sắp đến hạn. Không tự quy hiệu quả khuyến mãi hoặc nguyên nhân mất khách nếu chưa có dữ liệu chứng minh.

Không thêm khối chỉ để lấp chỗ trống. Trạng thái trống là không có bản ghi hợp lệ; thiếu quyền, mất kết nối và thiếu dữ liệu là các trạng thái khác nhau.

## 10. Yêu cầu kỹ thuật xuyên suốt

- Tuân thủ toàn bộ [AGENTS.md](../AGENTS.md): bo góc 9px, bề mặt bán trong suốt, màu phẳng, chữ thuần ngoài sidebar, tiếng Việt tự nhiên, phân trang ngoài bảng tối đa 10 dòng.
- Giữ hash, subtab và bộ lọc sau reload; chỉ bổ sung trạng thái có nhu cầu thực tế, không lưu dữ liệu tài chính làm nguồn chuẩn trong trình duyệt.
- Mọi dữ liệu nghiệp vụ lấy từ Supabase; không đọc file JSON, không thêm dữ liệu giả hoặc fallback tĩnh vào Admin.
- Ưu tiên RPC tổng hợp phía CSDL, chỉ mục theo truy vấn đã đo và phân trang tại server. Không tải toàn bộ lịch sử về trình duyệt để tính giữ khách hoặc lợi nhuận.
- Chốt giới hạn thời gian phản hồi và số truy vấn sau khi đo đường cơ sở; không tự tăng truy vấn/tần suất polling không giới hạn trên gói Free.
- Realtime chỉ kích hoạt nhóm dữ liệu cần tải lại, gom sự kiện, gỡ kênh khi rời tab; mất Realtime có trạng thái rõ và làm mới định kỳ có giới hạn.
- Nguồn bị cắt bởi giới hạn dòng không được công bố là tổng đầy đủ. Một nguồn lỗi không bị thay bằng số 0.
- Kết quả và file xuất phải cùng kỳ, phạm vi, phiên bản dữ liệu; không xuất dữ liệu cũ khi nguồn mới đang lỗi hoặc đổi kỳ.
- Kiểm tra quyền trên server cho từng RPC; chỉ cấp người được phép xem thông tin lương, chi phí, số dư và công nợ. Không đưa service-role key lên trình duyệt.
- Bổ sung migration theo số tiếp theo tại thời điểm triển khai, không chọn trước số đã có thể được dùng bởi công việc khác.
- Không dùng Supabase Logs theo quy định dự án; xác minh bằng dữ liệu nghiệp vụ có phạm vi, định nghĩa CSDL, phản hồi API và kết quả kiểm thử cục bộ.
- Thay đổi modal từng cái: phân tích trường, kiểm tra trực quan và nghiệm thu với người dùng trước khi chuyển sang modal kế tiếp, đúng quy trình AGENTS.md.

## 11. Kế hoạch kiểm thử và nghiệm thu

### Kiểm thử tính đúng

- [ ] Chống nhân dòng khi ghép payment, refund, dòng hàng và dòng dịch vụ; hoàn một phần không tạo hoàn trùng.
- [ ] Ngày theo múi giờ Việt Nam, cận cuối loại trừ, kỳ trước cùng độ dài và kỳ đang chạy được so sánh đúng.
- [ ] Giữ số âm, xử lý mẫu số 0, phân biệt thiếu dữ liệu với giá trị 0.
- [ ] Kiểm tra nhận trước, thu sau, thanh toán nhiều lần, giao dịch khác kỳ, hoàn tiền khác kỳ và điều chỉnh sau chốt.
- [ ] Chi phí đã ghi nhận nhưng chưa trả không bị bỏ khỏi kết quả; khoản trả nợ gốc và chuyển nội bộ không làm sai lợi nhuận.
- [ ] Đổi giá vốn danh mục không làm thay đổi báo cáo quá khứ; trả hàng đảo giá vốn đúng nghiệp vụ.
- [ ] Công nợ trả một phần và khoản dự kiến không bị cộng hai lần; số dư dự kiến dùng cùng phạm vi với số dư đầu kỳ.
- [ ] Khách cũ mua một lần trong kỳ, khách có nhiều payment cho một giao dịch và khách thiếu lịch sử được phân loại đúng.
- [ ] Việc mở lại, chuyển người phụ trách và thay đổi trạng thái gốc không làm sai tồn đọng.

### Kiểm thử hệ thống và giao diện

- [ ] Kiểm tra quyền hợp lệ, quyền bị thiếu, người chưa đăng nhập và truy cập trực tiếp RPC.
- [ ] Đối chiếu chỉ số với truy vấn độc lập cùng định nghĩa, tránh chỉ so hai hàm dùng chung một công thức sai.
- [ ] Kiểm tra Realtime đầu cuối trên môi trường thử nghiệm, mất kết nối, thử lại, chuyển tab và reload.
- [ ] Kiểm tra desktop và điện thoại; biểu đồ, bảng, bộ lọc, modal và file xuất đọc được, không tràn ngang ngoài vùng cuộn chủ đích.
- [ ] Đo truy vấn trên dữ liệu có quy mô phù hợp; kiểm tra giới hạn tải và nguồn tổng hợp lỗi một phần.
- [ ] Dữ liệu kiểm thử chỉ ở môi trường tách biệt hoặc giao dịch có hoàn tác phù hợp; không tạo chi phí giả, đổi trạng thái hoặc xóa tồn đọng trên CSDL dùng chung để làm đẹp kết quả.

### Câu hỏi nghiệm thu của người quản lý

- [ ] Khi bắt đầu ngày, tôi chọn được việc ưu tiên, biết ai đang phụ trách hoặc chưa được giao và mở đúng hồ sơ để xử lý.
- [ ] Tôi nhận ra một lịch thiếu KTV, một đơn thiếu hàng hoặc một yêu cầu hỗ trợ quá hạn mà không phải tự ghép dữ liệu từ nhiều biểu đồ.
- [ ] Tôi giải thích được phần biến động đã có bằng chứng và biết phần nào chưa rõ nguyên nhân.
- [ ] Tôi phân biệt được thu thuần, kết quả hoạt động và ước tính theo kế hoạch.
- [ ] Tôi biết kỳ nào đã đủ dữ liệu kết luận, kỳ nào còn thiếu hoặc chưa đối soát.
- [ ] Tôi nhìn được nghĩa vụ sắp đến hạn và mốc thiếu tiền theo kịch bản được nêu rõ.
- [ ] Tôi mở được giao dịch/chứng từ gốc của một con số hoặc cảnh báo.
- [ ] Tôi giao được việc cần xử lý và kiểm tra được kết quả cải thiện từ lịch sử thật.

## 12. Phát hành và kiểm soát thay đổi

### 12.1. Các gói công việc theo thứ tự

- [ ] **P01 — Kiểm kê nguồn và định nghĩa, thuộc M0.** Đầu ra: bản đồ nguồn, trạng thái hợp lệ, mốc thời gian và nguồn còn thiếu. Dựa vào mã hiện tại trước, chỉ truy vấn Cloud có phạm vi khi cần xác minh. Đây là gói bắt đầu ngay khi triển khai.
- [ ] **P02 — Nguồn tổng hợp điều hành, thuộc M1, sau P01.** Đầu ra: dữ liệu lịch hôm nay, công việc tồn đọng, người phụ trách và đường dẫn hồ sơ. Bổ sung RPC/chỉ mục khi cần; tránh nhân bản trạng thái nghiệp vụ.
- [ ] **P03 — Bản Vận hành sử dụng đầu tiên, thuộc M1, sau P02.** Đầu ra: tóm tắt, danh sách việc và nhịp phục vụ; kiểm tra mở hồ sơ, bộ lọc, nguồn lỗi một phần, desktop/điện thoại. Có thể nghiệm thu và sử dụng trước các gói sau.
- [ ] **P04 — Điều phối và lịch sử công việc, thuộc M1, sau P02.** Đầu ra: luồng người phụ trách, thời hạn, nhận việc/xử lý/mở lại và nguồn lực theo loại dịch vụ. Lịch sử bắt đầu từ ngày thu thật; xu hướng chỉ mở khi nguồn đầy đủ. Modal thực hiện từng cái theo AGENTS.md.
- [ ] **P05 — Phân tích kinh doanh, thuộc M2, sau P01.** Đầu ra: giao dịch hoàn thành, giá trị bình quân, khách quay lại đúng định nghĩa, so sánh kỳ tương đương và danh sách chứng minh. Nghiệm thu riêng dịch vụ và sản phẩm.
- [ ] **P06 — Quy trình ghi nhận tài chính, thuộc M3, sau phần định nghĩa tài chính P01.** Đầu ra: nơi nhập/duyệt chi phí, số dư, công nợ, giá vốn lịch sử và liên kết chứng từ. Hoàn thiện từng nhóm nguồn, không chờ thiết kế hết mọi báo cáo mới bắt đầu thu thập dữ liệu.
- [ ] **P07 — Báo cáo kết quả hoạt động, thuộc M4, sau phần doanh thu/giá vốn/chi phí đã đối soát của P06.** Đầu ra: kết quả thực tế hoặc tạm tính có phạm vi, đối chiếu kế hoạch và nguồn chứng minh. Phần chưa đạt nguồn chưa được gọi là lãi/lỗ thực tế.
- [ ] **P08 — Khả năng chi trả, thuộc M4, sau phần số dư/công nợ/lịch thanh toán đã đối soát của P06.** Đầu ra: nghĩa vụ đến hạn, số dư theo lịch thu chi và cảnh báo thiếu tiền có giả định. Không bắt P08 chờ P07 nếu nguồn riêng đã đạt điều kiện.
- [ ] **P09 — Nghiệm thu tích hợp, thuộc M5.** Đầu ra: người chủ thực hiện các tình huống quản lý thực tế, số liệu đối chiếu khớp, quyền và hiệu năng đạt yêu cầu; ghi rõ phần đã mở và phần còn thiếu dữ liệu.

Tất cả gói do người triển khai chuẩn bị phương án, mã và bằng chứng kiểm tra. Người chủ nghiệm thu theo quyết định kinh doanh; người phụ trách dữ liệu thực tế xác nhận nguồn và đối soát. Không coi việc đánh dấu hoàn thành một giao diện là hoàn thành nguồn dữ liệu của nó.

### 12.2. Phạm vi mã dự kiến

- `pages/admin/modules/dashboard/dashboard.html` và `dashboard.css`: bố cục và thứ tự thông tin.
- `dashboard.js` và phần cấu hình Dashboard trong `pages/admin/admin.js`: mặc định lần đầu, vòng đời tab và giữ trạng thái; chỉ chỉnh phần liên quan.
- `subtabs/tab-dashboard-operations.js` và `operations-metrics.js`: nguồn điều hành, danh sách việc, phân công và cảnh báo.
- `subtabs/tab-dashboard-business.js` và `business-metrics.js`: so sánh, nguyên nhân biến động và dữ liệu tài chính đủ điều kiện.
- `scripts/database/v1/`: migration bổ sung RPC, chỉ mục, quyền và nguồn mới sau kiểm kê; không sửa migration cũ đã triển khai để thay đổi Cloud.
- Các phân hệ Dịch vụ, Bán hàng, Nhân sự, Khiếu nại: chỉ thay đổi luồng giao việc/ghi nhận cần thiết sau khi đối chiếu nguồn gốc, không viết lại toàn bộ.
- `scripts/test/`: mở rộng kiểm tra đúng chỉ số, quyền, điều hướng và giao diện ở phạm vi thay đổi.

### 12.3. Điều kiện phát hành và quay lui

- Mỗi gói có kết quả kiểm tra, phần dữ liệu được đối soát và giới hạn còn lại; nghiệm thu từng phần thay vì chờ toàn bộ kế hoạch.
- Ưu tiên nguồn tài chính đã được xác nhận; không mở kết luận bằng chi phí mặc định hoặc số dư minh họa.
- Nếu cần quay lui giao diện, giữ chứng từ và lịch sử đã phát sinh; ưu tiên migration bổ sung, không xóa dữ liệu tài chính để rollback.
- Giữ thay đổi ở local sau kiểm tra. Chỉ push khi người dùng yêu cầu rõ ràng.

## 13. Thông tin cần xác nhận khi triển khai

Người triển khai tự đọc mã, schema và luồng hiện có trước. Chỉ hỏi người chủ về thực tế kinh doanh mà hệ thống không thể cung cấp:

- Ai đang xác nhận thu chi, công nợ và việc điều phối mỗi ngày?
- Chi phí, lương, số dư và khoản nợ đang được ghi ở đâu, từ mốc nào có thể đối chiếu?
- Có quy trình phục vụ, thời hạn cam kết hoặc khoản thanh toán bắt buộc nào chưa được ghi trong hệ thống không?

Từ các nguồn đó, người triển khai đề xuất cách ghi nhận, phân quyền, quy tắc cảnh báo và phạm vi báo cáo cụ thể để người phụ trách xác nhận. Không yêu cầu người chủ tự thiết kế chỉ số, schema hay màn hình.

Thiếu thông tin tài chính chỉ chặn phần tài chính phụ thuộc; vẫn tiếp tục được phần vận hành hoặc phân tích có nguồn hợp lệ. Các ngưỡng mới là đề xuất cho đến khi được xác nhận, không âm thầm áp làm kết luận sức khỏe doanh nghiệp.

## 14. Mã và tài liệu tham chiếu

- [Bộ điều phối Dashboard](../pages/admin/modules/dashboard/dashboard.js).
- [Khung giao diện](../pages/admin/modules/dashboard/dashboard.html) và [CSS](../pages/admin/modules/dashboard/dashboard.css).
- [Tab Kinh doanh](../pages/admin/modules/dashboard/subtabs/tab-dashboard-business.js) và [lớp tính toán kinh doanh](../pages/admin/modules/dashboard/subtabs/business-metrics.js).
- [Tab Vận hành](../pages/admin/modules/dashboard/subtabs/tab-dashboard-operations.js) và [lớp tính toán vận hành](../pages/admin/modules/dashboard/subtabs/operations-metrics.js).
- [RPC tổng hợp kinh doanh](../scripts/database/v1/241_admin_remaining_read_budget.sql).
- [RPC tiền thu và hoàn tiền](../scripts/database/v1/044_admin_dashboard_cashflow.sql).
- [Kế hoạch tài chính theo kỳ](../scripts/database/v1/246_admin_dashboard_plan.sql) và [bổ sung lưu riêng mục tiêu](../scripts/database/v1/247_dashboard_target_only.sql).
- [Mô tả chỉ số kinh doanh trước đây](dashboard-business-growth.md); một số hành vi đã được cập nhật trong mã, cần đối chiếu lại khi triển khai.
- [Biên bản kiểm tra ngày 16/11/2026](verification/dashboard-manager-review.md); dùng làm lịch sử nghiệm thu, không thay thế kiểm tra hiện tại.

## 15. Tiến độ

- [x] Đọc Dashboard hiện tại và lập kế hoạch phát triển.
- [x] Điều chỉnh mục tiêu theo nhu cầu chủ kinh doanh dịch vụ và sản phẩm; ưu tiên điều hành hằng ngày.
- [ ] M0 — Định nghĩa và kiểm kê dữ liệu.
- [ ] M1 — Điều hành cửa hàng hằng ngày, nghiệm thu bản đầu trước.
- [ ] M2 — Giải thích biến động kinh doanh.
- [ ] M3 — Nền dữ liệu tài chính thực tế.
- [ ] M4 — Kết quả hoạt động và khả năng chi trả.
- [ ] M5 — Nghiệm thu tích hợp và phát hành.

### Bản cải tiến đầu tiên — 21/11/2026

- [x] Kiểm kê nguồn vận hành trong repository; ghi bằng chứng và giới hạn ở [biên bản P01](verification/dashboard-development-p01.md).
- [x] Xây danh sách việc trực tiếp, tối đa 10 dòng/trang; lọc khẩn cấp, chưa phân công, chờ trên 7 ngày và nhóm nghiệp vụ; lưu bộ lọc khi quay lại.
- [x] Gom nhiều lý do trên một hồ sơ thành một việc; giữ lịch cũ chưa xử lý, hiển thị phân công từ lịch hẹn và phiếu hỗ trợ. Đơn hàng chưa có nguồn giao việc được báo thiếu dữ liệu phân công.
- [x] Thêm danh sách lịch bắt đầu hôm nay từ nguồn Supabase hiện có; phân biệt với kỳ lọc biểu đồ và với lịch trả phòng/đưa đón nhiều ngày.
- [x] Mặc định lần đầu vào Vận hành; giữ lựa chọn đã lưu và đường dẫn tab cụ thể. Đồng bộ ID hồ sơ khi mở phân hệ đã được lưu trong bộ nhớ.
- [x] Kiểm tra lỗi từng nguồn, quyền đọc, giới hạn số dòng, ngưỡng cảnh báo theo thời gian không có sự kiện CSDL, chuyển ngày và giao diện 1440/820/390/320px.
- [x] Kiểm tra bằng tài khoản Admin thật với mã Dashboard local: các nguồn vận hành đọc thành công, quan hệ tên bé và cột phân công dùng được; số lịch hôm nay khớp truy vấn độc lập. Chặn mọi ghi nghiệp vụ; không truy vấn Supabase Logs.

Đây là phần đầu P02/P03, chưa phải hoàn thành toàn bộ M0/M1. Không thay đổi schema. M0 còn cần xác nhận định nghĩa/ngưỡng, đối chiếu nguồn chuyên biệt và kiểm tra quyền theo từng vai trò. P04 còn lịch sử xử lý, phân công đầy đủ, năng lực theo chuyên môn, lịch trả phòng và các chặng đưa đón. Các ngưỡng cũ trên Dashboard được giữ nguyên; chưa gọi chúng là SLA đã được chốt, chưa bổ sung kết luận tài chính. Phạm vi đóng gói và việc còn thiếu được cập nhật tại [kiểm tra phát hành Dashboard](verification/dashboard-release-check.md).

### Tiếp tục phần bị gián đoạn — 21/11/2026

**Mã đã vượt bản P02/P03 đầu tiên, đã triển khai một phần P04 và phần cốt lõi P05. Chưa đánh dấu hoàn thành toàn bộ M0–M5 hoặc P04/P05 vì còn các điều kiện nghiệm thu bên dưới.**

- [x] Xác minh migration `259_dashboard_completion.sql` đã có trên Cloud từ lượt làm trước; lịch sử bắt đầu lúc **12:33:21 ngày 21/11/2026, giờ Việt Nam**. Bản ghi khởi tạo chỉ là số tồn tại mốc bắt đầu, không phải lịch sử hoàn tất trong quá khứ.
- [x] Danh sách việc dùng RPC tổng hợp và phân trang 10 dòng tại server, giữ bộ lọc, phân biệt nguồn thiếu quyền; các KPI/biểu đồ khác vẫn có nguồn đọc phân trang với giới hạn riêng.
- [x] Cảnh báo hỗ trợ dùng `support_ticket.sla_due_at`; bản ghi thiếu hạn được báo cần kiểm tra. Tuổi đơn đang chuẩn bị dùng sự kiện chuyển trạng thái đã quan sát; hồ sơ cũ chưa có sự kiện được báo thiếu mốc, không suy từ `updated_at`.
- [x] Ghi nhận chuyển trạng thái và đổi người phụ trách cấp hồ sơ cho lịch hẹn/hỗ trợ; ghi nhận tạo, chuyển trạng thái và xóa của bốn nhóm lịch hẹn, đơn hàng, hỗ trợ, đổi trả. Bảng biến động đối chiếu tồn đầu + mới mở + mở lại − kết thúc − đã xóa = tồn cuối. Đây là số hồ sơ nghiệp vụ đang mở, không phải vòng đời từng lý do cảnh báo.
- [x] Thêm hàng đợi lưu trú, nhận/trả phòng và chặng đưa đón dự kiến; phân trang 10 dòng. Cập nhật lại tên bé/nhân viên qua Realtime; khi danh sách thu ngắn, quay về trang cuối hợp lệ thay vì hiển thị trang rỗng.
- [x] Phân tích riêng đơn bán hàng và ca dịch vụ hoàn thành theo ngày hoàn tất: số giao dịch, giá trị dòng, giá trị bình quân và phần biến động do số lượng/bình quân. Tách khỏi tiền thu; giá trị dòng chưa trừ voucher/hoàn tiền, không gọi là doanh thu ghi nhận hoặc lợi nhuận.
- [x] Bổ sung khách giao dịch lần đầu trong lịch sử quan sát, khách đã giao dịch trước kỳ nay quay lại; so sánh kỳ trước cùng thời lượng đã trôi qua. Hiện tỷ lệ hủy/vắng theo nhóm hồ sơ tạo trong kỳ, kèm mẫu số và giới hạn định nghĩa.
- [x] Mở danh sách chứng minh cho giao dịch hoàn thành, khoản thu và khoản hoàn; phân trang phía server, chặn phản hồi cũ khi đổi kỳ, không mở nhầm hồ sơ khi khoản thu thiếu liên kết rõ ràng.
- [x] Kiểm tra với tài khoản Admin thật và mã local: các nguồn mới đọc được; mở hồ sơ đơn hàng/dịch vụ và quay lại Dashboard. Sửa lỗi render đơn hàng sau khi router đã gỡ DOM; kiểm tra lại việc khởi tạo tab chi tiết Dịch vụ khi dùng module đã cache.
- [x] Bổ sung và áp dụng migration `260_dashboard_workboard_waiting.sql`: ca quá giờ tính thời gian chờ từ giờ kết thúc dự kiến, đồng nhất SQL và lớp tính toán giao diện. Không sửa migration 259 đã triển khai; không thay đổi hồ sơ nghiệp vụ gốc.
- [x] Kiểm tra tính toán, giao diện 1440/820/390/320px, quyền RPC, công thức tồn, truy vấn nguồn độc lập và tính lặp an toàn của migration. Chi tiết bằng chứng tại [kiểm tra phát hành](verification/dashboard-release-check.md).

**Còn lại của P04/M1:** phân công và hạn xử lý đầy đủ cho đơn hàng/đổi trả/tồn kho; người thực hiện và thời gian nhận/xử lý từng việc cảnh báo; lịch sử phân công cấp dòng dịch vụ; đo đúng hạn theo loại việc; ảnh hưởng và năng lực theo chuyên môn/phòng/tài xế. Chặng đưa đón hiện là lịch dự kiến, chưa chứng minh trạng thái hoàn tất từng chặng.

**Còn lại của P05/M2:** nghiệm thu định nghĩa cùng người quản lý; đối chiếu đầy đủ giao dịch thiếu ngày hoàn tất/dòng chi tiết và lịch sử khách; chốt định nghĩa tỷ lệ giao dịch hoàn tiền. Danh sách chứng minh nhóm khách và tỷ lệ hủy/vắng đã bổ sung ở lượt ngày 22/11 bên dưới. Giá trị dòng dùng đúng tập giao dịch hoàn thành, còn bảng xếp hạng cũ giữ cơ sở ngày riêng và không dùng để tự giải thích tiền thu.

**Còn lại của M0/M5:** chốt ngưỡng/quyền theo vai trò, kiểm tra Realtime với biến động nghiệp vụ thật ở môi trường tách biệt, đo hiệu năng theo quy mô dữ liệu phù hợp và nghiệm thu quản lý. M3/M4 chưa có nền tài chính thực tế đủ đối soát. Mã giao diện giữ local, chưa push hoặc xác minh phát hành frontend trong lượt tiếp tục này.

### Rà soát thay đổi và bổ sung chứng minh — 22/11/2026

- [x] Giữ các sửa đổi về phản hồi muộn ở Bán hàng, khôi phục trang lưu trú, Realtime tên bé/nhân viên, cách tính quá giờ ở migration 260 và vùng cuộn bảng phân tích. Kiểm tra lại cùng toàn bộ Dashboard hiện tại.
- [x] Bổ sung và áp dụng migration `261_dashboard_analysis_evidence.sql`, không sửa các migration 259/260 đã triển khai. RPC đọc cung cấp chín nhóm chứng minh: bốn nhóm khách, hồ sơ tạo trong kỳ và hồ sơ hủy/vắng ở cả tử số/mẫu số. Mỗi khách/hồ sơ xuất hiện một dòng, tối đa 10 dòng/trang tại server, tự trở về trang cuối hợp lệ khi số lượng giảm.
- [x] Khách quay lại và giao dịch lặp dùng `customer_id`, hợp nhất đơn hàng/dịch vụ hoàn thành; kiểm tra số tổng bằng truy vấn độc lập từ hai nguồn gốc. Quyền xem tên hồ sơ được kiểm tra riêng; không có quyền tên thì chỉ trả mã khách, thiếu quyền danh sách thì báo lỗi thay vì trả số 0.
- [x] Thêm liên kết mở hồ sơ khách qua router, xóa tên cũ đã lưu để tránh breadcrumb nhầm. Các danh sách theo trạng thái ghi rõ ngày tạo và trạng thái hiện tại; không đổi nghĩa thành sự kiện hủy trong kỳ.
- [x] Kiểm tra Admin thật: năm hồ sơ đích của đơn hàng/dịch vụ/khách hàng hiển thị đúng khi quay lại Dashboard; 38 đường dẫn API đọc, không yêu cầu ghi nghiệp vụ. Kiểm tra lỗi/quyền/thử lại/đổi kỳ và giao diện 1440/820/390/320px; giữ style chung theo Khách hàng.
- [x] Tăng phiên bản nạp mã và CSS Dashboard thành `20261122_dashboard_evidence`. Frontend còn ở local, chưa push. M3/M4 và các điều kiện nghiệm thu còn lại không được đánh dấu hoàn thành.

### Số tổng vận hành và hướng dữ liệu tài chính — 22/11/2026

- [x] Bổ sung và áp dụng migration `262_dashboard_operation_totals.sql`. Sáu KPI vận hành dùng tổng hợp tại server, không còn lấy số tổng từ danh sách trình duyệt giới hạn 5.000 dòng. Quyền được kiểm tra riêng theo nguồn; thiếu quyền không trả số 0. Bỏ sản phẩm/SKU ngừng bán khỏi rủi ro tồn; đếm nhân viên có ca theo người, không nhân theo số ca.
- [x] Cập nhật có chọn lọc theo Realtime và mỗi phút khi Dashboard hiển thị, cùng bộ tải lại có gộp sự kiện. Lỗi số tổng có nút thử lại riêng; bảng việc vẫn hoạt động nếu KPI lỗi. Kiểm tra 5.001 lịch xác minh số tổng vẫn đủ trong khi bảng chi tiết báo giới hạn.
- [x] Kiểm tra sáu KPI với nguồn độc lập, quyền Admin/anon/chưa đăng nhập, kỳ không hợp lệ và khả năng áp dụng lặp an toàn. Không thay đổi hồ sơ nghiệp vụ gốc. Mã nạp JavaScript dùng phiên bản `20261122_dashboard_totals`.
- [ ] Biểu đồ và một số danh sách chi tiết vận hành vẫn dùng đọc phân trang tối đa 5.000 dòng, có báo giới hạn. Việc hoàn thành KPI không được ghi thành hoàn thành tối ưu toàn bộ Dashboard.
- [x] Sau khi người dùng đồng ý, bổ sung nguồn ghi nhận chi phí, giá vốn, số dư và công nợ ngay trong Dashboard → Kinh doanh. Chi tiết triển khai ở mục bên dưới; dữ liệu cũ chưa đủ căn cứ vẫn chưa đối soát, không dựng số lãi/lỗ.

### Sổ tài chính thực tế trong tab Kinh doanh — 22/11/2026

- [x] Migrations 263–266 đã áp dụng lên Supabase, không sửa các migrations đã phát hành. Có quyền đọc/ghi riêng, RLS, RPC kiểm tra quyền nguồn, lưu người ghi/căn cứ và chống gửi trùng. Kiểm thử nghiệp vụ được hoàn tác; không để lại số dư hoặc tiền thử.
- [x] Sổ chi phí tách ghi nhận và thanh toán một phần; quỹ tiền/số dư đầu, ghép thu/hoàn, xác nhận khoản nằm trong số dư đầu, chuyển quỹ và đối soát khóa kỳ.
- [x] Công nợ bổ sung liên kết khách/nhà cung cấp/phiếu nhập; công nợ hóa đơn hoàn tất tính trực tiếp từ nguồn, đặt hạn và mở hồ sơ gốc. Hoàn/đổi trả cần phân loại, tránh tính trùng giảm trừ và bồi thường.
- [x] Giá vốn được chụp tại xuất kho từ chi phí nhập thật, hoàn kho theo vốn gốc; tồn cũ và dòng bán cũ chỉ xác nhận khi có chứng từ. Điều chỉnh lưu dấu vết và yêu cầu kiểm tra lại vốn tồn liên quan. Thu sự kiện tài chính bắt đầu 21:24:30 ngày 22/11/2026, giờ Việt Nam.
- [x] Kết quả hoạt động chỉ mở khi đủ nguồn và xác nhận đủ chi phí; xác nhận hết hiệu lực khi số liệu đổi. Lịch thu chi 7/30/60/90 ngày theo phạm vi đã khai báo, mặc định không giả định thu công nợ; CSV thể hiện dữ liệu thiếu và mốc số dư.
- [x] Giữ hai tab Dashboard; bốn góc nhìn tài chính nội bộ trong Kinh doanh, biểu mẫu nội tuyến và style Khách hàng. Tìm kiếm/phân trang 10 dòng tại server, lưu vị trí sổ, không nạp lại báo cáo tổng chỉ để đổi trang/tìm kiếm.
- [x] SQL hoàn tác, biểu mẫu trình duyệt và 40 ca tính toán đạt; các bộ kinh doanh, kế hoạch, bằng chứng, bảng việc và style vẫn đạt. Xem [biên bản kiểm tra](verification/dashboard-release-check.md) để biết phạm vi, mốc và giới hạn.
- [x] Migration 267 chặn xung đột khi cùng phân loại hoàn và ghi giảm trừ đổi trả, khóa theo hóa đơn và giới hạn tổng giảm trừ. Kiểm tra khóa bằng hai kết nối, toàn bộ số tiền thử hoàn tác. Admin thật đọc báo cáo/sổ/tra cứu và mở năm hồ sơ nguồn đạt, 42 đường dẫn API đọc, không ghi nghiệp vụ.
- [ ] Nhập và đối soát số dư đầu, vốn tồn/vốn lịch sử, chi phí và công nợ thực tế; người quản lý nghiệm thu phạm vi/chứng từ. Tính năng đã có không đồng nghĩa đã đủ số liệu tài chính hoặc hoàn thành toàn M3/M4.
- [ ] Những phần M1/M2/M0/M5 còn mở ở các mục trước vẫn giữ nguyên. Giao diện local dùng cache `20261122_dashboard_finance_v1`, chưa push hoặc xác minh phát hành frontend.
