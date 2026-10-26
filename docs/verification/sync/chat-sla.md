# SLA khi khách yêu cầu nhân viên — 26/10/2026

**SLA-01 / P1:** đã tái hiện trên RPC Cloud: thêm rule `direct_request` đang bật trong fixture rồi yêu cầu nhân viên, nhưng `sla_deadline` vẫn NULL. Hàm handoff hiện tại chỉ đổi trạng thái, không đọc bảng rule. Rule Cloud thực tế đang rỗng ở lượt kiểm tra chỉ đọc; không tự tạo cấu hình nghiệp vụ để che lỗi.

**Migration 109 đã áp dụng lên Supabase Cloud ngày 26/10/2026**; xác minh trigger tồn tại, helper không callable bởi customer, gateway service_role được giữ nguyên. [Bằng chứng áp dụng](chat-sla-cloud-apply.txt). Không thay rule hoặc hội thoại hiện có, không thêm deadline mặc định. Sửa UI 0 giây vẫn ở local, chưa push/deploy.

## Bản sửa

- Trigger đặt SLA khi hội thoại bắt đầu `waiting_agent`. Phạm vi rule hỗ trợ là `trigger_type='direct_request'`, `is_active=true`; đây là đường khách bấm yêu cầu nhân viên hiện có.
- Nhiều rule cùng khớp: dùng SLA ngắn nhất. `sla_seconds=0` nghĩa là cần phản hồi ngay. Không có rule phù hợp thì deadline NULL và UI hiển thị chưa có hạn phản hồi.
- Retry khi vẫn chờ, tin nhắn tiếp theo và thay đổi rule không kéo dài/sửa deadline của lượt chờ hiện tại.
- Nhân viên tiếp nhận giữ deadline lịch sử; quay về bot bằng thao tác khách hoặc Admin đều xóa deadline cũ. Lượt yêu cầu nhân viên tiếp theo dùng cấu hình mới.
- Sửa local bảng rule: 0 giây được hiển thị `0 giây`, không còn biến thành dấu gạch ngang.
- Không tự phân công nhân viên từ `auto_assign_role`, không suy đoán điều kiện từ khóa/cảm xúc/ngưỡng. Các engine này chưa được nghiệm thu; không cộng gộp thành hoàn thành toàn bộ rule bàn giao.
- Một truy vấn rule nằm trong transaction chuyển trạng thái; không thêm query phía trình duyệt, channel hoặc polling.

## Kiểm chứng

- [13 kiểm tra Cloud/84 SQL PASS](chat-sla-cloud-rollback.txt). Gồm tái hiện lỗi trước migration, rule tắt/sai loại không được áp dụng, chọn SLA ngắn nhất, retry không kéo dài, sửa rule không đổi lượt cũ, followup không reset, quyền customer/guest, take/release, lượt chờ mới và SLA 0 giây.
- Một hội thoại, một khách, một staff và bốn rule tổng hợp trong cùng transaction; luôn rollback, xác minh không còn fixture. Migration DDL cũng rollback; không sửa rule thực tế, không gửi tin thật.
- 5 test hiển thị SLA PASS: thiếu/ngày sai, còn hạn/quá hạn, tiếp nhận/đóng, hạn tức thì và bảng rule 0 giây. Bộ hồi quy offline mở rộng **14 bài Chrome/87 test Node cùng Copilot/loyalty service PASS**. [Kết quả](offline-batch.txt).
- Không Logs, stress test hoặc đoán tổng egress production từ số SQL.

```text
node scripts/test/sync_chat_sla_cloud_rollback.cjs --cloud
node --test scripts/test/chat_sla_display.test.cjs
```

Mặc định script Cloud không kết nối nếu thiếu `--cloud`. Statement timeout 8 giây/lock timeout 3 giây. Không chạy lại chỉ để đổi tài liệu.

## Còn lại

Cấu hình rule `direct_request` thật theo thời gian nghiệp vụ mong muốn; phát hành UI local. Chưa nghiệm thu Auth/HTTP/commit/Realtime giữa khách và Admin, rule tự động theo từ khóa/cảm xúc hoặc phân công nhân viên. Thiếu cấu hình vẫn phải hiển thị trống đúng thực tế.

Lệnh áp dụng riêng: `node scripts/database/v1/apply_chat_sla_109.cjs --apply-cloud`.
# Cập nhật cấu hình 26/10/2026

Người dùng đã đồng ý hạn tiếp nhận **5 phút** cho “Gặp chuyên viên”. Đã bật rule `direct_request`, `sla_seconds=300`, `auto_assign_role=NULL`, ghi audit cấu hình trên Cloud. [Bằng chứng](chat-sla-5min-cloud.txt): yêu cầu tổng hợp mới có hạn 300 giây, retry giữ hạn; transaction test rollback sạch, tám hội thoại cũ giữ nguyên. Playwright MCP xác minh bảng rule Admin hiển thị “Khách yêu cầu gặp chuyên viên”, “300 giây”, “Hiệu lực”. Nhãn vai trò trên bảng không chứng minh tự phân công; cấu hình này không chọn nhân viên.

Script áp dụng có cờ rõ ràng `node scripts/database/v1/configure_chat_sla_5min.cjs --apply-cloud`, dừng nếu có rule active khác và không ghi đè cấu hình nghiệp vụ. Đây là thay đổi dữ liệu cấu hình, không migration schema. Chưa nghiệm thu toàn chuỗi countdown bằng một cuộc chat UI mới đã commit hoặc engine từ khóa/cảm xúc/phân công tự động. Những ghi chú rule rỗng trong báo cáo cũ bên dưới mô tả thời điểm trước cấu hình này.
