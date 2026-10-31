# Đợt1 khách vãng lai: triển khai và kiểm tra kỹ thuật

Ngày31/10/2026. Đợt này hoàn thiện nội dung/chức năng, không chạy bộ nghiệm thu browser đợt2. API/UI đang local; hai hàm đọc159 đã bổ sung trênCloud để dùng đúng dữ liệu hiện hành. Chưa push các thay đổi code của đợt này.

## Đã triển khai theo nhu cầu khách

- Cửa hàng: địa chỉ/hotline/giờ ngày thường/cuối tuần và lưu ý ngày lễ lấy từ cấu hình hệ thống. Người dùng đã cho phép chọn cấu hình làm nguồn chính khi phát hiện footer mâu thuẫn. Chỉ chọn các trường công khai, không đưa tên có hậu tố QA, khóa, cấu hình thanh toán hay dữ liệu nhân viên ra ngoài. Footer/map đồng bộ địa chỉ120 Nguyễn Thị Minh Khai, Quận3 và hotline1900 888 999.
- FAQ:16 câu chuẩn đang bật, có nội dung hoàn chỉnh; các câu hỏi thường gặp về đặt/mua guest, đổi trả, giao hàng, hủy/hoàn, chuẩn bị, điểm và tra cứu trả trực tiếp từ nguồn đúng câu. Không gọi model để diễn giải lại một hướng dẫn đã đủ.21 trạng thái FAQ150/152/157 đã cập nhật từ đợt trước được giữ.
- Hiểu câu hỏi: gỡ dấu, một số lỗi gõ/viết tắt phổ biến; nhóm câu hỏi ngắn và hỏi tiếp lấy tối đa bốn câu của chính guest/customer trong ca. Giữ cân nặng/khoảng cách/loài/sản phẩm khi còn đúng chủ đề, dừng khi đổi chủ đề; không dùng nội dung bot/staff làm lệnh hoặc cấp thêm quyền.
- Dịch vụ: lọc gói đang bật theo loài được cấu hình hỗ trợ và cận cân nặng có/không gồm cận trên. Hiển thị mô tả, điều kiện, thời lượng khi có và liên kết chọn gói. Không tự xác nhận đủ điều kiện tiếp nhận về sức khỏe.
- Hotel: đọc loại phòng thật, mô tả/tiện ích/sức chứa, cận cân và đơn vị tính phút/24giờ. Có lọc tên loại được hỏi; không mặc định Daycare tính theo ngày hoặc tự coi Luxury/Deluxe là VIP. Thiếu loại/tiện ích phải nói rõ.
- Taxi: lọc giá theo cân nặng và khoảng cách, giữ cận đúng nguồn. Nêu giá cơ bản và phụ phí cấu hình; thời gian/lượt đi-về và báo giá cuối phải xác nhận ở bước đặt.
- Sản phẩm: tìm theo tên/SKU hoặc nhu cầu/loài; so sánh tối đa hai truy vấn, mỗi truy vấn tối đa hai biến thể. Chỉ đưa mô tả/giá/đối tượng công khai. Trạng thái còn/hết dùng cùng công thức kho trừ giữ chỗ của cửa hàng, chỉ trả boolean, không số tồn nội bộ/giá vốn. Kiểm tra lại khi mua.
- Cách đi tiếp: liên kết thật đến dịch vụ, cửa hàng, sản phẩm, đặt lịch theo service và tra cứu guest. Widget chỉ dựng link bot thuộc whitelist đường dẫn nội bộ; dùng textContent/TextNode, không dựng HTML hoặc link tùy ý từ câu trả lời. Lưu trong nội dung chat nên vẫn dùng được sau khi tải lại lịch sử.
- Lịch/phòng trống: hướng tới bước đặt có kiểm tra sẵn; không tạo một nguồn xác nhận riêng khi còn thiếu loài, dịch vụ, ngày/giờ, thời lượng hoặc phòng. Không báo còn/hết từ FAQ hoặc giá niêm yết.
- Không ngõ cụt: câu mơ hồ hỏi lại thông tin cần, câu chưa có nguồn nêu phần thiếu và bước tiếp; giữ xử lý handover/idempotency/nháp/lỗi đã có. Lỗi khóa nút chuyển người sau gửi đã sửa local từ lượt trước, không tạo lại engine chat mới.

