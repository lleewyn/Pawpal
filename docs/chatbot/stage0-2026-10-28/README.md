# Giai đoạn 0 — Baseline chatbot Admin và khách hàng

Ngày kiểm tra: 28/10/2026, giờ Việt Nam. Trạng thái: **Đủ baseline và ngân sách thiết kế để bắt đầu giai đoạn 1 ở nhóm nền tảng đã khảo sát. Chưa nghiệm thu năng lực mới hoặc khả năng chịu tải Production.**

**Cập nhật mới nhất:** Đã kiểm tra transcript có chủ sở hữu cho guest/thành viên bằng Auth, API và widget thật trên bản test local; đo 20 lượt đọc với 2 tác vụ đồng thời; đọc một snapshot kết nối Cloud; dọn toàn bộ DB/container/credential của môi trường test riêng. Xem [kết quả local và ngân sách](local-baseline-and-budget.md).

## 1. Kết quả chính

- Local: nhánh `feat/guest-admin-identity`, HEAD `6d609cba3d28f1b03b5af09f3746e693ae85bae6`.
- GitHub metadata: deployment Production thành công, SHA `1defebeacd7f2f606293ae28e1ff8078cf6090d0`, tạo lúc 27/10/2026 15:53:14 giờ Việt Nam.
- Đã GET ba tài nguyên trên alias `https://pawpalgr3.vercel.app`: `components/fab/fab.js` khớp local; `chatbot.js` và `tab-chatbot-copilot.js` khác local. Cả ba khớp nội dung commit deployment nói trên.
- `GET /api/admin-chat` chưa đăng nhập trả 401. Chưa xác nhận fingerprint mã API server đang triển khai; 401 chỉ chứng minh đường xác thực từ chối yêu cầu không đăng nhập.
- Cloud `cpzuvaplseielhgcnqrn.supabase.co`: tìm thấy đủ 34 tên hàm phụ thuộc được trích từ nguồn và bổ sung theo phạm vi audit; kiểm kê cột 34 bảng. Không có tên hàm nào trong danh sách bị thiếu. Đây không phải tuyên bố tất cả năng lực đích đã có backend.
- Đã đọc grants, RLS/policy, CHECK, index, trigger, publication theo đúng danh sách bảng. Tất cả trong transaction chỉ đọc, statement timeout 5 giây, lock timeout 1 giây; không đọc Logs.
- Rule đang bật: `direct_request`, 300 giây, không đặt `auto_assign_role`. Có trigger SLA, bộ đếm không hiểu và RPC mở rộng; snapshot ghi signature/hash để đối chiếu lại.
- Ba mẫu facts Cloud đều khớp SQL oracle; không xuất tên/ID/nội dung khách. Test offline active và hai bài UI cache/Realtime đều đạt.
- **Lượt bổ sung:** đã đo 11 bước UI đọc với JWT QA/Cloud thật và guest chưa có hội thoại; 23 request dữ liệu đều 200. Đã đo thêm 5 GET handler local và 5 GET Production có JWT, payload đọc giống nhau; nội bộ handler local có 3 lượt Auth/DB cho mỗi GET. Xem [baseline có xác thực](authenticated-baseline.md).
- Đã lưu snapshot hiện có vào backup riêng bền vững ngoài webroot tại `D:/Aboutme/Pawpal-infra/supabase-local/backups/chatbot-stage0-20261028`, kiểm chứng hash; biên nhận trong `archive-receipt.txt`.

## 2. Hồ sơ đầu ra

| Tệp | Nội dung |
|---|---|
| `inventory.txt` | SHA/hash nguồn, deployment/assets, metadata DB, quyền thực thi và cấu hình rule |
| `read-samples.txt` | Ba mẫu SQL đọc thật, tổng/dòng/bytes/thời gian và đối chiếu oracle |
| `routes-permissions.md` | Route active, nguồn dữ liệu, quyền và sai khác tài liệu |
| `capabilities.md` | Năng lực ưu tiên, phân biệt Admin/guest/thành viên và nguồn cần triển khai |
| `question-set.md` | Bộ câu hỏi nghiệm thu ban đầu, chưa tuyên bố đạt toàn bộ |
| `resource-baseline.md` | Chi phí nhìn từ nguồn, số đo có thật, ngân sách tạm và phần chưa đo |
| `verification.md` | Lệnh đã chạy, kết quả, giới hạn và khả năng khôi phục |
| `authenticated-baseline.md` | Kết quả cold/warm, ngữ cảnh, idle, API JWT và ngân sách nhóm đọc |
| `authenticated-reads.txt` | Trace tổng hợp 11 bước UI; không có body/token/PII |
| `api-read-baseline.txt` | 10 mẫu GET, chi phí fetch nội bộ local và hash so sánh nguồn deployment |
| `archive-receipt.txt` | Đường dẫn và hash snapshot đã lưu bền vững ngoài webroot |
| `local-baseline-and-budget.md` | Transcript có chủ sở hữu, workload local, snapshot pool, ngân sách và điều kiện chuyển tiếp |
| `local-transcript-baseline.txt` | Bằng chứng API/widget guest và thành viên, phân trang/quyền/revision và 20 mẫu đồng thời |
| `local-environment.txt` | Danh tính DB/container test, migration và xác minh đã dọn, giữ nguyên DB nguồn |
| `pool-snapshot.txt` | Một snapshot tổng hợp kết nối Cloud, không query text hoặc Logs |

Tệp metadata và bộ câu hỏi chỉ dùng cho kiểm kê/kiểm thử, không được nạp làm dữ liệu nghiệp vụ chatbot.

