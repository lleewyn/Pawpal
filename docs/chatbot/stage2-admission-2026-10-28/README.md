# Giới hạn nguồn tra cứu dùng chung — kiểm chứng local

Ngày 28/10/2026. Đã triển khai và kiểm chứng trên clone local có marker. Chưa áp migration136 lên Cloud, chưa push thay đổi giai đoạn2. Receipt dọn môi trường: `local-environment.txt`.

## Cơ chế đã có

- `136_chat_read_admission.sql`: hai slot cố định trong schema private, mỗi nhân viên tối đa một câu hỏi tra cứu đang giữ lượt; dùng chung giữa các process/instance cùng database. Không tạo hàng đợi, heartbeat hoặc vòng quét nền. Slot hết hạn sau35 giây; token cũ không giải phóng được lượt đã cấp lại.
- API lấy lượt sau xác thực, kiểm request chống lặp và kiểm tham số. Câu trả lời lưu trước đó được replay mà không lấy lượt hay truy vấn nguồn mới. Nhánh chỉ làm rõ/giới thiệu khả năng/từ chối ghi không cần lượt nếu không đọc context.
- Nguồn đã đăng ký gọi qua `run_admin_chat_read`: giữ caller/RLS, tối đa4 transaction nguồn cùng lúc trên các lượt hợp lệ. Mỗi câu hỏi vẫn tối đa3 lần nguồn và2 fetch đồng thời.
- SQL đặt `statement_timeout=5s`, `lock_timeout=1s`. PostgREST hoist `statement_timeout` từ cấu hình function khi bắt đầu transaction; không dùng Promise.race làm bằng chứng đã dừng SQL. [Tài liệu PostgREST](https://postgrest.org/en/stable/references/transactions.html#hoisted-function-settings).
- SQL kiểm dung lượng nội dung JSON tối đa32 KiB trước trả ra, cùng giới hạn dòng/kiểu kết quả. Backend đặt trước phần ngân sách bytes cho nguồn đang chạy để tổng dữ liệu nguồn của câu hỏi tối đa64 KiB. Đây là dung lượng nội dung nguồn; không gồm HTTP header, Auth, lịch sử lưu hoặc tổng băng thông ứng dụng.
- Đủ tải trả429; quyền sai403, tham số sai400, vượt ngân sách422, SQL hết thời gian504. Không retry ngầm, không lưu câu trả lời số0 khi nguồn lỗi. API giải phóng lượt khi hoàn tất hoặc lỗi; giải phóng thất bại thì slot tự hết hạn, không chiếm vô hạn.
- Admission thêm hai RPC nhỏ/câu hỏi được nhận: lấy và trả lượt. Wrapper thay thế RPC nguồn cũ, không thêm một vòng gọi nguồn. Bảng chỉ có hai dòng metadata, không lưu câu hỏi, tin nhắn hoặc thông tin liên hệ.

## Bằng chứng

`chat_read_admission_local.cjs --local-fixtures`: **7 nhóm PASS**, ba process Node độc lập dùng chung PostgREST/database:

1. Hai lượt toàn nhóm, một lượt mỗi nhân viên; nhân viên thứ ba hoặc cùng nhân viên bị từ chối ngay.
2. Không dùng hoặc giải phóng được token của nhân viên khác.
3. SQL từ chối payload vượt1 byte thử nghiệm trước khi trả nội dung nguồn.
4. Function nguồn thử nghiệm ngủ2 giây bị PostgreSQL hủy với57014 khi wrapper có timeout200ms; sau response không còn truy vấn nguồn active. Sau test khôi phục nguyên định nghĩa nguồn và timeout5 giây.
5. Bốn transaction nguồn chạy được; lượt thứ năm bịPT429; advisory lock tự giải phóng sau timeout.
6. Lượt hết hạn được cấp lại; token cũ không làm mất lượt mới.
7. Sau release, hai slot trống; không có hàng đợi tăng dần.

`chat_stage2_local_read_tools.cjs --local-fixtures --evidence-dir docs/chatbot/stage2-admission-2026-10-28`: **6 nhóm PASS**, JWT từ Auth local và handler API thật, chạy mặc định qua admission/wrapper mới; không model call. Bao gồm quyền nguồn, typo, câu tiếp nối dùng history và facts chung budget, hint khách được chọn và chặn key context lạ.

**21 test offline PASS** cho registry, budget, vòng đời admission/API và privacy. Hồi quy40 case business, extended facts và hai test UI contract/race đều PASS. Báo cáo chỉ lưu route/status/check, không lưu JWT, password hoặc nội dung khách.

Clone được bổ sung riêng dependency `product_variant.catalog_retired` theo migration099 của baseline, không sửa schema nguồn. Sau kiểm tra đã xóa đúng clone, hai container và credential tạm; giữ nguyên database/container nguồn. Chưa chạy stress Cloud, AI thật hoặc Logs.

## Giới hạn còn mở

Các đợt sau đã mở rộng pool cho Inbox/panel/history/rules và [nguồn phụ, benchmark/public, rate cấp lượt chung](../stage2-rate-aux-2026-10-28/README.md). Rate10 câu mới/phút/staff nay dùng chung database giữa process, nhưng vẫn sau Auth. Đây chưa phải hạn mức mọi request Auth/DB: kiểm ownership/chống lặp/lưu, public open/list/read/mode/feedback, runtime config, polling/Realtime và các đường DB gốc vẫn cần tính riêng. RPC facts gốc giữ để tương thích; chưa chặn mọi đường truy cập DB.

Vì vậy chưa đánh dấu DB16 hoặc chứng nhận năng lực Production; Gate2 tổng tài nguyên còn mở theo checklist. Bốn transaction nguồn không đồng nghĩa tối đa bốn kết nối Auth/DB toàn hệ thống. Không tăng các con số này theo số nhóm nghiệp vụ.

## Triển khai và khôi phục

Trước triển khai API mới phải áp migration136 cùng các dependency101/126 và context/history hiện có; hoàn tất deployment migration135 của giai đoạn1 theo kế hoạch riêng. Thiếu RPC mới thì fail closed, không fallback gọi nguồn không giới hạn. Chưa thực hiện các thao tác này trên Cloud.

Khi cần rollback: đưa API về phiên bản trước, dừng nhận lượt mới và chờ các lượt hiện tại hết; dùng `136_chat_read_admission.rollback.sql`. Script từ chối khi còn lượt chưa hết hạn, chỉ bỏ bốn function và bảng hai slot của migration136, giữ các RPC nghiệp vụ gốc. Không rollback khi API mới còn nhận lưu lượng.
