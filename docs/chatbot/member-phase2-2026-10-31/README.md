# Hoàn thiện phạm vi tra cứu thành viên — 31/10/2026

Mốc phát hành tiếp theo: người dùng đã yêu cầu push phần thành viên lên main. Những đoạn “còn local/chưa push” bên dưới mô tả trạng thái lúc nghiệm thu; không dùng chúng để suy ra smokeProduction đã đạt. Bản phát hành này bao gồm cả160/161 và các hồi quy đã nêu.

Đã triển khai và nghiệm thu local các phần còn thiếu sau đợt cơ bản: nhật ký chăm sóc, Hotel, Taxi, lịch sử điểm, ví ưu đãi và hỗ trợ riêng. Nguồn161 đã ápCloud sau thử SQL rollback; cùng nguồn160 đã áp trước. API/frontend còn local, chưa push, chưa gọi đây là nghiệm thu Production.

## Câu hỏi đã hỗ trợ

| Nhóm | Ví dụ và thông tin trả về |
| --- | --- |
| Nhật ký | “Nhật ký chăm sóc của tôi”, “Nhật ký BKG-…”: thời gian, bé/lịch, hành động, mô tả và quan sát đã ghi; link xem tiếp ở nhật ký/lịch |
| Hotel | “Hotel của tôi đã đặt thế nào?”, “Hotel BKG-…”: lịch/phiếu lưu trú, phòng và loại phòng, nhận/trả, giá ghi trên phiếu, khẩu phần và lưu ý; không tính tổng tiền bằng cách tự nhân ngày |
| Taxi | “Taxi của tôi đón ở đâu?”, “Taxi BKG-…”: điểm đón/trả, km, loại chuyến, giờ đi/về nếu có, giá đã ghi và trạng thái |
| Lịch sử điểm | “Lịch sử điểm của tôi”, “Xem tiếp”: biến động có dấu, thời gian/lý do; phân biệt với số dư hiện tại |
| Ví ưu đãi | “Ví ưu đãi của tôi”, “Voucher của tôi còn hạn không?”: mã/tên, đã dùng/hết hạn/ngừng/chưa sử dụng, mức giảm/tối thiểu/thời gian; không khẳng định đủ điều kiện ở đơn cụ thể |
| Hỗ trợ | “Yêu cầu hỗ trợ của tôi xử lý đến đâu?”, “Xem TKT-…”: phiếu/trạng thái/mô tả, trao đổi công khai gần nhất; chỉ kết quả khi phiếu đã hoàn tất |

Bốn nhóm cơ bản đơn/lịch/bé/điểm và hạng tiếp tục hoạt động. Hỏi thêm trang/Xem tiếp giữ một chủ đề trong tối đa4 câu hỏi trước; mã/UUID luôn được lọc lại theo đúng chủ, không cấp quyền bằng cách biết mã. Nhiều nhóm hỏi chọn trước. Khi cần thay đổi, khách mở trang nghiệp vụ và xác nhận; chatbot không tự ghi giao dịch.

## Quyền và tải

Nguồn161 là projection đóng SECURITY DEFINER như các gateway logistics/support đang có, yêu cầu Auth role authenticated và hàm admit_member_chat_read xác minh customer đang active, Auth không bị cấm, không thuộc nhân sự. Không nhận customer_id, không truy vấn theo số điện thoại/email. Mọi nhánh lọc customer_id của caller; logistics/nhật ký đi qua appointment đúng chủ. Chỉ grant execute cho authenticated, không cho anon/service-role.

Support loại is_internal/system/internal_note, investigation_note và kết quả của phiếu đang xử lý; không trả người xử lý hay liên hệ nội bộ. Chỉ lấy trao đổi công khai cuối cùng, có cap ký tự; toàn bộ hội thoại/ảnh mở ở trang riêng. Nội dung private không được gửi model; lượt hỏi công khai sau đó vẫn history rỗng cho member.

