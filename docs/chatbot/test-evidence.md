# Bằng chứng kiểm thử — 25/10/2026

Môi trường: Windows workspace Pawpal, nhánh `main`, nền SHA `d8bb56e918105865d38d01592e4255d480f65849` cộng các diff chưa commit. Người thực hiện: Codex. Không dùng Supabase Logs.

| Kiểm tra | Kỳ vọng | Kết quả |
|---|---|---|
| `admin_copilot_business.cjs` | Hiểu 40 câu/ngày/phạm vi; metric không gọi model/history; tổng độc lập số dòng; lỗi quyền rõ | PASS offline |
| `chatbot_business_ui.cjs` | Không chọn ca ngầm; init 10 lần không lặp handler; đổi ca khi tặng điểm không ghi; 503 giữ draft/requestId; không lịch sử giả | PASS Playwright, API/DB giả lập |
| `admin_chatbot_paging_cache_ui.cjs` | Phân trang phiên/tin, cache rules, request theo actor | PASS offline |
| `admin_chat_realtime_egress_ui.cjs` | Realtime và dữ liệu nhận có giới hạn | PASS offline |
| `admin_copilot_facts_rollback.sql` | Tồn thấp nghiêm ngặt; tổng 25 và list 20; không đếm đôi lịch có hai dịch vụ; mốc nửa đêm VN; chặn thiếu quyền | PASS trên Cloud trong savepoint hoàn tác |
| Context lịch sử | Chỉ 6 tin của caller, tối đa 1.200 ký tự; không nhận tin người khác cùng session | PASS SQL hoàn tác |
| `chat_points_context_rollback.sql` | Phiên bản cũ/actor sai/quá hạn mức/cần duyệt bị chặn; retry chỉ cộng một lần; đổi payload conflict | PASS SQL hoàn tác |
| Context ca | 13 tin nguồn chỉ trả 12, mỗi tin tối đa 800 ký tự; không raw_content | PASS SQL hoàn tác |
| Grants | anon không execute, authenticated có execute; bên trong vẫn kiểm tra quyền | PASS cả 4 RPC |
| Cú pháp và diff | JS hợp lệ, không lỗi whitespace | PASS; cảnh báo CRLF không phải lỗi |

Các fixture Cloud dùng user/staff/khách và giao dịch tổng hợp trong transaction; hoàn tác trước khi commit định nghĩa hàm. Không giữ khách giả hoặc điểm test trong dữ liệu nghiệp vụ.

## Đối chiếu dữ liệu thật chỉ đọc

Actor ADMIN hiện hữu được mô phỏng JWT trong transaction chỉ đọc để kiểm tra quyền DB; không dùng bypass service role cho truy vấn facts. SQL oracle độc lập so với JSON RPC. Không xuất nội dung cá nhân.

| Ý định | Tổng | Số dòng | Bytes JSON nguồn | Thời gian đo |
|---|---:|---:|---:|---:|
| SKU dưới ngưỡng | 0 | 0 | 266 | 527 ms |
| Lịch Spa chờ phục vụ ngày 25/10/2026 | 2 | 2 | 625 | 522 ms |
| Khiếu nại chưa kết thúc | 21 | 20 | 4.250 | 533 ms |

Cả ba khớp oracle tại thời điểm kiểm tra. Thời gian gồm vòng truy vấn kiểm tra trên máy hiện tại; không phải latency API hoặc p95. Bytes chỉ là JSON nguồn, không phải tổng egress Supabase hay toàn bộ response HTTP.

Bằng chứng máy đọc: [cloud-oracles.txt](../verification/chatbot-business/cloud-oracles.txt). Ảnh [copilot.png](../verification/chatbot-business/copilot.png) dùng phản hồi giả lập để chứng minh UI, không phải dữ liệu Cloud.

Lần áp dụng 4 RPC: COMMITTED; SHA256 của migration 101: `aaf89f8870b36066bfb92e8838e4cbb5ee71a7cf9d68e2c9b128dc1f5bc4fc0f`. Báo cáo riêng nằm trong `%TEMP%/pawpal-copilot-business-1792920118681/verification.private.txt`.

Chưa kiểm thử: model Gemini thật, toàn bộ 30 kịch bản, hai nhân viên cạnh tranh nhận ca, raw audit end-to-end, mọi CRUD Rules và tải đồng thời. Các mục này không được coi là PASS từ bằng chứng offline trên.
