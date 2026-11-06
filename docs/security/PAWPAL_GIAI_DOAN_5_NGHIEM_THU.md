# Giai đoạn 5 — Nghiệm thu phân quyền

Bắt đầu và hoàn tất ngày 06/11/2026 trên CSDL local có marker sở hữu; không ghi Cloud hoặc truy vấn Logs Cloud. **314 nhóm nghiệp vụ tích hợp PASS, 14 nhóm riêng PASS, 375 bài Node PASS; có bằng chứng đủ 30/30 PQ.** Giai đoạn 4 đã push tại `36c602c0`; hai sửa đổi và bằng chứng giai đoạn 5 thuộc đợt commit/push sau khi hoàn thành giai đoạn 6, theo yêu cầu người dùng ngày 06/11/2026.

Cập nhật sau nghiệm thu: [giai đoạn 6](PAWPAL_GIAI_DOAN_6_CHUYEN_DOI.md) đã chuyển đổi Cloud ngày 06/11/2026, bổ sung điều kiện tiên quyết 187 cho dữ liệu trạng thái legacy. Các đoạn “chưa chuyển Cloud” bên dưới ghi trạng thái tại thời điểm chốt giai đoạn 5.

## Phạm vi và cách chạy

- `PAWPAL_PHASE5_ACCEPTANCE=1 node scripts/test/admin_access_phase3_ui.cjs`: chạy lại toàn bộ nghiệp vụ trình duyệt cũ với Auth/PostgREST thật và schema cập nhật đến migration 186, thay vì chỉ kiểm tra schema đến 176. Cuối lượt chạy các trường hợp quản trị/khách hàng bổ sung và rollback theo thứ tự ngược trước khi dọn bản sao.
- `PAWPAL_PHASE5_BOUNDARIES=1 node scripts/test/admin_access_phase3_ui.cjs`: cô lập các trường hợp cấp tài khoản, Quản lý kho/hoàn tiền/phân công/bồi hoàn/cấu hình, cạnh tranh hạ quyền, phiên khách và đặt lịch để điều tra lỗi nhanh hơn. Không dùng kết quả của bộ nhỏ thay cho toàn bộ nghiệm thu.
- Báo cáo riêng tại `phase5/full/ui-results.txt` và `phase5/boundaries/ui-results.txt`. Lượt không có `status: PASS` là kết quả chưa đạt, không đánh dấu nghiệm thu theo số nhóm đã chạy qua.
- Schema giai đoạn 5 gồm 165–186; Realtime/payload và PQ-19 đến PQ-25 đã có bộ đầu cuối riêng ở giai đoạn 4. Bộ nghiệp vụ đầy đủ ở giai đoạn 5 không giả lập Realtime thành công; transport đầu cuối thuộc bộ riêng đó.

## Lỗi phát hiện qua nghiệm thu

### Cấp tài khoản thiếu SĐT tại INSERT

Luồng `create_admin_staff_profile` chèn staff với tên/chức danh, sau đó mới gọi `save_admin_staff_profile` để bổ sung liên hệ. Migration 129 đã yêu cầu số điện thoại ngay tại INSERT, nên cấp tài khoản mới bị từ chối `invalid_staff_phone` mặc dù API nhận SĐT hợp lệ. Kiểm tra chọn vai trò cho hồ sơ đã tồn tại không phát hiện lỗi này.

Migration 185 sửa đúng hàm tạo hồ sơ: chèn `phone_number` từ chi tiết đã xác minh ngay bước đầu, giữ kiểm tra bắt buộc/định dạng/trùng SĐT của CSDL. Không nới trigger hoặc quy tắc Auth. Lượt kiểm tra riêng đã qua cấp tài khoản bằng handler thật, đăng nhập GoTrue, bắt buộc đổi mật khẩu lần đầu và đăng nhập lại với bộ quyền STAFF cố định, không có quyền riêng.

### Bộ chọn người nhận phân công bỏ sót STAFF

`get_admin_chat_handlers` và `get_admin_complaint_handlers` chỉ tìm người nhận có quyền quản trị bảng cũ. STAFF mới chỉ có quyền công việc tương ứng nên không xuất hiện trong danh sách chuyển/phân công của Quản lý. API chuyển hội thoại hợp lệ bị chặn `chat_handler_unavailable`.

Migration 186 nhận diện thêm `work.chat.handle` và `work.complaint.handle` trong bộ lọc quyền vai trò của người nhận. Giữ điều kiện người gọi là quản trị có quyền, tài khoản người nhận hoạt động/không bị khóa/đã đổi mật khẩu, và mọi kiểm tra nghiệp vụ chuyển giao. Không cấp cho STAFF quyền quản trị hội thoại hoặc khiếu nại. Lượt kiểm tra riêng đã qua Quản lý chuyển hội thoại sang STAFF và phê duyệt đề xuất hoàn tiền; STAFF vẫn bị chặn cả hai thao tác quản trị.

## Tình trạng bằng chứng

Lượt đầy đủ đầu tiên dừng tại một kiểm tra so sánh số tiền dạng text (`20000.0000` so với `20000`); bộ kiểm tra được sửa để so sánh số. Các lượt riêng sau đó phát hiện hai lỗi sản phẩm bên trên, cấu hình giờ mở cửa thiếu trong fixture, và bộ kiểm tra được hoàn thiện trước khi chạy lại toàn bộ. Không sử dụng lượt dừng giữa chừng làm bằng chứng toàn bộ 30 PQ đạt.

