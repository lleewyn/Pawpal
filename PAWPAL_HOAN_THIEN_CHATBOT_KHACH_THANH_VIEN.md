# Hoàn thiện chatbot khách thành viên

Phát hành: đã push main9b5e0ccd. Ngày01/11/2026 đã kiểm tra đúng bảnVercel qua marker20261031_member_complete;10 nhóm trên phiên thành viên thật và mobile guest đạt. Kết quả A/B và giới hạn được ghi trong [báo cáoVercel](docs/chatbot/member-vercel-2026-11-01/README.md).

Ngày31/10/2026. Đã hoàn thành phạm vi tra cứu thành viên gồm bốn nhóm cơ bản và sáu nhóm sâu bên dưới, nghiệm thu local/API và Cloud thật. Migration160/161 đã ápCloud; API/frontend đã push9b5e0ccd.68 test Node đạt; SQL/RLS với dữ liệu QA rollback và browser hai tài khoản thật đạt. [Báo cáo đợt hoàn thiện](docs/chatbot/member-phase2-2026-10-31/README.md), [đợt cơ bản](docs/chatbot/member-phase1-2026-10-31/README.md).

## Câu hỏi cần trả lời

| Nhu cầu | Ví dụ | Kết quả cần đạt |
| --- | --- | --- |
| Lịch hẹn | Tôi có lịch nào sắp tới? Xem lịch BKG-… | Đúng lịch thuộc tài khoản, ngày/giờ Việt Nam, bé/gói và trạng thái; mở chi tiết khi cần |
| Đơn hàng | Đơn của tôi đang ở đâu? Xem đơn ORD-… | Danh sách có giới hạn hoặc đúng mã; trạng thái xử lý/giao nhận, số tiền chỉ khi có nguồn rõ |
| Thú cưng | Tôi có những bé nào? Thông tin bé tên Miu | Đúng hồ sơ bé của mình, giống/loài/cân nặng đã ghi; trùng tên phải chọn lại, không chẩn đoán |
| Điểm và hạng | Tôi còn bao nhiêu Paw Points? Tôi đang hạng nào? | Số dư từ sổ điểm và hạng đang gán, không tự suy chính sách hay cộng/trừ điểm |
| Thông tin chung | Giá tắm, cách đặt, chính sách | Giữ toàn bộ khả năng công khai như vãng lai, không đọc dữ liệu riêng nếu không cần |
| Tiếp tục công việc | Xem trang2, mở hồ sơ, cần đổi/hủy | Phân trang theo yêu cầu và link đúng màn hình; chat không tự đổi/hủy/tạo giao dịch |
| Nhật ký chăm sóc | Nhật ký chăm sóc của tôi; nhật ký BKG-… | Các ghi nhận thật, thời gian/hành động/quan sát, phân trang; không diễn giải thành chẩn đoán |
| Lưu trú Hotel | Hotel của tôi đã đặt thế nào? Hotel BKG-… | Đúng lịch, phòng/loại phòng, nhận/trả, khẩu phần/lưu ý và giá ghi trên phiếu; không tự nhân tổng giá |
| Chuyến Taxi | Taxi của tôi đón ở đâu? Taxi BKG-… | Điểm đón/trả, một chiều/khứ hồi, km/giờ/giá chuyến và trạng thái đúng nguồn |
| Lịch sử điểm | Lịch sử điểm của tôi; xem tiếp | Biến động cộng/trừ và lý do, không nhầm biến động thành số dư |
| Ví ưu đãi | Ví ưu đãi của tôi còn gì? | Mã/tên, trạng thái, hạn và điều kiện; chỉ chốt dùng được khi hệ thống kiểm tra ở bước mua/đặt |
| Hỗ trợ riêng | Yêu cầu hỗ trợ của tôi xử lý đến đâu? | Trạng thái/trao đổi công khai/kết quả đã hoàn tất; không lộ ghi chú nội bộ hoặc tự chuyển người vì câu tra trạng thái trung tính |

## Đợt1 — Triển khai

- [x] TV01 — Đối chiếu nguồn/RLS/index, projection bốn nhóm và ca tổng tiền có giảm giá; không dùng snapshot toàn hồ sơ.
- [x] TV02 — RPC bằng JWT, tự xác định auth.uid; service-role bị từ chối. Helper tổng tiền giới hạn6 ID, chỉ tổng của chủ được xác minh, không mở policy bảng con.
- [x] TV03 — Nhận câu riêng/công khai, mã/UUID, trang và Xem tiếp; nhiều nhóm hỏi chọn, tên bé trùng không gộp.
- [x] TV04 — Trả xác định, lỗi không giả số0; model chỉ FAQ công khai và history rỗng ở phiên member. Test kiểm không có dữ liệu riêng trong model payload.
- [x] TV05 — Link bốn trang tài khoản và chi tiết đơn/lịch có whitelist; cap5/16KiB, không thêm polling/AI.

