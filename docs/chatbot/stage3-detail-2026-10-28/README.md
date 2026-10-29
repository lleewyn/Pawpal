# G3.4 — Phân trang và nguồn dữ liệu cho hướng dẫn, soạn nháp

Trạng thái: đạt bộ kiểm chứng local cho phần bổ sung dưới đây. Migration146 có rollback; chưa áp Cloud hoặc push. Gate 2 vẫn mở. Không chứng nhận chất lượng model thật.

**Cập nhật:** [Đợt147–148](../stage3-parts-2026-10-28/README.md) đã thêm đọc bài viết/đánh giá theo phần, phiên bản và từng trang mức giá con. Các giới hạn về ma trận con chưa phân trang bên dưới mô tả mốc146, không phải trạng thái mới nhất.

## Phần đã làm

1. Tám công cụ cũ `appointment.list`, `inventory.low_stock`, `ticket.open`, `customer.lookup`, `order.lookup`, `catalog.product`, `catalog.service`, `catalog.service_price` có phân trang thật tại SQL: 10 dòng/trang, tổng theo cùng điều kiện và quyền, thứ tự ổn định, trang vượt tổng về trang cuối. Gateway và tên intent giữ nguyên; không tải toàn bộ rồi chia trang trên ứng dụng.
2. Hỏi đầy đủ kèm `trang 2`, hoặc hỏi tiếp `trang 2` khi lịch sử còn câu truy vấn phù hợp. Bỏ phần số trang khỏi từ khóa tìm kiếm. Nếu thiếu lịch sử thì yêu cầu nhắc lại; không dùng câu hỏi khác để suy đoán nguồn. Chưa cung cấp snapshot bất biến giữa các trang khi dữ liệu đang thay đổi.
3. Nguồn dữ liệu cho bản nháp/hướng dẫn được định tuyến bằng bộ công cụ cố định hiện có. Ví dụ: `Soạn tin về đơn hàng: ORD-001`, `Soạn thông báo Pawpoint: CUS-001`, `Soạn thông báo lịch trực tuần này`, `Hướng dẫn xử lý đơn hàng: ORD-001`. Không lấy tên RPC hoặc SQL từ câu hỏi/model.
4. Thiếu mã/ngày cần thiết thì hỏi lại; thiếu quyền hoặc lỗi nguồn thì không sinh bản nháp. Không có đối tượng hoặc nhiều kết quả ở công cụ cần xác định một khách/đơn/thú cưng thì yêu cầu kiểm tra mã. Không lấy đối tượng đầu tiên làm kết quả duy nhất. Số thu 0 vẫn là dữ liệu hợp lệ khi có hoàn tiền; không bỏ số hoàn vì không có lần thu trong kỳ.
5. Đưa facts đã kiểm tra vào ngữ cảnh model, ghi nguồn/thời điểm và nhãn cần kiểm tra. Hướng dẫn tiếp tục yêu cầu FAQ đang bật phù hợp. Thiếu FAQ không sinh quy trình giả. Chưa gọi model bên ngoài trong bộ nghiệm thu.

| Nhóm | Chi tiết/tìm/lọc đang hỗ trợ | Nguồn cho hướng dẫn và nháp |
|---|---|---|
| A — Khách, thú cưng, đơn, lịch, khiếu nại, hội thoại | Mã/tên/điện thoại theo từng công cụ; trạng thái, ngày/buổi/phân công cho lịch; thu/hoàn theo đơn; xem trang tiếp theo | Facts trong quyền của staff; FAQ được bật cho hướng dẫn; hội thoại tối đa 12 tin khi ngân sách cho phép |
| B — Sản phẩm, kho, dịch vụ, điểm, ưu đãi | SKU/tên, tồn dưới ngưỡng, bảng giá theo nhóm, tổng sổ điểm, danh mục ưu đãi hiện hành | Facts theo công cụ tương ứng; không tự suy ra đủ điều kiện dùng ưu đãi hoặc báo giá lịch cụ thể |
| C — Nhân sự, báo cáo, nội dung, cấu hình | Tên/trạng thái nhân sự, ca giao với kỳ, chỉ số vận hành, tiêu đề bài viết, đoạn đánh giá, 9 cấu hình cho phép | Facts đã lọc; không lấy lương, tài khoản ngân hàng, khóa hoặc ghi chú cá nhân làm ngữ cảnh |

