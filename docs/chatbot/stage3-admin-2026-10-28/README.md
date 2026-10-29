# Giai đoạn 3 — Tra cứu Admin theo phân hệ

**Cập nhật29/10:** Đã bổ sung ma trận offline28 công cụ với118 nhóm kiểm tra, tổng203 kiểm tra hồi quy và40 ca nghiệp vụ đạt; sửa định tuyến thanh toán thiếu mã và kiểm tra trường số ở formatter nhóm mới. [Kết quả và giới hạn](../stage3-matrix-2026-10-29/README.md). Đây là bổ sung offline, không thay thế oracle SQL hoặc nghiệm thu Production. Các giới hạn/việc còn thiếu bên dưới là mốc lịch sử của145; xem hồ sơ sau để biết phần đã hoàn thành.

Trạng thái: triển khai và kiểm chứng **local**. Migration mới: `145_admin_chat_stage3.sql`, có rollback tương ứng. Chưa áp Cloud, chưa push phần này. Checkpoint remote vẫn là `472da7ed`; phần 144 cũng đang local. Gate 2 tổng tài nguyên còn mở; kết quả này không cho phép phát hành Production.

**Cập nhật tiếp theo:** [Đợt G3.4/migration146](../stage3-detail-2026-10-28/README.md) đã bổ sung phân trang 8 công cụ cũ và facts cho hướng dẫn/nháp. Các mô tả giới hạn RPC cũ bên dưới là mốc nghiệm thu145; xem hồ sơ146 để biết trạng thái hiện tại.

## Danh mục thực thi

Ngoài 12 công cụ giai đoạn 2, bổ sung 15 công cụ dưới đây. Mỗi công cụ kiểm tra đủ quyền bảng ở cả JavaScript và SQL; SQL chạy bằng quyền caller/RLS. Khách vãng lai và thành viên không được gọi công cụ Admin.

| Công cụ | Câu hỏi mẫu | Phạm vi và giới hạn |
|---|---|---|
| customer.pets | Thú cưng của khách: CUS-001; Khách này có bé nào? | Tìm chủ theo mã/tên/điện thoại; trả thú cưng, giống, lưu ý. “Khách này” cần ngữ cảnh khách đã chọn, không tự đoán. |
| pet.lookup | Thú cưng: PET-001 | Tìm mã/tên thú cưng; lưu ý tối đa 600 ký tự có nhãn rút gọn. |
| payment.order | Thanh toán đơn: ORD-001 | Tổng thu thành công, tổng hoàn thành công, chênh lệch và số yêu cầu hoàn chờ. Không đọc tài khoản ngân hàng. |
| order.refund_pending | Đơn hủy đã thanh toán nhưng chưa hoàn | Đơn cancelled có thu lớn hơn hoàn; mặc định toàn bộ tồn đọng, không chỉ hôm nay. Nếu hỏi khoảng ngày: lọc ngày tạo đơn, vì không có trường ngày hủy riêng. |
| appointment.search | Lịch Spa chiều mai chưa có KTV | Ngày/khoảng ngày/tuần/tháng; nhóm dịch vụ, trạng thái, buổi, chưa phân công. Chưa lọc theo tên KTV. |
| ticket.lookup | Khiếu nại: TK-001 | Mã hoặc tiêu đề; danh sách chưa kết thúc tiếp tục dùng ticket.open đã có. |
| conversation.list | Hội thoại chờ nhân viên | Mã/tên/mã khách, trạng thái, ngày tạo nếu được hỏi; chỉ xem đoạn tin gần nhất tối đa 160 ký tự, không tải toàn bộ transcript. |
| points.lookup | Pawpoint: CUS-001 | Tổng sổ giao dịch điểm theo khách. Thiếu quyền sổ điểm bị từ chối, không trả số dư 0 giả. |
| offer.list | Ưu đãi đang hiệu lực | Voucher và chương trình đang hoạt động trong ngày hiệu lực Việt Nam. Chỉ danh mục; không khẳng định khách/đơn đủ điều kiện hoặc đã còn lượt dùng. |
| staff.lookup | Nhân viên đang làm việc; Nhân viên: tên | Danh sách, chức danh và trạng thái. Không đọc lương, tài khoản hoặc lý do nghỉ. |
| staff.schedule | Lịch trực tuần này | Ca có thời gian giao với kỳ tra cứu; tìm tên nhân viên tùy chọn. Không trả ghi chú cá nhân. |
| review.list | Đánh giá thấp tháng này | Ngày tạo, tìm nội dung; “thấp” là tối đa 2 sao; nội dung tối đa 400 ký tự có nhãn rút gọn. |
| content.list | Bài viết đã đăng | Tìm tiêu đề/slug; trạng thái; trả tiêu đề và tóm tắt, không tải nội dung bài dài. |
| report.operations | Báo cáo vận hành tuần này | Ba số đếm độc lập: đơn được tạo, lịch hẹn bắt đầu, phiếu hỗ trợ được tạo. Không cộng ba nguồn thành một chỉ số. Thực thu tiếp tục dùng revenue.summary đã có. |
| settings.read | Giờ mở cửa; Thông tin cửa hàng | Chỉ 9 đường dẫn được liệt kê trong system_config: tên, điện thoại, địa chỉ, giờ mở/đóng ngày thường/cuối tuần, số giờ hủy miễn phí, sức chứa khung giờ. Không trả toàn bộ cấu hình hoặc trường mới tự phát sinh. |

