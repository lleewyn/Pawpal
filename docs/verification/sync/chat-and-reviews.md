# Chat chuyển giao và đánh giá — 26/10/2026

## Kiểm thử Auth, commit và Realtime thật bổ sung

`chat_transfer_auth_realtime.cjs --cloud`: **8 kiểm tra PASS/47 request HTTP**, [bằng chứng](chat-transfer-auth-realtime.txt). Một khách tổng hợp và một nhân viên nhận chat tạm thời chỉ được cấp năm quyền chat/audit trực tiếp, không cấp vai trò Admin. Tài khoản QA Admin hiện có thực hiện nhận/chuyển ca và ghi hai audit bất biến.

- API production `https://pawpalgr3.vercel.app/api/admin-chat` xác thực JWT khách thật: open và yêu cầu nhân viên retry tạo một hội thoại, một message hệ thống; không gọi AI.
- Nhân viên nhận xuất hiện trong danh sách đủ điều kiện nhưng chưa được trả lời trước khi chuyển. Hai request chuyển chồng thời gian cùng UUID commit một message/audit; người nhận nhận UPDATE qua WebSocket với JWT thật.
- Nhân viên cũ bị chặn trả lời sau chuyển; người nhận đọc được phân công mới. Khách đọc qua gateway thấy thông điệp chuyển, không thấy ghi chú riêng hoặc raw fields; đọc lại cùng revision trả metadata `notModified`.
- Dọn hội thoại/messages, nhân viên/quyền tạm, khách và cả hai tài khoản Auth; giữ hai audit của QA Admin theo thiết kế bất biến. Không tắt trigger, không xóa audit, không sửa khách hay ca chat thật. Nhân viên nhận chỉ đọc trong lượt live, không gửi/resolve để tránh tạo audit trỏ vào nhân viên tạm cần dọn.

Phản hồi và resolve bởi nhân viên nhận đã kiểm tra bằng SQL rollback bên dưới, chưa nghiệm thu qua Auth/commit hoặc hai giao diện. Không đo egress production từ 47 request của harness. SLA backend xem [migration 109](chat-sla.md); không tự tạo rule nghiệp vụ khi cấu hình thật đang rỗng. Upload/Storage hoãn theo yêu cầu người dùng.

Ticket và kiểm duyệt review riêng tư cũng đã có [11 + 8 kiểm tra Auth/commit/Realtime thật](customer-event-notifications.md). Công bố/lọc public vẫn chỉ được kiểm tra trong transaction rollback; không đăng review thử nghiệm lên dịch vụ thật. Các ghi chú chưa có Auth/Realtime ở các đợt cũ bên dưới được thay trong đúng phạm vi đã xác minh này.

## Duyệt đánh giá đã triển khai — migration106

Đã bổ sung vào modal xử lý review Admin: trạng thái chờ duyệt/công bố/ẩn/không duyệt, lý do bắt buộc và nút lưu trạng thái; bảng có dòng trạng thái công bố. Mapping giữ `reviewUpdatedAt` để đối chiếu version. Không cấp voucher từ thao tác duyệt. RPC `moderate_admin_service_review` kiểm tra quyền review.write/audit, staff active, loại review dịch vụ, lý do, revision và idempotency payload; ghi audit riêng. Trigger riêng trên bảng review làm updated_at tăng theo clock_timestamp tối thiểu1 microsecond sau OLD, tránh cùng transaction revision không đổi.

`sync_service_review_moderation_cloud_rollback.cjs --cloud`: **14 kiểm tra PASS/129 SQL statements**, một review/reply fixture. Bổ sung so với test10 case cũ: customer không moderate; Admin publish/retry đúng một audit; lý do rỗng, payload replay khác và stale revision bị chặn; public thấy published rồi mất khi Admin hidden; owner vẫn thấy trạng thái hidden. DDL106 và mọi fixture rollback, EXISTS xác minh sạch. [Kết quả](service-review-moderation-cloud-rollback.txt). Một lượt trước gặp assertion stale revision do trigger timestamp cũ dùng transaction now(); lượt đó rollback, đã sửa revision và chạy lại đạt. Harness được rà soát để bỏ BEGIN/COMMIT của file migration và assert không còn wrapper trước khi chạy fixture.