## Kiểm tra kỹ thuật và bằng chứng

| Kiểm tra | Kết quả |
| --- | --- |
| Unit/API contract, nguồn, owner và ranh giới model |42 test PASS; gồm định tuyến14 nhu cầu, hỏi tiếp, từ chối quyền riêng, nguồn quá lớn/sai kiểu và FAQ bị cắt |
| Handler thật với Cloud, model bị chặn bằng dependency kiểm thử |19 tình huống PASS, gồm sản phẩm/SKU và so sánh; không gọi Gemini. `api-checks.txt` |
| HTTP thật localhost4000 |Địa chỉ cửa hàng và hướng dẫn đặt guest trả200, lưu/đọc lại câu trả lời có link. `localhost-http-checks.txt` |
| Nguồn SQL159 |14 kiểm tra hợp lệ/đầu vào sai và grants đạt; dữ liệu tối đa5 mục/16KiB. `database-checks.txt` |
| Loài được nhận |Sáu tổ hợp grooming/Hotel/Taxi × chó/mèo: không trả service ngoài quan hệ hỗ trợ. `species-checks.txt` |
| FAQ chuẩn |16 nguồn có đúng một bản đang bật, đầy đủ và trong giới hạn. `faq-coverage.txt` |
| Phiên bản SQL cuối và lọc phòng |Đã kiểm tra tên phòng được yêu cầu, không tự suy VIP; hash159 cuối ở `final-source-version.txt` |

Các fixture của unit không dùng làm runtime. Kiểm tra handler/HTTP chỉ tạo các hội thoại chẩn đoán guest có chủ sở hữu, không tạo đơn/lịch, không sửa hồ sơ/điểm hay xóa audit. Lịch sử chẩn đoán được giữ. Lượt đọc nguồn/câu hỏi chạy tuần tự, không tạo tải đồng thời lớn. Không đọc Cloud Logs hoặc gọi model bên ngoài.

Trong quá trình làm, hai lỗi kỹ thuật được phát hiện và sửa trước khi chốt: nhận diện từ “Mèo” đứng riêng trong hỏi tiếp và tên alias SQL `term` trùng biến PL/pgSQL khi lọc Hotel. Lần cập nhật SQL lỗi đã rollback transaction; bản cuối đã kiểm tra lại và commit.

## Điều kiện tài nguyên/quyền

Hai hàm159 chỉ service_role, SECURITY INVOKER; anon/member không có quyền EXECUTE. API vẫn xác minh đúng chủ ca trước khi dùng. Lượt seed gộp rules và tối đa bốn câu gần nhất vào một RPC, không thêm một vòng HTTP đọc ngữ cảnh riêng. Câu thường tối đa rules + một nguồn công khai, không mở vòng lặp công cụ/model. Không thêm polling, cache riêng dùng chung sai danh tính hoặc subscription.

Tận dụng index tìm tên sản phẩm/SKU và index FK hiện có cho kho/giữ chỗ. Không gọi `customer_shop_catalog` toàn danh mục; kho chỉ được tính cho tối đa bốn biến thể đã chọn. Timeout SQL5 giây/lock1 giây, pool nguồn hiện có.159 là thêm hàm đọc, không sửa dữ liệu nghiệp vụ; rollback có sẵn, phải đưa API về bản tương thích trước khi bỏ hàm. Không lấy các phép kiểm nhỏ này để đóng Gate2/tải Production.

## Để đợt2 nghiệm thu

Kiểm tra trực tiếp đủ14 nhu cầu trên browser localhost: chất lượng câu trả lời cuối, bấm link, responsive/bàn phím, cache/danh tính, chuyển nhân viên và đọc nền. Gemini thật chỉ thử trong phạm vi gửi dữ liệu được đồng ý; common guide đã không còn phụ thuộc model. Phát hành/push và kiểm tra bản phát hành được theo dõi riêng, không gọi local là Production đã xong.

Các giới hạn có chủ ý vẫn phải nêu cho khách: ngưỡng điểm/ưu đãi hoặc chính sách chưa có số xác nhận không được bịa; không tra giao dịch riêng, chẩn đoán, tự đặt/mua; không xác nhận lịch/phòng trống qua chat. Đây là ranh giới đã triển khai, không phải chức năng bí mật được mở khi khách tự xưng Admin.