## 3. Các phát hiện cần giữ làm đầu vào giai đoạn 1–2

| Mã | Phát hiện | Xử lý tiếp theo |
|---|---|---|
| G0-F01 | Frontend Admin local và Production khác nhau | Test và báo cáo tách theo SHA; chuẩn bị kiểm tra tương thích trước phát hành, không tự push/deploy |
| G0-F02 | Tài liệu 16/10 ghi cảm xúc 1–5; CHECK Cloud hiện chỉ yêu cầu `sentiment_level >= 0`, RPC gateway kiểm tra 1–6 | Dùng hợp đồng active làm baseline; kiểm thử giá trị sai ở server, không chạy lại migration cũ hoặc tự clamp theo tài liệu |
| G0-F03 | Inbox có 1 RPC và tối đa 3 lượt enrich khách; cache trang không đồng nghĩa cache cả enrich | Đo đầy đủ cold/warm với ca thành viên; không công bố “một request khi mở inbox” |
| G0-F04 | Hồ sơ ca thành viên đọc 6 nguồn, pet query chưa có giới hạn dòng; câu mẫu tải tuần tự hết các trang 500 | Đặt ngân sách và phân trang/tìm kiếm có phạm vi trước mở rộng |
| G0-F05 | Chat khách polling 10 giây khi mở; mỗi lần vẫn xác thực/kiểm tra chủ sở hữu dù revision không đổi | Giảm tải theo thiết kế mục 17; không mở quyền bảng cho guest để có Realtime |
| G0-F06 | FAQ khách tối đa 500 mục/lượt, moderation dùng `select('*')`, giới hạn theo số dòng nhưng chưa giới hạn bytes | Đưa vào giai đoạn 5 và nền tảng công cụ có ngân sách |
| G0-F07 | Timeout AI có `Promise.race`, hạn mức theo Map từng tiến trình | Chưa chứng minh dừng tác vụ DB hoặc hạn mức dùng chung; không suy ra chống quá tải toàn hệ thống |
| G0-F08 | RPC facts hỗ trợ ngày tối đa 32 ngày ở một số nhánh; kế hoạch mới đặt ngân sách 31 ngày | Chốt hợp đồng trước giai đoạn 2; chưa sửa ngầm giới hạn hiện tại |
| G0-F09 | Một trang session trả UI 659 byte nhưng handler local nhận tổng 7.238 byte/3 lượt Auth-DB | Tính budget cả hai chặng; không dùng response UI để ước tính tải DB |
| G0-F10 | Commit deployment chưa có `chat_understanding.js`; ba tệp API/auth/copilot khác local | GET giống payload không chứng minh nhánh AI/POST mới đã được triển khai |
| G0-F11 | Transcript thành viên revision chỉ trả 100 byte nhưng có 3 fetch Auth/DB và 1.799 byte nội bộ trên fixture local | Tối ưu cả lượt xác thực/ownership có kiểm soát; không bỏ quyền để giảm tải |
| G0-F12 | Trần 30 tin không bảo đảm bytes khi tin dài; fixture ngắn mới khoảng 4,8 KB | Bổ sung byte budget và phân trang thích ứng, không cắt nội dung âm thầm |

## 4. Tiến độ và điều kiện còn thiếu

| Hạng mục | Trạng thái |
|---|---|
| G0.1 — route/schema/quyền/deploy | Đủ baseline nhóm chuẩn bị sửa: metadata Cloud + ba asset + GET JWT + so sánh nguồn deployment. Runtime marker giữ ở giai đoạn phát hành; full ma trận quyền/ghi giữ ở giai đoạn 1 |
| G0.2 — ma trận và năng lực ưu tiên | Đã lập ma trận ba đối tượng; người dùng xác nhận tất cả nhóm Admin thuộc phạm vi bắt buộc. A01–A19 đều được giữ, thứ tự chỉ theo phụ thuộc kỹ thuật |
| G0.3 — ví dụ/nguồn/quyền/phép tính/tiếp tục | Có danh mục A01–A19/G01–G06/M01–M06 và bộ 56 tình huống; nguồn core đã đối chiếu. Công cụ mới phải review hợp đồng chi tiết trước triển khai, không dùng phạm vi đích làm quyền thực thi |
| G0.4 — test/baseline/rollback | Có baseline Cloud/UI/API, transcript guest/member thật trên test, workload local 2 tác vụ, trần thiết kế và backup bền vững; fixture local đã dọn |

**Gate 0 đạt để bắt đầu sửa nền tảng đã khảo sát:** đã có fixture/danh tính riêng, baseline đo thật và ngân sách thiết kế. Đây là đóng bước chuẩn bị, không phải chứng nhận công suất Production: giới hạn thiết kế khởi điểm là 2 tác vụ nặng đồng thời, tối đa 4 fetch Auth/DB được kiểm soát; cơ chế cưỡng chế dùng chung và đường đọc client trực tiếp chưa được triển khai. Không đánh dấu DB16 hoặc khả năng phục vụ nhiều phiên Production đã đạt.

Các điều kiện chuyển tiếp giữ nguyên trong giai đoạn liên quan: ma trận quyền/ghi/concurrency và gửi/chuyển/đóng hai UI ở giai đoạn 1; enforcement công cụ/budget ở giai đoạn 2; workload/headroom/SLO đủ đại diện ở giai đoạn 7; runtime marker và đối chiếu bản triển khai ở giai đoạn 8. Không chuyển các mục này thành PASS từ baseline đọc. Giai đoạn 1 chưa bắt đầu trong lượt này.