Một RPC/nhóm, lấy6 để hiển thị tối đa5 bản ghi và biết còn trang; mỗi response16KiB, page0–99, trường nội dung có giới hạn, SQL5s/lock1s và source pool4 slot chung. Không tăng polling/Realtime hay gọi AI theo token, không tải toàn hồ sơ/lịch sử cho AI lọc. Số byte HTTP/token/Supabase Auth toàn hệ thống chưa được đo thành benchmark tải đồng thời; không dùng các cap này để kết luận database không thể quá tải.

## Bằng chứng và lỗi đã sửa

-68 test Node đạt gồm7 test nhóm sâu mới,7 nhóm member trước và54 hồi quy public/quyền/privacy/streaming. Có formatter dữ liệu lỗi/owner sai, trạng thái chưa biết và không biến điểm lịch sử thành số dư.
-16 ca SQL161 đạt với hai danh tính QA và cả sáu nhóm có dữ liệu: cap/trang không trùng/bytes, foreignID/rỗng, chọn đúng lịch, hidden support note/kết quả chưa hoàn tất, invalid input, banned/guest/service denied. Fixture nằm trong transaction rollback; chỉ áp hàm mới sau khi các ca đạt. [SQL](sql-checks.txt).
- Browser thành viên thật đối chiếu sáu nhóm qua JWT caller: lịch sử điểm5 dòng, ví5 dòng, hỗ trợ3 dòng, ba nhóm nhật ký/Hotel/Taxi trống đúng nguồn. Ca không rỗng của ba nhóm đó đã kiểm SQL và formatter, chưa có dữ liệu trên tài khoản người dùng để giả định UI thật có dữ liệu. [Kết quả và lỗi ban đầu](browser-checks.txt).
- Phát hiện câu tra cứu hỗ trợ trung tính bị sentiment đẩy lên mức chuyển người. Chỉ ngoại lệ đúng mẫu tra phiếu trung tính khi không toxic/không risk/không yêu cầu người; sự cố y tế/tiền/hàng và yêu cầu nhân viên giữ quy tắc cũ. Thử lại đúng câu trên UI đạt3 phiếu, vẫn bot_handling. Hai hội thoại QA bị chuyển nhầm đã trả về bot bằng đúng quyền sở hữu, không tác động ca hỗ trợ thật.
- Hai tài khoản QA đăng nhập thật bằng form phone/password: A/B thấy đúng pet; bấm Đăng xuất thật; B không dùng lại transcriptA, đọc chatA bị403, đưa UUIDpetA vàoRPC không thấy; trở lạiA đúng chủ; khóa tài khoản QA không nhận câu trả lời private mới. Mọi account/customer/pet/chat QA đã dọn; không đăng xuất hay sửa tài khoản người dùng. [Browser hai tài khoản thật](accounts-browser.txt).
- Hồi quy response cũ giữa A/B, plain-text renderer và stream lỗi có transport kiểm soát riêng; không gọi đó là hai caller thật. Không chạy thêm Gemini hoặc đọc Cloud Logs trong đợt này.

## Điều kiện kết thúc và phát hành

Phạm vi tra cứu thành viên theo kế hoạch đã hoàn thành local; không còn chờ hai tài khoản thật hoặc sáu nhóm sâu mới triển khai. Còn phát hành khi người dùng yêu cầu push, smoke Vercel và theo dõi tải. Bộ lọc thời gian tùy ý, media, toàn trao đổi hỗ trợ và mọi thao tác tạo/đổi/hủy/đổi điểm tiếp tục ở trang nghiệp vụ; đây là ranh giới sử dụng đã chốt, không tự đánh dấu chat đã làm thay.

Không tự mở rộng phạm vi dữ liệu Admin, không liên kết giao dịch guest bằng liên hệ trùng và không coi “đăng nhập” là quyền xem dữ liệu của người khác.