## Đợt2 — Kiểm thử và nghiệm thu

- [x] TV06 —16 ca SQL/RLS vớiA/B/guest/blocked/foreignID, transaction rollback; không ghép theo liên hệ. Nguồn160 đã áp riêng sau tests.
- [x] TV07 — Browser/API thật đối chiếu bốn nguồn callerJWT; Node API kiểm ownership/lỗi/cap/không model, SQL ca voucher và thanh toán riêng. Không gọi fixture là API Cloud thật.
- [x] TV08 — Đợt đầu14 kiểm tra browser thành viên thật đạt. Đợt hoàn thiện thêm sáu nhóm sâu, hai tài khoản QA đăng nhập/đăng xuất bằng UI thật, truy cập chéo403/rỗng và tài khoản QA bị khóa; dữ liệu QA đã dọn. Response cũ khi đổi danh tính có hồi quy transport kiểm soát; không tự đăng xuất phiên người dùng.
- [x] TV09-local — Đã ghi request/body và giới hạn, chưa đo toàn tảiDB đồng thời. API/frontend đã phát hành9b5e0ccd; kết quả Vercel ghi riêng bên dưới.
- [x] TV09-release — Đã push9b5e0ccd, marker đúng trênVercel;10 nhóm thành viên đối chiếu caller-JWT, mobile guest và link chi tiết đơn đạt. Chưa đo tải đồng thời hoặc streamingGemini trênProduction trong lượt này.

## Hoàn thiện phần sâu theo yêu cầu “làm hết thành viên”

- [x] TV10 — Nhật ký chăm sóc, theo mã lịch/mã bé và lấy tiếp; không tải ảnh hoặc toàn timeline vào chat/model.
- [x] TV11 — Hotel/Taxi theo lịch đã đặt, thông tin ghi nhận và link lịch liên quan; không tự thay lịch/chuyến hoặc suy báo giá cuối.
- [x] TV12 — Lịch sử điểm và ví ưu đãi riêng có phân trang, trạng thái/hạn/điều kiện; không đổi điểm hoặc sử dụng mã thay khách.
- [x] TV13 — Yêu cầu hỗ trợ riêng và trao đổi công khai mới nhất; loại internal note/investigation và kết luận khi chưa giải quyết.
- [x] TV14 — Nguồn161 một nhóm/câu, cap5/16KiB, SQL5s/lock1s và pool chung; SQL/RLSA/B/blocked/guest và sáu nhóm có dữ liệu trong transaction rollback đạt.
- [x] TV15 — Browser local/API thật đối chiếu sáu nhóm; phát hiện/sửa câu tra phiếu bị chuyển người sai. Sáu nhóm cuối đạt; tài khoản thật có nhật ký/Hotel/Taxi trống nên ca có dữ liệu được đối chiếu ở SQL và formatter. Không ghi nội dung riêng vào báo cáo hoặc gọi model.

## Điều kiện tài nguyên và riêng tư

Một nhóm dữ liệu riêng mỗi câu, một RPC đọc có giới hạn, SQL5s/lock1s, dùng pool đọc chung hiện có. Đọc tiếp chỉ theo yêu cầu; không tải toàn lịch sử để AI lọc, không có truy vấn theo từng token. Aggregate điểm chỉ trong customer hiện tại, không đọc danh sách điểm của mọi người.

Không đọc Cloud Logs. Không thử sửa đơn/lịch/hồ sơ thật; fixture phải thuộc lượt kiểm thử và được rollback/cô lập. Dữ liệu riêng trả qua formatter xác định, không gửi Gemini; không gọi model mới để kiểm thử khi chưa có phạm vi được đồng ý. Dữ liệu nội bộ Admin và hồ sơ người khác luôn nằm ngoài quyền thành viên.

31/10/2026: đã hoàn thiện phạm vi tra cứu và hướng thao tác của thành viên. Còn bước phát hành khi được yêu cầu, smoke Vercel và đo tổng tải đồng thời. Chat không tự tạo/đổi/hủy giao dịch: khách tiếp tục xác nhận ở màn hình nghiệp vụ. Nội dung media/tin trao đổi dài vẫn mở ở trang riêng; không hứa hỗ trợ mọi cách diễn đạt hoặc mọi bộ lọc tùy ý.