`admin_service_review_moderation_ui.cjs`: Chrome offline PASS với modal HTML/JS thật: lý do bắt buộc, expected version, lỗi giữ draft/ID, double-click không nhân request, ack rồi refresh trạng thái và toast. [Ảnh fixture](admin-service-review-moderation.png) đã xem, nội dung mới dùng text-only, nhãn tiếng Việt, cùng modal hiện có; không đổi phân hệ khác. Transport mock, không gọi Cloud từ browser.

Sau xác nhận riêng của người dùng, migration106 đã commit trên Cloud; metadata xác minh RPC và trigger revision tồn tại. Không chỉnh/xóa review hiện có. UI local bật mặc định, `PAWPAL_SERVICE_REVIEW_MODERATION_ENABLED=false` là rollback switch. Lượt apply đầu bị auto-review chặn vì thiếu xác nhận cụ thể; chỉ retry sau người dùng đồng ý, không bypass.

Batch hiện có12 bài Chrome,79 test Node và hai nhóm business/service PASS. Chưa push/deploy frontend mới; chưa nghiệm thu Auth/HTTP/Realtime/commit hai portal. Các ghi chú “chưa có UI duyệt” bên dưới là tình trạng trước bổ sung106, được thay bằng cập nhật này.

## Chat

`sync_chat_handoff_cloud_rollback.cjs --cloud`: **13 kiểm tra PASS/89 SQL statements**, một hội thoại tổng hợp, hai khách và hai staff. Service-role gateway mở/retry đúng cùng identity; chuyển waiting_agent retry một system message; customer/Guest không gọi được RPC service-only hoặc take staff; agent take/send retry một lần; agent khác không gửi khi chưa nhận ca; transfer đổi người phụ trách, private note không trở thành public message; agent cũ mất quyền gửi; resolve không mở lại bằng mode request. [Kết quả](chat-handoff-cloud-rollback.txt).

Tất cả conversation/messages/customer/auth/staff fixture đã rollback và EXISTS xác nhận sạch. Không gửi tin tới khách thật, không Logs/stress-test hoặc thay schema/RPC/policy. Role/JWT claims SQL mô phỏng không thay Auth/HTTP/WebSocket thật. Service-only RPC là thành phần nội bộ, quyền owner ở API cần được kiểm tra riêng.

`chat_public_owner.test.cjs`: **4 test offline PASS** với handler API thật và service client mock: token sai dừng trước query; B không đọc/đổi mode A và không gọi RPC; owner hợp lệ đổi mode đúng conversation; public_read giới hạn30, projection không raw_content và metadata nội bộ không trả về. Chưa là test HTTP token thật.

## Đánh giá dịch vụ

`sync_service_reviews_cloud_rollback.cjs --cloud`: **10 kiểm tra PASS/97 SQL statements**, một booking/review/reply tổng hợp. Pending booking chưa được đánh giá; sau setup fixture completed, submit/retry một pending review, rating sai và payload replay khác bị chặn. Guest không thấy pending qua public RPC, B không đọc/gửi review A. Admin đọc đúng review và phản hồi qua RPC; owner đọc shop_reply, không gọi được reply Admin; stale reply version bị chặn. Published fixture xuất hiện đúng public/reply, hidden fixture biến mất. [Kết quả](service-reviews-cloud-rollback.txt).

Booking/item completed và review published/hidden được chuẩn bị trực tiếp bằng kết nối kiểm thử, không phải chứng minh UI vận hành hay duyệt review. Mọi fixture và thay đổi đã rollback/kiểm tra sạch. Không review thật được đăng, không Logs, không thay schema/policy. Chưa có E2E Auth/commit/reload hai portal.

## Khoảng trống cụ thể

UI/RPC duyệt review đã triển khai theo cập nhật106; vẫn cần nghiệm thu đầy đủ thao tác hai portal, reload trình duyệt và công bố sau commit. Chuyển chat đã có Auth/gateway/commit/Realtime thật theo cập nhật đầu báo cáo; trả lời/resolve của người nhận và engine SLA/phân công tự động còn cần nghiệm thu riêng. Upload/Storage hoãn theo yêu cầu, không chặn đợt hiện tại. Hoàn điểm và đổi/gửi bù có báo cáo riêng, chưa nghiệm thu đầy đủ UI E2E.

Tái hiện chỉ khi cần: hai script Cloud mặc định không kết nối, `--cloud` luôn transaction rollback, timeout statement8s/lock3s. Không COMMIT hoặc cleanup bằng xóa khách thật. SQL statements không phải request portal hay số đo egress. Regression offline được thêm vào batch chung; không chạy lại Cloud chỉ để cập nhật tài liệu.