Các yêu cầu định lượng dùng SQL xác định, không gửi cho model tự đếm. Hướng dẫn vẫn dùng FAQ đang bật và quyền `chatbot_knowledge_faq.read`; thiếu nguồn phải nói chưa có hướng dẫn. Soạn nháp giữ nhãn cần kiểm tra và không tự gửi/ghi nghiệp vụ. Phần này không chứng nhận chất lượng model thật hoặc khả năng trả lời mọi câu tiếng Việt.

Liên kết tiếp tục làm việc dùng danh sách hash đã đối chiếu với `pages/admin/admin.js`: khách, thú cưng, đơn, lịch, trực chat, sản phẩm, khuyến mãi, nhân sự, lịch trực, bài viết, cấu hình. Chỉ mở phân hệ; chưa áp bộ lọc hoặc tự chọn hồ sơ. Công cụ không có đích phù hợp không tạo liên kết giả.

## Thời gian, phân trang và tài nguyên

- Giờ Việt Nam; tuần từ thứ Hai đến trước thứ Hai kế tiếp; tháng theo lịch; khoảng “từ…đến…” bao gồm ngày kết thúc; SQL dùng `[start,end)`. Mỗi lượt tối đa 31 ngày, không tự chia thành nhiều truy vấn. Buổi sáng 00–12h, chiều 12–18h, tối 18–24h theo giờ bắt đầu lịch.
- “Chưa có KTV”: lịch chưa có người phụ trách và mọi hạng mục chưa hủy đều chưa có KTV. Không suy luận từ riêng trường cấp lịch.
- 15 công cụ mới: 10 dòng/trang, thứ tự ổn định kèm ID, tổng khớp cùng điều kiện và quyền. Hỏi “trang 2” kế thừa câu hỏi gần nhất hợp lệ; nếu không đủ lịch sử thì yêu cầu nhắc lại. Trang vượt tổng kẹp về trang cuối. Các trang là dữ liệu hiện thời, không phải snapshot bất biến khi người khác đang sửa.
- Công cụ cũ giữ giới hạn mẫu đã công bố ở giai đoạn 2; không quảng cáo đã có phân trang đầy đủ cho các RPC cũ. Khoảng tuần/tháng bổ sung cho lịch, thực thu và khiếu nại; không áp ngày tùy ý cho nguồn không có bộ lọc đó.
- Giữ trần **3 nguồn/câu**, **2 nguồn đồng thời/câu**, **32 KiB/nguồn**, **64 KiB/câu**, **8 giây ngân sách đọc**. 4 slot SQL dùng chung với giai đoạn 2; 2 lượt Admin toàn hệ thống, mỗi staff tối đa 1 lượt đang chạy, rate 10 câu mới/phút/staff. Công cụ mới bắt buộc lease, không fallback RPC không kiểm soát.
- SQL timeout 5 giây, lock timeout 1 giây, dùng mẫu truy vấn cố định và tham số. Đếm chính xác có thể đọc nhiều bản ghi trong database; giới hạn byte không phải giới hạn chi phí scan. Khi bận/timeout/vượt byte: trả lỗi theo contract, không giả số 0 hoặc tự tăng ngân sách. Không thêm realtime/polling/cache, không gọi nguồn khi chỉ mở panel.
- Không thêm Redis/Upstash. Giới hạn trước Auth, các đường ngoài pool và kiểm chứng hosting/Production vẫn theo Gate 2; chưa có bằng chứng hệ thống không thể quá tải ở mọi tải.

## Kiểm chứng

- `node --test scripts/test/chat_stage3.test.cjs scripts/test/chat_read_tools.test.cjs scripts/test/chat_read_api_budget.test.cjs scripts/test/chat_read_admission_api.test.cjs scripts/test/chat_public_owner.test.cjs`: 30 test đạt.
- `node scripts/test/admin_copilot_business.cjs`: 40 ca định tuyến/nghiệp vụ và các kiểm tra API hồi quy đạt. Kỳ vọng lịch tuần được cập nhật thành công cụ mới.
- `node scripts/test/chat_read_contract_ui.cjs`: Chrome thật với transport offline; ngữ cảnh khách và 8 đích tiếp tục hợp lệ hiển thị; URL tùy ý bị chặn.
- `node scripts/test/chat_stage3_local.cjs --local-fixtures`: 10 nhóm kiểm tra thật trên clone local, xem [kết quả](local-results.txt). Có Auth/JWT/PostgREST và handler API thật; không gọi AI/Cloud.
- Oracle có dữ liệu: chủ–thú cưng; thanh toán 100, hai hoàn 20 và 30 cho kết quả thu 100/hoàn 50/chênh 50, một yêu cầu chờ; đơn cũ vẫn có trong tồn đọng; lịch chiều nhận 12h, loại 18h và ca đã phân công; 12 nhân viên chia 10+2 dòng, không trùng. Kiểm tra sai quyền/lease, công cụ/filter ngoài danh sách, trần byte, 4 slot, timeout SQL thật, rollback/reapply.
- Clone áp phụ thuộc `091_admin_sales_order_page.sql` (hàm chuẩn hóa tìm kiếm) và 136/141/145, ngoài 9 migration của setup. Dữ liệu nghiệm thu chỉ nằm trong clone có marker sở hữu; không đưa fixture vào runtime.

Đóng G3.1–G3.3 và G3.5 trong danh mục local trên. **G3.4 còn mở** cho ma trận chi tiết đầy đủ theo từng phân hệ: phân trang các công cụ cũ, các bộ lọc chuyên sâu còn thiếu, hướng dẫn/soạn nháp theo từng nhóm có nguồn đủ và kiểm chứng model thật. Không tính các phần này là đã làm chỉ vì có câu trả lời tổng quát. Chưa chuyển giai đoạn 4 hoặc phát hành Production.