## Điều kiện tài nguyên

- Một trang vẫn là một lượt đọc nguồn. SQL tính tổng một lần trong CTE `page_bounds` và tái sử dụng để chọn trang; không thêm RPC đếm riêng. Không materialize toàn bộ bản ghi kèm thông tin con chỉ để đếm.
- Giữ 32 KiB/nguồn, 64 KiB/câu, 3 nguồn/câu, 2 nguồn đồng thời và pool4/lease/rate của giai đoạn 2. SQL timeout5s/lock1s. Không thêm polling, listener hoặc dịch vụ bên ngoài.
- Bản nháp qua API đã có một lượt lịch sử riêng tư; thêm facts thành hai lượt đọc trong kiểm tra thật. Hướng dẫn có lịch sử + facts + FAQ dùng đủ ba lượt. Nếu cần đối chiếu cả hội thoại mà vượt ngân sách, bỏ phần đối chiếu hội thoại và nêu giới hạn; không tăng ngân sách ngầm. Bản nháp có thể bỏ lượt FAQ tùy chọn và ghi chưa đối chiếu chính sách.
- Giá dịch vụ mới phân trang **dịch vụ cha**. Một ma trận giá của một dịch vụ vẫn phải nằm trong byte/timeout cho phép; chưa có phân trang từng dòng ma trận. Không âm thầm cắt các mức giá để đưa ra báo giá sai.
- Đếm chính xác có thể scan nhiều dòng trong database; giới hạn byte không chứng minh mọi truy vấn đều rẻ. Giữ timeout và trả lỗi rõ ràng khi vượt trần. Các đường ngoài pool/ingress trước Auth còn theo Gate 2.

## Kiểm chứng

- 36 test offline trong bộ hồi quy và `chat_stage3_detail.test.cjs`: quyền, số nguồn, phân trang, nháp các nhóm A/B/C, thiếu/mơ hồ đối tượng, lỗi nguồn, FAQ và trường hợp chỉ có hoàn tiền. Bao gồm kiểm tra giữ trần ba nguồn khi lịch sử đã đọc.
- `admin_copilot_business.cjs`: 40 ca định tuyến/nghiệp vụ và các kiểm tra Auth/API hợp đồng đạt.
- `chat_read_contract_ui.cjs`: trình duyệt Chrome thật với transport offline, giữ ngữ cảnh và các đích tiếp tục trong allowlist, chặn URL tùy ý.
- `node scripts/test/chat_stage3_local.cjs --local-fixtures --detail-fixtures --evidence-dir docs/chatbot/stage3-detail-2026-10-28`: 15 nhóm kiểm tra thực đạt, xem [kết quả](local-results.txt). Có Auth/JWT/PostgREST/handler API thật; phần sinh nháp thay bằng transport kiểm tra để không gọi model/Cloud.
- Tám công cụ cũ đều chạy trang1/trang2, đối chiếu tổng/không trùng định danh khi có nhiều trang, từ chối trang10001 và sai quyền. Giữ toàn bộ oracle thú cưng/thu-hoàn/ranh giới buổi/phân trang/tải bận/timeout/rollback của giai đoạn3 trước.
- Clone áp thêm phụ thuộc `099_product_catalog_final.sql`: cột product_code/catalog_retired thuộc migration này; không tạo schema giả riêng cho công cụ. Rollback146 khôi phục gateway136, không ghi đè acquire/rate141.

## Phần G3.4 còn lại

Chưa đóng toàn bộ G3.4: còn phân trang nội dung/ma trận giá dài theo từng đối tượng và mở rộng các bộ lọc chuyên sâu theo câu hỏi thực tế. Danh mục hiện có không đồng nghĩa mọi câu hỏi tùy ý đều có nguồn. Kiểm chứng chất lượng câu trả lời bằng model thật và quy trình/FAQ thực tế của từng nhóm vẫn chưa được thực hiện; không dùng kết quả transport để thay cho kiểm chứng này.

Khi phát hành phải áp đủ migration phụ thuộc trước phiên bản ứng dụng mới. Rollback SQL về trước146 cũng cần phiên bản ứng dụng phù hợp vì contract phân trang đã thay đổi. Chưa thực hiện phát hành trong đợt này.