Bộ Node mở rộng hiện đạt 375 bài, gồm 357 bài chatbot/phân quyền và 18 bài hồi quy đọc/đổi/hủy lịch, danh tính khách hàng và bộ lọc Realtime. Đây là kiểm tra offline cấp mã; không thay thế các kiểm tra CSDL/Auth/trình duyệt.

## Kết quả chốt

| Bộ kiểm tra | Kết quả | Bằng chứng |
|---|---|---|
| Nghiệp vụ đầy đủ với schema 165–186; Auth/REST/trình duyệt thật; cuối lượt gồm các ca quản trị/khách hàng bổ sung và rollback | 314 nhóm PASS | `phase5/full/ui-results.txt` |
| Bộ riêng: cấp tài khoản/đổi mật khẩu lần đầu; kho/thu/hoàn; phân công/bồi hoàn; cấu hình; Quản lý cuối cùng/đồng thời; phiên khách; booking khách; offline | 14 nhóm PASS | `phase5/boundaries/ui-results.txt` |
| Node phân quyền/chatbot và hồi quy khách hàng | 375 bài PASS | `phase5/unit-results.txt` |
| Đối chiếu PQ-01 đến PQ-30 với nhóm kiểm tra cụ thể | 30/30 PASS | `phase5/PQ_MATRIX.md`, `phase5/pq-results.txt` |

314 nhóm đã gồm các ca của bộ riêng; không cộng 14 thành các kịch bản khác nhau. Các ca PQ-19 đến PQ-25 dùng thêm bằng chứng bộ 45 nhóm Realtime/Auth/UI đã đạt ở giai đoạn 4; công cụ lập ma trận đọc lại báo cáo PASS, trạng thái dọn CSDL và toàn bộ mã băm nguồn liên quan. Không giả vờ rằng bộ nghiệp vụ đầy đủ chạy lại transport Realtime thành công, vì chế độ này chỉ chạy real Auth/PostgREST/trình duyệt và publication/schema đầy đủ. Payload WebSocket thật được kiểm tra ở bộ riêng giai đoạn 4.

Khách hàng thật được tạo ở GoTrue local, liên kết hồ sơ khách trong bản sao và đăng nhập bằng mật khẩu. Khách tiếp tục đọc đúng hồ sơ của mình; không dùng được workspace hoặc quản trị tài khoản. Anonymous đọc được danh mục dịch vụ nhưng bị chặn RPC công vụ. Availability và quote xác định giá từ CSDL thật, tạo lịch Hotel thật cho đúng chủ sở hữu và retry không tạo lịch/audit trùng. SĐT, giờ mở cửa và cấu hình booking đều được đưa qua các ràng buộc hiện có, không tắt trigger hoặc nới quyền để qua kiểm thử.

Hai Quản lý gọi đồng thời các RPC hạ quyền qua HTTP: chỉ một yêu cầu thành công, vẫn còn đúng một Quản lý hoạt động. Thử hạ hoặc tạm ngừng người cuối cùng bị chặn. Hai phiên dùng cùng version cũ không thể ghi đè vai trò. Nhân viên không sửa/xóa audit vai trò bằng HTTP. Các ca kho, hoàn tiền, chuyển hội thoại, phê duyệt đề xuất và cấu hình đều có kiểm tra thành công cho ADMIN, bị chặn cho STAFF và dữ liệu không thay đổi ở nhánh bị chặn.

Chế độ đầy đủ chạy rollback 186 → 177 rồi 176 → 166, các kiểm tra phục hồi định nghĩa/hàm trước đó đều đạt. Hai báo cáo giai đoạn 5 có mã băm nguồn khớp và `disposableDatabaseRemoved: true`. Đã kiểm tra không còn CSDL/container `pawpal_access_ui_*` hoặc các file cấu hình bí mật tạm của harness. Đã xem ảnh thu ngân máy tính và quản lý/nhân viên điện thoại, không thay đổi các modal đã nghiệm thu.

### Giới hạn và chuyển đổi

- PQ-17 tệp: baseline Storage từng rà soát không có bucket/policy hoặc tệp quản trị để tải. Không tạo tệp giả hay tuyên bố kiểm thử tải tệp nhị phân; JSON/CSV và in phiếu đã kiểm tra. Giai đoạn 6 phải kiểm tra lại metadata Storage thực tế trước triển khai.
- Provider AI được thay offline trong các bộ quyền/thu hồi nguồn. Không gọi Gemini, không khẳng định đã kiểm thử provider thực hoặc chất lượng mọi câu trả lời.
- Các kiểm tra trực quan dùng Chrome headless với ảnh desktop/mobile; nhánh visibility ở bộ Realtime giai đoạn 4 có điều khiển thuộc tính ẩn và đã ghi rõ trong báo cáo.
- Các báo cáo giai đoạn trước được dùng đúng phạm vi, không cộng chúng thành số bài mới. Bài browser standalone có fixture cũ `chat_inbox_states.test.cjs` không thuộc bộ Node 375.

Giai đoạn 5 hoàn tất nghiệm thu local trong phạm vi trên. Migration 185–186, harness và báo cáo mới đang local; chưa commit/push hoặc chuyển đổi hệ thống thật. Giai đoạn 6 chưa bắt đầu.

Giữ nguyên thay đổi hotline/Zalo riêng trong `components/fab/fab.html`. Chỉ push khi người dùng yêu cầu rõ ràng. Chưa bắt đầu giai đoạn 6 hoặc áp dụng migration mới lên Cloud.
