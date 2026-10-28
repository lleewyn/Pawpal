# Giai đoạn 1 — Quyền và transaction cạnh tranh phía server

Ngày 28/10/2026. Trạng thái: **10 nhóm SQL local đạt; giai đoạn 1 chưa hoàn tất.** Không có thay đổi backend/DB Cloud trong lượt này.

## Môi trường và phương pháp

Tạo bản test có ownership marker từ database phục hồi local hiện có; áp cùng 9 migration đã dùng ở giai đoạn 0 chỉ vào bản sao. Mọi fixture user/customer/staff/chat/audit/feedback/history nằm trong DB bản sao này. `local-environment.txt` lưu nguồn, marker, migration và biên nhận dọn; không có khóa/mật khẩu.

Harness `scripts/test/chat_stage1_local_concurrency.cjs` mở các kết nối PostgreSQL độc lập, bắt đầu transaction với SQL role/claims phù hợp, statement timeout 5 giây và lock timeout 3 giây. Các cặp cạnh tranh chạy qua `Promise.all`, trần thực tế đo được là 2 kết nối. Mỗi transaction thật sự COMMIT trên bản test để request khác quan sát được; không dùng hai thao tác tuần tự trong cùng transaction rồi gọi là cạnh tranh.

Đây là **kiểm thử body RPC, grants/RLS và claims SQL**, không phải Auth JWT qua HTTP, Realtime delivery hoặc hai giao diện. Hai container Auth/REST được môi trường test dựng sẵn nhưng harness SQL này không dùng chúng làm bằng chứng xác thực.

## Kết quả

| Nhóm | Bằng chứng được kiểm |
|---|---|
| 1. Quyền tiếp nhận | Customer và staff không có quyền chat bị từ chối nhận ca; customer không gọi được gateway service-only |
| 2. Hai người nhận ca | Hai request khác ID cùng revision chạy đồng thời: đúng một thành công, một PT409; ca có một người phụ trách |
| 3. Gửi trùng | Hai request cùng ID/nội dung đồng thời đều được xác nhận; DB có đúng một message và một audit. Payload khác cùng ID bị PT409; staff chưa nhận không gửi được |
| 4. Chuyển ca | Hai retry cùng ID chuyển đúng một lần, một message/audit; note riêng không xuất hiện trong public message. Người cũ bị chặn, người nhận mới gửi được |
| 5. Hoàn tất | Hai retry cùng ID đóng ca thành công; gửi sau đóng và đổi mode mở lại bị PT409 |
| 6. Lịch sử riêng | Staff B không đọc được session A; gọi xóa của B không làm mất hai dòng history A |
| 7. Chặn nguyên văn | Customer không SELECT được raw_content; staff không quyền không gọi được RPC raw |
| 8. Raw có audit | Actor hợp lệ đọc đúng nội dung raw/fallback và tăng đúng một audit CHAT_RAW_READ |
| 9. CSAT | Customer không gọi trực tiếp RPC service-only; hai retry giống nhau trả cùng ID và một feedback; đổi payload bị PT409 |
| 10. Nhân viên khóa | Sau ban Auth user local, giữ vai trò ADMIN vẫn không đọc được raw hoặc recent context |

Kết quả máy đọc: `concurrency-results.txt`. Harness không xuất message, danh tính hoặc UUID fixture vào báo cáo; chỉ ghi tên kiểm tra và trạng thái. Số statement trong báo cáo là số transaction qua harness, không phải số HTTP request hoặc tổng câu SQL nội bộ.

## Chênh lệch cần hiểu đúng

- `delete_admin_copilot_session` có thể thực hiện no-op với session của người khác và ghi audit thao tác, thay vì trả 403. Điều kiểm thử chứng minh là không đọc/xóa được nội dung của chủ khác; không khẳng định API luôn trả lỗi cho UUID không thuộc caller.
- Read raw hiện dùng hợp đồng role/quyền của bản RPC trong clone; test không tự thiết lập mô hình `chat.raw.read` mới theo tài liệu cũ. Chính sách vai trò và quyền đích cần đối chiếu nguồn Cloud hiện hành trước thay đổi.
- CSAT test gọi RPC service role sau khi ca đã đóng và có lời mời. Ownership khách ở API đã có bộ offline/local transcript khác; test SQL này không thay một lượt API feedback có JWT thật.
- Test giữ nguyên backend vì không tái hiện lỗi transaction trong các trường hợp đã chạy. Không thêm RPC, index, poll hoặc query production để làm cho test đạt.

## Dọn và chi phí

Sau chạy đạt, kiểm tra ownership marker DB và label/ID của cả hai container rồi dọn đúng các đối tượng đó. DB test không còn, DB nguồn còn nguyên; ba tệp credential tạm đã xóa. Bao gồm cả fixture từ lần chạy đầu 7 nhóm trước khi bổ sung đủ 10 nhóm, tất cả đều biến mất khi drop DB task-owned.

Không kết nối Cloud, không Logs, không Gemini, không dùng dữ liệu khách thật làm fixture. Không thay cấu hình database nguồn, không commit/push/deploy mã. Công cụ setup/cleanup chỉ được bổ sung tham số evidence directory có kiểm tra để không ghi đè hồ sơ giai đoạn 0.

## Phần chưa đóng

- Toàn chuỗi Auth/JWT thật + API + hai UI + Realtime cho nhận/gửi/chuyển/đóng/đánh giá.
- Retry ticket và liên kết đúng khách/giao dịch; điều chỉnh điểm, hạn mức/policy và ma trận quyền đầy đủ.
- XSS/prompt injection, minimization dữ liệu đưa AI và mọi trường hợp quyền trên bản chuẩn bị phát hành.
- Hồi quy 10 vòng ba tab, mọi modal, lỗi mạng và trạng thái kết thúc trên cả hai giao diện.

Các mục tổng hợp S01–S09/G1.1–G1.4 vẫn chưa đánh dấu hoàn tất. Bản sửa widget ở hai đợt trước đã có test offline riêng; lượt này bổ sung bằng chứng server mà không coi đã đủ nghiệm thu Production.
